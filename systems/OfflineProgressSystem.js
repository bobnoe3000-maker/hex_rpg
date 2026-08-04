/**
 * @file OfflineProgressSystem.js
 * @description Core system for calculating and simulating offline progress.
 *              When a player returns after being away, this system calculates
 *              what combat progress their character made while offline.
 *              Supports battle map combat simulation with configurable max duration.
 *              Designed to be extensible for future town-based offline features.
 * 
 * @usage Called by CharacterManager when loading a character to check for offline progress.
 *        Results are passed to OfflineProgressModal for display.
 * @dependencies
 *   - GameConfig (config/gameConfig.js) - offline progress settings
 *   - MapConfig (config/mapConfig.js) - map and NPC data
 *   - NPCConfig (config/npcConfig.js) - creature stats
 *   - LootGenerator (systems/LootGenerator.js) - item generation
 *   - housingConfig.js (config/housingConfig.js) - material definitions
 *   - Item (models/Item.js) - item creation
 * 
 * @version 1.3.0
 * @changelog
 *   - v1.3.0 (2026-01-31): Added aether tracking to offline progress.
 *                          New aetherEarned field in results, accumulated from loot drops.
 *                          Updated applyProgress() to add aether to character.
 *                          Death penalty now reduces aether by 50%.
 *   - v1.2.0 (2026-01-27): Added safety check in applyProgress() to handle plain JSON objects.
 *                          Added Character import for reconstruction fallback.
 *   - v1.1.0 (2026-01-27): Added housing material drops to offline progress.
 *                          New _generateOfflineMaterials() method.
 *                          Updated applyProgress() to add materials to character.
 *                          Materials included in progress results for modal display.
 *   - v1.0.0 (2025-01-25): Initial implementation with battle map simulation
 */

import { GameConfig } from '../config/gameConfig.js';
import { getMap } from '../config/mapConfig.js';
import { NPCConfig } from '../config/npcConfig.js';
import { LootGenerator } from './LootGenerator.js';
import { Character } from '../models/Character.js';
import { 
    MaterialDropTiers, 
    HousingMaterials,
    getMaterial 
} from '../config/housingConfig.js';

/**
 * Offline Progress System
 * Calculates simulated progress while player was away
 */
export class OfflineProgressSystem {
    
    /**
     * Calculate offline progress for a character
     * @param {Character} character - The character to calculate progress for
     * @returns {Object|null} Progress results or null if no progress applicable
     */
    static calculateOfflineProgress(character) {
        // Check if offline progress is enabled
        const config = GameConfig.offlineProgress;
        if (!config || !config.enabled) {
            return null;
        }
        
        // Check if character has a last active timestamp
        const lastActive = character.lastActiveTimestamp;
        if (!lastActive) {
            return null;
        }
        
        // Calculate elapsed time
        const now = Date.now();
        const elapsedMs = now - lastActive;
        
        // Minimum threshold - at least 1 minute of offline time
        const minOfflineTime = 60 * 1000; // 1 minute
        if (elapsedMs < minOfflineTime) {
            return null;
        }
        
        // Check if character was on a battle map (not in town)
        const currentMapId = character.currentMapId;
        if (!currentMapId || currentMapId === 'town') {
            // Future: Could add town-based offline progress here
            return this._createEmptyResult(elapsedMs, 'town');
        }
        
        // Check if map is excluded from offline progress
        if (config.excludedMaps && config.excludedMaps.includes(currentMapId)) {
            return this._createEmptyResult(elapsedMs, 'excluded_map');
        }
        
        // Get map data
        const mapData = getMap(currentMapId);
        if (!mapData) {
            return this._createEmptyResult(elapsedMs, 'invalid_map');
        }
        
        // Cap elapsed time to max duration
        const maxDuration = config.maxDuration || (4 * 60 * 60 * 1000); // Default 4 hours
        const cappedElapsedMs = Math.min(elapsedMs, maxDuration);
        
        // Simulate combat progress
        return this._simulateBattleProgress(character, mapData, cappedElapsedMs, elapsedMs);
    }
    
    /**
     * Simulate battle progress for offline time
     * @private
     */
    static _simulateBattleProgress(character, mapData, cappedElapsedMs, actualElapsedMs) {
        const config = GameConfig.offlineProgress;
        const result = {
            type: 'battle',
            mapId: mapData.id,
            mapName: mapData.name,
            actualElapsedMs: actualElapsedMs,
            cappedElapsedMs: cappedElapsedMs,
            wasCapped: actualElapsedMs > cappedElapsedMs,
            
            // Combat results
            kills: 0,
            xpEarned: 0,
            goldEarned: 0,
            aetherEarned: 0,      // NEW v1.3.0: Aether currency
            itemsFound: [],
            materialsFound: [],   // v1.1.0: Housing materials
            
            // Death tracking
            deathOccurred: false,
            deathTime: 0,
            
            // For display
            timeAwayFormatted: this._formatDuration(actualElapsedMs),
            progressTimeFormatted: this._formatDuration(cappedElapsedMs)
        };
        
        // Get average NPC stats for this map
        const npcStats = this._getMapNPCStats(mapData);
        if (!npcStats || npcStats.avgLevel === 0) {
            result.reason = 'no_npcs';
            return result;
        }
        
        // Calculate kill rate based on character vs NPC level difference
        const levelDiff = character.level - npcStats.avgLevel;
        const killsPerMinute = this._calculateKillsPerMinute(character, levelDiff, config);
        
        // Convert elapsed time to minutes
        const progressMinutes = cappedElapsedMs / (60 * 1000);
        
        // Check for death at intervals
        const deathCheckResult = this._checkForDeath(character, npcStats, progressMinutes, config);
        
        // If death occurred, progress stops at death time
        const effectiveMinutes = deathCheckResult.deathOccurred 
            ? deathCheckResult.deathTimeMinutes 
            : progressMinutes;
        
        // Calculate kills
        const totalKills = Math.floor(killsPerMinute * effectiveMinutes);
        result.kills = totalKills;
        
        // Calculate XP
        const xpPerKill = this._calculateXPPerKill(npcStats, config);
        result.xpEarned = Math.floor(totalKills * xpPerKill * (config.xpMultiplier || 0.75));
        
        // Calculate gold
        const goldPerKill = this._calculateGoldPerKill(npcStats, config);
        result.goldEarned = Math.floor(totalKills * goldPerKill * (config.goldMultiplier || 0.70));
        
        // Generate loot (items and aether) - NEW v1.3.0: Now returns aether too
        const lootResults = this._generateOfflineLoot(character, mapData, npcStats, totalKills, config);
        result.itemsFound = lootResults.items;
        result.aetherEarned = lootResults.aether;
        
        // Generate housing materials (v1.1.0)
        result.materialsFound = this._generateOfflineMaterials(character, mapData, npcStats, totalKills, config);
        
        // Apply death penalty if occurred
        if (deathCheckResult.deathOccurred) {
            result.deathOccurred = true;
            result.deathTime = deathCheckResult.deathTimeMinutes * 60 * 1000;
            result.deathTimeFormatted = this._formatDuration(result.deathTime);
            
            // Reduce rewards by 50% on death
            result.xpEarned = Math.floor(result.xpEarned * 0.5);
            result.goldEarned = Math.floor(result.goldEarned * 0.5);
            result.aetherEarned = Math.floor(result.aetherEarned * 0.5);  // NEW v1.3.0
            // Materials reduced by 50% on death too
            for (const mat of result.materialsFound) {
                mat.quantity = Math.floor(mat.quantity * 0.5);
            }
            // Remove materials with 0 quantity
            result.materialsFound = result.materialsFound.filter(m => m.quantity > 0);
            // Items are still kept but we may drop some (handled during apply)
        }
        
        return result;
    }
    
    /**
     * Get average NPC stats for a map
     * @private
     */
    static _getMapNPCStats(mapData) {
        if (!mapData.npcs || mapData.npcs.length === 0) {
            return { avgLevel: 0, avgXP: 0, avgGold: 0, lootTables: [] };
        }
        
        let totalLevel = 0;
        let totalXP = 0;
        let totalGold = 0;
        let count = 0;
        const lootTables = new Set();
        
        for (const npcDef of mapData.npcs) {
            const creature = NPCConfig.creatures[npcDef.creatureId];
            if (!creature) continue;
            
            // Get level range
            const [minLevel, maxLevel] = npcDef.levelRange || [creature.baseLevel, creature.baseLevel];
            const avgLevel = (minLevel + maxLevel) / 2;
            
            totalLevel += avgLevel;
            totalXP += creature.xpValue || 25;
            
            // Estimate gold from loot table
            if (creature.lootTable) {
                lootTables.add(creature.lootTable);
            }
            
            count++;
        }
        
        if (count === 0) {
            return { avgLevel: 0, avgXP: 0, avgGold: 0, lootTables: [] };
        }
        
        // Estimate gold based on level
        const avgLevel = totalLevel / count;
        const estimatedGold = Math.floor(5 + avgLevel * 2);
        
        return {
            avgLevel: avgLevel,
            avgXP: totalXP / count,
            avgGold: estimatedGold,
            lootTables: Array.from(lootTables)
        };
    }
    
    /**
     * Calculate kills per minute based on level difference
     * @private
     */
    static _calculateKillsPerMinute(character, levelDiff, config) {
        const baseRate = config.combatsPerMinute || 1.5;
        
        // Adjust rate based on level difference
        // Higher level player = faster kills
        // Lower level player = slower kills
        let modifier = 1.0;
        
        if (levelDiff >= 10) {
            modifier = 1.5; // Much higher level - fast kills
        } else if (levelDiff >= 5) {
            modifier = 1.25;
        } else if (levelDiff >= 0) {
            modifier = 1.0; // Equal level
        } else if (levelDiff >= -5) {
            modifier = 0.8;
        } else if (levelDiff >= -10) {
            modifier = 0.6;
        } else {
            modifier = 0.4; // Much lower level - slow and dangerous
        }
        
        return baseRate * modifier;
    }
    
    /**
     * Calculate XP per kill
     * @private
     */
    static _calculateXPPerKill(npcStats, config) {
        return npcStats.avgXP || 25;
    }
    
    /**
     * Calculate gold per kill
     * @private
     */
    static _calculateGoldPerKill(npcStats, config) {
        return npcStats.avgGold || 10;
    }
    
    /**
     * Check for death during offline progress
     * @private
     */
    static _checkForDeath(character, npcStats, progressMinutes, config) {
        const checkInterval = (config.deathCheckInterval || (30 * 60 * 1000)) / (60 * 1000); // Convert to minutes
        const baseDeathChance = config.baseDeathChance || 0.03;
        const deathChancePerLevel = config.deathChancePerLevelDiff || 0.02;
        
        // Calculate death chance based on level difference
        const levelDiff = npcStats.avgLevel - character.level;
        let deathChance = baseDeathChance;
        
        if (levelDiff > 0) {
            deathChance += levelDiff * deathChancePerLevel;
        } else if (levelDiff < -10) {
            // Much higher level than NPCs = very low death chance
            deathChance = 0.005;
        }
        
        // Cap death chance
        deathChance = Math.min(deathChance, 0.5);
        
        // Check at each interval
        for (let currentTime = checkInterval; currentTime <= progressMinutes; currentTime += checkInterval) {
            // Deterministic "random" based on character ID and time
            const seed = this._hashCode(`${character.id}_death_${Math.floor(currentTime)}`);
            const roll = (seed % 10000) / 10000;
            
            if (roll < deathChance) {
                return {
                    deathOccurred: true,
                    deathTimeMinutes: currentTime
                };
            }
        }
        
        return {
            deathOccurred: false,
            deathTimeMinutes: progressMinutes
        };
    }
    
    /**
     * Generate loot items and aether for offline progress
     * Uses LootGenerator directly - no additional drop chance modifier
     * Each kill has a chance to drop loot based on the NPC's loot table
     * @private
     * @returns {Object} { items: Item[], aether: number }
     */
    static _generateOfflineLoot(character, mapData, npcStats, totalKills, config) {
        const items = [];
        let totalAether = 0;  // NEW v1.3.0: Track aether
        
        // Validate map has NPCs
        if (!mapData.npcs || mapData.npcs.length === 0) {
            return { items, aether: totalAether };
        }
        
        // Aether multiplier for offline (slightly lower than active play)
        const offlineAetherMultiplier = config.aetherDropMultiplier || 0.70;
        
        // Simulate loot for each kill
        for (let i = 0; i < totalKills; i++) {
            try {
                // Pick a random NPC from the map based on kill number (deterministic)
                const seed = this._hashCode(`${character.id}_loot_${i}`);
                const npcIndex = seed % mapData.npcs.length;
                const npcDef = mapData.npcs[npcIndex];
                const creature = NPCConfig.creatures[npcDef.creatureId];
                
                if (!creature || !creature.lootTable) continue;
                
                // Create a mock NPC for loot generation
                const mockNpc = {
                    level: npcDef.levelRange 
                        ? Math.floor((npcDef.levelRange[0] + npcDef.levelRange[1]) / 2) 
                        : creature.baseLevel || 1,
                    lootTable: creature.lootTable,
                    lootMultiplier: 1.0
                };
                
                // Use LootGenerator static method directly
                // This handles the drop chance internally based on loot table
                const loot = LootGenerator.generateLoot(mockNpc);
                
                // Collect any items that dropped
                if (loot.items && loot.items.length > 0) {
                    items.push(...loot.items);
                }
                
                // Collect aether (NEW v1.3.0)
                if (loot.aether && loot.aether > 0) {
                    // Apply offline multiplier to aether
                    totalAether += Math.floor(loot.aether * offlineAetherMultiplier);
                }
            } catch (e) {
                console.warn('Error generating offline loot for kill', i, e);
            }
        }
        
        return { items, aether: totalAether };
    }
    
    /**
     * Generate housing materials for offline progress (v1.1.0)
     * Each kill has a chance to drop materials based on NPC loot table tier
     * @private
     */
    static _generateOfflineMaterials(character, mapData, npcStats, totalKills, config) {
        const materialsMap = {}; // { materialId: quantity }
        
        // Validate map has NPCs
        if (!mapData.npcs || mapData.npcs.length === 0) {
            return [];
        }
        
        // Material drop chance multiplier for offline (slightly lower than active play)
        const offlineMaterialMultiplier = config.materialDropMultiplier || 0.70;
        
        // Simulate material drops for each kill
        for (let i = 0; i < totalKills; i++) {
            try {
                // Pick a random NPC from the map (deterministic based on kill number)
                const seed = this._hashCode(`${character.id}_material_${i}`);
                const npcIndex = seed % mapData.npcs.length;
                const npcDef = mapData.npcs[npcIndex];
                const creature = NPCConfig.creatures[npcDef.creatureId];
                
                if (!creature) continue;
                
                // Get loot table ID for material drop config
                const lootTableId = creature.lootTable || 'common';
                
                // Get material drop config from MaterialDropTiers
                const dropConfig = MaterialDropTiers[lootTableId] || MaterialDropTiers.common || { dropChance: 0.15, tier: 1 };
                
                // Apply offline multiplier to drop chance
                const adjustedDropChance = dropConfig.dropChance * offlineMaterialMultiplier;
                
                // Check if material drops
                const dropRoll = ((seed >> 8) % 10000) / 10000;
                if (dropRoll > adjustedDropChance) continue;
                
                // Determine material tier based on NPC level and loot table tier
                const npcLevel = npcDef.levelRange 
                    ? Math.floor((npcDef.levelRange[0] + npcDef.levelRange[1]) / 2) 
                    : creature.baseLevel || 1;
                
                let maxTier = dropConfig.tier || 1;
                // Higher level NPCs can drop higher tier materials
                if (npcLevel >= 20) maxTier = Math.max(maxTier, 4);
                else if (npcLevel >= 15) maxTier = Math.max(maxTier, 3);
                else if (npcLevel >= 10) maxTier = Math.max(maxTier, 2);
                maxTier = Math.min(maxTier, 5); // Cap at tier 5 for offline (no void crystal)
                
                // Roll for actual tier (weighted toward lower tiers)
                const tierRoll = ((seed >> 16) % 100) / 100;
                let rolledTier = 1;
                if (tierRoll < 0.50) {
                    rolledTier = 1;
                } else if (tierRoll < 0.75 && maxTier >= 2) {
                    rolledTier = 2;
                } else if (tierRoll < 0.88 && maxTier >= 3) {
                    rolledTier = 3;
                } else if (tierRoll < 0.96 && maxTier >= 4) {
                    rolledTier = 4;
                } else if (maxTier >= 5) {
                    rolledTier = 5;
                } else {
                    rolledTier = Math.min(maxTier, 1);
                }
                
                // Get materials for this tier
                const tierMaterials = this._getMaterialsForTier(rolledTier);
                if (tierMaterials.length === 0) continue;
                
                // Pick a random material from the tier
                const materialIndex = (seed >> 24) % tierMaterials.length;
                const materialId = tierMaterials[materialIndex];
                
                // Add 1-2 materials
                const quantity = 1 + ((seed >> 4) % 2);
                
                if (materialsMap[materialId]) {
                    materialsMap[materialId] += quantity;
                } else {
                    materialsMap[materialId] = quantity;
                }
                
            } catch (e) {
                console.warn('Error generating offline material for kill', i, e);
            }
        }
        
        // Convert map to array format with material details
        const result = [];
        for (const [materialId, quantity] of Object.entries(materialsMap)) {
            const matData = getMaterial(materialId);
            result.push({
                materialId: materialId,
                quantity: quantity,
                name: matData?.name || materialId,
                icon: matData?.icon || '📦',
                tier: matData?.tier || 1
            });
        }
        
        // Sort by tier then name
        result.sort((a, b) => {
            if (a.tier !== b.tier) return a.tier - b.tier;
            return a.name.localeCompare(b.name);
        });
        
        return result;
    }
    
    /**
     * Get material IDs for a specific tier
     * @private
     */
    static _getMaterialsForTier(tier) {
        const materialsByTier = {
            1: ['wood', 'stone', 'clay'],
            2: ['iron', 'hardwood', 'leather_strips'],
            3: ['marble', 'silver_ingot'],
            4: ['crystal_shard', 'dragonwood'],
            5: ['ethereal_essence', 'starstone'],
            6: ['void_crystal']
        };
        return materialsByTier[tier] || materialsByTier[1];
    }
    
    /**
     * Apply offline progress results to character
     * @param {Character} character - Character to apply progress to
     * @param {Object} progress - Progress results from calculateOfflineProgress
     * @returns {Object} Applied results with any modifications (e.g., death penalties)
     */
    static applyProgress(character, progress) {
        if (!progress || progress.type !== 'battle') {
            return progress;
        }
        
        // Safety check: Ensure character is a proper Character instance with methods
        // This handles cases where a plain JSON object was passed instead of a Character instance
        if (typeof character.gainXP !== 'function') {
            console.warn('OfflineProgressSystem.applyProgress: Character is not a proper instance, attempting reconstruction...');
            try {
                character = Character.fromJSON(character);
                if (typeof character.gainXP !== 'function') {
                    console.error('OfflineProgressSystem.applyProgress: Failed to reconstruct character - gainXP still not available');
                    return progress;
                }
            } catch (e) {
                console.error('OfflineProgressSystem.applyProgress: Error reconstructing character:', e);
                return progress;
            }
        }
        
        const appliedResult = { ...progress };
        
        // Apply XP
        if (progress.xpEarned > 0) {
            const startLevel = character.level;
            character.gainXP(progress.xpEarned);
            appliedResult.levelsGained = character.level - startLevel;
        }
        
        // Apply gold
        if (progress.goldEarned > 0) {
            character.gold += progress.goldEarned;
        }
        
        // Apply aether (NEW v1.3.0)
        if (progress.aetherEarned > 0) {
            // Use character's addAether method if available, otherwise directly modify
            if (typeof character.addAether === 'function') {
                character.addAether(progress.aetherEarned);
            } else if (character.aether !== undefined) {
                character.aether += progress.aetherEarned;
            } else {
                // Initialize aether if it doesn't exist
                character.aether = progress.aetherEarned;
            }
            appliedResult.aetherAdded = progress.aetherEarned;
        }
        
        // Apply items to inventory
        appliedResult.itemsAddedToInventory = [];
        appliedResult.itemsOverflow = [];
        
        for (const item of progress.itemsFound) {
            const added = character.addToInventory(item);
            if (added) {
                appliedResult.itemsAddedToInventory.push(item);
            } else {
                // Inventory full - convert to gold
                const goldValue = Math.floor((item.value || 10) * 0.25);
                character.gold += goldValue;
                appliedResult.itemsOverflow.push({ item, goldValue });
            }
        }
        
        // Apply housing materials (v1.1.0)
        appliedResult.materialsAdded = [];
        if (progress.materialsFound && progress.materialsFound.length > 0) {
            for (const mat of progress.materialsFound) {
                // Use character's addMaterial method if available, otherwise directly modify materials object
                if (character.addMaterial) {
                    character.addMaterial(mat.materialId, mat.quantity);
                } else if (character.materials) {
                    character.materials[mat.materialId] = (character.materials[mat.materialId] || 0) + mat.quantity;
                }
                appliedResult.materialsAdded.push(mat);
            }
        }
        
        // Handle death if occurred
        if (progress.deathOccurred) {
            appliedResult.droppedItems = this._applyDeathPenalty(character);
            
            // Respawn at 50% HP/MP
            character.currentHealth = Math.floor(character.maxHealth * 0.5);
            character.currentMana = Math.floor(character.maxMana * 0.5);
            
            // Move to town
            character.currentMapId = 'town';
            character.position = { q: 6, r: 5 }; // Town starting position
        }
        
        return appliedResult;
    }
    
    /**
     * Apply death penalty - same as online death
     * @private
     */
    static _applyDeathPenalty(character) {
        const droppedItems = [];
        const equipDropChance = GameConfig.death?.equipDropChance || 0.10;
        const inventoryDropChance = GameConfig.death?.inventoryDropChance || 0.25;
        
        // Check equipped items
        const equipSlots = ['head', 'necklace', 'ring1', 'ring2', 'body', 'cape', 'boots', 'mainHand', 'offHand'];
        for (const slot of equipSlots) {
            const item = character.equipment[slot];
            if (item) {
                const seed = this._hashCode(`${character.id}_death_equip_${slot}`);
                const roll = (seed % 10000) / 10000;
                
                if (roll < equipDropChance) {
                    droppedItems.push({ ...item, slot });
                    character.equipment[slot] = null;
                }
            }
        }
        
        // Check inventory items
        const inventoryToKeep = [];
        for (let i = 0; i < character.inventory.length; i++) {
            const item = character.inventory[i];
            if (item) {
                const seed = this._hashCode(`${character.id}_death_inv_${i}`);
                const roll = (seed % 10000) / 10000;
                
                if (roll < inventoryDropChance) {
                    droppedItems.push(item);
                } else {
                    inventoryToKeep.push(item);
                }
            }
        }
        character.inventory = inventoryToKeep;
        
        return droppedItems;
    }
    
    /**
     * Create an empty result for cases where no progress applies
     * @private
     */
    static _createEmptyResult(elapsedMs, reason) {
        return {
            type: 'none',
            reason: reason,
            actualElapsedMs: elapsedMs,
            timeAwayFormatted: this._formatDuration(elapsedMs),
            xpEarned: 0,
            goldEarned: 0,
            aetherEarned: 0,      // NEW v1.3.0
            kills: 0,
            itemsFound: [],
            materialsFound: [],
            deathOccurred: false
        };
    }
    
    /**
     * Format duration in ms to human readable string
     * @private
     */
    static _formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            const remainingMins = minutes % 60;
            if (remainingMins > 0) {
                return `${hours}h ${remainingMins}m`;
            }
            return `${hours}h`;
        }
        
        if (minutes > 0) {
            return `${minutes}m`;
        }
        
        return `${seconds}s`;
    }
    
    /**
     * Simple hash function for deterministic randomness
     * @private
     */
    static _hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
    }
}

export default OfflineProgressSystem;
