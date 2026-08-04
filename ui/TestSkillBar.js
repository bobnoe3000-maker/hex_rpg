/**
 * @file TestSkillBar.js
 * @description A special skill bar for the Testing Ground (test_arena) map that displays
 *              ALL active skills for the player's class, unlocked or not, firing at rank 1.
 *              Groups skills by branch with collapsible header. Tracks cooldowns independently
 *              so it never interferes with the player's normal equipped skill state.
 *
 * @usage Instantiated by BattleMapUI when mapData.isTestMap === true.
 *        Mounted into #testSkillBarMount div (between battle-main and battle-footer).
 *        Destroyed when leaving the test map.
 *
 * @dependencies
 *   - config/skillConfig.js (getSkillsForClass, SkillType, TargetType, SkillTreeStructure)
 *   - engine/SkillEngine.js (executeSkill)
 *   - utils/SkillUtils.js (getId, getName, getTargetType)
 *   - EventBus / GameEvents (SKILL_USED log entry)
 *
 * @version 1.0.0
 * @changelog
 *   - v1.0.0 (2026-03-09): Initial implementation. All active skills for player class,
 *                           grouped by branch, rank-1 execution, local cooldown tracking,
 *                           FX thumb icons, collapsible panel.
 */

import {
    getSkillsForClass,
    SkillType,
    TargetType,
    SkillTreeStructure,
    calculateCooldown,
    calculateManaCost
} from '../config/skillConfig.js';
import SkillEngine from '../engine/SkillEngine.js';
import { SkillUtils } from '../utils/SkillUtils.js';

export class TestSkillBar {
    /**
     * @param {HTMLElement} container  - Mount point element (#testSkillBarMount)
     * @param {Object}      player     - Character instance
     * @param {Object}      callbacks
     * @param {Function}    callbacks.onSkillResult   - Called after execution: (result, skill, target)
     * @param {Function}    callbacks.getTarget       - Returns current selected or nearest target
     * @param {Object}      mapInstance               - Current MapInstance (for SkillEngine)
     */
    constructor(container, player, callbacks = {}) {
        this.container   = container;
        this.player      = player;
        this.callbacks   = callbacks;
        this.mapInstance = callbacks.mapInstance || null;

        // Local cooldown tracking: skillId → timestamp when ready
        this._cooldownEnds = new Map();

        // Whether the bar is expanded or collapsed
        this._expanded = true;

        // Interval handle for cooldown overlay refreshes
        this._refreshInterval = null;

        this._build();
        this._startRefresh();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // BUILD
    // ─────────────────────────────────────────────────────────────────────────

    _build() {
        const classId   = this.player?.classId || 'warrior';
        const branches  = SkillTreeStructure[classId]?.branches || {};
        const allActive = getSkillsForClass(classId)
            .filter(function(s) { return s.type === SkillType.ACTIVE; })
            .sort(function(a, b) { return a.tier - b.tier; });

        // Group by branch, preserving branch order
        const grouped = {};
        const branchKeys = Object.keys(branches);
        for (let i = 0; i < branchKeys.length; i++) {
            grouped[branchKeys[i]] = [];
        }
        for (let i = 0; i < allActive.length; i++) {
            const skill = allActive[i];
            if (grouped[skill.branch]) grouped[skill.branch].push(skill);
        }

        const className  = SkillTreeStructure[classId]?.name || classId;
        const totalCount = allActive.length;

        // Build branch HTML separately — no arrow functions or nested templates
        let branchHTML = '';
        for (let i = 0; i < branchKeys.length; i++) {
            const branchId   = branchKeys[i];
            const skills     = grouped[branchId];
            if (!skills || !skills.length) continue;
            const branchName = (branches[branchId] && branches[branchId].name) ? branches[branchId].name : branchId;

            let slotsHTML = '';
            for (let j = 0; j < skills.length; j++) {
                slotsHTML += this._buildSlotHTML(skills[j]);
            }

            branchHTML +=
                '<div class="tsb-branch-group">' +
                    '<div class="tsb-branch-label">' + branchName + '</div>' +
                    '<div class="tsb-slots">' + slotsHTML + '</div>' +
                '</div>';
        }

        this.container.innerHTML =
            '<div class="tsb-panel" id="tsbPanel">' +
                '<div class="tsb-header" id="tsbHeader">' +
                    '<span class="tsb-title">' +
                        '🧪 <strong>' + className + '</strong> \u2014 All Skills ' +
                        '<span class="tsb-count">' + totalCount + ' active</span>' +
                    '</span>' +
                    '<div class="tsb-header-right">' +
                        '<span class="tsb-hint">Rank 1 \u00b7 Sandbox</span>' +
                        '<button class="tsb-toggle-btn" id="tsbToggle" title="Collapse/Expand">\u25b2</button>' +
                    '</div>' +
                '</div>' +
                '<div class="tsb-body" id="tsbBody">' +
                    branchHTML +
                '</div>' +
            '</div>';

        this._wireListeners(allActive);
    }

    _buildSlotHTML(skill) {
        const rank1Cooldown = calculateCooldown(skill, 1);
        const rank1Mana     = calculateManaCost(skill, 1);
        const cdLabel       = rank1Cooldown > 0 ? ((rank1Cooldown / 1000).toFixed(1) + 's') : '\u2014';
        const targetLabel   = skill.targetType || 'self';
        const skillName     = skill.name || '';
        const skillDesc     = skill.description || '';
        const skillId       = skill.id || '';
        const fallbackEmoji = this._getSkillEmoji(skill);
        const titleText     = skillName + '\n' + skillDesc + '\nMana: ' + rank1Mana + ' \u00b7 CD: ' + cdLabel + ' \u00b7 ' + targetLabel;

        // Icon HTML — FX thumb with emoji fallback
        let iconHTML = '';
        if (skill.fxId) {
            const thumbSrc = 'assets/fx/thumbs/' + skill.fxId + '.png';
            iconHTML =
                '<img class="skill-fx-thumb" src="' + thumbSrc + '" alt="' + skillName + '" ' +
                    'onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">' +
                '<span class="tsb-slot-emoji" style="display:none">' + fallbackEmoji + '</span>';
        } else {
            iconHTML = '<span class="tsb-slot-emoji">' + fallbackEmoji + '</span>';
        }

        return (
            '<div class="tsb-slot skill-slot"' +
                ' data-skill-id="' + skillId + '"' +
                ' data-total-cd="' + rank1Cooldown + '"' +
                ' title="' + titleText.replace(/"/g, '&quot;') + '">' +
                '<div class="skill-slot-icon tsb-slot-icon">' + iconHTML + '</div>' +
                '<div class="tsb-slot-label">' + skillName + '</div>' +
                '<div class="tsb-cooldown-overlay" data-cd="' + skillId + '" style="height:0%"></div>' +
            '</div>'
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // LISTENERS
    // ─────────────────────────────────────────────────────────────────────────

    _wireListeners(allActive) {
        // Toggle collapse
        const toggleBtn = this.container.querySelector('#tsbToggle');
        toggleBtn?.addEventListener('click', () => this._toggleExpanded());

        // Header click also toggles
        const header = this.container.querySelector('#tsbHeader');
        header?.addEventListener('click', (e) => {
            // Avoid double-firing with button click
            if (e.target === toggleBtn || toggleBtn?.contains(e.target)) return;
            this._toggleExpanded();
        });

        // Skill slot clicks
        const slotMap = new Map(allActive.map(s => [s.id, s]));
        const slots = this.container.querySelectorAll('.tsb-slot[data-skill-id]');
        slots.forEach(slot => {
            slot.addEventListener('click', () => {
                const skillId = slot.dataset.skillId;
                const skill   = slotMap.get(skillId);
                if (!skill) return;
                this._useSkill(skill, slot);
            });
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SKILL EXECUTION
    // ─────────────────────────────────────────────────────────────────────────

    _useSkill(skillDef, slotEl) {
        const now = Date.now();
        const ready = this._cooldownEnds.get(skillDef.id) || 0;
        if (now < ready) return; // Still on cooldown — ignore click

        if (!this.player || !this.mapInstance) return;

        // Determine target
        const target = this._resolveTarget(skillDef);
        if (!target && skillDef.targetType !== TargetType.SELF) {
            if (this.callbacks.onSkillResult) {
                this.callbacks.onSkillResult(
                    { success: false, reason: 'No valid target' },
                    skillDef,
                    null
                );
            }
            return;
        }

        // Build a rank-1 skill object for SkillEngine
        // Spread the config def, override rank, reset any engine-side cooldown state
        const skillObj = {
            ...skillDef,
            rank: 1,
            cooldownRemaining: 0
        };

        // Execute
        const result = SkillEngine.executeSkill(skillObj, this.player, target, this.mapInstance);

        // Always start local cooldown on attempt (success or not, to prevent spam)
        const cdMs = calculateCooldown(skillDef, 1);
        if (cdMs > 0) {
            this._cooldownEnds.set(skillDef.id, now + cdMs);
        }

        // Visual feedback on the slot
        if (result?.success === false) {
            this._flashSlot(slotEl, 'tsb-slot--fail');
        } else {
            this._flashSlot(slotEl, 'tsb-slot--fired');
        }

        // Notify BattleMapUI for combat log entry
        if (this.callbacks.onSkillResult) {
            this.callbacks.onSkillResult(result, skillDef, target);
        }
    }

    _resolveTarget(skillDef) {
        if (skillDef.targetType === TargetType.SELF ||
            skillDef.targetType === TargetType.ALLY ||
            skillDef.targetType === TargetType.AOE_ALLY) {
            return this.player;
        }
        // Delegate to BattleMapUI target resolution
        if (this.callbacks.getTarget) {
            return this.callbacks.getTarget();
        }
        return null;
    }

    _flashSlot(slotEl, className) {
        if (!slotEl) return;
        slotEl.classList.add(className);
        setTimeout(() => slotEl.classList.remove(className), 300);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // COOLDOWN REFRESH
    // ─────────────────────────────────────────────────────────────────────────

    _startRefresh() {
        this._refreshInterval = setInterval(() => this._refreshCooldowns(), 100);
    }

    _refreshCooldowns() {
        const now = Date.now();
        const overlays = this.container?.querySelectorAll('.tsb-cooldown-overlay');
        if (!overlays) return;

        overlays.forEach(overlay => {
            const skillId  = overlay.dataset.cd;
            const endTime  = this._cooldownEnds.get(skillId) || 0;
            const slot     = overlay.closest('.tsb-slot');

            if (now >= endTime) {
                overlay.style.height = '0%';
                slot?.classList.remove('on-cooldown');
            } else {
                // Find the skill's base cooldown to calculate % remaining
                const skillEl = slot?.dataset.skillId;
                // We track endTime; infer total cd from the Map
                // We need the base cooldown — read from skill def via the slot's dataset
                // Simple approach: store full cooldown in data attr at build time
                const totalCd  = parseInt(slot?.dataset.totalCd || '6000', 10);
                const remaining = endTime - now;
                const pct = Math.min(100, Math.round((remaining / totalCd) * 100));
                overlay.style.height = pct + '%';
                slot?.classList.add('on-cooldown');
            }
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // COLLAPSE / EXPAND
    // ─────────────────────────────────────────────────────────────────────────

    _toggleExpanded() {
        this._expanded = !this._expanded;
        const body   = this.container.querySelector('#tsbBody');
        const toggle = this.container.querySelector('#tsbToggle');
        const panel  = this.container.querySelector('#tsbPanel');
        if (body)   body.style.display  = this._expanded ? '' : 'none';
        if (toggle) toggle.textContent  = this._expanded ? '▲' : '▼';
        if (panel)  panel.classList.toggle('tsb-collapsed', !this._expanded);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UPDATE MAP INSTANCE (called by BattleMapUI after loadMap)
    // ─────────────────────────────────────────────────────────────────────────

    setMapInstance(mapInstance) {
        this.mapInstance = mapInstance;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    _getSkillEmoji(skill) {
        const map = {
            // Warrior
            heavy_swing: '⚔️', whirlwind: '🌀', taunt: '🛡️', shield_slam: '💥',
            rally_cry: '📣', battle_orders: '⚔️', inspiring_strike: '✨',
            // Mage
            fire_bolt: '🔥', frost_shard: '❄️', lightning_arc: '⚡', fireball: '🔥',
            arcane_missiles: '🔮', dispel: '✨', mana_shield: '🛡️', time_slow: '⏳',
            drain_essence: '💜', mana_flood: '🌊',
            // Rogue
            backstab: '🗡️', shadow_step: '👥', execute: '💀',
            power_shot: '🏹', snare_trap: '🪤', piercing_arrow: '🏹', volley: '🏹',
            smoke_bomb: '💨', fade: '👻', shadow_cloak: '🌑', shadow_strike: '🗡️'
        };
        return map[skill.icon] || '⚡';
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DESTROY
    // ─────────────────────────────────────────────────────────────────────────

    destroy() {
        if (this._refreshInterval) {
            clearInterval(this._refreshInterval);
            this._refreshInterval = null;
        }
        if (this.container) {
            this.container.innerHTML = '';
        }
        this._cooldownEnds.clear();
    }
}

export default TestSkillBar;
