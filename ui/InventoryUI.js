/**
 * @file InventoryUI.js
 * @description Modular inventory UI component with item type tabs (Gear/Potions/Other),
 *              automatic item stacking, equipped indicators, and detail popups.
 *              Supports sorting, filtering, stat comparison, and potion management.
 *              Used by both TownScreen and BattleMapUI for consistent inventory experience.
 * 
 * @location ui/InventoryUI.js
 * @usage 
 *   import { InventoryUI } from './InventoryUI.js';
 *   const ui = new InventoryUI({ player, containerElement, callbacks... });
 *   ui.render();
 * 
 * @dependencies 
 *   - ItemUtils (utils/ItemUtils.js)
 *   - EventBus, GameEvents (systems/EventBus.js)
 * 
 * @version 2.10.2
 * @changelog
 *   - v2.10.2 (2026-03-05): Made _findEquipmentSlotForItem backwards compatible with older saves.
 *                           Added Pass 2 fallback: if no exact ID match, looks up item in inventory
 *                           by ID, gets generic slot via ItemUtils.getSlot(), then matches any
 *                           equipment key equal to or starting with that slot name. Fixes unequip
 *                           failing on legacy characters for shields, weapons, rings etc.
 *   - v2.10.1 (2026-03-05): Fixed popup Unequip button doing nothing. Popup handler was using
 *                           raw data-slot (generic slot like "ring") instead of resolving the
 *                           actual equipment key ("ring1"/"ring2"). Now uses
 *                           _findEquipmentSlotForItem(item.id) with data-slot as fallback.
 *   - v2.10.0 (2026-02-10): Fixed potion restore amount still displaying +0. Root cause:
 *                           _getPotionRestoreAmount() was short-circuiting on ItemUtils.
 *                           getPotionRestoreAmount (returns 0) before reaching fallback chain.
 *                           Now reads directly from getPotion(baseId).effect.heal/mana via
 *                           itemConfig.js as the primary source of truth. Same fix for
 *                           _getPotionCooldown(). Added import of getPotion from itemConfig.
 *   - v2.9.0 (2026-02-10): Added potion filter pills (type: All/Health/Mana, tier:
 *                          All/Minor/Standard/Greater/Superior). Added stable sort order for
 *                          potion stacks (health before mana, then tier ascending) so list
 *                          doesn't re-order when equipping. Uses _refreshPotionsTab() for
 *                          partial re-render on filter change. Scroll position preserved
 *                          across render() and _refreshPotionsTab() to prevent jump-to-top.
 *   - v2.8.0 (2026-02-10): Fixed proc descriptions for new procs (executioner, soulreaper,
 *                          thorns, warding, evasive, manaburn, laststand). Replaced hardcoded
 *                          procNames/procDescriptions lookup with dynamic reading from item._procData.
 *                          Proc name now colored using proc.color. Added icons for all 12 procs.
 *   - v2.7.0 (2026-02-08): Separated accessory filter into Ring and Necklace filters.
 *   - v2.6.0 (2026-02-08): Separated cape from body in gear filter. Added new 'Cape' filter pill.
 *                          Body filter now only matches body armor; Cape filter matches capes.
 *   - v2.5.0 (2026-02-08): Fixed rings appearing in "Other" tab instead of "Gear" tab.
 *                          Added 'ring' to SLOT_CONFIG so _isGearItem() recognizes ring items.
 *                          Fixed unequip handler to resolve actual equipment slot key (ring1/ring2)
 *                          by matching item ID against equipment, instead of using generic config slot.
 *   - v2.4.0 (2025-02-03): Added "🔥 Upgrade" button to gear item popups. New onUpgradeItem
 *                          callback opens Forge with item pre-selected. Uses ForgeUI.canUpgrade()
 *                          to determine if upgrade button should be shown.
 *   - v2.3.0 (2025-01-27): Expanded gear filter options. Replaced single "Armor" filter with
 *                          separate filters for Shield, Head, Body, and Boots for easier browsing.
 *   - v2.2.0 (2025-01-27): Added housing materials display to Other tab. Materials from
 *                          player.materials now show in a dedicated section with icons,
 *                          colors, and quantities sorted by tier.
 *   - v2.1.0 (2025-01-27): Fixed equipped items not showing in Gear tab - now includes items from
 *                          player.equipment. Fixed stat comparison showing "+ New" instead of actual
 *                          ATK/DEF values when no item is equipped in that slot.
 *   - v2.0.0 (2025-01-24): Major overhaul - item type tabs, stacking, equipped indicator, detail popup
 *   - v1.0.0 (2025-01-19): Initial implementation - modular inventory with tabs
 */

import { ItemUtils } from '../utils/ItemUtils.js';
import { eventBus, GameEvents } from '../systems/EventBus.js';
import { ForgeUI } from './ForgeUI.js';
import { getPotion } from '../config/itemConfig.js';

/**
 * Slot configuration for equipment display
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
 * Sort options configuration
 */
const SORT_OPTIONS = [
    { id: 'power', label: 'Power', icon: '⚡' },
    { id: 'type', label: 'Type', icon: '📦' },
    { id: 'tier', label: 'Tier', icon: '💎' },
    { id: 'value', label: 'Value', icon: '💰' },
    { id: 'recent', label: 'Recent', icon: '🕐' }
];

/**
 * Gear filter options
 */
const GEAR_FILTER_OPTIONS = [
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
 * Potion type filter options
 */
const POTION_TYPE_FILTERS = [
    { id: 'all', label: 'All', icon: '' },
    { id: 'health', label: 'Health', icon: '❤️' },
    { id: 'mana', label: 'Mana', icon: '💧' }
];

/**
 * Potion tier filter options
 */
const POTION_TIER_FILTERS = [
    { id: 'all', label: 'All Tiers', icon: '' },
    { id: 'minor', label: 'Minor', icon: '' },
    { id: 'standard', label: 'Standard', icon: '' },
    { id: 'greater', label: 'Greater', icon: '' },
    { id: 'superior', label: 'Superior', icon: '' }
];

/**
 * Potion sort order: type first (health before mana), then tier ascending
 */
const POTION_TIER_ORDER = { minor: 0, standard: 1, greater: 2, superior: 3 };

/**
 * Stat abbreviations for display
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

/**
 * Modular Inventory UI Component
 */
export class InventoryUI {
    /**
     * @param {Object} options
     * @param {Object} options.player - Player/Character object
     * @param {HTMLElement} options.containerElement - Container to render into
     * @param {Function} options.onEquip - Callback when equipping gear
     * @param {Function} options.onUnequip - Callback when unequipping gear
     * @param {Function} options.onEquipPotion - Callback when equipping potion
     * @param {Function} options.onUnequipPotion - Callback when unequipping potion
     * @param {Function} options.onPotionSettingsChange - Callback for potion auto-use settings
     * @param {Function} options.onSell - Callback when selling item (optional)
     * @param {Function} options.onRefresh - Callback to refresh parent UI (optional)
     */
    constructor(options) {
        this.player = options.player;
        this.container = options.containerElement;
        
        // Callbacks
        this.callbacks = {
            onEquip: options.onEquip || (() => {}),
            onUnequip: options.onUnequip || (() => {}),
            onEquipPotion: options.onEquipPotion || (() => {}),
            onUnequipPotion: options.onUnequipPotion || (() => {}),
            onPotionSettingsChange: options.onPotionSettingsChange || (() => {}),
            onSell: options.onSell || null,
            onRefresh: options.onRefresh || (() => {}),
            onUpgradeItem: options.onUpgradeItem || null  // v2.4.0: New callback for upgrade
        };
        
        // UI State
        this.activeTab = 'gear';      // 'gear' | 'potions' | 'other'
        this.sortBy = 'power';        // Sort option id
        this.filterBy = 'all';        // Filter option id (for gear tab)
        this.potionTypeFilter = 'all';  // 'all' | 'health' | 'mana'
        this.potionTierFilter = 'all';  // 'all' | 'minor' | 'standard' | 'greater' | 'superior'
        this.sortDropdownOpen = false;
        this.selectedItemId = null;   // For detail popup
        
        // Bound event handlers for cleanup
        this._boundHandlers = {};
    }
    
    // ===========================================
    // PUBLIC API
    // ===========================================
    
    /**
     * Render the inventory UI
     */
    render() {
        if (!this.container || !this.player) return;
        
        // Save scroll position before re-render
        const scrollParent = this.container.querySelector('.inv-tab-content') || this.container;
        const savedScroll = scrollParent.scrollTop;
        
        const inventory = this.player.inventory || [];
        const counts = this._getItemCounts(inventory);
        
        this.container.innerHTML = `
            <div class="inv-ui">
                <!-- Tab Navigation -->
                <div class="inv-tab-nav">
                    <button class="inv-tab-btn ${this.activeTab === 'gear' ? 'active' : ''}" data-tab="gear">
                        ⚔️ Gear
                        ${counts.gear > 0 ? `<span class="inv-tab-badge">${counts.gear}</span>` : ''}
                    </button>
                    <button class="inv-tab-btn ${this.activeTab === 'potions' ? 'active' : ''}" data-tab="potions">
                        🧪 Potions
                        ${counts.potions > 0 ? `<span class="inv-tab-badge">${counts.potions}</span>` : ''}
                    </button>
                    <button class="inv-tab-btn ${this.activeTab === 'other' ? 'active' : ''}" data-tab="other">
                        📦 Other
                        ${counts.other > 0 ? `<span class="inv-tab-badge">${counts.other}</span>` : ''}
                    </button>
                </div>
                
                <!-- Tab Content -->
                <div class="inv-tab-content">
                    ${this._renderActiveTab()}
                </div>
                
                <!-- Item Detail Popup (hidden by default) -->
                <div class="inv-popup-overlay" id="invPopupOverlay">
                    <div class="inv-popup" id="invPopup"></div>
                </div>
            </div>
        `;
        
        this._setupEventHandlers();
        
        // Restore scroll position after re-render
        const newScrollParent = this.container.querySelector('.inv-tab-content') || this.container;
        newScrollParent.scrollTop = savedScroll;
    }
    
    /**
     * Refresh the inventory display
     */
    refresh() {
        this.render();
    }
    
    /**
     * Clean up event handlers
     */
    destroy() {
        this._boundHandlers = {};
    }
    
    // ===========================================
    // ITEM CATEGORIZATION & STACKING
    // ===========================================
    
    /**
     * Get item counts by category
     */
    _getItemCounts(inventory) {
        let gear = 0, potions = 0, other = 0;
        
        for (const item of inventory) {
            const type = ItemUtils.getType(item);
            if (type === 'potion' || type === 'consumable') {
                potions++;
            } else if (this._isGearItem(item)) {
                gear++;
            } else {
                other++;
            }
        }
        
        return { gear, potions, other };
    }
    
    /**
     * Check if item is gear (equippable)
     */
    _isGearItem(item) {
        const slot = ItemUtils.getSlot(item);
        return slot && SLOT_CONFIG[slot] !== undefined;
    }
    
    /**
     * Check if item is "other" category
     */
    _isOtherItem(item) {
        const type = ItemUtils.getType(item);
        if (type === 'potion' || type === 'consumable') return false;
        if (this._isGearItem(item)) return false;
        return true;
    }
    
    /**
     * Generate stacking key for an item
     * Items with identical keys will be stacked together
     */
    _getStackKey(item) {
        const baseId = item.baseId || item.id || 'unknown';
        const materialId = item.materialId || 'none';
        const tier = item.tier || 0;
        const procId = item.procId || 'none';
        return `${baseId}|${materialId}|${tier}|${procId}`;
    }
    
    /**
     * Stack identical items together
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
     * Check if an item is currently equipped
     */
    _isItemEquipped(item) {
        const equipment = this.player.equipment || {};
        const itemId = item.id;
        
        // Check all equipment slots
        for (const slot of Object.keys(equipment)) {
            const equipped = equipment[slot];
            if (equipped && equipped.id === itemId) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * Check if any item in a stack is equipped
     */
    _isStackEquipped(stack) {
        for (const item of stack.items) {
            if (this._isItemEquipped(item)) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * Get the equipped item from a stack (if any)
     */
    _getEquippedFromStack(stack) {
        for (const item of stack.items) {
            if (this._isItemEquipped(item)) {
                return item;
            }
        }
        return null;
    }
    
    // ===========================================
    // TAB RENDERING
    // ===========================================
    
    /**
     * Render the active tab content
     */
    _renderActiveTab() {
        switch (this.activeTab) {
            case 'gear':
                return this._renderGearTab();
            case 'potions':
                return this._renderPotionsTab();
            case 'other':
                return this._renderOtherTab();
            default:
                return this._renderGearTab();
        }
    }
    
    /**
     * Render the Gear tab
     */
    _renderGearTab() {
        const inventory = this.player.inventory || [];
        let gearItems = inventory.filter(item => this._isGearItem(item));
        
        // Include equipped items in the gear list
        const equipment = this.player.equipment || {};
        for (const slot of Object.keys(SLOT_CONFIG)) {
            const equipped = equipment[slot];
            if (equipped && this._isGearItem(equipped)) {
                // Only add if not already in inventory (avoid duplicates)
                if (!gearItems.some(item => item.id === equipped.id)) {
                    gearItems.push(equipped);
                }
            }
        }
        
        // Apply filtering
        gearItems = this._filterGearItems(gearItems, this.filterBy);
        
        // Apply sorting
        gearItems = this._sortGearItems(gearItems, this.sortBy);
        
        // Stack identical items
        const stacks = this._stackItems(gearItems);
        
        // Count total items vs stacks
        const totalItems = gearItems.length;
        const stackCount = stacks.length;
        
        // Render toolbar
        const toolbarHtml = this._renderGearToolbar();
        
        // Render item count
        const countText = totalItems === stackCount 
            ? `${totalItems} items` 
            : `${totalItems} items in ${stackCount} stacks`;
        
        // Render stacked items
        const itemsHtml = stacks.length > 0
            ? stacks.map(stack => this._renderGearStack(stack)).join('')
            : '<div class="inv-empty-state"><div class="inv-empty-icon">🎒</div><div class="inv-empty-text">No gear items</div></div>';
        
        return `
            <div class="inv-gear-content">
                ${toolbarHtml}
                <div class="inv-item-count">${countText}</div>
                <div class="inv-items-grid">
                    ${itemsHtml}
                </div>
            </div>
        `;
    }
    
    /**
     * Render gear toolbar (sort + filters)
     */
    _renderGearToolbar() {
        const currentSort = SORT_OPTIONS.find(s => s.id === this.sortBy) || SORT_OPTIONS[0];
        
        // Sort dropdown
        const sortOptionsHtml = SORT_OPTIONS.map(opt => `
            <div class="inv-sort-option ${opt.id === this.sortBy ? 'active' : ''}" data-sort="${opt.id}">
                ${opt.icon} ${opt.label}
            </div>
        `).join('');
        
        // Filter pills
        const filterPillsHtml = GEAR_FILTER_OPTIONS.map(opt => `
            <button class="inv-filter-pill ${opt.id === this.filterBy ? 'active' : ''}" data-filter="${opt.id}">
                ${opt.icon ? opt.icon + ' ' : ''}${opt.label}
            </button>
        `).join('');
        
        return `
            <div class="inv-toolbar">
                <div class="inv-sort-container">
                    <button class="inv-sort-btn" id="invSortBtn">
                        <span class="inv-sort-icon">↕️</span>
                        <span class="inv-sort-label">${currentSort.label}</span>
                        <span class="inv-sort-arrow">▼</span>
                    </button>
                    <div class="inv-sort-dropdown ${this.sortDropdownOpen ? 'open' : ''}" id="invSortDropdown">
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
     * Render a stacked gear item
     */
    _renderGearStack(stack) {
        const item = stack.representative;
        const itemId = item.id;
        const itemName = ItemUtils.getName(item);
        const itemColor = ItemUtils.getColor(item);
        const itemSlot = ItemUtils.getSlot(item);
        const slotLabel = SLOT_CONFIG[itemSlot]?.label || itemSlot?.toUpperCase() || '?';
        
        // Check if equipped
        const isEquipped = this._isStackEquipped(stack);
        const equippedItem = isEquipped ? this._getEquippedFromStack(stack) : null;
        
        // Get stat comparison (compare against currently equipped in that slot)
        const equippedInSlot = this._getEquippedForSlot(item);
        const comparison = this._getStatComparison(item, equippedInSlot);
        
        // Get stats summary
        const statsSummary = this._getItemStatSummary(item);
        
        // Get sell value (total for stack)
        const singleValue = this.player.getSellValue ? this.player.getSellValue(item) : 0;
        const totalValue = singleValue * stack.count;
        
        // Can equip check
        const canEquipResult = this.player.canEquip ? this.player.canEquip(item) : { canEquip: true };
        const canEquip = canEquipResult.canEquip;
        
        // Determine button state
        const showUnequip = isEquipped;
        
        return `
            <div class="inv-item-card ${comparison.type}" data-item-id="${itemId}" data-stack-key="${stack.stackKey}">
                <div class="inv-item-tier" style="background-color: ${itemColor}"></div>
                <div class="inv-item-name-row">
                    <span class="inv-item-name" style="color: ${itemColor}">${itemName}</span>
                    ${isEquipped ? '<span class="inv-equipped-badge">E</span>' : ''}
                </div>
                <span class="inv-item-slot">${slotLabel}</span>
                ${stack.count > 1 ? `<span class="inv-stack-count">${stack.count}</span>` : ''}
                ${showUnequip 
                    ? `<button class="inv-btn-action unequip" data-item-id="${equippedItem.id}" title="Unequip">↓</button>`
                    : `<button class="inv-btn-action equip ${!canEquip ? 'disabled' : ''}" 
                              data-item-id="${itemId}" 
                              ${!canEquip ? `disabled title="${canEquipResult.reason || 'Cannot equip'}"` : 'title="Equip"'}>↑</button>`
                }
                <div class="inv-item-stats-row">
                    <span class="inv-item-stats">${statsSummary}</span>
                    <span class="inv-item-comparison ${comparison.type}">${comparison.text}</span>
                    <span class="inv-item-value">💰${totalValue}</span>
                </div>
            </div>
        `;
    }
    
    /**
     * Render the Potions tab
     */
    _renderPotionsTab() {
        const inventory = this.player.inventory || [];
        let potionItems = inventory.filter(item => {
            const type = ItemUtils.getType(item);
            return type === 'potion' || type === 'consumable';
        });
        
        // Apply type filter
        if (this.potionTypeFilter !== 'all') {
            potionItems = potionItems.filter(item => {
                return this._getPotionType(item) === this.potionTypeFilter;
            });
        }
        
        // Apply tier filter
        if (this.potionTierFilter !== 'all') {
            potionItems = potionItems.filter(item => {
                return this._getPotionTierName(item) === this.potionTierFilter;
            });
        }
        
        // Stack identical potions
        const stacks = this._stackItems(potionItems);
        
        // Stable sort: health before mana, then tier ascending (minor → superior)
        stacks.sort((a, b) => {
            const typeA = this._getPotionType(a.representative);
            const typeB = this._getPotionType(b.representative);
            if (typeA !== typeB) {
                return typeA === 'health' ? -1 : 1;
            }
            const tierA = POTION_TIER_ORDER[this._getPotionTierName(a.representative)] ?? 99;
            const tierB = POTION_TIER_ORDER[this._getPotionTierName(b.representative)] ?? 99;
            return tierA - tierB;
        });
        
        // Also show equipped potions at top
        const equippedPotionsHtml = this._renderEquippedPotions();
        
        // Filter pills
        const filterHtml = this._renderPotionFilters();
        
        // Count
        const totalPotions = potionItems.length;
        const stackCount = stacks.length;
        const countText = totalPotions === stackCount
            ? `${totalPotions} potions`
            : `${totalPotions} potions in ${stackCount} stacks`;
        
        const potionsHtml = stacks.length > 0
            ? stacks.map(stack => this._renderPotionStack(stack)).join('')
            : '<div class="inv-empty-state"><div class="inv-empty-icon">🧪</div><div class="inv-empty-text">No potions</div></div>';
        
        return `
            <div class="inv-potions-content">
                ${equippedPotionsHtml}
                <div class="inv-section-divider"></div>
                ${filterHtml}
                <div class="inv-item-count">${countText}</div>
                <div class="inv-items-grid">
                    ${potionsHtml}
                </div>
            </div>
        `;
    }
    
    /**
     * Render potion filter pills (type + tier)
     */
    _renderPotionFilters() {
        const typePills = POTION_TYPE_FILTERS.map(opt => `
            <button class="inv-filter-pill potion-type-filter ${opt.id === this.potionTypeFilter ? 'active' : ''}" 
                    data-potion-type-filter="${opt.id}">
                ${opt.icon ? opt.icon + ' ' : ''}${opt.label}
            </button>
        `).join('');
        
        const tierPills = POTION_TIER_FILTERS.map(opt => `
            <button class="inv-filter-pill potion-tier-filter ${opt.id === this.potionTierFilter ? 'active' : ''}" 
                    data-potion-tier-filter="${opt.id}">
                ${opt.icon ? opt.icon + ' ' : ''}${opt.label}
            </button>
        `).join('');
        
        return `
            <div class="inv-potion-filters">
                <div class="inv-filter-pills">${typePills}</div>
                <div class="inv-filter-pills">${tierPills}</div>
            </div>
        `;
    }
    
    /**
     * Get potion type ('health' or 'mana') from item
     */
    _getPotionType(item) {
        if (ItemUtils.getPotionType) return ItemUtils.getPotionType(item);
        if (item.potionType) return item.potionType;
        return item.baseId?.includes('health') ? 'health' : 'mana';
    }
    
    /**
     * Get potion tier name from item baseId ('minor', 'standard', 'greater', 'superior')
     */
    _getPotionTierName(item) {
        const baseId = item.baseId || '';
        if (baseId.includes('minor')) return 'minor';
        if (baseId.includes('greater')) return 'greater';
        if (baseId.includes('superior')) return 'superior';
        if (baseId.includes('standard') || !baseId.includes('_')) return 'standard';
        // Default: check if name contains tier hints
        const name = (ItemUtils.getName(item) || '').toLowerCase();
        if (name.includes('minor')) return 'minor';
        if (name.includes('greater')) return 'greater';
        if (name.includes('superior')) return 'superior';
        return 'standard';
    }
    
    /**
     * Get potion restore amount from item, checking multiple data paths
     * Items may store effect as { heal: N }, { mana: N }, or { amount: N }
     */
    _getPotionRestoreAmount(item) {
        // Primary source: read directly from itemConfig (source of truth)
        const potionDef = getPotion(item.baseId);
        if (potionDef?.effect?.heal) return potionDef.effect.heal;
        if (potionDef?.effect?.mana) return potionDef.effect.mana;
        if (potionDef?.effect?.amount) return potionDef.effect.amount;
        // Fallback: item instance properties
        if (item.effect?.heal) return item.effect.heal;
        if (item.effect?.mana) return item.effect.mana;
        if (item.restoreAmount) return item.restoreAmount;
        return 0;
    }
    
    /**
     * Get potion cooldown in ms from item
     */
    _getPotionCooldown(item) {
        // Primary source: read directly from itemConfig (source of truth)
        const potionDef = getPotion(item.baseId);
        if (potionDef?.cooldown) return potionDef.cooldown;
        // Fallback: item instance properties
        if (item.cooldown) return item.cooldown;
        return 0;
    }
    
    /**
     * Refresh only the potions tab content (avoids full re-render for stable list)
     */
    _refreshPotionsTab() {
        const contentEl = this.container.querySelector('.inv-tab-content');
        if (contentEl && this.activeTab === 'potions') {
            const savedScroll = contentEl.scrollTop;
            contentEl.innerHTML = this._renderPotionsTab();
            this._setupEventHandlers();
            contentEl.scrollTop = savedScroll;
        }
    }
    
    /**
     * Render equipped potion slots
     */
    _renderEquippedPotions() {
        const equipment = this.player.equipment || {};
        const settings = this.player.potionSettings || {};
        
        const healthPotion = equipment.potionHealth;
        const manaPotion = equipment.potionMana;
        
        return `
            <div class="inv-equipped-potions">
                <div class="inv-section-title">Equipped Potions</div>
                <div class="inv-potion-slots">
                    ${this._renderEquippedPotionSlot('health', healthPotion, settings)}
                    ${this._renderEquippedPotionSlot('mana', manaPotion, settings)}
                </div>
            </div>
        `;
    }
    
    /**
     * Render a single equipped potion slot
     */
    _renderEquippedPotionSlot(potionType, potion, settings) {
        const icon = potionType === 'health' ? '❤️' : '💧';
        const label = potionType === 'health' ? 'Health' : 'Mana';
        const colorVar = potionType === 'health' ? '#e74c3c' : '#3498db';
        const autoEnabled = potionType === 'health' ? settings.autoHealthEnabled : settings.autoManaEnabled;
        const threshold = potionType === 'health' 
            ? (settings.autoHealthThreshold || 0.3) 
            : (settings.autoManaThreshold || 0.3);
        
        const isEmpty = !potion;
        const potionName = potion ? ItemUtils.getName(potion) : 'Empty';
        const potionQty = potion ? ItemUtils.getQuantity(potion) : 0;
        
        const thresholdOptions = [10, 20, 30, 40, 50, 60, 70, 80, 90]
            .map(v => `<option value="${v/100}" ${threshold === v/100 ? 'selected' : ''}>${v}%</option>`)
            .join('');
        
        return `
            <div class="inv-equipped-potion ${isEmpty ? 'empty' : 'filled'}" data-potion-type="${potionType}">
                <div class="inv-eq-potion-main">
                    <span class="inv-eq-potion-icon">${icon}</span>
                    <div class="inv-eq-potion-info">
                        <span class="inv-eq-potion-label">${label}</span>
                        <span class="inv-eq-potion-name" style="color: ${isEmpty ? 'var(--text-muted)' : colorVar}">
                            ${potionName}${!isEmpty ? ` <span class="inv-eq-potion-qty">×${potionQty}</span>` : ''}
                        </span>
                    </div>
                    ${!isEmpty ? `<button class="inv-btn-unequip-potion" data-potion-type="${potionType}" title="Unequip">✕</button>` : ''}
                </div>
                <div class="inv-eq-potion-settings">
                    <label class="inv-auto-toggle">
                        <input type="checkbox" class="inv-auto-potion-cb" data-potion-type="${potionType}" ${autoEnabled ? 'checked' : ''}>
                        <span>Auto</span>
                    </label>
                    <div class="inv-threshold-group ${!autoEnabled ? 'disabled' : ''}">
                        <span>at</span>
                        <select class="inv-threshold-select" data-potion-type="${potionType}" ${!autoEnabled ? 'disabled' : ''}>
                            ${thresholdOptions}
                        </select>
                        <span>${potionType === 'health' ? 'HP' : 'MP'}</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Render a stacked potion item
     */
    _renderPotionStack(stack) {
        const item = stack.representative;
        const itemId = item.id;
        const potionType = ItemUtils.getPotionType ? ItemUtils.getPotionType(item) : 
            (item.baseId?.includes('health') ? 'health' : 'mana');
        const icon = potionType === 'health' ? '❤️' : '💧';
        const itemColor = potionType === 'health' ? '#e74c3c' : '#3498db';
        const itemName = ItemUtils.getName(item);
        
        // Get restore amount and cooldown
        const restoreAmount = this._getPotionRestoreAmount(item);
        const cooldown = this._getPotionCooldown(item);
        const cooldownSec = cooldown / 1000;
        
        // Stack total quantity (sum of all quantities in stack)
        const totalQty = stack.items.reduce((sum, i) => sum + ItemUtils.getQuantity(i), 0);
        
        // Sell value
        const singleValue = this.player.getSellValue ? this.player.getSellValue(item) : 0;
        const totalValue = singleValue * stack.count;
        
        return `
            <div class="inv-item-card potion" data-item-id="${itemId}" data-stack-key="${stack.stackKey}">
                <div class="inv-item-tier" style="background-color: ${itemColor}"></div>
                <span class="inv-potion-icon">${icon}</span>
                <div class="inv-item-name-row">
                    <span class="inv-item-name" style="color: ${itemColor}">${itemName}</span>
                </div>
                ${totalQty > 1 ? `<span class="inv-stack-count">${totalQty}</span>` : ''}
                <button class="inv-btn-action equip-potion" data-item-id="${itemId}" title="Equip">↑</button>
                <div class="inv-item-stats-row">
                    <span class="inv-potion-stats">
                        +${restoreAmount} ${potionType === 'health' ? 'HP' : 'MP'} • ${cooldownSec}s CD
                    </span>
                    <span class="inv-item-value">💰${totalValue}</span>
                </div>
            </div>
        `;
    }
    
    /**
     * Render the Other tab
     */
    _renderOtherTab() {
        const inventory = this.player.inventory || [];
        const otherItems = inventory.filter(item => this._isOtherItem(item));
        
        // Stack identical items
        const stacks = this._stackItems(otherItems);
        
        const countText = `${otherItems.length} items`;
        
        const itemsHtml = stacks.length > 0
            ? stacks.map(stack => this._renderOtherStack(stack)).join('')
            : '';
        
        // Render housing materials section
        const materialsHtml = this._renderMaterialsSection();
        
        // Show empty state only if both are empty
        const hasContent = stacks.length > 0 || Object.keys(this.player.materials || {}).length > 0;
        const emptyHtml = !hasContent 
            ? '<div class="inv-empty-state"><div class="inv-empty-icon">📦</div><div class="inv-empty-text">No other items</div></div>'
            : '';
        
        return `
            <div class="inv-other-content">
                ${materialsHtml}
                ${itemsHtml ? `<div class="inv-section-title">Other Items</div><div class="inv-item-count">${countText}</div>` : ''}
                <div class="inv-items-grid">
                    ${itemsHtml}
                </div>
                ${emptyHtml}
            </div>
        `;
    }
    
    /**
     * Render housing materials section
     */
    _renderMaterialsSection() {
        const materials = this.player.materials || {};
        const materialEntries = Object.entries(materials).filter(([id, qty]) => qty > 0);
        
        if (materialEntries.length === 0) {
            return '';
        }
        
        // Material display config (icons and colors by material ID)
        const materialConfig = {
            wood: { name: 'Wood', icon: '🪵', color: '#8B4513', tier: 1 },
            stone: { name: 'Stone', icon: '🪨', color: '#808080', tier: 1 },
            clay: { name: 'Clay', icon: '🧱', color: '#CD853F', tier: 1 },
            iron: { name: 'Iron', icon: '⛓️', color: '#708090', tier: 2 },
            hardwood: { name: 'Hardwood', icon: '🌳', color: '#654321', tier: 2 },
            leather_strips: { name: 'Leather', icon: '🦴', color: '#8B4513', tier: 2 },
            marble: { name: 'Marble', icon: '🔲', color: '#E8E8E8', tier: 3 },
            silver_ingot: { name: 'Silver', icon: '🥈', color: '#C0C0C0', tier: 3 },
            crystal_shard: { name: 'Crystal', icon: '💎', color: '#00CED1', tier: 4 },
            dragonwood: { name: 'Dragonwood', icon: '🐉', color: '#8B0000', tier: 4 },
            ethereal_essence: { name: 'Ethereal', icon: '✨', color: '#E6E6FA', tier: 5 },
            starstone: { name: 'Starstone', icon: '⭐', color: '#FFD700', tier: 5 },
            void_crystal: { name: 'Void Crystal', icon: '🔮', color: '#4B0082', tier: 6 }
        };
        
        // Sort by tier, then alphabetically
        materialEntries.sort((a, b) => {
            const tierA = materialConfig[a[0]]?.tier || 99;
            const tierB = materialConfig[b[0]]?.tier || 99;
            if (tierA !== tierB) return tierA - tierB;
            return a[0].localeCompare(b[0]);
        });
        
        const materialsHtml = materialEntries.map(([materialId, quantity]) => {
            const config = materialConfig[materialId] || { 
                name: materialId, 
                icon: '📦', 
                color: '#888888',
                tier: 0
            };
            
            return `
                <div class="inv-material-item" data-material-id="${materialId}">
                    <span class="inv-material-icon">${config.icon}</span>
                    <span class="inv-material-name" style="color: ${config.color}">${config.name}</span>
                    <span class="inv-material-qty">×${quantity}</span>
                </div>
            `;
        }).join('');
        
        return `
            <div class="inv-materials-section">
                <div class="inv-section-title">🏠 Housing Materials</div>
                <div class="inv-materials-grid">
                    ${materialsHtml}
                </div>
            </div>
            <div class="inv-section-divider"></div>
        `;
    }
    
    /**
     * Render a stacked "other" item
     */
    _renderOtherStack(stack) {
        const item = stack.representative;
        const itemId = item.id;
        const itemName = ItemUtils.getName(item);
        const itemColor = ItemUtils.getColor(item);
        
        // Get description or type
        const itemType = ItemUtils.getType(item);
        const description = item.description || `${itemType} item`;
        
        // Stack quantity
        const totalQty = stack.items.reduce((sum, i) => sum + (i.quantity || 1), 0);
        
        return `
            <div class="inv-item-card other" data-item-id="${itemId}" data-stack-key="${stack.stackKey}">
                <div class="inv-item-tier" style="background-color: ${itemColor}"></div>
                <div class="inv-item-name-row">
                    <span class="inv-item-name" style="color: ${itemColor}">${itemName}</span>
                </div>
                ${totalQty > 1 ? `<span class="inv-stack-count">${totalQty}</span>` : ''}
                <div class="inv-item-stats-row full-width">
                    <span class="inv-item-desc">${description}</span>
                </div>
            </div>
        `;
    }
    
    // ===========================================
    // ITEM DETAIL POPUP
    // ===========================================
    
    /**
     * Show item detail popup
     */
    _showItemPopup(itemId) {
        const item = this._findItemById(itemId);
        if (!item) return;
        
        const popup = this.container.querySelector('#invPopup');
        const overlay = this.container.querySelector('#invPopupOverlay');
        if (!popup || !overlay) return;
        
        popup.innerHTML = this._renderItemPopup(item);
        overlay.classList.add('active');
        this.selectedItemId = itemId;
        
        // Setup popup event handlers
        this._setupPopupHandlers(popup, item);
    }
    
    /**
     * Hide item detail popup
     */
    _hideItemPopup() {
        const overlay = this.container.querySelector('#invPopupOverlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
        this.selectedItemId = null;
    }
    
    /**
     * Find item by ID in inventory or equipment
     */
    _findItemById(itemId) {
        // Check inventory
        const inventory = this.player.inventory || [];
        let item = inventory.find(i => i.id === itemId);
        if (item) return item;
        
        // Check equipment
        const equipment = this.player.equipment || {};
        for (const slot of Object.keys(equipment)) {
            if (equipment[slot] && equipment[slot].id === itemId) {
                return equipment[slot];
            }
        }
        
        return null;
    }
    
    /**
     * Find the actual equipment slot key where an item is equipped.
     * Needed because items like rings have a config slot of 'ring' but
     * are stored in equipment as 'ring1' or 'ring2'.
     * @param {string} itemId - Item ID to find
     * @returns {string|null} Equipment slot key (e.g., 'ring1', 'head') or null
     */
    _findEquipmentSlotForItem(itemId) {
        const equipment = this.player.equipment || {};
        // Pass 1: exact ID match (handles ring1/ring2 etc.)
        for (const slot of Object.keys(equipment)) {
            if (equipment[slot] && equipment[slot].id === itemId) {
                return slot;
            }
        }
        // Pass 2: legacy fallback for older saves where ID may not match
        // Find item in inventory by ID, get its generic slot type, then match
        // any equipment key that equals or starts with that name (e.g. "ring" -> "ring1")
        const item = (this.player.inventory || []).find(i => i.id === itemId);
        if (item) {
            const genericSlot = ItemUtils.getSlot(item);
            if (genericSlot) {
                for (const slot of Object.keys(equipment)) {
                    if (slot === genericSlot || slot.startsWith(genericSlot)) {
                        return slot;
                    }
                }
            }
        }
        return null;
    }
    
    /**
     * Render item popup content
     */
    _renderItemPopup(item) {
        const itemType = ItemUtils.getType(item);
        
        if (itemType === 'potion' || itemType === 'consumable') {
            return this._renderPotionPopup(item);
        } else if (this._isGearItem(item)) {
            return this._renderGearPopup(item);
        } else {
            return this._renderOtherPopup(item);
        }
    }
    
    /**
     * Render gear item popup
     */
    _renderGearPopup(item) {
        const itemName = ItemUtils.getName(item);
        const itemColor = ItemUtils.getColor(item);
        const itemSlot = ItemUtils.getSlot(item);
        const slotLabel = SLOT_CONFIG[itemSlot]?.label || itemSlot || 'Unknown';
        const itemType = ItemUtils.getType(item);
        const isEquipped = this._isItemEquipped(item);
        
        // Stats
        const stats = ItemUtils.getStats(item);
        const statsHtml = Object.entries(stats)
            .filter(([_, val]) => val && val !== 0)
            .map(([stat, val]) => {
                const abbrev = STAT_ABBREVS[stat] || stat;
                const displayVal = stat === 'dodge' || stat === 'critChance' 
                    ? `${Math.round(val * 100)}%` 
                    : `+${Math.round(val)}`;
                return `
                    <div class="inv-popup-stat">
                        <span class="inv-popup-stat-label">${abbrev}</span>
                        <span class="inv-popup-stat-value">${displayVal}</span>
                    </div>
                `;
            }).join('');
        
        // Proc effect
        const hasProc = ItemUtils.hasProc(item);
        const procHtml = hasProc ? this._renderProcSection(item) : '';
        
        // Details
        const materialTier = ItemUtils.getMaterialTier(item);
        const upgradeTier = ItemUtils.getTier(item);
        const materialName = item.materialId ? item.materialId.charAt(0).toUpperCase() + item.materialId.slice(1) : 'Unknown';
        const sellValue = this.player.getSellValue ? this.player.getSellValue(item) : 0;
        
        // Action buttons
        const canEquipResult = this.player.canEquip ? this.player.canEquip(item) : { canEquip: true };
        const canEquip = canEquipResult.canEquip;
        const showSell = this.callbacks.onSell !== null;
        
        // v2.4.0: Check if item can be upgraded
        const canUpgrade = this.callbacks.onUpgradeItem && ForgeUI.canUpgrade(item);
        
        return `
            <div class="inv-popup-header">
                <div class="inv-popup-title-area">
                    <div class="inv-popup-title" style="color: ${itemColor}">
                        ${itemName}
                        ${isEquipped ? '<span class="inv-equipped-badge large">EQUIPPED</span>' : ''}
                    </div>
                    <div class="inv-popup-subtitle">${slotLabel} • ${itemType}</div>
                </div>
                <button class="inv-popup-close" data-action="close">&times;</button>
            </div>
            <div class="inv-popup-body">
                ${statsHtml ? `
                    <div class="inv-popup-section">
                        <div class="inv-popup-section-title">Stats</div>
                        <div class="inv-popup-stats-grid">
                            ${statsHtml}
                        </div>
                    </div>
                ` : ''}
                
                ${procHtml}
                
                <div class="inv-popup-section">
                    <div class="inv-popup-section-title">Details</div>
                    <div class="inv-popup-info-row">
                        <span class="inv-popup-info-label">Material</span>
                        <span class="inv-popup-info-value" style="color: ${itemColor}">${materialName} (Tier ${materialTier})</span>
                    </div>
                    <div class="inv-popup-info-row">
                        <span class="inv-popup-info-label">Upgrade Tier</span>
                        <span class="inv-popup-info-value">+${upgradeTier}</span>
                    </div>
                    <div class="inv-popup-info-row">
                        <span class="inv-popup-info-label">Sell Value</span>
                        <span class="inv-popup-info-value">💰 ${sellValue}</span>
                    </div>
                </div>
            </div>
            <div class="inv-popup-actions">
                ${isEquipped 
                    ? `<button class="inv-popup-btn unequip" data-action="unequip" data-slot="${itemSlot}">Unequip</button>`
                    : `<button class="inv-popup-btn primary ${!canEquip ? 'disabled' : ''}" 
                              data-action="equip" 
                              ${!canEquip ? 'disabled' : ''}>Equip</button>`
                }
                ${canUpgrade 
                    ? `<button class="inv-popup-btn upgrade" data-action="upgrade">🔥 Upgrade</button>`
                    : ''
                }
                ${showSell ? `<button class="inv-popup-btn secondary" data-action="sell">Sell</button>` : ''}
            </div>
        `;
    }
    
    /**
     * Render proc effect section
     */
    _renderProcSection(item) {
        const procId = item.procId;
        const procData = item._procData || {};
        const procEffect = ItemUtils.getProcEffect(item);
        
        // Proc icon mapping (fallback for procs without explicit icon)
        const procIcons = {
            'flaming': '🔥', 'icy': '❄️', 'crackling': '⚡',
            'sickly': '☠️', 'vampiric': '🧛', 'executioner': '⚔️',
            'soulreaper': '💀', 'thorns': '🌿', 'warding': '🛡️',
            'evasive': '💨', 'manaburn': '🔮', 'laststand': '✊'
        };
        
        const icon = procIcons[procId] || '✦';
        const procName = procData.name || procId;
        const procDesc = procData.description || 'Special effect.';
        const procColor = procData.color || '#FFD700';
        
        return `
            <div class="inv-popup-section">
                <div class="inv-popup-section-title">Special Effect</div>
                <div class="inv-popup-proc">
                    <div class="inv-popup-proc-name" style="color: ${procColor}">${icon} ${procName}</div>
                    <div class="inv-popup-proc-desc">${procDesc}</div>
                </div>
            </div>
        `;
    }
    
    /**
     * Render potion popup
     */
    _renderPotionPopup(item) {
        const itemName = ItemUtils.getName(item);
        const potionType = ItemUtils.getPotionType ? ItemUtils.getPotionType(item) : 
            (item.baseId?.includes('health') ? 'health' : 'mana');
        const itemColor = potionType === 'health' ? '#e74c3c' : '#3498db';
        const icon = potionType === 'health' ? '❤️' : '💧';
        
        // Check if equipped
        const equipment = this.player.equipment || {};
        const equippedSlot = potionType === 'health' ? 'potionHealth' : 'potionMana';
        const isEquipped = equipment[equippedSlot] && equipment[equippedSlot].id === item.id;
        
        // Effect info
        const restoreAmount = this._getPotionRestoreAmount(item);
        const cooldown = this._getPotionCooldown(item);
        const cooldownSec = cooldown / 1000;
        const quantity = ItemUtils.getQuantity(item);
        const sellValue = this.player.getSellValue ? this.player.getSellValue(item) : 0;
        
        const showSell = this.callbacks.onSell !== null;
        
        return `
            <div class="inv-popup-header">
                <div class="inv-popup-title-area">
                    <div class="inv-popup-title" style="color: ${itemColor}">
                        ${icon} ${itemName}
                        ${isEquipped ? '<span class="inv-equipped-badge large">EQUIPPED</span>' : ''}
                    </div>
                    <div class="inv-popup-subtitle">Consumable${quantity > 1 ? ` • ×${quantity}` : ''}</div>
                </div>
                <button class="inv-popup-close" data-action="close">&times;</button>
            </div>
            <div class="inv-popup-body">
                <div class="inv-popup-section">
                    <div class="inv-popup-section-title">Effect</div>
                    <div class="inv-popup-potion-effect">
                        <div class="inv-popup-potion-value ${potionType}">+${restoreAmount} ${potionType === 'health' ? 'HP' : 'MP'}</div>
                        <div class="inv-popup-potion-label">Instant restoration</div>
                    </div>
                </div>
                
                <div class="inv-popup-section">
                    <div class="inv-popup-section-title">Details</div>
                    <div class="inv-popup-info-row">
                        <span class="inv-popup-info-label">Cooldown</span>
                        <span class="inv-popup-info-value">${cooldownSec} seconds</span>
                    </div>
                    <div class="inv-popup-info-row">
                        <span class="inv-popup-info-label">Quantity</span>
                        <span class="inv-popup-info-value">×${quantity}</span>
                    </div>
                    <div class="inv-popup-info-row">
                        <span class="inv-popup-info-label">Sell Value</span>
                        <span class="inv-popup-info-value">💰 ${sellValue}</span>
                    </div>
                </div>
            </div>
            <div class="inv-popup-actions">
                ${isEquipped 
                    ? `<button class="inv-popup-btn unequip" data-action="unequip-potion" data-potion-type="${potionType}">Unequip</button>`
                    : `<button class="inv-popup-btn primary" data-action="equip-potion">Equip</button>`
                }
                ${showSell ? `<button class="inv-popup-btn secondary" data-action="sell">Sell 1</button>` : ''}
            </div>
        `;
    }
    
    /**
     * Render other item popup
     */
    _renderOtherPopup(item) {
        const itemName = ItemUtils.getName(item);
        const itemColor = ItemUtils.getColor(item);
        const itemType = ItemUtils.getType(item);
        const description = item.description || 'A mysterious item.';
        const quantity = item.quantity || 1;
        
        return `
            <div class="inv-popup-header">
                <div class="inv-popup-title-area">
                    <div class="inv-popup-title" style="color: ${itemColor}">${itemName}</div>
                    <div class="inv-popup-subtitle">${itemType}${quantity > 1 ? ` • ×${quantity}` : ''}</div>
                </div>
                <button class="inv-popup-close" data-action="close">&times;</button>
            </div>
            <div class="inv-popup-body">
                <div class="inv-popup-section">
                    <div class="inv-popup-description">${description}</div>
                </div>
            </div>
            <div class="inv-popup-actions">
                <button class="inv-popup-btn secondary" data-action="close">Close</button>
            </div>
        `;
    }
    
    /**
     * Setup popup event handlers
     */
    _setupPopupHandlers(popup, item) {
        // Close button
        popup.querySelectorAll('[data-action="close"]').forEach(btn => {
            btn.addEventListener('click', () => this._hideItemPopup());
        });
        
        // Equip gear
        popup.querySelectorAll('[data-action="equip"]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.callbacks.onEquip(item.id);
                this._hideItemPopup();
            });
        });
        
        // Unequip gear
        popup.querySelectorAll('[data-action="unequip"]').forEach(btn => {
            btn.addEventListener('click', () => {
                // Use _findEquipmentSlotForItem to resolve actual slot key (e.g. ring1/ring2)
                // Fallback to data-slot for non-ring slots
                const slot = this._findEquipmentSlotForItem(item.id) || btn.dataset.slot;
                this.callbacks.onUnequip(slot);
                this._hideItemPopup();
            });
        });
        
        // Equip potion
        popup.querySelectorAll('[data-action="equip-potion"]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.callbacks.onEquipPotion(item.id);
                this._hideItemPopup();
            });
        });
        
        // Unequip potion
        popup.querySelectorAll('[data-action="unequip-potion"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const potionType = btn.dataset.potionType;
                this.callbacks.onUnequipPotion(potionType);
                this._hideItemPopup();
            });
        });
        
        // Sell
        popup.querySelectorAll('[data-action="sell"]').forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.callbacks.onSell) {
                    this.callbacks.onSell(item.id);
                    this._hideItemPopup();
                }
            });
        });
        
        // v2.4.0: Upgrade action
        popup.querySelectorAll('[data-action="upgrade"]').forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.callbacks.onUpgradeItem) {
                    this.callbacks.onUpgradeItem(item.id);
                    this._hideItemPopup();
                }
            });
        });
    }
    
    // ===========================================
    // SORTING & FILTERING
    // ===========================================
    
    /**
     * Sort gear items based on selected criteria
     */
    _sortGearItems(items, sortBy) {
        const sorted = [...items];
        
        switch (sortBy) {
            case 'power':
                sorted.sort((a, b) => {
                    const order = { 'upgrade': 0, 'new-slot': 1, 'same': 2, 'downgrade': 3 };
                    const aType = this._getStatComparison(a, this._getEquippedForSlot(a)).type;
                    const bType = this._getStatComparison(b, this._getEquippedForSlot(b)).type;
                    return (order[aType] || 99) - (order[bType] || 99);
                });
                break;
                
            case 'type':
                const slotOrder = Object.keys(SLOT_CONFIG);
                sorted.sort((a, b) => {
                    const aSlot = ItemUtils.getSlot(a) || '';
                    const bSlot = ItemUtils.getSlot(b) || '';
                    const aIdx = slotOrder.indexOf(aSlot);
                    const bIdx = slotOrder.indexOf(bSlot);
                    return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
                });
                break;
                
            case 'tier':
                sorted.sort((a, b) => {
                    const aTier = ItemUtils.getMaterialTier(a) + ItemUtils.getTier(a);
                    const bTier = ItemUtils.getMaterialTier(b) + ItemUtils.getTier(b);
                    return bTier - aTier;
                });
                break;
                
            case 'value':
                sorted.sort((a, b) => {
                    const aValue = this.player.getSellValue ? this.player.getSellValue(a) : 0;
                    const bValue = this.player.getSellValue ? this.player.getSellValue(b) : 0;
                    return bValue - aValue;
                });
                break;
                
            case 'recent':
                sorted.reverse();
                break;
        }
        
        return sorted;
    }
    
    /**
     * Filter gear items by category
     */
    _filterGearItems(items, filter) {
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
     * Get stat comparison between item and equipped item
     */
    _getStatComparison(bagItem, equippedItem) {
        if (!equippedItem) {
            // Show actual stat gain when equipping to empty slot
            const bagStats = ItemUtils.getStats(bagItem);
            const primaryStat = this._getPrimaryStat(bagItem);
            const bagValue = bagStats[primaryStat] || 0;
            
            if (bagValue > 0) {
                return { type: 'upgrade', text: `▲ +${bagValue} ${STAT_ABBREVS[primaryStat] || primaryStat}` };
            }
            
            // If primary stat is 0, check for any other stat
            for (const [stat, val] of Object.entries(bagStats)) {
                if (val && val > 0) {
                    return { type: 'upgrade', text: `▲ +${val} ${STAT_ABBREVS[stat] || stat}` };
                }
            }
            
            return { type: 'new-slot', text: '+ New' };
        }
        
        const bagStats = ItemUtils.getStats(bagItem);
        const equipStats = ItemUtils.getStats(equippedItem);
        
        const primaryStat = this._getPrimaryStat(bagItem);
        const bagValue = bagStats[primaryStat] || 0;
        const equipValue = equipStats[primaryStat] || 0;
        const diff = bagValue - equipValue;
        
        if (diff > 0) {
            return { type: 'upgrade', text: `▲ +${diff} ${STAT_ABBREVS[primaryStat] || primaryStat}` };
        } else if (diff < 0) {
            return { type: 'downgrade', text: `▼ ${diff} ${STAT_ABBREVS[primaryStat] || primaryStat}` };
        } else {
            return { type: 'same', text: '=' };
        }
    }
    
    /**
     * Get the equipped item for an item's slot
     */
    _getEquippedForSlot(item) {
        const equipment = this.player.equipment || {};
        let slot = ItemUtils.getSlot(item);
        
        if (slot === 'ring') {
            if (!equipment.ring1) return null;
            if (!equipment.ring2) return null;
            return equipment.ring1;
        }
        
        return equipment[slot] || null;
    }
    
    /**
     * Get primary stat for an item
     */
    _getPrimaryStat(item) {
        const slot = ItemUtils.getSlot(item);
        const weaponSlots = ['mainHand', 'offHand'];
        
        if (weaponSlots.includes(slot)) {
            const type = ItemUtils.getType(item);
            if (type === 'shield' || type === 'armor') {
                return 'defense';
            }
            return 'attack';
        }
        return 'defense';
    }
    
    /**
     * Get primary stat display
     */
    _getPrimaryStatDisplay(item) {
        const stats = ItemUtils.getStats(item);
        const primaryStat = this._getPrimaryStat(item);
        const value = stats[primaryStat] || 0;
        
        if (value === 0) {
            for (const [stat, val] of Object.entries(stats)) {
                if (val && val !== 0) {
                    const abbrev = STAT_ABBREVS[stat] || stat.slice(0, 3).toUpperCase();
                    return `+${Math.round(val)} ${abbrev}`;
                }
            }
            return '';
        }
        
        const abbrev = STAT_ABBREVS[primaryStat] || primaryStat.slice(0, 3).toUpperCase();
        return `+${Math.round(value)} ${abbrev}`;
    }
    
    /**
     * Get item stat summary
     */
    _getItemStatSummary(item) {
        const stats = ItemUtils.getStats(item);
        if (!stats || Object.keys(stats).length === 0) return '';
        
        const parts = [];
        if (stats.attack) parts.push(`+${stats.attack} ATK`);
        if (stats.defense) parts.push(`+${stats.defense} DEF`);
        if (stats.health) parts.push(`+${stats.health} HP`);
        if (stats.mana) parts.push(`+${stats.mana} MP`);
        if (stats.magicDamage) parts.push(`+${stats.magicDamage} MAG`);
        
        return parts.slice(0, 2).join(', ');
    }
    
    // ===========================================
    // EVENT HANDLERS
    // ===========================================
    
    /**
     * Setup all event handlers
     */
    _setupEventHandlers() {
        // Tab switching
        this.container.querySelectorAll('.inv-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                if (tab && tab !== this.activeTab) {
                    this.activeTab = tab;
                    this.render();
                }
            });
        });
        
        // Sort button
        const sortBtn = this.container.querySelector('#invSortBtn');
        if (sortBtn) {
            sortBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.sortDropdownOpen = !this.sortDropdownOpen;
                const dropdown = this.container.querySelector('#invSortDropdown');
                if (dropdown) {
                    dropdown.classList.toggle('open', this.sortDropdownOpen);
                }
            });
        }
        
        // Sort options
        this.container.querySelectorAll('.inv-sort-option').forEach(opt => {
            opt.addEventListener('click', () => {
                const sortId = opt.dataset.sort;
                if (sortId && sortId !== this.sortBy) {
                    this.sortBy = sortId;
                    this.sortDropdownOpen = false;
                    this.render();
                }
            });
        });
        
        // Filter pills
        this.container.querySelectorAll('.inv-filter-pill:not(.potion-type-filter):not(.potion-tier-filter)').forEach(pill => {
            pill.addEventListener('click', () => {
                const filterId = pill.dataset.filter;
                if (filterId && filterId !== this.filterBy) {
                    this.filterBy = filterId;
                    this.render();
                }
            });
        });
        
        // Potion type filter pills
        this.container.querySelectorAll('.potion-type-filter').forEach(pill => {
            pill.addEventListener('click', () => {
                const filterId = pill.dataset.potionTypeFilter;
                if (filterId && filterId !== this.potionTypeFilter) {
                    this.potionTypeFilter = filterId;
                    this._refreshPotionsTab();
                }
            });
        });
        
        // Potion tier filter pills
        this.container.querySelectorAll('.potion-tier-filter').forEach(pill => {
            pill.addEventListener('click', () => {
                const filterId = pill.dataset.potionTierFilter;
                if (filterId && filterId !== this.potionTierFilter) {
                    this.potionTierFilter = filterId;
                    this._refreshPotionsTab();
                }
            });
        });
        
        // Item cards - click to show popup
        this.container.querySelectorAll('.inv-item-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // Don't trigger if clicking a button
                if (e.target.closest('button')) return;
                const itemId = card.dataset.itemId;
                if (itemId) {
                    this._showItemPopup(itemId);
                }
            });
        });
        
        // Equip gear buttons
        this.container.querySelectorAll('.inv-btn-action.equip:not(.disabled)').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const itemId = btn.dataset.itemId;
                if (itemId) {
                    this.callbacks.onEquip(itemId);
                }
            });
        });
        
        // Unequip gear buttons
        this.container.querySelectorAll('.inv-btn-action.unequip').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const itemId = btn.dataset.itemId;
                // Find the actual equipment slot key by matching item ID
                // This is needed because rings use 'ring1'/'ring2' in equipment
                // but ItemUtils.getSlot() returns 'ring' from config
                const equipSlot = this._findEquipmentSlotForItem(itemId);
                if (equipSlot) {
                    this.callbacks.onUnequip(equipSlot);
                }
            });
        });
        
        // Equip potion buttons
        this.container.querySelectorAll('.inv-btn-action.equip-potion').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const itemId = btn.dataset.itemId;
                if (itemId) {
                    this.callbacks.onEquipPotion(itemId);
                }
            });
        });
        
        // Unequip potion buttons (in equipped section)
        this.container.querySelectorAll('.inv-btn-unequip-potion').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const potionType = btn.dataset.potionType;
                if (potionType) {
                    this.callbacks.onUnequipPotion(potionType);
                }
            });
        });
        
        // Auto-potion checkboxes
        this.container.querySelectorAll('.inv-auto-potion-cb').forEach(cb => {
            cb.addEventListener('change', () => {
                const potionType = cb.dataset.potionType;
                this._handleAutoPotionToggle(potionType, cb.checked);
            });
        });
        
        // Threshold selects
        this.container.querySelectorAll('.inv-threshold-select').forEach(sel => {
            sel.addEventListener('change', () => {
                const potionType = sel.dataset.potionType;
                this._handleThresholdChange(potionType, parseFloat(sel.value));
            });
        });
        
        // Popup overlay click to close
        const overlay = this.container.querySelector('#invPopupOverlay');
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this._hideItemPopup();
                }
            });
        }
        
        // Close dropdown when clicking outside
        document.addEventListener('click', this._handleDocumentClick.bind(this), { once: true });
    }
    
    /**
     * Handle document click to close dropdown
     */
    _handleDocumentClick(e) {
        if (this.sortDropdownOpen) {
            const dropdown = this.container.querySelector('#invSortDropdown');
            const sortBtn = this.container.querySelector('#invSortBtn');
            if (dropdown && sortBtn && !dropdown.contains(e.target) && !sortBtn.contains(e.target)) {
                this.sortDropdownOpen = false;
                dropdown.classList.remove('open');
            }
        }
        document.addEventListener('click', this._handleDocumentClick.bind(this), { once: true });
    }
    
    /**
     * Handle auto-potion toggle
     */
    _handleAutoPotionToggle(potionType, enabled) {
        if (!this.player.potionSettings) {
            this.player.potionSettings = {};
        }
        
        if (potionType === 'health') {
            this.player.potionSettings.autoHealthEnabled = enabled;
        } else if (potionType === 'mana') {
            this.player.potionSettings.autoManaEnabled = enabled;
        }
        
        // Update UI
        const thresholdGroup = this.container.querySelector(`.inv-threshold-group`);
        const thresholdSelect = this.container.querySelector(`.inv-threshold-select[data-potion-type="${potionType}"]`);
        if (thresholdSelect) {
            thresholdSelect.disabled = !enabled;
            thresholdSelect.closest('.inv-threshold-group')?.classList.toggle('disabled', !enabled);
        }
        
        this.callbacks.onPotionSettingsChange(this.player.potionSettings);
        eventBus.emit(GameEvents.SAVE_GAME);
    }
    
    /**
     * Handle threshold change
     */
    _handleThresholdChange(potionType, threshold) {
        if (!this.player.potionSettings) {
            this.player.potionSettings = {};
        }
        
        if (potionType === 'health') {
            this.player.potionSettings.autoHealthThreshold = threshold;
        } else if (potionType === 'mana') {
            this.player.potionSettings.autoManaThreshold = threshold;
        }
        
        this.callbacks.onPotionSettingsChange(this.player.potionSettings);
        eventBus.emit(GameEvents.SAVE_GAME);
    }
}

export default InventoryUI;
