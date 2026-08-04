/**
 * @file StatsUI.js
 * @description Modular character stats component with visual equipment grid, combat stats,
 *              stat allocation, and XP progress. Equipment slots are clickable to show
 *              item details with unequip option. Shared between TownScreen and BattleMapUI.
 * 
 * @usage Instantiated when opening character/stats modal. Parent provides player reference
 *        and callbacks for stat allocation and UI updates.
 * @dependencies 
 *   - ItemUtils (utils/ItemUtils.js)
 *   - getClass (config/classConfig.js)
 *   - getRace (config/raceConfig.js)
 *   - EventBus, GameEvents (systems/EventBus.js)
 * 
 * @version 2.7.0
 * @changelog
 *   - v2.7.0 (2026-02-10): Added ATK/DEF per-point combat hints to stat allocation rows.
 *                          When unspent points are available, each stat row shows what
 *                          Attack and Defense gains each point provides (e.g. "⚔️ +3 ATK · 
 *                          🛡️ +1 DEF per point"). Uses same logic as CharacterCreateScreen.
 *                          New _getStatCombatHints(stat, classData) method. Uses existing
 *                          .stat-combat-hint, .hint-atk, .hint-def CSS classes (v0.23.0).
 *   - v2.6.0 (2026-02-10): Alignment combat modifier display in Attack and Defense breakdown
 *                          popups. New _buildAlignmentSection(statKey) method shows contextual
 *                          ATK/DEF bonuses from player alignment vs enemy alignments (chaotic,
 *                          neutral, good). Uses alignmentRows rendering in _renderBreakdownPopup().
 *                          Purple-tinted styling. Only shows non-zero modifiers; hidden when
 *                          alignment system disabled or player is neutral with no bonuses.
 *   - v2.5.0 (2026-02-10): Housing buff display in stat breakdown popups.
 *                          Added _buildHousingSection() method that shows relevant housing
 *                          buffs (Armory equipmentStats, Hearth hpRegen) in breakdown popups.
 *                          Added housingRows rendering support to _renderBreakdownPopup().
 *                          Housing sections appear after Equipment and before Passive Skills
 *                          in Attack, Defense, Dodge, Crit, Max HP, Max MP, and HP Regen.
 *   - v2.4.0 (2026-02-09): Added HP Regen and Mana Regen tiles to Combat Stats grid.
 *                          New tiles show per-second battle regen rate with color-coded values
 *                          (green for HP, blue for MP). Added _getPreviewHPRegen() and
 *                          _getPreviewMPRegen() methods with pending stat preview support.
 *                          Added breakdown popup support for both regen stats showing base %,
 *                          town rate comparison, and passive skill bonuses. Imports GameConfig
 *                          for regen percentages. Added healthRegen/manaRegen to passive
 *                          bonus type mappings. Grid is now a clean 3×3 (9 tiles).
 *   - v2.3.0 (2026-02-08): Added combat stat breakdown popup system. Clicking any combat
 *                          stat tile opens a detailed breakdown showing stat contributions,
 *                          equipment bonuses, and passive skill bonuses. Added Attack Speed
 *                          stat tile (placeholder, DEX-based). Updated all preview methods
 *                          to incorporate passive bonuses for accurate stat allocation previews.
 *                          Added separate breakdown overlay to avoid conflicts with item popup.
 *                          Added import of skillConfig for passive skill inspection.
 *   - v2.2.0 (2026-02-08): Empty equipment slots are now clickable. Clicking opens inventory
 *                          with the appropriate gear filter pre-selected. New onEmptySlotClick
 *                          callback passes slot name and filter category to parent.
 *   - v2.1.0 (2025-02-03): Added "🔥 Upgrade" button to equipment item popups. New onUpgradeItem
 *                          callback opens Forge with item pre-selected. Uses ForgeUI.canUpgrade()
 *                          to determine if upgrade button should be shown.
 *   - v2.0.0 (2025-01-26): Major UI redesign - new section order: Equipment (top), Combat Stats,
 *                          Attributes, XP (bottom). Equipment now shows visual 3x3 grid with
 *                          clickable slots that open item detail popup (same format as InventoryUI).
 *                          Slot order: Cape/Head/Necklace, MainHand/Body/OffHand, Ring1/Boots/Ring2.
 *   - v1.2.2 (2025-01-26): Fixed _getPreviewDodge() to include armor modifier from ArmorTypeModifiers,
 *                          matching the Character.js dodgeChance formula. DEX allocation now correctly
 *                          updates the Dodge % preview.
 *   - v1.2.1 (2025-01-19): Improved stat row layout - left side (icon, name, desc),
 *                          right side (minus, value, +pending, plus). Hidden +0 when empty.
 *   - v1.2.0 (2025-01-19): Added pending state for stat allocation with +/- buttons and confirm.
 *                          Added stat descriptions matching CharacterCreateScreen.
 *                          Combat stats now preview pending allocations before confirming.
 *   - v1.1.0 (2025-01-19): Changed Attack, Defense, Dodge, Crit display to show 1 decimal place
 *                          for better visibility of incremental stat changes.
 *   - v1.0.0 (2025-01-19): Initial implementation - extracted from BattleMapUI/TownScreen
 *                          Unified stats display with stat allocation support
 */

import { ItemUtils } from '../utils/ItemUtils.js';
import { getClass, ArmorTypeModifiers } from '../config/classConfig.js';
import { getRace } from '../config/raceConfig.js';
import { SkillType, EffectType, calculateEffectValue } from '../config/skillConfig.js';
import { GameConfig } from '../config/gameConfig.js';
import { eventBus, GameEvents } from '../systems/EventBus.js';
import { ForgeUI } from './ForgeUI.js';

export class StatsUI {
    /**
     * Create a StatsUI instance
     * @param {Object} options - Configuration options
     * @param {Object} options.player - Player/Character object
     * @param {HTMLElement} options.containerElement - Container to render into
     * @param {Function} options.onStatAllocated - Callback when stat is allocated (stat, newValue)
     * @param {Function} options.onRefreshNeeded - Callback when parent should update (e.g., status bars)
     * @param {Function} options.onUpgradeItem - Callback when upgrading item (opens forge) (optional, v2.1.0)
     * @param {Function} options.onEmptySlotClick - Callback when clicking empty gear slot (slot, filter) (optional, v2.2.0)
     */
    constructor(options) {
        this.player = options.player;
        this.container = options.containerElement;
        this.onStatAllocated = options.onStatAllocated || (() => {});
        this.onRefreshNeeded = options.onRefreshNeeded || (() => {});
        this.onUpgradeItem = options.onUpgradeItem || null;  // v2.1.0: New callback for upgrade
        this.onEmptySlotClick = options.onEmptySlotClick || null;  // v2.2.0: Empty slot click
        
        this._boundHandlers = [];
        
        // v2.2.0: Map equipment slots to inventory filter categories
        this._slotToFilter = {
            mainHand: 'weapon',
            offHand: 'shield',
            head: 'head',
            body: 'body',
            cape: 'cape',
            boots: 'boots',
            necklace: 'necklace',
            ring1: 'ring',
            ring2: 'ring'
        };
        
        // Pending stat allocation (not yet committed)
        this._pendingStats = {
            strength: 0,
            dexterity: 0,
            intelligence: 0,
            stamina: 0
        };
        this._pendingPointsUsed = 0;
        
        // Stat descriptions (matches CharacterCreateScreen)
        this._statDescriptions = {
            strength: 'Physical damage, armor effectiveness',
            dexterity: 'Attack speed, evasion, accuracy',
            intelligence: 'Spell damage, mana pool',
            stamina: 'Health pool, regeneration'
        };
    }
    
    /**
     * Render the stats UI
     */
    render() {
        if (!this.player || !this.container) return;
        
        const classData = getClass(this.player.classId);
        const raceData = getRace(this.player.raceId);
        const stats = this.player.baseStats || {};
        const totalStats = this.player.totalStats || stats;
        const equipment = this.player.equipment || {};
        const unspentPoints = this.player.unspentStatPoints || 0;
        const availablePoints = unspentPoints - this._pendingPointsUsed;
        const hasPoints = unspentPoints > 0;
        const hasPending = this._pendingPointsUsed > 0;
        
        const html = `
            <div class="character-sheet">
                <div class="char-header">
                    <span class="char-icon">${this._getClassIcon(this.player.classId)}</span>
                    <div class="char-title">
                        <h3>${this.player.name}</h3>
                        <p>Level ${this.player.level} ${raceData?.name || this.player.raceId} ${classData?.name || this.player.classId}</p>
                    </div>
                </div>
                
                <!-- 1. EQUIPMENT (at top) -->
                <div class="char-section">
                    <h4>Equipment <span class="hint">(tap to view)</span></h4>
                    <div class="equip-grid-visual">
                        ${this._buildEquipmentGridVisual(equipment)}
                    </div>
                </div>
                
                <!-- 2. COMBAT STATS -->
                <div class="char-section">
                    <h4>Combat Stats <span class="hint">(tap for breakdown)</span></h4>
                    <div class="combat-stats-grid">
                        <div class="combat-stat" data-stat="attack">
                            <span class="combat-label">Attack</span>
                            <span class="combat-value">${(this._getPreviewAttack()).toFixed(1)}</span>
                        </div>
                        <div class="combat-stat" data-stat="defense">
                            <span class="combat-label">Defense</span>
                            <span class="combat-value">${(this._getPreviewDefense()).toFixed(1)}</span>
                        </div>
                        <div class="combat-stat" data-stat="dodge">
                            <span class="combat-label">Dodge</span>
                            <span class="combat-value">${(this._getPreviewDodge() * 100).toFixed(1)}%</span>
                        </div>
                        <div class="combat-stat" data-stat="crit">
                            <span class="combat-label">Crit</span>
                            <span class="combat-value">${(this._getPreviewCrit() * 100).toFixed(1)}%</span>
                        </div>
                        <div class="combat-stat" data-stat="maxhp">
                            <span class="combat-label">Max HP</span>
                            <span class="combat-value">${this._getPreviewMaxHealth()}</span>
                        </div>
                        <div class="combat-stat" data-stat="maxmp">
                            <span class="combat-label">Max MP</span>
                            <span class="combat-value">${this._getPreviewMaxMana()}</span>
                        </div>
                        <div class="combat-stat" data-stat="speed">
                            <span class="combat-label">Atk Spd</span>
                            <span class="combat-value">${(this._getPreviewAttackSpeed() * 100).toFixed(0)}%</span>
                        </div>
                        <div class="combat-stat" data-stat="hpregen">
                            <span class="combat-label">HP Regen</span>
                            <span class="combat-value combat-value-heal">${this._getPreviewHPRegen().toFixed(1)}/s</span>
                        </div>
                        <div class="combat-stat" data-stat="mpregen">
                            <span class="combat-label">MP Regen</span>
                            <span class="combat-value combat-value-mana">${this._getPreviewMPRegen().toFixed(1)}/s</span>
                        </div>
                    </div>
                </div>
                
                <!-- 3. ATTRIBUTES -->
                <div class="char-section">
                    <h4>Attributes ${hasPoints ? '<span class="hint">(use +/- to adjust)</span>' : ''}</h4>
                    ${hasPoints ? `
                    <div class="unspent-points-banner ${hasPending ? 'has-pending' : ''}">
                        <span class="points-icon">⭐</span>
                        <span class="points-text">
                            ${hasPending 
                                ? `<strong>${availablePoints}</strong> of <strong>${unspentPoints}</strong> point${unspentPoints > 1 ? 's' : ''} remaining`
                                : `You have <strong>${unspentPoints}</strong> stat point${unspentPoints > 1 ? 's' : ''} to allocate!`
                            }
                        </span>
                    </div>
                    ` : ''}
                    <div class="stat-grid-allocate">
                        ${this._buildStatRow('strength', 'STR', '💪', stats.strength || 0, totalStats.strength || 0, hasPoints, availablePoints, classData)}
                        ${this._buildStatRow('dexterity', 'DEX', '🏃', stats.dexterity || 0, totalStats.dexterity || 0, hasPoints, availablePoints, classData)}
                        ${this._buildStatRow('intelligence', 'INT', '🧠', stats.intelligence || 0, totalStats.intelligence || 0, hasPoints, availablePoints, classData)}
                        ${this._buildStatRow('stamina', 'STA', '❤️', stats.stamina || 0, totalStats.stamina || 0, hasPoints, availablePoints, classData)}
                    </div>
                    ${hasPending ? `
                    <div class="stat-confirm-row">
                        <button class="btn-confirm-stats" id="btnConfirmStats">✓ Confirm Changes</button>
                        <button class="btn-reset-stats" id="btnResetStats">✗ Reset</button>
                    </div>
                    ` : ''}
                </div>
                
                <!-- 4. EXPERIENCE -->
                <div class="char-section">
                    <h4>Experience</h4>
                    <div class="xp-bar">
                        <div class="xp-fill" style="width: ${this._getXPPercent()}%"></div>
                        <span class="xp-text">${this.player.xp || 0} / ${this.player.xpToNextLevel || 100}</span>
                    </div>
                </div>
            </div>
            
            <!-- Item Detail Popup Overlay -->
            <div class="stats-item-popup-overlay" id="statsItemPopupOverlay">
                <div class="stats-item-popup" id="statsItemPopup"></div>
            </div>
            
            <!-- Stat Breakdown Popup Overlay (NEW v2.3.0) -->
            <div class="stat-breakdown-overlay" id="statBreakdownOverlay">
                <div class="stat-breakdown-popup" id="statBreakdownPopup"></div>
            </div>
        `;
        
        this.container.innerHTML = html;
        
        // Setup event handlers
        this._setupEquipmentClickHandlers();
        this._setupPopupHandlers();
        this._setupCombatStatClickHandlers();
        
        if (hasPoints) {
            this._setupStatAllocationHandlers();
        }
    }
    
    /**
     * Refresh the stats display
     */
    refresh() {
        this.render();
    }
    
    /**
     * Build a stat row with allocation buttons and description
     * @private
     */
    _buildStatRow(statId, label, icon, baseValue, totalValue, hasPoints, availablePoints, classData) {
        const pending = this._pendingStats[statId] || 0;
        const currentValue = baseValue + pending;
        const description = this._statDescriptions[statId] || '';
        
        // Disable minus if no pending points for this stat
        const minusDisabled = pending <= 0;
        // Disable plus if no available points
        const plusDisabled = availablePoints <= 0;
        
        // Only show pending if > 0
        const pendingHtml = pending > 0 ? `<span class="stat-pending">+${pending}</span>` : '';
        
        // Combat hint (ATK/DEF per point) - only when allocating
        const combatHint = hasPoints ? this._getStatCombatHints(statId, classData) : '';
        const combatHintHtml = combatHint ? `<div class="stat-combat-hint">${combatHint}</div>` : '';
        
        return `
            <div class="stat-row" data-stat="${statId}">
                <div class="stat-left">
                    <div class="stat-name-row">
                        <span class="stat-icon">${icon}</span>
                        <span class="stat-label">${label}</span>
                    </div>
                    <span class="stat-desc">${description}</span>
                    ${combatHintHtml}
                </div>
                <div class="stat-right">
                    ${hasPoints ? `<button class="btn-stat btn-minus" data-stat="${statId}" ${minusDisabled ? 'disabled' : ''}>−</button>` : ''}
                    <div class="stat-value-group">
                        <span class="stat-current">${currentValue}</span>
                        ${pendingHtml}
                    </div>
                    ${hasPoints ? `<button class="btn-stat btn-plus" data-stat="${statId}" ${plusDisabled ? 'disabled' : ''}>+</button>` : ''}
                </div>
            </div>
        `;
    }
    
    /**
     * Get class-specific combat hint for a stat (ATK/DEF per point)
     * Reads from classData.derivedStats multipliers
     * Ported from CharacterCreateScreen._getStatCombatHints() for consistency
     * @private
     */
    _getStatCombatHints(stat, classData) {
        if (!classData?.derivedStats) return '';
        const derived = classData.derivedStats;
        
        // Map stat name to derivedStats key suffixes
        const statKey = stat.charAt(0).toUpperCase() + stat.slice(1);
        const atkKey = `attackPer${statKey}`;
        const defKey = `defensePer${statKey}`;
        
        const atkVal = derived[atkKey] || 0;
        const defVal = derived[defKey] || 0;
        
        if (atkVal === 0 && defVal === 0) return '';
        
        let parts = [];
        if (atkVal > 0) {
            const label = atkVal === Math.max(
                derived.attackPerStrength || 0,
                derived.attackPerDexterity || 0,
                derived.attackPerIntelligence || 0
            ) ? '' : ' <span class="hint-secondary">(secondary)</span>';
            parts.push(`<span class="hint-atk">⚔️ +${atkVal} ATK</span>${label}`);
        }
        if (defVal > 0) {
            parts.push(`<span class="hint-def">🛡️ +${defVal} DEF</span>`);
        }
        
        return parts.join(' · ') + ' <span class="hint-per-point">per point</span>';
    }
    
    /**
     * Build the visual 3x3 equipment grid
     * Order: Cape, Head, Necklace / Main Hand, Body, Off Hand / Ring 1, Boots, Ring 2
     * @private
     */
    _buildEquipmentGridVisual(equipment) {
        const slotOrder = [
            { slot: 'cape', label: 'Cape', icon: '🧣' },
            { slot: 'head', label: 'Head', icon: '🪖' },
            { slot: 'necklace', label: 'Necklace', icon: '📿' },
            { slot: 'mainHand', label: 'Main Hand', icon: '⚔️' },
            { slot: 'body', label: 'Body', icon: '🥋' },
            { slot: 'offHand', label: 'Off Hand', icon: '🛡️' },
            { slot: 'ring1', label: 'Ring 1', icon: '💍' },
            { slot: 'boots', label: 'Boots', icon: '👢' },
            { slot: 'ring2', label: 'Ring 2', icon: '💍' }
        ];
        
        return slotOrder.map(({ slot, label, icon }) => {
            const item = equipment[slot];
            const isEmpty = !item;
            const itemName = item ? ItemUtils.getName(item) : 'Empty';
            const materialTier = item ? ItemUtils.getMaterialTier(item) : 0;
            const tierClass = item ? `tier-${materialTier}` : '';
            const emptyClass = isEmpty ? 'empty' : '';
            const tappableClass = isEmpty && this.onEmptySlotClick ? 'tappable' : '';
            const emptyIcon = this.onEmptySlotClick ? '➕' : '👻';
            
            return `
                <div class="equip-slot-card ${tierClass} ${emptyClass} ${tappableClass}" 
                     data-slot="${slot}"
                     ${item ? `data-item-id="${item.id}"` : ''}>
                    <span class="equip-slot-label">${label}</span>
                    <span class="equip-slot-icon">${isEmpty ? emptyIcon : icon}</span>
                    <span class="equip-slot-name ${isEmpty ? 'empty-text' : ''}">${itemName}</span>
                </div>
            `;
        }).join('');
    }
    
    /**
     * Setup click handlers for equipment slots
     * @private
     */
    _setupEquipmentClickHandlers() {
        // Filled slots - show item popup
        const slots = this.container.querySelectorAll('.equip-slot-card:not(.empty)');
        slots.forEach(slot => {
            const handler = (e) => {
                const slotName = slot.dataset.slot;
                const item = this.player.equipment?.[slotName];
                if (item) {
                    this._showItemPopup(item, slotName);
                }
            };
            slot.addEventListener('click', handler);
            this._boundHandlers.push({ element: slot, event: 'click', handler });
        });
        
        // v2.2.0: Empty slots - open inventory with matching filter
        if (this.onEmptySlotClick) {
            const emptySlots = this.container.querySelectorAll('.equip-slot-card.empty');
            emptySlots.forEach(slot => {
                const handler = (e) => {
                    const slotName = slot.dataset.slot;
                    const filter = this._slotToFilter[slotName] || 'all';
                    this.onEmptySlotClick(slotName, filter);
                };
                slot.addEventListener('click', handler);
                this._boundHandlers.push({ element: slot, event: 'click', handler });
            });
        }
    }
    
    /**
     * Setup popup overlay handlers
     * @private
     */
    _setupPopupHandlers() {
        const overlay = this.container.querySelector('#statsItemPopupOverlay');
        if (overlay) {
            const handler = (e) => {
                if (e.target === overlay) {
                    this._hideItemPopup();
                }
            };
            overlay.addEventListener('click', handler);
            this._boundHandlers.push({ element: overlay, event: 'click', handler });
        }
    }
    
    /**
     * Show item detail popup
     * @private
     */
    _showItemPopup(item, slotName) {
        const overlay = this.container.querySelector('#statsItemPopupOverlay');
        const popup = this.container.querySelector('#statsItemPopup');
        if (!overlay || !popup) return;
        
        popup.innerHTML = this._renderItemPopup(item, slotName);
        overlay.classList.add('visible');
        
        // Setup popup action handlers
        this._setupPopupActionHandlers(item, slotName);
    }
    
    /**
     * Hide item detail popup
     * @private
     */
    _hideItemPopup() {
        const overlay = this.container.querySelector('#statsItemPopupOverlay');
        if (overlay) {
            overlay.classList.remove('visible');
        }
    }
    
    /**
     * Setup popup action button handlers
     * @private
     */
    _setupPopupActionHandlers(item, slotName) {
        // Close button
        const closeBtn = this.container.querySelector('.stats-popup-close');
        if (closeBtn) {
            const handler = () => this._hideItemPopup();
            closeBtn.addEventListener('click', handler);
            this._boundHandlers.push({ element: closeBtn, event: 'click', handler });
        }
        
        // Unequip button
        const unequipBtn = this.container.querySelector('.stats-popup-btn.unequip');
        if (unequipBtn) {
            const handler = () => {
                this._unequipItem(slotName);
                this._hideItemPopup();
            };
            unequipBtn.addEventListener('click', handler);
            this._boundHandlers.push({ element: unequipBtn, event: 'click', handler });
        }
        
        // v2.1.0: Upgrade button
        const upgradeBtn = this.container.querySelector('.stats-popup-btn.upgrade');
        if (upgradeBtn) {
            const handler = () => {
                if (this.onUpgradeItem) {
                    this.onUpgradeItem(item.id, slotName);
                    this._hideItemPopup();
                }
            };
            upgradeBtn.addEventListener('click', handler);
            this._boundHandlers.push({ element: upgradeBtn, event: 'click', handler });
        }
    }
    
    /**
     * Unequip item from slot
     * @private
     */
    _unequipItem(slotName) {
        if (this.player.unequipItem) {
            this.player.unequipItem(slotName);
            eventBus.emit(GameEvents.SAVE_GAME);
            this.onRefreshNeeded();
            this.render();
        }
    }
    
    /**
     * Render item popup content
     * @private
     */
    _renderItemPopup(item, slotName) {
        const itemName = ItemUtils.getName(item);
        const itemColor = ItemUtils.getColor(item);
        const itemType = ItemUtils.getType(item);
        const slotLabel = this._getSlotLabel(slotName);
        
        // Stats
        const stats = ItemUtils.getStats(item);
        const statsHtml = this._renderPopupStats(stats);
        
        // Proc effect
        const hasProc = ItemUtils.hasProc(item);
        const procHtml = hasProc ? this._renderPopupProc(item) : '';
        
        // Details
        const materialTier = ItemUtils.getMaterialTier(item);
        const upgradeTier = ItemUtils.getTier(item);
        const materialName = item.materialId ? item.materialId.charAt(0).toUpperCase() + item.materialId.slice(1) : 'Unknown';
        const sellValue = this.player.getSellValue ? this.player.getSellValue(item) : 0;
        
        // v2.1.0: Check if item can be upgraded
        const canUpgrade = this.onUpgradeItem && ForgeUI.canUpgrade(item);
        
        return `
            <div class="stats-popup-header">
                <div class="stats-popup-title-area">
                    <div class="stats-popup-title" style="color: ${itemColor}">${itemName}</div>
                    <div class="stats-popup-subtitle">${slotLabel} • ${itemType}</div>
                </div>
                <button class="stats-popup-close">&times;</button>
            </div>
            <div class="stats-popup-body">
                ${statsHtml ? `
                    <div class="stats-popup-section">
                        <div class="stats-popup-section-title">Stats</div>
                        <div class="stats-popup-stats-grid">
                            ${statsHtml}
                        </div>
                    </div>
                ` : ''}
                
                ${procHtml}
                
                <div class="stats-popup-section">
                    <div class="stats-popup-section-title">Details</div>
                    <div class="stats-popup-info-row">
                        <span class="stats-popup-info-label">Material</span>
                        <span class="stats-popup-info-value" style="color: ${itemColor}">${materialName} (Tier ${materialTier})</span>
                    </div>
                    <div class="stats-popup-info-row">
                        <span class="stats-popup-info-label">Upgrade Tier</span>
                        <span class="stats-popup-info-value">+${upgradeTier}</span>
                    </div>
                    <div class="stats-popup-info-row">
                        <span class="stats-popup-info-label">Sell Value</span>
                        <span class="stats-popup-info-value">💰 ${sellValue}</span>
                    </div>
                </div>
            </div>
            <div class="stats-popup-actions">
                <button class="stats-popup-btn unequip" data-slot="${slotName}">Unequip</button>
                ${canUpgrade 
                    ? `<button class="stats-popup-btn upgrade" data-action="upgrade">🔥 Upgrade</button>`
                    : ''
                }
            </div>
        `;
    }
    
    /**
     * Render popup stats section
     * @private
     */
    _renderPopupStats(stats) {
        if (!stats || Object.keys(stats).length === 0) return '';
        
        const statAbbrevs = {
            attack: 'ATK', defense: 'DEF', health: 'HP', mana: 'MP',
            magicDamage: 'MAG', strength: 'STR', dexterity: 'DEX',
            intelligence: 'INT', stamina: 'STA', dodge: 'DOD', critChance: 'CRT'
        };
        
        return Object.entries(stats)
            .filter(([_, val]) => val && val !== 0)
            .map(([stat, val]) => {
                const abbrev = statAbbrevs[stat] || stat.slice(0, 3).toUpperCase();
                const displayVal = stat === 'dodge' || stat === 'critChance'
                    ? `${Math.round(val * 100)}%`
                    : `+${Math.round(val)}`;
                return `
                    <div class="stats-popup-stat">
                        <span class="stats-popup-stat-label">${abbrev}</span>
                        <span class="stats-popup-stat-value">${displayVal}</span>
                    </div>
                `;
            }).join('');
    }
    
    /**
     * Render popup proc effect section
     * @private
     */
    _renderPopupProc(item) {
        const procId = item.procId;
        const procEffect = ItemUtils.getProcEffect(item);
        
        const procNames = {
            'flaming': '🔥 Flaming',
            'icy': '❄️ Icy',
            'crackling': '⚡ Crackling',
            'sickly': '☠️ Sickly',
            'vampiric': '🧛 Vampiric'
        };
        
        const procDescriptions = {
            'flaming': '10% chance on hit to deal bonus fire damage.',
            'icy': '10% chance on hit to slow enemy.',
            'crackling': '10% chance on hit to chain lightning.',
            'sickly': '10% chance on hit to poison enemy.',
            'vampiric': '10% chance on hit to heal for damage dealt.'
        };
        
        const procName = procNames[procId] || procId;
        const procDesc = procDescriptions[procId] || 'Special effect on hit.';
        
        return `
            <div class="stats-popup-section">
                <div class="stats-popup-section-title">Special Effect</div>
                <div class="stats-popup-proc">
                    <div class="stats-popup-proc-name">${procName}</div>
                    <div class="stats-popup-proc-desc">${procDesc}</div>
                </div>
            </div>
        `;
    }
    
    /**
     * Get slot display label
     * @private
     */
    _getSlotLabel(slotName) {
        const labels = {
            head: 'HEAD', necklace: 'NECK', body: 'BODY', cape: 'CAPE',
            mainHand: 'MAIN HAND', offHand: 'OFF HAND',
            ring1: 'RING', ring2: 'RING', boots: 'BOOTS'
        };
        return labels[slotName] || slotName.toUpperCase();
    }
    
    /**
     * Build the equipment summary grid (LEGACY - kept for compatibility)
     * @private
     */
    _buildEquipmentGrid(equipment) {
        const slotNames = {
            head: 'Head',
            necklace: 'Necklace',
            body: 'Body',
            cape: 'Cape',
            mainHand: 'Main Hand',
            offHand: 'Off Hand',
            ring1: 'Ring 1',
            ring2: 'Ring 2',
            boots: 'Boots'
        };
        
        return Object.entries(slotNames).map(([slot, name]) => {
            const item = equipment[slot];
            const itemName = item ? ItemUtils.getName(item) : '—';
            const filledClass = item ? 'filled' : 'empty';
            
            return `
                <div class="equip-slot ${filledClass}">
                    <span class="slot-name">${name}</span>
                    <span class="slot-item">${itemName}</span>
                </div>
            `;
        }).join('');
    }
    
    /**
     * Setup click handlers for stat allocation buttons
     * @private
     */
    _setupStatAllocationHandlers() {
        // Plus buttons
        const plusButtons = this.container.querySelectorAll('.btn-plus');
        plusButtons.forEach(btn => {
            const handler = (e) => {
                e.stopPropagation();
                const stat = btn.dataset.stat;
                this._adjustPendingStat(stat, 1);
            };
            btn.addEventListener('click', handler);
            this._boundHandlers.push({ element: btn, event: 'click', handler });
        });
        
        // Minus buttons
        const minusButtons = this.container.querySelectorAll('.btn-minus');
        minusButtons.forEach(btn => {
            const handler = (e) => {
                e.stopPropagation();
                const stat = btn.dataset.stat;
                this._adjustPendingStat(stat, -1);
            };
            btn.addEventListener('click', handler);
            this._boundHandlers.push({ element: btn, event: 'click', handler });
        });
        
        // Confirm button
        const confirmBtn = this.container.querySelector('#btnConfirmStats');
        if (confirmBtn) {
            const handler = (e) => {
                e.stopPropagation();
                this._confirmPendingStats();
            };
            confirmBtn.addEventListener('click', handler);
            this._boundHandlers.push({ element: confirmBtn, event: 'click', handler });
        }
        
        // Reset button
        const resetBtn = this.container.querySelector('#btnResetStats');
        if (resetBtn) {
            const handler = (e) => {
                e.stopPropagation();
                this._resetPendingStats();
            };
            resetBtn.addEventListener('click', handler);
            this._boundHandlers.push({ element: resetBtn, event: 'click', handler });
        }
    }
    
    /**
     * Adjust pending stat points
     * @private
     */
    _adjustPendingStat(stat, delta) {
        const unspentPoints = this.player.unspentStatPoints || 0;
        const availablePoints = unspentPoints - this._pendingPointsUsed;
        
        if (delta > 0 && availablePoints <= 0) return;
        if (delta < 0 && this._pendingStats[stat] <= 0) return;
        
        this._pendingStats[stat] += delta;
        this._pendingPointsUsed += delta;
        
        // Refresh display (but don't save yet)
        this.render();
    }
    
    /**
     * Confirm and apply all pending stat allocations
     * @private
     */
    _confirmPendingStats() {
        if (this._pendingPointsUsed <= 0) return;
        
        // Apply each pending stat
        for (const [stat, points] of Object.entries(this._pendingStats)) {
            if (points > 0) {
                this.player.assignStatPoints(stat, points);
                this.onStatAllocated(stat, this.player.baseStats[stat]);
            }
        }
        
        // Save game
        eventBus.emit(GameEvents.SAVE_GAME);
        
        // Reset pending state
        this._resetPendingStats(false); // Don't re-render, we'll do it below
        
        // Notify parent and refresh
        this.onRefreshNeeded();
        this.render();
    }
    
    /**
     * Reset pending stat allocations
     * @private
     */
    _resetPendingStats(doRender = true) {
        this._pendingStats = {
            strength: 0,
            dexterity: 0,
            intelligence: 0,
            stamina: 0
        };
        this._pendingPointsUsed = 0;
        
        if (doRender) {
            this.render();
        }
    }
    
    /**
     * Get preview attack speed with pending stats
     * @private
     */
    _getPreviewAttackSpeed() {
        if (this._pendingPointsUsed === 0) {
            return this.player.attackSpeed || 1.0;
        }
        
        const stats = this._getPreviewTotalStats();
        let speed = 1.0;
        const dexAboveBase = Math.max(0, stats.dexterity - 10);
        speed += dexAboveBase * 0.005;
        
        const passiveSpeedBonus = this.player._passiveBonuses?.attackSpeed || 0;
        if (passiveSpeedBonus > 0) {
            speed *= (1 + passiveSpeedBonus / 100);
        }
        
        return Math.round(speed * 1000) / 1000;
    }
    
    /**
     * Get preview HP regen per second with pending stats
     * Uses battle regen rate from GameConfig + passive bonuses
     * @private
     */
    _getPreviewHPRegen() {
        const regenConfig = GameConfig.regen || {};
        const battlePercent = regenConfig.battleHealthPercent || 0.01;
        const maxHP = this._getPreviewMaxHealth();
        const passiveRegen = this.player._passiveBonuses?.healthRegen || 0;
        
        return (battlePercent * maxHP) + passiveRegen;
    }
    
    /**
     * Get preview MP regen per second with pending stats
     * Uses battle regen rate from GameConfig + passive bonuses
     * @private
     */
    _getPreviewMPRegen() {
        const regenConfig = GameConfig.regen || {};
        const battlePercent = regenConfig.battleManaPercent || 0.01;
        const maxMP = this._getPreviewMaxMana();
        const passiveRegen = this.player._passiveBonuses?.manaRegen || 0;
        
        return (battlePercent * maxMP) + passiveRegen;
    }
    
    // === Combat Stat Breakdown System (v2.3.0) ===
    
    /**
     * Setup click handlers for combat stat tiles
     * @private
     */
    _setupCombatStatClickHandlers() {
        const combatStats = this.container.querySelectorAll('.combat-stat[data-stat]');
        combatStats.forEach(stat => {
            const handler = () => this._showStatBreakdown(stat.dataset.stat);
            stat.addEventListener('click', handler);
            this._boundHandlers.push({ element: stat, event: 'click', handler });
        });
        
        // Setup breakdown overlay dismiss
        const breakdownOverlay = this.container.querySelector('#statBreakdownOverlay');
        if (breakdownOverlay) {
            const handler = (e) => {
                if (e.target === breakdownOverlay) this._hideStatBreakdown();
            };
            breakdownOverlay.addEventListener('click', handler);
            this._boundHandlers.push({ element: breakdownOverlay, event: 'click', handler });
        }
    }
    
    /**
     * Show stat breakdown popup for a given stat key
     * @private
     */
    _showStatBreakdown(statKey) {
        const overlay = this.container.querySelector('#statBreakdownOverlay');
        const popup = this.container.querySelector('#statBreakdownPopup');
        if (!overlay || !popup) return;
        
        const data = this._getStatBreakdown(statKey);
        if (!data) return;
        
        popup.innerHTML = this._renderBreakdownPopup(data);
        overlay.classList.add('visible');
        
        // Setup close button
        const closeBtn = popup.querySelector('.breakdown-close');
        if (closeBtn) {
            const handler = () => this._hideStatBreakdown();
            closeBtn.addEventListener('click', handler);
            this._boundHandlers.push({ element: closeBtn, event: 'click', handler });
        }
    }
    
    /**
     * Hide stat breakdown popup
     * @private
     */
    _hideStatBreakdown() {
        const overlay = this.container.querySelector('#statBreakdownOverlay');
        if (overlay) overlay.classList.remove('visible');
    }
    
    /**
     * Get breakdown data for a specific combat stat
     * @private
     * @param {string} statKey - One of: attack, defense, dodge, crit, maxhp, maxmp, speed, hpregen, mpregen
     * @returns {Object} Breakdown data object
     */
    _getStatBreakdown(statKey) {
        const classData = getClass(this.player.classId);
        const raceData = getRace(this.player.raceId);
        const derived = classData?.derivedStats || {};
        const stats = this.player.totalStats;
        const baseStats = this.player.baseStats;
        const className = classData?.name || this.player.classId;
        const raceName = raceData?.name || this.player.raceId;
        const subtitle = `${raceName} ${className}`;
        const passives = this.player._passiveBonuses || {};
        
        switch (statKey) {
            case 'attack': {
                let attack = 0;
                const rows = [];
                
                if (derived.attackPerStrength) {
                    const val = stats.strength * derived.attackPerStrength;
                    attack += val;
                    rows.push({ icon: '💪', label: `STR × ${derived.attackPerStrength}`, detail: `${stats.strength} STR × ${derived.attackPerStrength} per point (${className})`, value: `= ${val.toFixed(1)}`, type: 'positive' });
                }
                if (derived.attackPerDexterity) {
                    const val = stats.dexterity * derived.attackPerDexterity;
                    attack += val;
                    rows.push({ icon: '🏃', label: `DEX × ${derived.attackPerDexterity}`, detail: `${stats.dexterity} DEX × ${derived.attackPerDexterity} per point (${className})`, value: `= ${val.toFixed(1)}`, type: 'positive' });
                }
                if (derived.attackPerIntelligence) {
                    const val = stats.intelligence * derived.attackPerIntelligence;
                    attack += val;
                    rows.push({ icon: '🧠', label: `INT × ${derived.attackPerIntelligence}`, detail: `${stats.intelligence} INT × ${derived.attackPerIntelligence} per point (${className})`, value: `= ${val.toFixed(1)}`, type: 'positive' });
                }
                
                const equipAtk = this.player._getEquipmentAttackBonus?.() || 0;
                const equipRows = this._getEquipmentBreakdownRows('attack');
                
                let finalAttack = attack + equipAtk;
                const passiveDmg = passives.damage || 0;
                if (passiveDmg > 0) finalAttack *= (1 + passiveDmg / 100);
                
                return {
                    icon: '⚔️', title: 'Attack Power', subtitle, finalValue: finalAttack.toFixed(1), finalUnit: '',
                    formula: 'Stat × Multiplier + Equipment × Passive%',
                    sections: [
                        { title: 'Stat Contribution', rows },
                        { title: 'Equipment Attack', equipRows, subtotal: { label: 'Equip Total', value: `+${equipAtk.toFixed(1)}` } },
                        ...this._buildHousingSection('attack'),
                        ...this._buildAlignmentSection('attack'),
                        ...this._buildPassiveSection('damage', passiveDmg > 0 ? `×${(1 + passiveDmg / 100).toFixed(2)} (${passiveDmg}%)` : null)
                    ]
                };
            }
            
            case 'defense': {
                let defense = 0;
                const rows = [];
                
                if (derived.defensePerStrength) { const v = stats.strength * derived.defensePerStrength; defense += v; rows.push({ icon: '💪', label: `STR × ${derived.defensePerStrength}`, detail: `${stats.strength} STR`, value: `= ${v.toFixed(1)}`, type: 'positive' }); }
                if (derived.defensePerDexterity) { const v = stats.dexterity * derived.defensePerDexterity; defense += v; rows.push({ icon: '🏃', label: `DEX × ${derived.defensePerDexterity}`, detail: `${stats.dexterity} DEX`, value: `= ${v.toFixed(1)}`, type: 'positive' }); }
                if (derived.defensePerIntelligence) { const v = stats.intelligence * derived.defensePerIntelligence; defense += v; rows.push({ icon: '🧠', label: `INT × ${derived.defensePerIntelligence}`, detail: `${stats.intelligence} INT`, value: `= ${v.toFixed(1)}`, type: 'positive' }); }
                if (derived.defensePerStamina) { const v = stats.stamina * derived.defensePerStamina; defense += v; rows.push({ icon: '❤️', label: `STA × ${derived.defensePerStamina}`, detail: `${stats.stamina} STA`, value: `= ${v.toFixed(1)}`, type: 'positive' }); }
                
                const equipDef = this.player._getEquipmentDefenseBonus?.() || 0;
                const equipRows = this._getEquipmentBreakdownRows('defense');
                
                let finalDef = defense + equipDef;
                const passiveDef = passives.defense || 0;
                if (passiveDef > 0) finalDef *= (1 + passiveDef / 100);
                
                return {
                    icon: '🛡️', title: 'Defense Power', subtitle, finalValue: finalDef.toFixed(1), finalUnit: '',
                    formula: 'Stat × Multiplier + Equipment × Passive%',
                    sections: [
                        { title: 'Stat Contribution', rows },
                        { title: 'Equipment Defense', equipRows, subtotal: { label: 'Equip Total', value: `+${equipDef.toFixed(1)}` } },
                        ...this._buildHousingSection('defense'),
                        ...this._buildAlignmentSection('defense'),
                        ...this._buildPassiveSection('defense', passiveDef > 0 ? `×${(1 + passiveDef / 100).toFixed(2)} (${passiveDef}%)` : null)
                    ]
                };
            }
            
            case 'dodge': {
                const baseDodge = stats.dexterity * 0.002;
                const raceDodge = raceData?.traits?.dodgeBonus || 0;
                const equipDodge = this.player._getEquipmentDodgeBonus?.() || 0;
                const passiveDodge = passives.dodge || 0;
                const finalDodge = this.player.dodgeChance;
                
                const rows = [
                    { icon: '🏃', label: `DEX × 0.2%`, detail: `${stats.dexterity} DEX × 0.002 per point`, value: `${(baseDodge * 100).toFixed(1)}%`, type: 'positive' },
                    { icon: '🧬', label: `${raceName} Bonus`, detail: raceDodge > 0 ? 'Racial dodge bonus' : 'No dodge bonus from race', value: `+${(raceDodge * 100).toFixed(1)}%`, type: raceDodge > 0 ? 'positive' : 'neutral' }
                ];
                
                const equipRows = this._getEquipmentBreakdownRows('dodge');
                
                return {
                    icon: '💨', title: 'Dodge Chance', subtitle, finalValue: (finalDodge * 100).toFixed(1), finalUnit: '%',
                    formula: '(DEX × 0.2%) + Race + Equipment + Passive', cap: 'Capped at 50%',
                    sections: [
                        { title: 'Base Dodge', rows },
                        { title: 'Equipment Dodge', equipRows, subtotal: { label: 'Equip Total', value: `+${(equipDodge * 100).toFixed(1)}%` } },
                        ...this._buildHousingSection('dodge'),
                        ...this._buildPassiveSection('dodge', passiveDodge > 0 ? `+${(passiveDodge * 100).toFixed(1)}%` : null)
                    ]
                };
            }
            
            case 'crit': {
                const baseCrit = derived.baseCritChance || 0.05;
                const dexCrit = derived.critPerDexterity ? stats.dexterity * derived.critPerDexterity : 0;
                const equipCrit = this.player._getEquipmentCritBonus?.() || 0;
                const raceCrit = raceData?.traits?.critBonus || 0;
                const passiveCrit = passives.critChance || 0;
                const finalCrit = this.player.critChance;
                
                const rows = [
                    { icon: '🎯', label: 'Base Crit', detail: `${className} base crit chance`, value: `${(baseCrit * 100).toFixed(1)}%`, type: 'positive' }
                ];
                if (derived.critPerDexterity) {
                    rows.push({ icon: '🏃', label: `DEX × ${(derived.critPerDexterity * 100).toFixed(2)}%`, detail: `${stats.dexterity} DEX scaling`, value: `+${(dexCrit * 100).toFixed(1)}%`, type: 'positive' });
                }
                rows.push({ icon: '🧬', label: `${raceName} Bonus`, detail: raceCrit > 0 ? 'Racial crit bonus' : 'No crit bonus from race', value: `+${(raceCrit * 100).toFixed(1)}%`, type: raceCrit > 0 ? 'positive' : 'neutral' });
                
                const equipRows = this._getEquipmentBreakdownRows('critChance');
                
                return {
                    icon: '💥', title: 'Crit Chance', subtitle, finalValue: (finalCrit * 100).toFixed(1), finalUnit: '%',
                    formula: 'Base + DEX Scaling + Race + Equipment + Passive', cap: 'Capped at 75%',
                    sections: [
                        { title: 'Crit Sources', rows },
                        { title: 'Equipment Crit', equipRows, subtotal: { label: 'Equip Total', value: `+${(equipCrit * 100).toFixed(1)}%` } },
                        ...this._buildHousingSection('crit'),
                        ...this._buildPassiveSection('critChance', passiveCrit > 0 ? `+${(passiveCrit * 100).toFixed(1)}%` : null)
                    ]
                };
            }
            
            case 'maxhp': {
                const healthPerSta = derived.healthPerStamina || 10;
                const baseHP = stats.stamina * healthPerSta;
                const passiveHP = passives.maxHealth || 0;
                const finalHP = this.player.maxHealth;
                
                const classBonus = classData?.statBonus?.stamina || 0;
                const raceBonus = raceData?.statBonus?.stamina || 0;
                const allocated = baseStats.stamina - 10; // 10 is starting value
                
                return {
                    icon: '❤️', title: 'Max Health', subtitle, finalValue: `${finalHP}`, finalUnit: ' HP',
                    formula: `(STA × ${healthPerSta}) + Passive HP`,
                    sections: [
                        {
                            title: 'Formula',
                            rows: [
                                { icon: '🫀', label: `STA × ${healthPerSta}`, detail: `${stats.stamina} STA × ${healthPerSta} HP per point (${className})`, value: `= ${baseHP}`, type: 'positive' }
                            ]
                        },
                        {
                            title: 'Stamina Breakdown',
                            rows: [
                                { icon: '📊', label: 'Base Stamina', detail: 'Starting value', value: '10', type: 'positive' },
                                { icon: '⬆️', label: 'Allocated Points', detail: 'Player-assigned stat points', value: `+${allocated}`, type: allocated > 0 ? 'positive' : 'neutral' },
                                { icon: '⚔️', label: `${className} Bonus`, detail: 'Class stat bonus', value: `+${classBonus}`, type: classBonus > 0 ? 'positive' : 'neutral' },
                                { icon: '🧬', label: `${raceName} Bonus`, detail: 'Race stat bonus', value: `+${raceBonus}`, type: raceBonus > 0 ? 'positive' : 'neutral' }
                            ],
                            subtotal: { label: 'Total STA', value: `${stats.stamina}` }
                        },
                        ...this._buildHousingSection('maxhp'),
                        ...this._buildPassiveSection('maxHealth', passiveHP > 0 ? `+${passiveHP} HP` : null)
                    ]
                };
            }
            
            case 'maxmp': {
                const manaPerInt = derived.manaPerIntelligence || 8;
                const baseMP = stats.intelligence * manaPerInt;
                const passiveMP = passives.maxMana || 0;
                const finalMP = this.player.maxMana;
                
                const classBonus = classData?.statBonus?.intelligence || 0;
                const raceBonus = raceData?.statBonus?.intelligence || 0;
                const allocated = baseStats.intelligence - 10;
                
                return {
                    icon: '💧', title: 'Max Mana', subtitle, finalValue: `${finalMP}`, finalUnit: ' MP',
                    formula: `(INT × ${manaPerInt}) + Passive MP`,
                    sections: [
                        {
                            title: 'Formula',
                            rows: [
                                { icon: '✨', label: `INT × ${manaPerInt}`, detail: `${stats.intelligence} INT × ${manaPerInt} MP per point (${className})`, value: `= ${baseMP}`, type: 'positive' }
                            ]
                        },
                        {
                            title: 'Intelligence Breakdown',
                            rows: [
                                { icon: '📊', label: 'Base Intelligence', detail: 'Starting value', value: '10', type: 'positive' },
                                { icon: '⬆️', label: 'Allocated Points', detail: 'Player-assigned stat points', value: `+${allocated}`, type: allocated > 0 ? 'positive' : 'neutral' },
                                { icon: '⚔️', label: `${className} Bonus`, detail: 'Class stat bonus', value: `+${classBonus}`, type: classBonus > 0 ? 'positive' : 'neutral' },
                                { icon: '🧬', label: `${raceName} Bonus`, detail: 'Race stat bonus', value: `+${raceBonus}`, type: raceBonus > 0 ? 'positive' : 'neutral' }
                            ],
                            subtotal: { label: 'Total INT', value: `${stats.intelligence}` }
                        },
                        ...this._buildHousingSection('maxmp'),
                        ...this._buildPassiveSection('maxMana', passiveMP > 0 ? `+${passiveMP} MP` : null)
                    ]
                };
            }
            
            case 'speed': {
                const dexAboveBase = Math.max(0, stats.dexterity - 10);
                const dexSpeedBonus = dexAboveBase * 0.005;
                const passiveSpd = passives.attackSpeed || 0;
                const finalSpeed = this.player.attackSpeed || 1.0;
                
                const rows = [
                    { icon: '📊', label: 'Base Speed', detail: 'Default attack speed', value: '100%', type: 'positive' },
                    { icon: '🏃', label: `DEX Bonus`, detail: `${dexAboveBase} DEX above 10 × 0.5% each`, value: `+${(dexSpeedBonus * 100).toFixed(1)}%`, type: dexSpeedBonus > 0 ? 'positive' : 'neutral' }
                ];
                
                return {
                    icon: '⚡', title: 'Attack Speed', subtitle, finalValue: `${(finalSpeed * 100).toFixed(0)}`, finalUnit: '%',
                    formula: '100% + (DEX above 10 × 0.5%) × Passive%',
                    note: 'Attack speed affects how quickly you auto-attack in combat. Higher is faster.',
                    sections: [
                        { title: 'Speed Sources', rows },
                        ...this._buildPassiveSection('attackSpeed', passiveSpd > 0 ? `×${(1 + passiveSpd / 100).toFixed(2)} (${passiveSpd}%)` : null)
                    ]
                };
            }
            
            case 'hpregen': {
                const regenConfig = GameConfig.regen || {};
                const battlePercent = regenConfig.battleHealthPercent || 0.01;
                const townPercent = regenConfig.townHealthPercent || 0.05;
                const maxHP = this.player.maxHealth || 0;
                const battleBase = battlePercent * maxHP;
                const townBase = townPercent * maxHP;
                const passiveHPRegen = passives.healthRegen || 0;
                
                // Include housing hpRegen buff in final value (matches GameLoop._regenTick)
                const housingHPBuff = (this.player._housingBuffs || this.player.housingBuffs || {}).hpRegen || 0;
                const housingMult = 1 + (housingHPBuff / 100);
                const finalBattleRegen = Math.floor(battleBase * housingMult) + passiveHPRegen;
                
                const rows = [
                    { icon: '⚔️', label: `Battle Base (${(battlePercent * 100).toFixed(0)}%)`, detail: `${(battlePercent * 100)}% of ${maxHP} Max HP per tick`, value: `${battleBase.toFixed(1)}/s`, type: 'positive' },
                    { icon: '🏘️', label: `Town Base (${(townPercent * 100).toFixed(0)}%)`, detail: `${(townPercent * 100)}% of ${maxHP} Max HP per tick (in town)`, value: `${townBase.toFixed(1)}/s`, type: 'neutral' }
                ];
                
                return {
                    icon: '💚', title: 'HP Regen', subtitle, finalValue: finalBattleRegen.toFixed(1), finalUnit: '/s',
                    formula: '(Regen% × Max HP × Housing%) + Passive',
                    note: 'Shows battle regen rate. Town regen is 5× faster. Regen ticks every 1 second.',
                    sections: [
                        { title: 'Base Regen', rows },
                        ...this._buildHousingSection('hpregen'),
                        ...this._buildPassiveSection('healthRegen', passiveHPRegen > 0 ? `+${passiveHPRegen.toFixed(1)} HP/s` : null)
                    ]
                };
            }
            
            case 'mpregen': {
                const regenConfig = GameConfig.regen || {};
                const battlePercent = regenConfig.battleManaPercent || 0.01;
                const townPercent = regenConfig.townManaPercent || 0.05;
                const maxMP = this.player.maxMana || 0;
                const battleBase = battlePercent * maxMP;
                const townBase = townPercent * maxMP;
                const passiveMPRegen = passives.manaRegen || 0;
                const finalBattleRegen = battleBase + passiveMPRegen;
                
                const rows = [
                    { icon: '⚔️', label: `Battle Base (${(battlePercent * 100).toFixed(0)}%)`, detail: `${(battlePercent * 100)}% of ${maxMP} Max MP per tick`, value: `${battleBase.toFixed(1)}/s`, type: 'positive' },
                    { icon: '🏠', label: `Town Base (${(townPercent * 100).toFixed(0)}%)`, detail: `${(townPercent * 100)}% of ${maxMP} Max MP per tick (in town)`, value: `${townBase.toFixed(1)}/s`, type: 'neutral' }
                ];
                
                return {
                    icon: '💙', title: 'MP Regen', subtitle, finalValue: finalBattleRegen.toFixed(1), finalUnit: '/s',
                    formula: '(Regen% × Max MP) + Passive Bonus',
                    note: 'Shows battle regen rate. Town regen is 5× faster. Regen ticks every 1 second.',
                    sections: [
                        { title: 'Base Regen', rows },
                        ...this._buildPassiveSection('manaRegen', passiveMPRegen > 0 ? `+${passiveMPRegen.toFixed(1)} MP/s` : null)
                    ]
                };
            }
            
            default:
                return null;
        }
    }
    
    /**
     * Build passive skills section for breakdown popup.
     * Returns an array with 0 or 1 section objects.
     * @private
     */
    _buildPassiveSection(bonusKey, formattedValue) {
        const passiveRows = this._getPassiveSkillRows(bonusKey);
        
        if (passiveRows.length === 0 && !formattedValue) {
            return []; // Omit section entirely if no passive skills
        }
        
        if (passiveRows.length === 0) {
            return [{
                title: 'Passive Skills',
                passiveRows: [{ name: 'No passive skills', rank: 0, value: formattedValue || '+0', detail: '' }]
            }];
        }
        
        return [{
            title: 'Passive Skills',
            passiveRows,
            subtotal: formattedValue ? { label: 'Passive Total', value: formattedValue } : undefined
        }];
    }
    
    /**
     * Get passive skill rows for a given bonus key
     * @private
     */
    _getPassiveSkillRows(bonusKey) {
        if (!this.player.learnedSkills) return [];
        
        // Map bonus keys to EffectTypes
        const bonusToEffectTypes = {
            damage: [EffectType.BUFF_DAMAGE],
            defense: [EffectType.BUFF_DEFENSE, EffectType.BUFF_ARMOR],
            critChance: [EffectType.BUFF_CRIT_CHANCE],
            critDamage: [EffectType.BUFF_CRIT_DAMAGE],
            dodge: [EffectType.BUFF_DODGE],
            maxHealth: [EffectType.BUFF_MAX_HEALTH],
            maxMana: [EffectType.BUFF_MAX_MANA],
            attackSpeed: [EffectType.BUFF_ATTACK_SPEED],
            healthRegen: [EffectType.BUFF_HEALTH_REGEN],
            manaRegen: [EffectType.BUFF_MANA_REGEN],
            lifesteal: [EffectType.LIFESTEAL],
            armorPenetration: [EffectType.ARMOR_PENETRATION]
        };
        
        const targetEffectTypes = bonusToEffectTypes[bonusKey] || [];
        if (targetEffectTypes.length === 0) return [];
        
        const rows = [];
        
        for (const [skillId, skill] of Object.entries(this.player.learnedSkills)) {
            const skillType = skill.type || skill.config?.type;
            const isPassive = skill.isPassive || (skillType === SkillType.PASSIVE);
            if (!isPassive) continue;
            
            const effects = skill.effects || skill.config?.effects || [];
            const config = skill.config || skill;
            const rank = skill.rank || 1;
            const name = skill.name || skill.config?.name || skillId;
            
            for (let i = 0; i < effects.length; i++) {
                const effect = effects[i];
                if (!targetEffectTypes.includes(effect.type)) continue;
                
                const value = calculateEffectValue(config, rank, i, this.player);
                let displayValue;
                
                // Format based on bonus type
                if (bonusKey === 'critChance' || bonusKey === 'dodge') {
                    displayValue = `+${(value).toFixed(1)}%`; // value is raw, will be /100 in aggregation
                } else if (bonusKey === 'maxHealth') {
                    displayValue = `+${value} HP`;
                } else if (bonusKey === 'maxMana') {
                    displayValue = `+${value} MP`;
                } else if (bonusKey === 'healthRegen') {
                    displayValue = `+${value} HP/s`;
                } else if (bonusKey === 'manaRegen') {
                    displayValue = `+${value} MP/s`;
                } else if (bonusKey === 'damage' || bonusKey === 'defense' || bonusKey === 'attackSpeed') {
                    displayValue = `+${value}%`;
                } else {
                    displayValue = `+${value}`;
                }
                
                rows.push({
                    name,
                    rank,
                    value: displayValue,
                    detail: `Rank ${rank} passive bonus`
                });
            }
        }
        
        return rows;
    }
    
    /**
     * Build housing buff section for breakdown popup.
     * Returns an array with 0 or 1 section objects.
     * Shows relevant housing buffs (Armory equipmentStats, Hearth hpRegen) per stat.
     * @private
     * @param {string} statKey - The combat stat being broken down
     * @returns {Array} Section objects for the breakdown popup
     */
    _buildHousingSection(statKey) {
        const housingBuffs = this.player._housingBuffs || this.player.housingBuffs || {};
        const housingLevels = this.player.housingLevels || {};
        const rows = [];

        // Map stat keys to relevant housing buffs
        const statToHousingBuffs = {
            attack: ['equipmentStats'],
            defense: ['equipmentStats'],
            dodge: ['equipmentStats'],
            crit: ['equipmentStats'],
            maxhp: ['equipmentStats'],
            maxmp: ['equipmentStats'],
            hpregen: ['hpRegen']
        };

        const relevantBuffs = statToHousingBuffs[statKey] || [];
        if (relevantBuffs.length === 0) return [];

        // Structure names for display
        const buffToStructure = {
            equipmentStats: { name: 'Armory', icon: '⚔️', structureId: 'armory' },
            hpRegen: { name: 'Hearth', icon: '🔥', structureId: 'hearth' }
        };

        for (const buffId of relevantBuffs) {
            const value = housingBuffs[buffId] || 0;
            if (value <= 0) continue;

            const info = buffToStructure[buffId];
            if (!info) continue;

            const level = housingLevels[info.structureId] || 0;

            let displayValue;
            if (buffId === 'equipmentStats') {
                displayValue = `+${value.toFixed(1)}% equip stats`;
            } else if (buffId === 'hpRegen') {
                displayValue = `+${value.toFixed(1)}% regen`;
            } else {
                displayValue = `+${value.toFixed(1)}%`;
            }

            rows.push({
                icon: info.icon,
                label: `${info.name} (Lv${level})`,
                value: displayValue,
                detail: 'Housing structure buff'
            });
        }

        if (rows.length === 0) return [];

        return [{
            title: '🏠 Housing Buffs',
            housingRows: rows
        }];
    }
    
    /**
     * Build alignment combat modifier section for breakdown popup.
     * Shows contextual ATK/DEF bonuses from player alignment vs enemy alignments.
     * Only appears in 'attack' and 'defense' breakdowns since alignment only modifies those.
     * Returns an array with 0 or 1 section objects.
     * @private
     * @param {string} statKey - 'attack' or 'defense'
     * @returns {Array} Section objects for the breakdown popup
     */
    _buildAlignmentSection(statKey) {
        if (statKey !== 'attack' && statKey !== 'defense') return [];
        
        const alignmentConfig = GameConfig.alignment;
        if (!alignmentConfig?.enabled) return [];
        
        const playerAlign = this.player.alignment || 'neutral';
        const modifiers = alignmentConfig.modifiers?.[playerAlign];
        if (!modifiers) return [];
        
        const rows = [];
        const alignIcons = { good: '😇', neutral: '⚖️', chaotic: '😈' };
        const alignNames = { good: 'Good', neutral: 'Neutral', chaotic: 'Chaotic' };
        const field = statKey === 'attack' ? 'attack' : 'defense';
        
        // Show modifier vs each enemy alignment (only non-zero values)
        for (const [enemyAlign, mods] of Object.entries(modifiers)) {
            const value = mods[field] || 0;
            if (value === 0) continue;
            
            const sign = value > 0 ? '+' : '';
            rows.push({
                icon: alignIcons[enemyAlign] || '⚖️',
                label: `vs ${alignNames[enemyAlign] || enemyAlign}`,
                value: `${sign}${value}% ${field === 'attack' ? 'ATK' : 'DEF'}`,
                positive: value > 0
            });
        }
        
        if (rows.length === 0) return [];
        
        const playerAlignIcon = alignIcons[playerAlign] || '⚖️';
        const playerAlignName = alignNames[playerAlign] || playerAlign;
        
        return [{
            title: `${playerAlignIcon} Alignment: ${playerAlignName}`,
            alignmentRows: rows,
            note: 'Applied in combat based on enemy alignment'
        }];
    }
    
    /**
     * Get equipment breakdown rows for a given stat
     * @private
     */
    _getEquipmentBreakdownRows(statKey) {
        const equipment = this.player.equipment || {};
        const rows = [];
        const slotLabels = {
            head: 'Head', necklace: 'Neck', body: 'Body', cape: 'Cape',
            mainHand: 'Main', offHand: 'Off', ring1: 'Ring', ring2: 'Ring', boots: 'Boots'
        };
        const armorModifiers = ArmorTypeModifiers[this.player.classId] || {};
        
        for (const [slot, label] of Object.entries(slotLabels)) {
            const item = equipment[slot];
            if (!item || !item.stats) continue;
            
            let value = 0;
            if (statKey === 'defense') {
                value = item.stats.defense || 0;
                // Apply armor type modifier
                if (value > 0 && item.armorType && armorModifiers[item.armorType]) {
                    value = Math.floor(value * armorModifiers[item.armorType]);
                }
            } else if (statKey === 'dodge') {
                value = item.stats.dodge || 0;
            } else if (statKey === 'critChance') {
                value = item.stats.critChance || 0;
            } else if (statKey === 'attack') {
                value = item.stats.attack || 0;
            }
            
            if (value === 0) continue;
            
            const itemName = ItemUtils.getName(item);
            const displayVal = (statKey === 'dodge' || statKey === 'critChance')
                ? `+${(value * 100).toFixed(1)}%`
                : `+${value.toFixed(1)}`;
            
            rows.push({ name: itemName, slot: label, value: displayVal });
        }
        
        return rows;
    }
    
    /**
     * Render breakdown popup HTML from data object
     * @private
     */
    _renderBreakdownPopup(data) {
        let html = `
            <div class="breakdown-header">
                <div class="breakdown-title-area">
                    <span class="breakdown-icon">${data.icon}</span>
                    <div class="breakdown-title-text">
                        <span class="breakdown-title">${data.title}</span>
                        <span class="breakdown-subtitle">${data.subtitle}</span>
                    </div>
                </div>
                <button class="breakdown-close">&times;</button>
            </div>
            <div class="breakdown-final">
                <span class="breakdown-final-label">Final Value</span>
                <span class="breakdown-final-value">${data.finalValue}${data.finalUnit}</span>
            </div>
            <div class="breakdown-body">
        `;
        
        for (const section of data.sections) {
            html += `<div class="breakdown-section">`;
            html += `<div class="breakdown-section-title">${section.title}</div>`;
            
            // Standard rows
            if (section.rows) {
                for (const row of section.rows) {
                    const typeClass = row.type === 'modifier' ? 'modifier' : '';
                    html += `
                        <div class="breakdown-row ${typeClass}">
                            <span class="breakdown-row-label">
                                <span class="row-icon">${row.icon}</span>
                                ${row.label}
                            </span>
                            <span class="breakdown-row-value ${row.type}">${row.value}</span>
                        </div>
                    `;
                    if (row.detail) {
                        html += `<div class="breakdown-row-detail">${row.detail}</div>`;
                    }
                }
            }
            
            // Equipment rows
            if (section.equipRows) {
                if (section.equipRows.length === 0) {
                    html += `<div class="breakdown-row-detail" style="padding: 4px 8px; font-style: italic;">No equipment bonuses</div>`;
                }
                for (const eq of section.equipRows) {
                    html += `
                        <div class="breakdown-equip-row">
                            <span class="breakdown-equip-name">
                                <span class="equip-slot-tag">${eq.slot}</span>
                                ${eq.name}
                            </span>
                            <span class="breakdown-equip-value">${eq.value}</span>
                        </div>
                    `;
                }
            }
            
            // Passive skill rows
            if (section.passiveRows) {
                for (const p of section.passiveRows) {
                    html += `
                        <div class="breakdown-row passive-skill">
                            <span class="breakdown-row-label">
                                <span class="row-icon">✦</span>
                                ${p.name}
                                ${p.rank > 0 ? `<span class="passive-rank-badge">R${p.rank}</span>` : ''}
                            </span>
                            <span class="breakdown-row-value positive">${p.value}</span>
                        </div>
                    `;
                    if (p.detail) {
                        html += `<div class="breakdown-row-detail">${p.detail}</div>`;
                    }
                }
            }
            
            // Housing buff rows
            if (section.housingRows) {
                for (const h of section.housingRows) {
                    html += `
                        <div class="breakdown-row housing-buff">
                            <span class="breakdown-row-label">
                                <span class="row-icon">${h.icon}</span>
                                ${h.label}
                            </span>
                            <span class="breakdown-row-value positive">${h.value}</span>
                        </div>
                    `;
                    if (h.detail) {
                        html += `<div class="breakdown-row-detail">${h.detail}</div>`;
                    }
                }
            }
            
            // Alignment modifier rows
            if (section.alignmentRows) {
                for (const a of section.alignmentRows) {
                    const valueClass = a.positive ? 'positive' : 'negative';
                    html += `
                        <div class="breakdown-row alignment-buff">
                            <span class="breakdown-row-label">
                                <span class="row-icon">${a.icon}</span>
                                ${a.label}
                            </span>
                            <span class="breakdown-row-value ${valueClass}">${a.value}</span>
                        </div>
                    `;
                }
            }
            
            if (section.subtotal) {
                html += `
                    <div class="breakdown-total">
                        <span class="breakdown-total-label">${section.subtotal.label}</span>
                        <span class="breakdown-total-value">${section.subtotal.value}</span>
                    </div>
                `;
            }
            
            if (section.note) {
                html += `<div class="breakdown-row-detail" style="margin-top:4px; font-style:italic;">${section.note}</div>`;
            }
            
            html += `</div>`;
        }
        
        if (data.cap) {
            html += `<div class="breakdown-cap">🔒 ${data.cap}</div>`;
        }
        
        html += `</div>`;
        
        if (data.formula) {
            html += `<div class="breakdown-formula">${data.formula}</div>`;
        }
        
        if (data.note) {
            html += `<div class="breakdown-note">${data.note}</div>`;
        }
        
        return html;
    }
    
    /**
     * Get class icon emoji
     * @private
     */
    _getClassIcon(classId) {
        const icons = {
            warrior: '⚔️',
            mage: '🧙',
            rogue: '🗡️'
        };
        return icons[classId] || '👤';
    }
    
    /**
     * Get total stats including pending allocations
     * @private
     */
    _getPreviewTotalStats() {
        const totalStats = this.player.totalStats || {};
        return {
            strength: (totalStats.strength || 0) + this._pendingStats.strength,
            dexterity: (totalStats.dexterity || 0) + this._pendingStats.dexterity,
            intelligence: (totalStats.intelligence || 0) + this._pendingStats.intelligence,
            stamina: (totalStats.stamina || 0) + this._pendingStats.stamina
        };
    }
    
    /**
     * Get preview attack power with pending stats
     * @private
     */
    _getPreviewAttack() {
        if (this._pendingPointsUsed === 0) {
            return this.player.attackPower || 0;
        }
        
        const classData = getClass(this.player.classId);
        const derived = classData?.derivedStats || {};
        const stats = this._getPreviewTotalStats();
        let attack = 0;
        
        if (derived.attackPerStrength) attack += stats.strength * derived.attackPerStrength;
        if (derived.attackPerDexterity) attack += stats.dexterity * derived.attackPerDexterity;
        if (derived.attackPerIntelligence) attack += stats.intelligence * derived.attackPerIntelligence;
        
        // Add equipment bonus (unchanged by pending stats)
        attack += this.player._getEquipmentAttackBonus?.() || 0;
        
        // Apply passive skill damage bonus (percentage multiplier)
        const passiveDamageBonus = this.player._passiveBonuses?.damage || 0;
        if (passiveDamageBonus > 0) {
            attack *= (1 + passiveDamageBonus / 100);
        }
        
        return attack;
    }
    
    /**
     * Get preview defense power with pending stats
     * @private
     */
    _getPreviewDefense() {
        if (this._pendingPointsUsed === 0) {
            return this.player.defensePower || 0;
        }
        
        const classData = getClass(this.player.classId);
        const derived = classData?.derivedStats || {};
        const stats = this._getPreviewTotalStats();
        let defense = 0;
        
        if (derived.defensePerStrength) defense += stats.strength * derived.defensePerStrength;
        if (derived.defensePerDexterity) defense += stats.dexterity * derived.defensePerDexterity;
        if (derived.defensePerIntelligence) defense += stats.intelligence * derived.defensePerIntelligence;
        if (derived.defensePerStamina) defense += stats.stamina * derived.defensePerStamina;
        
        // Add equipment bonus (unchanged by pending stats)
        defense += this.player._getEquipmentDefenseBonus?.() || 0;
        
        // Apply passive skill defense bonus (percentage multiplier)
        const passiveDefenseBonus = this.player._passiveBonuses?.defense || 0;
        if (passiveDefenseBonus > 0) {
            defense *= (1 + passiveDefenseBonus / 100);
        }
        
        return defense;
    }
    
    /**
     * Get preview dodge chance with pending stats
     * @private
     */
    _getPreviewDodge() {
        if (this._pendingPointsUsed === 0) {
            return this.player.dodgeChance || 0;
        }
        
        const stats = this._getPreviewTotalStats();
        const classData = getClass(this.player.classId);
        const raceData = getRace(this.player.raceId);
        const armorMod = ArmorTypeModifiers[classData?.armorType || 'medium'];
        
        const baseDodge = stats.dexterity * 0.002;
        const raceDodge = raceData?.traits?.critBonus || 0;
        const equipDodge = this.player._getEquipmentDodgeBonus?.() || 0;
        
        let dodge = (baseDodge + raceDodge + equipDodge) * (armorMod?.dodge || 1);
        
        // Apply passive skill dodge bonus
        dodge += this.player._passiveBonuses?.dodge || 0;
        
        return Math.min(dodge, 0.5);
    }
    
    /**
     * Get preview crit chance with pending stats
     * @private
     */
    _getPreviewCrit() {
        if (this._pendingPointsUsed === 0) {
            return this.player.critChance || 0;
        }
        
        const classData = getClass(this.player.classId);
        const derived = classData?.derivedStats || {};
        const stats = this._getPreviewTotalStats();
        const raceData = getRace(this.player.raceId);
        
        let crit = derived.baseCritChance || 0.05;
        if (derived.critPerDexterity) crit += stats.dexterity * derived.critPerDexterity;
        crit += this.player._getEquipmentCritBonus?.() || 0;
        crit += raceData?.traits?.critBonus || 0;
        
        // Apply passive skill crit chance bonus
        crit += this.player._passiveBonuses?.critChance || 0;
        
        return Math.min(crit, 0.75);
    }
    
    /**
     * Get preview max health with pending stats
     * @private
     */
    _getPreviewMaxHealth() {
        if (this._pendingPointsUsed === 0) {
            return this.player.maxHealth || 0;
        }
        
        const classData = getClass(this.player.classId);
        const derived = classData?.derivedStats || { healthPerStamina: 10 };
        const stats = this._getPreviewTotalStats();
        
        let health = Math.floor(stats.stamina * derived.healthPerStamina);
        health += this.player._passiveBonuses?.maxHealth || 0;
        return health;
    }
    
    /**
     * Get preview max mana with pending stats
     * @private
     */
    _getPreviewMaxMana() {
        if (this._pendingPointsUsed === 0) {
            return this.player.maxMana || 0;
        }
        
        const classData = getClass(this.player.classId);
        const derived = classData?.derivedStats || { manaPerIntelligence: 8 };
        const stats = this._getPreviewTotalStats();
        
        let mana = Math.floor(stats.intelligence * derived.manaPerIntelligence);
        mana += this.player._passiveBonuses?.maxMana || 0;
        return mana;
    }
    
    /**
     * Get XP progress percentage
     * @private
     */
    _getXPPercent() {
        if (!this.player || !this.player.xpToNextLevel || this.player.xpToNextLevel <= 0) {
            return 0;
        }
        return Math.round((this.player.xp / this.player.xpToNextLevel) * 100);
    }
    
    /**
     * Clean up event handlers
     */
    destroy() {
        // Remove all bound event handlers
        this._boundHandlers.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this._boundHandlers = [];
        
        // Reset pending state
        this._resetPendingStats(false);
        
        // Clear container
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

export default StatsUI;
