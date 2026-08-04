/**
 * @file Aura.js
 * @description Pulsing aura effect for buffs, shields, and channeled abilities.
 *              Creates a radial gradient glow that pulses in and out.
 * 
 * @location ui/animations/Aura.js
 * @usage Created by CanvasOverlay for buff/debuff/shield effects
 * @dependencies None
 * 
 * @version 1.0.0
 * @changelog
 *   - v1.0.0 (2025-02-03): Initial implementation with pulsing animation
 */

/**
 * Aura effect - Pulsing radial glow
 */
export class Aura {
    /**
     * Create an aura effect
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {Object} config - Configuration options
     * @param {string} [config.color='#44aaff'] - Aura color
     * @param {number} [config.duration=1000] - Duration in milliseconds
     * @param {number} [config.radius=50] - Base radius
     * @param {number} [config.pulseSpeed=4] - Pulse cycles per duration
     * @param {number} [config.pulseAmount=0.2] - Pulse size variation (0-1)
     * @param {number} [config.innerAlpha=0.5] - Inner gradient alpha (hex suffix)
     * @param {number} [config.outerAlpha=0] - Outer gradient alpha
     */
    constructor(x, y, config = {}) {
        this.x = x;
        this.y = y;
        
        // Configuration
        this.color = config.color || '#44aaff';
        this.duration = config.duration || 1000;
        this.radius = config.radius || 50;
        this.pulseSpeed = config.pulseSpeed || 4;
        this.pulseAmount = config.pulseAmount || 0.2;
        this.innerAlpha = config.innerAlpha || 0.5;
        
        // State
        this.elapsed = 0;
        this.active = true;
    }
    
    /**
     * Update aura animation
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        this.elapsed += dt * 1000;
        
        if (this.elapsed >= this.duration) {
            this.active = false;
        }
    }
    
    /**
     * Convert hex color to rgba
     * @param {string} hex - Hex color
     * @param {number} alpha - Alpha value (0-1)
     * @returns {string} rgba color string
     */
    _hexToRgba(hex, alpha) {
        // Remove # if present
        hex = hex.replace('#', '');
        
        // Parse hex values
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    
    /**
     * Draw aura to canvas
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    draw(ctx) {
        if (!this.active) return;
        
        const progress = this.elapsed / this.duration;
        
        // Calculate pulse (sine wave)
        const pulse = 1 + Math.sin(progress * Math.PI * this.pulseSpeed) * this.pulseAmount;
        
        // Fade out over duration
        const alpha = (1 - progress) * 0.4;
        
        // Calculate current radius with pulse
        const currentRadius = this.radius * pulse;
        
        ctx.save();
        ctx.globalAlpha = alpha;
        
        // Create radial gradient
        const gradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, currentRadius
        );
        
        // Add color stops
        gradient.addColorStop(0, this._hexToRgba(this.color, this.innerAlpha));
        gradient.addColorStop(0.5, this._hexToRgba(this.color, this.innerAlpha * 0.5));
        gradient.addColorStop(1, this._hexToRgba(this.color, 0));
        
        // Draw aura
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, currentRadius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

export default Aura;
