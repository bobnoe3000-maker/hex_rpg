/**
 * @file CharacterSelectScreen.js
 * @description Character slot selection UI. Shows existing characters and empty slots
 *              for the current account. For guest accounts, shows a guest badge, limits
 *              to 1 slot, and surfaces a "Register to Save" button in the footer.
 *
 * @usage Instantiated by main.js after login/guest session starts.
 *        Callbacks: { onCreateNew, onSelectCharacter, onLogout }
 * @dependencies characterManager, accountManager, classConfig, raceConfig, GameConfig, eventBus
 *
 * @version 1.1.0
 * @changelog
 *   - v1.1.0 (2026-03-06): Guest session support. Show "👤 Guest Session" badge instead
 *                          of raw guest email. Added "💾 Register to Save" footer button
 *                          for guest accounts that emits GUEST_REGISTER_OPEN.
 *   - v1.0.0 (2025-01-01): Initial character selection screen.
 */

import { characterManager } from '../systems/CharacterManager.js';
import { accountManager } from '../systems/AccountManager.js';
import { getClass } from '../config/classConfig.js';
import { getRace } from '../config/raceConfig.js';
import { GameConfig } from '../config/gameConfig.js';
import { eventBus } from '../systems/EventBus.js';

export class CharacterSelectScreen {
    constructor(container, callbacks) {
        this.container = container;
        this.callbacks = callbacks || {};
        // callbacks: { onCreateNew, onSelectCharacter, onLogout }
        
        this._init();
    }
    
    _init() {
        this.container.innerHTML = '';
        this.container.classList.add('character-select-screen');
        
        const account = accountManager.getCurrentAccount();
        const isGuest = accountManager.isGuest;
        const slots = characterManager.getCharacterSlots();
        
        // Header label: show a friendly guest badge instead of raw guest_XXXX email
        const accountLabel = isGuest
            ? `<span class="char-select-guest-badge">👤 Guest Session</span>`
            : `<span class="account-email">${account?.email || 'Unknown'}</span>`;

        // Footer: guests get a prominent Register button above Logout
        const registerBtn = isGuest
            ? `<button class="btn-register-save" id="btnRegister">💾 Register to Save Progress</button>`
            : '';
        
        this.container.innerHTML = `
            <div class="char-select-wrapper">
                <div class="char-select-header">
                    <h1>Select Your Hero</h1>
                    ${accountLabel}
                </div>
                
                <div class="char-slots-container">
                    ${slots.map((slot, index) => this._renderSlot(slot, index)).join('')}
                </div>
                
                <div class="char-select-footer">
                    ${registerBtn}
                    <button class="btn-logout" id="btnLogout">Logout</button>
                </div>
            </div>
        `;
        
        this._setupEventListeners();
    }
    
    _renderSlot(slot, index) {
        if (slot.isEmpty) {
            return `
                <div class="char-slot empty" data-slot="${index}">
                    <div class="char-slot-content">
                        <div class="char-slot-icon">+</div>
                        <div class="char-slot-text">Create New Character</div>
                    </div>
                </div>
            `;
        }
        
        const char = slot.character;
        const classData = getClass(char.classId);
        const raceData = getRace(char.raceId);
        
        // Calculate health/mana percents
        const charObj = { 
            totalStats: char.baseStats, 
            classData,
            equipment: char.equipment || {}
        };
        
        // Simple health/mana calculation
        const maxHealth = (char.baseStats?.stamina || 10) * (classData?.derivedStats?.healthPerStamina || 10);
        const maxMana = (char.baseStats?.intelligence || 10) * (classData?.derivedStats?.manaPerIntelligence || 8);
        const healthPercent = Math.min(100, Math.round(((char.currentHealth || maxHealth) / maxHealth) * 100));
        const manaPercent = Math.min(100, Math.round(((char.currentMana || maxMana) / maxMana) * 100));
        
        const classSprite = {
            warrior: '⚔️',
            mage: '🧙',
            rogue: '🗡️'
        }[char.classId] || '👤';
        
        return `
            <div class="char-slot filled" data-slot="${index}" data-char-id="${char.id}">
                <div class="char-slot-content">
                    <div class="char-portrait">
                        <span class="char-sprite">${classSprite}</span>
                    </div>
                    <div class="char-info">
                        <div class="char-name">${char.name}</div>
                        <div class="char-details">
                            <span class="char-level">Level ${char.level}</span>
                            <span class="char-class">${classData?.name || char.classId}</span>
                            <span class="char-race">${raceData?.name || char.raceId}</span>
                        </div>
                        <div class="char-bars">
                            <div class="char-bar health">
                                <div class="char-bar-fill" style="width: ${healthPercent}%"></div>
                                <span class="char-bar-label">HP</span>
                            </div>
                            <div class="char-bar mana">
                                <div class="char-bar-fill" style="width: ${manaPercent}%"></div>
                                <span class="char-bar-label">MP</span>
                            </div>
                        </div>
                    </div>
                    <div class="char-actions">
                        <button class="btn-play" data-char-id="${char.id}" title="Play">▶</button>
                        <button class="btn-delete" data-char-id="${char.id}" title="Delete">✕</button>
                    </div>
                </div>
            </div>
        `;
    }
    
    _setupEventListeners() {
        // Empty slot clicks (create new)
        const emptySlots = this.container.querySelectorAll('.char-slot.empty');
        emptySlots.forEach(slot => {
            slot.addEventListener('click', () => {
                if (this.callbacks.onCreateNew) {
                    this.callbacks.onCreateNew();
                }
            });
        });
        
        // Filled slot clicks (select character)
        const filledSlots = this.container.querySelectorAll('.char-slot.filled');
        filledSlots.forEach(slot => {
            // Click anywhere on slot to select
            slot.addEventListener('click', (e) => {
                // Ignore if clicking delete button
                if (e.target.closest('.btn-delete')) return;
                
                const charId = slot.dataset.charId;
                if (charId && this.callbacks.onSelectCharacter) {
                    this.callbacks.onSelectCharacter(charId);
                }
            });
        });
        
        // Play buttons
        const playBtns = this.container.querySelectorAll('.btn-play');
        playBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const charId = btn.dataset.charId;
                if (charId && this.callbacks.onSelectCharacter) {
                    this.callbacks.onSelectCharacter(charId);
                }
            });
        });
        
        // Delete buttons
        const deleteBtns = this.container.querySelectorAll('.btn-delete');
        deleteBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const charId = btn.dataset.charId;
                this._confirmDelete(charId);
            });
        });
        
        // Logout button
        const logoutBtn = this.container.querySelector('#btnLogout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                accountManager.logout();
                if (this.callbacks.onLogout) {
                    this.callbacks.onLogout();
                }
            });
        }

        // Guest register button — opens the registration modal via EventBus
        const registerBtn = this.container.querySelector('#btnRegister');
        if (registerBtn) {
            registerBtn.addEventListener('click', () => {
                eventBus.emit('GUEST_REGISTER_OPEN', {});
            });
        }
    }
    
    _confirmDelete(charId) {
        const slots = characterManager.getCharacterSlots();
        const slot = slots.find(s => s.character?.id === charId);
        const charName = slot?.character?.name || 'this character';
        
        // Simple confirm dialog
        if (confirm(`Are you sure you want to delete ${charName}? This cannot be undone.`)) {
            const result = characterManager.deleteCharacter(charId);
            if (result.success) {
                // Refresh the screen
                this._init();
            } else {
                alert(result.message);
            }
        }
    }
    
    /**
     * Refresh the character list
     */
    refresh() {
        this._init();
    }
    
    /**
     * Clean up
     */
    destroy() {
        this.container.innerHTML = '';
        this.container.classList.remove('character-select-screen');
    }
}

export default CharacterSelectScreen;
