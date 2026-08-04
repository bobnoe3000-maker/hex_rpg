/**
 * @file FloatingTextPool.js
 * @description Object pool for floating text DOM elements used in combat animations.
 *              Pre-allocates reusable elements to avoid DOM creation overhead during combat.
 *              Uses CSS animations for GPU-accelerated rendering.
 * 
 * @location ui/animations/FloatingTextPool.js
 * @usage Created by AnimationManager, spawns floating damage/heal/miss text
 * @dependencies AnimationConfig.js
 * 
 * @version 1.0.0
 * @changelog
 *   - v1.0.0 (2025-01-18): Initial implementation with pooling and CSS animations
 */

import { 
    AnimationLimits, 
    FloatingTextTypes, 
    PositionOffsets,
    AnimationTiming 
} from './AnimationConfig.js';

/**
 * FloatingTextPool - Manages pooled DOM elements for floating combat text
 */
export class FloatingTextPool {
    /**
     * Create a FloatingTextPool
     * @param {HTMLElement} container - Container element for floating text layer
     * @param {number} poolSize - Number of elements to pre-allocate
     */
    constructor(container, poolSize = AnimationLimits.POOL_SIZE) {
        this.container = container;
        this.poolSize = poolSize;
        
        // Pool arrays
        this.pool = [];          // Available elements
        this.active = new Set(); // Currently animating elements
        
        // Type counters for per-type limits
        this.typeCounts = {
            damage: 0,
            critical: 0,
            heal: 0,
            miss: 0
        };
        
        // Recent spawn positions for stacking offset
        this.recentPositions = new Map(); // "x,y" -> timestamp
        
        // Initialize pool
        this._initPool();
    }
    
    /**
     * Pre-allocate pool elements
     */
    _initPool() {
        for (let i = 0; i < this.poolSize; i++) {
            const el = this._createElement();
            this.pool.push(el);
        }
    }
    
    /**
     * Create a single floating text element
     * @returns {HTMLElement}
     */
    _createElement() {
        const el = document.createElement('div');
        el.className = 'floating-text';
        el.style.display = 'none';
        el.setAttribute('aria-hidden', 'true');
        this.container.appendChild(el);
        return el;
    }
    
    /**
     * Get an element from the pool (or create new if pool empty)
     * @returns {HTMLElement}
     */
    _acquire() {
        let el = this.pool.pop();
        
        if (!el) {
            // Pool exhausted - create new element
            el = this._createElement();
            console.warn('[FloatingTextPool] Pool exhausted, creating new element');
        }
        
        this.active.add(el);
        return el;
    }
    
    /**
     * Return an element to the pool
     * @param {HTMLElement} el 
     */
    _release(el) {
        // Reset element state
        el.style.display = 'none';
        el.className = 'floating-text';
        el.textContent = '';
        el.style.left = '';
        el.style.top = '';
        
        this.active.delete(el);
        this.pool.push(el);
    }
    
    /**
     * Check if we can spawn a new animation of the given type
     * @param {string} type - Animation type (damage, critical, heal, miss)
     * @returns {boolean}
     */
    canSpawn(type) {
        // Check global limit
        if (this.active.size >= AnimationLimits.MAX_FLOATING_TEXT) {
            return false;
        }
        
        // Check per-type limit
        const typeLimit = AnimationLimits.PER_TYPE[type];
        if (typeLimit && this.typeCounts[type] >= typeLimit) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Calculate stacking offset for overlapping positions
     * @param {number} x - Base X position
     * @param {number} y - Base Y position
     * @returns {object} Adjusted {x, y} with offset
     */
    _getStackedPosition(x, y) {
        const key = `${Math.round(x / 10)},${Math.round(y / 10)}`;
        const now = Date.now();
        
        // Clean old entries
        for (const [k, time] of this.recentPositions.entries()) {
            if (now - time > 500) {
                this.recentPositions.delete(k);
            }
        }
        
        // Check if position was recently used
        let offsetMultiplier = 0;
        if (this.recentPositions.has(key)) {
            offsetMultiplier = 1;
        }
        
        this.recentPositions.set(key, now);
        
        // Apply random spread + stacking offset
        const spreadX = (Math.random() - 0.5) * PositionOffsets.X_SPREAD;
        const spreadY = (Math.random() - 0.5) * PositionOffsets.Y_SPREAD;
        const stackY = offsetMultiplier * PositionOffsets.STACK_OFFSET;
        
        return {
            x: x + spreadX,
            y: y + PositionOffsets.BASE_Y_OFFSET + spreadY - stackY
        };
    }
    
    /**
     * Spawn a floating text animation
     * @param {string} type - Type: 'damage', 'critical', 'heal', 'miss'
     * @param {string|number} value - The value to display (damage amount, etc.)
     * @param {number} x - Screen X coordinate (center of hex)
     * @param {number} y - Screen Y coordinate (center of hex)
     * @returns {boolean} True if spawned, false if throttled
     */
    spawn(type, value, x, y) {
        // Check limits
        if (!this.canSpawn(type)) {
            return false;
        }
        
        const typeConfig = FloatingTextTypes[type];
        if (!typeConfig) {
            console.warn(`[FloatingTextPool] Unknown type: ${type}`);
            return false;
        }
        
        // Get pooled element
        const el = this._acquire();
        
        // Calculate position with stacking
        const pos = this._getStackedPosition(x, y);
        
        // Format text
        let text;
        if (typeConfig.text) {
            // Static text (e.g., "Miss")
            text = typeConfig.text;
        } else {
            // Value with prefix/suffix
            text = `${typeConfig.prefix || ''}${value}${typeConfig.suffix || ''}`;
        }
        
        // Configure element
        el.textContent = text;
        el.className = `floating-text ${typeConfig.cssClass}`;
        el.style.left = `${pos.x}px`;
        el.style.top = `${pos.y}px`;
        el.style.display = 'block';
        
        // Update type counter
        this.typeCounts[type]++;
        
        // Setup animation end handler
        const cleanup = () => {
            el.removeEventListener('animationend', cleanup);
            this.typeCounts[type]--;
            this._release(el);
        };
        
        el.addEventListener('animationend', cleanup, { once: true });
        
        // Fallback timeout in case animationend doesn't fire
        setTimeout(() => {
            if (this.active.has(el)) {
                cleanup();
            }
        }, typeConfig.duration + AnimationTiming.CLEANUP_BUFFER);
        
        return true;
    }
    
    /**
     * Get current active animation count
     * @returns {number}
     */
    getActiveCount() {
        return this.active.size;
    }
    
    /**
     * Clear all active animations
     */
    clearAll() {
        for (const el of this.active) {
            el.style.display = 'none';
            el.className = 'floating-text';
            this.pool.push(el);
        }
        this.active.clear();
        this.typeCounts = { damage: 0, critical: 0, heal: 0, miss: 0 };
        this.recentPositions.clear();
    }
    
    /**
     * Destroy the pool and remove all elements
     */
    destroy() {
        // Clear active animations
        this.clearAll();
        
        // Remove all elements from DOM
        for (const el of this.pool) {
            el.remove();
        }
        
        this.pool = [];
        this.active.clear();
    }
}

export default FloatingTextPool;
