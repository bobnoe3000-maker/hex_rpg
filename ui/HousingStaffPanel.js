/**
 * @file HousingStaffPanel.js
 * @description Bottom-sheet modal UI for hiring and firing household staff.
 *              Shows all 7 staff members split into hired / available sections.
 *              Displays trust tier stars, days employed, daily cost, buffs,
 *              and room-level requirements. Wires hire/fire through
 *              HousingStaffSystem.
 *
 * @location ui/HousingStaffPanel.js
 * @usage Instantiated by HousingScreen._openStaffPanel().
 *        Rendered into an existing modal container element.
 * @dependencies
 *   - config/housingStaffConfig.js
 *   - systems/HousingStaffSystem.js
 *   - systems/EventBus.js
 *
 * @version 1.0.0
 * @changelog
 *   - v1.0.0 (2026-03-05): Initial implementation. Hire/fire bottom sheet with
 *                          trust stars, room requirements, daily cost summary.
 */

import {
    getAllStaffIds,
    getStaffDefinition,
    getStaffForRoom,
    StaffBuffLabels,
} from '../config/housingStaffConfig.js';

import { housingStaffSystem } from '../systems/HousingStaffSystem.js';
import { eventBus, GameEvents } from '../systems/EventBus.js';

export class HousingStaffPanel {
    /**
     * @param {HTMLElement} container  The modal body element to render into
     * @param {Object}      character
     * @param {Object}      callbacks
     * @param {Function}    callbacks.onStaffChange  Called after hire/fire (parent rebuilds UI)
     * @param {Function}    callbacks.onAddText      (text, type) → pipes to HousingScreen feed
     * @param {Function}    callbacks.onClose        Close the modal
     */
    constructor(container, character, callbacks = {}) {
        this.container  = container;
        this.character  = character;
        this.callbacks  = callbacks;
    }

    // ─────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────

    render() {
        const summary = housingStaffSystem.getHiredSummary(this.character);
        const allIds  = getAllStaffIds();

        const hiredIds     = allIds.filter(id => housingStaffSystem.isHired(this.character, id));
        const availableIds = allIds.filter(id => !housingStaffSystem.isHired(this.character, id));

        this.container.innerHTML = `
            <div class="staff-panel">

                <!-- Summary strip -->
                <div class="staff-panel-summary">
                    <div class="staff-summary-stat">
                        <div class="stat-val">${summary.count}<span style="color:#555">/7</span></div>
                        <div class="stat-lbl">Hired</div>
                    </div>
                    <div class="staff-summary-divider"></div>
                    <div class="staff-summary-stat">
                        <div class="stat-val">💰 ${summary.dailyTotal}g</div>
                        <div class="stat-lbl">Daily Wages</div>
                    </div>
                    <div class="staff-summary-divider"></div>
                    <div class="staff-summary-stat">
                        <div class="stat-val">${(this.character.gold || 0).toLocaleString()}</div>
                        <div class="stat-lbl">Gold</div>
                    </div>
                </div>

                ${hiredIds.length > 0 ? `
                    <div class="staff-section-label">✅ Hired</div>
                    ${hiredIds.map(id => this._buildStaffCard(id, true)).join('')}
                ` : ''}

                <div class="staff-section-label">📋 Available for Hire</div>
                ${availableIds.map(id => this._buildStaffCard(id, false)).join('')}

                <div style="height:12px"></div>
            </div>
        `;

        this._setupHandlers();
    }

    // ─────────────────────────────────────────────────────
    // CARD BUILDER
    // ─────────────────────────────────────────────────────

    _buildStaffCard(staffId, isHired) {
        const def       = getStaffDefinition(staffId);
        const slot      = this.character.hiredStaff?.[staffId];
        const trustTier = housingStaffSystem.getTrustTier(this.character, staffId);
        const { canHire, reason } = housingStaffSystem.canHire(this.character, staffId);

        // Trust stars (3 max)
        const stars = [0,1,2].map(i =>
            `<span class="trust-star ${i < trustTier ? 'filled' : 'empty'}">${i < trustTier ? '★' : '☆'}</span>`
        ).join('');

        // Buff chips
        const buffText = Object.entries(def.buffs).map(([key, val]) => {
            const label = StaffBuffLabels[key] || key;
            const sign  = val > 0 ? '+' : '';
            return `${label} ${sign}${val}${key === 'reforgeDiscount' ? '%' : (Number.isInteger(val) ? (val < 2 ? '/hr' : '%') : '%')}`;
        }).join(' · ');

        // Room requirement note
        const roomName = def.homeRoom.charAt(0).toUpperCase() + def.homeRoom.slice(1);
        const roomLevel = this.character.housingLevels?.[def.homeRoom] || 0;
        const reqMet = roomLevel >= def.minRoomLevel;
        const reqText = `${reqMet ? '✓' : '✗'} ${roomName} lv.${def.minRoomLevel}${!reqMet ? ` (have ${roomLevel})` : ''}`;

        let actionBtn = '';
        if (isHired) {
            actionBtn = `<button class="staff-fire-btn" data-staff-id="${staffId}">Fire</button>`;
        } else if (canHire) {
            actionBtn = `<button class="staff-hire-btn" data-staff-id="${staffId}">Hire</button>`;
        } else {
            actionBtn = `<button class="staff-hire-btn" data-staff-id="${staffId}" disabled style="opacity:0.4;cursor:not-allowed;">Hire</button>`;
        }

        return `
            <div class="staff-card" data-staff-id="${staffId}">
                <div class="staff-avatar">${def.icon}</div>
                <div class="staff-card-info">
                    <div class="staff-card-name">${def.name}</div>
                    <div class="staff-card-title">${def.title}</div>
                    <div class="staff-card-cost">💰 ${def.dailyCost}g/day · ${buffText}</div>
                    ${isHired ? `
                        <div class="staff-trust">
                            ${stars}
                            <span class="trust-days">Day ${slot?.daysEmployed || 0} · ${this._trustLabel(trustTier)}</span>
                        </div>
                    ` : `
                        <div class="staff-req ${reqMet ? 'req-met' : 'req-unmet'}">${reqText}</div>
                    `}
                </div>
                <div class="staff-card-action">${actionBtn}</div>
            </div>
        `;
    }

    _trustLabel(tier) {
        return ['New', 'Familiar', 'Trusted'][tier] || 'New';
    }

    // ─────────────────────────────────────────────────────
    // EVENT HANDLERS
    // ─────────────────────────────────────────────────────

    _setupHandlers() {
        this.container.querySelectorAll('.staff-hire-btn:not([disabled])').forEach(btn => {
            btn.addEventListener('click', () => this._onHire(btn.dataset.staffId));
        });

        this.container.querySelectorAll('.staff-fire-btn').forEach(btn => {
            btn.addEventListener('click', () => this._onFire(btn.dataset.staffId));
        });
    }

    _onHire(staffId) {
        const result = housingStaffSystem.hireStaff(this.character, staffId);
        if (result.success) {
            const def = getStaffDefinition(staffId);
            // Pipe hire text first (modal closes as part of onAddText in HousingScreen)
            this.callbacks.onAddText?.(result.hireText, 'npc-dialogue');
            this.callbacks.onAddText?.(
                `${def.name} has joined your household. Wages: ${def.dailyCost}g/day.`,
                'system'
            );
            this.callbacks.onStaffChange?.();
            // Fire immediate NPC appearance after modal closes
            this.callbacks.onHired?.(staffId);
        }
    }

    _onFire(staffId) {
        const result = housingStaffSystem.fireStaff(this.character, staffId);
        if (result.success) {
            this.callbacks.onAddText?.(result.fireText, 'npc-dialogue');
            this.callbacks.onAddText?.(
                `${getStaffDefinition(staffId).name} has left your household.`,
                'system'
            );
            this.callbacks.onStaffChange?.();
            this.render(); // Rebuild panel in place
        }
    }

    // ─────────────────────────────────────────────────────
    // LIFECYCLE
    // ─────────────────────────────────────────────────────

    destroy() {
        this.container = null;
    }
}

export default HousingStaffPanel;
