/**
 * @file ParticleSystem.js
 * @description High-performance object-pooled particle system for combat effects.
 *              Pre-allocates particles to avoid garbage collection during combat.
 *              Supports multiple particle types and configurable spawn patterns.
 * 
 * @location ui/animations/ParticleSystem.js
 * @usage Created by CanvasOverlay, spawns particles via spawn() method
 * @dependencies Particle.js, AnimationSettings.js
 * 
 * @version 1.0.0
 * @changelog
 *   - v1.0.0 (2025-02-03): Initial implementation with object pooling
 */

import { Particle, ParticleType } from './Particle.js';
import { AnimationSettings } from '../../config/AnimationSettings.js';

/**
 * ParticleSystem - Manages a pool of reusable particles
 */
export class ParticleSystem {
    /**
     * Create a particle system
     * @param {number} poolSize - Maximum number of particles to pre-allocate
     */
    constructor(poolSize = 200) {
        this.poolSize = poolSize;
        this.pool = [];
        this.activeCount = 0;
        
        // Pre-allocate particle pool
        this._initPool();
    }
    
    /**
     * Pre-allocate particle pool
     */
    _initPool() {
        for (let i = 0; i < this.poolSize; i++) {
            this.pool.push(new Particle());
        }
    }
    
    /**
     * Get an inactive particle from the pool
     * @returns {Particle|null}
     */
    _acquire() {
        for (const particle of this.pool) {
            if (!particle.active) {
                return particle;
            }
        }
        
        // Pool exhausted
        console.warn('[ParticleSystem] Pool exhausted');
        return null;
    }
    
    /**
     * Spawn particles with the given configuration
     * @param {Object} config - Spawn configuration
     * @param {number} config.x - Center X position
     * @param {number} config.y - Center Y position
     * @param {number} [config.count=10] - Number of particles to spawn
     * @param {number} [config.speed=100] - Base particle speed
     * @param {number} [config.angle] - Direction angle (radians, undefined = random 360)
     * @param {number} [config.spread=Math.PI*2] - Angular spread (radians)
     * @param {number} [config.life=1] - Particle lifetime (seconds)
     * @param {number} [config.size=5] - Particle size (pixels)
     * @param {string|string[]} [config.color='#fff'] - Particle color(s)
     * @param {string[]} [config.colors] - Array of colors to randomly choose from
     * @param {number} [config.gravity=0] - Gravity (positive = down)
     * @param {number} [config.friction=1] - Velocity friction (1 = none, 0.95 = slow)
     * @param {string} [config.type='circle'] - Particle type
     * @param {number} [config.rotationSpeed=0] - Rotation speed for star/snow
     * @param {number} [config.offsetX=0] - Random X offset range
     * @param {number} [config.offsetY=0] - Random Y offset range
     */
    spawn(config) {
        // Apply quality multiplier
        const quality = AnimationSettings.qualityPreset;
        const count = Math.ceil((config.count || 10) * quality.particleMultiplier);
        const lifeMultiplier = quality.effectDuration;
        
        // Get colors array
        const colors = config.colors || [config.color || '#ffffff'];
        
        for (let i = 0; i < count; i++) {
            const particle = this._acquire();
            if (!particle) break;
            
            // Calculate angle with spread
            let angle;
            if (config.angle !== undefined) {
                // Directional spawn with spread
                const spread = config.spread !== undefined ? config.spread : Math.PI * 0.5;
                angle = config.angle + (Math.random() - 0.5) * spread;
            } else {
                // Random 360 degree spawn
                angle = Math.random() * Math.PI * 2;
            }
            
            // Calculate speed with variation
            const baseSpeed = config.speed || 100;
            const speed = baseSpeed * (0.5 + Math.random() * 0.5);
            
            // Calculate velocity from angle and speed
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            
            // Calculate position with offset
            const offsetX = config.offsetX || 0;
            const offsetY = config.offsetY || 0;
            const x = config.x + (Math.random() - 0.5) * offsetX;
            const y = config.y + (Math.random() - 0.5) * offsetY;
            
            // Calculate lifetime with variation
            const baseLife = config.life || 1;
            const life = baseLife * (0.7 + Math.random() * 0.3) * lifeMultiplier;
            
            // Calculate size with variation
            const baseSize = config.size || 5;
            const size = baseSize * (0.5 + Math.random() * 0.5);
            
            // Pick random color
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            // Initialize particle
            particle.init({
                x,
                y,
                vx,
                vy,
                life,
                size,
                color,
                gravity: config.gravity || 0,
                friction: config.friction || 1,
                type: config.type || ParticleType.CIRCLE,
                rotationSpeed: config.rotationSpeed || 0
            });
        }
    }
    
    /**
     * Spawn particles in a burst pattern (radial outward)
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {Object} config - Spawn config (same as spawn())
     */
    burst(x, y, config) {
        this.spawn({
            x,
            y,
            angle: undefined, // Full 360
            spread: Math.PI * 2,
            ...config
        });
    }
    
    /**
     * Spawn particles in an upward fountain pattern
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {Object} config - Spawn config
     */
    fountain(x, y, config) {
        this.spawn({
            x,
            y,
            angle: -Math.PI / 2, // Up
            spread: Math.PI * 0.6,
            gravity: config.gravity || 60,
            ...config
        });
    }
    
    /**
     * Spawn particles in a downward drip pattern
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {Object} config - Spawn config
     */
    drip(x, y, config) {
        this.spawn({
            x,
            y,
            angle: Math.PI / 2, // Down
            spread: Math.PI * 0.3,
            gravity: config.gravity || 80,
            ...config
        });
    }
    
    /**
     * Spawn particles in a directional cone
     * @param {number} x - Start X
     * @param {number} y - Start Y
     * @param {number} targetX - Target X
     * @param {number} targetY - Target Y
     * @param {Object} config - Spawn config
     */
    cone(x, y, targetX, targetY, config) {
        const angle = Math.atan2(targetY - y, targetX - x);
        this.spawn({
            x,
            y,
            angle,
            spread: config.spread || Math.PI * 0.3,
            ...config
        });
    }
    
    /**
     * Update all active particles
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        this.activeCount = 0;
        
        for (const particle of this.pool) {
            if (particle.active) {
                particle.update(dt);
                this.activeCount++;
            }
        }
    }
    
    /**
     * Draw all active particles
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    draw(ctx) {
        for (const particle of this.pool) {
            if (particle.active) {
                particle.draw(ctx);
            }
        }
    }
    
    /**
     * Clear all active particles
     */
    clear() {
        for (const particle of this.pool) {
            particle.reset();
        }
        this.activeCount = 0;
    }
    
    /**
     * Get pool statistics
     * @returns {Object} Stats object
     */
    getStats() {
        return {
            poolSize: this.poolSize,
            activeCount: this.activeCount,
            availableCount: this.poolSize - this.activeCount
        };
    }
}

export default ParticleSystem;
