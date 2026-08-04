/**
 * @file terrainAssets.js
 * @description Terrain tile asset manifest and preloader for illustrated hex tiles.
 *              Maps tile keys to file paths. Provides preloadTerrainTiles() to load
 *              all tiles for a map before rendering.
 * 
 * @location config/terrainAssets.js
 * @usage Import in HexGrid.js for tile path lookup. Import in BattleMapUI.js for preloading.
 * @dependencies None (pure data + DOM Image preloading)
 * 
 * @version 2.1.0
 * @changelog
 *   - v2.1.0 (2026-02-28): Expanded manifest to full 241 tiles from 2-Minute Tabletop pack.
 *                          Added all 44 directional dirt paths, 44 rivers, 11 coast/beach,
 *                          9 ocean water, 9 swamp water, 18 urban, 14 wetlands, 10 forest,
 *                          and additional hills/mountains/snow variants. All keys quoted for
 *                          hyphen compatibility.
 *   - v2.0.0 (2026-02-27): Expanded manifest to 80 tiles covering all 25 battle maps.
 *   - v1.0.0 (2026-02-26): Initial — 16 tiles for Greenward Paths pilot.
 */

const TERRAIN_BASE_PATH = 'assets/terrain/';

/**
 * Master tile manifest: tileKey → filename
 * Each tile is a 224×194px RGBA PNG (flat-top hex, 118×111px content area)
 * Dirt path and river tiles are pre-composited onto base_lush backgrounds.
 */
export const TerrainTiles = {
    // === BASE (5) ===
    'base_blank': 'base_blank.png',
    'base_lush':  'base_lush.png',
    'base_ocean': 'base_ocean.png',
    'base_rocky': 'base_rocky.png',
    'base_snowy': 'base_snowy.png',
    // === PLAINS (LUSH) (5) ===
    'plains_lush_1': 'plains_lush_1.png',
    'plains_lush_2': 'plains_lush_2.png',
    'plains_lush_3': 'plains_lush_3.png',
    'plains_lush_4': 'plains_lush_4.png',
    'plains_lush_5': 'plains_lush_5.png',
    // === PLAINS (DAMP) (5) ===
    'plains_damp_1': 'plains_damp_1.png',
    'plains_damp_2': 'plains_damp_2.png',
    'plains_damp_3': 'plains_damp_3.png',
    'plains_damp_4': 'plains_damp_4.png',
    'plains_damp_5': 'plains_damp_5.png',
    // === PLAINS (DESERT) (2) ===
    'plains_desert_4': 'plains_desert_4.png',
    'plains_desert_5': 'plains_desert_5.png',
    // === PLAINS (FARMLAND) (3) ===
    'plains_farmland_1': 'plains_farmland_1.png',
    'plains_farmland_2': 'plains_farmland_2.png',
    'plains_farmland_3': 'plains_farmland_3.png',
    // === FOREST (10) ===
    'forest_conifer':         'forest_conifer.png',
    'forest_conifer_2':       'forest_conifer_2.png',
    'forest_conifer_lush':    'forest_conifer_lush.png',
    'forest_conifer_lush_2':  'forest_conifer_lush_2.png',
    'forest_conifer_snowy':   'forest_conifer_snowy.png',
    'forest_conifer_snowy_2': 'forest_conifer_snowy_2.png',
    'forest_deciduous':       'forest_deciduous.png',
    'forest_deciduous_lush':  'forest_deciduous_lush.png',
    'forest_mixed':           'forest_mixed.png',
    'forest_mixed_lush':      'forest_mixed_lush.png',
    // === SPARSE TREES (5) ===
    'sparse_trees_1':      'sparse_trees_1.png',
    'sparse_trees_2':      'sparse_trees_2.png',
    'sparse_trees_lush_1': 'sparse_trees_lush_1.png',
    'sparse_trees_lush_2': 'sparse_trees_lush_2.png',
    'sparse_trees_snowy':  'sparse_trees_snowy.png',
    // === HILLS (LUSH) (7) ===
    'hill_with_tree':      'hill_with_tree.png',
    'hill_with_tree_lush': 'hill_with_tree_lush.png',
    'hills_lush_1':        'hills_lush_1.png',
    'hills_lush_2':        'hills_lush_2.png',
    'hills_lush_3':        'hills_lush_3.png',
    'hills_lush_4':        'hills_lush_4.png',
    'hills_lush_5':        'hills_lush_5.png',
    // === HILLS (SNOWY) (5) ===
    'hills_snowy_1': 'hills_snowy_1.png',
    'hills_snowy_2': 'hills_snowy_2.png',
    'hills_snowy_3': 'hills_snowy_3.png',
    'hills_snowy_4': 'hills_snowy_4.png',
    'hills_snowy_5': 'hills_snowy_5.png',
    // === HILLS (DESERT) (8) ===
    'hills_desert_1':  'hills_desert_1.png',
    'hills_desert_1b': 'hills_desert_1b.png',
    'hills_desert_2':  'hills_desert_2.png',
    'hills_desert_2b': 'hills_desert_2b.png',
    'hills_desert_3':  'hills_desert_3.png',
    'hills_desert_3b': 'hills_desert_3b.png',
    'hills_desert_4':  'hills_desert_4.png',
    'hills_desert_4b': 'hills_desert_4b.png',
    // === MOUNTAINS (12) ===
    'mountains_foothills_lush':  'mountains_foothills_lush.png',
    'mountains_foothills_rocky': 'mountains_foothills_rocky.png',
    'mountains_foothills_snowy': 'mountains_foothills_snowy.png',
    'mountains_low_lush':        'mountains_low_lush.png',
    'mountains_low_rocky':       'mountains_low_rocky.png',
    'mountains_low_snowy':       'mountains_low_snowy.png',
    'mountains_medium_lush':     'mountains_medium_lush.png',
    'mountains_medium_rocky':    'mountains_medium_rocky.png',
    'mountains_medium_snowy':    'mountains_medium_snowy.png',
    'mountains_peak_lush':       'mountains_peak_lush.png',
    'mountains_peak_rocky':      'mountains_peak_rocky.png',
    'mountains_peak_snowy':      'mountains_peak_snowy.png',
    // === VOLCANIC (6) ===
    'mountain_volcano_lush_1':  'mountain_volcano_lush_1.png',
    'mountain_volcano_lush_2':  'mountain_volcano_lush_2.png',
    'mountain_volcano_rocky_1': 'mountain_volcano_rocky_1.png',
    'mountain_volcano_rocky_2': 'mountain_volcano_rocky_2.png',
    'mountain_volcano_snowy_1': 'mountain_volcano_snowy_1.png',
    'mountain_volcano_snowy_2': 'mountain_volcano_snowy_2.png',
    // === SNOW (9) ===
    'snow_area_1':   'snow_area_1.png',
    'snow_area_2':   'snow_area_2.png',
    'snow_drifts_1': 'snow_drifts_1.png',
    'snow_drifts_2': 'snow_drifts_2.png',
    'snow_field_1':  'snow_field_1.png',
    'snow_field_2':  'snow_field_2.png',
    'snow_field_3':  'snow_field_3.png',
    'snow_field_4':  'snow_field_4.png',
    'snow_field_5':  'snow_field_5.png',
    // === WETLANDS (14) ===
    'wetlands_1':      'wetlands_1.png',
    'wetlands_2':      'wetlands_2.png',
    'wetlands_3':      'wetlands_3.png',
    'wetlands_4':      'wetlands_4.png',
    'wetlands_5':      'wetlands_5.png',
    'wetlands_6':      'wetlands_6.png',
    'wetlands_7':      'wetlands_7.png',
    'wetlands_damp_1': 'wetlands_damp_1.png',
    'wetlands_damp_2': 'wetlands_damp_2.png',
    'wetlands_damp_3': 'wetlands_damp_3.png',
    'wetlands_damp_4': 'wetlands_damp_4.png',
    'wetlands_damp_5': 'wetlands_damp_5.png',
    'wetlands_damp_6': 'wetlands_damp_6.png',
    'wetlands_damp_7': 'wetlands_damp_7.png',
    // === SWAMP WATER (14) ===
    'swamp_soft_1':                'swamp_soft_1.png',
    'swamp_soft_2':                'swamp_soft_2.png',
    'swamp_still_1':               'swamp_still_1.png',
    'swamp_still_2':               'swamp_still_2.png',
    'swamp_still_3':               'swamp_still_3.png',
    'water_-_swamp_soft_waves_1':  'water_-_swamp_soft_waves_1.png',
    'water_-_swamp_soft_waves_2':  'water_-_swamp_soft_waves_2.png',
    'water_-_swamp_still_water_1': 'water_-_swamp_still_water_1.png',
    'water_-_swamp_still_water_2': 'water_-_swamp_still_water_2.png',
    'water_-_swamp_still_water_3': 'water_-_swamp_still_water_3.png',
    'water_-_swamp_still_water_4': 'water_-_swamp_still_water_4.png',
    'water_-_swamp_still_water_5': 'water_-_swamp_still_water_5.png',
    'water_-_swamp_waves_1':       'water_-_swamp_waves_1.png',
    'water_-_swamp_waves_2':       'water_-_swamp_waves_2.png',
    // === OCEAN WATER (9) ===
    'water_-_ocean_soft_waves_1':  'water_-_ocean_soft_waves_1.png',
    'water_-_ocean_soft_waves_2':  'water_-_ocean_soft_waves_2.png',
    'water_-_ocean_still_water_1': 'water_-_ocean_still_water_1.png',
    'water_-_ocean_still_water_2': 'water_-_ocean_still_water_2.png',
    'water_-_ocean_still_water_3': 'water_-_ocean_still_water_3.png',
    'water_-_ocean_still_water_4': 'water_-_ocean_still_water_4.png',
    'water_-_ocean_still_water_5': 'water_-_ocean_still_water_5.png',
    'water_-_ocean_waves_1':       'water_-_ocean_waves_1.png',
    'water_-_ocean_waves_2':       'water_-_ocean_waves_2.png',
    // === COAST (11) ===
    'coast_-_beach_big_n':     'coast_-_beach_big_n.png',
    'coast_-_beach_big_nw':    'coast_-_beach_big_nw.png',
    'coast_-_beach_big_s':     'coast_-_beach_big_s.png',
    'coast_-_beach_big_sw':    'coast_-_beach_big_sw.png',
    'coast_-_beach_medium_nw': 'coast_-_beach_medium_nw.png',
    'coast_-_beach_medium_sw': 'coast_-_beach_medium_sw.png',
    'coast_-_beach_medium_w':  'coast_-_beach_medium_w.png',
    'coast_-_beach_small_n':   'coast_-_beach_small_n.png',
    'coast_-_beach_small_nw':  'coast_-_beach_small_nw.png',
    'coast_-_beach_small_s':   'coast_-_beach_small_s.png',
    'coast_-_beach_small_sw':  'coast_-_beach_small_sw.png',
    // === DIRT PATHS (COMPOSITE) (3) ===
    'dirt_path_n':     'dirt_path_n.png',
    'dirt_path_rocky': 'dirt_path_rocky.png',
    'dirt_path_snowy': 'dirt_path_snowy.png',
    // === DIRT PATHS (44) ===
    'dirt_path_10_n':  'dirt_path_10_n.png',
    'dirt_path_10_nw': 'dirt_path_10_nw.png',
    'dirt_path_10_s':  'dirt_path_10_s.png',
    'dirt_path_10_sw': 'dirt_path_10_sw.png',
    'dirt_path_11_n':  'dirt_path_11_n.png',
    'dirt_path_11_ne': 'dirt_path_11_ne.png',
    'dirt_path_11_s':  'dirt_path_11_s.png',
    'dirt_path_11_se': 'dirt_path_11_se.png',
    'dirt_path_12_e':  'dirt_path_12_e.png',
    'dirt_path_12_n':  'dirt_path_12_n.png',
    'dirt_path_13_n':  'dirt_path_13_n.png',
    'dirt_path_13_ne': 'dirt_path_13_ne.png',
    'dirt_path_13_s':  'dirt_path_13_s.png',
    'dirt_path_13_se': 'dirt_path_13_se.png',
    'dirt_path_1_n':   'dirt_path_1_n.png',
    'dirt_path_1_ne':  'dirt_path_1_ne.png',
    'dirt_path_1_s':   'dirt_path_1_s.png',
    'dirt_path_1_se':  'dirt_path_1_se.png',
    'dirt_path_2_n':   'dirt_path_2_n.png',
    'dirt_path_2_ne':  'dirt_path_2_ne.png',
    'dirt_path_3_n':   'dirt_path_3_n.png',
    'dirt_path_3_ne':  'dirt_path_3_ne.png',
    'dirt_path_3_se':  'dirt_path_3_se.png',
    'dirt_path_4_n':   'dirt_path_4_n.png',
    'dirt_path_4_ne':  'dirt_path_4_ne.png',
    'dirt_path_4_s':   'dirt_path_4_s.png',
    'dirt_path_4_se':  'dirt_path_4_se.png',
    'dirt_path_5_e':   'dirt_path_5_e.png',
    'dirt_path_5_ne':  'dirt_path_5_ne.png',
    'dirt_path_5_se':  'dirt_path_5_se.png',
    'dirt_path_6_n':   'dirt_path_6_n.png',
    'dirt_path_6_ne':  'dirt_path_6_ne.png',
    'dirt_path_6_s':   'dirt_path_6_s.png',
    'dirt_path_6_se':  'dirt_path_6_se.png',
    'dirt_path_7_n':   'dirt_path_7_n.png',
    'dirt_path_7_nw':  'dirt_path_7_nw.png',
    'dirt_path_7_s':   'dirt_path_7_s.png',
    'dirt_path_7_se':  'dirt_path_7_se.png',
    'dirt_path_7_sw':  'dirt_path_7_sw.png',
    'dirt_path_8_nw':  'dirt_path_8_nw.png',
    'dirt_path_8_sw':  'dirt_path_8_sw.png',
    'dirt_path_8_w':   'dirt_path_8_w.png',
    'dirt_path_9_n':   'dirt_path_9_n.png',
    'dirt_path_9_se':  'dirt_path_9_se.png',
    // === RIVERS (44) ===
    'river_10_n':  'river_10_n.png',
    'river_10_nw': 'river_10_nw.png',
    'river_10_s':  'river_10_s.png',
    'river_10_sw': 'river_10_sw.png',
    'river_11_n':  'river_11_n.png',
    'river_11_ne': 'river_11_ne.png',
    'river_11_s':  'river_11_s.png',
    'river_11_se': 'river_11_se.png',
    'river_12_e':  'river_12_e.png',
    'river_12_n':  'river_12_n.png',
    'river_13_n':  'river_13_n.png',
    'river_13_ne': 'river_13_ne.png',
    'river_13_s':  'river_13_s.png',
    'river_13_se': 'river_13_se.png',
    'river_1_n':   'river_1_n.png',
    'river_1_ne':  'river_1_ne.png',
    'river_1_s':   'river_1_s.png',
    'river_1_se':  'river_1_se.png',
    'river_2_n':   'river_2_n.png',
    'river_2_ne':  'river_2_ne.png',
    'river_3_n':   'river_3_n.png',
    'river_3_ne':  'river_3_ne.png',
    'river_3_se':  'river_3_se.png',
    'river_4_n':   'river_4_n.png',
    'river_4_ne':  'river_4_ne.png',
    'river_4_s':   'river_4_s.png',
    'river_4_se':  'river_4_se.png',
    'river_5_e':   'river_5_e.png',
    'river_5_ne':  'river_5_ne.png',
    'river_5_se':  'river_5_se.png',
    'river_6_n':   'river_6_n.png',
    'river_6_ne':  'river_6_ne.png',
    'river_6_s':   'river_6_s.png',
    'river_6_se':  'river_6_se.png',
    'river_7_n':   'river_7_n.png',
    'river_7_nw':  'river_7_nw.png',
    'river_7_s':   'river_7_s.png',
    'river_7_se':  'river_7_se.png',
    'river_7_sw':  'river_7_sw.png',
    'river_8_nw':  'river_8_nw.png',
    'river_8_sw':  'river_8_sw.png',
    'river_8_w':   'river_8_w.png',
    'river_9_n':   'river_9_n.png',
    'river_9_se':  'river_9_se.png',
    // === RUINS (2) ===
    'ruin_desert': 'ruin_desert.png',
    'ruin_lush':   'ruin_lush.png',
    // === URBAN (18) ===
    'urban_-_city_lush':                    'urban_-_city_lush.png',
    'urban_-_farm_lush':                    'urban_-_farm_lush.png',
    'urban_-_farmland_lush_1':              'urban_-_farmland_lush_1.png',
    'urban_-_farmland_lush_2':              'urban_-_farmland_lush_2.png',
    'urban_-_farmland_lush_3':              'urban_-_farmland_lush_3.png',
    'urban_-_modern_town_abandoned_lush_1': 'urban_-_modern_town_abandoned_lush_1.png',
    'urban_-_modern_town_abandoned_lush_2': 'urban_-_modern_town_abandoned_lush_2.png',
    'urban_-_modern_town_inhabited_lush_1': 'urban_-_modern_town_inhabited_lush_1.png',
    'urban_-_modern_town_inhabited_lush_2': 'urban_-_modern_town_inhabited_lush_2.png',
    'urban_-_modern_town_lumber_yard_lush': 'urban_-_modern_town_lumber_yard_lush.png',
    'urban_-_monastery_lush':               'urban_-_monastery_lush.png',
    'urban_-_tower_lush':                   'urban_-_tower_lush.png',
    'urban_-_town_lush':                    'urban_-_town_lush.png',
    'urban_abandoned_1':                    'urban_abandoned_1.png',
    'urban_abandoned_2':                    'urban_abandoned_2.png',
    'urban_farmland_1':                     'urban_farmland_1.png',
    'urban_farmland_2':                     'urban_farmland_2.png',
    'urban_farmland_3':                     'urban_farmland_3.png',
};
// Total: 241 tiles

/**
 * Get the full path for a tile key
 * @param {string} tileKey - Key from TerrainTiles
 * @returns {string|null} Full relative path to the tile image, or null if unknown key
 */
export function getTerrainTilePath(tileKey) {
    const filename = TerrainTiles[tileKey];
    if (!filename) return null;
    return TERRAIN_BASE_PATH + filename;
}

/**
 * Preload all terrain tiles needed for a map.
 * Call before renderGrid() to avoid visual pop-in.
 * 
 * @param {string[]} tileKeys - Array of tile keys used by this map
 * @returns {Promise<Map<string, HTMLImageElement>>} Loaded images keyed by tileKey
 */
export async function preloadTerrainTiles(tileKeys) {
    const uniqueKeys = [...new Set(tileKeys)];
    const loaded = new Map();
    
    const promises = uniqueKeys.map(key => {
        return new Promise((resolve) => {
            const path = getTerrainTilePath(key);
            if (!path) {
                resolve();
                return;
            }
            const img = new Image();
            img.onload = () => {
                loaded.set(key, img);
                resolve();
            };
            img.onerror = () => {
                console.warn(`[TerrainAssets] Failed to load tile: ${key} (${path})`);
                resolve();
            };
            img.src = path;
        });
    });
    
    await Promise.all(promises);
    return loaded;
}
