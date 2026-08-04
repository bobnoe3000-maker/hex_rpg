/**
 * @file skillConfig.js
 * @description Complete skill definitions for all classes, branches, and tiers.
 *              Contains skill enums, constants, effect helpers, and 54 skills
 *              (tiers 1-6 for all 9 branches across 3 classes).
 * 
 * @location config/skillConfig.js
 * @usage Imported by Skill.js, SkillEngine.js, SkillTreeUI.js, Character.js
 * @dependencies None (pure data)
 * 
 * @version 1.2.0
 * @changelog
 *   - v1.2.0 (2026-03-08): Added fxId to remaining 4 active skills (Rally Cry, Battle Orders,
 *                           Inspiring Strike, Dispel). All 28 active skills now have fxId.
 *   - v1.1.0 (2026-03-08): Added fxId field to 25 active skills for Phase 3 particle FX system
 *   - v1.0.0 (2025-01-10): Initial implementation with 54 skills (tiers 1-6)
 */

// === CONSTANTS ===

export const SkillConstants = {
    MAX_RANK: 5,
    MAX_ACTIVE_SKILLS: 5,
    
    // Tier requirements
    TIER_REQUIREMENTS: {
        1: { minLevel: 1, skillPointCost: 1 },
        2: { minLevel: 1, skillPointCost: 1 },
        3: { minLevel: 1, skillPointCost: 1 },
        4: { minLevel: 10, skillPointCost: 2 },
        5: { minLevel: 10, skillPointCost: 2 },
        6: { minLevel: 10, skillPointCost: 2 },
        7: { minLevel: 25, skillPointCost: 3 },
        8: { minLevel: 25, skillPointCost: 3 },
        9: { minLevel: 25, skillPointCost: 3 },
        10: { minLevel: 50, skillPointCost: 4 },
        11: { minLevel: 50, skillPointCost: 4 },
        12: { minLevel: 50, skillPointCost: 4 }
    },
    
    // Rank scaling multipliers
    RANK_EFFECT_SCALING: [1.0, 1.25, 1.5, 1.8, 2.2],      // Index 0 = rank 1
    RANK_MANA_SCALING: [1.0, 1.15, 1.3, 1.45, 1.6],
    RANK_COOLDOWN_REDUCTION: [0, 0.05, 0.1, 0.15, 0.2]    // % reduction per rank
};

// === ENUMS ===

export const SkillType = {
    ACTIVE: 'active',       // Manually triggered, has cooldown
    PASSIVE: 'passive',     // Always active when learned
    TOGGLE: 'toggle',       // On/off state
    TRIGGERED: 'triggered'  // Auto-fires on conditions
};

export const TargetType = {
    SELF: 'self',
    ENEMY: 'enemy',
    ALLY: 'ally',
    AOE_ENEMY: 'aoe_enemy',     // All enemies on map
    AOE_ALLY: 'aoe_ally',       // All allies on map
    AOE_AROUND: 'aoe_around',   // All enemies around caster
    NONE: 'none'                // For passives
};

export const EffectType = {
    // Damage
    DAMAGE: 'damage',
    DAMAGE_PERCENT: 'damage_percent',  // % of attack power
    DOT: 'dot',                        // Damage over time
    
    // Healing
    HEAL: 'heal',
    HEAL_PERCENT: 'heal_percent',      // % of max health
    HOT: 'hot',                        // Heal over time
    
    // Stat Buffs
    BUFF_DAMAGE: 'buff_damage',
    BUFF_DEFENSE: 'buff_defense',
    BUFF_ATTACK_SPEED: 'buff_attack_speed',
    BUFF_CRIT_CHANCE: 'buff_crit_chance',
    BUFF_CRIT_DAMAGE: 'buff_crit_damage',
    BUFF_DODGE: 'buff_dodge',
    BUFF_ACCURACY: 'buff_accuracy',
    BUFF_MAX_HEALTH: 'buff_max_health',
    BUFF_MAX_MANA: 'buff_max_mana',
    BUFF_ARMOR: 'buff_armor',
    BUFF_MANA_REGEN: 'buff_mana_regen',
    BUFF_HEALTH_REGEN: 'buff_health_regen',
    
    // Stat Debuffs
    DEBUFF_DAMAGE: 'debuff_damage',
    DEBUFF_DEFENSE: 'debuff_defense',
    DEBUFF_ATTACK_SPEED: 'debuff_attack_speed',
    DEBUFF_ACCURACY: 'debuff_accuracy',
    
    // Crowd Control
    STUN: 'stun',
    SLOW: 'slow',
    ROOT: 'root',
    SILENCE: 'silence',
    FEAR: 'fear',
    BLIND: 'blind',
    TAUNT: 'taunt',
    
    // Special
    LIFESTEAL: 'lifesteal',
    MANA_RESTORE: 'mana_restore',
    COOLDOWN_RESET: 'cooldown_reset',
    SHIELD: 'shield',
    REFLECT: 'reflect',
    IMMUNITY: 'immunity',
    INVULNERABLE: 'invulnerable',
    EXECUTE: 'execute',            // Bonus damage to low HP targets
    ARMOR_PENETRATION: 'armor_penetration',
    BLEED: 'bleed',
    THREAT_MODIFIER: 'threat_modifier'
};

export const TriggerCondition = {
    ON_HIT: 'on_hit',
    ON_CRIT: 'on_crit',
    ON_KILL: 'on_kill',
    ON_DAMAGE_TAKEN: 'on_damage_taken',
    ON_LOW_HEALTH: 'on_low_health',        // Below threshold
    ON_COMBAT_START: 'on_combat_start',
    ON_COMBAT_END: 'on_combat_end',
    ALWAYS: 'always'                        // For passives
};

export const ScalingStat = {
    STRENGTH: 'strength',
    DEXTERITY: 'dexterity',
    INTELLIGENCE: 'intelligence',
    STAMINA: 'stamina',
    ATTACK_POWER: 'attackPower',
    SPELL_POWER: 'spellPower',
    MAX_HEALTH: 'maxHealth',
    MAX_MANA: 'maxMana',
    LEVEL: 'level'
};

// === HELPER FUNCTIONS ===

/**
 * Create an effect object with standard structure
 */
export function createEffect(type, options = {}) {
    return {
        type,
        value: options.value || 0,
        percent: options.percent || 0,      // For percentage-based effects
        duration: options.duration || 0,     // In combat ticks (0 = instant or permanent)
        chance: options.chance || 1.0,       // Proc chance (1.0 = 100%)
        stacks: options.stacks || false,     // Can stack multiple times?
        maxStacks: options.maxStacks || 1,
        scaling: options.scaling || null,    // { stat: ScalingStat, ratio: number }
        modifier: options.modifier || 1.0,   // For slow effects etc.
        ...options
    };
}

/**
 * Generate rank descriptions for a skill
 */
function generateRankDescriptions(baseDesc, baseValue, unit = '', multiplier = true) {
    const descriptions = {};
    for (let rank = 1; rank <= 5; rank++) {
        const scaling = SkillConstants.RANK_EFFECT_SCALING[rank - 1];
        const value = multiplier ? Math.round(baseValue * scaling) : baseValue;
        descriptions[rank] = baseDesc.replace('{value}', value + unit);
    }
    return descriptions;
}

// === SKILL TREE STRUCTURE ===

export const SkillTreeStructure = {
    warrior: {
        id: 'warrior',
        name: 'Warrior',
        branches: {
            berserker: { id: 'berserker', name: 'Berserker', description: 'Pure offense and damage' },
            guardian: { id: 'guardian', name: 'Guardian', description: 'Defense and protection' },
            warlord: { id: 'warlord', name: 'Warlord', description: 'Support and tactics' }
        }
    },
    mage: {
        id: 'mage',
        name: 'Mage',
        branches: {
            elementalist: { id: 'elementalist', name: 'Elementalist', description: 'Raw elemental damage' },
            arcanist: { id: 'arcanist', name: 'Arcanist', description: 'Control and utility' },
            sorcerer: { id: 'sorcerer', name: 'Sorcerer', description: 'Sustain and scaling' }
        }
    },
    rogue: {
        id: 'rogue',
        name: 'Rogue',
        branches: {
            assassin: { id: 'assassin', name: 'Assassin', description: 'Single target burst' },
            ranger: { id: 'ranger', name: 'Ranger', description: 'Ranged and control' },
            shadow: { id: 'shadow', name: 'Shadow', description: 'Evasion and utility' }
        }
    }
};

// === WARRIOR SKILLS ===

export const WarriorSkills = {
    // === BERSERKER BRANCH ===
    warrior_berserker_1: {
        id: 'warrior_berserker_1',
        name: 'Brutal Strikes',
        description: 'Your attacks deal increased physical damage.',
        branch: 'berserker',
        classId: 'warrior',
        tier: 1,
        type: SkillType.PASSIVE,
        targetType: TargetType.NONE,
        icon: 'brutal_strikes',
        manaCost: 0,
        cooldown: 0,
        effects: [
            createEffect(EffectType.BUFF_DAMAGE, {
                percent: 5,
                duration: 0,  // Permanent passive
                scaling: { stat: ScalingStat.STRENGTH, ratio: 0.1 }
            })
        ],
        rankDescriptions: generateRankDescriptions('+{value}% physical damage', 5, '%')
    },
    
    warrior_berserker_2: {
        id: 'warrior_berserker_2',
        name: 'Bloodlust',
        description: 'Gain attack speed when you hit an enemy.',
        branch: 'berserker',
        classId: 'warrior',
        tier: 2,
        type: SkillType.TRIGGERED,
        targetType: TargetType.SELF,
        triggerCondition: TriggerCondition.ON_HIT,
        icon: 'bloodlust',
        manaCost: 0,
        cooldown: 0,
        effects: [
            createEffect(EffectType.BUFF_ATTACK_SPEED, {
                percent: 3,
                duration: 5,
                stacks: true,
                maxStacks: 5
            })
        ],
        rankDescriptions: generateRankDescriptions('+{value}% attack speed per stack (max 5)', 3, '%')
    },
    
    warrior_berserker_3: {
        id: 'warrior_berserker_3',
        name: 'Heavy Swing',
        description: 'A powerful melee attack that deals heavy damage.',
        branch: 'berserker',
        classId: 'warrior',
        tier: 3,
        type: SkillType.ACTIVE,
        targetType: TargetType.ENEMY,
        icon: 'heavy_swing',
        manaCost: 15,
        cooldown: 6000,  // 6 seconds
        range: 1,
        effects: [
            createEffect(EffectType.DAMAGE_PERCENT, {
                percent: 150,
                scaling: { stat: ScalingStat.ATTACK_POWER, ratio: 1.5 }
            })
        ],
        rankDescriptions: generateRankDescriptions('{value}% weapon damage', 150, '%'),
        fxId: 'rock_break',           // Phase 3 particle FX
    },
    
    warrior_berserker_4: {
        id: 'warrior_berserker_4',
        name: 'Reckless Form',
        description: 'Toggle: Increases damage dealt but reduces defense.',
        branch: 'berserker',
        classId: 'warrior',
        tier: 4,
        type: SkillType.TOGGLE,
        targetType: TargetType.SELF,
        icon: 'reckless_form',
        manaCost: 0,  // No cost for toggle
        cooldown: 2000,  // 2 second toggle cooldown
        effects: [
            createEffect(EffectType.BUFF_DAMAGE, { percent: 20 }),
            createEffect(EffectType.DEBUFF_DEFENSE, { percent: 15 })
        ],
        rankDescriptions: {
            1: '+20% damage, -15% defense',
            2: '+25% damage, -15% defense',
            3: '+30% damage, -15% defense',
            4: '+36% damage, -15% defense',
            5: '+44% damage, -15% defense'
        }
    },
    
    warrior_berserker_5: {
        id: 'warrior_berserker_5',
        name: 'Rage Generation',
        description: 'Dealing damage restores a small amount of health.',
        branch: 'berserker',
        classId: 'warrior',
        tier: 5,
        type: SkillType.TRIGGERED,
        targetType: TargetType.SELF,
        triggerCondition: TriggerCondition.ON_HIT,
        icon: 'rage_generation',
        manaCost: 0,
        cooldown: 0,
        effects: [
            createEffect(EffectType.LIFESTEAL, {
                percent: 2,
                chance: 1.0
            })
        ],
        rankDescriptions: generateRankDescriptions('Heal for {value}% of damage dealt', 2, '%')
    },
    
    warrior_berserker_6: {
        id: 'warrior_berserker_6',
        name: 'Whirlwind',
        description: 'Spin and strike all adjacent enemies.',
        branch: 'berserker',
        classId: 'warrior',
        tier: 6,
        type: SkillType.ACTIVE,
        targetType: TargetType.AOE_AROUND,
        icon: 'whirlwind',
        manaCost: 25,
        cooldown: 10000,  // 10 seconds
        range: 1,
        effects: [
            createEffect(EffectType.DAMAGE_PERCENT, {
                percent: 80,
                scaling: { stat: ScalingStat.ATTACK_POWER, ratio: 0.8 }
            })
        ],
        rankDescriptions: generateRankDescriptions('{value}% weapon damage to all adjacent', 80, '%'),
        fxId: 'fire_sparks',           // Phase 3 particle FX
    },
    
    // === GUARDIAN BRANCH ===
    warrior_guardian_1: {
        id: 'warrior_guardian_1',
        name: 'Shield Training',
        description: 'Increases your block and defense rating.',
        branch: 'guardian',
        classId: 'warrior',
        tier: 1,
        type: SkillType.PASSIVE,
        targetType: TargetType.NONE,
        icon: 'shield_training',
        manaCost: 0,
        cooldown: 0,
        effects: [
            createEffect(EffectType.BUFF_DEFENSE, { percent: 5 }),
            createEffect(EffectType.BUFF_DODGE, { percent: 2 })
        ],
        rankDescriptions: generateRankDescriptions('+{value}% defense, +2% dodge', 5, '%')
    },
    
    warrior_guardian_2: {
        id: 'warrior_guardian_2',
        name: 'Fortified Stance',
        description: 'Passively increases your armor value.',
        branch: 'guardian',
        classId: 'warrior',
        tier: 2,
        type: SkillType.PASSIVE,
        targetType: TargetType.NONE,
        icon: 'fortified_stance',
        manaCost: 0,
        cooldown: 0,
        effects: [
            createEffect(EffectType.BUFF_ARMOR, {
                percent: 8,
                scaling: { stat: ScalingStat.STAMINA, ratio: 0.5 }
            })
        ],
        rankDescriptions: generateRankDescriptions('+{value}% armor', 8, '%')
    },
    
    warrior_guardian_3: {
        id: 'warrior_guardian_3',
        name: 'Taunt',
        description: 'Force an enemy to attack you.',
        branch: 'guardian',
        classId: 'warrior',
        tier: 3,
        type: SkillType.ACTIVE,
        targetType: TargetType.ENEMY,
        icon: 'taunt',
        manaCost: 10,
        cooldown: 8000,
        range: 2,
        effects: [
            createEffect(EffectType.TAUNT, { duration: 5 }),
            createEffect(EffectType.THREAT_MODIFIER, { value: 200 })
        ],
        rankDescriptions: generateRankDescriptions('Taunt for {value} ticks', 5, '', false),
        fxId: 'confuse',           // Phase 3 particle FX
    },
    
    warrior_guardian_4: {
        id: 'warrior_guardian_4',
        name: 'Defensive Posture',
        description: 'Toggle: Increases defense but reduces damage dealt.',
        branch: 'guardian',
        classId: 'warrior',
        tier: 4,
        type: SkillType.TOGGLE,
        targetType: TargetType.SELF,
        icon: 'defensive_posture',
        manaCost: 0,
        cooldown: 2000,
        effects: [
            createEffect(EffectType.BUFF_DEFENSE, { percent: 25 }),
            createEffect(EffectType.DEBUFF_DAMAGE, { percent: 15 })
        ],
        rankDescriptions: {
            1: '+25% defense, -15% damage',
            2: '+31% defense, -15% damage',
            3: '+38% defense, -15% damage',
            4: '+45% defense, -15% damage',
            5: '+55% defense, -15% damage'
        }
    },
    
    warrior_guardian_5: {
        id: 'warrior_guardian_5',
        name: 'Iron Will',
        description: 'Reduces all damage taken.',
        branch: 'guardian',
        classId: 'warrior',
        tier: 5,
        type: SkillType.PASSIVE,
        targetType: TargetType.NONE,
        icon: 'iron_will',
        manaCost: 0,
        cooldown: 0,
        effects: [
            createEffect(EffectType.BUFF_DEFENSE, {
                percent: 5,
                scaling: { stat: ScalingStat.STAMINA, ratio: 0.2 }
            })
        ],
        rankDescriptions: generateRankDescriptions('Reduce damage taken by {value}%', 5, '%')
    },
    
    warrior_guardian_6: {
        id: 'warrior_guardian_6',
        name: 'Shield Slam',
        description: 'Bash an enemy with your shield, dealing damage and stunning them.',
        branch: 'guardian',
        classId: 'warrior',
        tier: 6,
        type: SkillType.ACTIVE,
        targetType: TargetType.ENEMY,
        icon: 'shield_slam',
        manaCost: 20,
        cooldown: 12000,
        range: 1,
        effects: [
            createEffect(EffectType.DAMAGE_PERCENT, { percent: 100 }),
            createEffect(EffectType.STUN, { duration: 2 })
        ],
        rankDescriptions: generateRankDescriptions('{value}% damage + 2 tick stun', 100, '%'),
        fxId: 'rock_break',           // Phase 3 particle FX
    },
    
    // === WARLORD BRANCH ===
    warrior_warlord_1: {
        id: 'warrior_warlord_1',
        name: 'Command Presence',
        description: 'Your presence increases party damage.',
        branch: 'warlord',
        classId: 'warrior',
        tier: 1,
        type: SkillType.PASSIVE,
        targetType: TargetType.AOE_ALLY,
        icon: 'command_presence',
        manaCost: 0,
        cooldown: 0,
        effects: [
            createEffect(EffectType.BUFF_DAMAGE, { percent: 3 })
        ],
        rankDescriptions: generateRankDescriptions('Party: +{value}% damage', 3, '%')
    },
    
    warrior_warlord_2: {
        id: 'warrior_warlord_2',
        name: 'Tactical Awareness',
        description: 'Increases party accuracy.',
        branch: 'warlord',
        classId: 'warrior',
        tier: 2,
        type: SkillType.PASSIVE,
        targetType: TargetType.AOE_ALLY,
        icon: 'tactical_awareness',
        manaCost: 0,
        cooldown: 0,
        effects: [
            createEffect(EffectType.BUFF_ACCURACY, { percent: 5 })
        ],
        rankDescriptions: generateRankDescriptions('Party: +{value}% accuracy', 5, '%')
    },
    
    warrior_warlord_3: {
        id: 'warrior_warlord_3',
        name: 'Rally Cry',
        description: 'Heal yourself and boost morale.',
        branch: 'warlord',
        classId: 'warrior',
        tier: 3,
        type: SkillType.ACTIVE,
        targetType: TargetType.SELF,
        icon: 'rally_cry',
        manaCost: 20,
        cooldown: 15000,
        effects: [
            createEffect(EffectType.HEAL_PERCENT, { percent: 15 }),
            createEffect(EffectType.BUFF_DAMAGE, { percent: 10, duration: 10 })
        ],
        rankDescriptions: generateRankDescriptions('Heal {value}% HP, +10% damage for 10s', 15, '%'),
        fxId: 'holy_aura',           // Phase 3 particle FX
    },
    
    warrior_warlord_4: {
        id: 'warrior_warlord_4',
        name: 'Formation Drill',
        description: 'Passively increases party defense.',
        branch: 'warlord',
        classId: 'warrior',
        tier: 4,
        type: SkillType.PASSIVE,
        targetType: TargetType.AOE_ALLY,
        icon: 'formation_drill',
        manaCost: 0,
        cooldown: 0,
        effects: [
            createEffect(EffectType.BUFF_DEFENSE, { percent: 5 })
        ],
        rankDescriptions: generateRankDescriptions('Party: +{value}% defense', 5, '%')
    },
    
    warrior_warlord_5: {
        id: 'warrior_warlord_5',
        name: 'Battle Orders',
        description: 'Reduce cooldowns of your active skills.',
        branch: 'warlord',
        classId: 'warrior',
        tier: 5,
        type: SkillType.ACTIVE,
        targetType: TargetType.SELF,
        icon: 'battle_orders',
        manaCost: 30,
        cooldown: 30000,
        effects: [
            createEffect(EffectType.COOLDOWN_RESET, { percent: 50 })
        ],
        rankDescriptions: generateRankDescriptions('Reduce cooldowns by {value}%', 50, '%'),
        fxId: 'holy_aura',           // Phase 3 particle FX
    },
    
    warrior_warlord_6: {
        id: 'warrior_warlord_6',
        name: 'Inspiring Strike',
        description: 'A powerful attack that also buffs your damage.',
        branch: 'warlord',
        classId: 'warrior',
        tier: 6,
        type: SkillType.ACTIVE,
        targetType: TargetType.ENEMY,
        icon: 'inspiring_strike',
        manaCost: 20,
        cooldown: 10000,
        range: 1,
        effects: [
            createEffect(EffectType.DAMAGE_PERCENT, { percent: 120 }),
            createEffect(EffectType.BUFF_DAMAGE, { percent: 15, duration: 8 })
        ],
        rankDescriptions: generateRankDescriptions('{value}% damage + self buff', 120, '%'),
        fxId: 'sparks',           // Phase 3 particle FX
    }
};

// === MAGE SKILLS ===

export const MageSkills = {
    // === ELEMENTALIST BRANCH ===
    mage_elementalist_1: {
        id: 'mage_elementalist_1',
        name: 'Elemental Focus',
        description: 'Increases all spell damage.',
        branch: 'elementalist',
        classId: 'mage',
        tier: 1,
        type: SkillType.PASSIVE,
        targetType: TargetType.NONE,
        icon: 'elemental_focus',
        manaCost: 0,
        cooldown: 0,
        effects: [
            createEffect(EffectType.BUFF_DAMAGE, {
                percent: 6,
                scaling: { stat: ScalingStat.INTELLIGENCE, ratio: 0.15 }
            })
        ],
        rankDescriptions: generateRankDescriptions('+{value}% spell damage', 6, '%')
    },
    
    mage_elementalist_2: {
        id: 'mage_elementalist_2',
        name: 'Fire Bolt',
        description: 'Hurl a bolt of fire at an enemy.',
        branch: 'elementalist',
        classId: 'mage',
        tier: 2,
        type: SkillType.ACTIVE,
        targetType: TargetType.ENEMY,
        icon: 'fire_bolt',
        manaCost: 12,
        cooldown: 4000,
        range: 3,
        effects: [
            createEffect(EffectType.DAMAGE_PERCENT, {
                percent: 110,
                scaling: { stat: ScalingStat.INTELLIGENCE, ratio: 1.1 }
            })
        ],
        rankDescriptions: generateRankDescriptions('{value}% spell damage', 110, '%'),
        fxId: 'fire_1',           // Phase 3 particle FX
    },
    
    mage_elementalist_3: {
        id: 'mage_elementalist_3',
        name: 'Frost Shard',
        description: 'Launch an icy shard that damages and slows.',
        branch: 'elementalist',
        classId: 'mage',
        tier: 3,
        type: SkillType.ACTIVE,
        targetType: TargetType.ENEMY,
        icon: 'frost_shard',
        manaCost: 15,
        cooldown: 6000,
        range: 3,
        effects: [
            createEffect(EffectType.DAMAGE_PERCENT, { percent: 90 }),
            createEffect(EffectType.SLOW, { modifier: 0.7, duration: 3 })
        ],
        rankDescriptions: generateRankDescriptions('{value}% damage + 30% slow', 90, '%'),
        fxId: 'icicle_pike',           // Phase 3 particle FX
    },
    
    mage_elementalist_4: {
        id: 'mage_elementalist_4',
        name: 'Lightning Arc',
        description: 'Strike an enemy with lightning, dealing high damage.',
        branch: 'elementalist',
        classId: 'mage',
        tier: 4,
        type: SkillType.ACTIVE,
        targetType: TargetType.ENEMY,
        icon: 'lightning_arc',
        manaCost: 20,
        cooldown: 8000,
        range: 3,
        effects: [
            createEffect(EffectType.DAMAGE_PERCENT, {
                percent: 140,
                scaling: { stat: ScalingStat.INTELLIGENCE, ratio: 1.4 }
            })
        ],
        rankDescriptions: generateRankDescriptions('{value}% spell damage', 140, '%'),
        fxId: 'lightning_bolt',           // Phase 3 particle FX
    },
    
    mage_elementalist_5: {
        id: 'mage_elementalist_5',
        name: 'Elemental Affinity',
        description: 'Reduces the mana cost of your spells.',
        branch: 'elementalist',
        classId: 'mage',
        tier: 5,
        type: SkillType.PASSIVE,
        targetType: TargetType.NONE,
        icon: 'elemental_affinity',
        manaCost: 0,
        cooldown: 0,
        effects: [
            createEffect(EffectType.BUFF_MAX_MANA, { percent: 10 })
        ],
        rankDescriptions: generateRankDescriptions('+{value}% max mana', 10, '%')
    },
    
    mage_elementalist_6: {
        id: 'mage_elementalist_6',
        name: 'Fireball',
        description: 'Hurl an explosive fireball that damages all nearby enemies.',
        branch: 'elementalist',
        classId: 'mage',
        tier: 6,
        type: SkillType.ACTIVE,
        targetType: TargetType.AOE_ENEMY,
        icon: 'fireball',
        manaCost: 30,
        cooldown: 12000,
        range: 3,
        effects: [
            createEffect(EffectType.DAMAGE_PERCENT, {
                percent: 100,
                scaling: { stat: ScalingStat.INTELLIGENCE, ratio: 1.0 }
            })
        ],
        rankDescriptions: generateRankDescriptions('{value}% damage to all enemies', 100, '%'),
        fxId: 'bonfire',           // Phase 3 particle FX
    },
    
    // === ARCANIST BRANCH ===
    mage_arcanist_1: {
        id: 'mage_arcanist_1',
        name: 'Mana Efficiency',
        description: 'Increases mana regeneration.',
        branch: 'arcanist',
        classId: 'mage',
        tier: 1,
        type: SkillType.PASSIVE,
        targetType: TargetType.NONE,
        icon: 'mana_efficiency',
        manaCost: 0,
        cooldown: 0,
        effects: [
            createEffect(EffectType.BUFF_MANA_REGEN, { percent: 10 })
        ],
        rankDescriptions: generateRankDescriptions('+{value}% mana regen', 10, '%')
    },
    
    mage_arcanist_2: {
        id: 'mage_arcanist_2',
        name: 'Arcane Missiles',
        description: 'Fire a burst of arcane energy.',
        branch: 'arcanist',
        classId: 'mage',
        tier: 2,
        type: SkillType.ACTIVE,
        targetType: TargetType.ENEMY,
        icon: 'arcane_missiles',
        manaCost: 10,
        cooldown: 3000,
        range: 3,
        effects: [
            createEffect(EffectType.DAMAGE_PERCENT, { percent: 80 })
        ],
        rankDescriptions: generateRankDescriptions('{value}% spell damage', 80, '%'),
        fxId: 'electric_b',           // Phase 3 particle FX
    },
    
    mage_arcanist_3: {
        id: 'mage_arcanist_3',
        name: 'Dispel',
        description: 'Remove a buff from an enemy.',
        branch: 'arcanist',
        classId: 'mage',
        tier: 3,
        type: SkillType.ACTIVE,
        targetType: TargetType.ENEMY,
        icon: 'dispel',
        manaCost: 15,
        cooldown: 10000,
        range: 3,
        effects: [
            createEffect(EffectType.DAMAGE_PERCENT, { percent: 40 })
            // Note: Buff removal handled by SkillEngine
        ],
        rankDescriptions: generateRankDescriptions('{value}% damage + remove 1 buff', 40, '%'),
        fxId: 'smoke_simple',           // Phase 3 particle FX
    },
    
    mage_arcanist_4: {
        id: 'mage_arcanist_4',
        name: 'Mana Shield',
        description: 'Create a shield that absorbs damage using mana.',
        branch: 'arcanist',
        classId: 'mage',
        tier: 4,
        type: SkillType.ACTIVE,
        targetType: TargetType.SELF,
        icon: 'mana_shield',
        manaCost: 25,
        cooldown: 20000,
        effects: [
            createEffect(EffectType.SHIELD, {
                percent: 20,  // % of max mana as shield
                duration: 10,
                scaling: { stat: ScalingStat.MAX_MANA, ratio: 0.2 }
            })
        ],
        rankDescriptions: generateRankDescriptions('Shield for {value}% of max mana', 20, '%'),
        fxId: 'rotating_shield',           // Phase 3 particle FX
    },
    
    mage_arcanist_5: {
        id: 'mage_arcanist_5',
        name: 'Spell Weaving',
        description: 'Increases spell casting speed.',
        branch: 'arcanist',
        classId: 'mage',
        tier: 5,
        type: SkillType.PASSIVE,
        targetType: TargetType.NONE,
        icon: 'spell_weaving',
        manaCost: 0,
        cooldown: 0,
        effects: [
            createEffect(EffectType.BUFF_ATTACK_SPEED, { percent: 8 })
        ],
        rankDescriptions: generateRankDescriptions('+{value}% cast speed', 8, '%')
    },
    
    mage_arcanist_6: {
        id: 'mage_arcanist_6',
        name: 'Time Slow',
        description: 'Slow all enemies significantly.',
        branch: 'arcanist',
        classId: 'mage',
        tier: 6,
        type: SkillType.ACTIVE,
        targetType: TargetType.AOE_ENEMY,
        icon: 'time_slow',
        manaCost: 35,
        cooldown: 18000,
        range: 3,
        effects: [
            createEffect(EffectType.SLOW, { modifier: 0.5, duration: 5 })
        ],
        rankDescriptions: generateRankDescriptions('50% slow for {value} ticks', 5, '', false),
        fxId: 'blue_vortex',           // Phase 3 particle FX
    },
    
    // === SORCERER BRANCH ===
    mage_sorcerer_1: {
        id: 'mage_sorcerer_1',
        name: 'Mana Pool',
        description: 'Increases your maximum mana.',
        branch: 'sorcerer',
        classId: 'mage',
        tier: 1,
        type: SkillType.PASSIVE,
        targetType: TargetType.NONE,
        icon: 'mana_pool',
        manaCost: 0,
        cooldown: 0,
        effects: [
            createEffect(EffectType.BUFF_MAX_MANA, {
                percent: 8,
                scaling: { stat: ScalingStat.INTELLIGENCE, ratio: 0.5 }
            })
        ],
        rankDescriptions: generateRankDescriptions('+{value}% max mana', 8, '%')
    },
    
    mage_sorcerer_2: {
        id: 'mage_sorcerer_2',
        name: 'Drain Essence',
        description: 'Drain life from an enemy, damaging them and healing yourself.',
        branch: 'sorcerer',
        classId: 'mage',
        tier: 2,
        type: SkillType.ACTIVE,
        targetType: TargetType.ENEMY,
        icon: 'drain_essence',
        manaCost: 18,
        cooldown: 8000,
        range: 2,
        effects: [
            createEffect(EffectType.DAMAGE_PERCENT, { percent: 70 }),
            createEffect(EffectType.LIFESTEAL, { percent: 50 })
        ],
        rankDescriptions: generateRankDescriptions('{value}% damage, heal for 50% dealt', 70, '%'),
        fxId: 'lifestream',           // Phase 3 particle FX
    },
    
    mage_sorcerer_3: {
        id: 'mage_sorcerer_3',
        name: 'Arcane Infusion',
        description: 'Increases spell damage based on intelligence.',
        branch: 'sorcerer',
        classId: 'mage',
        tier: 3,
        type: SkillType.PASSIVE,
        targetType: TargetType.NONE,
        icon: 'arcane_infusion',
        manaCost: 0,
        cooldown: 0,
        effects: [
            createEffect(EffectType.BUFF_DAMAGE, {
                percent: 0,
                scaling: { stat: ScalingStat.INTELLIGENCE, ratio: 0.3 }
            })
        ],
        rankDescriptions: {
            1: '+0.3% damage per INT',
            2: '+0.38% damage per INT',
            3: '+0.45% damage per INT',
            4: '+0.54% damage per INT',
            5: '+0.66% damage per INT'
        }
    },
    
    mage_sorcerer_4: {
        id: 'mage_sorcerer_4',
        name: 'Spell Leech',
        description: 'Your spells heal you for a portion of damage dealt.',
        branch: 'sorcerer',
        classId: 'mage',
        tier: 4,
        type: SkillType.PASSIVE,
        targetType: TargetType.NONE,
        icon: 'spell_leech',
        manaCost: 0,
        cooldown: 0,
        effects: [
            createEffect(EffectType.LIFESTEAL, { percent: 5 })
        ],
        rankDescriptions: generateRankDescriptions('Heal for {value}% of spell damage', 5, '%')
    },
    
    mage_sorcerer_5: {
        id: 'mage_sorcerer_5',
        name: 'Channel Focus',
        description: 'Toggle: Increased damage but reduced movement.',
        branch: 'sorcerer',
        classId: 'mage',
        tier: 5,
        type: SkillType.TOGGLE,
        targetType: TargetType.SELF,
        icon: 'channel_focus',
        manaCost: 0,
        cooldown: 2000,
        effects: [
            createEffect(EffectType.BUFF_DAMAGE, { percent: 25 }),
            createEffect(EffectType.SLOW, { modifier: 0.7 })  // Self-slow
        ],
        rankDescriptions: {
            1: '+25% damage, 30% self slow',
            2: '+31% damage, 30% self slow',
            3: '+38% damage, 30% self slow',
            4: '+45% damage, 30% self slow',
            5: '+55% damage, 30% self slow'
        }
    },
    
    mage_sorcerer_6: {
        id: 'mage_sorcerer_6',
        name: 'Mana Flood',
        description: 'Restore a large amount of mana.',
        branch: 'sorcerer',
        classId: 'mage',
        tier: 6,
        type: SkillType.ACTIVE,
        targetType: TargetType.SELF,
        icon: 'mana_flood',
        manaCost: 0,
        cooldown: 45000,
        effects: [
            createEffect(EffectType.MANA_RESTORE, { percent: 40 })
        ],
        rankDescriptions: generateRankDescriptions('Restore {value}% max mana', 40, '%'),
        fxId: 'water_drops',           // Phase 3 particle FX
    }
};

// === ROGUE SKILLS ===

export const RogueSkills = {
    // === ASSASSIN BRANCH ===
    rogue_assassin_1: {
        id: 'rogue_assassin_1',
        name: 'Precision Strikes',
        description: 'Increases critical hit damage.',
        branch: 'assassin',
        classId: 'rogue',
        tier: 1,
        type: SkillType.PASSIVE,
        targetType: TargetType.NONE,
        icon: 'precision_strikes',
        manaCost: 0,
        cooldown: 0,
        effects: [
            createEffect(EffectType.BUFF_CRIT_DAMAGE, { percent: 15 })
        ],
        rankDescriptions: generateRankDescriptions('+{value}% crit damage', 15, '%')
    },
    
    rogue_assassin_2: {
        id: 'rogue_assassin_2',
        name: 'Backstab',
        description: 'A precise strike that deals bonus damage.',
        branch: 'assassin',
        classId: 'rogue',
        tier: 2,
        type: SkillType.ACTIVE,
        targetType: TargetType.ENEMY,
        icon: 'backstab',
        manaCost: 12,
        cooldown: 5000,
        range: 1,
        effects: [
            createEffect(EffectType.DAMAGE_PERCENT, {
                percent: 140,
                scaling: { stat: ScalingStat.DEXTERITY, ratio: 1.4 }
            })
        ],
        rankDescriptions: generateRankDescriptions('{value}% weapon damage', 140, '%'),
        fxId: 'dark_swirl',           // Phase 3 particle FX
    },
    
    rogue_assassin_3: {
        id: 'rogue_assassin_3',
        name: 'Poisoned Blades',
        description: 'Your attacks have a chance to apply poison.',
        branch: 'assassin',
        classId: 'rogue',
        tier: 3,
        type: SkillType.PASSIVE,
        targetType: TargetType.NONE,
        icon: 'poisoned_blades',
        manaCost: 0,
        cooldown: 0,
        triggerCondition: TriggerCondition.ON_HIT,
        effects: [
            createEffect(EffectType.DOT, {
                value: 5,
                duration: 4,
                chance: 0.25,
                scaling: { stat: ScalingStat.DEXTERITY, ratio: 0.1 }
            })
        ],
        rankDescriptions: generateRankDescriptions('25% chance: {value} poison/tick for 4 ticks', 5, ''),
        fxId: 'poison_cloud',           // Phase 3 particle FX
    },
    
    rogue_assassin_4: {
        id: 'rogue_assassin_4',
        name: 'Shadow Step',
        description: 'Instantly strike an enemy from the shadows.',
        branch: 'assassin',
        classId: 'rogue',
        tier: 4,
        type: SkillType.ACTIVE,
        targetType: TargetType.ENEMY,
        icon: 'shadow_step',
        manaCost: 20,
        cooldown: 12000,
        range: 3,
        effects: [
            createEffect(EffectType.DAMAGE_PERCENT, { percent: 130 }),
            createEffect(EffectType.BUFF_CRIT_CHANCE, { percent: 25, duration: 1 })
        ],
        rankDescriptions: generateRankDescriptions('{value}% damage + 25% crit next hit', 130, '%'),
        fxId: 'smoke_simple',           // Phase 3 particle FX
    },
    
    rogue_assassin_5: {
        id: 'rogue_assassin_5',
        name: 'Weak Point',
        description: 'Your attacks ignore a portion of enemy armor.',
        branch: 'assassin',
        classId: 'rogue',
        tier: 5,
        type: SkillType.PASSIVE,
        targetType: TargetType.NONE,
        icon: 'weak_point',
        manaCost: 0,
        cooldown: 0,
        effects: [
            createEffect(EffectType.ARMOR_PENETRATION, { percent: 10 })
        ],
        rankDescriptions: generateRankDescriptions('Ignore {value}% armor', 10, '%')
    },
    
    rogue_assassin_6: {
        id: 'rogue_assassin_6',
        name: 'Execute',
        description: 'A devastating finisher that deals bonus damage to low-health enemies.',
        branch: 'assassin',
        classId: 'rogue',
        tier: 6,
        type: SkillType.ACTIVE,
        targetType: TargetType.ENEMY,
        icon: 'execute',
        manaCost: 25,
        cooldown: 15000,
        range: 1,
        effects: [
            createEffect(EffectType.DAMAGE_PERCENT, { percent: 150 }),
            createEffect(EffectType.EXECUTE, { 
                bonusPercent: 100,  // +100% damage if target below threshold
                threshold: 0.3      // 30% HP
            })
        ],
        rankDescriptions: generateRankDescriptions('{value}% damage, +100% if target <30% HP', 150, '%'),
        fxId: 'dark_ritual',           // Phase 3 particle FX
    },
    
    // === RANGER BRANCH ===
    rogue_ranger_1: {
        id: 'rogue_ranger_1',
        name: 'Marksmanship',
        description: 'Increases ranged attack damage.',
        branch: 'ranger',
        classId: 'rogue',
        tier: 1,
        type: SkillType.PASSIVE,
        targetType: TargetType.NONE,
        icon: 'marksmanship',
        manaCost: 0,
        cooldown: 0,
        effects: [
            createEffect(EffectType.BUFF_DAMAGE, {
                percent: 5,
                scaling: { stat: ScalingStat.DEXTERITY, ratio: 0.1 }
            })
        ],
        rankDescriptions: generateRankDescriptions('+{value}% ranged damage', 5, '%')
    },
    
    rogue_ranger_2: {
        id: 'rogue_ranger_2',
        name: 'Power Shot',
        description: 'A powerful ranged attack.',
        branch: 'ranger',
        classId: 'rogue',
        tier: 2,
        type: SkillType.ACTIVE,
        targetType: TargetType.ENEMY,
        icon: 'power_shot',
        manaCost: 14,
        cooldown: 6000,
        range: 3,
        effects: [
            createEffect(EffectType.DAMAGE_PERCENT, { percent: 130 })
        ],
        rankDescriptions: generateRankDescriptions('{value}% weapon damage', 130, '%'),
        fxId: 'snow',           // Phase 3 particle FX
    },
    
    rogue_ranger_3: {
        id: 'rogue_ranger_3',
        name: 'Snare Trap',
        description: 'Root an enemy in place.',
        branch: 'ranger',
        classId: 'rogue',
        tier: 3,
        type: SkillType.ACTIVE,
        targetType: TargetType.ENEMY,
        icon: 'snare_trap',
        manaCost: 18,
        cooldown: 14000,
        range: 2,
        effects: [
            createEffect(EffectType.ROOT, { duration: 3 }),
            createEffect(EffectType.DAMAGE_PERCENT, { percent: 50 })
        ],
        rankDescriptions: generateRankDescriptions('Root for {value} ticks + 50% damage', 3, '', false),
        fxId: 'gravity',           // Phase 3 particle FX
    },
    
    rogue_ranger_4: {
        id: 'rogue_ranger_4',
        name: 'Quick Draw',
        description: 'Passively increases attack speed.',
        branch: 'ranger',
        classId: 'rogue',
        tier: 4,
        type: SkillType.PASSIVE,
        targetType: TargetType.NONE,
        icon: 'quick_draw',
        manaCost: 0,
        cooldown: 0,
        effects: [
            createEffect(EffectType.BUFF_ATTACK_SPEED, { percent: 8 })
        ],
        rankDescriptions: generateRankDescriptions('+{value}% attack speed', 8, '%')
    },
    
    rogue_ranger_5: {
        id: 'rogue_ranger_5',
        name: 'Piercing Arrow',
        description: 'An attack that ignores armor.',
        branch: 'ranger',
        classId: 'rogue',
        tier: 5,
        type: SkillType.ACTIVE,
        targetType: TargetType.ENEMY,
        icon: 'piercing_arrow',
        manaCost: 20,
        cooldown: 10000,
        range: 3,
        effects: [
            createEffect(EffectType.DAMAGE_PERCENT, { percent: 100 }),
            createEffect(EffectType.ARMOR_PENETRATION, { percent: 100 })  // Ignore all armor
        ],
        rankDescriptions: generateRankDescriptions('{value}% true damage (ignores armor)', 100, '%'),
        fxId: 'electric_b',           // Phase 3 particle FX
    },
    
    rogue_ranger_6: {
        id: 'rogue_ranger_6',
        name: 'Volley',
        description: 'Fire a barrage of arrows at all enemies.',
        branch: 'ranger',
        classId: 'rogue',
        tier: 6,
        type: SkillType.ACTIVE,
        targetType: TargetType.AOE_ENEMY,
        icon: 'volley',
        manaCost: 28,
        cooldown: 14000,
        range: 3,
        effects: [
            createEffect(EffectType.DAMAGE_PERCENT, { percent: 70 })
        ],
        rankDescriptions: generateRankDescriptions('{value}% damage to all enemies', 70, '%'),
        fxId: 'snow',           // Phase 3 particle FX
    },
    
    // === SHADOW BRANCH ===
    rogue_shadow_1: {
        id: 'rogue_shadow_1',
        name: 'Evasion',
        description: 'Increases dodge chance.',
        branch: 'shadow',
        classId: 'rogue',
        tier: 1,
        type: SkillType.PASSIVE,
        targetType: TargetType.NONE,
        icon: 'evasion',
        manaCost: 0,
        cooldown: 0,
        effects: [
            createEffect(EffectType.BUFF_DODGE, {
                percent: 5,
                scaling: { stat: ScalingStat.DEXTERITY, ratio: 0.1 }
            })
        ],
        rankDescriptions: generateRankDescriptions('+{value}% dodge chance', 5, '%')
    },
    
    rogue_shadow_2: {
        id: 'rogue_shadow_2',
        name: 'Smoke Bomb',
        description: 'Blind nearby enemies, reducing their accuracy.',
        branch: 'shadow',
        classId: 'rogue',
        tier: 2,
        type: SkillType.ACTIVE,
        targetType: TargetType.AOE_AROUND,
        icon: 'smoke_bomb',
        manaCost: 15,
        cooldown: 15000,
        range: 1,
        effects: [
            createEffect(EffectType.BLIND, { duration: 3 }),
            createEffect(EffectType.DEBUFF_ACCURACY, { percent: 50, duration: 3 })
        ],
        rankDescriptions: generateRankDescriptions('Blind for {value} ticks, -50% accuracy', 3, '', false),
        fxId: 'smoke_simple',           // Phase 3 particle FX
    },
    
    rogue_shadow_3: {
        id: 'rogue_shadow_3',
        name: 'Fade',
        description: 'Drop combat and reduce threat.',
        branch: 'shadow',
        classId: 'rogue',
        tier: 3,
        type: SkillType.ACTIVE,
        targetType: TargetType.SELF,
        icon: 'fade',
        manaCost: 20,
        cooldown: 20000,
        effects: [
            createEffect(EffectType.THREAT_MODIFIER, { percent: -50 }),
            createEffect(EffectType.BUFF_DODGE, { percent: 30, duration: 3 })
        ],
        rankDescriptions: generateRankDescriptions('-50% threat, +{value}% dodge for 3 ticks', 30, '%'),
        fxId: 'smoke_simple',           // Phase 3 particle FX
    },
    
    rogue_shadow_4: {
        id: 'rogue_shadow_4',
        name: 'Shadow Cloak',
        description: 'Become harder to hit temporarily.',
        branch: 'shadow',
        classId: 'rogue',
        tier: 4,
        type: SkillType.ACTIVE,
        targetType: TargetType.SELF,
        icon: 'shadow_cloak',
        manaCost: 25,
        cooldown: 25000,
        effects: [
            createEffect(EffectType.BUFF_DODGE, { percent: 50, duration: 4 })
        ],
        rankDescriptions: generateRankDescriptions('+{value}% dodge for 4 ticks', 50, '%'),
        fxId: 'dark_aura',           // Phase 3 particle FX
    },
    
    rogue_shadow_5: {
        id: 'rogue_shadow_5',
        name: 'Nimble Footwork',
        description: 'Increases movement speed and dodge.',
        branch: 'shadow',
        classId: 'rogue',
        tier: 5,
        type: SkillType.PASSIVE,
        targetType: TargetType.NONE,
        icon: 'nimble_footwork',
        manaCost: 0,
        cooldown: 0,
        effects: [
            createEffect(EffectType.BUFF_DODGE, { percent: 3 })
            // Movement speed would be handled separately
        ],
        rankDescriptions: generateRankDescriptions('+{value}% dodge', 3, '%')
    },
    
    rogue_shadow_6: {
        id: 'rogue_shadow_6',
        name: 'Shadow Strike',
        description: 'Strike from the shadows and reposition.',
        branch: 'shadow',
        classId: 'rogue',
        tier: 6,
        type: SkillType.ACTIVE,
        targetType: TargetType.ENEMY,
        icon: 'shadow_strike',
        manaCost: 22,
        cooldown: 10000,
        range: 2,
        effects: [
            createEffect(EffectType.DAMAGE_PERCENT, { percent: 120 }),
            createEffect(EffectType.BUFF_DODGE, { percent: 20, duration: 2 })
        ],
        rankDescriptions: generateRankDescriptions('{value}% damage + 20% dodge buff', 120, '%'),
        fxId: 'dark_swirl',           // Phase 3 particle FX
    }
};

// === COMBINED SKILL DATABASE ===

export const AllSkills = {
    ...WarriorSkills,
    ...MageSkills,
    ...RogueSkills
};

// === HELPER FUNCTIONS ===

/**
 * Get a skill by ID
 * @param {string} skillId - The skill ID
 * @returns {Object|null} The skill definition or null
 */
export function getSkill(skillId) {
    return AllSkills[skillId] || null;
}

/**
 * Get all skills for a specific class
 * @param {string} classId - warrior, mage, or rogue
 * @returns {Object[]} Array of skill definitions
 */
export function getSkillsForClass(classId) {
    return Object.values(AllSkills).filter(skill => skill.classId === classId);
}

/**
 * Get all skills for a specific branch
 * @param {string} classId - warrior, mage, or rogue
 * @param {string} branchId - Branch ID (e.g., 'berserker', 'guardian')
 * @returns {Object[]} Array of skill definitions sorted by tier
 */
export function getSkillsForBranch(classId, branchId) {
    return Object.values(AllSkills)
        .filter(skill => skill.classId === classId && skill.branch === branchId)
        .sort((a, b) => a.tier - b.tier);
}

/**
 * Get the branches for a class
 * @param {string} classId - warrior, mage, or rogue
 * @returns {Object} Branch definitions
 */
export function getBranchesForClass(classId) {
    return SkillTreeStructure[classId]?.branches || {};
}

/**
 * Get tier requirements
 * @param {number} tier - Skill tier (1-12)
 * @returns {Object} { minLevel, skillPointCost }
 */
export function getTierRequirements(tier) {
    return SkillConstants.TIER_REQUIREMENTS[tier] || { minLevel: 1, skillPointCost: 1 };
}

/**
 * Calculate scaled effect value for a skill at a given rank
 * @param {Object} skill - Skill definition
 * @param {number} rank - Current rank (1-5)
 * @param {number} effectIndex - Index of effect in effects array
 * @param {Object} character - Character for stat scaling (optional)
 * @returns {number} Scaled effect value
 */
export function calculateEffectValue(skill, rank, effectIndex, character = null) {
    const effect = skill.effects[effectIndex];
    if (!effect) return 0;
    
    const rankMultiplier = SkillConstants.RANK_EFFECT_SCALING[rank - 1] || 1.0;
    let value = (effect.value || 0) * rankMultiplier;
    let percent = (effect.percent || 0) * rankMultiplier;
    
    // Apply stat scaling if character provided
    if (effect.scaling && character) {
        const statValue = character[effect.scaling.stat] || character.totalStats?.[effect.scaling.stat] || 0;
        value += statValue * effect.scaling.ratio * rankMultiplier;
        percent += statValue * effect.scaling.ratio * rankMultiplier;
    }
    
    return effect.value !== undefined ? Math.round(value) : Math.round(percent * 10) / 10;
}

/**
 * Calculate mana cost for a skill at a given rank
 * @param {Object} skill - Skill definition
 * @param {number} rank - Current rank (1-5)
 * @returns {number} Mana cost
 */
export function calculateManaCost(skill, rank) {
    const baseManaCost = skill.manaCost || 0;
    const rankMultiplier = SkillConstants.RANK_MANA_SCALING[rank - 1] || 1.0;
    return Math.floor(baseManaCost * rankMultiplier);
}

/**
 * Calculate cooldown for a skill at a given rank
 * @param {Object} skill - Skill definition
 * @param {number} rank - Current rank (1-5)
 * @returns {number} Cooldown in milliseconds
 */
export function calculateCooldown(skill, rank) {
    const baseCooldown = skill.cooldown || 0;
    const reduction = SkillConstants.RANK_COOLDOWN_REDUCTION[rank - 1] || 0;
    return Math.floor(baseCooldown * (1 - reduction));
}

/**
 * Check if a character can learn a skill
 * @param {Object} skill - Skill definition
 * @param {Object} character - Character object
 * @param {Object} learnedSkills - Map of learned skill IDs to ranks
 * @returns {Object} { canLearn: boolean, reason: string }
 */
export function canLearnSkill(skill, character, learnedSkills = {}) {
    // Check class match
    if (skill.classId !== character.classId) {
        return { canLearn: false, reason: 'Wrong class' };
    }
    
    // Check level requirement
    const tierReqs = getTierRequirements(skill.tier);
    if (character.level < tierReqs.minLevel) {
        return { canLearn: false, reason: `Requires level ${tierReqs.minLevel}` };
    }
    
    // Check skill points
    if ((character.unspentSkillPoints || 0) < tierReqs.skillPointCost) {
        return { canLearn: false, reason: `Requires ${tierReqs.skillPointCost} skill points` };
    }
    
    // Check prerequisite (previous tier in same branch)
    if (skill.tier > 1) {
        const branchSkills = getSkillsForBranch(skill.classId, skill.branch);
        const previousTierSkill = branchSkills.find(s => s.tier === skill.tier - 1);
        
        if (previousTierSkill && !learnedSkills[previousTierSkill.id]) {
            return { canLearn: false, reason: `Learn ${previousTierSkill.name} first` };
        }
    }
    
    // Already learned at max rank
    if (learnedSkills[skill.id] >= SkillConstants.MAX_RANK) {
        return { canLearn: false, reason: 'Already at max rank' };
    }
    
    return { canLearn: true, reason: '' };
}

export default {
    SkillConstants,
    SkillType,
    TargetType,
    EffectType,
    TriggerCondition,
    ScalingStat,
    SkillTreeStructure,
    AllSkills,
    WarriorSkills,
    MageSkills,
    RogueSkills,
    getSkill,
    getSkillsForClass,
    getSkillsForBranch,
    getBranchesForClass,
    getTierRequirements,
    calculateEffectValue,
    calculateManaCost,
    calculateCooldown,
    canLearnSkill,
    createEffect
};
