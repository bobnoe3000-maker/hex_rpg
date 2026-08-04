/**
 * @file Skill.js
 * @description Runtime skill instances with state management, cooldowns, and ranks.
 *              Includes robust serialization/deserialization for save/load.
 * 
 * @location models/Skill.js
 * @usage Imported by Character.js, SkillEngine.js, SkillTreeUI.js, SkillBarUI.js
 * @dependencies config/skillConfig.js
 * 
 * @version 1.1.0
 * @changelog
 *   - v1.1.0 (2025-01-10): Added fromData() for reconstructing skills from plain objects,
 *                          enhanced fromJSON() with better edge case handling
 *   - v1.0.0 (2025-01-10): Initial implementation
 */

import { 
    getSkill, 
    SkillConstants, 
    SkillType,
    calculateEffectValue,
    calculateManaCost,
    calculateCooldown
} from '../config/skillConfig.js';

export class Skill {
    /**
     * Create a skill instance
     * @param {string} baseId - Reference to skill in skillConfig
     * @param {number} rank - Current rank (1-5)
     */
    constructor(baseId, rank = 1) {
        this.id = `skill_${baseId}_${Date.now()}`;
        this.baseId = baseId;
        this.rank = Math.min(Math.max(1, rank), SkillConstants.MAX_RANK);
        
        // Cooldown state
        this._cooldownEnd = 0;
        
        // Toggle state (for toggle skills)
        this.isActive = false;
        
        // Auto-cast setting
        this.autoCast = false;
        
        // Cache the config
        this._configCache = null;
    }
    
    // === Getters ===
    
    /**
     * Get the skill configuration from skillConfig
     */
    get config() {
        if (!this._configCache) {
            this._configCache = getSkill(this.baseId);
        }
        return this._configCache;
    }
    
    get name() {
        return this.config?.name || 'Unknown Skill';
    }
    
    get description() {
        return this.config?.description || '';
    }
    
    get type() {
        return this.config?.type || SkillType.ACTIVE;
    }
    
    get targetType() {
        return this.config?.targetType || 'enemy';
    }
    
    get branch() {
        return this.config?.branch || '';
    }
    
    get classId() {
        return this.config?.classId || '';
    }
    
    get tier() {
        return this.config?.tier || 1;
    }
    
    get icon() {
        return this.config?.icon || 'default_skill';
    }
    
    get range() {
        return this.config?.range || 1;
    }
    
    get effects() {
        return this.config?.effects || [];
    }
    
    get triggerCondition() {
        return this.config?.triggerCondition || null;
    }
    
    /**
     * Get rank-scaled mana cost
     */
    get manaCost() {
        return calculateManaCost(this.config, this.rank);
    }
    
    /**
     * Get rank-scaled cooldown in milliseconds
     */
    get cooldown() {
        return calculateCooldown(this.config, this.rank);
    }
    
    /**
     * Get rank description for current rank
     */
    get rankDescription() {
        const descriptions = this.config?.rankDescriptions || {};
        return descriptions[this.rank] || this.description;
    }
    
    /**
     * Check if skill is on cooldown
     */
    get isOnCooldown() {
        return Date.now() < this._cooldownEnd;
    }
    
    /**
     * Get remaining cooldown in milliseconds
     */
    get remainingCooldown() {
        return Math.max(0, this._cooldownEnd - Date.now());
    }
    
    /**
     * Get remaining cooldown as percentage (0-1)
     */
    get cooldownPercent() {
        if (!this.isOnCooldown) return 0;
        const total = this.cooldown;
        if (total === 0) return 0;
        return this.remainingCooldown / total;
    }
    
    /**
     * Check if skill is passive
     */
    get isPassive() {
        return this.type === SkillType.PASSIVE;
    }
    
    /**
     * Check if skill is active type
     */
    get isActiveType() {
        return this.type === SkillType.ACTIVE;
    }
    
    /**
     * Check if skill is toggle type
     */
    get isToggle() {
        return this.type === SkillType.TOGGLE;
    }
    
    /**
     * Check if skill is triggered type
     */
    get isTriggered() {
        return this.type === SkillType.TRIGGERED;
    }
    
    /**
     * Check if at max rank
     */
    get isMaxRank() {
        return this.rank >= SkillConstants.MAX_RANK;
    }
    
    // === Methods ===
    
    /**
     * Calculate effect value at current rank
     * @param {number} effectIndex - Index of effect in effects array
     * @param {Object} character - Character for stat scaling
     * @returns {number} Scaled effect value
     */
    getEffectValue(effectIndex, character = null) {
        return calculateEffectValue(this.config, this.rank, effectIndex, character);
    }
    
    /**
     * Get all effect values at current rank
     * @param {Object} character - Character for stat scaling
     * @returns {Object[]} Array of effect objects with calculated values
     */
    getScaledEffects(character = null) {
        return this.effects.map((effect, index) => ({
            ...effect,
            calculatedValue: this.getEffectValue(index, character)
        }));
    }
    
    /**
     * Check if skill can be used by character
     * @param {Object} character - Character trying to use skill
     * @param {Object} target - Target entity (optional)
     * @returns {Object} { canUse: boolean, reason: string }
     */
    canUse(character, target = null) {
        // Passives can't be "used"
        if (this.isPassive) {
            return { canUse: false, reason: 'Passive skill' };
        }
        
        // Check cooldown
        if (this.isOnCooldown) {
            return { canUse: false, reason: `On cooldown (${Math.ceil(this.remainingCooldown / 1000)}s)` };
        }
        
        // Check mana
        if ((character.currentMana || 0) < this.manaCost) {
            return { canUse: false, reason: 'Not enough mana' };
        }
        
        // Check if character is alive
        if (!character.isAlive) {
            return { canUse: false, reason: 'Character is dead' };
        }
        
        // Check stunned
        if (character.isStunned?.()) {
            return { canUse: false, reason: 'Stunned' };
        }
        
        // Check silenced (for spells)
        if (character.isSilenced?.() && this.classId === 'mage') {
            return { canUse: false, reason: 'Silenced' };
        }
        
        return { canUse: true, reason: '' };
    }
    
    /**
     * Start cooldown timer
     */
    startCooldown() {
        this._cooldownEnd = Date.now() + this.cooldown;
    }
    
    /**
     * Reset cooldown (for effects that reset cooldowns)
     */
    resetCooldown() {
        this._cooldownEnd = 0;
    }
    
    /**
     * Reduce cooldown by amount (in ms)
     * @param {number} amount - Amount to reduce
     */
    reduceCooldown(amount) {
        this._cooldownEnd = Math.max(Date.now(), this._cooldownEnd - amount);
    }
    
    /**
     * Reduce cooldown by percentage
     * @param {number} percent - Percentage to reduce (0-1)
     */
    reduceCooldownPercent(percent) {
        const remaining = this.remainingCooldown;
        this._cooldownEnd -= remaining * percent;
    }
    
    /**
     * Upgrade skill rank
     * @returns {boolean} Success
     */
    upgrade() {
        if (this.isMaxRank) return false;
        this.rank++;
        return true;
    }
    
    /**
     * Toggle skill on/off (for toggle skills)
     * @returns {boolean} New active state
     */
    toggle() {
        if (!this.isToggle) return false;
        this.isActive = !this.isActive;
        
        // Start toggle cooldown
        if (this.cooldown > 0) {
            this.startCooldown();
        }
        
        return this.isActive;
    }
    
    /**
     * Set auto-cast state
     * @param {boolean} enabled - Enable auto-cast
     */
    setAutoCast(enabled) {
        // Only active skills can be auto-cast
        if (this.isActiveType) {
            this.autoCast = enabled;
        }
    }
    
    // === Serialization ===
    
    /**
     * Convert to JSON for saving
     */
    toJSON() {
        return {
            baseId: this.baseId,
            rank: this.rank,
            isActive: this.isActive,
            autoCast: this.autoCast,
            cooldownRemaining: this.remainingCooldown
        };
    }
    
    /**
     * Create from JSON data (saved game data)
     * @param {Object} data - Saved skill data
     * @returns {Skill|null} New skill instance or null if invalid
     */
    static fromJSON(data) {
        if (!data) return null;
        
        // Get the base skill ID
        const skillId = data.baseId || data.id;
        if (!skillId) {
            console.warn('Skill.fromJSON: No skill ID found in data');
            return null;
        }
        
        // Verify the skill exists in config
        const config = getSkill(skillId);
        if (!config) {
            console.warn(`Skill.fromJSON: Unknown skill ID: ${skillId}`);
            return null;
        }
        
        const skill = new Skill(skillId, data.rank || 1);
        skill.isActive = data.isActive || false;
        skill.autoCast = data.autoCast || false;
        
        // Restore cooldown if it was saved
        if (data.cooldownRemaining > 0) {
            skill._cooldownEnd = Date.now() + data.cooldownRemaining;
        } else if (data._cooldownEnd && data._cooldownEnd > Date.now()) {
            // Also handle raw _cooldownEnd timestamp
            skill._cooldownEnd = data._cooldownEnd;
        }
        
        return skill;
    }
    
    /**
     * Create a Skill instance from any skill-like object (plain object or partial data).
     * This is the primary method for reconstructing skills after JSON serialization.
     * 
     * @param {Object} data - Skill data (can be Skill instance, plain object, or saved data)
     * @returns {Skill|null} New skill instance or null if invalid
     */
    static fromData(data) {
        if (!data) return null;
        
        // If it's already a proper Skill instance with working methods, return as-is
        if (data instanceof Skill) {
            return data;
        }
        
        // Check if it has the canUse method (functioning Skill instance)
        if (typeof data.canUse === 'function' && typeof data.startCooldown === 'function') {
            return data;
        }
        
        // Reconstruct from plain object
        return Skill.fromJSON(data);
    }
    
    /**
     * Check if an object is a valid Skill instance with working methods
     * @param {*} obj - Object to check
     * @returns {boolean} True if valid Skill instance
     */
    static isValidInstance(obj) {
        if (!obj) return false;
        if (obj instanceof Skill) return true;
        
        // Check for key methods that indicate a working Skill instance
        return typeof obj.canUse === 'function' && 
               typeof obj.startCooldown === 'function' &&
               typeof obj.baseId === 'string';
    }
    
    /**
     * Create a new skill instance from a skill ID
     * @param {string} skillId - Skill ID from skillConfig
     * @param {number} rank - Starting rank
     * @returns {Skill|null} New skill or null if invalid
     */
    static create(skillId, rank = 1) {
        const config = getSkill(skillId);
        if (!config) {
            console.warn(`Unknown skill ID: ${skillId}`);
            return null;
        }
        return new Skill(skillId, rank);
    }
}

export default Skill;
