/**
 * @file EffectSystem.js
 * @description Manages all status effects (buffs, debuffs, DoTs, HoTs) from skills.
 *              Provides effect application, removal, tick processing, and modifier calculations.
 * 
 * @location systems/EffectSystem.js
 * @usage Imported by SkillEngine.js, CombatEngine.js, GameLoop.js, Character.js
 * @dependencies systems/EventBus.js, config/skillConfig.js
 * 
 * @version 1.0.0
 * @changelog
 *   - v1.0.0 (2025-01-10): Initial implementation
 */

import { eventBus, GameEvents } from './EventBus.js';
import { EffectType } from '../config/skillConfig.js';

/**
 * Status effect data structure
 * @typedef {Object} StatusEffect
 * @property {string} id - Unique effect instance ID
 * @property {string} effectType - Type from EffectType enum
 * @property {string} sourceSkillId - Skill that applied this effect
 * @property {string} sourceEntityId - Entity that applied this effect
 * @property {number} value - Flat value (for damage, healing, etc.)
 * @property {number} percent - Percentage modifier
 * @property {number} duration - Total duration in ticks
 * @property {number} remainingDuration - Remaining ticks
 * @property {number} stacks - Current stack count
 * @property {number} maxStacks - Maximum stack count
 * @property {boolean} stackable - Can this effect stack?
 * @property {number} modifier - For effects like slow (0.7 = 30% slow)
 * @property {number} appliedAt - Timestamp when applied
 */

class EffectSystem {
    constructor() {
        // Effect ID counter
        this._effectIdCounter = 0;
    }
    
    /**
     * Generate unique effect ID
     */
    _generateEffectId() {
        return `effect_${Date.now()}_${this._effectIdCounter++}`;
    }
    
    // === Effect Application ===
    
    /**
     * Apply an effect to a target entity
     * @param {Object} target - Target entity (Character or NPC)
     * @param {Object} effectConfig - Effect configuration from skill
     * @param {Object} source - Source entity that applied the effect
     * @param {string} sourceSkillId - ID of skill that created this effect
     * @returns {Object|null} Applied effect or null if failed
     */
    applyEffect(target, effectConfig, source = null, sourceSkillId = null) {
        if (!target || !effectConfig) return null;
        
        // Initialize status effects array if needed
        if (!target.statusEffects) {
            target.statusEffects = [];
        }
        
        // Check for existing effect of same type from same source
        const existingEffect = target.statusEffects.find(e => 
            e.effectType === effectConfig.type && 
            e.sourceSkillId === sourceSkillId
        );
        
        if (existingEffect && effectConfig.stacks) {
            // Stack the effect
            return this._stackEffect(existingEffect, effectConfig);
        } else if (existingEffect && !effectConfig.stacks) {
            // Refresh duration
            existingEffect.remainingDuration = effectConfig.duration || existingEffect.duration;
            existingEffect.appliedAt = Date.now();
            return existingEffect;
        }
        
        // Create new effect
        const effect = {
            id: this._generateEffectId(),
            effectType: effectConfig.type,
            sourceSkillId: sourceSkillId,
            sourceEntityId: source?.id || null,
            value: effectConfig.value || 0,
            percent: effectConfig.percent || 0,
            duration: effectConfig.duration || 0,
            remainingDuration: effectConfig.duration || 0,
            stacks: 1,
            maxStacks: effectConfig.maxStacks || 1,
            stackable: effectConfig.stacks || false,
            modifier: effectConfig.modifier || 1.0,
            chance: effectConfig.chance || 1.0,
            appliedAt: Date.now(),
            scaling: effectConfig.scaling || null
        };
        
        // Add to target
        target.statusEffects.push(effect);
        
        // Emit event
        eventBus.emit(GameEvents.STATUS_APPLIED, {
            target,
            effect,
            source
        });
        
        return effect;
    }
    
    /**
     * Stack an existing effect
     */
    _stackEffect(existingEffect, newEffectConfig) {
        if (existingEffect.stacks < existingEffect.maxStacks) {
            existingEffect.stacks++;
        }
        
        // Refresh duration
        existingEffect.remainingDuration = newEffectConfig.duration || existingEffect.duration;
        existingEffect.appliedAt = Date.now();
        
        return existingEffect;
    }
    
    /**
     * Remove an effect from target
     * @param {Object} target - Target entity
     * @param {string} effectId - Effect instance ID
     */
    removeEffect(target, effectId) {
        if (!target?.statusEffects) return;
        
        const index = target.statusEffects.findIndex(e => e.id === effectId);
        if (index === -1) return;
        
        const effect = target.statusEffects[index];
        target.statusEffects.splice(index, 1);
        
        eventBus.emit(GameEvents.STATUS_REMOVED, {
            target,
            effect
        });
    }
    
    /**
     * Remove all effects of a specific type from target
     * @param {Object} target - Target entity
     * @param {string} effectType - Effect type to remove
     */
    removeEffectsByType(target, effectType) {
        if (!target?.statusEffects) return;
        
        const toRemove = target.statusEffects.filter(e => e.effectType === effectType);
        for (const effect of toRemove) {
            this.removeEffect(target, effect.id);
        }
    }
    
    /**
     * Remove all effects from a specific source skill
     * @param {Object} target - Target entity
     * @param {string} sourceSkillId - Source skill ID
     */
    removeEffectsBySource(target, sourceSkillId) {
        if (!target?.statusEffects) return;
        
        const toRemove = target.statusEffects.filter(e => e.sourceSkillId === sourceSkillId);
        for (const effect of toRemove) {
            this.removeEffect(target, effect.id);
        }
    }
    
    /**
     * Clear all effects from target
     * @param {Object} target - Target entity
     */
    clearAllEffects(target) {
        if (!target?.statusEffects) return;
        
        const effects = [...target.statusEffects];
        for (const effect of effects) {
            this.removeEffect(target, effect.id);
        }
    }
    
    // === Effect Tick Processing ===
    
    /**
     * Process all effects on an entity for one tick
     * @param {Object} target - Target entity
     */
    processEffectTick(target) {
        if (!target?.statusEffects || target.statusEffects.length === 0) return;
        
        const expired = [];
        
        for (const effect of target.statusEffects) {
            // Skip permanent effects (duration 0)
            if (effect.duration === 0) continue;
            
            // Process tick effects
            this._processTickEffect(target, effect);
            
            // Decrement duration
            effect.remainingDuration--;
            
            if (effect.remainingDuration <= 0) {
                expired.push(effect.id);
            }
        }
        
        // Remove expired effects
        for (const effectId of expired) {
            this.removeEffect(target, effectId);
        }
    }
    
    /**
     * Process a single tick effect (DoT, HoT, etc.)
     */
    _processTickEffect(target, effect) {
        const totalValue = effect.value * effect.stacks;
        const totalPercent = effect.percent * effect.stacks;
        
        switch (effect.effectType) {
            case EffectType.DOT:
            case EffectType.BLEED:
                // Damage over time
                if (totalValue > 0 && target.takeDamage) {
                    target.takeDamage(totalValue, { id: effect.sourceEntityId, name: 'DoT' });
                    eventBus.emit(GameEvents.STATUS_TICK, {
                        target,
                        effect,
                        damage: totalValue
                    });
                }
                break;
                
            case EffectType.HOT:
                // Heal over time
                if (totalValue > 0 && target.heal) {
                    target.heal(totalValue);
                    eventBus.emit(GameEvents.STATUS_TICK, {
                        target,
                        effect,
                        heal: totalValue
                    });
                }
                break;
        }
    }
    
    // === Modifier Calculations ===
    
    /**
     * Calculate total damage modifier from all effects
     * @param {Object} target - Entity to check
     * @returns {number} Damage multiplier (1.0 = no change)
     */
    calculateDamageModifier(target) {
        if (!target?.statusEffects) return 1.0;
        
        let modifier = 1.0;
        
        for (const effect of target.statusEffects) {
            const stacks = effect.stacks || 1;
            
            if (effect.effectType === EffectType.BUFF_DAMAGE) {
                modifier += (effect.percent / 100) * stacks;
            } else if (effect.effectType === EffectType.DEBUFF_DAMAGE) {
                modifier -= (effect.percent / 100) * stacks;
            }
        }
        
        return Math.max(0.1, modifier); // Minimum 10% damage
    }
    
    /**
     * Calculate total defense modifier from all effects
     * @param {Object} target - Entity to check
     * @returns {number} Defense multiplier (1.0 = no change)
     */
    calculateDefenseModifier(target) {
        if (!target?.statusEffects) return 1.0;
        
        let modifier = 1.0;
        
        for (const effect of target.statusEffects) {
            const stacks = effect.stacks || 1;
            
            if (effect.effectType === EffectType.BUFF_DEFENSE) {
                modifier += (effect.percent / 100) * stacks;
            } else if (effect.effectType === EffectType.DEBUFF_DEFENSE) {
                modifier -= (effect.percent / 100) * stacks;
            } else if (effect.effectType === EffectType.BUFF_ARMOR) {
                modifier += (effect.percent / 100) * stacks;
            }
        }
        
        return Math.max(0.1, modifier);
    }
    
    /**
     * Calculate attack speed modifier
     * @param {Object} target - Entity to check
     * @returns {number} Attack speed multiplier (1.0 = no change)
     */
    calculateAttackSpeedModifier(target) {
        if (!target?.statusEffects) return 1.0;
        
        let modifier = 1.0;
        
        for (const effect of target.statusEffects) {
            const stacks = effect.stacks || 1;
            
            if (effect.effectType === EffectType.BUFF_ATTACK_SPEED) {
                modifier += (effect.percent / 100) * stacks;
            } else if (effect.effectType === EffectType.DEBUFF_ATTACK_SPEED) {
                modifier -= (effect.percent / 100) * stacks;
            } else if (effect.effectType === EffectType.SLOW) {
                modifier *= effect.modifier; // 0.7 = 30% slow
            }
        }
        
        return Math.max(0.1, modifier);
    }
    
    /**
     * Calculate crit chance modifier
     * @param {Object} target - Entity to check
     * @returns {number} Bonus crit chance (additive)
     */
    calculateCritChanceModifier(target) {
        if (!target?.statusEffects) return 0;
        
        let bonus = 0;
        
        for (const effect of target.statusEffects) {
            const stacks = effect.stacks || 1;
            
            if (effect.effectType === EffectType.BUFF_CRIT_CHANCE) {
                bonus += (effect.percent / 100) * stacks;
            }
        }
        
        return bonus;
    }
    
    /**
     * Calculate crit damage modifier
     * @param {Object} target - Entity to check
     * @returns {number} Bonus crit damage multiplier (additive)
     */
    calculateCritDamageModifier(target) {
        if (!target?.statusEffects) return 0;
        
        let bonus = 0;
        
        for (const effect of target.statusEffects) {
            const stacks = effect.stacks || 1;
            
            if (effect.effectType === EffectType.BUFF_CRIT_DAMAGE) {
                bonus += (effect.percent / 100) * stacks;
            }
        }
        
        return bonus;
    }
    
    /**
     * Calculate dodge modifier
     * @param {Object} target - Entity to check
     * @returns {number} Bonus dodge chance (additive)
     */
    calculateDodgeModifier(target) {
        if (!target?.statusEffects) return 0;
        
        let bonus = 0;
        
        for (const effect of target.statusEffects) {
            const stacks = effect.stacks || 1;
            
            if (effect.effectType === EffectType.BUFF_DODGE) {
                bonus += (effect.percent / 100) * stacks;
            }
        }
        
        return bonus;
    }
    
    /**
     * Calculate accuracy modifier
     * @param {Object} target - Entity to check
     * @returns {number} Accuracy multiplier
     */
    calculateAccuracyModifier(target) {
        if (!target?.statusEffects) return 1.0;
        
        let modifier = 1.0;
        
        for (const effect of target.statusEffects) {
            const stacks = effect.stacks || 1;
            
            if (effect.effectType === EffectType.BUFF_ACCURACY) {
                modifier += (effect.percent / 100) * stacks;
            } else if (effect.effectType === EffectType.DEBUFF_ACCURACY) {
                modifier -= (effect.percent / 100) * stacks;
            } else if (effect.effectType === EffectType.BLIND) {
                modifier *= 0.5; // 50% accuracy when blinded
            }
        }
        
        return Math.max(0.1, modifier);
    }
    
    /**
     * Get total shield value on target
     * @param {Object} target - Entity to check
     * @returns {number} Total shield HP
     */
    getShieldValue(target) {
        if (!target?.statusEffects) return 0;
        
        let shield = 0;
        
        for (const effect of target.statusEffects) {
            if (effect.effectType === EffectType.SHIELD) {
                shield += effect.value;
            }
        }
        
        return shield;
    }
    
    /**
     * Absorb damage with shield
     * @param {Object} target - Entity with shield
     * @param {number} damage - Incoming damage
     * @returns {number} Remaining damage after shield
     */
    absorbDamageWithShield(target, damage) {
        if (!target?.statusEffects) return damage;
        
        let remainingDamage = damage;
        
        for (const effect of target.statusEffects) {
            if (effect.effectType === EffectType.SHIELD && effect.value > 0) {
                if (effect.value >= remainingDamage) {
                    effect.value -= remainingDamage;
                    remainingDamage = 0;
                    break;
                } else {
                    remainingDamage -= effect.value;
                    effect.value = 0;
                    // Shield depleted, remove it
                    this.removeEffect(target, effect.id);
                }
            }
        }
        
        return remainingDamage;
    }
    
    // === Crowd Control Checks ===
    
    /**
     * Check if target is stunned
     * @param {Object} target - Entity to check
     * @returns {boolean}
     */
    isStunned(target) {
        return this.hasEffect(target, EffectType.STUN);
    }
    
    /**
     * Check if target is silenced
     * @param {Object} target - Entity to check
     * @returns {boolean}
     */
    isSilenced(target) {
        return this.hasEffect(target, EffectType.SILENCE);
    }
    
    /**
     * Check if target is rooted
     * @param {Object} target - Entity to check
     * @returns {boolean}
     */
    isRooted(target) {
        return this.hasEffect(target, EffectType.ROOT);
    }
    
    /**
     * Check if target is feared
     * @param {Object} target - Entity to check
     * @returns {boolean}
     */
    isFeared(target) {
        return this.hasEffect(target, EffectType.FEAR);
    }
    
    /**
     * Check if target is taunted
     * @param {Object} target - Entity to check
     * @returns {string|null} Taunter entity ID or null
     */
    getTaunter(target) {
        if (!target?.statusEffects) return null;
        
        const tauntEffect = target.statusEffects.find(e => e.effectType === EffectType.TAUNT);
        return tauntEffect?.sourceEntityId || null;
    }
    
    /**
     * Check if target is invulnerable
     * @param {Object} target - Entity to check
     * @returns {boolean}
     */
    isInvulnerable(target) {
        return this.hasEffect(target, EffectType.INVULNERABLE) || 
               this.hasEffect(target, EffectType.IMMUNITY);
    }
    
    // === Query Methods ===
    
    /**
     * Check if target has a specific effect type
     * @param {Object} target - Entity to check
     * @param {string} effectType - Effect type to look for
     * @returns {boolean}
     */
    hasEffect(target, effectType) {
        if (!target?.statusEffects) return false;
        return target.statusEffects.some(e => e.effectType === effectType);
    }
    
    /**
     * Get all effects of a specific type on target
     * @param {Object} target - Entity to check
     * @param {string} effectType - Effect type to find
     * @returns {Object[]} Array of matching effects
     */
    getEffectsByType(target, effectType) {
        if (!target?.statusEffects) return [];
        return target.statusEffects.filter(e => e.effectType === effectType);
    }
    
    /**
     * Get total stacks of an effect type
     * @param {Object} target - Entity to check
     * @param {string} effectType - Effect type to count
     * @returns {number} Total stacks
     */
    getEffectStacks(target, effectType) {
        const effects = this.getEffectsByType(target, effectType);
        return effects.reduce((sum, e) => sum + (e.stacks || 1), 0);
    }
    
    /**
     * Get all active effects on target
     * @param {Object} target - Entity to check
     * @returns {Object[]} Array of all effects
     */
    getActiveEffects(target) {
        return target?.statusEffects || [];
    }
    
    /**
     * Get buffs only (positive effects)
     * @param {Object} target - Entity to check
     * @returns {Object[]} Array of buff effects
     */
    getBuffs(target) {
        if (!target?.statusEffects) return [];
        return target.statusEffects.filter(e => 
            e.effectType.startsWith('buff_') || 
            e.effectType === EffectType.HOT ||
            e.effectType === EffectType.SHIELD
        );
    }
    
    /**
     * Get debuffs only (negative effects)
     * @param {Object} target - Entity to check
     * @returns {Object[]} Array of debuff effects
     */
    getDebuffs(target) {
        if (!target?.statusEffects) return [];
        return target.statusEffects.filter(e => 
            e.effectType.startsWith('debuff_') || 
            e.effectType === EffectType.DOT ||
            e.effectType === EffectType.BLEED ||
            e.effectType === EffectType.STUN ||
            e.effectType === EffectType.SLOW ||
            e.effectType === EffectType.ROOT ||
            e.effectType === EffectType.SILENCE ||
            e.effectType === EffectType.FEAR ||
            e.effectType === EffectType.BLIND
        );
    }
    
    /**
     * Remove one random buff from target (for dispel effects)
     * @param {Object} target - Entity to dispel
     * @returns {Object|null} Removed buff or null
     */
    dispelRandomBuff(target) {
        const buffs = this.getBuffs(target);
        if (buffs.length === 0) return null;
        
        const randomBuff = buffs[Math.floor(Math.random() * buffs.length)];
        this.removeEffect(target, randomBuff.id);
        return randomBuff;
    }
}

// Singleton instance
export const effectSystem = new EffectSystem();

export default effectSystem;
