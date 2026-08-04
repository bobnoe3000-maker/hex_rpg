/**
 * @file Projectile.js
 * @description Animated projectile with trail effect for ranged attacks and spells.
 *              Travels from source to target with configurable speed and appearance.
 *              Triggers onHit callback when reaching target.
 * 
 * @location ui/animations/Projectile.js
 * @usage Created by CanvasOverlay for fireball, frostbolt, etc.
 * @dependencies AnimationSettings.js
 * 
 * @version 1.0.0
 * @changelog
 *   - v1.0.0 (2025-02-03): Initial implementation with trail and impact callback
 */

import { AnimationSettings } from '../../config/AnimationSettings.js';

/**
 * Projectile effect - Moving projectile with trail
 */
export class Projectile {
    /**
     * Create a projectile
     * @param {Object} config - Configuration options
     * @param {number} config.x - Start X
     * @param {number} config.y - Start Y
     * @param {number} config.targetX - Target X
     * @param {number} config.targetY - Target Y
     * @param {number} [config.speed=400] - Projectile speed (pixels/sec)
     * @param {string} [config.color='#ff8844'] - Projectile color
     * @param {number} [config.size=10] - Projectile size
     * @param {string[]} [config.trailColors] - Trail gradient colors
     * @param {number} [config.trailLength=10] - Trail length (number of points)
     * @param {Function} [config.onHit] - Callback when projectile hits target
     * @param {number} [config.hitRadius=20] - Distance to target considered a "hit"
     */
    constructor(config) {
        // Position
        this.x = config.x;
        this.y = config.y;
        this.targetX = config.targetX;
        this.targetY = config.targetY;
        
        // Configuration
        this.speed = config.speed || 400;
        this.color = config.color || '#ff8844';
        this.size = config.size || 10;
        this.trailColors = config.trailColors || [config.color || '#ff8844'];
        this.hitRadius = config.hitRadius || 20;
        this.onHit = config.onHit;
        
        // Trail length based on quality
        const quality = AnimationSettings.qualityPreset;
        this.trailLength = config.trailLength || quality.trailLength || 10;
        
        // Trail (array of past positions)
        this.trail = [];
        
        // State
        this.active = true;
        
        // Calculate velocity
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0) {
            this.vx = (dx / dist) * this.speed;
            this.vy = (dy / dist) * this.speed;
        } else {
            this.vx = 0;
            this.vy = 0;
            this.active = false;
        }
    }
    
    /**
     * Update projectile position
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        if (!this.active) return;
        
        // Add current position to trail
        this.trail.push({ x: this.x, y: this.y, alpha: 1 });
        
        // Limit trail length
        if (this.trail.length > this.trailLength) {
            this.trail.shift();
        }
        
        // Update trail alpha (fade older positions)
        this.trail.forEach((point, i) => {
            point.alpha = (i + 1) / this.trail.length;
        });
        
        // Move projectile
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        
        // Check if hit target
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < this.hitRadius) {
            this.active = false;
            
            // Trigger hit callback
            if (this.onHit) {
                this.onHit(this.targetX, this.targetY);
            }
        }
    }
    
    /**
     * Draw projectile and trail to canvas
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    draw(ctx) {
        ctx.save();
        
        // Draw trail
        this.trail.forEach((point, i) => {
            const trailAlpha = point.alpha * 0.5;
            const trailSize = this.size * point.alpha;
            const colorIndex = i % this.trailColors.length;
            
            ctx.globalAlpha = trailAlpha;
            ctx.fillStyle = this.trailColors[colorIndex];
            
            ctx.beginPath();
            ctx.arc(point.x, point.y, trailSize, 0, Math.PI * 2);
            ctx.fill();
        });
        
        // Draw projectile (if still active)
        if (this.active) {
            ctx.globalAlpha = 1;
            ctx.fillStyle = this.color;
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 15;
            
            // Main projectile
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            
            // White core for glow effect
            ctx.fillStyle = '#ffffff';
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * 0.4, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
}

export default Projectile;
