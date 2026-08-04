/**
 * @file SkillUtils.js
 * @description Centralized utility functions for safe skill property access.
 *              Handles both Skill class instances and plain objects (from save/load).
 *              Provides consistent fallback patterns across the entire skill system.
 * 
 * @location utils/SkillUtils.js
 * @usage Import { SkillUtils } from '../utils/SkillUtils.js' in any file needing skill data
 * @dependencies config/skillConfig.js
 * 
 * @version 1.0.0
 * @changelog
 *   - v1.0.0 (2025-01-10): Initial implementation - centralized skill property access
 */

import { SkillType, getSkill } from '../config/skillConfig.js';

/**
 * Centralized utilities for safe skill property access.
 * Works with both Skill class instances and plain objects.
 */
export const SkillUtils = {
    
    // === Basic Property Accessors ===
    
    /**
     * Get skill name safely
     * @param {Object|null} skill - Skill instance or plain object
     * @returns {string} Skill name or fallback
     */
    getName(skill) {
        if (!skill) return 'Unknown Skill';
        return skill.name || skill.config?.name || this._getConfigValue(skill, 'name') || 'Unknown Skill';
    },
    
    /**
     * Get skill description
     * @param {Object|null} skill - Skill instance or plain object
     * @returns {string} Description
     */
    getDescription(skill) {
        if (!skill) return '';
        return skill.description || skill.config?.description || this._getConfigValue(skill, 'description') || '';
    },
    
    /**
     * Get skill type (active, passive, toggle, triggered)
     * @param {Object|null} skill - Skill instance or plain object
     * @returns {string} Skill type
     */
    getType(skill) {
        if (!skill) return SkillType.ACTIVE;
        return skill.type || skill.config?.type || this._getConfigValue(skill, 'type') || SkillType.ACTIVE;
    },
    
    /**
     * Get skill target type
     * @param {Object|null} skill - Skill instance or plain object
     * @returns {string} Target type
     */
    getTargetType(skill) {
        if (!skill) return 'enemy';
        return skill.targetType || skill.config?.targetType || this._getConfigValue(skill, 'targetType') || 'enemy';
    },
    
    /**
     * Get skill branch
     * @param {Object|null} skill - Skill instance or plain object
     * @returns {string} Branch name
     */
    getBranch(skill) {
        if (!skill) return '';
        return skill.branch || skill.config?.branch || this._getConfigValue(skill, 'branch') || '';
    },
    
    /**
     * Get skill class ID
     * @param {Object|null} skill - Skill instance or plain object
     * @returns {string} Class ID
     */
    getClassId(skill) {
        if (!skill) return '';
        return skill.classId || skill.config?.classId || this._getConfigValue(skill, 'classId') || '';
    },
    
    /**
     * Get skill range
     * @param {Object|null} skill - Skill instance or plain object
     * @returns {number} Range
     */
    getRange(skill) {
        if (!skill) return 1;
        return skill.range || skill.config?.range || this._getConfigValue(skill, 'range') || 1;
    },
    
    /**
     * Get skill effects array
     * @param {Object|null} skill - Skill instance or plain object
     * @returns {Array} Effects array
     */
    getEffects(skill) {
        if (!skill) return [];
        return skill.effects || skill.config?.effects || this._getConfigValue(skill, 'effects') || [];
    },
    
    /**
     * Get skill rank
     * @param {Object|null} skill - Skill instance or plain object
     * @returns {number} Current rank (1-5)
     */
    getRank(skill) {
        if (!skill) return 1;
        return skill.rank || 1;
    },
    
    /**
     * Get skill ID (baseId preferred, fallback to id)
     * @param {Object|null} skill - Skill instance or plain object
     * @returns {string} Skill ID
     */
    getId(skill) {
        if (!skill) return '';
        return skill.baseId || skill.id || '';
    },
    
    // === Computed Property Accessors ===
    
    /**
     * Get mana cost
     * @param {Object|null} skill - Skill instance or plain object
     * @returns {number} Mana cost
     */
    getManaCost(skill) {
        if (!skill) return 0;
        
        // Check for getter (Skill instance)
        if (typeof skill.manaCost === 'number') {
            return skill.manaCost;
        }
        
        // Try config
        if (skill.config?.manaCost !== undefined) {
            return skill.config.manaCost;
        }
        
        // Try stored value
        if (skill._manaCost !== undefined) {
            return skill._manaCost;
        }
        
        // Try to get from skillConfig
        return this._getConfigValue(skill, 'manaCost') || 0;
    },
    
    /**
     * Get cooldown in milliseconds
     * @param {Object|null} skill - Skill instance or plain object
     * @returns {number} Cooldown in ms
     */
    getCooldown(skill) {
        if (!skill) return 0;
        
        if (typeof skill.cooldown === 'number') {
            return skill.cooldown;
        }
        
        if (skill.config?.cooldown !== undefined) {
            return skill.config.cooldown;
        }
        
        return this._getConfigValue(skill, 'cooldown') || 0;
    },
    
    /**
     * Check if skill is on cooldown
     * @param {Object|null} skill - Skill instance or plain object
     * @returns {boolean}
     */
    isOnCooldown(skill) {
        if (!skill) return false;
        
        // Check for boolean property (could be getter result)
        if (typeof skill.isOnCooldown === 'boolean') {
            return skill.isOnCooldown;
        }
        
        // Try accessing as getter
        try {
            const proto = Object.getPrototypeOf(skill);
            if (proto && Object.getOwnPropertyDescriptor(proto, 'isOnCooldown')?.get) {
                return skill.isOnCooldown;
            }
        } catch (e) {}
        
        // For plain objects, compute from _cooldownEnd
        return skill._cooldownEnd ? Date.now() < skill._cooldownEnd : false;
    },
    
    /**
     * Get remaining cooldown in milliseconds
     * @param {Object|null} skill - Skill instance or plain object
     * @returns {number}
     */
    getRemainingCooldown(skill) {
        if (!skill) return 0;
        
        if (typeof skill.remainingCooldown === 'number') {
            return skill.remainingCooldown;
        }
        
        try {
            const proto = Object.getPrototypeOf(skill);
            if (proto && Object.getOwnPropertyDescriptor(proto, 'remainingCooldown')?.get) {
                return skill.remainingCooldown;
            }
        } catch (e) {}
        
        return skill._cooldownEnd ? Math.max(0, skill._cooldownEnd - Date.now()) : 0;
    },
    
    /**
     * Get cooldown percent (0-100 for display)
     * @param {Object|null} skill - Skill instance or plain object
     * @returns {number} Percentage 0-100
     */
    getCooldownPercent(skill) {
        if (!skill) return 0;
        
        if (typeof skill.cooldownPercent === 'number') {
            // Skill class returns 0-1, convert to percentage
            return skill.cooldownPercent * 100;
        }
        
        try {
            const proto = Object.getPrototypeOf(skill);
            if (proto && Object.getOwnPropertyDescriptor(proto, 'cooldownPercent')?.get) {
                return skill.cooldownPercent * 100;
            }
        } catch (e) {}
        
        // Compute for plain objects
        if (!this.isOnCooldown(skill)) return 0;
        const total = this.getCooldown(skill);
        if (total === 0) return 0;
        const remaining = this.getRemainingCooldown(skill);
        return (remaining / total) * 100;
    },
    
    // === Type Checks ===
    
    /**
     * Check if skill is passive type
     * @param {Object|null} skill - Skill instance or plain object
     * @returns {boolean}
     */
    isPassive(skill) {
        if (!skill) return false;
        if (typeof skill.isPassive === 'boolean') return skill.isPassive;
        return this.getType(skill) === SkillType.PASSIVE;
    },
    
    /**
     * Check if skill is active type
     * @param {Object|null} skill - Skill instance or plain object
     * @returns {boolean}
     */
    isActiveType(skill) {
        if (!skill) return false;
        if (typeof skill.isActiveType === 'boolean') return skill.isActiveType;
        return this.getType(skill) === SkillType.ACTIVE;
    },
    
    /**
     * Check if skill is toggle type
     * @param {Object|null} skill - Skill instance or plain object
     * @returns {boolean}
     */
    isToggle(skill) {
        if (!skill) return false;
        if (typeof skill.isToggle === 'boolean') return skill.isToggle;
        return this.getType(skill) === SkillType.TOGGLE;
    },
    
    /**
     * Check if skill is triggered type
     * @param {Object|null} skill - Skill instance or plain object
     * @returns {boolean}
     */
    isTriggered(skill) {
        if (!skill) return false;
        if (typeof skill.isTriggered === 'boolean') return skill.isTriggered;
        return this.getType(skill) === SkillType.TRIGGERED;
    },
    
    // === Methods ===
    
    /**
     * Start cooldown on a skill (handles both types)
     * @param {Object} skill - Skill instance or plain object
     */
    startCooldown(skill) {
        if (!skill) return;
        
        if (typeof skill.startCooldown === 'function') {
            skill.startCooldown();
        } else {
            skill._cooldownEnd = Date.now() + this.getCooldown(skill);
        }
    },
    
    /**
     * Set auto-cast state (handles both types)
     * @param {Object} skill - Skill instance or plain object
     * @param {boolean} enabled - Enable/disable
     */
    setAutoCast(skill, enabled) {
        if (!skill) return;
        
        if (typeof skill.setAutoCast === 'function') {
            skill.setAutoCast(enabled);
        } else {
            skill.autoCast = enabled;
        }
    },
    
    /**
     * Toggle skill (for toggle skills)
     * @param {Object} skill - Skill instance or plain object
     * @returns {boolean} New active state
     */
    toggle(skill) {
        if (!skill) return false;
        
        if (typeof skill.toggle === 'function') {
            return skill.toggle();
        } else {
            skill.isActive = !skill.isActive;
            const cooldown = this.getCooldown(skill);
            if (cooldown > 0) {
                this.startCooldown(skill);
            }
            return skill.isActive;
        }
    },
    
    /**
     * Check if skill can be used
     * @param {Object} skill - Skill instance or plain object
     * @param {Object} source - Source character
     * @param {Object} target - Target entity (optional)
     * @returns {Object} { canUse: boolean, reason: string }
     */
    canUse(skill, source, target = null) {
        if (!skill) return { canUse: false, reason: 'No skill' };
        
        // If skill has canUse method, use it
        if (typeof skill.canUse === 'function') {
            return skill.canUse(source, target);
        }
        
        // Inline validation for plain objects
        if (this.isPassive(skill)) {
            return { canUse: false, reason: 'Passive skill' };
        }
        
        if (this.isOnCooldown(skill)) {
            const remaining = this.getRemainingCooldown(skill);
            return { canUse: false, reason: `On cooldown (${Math.ceil(remaining / 1000)}s)` };
        }
        
        const manaCost = this.getManaCost(skill);
        if ((source.currentMana || 0) < manaCost) {
            return { canUse: false, reason: 'Not enough mana' };
        }
        
        if (!source.isAlive) {
            return { canUse: false, reason: 'Character is dead' };
        }
        
        if (source.isStunned?.()) {
            return { canUse: false, reason: 'Stunned' };
        }
        
        if (source.isSilenced?.() && this.getClassId(skill) === 'mage') {
            return { canUse: false, reason: 'Silenced' };
        }
        
        return { canUse: true, reason: '' };
    },
    
    // === Icon Helper ===
    
    /**
     * Get skill icon emoji
     * @param {Object|null} skill - Skill instance or plain object
     * @returns {string} Emoji icon
     */
    getIcon(skill) {
        if (!skill) return '⚔️';
        
        const branchIcons = {
            'berserker': '🔥',
            'guardian': '🛡️',
            'warlord': '👑',
            'elementalist': '🌟',
            'arcanist': '✨',
            'sorcerer': '🔮',
            'assassin': '🗡️',
            'ranger': '🏹',
            'shadow': '👤'
        };
        
        const branch = this.getBranch(skill);
        if (branch && branchIcons[branch]) {
            return branchIcons[branch];
        }
        
        const typeIcons = {
            [SkillType.PASSIVE]: '⭐',
            [SkillType.ACTIVE]: '⚔️',
            [SkillType.TOGGLE]: '🔄',
            [SkillType.TRIGGERED]: '⚡'
        };
        
        return typeIcons[this.getType(skill)] || '⚔️';
    },
    
    // === Internal Helpers ===
    
    /**
     * Get value from skillConfig by skill ID
     * @param {Object} skill - Skill object
     * @param {string} property - Property name
     * @returns {*} Property value or undefined
     */
    _getConfigValue(skill, property) {
        const skillId = skill.baseId || skill.id;
        if (!skillId) return undefined;
        
        try {
            const config = getSkill(skillId);
            return config?.[property];
        } catch (e) {
            return undefined;
        }
    }
};

export default SkillUtils;
