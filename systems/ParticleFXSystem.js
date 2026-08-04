/**
 * @file ParticleFXSystem.js
 * @description Runtime GIF and spritesheet particle-effect renderer.
 *              Accepts an fxId + hex position, looks up FX_CATALOGUE, and spawns
 *              a DOM element (<img> or <canvas>) in the .fx-gif-layer at the
 *              correct screen position, then removes it when complete.
 *
 * @location systems/ParticleFXSystem.js
 * @usage
 *   Created and owned by AnimationManager:
 *     const fxLayerEl = container.querySelector('.fx-gif-layer');
 *     this.particleFX = new ParticleFXSystem(fxLayerEl, hexGrid);
 *   Called per-event:
 *     this.particleFX.play(fxId, { q, r });
 * @dependencies
 *   - FX_CATALOGUE, FX_RENDERER (config/ParticleFXConfig.js)
 *   - hexToPixel (utils/hexMath.js)
 *
 * @version 1.0.0
 * @changelog
 *   - v1.0.0 (2026-03-08): Initial implementation. GIF renderer via <img>,
 *                           spritesheet renderer via <canvas> + requestAnimationFrame.
 *                           Letterbox-aware coordinate conversion via _svgToScreen().
 *                           mix-blend-mode:screen on both element types for transparency.
 */

import { FX_CATALOGUE, FX_RENDERER } from '../config/ParticleFXConfig.js';
import { hexToPixel } from '../utils/hexMath.js';

export class ParticleFXSystem {
    /**
     * @param {HTMLElement} fxLayerEl - The .fx-gif-layer div (z-index 15)
     * @param {HexGrid}     hexGrid   - HexGrid instance; provides hexRadius + svgEl
     */
    constructor(fxLayerEl, hexGrid) {
        this.fxLayerEl  = fxLayerEl;
        this.hexGrid    = hexGrid;

        /** @type {Set<HTMLElement>} - active DOM elements for clearAll() */
        this._active = new Set();

        /** @type {Set<number>} - active RAF ids for sheet animations */
        this._rafs = new Set();
    }

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Play a particle effect at a hex tile position.
     * @param {string}          fxId   - Key in FX_CATALOGUE
     * @param {{ q: number, r: number }} hexPos - Target hex coordinates
     */
    play(fxId, hexPos) {
        const entry = FX_CATALOGUE[fxId];
        if (!entry) {
            console.warn(`[ParticleFXSystem] Unknown fxId: "${fxId}"`);
            return;
        }
        if (!hexPos || typeof hexPos.q !== 'number' || typeof hexPos.r !== 'number') return;
        if (!this.fxLayerEl) return;

        const screen = this._svgToScreen(hexPos.q, hexPos.r);
        if (!screen) return;

        this.playAt(fxId, screen.x, screen.y, screen.scale);
    }

    /**
     * Play a particle effect at explicit screen coordinates.
     * Allows AnimationManager to pass already-computed positions.
     * @param {string} fxId
     * @param {number} screenX  - x in px relative to .fx-gif-layer
     * @param {number} screenY  - y in px relative to .fx-gif-layer
     * @param {number} [scale]  - SVG→screen scale factor (for sizing)
     */
    playAt(fxId, screenX, screenY, scale = 1) {
        const entry = FX_CATALOGUE[fxId];
        if (!entry || !this.fxLayerEl) return;

        if (entry.renderer === FX_RENDERER.GIF) {
            this._spawnGIF(entry, screenX, screenY, scale);
        } else if (entry.renderer === FX_RENDERER.SHEET) {
            this._spawnSheet(entry, screenX, screenY, scale);
        }
    }

    /**
     * Remove all active FX elements immediately.
     */
    clearAll() {
        for (const el of this._active) {
            el.remove();
        }
        this._active.clear();

        for (const rafId of this._rafs) {
            cancelAnimationFrame(rafId);
        }
        this._rafs.clear();
    }

    /**
     * Destroy the system and clean up all resources.
     */
    destroy() {
        this.clearAll();
        this.fxLayerEl = null;
        this.hexGrid   = null;
    }

    // ── GIF renderer ─────────────────────────────────────────────────────────

    /**
     * Spawn a <img> element for a GIF effect.
     * @private
     */
    _spawnGIF(entry, screenX, screenY, scale) {
        const px = this._renderedPx(entry.sizeM, scale);

        const img = document.createElement('img');
        img.className = 'fx-gif';
        img.src = `assets/fx/gifs/${encodeURIComponent(entry.file)}`;

        // Glow
        if (entry.glow) {
            img.style.filter = `drop-shadow(0 0 ${Math.round(px * 0.18)}px ${entry.glow})`;
        }

        this._positionElement(img, screenX, screenY, px, entry.offsetY);
        this.fxLayerEl.appendChild(img);
        this._active.add(img);

        // Fade in on next frame
        requestAnimationFrame(() => {
            if (img.isConnected) img.classList.add('show');
        });

        // Remove after duration
        const totalMs = (entry.duration || 1500) + 200; // +200ms buffer
        setTimeout(() => {
            this._removeElement(img);
        }, totalMs);
    }

    // ── Spritesheet renderer ──────────────────────────────────────────────────

    /**
     * Spawn a <canvas> element and animate a spritesheet effect.
     * @private
     */
    _spawnSheet(entry, screenX, screenY, scale) {
        const px     = this._renderedPx(entry.sizeM, scale);
        const canvas = document.createElement('canvas');
        canvas.className = 'fx-canvas';
        canvas.width  = px;
        canvas.height = px;

        if (entry.glow) {
            canvas.style.filter = `drop-shadow(0 0 ${Math.round(px * 0.18)}px ${entry.glow})`;
        }

        this._positionElement(canvas, screenX, screenY, px, entry.offsetY);
        this.fxLayerEl.appendChild(canvas);
        this._active.add(canvas);

        const ctx       = canvas.getContext('2d');
        const image     = new Image();
        const framePx   = entry.tileW || 48;
        const framePxH  = entry.tileH || 48;
        const totalFrames = entry.frames || 1;
        const cols      = entry.cols || 1;
        const fps       = entry.fps || 12;
        const msPerFrame = 1000 / fps;

        image.onload = () => {
            let frame     = 0;
            let lastTime  = performance.now();

            const tick = (now) => {
                if (!canvas.isConnected) {
                    this._rafs.delete(rafId);
                    return;
                }

                const elapsed = now - lastTime;
                if (elapsed >= msPerFrame) {
                    const col   = frame % cols;
                    const row   = Math.floor(frame / cols);
                    const srcX  = col * framePx;
                    const srcY  = row * framePxH;

                    ctx.clearRect(0, 0, px, px);
                    ctx.drawImage(image, srcX, srcY, framePx, framePxH, 0, 0, px, px);

                    frame++;
                    lastTime = now - (elapsed % msPerFrame);

                    if (frame >= totalFrames) {
                        this._removeElement(canvas);
                        this._rafs.delete(rafId);
                        return;
                    }
                }

                const rafId2 = requestAnimationFrame(tick);
                this._rafs.delete(rafId);
                this._rafs.add(rafId2);
            };

            // Initial frame immediately
            let rafId = requestAnimationFrame(tick);
            this._rafs.add(rafId);
        };

        image.onerror = () => {
            console.warn(`[ParticleFXSystem] Sheet failed to load: ${entry.file}`);
            this._removeElement(canvas);
        };

        image.src = `assets/fx/spritesheets/${encodeURIComponent(entry.file)}`;

        // Hard timeout fallback in case frame count is wrong
        const totalMs = (entry.duration || 2000) + 300;
        setTimeout(() => {
            if (canvas.isConnected) this._removeElement(canvas);
        }, totalMs);
    }

    // ── Coordinate conversion ─────────────────────────────────────────────────

    /**
     * Convert hex (q, r) to screen coordinates relative to .fx-gif-layer.
     *
     * Uses letterbox-aware math: SVG uses preserveAspectRatio="xMidYMid meet"
     * which centres the viewBox and adds padding on one axis. getScreenCTM() does
     * NOT account for this, causing misalignment. This method corrects for it.
     *
     * @param {number} q
     * @param {number} r
     * @returns {{ x: number, y: number, scale: number } | null}
     * @private
     */
    _svgToScreen(q, r) {
        const svgEl = this.hexGrid?.svg;
        if (!svgEl || !this.fxLayerEl) return null;

        const hexRadius = this.hexGrid.hexRadius;
        if (!hexRadius) return null;

        const { x: svgX, y: svgY } = hexToPixel(q, r, hexRadius);

        const svgRect  = svgEl.getBoundingClientRect();
        const contRect = this.fxLayerEl.getBoundingClientRect();
        const vb       = svgEl.viewBox?.baseVal;

        if (!vb || vb.width === 0 || vb.height === 0) return null;

        // "meet" scaling: fit both dimensions, pick the smaller scale
        const scale = Math.min(
            svgRect.width  / vb.width,
            svgRect.height / vb.height
        );

        // Letterbox offsets (empty space on each axis after scaling)
        const offX = (svgRect.width  - vb.width  * scale) / 2;
        const offY = (svgRect.height - vb.height * scale) / 2;

        return {
            x: svgRect.left - contRect.left + offX + svgX * scale,
            y: svgRect.top  - contRect.top  + offY + svgY * scale,
            scale,
        };
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Calculate rendered pixel size from sizeM and current SVG scale.
     * Falls back to hexRadius × sizeM when scale is not available.
     * @private
     */
    _renderedPx(sizeM, scale) {
        const hexRadius = this.hexGrid?.hexRadius || 40;
        // scale is SVG→screen ratio; hexRadius is in SVG units
        return Math.round(hexRadius * sizeM * scale);
    }

    /**
     * Set absolute position on an element, centred on screenX/Y with offsetY.
     * @private
     */
    _positionElement(el, screenX, screenY, px, offsetY = -0.60) {
        el.style.width  = `${px}px`;
        el.style.height = `${px}px`;
        el.style.left   = `${Math.round(screenX - px / 2)}px`;
        el.style.top    = `${Math.round(screenY + px * offsetY)}px`;
    }

    /**
     * Fade out and remove a DOM element.
     * @private
     */
    _removeElement(el) {
        el.classList.remove('show');
        this._active.delete(el);
        // Brief delay so opacity transition completes before removal
        setTimeout(() => el.remove(), 60);
    }
}

export default ParticleFXSystem;
