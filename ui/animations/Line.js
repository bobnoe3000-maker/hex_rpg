/**
 * @file Line.js
 * @description Animated line effect for attack indicators. Draws a gradient line
 *              from attacker to defender with fade-out animation.
 * 
 * @location ui/animations/Line.js
 * @usage Created by CanvasOverlay for attack effects
 * @dependencies None
 * 
 * @version 1.0.0
 * @changelog
 *   - v1.0.0 (2025-02-03): Initial implementation with gradient and glow
 */

/**
 * Line effect - Animated attack line from source to target
 */
export class Line {
    /**
     * Create a line effect
     * @param {number} x1 - Start X
     * @param {number} y1 - Start Y
     * @param {number} x2 - End X
     * @param {number} y2 - End Y
     * @param {Object} config - Configuration options
     * @param {string} [config.color='#ff4444'] - Line color
     * @param {number} [config.duration=250] - Duration in milliseconds
     * @param {number} [config.lineWidth=4] - Line width
     * @param {boolean} [config.glow=true] - Enable glow effect
     * @param {number} [config.glowSize=12] - Glow blur radius
     */
    constructor(x1, y1, x2, y2, config = {}) {
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
        
        // Configuration
        this.color = config.color || '#ff4444';
        this.duration = config.duration || 250;
        this.lineWidth = config.lineWidth || 4;
        this.glow = config.glow !== false;
        this.glowSize = config.glowSize || 12;
        
        // State
        this.elapsed = 0;
        this.active = true;
    }
    
    /**
     * Update line animation
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        this.elapsed += dt * 1000; // Convert to milliseconds
        
        if (this.elapsed >= this.duration) {
            this.active = false;
        }
    }
    
    /**
     * Draw line to canvas
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    draw(ctx) {
        if (!this.active) return;
        
        const progress = this.elapsed / this.duration;
        const alpha = 1 - progress;
        const width = this.lineWidth * (1 - progress * 0.5);
        
        ctx.save();
        ctx.globalAlpha = alpha;
        
        // Create gradient along line
        const gradient = ctx.createLinearGradient(this.x1, this.y1, this.x2, this.y2);
        gradient.addColorStop(0, this.color + '00'); // Transparent at start
        gradient.addColorStop(0.2, this.color);
        gradient.addColorStop(0.8, this.color);
        gradient.addColorStop(1, this.color + '00'); // Transparent at end
        
        // Setup line style
        ctx.strokeStyle = gradient;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        
        // Add glow
        if (this.glow) {
            ctx.shadowColor = this.color;
            ctx.shadowBlur = this.glowSize;
        }
        
        // Draw line
        ctx.beginPath();
        ctx.moveTo(this.x1, this.y1);
        ctx.lineTo(this.x2, this.y2);
        ctx.stroke();
        
        ctx.restore();
    }
}

export default Line;
