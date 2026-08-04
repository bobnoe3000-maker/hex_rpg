/**
 * @file Lightning.js
 * @description Jagged lightning bolt effect for lightning spells and chain effects.
 *              Generates random jagged path between two points with periodic regeneration
 *              for a flickering effect.
 * 
 * @location ui/animations/Lightning.js
 * @usage Created by CanvasOverlay for lightning bolt, chain lightning, etc.
 * @dependencies AnimationSettings.js
 * 
 * @version 1.0.0
 * @changelog
 *   - v1.0.0 (2025-02-03): Initial implementation with jagged path and flicker
 */

import { AnimationSettings } from '../../config/AnimationSettings.js';

/**
 * Lightning effect - Jagged bolt between two points
 */
export class Lightning {
    /**
     * Create a lightning bolt
     * @param {number} x1 - Start X
     * @param {number} y1 - Start Y
     * @param {number} x2 - End X
     * @param {number} y2 - End Y
     * @param {Object} config - Configuration options
     * @param {string} [config.color='#aa44ff'] - Lightning color
     * @param {number} [config.duration=300] - Duration in milliseconds
     * @param {number} [config.segments=8] - Number of line segments
     * @param {number} [config.jitter=35] - Random offset for middle points
     * @param {number} [config.lineWidth=3] - Main line width
     * @param {number} [config.flickerInterval=40] - Milliseconds between path regeneration
     * @param {boolean} [config.branches=false] - Add random branches
     */
    constructor(x1, y1, x2, y2, config = {}) {
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
        
        // Configuration
        this.color = config.color || '#aa44ff';
        this.duration = config.duration || 300;
        this.segments = config.segments || 8;
        this.jitter = config.jitter || 35;
        this.lineWidth = config.lineWidth || 3;
        this.flickerInterval = config.flickerInterval || 40;
        this.branches = config.branches || false;
        
        // State
        this.elapsed = 0;
        this.active = true;
        this.lastFlicker = 0;
        
        // Points array (regenerated for flicker)
        this.points = [];
        this.branchPoints = [];
        
        // Generate initial path
        this._generatePath();
    }
    
    /**
     * Generate jagged path between start and end points
     */
    _generatePath() {
        const dx = (this.x2 - this.x1) / this.segments;
        const dy = (this.y2 - this.y1) / this.segments;
        
        this.points = [{ x: this.x1, y: this.y1 }];
        
        // Generate middle points with random jitter
        for (let i = 1; i < this.segments; i++) {
            const x = this.x1 + dx * i + (Math.random() - 0.5) * this.jitter;
            const y = this.y1 + dy * i + (Math.random() - 0.5) * this.jitter;
            this.points.push({ x, y });
        }
        
        // Add end point
        this.points.push({ x: this.x2, y: this.y2 });
        
        // Generate branches if enabled
        if (this.branches) {
            this._generateBranches();
        }
    }
    
    /**
     * Generate random branches from main bolt
     */
    _generateBranches() {
        this.branchPoints = [];
        
        // Add 1-3 random branches
        const branchCount = Math.floor(Math.random() * 3) + 1;
        
        for (let b = 0; b < branchCount; b++) {
            // Pick a random point along the main bolt (not first or last)
            const startIndex = Math.floor(Math.random() * (this.points.length - 2)) + 1;
            const startPoint = this.points[startIndex];
            
            // Branch length (2-4 segments)
            const branchLength = Math.floor(Math.random() * 3) + 2;
            const branchJitter = this.jitter * 0.7;
            
            // Random direction
            const angle = Math.random() * Math.PI * 2;
            const stepSize = 15 + Math.random() * 20;
            
            const branch = [{ x: startPoint.x, y: startPoint.y }];
            
            let x = startPoint.x;
            let y = startPoint.y;
            
            for (let i = 0; i < branchLength; i++) {
                x += Math.cos(angle) * stepSize + (Math.random() - 0.5) * branchJitter;
                y += Math.sin(angle) * stepSize + (Math.random() - 0.5) * branchJitter;
                branch.push({ x, y });
            }
            
            this.branchPoints.push(branch);
        }
    }
    
    /**
     * Update lightning animation
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        this.elapsed += dt * 1000;
        
        // Check if flicker is enabled and should regenerate path
        if (AnimationSettings.advanced.lightningFlickerEnabled) {
            if (this.elapsed - this.lastFlicker > this.flickerInterval) {
                this._generatePath();
                this.lastFlicker = this.elapsed;
            }
        }
        
        if (this.elapsed >= this.duration) {
            this.active = false;
        }
    }
    
    /**
     * Draw lightning to canvas
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    draw(ctx) {
        if (!this.active) return;
        
        const alpha = 1 - (this.elapsed / this.duration);
        
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.lineWidth;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 20;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Draw main bolt
        this._drawPath(ctx, this.points, this.lineWidth);
        
        // Draw branches (thinner)
        for (const branch of this.branchPoints) {
            this._drawPath(ctx, branch, this.lineWidth * 0.5);
        }
        
        // Draw white core for extra glow
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.shadowBlur = 0;
        this._drawPath(ctx, this.points, 1);
        
        ctx.restore();
    }
    
    /**
     * Draw a path of points
     * @param {CanvasRenderingContext2D} ctx
     * @param {Array} points
     * @param {number} lineWidth
     */
    _drawPath(ctx, points, lineWidth) {
        if (points.length < 2) return;
        
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        
        ctx.stroke();
    }
}

export default Lightning;
