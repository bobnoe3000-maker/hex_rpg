/**
 * @file itemConfig.js
 * @description Item configuration - Materials, gear slots, procs, loot tables, and potions.
 *              Item power is determined by Material Tier + Upgrade Tier only.
 *              There is NO separate rarity system - material tier IS the rarity.
 * 
 * @location config/itemConfig.js
 * @usage Imported by Item.js model, LootGenerator.js, Character.js, and CharacterManager for gear
 * @dependencies None (pure data configuration)
 * 
 * @version 2.6.0
 * @changelog
 *   - v2.6.0 (2026-03-08): Added fxId field to 12 proc definitions for Phase 3 particle FX system
 *   - v2.5.0 (2026-02-10): Added 9 endgame loot tables for level 50-100 maps.
 *                          Regular: aberration_void (void creatures), construct_ancient (lost civ
 *                          machines), cultist_elite (corrupted mages), elemental_chaos (chaos
 *                          elementals). Boss: boss_pale_king, boss_warden, boss_dreamer,
 *                          boss_dragon, boss_architect. Boss tables guarantee material/aether drops
 *                          with materialBonus 5-6 and gold ranges up to 600.
 *   - v2.4.0 (2026-02-10): Added 4 new loot tables for high-level maps (level 25-50):
 *                          pale_undead (Pale Knights/Bone Colossus - heavy plate/weapons),
 *                          serpent (Sea Serpent - leather/ranged gear), drake (Drakes - broad
 *                          high-value pool), death_knight (Death Knights - elite plate/accessories).
 *                          Higher materialBonus (3-4) and gold/aether ranges for endgame content.
 *   - v2.3.0 (2026-02-09): Added 7 new procs for Phase 4 (PROC_SYSTEM_IMPLEMENTATION.md).
 *                          Offensive: executioner (onCrit bonus damage), soulreaper (onKill heal).
 *                          Defensive: thorns (onHitReceived reflect), warding (onHitReceived shield).
 *                          Utility: evasive (onDodge dodge buff), manaburn (onHit mana drain stub),
 *                          laststand (onLowHealth ATK/DEF buff). All have slotRestriction arrays.
 *   - v2.2.0 (2026-02-09): Enhanced proc system (Phase 1 - PROC_SYSTEM_IMPLEMENTATION.md).
 *                          Added triggerType, chance, cooldown, description to all 5 existing procs.
 *                          Added slotProcRules config for per-slot proc trigger/cooldown rules.
 *                          Proc chance promoted to top-level field (kept in effect for backwards compat).
 *   - v2.1.0 (2026-02-08): Variable material scaling per PRD requirement.
 *                          Replaced flat `statBonus` with `statBase` + `bonusPerTier` per material.
 *                          Higher materials now gain MORE per upgrade tier (PRD: "lower quality
 *                          materials provide smaller increment, higher quality more incremental increases").
 *                          Compressed base bonuses (0-3 range) with variable per-tier scaling (0.50-1.30).
 *                          Creates widening power gap: Wood t10 (+5) overlaps Iron t8, Bronze t6,
 *                          but Ethereal t10 reaches +16. Updated calculateStatBonus() helper.
 *   - v2.0.0 (2026-02-08): Buffed cloth armor base defense values for combat balance.
 *                          cloth_robe: 4 → 8, cloth_hood: 2 → 5, cloth_slippers: 1 → 3.
 *                          Still significantly less than plate (20/8/6) but no longer negligible.
 *                          Preserves armor hierarchy: heavy > medium > light.
 *   - v1.9.0 (2026-01-26): Added housing material drop configuration to all loot tables.
 *                          New properties: materialDropChance, materialMin, materialMax.
 *                          Material tiers are gated by NPC level in LootGenerator.
 *   - v1.8.0 (2025-01-21): Fixed armor subtype values - each armor piece now has unique subtype
 *                          for correct Forge merge matching (helm, plate_armor, plate_boots, etc.)
 *   - v1.7.0 (2025-01-21): Added Aether currency item, aether drop rates to all loot tables,
 *                          expanded upgrades config with material penalties and costs
 *   - v1.6.0 (2025-01-21): Added 5 missing loot tables for Phase 4 creatures:
 *                          cultist, giant, aberration, wyvern, construct
 *   - v1.5.1 (2025-01-03): Updated getItem() to also search potions section
 *   - v1.5.0 (2025-01-03): Added potions section with tiered health/mana potions, getPotion() helper
 *   - v1.4.0 (2025-01-03): Fixed item names - removed redundant material words (Leather/Cloth) from base names
 *   - v1.3.0 (2025-01-03): Added tierDrops config, changed item name format to (tX)
 *   - v1.2.1 (2025-01-02): Reduced all loot drop rates by 50%
 *   - v1.2.0 (2025-01): Added missing loot tables for all NPC types (beast, undead, etc.)
 *   - v1.1.0 (2025-01): Removed rarities, added loot tables, guaranteed gold drops
 *   - v1.0.0 (2025-01): Initial implementation
 */

export const ItemConfig = {
    // ===========================================
    // GEAR SLOTS
    // ===========================================
    slots: {
        head: { id: 'head', name: 'Head', maxEquipped: 1 },
        necklace: { id: 'necklace', name: 'Necklace', maxEquipped: 1 },
        ring: { id: 'ring', name: 'Ring', maxEquipped: 2 },
        body: { id: 'body', name: 'Body', maxEquipped: 1 },
        cape: { id: 'cape', name: 'Cape', maxEquipped: 1 },
        boots: { id: 'boots', name: 'Boots', maxEquipped: 1 },
        mainHand: { id: 'mainHand', name: 'Main Hand', maxEquipped: 1 },
        offHand: { id: 'offHand', name: 'Off Hand', maxEquipped: 1 }
    },
    
    // ===========================================
    // MATERIALS - Metal (Warrior weapons, heavy armor)
    // Higher tier = rarer drops + higher stat bonus
    // 
    // VARIABLE SCALING (v2.1.0 - PRD compliance):
    //   statBase: flat bonus at t0 (compressed range 0-3)
    //   bonusPerTier: stat gained PER upgrade tier (varies by material)
    //   Total bonus = statBase + (upgradeTier × bonusPerTier)
    //   Lower materials gain less per tier, higher materials gain more.
    //   Wood t10 (+5.0) overlaps Iron ~t8, Bronze ~t6, Meteoric ~t3
    // ===========================================
    materials: {
        wood: { id: 'wood', name: 'Wooden', tier: 0, statBase: 0, bonusPerTier: 0.50, dropWeight: 100, color: '#8B4513' },
        iron: { id: 'iron', name: 'Iron', tier: 1, statBase: 0.5, bonusPerTier: 0.60, dropWeight: 60, color: '#708090' },
        bronze: { id: 'bronze', name: 'Bronze', tier: 2, statBase: 1.0, bonusPerTier: 0.70, dropWeight: 35, color: '#CD7F32' },
        steel: { id: 'steel', name: 'Steel', tier: 3, statBase: 1.5, bonusPerTier: 0.80, dropWeight: 20, color: '#B8B8B8' },
        meteoric: { id: 'meteoric', name: 'Meteoric', tier: 4, statBase: 2.0, bonusPerTier: 0.95, dropWeight: 10, color: '#4A0080' },
        adamantium: { id: 'adamantium', name: 'Adamantium', tier: 5, statBase: 2.5, bonusPerTier: 1.10, dropWeight: 4, color: '#00CED1' },
        ethereal: { id: 'ethereal', name: 'Ethereal', tier: 6, statBase: 3.0, bonusPerTier: 1.30, dropWeight: 1, color: '#E6E6FA' }
    },
    
    // Cloth materials (for mage gear) - Variable scaling (v2.1.0)
    clothMaterials: {
        cloth: { id: 'cloth', name: 'Cloth', tier: 0, statBase: 0, bonusPerTier: 0.50, dropWeight: 100, color: '#F5F5DC' },
        silk: { id: 'silk', name: 'Silk', tier: 1, statBase: 0.5, bonusPerTier: 0.60, dropWeight: 60, color: '#FFFACD' },
        enchanted_silk: { id: 'enchanted_silk', name: 'Enchanted Silk', tier: 2, statBase: 1.0, bonusPerTier: 0.75, dropWeight: 35, color: '#DDA0DD' },
        mageweave: { id: 'mageweave', name: 'Mageweave', tier: 3, statBase: 1.5, bonusPerTier: 0.90, dropWeight: 15, color: '#9370DB' },
        arcane_cloth: { id: 'arcane_cloth', name: 'Arcane Cloth', tier: 4, statBase: 2.0, bonusPerTier: 1.05, dropWeight: 6, color: '#8A2BE2' },
        celestial: { id: 'celestial', name: 'Celestial', tier: 5, statBase: 2.5, bonusPerTier: 1.20, dropWeight: 2, color: '#FFD700' }
    },
    
    // Leather materials (for rogue gear) - Variable scaling (v2.1.0)
    leatherMaterials: {
        leather: { id: 'leather', name: 'Leather', tier: 0, statBase: 0, bonusPerTier: 0.50, dropWeight: 100, color: '#8B4513' },
        hardened: { id: 'hardened', name: 'Hardened Leather', tier: 1, statBase: 0.5, bonusPerTier: 0.60, dropWeight: 60, color: '#A0522D' },
        studded: { id: 'studded', name: 'Studded Leather', tier: 2, statBase: 1.0, bonusPerTier: 0.75, dropWeight: 35, color: '#6B4423' },
        dragonskin: { id: 'dragonskin', name: 'Dragonskin', tier: 3, statBase: 1.5, bonusPerTier: 0.90, dropWeight: 15, color: '#228B22' },
        shadow: { id: 'shadow', name: 'Shadowleather', tier: 4, statBase: 2.0, bonusPerTier: 1.05, dropWeight: 6, color: '#2F2F2F' },
        void: { id: 'void', name: 'Voidhide', tier: 5, statBase: 2.5, bonusPerTier: 1.20, dropWeight: 2, color: '#1a0033' }
    },
    
    // ===========================================
    // UPGRADE TIER CONFIG (EXPANDED v1.7.0)
    // ===========================================
    upgrades: {
        maxTier: 10,
        bonusPerTier: 1,        // DEFAULT fallback — overridden by material.bonusPerTier (v2.1.0)
        
        // Success rates by current tier (index = current tier)
        mergeSuccessRate: { 
            0: 1.00,   // t0 → t1: 100%
            1: 0.95,   // t1 → t2: 95%
            2: 0.90,   // t2 → t3: 90%
            3: 0.80,   // t3 → t4: 80%
            4: 0.70,   // t4 → t5: 70%
            5: 0.55,   // t5 → t6: 55%
            6: 0.45,   // t6 → t7: 45%
            7: 0.35,   // t7 → t8: 35%
            8: 0.30,   // t8 → t9: 30%
            9: 0.25    // t9 → t10: 25%
        },
        
        // Destroy chance on failure by current tier
        destroyOnFailRate: { 
            0: 0.00,   // t0 → t1: 0%
            1: 0.00,   // t1 → t2: 0%
            2: 0.00,   // t2 → t3: 0%
            3: 0.05,   // t3 → t4: 5%
            4: 0.10,   // t4 → t5: 10%
            5: 0.15,   // t5 → t6: 15%
            6: 0.20,   // t6 → t7: 20%
            7: 0.25,   // t7 → t8: 25%
            8: 0.30,   // t8 → t9: 30%
            9: 0.40    // t9 → t10: 40%
        },
        
        // Material tier penalty (subtracted from success rate)
        // Index = material tier (0=wood/cloth/leather, 6=ethereal)
        materialPenalty: [0.00, 0.02, 0.04, 0.06, 0.10, 0.15, 0.20],
        
        // Upgrade costs by current tier
        costs: [
            { gold: 50, aether: 0 },      // t0 → t1
            { gold: 100, aether: 0 },     // t1 → t2
            { gold: 200, aether: 5 },     // t2 → t3
            { gold: 400, aether: 10 },    // t3 → t4
            { gold: 800, aether: 20 },    // t4 → t5
            { gold: 1500, aether: 40 },   // t5 → t6
            { gold: 3000, aether: 80 },   // t6 → t7
            { gold: 6000, aether: 150 },  // t7 → t8
            { gold: 12000, aether: 300 }, // t8 → t9
            { gold: 25000, aether: 600 }  // t9 → t10
        ]
    },
    
    // ===========================================
    // TIER DROP CONFIG (for loot generation)
    // Higher tiers can drop as loot, weighted toward lower tiers
    // ===========================================
    tierDrops: {
        maxDropTier: 3,           // Max tier that can drop as loot (0-3)
        tierWeights: {
            0: 100,   // ~62.5% - Most common
            1: 40,    // ~25.0%
            2: 15,    // ~9.4%
            3: 5      // ~3.1% - Rarest drop tier
        }
    },
    
    // ===========================================
    // PROC ADJECTIVES (Special effects)
    // 
    // Enhanced v2.2.0: Each proc now includes:
    //   triggerType: combat event that can trigger this proc
    //   chance: top-level trigger probability (0.0-1.0)
    //   cooldown: minimum ms between triggers per slot
    //   description: tooltip text for UI
    //   color: UI display color
    //   slotRestriction: (optional) array of valid equipment slots
    //
    // effect.chance is preserved for backwards compatibility but
    // top-level chance is authoritative for the new proc system.
    // ===========================================
    procs: {
        none: { id: 'none', name: '', dropWeight: 70, effect: null },
        flaming: { 
            id: 'flaming', name: 'Flaming', dropWeight: 8, color: '#FF4500',
            triggerType: 'onHit',
            chance: 0.20,
            cooldown: 3000,
            effect: { type: 'burn', damage: 3, duration: 3, chance: 0.2, stacks: false },
            description: '20% chance to burn for 9 damage over 3 seconds',
            fxId: 'fire_1',
        },
        icy: { 
            id: 'icy', name: 'Icy', dropWeight: 8, color: '#00BFFF',
            triggerType: 'onHit',
            chance: 0.20,
            cooldown: 4000,
            effect: { type: 'slow', modifier: 0.7, duration: 2, chance: 0.2, damage: 2 },
            description: '20% chance to slow and deal 2 frost damage',
            fxId: 'icicle_pike',
        },
        crackling: { 
            id: 'crackling', name: 'Crackling', dropWeight: 6, color: '#FFD700',
            triggerType: 'onHit',
            chance: 0.15,
            cooldown: 5000,
            effect: { type: 'stun', duration: 1, chance: 0.15, damage: 5 },
            description: '15% chance to stun for 1 second and deal 5 damage',
            fxId: 'electric_a',
        },
        sickly: { 
            id: 'sickly', name: 'Sickly', dropWeight: 6, color: '#32CD32',
            triggerType: 'onHit',
            chance: 0.25,
            cooldown: 2000,
            effect: { type: 'poison', damage: 2, duration: 5, chance: 0.25 },
            description: '25% chance to poison for 10 damage over 5 seconds',
            fxId: 'poison_cloud',
        },
        vampiric: { 
            id: 'vampiric', name: 'Vampiric', dropWeight: 2, color: '#8B0000',
            triggerType: 'onHit',
            chance: 0.20,
            cooldown: 2000,
            effect: { type: 'lifesteal', percent: 0.1, chance: 0.2 },
            description: '20% chance to heal for 10% of attack power',
            fxId: 'blood_splat',
        },
        
        // --- New Procs (v2.3.0) ---
        
        executioner: {
            id: 'executioner', name: 'Executioner', dropWeight: 3, color: '#DC143C',
            triggerType: 'onCrit',
            chance: 0.50,
            cooldown: 5000,
            effect: { type: 'bonusDamage', percent: 0.50 },
            slotRestriction: ['mainHand', 'offHand'],
            description: '50% chance on crit to deal 50% bonus damage',
            fxId: 'dark_ritual',
        },
        soulreaper: {
            id: 'soulreaper', name: 'Soulreaper', dropWeight: 2, color: '#4B0082',
            triggerType: 'onKill',
            chance: 1.0,
            cooldown: 3000,
            effect: { type: 'heal', percent: 0.15, source: 'self' },
            slotRestriction: ['mainHand'],
            description: 'On kill, heal for 15% of your max HP',
            fxId: 'lifestream',
        },
        thorns: {
            id: 'thorns', name: 'Thorny', dropWeight: 4, color: '#228B22',
            triggerType: 'onHitReceived',
            chance: 0.30,
            cooldown: 3000,
            effect: { type: 'reflect', percent: 0.20 },
            slotRestriction: ['body', 'head', 'offHand'],
            description: '30% chance when hit to reflect 20% of damage taken',
            fxId: 'rock_break',
        },
        warding: {
            id: 'warding', name: 'Warding', dropWeight: 3, color: '#4169E1',
            triggerType: 'onHitReceived',
            chance: 0.15,
            cooldown: 8000,
            effect: { type: 'shield', amount: 25, duration: 5 },
            slotRestriction: ['body', 'head', 'offHand'],
            description: '15% chance when hit to gain a 25 HP shield for 5 seconds',
            fxId: 'rotating_shield',
        },
        evasive: {
            id: 'evasive', name: 'Evasive', dropWeight: 3, color: '#00CED1',
            triggerType: 'onDodge',
            chance: 0.40,
            cooldown: 6000,
            effect: { type: 'buff', stat: 'dodge', modifier: 0.15, duration: 3 },
            slotRestriction: ['boots', 'cape'],
            description: '40% chance on dodge to gain +15% dodge for 3 seconds',
            fxId: 'smoke_simple',
        },
        manaburn: {
            id: 'manaburn', name: 'Manaburning', dropWeight: 2, color: '#9400D3',
            triggerType: 'onHit',
            chance: 0.15,
            cooldown: 4000,
            effect: { type: 'manaDrain', amount: 10 },
            slotRestriction: ['ring', 'ring2', 'necklace'],
            description: '15% chance to drain 10 mana from target',
            fxId: 'dark_swirl',
        },
        laststand: {
            id: 'laststand', name: 'Resolute', dropWeight: 2, color: '#FFD700',
            triggerType: 'onLowHealth',
            chance: 1.0,
            cooldown: 60000,
            effect: { type: 'buff', stat: 'attackDefense', attackMod: 0.30, defenseMod: 0.30, duration: 10 },
            slotRestriction: ['ring', 'ring2', 'necklace', 'body'],
            description: 'Below 25% HP, gain +30% ATK and DEF for 10 seconds (60s cooldown)',
            fxId: 'holy_aura',
        }
    },
    
    // ===========================================
    // SLOT PROC RULES (v2.2.0)
    // Defines which trigger types are allowed per equipment slot,
    // max concurrent procs per slot, and cooldown multipliers.
    //
    // allowedTriggers: which proc triggerTypes can fire from this slot
    // maxProcs: max procs per item in this slot (future use)
    // cooldownMultiplier: multiplied against proc's base cooldown
    // ===========================================
    slotProcRules: {
        mainHand: {
            allowedTriggers: ['onHit', 'onCrit', 'onKill'],
            maxProcs: 1,
            cooldownMultiplier: 1.0
        },
        offHand: {
            allowedTriggers: ['onHit', 'onCrit', 'onHitReceived'],
            maxProcs: 1,
            cooldownMultiplier: 1.2
        },
        body: {
            allowedTriggers: ['onHitReceived', 'onLowHealth'],
            maxProcs: 1,
            cooldownMultiplier: 1.0
        },
        head: {
            allowedTriggers: ['onHitReceived', 'onLowHealth'],
            maxProcs: 1,
            cooldownMultiplier: 1.0
        },
        boots: {
            allowedTriggers: ['onDodge', 'onHitReceived'],
            maxProcs: 1,
            cooldownMultiplier: 1.0
        },
        ring: {
            allowedTriggers: ['onHit', 'onCrit', 'onLowHealth'],
            maxProcs: 1,
            cooldownMultiplier: 1.5
        },
        ring2: {
            allowedTriggers: ['onHit', 'onCrit', 'onLowHealth'],
            maxProcs: 1,
            cooldownMultiplier: 1.5
        },
        necklace: {
            allowedTriggers: ['onHit', 'onHitReceived', 'onLowHealth'],
            maxProcs: 1,
            cooldownMultiplier: 1.5
        },
        cape: {
            allowedTriggers: ['onDodge', 'onHitReceived'],
            maxProcs: 1,
            cooldownMultiplier: 1.0
        }
    },
    
    // ===========================================
    // BASE ITEM TEMPLATES
    // Subtype must be UNIQUE per item for Forge merge matching
    // (sword+sword OK, plate_helm+plate_helm OK, plate_helm+plate_boots NOT OK)
    // ===========================================
    items: {
        // WEAPONS - Strength
        sword: { id: 'sword', name: 'Sword', slot: 'mainHand', type: 'weapon', subtype: 'sword', twoHanded: false, baseStats: { attack: 8 }, scalingStat: 'strength', armorClass: 'heavy', materialType: 'metal' },
        greatsword: { id: 'greatsword', name: 'Greatsword', slot: 'mainHand', type: 'weapon', subtype: 'greatsword', twoHanded: true, baseStats: { attack: 15 }, scalingStat: 'strength', armorClass: 'heavy', materialType: 'metal' },
        axe: { id: 'axe', name: 'Axe', slot: 'mainHand', type: 'weapon', subtype: 'axe', twoHanded: false, baseStats: { attack: 10 }, scalingStat: 'strength', armorClass: 'heavy', materialType: 'metal' },
        shield: { id: 'shield', name: 'Shield', slot: 'offHand', type: 'shield', subtype: 'shield', twoHanded: false, baseStats: { defense: 10 }, scalingStat: 'strength', armorClass: 'heavy', materialType: 'metal' },
        // WEAPONS - Dexterity
        dagger: { id: 'dagger', name: 'Dagger', slot: 'mainHand', type: 'weapon', subtype: 'dagger', twoHanded: false, baseStats: { attack: 5, critChance: 0.05 }, scalingStat: 'dexterity', armorClass: 'medium', materialType: 'metal' },
        bow: { id: 'bow', name: 'Bow', slot: 'mainHand', type: 'weapon', subtype: 'bow', twoHanded: true, ranged: true, range: 3, baseStats: { attack: 9 }, scalingStat: 'dexterity', armorClass: 'medium', materialType: 'wood' },
        // WEAPONS - Intelligence
        staff: { id: 'staff', name: 'Staff', slot: 'mainHand', type: 'weapon', subtype: 'staff', twoHanded: true, baseStats: { attack: 6, mana: 20 }, scalingStat: 'intelligence', armorClass: 'light', materialType: 'wood' },
        wand: { id: 'wand', name: 'Wand', slot: 'mainHand', type: 'weapon', subtype: 'wand', twoHanded: false, ranged: true, range: 2, baseStats: { attack: 4, mana: 10 }, scalingStat: 'intelligence', armorClass: 'light', materialType: 'wood' },
        orb: { id: 'orb', name: 'Orb', slot: 'offHand', type: 'offhand', subtype: 'orb', baseStats: { mana: 25, magicDamage: 3 }, scalingStat: 'intelligence', armorClass: 'light', materialType: 'crystal' },
        
        // ARMOR - Heavy (Metal)
        // Each armor piece has UNIQUE subtype for Forge matching
        plate_helm: { id: 'plate_helm', name: 'Plate Helm', slot: 'head', type: 'armor', subtype: 'plate_helm', baseStats: { defense: 8, dodge: -0.02 }, armorClass: 'heavy', materialType: 'metal' },
        chainmail: { id: 'chainmail', name: 'Chainmail', slot: 'body', type: 'armor', subtype: 'chainmail', baseStats: { defense: 15, dodge: -0.03 }, armorClass: 'heavy', materialType: 'metal' },
        plate_armor: { id: 'plate_armor', name: 'Plate Armor', slot: 'body', type: 'armor', subtype: 'plate_armor', baseStats: { defense: 20, dodge: -0.05 }, armorClass: 'heavy', materialType: 'metal' },
        plate_boots: { id: 'plate_boots', name: 'Plate Boots', slot: 'boots', type: 'armor', subtype: 'plate_boots', baseStats: { defense: 6 }, armorClass: 'heavy', materialType: 'metal' },
        
        // ARMOR - Medium (Leather)
        // Each armor piece has UNIQUE subtype for Forge matching
        leather_cap: { id: 'leather_cap', name: 'Cap', slot: 'head', type: 'armor', subtype: 'leather_cap', baseStats: { defense: 4, dodge: 0.02 }, armorClass: 'medium', materialType: 'leather' },
        leather_vest: { id: 'leather_vest', name: 'Vest', slot: 'body', type: 'armor', subtype: 'leather_vest', baseStats: { defense: 8, dodge: 0.03 }, armorClass: 'medium', materialType: 'leather' },
        leather_boots: { id: 'leather_boots', name: 'Boots', slot: 'boots', type: 'armor', subtype: 'leather_boots', baseStats: { defense: 3, dodge: 0.02 }, armorClass: 'medium', materialType: 'leather' },
        
        // ARMOR - Light (Cloth)
        // Each armor piece has UNIQUE subtype for Forge matching
        cloth_hood: { id: 'cloth_hood', name: 'Hood', slot: 'head', type: 'armor', subtype: 'cloth_hood', baseStats: { defense: 5, mana: 15 }, armorClass: 'light', materialType: 'cloth' },
        cloth_robe: { id: 'cloth_robe', name: 'Robe', slot: 'body', type: 'armor', subtype: 'cloth_robe', baseStats: { defense: 8, mana: 30 }, armorClass: 'light', materialType: 'cloth' },
        cloth_slippers: { id: 'cloth_slippers', name: 'Slippers', slot: 'boots', type: 'armor', subtype: 'cloth_slippers', baseStats: { defense: 3, mana: 10 }, armorClass: 'light', materialType: 'cloth' },
        
        // ACCESSORIES
        necklace: { id: 'necklace', name: 'Necklace', slot: 'necklace', type: 'accessory', subtype: 'necklace', baseStats: { health: 10 }, materialType: 'jewelry' },
        ring: { id: 'ring', name: 'Ring', slot: 'ring', type: 'accessory', subtype: 'ring', baseStats: { attack: 2 }, materialType: 'jewelry' },
        cape: { id: 'cape', name: 'Cape', slot: 'cape', type: 'accessory', subtype: 'cape', baseStats: { defense: 3 }, materialType: 'cloth' }
    },
    
    // ===========================================
    // LOOT TABLES
    // Gold ALWAYS drops, Items/Aether/Materials have chance to drop
    // 
    // Each table properties:
    //   - goldMin, goldMax: Gold drop range
    //   - itemDropChance: Chance for equipment to drop (0.0-1.0)
    //   - itemPool: Array of base item IDs that can drop
    //   - materialBonus: Bonus to item material tier rolls
    //   - aetherDropChance: Chance for Aether currency (0.0-1.0)
    //   - aetherMin, aetherMax: Aether quantity range
    //   - materialDropChance: Chance for housing materials (0.0-1.0) [NEW v1.9.0]
    //   - materialMin, materialMax: Housing material quantity range [NEW v1.9.0]
    //
    // Note: Housing material TIER is gated by NPC level in LootGenerator,
    // not by loot table. Higher level enemies drop higher tier materials.
    // ===========================================
    lootTables: {
        // === GENERIC TABLES ===
        common: { 
            goldMin: 1, goldMax: 5, 
            itemDropChance: 0.15, 
            itemPool: ['sword', 'dagger', 'leather_vest', 'cloth_robe'], 
            materialBonus: 0,
            aetherDropChance: 0.10,
            aetherMin: 1,
            aetherMax: 2,
            // Housing materials (NEW v1.9.0)
            materialDropChance: 0.20,
            materialMin: 1,
            materialMax: 2
        },
        
        // === BEAST TABLES (rat, wolf, bat, boar, giant_scuttle, dire_wolf) ===
        common_beast: { 
            goldMin: 1, goldMax: 3, 
            itemDropChance: 0.075, 
            itemPool: ['leather_boots', 'leather_cap', 'cloth_slippers'], 
            materialBonus: 0,
            aetherDropChance: 0.08,
            aetherMin: 1,
            aetherMax: 1,
            // Housing materials - low chance, small amounts
            materialDropChance: 0.15,
            materialMin: 1,
            materialMax: 1
        },
        rat: { 
            goldMin: 1, goldMax: 3, 
            itemDropChance: 0.075, 
            itemPool: ['leather_boots', 'cloth_slippers'], 
            materialBonus: 0,
            aetherDropChance: 0.05,
            aetherMin: 1,
            aetherMax: 1,
            // Housing materials - very low for rats
            materialDropChance: 0.10,
            materialMin: 1,
            materialMax: 1
        },
        beast: { 
            goldMin: 3, goldMax: 10, 
            itemDropChance: 0.125, 
            itemPool: ['leather_cap', 'leather_vest', 'leather_boots', 'cape'], 
            materialBonus: 0,
            aetherDropChance: 0.10,
            aetherMin: 1,
            aetherMax: 2,
            // Housing materials - decent chance
            materialDropChance: 0.20,
            materialMin: 1,
            materialMax: 2
        },
        spider: { 
            goldMin: 4, goldMax: 15, 
            itemDropChance: 0.175, 
            itemPool: ['leather_vest', 'leather_boots', 'bow', 'dagger'], 
            materialBonus: 0,
            aetherDropChance: 0.15,
            aetherMin: 1,
            aetherMax: 2,
            // Housing materials
            materialDropChance: 0.25,
            materialMin: 1,
            materialMax: 2
        },
        
        // === HUMANOID TABLES (goblin, orc, bandit, lizardman, hobgoblin) ===
        goblin: { 
            goldMin: 3, goldMax: 12, 
            itemDropChance: 0.2, 
            itemPool: ['sword', 'dagger', 'axe', 'leather_cap', 'leather_vest', 'shield'], 
            materialBonus: 0,
            aetherDropChance: 0.20,
            aetherMin: 1,
            aetherMax: 3,
            // Housing materials - humanoids carry supplies
            materialDropChance: 0.30,
            materialMin: 1,
            materialMax: 2
        },
        orc: { 
            goldMin: 8, goldMax: 25, 
            itemDropChance: 0.25, 
            itemPool: ['sword', 'axe', 'greatsword', 'plate_helm', 'chainmail', 'shield'], 
            materialBonus: 1,
            aetherDropChance: 0.30,
            aetherMin: 2,
            aetherMax: 5,
            // Housing materials - orcs hoard supplies
            materialDropChance: 0.40,
            materialMin: 1,
            materialMax: 3
        },
        bandit: { 
            goldMin: 10, goldMax: 30, 
            itemDropChance: 0.225, 
            itemPool: ['sword', 'dagger', 'bow', 'leather_vest', 'leather_cap', 'cape', 'ring'], 
            materialBonus: 1,
            aetherDropChance: 0.25,
            aetherMin: 2,
            aetherMax: 4,
            // Housing materials - bandits steal supplies
            materialDropChance: 0.35,
            materialMin: 1,
            materialMax: 3
        },
        lizardman: { 
            goldMin: 15, goldMax: 45, 
            itemDropChance: 0.275, 
            itemPool: ['axe', 'sword', 'greatsword', 'shield', 'chainmail', 'plate_helm', 'leather_vest'], 
            materialBonus: 2,
            aetherDropChance: 0.35,
            aetherMin: 2,
            aetherMax: 6,
            // Housing materials
            materialDropChance: 0.40,
            materialMin: 2,
            materialMax: 3
        },
        
        // === CULTIST TABLE (Remnant Cultist - Overgrown Shrine) ===
        cultist: { 
            goldMin: 8, goldMax: 25, 
            itemDropChance: 0.225, 
            itemPool: ['staff', 'wand', 'orb', 'cloth_robe', 'cloth_hood', 'cloth_slippers', 'necklace', 'ring'], 
            materialBonus: 1,
            aetherDropChance: 0.30,
            aetherMin: 2,
            aetherMax: 5,
            // Housing materials - cultists gather rare materials
            materialDropChance: 0.35,
            materialMin: 1,
            materialMax: 3
        },
        
        // === UNDEAD TABLES (skeleton, zombie, ghost, ghoul, wight, barrow_guardian, wraith) ===
        undead: { 
            goldMin: 5, goldMax: 18, 
            itemDropChance: 0.175, 
            itemPool: ['sword', 'axe', 'shield', 'plate_helm', 'chainmail', 'plate_boots'], 
            materialBonus: 0,
            aetherDropChance: 0.20,
            aetherMin: 1,
            aetherMax: 3,
            // Housing materials - undead carry old supplies
            materialDropChance: 0.20,
            materialMin: 1,
            materialMax: 2
        },
        ghost: { 
            goldMin: 8, goldMax: 25, 
            itemDropChance: 0.2, 
            itemPool: ['cloth_robe', 'cloth_hood', 'wand', 'orb', 'staff', 'necklace', 'ring'], 
            materialBonus: 1,
            aetherDropChance: 0.35,
            aetherMin: 2,
            aetherMax: 5,
            // Housing materials - ethereal, drop magical materials
            materialDropChance: 0.30,
            materialMin: 1,
            materialMax: 2
        },
        
        // === GIANT TABLES (troll, cave_troll, forest_giant, ogre) ===
        troll: { 
            goldMin: 20, goldMax: 60, 
            itemDropChance: 0.3, 
            itemPool: ['greatsword', 'axe', 'plate_armor', 'plate_helm', 'plate_boots', 'chainmail'], 
            materialBonus: 2,
            aetherDropChance: 0.40,
            aetherMin: 3,
            aetherMax: 8,
            // Housing materials - trolls hoard lots
            materialDropChance: 0.50,
            materialMin: 2,
            materialMax: 4
        },
        giant: { 
            goldMin: 25, goldMax: 75, 
            itemDropChance: 0.325, 
            itemPool: ['greatsword', 'axe', 'plate_armor', 'plate_helm', 'plate_boots', 'chainmail', 'cape'], 
            materialBonus: 2,
            aetherDropChance: 0.45,
            aetherMin: 4,
            aetherMax: 10,
            // Housing materials - giants have big stashes
            materialDropChance: 0.55,
            materialMin: 2,
            materialMax: 5
        },
        
        // === ELEMENTAL TABLES (elemental, bog_beast, wisp, animated_plant) ===
        elemental: { 
            goldMin: 15, goldMax: 50, 
            itemDropChance: 0.25, 
            itemPool: ['staff', 'wand', 'orb', 'cloth_robe', 'cloth_hood', 'necklace', 'ring'], 
            materialBonus: 2,
            aetherDropChance: 0.50,
            aetherMin: 3,
            aetherMax: 8,
            // Housing materials - elementals drop crystalline/magical materials
            materialDropChance: 0.45,
            materialMin: 2,
            materialMax: 4
        },
        
        // === ABERRATION TABLE (ash_crawler - Ashen Barrens) ===
        aberration: { 
            goldMin: 20, goldMax: 60, 
            itemDropChance: 0.25, 
            itemPool: ['dagger', 'leather_vest', 'leather_cap', 'leather_boots', 'necklace', 'ring', 'cape'], 
            materialBonus: 2,
            aetherDropChance: 0.40,
            aetherMin: 3,
            aetherMax: 7,
            // Housing materials - aberrations have strange materials
            materialDropChance: 0.40,
            materialMin: 2,
            materialMax: 3
        },
        
        // === WYVERN TABLE (wyvern - Mountain Approach) ===
        wyvern: { 
            goldMin: 30, goldMax: 90, 
            itemDropChance: 0.35, 
            itemPool: ['bow', 'leather_vest', 'leather_cap', 'leather_boots', 'cape', 'necklace', 'ring'], 
            materialBonus: 3,
            aetherDropChance: 0.60,
            aetherMin: 5,
            aetherMax: 12,
            // Housing materials - wyverns nest with treasure
            materialDropChance: 0.60,
            materialMin: 2,
            materialMax: 5
        },
        
        // === CONSTRUCT TABLE (stone_golem - Mountain Approach, Hidden Caves) ===
        construct: { 
            goldMin: 35, goldMax: 100, 
            itemDropChance: 0.3, 
            itemPool: ['plate_armor', 'plate_helm', 'plate_boots', 'shield', 'greatsword', 'axe', 'necklace', 'ring'], 
            materialBonus: 3,
            aetherDropChance: 0.65,
            aetherMin: 6,
            aetherMax: 15,
            // Housing materials - constructs are made of materials!
            materialDropChance: 0.70,
            materialMin: 3,
            materialMax: 5
        },
        
        // === PALE UNDEAD TABLE (pale_knight, bone_colossus - Pale Court Outskirts) === (NEW v2.4.0)
        pale_undead: { 
            goldMin: 30, goldMax: 85, 
            itemDropChance: 0.3, 
            itemPool: ['greatsword', 'sword', 'axe', 'shield', 'plate_armor', 'plate_helm', 'plate_boots', 'cape', 'necklace'], 
            materialBonus: 3,
            aetherDropChance: 0.50,
            aetherMin: 4,
            aetherMax: 10,
            // Housing materials - Pale Court hoards supplies
            materialDropChance: 0.45,
            materialMin: 2,
            materialMax: 4
        },
        
        // === SERPENT TABLE (sea_serpent - Sunken Ruins) === (NEW v2.4.0)
        serpent: { 
            goldMin: 25, goldMax: 70, 
            itemDropChance: 0.275, 
            itemPool: ['leather_vest', 'leather_cap', 'leather_boots', 'bow', 'dagger', 'cape', 'necklace', 'ring'], 
            materialBonus: 3,
            aetherDropChance: 0.45,
            aetherMin: 3,
            aetherMax: 8,
            // Housing materials - serpents nest among ruins
            materialDropChance: 0.40,
            materialMin: 2,
            materialMax: 3
        },
        
        // === DRAKE TABLE (drake - Dragon's Approach) === (NEW v2.4.0)
        drake: { 
            goldMin: 50, goldMax: 150, 
            itemDropChance: 0.375, 
            itemPool: ['greatsword', 'sword', 'axe', 'bow', 'plate_armor', 'chainmail', 'leather_vest', 'cape', 'necklace', 'ring'], 
            materialBonus: 4,
            aetherDropChance: 0.70,
            aetherMin: 6,
            aetherMax: 15,
            // Housing materials - drakes hoard like their parent
            materialDropChance: 0.65,
            materialMin: 3,
            materialMax: 5
        },
        
        // === DEATH KNIGHT TABLE (death_knight - Dragon's Approach) === (NEW v2.4.0)
        death_knight: { 
            goldMin: 45, goldMax: 130, 
            itemDropChance: 0.35, 
            itemPool: ['greatsword', 'sword', 'axe', 'shield', 'plate_armor', 'plate_helm', 'plate_boots', 'cape', 'necklace', 'ring'], 
            materialBonus: 4,
            aetherDropChance: 0.65,
            aetherMin: 5,
            aetherMax: 12,
            // Housing materials - Death Knights carry ancient relics
            materialDropChance: 0.55,
            materialMin: 2,
            materialMax: 5
        },
        
        // === BOSS TABLE ===
        boss: { 
            goldMin: 50, goldMax: 150, 
            itemDropChance: 0.5, 
            itemPool: ['greatsword', 'plate_armor', 'staff', 'bow', 'necklace', 'ring', 'cape'], 
            materialBonus: 3,
            aetherDropChance: 1.00,
            aetherMin: 10,
            aetherMax: 25,
            // Housing materials - bosses always drop materials
            materialDropChance: 1.00,
            materialMin: 3,
            materialMax: 6
        },
        
        // === ENDGAME TABLES (Level 50-100 Maps) === (NEW v2.5.0)
        
        // Void aberrations (void_spawn, nightmare_stalker, void_horror, unbound, abyss_walker)
        aberration_void: { 
            goldMin: 40, goldMax: 120, 
            itemDropChance: 0.3, 
            itemPool: ['cloth_robe', 'cloth_hood', 'cloth_slippers', 'leather_vest', 'leather_cap', 'wand', 'orb', 'staff', 'necklace', 'ring', 'cape'], 
            materialBonus: 4,
            aetherDropChance: 0.55,
            aetherMin: 5,
            aetherMax: 12,
            materialDropChance: 0.45,
            materialMin: 2,
            materialMax: 4
        },
        
        // Lost civilization constructs (automaton, crystal_sentinel, reality_warden, memory_echo, abyss_sentinel)
        construct_ancient: { 
            goldMin: 50, goldMax: 150, 
            itemDropChance: 0.35, 
            itemPool: ['plate_armor', 'plate_helm', 'plate_boots', 'chainmail', 'shield', 'greatsword', 'axe', 'sword', 'necklace', 'ring'], 
            materialBonus: 5,
            aetherDropChance: 0.70,
            aetherMin: 8,
            aetherMax: 18,
            materialDropChance: 0.75,
            materialMin: 3,
            materialMax: 6
        },
        
        // Corrupted mages in Dreaming Spire
        cultist_elite: { 
            goldMin: 35, goldMax: 100, 
            itemDropChance: 0.3, 
            itemPool: ['staff', 'wand', 'orb', 'cloth_robe', 'cloth_hood', 'cloth_slippers', 'necklace', 'ring', 'cape'], 
            materialBonus: 4,
            aetherDropChance: 0.60,
            aetherMin: 6,
            aetherMax: 14,
            materialDropChance: 0.50,
            materialMin: 2,
            materialMax: 4
        },
        
        // Chaos elementals at The Convergence
        elemental_chaos: { 
            goldMin: 45, goldMax: 130, 
            itemDropChance: 0.3, 
            itemPool: ['staff', 'wand', 'orb', 'cloth_robe', 'cloth_hood', 'plate_armor', 'chainmail', 'necklace', 'ring', 'cape'], 
            materialBonus: 5,
            aetherDropChance: 0.65,
            aetherMin: 7,
            aetherMax: 16,
            materialDropChance: 0.55,
            materialMin: 3,
            materialMax: 5
        },
        
        // === BOSS LOOT TABLES (guaranteed drops, high value) === (NEW v2.5.0)
        
        // The Pale King — Pale Court Fortress
        boss_pale_king: { 
            goldMin: 100, goldMax: 300, 
            itemDropChance: 0.75, 
            itemPool: ['greatsword', 'sword', 'axe', 'shield', 'plate_armor', 'plate_helm', 'plate_boots', 'staff', 'cape', 'necklace', 'ring'], 
            materialBonus: 5,
            aetherDropChance: 1.00,
            aetherMin: 15,
            aetherMax: 35,
            materialDropChance: 1.00,
            materialMin: 4,
            materialMax: 8
        },
        
        // The Eternal Warden — Shattered Depths
        boss_warden: { 
            goldMin: 120, goldMax: 350, 
            itemDropChance: 0.75, 
            itemPool: ['plate_armor', 'plate_helm', 'plate_boots', 'chainmail', 'shield', 'greatsword', 'axe', 'sword', 'necklace', 'ring'], 
            materialBonus: 5,
            aetherDropChance: 1.00,
            aetherMin: 18,
            aetherMax: 40,
            materialDropChance: 1.00,
            materialMin: 4,
            materialMax: 8
        },
        
        // The Dreamer — Dreaming Spire
        boss_dreamer: { 
            goldMin: 150, goldMax: 400, 
            itemDropChance: 0.80, 
            itemPool: ['staff', 'wand', 'orb', 'cloth_robe', 'cloth_hood', 'greatsword', 'cape', 'necklace', 'ring'], 
            materialBonus: 5,
            aetherDropChance: 1.00,
            aetherMin: 20,
            aetherMax: 45,
            materialDropChance: 1.00,
            materialMin: 5,
            materialMax: 10
        },
        
        // Vyraxion the Ashborn — Vyraxion's Lair
        boss_dragon: { 
            goldMin: 200, goldMax: 500, 
            itemDropChance: 0.85, 
            itemPool: ['greatsword', 'sword', 'axe', 'bow', 'plate_armor', 'plate_helm', 'chainmail', 'leather_vest', 'staff', 'cape', 'necklace', 'ring'], 
            materialBonus: 6,
            aetherDropChance: 1.00,
            aetherMin: 25,
            aetherMax: 50,
            materialDropChance: 1.00,
            materialMin: 5,
            materialMax: 10
        },
        
        // Memory of the Architect — Sealed Vault
        boss_architect: { 
            goldMin: 250, goldMax: 600, 
            itemDropChance: 0.90, 
            itemPool: ['greatsword', 'plate_armor', 'staff', 'wand', 'orb', 'bow', 'dagger', 'shield', 'cape', 'necklace', 'ring'], 
            materialBonus: 6,
            aetherDropChance: 1.00,
            aetherMin: 30,
            aetherMax: 60,
            materialDropChance: 1.00,
            materialMin: 6,
            materialMax: 12
        }
    },
    
    // ===========================================
    // CONSUMABLES (including Aether currency)
    // ===========================================
    consumables: {
        health_potion: { id: 'health_potion', name: 'Health Potion', type: 'consumable', effect: { type: 'heal', amount: 50 }, stackMax: 99, cooldown: 5000 },
        mana_potion: { id: 'mana_potion', name: 'Mana Potion', type: 'consumable', effect: { type: 'mana', amount: 40 }, stackMax: 99, cooldown: 5000 },
        stardust: { id: 'stardust', name: 'Stardust', type: 'material', description: 'Used for upgrading equipment', stackMax: 999 },
        
        // NEW v1.7.0: Aether currency for forge upgrades
        aether: {
            id: 'aether',
            name: 'Aether Crystal',
            type: 'currency',
            subtype: 'currency',
            description: 'Crystallized magical essence. Required for forging upgrades at tier 3 and above.',
            stackable: true,
            stackMax: 999,
            baseValue: 1,
            icon: '✨',
            color: '#a855f7'
        }
    },
    
    // ===========================================
    // POTIONS (Tiered system for equipment slots)
    // ===========================================
    potions: {
        // Health Potions
        health_potion_minor: { 
            id: 'health_potion_minor', 
            name: 'Minor Health Potion', 
            type: 'potion',
            potionType: 'health',
            tier: 1,
            effect: { heal: 30 }, 
            cooldown: 12000,
            stackMax: 99,
            icon: null,
            fallbackIcon: '❤️',
            color: '#FF6B6B',
            dropWeight: 100
        },
        health_potion_standard: { 
            id: 'health_potion_standard', 
            name: 'Health Potion', 
            type: 'potion',
            potionType: 'health',
            tier: 2,
            effect: { heal: 60 }, 
            cooldown: 10000,
            stackMax: 99,
            icon: null,
            fallbackIcon: '❤️',
            color: '#FF4444',
            dropWeight: 50
        },
        health_potion_greater: { 
            id: 'health_potion_greater', 
            name: 'Greater Health Potion', 
            type: 'potion',
            potionType: 'health',
            tier: 3,
            effect: { heal: 120 }, 
            cooldown: 8000,
            stackMax: 99,
            icon: null,
            fallbackIcon: '❤️',
            color: '#FF0000',
            dropWeight: 20
        },
        health_potion_superior: { 
            id: 'health_potion_superior', 
            name: 'Superior Health Potion', 
            type: 'potion',
            potionType: 'health',
            tier: 4,
            effect: { heal: 200 }, 
            cooldown: 6000,
            stackMax: 99,
            icon: null,
            fallbackIcon: '❤️',
            color: '#CC0000',
            dropWeight: 5
        },
        // Mana Potions
        mana_potion_minor: { 
            id: 'mana_potion_minor', 
            name: 'Minor Mana Potion', 
            type: 'potion',
            potionType: 'mana',
            tier: 1,
            effect: { mana: 25 }, 
            cooldown: 12000,
            stackMax: 99,
            icon: null,
            fallbackIcon: '💧',
            color: '#6B8FFF',
            dropWeight: 100
        },
        mana_potion_standard: { 
            id: 'mana_potion_standard', 
            name: 'Mana Potion', 
            type: 'potion',
            potionType: 'mana',
            tier: 2,
            effect: { mana: 40 }, 
            cooldown: 10000,
            stackMax: 99,
            icon: null,
            fallbackIcon: '💧',
            color: '#4488FF',
            dropWeight: 50
        },
        mana_potion_greater: { 
            id: 'mana_potion_greater', 
            name: 'Greater Mana Potion', 
            type: 'potion',
            potionType: 'mana',
            tier: 3,
            effect: { mana: 80 }, 
            cooldown: 8000,
            stackMax: 99,
            icon: null,
            fallbackIcon: '💧',
            color: '#0066FF',
            dropWeight: 20
        },
        mana_potion_superior: { 
            id: 'mana_potion_superior', 
            name: 'Superior Mana Potion', 
            type: 'potion',
            potionType: 'mana',
            tier: 4,
            effect: { mana: 150 }, 
            cooldown: 6000,
            stackMax: 99,
            icon: null,
            fallbackIcon: '💧',
            color: '#0044CC',
            dropWeight: 5
        }
    }
};

// ===========================================
// HELPER FUNCTIONS
// ===========================================
export function getItem(itemId) {
    return ItemConfig.items[itemId] || ItemConfig.consumables[itemId] || ItemConfig.potions[itemId] || null;
}

/**
 * Get a potion configuration by ID
 * @param {string} potionId - Potion ID (e.g., 'health_potion_minor')
 * @returns {Object|null} Potion config or null if not found
 */
export function getPotion(potionId) {
    return ItemConfig.potions[potionId] || null;
}

/**
 * Get all potions of a specific type
 * @param {string} potionType - 'health' or 'mana'
 * @returns {Object[]} Array of potion configs
 */
export function getPotionsByType(potionType) {
    return Object.values(ItemConfig.potions).filter(p => p.potionType === potionType);
}

export function getMaterial(materialId, type = 'metal') {
    if (type === 'cloth') return ItemConfig.clothMaterials[materialId];
    if (type === 'leather') return ItemConfig.leatherMaterials[materialId];
    return ItemConfig.materials[materialId] || ItemConfig.clothMaterials[materialId] || ItemConfig.leatherMaterials[materialId];
}

export function getMaterialsForType(type = 'metal') {
    if (type === 'cloth') return ItemConfig.clothMaterials;
    if (type === 'leather') return ItemConfig.leatherMaterials;
    return ItemConfig.materials;
}

export function getProc(procId) {
    return ItemConfig.procs[procId] || ItemConfig.procs.none;
}

export function getSlot(slotId) {
    return ItemConfig.slots[slotId] || null;
}

export function getUpgradeConfig() {
    return ItemConfig.upgrades;
}

export function getLootTable(lootTableId) {
    return ItemConfig.lootTables[lootTableId] || ItemConfig.lootTables.common;
}

/**
 * Get the Aether currency configuration
 * @returns {Object} Aether item config
 */
export function getAetherConfig() {
    return ItemConfig.consumables.aether;
}

/**
 * Calculate total stat bonus from material + upgrade tier
 * Uses material-specific bonusPerTier (v2.1.0) with fallback to global default.
 * 
 * @param {Object|number} materialOrBase - Material object with statBase/bonusPerTier, or legacy statBonus number
 * @param {number} upgradeTier - Current upgrade tier (0-10)
 * @returns {number} Total stat bonus (not floored — caller should Math.floor if needed)
 */
export function calculateStatBonus(materialOrBase, upgradeTier) {
    // New-style: material object with statBase + bonusPerTier
    if (typeof materialOrBase === 'object' && materialOrBase !== null) {
        const statBase = materialOrBase.statBase || 0;
        const bpt = materialOrBase.bonusPerTier || ItemConfig.upgrades.bonusPerTier || 1;
        return statBase + (upgradeTier * bpt);
    }
    // Legacy fallback: plain number (old statBonus style)
    const statBonus = typeof materialOrBase === 'number' ? materialOrBase : 0;
    return statBonus + (upgradeTier * (ItemConfig.upgrades.bonusPerTier || 1));
}

export function generateItemName(baseItemId, materialId, procId = 'none', tier = 0) {
    const item = getItem(baseItemId);
    const material = getMaterial(materialId, item?.materialType);
    const proc = getProc(procId);
    if (!item) return 'Unknown Item';
    
    let name = '';
    if (proc?.name) name += proc.name + ' ';
    if (material?.name) name += material.name + ' ';
    name += item.name;
    name += ` (t${tier})`;
    return name;
}

export function getItemColor(materialId, materialType = 'metal') {
    const material = getMaterial(materialId, materialType);
    return material?.color || '#FFFFFF';
}

export default ItemConfig;
