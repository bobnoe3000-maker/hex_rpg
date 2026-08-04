/**
 * @file mapConfig.js
 * @description Battle map definitions including grid layout, NPCs, obstacles, exits,
 *              and ambient events. Defines all playable areas in the game world.
 *              Includes world map layout data for visual map UI.
 *              Setting: The Shattered Coast (see WORLD_LORE.md)
 * 
 * @usage Imported by MapInstance to create battle maps. Referenced by TownScreen
 *        and WorldMapUI for world map display and navigation.
 * @dependencies None (pure data configuration)
 * 
 * @version 2.3.1
 * @changelog
 *   - v2.3.1 (2026-03-10): Replaced all 10 coast_-_beach tiles in Coastal Caves (forest_edge)
 *                          with cave-appropriate rocky/damp tiles (base_rocky, mountains_foothills_rocky,
 *                          mountains_low_rocky, plains_damp_2/3/5). Ocean water tiles unchanged.
 *   - v2.3.0 (2026-03-09): test_arena resized 6x8 -> 6x6. terrainTileDefault changed to
 *                           'mountains_low_lush'. Exit moved to q:2,r:4. Corner excludedHexes
 *                           updated for 6x6 grid. backgroundColor updated.
 * @changelog
 *   - v2.2.0 (2026-03-09): Added test_arena special map (Testing Ground). isTestMap flag,
 *                          training_dummy NPC spawn at Lv100, 5-sec respawn, single exit
 *                          back to town. Not on world map — accessed via Menu/Town UI.
 *   - v2.1.0 (2026-02-28): Updated terrainTiles for all 26 maps from terrain editor tool.
 *                          1691 tile assignments, 7 with rotation. Rotation support via
 *                          { tile, rot } object format (backward compatible with strings).
 *   - v2.0.0 (2026-02-27): Added terrainTiles for ALL 25 battle maps. 80 tile types,
 *                          10 visual themes. CSS filters for cave/dungeon/undead/void.
 *                          Obstacle hexes excluded from terrain tiles (stay dark).
 *   - v1.3.0 (2026-02-26): Added terrainTiles and terrainTileDefault to deep_forest map
 *                          for illustrated hex tile pilot. 16 tile types from 2-Minute Tabletop
 *                          pack. Dirt path tiles used at exit hexes only. See
 *                          TERRAIN_TILE_IMPLEMENTATION.md.
 *   - v1.2.0 (2026-02-11): Reorganized worldMapData.layout for geographic progression.
 *                          Higher level maps now farther from Eron's Landing in all directions.
 *                          Mountain/Dragon chain vertical (x=8, north). Void chain vertical
 *                          (x=6, north). Western underwater chain goes NW. Pale Court vertical
 *                          (x=10, north). No negative coordinates.
 *   - v1.1.0 (2026-02-10): Added 8 endgame maps (level 48-100+) with 5 boss encounters.
 *                          Pale Court Fortress (48-58, BOSS: Pale King), Abyssal Rift (55-65),
 *                          Shattered Depths (58-68, BOSS: Eternal Warden), Dreaming Spire (62-72,
 *                          BOSS: The Dreamer), Vyraxion's Lair (68-78, BOSS: Vyraxion),
 *                          The Convergence (75-88), Sealed Vault (82-95, BOSS: Architect Memory),
 *                          Infinite Abyss (90-100+). Boss spawn support via isBoss/respawnDelay
 *                          fields. 26 total battle maps.
 *   - v1.0.0 (2026-02-10): Added 5 new high-level battle maps (level 25-50):
 *                          Wraithspine Pass (25-32), Pale Court Outskirts (28-36),
 *                          The Sunken Ruins (32-40), Thornwood Heart (36-45),
 *                          Dragon's Approach (42-50). New map IDs: wraithspine_pass,
 *                          pale_outskirts, sunken_ruins, thornwood_heart, dragons_approach.
 *                          Added bidirectional exits: mountain_approach↔wraithspine_pass,
 *                          boss_chamber↔pale_outskirts, swamp↔sunken_ruins, cave↔thornwood_heart,
 *                          wraithspine_pass↔dragons_approach. Updated worldMapData.layout and
 *                          getSelectableMaps(). 18 total battle maps.
 *   - v0.9.0 (2026-02-09): Mobile hex map optimization — all 13 battle maps resized to
 *                          max 8 cols wide for 375px mobile portrait fit. Added excludedHexes[]
 *                          per map for organic shapes (caves, forests, corridors, ruins).
 *                          Remapped all obstacles[], exits[], specialHexes[] to new grids.
 *                          Added isExcludedHex() and getExcludedHexes() helper functions.
 *                          All 16 exit pairs verified bidirectionally.
 *                          See MOBILE_HEX_MAP_IMPLEMENTATION.md.
 *   - v0.8.1 (2025-01-20): town size from 2x2 to 1x1:
 *   - v0.8.0 (2025-01-20): Phase 3 - Added 4 new maps:
 *                          - sewers: "The Sewers" (1-5) - entry dungeon south of town
 *                          - old_road: "The Old Road" (8-15) - ancient highway
 *                          - mountain_approach: "Mountain Approach" (15-22) - Wraithspine foothills
 *                          - hidden_caves: "Hidden Caves" (18-25) - lost civilization dungeon
 *                          Updated worldMapData.layout with geographic positioning
 *                          Added town exits to Sewers and Drowned Reaches
 *   - v0.7.0 (2025-01-20): Phase 2 - Restructured all battle maps to match WORLD_LORE.md
 *   - v0.6.0 (2025-01-20): Phase 1 - Renamed town to "Eron's Landing" per WORLD_LORE.md
 *   - v0.5.0 (2025-01-17): Added worldMapData.layout for visual world map UI
 *   - v0.4.3 (2025-01-02): Reduced maxNPCs to 3 on all maps for testing/balance
 *   - v0.4.2 (2025-01-01): Added graveyard, cave, and swamp maps with unique NPCs and events
 *   - v0.4.1 (2025-01): Initial maps - forest_edge, deep_forest, goblin_camp, spider_cavern, crypt
 */

export const MapConfig = {
    maps: {
        // === COASTAL CAVES (Level 1-5) ===
        // Sea-carved caverns near Eron's Landing - Entry dungeon
        // Shape: Cavern — narrow entrance/exit, wider chamber in middle
        forest_edge: {
            id: 'forest_edge',
            name: 'Coastal Caves',
            description: 'Sea-carved caverns near Eron\'s Landing, where smugglers once hid their goods. Something lurks in the deeper passages.',
            theme: 'cave',
            difficulty: 'easy',
            
            // Grid dimensions (v0.9.0: was 10×10)
            gridWidth: 8,
            gridHeight: 10,
            
            // Excluded hexes — cavern shape: narrow entrance at top/bottom, wider middle
            excludedHexes: [
                {q:0,r:0}, {q:1,r:0}, {q:6,r:0}, {q:7,r:0},
                {q:0,r:1}, {q:7,r:1},
                {q:0,r:4}, {q:7,r:5},
                {q:0,r:8}, {q:7,r:8},
                {q:0,r:9}, {q:1,r:9}, {q:6,r:9}, {q:7,r:9}
            ],
            
            backgroundImage: null,
            backgroundColor: '#1a2530',
            ambientAudio: 'cave_drip',
            
// Terrain tile assignments — 2MT illustrated hex tiles
            terrainTiles: {
                // Row 0
                '2,0': 'plains_damp_4',
                '3,0': 'plains_damp_4',
                '4,0': 'plains_damp_5',
                '5,0': 'base_rocky',
                // Row 1
                '1,1': 'plains_damp_2',
                '2,1': 'base_rocky',
                '3,1': 'base_rocky',
                '4,1': 'plains_damp_4',
                '5,1': 'plains_damp_5',
                '6,1': 'base_rocky',
                // Row 2
                '0,2': 'plains_damp_1',
                '1,2': 'plains_damp_1',
                '2,2': 'base_rocky',
                '3,2': 'river_1_se',
                '4,2': 'plains_damp_1',
                '5,2': 'plains_damp_1',
                '7,2': 'water_-_ocean_still_water_1',
                // Row 3
                '0,3': 'plains_damp_3',
                '1,3': 'plains_damp_5',
                '2,3': 'plains_damp_4',
                '3,3': 'river_1_s',
                '4,3': 'plains_damp_4',
                '5,3': 'plains_damp_4',
                '6,3': 'mountains_foothills_rocky',
                '7,3': 'mountains_low_rocky',
                // Row 4
                '1,4': 'plains_damp_1',
                '2,4': 'base_rocky',
                '5,4': 'plains_damp_1',
                '6,4': 'plains_damp_3',
                '7,4': 'mountains_foothills_rocky',
                // Row 5
                '0,5': 'plains_damp_4',
                '1,5': 'dirt_path_rocky',
                '2,5': 'dirt_path_4_ne',
                '4,5': 'river_1_se',
                '5,5': 'plains_damp_3',
                '6,5': 'plains_damp_5',
                // Row 6
                '0,6': 'base_rocky',
                '1,6': 'base_rocky',
                '2,6': 'plains_damp_5',
                '3,6': 'plains_damp_5',
                '4,6': 'plains_damp_1',
                '5,6': 'river_1_se',
                '6,6': 'base_rocky',
                '7,6': 'mountains_low_rocky',
                // Row 7
                '0,7': 'plains_damp_3',
                '1,7': 'plains_damp_1',
                '2,7': 'plains_damp_3',
                '3,7': 'base_rocky',
                '6,7': 'plains_damp_2',
                '7,7': 'water_-_ocean_still_water_2',
                // Row 8
                '1,8': 'plains_damp_4',
                '2,8': 'base_rocky',
                '3,8': 'base_rocky',
                '5,8': 'plains_damp_2',
                '6,8': 'base_rocky',
                // Row 9
                '2,9': 'plains_damp_1',
                '3,9': 'base_rocky',
                '4,9': 'plains_damp_4',
                '5,9': 'base_rocky',
            },
            terrainTileDefault: 'base_rocky',
            terrainFilter: 'terrain-filter-cave',
            
            maxPlayers: 4,
            pvpEnabled: false,
            
            levelRange: { min: 1, max: 5 },
            
            npcs: [
                { creatureId: 'giant_scuttle', subtypeId: 'normal', count: 3, levelRange: [1, 3] },
                { creatureId: 'giant_scuttle', subtypeId: 'greater', count: 1, levelRange: [3, 5] },
                { creatureId: 'spider', subtypeId: 'lesser', count: 2, levelRange: [2, 4] },
                { creatureId: 'rat', subtypeId: 'normal', count: 2, levelRange: [1, 2] }
            ],
            maxNPCs: 2,
            respawnDelay: 8000,
            
            obstacles: [
                { q: 3, r: 4 }, { q: 4, r: 4 }, { q: 3, r: 5 },  // Rock formation
                { q: 6, r: 2 },                                     // Stalagmite
                { q: 4, r: 7 }, { q: 5, r: 7 }, { q: 4, r: 8 }    // Tidal pool
            ],
            
            specialHexes: [
                { q: 2, r: 6, type: 'slippery', effect: 'slow', modifier: 0.7 },
                { q: 5, r: 3, type: 'slippery', effect: 'slow', modifier: 0.7 }
            ],
            
            exits: [
                { q: 1, r: 5, targetMap: 'town', targetQ: 11, targetR: 5, label: 'Return to Eron\'s Landing', direction: 'W' },
                { q: 7, r: 4, targetMap: 'deep_forest', targetQ: 0, targetR: 4, label: 'To the Greenward Paths', direction: 'E' }
            ],
            
            ambientEvents: [
                'Waves crash against the cave mouth, misting the air with salt.',
                'A giant scuttle clicks its claws somewhere in the darkness.',
                'You find old crates—smugglers used these caves before the town was founded.',
                'The cave walls bear scratches too regular to be natural. Ancient writing?',
                'Water drips from stalactites, echoing endlessly.',
                'You spot a coin wedged in a crack—not Old World mint. Something older.',
                'Tide pools glow with faint bioluminescence.',
                'The smell of brine and decay mingles in the damp air.'
            ],
            
            entryText: 'You descend into the Coastal Caves. Waves echo from the entrance behind you as darkness swallows the passage ahead. Captain Eron lost his leg to a giant scuttle in these tunnels—stay alert.'
        },
        
        // === ABANDONED FARMSTEAD (Level 5-12) ===
        // Shape: Irregular settlement — collapsed walls, broken perimeter
        graveyard: {
            id: 'graveyard',
            name: 'Abandoned Farmstead',
            description: 'A failed settlement from the early colonization of the Shattered Coast. Whatever killed the settlers left their dead to walk.',
            theme: 'ruins',
            difficulty: 'medium',
            
            // Grid dimensions (v0.9.0: was 11×13)
            gridWidth: 8,
            gridHeight: 11,
            
            excludedHexes: [
                {q:0,r:0}, {q:7,r:0},
                {q:0,r:1}, {q:7,r:1},
                {q:0,r:5}, {q:7,r:5},
                {q:0,r:10}, {q:7,r:10},
                {q:7,r:9}
            ],
            
            backgroundImage: null,
            backgroundColor: '#2a2420',
            ambientAudio: 'ruins_wind',
            
// Terrain tile assignments — 2MT illustrated hex tiles
            terrainTiles: {
                // Row 0
                '1,0': 'plains_lush_1',
                '2,0': 'plains_farmland_1',
                '3,0': 'plains_lush_1',
                '4,0': 'plains_lush_1',
                '5,0': 'plains_lush_2',
                '6,0': 'plains_lush_3',
                // Row 1
                '1,1': 'plains_farmland_3',
                '2,1': 'plains_farmland_3',
                '3,1': 'plains_lush_1',
                '4,1': 'sparse_trees_1',
                '5,1': 'sparse_trees_1',
                '6,1': 'sparse_trees_2',
                // Row 2
                '0,2': 'plains_farmland_2',
                '1,2': 'ruin_lush',
                '5,2': 'plains_farmland_2',
                '7,2': 'ruin_desert',
                // Row 3
                '0,3': 'plains_lush_2',
                '1,3': 'plains_lush_3',
                '2,3': 'urban_-_farmland_lush_3',
                '3,3': 'ruin_desert',
                '4,3': 'plains_farmland_1',
                '5,3': 'urban_-_farmland_lush_2',
                '6,3': 'urban_-_farmland_lush_3',
                '7,3': 'plains_farmland_2',
                // Row 4
                '0,4': 'sparse_trees_1',
                '3,4': { tile: 'dirt_path_n', rot: 180 },
                '4,4': 'plains_farmland_1',
                '7,4': 'plains_lush_2',
                // Row 5
                '1,5': 'plains_lush_2',
                '2,5': 'plains_lush_3',
                '3,5': 'dirt_path_2_n',
                '6,5': 'plains_lush_2',
                // Row 6
                '0,6': 'plains_lush_2',
                '1,6': { tile: 'dirt_path_10_nw', rot: 120 },
                '2,6': { tile: 'dirt_path_4_ne', rot: 180 },
                '3,6': { tile: 'dirt_path_13_n', rot: 180 },
                '4,6': { tile: 'dirt_path_4_n', rot: 240 },
                '5,6': 'dirt_path_4_ne',
                '6,6': 'dirt_path_4_se',
                '7,6': { tile: 'dirt_path_10_s', rot: 120 },
                // Row 7
                '0,7': 'sparse_trees_2',
                '1,7': 'plains_lush_1',
                '2,7': 'plains_lush_3',
                '3,7': 'urban_-_modern_town_abandoned_lush_1',
                '4,7': 'sparse_trees_1',
                '5,7': 'plains_lush_3',
                '6,7': 'plains_farmland_1',
                '7,7': 'plains_lush_3',
                // Row 8
                '0,8': 'plains_farmland_2',
                '1,8': 'plains_lush_2',
                '2,8': 'plains_lush_2',
                '4,8': { tile: 'dirt_path_4_n', rot: 300 },
                '6,8': 'plains_lush_1',
                '7,8': 'plains_farmland_1',
                // Row 9
                '0,9': 'plains_lush_3',
                '1,9': 'plains_lush_2',
                '2,9': 'sparse_trees_1',
                '3,9': 'plains_lush_1',
                '4,9': 'dirt_path_2_n',
                '5,9': 'sparse_trees_1',
                '6,9': 'plains_farmland_2',
                // Row 10
                '1,10': 'sparse_trees_2',
                '2,10': 'plains_farmland_1',
                '3,10': 'plains_farmland_2',
                '4,10': 'dirt_path_10_n',
                '5,10': 'sparse_trees_1',
                '6,10': 'plains_farmland_1',
            },
            terrainTileDefault: 'base_lush',
            
            maxPlayers: 4,
            pvpEnabled: false,
            
            levelRange: { min: 5, max: 12 },
            
            npcs: [
                { creatureId: 'ghoul', subtypeId: 'normal', count: 2, levelRange: [5, 8] },
                { creatureId: 'ghoul', subtypeId: 'greater', count: 1, levelRange: [8, 10] },
                { creatureId: 'zombie', subtypeId: 'normal', count: 3, levelRange: [5, 8] },
                { creatureId: 'skeleton', subtypeId: 'normal', count: 2, levelRange: [6, 9] },
                { creatureId: 'wolf', subtypeId: 'normal', count: 2, levelRange: [5, 7] }
            ],
            maxNPCs: 3,
            respawnDelay: 12000,
            
            obstacles: [
                { q: 2, r: 2 }, { q: 3, r: 2 }, { q: 4, r: 2 },  // Collapsed farmhouse
                { q: 6, r: 2 },                                     // Barn ruins
                { q: 1, r: 4 }, { q: 2, r: 4 },                    // Stone fence
                { q: 5, r: 4 }, { q: 6, r: 4 },                    // Stone fence
                { q: 4, r: 5 }, { q: 5, r: 5 },                    // Old well
                { q: 3, r: 8 }, { q: 5, r: 8 }                     // Overgrown cart, debris
            ],
            
            specialHexes: [
                { q: 3, r: 5, type: 'contaminated', effect: 'damage', modifier: 3 },
                { q: 6, r: 5, type: 'contaminated', effect: 'damage', modifier: 3 },
                { q: 4, r: 6, type: 'contaminated', effect: 'damage', modifier: 3 },
                { q: 5, r: 6, type: 'contaminated', effect: 'damage', modifier: 3 }
            ],
            
            exits: [
                { q: 4, r: 10, targetMap: 'deep_forest', targetQ: 4, targetR: 0, label: 'To Greenward Paths', direction: 'S' },
                { q: 1, r: 6, targetMap: 'old_road', targetQ: 5, targetR: 1, label: 'To the Old Road', direction: 'W' },
                { q: 7, r: 6, targetMap: 'crypt', targetQ: 1, targetR: 6, label: 'To Barrow Fields', direction: 'E' }
            ],
            
            ambientEvents: [
                'The wind whistles through empty window frames.',
                'You find a child\'s toy, half-buried in the dirt. No children survived.',
                'The old well reeks of something foul. Don\'t drink from it.',
                'Claw marks score the doorframe of a collapsed cottage.',
                'A ghoul\'s shriek echoes from the ruins ahead.',
                'Bones are scattered near what was once a livestock pen.',
                'Someone tried to barricade the barn doors. It didn\'t help.',
                'You find a journal page: "The sickness came from the well. God help us."'
            ],
            
            entryText: 'You enter the Abandoned Farmstead. Thirty years ago, settlers tried to tame this land. Something in the water—or beneath it—had other plans. Their bones still walk these overgrown fields.'
        },
        
        // === DEEP THORNWOOD (Level 12-20) ===
        // Shape: Dense forest — organic perimeter, thick canopy edges
        cave: {
            id: 'cave',
            name: 'Deep Thornwood',
            description: 'The heart of the hostile Thornwood forest. Near-darkness reigns beneath massive, ancient trees. Grakthar Skullcrusher is unifying the orc tribes here.',
            theme: 'forest',
            difficulty: 'hard',
            
            // Grid dimensions (v0.9.0: was 12×14)
            gridWidth: 8,
            gridHeight: 12,
            
            excludedHexes: [
                {q:0,r:0}, {q:1,r:0}, {q:7,r:0},
                {q:0,r:1}, {q:7,r:1},
                {q:0,r:6}, {q:7,r:6},
                {q:0,r:10}, {q:7,r:10},
                {q:0,r:11}, {q:7,r:11}
            ],
            
            backgroundImage: null,
            backgroundColor: '#0a1a0a',
            ambientAudio: 'dark_forest',
            
// Terrain tile assignments — 2MT illustrated hex tiles
            terrainTiles: {
                // Row 0
                '2,0': 'sparse_trees_2',
                '3,0': 'sparse_trees_2',
                '4,0': 'dirt_path_1_n',
                '5,0': 'plains_lush_1',
                '6,0': 'sparse_trees_1',
                // Row 1
                '1,1': 'sparse_trees_1',
                '2,1': 'plains_lush_1',
                '3,1': 'sparse_trees_1',
                '4,1': 'dirt_path_1_n',
                '5,1': 'sparse_trees_1',
                '6,1': 'sparse_trees_2',
                // Row 2
                '0,2': 'sparse_trees_1',
                '3,2': 'river_1_se',
                '4,2': 'sparse_trees_1',
                '5,2': 'sparse_trees_2',
                '7,2': 'sparse_trees_2',
                // Row 3
                '0,3': 'sparse_trees_1',
                '1,3': 'sparse_trees_2',
                '2,3': 'sparse_trees_1',
                '3,3': 'river_6_s',
                '4,3': 'sparse_trees_2',
                '5,3': 'sparse_trees_1',
                '6,3': 'plains_lush_1',
                '7,3': 'plains_lush_2',
                // Row 4
                '0,4': 'sparse_trees_2',
                '1,4': 'sparse_trees_2',
                '2,4': 'sparse_trees_1',
                '5,4': 'sparse_trees_1',
                '6,4': 'sparse_trees_1',
                '7,4': 'sparse_trees_2',
                // Row 5
                '0,5': 'plains_lush_3',
                '2,5': 'sparse_trees_2',
                '5,5': 'sparse_trees_2',
                '7,5': 'dirt_path_8_w',
                // Row 6
                '1,6': 'dirt_path_5_e',
                '2,6': 'dirt_path_4_ne',
                '3,6': 'river_1_s',
                '4,6': 'plains_lush_3',
                '5,6': 'sparse_trees_2',
                '6,6': 'plains_lush_1',
                // Row 7
                '0,7': 'sparse_trees_1',
                '1,7': 'plains_lush_1',
                '2,7': 'plains_lush_3',
                '5,7': 'sparse_trees_2',
                '6,7': 'plains_lush_2',
                '7,7': 'sparse_trees_2',
                // Row 8
                '0,8': 'plains_lush_1',
                '1,8': 'plains_lush_2',
                '2,8': 'sparse_trees_2',
                '3,8': 'plains_lush_1',
                '4,8': 'sparse_trees_1',
                '5,8': 'sparse_trees_2',
                '6,8': 'plains_lush_1',
                '7,8': 'plains_lush_2',
                // Row 9
                '0,9': 'sparse_trees_2',
                '2,9': 'sparse_trees_1',
                '3,9': 'plains_lush_1',
                '4,9': 'sparse_trees_2',
                '5,9': 'sparse_trees_1',
                '7,9': 'sparse_trees_1',
                // Row 10
                '1,10': 'plains_lush_2',
                '2,10': 'plains_lush_3',
                '3,10': 'sparse_trees_1',
                '4,10': 'dirt_path_1_s',
                '5,10': 'sparse_trees_2',
                '6,10': 'plains_lush_1',
                // Row 11
                '1,11': 'sparse_trees_2',
                '2,11': 'sparse_trees_2',
                '3,11': 'sparse_trees_1',
                '4,11': 'dirt_path_1_s',
                '5,11': 'sparse_trees_2',
                '6,11': 'plains_lush_1',
            },
            terrainTileDefault: 'base_lush',
            
            maxPlayers: 4,
            pvpEnabled: false,
            
            levelRange: { min: 12, max: 20 },
            
            npcs: [
                { creatureId: 'orc', subtypeId: 'greater', count: 3, levelRange: [12, 15] },
                { creatureId: 'orc', subtypeId: 'chief', count: 1, levelRange: [16, 18] },
                { creatureId: 'forest_giant', subtypeId: 'normal', count: 1, levelRange: [15, 18] },
                { creatureId: 'forest_giant', subtypeId: 'greater', count: 1, levelRange: [18, 20] },
                { creatureId: 'dire_wolf', subtypeId: 'greater', count: 2, levelRange: [13, 16] },
                { creatureId: 'hobgoblin', subtypeId: 'greater', count: 2, levelRange: [12, 15] }
            ],
            maxNPCs: 3,
            respawnDelay: 15000,
            
            obstacles: [
                { q: 1, r: 2 }, { q: 2, r: 2 }, { q: 6, r: 2 },
                { q: 1, r: 5 }, { q: 6, r: 5 },
                { q: 3, r: 7 }, { q: 4, r: 7 },
                { q: 3, r: 4 }, { q: 4, r: 4 }, { q: 3, r: 5 }, { q: 4, r: 5 },
                { q: 1, r: 9 }, { q: 6, r: 9 }
            ],
            
            specialHexes: [
                { q: 2, r: 3, type: 'undergrowth', effect: 'slow', modifier: 0.6 },
                { q: 5, r: 3, type: 'undergrowth', effect: 'slow', modifier: 0.6 },
                { q: 2, r: 8, type: 'undergrowth', effect: 'slow', modifier: 0.6 },
                { q: 5, r: 8, type: 'undergrowth', effect: 'slow', modifier: 0.6 }
            ],
            
            exits: [
                { q: 1, r: 6, targetMap: 'goblin_camp', targetQ: 7, targetR: 4, label: 'To Thornwood Edge', direction: 'W' },
                { q: 7, r: 5, targetMap: 'spider_cavern', targetQ: 1, targetR: 5, label: 'To Overgrown Shrine', direction: 'E' },
                { q: 4, r: 11, targetMap: 'boss_chamber', targetQ: 4, targetR: 1, label: 'To Ashen Barrens', direction: 'S' },
                { q: 4, r: 0, targetMap: 'thornwood_heart', targetQ: 4, targetR: 10, label: 'To Thornwood Heart', direction: 'N' }
            ],
            
            ambientEvents: [
                'The canopy is so thick here that daylight never reaches the forest floor.',
                'War drums pound in the darkness—the orcs are gathering.',
                'A forest giant\'s footsteps shake the ground somewhere nearby.',
                'Orc war cries echo through the trees. They know you\'re here.',
                'A dire wolf\'s eyes gleam in the undergrowth—there and gone.',
                'Twisted thorns grow in patterns that seem almost deliberate.',
                'You find orc war trophies nailed to a trunk—skulls.',
                'The Thornwood wasn\'t always this dark. Something sickened it.'
            ],
            
            entryText: 'You enter the Deep Thornwood. Massive trees blot out the sky, their roots tangled with thorns thick as your arm. War drums pulse through the darkness—Grakthar\'s orcs know you\'re here.'
        },
        
        // === THE DROWNED REACHES (Level 18-25) ===
        // Shape: Very irregular — water intrusions eating into edges
        swamp: {
            id: 'swamp',
            name: 'The Drowned Reaches',
            description: 'Coastal swamps and flooded lowlands where submerged ruins are visible at low tide. Troll and lizardfolk territory.',
            theme: 'swamp',
            difficulty: 'hard',
            
            // Grid dimensions (v0.9.0: was 13×13)
            gridWidth: 8,
            gridHeight: 11,
            
            excludedHexes: [
                {q:0,r:0}, {q:1,r:0}, {q:7,r:0},
                {q:0,r:1}, {q:6,r:1}, {q:7,r:1},
                {q:0,r:3},
                {q:0,r:5}, {q:7,r:5},
                {q:7,r:7},
                {q:0,r:9}, {q:7,r:9},
                {q:0,r:10}, {q:7,r:10}
            ],
            
            backgroundImage: null,
            backgroundColor: '#1a2e1a',
            ambientAudio: 'swamp_ambient',
            
// Terrain tile assignments — 2MT illustrated hex tiles
            terrainTiles: {
                // Row 0
                '2,0': 'plains_damp_1',
                '3,0': 'plains_damp_5',
                '4,0': 'plains_damp_2',
                '5,0': 'plains_damp_5',
                '6,0': 'plains_damp_5',
                // Row 1
                '1,1': 'wetlands_3',
                '2,1': 'plains_damp_3',
                '3,1': 'plains_damp_3',
                '4,1': 'wetlands_5',
                '5,1': 'wetlands_4',
                // Row 2
                '0,2': 'plains_damp_3',
                '1,2': 'plains_damp_3',
                '3,2': 'wetlands_4',
                '4,2': 'wetlands_4',
                '5,2': 'wetlands_5',
                '7,2': 'wetlands_5',
                // Row 3
                '1,3': 'water_-_swamp_still_water_1',
                '2,3': 'water_-_swamp_still_water_2',
                '3,3': 'plains_damp_4',
                '4,3': 'wetlands_2',
                '5,3': 'plains_damp_4',
                '6,3': 'wetlands_4',
                '7,3': 'wetlands_1',
                // Row 4
                '0,4': 'plains_damp_1',
                '1,4': 'wetlands_3',
                '2,4': 'plains_damp_2',
                '6,4': 'dirt_path_4_se',
                '7,4': 'dirt_path_rocky',
                // Row 5
                '2,5': 'plains_damp_4',
                '4,5': 'plains_damp_1',
                // Row 6
                '0,6': 'plains_damp_5',
                '1,6': 'plains_damp_4',
                '2,6': 'wetlands_2',
                '6,6': 'wetlands_1',
                '7,6': 'plains_damp_2',
                // Row 7
                '0,7': 'wetlands_5',
                '1,7': 'plains_damp_2',
                '2,7': 'plains_damp_3',
                '3,7': 'wetlands_1',
                '4,7': 'wetlands_2',
                '5,7': 'wetlands_1',
                '6,7': 'plains_damp_4',
                // Row 8
                '0,8': 'plains_damp_5',
                '1,8': 'water_-_swamp_still_water_3',
                '2,8': 'water_-_swamp_soft_waves_1',
                '4,8': 'plains_damp_4',
                '6,8': 'water_-_swamp_still_water_4',
                '7,8': 'wetlands_1',
                // Row 9
                '1,9': 'plains_damp_3',
                '2,9': 'plains_damp_5',
                '3,9': 'wetlands_1',
                '4,9': 'dirt_path_1_n',
                '5,9': 'plains_damp_4',
                '6,9': 'plains_damp_5',
                // Row 10
                '1,10': 'wetlands_3',
                '2,10': 'wetlands_2',
                '3,10': 'plains_damp_3',
                '4,10': 'dirt_path_1_s',
                '5,10': 'plains_damp_5',
                '6,10': 'wetlands_4',
            },
            terrainTileDefault: 'base_lush',
            
            maxPlayers: 4,
            pvpEnabled: false,
            
            levelRange: { min: 18, max: 25 },
            
            npcs: [
                { creatureId: 'troll', subtypeId: 'normal', count: 2, levelRange: [18, 21] },
                { creatureId: 'troll', subtypeId: 'greater', count: 1, levelRange: [22, 25] },
                { creatureId: 'lizardman', subtypeId: 'normal', count: 2, levelRange: [18, 21] },
                { creatureId: 'lizardman', subtypeId: 'greater', count: 1, levelRange: [21, 24] },
                { creatureId: 'bog_beast', subtypeId: 'normal', count: 1, levelRange: [20, 23] },
                { creatureId: 'wisp', subtypeId: 'normal', count: 2, levelRange: [19, 22] }
            ],
            maxNPCs: 3,
            respawnDelay: 18000,
            
            obstacles: [
                { q: 2, r: 2 }, { q: 6, r: 2 },
                { q: 1, r: 5 }, { q: 6, r: 5 },
                { q: 3, r: 8 }, { q: 5, r: 8 },
                { q: 3, r: 4 }, { q: 4, r: 4 }, { q: 5, r: 4 },
                { q: 3, r: 5 }, { q: 5, r: 5 },
                { q: 3, r: 6 }, { q: 4, r: 6 }, { q: 5, r: 6 }
            ],
            
            specialHexes: [
                { q: 2, r: 3, type: 'bog', effect: 'slow', modifier: 0.4 },
                { q: 3, r: 3, type: 'bog', effect: 'slow', modifier: 0.4 },
                { q: 5, r: 3, type: 'bog', effect: 'slow', modifier: 0.4 },
                { q: 6, r: 3, type: 'bog', effect: 'slow', modifier: 0.4 },
                { q: 2, r: 7, type: 'bog', effect: 'slow', modifier: 0.4 },
                { q: 6, r: 7, type: 'bog', effect: 'slow', modifier: 0.4 },
                { q: 3, r: 7, type: 'poison_gas', effect: 'damage', modifier: 5 },
                { q: 5, r: 7, type: 'poison_gas', effect: 'damage', modifier: 5 }
            ],
            
            exits: [
                { q: 7, r: 4, targetMap: 'town', targetQ: 1, targetR: 5, label: 'Return to Eron\'s Landing', direction: 'E' },
                { q: 4, r: 10, targetMap: 'sunken_ruins', targetQ: 4, targetR: 0, label: 'To Sunken Ruins', direction: 'S' }
            ],
            
            ambientEvents: [
                'Bubbles rise from the murky water—something stirs below.',
                'At low tide, you glimpse stone walls beneath the surface. Lost civilization ruins.',
                'A troll\'s roar echoes across the marsh. They\'re territorial.',
                'Will-o-wisps dance in the mist, luring travelers to their doom.',
                'Lizardmen watch from the reeds. They don\'t attack—yet.',
                'The stench of rotting vegetation is overwhelming.',
                'You find a carved stone rising from the water. Ancient writing.',
                'Something massive moves beneath the flooded street below.',
                'Insects buzz around your head. The swamp doesn\'t want you here.'
            ],
            
            entryText: 'You wade into the Drowned Reaches. Fetid water reaches your knees as you navigate between the remains of a submerged civilization. Trolls and lizardfolk rule here—and they don\'t welcome outsiders.'
        },
        
        // === THE GREENWARD PATHS (Level 3-8) ===
        // Shape: Forest clearing — organic edges, soft contours
        deep_forest: {
            id: 'deep_forest',
            name: 'The Greenward Paths',
            description: 'Forest trails through the coastal Greenward. Ancient road markers hint at buried ruins beneath the undergrowth.',
            theme: 'forest',
            difficulty: 'easy',
            
            // Grid dimensions (v0.9.0: was 12×14)
            gridWidth: 8,
            gridHeight: 11,
            
            excludedHexes: [
                {q:0,r:0}, {q:7,r:0},
                {q:0,r:1}, {q:7,r:1},
                {q:0,r:5},
                {q:7,r:6},
                {q:0,r:10}, {q:1,r:10},
                {q:7,r:10}
            ],
            
            backgroundImage: null,
            backgroundColor: '#1a3d1a',
            ambientAudio: 'forest_ambient',
            
            // Terrain tile assignments (v1.3.0) — 2MT illustrated hex tiles
            // Key: "q,r" coordinate string → tile key from terrainAssets.js
            // Hexes without an entry fall back to terrainTileDefault
            terrainTiles: {
                // Row 0
                '1,0': 'sparse_trees_2',
                '2,0': 'plains_lush_1',
                '3,0': 'sparse_trees_2',
                '4,0': 'dirt_path_1_n',
                '5,0': 'sparse_trees_1',
                '6,0': 'plains_lush_4',
                // Row 1
                '1,1': 'plains_lush_2',
                '2,1': 'sparse_trees_2',
                '3,1': 'plains_lush_1',
                '4,1': 'dirt_path_1_n',
                '5,1': 'plains_lush_1',
                '6,1': 'plains_lush_4',
                // Row 2
                '0,2': 'plains_lush_3',
                '1,2': 'river_1_se',
                '2,2': 'river_1_se',
                '3,2': 'plains_lush_1',
                '4,2': 'plains_lush_5',
                '5,2': 'sparse_trees_1',
                '7,2': 'sparse_trees_2',
                // Row 3
                '0,3': 'plains_lush_4',
                '1,3': 'plains_lush_4',
                '4,3': 'sparse_trees_2',
                '5,3': 'sparse_trees_1',
                '6,3': 'plains_lush_5',
                '7,3': 'plains_lush_3',
                // Row 4
                '0,4': 'dirt_path_5_e',
                '1,4': 'dirt_path_4_ne',
                '3,4': 'river_6_se',
                '4,4': 'plains_lush_2',
                '5,4': 'plains_lush_5',
                '6,4': 'dirt_path_4_se',
                '7,4': 'sparse_trees_2',
                // Row 5
                '1,5': 'plains_lush_5',
                '2,5': 'river_1_se',
                '3,5': 'plains_lush_5',
                '4,5': 'plains_lush_4',
                '7,5': 'dirt_path_8_w',
                // Row 6
                '0,6': 'plains_lush_4',
                '1,6': 'sparse_trees_2',
                '2,6': 'plains_lush_1',
                '3,6': 'river_1_se',
                '4,6': 'plains_lush_1',
                // Row 7
                '0,7': 'plains_lush_1',
                '2,7': 'plains_lush_1',
                '3,7': 'river_6_s',
                '4,7': 'plains_lush_2',
                '5,7': 'plains_lush_3',
                '6,7': 'sparse_trees_1',
                '7,7': 'sparse_trees_1',
                // Row 8
                '0,8': 'plains_lush_1',
                '1,8': 'plains_lush_3',
                '2,8': 'plains_lush_4',
                '5,8': 'plains_lush_5',
                '6,8': 'plains_lush_1',
                '7,8': 'plains_lush_3',
                // Row 9
                '0,9': 'plains_lush_5',
                '1,9': 'sparse_trees_1',
                '2,9': 'sparse_trees_2',
                '3,9': 'sparse_trees_1',
                '4,9': 'dirt_path_1_s',
                '5,9': 'plains_lush_1',
                '6,9': 'plains_lush_2',
                '7,9': 'plains_lush_5',
                // Row 10
                '2,10': 'plains_lush_1',
                '3,10': 'plains_lush_5',
                '4,10': 'dirt_path_1_s',
                '5,10': 'sparse_trees_2',
                '6,10': 'plains_lush_3',
            },
            terrainTileDefault: 'base_lush',
            
            maxPlayers: 4,
            pvpEnabled: false,
            
            levelRange: { min: 3, max: 8 },
            
            npcs: [
                { creatureId: 'wolf', subtypeId: 'normal', count: 3, levelRange: [3, 5] },
                { creatureId: 'wolf', subtypeId: 'greater', count: 1, levelRange: [5, 7] },
                { creatureId: 'boar', subtypeId: 'normal', count: 2, levelRange: [3, 5] },
                { creatureId: 'bandit', subtypeId: 'lesser', count: 2, levelRange: [4, 6] },
                { creatureId: 'goblin', subtypeId: 'normal', count: 2, levelRange: [3, 5] }
            ],
            maxNPCs: 3,
            respawnDelay: 10000,
            
            obstacles: [
                { q: 2, r: 3 }, { q: 3, r: 3 }, { q: 2, r: 4 },
                { q: 5, r: 5 }, { q: 6, r: 5 }, { q: 5, r: 6 }, { q: 6, r: 6 },
                { q: 3, r: 8 }, { q: 4, r: 8 },
                { q: 1, r: 7 }, { q: 6, r: 2 }
            ],
            
            exits: [
                { q: 0, r: 4, targetMap: 'forest_edge', targetQ: 7, targetR: 4, label: 'To Coastal Caves', direction: 'W' },
                { q: 7, r: 5, targetMap: 'goblin_camp', targetQ: 0, targetR: 5, label: 'To Thornwood Edge', direction: 'E' },
                { q: 4, r: 10, targetMap: 'spider_cavern', targetQ: 4, targetR: 1, label: 'To Overgrown Shrine', direction: 'S' },
                { q: 4, r: 0, targetMap: 'graveyard', targetQ: 4, targetR: 10, label: 'To Abandoned Farmstead', direction: 'N' }
            ],
            
            ambientEvents: [
                'The Greenward paths wind between ancient oaks older than the Shattering.',
                'You spot a weathered mile marker—the writing is in no language you know.',
                'Wolf howls echo through the trees. The pack is hunting.',
                'A wild boar crashes through the undergrowth nearby.',
                'Sunlight filters through the canopy in golden shafts.',
                'You find an old campsite. Bandits, from the look of it.',
                'The forest grows quiet. Something watches from the shadows.',
                'Ancient road stones peek through the soil—this was once a highway.'
            ],
            
            entryText: 'You follow the Greenward Paths into the coastal forest. Ancient oaks tower overhead, their roots gripping stones that were old when the Sunlit Empire fell. The trails are safe enough by day—but night belongs to the wolves.'
        },
        
        // === THORNWOOD EDGE (Level 6-12) ===
        // Shape: Forest edge — thorn walls, encroaching treeline
        goblin_camp: {
            id: 'goblin_camp',
            name: 'Thornwood Edge',
            description: 'The border between the safe Greenward and the hostile Thornwood. Orc war drums echo from deeper within.',
            theme: 'forest',
            difficulty: 'medium',
            
            // Grid dimensions (v0.9.0: was 10×10)
            gridWidth: 8,
            gridHeight: 10,
            
            excludedHexes: [
                {q:0,r:0}, {q:1,r:0}, {q:7,r:0},
                {q:0,r:1}, {q:7,r:1},
                {q:7,r:5},
                {q:0,r:8}, {q:7,r:8},
                {q:0,r:9}, {q:7,r:9}
            ],
            
            backgroundImage: null,
            backgroundColor: '#1a2a1a',
            ambientAudio: 'hostile_forest',
            
// Terrain tile assignments — 2MT illustrated hex tiles
            terrainTiles: {
                // Row 0
                '2,0': 'sparse_trees_1',
                '3,0': 'plains_lush_1',
                '4,0': 'sparse_trees_1',
                '5,0': 'plains_lush_3',
                '6,0': 'plains_lush_4',
                // Row 1
                '1,1': 'plains_lush_5',
                '2,1': 'plains_lush_3',
                '3,1': 'plains_lush_1',
                '4,1': 'dirt_path_1_n',
                '5,1': 'plains_lush_3',
                '6,1': 'plains_lush_1',
                // Row 2
                '0,2': 'plains_lush_3',
                '1,2': 'plains_lush_3',
                '2,2': 'plains_lush_4',
                '3,2': 'sparse_trees_1',
                '4,2': 'dirt_path_4_s',
                '5,2': 'plains_lush_4',
                '6,2': 'plains_lush_3',
                '7,2': 'sparse_trees_1',
                // Row 3
                '0,3': 'sparse_trees_1',
                '1,3': 'river_1_se',
                '2,3': 'river_4_se',
                '6,3': 'dirt_path_4_se',
                '7,3': 'sparse_trees_2',
                // Row 4
                '0,4': 'sparse_trees_2',
                '1,4': 'plains_lush_1',
                '2,4': 'plains_lush_2',
                '3,4': 'river_1_se',
                '4,4': 'plains_lush_3',
                '5,4': 'sparse_trees_2',
                '7,4': 'dirt_path_8_w',
                // Row 5
                '0,5': 'dirt_path_5_e',
                '1,5': 'dirt_path_4_ne',
                '3,5': 'plains_lush_2',
                '4,5': 'sparse_trees_2',
                '5,5': 'sparse_trees_2',
                '6,5': 'plains_lush_4',
                // Row 6
                '0,6': 'plains_lush_2',
                '1,6': 'plains_lush_1',
                '2,6': 'plains_lush_1',
                '3,6': 'plains_lush_5',
                '4,6': 'plains_lush_2',
                '5,6': 'sparse_trees_2',
                '6,6': 'sparse_trees_2',
                '7,6': 'plains_lush_3',
                // Row 7
                '0,7': 'plains_lush_4',
                '3,7': 'sparse_trees_1',
                '4,7': 'dirt_path_1_n',
                '7,7': 'plains_lush_2',
                // Row 8
                '1,8': 'plains_lush_5',
                '2,8': 'sparse_trees_2',
                '3,8': 'plains_lush_3',
                '4,8': 'dirt_path_1_s',
                '5,8': 'plains_lush_5',
                '6,8': 'plains_lush_4',
                // Row 9
                '1,9': 'plains_lush_2',
                '2,9': 'plains_lush_3',
                '3,9': 'plains_lush_1',
                '4,9': 'sparse_trees_1',
                '5,9': 'plains_lush_5',
                '6,9': 'sparse_trees_1',
            },
            terrainTileDefault: 'base_lush',
            
            maxPlayers: 4,
            pvpEnabled: false,
            
            levelRange: { min: 6, max: 12 },
            
            npcs: [
                { creatureId: 'orc', subtypeId: 'normal', count: 2, levelRange: [7, 10] },
                { creatureId: 'orc', subtypeId: 'greater', count: 1, levelRange: [10, 12] },
                { creatureId: 'hobgoblin', subtypeId: 'normal', count: 2, levelRange: [6, 9] },
                { creatureId: 'dire_wolf', subtypeId: 'normal', count: 2, levelRange: [7, 10] },
                { creatureId: 'goblin', subtypeId: 'greater', count: 2, levelRange: [6, 8] }
            ],
            maxNPCs: 3,
            respawnDelay: 12000,
            
            obstacles: [
                { q: 3, r: 3 }, { q: 4, r: 3 }, { q: 5, r: 3 },
                { q: 2, r: 5 }, { q: 6, r: 4 },
                { q: 1, r: 7 }, { q: 2, r: 7 },
                { q: 5, r: 7 }, { q: 6, r: 7 }
            ],
            
            specialHexes: [
                { q: 3, r: 4, type: 'thorns', effect: 'damage', modifier: 2 },
                { q: 5, r: 4, type: 'thorns', effect: 'damage', modifier: 2 }
            ],
            
            exits: [
                { q: 0, r: 5, targetMap: 'deep_forest', targetQ: 7, targetR: 5, label: 'To Greenward Paths', direction: 'W' },
                { q: 7, r: 4, targetMap: 'cave', targetQ: 1, targetR: 6, label: 'To Deep Thornwood', direction: 'E' },
                { q: 4, r: 1, targetMap: 'spider_cavern', targetQ: 4, targetR: 8, label: 'To Overgrown Shrine', direction: 'N' },
                { q: 4, r: 8, targetMap: 'crypt', targetQ: 4, targetR: 1, label: 'To Barrow Fields', direction: 'S' }
            ],
            
            ambientEvents: [
                'Orc war drums echo from deeper in the Thornwood.',
                'The thorns here grow thick enough to stop a cavalry charge.',
                'You find orc totems marking territory. They\'re organized now.',
                'A dire wolf howl pierces the air—the pack is hunting.',
                'Hobgoblin tracks in the mud. They\'re patrolling.',
                'Someone is unifying the orc tribes. Grakthar Skullcrusher, they say.',
                'The Thornwood wasn\'t always this hostile. Something changed.',
                'You hear crude orc-speech ahead. At least a dozen voices.'
            ],
            
            entryText: 'You reach the Thornwood Edge. Beyond this point, the forest belongs to the orcs. War drums thunder in the distance—the tribes are gathering. Grakthar Skullcrusher is uniting them, and he welcomes no outsiders.'
        },
        
        // === OVERGROWN SHRINE (Level 8-14) ===
        // Shape: Partially regular ruins with broken wall sections
        spider_cavern: {
            id: 'spider_cavern',
            name: 'Overgrown Shrine',
            description: 'An ancient structure from the lost civilization, now claimed by nature. The shrine still functions—but for what god?',
            theme: 'ruins',
            difficulty: 'medium',
            
            // Grid dimensions (v0.9.0: was 12×12)
            gridWidth: 8,
            gridHeight: 10,
            
            excludedHexes: [
                {q:0,r:0}, {q:7,r:0},
                {q:0,r:1}, {q:7,r:1},
                {q:0,r:5}, {q:7,r:5},
                {q:0,r:9}, {q:7,r:9}
            ],
            
            backgroundImage: null,
            backgroundColor: '#1a2a20',
            ambientAudio: 'ruins_nature',
            
// Terrain tile assignments — 2MT illustrated hex tiles
            terrainTiles: {
                // Row 0
                '1,0': 'plains_damp_1',
                '2,0': 'plains_lush_1',
                '3,0': 'plains_damp_1',
                '4,0': 'plains_lush_3',
                '5,0': 'sparse_trees_2',
                '6,0': 'plains_damp_1',
                // Row 1
                '1,1': 'plains_lush_1',
                '2,1': 'plains_lush_3',
                '3,1': 'plains_lush_3',
                '4,1': 'dirt_path_1_n',
                '5,1': 'plains_lush_3',
                '6,1': 'plains_lush_3',
                // Row 2
                '0,2': 'sparse_trees_2',
                '3,2': 'sparse_trees_2',
                '4,2': 'sparse_trees_1',
                '7,2': 'plains_damp_2',
                // Row 3
                '0,3': 'plains_damp_2',
                '1,3': 'sparse_trees_2',
                '2,3': 'sparse_trees_2',
                '3,3': 'plains_damp_1',
                '4,3': 'sparse_trees_2',
                '5,3': 'sparse_trees_1',
                '6,3': 'plains_lush_2',
                '7,3': 'plains_lush_1',
                // Row 4
                '0,4': 'plains_lush_3',
                '2,4': 'plains_damp_1',
                '5,4': 'sparse_trees_1',
                '7,4': 'plains_damp_1',
                // Row 5
                '1,5': 'dirt_path_5_e',
                '2,5': 'dirt_path_4_ne',
                '5,5': 'plains_lush_3',
                '6,5': 'plains_lush_3',
                // Row 6
                '0,6': 'plains_lush_2',
                '1,6': 'plains_damp_1',
                '2,6': 'ruin_lush',
                '3,6': 'urban_-_monastery_lush',
                '4,6': 'plains_damp_2',
                '5,6': 'plains_damp_2',
                '6,6': 'plains_damp_2',
                '7,6': 'plains_damp_2',
                // Row 7
                '0,7': 'sparse_trees_2',
                '2,7': 'plains_lush_1',
                '4,7': 'dirt_path_1_n',
                '7,7': 'plains_lush_2',
                // Row 8
                '0,8': 'plains_lush_2',
                '1,8': 'plains_damp_1',
                '2,8': 'plains_lush_2',
                '3,8': 'plains_lush_2',
                '4,8': 'dirt_path_1_s',
                '5,8': 'plains_lush_1',
                '6,8': 'plains_damp_2',
                '7,8': 'sparse_trees_1',
                // Row 9
                '1,9': 'plains_lush_1',
                '2,9': 'plains_lush_3',
                '3,9': 'plains_damp_1',
                '4,9': 'plains_lush_1',
                '5,9': 'sparse_trees_2',
                '6,9': 'plains_lush_3',
            },
            terrainTileDefault: 'base_lush',
            
            maxPlayers: 4,
            pvpEnabled: false,
            
            levelRange: { min: 8, max: 14 },
            
            npcs: [
                { creatureId: 'animated_plant', subtypeId: 'normal', count: 3, levelRange: [8, 11] },
                { creatureId: 'animated_plant', subtypeId: 'greater', count: 1, levelRange: [11, 14] },
                { creatureId: 'elemental', subtypeId: 'lesser', count: 2, levelRange: [9, 12] },
                { creatureId: 'cultist', subtypeId: 'normal', count: 2, levelRange: [8, 11] },
                { creatureId: 'spider', subtypeId: 'greater', count: 2, levelRange: [9, 12] }
            ],
            maxNPCs: 3,
            respawnDelay: 15000,
            
            obstacles: [
                { q: 1, r: 2 }, { q: 2, r: 2 }, { q: 5, r: 2 }, { q: 6, r: 2 },
                { q: 1, r: 4 }, { q: 6, r: 4 },
                { q: 3, r: 4 }, { q: 4, r: 4 }, { q: 3, r: 5 }, { q: 4, r: 5 },
                { q: 1, r: 7 }, { q: 6, r: 7 },
                { q: 3, r: 7 }, { q: 5, r: 7 }
            ],
            
            specialHexes: [
                { q: 2, r: 4, type: 'magical_residue', effect: 'heal', modifier: 3 },
                { q: 5, r: 4, type: 'magical_residue', effect: 'heal', modifier: 3 },
                { q: 2, r: 3, type: 'entangle', effect: 'slow', modifier: 0.4 },
                { q: 5, r: 3, type: 'entangle', effect: 'slow', modifier: 0.4 },
                { q: 2, r: 6, type: 'entangle', effect: 'slow', modifier: 0.4 },
                { q: 5, r: 6, type: 'entangle', effect: 'slow', modifier: 0.4 }
            ],
            
            exits: [
                { q: 4, r: 8, targetMap: 'goblin_camp', targetQ: 4, targetR: 1, label: 'To Thornwood Edge', direction: 'S' },
                { q: 1, r: 5, targetMap: 'cave', targetQ: 7, targetR: 5, label: 'To Deep Thornwood', direction: 'W' },
                { q: 4, r: 1, targetMap: 'deep_forest', targetQ: 4, targetR: 10, label: 'To Greenward Paths', direction: 'N' }
            ],
            
            ambientEvents: [
                'Ancient stones hum with residual magical energy.',
                'Vines twist and reach toward you as you pass.',
                'You find cult symbols scratched into the altar—fresh marks.',
                'The shrine\'s purpose is unclear, but power lingers here.',
                'Spiders have woven webs between the columns.',
                'A thornlash vine recoils as you step too close.',
                'Inscriptions on the walls are in no known language.',
                'The air shimmers near the central altar. Something watches.'
            ],
            
            entryText: 'You enter the Overgrown Shrine. Ancient stones rise from a tangle of aggressive vegetation. The lost civilization built this place to honor something—or contain it. Remnant cultists have been seen performing rituals here.'
        },
        
        // === BARROW FIELDS (Level 14-20) ===
        // Shape: Barrow mounds — irregular edges with standing stones
        crypt: {
            id: 'crypt',
            name: 'Barrow Fields',
            description: 'Ancient burial grounds where the dead predate the Shattering. Mounds and standing stones dot the necrotic fog. Who were they?',
            theme: 'undead',
            difficulty: 'hard',
            
            // Grid dimensions (v0.9.0: was 14×14)
            gridWidth: 8,
            gridHeight: 12,
            
            excludedHexes: [
                {q:0,r:0}, {q:1,r:0}, {q:6,r:0}, {q:7,r:0},
                {q:0,r:1}, {q:7,r:1},
                {q:0,r:5}, {q:7,r:6},
                {q:0,r:10}, {q:7,r:10},
                {q:0,r:11}, {q:1,r:11}, {q:6,r:11}, {q:7,r:11}
            ],
            
            backgroundImage: null,
            backgroundColor: '#1a1a20',
            ambientAudio: 'barrows',
            
// Terrain tile assignments — 2MT illustrated hex tiles
            terrainTiles: {
                // Row 0
                '2,0': 'plains_damp_5',
                '3,0': 'sparse_trees_1',
                '4,0': 'sparse_trees_1',
                '5,0': 'plains_damp_2',
                // Row 1
                '1,1': 'plains_damp_2',
                '2,1': 'plains_damp_1',
                '3,1': 'plains_damp_1',
                '4,1': 'dirt_path_1_n',
                '5,1': 'sparse_trees_2',
                '6,1': 'sparse_trees_1',
                // Row 2
                '0,2': 'plains_damp_5',
                '1,2': 'plains_damp_3',
                '4,2': 'dirt_path_1_n',
                '7,2': 'plains_damp_3',
                // Row 3
                '0,3': 'sparse_trees_2',
                '1,3': 'sparse_trees_1',
                '2,3': 'plains_damp_1',
                '3,3': 'plains_damp_1',
                '4,3': 'plains_damp_3',
                '5,3': 'plains_damp_5',
                '6,3': 'sparse_trees_1',
                '7,3': 'plains_damp_2',
                // Row 4
                '0,4': 'sparse_trees_2',
                '1,4': 'plains_damp_2',
                '2,4': 'ruin_lush',
                '3,4': 'plains_damp_4',
                '4,4': 'plains_damp_2',
                '5,4': 'ruin_lush',
                '6,4': 'sparse_trees_1',
                '7,4': 'plains_damp_2',
                // Row 5
                '1,5': 'plains_damp_3',
                '2,5': 'plains_damp_5',
                '5,5': 'plains_damp_5',
                '7,5': 'dirt_path_8_w',
                // Row 6
                '0,6': 'plains_damp_1',
                '2,6': 'plains_damp_5',
                '5,6': 'sparse_trees_1',
                '6,6': 'plains_damp_5',
                // Row 7
                '0,7': 'plains_damp_3',
                '1,7': 'plains_damp_3',
                '2,7': 'ruin_lush',
                '3,7': 'plains_damp_3',
                '4,7': 'sparse_trees_1',
                '5,7': 'ruin_lush',
                '6,7': 'plains_damp_2',
                '7,7': 'plains_damp_1',
                // Row 8
                '0,8': 'plains_damp_3',
                '1,8': 'plains_damp_5',
                '2,8': 'plains_damp_5',
                '3,8': 'plains_damp_4',
                '4,8': 'sparse_trees_1',
                '5,8': 'sparse_trees_1',
                '6,8': 'plains_damp_5',
                '7,8': 'plains_damp_2',
                // Row 9
                '0,9': 'plains_damp_3',
                '1,9': 'plains_damp_2',
                '4,9': 'plains_damp_5',
                '7,9': 'sparse_trees_2',
                // Row 10
                '1,10': 'plains_damp_2',
                '2,10': 'plains_damp_3',
                '3,10': 'sparse_trees_2',
                '4,10': 'plains_damp_2',
                '5,10': 'sparse_trees_1',
                '6,10': 'sparse_trees_1',
                // Row 11
                '2,11': 'plains_damp_1',
                '3,11': 'plains_damp_5',
                '4,11': 'plains_damp_5',
                '5,11': 'plains_damp_3',
            },
            terrainTileDefault: 'base_lush',
            terrainFilter: 'terrain-filter-undead',
            
            maxPlayers: 4,
            pvpEnabled: false,
            
            levelRange: { min: 14, max: 20 },
            
            npcs: [
                { creatureId: 'wight', subtypeId: 'normal', count: 2, levelRange: [14, 17] },
                { creatureId: 'wight', subtypeId: 'greater', count: 1, levelRange: [17, 20] },
                { creatureId: 'wraith', subtypeId: 'normal', count: 1, levelRange: [16, 19] },
                { creatureId: 'barrow_guardian', subtypeId: 'normal', count: 2, levelRange: [14, 17] },
                { creatureId: 'barrow_guardian', subtypeId: 'greater', count: 1, levelRange: [18, 20] },
                { creatureId: 'skeleton', subtypeId: 'greater', count: 3, levelRange: [14, 16] }
            ],
            maxNPCs: 3,
            respawnDelay: 20000,
            
            obstacles: [
                { q: 2, r: 2 }, { q: 3, r: 2 }, { q: 5, r: 2 }, { q: 6, r: 2 },
                { q: 2, r: 9 }, { q: 3, r: 9 }, { q: 5, r: 9 }, { q: 6, r: 9 },
                { q: 3, r: 5 }, { q: 4, r: 5 }, { q: 3, r: 6 }, { q: 4, r: 6 },
                { q: 1, r: 6 }, { q: 6, r: 5 }
            ],
            
            specialHexes: [
                { q: 2, r: 4, type: 'necrotic', effect: 'damage', modifier: 4 },
                { q: 5, r: 4, type: 'necrotic', effect: 'damage', modifier: 4 },
                { q: 2, r: 7, type: 'necrotic', effect: 'damage', modifier: 4 },
                { q: 5, r: 7, type: 'necrotic', effect: 'damage', modifier: 4 }
            ],
            
            exits: [
                { q: 1, r: 6, targetMap: 'graveyard', targetQ: 7, targetR: 6, label: 'To Abandoned Farmstead', direction: 'W' },
                { q: 4, r: 1, targetMap: 'goblin_camp', targetQ: 4, targetR: 8, label: 'To Thornwood Edge', direction: 'N' },
                { q: 7, r: 5, targetMap: 'boss_chamber', targetQ: 1, targetR: 5, label: 'To Ashen Barrens', direction: 'E' }
            ],
            
            ambientEvents: [
                'Fog clings to the burial mounds, never lifting.',
                'The standing stones hum with ancient power.',
                'A wight rises from a barrow ahead, eyes burning with hatred.',
                'These graves are older than the Shattering. Who sleeps here?',
                'Spectral figures drift between the mounds.',
                'The barrow guardians have stood watch for a thousand years.',
                'You feel the Pale Court\'s influence here—cold and hungry.',
                'Inscriptions on the stones are in no known language.'
            ],
            
            entryText: 'You enter the Barrow Fields. Ancient burial mounds rise from perpetual fog, surrounded by standing stones that predate the Shattering. The dead here aren\'t like other undead—they remember their duty, and they don\'t welcome intruders.'
        },
        
        // === ASHEN BARRENS EDGE (Level 16-22) ===
        // Shape: Wasteland — crumbled edges, scorched perimeter
        boss_chamber: {
            id: 'boss_chamber',
            name: 'Ashen Barrens Edge',
            description: 'The transition zone to the blasted wasteland. Grey ash covers everything, and the Pale Court\'s undead patrol in formation.',
            theme: 'wasteland',
            difficulty: 'very_hard',
            
            // Grid dimensions (v0.9.0: was 12×12)
            gridWidth: 8,
            gridHeight: 11,
            
            excludedHexes: [
                {q:0,r:0}, {q:7,r:0},
                {q:0,r:1}, {q:7,r:1},
                {q:0,r:5}, {q:7,r:5},
                {q:0,r:9}, {q:7,r:9},
                {q:0,r:10}, {q:7,r:10}
            ],
            
            backgroundImage: null,
            backgroundColor: '#1a1a1a',
            ambientAudio: 'desolation',
            
// Terrain tile assignments — 2MT illustrated hex tiles
            terrainTiles: {
                // Row 0
                '1,0': 'base_rocky',
                '2,0': 'base_rocky',
                '3,0': 'base_rocky',
                '4,0': 'plains_desert_4',
                '5,0': 'plains_desert_5',
                '6,0': 'plains_desert_4',
                // Row 1
                '1,1': 'plains_desert_4',
                '2,1': 'plains_desert_5',
                '3,1': 'plains_desert_4',
                '4,1': 'dirt_path_rocky',
                '5,1': 'plains_desert_4',
                '6,1': 'plains_desert_4',
                // Row 2
                '0,2': 'plains_desert_5',
                '1,2': 'plains_desert_5',
                '3,2': 'base_rocky',
                '4,2': 'plains_desert_4',
                '5,2': 'plains_desert_5',
                '7,2': 'plains_desert_4',
                // Row 3
                '0,3': 'plains_desert_4',
                '1,3': 'base_rocky',
                '2,3': 'base_rocky',
                '3,3': 'ruin_desert',
                '4,3': 'base_rocky',
                '5,3': 'ruin_desert',
                '6,3': 'base_rocky',
                '7,3': 'plains_desert_4',
                // Row 4
                '0,4': 'plains_desert_5',
                '2,4': 'plains_desert_4',
                '3,4': 'plains_desert_4',
                '4,4': 'plains_desert_5',
                '5,4': 'base_rocky',
                '7,4': 'plains_desert_4',
                // Row 5
                '1,5': 'dirt_path_rocky',
                '2,5': 'base_rocky',
                '5,5': 'base_rocky',
                '6,5': 'plains_desert_4',
                // Row 6
                '0,6': 'base_rocky',
                '1,6': 'plains_desert_5',
                '2,6': 'plains_desert_5',
                '5,6': 'base_rocky',
                '6,6': 'plains_desert_5',
                '7,6': 'dirt_path_rocky',
                // Row 7
                '0,7': 'base_rocky',
                '1,7': 'plains_desert_5',
                '2,7': 'plains_desert_4',
                '3,7': 'plains_desert_4',
                '4,7': 'plains_desert_4',
                '5,7': 'base_rocky',
                '6,7': 'plains_desert_5',
                '7,7': 'plains_desert_5',
                // Row 8
                '0,8': 'plains_desert_4',
                '1,8': 'plains_desert_5',
                '3,8': 'hills_desert_1',
                '4,8': 'plains_desert_5',
                '5,8': 'hills_desert_2',
                '7,8': 'plains_desert_4',
                // Row 9
                '1,9': 'plains_desert_4',
                '2,9': 'plains_desert_5',
                '3,9': 'plains_desert_4',
                '4,9': 'plains_desert_5',
                '5,9': 'plains_desert_4',
                '6,9': 'plains_desert_5',
                // Row 10
                '1,10': 'plains_desert_4',
                '2,10': 'plains_desert_5',
                '3,10': 'base_rocky',
                '4,10': 'dirt_path_rocky',
                '5,10': 'plains_desert_5',
                '6,10': 'plains_desert_4',
            },
            terrainTileDefault: 'base_rocky',
            
            maxPlayers: 4,
            pvpEnabled: false,
            
            levelRange: { min: 16, max: 22 },
            
            npcs: [
                { creatureId: 'wight', subtypeId: 'greater', count: 2, levelRange: [17, 20] },
                { creatureId: 'ash_crawler', subtypeId: 'normal', count: 2, levelRange: [16, 19] },
                { creatureId: 'ash_crawler', subtypeId: 'greater', count: 1, levelRange: [19, 22] },
                { creatureId: 'ghost', subtypeId: 'greater', count: 1, levelRange: [18, 21] },
                { creatureId: 'skeleton', subtypeId: 'ethereal', count: 2, levelRange: [17, 20] }
            ],
            maxNPCs: 3,
            respawnDelay: 25000,
            
            obstacles: [
                { q: 2, r: 2 }, { q: 6, r: 2 },
                { q: 1, r: 4 }, { q: 6, r: 4 },
                { q: 2, r: 8 }, { q: 6, r: 8 },
                { q: 3, r: 5 }, { q: 4, r: 5 }, { q: 3, r: 6 }, { q: 4, r: 6 }
            ],
            
            specialHexes: [
                { q: 3, r: 3, type: 'ash_drift', effect: 'slow', modifier: 0.6 },
                { q: 5, r: 3, type: 'ash_drift', effect: 'slow', modifier: 0.6 },
                { q: 3, r: 7, type: 'ash_drift', effect: 'slow', modifier: 0.6 },
                { q: 5, r: 7, type: 'ash_drift', effect: 'slow', modifier: 0.6 },
                { q: 4, r: 7, type: 'necrotic', effect: 'damage', modifier: 5 },
                { q: 5, r: 6, type: 'necrotic', effect: 'damage', modifier: 5 }
            ],
            
            exits: [
                { q: 1, r: 5, targetMap: 'crypt', targetQ: 7, targetR: 5, label: 'To Barrow Fields', direction: 'W' },
                { q: 4, r: 1, targetMap: 'cave', targetQ: 4, targetR: 11, label: 'To Deep Thornwood', direction: 'N' },
                { q: 7, r: 6, targetMap: 'old_road', targetQ: 1, targetR: 5, label: 'To Old Road', direction: 'E' },
                { q: 4, r: 10, targetMap: 'pale_outskirts', targetQ: 4, targetR: 0, label: 'To Pale Court Outskirts', direction: 'S' }
            ],
            
            ambientEvents: [
                'Grey ash blankets everything. Nothing grows here.',
                'The Pale Court\'s undead patrol in formation. They\'re organized.',
                'An ash crawler burrows through the dead earth nearby.',
                'You see lights in the distance—the Pale Court\'s fortress.',
                'The air tastes of death and ancient fire.',
                'What catastrophe created this desolation?',
                'A wight watches from a ruined doorway. It remembers being alive.',
                'The ground crunches with every step—is that bone beneath the ash?'
            ],
            
            entryText: 'You enter the Ashen Barrens Edge. Grey ash covers the blasted landscape like snow. Nothing has grown here since some forgotten catastrophe scoured the land. The Pale Court\'s undead patrol these wastes—intelligent, organized, and hungry.'
        },
        
        // === THE SEWERS (Level 1-5) ===
        // Shape: Tunnel corridor — narrow, winding passage
        sewers: {
            id: 'sewers',
            name: 'The Sewers',
            description: 'Underground tunnels beneath Eron\'s Landing. The ancient stonework predates the town itself—remnants of the lost civilization, now infested with vermin.',
            theme: 'dungeon',
            difficulty: 'easy',
            
            // Grid dimensions (v0.9.0: was 8×8)
            gridWidth: 7,
            gridHeight: 9,
            
            excludedHexes: [
                {q:0,r:0}, {q:6,r:0},
                {q:0,r:1}, {q:1,r:1}, {q:5,r:1}, {q:6,r:1},
                {q:0,r:2}, {q:6,r:2},
                {q:0,r:7}, {q:6,r:7},
                {q:0,r:8}, {q:1,r:8}, {q:5,r:8}, {q:6,r:8}
            ],
            
            backgroundImage: null,
            backgroundColor: '#1a1a1a',
            ambientAudio: 'sewer_drip',
            
// Terrain tile assignments — 2MT illustrated hex tiles
            terrainTiles: {
                // Row 0
                '1,0': 'base_rocky',
                '2,0': 'base_rocky',
                '3,0': 'dirt_path_rocky',
                '4,0': 'plains_damp_3',
                '5,0': 'plains_damp_4',
                // Row 1
                '2,1': 'base_rocky',
                '3,1': 'plains_damp_2',
                '4,1': 'base_rocky',
                // Row 2
                '1,2': 'plains_damp_1',
                '3,2': 'plains_damp_5',
                '4,2': 'base_rocky',
                // Row 3
                '0,3': 'base_rocky',
                '1,3': 'plains_damp_1',
                '2,3': 'river_1_s',
                '5,3': 'plains_damp_5',
                '6,3': 'plains_damp_5',
                // Row 4
                '0,4': 'plains_damp_5',
                '2,4': 'river_1_s',
                '6,4': 'plains_damp_1',
                // Row 5
                '0,5': 'plains_damp_4',
                '1,5': 'plains_damp_4',
                '2,5': 'river_1_se',
                '5,5': 'base_rocky',
                '6,5': 'plains_damp_3',
                // Row 6
                '0,6': 'plains_damp_2',
                '1,6': 'plains_damp_4',
                '2,6': 'base_rocky',
                '3,6': 'river_1_s',
                '4,6': 'plains_damp_2',
                '5,6': 'base_rocky',
                '6,6': 'base_rocky',
                // Row 7
                '1,7': 'plains_damp_1',
                '2,7': 'base_rocky',
                '3,7': 'river_5_e',
                '4,7': 'river_1_se',
                '5,7': 'plains_damp_5',
                // Row 8
                '2,8': 'plains_damp_2',
                '3,8': 'plains_damp_5',
                '4,8': 'base_rocky',
            },
            terrainTileDefault: 'base_rocky',
            terrainFilter: 'terrain-filter-dungeon',
            
            maxPlayers: 4,
            pvpEnabled: false,
            
            levelRange: { min: 1, max: 5 },
            
            npcs: [
                { creatureId: 'rat', subtypeId: 'normal', count: 4, levelRange: [1, 2] },
                { creatureId: 'rat', subtypeId: 'greater', count: 2, levelRange: [2, 4] },
                { creatureId: 'rat', subtypeId: 'chief', count: 1, levelRange: [4, 5] },
                { creatureId: 'spider', subtypeId: 'lesser', count: 2, levelRange: [2, 3] }
            ],
            maxNPCs: 2,
            respawnDelay: 8000,
            
            obstacles: [
                { q: 2, r: 2 }, { q: 5, r: 2 },
                { q: 1, r: 4 }, { q: 5, r: 4 },
                { q: 3, r: 3 }, { q: 4, r: 3 },
                { q: 3, r: 4 }, { q: 4, r: 4 },
                { q: 3, r: 5 }, { q: 4, r: 5 }
            ],
            
            specialHexes: [
                { q: 2, r: 3, type: 'slippery', effect: 'slow', modifier: 0.7 },
                { q: 5, r: 3, type: 'slippery', effect: 'slow', modifier: 0.7 },
                { q: 2, r: 6, type: 'slippery', effect: 'slow', modifier: 0.7 },
                { q: 4, r: 6, type: 'slippery', effect: 'slow', modifier: 0.7 }
            ],
            
            exits: [
                { q: 3, r: 0, targetMap: 'town', targetQ: 6, targetR: 9, label: 'Return to Eron\'s Landing', direction: 'N' }
            ],
            
            ambientEvents: [
                'Water drips from the arched ceiling into murky puddles.',
                'You hear skittering in the darkness ahead.',
                'The stench of refuse is nearly overwhelming.',
                'Something splashes in the central channel.',
                'Rats squeak and scatter at your approach.',
                'A draft of fresher air hints at a surface grate above.',
                'You step on something that crunches underfoot.',
                'Echoes of the town above filter down through the stones.',
                'The stonework here is older than the town. Lost civilization craft.',
                'A rat the size of a dog watches you from a ledge.'
            ],
            
            entryText: 'You descend into the sewers beneath Eron\'s Landing. The ancient stonework predates the town itself—remnants of the lost civilization, repurposed as drainage tunnels. Rats watch you from the shadows with hungry eyes.'
        },
        
        // === THE OLD ROAD (Level 8-15) ===
        // Shape: Narrow vertical corridor — roadside rubble along edges
        old_road: {
            id: 'old_road',
            name: 'The Old Road',
            description: 'An ancient highway from the lost civilization, partially intact. Mile markers bear writing no one can read. The road led somewhere important—where?',
            theme: 'road',
            difficulty: 'medium',
            
            // Grid dimensions (v0.9.0: was 14×10)
            gridWidth: 7,
            gridHeight: 12,
            
            excludedHexes: [
                {q:0,r:0}, {q:6,r:0},
                {q:0,r:1}, {q:6,r:1},
                {q:0,r:2}, {q:6,r:2},
                {q:0,r:5}, {q:6,r:5},
                {q:0,r:6}, {q:6,r:6},
                {q:0,r:10}, {q:6,r:10},
                {q:0,r:11}, {q:6,r:11}
            ],
            
            backgroundImage: null,
            backgroundColor: '#3d3d3d',
            ambientAudio: 'wind_plains',
            
// Terrain tile assignments — 2MT illustrated hex tiles
            terrainTiles: {
                // Row 0
                '1,0': 'plains_lush_5',
                '2,0': 'plains_lush_4',
                '3,0': 'plains_lush_1',
                '4,0': 'plains_lush_1',
                '5,0': 'plains_farmland_1',
                // Row 1
                '1,1': 'plains_lush_2',
                '2,1': 'plains_lush_1',
                '3,1': 'dirt_path_1_n',
                '4,1': 'plains_lush_3',
                '5,1': 'plains_farmland_1',
                // Row 2
                '1,2': 'plains_lush_5',
                '2,2': 'plains_lush_1',
                '3,2': 'dirt_path_1_n',
                '4,2': 'plains_lush_5',
                '5,2': 'plains_lush_1',
                // Row 3
                '0,3': 'plains_lush_3',
                '3,3': 'dirt_path_4_s',
                '6,3': 'plains_farmland_2',
                // Row 4
                '0,4': 'plains_farmland_2',
                '1,4': 'plains_lush_5',
                '2,4': 'ruin_lush',
                '3,4': 'dirt_path_1_n',
                '4,4': 'urban_-_modern_town_abandoned_lush_2',
                '5,4': 'plains_lush_2',
                '6,4': 'sparse_trees_1',
                // Row 5
                '1,5': 'dirt_path_5_e',
                '2,5': 'dirt_path_11_n',
                '4,5': 'dirt_path_11_n',
                '5,5': 'dirt_path_8_w',
                // Row 6
                '1,6': 'river_5_e',
                '2,6': 'plains_lush_5',
                '4,6': 'sparse_trees_1',
                '5,6': 'plains_lush_2',
                // Row 7
                '0,7': 'plains_farmland_1',
                '1,7': 'sparse_trees_1',
                '2,7': 'river_1_se',
                '3,7': 'river_5_e',
                '4,7': 'river_1_se',
                '5,7': 'river_5_e',
                '6,7': 'plains_lush_5',
                // Row 8
                '0,8': 'plains_lush_2',
                '3,8': 'dirt_path_1_n',
                '6,8': 'plains_farmland_2',
                // Row 9
                '0,9': 'plains_lush_4',
                '1,9': 'plains_lush_2',
                '2,9': 'plains_lush_2',
                '3,9': 'dirt_path_1_n',
                '4,9': 'plains_lush_2',
                '5,9': 'plains_farmland_1',
                '6,9': 'plains_lush_3',
                // Row 10
                '1,10': 'plains_lush_4',
                '2,10': 'plains_lush_3',
                '3,10': 'dirt_path_1_n',
                '4,10': 'plains_farmland_2',
                '5,10': 'plains_lush_2',
                // Row 11
                '1,11': 'plains_lush_4',
                '2,11': 'plains_lush_4',
                '3,11': 'dirt_path_1_s',
                '4,11': 'sparse_trees_1',
                '5,11': 'plains_farmland_2',
            },
            terrainTileDefault: 'base_lush',
            
            maxPlayers: 4,
            pvpEnabled: false,
            
            levelRange: { min: 8, max: 15 },
            
            npcs: [
                { creatureId: 'bandit', subtypeId: 'normal', count: 3, levelRange: [8, 11] },
                { creatureId: 'bandit', subtypeId: 'greater', count: 1, levelRange: [11, 14] },
                { creatureId: 'orc', subtypeId: 'normal', count: 2, levelRange: [9, 12] },
                { creatureId: 'orc', subtypeId: 'greater', count: 1, levelRange: [12, 15] },
                { creatureId: 'troll', subtypeId: 'lesser', count: 1, levelRange: [12, 15] }
            ],
            maxNPCs: 3,
            respawnDelay: 12000,
            
            obstacles: [
                { q: 1, r: 3 }, { q: 2, r: 3 },
                { q: 4, r: 3 }, { q: 5, r: 3 },
                { q: 1, r: 8 }, { q: 2, r: 8 },
                { q: 4, r: 8 }, { q: 5, r: 8 },
                { q: 3, r: 5 }, { q: 3, r: 6 }
            ],
            
            specialHexes: [
                { q: 1, r: 4, type: 'unstable', effect: 'damage', modifier: 2 },
                { q: 5, r: 4, type: 'unstable', effect: 'damage', modifier: 2 },
                { q: 1, r: 7, type: 'unstable', effect: 'damage', modifier: 2 },
                { q: 5, r: 7, type: 'unstable', effect: 'damage', modifier: 2 }
            ],
            
            exits: [
                { q: 1, r: 5, targetMap: 'graveyard', targetQ: 1, targetR: 6, label: 'To Abandoned Farmstead', direction: 'W' },
                { q: 5, r: 5, targetMap: 'mountain_approach', targetQ: 1, targetR: 6, label: 'To Mountain Approach', direction: 'E' },
                { q: 3, r: 1, targetMap: 'boss_chamber', targetQ: 7, targetR: 6, label: 'To Ashen Barrens', direction: 'N' }
            ],
            
            ambientEvents: [
                'Ancient paving stones, still level after a thousand years, stretch into the distance.',
                'A weathered mile marker bears symbols you cannot read.',
                'The road cuts through the landscape like a scar that never healed.',
                'You spot movement among the roadside ruins—bandits.',
                'Wind whistles through gaps in a collapsed waystation.',
                'This road led somewhere important once. Where?',
                'Hoofprints in the dust—bandits, or orc raiders.',
                'The horizon shimmers with heat despite the cool air.',
                'A troll\'s roar echoes from somewhere off the road.',
                'You find a broken signpost. The destination has worn away.'
            ],
            
            entryText: 'You stand on the Old Road, an ancient highway that once connected great cities of the lost civilization. Cracked paving stones stretch toward distant mountains. Bandits and worse prey on travelers here—but the road remembers more than any living soul.'
        },
        
        // === MOUNTAIN APPROACH (Level 15-22) ===
        // Shape: Mountain — rocky cliff faces, crumbled perimeter
        mountain_approach: {
            id: 'mountain_approach',
            name: 'Mountain Approach',
            description: 'The foothills leading to the Wraithspine Mountains. Ancient watchtowers still stand—still guarding. The dwarves won\'t mine here anymore.',
            theme: 'mountain',
            difficulty: 'hard',
            
            // Grid dimensions (v0.9.0: was 12×14)
            gridWidth: 8,
            gridHeight: 12,
            
            excludedHexes: [
                {q:0,r:0}, {q:1,r:0}, {q:7,r:0},
                {q:0,r:1}, {q:7,r:1},
                {q:0,r:6}, {q:7,r:5},
                {q:0,r:10}, {q:7,r:10},
                {q:0,r:11}, {q:7,r:11}
            ],
            
            backgroundImage: null,
            backgroundColor: '#2a2a3a',
            ambientAudio: 'mountain_wind',
            
// Terrain tile assignments — 2MT illustrated hex tiles
            terrainTiles: {
                // Row 0
                '2,0': 'hills_lush_1',
                '3,0': 'hills_lush_3',
                '4,0': 'dirt_path_1_n',
                '5,0': 'sparse_trees_1',
                '6,0': 'hills_lush_3',
                // Row 1
                '1,1': 'hills_lush_1',
                '2,1': 'plains_lush_1',
                '3,1': 'hills_lush_1',
                '4,1': 'dirt_path_1_n',
                '5,1': 'hills_lush_1',
                '6,1': 'plains_lush_3',
                // Row 2
                '0,2': 'hills_lush_2',
                '3,2': 'hills_lush_3',
                '4,2': 'plains_lush_1',
                '5,2': 'river_1_s',
                '7,2': 'plains_lush_1',
                // Row 3
                '0,3': 'plains_lush_3',
                '1,3': 'hills_lush_2',
                '2,3': 'plains_lush_2',
                '3,3': 'plains_lush_2',
                '4,3': 'dirt_path_1_n',
                '5,3': 'river_1_se',
                '6,3': 'plains_lush_3',
                '7,3': 'plains_lush_2',
                // Row 4
                '0,4': 'hills_lush_1',
                '1,4': 'sparse_trees_1',
                '2,4': 'plains_lush_1',
                '3,4': 'plains_lush_2',
                '4,4': 'dirt_path_1_n',
                '5,4': 'hills_lush_2',
                '6,4': 'river_1_s',
                '7,4': 'hills_lush_1',
                // Row 5
                '0,5': 'plains_lush_1',
                '2,5': 'plains_lush_3',
                '3,5': 'dirt_path_4_s',
                '4,5': 'hills_lush_2',
                '5,5': 'plains_lush_1',
                // Row 6
                '1,6': 'dirt_path_5_e',
                '2,6': 'dirt_path_4_ne',
                '5,6': 'hills_lush_1',
                '6,6': 'plains_lush_2',
                '7,6': 'hills_lush_1',
                // Row 7
                '0,7': 'plains_lush_3',
                '1,7': 'hills_lush_3',
                '2,7': 'hills_lush_1',
                '5,7': 'sparse_trees_1',
                '6,7': 'plains_lush_1',
                '7,7': 'hills_lush_2',
                // Row 8
                '0,8': 'sparse_trees_1',
                '1,8': 'plains_lush_1',
                '2,8': 'hills_lush_3',
                '3,8': 'hills_lush_1',
                '4,8': 'plains_lush_3',
                '5,8': 'sparse_trees_1',
                '6,8': 'plains_lush_3',
                '7,8': 'sparse_trees_1',
                // Row 9
                '0,9': 'plains_lush_1',
                '1,9': 'hills_lush_2',
                '4,9': 'hills_lush_2',
                '7,9': 'plains_lush_2',
                // Row 10
                '1,10': 'plains_lush_1',
                '2,10': 'hills_lush_3',
                '3,10': 'plains_lush_2',
                '4,10': 'dirt_path_1_s',
                '5,10': 'plains_lush_1',
                '6,10': 'plains_lush_2',
                // Row 11
                '1,11': 'hills_lush_1',
                '2,11': 'plains_lush_1',
                '3,11': 'hills_lush_1',
                '4,11': 'dirt_path_1_s',
                '5,11': 'plains_lush_1',
                '6,11': 'sparse_trees_1',
            },
            terrainTileDefault: 'base_lush',
            
            maxPlayers: 4,
            pvpEnabled: false,
            
            levelRange: { min: 15, max: 22 },
            
            npcs: [
                { creatureId: 'ogre', subtypeId: 'normal', count: 2, levelRange: [15, 18] },
                { creatureId: 'ogre', subtypeId: 'greater', count: 1, levelRange: [18, 21] },
                { creatureId: 'orc', subtypeId: 'greater', count: 2, levelRange: [16, 19] },
                { creatureId: 'wyvern', subtypeId: 'normal', count: 1, levelRange: [18, 22] },
                { creatureId: 'stone_golem', subtypeId: 'normal', count: 1, levelRange: [19, 22] }
            ],
            maxNPCs: 3,
            respawnDelay: 15000,
            
            obstacles: [
                { q: 1, r: 2 }, { q: 2, r: 2 }, { q: 6, r: 2 },
                { q: 1, r: 5 }, { q: 6, r: 5 },
                { q: 3, r: 6 }, { q: 4, r: 6 }, { q: 3, r: 7 }, { q: 4, r: 7 },
                { q: 2, r: 9 }, { q: 3, r: 9 }, { q: 5, r: 9 }, { q: 6, r: 9 }
            ],
            
            specialHexes: [
                { q: 2, r: 4, type: 'unstable', effect: 'damage', modifier: 3 },
                { q: 5, r: 4, type: 'unstable', effect: 'damage', modifier: 3 },
                { q: 3, r: 8, type: 'unstable', effect: 'damage', modifier: 3 },
                { q: 5, r: 8, type: 'unstable', effect: 'damage', modifier: 3 }
            ],
            
            exits: [
                { q: 1, r: 6, targetMap: 'old_road', targetQ: 5, targetR: 5, label: 'To Old Road', direction: 'W' },
                { q: 4, r: 11, targetMap: 'hidden_caves', targetQ: 4, targetR: 1, label: 'To Hidden Caves', direction: 'S' },
                { q: 4, r: 0, targetMap: 'wraithspine_pass', targetQ: 3, targetR: 11, label: 'To Wraithspine Pass', direction: 'N' }
            ],
            
            ambientEvents: [
                'The air grows thin as you climb higher.',
                'Mist clings to the peaks above—or is it something else?',
                'A shadow passes overhead. Something large with wings.',
                'Ancient watchtower ruins loom against the grey sky.',
                'The wind carries what might be a distant roar.',
                'Loose stones clatter down the slope behind you.',
                'Snow dusts the highest peaks, even in summer.',
                'You feel watched from the crags above.',
                'A stone golem stands motionless by a ruined gate. Is it active?',
                'The dwarves abandoned their mines here. What did they find?'
            ],
            
            entryText: 'You enter the foothills of the Wraithspine Mountains. Jagged peaks pierce the clouds above, wreathed in mists that move against the wind. Ancient watchtowers still stand their vigil. The dwarves won\'t mine here anymore—something changed them.'
        },
        
        // === HIDDEN CAVES (Level 18-25) ===
        // Shape: Cavern — narrow entrance, opening to chambers
        hidden_caves: {
            id: 'hidden_caves',
            name: 'Hidden Caves',
            description: 'A natural cave system with unnatural additions. The lost civilization built something here—their devices still function, protected from the Silent Law.',
            theme: 'dungeon',
            difficulty: 'very_hard',
            
            // Grid dimensions (v0.9.0: was 14×14)
            gridWidth: 8,
            gridHeight: 12,
            
            excludedHexes: [
                {q:0,r:0}, {q:1,r:0}, {q:6,r:0}, {q:7,r:0},
                {q:0,r:1}, {q:7,r:1},
                {q:0,r:5}, {q:7,r:6},
                {q:0,r:10}, {q:7,r:10},
                {q:0,r:11}, {q:1,r:11}, {q:6,r:11}, {q:7,r:11}
            ],
            
            backgroundImage: null,
            backgroundColor: '#0a0a14',
            ambientAudio: 'deep_caves',
            
// Terrain tile assignments — 2MT illustrated hex tiles
            terrainTiles: {
                // Row 0
                '2,0': 'base_rocky',
                '3,0': 'plains_damp_3',
                '4,0': 'base_rocky',
                '5,0': 'plains_damp_2',
                // Row 1
                '1,1': 'plains_damp_3',
                '2,1': 'plains_damp_1',
                '3,1': 'base_rocky',
                '4,1': 'dirt_path_rocky',
                '5,1': 'base_rocky',
                '6,1': 'base_rocky',
                // Row 2
                '0,2': 'base_rocky',
                '1,2': 'base_rocky',
                '4,2': 'dirt_path_1_n',
                '7,2': 'base_rocky',
                // Row 3
                '0,3': 'plains_damp_1',
                '1,3': 'river_1_se',
                '2,3': 'plains_damp_3',
                '3,3': 'base_rocky',
                '4,3': 'plains_damp_2',
                '5,3': 'plains_damp_1',
                '6,3': 'base_rocky',
                '7,3': 'plains_damp_3',
                // Row 4
                '0,4': 'plains_damp_3',
                '1,4': 'plains_damp_2',
                '2,4': 'river_1_s',
                '3,4': 'base_rocky',
                '4,4': 'plains_damp_1',
                '5,4': 'plains_damp_1',
                '6,4': 'plains_damp_2',
                '7,4': 'base_rocky',
                // Row 5
                '2,5': 'river_1_se',
                '5,5': 'base_rocky',
                '6,5': 'plains_damp_3',
                '7,5': 'plains_damp_3',
                // Row 6
                '0,6': 'base_rocky',
                '1,6': 'base_rocky',
                '2,6': 'base_rocky',
                '5,6': 'plains_damp_3',
                // Row 7
                '0,7': 'base_rocky',
                '1,7': 'base_rocky',
                '2,7': 'plains_damp_2',
                '3,7': 'river_1_s',
                '5,7': 'plains_damp_2',
                '6,7': 'base_rocky',
                '7,7': 'base_rocky',
                // Row 8
                '0,8': 'base_rocky',
                '1,8': 'base_rocky',
                '2,8': 'plains_damp_1',
                '3,8': 'river_1_se',
                '4,8': 'plains_damp_3',
                '5,8': 'plains_damp_2',
                '6,8': 'plains_damp_3',
                '7,8': 'base_rocky',
                // Row 9
                '0,9': 'base_rocky',
                '1,9': 'plains_damp_1',
                '4,9': 'dirt_path_1_s',
                '7,9': 'base_rocky',
                // Row 10
                '1,10': 'base_rocky',
                '2,10': 'base_rocky',
                '3,10': 'plains_damp_1',
                '4,10': 'dirt_path_rocky',
                '5,10': 'base_rocky',
                '6,10': 'plains_damp_2',
                // Row 11
                '2,11': 'base_rocky',
                '3,11': 'base_rocky',
                '4,11': 'base_rocky',
                '5,11': 'plains_damp_2',
            },
            terrainTileDefault: 'base_rocky',
            terrainFilter: 'terrain-filter-cave',
            
            maxPlayers: 4,
            pvpEnabled: false,
            
            levelRange: { min: 18, max: 25 },
            
            npcs: [
                { creatureId: 'troll', subtypeId: 'greater', count: 2, levelRange: [18, 21] },
                { creatureId: 'cave_troll', subtypeId: 'greater', count: 1, levelRange: [20, 23] },
                { creatureId: 'stone_golem', subtypeId: 'normal', count: 2, levelRange: [19, 22] },
                { creatureId: 'stone_golem', subtypeId: 'greater', count: 1, levelRange: [22, 25] },
                { creatureId: 'ghost', subtypeId: 'ethereal', count: 1, levelRange: [20, 24] }
            ],
            maxNPCs: 3,
            respawnDelay: 20000,
            
            obstacles: [
                { q: 2, r: 2 }, { q: 3, r: 2 }, { q: 5, r: 2 }, { q: 6, r: 2 },
                { q: 3, r: 5 }, { q: 4, r: 5 }, { q: 3, r: 6 }, { q: 4, r: 6 },
                { q: 4, r: 7 },
                { q: 2, r: 9 }, { q: 3, r: 9 }, { q: 5, r: 9 }, { q: 6, r: 9 },
                { q: 1, r: 5 }, { q: 6, r: 6 }
            ],
            
            specialHexes: [
                { q: 4, r: 9, type: 'ancient_ward', effect: 'heal', modifier: 5 },
                { q: 5, r: 9, type: 'ancient_ward', effect: 'heal', modifier: 5 },
                { q: 2, r: 6, type: 'corrupted', effect: 'damage', modifier: 6 },
                { q: 6, r: 7, type: 'corrupted', effect: 'damage', modifier: 6 },
                { q: 3, r: 3, type: 'magical_residue', effect: 'heal', modifier: 3 },
                { q: 5, r: 3, type: 'magical_residue', effect: 'heal', modifier: 3 }
            ],
            
            exits: [
                { q: 4, r: 1, targetMap: 'mountain_approach', targetQ: 4, targetR: 11, label: 'To Mountain Approach', direction: 'N' },
                { q: 4, r: 10, targetMap: 'abyssal_rift', targetQ: 4, targetR: 0, label: 'To Abyssal Rift', direction: 'S' }
            ],
            
            ambientEvents: [
                'Crystal formations pulse with a faint inner light.',
                'The worked stone here is unlike anything from the Old World.',
                'An underground river whispers secrets in the dark.',
                'Ancient machinery hums with power—it still functions.',
                'You feel a presence watching from the shadows.',
                'The air hums with residual magical energy.',
                'Inscriptions cover the walls—warnings from a lost people.',
                'Something moves in the deepest darkness. Something patient.',
                'A golem stands frozen mid-stride. Its eyes still glow.',
                'The Silent Law doesn\'t reach here. How is that possible?'
            ],
            
            entryText: 'You descend into the Hidden Caves. Natural stone gives way to worked passages—the unmistakable craft of the lost civilization. Their devices still function here, somehow protected from the Silent Law. What were they guarding? What were they hiding from?'
        },
        
        // === WRAITHSPINE PASS (Level 25-32) ===
        // Shape: Narrow mountain pass — cliffs on both sides
        wraithspine_pass: {
            id: 'wraithspine_pass',
            name: 'Wraithspine Pass',
            description: 'A treacherous mountain pass through the Wraithspine range. Ancient watchtowers mark a road that once connected great cities. The wind carries distant roars.',
            theme: 'mountain',
            difficulty: 'hard',
            
            gridWidth: 7,
            gridHeight: 12,
            
            excludedHexes: [
                {q:0,r:0}, {q:6,r:0},
                {q:0,r:1}, {q:5,r:1}, {q:6,r:1},
                {q:0,r:4}, {q:6,r:4},
                {q:0,r:7}, {q:6,r:7},
                {q:0,r:10}, {q:6,r:10},
                {q:0,r:11}, {q:6,r:11}
            ],
            
            backgroundImage: null,
            backgroundColor: '#1e1e2e',
            ambientAudio: 'mountain_wind',
            
// Terrain tile assignments — 2MT illustrated hex tiles
            terrainTiles: {
                // Row 0
                '1,0': 'hills_snowy_2',
                '2,0': 'hills_snowy_2',
                '3,0': 'dirt_path_rocky',
                '4,0': 'snow_field_2',
                '5,0': 'base_rocky',
                // Row 1
                '1,1': 'base_rocky',
                '2,1': 'snow_field_1',
                '3,1': 'dirt_path_1_n',
                '4,1': 'snow_field_2',
                // Row 2
                '0,2': 'base_rocky',
                '2,2': 'base_rocky',
                '3,2': 'dirt_path_1_n',
                '4,2': 'base_rocky',
                '6,2': 'snow_field_2',
                // Row 3
                '0,3': 'snow_field_1',
                '1,3': 'hills_snowy_2',
                '2,3': 'snow_field_1',
                '3,3': 'dirt_path_1_n',
                '4,3': 'base_rocky',
                '5,3': 'snow_field_1',
                '6,3': 'snow_field_2',
                // Row 4
                '1,4': 'hills_snowy_2',
                '3,4': 'dirt_path_4_s',
                '5,4': 'base_rocky',
                // Row 5
                '0,5': 'hills_snowy_2',
                '1,5': 'base_rocky',
                '2,5': 'hills_snowy_1',
                '3,5': 'dirt_path_1_n',
                '4,5': 'snow_field_1',
                '5,5': 'snow_field_2',
                '6,5': 'hills_snowy_2',
                // Row 6
                '0,6': 'snow_field_2',
                '2,6': 'base_rocky',
                '3,6': 'dirt_path_1_n',
                '4,6': 'snow_field_2',
                '6,6': 'base_rocky',
                // Row 7
                '1,7': 'base_rocky',
                '2,7': 'hills_snowy_2',
                '4,7': 'base_rocky',
                '5,7': 'base_rocky',
                // Row 8
                '0,8': 'hills_snowy_1',
                '2,8': 'hills_snowy_1',
                '3,8': 'dirt_path_1_n',
                '4,8': 'base_rocky',
                '6,8': 'base_rocky',
                // Row 9
                '0,9': 'base_rocky',
                '1,9': 'snow_field_1',
                '3,9': 'dirt_path_1_n',
                '5,9': 'base_rocky',
                '6,9': 'hills_snowy_2',
                // Row 10
                '1,10': 'hills_snowy_1',
                '2,10': 'base_rocky',
                '3,10': 'dirt_path_1_s',
                '4,10': 'hills_snowy_1',
                '5,10': 'snow_field_1',
                // Row 11
                '1,11': 'hills_snowy_1',
                '2,11': 'snow_field_1',
                '3,11': 'dirt_path_rocky',
                '4,11': 'hills_snowy_2',
                '5,11': 'base_rocky',
            },
            terrainTileDefault: 'base_rocky',
            
            maxPlayers: 4,
            pvpEnabled: false,
            
            levelRange: { min: 25, max: 32 },
            
            npcs: [
                { creatureId: 'mountain_orc', subtypeId: 'normal', count: 2, levelRange: [25, 28] },
                { creatureId: 'mountain_orc', subtypeId: 'greater', count: 1, levelRange: [28, 31] },
                { creatureId: 'ice_wyvern', subtypeId: 'normal', count: 1, levelRange: [27, 30] },
                { creatureId: 'ice_wyvern', subtypeId: 'greater', count: 1, levelRange: [30, 32] },
                { creatureId: 'stone_golem', subtypeId: 'greater', count: 1, levelRange: [26, 30] },
                { creatureId: 'ogre', subtypeId: 'chief', count: 1, levelRange: [28, 32] }
            ],
            maxNPCs: 3,
            respawnDelay: 18000,
            
            obstacles: [
                { q: 1, r: 2 }, { q: 5, r: 2 },
                { q: 2, r: 4 }, { q: 4, r: 4 },
                { q: 1, r: 6 }, { q: 5, r: 6 },
                { q: 3, r: 7 },
                { q: 2, r: 9 }, { q: 4, r: 9 },
                { q: 1, r: 8 }, { q: 5, r: 8 }
            ],
            
            specialHexes: [
                { q: 3, r: 3, type: 'unstable', effect: 'damage', modifier: 4 },
                { q: 3, r: 5, type: 'unstable', effect: 'damage', modifier: 4 },
                { q: 2, r: 8, type: 'ancient_ward', effect: 'heal', modifier: 4 },
                { q: 4, r: 8, type: 'ancient_ward', effect: 'heal', modifier: 4 }
            ],
            
            exits: [
                { q: 3, r: 0, targetMap: 'mountain_approach', targetQ: 4, targetR: 11, label: 'To Mountain Approach', direction: 'N' },
                { q: 3, r: 11, targetMap: 'dragons_approach', targetQ: 3, targetR: 0, label: 'To Dragon\'s Approach', direction: 'S' }
            ],
            
            ambientEvents: [
                'Wind howls through the narrow pass, carrying flecks of ice.',
                'A distant roar echoes off the cliff walls—wyvern or worse.',
                'An ancient watchtower crumbles above, its stones still carved with warnings.',
                'Mountain orcs have fortified a ledge with crude barricades.',
                'The air is thin here. Every breath burns cold in your lungs.',
                'Golem fragments litter the path—ancient guardians, destroyed by something.',
                'Snow covers old bones. Not all travelers survived this pass.',
                'The cliffs narrow to barely ten paces wide. Perfect ambush territory.',
                'You spot wyvern nests high above. They\'re watching.',
                'Dwarven mine entrances, sealed with rubble. They won\'t go back in.'
            ],
            
            entryText: 'You enter Wraithspine Pass, a treacherous corridor through the mountains. Sheer cliff faces rise on either side, carved with ancient warnings in a dead language. The wind screams through the gap, and somewhere above, wyverns circle.'
        },
        
        // === PALE COURT OUTSKIRTS (Level 28-36) ===
        // Shape: Desolate wasteland — scattered ash dunes
        pale_outskirts: {
            id: 'pale_outskirts',
            name: 'Pale Court Outskirts',
            description: 'The outer reaches of the Pale Court\'s domain in the deep Ashen Barrens. Organized undead patrol in disciplined formations. This is not mindless evil—it is calculated.',
            theme: 'wasteland',
            difficulty: 'very_hard',
            
            gridWidth: 8,
            gridHeight: 11,
            
            excludedHexes: [
                {q:0,r:0}, {q:7,r:0},
                {q:0,r:1}, {q:7,r:1},
                {q:7,r:5},
                {q:0,r:6},
                {q:0,r:9}, {q:7,r:9},
                {q:0,r:10}, {q:7,r:10}
            ],
            
            backgroundImage: null,
            backgroundColor: '#1a1a1a',
            ambientAudio: 'wind_desolate',
            
// Terrain tile assignments — 2MT illustrated hex tiles
            terrainTiles: {
                // Row 0
                '1,0': 'snow_field_2',
                '2,0': 'base_rocky',
                '3,0': 'base_rocky',
                '4,0': 'dirt_path_rocky',
                '5,0': 'snow_field_2',
                '6,0': 'snow_field_3',
                // Row 1
                '1,1': 'snow_field_1',
                '2,1': 'snow_field_3',
                '3,1': 'plains_desert_5',
                '4,1': 'dirt_path_1_n',
                '5,1': 'plains_desert_4',
                '6,1': 'snow_field_2',
                // Row 2
                '0,2': 'snow_field_3',
                '1,2': 'base_rocky',
                '3,2': 'ruin_desert',
                '4,2': 'plains_desert_4',
                '6,2': 'plains_desert_4',
                '7,2': 'snow_field_2',
                // Row 3
                '0,3': 'plains_desert_5',
                '1,3': 'base_rocky',
                '2,3': 'base_rocky',
                '3,3': 'snow_field_1',
                '4,3': 'snow_field_1',
                '5,3': 'plains_desert_5',
                '6,3': 'plains_desert_5',
                '7,3': 'plains_desert_5',
                // Row 4
                '0,4': 'snow_field_3',
                '1,4': 'snow_field_2',
                '2,4': 'base_rocky',
                '6,4': 'plains_desert_5',
                '7,4': 'base_rocky',
                // Row 5
                '0,5': 'snow_field_1',
                '1,5': 'plains_desert_5',
                '2,5': 'snow_field_2',
                '4,5': 'base_rocky',
                '6,5': 'snow_field_1',
                // Row 6
                '1,6': 'plains_desert_4',
                '2,6': 'base_rocky',
                '6,6': 'snow_field_2',
                '7,6': 'snow_field_2',
                // Row 7
                '0,7': 'snow_field_2',
                '1,7': 'snow_field_3',
                '2,7': 'snow_field_1',
                '3,7': 'plains_desert_4',
                '4,7': 'base_rocky',
                '5,7': 'snow_field_2',
                '6,7': 'plains_desert_5',
                '7,7': 'plains_desert_5',
                // Row 8
                '0,8': 'snow_field_2',
                '1,8': 'snow_field_3',
                '3,8': 'plains_desert_5',
                '4,8': 'base_rocky',
                '5,8': 'ruin_desert',
                '7,8': 'plains_desert_5',
                // Row 9
                '1,9': 'snow_field_2',
                '2,9': 'snow_field_1',
                '3,9': 'base_rocky',
                '4,9': 'dirt_path_1_s',
                '5,9': 'base_rocky',
                '6,9': 'snow_field_3',
                // Row 10
                '1,10': 'snow_field_2',
                '2,10': 'snow_field_2',
                '3,10': 'snow_field_3',
                '4,10': 'dirt_path_rocky',
                '5,10': 'base_rocky',
                '6,10': 'base_rocky',
            },
            terrainTileDefault: 'base_rocky',
            
            maxPlayers: 4,
            pvpEnabled: false,
            
            levelRange: { min: 28, max: 36 },
            
            npcs: [
                { creatureId: 'pale_knight', subtypeId: 'normal', count: 2, levelRange: [28, 32] },
                { creatureId: 'pale_knight', subtypeId: 'greater', count: 1, levelRange: [32, 36] },
                { creatureId: 'bone_colossus', subtypeId: 'normal', count: 1, levelRange: [30, 34] },
                { creatureId: 'wight', subtypeId: 'greater', count: 2, levelRange: [28, 32] },
                { creatureId: 'wraith', subtypeId: 'greater', count: 1, levelRange: [30, 34] },
                { creatureId: 'ash_crawler', subtypeId: 'greater', count: 1, levelRange: [29, 33] }
            ],
            maxNPCs: 3,
            respawnDelay: 20000,
            
            obstacles: [
                { q: 2, r: 2 }, { q: 5, r: 2 },
                { q: 3, r: 4 }, { q: 4, r: 4 }, { q: 5, r: 4 },
                { q: 3, r: 5 }, { q: 5, r: 5 },
                { q: 3, r: 6 }, { q: 4, r: 6 }, { q: 5, r: 6 },
                { q: 2, r: 8 }, { q: 6, r: 8 }
            ],
            
            specialHexes: [
                { q: 1, r: 3, type: 'necrotic', effect: 'damage', modifier: 5 },
                { q: 6, r: 3, type: 'necrotic', effect: 'damage', modifier: 5 },
                { q: 1, r: 7, type: 'necrotic', effect: 'damage', modifier: 5 },
                { q: 6, r: 7, type: 'necrotic', effect: 'damage', modifier: 5 },
                { q: 4, r: 5, type: 'corrupted', effect: 'damage', modifier: 8 }
            ],
            
            exits: [
                { q: 4, r: 0, targetMap: 'boss_chamber', targetQ: 4, targetR: 10, label: 'To Ashen Barrens Edge', direction: 'N' },
                { q: 4, r: 10, targetMap: 'pale_fortress', targetQ: 4, targetR: 0, label: 'To Pale Court Fortress', direction: 'S' }
            ],
            
            ambientEvents: [
                'The ash here is ankle-deep. Nothing has grown for centuries.',
                'Pale Knights march in formation. They\'re not shambling—they\'re organized.',
                'A Bone Colossus assembles itself from scattered remains. Horrifying efficiency.',
                'The air tastes of death and old magic. The Pale Court\'s influence.',
                'Wraiths drift between the ash dunes, whispering in a forgotten tongue.',
                'You find a battlefield—but only one side left bodies. The undead collected theirs.',
                'Distant towers of dark stone rise from the Barrens. The Pale Court\'s fortress.',
                'The ground vibrates with the march of skeletal legions beyond the dunes.',
                'An ash crawler erupts from beneath your feet—they burrow here.',
                'Cold beyond natural. The Pale Court drains warmth from the very earth.'
            ],
            
            entryText: 'You venture into the outer reaches of the Pale Court\'s domain. Grey ash stretches to the horizon under a sky that never brightens. Undead patrol in disciplined formations—these are not mindless corpses but soldiers. Their master\'s will extends this far, and farther still.'
        },
        
        // === THE SUNKEN RUINS (Level 32-40) ===
        // Shape: Flooded temple — water intrusions, partial walls
        sunken_ruins: {
            id: 'sunken_ruins',
            name: 'The Sunken Ruins',
            description: 'Flooded ruins of a lost civilization temple deep in the Drowned Reaches. Sea serpents coil through the submerged corridors. Something ancient still sleeps below.',
            theme: 'swamp',
            difficulty: 'very_hard',
            
            gridWidth: 8,
            gridHeight: 11,
            
            excludedHexes: [
                {q:0,r:0}, {q:1,r:0}, {q:7,r:0},
                {q:0,r:1}, {q:7,r:1},
                {q:7,r:4},
                {q:0,r:5},
                {q:0,r:9}, {q:7,r:9},
                {q:0,r:10}, {q:1,r:10}, {q:7,r:10}
            ],
            
            backgroundImage: null,
            backgroundColor: '#0a1a2a',
            ambientAudio: 'underwater_ambient',
            
// Terrain tile assignments — 2MT illustrated hex tiles
            terrainTiles: {
                // Row 0
                '2,0': 'wetlands_4',
                '3,0': 'wetlands_6',
                '4,0': 'dirt_path_1_n',
                '5,0': 'wetlands_6',
                '6,0': 'wetlands_6',
                // Row 1
                '1,1': 'wetlands_5',
                '2,1': 'wetlands_3',
                '3,1': 'wetlands_4',
                '4,1': 'dirt_path_1_n',
                '5,1': 'wetlands_6',
                '6,1': 'wetlands_5',
                // Row 2
                '0,2': 'wetlands_3',
                '1,2': 'wetlands_6',
                '3,2': 'wetlands_6',
                '4,2': 'wetlands_3',
                '7,2': 'wetlands_4',
                // Row 3
                '0,3': 'plains_damp_3',
                '1,3': 'wetlands_6',
                '2,3': 'wetlands_3',
                '3,3': 'plains_damp_2',
                '4,3': 'plains_damp_1',
                '5,3': 'plains_damp_1',
                '6,3': 'plains_damp_2',
                '7,3': 'wetlands_6',
                // Row 4
                '0,4': 'plains_damp_2',
                '1,4': 'water_-_swamp_still_water_1',
                '2,4': 'plains_damp_2',
                '5,4': 'wetlands_5',
                '6,4': 'water_-_swamp_still_water_3',
                // Row 5
                '1,5': 'wetlands_5',
                '2,5': 'wetlands_4',
                '3,5': 'ruin_lush',
                '4,5': 'wetlands_5',
                '5,5': 'urban_-_modern_town_abandoned_lush_1',
                '6,5': 'plains_damp_3',
                '7,5': 'wetlands_4',
                // Row 6
                '0,6': 'wetlands_4',
                '1,6': 'plains_damp_2',
                '3,6': 'wetlands_6',
                '4,6': 'wetlands_5',
                '5,6': 'plains_damp_3',
                '7,6': 'wetlands_7',
                // Row 7
                '0,7': 'plains_damp_2',
                '1,7': 'water_-_swamp_still_water_2',
                '2,7': 'wetlands_7',
                '6,7': 'water_-_swamp_soft_waves_2',
                '7,7': 'wetlands_3',
                // Row 8
                '0,8': 'wetlands_5',
                '1,8': 'plains_damp_3',
                '2,8': 'wetlands_6',
                '3,8': 'wetlands_7',
                '4,8': 'wetlands_6',
                '5,8': 'wetlands_4',
                '6,8': 'plains_damp_2',
                '7,8': 'plains_damp_3',
                // Row 9
                '1,9': 'wetlands_7',
                '3,9': 'wetlands_3',
                '4,9': 'dirt_path_1_n',
                '5,9': 'wetlands_4',
                // Row 10
                '2,10': 'wetlands_6',
                '3,10': 'wetlands_7',
                '4,10': 'dirt_path_1_s',
                '5,10': 'wetlands_6',
                '6,10': 'wetlands_7',
            },
            terrainTileDefault: 'base_lush',
            
            maxPlayers: 4,
            pvpEnabled: false,
            
            levelRange: { min: 32, max: 40 },
            
            npcs: [
                { creatureId: 'sea_serpent', subtypeId: 'normal', count: 2, levelRange: [32, 36] },
                { creatureId: 'sea_serpent', subtypeId: 'greater', count: 1, levelRange: [36, 40] },
                { creatureId: 'drowned_dead', subtypeId: 'normal', count: 2, levelRange: [32, 36] },
                { creatureId: 'drowned_dead', subtypeId: 'greater', count: 1, levelRange: [36, 39] },
                { creatureId: 'stone_golem', subtypeId: 'chief', count: 1, levelRange: [35, 40] },
                { creatureId: 'bog_beast', subtypeId: 'chief', count: 1, levelRange: [34, 38] }
            ],
            maxNPCs: 3,
            respawnDelay: 22000,
            
            obstacles: [
                { q: 2, r: 2 }, { q: 5, r: 2 }, { q: 6, r: 2 },
                { q: 3, r: 4 }, { q: 4, r: 4 },
                { q: 2, r: 6 }, { q: 6, r: 6 },
                { q: 3, r: 7 }, { q: 4, r: 7 }, { q: 5, r: 7 },
                { q: 2, r: 9 }, { q: 6, r: 9 }
            ],
            
            specialHexes: [
                { q: 3, r: 3, type: 'deep_water', effect: 'slow', modifier: 0.5 },
                { q: 5, r: 3, type: 'deep_water', effect: 'slow', modifier: 0.5 },
                { q: 3, r: 5, type: 'deep_water', effect: 'slow', modifier: 0.5 },
                { q: 5, r: 5, type: 'deep_water', effect: 'slow', modifier: 0.5 },
                { q: 4, r: 8, type: 'ancient_ward', effect: 'heal', modifier: 6 },
                { q: 3, r: 8, type: 'ancient_ward', effect: 'heal', modifier: 6 }
            ],
            
            exits: [
                { q: 4, r: 0, targetMap: 'swamp', targetQ: 4, targetR: 10, label: 'To Drowned Reaches', direction: 'N' },
                { q: 4, r: 10, targetMap: 'shattered_depths', targetQ: 4, targetR: 0, label: 'To Shattered Depths', direction: 'S' }
            ],
            
            ambientEvents: [
                'Water laps against temple pillars that have stood for millennia.',
                'A sea serpent\'s coils break the surface, then vanish into the murk.',
                'The drowned dead drift beneath the water, watching with hollow eyes.',
                'Ancient mosaics on the flooded floor depict a world before the Shattering.',
                'Something massive shifts in the deepest flooded chamber. The water surges.',
                'Luminous coral has overgrown the temple altar—it pulses with faint magic.',
                'A stone golem stands waist-deep in water, still guarding its post after centuries.',
                'The ceiling has collapsed here, letting grey light filter through the water.',
                'You hear singing from below the waterline. Beautiful. Terrible.',
                'Carvings on the walls show people fleeing upward as water rises. A record of doom.'
            ],
            
            entryText: 'You descend into the Sunken Ruins—a temple of the lost civilization now half-drowned by centuries of rising waters. Massive pillars rise from the murk, carved with prayers to forgotten gods. Sea serpents glide through flooded corridors, and the drowned dead remember the day the water came.'
        },
        
        // === THORNWOOD HEART (Level 36-45) ===
        // Shape: Dense forest — thick canopy, tangled paths
        thornwood_heart: {
            id: 'thornwood_heart',
            name: 'Thornwood Heart',
            description: 'The corrupted heart of the Thornwood forest. Ancient treants guard something dark, and Grakthar\'s elite orcs have made this their stronghold. The trees themselves are hostile.',
            theme: 'forest',
            difficulty: 'very_hard',
            
            gridWidth: 8,
            gridHeight: 11,
            
            excludedHexes: [
                {q:0,r:0}, {q:7,r:0},
                {q:0,r:1}, {q:7,r:1},
                {q:7,r:3},
                {q:0,r:4},
                {q:7,r:7},
                {q:0,r:8},
                {q:0,r:10}, {q:7,r:10}
            ],
            
            backgroundImage: null,
            backgroundColor: '#0a1a0a',
            ambientAudio: 'dark_forest',
            
// Terrain tile assignments — 2MT illustrated hex tiles
            terrainTiles: {
                // Row 0
                '1,0': 'sparse_trees_1',
                '2,0': 'sparse_trees_2',
                '3,0': 'sparse_trees_2',
                '4,0': 'dirt_path_1_n',
                '5,0': 'plains_lush_2',
                '6,0': 'sparse_trees_1',
                // Row 1
                '1,1': 'plains_lush_2',
                '2,1': 'sparse_trees_2',
                '3,1': 'sparse_trees_1',
                '4,1': 'dirt_path_1_n',
                '5,1': 'plains_lush_1',
                '6,1': 'sparse_trees_1',
                // Row 2
                '0,2': 'sparse_trees_1',
                '2,2': 'sparse_trees_2',
                '4,2': 'sparse_trees_2',
                '6,2': 'sparse_trees_2',
                '7,2': 'sparse_trees_1',
                // Row 3
                '0,3': 'sparse_trees_2',
                '1,3': 'river_1_se',
                '2,3': 'river_4_se',
                '3,3': 'plains_lush_1',
                '4,3': 'plains_lush_2',
                '5,3': 'sparse_trees_2',
                '6,3': 'sparse_trees_1',
                // Row 4
                '1,4': 'sparse_trees_2',
                '3,4': 'river_1_s',
                '4,4': 'sparse_trees_2',
                '5,4': 'sparse_trees_1',
                '7,4': 'sparse_trees_1',
                // Row 5
                '0,5': 'sparse_trees_2',
                '2,5': 'sparse_trees_1',
                '3,5': 'ruin_lush',
                '5,5': 'sparse_trees_1',
                '6,5': 'sparse_trees_2',
                // Row 6
                '0,6': 'sparse_trees_1',
                '1,6': 'sparse_trees_2',
                '2,6': 'plains_lush_1',
                '3,6': 'river_1_s',
                '4,6': 'sparse_trees_2',
                '5,6': 'sparse_trees_2',
                '6,6': 'sparse_trees_1',
                '7,6': 'sparse_trees_2',
                // Row 7
                '0,7': 'sparse_trees_1',
                '1,7': 'plains_lush_1',
                '3,7': 'sparse_trees_2',
                '4,7': 'river_1_se',
                '6,7': 'plains_lush_1',
                // Row 8
                '1,8': 'plains_lush_1',
                '2,8': 'plains_lush_1',
                '3,8': 'plains_lush_2',
                '4,8': 'sparse_trees_1',
                '5,8': 'river_1_s',
                '6,8': 'sparse_trees_1',
                '7,8': 'plains_lush_2',
                // Row 9
                '0,9': 'sparse_trees_1',
                '1,9': 'plains_lush_2',
                '2,9': 'sparse_trees_2',
                '4,9': 'plains_lush_1',
                '6,9': 'sparse_trees_2',
                '7,9': 'sparse_trees_1',
                // Row 10
                '1,10': 'sparse_trees_1',
                '2,10': 'sparse_trees_1',
                '3,10': 'sparse_trees_2',
                '4,10': 'sparse_trees_2',
                '5,10': 'sparse_trees_2',
                '6,10': 'sparse_trees_2',
            },
            terrainTileDefault: 'base_lush',
            
            maxPlayers: 4,
            pvpEnabled: false,
            
            levelRange: { min: 36, max: 45 },
            
            npcs: [
                { creatureId: 'ancient_treant', subtypeId: 'normal', count: 1, levelRange: [38, 42] },
                { creatureId: 'ancient_treant', subtypeId: 'greater', count: 1, levelRange: [42, 45] },
                { creatureId: 'shadow_wolf', subtypeId: 'normal', count: 2, levelRange: [36, 40] },
                { creatureId: 'shadow_wolf', subtypeId: 'greater', count: 1, levelRange: [40, 44] },
                { creatureId: 'orc', subtypeId: 'chief', count: 1, levelRange: [38, 42] },
                { creatureId: 'mountain_orc', subtypeId: 'chief', count: 1, levelRange: [40, 45] },
                { creatureId: 'forest_giant', subtypeId: 'greater', count: 1, levelRange: [38, 43] }
            ],
            maxNPCs: 3,
            respawnDelay: 22000,
            
            obstacles: [
                { q: 1, r: 2 }, { q: 3, r: 2 }, { q: 5, r: 2 },
                { q: 2, r: 4 }, { q: 6, r: 4 },
                { q: 1, r: 5 }, { q: 4, r: 5 }, { q: 7, r: 5 },
                { q: 2, r: 7 }, { q: 5, r: 7 },
                { q: 3, r: 9 }, { q: 5, r: 9 }
            ],
            
            specialHexes: [
                { q: 3, r: 3, type: 'corrupted', effect: 'damage', modifier: 6 },
                { q: 5, r: 3, type: 'corrupted', effect: 'damage', modifier: 6 },
                { q: 3, r: 6, type: 'corrupted', effect: 'damage', modifier: 6 },
                { q: 5, r: 6, type: 'corrupted', effect: 'damage', modifier: 6 },
                { q: 4, r: 8, type: 'magical_residue', effect: 'heal', modifier: 5 }
            ],
            
            exits: [
                { q: 4, r: 0, targetMap: 'cave', targetQ: 4, targetR: 11, label: 'To Deep Thornwood', direction: 'N' }
            ],
            
            ambientEvents: [
                'The canopy is so thick no sunlight reaches the ground. Bioluminescent fungi provide dim light.',
                'A shadow wolf melts into darkness between the trees. You hear it breathing.',
                'An ancient treant shifts—what you thought was a tree trunk has eyes.',
                'Orc war drums echo through the forest. Grakthar\'s elite are near.',
                'The corruption here is visible—black veins run through every tree.',
                'Thorns the size of daggers grow from the underbrush. The forest is a weapon.',
                'You find an orc shrine built around a pulsing dark crystal. What did they find?',
                'Shadow wolves howl in unison. The pack is communicating.',
                'The trees creak and groan, leaning toward you as you pass.',
                'Something ancient and angry watches from the heart of the wood.'
            ],
            
            entryText: 'You push into the Thornwood Heart—the corrupted core of the forest where even the trees are hostile. The canopy blocks all light; bioluminescent fungi cast everything in sickly green. Ancient treants guard this place, and Grakthar\'s elite orcs have built their stronghold among the corruption. Something terrible festers here.'
        },
        
        // === DRAGON'S APPROACH (Level 42-50) ===
        // Shape: Volcanic mountain — lava vents, scorched earth
        dragons_approach: {
            id: 'dragons_approach',
            name: 'Dragon\'s Approach',
            description: 'The volcanic slopes leading to Vyraxion\'s lair in the Wraithspine summit. Drakes patrol the skies and fire elementals guard the vents. The heat is unbearable.',
            theme: 'mountain',
            difficulty: 'very_hard',
            
            gridWidth: 8,
            gridHeight: 12,
            
            excludedHexes: [
                {q:0,r:0}, {q:1,r:0}, {q:6,r:0}, {q:7,r:0},
                {q:0,r:1}, {q:7,r:1},
                {q:0,r:5},
                {q:7,r:6},
                {q:0,r:10}, {q:7,r:10},
                {q:0,r:11}, {q:1,r:11}, {q:6,r:11}, {q:7,r:11}
            ],
            
            backgroundImage: null,
            backgroundColor: '#2a0a0a',
            ambientAudio: 'volcanic_rumble',
            
// Terrain tile assignments — 2MT illustrated hex tiles
            terrainTiles: {
                // Row 0
                '2,0': 'base_rocky',
                '3,0': 'dirt_path_rocky',
                '4,0': 'base_rocky',
                '5,0': 'base_rocky',
                // Row 1
                '1,1': 'base_rocky',
                '2,1': 'base_rocky',
                '3,1': 'dirt_path_1_n',
                '4,1': 'base_rocky',
                '5,1': 'base_rocky',
                '6,1': 'mountains_foothills_rocky',
                // Row 2
                '0,2': 'base_rocky',
                '1,2': 'mountains_foothills_rocky',
                '3,2': 'mountains_foothills_rocky',
                '4,2': 'base_rocky',
                '6,2': 'base_rocky',
                '7,2': 'base_rocky',
                // Row 3
                '0,3': 'base_rocky',
                '1,3': 'mountains_foothills_rocky',
                '2,3': 'base_rocky',
                '3,3': 'mountain_volcano_rocky_1',
                '4,3': 'base_rocky',
                '5,3': 'mountain_volcano_rocky_2',
                '6,3': 'base_rocky',
                '7,3': 'mountains_low_rocky',
                // Row 4
                '0,4': 'base_rocky',
                '2,4': 'mountains_low_rocky',
                '5,4': 'mountains_low_rocky',
                '7,4': 'base_rocky',
                // Row 5
                '1,5': 'mountains_low_rocky',
                '2,5': 'base_rocky',
                '5,5': 'base_rocky',
                '6,5': 'base_rocky',
                '7,5': 'base_rocky',
                // Row 6
                '0,6': 'base_rocky',
                '1,6': 'base_rocky',
                '2,6': 'mountains_low_rocky',
                '5,6': 'base_rocky',
                '6,6': 'base_rocky',
                // Row 7
                '0,7': 'base_rocky',
                '1,7': 'base_rocky',
                '2,7': 'base_rocky',
                '3,7': 'base_rocky',
                '4,7': 'mountains_foothills_rocky',
                '5,7': 'base_rocky',
                '6,7': 'base_rocky',
                '7,7': 'base_rocky',
                // Row 8
                '0,8': 'base_rocky',
                '2,8': 'base_rocky',
                '3,8': 'mountain_volcano_rocky_1',
                '4,8': 'mountains_low_rocky',
                '5,8': 'mountain_volcano_rocky_2',
                '7,8': 'base_rocky',
                // Row 9
                '0,9': 'base_rocky',
                '1,9': 'base_rocky',
                '2,9': 'base_rocky',
                '3,9': 'base_rocky',
                '4,9': 'base_rocky',
                '5,9': 'base_rocky',
                '6,9': 'mountains_foothills_rocky',
                '7,9': 'base_rocky',
                // Row 10
                '1,10': 'base_rocky',
                '3,10': 'base_rocky',
                '4,10': 'dirt_path_1_s',
                '6,10': 'base_rocky',
                // Row 11
                '2,11': 'base_rocky',
                '3,11': 'mountains_foothills_rocky',
                '4,11': 'dirt_path_rocky',
                '5,11': 'base_rocky',
            },
            terrainTileDefault: 'base_rocky',
            
            maxPlayers: 4,
            pvpEnabled: false,
            
            levelRange: { min: 42, max: 50 },
            
            npcs: [
                { creatureId: 'drake', subtypeId: 'normal', count: 2, levelRange: [42, 46] },
                { creatureId: 'drake', subtypeId: 'greater', count: 1, levelRange: [46, 50] },
                { creatureId: 'fire_elemental', subtypeId: 'normal', count: 2, levelRange: [42, 46] },
                { creatureId: 'fire_elemental', subtypeId: 'greater', count: 1, levelRange: [46, 50] },
                { creatureId: 'death_knight', subtypeId: 'normal', count: 1, levelRange: [44, 48] },
                { creatureId: 'ice_wyvern', subtypeId: 'chief', count: 1, levelRange: [45, 50] }
            ],
            maxNPCs: 3,
            respawnDelay: 25000,
            
            obstacles: [
                { q: 2, r: 2 }, { q: 5, r: 2 },
                { q: 1, r: 4 }, { q: 3, r: 4 }, { q: 4, r: 4 }, { q: 6, r: 4 },
                { q: 3, r: 5 }, { q: 4, r: 5 },
                { q: 3, r: 6 }, { q: 4, r: 6 },
                { q: 1, r: 8 }, { q: 6, r: 8 },
                { q: 2, r: 10 }, { q: 5, r: 10 }
            ],
            
            specialHexes: [
                { q: 2, r: 5, type: 'lava_vent', effect: 'damage', modifier: 8 },
                { q: 5, r: 5, type: 'lava_vent', effect: 'damage', modifier: 8 },
                { q: 2, r: 7, type: 'lava_vent', effect: 'damage', modifier: 8 },
                { q: 5, r: 7, type: 'lava_vent', effect: 'damage', modifier: 8 },
                { q: 3, r: 9, type: 'scorched', effect: 'damage', modifier: 5 },
                { q: 4, r: 9, type: 'scorched', effect: 'damage', modifier: 5 }
            ],
            
            exits: [
                { q: 3, r: 0, targetMap: 'wraithspine_pass', targetQ: 3, targetR: 11, label: 'To Wraithspine Pass', direction: 'N' },
                { q: 4, r: 11, targetMap: 'vyraxion_lair', targetQ: 3, targetR: 0, label: 'To Vyraxion\'s Lair', direction: 'S' }
            ],
            
            ambientEvents: [
                'The ground radiates heat. Lava glows orange through cracks in the stone.',
                'A drake circles overhead, silhouetted against the volcanic plume.',
                'Fire elementals dance among the lava vents, feeding on the heat.',
                'The air shimmers with heat haze. Breathing hurts.',
                'Dragon bones litter the slope—even drakes die here.',
                'A death knight watches from a scorched ridge. What is it doing this far from the Barrens?',
                'Vyraxion\'s lair is above. You can feel the ancient dragon\'s presence.',
                'Volcanic tremors shake the ground. The mountain is alive.',
                'You find claw marks in solid basalt. Something enormous climbed here.',
                'The summit glows with inner fire. Vyraxion the Ashborn awaits.'
            ],
            
            entryText: 'You ascend Dragon\'s Approach—the volcanic slopes of the Wraithspine summit where Vyraxion the Ashborn makes its lair. The heat is staggering, lava vents belch fire, and drakes patrol the burning sky. This is the threshold of the most dangerous place on the Shattered Coast.'
        },
        
        // === PALE COURT FORTRESS (Level 48-58) ===  BOSS: The Pale King
        // Shape: Fortress — symmetrical walls, inner courtyard
        pale_fortress: {
            id: 'pale_fortress',
            name: 'Pale Court Fortress',
            description: 'The seat of the Pale Court\'s power in the heart of the Ashen Barrens. Dark stone towers rise from dead earth. Inside, the undead lord plots the expansion of his domain.',
            theme: 'wasteland',
            difficulty: 'very_hard',
            
            gridWidth: 8,
            gridHeight: 12,
            
            excludedHexes: [
                {q:0,r:0}, {q:7,r:0},
                {q:0,r:1}, {q:7,r:1},
                {q:0,r:5}, {q:7,r:5},
                {q:0,r:10}, {q:7,r:10},
                {q:0,r:11}, {q:7,r:11}
            ],
            
            backgroundImage: null,
            backgroundColor: '#0d0d1a',
            ambientAudio: 'fortress_ambient',
            
// Terrain tile assignments — 2MT illustrated hex tiles
            terrainTiles: {
                // Row 0
                '1,0': 'plains_desert_5',
                '2,0': 'snow_field_3',
                '3,0': 'base_rocky',
                '4,0': 'dirt_path_rocky',
                '5,0': 'base_rocky',
                '6,0': 'base_rocky',
                // Row 1
                '1,1': 'base_rocky',
                '2,1': 'base_rocky',
                '3,1': 'plains_desert_4',
                '4,1': 'dirt_path_1_n',
                '5,1': 'snow_field_2',
                '6,1': 'base_rocky',
                // Row 2
                '0,2': 'plains_desert_5',
                '1,2': 'snow_field_3',
                '3,2': 'plains_desert_4',
                '4,2': 'snow_field_2',
                '6,2': 'snow_field_1',
                '7,2': 'snow_field_2',
                // Row 3
                '0,3': 'snow_field_2',
                '1,3': 'snow_field_1',
                '2,3': 'snow_field_1',
                '3,3': 'ruin_desert',
                '4,3': 'plains_desert_5',
                '5,3': 'urban_-_tower_lush',
                '6,3': 'plains_desert_4',
                '7,3': 'snow_field_3',
                // Row 4
                '0,4': 'plains_desert_5',
                '2,4': 'snow_field_1',
                '3,4': 'snow_field_2',
                '4,4': 'plains_desert_5',
                '5,4': 'snow_field_3',
                '7,4': 'snow_field_2',
                // Row 5
                '1,5': 'snow_field_1',
                '2,5': 'plains_desert_5',
                '5,5': 'snow_field_2',
                '6,5': 'base_rocky',
                // Row 6
                '0,6': 'snow_field_1',
                '1,6': 'snow_field_1',
                '2,6': 'plains_desert_4',
                '5,6': 'snow_field_1',
                '6,6': 'plains_desert_5',
                '7,6': 'plains_desert_5',
                // Row 7
                '0,7': 'plains_desert_4',
                '1,7': 'snow_field_3',
                '2,7': 'snow_field_2',
                '3,7': 'snow_field_2',
                '4,7': 'snow_field_2',
                '5,7': 'snow_field_3',
                '6,7': 'plains_desert_5',
                '7,7': 'snow_field_1',
                // Row 8
                '0,8': 'plains_desert_5',
                '2,8': 'plains_desert_5',
                '3,8': 'ruin_desert',
                '4,8': 'snow_field_1',
                '5,8': 'ruin_desert',
                '7,8': 'snow_field_1',
                // Row 9
                '0,9': 'snow_field_1',
                '1,9': 'snow_field_1',
                '2,9': 'plains_desert_4',
                '3,9': 'plains_desert_4',
                '4,9': 'snow_field_2',
                '5,9': 'base_rocky',
                '6,9': 'base_rocky',
                '7,9': 'snow_field_2',
                // Row 10
                '1,10': 'snow_field_2',
                '3,10': 'plains_desert_4',
                '4,10': 'dirt_path_1_s',
                '6,10': 'plains_desert_5',
                // Row 11
                '1,11': 'base_rocky',
                '2,11': 'base_rocky',
                '3,11': 'plains_desert_5',
                '4,11': 'dirt_path_rocky',
                '5,11': 'plains_desert_4',
                '6,11': 'snow_field_1',
            },
            terrainTileDefault: 'base_rocky',
            
            maxPlayers: 4,
            pvpEnabled: false,
            
            levelRange: { min: 48, max: 58 },
            
            npcs: [
                { creatureId: 'death_knight', subtypeId: 'greater', count: 2, levelRange: [48, 53] },
                { creatureId: 'soul_harvester', subtypeId: 'normal', count: 2, levelRange: [49, 54] },
                { creatureId: 'soul_harvester', subtypeId: 'greater', count: 1, levelRange: [54, 58] },
                { creatureId: 'pale_knight', subtypeId: 'chief', count: 1, levelRange: [50, 55] },
                { creatureId: 'wraith', subtypeId: 'chief', count: 1, levelRange: [50, 56] },
                // BOSS: The Pale King — 180s respawn (3 min)
                { creatureId: 'pale_king', subtypeId: 'boss', count: 1, levelRange: [55, 58], isBoss: true, respawnDelay: 180000 }
            ],
            maxNPCs: 4,
            respawnDelay: 25000,
            
            obstacles: [
                { q: 2, r: 2 }, { q: 5, r: 2 },
                { q: 1, r: 4 }, { q: 6, r: 4 },
                { q: 3, r: 5 }, { q: 4, r: 5 },
                { q: 3, r: 6 }, { q: 4, r: 6 },
                { q: 1, r: 8 }, { q: 6, r: 8 },
                { q: 2, r: 10 }, { q: 5, r: 10 }
            ],
            
            specialHexes: [
                { q: 3, r: 3, type: 'necrotic', effect: 'damage', modifier: 8 },
                { q: 4, r: 3, type: 'necrotic', effect: 'damage', modifier: 8 },
                { q: 3, r: 9, type: 'necrotic', effect: 'damage', modifier: 8 },
                { q: 4, r: 9, type: 'necrotic', effect: 'damage', modifier: 8 },
                { q: 3, r: 7, type: 'corrupted', effect: 'damage', modifier: 10 },
                { q: 4, r: 7, type: 'corrupted', effect: 'damage', modifier: 10 }
            ],
            
            exits: [
                { q: 4, r: 0, targetMap: 'pale_outskirts', targetQ: 4, targetR: 10, label: 'To Pale Court Outskirts', direction: 'N' },
                { q: 4, r: 11, targetMap: 'dreaming_spire', targetQ: 4, targetR: 0, label: 'To The Dreaming Spire', direction: 'S' }
            ],
            
            ambientEvents: [
                'The fortress walls pulse with dark energy. They\'re not just stone—they\'re alive.',
                'Death Knights stand guard at every archway, watching with burning eyes.',
                'A Soul Harvester drifts past, its hands trailing wisps of stolen life.',
                'The Pale King\'s presence is a weight on your soul. He knows you\'re here.',
                'Undead soldiers drill in the courtyard. Disciplined. Organized. Terrifying.',
                'Cold radiates from the walls. The fortress itself drains warmth.',
                'You hear screaming from deep within—souls being processed.',
                'The Pale Court\'s banner hangs everywhere: a white crown on black.',
                'Something watches from the throne room. Something ancient and patient.',
                'Every stone in this fortress was placed with purpose. This isn\'t mindless evil—it\'s calculated.'
            ],
            
            entryText: 'You stand before the Pale Court Fortress—dark stone towers rising from the dead earth of the Ashen Barrens. The air is tomb-cold. Death Knights guard the gates, Soul Harvesters drift through the halls, and somewhere within, the Pale King sits upon a throne of bone.'
        },
        
        // === ABYSSAL RIFT (Level 55-65) ===
        // Shape: Cavern with void cracks — irregular, dangerous terrain
        abyssal_rift: {
            id: 'abyssal_rift',
            name: 'The Abyssal Rift',
            description: 'A tear in reality beneath the Shattered Coast where the Sleeping Darkness bleeds through. Void creatures slip between dimensions. The air tastes of madness.',
            theme: 'dungeon',
            difficulty: 'very_hard',
            
            gridWidth: 8,
            gridHeight: 11,
            
            excludedHexes: [
                {q:0,r:0}, {q:1,r:0}, {q:6,r:0}, {q:7,r:0},
                {q:0,r:1}, {q:7,r:1},
                {q:7,r:4},
                {q:0,r:7},
                {q:0,r:9}, {q:7,r:9},
                {q:0,r:10}, {q:1,r:10}, {q:6,r:10}, {q:7,r:10}
            ],
            
            backgroundImage: null,
            backgroundColor: '#05000d',
            ambientAudio: 'void_ambient',
            
// Terrain tile assignments — 2MT illustrated hex tiles
            terrainTiles: {
                // Row 0
                '2,0': 'base_rocky',
                '3,0': 'plains_damp_2',
                '4,0': 'dirt_path_rocky',
                '5,0': 'base_rocky',
                // Row 1
                '1,1': 'base_rocky',
                '2,1': 'plains_damp_1',
                '3,1': 'base_rocky',
                '4,1': 'base_rocky',
                '5,1': 'base_rocky',
                '6,1': 'plains_damp_1',
                // Row 2
                '0,2': 'plains_damp_1',
                '1,2': 'base_rocky',
                '3,2': 'base_rocky',
                '4,2': 'plains_damp_1',
                '6,2': 'base_rocky',
                '7,2': 'base_rocky',
                // Row 3
                '0,3': 'base_rocky',
                '1,3': 'base_rocky',
                '2,3': 'base_rocky',
                '3,3': 'plains_damp_2',
                '4,3': 'base_rocky',
                '5,3': 'base_rocky',
                '6,3': 'plains_damp_1',
                '7,3': 'base_rocky',
                // Row 4
                '0,4': 'base_rocky',
                '1,4': 'plains_damp_1',
                '2,4': 'base_rocky',
                '5,4': 'base_rocky',
                '6,4': 'plains_damp_2',
                // Row 5
                '0,5': 'plains_damp_1',
                '2,5': 'plains_damp_1',
                '3,5': 'plains_damp_2',
                '4,5': 'base_rocky',
                '5,5': 'base_rocky',
                '7,5': 'base_rocky',
                // Row 6
                '0,6': 'base_rocky',
                '1,6': 'base_rocky',
                '2,6': 'plains_damp_2',
                '5,6': 'base_rocky',
                '6,6': 'base_rocky',
                '7,6': 'base_rocky',
                // Row 7
                '1,7': 'plains_damp_1',
                '2,7': 'base_rocky',
                '3,7': 'plains_damp_2',
                '4,7': 'base_rocky',
                '5,7': 'base_rocky',
                '6,7': 'base_rocky',
                '7,7': 'base_rocky',
                // Row 8
                '0,8': 'base_rocky',
                '1,8': 'base_rocky',
                '3,8': 'base_rocky',
                '4,8': 'base_rocky',
                '6,8': 'base_rocky',
                '7,8': 'plains_damp_2',
                // Row 9
                '1,9': 'base_rocky',
                '2,9': 'base_rocky',
                '3,9': 'base_rocky',
                '4,9': 'base_rocky',
                '5,9': 'base_rocky',
                '6,9': 'base_rocky',
                // Row 10
                '2,10': 'base_rocky',
                '3,10': 'base_rocky',
                '4,10': 'dirt_path_rocky',
                '5,10': 'base_rocky',
            },
            terrainTileDefault: 'base_rocky',
            terrainFilter: 'terrain-filter-dungeon',
            
            maxPlayers: 4,
            pvpEnabled: false,
            
            levelRange: { min: 55, max: 65 },
            
            npcs: [
                { creatureId: 'void_spawn', subtypeId: 'normal', count: 2, levelRange: [55, 60] },
                { creatureId: 'void_spawn', subtypeId: 'greater', count: 1, levelRange: [60, 65] },
                { creatureId: 'corrupted_golem', subtypeId: 'normal', count: 1, levelRange: [56, 61] },
                { creatureId: 'corrupted_golem', subtypeId: 'greater', count: 1, levelRange: [61, 65] },
                { creatureId: 'nightmare_stalker', subtypeId: 'normal', count: 1, levelRange: [58, 63] },
                { creatureId: 'wraith', subtypeId: 'chief', count: 1, levelRange: [58, 63] }
            ],
            maxNPCs: 3,
            respawnDelay: 25000,
            
            obstacles: [
                { q: 2, r: 2 }, { q: 5, r: 2 },
                { q: 3, r: 4 }, { q: 4, r: 4 },
                { q: 1, r: 5 }, { q: 6, r: 5 },
                { q: 3, r: 6 }, { q: 4, r: 6 },
                { q: 2, r: 8 }, { q: 5, r: 8 }
            ],
            
            specialHexes: [
                { q: 2, r: 3, type: 'void_crack', effect: 'damage', modifier: 10 },
                { q: 5, r: 3, type: 'void_crack', effect: 'damage', modifier: 10 },
                { q: 2, r: 7, type: 'void_crack', effect: 'damage', modifier: 10 },
                { q: 5, r: 7, type: 'void_crack', effect: 'damage', modifier: 10 },
                { q: 3, r: 5, type: 'corrupted', effect: 'damage', modifier: 12 },
                { q: 4, r: 5, type: 'corrupted', effect: 'damage', modifier: 12 }
            ],
            
            exits: [
                { q: 4, r: 0, targetMap: 'hidden_caves', targetQ: 4, targetR: 10, label: 'To Hidden Caves', direction: 'N' },
                { q: 4, r: 10, targetMap: 'convergence', targetQ: 4, targetR: 0, label: 'To The Convergence', direction: 'S' }
            ],
            
            ambientEvents: [
                'The ground cracks open, revealing impossible darkness beneath.',
                'A void spawn phases through solid rock, tentacles grasping.',
                'Reality flickers—for a moment, you see another world overlaid on this one.',
                'The Sleeping Darkness whispers at the edge of hearing. Don\'t listen.',
                'Corrupted golems guard the rift, their crystal cores pulsing with wrong light.',
                'Space bends near the rift. Distances change when you\'re not looking.',
                'You feel a presence—vast, patient, and incomprehensibly ancient.',
                'The air tastes of copper and ozone. Reality is bleeding.',
                'Something moves in the void below. Something too large to comprehend.',
                'The lost civilization built seals here. Most are broken now.'
            ],
            
            entryText: 'You descend into the Abyssal Rift—a wound in reality where the Sleeping Darkness bleeds through from whatever lies beneath. The air shimmers with impossible colors, distances change without warning, and void creatures slip between dimensions. This is where the world is thinnest.'
        },
        
        // === SHATTERED DEPTHS (Level 58-68) === BOSS: The Eternal Warden
        // Shape: Ancient underground complex — structured chambers
        shattered_depths: {
            id: 'shattered_depths',
            name: 'Shattered Depths',
            description: 'The deepest level of the lost civilization\'s underground complex. Automatons and crystal sentinels still guard secrets that could change everything.',
            theme: 'dungeon',
            difficulty: 'very_hard',
            
            gridWidth: 8,
            gridHeight: 12,
            
            excludedHexes: [
                {q:0,r:0}, {q:7,r:0},
                {q:0,r:1}, {q:7,r:1},
                {q:0,r:6}, {q:7,r:6},
                {q:0,r:10}, {q:7,r:10},
                {q:0,r:11}, {q:7,r:11}
            ],
            
            backgroundImage: null,
            backgroundColor: '#0a0a1e',
            ambientAudio: 'ancient_machinery',
            
// Terrain tile assignments — 2MT illustrated hex tiles
            terrainTiles: {
                // Row 0
                '1,0': 'base_rocky',
                '2,0': 'base_rocky',
                '3,0': 'plains_damp_1',
                '4,0': 'dirt_path_rocky',
                '5,0': 'base_rocky',
                '6,0': 'base_rocky',
                // Row 1
                '1,1': 'plains_damp_2',
                '2,1': 'base_rocky',
                '3,1': 'base_rocky',
                '4,1': 'base_rocky',
                '5,1': 'plains_damp_1',
                '6,1': 'base_rocky',
                // Row 2
                '0,2': 'base_rocky',
                '1,2': 'plains_damp_1',
                '3,2': 'plains_damp_1',
                '4,2': 'base_rocky',
                '6,2': 'base_rocky',
                '7,2': 'base_rocky',
                // Row 3
                '0,3': 'base_rocky',
                '1,3': 'base_rocky',
                '2,3': 'base_rocky',
                '3,3': 'base_rocky',
                '4,3': 'base_rocky',
                '5,3': 'base_rocky',
                '6,3': 'plains_damp_2',
                '7,3': 'base_rocky',
                // Row 4
                '0,4': 'base_rocky',
                '2,4': 'base_rocky',
                '3,4': 'plains_damp_1',
                '4,4': 'plains_damp_1',
                '5,4': 'base_rocky',
                '7,4': 'base_rocky',
                // Row 5
                '0,5': 'plains_damp_2',
                '1,5': 'plains_damp_2',
                '2,5': 'base_rocky',
                '5,5': 'base_rocky',
                '6,5': 'base_rocky',
                '7,5': 'base_rocky',
                // Row 6
                '1,6': 'plains_damp_2',
                '2,6': 'base_rocky',
                '3,6': 'base_rocky',
                '4,6': 'base_rocky',
                '5,6': 'base_rocky',
                '6,6': 'base_rocky',
                // Row 7
                '0,7': 'base_rocky',
                '1,7': 'plains_damp_2',
                '2,7': 'base_rocky',
                '5,7': 'plains_damp_1',
                '6,7': 'base_rocky',
                '7,7': 'base_rocky',
                // Row 8
                '0,8': 'base_rocky',
                '2,8': 'plains_damp_2',
                '3,8': 'plains_damp_2',
                '4,8': 'base_rocky',
                '5,8': 'base_rocky',
                '7,8': 'base_rocky',
                // Row 9
                '0,9': 'base_rocky',
                '1,9': 'base_rocky',
                '2,9': 'base_rocky',
                '3,9': 'base_rocky',
                '4,9': 'base_rocky',
                '5,9': 'base_rocky',
                '6,9': 'base_rocky',
                '7,9': 'base_rocky',
                // Row 10
                '1,10': 'base_rocky',
                '3,10': 'base_rocky',
                '4,10': 'base_rocky',
                '6,10': 'base_rocky',
                // Row 11
                '1,11': 'base_rocky',
                '2,11': 'plains_damp_1',
                '3,11': 'base_rocky',
                '4,11': 'dirt_path_rocky',
                '5,11': 'base_rocky',
                '6,11': 'base_rocky',
            },
            terrainTileDefault: 'base_rocky',
            terrainFilter: 'terrain-filter-dungeon',
            
            maxPlayers: 4,
            pvpEnabled: false,
            
            levelRange: { min: 58, max: 68 },
            
            npcs: [
                { creatureId: 'automaton', subtypeId: 'normal', count: 2, levelRange: [58, 63] },
                { creatureId: 'automaton', subtypeId: 'greater', count: 1, levelRange: [63, 68] },
                { creatureId: 'crystal_sentinel', subtypeId: 'normal', count: 2, levelRange: [59, 64] },
                { creatureId: 'crystal_sentinel', subtypeId: 'greater', count: 1, levelRange: [64, 68] },
                { creatureId: 'memory_echo', subtypeId: 'lesser', count: 1, levelRange: [62, 66] },
                // BOSS: The Eternal Warden — 180s respawn (3 min)
                { creatureId: 'eternal_warden', subtypeId: 'boss', count: 1, levelRange: [65, 68], isBoss: true, respawnDelay: 180000 }
            ],
            maxNPCs: 4,
            respawnDelay: 25000,
            
            obstacles: [
                { q: 2, r: 2 }, { q: 5, r: 2 },
                { q: 1, r: 4 }, { q: 6, r: 4 },
                { q: 3, r: 5 }, { q: 4, r: 5 },
                { q: 3, r: 7 }, { q: 4, r: 7 },
                { q: 1, r: 8 }, { q: 6, r: 8 },
                { q: 2, r: 10 }, { q: 5, r: 10 }
            ],
            
            specialHexes: [
                { q: 3, r: 3, type: 'ancient_ward', effect: 'heal', modifier: 8 },
                { q: 4, r: 3, type: 'ancient_ward', effect: 'heal', modifier: 8 },
                { q: 3, r: 9, type: 'ancient_ward', effect: 'heal', modifier: 8 },
                { q: 4, r: 9, type: 'ancient_ward', effect: 'heal', modifier: 8 },
                { q: 3, r: 6, type: 'magical_residue', effect: 'heal', modifier: 5 },
                { q: 4, r: 6, type: 'magical_residue', effect: 'heal', modifier: 5 }
            ],
            
            exits: [
                { q: 4, r: 0, targetMap: 'sunken_ruins', targetQ: 4, targetR: 10, label: 'To Sunken Ruins', direction: 'N' },
                { q: 4, r: 11, targetMap: 'sealed_vault', targetQ: 4, targetR: 0, label: 'To The Sealed Vault', direction: 'S' }
            ],
            
            ambientEvents: [
                'Ancient machinery hums with power that hasn\'t faltered in millennia.',
                'Crystal formations pulse in synchronized patterns—a language?',
                'An automaton patrols its assigned corridor. It hasn\'t stopped in a thousand years.',
                'The walls are covered in inscriptions. Warning? Instructions? Both?',
                'A crystal sentinel\'s beam sweeps the corridor. Step carefully.',
                'You feel a psychic echo—memories of the people who built this place.',
                'The Eternal Warden stirs in its chamber. It knows you don\'t belong.',
                'Everything here was built to last forever. It has.',
                'The lost civilization\'s greatest achievements are here. And their greatest failures.',
                'Somewhere deep below, a crystal matrix holds a mind that hasn\'t slept in millennia.'
            ],
            
            entryText: 'You enter the Shattered Depths—the deepest level of the lost civilization\'s underground complex. Ancient machinery still functions, crystal sentinels still patrol, and automatons still guard the secrets their creators died to protect. The Eternal Warden waits at the heart of it all.'
        },
        
        // === THE DREAMING SPIRE (Level 62-72) === BOSS: The Dreamer
        // Shape: Tower — concentric rings, reality distortion
        dreaming_spire: {
            id: 'dreaming_spire',
            name: 'The Dreaming Spire',
            description: 'A tower that exists partially in another realm. A mage contacted the Sleeping Darkness here and was transformed. Reality bends, nightmares walk, and the boundary between dream and waking dissolves.',
            theme: 'dungeon',
            difficulty: 'very_hard',
            
            gridWidth: 7,
            gridHeight: 11,
            
            excludedHexes: [
                {q:0,r:0}, {q:6,r:0},
                {q:0,r:1}, {q:6,r:1},
                {q:0,r:4},
                {q:6,r:5},
                {q:0,r:8}, {q:6,r:8},
                {q:0,r:10}, {q:6,r:10}
            ],
            
            backgroundImage: null,
            backgroundColor: '#1a0a2e',
            ambientAudio: 'dream_ambient',
            
// Terrain tile assignments — 2MT illustrated hex tiles
            terrainTiles: {
                // Row 0
                '1,0': 'base_rocky',
                '2,0': 'plains_damp_1',
                '3,0': 'dirt_path_rocky',
                '4,0': 'plains_damp_1',
                '5,0': 'base_rocky',
                // Row 1
                '1,1': 'base_rocky',
                '2,1': 'base_rocky',
                '3,1': 'plains_damp_2',
                '4,1': 'base_rocky',
                '5,1': 'base_rocky',
                // Row 2
                '0,2': 'base_rocky',
                '2,2': 'base_rocky',
                '3,2': 'base_rocky',
                '4,2': 'plains_damp_1',
                '6,2': 'base_rocky',
                // Row 3
                '0,3': 'plains_damp_1',
                '1,3': 'plains_damp_2',
                '2,3': 'base_rocky',
                '3,3': 'base_rocky',
                '4,3': 'base_rocky',
                '5,3': 'base_rocky',
                '6,3': 'base_rocky',
                // Row 4
                '1,4': 'plains_damp_2',
                '3,4': 'base_rocky',
                '5,4': 'base_rocky',
                '6,4': 'base_rocky',
                // Row 5
                '0,5': 'base_rocky',
                '1,5': 'base_rocky',
                '2,5': 'base_rocky',
                '4,5': 'plains_damp_1',
                '5,5': 'base_rocky',
                // Row 6
                '0,6': 'plains_damp_1',
                '1,6': 'base_rocky',
                '2,6': 'base_rocky',
                '3,6': 'plains_damp_2',
                '4,6': 'plains_damp_1',
                '5,6': 'base_rocky',
                '6,6': 'plains_damp_2',
                // Row 7
                '0,7': 'base_rocky',
                '1,7': 'base_rocky',
                '3,7': 'base_rocky',
                '5,7': 'plains_damp_1',
                '6,7': 'plains_damp_1',
                // Row 8
                '1,8': 'base_rocky',
                '2,8': 'base_rocky',
                '3,8': 'base_rocky',
                '4,8': 'base_rocky',
                '5,8': 'base_rocky',
                // Row 9
                '0,9': 'plains_damp_2',
                '2,9': 'base_rocky',
                '3,9': 'base_rocky',
                '4,9': 'base_rocky',
                '6,9': 'base_rocky',
                // Row 10
                '1,10': 'base_rocky',
                '2,10': 'plains_damp_2',
                '3,10': 'plains_damp_1',
                '4,10': 'base_rocky',
                '5,10': 'base_rocky',
            },
            terrainTileDefault: 'base_rocky',
            terrainFilter: 'terrain-filter-void',
            
            maxPlayers: 4,
            pvpEnabled: false,
            
            levelRange: { min: 62, max: 72 },
            
            npcs: [
                { creatureId: 'nightmare_stalker', subtypeId: 'normal', count: 2, levelRange: [62, 67] },
                { creatureId: 'nightmare_stalker', subtypeId: 'greater', count: 1, levelRange: [67, 72] },
                { creatureId: 'corrupted_mage', subtypeId: 'normal', count: 2, levelRange: [63, 68] },
                { creatureId: 'corrupted_mage', subtypeId: 'greater', count: 1, levelRange: [68, 72] },
                { creatureId: 'void_spawn', subtypeId: 'chief', count: 1, levelRange: [65, 70] },
                // BOSS: The Dreamer — 240s respawn (4 min)
                { creatureId: 'the_dreamer', subtypeId: 'boss', count: 1, levelRange: [70, 72], isBoss: true, respawnDelay: 240000 }
            ],
            maxNPCs: 4,
            respawnDelay: 25000,
            
            obstacles: [
                { q: 1, r: 2 }, { q: 5, r: 2 },
                { q: 2, r: 4 }, { q: 4, r: 4 },
                { q: 3, r: 5 },
                { q: 2, r: 7 }, { q: 4, r: 7 },
                { q: 1, r: 9 }, { q: 5, r: 9 }
            ],
            
            specialHexes: [
                { q: 3, r: 3, type: 'reality_warp', effect: 'damage', modifier: 10 },
                { q: 3, r: 6, type: 'reality_warp', effect: 'damage', modifier: 10 },
                { q: 2, r: 5, type: 'nightmare', effect: 'damage', modifier: 8 },
                { q: 4, r: 5, type: 'nightmare', effect: 'damage', modifier: 8 },
                { q: 3, r: 8, type: 'dream_well', effect: 'heal', modifier: 10 }
            ],
            
            exits: [
                { q: 3, r: 0, targetMap: 'pale_fortress', targetQ: 4, targetR: 11, label: 'To Pale Court Fortress', direction: 'N' }
            ],
            
            ambientEvents: [
                'The walls shift when you\'re not looking. The tower is dreaming.',
                'A nightmare stalker materializes from your own shadow.',
                'Reality flickers—you see the tower as it was centuries ago, then it snaps back.',
                'The Dreamer\'s voice echoes: "You\'re already asleep. You just don\'t know it yet."',
                'Corrupted mages float through walls, casting spells that bend space.',
                'You see yourself at the end of the corridor. It waves. You didn\'t wave.',
                'The boundary between dream and reality is paper-thin here.',
                'Stars are visible through the ceiling—but it\'s midday outside.',
                'Something screams in a frequency that bypasses your ears and hits your soul.',
                'The Dreaming Spire exists in two places at once. Neither is safe.'
            ],
            
            entryText: 'You enter the Dreaming Spire—a tower that exists partially in another realm. The air shimmers with unreality, walls shift and breathe, and nightmare creatures stalk corridors that don\'t obey geometry. Somewhere at the top, the Dreamer waits in eternal half-sleep, connected to the Sleeping Darkness itself.'
        },
        
        // === VYRAXION'S LAIR (Level 68-78) === BOSS: Vyraxion the Ashborn
        // Shape: Dragon's cave — massive central chamber, lava moats
        vyraxion_lair: {
            id: 'vyraxion_lair',
            name: 'Vyraxion\'s Lair',
            description: 'The volcanic lair of Vyraxion the Ashborn atop the Wraithspine summit. Elder drakes and magma elementals guard the approach. The ancient dragon waits within, dreaming of fire.',
            theme: 'mountain',
            difficulty: 'very_hard',
            
            gridWidth: 8,
            gridHeight: 12,
            
            excludedHexes: [
                {q:0,r:0}, {q:1,r:0}, {q:6,r:0}, {q:7,r:0},
                {q:0,r:1}, {q:7,r:1},
                {q:0,r:6},
                {q:7,r:7},
                {q:0,r:10}, {q:7,r:10},
                {q:0,r:11}, {q:1,r:11}, {q:6,r:11}, {q:7,r:11}
            ],
            
            backgroundImage: null,
            backgroundColor: '#2a0505',
            ambientAudio: 'dragon_lair',
            
// Terrain tile assignments — 2MT illustrated hex tiles
            terrainTiles: {
                // Row 0
                '2,0': 'mountains_low_rocky',
                '3,0': 'dirt_path_rocky',
                '4,0': 'base_rocky',
                '5,0': 'mountains_low_rocky',
                // Row 1
                '1,1': 'base_rocky',
                '2,1': 'base_rocky',
                '3,1': 'dirt_path_1_n',
                '4,1': 'base_rocky',
                '5,1': 'base_rocky',
                '6,1': 'base_rocky',
                // Row 2
                '0,2': 'mountains_low_rocky',
                '1,2': 'mountains_foothills_rocky',
                '3,2': 'mountains_foothills_rocky',
                '4,2': 'mountains_foothills_rocky',
                '6,2': 'base_rocky',
                '7,2': 'base_rocky',
                // Row 3
                '0,3': 'mountains_foothills_rocky',
                '1,3': 'mountains_foothills_rocky',
                '2,3': 'base_rocky',
                '3,3': 'mountain_volcano_rocky_1',
                '4,3': 'mountain_volcano_rocky_2',
                '5,3': 'base_rocky',
                '6,3': 'base_rocky',
                '7,3': 'base_rocky',
                // Row 4
                '0,4': 'mountains_low_rocky',
                '2,4': 'base_rocky',
                '3,4': 'mountains_foothills_rocky',
                '4,4': 'base_rocky',
                '5,4': 'base_rocky',
                '7,4': 'mountains_low_rocky',
                // Row 5
                '0,5': 'mountains_low_rocky',
                '1,5': 'base_rocky',
                '2,5': 'mountains_foothills_rocky',
                '5,5': 'mountain_volcano_rocky_1',
                '6,5': 'base_rocky',
                '7,5': 'base_rocky',
                // Row 6
                '1,6': 'base_rocky',
                '2,6': 'base_rocky',
                '5,6': 'base_rocky',
                '6,6': 'base_rocky',
                '7,6': 'mountains_foothills_rocky',
                // Row 7
                '0,7': 'base_rocky',
                '1,7': 'base_rocky',
                '2,7': 'mountains_foothills_rocky',
                '5,7': 'mountains_low_rocky',
                '6,7': 'base_rocky',
                // Row 8
                '0,8': 'mountains_foothills_rocky',
                '1,8': 'mountains_foothills_rocky',
                '2,8': 'base_rocky',
                '3,8': 'mountain_volcano_lush_1',
                '4,8': 'mountain_volcano_lush_2',
                '5,8': 'base_rocky',
                '6,8': 'mountains_foothills_rocky',
                '7,8': 'base_rocky',
                // Row 9
                '0,9': 'base_rocky',
                '2,9': 'base_rocky',
                '3,9': 'mountains_low_rocky',
                '4,9': 'base_rocky',
                '5,9': 'mountains_low_rocky',
                '7,9': 'base_rocky',
                // Row 10
                '1,10': 'base_rocky',
                '2,10': 'base_rocky',
                '3,10': 'base_rocky',
                '4,10': 'mountains_foothills_rocky',
                '5,10': 'mountains_low_rocky',
                '6,10': 'base_rocky',
                // Row 11
                '3,11': 'base_rocky',
                '4,11': 'base_rocky',
            },
            terrainTileDefault: 'base_rocky',
            
            maxPlayers: 4,
            pvpEnabled: false,
            
            levelRange: { min: 68, max: 78 },
            
            npcs: [
                { creatureId: 'elder_drake', subtypeId: 'normal', count: 2, levelRange: [68, 73] },
                { creatureId: 'elder_drake', subtypeId: 'greater', count: 1, levelRange: [73, 78] },
                { creatureId: 'magma_elemental', subtypeId: 'normal', count: 1, levelRange: [69, 74] },
                { creatureId: 'magma_elemental', subtypeId: 'greater', count: 1, levelRange: [74, 78] },
                { creatureId: 'fire_elemental', subtypeId: 'chief', count: 1, levelRange: [70, 76] },
                // BOSS: Vyraxion the Ashborn — 300s respawn (5 min)
                { creatureId: 'vyraxion', subtypeId: 'boss', count: 1, levelRange: [75, 78], isBoss: true, respawnDelay: 300000 }
            ],
            maxNPCs: 4,
            respawnDelay: 28000,
            
            obstacles: [
                { q: 2, r: 2 }, { q: 5, r: 2 },
                { q: 1, r: 4 }, { q: 6, r: 4 },
                { q: 3, r: 5 }, { q: 4, r: 5 },
                { q: 3, r: 6 }, { q: 4, r: 6 },
                { q: 3, r: 7 }, { q: 4, r: 7 },
                { q: 1, r: 9 }, { q: 6, r: 9 },
                { q: 2, r: 11 }, { q: 5, r: 11 }
            ],
            
            specialHexes: [
                { q: 2, r: 5, type: 'lava_vent', effect: 'damage', modifier: 12 },
                { q: 5, r: 5, type: 'lava_vent', effect: 'damage', modifier: 12 },
                { q: 2, r: 7, type: 'lava_vent', effect: 'damage', modifier: 12 },
                { q: 5, r: 7, type: 'lava_vent', effect: 'damage', modifier: 12 },
                { q: 3, r: 3, type: 'scorched', effect: 'damage', modifier: 8 },
                { q: 4, r: 3, type: 'scorched', effect: 'damage', modifier: 8 },
                { q: 3, r: 9, type: 'scorched', effect: 'damage', modifier: 8 },
                { q: 4, r: 9, type: 'scorched', effect: 'damage', modifier: 8 }
            ],
            
            exits: [
                { q: 3, r: 0, targetMap: 'dragons_approach', targetQ: 3, targetR: 11, label: 'To Dragon\'s Approach', direction: 'N' }
            ],
            
            ambientEvents: [
                'The heat is beyond natural. This is dragonfire made permanent.',
                'An elder drake raises its head and roars. The sound shakes the mountain.',
                'Magma flows through carved channels—the dragon shaped this place.',
                'Mountains of gold and treasure fill alcoves. Vyraxion\'s hoard.',
                'The ancient dragon\'s breathing makes the ground vibrate rhythmically.',
                'You feel Vyraxion\'s gaze even before you see it. The dragon knows.',
                'Bones of past challengers are arranged in neat rows. A warning.',
                'The dragon speaks in your mind: "Another hero. How tedious."',
                'Elder drakes circle the central chamber, awaiting their master\'s command.',
                'Vyraxion the Ashborn has lived since before the Shattering. What does it know?'
            ],
            
            entryText: 'You enter Vyraxion\'s Lair—the volcanic heart of the Wraithspine where the Ashborn has dwelled since before the Shattering. The heat would kill a lesser adventurer. Elder drakes prowl the tunnels, magma elementals guard the vents, and at the center of it all, the ancient dragon waits upon a mountain of treasure.'
        },
        
        // === THE CONVERGENCE (Level 75-88) ===
        // Shape: Reality tear — chaotic, shifting terrain
        convergence: {
            id: 'convergence',
            name: 'The Convergence',
            description: 'Where multiple realities overlap and collide. The Sleeping Darkness is strongest here. Chaos elementals and reality wardens fight an eternal war for the fabric of existence.',
            theme: 'dungeon',
            difficulty: 'very_hard',
            
            gridWidth: 8,
            gridHeight: 11,
            
            excludedHexes: [
                {q:0,r:0}, {q:7,r:0},
                {q:0,r:1}, {q:7,r:1},
                {q:0,r:3}, {q:7,r:3},
                {q:0,r:7}, {q:7,r:7},
                {q:0,r:9}, {q:7,r:9},
                {q:0,r:10}, {q:7,r:10}
            ],
            
            backgroundImage: null,
            backgroundColor: '#0a000a',
            ambientAudio: 'convergence_ambient',
            
// Terrain tile assignments — 2MT illustrated hex tiles
            terrainTiles: {
                // Row 0
                '1,0': 'base_rocky',
                '2,0': 'plains_damp_1',
                '3,0': 'plains_damp_1',
                '4,0': 'dirt_path_rocky',
                '5,0': 'base_rocky',
                '6,0': 'plains_damp_2',
                // Row 1
                '1,1': 'base_rocky',
                '2,1': 'base_rocky',
                '3,1': 'base_rocky',
                '4,1': 'base_rocky',
                '5,1': 'plains_damp_1',
                '6,1': 'base_rocky',
                // Row 2
                '0,2': 'base_rocky',
                '1,2': 'base_rocky',
                '3,2': 'base_rocky',
                '4,2': 'base_rocky',
                '6,2': 'plains_damp_1',
                '7,2': 'plains_damp_2',
                // Row 3
                '1,3': 'base_rocky',
                '2,3': 'base_rocky',
                '3,3': 'base_rocky',
                '4,3': 'base_rocky',
                '5,3': 'base_rocky',
                '6,3': 'plains_damp_1',
                // Row 4
                '0,4': 'base_rocky',
                '1,4': 'base_rocky',
                '2,4': 'base_rocky',
                '5,4': 'base_rocky',
                '6,4': 'plains_damp_2',
                '7,4': 'base_rocky',
                // Row 5
                '0,5': 'base_rocky',
                '2,5': 'base_rocky',
                '3,5': 'base_rocky',
                '4,5': 'plains_damp_2',
                '5,5': 'base_rocky',
                '7,5': 'base_rocky',
                // Row 6
                '0,6': 'plains_damp_1',
                '1,6': 'plains_damp_2',
                '2,6': 'base_rocky',
                '5,6': 'base_rocky',
                '6,6': 'base_rocky',
                '7,6': 'base_rocky',
                // Row 7
                '1,7': 'base_rocky',
                '2,7': 'base_rocky',
                '3,7': 'base_rocky',
                '4,7': 'base_rocky',
                '5,7': 'plains_damp_2',
                '6,7': 'base_rocky',
                // Row 8
                '0,8': 'base_rocky',
                '1,8': 'plains_damp_2',
                '3,8': 'plains_damp_2',
                '4,8': 'base_rocky',
                '6,8': 'base_rocky',
                '7,8': 'base_rocky',
                // Row 9
                '1,9': 'plains_damp_2',
                '2,9': 'base_rocky',
                '3,9': 'base_rocky',
                '4,9': 'plains_damp_2',
                '5,9': 'base_rocky',
                '6,9': 'plains_damp_2',
                // Row 10
                '1,10': 'plains_damp_1',
                '2,10': 'base_rocky',
                '3,10': 'plains_damp_1',
                '4,10': 'dirt_path_rocky',
                '5,10': 'base_rocky',
                '6,10': 'plains_damp_2',
            },
            terrainTileDefault: 'base_rocky',
            terrainFilter: 'terrain-filter-void',
            
            maxPlayers: 4,
            pvpEnabled: false,
            
            levelRange: { min: 75, max: 88 },
            
            npcs: [
                { creatureId: 'chaos_elemental', subtypeId: 'normal', count: 2, levelRange: [75, 82] },
                { creatureId: 'chaos_elemental', subtypeId: 'greater', count: 1, levelRange: [82, 88] },
                { creatureId: 'reality_warden', subtypeId: 'normal', count: 1, levelRange: [76, 83] },
                { creatureId: 'reality_warden', subtypeId: 'greater', count: 1, levelRange: [83, 88] },
                { creatureId: 'void_horror', subtypeId: 'normal', count: 1, levelRange: [78, 85] },
                { creatureId: 'unbound', subtypeId: 'normal', count: 1, levelRange: [80, 86] }
            ],
            maxNPCs: 3,
            respawnDelay: 28000,
            
            obstacles: [
                { q: 2, r: 2 }, { q: 5, r: 2 },
                { q: 3, r: 4 }, { q: 4, r: 4 },
                { q: 1, r: 5 }, { q: 6, r: 5 },
                { q: 3, r: 6 }, { q: 4, r: 6 },
                { q: 2, r: 8 }, { q: 5, r: 8 }
            ],
            
            specialHexes: [
                { q: 2, r: 4, type: 'reality_warp', effect: 'damage', modifier: 12 },
                { q: 5, r: 4, type: 'reality_warp', effect: 'damage', modifier: 12 },
                { q: 2, r: 6, type: 'void_crack', effect: 'damage', modifier: 15 },
                { q: 5, r: 6, type: 'void_crack', effect: 'damage', modifier: 15 },
                { q: 3, r: 5, type: 'ancient_ward', effect: 'heal', modifier: 10 },
                { q: 4, r: 5, type: 'ancient_ward', effect: 'heal', modifier: 10 }
            ],
            
            exits: [
                { q: 4, r: 0, targetMap: 'abyssal_rift', targetQ: 4, targetR: 10, label: 'To Abyssal Rift', direction: 'N' },
                { q: 4, r: 10, targetMap: 'infinite_abyss', targetQ: 4, targetR: 0, label: 'To The Infinite Abyss', direction: 'S' }
            ],
            
            ambientEvents: [
                'Reality fractures like glass. You see through to somewhere else.',
                'A chaos elemental warps space around it—walls bend, floors curve.',
                'The reality wardens fight to hold existence together. They\'re losing.',
                'You step forward and end up three steps to the left. Distance lies here.',
                'The Sleeping Darkness presses against the thinning barrier. You feel it.',
                'Multiple versions of this room overlap simultaneously.',
                'An unbound entity phases through a wall that doesn\'t exist in its reality.',
                'The void horrors are getting bolder. The barrier is weakening.',
                'Lost civilization technology sparks and fails—even their wards can\'t hold here.',
                'If this barrier breaks fully, reality as you know it ends. No pressure.'
            ],
            
            entryText: 'You enter The Convergence—a point where multiple realities collide and the barrier against the Sleeping Darkness is thinnest. Space warps, time stutters, and the forces of chaos and order wage an eternal war. Chaos elementals tear at reality while ancient wardens fight to hold it together. The fate of everything may depend on what happens here.'
        },
        
        // === THE SEALED VAULT (Level 82-95) === BOSS: Memory of the Architect
        // Shape: Ancient vault — concentric security layers
        sealed_vault: {
            id: 'sealed_vault',
            name: 'The Sealed Vault',
            description: 'The deepest chamber of the lost civilization, sealed behind layers of ancient technology. The Memory of the Architect waits with the truth about the Shattering, the Sleeping Darkness, and why civilization had to fall.',
            theme: 'dungeon',
            difficulty: 'very_hard',
            
            gridWidth: 8,
            gridHeight: 12,
            
            excludedHexes: [
                {q:0,r:0}, {q:1,r:0}, {q:6,r:0}, {q:7,r:0},
                {q:0,r:1}, {q:7,r:1},
                {q:0,r:5}, {q:7,r:5},
                {q:0,r:10}, {q:7,r:10},
                {q:0,r:11}, {q:1,r:11}, {q:6,r:11}, {q:7,r:11}
            ],
            
            backgroundImage: null,
            backgroundColor: '#0a0a22',
            ambientAudio: 'ancient_machinery',
            
// Terrain tile assignments — 2MT illustrated hex tiles
            terrainTiles: {
                // Row 0
                '2,0': 'base_rocky',
                '3,0': 'base_rocky',
                '4,0': 'dirt_path_rocky',
                '5,0': 'base_rocky',
                // Row 1
                '1,1': 'base_rocky',
                '2,1': 'base_rocky',
                '3,1': 'base_rocky',
                '4,1': 'plains_damp_2',
                '5,1': 'base_rocky',
                '6,1': 'plains_damp_1',
                // Row 2
                '0,2': 'base_rocky',
                '1,2': 'plains_damp_1',
                '3,2': 'plains_damp_1',
                '4,2': 'base_rocky',
                '6,2': 'base_rocky',
                '7,2': 'base_rocky',
                // Row 3
                '0,3': 'base_rocky',
                '1,3': 'base_rocky',
                '2,3': 'base_rocky',
                '3,3': 'base_rocky',
                '4,3': 'base_rocky',
                '5,3': 'plains_damp_1',
                '6,3': 'base_rocky',
                '7,3': 'base_rocky',
                // Row 4
                '0,4': 'base_rocky',
                '2,4': 'base_rocky',
                '3,4': 'plains_damp_1',
                '4,4': 'base_rocky',
                '5,4': 'plains_damp_2',
                '7,4': 'base_rocky',
                // Row 5
                '1,5': 'plains_damp_1',
                '2,5': 'base_rocky',
                '5,5': 'base_rocky',
                '6,5': 'plains_damp_1',
                // Row 6
                '0,6': 'plains_damp_2',
                '1,6': 'base_rocky',
                '2,6': 'base_rocky',
                '5,6': 'plains_damp_1',
                '6,6': 'base_rocky',
                '7,6': 'base_rocky',
                // Row 7
                '0,7': 'plains_damp_2',
                '1,7': 'base_rocky',
                '2,7': 'base_rocky',
                '5,7': 'plains_damp_2',
                '6,7': 'base_rocky',
                '7,7': 'base_rocky',
                // Row 8
                '0,8': 'base_rocky',
                '2,8': 'base_rocky',
                '3,8': 'base_rocky',
                '4,8': 'base_rocky',
                '5,8': 'base_rocky',
                '7,8': 'base_rocky',
                // Row 9
                '0,9': 'base_rocky',
                '1,9': 'plains_damp_1',
                '2,9': 'base_rocky',
                '3,9': 'base_rocky',
                '4,9': 'plains_damp_1',
                '5,9': 'plains_damp_2',
                '6,9': 'base_rocky',
                '7,9': 'base_rocky',
                // Row 10
                '1,10': 'base_rocky',
                '3,10': 'base_rocky',
                '4,10': 'base_rocky',
                '6,10': 'plains_damp_2',
                // Row 11
                '2,11': 'base_rocky',
                '3,11': 'base_rocky',
                '4,11': 'base_rocky',
                '5,11': 'base_rocky',
            },
            terrainTileDefault: 'base_rocky',
            terrainFilter: 'terrain-filter-dungeon',
            
            maxPlayers: 4,
            pvpEnabled: false,
            
            levelRange: { min: 82, max: 95 },
            
            npcs: [
                { creatureId: 'abyss_sentinel', subtypeId: 'normal', count: 2, levelRange: [82, 88] },
                { creatureId: 'abyss_sentinel', subtypeId: 'greater', count: 1, levelRange: [88, 95] },
                { creatureId: 'memory_echo', subtypeId: 'normal', count: 2, levelRange: [83, 89] },
                { creatureId: 'memory_echo', subtypeId: 'greater', count: 1, levelRange: [89, 95] },
                { creatureId: 'void_horror', subtypeId: 'greater', count: 1, levelRange: [85, 92] },
                // BOSS: Memory of the Architect — 300s respawn (5 min)
                { creatureId: 'architect_memory', subtypeId: 'boss', count: 1, levelRange: [90, 95], isBoss: true, respawnDelay: 300000 }
            ],
            maxNPCs: 4,
            respawnDelay: 28000,
            
            obstacles: [
                { q: 2, r: 2 }, { q: 5, r: 2 },
                { q: 1, r: 4 }, { q: 6, r: 4 },
                { q: 3, r: 5 }, { q: 4, r: 5 },
                { q: 3, r: 6 }, { q: 4, r: 6 },
                { q: 3, r: 7 }, { q: 4, r: 7 },
                { q: 1, r: 8 }, { q: 6, r: 8 },
                { q: 2, r: 10 }, { q: 5, r: 10 }
            ],
            
            specialHexes: [
                { q: 3, r: 3, type: 'ancient_ward', effect: 'heal', modifier: 12 },
                { q: 4, r: 3, type: 'ancient_ward', effect: 'heal', modifier: 12 },
                { q: 3, r: 9, type: 'ancient_ward', effect: 'heal', modifier: 12 },
                { q: 4, r: 9, type: 'ancient_ward', effect: 'heal', modifier: 12 },
                { q: 2, r: 6, type: 'magical_residue', effect: 'heal', modifier: 8 },
                { q: 5, r: 6, type: 'magical_residue', effect: 'heal', modifier: 8 }
            ],
            
            exits: [
                { q: 4, r: 0, targetMap: 'shattered_depths', targetQ: 4, targetR: 11, label: 'To Shattered Depths', direction: 'N' }
            ],
            
            ambientEvents: [
                'The vault\'s security systems are still active after millennia. Impressive. Dangerous.',
                'Crystal matrices pulse with preserved consciousness—echoes of the builders.',
                'The Architect\'s memory speaks: "We knew this day would come."',
                'Abyss sentinels patrol with mechanical precision. They will not stop.',
                'The truth about the Shattering is inscribed on every wall. If only you could read it.',
                'Memory echoes replay ancient scenes—the last days of the civilization.',
                'The vault contains knowledge that could save the world. Or destroy it.',
                'You feel the weight of millennia of accumulated wisdom pressing on your mind.',
                'The Architect\'s final message: "We failed. Do better."',
                'This is where it all began. And where it all ends.'
            ],
            
            entryText: 'You breach the Sealed Vault—the final chamber of the lost civilization, hidden behind layers of ancient technology that has functioned without interruption for millennia. The Memory of the Architect waits within, a preserved consciousness that holds the truth about everything: the Shattering, the Sleeping Darkness, and why an entire civilization chose to die rather than let it wake.'
        },
        
        // === THE INFINITE ABYSS (Level 90-100+) ===
        // Shape: Procedural endless dungeon — dark, shifting
        infinite_abyss: {
            id: 'infinite_abyss',
            name: 'The Infinite Abyss',
            description: 'An endless dungeon descending into pure darkness. The deepest place on the Shattered Coast, where reality gives way to the void. Scaling enemies provide endless challenge.',
            theme: 'dungeon',
            difficulty: 'very_hard',
            
            gridWidth: 8,
            gridHeight: 12,
            
            excludedHexes: [
                {q:0,r:0}, {q:7,r:0},
                {q:0,r:1}, {q:7,r:1},
                {q:7,r:4},
                {q:0,r:5},
                {q:7,r:8},
                {q:0,r:9},
                {q:0,r:11}, {q:7,r:11}
            ],
            
            backgroundImage: null,
            backgroundColor: '#000000',
            ambientAudio: 'abyss_ambient',
            
// Terrain tile assignments — 2MT illustrated hex tiles
            terrainTiles: {
                // Row 0
                '1,0': 'base_rocky',
                '2,0': 'base_rocky',
                '3,0': 'base_rocky',
                '4,0': 'dirt_path_rocky',
                '5,0': 'base_rocky',
                '6,0': 'plains_damp_1',
                // Row 1
                '1,1': 'base_rocky',
                '2,1': 'base_rocky',
                '3,1': 'plains_damp_2',
                '4,1': 'base_rocky',
                '5,1': 'base_rocky',
                '6,1': 'base_rocky',
                // Row 2
                '0,2': 'base_rocky',
                '1,2': 'base_rocky',
                '3,2': 'base_rocky',
                '4,2': 'base_rocky',
                '6,2': 'base_rocky',
                '7,2': 'plains_damp_1',
                // Row 3
                '0,3': 'base_rocky',
                '1,3': 'base_rocky',
                '2,3': 'plains_damp_2',
                '3,3': 'base_rocky',
                '4,3': 'base_rocky',
                '5,3': 'base_rocky',
                '6,3': 'base_rocky',
                '7,3': 'base_rocky',
                // Row 4
                '0,4': 'plains_damp_2',
                '2,4': 'plains_damp_2',
                '3,4': 'plains_damp_1',
                '4,4': 'base_rocky',
                '5,4': 'plains_damp_1',
                // Row 5
                '1,5': 'base_rocky',
                '2,5': 'base_rocky',
                '3,5': 'plains_damp_1',
                '4,5': 'base_rocky',
                '5,5': 'base_rocky',
                '6,5': 'base_rocky',
                '7,5': 'plains_damp_1',
                // Row 6
                '0,6': 'plains_damp_2',
                '1,6': 'base_rocky',
                '2,6': 'plains_damp_1',
                '5,6': 'base_rocky',
                '6,6': 'base_rocky',
                '7,6': 'base_rocky',
                // Row 7
                '0,7': 'plains_damp_2',
                '1,7': 'base_rocky',
                '2,7': 'plains_damp_2',
                '3,7': 'base_rocky',
                '4,7': 'base_rocky',
                '5,7': 'base_rocky',
                '6,7': 'base_rocky',
                '7,7': 'base_rocky',
                // Row 8
                '0,8': 'base_rocky',
                '2,8': 'base_rocky',
                '3,8': 'base_rocky',
                '4,8': 'base_rocky',
                '5,8': 'base_rocky',
                // Row 9
                '1,9': 'base_rocky',
                '2,9': 'plains_damp_2',
                '3,9': 'base_rocky',
                '4,9': 'base_rocky',
                '5,9': 'base_rocky',
                '6,9': 'base_rocky',
                '7,9': 'base_rocky',
                // Row 10
                '0,10': 'base_rocky',
                '1,10': 'base_rocky',
                '3,10': 'base_rocky',
                '4,10': 'plains_damp_2',
                '6,10': 'base_rocky',
                '7,10': 'base_rocky',
                // Row 11
                '1,11': 'base_rocky',
                '2,11': 'base_rocky',
                '3,11': 'base_rocky',
                '4,11': 'base_rocky',
                '5,11': 'base_rocky',
                '6,11': 'plains_damp_2',
            },
            terrainTileDefault: 'base_rocky',
            terrainFilter: 'terrain-filter-void',
            
            maxPlayers: 4,
            pvpEnabled: false,
            
            levelRange: { min: 90, max: 100 },
            
            npcs: [
                { creatureId: 'abyss_walker', subtypeId: 'normal', count: 2, levelRange: [90, 95] },
                { creatureId: 'abyss_walker', subtypeId: 'greater', count: 1, levelRange: [95, 100] },
                { creatureId: 'abyss_sentinel', subtypeId: 'normal', count: 1, levelRange: [90, 95] },
                { creatureId: 'abyss_sentinel', subtypeId: 'greater', count: 1, levelRange: [95, 100] },
                { creatureId: 'void_horror', subtypeId: 'chief', count: 1, levelRange: [92, 98] },
                { creatureId: 'unbound', subtypeId: 'greater', count: 1, levelRange: [94, 100] }
            ],
            maxNPCs: 3,
            respawnDelay: 20000,
            
            obstacles: [
                { q: 2, r: 2 }, { q: 5, r: 2 },
                { q: 1, r: 4 }, { q: 6, r: 4 },
                { q: 3, r: 6 }, { q: 4, r: 6 },
                { q: 1, r: 8 }, { q: 6, r: 8 },
                { q: 2, r: 10 }, { q: 5, r: 10 }
            ],
            
            specialHexes: [
                { q: 3, r: 3, type: 'void_crack', effect: 'damage', modifier: 15 },
                { q: 4, r: 3, type: 'void_crack', effect: 'damage', modifier: 15 },
                { q: 3, r: 5, type: 'void_crack', effect: 'damage', modifier: 15 },
                { q: 4, r: 5, type: 'void_crack', effect: 'damage', modifier: 15 },
                { q: 3, r: 9, type: 'void_crack', effect: 'damage', modifier: 15 },
                { q: 4, r: 9, type: 'void_crack', effect: 'damage', modifier: 15 }
            ],
            
            exits: [
                { q: 4, r: 0, targetMap: 'convergence', targetQ: 4, targetR: 10, label: 'To The Convergence', direction: 'N' }
            ],
            
            ambientEvents: [
                'Darkness. Not absence of light—presence of something else.',
                'An abyss walker phases through the floor. They\'re everywhere.',
                'The void hums with a frequency that makes your bones ache.',
                'You can\'t see the ceiling. You can\'t see the walls. Only the floor. Barely.',
                'Something immense moves in the darkness below. You are not at the bottom.',
                'The Sleeping Darkness is not sleeping here. It is awake. It is aware.',
                'Abyss sentinels stand motionless until you get close. Then they are very, very fast.',
                'Reality doesn\'t exist here in any meaningful way. Only will.',
                'Every step deeper is a step further from everything you know.',
                'The Abyss looks back. It always has. It always will.'
            ],
            
            entryText: 'You descend into the Infinite Abyss—the deepest place on the Shattered Coast, where the world gives way to pure void. There is no floor below you, no ceiling above—only darkness and the things that live in it. The strongest creatures of the abyss hunt here, and deeper still, the Sleeping Darkness itself stirs. This is the endgame. There is no deeper to go.'
        },
        
        // ============================================================
        // SPECIAL ACCESS MAPS (v2.2.0)
        // Not shown on world map — accessed via Menu or Town UI
        // ============================================================
        test_arena: {
            id: 'test_arena',
            name: 'Testing Ground',
            description: 'A private training yard. Hone your skills against reinforced practice dummies without risk or reward.',
            theme: 'arena',
            difficulty: 'special',
            isTestMap: true,

            // 6x6 open arena — corner hexes excluded for octagon shape
            gridWidth: 6,
            gridHeight: 6,
            excludedHexes: [
                { q: 0, r: 0 }, { q: 5, r: 0 },
                { q: 0, r: 5 }, { q: 5, r: 5 }
            ],

            backgroundImage: null,
            backgroundColor: '#3a3a2a',
            // Single tile covers all hexes — mountains_low_lush.png
            terrainTiles: {},
            terrainTileDefault: 'mountains_low_lush',

            playerStart: { q: 2, r: 1 },

            maxNPCs: 1,
            npcs: [
                {
                    creatureId: 'training_dummy',
                    subtypeId: 'normal',
                    count: 1,
                    levelRange: [100, 100],
                    respawnDelay: 5000
                }
            ],

            obstacles: [],
            exits: [
                { q: 2, r: 4, targetMap: 'town', label: 'Return to Town', direction: 'S' }
            ],
            specialHexes: [],
            entryText: 'You step into the Testing Ground. A reinforced training dummy stands ready. No glory here — only preparation.',
            ambientEvents: []
        }
    },
    
    // Town is a special non-combat map (UNCHANGED — MUD-style text navigation)
    town: {
        id: 'town',
        name: "Eron's Landing",
        description: 'A frontier settlement on the Shattered Coast, founded 47 years ago by Captain Eron Blackwater. Population ~2,500. The first and largest permanent colony in the new land.',
        theme: 'town',
        isTown: true,
        
        gridWidth: 12,
        gridHeight: 10,
        
        backgroundImage: null,
        backgroundColor: '#8b7355',
        ambientAudio: 'town',
        
        locations: [
            { id: 'square', name: 'Market Square', q: 6, r: 5 },
            { id: 'blacksmith', name: 'The Crossed Swords', q: 2, r: 3 },
            { id: 'temple', name: 'The Wounded Wing', q: 10, r: 3 },
            { id: 'shop', name: "Outfitter's Guild", q: 3, r: 7 },
            { id: 'bank', name: 'Ironvault Depository', q: 9, r: 7 },
            { id: 'tavern', name: 'The Rusty Anchor', q: 5, r: 2 },
            { id: 'guild_hall', name: 'Expedition Hall', q: 7, r: 2 },
            { id: 'library', name: 'Athenaeum of the Lost Age', q: 8, r: 4 },
            { id: 'docks', name: 'The Docks', q: 1, r: 5 },
            { id: 'gates', name: 'Town Gates', q: 11, r: 5 }
        ],
        
        // Town exits (targets updated for resized destination maps v0.9.0)
        exits: [
            { q: 11, r: 5, targetMap: 'forest_edge', targetQ: 1, targetR: 5, label: 'To Coastal Caves', direction: 'E' },
            { q: 6, r: 9, targetMap: 'sewers', targetQ: 3, targetR: 0, label: 'To The Sewers', direction: 'S' },
            { q: 1, r: 5, targetMap: 'swamp', targetQ: 7, targetR: 4, label: 'To Drowned Reaches', direction: 'W' }
        ],
        
        entryText: 'You arrive at Eron\'s Landing. Salt air mingles with wood smoke as merchants hawk their wares and weathered adventurers trade tales of the wilds beyond the palisade. The Shattered Coast awaits.'
    },
    
    // World map data0.5.0) — UNCHANGED
    worldMapData: {
        layout: {
            // Town hub (bottom center)
            town:               { x: 5, y: 9 },
            sewers:             { x: 5, y: 10 },
            forest_edge:        { x: 7, y: 9 },
            // Early game (east of town, spreading north)
            deep_forest:        { x: 7, y: 8 },
            graveyard:          { x: 8, y: 7 },
            goblin_camp:        { x: 7, y: 7 },
            spider_cavern:      { x: 6, y: 7 },
            cave:               { x: 6, y: 6 },
            old_road:           { x: 8, y: 6 },
            crypt:              { x: 9, y: 6 },
            // Mid game
            mountain_approach:  { x: 7, y: 5 },
            boss_chamber:       { x: 9, y: 5 },
            thornwood_heart:    { x: 5, y: 5 },
            hidden_caves:       { x: 7, y: 4 },
            // Mountain/Dragon chain (vertical north at x=7)
            wraithspine_pass:   { x: 8, y: 3 },
            dragons_approach:   { x: 8, y: 2 },
            vyraxion_lair:      { x: 8, y: 1 },
            // Void chain (vertical north at x=6, forks left from hidden_caves)
            abyssal_rift:       { x: 6, y: 3 },
            convergence:        { x: 6, y: 2 },
            infinite_abyss:     { x: 6, y: 1 },
            // Western underwater chain (NW from town, higher = farther)
            swamp:              { x: 3, y: 8 },
            sunken_ruins:       { x: 2, y: 7 },
            shattered_depths:   { x: 1, y: 6 },
            sealed_vault:       { x: 0, y: 5 },
            // Pale Court chain (vertical north at x=10)
            pale_outskirts:     { x: 10, y: 4 },
            pale_fortress:      { x: 10, y: 3 },
            dreaming_spire:     { x: 10, y: 2 }
        },
        
        settings: {
            gridCellWidth: 120,
            gridCellHeight: 90,
            nodeWidth: 110,
            nodeHeight: 75,
            lineColor: '#4a5568',
            lineWidth: 2,
            minZoom: 0.5,
            maxZoom: 1.5,
            defaultZoom: 1.0
        }
    }
};

// Helper functions
export function getMap(mapId) {
    if (mapId === 'town') return MapConfig.town;
    return MapConfig.maps[mapId] || null;
}

export function getMapIds() {
    return Object.keys(MapConfig.maps);
}

export function getSelectableMaps() {
    return [
        'forest_edge', 'sewers', 'deep_forest', 'graveyard', 'goblin_camp',
        'spider_cavern', 'old_road', 'cave', 'crypt', 'mountain_approach',
        'boss_chamber', 'swamp', 'hidden_caves',
        'wraithspine_pass', 'pale_outskirts', 'sunken_ruins', 'thornwood_heart', 'dragons_approach',
        'pale_fortress', 'abyssal_rift', 'shattered_depths', 'dreaming_spire',
        'vyraxion_lair', 'convergence', 'sealed_vault', 'infinite_abyss'
    ];
}

export function getMapsByDifficulty() {
    const maps = getSelectableMaps().map(id => getMap(id));
    const order = ['easy', 'medium', 'hard', 'very_hard'];
    return maps.sort((a, b) => order.indexOf(a.difficulty) - order.indexOf(b.difficulty));
}

export function isObstacle(mapId, q, r) {
    const map = getMap(mapId);
    if (!map || !map.obstacles) return false;
    return map.obstacles.some(obs => obs.q === q && obs.r === r);
}

export function getExit(mapId, q, r) {
    const map = getMap(mapId);
    if (!map || !map.exits) return null;
    return map.exits.find(exit => exit.q === q && exit.r === r) || null;
}

export function getSpecialHex(mapId, q, r) {
    const map = getMap(mapId);
    if (!map || !map.specialHexes) return null;
    return map.specialHexes.find(hex => hex.q === q && hex.r === r) || null;
}

export function getDifficultyLabel(difficulty) {
    const labels = { easy: 'Easy', medium: 'Medium', hard: 'Hard', very_hard: 'Very Hard' };
    return labels[difficulty] || 'Unknown';
}

export function getDifficultyColor(difficulty) {
    const colors = { easy: '#50c878', medium: '#f4a460', hard: '#e74c3c', very_hard: '#9b59b6' };
    return colors[difficulty] || '#ffffff';
}

// === EXCLUDED HEX HELPERS (v0.9.0) ===

/**
 * Check if a hex is excluded (void) on a given map
 * @param {string} mapId
 * @param {number} q
 * @param {number} r
 * @returns {boolean}
 */
export function isExcludedHex(mapId, q, r) {
    const map = getMap(mapId);
    if (!map || !map.excludedHexes) return false;
    return map.excludedHexes.some(hex => hex.q === q && hex.r === r);
}

/**
 * Get all excluded hexes for a map
 * @param {string} mapId
 * @returns {Array<{q: number, r: number}>}
 */
export function getExcludedHexes(mapId) {
    const map = getMap(mapId);
    return map?.excludedHexes || [];
}

// === WORLD MAP HELPERS (v0.5.0) ===

export function getWorldMapLayout() {
    return MapConfig.worldMapData?.layout || {};
}

export function getWorldMapSettings() {
    return MapConfig.worldMapData?.settings || {
        gridCellWidth: 120, gridCellHeight: 90,
        nodeWidth: 110, nodeHeight: 75,
        lineColor: '#4a5568', lineWidth: 2,
        minZoom: 0.5, maxZoom: 1.5, defaultZoom: 1.0
    };
}

export function getMapConnections(mapId) {
    const map = getMap(mapId);
    if (!map || !map.exits) return [];
    return map.exits.map(exit => exit.targetMap);
}

export function getAllMapExits(mapId) {
    const map = getMap(mapId);
    if (!map || !map.exits) return [];
    return map.exits.map(exit => ({
        ...exit,
        targetMapName: getMap(exit.targetMap)?.name || exit.targetMap
    }));
}

export function mapsAreConnected(fromMapId, toMapId) {
    const connections = getMapConnections(fromMapId);
    return connections.includes(toMapId);
}

export function getMapNPCSummary(mapId) {
    const map = getMap(mapId);
    if (!map || !map.npcs) return [];
    
    const npcMap = new Map();
    for (const npc of map.npcs) {
        const key = `${npc.creatureId}_${npc.subtypeId}`;
        const name = `${npc.subtypeId !== 'normal' ? capitalize(npc.subtypeId) + ' ' : ''}${capitalize(npc.creatureId)}`;
        const [minLv, maxLv] = npc.levelRange;
        
        if (npcMap.has(key)) {
            const existing = npcMap.get(key);
            existing.minLevel = Math.min(existing.minLevel, minLv);
            existing.maxLevel = Math.max(existing.maxLevel, maxLv);
        } else {
            npcMap.set(key, { name, minLevel: minLv, maxLevel: maxLv });
        }
    }
    
    return Array.from(npcMap.values()).map(n => ({
        name: n.name,
        levelRange: `Lv ${n.minLevel}-${n.maxLevel}`
    }));
}

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
}

export default MapConfig;
