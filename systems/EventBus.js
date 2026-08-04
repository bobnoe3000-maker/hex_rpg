/**
 * @file EventBus.js
 * @description Centralized event system for decoupled communication
 * 
 * @location systems/EventBus.js
 * @version 1.9.0
 * @changelog
 *   - v1.9.0 (2026-03-06): Added Tutorial system events (TOWN_SCREEN_READY, HOUSING_SCREEN_READY,
 *                          BATTLE_MAP_READY, WORLD_MAP_OPENED, TUTORIAL_STEP_CHANGED, TUTORIAL_COMPLETE)
 *   - v1.8.0 (2026-02-09): Added Proc system events (PROC_TRIGGERED, PROC_EFFECT_APPLIED,
 *                          PROC_COOLDOWN_START) for combat log and animation integration.
 *   - v1.7.0 (2026-01-27): Added Bank system events (BANK_GOLD_CHANGED, BANK_ITEM_DEPOSITED, 
 *                          BANK_ITEM_WITHDRAWN, BANK_VAULT_EXPANDED)
 *   - v1.6.0 (2026-01-26): Added Housing system events (MATERIAL_CHANGED, HOUSING_UPGRADED)
 *   - v1.5.0 (2025-01-21): Added Forge system events (FORGE_SUCCESS, FORGE_FAILURE, FORGE_DESTRUCTION, AETHER_CHANGED)
 *   - v1.4.0 (2025-01-17): Added MUD system events (MUD_TEXT_ADD, MUD_LOCATION_CHANGE, MUD_BADGE_UPDATE, etc.)
 *   - v1.3.0 (2025-01-10): Added skill system events (SKILL_LEARNED, SKILL_EQUIPPED, SKILL_USED, etc.)
 *   - v1.2.0 (2025-01-03): Added potion system events (POTION_EQUIPPED, POTION_UNEQUIPPED, POTION_USED, COMBAT_MANA_RESTORE)
 *   - v1.1.0 (2025-01): Added LOOT_SPAWNED event for dynamic loot rendering
 *   - v1.0.0 (2025-01): Initial implementation
 */

class EventBus {
    constructor() {
        this.listeners = new Map();
        this.eventHistory = [];
        this.maxHistory = 1000;
    }
    
    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {function} callback - Handler function
     * @param {object} context - Optional 'this' context for callback
     * @returns {function} Unsubscribe function
     */
    on(event, callback, context = null) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        
        const listener = { callback, context };
        this.listeners.get(event).push(listener);
        
        // Return unsubscribe function
        return () => this.off(event, callback);
    }
    
    /**
     * Subscribe to an event once (auto-unsubscribes after first trigger)
     * @param {string} event - Event name
     * @param {function} callback - Handler function
     * @param {object} context - Optional 'this' context for callback
     */
    once(event, callback, context = null) {
        const wrapper = (...args) => {
            this.off(event, wrapper);
            callback.apply(context, args);
        };
        this.on(event, wrapper, context);
    }
    
    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {function} callback - Handler function to remove
     */
    off(event, callback) {
        if (!this.listeners.has(event)) return;
        
        const listeners = this.listeners.get(event);
        const index = listeners.findIndex(l => l.callback === callback);
        if (index !== -1) {
            listeners.splice(index, 1);
        }
    }
    
    /**
     * Emit an event to all subscribers
     * @param {string} event - Event name
     * @param {any} data - Event data
     */
    emit(event, data = {}) {
        // Add timestamp
        const eventData = {
            event,
            data,
            timestamp: Date.now()
        };
        
        // Store in history
        this.eventHistory.push(eventData);
        if (this.eventHistory.length > this.maxHistory) {
            this.eventHistory.shift();
        }
        
        // Notify listeners
        if (this.listeners.has(event)) {
            const listeners = [...this.listeners.get(event)]; // Copy to avoid mutation issues
            for (const listener of listeners) {
                try {
                    if (listener.context) {
                        listener.callback.call(listener.context, data);
                    } else {
                        listener.callback(data);
                    }
                } catch (error) {
                    console.error(`Error in event handler for ${event}:`, error);
                }
            }
        }
        
        // Also emit wildcard event for debugging/logging
        if (event !== '*' && this.listeners.has('*')) {
            const wildcardListeners = this.listeners.get('*');
            for (const listener of wildcardListeners) {
                try {
                    listener.callback.call(listener.context, eventData);
                } catch (error) {
                    console.error(`Error in wildcard handler:`, error);
                }
            }
        }
    }
    
    /**
     * Clear all listeners for an event (or all events)
     * @param {string} event - Event name (optional, clears all if not provided)
     */
    clear(event = null) {
        if (event) {
            this.listeners.delete(event);
        } else {
            this.listeners.clear();
        }
    }
    
    /**
     * Get recent event history
     * @param {string} eventFilter - Optional event name to filter
     * @param {number} count - Number of events to return
     * @returns {array} Recent events
     */
    getHistory(eventFilter = null, count = 50) {
        let history = this.eventHistory;
        
        if (eventFilter) {
            history = history.filter(e => e.event === eventFilter);
        }
        
        return history.slice(-count);
    }
}

// Singleton instance
export const eventBus = new EventBus();

// Event type constants
export const GameEvents = {
    // Game State
    GAME_INIT: 'game:init',
    GAME_START: 'game:start',
    GAME_PAUSE: 'game:pause',
    GAME_RESUME: 'game:resume',
    GAME_TICK: 'game:tick',
    
    // Map Events
    MAP_LOAD: 'map:load',
    MAP_ENTER: 'map:enter',
    MAP_EXIT: 'map:exit',
    MAP_SPAWN_NPC: 'map:spawnNpc',
    MAP_DESPAWN_NPC: 'map:despawnNpc',
    
    // Movement Events
    ENTITY_MOVE_START: 'entity:moveStart',
    ENTITY_MOVE_STEP: 'entity:moveStep',
    ENTITY_MOVE_END: 'entity:moveEnd',
    ENTITY_POSITION_CHANGED: 'entity:positionChanged',
    
    // Combat Events
    COMBAT_START: 'combat:start',
    COMBAT_END: 'combat:end',
    COMBAT_ATTACK: 'combat:attack',
    COMBAT_HIT: 'combat:hit',
    COMBAT_MISS: 'combat:miss',
    COMBAT_CRITICAL: 'combat:critical',
    COMBAT_DAMAGE: 'combat:damage',
    COMBAT_HEAL: 'combat:heal',
    COMBAT_MANA_RESTORE: 'combat:manaRestore',
    COMBAT_DEATH: 'combat:death',
    COMBAT_SKILL_USE: 'combat:skillUse',
    
    // Skill Events
    SKILL_LEARNED: 'skill:learned',           // Skill point spent to learn/upgrade
    SKILL_EQUIPPED: 'skill:equipped',         // Skill added to active skill bar
    SKILL_UNEQUIPPED: 'skill:unequipped',     // Skill removed from active skill bar
    SKILL_USED: 'skill:used',                 // Skill activated (manual or auto)
    SKILL_COOLDOWN_START: 'skill:cooldownStart',
    SKILL_COOLDOWN_END: 'skill:cooldownEnd',
    SKILL_TOGGLE_ON: 'skill:toggleOn',        // Toggle skill activated
    SKILL_TOGGLE_OFF: 'skill:toggleOff',      // Toggle skill deactivated
    SKILL_TRIGGERED: 'skill:triggered',       // Triggered skill proc'd
    SKILL_AUTOCAST_CHANGE: 'skill:autocastChange', // Auto-cast setting changed
    
    // Status Effects
    STATUS_APPLIED: 'status:applied',
    STATUS_REMOVED: 'status:removed',
    STATUS_TICK: 'status:tick',
    STATUS_EXPIRED: 'status:expired',         // Effect duration ended
    
    // Loot Events
    LOOT_DROP: 'loot:drop',
    LOOT_SPAWNED: 'loot:spawned',
    LOOT_PICKUP: 'loot:pickup',
    LOOT_GOLD: 'loot:gold',
    
    // Character Events
    CHARACTER_LEVEL_UP: 'character:levelUp',
    CHARACTER_XP_GAIN: 'character:xpGain',
    CHARACTER_STAT_CHANGE: 'character:statChange',
    CHARACTER_EQUIP: 'character:equip',
    CHARACTER_UNEQUIP: 'character:unequip',
    CHARACTER_DEATH: 'character:death',
    CHARACTER_RESPAWN: 'character:respawn',
    
    // Inventory Events
    INVENTORY_ADD: 'inventory:add',
    INVENTORY_REMOVE: 'inventory:remove',
    INVENTORY_UPDATE: 'inventory:update',
    INVENTORY_FULL: 'inventory:full',
    
    // Potion Events
    POTION_EQUIPPED: 'potion:equipped',
    POTION_UNEQUIPPED: 'potion:unequipped',
    POTION_USED: 'potion:used',
    
    // Forge Events (NEW - v1.5.0)
    FORGE_SUCCESS: 'forge:success',           // Successful upgrade
    FORGE_FAILURE: 'forge:failure',           // Failed upgrade (item preserved)
    FORGE_DESTRUCTION: 'forge:destruction',   // Item destroyed on failure
    AETHER_CHANGED: 'aether:changed',         // Aether collected or spent
    
    // MUD Events (v1.4.0)
    MUD_TEXT_ADD: 'mud:textAdd',               // Add text to MUD feed
    MUD_LOCATION_CHANGE: 'mud:locationChange', // Location/actions changed
    MUD_BADGE_UPDATE: 'mud:badgeUpdate',       // Update notification badges
    MUD_DIALOGUE_START: 'mud:dialogueStart',   // NPC dialogue started
    MUD_DIALOGUE_END: 'mud:dialogueEnd',       // NPC dialogue ended
    MUD_ACTION: 'mud:action',                  // MUD action button pressed
    
    // UI Events
    UI_ACTION_LOG: 'ui:actionLog',
    UI_CHAT_MESSAGE: 'ui:chatMessage',
    UI_NOTIFICATION: 'ui:notification',
    UI_MODAL_OPEN: 'ui:modalOpen',
    UI_MODAL_CLOSE: 'ui:modalClose',
    UI_PANEL_TOGGLE: 'ui:panelToggle',
    
    // Player Input
    INPUT_HEX_CLICK: 'input:hexClick',
    INPUT_ENTITY_CLICK: 'input:entityClick',
    INPUT_SKILL_USE: 'input:skillUse',
    INPUT_TOGGLE_AUTO: 'input:toggleAuto',
    
    // Auto-Battle
    AUTO_BATTLE_START: 'autoBattle:start',
    AUTO_BATTLE_STOP: 'autoBattle:stop',
    AUTO_BATTLE_TIMER: 'autoBattle:timer',
    
    // Ambient Events
    AMBIENT_EVENT: 'ambient:event',
    
    // Save/Load
    SAVE_GAME: 'save:game',
    LOAD_GAME: 'load:game',
    SAVE_SUCCESS: 'save:success',
    LOAD_SUCCESS: 'load:success',

    // Housing Events (NEW v1.6.0)
    MATERIAL_CHANGED: 'material:changed',
    HOUSING_UPGRADED: 'housing:upgraded',

    // Bank Events (NEW v1.7.0)
    BANK_GOLD_CHANGED: 'bank:gold_changed',
    BANK_ITEM_DEPOSITED: 'bank:item_deposited',
    BANK_ITEM_WITHDRAWN: 'bank:item_withdrawn',
    BANK_VAULT_EXPANDED: 'bank:vault_expanded',

    // Proc Events (NEW v1.8.0)
    PROC_TRIGGERED: 'proc:triggered',             // Proc chance succeeded, effect about to apply
    PROC_EFFECT_APPLIED: 'proc:effectApplied',     // Proc effect applied to target (with amounts)
    PROC_COOLDOWN_START: 'proc:cooldownStart',     // Proc went on cooldown

    // Tutorial Events (NEW v1.9.0)
    TOWN_SCREEN_READY:    'tutorial:townScreenReady',     // TownScreen finished rendering
    HOUSING_SCREEN_READY: 'tutorial:housingScreenReady',  // HousingScreen finished rendering
    BATTLE_MAP_READY:     'tutorial:battleMapReady',      // BattleMapUI hex grid ready
    WORLD_MAP_OPENED:     'tutorial:worldMapOpened',      // WorldMapUI modal opened
    TUTORIAL_STEP_CHANGED: 'tutorial:stepChanged',        // { id, step } — informational
    TUTORIAL_COMPLETE:    'tutorial:complete',            // { id } — tutorial finished

};

export default eventBus;
