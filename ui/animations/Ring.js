/**
 * @file Ring.js
 * @description Expanding ring effect for AoE indicators, impacts, and spell effects.
 *              Ring expands outward from center while fading.
 * 
 * @location ui/animations/Ring.js
 * @usage Created by CanvasOverlay for impact and AoE effects
 * @dependencies None
 * 
 * @version 1.0.0
 * @changelog
 *   - v1.0.0 (2025-02-03): Initial implementation with expansion animation
 */

/**
 * Ring effect - Expanding circle from center
 */
export class Ring {
    /**
     * Create a ring effect
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {Object} config - Configuration options
     * @param {string} [config.color='#ffffff'] - Ring color
     * @param {number} [config.maxRadius=50] - Maximum radius
     * @param {number} [config.duration=400] - Duration in milliseconds
     * @param {number} [config.lineWidth=3] - Ring stroke width
     * @param {boolean} [config.glow=true] - Enable glow effect
     * @param {number} [config.startRadius=0] - Starting radius
     */
    constructor(x, y, config = {}) {
        this.x = x;
        this.y = y;
        
        // Configuration
        this.color = config.color || '#ffffff';
        this.maxRadius = config.maxRadius || 50;
        this.duration = config.duration || 400;
        this.lineWidth = config.lineWidth || 3;
        this.glow = config.glow !== false;
        this.startRadius = config.startRadius || 0;
        
        // State
        this.elapsed = 0;
        this.active = true;
        this.currentRadius = this.startRadius;
    }
    
    /**
     * Update ring animation
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        this.elapsed += dt * 1000;
        
        // Calculate current radius based on progress
        const progress = this.elapsed / this.duration;
        this.currentRadius = this.startRadius + (this.maxRadius - this.startRadius) * progress;
        
        if (this.elapsed >= this.duration) {
            this.active = false;
        }
    }
    
    /**
     * Draw ring to canvas
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    draw(ctx) {
        if (!this.active) return;
        
        const progress = this.elapsed / this.duration;
        const alpha = 1 - progress;
        const width = this.lineWidth * alpha;
        
        ctx.save();
        ctx.globalAlpha = alpha;
        
        // Setup stroke style
        ctx.strokeStyle = this.color;
        ctx.lineWidth = width;
        
        // Add glow
        if (this.glow) {
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 10;
        }
        
        // Draw ring
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.currentRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
    }
}

export default Ring;
