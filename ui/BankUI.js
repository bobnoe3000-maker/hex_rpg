/**
 * @file BankUI.js
 * @description Bank UI component for the Ironvault Depository.
 *              Provides tabbed interface for gold deposits/withdrawals,
 *              item storage with stacking and filter pills, and vault expansion.
 *              Reuses inv-tab-btn, inv-filter-pill, inv-item-card, and
 *              forge-currency-row CSS patterns for visual consistency.
 * 
 * @location ui/BankUI.js
 * @usage Instantiated by TownScreen when player opens the bank
 * @dependencies 
 *   - BankService (systems/BankService.js) - Banking business logic
 *   - BankConfig (config/bankConfig.js) - Vault configuration
 *   - ItemUtils (utils/ItemUtils.js) - Item property access
 * 
 * @version 2.0.0
 * @changelog
 *   - v2.0.0 (2026-02-11): Complete UI overhaul to match InventoryUI/ForgeUI patterns.
 *                          Replaced unstyled bank classes with shared inv and forge classes.
 *                          Added item stacking on vault tab (identical items grouped with ×N).
 *                          Added filter pills on vault tab (All/Weapon/Shield/Head/Body/Cape/
 *                          Boots/Neck/Ring/Potion) for both inventory and vault columns.
 *                          Added vault capacity progress bar. Balance row now uses
 *                          forge-currency-row pattern. Tabs use inv-tab-btn pattern.
 *                          Vault items now render as compact inv-item-card style cards with
 *                          tier color pips, stat summaries, and transfer arrows.
 *                          Added proper empty states matching inv-empty-state pattern.
 *   - v1.0.0 (2026-01-27): Initial implementation with gold, vault, and expand tabs
 */

import { BankService } from '../systems/BankService.js';
import { BankConfig, getNextExpansionTier, getAllExpansionTiers } from '../config/bankConfig.js';
import { ItemUtils } from '../utils/ItemUtils.js';

// ============================================
// CONSTANTS
// ============================================

/**
 * Filter options for vault tab item lists.
 * Mirrors GEAR_FILTER_OPTIONS from InventoryUI plus potion category.
 */
const VAULT_FILTER_OPTIONS = [
    { id: 'all', label: 'All', icon: '' },
    { id: 'weapon', label: 'Weapon', icon: '⚔️' },
    { id: 'shield', label: 'Shield', icon: '🛡️' },
    { id: 'head', label: 'Head', icon: '🪖' },
    { id: 'body', label: 'Body', icon: '👕' },
    { id: 'cape', label: 'Cape', icon: '🧣' },
    { id: 'boots', label: 'Boots', icon: '👢' },
    { id: 'necklace', label: 'Neck', icon: '📿' },
    { id: 'ring', label: 'Ring', icon: '💍' },
    { id: 'potion', label: 'Potion', icon: '🧪' }
];

/**
 * Slot config for identifying gear items (matches InventoryUI SLOT_CONFIG keys)
 */
const GEAR_SLOTS = ['head', 'necklace', 'body', 'cape', 'mainHand', 'offHand', 'ring', 'ring1', 'ring2', 'boots'];

/**
 * Stat abbreviations for display (matches InventoryUI)
 */
const STAT_ABBREVS = {
    attack: 'ATK',
    defense: 'DEF',
    health: 'HP',
    mana: 'MP',
    magicDamage: 'MAG',
    strength: 'STR',
    dexterity: 'DEX',
    intelligence: 'INT',
    stamina: 'STA',
    dodge: 'DOD',
    critChance: 'CRT'
};

export class BankUI {
    /**
     * Create a BankUI instance
     * @param {HTMLElement} container - Parent container for the bank panel content
     * @param {Object} character - Player character object
     * @param {Object} callbacks - Callback functions
     * @param {Function} callbacks.onRefresh - Called when panel should refresh
     * @param {Function} callbacks.onSave - Called when game should be saved
     * @param {Function} callbacks.onTextOutput - Called to output text to MUD feed
     */
    constructor(container, character, callbacks = {}) {
        this.container = container;
        this.character = character;
        this.callbacks = callbacks;
        
        // Bank state
        this._currentTab = 'gold';
        this._goldInputAmount = '';
        this._vaultFilter = 'all';
        
        // Bind methods
        this._handleTabSwitch = this._handleTabSwitch.bind(this);
        this._handleDepositGold = this._handleDepositGold.bind(this);
        this._handleWithdrawGold = this._handleWithdrawGold.bind(this);
        this._handleDepositItem = this._handleDepositItem.bind(this);
        this._handleWithdrawItem = this._handleWithdrawItem.bind(this);
        this._handleExpandVault = this._handleExpandVault.bind(this);
    }
    
    /**
     * Get the current bank state
     * @returns {Object} Current tab and filter
     */
    getState() {
        return {
            currentTab: this._currentTab,
            vaultFilter: this._vaultFilter
        };
    }
    
    /**
     * Set bank state
     * @param {Object} state - State object with currentTab, vaultFilter
     */
    setState(state) {
        if (state) {
            this._currentTab = state.currentTab || 'gold';
            this._vaultFilter = state.vaultFilter || 'all';
        }
    }
    
    /**
     * Set the active tab
     * @param {string} tab - 'gold', 'vault', or 'expand'
     */
    setTab(tab) {
        const validTabs = ['gold', 'vault', 'expand'];
        this._currentTab = validTabs.includes(tab) ? tab : 'gold';
    }
    
    // ============================================
    // MAIN BUILD
    // ============================================
    
    /**
     * Build and return the bank panel HTML content
     * @param {string} title - Panel title (e.g., NPC name)
     * @returns {string} HTML content for the bank panel
     */
    buildContent(title = '🏦 Ironvault Depository') {
        const summary = BankService.getVaultSummary(this.character);
        const vaultPercent = summary.vaultCapacity > 0
            ? ((summary.vaultUsed / summary.vaultCapacity) * 100).toFixed(1)
            : 0;
        
        // Build tab content based on current tab
        let tabContent = '';
        switch (this._currentTab) {
            case 'gold':
                tabContent = this._buildGoldTab(summary);
                break;
            case 'vault':
                tabContent = this._buildVaultTab(summary);
                break;
            case 'expand':
                tabContent = this._buildExpandTab(summary);
                break;
        }
        
        return `
            <div class="bank-ui panel-bank">
                <!-- Balance Row (forge-currency-row pattern) -->
                <div class="bank-balance-row">
                    <div class="bank-balance wallet">
                        <span class="bank-balance-icon">👛</span>
                        <span class="bank-balance-amount">${summary.walletGold.toLocaleString()}</span>
                        <span class="bank-balance-label">Wallet</span>
                    </div>
                    <div class="bank-balance vault-bal">
                        <span class="bank-balance-icon">🏦</span>
                        <span class="bank-balance-amount">${summary.bankGold.toLocaleString()}</span>
                        <span class="bank-balance-label">Bank</span>
                    </div>
                </div>
                
                <!-- Vault Capacity Bar -->
                <div class="bank-vault-bar">
                    <span class="vault-bar-label">Vault</span>
                    <div class="vault-bar-track">
                        <div class="vault-bar-fill" style="width: ${vaultPercent}%"></div>
                    </div>
                    <span class="vault-bar-count">${summary.vaultUsed}/${summary.vaultCapacity}</span>
                </div>
                
                <!-- Tabs (inv-tab-nav pattern) -->
                <div class="inv-tab-nav">
                    <button class="inv-tab-btn ${this._currentTab === 'gold' ? 'active' : ''}" data-tab="gold">
                        💰 Gold
                    </button>
                    <button class="inv-tab-btn ${this._currentTab === 'vault' ? 'active' : ''}" data-tab="vault">
                        📦 Vault
                    </button>
                    <button class="inv-tab-btn ${this._currentTab === 'expand' ? 'active' : ''}" data-tab="expand">
                        🔓 Expand
                    </button>
                </div>
                
                <!-- Tab Content -->
                <div class="inv-tab-content">
                    ${tabContent}
                </div>
            </div>
        `;
    }
    
    // ============================================
    // GOLD TAB
    // ============================================
    
    /**
     * Build the Gold tab content
     */
    _buildGoldTab(summary) {
        return `
            <div class="bank-gold-content">
                <div class="bank-gold-input-group">
                    <label for="goldAmount">Amount:</label>
                    <input type="number" 
                           id="goldAmount" 
                           class="bank-gold-input" 
                           min="1" 
                           max="${Math.max(summary.walletGold, summary.bankGold)}"
                           placeholder="Enter gold amount"
                           value="${this._goldInputAmount}">
                </div>
                
                <div class="bank-gold-quick-row">
                    <button class="inv-filter-pill bank-quick-btn" data-amount="100">100</button>
                    <button class="inv-filter-pill bank-quick-btn" data-amount="500">500</button>
                    <button class="inv-filter-pill bank-quick-btn" data-amount="1000">1K</button>
                    <button class="inv-filter-pill bank-quick-btn" data-amount="5000">5K</button>
                    <button class="inv-filter-pill bank-quick-btn" data-amount="all-wallet">All Wallet</button>
                    <button class="inv-filter-pill bank-quick-btn" data-amount="all-bank">All Bank</button>
                </div>
                
                <div class="bank-gold-actions">
                    <button class="bank-action-btn bank-deposit-btn" id="depositGoldBtn">
                        📥 Deposit
                    </button>
                    <button class="bank-action-btn bank-withdraw-btn" id="withdrawGoldBtn">
                        📤 Withdraw
                    </button>
                </div>
                
                <div class="bank-hint">
                    <span class="bank-hint-icon">💡</span>
                    <span>Deposited gold is safe from death penalties.</span>
                </div>
            </div>
        `;
    }
    
    // ============================================
    // VAULT TAB
    // ============================================
    
    /**
     * Build the Vault tab content with stacking and filter pills
     */
    _buildVaultTab(summary) {
        // Filter pills
        const filterPillsHtml = VAULT_FILTER_OPTIONS.map(opt => `
            <button class="inv-filter-pill bank-vault-filter ${opt.id === this._vaultFilter ? 'active' : ''}" 
                    data-vault-filter="${opt.id}">
                ${opt.icon ? opt.icon + ' ' : ''}${opt.label}
            </button>
        `).join('');
        
        // Get filtered and stacked items for both columns
        const inventoryItems = this._getFilteredItems(this.character.inventory || [], this._vaultFilter);
        const vaultItems = this._getFilteredItems(this.character.bankVault || [], this._vaultFilter);
        
        const inventoryStacks = this._stackItems(inventoryItems);
        const vaultStacks = this._stackItems(vaultItems);
        
        const inventoryHtml = inventoryStacks.length > 0
            ? inventoryStacks.map(stack => this._renderVaultItemCard(stack, 'deposit')).join('')
            : '<div class="bank-vault-empty"><div class="bank-vault-empty-icon">🎒</div><div class="bank-vault-empty-text">Inventory empty</div></div>';
        
        const vaultHtml = vaultStacks.length > 0
            ? vaultStacks.map(stack => this._renderVaultItemCard(stack, 'withdraw')).join('')
            : '<div class="bank-vault-empty"><div class="bank-vault-empty-icon">🏦</div><div class="bank-vault-empty-text">Vault empty</div></div>';
        
        return `
            <div class="bank-vault-content">
                <!-- Filter Pills -->
                <div class="inv-filter-pills bank-vault-filters">
                    ${filterPillsHtml}
                </div>
                
                <!-- Two Columns -->
                <div class="bank-vault-columns">
                    <!-- Inventory Column -->
                    <div class="bank-vault-column">
                        <div class="bank-vault-col-header">
                            <span class="bank-vault-col-icon">🎒</span>
                            <span class="bank-vault-col-title">Inventory</span>
                            <span class="bank-vault-col-count">${this.character.inventory?.length || 0}/${this.character.maxInventory || 20}</span>
                        </div>
                        <div class="bank-vault-item-list" id="bankInventoryList">
                            ${inventoryHtml}
                        </div>
                    </div>
                    
                    <!-- Vault Column -->
                    <div class="bank-vault-column">
                        <div class="bank-vault-col-header">
                            <span class="bank-vault-col-icon">🏦</span>
                            <span class="bank-vault-col-title">Vault</span>
                            <span class="bank-vault-col-count">${summary.vaultUsed}/${summary.vaultCapacity}</span>
                        </div>
                        <div class="bank-vault-item-list" id="bankVaultList">
                            ${vaultHtml}
                        </div>
                    </div>
                </div>
                
                <div class="bank-hint">
                    <span class="bank-hint-icon">💡</span>
                    <span>Tap items to transfer between inventory and vault.</span>
                </div>
            </div>
        `;
    }
    
    /**
     * Render a single vault item card (stacked)
     * Compact inv-item-card style with tier pip, name, stats, transfer arrow
     * @param {Object} stack - Stack from _stackItems()
     * @param {string} action - 'deposit' or 'withdraw'
     * @returns {string} HTML for the item card
     */
    _renderVaultItemCard(stack, action) {
        const item = stack.representative;
        const itemColor = ItemUtils.getColor(item);
        const itemName = ItemUtils.getName(item);
        const itemType = ItemUtils.getType(item);
        const stats = ItemUtils.getStats(item);
        const statSummary = this._getStatSummary(stats, itemType, item);
        const tier = item.tier || 0;
        const arrow = action === 'deposit' ? '→' : '←';
        
        // Pick the item ID for the action (first item in stack)
        const actionItemId = item.id;
        
        // Type icon
        const typeIcon = this._getTypeIcon(item);
        
        return `
            <div class="bank-vault-item ${action === 'deposit' ? 'inventory-item' : 'vault-stored-item'}" 
                 data-item-id="${actionItemId}" data-action="${action}">
                <div class="bank-vault-item-pip" style="background: ${itemColor}"></div>
                <div class="bank-vault-item-body">
                    <div class="bank-vault-item-name-row">
                        <span class="bank-vault-item-name" style="color: ${itemColor}">${itemName}</span>
                        ${tier > 0 ? `<span class="bank-vault-item-tier">+${tier}</span>` : ''}
                        ${stack.count > 1 ? `<span class="bank-vault-item-qty">×${stack.count}</span>` : ''}
                    </div>
                    <div class="bank-vault-item-stats">${statSummary}</div>
                </div>
                <span class="bank-vault-item-type">${typeIcon}</span>
                <span class="bank-vault-item-arrow">${arrow}</span>
            </div>
        `;
    }
    
    // ============================================
    // EXPAND TAB
    // ============================================
    
    /**
     * Build the Expand tab content
     */
    _buildExpandTab(summary) {
        const nextTier = getNextExpansionTier(this.character.bankVaultSlots || BankConfig.initialVaultSlots);
        const canAfford = nextTier && this.character.gold >= nextTier.cost;
        
        let expansionContent = '';
        
        if (!nextTier) {
            expansionContent = `
                <div class="bank-expand-maxed">
                    <span class="bank-expand-maxed-icon">🏆</span>
                    <p class="bank-expand-maxed-text">Your vault has reached maximum capacity!</p>
                    <p class="bank-expand-maxed-slots">${summary.vaultCapacity} slots</p>
                </div>
            `;
        } else {
            const newCapacity = summary.vaultCapacity + nextTier.slots;
            
            // Build tier pips
            const allTiers = getAllExpansionTiers(this.character.bankVaultSlots || BankConfig.initialVaultSlots);
            const tierPipsHtml = allTiers.map(t => {
                let cls = 'bank-expand-pip';
                if (t.purchased) cls += ' purchased';
                else if (t.isNext) cls += ' next';
                return `<div class="${cls}"></div>`;
            }).join('');
            
            expansionContent = `
                <div class="bank-expand-available">
                    <!-- Current → New visual -->
                    <div class="bank-expand-visual">
                        <div class="bank-expand-box">
                            <span class="bank-expand-box-label">Current</span>
                            <span class="bank-expand-box-value">${summary.vaultCapacity}</span>
                            <span class="bank-expand-box-label">slots</span>
                        </div>
                        <span class="bank-expand-arrow">➡️</span>
                        <div class="bank-expand-box">
                            <span class="bank-expand-box-label">New</span>
                            <span class="bank-expand-box-value new">${newCapacity}</span>
                            <span class="bank-expand-box-label">slots</span>
                        </div>
                    </div>
                    
                    <!-- Tier progress pips -->
                    <div class="bank-expand-tiers">
                        <span class="bank-expand-tiers-label">Expansion Progress (Tier ${nextTier.tier} of ${allTiers.length})</span>
                        <div class="bank-expand-tier-row">
                            ${tierPipsHtml}
                        </div>
                    </div>
                    
                    <!-- Cost -->
                    <div class="bank-expand-cost-row">
                        <span class="bank-expand-cost-label">Expansion Cost</span>
                        <span class="bank-expand-cost-amount ${canAfford ? 'affordable' : 'insufficient'}">
                            💰 ${nextTier.cost.toLocaleString()}
                        </span>
                    </div>
                    
                    <!-- Your gold -->
                    <div class="bank-expand-your-gold">
                        <span class="bank-expand-your-gold-label">Your Gold</span>
                        <span class="bank-expand-your-gold-amount">💰 ${summary.walletGold.toLocaleString()}</span>
                    </div>
                    
                    <!-- Expand button -->
                    <button class="bank-expand-action-btn ${canAfford ? '' : 'disabled'}" 
                            id="expandVaultBtn"
                            ${canAfford ? '' : 'disabled'}>
                        🔓 Expand Vault (+${nextTier.slots} slots)
                    </button>
                </div>
            `;
        }
        
        return `
            <div class="bank-expand-content">
                ${expansionContent}
                
                <div class="bank-hint">
                    <span class="bank-hint-icon">💡</span>
                    <span>Expansions are permanent. Prices increase each tier.</span>
                </div>
            </div>
        `;
    }
    
    // ============================================
    // STACKING (mirrors InventoryUI/ForgeUI)
    // ============================================
    
    /**
     * Generate stacking key for an item.
     * Items with identical keys will be grouped together.
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
     * Group identical items into stacks.
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
    
    // ============================================
    // FILTERING
    // ============================================
    
    /**
     * Filter items by category for vault display.
     * @param {Array} items - Items to filter
     * @param {string} filter - Filter ID from VAULT_FILTER_OPTIONS
     * @returns {Array} Filtered items
     */
    _getFilteredItems(items, filter) {
        if (filter === 'all') return [...items];
        
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
                case 'potion':
                    return type === 'potion' || type === 'consumable';
                default:
                    return true;
            }
        });
    }
    
    // ============================================
    // RENDER HELPERS
    // ============================================
    
    /**
     * Get stat summary string for an item
     * @param {Object} stats - Item stats object
     * @param {string} itemType - Item type string
     * @param {Object} item - Full item for potion fallback
     * @returns {string} Formatted stat summary
     */
    _getStatSummary(stats, itemType, item) {
        // Potions: show restore info
        if (itemType === 'potion' || itemType === 'consumable') {
            const potionType = item.baseId?.includes('health') ? 'HP' : 'MP';
            const amount = item.effect?.heal || item.effect?.mana || item.effect?.amount || item.restoreAmount || 0;
            if (amount > 0) return `+${amount} ${potionType}`;
            return 'Potion';
        }
        
        if (!stats) return '';
        const parts = [];
        if (stats.attack) parts.push(`+${stats.attack} ATK`);
        if (stats.defense) parts.push(`+${stats.defense} DEF`);
        if (stats.health) parts.push(`+${stats.health} HP`);
        if (stats.mana) parts.push(`+${stats.mana} MP`);
        if (stats.magicDamage) parts.push(`+${stats.magicDamage} MAG`);
        return parts.slice(0, 2).join(', ') || '';
    }
    
    /**
     * Get a type icon emoji for an item
     * @param {Object} item - Item to get icon for
     * @returns {string} Emoji icon
     */
    _getTypeIcon(item) {
        const type = ItemUtils.getType(item);
        const slot = ItemUtils.getSlot(item);
        
        if (type === 'potion' || type === 'consumable') return '🧪';
        if (type === 'weapon' || slot === 'mainHand') return '⚔️';
        if (type === 'shield' || (slot === 'offHand' && type !== 'weapon')) return '🛡️';
        if (slot === 'head') return '🪖';
        if (slot === 'body') return '👕';
        if (slot === 'cape') return '🧣';
        if (slot === 'boots') return '👢';
        if (slot === 'necklace') return '📿';
        if (['ring', 'ring1', 'ring2'].includes(slot)) return '💍';
        return '📦';
    }
    
    // ============================================
    // EVENT SETUP
    // ============================================
    
    /**
     * Setup event handlers for the bank panel.
     * Call this after inserting content into DOM.
     */
    setupHandlers() {
        // Tab switching
        const tabs = this.container.querySelectorAll('.panel-bank .inv-tab-btn');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this._handleTabSwitch(tab.dataset.tab);
            });
        });
        
        // Gold tab handlers
        if (this._currentTab === 'gold') {
            this._setupGoldHandlers();
        }
        
        // Vault tab handlers
        if (this._currentTab === 'vault') {
            this._setupVaultHandlers();
        }
        
        // Expand tab handlers
        if (this._currentTab === 'expand') {
            this._setupExpandHandlers();
        }
    }
    
    /**
     * Setup gold tab event handlers
     */
    _setupGoldHandlers() {
        // Gold input
        const goldInput = this.container.querySelector('#goldAmount');
        if (goldInput) {
            goldInput.addEventListener('input', (e) => {
                this._goldInputAmount = e.target.value;
            });
        }
        
        // Quick amount buttons
        const quickBtns = this.container.querySelectorAll('.bank-quick-btn');
        quickBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const amount = btn.dataset.amount;
                const input = this.container.querySelector('#goldAmount');
                
                if (amount === 'all-wallet') {
                    input.value = this.character.gold || 0;
                } else if (amount === 'all-bank') {
                    input.value = this.character.bankGold || 0;
                } else {
                    input.value = parseInt(amount);
                }
                this._goldInputAmount = input.value;
                
                // Toggle active state on pills
                quickBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
        
        // Deposit button
        const depositBtn = this.container.querySelector('#depositGoldBtn');
        if (depositBtn) {
            depositBtn.addEventListener('click', this._handleDepositGold);
        }
        
        // Withdraw button
        const withdrawBtn = this.container.querySelector('#withdrawGoldBtn');
        if (withdrawBtn) {
            withdrawBtn.addEventListener('click', this._handleWithdrawGold);
        }
    }
    
    /**
     * Setup vault tab event handlers
     */
    _setupVaultHandlers() {
        // Filter pills
        this.container.querySelectorAll('.bank-vault-filter').forEach(pill => {
            pill.addEventListener('click', () => {
                const filterId = pill.dataset.vaultFilter;
                if (filterId && filterId !== this._vaultFilter) {
                    this._vaultFilter = filterId;
                    this._refresh();
                }
            });
        });
        
        // Inventory items (deposit)
        const inventoryItems = this.container.querySelectorAll('.inventory-item');
        inventoryItems.forEach(item => {
            item.addEventListener('click', () => {
                this._handleDepositItem(item.dataset.itemId);
            });
        });
        
        // Vault items (withdraw)
        const vaultItems = this.container.querySelectorAll('.vault-stored-item');
        vaultItems.forEach(item => {
            item.addEventListener('click', () => {
                this._handleWithdrawItem(item.dataset.itemId);
            });
        });
    }
    
    /**
     * Setup expand tab event handlers
     */
    _setupExpandHandlers() {
        const expandBtn = this.container.querySelector('#expandVaultBtn');
        if (expandBtn && !expandBtn.disabled) {
            expandBtn.addEventListener('click', this._handleExpandVault);
        }
    }
    
    // ============================================
    // INTERNAL HANDLERS
    // ============================================
    
    /**
     * Handle tab switch
     */
    _handleTabSwitch(tab) {
        this._currentTab = tab;
        this._goldInputAmount = '';
        
        if (this.callbacks.onRefresh) {
            this.callbacks.onRefresh();
        }
    }
    
    /**
     * Handle gold deposit
     */
    _handleDepositGold() {
        const input = this.container.querySelector('#goldAmount');
        const amount = parseInt(input?.value) || 0;
        
        if (amount <= 0) {
            this._showMessage('Please enter a valid amount.');
            return;
        }
        
        const result = BankService.depositGold(this.character, amount);
        
        if (result.success) {
            this._outputText(result.message);
            this._goldInputAmount = '';
            this._save();
            this._refresh();
        } else {
            this._showMessage(result.message);
        }
    }
    
    /**
     * Handle gold withdrawal
     */
    _handleWithdrawGold() {
        const input = this.container.querySelector('#goldAmount');
        const amount = parseInt(input?.value) || 0;
        
        if (amount <= 0) {
            this._showMessage('Please enter a valid amount.');
            return;
        }
        
        const result = BankService.withdrawGold(this.character, amount);
        
        if (result.success) {
            this._outputText(result.message);
            this._goldInputAmount = '';
            this._save();
            this._refresh();
        } else {
            this._showMessage(result.message);
        }
    }
    
    /**
     * Handle item deposit
     */
    _handleDepositItem(itemId) {
        const result = BankService.depositItem(this.character, itemId);
        
        if (result.success) {
            this._outputText(result.message);
            this._save();
            this._refresh();
        } else {
            this._showMessage(result.message);
        }
    }
    
    /**
     * Handle item withdrawal
     */
    _handleWithdrawItem(itemId) {
        const result = BankService.withdrawItem(this.character, itemId);
        
        if (result.success) {
            this._outputText(result.message);
            this._save();
            this._refresh();
        } else {
            this._showMessage(result.message);
        }
    }
    
    /**
     * Handle vault expansion
     */
    _handleExpandVault() {
        const result = BankService.expandVault(this.character);
        
        if (result.success) {
            this._outputText(result.message);
            this._save();
            this._refresh();
        } else {
            this._showMessage(result.message);
        }
    }
    
    // ============================================
    // UTILITY METHODS
    // ============================================
    
    /**
     * Output text to MUD feed
     */
    _outputText(message) {
        if (this.callbacks.onTextOutput) {
            this.callbacks.onTextOutput(message);
        }
    }
    
    /**
     * Show a message (could be enhanced with toast/modal)
     */
    _showMessage(message) {
        if (this.callbacks.onTextOutput) {
            this.callbacks.onTextOutput(message);
        }
    }
    
    /**
     * Save the game
     */
    _save() {
        if (this.callbacks.onSave) {
            this.callbacks.onSave();
        }
    }
    
    /**
     * Refresh the panel
     */
    _refresh() {
        if (this.callbacks.onRefresh) {
            this.callbacks.onRefresh();
        }
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
        this._currentTab = 'gold';
        this._goldInputAmount = '';
        this._vaultFilter = 'all';
        this.container = null;
        this.character = null;
        this.callbacks = null;
    }
}

export default BankUI;
