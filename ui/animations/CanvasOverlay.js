/**
 * @file CanvasOverlay.js
 * @description Canvas-based animation layer for particles, projectiles, lightning, and effects.
 *              Manages a single requestAnimationFrame loop for all canvas-based animations.
 *              Provides API for spawning various effect types.
 * 
 * @location ui/animations/CanvasOverlay.js
 * @usage Created by BattleMapUI, receives effect spawn calls from AnimationManager
 * @dependencies 
 *   - ParticleSystem.js
 *   - Projectile.js
 *   - Lightning.js
 *   - Line.js
 *   - Ring.js
 *   - Aura.js
 *   - AnimationSettings.js
 * 
 * @version 1.0.0
 * @changelog
 *   - v1.0.0 (2025-02-03): Initial implementation with unified render loop
 */

import { ParticleSystem } from './ParticleSystem.js';
import { Projectile } from './Projectile.js';
import { Lightning } from './Lightning.js';
import { Line } from './Line.js';
import { Ring } from './Ring.js';
import { Aura } from './Aura.js';
import { AnimationSettings } from '../../config/AnimationSettings.js';

/**
 * CanvasOverlay - Canvas-based animation layer
 */
export class CanvasOverlay {
    /**
     * Create a canvas overlay
     * @param {HTMLElement} container - Container element (usually .battle-main)
     */
    constructor(container) {
        this.container = container;
        
        // Create canvas element
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'canvas-overlay';
        this.canvas.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 10;
        `;
        
        // Insert canvas BEFORE floating-text-layer (if it exists)
        const floatingTextLayer = container.querySelector('.floating-text-layer');
        if (floatingTextLayer) {
            container.insertBefore(this.canvas, floatingTextLayer);
        } else {
            container.appendChild(this.canvas);
        }
        
        // Get 2D context
        this.ctx = this.canvas.getContext('2d');
        
        // Dimensions
        this.width = 0;
        this.height = 0;
        
        // Animation systems
        this.particles = new ParticleSystem(AnimationSettings.qualityPreset.maxParticles || 200);
        this.projectiles = [];
        this.lightnings = [];
        this.lines = [];
        this.rings = [];
        this.auras = [];
        
        // Render loop state
        this.running = false;
        this.lastTime = 0;
        this._animationFrameId = null;
        
        // Bind methods
        this._loop = this._loop.bind(this);
        this._onResize = this._onResize.bind(this);
        
        // Initialize
        this._resize();
        window.addEventListener('resize', this._onResize);
    }
    
    /**
     * Handle window resize
     */
    _onResize() {
        this._resize();
    }
    
    /**
     * Resize canvas to match container
     */
    _resize() {
        const rect = this.container.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;
        
        // Set canvas size (account for device pixel ratio for crisp rendering)
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        
        // Scale context to match
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    
    /**
     * Start the render loop
     */
    start() {
        if (this.running) return;
        
        this.running = true;
        this.lastTime = performance.now();
        this._animationFrameId = requestAnimationFrame(this._loop);
        
        console.log('[CanvasOverlay] Started');
    }
    
    /**
     * Stop the render loop
     */
    stop() {
        this.running = false;
        
        if (this._animationFrameId) {
            cancelAnimationFrame(this._animationFrameId);
            this._animationFrameId = null;
        }
        
        console.log('[CanvasOverlay] Stopped');
    }
    
    /**
     * Main render loop
     * @param {number} timestamp - Current timestamp from RAF
     */
    _loop(timestamp) {
        if (!this.running) return;
        
        // Calculate delta time (cap at 100ms to handle tab switching)
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
        this.lastTime = timestamp;
        
        // Skip frame if animations are disabled
        if (!AnimationSettings.enabled) {
            this._animationFrameId = requestAnimationFrame(this._loop);
            return;
        }
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Update and draw all effect types (order matters for layering)
        this._updateAndDrawArray(this.auras, dt);
        this._updateAndDrawArray(this.rings, dt);
        this._updateAndDrawArray(this.lines, dt);
        this._updateAndDrawArray(this.lightnings, dt);
        
        // Particles use their own system
        this.particles.update(dt);
        this.particles.draw(this.ctx);
        
        this._updateAndDrawArray(this.projectiles, dt);
        
        // Request next frame
        this._animationFrameId = requestAnimationFrame(this._loop);
    }
    
    /**
     * Update and draw an array of effects, removing inactive ones
     * @param {Array} array - Effect array
     * @param {number} dt - Delta time
     */
    _updateAndDrawArray(array, dt) {
        for (let i = array.length - 1; i >= 0; i--) {
            const effect = array[i];
            
            effect.update(dt);
            effect.draw(this.ctx);
            
            // Remove inactive effects
            if (!effect.active) {
                array.splice(i, 1);
            }
        }
    }
    
    // === Public API for spawning effects ===
    
    /**
     * Spawn particles
     * @param {Object} config - Particle spawn configuration
     */
    addParticles(config) {
        if (!AnimationSettings.enabled) return;
        this.particles.spawn(config);
    }
    
    /**
     * Spawn a burst of particles (radial outward)
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {Object} config - Particle config
     */
    burst(x, y, config) {
        if (!AnimationSettings.enabled) return;
        this.particles.burst(x, y, config);
    }
    
    /**
     * Spawn particles in upward fountain
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {Object} config - Particle config
     */
    fountain(x, y, config) {
        if (!AnimationSettings.enabled) return;
        this.particles.fountain(x, y, config);
    }
    
    /**
     * Add a projectile
     * @param {Object} config - Projectile configuration
     * @returns {Projectile} The created projectile
     */
    addProjectile(config) {
        if (!AnimationSettings.enabled) return null;
        
        const projectile = new Projectile(config);
        this.projectiles.push(projectile);
        return projectile;
    }
    
    /**
     * Add a lightning bolt
     * @param {number} x1 - Start X
     * @param {number} y1 - Start Y
     * @param {number} x2 - End X
     * @param {number} y2 - End Y
     * @param {Object} config - Lightning configuration
     * @returns {Lightning} The created lightning
     */
    addLightning(x1, y1, x2, y2, config = {}) {
        if (!AnimationSettings.enabled) return null;
        
        const lightning = new Lightning(x1, y1, x2, y2, config);
        this.lightnings.push(lightning);
        return lightning;
    }
    
    /**
     * Add an attack line
     * @param {number} x1 - Start X
     * @param {number} y1 - Start Y
     * @param {number} x2 - End X
     * @param {number} y2 - End Y
     * @param {Object} config - Line configuration
     * @returns {Line} The created line
     */
    addLine(x1, y1, x2, y2, config = {}) {
        if (!AnimationSettings.enabled) return null;
        
        const line = new Line(x1, y1, x2, y2, config);
        this.lines.push(line);
        return line;
    }
    
    /**
     * Add an expanding ring
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {Object} config - Ring configuration
     * @returns {Ring} The created ring
     */
    addRing(x, y, config = {}) {
        if (!AnimationSettings.enabled) return null;
        
        const ring = new Ring(x, y, config);
        this.rings.push(ring);
        return ring;
    }
    
    /**
     * Add a pulsing aura
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {Object} config - Aura configuration
     * @returns {Aura} The created aura
     */
    addAura(x, y, config = {}) {
        if (!AnimationSettings.enabled) return null;
        if (!AnimationSettings.advanced.auraEffectsEnabled) return null;
        
        const aura = new Aura(x, y, config);
        this.auras.push(aura);
        return aura;
    }
    
    // === Compound effects ===
    
    /**
     * Create a hit spark effect (particles + optional ring)
     * @param {number} x - Impact X
     * @param {number} y - Impact Y
     * @param {Object} config - Effect configuration
     */
    hitSpark(x, y, config = {}) {
        if (!AnimationSettings.isSubcategoryEnabled('hitSparks')) return;
        
        const color = config.color || '#ff4444';
        const colors = config.colors || [color, this._lightenColor(color), '#ffffff'];
        
        // Particles
        this.particles.spawn({
            x,
            y,
            count: config.count || 10,
            speed: config.speed || 180,
            life: config.life || 0.4,
            size: config.size || 4,
            colors,
            type: 'spark',
            gravity: config.gravity || 80
        });
        
        // Optional ring
        if (config.ring !== false) {
            this.addRing(x, y, {
                color,
                maxRadius: config.ringRadius || 30,
                duration: config.ringDuration || 200
            });
        }
    }
    
    /**
     * Create an impact explosion effect
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {Object} config - Effect configuration
     */
    explosion(x, y, config = {}) {
        const color = config.color || '#ff6600';
        const colors = config.colors || [color, this._lightenColor(color), '#ffffff'];
        
        // Burst particles
        this.particles.burst(x, y, {
            count: config.count || 25,
            speed: config.speed || 220,
            life: config.life || 0.6,
            size: config.size || 7,
            colors,
            gravity: config.gravity || 50,
            friction: config.friction || 0.98
        });
        
        // Expanding ring
        this.addRing(x, y, {
            color,
            maxRadius: config.ringRadius || 70,
            duration: config.ringDuration || 280
        });
    }
    
    /**
     * Create a heal effect
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {Object} config - Effect configuration
     */
    healEffect(x, y, config = {}) {
        const color = config.color || '#44ff88';
        const colors = config.colors || [color, '#88ffaa', '#aaffcc', '#ffffff'];
        
        // Upward particles
        this.particles.spawn({
            x,
            y: y + 20,
            count: config.count || 16,
            speed: 70,
            angle: -Math.PI / 2, // Up
            spread: 0.6,
            life: 0.8,
            size: 5,
            colors,
            gravity: -35 // Float up
        });
        
        // Ring
        this.addRing(x, y, {
            color,
            maxRadius: 45,
            duration: 350
        });
    }
    
    /**
     * Create a buff aura effect
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {Object} config - Effect configuration
     */
    buffEffect(x, y, config = {}) {
        const color = config.color || '#44aaff';
        
        // Aura
        this.addAura(x, y, {
            color,
            duration: config.duration || 1200,
            radius: config.radius || 40
        });
        
        // Sparkle particles
        this.particles.spawn({
            x,
            y,
            count: config.count || 12,
            speed: 60,
            life: 0.8,
            size: 4,
            colors: [color, '#ffffff'],
            type: config.particleType || 'star',
            rotationSpeed: 2
        });
        
        // Rings
        for (let i = 0; i < 2; i++) {
            setTimeout(() => {
                this.addRing(x, y, {
                    color,
                    maxRadius: 30 + i * 20,
                    duration: 400
                });
            }, i * 100);
        }
    }
    
    // === Utility methods ===
    
    /**
     * Lighten a hex color
     * @param {string} hex - Hex color
     * @returns {string} Lighter hex color
     */
    _lightenColor(hex) {
        hex = hex.replace('#', '');
        const r = Math.min(255, parseInt(hex.substring(0, 2), 16) + 50);
        const g = Math.min(255, parseInt(hex.substring(2, 4), 16) + 50);
        const b = Math.min(255, parseInt(hex.substring(4, 6), 16) + 50);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
    
    /**
     * Clear all active effects
     */
    clearAll() {
        this.particles.clear();
        this.projectiles = [];
        this.lightnings = [];
        this.lines = [];
        this.rings = [];
        this.auras = [];
    }
    
    /**
     * Get effect counts for debugging
     * @returns {Object} Effect counts
     */
    getStats() {
        return {
            particles: this.particles.getStats(),
            projectiles: this.projectiles.length,
            lightnings: this.lightnings.length,
            lines: this.lines.length,
            rings: this.rings.length,
            auras: this.auras.length
        };
    }
    
    /**
     * Cleanup and destroy
     */
    destroy() {
        this.stop();
        this.clearAll();
        
        window.removeEventListener('resize', this._onResize);
        
        this.canvas.remove();
        this.canvas = null;
        this.ctx = null;
        this.container = null;
        
        console.log('[CanvasOverlay] Destroyed');
    }
}

export default CanvasOverlay;
