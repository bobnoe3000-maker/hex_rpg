/**
 * @file TownScreen.js
 * @description MUD-inspired town interface with text feed narrative, two-tier navigation,
 *              NPC dialogue system with branching responses, and panel overlays for services.
 *              Integrated WorldMapUI for MUD-style visual map navigation.
 *              Now supports multi-location navigation within Eron's Landing (v2.0.0).
 *              NPCs now appear as buttons in the action bar (v2.1.0).
 *              Forge functionality extracted to ForgeUI component (v2.3.0).
 *              Shop functionality extracted to ShopUI component (v2.4.0).
 *              Location header now displays clickable images with popup (v2.5.0).
 *              Player housing system integrated (v2.8.0).
 *              Bank system integrated with BankUI component (v3.0.0).
 * 
 * @usage Instantiated by main.js when player is in town. Provides navigation
 *        callbacks for worldmap (with mapId), character management, and logout.
 * @dependencies 
 *   - GameConfig, ClassConfig, RaceConfig, MapConfig, ShopConfig, ItemConfig
 *   - MudConfig (config/mudConfig.js) - MUD UI settings, NPCs, dialogue trees, locations
 *   - TownNavigator (systems/TownNavigator.js) - Location state management
 *   - Item, ItemUtils, EventBus, GameEvents
 *   - SkillTreeUI (ui/SkillTreeUI.js)
 *   - WorldMapUI (ui/WorldMapUI.js)
 *   - InventoryUI (ui/InventoryUI.js)
 *   - StatsUI (ui/StatsUI.js)
 *   - ForgeUI (ui/ForgeUI.js) - Forge upgrade panel
 *   - ShopUI (ui/ShopUI.js) - Buy/sell shop panel
 *   - HousingUI (ui/HousingUI.js) - Player housing panel
 *   - BankUI (ui/BankUI.js) - Bank panel component
 * 
 * @version 3.9.0
 * @changelog
 *   - v3.9.0 (2026-03-09): Added Testing Ground (⚗️ Special section) to ☰ Menu modal.
 *                          Navigates via callbacks.onNavigate('testing_ground').
 *   - v3.8.0 (2026-03-07): Replaced addTextEntry() with MudTextRenderer delegation.
 *                          Removed _scrollToBottom(), _updateScrollButton(), and
 *                          scroll event listener setup (absorbed by MudTextRenderer).
 *                          Added ⚙ settings gear button to text feed toolbar.
 *   - v3.7.0 (2026-03-06): Added Help & FAQ and Release Notes to ☰ Menu. Imports
 *                          DocViewerUtils for fetch+cache and Markdown rendering.
 *                          Added _showDocModal() helper. Menu now has divider sections.
 *   - v3.6.0 (2026-03-06): Fixed vendor dialogue triggering when closing forge panel opened
 *                          via Stats → Upgrade. Added _panelOpenedFromNPC flag.
 *   - v3.5.0 (2026-03-05): Extracted nav bar to shared MainNavBar component. Removed
 *                          _checkBadge, _updateBadges, _handleNavigation methods. Replaced
 *                          MainNavButtons import with MainNavBar. All _updateBadges() calls
 *                          replaced with _navBar.update(). Nav listeners via _navBar.attach().
 *   - v3.4.3 (2026-03-05): Moved Home button from MUD action bar to Go To exits bar.
 *                          _buildExitsHtml now appends a Home button when at market_square.
 *                          Exit listener routes data-location="home" to _handleMudAction('home')
 *                          instead of _navigateToLocation. Rest button removed from market_square
 *                          via mudConfig.js (only available at Rusty Anchor/tavern).
 *   - v3.4.2 (2026-03-05): Swapped order of MUD Action Bar and GO TO exits bar.
 *                           Action bar (HERE) now sits above exits bar (GO TO), closer
 *                           to the text feed. GO TO now sits just above the main nav bar.
 *   - v3.4.1 (2026-02-11): showResurrection() now displays a 'no items lost' message when
 *                          death penalty rolls favorably, reminding players of the risk.
 *                          Navigates player to Temple on resurrection instead of defaulting
 *                          to Market Square. Travel flavor text suppressed during resurrection
 *                          via _suppressNavText flag so only the resurrection narrative shows.
 *   - v3.4.0 (2026-02-10): Added player identity (name/level/class) and 2x2 status grid
 *                          (HP/MP/XP/Gold) to town header. Replaces old tiny HP/MP bars.
 *                          Now aligned with BattleMapUI header layout. Uses shared CSS
 *                          classes: .player-identity, .status-grid, .gold-label.
 *                          Updated _updateStatusBars() for new DOM structure.
 *   - v3.3.0 (2026-02-09): Added town HP/MP regeneration system. New _startTownRegen()
 *                          and _stopTownRegen() methods run a 1s interval matching GameLoop's
 *                          _regenTick() formula but using town regen rates (5% vs 1% battle).
 *                          Includes class regen modifiers, passive skill bonuses, status bar
 *                          updates, and periodic save (every 5s during active regen).
 *                          Auto-stops when both HP and MP are full.
 *   - v3.2.0 (2026-02-08): Added onEmptySlotClick callback to StatsUI - clicking an empty
 *                          gear slot opens inventory with matching filter pre-selected.
 *                          _showInventoryModal() now accepts optional filter/tab parameters.
 *   - v3.1.0 (2025-02-03): Added onUpgradeItem callbacks to InventoryUI and StatsUI 
 *                          instantiation. Added _openForgeWithItem() helper method to
 *                          open forge panel with item pre-selected. Enables quick upgrade
 *                          flow from item popups.
 *   - v3.0.0 (2026-01-27): Added bank system integration with BankUI component.
 *                          Added _openBankPanel() method for banking operations.
 *                          Updated deposit/withdraw/vault handlers to open bank panel.
 *                          Added openBankGold/openBankVault/openBankExpand dialogue actions.
 *   - v2.9.0 (2026-01-26): Changed housing action to navigate to full HousingScreen
 *                             instead of opening panel. 'home'/'housing' actions now
 *                             call callbacks.onNavigate('housing') for main.js routing.
 *   - v2.8.0 (2026-01-26): Added player housing system integration.
 *                          Added HousingUI import and _openHousingPanel() method.
 *                          Added 'home'/'housing' action handler in _handleMudAction().
 *   - v2.7.0 (2025-01-26): Fixed skill tree modal nesting - hide outer modal header when showing
 *                          SkillTreeUI since it has its own header. Restore header on close.
 *   - v2.6.0 (2025-01-25): Added offline progress modal support via showOfflineProgress() method.
 *                          Added OfflineProgressModal import and cleanup in destroy().
 *   - v2.5.0 (2025-01-24): Added location header image support with click-to-enlarge popup.
 *                          Images load from assets/top_nav/ with emoji fallback.
 *   - v2.4.0 (2025-01-21): Extracted shop functionality to ShopUI component (~150 lines removed).
 *                          TownScreen now delegates to ShopUI for all shop operations.
 *   - v2.3.0 (2025-01-21): Extracted forge functionality to ForgeUI component (~400 lines removed).
 *   - v2.2.8 (2025-01-21): Fixed forge success message to avoid redundant tier display.
 *   - v2.2.7 (2025-01-21): Simplified _getCompatibleMaterials - single rule: same subtype = compatible.
 *   - v2.2.6 (2025-01-21): Complete rewrite of _getCompatibleMaterials for strict type matching.
 *   - v2.2.4 (2025-01-21): Fixed forge preview to use correct property names.
 *   - v2.2.3 (2025-01-21): Fixed _handleForgeUpgrade to correctly interpret ForgeService result.
 *   - v2.2.2 (2025-01-21): Fixed _getCompatibleMaterials to properly compare subtypes.
 *   - v2.2.1 (2025-01-21): Added 'forge' case to action handler for MUD action bar button.
 *   - v2.2.0 (2025-01-21): Added Forge upgrade panel for item merging.
 *   - v2.1.0 (2025-01-20): Phase 3 - NPCs now appear as buttons in action bar.
 *   - v2.0.0 (2025-01-20): Added multi-location navigation with TownNavigator integration.
 *   - v1.6.0 (2025-01-19): Integrated modular StatsUI component for character stats.
 *   - v1.5.0 (2025-01-19): Integrated modular InventoryUI component for tabbed inventory.
 *   - v1.4.0 (2025-01-18): Added ambient event system with random atmospheric text
 *   - v1.3.0 (2025-01-17): Integrated WorldMapUI component for visual world map navigation
 *   - v1.2.0 (2025-01-17): Changed panel to centered overlay with backdrop
 *   - v1.1.0 (2025-01-17): Added NPC dialogue system, contextual action bar, panel overlays
 *   - v1.0.0 (2025-01-17): MUD view overhaul - text feed, two-tier navigation, badges
 */

import { GameConfig } from '../config/gameConfig.js';
import { getClass } from '../config/classConfig.js';
import { getRace } from '../config/raceConfig.js';
import { getMap, getSelectableMaps, getDifficultyLabel, getDifficultyColor } from '../config/mapConfig.js';
import { getShop } from '../config/shopConfig.js';
import { getItem, getMaterial, getPotion } from '../config/itemConfig.js';
import { Item, createItem } from '../models/Item.js';
import { ItemUtils } from '../utils/ItemUtils.js';
import { eventBus, GameEvents } from '../systems/EventBus.js';
import { TownNavigator } from '../systems/TownNavigator.js';
import { SkillTreeUI } from './SkillTreeUI.js';
import { WorldMapUI } from './WorldMapUI.js';
import { InventoryUI } from './InventoryUI.js';
import { StatsUI } from './StatsUI.js';
import { ForgeUI } from './ForgeUI.js';
import { ShopUI } from './ShopUI.js';
import { BankUI } from './BankUI.js';
import { OfflineProgressModal } from './OfflineProgressModal.js';
import { MainNavBar } from './MainNavBar.js';
import { fetchDoc, renderMarkdown } from '../utils/DocViewerUtils.js';
import { 
    MudSettings, 
    TextEntryTypes,
    getLocation,
    getMudActions,
    getActionBarLabel,
    getNPC,
    getNPCGreeting,
    getDialogueNode,
    getNPCBrowsingComment,
    getNPCPurchaseReaction,
    getNPCSaleReaction,
    getNPCFarewell,
    getRandomRumor,
    getRandomLookText,
    getRandomAmbientEvent,
    getMovementText,
    getLocationExits
} from '../config/mudConfig.js';
import { MudTextRenderer } from './MudTextRenderer.js';

export class TownScreen {
    constructor(container, character, callbacks) {
        this.container = container;
        this.character = character;
        this.callbacks = callbacks || {};
        
        this.skillTreeUI = null;
        this.worldMapUI = null;  // NEW v1.3.0
        this._inventoryUI = null;  // NEW v1.5.0
        this._statsUI = null;  // NEW v1.6.0
        this._forgeUI = null;  // NEW v2.3.0 - Extracted forge component
        this._shopUI = null;  // NEW v2.4.0 - Extracted shop component
        this._bankUI = null;  // NEW v3.0.0 - Bank panel component
        this._housingUI = null;  // NEW v2.8.0 - Player housing component
        this._offlineProgressModal = null;  // NEW v2.6.0 - Offline progress display
        this._navBar = null;  // MainNavBar component
        this.ambientEventTimer = null;  // NEW v1.4.0 - Random atmospheric events
        this.townRegenInterval = null;  // NEW v3.3.0 - Town HP/MP regen tick
        
        // MUD state - Initialize TownNavigator for location management (v2.0.0)
        this.navigator = new TownNavigator(character, {
            startLocation: character?.townLocationId || 'market_square',
            onTextOutput: (text, type) => {
                if (this._suppressNavText) return;  // Skip travel text during resurrection
                this.addTextEntry(text, type === 'system' ? TextEntryTypes.SYSTEM : TextEntryTypes.NARRATION);
            },
            onLocationChanged: (data) => this._onLocationChanged(data)
        });
        this.currentLocationId = this.navigator.currentLocationId;  // Kept for compatibility
        this.textFeed = [];
        // isUserScrolling and scroll management owned by MudTextRenderer
        
        // Dialogue state
        this.currentNPC = null;           // Currently talking to NPC ID (null = not in dialogue)
        this.currentDialogueNode = null;  // Current dialogue node ID
        this.isPanelOpen = false;         // Is a panel overlay open
        this._suppressNavText = false;    // Suppress travel text during resurrection
        
        // Badge state
        this.badgeState = {
            stats: false,
            items: false,
            skills: false
        };
        
        this._init();
    }
    
    _init() {
        this.container.innerHTML = '';
        this.container.classList.add('town-screen');
        
        const classData = getClass(this.character.classId);
        const raceData = getRace(this.character.raceId);
        const location = this.navigator.getCurrentLocation();
        this.currentLocationId = this.navigator.currentLocationId;  // Keep in sync
        
        // Get actions based on current context (NPC or location)
        const actionContext = this.currentNPC || this.currentLocationId || 'town';
        const mudActions = getMudActions(actionContext);
        const actionBarLabel = getActionBarLabel(actionContext);
        
        // Build MUD action buttons HTML
        const mudActionsHtml = this._buildActionBarHtml(mudActions);
        
        // Build exit buttons HTML (v2.0.0)
        const exits = this.navigator.getAvailableExits();
        const exitsHtml = this._buildExitsHtml(exits);
        
        // Build main nav buttons HTML with badges
        // Build main nav via shared MainNavBar component
        this._navBar = new MainNavBar(this.character, {
            onStats:  () => this._showCharacterModal(),
            onItems:  () => this._showInventoryModal(),
            onSkills: () => this._showSkillsModal(),
            onMap:    () => this._showWorldMapModal(),
            onMenu:   () => this._showMenuModal(),
        });
        const mainNavHtml = this._navBar.buildHTML();
        
        this.container.innerHTML = `
            <div class="mud-view">
                <!-- Location Header -->
                <header class="mud-location-header">
                    <div class="mud-location-icon clickable" id="locationIconContainer" 
                         data-emoji="${location?.icon || '🏛️'}"
                         data-image="${location?.imagePath || ''}"
                         title="Click to enlarge">
                        ${location?.imagePath 
                            ? `<img src="${location.imagePath}" alt="${location?.name || 'Location'}" class="location-img" 
                                   onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                               <span class="location-emoji-fallback" style="display:none;">${location?.icon || '🏛️'}</span>`
                            : `<span class="location-emoji">${location?.icon || '🏛️'}</span>`
                        }
                    </div>
                    <div class="mud-location-info">
                        <div class="mud-location-name">${location?.name || "Eron's Landing"}</div>
                        <div class="mud-location-type">${location?.subtitle || 'Town • Safe Zone'}</div>
                    </div>
                    <div class="mud-player-status">
                        <div class="player-identity">
                            <div class="player-identity-name">${this.character.name || 'Adventurer'}</div>
                            <div class="player-identity-class">Lv.${this.character.level || 1} ${classData?.name || 'Unknown'}</div>
                        </div>
                        <div class="status-grid">
                            <div class="bar health-bar">
                                <div class="bar-fill" style="width: ${this._getHealthPercent()}%"></div>
                                <span class="bar-text">${this.character.currentHealth}/${this.character.maxHealth} HP</span>
                            </div>
                            <div class="bar mana-bar">
                                <div class="bar-fill" style="width: ${this._getManaPercent()}%"></div>
                                <span class="bar-text">${this.character.currentMana}/${this.character.maxMana} MP</span>
                            </div>
                            <div class="bar xp-bar">
                                <div class="bar-fill" style="width: ${this._getXPPercent()}%"></div>
                                <span class="bar-text">${(this.character.xp || 0).toLocaleString()} XP</span>
                            </div>
                            <div class="gold-label">
                                <span class="gold-label-text">💰 ${(this.character.gold || 0).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </header>
                
                <!-- Scrollable Text Feed -->
                <div class="text-feed-toolbar" id="textFeedToolbar">
                    <button class="mud-settings-btn" id="mudSettingsToggle" title="Text display settings">⚙</button>
                </div>
                <div class="text-feed" id="textFeed">
                    <!-- Text entries will be added here -->
                </div>
                
                <!-- Scroll to Bottom Button -->
                <button class="scroll-to-bottom" id="scrollToBottom">↓</button>
                
                <!-- Centered Overlay Container -->
                <div class="panel-overlay" id="panelOverlay">
                    <div class="panel-card">
                        <div class="panel-header">
                            <div class="panel-title" id="panelTitle">Panel</div>
                            <button class="panel-close" id="panelClose">✕</button>
                        </div>
                        <div class="panel-content" id="panelContent">
                        </div>
                    </div>
                </div>
                
                <!-- Bottom Navigation Container -->
                <div class="bottom-nav-container">
                    <!-- MUD Action Bar (Contextual) - closest to text feed -->
                    <div class="mud-action-bar">
                        <div class="mud-action-bar-label" id="actionBarLabel">${actionBarLabel}</div>
                        <div class="mud-actions" id="mudActions">
                            ${mudActionsHtml}
                        </div>
                    </div>
                    
                    <!-- GO TO: Location Exits (v2.0.0) - above main nav -->
                    <div class="mud-exits-bar" id="exitsBar">
                        <div class="mud-exits-label">Go To</div>
                        <div class="mud-exits" id="mudExits">
                            ${exitsHtml}
                        </div>
                    </div>
                    
                    <!-- Divider -->
                    <div class="nav-divider"></div>
                    
                    <!-- Main Navigation (Fixed) -->
                    <nav class="main-nav">
                        ${mainNavHtml}
                    </nav>
                </div>
            </div>
            
            <!-- Modal for full-screen panels (character, inventory, etc.) -->
            <div class="town-modal" id="townModal" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 id="modalTitle">Feature</h2>
                        <button class="modal-close" id="modalClose">✕</button>
                    </div>
                    <div class="modal-body" id="modalBody">
                    </div>
                </div>
            </div>
        `;
        
        this._setupEventListeners();

        // Instantiate shared MUD text renderer now that DOM exists
        const feedEl    = this.container.querySelector('#textFeed');
        const scrollBtn = this.container.querySelector('#scrollToBottom');
        const toolbar   = this.container.querySelector('#textFeedToolbar');
        this.mudRenderer = new MudTextRenderer(feedEl, {
            maxEntries:  MudSettings.maxTextEntries,
            scrollBtnEl: scrollBtn,
        });
        // Render settings panel into toolbar and wire gear button
        this.mudRenderer.renderSettingsPanel(toolbar);
        this.container.querySelector('#mudSettingsToggle')?.addEventListener('click', () => {
            const btn = this.container.querySelector('#mudSettingsToggle');
            this.mudRenderer.toggleSettingsPanel();
            btn?.classList.toggle('active');
        });

        this._showIntroText();
        this._startAmbientEvents();  // NEW v1.4.0
        this._startTownRegen();      // NEW v3.3.0 - Town HP/MP regen
        this._navBar?.update();
    }
    
    // ============================================
    // ACTION BAR MANAGEMENT
    // ============================================
    
    /**
     * Build action bar HTML from action definitions
     * v2.1.0: Now handles NPC buttons with distinct styling
     */
    _buildActionBarHtml(actions) {
        return actions.map(action => {
            const activeClass = action.active ? 'active' : '';
            const disabledClass = action.disabled ? 'disabled' : '';
            const disabledAttr = action.disabled ? 'disabled' : '';
            // v2.1.0: NPC buttons get special styling
            const npcClass = action.isNPC ? 'npc-btn' : '';
            const npcData = action.isNPC ? `data-npc-id="${action.npcId}"` : '';
            return `
                <button class="mud-btn ${activeClass} ${disabledClass} ${npcClass}" 
                        data-action="${action.id}" ${npcData} ${disabledAttr}>
                    <span class="mud-btn-icon">${action.icon}</span>
                    <span class="mud-btn-label">${action.label}</span>
                </button>
            `;
        }).join('');
    }
    
    /**
     * Update action bar for current context
     * v2.1.0: Now passes currentNPC to getMudActions for proper context
     */
    _updateActionBar() {
        const context = this.currentNPC ? 'npc_dialogue' : (this.currentLocationId || 'town');
        const actions = getMudActions(context, this.currentNPC);
        const label = getActionBarLabel(context, this.currentNPC);
        
        const actionsContainer = this.container.querySelector('#mudActions');
        const labelEl = this.container.querySelector('#actionBarLabel');
        
        if (actionsContainer) {
            actionsContainer.innerHTML = this._buildActionBarHtml(actions);
            this._setupActionBarListeners();
        }
        
        if (labelEl) {
            labelEl.textContent = label;
        }
    }
    
    // ============================================
    // LOCATION NAVIGATION (v2.0.0)
    // ============================================
    
    /**
     * Build exit buttons HTML from available exits
     */
    _buildExitsHtml(exits) {
        if (!exits || exits.length === 0) {
            return '<span class="no-exits">No exits available</span>';
        }
        
        // Add Home button when at market_square (Home is a UI action, not a location)
        const homeBtn = this.navigator?.currentLocationId === 'market_square'
            ? `<button class="mud-exit-btn" data-location="home">
                <span class="exit-icon">🏠</span>
                <span class="exit-name">Home</span>
               </button>`
            : '';
        
        const exitBtns = exits.map(location => `
            <button class="mud-exit-btn" data-location="${location.id}">
                <span class="exit-icon">${location.icon}</span>
                <span class="exit-name">${location.name}</span>
            </button>
        `).join('');
        
        return homeBtn + exitBtns;
    }
    
    /**
     * Update the exits bar with available exits from current location
     */
    _updateExitsBar() {
        const exitsContainer = this.container.querySelector('#mudExits');
        if (!exitsContainer) return;
        
        const exits = this.navigator.getAvailableExits();
        exitsContainer.innerHTML = this._buildExitsHtml(exits);
        this._setupExitListeners();
    }
    
    /**
     * Setup click listeners for exit buttons
     */
    _setupExitListeners() {
        const exitBtns = this.container.querySelectorAll('.mud-exit-btn');
        exitBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const locationId = btn.dataset.location;
                if (locationId === 'home') {
                    this._handleMudAction('home');
                } else {
                    this._navigateToLocation(locationId);
                }
            });
        });
    }
    
    /**
     * Navigate to a new location
     */
    _navigateToLocation(locationId) {
        // Can't navigate while in dialogue
        if (this.currentNPC) {
            this.addTextEntry("You should finish your conversation first.", TextEntryTypes.SYSTEM);
            return;
        }
        
        const result = this.navigator.moveTo(locationId);
        
        if (!result.success) {
            this.addTextEntry(result.message, TextEntryTypes.SYSTEM);
        }
        // Success text is handled by navigator callbacks
    }
    
    /**
     * Handle location change event from navigator
     */
    _onLocationChanged(data) {
        const { location, isFirstVisit } = data;
        
        // Update tracked location ID
        this.currentLocationId = this.navigator.currentLocationId;
        
        // Update the location header
        this._updateLocationHeader(location);
        
        // Update the action bar for new location
        this._updateActionBar();
        
        // Update the exits bar
        this._updateExitsBar();
        
        // Show first-visit special text
        if (isFirstVisit && !this._suppressNavText) {
            this.addTextEntry(`✦ You discover ${location.name} for the first time. ✦`, TextEntryTypes.IMPORTANT);
        }
        
        // Save game state
        eventBus.emit(GameEvents.SAVE_GAME);
    }
    
    /**
     * Update the location header display
     */
    /**
     * Update location header when navigating between locations
     * v2.5.0: Now properly handles image/emoji fallback structure
     */
    _updateLocationHeader(location) {
        const iconEl = this.container.querySelector('.mud-location-icon');
        const nameEl = this.container.querySelector('.mud-location-name');
        const subtitleEl = this.container.querySelector('.mud-location-type');
        
        // v2.5.0: Rebuild the icon content with image/emoji fallback
        if (iconEl) {
            const emoji = location?.icon || '🏛️';
            const imagePath = location?.imagePath;
            
            // Update data attributes
            iconEl.dataset.emoji = emoji;
            iconEl.dataset.image = imagePath || '';
            
            // Rebuild inner HTML with image or emoji
            if (imagePath) {
                iconEl.innerHTML = `
                    <img src="${imagePath}" alt="${location?.name || 'Location'}" class="location-img" 
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <span class="location-emoji-fallback" style="display:none;">${emoji}</span>
                `;
            } else {
                iconEl.innerHTML = `<span class="location-emoji">${emoji}</span>`;
            }
        }
        
        if (nameEl) nameEl.textContent = location?.name || 'Unknown';
        if (subtitleEl) subtitleEl.textContent = location?.subtitle || 'Safe Zone';
    }
    
    /**
     * Setup listeners for action bar buttons
     */
    _setupActionBarListeners() {
        const mudBtns = this.container.querySelectorAll('.mud-btn:not(.disabled)');
        mudBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                this._handleMudAction(action);
            });
        });
    }
    
    // ============================================
    // TEXT FEED MANAGEMENT
    // ============================================
    
    /**
     * Add a text entry to the feed
     */
    addTextEntry(text, type = TextEntryTypes.NARRATION, options = {}) {
        // Keep history array for compatibility (e.g. save/restore feed state)
        this.textFeed.push({ text, type, options, timestamp: Date.now() });
        // Delegate all rendering, trimming, and scroll to shared renderer
        this.mudRenderer?.add(text, type, options);
    }
    
    /**
     * Add dialogue response buttons to the text feed
     */
    _addDialogueResponses(options) {
        const feed = this.container.querySelector('#textFeed');
        if (!feed || !options || options.length === 0) return;
        
        const responsesDiv = document.createElement('div');
        responsesDiv.className = 'dialogue-responses';
        responsesDiv.id = 'currentDialogueResponses';
        
        options.forEach(option => {
            const btn = document.createElement('button');
            btn.className = 'dialogue-response';
            btn.textContent = option.text;
            btn.dataset.optionId = option.id;
            btn.dataset.next = option.next || '';
            btn.dataset.action = option.action || '';
            
            btn.addEventListener('click', () => {
                this._handleDialogueOption(option);
            });
            
            responsesDiv.appendChild(btn);
        });
        
        feed.appendChild(responsesDiv);
        
        this.mudRenderer?.scrollToBottom();
    }
    
    /**
     * Remove current dialogue responses from feed
     */
    _removeDialogueResponses() {
        const responses = this.container.querySelector('#currentDialogueResponses');
        if (responses) {
            responses.remove();
        }
    }
    
    /**
     * Show location intro text when entering
     */
    _showIntroText() {
        const location = this.navigator.getCurrentLocation();
        
        // Show location description
        if (location?.description) {
            this.addTextEntry(location.description, TextEntryTypes.NARRATION);
        }
        
        const classData = getClass(this.character.classId);
        const raceData = getRace(this.character.raceId);
        this.addTextEntry(
            `You are ${this.character.name}, a Level ${this.character.level} ${raceData?.name} ${classData?.name}. You have 💰 ${this.character.gold || 0} gold.`,
            TextEntryTypes.SYSTEM
        );
        
        if (this.character.unspentStatPoints > 0) {
            this.addTextEntry(
                `✦ You have ${this.character.unspentStatPoints} unspent stat point${this.character.unspentStatPoints > 1 ? 's' : ''}. ✦`,
                TextEntryTypes.IMPORTANT
            );
        }
        if (this.character.unspentSkillPoints > 0) {
            this.addTextEntry(
                `✦ You have ${this.character.unspentSkillPoints} unspent skill point${this.character.unspentSkillPoints > 1 ? 's' : ''}. ✦`,
                TextEntryTypes.IMPORTANT
            );
        }
    }
    
    // _scrollToBottom() and _updateScrollButton() removed v3.8.0
    // Scroll management now owned by MudTextRenderer instance (this.mudRenderer)
    
    // ============================================
    // AMBIENT EVENT SYSTEM (v1.4.0)
    // ============================================
    
    /**
     * Start the ambient event timer for atmospheric flavor text
     * Events trigger randomly between configured min/max delays
     */
    _startAmbientEvents() {
        this._stopAmbientEvents(); // Clear any existing timer
        
        const scheduleNext = () => {
            const minDelay = GameConfig.ui.ambientEventMinDelay || 10000;
            const maxDelay = GameConfig.ui.ambientEventMaxDelay || 90000;
            const delay = minDelay + Math.random() * (maxDelay - minDelay);
            
            this.ambientEventTimer = setTimeout(() => {
                // Only show events when not in a panel/modal and in town
                if (!this.isPanelOpen && !this.container.querySelector('#townModal[style*="flex"]')) {
                    const eventText = getRandomAmbientEvent(this.currentLocationId);
                    if (eventText) {
                        this.addTextEntry(eventText, TextEntryTypes.AMBIENT);
                    }
                }
                
                // Schedule next event
                scheduleNext();
            }, delay);
        };
        
        scheduleNext();
    }
    
    /**
     * Stop the ambient event timer
     */
    _stopAmbientEvents() {
        if (this.ambientEventTimer) {
            clearTimeout(this.ambientEventTimer);
            this.ambientEventTimer = null;
        }
    }
    
    // ============================================
    // TOWN REGENERATION (v3.3.0)
    // ============================================
    
    /**
     * Start town HP/MP regeneration interval.
     * Matches GameLoop._regenTick() formula but uses town regen rates.
     * Ticks every 1s (GameConfig.tick.regenRate). Auto-stops when full.
     * Saves game every 5 ticks during active regen.
     */
    _startTownRegen() {
        this._stopTownRegen(); // Clear any existing interval
        
        let ticksSinceLastSave = 0;
        
        this.townRegenInterval = setInterval(() => {
            if (!this.character || !this.character.isAlive) return;
            
            const healthFull = this.character.currentHealth >= this.character.maxHealth;
            const manaFull = this.character.currentMana >= this.character.maxMana;
            
            // Nothing to regen - stop the interval
            if (healthFull && manaFull) {
                return;
            }
            
            // Determine regen rates from config
            const healthRegenPercent = GameConfig.regen?.townHealthPercent || 0.05;
            const manaRegenPercent = GameConfig.regen?.townManaPercent || 0.05;
            
            // Apply class modifiers (matches GameLoop pattern)
            const classData = getClass(this.character.classId);
            const healthMod = classData?.regenModifier?.health || 1;
            const manaMod = classData?.regenModifier?.mana || 1;
            
            let regenOccurred = false;
            
            // Regen health
            if (!healthFull) {
                const healthRegen = Math.max(1, Math.floor(this.character.maxHealth * healthRegenPercent * healthMod));
                if (this.character.heal) {
                    this.character.heal(healthRegen, 'regen', true);  // Silent heal
                } else {
                    // Fallback if heal() method not available
                    this.character.currentHealth = Math.min(
                        this.character.maxHealth,
                        this.character.currentHealth + healthRegen
                    );
                }
                regenOccurred = true;
            }
            
            // Regen mana
            if (!manaFull) {
                const manaRegen = Math.max(1, Math.floor(this.character.maxMana * manaRegenPercent * manaMod));
                if (this.character.restoreMana) {
                    this.character.restoreMana(manaRegen, 'regen', true);  // Silent restore
                } else {
                    // Fallback if restoreMana() method not available
                    this.character.currentMana = Math.min(
                        this.character.maxMana,
                        this.character.currentMana + manaRegen
                    );
                }
                regenOccurred = true;
            }
            
            // Update status bars to show regen progress
            if (regenOccurred) {
                this._updateStatusBars();
                
                // Save periodically (every 5 seconds) during active regen
                ticksSinceLastSave++;
                if (ticksSinceLastSave >= 5) {
                    ticksSinceLastSave = 0;
                    eventBus.emit(GameEvents.SAVE_GAME);
                }
            }
        }, GameConfig.tick?.regenRate || 1000);
    }
    
    /**
     * Stop town regeneration interval
     */
    _stopTownRegen() {
        if (this.townRegenInterval) {
            clearInterval(this.townRegenInterval);
            this.townRegenInterval = null;
        }
    }
    
    // ============================================
    // DIALOGUE SYSTEM
    // ============================================
    
    /**
     * Start dialogue with an NPC
     */
    _startDialogue(npcId) {
        const npc = getNPC(npcId);
        if (!npc) return;
        
        this.currentNPC = npcId;
        this.currentDialogueNode = 'root';
        
        // Show approach text
        this.addTextEntry(npc.approachText, TextEntryTypes.SYSTEM);
        
        // Show scene description
        this.addTextEntry(npc.sceneText, TextEntryTypes.NARRATION);
        
        // Show NPC greeting
        const greeting = getNPCGreeting(npcId);
        if (greeting) {
            this.addTextEntry(greeting.greeting, TextEntryTypes.NPC, { speaker: greeting.name });
        }
        
        // Update action bar to NPC context
        this._updateActionBar();
        
        // Show dialogue options
        const dialogueNode = getDialogueNode(npcId, 'root');
        if (dialogueNode?.options) {
            this._addDialogueResponses(dialogueNode.options);
        }
    }
    
    /**
     * Handle dialogue option selection
     */
    _handleDialogueOption(option) {
        // Remove current responses
        this._removeDialogueResponses();
        
        // Show what player said (abbreviated)
        this.addTextEntry(`> ${option.text}`, TextEntryTypes.SYSTEM);
        
        // Check for action
        if (option.action) {
            this._handleDialogueAction(option.action);
            return;
        }
        
        // Navigate to next dialogue node
        if (option.next) {
            this.currentDialogueNode = option.next;
            const dialogueNode = getDialogueNode(this.currentNPC, option.next);
            
            if (dialogueNode) {
                // Show NPC response
                if (dialogueNode.npcResponse) {
                    const npc = getNPC(this.currentNPC);
                    this.addTextEntry(dialogueNode.npcResponse, TextEntryTypes.NPC, { speaker: npc.name });
                }
                
                // Show new options
                if (dialogueNode.options) {
                    this._addDialogueResponses(dialogueNode.options);
                }
            }
        }
    }
    
    /**
     * Handle dialogue action (opens panels, leaves dialogue, etc.)
     */
    _handleDialogueAction(action) {
        switch (action) {
            case 'openShopBuy':
                this._openShopPanel('buy');
                break;
            case 'openShopSell':
                this._openShopPanel('sell');
                break;
            case 'openUpgradePanel':
                this._openPlaceholderPanel('Blacksmith Upgrades', 'Upgrade system coming soon!');
                break;
            case 'openForgePanel':
                this._openForgePanel();
                break;
            case 'openBankGold':
                this._openBankPanel('gold');
                break;
            case 'openBankVault':
                this._openBankPanel('vault');
                break;
            case 'openBankExpand':
                this._openBankPanel('expand');
                break;
            case 'openHealPanel':
                this._handleTempleHeal();
                break;
            case 'openBlessingsPanel':
                this._openPlaceholderPanel('Temple Blessings', 'Blessings system coming soon!');
                break;
            case 'openHousingPanel':  // NEW v2.8.0
                this._openHousingPanel();
                break;
            case 'leaveDialogue':
                this._leaveDialogue();
                break;
            default:
                console.log('Unknown dialogue action:', action);
        }
    }
    
    /**
     * Leave current NPC dialogue
     * v2.1.0: Now returns to current location name instead of hardcoded "town square"
     */
    _leaveDialogue() {
        if (!this.currentNPC) return;
        
        // Show farewell
        const farewell = getNPCFarewell(this.currentNPC);
        const npc = getNPC(this.currentNPC);
        if (farewell && npc) {
            this.addTextEntry(farewell, TextEntryTypes.NPC, { speaker: npc.name });
        }
        
        // v2.1.0: Use current location name instead of hardcoded text
        const location = this.navigator.getCurrentLocation();
        const locationName = location?.name || 'the area';
        this.addTextEntry(`You step back and look around ${locationName}.`, TextEntryTypes.SYSTEM);
        
        // Clear dialogue state
        this.currentNPC = null;
        this.currentDialogueNode = null;
        
        // Update action bar back to location context
        this._updateActionBar();
    }
    
    /**
     * Handle "Leave" button from action bar
     */
    _handleLeaveDialogue() {
        this._removeDialogueResponses();
        this._leaveDialogue();
    }
    
    // ============================================
    // CENTERED OVERLAY SYSTEM
    // ============================================
    
    /**
     * Open a centered overlay panel
     */
    _openPanel(title, content) {
        const overlay = this.container.querySelector('#panelOverlay');
        const titleEl = this.container.querySelector('#panelTitle');
        const contentEl = this.container.querySelector('#panelContent');
        
        if (overlay && titleEl && contentEl) {
            titleEl.textContent = title;
            contentEl.innerHTML = content;
            overlay.classList.add('active');
            this.isPanelOpen = true;
        }
    }
    
    /**
     * Close the centered overlay panel
     */
    _closePanel() {
        const overlay = this.container.querySelector('#panelOverlay');
        
        if (overlay) {
            overlay.classList.remove('active');
            this.isPanelOpen = false;
        }
        
        // Clear forge state when closing panel
        this._forgeBaseItem = null;
        this._forgeSacrificeItem = null;
        
        // If in dialogue, return to dialogue options
        if (this.currentNPC) {
            const dialogueNode = getDialogueNode(this.currentNPC, this.currentDialogueNode || 'root');
            if (dialogueNode?.options) {
                // Add a browsing comment
                const comment = getNPCBrowsingComment(this.currentNPC);
                const npc = getNPC(this.currentNPC);
                if (comment && npc) {
                    this.addTextEntry(comment, TextEntryTypes.NPC, { speaker: npc.name });
                }
                this._addDialogueResponses(dialogueNode.options);
            }
        }
    }
    
    /**
     * Open placeholder panel for unimplemented features
     */
    _openPlaceholderPanel(title, message) {
        this._openPanel(title, `
            <div class="placeholder-panel">
                <p>${message}</p>
                <p class="coming-soon">This feature is coming in a future update!</p>
            </div>
        `);
    }


    // ============================================
    // FORGE PANEL SYSTEM (v2.3.0 - Uses ForgeUI component)
    // ============================================
    
    /**
     * Open the Forge upgrade panel
     * Delegates to ForgeUI component for all forge functionality
     */
    _openForgePanel() {
        const npc = getNPC(this.currentNPC);
        const title = npc ? `${npc.icon} ${npc.name} - The Forge` : '🔥 The Forge';
        
        // Initialize ForgeUI if needed
        if (!this._forgeUI) {
            this._forgeUI = new ForgeUI(this.container, this.character, {
                onRefresh: () => this._openForgePanel(),
                onSave: () => eventBus.emit(GameEvents.SAVE_GAME),
                onResult: (result) => this._showForgeResult(result),
                onTextOutput: (message) => this.addTextEntry(message, TextEntryTypes.IMPORTANT)
            });
        } else {
            // Update character reference in case inventory changed
            this._forgeUI.updateCharacter(this.character);
        }
        
        // Build and display panel content
        const content = this._forgeUI.buildContent(title);
        this._openPanel(title, content);
        
        // Setup event handlers
        setTimeout(() => this._forgeUI.setupHandlers(), 0);
    }
    
    /**
     * Show forge result overlay
     * @param {Object} result - Result with outcome and message
     */
    _showForgeResult(result) {
        // Add result to text feed
        this.addTextEntry(result.message, TextEntryTypes.IMPORTANT);
        
        // Build result content
        const content = this._forgeUI.buildResultContent(result);
        
        // Update panel content
        const panelContent = this.container.querySelector('#panelContent');
        if (panelContent) {
            panelContent.innerHTML = content;
            
            // Setup close handler
            setTimeout(() => {
                this._forgeUI.setupResultHandler(() => this._openForgePanel());
            }, 0);
        }
    }
    
    /**
     * Open forge panel with a specific item pre-selected (v3.1.0)
     * Called from InventoryUI/StatsUI upgrade buttons
     * @param {string} itemId - ID of item to upgrade
     */
    _openForgeWithItem(itemId) {
        // Find the item in inventory or equipment
        const item = this.character.inventory?.find(i => i.id === itemId) ||
                     Object.values(this.character.equipment || {}).find(i => i?.id === itemId);
        
        if (!item) {
            console.warn('[TownScreen] Cannot open forge - item not found:', itemId);
            return;
        }
        
        // Close any open modals first
        this._closeModal();
        
        // Initialize ForgeUI if needed
        if (!this._forgeUI) {
            this._forgeUI = new ForgeUI(this.container, this.character, {
                onRefresh: () => this._openForgePanel(),
                onSave: () => eventBus.emit(GameEvents.SAVE_GAME),
                onResult: (result) => this._showForgeResult(result),
                onTextOutput: (message) => this.addTextEntry(message, TextEntryTypes.IMPORTANT)
            });
        } else {
            this._forgeUI.updateCharacter(this.character);
        }
        
        // Set the item in forge slot
        this._forgeUI.setBaseItem(item);
        
        // Open the forge panel
        this._openForgePanel();
    }


    // ============================================
    // SHOP PANEL SYSTEM (v2.4.0 - Uses ShopUI component)
    // ============================================
    
    /**
     * Open shop panel in buy or sell mode
     * Delegates to ShopUI component for all shop functionality
     */
    _openShopPanel(mode = 'buy') {
        const npc = getNPC(this.currentNPC);
        const shopId = npc?.shopId || 'town';
        const title = npc ? `${npc.icon} ${npc.name}` : '🏪 Shop';
        
        // Initialize ShopUI if needed
        if (!this._shopUI) {
            this._shopUI = new ShopUI(this.container, this.character, {
                onRefresh: () => this._openShopPanel(this._shopUI?.getState()?.currentTab || 'buy'),
                onSave: () => eventBus.emit(GameEvents.SAVE_GAME),
                onBuyReaction: (item, price) => {
                    const reaction = getNPCPurchaseReaction(this.currentNPC);
                    if (reaction && npc) {
                        this.addTextEntry(reaction, TextEntryTypes.NPC, { speaker: npc.name });
                    }
                },
                onSellReaction: (item, price, itemName) => {
                    const reaction = getNPCSaleReaction(this.currentNPC);
                    if (reaction && npc) {
                        this.addTextEntry(reaction, TextEntryTypes.NPC, { speaker: npc.name });
                    }
                }
            });
        } else {
            // Update character reference in case inventory changed
            this._shopUI.updateCharacter(this.character);
        }
        
        // Set shop and tab
        this._shopUI.setShop(shopId);
        this._shopUI.setTab(mode);
        
        // Check if shop is available
        if (!this._shopUI.isAvailable()) {
            this._openPlaceholderPanel('Shop', 'Shop unavailable');
            return;
        }
        
        // Build and display panel content
        const content = this._shopUI.buildContent(title);
        this._openPanel(title, content);
        
        // Setup event handlers
        setTimeout(() => this._shopUI.setupHandlers(), 0);
    }


    // ============================================
    // BANK PANEL SYSTEM (v3.0.0 - Uses BankUI component)
    // ============================================
    
    /**
     * Open the Bank panel
     * Delegates to BankUI component for all banking functionality
     * @param {string} mode - Initial tab: 'gold', 'vault', or 'expand'
     */
    _openBankPanel(mode = 'gold') {
        const npc = getNPC(this.currentNPC);
        const title = npc ? `${npc.icon} ${npc.name}` : '🏦 Ironvault Depository';
        
        // Initialize BankUI if needed
        if (!this._bankUI) {
            this._bankUI = new BankUI(this.container, this.character, {
                onRefresh: () => this._openBankPanel(this._bankUI?.getState()?.currentTab || 'gold'),
                onSave: () => eventBus.emit(GameEvents.SAVE_GAME),
                onTextOutput: (message) => this.addTextEntry(message, TextEntryTypes.IMPORTANT)
            });
        } else {
            // Update character reference in case currency/inventory changed
            this._bankUI.updateCharacter(this.character);
        }
        
        // Set initial tab
        this._bankUI.setTab(mode);
        
        // Build and display panel content
        const content = this._bankUI.buildContent(title);
        this._openPanel(title, content);
        
        // Setup event handlers
        setTimeout(() => this._bankUI.setupHandlers(), 0);
    }


    // ============================================
    // HOUSING PANEL SYSTEM (v2.8.0 - Uses HousingUI component)
    // ============================================
    
    /**
     * Open the player housing panel
     * Delegates to HousingUI component for all housing functionality
     */
    _openHousingPanel() {
        const title = '🏠 Your Home';
        
        // Initialize HousingUI if needed
        if (!this._housingUI) {
            this._housingUI = new HousingUI(this.container, this.character, {
                onRefresh: () => this._openHousingPanel(),
                onSave: () => eventBus.emit(GameEvents.SAVE_GAME),
                onResult: (result) => this._showHousingResult(result),
                onTextOutput: (message) => this.addTextEntry(message, TextEntryTypes.IMPORTANT)
            });
        } else {
            // Update character reference in case currency/materials changed
            this._housingUI.updateCharacter(this.character);
        }
        
        // Build and display panel content
        const content = this._housingUI.buildContent(title);
        this._openPanel(title, content);
        
        // Setup event handlers
        setTimeout(() => this._housingUI.setupHandlers(), 0);
    }
    
    /**
     * Show housing upgrade result overlay
     * @param {Object} result - Result with success status and details
     */
    _showHousingResult(result) {
        // Build result content
        const content = this._housingUI.buildResultContent(result);
        
        // Update panel content
        const panelContent = this.container.querySelector('#panelContent');
        if (panelContent) {
            panelContent.innerHTML = content;
            
            // Setup close handler
            setTimeout(() => {
                this._housingUI.setupResultHandler(() => this._openHousingPanel());
            }, 0);
        }
    }


    /**
     * Handle temple healing
     */
    _handleTempleHeal() {
        const wasFullHealth = this.character.currentHealth >= this.character.maxHealth;
        const wasFullMana = this.character.currentMana >= this.character.maxMana;
        
        if (wasFullHealth && wasFullMana) {
            const npc = getNPC('priest');
            this.addTextEntry(
                "You are already in perfect health, child. Save my blessings for when you truly need them.",
                TextEntryTypes.NPC,
                { speaker: npc?.name || 'Priestess' }
            );
        } else {
            this.character.currentHealth = this.character.maxHealth;
            this.character.currentMana = this.character.maxMana;
            
            const npc = getNPC('priest');
            this.addTextEntry(
                "The light washes over you, mending your wounds and restoring your spirit.",
                TextEntryTypes.NPC,
                { speaker: npc?.name || 'Priestess' }
            );
            this.addTextEntry('✨ Health and Mana fully restored!', TextEntryTypes.IMPORTANT);
            
            this._updateStatusBars();
            eventBus.emit(GameEvents.SAVE_GAME);
        }
        
        // Return to dialogue
        if (this.currentNPC) {
            const dialogueNode = getDialogueNode(this.currentNPC, this.currentDialogueNode || 'root');
            if (dialogueNode?.options) {
                this._addDialogueResponses(dialogueNode.options);
            }
        }
    }
    
    // ============================================
    // BADGE MANAGEMENT
    // ============================================
    
    // ============================================
    // EVENT LISTENERS
    // ============================================
    
    _setupEventListeners() {
        // MUD Action buttons
        this._setupActionBarListeners();
        
        // Exit buttons (v2.0.0)
        this._setupExitListeners();
        
        // Location icon click for image popup (v2.5.0)
        const locationIcon = this.container.querySelector('#locationIconContainer');
        if (locationIcon) {
            locationIcon.addEventListener('click', () => this._showLocationImagePopup());
        }
        
        // Main Nav buttons - delegated to MainNavBar component
        this._navBar.attach(this.container);

        // Tutorial system — notify TutorialManager that town screen is ready
        eventBus.emit(GameEvents.TOWN_SCREEN_READY, {});
        
        // Modal close
        const modalClose = this.container.querySelector('#modalClose');
        modalClose?.addEventListener('click', () => this._closeModal());
        
        const modal = this.container.querySelector('#townModal');
        modal?.addEventListener('click', (e) => {
            if (e.target === modal) this._closeModal();
        });
        
        // Panel close
        const panelClose = this.container.querySelector('#panelClose');
        panelClose?.addEventListener('click', () => this._closePanel());
        
        // Scroll management is handled by MudTextRenderer (instantiated after DOM render in _init)
    }
    
    // ============================================
    // MUD ACTION HANDLERS
    // ============================================
    
    /**
     * Handle MUD action button click
     * v2.1.0: Now detects NPC buttons (prefixed with 'npc_') and starts dialogue
     * v2.8.0: Added 'home'/'housing' action handlers
     */
    _handleMudAction(action) {
        // v2.1.0: Check if this is an NPC button click
        if (action.startsWith('npc_')) {
            const npcId = action.replace('npc_', '');
            this._startDialogue(npcId);
            return;
        }
        
        switch (action) {
            case 'look':
                this._handleLook();
                break;
            case 'shop':
            case 'buy':
                this._handleShopAction();
                break;
            case 'sell':
                this._handleSellAction();
                break;
            case 'smith':
                this._handleSmithAction();
                break;
            case 'forge':
                this._openForgePanel();
                break;
            case 'temple':
            case 'heal':
                this._handleTempleAction();
                break;
            case 'rest':
                this._handleRest();
                break;
            case 'rumors':
                this._handleRumors();
                break;
            case 'leave':
                this._handleLeaveDialogue();
                break;
            case 'depart':
                this._handleDepart();
                break;
            case 'notices':
                this._handleNotices();
                break;
            case 'drink':
                this._handleDrink();
                break;
            case 'repair':
                this._handleRepair();
                break;
            case 'identify':
                this._handleIdentify();
                break;
            case 'bless':
                this._handleBless();
                break;
            case 'pray':
                this._handlePray();
                break;
            case 'bounties':
                this._handleBounties();
                break;
            case 'contracts':
                this._handleContracts();
                break;
            case 'deposit':
            case 'withdraw':
                this._openBankPanel('gold');
                break;
            case 'vault':
                this._openBankPanel('vault');
                break;
            case 'bank':
                this._openBankPanel('gold');
                break;
            case 'research':
                this._handleResearch();
                break;
            case 'ships':
                this._handleShips();
                break;
            // NEW v2.9.0: Housing actions
            case 'home':
            case 'housing':
                if (this.callbacks.onNavigate) {
                    this.callbacks.onNavigate('housing');
                }
                break;
            default:
                this.addTextEntry(`You consider ${action}...`, TextEntryTypes.SYSTEM);
        }
    }
    
    // v2.1.0: New placeholder handlers for location-specific actions
    _handleSellAction() {
        if (this.currentNPC) {
            this._openShopPanel('sell');
        } else {
            this.addTextEntry("You need to talk to a merchant first.", TextEntryTypes.SYSTEM);
        }
    }
    
    _handleDepart() {
        // Open world map
        this._showWorldMapModal();
    }
    
    _handleNotices() {
        this.addTextEntry("You scan the notice board. Most postings are mundane—lost items, job offerings, local events. Nothing catches your eye today.", TextEntryTypes.NARRATION);
    }
    
    _handleDrink() {
        this.addTextEntry("You signal for a drink. Marta slides a mug down the bar with practiced ease.", TextEntryTypes.NARRATION);
        this.addTextEntry("The ale is cool and refreshing. You feel your spirits lift.", TextEntryTypes.SYSTEM);
    }
    
    _handleRepair() {
        this.addTextEntry("*Coming soon* Torgin's repair services aren't quite ready yet.", TextEntryTypes.SYSTEM);
    }
    
    _handleIdentify() {
        this.addTextEntry("*Coming soon* Magical identification services aren't available yet.", TextEntryTypes.SYSTEM);
    }
    
    _handleBless() {
        this.addTextEntry("*Coming soon* Blessing rituals require preparation. Check back later.", TextEntryTypes.SYSTEM);
    }
    
    _handlePray() {
        this.addTextEntry("You kneel before the altar and offer a quiet prayer. A sense of peace washes over you.", TextEntryTypes.NARRATION);
    }
    
    _handleBounties() {
        this.addTextEntry("*Coming soon* The bounty system is being reorganized.", TextEntryTypes.SYSTEM);
    }
    
    _handleContracts() {
        this.addTextEntry("*Coming soon* Expedition contracts aren't available yet.", TextEntryTypes.SYSTEM);
    }
    
    _handleDeposit() {
        this._openBankPanel('gold');
    }
    
    _handleWithdraw() {
        this._openBankPanel('gold');
    }
    
    _handleVault() {
        this._openBankPanel('vault');
    }
    
    _handleResearch() {
        this.addTextEntry("*Coming soon* The research archives are being reorganized.", TextEntryTypes.SYSTEM);
    }
    
    _handleShips() {
        this.addTextEntry("You scan the harbor. Several ships rest at anchor, but none are taking passengers today.", TextEntryTypes.NARRATION);
    }
    
    _handleLook() {
        // Use NPC-specific look text if in dialogue
        const context = this.currentNPC || this.currentLocationId;
        const lookText = getRandomLookText(context);
        if (lookText) {
            this.addTextEntry(lookText, TextEntryTypes.NARRATION);
        } else {
            this.addTextEntry('You look around but see nothing of particular interest.', TextEntryTypes.NARRATION);
        }
    }
    
    _handleShopAction() {
        if (this.currentNPC === 'shopkeeper') {
            // Already talking to shopkeeper, just show root dialogue
            const dialogueNode = getDialogueNode('shopkeeper', 'root');
            if (dialogueNode?.options) {
                this._removeDialogueResponses();
                this._addDialogueResponses(dialogueNode.options);
            }
        } else {
            // Start dialogue with shopkeeper
            this._startDialogue('shopkeeper');
        }
    }
    
    _handleSmithAction() {
        if (this.currentNPC === 'blacksmith') {
            const dialogueNode = getDialogueNode('blacksmith', 'root');
            if (dialogueNode?.options) {
                this._removeDialogueResponses();
                this._addDialogueResponses(dialogueNode.options);
            }
        } else {
            this._startDialogue('blacksmith');
        }
    }
    
    _handleTempleAction() {
        if (this.currentNPC === 'priest') {
            const dialogueNode = getDialogueNode('priest', 'root');
            if (dialogueNode?.options) {
                this._removeDialogueResponses();
                this._addDialogueResponses(dialogueNode.options);
            }
        } else {
            this._startDialogue('priest');
        }
    }
    
    _handleRest() {
        const wasFullHealth = this.character.currentHealth >= this.character.maxHealth;
        const wasFullMana = this.character.currentMana >= this.character.maxMana;
        
        this.character.currentHealth = this.character.maxHealth;
        this.character.currentMana = this.character.maxMana;
        
        this.addTextEntry(
            'You rent a room at the Rusty Anchor inn. The bed is simple but clean, and you drift into a peaceful sleep...',
            TextEntryTypes.NARRATION
        );
        
        if (wasFullHealth && wasFullMana) {
            this.addTextEntry(
                'You were already well-rested, but the break was nice.',
                TextEntryTypes.SYSTEM
            );
        } else {
            this.addTextEntry(
                `✨ You wake feeling refreshed! Health and Mana fully restored.`,
                TextEntryTypes.IMPORTANT
            );
        }
        
        this._updateStatusBars();
        eventBus.emit(GameEvents.SAVE_GAME);
    }
    
    _handleRumors() {
        const rumor = getRandomRumor(this.currentLocationId);
        if (rumor) {
            this.addTextEntry(rumor, TextEntryTypes.RUMOR);
        } else {
            this.addTextEntry('The townsfolk seem tight-lipped today.', TextEntryTypes.SYSTEM);
        }
    }
    
    _updateStatusBars() {
        // HP bar
        const healthFill = this.container.querySelector('.mud-player-status .health-bar .bar-fill');
        const healthText = this.container.querySelector('.mud-player-status .health-bar .bar-text');
        if (healthFill) healthFill.style.width = `${this._getHealthPercent()}%`;
        if (healthText) healthText.textContent = `${this.character.currentHealth}/${this.character.maxHealth} HP`;
        
        // MP bar
        const manaFill = this.container.querySelector('.mud-player-status .mana-bar .bar-fill');
        const manaText = this.container.querySelector('.mud-player-status .mana-bar .bar-text');
        if (manaFill) manaFill.style.width = `${this._getManaPercent()}%`;
        if (manaText) manaText.textContent = `${this.character.currentMana}/${this.character.maxMana} MP`;
        
        // XP bar
        const xpFill = this.container.querySelector('.mud-player-status .xp-bar .bar-fill');
        const xpText = this.container.querySelector('.mud-player-status .xp-bar .bar-text');
        if (xpFill) xpFill.style.width = `${this._getXPPercent()}%`;
        if (xpText) xpText.textContent = `${(this.character.xp || 0).toLocaleString()} XP`;
        
        // Gold label
        const goldText = this.container.querySelector('.mud-player-status .gold-label-text');
        if (goldText) goldText.textContent = `💰 ${(this.character.gold || 0).toLocaleString()}`;
        
        // Player identity (level may change)
        const levelEl = this.container.querySelector('.mud-player-status .player-identity-class');
        if (levelEl) {
            const classData = getClass(this.character.classId);
            levelEl.textContent = `Lv.${this.character.level || 1} ${classData?.name || 'Unknown'}`;
        }
    }
    
    // ============================================
    // MAIN NAVIGATION HANDLERS
    // ============================================
    
    // ============================================
    // MODAL METHODS (Character, Inventory, Skills, Map, Menu)
    // ============================================
    
    /**
     * Show world map modal with WorldMapUI component (v1.3.0)
     */
    _showWorldMapModal() {
        this._openModal('🗺️ World Map', `
            <div class="world-map-container" id="worldMapContainer"></div>
        `);
        
        // Initialize WorldMapUI component
        setTimeout(() => {
            const container = this.container.querySelector('#worldMapContainer');
            if (!container) return;
            
            this.worldMapUI = new WorldMapUI(container, this.character, {
                isInTown: true,
                currentMapId: 'town',
                onTravel: (data) => {
                    this._closeModal();
                    
                    // Add departure text
                    const map = getMap(data.mapId);
                    if (map) {
                        this.addTextEntry(`You set out for ${map.name}...`, TextEntryTypes.SYSTEM);
                    }
                    
                    if (this.callbacks.onNavigate) {
                        // Pass mapId and optional position
                        this.callbacks.onNavigate(`worldmap:${data.mapId}`, data.returnToPosition);
                    }
                },
                onClose: () => {
                    this._closeModal();
                }
            });
        }, 0);
    }
    
    _showCharacterModal() {
        this._openModal('📊 Character', '<div id="statsContainer" class="stats-modal-container"></div>');
        
        setTimeout(() => {
            const container = this.container.querySelector('#statsContainer');
            if (container) {
                // Clean up previous instance if exists
                if (this._statsUI) {
                    this._statsUI.destroy();
                }
                
                this._statsUI = new StatsUI({
                    player: this.character,
                    containerElement: container,
                    onStatAllocated: (stat, newValue) => {
                        this.addTextEntry(`You feel your ${stat} growing stronger.`, TextEntryTypes.SYSTEM);
                    },
                    onRefreshNeeded: () => {
                        this._navBar?.update();
                        this._updateStatusBars();
                    },
                    // v3.1.0: Add upgrade callback for quick forge access
                    onUpgradeItem: (itemId) => this._openForgeWithItem(itemId),
                    // v3.2.0: Empty slot click opens inventory with matching filter
                    onEmptySlotClick: (slot, filter) => {
                        this._closeModal();
                        this._showInventoryModal({ activeTab: 'gear', filterBy: filter });
                    }
                });
                this._statsUI.render();
            }
        }, 0);
    }
    
    _showInventoryModal(options = {}) {
        this._openModal('🎒 Inventory', '<div id="inventoryContainer" class="inventory-modal-container"></div>');
        
        setTimeout(() => {
            const container = this.container.querySelector('#inventoryContainer');
            if (container) {
                // Clean up previous instance if exists
                if (this._inventoryUI) {
                    this._inventoryUI.destroy();
                }
                
                this._inventoryUI = new InventoryUI({
                    player: this.character,
                    containerElement: container,
                    onEquip: (itemId) => this._handleEquip(itemId),
                    onUnequip: (slot) => this._handleUnequip(slot),
                    onEquipPotion: (itemId) => this._handleEquipPotion(itemId),
                    onUnequipPotion: (potionType) => this._handleUnequipPotion(potionType),
                    onPotionSettingsChange: (settings) => {
                        // Settings saved within InventoryUI
                    },
                    // v3.1.0: Add upgrade callback for quick forge access
                    onUpgradeItem: (itemId) => this._openForgeWithItem(itemId)
                });
                
                // v3.2.0: Apply optional tab/filter from caller (e.g., empty slot click)
                if (options.activeTab) {
                    this._inventoryUI.activeTab = options.activeTab;
                }
                if (options.filterBy) {
                    this._inventoryUI.filterBy = options.filterBy;
                }
                
                this._inventoryUI.render();
            }
        }, 0);
    }
    
    _handleEquipPotion(itemId) {
        const potionItem = this.character.inventory.find(item => item.id === itemId);
        if (!potionItem) return;
        if (this.character.equipPotion) {
            const result = this.character.equipPotion(potionItem);
            if (result.success) {
                eventBus.emit(GameEvents.SAVE_GAME);
                if (this._inventoryUI) {
                    this._inventoryUI.refresh();
                }
            }
        }
    }
    
    _handleUnequipPotion(potionType) {
        if (this.character.unequipPotion) {
            const result = this.character.unequipPotion(potionType);
            if (result.success) {
                eventBus.emit(GameEvents.SAVE_GAME);
                if (this._inventoryUI) {
                    this._inventoryUI.refresh();
                }
            }
        }
    }
    
    _handleAutoPotionToggle(potionType, enabled) {
        if (!this.character.potionSettings) this.character.potionSettings = {};
        if (potionType === 'health') this.character.potionSettings.autoHealthEnabled = enabled;
        else if (potionType === 'mana') this.character.potionSettings.autoManaEnabled = enabled;
        eventBus.emit(GameEvents.SAVE_GAME);
    }
    
    _handlePotionThresholdChange(potionType, threshold) {
        if (!this.character.potionSettings) this.character.potionSettings = {};
        if (potionType === 'health') this.character.potionSettings.autoHealthThreshold = threshold;
        else if (potionType === 'mana') this.character.potionSettings.autoManaThreshold = threshold;
        eventBus.emit(GameEvents.SAVE_GAME);
    }
    
    _handleEquip(itemId) {
        const result = this.character.equipItem(itemId);
        if (result.success) {
            eventBus.emit(GameEvents.SAVE_GAME);
            if (this._inventoryUI) {
                this._inventoryUI.refresh();
            }
            this._updateStatusBars();
        }
    }
    
    _handleUnequip(slot) {
        const result = this.character.unequipItem(slot);
        if (result.success) {
            eventBus.emit(GameEvents.SAVE_GAME);
            if (this._inventoryUI) {
                this._inventoryUI.refresh();
            }
            this._updateStatusBars();
        }
    }
    
    _showSkillsModal() {
        if (this.skillTreeUI) { this.skillTreeUI.destroy(); this.skillTreeUI = null; }
        const modal = this.container.querySelector('#townModal');
        const modalHeader = this.container.querySelector('.modal-header');
        const modalBody = this.container.querySelector('#modalBody');
        if (modal && modalBody) {
            // Hide the outer modal header - SkillTreeUI has its own header
            if (modalHeader) modalHeader.style.display = 'none';
            modalBody.innerHTML = '<div id="skillTreeContainer" class="skill-tree-container"></div>';
            const skillTreeContainer = modalBody.querySelector('#skillTreeContainer');
            this.skillTreeUI = new SkillTreeUI(skillTreeContainer, this.character, () => { this._closeModal(); this._navBar?.update(); });
            modal.style.display = 'flex';
        }
    }
    
    _showMenuModal() {
        this._openModal('☰ Menu', `
            <div class="menu-options">
                <button class="menu-btn" id="btnSaveGame">💾 Save Game</button>
                <button class="menu-btn" id="btnCharSelect">👥 Character Select</button>
                <div class="menu-divider"></div>
                <button class="menu-btn" id="btnHelpFaq">📖 Help &amp; FAQ</button>
                <button class="menu-btn" id="btnReleaseNotes">📋 Release Notes</button>
                <div class="menu-divider"></div>
                <div class="menu-section-title">📚 Tutorials</div>
                <button class="menu-btn" id="btnReplayTownTutorial">🏘 Replay: Town Guide</button>
                <button class="menu-btn" id="btnReplayHousingTutorial">🏠 Replay: Housing Guide</button>
                <button class="menu-btn" id="btnReplayWorldMapTutorial">🗺 Replay: World Map Guide</button>
                <button class="menu-btn" id="btnReplayBattleTutorial">⚔ Replay: Battle Guide</button>
                <div class="menu-divider"></div>
                <div class="menu-section-title">⚗️ Special</div>
                <button class="menu-btn menu-btn--special" id="btnTestingGround">🪆 Testing Ground</button>
                <div class="menu-divider"></div>
                <button class="menu-btn" id="btnLogout">🚪 Logout</button>
            </div>
        `);
        setTimeout(() => {
            this.container.querySelector('#btnSaveGame')?.addEventListener('click', () => { eventBus.emit(GameEvents.SAVE_GAME); this._closeModal(); this.addTextEntry('Game saved.', TextEntryTypes.SYSTEM); });
            this.container.querySelector('#btnCharSelect')?.addEventListener('click', () => { this._closeModal(); if (this.callbacks.onNavigate) this.callbacks.onNavigate('charselect'); });
            this.container.querySelector('#btnHelpFaq')?.addEventListener('click', () => this._showDocModal('📖 Help & FAQ', './data/HELP_FAQ.md'));
            this.container.querySelector('#btnReleaseNotes')?.addEventListener('click', () => this._showDocModal('📋 Release Notes', './data/RELEASE_NOTES.md'));
            this.container.querySelector('#btnReplayTownTutorial')?.addEventListener('click', () => {
                // Already on town screen — reset and start directly
                this._closeModal();
                window.game?._tutorialManager?.replayTutorial('townScreen');
            });
            this.container.querySelector('#btnReplayHousingTutorial')?.addEventListener('click', () => {
                // Queue replay then navigate to housing — HOUSING_SCREEN_READY fires tutorial
                this._closeModal();
                window.game?._tutorialManager?.queueReplay('housingScreen');
                if (this.callbacks.onNavigate) this.callbacks.onNavigate('housing');
            });
            this.container.querySelector('#btnReplayWorldMapTutorial')?.addEventListener('click', () => {
                // Queue replay then open World Map modal — WORLD_MAP_OPENED fires tutorial
                this._closeModal();
                window.game?._tutorialManager?.queueReplay('worldMap');
                this._showWorldMapModal();
            });
            this.container.querySelector('#btnReplayBattleTutorial')?.addEventListener('click', () => {
                // Queue replay then open World Map — player travels to a map and BATTLE_MAP_READY fires
                this._closeModal();
                window.game?._tutorialManager?.queueReplay('battleMap');
                this._showWorldMapModal();
            });
            this.container.querySelector('#btnLogout')?.addEventListener('click', () => { this._closeModal(); if (this.callbacks.onLogout) this.callbacks.onLogout(); });
            // Testing Ground (v3.8.0)
            this.container.querySelector('#btnTestingGround')?.addEventListener('click', () => {
                this._closeModal();
                if (this.callbacks.onNavigate) this.callbacks.onNavigate('testing_ground');
            });
        }, 0);
    }

    /**
     * Show a Markdown content file inside the standard modal (v3.7.0)
     * Used for Help & FAQ and Release Notes.
     * Fetches the file (cached after first load) and renders it with a
     * lightweight Markdown renderer from DocViewerUtils.
     * @param {string} title  - Modal header text
     * @param {string} path   - Path to .md file relative to game root
     */
    _showDocModal(title, path) {
        this._openModal(title, '<div class="doc-viewer"><div class="doc-loading">⏳ Loading...</div></div>');
        const body = this.container.querySelector('.doc-viewer');
        if (!body) return;
        fetchDoc(path)
            .then(text => { body.innerHTML = renderMarkdown(text); })
            .catch(err  => { body.innerHTML = `<p class="doc-error">⚠️ Could not load content.<br><small>${err.message}</small></p>`; });
    }

    /**
     * Show resurrection modal after player death
     */
    showResurrection(deathInfo) {
        const killerName = deathInfo?.killer?.name || 'mysterious forces';
        const killerLevel = deathInfo?.killer?.level ? ` (Level ${deathInfo.killer.level})` : '';
        const droppedItems = deathInfo?.droppedItems || [];
        
        this.addTextEntry(`💀 You have fallen in battle! Slain by ${killerName}${killerLevel}.`, TextEntryTypes.COMBAT);
        
        if (droppedItems.length > 0) {
            const itemNames = droppedItems.map(item => ItemUtils.getName(item)).join(', ');
            this.addTextEntry(`Items lost: ${itemNames}`, TextEntryTypes.SYSTEM);
        } else {
            this.addTextEntry('You were fortunate—no items were lost this time.', TextEntryTypes.SYSTEM);
        }
        
        this.addTextEntry('The priests of the Temple have called your spirit back from the void.', TextEntryTypes.IMPORTANT);
        this._updateStatusBars();
        
        // Navigate to temple — you wake up where the priests resurrected you
        // Suppress travel flavor text since the resurrection message already covers it
        if (this.navigator && this.navigator.currentLocationId !== 'temple') {
            this._suppressNavText = true;
            this._navigateToLocation('temple');
            this._suppressNavText = false;
        }
    }
    
    /**
     * Show offline progress modal (NEW v2.6.0)
     * Displays rewards earned while the player was away
     * @param {Object} progress - Offline progress results from OfflineProgressSystem
     */
    showOfflineProgress(progress) {
        if (!progress) return;
        
        // Don't show if no meaningful progress and not town idle
        if (progress.type === 'none' && progress.reason !== 'town') return;
        if (progress.type === 'battle' && progress.kills === 0 && progress.xpEarned === 0) return;
        
        this._offlineProgressModal = new OfflineProgressModal(
            this.container,
            progress,
            {
                onClose: () => {
                    this._offlineProgressModal = null;
                    // Add welcome back message to text feed
                    if (progress.type === 'battle' && progress.kills > 0) {
                        this.addTextEntry(
                            `While you were away, you slew ${progress.kills} enemies and earned ${progress.xpEarned} XP!`,
                            TextEntryTypes.IMPORTANT
                        );
                        if (progress.deathOccurred) {
                            this.addTextEntry(
                                `Unfortunately, you fell in battle after ${progress.deathTimeFormatted}. The priests have restored you.`,
                                TextEntryTypes.SYSTEM
                            );
                        }
                    } else if (progress.type === 'none' && progress.reason === 'town') {
                        this.addTextEntry(
                            `You rested safely in town while away.`,
                            TextEntryTypes.NARRATION
                        );
                    }
                    // Update UI to reflect any changes
                    this._updateStatusBars();
                    this._navBar?.update();
                }
            }
        );
    }
    
    // ============================================
    // LOCATION IMAGE POPUP (v2.5.0)
    // ============================================
    
    /**
     * Show a larger view of the location image in a modal popup
     * Falls back to emoji display if no image is available
     */
    _showLocationImagePopup() {
        const location = this.navigator.getCurrentLocation();
        const imagePath = location?.imagePath;
        const emoji = location?.icon || '🏛️';
        const name = location?.name || "Eron's Landing";
        
        const content = imagePath
            ? `<div class="location-image-popup">
                   <img src="${imagePath}" alt="${name}" class="location-popup-img"
                        onerror="this.outerHTML='<div class=\\'location-popup-emoji\\'>${emoji}</div>'">
               </div>`
            : `<div class="location-image-popup">
                   <div class="location-popup-emoji">${emoji}</div>
               </div>`;
        
        this._openModal(`📍 ${name}`, content);
    }
    
    // ============================================
    // MODAL HELPERS
    // ============================================
    
    _openModal(title, content) {
        const modal = this.container.querySelector('#townModal');
        const modalTitle = this.container.querySelector('#modalTitle');
        const modalBody = this.container.querySelector('#modalBody');
        if (modal && modalTitle && modalBody) {
            modalTitle.textContent = title;
            modalBody.innerHTML = content;
            modal.style.display = 'flex';
        }
    }
    
    _closeModal() {
        const modal = this.container.querySelector('#townModal');
        if (modal) modal.style.display = 'none';
        
        // Restore modal header visibility (may have been hidden for SkillTreeUI)
        const modalHeader = this.container.querySelector('.modal-header');
        if (modalHeader) modalHeader.style.display = '';
        
        // Clean up SkillTreeUI if it exists
        if (this.skillTreeUI) { 
            this.skillTreeUI.destroy(); 
            this.skillTreeUI = null; 
        }
        
        // Clean up WorldMapUI if it exists (NEW v1.3.0)
        if (this.worldMapUI) {
            this.worldMapUI.destroy();
            this.worldMapUI = null;
        }
        
        // Clean up InventoryUI if it exists (NEW v1.5.0)
        if (this._inventoryUI) {
            this._inventoryUI.destroy();
            this._inventoryUI = null;
        }
        
        // Clean up StatsUI if it exists (NEW v1.6.0)
        if (this._statsUI) {
            this._statsUI.destroy();
            this._statsUI = null;
        }
    }
    
    // ============================================
    // UTILITY METHODS
    // ============================================
    
    _getHealthPercent() { return this.character.maxHealth > 0 ? Math.round((this.character.currentHealth / this.character.maxHealth) * 100) : 0; }
    _getManaPercent() { return this.character.maxMana > 0 ? Math.round((this.character.currentMana / this.character.maxMana) * 100) : 0; }
    _getXPPercent() { return this.character.xpToNextLevel > 0 ? Math.round((this.character.xp / this.character.xpToNextLevel) * 100) : 0; }

    
    addCombatSummary(summary) {
        if (!summary) return;
        const lines = [`⚔️ Battle Summary: ${summary.mapName || 'Unknown'}`, `━━━━━━━━━━━━━━━━━━━━━`, `Enemies Slain: ${summary.enemiesDefeated || 0}`, `XP Gained: +${summary.xpGained || 0}`, `Gold Found: +${summary.goldGained || 0}`];
        if (summary.itemsFound && summary.itemsFound.length > 0) lines.push(`Items: ${summary.itemsFound.join(', ')}`);
        this.addTextEntry(lines.join('\n'), TextEntryTypes.COMBAT);
        if (summary.leveledUp) this.addTextEntry(`✦ Level Up! You are now Level ${this.character.level}. ✦`, TextEntryTypes.IMPORTANT);
        this._navBar?.update();
    }
    
    updateCharacter(character) { this.character = character; this._init(); }
    
    destroy() {
        // Stop ambient events (NEW v1.4.0)
        this._stopAmbientEvents();
        
        // Stop town regen (NEW v3.3.0)
        this._stopTownRegen();
        
        this.container.innerHTML = '';
        this.container.classList.remove('town-screen');
        
        if (this.skillTreeUI) { 
            this.skillTreeUI.destroy(); 
            this.skillTreeUI = null; 
        }
        
        // Clean up WorldMapUI (NEW v1.3.0)
        if (this.worldMapUI) {
            this.worldMapUI.destroy();
            this.worldMapUI = null;
        }
        
        // Clean up InventoryUI (NEW v1.5.0)
        if (this._inventoryUI) {
            this._inventoryUI.destroy();
            this._inventoryUI = null;
        }
        
        // Clean up StatsUI (NEW v1.6.0)
        if (this._statsUI) {
            this._statsUI.destroy();
            this._statsUI = null;
        }
        
        // Clean up ForgeUI (NEW v2.3.0)
        if (this._forgeUI) {
            this._forgeUI.destroy();
            this._forgeUI = null;
        }
        
        // Clean up ShopUI (NEW v2.4.0)
        if (this._shopUI) {
            this._shopUI.destroy();
            this._shopUI = null;
        }
        
        // Clean up BankUI (NEW v3.0.0)
        if (this._bankUI) {
            this._bankUI.destroy();
            this._bankUI = null;
        }
        
        // Clean up HousingUI (NEW v2.8.0)
        if (this._housingUI) {
            this._housingUI.destroy();
            this._housingUI = null;
        }
        
        // Clean up OfflineProgressModal (NEW v2.6.0)
        if (this._offlineProgressModal) {
            this._offlineProgressModal.destroy();
            this._offlineProgressModal = null;
        }
    }
}

export default TownScreen;
