/**
 * @file EffectLibrary.js
 * @description Library of visual effect definitions for skills, attacks, and status effects.
 *              Maps skill names and effect types to visual configurations.
 *              Used by AnimationManager to determine which effects to play.
 * 
 * @location config/EffectLibrary.js
 * @usage Imported by AnimationManager to look up effect configurations
 * @dependencies None (pure configuration)
 * 
 * @version 1.0.0
 * @changelog
 *   - v1.0.0 (2025-02-03): Initial implementation with 50+ effect definitions
 */

/**
 * Effect categories for organization
 */
export const EffectCategory = {
    ATTACK_MAGIC: 'attackMagic',
    HEALING: 'healingMagic',
    BUFF: 'buffs',
    DEBUFF: 'debuffs',
    ATTACK: 'regularAttacks',
    SPECIAL: 'special'
};

/**
 * Color palettes for different damage/effect types
 */
export const EffectColors = {
    // Damage types
    physical: { primary: '#ff4444', secondary: '#ff6666', tertiary: '#ffaaaa' },
    fire: { primary: '#ff6600', secondary: '#ff4400', tertiary: '#ffaa00' },
    ice: { primary: '#44ddff', secondary: '#88eeff', tertiary: '#aaffff' },
    lightning: { primary: '#aa44ff', secondary: '#cc88ff', tertiary: '#dd88ff' },
    poison: { primary: '#88ff44', secondary: '#66cc44', tertiary: '#aaff66' },
    nature: { primary: '#44aa44', secondary: '#66cc44', tertiary: '#88ff88' },
    holy: { primary: '#ffdd66', secondary: '#ffeeaa', tertiary: '#ffffff' },
    shadow: { primary: '#8844aa', secondary: '#aa66cc', tertiary: '#664488' },
    
    // Effect types
    heal: { primary: '#44ff88', secondary: '#88ffaa', tertiary: '#aaffcc' },
    buff: { primary: '#44aaff', secondary: '#88ccff', tertiary: '#ffffff' },
    debuff: { primary: '#ff4488', secondary: '#ff6699', tertiary: '#ffaacc' },
    critical: { primary: '#ffd700', secondary: '#ffaa00', tertiary: '#ffffff' },
    miss: { primary: '#666677', secondary: '#888899', tertiary: '#aaaaaa' },
    
    // Special
    gold: { primary: '#ffaa00', secondary: '#ffcc44', tertiary: '#ffdd88' },
    xp: { primary: '#88ccff', secondary: '#aaddff', tertiary: '#ffffff' },
    levelUp: { primary: '#ffdd44', secondary: '#ffee88', tertiary: '#ffffff' }
};

/**
 * Status effect icon mappings
 */
export const StatusIcons = {
    // Buffs
    buff_damage: '😤',
    buff_defense: '🛡️',
    buff_speed: '💨',
    buff_accuracy: '🎯',
    buff_dodge: '💫',
    buff_crit: '⚡',
    hot: '🌱',
    shield: '🛡️',
    
    // Debuffs
    debuff_damage: '📉',
    debuff_defense: '🎯',
    debuff_speed: '🐌',
    debuff_accuracy: '😵',
    dot: '🔥',
    bleed: '🩸',
    
    // Crowd Control
    stun: '💫',
    silence: '🤐',
    root: '🌿',
    fear: '😱',
    blind: '😵',
    slow: '❄️',
    
    // Special
    taunt: '😠',
    invulnerable: '✨'
};

/**
 * Map EffectSystem effect types to animation configurations
 */
export const EffectTypeAnimations = {
    // Damage over time
    dot: {
        category: EffectCategory.DEBUFF,
        icon: '🔥',
        iconType: 'debuff',
        onApply: {
            aura: { color: '#ff6600', duration: 800, radius: 30 },
            particles: { count: 8, colors: ['#ff4400', '#ff6600', '#ffaa00'], type: 'circle', speed: 40, life: 0.5, gravity: -20 }
        },
        onTick: {
            particles: { count: 3, colors: ['#ff4400', '#ff6600'], type: 'spark', speed: 30, life: 0.4, angle: -Math.PI/2, spread: 0.5 }
        }
    },
    
    bleed: {
        category: EffectCategory.DEBUFF,
        icon: '🩸',
        iconType: 'debuff',
        onApply: {
            particles: { count: 8, colors: ['#cc2222', '#ff4444', '#882222'], type: 'circle', speed: 80, life: 0.6, gravity: 60 }
        },
        onTick: {
            particles: { count: 3, colors: ['#cc2222', '#ff4444'], type: 'circle', speed: 20, life: 0.5, angle: Math.PI/2, spread: 0.3, gravity: 40 }
        }
    },
    
    // Heal over time
    hot: {
        category: EffectCategory.BUFF,
        icon: '🌱',
        iconType: 'buff',
        onApply: {
            aura: { color: '#88ff88', duration: 1000, radius: 35 },
            particles: { count: 10, colors: ['#88ff88', '#aaffaa', '#ccffcc'], type: 'circle', speed: 40, life: 0.7, angle: -Math.PI/2, spread: 0.4, gravity: -25 }
        },
        onTick: {
            particles: { count: 2, colors: ['#88ff88', '#aaffaa'], type: 'circle', speed: 35, life: 0.6, angle: -Math.PI/2, spread: 0.3, gravity: -20 }
        }
    },
    
    // Shield
    shield: {
        category: EffectCategory.BUFF,
        icon: '🛡️',
        iconType: 'buff',
        onApply: {
            aura: { color: '#4488ff', duration: 1200, radius: 40 },
            rings: [
                { color: '#4488ff', maxRadius: 30, duration: 400 },
                { color: '#4488ff', maxRadius: 45, duration: 500, delay: 100 }
            ],
            particles: { count: 12, colors: ['#4488ff', '#88aaff', '#ffffff'], type: 'circle', speed: 50, life: 0.7 }
        }
    },
    
    // Buffs
    buff_damage: {
        category: EffectCategory.BUFF,
        icon: '😤',
        iconType: 'buff',
        onApply: {
            aura: { color: '#ff4444', duration: 1000, radius: 35 },
            particles: { count: 14, colors: ['#ff4444', '#ff6666', '#ffaaaa'], type: 'circle', speed: 80, life: 0.7, angle: -Math.PI/2, spread: 0.7, gravity: -30 }
        }
    },
    
    buff_defense: {
        category: EffectCategory.BUFF,
        icon: '🛡️',
        iconType: 'buff',
        onApply: {
            aura: { color: '#4488ff', duration: 1000, radius: 35 },
            rings: [{ color: '#4488ff', maxRadius: 35, duration: 400 }],
            particles: { count: 10, colors: ['#4488ff', '#88aaff'], type: 'circle', speed: 55, life: 0.7 }
        }
    },
    
    buff_speed: {
        category: EffectCategory.BUFF,
        icon: '💨',
        iconType: 'buff',
        onApply: {
            aura: { color: '#44aaff', duration: 800, radius: 30 },
            particles: { count: 12, colors: ['#44aaff', '#88ccff', '#ffffff'], type: 'spark', speed: 100, life: 0.5 }
        }
    },
    
    // Crowd Control
    stun: {
        category: EffectCategory.DEBUFF,
        icon: '💫',
        iconType: 'debuff',
        onApply: {
            aura: { color: '#ffff88', duration: 1000, radius: 30 },
            particles: { count: 8, colors: ['#ffff88', '#ffffaa', '#ffffff'], type: 'star', speed: 50, life: 0.8, rotationSpeed: 4 }
        }
    },
    
    silence: {
        category: EffectCategory.DEBUFF,
        icon: '🤐',
        iconType: 'debuff',
        onApply: {
            particles: { count: 6, colors: ['#aa44ff', '#cc88ff'], type: 'circle', speed: 35, life: 0.6, angle: -Math.PI/2, spread: 0.5 }
        }
    },
    
    root: {
        category: EffectCategory.DEBUFF,
        icon: '🌿',
        iconType: 'debuff',
        onApply: {
            particles: { count: 12, colors: ['#44aa44', '#66cc44', '#88ff88'], type: 'circle', speed: 35, life: 0.7, angle: -Math.PI/2, spread: 0.3 }
        }
    },
    
    slow: {
        category: EffectCategory.DEBUFF,
        icon: '❄️',
        iconType: 'debuff',
        onApply: {
            aura: { color: '#88ddff', duration: 800, radius: 30 },
            particles: { count: 8, colors: ['#88ddff', '#aaeeff', '#ffffff'], type: 'snow', speed: 50, life: 0.6, rotationSpeed: 1 }
        }
    }
};

/**
 * Skill name to effect key mapping
 */
export const SkillEffectMapping = {
    // Warrior
    'Cleave': 'cleave',
    'Shield Bash': 'shieldBash',
    'Berserker Rage': 'rage',
    'Defensive Stance': 'fortify',
    
    // Mage
    'Fireball': 'fireball',
    'Meteor Strike': 'meteor',
    'Frost Nova': 'frostNova',
    'Frostbolt': 'frostbolt',
    'Lightning Bolt': 'bolt',
    'Chain Lightning': 'chainLightning',
    'Ice Shield': 'iceShield',
    
    // Rogue
    'Backstab': 'backstab',
    'Poison Strike': 'venom',
    'Stealth': 'stealth',
    
    // Healing
    'Heal': 'heal',
    'Rejuvenation': 'rejuv',
    'Healing Wave': 'healWave'
};

/**
 * Detailed skill effect definitions
 */
export const SkillEffects = {
    // Melee attacks
    slash: {
        category: EffectCategory.ATTACK,
        attackLine: { color: '#ff4444', duration: 250 },
        onHit: {
            shake: 'light',
            particles: { count: 10, colors: ['#ff4444', '#ff6666', '#ffaaaa'], type: 'spark', speed: 180, life: 0.4, gravity: 80 }
        }
    },
    
    critical: {
        category: EffectCategory.ATTACK,
        attackLine: { color: '#ffd700', duration: 300, lineWidth: 5 },
        onHit: {
            shake: 'heavy',
            particles: { count: 18, colors: ['#ffd700', '#ffaa00', '#ffffff'], type: 'spark', speed: 280, life: 0.6, gravity: 70 },
            starBurst: { count: 6, colors: ['#ffd700'], type: 'star', speed: 80, life: 0.8, rotationSpeed: 4 }
        }
    },
    
    // Fire magic
    fireball: {
        category: EffectCategory.ATTACK_MAGIC,
        projectile: {
            speed: 420,
            size: 12,
            color: '#ff6600',
            trailColors: ['#ff6600', '#ff4400', '#ffaa00']
        },
        onHit: {
            shake: 'medium',
            ring: { color: '#ff6600', maxRadius: 70, duration: 280 },
            particles: { count: 25, colors: ['#ff4400', '#ff6600', '#ffaa00'], speed: 220, life: 0.6, gravity: 50 }
        }
    },
    
    // Ice magic
    frostbolt: {
        category: EffectCategory.ATTACK_MAGIC,
        projectile: {
            speed: 380,
            size: 9,
            color: '#44ddff',
            trailColors: ['#44ddff', '#88eeff', '#aaffff']
        },
        onHit: {
            particles: { count: 12, colors: ['#44ddff', '#88eeff', '#ffffff'], type: 'snow', speed: 130, life: 0.5 }
        }
    },
    
    frostNova: {
        category: EffectCategory.ATTACK_MAGIC,
        rings: [
            { color: '#44ddff', maxRadius: 35, duration: 300, delay: 0 },
            { color: '#44ddff', maxRadius: 65, duration: 300, delay: 55 },
            { color: '#44ddff', maxRadius: 95, duration: 300, delay: 110 }
        ],
        particles: { count: 20, colors: ['#44ddff', '#88eeff', '#ffffff'], type: 'snow', speed: 80, life: 0.6 }
    },
    
    // Lightning magic
    bolt: {
        category: EffectCategory.ATTACK_MAGIC,
        lightning: { color: '#aa44ff', duration: 320 },
        onHit: {
            shake: 'medium',
            particles: { count: 12, colors: ['#aa44ff', '#dd88ff', '#ffffff'], type: 'spark', speed: 180, life: 0.28 }
        }
    },
    
    // Healing
    heal: {
        category: EffectCategory.HEALING,
        ring: { color: '#44ff88', maxRadius: 45, duration: 350 },
        particles: { count: 16, colors: ['#44ff88', '#88ffaa', '#aaffcc'], speed: 70, angle: -Math.PI/2, spread: 0.6, life: 0.8, gravity: -35 }
    },
    
    // Buffs
    rage: {
        category: EffectCategory.BUFF,
        aura: { color: '#ff4444', duration: 1400, radius: 40 },
        particles: { count: 14, colors: ['#ff4444', '#ff6666', '#ffaaaa'], speed: 80, life: 0.7, gravity: -30 }
    },
    
    fortify: {
        category: EffectCategory.BUFF,
        aura: { color: '#4488ff', duration: 1400, radius: 40 },
        rings: [{ color: '#4488ff', maxRadius: 45, duration: 500 }],
        particles: { count: 10, colors: ['#4488ff', '#88aaff', '#ffffff'], speed: 55, life: 0.75 }
    },
    
    // Special effects
    levelUp: {
        category: EffectCategory.SPECIAL,
        aura: { color: '#ffdd44', duration: 1800, radius: 50 },
        rings: [
            { color: '#ffdd44', maxRadius: 30, duration: 500, delay: 0 },
            { color: '#ffdd44', maxRadius: 55, duration: 500, delay: 100 },
            { color: '#ffdd44', maxRadius: 80, duration: 500, delay: 200 }
        ],
        particles: { count: 25, colors: ['#ffdd44', '#ffee88', '#ffffff'], type: 'star', speed: 120, life: 1, rotationSpeed: 4 },
        shake: 'medium'
    },
    
    lootDrop: {
        category: EffectCategory.SPECIAL,
        ring: { color: '#ffaa00', maxRadius: 50, duration: 400 },
        particles: { count: 15, colors: ['#ffaa00', '#ffcc44', '#ffdd88'], type: 'star', speed: 100, life: 0.7, gravity: 60 }
    },
    
    death: {
        category: EffectCategory.SPECIAL,
        aura: { color: '#444444', duration: 1200, radius: 40 },
        particles: { count: 20, colors: ['#444444', '#666666', '#333333'], speed: 80, life: 1, gravity: 40 }
    }
};

/**
 * Loot rarity effects
 */
export const LootRarityEffects = {
    common: { glow: '#9d9d9d' },
    uncommon: { glow: '#1eff00', particles: { count: 5, colors: ['#1eff00', '#88ff88'] } },
    rare: { glow: '#0070dd', particles: { count: 8, colors: ['#0070dd', '#4488ff'] } },
    epic: { glow: '#a335ee', particles: { count: 10, colors: ['#a335ee', '#cc66ff'] } },
    legendary: { glow: '#ff8000', particles: { count: 15, colors: ['#ff8000', '#ffaa44'], type: 'star' } }
};

export default {
    EffectCategory,
    EffectColors,
    StatusIcons,
    EffectTypeAnimations,
    SkillEffectMapping,
    SkillEffects,
    LootRarityEffects
};
