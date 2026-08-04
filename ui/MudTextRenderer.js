/**
 * @file MudTextRenderer.js
 * @description Shared MUD-style text feed renderer used by TownScreen and HousingScreen.
 *              Handles entry creation, typewriter animation, scroll management, and
 *              user display preferences (typewriter toggle, font size).
 *
 * @usage
 *   import { MudTextRenderer } from './MudTextRenderer.js';
 *
 *   // In screen constructor, after feed element exists in DOM:
 *   this.mudRenderer = new MudTextRenderer(feedEl, {
 *       maxEntries:  100,
 *       scrollBtnEl: document.querySelector('#scrollToBottom'),
 *   });
 *
 *   // Add an entry:
 *   this.mudRenderer.add('You enter the market square.', 'narration');
 *   this.mudRenderer.add(npc.greeting, 'npc', { speaker: npc.name });
 *
 *   // Render settings panel into a toolbar element:
 *   this.mudRenderer.renderSettingsPanel(toolbarEl);
 *
 *   // Cleanup on screen unmount:
 *   this.mudRenderer.destroy();
 *
 * @dependencies
 *   - config/mudConfig.js  (TextEntryTypes, DisplayPrefsDefaults)
 *
 * @version 1.0.0
 * @changelog
 *   - v1.0.0 (2026-03-07): Initial implementation. Unified renderer replacing separate
 *                          TownScreen.addTextEntry() and HousingScreen._addTextEntry().
 *                          Includes typewriter queue, scroll management, and
 *                          DisplayPrefsManager for localStorage-backed user preferences.
 */

import { DisplayPrefsDefaults, TextEntryTypes } from '../config/mudConfig.js';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const FONT_SIZE_MAP = {
    small:  '12px',
    normal: '14px',
    large:  '16px',
};

const SCROLL_THRESHOLD = 50;   // px from bottom before "scrolled up" triggers
const SCROLL_HIDE_THRESHOLD = 100; // px from bottom before scroll button shows

// ─────────────────────────────────────────────────────────────────────────────
// DISPLAY PREFS MANAGER
// Lightweight static helper — no separate file needed.
// Loads/saves user display preferences from localStorage.
// ─────────────────────────────────────────────────────────────────────────────

const DisplayPrefsManager = {
    STORAGE_KEY: 'hexrpg_display_prefs',

    load() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            return { ...DisplayPrefsDefaults, ...(stored ? JSON.parse(stored) : {}) };
        } catch {
            return { ...DisplayPrefsDefaults };
        }
    },

    save(prefs) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(prefs));
        } catch (e) {
            console.warn('[MudTextRenderer] Could not save display prefs:', e);
        }
    },

    /**
     * Apply prefs to a feed element via CSS custom property.
     * @param {Object} prefs
     * @param {HTMLElement} feedEl
     */
    apply(prefs, feedEl) {
        const size = FONT_SIZE_MAP[prefs.fontSize] || FONT_SIZE_MAP.normal;
        feedEl.style.setProperty('--mud-font-size', size);
    },
};

// ─────────────────────────────────────────────────────────────────────────────
// MUD TEXT RENDERER
// ─────────────────────────────────────────────────────────────────────────────

export class MudTextRenderer {
    /**
     * @param {HTMLElement} feedEl       - The scrollable feed container element
     * @param {Object}      options
     * @param {number}      [options.maxEntries=100]  - Max entries before trimming oldest
     * @param {HTMLElement} [options.scrollBtnEl]     - Optional scroll-to-bottom button
     * @param {Function}    [options.onScroll]        - Callback(isUserScrolling: bool)
     */
    constructor(feedEl, options = {}) {
        if (!feedEl) {
            console.error('[MudTextRenderer] feedEl is required');
            return;
        }

        this.feedEl      = feedEl;
        this.maxEntries  = options.maxEntries ?? 100;
        this.scrollBtnEl = options.scrollBtnEl ?? null;
        this.onScroll    = options.onScroll ?? null;

        // Scroll state
        this.isUserScrolling = false;

        // Typewriter state
        this._twQueue      = [];     // { el, fullHtml }
        this._twBusy       = false;
        this._twJobId      = 0;      // increment to cancel in-progress job

        // Load and apply user preferences
        this.prefs = DisplayPrefsManager.load();
        DisplayPrefsManager.apply(this.prefs, this.feedEl);

        // Bind scroll tracking
        this._boundScrollHandler = this._onScroll.bind(this);
        this.feedEl.addEventListener('scroll', this._boundScrollHandler, { passive: true });

        if (this.scrollBtnEl) {
            this._boundScrollBtnHandler = () => {
                this.isUserScrolling = false;
                this.scrollToBottom();
                this._updateScrollButton();
            };
            this.scrollBtnEl.addEventListener('click', this._boundScrollBtnHandler);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PUBLIC — ENTRY MANAGEMENT
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Add a text entry to the feed.
     * @param {string} text
     * @param {string} type   - One of TextEntryTypes values (e.g. 'narration', 'npc')
     * @param {Object} [options]
     * @param {string} [options.speaker]  - NPC speaker name (renders name + quoted text)
     */
    add(text, type = TextEntryTypes.NARRATION, options = {}) {
        if (!this.feedEl) return;
        if (text === undefined || text === null) return;

        const entry = document.createElement('div');
        entry.className = `mud-entry ${type}`;

        // Build inner HTML based on type
        let innerHtml;
        if (type === TextEntryTypes.NPC && options.speaker) {
            innerHtml = `<div class="mud-entry-speaker">${options.speaker}</div>` +
                        `<div class="mud-entry-speech">"${text}"</div>`;
        } else if (type === TextEntryTypes.SYSTEM) {
            innerHtml = `<em>${text}</em>`;
        } else {
            innerHtml = text;
        }

        this.feedEl.appendChild(entry);
        this._trimEntries();

        // Important entries always render instantly (bypass typewriter)
        const useTypewriter = this.prefs.typewriterEnabled &&
                              type !== TextEntryTypes.IMPORTANT;

        if (useTypewriter) {
            // Start with empty, typewriter will fill it
            entry.innerHTML = '';
            this._enqueueTypewrite(entry, innerHtml);
        } else {
            entry.innerHTML = innerHtml;
            if (!this.isUserScrolling) this.scrollToBottom();
        }

        this._updateScrollButton();
    }

    /**
     * Remove all entries from the feed and clear the typewriter queue.
     */
    clear() {
        this._clearTypewriterQueue();
        if (this.feedEl) this.feedEl.innerHTML = '';
    }

    /**
     * Force-scroll the feed to the bottom.
     */
    scrollToBottom() {
        if (this.feedEl) {
            this.feedEl.scrollTop = this.feedEl.scrollHeight;
        }
    }

    /**
     * Re-apply updated preferences (call after user changes a setting).
     * @param {Object} newPrefs - Partial or full prefs object to merge
     */
    applyPrefs(newPrefs) {
        this.prefs = { ...this.prefs, ...newPrefs };
        DisplayPrefsManager.save(this.prefs);
        DisplayPrefsManager.apply(this.prefs, this.feedEl);

        // If typewriter just turned off, drain the queue instantly
        if (!this.prefs.typewriterEnabled) {
            this._clearTypewriterQueue();
        }
    }

    /**
     * Remove all event listeners. Call when the screen unmounts.
     */
    destroy() {
        this._clearTypewriterQueue();
        if (this.feedEl) {
            this.feedEl.removeEventListener('scroll', this._boundScrollHandler);
        }
        if (this.scrollBtnEl && this._boundScrollBtnHandler) {
            this.scrollBtnEl.removeEventListener('click', this._boundScrollBtnHandler);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PUBLIC — SETTINGS PANEL
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Inject the display settings panel into containerEl.
     * Can be called from TownScreen or HousingScreen — code lives here once.
     * @param {HTMLElement} containerEl  - Element to inject the panel into
     */
    renderSettingsPanel(containerEl) {
        if (!containerEl) return;

        const panel = document.createElement('div');
        panel.className = 'mud-settings-panel';
        panel.id = 'mudSettingsPanel';
        panel.style.display = 'none';
        panel.innerHTML = `
            <div class="mud-settings-row">
                <span class="mud-settings-label">Typewriter effect</span>
                <label class="mud-toggle">
                    <input type="checkbox" id="mudToggleTypewriter"
                        ${this.prefs.typewriterEnabled ? 'checked' : ''}>
                    <span class="mud-toggle-slider"></span>
                </label>
            </div>
            <div class="mud-settings-row">
                <span class="mud-settings-label">Font size</span>
                <div class="mud-font-size-group">
                    <button class="mud-font-btn ${this.prefs.fontSize === 'small'  ? 'active' : ''}"
                        data-size="small">Small</button>
                    <button class="mud-font-btn ${this.prefs.fontSize === 'normal' ? 'active' : ''}"
                        data-size="normal">Normal</button>
                    <button class="mud-font-btn ${this.prefs.fontSize === 'large'  ? 'active' : ''}"
                        data-size="large">Large</button>
                </div>
            </div>
        `;

        containerEl.appendChild(panel);

        // Typewriter toggle
        panel.querySelector('#mudToggleTypewriter').addEventListener('change', (e) => {
            this.applyPrefs({ typewriterEnabled: e.target.checked });
        });

        // Font size buttons
        panel.querySelectorAll('.mud-font-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                panel.querySelectorAll('.mud-font-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.applyPrefs({ fontSize: btn.dataset.size });
            });
        });

        // Store reference for gear button toggling
        this._settingsPanel = panel;
    }

    /**
     * Toggle the settings panel visibility.
     * Called by the ⚙ gear button in each screen's toolbar.
     */
    toggleSettingsPanel() {
        if (!this._settingsPanel) return;
        const isVisible = this._settingsPanel.style.display !== 'none';
        this._settingsPanel.style.display = isVisible ? 'none' : 'block';
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIVATE — SCROLL
    // ─────────────────────────────────────────────────────────────────────────

    _onScroll() {
        if (!this.feedEl) return;
        const isAtBottom =
            this.feedEl.scrollHeight - this.feedEl.scrollTop - this.feedEl.clientHeight
            < SCROLL_THRESHOLD;
        this.isUserScrolling = !isAtBottom;
        this._updateScrollButton();
        if (this.onScroll) this.onScroll(this.isUserScrolling);
    }

    _updateScrollButton() {
        if (!this.scrollBtnEl || !this.feedEl) return;
        const scrolledUp =
            this.feedEl.scrollHeight - this.feedEl.scrollTop - this.feedEl.clientHeight
            > SCROLL_HIDE_THRESHOLD;
        this.scrollBtnEl.classList.toggle('visible', scrolledUp);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIVATE — ENTRY TRIMMING
    // ─────────────────────────────────────────────────────────────────────────

    _trimEntries() {
        while (this.feedEl.children.length > this.maxEntries) {
            this.feedEl.removeChild(this.feedEl.firstChild);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIVATE — TYPEWRITER QUEUE
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Push an entry onto the typewriter queue and drain if idle.
     */
    _enqueueTypewrite(el, fullHtml) {
        this._twQueue.push({ el, fullHtml });
        this._drainQueue();
    }

    /**
     * Start processing the next queued entry if not already busy.
     */
    _drainQueue() {
        if (this._twBusy || this._twQueue.length === 0) return;
        const { el, fullHtml } = this._twQueue.shift();
        this._twBusy = true;
        const jobId = ++this._twJobId;

        this._typewriteElement(el, fullHtml, jobId, () => {
            this._twBusy = false;
            this._drainQueue();
        });
    }

    /**
     * Type out plaintext content of an HTML string character by character.
     * Uses a temporary div to extract text nodes while preserving any
     * inner HTML structure (e.g. speaker + speech divs in NPC entries).
     *
     * Strategy: type the full innerHTML char-by-char via a string cursor.
     * HTML tags are skipped instantly (not typed), only visible text chars are timed.
     */
    _typewriteElement(el, fullHtml, jobId, onDone) {
        const speed = this.prefs.typewriterSpeed ?? DisplayPrefsDefaults.typewriterSpeed;
        let i = 0;
        const len = fullHtml.length;
        let inTag = false;

        const tick = () => {
            // Cancel if a newer job has started
            if (jobId !== this._twJobId) return;

            if (i >= len) {
                el.innerHTML = fullHtml; // ensure final state is exact
                if (!this.isUserScrolling) this.scrollToBottom();
                if (onDone) onDone();
                return;
            }

            // Advance through HTML tags instantly
            while (i < len) {
                if (fullHtml[i] === '<') inTag = true;
                if (inTag) {
                    i++;
                    if (fullHtml[i - 1] === '>') { inTag = false; }
                    continue;
                }
                // Visible character — render up to here and pause
                i++;
                break;
            }

            el.innerHTML = fullHtml.substring(0, i);
            if (!this.isUserScrolling) this.scrollToBottom();
            setTimeout(tick, speed);
        };

        tick();
    }

    /**
     * Flush the queue and cancel any in-progress typewriter job.
     * Leaves entries in the DOM but with empty content — caller should
     * clear the feed or let the entries be replaced.
     */
    _clearTypewriterQueue() {
        this._twQueue.length = 0;
        this._twJobId++;       // invalidates any running tick()
        this._twBusy = false;
    }
}

export default MudTextRenderer;
