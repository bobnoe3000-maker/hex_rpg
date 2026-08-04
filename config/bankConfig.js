/**
 * @file bankConfig.js
 * @description Configuration for the Ironvault Depository banking system.
 *              Defines vault capacity, expansion costs, and banking rules.
 * 
 * @location config/bankConfig.js
 * @usage Imported by BankService.js and BankUI.js for banking operations
 * @dependencies None (pure data configuration)
 * 
 * @version 1.0.0
 * @changelog
 *   - v1.0.0 (2026-01-27): Initial implementation with vault expansion tiers
 */

// ============================================
// BANK CONFIGURATION
// ============================================

export const BankConfig = {
    // Initial vault capacity for new characters
    initialVaultSlots: 30,
    
    // Maximum vault capacity (after all expansions)
    maxVaultSlots: 200,
    
    // Gold storage has no limit
    maxBankGold: Infinity,
    
    // Minimum gold transfer amount
    minGoldTransfer: 1,
    
    // Whether items can stack in vault (same baseId)
    allowItemStacking: true,
    
    // Maximum stack size for stackable items
    maxStackSize: 99
};

// ============================================
// VAULT EXPANSION TIERS
// ============================================

/**
 * Vault expansion tiers - each tier adds slots for a gold cost
 * Cost doubles each tier starting at 500g for 10 slots
 */
export const VaultExpansionTiers = [
    { tier: 1, slots: 10, cost: 500 },
    { tier: 2, slots: 10, cost: 1000 },
    { tier: 3, slots: 10, cost: 2000 },
    { tier: 4, slots: 10, cost: 4000 },
    { tier: 5, slots: 10, cost: 8000 },
    { tier: 6, slots: 10, cost: 16000 },
    { tier: 7, slots: 10, cost: 32000 },
    { tier: 8, slots: 10, cost: 64000 },
    { tier: 9, slots: 10, cost: 128000 },
    { tier: 10, slots: 10, cost: 256000 },
    { tier: 11, slots: 10, cost: 512000 },
    { tier: 12, slots: 10, cost: 1024000 },
    { tier: 13, slots: 10, cost: 2048000 },
    { tier: 14, slots: 10, cost: 4096000 },
    { tier: 15, slots: 10, cost: 8192000 },
    { tier: 16, slots: 10, cost: 16384000 },
    { tier: 17, slots: 10, cost: 32768000 }
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get the next available vault expansion tier
 * @param {number} currentSlots - Current vault slot count
 * @returns {Object|null} Next expansion tier or null if maxed
 */
export function getNextExpansionTier(currentSlots) {
    const slotsAdded = currentSlots - BankConfig.initialVaultSlots;
    const tiersPurchased = Math.floor(slotsAdded / 10);
    
    if (tiersPurchased >= VaultExpansionTiers.length) {
        return null; // All tiers purchased
    }
    
    return VaultExpansionTiers[tiersPurchased];
}

/**
 * Get all expansion tiers with purchase status
 * @param {number} currentSlots - Current vault slot count
 * @returns {Array} Tiers with 'purchased' flag
 */
export function getAllExpansionTiers(currentSlots) {
    const slotsAdded = currentSlots - BankConfig.initialVaultSlots;
    const tiersPurchased = Math.floor(slotsAdded / 10);
    
    return VaultExpansionTiers.map((tier, index) => ({
        ...tier,
        purchased: index < tiersPurchased,
        isNext: index === tiersPurchased
    }));
}

/**
 * Calculate total cost to reach a certain vault size
 * @param {number} targetSlots - Desired vault slot count
 * @returns {number} Total gold cost
 */
export function calculateExpansionCost(targetSlots) {
    const tiersNeeded = Math.ceil((targetSlots - BankConfig.initialVaultSlots) / 10);
    let totalCost = 0;
    
    for (let i = 0; i < tiersNeeded && i < VaultExpansionTiers.length; i++) {
        totalCost += VaultExpansionTiers[i].cost;
    }
    
    return totalCost;
}

/**
 * Check if an item type can be stored in the vault
 * @param {Object} item - Item to check
 * @returns {boolean} True if storable
 */
export function canStoreItemType(item) {
    if (!item) return false;
    
    // All item types can be stored
    // Exclude only equipped items (handled by caller)
    return true;
}

/**
 * Check if two items can stack together
 * @param {Object} item1 - First item
 * @param {Object} item2 - Second item
 * @returns {boolean} True if stackable
 */
export function canStackItems(item1, item2) {
    if (!item1 || !item2) return false;
    if (!BankConfig.allowItemStacking) return false;
    
    // Items must have same baseId to stack
    if (item1.baseId !== item2.baseId) return false;
    
    // Only consumables/potions/materials stack
    const stackableTypes = ['consumable', 'potion', 'material'];
    const type1 = item1.type || item1.itemType;
    const type2 = item2.type || item2.itemType;
    
    if (!stackableTypes.includes(type1) || !stackableTypes.includes(type2)) {
        return false;
    }
    
    // Check material tier matches for equipment materials
    if (item1.materialId !== item2.materialId) return false;
    
    return true;
}

// ============================================
// NPC DIALOGUE TEXT
// ============================================

export const BankDialogue = {
    depositGoldSuccess: (amount) => `*counts coins precisely* ${amount.toLocaleString()} gold, deposited and secured. Your vault balance has been updated.`,
    withdrawGoldSuccess: (amount) => `*retrieves coins* ${amount.toLocaleString()} gold, withdrawn as requested. Spend it wisely.`,
    depositItemSuccess: (itemName) => `*examines item carefully* Your ${itemName} has been catalogued and secured in your vault.`,
    withdrawItemSuccess: (itemName) => `*retrieves item* Your ${itemName}, exactly as deposited. We do not touch what is not ours.`,
    vaultExpanded: (newSlots) => `*nods approvingly* Your vault has been expanded. You now have ${newSlots} slots available. Dwarven work takes time, but it lasts forever.`,
    insufficientGold: "You don't have enough gold for that transaction.",
    insufficientBankGold: "Your bank balance is insufficient for that withdrawal.",
    vaultFull: "Your vault is full. Consider expanding your storage capacity.",
    inventoryFull: "Your inventory is full. Make room before withdrawing.",
    alreadyMaxVault: "Your vault is already at maximum capacity. Dwarven engineering has its limits.",
    invalidAmount: "Please specify a valid amount.",
    greeting: "Welcome to the Ironvault Depository. Your valuables are safe with us."
};

export default {
    BankConfig,
    VaultExpansionTiers,
    getNextExpansionTier,
    getAllExpansionTiers,
    calculateExpansionCost,
    canStoreItemType,
    canStackItems,
    BankDialogue
};
