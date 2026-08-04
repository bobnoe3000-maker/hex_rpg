/**
 * @file HousingStaffSystem.js
 * @description Runtime system for household staff management.
 *              Handles hire/fire, daily wage deduction, buff calculation,
 *              trust tier tracking, NPC ambient event scheduling, dialogue
 *              dispatch, and lore hook fire/flag management.
 *
 * @location systems/HousingStaffSystem.js
 * @usage Singleton. Imported by HousingScreen.js and HousingStaffPanel.js.
 *        Call init(character) on housing screen mount, then onHousingEntered()
 *        to trigger payroll. Buff totals consumed by main.js buff application.
 * @dependencies
 *   - config/housingStaffConfig.js
 *   - systems/EventBus.js
 *
 * @version 1.0.0
 * @changelog
 *   - v1.0.0 (2026-03-05): Initial implementation. Hire/fire, daily wages,
 *                          buff aggregation, trust tiers, ambient events,
 *                          dialogue, lore hooks, save migration.
 */

import {
    HousingStaff,
    StaffSettings,
    getStaffDefinition,
    getAllStaffIds,
    getRandomStaffAmbient,
    getStaffDialogue,
    getStaffTopics,
} from '../config/housingStaffConfig.js';

import { eventBus, GameEvents } from './EventBus.js';

// ============================================================
// Default state shape for a single staff slot in save data
// ============================================================
function _defaultSlot() {
    return {
        hired:         false,
        daysEmployed:  0,
        lastPayday:    null,   // Unix timestamp ms
        loreTriggered: false,  // Has the lore hook already fired?
    };
}

class HousingStaffSystem {
    constructor() {
        this._character    = null;
        this._initialized  = false;
    }

    // ============================================================
    // LIFECYCLE
    // ============================================================

    /**
     * Attach the system to a character. Call once when HousingScreen mounts.
     * Runs save-data migration to ensure all staff slots exist.
     * @param {Object} character
     */
    init(character) {
        this._character   = character;
        this._initialized = true;
        this._migrateStaffData(character);
    }

    /**
     * Call every time the housing screen is entered.
     * Triggers payroll deduction for elapsed real-world days.
     */
    onHousingEntered() {
        if (!this._character) return;
        const result = this.processDailyWages(this._character);
        if (result.totalDeducted > 0 || result.evictions.length > 0) {
            eventBus.emit(GameEvents.STAFF_WAGES_PAID, result);
        }
    }

    /**
     * Ensure character.hiredStaff has every staff slot with correct default shape.
     * Safe to call on old save data that pre-dates this feature.
     * @param {Object} character
     * @private
     */
    _migrateStaffData(character) {
        if (!character.hiredStaff) {
            character.hiredStaff = {};
        }
        for (const id of getAllStaffIds()) {
            if (!character.hiredStaff[id]) {
                character.hiredStaff[id] = _defaultSlot();
            } else {
                // Patch any missing fields on existing slots
                const slot = character.hiredStaff[id];
                if (slot.daysEmployed  === undefined) slot.daysEmployed  = 0;
                if (slot.lastPayday    === undefined) slot.lastPayday    = null;
                if (slot.loreTriggered === undefined) slot.loreTriggered = false;
            }
        }
    }

    // ============================================================
    // STAFF MANAGEMENT — HIRE / FIRE
    // ============================================================

    /**
     * Check whether a character can hire a specific staff member.
     * @param {Object} character
     * @param {string} staffId
     * @returns {{ canHire: boolean, reason: string }}
     */
    canHire(character, staffId) {
        const def = getStaffDefinition(staffId);
        if (!def) return { canHire: false, reason: 'Unknown staff member.' };

        const slot = character.hiredStaff?.[staffId];
        if (slot?.hired) return { canHire: false, reason: `${def.name} is already hired.` };

        // Check home room level requirement
        const roomLevel = character.housingLevels?.[def.homeRoom] || 0;
        if (roomLevel < def.minRoomLevel) {
            const roomName = def.homeRoom.charAt(0).toUpperCase() + def.homeRoom.slice(1);
            return {
                canHire: false,
                reason:  `Requires ${roomName} level ${def.minRoomLevel} (you have level ${roomLevel}).`,
            };
        }

        return { canHire: true, reason: '' };
    }

    /**
     * Hire a staff member.
     * @param {Object} character
     * @param {string} staffId
     * @returns {{ success: boolean, message: string, hireText: string }}
     */
    hireStaff(character, staffId) {
        const { canHire, reason } = this.canHire(character, staffId);
        if (!canHire) return { success: false, message: reason, hireText: '' };

        const def  = getStaffDefinition(staffId);
        const slot = character.hiredStaff[staffId];

        slot.hired        = true;
        slot.daysEmployed = 0;
        slot.lastPayday   = Date.now();
        // loreTriggered intentionally NOT reset — if they heard the lore before, they won't repeat it

        eventBus.emit(GameEvents.STAFF_HIRED, {
            staffId,
            staffName: def.name,
            character,
        });
        eventBus.emit(GameEvents.SAVE_GAME, { reason: 'staff_hired' });

        return { success: true, message: `${def.name} has joined your household.`, hireText: def.hireText };
    }

    /**
     * Fire a staff member.
     * @param {Object} character
     * @param {string} staffId
     * @returns {{ success: boolean, message: string, fireText: string }}
     */
    fireStaff(character, staffId) {
        const def  = getStaffDefinition(staffId);
        if (!def) return { success: false, message: 'Unknown staff member.', fireText: '' };

        const slot = character.hiredStaff?.[staffId];
        if (!slot?.hired) return { success: false, message: `${def.name} is not currently hired.`, fireText: '' };

        slot.hired        = false;
        slot.daysEmployed = 0;
        slot.lastPayday   = null;

        eventBus.emit(GameEvents.STAFF_FIRED, {
            staffId,
            staffName: def.name,
            character,
        });
        eventBus.emit(GameEvents.SAVE_GAME, { reason: 'staff_fired' });

        return { success: true, message: `${def.name} has left your household.`, fireText: def.fireText };
    }

    /**
     * Whether a staff member is currently hired.
     * @param {Object} character
     * @param {string} staffId
     * @returns {boolean}
     */
    isHired(character, staffId) {
        return character.hiredStaff?.[staffId]?.hired === true;
    }

    /**
     * Get all currently hired staff IDs.
     * @param {Object} character
     * @returns {string[]}
     */
    getHiredStaffIds(character) {
        return getAllStaffIds().filter(id => this.isHired(character, id));
    }

    // ============================================================
    // PAYROLL
    // ============================================================

    /**
     * Deduct daily wages for all hired staff for each elapsed day since last payday.
     * If gold goes negative, auto-evict the most expensive staff member(s) until solvent.
     *
     * @param {Object} character
     * @returns {{
     *   daysCharged: number,
     *   totalDeducted: number,
     *   evictions: Array<{ staffId, staffName, reason }>,
     *   broke: boolean
     * }}
     */
    processDailyWages(character) {
        const now       = Date.now();
        const interval  = StaffSettings.payIntervalMs;
        const evictions = [];
        let totalDeducted = 0;
        let maxDays = 0;

        for (const id of this.getHiredStaffIds(character)) {
            const def  = getStaffDefinition(id);
            const slot = character.hiredStaff[id];

            // Guard: skip stale save data referencing a removed staff definition
            if (!def) {
                slot.hired = false;
                continue;
            }

            if (!slot.lastPayday) {
                slot.lastPayday = now;
                continue;
            }

            const elapsed  = now - slot.lastPayday;
            const days     = Math.floor(elapsed / interval);
            if (days <= 0) continue;

            const cost = def.dailyCost * days;
            character.gold = (character.gold || 0) - cost;
            totalDeducted += cost;
            slot.daysEmployed += days;
            slot.lastPayday    = slot.lastPayday + days * interval;
            maxDays = Math.max(maxDays, days);

            // Trust tier events — clamp prevDays to 0 so a large first-time elapsed
            // jump (e.g. hired days ago, first visit back) doesn't produce a negative
            // value that _trustTierFromDays misreads, causing a spurious Tier 0→2 jump.
            const prevDays = Math.max(0, slot.daysEmployed - days);
            const oldTier  = this._trustTierFromDays(prevDays);
            const newTier  = this._trustTierFromDays(slot.daysEmployed);
            if (newTier > oldTier) {
                eventBus.emit(GameEvents.STAFF_TRUST_INCREASED, {
                    staffId: id, staffName: def.name, newTier, character,
                });
            }
        }

        // Auto-evict if gold negative — fire most expensive first
        let broke = character.gold < 0;
        if (broke) {
            const hired = this.getHiredStaffIds(character)
                .map(id => ({ id, cost: getStaffDefinition(id).dailyCost }))
                .sort((a, b) => b.cost - a.cost);

            for (const { id } of hired) {
                if (character.gold >= 0) break;
                const def = getStaffDefinition(id);
                const slot = character.hiredStaff[id];
                slot.hired     = false;
                slot.lastPayday = null;

                const eviction = { staffId: id, staffName: def.name, reason: 'insufficient_funds' };
                evictions.push(eviction);
                eventBus.emit(GameEvents.STAFF_EVICTED, { ...eviction, character });
            }
        }

        broke = character.gold < 0; // recheck after evictions

        return { daysCharged: maxDays, totalDeducted, evictions, broke };
    }

    // ============================================================
    // BUFFS
    // ============================================================

    /**
     * Get the combined buff object for all hired staff.
     * Shape matches HousingSystem.getAggregatedBuffs() for easy merging.
     * @param {Object} character
     * @returns {Object}  e.g. { hpRegen: 8, offlineXp: 10, ... }
     */
    getStaffBuffs(character) {
        const totals = {};
        for (const id of this.getHiredStaffIds(character)) {
            const def = getStaffDefinition(id);
            for (const [buffKey, value] of Object.entries(def.buffs)) {
                totals[buffKey] = (totals[buffKey] || 0) + value;
            }
        }
        return totals;
    }

    // ============================================================
    // TRUST
    // ============================================================

    /**
     * Get the trust tier (0, 1, or 2) for a staff member.
     * @param {Object} character
     * @param {string} staffId
     * @returns {number}
     */
    getTrustTier(character, staffId) {
        const days = character.hiredStaff?.[staffId]?.daysEmployed || 0;
        return this._trustTierFromDays(days);
    }

    /** @private */
    _trustTierFromDays(days) {
        if (days >= StaffSettings.trustTier2Days) return 2;
        if (days >= StaffSettings.trustTier1Days) return 1;
        return 0;
    }

    // ============================================================
    // AMBIENT EVENTS (MUD text feed)
    // ============================================================

    /**
     * Generate a staff ambient event for the MUD text feed.
     * Call this from HousingScreen._startAmbientEvents() on the staff-event path.
     *
     * @param {Object}       character
     * @param {string|null}  currentRoom   The structure ID the player is currently viewing
     * @param {string|null}  forcedStaffId If provided, use this NPC instead of a random one
     * @returns {{ staffId, staffName, icon, text, isWandering } | null}
     */
    getNextAmbientEvent(character, currentRoom, forcedStaffId = null) {
        const hired = this.getHiredStaffIds(character);
        if (hired.length === 0) return null;

        // Use forced staff ID (e.g. immediately after hiring) or pick randomly
        const staffId = (forcedStaffId && hired.includes(forcedStaffId))
            ? forcedStaffId
            : hired[Math.floor(Math.random() * hired.length)];
        const def = getStaffDefinition(staffId);
        if (!def) return null;

        // Decide if wandering (NPC in unexpected room)
        const inHomeRoom  = def.homeRoom === currentRoom;
        const isWandering = !inHomeRoom || Math.random() < StaffSettings.wanderChance;

        const text = getRandomStaffAmbient(staffId, isWandering);
        if (!text) return null;

        return {
            staffId,
            staffName:   def.name,
            icon:        def.icon,
            text,
            isWandering,
        };
    }

    // ============================================================
    // DIALOGUE
    // ============================================================

    /**
     * Get the list of topics available to ask a staff member.
     * @param {string} staffId
     * @returns {Array<{ key, label, icon }>}
     */
    getAvailableTopics(staffId) {
        return getStaffTopics(staffId);
    }

    /**
     * Get the dialogue response for a topic at the character's current trust tier.
     * @param {Object} character
     * @param {string} staffId
     * @param {string} topicKey
     * @returns {string}
     */
    getDialogueResponse(character, staffId, topicKey) {
        const tier     = this.getTrustTier(character, staffId);
        const response = getStaffDialogue(staffId, topicKey, tier);
        return response;
    }

    // ============================================================
    // LORE HOOKS
    // ============================================================

    /**
     * Check all hired staff for pending lore hooks.
     * A lore hook fires once when a staff member reaches Trust Tier 2
     * and has not yet had their lore triggered.
     *
     * @param {Object} character
     * @returns {Array<{ staffId, staffName, triggerText, threadTag, storyThread }>}
     */
    checkLoreHooks(character) {
        const pending = [];
        for (const id of this.getHiredStaffIds(character)) {
            const slot = character.hiredStaff[id];
            if (slot.loreTriggered) continue;
            if (this.getTrustTier(character, id) < 2) continue;

            const def = getStaffDefinition(id);
            pending.push({
                staffId:     id,
                staffName:   def.name,
                triggerText: def.loreHook.triggerText,
                threadTag:   def.loreHook.threadTag,
                storyThread: def.loreHook.storyThread,
            });
        }
        return pending;
    }

    /**
     * Mark a staff member's lore hook as seen so it doesn't fire again.
     * @param {Object} character
     * @param {string} staffId
     */
    markLoreSeen(character, staffId) {
        if (character.hiredStaff?.[staffId]) {
            character.hiredStaff[staffId].loreTriggered = true;
        }
        eventBus.emit(GameEvents.STAFF_LORE_TRIGGERED, {
            staffId,
            staffName:   getStaffDefinition(staffId)?.name,
            storyThread: getStaffDefinition(staffId)?.loreHook?.storyThread,
        });
        eventBus.emit(GameEvents.SAVE_GAME, { reason: 'staff_lore_triggered' });
    }

    // ============================================================
    // UPGRADE TIMING (housed here as system-level concern)
    // ============================================================

    /**
     * Record that a structure upgrade has started.
     * Persists to character.pendingUpgrades for save/load support.
     * @param {Object} character
     * @param {string} structureId
     * @param {number} durationMs
     * @param {number} targetLevel  The level the structure will reach on completion
     */
    startUpgrade(character, structureId, durationMs, targetLevel) {
        if (!character.pendingUpgrades) character.pendingUpgrades = {};
        character.pendingUpgrades[structureId] = {
            startedAt:   Date.now(),
            durationMs,
            targetLevel,
        };
        eventBus.emit(GameEvents.HOUSING_UPGRADE_STARTED, {
            character, structureId, durationMs, targetLevel,
        });
        eventBus.emit(GameEvents.SAVE_GAME, { reason: 'upgrade_started' });
    }

    /**
     * Check all pending upgrades and complete any that have elapsed.
     * Call on housing screen mount.
     * @param {Object} character
     * @returns {Array<{ structureId, targetLevel }>}  Completed upgrades this check
     */
    checkPendingUpgrades(character) {
        if (!character.pendingUpgrades) return [];
        const completed = [];
        const now = Date.now();

        for (const [structureId, pending] of Object.entries(character.pendingUpgrades)) {
            const elapsed = now - pending.startedAt;
            if (elapsed >= pending.durationMs) {
                character.housingLevels[structureId] = pending.targetLevel;
                delete character.pendingUpgrades[structureId];
                completed.push({ structureId, targetLevel: pending.targetLevel });
                eventBus.emit(GameEvents.HOUSING_UPGRADED, {
                    character, structureId,
                    oldLevel:   pending.targetLevel - 1,
                    newLevel:   pending.targetLevel,
                    stageChanged: false,  // HousingScreen recalculates
                    cost:       {},       // already deducted at start
                });
            }
        }

        if (completed.length > 0) {
            eventBus.emit(GameEvents.SAVE_GAME, { reason: 'upgrades_completed' });
        }

        return completed;
    }

    /**
     * Get progress info for an in-progress upgrade.
     * @param {Object} character
     * @param {string} structureId
     * @returns {{ inProgress: boolean, remainingMs: number, totalMs: number, pct: number, targetLevel: number } | null}
     */
    getUpgradeProgress(character, structureId) {
        const pending = character.pendingUpgrades?.[structureId];
        if (!pending) return { inProgress: false };

        const elapsed     = Date.now() - pending.startedAt;
        const remainingMs = Math.max(0, pending.durationMs - elapsed);
        const pct         = Math.min(100, (elapsed / pending.durationMs) * 100);

        // Elapsed >= total means the upgrade is done — flip inProgress so the
        // interval in HousingScreen detects completion and calls checkPendingUpgrades.
        if (elapsed >= pending.durationMs) {
            return {
                inProgress:  false,
                remainingMs: 0,
                totalMs:     pending.durationMs,
                pct:         100,
                targetLevel: pending.targetLevel,
            };
        }

        return {
            inProgress:  true,
            remainingMs,
            totalMs:     pending.durationMs,
            pct,
            targetLevel: pending.targetLevel,
        };
    }

    // ============================================================
    // UTILITY
    // ============================================================

    /**
     * Get a summary of hired staff and their costs for display.
     * @param {Object} character
     * @returns {{ count: number, dailyTotal: number, staff: Array }}
     */
    getHiredSummary(character) {
        const hired = this.getHiredStaffIds(character);
        let dailyTotal = 0;
        const staff = hired.map(id => {
            const def  = getStaffDefinition(id);
            const slot = character.hiredStaff[id];
            dailyTotal += def.dailyCost;
            return {
                id,
                name:        def.name,
                title:       def.title,
                icon:        def.icon,
                dailyCost:   def.dailyCost,
                daysEmployed: slot.daysEmployed,
                trustTier:   this.getTrustTier(character, id),
                buffs:       def.buffs,
            };
        });
        return { count: hired.length, dailyTotal, staff };
    }
}

// Singleton export
export const housingStaffSystem = new HousingStaffSystem();
export default housingStaffSystem;
