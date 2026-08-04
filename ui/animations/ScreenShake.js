/**
 * @file ScreenShake.js
 * @description Screen shake utility for critical hits and powerful effects.
 *              Applies CSS transform to shake the battle container briefly.
 * 
 * @location ui/animations/ScreenShake.js
 * @usage Called by AnimationManager for critical hits, big impacts
 * @dependencies AnimationSettings.js
 * 
 * @version 1.0.0
 * @changelog
 *   - v1.0.0 (2025-02-03): Initial implementation with intensity presets
 */

import { AnimationSettings } from '../../config/AnimationSettings.js';

/**
 * Shake intensity presets
 */
export const ShakeIntensity = {
    LIGHT: { offset: 3, duration: 100 },
    MEDIUM: { offset: 5, duration: 150 },
    HEAVY: { offset: 8, duration: 200 },
    EXTREME: { offset: 12, duration: 300 }
};

/**
 * ScreenShake - Applies shake effect to an element
 */
export class ScreenShake {
    /**
     * Create a screen shake controller
     * @param {HTMLElement} element - Element to shake (usually .battle-main)
     */
    constructor(element) {
        this.element = element;
        this.isShaking = false;
        this._timeoutId = null;
    }
    
    /**
     * Apply screen shake
     * @param {string|Object} intensity - Intensity preset name or config object
     */
    shake(intensity = 'MEDIUM') {
        // Check if shake is enabled
        if (!AnimationSettings.shouldShakeScreen()) {
            return;
        }
        
        // Get intensity config
        let config;
        if (typeof intensity === 'string') {
            config = ShakeIntensity[intensity] || ShakeIntensity.MEDIUM;
        } else {
            config = intensity;
        }
        
        const { offset, duration } = config;
        
        // Cancel any existing shake
        if (this._timeoutId) {
            clearTimeout(this._timeoutId);
            this.element.style.transform = '';
        }
        
        this.isShaking = true;
        
        // Shake sequence: right, left, right, left, center
        const steps = [
            { x: offset, y: 0, delay: 0 },
            { x: -offset, y: offset * 0.3, delay: duration * 0.2 },
            { x: offset * 0.7, y: -offset * 0.3, delay: duration * 0.4 },
            { x: -offset * 0.5, y: 0, delay: duration * 0.6 },
            { x: 0, y: 0, delay: duration * 0.8 }
        ];
        
        // Execute shake sequence
        steps.forEach(step => {
            setTimeout(() => {
                if (this.element) {
                    this.element.style.transform = `translate(${step.x}px, ${step.y}px)`;
                }
            }, step.delay);
        });
        
        // Reset after duration
        this._timeoutId = setTimeout(() => {
            if (this.element) {
                this.element.style.transform = '';
            }
            this.isShaking = false;
            this._timeoutId = null;
        }, duration);
    }
    
    /**
     * Quick shake for light impacts
     */
    light() {
        this.shake('LIGHT');
    }
    
    /**
     * Medium shake for normal impacts
     */
    medium() {
        this.shake('MEDIUM');
    }
    
    /**
     * Heavy shake for critical hits
     */
    heavy() {
        this.shake('HEAVY');
    }
    
    /**
     * Extreme shake for devastating attacks
     */
    extreme() {
        this.shake('EXTREME');
    }
    
    /**
     * Custom shake with specific offset and duration
     * @param {number} offset - Pixel offset
     * @param {number} duration - Duration in ms
     */
    custom(offset, duration) {
        this.shake({ offset, duration });
    }
    
    /**
     * Stop any active shake
     */
    stop() {
        if (this._timeoutId) {
            clearTimeout(this._timeoutId);
            this._timeoutId = null;
        }
        
        if (this.element) {
            this.element.style.transform = '';
        }
        
        this.isShaking = false;
    }
    
    /**
     * Cleanup
     */
    destroy() {
        this.stop();
        this.element = null;
    }
}

export default ScreenShake;
