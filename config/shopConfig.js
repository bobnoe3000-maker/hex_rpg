/**
 * @file shopConfig.js
 * @description Shop configuration - Available items for purchase, base prices,
 *              buy/sell ratios, and shop inventory by location.
 * 
 * @location config/shopConfig.js
 * @usage Imported by TownScreen.js for shop functionality
 * @dependencies itemConfig.js for item definitions
 * 
 * @version 1.2.0
 * @changelog
 *   - v1.2.0 (2026-03-06): Added greatsword (iron), plate_armor (iron), cape (cloth) to
 *                          town shop. Ring, necklace, and orb intentionally excluded —
 *                          players must grind for accessories (no null-materialId items in shop).
 *   - v1.1.0 (2026-02-08): Added resources section to town shop for purchasing aether and
 *                          housing materials. New getShopResources() helper function.
 *   - v1.0.1 (2025-01-03): Changed potion IDs to use tiered potions (health_potion_minor, mana_potion_minor)
 *   - v1.0.0 (2025-01-02): Initial implementation with basic shop inventory
 */

export const ShopConfig = {
    // ===========================================
    // ECONOMY SETTINGS
    // ===========================================
    economy: {
        sellRatio: 0.25,           // Players get 25% of base price when selling
        buyMultiplier: 1.0,        // Shop markup on base prices
        maxBuyQuantity: 99,        // Max quantity per purchase for stackables
    },
    
    // ===========================================
    // BASE ITEM PRICES (in gold)
    // Price = baseCost + (materialTierBonus * materialTier) + (upgradeTierBonus * upgradeTier)
    // ===========================================
    basePrices: {
        // Weapons
        sword: 50,
        greatsword: 100,
        axe: 60,
        shield: 45,
        dagger: 35,
        bow: 75,
        staff: 80,
        wand: 55,
        orb: 70,
        // Heavy Armor
        plate_helm: 60,
        chainmail: 90,
        plate_armor: 120,
        plate_boots: 50,
        // Medium Armor
        leather_cap: 35,
        leather_vest: 55,
        leather_boots: 30,
        // Light Armor
        cloth_hood: 25,
        cloth_robe: 45,
        cloth_slippers: 20,
        // Accessories
        necklace: 40,
        ring: 30,
        cape: 35,
        // Consumables
        health_potion: 15,
        mana_potion: 15,
        // Tiered Health Potions
        health_potion_minor: 10,
        health_potion_standard: 25,
        health_potion_greater: 60,
        health_potion_superior: 150,
        // Tiered Mana Potions
        mana_potion_minor: 10,
        mana_potion_standard: 25,
        mana_potion_greater: 60,
        mana_potion_superior: 150,
        stardust: 50,
    },
    
    // Price bonus per material tier (tier 0 = no bonus)
    materialTierBonus: 25,
    
    // Price bonus per upgrade tier (+1, +2, etc.)
    upgradeTierBonus: 20,
    
    // ===========================================
    // SHOP INVENTORY BY LOCATION
    // Each shop has a list of items available for purchase
    // ===========================================
    shops: {
        // Main town shop - basic gear and consumables
        town: {
            name: "General Store",
            icon: "🏪",
            description: "Basic supplies and equipment for adventurers.",
            inventory: [
                // Consumables - always in stock (using tiered potions)
                { baseId: 'health_potion_minor', materialId: null, quantity: 99 },
                { baseId: 'mana_potion_minor', materialId: null, quantity: 99 },
                
                // Basic weapons (iron/wood tier)
                { baseId: 'sword', materialId: 'iron' },
                { baseId: 'greatsword', materialId: 'iron' },
                { baseId: 'axe', materialId: 'iron' },
                { baseId: 'dagger', materialId: 'iron' },
                { baseId: 'shield', materialId: 'iron' },
                { baseId: 'bow', materialId: 'wood' },
                { baseId: 'staff', materialId: 'wood' },
                { baseId: 'wand', materialId: 'wood' },
                
                // Basic armor
                { baseId: 'plate_helm', materialId: 'iron' },
                { baseId: 'plate_armor', materialId: 'iron' },
                { baseId: 'chainmail', materialId: 'iron' },
                { baseId: 'plate_boots', materialId: 'iron' },
                { baseId: 'leather_cap', materialId: 'leather' },
                { baseId: 'leather_vest', materialId: 'leather' },
                { baseId: 'leather_boots', materialId: 'leather' },
                { baseId: 'cloth_hood', materialId: 'cloth' },
                { baseId: 'cloth_robe', materialId: 'cloth' },
                { baseId: 'cloth_slippers', materialId: 'cloth' },
                { baseId: 'cape', materialId: 'cloth' },
            ],
            // === RESOURCES (Aether & Housing Materials) ===
            // These are purchased directly (not Item instances)
            // and added to character.aether or character.materials
            resources: [
                // Aether
                { type: 'aether', id: 'aether', name: 'Aether', icon: '✨', price: 1 },
                // Tier 1 - Common
                { type: 'material', id: 'wood', name: 'Wood', icon: '🪵', price: 1, tier: 1 },
                { type: 'material', id: 'stone', name: 'Stone', icon: '🪨', price: 1, tier: 1 },
                { type: 'material', id: 'clay', name: 'Clay', icon: '🧱', price: 1, tier: 1 },
                // Tier 2 - Uncommon
                { type: 'material', id: 'iron', name: 'Iron', icon: '⛓️', price: 1, tier: 2 },
                { type: 'material', id: 'hardwood', name: 'Hardwood', icon: '🌳', price: 1, tier: 2 },
                { type: 'material', id: 'leather_strips', name: 'Leather Strips', icon: '🦴', price: 1, tier: 2 },
                // Tier 3 - Rare
                { type: 'material', id: 'marble', name: 'Marble', icon: '🔲', price: 1, tier: 3 },
                { type: 'material', id: 'silver_ingot', name: 'Silver Ingot', icon: '🥈', price: 1, tier: 3 },
                // Tier 4 - Epic
                { type: 'material', id: 'crystal_shard', name: 'Crystal Shard', icon: '💎', price: 1, tier: 4 },
                { type: 'material', id: 'dragonwood', name: 'Dragonwood', icon: '🐉', price: 1, tier: 4 },
                // Tier 5 - Legendary
                { type: 'material', id: 'ethereal_essence', name: 'Ethereal Essence', icon: '✨', price: 1, tier: 5 },
                { type: 'material', id: 'starstone', name: 'Starstone', icon: '⭐', price: 1, tier: 5 },
                // Tier 6 - Mythic
                { type: 'material', id: 'void_crystal', name: 'Void Crystal', icon: '🌑', price: 1, tier: 6 },
            ]
        },
        
        // Future: Blacksmith - higher tier metal items
        blacksmith: {
            name: "Blacksmith",
            icon: "⚒️",
            description: "Quality forged weapons and heavy armor.",
            inventory: [
                { baseId: 'sword', materialId: 'bronze' },
                { baseId: 'sword', materialId: 'steel' },
                { baseId: 'greatsword', materialId: 'iron' },
                { baseId: 'greatsword', materialId: 'bronze' },
                { baseId: 'axe', materialId: 'bronze' },
                { baseId: 'axe', materialId: 'steel' },
                { baseId: 'shield', materialId: 'bronze' },
                { baseId: 'shield', materialId: 'steel' },
                { baseId: 'plate_armor', materialId: 'iron' },
                { baseId: 'plate_armor', materialId: 'bronze' },
                { baseId: 'chainmail', materialId: 'bronze' },
                { baseId: 'chainmail', materialId: 'steel' },
            ]
        }
    }
};

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Calculate the buy price for an item
 * @param {Object} item - Item instance or item data
 * @returns {number} Price in gold
 */
export function calculateBuyPrice(item) {
    const baseId = item.baseId || item.id;
    const basePrice = ShopConfig.basePrices[baseId] || 10;
    const materialTier = item.materialTier || item.tier || 0;
    const upgradeTier = item.tier || 0;
    
    let price = basePrice;
    price += ShopConfig.materialTierBonus * materialTier;
    price += ShopConfig.upgradeTierBonus * upgradeTier;
    price = Math.floor(price * ShopConfig.economy.buyMultiplier);
    
    return Math.max(1, price);
}

/**
 * Calculate the sell price for an item (what player receives)
 * @param {Object} item - Item instance
 * @returns {number} Price in gold
 */
export function calculateSellPrice(item) {
    const buyPrice = calculateBuyPrice(item);
    return Math.max(1, Math.floor(buyPrice * ShopConfig.economy.sellRatio));
}

/**
 * Get shop inventory for a location
 * @param {string} shopId - Shop identifier (e.g., 'town', 'blacksmith')
 * @returns {Object} Shop data or null
 */
export function getShop(shopId) {
    return ShopConfig.shops[shopId] || null;
}

/**
 * Get base price for an item type
 * @param {string} baseId - Base item ID
 * @returns {number} Base price in gold
 */
export function getBasePrice(baseId) {
    return ShopConfig.basePrices[baseId] || 10;
}

/**
 * Get resource inventory for a shop (aether, housing materials)
 * @param {string} shopId - Shop identifier
 * @returns {Array} Resource list or empty array
 */
export function getShopResources(shopId) {
    const shop = ShopConfig.shops[shopId];
    return shop?.resources || [];
}

export default ShopConfig;
