/**
 * @file TutorialManager.js
 * @description Coach-mark / spotlight tutorial overlay system for Hex Infinity RPG.
 *              Manages four independent tutorial flows: townScreen (11 steps), housingScreen
 *              (5 steps), worldMap (3 steps), battleMap (7 steps). Renders spotlight rings, tooltip bubbles, and completion cards
 *              as DOM overlays on top of the existing UI. Does not modify game state.
 *
 * @usage
 *   import { TutorialManager } from './ui/TutorialManager.js';
 *   const tutorialManager = new TutorialManager();
 *   tutorialManager.init(characterId);
 *
 *   // In screen files — emit the appropriate ready event after render:
 *   eventBus.emit(GameEvents.TOWN_SCREEN_READY, {});
 *
 *   // Replay from menu:
 *   window.game._tutorialManager.replayTutorial('townScreen');
 *
 * @dependencies
 *   - systems/EventBus.js — eventBus singleton + GameEvents constants
 *   - localStorage        — tutorial state persisted per character ID
 *
 * @version 1.2.0
 * @changelog
 *   - v1.2.0 (2026-03-06): Split combined battleMap into separate worldMap (3 steps)
 *                          and battleMap (7 steps) tutorials. Removed all cross-screen
 *                          park/resume logic. battleMap step 0 uses centered tooltip.
 *   - v1.1.0 (2026-03-06): Merged homeUI into townScreen.
 *   - v1.0.0 (2026-03-06): Initial implementation.
 */

import { eventBus, GameEvents } from '../systems/EventBus.js';

// ─────────────────────────────────────────────────────────────────
// STEP DEFINITIONS
// Each tutorial is a declarative array of step config objects.
//
// Step config shape:
// {
//   targetSelector : string|null  — CSS selector for spotlight target (null = no spotlight)
//   tooltipArrow   : string       — 'arrow-up' | 'arrow-down' | 'arrow-down-center'
//   tooltipPlace   : string       — 'above' | 'below'  (where tooltip appears relative to target)
//   bodyHTML       : string       — innerHTML for tooltip body (<strong> highlights key terms)
//   gate           : boolean      — false = Next btn advances; true = must tap gateSelector
//   gateSelector   : string|null  — selector player must tap when gate:true
//   hardGate       : boolean      — true = block all input except gateSelector (auto-battle only)
//   eventTrigger   : string|null  — GameEvents key that activates this step (step 9 only)
//   completion     : boolean      — true = render completion card instead of spotlight+tooltip
//   completionData : object|null  — { icon, title, body, btn } when completion:true
// }
// ─────────────────────────────────────────────────────────────────

const TUTORIALS = {

    // ── TOWN SCREEN (7 steps) ────────────────────────────────────
    townScreen: [
        // ── Welcome intro (step 1) ───────────────────────────────
        {
            targetSelector: null,
            tooltipArrow:   null,
            tooltipPlace:   null,
            bodyHTML:       'Welcome to <strong>Hex Infinity</strong>! Since you\'re new here, this brief tutorial will help you get acquainted with the game.<br><br>You can always replay any tutorial from the <strong>Menu</strong> button in the nav bar.',
            gate: false, gateSelector: null, eventTrigger: null, completion: false, completionData: null
        },
        // ── Town orientation (steps 2–5) ──────────────────────────
        {
            targetSelector: 'header.mud-location-header',
            tooltipArrow:   'arrow-up',
            tooltipPlace:   'below',
            bodyHTML:       'This is your <strong>location header</strong> — it shows where you are in Eron\'s Landing, and your current <strong>HP and MP</strong>.',
            gate: false, gateSelector: null, eventTrigger: null, completion: false, completionData: null
        },
        {
            targetSelector: 'div#textFeed',
            tooltipArrow:   'arrow-up',
            tooltipPlace:   'below',
            bodyHTML:       'This is your <strong>adventure log</strong>. Movement descriptions, NPC dialogue, and town events all appear here as you explore.',
            gate: false, gateSelector: null, eventTrigger: null, completion: false, completionData: null
        },
        {
            targetSelector: 'div#mudActions',
            tooltipArrow:   'arrow-down',
            tooltipPlace:   'above',
            bodyHTML:       'These are the <strong>actions available here</strong>. Tap them to talk to NPCs, enter shops, or use services at your current location.',
            gate: false, gateSelector: null, eventTrigger: null, completion: false, completionData: null
        },
        {
            targetSelector: 'div#exitsBar',
            tooltipArrow:   'arrow-down',
            tooltipPlace:   'above',
            bodyHTML:       'Use <strong>Go To</strong> buttons to travel around Eron\'s Landing — the Market, Forge, Temple, and more. Each has unique services.',
            gate: true, hardGate: false, gateSelector: 'div#exitsBar .mud-exit-btn', eventTrigger: null, completion: false, completionData: null
        },
        // ── Nav bar tour (steps 5–9, merged from homeUI) ──────────
        {
            targetSelector: 'nav.main-nav',
            tooltipArrow:   'arrow-down-center',
            tooltipPlace:   'above',
            bodyHTML:       'This <strong>nav bar</strong> is always visible. It\'s your quick access to everything — character, inventory, skills, map, and menu.',
            gate: false, gateSelector: null, eventTrigger: null, completion: false, completionData: null
        },
        {
            targetSelector: 'nav.main-nav [data-nav="stats"]',
            tooltipArrow:   'arrow-down',
            tooltipPlace:   'above',
            bodyHTML:       '<strong>Character</strong> — view your stats, equipped gear, and skill tree. A badge appears when you have unspent stat or skill points.',
            gate: false, gateSelector: null, eventTrigger: null, completion: false, completionData: null
        },
        {
            targetSelector: 'nav.main-nav [data-nav="items"]',
            tooltipArrow:   'arrow-down',
            tooltipPlace:   'above',
            bodyHTML:       '<strong>Items</strong> — your full inventory. A badge lights up when new loot has dropped. Tap gear to compare it with what you\'re wearing.',
            gate: false, gateSelector: null, eventTrigger: null, completion: false, completionData: null
        },
        {
            targetSelector: 'nav.main-nav [data-nav="map"]',
            tooltipArrow:   'arrow-down',
            tooltipPlace:   'above',
            bodyHTML:       '<strong>Map</strong> — open the World Map to choose your next battle location or travel between areas.',
            gate: false, gateSelector: null, eventTrigger: null, completion: false, completionData: null
        },
        {
            targetSelector: 'nav.main-nav [data-nav="menu"]',
            tooltipArrow:   'arrow-down',
            tooltipPlace:   'above',
            bodyHTML:       '<strong>Menu</strong> — settings, save game, character select, and Return to Town. You can also replay any tutorial from here.',
            gate: false, gateSelector: null, eventTrigger: null, completion: false, completionData: null
        },
        // ── Completion card (step 10) ─────────────────────────────
        {
            targetSelector: null,
            tooltipArrow:   null,
            tooltipPlace:   null,
            bodyHTML:       null,
            gate: false, gateSelector: null, eventTrigger: null,
            completion: true,
            completionData: {
                icon:  '⚔️',
                title: "You're ready, adventurer.",
                body:  "Eron\'s Landing is yours to explore — check out the <em>Forge</em>, <em>Temple</em>, and <em>Market</em>.<br><br>When you\'re ready to fight, tap <em>Map</em> in the nav bar to open the World Map.",
                btn:   "Let's Explore"
            }
        }
    ],

    // ── HOUSING SCREEN (5 steps) ─────────────────────────────────
    housingScreen: [
        {
            targetSelector: 'header#housing-location-header',
            tooltipArrow:   'arrow-up',
            tooltipPlace:   'below',
            bodyHTML:       'Welcome home! This header shows which <strong>room</strong> you\'re in. Your home has multiple rooms — each upgrades independently to grant passive bonuses.',
            gate: false, gateSelector: null, eventTrigger: null, completion: false, completionData: null
        },
        {
            targetSelector: 'div#housing-room-card',
            tooltipArrow:   'arrow-up',
            tooltipPlace:   'below',
            bodyHTML:       'This card shows the room\'s description, its current <strong>passive buff</strong>, and upgrade progress. Higher levels mean stronger bonuses.',
            gate: false, gateSelector: null, eventTrigger: null, completion: false, completionData: null
        },
        {
            targetSelector: 'div#housing-action-bar',
            tooltipArrow:   'arrow-down',
            tooltipPlace:   'above',
            bodyHTML:       'Use <strong>Upgrade</strong> to level up this room (costs gold + materials). <strong>Craft</strong> lets you make useful items. Materials drop from battle maps.',
            gate: false, gateSelector: null, eventTrigger: null, completion: false, completionData: null
        },
        {
            targetSelector: 'div#housing-rooms-bar',
            tooltipArrow:   'arrow-down',
            tooltipPlace:   'above',
            bodyHTML:       'Switch between your <strong>rooms</strong> here — just like town travel. Each room upgrades separately. Explore them all!',
            gate: true, hardGate: false, gateSelector: 'div#housing-rooms-bar button', eventTrigger: null, completion: false, completionData: null
        },
        {
            targetSelector: null,
            tooltipArrow:   null,
            tooltipPlace:   null,
            bodyHTML:       null,
            gate: false, gateSelector: null, eventTrigger: null,
            completion: true,
            completionData: {
                icon:  '🏠',
                title: 'Your home grows with you.',
                body:  'Farm battle maps to collect <em>materials</em>, then invest them here for permanent passive bonuses.<br><br>The more you upgrade, the stronger your character becomes.',
                btn:   'Got it!'
            }
        }
    ],

    // ── WORLD MAP (3 steps) ──────────────────────────────────────
    worldMap: [
        {
            targetSelector: 'div.wm-canvas',
            tooltipArrow:   'arrow-down-center',
            tooltipPlace:   'above',
            bodyHTML:       'This is the <strong>World Map</strong>. Each circle is a battle location. Tap any location to see its enemies and level range.',
            gate: false, gateSelector: null, eventTrigger: null, completion: false, completionData: null
        },
        {
            targetSelector: '#wmSvg',
            tooltipArrow:   'arrow-down-center',
            tooltipPlace:   'above',
            bodyHTML:       'Tap a <strong>location circle</strong> to see its detail panel. Connected nodes show the paths available to you.',
            gate: true, hardGate: false, gateSelector: '#wmSvg circle, #wmSvg .wm-node', eventTrigger: null, completion: false, completionData: null
        },
        {
            targetSelector: '#wmSvg',
            tooltipArrow:   'arrow-down-center',
            tooltipPlace:   'above',
            bodyHTML:       'For your first battle, we recommend <strong>The Sewers</strong> — it\'s designed for new adventurers (Level 1–5). Tap it, then tap <strong>Travel</strong> to enter!',
            gate: true, hardGate: false, gateSelector: '#wmDetailPanel .wm-travel-btn, #wmDetailPanel button', eventTrigger: null, completion: false, completionData: null
        }
    ],

    // ── BATTLE MAP (7 steps) ─────────────────────────────────────
    battleMap: [
        {
            // Centered intro — no spotlight needed, avoids positioning issues on large hex grid
            targetSelector: null,
            tooltipArrow:   null,
            tooltipPlace:   null,
            bodyHTML:       'Welcome to the <strong>battle map</strong>! This hex grid is where combat happens.<br><br>Your character has a <strong>blue outline</strong>; enemies have a <strong>red outline</strong>. Tap any tile to move there — let\'s walk you through the controls.',
            gate: false, gateSelector: null, eventTrigger: null, completion: false, completionData: null
        },
        {
            targetSelector: 'div#floatingLogs',
            tooltipArrow:   'arrow-down',
            tooltipPlace:   'above',
            bodyHTML:       'The <strong>Action Log</strong> tracks every attack, damage number, and loot drop. Use the tabs to filter <strong>Combat</strong>, <strong>Events</strong>, or All.',
            gate: false, gateSelector: null, eventTrigger: null, completion: false, completionData: null
        },
        {
            targetSelector: 'button.btn-auto-battle',
            tooltipArrow:   'arrow-down',
            tooltipPlace:   'above',
            bodyHTML:       'Tap <strong>Auto Battle ⚔️</strong> to begin! Your character automatically moves toward enemies and attacks. Toggling it off stops <em>movement</em> only — any fight already in progress continues. <strong>Try it now!</strong>',
            gate: true, hardGate: true,  gateSelector: 'button.btn-auto-battle', eventTrigger: null, completion: false, completionData: null
        },
        {
            targetSelector: 'div.skill-bar-container',
            tooltipArrow:   'arrow-down',
            tooltipPlace:   'above',
            bodyHTML:       'These are your <strong>equipped skills</strong> — they fire automatically in combat. New adventurers start without skills. Earn <strong>level-ups</strong> to gain skill points, then visit the <strong>Skills</strong> screen (Character → Skills) to learn and equip them.',
            gate: false, gateSelector: null, eventTrigger: null, completion: false, completionData: null
        },
        {
            targetSelector: 'div.quick-items',
            tooltipArrow:   'arrow-down',
            tooltipPlace:   'above',
            bodyHTML:       'These are your <strong>quick-use potions</strong>. Tap to use Health ❤️ or Mana 💧 instantly during battle. Potions drop from enemies — you can also buy them at the <strong>Outfitters</strong> shop in town.',
            gate: false, gateSelector: null, eventTrigger: null, completion: false, completionData: null
        },
        {
            // Event-driven — activates only on LOOT_SPAWNED
            targetSelector: null,
            tooltipArrow:   'arrow-down-center',
            tooltipPlace:   'above',
            bodyHTML:       'Enemies drop <strong>LOOT</strong> when defeated — gold, gear, potions, and crafting materials. Tap the glowing loot hex to collect it.',
            gate: true, hardGate: false, gateSelector: null,
            eventTrigger: GameEvents.LOOT_SPAWNED,
            completion: false, completionData: null
        },
        {
            targetSelector: 'nav.main-nav [data-nav="menu"]',
            tooltipArrow:   'arrow-down',
            tooltipPlace:   'above',
            bodyHTML:       'When you\'re done fighting, tap <strong>Menu (☰)</strong> in the nav bar, then choose <strong>Return to Town</strong>. Head back to sell gear, visit the Forge, and come back stronger.',
            gate: false, gateSelector: null,
            eventTrigger: null,
            completion: true,
            completionData: {
                icon:  '🗺️',
                title: 'You know the battlefield!',
                body:  'When you\'re done, tap <em>Menu (☰)</em> then <em>Return to Town</em>.<br><br>Head back to sell gear, visit the Forge, and come back stronger.',
                btn:   'Got it!'
            }
        }
    ],

};

// Default state for a fresh character
function _defaultState() {
    return {
        townScreen:    { seen: false, completedStep: 0 },
        housingScreen: { seen: false, completedStep: 0 },
        worldMap:      { seen: false, completedStep: 0 },
        battleMap:     { seen: false, completedStep: 0 }
    };
}

// ─────────────────────────────────────────────────────────────────
// TutorialManager class
// ─────────────────────────────────────────────────────────────────

export class TutorialManager {
    constructor() {
        /** @type {string|null} Current character ID */
        this._charId = null;

        /** @type {object} Persisted state object (loaded from localStorage) */
        this._state = _defaultState();

        /** @type {string|null} ID of the currently active tutorial */
        this._activeTutorial = null;

        /** @type {number} Current step index within active tutorial */
        this._currentStep = 0;

        /** @type {HTMLElement|null} The spotlight ring element */
        this._spotlightEl = null;

        /** @type {HTMLElement|null} The tooltip element */
        this._tooltipEl = null;

        /** @type {HTMLElement|null} The completion card backdrop element */
        this._completionEl = null;

        /** @type {HTMLElement|null} The transparent block layer for gate steps */
        this._blockEl = null;

        /** @type {Function|null} Current gate click handler (for cleanup) */
        this._gateHandler = null;

        /** @type {Function[]} EventBus unsubscribe functions */
        this._unsubs = [];

        /** @type {boolean} True if waiting for a LOOT_SPAWNED event (step 9) */
        this._awaitingLoot = false;

        /** @type {string|null} Tutorial queued for cross-screen replay — fires on next matching READY event */
        this._pendingReplay = null;

        /** @type {ResizeObserver|null} Reposition tooltip/spotlight on resize */
        this._resizeObserver = null;
    }

    // ═══════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════

    /**
     * Initialise with character ID. Loads saved state from localStorage.
     * Registers EventBus listeners for all four tutorial triggers.
     * @param {string} characterId
     */
    init(characterId) {
        this._charId = characterId;
        this._loadState();
        this._registerEventListeners();
        console.log('[TutorialManager] Initialized for character:', characterId);
    }

    /**
     * Programmatically start a tutorial (also used by replay).
     * @param {'townScreen'|'housingScreen'|'worldMap'|'battleMap'} tutorialId
     */
    startTutorial(tutorialId) {
        if (!TUTORIALS[tutorialId]) {
            console.warn('[TutorialManager] Unknown tutorial id:', tutorialId);
            return;
        }

        // If another tutorial is currently running, close it first
        if (this._activeTutorial && this._activeTutorial !== tutorialId) {
            this._closeOverlay();
        }

        const state = this._state[tutorialId];
        const steps = this._getSteps(tutorialId);

        // Determine starting step
        let startStep = 0;
        if (state.seen && state.completedStep > 0 && state.completedStep < steps.length) {
            // Resume from interrupted point
            startStep = state.completedStep;
        }

        this._activeTutorial = tutorialId;
        this._currentStep = startStep;

        state.seen = true;
        this._saveState();

        this._renderStep();
        console.log(`[TutorialManager] Started tutorial: ${tutorialId} at step ${startStep}`);
    }

    /**
     * Skip the active tutorial — marks complete and dismisses overlay.
     * @param {string} [tutorialId] - defaults to active tutorial
     */
    skipTutorial(tutorialId) {
        const id = tutorialId || this._activeTutorial;
        if (!id) return;

        const steps = this._getSteps(id);
        this._state[id].seen = true;
        this._state[id].completedStep = steps.length;
        this._saveState();

        this._closeOverlay();
        console.log(`[TutorialManager] Skipped tutorial: ${id}`);
    }

    /**
     * Reset a tutorial and restart from step 0.
     * @param {string} tutorialId
     */
    replayTutorial(tutorialId) {
        if (!TUTORIALS[tutorialId]) return;
        this._state[tutorialId] = { seen: false, completedStep: 0 };
        this._saveState();
        this.startTutorial(tutorialId);
        console.log(`[TutorialManager] Replaying tutorial: ${tutorialId}`);
    }

    /**
     * Queue a tutorial for cross-screen replay. Resets state without starting —
     * the tutorial fires automatically when the target screen emits its READY event.
     * The caller is responsible for navigating to the correct screen afterwards.
     * @param {string} tutorialId
     */
    queueReplay(tutorialId) {
        if (!TUTORIALS[tutorialId]) return;
        this._closeOverlay();
        this._state[tutorialId] = { seen: false, completedStep: 0 };
        this._saveState();
        this._pendingReplay = tutorialId;
        console.log(`[TutorialManager] Queued replay: ${tutorialId} — awaiting screen transition`);
    }

    /**
     * Returns true if the specified tutorial has been fully completed.
     * @param {string} tutorialId
     * @returns {boolean}
     */
    isComplete(tutorialId) {
        const state = this._state[tutorialId];
        if (!state) return false;
        return state.seen && state.completedStep >= this._getSteps(tutorialId).length;
    }

    /**
     * Advance one step.
     */
    nextStep() {
        if (!this._activeTutorial) return;
        const steps = this._getSteps(this._activeTutorial);

        this._clearGate();

        if (this._currentStep >= steps.length - 1) {
            this._completeTutorial(this._activeTutorial);
            return;
        }

        this._currentStep++;
        this._state[this._activeTutorial].completedStep = this._currentStep;
        this._saveState();

        // Check if next step needs an event trigger (loot step)
        const step = steps[this._currentStep];
        if (step.eventTrigger) {
            this._awaitingLoot = true;
            // Don't render tooltip yet — wait for event
            return;
        }

        this._renderStep();
        eventBus.emit(GameEvents.TUTORIAL_STEP_CHANGED, {
            id: this._activeTutorial,
            step: this._currentStep
        });
    }

    /**
     * Go back one step.
     */
    prevStep() {
        if (!this._activeTutorial || this._currentStep <= 0) return;
        this._clearGate();
        this._currentStep--;
        this._state[this._activeTutorial].completedStep = this._currentStep;
        this._saveState();
        this._renderStep();
    }

    /**
     * Clean up all overlays and event listeners (call on screen destroy / logout).
     */
    destroy() {
        this._closeOverlay();
        this._unsubs.forEach(fn => fn());
        this._unsubs = [];
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
            this._resizeObserver = null;
        }
        console.log('[TutorialManager] Destroyed');
    }

    // ═══════════════════════════════════════════════════════════
    // PRIVATE — EVENT REGISTRATION
    // ═══════════════════════════════════════════════════════════

    _registerEventListeners() {
        this._unsubs.push(
            eventBus.on(GameEvents.TOWN_SCREEN_READY,    () => this._onScreenReady('townScreen')),
            eventBus.on(GameEvents.HOUSING_SCREEN_READY, () => this._onScreenReady('housingScreen')),
            eventBus.on(GameEvents.BATTLE_MAP_READY,     () => this._onBattleMapReady()),
            eventBus.on(GameEvents.WORLD_MAP_OPENED,     () => this._onWorldMapOpened()),
            eventBus.on(GameEvents.LOOT_SPAWNED,         (data) => this._onLootSpawned(data)),
            eventBus.on(GameEvents.TUTORIAL_COMPLETE,    (data) => this._onTutorialComplete(data.id))
        );
    }

    _onScreenReady(tutorialId) {
        // Pending replay takes priority — fires after a cross-screen navigation
        if (this._pendingReplay === tutorialId) {
            this._pendingReplay = null;
            setTimeout(() => this.startTutorial(tutorialId), 300);
            return;
        }
        // Normal first-time auto-trigger
        const state = this._state[tutorialId];
        if (!state.seen) {
            setTimeout(() => this.startTutorial(tutorialId), 300);
        }
    }

    _onWorldMapOpened() {
        // Pending replay for worldMap takes priority
        if (this._pendingReplay === 'worldMap') {
            this._pendingReplay = null;
            setTimeout(() => this.startTutorial('worldMap'), 300);
            return;
        }
        // Normal first-time auto-trigger
        const state = this._state.worldMap;
        if (!state.seen) {
            setTimeout(() => this.startTutorial('worldMap'), 300);
        }
    }

    _onBattleMapReady() {
        // Pending replay for battleMap takes priority
        if (this._pendingReplay === 'battleMap') {
            this._pendingReplay = null;
            setTimeout(() => this.startTutorial('battleMap'), 500);
            return;
        }
        // Normal first-time auto-trigger
        const state = this._state.battleMap;
        if (!state.seen) {
            setTimeout(() => this.startTutorial('battleMap'), 500);
        }
    }

    _onLootSpawned(data) {
        if (!this._awaitingLoot || this._activeTutorial !== 'battleMap') return;
        this._awaitingLoot = false;

        const steps = this._getSteps('battleMap');
        const step = steps[this._currentStep];

        // Try to find the loot hex element from data
        let lootEl = null;
        if (data && data.hex) {
            lootEl = document.querySelector(`[data-hex="${data.hex}"], .loot-hex[data-q="${data.q}"][data-r="${data.r}"]`);
        }
        if (!lootEl) {
            // Fall back to any loot hex visible
            lootEl = document.querySelector('.hex-loot, .loot-hex, [data-loot="true"]');
        }

        if (lootEl) {
            step.targetSelector = null; // We'll position by element directly
            this._renderStepWithElement(step, lootEl);
        } else {
            // No loot element found — render without spotlight
            this._renderStep();
        }
    }

    _onTutorialComplete(id) {
        // Reserved for future cross-tutorial chaining
    }

    // ═══════════════════════════════════════════════════════════
    // PRIVATE — RENDERING
    // ═══════════════════════════════════════════════════════════

    _getSteps(tutorialId) {
        const steps = [...TUTORIALS[tutorialId]];

        // For townScreen: insert guest Register step before nav bar tour if applicable
        if (tutorialId === 'townScreen') {
            const registerEl = document.querySelector('nav.main-nav [data-nav="register"]');
            if (registerEl) {
                // Insert at index 5, before the nav overview step (index 4 is GO TO bar, index 5 is nav overview)
                steps.splice(5, 0, {
                    targetSelector: 'nav.main-nav [data-nav="register"]',
                    tooltipArrow:   'arrow-down',
                    tooltipPlace:   'above',
                    bodyHTML:       'You\'re playing as a <strong>Guest</strong>. Tap <strong>Register</strong> to save your progress permanently — it\'s free and takes 30 seconds.',
                    gate: false, gateSelector: null, eventTrigger: null, completion: false, completionData: null
                });
            }
        }

        return steps;
    }

    _renderStep() {
        if (!this._activeTutorial) return;
        const steps = this._getSteps(this._activeTutorial);
        const step  = steps[this._currentStep];

        if (step.completion) {
            this._renderCompletion(step.completionData);
            return;
        }

        const targetEl = step.targetSelector ? document.querySelector(step.targetSelector) : null;

        if (step.targetSelector && !targetEl) {
            console.warn(`[TutorialManager] Target not found: ${step.targetSelector} — skipping step`);
            this.nextStep();
            return;
        }

        this._renderStepWithElement(step, targetEl);
    }

    _renderStepWithElement(step, targetEl) {
        this._ensureOverlayElements();
        this._clearCompletion();

        const steps     = this._getSteps(this._activeTutorial);
        const stepNum    = this._currentStep + 1;
        const totalSteps = steps.filter(s => !s.completion).length;
        const isFirst   = this._currentStep === 0;

        // Position spotlight
        if (targetEl) {
            this._positionSpotlight(targetEl);
            this._spotlightEl.style.display = 'block';
        } else {
            this._spotlightEl.style.display = 'none';
        }

        // Gate styling
        if (step.gate) {
            this._spotlightEl.classList.add('gate');
        } else {
            this._spotlightEl.classList.remove('gate');
        }

        // Build tooltip HTML
        const isLastStep = this._currentStep === steps.length - 1;
        const nextLabel  = isLastStep ? 'Finish' : 'Next →';

        this._tooltipEl.className = `tutorial-tooltip ${step.tooltipArrow || ''}`;
        this._tooltipEl.innerHTML = `
            <div class="tutorial-tooltip-header">
                <span class="tutorial-step-count">STEP ${stepNum} of ${totalSteps}</span>
                <button class="tutorial-skip-btn" id="tutSkipBtn">Skip Tutorial</button>
            </div>
            <div class="tutorial-tooltip-body">${step.bodyHTML}</div>
            <div class="tutorial-tooltip-nav">
                <button class="tutorial-nav-btn" id="tutBackBtn" ${isFirst ? 'disabled' : ''}>← Back</button>
                <button class="tutorial-nav-btn primary" id="tutNextBtn">${nextLabel}</button>
            </div>
        `;

        this._tooltipEl.style.display = 'block';
        this._positionTooltip(targetEl, step);

        // Wire buttons
        this._tooltipEl.querySelector('#tutSkipBtn').addEventListener('click', () => this.skipTutorial());
        this._tooltipEl.querySelector('#tutBackBtn').addEventListener('click', () => this.prevStep());
        this._tooltipEl.querySelector('#tutNextBtn').addEventListener('click', () => this.nextStep());

        // Gate setup
        if (step.gate) {
            this._setupGate(step);
        }

        // Reposition on resize
        this._setupResizeObserver(targetEl, step);
    }

    _positionSpotlight(targetEl) {
        const r = targetEl.getBoundingClientRect();
        const ring = this._spotlightEl;
        const pad = 4;
        ring.style.top    = `${r.top    - pad}px`;
        ring.style.left   = `${r.left   - pad}px`;
        ring.style.width  = `${r.width  + pad * 2}px`;
        ring.style.height = `${r.height + pad * 2}px`;
        // Mirror border-radius of target element
        const computed = getComputedStyle(targetEl);
        ring.style.borderRadius = computed.borderRadius || '6px';
    }

    _positionTooltip(targetEl, step) {
        const tt = this._tooltipEl;
        tt.style.left = '';
        tt.style.top  = '';
        tt.style.right = '';
        tt.style.bottom = '';
        tt.style.transform = '';

        if (!targetEl) {
            // No target — center on screen
            tt.style.position = 'fixed';
            tt.style.top  = '50%';
            tt.style.left = '50%';
            tt.style.transform = 'translate(-50%, -50%)';
            return;
        }

        const r        = targetEl.getBoundingClientRect();
        const vw       = window.innerWidth;
        const vh       = window.innerHeight;
        const gap      = 16;
        const margin   = 8;
        const ttWidth  = Math.min(vw * 0.9, 360);
        const ttHeight = tt.offsetHeight || 140;

        // Horizontal: centre over target, clamp to viewport
        let left = r.left + r.width / 2 - ttWidth / 2;
        left = Math.max(margin, Math.min(left, vw - ttWidth - margin));
        tt.style.left = `${left}px`;

        let top;
        if (step.tooltipPlace === 'below') {
            top = r.bottom + gap;
            // If it runs off the bottom, flip above instead
            if (top + ttHeight > vh - margin) {
                top = r.top - ttHeight - gap;
            }
        } else {
            // above
            top = r.top - ttHeight - gap;
            // If it runs off the top, flip below instead
            if (top < margin) {
                top = r.bottom + gap;
            }
        }

        // Final clamp: ensure tooltip is always fully on-screen
        top = Math.max(margin, Math.min(top, vh - ttHeight - margin));
        tt.style.top = `${top}px`;
    }

    _renderCompletion(data) {
        this._closeOverlay(true); // close spotlight + tooltip but keep state

        const backdrop = document.createElement('div');
        backdrop.className = 'tutorial-completion-backdrop';
        backdrop.innerHTML = `
            <div class="tutorial-completion-card">
                <div class="tutorial-completion-icon">${data.icon}</div>
                <div class="tutorial-completion-title">${data.title}</div>
                <div class="tutorial-completion-body">${data.body}</div>
                <button class="tutorial-completion-cta" id="tutCompletionCta">${data.btn}</button>
            </div>
        `;

        document.body.appendChild(backdrop);
        this._completionEl = backdrop;

        backdrop.querySelector('#tutCompletionCta').addEventListener('click', () => {
            this._completeTutorial(this._activeTutorial);
        });
    }

    // ═══════════════════════════════════════════════════════════
    // PRIVATE — GATE HANDLING
    // ═══════════════════════════════════════════════════════════

    _setupGate(step) {
        // Block layer only for hard gates (e.g. auto-battle).
        // Soft gates listen for the tap but leave the rest of the screen interactive.
        if (step.hardGate) {
            this._setupBlockLayer(step.gateSelector);
        }

        if (!step.gateSelector) return; // dynamic (loot) — no static selector to bind

        const gateTargets = document.querySelectorAll(step.gateSelector);
        if (!gateTargets.length) return;

        this._gateHandler = () => {
            this._clearGate();
            this.nextStep();
        };

        gateTargets.forEach(el => {
            el.addEventListener('click', this._gateHandler, { once: true });
        });
    }

    _setupBlockLayer(gateSelector) {
        if (this._blockEl) return;

        const block = document.createElement('div');
        block.style.cssText = `
            position: fixed; inset: 0; z-index: 999;
            pointer-events: all; background: transparent;
        `;

        // Tap on block layer = do nothing (swallow)
        block.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        document.body.appendChild(block);
        this._blockEl = block;
    }

    _clearGate() {
        if (this._blockEl) {
            this._blockEl.remove();
            this._blockEl = null;
        }
        if (this._spotlightEl) {
            this._spotlightEl.classList.remove('gate');
        }
        this._gateHandler = null;
    }

    // ═══════════════════════════════════════════════════════════
    // PRIVATE — DOM MANAGEMENT
    // ═══════════════════════════════════════════════════════════

    _ensureOverlayElements() {
        if (!this._spotlightEl) {
            const ring = document.createElement('div');
            ring.className = 'tutorial-spotlight-ring';
            document.body.appendChild(ring);
            this._spotlightEl = ring;
        }
        if (!this._tooltipEl) {
            const tt = document.createElement('div');
            tt.className = 'tutorial-tooltip';
            document.body.appendChild(tt);
            this._tooltipEl = tt;
        }
    }

    /**
     * Remove overlay elements from DOM.
     * @param {boolean} [keepState] - If true, don't reset _activeTutorial (used before completion card)
     */
    _closeOverlay(keepState = false) {
        this._clearGate();
        this._awaitingLoot = false;

        if (this._spotlightEl) {
            this._spotlightEl.remove();
            this._spotlightEl = null;
        }
        if (this._tooltipEl) {
            this._tooltipEl.remove();
            this._tooltipEl = null;
        }
        if (!keepState) {
            this._clearCompletion();
            this._activeTutorial = null;
        }
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
            this._resizeObserver = null;
        }
    }

    _clearCompletion() {
        if (this._completionEl) {
            this._completionEl.remove();
            this._completionEl = null;
        }
    }

    _completeTutorial(tutorialId) {
        const steps = this._getSteps(tutorialId);
        this._state[tutorialId].seen = true;
        this._state[tutorialId].completedStep = steps.length;
        this._saveState();

        this._closeOverlay();
        this._clearCompletion();
        this._activeTutorial = null;

        eventBus.emit(GameEvents.TUTORIAL_COMPLETE, { id: tutorialId });
        console.log(`[TutorialManager] Completed tutorial: ${tutorialId}`);
    }

    // ═══════════════════════════════════════════════════════════
    // PRIVATE — RESIZE HANDLING
    // ═══════════════════════════════════════════════════════════

    _setupResizeObserver(targetEl, step) {
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
        }
        if (!targetEl) return;

        this._resizeObserver = new ResizeObserver(() => {
            if (this._spotlightEl && targetEl.isConnected) {
                this._positionSpotlight(targetEl);
            }
            if (this._tooltipEl && targetEl.isConnected) {
                this._positionTooltip(targetEl, step);
            }
        });

        this._resizeObserver.observe(document.body);
    }

    // ═══════════════════════════════════════════════════════════
    // PRIVATE — PERSISTENCE
    // ═══════════════════════════════════════════════════════════

    _stateKey() {
        return `tutorialState_${this._charId}`;
    }

    _loadState() {
        try {
            const raw = localStorage.getItem(this._stateKey());
            if (raw) {
                const parsed = JSON.parse(raw);
                // Merge with defaults to handle newly added tutorial IDs
                this._state = Object.assign(_defaultState(), parsed);
            }
        } catch (e) {
            console.warn('[TutorialManager] Failed to load state:', e);
            this._state = _defaultState();
        }
    }

    _saveState() {
        try {
            localStorage.setItem(this._stateKey(), JSON.stringify(this._state));
        } catch (e) {
            console.warn('[TutorialManager] Failed to save state:', e);
        }
    }
}

export default TutorialManager;
