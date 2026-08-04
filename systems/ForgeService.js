/**
 * @file ForgeService.js
 * @description Handles gear upgrade/merge logic at the Forge.
 *              Validates item compatibility, calculates costs and success rates,
 *              and processes upgrade attempts.
 * 
 * @usage Called by TownScreen when player uses the Forge
 * @dependencies itemConfig.js (for upgrade configuration)
 * 
 * @version 1.4.0
 * @changelog
 *   - v1.4.0 (2025-01-21): Simplified to single rule: same subtype = can merge.
 *                          extractSubtype() extracts item kind from baseId.
 *   - v1.3.0 (2025-01-21): Complete rewrite of type matching.
 *   - v1.1.1 (2025-01-21): Fixed import to use ItemConfig (capital I) export name.
 */

import { ItemConfig } from '../config/itemConfig.js';

// Use ItemConfig as the config object
const itemConfig = ItemConfig;

/**
 * Helper to get upgrade config with fallback
 */
function getUpgradeConfigSafe() {
    // Try to use itemConfig.upgrades if available
    if (itemConfig?.upgrades?.maxTier !== undefined) {
        return { maxTier: itemConfig.upgrades.maxTier };
    }
    // Default fallback
    return { maxTier: 10 };
}

/**
 * Extract subtype from baseId
 * e.g., "leather_boots" -> "boots", "iron_sword" -> "sword"
 * @param {string} baseId - The item's baseId
 * @returns {string|null} The extracted subtype
 */
function extractSubtype(baseId) {
    if (!baseId) return null;
    
    const id = baseId.toLowerCase();
    
    // List of known subtypes - order matters (longer/more specific first)
    const subtypes = [
        // Weapons
        'greatsword', 'longsword', 'shortsword', 'broadsword', 'sword',
        'dagger', 'knife',
        'battleaxe', 'axe', 'hatchet',
        'warhammer', 'hammer', 'mace', 'club',
        'quarterstaff', 'staff', 'rod', 'wand',
        'longbow', 'shortbow', 'bow', 'crossbow',
        // Head
        'helmet', 'helm', 'cap', 'hood', 'circlet', 'crown', 'hat',
        // Feet
        'boots', 'shoes', 'greaves', 'slippers', 'sandals',
        // Hands
        'gauntlets', 'gloves', 'bracers',
        // Body
        'platemail', 'chainmail', 'chestplate', 'armor', 'robe', 'tunic', 'vest',
        // Off-hand
        'shield', 'buckler', 'tome', 'orb',
        // Accessories
        'ring', 'band',
        'amulet', 'necklace', 'pendant',
        'cape', 'cloak', 'mantle'
    ];
    
    for (const subtype of subtypes) {
        if (id.includes(subtype)) {
            return subtype;
        }
    }
    
    return baseId;
}

/**
 * Get the subtype of an item (sword, dagger, cap, boots, etc.)
 * @param {Object} item - The item to check
 * @returns {string|null} The item's subtype
 */
function getSubtype(item) {
    if (!item) return null;
    
    // 1. Use explicit subtype if set
    if (item.subtype) return item.subtype;
    
    // 2. Extract from baseId
    if (item.baseId) return extractSubtype(item.baseId);
    
    return null;
}

/**
 * Check if an item is a valid gear type that can be upgraded
 * @param {Object} item - The item to check
 * @returns {boolean} True if item is upgradeable gear
 */
function isGear(item) {
    if (!item) return false;
    
    const type = item.type?.toLowerCase();
    const validTypes = ['gear', 'weapon', 'armor', 'accessory', 'shield', 'offhand'];
    
    if (validTypes.includes(type)) return true;
    
    // Also check by slot - if it has an equipment slot, it's gear
    const slot = item.slot;
    if (slot && slot !== 'none') return true;
    
    return false;
}

export const ForgeService = {
    
    /**
     * Check if two items can be merged
     * Rule: Items must have the SAME SUBTYPE (sword+sword, cap+cap, boots+boots)
     * Material and tier differences don't affect compatibility
     * @param {Object} baseItem - The item to upgrade
     * @param {Object} sacrificeItem - The item to consume
     * @returns {{valid: boolean, reason?: string}} Merge validation result
     */
    canMerge(baseItem, sacrificeItem) {
        if (!baseItem || !sacrificeItem) {
            return { valid: false, reason: 'missing_item' };
        }
        
        if (baseItem.id === sacrificeItem.id) {
            return { valid: false, reason: 'same_item' };
        }
        
        if (!isGear(baseItem)) {
            return { valid: false, reason: 'not_gear' };
        }
        
        if (!isGear(sacrificeItem)) {
            return { valid: false, reason: 'not_gear' };
        }
        
        // Get subtypes
        const baseSubtype = getSubtype(baseItem);
        const sacrificeSubtype = getSubtype(sacrificeItem);
        
        // Simple rule: subtypes must match exactly
        if (!baseSubtype || !sacrificeSubtype || baseSubtype !== sacrificeSubtype) {
            return { valid: false, reason: 'subtype_mismatch' };
        }
        
        // Check max tier
        const upgradeConfig = getUpgradeConfigSafe();
        const maxTier = upgradeConfig?.maxTier || itemConfig?.upgrades?.maxTier || 10;
        
        if ((baseItem.tier || 0) >= maxTier) {
            return { valid: false, reason: 'max_tier' };
        }
        
        return { valid: true };
    },
    
    /**
     * Calculate upgrade costs based on item tier
     * @param {Object} item - The item to upgrade
     * @returns {{gold: number, aether: number}} Cost to upgrade
     */
    getUpgradeCosts(item) {
        const tier = item?.tier || 0;
        
        // Default costs by tier if config not available
        const defaultCosts = [
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
        ];
        
        if (itemConfig?.upgrades?.costs?.[tier]) {
            return itemConfig.upgrades.costs[tier];
        }
        
        return defaultCosts[tier] || { gold: 0, aether: 0 };
    },
    
    /**
     * Calculate success rate for upgrade
     * @param {Object} item - The item to upgrade
     * @returns {number} Success rate (0.0 to 1.0)
     */
    getSuccessRate(item) {
        const tier = item?.tier || 0;
        
        // Default success rates by tier
        const defaultRates = [1.0, 0.95, 0.90, 0.80, 0.70, 0.55, 0.45, 0.35, 0.30, 0.25];
        
        let baseRate = itemConfig?.upgrades?.successRate?.[tier] ?? defaultRates[tier] ?? 0.25;
        
        // Apply material penalty if applicable
        const materialTier = this.getMaterialTier(item?.materialId);
        const penalty = itemConfig?.upgrades?.materialPenalty?.[materialTier] || 0;
        
        return Math.max(0.05, baseRate - penalty); // Minimum 5%
    },
    
    /**
     * Calculate destruction chance on failure
     * @param {Object} item - The item being upgraded
     * @returns {number} Destruction chance (0.0 to 1.0)
     */
    getDestructionChance(item) {
        const tier = item?.tier || 0;
        
        // Default destruction rates by tier
        const defaultRates = [0, 0, 0, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.40];
        
        return itemConfig?.upgrades?.destroyOnFail?.[tier] ?? defaultRates[tier] ?? 0;
    },
    
    /**
     * Get material tier from materialId
     * @param {string} materialId - The material identifier
     * @returns {number} Material tier (0-6)
     */
    getMaterialTier(materialId) {
        if (!materialId || !itemConfig?.materials) return 0;
        
        const allMaterials = [
            ...(itemConfig.materials.metal || []),
            ...(itemConfig.materials.cloth || []),
            ...(itemConfig.materials.leather || [])
        ];
        
        const material = allMaterials.find(m => m.id === materialId);
        return material?.tier || 0;
    },
    
    /**
     * Resolve material/proc conflicts (higher tier wins)
     * @param {Object} baseItem - Base item
     * @param {Object} sacrificeItem - Sacrifice item
     * @returns {{materialId: string, procId: string}} Resolved properties
     */
    resolveConflicts(baseItem, sacrificeItem) {
        const baseMaterialTier = this.getMaterialTier(baseItem?.materialId);
        const sacrificeMaterialTier = this.getMaterialTier(sacrificeItem?.materialId);
        
        const resultMaterial = (baseMaterialTier >= sacrificeMaterialTier)
            ? baseItem?.materialId
            : sacrificeItem?.materialId;
        
        const baseProcRarity = this.getProcRarity(baseItem?.procId);
        const sacrificeProcRarity = this.getProcRarity(sacrificeItem?.procId);
        
        const resultProc = (baseProcRarity >= sacrificeProcRarity)
            ? baseItem?.procId
            : sacrificeItem?.procId;
        
        return { materialId: resultMaterial, procId: resultProc };
    },
    
    /**
     * Get proc rarity (higher = rarer)
     * @param {string} procId - The proc identifier
     * @returns {number} Rarity score
     */
    getProcRarity(procId) {
        if (!procId || procId === 'none') return 0;
        
        // Handle procs as either array or object
        let proc = null;
        
        if (Array.isArray(itemConfig?.procs)) {
            // procs is an array of { id, dropWeight, ... }
            proc = itemConfig.procs.find(p => p.id === procId);
        } else if (itemConfig?.procs && typeof itemConfig.procs === 'object') {
            // procs is an object keyed by id
            proc = itemConfig.procs[procId];
        }
        
        if (!proc) return 0;
        
        // Inverse of dropWeight = rarity
        return 100 - (proc.dropWeight || 0);
    },
    
    /**
     * Attempt the upgrade
     * @param {Object} character - The player character
     * @param {Object} baseItem - Item to upgrade
     * @param {Object} sacrificeItem - Item to sacrifice
     * @returns {{success: boolean, destroyed: boolean, item: Object|null, message: string}}
     */
    attemptUpgrade(character, baseItem, sacrificeItem) {
        // Validate
        const canMerge = this.canMerge(baseItem, sacrificeItem);
        if (!canMerge.valid) {
            return { success: false, destroyed: false, item: baseItem, message: canMerge.reason };
        }
        
        // Check costs
        const cost = this.getUpgradeCosts(baseItem);
        if ((character.gold || 0) < cost.gold) {
            return { success: false, destroyed: false, item: baseItem, message: 'insufficient_gold' };
        }
        if ((character.aether || 0) < cost.aether) {
            return { success: false, destroyed: false, item: baseItem, message: 'insufficient_aether' };
        }
        
        // Deduct costs
        if (typeof character.addGold === 'function') {
            character.addGold(-cost.gold);
        } else {
            character.gold = (character.gold || 0) - cost.gold;
        }
        
        if (typeof character.spendAether === 'function') {
            character.spendAether(cost.aether);
        } else if (cost.aether > 0) {
            character.aether = (character.aether || 0) - cost.aether;
        }
        
        // Roll for success
        const successRate = this.getSuccessRate(baseItem);
        const roll = Math.random();
        
        if (roll < successRate) {
            // SUCCESS
            const conflicts = this.resolveConflicts(baseItem, sacrificeItem);
            baseItem.tier = (baseItem.tier || 0) + 1;
            
            if (conflicts.materialId) baseItem.materialId = conflicts.materialId;
            if (conflicts.procId) baseItem.procId = conflicts.procId;
            
            // Remove sacrifice from inventory
            if (typeof character.removeFromInventory === 'function') {
                character.removeFromInventory(sacrificeItem);
            }
            
            return { success: true, destroyed: false, item: baseItem, message: 'success' };
        } else {
            // FAILURE - check for destruction
            const destroyChance = this.getDestructionChance(baseItem);
            const destroyRoll = Math.random();
            
            if (destroyRoll < destroyChance) {
                // DESTROYED - base item is lost, sacrifice is preserved
                if (typeof character.removeFromInventory === 'function') {
                    character.removeFromInventory(baseItem);
                }
                
                return { success: false, destroyed: true, item: null, message: 'destroyed' };
            } else {
                // FAILURE but not destroyed - both items preserved
                return { success: false, destroyed: false, item: baseItem, message: 'failed' };
            }
        }
    },
    
    /**
     * Get preview of upgrade result
     * @param {Object} baseItem - Base item
     * @param {Object} sacrificeItem - Sacrifice item
     * @returns {Object} Preview data
     */
    getUpgradePreview(baseItem, sacrificeItem) {
        const canMerge = this.canMerge(baseItem, sacrificeItem);
        if (!canMerge.valid) {
            return { valid: false, reason: canMerge.reason };
        }
        
        const cost = this.getUpgradeCosts(baseItem);
        const successRate = this.getSuccessRate(baseItem);
        const destroyChance = this.getDestructionChance(baseItem);
        const conflicts = this.resolveConflicts(baseItem, sacrificeItem);
        
        return {
            valid: true,
            currentTier: baseItem.tier || 0,
            newTier: (baseItem.tier || 0) + 1,
            cost: cost,
            successRate: successRate,
            destroyChance: destroyChance,
            resultMaterial: conflicts.materialId,
            resultProc: conflicts.procId,
            materialUpgrade: conflicts.materialId !== baseItem.materialId,
            procUpgrade: conflicts.procId !== baseItem.procId
        };
    },
    
    /**
     * Get color for risk display based on rate
     * @param {number} rate - Success rate (0.0 to 1.0)
     * @returns {string} CSS color
     */
    getRiskColor(rate) {
        if (rate >= 0.8) return 'var(--color-success, #22c55e)';
        if (rate >= 0.5) return 'var(--color-warning, #f59e0b)';
        if (rate >= 0.3) return 'var(--color-danger, #ef4444)';
        return 'var(--color-critical, #dc2626)';
    },
    
    /**
     * Format rate as percentage string
     * @param {number} rate - Rate (0.0 to 1.0)
     * @returns {string} Formatted percentage
     */
    formatRate(rate) {
        return `${Math.round(rate * 100)}%`;
    },
    
    /**
     * Get risk level description
     * @param {number} rate - Success rate (0.0 to 1.0)
     * @returns {string} Risk level text
     */
    getRiskLevel(rate) {
        if (rate >= 0.8) return 'Safe';
        if (rate >= 0.5) return 'Moderate';
        if (rate >= 0.3) return 'Risky';
        return 'Dangerous';
    }
};

export default ForgeService;
