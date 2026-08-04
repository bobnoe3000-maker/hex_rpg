/**
 * @file ItemUtils.js
 * @description Centralized utility functions for safe item property access.
 *              Handles both Item class instances and plain objects (from save/load).
 *              Provides consistent fallback patterns across the entire item system.
 * 
 * @location utils/ItemUtils.js
 * @usage Import { ItemUtils } from '../utils/ItemUtils.js' in any file needing item data
 * @dependencies config/itemConfig.js
 * 
 * @version 1.0.0
 * @changelog
 *   - v1.0.0 (2025-01-10): Initial implementation - centralized item property access
 */

import { 
    getItem, 
    getMaterial, 
    getProc, 
    generateItemName,
    getUpgradeConfig,
    getPotion
} from '../config/itemConfig.js';

/**
 * Centralized utilities for safe item property access.
 * Works with both Item class instances and plain objects.
 */
export const ItemUtils = {
    
    // === Basic Property Accessors ===
    
    /**
     * Get item name safely
     * @param {Object|null} item - Item instance or plain object
     * @returns {string} Item name or fallback
     */
    getName(item) {
        if (!item) return 'Unknown Item';
        
        // Try getter first (Item instance)
        if (typeof item.name === 'string' && item.name !== 'undefined') {
            return item.name;
        }
        
        // For plain objects, regenerate name from config
        if (item.baseId) {
            return generateItemName(
                item.baseId, 
                item.materialId || 'iron', 
                item.procId || 'none', 
                item.tier || 0
            );
        }
        
        return 'Unknown Item';
    },
    
    /**
     * Get item display name (alias for getName)
     * @param {Object|null} item - Item instance or plain object
     * @returns {string} Display name
     */
    getDisplayName(item) {
        return this.getName(item);
    },
    
    /**
     * Get item slot
     * @param {Object|null} item - Item instance or plain object
     * @returns {string|null} Slot name
     */
    getSlot(item) {
        if (!item) return null;
        
        // Try getter first
        if (item.slot !== undefined) {
            return item.slot;
        }
        
        // Look up from config
        const baseData = this._getBaseData(item);
        return baseData?.slot || null;
    },
    
    /**
     * Get item type
     * @param {Object|null} item - Item instance or plain object
     * @returns {string} Item type
     */
    getType(item) {
        if (!item) return 'unknown';
        
        if (item.type !== undefined) {
            return item.type;
        }
        
        const baseData = this._getBaseData(item);
        return baseData?.type || 'unknown';
    },
    
    /**
     * Get item subtype
     * @param {Object|null} item - Item instance or plain object
     * @returns {string|null} Subtype
     */
    getSubtype(item) {
        if (!item) return null;
        
        if (item.subtype !== undefined) {
            return item.subtype;
        }
        
        const baseData = this._getBaseData(item);
        return baseData?.subtype || null;
    },
    
    /**
     * Get item color (from material)
     * @param {Object|null} item - Item instance or plain object
     * @returns {string} Hex color code
     */
    getColor(item) {
        if (!item) return '#FFFFFF';
        
        // Try getter first
        if (item.color !== undefined && item.color !== '#FFFFFF') {
            return item.color;
        }
        
        // Look up from material
        const materialData = this._getMaterialData(item);
        return materialData?.color || '#FFFFFF';
    },
    
    /**
     * Get item tier
     * @param {Object|null} item - Item instance or plain object
     * @returns {number} Upgrade tier (0-10)
     */
    getTier(item) {
        if (!item) return 0;
        return item.tier || 0;
    },
    
    /**
     * Get material tier
     * @param {Object|null} item - Item instance or plain object
     * @returns {number} Material tier
     */
    getMaterialTier(item) {
        if (!item) return 0;
        
        if (typeof item.materialTier === 'number') {
            return item.materialTier;
        }
        
        const materialData = this._getMaterialData(item);
        return materialData?.tier || 0;
    },
    
    /**
     * Get item quantity (for stackables)
     * @param {Object|null} item - Item instance or plain object
     * @returns {number} Quantity
     */
    getQuantity(item) {
        if (!item) return 0;
        return item.quantity || 1;
    },
    
    /**
     * Check if item is two-handed
     * @param {Object|null} item - Item instance or plain object
     * @returns {boolean}
     */
    isTwoHanded(item) {
        if (!item) return false;
        
        if (typeof item.twoHanded === 'boolean') {
            return item.twoHanded;
        }
        
        const baseData = this._getBaseData(item);
        return baseData?.twoHanded || false;
    },
    
    /**
     * Check if item is ranged
     * @param {Object|null} item - Item instance or plain object
     * @returns {boolean}
     */
    isRanged(item) {
        if (!item) return false;
        
        if (typeof item.ranged === 'boolean') {
            return item.ranged;
        }
        
        const baseData = this._getBaseData(item);
        return baseData?.ranged || false;
    },
    
    /**
     * Get item range
     * @param {Object|null} item - Item instance or plain object
     * @returns {number} Range in hexes
     */
    getRange(item) {
        if (!item) return 1;
        
        if (typeof item.range === 'number') {
            return item.range;
        }
        
        const baseData = this._getBaseData(item);
        return baseData?.range || 1;
    },
    
    // === Computed Stats ===
    
    /**
     * Get item stats (computed from base + material + tier)
     * @param {Object|null} item - Item instance or plain object
     * @returns {Object} Stats object
     */
    getStats(item) {
        if (!item) return {};
        
        // Try getter first (Item instance with working method)
        if (item.stats && typeof item.stats === 'object' && Object.keys(item.stats).length > 0) {
            return item.stats;
        }
        
        // Compute for plain objects
        const baseData = this._getBaseData(item);
        const materialData = this._getMaterialData(item);
        const upgradeConfig = getUpgradeConfig();
        
        const baseStats = baseData?.baseStats || {};
        const materialBonus = materialData?.statBonus || 0;
        const tier = item.tier || 0;
        const tierBonus = tier * (upgradeConfig?.bonusPerTier || 1);
        
        const finalStats = {};
        for (const [stat, baseValue] of Object.entries(baseStats)) {
            if (stat === 'dodge' || stat === 'critChance') {
                finalStats[stat] = baseValue * (1 + tier * 0.05);
            } else {
                finalStats[stat] = Math.floor(baseValue + materialBonus + tierBonus);
            }
        }
        
        return finalStats;
    },
    
    /**
     * Get item summary string
     * @param {Object|null} item - Item instance or plain object
     * @returns {string} Summary like "+10 Atk, +5 Def"
     */
    getSummary(item) {
        if (!item) return 'No stats';
        
        // Try method first
        if (typeof item.getSummary === 'function') {
            return item.getSummary();
        }
        
        // Compute for plain objects
        const stats = this.getStats(item);
        const parts = [];
        
        if (stats.attack) parts.push(`+${stats.attack} Atk`);
        if (stats.defense) parts.push(`+${stats.defense} Def`);
        if (stats.health) parts.push(`+${stats.health} HP`);
        if (stats.mana) parts.push(`+${stats.mana} MP`);
        if (stats.magicDamage) parts.push(`+${stats.magicDamage} Magic`);
        if (stats.dodge) parts.push(`+${Math.round(stats.dodge * 100)}% Dodge`);
        if (stats.critChance) parts.push(`+${Math.round(stats.critChance * 100)}% Crit`);
        
        if (this.hasProc(item)) {
            const procData = this._getProcData(item);
            if (procData?.name) {
                parts.push(`[${procData.name}]`);
            }
        }
        
        return parts.join(', ') || 'No stats';
    },
    
    // === Proc Effects ===
    
    /**
     * Check if item has a proc effect
     * @param {Object|null} item - Item instance or plain object
     * @returns {boolean}
     */
    hasProc(item) {
        if (!item) return false;
        
        if (typeof item.hasProc === 'boolean') {
            return item.hasProc;
        }
        
        const procId = item.procId || 'none';
        return procId !== 'none';
    },
    
    /**
     * Get proc effect data
     * @param {Object|null} item - Item instance or plain object
     * @returns {Object|null} Proc effect or null
     */
    getProcEffect(item) {
        if (!item) return null;
        
        if (item.procEffect !== undefined) {
            return item.procEffect;
        }
        
        const procData = this._getProcData(item);
        return procData?.effect || null;
    },
    
    // === Potion-Specific ===
    
    /**
     * Check if item is a potion
     * @param {Object|null} item - Item instance or plain object
     * @returns {boolean}
     */
    isPotion(item) {
        if (!item) return false;
        return this.getType(item) === 'potion' || item.potionType !== undefined;
    },
    
    /**
     * Get potion type (health/mana)
     * @param {Object|null} item - Item instance or plain object
     * @returns {string|null} 'health', 'mana', or null
     */
    getPotionType(item) {
        if (!item) return null;
        return item.potionType || null;
    },
    
    /**
     * Get potion restore amount
     * @param {Object|null} item - Item instance or plain object
     * @returns {number} Restore amount
     */
    getPotionRestoreAmount(item) {
        if (!item) return 0;
        return item.restoreAmount || 0;
    },
    
    /**
     * Get potion cooldown
     * @param {Object|null} item - Item instance or plain object
     * @returns {number} Cooldown in ms
     */
    getPotionCooldown(item) {
        if (!item) return 0;
        return item.cooldown || 0;
    },
    
    // === Internal Helpers ===
    
    /**
     * Get base item data from config
     * @param {Object} item - Item object
     * @returns {Object|null} Base item config
     */
    _getBaseData(item) {
        if (!item) return null;
        
        // Check cached data first
        if (item._baseData) return item._baseData;
        if (item.baseData) return item.baseData;
        
        // Look up from config
        const baseId = item.baseId || item.id;
        if (!baseId) return null;
        
        return getItem(baseId) || getPotion(baseId);
    },
    
    /**
     * Get material data from config
     * @param {Object} item - Item object
     * @returns {Object|null} Material config
     */
    _getMaterialData(item) {
        if (!item) return null;
        
        // Check cached data first
        if (item._materialData) return item._materialData;
        if (item.materialData) return item.materialData;
        
        // Look up from config
        const materialId = item.materialId;
        if (!materialId) return null;
        
        const baseData = this._getBaseData(item);
        const materialType = baseData?.materialType || 'metal';
        
        return getMaterial(materialId, materialType);
    },
    
    /**
     * Get proc data from config
     * @param {Object} item - Item object
     * @returns {Object|null} Proc config
     */
    _getProcData(item) {
        if (!item) return null;
        
        // Check cached data first
        if (item._procData) return item._procData;
        if (item.procData) return item.procData;
        
        // Look up from config
        const procId = item.procId || 'none';
        return getProc(procId);
    }
};

export default ItemUtils;
