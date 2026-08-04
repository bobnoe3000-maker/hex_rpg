/**
 * @file SkillTreeUI.js
 * @description Skill tree visualization and interaction interface.
 *              Shows all 3 branches side-by-side with compact skill boxes.
 *              Click any skill to view details in a slide-up panel.
 * 
 * @location ui/SkillTreeUI.js
 * @usage Imported by TownScreen.js
 * @dependencies config/skillConfig.js, models/Skill.js, systems/EventBus.js, utils/SkillUtils.js
 * 
 * @version 2.1.0
 * @changelog
 *   - v2.1.0 (2025-01-26): Fixed skill detail popup height constraint - overlay now appended to
 *                          document.body to escape parent container overflow limits. Equip section
 *                          moved above Learn/Upgrade button for better visibility.
 *   - v2.0.0 (2025-01-26): Complete redesign - 3-column side-by-side layout with all branches
 *                          visible. Compact skill boxes show type (ACT/PAS/TOG), rank pips,
 *                          and status. Slide-up detail panel for skill info, learn, and equip.
 *   - v1.2.0 (2025-01-10): Fixed currentSkill.name crash using SkillUtils for safe property access
 *   - v1.1.0 (2025-01-10): Added skill equip/unequip functionality for active skills
 *   - v1.0.0 (2025-01-10): Initial implementation
 */

import { 
    getSkillsForBranch, 
    getBranchesForClass, 
    getTierRequirements,
    canLearnSkill,
    SkillConstants,
    SkillType
} from '../config/skillConfig.js';
import { Skill } from '../models/Skill.js';
import { eventBus, GameEvents } from '../systems/EventBus.js';
import { SkillUtils } from '../utils/SkillUtils.js';

export class SkillTreeUI {
    /**
     * Create skill tree UI
     * @param {HTMLElement} container - Container element
     * @param {Object} character - Player character
     * @param {Function} onClose - Callback when closed
     */
    constructor(container, character, onClose) {
        this.container = container;
        this.character = character;
        this.onClose = onClose;
        
        this.selectedSkill = null;
        this.selectedBranchId = null;
        this.showDetailPanel = false;
        this.detailOverlay = null; // Will be appended to document.body
        
        this._init();
    }
    
    _init() {
        this._render();
        this._setupEventListeners();
    }
    
    _render() {
        const branches = getBranchesForClass(this.character.classId);
        const branchIds = Object.keys(branches);
        
        // Render skill tree in container
        this.container.innerHTML = `
            <div class="skill-tree-modal">
                <div class="skill-tree-header">
                    <div class="skill-header-left">
                        <h2>⚔️ Skills - ${this._capitalize(this.character.classId)}</h2>
                        <div class="skill-points-display">
                            Skill Points: <span class="skill-points-value">${this.character.unspentSkillPoints || 0}</span>
                        </div>
                    </div>
                    <button class="btn-close-skills">✕</button>
                </div>
                
                <div class="skill-branches-container">
                    ${branchIds.map(branchId => this._renderBranchColumn(branchId, branches[branchId])).join('')}
                </div>
            </div>
        `;
        
        // Create or update detail overlay (appended to body to escape all parent constraints)
        if (!this.detailOverlay) {
            this.detailOverlay = document.createElement('div');
            this.detailOverlay.className = 'skill-detail-overlay';
            this.detailOverlay.id = 'skillDetailOverlay';
            document.body.appendChild(this.detailOverlay);
        }
        
        // Update overlay content and visibility
        this.detailOverlay.innerHTML = `
            <div class="skill-detail-panel">
                ${this.selectedSkill ? this._renderSkillDetail() : ''}
            </div>
        `;
        
        if (this.showDetailPanel) {
            this.detailOverlay.classList.add('visible');
        } else {
            this.detailOverlay.classList.remove('visible');
        }
    }
    
    _renderBranchColumn(branchId, branchData) {
        const skills = getSkillsForBranch(this.character.classId, branchId);
        const learnedSkills = this.character.learnedSkills || {};
        
        // Calculate points spent in this branch
        let pointsSpent = 0;
        skills.forEach(skill => {
            const learned = learnedSkills[skill.id];
            if (learned?.rank > 0) {
                pointsSpent += learned.rank;
            }
        });
        
        const branchIcons = {
            'berserker': '🔥', 'guardian': '🛡️', 'warlord': '👑',
            'elementalist': '🌟', 'arcanist': '✨', 'sorcerer': '🔮',
            'assassin': '🗡️', 'ranger': '🏹', 'shadow': '👤'
        };
        
        return `
            <div class="skill-branch-column" data-branch="${branchId}">
                <div class="branch-header">
                    <span class="branch-icon">${branchIcons[branchId] || '⚔️'}</span>
                    <span class="branch-name">${branchData.name}</span>
                    <span class="branch-progress">${pointsSpent} pts</span>
                </div>
                <div class="skill-grid">
                    ${skills.map(skill => this._renderSkillBox(skill, branchId)).join('')}
                </div>
            </div>
        `;
    }
    
    _renderSkillBox(skill, branchId) {
        const learnedSkills = this.character.learnedSkills || {};
        const learned = learnedSkills[skill.id];
        const rank = learned?.rank || 0;
        const canLearn = canLearnSkill(skill, this.character, this._getLearnedSkillsMap());
        const tierReqs = getTierRequirements(skill.tier);
        
        // Determine state
        let stateClass = 'locked';
        if (rank > 0) {
            stateClass = rank >= SkillConstants.MAX_RANK ? 'maxed' : 'learned';
        } else if (canLearn.canLearn) {
            stateClass = 'available';
        }
        
        const isSelected = this.selectedSkill?.id === skill.id;
        
        // Get equipped slot if any
        const equippedSlot = this.character.getSkillSlot ? this.character.getSkillSlot(skill.id) : -1;
        
        // Type badge text
        const typeLabels = {
            [SkillType.PASSIVE]: 'PAS',
            [SkillType.ACTIVE]: 'ACT',
            [SkillType.TOGGLE]: 'TOG',
            [SkillType.TRIGGERED]: 'TRG'
        };
        
        // Status badge
        let statusBadge = '';
        if (rank >= SkillConstants.MAX_RANK) {
            statusBadge = `<span class="status-badge max">MAX</span>`;
        } else if (equippedSlot !== -1) {
            statusBadge = `<span class="status-badge equipped">Slot ${equippedSlot + 1}</span>`;
        } else if (rank > 0) {
            // Learned but not equipped - no badge needed, rank pips show it
        } else if (canLearn.canLearn) {
            statusBadge = `<span class="status-badge learn">Learn</span>`;
        } else {
            statusBadge = `<span class="status-badge locked">Lv ${tierReqs.minLevel}</span>`;
        }
        
        // Render rank pips
        const rankPips = [];
        for (let i = 0; i < SkillConstants.MAX_RANK; i++) {
            const filled = i < rank;
            const maxed = rank >= SkillConstants.MAX_RANK;
            rankPips.push(`<div class="rank-pip ${filled ? 'filled' : ''} ${filled && maxed ? 'maxed' : ''}"></div>`);
        }
        
        return `
            <div class="skill-box ${stateClass} ${isSelected ? 'selected' : ''}"
                 data-skill-id="${skill.id}"
                 data-branch-id="${branchId}">
                <span class="type-badge ${skill.type}">${typeLabels[skill.type] || 'ACT'}</span>
                <div class="skill-box-top">
                    <div class="skill-icon">${this._getSkillIcon(skill)}</div>
                    <span class="skill-name">${skill.name}</span>
                </div>
                <div class="skill-box-bottom">
                    <div class="rank-pips">${rankPips.join('')}</div>
                    ${statusBadge}
                </div>
            </div>
        `;
    }
    
    _renderSkillDetail() {
        const skill = this.selectedSkill;
        if (!skill) return '';
        
        const learnedSkills = this.character.learnedSkills || {};
        const learned = learnedSkills[skill.id];
        const currentRank = learned?.rank || 0;
        const canLearn = canLearnSkill(skill, this.character, this._getLearnedSkillsMap());
        const tierReqs = getTierRequirements(skill.tier);
        
        // Get rank descriptions
        const rankDescriptions = skill.rankDescriptions || {};
        const currentDesc = currentRank > 0 
            ? (rankDescriptions[currentRank] || skill.description)
            : null;
        const nextDesc = currentRank < SkillConstants.MAX_RANK 
            ? rankDescriptions[currentRank + 1] 
            : null;
        
        // Render rank bar
        const rankSegments = [];
        for (let i = 0; i < SkillConstants.MAX_RANK; i++) {
            const filled = i < currentRank;
            const maxed = currentRank >= SkillConstants.MAX_RANK;
            rankSegments.push(`<div class="rank-segment ${filled ? 'filled' : ''} ${filled && maxed ? 'max' : ''}"></div>`);
        }
        
        // Type badge class
        const typeClass = skill.type || 'active';
        
        return `
            <div class="detail-header">
                <div class="detail-icon">${this._getSkillIcon(skill)}</div>
                <div class="detail-title">
                    <h3>${skill.name}</h3>
                    <div class="detail-badges">
                        <span class="detail-type-badge ${typeClass}">${this._formatType(skill.type)}</span>
                        <span class="detail-tier-badge">Tier ${skill.tier}</span>
                    </div>
                </div>
                <button class="btn-close-detail" id="btnCloseDetail">✕</button>
            </div>
            
            <div class="detail-body">
                <p class="detail-description">${skill.description}</p>
                
                <div class="detail-stats">
                    ${skill.manaCost > 0 ? `<div class="detail-stat">💧 Mana: ${skill.manaCost}</div>` : ''}
                    ${skill.cooldown > 0 ? `<div class="detail-stat">⏱️ CD: ${skill.cooldown / 1000}s</div>` : ''}
                    ${skill.range ? `<div class="detail-stat">📏 Range: ${skill.range}</div>` : ''}
                </div>
                
                <div class="rank-section">
                    <div class="rank-header">
                        <span class="rank-title">Rank</span>
                        <span class="rank-value ${currentRank === 0 ? 'not-learned' : ''}">${currentRank} / ${SkillConstants.MAX_RANK}</span>
                    </div>
                    <div class="rank-bar">${rankSegments.join('')}</div>
                    ${currentRank > 0 && currentDesc ? `
                        <div class="rank-effect">
                            <strong>Current:</strong> ${currentDesc}
                        </div>
                    ` : ''}
                    ${nextDesc && currentRank < SkillConstants.MAX_RANK ? `
                        <div class="rank-next">
                            <strong>Next:</strong> ${nextDesc}
                        </div>
                    ` : ''}
                </div>
                
                <div class="requirements">
                    <div class="req ${this.character.level >= tierReqs.minLevel ? 'met' : 'unmet'}">
                        ${this.character.level >= tierReqs.minLevel ? '✓' : '✗'} Level ${tierReqs.minLevel}
                    </div>
                    <div class="req ${(this.character.unspentSkillPoints || 0) >= tierReqs.skillPointCost ? 'met' : 'unmet'}">
                        ${(this.character.unspentSkillPoints || 0) >= tierReqs.skillPointCost ? '✓' : '✗'} ${tierReqs.skillPointCost} Skill Point${tierReqs.skillPointCost > 1 ? 's' : ''}
                    </div>
                </div>
                
                <div class="detail-actions">
                    ${currentRank > 0 && skill.type !== SkillType.PASSIVE ? `
                        <div class="equip-section">
                            ${this._renderEquipControls(skill)}
                        </div>
                    ` : ''}
                    
                    ${currentRank >= SkillConstants.MAX_RANK ? `
                        <div class="maxed-badge">✨ Max Rank Achieved</div>
                    ` : `
                        <button class="btn-learn ${canLearn.canLearn ? '' : 'disabled'}"
                                data-skill-id="${skill.id}"
                                ${canLearn.canLearn ? '' : 'disabled'}>
                            ${currentRank === 0 ? 'Learn Skill' : 'Upgrade Skill'}
                            ${!canLearn.canLearn ? `<span class="reason">(${canLearn.reason})</span>` : ''}
                        </button>
                    `}
                </div>
            </div>
        `;
    }
    
    _renderEquipControls(skill) {
        const equippedSlot = this.character.getSkillSlot ? this.character.getSkillSlot(skill.id) : -1;
        const isEquipped = equippedSlot !== -1;
        
        // Build slot buttons
        let slotButtons = '';
        for (let i = 0; i < 5; i++) {
            const currentSkill = this.character.activeSkills ? this.character.activeSkills[i] : null;
            const currentName = currentSkill ? SkillUtils.getName(currentSkill) : null;
            const isCurrent = equippedSlot === i;
            const isOccupied = currentSkill && !isCurrent;
            
            let slotLabel = 'Empty';
            if (isCurrent) {
                slotLabel = 'Here';
            } else if (currentName) {
                slotLabel = currentName.length > 5 ? currentName.substring(0, 5) : currentName;
            }
            
            slotButtons += `
                <button class="btn-slot ${isCurrent ? 'current' : ''} ${isOccupied ? 'occupied' : ''}"
                        data-skill-id="${skill.id}"
                        data-slot="${i}">
                    <span class="slot-num">${i + 1}</span>
                    <span class="slot-label">${slotLabel}</span>
                </button>
            `;
        }
        
        return `
            <div class="equip-label">Equip to slot:</div>
            <div class="equip-slots">${slotButtons}</div>
            ${isEquipped ? `
                <div class="equipped-info">
                    <span>✓ Equipped in Slot ${equippedSlot + 1}</span>
                    <button class="btn-unequip" data-skill-id="${skill.id}" data-slot="${equippedSlot}">Unequip</button>
                </div>
            ` : ''}
        `;
    }
    
    _getSkillIcon(skill) {
        const branchIcons = {
            'berserker': '🔥', 'guardian': '🛡️', 'warlord': '👑',
            'elementalist': '🌟', 'arcanist': '✨', 'sorcerer': '🔮',
            'assassin': '🗡️', 'ranger': '🏹', 'shadow': '👤'
        };
        
        const typeIcons = {
            [SkillType.PASSIVE]: '⭐',
            [SkillType.ACTIVE]: '⚔️',
            [SkillType.TOGGLE]: '🔄',
            [SkillType.TRIGGERED]: '⚡'
        };
        
        return branchIcons[skill.branch] || typeIcons[skill.type] || '⚔️';
    }
    
    _formatType(type) {
        if (!type) return 'Active';
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
    
    _capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    
    _getLearnedSkillsMap() {
        const map = {};
        if (this.character.learnedSkills) {
            for (const [id, skill] of Object.entries(this.character.learnedSkills)) {
                map[id] = skill.rank || 1;
            }
        }
        return map;
    }
    
    _setupEventListeners() {
        // Close button
        this.container.querySelector('.btn-close-skills')?.addEventListener('click', () => {
            this.destroy();
            if (this.onClose) this.onClose();
        });
        
        // Skill boxes
        this.container.querySelectorAll('.skill-box').forEach(box => {
            box.addEventListener('click', () => {
                const skillId = box.dataset.skillId;
                const branchId = box.dataset.branchId;
                this._selectSkill(skillId, branchId);
            });
        });
        
        // Close detail panel
        this.detailOverlay?.querySelector('#btnCloseDetail')?.addEventListener('click', () => {
            this._closeDetailPanel();
        });
        
        // Close on overlay click
        this.detailOverlay?.addEventListener('click', (e) => {
            if (e.target.classList.contains('skill-detail-overlay')) {
                this._closeDetailPanel();
            }
        });
        
        // Learn button
        this.detailOverlay?.querySelector('.btn-learn')?.addEventListener('click', (e) => {
            const skillId = e.currentTarget.dataset.skillId;
            if (skillId && !e.currentTarget.disabled) {
                this._learnSkill(skillId);
            }
        });
        
        // Equip to slot buttons
        this.detailOverlay?.querySelectorAll('.btn-slot').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const skillId = btn.dataset.skillId;
                const slot = parseInt(btn.dataset.slot);
                if (skillId && !isNaN(slot)) {
                    this._equipSkill(skillId, slot);
                }
            });
        });
        
        // Unequip button
        this.detailOverlay?.querySelector('.btn-unequip')?.addEventListener('click', (e) => {
            e.stopPropagation();
            const slot = parseInt(e.currentTarget.dataset.slot);
            if (!isNaN(slot)) {
                this._unequipSkill(slot);
            }
        });
    }
    
    _selectSkill(skillId, branchId) {
        const skills = getSkillsForBranch(this.character.classId, branchId);
        this.selectedSkill = skills.find(s => s.id === skillId);
        this.selectedBranchId = branchId;
        this.showDetailPanel = true;
        this._render();
        this._setupEventListeners();
    }
    
    _closeDetailPanel() {
        this.showDetailPanel = false;
        this.selectedSkill = null;
        this._render();
        this._setupEventListeners();
    }
    
    _learnSkill(skillId) {
        if (!this.selectedBranchId) return;
        
        const skills = getSkillsForBranch(this.character.classId, this.selectedBranchId);
        const skillConfig = skills.find(s => s.id === skillId);
        if (!skillConfig) return;
        
        const canLearn = canLearnSkill(skillConfig, this.character, this._getLearnedSkillsMap());
        if (!canLearn.canLearn) return;
        
        const tierReqs = getTierRequirements(skillConfig.tier);
        
        if (!this.character.learnedSkills) {
            this.character.learnedSkills = {};
        }
        
        const existing = this.character.learnedSkills[skillId];
        
        if (existing) {
            existing.upgrade();
        } else {
            const newSkill = Skill.create(skillId, 1);
            if (newSkill) {
                this.character.learnedSkills[skillId] = newSkill;
            }
        }
        
        this.character.unspentSkillPoints = (this.character.unspentSkillPoints || 0) - tierReqs.skillPointCost;
        
        eventBus.emit(GameEvents.CHARACTER_STAT_CHANGE, {
            character: this.character,
            type: 'skill_learned',
            skillId: skillId
        });
        
        // Save game
        eventBus.emit(GameEvents.SAVE_GAME);
        
        // Re-render with panel still open
        this._render();
        this._setupEventListeners();
    }
    
    _equipSkill(skillId, slot) {
        if (!this.character.equipSkill) {
            console.warn('Character.equipSkill not available');
            return;
        }
        
        const result = this.character.equipSkill(skillId, slot);
        if (result.success) {
            eventBus.emit(GameEvents.SAVE_GAME);
            this._render();
            this._setupEventListeners();
        } else {
            console.warn('Failed to equip skill:', result.reason);
        }
    }
    
    _unequipSkill(slot) {
        if (!this.character.unequipSkill) {
            console.warn('Character.unequipSkill not available');
            return;
        }
        
        const result = this.character.unequipSkill(slot);
        if (result.success) {
            eventBus.emit(GameEvents.SAVE_GAME);
            this._render();
            this._setupEventListeners();
        } else {
            console.warn('Failed to unequip skill:', result.reason);
        }
    }
    
    refresh() {
        this._render();
        this._setupEventListeners();
    }
    
    destroy() {
        this.container.innerHTML = '';
        
        // Remove detail overlay from document body
        if (this.detailOverlay) {
            this.detailOverlay.remove();
            this.detailOverlay = null;
        }
    }
}

export default SkillTreeUI;
