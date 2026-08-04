/**
 * @file SkillBarUI.js
 * @description Combat skill bar with cooldown overlays, auto-cast toggles, and manual activation.
 *              Displays 5 active skill slots during battle.
 * 
 * @location ui/SkillBarUI.js
 * @usage Integrated into BattleMapUI.js
 * @dependencies config/skillConfig.js, systems/EventBus.js, utils/SkillUtils.js
 * 
 * @version 1.5.0
 * @changelog
 *   - v1.5.0 (2026-03-08): _getSkillIcon now renders a 48x48 PNG thumbnail from
 *                           assets/fx/thumbs/{fxId}.png when skill.fxId is set,
 *                           falling back to SkillUtils.getIcon (emoji) for skills
 *                           without fxId. Thumbs extracted from spritesheets/GIFs
 *                           at first non-blank frame.
 *   - v1.4.0 (2025-01-12): Removed global Auto button (moved to BattleMapUI FAB menu)
 *   - v1.3.0 (2025-01-12): Added double-tap to toggle auto-cast on skill slots (mobile-friendly)
 *   - v1.2.0 (2025-01-10): Refactored to use centralized SkillUtils for consistent property access
 *   - v1.1.1 (2025-01-10): Fixed skill.name in tooltip to handle plain objects
 *   - v1.1.0 (2025-01-10): Added helper methods to handle both Skill instances and plain objects
 *                          for cooldown, mana cost, and other computed properties
 *   - v1.0.1 (2025-01-10): Fixed setAutoCast error - now handles both Skill instances and plain objects
 *   - v1.0.0 (2025-01-10): Initial implementation
 */

import { SkillConstants, SkillType } from '../config/skillConfig.js';
import { eventBus, GameEvents } from '../systems/EventBus.js';
import { SkillUtils } from '../utils/SkillUtils.js';

export class SkillBarUI {
    /**
     * Create skill bar UI
     * @param {HTMLElement} container - Container element
     * @param {Object} character - Player character
     * @param {Object} callbacks - Callback functions { onSkillUse, onAutoToggle }
     */
    constructor(container, character, callbacks = {}) {
        this.container = container;
        this.character = character;
        this.callbacks = callbacks;
        
        this.cooldownUpdateInterval = null;
        
        // Double-tap tracking for auto-cast toggle (per slot)
        this._lastTapTime = {};
        this._doubleTapThreshold = 300; // milliseconds
        
        this._init();
    }
    
    _init() {
        this._render();
        this._setupEventListeners();
        this._startCooldownUpdates();
    }
    
    _render() {
        const activeSkills = this.character.activeSkills || [];
        
        this.container.innerHTML = `
            <div class="skill-bar">
                <div class="skill-slots">
                    ${this._renderSlots(activeSkills)}
                </div>
            </div>
        `;
    }
    
    _renderSlots(activeSkills) {
        let html = '';
        
        for (let i = 0; i < SkillConstants.MAX_ACTIVE_SKILLS; i++) {
            const skill = activeSkills[i];
            html += this._renderSlot(i, skill);
        }
        
        return html;
    }
    
    _renderSlot(index, skill) {
        if (!skill) {
            return `
                <div class="skill-slot empty" data-slot="${index}">
                    <div class="skill-slot-empty">
                        <span class="slot-number">${index + 1}</span>
                    </div>
                </div>
            `;
        }
        
        // Use helper methods to handle both Skill instances and plain objects
        const isOnCooldown = this._isSkillOnCooldown(skill);
        const cooldownPercent = this._getSkillCooldownPercent(skill);
        const remainingCooldown = this._getSkillRemainingCooldown(skill);
        const canUse = this._canUseSkill(skill);
        
        // Get skill name (handle both Skill instances and plain objects)
        const skillName = skill.name || skill.config?.name || 'Unknown Skill';
        
        return `
            <div class="skill-slot ${!isOnCooldown ? 'ready' : 'on-cooldown'} ${canUse ? '' : 'cannot-use'}"
                 data-slot="${index}"
                 data-skill-id="${skill.id || skill.baseId}"
                 title="${skillName}${isOnCooldown ? ` (${(remainingCooldown / 1000).toFixed(1)}s)` : ''}">
                <div class="skill-slot-icon">
                    ${this._getSkillIcon(skill)}
                </div>
                <div class="skill-cooldown-overlay" style="height: ${cooldownPercent}%"></div>
                ${isOnCooldown ? `
                    <div class="skill-cooldown-text">
                        ${Math.ceil(remainingCooldown / 1000)}
                    </div>
                ` : ''}
                <span class="skill-keybind">${index + 1}</span>
                ${skill.autoCast ? '<div class="skill-autocast-indicator">A</div>' : ''}
                ${SkillUtils.getRank(skill) > 1 ? `<div class="skill-rank-badge">${SkillUtils.getRank(skill)}</div>` : ''}
            </div>
        `;
    }
    
    // === Skill Property Helpers (delegate to SkillUtils for consistency) ===
    
    _isSkillOnCooldown(skill) {
        return SkillUtils.isOnCooldown(skill);
    }
    
    _getSkillRemainingCooldown(skill) {
        return SkillUtils.getRemainingCooldown(skill);
    }
    
    _getSkillCooldownPercent(skill) {
        return SkillUtils.getCooldownPercent(skill);
    }
    
    _getSkillManaCost(skill) {
        return SkillUtils.getManaCost(skill);
    }
    
    _getSkillIcon(skill) {
        const fxId = skill?.fxId ?? skill?.config?.fxId;
        if (fxId) {
            const src = `assets/fx/thumbs/${fxId}.png`;
            const name = skill.name || skill.config?.name || fxId;
            return `<img class="skill-fx-thumb" src="${src}" alt="${name}" draggable="false">`;
        }
        return SkillUtils.getIcon(skill);
    }
    
    _canUseSkill(skill) {
        if (!skill || !this.character) return false;
        if (this._isSkillOnCooldown(skill)) return false;
        if (SkillUtils.isPassive(skill)) return false;
        
        // Check mana
        const manaCost = this._getSkillManaCost(skill);
        if (manaCost > 0 && this.character.currentMana < manaCost) {
            return false;
        }
        
        return true;
    }
    
    _setupEventListeners() {
        // Skill slot clicks - with double-tap detection for auto-cast toggle
        this.container.querySelectorAll('.skill-slot:not(.empty)').forEach(slot => {
            slot.addEventListener('click', (e) => {
                const slotIndex = parseInt(slot.dataset.slot);
                const now = Date.now();
                const lastTap = this._lastTapTime[slotIndex] || 0;
                
                if (now - lastTap < this._doubleTapThreshold) {
                    // Double-tap detected - toggle auto-cast
                    this._toggleAutocast(slotIndex);
                    this._showAutoToggleFeedback(slotIndex);
                    this._lastTapTime[slotIndex] = 0; // Reset to prevent triple-tap
                } else {
                    // Single tap - use skill
                    this._handleSkillClick(slotIndex);
                    this._lastTapTime[slotIndex] = now;
                }
            });
            
            // Right-click for auto-cast toggle (desktop)
            slot.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                const slotIndex = parseInt(slot.dataset.slot);
                this._toggleAutocast(slotIndex);
            });
        });
        
        // Keyboard shortcuts (1-5)
        this._keyHandler = (e) => {
            const key = parseInt(e.key);
            if (key >= 1 && key <= 5) {
                this._handleSkillClick(key - 1);
            }
        };
        document.addEventListener('keydown', this._keyHandler);
    }
    
    _handleSkillClick(slotIndex) {
        const activeSkills = this.character.activeSkills || [];
        const skill = activeSkills[slotIndex];
        
        if (!skill) return;
        
        // Check if skill can be used
        if (!this._canUseSkill(skill)) {
            // Show feedback
            this._showSkillFeedback(slotIndex, 'cannot-use');
            return;
        }
        
        // Callback to handle skill use
        if (this.callbacks.onSkillUse) {
            this.callbacks.onSkillUse(skill, slotIndex);
        }
        
        // Emit event
        eventBus.emit(GameEvents.COMBAT_SKILL_USE, {
            character: this.character,
            skill: skill,
            slot: slotIndex,
            manual: true
        });
    }
    
    _toggleAutocast(slotIndex) {
        const activeSkills = this.character.activeSkills || [];
        const skill = activeSkills[slotIndex];
        
        if (!skill) return;
        
        // Toggle auto-cast using SkillUtils
        const newValue = !skill.autoCast;
        SkillUtils.setAutoCast(skill, newValue);
        
        // Callback
        if (this.callbacks.onAutoToggle) {
            this.callbacks.onAutoToggle(skill, slotIndex, skill.autoCast);
        }
        
        // Re-render
        this._render();
        this._setupEventListeners();
    }
    
    _showSkillFeedback(slotIndex, type) {
        const slot = this.container.querySelector(`.skill-slot[data-slot="${slotIndex}"]`);
        if (!slot) return;
        
        slot.classList.add(type);
        setTimeout(() => {
            slot.classList.remove(type);
        }, 300);
    }
    
    /**
     * Show visual feedback when auto-cast is toggled via double-tap
     * @param {number} slotIndex - Slot index
     */
    _showAutoToggleFeedback(slotIndex) {
        const slot = this.container.querySelector(`.skill-slot[data-slot="${slotIndex}"]`);
        if (!slot) return;
        
        slot.classList.add('auto-toggled');
        setTimeout(() => {
            slot.classList.remove('auto-toggled');
        }, 400);
    }
    
    _startCooldownUpdates() {
        // Update cooldown displays every 100ms
        this.cooldownUpdateInterval = setInterval(() => {
            this._updateCooldowns();
        }, 100);
    }
    
    _updateCooldowns() {
        const activeSkills = this.character.activeSkills || [];
        
        activeSkills.forEach((skill, index) => {
            if (!skill) return;
            
            const slot = this.container.querySelector(`.skill-slot[data-slot="${index}"]`);
            if (!slot) return;
            
            const overlay = slot.querySelector('.skill-cooldown-overlay');
            const text = slot.querySelector('.skill-cooldown-text');
            
            const isOnCooldown = this._isSkillOnCooldown(skill);
            
            if (isOnCooldown) {
                const cooldownPercent = this._getSkillCooldownPercent(skill);
                const remainingCooldown = this._getSkillRemainingCooldown(skill);
                
                // Update overlay height
                if (overlay) {
                    overlay.style.height = `${cooldownPercent}%`;
                }
                
                // Update text
                if (text) {
                    text.textContent = Math.ceil(remainingCooldown / 1000);
                } else if (!slot.querySelector('.skill-cooldown-text')) {
                    // Add text if not present
                    const newText = document.createElement('div');
                    newText.className = 'skill-cooldown-text';
                    newText.textContent = Math.ceil(remainingCooldown / 1000);
                    slot.appendChild(newText);
                }
                
                slot.classList.add('on-cooldown');
                slot.classList.remove('ready');
            } else {
                // Clear cooldown display
                if (overlay) {
                    overlay.style.height = '0%';
                }
                if (text) {
                    text.remove();
                }
                
                slot.classList.remove('on-cooldown');
                slot.classList.add('ready');
            }
            
            // Update can-use state
            if (this._canUseSkill(skill)) {
                slot.classList.remove('cannot-use');
            } else {
                slot.classList.add('cannot-use');
            }
        });
    }
    
    /**
     * Update the skill bar display
     */
    refresh() {
        this._render();
        this._setupEventListeners();
    }
    
    /**
     * Set a skill on cooldown (called after skill use)
     * @param {number} slotIndex - Slot index
     */
    triggerCooldown(slotIndex) {
        const activeSkills = this.character.activeSkills || [];
        const skill = activeSkills[slotIndex];
        
        if (skill) {
            SkillUtils.startCooldown(skill);
        }
    }
    
    /**
     * Clean up
     */
    destroy() {
        if (this.cooldownUpdateInterval) {
            clearInterval(this.cooldownUpdateInterval);
        }
        
        if (this._keyHandler) {
            document.removeEventListener('keydown', this._keyHandler);
        }
        
        this.container.innerHTML = '';
    }
}

export default SkillBarUI;
