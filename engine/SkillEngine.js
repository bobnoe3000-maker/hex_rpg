/**
 * @file SkillEngine.js
 * @description Stateless skill execution engine. Handles skill validation, execution,
 *              targeting, triggered skills, and passive aggregation.
 *              Uses SkillUtils for consistent skill property access.
 * 
 * @location engine/SkillEngine.js
 * @usage Imported by GameLoop.js, CombatEngine.js, BattleMapUI.js
 * @dependencies config/skillConfig.js, systems/EffectSystem.js, systems/EventBus.js, utils/SkillUtils.js
 * 
 * @version 1.3.0
 * @changelog
 *   - v1.3.0 (2026-02-10): Housing cooldownReduction buff integration. _startSkillCooldown()
 *                          now accepts optional source (character) parameter and applies
 *                          Training Grounds cooldownReduction % to reduce cooldown duration.
 *                          Updated executeSkill() and _executeToggleSkill() to pass source.
 *   - v1.2.0 (2025-01-10): Refactored to use centralized SkillUtils for consistent property access
 *   - v1.1.0 (2025-01-10): Added plain object support for skills that lost class methods
 *                          after save/load deserialization. Added helper methods for
 *                          cooldown, mana cost, and property access.
 *   - v1.0.0 (2025-01-10): Initial implementation
 */

import { 
    SkillType, 
    TargetType, 
    EffectType,
    TriggerCondition,
    getSkill,
    calculateEffectValue
} from '../config/skillConfig.js';
import { effectSystem } from '../systems/EffectSystem.js';
import { eventBus, GameEvents } from '../systems/EventBus.js';
import { hexDistance } from '../utils/hexMath.js';
import { SkillUtils } from '../utils/SkillUtils.js';

class SkillEngine {
    
    // === Skill Validation ===
    
    /**
     * Check if a skill can be used
     * @param {Skill|Object} skill - Skill instance or plain skill object
     * @param {Object} source - Source entity
     * @param {Object} target - Target entity (optional for self-target skills)
     * @param {Object} mapInstance - Current map instance
     * @returns {Object} { canUse: boolean, reason: string }
     */
    static canUseSkill(skill, source, target = null, mapInstance = null) {
        // Basic skill validation (handles both Skill instances and plain objects)
        const basicCheck = this._validateSkillBasics(skill, source, target);
        if (!basicCheck.canUse) {
            return basicCheck;
        }
        
        // Target validation
        const targetType = skill.targetType || (skill.config?.targetType);
        if (targetType !== TargetType.SELF && 
            targetType !== TargetType.NONE &&
            targetType !== TargetType.AOE_ENEMY) {
            
            if (!target) {
                return { canUse: false, reason: 'No target selected' };
            }
            
            if (!target.isAlive) {
                return { canUse: false, reason: 'Target is dead' };
            }
        }
        
        // Range validation for targeted skills
        const skillRange = skill.range || (skill.config?.range);
        if (target && skillRange) {
            const distance = hexDistance(
                source.position.q, source.position.r,
                target.position.q, target.position.r
            );
            
            if (distance > skillRange) {
                return { canUse: false, reason: 'Target out of range' };
            }
        }
        
        return { canUse: true, reason: '' };
    }
    
    /**
     * Validate basic skill requirements (handles both Skill instances and plain objects)
     * @param {Skill|Object} skill - Skill instance or plain object
     * @param {Object} source - Source entity (character)
     * @param {Object} target - Target entity (optional)
     * @returns {Object} { canUse: boolean, reason: string }
     */
    static _validateSkillBasics(skill, source, target = null) {
        // If skill has canUse method (Skill instance), use it
        if (typeof skill.canUse === 'function') {
            return skill.canUse(source, target);
        }
        
        // Use SkillUtils for consistent validation of plain objects
        return SkillUtils.canUse(skill, source, target);
    }
    
    // === Skill Property Helpers (delegate to SkillUtils for consistency) ===
    
    static _isSkillOnCooldown(skill) {
        return SkillUtils.isOnCooldown(skill);
    }
    
    static _getSkillRemainingCooldown(skill) {
        return SkillUtils.getRemainingCooldown(skill);
    }
    
    static _getSkillManaCost(skill) {
        return SkillUtils.getManaCost(skill);
    }
    
    static _getSkillCooldown(skill) {
        return SkillUtils.getCooldown(skill);
    }
    
    static _startSkillCooldown(skill, source = null) {
        SkillUtils.startCooldown(skill);
        
        // Housing: Training Grounds cooldownReduction buff
        // Reduce cooldown duration by percentage after SkillUtils sets it
        const cdReduction = source?._housingBuffs?.cooldownReduction || 0;
        if (cdReduction > 0 && skill._cooldownEnd) {
            const remaining = skill._cooldownEnd - Date.now();
            if (remaining > 0) {
                skill._cooldownEnd -= Math.floor(remaining * (cdReduction / 100));
            }
        }
    }
    
    // === Skill Execution ===
    
    /**
     * Execute a skill
     * @param {Skill|Object} skill - Skill instance or plain object to execute
     * @param {Object} source - Source entity
     * @param {Object} target - Target entity (or null for self/AoE)
     * @param {Object} mapInstance - Current map instance
     * @returns {Object} Execution result
     */
    static executeSkill(skill, source, target, mapInstance) {
        // Validate
        const validation = this.canUseSkill(skill, source, target, mapInstance);
        if (!validation.canUse) {
            return { success: false, reason: validation.reason };
        }
        
        // Handle toggle skills differently
        const isToggle = skill.isToggle || (skill.type === SkillType.TOGGLE) || (skill.config?.type === SkillType.TOGGLE);
        if (isToggle) {
            return this._executeToggleSkill(skill, source);
        }
        
        // Consume mana
        const manaCost = this._getSkillManaCost(skill);
        if (manaCost > 0) {
            source.currentMana -= manaCost;
        }
        
        // Find targets
        const targets = this._findTargets(skill, source, target, mapInstance);
        
        // Apply effects to all targets
        const results = [];
        for (const t of targets) {
            const result = this._applySkillEffects(skill, source, t);
            results.push(result);
        }
        
        // Start cooldown (use helper for plain object support)
        this._startSkillCooldown(skill, source);
        
        // Emit skill use event
        eventBus.emit(GameEvents.COMBAT_SKILL_USE, {
            skill: skill,
            source: source,
            targets: targets,
            results: results
        });
        
        return {
            success: true,
            skill: skill.name || skill.config?.name || 'Unknown Skill',
            source: source.name || source.displayName,
            targets: targets.map(t => t.name || t.displayName),
            results: results
        };
    }
    
    /**
     * Execute a toggle skill (handles both Skill instances and plain objects)
     */
    static _executeToggleSkill(skill, source) {
        const wasActive = skill.isActive || false;
        
        // Toggle the skill (handle both Skill instances and plain objects)
        if (typeof skill.toggle === 'function') {
            skill.toggle();
        } else {
            // For plain objects, manually toggle
            skill.isActive = !wasActive;
            // Start cooldown if needed
            const cooldown = this._getSkillCooldown(skill);
            if (cooldown > 0) {
                this._startSkillCooldown(skill, source);
            }
        }
        
        const isNowActive = skill.isActive || false;
        const effects = skill.effects || (skill.config?.effects) || [];
        const skillId = skill.baseId || skill.id;
        const rank = skill.rank || 1;
        const config = skill.config || skill;
        
        if (isNowActive) {
            // Apply toggle effects as persistent effects
            for (let i = 0; i < effects.length; i++) {
                const effect = effects[i];
                const scaledValue = calculateEffectValue(config, rank, i, source);
                
                effectSystem.applyEffect(source, {
                    ...effect,
                    value: scaledValue,
                    percent: effect.percent ? scaledValue : effect.percent,
                    duration: 0 // Permanent until toggled off
                }, source, skillId);
            }
        } else {
            // Remove toggle effects
            effectSystem.removeEffectsBySource(source, skillId);
        }
        
        eventBus.emit(GameEvents.COMBAT_SKILL_USE, {
            skill: skill,
            source: source,
            toggled: true,
            active: isNowActive
        });
        
        return {
            success: true,
            skill: skill.name || skill.config?.name || 'Unknown Skill',
            toggled: true,
            active: isNowActive,
            wasActive: wasActive
        };
    }
    
    /**
     * Find all valid targets for a skill (handles both Skill instances and plain objects)
     */
    static _findTargets(skill, source, target, mapInstance) {
        const targets = [];
        const targetType = skill.targetType || (skill.config?.targetType) || TargetType.ENEMY;
        const skillRange = skill.range || (skill.config?.range) || 1;
        
        switch (targetType) {
            case TargetType.SELF:
                targets.push(source);
                break;
                
            case TargetType.ENEMY:
                if (target && target.isAlive) {
                    targets.push(target);
                }
                break;
                
            case TargetType.ALLY:
                if (target && target.isAlive) {
                    targets.push(target);
                }
                break;
                
            case TargetType.AOE_ENEMY:
                // All enemies on map
                if (mapInstance?.npcs) {
                    for (const npc of mapInstance.npcs.values()) {
                        if (npc.isAlive) {
                            targets.push(npc);
                        }
                    }
                }
                break;
                
            case TargetType.AOE_ALLY:
                // All allies (for party system - just self for now)
                targets.push(source);
                break;
                
            case TargetType.AOE_AROUND:
                // All enemies adjacent to caster
                if (mapInstance?.npcs) {
                    for (const npc of mapInstance.npcs.values()) {
                        if (!npc.isAlive) continue;
                        
                        const distance = hexDistance(
                            source.position.q, source.position.r,
                            npc.position.q, npc.position.r
                        );
                        
                        if (distance <= skillRange) {
                            targets.push(npc);
                        }
                    }
                }
                break;
                
            case TargetType.NONE:
                // Passive skills - no targets
                break;
                
            default:
                if (target) {
                    targets.push(target);
                }
        }
        
        return targets;
    }
    
    /**
     * Apply skill effects to a single target (handles both Skill instances and plain objects)
     */
    static _applySkillEffects(skill, source, target) {
        const results = {
            target: target.name || target.displayName,
            damage: 0,
            healing: 0,
            effects: []
        };
        
        // Get effects with fallback for plain objects
        const effects = skill.effects || (skill.config?.effects) || [];
        const config = skill.config || skill;
        const rank = skill.rank || 1;
        const skillId = skill.baseId || skill.id;
        const skillName = skill.name || skill.config?.name || 'Unknown Skill';
        
        for (let i = 0; i < effects.length; i++) {
            const effect = effects[i];
            const scaledValue = calculateEffectValue(config, rank, i, source);
            
            switch (effect.type) {
                case EffectType.DAMAGE:
                case EffectType.DAMAGE_PERCENT:
                    const damage = this._calculateSkillDamage(scaledValue, effect, source, target);
                    if (target.takeDamage) {
                        const actualDamage = target.takeDamage(damage, source);
                        results.damage += actualDamage;
                        
                        eventBus.emit(GameEvents.COMBAT_DAMAGE, {
                            source,
                            target,
                            damage: actualDamage,
                            skill: skillName
                        });
                    }
                    break;
                    
                case EffectType.HEAL:
                case EffectType.HEAL_PERCENT:
                    let healAmount = scaledValue;
                    if (effect.type === EffectType.HEAL_PERCENT) {
                        healAmount = Math.floor((target.maxHealth || 100) * (scaledValue / 100));
                    }
                    if (target.heal) {
                        target.heal(healAmount);
                        results.healing += healAmount;
                        
                        eventBus.emit(GameEvents.COMBAT_HEAL, {
                            source,
                            target,
                            amount: healAmount,
                            skill: skillName
                        });
                    }
                    break;
                    
                case EffectType.MANA_RESTORE:
                    let manaAmount = scaledValue;
                    if (effect.percent) {
                        manaAmount = Math.floor((target.maxMana || 100) * (scaledValue / 100));
                    }
                    if (target.restoreMana) {
                        target.restoreMana(manaAmount);
                        results.effects.push({ type: 'mana', amount: manaAmount });
                    }
                    break;
                    
                case EffectType.LIFESTEAL:
                    // Lifesteal is applied after damage calculation
                    const lifestealAmount = Math.floor(results.damage * (scaledValue / 100));
                    if (source.heal && lifestealAmount > 0) {
                        source.heal(lifestealAmount);
                        results.effects.push({ type: 'lifesteal', amount: lifestealAmount });
                    }
                    break;
                    
                case EffectType.EXECUTE:
                    // Bonus damage to low HP targets
                    const hpPercent = (target.currentHealth || 0) / (target.maxHealth || 1);
                    if (hpPercent < (effect.threshold || 0.3)) {
                        const bonusDamage = Math.floor(results.damage * (effect.bonusPercent / 100));
                        if (target.takeDamage) {
                            target.takeDamage(bonusDamage, source);
                            results.damage += bonusDamage;
                        }
                    }
                    break;
                    
                case EffectType.COOLDOWN_RESET:
                    // Reduce cooldowns on other skills
                    if (source.activeSkills) {
                        for (const activeSkill of source.activeSkills) {
                            const activeSkillId = activeSkill?.baseId || activeSkill?.id;
                            if (activeSkill && activeSkillId !== skillId) {
                                if (typeof activeSkill.reduceCooldownPercent === 'function') {
                                    activeSkill.reduceCooldownPercent(scaledValue / 100);
                                } else if (activeSkill._cooldownEnd) {
                                    // For plain objects, manually reduce cooldown
                                    const remaining = Math.max(0, activeSkill._cooldownEnd - Date.now());
                                    activeSkill._cooldownEnd -= remaining * (scaledValue / 100);
                                }
                            }
                        }
                    }
                    results.effects.push({ type: 'cooldown_reset', percent: scaledValue });
                    break;
                    
                case EffectType.SHIELD:
                    const shieldAmount = effect.scaling?.stat === 'maxMana' 
                        ? Math.floor((source.maxMana || 100) * (scaledValue / 100))
                        : scaledValue;
                    
                    effectSystem.applyEffect(target, {
                        ...effect,
                        value: shieldAmount,
                        duration: effect.duration || 10
                    }, source, skillId);
                    
                    results.effects.push({ type: 'shield', amount: shieldAmount });
                    break;
                    
                default:
                    // Apply as status effect (buffs, debuffs, CC)
                    effectSystem.applyEffect(target, {
                        ...effect,
                        value: scaledValue,
                        percent: effect.percent ? scaledValue : effect.percent
                    }, source, skillId);
                    
                    results.effects.push({ type: effect.type, value: scaledValue });
            }
        }
        
        return results;
    }
    
    /**
     * Calculate skill damage with modifiers
     */
    static _calculateSkillDamage(baseValue, effect, source, target) {
        let damage = baseValue;
        
        // If percent-based, multiply by attack power
        if (effect.type === EffectType.DAMAGE_PERCENT) {
            const attackPower = source.attackPower || 0;
            damage = Math.floor(attackPower * (baseValue / 100));
        }
        
        // Apply damage buff/debuff modifiers
        const damageModifier = effectSystem.calculateDamageModifier(source);
        damage = Math.floor(damage * damageModifier);
        
        // Apply target defense (reduced for skills)
        const targetDefense = target.defensePower || 0;
        const defenseModifier = effectSystem.calculateDefenseModifier(target);
        const effectiveDefense = targetDefense * defenseModifier * 0.3; // Skills bypass 70% armor
        
        // Check for armor penetration effect
        let armorPen = 0;
        for (const eff of source.statusEffects || []) {
            if (eff.effectType === EffectType.ARMOR_PENETRATION) {
                armorPen += eff.percent / 100;
            }
        }
        
        const finalDefense = effectiveDefense * (1 - Math.min(1, armorPen));
        damage = Math.max(1, damage - finalDefense);
        
        return Math.floor(damage);
    }
    
    // === Triggered Skills ===
    
    /**
     * Process triggered skills for a condition
     * @param {string} triggerType - Trigger condition (ON_HIT, ON_CRIT, etc.)
     * @param {Object} source - Source entity
     * @param {Object} context - Context data { target, damage, etc. }
     * @param {Object} mapInstance - Current map instance
     */
    static processTriggeredSkills(triggerType, source, context = {}, mapInstance = null) {
        if (!source?.learnedSkills) return;
        
        for (const [skillId, skill] of Object.entries(source.learnedSkills)) {
            // Check skill type (handle both Skill instances and plain objects)
            const skillType = skill.type || (skill.config?.type);
            const isTriggered = skill.isTriggered || (skillType === SkillType.TRIGGERED);
            const isPassive = skill.isPassive || (skillType === SkillType.PASSIVE);
            
            if (!isTriggered && !isPassive) continue;
            
            const triggerCondition = skill.triggerCondition || (skill.config?.triggerCondition);
            if (triggerCondition !== triggerType) continue;
            
            // Check trigger-specific conditions
            if (!this._checkTriggerCondition(skill, triggerType, source, context)) {
                continue;
            }
            
            // Apply triggered effects
            const target = context.target || source;
            this._applySkillEffects(skill, source, target);
        }
    }
    
    /**
     * Check if trigger condition is met
     */
    static _checkTriggerCondition(skill, triggerType, source, context) {
        switch (triggerType) {
            case TriggerCondition.ON_HIT:
                return true; // Already verified by caller
                
            case TriggerCondition.ON_CRIT:
                return context.critical === true;
                
            case TriggerCondition.ON_KILL:
                return context.targetDied === true;
                
            case TriggerCondition.ON_DAMAGE_TAKEN:
                return context.damage > 0;
                
            case TriggerCondition.ON_LOW_HEALTH:
                const hpPercent = (source.currentHealth || 0) / (source.maxHealth || 1);
                return hpPercent < 0.3; // Below 30%
                
            case TriggerCondition.ALWAYS:
                return true;
                
            default:
                return true;
        }
    }
    
    // === Passive Skills ===
    
    /**
     * Calculate total passive bonuses for a character
     * @param {Object} character - Character to calculate for
     * @returns {Object} Aggregated passive bonuses
     */
    static calculatePassiveBonuses(character) {
        const bonuses = {
            damage: 0,
            defense: 0,
            critChance: 0,
            critDamage: 0,
            dodge: 0,
            maxHealth: 0,
            maxMana: 0,
            attackSpeed: 0,
            manaRegen: 0,
            healthRegen: 0,
            lifesteal: 0,
            armorPenetration: 0
        };
        
        if (!character?.learnedSkills) return bonuses;
        
        for (const [skillId, skill] of Object.entries(character.learnedSkills)) {
            // Check if passive (handle both Skill instances and plain objects)
            const skillType = skill.type || (skill.config?.type);
            const isPassive = skill.isPassive || (skillType === SkillType.PASSIVE);
            if (!isPassive) continue;
            
            const effects = skill.effects || (skill.config?.effects) || [];
            const config = skill.config || skill;
            const rank = skill.rank || 1;
            
            for (let i = 0; i < effects.length; i++) {
                const effect = effects[i];
                const value = calculateEffectValue(config, rank, i, character);
                
                switch (effect.type) {
                    case EffectType.BUFF_DAMAGE:
                        bonuses.damage += value;
                        break;
                    case EffectType.BUFF_DEFENSE:
                    case EffectType.BUFF_ARMOR:
                        bonuses.defense += value;
                        break;
                    case EffectType.BUFF_CRIT_CHANCE:
                        bonuses.critChance += value / 100;
                        break;
                    case EffectType.BUFF_CRIT_DAMAGE:
                        bonuses.critDamage += value / 100;
                        break;
                    case EffectType.BUFF_DODGE:
                        bonuses.dodge += value / 100;
                        break;
                    case EffectType.BUFF_MAX_HEALTH:
                        bonuses.maxHealth += value;
                        break;
                    case EffectType.BUFF_MAX_MANA:
                        bonuses.maxMana += value;
                        break;
                    case EffectType.BUFF_ATTACK_SPEED:
                        bonuses.attackSpeed += value;
                        break;
                    case EffectType.BUFF_MANA_REGEN:
                        bonuses.manaRegen += value;
                        break;
                    case EffectType.BUFF_HEALTH_REGEN:
                        bonuses.healthRegen += value;
                        break;
                    case EffectType.LIFESTEAL:
                        bonuses.lifesteal += value / 100;
                        break;
                    case EffectType.ARMOR_PENETRATION:
                        bonuses.armorPenetration += value / 100;
                        break;
                }
            }
        }
        
        return bonuses;
    }
    
    /**
     * Apply all passive effects to character (call on load/level up)
     * @param {Object} character - Character to update
     */
    static applyPassiveEffects(character) {
        if (!character) return;
        
        // Calculate and store passive bonuses
        character._passiveBonuses = this.calculatePassiveBonuses(character);
    }
    
    // === Auto-Cast ===
    
    /**
     * Get the next skill to auto-cast
     * @param {Object} character - Character with skills
     * @param {Object} mapInstance - Current map instance
     * @returns {Object|null} { skill, target } or null
     */
    static getNextAutoCastSkill(character, mapInstance) {
        if (!character?.activeSkills) return null;
        
        // Get target
        const nearestEnemy = mapInstance?.getNearestEnemy?.(character);
        const target = nearestEnemy?.entity || null;
        
        // Check skills in order (priority by slot)
        for (const skill of character.activeSkills) {
            if (!skill || !skill.autoCast) continue;
            
            // Check if active type (handle both Skill instances and plain objects)
            const skillType = skill.type || (skill.config?.type);
            const isActiveType = skill.isActiveType || (skillType === SkillType.ACTIVE);
            if (!isActiveType) continue;
            
            const canUse = this.canUseSkill(skill, character, target, mapInstance);
            if (canUse.canUse) {
                return { skill, target };
            }
        }
        
        return null;
    }
    
    /**
     * Check if a skill should auto-cast now
     * @param {Skill|Object} skill - Skill to check
     * @param {Object} character - Character with skill
     * @param {Object} mapInstance - Current map instance
     * @returns {boolean}
     */
    static shouldAutoCast(skill, character, mapInstance) {
        if (!skill.autoCast) return false;
        
        // Check if active type (handle both Skill instances and plain objects)
        const skillType = skill.type || (skill.config?.type);
        const isActiveType = skill.isActiveType || (skillType === SkillType.ACTIVE);
        if (!isActiveType) return false;
        
        if (this._isSkillOnCooldown(skill)) return false;
        
        const manaCost = this._getSkillManaCost(skill);
        if (character.currentMana < manaCost) return false;
        
        return true;
    }
}

export default SkillEngine;
