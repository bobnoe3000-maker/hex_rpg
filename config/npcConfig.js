/**
 * @file npcConfig.js
 * @description NPC/creature definitions including base stats, behaviors, subtypes,
 *              and loot tables. All enemy types used in battle maps are defined here.
 *              Setting: The Shattered Coast (see WORLD_LORE.md)
 * 
 * @usage Imported by NPC.js model and MapInstance for spawning creatures.
 *        Helper functions calculate scaled stats based on level and subtype.
 * @dependencies None (pure data configuration)
 * 
 * @version 1.0.0
 * @changelog
 *   - v1.0.0 (2026-03-09): Added training_dummy creature for test_arena (Testing Ground).
 *                          50k HP, Lv100 base, DEX/STA 80 for Lv100 armor profile, STR 2
 *                          for near-zero damage, xpValue:0, lootTable:null. Pure sandbox target.
 *   - v0.9.0 (2026-02-10): Added 20 endgame creatures (base levels 48-90) for level 50-100
 *                          maps. Tier 5: soul_harvester (48), void_spawn (52), corrupted_golem (55),
 *                          automaton (55), crystal_sentinel (58). Tier 6: nightmare_stalker (60),
 *                          corrupted_mage (62), elder_drake (65), magma_elemental (65),
 *                          chaos_elemental (70), reality_warden (72). Tier 7: void_horror (78),
 *                          memory_echo (80), unbound (85), abyss_walker (88), abyss_sentinel (90).
 *                          Boss creatures: pale_king (55), eternal_warden (65), the_dreamer (70),
 *                          vyraxion (75), architect_memory (90). New 'boss' subtype (2x stats,
 *                          3x HP, 3x XP/loot). New loot tables: aberration_void, construct_ancient,
 *                          cultist_elite, elemental_chaos, boss_pale_king, boss_warden,
 *                          boss_dreamer, boss_dragon, boss_architect.
 *   - v0.8.0 (2026-02-10): Added 11 high-level creatures (base levels 22-45) for new maps:
 *                          mountain_orc (22), ice_wyvern (25), pale_knight (25), bone_colossus (28),
 *                          sea_serpent (30), drowned_dead (30), ancient_treant (35), shadow_wolf (32),
 *                          drake (38), fire_elemental (40), death_knight (42). New loot tables:
 *                          pale_undead, serpent, drake, death_knight. Supports Wraithspine Pass
 *                          through Dragon's Approach map progression (level 25-50).
 *   - v0.7.0 (2026-02-08): Reduced NPC stat scaling factor from 0.1 to 0.07 per level
 *                          (Option B from BALANCE_AND_PROGRESSION.md §6). Extracted hardcoded
 *                          value to configurable NPCConfig.statScalePerLevel. Chief Orc Lv17
 *                          ATK drops from 201 to ~170 (-15%). Addresses multi-NPC spike damage
 *                          on Deep Thornwood and improves high-level NPC viability.
 *   - v0.6.1 (2025-01-21): Increased NPC health by ~3x for levels 1-10 to extend
 *                          fight duration to 4-7 hits. Adjusted balance notes.
 *   - v0.6.0 (2025-01-21): COMBAT BALANCE REBALANCE - Increased all creature baseStats
 *                          (STR, DEX, INT, STA) by ~3-4x to produce meaningful damage
 *                          against player defense. Adjusted baseHealth to appropriate
 *                          values for combat pacing. This works with the new percentage-
 *                          based damage reduction formula in CombatEngine v1.1.0.
 *   - v0.5.0 (2025-01-20): Phase 4 - Added 15 new creatures for lore alignment:
 *                          giant_scuttle, boar, ghoul, hobgoblin, dire_wolf,
 *                          cultist, animated_plant, forest_giant, wight,
 *                          barrow_guardian, ash_crawler, wraith, ogre, wyvern, stone_golem
 *   - v0.4.2 (2025-01-01): Added zombie, bat, cave_troll, lizardman, bog_beast, wisp creatures
 *   - v0.4.1 (2025-01): Initial creatures - rat, goblin, skeleton, wolf, orc, spider, etc.
 */

export const NPCConfig = {
    // NPC stat scaling per level above baseLevel (v0.7.0)
    // Controls how quickly NPC stats grow with level difference
    // 0.07 = 7% per level (was 0.1). Lower value reduces multi-NPC spike damage.
    // At 0.07: Chief Orc Lv17 STR = 38 × 1.84 × 1.6 = ~112 (was 134 at 0.1)
    statScalePerLevel: 0.07,
    
    // Base creature definitions
    // BALANCE NOTE (v0.6.1): Stats are tuned so that:
    //   - Levels 1-4: Gentle introduction, ~10-18% HP per hit at same level
    //   - Levels 5+: Full difficulty, ~20-30% HP per hit at same level
    //   - NPCs 2-3 levels below deal ~5-12% per hit (safe auto-battle)
    //   - NPCs 2-3 levels above deal ~35-50% per hit (dangerous)
    //   - NPC health tuned for 4-7 hit fights at same level
    creatures: {
        // === LEVEL 1-4 CREATURES (Tutorial/Entry - Gentler Stats) ===
        
        rat: {
            id: 'rat',
            name: 'Rat',
            category: 'beast',
            baseLevel: 1,
            baseStats: { strength: 4, dexterity: 6, intelligence: 1, stamina: 6 },
            baseHealth: 80,
            baseMana: 0,
            attackType: 'melee',
            aggroRange: 2,
            xpValue: 25,
            alignment: 'neutral',
            lootTable: 'common_beast',
            sprite: 'assets/rat.png',
            description: 'A common pest, more annoying than dangerous.'
        },
        
        giant_scuttle: {
            id: 'giant_scuttle',
            name: 'Giant Scuttle',
            category: 'beast',
            baseLevel: 1,
            baseStats: { strength: 8, dexterity: 6, intelligence: 1, stamina: 8 },
            baseHealth: 150,
            baseMana: 0,
            attackType: 'melee',
            aggroRange: 3,
            xpValue: 30,
            alignment: 'neutral',
            lootTable: 'common_beast',
            sprite: '🦀',
            abilities: ['pincer_grip'],
            description: 'A massive crustacean with razor-sharp claws. Captain Eron lost his leg to one of these.'
        },
        
        goblin: {
            id: 'goblin',
            name: 'Goblin',
            category: 'humanoid',
            baseLevel: 2,
            baseStats: { strength: 12, dexterity: 10, intelligence: 5, stamina: 8 },
            baseHealth: 180,
            baseMana: 10,
            attackType: 'melee',
            aggroRange: 3,
            xpValue: 35,
            alignment: 'chaotic',
            lootTable: 'goblin',
            sprite: 'assets/goblin.png',
            description: 'Small but cunning, goblins attack in groups.'
        },
        
        boar: {
            id: 'boar',
            name: 'Wild Boar',
            category: 'beast',
            baseLevel: 3,
            baseStats: { strength: 16, dexterity: 8, intelligence: 2, stamina: 12 },
            baseHealth: 225,
            baseMana: 0,
            attackType: 'melee',
            aggroRange: 3,
            xpValue: 40,
            alignment: 'neutral',
            lootTable: 'beast',
            sprite: '🐗',
            abilities: ['charge'],
            description: 'A territorial beast with wicked tusks. Aggressive when threatened.'
        },
        
        skeleton: {
            id: 'skeleton',
            name: 'Skeleton',
            category: 'undead',
            baseLevel: 3,
            baseStats: { strength: 14, dexterity: 8, intelligence: 3, stamina: 10 },
            baseHealth: 210,
            baseMana: 0,
            attackType: 'melee',
            aggroRange: 4,
            xpValue: 38,
            alignment: 'chaotic',
            lootTable: 'undead',
            sprite: '💀',
            description: 'Animated bones of fallen warriors.'
        },
        
        wolf: {
            id: 'wolf',
            name: 'Wolf',
            category: 'beast',
            baseLevel: 3,
            baseStats: { strength: 15, dexterity: 14, intelligence: 3, stamina: 10 },
            baseHealth: 195,
            baseMana: 0,
            attackType: 'melee',
            aggroRange: 4,
            xpValue: 42,
            alignment: 'neutral',
            lootTable: 'beast',
            sprite: '🐺',
            description: 'A fierce predator that hunts in packs.'
        },
        
        spider: {
            id: 'spider',
            name: 'Giant Spider',
            category: 'beast',
            baseLevel: 4,
            baseStats: { strength: 18, dexterity: 16, intelligence: 2, stamina: 10 },
            baseHealth: 240,
            baseMana: 0,
            attackType: 'melee',
            aggroRange: 3,
            xpValue: 48,
            alignment: 'neutral',
            lootTable: 'spider',
            sprite: '🕷️',
            abilities: ['poison_bite'],
            description: 'Venomous arachnids lurking in dark places.'
        },
        
        zombie: {
            id: 'zombie',
            name: 'Zombie',
            category: 'undead',
            baseLevel: 4,
            baseStats: { strength: 20, dexterity: 5, intelligence: 1, stamina: 16 },
            baseHealth: 300,
            baseMana: 0,
            attackType: 'melee',
            aggroRange: 3,
            xpValue: 45,
            alignment: 'chaotic',
            lootTable: 'undead',
            sprite: '🧟',
            abilities: ['disease_touch'],
            description: 'Shambling corpses driven by an insatiable hunger for the living.'
        },
        
        bandit: {
            id: 'bandit',
            name: 'Bandit',
            category: 'humanoid',
            baseLevel: 4,
            baseStats: { strength: 19, dexterity: 12, intelligence: 7, stamina: 11 },
            baseHealth: 270,
            baseMana: 20,
            attackType: 'melee',
            aggroRange: 4,
            xpValue: 52,
            alignment: 'chaotic',
            lootTable: 'bandit',
            sprite: '🗡️',
            description: 'Outlaws who prey on travelers.'
        },
        
        // === LEVEL 5-10 CREATURES (Mid-Early Areas) ===
        
        ghoul: {
            id: 'ghoul',
            name: 'Ghoul',
            category: 'undead',
            baseLevel: 5,
            baseStats: { strength: 32, dexterity: 20, intelligence: 8, stamina: 16 },
            baseHealth: 375,
            baseMana: 15,
            attackType: 'melee',
            aggroRange: 4,
            xpValue: 58,
            alignment: 'chaotic',
            lootTable: 'undead',
            sprite: '🧟',
            abilities: ['paralyzing_touch', 'feast'],
            description: 'Flesh-eating undead that hunt in cunning packs. Their touch can freeze the unwary.'
        },
        
        orc: {
            id: 'orc',
            name: 'Orc',
            category: 'humanoid',
            baseLevel: 5,
            baseStats: { strength: 38, dexterity: 12, intelligence: 6, stamina: 24 },
            baseHealth: 450,
            baseMana: 20,
            attackType: 'melee',
            aggroRange: 4,
            xpValue: 65,
            alignment: 'chaotic',
            lootTable: 'orc',
            sprite: 'assets/orc.png',
            description: 'Brutal warriors with a thirst for battle.'
        },
        
        bat: {
            id: 'bat',
            name: 'Giant Bat',
            category: 'beast',
            baseLevel: 5,
            baseStats: { strength: 20, dexterity: 28, intelligence: 4, stamina: 10 },
            baseHealth: 225,
            baseMana: 0,
            attackType: 'melee',
            aggroRange: 5,
            xpValue: 45,
            alignment: 'neutral',
            lootTable: 'beast',
            sprite: '🦇',
            abilities: ['screech'],
            description: 'Massive bats with razor-sharp fangs that swarm in darkness.'
        },
        
        hobgoblin: {
            id: 'hobgoblin',
            name: 'Hobgoblin',
            category: 'humanoid',
            baseLevel: 6,
            baseStats: { strength: 36, dexterity: 14, intelligence: 12, stamina: 20 },
            baseHealth: 480,
            baseMana: 30,
            attackType: 'melee',
            aggroRange: 4,
            xpValue: 68,
            alignment: 'chaotic',
            lootTable: 'goblin',
            sprite: '👹',
            abilities: ['shield_bash', 'war_cry'],
            description: 'Larger, more disciplined cousins of goblins. They serve as officers in orc warbands.'
        },
        
        ghost: {
            id: 'ghost',
            name: 'Ghost',
            category: 'undead',
            baseLevel: 6,
            baseStats: { strength: 12, dexterity: 16, intelligence: 35, stamina: 10 },
            baseHealth: 330,
            baseMana: 80,
            attackType: 'magic',
            aggroRange: 5,
            xpValue: 72,
            alignment: 'chaotic',
            lootTable: 'ghost',
            sprite: '👻',
            abilities: ['life_drain', 'phase_shift'],
            description: 'Restless spirits bound to the mortal realm.'
        },
        
        dire_wolf: {
            id: 'dire_wolf',
            name: 'Dire Wolf',
            category: 'beast',
            baseLevel: 7,
            baseStats: { strength: 40, dexterity: 22, intelligence: 6, stamina: 22 },
            baseHealth: 525,
            baseMana: 0,
            attackType: 'melee',
            aggroRange: 5,
            xpValue: 78,
            alignment: 'neutral',
            lootTable: 'beast',
            sprite: '🐺',
            abilities: ['pack_tactics', 'savage_bite'],
            description: 'Massive wolves touched by dark magic. Smarter and far more dangerous than their lesser kin.'
        },
        
        // === LEVEL 8-12 CREATURES (Mid Areas) ===
        
        cultist: {
            id: 'cultist',
            name: 'Remnant Cultist',
            category: 'humanoid',
            baseLevel: 8,
            baseStats: { strength: 24, dexterity: 16, intelligence: 42, stamina: 14 },
            baseHealth: 420,
            baseMana: 120,
            attackType: 'magic',
            aggroRange: 5,
            xpValue: 85,
            alignment: 'chaotic',
            lootTable: 'cultist',
            sprite: '🧙',
            abilities: ['dark_bolt', 'shadow_step'],
            description: 'Followers of the Sleeping Darkness. They seek to awaken that which should remain dreaming.'
        },
        
        troll: {
            id: 'troll',
            name: 'Troll',
            category: 'giant',
            baseLevel: 8,
            baseStats: { strength: 55, dexterity: 8, intelligence: 4, stamina: 45 },
            baseHealth: 750,
            baseMana: 0,
            attackType: 'melee',
            aggroRange: 4,
            xpValue: 125,
            alignment: 'chaotic',
            lootTable: 'troll',
            sprite: '🧌',
            abilities: ['regeneration'],
            description: 'Massive brutes with incredible regeneration.'
        },
        
        animated_plant: {
            id: 'animated_plant',
            name: 'Thornlash Vine',
            category: 'elemental',
            baseLevel: 9,
            baseStats: { strength: 38, dexterity: 12, intelligence: 4, stamina: 35 },
            baseHealth: 540,
            baseMana: 40,
            attackType: 'melee',
            aggroRange: 3,
            xpValue: 90,
            alignment: 'neutral',
            lootTable: 'elemental',
            sprite: '🌿',
            abilities: ['entangle', 'thorn_whip'],
            description: 'Animated vegetation that guards ancient shrines. Nature itself turned hostile.'
        },
        
        elemental: {
            id: 'elemental',
            name: 'Fire Elemental',
            category: 'elemental',
            baseLevel: 10,
            baseStats: { strength: 35, dexterity: 18, intelligence: 45, stamina: 25 },
            baseHealth: 600,
            baseMana: 120,
            attackType: 'magic',
            aggroRange: 5,
            xpValue: 155,
            alignment: 'neutral',
            lootTable: 'elemental',
            sprite: '🔥',
            abilities: ['burn_aura'],
            description: 'A manifestation of pure elemental fury.'
        },
        
        ogre: {
            id: 'ogre',
            name: 'Ogre',
            category: 'giant',
            baseLevel: 10,
            baseStats: { strength: 58, dexterity: 10, intelligence: 5, stamina: 42 },
            baseHealth: 825,
            baseMana: 0,
            attackType: 'melee',
            aggroRange: 4,
            xpValue: 115,
            alignment: 'chaotic',
            lootTable: 'giant',
            sprite: '👹',
            abilities: ['crushing_blow'],
            description: 'Dim-witted but immensely strong. Often enslaved by smarter races as shock troops.'
        },
        
        // === LEVEL 12-16 CREATURES (Mid-Late Areas) ===
        
        cave_troll: {
            id: 'cave_troll',
            name: 'Cave Troll',
            category: 'giant',
            baseLevel: 12,
            baseStats: { strength: 70, dexterity: 8, intelligence: 3, stamina: 55 },
            baseHealth: 480,
            baseMana: 0,
            attackType: 'melee',
            aggroRange: 4,
            xpValue: 185,
            alignment: 'chaotic',
            lootTable: 'troll',
            sprite: '🧌',
            abilities: ['regeneration', 'ground_slam'],
            description: 'Hulking brutes that dwell in the deepest caves. Their thick hide turns most blades.'
        },
        
        wight: {
            id: 'wight',
            name: 'Wight',
            category: 'undead',
            baseLevel: 12,
            baseStats: { strength: 45, dexterity: 18, intelligence: 28, stamina: 30 },
            baseHealth: 350,
            baseMana: 60,
            attackType: 'melee',
            aggroRange: 5,
            xpValue: 135,
            alignment: 'chaotic',
            lootTable: 'undead',
            sprite: '👤',
            abilities: ['life_drain', 'command_undead'],
            description: 'Intelligent undead filled with hatred for the living. Their touch drains life itself.'
        },
        
        wisp: {
            id: 'wisp',
            name: 'Will-o-Wisp',
            category: 'elemental',
            baseLevel: 14,
            baseStats: { strength: 10, dexterity: 35, intelligence: 50, stamina: 8 },
            baseHealth: 100,
            baseMana: 150,
            attackType: 'magic',
            aggroRange: 6,
            xpValue: 135,
            alignment: 'chaotic',
            lootTable: 'elemental',
            sprite: '✨',
            abilities: ['life_drain', 'confusion', 'phase_shift'],
            description: 'Malevolent spirits that lure travelers to their doom with ghostly lights.'
        },
        
        barrow_guardian: {
            id: 'barrow_guardian',
            name: 'Barrow Guardian',
            category: 'undead',
            baseLevel: 14,
            baseStats: { strength: 55, dexterity: 12, intelligence: 12, stamina: 50 },
            baseHealth: 450,
            baseMana: 30,
            attackType: 'melee',
            aggroRange: 4,
            xpValue: 165,
            alignment: 'chaotic',
            lootTable: 'undead',
            sprite: '⚔️',
            abilities: ['ancient_strike', 'undying_vigor'],
            description: 'Ancient warriors who guard the barrows eternally. They predate the Shattering—and remember their duty.'
        },
        
        // === LEVEL 15-20 CREATURES (Late Areas) ===
        
        lizardman: {
            id: 'lizardman',
            name: 'Lizardman',
            category: 'humanoid',
            baseLevel: 15,
            baseStats: { strength: 52, dexterity: 24, intelligence: 16, stamina: 40 },
            baseHealth: 420,
            baseMana: 45,
            attackType: 'melee',
            aggroRange: 4,
            xpValue: 155,
            alignment: 'chaotic',
            lootTable: 'lizardman',
            sprite: '🦎',
            abilities: ['tail_sweep', 'water_breathing'],
            description: 'Cunning reptilian warriors who rule the swamps. They are fiercely territorial.'
        },
        
        forest_giant: {
            id: 'forest_giant',
            name: 'Forest Giant',
            category: 'giant',
            baseLevel: 15,
            baseStats: { strength: 72, dexterity: 12, intelligence: 10, stamina: 55 },
            baseHealth: 650,
            baseMana: 0,
            attackType: 'melee',
            aggroRange: 4,
            xpValue: 205,
            alignment: 'neutral',
            lootTable: 'giant',
            sprite: '🌲',
            abilities: ['tree_club', 'ground_stomp'],
            description: 'Massive humanoids who have lived in the Thornwood since before the Shattering. They do not welcome intruders.'
        },
        
        ash_crawler: {
            id: 'ash_crawler',
            name: 'Ash Crawler',
            category: 'aberration',
            baseLevel: 16,
            baseStats: { strength: 35, dexterity: 30, intelligence: 6, stamina: 30 },
            baseHealth: 320,
            baseMana: 0,
            attackType: 'melee',
            aggroRange: 5,
            xpValue: 175,
            alignment: 'chaotic',
            lootTable: 'aberration',
            sprite: '🕷️',
            abilities: ['ash_cloud', 'burrow'],
            description: 'Twisted creatures born of the Ashen Barrens. They emerge from the dead earth to drag victims below.'
        },
        
        wyvern: {
            id: 'wyvern',
            name: 'Wyvern',
            category: 'beast',
            baseLevel: 16,
            baseStats: { strength: 58, dexterity: 35, intelligence: 8, stamina: 38 },
            baseHealth: 520,
            baseMana: 0,
            attackType: 'melee',
            aggroRange: 6,
            xpValue: 205,
            alignment: 'neutral',
            lootTable: 'wyvern',
            sprite: '🐉',
            abilities: ['venomous_sting', 'dive_attack', 'wing_buffet'],
            description: 'Lesser dragon-kin with venomous tail stingers. They nest in the Wraithspine peaks.'
        },
        
        // === LEVEL 18-25 CREATURES (End-Game Areas) ===
        
        bog_beast: {
            id: 'bog_beast',
            name: 'Bog Beast',
            category: 'elemental',
            baseLevel: 18,
            baseStats: { strength: 65, dexterity: 12, intelligence: 8, stamina: 70 },
            baseHealth: 580,
            baseMana: 30,
            attackType: 'melee',
            aggroRange: 3,
            xpValue: 225,
            alignment: 'neutral',
            lootTable: 'elemental',
            sprite: '🌿',
            abilities: ['poison_aura', 'root_grasp', 'regeneration'],
            description: 'A shambling mass of rotting vegetation animated by dark swamp magic.'
        },
        
        wraith: {
            id: 'wraith',
            name: 'Wraith',
            category: 'undead',
            baseLevel: 18,
            baseStats: { strength: 20, dexterity: 30, intelligence: 55, stamina: 22 },
            baseHealth: 380,
            baseMana: 150,
            attackType: 'magic',
            aggroRange: 6,
            xpValue: 195,
            alignment: 'chaotic',
            lootTable: 'ghost',
            sprite: '👻',
            abilities: ['life_drain', 'create_spawn', 'incorporeal'],
            description: 'Powerful incorporeal undead bound by unfinished business. More dangerous than spectres—they can create more of their kind.'
        },
        
        stone_golem: {
            id: 'stone_golem',
            name: 'Stone Golem',
            category: 'construct',
            baseLevel: 18,
            baseStats: { strength: 75, dexterity: 6, intelligence: 4, stamina: 80 },
            baseHealth: 750,
            baseMana: 0,
            attackType: 'melee',
            aggroRange: 4,
            xpValue: 225,
            alignment: 'neutral',
            lootTable: 'construct',
            sprite: '🗿',
            abilities: ['stone_fist', 'immovable'],
            description: 'Ancient guardians of the lost civilization. Tireless, fearless, and still following orders given a thousand years ago.'
        },
        
        // === LEVEL 22-50 CREATURES (High-Level Maps - v0.8.0) ===
        
        mountain_orc: {
            id: 'mountain_orc',
            name: 'Mountain Orc',
            category: 'humanoid',
            baseLevel: 22,
            baseStats: { strength: 68, dexterity: 28, intelligence: 12, stamina: 55 },
            baseHealth: 620,
            baseMana: 0,
            attackType: 'melee',
            aggroRange: 5,
            xpValue: 260,
            alignment: 'hostile',
            lootTable: 'orc',
            sprite: '⚔️',
            abilities: ['war_cry', 'shield_bash'],
            description: 'Hardened orc warriors adapted to the thin mountain air. Stronger and more disciplined than their lowland kin.'
        },
        
        ice_wyvern: {
            id: 'ice_wyvern',
            name: 'Ice Wyvern',
            category: 'beast',
            baseLevel: 25,
            baseStats: { strength: 72, dexterity: 40, intelligence: 12, stamina: 48 },
            baseHealth: 680,
            baseMana: 30,
            attackType: 'melee',
            aggroRange: 6,
            xpValue: 300,
            alignment: 'neutral',
            lootTable: 'wyvern',
            sprite: '🐲',
            abilities: ['frost_breath', 'dive_attack', 'wing_buffet'],
            description: 'Frost-breathing dragon-kin that nest in the highest Wraithspine peaks. Their breath freezes flesh on contact.'
        },
        
        pale_knight: {
            id: 'pale_knight',
            name: 'Pale Knight',
            category: 'undead',
            baseLevel: 25,
            baseStats: { strength: 65, dexterity: 30, intelligence: 22, stamina: 58 },
            baseHealth: 640,
            baseMana: 60,
            attackType: 'melee',
            aggroRange: 5,
            xpValue: 290,
            alignment: 'chaotic',
            lootTable: 'pale_undead',
            sprite: '⚰️',
            abilities: ['soul_strike', 'unholy_aura', 'raise_dead'],
            description: 'Armored undead officers of the Pale Court. They retain the martial skill they possessed in life—and something darker besides.'
        },
        
        bone_colossus: {
            id: 'bone_colossus',
            name: 'Bone Colossus',
            category: 'undead',
            baseLevel: 28,
            baseStats: { strength: 90, dexterity: 8, intelligence: 6, stamina: 95 },
            baseHealth: 950,
            baseMana: 0,
            attackType: 'melee',
            aggroRange: 4,
            xpValue: 340,
            alignment: 'chaotic',
            lootTable: 'pale_undead',
            sprite: '💀',
            abilities: ['bone_crush', 'reassemble', 'immovable'],
            description: 'Massive constructs assembled from hundreds of skeletons, animated by the Pale Court\'s darkest necromancy. They shatter and reform.'
        },
        
        sea_serpent: {
            id: 'sea_serpent',
            name: 'Sea Serpent',
            category: 'beast',
            baseLevel: 30,
            baseStats: { strength: 80, dexterity: 45, intelligence: 8, stamina: 60 },
            baseHealth: 780,
            baseMana: 0,
            attackType: 'melee',
            aggroRange: 5,
            xpValue: 360,
            alignment: 'neutral',
            lootTable: 'serpent',
            sprite: '🐍',
            abilities: ['constrict', 'venomous_bite', 'aquatic_surge'],
            description: 'Massive aquatic predators that haunt the flooded ruins. They coil around victims and drag them beneath the waves.'
        },
        
        drowned_dead: {
            id: 'drowned_dead',
            name: 'Drowned Dead',
            category: 'undead',
            baseLevel: 30,
            baseStats: { strength: 55, dexterity: 20, intelligence: 35, stamina: 50 },
            baseHealth: 600,
            baseMana: 100,
            attackType: 'magic',
            aggroRange: 5,
            xpValue: 320,
            alignment: 'chaotic',
            lootTable: 'ghost',
            sprite: '🌊',
            abilities: ['drowning_grasp', 'water_bolt', 'incorporeal'],
            description: 'The restless dead of the sunken civilization. They remember drowning—and want company in the deep.'
        },
        
        ancient_treant: {
            id: 'ancient_treant',
            name: 'Ancient Treant',
            category: 'elemental',
            baseLevel: 35,
            baseStats: { strength: 95, dexterity: 8, intelligence: 30, stamina: 100 },
            baseHealth: 1100,
            baseMana: 80,
            attackType: 'melee',
            aggroRange: 4,
            xpValue: 420,
            alignment: 'neutral',
            lootTable: 'elemental',
            sprite: '🌳',
            abilities: ['root_grasp', 'bark_armor', 'regeneration', 'nature_wrath'],
            description: 'Trees older than the Shattering itself, corrupted by whatever festers in the heart of the Thornwood. They move with terrible purpose.'
        },
        
        shadow_wolf: {
            id: 'shadow_wolf',
            name: 'Shadow Wolf',
            category: 'beast',
            baseLevel: 32,
            baseStats: { strength: 60, dexterity: 70, intelligence: 15, stamina: 45 },
            baseHealth: 550,
            baseMana: 40,
            attackType: 'melee',
            aggroRange: 6,
            xpValue: 340,
            alignment: 'chaotic',
            lootTable: 'aberration',
            sprite: '🐺',
            abilities: ['shadow_step', 'pack_howl', 'venomous_bite'],
            description: 'Wolves twisted by dark magic into something that moves between shadows. Their bite drains warmth and hope.'
        },
        
        drake: {
            id: 'drake',
            name: 'Drake',
            category: 'beast',
            baseLevel: 38,
            baseStats: { strength: 100, dexterity: 35, intelligence: 18, stamina: 75 },
            baseHealth: 1000,
            baseMana: 50,
            attackType: 'melee',
            aggroRange: 6,
            xpValue: 480,
            alignment: 'neutral',
            lootTable: 'drake',
            sprite: '🔥',
            abilities: ['fire_breath', 'dive_attack', 'wing_buffet', 'tail_sweep'],
            description: 'Young drakes from Vyraxion\'s brood. Not yet mature enough to speak, but plenty mature enough to kill. Their fire melts steel.'
        },
        
        fire_elemental: {
            id: 'fire_elemental',
            name: 'Fire Elemental',
            category: 'elemental',
            baseLevel: 40,
            baseStats: { strength: 70, dexterity: 50, intelligence: 45, stamina: 55 },
            baseHealth: 750,
            baseMana: 200,
            attackType: 'magic',
            aggroRange: 5,
            xpValue: 440,
            alignment: 'neutral',
            lootTable: 'elemental',
            sprite: '🔥',
            abilities: ['flame_wave', 'burn_aura', 'eruption', 'magma_shield'],
            description: 'Pure elemental fire given form by the volcanic vents of the Wraithspine. They ignite everything they touch.'
        },
        
        death_knight: {
            id: 'death_knight',
            name: 'Death Knight',
            category: 'undead',
            baseLevel: 42,
            baseStats: { strength: 85, dexterity: 35, intelligence: 40, stamina: 75 },
            baseHealth: 1050,
            baseMana: 120,
            attackType: 'melee',
            aggroRange: 5,
            xpValue: 520,
            alignment: 'chaotic',
            lootTable: 'death_knight',
            sprite: '⚔️',
            abilities: ['soul_strike', 'unholy_aura', 'death_coil', 'summon_undead'],
            description: 'The Pale Court\'s generals—fallen champions raised with their martial prowess intact and enhanced by necromantic power. They command legions.'
        },
        
        // === LEVEL 48-90 CREATURES (Endgame Maps - v0.9.0) ===
        
        // --- Tier 5: Level 48-60 (Pale Fortress, Abyssal Rift, Shattered Depths) ---
        
        soul_harvester: {
            id: 'soul_harvester',
            name: 'Soul Harvester',
            category: 'undead',
            baseLevel: 48,
            baseStats: { strength: 55, dexterity: 40, intelligence: 70, stamina: 60 },
            baseHealth: 900,
            baseMana: 200,
            attackType: 'magic',
            aggroRange: 5,
            xpValue: 580,
            alignment: 'chaotic',
            lootTable: 'pale_undead',
            sprite: '👁️',
            abilities: ['soul_drain', 'death_coil', 'fear_aura', 'life_tap'],
            description: 'Pale Court specialists that extract the life force from living creatures. Their touch drains warmth, hope, and eventually the soul itself.'
        },
        
        void_spawn: {
            id: 'void_spawn',
            name: 'Void Spawn',
            category: 'aberration',
            baseLevel: 52,
            baseStats: { strength: 70, dexterity: 55, intelligence: 45, stamina: 65 },
            baseHealth: 950,
            baseMana: 100,
            attackType: 'melee',
            aggroRange: 5,
            xpValue: 620,
            alignment: 'chaotic',
            lootTable: 'aberration_void',
            sprite: '🕳️',
            abilities: ['tentacle_lash', 'void_pulse', 'phase_shift', 'madness_aura'],
            description: 'Tentacled horrors from beneath reality. They exist partially in another dimension, phasing through solid matter to strike.'
        },
        
        corrupted_golem: {
            id: 'corrupted_golem',
            name: 'Corrupted Golem',
            category: 'construct',
            baseLevel: 55,
            baseStats: { strength: 100, dexterity: 8, intelligence: 15, stamina: 110 },
            baseHealth: 1400,
            baseMana: 50,
            attackType: 'melee',
            aggroRange: 4,
            xpValue: 650,
            alignment: 'chaotic',
            lootTable: 'construct',
            sprite: '🗿',
            abilities: ['stone_fist', 'immovable', 'corruption_burst', 'regeneration'],
            description: 'Lost civilization constructs infected by the Sleeping Darkness. Their crystal cores pulse with wrong-colored light.'
        },
        
        automaton: {
            id: 'automaton',
            name: 'Automaton',
            category: 'construct',
            baseLevel: 55,
            baseStats: { strength: 85, dexterity: 30, intelligence: 50, stamina: 90 },
            baseHealth: 1200,
            baseMana: 100,
            attackType: 'melee',
            aggroRange: 5,
            xpValue: 660,
            alignment: 'neutral',
            lootTable: 'construct_ancient',
            sprite: '🤖',
            abilities: ['precision_strike', 'energy_shield', 'overcharge', 'repair_protocol'],
            description: 'Functional machines of the lost civilization. Still following their ancient directives with mechanical precision after millennia.'
        },
        
        crystal_sentinel: {
            id: 'crystal_sentinel',
            name: 'Crystal Sentinel',
            category: 'construct',
            baseLevel: 58,
            baseStats: { strength: 75, dexterity: 25, intelligence: 65, stamina: 95 },
            baseHealth: 1300,
            baseMana: 180,
            attackType: 'magic',
            aggroRange: 5,
            xpValue: 700,
            alignment: 'neutral',
            lootTable: 'construct_ancient',
            sprite: '💎',
            abilities: ['crystal_beam', 'prismatic_shield', 'shatter', 'resonance'],
            description: 'Guardian crystalline constructs that channel magical energy through their gemstone bodies. The lost civilization\'s finest defenders.'
        },
        
        // --- Tier 6: Level 60-75 (Dreaming Spire, Vyraxion's Lair, Convergence) ---
        
        nightmare_stalker: {
            id: 'nightmare_stalker',
            name: 'Nightmare Stalker',
            category: 'aberration',
            baseLevel: 60,
            baseStats: { strength: 65, dexterity: 80, intelligence: 50, stamina: 55 },
            baseHealth: 900,
            baseMana: 120,
            attackType: 'melee',
            aggroRange: 6,
            xpValue: 740,
            alignment: 'chaotic',
            lootTable: 'aberration_void',
            sprite: '😱',
            abilities: ['shadow_step', 'nightmare_touch', 'fear_aura', 'phase_shift'],
            description: 'Creatures born from the nightmare realm that bleeds through the Dreaming Spire. They feed on terror and manifest as your worst fears.'
        },
        
        corrupted_mage: {
            id: 'corrupted_mage',
            name: 'Corrupted Mage',
            category: 'humanoid',
            baseLevel: 62,
            baseStats: { strength: 25, dexterity: 35, intelligence: 95, stamina: 50 },
            baseHealth: 800,
            baseMana: 350,
            attackType: 'magic',
            aggroRange: 6,
            xpValue: 760,
            alignment: 'chaotic',
            lootTable: 'cultist_elite',
            sprite: '🧙',
            abilities: ['void_bolt', 'nightmare_wave', 'mana_drain', 'summon_horror'],
            description: 'Mages who sought to contact the Sleeping Darkness and were warped by what answered. They cast spells that shouldn\'t exist.'
        },
        
        elder_drake: {
            id: 'elder_drake',
            name: 'Elder Drake',
            category: 'beast',
            baseLevel: 65,
            baseStats: { strength: 120, dexterity: 40, intelligence: 30, stamina: 95 },
            baseHealth: 1500,
            baseMana: 100,
            attackType: 'melee',
            aggroRange: 6,
            xpValue: 800,
            alignment: 'neutral',
            lootTable: 'drake',
            sprite: '🐉',
            abilities: ['fire_breath', 'dive_attack', 'wing_buffet', 'tail_sweep', 'inferno'],
            description: 'Mature drakes approaching true dragonhood. Their fire is hotter, their scales harder, and they\'re starting to show intelligence.'
        },
        
        magma_elemental: {
            id: 'magma_elemental',
            name: 'Magma Elemental',
            category: 'elemental',
            baseLevel: 65,
            baseStats: { strength: 90, dexterity: 20, intelligence: 60, stamina: 85 },
            baseHealth: 1200,
            baseMana: 200,
            attackType: 'magic',
            aggroRange: 5,
            xpValue: 780,
            alignment: 'neutral',
            lootTable: 'elemental',
            sprite: '🌋',
            abilities: ['magma_wave', 'burn_aura', 'eruption', 'magma_shield', 'melt_armor'],
            description: 'Born from the volcanic core of the Wraithspine. Living magma that flows with terrible purpose, melting everything it touches.'
        },
        
        chaos_elemental: {
            id: 'chaos_elemental',
            name: 'Chaos Elemental',
            category: 'elemental',
            baseLevel: 70,
            baseStats: { strength: 80, dexterity: 70, intelligence: 80, stamina: 70 },
            baseHealth: 1100,
            baseMana: 250,
            attackType: 'magic',
            aggroRange: 6,
            xpValue: 850,
            alignment: 'chaotic',
            lootTable: 'elemental_chaos',
            sprite: '🌀',
            abilities: ['reality_warp', 'chaos_bolt', 'dimension_shift', 'entropy_aura'],
            description: 'Where reality tears, chaos elementals form—beings of pure disorder that warp space around them. Fighting them is fighting physics itself.'
        },
        
        reality_warden: {
            id: 'reality_warden',
            name: 'Reality Warden',
            category: 'construct',
            baseLevel: 72,
            baseStats: { strength: 95, dexterity: 40, intelligence: 80, stamina: 100 },
            baseHealth: 1600,
            baseMana: 200,
            attackType: 'melee',
            aggroRange: 5,
            xpValue: 880,
            alignment: 'neutral',
            lootTable: 'construct_ancient',
            sprite: '⚙️',
            abilities: ['reality_anchor', 'temporal_strike', 'energy_shield', 'overcharge', 'stasis_field'],
            description: 'The lost civilization\'s ultimate guardians, designed to maintain reality itself. They attack anything that threatens the fabric of existence.'
        },
        
        // --- Tier 7: Level 78-90 (Sealed Vault, Infinite Abyss) ---
        
        void_horror: {
            id: 'void_horror',
            name: 'Void Horror',
            category: 'aberration',
            baseLevel: 78,
            baseStats: { strength: 100, dexterity: 60, intelligence: 70, stamina: 90 },
            baseHealth: 1400,
            baseMana: 200,
            attackType: 'melee',
            aggroRange: 6,
            xpValue: 950,
            alignment: 'chaotic',
            lootTable: 'aberration_void',
            sprite: '👾',
            abilities: ['void_pulse', 'tentacle_storm', 'madness_aura', 'dimension_rend', 'consume'],
            description: 'Full manifestations of the Sleeping Darkness. They exist simultaneously in multiple realities, striking from angles that shouldn\'t exist.'
        },
        
        memory_echo: {
            id: 'memory_echo',
            name: 'Memory Echo',
            category: 'construct',
            baseLevel: 80,
            baseStats: { strength: 60, dexterity: 50, intelligence: 110, stamina: 75 },
            baseHealth: 1100,
            baseMana: 400,
            attackType: 'magic',
            aggroRange: 6,
            xpValue: 980,
            alignment: 'neutral',
            lootTable: 'construct_ancient',
            sprite: '💭',
            abilities: ['psychic_blast', 'memory_flood', 'temporal_echo', 'mind_shatter'],
            description: 'Psychic projections of the lost civilization\'s greatest minds, preserved in crystal matrices. They think, therefore they fight.'
        },
        
        unbound: {
            id: 'unbound',
            name: 'The Unbound',
            category: 'aberration',
            baseLevel: 85,
            baseStats: { strength: 90, dexterity: 90, intelligence: 90, stamina: 90 },
            baseHealth: 1500,
            baseMana: 300,
            attackType: 'magic',
            aggroRange: 7,
            xpValue: 1050,
            alignment: 'chaotic',
            lootTable: 'aberration_void',
            sprite: '✨',
            abilities: ['reality_warp', 'chaos_bolt', 'dimension_rend', 'unbind', 'entropy_storm'],
            description: 'Entities unmoored from reality entirely. They exist between dimensions, slipping through the cracks in existence.'
        },
        
        abyss_walker: {
            id: 'abyss_walker',
            name: 'Abyss Walker',
            category: 'aberration',
            baseLevel: 88,
            baseStats: { strength: 105, dexterity: 75, intelligence: 65, stamina: 95 },
            baseHealth: 1600,
            baseMana: 150,
            attackType: 'melee',
            aggroRange: 6,
            xpValue: 1100,
            alignment: 'chaotic',
            lootTable: 'aberration_void',
            sprite: '🦑',
            abilities: ['void_step', 'abyssal_strike', 'consume', 'darkness_cloak', 'tentacle_storm'],
            description: 'The deepest denizens of the Infinite Abyss. They have adapted to pure darkness and hunt by sensing the warmth of living souls.'
        },
        
        abyss_sentinel: {
            id: 'abyss_sentinel',
            name: 'Abyss Sentinel',
            category: 'construct',
            baseLevel: 90,
            baseStats: { strength: 110, dexterity: 30, intelligence: 70, stamina: 120 },
            baseHealth: 2000,
            baseMana: 200,
            attackType: 'melee',
            aggroRange: 5,
            xpValue: 1150,
            alignment: 'neutral',
            lootTable: 'construct_ancient',
            sprite: '🛡️',
            abilities: ['reality_anchor', 'energy_shield', 'overcharge', 'stasis_field', 'annihilate'],
            description: 'The last line of defense the lost civilization built against the darkness below. Still functional. Still vigilant. Still lethal.'
        },
        
        // --- BOSS CREATURES (unique encounters, long respawn) ---
        
        pale_king: {
            id: 'pale_king',
            name: 'The Pale King',
            category: 'undead',
            baseLevel: 55,
            baseStats: { strength: 95, dexterity: 45, intelligence: 80, stamina: 90 },
            baseHealth: 1800,
            baseMana: 300,
            attackType: 'melee',
            aggroRange: 6,
            xpValue: 1500,
            alignment: 'chaotic',
            lootTable: 'boss_pale_king',
            sprite: '👑',
            abilities: ['soul_strike', 'death_coil', 'raise_army', 'unholy_nova', 'dark_pact'],
            description: 'The lord of the Pale Court—ancient, intelligent, and terrifyingly powerful. Whether lich or vampire, none who have seen his true form have lived to tell.'
        },
        
        eternal_warden: {
            id: 'eternal_warden',
            name: 'The Eternal Warden',
            category: 'construct',
            baseLevel: 65,
            baseStats: { strength: 120, dexterity: 20, intelligence: 60, stamina: 130 },
            baseHealth: 2500,
            baseMana: 150,
            attackType: 'melee',
            aggroRange: 5,
            xpValue: 1800,
            alignment: 'neutral',
            lootTable: 'boss_warden',
            sprite: '🏛️',
            abilities: ['stone_fist', 'immovable', 'energy_shield', 'overcharge', 'seismic_slam', 'repair_protocol'],
            description: 'The greatest golem ever built by the lost civilization. It has guarded the Shattered Depths for millennia, and it remembers its creators\' final command.'
        },
        
        the_dreamer: {
            id: 'the_dreamer',
            name: 'The Dreamer',
            category: 'undead',
            baseLevel: 70,
            baseStats: { strength: 40, dexterity: 50, intelligence: 130, stamina: 70 },
            baseHealth: 1600,
            baseMana: 500,
            attackType: 'magic',
            aggroRange: 7,
            xpValue: 2200,
            alignment: 'chaotic',
            lootTable: 'boss_dreamer',
            sprite: '🌙',
            abilities: ['nightmare_wave', 'mind_shatter', 'summon_horror', 'reality_warp', 'dream_prison', 'dark_pact'],
            description: 'A lich-like entity who contacted the Sleeping Darkness directly and was transformed. Neither fully alive nor dead, existing in a perpetual dream state that warps reality around it.'
        },
        
        vyraxion: {
            id: 'vyraxion',
            name: 'Vyraxion the Ashborn',
            category: 'beast',
            baseLevel: 75,
            baseStats: { strength: 150, dexterity: 50, intelligence: 60, stamina: 140 },
            baseHealth: 3500,
            baseMana: 200,
            attackType: 'melee',
            aggroRange: 8,
            xpValue: 3000,
            alignment: 'neutral',
            lootTable: 'boss_dragon',
            sprite: '🐉',
            abilities: ['fire_breath', 'inferno', 'wing_buffet', 'tail_sweep', 'dive_attack', 'earthquake', 'dragon_roar'],
            description: 'The Ashborn. Ancient dragon of the Wraithspine summit. It may have witnessed the Shattering, and it guards—or fears—something in the mountain depths.'
        },
        
        architect_memory: {
            id: 'architect_memory',
            name: 'Memory of the Architect',
            category: 'construct',
            baseLevel: 90,
            baseStats: { strength: 80, dexterity: 60, intelligence: 150, stamina: 100 },
            baseHealth: 2800,
            baseMana: 600,
            attackType: 'magic',
            aggroRange: 7,
            xpValue: 3500,
            alignment: 'neutral',
            lootTable: 'boss_architect',
            sprite: '🔮',
            abilities: ['psychic_blast', 'memory_flood', 'temporal_echo', 'reality_anchor', 'stasis_field', 'mind_shatter', 'architect_protocol'],
            description: 'The preserved consciousness of the lost civilization\'s greatest mind, maintained in a crystal matrix for millennia. It knows the truth about the Shattering, the Sleeping Darkness, and why it all had to end.'
        },
        
        // ============================================================
        // SPECIAL / TEST MAP CREATURES (v1.0.0)
        // ============================================================
        
        // Training Dummy — used in test_arena (Testing Ground)
        // Designed for skill testing: huge HP pool, level-100 armor stats,
        // near-zero attack. XP=0 and lootTable=null = pure sandbox target.
        training_dummy: {
            id: 'training_dummy',
            name: 'Training Dummy',
            category: 'construct',
            baseLevel: 100,             // Fixed Lv100 — levelMultiplier stays 1.0
            baseStats: {
                strength:     2,        // Attacks for ~1-2 damage — no threat
                dexterity:   80,        // High DEX → strong armor/dodge
                intelligence: 5,
                stamina:     80         // High STA → strong HP/armor contribution
            },
            baseHealth: 50000,          // 50k HP pool for extended skill testing
            baseMana: 0,
            attackType: 'melee',
            aggroRange: 1,              // Only aggros if player is adjacent — effectively passive
            xpValue: 0,                 // No XP reward — sandbox only
            alignment: 'neutral',
            lootTable: null,            // No loot — LootGenerator returns early on null table
            sprite: '🪆',
            abilities: [],
            behavior: 'passive',
            description: 'A heavily reinforced practice dummy bolted to the arena floor. Its surface is scarred by countless strikes. It does not flee. It does not feel.'
        }
    },
    
    // NPC subtypes that modify base creatures
    subtypes: {
        lesser: {
            id: 'lesser',
            name: 'Lesser',
            statMultiplier: 0.7,
            healthMultiplier: 0.7,
            xpMultiplier: 0.6,
            lootMultiplier: 0.5
        },
        normal: {
            id: 'normal',
            name: '',
            statMultiplier: 1.0,
            healthMultiplier: 1.0,
            xpMultiplier: 1.0,
            lootMultiplier: 1.0
        },
        greater: {
            id: 'greater',
            name: 'Greater',
            statMultiplier: 1.3,
            healthMultiplier: 1.5,
            xpMultiplier: 1.5,
            lootMultiplier: 1.5
        },
        chief: {
            id: 'chief',
            name: 'Chief',
            statMultiplier: 1.6,
            healthMultiplier: 2.0,
            xpMultiplier: 2.0,
            lootMultiplier: 2.0
        },
        enraged: {
            id: 'enraged',
            name: 'Enraged',
            statMultiplier: 1.4,
            healthMultiplier: 1.2,
            xpMultiplier: 1.4,
            lootMultiplier: 1.3,
            specialEffects: ['berserk']
        },
        stone: {
            id: 'stone',
            name: 'Stone',
            statMultiplier: 1.2,
            healthMultiplier: 2.5,
            xpMultiplier: 1.8,
            lootMultiplier: 1.5,
            specialEffects: ['armor_boost']
        },
        fiery: {
            id: 'fiery',
            name: 'Fiery',
            statMultiplier: 1.3,
            healthMultiplier: 1.0,
            xpMultiplier: 1.5,
            lootMultiplier: 1.4,
            specialEffects: ['burn_aura']
        },
        ethereal: {
            id: 'ethereal',
            name: 'Ethereal',
            statMultiplier: 1.5,
            healthMultiplier: 0.8,
            xpMultiplier: 2.0,
            lootMultiplier: 2.0,
            specialEffects: ['phase_shift']
        },
        // v0.9.0: Boss subtype for unique boss encounters (long respawn, massive stats)
        boss: {
            id: 'boss',
            name: 'Boss',
            statMultiplier: 2.0,
            healthMultiplier: 3.0,
            xpMultiplier: 3.0,
            lootMultiplier: 3.0,
            specialEffects: ['boss_aura']
        }
    },
    
    // Behavior profiles
    behaviors: {
        passive: {
            id: 'passive',
            aggroOnSight: false,
            fleeAtHealthPercent: 0.2,
            callForHelp: false
        },
        aggressive: {
            id: 'aggressive',
            aggroOnSight: true,
            fleeAtHealthPercent: 0,
            callForHelp: false
        },
        pack: {
            id: 'pack',
            aggroOnSight: true,
            fleeAtHealthPercent: 0.1,
            callForHelp: true,
            helpRange: 4
        },
        guardian: {
            id: 'guardian',
            aggroOnSight: false,
            fleeAtHealthPercent: 0,
            callForHelp: true,
            helpRange: 6,
            defendPosition: true
        },
        coward: {
            id: 'coward',
            aggroOnSight: false,
            fleeAtHealthPercent: 0.5,
            callForHelp: true,
            helpRange: 3
        }
    }
};

// Helper functions
export function getCreature(creatureId) {
    return NPCConfig.creatures[creatureId] || null;
}

export function getSubtype(subtypeId) {
    return NPCConfig.subtypes[subtypeId] || NPCConfig.subtypes.normal;
}

export function getBehavior(behaviorId) {
    return NPCConfig.behaviors[behaviorId] || NPCConfig.behaviors.aggressive;
}

// Calculate scaled NPC stats for a given level
export function calculateNPCStats(creatureId, level, subtypeId = 'normal') {
    const creature = getCreature(creatureId);
    const subtype = getSubtype(subtypeId);
    if (!creature) return null;
    
    const levelDiff = level - creature.baseLevel;
    const scalingFactor = NPCConfig.statScalePerLevel || 0.07;
    const levelMultiplier = 1 + (levelDiff * scalingFactor);
    
    return {
        strength: Math.floor(creature.baseStats.strength * levelMultiplier * subtype.statMultiplier),
        dexterity: Math.floor(creature.baseStats.dexterity * levelMultiplier * subtype.statMultiplier),
        intelligence: Math.floor(creature.baseStats.intelligence * levelMultiplier * subtype.statMultiplier),
        stamina: Math.floor(creature.baseStats.stamina * levelMultiplier * subtype.statMultiplier),
        maxHealth: Math.floor(creature.baseHealth * levelMultiplier * subtype.healthMultiplier),
        maxMana: Math.floor(creature.baseMana * levelMultiplier * subtype.statMultiplier),
        xpValue: Math.floor(creature.xpValue * levelMultiplier * subtype.xpMultiplier)
    };
}

// Generate display name for NPC
export function getNPCDisplayName(creatureId, subtypeId = 'normal', level = null) {
    const creature = getCreature(creatureId);
    const subtype = getSubtype(subtypeId);
    if (!creature) return 'Unknown';
    
    const prefix = subtype.name ? `${subtype.name} ` : '';
    const suffix = level ? ` (Lv.${level})` : '';
    return `${prefix}${creature.name}${suffix}`;
}

export default NPCConfig;
