/**
 * @file LootGenerator.js
 * @description Handles loot generation when NPCs die. Rolls for gold (always drops),
 *              items (chance-based), potions (chance-based, tier-gated by level),
 *              Aether currency (chance-based), and housing materials (chance-based,
 *              tier-gated by enemy level).
 * 
 * @location systems/LootGenerator.js
 * @usage Called when NPC dies to generate loot, integrates with MapInstance
 * @dependencies 
 *   - config/itemConfig.js
 *   - models/Item.js
 *   - config/housingConfig.js (for material definitions)
 * 
 * @version 1.7.0
 * @changelog
 *   - v1.7.0 (2026-02-10): Gear material tier gating by NPC level. rollMaterial() now accepts
 *                          npcLevel parameter and hard-caps material tier: Lv1-9 → T1 max,
 *                          Lv10-19 → T2, Lv20-29 → T3, Lv30-49 → T4, Lv50-74 → T5, Lv75+ → T6.
 *                          Prevents low-level enemies from dropping endgame materials (e.g. no
 *                          Ethereal/Voidhide from level 1 rats). New _getMaxGearMaterialTier().
 *   - v1.6.0 (2026-02-10): Housing materialDrops buff integration. generateLoot() now accepts
 *                          optional killer parameter. rollMaterialDrop() accepts materialDropBonus
 *                          parameter that boosts material drop chance from Garden housing buff.
 *   - v1.5.0 (2026-02-09): Slot-aware proc generation (PROC_SYSTEM_IMPLEMENTATION.md Phase 2).
 *                          rollProc() now accepts target slot and filters proc pool by
 *                          slotProcRules.allowedTriggers and proc.slotRestriction.
 *                          Body armor can no longer roll weapon-only procs like executioner.
 *                          Added _getAvailableProcsForSlot() helper.
 *   - v1.4.0 (2025-01-27): Added potion drops with tier-gated availability.
 *                          Added rollPotionDrop() method. generateLoot() now returns
 *                          potions array. Higher level NPCs drop better potions.
 *                          Default 15% drop chance, configurable via potionDropChance.
 *   - v1.3.0 (2026-01-26): Added housing material drops with tier-gated availability.
 *                          Added rollMaterialDrop() method using MaterialDropTiers config.
 *                          generateLoot() now returns material property.
 *   - v1.2.0 (2025-01-21): Added Aether currency drops with configurable rates per loot table
 *   - v1.1.0 (2025-01-17): Added rollTier() for weighted tier drops (t0-t3), 
 *                          added generateTestDrop() and analyzeDropRates() debug methods
 *   - v1.0.0 (2025-01): Initial implementation - gold always drops, weighted material/proc rolls
 */

import { 
    ItemConfig, 
    getItem, 
    getMaterial, 
    getMaterialsForType,
    getProc,
    getLootTable,
    getAetherConfig,
    getPotion,
    getPotionsByType
} from '../config/itemConfig.js';
import { Item, createItem } from '../models/Item.js';
import { 
    HousingMaterials, 
    MaterialDropTiers 
} from '../config/housingConfig.js';

/**
 * LootGenerator - Static utility class for generating loot drops
 */
export class LootGenerator {
    
    /**
     * Generate loot from an NPC death
     * Gold ALWAYS drops. Items, Potions, Aether, and Materials have a chance to drop based on loot table.
     * 
     * @param {NPC} npc - The NPC that died
     * @param {Character} [killer=null] - The character who killed the NPC (for housing buff application)
     * @returns {object} { gold: number, items: Item[], potions: Object[], aether: number, material: { materialId, quantity } | null }
     */
    static generateLoot(npc, killer = null) {
        const lootTableId = npc.lootTable || 'common';
        const lootTable = getLootTable(lootTableId);
        const npcLevel = npc.level || 1;
        const lootMultiplier = npc.lootMultiplier || 1.0;
        
        // Gold ALWAYS drops
        const gold = this.rollGold(lootTable, npcLevel, lootMultiplier);
        
        // Items have a chance to drop
        const items = [];
        const item = this.rollItemDrop(lootTable, npcLevel);
        if (item) {
            items.push(item);
        }
        
        // Potions have a chance to drop (NEW v1.4.0)
        const potions = [];
        const potion = this.rollPotionDrop(lootTable, npcLevel, lootMultiplier);
        if (potion) {
            potions.push(potion);
        }
        
        // Aether has a chance to drop (v1.2.0)
        const aether = this.rollAetherDrop(lootTable, npcLevel, lootMultiplier);
        
        // Materials have a chance to drop (v1.3.0)
        // Housing: Garden materialDrops buff boosts material drop chance (v1.6.0)
        const materialDropBonus = killer?._housingBuffs?.materialDrops || 0;
        const material = this.rollMaterialDrop(lootTable, npcLevel, lootMultiplier, materialDropBonus);
        
        return { gold, items, potions, aether, material };
    }
    
    /**
     * Roll for gold amount (always drops)
     * @param {object} lootTable - Loot table config
     * @param {number} npcLevel - NPC level (scales gold slightly)
     * @param {number} multiplier - Loot multiplier from NPC subtype
     * @returns {number} Gold amount
     */
    static rollGold(lootTable, npcLevel = 1, multiplier = 1.0) {
        const min = lootTable.goldMin || 1;
        const max = lootTable.goldMax || 5;
        
        // Base gold roll
        let gold = Math.floor(Math.random() * (max - min + 1)) + min;
        
        // Scale slightly with NPC level (10% per level above 1)
        const levelBonus = 1 + (npcLevel - 1) * 0.1;
        gold = Math.floor(gold * levelBonus);
        
        // Apply loot multiplier
        gold = Math.floor(gold * multiplier);
        
        return Math.max(1, gold); // Minimum 1 gold
    }
    
    /**
     * Roll for Aether drop (chance-based)
     * @param {object} lootTable - Loot table config
     * @param {number} npcLevel - NPC level (affects quantity)
     * @param {number} multiplier - Loot multiplier from NPC subtype
     * @returns {number} Aether amount (0 if no drop)
     */
    static rollAetherDrop(lootTable, npcLevel = 1, multiplier = 1.0) {
        // Check if loot table has aether config
        const dropChance = lootTable.aetherDropChance || 0;
        if (dropChance <= 0) return 0;
        
        // Roll for drop
        if (Math.random() > dropChance) {
            return 0;
        }
        
        // Calculate quantity
        const min = lootTable.aetherMin || 1;
        const max = lootTable.aetherMax || 2;
        
        let aether = Math.floor(Math.random() * (max - min + 1)) + min;
        
        // Scale slightly with NPC level (5% per level above 5)
        if (npcLevel > 5) {
            const levelBonus = 1 + (npcLevel - 5) * 0.05;
            aether = Math.floor(aether * levelBonus);
        }
        
        // Apply loot multiplier
        aether = Math.floor(aether * multiplier);
        
        return Math.max(1, aether);
    }
    
    /**
     * Roll for potion drop (chance-based, tier-gated by NPC level)
     * Higher level NPCs can drop better potions.
     * 
     * @param {object} lootTable - Loot table config
     * @param {number} npcLevel - NPC level (determines available potion tiers)
     * @param {number} multiplier - Loot multiplier from NPC subtype
     * @returns {object|null} Potion object or null if no drop
     */
    static rollPotionDrop(lootTable, npcLevel = 1, multiplier = 1.0) {
        // Default potion drop chance (~15%), loot tables can override
        const dropChance = lootTable.potionDropChance ?? 0.15;
        if (dropChance <= 0) return null;
        
        // Apply loot multiplier to drop chance (bosses drop more)
        const adjustedChance = Math.min(1.0, dropChance * multiplier);
        
        // Roll for drop
        if (Math.random() > adjustedChance) {
            return null;
        }
        
        // Determine max potion tier based on NPC level
        // Level 1-4: tier 1, Level 5-9: tier 2, Level 10-19: tier 3, Level 20+: tier 4
        let maxTier = 1;
        if (npcLevel >= 20) maxTier = 4;
        else if (npcLevel >= 10) maxTier = 3;
        else if (npcLevel >= 5) maxTier = 2;
        
        // Get all potions up to max tier
        const allPotions = Object.values(ItemConfig.potions || {});
        const availablePotions = allPotions.filter(p => p.tier <= maxTier);
        
        if (availablePotions.length === 0) return null;
        
        // Weight selection - use dropWeight from potion config
        // Lower tier potions are more common
        const selectedPotion = this.weightedRandom(availablePotions, 'dropWeight');
        
        if (!selectedPotion) return null;
        
        // Create potion drop object
        // Quantity is usually 1, but bosses might drop more
        let quantity = 1;
        if (multiplier >= 2.0) {
            // Bosses can drop 1-2 potions
            quantity = Math.random() < 0.5 ? 2 : 1;
        }
        
        // Calculate restoreAmount from effect for UI compatibility
        // Potions have either effect.heal or effect.mana
        const restoreAmount = selectedPotion.effect?.heal || selectedPotion.effect?.mana || 0;
        
        return {
            id: `potion_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            baseId: selectedPotion.id,
            name: selectedPotion.name,
            type: 'potion',
            potionType: selectedPotion.potionType,
            tier: selectedPotion.tier,
            effect: selectedPotion.effect,
            restoreAmount: restoreAmount,  // For UI display compatibility
            cooldown: selectedPotion.cooldown,
            quantity: quantity,
            stackMax: selectedPotion.stackMax || 99,
            color: selectedPotion.color,
            icon: selectedPotion.icon,
            fallbackIcon: selectedPotion.fallbackIcon
        };
    }
    
    /**
     * Roll for housing material drop (chance-based, tier-gated by NPC level)
     * Materials are used for player housing upgrades.
     * 
     * @param {object} lootTable - Loot table config
     * @param {number} npcLevel - NPC level (determines available material tiers)
     * @param {number} multiplier - Loot multiplier from NPC subtype
     * @param {number} [materialDropBonus=0] - Housing Garden buff (%) that boosts drop chance (v1.6.0)
     * @returns {object|null} { materialId: string, quantity: number } or null if no drop
     */
    static rollMaterialDrop(lootTable, npcLevel = 1, multiplier = 1.0, materialDropBonus = 0) {
        // Default material drop chance if not specified in loot table
        // Common enemies have ~25% chance, better loot tables can override
        let dropChance = lootTable.materialDropChance ?? 0.25;
        if (dropChance <= 0) return null;
        
        // Housing: Garden materialDrops buff boosts drop chance (additive %)
        if (materialDropBonus > 0) {
            dropChance *= (1 + materialDropBonus / 100);
            dropChance = Math.min(1.0, dropChance); // Cap at 100%
        }
        
        // Roll for drop
        if (Math.random() > dropChance) {
            return null;
        }
        
        // Determine which material tiers are available based on NPC level
        const availableTiers = this._getAvailableMaterialTiers(npcLevel);
        if (availableTiers.length === 0) return null;
        
        // Get all materials from available tiers
        const availableMaterials = [];
        for (const [materialId, material] of Object.entries(HousingMaterials)) {
            if (availableTiers.includes(material.tier)) {
                availableMaterials.push({ ...material, id: materialId });
            }
        }
        
        if (availableMaterials.length === 0) return null;
        
        // Weight selection toward lower tiers (more common)
        // Higher tier materials should be rarer
        const weightedMaterials = availableMaterials.map(mat => {
            // Base weight decreases exponentially with tier
            // Tier 1: weight 100, Tier 2: 50, Tier 3: 25, Tier 4: 12, Tier 5: 6, Tier 6: 3
            const weight = Math.pow(0.5, mat.tier - 1) * 100;
            return { ...mat, weight };
        });
        
        // Select material using weighted random
        const selectedMaterial = this.weightedRandom(weightedMaterials, 'weight');
        
        // Calculate quantity (1-3 base, higher tiers drop less)
        const baseMin = lootTable.materialMin || 1;
        const baseMax = lootTable.materialMax || 3;
        
        // Reduce quantity for higher tier materials
        const tierPenalty = Math.max(0, selectedMaterial.tier - 2); // Tier 3+ gets penalty
        const adjustedMax = Math.max(1, baseMax - tierPenalty);
        const adjustedMin = Math.min(baseMin, adjustedMax);
        
        let quantity = Math.floor(Math.random() * (adjustedMax - adjustedMin + 1)) + adjustedMin;
        
        // Apply loot multiplier (but keep minimum of 1)
        quantity = Math.max(1, Math.floor(quantity * multiplier));
        
        return {
            materialId: selectedMaterial.id,
            quantity
        };
    }
    
    /**
     * Get available material tiers based on NPC level
     * Uses MaterialDropTiers from housingConfig.js
     * 
     * @param {number} npcLevel - NPC level
     * @returns {number[]} Array of available tier numbers
     */
    static _getAvailableMaterialTiers(npcLevel) {
        const tiers = [];
        
        for (const [tierKey, tierConfig] of Object.entries(MaterialDropTiers)) {
            // Extract tier number from key (e.g., "tier1" -> 1)
            const tierNum = parseInt(tierKey.replace('tier', ''), 10);
            
            if (npcLevel >= tierConfig.minEnemyLevel && npcLevel <= tierConfig.maxEnemyLevel) {
                tiers.push(tierNum);
            }
        }
        
        return tiers;
    }
    
    /**
     * Roll for item drop (chance-based)
     * @param {object} lootTable - Loot table config
     * @param {number} npcLevel - NPC level (affects material tier chances)
     * @returns {Item|null} Item instance or null if no drop
     */
    static rollItemDrop(lootTable, npcLevel = 1) {
        // Check if item drops at all
        const dropChance = lootTable.itemDropChance || 0.3;
        if (Math.random() > dropChance) {
            return null;
        }
        
        // Select random base item from pool
        const itemPool = lootTable.itemPool || ['sword'];
        const baseId = itemPool[Math.floor(Math.random() * itemPool.length)];
        
        // Get base item to determine material type
        const baseItem = getItem(baseId);
        if (!baseItem) {
            console.warn(`LootGenerator: Unknown item ${baseId}`);
            return null;
        }
        
        // Roll for material (weighted by dropWeight, capped by NPC level)
        const materialBonus = (lootTable.materialBonus || 0) + Math.floor(npcLevel / 10);
        const materialId = this.rollMaterial(baseItem.materialType, materialBonus, npcLevel);
        
        // Roll for proc (weighted, most items have no proc)
        // Slot-aware filtering ensures items only get procs valid for their slot (v1.5.0)
        const procId = this.rollProc(baseItem.slot);
        
        // Roll for tier (weighted, mostly tier 0, materialBonus improves chances)
        const tier = this.rollTier(materialBonus);
        
        return createItem(baseId, materialId, procId, tier);
    }
    
    /**
     * Weighted random selection for material
     * Higher tier materials have lower dropWeight (rarer)
     * Material tier is hard-capped by NPC level (v1.7.0)
     * 
     * @param {string} materialType - 'metal', 'cloth', 'leather', 'wood'
     * @param {number} bonusTier - Bonus to shift weights toward higher tiers
     * @param {number} [npcLevel=999] - NPC level for tier cap (no cap if omitted)
     * @returns {string} Selected material ID
     */
    static rollMaterial(materialType = 'metal', bonusTier = 0, npcLevel = 999) {
        const materials = getMaterialsForType(materialType);
        if (!materials) {
            return 'iron'; // Fallback
        }
        
        // Determine max gear material tier based on NPC level
        const maxTier = this._getMaxGearMaterialTier(npcLevel);
        
        // Convert to array with adjusted weights, filtering by tier cap
        const materialArray = Object.values(materials)
            .filter(mat => mat.tier <= maxTier)
            .map(mat => {
                // Bonus tier increases chance of higher tier materials
                // by reducing the effective drop weight gap
                let adjustedWeight = mat.dropWeight;
                if (bonusTier > 0 && mat.tier > 0) {
                    // Higher tier materials get weight boost from bonus
                    adjustedWeight *= (1 + bonusTier * 0.3 * mat.tier);
                }
                return { ...mat, adjustedWeight };
            });
        
        if (materialArray.length === 0) {
            // Fallback to lowest tier material
            const fallback = Object.values(materials).find(m => m.tier === 0);
            return fallback?.id || 'iron';
        }
        
        return this.weightedRandom(materialArray, 'adjustedWeight').id;
    }
    
    /**
     * Get max gear material tier based on NPC level
     * Prevents low-level enemies from dropping endgame gear materials.
     * 
     * Thresholds: Lv1-9 → T1, Lv10-19 → T2, Lv20-29 → T3,
     *             Lv30-49 → T4, Lv50-74 → T5, Lv75+ → T6 (no cap)
     * 
     * @param {number} npcLevel - NPC level
     * @returns {number} Maximum material tier (0-6)
     */
    static _getMaxGearMaterialTier(npcLevel) {
        if (npcLevel >= 75) return 6;
        if (npcLevel >= 50) return 5;
        if (npcLevel >= 30) return 4;
        if (npcLevel >= 20) return 3;
        if (npcLevel >= 10) return 2;
        return 1;  // Lv 1-9: T0 (base) + T1 only
    }
    
    /**
     * Weighted random selection for proc
     * Most items (70%) have no proc.
     * When slot is provided, filters out procs that can't trigger from that slot. (v1.5.0)
     * 
     * @param {string} [slot] - Equipment slot (e.g., 'mainHand', 'body'). If omitted, all procs available.
     * @returns {string} Selected proc ID
     */
    static rollProc(slot) {
        const procs = slot 
            ? this._getAvailableProcsForSlot(slot)
            : Object.values(ItemConfig.procs);
        return this.weightedRandom(procs, 'dropWeight').id;
    }
    
    /**
     * Get available procs for a given equipment slot.
     * Filters out procs whose slotRestriction excludes this slot and
     * procs whose triggerType isn't allowed by slotProcRules for this slot.
     * 'none' proc is always available (no-proc items).
     * 
     * @param {string} slot - Equipment slot (e.g., 'mainHand', 'body', 'boots')
     * @returns {Object[]} Array of proc config objects valid for this slot
     */
    static _getAvailableProcsForSlot(slot) {
        const allProcs = Object.values(ItemConfig.procs);
        const slotRules = ItemConfig.slotProcRules?.[slot];
        
        return allProcs.filter(proc => {
            // 'none' is always available
            if (proc.id === 'none' || !proc.effect) return true;
            
            // Check slotRestriction: if defined, slot must be in the list
            if (proc.slotRestriction && !proc.slotRestriction.includes(slot)) {
                return false;
            }
            
            // Check trigger type against slot rules
            if (slotRules?.allowedTriggers && proc.triggerType) {
                if (!slotRules.allowedTriggers.includes(proc.triggerType)) {
                    return false;
                }
            }
            
            return true;
        });
    }
    
    /**
     * Weighted random selection for upgrade tier
     * Higher tiers have lower weight (rarer)
     * 
     * @param {number} bonusTier - Bonus to shift weights toward higher tiers (from loot table + NPC level)
     * @returns {number} Selected tier (0 to maxDropTier)
     */
    static rollTier(bonusTier = 0) {
        const config = ItemConfig.tierDrops || { 
            maxDropTier: 3, 
            tierWeights: { 0: 100, 1: 40, 2: 15, 3: 5 } 
        };
        
        // Build tier array with adjusted weights
        const tiers = [];
        for (let t = 0; t <= config.maxDropTier; t++) {
            let weight = config.tierWeights[t] || 1;
            
            // Bonus increases chance of higher tiers
            if (bonusTier > 0 && t > 0) {
                weight *= (1 + bonusTier * 0.2 * t);
            }
            tiers.push({ tier: t, weight });
        }
        
        return this.weightedRandom(tiers, 'weight').tier;
    }
    
    /**
     * Generic weighted random selection
     * @param {array} items - Array of objects with weight property
     * @param {string} weightKey - Property name for weight (default: 'dropWeight')
     * @returns {object} Selected item
     */
    static weightedRandom(items, weightKey = 'dropWeight') {
        // Calculate total weight
        const totalWeight = items.reduce((sum, item) => sum + (item[weightKey] || 0), 0);
        
        if (totalWeight <= 0) {
            return items[0]; // Fallback to first item
        }
        
        // Roll random value
        let roll = Math.random() * totalWeight;
        
        // Find the item
        for (const item of items) {
            roll -= (item[weightKey] || 0);
            if (roll <= 0) {
                return item;
            }
        }
        
        // Fallback (shouldn't happen)
        return items[items.length - 1];
    }
    
    /**
     * Generate a test drop for debugging
     * @param {string} lootTableId - Loot table to use
     * @param {number} npcLevel - Simulated NPC level
     * @returns {object} { gold, items, potions, aether, material }
     */
    static generateTestDrop(lootTableId = 'common', npcLevel = 1) {
        const lootTable = getLootTable(lootTableId);
        return {
            gold: this.rollGold(lootTable, npcLevel),
            items: [this.rollItemDrop(lootTable, npcLevel)].filter(Boolean),
            potions: [this.rollPotionDrop(lootTable, npcLevel)].filter(Boolean),
            aether: this.rollAetherDrop(lootTable, npcLevel),
            material: this.rollMaterialDrop(lootTable, npcLevel)
        };
    }
    
    /**
     * Get drop statistics for debugging (run many simulations)
     * @param {string} lootTableId - Loot table to analyze
     * @param {number} iterations - Number of drops to simulate
     * @param {number} npcLevel - NPC level for simulation
     * @returns {object} Statistics about drops
     */
    static analyzeDropRates(lootTableId = 'common', iterations = 1000, npcLevel = 1) {
        const stats = {
            totalGold: 0,
            avgGold: 0,
            itemDrops: 0,
            itemDropRate: 0,
            potionDrops: 0,
            potionDropRate: 0,
            potionCounts: {},
            totalAether: 0,
            avgAether: 0,
            aetherDrops: 0,
            aetherDropRate: 0,
            materialDrops: 0,
            materialDropRate: 0,
            materialCounts: {},
            procCounts: {},
            tierCounts: {}
        };
        
        for (let i = 0; i < iterations; i++) {
            const loot = this.generateTestDrop(lootTableId, npcLevel);
            stats.totalGold += loot.gold;
            stats.totalAether += loot.aether;
            
            if (loot.aether > 0) {
                stats.aetherDrops++;
            }
            
            // Track potion drops (NEW v1.4.0)
            if (loot.potions && loot.potions.length > 0) {
                stats.potionDrops++;
                for (const potion of loot.potions) {
                    const potionKey = potion.baseId || potion.name;
                    stats.potionCounts[potionKey] = (stats.potionCounts[potionKey] || 0) + (potion.quantity || 1);
                }
            }
            
            // Track material drops (v1.3.0)
            if (loot.material) {
                stats.materialDrops++;
                const matId = loot.material.materialId;
                stats.materialCounts[matId] = (stats.materialCounts[matId] || 0) + loot.material.quantity;
            }
            
            if (loot.items.length > 0) {
                stats.itemDrops++;
                const item = loot.items[0];
                
                // Count materials (item materials, not housing materials)
                if (item.materialId) {
                    const key = `item_${item.materialId}`;
                    stats.materialCounts[key] = (stats.materialCounts[key] || 0) + 1;
                }
                
                // Count procs
                stats.procCounts[item.procId] = (stats.procCounts[item.procId] || 0) + 1;
                
                // Count tiers
                const tierKey = `t${item.tier}`;
                stats.tierCounts[tierKey] = (stats.tierCounts[tierKey] || 0) + 1;
            }
        }
        
        stats.avgGold = Math.round(stats.totalGold / iterations * 10) / 10;
        stats.avgAether = Math.round(stats.totalAether / iterations * 100) / 100;
        stats.itemDropRate = Math.round(stats.itemDrops / iterations * 1000) / 10 + '%';
        stats.potionDropRate = Math.round(stats.potionDrops / iterations * 1000) / 10 + '%';
        stats.aetherDropRate = Math.round(stats.aetherDrops / iterations * 1000) / 10 + '%';
        stats.materialDropRate = Math.round(stats.materialDrops / iterations * 1000) / 10 + '%';
        
        return stats;
    }
}

export default LootGenerator;
