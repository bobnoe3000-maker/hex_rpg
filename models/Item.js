/**
 * @file Item.js
 * @description Item model class for loot drops and inventory.
 *              Power = Material Tier + Upgrade Tier (no separate rarity)
 *              Includes fromData() for reconstructing items after save/load.
 * 
 * @location models/Item.js
 * @version 1.2.0
 * @changelog
 *   - v1.2.0 (2026-02-08): Variable material scaling — stat formula now uses
 *                          material.statBase + (tier × material.bonusPerTier) instead of
 *                          flat material.statBonus + (tier × global bonusPerTier).
 *                          Higher materials gain more per upgrade tier per PRD requirement.
 *   - v1.1.0 (2025-01-10): Added fromData() for save/load reconstruction
 *   - v1.0.0 (2025-01): Initial implementation with material + tier power model
 */

import { 
    getItem, 
    getMaterial, 
    getProc,
    generateItemName,
    getUpgradeConfig,
    getPotion
} from '../config/itemConfig.js';

let itemIdCounter = 0;

export class Item {
    constructor(data = {}) {
        this.id = data.id || `item_${Date.now()}_${++itemIdCounter}`;
        this.baseId = data.baseId || 'sword';
        this.materialId = data.materialId || 'iron';
        this.tier = data.tier || 0;
        this.procId = data.procId || 'none';
        this.quantity = data.quantity || 1;
        
        // For potions - store extra properties
        if (data.type === 'potion' || data.potionType) {
            this.type = 'potion';
            this.potionType = data.potionType;
            this.effect = data.effect;
            this.cooldown = data.cooldown;
        }
        
        // Cache config data
        this._baseData = this._getBaseDataInternal();
        this._materialData = this._getMaterialDataInternal();
        this._procData = getProc(this.procId);
    }
    
    _getBaseDataInternal() {
        return getItem(this.baseId) || getPotion(this.baseId);
    }
    
    _getMaterialDataInternal() {
        const baseData = this._getBaseDataInternal();
        const materialType = baseData?.materialType || 'metal';
        return getMaterial(this.materialId, materialType);
    }
    
    get baseData() { return this._baseData || this._getBaseDataInternal(); }
    get materialData() { return this._materialData || this._getMaterialDataInternal(); }
    get procData() { return this._procData || getProc(this.procId); }
    
    get name() {
        // For potions, get name from config directly
        if (this.type === 'potion' || this.potionType) {
            const potionConfig = getPotion(this.baseId);
            if (potionConfig?.name) return potionConfig.name;
        }
        return generateItemName(this.baseId, this.materialId, this.procId, this.tier);
    }
    
    get displayName() { return this.name; }
    get slot() { return this.baseData?.slot || null; }
    
    get itemType() { 
        if (this.type === 'potion') return 'potion';
        return this.baseData?.type || 'unknown'; 
    }
    
    // Alias for consistency
    getType() {
        return this.itemType;
    }
    
    get subtype() { return this.baseData?.subtype || null; }
    get twoHanded() { return this.baseData?.twoHanded || false; }
    get ranged() { return this.baseData?.ranged || false; }
    get range() { return this.baseData?.range || 1; }
    get color() { 
        // For potions, get color from potion config
        if (this.type === 'potion' || this.potionType) {
            const potionConfig = getPotion(this.baseId);
            if (potionConfig?.color) return potionConfig.color;
        }
        return this.materialData?.color || '#FFFFFF'; 
    }
    get materialTier() { return this.materialData?.tier || 0; }
    get armorClass() { return this.baseData?.armorClass || null; }
    
    /**
     * Calculate final stats using variable material scaling (v1.2.0):
     *   Flat stats: Base + material.statBase + (tier × material.bonusPerTier)
     *   Pct stats:  Base × (1 + tier × 0.05)
     * 
     * Higher-tier materials gain MORE per upgrade tier (PRD requirement).
     * Example: Wood at t10 = 8 + 0 + (10×0.50) = 13 attack
     *          Ethereal t10 = 8 + 3 + (10×1.30) = 24 attack
     */
    get stats() {
        const baseStats = this.baseData?.baseStats || {};
        const materialStatBase = this.materialData?.statBase ?? this.materialData?.statBonus ?? 0;
        const materialBonusPerTier = this.materialData?.bonusPerTier 
            || getUpgradeConfig()?.bonusPerTier || 1;
        const tierBonus = this.tier * materialBonusPerTier;
        
        const finalStats = {};
        for (const [stat, baseValue] of Object.entries(baseStats)) {
            if (stat === 'dodge' || stat === 'critChance') {
                finalStats[stat] = baseValue * (1 + this.tier * 0.05);
            } else {
                finalStats[stat] = Math.floor(baseValue + materialStatBase + tierBonus);
            }
        }
        return finalStats;
    }
    
    get procEffect() {
        if (this.procId === 'none') return null;
        return this.procData?.effect || null;
    }
    
    get hasProc() {
        return this.procId !== 'none' && this.procEffect !== null;
    }
    
    /**
     * Get description for item
     * @returns {string} Item description
     */
    get description() {
        // For potions, generate description from effect
        if (this.type === 'potion' || this.potionType) {
            const potionConfig = getPotion(this.baseId);
            if (potionConfig?.effect) {
                if (potionConfig.effect.heal) {
                    return `Restores ${potionConfig.effect.heal} health`;
                }
                if (potionConfig.effect.mana) {
                    return `Restores ${potionConfig.effect.mana} mana`;
                }
            }
            return 'A magical potion';
        }
        
        // For equipment, generate description from type and stats
        const type = this.itemType;
        const stats = this.stats;
        
        if (type === 'weapon') {
            return `A ${this.subtype || 'weapon'} that deals ${stats.attack || 0} damage`;
        }
        if (type === 'armor') {
            return `${this.armorClass || 'Protective'} armor providing ${stats.defense || 0} defense`;
        }
        if (type === 'accessory') {
            return `An accessory that enhances your abilities`;
        }
        
        return 'An item that can be equipped';
    }
    
    getSummary() {
        const stats = this.stats;
        const parts = [];
        if (stats.attack) parts.push(`+${stats.attack} Atk`);
        if (stats.defense) parts.push(`+${stats.defense} Def`);
        if (stats.health) parts.push(`+${stats.health} HP`);
        if (stats.mana) parts.push(`+${stats.mana} MP`);
        if (stats.magicDamage) parts.push(`+${stats.magicDamage} Magic`);
        if (stats.dodge) parts.push(`+${Math.round(stats.dodge * 100)}% Dodge`);
        if (stats.critChance) parts.push(`+${Math.round(stats.critChance * 100)}% Crit`);
        if (this.hasProc) parts.push(`[${this.procData.name}]`);
        return parts.join(', ') || 'No stats';
    }
    
    toJSON() {
        const data = {
            id: this.id,
            baseId: this.baseId,
            materialId: this.materialId,
            tier: this.tier,
            procId: this.procId,
            quantity: this.quantity
        };
        
        // Include potion-specific data
        if (this.type === 'potion' || this.potionType) {
            data.type = 'potion';
            data.potionType = this.potionType;
            data.effect = this.effect;
            data.cooldown = this.cooldown;
        }
        
        return data;
    }
    
    /**
     * Reconstruct an Item from JSON data
     * @param {Object} data - Serialized item data
     * @returns {Item} New Item instance
     */
    static fromJSON(data) {
        if (!data) return null;
        return new Item(data);
    }
    
    /**
     * Reconstruct an Item from any data source (plain object or Item instance)
     * Use this when loading from save data to ensure proper Item instances.
     * 
     * @param {Object|Item} data - Item data (plain object or existing Item)
     * @returns {Item|null} Reconstructed Item instance or null if invalid
     */
    static fromData(data) {
        if (!data) return null;
        
        // Already a proper Item instance with working methods
        if (data instanceof Item) return data;
        
        // Check if it's a functioning Item-like object (has methods)
        if (typeof data.getSummary === 'function' && 
            typeof data.toJSON === 'function') {
            return data;
        }
        
        // Reconstruct from plain object
        return Item.fromJSON(data);
    }
    
    /**
     * Check if an object is a valid Item instance
     * @param {Object} obj - Object to check
     * @returns {boolean} True if proper Item instance
     */
    static isValidInstance(obj) {
        return obj instanceof Item || 
               (obj && typeof obj.getSummary === 'function' && typeof obj.toJSON === 'function');
    }
}

export function createItem(baseId, materialId = 'iron', procId = 'none', tier = 0) {
    return new Item({ baseId, materialId, procId, tier });
}

export function createSimpleItem(baseId, materialId = 'iron') {
    return createItem(baseId, materialId, 'none', 0);
}

/**
 * Create a potion item
 * @param {string} potionId - Potion ID from itemConfig.potions
 * @param {number} quantity - Stack quantity
 * @returns {Item} Potion item
 */
export function createPotion(potionId, quantity = 1) {
    const potionConfig = getPotion(potionId);
    if (!potionConfig) {
        console.warn(`Unknown potion: ${potionId}`);
        return null;
    }
    
    return new Item({
        baseId: potionId,
        type: 'potion',
        potionType: potionConfig.potionType,
        effect: potionConfig.effect,
        cooldown: potionConfig.cooldown,
        quantity: quantity
    });
}

export default Item;
