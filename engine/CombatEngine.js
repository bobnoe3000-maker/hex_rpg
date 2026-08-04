// CombatEngine - Deterministic combat resolution system
/**
 * @file CombatEngine.js
 * @description Deterministic combat resolution system for Hex Infinity RPG.
 *              Handles attack resolution, damage calculation, critical hits,
 *              status effects, proc system, and auto-combat logic.
 * 
 * @location engine/CombatEngine.js
 * @usage Instantiated as singleton, used by MapInstance and game loop
 * @dependencies
 *   - GameConfig (config/gameConfig.js)
 *   - ItemConfig (config/itemConfig.js)
 *   - EventBus (systems/EventBus.js)
 *   - EffectSystem (systems/EffectSystem.js)
 *   - hexMath (utils/hexMath.js)
 * 
 * @version 1.9.0
 * @changelog
 *   - v1.9.0 (2026-02-10): Alignment combat modifiers. In _calculateDamage(), after armor
 *                          penetration, applies attacker-vs-defender alignment ATK/DEF %
 *                          modifiers from GameConfig.alignment matrix. Good vs chaotic = +5% ATK
 *                          +3% DEF; chaotic vs good = +5% ATK -3% DEF; neutral is balanced.
 *                          Master toggle via GameConfig.alignment.enabled. Missing/unknown
 *                          alignments default to 'neutral' (no modifier).
 *   - v1.8.0 (2026-02-09): Proc system Phase 4 - new effect types.
 *                          Added _applyProcEffect cases: bonusDamage, heal, reflect, shield,
 *                          buff, manaDrain (stubbed). Added _getEntityBuffModifier() helper
 *                          to scan proc buff status effects. Integrated proc buff modifiers
 *                          into _calculateDamage (attack/defense) and _calculateHit (dodge).
 *   - v1.7.0 (2026-02-09): Proc system Phase 3 - multiple trigger types.
 *                          Added processProcs hooks in resolveAttack(): onDodge (defender),
 *                          onCrit (attacker), onHitReceived (defender), onKill (attacker),
 *                          onLowHealth (defender below 25% HP).
 *                          Updated comment on processProcs call to reflect Phase 2 multi-slot.
 *   - v1.6.0 (2026-02-09): Proc system Phase 2 - multi-slot proc checking.
 *                          processProcs() now iterates all 9 equipment slots.
 *                          Slot rules, cooldowns, and trigger type matching from Phase 1
 *                          apply per-slot independently.
 *   - v1.5.0 (2026-02-09): Proc system Phase 1 (PROC_SYSTEM_IMPLEMENTATION.md).
 *                          Added per-proc cooldown tracking (Map<entityId, Map<key, timestamp>>).
 *                          Added processProcs() with slot-aware trigger/cooldown checking.
 *                          Added _getProcData() to resolve old-format and new-format procs.
 *                          Refactored _checkProc() to delegate to processProcs().
 *                          Enhanced _applyProcEffect() with event emissions.
 *                          Added clearEntityCooldowns() call on endCombat().
 *                          Phase 1 scope: mainHand onHit only (multi-slot in Phase 2).
 *   - v1.4.0 (2026-02-08): Added flat damage reduction from equipped gear defense
 *                          (Option C from BALANCE_AND_PROGRESSION.md §6). After percentage-based
 *                          reduction, subtracts floor(equipDefense × flatDefenseMultiplier) as
 *                          flat damage reduction. Uses GameConfig.combat.flatDefenseMultiplier (0.15).
 *                          Steel t5 warrior (~64 equip DEF) gets -9 flat per hit per NPC.
 *                          Against 3 NPCs, saves ~27 damage/round.
 *   - v1.3.0 (2026-02-08): Added level-difference damage reduction to _calculateDamage().
 *                          When defender.level > attacker.level, incoming damage is reduced
 *                          by 3% per level (configurable), capped at 50%. Makes overleveling
 *                          meaningful. 0% reduction at-level or when punching up.
 *                          Uses GameConfig.character.levelDiffDamageReduction and levelDiffReductionCap.
 *   - v1.2.0 (2026-02-08): Integrated runtime modifiers from EffectSystem for active skill buffs.
 *                          _calculateDamage() now applies damage/defense modifiers and armor penetration.
 *                          _calculateHit() now applies accuracy/dodge modifiers from active buffs.
 *                          _checkCritical() now applies runtime crit chance modifiers.
 *                          resolveAttack() applies passive critDamage + runtime crit damage modifiers.
 *                          Added passive lifesteal processing after damage application.
 *   - v1.1.0 (2025-01-21): Reworked _calculateDamage() to use percentage-based
 *                          damage reduction instead of flat subtraction.
 *                          Defense now provides diminishing returns up to 70% max reduction.
 *                          Minimum damage is now 15% of attack power (configurable).
 *   - v1.0.0 (2025-01): Initial implementation
 */

import { GameConfig } from '../config/gameConfig.js';
import { ItemConfig } from '../config/itemConfig.js';
import { eventBus, GameEvents } from '../systems/EventBus.js';
import { effectSystem } from '../systems/EffectSystem.js';
import { hexDistance } from '../utils/hexMath.js';

export class CombatEngine {
    constructor() {
        this.combatTick = null;
        this.isRunning = false;
        this.mapInstance = null;
        
        // Combat state tracking
        this.activeCombats = new Map();  // entity.id -> combat state
        
        // Proc cooldown tracking: Map<entityId, Map<"procId_slot", cooldownEndTimestamp>>
        // Cooldowns are NOT saved — they reset on load, map transition, death/respawn
        this.procCooldowns = new Map();
    }
    
    // === Combat Resolution ===
    
    /**
     * Resolve an attack between attacker and defender
     * Returns combat result object
     */
    resolveAttack(attacker, defender) {
        if (!attacker.isAlive || !defender.isAlive) {
            return { success: false, reason: 'invalid_target' };
        }
        
        // Check range
        const distance = hexDistance(
            attacker.position.q, attacker.position.r,
            defender.position.q, defender.position.r
        );
        
        const attackRange = attacker.attackRange || GameConfig.combat.meleeRange;
        if (distance > attackRange) {
            return { success: false, reason: 'out_of_range', distance };
        }
        
        // Calculate hit chance (dodge check)
        const hitResult = this._calculateHit(attacker, defender);
        
        if (!hitResult.hit) {
            eventBus.emit(GameEvents.COMBAT_MISS, {
                attacker,
                defender,
                dodgeChance: hitResult.dodgeChance
            });
            
            // Defender dodged — check onDodge procs (e.g., evasive boots)
            this.processProcs(defender, 'onDodge', {
                target: attacker,
                dodgeChance: hitResult.dodgeChance
            });
            
            return { 
                success: true, 
                hit: false, 
                dodge: true,
                attacker: attacker.name || attacker.displayName,
                defender: defender.name || defender.displayName
            };
        }
        
        // Calculate damage
        const damageResult = this._calculateDamage(attacker, defender);
        
        // Check for critical hit
        const critResult = this._checkCritical(attacker);
        if (critResult.critical) {
            // Base crit multiplier + passive crit damage bonus + runtime crit damage buffs
            let critMultiplier = GameConfig.combat.critMultiplier;
            critMultiplier += attacker._passiveBonuses?.critDamage || 0;
            critMultiplier += effectSystem.calculateCritDamageModifier(attacker);
            
            damageResult.damage = Math.floor(damageResult.damage * critMultiplier);
            damageResult.critical = true;
            
            eventBus.emit(GameEvents.COMBAT_CRITICAL, {
                attacker,
                defender,
                damage: damageResult.damage
            });
        }
        
        // Apply damage
        const actualDamage = defender.takeDamage(damageResult.damage, attacker);
        
        // Apply passive lifesteal
        const lifesteal = attacker._passiveBonuses?.lifesteal || 0;
        if (lifesteal > 0 && actualDamage > 0 && attacker.heal) {
            const healAmount = Math.floor(actualDamage * lifesteal);
            if (healAmount > 0) {
                attacker.heal(healAmount, attacker, true); // silent heal
            }
        }
        
        // Emit hit event
        eventBus.emit(GameEvents.COMBAT_HIT, {
            attacker,
            defender,
            damage: actualDamage,
            critical: damageResult.critical || false
        });
        
        // === PROC TRIGGERS (Phase 3) ===
        
        // onHit — attacker's offensive procs (weapons, rings, necklace)
        this.processProcs(attacker, 'onHit', {
            target: defender,
            damage: actualDamage
        });
        
        // onCrit — attacker's crit-specific procs (e.g., executioner)
        if (damageResult.critical) {
            this.processProcs(attacker, 'onCrit', {
                target: defender,
                damage: actualDamage
            });
        }
        
        // onHitReceived — defender's reactive procs (armor, shields, thorns)
        if (defender.isAlive) {
            this.processProcs(defender, 'onHitReceived', {
                target: attacker,
                damage: actualDamage
            });
        }
        
        // onLowHealth — defender dropped below 25% HP (e.g., laststand)
        if (defender.isAlive && defender.maxHealth > 0 &&
            (defender.currentHealth / defender.maxHealth) <= 0.25) {
            this.processProcs(defender, 'onLowHealth', {
                target: attacker,
                damage: actualDamage,
                healthPercent: defender.currentHealth / defender.maxHealth
            });
        }
        
        // Grant XP if defender died (and attacker is player)
        if (!defender.isAlive && attacker.gainXP && defender.xpValue) {
            // onKill — attacker's kill procs (e.g., soulreaper)
            this.processProcs(attacker, 'onKill', {
                target: defender,
                damage: actualDamage
            });
            
            attacker.gainXP(defender.xpValue);
        }
        
        return {
            success: true,
            hit: true,
            damage: actualDamage,
            critical: damageResult.critical || false,
            defenderDied: !defender.isAlive,
            attacker: attacker.name || attacker.displayName,
            defender: defender.name || defender.displayName
        };
    }
    
    /**
     * Calculate if attack hits (dodge check)
     * Deterministic based on stats
     */
    _calculateHit(attacker, defender) {
        // Base accuracy from attacker's dexterity
        let accuracy = 0.9 + (attacker.stats?.dexterity || attacker.totalStats?.dexterity || 10) * 0.002;
        
        // Apply runtime accuracy modifiers from active skill buffs
        accuracy *= effectSystem.calculateAccuracyModifier(attacker);
        
        // Defender's dodge chance (already includes passive dodge bonus from Character.js)
        let dodgeChance = defender.dodgeChance || 0;
        
        // Apply runtime dodge modifiers from active skill buffs
        dodgeChance += effectSystem.calculateDodgeModifier(defender);
        
        // Apply proc buff dodge modifiers (e.g., evasive proc)
        dodgeChance += this._getEntityBuffModifier(defender, 'dodge');
        
        dodgeChance = Math.min(dodgeChance, 0.5); // Re-enforce cap
        
        // Hit chance formula
        const hitChance = Math.max(0.1, accuracy * (1 - dodgeChance));
        
        // Deterministic check based on combat tick
        const seed = this._generateSeed(attacker.id, defender.id);
        const roll = this._seededRandom(seed);
        
        return {
            hit: roll < hitChance,
            hitChance,
            dodgeChance,
            roll
        };
    }
    
    /**
     * Calculate damage dealt using percentage-based damage reduction
     * 
     * Formula: 
     *   damageReduction = (defense / (defense + attack * scaleFactor)) * maxReduction
     *   finalDamage = attackPower * (1 - damageReduction)
     *   minDamage = attackPower * minDamagePercent
     * 
     * This provides diminishing returns on defense - stacking more defense
     * always helps but with decreasing effectiveness. Defense can never
     * fully negate damage.
     * 
     * @param {Object} attacker - Attacking entity
     * @param {Object} defender - Defending entity
     * @returns {Object} { damage, attackPower, defensePower, damageReduction }
     */
    _calculateDamage(attacker, defender) {
        // attackPower and defensePower already include passive skill bonuses (from Character.js)
        let attackPower = attacker.attackPower || 0;
        let defensePower = defender.defensePower || 0;
        
        // Apply runtime damage modifiers from active skill buffs/debuffs
        const damageModifier = effectSystem.calculateDamageModifier(attacker);
        attackPower *= damageModifier;
        
        // Apply proc buff attack modifier (e.g., laststand +30% ATK)
        const procAttackBuff = this._getEntityBuffModifier(attacker, 'attack');
        if (procAttackBuff > 0) {
            attackPower *= (1 + procAttackBuff);
        }
        
        // Apply runtime defense modifiers from active skill buffs/debuffs
        const defenseModifier = effectSystem.calculateDefenseModifier(defender);
        defensePower *= defenseModifier;
        
        // Apply proc buff defense modifier (e.g., laststand +30% DEF)
        const procDefenseBuff = this._getEntityBuffModifier(defender, 'defense');
        if (procDefenseBuff > 0) {
            defensePower *= (1 + procDefenseBuff);
        }
        
        // Get config values with defaults
        const scaleFactor = GameConfig.combat.defenseScaleFactor || 1.5;
        const maxReduction = GameConfig.combat.maxDamageReduction || 0.70;
        const minDamagePercent = GameConfig.combat.minDamagePercent || 0.15;
        
        // Apply armor penetration from passive skills (ignore % of target defense)
        const armorPen = attacker._passiveBonuses?.armorPenetration || 0;
        if (armorPen > 0) {
            defensePower *= (1 - armorPen);
        }
        
        // Apply alignment combat modifiers (v1.9.0)
        // Attacker's alignment vs defender's alignment grants minor ATK/DEF bonuses
        // e.g., Good vs Chaotic = +5% ATK, +3% DEF; Chaotic vs Good = +5% ATK, -3% DEF
        const alignmentConfig = GameConfig.alignment;
        if (alignmentConfig?.enabled) {
            const attackerAlign = attacker.alignment || 'neutral';
            const defenderAlign = defender.alignment || 'neutral';
            const alignMods = alignmentConfig.modifiers?.[attackerAlign]?.[defenderAlign];
            
            if (alignMods) {
                if (alignMods.attack) {
                    attackPower *= (1 + alignMods.attack / 100);
                }
                if (alignMods.defense) {
                    defensePower *= (1 + alignMods.defense / 100);
                }
            }
        }
        
        // Calculate damage reduction percentage with diminishing returns
        let damageReduction = 0;
        if (attackPower > 0) {
            const defenseRatio = defensePower / (defensePower + (attackPower * scaleFactor));
            damageReduction = defenseRatio * maxReduction;
        }
        
        // Calculate base damage after reduction
        const baseDamage = attackPower * (1 - damageReduction);
        
        // Minimum damage is a percentage of attack power, not flat 1
        const minDamage = Math.max(
            GameConfig.combat.minDamage || 1,
            Math.floor(attackPower * minDamagePercent)
        );
        
        // Final damage is the greater of calculated damage or minimum
        let damage = Math.max(minDamage, Math.floor(baseDamage));
        
        // Flat damage reduction from equipped gear defense (v1.4.0 - Option C)
        // After percentage-based reduction, gear provides a flat damage subtraction
        // This makes gear investment always tangible, especially vs multiple attackers
        // flatReduction = floor(totalEquipDefense × flatDefenseMultiplier)
        const flatDefMultiplier = GameConfig.combat.flatDefenseMultiplier || 0;
        if (flatDefMultiplier > 0 && defender._getEquipmentDefenseBonus) {
            const equipDefense = defender._getEquipmentDefenseBonus();
            const flatReduction = Math.floor(equipDefense * flatDefMultiplier);
            damage = Math.max(minDamage, damage - flatReduction);
        }
        
        // Level-difference damage reduction (v1.3.0)
        // When defender is higher level than attacker, reduce incoming damage
        // This makes overleveling content feel meaningful without changing stat formulas
        // Only applies when defender.level > attacker.level (0% at-level or punching up)
        const levelDiffReduction = GameConfig.character.levelDiffDamageReduction || 0;
        const levelDiffCap = GameConfig.character.levelDiffReductionCap || 0.50;
        if (levelDiffReduction > 0 && defender.level && attacker.level) {
            const levelAdvantage = defender.level - attacker.level;
            if (levelAdvantage > 0) {
                const levelReduction = Math.min(levelAdvantage * levelDiffReduction, levelDiffCap);
                damage = Math.max(minDamage, Math.floor(damage * (1 - levelReduction)));
            }
        }
        
        return {
            damage,
            attackPower,
            defensePower,
            baseDamage,
            damageReduction: Math.round(damageReduction * 100)
        };
    }
    
    /**
     * Check for critical hit
     */
    _checkCritical(attacker) {
        // critChance already includes passive crit bonus (from Character.js)
        let critChance = attacker.critChance || 0;
        
        // Apply runtime crit buffs from active skills
        critChance += effectSystem.calculateCritChanceModifier(attacker);
        critChance = Math.min(critChance, 0.75); // Enforce cap
        
        const seed = this._generateSeed(attacker.id, 'crit');
        const roll = this._seededRandom(seed);
        
        return {
            critical: roll < critChance,
            critChance,
            roll
        };
    }
    
    // ==========================================
    // PROC COOLDOWN MANAGEMENT (v1.5.0)
    // ==========================================
    
    /**
     * Check if a proc is on cooldown for an entity
     * @param {string} entityId - Entity ID
     * @param {string} procId - Proc ID
     * @param {string} slot - Equipment slot
     * @returns {boolean} True if on cooldown
     */
    isProcOnCooldown(entityId, procId, slot) {
        const entityCooldowns = this.procCooldowns.get(entityId);
        if (!entityCooldowns) return false;
        
        const cooldownKey = `${procId}_${slot}`;
        const cooldownEnd = entityCooldowns.get(cooldownKey);
        
        if (!cooldownEnd) return false;
        return Date.now() < cooldownEnd;
    }
    
    /**
     * Set proc cooldown for an entity
     * @param {string} entityId - Entity ID
     * @param {string} procId - Proc ID
     * @param {string} slot - Equipment slot
     * @param {number} duration - Cooldown duration in ms
     */
    setProcCooldown(entityId, procId, slot, duration) {
        if (!this.procCooldowns.has(entityId)) {
            this.procCooldowns.set(entityId, new Map());
        }
        
        const cooldownKey = `${procId}_${slot}`;
        const cooldownEnd = Date.now() + duration;
        this.procCooldowns.get(entityId).set(cooldownKey, cooldownEnd);
        
        // Emit cooldown event for UI tracking
        eventBus.emit(GameEvents.PROC_COOLDOWN_START, {
            entityId,
            procId,
            slot,
            duration,
            cooldownEnd
        });
    }
    
    /**
     * Get remaining cooldown for a proc
     * @param {string} entityId - Entity ID
     * @param {string} procId - Proc ID
     * @param {string} slot - Equipment slot
     * @returns {number} Remaining ms, or 0 if not on cooldown
     */
    getProcCooldownRemaining(entityId, procId, slot) {
        const entityCooldowns = this.procCooldowns.get(entityId);
        if (!entityCooldowns) return 0;
        
        const cooldownKey = `${procId}_${slot}`;
        const cooldownEnd = entityCooldowns.get(cooldownKey);
        
        if (!cooldownEnd) return 0;
        return Math.max(0, cooldownEnd - Date.now());
    }
    
    /**
     * Clear all cooldowns for an entity (on death, respawn, map transition)
     * @param {string} entityId - Entity ID
     */
    clearEntityCooldowns(entityId) {
        this.procCooldowns.delete(entityId);
    }
    
    // ==========================================
    // PROC TRIGGER PROCESSING (v1.5.0)
    // ==========================================
    
    /**
     * Process all equipment procs for a specific trigger type.
     * Phase 1: Only mainHand + onHit. Multi-slot and other triggers added in Phase 2/3.
     * 
     * @param {Object} entity - The entity whose procs to check
     * @param {string} triggerType - 'onHit', 'onCrit', 'onKill', etc.
     * @param {Object} context - Context data (target, damage, etc.)
     */
    processProcs(entity, triggerType, context = {}) {
        const equipment = entity.equipment;
        if (!equipment) return;
        
        // All equipment slots that can have procs (expanded Phase 2)
        const slots = ['mainHand', 'offHand', 'body', 'head', 'boots', 
                       'ring', 'ring2', 'necklace', 'cape'];
        
        for (const slot of slots) {
            const item = equipment[slot];
            
            // Items may store proc data as: .proc (object), .procId (string), or ._procData (resolved)
            const rawProc = item?.proc || item?._procData || item?.procId;
            if (!rawProc) continue;
            
            const procData = this._getProcData(rawProc);
            
            if (!procData || !procData.effect) continue;
            
            // Check if proc matches trigger type
            // Default to 'onHit' for old-format procs that lack triggerType
            const procTrigger = procData.triggerType || 'onHit';
            if (procTrigger !== triggerType) continue;
            
            // Check slot restrictions (if defined, slot must be in the list)
            if (procData.slotRestriction && 
                !procData.slotRestriction.includes(slot)) continue;
            
            // Check slot rules from config
            const slotRules = ItemConfig.slotProcRules?.[slot];
            if (slotRules?.allowedTriggers && 
                !slotRules.allowedTriggers.includes(triggerType)) continue;
            
            // Check cooldown
            const entityId = entity.id || entity.name || 'unknown';
            if (this.isProcOnCooldown(entityId, procData.id, slot)) continue;
            
            // Roll for proc chance
            // Use top-level chance first, fall back to effect.chance for old-format
            const chance = procData.chance || procData.effect?.chance || 0.1;
            const seed = this._generateSeed(entityId, `proc_${procData.id}_${slot}`);
            const roll = this._seededRandom(seed);
            
            if (roll < chance) {
                // Calculate cooldown with slot multiplier
                const baseCooldown = procData.cooldown || 3000;
                const cooldownMult = slotRules?.cooldownMultiplier || 1.0;
                const finalCooldown = Math.floor(baseCooldown * cooldownMult);
                
                // Apply proc effect
                this._applyProcEffect(entity, context.target, procData, slot, context);
                
                // Set cooldown
                this.setProcCooldown(entityId, procData.id, slot, finalCooldown);
                
                // Emit proc triggered event for combat log and animations
                eventBus.emit(GameEvents.PROC_TRIGGERED, {
                    source: entity,
                    target: context.target,
                    proc: procData,
                    slot,
                    triggerType,
                    item
                });
            }
        }
    }
    
    /**
     * Get proc data from proc ID, proc object, or old-format inline effect.
     * Handles backwards compatibility with items that store proc data in different formats.
     * 
     * @param {Object|string} proc - Proc ID string, or proc object (old or new format)
     * @returns {Object|null} Resolved proc data with id, effect, triggerType, chance, etc.
     */
    _getProcData(proc) {
        if (!proc) return null;
        
        // If it's just an ID string, look up in config
        if (typeof proc === 'string') {
            const configProc = ItemConfig.procs[proc];
            return (configProc && configProc.id !== 'none') ? configProc : null;
        }
        
        // If it has an id, try to merge with config for enhanced fields
        if (proc.id && ItemConfig.procs[proc.id] && proc.id !== 'none') {
            // Config is the base, item data overrides specific fields
            return { ...ItemConfig.procs[proc.id], ...proc };
        }
        
        // Old-format: object with effect but no id (or id not in config)
        // Return as-is if it has an effect
        if (proc.effect) {
            return proc;
        }
        
        return null;
    }
    
    /**
     * Legacy wrapper — called from old code paths.
     * Delegates to processProcs() for Phase 1 compatibility.
     * @deprecated Use processProcs() directly. Will be removed in Phase 2.
     */
    _checkProc(attacker, defender, procData) {
        // Handled by processProcs() in resolveAttack() now.
        // This method kept as safety net for any external callers.
        this.processProcs(attacker, 'onHit', { target: defender });
    }
    
    // ==========================================
    // PROC BUFF MODIFIER SCANNING (v1.8.0)
    // ==========================================
    
    /**
     * Scan an entity's status effects for proc-applied buff modifiers.
     * Returns the total additive modifier for the given stat type.
     * 
     * Supported statTypes:
     *   'dodge' — additive dodge bonus (e.g., evasive proc: +0.15)
     *   'attack' — multiplicative attack modifier (e.g., laststand: +0.30 → returns 0.30)
     *   'defense' — multiplicative defense modifier (e.g., laststand: +0.30 → returns 0.30)
     * 
     * @param {Object} entity - Entity to scan
     * @param {string} statType - 'dodge', 'attack', or 'defense'
     * @returns {number} Total additive modifier (0 if none)
     */
    _getEntityBuffModifier(entity, statType) {
        if (!entity?.statusEffects?.length) return 0;
        
        let total = 0;
        for (const se of entity.statusEffects) {
            if (se.type !== 'buff' || !se.procId) continue;
            
            if (statType === 'dodge' && se.stat === 'dodge') {
                total += se.modifier || 0;
            } else if (statType === 'attack' && se.stat === 'attackDefense') {
                total += se.attackMod || 0;
            } else if (statType === 'defense' && se.stat === 'attackDefense') {
                total += se.defenseMod || 0;
            }
        }
        return total;
    }
    
    /**
     * Apply a proc effect to target
     * Enhanced v1.5.0: emits events, handles all current effect types
     * 
     * @param {Object} source - Entity that triggered the proc
     * @param {Object} target - Target of the effect
     * @param {Object} procData - Full proc configuration object
     * @param {string} slot - Equipment slot that procced
     * @param {Object} context - Additional context (damage dealt, etc.)
     */
    _applyProcEffect(source, target, procData, slot, context = {}) {
        const effect = procData.effect;
        if (!effect) return;
        
        switch (effect.type) {
            case 'burn':
                if (target?.addStatusEffect) {
                    target.addStatusEffect({
                        id: 'burn',
                        name: 'Burning',
                        type: 'dot',
                        damage: effect.damage || 3,
                        duration: effect.duration || 3,
                        source: source?.id,
                        procId: procData.id,
                        stacks: effect.stacks || false
                    });
                    eventBus.emit(GameEvents.PROC_EFFECT_APPLIED, {
                        source, target, effect, procId: procData.id, slot
                    });
                }
                break;
                
            case 'slow':
                if (target?.addStatusEffect) {
                    target.addStatusEffect({
                        id: 'slow',
                        name: 'Slowed',
                        type: 'slow',
                        modifier: effect.modifier || 0.7,
                        duration: effect.duration || 2,
                        source: source?.id,
                        procId: procData.id
                    });
                    if (effect.damage && target.takeDamage) {
                        target.takeDamage(effect.damage, source);
                    }
                    eventBus.emit(GameEvents.PROC_EFFECT_APPLIED, {
                        source, target, effect, procId: procData.id, slot
                    });
                }
                break;
                
            case 'stun':
                if (target?.addStatusEffect) {
                    target.addStatusEffect({
                        id: 'stun',
                        name: 'Stunned',
                        type: 'stun',
                        duration: effect.duration || 1,
                        source: source?.id,
                        procId: procData.id
                    });
                    if (effect.damage && target.takeDamage) {
                        target.takeDamage(effect.damage, source);
                    }
                    eventBus.emit(GameEvents.PROC_EFFECT_APPLIED, {
                        source, target, effect, procId: procData.id, slot
                    });
                }
                break;
                
            case 'poison':
                if (target?.addStatusEffect) {
                    target.addStatusEffect({
                        id: 'poison',
                        name: 'Poisoned',
                        type: 'dot',
                        damage: effect.damage || 2,
                        duration: effect.duration || 5,
                        source: source?.id,
                        procId: procData.id
                    });
                    eventBus.emit(GameEvents.PROC_EFFECT_APPLIED, {
                        source, target, effect, procId: procData.id, slot
                    });
                }
                break;
                
            case 'lifesteal':
                if (source?.heal) {
                    const healAmount = Math.floor((effect.percent || 0.1) * (source.attackPower || 0));
                    if (healAmount > 0) {
                        source.heal(healAmount);
                        eventBus.emit(GameEvents.PROC_EFFECT_APPLIED, {
                            source, target, effect, procId: procData.id, slot,
                            healAmount
                        });
                    }
                }
                break;
            
            // --- New effect types (v1.8.0 Phase 4) ---
            
            case 'bonusDamage': {
                // Deal bonus damage as a percent of the damage that triggered the proc
                const baseDamage = context.damage || 0;
                const bonusDamage = Math.floor(baseDamage * (effect.percent || 0.5));
                if (bonusDamage > 0 && target?.takeDamage) {
                    target.takeDamage(bonusDamage, source);
                    eventBus.emit(GameEvents.PROC_EFFECT_APPLIED, {
                        source, target, effect, procId: procData.id, slot,
                        bonusDamage
                    });
                }
                break;
            }
            
            case 'heal': {
                // Heal source for a percent of their max HP
                if (source?.heal && source.maxHealth) {
                    const procHealAmount = Math.floor(source.maxHealth * (effect.percent || 0.15));
                    if (procHealAmount > 0) {
                        source.heal(procHealAmount);
                        eventBus.emit(GameEvents.PROC_EFFECT_APPLIED, {
                            source, target, effect, procId: procData.id, slot,
                            healAmount: procHealAmount
                        });
                    }
                }
                break;
            }
            
            case 'reflect': {
                // Reflect a percent of damage taken back to the attacker
                // Note: for onHitReceived procs, source=defender and target=attacker
                const damageTaken = context.damage || 0;
                const reflectDamage = Math.floor(damageTaken * (effect.percent || 0.20));
                if (reflectDamage > 0 && target?.takeDamage) {
                    target.takeDamage(reflectDamage, source);
                    eventBus.emit(GameEvents.PROC_EFFECT_APPLIED, {
                        source, target, effect, procId: procData.id, slot,
                        reflectDamage
                    });
                }
                break;
            }
            
            case 'shield': {
                // Apply a temporary shield as a status effect on source
                if (source?.addStatusEffect) {
                    source.addStatusEffect({
                        id: `shield_${procData.id}`,
                        name: 'Shield',
                        type: 'shield',
                        shieldAmount: effect.amount || 25,
                        shieldRemaining: effect.amount || 25,
                        duration: effect.duration || 5,
                        source: source?.id,
                        procId: procData.id
                    });
                    eventBus.emit(GameEvents.PROC_EFFECT_APPLIED, {
                        source, target, effect, procId: procData.id, slot,
                        shieldAmount: effect.amount || 25
                    });
                }
                break;
            }
            
            case 'buff': {
                // Apply a stat buff as a status effect on source
                if (source?.addStatusEffect) {
                    source.addStatusEffect({
                        id: `buff_${procData.id}`,
                        name: procData.name || 'Buff',
                        type: 'buff',
                        stat: effect.stat,
                        modifier: effect.modifier || 0,
                        attackMod: effect.attackMod || 0,
                        defenseMod: effect.defenseMod || 0,
                        duration: effect.duration || 5,
                        source: source?.id,
                        procId: procData.id
                    });
                    eventBus.emit(GameEvents.PROC_EFFECT_APPLIED, {
                        source, target, effect, procId: procData.id, slot
                    });
                }
                break;
            }
            
            case 'manaDrain': {
                // Stub: drain mana from target if they have a mana system
                if (target?.currentMana === undefined) return;
                const drainAmount = Math.min(effect.amount || 10, target.currentMana || 0);
                if (drainAmount > 0) {
                    target.currentMana -= drainAmount;
                    // Restore to source if they have mana
                    if (source?.currentMana !== undefined && source?.maxMana) {
                        source.currentMana = Math.min(source.maxMana, source.currentMana + drainAmount);
                    }
                    eventBus.emit(GameEvents.PROC_EFFECT_APPLIED, {
                        source, target, effect, procId: procData.id, slot,
                        manaDrained: drainAmount
                    });
                }
                break;
            }
                
            default:
                console.warn(`[CombatEngine] Unknown proc effect type: ${effect.type}`);
        }
    }
    
    // === Status Effect Processing ===
    
    processStatusEffects(entity) {
        if (!entity.statusEffects || entity.statusEffects.length === 0) return;
        
        const expired = [];
        
        for (const effect of entity.statusEffects) {
            // Apply tick effects
            if (effect.type === 'dot' && effect.damage) {
                entity.takeDamage(effect.damage, { id: effect.source, name: 'Status Effect' });
                
                eventBus.emit(GameEvents.STATUS_TICK, {
                    target: entity,
                    effect,
                    damage: effect.damage
                });
            }
            
            // Decrement duration
            effect.remainingDuration--;
            
            if (effect.remainingDuration <= 0) {
                expired.push(effect.id);
            }
        }
        
        // Remove expired effects
        for (const effectId of expired) {
            entity.removeStatusEffect(effectId);
        }
    }
    
    // === Combat State Management ===
    
    startCombat(entity, target) {
        entity.inCombat = true;
        entity.currentTarget = target;
        
        // For NPCs, add aggro
        if (target.addAggro) {
            target.addAggro(entity.id, 1);
        }
        if (entity.addAggro) {
            entity.addAggro(target.id, 1);
        }
        
        eventBus.emit(GameEvents.COMBAT_START, {
            entity,
            target
        });
    }
    
    endCombat(entity) {
        entity.inCombat = false;
        entity.currentTarget = null;
        
        // Clear proc cooldowns on combat end (by design — see PROC_SYSTEM_IMPLEMENTATION.md §9.3)
        if (entity.id) {
            this.clearEntityCooldowns(entity.id);
        }
        
        eventBus.emit(GameEvents.COMBAT_END, {
            entity
        });
    }
    
    // === Auto-Combat Logic ===
    
    /**
     * Process auto-combat for a player
     */
    processAutoCombat(player, mapInstance) {
        if (!player.autoBattleEnabled || !player.isAlive) return;
        if (player.isStunned?.()) return;
        
        // Find nearest enemy
        const nearestEnemy = mapInstance.getNearestEnemy(player);
        
        if (!nearestEnemy) {
            // No enemies, end combat
            if (player.inCombat) {
                this.endCombat(player);
            }
            return;
        }
        
        const { entity: target, distance } = nearestEnemy;
        
        // Check if in attack range
        const attackRange = player.attackRange || GameConfig.combat.meleeRange;
        
        if (distance <= attackRange) {
            // Attack!
            this.resolveAttack(player, target);
            player.currentTarget = target;
            
            if (!player.inCombat) {
                this.startCombat(player, target);
            }
        }
        // Movement is handled by MovementEngine
    }
    
    /**
     * Process NPC AI combat
     */
    processNPCCombat(npc, mapInstance) {
        if (!npc.isAlive || npc.isStunned()) return;
        
        // Get target based on aggro
        let targetId = npc.getTopAggroTarget();
        let target = targetId ? mapInstance.players.get(targetId) : null;
        
        // If no aggro target, check for players in aggro range
        if (!target) {
            const nearbyPlayers = mapInstance.getEntitiesInRange(
                npc.position.q, npc.position.r,
                npc.aggroRange,
                npc.id
            ).filter(e => e.type === 'player' && e.entity.isAlive);
            
            if (nearbyPlayers.length > 0 && npc.shouldAggro(nearbyPlayers[0].entity, nearbyPlayers[0].distance)) {
                target = nearbyPlayers[0].entity;
                npc.addAggro(target.id, 1);
            }
        }
        
        if (!target || !target.isAlive) {
            // No valid target
            npc.clearAggro();
            if (npc.inCombat) {
                this.endCombat(npc);
            }
            return;
        }
        
        npc.currentTarget = target;
        
        // Check attack range
        const distance = hexDistance(
            npc.position.q, npc.position.r,
            target.position.q, target.position.r
        );
        
        if (distance <= npc.attackRange) {
            // Attack!
            this.resolveAttack(npc, target);
            
            if (!npc.inCombat) {
                this.startCombat(npc, target);
            }
        }
        // Movement toward target is handled by MovementEngine
    }
    
    // === Utility Functions ===
    
    /**
     * Generate a deterministic seed from inputs
     */
    _generateSeed(id1, id2) {
        const str = `${id1}_${id2}_${Date.now()}`;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }
    
    /**
     * Simple seeded random number generator
     */
    _seededRandom(seed) {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }
    
    /**
     * Check if entity can attack target
     */
    canAttack(attacker, defender) {
        if (!attacker.isAlive || !defender.isAlive) return false;
        
        const distance = hexDistance(
            attacker.position.q, attacker.position.r,
            defender.position.q, defender.position.r
        );
        
        const attackRange = attacker.attackRange || GameConfig.combat.meleeRange;
        return distance <= attackRange;
    }
}

// Singleton instance
export const combatEngine = new CombatEngine();

export default combatEngine;
