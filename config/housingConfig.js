/**
 * @file housingConfig.js
 * @description Player housing configuration - structures, buffs, costs, materials, and MUD narrative text.
 *              All text and values are configurable for easy customization.
 * 
 * @usage Imported by HousingSystem.js for buff calculations and upgrade logic.
 *        Imported by HousingUI.js for display text and cost rendering.
 * @dependencies None (pure configuration)
 * 
 * @version 1.2.0
 * @changelog
 *   - v1.2.0 (2026-03-05): Added staffSlot arrays to all 6 structure definitions.
 *                          Added staff-presence ambient texts to HomeAmbientTexts.
 *   - v1.1.0 (2026-02-10): Material drop tier progression balance — pushed T2 housing
 *                          materials from level 10 to level 15. Low-level maps (Farmstead,
 *                          Thornwood Edge, Overgrown Shrine) no longer drop Iron/Hardwood/
 *                          Leather. T2 now first appears in Deep Thornwood/Old Road (lv15+).
 *   - v1.0.0 (2026-01-26): Initial creation with all 6 structures, 13 materials, MUD text
 */

// ===========================================
// GLOBAL SETTINGS
// ===========================================
export const HousingSettings = {
    maxStructureLevel: 999,          // Theoretical max (diminishing returns make this impractical)
    diminishingFactor: 0.95,         // Buff multiplier per level (exponential decay)
    flatBonusAfter100: 0.05,         // Flat bonus multiplier per level after 100
    goldCostMultiplier: 1.15,        // Gold cost grows by this factor per level
    materialCostMultiplier: 1.12,    // Material cost grows by this factor per 5 levels
};

// ===========================================
// MATERIALS DEFINITIONS
// Materials for housing upgrades (drop from enemies)
// ===========================================
export const HousingMaterials = {
    // Tier 1 - Common (drop from all enemies)
    wood: { 
        id: 'wood', 
        name: 'Wood', 
        icon: '🪵', 
        tier: 1, 
        stackMax: 999,
        description: 'Common lumber from fallen trees.',
        color: '#8B4513'
    },
    stone: { 
        id: 'stone', 
        name: 'Stone', 
        icon: '🪨', 
        tier: 1, 
        stackMax: 999,
        description: 'Rough stone suitable for construction.',
        color: '#808080'
    },
    clay: { 
        id: 'clay', 
        name: 'Clay', 
        icon: '🧱', 
        tier: 1, 
        stackMax: 999,
        description: 'Moldable clay for pottery and mortar.',
        color: '#CD853F'
    },
    
    // Tier 2 - Uncommon (mid-tier enemies)
    iron: { 
        id: 'iron', 
        name: 'Iron', 
        icon: '⛓️', 
        tier: 2, 
        stackMax: 999,
        description: 'Sturdy iron for reinforcement.',
        color: '#708090'
    },
    hardwood: { 
        id: 'hardwood', 
        name: 'Hardwood', 
        icon: '🌳', 
        tier: 2, 
        stackMax: 999,
        description: 'Dense wood from ancient trees.',
        color: '#654321'
    },
    leather_strips: { 
        id: 'leather_strips', 
        name: 'Leather Strips', 
        icon: '🦴', 
        tier: 2, 
        stackMax: 999,
        description: 'Tanned leather for bindings.',
        color: '#8B4513'
    },
    
    // Tier 3 - Rare (harder content, bosses)
    marble: { 
        id: 'marble', 
        name: 'Marble', 
        icon: '🔲', 
        tier: 3, 
        stackMax: 999,
        description: 'Polished marble for fine construction.',
        color: '#E8E8E8'
    },
    silver_ingot: { 
        id: 'silver_ingot', 
        name: 'Silver Ingot', 
        icon: '🥈', 
        tier: 3, 
        stackMax: 999,
        description: 'Purified silver for decorative work.',
        color: '#C0C0C0'
    },
    
    // Tier 4 - Epic (elite enemies, raids)
    crystal_shard: { 
        id: 'crystal_shard', 
        name: 'Crystal Shard', 
        icon: '💎', 
        tier: 4, 
        stackMax: 999,
        description: 'Magical crystal with innate power.',
        color: '#00CED1'
    },
    dragonwood: { 
        id: 'dragonwood', 
        name: 'Dragonwood', 
        icon: '🐉', 
        tier: 4, 
        stackMax: 999,
        description: 'Rare wood infused with draconic essence.',
        color: '#8B0000'
    },
    
    // Tier 5 - Legendary (boss drops, rare events)
    ethereal_essence: { 
        id: 'ethereal_essence', 
        name: 'Ethereal Essence', 
        icon: '✨', 
        tier: 5, 
        stackMax: 999,
        description: 'Pure magical essence from the planes beyond.',
        color: '#E6E6FA'
    },
    starstone: { 
        id: 'starstone', 
        name: 'Starstone', 
        icon: '⭐', 
        tier: 5, 
        stackMax: 999,
        description: 'Fallen star fragments of immense power.',
        color: '#FFD700'
    },
    
    // Tier 6 - Mythic (end-game only)
    void_crystal: { 
        id: 'void_crystal', 
        name: 'Void Crystal', 
        icon: '🌑', 
        tier: 6, 
        stackMax: 999,
        description: 'Crystal from the space between worlds.',
        color: '#1a0033'
    }
};

// ===========================================
// BUFF LABELS
// Display names for buff types
// ===========================================
export const BuffLabels = {
    hpRegen: 'HP Regen',
    goldFind: 'Gold Find',
    offlineXp: 'Offline XP',
    cooldownReduction: 'CD Reduction',
    critChance: 'Crit Chance',
    equipmentStats: 'Equipment Stats',
    reforgeDiscount: 'Reforge Cost',
    herbProduction: 'Herbs/Hour',
    materialDrops: 'Material Drops',
    blessingDiscount: 'Blessing Cost',
    blessingDuration: 'Blessing Duration',
    trophySlots: 'Trophy Slots',
    trophyPower: 'Trophy Power'
};

// ===========================================
// BUFF FORMAT SUFFIXES
// How to display each buff type
// ===========================================
export const BuffFormats = {
    hpRegen: { suffix: '%', decimals: 1 },
    goldFind: { suffix: '%', decimals: 1 },
    offlineXp: { suffix: '%', decimals: 1 },
    cooldownReduction: { suffix: '%', decimals: 1 },
    critChance: { suffix: '%', decimals: 2 },
    equipmentStats: { suffix: '%', decimals: 1 },
    reforgeDiscount: { suffix: '%', decimals: 1 },
    herbProduction: { suffix: '/hr', decimals: 1 },
    materialDrops: { suffix: '%', decimals: 1 },
    blessingDiscount: { suffix: '%', decimals: 1 },
    blessingDuration: { suffix: '%', decimals: 1 },
    trophySlots: { suffix: '', decimals: 0 },
    trophyPower: { suffix: '%', decimals: 1 }
};

// ===========================================
// STRUCTURE DEFINITIONS
// ===========================================
export const HousingStructures = {
    hearth: {
        id: 'hearth',
        name: 'Hearth',
        icon: '🔥',
        description: 'The heart of your home, providing warmth and comfort.',
        staffSlot: ['roslin', 'sven', 'aldous'],  // Staff who reside here (by min room level: 5/15/30)
        baseBuff: {
            hpRegen: 1,      // +1% per level at level 1
            goldFind: 0.5    // +0.5% per level at level 1
        },
        baseCost: {
            gold: 100,
            materials: { wood: 5, stone: 3 }
        },
        specialAction: {
            id: 'rest',
            name: 'Rest',
            icon: '😴',
            description: 'Rest by the hearth to recover.'
        },
        ambientTexts: [
            'The fire crackles warmly, casting dancing shadows on the walls.',
            'Embers drift lazily upward, carrying the scent of wood smoke.',
            'The hearth glows with a comforting warmth.',
            'A log shifts in the fire, sending up a shower of sparks.',
            'The flames flicker hypnotically, bringing peace to your mind.'
        ],
        tiers: [
            { 
                minLevel: 0, 
                stageName: 'Empty Plot', 
                description: 'A bare patch of ground where a fire might someday burn.', 
                atmosphere: 'Cold wind sweeps across the empty space.', 
                details: ['The ground is cold and bare.', 'This space awaits a builder\'s touch.'] 
            },
            { 
                minLevel: 1, 
                stageName: 'Smoldering Campfire', 
                description: 'A ring of stones surrounds a modest fire. Smoke curls lazily into the grey sky.', 
                atmosphere: 'The crackle of burning wood provides meager comfort against the wilderness.', 
                details: ['Charred logs smolder with a faint orange glow.', 'A battered iron pot hangs from a makeshift tripod.'] 
            },
            { 
                minLevel: 5, 
                stageName: 'Sturdy Fire Pit', 
                description: 'A well-constructed fire pit of fitted stones radiates steady warmth.', 
                atmosphere: 'The reliable flames cast dancing shadows across the surrounding area.', 
                details: ['Neatly stacked firewood sits within easy reach.', 'Flat cooking stones ring the pit, still warm from recent use.'] 
            },
            { 
                minLevel: 15, 
                stageName: 'Stone Hearth', 
                description: 'A proper hearth of mortared stone stands proud, its chimney drawing smoke away cleanly.', 
                atmosphere: 'Warmth radiates outward in welcoming waves, pushing back the chill.', 
                details: ['Iron hooks hold pots of varying sizes above the flames.', 'A carved mantle displays small trinkets and keepsakes.'] 
            },
            { 
                minLevel: 30, 
                stageName: 'Grand Fireplace', 
                description: 'An impressive fireplace of polished stone dominates the space, large enough to roast a boar.', 
                atmosphere: 'The roaring fire fills the room with golden light and comfortable warmth.', 
                details: ['Ornate ironwork frames the opening, depicting scenes of ancient hunts.', 'A thick bearskin rug lies before the hearth.'] 
            },
            { 
                minLevel: 50, 
                stageName: 'Eternal Flame', 
                description: 'Azure flames dance eternally within a hearth of enchanted marble, requiring no fuel.', 
                atmosphere: 'Magical warmth suffuses every corner, carrying whispers of distant realms.', 
                details: ['The flames shift through impossible colors—blue, violet, silver.', 'Runes carved into the marble pulse with inner light.'] 
            },
            { 
                minLevel: 75, 
                stageName: 'Phoenix Brazier', 
                description: 'A magnificent brazier wrought from dragonbone houses flames said to be kindled from a phoenix feather.', 
                atmosphere: 'The legendary fire bestows vigor upon all who bask in its radiance.', 
                details: ['Feathers of pure flame occasionally drift upward and vanish.', 'The heat never burns, only soothes and restores.'] 
            },
            { 
                minLevel: 100, 
                stageName: 'Heart of the Sun', 
                description: 'A miniature sun floats above a void-crystal pedestal, its brilliance contained by powerful wards.', 
                atmosphere: 'Raw celestial energy washes over you, filling you with boundless vitality.', 
                details: ['Solar flares dance harmlessly around the contained star.', 'The pedestal hums with barely-contained power.'] 
            }
        ]
    },
    
    training: {
        id: 'training',
        name: 'Training Grounds',
        icon: '🎯',
        description: 'A place to hone your combat skills.',
        staffSlot: [],  // No staff assigned to training grounds initially
        baseBuff: {
            offlineXp: 0.5,
            cooldownReduction: 0.3
        },
        baseCost: {
            gold: 150,
            materials: { wood: 8, leather_strips: 2 }
        },
        specialAction: {
            id: 'train',
            name: 'Train',
            icon: '⚔️',
            description: 'Practice your combat techniques.'
        },
        ambientTexts: [
            'The training dummy sways gently, awaiting your next assault.',
            'Dust motes drift through the air, disturbed by phantom movements.',
            'The scent of leather and sweat lingers in the training area.',
            'You hear the echo of past training sessions in your mind.',
            'A practice sword leans invitingly against the weapon rack.'
        ],
        tiers: [
            { 
                minLevel: 0, 
                stageName: 'Unmarked Ground', 
                description: 'An area of packed earth, unremarkable save for its flatness.', 
                atmosphere: 'The space awaits purpose.', 
                details: [] 
            },
            { 
                minLevel: 1, 
                stageName: 'Straw Target', 
                description: 'A crude mannequin of bundled straw leans against a wooden post.', 
                atmosphere: "It's not much, but it's a start.", 
                details: ['Straw pokes out at odd angles, already showing wear.'] 
            },
            { 
                minLevel: 5, 
                stageName: 'Practice Dummy', 
                description: 'A wooden dummy on a rotating post allows for basic combat drills.', 
                atmosphere: 'The weathered wood bears countless marks from dedicated practice.', 
                details: ['Padded striking surfaces show the wear of regular training.', 'A rack nearby holds practice weapons.'] 
            },
            { 
                minLevel: 15, 
                stageName: 'Training Yard', 
                description: 'A proper training yard with multiple stations for different combat disciplines.', 
                atmosphere: 'The scent of leather and honest sweat hangs in the air.', 
                details: ['Archery targets stand at varying distances.', 'A sand pit allows for grappling practice.'] 
            },
            { 
                minLevel: 30, 
                stageName: "Warrior's Arena", 
                description: 'A sophisticated training arena with mechanical opponents and obstacle courses.', 
                atmosphere: 'Gears click and springs tension as the training apparatus awaits.', 
                details: ['Mechanical arms swing weighted clubs in unpredictable patterns.', 'Pressure plates trigger harmless but surprising traps.'] 
            },
            { 
                minLevel: 50, 
                stageName: 'Illusory Battleground', 
                description: 'Enchanted crystals project lifelike illusions of various foes.', 
                atmosphere: 'Shimmering warriors flicker in and out of existence, awaiting your challenge.', 
                details: ['Illusory opponents range from goblins to dragons.', 'Defeated illusions dissolve into motes of light.'] 
            },
            { 
                minLevel: 75, 
                stageName: 'Echo Chamber', 
                description: 'A mystical chamber that summons echoes of legendary warriors to spar with.', 
                atmosphere: 'The ghosts of heroes past stand ready to test your mettle.', 
                details: ['Translucent figures of famous warriors await.', 'Each echo fights with the style of their living counterpart.'] 
            },
            { 
                minLevel: 100, 
                stageName: 'Temporal Dojo', 
                description: 'Within this space, time flows differently—hours of training pass in mere minutes.', 
                atmosphere: 'Reality bends here, offering endless opportunity for improvement.', 
                details: ['Hourglasses float suspended, their sand flowing upward.', 'Your movements leave after-images that critique your form.'] 
            }
        ]
    },
    
    armory: {
        id: 'armory',
        name: 'Armory',
        icon: '⚔️',
        description: 'Storage and enhancement for your equipment.',
        staffSlot: ['breck'],  // Breck Hammerfall requires armory lv.5
        baseBuff: {
            equipmentStats: 0.8,
            reforgeDiscount: 0.5
        },
        baseCost: {
            gold: 200,
            materials: { wood: 5, iron: 8, stone: 5 }
        },
        specialAction: {
            id: 'reforge',
            name: 'Reforge',
            icon: '🔨',
            description: 'Examine and improve your equipment.'
        },
        ambientTexts: [
            'Polished steel gleams from the weapon racks.',
            'The smell of oil and metal fills the air.',
            'A suit of armor seems to watch you from its stand.',
            'Light catches on a blade, sending reflections dancing.',
            'The weight of armaments surrounds you with quiet power.'
        ],
        tiers: [
            { 
                minLevel: 0, 
                stageName: 'Nothing', 
                description: 'Your equipment lies scattered on the ground.', 
                atmosphere: 'Perhaps some organization would help.', 
                details: [] 
            },
            { 
                minLevel: 1, 
                stageName: 'Weapon Rack', 
                description: 'A simple wooden rack keeps your weapons off the damp ground.', 
                atmosphere: 'Basic, but functional.', 
                details: ['Rough-hewn pegs hold blades and bows.'] 
            },
            { 
                minLevel: 5, 
                stageName: 'Tool Shed', 
                description: 'A modest shed provides shelter for your gear and basic repair supplies.', 
                atmosphere: 'The smell of oil and leather pervades the cramped space.', 
                details: ['Hooks line the walls, each holding equipment.', 'A grinding wheel sits in one corner.'] 
            },
            { 
                minLevel: 15, 
                stageName: 'Armory Room', 
                description: 'A dedicated room houses your equipment on proper stands and mannequins.', 
                atmosphere: 'Your arsenal stands ready, each piece in its designated place.', 
                details: ['Armor stands display your protection like silent sentinels.', 'Velvet-lined cases hold your most precious items.'] 
            },
            { 
                minLevel: 30, 
                stageName: 'War Room', 
                description: 'A professional armory complete with forge and enchanting table.', 
                atmosphere: 'The heat from the forge mingles with the tingle of ambient magic.', 
                details: ['A master-crafted forge burns with consistent heat.', 'Enchanting runes glow faintly on a central table.'] 
            },
            { 
                minLevel: 50, 
                stageName: 'Hall of Arms', 
                description: 'A grand hall displays legendary weapons alongside your personal arsenal.', 
                atmosphere: 'History and power echo from every corner of this magnificent space.', 
                details: ['Weapons of historical significance hang in places of honor.', 'Self-maintaining enchantments keep everything pristine.'] 
            },
            { 
                minLevel: 75, 
                stageName: 'Dimensional Vault', 
                description: 'A pocket dimension contains infinite storage for arms and armor.', 
                atmosphere: 'Weapons float in organized constellations throughout the impossible space.', 
                details: ['Items drift gently in zero gravity until called.', 'Time moves slower here, preventing decay.'] 
            },
            { 
                minLevel: 100, 
                stageName: 'Forge of Legends', 
                description: 'The legendary forge where gods once crafted their weapons now serves you.', 
                atmosphere: 'Divine fire burns in a forge older than mortal memory.', 
                details: ['The anvil bears the marks of celestial hammers.', 'Weapons placed here slowly absorb ambient divine energy.'] 
            }
        ]
    },
    
    garden: {
        id: 'garden',
        name: 'Garden',
        icon: '🌿',
        description: 'A growing area for herbs and crafting materials.',
        staffSlot: ['willem'],  // Old Willem requires garden lv.1
        baseBuff: {
            herbProduction: 1,
            materialDrops: 0.3
        },
        baseCost: {
            gold: 100,
            materials: { wood: 3, stone: 3 }
        },
        specialAction: {
            id: 'harvest',
            name: 'Harvest',
            icon: '🌱',
            description: 'Gather herbs and materials.'
        },
        ambientTexts: [
            'A gentle breeze carries the scent of blooming flowers.',
            'Bees hum contentedly among the blossoms.',
            'Dewdrops glisten on leaves in the morning light.',
            'A butterfly drifts lazily between the plants.',
            'The garden pulses with quiet, growing life.'
        ],
        tiers: [
            { 
                minLevel: 0, 
                stageName: 'Bare Soil', 
                description: 'Untilled earth, waiting for seeds.', 
                atmosphere: 'Potential lies dormant beneath the surface.', 
                details: [] 
            },
            { 
                minLevel: 1, 
                stageName: 'Herb Patch', 
                description: 'A small patch of medicinal herbs grows in neat rows.', 
                atmosphere: 'The gentle scent of herbs carries on the breeze.', 
                details: ['Mint, chamomile, and basic healing herbs flourish.'] 
            },
            { 
                minLevel: 5, 
                stageName: 'Garden Plot', 
                description: 'An expanded garden with trellises and raised beds.', 
                atmosphere: 'Bees buzz contentedly among the flowering plants.', 
                details: ['Climbing plants wind up wooden supports.', 'A scarecrow keeps watch over the vegetables.'] 
            },
            { 
                minLevel: 15, 
                stageName: 'Greenhouse', 
                description: 'A glass structure allows year-round cultivation of delicate specimens.', 
                atmosphere: 'Warmth and humidity create a tropical paradise within.', 
                details: ['Exotic plants from distant lands thrive here.', 'Rare butterflies have taken up residence.'] 
            },
            { 
                minLevel: 30, 
                stageName: 'Botanical Garden', 
                description: 'Winding paths lead through specialized sections for every type of flora.', 
                atmosphere: 'Each turn reveals new wonders of the natural world.', 
                details: ['A poison garden grows behind locked gates.', 'Carnivorous plants snap at unwary insects.'] 
            },
            { 
                minLevel: 50, 
                stageName: 'Fey Grove', 
                description: 'Plants touched by fey magic grow in impossible ways.', 
                atmosphere: 'Tiny lights dance among leaves that shimmer with inner luminescence.', 
                details: ["Flowers bloom in colors that don't exist elsewhere.", 'Fey sprites tend to the plants when unobserved.'] 
            },
            { 
                minLevel: 75, 
                stageName: 'World Tree Sapling', 
                description: 'A cutting from Yggdrasil itself grows here, connecting to all realms.', 
                atmosphere: 'The air hums with primordial life energy from the dawn of creation.', 
                details: ['Roots dig through dimensional barriers.', 'Sitting beneath it grants visions of distant worlds.'] 
            },
            { 
                minLevel: 100, 
                stageName: 'Genesis Garden', 
                description: 'A garden where new species spontaneously evolve.', 
                atmosphere: 'Life itself experiments here, creating and discarding forms in endless variation.', 
                details: ['Plants literally grow before your eyes.', 'New species emerge weekly, some useful, some dangerous.'] 
            }
        ]
    },
    
    shrine: {
        id: 'shrine',
        name: 'Shrine',
        icon: '🛕',
        description: 'A sacred space for divine favor.',
        staffSlot: ['petra'],  // Petra Caldwell requires shrine lv.15
        baseBuff: {
            blessingDiscount: 0.6,
            blessingDuration: 0.5
        },
        baseCost: {
            gold: 250,
            materials: { stone: 10, marble: 2 }
        },
        specialAction: {
            id: 'pray',
            name: 'Pray',
            icon: '🙏',
            description: 'Seek the favor of the gods.'
        },
        ambientTexts: [
            'Incense smoke curls upward in delicate spirals.',
            'A sense of peace washes over you near the altar.',
            'Candle flames flicker despite the still air.',
            'You feel watched by benevolent, unseen eyes.',
            'The shrine hums with quiet divine energy.'
        ],
        tiers: [
            { 
                minLevel: 0, 
                stageName: 'Unmarked Stone', 
                description: 'A flat stone that might serve as an altar.', 
                atmosphere: 'The gods take no notice of this place.', 
                details: [] 
            },
            { 
                minLevel: 1, 
                stageName: 'Simple Altar', 
                description: 'A rough stone altar holds small offerings to the gods.', 
                atmosphere: 'A faint presence suggests your prayers might be heard.', 
                details: ['Dried flowers and coins rest upon the stone.'] 
            },
            { 
                minLevel: 5, 
                stageName: 'Roadside Shrine', 
                description: 'A small roofed structure protects the altar from the elements.', 
                atmosphere: 'Peace settles upon you as you approach the sacred space.', 
                details: ['Carved symbols represent various deities.', 'Prayer ribbons flutter from the eaves.'] 
            },
            { 
                minLevel: 15, 
                stageName: 'Chapel', 
                description: 'A proper chapel with pews, altar, and religious iconography.', 
                atmosphere: 'Divine presence is palpable within these blessed walls.', 
                details: ['Stained glass filters light into rainbow patterns.', 'An eternal flame burns on the main altar.'] 
            },
            { 
                minLevel: 30, 
                stageName: 'Temple', 
                description: 'An impressive temple with multiple shrines to different aspects of divinity.', 
                atmosphere: 'Holy power radiates from every surface, sanctifying all who enter.', 
                details: ['Acolytes maintain the sacred spaces.', 'A fountain of blessed water dominates the courtyard.'] 
            },
            { 
                minLevel: 50, 
                stageName: 'Grand Cathedral', 
                description: 'A magnificent cathedral whose spires reach toward the heavens.', 
                atmosphere: 'The boundary between mortal and divine realms grows thin here.', 
                details: ['Massive pipe organs fill the space with sacred music.', 'Miracles occasionally manifest within these walls.'] 
            },
            { 
                minLevel: 75, 
                stageName: 'Celestial Gateway', 
                description: 'A portal to the outer planes allows direct communion with divine beings.', 
                atmosphere: 'Angels and celestials pass through regularly, blessing all they encounter.', 
                details: ['The gateway shimmers with heavenly light.', 'Divine messengers deliver guidance to the worthy.'] 
            },
            { 
                minLevel: 100, 
                stageName: 'Seat of the Gods', 
                description: 'The gods themselves have chosen to place a throne of their power here.', 
                atmosphere: 'You stand in a place where mortals can touch the infinite.', 
                details: ['A throne carved from solidified prayers dominates the space.', 'Reality itself bends to divine will here.'] 
            }
        ]
    },
    
    trophy: {
        id: 'trophy',
        name: 'Trophy Hall',
        icon: '🏆',
        description: 'Display your conquests and victories.',
        staffSlot: ['pip'],  // Young Pip requires trophy lv.1
        baseBuff: {
            trophySlots: 0.5,
            trophyPower: 0.4
        },
        baseCost: {
            gold: 300,
            materials: { wood: 10, stone: 5, iron: 3 }
        },
        specialAction: {
            id: 'display',
            name: 'Display',
            icon: '👁️',
            description: 'Admire your collection of trophies.'
        },
        ambientTexts: [
            'Mounted heads seem to follow you with glassy eyes.',
            'Torchlight glints off polished scales and fangs.',
            'The hall echoes with memories of battles past.',
            'A chill runs down your spine as you survey your conquests.',
            'Each trophy whispers tales of glory and danger.'
        ],
        tiers: [
            { 
                minLevel: 0, 
                stageName: 'Empty Corner', 
                description: 'A corner where trophies might someday rest.', 
                atmosphere: 'Glory awaits.', 
                details: [] 
            },
            { 
                minLevel: 1, 
                stageName: 'Trophy Shelf', 
                description: 'A simple shelf displays your first conquests.', 
                atmosphere: 'Humble beginnings of a growing legend.', 
                details: ['A goblin ear serves as your first trophy.'] 
            },
            { 
                minLevel: 5, 
                stageName: 'Display Case', 
                description: 'A glass-fronted case protects and presents your growing collection.', 
                atmosphere: 'Each trophy tells a story of victory.', 
                details: ['Claws, fangs, and scales from various beasts.', 'Small plaques describe each conquest.'] 
            },
            { 
                minLevel: 15, 
                stageName: 'Trophy Room', 
                description: 'An entire room dedicated to your victories.', 
                atmosphere: 'The fallen stare down, a reminder of battles won.', 
                details: ['Mounted beast heads line the walls.', 'Preserved creatures stand in poses of menace.'] 
            },
            { 
                minLevel: 30, 
                stageName: 'Hall of Victories', 
                description: 'A grand hall where trophies from legendary battles are displayed.', 
                atmosphere: 'Your reputation as a hunter is established beyond question.', 
                details: ['Dragon scales shimmer in the torchlight.', "A demon's horn serves as a centerpiece."] 
            },
            { 
                minLevel: 50, 
                stageName: 'Museum of Conquests', 
                description: 'A museum-quality collection that scholars travel to witness.', 
                atmosphere: 'Your victories have become the stuff of legend.', 
                details: ['Interactive displays tell the story of each battle.', 'A gift shop sells miniature replicas.'] 
            },
            { 
                minLevel: 75, 
                stageName: 'Hall of Legends', 
                description: 'Your trophies have attracted the attention of gods and heroes alike.', 
                atmosphere: 'The spirits of the defeated acknowledge your supremacy.', 
                details: ['Ghostly recreations of battles play out periodically.', 'The hall exists partially outside of time.'] 
            },
            { 
                minLevel: 100, 
                stageName: "Apex Predator's Domain", 
                description: 'A dimension where your victories have reshaped reality itself.', 
                atmosphere: 'You are recognized as the supreme hunter across all planes.', 
                details: ["Trophies from creatures that shouldn't exist.", 'Even gods think twice before becoming your enemy.'] 
            }
        ]
    }
};

// ===========================================
// HOME TIER NAMES
// Based on average structure level
// ===========================================
export const HomeTiers = [
    { minAvg: 0, name: 'Empty Clearing', description: 'A patch of wild land with nothing but potential.', icon: '🏕️' },
    { minAvg: 1, name: 'Makeshift Camp', description: 'Barely more than a campsite, but it\'s yours.', icon: '⛺' },
    { minAvg: 5, name: 'Simple Shelter', description: 'A humble dwelling that keeps out the worst weather.', icon: '🛖' },
    { minAvg: 15, name: 'Modest Dwelling', description: 'A comfortable home that any adventurer would envy.', icon: '🏠' },
    { minAvg: 30, name: 'Comfortable Homestead', description: 'A well-appointed residence with all the necessities.', icon: '🏡' },
    { minAvg: 50, name: 'Noble Villa', description: 'A manor befitting minor nobility.', icon: '🏘️' },
    { minAvg: 75, name: 'Grand Manor', description: 'An estate that rivals the holdings of lords.', icon: '🏰' },
    { minAvg: 100, name: 'Legendary Estate', description: 'A domain that will be remembered for ages.', icon: '✨' }
];

// ===========================================
// HOME AMBIENT TEXTS
// Random flavor text for the home overview
// ===========================================
export const HomeAmbientTexts = [
    'A gentle breeze stirs through your home.',
    'The familiar creaks and groans of your dwelling bring comfort.',
    'Dust motes drift lazily through a sunbeam.',
    'You take a moment to appreciate the sanctuary you\'ve built.',
    'The scent of home surrounds you.',
    'Everything is in its place, just as you left it.',
    'A sense of pride swells as you survey your domain.',
    'This place is yours, hard-won and well-deserved.',
    'The outside world feels distant within these walls.',
    'Peace settles over you like a warm blanket.',
    // Staff-presence ambients (shown only when at least one staff is hired)
    'Somewhere in the house, someone is working.',
    'The house feels lived-in. Occupied. You\'ve grown used to that.',
    'A door closes somewhere in the east wing. One of your staff, going about their business.',
    'The place runs better than it did before. You notice this in small ways.',
    'You hear quiet industry from somewhere in the house — the sound of a household that functions.',
];

// ===========================================
// MATERIAL DROP TIERS BY ENEMY LEVEL
// Defines which material tiers drop from which enemy levels
// ===========================================
export const MaterialDropTiers = {
    tier1: { minEnemyLevel: 1, maxEnemyLevel: 999 },   // Always available
    tier2: { minEnemyLevel: 15, maxEnemyLevel: 999 },  // Level 15+ (was 10)
    tier3: { minEnemyLevel: 25, maxEnemyLevel: 999 },  // Level 25+
    tier4: { minEnemyLevel: 50, maxEnemyLevel: 999 },  // Level 50+
    tier5: { minEnemyLevel: 75, maxEnemyLevel: 999 },  // Level 75+
    tier6: { minEnemyLevel: 100, maxEnemyLevel: 999 }  // Level 100+
};

// ===========================================
// MATERIAL REQUIREMENTS BY STRUCTURE LEVEL
// Higher structure levels require higher tier materials
// ===========================================
export const MaterialTierRequirements = {
    level25: { material: 'marble', baseAmount: 1 },           // Level 25+: Marble added
    level50: { material: 'crystal_shard', baseAmount: 1 },    // Level 50+: Crystal added
    level75: { material: 'ethereal_essence', baseAmount: 1 }, // Level 75+: Essence added
    level100: { material: 'void_crystal', baseAmount: 1 }     // Level 100+: Void Crystal added
};

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Get a structure definition by ID
 * @param {string} structureId 
 * @returns {Object|null}
 */
export function getStructure(structureId) {
    return HousingStructures[structureId] || null;
}

/**
 * Get a material definition by ID
 * @param {string} materialId 
 * @returns {Object|null}
 */
export function getMaterial(materialId) {
    return HousingMaterials[materialId] || null;
}

/**
 * Get the narrative tier for a structure at a given level
 * @param {string} structureId 
 * @param {number} level 
 * @returns {Object}
 */
export function getNarrativeTier(structureId, level) {
    const structure = HousingStructures[structureId];
    if (!structure) return null;
    
    // Find the highest tier that the level qualifies for
    let matchedTier = structure.tiers[0];
    for (const tier of structure.tiers) {
        if (level >= tier.minLevel) {
            matchedTier = tier;
        } else {
            break;
        }
    }
    return matchedTier;
}

/**
 * Get the home tier based on average structure level
 * @param {number} averageLevel 
 * @returns {Object}
 */
export function getHomeTier(averageLevel) {
    let matchedTier = HomeTiers[0];
    for (const tier of HomeTiers) {
        if (averageLevel >= tier.minAvg) {
            matchedTier = tier;
        } else {
            break;
        }
    }
    return matchedTier;
}

/**
 * Get all materials grouped by tier
 * @returns {Object} Object with tier numbers as keys
 */
export function getMaterialsByTier() {
    const grouped = {};
    for (const [id, material] of Object.entries(HousingMaterials)) {
        const tier = material.tier;
        if (!grouped[tier]) grouped[tier] = [];
        grouped[tier].push({ ...material, id });
    }
    return grouped;
}

/**
 * Get a random ambient text for a structure
 * @param {string} structureId 
 * @returns {string}
 */
export function getRandomAmbientText(structureId) {
    const structure = HousingStructures[structureId];
    if (!structure || !structure.ambientTexts.length) return '';
    const index = Math.floor(Math.random() * structure.ambientTexts.length);
    return structure.ambientTexts[index];
}

/**
 * Get a random home ambient text
 * @returns {string}
 */
export function getRandomHomeAmbientText() {
    const index = Math.floor(Math.random() * HomeAmbientTexts.length);
    return HomeAmbientTexts[index];
}

/**
 * Get list of all structure IDs
 * @returns {string[]}
 */
export function getAllStructureIds() {
    return Object.keys(HousingStructures);
}

/**
 * Get visual tier class based on structure level (for CSS styling)
 * @param {number} level 
 * @returns {string}
 */
export function getVisualTierClass(level) {
    if (level >= 100) return 'tier-100';
    if (level >= 75) return 'tier-75';
    if (level >= 50) return 'tier-50';
    if (level >= 25) return 'tier-25';
    return '';
}

// Default export for convenience
export default {
    HousingSettings,
    HousingMaterials,
    HousingStructures,
    BuffLabels,
    BuffFormats,
    HomeTiers,
    HomeAmbientTexts,
    MaterialDropTiers,
    MaterialTierRequirements,
    getStructure,
    getMaterial,
    getNarrativeTier,
    getHomeTier,
    getMaterialsByTier,
    getRandomAmbientText,
    getRandomHomeAmbientText,
    getAllStructureIds,
    getVisualTierClass
};
