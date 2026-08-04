/**
 * @file ForgeUI.js
 * @description Forge UI component for item upgrades/merging.
 *              Allows players to combine duplicate items to increase upgrade tier.
 *              Extracted from TownScreen.js for modularity.
 *              Now supports pre-selection of items from external sources (v1.1.0).
 *              Added item stacking, filter pills, and post-upgrade inventory sync (v1.2.0).
 * 
 * @location ui/ForgeUI.js
 * @usage Instantiated by TownScreen when player opens the Forge, or by BattleMapUI
 *        for battlefield upgrades. Can pre-select items via setBaseItem().
 * @dependencies 
 *   - ForgeService (systems/ForgeService.js) - Upgrade logic and validation
 *   - ItemUtils (utils/ItemUtils.js) - Item property access
 *   - itemConfig.js - getItem, getUpgradeConfig
 * 
 * @version 1.2.2
 * @changelog
 *   - v1.2.2 (2026-02-08): Fixed ghost sacrifice item bug with belt-and-suspenders
 *                          approach: (1) Track consumed sacrifice IDs in _consumedItemIds
 *                          Set. (2) Exclude consumed IDs in _getCompatibleMaterials AND
 *                          _getUpgradeableItems. (3) Defensive manual splice removal if
 *                          sacrifice is still in inventory after ForgeService upgrade.
 *   - v1.2.1 (2026-02-08): Added sort dropdown (Type/Tier/Recent) reusing inv-sort-*
 *                          CSS classes. Switched filter pills from forge-filter-pill to
 *                          inv-filter-pill CSS class to fix white overlay rendering.
 *                          Switched equipped badge to inv-equipped-badge CSS class.
 *                          Combined sort + filters into unified inv-toolbar layout.
 *   - v1.2.0 (2026-02-08): Added item stacking in selection grid (identical items grouped
 *                          with ×N badge). Added filter pills for base item selection
 *                          (All/Weapon/Shield/Head/Body/Cape/Boots/Neck/Ring). Fixed bug
 *                          where consumed sacrifice material remained selectable after
 *                          successful upgrade by syncing base item reference from live
 *                          inventory post-upgrade.
 *   - v1.1.1 (2025-02-03): Fixed updateCharacter() to check both inventory AND equipment
 *                          when validating selected items. Previously equipped items would
 *                          be cleared when opening forge via upgrade button.
 *   - v1.1.0 (2025-02-03): Added setBaseItem() for external item pre-selection.
 *                          Changed slot clear behavior - items persist on success,
 *                          only clear on destruction. User manually clears via ✕ button.
 *                          Updated result screen messaging to indicate item remains.
 *   - v1.0.0 (2025-01-21): Initial implementation - extracted from TownScreen.js v2.2.8
 */

import { getItem, getUpgradeConfig } from '../config/itemConfig.js';
import { ItemUtils } from '../utils/ItemUtils.js';
import { ForgeService } from '../systems/ForgeService.js';

/**
 * Filter options for base item selection grid.
 * Mirrors GEAR_FILTER_OPTIONS from InventoryUI for consistency.
 */
const FORGE_FILTER_OPTIONS = [
    { id: 'all', label: 'All', icon: '' },
    { id: 'weapon', label: 'Weapon', icon: '⚔️' },
    { id: 'shield', label: 'Shield', icon: '🛡️' },
    { id: 'head', label: 'Head', icon: '🪖' },
    { id: 'body', label: 'Body', icon: '👕' },
    { id: 'cape', label: 'Cape', icon: '🧣' },
    { id: 'boots', label: 'Boots', icon: '👢' },
    { id: 'necklace', label: 'Neck', icon: '📿' },
    { id: 'ring', label: 'Ring', icon: '💍' }
];

/**
 * Sort options for forge item selection.
 * Subset of InventoryUI's SORT_OPTIONS relevant to forge context.
 */
const FORGE_SORT_OPTIONS = [
    { id: 'type', label: 'Type', icon: '📦' },
    { id: 'tier', label: 'Tier', icon: '💎' },
    { id: 'recent', label: 'Recent', icon: '🕐' }
];

export class ForgeUI {
    /**
     * Create a ForgeUI instance
     * @param {HTMLElement} container - Parent container for the forge panel content
     * @param {Object} character - Player character object
     * @param {Object} callbacks - Callback functions
     * @param {Function} callbacks.onClose - Called when forge panel should close
     * @param {Function} callbacks.onSave - Called when game should be saved
     * @param {Function} callbacks.onTextOutput - Called to output text to MUD feed
     */
    constructor(container, character, callbacks = {}) {
        this.container = container;
        this.character = character;
        this.callbacks = callbacks;
        
        // Forge state
        this._baseItem = null;
        this._sacrificeItem = null;
        
        // v1.2.2: Track IDs of items consumed as sacrifices during this session.
        // Used as a defensive filter in _getCompatibleMaterials to prevent
        // ghost items even if character.removeFromInventory fails silently.
        this._consumedItemIds = new Set();
        
        // v1.2.0: Filter state for base item selection
        this._filterBy = 'all';
        
        // v1.2.1: Sort state for item selection
        this._sortBy = 'type';
        this._sortDropdownOpen = false;
        
        // Bind methods
        this._handleItemSelect = this._handleItemSelect.bind(this);
        this._handleClearSlot = this._handleClearSlot.bind(this);
        this._handleUpgrade = this._handleUpgrade.bind(this);
    }
    
    /**
     * Get the current forge state
     * @returns {Object} Current base and sacrifice items
     */
    getState() {
        return {
            baseItem: this._baseItem,
            sacrificeItem: this._sacrificeItem
        };
    }
    
    /**
     * Set forge state (for restoring after refresh)
     * @param {Object} state - State object with baseItem and sacrificeItem
     */
    setState(state) {
        if (state) {
            this._baseItem = state.baseItem || null;
            this._sacrificeItem = state.sacrificeItem || null;
        }
    }
    
    /**
     * Clear forge slots
     */
    clearSlots() {
        this._baseItem = null;
        this._sacrificeItem = null;
        this._consumedItemIds.clear();
    }
    
    /**
     * Set the base item for upgrade (pre-select from external source)
     * Used when opening forge from item popup "Upgrade" button.
     * @param {Object} item - Item to place in upgrade slot
     * @returns {boolean} True if item was set successfully
     */
    setBaseItem(item) {
        if (!item) return false;
        
        // Validate item is upgradeable
        const type = ItemUtils.getType(item);
        const validTypes = ['weapon', 'armor', 'accessory', 'shield', 'offhand', 'gear'];
        if (!validTypes.includes(type)) {
            console.warn('[ForgeUI] Cannot set base item - invalid type:', type);
            return false;
        }
        
        // Check if at max tier
        const upgradeConfig = typeof getUpgradeConfig === 'function' 
            ? getUpgradeConfig() 
            : { maxTier: 10 };
        const tier = item.tier || 0;
        if (tier >= (upgradeConfig?.maxTier || 10)) {
            console.warn('[ForgeUI] Cannot set base item - already at max tier:', tier);
            return false;
        }
        
        // Set the item
        this._baseItem = item;
        this._sacrificeItem = null; // Clear sacrifice when setting new base
        
        return true;
    }
    
    /**
     * Check if an item can be upgraded (for showing/hiding upgrade buttons)
     * @param {Object} item - Item to check
     * @returns {boolean} True if item can be upgraded
     */
    static canUpgrade(item) {
        if (!item) return false;
        
        // Check item type
        const type = ItemUtils.getType(item);
        const validTypes = ['weapon', 'armor', 'accessory', 'shield', 'offhand', 'gear'];
        if (!validTypes.includes(type)) return false;
        
        // Check tier
        const upgradeConfig = typeof getUpgradeConfig === 'function' 
            ? getUpgradeConfig() 
            : { maxTier: 10 };
        const tier = item.tier || 0;
        if (tier >= (upgradeConfig?.maxTier || 10)) return false;
        
        return true;
    }
    
    /**
     * Build and return the forge panel HTML content
     * @param {string} npcTitle - Optional NPC title prefix
     * @returns {string} HTML content for the forge panel
     */
    buildContent(npcTitle = '🔥 The Forge') {
        const playerGold = this.character.gold || 0;
        const playerAether = this.character.aether || 0;
        
        const baseItem = this._baseItem;
        const sacrificeItem = this._sacrificeItem;
        
        // Calculate costs and rates
        let costs = { gold: 0, aether: 0 };
        let successRate = 0;
        let destructionChance = 0;
        let canMerge = { valid: false, message: 'Select items to upgrade' };
        let preview = null;
        
        if (baseItem) {
            costs = ForgeService.getUpgradeCosts(baseItem);
            successRate = ForgeService.getSuccessRate(baseItem);
            destructionChance = ForgeService.getDestructionChance(baseItem);
            
            if (sacrificeItem) {
                canMerge = ForgeService.canMerge(baseItem, sacrificeItem);
                // Convert reason codes to user-friendly messages
                if (!canMerge.valid && canMerge.reason) {
                    const messages = {
                        'missing_item': 'Select items to upgrade',
                        'same_item': 'Cannot use the same item',
                        'not_gear': 'Only equipment can be upgraded',
                        'subtype_mismatch': 'Items must be the same type',
                        'max_tier': 'Item is already at maximum tier'
                    };
                    canMerge.message = messages[canMerge.reason] || canMerge.reason;
                }
                if (canMerge.valid) {
                    preview = ForgeService.getUpgradePreview(baseItem, sacrificeItem);
                }
            }
        }
        
        const canAfford = playerGold >= costs.gold && playerAether >= costs.aether;
        const canUpgrade = canMerge.valid && canAfford;
        
        // Get items for selection
        let upgradeableItems = this._getUpgradeableItems();
        const compatibleMaterials = baseItem ? this._getCompatibleMaterials(baseItem) : [];
        
        // v1.2.0: Apply filter to base item selection
        if (!baseItem) {
            upgradeableItems = this._filterForgeItems(upgradeableItems, this._filterBy);
        }
        
        // v1.2.1: Apply sorting before stacking
        upgradeableItems = this._sortForgeItems(upgradeableItems, this._sortBy);
        const sortedMaterials = this._sortForgeItems(compatibleMaterials, this._sortBy);
        
        // v1.2.0: Stack items for display
        const upgradeableStacks = this._stackItems(upgradeableItems);
        const materialStacks = this._stackItems(sortedMaterials);
        
        // v1.2.1: Render toolbar (sort + filter pills) only when selecting base item
        const toolbarHtml = !baseItem ? this._renderForgeToolbar() : '';
        
        // v1.2.0: Get subtype label for material selection header
        const subtypeLabel = baseItem ? this._getSubtypeDisplayName(baseItem) : '';
        
        return `
            <div class="panel-forge">
                <!-- Currency Display -->
                <div class="forge-currency-row">
                    <div class="forge-currency gold">
                        <span class="forge-currency-icon">💰</span>
                        <span class="forge-currency-amount">${playerGold.toLocaleString()}</span>
                        <span class="forge-currency-label">Gold</span>
                    </div>
                    <div class="forge-currency aether">
                        <span class="forge-currency-icon">✨</span>
                        <span class="forge-currency-amount">${playerAether}</span>
                        <span class="forge-currency-label">Aether</span>
                    </div>
                </div>
                
                <!-- Forge Slots -->
                <div class="forge-slots" style="display: flex; gap: 12px; align-items: center; justify-content: center; margin: 16px 0;">
                    <div class="forge-slot ${baseItem ? 'filled' : ''}" id="forgeBaseSlot" data-slot="base" style="flex: 1; max-width: 140px; min-height: 80px; padding: 10px; border: 2px dashed var(--color-border, #4a5568); border-radius: 8px; text-align: center; position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; ${baseItem ? 'border-style: solid; border-color: var(--color-accent, #f59e0b);' : ''}">
                        <span class="forge-slot-label" style="font-size: 0.7rem; color: var(--color-text-dim, #9ca3af); position: absolute; top: 4px; left: 8px;">Upgrade</span>
                        ${baseItem ? this._renderSlotItem(baseItem) : `
                            <span class="forge-slot-icon" style="font-size: 1.5rem; margin-bottom: 4px;">⚔️</span>
                            <span class="forge-slot-empty" style="font-size: 0.75rem; color: var(--color-text-dim, #9ca3af);">Select item<br>to upgrade</span>
                        `}
                        ${baseItem ? '<button class="forge-slot-clear" data-slot="base" style="position: absolute; top: 4px; right: 4px; background: var(--color-danger, #ef4444); border: none; color: white; width: 20px; height: 20px; border-radius: 50%; cursor: pointer; font-size: 0.7rem; line-height: 1;">✕</button>' : ''}
                    </div>
                    
                    <span class="forge-arrow" style="font-size: 1.5rem; color: var(--color-text-dim, #9ca3af);">➕</span>
                    
                    <div class="forge-slot ${sacrificeItem ? 'filled' : ''}" id="forgeSacrificeSlot" data-slot="sacrifice" style="flex: 1; max-width: 140px; min-height: 80px; padding: 10px; border: 2px dashed var(--color-border, #4a5568); border-radius: 8px; text-align: center; position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; ${sacrificeItem ? 'border-style: solid; border-color: var(--color-accent, #f59e0b);' : ''}">
                        <span class="forge-slot-label" style="font-size: 0.7rem; color: var(--color-text-dim, #9ca3af); position: absolute; top: 4px; left: 8px;">Material</span>
                        ${sacrificeItem ? this._renderSlotItem(sacrificeItem) : `
                            <span class="forge-slot-icon" style="font-size: 1.5rem; margin-bottom: 4px;">🔧</span>
                            <span class="forge-slot-empty" style="font-size: 0.75rem; color: var(--color-text-dim, #9ca3af);">Select<br>material</span>
                        `}
                        ${sacrificeItem ? '<button class="forge-slot-clear" data-slot="sacrifice" style="position: absolute; top: 4px; right: 4px; background: var(--color-danger, #ef4444); border: none; color: white; width: 20px; height: 20px; border-radius: 50%; cursor: pointer; font-size: 0.7rem; line-height: 1;">✕</button>' : ''}
                    </div>
                </div>
                
                ${preview ? this._renderPreview(baseItem, preview) : ''}
                
                <!-- Success Rate Display -->
                ${baseItem ? `
                    <div class="forge-rate-section">
                        <div class="forge-rate-row">
                            <span class="forge-rate-label">Success Rate</span>
                            <span class="forge-rate-value success" style="color: ${ForgeService.getRiskColor(successRate)}">${ForgeService.formatRate(successRate)}</span>
                        </div>
                        ${destructionChance > 0 ? `
                            <div class="forge-rate-row">
                                <span class="forge-rate-label">Destruction Risk</span>
                                <span class="forge-rate-value danger">${ForgeService.formatRate(destructionChance)}</span>
                            </div>
                        ` : ''}
                        <div class="forge-rate-row">
                            <span class="forge-rate-label">Risk Level</span>
                            <span class="forge-rate-value" style="color: ${ForgeService.getRiskColor(successRate)}">${ForgeService.getRiskLevel(successRate)}</span>
                        </div>
                    </div>
                ` : ''}
                
                <!-- Costs -->
                ${baseItem ? `
                    <div class="forge-costs">
                        <div class="forge-cost-item ${playerGold >= costs.gold ? 'affordable' : 'insufficient'}">
                            <span>💰</span>
                            <span>${costs.gold.toLocaleString()} Gold</span>
                        </div>
                        ${costs.aether > 0 ? `
                            <div class="forge-cost-item ${playerAether >= costs.aether ? 'affordable' : 'insufficient'}">
                                <span>✨</span>
                                <span>${costs.aether} Aether</span>
                            </div>
                        ` : ''}
                    </div>
                ` : ''}
                
                <!-- Upgrade Button -->
                <button class="forge-button ${successRate < 0.5 ? (successRate < 0.3 ? 'dangerous' : 'risky') : ''}" 
                        id="forgeUpgradeBtn"
                        ${!canUpgrade ? 'disabled' : ''}>
                    <span class="forge-button-icon">🔥</span>
                    ${canUpgrade ? 'Attempt Upgrade' : (canMerge.valid ? 'Insufficient Resources' : canMerge.message || 'Select Items')}
                </button>
                
                <!-- Item Selection -->
                <div class="forge-item-select">
                    <div class="forge-item-select-title">
                        ${!baseItem ? 'Select item to upgrade:' : `Select material (same type${subtypeLabel ? ' — ' + subtypeLabel : ''}):`}
                    </div>
                    ${toolbarHtml}
                    <div class="forge-item-grid" id="forgeItemGrid">
                        ${!baseItem ? 
                            upgradeableStacks.map(stack => this._renderStackOption(stack, 'base')).join('') :
                            materialStacks.map(stack => this._renderStackOption(stack, 'sacrifice')).join('')
                        }
                        ${(!baseItem && upgradeableStacks.length === 0) || (baseItem && materialStacks.length === 0) ? 
                            `<p style="color: var(--color-text-dim); grid-column: 1/-1; text-align: center; padding: 16px;">
                                ${!baseItem ? 'No upgradeable items in inventory' : 'No compatible materials available'}
                            </p>` : ''
                        }
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Build result screen HTML after upgrade attempt
     * @param {Object} result - Result object with outcome and message
     * @returns {string} HTML content for result screen
     */
    buildResultContent(result) {
        let icon, title, titleClass, note = '';
        
        switch (result.outcome) {
            case 'success':
                icon = '✨';
                title = 'Upgrade Successful!';
                titleClass = 'success';
                // v1.1.0: Add note about item remaining in forge
                note = '<div class="forge-result-note">Your item remains in the forge for further upgrades.</div>';
                break;
            case 'failure':
                icon = '💨';
                title = 'Upgrade Failed';
                titleClass = 'failure';
                note = '<div class="forge-result-note" style="background: rgba(156, 163, 175, 0.1); color: var(--color-text-dim, #9ca3af);">Both items have been preserved. Try again!</div>';
                break;
            case 'destruction':
                icon = '💥';
                title = 'Item Destroyed!';
                titleClass = 'destruction';
                break;
            default:
                icon = '❌';
                title = 'Error';
                titleClass = 'failure';
        }
        
        return `
            <div class="forge-result-content">
                <div class="forge-result-icon ${result.outcome}">${icon}</div>
                <div class="forge-result-title ${titleClass}">${title}</div>
                <div class="forge-result-message">${result.message}</div>
                <button class="forge-result-button" id="forgeResultClose">Continue</button>
                ${note}
            </div>
        `;
    }
    
    /**
     * Setup event handlers for the forge panel
     * Call this after inserting content into DOM
     */
    setupHandlers() {
        // v1.2.0: Item selection now uses stack options
        this.container.querySelectorAll('.forge-item-option').forEach(opt => {
            opt.addEventListener('click', () => {
                const itemId = opt.dataset.itemId;
                const slotType = opt.dataset.slotType;
                this._handleItemSelect(itemId, slotType);
            });
        });
        
        // Slot clear buttons
        this.container.querySelectorAll('.forge-slot-clear').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const slot = btn.dataset.slot;
                this._handleClearSlot(slot);
            });
        });
        
        // Upgrade button
        const upgradeBtn = this.container.querySelector('#forgeUpgradeBtn');
        if (upgradeBtn && !upgradeBtn.disabled) {
            upgradeBtn.addEventListener('click', () => {
                this._handleUpgrade();
            });
        }
        
        // v1.2.0: Filter pill click handlers (reuses inv-filter-pill class)
        this.container.querySelectorAll('.inv-filter-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                const filterId = pill.dataset.filter;
                if (filterId && filterId !== this._filterBy) {
                    this._filterBy = filterId;
                    // Notify parent to refresh
                    if (this.callbacks.onRefresh) {
                        this.callbacks.onRefresh();
                    }
                }
            });
        });
        
        // v1.2.1: Sort button toggle
        const sortBtn = this.container.querySelector('#forgeSortBtn');
        if (sortBtn) {
            sortBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._sortDropdownOpen = !this._sortDropdownOpen;
                const dropdown = this.container.querySelector('#forgeSortDropdown');
                if (dropdown) {
                    dropdown.classList.toggle('open', this._sortDropdownOpen);
                }
            });
        }
        
        // v1.2.1: Sort option selection
        this.container.querySelectorAll('.inv-sort-option[data-sort]').forEach(opt => {
            opt.addEventListener('click', () => {
                const sortId = opt.dataset.sort;
                if (sortId && sortId !== this._sortBy) {
                    this._sortBy = sortId;
                    this._sortDropdownOpen = false;
                    if (this.callbacks.onRefresh) {
                        this.callbacks.onRefresh();
                    }
                }
            });
        });
    }
    
    /**
     * Setup handler for result close button
     * @param {Function} onContinue - Called when continue button clicked
     */
    setupResultHandler(onContinue) {
        const closeBtn = this.container.querySelector('#forgeResultClose');
        if (closeBtn) {
            closeBtn.addEventListener('click', onContinue);
        }
    }
    
    // ============================================
    // INTERNAL HANDLERS
    // ============================================
    
    /**
     * Handle item selection for forge
     * v1.2.0: Now picks a specific item from a stack (first non-equipped item)
     */
    _handleItemSelect(itemId, slotType) {
        const item = this.character.inventory.find(i => i.id === itemId);
        if (!item) return;
        
        if (slotType === 'base') {
            this._baseItem = item;
            this._sacrificeItem = null; // Clear sacrifice when changing base
        } else {
            this._sacrificeItem = item;
        }
        
        // Notify parent to refresh
        if (this.callbacks.onRefresh) {
            this.callbacks.onRefresh();
        }
    }
    
    /**
     * Handle clearing a forge slot
     */
    _handleClearSlot(slot) {
        if (slot === 'base') {
            this._baseItem = null;
            this._sacrificeItem = null;
        } else {
            this._sacrificeItem = null;
        }
        
        // Notify parent to refresh
        if (this.callbacks.onRefresh) {
            this.callbacks.onRefresh();
        }
    }
    
    /**
     * Handle upgrade attempt
     * v1.2.0: Added post-upgrade inventory sync to prevent ghost items
     */
    _handleUpgrade() {
        if (!this._baseItem || !this._sacrificeItem) return;
        
        const result = ForgeService.attemptUpgrade(
            this.character,
            this._baseItem,
            this._sacrificeItem
        );
        
        // Convert result to outcome format
        let outcome;
        if (result.success) {
            outcome = 'success';
        } else if (result.destroyed) {
            outcome = 'destruction';
        } else {
            outcome = 'failure';
        }
        
        // Create display result
        const displayResult = {
            outcome: outcome,
            message: this._getResultMessage(outcome, result.item)
        };
        
        // v1.1.0: Changed slot clear behavior
        // - On destruction: Clear base slot (item no longer exists)
        // - On success: Keep base item in slot (update reference to upgraded item)
        // - On failure: Keep both items (sacrifice preserved per existing behavior)
        if (outcome === 'destruction') {
            // Item was destroyed - clear the slot
            this._baseItem = null;
            this._sacrificeItem = null;
        } else if (outcome === 'success') {
            // Success - update base item reference to the upgraded item, clear sacrifice only
            if (result.item) {
                // v1.2.0: Sync base item reference from live inventory to ensure
                // we have the actual object reference from the inventory array.
                const freshItem = this.character.inventory?.find(i => i.id === result.item.id);
                this._baseItem = freshItem || result.item;
            }
            
            // v1.2.2: Track consumed sacrifice ID defensively
            if (this._sacrificeItem) {
                this._consumedItemIds.add(this._sacrificeItem.id);
                
                // Defensive: if sacrifice is still in inventory (removeFromInventory
                // may have silently failed), remove it manually by filtering
                const inv = this.character.inventory;
                if (inv && inv.some(i => i.id === this._sacrificeItem.id)) {
                    console.warn('[ForgeUI] Sacrifice item still in inventory after upgrade - removing defensively');
                    const idx = inv.findIndex(i => i.id === this._sacrificeItem.id);
                    if (idx !== -1) {
                        inv.splice(idx, 1);
                    }
                }
            }
            this._sacrificeItem = null;
        } else {
            // Failure - clear only sacrifice (sacrifice is preserved in inventory)
            this._sacrificeItem = null;
        }
        
        // Notify parent to save and show result
        if (this.callbacks.onSave) {
            this.callbacks.onSave();
        }
        
        if (this.callbacks.onResult) {
            this.callbacks.onResult(displayResult);
        }
        
        if (this.callbacks.onTextOutput) {
            this.callbacks.onTextOutput(displayResult.message);
        }
    }
    
    // ============================================
    // RENDER HELPERS
    // ============================================
    
    /**
     * Render item in forge slot
     */
    _renderSlotItem(item) {
        const itemName = ItemUtils.getName(item);
        const itemColor = ItemUtils.getColor(item);
        const tier = item.tier || 0;
        
        return `
            <div class="forge-slot-item" style="display: flex; flex-direction: column; align-items: center; gap: 2px; width: 100%; padding-top: 8px;">
                <span class="forge-slot-item-name" style="color: ${itemColor}; font-size: 0.8rem; font-weight: 500; text-align: center; word-wrap: break-word; overflow-wrap: break-word; white-space: normal; line-height: 1.2; max-width: 100%;">${itemName}</span>
                <span class="forge-slot-item-tier" style="font-size: 0.75rem; color: var(--color-accent, #f59e0b); font-weight: 600;">+${tier}</span>
            </div>
        `;
    }
    
    /**
     * Render upgrade preview
     */
    _renderPreview(baseItem, preview) {
        const oldTier = preview.currentTier || baseItem.tier || 0;
        const newTier = preview.newTier || (oldTier + 1);
        const baseName = ItemUtils.getName(baseItem).replace(/\s*\(t\d+\)\s*/, '').replace(/\s*\+\d+\s*$/, '');
        
        return `
            <div class="forge-preview">
                <div class="forge-preview-title">Result Preview</div>
                <div class="forge-preview-item">
                    <span class="forge-preview-item-name" style="color: ${ItemUtils.getColor(baseItem)}; word-wrap: break-word;">${baseName}</span>
                    <span class="forge-preview-change">+${oldTier} → +${newTier}</span>
                </div>
                ${preview.materialUpgrade ? `<div class="forge-preview-stats"><span class="forge-preview-stat increase">⬆️ Material upgraded!</span></div>` : ''}
                ${preview.procUpgrade ? `<div class="forge-preview-stats"><span class="forge-preview-stat increase">✨ Proc effect upgraded!</span></div>` : ''}
            </div>
        `;
    }
    
    /**
     * v1.2.1: Render toolbar with sort dropdown and filter pills.
     * Reuses inv-toolbar, inv-sort-*, and inv-filter-pill CSS classes
     * from InventoryUI for visual consistency.
     * @returns {string} HTML string for sort + filter toolbar
     */
    _renderForgeToolbar() {
        const currentSort = FORGE_SORT_OPTIONS.find(s => s.id === this._sortBy) || FORGE_SORT_OPTIONS[0];
        
        // Sort dropdown options
        const sortOptionsHtml = FORGE_SORT_OPTIONS.map(opt => `
            <div class="inv-sort-option ${opt.id === this._sortBy ? 'active' : ''}" data-sort="${opt.id}">
                ${opt.icon} ${opt.label}
            </div>
        `).join('');
        
        // Filter pills
        const filterPillsHtml = FORGE_FILTER_OPTIONS.map(opt => `
            <button class="inv-filter-pill ${opt.id === this._filterBy ? 'active' : ''}" data-filter="${opt.id}">
                ${opt.icon ? opt.icon + ' ' : ''}${opt.label}
            </button>
        `).join('');
        
        return `
            <div class="inv-toolbar">
                <div class="inv-sort-container">
                    <button class="inv-sort-btn" id="forgeSortBtn">
                        <span class="inv-sort-icon">↕️</span>
                        <span class="inv-sort-label">${currentSort.label}</span>
                        <span class="inv-sort-arrow">▼</span>
                    </button>
                    <div class="inv-sort-dropdown ${this._sortDropdownOpen ? 'open' : ''}" id="forgeSortDropdown">
                        ${sortOptionsHtml}
                    </div>
                </div>
                <div class="inv-filter-pills">
                    ${filterPillsHtml}
                </div>
            </div>
        `;
    }
    
    /**
     * v1.2.0: Render a stacked item option for the selection grid
     * Shows item name, tier badge, stat summary, equipped indicator, and stack count.
     * @param {Object} stack - Stack object from _stackItems()
     * @param {string} slotType - 'base' or 'sacrifice'
     * @returns {string} HTML string for the stacked item option
     */
    _renderStackOption(stack, slotType) {
        const item = stack.representative;
        const itemName = ItemUtils.getName(item);
        const itemColor = ItemUtils.getColor(item);
        const stats = ItemUtils.getStats(item);
        const statSummary = this._getStatSummary(stats);
        const tier = item.tier || 0;
        
        // Check if any item in the stack is equipped
        const equippedItem = this._getEquippedFromStack(stack);
        const hasEquipped = !!equippedItem;
        
        // Pick the best item ID to use when selecting:
        // Prefer a non-equipped item from the stack so we don't accidentally
        // sacrifice the player's equipped gear.
        const selectableItem = this._getSelectableFromStack(stack);
        const selectItemId = selectableItem ? selectableItem.id : item.id;
        
        return `
            <div class="forge-item-option" data-item-id="${selectItemId}" data-slot-type="${slotType}">
                <div style="width: 3px; align-self: stretch; min-height: 32px; border-radius: 2px; background: ${itemColor}; flex-shrink: 0;"></div>
                <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span class="forge-item-name" style="color: ${itemColor}; font-size: 0.8rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${itemName}</span>
                        ${tier > 0 ? `<span style="font-size: 0.65rem; color: var(--color-accent, #f59e0b); font-weight: 600; background: rgba(245, 158, 11, 0.12); padding: 1px 5px; border-radius: 3px; flex-shrink: 0;">+${tier}</span>` : ''}
                        ${hasEquipped ? `<span class="inv-equipped-badge">E</span>` : ''}
                    </div>
                    <span class="forge-item-stats" style="font-size: 0.7rem; color: var(--color-text-dim, #7a8599);">${statSummary}</span>
                </div>
                ${stack.count > 1 ? `<span style="display: flex; align-items: center; justify-content: center; min-width: 24px; height: 24px; padding: 0 6px; border-radius: 12px; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.3); color: var(--color-accent, #f59e0b); font-size: 0.72rem; font-weight: 600; flex-shrink: 0;">×${stack.count}</span>` : ''}
            </div>
        `;
    }
    
    /**
     * Render item option for selection grid (legacy, kept for compatibility)
     * @deprecated Use _renderStackOption instead
     */
    _renderItemOption(item, slotType) {
        const itemName = ItemUtils.getName(item);
        const itemColor = ItemUtils.getColor(item);
        const stats = ItemUtils.getStats(item);
        const statSummary = this._getStatSummary(stats);
        
        return `
            <div class="forge-item-option" data-item-id="${item.id}" data-slot-type="${slotType}">
                <span class="forge-item-name" style="color: ${itemColor}">${itemName}</span>
                <span class="forge-item-stats">${statSummary}</span>
            </div>
        `;
    }
    
    // ============================================
    // STACKING (v1.2.0)
    // ============================================
    
    /**
     * v1.2.0: Generate stacking key for an item.
     * Items with identical keys will be grouped together.
     * Matches InventoryUI stacking logic for consistency.
     * @param {Object} item - Item to generate key for
     * @returns {string} Stack key
     */
    _getStackKey(item) {
        const baseId = item.baseId || item.id || 'unknown';
        const materialId = item.materialId || 'none';
        const tier = item.tier || 0;
        const procId = item.procId || 'none';
        return `${baseId}|${materialId}|${tier}|${procId}`;
    }
    
    /**
     * v1.2.0: Group identical items into stacks.
     * @param {Array} items - Array of items to stack
     * @returns {Array} Array of stack objects { items, count, representative, stackKey }
     */
    _stackItems(items) {
        const stacks = new Map();
        
        for (const item of items) {
            const key = this._getStackKey(item);
            if (!stacks.has(key)) {
                stacks.set(key, {
                    stackKey: key,
                    items: [],
                    count: 0,
                    representative: item
                });
            }
            const stack = stacks.get(key);
            stack.items.push(item);
            stack.count++;
        }
        
        return Array.from(stacks.values());
    }
    
    /**
     * v1.2.0: Check if any item in a stack is equipped.
     * @param {Object} stack - Stack object from _stackItems()
     * @returns {Object|null} The equipped item, or null
     */
    _getEquippedFromStack(stack) {
        const equipment = this.character.equipment || {};
        for (const item of stack.items) {
            for (const slot of Object.keys(equipment)) {
                if (equipment[slot] && equipment[slot].id === item.id) {
                    return item;
                }
            }
        }
        return null;
    }
    
    /**
     * v1.2.0: Get the best item to select from a stack.
     * Prefers non-equipped items to avoid accidentally sacrificing equipped gear.
     * @param {Object} stack - Stack object from _stackItems()
     * @returns {Object} The item to use for selection
     */
    _getSelectableFromStack(stack) {
        const equipment = this.character.equipment || {};
        const equippedIds = new Set();
        for (const slot of Object.keys(equipment)) {
            if (equipment[slot]) {
                equippedIds.add(equipment[slot].id);
            }
        }
        
        // Prefer non-equipped item
        for (const item of stack.items) {
            if (!equippedIds.has(item.id)) {
                return item;
            }
        }
        
        // All equipped — return first
        return stack.items[0];
    }
    
    // ============================================
    // FILTERING (v1.2.0)
    // ============================================
    
    /**
     * v1.2.0: Filter items by gear category.
     * Uses ItemUtils.getSlot() and ItemUtils.getType() for consistent behavior
     * with InventoryUI filter logic.
     * @param {Array} items - Items to filter
     * @param {string} filter - Filter ID from FORGE_FILTER_OPTIONS
     * @returns {Array} Filtered items
     */
    _filterForgeItems(items, filter) {
        if (filter === 'all') return items;
        
        return items.filter(item => {
            const type = ItemUtils.getType(item);
            const slot = ItemUtils.getSlot(item);
            
            switch (filter) {
                case 'weapon':
                    return slot === 'mainHand' || (slot === 'offHand' && type === 'weapon');
                case 'shield':
                    return slot === 'offHand' && (type === 'shield' || type === 'armor' || type === 'offhand');
                case 'head':
                    return slot === 'head';
                case 'body':
                    return slot === 'body';
                case 'cape':
                    return slot === 'cape';
                case 'boots':
                    return slot === 'boots';
                case 'necklace':
                    return slot === 'necklace';
                case 'ring':
                    return ['ring', 'ring1', 'ring2'].includes(slot);
                default:
                    return true;
            }
        });
    }
    
    /**
     * v1.2.0: Get a user-friendly display name for the item's subtype.
     * Used in the material selection header: "Select material (same type — sword):"
     * @param {Object} item - Item to get subtype display for
     * @returns {string} Display-friendly subtype name
     */
    _getSubtypeDisplayName(item) {
        const subtype = this._getItemSubtype(item);
        if (!subtype) return '';
        // Capitalize first letter
        return subtype.charAt(0).toUpperCase() + subtype.slice(1);
    }
    
    /**
     * v1.2.1: Sort items by the selected sort criteria.
     * Mirrors InventoryUI._sortGearItems for consistency.
     * @param {Array} items - Items to sort
     * @param {string} sortBy - Sort ID from FORGE_SORT_OPTIONS
     * @returns {Array} Sorted items (new array)
     */
    _sortForgeItems(items, sortBy) {
        const sorted = [...items];
        
        switch (sortBy) {
            case 'type':
                // Sort by slot type (weapon, head, body, etc.)
                const slotOrder = ['mainHand', 'offHand', 'head', 'body', 'cape', 'boots', 'necklace', 'ring', 'ring1', 'ring2'];
                sorted.sort((a, b) => {
                    const aSlot = ItemUtils.getSlot(a) || '';
                    const bSlot = ItemUtils.getSlot(b) || '';
                    const aIdx = slotOrder.indexOf(aSlot);
                    const bIdx = slotOrder.indexOf(bSlot);
                    return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
                });
                break;
                
            case 'tier':
                // Sort by combined material tier + upgrade tier (highest first)
                sorted.sort((a, b) => {
                    const aTier = (typeof ItemUtils.getMaterialTier === 'function' ? ItemUtils.getMaterialTier(a) : 0) + (a.tier || 0);
                    const bTier = (typeof ItemUtils.getMaterialTier === 'function' ? ItemUtils.getMaterialTier(b) : 0) + (b.tier || 0);
                    return bTier - aTier;
                });
                break;
                
            case 'recent':
                // Reverse order (newest items at end of inventory appear first)
                sorted.reverse();
                break;
        }
        
        return sorted;
    }
    
    // ============================================
    // DATA HELPERS
    // ============================================
    
    /**
     * Get items that can be upgraded (equipment, not at max tier)
     */
    _getUpgradeableItems() {
        const inventory = this.character.inventory || [];
        const upgradeConfig = typeof getUpgradeConfig === 'function' ? getUpgradeConfig() : { maxTier: 10 };
        const maxTier = upgradeConfig?.maxTier || 10;
        
        return inventory.filter(item => {
            // v1.2.2: Exclude consumed items
            if (this._consumedItemIds.has(item.id)) return false;
            
            const type = ItemUtils.getType(item);
            const validTypes = ['weapon', 'armor', 'accessory', 'shield', 'offhand'];
            const tier = item.tier || 0;
            return validTypes.includes(type) && tier < maxTier;
        });
    }
    
    /**
     * Get items compatible as material for the base item
     * Rule: Items must have the SAME SUBTYPE (sword+sword, cap+cap, boots+boots)
     * v1.2.0: Also verifies items still exist in live inventory (prevents ghost items)
     */
    _getCompatibleMaterials(baseItem) {
        if (!baseItem) return [];
        
        const inventory = this.character.inventory || [];
        const baseSubtype = this._getItemSubtype(baseItem);
        
        if (!baseSubtype) {
            return [];
        }
        
        return inventory.filter(item => {
            // Can't use the same item
            if (item.id === baseItem.id) return false;
            
            // v1.2.2: Exclude items that were consumed as sacrifices
            if (this._consumedItemIds.has(item.id)) return false;
            
            // Must be gear/equipment type
            const itemType = ItemUtils.getType(item);
            const validTypes = ['weapon', 'armor', 'accessory', 'shield', 'offhand', 'gear'];
            if (!validTypes.includes(itemType)) return false;
            
            // Simple rule: subtypes must match exactly
            const itemSubtype = this._getItemSubtype(item);
            return baseSubtype === itemSubtype;
        });
    }
    
    /**
     * Get the subtype of an item
     */
    _getItemSubtype(item) {
        if (!item) return null;
        
        // Use explicit subtype if set
        if (item.subtype) return item.subtype;
        
        // Fallback: extract from baseId
        if (item.baseId) {
            return this._extractSubtypeFromBaseId(item.baseId);
        }
        
        return null;
    }
    
    /**
     * Extract subtype from baseId
     * e.g., "leather_boots" -> "boots", "iron_sword" -> "sword"
     */
    _extractSubtypeFromBaseId(baseId) {
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
     * Get stat summary string
     */
    _getStatSummary(stats) {
        if (!stats) return '';
        const parts = [];
        if (stats.attack) parts.push(`+${stats.attack} ATK`);
        if (stats.defense) parts.push(`+${stats.defense} DEF`);
        if (stats.health) parts.push(`+${stats.health} HP`);
        if (stats.mana) parts.push(`+${stats.mana} MP`);
        return parts.slice(0, 2).join(', ') || 'No stats';
    }
    
    /**
     * Get user-friendly message for forge result
     */
    _getResultMessage(outcome, item) {
        // Get base item name without tier/material for cleaner messages
        const baseData = item?.baseId ? getItem(item.baseId) : null;
        const baseName = baseData?.name || 'item';
        const fullName = item ? ItemUtils.getName(item) : 'your item';
        
        switch (outcome) {
            case 'success':
                const tier = item?.tier || 1;
                return `The forge burns bright! Your ${baseName} is now +${tier}!`;
            case 'failure':
                return `The materials resist the forge. ${fullName} remains unchanged.`;
            case 'destruction':
                return `The forge consumes your item in a flash of flame. It is lost forever.`;
            default:
                return 'Something went wrong at the forge.';
        }
    }
    
    /**
     * Update character reference (after external changes)
     */
    updateCharacter(character) {
        this.character = character;
        
        // Validate selected items still exist in inventory OR equipment
        if (this._baseItem) {
            const inInventory = character.inventory?.find(i => i.id === this._baseItem.id);
            const inEquipment = Object.values(character.equipment || {}).find(i => i?.id === this._baseItem.id);
            if (!inInventory && !inEquipment) {
                this._baseItem = null;
            } else if (inInventory) {
                // v1.2.0: Refresh reference to ensure we have the live object
                this._baseItem = inInventory;
            }
        }
        if (this._sacrificeItem) {
            const inInventory = character.inventory?.find(i => i.id === this._sacrificeItem.id);
            const inEquipment = Object.values(character.equipment || {}).find(i => i?.id === this._sacrificeItem.id);
            if (!inInventory && !inEquipment) this._sacrificeItem = null;
        }
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        this._baseItem = null;
        this._sacrificeItem = null;
        this._consumedItemIds.clear();
        this._filterBy = 'all';
        this._sortBy = 'type';
        this._sortDropdownOpen = false;
        this.container = null;
        this.character = null;
        this.callbacks = null;
    }
}

export default ForgeUI;
