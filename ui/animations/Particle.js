/**
 * @file Particle.js
 * @description Individual particle class used by ParticleSystem. Supports multiple
 *              visual types (circle, spark, star, snow, ring) with physics simulation.
 *              Designed for object pooling - particles are reused, not garbage collected.
 * 
 * @location ui/animations/Particle.js
 * @usage Created and managed by ParticleSystem.js
 * @dependencies None
 * 
 * @version 1.0.0
 * @changelog
 *   - v1.0.0 (2025-02-03): Initial implementation with 5 particle types
 */

/**
 * Particle types for different visual effects
 */
export const ParticleType = {
    CIRCLE: 'circle',   // Basic glowing circle (default)
    SPARK: 'spark',     // Motion-blurred line (for impacts)
    STAR: 'star',       // 5-pointed star (for special effects)
    SNOW: 'snow',       // 6-pointed snowflake (for ice)
    RING: 'ring'        // Hollow circle (for auras)
};

/**
 * Particle class - Individual particle with physics and rendering
 */
export class Particle {
    constructor() {
        // State
        this.active = false;
        
        // Position
        this.x = 0;
        this.y = 0;
        
        // Velocity
        this.vx = 0;
        this.vy = 0;
        
        // Physics
        this.gravity = 0;
        this.friction = 1;
        
        // Lifetime
        this.life = 1;
        this.maxLife = 1;
        
        // Appearance
        this.size = 5;
        this.color = '#ffffff';
        this.type = ParticleType.CIRCLE;
        
        // Rotation (for star/snow types)
        this.rotation = 0;
        this.rotationSpeed = 0;
    }
    
    /**
     * Initialize/reset particle with new configuration
     * @param {Object} config - Particle configuration
     */
    init(config) {
        this.active = true;
        
        // Position
        this.x = config.x || 0;
        this.y = config.y || 0;
        
        // Velocity
        this.vx = config.vx || 0;
        this.vy = config.vy || 0;
        
        // Physics
        this.gravity = config.gravity || 0;
        this.friction = config.friction || 1;
        
        // Lifetime
        this.life = config.life || 1;
        this.maxLife = config.life || 1;
        
        // Appearance
        this.size = config.size || 5;
        this.color = config.color || '#ffffff';
        this.type = config.type || ParticleType.CIRCLE;
        
        // Rotation
        this.rotation = 0;
        this.rotationSpeed = config.rotationSpeed || 0;
    }
    
    /**
     * Update particle physics
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        if (!this.active) return;
        
        // Apply velocity
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        
        // Apply gravity
        this.vy += this.gravity * dt;
        
        // Apply friction
        this.vx *= this.friction;
        this.vy *= this.friction;
        
        // Apply rotation
        this.rotation += this.rotationSpeed * dt;
        
        // Decrease lifetime
        this.life -= dt;
        
        // Deactivate when dead
        if (this.life <= 0) {
            this.active = false;
        }
    }
    
    /**
     * Draw particle to canvas
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    draw(ctx) {
        if (!this.active) return;
        
        // Calculate alpha based on remaining life
        const alpha = Math.max(0, Math.min(1, this.life / this.maxLife));
        
        // Scale size with life (shrink as it dies)
        const size = this.size * (0.5 + alpha * 0.5);
        
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        switch (this.type) {
            case ParticleType.SPARK:
                this._drawSpark(ctx, size);
                break;
            case ParticleType.STAR:
                this._drawStar(ctx, size);
                break;
            case ParticleType.SNOW:
                this._drawSnow(ctx, size);
                break;
            case ParticleType.RING:
                this._drawRing(ctx, size, alpha);
                break;
            default:
                this._drawCircle(ctx, size);
                break;
        }
        
        ctx.restore();
    }
    
    /**
     * Draw circle particle (default)
     */
    _drawCircle(ctx, size) {
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = size * 2;
        
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();
    }
    
    /**
     * Draw spark particle (motion blur line)
     */
    _drawSpark(ctx, size) {
        ctx.strokeStyle = this.color;
        ctx.lineWidth = size;
        ctx.lineCap = 'round';
        ctx.shadowColor = this.color;
        ctx.shadowBlur = size;
        
        // Draw line from current position back along velocity
        const trailX = -this.vx * 0.02;
        const trailY = -this.vy * 0.02;
        
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(trailX, trailY);
        ctx.stroke();
    }
    
    /**
     * Draw star particle (5-pointed)
     */
    _drawStar(ctx, size) {
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = size;
        
        const spikes = 5;
        const outerRadius = size;
        const innerRadius = size * 0.5;
        
        ctx.beginPath();
        
        for (let i = 0; i < spikes * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (i * Math.PI / spikes) - Math.PI / 2;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.closePath();
        ctx.fill();
    }
    
    /**
     * Draw snowflake particle (6-pointed)
     */
    _drawSnow(ctx, size) {
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.shadowColor = this.color;
        ctx.shadowBlur = size * 0.5;
        
        ctx.beginPath();
        
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const x = Math.cos(angle) * size;
            const y = Math.sin(angle) * size;
            
            ctx.moveTo(0, 0);
            ctx.lineTo(x, y);
        }
        
        ctx.stroke();
    }
    
    /**
     * Draw ring particle (hollow circle)
     */
    _drawRing(ctx, size, alpha) {
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2 * alpha;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = size * 0.5;
        
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    /**
     * Reset particle to inactive state
     */
    reset() {
        this.active = false;
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.life = 0;
    }
}

export default Particle;
