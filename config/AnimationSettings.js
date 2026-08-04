/**
 * @file AnimationSettings.js
 * @description User-configurable settings for the combat animation system.
 *              Provides category toggles, quality presets, and advanced options.
 *              Settings are persisted in GameState.preferences.
 * 
 * @location config/AnimationSettings.js
 * @usage Imported by AnimationManager.js to check if effects should be shown
 * @dependencies None (pure configuration)
 * 
 * @version 1.1.0
 * @changelog
 *   - v1.1.0 (2026-03-08): Added particleFX category toggle for GIF/spritesheet layer (Phase 3)
 *   - v1.0.0 (2025-02-03): Initial implementation with 5 configurable categories
 */

/**
 * Default animation settings structure
 * This is used to initialize settings if none exist in localStorage
 */
export const DefaultAnimationSettings = {
    // Master toggle (disables all effects)
    enabled: true,
    
    // Category toggles - each can be independently enabled/disabled
    categories: {
        skillEffects: true,      // Magic spells, class abilities, buffs, debuffs
        particleFX: true,        // GIF/spritesheet impact effects (Phase 3)
        regularAttacks: true,    // Melee/ranged attack lines, hit sparks, critical effects
        hpEffects: true,         // Floating damage, healing, and miss numbers
        goldXpEffects: true,     // Gold pickup, XP gain, and level up celebrations
        lootEffects: true        // Item drop particles and quality glow indicators
    },
    
    // Subcategory toggles for fine-grained control
    subcategories: {
        // Skill Effects
        attackMagic: true,       // Offensive spells (fireball, lightning, etc.)
        healingMagic: true,      // Heal effects
        buffs: true,             // Buff auras
        debuffs: true,           // Debuff indicators
        statusIcons: true,       // Buff/debuff icons above entities
        
        // Regular Attacks
        attackLines: true,       // Line from attacker to defender
        hitSparks: true,         // Spark particles on hit
        criticalShake: true,     // Screen shake on critical hits
        
        // HP Effects
        damageNumbers: true,     // Red damage floats
        healNumbers: true,       // Green heal floats
        missIndicators: true,    // Gray miss text
        
        // Gold/XP Effects
        goldPickup: true,        // Gold number + particles
        xpGain: true,            // XP number floats
        levelUp: true,           // Level up burst
        
        // Loot Effects
        dropParticles: true,     // Star fountain on drop
        qualityGlow: true        // Rarity-based glow
    },
    
    // Current quality preset
    quality: 'high',
    
    // Advanced options
    advanced: {
        screenShakeEnabled: true,
        auraEffectsEnabled: true,
        projectileTrailsEnabled: true,
        lightningFlickerEnabled: true
    }
};

/**
 * Quality presets that affect particle counts and durations
 */
export const QualityPresets = {
    low: {
        particleMultiplier: 0.4,
        effectDuration: 0.6,
        maxSimultaneous: 8,
        maxParticles: 80,
        trailLength: 5
    },
    medium: {
        particleMultiplier: 0.7,
        effectDuration: 0.85,
        maxSimultaneous: 15,
        maxParticles: 150,
        trailLength: 8
    },
    high: {
        particleMultiplier: 1.0,
        effectDuration: 1.0,
        maxSimultaneous: 25,
        maxParticles: 200,
        trailLength: 12
    }
};

/**
 * AnimationSettings class - Manages animation preferences
 */
class AnimationSettingsManager {
    constructor() {
        this._settings = { ...DefaultAnimationSettings };
        this._listeners = new Set();
    }
    
    /**
     * Initialize settings from stored preferences
     * @param {Object} storedSettings - Settings from GameState.preferences
     */
    init(storedSettings = null) {
        if (storedSettings) {
            this._settings = this._mergeSettings(DefaultAnimationSettings, storedSettings);
        }
        
        // Check for reduced motion preference
        this._checkReducedMotion();
    }
    
    /**
     * Deep merge settings with defaults (handles missing keys)
     */
    _mergeSettings(defaults, stored) {
        const result = { ...defaults };
        
        for (const key of Object.keys(stored)) {
            if (typeof stored[key] === 'object' && stored[key] !== null && !Array.isArray(stored[key])) {
                result[key] = this._mergeSettings(defaults[key] || {}, stored[key]);
            } else {
                result[key] = stored[key];
            }
        }
        
        return result;
    }
    
    /**
     * Check and respect prefers-reduced-motion
     */
    _checkReducedMotion() {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        
        if (mediaQuery.matches) {
            this._settings.enabled = false;
        }
        
        // Listen for changes
        mediaQuery.addEventListener('change', (e) => {
            if (e.matches) {
                this._settings.enabled = false;
                this._notifyListeners();
            }
        });
    }
    
    // === Getters ===
    
    get enabled() {
        return this._settings.enabled;
    }
    
    get quality() {
        return this._settings.quality;
    }
    
    get qualityPreset() {
        return QualityPresets[this._settings.quality] || QualityPresets.high;
    }
    
    get categories() {
        return this._settings.categories;
    }
    
    get subcategories() {
        return this._settings.subcategories;
    }
    
    get advanced() {
        return this._settings.advanced;
    }
    
    // === Category Checks ===
    
    /**
     * Check if a specific category is enabled
     * @param {string} category - Category name
     * @returns {boolean}
     */
    isCategoryEnabled(category) {
        if (!this._settings.enabled) return false;
        return this._settings.categories[category] !== false;
    }
    
    /**
     * Check if a specific subcategory is enabled
     * @param {string} subcategory - Subcategory name
     * @returns {boolean}
     */
    isSubcategoryEnabled(subcategory) {
        if (!this._settings.enabled) return false;
        return this._settings.subcategories[subcategory] !== false;
    }
    
    /**
     * Check if skill effects should be shown
     */
    shouldShowSkillEffects() {
        return this.isCategoryEnabled('skillEffects');
    }
    
    /**
     * Check if attack effects should be shown
     */
    shouldShowAttackEffects() {
        return this.isCategoryEnabled('regularAttacks');
    }
    
    /**
     * Check if HP effects should be shown
     */
    shouldShowHpEffects() {
        return this.isCategoryEnabled('hpEffects');
    }
    
    /**
     * Check if gold/XP effects should be shown
     */
    shouldShowGoldXpEffects() {
        return this.isCategoryEnabled('goldXpEffects');
    }
    
    /**
     * Check if loot effects should be shown
     */
    shouldShowLootEffects() {
        return this.isCategoryEnabled('lootEffects');
    }
    
    /**
     * Check if screen shake is enabled
     */
    shouldShakeScreen() {
        return this._settings.enabled && 
               this._settings.advanced.screenShakeEnabled &&
               this._settings.subcategories.criticalShake;
    }
    
    // === Setters ===
    
    /**
     * Set master enabled state
     * @param {boolean} enabled
     */
    setEnabled(enabled) {
        this._settings.enabled = enabled;
        this._notifyListeners();
    }
    
    /**
     * Set quality preset
     * @param {string} quality - 'low', 'medium', or 'high'
     */
    setQuality(quality) {
        if (QualityPresets[quality]) {
            this._settings.quality = quality;
            this._notifyListeners();
        }
    }
    
    /**
     * Set category enabled state
     * @param {string} category - Category name
     * @param {boolean} enabled
     */
    setCategoryEnabled(category, enabled) {
        if (this._settings.categories.hasOwnProperty(category)) {
            this._settings.categories[category] = enabled;
            this._notifyListeners();
        }
    }
    
    /**
     * Set subcategory enabled state
     * @param {string} subcategory - Subcategory name
     * @param {boolean} enabled
     */
    setSubcategoryEnabled(subcategory, enabled) {
        if (this._settings.subcategories.hasOwnProperty(subcategory)) {
            this._settings.subcategories[subcategory] = enabled;
            this._notifyListeners();
        }
    }
    
    /**
     * Set advanced option
     * @param {string} option - Option name
     * @param {boolean} enabled
     */
    setAdvancedOption(option, enabled) {
        if (this._settings.advanced.hasOwnProperty(option)) {
            this._settings.advanced[option] = enabled;
            this._notifyListeners();
        }
    }
    
    // === Serialization ===
    
    /**
     * Get settings object for saving to GameState
     * @returns {Object}
     */
    toJSON() {
        return { ...this._settings };
    }
    
    /**
     * Load settings from saved object
     * @param {Object} data
     */
    fromJSON(data) {
        if (data) {
            this._settings = this._mergeSettings(DefaultAnimationSettings, data);
            this._notifyListeners();
        }
    }
    
    // === Listeners ===
    
    /**
     * Add a change listener
     * @param {Function} callback
     */
    addListener(callback) {
        this._listeners.add(callback);
    }
    
    /**
     * Remove a change listener
     * @param {Function} callback
     */
    removeListener(callback) {
        this._listeners.delete(callback);
    }
    
    /**
     * Notify all listeners of settings change
     */
    _notifyListeners() {
        for (const listener of this._listeners) {
            try {
                listener(this._settings);
            } catch (e) {
                console.error('[AnimationSettings] Listener error:', e);
            }
        }
    }
}

// Singleton instance
export const AnimationSettings = new AnimationSettingsManager();

export default AnimationSettings;
