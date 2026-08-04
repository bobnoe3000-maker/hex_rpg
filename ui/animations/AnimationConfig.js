/**
 * @file AnimationConfig.js
 * @description Configuration constants for the combat animation system.
 *              Defines timings, colors, limits, and type mappings for floating text
 *              and future canvas-based effects.
 * 
 * @location ui/animations/AnimationConfig.js
 * @usage Imported by AnimationManager.js and FloatingTextPool.js
 * @dependencies None (pure configuration)
 * 
 * @version 1.1.1
 * @changelog
 *   - v1.1.1 (2026-03-07): Increased SPAWN_DURATION from 480ms to 750ms so poof completes
 *                          before NPC's first movement tick fires.
 *   - v1.1.0 (2026-03-07): Added EntityAnimationConfig for lunge, shake, and spawn-poof timings.
 *   - v1.0.0 (2025-01-18): Initial implementation for Phase 1 (floating text)
 */

/**
 * Animation timing configuration (in milliseconds)
 */
export const AnimationTiming = {
    // Floating text durations
    DAMAGE_DURATION: 800,
    CRITICAL_DURATION: 1000,
    HEAL_DURATION: 800,
    MISS_DURATION: 600,
    
    // Stagger delay for rapid-fire animations
    STAGGER_DELAY: 50,
    
    // Cleanup buffer (extra time before releasing to pool)
    CLEANUP_BUFFER: 50
};

/**
 * Animation colors (fallbacks if CSS variables unavailable)
 */
export const AnimationColors = {
    DAMAGE: '#ff6b6b',
    CRITICAL: '#ffd700',
    HEAL: '#6bff6b',
    MISS: '#888888',
    XP: '#9b59b6',
    GOLD: '#ffd700'
};

/**
 * Font sizes for floating text
 */
export const AnimationFontSizes = {
    NORMAL: '16px',
    CRITICAL: '22px',
    SMALL: '12px'
};

/**
 * Throttling and pool limits
 */
export const AnimationLimits = {
    // Maximum simultaneous floating text elements
    MAX_FLOATING_TEXT: 15,
    
    // Pool size (pre-allocated elements)
    POOL_SIZE: 20,
    
    // Maximum new animations per frame
    MAX_PER_FRAME: 5,
    
    // Per-type limits
    PER_TYPE: {
        damage: 10,
        critical: 5,
        heal: 5,
        miss: 5
    }
};

/**
 * Floating text type definitions
 * Maps internal types to CSS classes and display properties
 */
export const FloatingTextTypes = {
    damage: {
        cssClass: 'ft-damage',
        prefix: '-',
        duration: AnimationTiming.DAMAGE_DURATION
    },
    critical: {
        cssClass: 'ft-critical',
        prefix: '-',
        suffix: '!',
        duration: AnimationTiming.CRITICAL_DURATION
    },
    heal: {
        cssClass: 'ft-heal',
        prefix: '+',
        duration: AnimationTiming.HEAL_DURATION
    },
    miss: {
        cssClass: 'ft-miss',
        text: 'Miss',
        duration: AnimationTiming.MISS_DURATION
    }
};

/**
 * Heal sources that should show floating text
 * Auto-regen is excluded to reduce visual noise
 */
export const VisibleHealSources = [
    'potion',
    'skill',
    'spell',
    'item',
    'ability',
    'lifesteal'
];

/**
 * Position offset configuration for floating text
 * Adds slight randomization to prevent overlap
 */
export const PositionOffsets = {
    // Base vertical offset (pixels above entity center)
    BASE_Y_OFFSET: -20,
    
    // Random horizontal spread range (pixels)
    X_SPREAD: 20,
    
    // Random vertical spread range (pixels)  
    Y_SPREAD: 10,
    
    // Stacking offset for multiple texts on same target
    STACK_OFFSET: 15
};

/**
 * Entity combat motion animation configuration
 * Controls lunge-toward-target, hit-shake, and spawn-poof timings and distances.
 */
export const EntityAnimationConfig = {
    // Attack lunge — attacker briefly shifts toward defender
    LUNGE_DISTANCE: 12,      // pixels to push toward target
    LUNGE_DURATION: 220,     // ms total (lunge out + snap back)

    // Hit shake — defender oscillates left/right when struck
    SHAKE_DISTANCE: 5,       // peak pixel oscillation
    SHAKE_DURATION: 320,     // ms total

    // Spawn poof — NPC scales + fades in from nothing
    SPAWN_DURATION: 750      // ms total — long enough to complete before first NPC movement tick
};

export default {
    AnimationTiming,
    AnimationColors,
    AnimationFontSizes,
    AnimationLimits,
    FloatingTextTypes,
    VisibleHealSources,
    PositionOffsets,
    EntityAnimationConfig
};
