/**
 * @file ShopUI.js
 * @description Shop UI component for buying and selling items.
 *              Provides tabbed interface for browsing shop inventory and player items.
 *              Extracted from TownScreen.js for modularity.
 * 
 * @location ui/ShopUI.js
 * @usage Instantiated by TownScreen when player opens a shop
 * @dependencies 
 *   - shopConfig.js - getShop, calculateBuyPrice, calculateSellPrice
 *   - itemConfig.js - getItem
 *   - Item.js - createItem
 *   - ItemUtils (utils/ItemUtils.js) - Item property access
 * 
 * @version 1.3.0
 * @changelog
 *   - v1.3.0 (2026-03-06): Added filter pills and sort dropdown to Buy tab, matching
 *                          InventoryUI gear tab (All/Weapon/Shield/Head/Body/Cape/Boots/
 *                          Neck/Ring/Potion filters; Type/Tier/Price sort). Added Power
 *                          sort to Sell tab (sorts upgrades before downgrades vs equipped).
 *                          New state: _buyFilter, _buySort, _buySortDropdownOpen.
 *                          New methods: _buildBuyToolbar(), _filterBuyItems(),
 *                          _sortBuyItems(), _refreshBuyPanel(), _getEquippedForSlot().
 *   - v1.2.1 (2026-02-10): Fixed sell tab scrolling to top after selling an item.
 *                          _handleSell() now uses targeted _refreshSellPanel() + 
 *                          _updateGoldDisplay() instead of full onRefresh callback.
 *                          _refreshSellPanel() preserves .shop-items-list scroll position.
 *   - v1.2.0 (2026-02-10): Added sell tab filter pills (All, Weapon, Shield, Head, Body,
 *                          Cape, Boots, Neck, Ring, Potions), sort dropdown (Value, Type,
 *                          Tier, Recent), and item stacking. Sell items now display stack
 *                          counts, per-unit sell price, and total value. Sell button sells
 *                          one item from each stack. Ported stacking/filter logic from
 *                          InventoryUI for consistency. Added _refreshSellPanel() for
 *                          partial re-render on filter/sort change with scroll preservation.
 *   - v1.1.0 (2026-02-08): Added "Other" tab for purchasing aether and housing materials.
 *                          New _buildResourceItems(), _handleBuyResource() methods.
 *                          Resources bypass Item model and go directly to character properties.
 *   - v1.0.0 (2025-01-21): Initial implementation - extracted from TownScreen.js v2.3.0
 */

import { getShop, calculateBuyPrice, calculateSellPrice, getShopResources } from '../config/shopConfig.js';
import { getItem } from '../config/itemConfig.js';
import { createItem } from '../models/Item.js';
import { ItemUtils } from '../utils/ItemUtils.js';

// ============================================
// SELL TAB CONSTANTS
// ============================================

/**
 * Slot config for gear detection (mirrors InventoryUI)
 */
const SLOT_CONFIG = {
    head: { label: 'HEAD', order: 0 },
    necklace: { label: 'NECK', order: 1 },
    body: { label: 'BODY', order: 2 },
    cape: { label: 'CAPE', order: 3 },
    mainHand: { label: 'MAIN', order: 4 },
    offHand: { label: 'OFF', order: 5 },
    ring: { label: 'RING', order: 6 },
    ring1: { label: 'RING', order: 6 },
    ring2: { label: 'RING', order: 7 },
    boots: { label: 'BOOTS', order: 8 }
};

/**
 * Buy tab filter options (mirrors InventoryUI GEAR_FILTER_OPTIONS + Potion)
 */
const BUY_FILTER_OPTIONS = [
    { id: 'all',      label: 'All',    icon: ''   },
    { id: 'weapon',   label: 'Weapon', icon: '⚔️'  },
    { id: 'shield',   label: 'Shield', icon: '🛡️'  },
    { id: 'head',     label: 'Head',   icon: '🪖'  },
    { id: 'body',     label: 'Body',   icon: '👕'  },
    { id: 'cape',     label: 'Cape',   icon: '🧣'  },
    { id: 'boots',    label: 'Boots',  icon: '👢'  },
    { id: 'necklace', label: 'Neck',   icon: '📿'  },
    { id: 'ring',     label: 'Ring',   icon: '💍'  },
    { id: 'potion',   label: 'Potion', icon: '🧪'  }
];

/**
 * Buy tab sort options
 */
const BUY_SORT_OPTIONS = [
    { id: 'type',  label: 'Type',  icon: '📦' },
    { id: 'tier',  label: 'Tier',  icon: '💎' },
    { id: 'price', label: 'Price', icon: '💰' }
];

/**
 * Sell tab filter options
 */
const SELL_FILTER_OPTIONS = [
    { id: 'all', label: 'All', icon: '' },
    { id: 'weapon', label: 'Weapon', icon: '⚔️' },
    { id: 'shield', label: 'Shield', icon: '🛡️' },
    { id: 'head', label: 'Head', icon: '🪖' },
    { id: 'body', label: 'Body', icon: '👕' },
    { id: 'cape', label: 'Cape', icon: '🧣' },
    { id: 'boots', label: 'Boots', icon: '👢' },
    { id: 'necklace', label: 'Neck', icon: '📿' },
    { id: 'ring', label: 'Ring', icon: '💍' },
    { id: 'potion', label: 'Potions', icon: '🧪' }
];

/**
 * Sell tab sort options
 */
const SELL_SORT_OPTIONS = [
    { id: 'power',  label: 'Power',  icon: '⚡' },
    { id: 'value',  label: 'Value',  icon: '💰' },
    { id: 'type',   label: 'Type',   icon: '📦' },
    { id: 'tier',   label: 'Tier',   icon: '💎' },
    { id: 'recent', label: 'Recent', icon: '🕐' }
];


export class ShopUI {
    /**
     * Create a ShopUI instance
     * @param {HTMLElement} container - Parent container for the shop panel content
     * @param {Object} character - Player character object
     * @param {Object} callbacks - Callback functions
     * @param {Function} callbacks.onRefresh - Called when shop panel should refresh
     * @param {Function} callbacks.onSave - Called when game should be saved
     * @param {Function} callbacks.onBuyReaction - Called with NPC reaction after purchase
     * @param {Function} callbacks.onSellReaction - Called with NPC reaction after sale
     */
    constructor(container, character, callbacks = {}) {
        this.container = container;
        this.character = character;
        this.callbacks = callbacks;
        
        // Shop state
        this._currentTab = 'buy';
        this._shopId = 'town';

        // Buy tab filter/sort state (v1.3.0)
        this._buyFilter = 'all';
        this._buySort = 'type';
        this._buySortDropdownOpen = false;

        // Sell tab filter/sort state (v1.2.0)
        this._sellFilter = 'all';
        this._sellSort = 'value';
        this._sellSortDropdownOpen = false;
        
        // Bind methods
        this._handleBuy = this._handleBuy.bind(this);
        this._handleSell = this._handleSell.bind(this);
        this._handleBuyResource = this._handleBuyResource.bind(this);
        this._handleTabSwitch = this._handleTabSwitch.bind(this);
    }
    
    /**
     * Get the current shop state
     * @returns {Object} Current tab and shop ID
     */
    getState() {
        return {
            currentTab: this._currentTab,
            shopId: this._shopId,
            buyFilter: this._buyFilter,
            buySort: this._buySort,
            sellFilter: this._sellFilter,
            sellSort: this._sellSort
        };
    }
    
    /**
     * Set shop state
     * @param {Object} state - State object with currentTab and shopId
     */
    setState(state) {
        if (state) {
            this._currentTab = state.currentTab || 'buy';
            this._shopId = state.shopId || 'town';
            this._buyFilter = state.buyFilter || 'all';
            this._buySort = state.buySort || 'type';
            this._sellFilter = state.sellFilter || 'all';
            this._sellSort = state.sellSort || 'value';
        }
    }
    
    /**
     * Set the active shop
     * @param {string} shopId - Shop identifier
     */
    setShop(shopId) {
        this._shopId = shopId || 'town';
    }
    
    /**
     * Set the active tab
     * @param {string} tab - 'buy' or 'sell'
     */
    setTab(tab) {
        this._currentTab = ['buy', 'sell', 'other'].includes(tab) ? tab : 'buy';
    }
    
    /**
     * Check if shop is available
     * @returns {boolean} True if shop exists
     */
    isAvailable() {
        return !!getShop(this._shopId);
    }
    
    /**
     * Build and return the shop panel HTML content
     * @param {string} title - Panel title (e.g., NPC name)
     * @returns {string} HTML content for the shop panel
     */
    buildContent(title = '🏪 Shop') {
        const shop = getShop(this._shopId);
        
        if (!shop) {
            return `
                <div class="shop-view panel-shop">
                    <p class="shop-unavailable">Shop unavailable</p>
                </div>
            `;
        }
        
        const playerGold = this.character.gold || 0;
        
        // Build buy inventory
        const buyItemsHtml = this._buildBuyItems(shop);
        
        // Build sell inventory (with filters, sorting, stacking)
        const sellItemsHtml = this._buildSellItems();
        
        // Build resource inventory (aether, materials)
        const resourceItemsHtml = this._buildResourceItems(shop);
        
        return `
            <div class="shop-view panel-shop">
                <div class="shop-gold-display">
                    <span class="gold-icon">💰</span>
                    <span class="gold-amount">${playerGold.toLocaleString()}</span>
                    <span class="gold-label">Gold</span>
                </div>
                
                <div class="shop-tabs">
                    <button class="shop-tab ${this._currentTab === 'buy' ? 'active' : ''}" data-tab="buy">Buy</button>
                    <button class="shop-tab ${this._currentTab === 'sell' ? 'active' : ''}" data-tab="sell">Sell</button>
                    <button class="shop-tab ${this._currentTab === 'other' ? 'active' : ''}" data-tab="other">Other</button>
                </div>
                
                <div class="shop-content">
                    <div class="shop-panel ${this._currentTab === 'buy' ? 'active' : ''}" id="shopBuyPanel">
                        <div class="shop-items-list">
                            ${buyItemsHtml}
                        </div>
                    </div>
                    <div class="shop-panel ${this._currentTab === 'sell' ? 'active' : ''}" id="shopSellPanel">
                        ${sellItemsHtml}
                    </div>
                    <div class="shop-panel ${this._currentTab === 'other' ? 'active' : ''}" id="shopOtherPanel">
                        <div class="shop-items-list">
                            ${resourceItemsHtml}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Setup event handlers for the shop panel
     * Call this after inserting content into DOM
     */
    setupHandlers() {
        // Tab switching
        const tabs = this.container.querySelectorAll('.panel-shop .shop-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this._handleTabSwitch(tab.dataset.tab);
            });
        });
        
        // Buy buttons
        const buyBtns = this.container.querySelectorAll('.panel-shop .btn-buy:not(.disabled)');
        buyBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const shopIndex = parseInt(btn.dataset.shopIndex);
                this._handleBuy(shopIndex);
            });
        });

        // v1.3.0: Buy filter pills
        this.container.querySelectorAll('.panel-shop .buy-filter-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                const filterId = pill.dataset.buyFilter;
                if (filterId && filterId !== this._buyFilter) {
                    this._buyFilter = filterId;
                    this._refreshBuyPanel();
                }
            });
        });

        // v1.3.0: Buy sort button
        const buySortBtn = this.container.querySelector('#buySortBtn');
        if (buySortBtn) {
            buySortBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._buySortDropdownOpen = !this._buySortDropdownOpen;
                const dd = this.container.querySelector('#buySortDropdown');
                if (dd) dd.classList.toggle('open', this._buySortDropdownOpen);
            });
        }

        // v1.3.0: Buy sort options
        this.container.querySelectorAll('.panel-shop .buy-sort-option').forEach(opt => {
            opt.addEventListener('click', () => {
                const sortId = opt.dataset.buySort;
                if (sortId && sortId !== this._buySort) {
                    this._buySort = sortId;
                    this._buySortDropdownOpen = false;
                    this._refreshBuyPanel();
                }
            });
        });
        
        // Sell buttons (now on stacked items, sells one from stack)
        const sellBtns = this.container.querySelectorAll('.panel-shop .btn-sell');
        sellBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const itemId = btn.dataset.itemId;
                this._handleSell(itemId);
            });
        });
        
        // Resource buy buttons (aether, materials)
        const resourceBtns = this.container.querySelectorAll('.panel-shop .btn-buy-resource');
        resourceBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const resourceIndex = parseInt(btn.dataset.resourceIndex);
                const quantity = parseInt(btn.dataset.quantity) || 1;
                this._handleBuyResource(resourceIndex, quantity);
            });
        });
        
        // v1.2.0: Sell filter pills
        this.container.querySelectorAll('.panel-shop .sell-filter-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                const filterId = pill.dataset.sellFilter;
                if (filterId && filterId !== this._sellFilter) {
                    this._sellFilter = filterId;
                    this._refreshSellPanel();
                }
            });
        });
        
        // v1.2.0: Sell sort button
        const sellSortBtn = this.container.querySelector('#sellSortBtn');
        if (sellSortBtn) {
            sellSortBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._sellSortDropdownOpen = !this._sellSortDropdownOpen;
                const dropdown = this.container.querySelector('#sellSortDropdown');
                if (dropdown) {
                    dropdown.classList.toggle('open', this._sellSortDropdownOpen);
                }
            });
        }
        
        // v1.2.0: Sell sort options
        this.container.querySelectorAll('.sell-sort-option').forEach(opt => {
            opt.addEventListener('click', () => {
                const sortId = opt.dataset.sort;
                if (sortId && sortId !== this._sellSort) {
                    this._sellSort = sortId;
                    this._sellSortDropdownOpen = false;
                    this._refreshSellPanel();
                }
            });
        });
        
        // v1.2.0: Close sell sort dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (this._sellSortDropdownOpen) {
                const dropdown = this.container?.querySelector('#sellSortDropdown');
                const sortBtn = this.container?.querySelector('#sellSortBtn');
                if (dropdown && sortBtn && !dropdown.contains(e.target) && !sortBtn.contains(e.target)) {
                    this._sellSortDropdownOpen = false;
                    dropdown.classList.remove('open');
                }
            }
        }, { once: false });
    }
    
    // ============================================
    // INTERNAL HANDLERS
    // ============================================
    
    /**
     * Handle tab switch
     */
    _handleTabSwitch(tab) {
        this._currentTab = tab;
        
        if (this.callbacks.onRefresh) {
            this.callbacks.onRefresh();
        }
    }
    
    /**
     * Handle buying an item
     */
    _handleBuy(shopIndex) {
        const shop = getShop(this._shopId);
        if (!shop || !shop.inventory[shopIndex]) return;
        
        const shopItem = shop.inventory[shopIndex];
        const baseItem = getItem(shopItem.baseId);
        
        if (!baseItem) return;
        
        // Create the item
        let newItem;
        if (baseItem.type === 'consumable' || baseItem.type === 'potion') {
            newItem = { 
                id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                baseId: shopItem.baseId,
                quantity: 1,
                ...baseItem
            };
        } else {
            newItem = createItem(shopItem.baseId, shopItem.materialId || 'iron', 'none', 0);
        }
        
        const price = calculateBuyPrice(newItem);
        
        // Attempt purchase
        const result = this.character.buyItem(newItem, price);
        
        if (result.success) {
            // Save game
            if (this.callbacks.onSave) {
                this.callbacks.onSave();
            }
            
            // Notify for NPC reaction
            if (this.callbacks.onBuyReaction) {
                this.callbacks.onBuyReaction(newItem, price);
            }
            
            // Refresh panel
            if (this.callbacks.onRefresh) {
                this.callbacks.onRefresh();
            }
        }
        
        return result;
    }
    
    /**
     * Handle selling an item
     */
    _handleSell(itemId) {
        const item = this.character.inventory.find(i => i.id === itemId);
        if (!item) return { success: false };
        
        const itemName = ItemUtils.getName(item);
        const sellPrice = this.character.getSellValue ? this.character.getSellValue(item) : 0;
        
        // Attempt sale
        const result = this.character.sellItem(itemId);
        
        if (result.success) {
            // Save game
            if (this.callbacks.onSave) {
                this.callbacks.onSave();
            }
            
            // Notify for NPC reaction
            if (this.callbacks.onSellReaction) {
                this.callbacks.onSellReaction(item, sellPrice, itemName);
            }
            
            // Targeted refresh: update gold + sell panel only (preserves scroll)
            this._updateGoldDisplay();
            this._refreshSellPanel();
        }
        
        return result;
    }
    
    /**
     * Handle buying a resource (aether or housing material)
     * Resources bypass the Item model and go directly to character properties.
     * @param {number} resourceIndex - Index in shop resources array
     * @param {number} quantity - Number of units to buy
     */
    _handleBuyResource(resourceIndex, quantity = 1) {
        const resources = getShopResources(this._shopId);
        if (!resources || !resources[resourceIndex]) return;
        
        const resource = resources[resourceIndex];
        const totalCost = resource.price * quantity;
        
        // Check gold
        if ((this.character.gold || 0) < totalCost) return;
        
        // Deduct gold
        this.character.gold -= totalCost;
        
        // Add resource to character
        if (resource.type === 'aether') {
            if (this.character.addAether) {
                this.character.addAether(quantity);
            } else {
                this.character.aether = (this.character.aether || 0) + quantity;
            }
        } else if (resource.type === 'material') {
            if (this.character.addMaterial) {
                this.character.addMaterial(resource.id, quantity);
            } else {
                this.character.materials = this.character.materials || {};
                this.character.materials[resource.id] = (this.character.materials[resource.id] || 0) + quantity;
            }
        }
        
        // Save game
        if (this.callbacks.onSave) {
            this.callbacks.onSave();
        }
        
        // Notify for NPC reaction
        if (this.callbacks.onBuyReaction) {
            this.callbacks.onBuyReaction({ name: `${resource.icon} ${resource.name} x${quantity}` }, totalCost);
        }
        
        // Refresh panel
        if (this.callbacks.onRefresh) {
            this.callbacks.onRefresh();
        }
    }
    
    /**
     * Refresh only the sell panel content (partial re-render for filter/sort changes)
     * Preserves scroll position.
     */
    _refreshSellPanel() {
        const sellPanel = this.container.querySelector('#shopSellPanel');
        if (!sellPanel) return;
        
        const itemsList = sellPanel.querySelector('.shop-items-list');
        const savedScroll = itemsList ? itemsList.scrollTop : sellPanel.scrollTop;
        sellPanel.innerHTML = this._buildSellItems();
        this.setupHandlers();
        const newItemsList = sellPanel.querySelector('.shop-items-list');
        if (newItemsList) {
            newItemsList.scrollTop = savedScroll;
        } else {
            sellPanel.scrollTop = savedScroll;
        }
    }
    
    /**
     * Update only the gold display without rebuilding the whole panel (v1.2.1)
     */
    _updateGoldDisplay() {
        const goldAmount = this.container.querySelector('.panel-shop .gold-amount');
        if (goldAmount) {
            goldAmount.textContent = (this.character.gold || 0).toLocaleString();
        }
    }
    
    // ============================================
    // ITEM STACKING & CATEGORIZATION (v1.2.0)
    // ============================================
    
    /**
     * Generate stacking key for an item.
     * Items with identical keys will be stacked together.
     * Mirrors InventoryUI._getStackKey() for consistency.
     */
    _getStackKey(item) {
        const baseId = item.baseId || item.id || 'unknown';
        const materialId = item.materialId || 'none';
        const tier = item.tier || 0;
        const procId = item.procId || 'none';
        return `${baseId}|${materialId}|${tier}|${procId}`;
    }
    
    /**
     * Stack identical items together.
     * Returns array of { items: Item[], stackKey: string, count: number, representative: Item }
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
     * Check if item is gear (equippable)
     */
    _isGearItem(item) {
        const slot = ItemUtils.getSlot(item);
        return slot && SLOT_CONFIG[slot] !== undefined;
    }
    
    /**
     * Check if item is a potion/consumable
     */
    _isPotionItem(item) {
        const type = ItemUtils.getType(item);
        return type === 'potion' || type === 'consumable';
    }
    
    // ============================================
    // SELL TAB FILTERING & SORTING (v1.2.0)
    // ============================================
    
    /**
     * Filter sell items by category
     */
    _filterSellItems(items, filter) {
        if (filter === 'all') return items;
        
        if (filter === 'potion') {
            return items.filter(item => this._isPotionItem(item));
        }
        
        // Gear slot filters
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
     * Sort sell items based on selected criteria
     */
    _sortSellItems(items, sortBy) {
        const sorted = [...items];
        
        switch (sortBy) {
            case 'power': {
                // Sort upgrades first (items worse than equipped → safe to sell)
                // order: upgrade=0, new-slot=1, same=2, downgrade=3
                const upgradeOrder = { upgrade: 0, 'new-slot': 1, same: 2, downgrade: 3 };
                sorted.sort((a, b) => {
                    const aEquipped = this._getEquippedForSlot(a);
                    const bEquipped = this._getEquippedForSlot(b);
                    const aOrder = aEquipped ? upgradeOrder[this._compareItemPower(a, aEquipped)] ?? 99 : 1;
                    const bOrder = bEquipped ? upgradeOrder[this._compareItemPower(b, bEquipped)] ?? 99 : 1;
                    return aOrder - bOrder;
                });
                break;
            }

            case 'value':
                sorted.sort((a, b) => {
                    const aValue = this.character.getSellValue ? this.character.getSellValue(a) : 0;
                    const bValue = this.character.getSellValue ? this.character.getSellValue(b) : 0;
                    return bValue - aValue;
                });
                break;
                
            case 'type': {
                const slotOrder = Object.keys(SLOT_CONFIG);
                sorted.sort((a, b) => {
                    // Potions after gear
                    const aIsPotion = this._isPotionItem(a);
                    const bIsPotion = this._isPotionItem(b);
                    if (aIsPotion !== bIsPotion) return aIsPotion ? 1 : -1;
                    
                    const aSlot = ItemUtils.getSlot(a) || '';
                    const bSlot = ItemUtils.getSlot(b) || ''
                    const aIdx = slotOrder.indexOf(aSlot);
                    const bIdx = slotOrder.indexOf(bSlot);
                    return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
                });
                break;
            }
                
            case 'tier':
                sorted.sort((a, b) => {
                    const aTier = (ItemUtils.getMaterialTier(a) || 0) + (ItemUtils.getTier(a) || 0);
                    const bTier = (ItemUtils.getMaterialTier(b) || 0) + (ItemUtils.getTier(b) || 0);
                    return bTier - aTier;
                });
                break;
                
            case 'recent':
                sorted.reverse();
                break;
        }
        
        return sorted;
    }

    /**
     * Get the currently equipped item for the same slot as a given item (v1.3.0)
     */
    _getEquippedForSlot(item) {
        const equipment = this.character.equipment || {};
        const slot = ItemUtils.getSlot(item);
        if (!slot) return null;
        // Try direct slot, then ring1/ring2 fallback
        return equipment[slot] || equipment[slot + '1'] || equipment[slot + '2'] || null;
    }

    /**
     * Compare primary stat of bagItem vs equippedItem (v1.3.0)
     * Returns 'upgrade' | 'downgrade' | 'same' | 'new-slot'
     */
    _compareItemPower(bagItem, equippedItem) {
        if (!equippedItem) return 'new-slot';
        const bagStats   = ItemUtils.getStats(bagItem)   || {};
        const equipStats = ItemUtils.getStats(equippedItem) || {};
        // Sum all positive numeric stats as a proxy for power
        const sum = obj => Object.values(obj).reduce((t, v) => t + (typeof v === 'number' && v > 0 ? v : 0), 0);
        const bagPower  = sum(bagStats);
        const equipPower = sum(equipStats);
        if (bagPower > equipPower)  return 'upgrade';
        if (bagPower < equipPower)  return 'downgrade';
        return 'same';
    }


    
    // ============================================
    // RENDER HELPERS
    // ============================================
    
    /**
     * Build resource items HTML (aether, housing materials)
     * Shows current stock, price per unit, and bulk buy buttons
     */
    _buildResourceItems(shop) {
        const resources = shop?.resources || [];
        
        if (resources.length === 0) {
            return '<p class="empty-buy">No resources for sale</p>';
        }
        
        const playerGold = this.character.gold || 0;
        const playerAether = this.character.aether || 0;
        const playerMaterials = this.character.materials || {};
        
        let lastTier = null;
        
        return resources.map((resource, index) => {
            let tierHeader = '';
            
            // Add tier headers for materials
            if (resource.type === 'material' && resource.tier !== lastTier) {
                lastTier = resource.tier;
                const tierNames = { 1: 'Common', 2: 'Uncommon', 3: 'Rare', 4: 'Epic', 5: 'Legendary', 6: 'Mythic' };
                tierHeader = `<div class="resource-tier-header">── ${tierNames[resource.tier] || `Tier ${resource.tier}`} ──</div>`;
            } else if (resource.type === 'aether') {
                tierHeader = '';
                lastTier = null;
            }
            
            // Get current player stock
            let currentStock = 0;
            if (resource.type === 'aether') {
                currentStock = playerAether;
            } else if (resource.type === 'material') {
                currentStock = playerMaterials[resource.id] || 0;
            }
            
            // Build buy buttons for each quantity
            const quantities = [1, 10, 100];
            const buttonsHtml = quantities.map(qty => {
                const cost = resource.price * qty;
                const canAfford = playerGold >= cost;
                return `
                    <button class="btn-buy-resource ${!canAfford ? 'disabled' : ''}" 
                            data-resource-index="${index}"
                            data-quantity="${qty}"
                            ${!canAfford ? 'disabled' : ''}>
                        ${qty}
                    </button>
                `;
            }).join('');
            
            return `
                ${tierHeader}
                <div class="shop-item resource-item" data-resource-index="${index}">
                    <div class="shop-item-info">
                        <span class="resource-icon">${resource.icon}</span>
                        <span class="shop-item-name">${resource.name}</span>
                        <span class="resource-stock">(${currentStock.toLocaleString()})</span>
                    </div>
                    <div class="resource-buy-actions">
                        <span class="resource-unit-price">💰${resource.price}/ea</span>
                        ${buttonsHtml}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    /**
     * Build buy items HTML
     */
    /**
     * Build buy items HTML with filter toolbar and sorting (v1.3.0)
     */
    _buildBuyItems(shop) {
        if (!shop || !shop.inventory || shop.inventory.length === 0) {
            return '<p class="empty-buy">No items for sale</p>';
        }

        const playerGold = this.character.gold || 0;

        // Build full item list with metadata for filtering/sorting
        const allItems = shop.inventory.map((shopItem, index) => {
            const baseItem = getItem(shopItem.baseId);
            if (!baseItem) return null;
            // Always use createItem so displayed price matches _handleBuy purchase price
            const tempItem = createItem(shopItem.baseId, shopItem.materialId || 'iron', 'none', 0);
            const price = calculateBuyPrice(tempItem);
            return { shopItem, baseItem, tempItem, price, index };
        }).filter(Boolean);

        // Apply filter
        const filtered = this._filterBuyItems(allItems, this._buyFilter);

        // Apply sort
        const sorted = this._sortBuyItems(filtered, this._buySort);

        const countText = `${filtered.length} item${filtered.length !== 1 ? 's' : ''}`;

        const itemsHtml = sorted.length > 0
            ? sorted.map(({ shopItem, baseItem, tempItem, price, index }) => {
                const canAfford = playerGold >= price;
                const itemColor = tempItem.color || 'inherit';
                const itemName = tempItem.name || baseItem.name;
                const slotLabel = baseItem.slot || baseItem.type || '';
                return `
                    <div class="shop-item ${!canAfford ? 'cannot-afford' : ''}" data-shop-index="${index}">
                        <div class="shop-item-info">
                            <span class="shop-item-name" style="color: ${itemColor}">${itemName}</span>
                            <span class="shop-item-type">${slotLabel}</span>
                        </div>
                        <div class="shop-item-price">
                            <span class="price-amount ${!canAfford ? 'too-expensive' : ''}">💰 ${price.toLocaleString()}</span>
                            <button class="btn-buy ${!canAfford ? 'disabled' : ''}"
                                    data-shop-index="${index}"
                                    ${!canAfford ? 'disabled' : ''}>
                                Buy
                            </button>
                        </div>
                    </div>
                `;
            }).join('')
            : '<p class="empty-buy">No items match filter</p>';

        return `
            <div class="buy-toolbar">${this._buildBuyToolbar()}</div>
            <div class="shop-buy-count">${countText}</div>
            <div class="shop-items-list">
                ${itemsHtml}
            </div>
        `;
    }

    /**
     * Build the buy tab toolbar (sort dropdown + filter pills) (v1.3.0)
     */
    _buildBuyToolbar() {
        const currentSort = BUY_SORT_OPTIONS.find(s => s.id === this._buySort) || BUY_SORT_OPTIONS[0];

        const sortOptionsHtml = BUY_SORT_OPTIONS.map(opt => `
            <div class="buy-sort-option ${opt.id === this._buySort ? 'active' : ''}" data-buy-sort="${opt.id}">
                ${opt.icon} ${opt.label}
            </div>
        `).join('');

        const filterPillsHtml = BUY_FILTER_OPTIONS.map(opt => `
            <button class="buy-filter-pill ${opt.id === this._buyFilter ? 'active' : ''}" data-buy-filter="${opt.id}">
                ${opt.icon ? opt.icon + ' ' : ''}${opt.label}
            </button>
        `).join('');

        return `
            <div class="shop-toolbar">
                <div class="shop-sort-container">
                    <button class="shop-sort-btn" id="buySortBtn">
                        <span class="shop-sort-icon">↕️</span>
                        <span class="shop-sort-label">${currentSort.label}</span>
                        <span class="shop-sort-arrow">▼</span>
                    </button>
                    <div class="shop-sort-dropdown ${this._buySortDropdownOpen ? 'open' : ''}" id="buySortDropdown">
                        ${sortOptionsHtml}
                    </div>
                </div>
                <div class="shop-filter-pills">
                    ${filterPillsHtml}
                </div>
            </div>
        `;
    }

    /**
     * Filter buy items by category (v1.3.0)
     */
    _filterBuyItems(items, filter) {
        if (filter === 'all') return items;

        return items.filter(({ baseItem, tempItem }) => {
            const slot = baseItem.slot || '';
            const type = baseItem.type || '';

            switch (filter) {
                case 'weapon':
                    return slot === 'mainHand' || (slot === 'offHand' && type === 'weapon');
                case 'shield':
                    return slot === 'offHand' && (type === 'shield' || type === 'armor' || type === 'offhand');
                case 'head':     return slot === 'head';
                case 'body':     return slot === 'body';
                case 'cape':     return slot === 'cape';
                case 'boots':    return slot === 'boots';
                case 'necklace': return slot === 'necklace';
                case 'ring':     return ['ring', 'ring1', 'ring2'].includes(slot);
                case 'potion':   return type === 'potion' || type === 'consumable';
                default:         return true;
            }
        });
    }

    /**
     * Sort buy items by selected criteria (v1.3.0)
     */
    _sortBuyItems(items, sortBy) {
        const sorted = [...items];
        const slotOrder = Object.keys(SLOT_CONFIG);

        switch (sortBy) {
            case 'type':
                sorted.sort((a, b) => {
                    const aSlot = a.baseItem.slot || '';
                    const bSlot = b.baseItem.slot || '';
                    const aIdx = slotOrder.indexOf(aSlot);
                    const bIdx = slotOrder.indexOf(bSlot);
                    return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
                });
                break;
            case 'tier':
                sorted.sort((a, b) => {
                    const aTier = (ItemUtils.getMaterialTier(a.tempItem) || 0);
                    const bTier = (ItemUtils.getMaterialTier(b.tempItem) || 0);
                    return bTier - aTier;
                });
                break;
            case 'price':
                sorted.sort((a, b) => a.price - b.price);
                break;
        }

        return sorted;
    }

    /**
     * Refresh only the buy panel (preserves scroll position) (v1.3.0)
     */
    _refreshBuyPanel() {
        const buyPanel = this.container.querySelector('#shopBuyPanel');
        if (!buyPanel) return;

        const list = buyPanel.querySelector('.shop-items-list');
        const scrollTop = list ? list.scrollTop : 0;

        const shop = getShop(this._shopId);
        buyPanel.innerHTML = this._buildBuyItems(shop);

        // Re-bind buy buttons
        buyPanel.querySelectorAll('.btn-buy:not(.disabled)').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._handleBuy(parseInt(btn.dataset.shopIndex));
            });
        });

        // Re-bind buy filter pills
        buyPanel.querySelectorAll('.buy-filter-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                const filterId = pill.dataset.buyFilter;
                if (filterId && filterId !== this._buyFilter) {
                    this._buyFilter = filterId;
                    this._refreshBuyPanel();
                }
            });
        });

        // Re-bind buy sort button
        const buySortBtn = buyPanel.querySelector('#buySortBtn');
        if (buySortBtn) {
            buySortBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._buySortDropdownOpen = !this._buySortDropdownOpen;
                const dd = buyPanel.querySelector('#buySortDropdown');
                if (dd) dd.classList.toggle('open', this._buySortDropdownOpen);
            });
        }

        // Re-bind buy sort options
        buyPanel.querySelectorAll('.buy-sort-option').forEach(opt => {
            opt.addEventListener('click', () => {
                const sortId = opt.dataset.buySort;
                if (sortId && sortId !== this._buySort) {
                    this._buySort = sortId;
                    this._buySortDropdownOpen = false;
                    this._refreshBuyPanel();
                }
            });
        });

        // Restore scroll
        const newList = buyPanel.querySelector('.shop-items-list');
        if (newList) newList.scrollTop = scrollTop;
    }

    /**
     * Build sell items HTML with filter toolbar, sorting, and stacking (v1.2.0)
     */
    _buildSellItems() {
        const inventory = this.character.inventory || [];
        
        if (inventory.length === 0) {
            return `
                <div class="shop-sell-toolbar">${this._buildSellToolbar()}</div>
                <div class="shop-items-list">
                    <p class="empty-sell">Nothing to sell</p>
                </div>
            `;
        }
        
        // Filter
        let filteredItems = this._filterSellItems(inventory, this._sellFilter);
        
        // Sort
        filteredItems = this._sortSellItems(filteredItems, this._sellSort);
        
        // Stack
        const stacks = this._stackItems(filteredItems);
        
        // Count text
        const totalItems = filteredItems.length;
        const stackCount = stacks.length;
        const countText = totalItems === 0
            ? 'No matching items'
            : totalItems === stackCount
                ? `${totalItems} items`
                : `${totalItems} items in ${stackCount} stacks`;
        
        // Render stacked items
        const itemsHtml = stacks.length > 0
            ? stacks.map(stack => this._buildSellStack(stack)).join('')
            : '<p class="empty-sell">No items match filter</p>';
        
        return `
            <div class="shop-sell-toolbar">${this._buildSellToolbar()}</div>
            <div class="shop-sell-count">${countText}</div>
            <div class="shop-items-list">
                ${itemsHtml}
            </div>
        `;
    }
    
    /**
     * Build the sell tab toolbar (sort dropdown + filter pills) (v1.2.0)
     */
    _buildSellToolbar() {
        const currentSort = SELL_SORT_OPTIONS.find(s => s.id === this._sellSort) || SELL_SORT_OPTIONS[0];
        
        // Sort dropdown
        const sortOptionsHtml = SELL_SORT_OPTIONS.map(opt => `
            <div class="sell-sort-option ${opt.id === this._sellSort ? 'active' : ''}" data-sort="${opt.id}">
                ${opt.icon} ${opt.label}
            </div>
        `).join('');
        
        // Filter pills
        const filterPillsHtml = SELL_FILTER_OPTIONS.map(opt => `
            <button class="sell-filter-pill ${opt.id === this._sellFilter ? 'active' : ''}" data-sell-filter="${opt.id}">
                ${opt.icon ? opt.icon + ' ' : ''}${opt.label}
            </button>
        `).join('');
        
        return `
            <div class="sell-toolbar">
                <div class="sell-sort-container">
                    <button class="sell-sort-btn" id="sellSortBtn">
                        <span class="sell-sort-icon">↕️</span>
                        <span class="sell-sort-label">${currentSort.label}</span>
                        <span class="sell-sort-arrow">▼</span>
                    </button>
                    <div class="sell-sort-dropdown ${this._sellSortDropdownOpen ? 'open' : ''}" id="sellSortDropdown">
                        ${sortOptionsHtml}
                    </div>
                </div>
                <div class="sell-filter-pills">
                    ${filterPillsHtml}
                </div>
            </div>
        `;
    }
    
    /**
     * Build a single stacked sell item row (v1.2.0)
     */
    _buildSellStack(stack) {
        const item = stack.representative;
        const itemColor = ItemUtils.getColor(item);
        const itemName = ItemUtils.getName(item);
        const itemSlot = ItemUtils.getSlot(item) || '';
        const itemType = ItemUtils.getType(item);
        const isPotion = this._isPotionItem(item);
        
        // Slot label for display
        let typeLabel = '';
        if (isPotion) {
            typeLabel = 'Potion';
        } else if (itemSlot && SLOT_CONFIG[itemSlot]) {
            typeLabel = SLOT_CONFIG[itemSlot].label;
        } else {
            typeLabel = itemType || '';
        }
        
        // Sell value
        const singleValue = this.character.getSellValue ? this.character.getSellValue(item) : 0;
        const totalValue = singleValue * stack.count;
        
        // For potions, show total quantity across stack items
        const totalQty = isPotion 
            ? stack.items.reduce((sum, i) => sum + (ItemUtils.getQuantity(i) || i.quantity || 1), 0)
            : stack.count;
        
        // Use the first item's ID for the sell button (sells one from stack)
        const sellItemId = item.id;
        
        return `
            <div class="shop-item sellable" data-item-id="${sellItemId}" data-stack-key="${stack.stackKey}">
                <div class="shop-item-info">
                    <span class="shop-item-name" style="color: ${itemColor}">${itemName}</span>
                    <span class="shop-item-type">${typeLabel}</span>
                    ${totalQty > 1 ? `<span class="shop-stack-count">×${totalQty}</span>` : ''}
                </div>
                <div class="shop-item-price">
                    ${stack.count > 1 
                        ? `<span class="price-amount sell-price sell-price-each">💰 ${singleValue.toLocaleString()} ea</span>`
                        : `<span class="price-amount sell-price">💰 ${singleValue.toLocaleString()}</span>`
                    }
                    <button class="btn-sell" data-item-id="${sellItemId}">Sell</button>
                </div>
            </div>
        `;
    }
    
    /**
     * Update character reference (after external changes)
     */
    updateCharacter(character) {
        this.character = character;
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        this._currentTab = 'buy';
        this._shopId = 'town';
        this._buyFilter = 'all';
        this._buySort = 'type';
        this._buySortDropdownOpen = false;
        this._sellFilter = 'all';
        this._sellSort = 'value';
        this._sellSortDropdownOpen = false;
        this.container = null;
        this.character = null;
        this.callbacks = null;
    }
}

export default ShopUI;
