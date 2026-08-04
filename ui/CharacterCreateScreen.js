/**
 * @file CharacterCreateScreen.js
 * @description Full character creation UI with multi-step wizard for class, race,
 *              appearance, and attribute allocation.
 * 
 * @usage Instantiated when starting a new game or creating additional characters.
 * @dependencies 
 *   - CharacterManager (systems/CharacterManager.js)
 *   - ClassConfig (config/classConfig.js)
 *   - RaceConfig (config/raceConfig.js)
 *   - GameConfig (config/gameConfig.js)
 * 
 * @version 1.5.0
 * @changelog
 *   - v1.5.0 (2026-02-10): Three UX improvements to character creation:
 *                          1. Alignment selection now shows dynamic combat buff info box
 *                             reading from GameConfig.alignment.modifiers matrix.
 *                          2. "Why Are You Here?" section adds "story only" hint.
 *                          3. Stat allocation shows class-specific ATK/DEF per-point hints
 *                             derived from classData.derivedStats multipliers.
 *                          Added _renderAlignmentDetail() and _getStatCombatHints() helpers.
 *   - v1.4.0 (2025-01-26): Made motivation selection required (no default).
 *                          Added validation for motivation in Step 1.
 *                          Added CSS class for smaller motivation cards (75% size).
 *   - v1.3.0 (2025-01-20): Added motivation/personal hook selection to Step 1.
 *                          Motivation displayed in review step and passed to character data.
 *   - v1.2.0 (2025-01-20): Fixed crit chance calculation to use hardcoded 0.002 per DEX
 *                          (matching Character.js). Removed unused derived.critPerDexterity.
 *                          Changed crit cap from 75% to 25% per GameConfig.combat.maxCritChance.
 *   - v1.1.0 (2025-01-19): Added Dodge and Crit to derived stats preview. Changed Attack
 *                          and Defense display to show 1 decimal place for better feedback.
 *   - v1.0.0 (2025-01-01): Initial implementation with 4-step character creation wizard.
 */

// CharacterCreateScreen - Full character creation UI
import { characterManager } from '../systems/CharacterManager.js';
import { ClassConfig, getClass } from '../config/classConfig.js';
import { RaceConfig, getRace } from '../config/raceConfig.js';
import { GameConfig } from '../config/gameConfig.js';

export class CharacterCreateScreen {
    constructor(container, callbacks) {
        this.container = container;
        this.callbacks = callbacks || {};
        // callbacks: { onComplete, onCancel }
        
        // Character creation state
        this.characterData = {
            name: '',
            classId: 'warrior',
            raceId: 'human',
            alignment: 'neutral',
            motivation: null,  // Required selection - no default
            sex: 'M',
            appearance: {
                hairStyle: 'short',
                hairColor: 'brown',
                skinColor: 'fair',
                eyeColor: 'brown',
                height: 'average',
                build: 'average'
            },
            baseStats: {
                strength: 0,
                dexterity: 0,
                intelligence: 0,
                stamina: 0
            }
        };
        
        this.startingStatPoints = GameConfig.character.startingStatPoints;
        this.usedStatPoints = 0;
        this.currentStep = 1;
        this.totalSteps = 4;
        
        this._init();
    }
    
    _init() {
        this.container.innerHTML = '';
        this.container.classList.add('char-create-screen');
        
        this.container.innerHTML = `
            <div class="char-create-wrapper">
                <div class="char-create-header">
                    <h1>Create Your Hero</h1>
                    <div class="step-indicator">
                        <div class="step ${this.currentStep >= 1 ? 'active' : ''}" data-step="1">1. Class & Race</div>
                        <div class="step ${this.currentStep >= 2 ? 'active' : ''}" data-step="2">2. Appearance</div>
                        <div class="step ${this.currentStep >= 3 ? 'active' : ''}" data-step="3">3. Attributes</div>
                        <div class="step ${this.currentStep >= 4 ? 'active' : ''}" data-step="4">4. Review</div>
                    </div>
                </div>
                
                <div class="char-create-content" id="createContent">
                    ${this._renderCurrentStep()}
                </div>
                
                <div class="char-create-footer">
                    <button class="btn-cancel" id="btnCancel">Cancel</button>
                    <div class="nav-buttons">
                        <button class="btn-prev" id="btnPrev" ${this.currentStep === 1 ? 'disabled' : ''}>Previous</button>
                        <button class="btn-next" id="btnNext">${this.currentStep === this.totalSteps ? 'Create Character' : 'Next'}</button>
                    </div>
                </div>
            </div>
        `;
        
        this._setupEventListeners();
    }
    
    _renderCurrentStep() {
        switch (this.currentStep) {
            case 1: return this._renderClassRaceStep();
            case 2: return this._renderAppearanceStep();
            case 3: return this._renderAttributesStep();
            case 4: return this._renderReviewStep();
            default: return '';
        }
    }
    
    _renderClassRaceStep() {
        const classData = getClass(this.characterData.classId);
        const raceData = getRace(this.characterData.raceId);
        
        return `
            <div class="create-step step-class-race">
                <div class="form-section">
                    <h2>Character Name</h2>
                    <input type="text" id="charName" class="input-name" 
                           value="${this.characterData.name}" 
                           placeholder="Enter your hero's name"
                           maxlength="16">
                </div>
                
                <div class="form-section">
                    <h2>Choose Your Class</h2>
                    <div class="option-grid class-options">
                        ${Object.values(ClassConfig).map(cls => `
                            <div class="option-card ${this.characterData.classId === cls.id ? 'selected' : ''}" 
                                 data-class="${cls.id}">
                                <div class="option-icon">${this._getClassIcon(cls.id)}</div>
                                <div class="option-name">${cls.name}</div>
                                <div class="option-desc">${cls.description}</div>
                                <div class="option-stats">
                                    ${this._formatStatBonuses(cls.statBonus)}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="form-section">
                    <h2>Choose Your Race</h2>
                    <div class="option-grid race-options">
                        ${Object.values(RaceConfig).map(race => `
                            <div class="option-card ${this.characterData.raceId === race.id ? 'selected' : ''}" 
                                 data-race="${race.id}">
                                <div class="option-icon">${this._getRaceIcon(race.id)}</div>
                                <div class="option-name">${race.name}</div>
                                <div class="option-desc">${race.description}</div>
                                <div class="option-stats">
                                    ${this._formatStatBonuses(race.statBonus)}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="form-section">
                    <h2>Alignment</h2>
                    <div class="alignment-options">
                        ${Object.values(GameConfig.alignments).map(align => `
                            <label class="alignment-option ${this.characterData.alignment === align.id ? 'selected' : ''}">
                                <input type="radio" name="alignment" value="${align.id}" 
                                       ${this.characterData.alignment === align.id ? 'checked' : ''}>
                                <span class="alignment-name">${align.name}</span>
                            </label>
                        `).join('')}
                    </div>
                    <div class="alignment-detail-box" id="alignmentDetail">
                        ${this._renderAlignmentDetail(this.characterData.alignment)}
                    </div>
                </div>
                
                <div class="form-section">
                    <h2>Why Are You Here?</h2>
                    <p class="section-hint">Choose what brought you to the Shattered Coast<br><span class="no-combat-hint">Story flavor only — does not affect combat stats</span></p>
                    <div class="option-grid motivation-options compact-grid">
                        ${Object.values(GameConfig.motivations).map(mot => `
                            <div class="option-card motivation-card compact-card ${this.characterData.motivation === mot.id ? 'selected' : ''}" 
                                 data-motivation="${mot.id}">
                                <div class="option-icon">${mot.icon}</div>
                                <div class="option-name">${mot.name}</div>
                                <div class="option-desc">${mot.shortDesc}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }
    
    _renderAppearanceStep() {
        const raceData = getRace(this.characterData.raceId);
        const appearance = raceData?.appearance || {};
        
        return `
            <div class="create-step step-appearance">
                <div class="appearance-preview">
                    <div class="preview-portrait">
                        <span class="preview-icon">${this._getClassIcon(this.characterData.classId)}</span>
                    </div>
                    <div class="preview-name">${this.characterData.name || 'Unnamed Hero'}</div>
                </div>
                
                <div class="form-section">
                    <h2>Gender</h2>
                    <div class="gender-options">
                        <label class="gender-option ${this.characterData.sex === 'M' ? 'selected' : ''}">
                            <input type="radio" name="sex" value="M" ${this.characterData.sex === 'M' ? 'checked' : ''}>
                            <span>Male</span>
                        </label>
                        <label class="gender-option ${this.characterData.sex === 'F' ? 'selected' : ''}">
                            <input type="radio" name="sex" value="F" ${this.characterData.sex === 'F' ? 'checked' : ''}>
                            <span>Female</span>
                        </label>
                    </div>
                </div>
                
                <div class="appearance-options">
                    <div class="form-section">
                        <label>Hair Style</label>
                        <select id="hairStyle" class="appearance-select">
                            ${(appearance.hairStyles || ['short', 'medium', 'long']).map(opt => `
                                <option value="${opt}" ${this.characterData.appearance.hairStyle === opt ? 'selected' : ''}>
                                    ${this._capitalize(opt)}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    
                    <div class="form-section">
                        <label>Hair Color</label>
                        <select id="hairColor" class="appearance-select">
                            ${(appearance.hairColors || ['black', 'brown', 'blonde']).map(opt => `
                                <option value="${opt}" ${this.characterData.appearance.hairColor === opt ? 'selected' : ''}>
                                    ${this._capitalize(opt)}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    
                    <div class="form-section">
                        <label>Skin Tone</label>
                        <select id="skinColor" class="appearance-select">
                            ${(appearance.skinColors || ['fair', 'tan', 'dark']).map(opt => `
                                <option value="${opt}" ${this.characterData.appearance.skinColor === opt ? 'selected' : ''}>
                                    ${this._capitalize(opt)}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    
                    <div class="form-section">
                        <label>Eye Color</label>
                        <select id="eyeColor" class="appearance-select">
                            ${(appearance.eyeColors || ['brown', 'blue', 'green']).map(opt => `
                                <option value="${opt}" ${this.characterData.appearance.eyeColor === opt ? 'selected' : ''}>
                                    ${this._capitalize(opt)}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    
                    <div class="form-section">
                        <label>Height</label>
                        <select id="height" class="appearance-select">
                            ${(appearance.heights || ['short', 'average', 'tall']).map(opt => `
                                <option value="${opt}" ${this.characterData.appearance.height === opt ? 'selected' : ''}>
                                    ${this._capitalize(opt)}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    
                    <div class="form-section">
                        <label>Build</label>
                        <select id="build" class="appearance-select">
                            ${(appearance.builds || ['slim', 'average', 'muscular']).map(opt => `
                                <option value="${opt}" ${this.characterData.appearance.build === opt ? 'selected' : ''}>
                                    ${this._capitalize(opt)}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                </div>
            </div>
        `;
    }
    
    _renderAttributesStep() {
        const remaining = this.startingStatPoints - this.usedStatPoints;
        const classData = getClass(this.characterData.classId);
        const raceData = getRace(this.characterData.raceId);
        
        const stats = ['strength', 'dexterity', 'intelligence', 'stamina'];
        const statLabels = {
            strength: { name: 'Strength', abbr: 'STR', desc: 'Physical power, armor effectiveness' },
            dexterity: { name: 'Dexterity', abbr: 'DEX', desc: 'Dodge chance, crit chance' },
            intelligence: { name: 'Intelligence', abbr: 'INT', desc: 'Mana pool' },
            stamina: { name: 'Stamina', abbr: 'STA', desc: 'Health pool, regeneration' }
        };
        
        return `
            <div class="create-step step-attributes">
                <div class="stat-points-header">
                    <h2>Allocate Attributes</h2>
                    <div class="stat-points-remaining">
                        <span class="points-label">Points Remaining:</span>
                        <span class="points-value ${remaining === 0 ? 'complete' : ''}">${remaining}</span>
                    </div>
                </div>
                
                <div class="stat-allocation">
                    ${stats.map(stat => {
                        const base = this.characterData.baseStats[stat];
                        const classBonus = classData?.statBonus?.[stat] || 0;
                        const raceBonus = raceData?.statBonus?.[stat] || 0;
                        const total = base + classBonus + raceBonus;
                        const info = statLabels[stat];
                        const combatHints = this._getStatCombatHints(stat, classData);
                        
                        return `
                            <div class="stat-row">
                                <div class="stat-info">
                                    <span class="stat-name">${info.name}</span>
                                    <span class="stat-abbr">(${info.abbr})</span>
                                    <span class="stat-desc">${info.desc}</span>
                                    ${combatHints ? `<div class="stat-combat-hint">${combatHints}</div>` : ''}
                                </div>
                                <div class="stat-controls">
                                    <button class="stat-btn minus" data-stat="${stat}" ${base <= 0 ? 'disabled' : ''}>-</button>
                                    <div class="stat-values">
                                        <span class="stat-base">${base}</span>
                                        <span class="stat-bonus ${classBonus + raceBonus >= 0 ? 'positive' : 'negative'}">
                                            ${classBonus + raceBonus >= 0 ? '+' : ''}${classBonus + raceBonus}
                                        </span>
                                        <span class="stat-total">= ${total}</span>
                                    </div>
                                    <button class="stat-btn plus" data-stat="${stat}" ${remaining <= 0 ? 'disabled' : ''}>+</button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
                
                <div class="stat-preview">
                    <h3>Derived Stats Preview</h3>
                    <div class="derived-stats">
                        ${this._renderDerivedStats()}
                    </div>
                </div>
            </div>
        `;
    }
    
    _renderDerivedStats() {
        const classData = getClass(this.characterData.classId);
        const raceData = getRace(this.characterData.raceId);
        const derived = classData?.derivedStats || {};
        
        // Calculate total stats
        const total = {};
        for (const stat of ['strength', 'dexterity', 'intelligence', 'stamina']) {
            total[stat] = this.characterData.baseStats[stat] + 
                         (classData?.statBonus?.[stat] || 0) + 
                         (raceData?.statBonus?.[stat] || 0);
        }
        
        // Calculate derived
        const maxHealth = Math.floor(total.stamina * (derived.healthPerStamina || 10));
        const maxMana = Math.floor(total.intelligence * (derived.manaPerIntelligence || 8));
        
        let attack = 0;
        if (derived.attackPerStrength) attack += total.strength * derived.attackPerStrength;
        if (derived.attackPerDexterity) attack += total.dexterity * derived.attackPerDexterity;
        if (derived.attackPerIntelligence) attack += total.intelligence * derived.attackPerIntelligence;
        
        let defense = 0;
        if (derived.defensePerStrength) defense += total.strength * derived.defensePerStrength;
        if (derived.defensePerDexterity) defense += total.dexterity * derived.defensePerDexterity;
        if (derived.defensePerIntelligence) defense += total.intelligence * derived.defensePerIntelligence;
        if (derived.defensePerStamina) defense += total.stamina * derived.defensePerStamina;
        
        // Calculate dodge and crit (0.2% per DEX) - matches Character.js formulas
        const baseDodge = total.dexterity * 0.002;
        const raceDodge = raceData?.traits?.dodgeBonus || 0;
        const dodge = Math.min(baseDodge + raceDodge, 0.5); // Cap at 50%
        
        const baseCrit = total.dexterity * 0.002;  // 0.2% per DEX (matches Character.js)
        const raceCrit = raceData?.traits?.critBonus || 0;
        const crit = Math.min(baseCrit + raceCrit, 0.25);  // Cap at 25% per GameConfig
        
        return `
            <div class="derived-stat">
                <span class="derived-label">Health:</span>
                <span class="derived-value health">${maxHealth}</span>
            </div>
            <div class="derived-stat">
                <span class="derived-label">Mana:</span>
                <span class="derived-value mana">${maxMana}</span>
            </div>
            <div class="derived-stat">
                <span class="derived-label">Attack:</span>
                <span class="derived-value attack">${attack.toFixed(1)}</span>
            </div>
            <div class="derived-stat">
                <span class="derived-label">Defense:</span>
                <span class="derived-value defense">${defense.toFixed(1)}</span>
            </div>
            <div class="derived-stat">
                <span class="derived-label">Dodge:</span>
                <span class="derived-value dodge">${(dodge * 100).toFixed(1)}%</span>
            </div>
            <div class="derived-stat">
                <span class="derived-label">Crit:</span>
                <span class="derived-value crit">${(crit * 100).toFixed(1)}%</span>
            </div>
        `;
    }
    
    _renderReviewStep() {
        const classData = getClass(this.characterData.classId);
        const raceData = getRace(this.characterData.raceId);
        const alignment = GameConfig.alignments[this.characterData.alignment];
        const motivation = GameConfig.motivations[this.characterData.motivation];
        
        return `
            <div class="create-step step-review">
                <div class="review-portrait">
                    <span class="review-icon">${this._getClassIcon(this.characterData.classId)}</span>
                </div>
                
                <div class="review-header">
                    <h2 class="review-name">${this.characterData.name || 'Unnamed Hero'}</h2>
                    <p class="review-subtitle">
                        Level 1 ${raceData?.name} ${classData?.name}
                    </p>
                </div>
                
                <div class="review-sections">
                    <div class="review-section">
                        <h3>Identity</h3>
                        <div class="review-row">
                            <span class="review-label">Class:</span>
                            <span class="review-value">${classData?.name}</span>
                        </div>
                        <div class="review-row">
                            <span class="review-label">Race:</span>
                            <span class="review-value">${raceData?.name}</span>
                        </div>
                        <div class="review-row">
                            <span class="review-label">Alignment:</span>
                            <span class="review-value">${alignment?.name}</span>
                        </div>
                        <div class="review-row">
                            <span class="review-label">Gender:</span>
                            <span class="review-value">${this.characterData.sex === 'M' ? 'Male' : 'Female'}</span>
                        </div>
                        <div class="review-row">
                            <span class="review-label">Motivation:</span>
                            <span class="review-value">${motivation?.icon} ${motivation?.name}</span>
                        </div>
                    </div>
                    
                    <div class="review-section">
                        <h3>Attributes</h3>
                        ${['strength', 'dexterity', 'intelligence', 'stamina'].map(stat => {
                            const base = this.characterData.baseStats[stat];
                            const bonus = (classData?.statBonus?.[stat] || 0) + (raceData?.statBonus?.[stat] || 0);
                            const total = base + bonus;
                            return `
                                <div class="review-row">
                                    <span class="review-label">${this._capitalize(stat)}:</span>
                                    <span class="review-value">${total} <small>(${base} + ${bonus})</small></span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    
                    <div class="review-section">
                        <h3>Appearance</h3>
                        <div class="review-row">
                            <span class="review-label">Hair:</span>
                            <span class="review-value">${this._capitalize(this.characterData.appearance.hairColor)} ${this._capitalize(this.characterData.appearance.hairStyle)}</span>
                        </div>
                        <div class="review-row">
                            <span class="review-label">Eyes:</span>
                            <span class="review-value">${this._capitalize(this.characterData.appearance.eyeColor)}</span>
                        </div>
                        <div class="review-row">
                            <span class="review-label">Build:</span>
                            <span class="review-value">${this._capitalize(this.characterData.appearance.height)}, ${this._capitalize(this.characterData.appearance.build)}</span>
                        </div>
                    </div>
                </div>
                
                <div class="review-confirm">
                    <p>Ready to begin your adventure?</p>
                </div>
            </div>
        `;
    }
    
    _setupEventListeners() {
        // Cancel button
        const cancelBtn = this.container.querySelector('#btnCancel');
        cancelBtn?.addEventListener('click', () => {
            if (this.callbacks.onCancel) {
                this.callbacks.onCancel();
            }
        });
        
        // Navigation buttons
        const prevBtn = this.container.querySelector('#btnPrev');
        const nextBtn = this.container.querySelector('#btnNext');
        
        prevBtn?.addEventListener('click', () => this._prevStep());
        nextBtn?.addEventListener('click', () => this._nextStep());
        
        // Step-specific listeners
        this._setupStepListeners();
    }
    
    _setupStepListeners() {
        switch (this.currentStep) {
            case 1:
                this._setupClassRaceListeners();
                break;
            case 2:
                this._setupAppearanceListeners();
                break;
            case 3:
                this._setupAttributeListeners();
                break;
        }
    }
    
    _setupClassRaceListeners() {
        // Name input
        const nameInput = this.container.querySelector('#charName');
        nameInput?.addEventListener('input', (e) => {
            this.characterData.name = e.target.value;
        });
        
        // Class selection
        const classCards = this.container.querySelectorAll('.class-options .option-card');
        classCards.forEach(card => {
            card.addEventListener('click', () => {
                this.characterData.classId = card.dataset.class;
                classCards.forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
            });
        });
        
        // Race selection
        const raceCards = this.container.querySelectorAll('.race-options .option-card');
        raceCards.forEach(card => {
            card.addEventListener('click', () => {
                this.characterData.raceId = card.dataset.race;
                raceCards.forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
            });
        });
        
        // Alignment selection
        const alignInputs = this.container.querySelectorAll('input[name="alignment"]');
        alignInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                this.characterData.alignment = e.target.value;
                // Update visual selection
                this.container.querySelectorAll('.alignment-option').forEach(opt => {
                    opt.classList.toggle('selected', opt.querySelector('input').value === e.target.value);
                });
                // Update alignment detail box
                const detailBox = this.container.querySelector('#alignmentDetail');
                if (detailBox) {
                    detailBox.innerHTML = this._renderAlignmentDetail(e.target.value);
                }
            });
        });
        
        // Motivation selection
        const motivationCards = this.container.querySelectorAll('.motivation-options .option-card');
        motivationCards.forEach(card => {
            card.addEventListener('click', () => {
                this.characterData.motivation = card.dataset.motivation;
                motivationCards.forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
            });
        });
    }
    
    _setupAppearanceListeners() {
        // Gender selection
        const genderInputs = this.container.querySelectorAll('input[name="sex"]');
        genderInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                this.characterData.sex = e.target.value;
                this.container.querySelectorAll('.gender-option').forEach(opt => {
                    opt.classList.toggle('selected', opt.querySelector('input').value === e.target.value);
                });
            });
        });
        
        // Appearance selects
        const selects = ['hairStyle', 'hairColor', 'skinColor', 'eyeColor', 'height', 'build'];
        selects.forEach(id => {
            const select = this.container.querySelector(`#${id}`);
            select?.addEventListener('change', (e) => {
                this.characterData.appearance[id] = e.target.value;
            });
        });
    }
    
    _setupAttributeListeners() {
        // Stat buttons
        const statBtns = this.container.querySelectorAll('.stat-btn');
        statBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const stat = btn.dataset.stat;
                const isPlus = btn.classList.contains('plus');
                
                if (isPlus) {
                    if (this.usedStatPoints < this.startingStatPoints) {
                        this.characterData.baseStats[stat]++;
                        this.usedStatPoints++;
                    }
                } else {
                    if (this.characterData.baseStats[stat] > 0) {
                        this.characterData.baseStats[stat]--;
                        this.usedStatPoints--;
                    }
                }
                
                // Refresh the step to update UI
                this._refreshStep();
            });
        });
    }
    
    _prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this._init();
        }
    }
    
    _nextStep() {
        // Validate current step
        if (!this._validateCurrentStep()) return;
        
        if (this.currentStep < this.totalSteps) {
            this.currentStep++;
            this._init();
        } else {
            // Create the character
            this._createCharacter();
        }
    }
    
    _validateCurrentStep() {
        switch (this.currentStep) {
            case 1:
                if (!this.characterData.name || this.characterData.name.trim().length < 2) {
                    alert('Please enter a character name (at least 2 characters)');
                    return false;
                }
                if (!this.characterData.motivation) {
                    alert('Please select why your character came to the Shattered Coast');
                    return false;
                }
                return true;
            case 3:
                if (this.usedStatPoints < this.startingStatPoints) {
                    if (!confirm(`You have ${this.startingStatPoints - this.usedStatPoints} unspent stat points. Continue anyway?`)) {
                        return false;
                    }
                }
                return true;
            default:
                return true;
        }
    }
    
    _createCharacter() {
        const result = characterManager.createCharacter(this.characterData);
        
        if (result.success) {
            if (this.callbacks.onComplete) {
                this.callbacks.onComplete(result.character);
            }
        } else {
            alert(result.message);
        }
    }
    
    _refreshStep() {
        const content = this.container.querySelector('#createContent');
        if (content) {
            content.innerHTML = this._renderCurrentStep();
            this._setupStepListeners();
        }
    }
    
    // Helper methods
    
    /**
     * Render alignment combat modifier detail box
     * Reads from GameConfig.alignment.modifiers matrix
     */
    _renderAlignmentDetail(alignmentId) {
        const alignmentConfig = GameConfig.alignment;
        const icons = { good: '😇', neutral: '⚖️', chaotic: '😈' };
        const names = { good: 'Good', neutral: 'Neutral', chaotic: 'Chaotic' };
        const flavors = {
            good: 'Righteous Defender — conviction grants protection against chaotic foes.',
            neutral: 'Balanced Combatant — calm focus provides a modest edge. No penalties.',
            chaotic: 'Reckless Aggressor — unpredictable fury hits hard, but costs defense.'
        };
        
        if (!alignmentConfig?.enabled || !alignmentConfig?.modifiers) {
            return `<div class="alignment-detail-desc">Alignment affects combat modifiers against different enemy types.</div>`;
        }
        
        const mods = alignmentConfig.modifiers[alignmentId];
        if (!mods) return '';
        
        // Build rows for each opponent alignment
        const opponents = ['good', 'neutral', 'chaotic'].filter(a => a !== alignmentId);
        // Put same-alignment at the end
        const allTargets = [...opponents, alignmentId];
        
        const rows = allTargets.map(target => {
            const m = mods[target] || {};
            const atk = m.attack || 0;
            const def = m.defense || 0;
            
            if (atk === 0 && def === 0) {
                return `<div class="alignment-buff-row">
                    <span class="buff-enemy">vs ${names[target]}:</span>
                    <span class="buff-value zero">no effect</span>
                </div>`;
            }
            
            let parts = [];
            if (atk !== 0) {
                const cls = atk > 0 ? 'positive' : 'negative';
                parts.push(`<span class="buff-value ${cls}">${atk > 0 ? '+' : ''}${atk}% ATK</span>`);
            }
            if (def !== 0) {
                const cls = def > 0 ? 'positive' : 'negative';
                parts.push(`<span class="buff-value ${cls}">${def > 0 ? '+' : ''}${def}% DEF</span>`);
            }
            
            return `<div class="alignment-buff-row">
                <span class="buff-enemy">vs ${names[target]}:</span>
                ${parts.join(' ')}
            </div>`;
        }).join('');
        
        return `
            <div class="alignment-detail-title">${icons[alignmentId]} ${names[alignmentId]} — ${flavors[alignmentId]}</div>
            <div class="alignment-buff-list">${rows}</div>
        `;
    }
    
    /**
     * Get class-specific combat hint for a stat (ATK/DEF per point)
     * Reads from classData.derivedStats multipliers
     */
    _getStatCombatHints(stat, classData) {
        if (!classData?.derivedStats) return '';
        const derived = classData.derivedStats;
        
        // Map stat name to derivedStats key suffixes
        const statKey = stat.charAt(0).toUpperCase() + stat.slice(1); // 'strength' -> 'Strength'
        const atkKey = `attackPer${statKey}`;
        const defKey = `defensePer${statKey}`;
        
        const atkVal = derived[atkKey] || 0;
        const defVal = derived[defKey] || 0;
        
        if (atkVal === 0 && defVal === 0) return '';
        
        let parts = [];
        if (atkVal > 0) {
            const label = atkVal === Math.max(
                derived.attackPerStrength || 0,
                derived.attackPerDexterity || 0,
                derived.attackPerIntelligence || 0
            ) ? '' : ' <span class="hint-secondary">(secondary)</span>';
            parts.push(`<span class="hint-atk">⚔️ +${atkVal} Attack</span>${label}`);
        }
        if (defVal > 0) {
            parts.push(`<span class="hint-def">🛡️ +${defVal} Defense</span>`);
        }
        
        return parts.join(' · ') + ' <span class="hint-per-point">per point</span>';
    }

    _getClassIcon(classId) {
        const icons = {
            warrior: '⚔️',
            mage: '🧙',
            rogue: '🗡️'
        };
        return icons[classId] || '👤';
    }
    
    _getRaceIcon(raceId) {
        const icons = {
            human: '👤',
            dwarf: '⛏️',
            elf: '🧝'
        };
        return icons[raceId] || '👤';
    }
    
    _formatStatBonuses(bonuses) {
        if (!bonuses) return '';
        return Object.entries(bonuses)
            .filter(([_, val]) => val !== 0)
            .map(([stat, val]) => {
                const abbr = stat.substring(0, 3).toUpperCase();
                const sign = val >= 0 ? '+' : '';
                return `<span class="${val >= 0 ? 'positive' : 'negative'}">${sign}${val} ${abbr}</span>`;
            })
            .join(' ');
    }
    
    _capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    
    /**
     * Clean up
     */
    destroy() {
        this.container.innerHTML = '';
        this.container.classList.remove('char-create-screen');
    }
}

export default CharacterCreateScreen;
