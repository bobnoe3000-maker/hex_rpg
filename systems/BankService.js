/**
 * @file BankService.js
 * @description Business logic service for the Ironvault Depository banking system.
 *              Handles validation and operations for gold deposits/withdrawals,
 *              item storage, and vault expansion.
 * 
 * @location systems/BankService.js
 * @usage Imported by BankUI.js for banking operations
 * @dependencies 
 *   - BankConfig (config/bankConfig.js) - Vault configuration and expansion tiers
 *   - ItemUtils (utils/ItemUtils.js) - Item property access
 * 
 * @version 1.0.0
 * @changelog
 *   - v1.0.0 (2026-01-27): Initial implementation with gold/item storage and vault expansion
 */

import { 
    BankConfig, 
    VaultExpansionTiers, 
    getNextExpansionTier,
    getAllExpansionTiers,
    canStoreItemType,
    canStackItems,
    BankDialogue 
} from '../config/bankConfig.js';
import { ItemUtils } from '../utils/ItemUtils.js';

export const BankService = {
    
    // ============================================
    // GOLD OPERATIONS
    // ============================================
    
    /**
     * Check if a gold deposit is valid
     * @param {Object} character - Player character
     * @param {number} amount - Amount to deposit
     * @returns {Object} { valid: boolean, reason?: string }
     */
    canDepositGold(character, amount) {
        if (!character) {
            return { valid: false, reason: 'No character' };
        }
        if (amount <= 0) {
            return { valid: false, reason: BankDialogue.invalidAmount };
        }
        if (character.gold < amount) {
            return { valid: false, reason: BankDialogue.insufficientGold };
        }
        return { valid: true };
    },
    
    /**
     * Check if a gold withdrawal is valid
     * @param {Object} character - Player character
     * @param {number} amount - Amount to withdraw
     * @returns {Object} { valid: boolean, reason?: string }
     */
    canWithdrawGold(character, amount) {
        if (!character) {
            return { valid: false, reason: 'No character' };
        }
        if (amount <= 0) {
            return { valid: false, reason: BankDialogue.invalidAmount };
        }
        if (character.bankGold < amount) {
            return { valid: false, reason: BankDialogue.insufficientBankGold };
        }
        return { valid: true };
    },
    
    /**
     * Deposit gold into the bank
     * @param {Object} character - Player character
     * @param {number} amount - Amount to deposit
     * @returns {Object} { success: boolean, message: string }
     */
    depositGold(character, amount) {
        const validation = this.canDepositGold(character, amount);
        if (!validation.valid) {
            return { success: false, message: validation.reason };
        }
        
        const result = character.depositGold(amount);
        if (result.success) {
            return { 
                success: true, 
                message: BankDialogue.depositGoldSuccess(amount),
                newBankBalance: result.newBankBalance,
                newWalletBalance: result.newWalletBalance
            };
        }
        return { success: false, message: result.reason || 'Deposit failed' };
    },
    
    /**
     * Withdraw gold from the bank
     * @param {Object} character - Player character
     * @param {number} amount - Amount to withdraw
     * @returns {Object} { success: boolean, message: string }
     */
    withdrawGold(character, amount) {
        const validation = this.canWithdrawGold(character, amount);
        if (!validation.valid) {
            return { success: false, message: validation.reason };
        }
        
        const result = character.withdrawGold(amount);
        if (result.success) {
            return { 
                success: true, 
                message: BankDialogue.withdrawGoldSuccess(amount),
                newBankBalance: result.newBankBalance,
                newWalletBalance: result.newWalletBalance
            };
        }
        return { success: false, message: result.reason || 'Withdrawal failed' };
    },
    
    // ============================================
    // ITEM OPERATIONS
    // ============================================
    
    /**
     * Check if an item can be deposited
     * @param {Object} character - Player character
     * @param {Object} item - Item to deposit
     * @returns {Object} { valid: boolean, reason?: string }
     */
    canDepositItem(character, item) {
        if (!character) {
            return { valid: false, reason: 'No character' };
        }
        if (!item) {
            return { valid: false, reason: 'No item specified' };
        }
        if (!canStoreItemType(item)) {
            return { valid: false, reason: 'This item type cannot be stored' };
        }
        
        // Check vault capacity
        const vaultUsed = character.getBankVaultUsed();
        if (vaultUsed >= character.bankVaultSlots) {
            return { valid: false, reason: BankDialogue.vaultFull };
        }
        
        return { valid: true };
    },
    
    /**
     * Check if an item can be withdrawn
     * @param {Object} character - Player character
     * @param {Object} item - Item to withdraw
     * @returns {Object} { valid: boolean, reason?: string }
     */
    canWithdrawItem(character, item) {
        if (!character) {
            return { valid: false, reason: 'No character' };
        }
        if (!item) {
            return { valid: false, reason: 'No item specified' };
        }
        
        // Check inventory capacity
        if (character.inventory.length >= character.maxInventory) {
            return { valid: false, reason: BankDialogue.inventoryFull };
        }
        
        return { valid: true };
    },
    
    /**
     * Deposit an item into the vault
     * @param {Object} character - Player character
     * @param {string} itemId - ID of item to deposit
     * @returns {Object} { success: boolean, message: string, item?: Object }
     */
    depositItem(character, itemId) {
        const item = character.inventory.find(i => i.id === itemId);
        if (!item) {
            return { success: false, message: 'Item not found in inventory' };
        }
        
        const validation = this.canDepositItem(character, item);
        if (!validation.valid) {
            return { success: false, message: validation.reason };
        }
        
        const itemName = ItemUtils.getName(item);
        const result = character.depositItem(itemId);
        
        if (result.success) {
            return { 
                success: true, 
                message: BankDialogue.depositItemSuccess(itemName),
                item: result.item
            };
        }
        return { success: false, message: result.reason || 'Deposit failed' };
    },
    
    /**
     * Withdraw an item from the vault
     * @param {Object} character - Player character
     * @param {string} itemId - ID of item to withdraw
     * @returns {Object} { success: boolean, message: string, item?: Object }
     */
    withdrawItem(character, itemId) {
        const item = character.getVaultItem(itemId);
        if (!item) {
            return { success: false, message: 'Item not found in vault' };
        }
        
        const validation = this.canWithdrawItem(character, item);
        if (!validation.valid) {
            return { success: false, message: validation.reason };
        }
        
        const itemName = ItemUtils.getName(item);
        const result = character.withdrawItem(itemId);
        
        if (result.success) {
            return { 
                success: true, 
                message: BankDialogue.withdrawItemSuccess(itemName),
                item: result.item
            };
        }
        return { success: false, message: result.reason || 'Withdrawal failed' };
    },
    
    // ============================================
    // VAULT EXPANSION
    // ============================================
    
    /**
     * Get the next available vault expansion
     * @param {Object} character - Player character
     * @returns {Object|null} Next expansion tier or null if maxed
     */
    getNextExpansion(character) {
        if (!character) return null;
        return getNextExpansionTier(character.bankVaultSlots);
    },
    
    /**
     * Get all expansion tiers with status
     * @param {Object} character - Player character
     * @returns {Array} Expansion tiers with purchased/isNext flags
     */
    getAllExpansions(character) {
        if (!character) return [];
        return getAllExpansionTiers(character.bankVaultSlots);
    },
    
    /**
     * Check if vault can be expanded
     * @param {Object} character - Player character
     * @returns {Object} { canExpand: boolean, reason?: string, nextTier?: Object }
     */
    canExpandVault(character) {
        if (!character) {
            return { canExpand: false, reason: 'No character' };
        }
        
        const nextTier = this.getNextExpansion(character);
        if (!nextTier) {
            return { canExpand: false, reason: BankDialogue.alreadyMaxVault };
        }
        
        if (character.gold < nextTier.cost) {
            return { 
                canExpand: false, 
                reason: `You need ${nextTier.cost.toLocaleString()} gold (you have ${character.gold.toLocaleString()})`,
                nextTier 
            };
        }
        
        return { canExpand: true, nextTier };
    },
    
    /**
     * Expand the vault capacity
     * @param {Object} character - Player character
     * @returns {Object} { success: boolean, message: string, newCapacity?: number }
     */
    expandVault(character) {
        const validation = this.canExpandVault(character);
        if (!validation.canExpand) {
            return { success: false, message: validation.reason };
        }
        
        const { nextTier } = validation;
        const result = character.expandVault(nextTier.slots, nextTier.cost);
        
        if (result.success) {
            return { 
                success: true, 
                message: BankDialogue.vaultExpanded(result.newCapacity),
                newCapacity: result.newCapacity,
                cost: nextTier.cost,
                slotsAdded: nextTier.slots
            };
        }
        return { success: false, message: result.reason || 'Expansion failed' };
    },
    
    // ============================================
    // UTILITY METHODS
    // ============================================
    
    /**
     * Get vault summary for display
     * @param {Object} character - Player character
     * @returns {Object} Vault summary
     */
    getVaultSummary(character) {
        if (!character) {
            return {
                bankGold: 0,
                walletGold: 0,
                vaultUsed: 0,
                vaultCapacity: BankConfig.initialVaultSlots,
                canExpand: false,
                nextExpansionCost: null
            };
        }
        
        const nextTier = this.getNextExpansion(character);
        
        return {
            bankGold: character.bankGold || 0,
            walletGold: character.gold || 0,
            vaultUsed: character.getBankVaultUsed(),
            vaultCapacity: character.bankVaultSlots || BankConfig.initialVaultSlots,
            canExpand: !!nextTier,
            nextExpansionCost: nextTier?.cost || null,
            nextExpansionSlots: nextTier?.slots || null
        };
    },
    
    /**
     * Get vault items sorted by type
     * @param {Object} character - Player character
     * @returns {Object} Items sorted by category
     */
    getVaultItemsByCategory(character) {
        if (!character || !character.bankVault) {
            return { gear: [], consumables: [], materials: [], other: [] };
        }
        
        const sorted = {
            gear: [],
            consumables: [],
            materials: [],
            other: []
        };
        
        for (const item of character.bankVault) {
            const type = ItemUtils.getType(item);
            
            if (['weapon', 'armor', 'accessory', 'shield', 'offhand'].includes(type)) {
                sorted.gear.push(item);
            } else if (['consumable', 'potion'].includes(type)) {
                sorted.consumables.push(item);
            } else if (type === 'material') {
                sorted.materials.push(item);
            } else {
                sorted.other.push(item);
            }
        }
        
        return sorted;
    },
    
    /**
     * Format gold amount for display
     * @param {number} amount - Gold amount
     * @returns {string} Formatted gold string
     */
    formatGold(amount) {
        return amount.toLocaleString();
    },
    
    /**
     * Get greeting message from Dolgrim
     * @returns {string} Random greeting
     */
    getGreeting() {
        return BankDialogue.greeting;
    }
};

export default BankService;
