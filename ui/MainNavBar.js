/**
 * @file MainNavBar.js
 * @description Shared main navigation bar component used by TownScreen, HousingScreen,
 *              and BattleMapUI. Owns HTML generation, badge rendering, and click dispatch.
 *              Eliminates duplicated nav logic across all three screens.
 *
 *              When the active account is a guest, an extra "💾 Register" button is
 *              prepended to the nav bar. Clicking it emits the 'GUEST_REGISTER_OPEN'
 *              EventBus event, which main.js handles to show the registration modal.
 *
 * @location ui/MainNavBar.js
 * @usage
 *   import { MainNavBar } from './MainNavBar.js';
 *
 *   // 1. Generate HTML to embed in your template:
 *   const navBar = new MainNavBar(character, {
 *       onStats:  () => this._showStatsModal(),
 *       onItems:  () => this._showInventoryModal(),
 *       onSkills: () => this._showSkillsModal(),
 *       onMap:    () => this._showMapModal(),
 *       onMenu:   () => this._showMenuModal(),
 *       onItemsOpen: () => { character.newLootFlag = false; }  // optional pre-open hook
 *   });
 *
 *   // 2. Embed in template:
 *   container.innerHTML = `... <nav class="main-nav">${navBar.buildHTML()}</nav> ...`;
 *
 *   // 3. After DOM is ready, attach listeners:
 *   navBar.attach(container);
 *
 *   // 4. Refresh badges whenever state changes:
 *   navBar.update(character);
 *
 * @dependencies
 *   - MainNavButtons (config/mudConfig.js)
 *   - accountManager (systems/AccountManager.js)  — read-only, for isGuest check
 *   - eventBus (systems/EventBus.js)              — emits GUEST_REGISTER_OPEN
 *
 * @version 1.2.0
 * @changelog
 *   - v1.2.0 (2026-03-06): attach() now subscribes to GUEST_REGISTERED and self-removes
 *                          the Register button from the DOM on successful conversion,
 *                          without requiring a screen re-render.
 *   - v1.1.0 (2026-03-06): Added guest "💾 Register" nav button. Imports accountManager
 *                          and eventBus. buildHTML() prepends register button when isGuest.
 *                          _handleClick() emits 'GUEST_REGISTER_OPEN' for 'register' nav id.
 *   - v1.0.0 (2026-03-05): Initial extraction from TownScreen, HousingScreen, BattleMapUI.
 *                          Standardises badge rendering (CSS visible class), click dispatch,
 *                          and HTML generation across all three screens.
 */

import { MainNavButtons } from '../config/mudConfig.js';
import { accountManager } from '../systems/AccountManager.js';
import { eventBus } from '../systems/EventBus.js';

export class MainNavBar {
    /**
     * @param {Object} character - Player character (used for badge state)
     * @param {Object} callbacks - Handler callbacks
     * @param {Function} callbacks.onStats   - Stats button clicked
     * @param {Function} callbacks.onItems   - Items button clicked
     * @param {Function} callbacks.onSkills  - Skills button clicked
     * @param {Function} callbacks.onMap     - Map button clicked
     * @param {Function} callbacks.onMenu    - Menu button clicked
     * @param {Function} [callbacks.onItemsOpen] - Optional hook called before onItems,
     *                                             e.g. to clear newLootFlag
     */
    constructor(character, callbacks = {}) {
        this.character = character;
        this.callbacks = callbacks;
        this._container = null;
    }

    // ============================================
    // PUBLIC API
    // ============================================

    /**
     * Build the nav button HTML string for embedding in a template.
     * When the active session is a guest, a "💾 Register" button is prepended
     * so the player always has a visible, low-friction path to save their progress.
     * @returns {string} HTML string
     */
    buildHTML() {
        const standardButtons = MainNavButtons.map(btn => {
            const hasBadge = this._checkBadge(btn.badge);
            return `
                <button class="nav-btn" data-nav="${btn.id}">
                    <span class="nav-icon">${btn.icon}</span>
                    <span class="nav-label">${btn.label}</span>
                    <span class="nav-badge ${hasBadge ? 'visible' : ''}"></span>
                </button>`;
        }).join('');

        // Prepend a Register button for guest sessions
        const guestButton = accountManager.isGuest
            ? `<button class="nav-btn nav-btn-register" data-nav="register" title="Create a free account to save your progress">
                   <span class="nav-icon">💾</span>
                   <span class="nav-label">Register</span>
               </button>`
            : '';

        return guestButton + standardButtons;
    }

    /**
     * Attach click listeners. Call after the HTML is in the DOM.
     * Also subscribes to GUEST_REGISTERED so the Register button removes itself
     * from the DOM immediately when the guest converts to a permanent account,
     * without needing a full screen re-render.
     * @param {HTMLElement} container - The screen's root container element
     */
    attach(container) {
        this._container = container;
        container.querySelectorAll('.main-nav .nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this._handleClick(btn.dataset.nav);
            });
        });

        // When guest successfully registers, remove the Register button from DOM.
        // Uses a one-shot guard so it's safe even if eventBus lacks off().
        let _registered = false;
        const onRegistered = () => {
            if (_registered) return;
            _registered = true;
            const registerBtn = container.querySelector('.nav-btn[data-nav="register"]');
            if (registerBtn) registerBtn.remove();
        };
        eventBus.on('GUEST_REGISTERED', onRegistered);
    }

    /**
     * Update character reference and refresh badge visibility.
     * Call whenever inventory, stat points, or skill points change.
     * @param {Object} [character] - Updated character (optional, uses existing if omitted)
     */
    update(character) {
        if (character) this.character = character;
        if (!this._container) return;

        MainNavButtons.forEach(btn => {
            const hasBadge = this._checkBadge(btn.badge);
            const badgeEl = this._container.querySelector(
                `.nav-btn[data-nav="${btn.id}"] .nav-badge`
            );
            if (badgeEl) {
                badgeEl.classList.toggle('visible', hasBadge);
            }
        });
    }

    // ============================================
    // PRIVATE
    // ============================================

    /**
     * Dispatch nav click to the appropriate callback
     * @param {string} navId
     */
    _handleClick(navId) {
        switch (navId) {
            case 'register':
                // Signal main.js to show the guest registration modal
                eventBus.emit('GUEST_REGISTER_OPEN', {});
                break;
            case 'stats':
                this.callbacks.onStats?.();
                break;
            case 'items':
                if (this.character?.newLootFlag) {
                    this.character.newLootFlag = false;
                    this.update();
                }
                this.callbacks.onItemsOpen?.();
                this.callbacks.onItems?.();
                break;
            case 'skills':
                this.callbacks.onSkills?.();
                break;
            case 'map':
                this.callbacks.onMap?.();
                break;
            case 'menu':
                this.callbacks.onMenu?.();
                break;
        }
    }

    /**
     * Determine whether a badge should be shown for a given badge key
     * @param {string|null} badgeKey
     * @returns {boolean}
     */
    _checkBadge(badgeKey) {
        if (!badgeKey || !this.character) return false;
        switch (badgeKey) {
            case 'unspentStatPoints':
                return (this.character.unspentStatPoints || 0) > 0;
            case 'unspentSkillPoints':
                return (this.character.unspentSkillPoints || 0) > 0;
            case 'newLootFlag':
                return this.character.newLootFlag || false;
            default:
                return false;
        }
    }
}

export default MainNavBar;
