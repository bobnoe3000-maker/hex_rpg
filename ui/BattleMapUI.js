/**
 * @file BattleMapUI.js
 * @description Main battle screen wrapper component that manages the battle map interface.
 *              Coordinates the hex grid, action logs, player status, and battle controls.
 *              Handles user input for combat, movement, and map navigation.
 *              Includes potion quick slots with cooldown display and main navigation bar.
 *              Integrates AnimationManager for combat visual feedback.
 *              Features 2 floating log windows:
 *              - Chat (top): Player chat with min/med/expanded states
 *              - Combat/Events (bottom): Tabbed log with med/maximized states
 * 
 * @usage Instantiated by main.js when entering a battle map. Contains HexGrid as
 *        sub-component. Listens for combat/movement events and updates UI accordingly.
 * @dependencies 
 *   - GameConfig (config/gameConfig.js)
 *   - EventBus, GameEvents (systems/EventBus.js)
 *   - HexGrid (ui/HexGrid.js)
 *   - SkillBarUI (ui/SkillBarUI.js)
 *   - SkillTreeUI (ui/SkillTreeUI.js)
 *   - WorldMapUI (ui/WorldMapUI.js)
 *   - InventoryUI (ui/InventoryUI.js)
 *   - StatsUI (ui/StatsUI.js)
 *   - SkillEngine (engine/SkillEngine.js)
 *   - TargetType (config/skillConfig.js)
 *   - MainNavButtons (config/mudConfig.js)
 *   - ItemUtils (utils/ItemUtils.js)
 *   - getClass (config/classConfig.js)
 *   - getRace (config/raceConfig.js)
 *   - AnimationManager (ui/animations/AnimationManager.js)
 * 
 * @version 0.45.0
 * @changelog
 *   - v0.45.0 (2026-03-09): TestSkillBar integration. Imports TestSkillBar.js. Added
 *                           #testSkillBarMount div between battle-main and battle-footer.
 *                           _initTestSkillBar() mounts/destroys component based on isTestMap.
 *                           destroy() cleans up _testSkillBar. Combat log shows rank-1 usage.
 *   - v0.44.0 (2026-03-09): Testing Ground support. isTestMap sandbox badge injected into
 *                           location header in loadMap(). XP and LOOT_SPAWNED log entries
 *                           suppressed when mapData.isTestMap=true. Testing Ground button
 *                           added to ☰ Menu (hidden when already on test map). Routes via
 *                           MAP_EXIT + window.game._handleTownNavigation('testing_ground').
 *   - v0.43.0 (2026-03-08): Injected .fx-gif-layer div between CanvasOverlay and
 *                           .floating-text-layer for Phase 3 particle FX system.
 *   - v0.42.0 (2026-03-07): Action log 3-state resize (minimized/medium/maximized) matching
 *                          chat pattern. Added ▬ button, _cycleLogsState(), _setLogsState()
 *                          handles minimized class, logsState default 'medium'.
 *                          Gold toggle uses container class 'log-hide-gold' on eventLogContent.
 *                          Gold drop/pickup builders: separator inside span.gold to prevent
 *                          orphan ',' and 'and' when hiding gold.
 *                          Reset player.autoBattleEnabled=false on loadMap() to fix double-click bug.
 *   - v0.41.0 (2026-03-06): Added Help & FAQ and Release Notes to ☰ Menu. Imports
 *                           DocViewerUtils. Added _showDocModal(). Removed placeholder
 *                           Settings button (replaced by Help/Release Notes).
 *   - v0.40.0 (2026-03-05): Extracted nav bar to shared MainNavBar component. Removed
 *                           _setupMainNav, _handleNavClick, _updateBadges methods. Replaced
 *                           MainNavButtons import with MainNavBar. All _updateBadges() calls
 *                           replaced with _navBar.update(this.player). Badge rendering now
 *                           uses CSS visible class (dot) consistent with TownScreen/HousingScreen.
 *   - v0.39.0
 * @changelog
 *   - v0.39.0 (2026-02-26): Added terrain tile preloading in loadMap(). Import
 *                          preloadTerrainTiles from terrainAssets.js. loadMap() is now async,
 *                          preloads terrain tiles before rendering grid. Callers in main.js
 *                          don't need to await — fire-and-forget is safe since preload completes
 *                          fast (~190KB) and SVG images render as they load anyway.
 *   - v0.38.0 (2026-02-10): Fixed hex tile health bars not updating during combat.
 *                          Added hexGrid.updateEntityHealth() calls to COMBAT_HIT,
 *                          COMBAT_HEAL, COMBAT_DAMAGE, POTION_USED, and GAME_TICK
 *                          event handlers. Both player and NPC tile bars now animate.
 *   - v0.37.0 (2026-02-10): Aligned battle header with town header layout. Replaced
 *                          player-info/player-bars with shared player-identity + status-grid.
 *                          2x2 grid: HP/MP top row, XP/Gold bottom row. Gold now styled
 *                          label (no bar). Added class name to player identity. Updated
 *                          element caching and _updatePlayerStatus() for new DOM.
 *   - v0.36.0 (2026-02-10): Fixed potion combat log showing "healed for 0 HP". Event emits
 *                           'amountRestored' but handler read 'amount'. Changed to match.
 *   - v0.35.0 (2026-02-09): Added Phase 4 proc effect displays: shield gained, mana drained,
 *                          bonus damage. Updated trigger suffix to show 'Empowered' for buffs
 *                          and exclude instant effects (bonusDamage, heal, manaDrain) from suffix.
 *   - v0.34.0 (2026-02-09): Added proc system combat log integration. PROC_TRIGGERED displays
 *                          colored proc name with source/target. PROC_EFFECT_APPLIED shows
 *                          reflect damage, heal/lifesteal amounts, shield gained, and bonus damage.
 *   - v0.33.0 (2026-02-09): Updated AnimationManager init to handle async properly. The v2.0.0
 *                          AnimationManager uses dynamic imports for CanvasOverlay, StatusIconManager,
 *                          and ScreenShake. Since _init() is called from constructor (can't be async),
 *                          the promise is handled with .catch() to avoid unhandled rejections while
 *                          preserving the synchronous init flow for all other setup.
 *   - v0.32.0 (2026-02-08): Added onEmptySlotClick callback to StatsUI - clicking an empty
 *                          gear slot opens inventory with matching filter pre-selected.
 *                          _showInventoryModal() now accepts optional filter/tab parameters.
 *   - v0.31.0 (2025-02-03): Added Forge access from battle map. Added ForgeUI import and
 *                          _forgeUI instance. Added onUpgradeItem callbacks to InventoryUI
 *                          and StatsUI. Added _openForgeWithItem(), _openForgeModal(),
 *                          _refreshForgeModal(), _showForgeResult() methods. Added Forge
 *                          button to Menu modal. Added ForgeUI cleanup in destroy().
 *   - v0.30.0 (2025-01-27): Added material drops to Events log. LOOT_SPAWNED and LOOT_PICKUP
 *                          handlers now display housing materials with icons and quantities.
 *                          Added _getMaterialDisplayName() and _getMaterialIcon() helpers.
 *                          Also fixed potion color check to use potionType instead of type.
 *   - v0.29.0 (2025-01-27): Fixed potion cooldown animation not showing. getHealthPotionCooldown()
 *                          returns seconds but cooldown config is in milliseconds - now converts
 *                          properly so the overlay height percentage is correct.
 *   - v0.28.0 (2025-01-27): Fixed gold toggle - selector was looking for '.gold-only' but
 *                          entries have class 'log-gold-only'. Now uses correct selector.
 *   - v0.27.0 (2025-01-27): Fixed potion slots not showing equipped potions in skill bar.
 *                          _updatePotionDisplay() now calls getHealthPotionCount()/getManaPotionCount()
 *                          methods instead of accessing non-existent properties.
 *   - v0.25.0 (2025-01-26): Fixed skill tree modal nesting - hide outer modal header when showing
 *                          SkillTreeUI since it has its own header. Added modalHeader to elements cache.
 *   - v0.24.0 (2025-01-24): Restored ActionLogUI-style formatting with timestamps, colored names,
 *                          inline item colors. Added STATUS_APPLIED/STATUS_TICK handlers for effects.
 *                          Added UI_ACTION_LOG routing. XP/Level up now in Combat tab. Fixed loot display.
 *   - v0.23.0 (2025-01-23): Chat window now shows only mock player messages (20 rotating messages
 *                          every 8-15 sec). Removed NPC_DIALOGUE from chat. Added LOOT_SPAWNED
 *                          listener for loot drop events in Events tab.
 *   - v0.22.0 (2025-01-23): Renamed Combat Log to Action Log. Added "Hide 💰" toggle to filter
 *                          gold-only drops. Fixed logs to maintain consistent height even when empty.
 *   - v0.21.0 (2025-01-23): Chat UI refinement - removed header, moved size controls to input row,
 *                          added chat icon that cycles states. Default chat state is minimized.
 *                          Hex grid sized to fit between minimized chat and medium logs.
 *   - v0.20.0 (2025-01-23): FLOATING LOGS REDESIGN - Chat window (top) with player messages,
 *                          input field, and min/med/expanded states. Combined Combat/Event log
 *                          (bottom) with tabs (Combat/Events/All) and med/max states.
 *                          Chat expanded stops at logs top; logs maximized stops below min chat.
 *   - v0.19.0 (2025-01-23): FLOATING LOGS - Replaced ActionLogUI with 3 floating windows
 *                          (Chat, Combat, Events). Each window has minimize/medium/maximize
 *                          states. Removed nearby panel. Logs float over hex map.
 *   - v0.18.3 (2025-01-23): Integrated smooth sliding movement - entities now glide between tiles.
 *                          Added resetEntityPosition call on ENTITY_MOVE_END to prevent transform drift.
 *   - v0.18.2 (2025-01-21): Fixed world map showing wrong current location. Now passes
 *                          isInTown: false and currentMapId to WorldMapUI when in battle.
 *   - v0.18.1 (2025-01-19): Fixed nearby panel: removed duplicate level text, fixed health bar
 *                          classes, removed distance display for cleaner layout.
 *   - v0.18.0 (2025-01-19): Integrated modular StatsUI component for character stats.
 *                          Removed duplicate stats modal code (~100 lines).
 *   - v0.17.0 (2025-01-19): Integrated modular InventoryUI component for tabbed inventory.
 *                          Removed duplicate inventory modal code (~140 lines).
 *   - v0.16.2 (2025-01-19): Fixed skill execution - pass skill object instead of skillId to SkillEngine.
 *                          Added SKILL_USED event listener for auto-cast combat logging.
 *   - v0.16.1 (2025-01-18): Fixed skill bar not updating when equipping skills from modal.
 *                          Added SKILL_EQUIPPED/UNEQUIPPED event listeners for real-time updates.
 *   - v0.16.0 (2025-01-18): Updated stats and inventory modals to match TownScreen format.
 *                          Added stat allocation, equip/unequip, potion management in battle UI.
 *   - v0.15.4 (2025-01-18): Fixed sprite rendering to handle image paths (assets/rat.png) vs emojis
 *   - v0.15.3 (2025-01-18): Changed npc.icon to npc.sprite in entity list for proper creature icons
 *   - v0.15.2 (2025-01-18): Fixed NPC property names in entity list (currentHealth/maxHealth)
 *   - v0.15.1 (2025-01-18): Fixed property names to match Character model (currentHealth/maxHealth,
 *                          currentMana/maxMana, unspentSkillPoints, totalStats, attackPower)
 *   - v0.15.0 (2025-01-18): Added AnimationManager for floating combat text (damage/heal/miss).
 *                          Added floating-text-layer container in battle-main.
 *   - v0.14.0 (2025-01-18): Combined skill bar, auto-battle, and potions into single action row.
 *                          Moved auto-skills and auto-loot toggles to Menu modal.
 *   - v0.13.0 (2025-01-18): Added main navigation bar (Stats, Items, Skills, Map, Menu).
 *                          Removed FAB menu (replaced by Menu nav button).
 *                          Added modal system for inventory, stats, skills, world map, and menu.
 *   - v0.12.1 (2025-01-12): Fixed XP bar to use correct property names (xp, xpToNextLevel), update gold on loot pickup
 *   - v0.12.0 (2025-01-12): Added XP progress bar and gold display to battle header
 *   - v0.11.0 (2025-01-12): Moved Auto Skills toggle to FAB menu, restored Auto Battle button to footer
 *   - v0.10.0 (2025-01-12): Moved Auto, Loot, Exit buttons to floating menu (FAB) for cleaner mobile UI
 *   - v0.9.1 (2025-01-12): Removed parry button from battle controls for better mobile layout
 *   - v0.9.0 (2025-01-10): Refactored to use centralized SkillUtils for consistent skill property access
 *   - v0.8.2 (2025-01-10): Fixed skill.name undefined in combat log - now handles plain objects from save/load
 *   - v0.8.1 (2025-01-10): Fixed skill messages to appear in combat log instead of event log
 *   - v0.8.0 (2025-01-10): Complete skill execution integration with targeting (B→A→C priority),
 *                          SkillEngine wiring, combat logging, and target selection tracking
 *   - v0.7.0 (2025-01-10): Integrated SkillBarUI component to display equipped skills during combat
 *   - v0.6.3 (2025-01-03): PERFORMANCE FIX - Added ENTITY_MOVE_STEP listener for smooth movement,
 *                          use updateEntityPosition/removeEntity/addEntity instead of full re-render
 *   - v0.6.2 (2025-01-03): Added GAME_TICK listener to update HP/MP bars during silent regen
 *   - v0.6.1 (2025-01-03): Fixed exit button - emit MAP_EXIT instead of undefined REQUEST_EXIT_MAP
 *   - v0.6.0 (2025-01-03): Added potion quick slots with quantity display, cooldown overlay, manual use
 *   - v0.5.1 (2025-01-02): Removed duplicate map entry log (ActionLogUI handles via MAP_ENTER)
 *   - v0.5.0 (2025-01): Fixed loot handling - use LOOT_SPAWNED event, update Nearby panel
 *   - v0.4.2 (2025-01-01): Added exit button to return to town from battle map
 *   - v0.4.1 (2025-01): Initial version with mobile-first layout, nearby panel, split logs
 */

import { GameConfig } from '../config/gameConfig.js';
import { eventBus, GameEvents } from '../systems/EventBus.js';
import { HexGrid } from './HexGrid.js';
import { SkillBarUI } from './SkillBarUI.js';
import { SkillTreeUI } from './SkillTreeUI.js';
import { TestSkillBar } from './TestSkillBar.js';  // v0.45.0 — Testing Ground
import { WorldMapUI } from './WorldMapUI.js';
import { InventoryUI } from './InventoryUI.js';
import { StatsUI } from './StatsUI.js';
import { ForgeUI } from './ForgeUI.js';
import SkillEngine from '../engine/SkillEngine.js';
import { TargetType } from '../config/skillConfig.js';
import { SkillUtils } from '../utils/SkillUtils.js';
import { MainNavBar } from './MainNavBar.js';
import { ItemUtils } from '../utils/ItemUtils.js';
import { getClass } from '../config/classConfig.js';
import { getRace } from '../config/raceConfig.js';
import { AnimationManager } from './animations/AnimationManager.js';
import { preloadTerrainTiles } from '../config/terrainAssets.js';
import { fetchDoc, renderMarkdown } from '../utils/DocViewerUtils.js';

export class BattleMapUI {
    constructor(container) {
        this.container = container;
        this.mapInstance = null;
        this.player = null;
        
        // UI components
        this.hexGrid = null;
        this.skillBarUI = null;
        this.skillTreeUI = null;
        this.worldMapUI = null;
        this.animationManager = null;
        this._inventoryUI = null;
        this._statsUI = null;
        this._forgeUI = null;  // v0.31.0: Forge component
        this._navBar = null;   // MainNavBar component
        this._testSkillBar = null; // v0.45.0: Testing Ground all-skills bar
        
        // UI elements
        this.elements = {};
        
        // Combat targeting
        this.selectedTarget = null;
        
        // Potion cooldown update interval
        this._potionUpdateInterval = null;
        
        this._init();
        this._setupEventListeners();
    }
    
    _init() {
        this.container.classList.add('battle-map-ui');
        
        // Build main nav via shared MainNavBar component
        this._navBar = new MainNavBar(this.player, {
            onStats:  () => this._showStatsModal(),
            onItems:  () => this._showInventoryModal(),
            onSkills: () => this._showSkillsModal(),
            onMap:    () => this._showMapModal(),
            onMenu:   () => this._showMenuModal(),
        });
        const mainNavHtml = this._navBar.buildHTML();
        
        // Create new mobile-first layout with floating log windows
        this.container.innerHTML = `
            <div class="battle-header">
                <div class="location-info">
                    <div class="location-image"></div>
                    <div class="location-text">
                        <h2 class="location-name">Loading...</h2>
                        <p class="location-desc"></p>
                    </div>
                </div>
                <div class="player-status">
                    <div class="player-identity">
                        <div class="player-identity-name"></div>
                        <div class="player-identity-class"></div>
                    </div>
                    <div class="status-grid">
                        <div class="bar health-bar">
                            <div class="bar-fill"></div>
                            <span class="bar-text"></span>
                        </div>
                        <div class="bar mana-bar">
                            <div class="bar-fill"></div>
                            <span class="bar-text"></span>
                        </div>
                        <div class="bar xp-bar">
                            <div class="bar-fill"></div>
                            <span class="bar-text"></span>
                        </div>
                        <div class="gold-label">
                            <span class="gold-label-text">💰 0</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="battle-main">
                <div class="hex-grid-container"></div>
                
                <!-- Floating Chat Window (Top) - Player Chat -->
                <div class="floating-chat" id="floatingChat" data-state="minimized">
                    <div class="chat-content">
                        <div class="chat-log-content"></div>
                    </div>
                    <div class="chat-input-row">
                        <span class="chat-icon">💬</span>
                        <input type="text" class="chat-input" placeholder="Type a message..." disabled>
                        <button class="chat-send-btn" disabled>Send</button>
                        <div class="size-controls">
                            <button class="size-btn active" data-size="minimized" title="Minimize">▬</button>
                            <button class="size-btn" data-size="medium" title="Medium">◧</button>
                            <button class="size-btn" data-size="expanded" title="Expand">▼</button>
                        </div>
                    </div>
                </div>
                
                <!-- Floating Action Log (Bottom) -->
                <div class="floating-logs" id="floatingLogs" data-state="medium">
                    <div class="logs-header">
                        <span class="logs-title">⚔️ Action Log</span>
                        <div class="logs-header-controls">
                            <label class="hide-gold-toggle" title="Hide gold-only drops">
                                <input type="checkbox" id="hideGoldDrops">
                                <span>Hide 💰</span>
                            </label>
                            <div class="size-controls">
                                <button class="size-btn" data-size="minimized" title="Minimize">▬</button>
                                <button class="size-btn active" data-size="medium" title="Medium">◧</button>
                                <button class="size-btn" data-size="maximized" title="Maximize">□</button>
                            </div>
                        </div>
                    </div>
                    <div class="logs-tabs">
                        <div class="log-tab combat-tab active" data-tab="combat">Combat</div>
                        <div class="log-tab event-tab" data-tab="events">Events</div>
                        <div class="log-tab all-tab" data-tab="all">All</div>
                    </div>
                    <div class="logs-content">
                        <div class="combat-log-content"></div>
                        <div class="event-log-content" style="display: none;"></div>
                        <div class="all-log-content" style="display: none;"></div>
                    </div>
                </div>
                
                <!-- Particle FX layer — GIF/spritesheet impacts (z-index 15, Phase 3) -->
                <div class="fx-gif-layer"></div>
                <!-- Floating text layer for combat animations -->
                <div class="floating-text-layer"></div>
            </div>
            
            <!-- Test Skill Bar Mount — visible only on isTestMap maps (v0.45.0) -->
            <div id="testSkillBarMount" class="test-skill-bar-mount" style="display:none"></div>
            
            <div class="battle-footer">
                <!-- Combined Skill Bar + Auto + Potions Row -->
                <div class="battle-action-row">
                    <div class="skill-bar-container"></div>
                    <button class="btn btn-auto-battle" title="Toggle Auto-Battle">
                        <span class="btn-icon">⚔️</span>
                    </button>
                    <div class="quick-items">
                        <div class="potion-slot" data-type="health" title="Health Potion (click to use)">
                            <div class="potion-icon">❤️</div>
                            <div class="potion-quantity">-</div>
                            <div class="potion-cooldown-overlay"></div>
                        </div>
                        <div class="potion-slot" data-type="mana" title="Mana Potion (click to use)">
                            <div class="potion-icon">💧</div>
                            <div class="potion-quantity">-</div>
                            <div class="potion-cooldown-overlay"></div>
                        </div>
                    </div>
                </div>
                
                <!-- Main Navigation Bar -->
                <nav class="main-nav battle-nav">
                    ${mainNavHtml}
                </nav>
            </div>
            
            <!-- Modal for full-screen panels -->
            <div class="battle-modal" id="battleModal" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title" id="modalTitle">Modal</h2>
                        <button class="modal-close" id="modalClose">✕</button>
                    </div>
                    <div class="modal-body" id="modalBody"></div>
                </div>
            </div>
        `;
        
        // Cache elements
        this.elements = {
            locationName: this.container.querySelector('.location-name'),
            locationDesc: this.container.querySelector('.location-desc'),
            locationImage: this.container.querySelector('.location-image'),
            playerName: this.container.querySelector('.player-identity-name'),
            playerLevel: this.container.querySelector('.player-identity-class'),
            playerGold: this.container.querySelector('.gold-label-text'),
            healthBar: this.container.querySelector('.health-bar'),
            healthFill: this.container.querySelector('.health-bar .bar-fill'),
            healthText: this.container.querySelector('.health-bar .bar-text'),
            manaBar: this.container.querySelector('.mana-bar'),
            manaFill: this.container.querySelector('.mana-bar .bar-fill'),
            manaText: this.container.querySelector('.mana-bar .bar-text'),
            xpBar: this.container.querySelector('.xp-bar'),
            xpFill: this.container.querySelector('.xp-bar .bar-fill'),
            xpText: this.container.querySelector('.xp-bar .bar-text'),
            hexGridContainer: this.container.querySelector('.hex-grid-container'),
            battleMain: this.container.querySelector('.battle-main'),
            // Floating chat window (top)
            floatingChat: this.container.querySelector('#floatingChat'),
            chatLogContent: this.container.querySelector('.chat-log-content'),
            chatInput: this.container.querySelector('.chat-input'),
            chatSendBtn: this.container.querySelector('.chat-send-btn'),
            // Floating action log (bottom)
            floatingLogs: this.container.querySelector('#floatingLogs'),
            logsTabs: this.container.querySelector('.logs-tabs'),
            logsContent: this.container.querySelector('.logs-content'),
            combatLogContent: this.container.querySelector('.combat-log-content'),
            eventLogContent: this.container.querySelector('.event-log-content'),
            allLogContent: this.container.querySelector('.all-log-content'),
            hideGoldDrops: this.container.querySelector('#hideGoldDrops'),
            // Footer controls
            btnAutoBattle: this.container.querySelector('.btn-auto-battle'),
            skillBarContainer: this.container.querySelector('.skill-bar-container'),
            potionSlots: this.container.querySelectorAll('.potion-slot'),
            healthPotionSlot: this.container.querySelector('.potion-slot[data-type="health"]'),
            manaPotionSlot: this.container.querySelector('.potion-slot[data-type="mana"]'),
            // Main nav
            mainNav: this.container.querySelector('.main-nav'),
            navButtons: this.container.querySelectorAll('.nav-btn'),
            // Modal
            modal: this.container.querySelector('#battleModal'),
            modalHeader: this.container.querySelector('#battleModal .modal-header'),
            modalTitle: this.container.querySelector('#modalTitle'),
            modalBody: this.container.querySelector('#modalBody'),
            modalClose: this.container.querySelector('#modalClose'),
            // Test skill bar mount (v0.45.0)
            testSkillBarMount: this.container.querySelector('#testSkillBarMount')
        };
        
        // Floating window state tracking
        this.chatState = 'minimized'; // minimized, medium, expanded (default: minimized for max hex visibility)
        this.logsState = 'medium'; // minimized, medium, maximized
        this.activeLogTab = 'combat'; // combat, events, all
        this.hideGoldEntries = false; // Toggle for hiding gold-only drops
        
        // Log entry settings
        this.maxLogEntries = 50;
        
        // Initialize sub-components
        this.hexGrid = new HexGrid(this.elements.hexGridContainer);
        
        // Setup floating window controls
        this._setupFloatingWindows();
        
        // Add mock chat messages
        this._addMockChatMessages();
        
        // Initialize animation manager (after hexGrid is ready)
        // v0.33.0: init() is async (v2.0.0 uses dynamic imports for CanvasOverlay,
        // StatusIconManager, ScreenShake). Since _init() runs from constructor (can't await),
        // we fire-and-forget with .catch(). AnimationManager has null checks so the brief
        // async gap before sub-components load is safe.
        this.animationManager = new AnimationManager(this, this.hexGrid);
        this.animationManager.init(this.elements.battleMain).catch(err => {
            console.error('[BattleMapUI] AnimationManager init error:', err);
        });
        
        // Setup button handlers
        this._setupControls();
        
        // Setup potion slot handlers
        this._setupPotionSlots();
        
        // Setup main nav handlers - delegated to MainNavBar component
        this._navBar.attach(this.container);
        
        // Setup modal close
        this._setupModal();
        
        // Setup log event listeners
        this._setupLogEventListeners();

        // Tutorial system — notify TutorialManager that battle map is ready
        eventBus.emit(GameEvents.BATTLE_MAP_READY, {});
    }

    /**
     * Setup floating window controls for chat and action logs
     */
    _setupFloatingWindows() {
        // Chat window controls - input row contains the size buttons
        const chatEl = this.elements.floatingChat;
        if (chatEl) {
            // Size control buttons (in the input row)
            chatEl.querySelectorAll('.size-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this._setChatState(btn.dataset.size);
                });
            });
            
            // Clicking the chat icon cycles states
            const chatIcon = chatEl.querySelector('.chat-icon');
            chatIcon?.addEventListener('click', () => {
                this._cycleChatState();
            });
        }
        
        // Action logs controls
        const logsEl = this.elements.floatingLogs;
        if (logsEl) {
            // Header click cycles through all 3 states (but not on controls)
            const logsHeader = logsEl.querySelector('.logs-header');
            logsHeader?.addEventListener('click', (e) => {
                if (e.target.closest('.size-btn') || e.target.closest('.hide-gold-toggle')) return;
                this._cycleLogsState();
            });
            
            // Size control buttons
            logsEl.querySelectorAll('.size-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this._setLogsState(btn.dataset.size);
                });
            });
            
            // Tab switching
            logsEl.querySelectorAll('.log-tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    this._switchLogTab(tab.dataset.tab);
                });
            });
            
            // Hide gold toggle
            this.elements.hideGoldDrops?.addEventListener('change', (e) => {
                this.hideGoldEntries = e.target.checked;
                this._toggleGoldEntriesVisibility();
            });
        }
    }
    
    /**
     * Toggle visibility of gold text in event log.
     * Uses a container class so CSS handles both cases:
     *   - .log-gold-only entries are hidden entirely
     *   - span.gold within mixed entries (items + gold) are also hidden
     */
    _toggleGoldEntriesVisibility() {
        this.elements.eventLogContent?.classList.toggle('log-hide-gold', this.hideGoldEntries);
    }
    
    /**
     * Cycle chat window: minimized -> medium -> expanded -> minimized
     */
    _cycleChatState() {
        const states = ['minimized', 'medium', 'expanded'];
        const currentIndex = states.indexOf(this.chatState);
        const nextIndex = (currentIndex + 1) % states.length;
        this._setChatState(states[nextIndex]);
    }
    
    /**
     * Set chat window state
     */
    _setChatState(state) {
        this.chatState = state;
        const chatEl = this.elements.floatingChat;
        if (!chatEl) return;
        
        chatEl.classList.remove('minimized', 'expanded');
        if (state === 'minimized') {
            chatEl.classList.add('minimized');
        } else if (state === 'expanded') {
            chatEl.classList.add('expanded');
        }
        chatEl.dataset.state = state;
        
        // Update button active states
        chatEl.querySelectorAll('.size-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.size === state);
        });
    }
    
    /**
     * Toggle logs between medium and maximized
     */
    /**
     * Cycle logs: minimized -> medium -> maximized -> minimized
     */
    _cycleLogsState() {
        const states = ['minimized', 'medium', 'maximized'];
        const currentIndex = states.indexOf(this.logsState);
        const nextIndex = (currentIndex + 1) % states.length;
        this._setLogsState(states[nextIndex]);
    }

    /**
     * Set combat/event logs state (minimized, medium, or maximized)
     */
    _setLogsState(state) {
        this.logsState = state;
        const logsEl = this.elements.floatingLogs;
        if (!logsEl) return;

        logsEl.classList.remove('minimized', 'maximized');
        if (state === 'minimized') {
            logsEl.classList.add('minimized');
        } else if (state === 'maximized') {
            logsEl.classList.add('maximized');
        }
        logsEl.dataset.state = state;

        // Update button active states
        logsEl.querySelectorAll('.size-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.size === state);
        });
    }
    
    /**
     * Switch between Combat/Events/All tabs
     */
    _switchLogTab(tab) {
        this.activeLogTab = tab;
        const logsEl = this.elements.floatingLogs;
        if (!logsEl) return;
        
        // Update tab button states
        logsEl.querySelectorAll('.log-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tab);
        });
        
        // Show/hide appropriate content
        this.elements.combatLogContent.style.display = (tab === 'combat' || tab === 'all') ? 'block' : 'none';
        this.elements.eventLogContent.style.display = (tab === 'events' || tab === 'all') ? 'block' : 'none';
        this.elements.allLogContent.style.display = 'none'; // Not used directly, we show both
        
        // If "all" tab, show both combat and event content
        if (tab === 'all') {
            this.elements.combatLogContent.style.display = 'block';
            this.elements.eventLogContent.style.display = 'block';
        }
    }
    
    /**
     * Add mock chat messages for testing (player chat only - future multiplayer feature)
     */
    _addMockChatMessages() {
        // Mock player names
        const playerNames = [
            'DarkKnight42', 'HealzForDayz', 'ShadowBlade', 'MysticMage99',
            'DragonSlayer', 'IronFist', 'LightBringer', 'StormCaller',
            'NightHunter', 'CrystalSage', 'ThunderStrike', 'FrostWarden'
        ];
        
        // Mock chat messages
        const mockMessages = [
            { type: 'system', text: 'Welcome to the zone! (Area Chat)' },
            { type: 'other', name: 'DarkKnight42', text: 'Anyone want to party up?' },
            { type: 'other', name: 'HealzForDayz', text: "I'm a healer, LFG!" },
            { type: 'player', text: "Sure, I'll join!" },
            { type: 'other', name: 'DarkKnight42', text: 'Great, heading to the caves' },
            { type: 'system', text: 'DarkKnight42 has invited you to a party.' },
            { type: 'other', name: 'ShadowBlade', text: 'Watch out for the boss near the cliff' },
            { type: 'other', name: 'MysticMage99', text: 'Anyone selling health pots?' },
            { type: 'player', text: 'I have a few extra' },
            { type: 'other', name: 'DragonSlayer', text: 'GG everyone!' },
            { type: 'other', name: 'IronFist', text: 'Where do I find the blacksmith?' },
            { type: 'other', name: 'LightBringer', text: 'Town portal is by the entrance' },
            { type: 'system', text: 'Server: Maintenance in 30 minutes' },
            { type: 'other', name: 'StormCaller', text: 'Anyone know where rare mobs spawn?' },
            { type: 'other', name: 'NightHunter', text: 'Check the northern caves' },
            { type: 'player', text: 'Thanks for the tip!' },
            { type: 'other', name: 'CrystalSage', text: 'LF tank for dungeon run' },
            { type: 'other', name: 'ThunderStrike', text: 'I can tank, inv me' },
            { type: 'other', name: 'FrostWarden', text: 'Good luck out there!' },
            { type: 'system', text: 'A world event has started nearby!' }
        ];
        
        // Add initial messages (show last few)
        const initialCount = 4;
        for (let i = mockMessages.length - initialCount; i < mockMessages.length; i++) {
            const msg = mockMessages[i];
            this._addMockChatEntry(msg);
        }
        
        // Set up rotating messages every 8-15 seconds
        this._mockChatIndex = 0;
        this._mockChatMessages = mockMessages;
        this._startMockChatRotation();
    }
    
    /**
     * Add a single mock chat entry
     */
    _addMockChatEntry(msg) {
        let html;
        if (msg.type === 'system') {
            html = `<span class="system-msg">${msg.text}</span>`;
        } else if (msg.type === 'player') {
            html = `<span class="player-name">You:</span> ${msg.text}`;
        } else {
            html = `<span class="other-player">${msg.name}:</span> ${msg.text}`;
        }
        this._addChatEntry(html, msg.type);
    }
    
    /**
     * Start rotating mock chat messages
     */
    _startMockChatRotation() {
        // Clear any existing interval
        if (this._mockChatInterval) {
            clearInterval(this._mockChatInterval);
        }
        
        // Add a new message every 8-15 seconds
        const addRandomMessage = () => {
            const msg = this._mockChatMessages[this._mockChatIndex];
            this._addMockChatEntry(msg);
            this._mockChatIndex = (this._mockChatIndex + 1) % this._mockChatMessages.length;
            
            // Schedule next message with random delay
            const delay = 8000 + Math.random() * 7000; // 8-15 seconds
            this._mockChatTimeout = setTimeout(addRandomMessage, delay);
        };
        
        // Start after initial delay
        this._mockChatTimeout = setTimeout(addRandomMessage, 5000);
    }
    
    /**
     * Stop mock chat rotation (call on destroy)
     */
    _stopMockChatRotation() {
        if (this._mockChatTimeout) {
            clearTimeout(this._mockChatTimeout);
            this._mockChatTimeout = null;
        }
    }
    
    /**
     * Setup event listeners for log entries
     */
    _setupLogEventListeners() {
        // === COMBAT LOG EVENTS ===
        
        eventBus.on(GameEvents.COMBAT_HIT, (data) => {
            const critText = data.isCritical ? ' <span class="crit">CRITICAL!</span>' : '';
            const attackerName = data.attacker?.name || data.attacker?.displayName || 'Unknown';
            const defenderName = data.defender?.name || data.defender?.displayName || 'Unknown';
            this._addCombatEntry(
                `<span class="attacker">${attackerName}</span> hits ` +
                `<span class="defender">${defenderName}</span> for ` +
                `<span class="damage">${data.damage}</span> damage!${critText}`,
                'combat'
            );
        });
        
        eventBus.on(GameEvents.COMBAT_MISS, (data) => {
            const attackerName = data.attacker?.name || data.attacker?.displayName || 'Unknown';
            const defenderName = data.defender?.name || data.defender?.displayName || 'Unknown';
            this._addCombatEntry(
                `<span class="attacker">${attackerName}</span>'s attack ` +
                `misses <span class="defender">${defenderName}</span>!`,
                'combat miss'
            );
        });
        
        eventBus.on(GameEvents.COMBAT_HEAL, (data) => {
            const { target, amount, source } = data;
            if (source === 'regen') return; // Skip silent regen
            const targetName = target?.name || target?.displayName || 'Unknown';
            this._addCombatEntry(
                `<span class="defender">${targetName}</span> heals for ` +
                `<span class="heal">${amount}</span> HP.`,
                'combat heal'
            );
        });
        
        eventBus.on(GameEvents.COMBAT_DEATH, (data) => {
            const { entity } = data;
            const entityName = entity?.name || entity?.displayName || 'Unknown';
            
            if (entity?.xpValue) {
                // NPC died
                this._addCombatEntry(
                    `<span class="defender">${entityName}</span> has been slain!` +
                    (data.xpValue ? ` <span class="xp">+${data.xpValue} XP</span>` : ''),
                    'combat death'
                );
            } else {
                // Player died
                this._addCombatEntry(
                    `<span class="attacker">${entityName}</span> has fallen in battle!`,
                    'combat player-death'
                );
            }
        });
        
        eventBus.on(GameEvents.POTION_USED, (data) => {
            const charName = data.character?.name || 'You';
            const potionType = data.potionType || 'unknown';
            const amount = data.amountRestored || 0;
            
            if (potionType === 'health') {
                this._addCombatEntry(
                    `<span class="attacker">${charName}</span> drinks a <span class="item" style="color: #e74c3c">Health Potion</span>, ` +
                    `restoring <span class="heal">${amount}</span> HP.`,
                    'combat heal potion'
                );
            } else if (potionType === 'mana') {
                this._addCombatEntry(
                    `<span class="attacker">${charName}</span> drinks a <span class="item" style="color: #3498db">Mana Potion</span>, ` +
                    `restoring <span class="mana-restore">${amount}</span> MP.`,
                    'combat mana potion'
                );
            }
        });
        
        // Status effects
        eventBus.on(GameEvents.STATUS_APPLIED, (data) => {
            if (!data.effect || !data.target) return;
            // Skip proc-triggered effects — already logged by PROC_TRIGGERED handler
            if (data.effect.procId) return;
            const effectName = this._getReadableEffectName(data.effect);
            const targetName = data.target?.name || data.target?.displayName || 'Unknown';
            this._addCombatEntry(
                `<span class="defender">${targetName}</span> is affected by ` +
                `<span class="status">${effectName}</span>!`,
                'status'
            );
        });
        
        eventBus.on(GameEvents.STATUS_TICK, (data) => {
            if (data.damage && data.target) {
                const effectName = this._getReadableEffectName(data.effect);
                const targetName = data.target?.name || data.target?.displayName || 'Unknown';
                this._addCombatEntry(
                    `<span class="defender">${targetName}</span> takes ` +
                    `<span class="damage">${data.damage}</span> <span class="status">${effectName}</span> damage.`,
                    'status dot'
                );
            }
        });
        
        // Proc system events (v0.34.0)
        eventBus.on(GameEvents.PROC_TRIGGERED, (data) => {
            const sourceName = data.source?.name || data.source?.displayName || 'Unknown';
            const targetName = data.target?.name || data.target?.displayName || 'Unknown';
            const procName = data.proc?.name || 'Unknown';
            const procColor = data.proc?.color || '#FFD700';
            
            // Build item display name: "Crackling Iron Dagger" from proc name + base item data
            const baseName = data.item?._baseData?.name || data.item?.name || 'weapon';
            const materialName = data.item?._materialData?.name || '';
            const itemDisplay = `${procName} ${materialName} ${baseName}`.replace(/\s+/g, ' ').trim();
            
            // Build effect suffix based on proc effect type
            let effectSuffix = '';
            const effectType = data.proc?.effect?.type;
            // Status effects show "affected by X" — instant effects (lifesteal, bonusDamage, heal, manaDrain) are handled by PROC_EFFECT_APPLIED
            if (effectType && !['lifesteal', 'bonusDamage', 'heal', 'manaDrain'].includes(effectType)) {
                const effectNames = {
                    burn: 'Burning', stun: 'Stun', slow: 'Slow', poison: 'Poison',
                    reflect: 'Reflect', shield: 'Shield', buff: 'Empowered'
                };
                const effectLabel = effectNames[effectType] || effectType.charAt(0).toUpperCase() + effectType.slice(1);
                // Self-targeting effects (buff, shield) affect source; debuffs affect target
                const selfEffects = ['buff', 'shield'];
                const affectedName = selfEffects.includes(effectType) ? sourceName : targetName;
                effectSuffix = ` <span class="defender">${affectedName}</span> is affected by <span class="status">${effectLabel}</span>!`;
            }
            
            this._addCombatEntry(
                `<span class="proc" style="color: ${procColor}">✦</span> ` +
                `<span class="attacker">${sourceName}</span>'s ` +
                `<span class="proc" style="color: ${procColor}; font-weight: bold; text-shadow: 0 0 3px ${procColor}40">${itemDisplay}</span> ` +
                `triggers on <span class="defender">${targetName}</span>!${effectSuffix}`,
                'combat proc'
            );
        });
        
        eventBus.on(GameEvents.PROC_EFFECT_APPLIED, (data) => {
            const sourceName = data.source?.name || data.source?.displayName || 'Unknown';
            
            // Only log effect lines for results that aren't covered by the trigger line above
            if (data.reflectDamage) {
                this._addCombatEntry(
                    `<span class="defender">${sourceName}</span> reflects ` +
                    `<span class="damage">${data.reflectDamage}</span> damage!`,
                    'combat proc reflect'
                );
            }
            if (data.healAmount) {
                this._addCombatEntry(
                    `<span class="attacker">${sourceName}</span> drains ` +
                    `<span class="heal">${data.healAmount}</span> HP!`,
                    'combat proc heal'
                );
            }
            if (data.bonusDamage) {
                this._addCombatEntry(
                    `<span class="attacker">${sourceName}</span> deals ` +
                    `<span class="damage">${data.bonusDamage}</span> bonus damage!`,
                    'combat proc bonus'
                );
            }
            if (data.shieldAmount) {
                this._addCombatEntry(
                    `<span class="attacker">${sourceName}</span> gains a ` +
                    `<span class="heal">${data.shieldAmount} HP</span> shield!`,
                    'combat proc shield'
                );
            }
            if (data.manaDrained) {
                this._addCombatEntry(
                    `<span class="attacker">${sourceName}</span> drains ` +
                    `<span class="mana-restore">${data.manaDrained}</span> mana from ` +
                    `<span class="defender">${targetName}</span>!`,
                    'combat proc mana'
                );
            }
        });
        
        // XP gain (to combat log like original ActionLogUI)
        eventBus.on(GameEvents.CHARACTER_XP_GAIN, (data) => {
            // Suppress XP log display on test/sandbox maps (v0.42.0)
            if (this.mapInstance?.mapData?.isTestMap) return;
            const charName = data.character?.name || 'You';
            this._addCombatEntry(
                `<span class="attacker">${charName}</span> gained ` +
                `<span class="xp">${data.amount} XP</span>.`,
                'xp'
            );
        });
        
        // Level up (to combat log)
        eventBus.on(GameEvents.CHARACTER_LEVEL_UP, (data) => {
            const charName = data.character?.name || 'You';
            this._addCombatEntry(
                `<span class="level-up">⬆️ LEVEL UP!</span> <span class="attacker">${charName}</span> is now Level ${data.newLevel}!`,
                'levelup'
            );
        });
        
        // === EVENT LOG EVENTS ===
        
        // Loot spawned (drops on ground)
        eventBus.on(GameEvents.LOOT_SPAWNED, (data) => {
            // Suppress loot log display on test/sandbox maps (v0.42.0)
            if (this.mapInstance?.mapData?.isTestMap) return;
            const loot = data.loot;
            if (!loot) return;
            
            const parts = [];
            const hasGold = loot.gold > 0;
            const hasItems = loot.items && loot.items.length > 0;
            const hasPotions = loot.potions && loot.potions.length > 0;
            const hasMaterial = loot.material && loot.material.quantity > 0;
            
            // Gold is NOT added to parts[] — appended last with separator inside the span
            // so hiding span.gold leaves no orphaned comma
            if (hasItems) {
                for (const item of loot.items) {
                    const color = item.color || '#FFD700';
                    parts.push(`<span class="item" style="color:${color}">${item.name || item.displayName || 'item'}</span>`);
                }
            }
            if (hasPotions) {
                for (const potion of loot.potions) {
                    const color = potion.potionType === 'health' ? '#e74c3c' : '#3498db';
                    parts.push(`<span class="item" style="color:${color}">${potion.name || 'Potion'}</span>`);
                }
            }
            if (hasMaterial) {
                const matIcon = this._getMaterialIcon(loot.material.materialId);
                const matName = this._getMaterialDisplayName(loot.material.materialId);
                parts.push(`<span class="item" style="color:#8B4513">${matIcon} ${loot.material.quantity}x ${matName}</span>`);
            }
            
            if (hasGold || parts.length > 0) {
                const nonGoldText = parts.join(', ');
                const goldSpan = hasGold
                    ? `<span class="gold">${parts.length > 0 ? ', ' : ''}${loot.gold} gold</span>`
                    : '';
                const entryType = hasGold && !hasItems && !hasPotions && !hasMaterial ? 'loot drop gold-only' : 'loot drop';
                this._addEventEntry(`💰 Loot dropped: ${nonGoldText}${goldSpan}`, entryType);
            }
        });
        
        // Loot pickup events
        eventBus.on(GameEvents.LOOT_PICKUP, (data) => {
            const loot = data.loot;
            if (!loot) return;
            
            const charName = data.character?.name || 'You';
            
            const items = loot.items?.map(i => {
                const color = i.color || '#FFD700';
                return `<span class="item" style="color:${color}">${i.name || i.displayName || 'item'}</span>`;
            }) || [];
            
            const potions = loot.potions?.map(p => {
                const color = p.potionType === 'health' ? '#e74c3c' : '#3498db';
                return `<span class="item" style="color:${color}">${p.name || 'Potion'}</span>`;
            }) || [];
            
            const hasGold = loot.gold > 0;
            const hasItems = items.length > 0;
            const hasPotions = potions.length > 0;
            const hasMaterial = loot.material && loot.material.quantity > 0;
            
            // Skip if nothing was picked up
            if (!hasGold && !hasItems && !hasPotions && !hasMaterial) return;
            
            let msg = `<span class="attacker">${charName}</span> picked up`;
            
            const allItems = [...items, ...potions];
            
            // Add material to items list
            if (hasMaterial) {
                const matIcon = this._getMaterialIcon(loot.material.materialId);
                const matName = this._getMaterialDisplayName(loot.material.materialId);
                allItems.push(`<span class="item" style="color:#8B4513">${matIcon} ${loot.material.quantity}x ${matName}</span>`);
            }
            
            if (allItems.length > 0) {
                msg += ` ${allItems.join(', ')}`;
            }
            if (hasGold) {
                // Connector lives inside the span so hiding span.gold leaves no orphan 'and'
                const connector = allItems.length > 0 ? ' and ' : ' ';
                msg += `<span class="gold">${connector}${loot.gold} gold</span>`;
            }
            
            const entryType = hasGold && !hasItems && !hasPotions && !hasMaterial ? 'loot pickup gold-only' : 'loot pickup';
            this._addEventEntry(msg, entryType);
        });
        
        // Map events
        eventBus.on(GameEvents.MAP_ENTER, (data) => {
            const mapName = data.mapInstance?.mapData?.name || 'Unknown Area';
            this._addEventEntry(
                `Entered <span class="location">${mapName}</span>.`,
                'environment'
            );
        });
        
        // Ambient events
        eventBus.on(GameEvents.AMBIENT_EVENT, (data) => {
            if (!data?.message) return;
            this._addEventEntry(data.message, 'ambient');
        });
        
        // Generic action log routing
        eventBus.on(GameEvents.UI_ACTION_LOG, (data) => {
            const type = data.type || 'info';
            
            // Skip types already handled by direct listeners
            const handledByDirectListeners = ['loot', 'ambient', 'environment', 'potion'];
            if (handledByDirectListeners.some(t => type.includes(t))) {
                return;
            }
            
            const combatTypes = ['combat', 'status', 'levelup', 'xp', 'death', 'heal', 'miss', 'hit', 'dot'];
            const isCombat = combatTypes.some(t => type.includes(t));
            
            if (isCombat) {
                this._addCombatEntry(data.message, type);
            } else {
                this._addEventEntry(data.message, type);
            }
        });
    }
    
    /**
     * Convert effect data to a human-readable name
     */
    _getReadableEffectName(effect) {
        if (!effect) return 'Unknown';
        
        const effectTypeNames = {
            'damage': 'Damage', 'damage_percent': 'Damage', 'dot': 'Burning', 'bleed': 'Bleeding',
            'heal': 'Healing', 'heal_percent': 'Healing', 'hot': 'Regeneration',
            'buff_damage': 'Damage Boost', 'buff_defense': 'Defense Boost', 'buff_armor': 'Armor Boost',
            'buff_attack_speed': 'Haste', 'buff_crit_chance': 'Critical Focus', 'buff_crit_damage': 'Critical Power',
            'buff_dodge': 'Evasion', 'buff_max_health': 'Fortitude', 'buff_max_mana': 'Arcane Power',
            'debuff_damage': 'Weakness', 'debuff_defense': 'Vulnerability', 'debuff_attack_speed': 'Slowed',
            'stun': 'Stunned', 'slow': 'Slowed', 'root': 'Rooted', 'silence': 'Silenced',
            'fear': 'Feared', 'taunt': 'Taunted', 'blind': 'Blinded',
            'shield': 'Shield', 'reflect': 'Reflect', 'immunity': 'Immunity', 'lifesteal': 'Life Drain'
        };
        
        if (effect.effectType && effectTypeNames[effect.effectType]) {
            return effectTypeNames[effect.effectType];
        }
        
        if (effect.effectType) {
            return effect.effectType.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        }
        
        if (effect.id && !effect.id.startsWith('effect_')) {
            return effect.id.charAt(0).toUpperCase() + effect.id.slice(1);
        }
        
        return 'Effect';
    }
    
    /**
     * Get display name for a housing material
     * @param {string} materialId - Material ID (e.g., 'wood', 'stone')
     * @returns {string} Display name
     */
    _getMaterialDisplayName(materialId) {
        const materialNames = {
            wood: 'Wood', stone: 'Stone', clay: 'Clay',
            iron: 'Iron', hardwood: 'Hardwood', leather: 'Leather',
            marble: 'Marble', silver: 'Silver',
            crystal: 'Crystal', dragonwood: 'Dragonwood',
            ethereal: 'Ethereal Essence', starstone: 'Starstone',
            void_crystal: 'Void Crystal'
        };
        return materialNames[materialId] || materialId.charAt(0).toUpperCase() + materialId.slice(1);
    }
    
    /**
     * Get icon for a housing material
     * @param {string} materialId - Material ID
     * @returns {string} Emoji icon
     */
    _getMaterialIcon(materialId) {
        const materialIcons = {
            wood: '🪵', stone: '🪨', clay: '🧱',
            iron: '⛓️', hardwood: '🌳', leather: '🦴',
            marble: '🔲', silver: '🥈',
            crystal: '💎', dragonwood: '🐉',
            ethereal: '✨', starstone: '⭐',
            void_crystal: '🔮'
        };
        return materialIcons[materialId] || '📦';
    }
    
    /**
     * Add entry to combat log
     */
    _addCombatEntry(message, type = 'info') {
        this._addLogEntry(this.elements.combatLogContent, message, type);
    }
    
    /**
     * Add entry to event log
     */
    _addEventEntry(message, type = 'info') {
        this._addLogEntry(this.elements.eventLogContent, message, type);
    }
    
    /**
     * Add entry to chat log
     */
    _addChatEntry(message, type = 'info') {
        this._addLogEntry(this.elements.chatLogContent, message, type);
    }
    
    /**
     * Generic log entry addition with timestamp
     */
    _addLogEntry(container, message, type) {
        if (!container) return;
        
        const entry = document.createElement('div');
        entry.classList.add('log-entry');
        
        // Add type classes (split by space for multiple types like "loot pickup gold-only")
        for (const cls of type.split(' ')) {
            if (cls) entry.classList.add(`log-${cls}`);
        }
        
        // Apply special styling for certain types
        if (type.includes('loot')) {
            entry.classList.add('log-loot');
        }
        if (type.includes('warning')) {
            entry.classList.add('log-warning');
        }
        if (type.includes('potion')) {
            entry.classList.add('log-potion');
        }
        if (type.includes('gold-only')) {
            entry.classList.add('log-gold-only');
            // Hide immediately if gold entries are hidden
            if (this.hideGoldEntries) {
                entry.classList.add('hidden');
            }
        }
        
        // Add timestamp
        const time = new Date();
        const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        entry.innerHTML = `<span class="log-time">${timeStr}</span> ${message}`;
        
        // Prepend (newest at top)
        container.insertBefore(entry, container.firstChild);
        
        // Scroll to top to show newest
        container.scrollTop = 0;
        
        // Limit entries
        while (container.children.length > this.maxLogEntries) {
            container.removeChild(container.lastChild);
        }
    }
    
    _setupPotionSlots() {
        // Health potion click handler
        this.elements.healthPotionSlot?.addEventListener('click', () => {
            if (this.player && this.player.canUseHealthPotion()) {
                this.player.useHealthPotion();
                this._updatePotionDisplay();
            }
        });
        
        // Mana potion click handler
        this.elements.manaPotionSlot?.addEventListener('click', () => {
            if (this.player && this.player.canUseManaPotion()) {
                this.player.useManaPotion();
                this._updatePotionDisplay();
            }
        });
    }
    
    _setupControls() {
        // Auto-battle toggle
        this.elements.btnAutoBattle.addEventListener('click', () => {
            if (this.player) {
                this.player.autoBattleEnabled = !this.player.autoBattleEnabled;
                this._updateAutoButtons();
                
                eventBus.emit(this.player.autoBattleEnabled ? GameEvents.AUTO_BATTLE_START : GameEvents.AUTO_BATTLE_STOP, {
                    character: this.player
                });
                
                this._addEventEntry(
                    `Auto-battle ${this.player.autoBattleEnabled ? 'enabled' : 'disabled'}.`,
                    'system'
                );
            }
        });
    }
    
    /**
     * Setup main navigation bar handlers
     */
    /**
     * Setup modal close handler
     */
    _setupModal() {
        this.elements.modalClose?.addEventListener('click', () => {
            this._closeModal();
        });
        
        // Close modal when clicking backdrop
        this.elements.modal?.addEventListener('click', (e) => {
            if (e.target === this.elements.modal) {
                this._closeModal();
            }
        });
    }
    
    /**
     * Toggle auto-cast for all equipped skills
     */
    _toggleGlobalAutoSkills() {
        const activeSkills = this.player.activeSkills || [];
        const anyEnabled = activeSkills.some(s => s?.autoCast);
        
        // Toggle all skills to opposite of current state
        activeSkills.forEach(skill => {
            if (skill && skill.type !== 'passive') {
                skill.autoCast = !anyEnabled;
            }
        });
        
        this._updateAutoButtons();
        
        // Refresh skill bar to show updated auto-cast indicators
        if (this.skillBarUI) {
            this.skillBarUI.refresh();
        }
        
        this._addEventEntry(
            `Auto-skills ${!anyEnabled ? 'enabled' : 'disabled'}.`,
            'system'
        );
    }
    
    _setupEventListeners() {
        // Player status updates
        eventBus.on(GameEvents.COMBAT_HIT, (data) => {
            if (data.defender.id === this.player?.id || data.attacker.id === this.player?.id) {
                this._updatePlayerStatus();
            }
            // Update health bars on hex tiles
            if (data.defender) this.hexGrid.updateEntityHealth(data.defender);
            if (data.attacker) this.hexGrid.updateEntityHealth(data.attacker);
        });
        
        eventBus.on(GameEvents.COMBAT_HEAL, (data) => {
            if (data.target.id === this.player?.id) {
                this._updatePlayerStatus();
            }
            // Update health bar on hex tile
            if (data.target) this.hexGrid.updateEntityHealth(data.target);
        });
        
        // Potion used - update display
        eventBus.on(GameEvents.POTION_USED, (data) => {
            if (data.character?.id === this.player?.id) {
                this._updatePlayerStatus();
                this._updatePotionDisplay();
                // Update player health bar on hex tile
                if (this.player) this.hexGrid.updateEntityHealth(this.player);
            }
        });
        
        // NPC death - use efficient removeEntity instead of full re-render
        eventBus.on(GameEvents.COMBAT_DEATH, (data) => {
            if (data.entity.id !== this.player?.id) {
                this.hexGrid.removeEntity(data.entity.id);
                this._updateEntityList();
            }
        });
        
        // NPC spawn - use efficient addEntity instead of full re-render
        eventBus.on(GameEvents.MAP_SPAWN_NPC, (data) => {
            if (data.mapInstance.id === this.mapInstance?.id) {
                if (data.npc) {
                    this.hexGrid.addEntity(data.npc, 'npc');
                }
                this._updateEntityList();
            }
        });
        
        // Movement path display
        eventBus.on(GameEvents.ENTITY_MOVE_START, (data) => {
            if (data.entity.id === this.player?.id) {
                this.hexGrid.renderPath(data.path);
            }
        });
        
        // Movement step - update entity position on each tile movement
        eventBus.on(GameEvents.ENTITY_MOVE_STEP, (data) => {
            this.hexGrid.updateEntityPosition(data.entity);
            // Update remaining path for player
            if (data.entity.id === this.player?.id && data.remaining > 0) {
                this.hexGrid.renderPath(data.entity.movementPath);
            }
        });
        
        eventBus.on(GameEvents.ENTITY_MOVE_END, (data) => {
            if (data.entity.id === this.player?.id) {
                this.hexGrid.clearPath();
            }
            // Reset entity position to prevent transform drift over long sessions
            // This snaps the entity to its final position using direct coordinates
            this.hexGrid.resetEntityPosition(data.entity);
        });
        
        // Loot spawned (from MapInstance after generating loot)
        eventBus.on(GameEvents.LOOT_SPAWNED, (data) => {
            // HexGrid handles rendering via its own listener
            // Update nearby panel to show new loot
            this._updateEntityList();
        });
        
        // Loot pickup - update UI
        eventBus.on(GameEvents.LOOT_PICKUP, (data) => {
            // HexGrid handles removal via its own listener
            // Update nearby panel to remove picked up loot
            this._updateEntityList();
            // Update potion display in case potions were picked up
            this._updatePotionDisplay();
            // Update player status for gold display
            this._updatePlayerStatus();
        });
        
        // Level up
        eventBus.on(GameEvents.CHARACTER_LEVEL_UP, (data) => {
            if (data.character.id === this.player?.id) {
                this._updatePlayerStatus();
                this._navBar?.update(this.player);
            }
        });
        
        // XP gain
        eventBus.on(GameEvents.CHARACTER_XP_GAIN, (data) => {
            if (data.character.id === this.player?.id) {
                this._updatePlayerStatus();
            }
        });
        
        // Game tick - update player status periodically (catches silent regen)
        eventBus.on(GameEvents.GAME_TICK, () => {
            this._updatePlayerStatus();
            // Update player health bar on hex tile (catches silent regen)
            if (this.player) this.hexGrid.updateEntityHealth(this.player);
        });
        
        // Entity click - set selected target for skills
        eventBus.on(GameEvents.INPUT_ENTITY_CLICK, (data) => {
            if (data.entity && data.entity.id !== this.player?.id) {
                this.setSelectedTarget(data.entity);
            }
        });
        
        // Skill damage events - update UI
        eventBus.on(GameEvents.COMBAT_DAMAGE, (data) => {
            // Update player status if player was source or target
            if (data.source?.id === this.player?.id || data.target?.id === this.player?.id) {
                this._updatePlayerStatus();
            }
            // Update health bars on hex tiles
            if (data.target) this.hexGrid.updateEntityHealth(data.target);
            if (data.source) this.hexGrid.updateEntityHealth(data.source);
        });
        
        // Clear selected target when it dies
        eventBus.on(GameEvents.COMBAT_DEATH, (data) => {
            if (this.selectedTarget?.id === data.entity?.id) {
                this.clearSelectedTarget();
            }
        });
        
        // Skill equipped - refresh skill bar immediately
        eventBus.on(GameEvents.SKILL_EQUIPPED, (data) => {
            if (data.character?.id === this.player?.id) {
                this.skillBarUI?.refresh();
                this._navBar?.update(this.player);
            }
        });
        
        // Skill unequipped - refresh skill bar immediately
        eventBus.on(GameEvents.SKILL_UNEQUIPPED, (data) => {
            if (data.character?.id === this.player?.id) {
                this.skillBarUI?.refresh();
            }
        });
        
        // Skill used (auto-cast) - log to combat log and refresh UI
        eventBus.on(GameEvents.SKILL_USED, (data) => {
            if (data.source?.id === this.player?.id && data.auto) {
                // Log auto-cast to combat log
                const skillName = data.skill?.name || data.skill?.config?.name || 'Skill';
                const targetName = data.target === this.player ? 'self' : (data.target?.name || 'target');
                this._addCombatEntry(
                    `${this.player.name} auto-casts ${skillName} on ${targetName}`,
                    'skill'
                );
                
                // Refresh skill bar cooldowns and player status
                this.skillBarUI?.refresh();
                this._updatePlayerStatus();
            }
        });
        
        // Skill learned - update badges
        eventBus.on(GameEvents.CHARACTER_STAT_CHANGE, (data) => {
            if (data.character?.id === this.player?.id && data.type === 'skill_learned') {
                this._navBar?.update(this.player);
            }
        });
    }
    
    /**
     * Load a map instance
     */
    async loadMap(mapInstance, player) {
        this.mapInstance = mapInstance;
        this.player = player;
        this.selectedTarget = null; // Clear any previous target

        // Reset auto-battle on every map entry — ensures button visual and engine
        // state always agree. Without this, a persisted autoBattleEnabled=true shows
        // the button as active but never fires AUTO_BATTLE_START, requiring two clicks.
        if (this.player) {
            this.player.autoBattleEnabled = false;
        }
        
        // Update location info
        this.elements.locationName.textContent = mapInstance.mapData.name;
        this.elements.locationDesc.textContent = mapInstance.mapData.description || '';
        this.elements.locationImage.style.backgroundColor = mapInstance.mapData.backgroundColor || '#333';
        
        // Test map sandbox badge (v0.42.0)
        // Removes any existing badge first so re-entries don't stack
        const existingBadge = this.elements.locationName.querySelector?.('.sandbox-badge') 
            || this.container.querySelector('.sandbox-badge');
        if (existingBadge) existingBadge.remove();
        if (mapInstance.mapData.isTestMap) {
            const badge = document.createElement('span');
            badge.className = 'sandbox-badge';
            badge.textContent = '🧪 SANDBOX';
            // Insert after the location name element
            this.elements.locationName.insertAdjacentElement('afterend', badge);
        }
        
        // Preload terrain tiles before rendering (v0.39.0)
        if (mapInstance.mapData.terrainTiles) {
            const tileKeys = [...new Set(Object.values(mapInstance.mapData.terrainTiles))];
            if (mapInstance.mapData.terrainTileDefault) {
                tileKeys.push(mapInstance.mapData.terrainTileDefault);
            }
            await preloadTerrainTiles(tileKeys);
        }
        
        // Render hex grid
        this.hexGrid.renderGrid(mapInstance);
        
        // Update player status
        this._updatePlayerStatus();
        
        // Update entity list
        this._updateEntityList();
        
        // Update auto buttons
        this._updateAutoButtons();
        
        // Update potion display
        this._updatePotionDisplay();
        
        // Update badges
        this._navBar?.update(this.player);
        
        // Initialize skill bar UI
        this._initSkillBar();
        
        // Initialize Test Skill Bar if on test map (v0.45.0)
        this._initTestSkillBar();
        
        // Start potion cooldown update interval
        this._startPotionCooldownUpdates();
        
        // Start ambient events
        mapInstance.startAmbientEvents();
        
        // Note: Entry message is handled by ActionLogUI via MAP_ENTER event
    }
    
    /**
     * Start interval to update potion cooldown display
     */
    _startPotionCooldownUpdates() {
        // Clear existing interval
        if (this._potionUpdateInterval) {
            clearInterval(this._potionUpdateInterval);
        }
        
        // Update every 100ms for smooth cooldown display
        this._potionUpdateInterval = setInterval(() => {
            this._updatePotionCooldowns();
        }, 100);
    }
    
    /**
     * Update potion cooldown overlays
     */
    _updatePotionCooldowns() {
        if (!this.player) return;
        
        // Health potion cooldown
        const healthCooldownSec = this.player.getHealthPotionCooldown(); // Returns seconds
        const healthOverlay = this.elements.healthPotionSlot?.querySelector('.potion-cooldown-overlay');
        if (healthOverlay) {
            if (healthCooldownSec > 0) {
                const potionInfo = this.player.getHealthPotionInfo();
                const totalCooldownSec = (potionInfo?.cooldown || 10000) / 1000; // Convert ms to seconds
                const percent = Math.min(100, (healthCooldownSec / totalCooldownSec) * 100);
                healthOverlay.style.height = `${percent}%`;
                healthOverlay.classList.add('active');
                this.elements.healthPotionSlot.classList.add('on-cooldown');
                this.elements.healthPotionSlot.title = `Health Potion (${healthCooldownSec.toFixed(1)}s)`;
            } else {
                healthOverlay.style.height = '0%';
                healthOverlay.classList.remove('active');
                this.elements.healthPotionSlot.classList.remove('on-cooldown');
                this.elements.healthPotionSlot.title = 'Health Potion (click to use)';
            }
        }
        
        // Mana potion cooldown
        const manaCooldownSec = this.player.getManaPotionCooldown(); // Returns seconds
        const manaOverlay = this.elements.manaPotionSlot?.querySelector('.potion-cooldown-overlay');
        if (manaOverlay) {
            if (manaCooldownSec > 0) {
                const potionInfo = this.player.getManaPotionInfo();
                const totalCooldownSec = (potionInfo?.cooldown || 10000) / 1000; // Convert ms to seconds
                const percent = Math.min(100, (manaCooldownSec / totalCooldownSec) * 100);
                manaOverlay.style.height = `${percent}%`;
                manaOverlay.classList.add('active');
                this.elements.manaPotionSlot.classList.add('on-cooldown');
                this.elements.manaPotionSlot.title = `Mana Potion (${manaCooldownSec.toFixed(1)}s)`;
            } else {
                manaOverlay.style.height = '0%';
                manaOverlay.classList.remove('active');
                this.elements.manaPotionSlot.classList.remove('on-cooldown');
                this.elements.manaPotionSlot.title = 'Mana Potion (click to use)';
            }
        }
    }
    
    /**
     * Update potion quantity display
     */
    _updatePotionDisplay() {
        if (!this.player) return;
        
        // Health potion - use method if available, fall back to property
        const healthCount = this.player.getHealthPotionCount ? 
            this.player.getHealthPotionCount() : 
            (this.player.healthPotionCount || 0);
        const healthQuantityEl = this.elements.healthPotionSlot?.querySelector('.potion-quantity');
        if (healthQuantityEl) {
            healthQuantityEl.textContent = healthCount > 0 ? healthCount : '-';
            this.elements.healthPotionSlot.classList.toggle('empty', healthCount === 0);
        }
        
        // Mana potion - use method if available, fall back to property
        const manaCount = this.player.getManaPotionCount ? 
            this.player.getManaPotionCount() : 
            (this.player.manaPotionCount || 0);
        const manaQuantityEl = this.elements.manaPotionSlot?.querySelector('.potion-quantity');
        if (manaQuantityEl) {
            manaQuantityEl.textContent = manaCount > 0 ? manaCount : '-';
            this.elements.manaPotionSlot.classList.toggle('empty', manaCount === 0);
        }
    }
    
    /**
     * Update auto-battle button state
     */
    _updateAutoButtons() {
        if (!this.player) return;
        
        // Auto-battle button
        if (this.elements.btnAutoBattle) {
            this.elements.btnAutoBattle.classList.toggle('active', this.player.autoBattleEnabled);
        }
    }
    
    /**
     * Update player status display (HP, MP, XP, Gold)
     */
    _updatePlayerStatus() {
        if (!this.player) return;
        
        // Update name and level/class
        const classData = getClass(this.player.classId);
        this.elements.playerName.textContent = this.player.name;
        this.elements.playerLevel.textContent = `Lv.${this.player.level} ${classData?.name || ''}`;
        this.elements.playerGold.textContent = `💰 ${(this.player.gold || 0).toLocaleString()}`;
        
        // Update HP bar
        const hp = this.player.currentHealth;
        const maxHp = this.player.maxHealth;
        const hpPercent = Math.max(0, Math.min(100, (hp / maxHp) * 100));
        this.elements.healthFill.style.width = `${hpPercent}%`;
        this.elements.healthText.textContent = `${Math.floor(hp)} / ${maxHp} HP`;
        
        // Update MP bar
        const mp = this.player.currentMana;
        const maxMp = this.player.maxMana;
        const mpPercent = maxMp > 0 ? Math.max(0, Math.min(100, (mp / maxMp) * 100)) : 0;
        this.elements.manaFill.style.width = `${mpPercent}%`;
        this.elements.manaText.textContent = `${Math.floor(mp)} / ${maxMp} MP`;
        
        // Update XP bar
        const xp = this.player.xp || 0;
        const xpToNextLevel = this.player.xpToNextLevel || 100;
        const xpPercent = Math.max(0, Math.min(100, (xp / xpToNextLevel) * 100));
        this.elements.xpFill.style.width = `${xpPercent}%`;
        this.elements.xpText.textContent = `${xp.toLocaleString()} XP`;
    }
    
    /**
     * Update entity list in nearby panel
     */
    /**
     * Update internal entity tracking (nearby panel removed, but tracking still needed)
     */
    _updateEntityList() {
        // No-op: Nearby panel removed in v0.19.0
        // Entity selection/targeting is handled via hex grid clicks
    }
    
    /**
     * Calculate hex distance for display
     */
    _getDistance(from, to) {
        const dx = Math.abs(from.q - to.q);
        const dy = Math.abs(from.r - to.r);
        const dz = Math.abs((-from.q - from.r) - (-to.q - to.r));
        return Math.max(dx, dy, dz);
    }
    
    /**
     * Set selected target for combat/skills
     */
    setSelectedTarget(entity) {
        this.selectedTarget = entity;
        this._updateEntityList(); // Update UI to show selection
        this.hexGrid.selectHex(entity.position.q, entity.position.r);
    }
    
    /**
     * Clear selected target
     */
    clearSelectedTarget() {
        this.selectedTarget = null;
        this._updateEntityList();
        this.hexGrid.clearSelection();
    }
    
    /**
     * Initialize skill bar UI
     */
    _initSkillBar() {
        if (this.skillBarUI) {
            this.skillBarUI.destroy();
        }
        
        this.skillBarUI = new SkillBarUI(
            this.elements.skillBarContainer,
            this.player,
            {
                onSkillUse: (skill, slotIndex) => this._handleSkillUse(skill, slotIndex)
            }
        );
    }

    /**
     * Initialize or destroy the Testing Ground all-skills bar (v0.45.0)
     * Only shown when mapData.isTestMap === true.
     */
    _initTestSkillBar() {
        // Destroy any previous instance
        if (this._testSkillBar) {
            this._testSkillBar.destroy();
            this._testSkillBar = null;
        }

        const mount = this.elements.testSkillBarMount;
        if (!mount) return;

        if (!this.mapInstance?.mapData?.isTestMap) {
            mount.style.display = 'none';
            return;
        }

        mount.style.display = '';
        this._testSkillBar = new TestSkillBar(mount, this.player, {
            mapInstance: this.mapInstance,
            getTarget: () => {
                // Mirrors _handleSkillUse target resolution for ENEMY skills
                if (this.selectedTarget && this.selectedTarget.isAlive) {
                    return this.selectedTarget;
                }
                return this._findNearestHostileNPC();
            },
            onSkillResult: (result, skillDef, target) => {
                const skillName = skillDef.name || 'Skill';
                if (result?.success === false) {
                    this._addCombatEntry(
                        `<span class="system">[Test] ${skillName}: ${result.reason || 'Failed'}</span>`,
                        'system'
                    );
                } else {
                    const targetName = target === this.player
                        ? 'self'
                        : (target?.name || target?.displayName || 'target');
                    this._addCombatEntry(
                        `<span class="attacker">${this.player.name}</span> tests ` +
                        `<span class="skill">${skillName}</span> on ${targetName} (rank 1)`,
                        'skill'
                    );
                    this._updatePlayerStatus();
                }
            }
        });
    }
    
    /**
     * Handle manual skill use from skill bar
     */
    _handleSkillUse(skill, slotIndex) {
        if (!this.player || !skill) return;
        
        const skillId = SkillUtils.getId(skill);
        const skillName = SkillUtils.getName(skill);
        const targetType = SkillUtils.getTargetType(skill);
        
        // Determine target based on skill targeting
        let target = null;
        
        if (targetType === TargetType.SELF) {
            target = this.player;
        } else if (targetType === TargetType.ENEMY) {
            // Priority: B (selected) → A (nearest hostile) → C (nearest any)
            if (this.selectedTarget && this.selectedTarget.isAlive) {
                target = this.selectedTarget;
            } else {
                // Find nearest hostile NPC
                target = this._findNearestHostileNPC();
            }
        } else if (targetType === TargetType.ALLY) {
            target = this.player; // For now, self-target for ally skills
        }
        
        if (!target && targetType !== TargetType.SELF) {
            this._addCombatEntry(`${skillName}: No valid target`, 'system');
            return;
        }
        
        // Execute skill via SkillEngine (skill object, not skillId)
        const result = SkillEngine.executeSkill(skill, this.player, target, this.mapInstance);
        
        if (result.success) {
            // Log skill use
            const targetName = target === this.player ? 'self' : target.name;
            this._addCombatEntry(
                `${this.player.name} uses ${skillName} on ${targetName}`,
                'skill'
            );
            
            // Refresh skill bar cooldowns
            this.skillBarUI.refresh();
            this._updatePlayerStatus();
        } else {
            // Log failure reason
            this._addCombatEntry(
                `${skillName}: ${result.reason || 'Failed'}`,
                'system'
            );
        }
    }
    
    /**
     * Find nearest hostile NPC
     */
    _findNearestHostileNPC() {
        if (!this.mapInstance || !this.player) return null;
        
        let nearest = null;
        let nearestDist = Infinity;
        
        for (const npc of this.mapInstance.npcs.values()) {
            if (!npc.isAlive) continue;
            
            const dist = this._getDistance(this.player.position, npc.position);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = npc;
            }
        }
        
        return nearest;
    }
    
    /**
     * Update navigation badges
     */
    /**
     * Show character stats modal using modular StatsUI
     */
    _showStatsModal() {
        if (!this.player) return;
        
        this._openModal('📊 Character', '<div id="statsContainer" class="stats-modal-container"></div>');
        
        setTimeout(() => {
            const container = this.elements.modalBody.querySelector('#statsContainer');
            if (container) {
                // Clean up previous instance if exists
                if (this._statsUI) {
                    this._statsUI.destroy();
                }
                
                this._statsUI = new StatsUI({
                    player: this.player,
                    containerElement: container,
                    onStatAllocated: (stat, newValue) => {
                        this._addEventEntry(`You feel your ${stat} growing stronger.`, 'system');
                    },
                    onRefreshNeeded: () => {
                        this._navBar?.update(this.player);
                        this._updatePlayerStatus();
                    },
                    // v0.31.0: Add upgrade callback for quick forge access
                    onUpgradeItem: (itemId) => this._openForgeWithItem(itemId),
                    // v0.32.0: Empty slot click opens inventory with matching filter
                    onEmptySlotClick: (slot, filter) => {
                        this._closeModal();
                        this._showInventoryModal({ activeTab: 'gear', filterBy: filter });
                    }
                });
                this._statsUI.render();
            }
        }, 0);
    }
    
    /**
     * Show inventory modal (matches TownScreen._showInventoryModal)
     */
    _showInventoryModal(options = {}) {
        if (!this.player) return;
        
        this._openModal('🎒 Inventory', '<div id="inventoryContainer" class="inventory-modal-container"></div>');
        
        setTimeout(() => {
            const container = this.elements.modalBody.querySelector('#inventoryContainer');
            if (container) {
                // Clean up previous instance if exists
                if (this._inventoryUI) {
                    this._inventoryUI.destroy();
                }
                
                this._inventoryUI = new InventoryUI({
                    player: this.player,
                    containerElement: container,
                    onEquip: (itemId) => this._handleEquip(itemId),
                    onUnequip: (slot) => this._handleUnequip(slot),
                    onEquipPotion: (itemId) => this._handleEquipPotion(itemId),
                    onUnequipPotion: (potionType) => this._handleUnequipPotion(potionType),
                    onPotionSettingsChange: (settings) => {
                        this._updatePotionDisplay();
                    },
                    // v0.31.0: Add upgrade callback for quick forge access
                    onUpgradeItem: (itemId) => this._openForgeWithItem(itemId)
                });
                
                // v0.32.0: Apply optional tab/filter from caller (e.g., empty slot click)
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
    
    _handleEquip(itemId) {
        if (!this.player.equipItem) return;
        const result = this.player.equipItem(itemId);
        if (result.success) {
            eventBus.emit(GameEvents.SAVE_GAME);
            if (this._inventoryUI) {
                this._inventoryUI.refresh();
            }
            this._updatePlayerStatus();
        }
    }
    
    /**
     * Handle unequip item
     */
    _handleUnequip(slot) {
        if (!this.player.unequipItem) return;
        const result = this.player.unequipItem(slot);
        if (result.success) {
            eventBus.emit(GameEvents.SAVE_GAME);
            if (this._inventoryUI) {
                this._inventoryUI.refresh();
            }
            this._updatePlayerStatus();
        }
    }
    
    /**
     * Handle equip potion
     */
    _handleEquipPotion(itemId) {
        const potionItem = this.player.inventory.find(item => item.id === itemId);
        if (!potionItem) return;
        if (this.player.equipPotion) {
            const result = this.player.equipPotion(potionItem);
            if (result.success) {
                eventBus.emit(GameEvents.SAVE_GAME);
                if (this._inventoryUI) {
                    this._inventoryUI.refresh();
                }
                this._updatePotionDisplay();
            }
        }
    }
    
    /**
     * Handle unequip potion
     */
    _handleUnequipPotion(potionType) {
        if (this.player.unequipPotion) {
            const result = this.player.unequipPotion(potionType);
            if (result.success) {
                eventBus.emit(GameEvents.SAVE_GAME);
                if (this._inventoryUI) {
                    this._inventoryUI.refresh();
                }
                this._updatePotionDisplay();
            }
        }
    }
    
    /**
     * Handle auto-potion toggle
     */
    _handleAutoPotionToggle(potionType, enabled) {
        if (!this.player.potionSettings) this.player.potionSettings = {};
        if (potionType === 'health') this.player.potionSettings.autoHealthEnabled = enabled;
        else if (potionType === 'mana') this.player.potionSettings.autoManaEnabled = enabled;
        eventBus.emit(GameEvents.SAVE_GAME);
    }
    
    /**
     * Handle potion threshold change
     */
    _handlePotionThresholdChange(potionType, threshold) {
        if (!this.player.potionSettings) this.player.potionSettings = {};
        if (potionType === 'health') this.player.potionSettings.autoHealthThreshold = threshold;
        else if (potionType === 'mana') this.player.potionSettings.autoManaThreshold = threshold;
        eventBus.emit(GameEvents.SAVE_GAME);
    }
    
    /**
     * Get item stat summary for display
     */
    _getItemStatSummary(item) {
        if (!item) return '';
        const stats = ItemUtils.getStats ? ItemUtils.getStats(item) : (item.stats || {});
        if (!stats || Object.keys(stats).length === 0) return '';
        const parts = [];
        if (stats.attack) parts.push(`+${stats.attack} Atk`);
        if (stats.defense) parts.push(`+${stats.defense} Def`);
        if (stats.health) parts.push(`+${stats.health} HP`);
        if (stats.mana) parts.push(`+${stats.mana} MP`);
        if (stats.magicDamage) parts.push(`+${stats.magicDamage} Mag`);
        return parts.slice(0, 2).join(', ');
    }
    
    /**
     * Show skills modal (full skill tree)
     */
    _showSkillsModal() {
        if (this.skillTreeUI) {
            this.skillTreeUI.destroy();
            this.skillTreeUI = null;
        }
        
        // Hide modal header - SkillTreeUI has its own header
        if (this.elements.modalHeader) {
            this.elements.modalHeader.style.display = 'none';
        }
        
        this._openModal('⚔️ Skills', '<div id="skillTreeContainer" class="skill-tree-container"></div>');
        
        setTimeout(() => {
            const container = this.elements.modalBody.querySelector('#skillTreeContainer');
            if (container && this.player) {
                // SkillTreeUI expects a simple onClose callback function
                this.skillTreeUI = new SkillTreeUI(container, this.player, () => {
                    this._closeModal();
                    this._navBar?.update(this.player);
                    // Refresh skill bar when modal closes to pick up any changes
                    this.skillBarUI?.refresh();
                });
            }
        }, 0);
    }
    
    /**
     * Show world map modal
     */
    _showMapModal() {
        if (this.worldMapUI) {
            this.worldMapUI.destroy();
            this.worldMapUI = null;
        }
        
        this._openModal('🗺️ World Map', '<div id="worldMapContainer" class="world-map-container"></div>');
        
        setTimeout(() => {
            const container = this.elements.modalBody.querySelector('#worldMapContainer');
            if (container && this.player) {
                this.worldMapUI = new WorldMapUI(container, this.player, {
                    isInTown: false,  // We're in a battle map, not town
                    currentMapId: this.mapInstance?.mapId || this.player?.currentMapId || 'forest_edge',
                    onTravel: (data) => {
                        this._closeModal();
                        // Emit travel event - handled by main.js
                        eventBus.emit(GameEvents.MAP_EXIT, {
                            character: this.player,
                            mapInstance: this.mapInstance,
                            destinationMapId: data.mapId,
                            returnToPosition: data.returnToPosition
                        });
                    },
                    onClose: () => {
                        this._closeModal();
                    }
                });
            }
        }, 0);
    }
    
    /**
     * Show menu modal with auto toggles
     */
    _showMenuModal() {
        const autoSkillsEnabled = (this.player?.activeSkills || []).some(function(s) { return s && s.autoCast; });
        const autoLootEnabled   = this.player?.autoLootEnabled || false;
        const isTestMap         = this.mapInstance?.mapData?.isTestMap || false;

        const autoSkillClass = autoSkillsEnabled ? ' active' : '';
        const autoLootClass  = autoLootEnabled   ? ' active' : '';
        const autoSkillText  = autoSkillsEnabled ? 'ON' : 'OFF';
        const autoLootText   = autoLootEnabled   ? 'ON' : 'OFF';
        const specialSection = isTestMap ? '' :
            '<div class="menu-divider"></div>' +
            '<div class="menu-section-title">\u2697\ufe0f Special</div>' +
            '<button class="menu-btn menu-btn--special" id="btnTestingGround">\ud83e\uddf8 Testing Ground</button>';

        const content =
            '<div class="menu-options">' +
                '<div class="menu-toggle-row">' +
                    '<span class="menu-toggle-label">\ud83d\udd04 Auto Skills</span>' +
                    '<button class="menu-toggle-btn' + autoSkillClass + '" id="btnToggleAutoSkills">' + autoSkillText + '</button>' +
                '</div>' +
                '<div class="menu-toggle-row">' +
                    '<span class="menu-toggle-label">\ud83d\udcb0 Auto Loot</span>' +
                    '<button class="menu-toggle-btn' + autoLootClass + '" id="btnToggleAutoLoot">' + autoLootText + '</button>' +
                '</div>' +
                '<div class="menu-divider"></div>' +
                '<button class="menu-btn forge" id="btnOpenForge">\ud83d\udd25 Forge</button>' +
                '<button class="menu-btn" id="btnExitMap">\ud83c\udfe0 Return to Town</button>' +
                '<button class="menu-btn" id="btnSaveGame">\ud83d\udcbe Save Game</button>' +
                '<div class="menu-divider"></div>' +
                '<button class="menu-btn" id="btnHelpFaq">\ud83d\udcd6 Help &amp; FAQ</button>' +
                '<button class="menu-btn" id="btnReleaseNotes">\ud83d\udccb Release Notes</button>' +
                '<div class="menu-divider"></div>' +
                '<div class="menu-section-title">\ud83d\udcda Tutorials</div>' +
                '<button class="menu-btn" id="btnReplayTownTutorial">\ud83c\udfd8 Replay: Town Guide</button>' +
                '<button class="menu-btn" id="btnReplayHousingTutorial">\ud83c\udfe0 Replay: Housing Guide</button>' +
                '<button class="menu-btn" id="btnReplayWorldMapTutorial">\ud83d\uddfa Replay: World Map Guide</button>' +
                '<button class="menu-btn" id="btnReplayBattleTutorial">\u2694 Replay: Battle Guide</button>' +
                specialSection +
            '</div>';

        this._openModal('\u2630 Menu', content);

        var self = this;
        setTimeout(function() {
            // Auto-skills toggle
            var btnAutoSkills = self.elements.modalBody.querySelector('#btnToggleAutoSkills');
            if (btnAutoSkills) {
                btnAutoSkills.addEventListener('click', function(e) {
                    if (self.player && self.skillBarUI) {
                        self._toggleGlobalAutoSkills();
                        var nowEnabled = (self.player.activeSkills || []).some(function(s) { return s && s.autoCast; });
                        e.target.textContent = nowEnabled ? 'ON' : 'OFF';
                        e.target.classList.toggle('active', nowEnabled);
                    }
                });
            }

            // Auto-loot toggle
            var btnAutoLoot = self.elements.modalBody.querySelector('#btnToggleAutoLoot');
            if (btnAutoLoot) {
                btnAutoLoot.addEventListener('click', function(e) {
                    if (self.player) {
                        self.player.autoLootEnabled = !self.player.autoLootEnabled;
                        e.target.textContent = self.player.autoLootEnabled ? 'ON' : 'OFF';
                        e.target.classList.toggle('active', self.player.autoLootEnabled);
                        self._addEventEntry(
                            'Auto-loot ' + (self.player.autoLootEnabled ? 'enabled' : 'disabled') + '.',
                            'system'
                        );
                    }
                });
            }

            // Forge
            var btnForge = self.elements.modalBody.querySelector('#btnOpenForge');
            if (btnForge) btnForge.addEventListener('click', function() { self._closeModal(); self._openForgeModal(); });

            // Exit map
            var btnExit = self.elements.modalBody.querySelector('#btnExitMap');
            if (btnExit) btnExit.addEventListener('click', function() {
                self._closeModal();
                eventBus.emit(GameEvents.MAP_EXIT, { character: self.player, mapInstance: self.mapInstance });
            });

            // Save
            var btnSave = self.elements.modalBody.querySelector('#btnSaveGame');
            if (btnSave) btnSave.addEventListener('click', function() {
                eventBus.emit(GameEvents.SAVE_GAME);
                self._closeModal();
                self._addEventEntry('Game saved.', 'system');
            });

            // Help / Release Notes
            var btnHelp = self.elements.modalBody.querySelector('#btnHelpFaq');
            if (btnHelp) btnHelp.addEventListener('click', function() { self._showDocModal('\ud83d\udcd6 Help & FAQ', './data/HELP_FAQ.md'); });
            var btnNotes = self.elements.modalBody.querySelector('#btnReleaseNotes');
            if (btnNotes) btnNotes.addEventListener('click', function() { self._showDocModal('\ud83d\udccb Release Notes', './data/RELEASE_NOTES.md'); });

            // Tutorials
            var btnTownTut = self.elements.modalBody.querySelector('#btnReplayTownTutorial');
            if (btnTownTut) btnTownTut.addEventListener('click', function() {
                self._closeModal();
                if (window.game && window.game._tutorialManager) window.game._tutorialManager.queueReplay('townScreen');
                eventBus.emit(GameEvents.MAP_EXIT, { character: self.player, mapInstance: self.mapInstance });
            });
            var btnHousingTut = self.elements.modalBody.querySelector('#btnReplayHousingTutorial');
            if (btnHousingTut) btnHousingTut.addEventListener('click', function() {
                self._closeModal();
                if (window.game && window.game._tutorialManager) window.game._tutorialManager.queueReplay('housingScreen');
                eventBus.emit(GameEvents.MAP_EXIT, { character: self.player, mapInstance: self.mapInstance });
            });
            var btnWorldTut = self.elements.modalBody.querySelector('#btnReplayWorldMapTutorial');
            if (btnWorldTut) btnWorldTut.addEventListener('click', function() {
                self._closeModal();
                if (window.game && window.game._tutorialManager) window.game._tutorialManager.queueReplay('worldMap');
                eventBus.emit(GameEvents.MAP_EXIT, { character: self.player, mapInstance: self.mapInstance });
            });
            var btnBattleTut = self.elements.modalBody.querySelector('#btnReplayBattleTutorial');
            if (btnBattleTut) btnBattleTut.addEventListener('click', function() {
                self._closeModal();
                if (window.game && window.game._tutorialManager) window.game._tutorialManager.replayTutorial('battleMap');
            });

            // Testing Ground (only shown when not already on test map)
            var btnTesting = self.elements.modalBody.querySelector('#btnTestingGround');
            if (btnTesting) btnTesting.addEventListener('click', function() {
                self._closeModal();
                eventBus.emit(GameEvents.MAP_EXIT, { character: self.player, mapInstance: self.mapInstance });
                setTimeout(function() {
                    if (window.game && window.game._handleTownNavigation) {
                        window.game._handleTownNavigation('testing_ground');
                    }
                }, 150);
            });
        }, 0);
    }

    /**
     * Show a Markdown content file inside the modal (v0.41.0)
     * Used for Help & FAQ and Release Notes.
     * @param {string} title - Modal header text
     * @param {string} path  - Path to .md file relative to game root
     */
    _showDocModal(title, path) {
        this._openModal(title, '<div class="doc-viewer"><div class="doc-loading">⏳ Loading...</div></div>');
        const body = this.elements.modalBody?.querySelector('.doc-viewer');
        if (!body) return;
        fetchDoc(path)
            .then(text => { body.innerHTML = renderMarkdown(text); })
            .catch(err  => { body.innerHTML = `<p class="doc-error">⚠️ Could not load content.<br><small>${err.message}</small></p>`; });
    }
    
    // ============================================
    // FORGE SYSTEM (v0.31.0)
    // ============================================
    
    /**
     * Open forge modal with item pre-selected
     * @param {string} itemId - ID of item to upgrade
     */
    _openForgeWithItem(itemId) {
        const item = this.player.inventory?.find(i => i.id === itemId) ||
                     Object.values(this.player.equipment || {}).find(i => i?.id === itemId);
        
        if (!item) {
            console.warn('[BattleMapUI] Cannot open forge - item not found:', itemId);
            return;
        }
        
        // Close current modal
        this._closeModal();
        
        // Initialize ForgeUI if needed
        if (!this._forgeUI) {
            this._forgeUI = new ForgeUI(this.elements.modalBody, this.player, {
                onRefresh: () => this._refreshForgeModal(),
                onSave: () => eventBus.emit(GameEvents.SAVE_GAME),
                onResult: (result) => this._showForgeResult(result),
                onTextOutput: (message) => this._addEventEntry(message, 'forge')
            });
        } else {
            this._forgeUI.updateCharacter(this.player);
        }
        
        // Set the item in forge slot
        this._forgeUI.setBaseItem(item);
        
        // Open the forge modal
        this._openForgeModal();
    }
    
    /**
     * Open the forge modal
     */
    _openForgeModal() {
        if (!this._forgeUI) {
            this._forgeUI = new ForgeUI(this.elements.modalBody, this.player, {
                onRefresh: () => this._refreshForgeModal(),
                onSave: () => eventBus.emit(GameEvents.SAVE_GAME),
                onResult: (result) => this._showForgeResult(result),
                onTextOutput: (message) => this._addEventEntry(message, 'forge')
            });
        } else {
            this._forgeUI.updateCharacter(this.player);
        }
        
        const content = this._forgeUI.buildContent('🔥 The Forge');
        this._openModal('🔥 Forge', content);
        setTimeout(() => this._forgeUI.setupHandlers(), 0);
    }
    
    /**
     * Refresh the forge modal content
     */
    _refreshForgeModal() {
        if (this._forgeUI) {
            const content = this._forgeUI.buildContent('🔥 The Forge');
            this.elements.modalBody.innerHTML = content;
            setTimeout(() => this._forgeUI.setupHandlers(), 0);
        }
    }
    
    /**
     * Show forge result in modal
     * @param {Object} result - Forge result with outcome and message
     */
    _showForgeResult(result) {
        if (this._forgeUI) {
            this._addEventEntry(result.message, result.outcome === 'success' ? 'success' : 'system');
            const content = this._forgeUI.buildResultContent(result);
            this.elements.modalBody.innerHTML = content;
            this._forgeUI.setupResultHandler(() => this._refreshForgeModal());
        }
    }
    
    /**
     * Open modal with content
     */
    _openModal(title, content) {
        if (this.elements.modal && this.elements.modalTitle && this.elements.modalBody) {
            this.elements.modalTitle.textContent = title;
            this.elements.modalBody.innerHTML = content;
            this.elements.modal.style.display = 'flex';
        }
    }
    
    /**
     * Close modal
     */
    _closeModal() {
        if (this.elements.modal) {
            this.elements.modal.style.display = 'none';
        }
        
        // Restore modal header visibility (may have been hidden for SkillTreeUI)
        if (this.elements.modalHeader) {
            this.elements.modalHeader.style.display = '';
        }
        
        // Cleanup skill tree UI
        if (this.skillTreeUI) {
            this.skillTreeUI.destroy();
            this.skillTreeUI = null;
        }
        
        // Cleanup world map UI
        if (this.worldMapUI) {
            this.worldMapUI.destroy();
            this.worldMapUI = null;
        }
        
        // Cleanup inventory UI
        if (this._inventoryUI) {
            this._inventoryUI.destroy();
            this._inventoryUI = null;
        }
        
        // Cleanup stats UI
        if (this._statsUI) {
            this._statsUI.destroy();
            this._statsUI = null;
        }
    }
    
    /**
     * Refresh the entire UI
     */
    refresh() {
        if (this.mapInstance) {
            this.hexGrid.renderGrid(this.mapInstance);
            this._updatePlayerStatus();
            this._updateEntityList();
            this._updatePotionDisplay();
            this._navBar?.update(this.player);
            if (this.skillBarUI) {
                this.skillBarUI.refresh();
            }
        }
    }
    
    /**
     * Clean up
     */
    destroy() {
        // Stop mock chat rotation
        this._stopMockChatRotation();
        
        if (this._potionUpdateInterval) {
            clearInterval(this._potionUpdateInterval);
            this._potionUpdateInterval = null;
        }
        if (this.skillBarUI) {
            this.skillBarUI.destroy();
            this.skillBarUI = null;
        }
        // Destroy test skill bar if present (v0.45.0)
        if (this._testSkillBar) {
            this._testSkillBar.destroy();
            this._testSkillBar = null;
        }
        if (this.skillTreeUI) {
            this.skillTreeUI.destroy();
            this.skillTreeUI = null;
        }
        if (this.worldMapUI) {
            this.worldMapUI.destroy();
            this.worldMapUI = null;
        }
        if (this._inventoryUI) {
            this._inventoryUI.destroy();
            this._inventoryUI = null;
        }
        if (this._statsUI) {
            this._statsUI.destroy();
            this._statsUI = null;
        }
        // v0.31.0: Clean up ForgeUI
        if (this._forgeUI) {
            this._forgeUI.destroy();
            this._forgeUI = null;
        }
        if (this.animationManager) {
            this.animationManager.destroy();
            this.animationManager = null;
        }
        if (this.mapInstance) {
            this.mapInstance.stopAmbientEvents();
        }
        this.hexGrid.destroy();
    }
}

export default BattleMapUI;
