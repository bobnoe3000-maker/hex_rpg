/**
 * @file main.js
 * @description Game initialization and entry point. Central controller that manages game state,
 *              screen transitions, and coordinates all major systems. Creates and destroys
 *              UI screens, handles login/logout flow, and manages the active player character.
 *              Handles map position tracking for world map "return to position" feature.
 *              Integrates offline progress system for idle gameplay rewards.
 * 
 * @usage Entry point loaded by index.html. Creates global `window.game` instance.
 *        Exposes debug utilities: game.saveGame(), game.getDebugInfo(), game.returnToTown()
 * @dependencies 
 *   - GameConfig (config/gameConfig.js)
 *   - Character (models/Character.js)
 *   - MapInstance (systems/MapInstance.js)
 *   - EventBus, GameEvents (systems/EventBus.js)
 *   - AccountManager (systems/AccountManager.js)
 *   - CharacterManager (systems/CharacterManager.js)
 *   - All UI screens (ui/*.js)
 *   - GameLoop (engine/GameLoop.js)
 * 
 * @version 0.8.5
 * @changelog
 *   - v0.8.5 (2026-03-09): Added 'testing_ground' navigation case in _handleTownNavigation()
 *                          routing to test_arena via _showBattleMap(). Enables Testing Ground
 *                          access from TownScreen and BattleMapUI menus.
 *   - v0.8.4 (2026-03-06): Added guest session support. Listen for GUEST_REGISTER_OPEN event,
 *                          show _showGuestRegisterModal() overlay. _handleLogout() skips save
 *                          for guests (nothing to persist). _showLoginScreen() logs guest vs
 *                          permanent account type on success.
 *   - v0.8.3 (2026-03-05): Simplified _showHousingScreen() - removed modal callbacks now
 *                          handled internally by HousingScreen. Added onLogout callback.
 *                          Added charselect case to _handleHousingNavigation().
 *   - v0.8.2 (2026-03-05): Updated _showHousingScreen() to pass full main-nav callbacks
 *                          (onShowStats, onShowItems, onShowSkills, onShowMap, onShowMenu).
 *                          Each navigates to TownScreen then opens the matching modal,
 *                          giving HousingScreen the same nav behaviour as TownScreen.
 *   - v0.8.1 (2026-02-09): Fixed world map travel always routing through town. MAP_EXIT handler
 *                          now checks data.destinationMapId and calls changeMap() directly for
 *                          battle-map-to-battle-map travel. Added _transitioning guard to prevent
 *                          re-entrant MAP_EXIT from removePlayer() causing null reference crash.
 *   - v0.8.0 (2026-01-26): Added HOUSING game state and HousingScreen integration.
 *                          Added _showHousingScreen() method.
 *                          Updated _handleTownNavigation() to handle 'housing' destination.
 *   - v0.7.0 (2025-01-25): Added offline progress integration.
 *                          Added beforeunload and visibilitychange save handlers.
 *                          _loadCharacter() now checks for offline progress.
 *                          _showTownScreen() displays offline progress modal.
 *   - v0.6.0 (2025-01-19): Added auto-save on loot pickup, stat changes, skill learn/equip
 *                          with debouncing to prevent excessive writes
 *   - v0.5.0 (2025-01-17): Added position tracking on map transitions, support for spawn position
 *   - v0.4.4 (2025-01-02): Enhanced death handling to pass death info to temple resurrection
 *   - v0.4.3 (2025-01-02): Added level up modal with stat allocation on CHARACTER_LEVEL_UP
 *   - v0.4.2 (2025-01-01): Added MAP_EXIT event handler, world map selection with mapId support
 *   - v0.4.1 (2025-01): Added account system, character slots, town screen, intro screen
 *   - v0.4.0 (2025-01): Initial modular structure with screen management
 */

import { GameConfig } from './config/gameConfig.js';
import { Character } from './models/Character.js';
import { MapInstance } from './systems/MapInstance.js';
import { eventBus, GameEvents } from './systems/EventBus.js';
import { accountManager } from './systems/AccountManager.js';
import { characterManager } from './systems/CharacterManager.js';
import { BattleMapUI } from './ui/BattleMapUI.js';
import { LoginScreen } from './ui/LoginScreen.js';
import { CharacterSelectScreen } from './ui/CharacterSelectScreen.js';
import { CharacterCreateScreen } from './ui/CharacterCreateScreen.js';
import { IntroScreen } from './ui/IntroScreen.js';
import { TownScreen } from './ui/TownScreen.js';
import { HousingScreen } from './ui/HousingScreen.js';  // NEW v0.8.0
import { TutorialManager } from './ui/TutorialManager.js';  // NEW tutorial system
import { gameLoop } from './engine/GameLoop.js';
import { statPointsForLevel } from './config/gameConfig.js';

// Game states
const GameState = {
    LOADING: 'loading',
    LOGIN: 'login',
    CHARACTER_SELECT: 'character_select',
    CHARACTER_CREATE: 'character_create',
    INTRO: 'intro',
    TOWN: 'town',
    HOUSING: 'housing',  // NEW v0.8.0
    BATTLE: 'battle'
};

class HexInfinityGame {
    constructor() {
        this.player = null;
        this.currentMapInstance = null;
        this.currentScreen = null;
        this.container = null;
        
        // Current state
        this.state = GameState.LOADING;
        this.isNewCharacter = false;
        
        // UI references
        this.battleMapUI = null;
        
        // Debounced save timer (v0.6.0)
        this._saveDebounceTimer = null;
        this._saveDebounceDelay = 1000; // 1 second debounce
        this._transitioning = false; // Guard against re-entrant MAP_EXIT from removePlayer()
        
        // Pending data for screen transitions
        this._pendingDeathInfo = null;
        this._pendingOfflineProgress = null;  // NEW v0.7.0
    }
    
    /**
     * Initialize the game
     */
    async init() {
        console.log(`${GameConfig.gameName} v${GameConfig.version} initializing...`);
        
        // Get container
        this.container = document.getElementById('game-container');
        if (!this.container) {
            console.error('Game container not found!');
            return;
        }
        
        // Setup global event handlers
        this._setupEventHandlers();
        
        // Setup page lifecycle handlers (NEW v0.7.0)
        this._setupLifecycleHandlers();
        
        // Start at login screen
        this._showLoginScreen();
        
        console.log('Game initialized successfully!');
    }
    
    /**
     * Setup global event handlers
     */
    _setupEventHandlers() {
        // Handle player death
        eventBus.on(GameEvents.CHARACTER_DEATH, (data) => {
            if (this.player && data.character.id === this.player.id) {
                this._handlePlayerDeath(data.deathInfo);
            }
        });
        
        // Handle level up - show notification (stat allocation done in Character screen)
        eventBus.on(GameEvents.CHARACTER_LEVEL_UP, (data) => {
            if (this.player && data.character.id === this.player.id) {
                this._handleLevelUp(data);
            }
        });
        
        // Handle map exit (return to town)
        eventBus.on(GameEvents.MAP_EXIT, (data) => {
            console.log('MAP_EXIT event received', data);
            // Guard: removePlayer() emits MAP_EXIT — ignore during transitions
            if (this._transitioning) return;
            if (data.destinationMapId && data.destinationMapId !== 'town') {
                // Direct travel to another battle map (from world map)
                this.changeMap(data.destinationMapId, data.returnToPosition || null);
            } else {
                // No destination or town — return to town screen
                this.returnToTown();
            }
        });
        
        // Save game event (explicit save request)
        eventBus.on(GameEvents.SAVE_GAME, () => {
            this.saveGame();
        });
        
        // ==========================================
        // AUTO-SAVE TRIGGERS (v0.6.0)
        // ==========================================
        
        // Save after loot pickup (items or gold)
        eventBus.on(GameEvents.LOOT_PICKUP, (data) => {
            if (this.player && data.character?.id === this.player.id) {
                this._debouncedSave('loot pickup');
            }
        });
        
        // Save after inventory changes (item added)
        eventBus.on(GameEvents.INVENTORY_ADD, (data) => {
            if (this.player && data.character?.id === this.player.id) {
                this._debouncedSave('inventory add');
            }
        });
        
        // Save after stat changes (stat point allocation)
        eventBus.on(GameEvents.CHARACTER_STAT_CHANGE, (data) => {
            if (this.player && data.character?.id === this.player.id) {
                this._debouncedSave('stat change');
            }
        });
        
        // Save after skill learned or upgraded
        eventBus.on(GameEvents.SKILL_LEARNED, (data) => {
            if (this.player && data.character?.id === this.player.id) {
                this._debouncedSave('skill learned');
            }
        });
        
        // Save after skill equipped to skill bar
        eventBus.on(GameEvents.SKILL_EQUIPPED, (data) => {
            if (this.player && data.character?.id === this.player.id) {
                this._debouncedSave('skill equipped');
            }
        });
        
        // Save after skill unequipped from skill bar
        eventBus.on(GameEvents.SKILL_UNEQUIPPED, (data) => {
            if (this.player && data.character?.id === this.player.id) {
                this._debouncedSave('skill unequipped');
            }
        });
        
        // Save after equipment changes
        eventBus.on(GameEvents.CHARACTER_EQUIP, (data) => {
            if (this.player && data.character?.id === this.player.id) {
                this._debouncedSave('equip item');
            }
        });
        
        eventBus.on(GameEvents.CHARACTER_UNEQUIP, (data) => {
            if (this.player && data.character?.id === this.player.id) {
                this._debouncedSave('unequip item');
            }
        });
        
        // Guest registration modal (v0.8.4)
        // Emitted by MainNavBar's "💾 Register" button when isGuest is true
        eventBus.on('GUEST_REGISTER_OPEN', () => {
            this._showGuestRegisterModal();
        });

        // Debug mode
        if (window.location.hash === '#debug') {
            eventBus.on('*', (data) => {
                console.log(`[Event] ${data.event}:`, data.data);
            });
        }
    }
    
    /**
     * Setup page lifecycle handlers for saving on close/hide (NEW v0.7.0)
     * Ensures offline progress tracking works correctly
     */
    _setupLifecycleHandlers() {
        // Save when page is about to unload (close tab, navigate away)
        window.addEventListener('beforeunload', () => {
            if (this.player) {
                // Immediate save, no debounce
                this.saveGame();
            }
        });
        
        // Save when page visibility changes (tab switch, minimize, mobile background)
        // Also check for offline progress when returning to the tab
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                // Page is hidden - save immediately
                if (this.player) {
                    this.saveGame();
                }
            } else if (document.visibilityState === 'visible') {
                // Page is visible again - check for offline progress
                // Only check if we're in town or housing (not during battle)
                if (this.player && (this.state === GameState.TOWN || this.state === GameState.HOUSING)) {
                    const progress = characterManager.checkOfflineProgress(this.player);
                    if (progress && progress.type !== 'none' && this.currentScreen?.showOfflineProgress) {
                        this.currentScreen.showOfflineProgress(progress);
                    }
                }
            }
        });
    }
    
    /**
     * Debounced save to prevent excessive writes (v0.6.0)
     * @param {string} reason - Reason for save (for logging)
     */
    _debouncedSave(reason = 'auto') {
        // Clear existing timer
        if (this._saveDebounceTimer) {
            clearTimeout(this._saveDebounceTimer);
        }
        
        // Set new timer
        this._saveDebounceTimer = setTimeout(() => {
            this._saveDebounceTimer = null;
            if (this.player) {
                console.log(`Auto-save triggered: ${reason}`);
                this.saveGame();
            }
        }, this._saveDebounceDelay);
    }
    
    /**
     * Clear current screen
     */
    _clearScreen() {
        if (this.currentScreen && this.currentScreen.destroy) {
            this.currentScreen.destroy();
        }
        this.currentScreen = null;
        
        // Stop game loop if running
        if (gameLoop.isRunning) {
            gameLoop.stop();
        }
        
        // Clear container classes
        this.container.className = '';
    }
    
    // ==========================================
    // SCREEN TRANSITIONS
    // ==========================================
    
    /**
     * Show login screen
     */
    _showLoginScreen() {
        this._clearScreen();
        this.state = GameState.LOGIN;
        
        this.currentScreen = new LoginScreen(this.container, (account) => {
            const accountType = account.isGuest ? 'guest' : 'permanent';
            console.log(`Login successful: ${account.email} (${accountType})`);
            this._showCharacterSelectScreen();
        });
    }
    
    /**
     * Show character selection screen
     */
    _showCharacterSelectScreen() {
        this._clearScreen();
        this.state = GameState.CHARACTER_SELECT;
        
        this.currentScreen = new CharacterSelectScreen(this.container, {
            onCreateNew: () => {
                this._showCharacterCreateScreen();
            },
            onSelectCharacter: (charId) => {
                this._loadCharacter(charId);
            },
            onLogout: () => {
                accountManager.logout();
                this._showLoginScreen();
            }
        });
    }
    
    /**
     * Show character creation screen
     */
    _showCharacterCreateScreen() {
        this._clearScreen();
        this.state = GameState.CHARACTER_CREATE;
        
        this.currentScreen = new CharacterCreateScreen(this.container, {
            onComplete: (character) => {
                this.player = character;
                this.isNewCharacter = true;

                // Initialise tutorial system for the new character
                if (this._tutorialManager) this._tutorialManager.destroy();
                this._tutorialManager = new TutorialManager();
                this._tutorialManager.init(this.player.id);

                this._showIntroScreen();
            },
            onCancel: () => {
                this._showCharacterSelectScreen();
            }
        });
    }
    
    /**
     * Show intro screen
     */
    _showIntroScreen() {
        this._clearScreen();
        this.state = GameState.INTRO;
        
        this.currentScreen = new IntroScreen(this.container, this.player, {
            onContinue: () => {
                this.isNewCharacter = false;
                this._showTownScreen();
            }
        });
    }
    
    /**
     * Show town screen
     * @param {boolean} showResurrection - If true, show resurrection modal on load
     */
    _showTownScreen(showResurrection = false) {
        this._clearScreen();
        this.state = GameState.TOWN;
        
        // Ensure player is in town
        if (this.player) {
            this.player.currentMapId = 'town';
        }
        
        this.currentScreen = new TownScreen(this.container, this.player, {
            onNavigate: (destination, positionData) => {
                this._handleTownNavigation(destination, positionData);
            },
            onLogout: () => {
                this._handleLogout();
            }
        });
        
        // Show resurrection modal if player just died
        if (showResurrection && this._pendingDeathInfo) {
            this.currentScreen.showResurrection(this._pendingDeathInfo);
            this._pendingDeathInfo = null;
        }
        
        // Show offline progress modal if applicable (NEW v0.7.0)
        if (this._pendingOfflineProgress) {
            // Delay slightly so town screen is fully rendered
            setTimeout(() => {
                if (this.currentScreen && this.currentScreen.showOfflineProgress) {
                    this.currentScreen.showOfflineProgress(this._pendingOfflineProgress);
                }
                this._pendingOfflineProgress = null;
            }, 500);
        }
    }
    
    /**
     * Show housing screen (NEW v0.8.0)
     * Full-screen player housing experience
     */
    _showHousingScreen() {
        this._clearScreen();
        this.state = GameState.HOUSING;
        
        // Ensure player is in town/housing
        if (this.player) {
            this.player.currentMapId = 'housing';
        }
        
        this.currentScreen = new HousingScreen(this.container, this.player, {
            onNavigate: (destination, positionData) => {
                this._handleHousingNavigation(destination, positionData);
            },
            onLogout: () => {
                this._handleLogout();
            }
        });
    }
    
    /**
     * Handle navigation from housing screen (NEW v0.8.0)
     * @param {string} destination - Navigation destination
     * @param {Object} positionData - Optional position data
     */
    _handleHousingNavigation(destination, positionData = null) {
        switch (destination) {
            case 'town':
                this._showTownScreen();
                break;
            case 'worldmap':
                this._showBattleMap('forest_edge');
                break;
            case 'charselect':
                this.saveGame();
                characterManager.clearActiveCharacter();
                this.player = null;
                this._showCharacterSelectScreen();
                break;
            default:
                if (destination.startsWith('worldmap:')) {
                    const mapId = destination.split(':')[1];
                    this._showBattleMap(mapId, positionData);
                } else {
                    console.log('Housing navigation to:', destination);
                }
        }
    }
    
    /**
     * Show battle map
     * @param {string} mapId - Map to load
     * @param {Object} spawnPosition - Optional spawn position {q, r} (v0.5.0)
     */
    _showBattleMap(mapId = 'forest_edge', spawnPosition = null) {
        this._clearScreen();
        this.state = GameState.BATTLE;
        
        // Create battle map UI
        this.battleMapUI = new BattleMapUI(this.container);
        
        // Create map instance
        this.currentMapInstance = new MapInstance(mapId);
        this.currentMapInstance.spawnInitialNPCs();
        
        // Update player position and map
        this.player.currentMapId = mapId;
        
        // Set player position (v0.5.0)
        if (spawnPosition && spawnPosition.q !== undefined && spawnPosition.r !== undefined) {
            // Use provided spawn position (from "return to position" feature)
            this.player.position = { q: spawnPosition.q, r: spawnPosition.r };
        } else if (mapId !== 'town') {
            // Default spawn position based on map
            const mapData = this.currentMapInstance.mapData;
            if (mapData.playerStart) {
                this.player.position = { ...mapData.playerStart };
            } else {
                // Fallback - find first exit and start near it
                this.player.position = { q: 1, r: 1 };
            }
        }
        
        // Add player to map
        this.currentMapInstance.addPlayer(this.player);
        
        // Load map into UI
        this.battleMapUI.loadMap(this.currentMapInstance, this.player);
        
        // Start game loop
        gameLoop.start(this.currentMapInstance, this.player);
        
        // Welcome message
        eventBus.emit(GameEvents.UI_ACTION_LOG, {
            type: 'system',
            message: `Entered ${this.currentMapInstance.mapData.name}. Click to move, attack enemies!`
        });
    }
    
    /**
     * Handle town navigation
     * @param {string} destination - Navigation destination
     * @param {Object} positionData - Optional position to spawn at (v0.5.0)
     */
    _handleTownNavigation(destination, positionData = null) {
        // Check for worldmap with mapId (format: 'worldmap:mapId')
        if (destination.startsWith('worldmap:')) {
            const mapId = destination.split(':')[1];
            
            // Save current position before leaving (if on a battle map) (v0.5.0)
            if (this.player && this.currentMapInstance && this.currentMapInstance.mapId !== 'town') {
                this.player.saveMapPosition(
                    this.currentMapInstance.mapId,
                    this.player.position.q,
                    this.player.position.r
                );
            }
            
            // Show battle map, optionally at saved position
            this._showBattleMap(mapId, positionData);
            return;
        }
        
        switch (destination) {
            case 'worldmap':
                // Default to forest_edge if no mapId specified
                this._showBattleMap('forest_edge');
                break;
                
            case 'housing':  // NEW v0.8.0
                this._showHousingScreen();
                break;
            
            case 'testing_ground':  // NEW v0.8.4 — special sandbox map
                this._showBattleMap('test_arena');
                break;
                
            case 'charselect':
                // Save current character first
                this.saveGame();
                characterManager.clearActiveCharacter();
                this.player = null;
                this._showCharacterSelectScreen();
                break;
                
            default:
                console.log('Navigation to:', destination);
        }
    }
    
    /**
     * Handle logout
     * Guests skip the save step — their character data is sessionStorage-backed
     * and would be orphaned anyway once the session ends.
     */
    _handleLogout() {
        // Save character only for permanent accounts
        if (this.player && !accountManager.isGuest) {
            this.saveGame();
        }

        // Tear down tutorial system before clearing player
        if (this._tutorialManager) {
            this._tutorialManager.destroy();
            this._tutorialManager = null;
        }
        
        // Clear active character
        characterManager.clearActiveCharacter();
        this.player = null;
        
        // Logout account (clears guest sessionStorage or permanent localStorage session)
        accountManager.logout();
        
        // Go to login
        this._showLoginScreen();
    }
    
    /**
     * Load a character by ID
     * Now includes offline progress check (NEW v0.7.0)
     */
    _loadCharacter(charId) {
        const character = characterManager.loadCharacter(charId);
        
        if (!character) {
            alert('Failed to load character');
            return;
        }
        
        this.player = character;
        this.isNewCharacter = false;

        // Initialise tutorial system for this character (NEW)
        if (this._tutorialManager) this._tutorialManager.destroy();
        this._tutorialManager = new TutorialManager();
        this._tutorialManager.init(this.player.id);
        
        // Check for offline progress (NEW v0.7.0)
        // This calculates and applies progress, then returns results for display
        this._pendingOfflineProgress = characterManager.checkOfflineProgress(this.player);
        
        // Go to town
        this._showTownScreen();
    }
    
    // ==========================================
    // GAME LOGIC
    // ==========================================
    
    /**
     * Handle player death
     * @param {Object} deathInfo - Information about the death (killer, dropped items)
     */
    _handlePlayerDeath(deathInfo = null) {
        console.log('Player died!', deathInfo);
        
        // Log dropped items
        if (deathInfo?.droppedItems?.length > 0) {
            const itemNames = deathInfo.droppedItems.map(i => i.name || i.displayName || 'Unknown Item').join(', ');
            eventBus.emit(GameEvents.UI_ACTION_LOG, {
                type: 'death',
                message: `💀 You have fallen! Lost items: ${itemNames}`
            });
        } else {
            eventBus.emit(GameEvents.UI_ACTION_LOG, {
                type: 'death',
                message: '💀 You have fallen in battle!'
            });
        }
        
        eventBus.emit(GameEvents.UI_ACTION_LOG, {
            type: 'system',
            message: 'The temple priests are summoning your spirit...'
        });
        
        // Stop game loop
        gameLoop.stop();
        
        // Store death info for temple resurrection screen
        this._pendingDeathInfo = deathInfo;
        
        // Respawn after short delay
        setTimeout(() => {
            this.player.respawn();
            
            // Save the respawned state
            this.saveGame();
            
            // Show town with resurrection modal
            this._showTownScreen(true);
            
        }, 2000);
    }
    
    /**
     * Handle player level up - show notification (stat allocation done in Character screen)
     */
    _handleLevelUp(data) {
        const pointsEarned = statPointsForLevel(data.newLevel);
        console.log(`Player leveled up to ${data.newLevel}! Earned ${pointsEarned} stat points.`);
        
        // Show level up notification in action log
        eventBus.emit(GameEvents.UI_ACTION_LOG, {
            type: 'levelup',
            message: `🎉 LEVEL UP! You reached Level ${data.newLevel}! +${pointsEarned} stat points earned.`
        });
        
        // Show a second message about where to allocate
        setTimeout(() => {
            eventBus.emit(GameEvents.UI_ACTION_LOG, {
                type: 'system',
                message: `You now have ${this.player.unspentStatPoints} unspent stat points. Visit Character screen to allocate.`
            });
        }, 500);
        
        // Auto-save after level up (immediate, not debounced)
        this.saveGame();
    }
    
    /**
     * Return to town from battle map
     */
    returnToTown() {
        if (this.state === GameState.BATTLE) {
            this._transitioning = true;
            
            // Save current position before leaving (v0.5.0)
            if (this.player && this.currentMapInstance && this.currentMapInstance.mapId !== 'town') {
                this.player.saveMapPosition(
                    this.currentMapInstance.mapId,
                    this.player.position.q,
                    this.player.position.r
                );
            }
            
            // Stop game loop
            gameLoop.stop();
            
            // Clean up map
            if (this.currentMapInstance) {
                this.currentMapInstance.removePlayer(this.player.id);
                this.currentMapInstance.destroy();
                this.currentMapInstance = null;
            }
            
            // Clean up battle UI
            if (this.battleMapUI) {
                this.battleMapUI.destroy();
                this.battleMapUI = null;
            }
            
            // Save progress (this will persist the lastMapPositions)
            this.saveGame();
            
            // Show town
            this._showTownScreen();
            
            this._transitioning = false;
        }
    }
    
    /**
     * Change to a different battle map
     * @param {string} mapId - Target map ID
     * @param {Object} entryPosition - Optional entry position
     */
    changeMap(mapId, entryPosition = null) {
        if (this.state !== GameState.BATTLE) {
            this._showBattleMap(mapId);
            return;
        }
        
        this._transitioning = true;
        
        // Save current position before leaving (v0.5.0)
        if (this.player && this.currentMapInstance && this.currentMapInstance.mapId !== 'town') {
            this.player.saveMapPosition(
                this.currentMapInstance.mapId,
                this.player.position.q,
                this.player.position.r
            );
        }
        
        // Stop current game loop
        gameLoop.stop();
        
        // Remove player from current map
        if (this.currentMapInstance) {
            this.currentMapInstance.removePlayer(this.player.id);
            this.currentMapInstance.destroy();
        }
        
        // Create new map instance
        this.currentMapInstance = new MapInstance(mapId);
        this.currentMapInstance.spawnInitialNPCs();
        
        // Set player position if specified
        if (entryPosition) {
            this.player.position = { ...entryPosition };
        }
        
        // Add player to new map
        this.currentMapInstance.addPlayer(this.player);
        this.player.currentMapId = mapId;
        
        // Update UI
        this.battleMapUI.loadMap(this.currentMapInstance, this.player);
        
        // Restart game loop
        gameLoop.start(this.currentMapInstance, this.player);
        
        this._transitioning = false;
    }
    
    /**
     * Save game state
     */
    saveGame() {
        if (!this.player) return false;
        
        // Save through character manager
        const success = characterManager.saveCharacter();
        
        if (success) {
            console.log('Game saved');
            eventBus.emit(GameEvents.SAVE_SUCCESS, {});
        } else {
            console.error('Failed to save game');
        }
        
        return success;
    }
    
    /**
     * Show a modal overlay for guest-to-permanent account conversion (v0.8.4)
     * Triggered by the "💾 Register" nav button via GUEST_REGISTER_OPEN event.
     * On success the session is silently upgraded — no screen change required.
     */
    _showGuestRegisterModal() {
        // Don't stack modals
        if (this.container.querySelector('#guestRegisterModal')) return;

        const modal = document.createElement('div');
        modal.id = 'guestRegisterModal';
        modal.className = 'guest-register-modal-overlay';
        modal.innerHTML = `
            <div class="guest-register-modal">
                <h2 class="guest-register-title">💾 Save Your Progress</h2>
                <p class="guest-register-desc">
                    Create a free account to keep your character and progress
                    across sessions. Your current character will be transferred.
                </p>
                <div class="guest-register-form">
                    <div class="form-group">
                        <label for="grEmail">Email</label>
                        <input type="email" id="grEmail" placeholder="Enter your email" autocomplete="email">
                    </div>
                    <div class="form-group">
                        <label for="grPassword">Password</label>
                        <input type="password" id="grPassword" placeholder="Min 6 characters" autocomplete="new-password">
                    </div>
                    <div class="form-group">
                        <label for="grConfirm">Confirm Password</label>
                        <input type="password" id="grConfirm" placeholder="Repeat password" autocomplete="new-password">
                    </div>
                    <div class="form-error" id="grError"></div>
                    <div class="guest-register-actions">
                        <button class="btn-submit" id="grSubmit">Create Account</button>
                        <button class="btn-secondary" id="grCancel">Continue as Guest</button>
                    </div>
                </div>
            </div>
        `;

        this.container.appendChild(modal);

        const showError = (msg) => {
            const el = modal.querySelector('#grError');
            el.textContent = msg;
            el.style.display = 'block';
        };

        const clearError = () => {
            const el = modal.querySelector('#grError');
            el.textContent = '';
            el.style.display = 'none';
        };

        modal.querySelector('#grSubmit').addEventListener('click', () => {
            clearError();
            const email    = modal.querySelector('#grEmail').value;
            const password = modal.querySelector('#grPassword').value;
            const confirm  = modal.querySelector('#grConfirm').value;

            if (password !== confirm) {
                showError('Passwords do not match');
                return;
            }

            const result = accountManager.convertGuestToAccount(email, password);
            if (result.success) {
                modal.remove();
                // Refresh nav bar badge (Register button should disappear)
                eventBus.emit('GUEST_REGISTERED', { account: result.account });
                console.log('Guest successfully registered:', email);
            } else {
                showError(result.message);
            }
        });

        modal.querySelector('#grCancel').addEventListener('click', () => {
            modal.remove();
        });

        // Focus first field
        modal.querySelector('#grEmail').focus();
    }

    /**
     * Get debug info
     */
    getDebugInfo() {
        return {
            state: this.state,
            account: accountManager.getCurrentAccount()?.email,
            character: this.player?.name,
            mapInfo: this.currentMapInstance?.getDebugInfo(),
            playerStats: this.player ? {
                level: this.player.level,
                health: `${this.player.currentHealth}/${this.player.maxHealth}`,
                mana: `${this.player.currentMana}/${this.player.maxMana}`,
                attack: this.player.attackPower,
                defense: this.player.defensePower,
                position: this.player.position,
                lastMapPositions: this.player.lastMapPositions,
                lastActiveTimestamp: this.player.lastActiveTimestamp  // NEW v0.7.0
            } : null
        };
    }
}

// Initialize game when DOM is ready
function initGame() {
    window.game = new HexInfinityGame();
    window.game.init();
    
    // Expose utilities for debugging
    window.eventBus = eventBus;
    window.GameEvents = GameEvents;
    window.accountManager = accountManager;
    window.characterManager = characterManager;
    
    // Debug commands
    console.log('Debug commands available:');
    console.log('  game.saveGame() - Save current game');
    console.log('  game.getDebugInfo() - Get debug information');
    console.log('  game.returnToTown() - Return to town');
    console.log('  game.changeMap("mapId") - Change battle map');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    initGame();
}

export default HexInfinityGame;
