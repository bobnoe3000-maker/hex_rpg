/**
 * @file StatusIconManager.js
 * @description Manages floating status icons (buffs/debuffs) displayed above entities.
 *              Creates DOM elements for each entity with active status effects.
 *              Icons animate in/out and auto-remove after duration.
 * 
 * @location ui/animations/StatusIconManager.js
 * @usage Created by BattleMapUI, receives STATUS_APPLIED/REMOVED events
 * @dependencies AnimationSettings.js
 * 
 * @version 1.0.0
 * @changelog
 *   - v1.0.0 (2025-02-03): Initial implementation with animated icons
 */

import { AnimationSettings } from '../../config/AnimationSettings.js';

/**
 * Status icon types
 */
export const StatusIconType = {
    BUFF: 'buff',
    DEBUFF: 'debuff'
};

/**
 * StatusIconManager - Manages status effect icons above entities
 */
export class StatusIconManager {
    /**
     * Create a status icon manager
     * @param {HTMLElement} container - Container element (usually .battle-main)
     */
    constructor(container) {
        this.container = container;
        
        // Create layer for status icons
        this.layer = document.createElement('div');
        this.layer.className = 'status-icon-layer';
        this.layer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 25;
            overflow: hidden;
        `;
        this.container.appendChild(this.layer);
        
        // Track icons by entity ID
        this.entityBars = new Map(); // entityId -> { element, icons: Map<effectId, iconEl> }
        
        // Add CSS for status icons
        this._injectStyles();
    }
    
    /**
     * Inject CSS styles for status icons
     */
    _injectStyles() {
        // Check if styles already exist
        if (document.getElementById('status-icon-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'status-icon-styles';
        style.textContent = `
            .status-bar {
                position: absolute;
                display: flex;
                gap: 3px;
                transform: translateX(-50%);
                z-index: 25;
            }
            
            .status-icon {
                width: 20px;
                height: 20px;
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                animation: statusIconPop 0.3s ease-out;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            }
            
            .status-icon.buff {
                background: rgba(68, 170, 255, 0.3);
                border: 1px solid #44aaff;
            }
            
            .status-icon.debuff {
                background: rgba(255, 68, 136, 0.3);
                border: 1px solid #ff4488;
            }
            
            .status-icon.removing {
                animation: statusIconFade 0.3s ease-out forwards;
            }
            
            @keyframes statusIconPop {
                0% {
                    transform: scale(0);
                    opacity: 0;
                }
                50% {
                    transform: scale(1.3);
                }
                100% {
                    transform: scale(1);
                    opacity: 1;
                }
            }
            
            @keyframes statusIconFade {
                0% {
                    transform: scale(1);
                    opacity: 1;
                }
                100% {
                    transform: scale(0.5);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    /**
     * Add a status icon for an entity
     * @param {string} entityId - Entity identifier
     * @param {string} effectId - Effect instance ID
     * @param {Object} screenPos - Screen position {x, y}
     * @param {string} icon - Icon character/emoji
     * @param {string} type - 'buff' or 'debuff'
     * @param {number} [duration=0] - Auto-remove duration in ms (0 = manual removal)
     */
    addStatus(entityId, effectId, screenPos, icon, type = StatusIconType.BUFF, duration = 0) {
        // Check if status icons are enabled
        if (!AnimationSettings.isSubcategoryEnabled('statusIcons')) {
            return;
        }
        
        // Get or create entity bar
        let entry = this.entityBars.get(entityId);
        
        if (!entry) {
            const bar = document.createElement('div');
            bar.className = 'status-bar';
            this.layer.appendChild(bar);
            
            entry = { 
                element: bar, 
                icons: new Map() 
            };
            this.entityBars.set(entityId, entry);
        }
        
        // Update position
        this._updateBarPosition(entry.element, screenPos);
        
        // Check if icon already exists for this effect
        if (entry.icons.has(effectId)) {
            // Refresh existing icon (restart animation)
            const existingIcon = entry.icons.get(effectId);
            existingIcon.style.animation = 'none';
            existingIcon.offsetHeight; // Trigger reflow
            existingIcon.style.animation = '';
            return;
        }
        
        // Create icon element
        const iconEl = document.createElement('div');
        iconEl.className = `status-icon ${type}`;
        iconEl.textContent = icon;
        iconEl.dataset.effectId = effectId;
        
        entry.element.appendChild(iconEl);
        entry.icons.set(effectId, iconEl);
        
        // Auto-remove after duration (if specified)
        if (duration > 0) {
            setTimeout(() => {
                this.removeStatus(entityId, effectId);
            }, duration);
        }
    }
    
    /**
     * Remove a status icon
     * @param {string} entityId - Entity identifier
     * @param {string} effectId - Effect instance ID
     */
    removeStatus(entityId, effectId) {
        const entry = this.entityBars.get(entityId);
        if (!entry) return;
        
        const iconEl = entry.icons.get(effectId);
        if (!iconEl) return;
        
        // Animate removal
        iconEl.classList.add('removing');
        
        // Remove after animation
        setTimeout(() => {
            iconEl.remove();
            entry.icons.delete(effectId);
            
            // Remove bar if no more icons
            if (entry.icons.size === 0) {
                entry.element.remove();
                this.entityBars.delete(entityId);
            }
        }, 300);
    }
    
    /**
     * Update position of an entity's status bar
     * @param {string} entityId - Entity identifier
     * @param {Object} screenPos - Screen position {x, y}
     */
    updatePosition(entityId, screenPos) {
        const entry = this.entityBars.get(entityId);
        if (!entry) return;
        
        this._updateBarPosition(entry.element, screenPos);
    }
    
    /**
     * Update bar element position
     * @param {HTMLElement} element
     * @param {Object} screenPos
     */
    _updateBarPosition(element, screenPos) {
        // Position bar above entity
        element.style.left = `${screenPos.x}px`;
        element.style.top = `${screenPos.y - 55}px`; // Offset above entity
    }
    
    /**
     * Clear all icons for an entity
     * @param {string} entityId - Entity identifier
     */
    clearEntity(entityId) {
        const entry = this.entityBars.get(entityId);
        if (!entry) return;
        
        // Animate all icons out
        for (const iconEl of entry.icons.values()) {
            iconEl.classList.add('removing');
        }
        
        // Remove bar after animation
        setTimeout(() => {
            entry.element.remove();
            this.entityBars.delete(entityId);
        }, 300);
    }
    
    /**
     * Clear all status icons
     */
    clearAll() {
        for (const [entityId, entry] of this.entityBars) {
            entry.element.remove();
        }
        this.entityBars.clear();
    }
    
    /**
     * Get all active effects for an entity
     * @param {string} entityId
     * @returns {string[]} Array of effect IDs
     */
    getActiveEffects(entityId) {
        const entry = this.entityBars.get(entityId);
        if (!entry) return [];
        return Array.from(entry.icons.keys());
    }
    
    /**
     * Check if entity has a specific effect icon
     * @param {string} entityId
     * @param {string} effectId
     * @returns {boolean}
     */
    hasEffect(entityId, effectId) {
        const entry = this.entityBars.get(entityId);
        if (!entry) return false;
        return entry.icons.has(effectId);
    }
    
    /**
     * Cleanup and destroy
     */
    destroy() {
        this.clearAll();
        this.layer.remove();
        this.layer = null;
        this.container = null;
    }
}

export default StatusIconManager;
