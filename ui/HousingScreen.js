/**
 * @file HousingScreen.js
 * @description Full-screen player housing experience with MUD-style narrative text,
 *              room-based navigation (TownUI pattern), NPC staff presence, timed
 *              upgrades, and the household staff system.
 *
 * @location ui/HousingScreen.js
 * @usage Instantiated by main.js when player navigates to housing from town.
 * @dependencies
 *   - config/housingConfig.js
 *   - config/housingStaffConfig.js
 *   - systems/HousingSystem.js
 *   - systems/HousingStaffSystem.js
 *   - systems/EventBus.js
 *   - ui/HousingStaffPanel.js
 *   - ui/MainNavBar.js
 *   - ui/SkillTreeUI.js
 *   - ui/WorldMapUI.js
 *   - ui/InventoryUI.js
 *   - ui/StatsUI.js
 *   - ui/ForgeUI.js
 *
 * @version 2.1.0
 * @changelog
 *   - v2.1.0 (2026-03-07): Replaced _addTextEntry() with MudTextRenderer delegation.
 *                          Removed local TextTypes const; imports TextEntryTypes from mudConfig.
 *                          Added scroll-to-bottom button and ⚙ settings panel to housing feed.
 *                          MudTextRenderer provides typewriter and font-size user prefs.
 *   - v2.0.0 (2026-03-06): Added Help & FAQ and Release Notes to ☰ Menu. Imports
 *                          DocViewerUtils. Added _showDocModal(). Menu now has divider sections.
 *   - v1.9.0 (2026-03-05): Major UI overhaul — TownUI-style room navigation pattern.
 *                          Removed structure cards grid; rooms now live in rooms nav bar
 *                          (mud-exits-bar). Location header carries all room identity.
 *                          Room card shows ONLY description + buff chips + upgrade timer.
 *                          Added NPC presence strip + Ask About inline topic picker.
 *                          Added Staff button with hired-count badge + HousingStaffPanel.
 *                          Timed upgrade system via HousingStaffSystem.startUpgrade().
 *                          Staff ambient events (20% weight) + lore hook auto-fire.
 *                          Payroll + pending upgrade completion on screen entry.
 *                          EventBus listeners for STAFF_WAGES_PAID, STAFF_TRUST_INCREASED.
 *   - v1.8.3 (2026-03-05): Replaced housing-specific action bar markup with shared
 *                          mud-btn/mud-action-bar classes matching TownScreen.
 *   - v1.8.2 (2026-03-05): Fixed nav bar styling mismatch vs TownScreen.
 *   - v1.8.1 (2026-03-05): Fixed main nav floating above bottom of screen.
 *   - v1.8.0 (2026-03-05): Extracted nav bar to shared MainNavBar component.
 *   - v1.7.2 (2026-03-05): Added Market Square button to both action bar states.
 *   - v1.7.1 (2026-03-05): Fixed forge material selection.
 *   - v1.7.0 (2026-03-05): Added ForgeUI integration.
 *   - v1.6.0 (2026-03-05): Added full modal system.
 *   - v1.5.0 (2026-03-05): Replaced custom nav with standard main-nav bar.
 *   - v1.4.0 (2026-01-27): Structure cards show buff labels and upgrade indicators.
 *   - v1.3.0 (2026-01-27): Fixed upgradeStructure() missing character parameter.
 *   - v1.2.0 (2026-01-27): Fixed imports to match housingConfig.js exports.
 *   - v1.0.0 (2026-01-26): Initial implementation.
 */

import { eventBus, GameEvents }       from '../systems/EventBus.js';
import { housingSystem }              from '../systems/HousingSystem.js';
import { housingStaffSystem }         from '../systems/HousingStaffSystem.js';
import { HousingStaffPanel }          from './HousingStaffPanel.js';
import { MainNavBar }                 from './MainNavBar.js';
import { SkillTreeUI }                from './SkillTreeUI.js';
import { WorldMapUI }                 from './WorldMapUI.js';
import { InventoryUI }                from './InventoryUI.js';
import { StatsUI }                    from './StatsUI.js';
import { ForgeUI }                    from './ForgeUI.js';
import {
    HousingStructures,
    HousingMaterials,
    HousingSettings,
    BuffLabels,
    BuffFormats,
    HomeTiers,
    HomeAmbientTexts,
    getStructure,
    getMaterial,
    getNarrativeTier,
    getHomeTier,
    getRandomAmbientText,
    getRandomHomeAmbientText,
} from '../config/housingConfig.js';
import {
    StaffSettings,
    StaffBuffLabels,
    getStaffDefinition,
    getUpgradeDuration,
} from '../config/housingStaffConfig.js';
import { fetchDoc, renderMarkdown } from '../utils/DocViewerUtils.js';
import { MudTextRenderer } from './MudTextRenderer.js';
import { MudSettings, TextEntryTypes } from '../config/mudConfig.js';

// ─────────────────────────────────────────────────────────────
// Text entry types for the MUD feed
// ─────────────────────────────────────────────────────────────
// TextTypes replaced by TextEntryTypes from mudConfig.js (v2.1.0)

// ─────────────────────────────────────────────────────────────
// Room-specific action definitions
// ─────────────────────────────────────────────────────────────
const ROOM_ACTIONS = {
    hearth:   { id: 'rest',    label: 'Rest',     icon: '💤' },
    training: { id: 'train',   label: 'Train',     icon: '🏋️' },
    armory:   { id: 'reforge', label: 'Reforge',   icon: '🔨' },
    garden:   { id: 'harvest', label: 'Harvest',   icon: '🌾' },
    shrine:   { id: 'pray',    label: 'Pray',      icon: '🙏' },
    trophy:   { id: 'display', label: 'Trophies',  icon: '🎖️' },
};

export class HousingScreen {
    constructor(container, character, callbacks = {}) {
        this.container  = container;
        this.character  = character;
        this.callbacks  = callbacks;

        // Navigation state
        this.selectedStructure   = null;   // null = home overview
        this.currentStaffPresent = null;   // staffId currently shown in NPC strip

        // MUD feed
        this.textFeed    = [];
        this.ambientTimer = null;

        // Timers
        this._npcPresenceTimer = null;
        this._upgradeTimers    = {};  // keyed by structureId
        this._unsubscribers    = [];

        // Sub-components
        this._navBar      = null;
        this._staffPanel  = null;
        this._skillTreeUI = null;
        this._worldMapUI  = null;
        this._inventoryUI = null;
        this._statsUI     = null;
        this._forgeUI     = null;

        // Init core systems
        housingSystem.init(character);
        housingStaffSystem.init(character);

        // Process payroll + complete any finished timed upgrades before render
        housingStaffSystem.onHousingEntered();
        this._pendingCompletionMessages = housingStaffSystem.checkPendingUpgrades(character);

        this._init();
    }

    // ═══════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════

    _init() {
        this.container.innerHTML = '';
        this.container.classList.add('housing-screen');

        this._navBar = new MainNavBar(this.character, {
            onStats:  () => this._showStatsModal(),
            onItems:  () => this._showInventoryModal(),
            onSkills: () => this._showSkillsModal(),
            onMap:    () => this._showMapModal(),
            onMenu:   () => this._showMenuModal(),
        });

        this.container.innerHTML = `
            <div class="housing-view" style="padding-bottom:0;">

                <!-- Location Header (TownUI style) -->
                <header class="mud-location-header" id="housing-location-header"></header>

                <!-- Room Card: desc + buffs + timer. NO duplicate name/level/stage. -->
                <div class="housing-room-card" id="housing-room-card" style="display:none;">
                    <div class="housing-room-desc" id="housing-room-desc"></div>
                    <div class="housing-room-buffs" id="housing-room-buffs"></div>
                    <div class="housing-upgrade-timer" id="housing-upgrade-timer" style="display:none;">
                        <div class="upgrade-timer-header">
                            <div class="upgrade-timer-label" id="housing-timer-label">🔨 Upgrading…</div>
                            <div class="upgrade-timer-countdown" id="housing-timer-countdown">00:00</div>
                        </div>
                        <div class="upgrade-progress-track">
                            <div class="upgrade-progress-fill" id="housing-timer-fill" style="width:0%"></div>
                        </div>
                        <div class="upgrade-tier-note" id="housing-timer-note"></div>
                    </div>
                </div>

                <!-- MUD Text Feed -->
                <div class="housing-feed-toolbar" id="housingFeedToolbar">
                    <button class="mud-settings-btn" id="housingMudSettingsToggle" title="Text display settings">⚙</button>
                </div>
                <div style="position:relative; flex:1; min-height:0; display:flex; flex-direction:column;">
                    <div class="housing-text-feed" id="housing-text-feed"
                         style="flex:1; overflow-y:auto; min-height:0;"></div>
                    <button class="housing-scroll-btn" id="housingScrollToBottom">↓</button>
                </div>

                <!-- Bottom section -->
                <div class="bottom-nav-container">
                    <!-- Ask-About Topic Overlay — expands above the NPC strip -->
                    <div class="housing-ask-overlay" id="housing-ask-overlay" style="display:none;">
                        <div class="ask-topic-header" id="housing-ask-header">Ask about…</div>
                        <div class="ask-topic-list" id="housing-ask-list"></div>
                    </div>

                    <!-- NPC Presence Strip — sits directly above action bar -->
                    <div class="housing-npc-strip" id="housing-npc-strip" style="display:none;">
                        <div class="npc-avatar" id="housing-npc-avatar">🧑</div>
                        <div class="npc-presence-text" id="housing-npc-text"></div>
                        <button class="npc-ask-btn" id="housing-ask-btn">Ask About</button>
                    </div>

                    <!-- HERE: contextual action buttons -->
                    <div id="housing-action-bar"></div>

                    <!-- GO TO: rooms nav bar (replaces cards grid) -->
                    <div class="mud-exits-bar" id="housing-rooms-bar">
                        <div class="mud-exits-label">Rooms</div>
                        <div class="mud-exits" id="housing-rooms-nav"></div>
                    </div>

                    <div class="nav-divider"></div>

                    <nav class="main-nav" id="housingMainNav">
                        ${this._navBar.buildHTML()}
                    </nav>
                </div>
            </div>

            <!-- Upgrade Modal -->
            <div class="housing-modal-overlay" id="housing-upgrade-modal">
                <div class="housing-modal-content">
                    <div class="housing-modal-header">
                        <h2 id="housing-upgrade-title">⬆️ Upgrade</h2>
                        <button class="housing-modal-close" id="housing-upgrade-close">&times;</button>
                    </div>
                    <div class="housing-modal-body" id="housing-upgrade-body"></div>
                </div>
            </div>

            <!-- Materials Modal -->
            <div class="housing-modal-overlay" id="housing-materials-modal">
                <div class="housing-modal-content">
                    <div class="housing-modal-header">
                        <h2>📦 Materials</h2>
                        <button class="housing-modal-close" id="housing-materials-close">&times;</button>
                    </div>
                    <div class="housing-modal-body" id="housing-materials-list"></div>
                </div>
            </div>

            <!-- Staff Modal -->
            <div class="housing-modal-overlay" id="housing-staff-modal">
                <div class="housing-modal-content">
                    <div class="housing-modal-header">
                        <h2 id="housing-staff-title">👥 Household Staff</h2>
                        <button class="housing-modal-close" id="housing-staff-close">&times;</button>
                    </div>
                    <div class="housing-modal-body" id="housing-staff-body"></div>
                </div>
            </div>

            <!-- Nav Modal (Stats / Items / Skills / Map / Menu) -->
            <div class="town-modal" id="housingNavModal" style="display:none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 id="housingNavModalTitle">Panel</h2>
                        <button class="modal-close" id="housingNavModalClose">&times;</button>
                    </div>
                    <div class="modal-body" id="housingNavModalBody"></div>
                </div>
            </div>
        `;

        this._renderLocationHeader();
        this._renderRoomsNav();
        this._renderActionBar();

        // Instantiate MUD renderer FIRST — _showHomeOverview() calls _addTextEntry()
        const feedEl    = this.container.querySelector('#housing-text-feed');
        const scrollBtn = this.container.querySelector('#housingScrollToBottom');
        const toolbar   = this.container.querySelector('#housingFeedToolbar');
        this.mudRenderer = new MudTextRenderer(feedEl, {
            maxEntries:  MudSettings.maxTextEntries,
            scrollBtnEl: scrollBtn,
        });
        this.mudRenderer.renderSettingsPanel(toolbar);
        this.container.querySelector('#housingMudSettingsToggle')?.addEventListener('click', () => {
            const btn = this.container.querySelector('#housingMudSettingsToggle');
            this.mudRenderer.toggleSettingsPanel();
            btn?.classList.toggle('active');
        });

        this._showHomeOverview();
        this._announceCompletedUpgrades();
        this._startUpgradeTimers();
        this._setupEventHandlers();
        this._setupEventBusListeners();
        this._startAmbientEvents();

        // Tutorial system — notify TutorialManager that housing screen is ready
        eventBus.emit(GameEvents.HOUSING_SCREEN_READY, {});
    }

    // ═══════════════════════════════════════════════════════════
    // LOCATION HEADER
    // ═══════════════════════════════════════════════════════════

    _renderLocationHeader() {
        const header = this.container.querySelector('#housing-location-header');
        if (!header) return;

        const gold       = (this.character.gold || 0).toLocaleString();
        const matCount   = this._getMaterialTypeCount();
        const totalLevels = this._getTotalLevels();
        const homeTier   = getHomeTier(totalLevels / Object.keys(HousingStructures).length);
        const hiredCount = housingStaffSystem.getHiredStaffIds(this.character).length;

        if (!this.selectedStructure) {
            header.innerHTML = `
                <div class="housing-location-icon">🏠</div>
                <div class="housing-location-info">
                    <div class="housing-location-name">Your Home</div>
                    <div class="housing-location-subtitle">
                        Combined Lv.${totalLevels} · ${homeTier.name}
                        ${hiredCount > 0 ? `· <span class="staff-count-note">${hiredCount} staff</span>` : ''}
                    </div>
                </div>
                <div class="header-resources">
                    <div class="resource-chip" id="housing-gold-chip">💰 ${gold}</div>
                    <div class="resource-chip clickable" id="housing-mat-chip">📦 ${matCount}</div>
                </div>`;
        } else {
            const structure = getStructure(this.selectedStructure);
            const level     = this._getLevel(this.selectedStructure);
            const narrative = getNarrativeTier(this.selectedStructure, level);
            const pending   = housingStaffSystem.getUpgradeProgress(this.character, this.selectedStructure);

            header.innerHTML = `
                <div class="housing-location-icon">${structure.icon}</div>
                <div class="housing-location-info">
                    <div class="mud-location-breadcrumb">Your Home</div>
                    <div class="housing-location-name">${structure.name}</div>
                    <div class="housing-location-subtitle">
                        ${narrative?.stageName || 'Empty'} · Lv.${level}
                        ${pending.inProgress
                            ? ' · <span class="upgrading-note">⏳ Upgrading…</span>'
                            : ''}
                    </div>
                </div>
                <div class="header-resources">
                    <div class="resource-chip" id="housing-gold-chip">💰 ${gold}</div>
                    <div class="resource-chip clickable" id="housing-mat-chip">📦 ${matCount}</div>
                </div>`;
        }

        this.container.querySelector('#housing-mat-chip')
            ?.addEventListener('click', () => this._openMaterialsModal());
    }

    // ═══════════════════════════════════════════════════════════
    // ROOM CARD  (desc + buffs + timer only — no header duplication)
    // ═══════════════════════════════════════════════════════════

    _renderRoomCard() {
        const card = this.container.querySelector('#housing-room-card');
        if (!card) return;

        if (!this.selectedStructure) {
            card.style.display = 'none';
            return;
        }

        const structure = getStructure(this.selectedStructure);
        const level     = this._getLevel(this.selectedStructure);
        const narrative = getNarrativeTier(this.selectedStructure, level);
        const pending   = housingStaffSystem.getUpgradeProgress(this.character, this.selectedStructure);

        // Description only
        const descEl = this.container.querySelector('#housing-room-desc');
        if (descEl) descEl.textContent = narrative?.description || structure.description || '';

        // Buff chips: structure (green) + staff (purple)
        const buffsEl = this.container.querySelector('#housing-room-buffs');
        if (buffsEl) {
            const structureChips = Object.entries(structure.baseBuff).map(([key, base]) => {
                const val   = housingSystem.calculateBuff(base, level);
                const label = BuffLabels[key] || key;
                return `<span class="housing-buff-chip">${label}: +${this._formatBuffValue(key, val)}</span>`;
            }).join('');

            const staffBuffs = housingStaffSystem.getStaffBuffs(this.character);
            const staffChips = Object.entries(staffBuffs).map(([key, val]) => {
                const label = StaffBuffLabels[key] || BuffLabels[key] || key;
                const hired = housingStaffSystem.getHiredStaffIds(this.character);
                const who   = hired.find(id => getStaffDefinition(id).buffs[key]);
                const name  = who ? getStaffDefinition(who).name.split(' ')[0] : 'Staff';
                return `<span class="housing-buff-chip staff-buff">${label}: +${val} (${name})</span>`;
            }).join('');

            buffsEl.innerHTML = structureChips + staffChips;
        }

        // Upgrade timer
        const timerEl = this.container.querySelector('#housing-upgrade-timer');
        if (timerEl) {
            if (pending.inProgress) {
                timerEl.style.display = 'block';
                this._updateTimerDisplay(this.selectedStructure, pending);
            } else {
                timerEl.style.display = 'none';
            }
        }

        card.style.display = 'block';
    }

    // ═══════════════════════════════════════════════════════════
    // ROOMS NAV BAR
    // ═══════════════════════════════════════════════════════════

    _renderRoomsNav() {
        const nav = this.container.querySelector('#housing-rooms-nav');
        if (!nav) return;

        nav.innerHTML = Object.entries(HousingStructures).map(([id, structure]) => {
            const level   = this._getLevel(id);
            const active  = this.selectedStructure === id ? 'active' : '';
            const pending = housingStaffSystem.getUpgradeProgress(this.character, id);
            const dot     = pending.inProgress
                ? '<span class="room-timer-dot" title="Upgrade in progress"></span>'
                : '';
            return `
                <button class="room-nav-btn ${active}" data-room-id="${id}">
                    ${structure.icon} ${structure.name}
                    <span class="room-nav-level">lv.${level}</span>${dot}
                </button>`;
        }).join('');

        nav.querySelectorAll('.room-nav-btn').forEach(btn => {
            btn.addEventListener('click', () => this._selectStructure(btn.dataset.roomId));
        });
    }

    _selectStructure(structureId) {
        this.selectedStructure = structureId;
        this._renderLocationHeader();
        this._renderRoomCard();
        this._renderRoomsNav();
        this._renderActionBar();
        this._navigateToStructure(structureId);
        this._renderNpcStrip(null); // clear NPC strip on room change
    }

    // ═══════════════════════════════════════════════════════════
    // ACTION BAR
    // ═══════════════════════════════════════════════════════════

    _renderActionBar() {
        const bar = this.container.querySelector('#housing-action-bar');
        if (!bar) return;

        const hiredCount = housingStaffSystem.getHiredStaffIds(this.character).length;
        const badge      = hiredCount > 0 ? `<span class="mud-btn-badge">${hiredCount}</span>` : '';
        const staffBtn   = `
            <button class="mud-btn" data-action="staff">
                <span class="mud-btn-icon">👥</span>
                <span class="mud-btn-label">Staff${badge}</span>
            </button>`;

        if (!this.selectedStructure) {
            bar.innerHTML = `
                <div class="mud-action-bar">
                    <div class="mud-action-bar-label">Your Home</div>
                    <div class="mud-actions">
                        <button class="mud-btn" data-action="look">
                            <span class="mud-btn-icon">👁️</span>
                            <span class="mud-btn-label">Look Around</span>
                        </button>
                        <button class="mud-btn" data-action="town">
                            <span class="mud-btn-icon">🏪</span>
                            <span class="mud-btn-label">Market Square</span>
                        </button>
                        ${staffBtn}
                    </div>
                </div>`;
        } else {
            const structure  = getStructure(this.selectedStructure);
            const level      = this._getLevel(this.selectedStructure);
            const narrative  = getNarrativeTier(this.selectedStructure, level);
            const barLabel   = narrative?.stageName
                ? `${structure.name} — ${narrative.stageName}`
                : structure.name;

            const roomAction = ROOM_ACTIONS[this.selectedStructure];
            const specialBtn = roomAction && level > 0 ? `
                <button class="mud-btn" data-action="${roomAction.id}">
                    <span class="mud-btn-icon">${roomAction.icon}</span>
                    <span class="mud-btn-label">${roomAction.label}</span>
                </button>` : '';

            const pending = housingStaffSystem.getUpgradeProgress(this.character, this.selectedStructure);
            const upgradeBtn = pending.inProgress
                ? `<button class="mud-btn" disabled style="opacity:0.5;">
                       <span class="mud-btn-icon">⏳</span>
                       <span class="mud-btn-label">Upgrading…</span>
                   </button>`
                : `<button class="mud-btn" data-action="upgrade">
                       <span class="mud-btn-icon">⬆️</span>
                       <span class="mud-btn-label">Upgrade</span>
                   </button>`;

            bar.innerHTML = `
                <div class="mud-action-bar">
                    <div class="mud-action-bar-label">${barLabel}</div>
                    <div class="mud-actions">
                        <button class="mud-btn" data-action="look">
                            <span class="mud-btn-icon">👁️</span>
                            <span class="mud-btn-label">Look</span>
                        </button>
                        <button class="mud-btn" data-action="town">
                            <span class="mud-btn-icon">🏪</span>
                            <span class="mud-btn-label">Market Square</span>
                        </button>
                        ${upgradeBtn}
                        ${specialBtn}
                        ${staffBtn}
                    </div>
                </div>`;
        }

        bar.querySelectorAll('.mud-btn[data-action]').forEach(btn => {
            btn.addEventListener('click', () => this._handleAction(btn.dataset.action));
        });
    }

    _handleAction(actionId) {
        switch (actionId) {
            case 'look':    this._lookAtStructure(); break;
            case 'town':    if (this.callbacks.onNavigate) this.callbacks.onNavigate('town'); break;
            case 'upgrade': this._openUpgradeModal(); break;
            case 'staff':   this._openStaffPanel(); break;
            case 'rest':    this._addTextEntry('You rest by the hearth, feeling your strength return.', TextEntryTypes.ACTION); break;
            case 'train':   this._addTextEntry('You spend time practicing your combat forms.', TextEntryTypes.ACTION); break;
            case 'reforge': this._addTextEntry('You examine your equipment, looking for improvements.', TextEntryTypes.ACTION); break;
            case 'harvest': this._addTextEntry('You gather herbs and materials from the garden.', TextEntryTypes.ACTION); break;
            case 'pray':    this._addTextEntry('You kneel in prayer, feeling a sense of peace.', TextEntryTypes.ACTION); break;
            case 'display': this._addTextEntry('You admire your collection of hard-won trophies.', TextEntryTypes.ACTION); break;
        }
    }

    // ═══════════════════════════════════════════════════════════
    // NPC PRESENCE STRIP
    // ═══════════════════════════════════════════════════════════

    _renderNpcStrip(event) {
        const strip = this.container.querySelector('#housing-npc-strip');
        if (!strip) return;

        if (!event) {
            strip.style.display = 'none';
            this.currentStaffPresent = null;
            return;
        }

        this.container.querySelector('#housing-npc-avatar').textContent = event.icon;
        this.container.querySelector('#housing-npc-text').textContent   = event.text;
        this.container.querySelector('#housing-ask-header').textContent =
            `Ask ${event.staffName.split(' ')[0]} about…`;

        strip.style.display      = 'flex';
        this.currentStaffPresent = event.staffId;

        clearTimeout(this._npcPresenceTimer);
        this._npcPresenceTimer = setTimeout(() => {
            strip.style.display = 'none';
            this._closeAskAboutMenu();
            this.currentStaffPresent = null;
        }, StaffSettings.npcPresenceDuration);
    }

    // ═══════════════════════════════════════════════════════════
    // ASK-ABOUT INLINE MENU
    // ═══════════════════════════════════════════════════════════

    _openAskAboutMenu() {
        if (!this.currentStaffPresent) return;
        const overlay    = this.container.querySelector('#housing-ask-overlay');
        const list       = this.container.querySelector('#housing-ask-list');
        if (!overlay || !list) return;

        const staffId   = this.currentStaffPresent;
        const trustTier = housingStaffSystem.getTrustTier(this.character, staffId);
        const topics    = housingStaffSystem.getAvailableTopics(staffId);
        const tierLabel = ['★☆☆', '★★☆', '★★★'][Math.min(2, trustTier)];

        list.innerHTML = topics.map(t => `
            <button class="ask-topic-btn" data-topic="${t.key}">
                ${t.icon} ${t.label}
                <span class="ask-topic-tier">${tierLabel}</span>
            </button>`).join('');

        list.querySelectorAll('.ask-topic-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this._selectTopic(staffId, btn.dataset.topic);
                this._closeAskAboutMenu();
            });
        });

        overlay.style.display = 'block';
    }

    _closeAskAboutMenu() {
        const overlay = this.container.querySelector('#housing-ask-overlay');
        if (overlay) overlay.style.display = 'none';
    }

    _selectTopic(staffId, topicKey) {
        const def      = getStaffDefinition(staffId);
        const response = housingStaffSystem.getDialogueResponse(this.character, staffId, topicKey);
        const topic    = def.dialogueTopics?.[topicKey];
        this._addTextEntry(
            `> You ask ${def.name.split(' ')[0]} about ${topic?.label?.toLowerCase() || topicKey}.`,
            TextEntryTypes.SYSTEM
        );
        this._addTextEntry(`"${response}"`, TextEntryTypes.NPC_DIALOGUE);
        this._checkAndFireLoreHooks();
    }

    // ═══════════════════════════════════════════════════════════
    // STAFF PANEL MODAL
    // ═══════════════════════════════════════════════════════════

    _openStaffPanel() {
        const body   = this.container.querySelector('#housing-staff-body');
        const modal  = this.container.querySelector('#housing-staff-modal');
        const titleEl = this.container.querySelector('#housing-staff-title');
        if (!body || !modal) return;

        const updateTitle = () => {
            const s = housingStaffSystem.getHiredSummary(this.character);
            if (titleEl) titleEl.textContent = `👥 Household Staff — ${s.count}/7 · ${s.dailyTotal}g/day`;
        };
        updateTitle();

        if (this._staffPanel) this._staffPanel.destroy();
        this._staffPanel = new HousingStaffPanel(body, this.character, {
            onStaffChange: () => {
                this._renderActionBar();
                this._renderLocationHeader();
                this._renderRoomCard();
                updateTitle();
            },
            // Close the modal before piping text so it lands in the visible feed.
            // onAddText is called by HousingStaffPanel after a hire or fire.
            onAddText: (text, type) => {
                this._closeStaffPanel();
                this._addTextEntry(text, type);
            },
            // After closing, immediately fire an ambient event for the new hire
            // so the player sees the NPC in the strip right away.
            onHired: (staffId) => {
                this._closeStaffPanel();
                // Short delay lets the modal animate out before the strip appears
                setTimeout(() => this._fireStaffAmbientForced(staffId), 400);
            },
        });
        this._staffPanel.render();
        modal.classList.add('active');
    }

    _closeStaffPanel() {
        const modal = this.container.querySelector('#housing-staff-modal');
        if (modal) modal.classList.remove('active');
    }

    // ═══════════════════════════════════════════════════════════
    // MUD TEXT FEED
    // ═══════════════════════════════════════════════════════════

    _addTextEntry(text, type = TextEntryTypes.NARRATION) {
        if (text === undefined || text === null) return;
        this.textFeed.push({ text, type, timestamp: Date.now() });
        this.mudRenderer?.add(text, type);
    }

    /**
     * Returns tier-scaled entry flavour for the home overview.
     * Bands keyed on totalLevels (6 structures × 100 max = 600 ceiling):
     *   0        → nothing built
     *   1–60     → humble beginnings  (avg 1–10)
     *   61–300   → growing home       (avg 10–50)
     *   301–600  → established estate (avg 50–100)
     *   600      → legendary          (avg 100)
     */
    _getEntryFlavour(totalLevels) {
        if (totalLevels === 0) return [
            'A patch of wild land stretches before you — cleared, but empty.',
            'The air smells of turned earth and possibility. Nothing has been built here yet.',
            'You stand in an open clearing. The foundations of something great wait to be laid.',
        ];
        if (totalLevels <= 60) return [
            'You step through the low doorway and breathe in the smell of fresh timber.',
            'The place is modest, but it is yours. Every rough edge speaks of a beginning.',
            'Sunlight filters through gaps in the walls. There is work still to be done, but it shelters you.',
        ];
        if (totalLevels <= 300) return [
            'You cross the threshold into a home that has begun to take real shape.',
            'The structure feels solid beneath your boots. Each room tells a piece of your story.',
            'There is warmth here now — earned through effort and gold and time.',
        ];
        if (totalLevels < 600) return [
            'You enter a grand estate that speaks of years of hard-won adventure.',
            'The hall echoes with quiet authority. This is a place that commands respect.',
            'Every stone and beam reflects the breadth of your journeys. Few have built so well.',
        ];
        return [
            'You step into a legendary domain — a place that bards already speak of in distant towns.',
            'The estate stands as a monument to everything you have achieved. Nothing more need be built.',
            'A hush falls as you enter. Even the walls seem to acknowledge what you have become.',
        ];
    }

    _showHomeOverview() {
        const totalLevels = this._getTotalLevels();
        const homeTier    = getHomeTier(totalLevels / Object.keys(HousingStructures).length);
        const flavours    = this._getEntryFlavour(totalLevels);
        const flavour     = flavours[Math.floor(Math.random() * flavours.length)];

        this._addTextEntry(`═══ ${homeTier.icon} ${homeTier.name} ═══`, TextEntryTypes.STRUCTURE_NAME);
        this._addTextEntry(flavour, TextEntryTypes.NARRATION);
    }

    _navigateToStructure(structureId) {
        const structure = getStructure(structureId);
        if (!structure) return;

        const level     = this._getLevel(structureId);
        const narrative = getNarrativeTier(structureId, level);

        this._addTextEntry(`You make your way to the ${structure.name}…`, TextEntryTypes.SYSTEM);

        if (narrative) {
            this._addTextEntry(narrative.atmosphere, TextEntryTypes.STRUCTURE_ATMO);
            if (narrative.details?.length > 0) {
                narrative.details.forEach(d => this._addTextEntry(`• ${d}`, TextEntryTypes.STRUCTURE_DETAIL));
            }
        }

        const pending = housingStaffSystem.getUpgradeProgress(this.character, structureId);
        if (pending.inProgress) {
            const info = getUpgradeDuration(level);
            this._addTextEntry(
                `⏳ Upgrade in progress — ${this._formatMs(pending.remainingMs)} remaining (${info.label} total).`,
                TextEntryTypes.SYSTEM
            );
        }
    }

    _lookAtStructure() {
        if (!this.selectedStructure) {
            this._showHomeOverview();
            return;
        }
        const structure = getStructure(this.selectedStructure);
        const level     = this._getLevel(this.selectedStructure);
        const narrative = getNarrativeTier(this.selectedStructure, level);

        this._addTextEntry(`You examine the ${structure.name} more closely…`, TextEntryTypes.SYSTEM);
        if (narrative) {
            this._addTextEntry(narrative.description, TextEntryTypes.STRUCTURE_DESC);
            this._addTextEntry(narrative.atmosphere,  TextEntryTypes.STRUCTURE_ATMO);
            narrative.details?.forEach(d => this._addTextEntry(`• ${d}`, TextEntryTypes.STRUCTURE_DETAIL));
        }
    }

    // ═══════════════════════════════════════════════════════════
    // UPGRADE MODAL  (timed upgrade system)
    // ═══════════════════════════════════════════════════════════

    _openUpgradeModal() {
        if (!this.selectedStructure) return;

        const structureId = this.selectedStructure;
        const structure   = getStructure(structureId);
        const level       = this._getLevel(structureId);
        const nextLevel   = level + 1;
        const narrative   = getNarrativeTier(structureId, level);
        const nextNarr    = getNarrativeTier(structureId, nextLevel);
        const cost        = housingSystem.calculateUpgradeCost(structureId, level);
        const canAfford   = this._canAffordUpgrade(structureId);
        const stageChange = nextNarr?.stageName !== narrative?.stageName;
        const timingInfo  = getUpgradeDuration(level);

        const buffRows = Object.entries(structure.baseBuff).map(([key, val]) => {
            const cur  = housingSystem.calculateBuff(val, level);
            const next = housingSystem.calculateBuff(val, nextLevel);
            const gain = (next - cur).toFixed(2);
            const lbl  = BuffLabels[key] || key;
            return `
                <div class="housing-upgrade-buff-row">
                    <span class="housing-upgrade-buff-name">${lbl}</span>
                    <div class="housing-upgrade-buff-values">
                        <span class="housing-upgrade-buff-current">${this._formatBuffValue(key, cur)}</span>
                        <span style="color:#666">→</span>
                        <span class="housing-upgrade-buff-gain">${this._formatBuffValue(key, next)} (+${gain})</span>
                    </div>
                </div>`;
        }).join('');

        const goldOwned = this.character.gold || 0;
        const costRows  = [
            `<div class="housing-upgrade-cost-row">
                <div class="housing-upgrade-cost-item">
                    <span class="housing-upgrade-cost-icon">💰</span>
                    <span class="housing-upgrade-cost-name">Gold</span>
                </div>
                <span class="housing-upgrade-cost-amount ${goldOwned >= cost.gold ? 'affordable' : 'expensive'}">
                    ${cost.gold.toLocaleString()} / ${goldOwned.toLocaleString()}
                </span>
             </div>`,
            ...Object.entries(cost.materials).map(([matId, amount]) => {
                const matData = getMaterial(matId);
                const owned   = this.character.getMaterialCount?.(matId) ||
                                this.character.materials?.[matId] || 0;
                return `
                    <div class="housing-upgrade-cost-row">
                        <div class="housing-upgrade-cost-item">
                            <span class="housing-upgrade-cost-icon">${matData?.icon || '📦'}</span>
                            <span class="housing-upgrade-cost-name">${matData?.name || matId}</span>
                        </div>
                        <span class="housing-upgrade-cost-amount ${owned >= amount ? 'affordable' : 'expensive'}">
                            ${amount} / ${owned}
                        </span>
                    </div>`;
            }),
        ].join('');

        const tierTable = `
            <div class="upgrade-time-tiers">
                Tier 1 (lv.1–4): 1 min &nbsp;·&nbsp; Tier 2 (lv.5–14): 15 min<br>
                Tier 3 (lv.15–29): 1 hr &nbsp;·&nbsp; Tier 4 (lv.30–49): 6 hrs<br>
                Tier 5 (lv.50–74): 24 hrs &nbsp;·&nbsp; Tier 6 (lv.75+): 3 days
            </div>`;

        const modalTitle = this.container.querySelector('#housing-upgrade-title');
        const modalBody  = this.container.querySelector('#housing-upgrade-body');
        if (modalTitle) modalTitle.textContent = `⬆️ Upgrade ${structure.name}`;
        if (modalBody) {
            modalBody.innerHTML = `
                <div class="housing-upgrade-panel">
                    <div class="housing-upgrade-preview">
                        <div class="housing-upgrade-structure-icon">${structure.icon}</div>
                        <div class="housing-upgrade-structure-name">${structure.name}</div>
                        <div class="housing-upgrade-level-display">
                            <span class="housing-upgrade-level current">Lv.${level}</span>
                            <span class="housing-upgrade-arrow">→</span>
                            <span class="housing-upgrade-level next">Lv.${nextLevel}</span>
                        </div>
                        ${stageChange ? `
                            <div class="housing-upgrade-stage-change">
                                <div class="housing-upgrade-stage-label">✨ Evolves to</div>
                                <div class="housing-upgrade-stage-name">${nextNarr?.stageName}</div>
                            </div>` : ''}
                        <div class="housing-upgrade-buffs-section">${buffRows}</div>
                    </div>
                    <div class="housing-upgrade-costs-section">
                        <div class="housing-upgrade-costs-title">Requirements</div>
                        ${costRows}
                    </div>
                    <div class="upgrade-time-box">
                        <div class="upgrade-time-icon">⏳</div>
                        <div class="upgrade-time-info">
                            <div class="upgrade-time-label">Build Time: ${timingInfo.label}</div>
                            <div class="upgrade-time-detail">Tier ${timingInfo.tier} upgrade · Completes while you adventure</div>
                            ${tierTable}
                        </div>
                    </div>
                    <button class="housing-upgrade-btn ${canAfford ? 'can-afford' : 'cannot-afford'}"
                            id="housing-perform-upgrade" ${canAfford ? '' : 'disabled'}>
                        ${canAfford ? `⬆️ Begin Upgrade (${timingInfo.label})` : '❌ Cannot Afford'}
                    </button>
                </div>`;

            const btn = modalBody.querySelector('#housing-perform-upgrade');
            if (btn && canAfford) btn.addEventListener('click', () => this._performUpgrade());
        }

        const modal = this.container.querySelector('#housing-upgrade-modal');
        if (modal) modal.classList.add('active');
    }

    _closeUpgradeModal() {
        const modal = this.container.querySelector('#housing-upgrade-modal');
        if (modal) modal.classList.remove('active');
    }

    /** Deduct costs immediately, then queue a timed upgrade. Level applies when timer expires. */
    _performUpgrade() {
        if (!this.selectedStructure || !this._canAffordUpgrade(this.selectedStructure)) return;

        const structureId = this.selectedStructure;
        const level       = this._getLevel(structureId);
        const cost        = housingSystem.calculateUpgradeCost(structureId, level);
        const timingInfo  = getUpgradeDuration(level);
        const structure   = getStructure(structureId);

        // Deduct costs now
        this.character.gold -= cost.gold;
        for (const [matId, amount] of Object.entries(cost.materials)) {
            if (this.character.spendMaterial) {
                this.character.spendMaterial(matId, amount);
            } else {
                this.character.materials[matId] = (this.character.materials[matId] || 0) - amount;
                if (this.character.materials[matId] <= 0) delete this.character.materials[matId];
            }
        }

        // Queue timed upgrade (level applied on completion)
        housingStaffSystem.startUpgrade(this.character, structureId, timingInfo.durationMs, level + 1);

        this._closeUpgradeModal();
        this._addTextEntry(
            `🔨 Construction begins on the ${structure.name}. Work crews set to task.`,
            TextEntryTypes.EVENT
        );
        this._addTextEntry(
            `⏳ Estimated completion: ${timingInfo.label}. The upgrade will finish even while you adventure.`,
            TextEntryTypes.SYSTEM
        );

        this._updateUI();
        this._startUpgradeTimerForRoom(structureId);
    }

    _canAffordUpgrade(structureId) {
        const pending = housingStaffSystem.getUpgradeProgress(this.character, structureId);
        if (pending.inProgress) return false;
        const level = this._getLevel(structureId);
        const cost  = housingSystem.calculateUpgradeCost(structureId, level);
        if ((this.character.gold || 0) < cost.gold) return false;
        for (const [matId, amount] of Object.entries(cost.materials)) {
            const owned = this.character.getMaterialCount?.(matId) ||
                          this.character.materials?.[matId] || 0;
            if (owned < amount) return false;
        }
        return true;
    }

    // ═══════════════════════════════════════════════════════════
    // UPGRADE TIMERS
    // ═══════════════════════════════════════════════════════════

    _startUpgradeTimers() {
        const pending = this.character.pendingUpgrades || {};
        for (const structureId of Object.keys(pending)) {
            this._startUpgradeTimerForRoom(structureId);
        }
    }

    _startUpgradeTimerForRoom(structureId) {
        if (this._upgradeTimers[structureId]) clearInterval(this._upgradeTimers[structureId]);

        this._upgradeTimers[structureId] = setInterval(() => {
            const progress = housingStaffSystem.getUpgradeProgress(this.character, structureId);

            if (!progress.inProgress) {
                clearInterval(this._upgradeTimers[structureId]);
                delete this._upgradeTimers[structureId];

                const completed = housingStaffSystem.checkPendingUpgrades(this.character);
                completed.forEach(({ structureId: sid, targetLevel }) => {
                    const struct = getStructure(sid);
                    const narr   = getNarrativeTier(sid, targetLevel);
                    this._addTextEntry(
                        `✨ ${struct.name} upgrade complete! Now level ${targetLevel}.`,
                        TextEntryTypes.EVENT
                    );
                    if (narr?.stageName) {
                        this._addTextEntry(`🌟 Evolved to: ${narr.stageName}!`, TextEntryTypes.EVENT);
                    }
                });
                this._updateUI();
                return;
            }

            if (this.selectedStructure === structureId) {
                this._updateTimerDisplay(structureId, progress);
            }
            // Always keep header and nav dot current
            this._renderLocationHeader();
            this._renderRoomsNav();
        }, 1000);
    }

    _updateTimerDisplay(structureId, progress) {
        const timerEl    = this.container.querySelector('#housing-upgrade-timer');
        const labelEl    = this.container.querySelector('#housing-timer-label');
        const countEl    = this.container.querySelector('#housing-timer-countdown');
        const fillEl     = this.container.querySelector('#housing-timer-fill');
        const noteEl     = this.container.querySelector('#housing-timer-note');
        if (!timerEl) return;

        timerEl.style.display = 'block';
        const level       = this._getLevel(structureId);
        const timingInfo  = getUpgradeDuration(level);
        const structure   = getStructure(structureId);

        if (labelEl) labelEl.textContent = `🔨 Upgrading ${structure.name} to Lv.${progress.targetLevel}…`;
        if (countEl) countEl.textContent = this._formatMs(progress.remainingMs);
        if (fillEl)  fillEl.style.width  = `${progress.pct.toFixed(1)}%`;
        if (noteEl)  noteEl.textContent  = `Tier ${timingInfo.tier} upgrade · ${timingInfo.label} total`;
    }

    _stopUpgradeTimers() {
        Object.values(this._upgradeTimers).forEach(id => clearInterval(id));
        this._upgradeTimers = {};
    }

    _announceCompletedUpgrades() {
        if (!this._pendingCompletionMessages?.length) return;
        this._pendingCompletionMessages.forEach(({ structureId, targetLevel }) => {
            const struct = getStructure(structureId);
            const narr   = getNarrativeTier(structureId, targetLevel);
            this._addTextEntry(
                `✨ While you were away, the ${struct.name} finished upgrading to level ${targetLevel}!`,
                TextEntryTypes.EVENT
            );
            if (narr?.stageName) {
                this._addTextEntry(`🌟 It has evolved to: ${narr.stageName}!`, TextEntryTypes.EVENT);
            }
        });
        this._pendingCompletionMessages = [];
    }

    _formatMs(ms) {
        const s = Math.max(0, Math.floor(ms / 1000));
        const d = Math.floor(s / 86400);
        const h = Math.floor((s % 86400) / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        if (d > 0) return `${d}d ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
        if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
        return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
    }

    // ═══════════════════════════════════════════════════════════
    // AMBIENT EVENTS  (80% structure, 20% staff)
    // ═══════════════════════════════════════════════════════════

    _startAmbientEvents() {
        this._stopAmbientEvents();
        const scheduleNext = () => {
            const delay = 8000 + Math.random() * 12000;
            this.ambientTimer = setTimeout(() => {
                const upgradeOpen   = this.container.querySelector('#housing-upgrade-modal')?.classList.contains('active');
                const materialsOpen = this.container.querySelector('#housing-materials-modal')?.classList.contains('active');
                const staffOpen     = this.container.querySelector('#housing-staff-modal')?.classList.contains('active');

                if (!upgradeOpen && !materialsOpen && !staffOpen) {
                    const hiredCount = housingStaffSystem.getHiredStaffIds(this.character).length;
                    const useStaff   = hiredCount > 0 && Math.random() < StaffSettings.staffAmbientWeight;

                    if (useStaff) {
                        this._fireStaffAmbient();
                    } else {
                        let text = this.selectedStructure && Math.random() < 0.7
                            ? getRandomAmbientText(this.selectedStructure)
                            : null;
                        if (!text) text = getRandomHomeAmbientText();
                        if (text) this._addTextEntry(text, TextEntryTypes.AMBIENT);
                    }
                }
                scheduleNext();
            }, delay);
        };
        scheduleNext();
    }

    _fireStaffAmbient() {
        const event = housingStaffSystem.getNextAmbientEvent(this.character, this.selectedStructure);
        if (!event) return;
        // Text lives in the NPC strip only — don't duplicate it in the feed
        this._renderNpcStrip(event);
        this._checkAndFireLoreHooks();
    }

    /** Force a specific staff member's ambient event — used immediately after hiring. */
    _fireStaffAmbientForced(staffId) {
        const event = housingStaffSystem.getNextAmbientEvent(this.character, this.selectedStructure, staffId);
        if (!event) return;
        // Text lives in the NPC strip only — don't duplicate it in the feed
        this._renderNpcStrip(event);
    }

    _checkAndFireLoreHooks() {
        const pending = housingStaffSystem.checkLoreHooks(this.character);
        pending.forEach(hook => {
            housingStaffSystem.markLoreSeen(this.character, hook.staffId);
            this._addTextEntry(hook.triggerText, TextEntryTypes.LORE_EVENT);
            this._addTextEntry(
                `<em style="color:#5a9eff;font-size:11px;">${hook.threadTag}</em>`,
                TextEntryTypes.LORE_EVENT
            );
        });
    }

    _stopAmbientEvents() {
        if (this.ambientTimer) { clearTimeout(this.ambientTimer); this.ambientTimer = null; }
    }

    // ═══════════════════════════════════════════════════════════
    // EVENTBUS LISTENERS
    // ═══════════════════════════════════════════════════════════

    _setupEventBusListeners() {
        this._unsubscribers.push(
            eventBus.on(GameEvents.STAFF_WAGES_PAID, ({ totalDeducted, evictions }) => {
                if (totalDeducted > 0) {
                    this._addTextEntry(
                        `💰 Wages paid: ${totalDeducted}g total.`,
                        TextEntryTypes.SYSTEM
                    );
                }
                evictions.forEach(({ staffName }) => {
                    this._addTextEntry(`⚠️ ${staffName} has left — wages could not be paid.`, TextEntryTypes.EVENT);
                });
                this._renderActionBar();
                this._renderLocationHeader();
            })
        );
        this._unsubscribers.push(
            eventBus.on(GameEvents.STAFF_TRUST_INCREASED, ({ staffName, newTier }) => {
                if (!staffName) return; // guard against stale/malformed events
                const label = newTier === 1 ? 'Familiar' : newTier === 2 ? 'Trusted' : null;
                if (!label) return;
                this._addTextEntry(
                    `🤝 ${staffName} now regards you as ${label}.`,
                    TextEntryTypes.SYSTEM
                );
            })
        );
    }

    // ═══════════════════════════════════════════════════════════
    // MATERIALS MODAL
    // ═══════════════════════════════════════════════════════════

    _openMaterialsModal() {
        this._renderMaterialsList();
        const modal = this.container.querySelector('#housing-materials-modal');
        if (modal) modal.classList.add('active');
    }

    _closeMaterialsModal() {
        const modal = this.container.querySelector('#housing-materials-modal');
        if (modal) modal.classList.remove('active');
    }

    _renderMaterialsList() {
        const list = this.container.querySelector('#housing-materials-list');
        if (!list) return;
        const allMaterials = this.character.getAllMaterials?.() || this.character.materials || {};
        const tierGroups   = {};
        Object.entries(allMaterials).forEach(([matId, amount]) => {
            if (amount > 0) {
                const matData = getMaterial(matId);
                if (matData) {
                    const tier = matData.tier;
                    if (!tierGroups[tier]) tierGroups[tier] = [];
                    tierGroups[tier].push({ matId, amount, ...matData });
                }
            }
        });
        if (Object.keys(tierGroups).length === 0) {
            list.innerHTML = `
                <div class="housing-no-materials">
                    <p>No materials collected yet.</p>
                    <p style="color:#888;font-size:12px;margin-top:8px;">Defeat enemies in battle to collect building materials.</p>
                </div>`;
            return;
        }
        list.innerHTML = Object.entries(tierGroups)
            .sort(([a],[b]) => Number(a) - Number(b))
            .map(([tier, mats]) => `
                <div class="housing-materials-tier-group">
                    <div class="housing-materials-tier-label">Tier ${tier}</div>
                    <div class="housing-materials-tier-grid">
                        ${mats.map(m => `
                            <div class="housing-materials-item">
                                <span class="housing-materials-item-icon">${m.icon}</span>
                                <div>
                                    <div class="housing-materials-item-amount">${m.amount}</div>
                                    <div class="housing-materials-item-name">${m.name}</div>
                                </div>
                            </div>`).join('')}
                    </div>
                </div>`).join('');
    }

    // ═══════════════════════════════════════════════════════════
    // NAV MODALS  (Stats / Items / Skills / Map / Menu / Forge)
    // ═══════════════════════════════════════════════════════════

    _openNavModal(title, content) {
        const modal      = this.container.querySelector('#housingNavModal');
        const modalTitle = this.container.querySelector('#housingNavModalTitle');
        const modalBody  = this.container.querySelector('#housingNavModalBody');
        const modalHeader = this.container.querySelector('#housingNavModal .modal-header');
        if (modal && modalTitle && modalBody) {
            if (modalHeader) modalHeader.style.display = '';
            modalTitle.textContent = title;
            modalBody.innerHTML    = content;
            modal.style.display    = 'flex';
        }
    }

    _closeNavModal() {
        const modal = this.container.querySelector('#housingNavModal');
        if (modal) modal.style.display = 'none';
        const modalHeader = this.container.querySelector('#housingNavModal .modal-header');
        if (modalHeader) modalHeader.style.display = '';
        if (this._skillTreeUI) { this._skillTreeUI.destroy(); this._skillTreeUI = null; }
        if (this._worldMapUI)  { this._worldMapUI.destroy();  this._worldMapUI  = null; }
        if (this._inventoryUI) { this._inventoryUI.destroy(); this._inventoryUI = null; }
        if (this._statsUI)     { this._statsUI.destroy();     this._statsUI     = null; }
        if (this._forgeUI)     { this._forgeUI = null; }
        this._navBar?.update();
    }

    _showStatsModal() {
        this._openNavModal('📊 Character', '<div id="housingStatsContainer" class="stats-modal-container"></div>');
        setTimeout(() => {
            const container = this.container.querySelector('#housingStatsContainer');
            if (!container) return;
            if (this._statsUI) this._statsUI.destroy();
            this._statsUI = new StatsUI({
                player: this.character,
                containerElement: container,
                onStatAllocated: () => {},
                onRefreshNeeded: () => this._navBar?.update(),
                onUpgradeItem: (itemId) => this._openForgeWithItem(itemId),
                onEmptySlotClick: (slot, filter) => {
                    this._closeNavModal();
                    this._showInventoryModal({ activeTab: 'gear', filterBy: filter });
                }
            });
            this._statsUI.render();
        }, 0);
    }

    _showInventoryModal(options = {}) {
        this._openNavModal('🎒 Inventory', '<div id="housingInventoryContainer" class="inventory-modal-container"></div>');
        setTimeout(() => {
            const container = this.container.querySelector('#housingInventoryContainer');
            if (!container) return;
            if (this._inventoryUI) this._inventoryUI.destroy();
            this._inventoryUI = new InventoryUI({
                player: this.character,
                containerElement: container,
                onEquip: (itemId) => {
                    const result = this.character.equipItem(itemId);
                    if (result.success) { eventBus.emit(GameEvents.SAVE_GAME); this._inventoryUI?.refresh(); }
                },
                onUnequip: (slot) => {
                    const result = this.character.unequipItem(slot);
                    if (result.success) { eventBus.emit(GameEvents.SAVE_GAME); this._inventoryUI?.refresh(); }
                },
                onEquipPotion: (itemId) => {
                    const item = this.character.inventory.find(i => i.id === itemId);
                    if (item && this.character.equipPotion) {
                        const result = this.character.equipPotion(item);
                        if (result.success) { eventBus.emit(GameEvents.SAVE_GAME); this._inventoryUI?.refresh(); }
                    }
                },
                onUnequipPotion: (potionType) => {
                    if (this.character.unequipPotion) {
                        const result = this.character.unequipPotion(potionType);
                        if (result.success) { eventBus.emit(GameEvents.SAVE_GAME); this._inventoryUI?.refresh(); }
                    }
                },
                onUpgradeItem: (itemId) => this._openForgeWithItem(itemId)
            });
            if (options.activeTab) this._inventoryUI.activeTab = options.activeTab;
            if (options.filterBy)  this._inventoryUI.filterBy  = options.filterBy;
            this._inventoryUI.render();
        }, 0);
    }

    _showSkillsModal() {
        if (this._skillTreeUI) { this._skillTreeUI.destroy(); this._skillTreeUI = null; }
        const modal      = this.container.querySelector('#housingNavModal');
        const modalHeader = this.container.querySelector('#housingNavModal .modal-header');
        const modalBody  = this.container.querySelector('#housingNavModalBody');
        if (modal && modalBody) {
            if (modalHeader) modalHeader.style.display = 'none';
            modalBody.innerHTML = '<div id="housingSkillTreeContainer" class="skill-tree-container"></div>';
            this._skillTreeUI = new SkillTreeUI(
                modalBody.querySelector('#housingSkillTreeContainer'),
                this.character,
                () => { this._closeNavModal(); this._navBar?.update(); }
            );
            modal.style.display = 'flex';
        }
    }

    _showMapModal() {
        this._openNavModal('🗺️ World Map', '<div class="world-map-container" id="housingWorldMapContainer"></div>');
        setTimeout(() => {
            const container = this.container.querySelector('#housingWorldMapContainer');
            if (!container) return;
            if (this._worldMapUI) this._worldMapUI.destroy();
            this._worldMapUI = new WorldMapUI(container, this.character, {
                isInTown: true,
                currentMapId: 'housing',
                onTravel: (data) => {
                    this._closeNavModal();
                    if (this.callbacks.onNavigate)
                        this.callbacks.onNavigate(`worldmap:${data.mapId}`, data.returnToPosition);
                },
                onClose: () => this._closeNavModal()
            });
        }, 0);
    }

    _showMenuModal() {
        this._openNavModal('☰ Menu', `
            <div class="menu-options">
                <button class="menu-btn" id="housingBtnSave">💾 Save Game</button>
                <button class="menu-btn" id="housingBtnTown">🏘️ Return to Town</button>
                <button class="menu-btn" id="housingBtnCharSelect">👥 Character Select</button>
                <div class="menu-divider"></div>
                <button class="menu-btn" id="housingBtnHelpFaq">📖 Help &amp; FAQ</button>
                <button class="menu-btn" id="housingBtnReleaseNotes">📋 Release Notes</button>
                <div class="menu-divider"></div>
                <button class="menu-btn" id="housingBtnLogout">🚪 Logout</button>
            </div>`);
        setTimeout(() => {
            this.container.querySelector('#housingBtnSave')?.addEventListener('click', () => {
                eventBus.emit(GameEvents.SAVE_GAME); this._closeNavModal();
            });
            this.container.querySelector('#housingBtnTown')?.addEventListener('click', () => {
                this._closeNavModal(); if (this.callbacks.onNavigate) this.callbacks.onNavigate('town');
            });
            this.container.querySelector('#housingBtnCharSelect')?.addEventListener('click', () => {
                this._closeNavModal(); if (this.callbacks.onNavigate) this.callbacks.onNavigate('charselect');
            });
            this.container.querySelector('#housingBtnHelpFaq')?.addEventListener('click', () => this._showDocModal('📖 Help & FAQ', './data/HELP_FAQ.md'));
            this.container.querySelector('#housingBtnReleaseNotes')?.addEventListener('click', () => this._showDocModal('📋 Release Notes', './data/RELEASE_NOTES.md'));
            this.container.querySelector('#housingBtnLogout')?.addEventListener('click', () => {
                this._closeNavModal(); if (this.callbacks.onLogout) this.callbacks.onLogout();
            });
        }, 0);
    }

    /**
     * Show a Markdown content file inside the nav modal (v2.0.0)
     * Used for Help & FAQ and Release Notes.
     * @param {string} title - Modal header text
     * @param {string} path  - Path to .md file relative to game root
     */
    _showDocModal(title, path) {
        this._openNavModal(title, '<div class="doc-viewer"><div class="doc-loading">⏳ Loading...</div></div>');
        const body = this.container.querySelector('.doc-viewer');
        if (!body) return;
        fetchDoc(path)
            .then(text => { body.innerHTML = renderMarkdown(text); })
            .catch(err  => { body.innerHTML = `<p class="doc-error">⚠️ Could not load content.<br><small>${err.message}</small></p>`; });
    }

    _openForgeWithItem(itemId) {
        const item = this.character.inventory?.find(i => i.id === itemId) ||
                     Object.values(this.character.equipment || {}).find(i => i?.id === itemId);
        if (!item) { console.warn('[HousingScreen] Cannot open forge — item not found:', itemId); return; }

        this._openNavModal('🔥 The Forge', '<div id="housingForgeContainer" class="forge-container"></div>');
        setTimeout(() => {
            const container = this.container.querySelector('#housingForgeContainer');
            if (!container) return;

            if (!this._forgeUI) {
                this._forgeUI = new ForgeUI(this.container, this.character, {
                    onRefresh: () => {
                        const c = this.container.querySelector('#housingForgeContainer');
                        if (c && this._forgeUI) {
                            c.innerHTML = this._forgeUI.buildContent('🔥 The Forge');
                            setTimeout(() => this._forgeUI.setupHandlers(), 0);
                        }
                    },
                    onSave:   () => eventBus.emit(GameEvents.SAVE_GAME),
                    onResult: (result) => {
                        const body = this.container.querySelector('#housingNavModalBody');
                        if (body) {
                            body.innerHTML = this._forgeUI.buildResultContent(result);
                            setTimeout(() => this._forgeUI.setupResultHandler(() => this._openForgeWithItem(itemId)), 0);
                        }
                    },
                    onTextOutput: () => {}
                });
            } else {
                this._forgeUI.updateCharacter(this.character);
            }
            this._forgeUI.setBaseItem(item);
            container.innerHTML = this._forgeUI.buildContent('🔥 The Forge');
            setTimeout(() => this._forgeUI.setupHandlers(), 0);
        }, 0);
    }

    // ═══════════════════════════════════════════════════════════
    // EVENT HANDLERS SETUP
    // ═══════════════════════════════════════════════════════════

    _setupEventHandlers() {
        // Materials
        this.container.querySelector('#housing-materials-close')
            ?.addEventListener('click', () => this._closeMaterialsModal());
        this.container.querySelector('#housing-materials-modal')
            ?.addEventListener('click', e => { if (e.target === e.currentTarget) this._closeMaterialsModal(); });

        // Upgrade modal
        this.container.querySelector('#housing-upgrade-close')
            ?.addEventListener('click', () => this._closeUpgradeModal());
        this.container.querySelector('#housing-upgrade-modal')
            ?.addEventListener('click', e => { if (e.target === e.currentTarget) this._closeUpgradeModal(); });

        // Staff modal
        this.container.querySelector('#housing-staff-close')
            ?.addEventListener('click', () => this._closeStaffPanel());
        this.container.querySelector('#housing-staff-modal')
            ?.addEventListener('click', e => { if (e.target === e.currentTarget) this._closeStaffPanel(); });

        // Ask About
        this.container.querySelector('#housing-ask-btn')
            ?.addEventListener('click', () => this._openAskAboutMenu());

        // Close ask overlay on outside click
        document.addEventListener('click', (e) => {
            const overlay = this.container.querySelector('#housing-ask-overlay');
            const askBtn  = this.container.querySelector('#housing-ask-btn');
            if (overlay?.style.display !== 'none' &&
                !overlay?.contains(e.target) && e.target !== askBtn) {
                this._closeAskAboutMenu();
            }
        }, { passive: true });

        // Main nav bar
        this._navBar.attach(this.container);
        this.container.querySelector('#housingNavModalClose')
            ?.addEventListener('click', () => this._closeNavModal());
        this.container.querySelector('#housingNavModal')
            ?.addEventListener('click', e => { if (e.target === e.currentTarget) this._closeNavModal(); });
    }

    // ═══════════════════════════════════════════════════════════
    // UTILITY
    // ═══════════════════════════════════════════════════════════

    _updateUI() {
        this._renderLocationHeader();
        this._renderRoomCard();
        this._renderRoomsNav();
        this._renderActionBar();
    }

    _getLevel(structureId) {
        return this.character.getHousingLevel?.(structureId) ||
               this.character.housingLevels?.[structureId] || 0;
    }

    _getTotalLevels() {
        return Object.keys(HousingStructures)
            .reduce((sum, id) => sum + this._getLevel(id), 0);
    }

    _getMaterialTypeCount() {
        const all = this.character.getAllMaterials?.() || this.character.materials || {};
        return Object.values(all).filter(v => v > 0).length;
    }

    _formatBuffValue(buffKey, value) {
        const format = BuffFormats[buffKey];
        if (format) {
            const decimals = format.decimals !== undefined ? format.decimals : 1;
            return `${value.toFixed(decimals)}${format.suffix || ''}`;
        }
        return `${value.toFixed(1)}%`;
    }

    // ═══════════════════════════════════════════════════════════
    // LIFECYCLE
    // ═══════════════════════════════════════════════════════════

    destroy() {
        this._stopAmbientEvents();
        this._stopUpgradeTimers();
        clearTimeout(this._npcPresenceTimer);
        this._unsubscribers.forEach(unsub => unsub());
        this._unsubscribers = [];
        if (this._staffPanel)  { this._staffPanel.destroy();  this._staffPanel  = null; }
        if (this._skillTreeUI) { this._skillTreeUI.destroy(); this._skillTreeUI = null; }
        if (this._worldMapUI)  { this._worldMapUI.destroy();  this._worldMapUI  = null; }
        if (this._inventoryUI) { this._inventoryUI.destroy(); this._inventoryUI = null; }
        if (this._statsUI)     { this._statsUI.destroy();     this._statsUI     = null; }
        this.container.innerHTML = '';
        this.container.classList.remove('housing-screen');
    }
}

export default HousingScreen;
