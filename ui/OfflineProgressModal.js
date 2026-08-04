/**
 * @file OfflineProgressModal.js
 * @description Modal UI component for displaying offline progress results.
 *              Shows time away, XP/gold/aether/items/materials earned, and death notification if applicable.
 *              Designed as a one-time display when player returns to the game.
 * 
 * @usage Instantiated by TownScreen when offline progress is detected.
 *        Modal auto-closes when "Claim Rewards" is clicked.
 * @dependencies
 *   - ItemUtils (utils/ItemUtils.js) - for item name/display
 *   - EventBus (systems/EventBus.js) - for save event
 * 
 * @version 1.2.0
 * @changelog
 *   - v1.2.0 (2026-01-31): Added aether display in stats grid.
 *                          Aether shown with ✨ icon alongside other rewards.
 *   - v1.1.0 (2026-01-27): Added housing materials display section.
 *                          Materials shown in stats grid and detailed list.
 *   - v1.0.0 (2025-01-25): Initial implementation
 */

import { ItemUtils } from '../utils/ItemUtils.js';
import { eventBus, GameEvents } from '../systems/EventBus.js';

export class OfflineProgressModal {
    /**
     * @param {HTMLElement} container - Container element for the modal
     * @param {Object} progress - Offline progress results
     * @param {Object} options - Configuration options
     * @param {Function} options.onClose - Callback when modal is closed
     */
    constructor(container, progress, options = {}) {
        this.container = container;
        this.progress = progress;
        this.options = options;
        this.element = null;
        
        this._render();
    }
    
    /**
     * Render the modal
     * @private
     */
    _render() {
        const progress = this.progress;
        
        // Create modal overlay
        this.element = document.createElement('div');
        this.element.className = 'offline-progress-overlay';
        
        // Build content based on progress type
        let content = '';
        
        if (progress.type === 'battle' && (progress.xpEarned > 0 || progress.goldEarned > 0 || progress.kills > 0)) {
            content = this._buildBattleProgressContent(progress);
        } else if (progress.type === 'none' && progress.reason === 'town') {
            content = this._buildTownIdleContent(progress);
        } else {
            content = this._buildNoProgressContent(progress);
        }
        
        this.element.innerHTML = `
            <div class="offline-progress-modal">
                <div class="offline-progress-header">
                    <span class="offline-icon">⏰</span>
                    <h2>Welcome Back!</h2>
                </div>
                ${content}
                <button class="btn-claim-rewards">
                    ${progress.deathOccurred ? '💀 Accept Fate' : '✨ Claim Rewards'}
                </button>
            </div>
        `;
        
        // Add to container
        this.container.appendChild(this.element);
        
        // Setup event listener
        const claimBtn = this.element.querySelector('.btn-claim-rewards');
        claimBtn.addEventListener('click', () => this._handleClaim());
        
        // Animate in
        requestAnimationFrame(() => {
            this.element.classList.add('visible');
        });
    }
    
    /**
     * Build content for battle progress
     * @private
     */
    _buildBattleProgressContent(progress) {
        // Time info
        let timeInfo = `<p class="offline-time">You were away for <strong>${progress.timeAwayFormatted}</strong>`;
        if (progress.wasCapped) {
            timeInfo += ` (${progress.progressTimeFormatted} of progress applied)`;
        }
        timeInfo += '</p>';
        
        // Location info
        const locationInfo = `<p class="offline-location">Your character continued battling in <strong>${progress.mapName || 'the wilderness'}</strong></p>`;
        
        // Death warning
        let deathWarning = '';
        if (progress.deathOccurred) {
            deathWarning = `
                <div class="offline-death-warning">
                    <span class="death-icon">💀</span>
                    <div class="death-text">
                        <strong>You were slain!</strong>
                        <p>After ${progress.deathTimeFormatted}, your character fell in battle.</p>
                        <p>Rewards reduced by 50%.</p>
                        ${progress.droppedItems && progress.droppedItems.length > 0 
                            ? `<p class="items-lost">Items lost: ${progress.droppedItems.map(i => ItemUtils.getName(i)).join(', ')}</p>`
                            : '<p class="items-safe">No items were lost.</p>'
                        }
                    </div>
                </div>
            `;
        }
        
        // Calculate total materials count
        const totalMaterials = progress.materialsFound?.reduce((sum, m) => sum + m.quantity, 0) || 0;
        
        // Stats summary (now includes aether - NEW v1.2.0)
        const statsSummary = `
            <div class="offline-stats-grid">
                <div class="offline-stat">
                    <span class="stat-icon">⚔️</span>
                    <span class="stat-value">${progress.kills}</span>
                    <span class="stat-label">Enemies Slain</span>
                </div>
                <div class="offline-stat">
                    <span class="stat-icon">⭐</span>
                    <span class="stat-value">${this._formatNumber(progress.xpEarned)}</span>
                    <span class="stat-label">XP Earned</span>
                </div>
                <div class="offline-stat">
                    <span class="stat-icon">💰</span>
                    <span class="stat-value">${this._formatNumber(progress.goldEarned)}</span>
                    <span class="stat-label">Gold Found</span>
                </div>
                ${progress.aetherEarned > 0 ? `
                <div class="offline-stat aether-stat">
                    <span class="stat-icon">✨</span>
                    <span class="stat-value">${this._formatNumber(progress.aetherEarned)}</span>
                    <span class="stat-label">Aether</span>
                </div>
                ` : ''}
                <div class="offline-stat">
                    <span class="stat-icon">🎒</span>
                    <span class="stat-value">${progress.itemsFound?.length || 0}</span>
                    <span class="stat-label">Items Found</span>
                </div>
                ${totalMaterials > 0 ? `
                <div class="offline-stat">
                    <span class="stat-icon">🏠</span>
                    <span class="stat-value">${totalMaterials}</span>
                    <span class="stat-label">Materials</span>
                </div>
                ` : ''}
            </div>
        `;
        
        // Level up notification
        let levelUpNotice = '';
        if (progress.levelsGained && progress.levelsGained > 0) {
            levelUpNotice = `
                <div class="offline-levelup">
                    🎉 You gained <strong>${progress.levelsGained}</strong> level${progress.levelsGained > 1 ? 's' : ''}!
                </div>
            `;
        }
        
        // Items list (if any found)
        let itemsList = '';
        if (progress.itemsFound && progress.itemsFound.length > 0) {
            const itemsHtml = progress.itemsFound.slice(0, 10).map(item => {
                const name = ItemUtils.getName(item);
                const tierClass = `tier-${item.tier || 0}`;
                return `<span class="offline-item ${tierClass}">${name}</span>`;
            }).join('');
            
            const overflow = progress.itemsFound.length > 10 
                ? `<span class="offline-items-more">+${progress.itemsFound.length - 10} more</span>` 
                : '';
            
            itemsList = `
                <div class="offline-items-section">
                    <h3>Items Found</h3>
                    <div class="offline-items-list">
                        ${itemsHtml}
                        ${overflow}
                    </div>
                </div>
            `;
        }
        
        // Materials list (v1.1.0)
        let materialsList = '';
        if (progress.materialsFound && progress.materialsFound.length > 0) {
            const materialsHtml = progress.materialsFound.map(mat => {
                const tierClass = `material-tier-${mat.tier || 1}`;
                return `
                    <span class="offline-material ${tierClass}">
                        <span class="material-icon">${mat.icon || '📦'}</span>
                        <span class="material-name">${mat.name}</span>
                        <span class="material-qty">×${mat.quantity}</span>
                    </span>
                `;
            }).join('');
            
            materialsList = `
                <div class="offline-materials-section">
                    <h3>🏠 Housing Materials</h3>
                    <div class="offline-materials-list">
                        ${materialsHtml}
                    </div>
                </div>
            `;
        }
        
        // Overflow notice (items converted to gold)
        let overflowNotice = '';
        if (progress.itemsOverflow && progress.itemsOverflow.length > 0) {
            const totalGold = progress.itemsOverflow.reduce((sum, o) => sum + o.goldValue, 0);
            overflowNotice = `
                <div class="offline-overflow-notice">
                    ⚠️ Inventory full! ${progress.itemsOverflow.length} item(s) sold for ${totalGold} gold.
                </div>
            `;
        }
        
        return `
            ${timeInfo}
            ${locationInfo}
            ${deathWarning}
            ${statsSummary}
            ${levelUpNotice}
            ${itemsList}
            ${materialsList}
            ${overflowNotice}
        `;
    }
    
    /**
     * Build content for town idle (no progress)
     * @private
     */
    _buildTownIdleContent(progress) {
        return `
            <p class="offline-time">You were away for <strong>${progress.timeAwayFormatted}</strong></p>
            <div class="offline-town-notice">
                <span class="town-icon">🏠</span>
                <p>Your character rested safely in town.</p>
                <p class="offline-hint">Travel to a battle map before leaving to earn offline progress!</p>
            </div>
        `;
    }
    
    /**
     * Build content when no progress applies
     * @private
     */
    _buildNoProgressContent(progress) {
        let reason = 'No offline progress was earned.';
        
        switch (progress.reason) {
            case 'excluded_map':
                reason = 'This area does not support offline progress.';
                break;
            case 'invalid_map':
                reason = 'Your last location could not be found.';
                break;
            case 'no_npcs':
                reason = 'No enemies were available in this area.';
                break;
        }
        
        return `
            <p class="offline-time">You were away for <strong>${progress.timeAwayFormatted}</strong></p>
            <div class="offline-no-progress">
                <p>${reason}</p>
            </div>
        `;
    }
    
    /**
     * Handle claim button click
     * @private
     */
    _handleClaim() {
        // Trigger save
        eventBus.emit(GameEvents.SAVE_GAME);
        
        // Animate out
        this.element.classList.remove('visible');
        
        // Destroy after animation
        setTimeout(() => {
            this.destroy();
            
            // Call close callback
            if (this.options.onClose) {
                this.options.onClose();
            }
        }, 300);
    }
    
    /**
     * Format large numbers
     * @private
     */
    _formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }
    
    /**
     * Destroy the modal
     */
    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        this.element = null;
    }
}

export default OfflineProgressModal;
