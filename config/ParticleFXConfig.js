/**
 * @file ParticleFXConfig.js
 * @description Master catalogue for GIF and spritesheet particle FX assets.
 *              Each key is an fxId string referenced by skill.fxId and proc.fxId.
 *
 * @location config/ParticleFXConfig.js
 * @usage
 *   - ParticleFXSystem.play(fxId, hexPos) looks up this catalogue at runtime
 *   - skillConfig.js  → skill.fxId = '<key>'
 *   - itemConfig.js   → proc.fxId  = '<key>'
 * @dependencies None (pure configuration)
 *
 * @version 1.3.0
 * @changelog
 *   - v1.3.0 (2026-03-09): Fixed fire_sparks spritesheet layout. Was 48x48/cols:8/frames:78
 *                           (incorrect palette-mode assumption). Corrected to 80x96/cols:6/
 *                           frames:12 (standard 480x192 RGBA 6c x 2r layout per doc spec).
 *                           Reduced sizeM 2.4 -> 2.0 to match peer skills (taunt/confuse).
 * @changelog
 *   - v1.2.0 (2026-03-08): Corrected all spritesheet tile sizes and frame counts using
 *                           pixel-level content analysis. Most 480x192 RGBA sheets are
 *                           80x96 tiles (6c x 2r) or 96x96 (5c x 2r), NOT 48x48 (10c x 4r).
 *                           Most 480x288 RGBA sheets are 80x144 tiles (6c x 2r = 12 frames).
 *                           Eletric A-Sheet is 48x48 (6c x 6r = 36f, palette-mode).
 *                           Fire+Sparks and Poison Cloud are 48x48 RGBA.
 *   - v1.1.0 (2026-03-08): Switched GIF entries to RGBA sheet renderer where available.
 *   - v1.0.0 (2026-03-08): Initial implementation.
 *                           Assets: RagnaPixel Particle FX 1 (CC Attribution 4.0).
 *
 * @assetNotes
 *   GIFs    → assets/fx/gifs/       (mix-blend-mode:screen for transparency)
 *   Sheets  → assets/fx/spritesheets/ (RGBA = native alpha; P-mode = screen blend)
 */

export const FX_RENDERER = {
    GIF:   'gif',
    SHEET: 'sheet'
};

export const FX_CATALOGUE = {

    // ── Fire ─────────────────────────────────────────────────────────────────
    // Fire 1-Sheet and Bonfire-Sheet are palette-mode — GIF used.

    fire_1: {
        renderer: FX_RENDERER.GIF,
        file: 'Fire 1.gif',
        glow: '#ff5500',
        sizeM: 2.2, offsetY: -0.60, duration: 1600,
    },

    bonfire: {
        renderer: FX_RENDERER.GIF,
        file: 'Bonfire.gif',
        glow: '#ff6600',
        sizeM: 2.8, offsetY: -0.70, duration: 2000,
    },

    // RGBA sheet: 384x480, 48x48 tiles, 8c x 10r, 78 actual frames
    fire_sparks: {
        renderer: FX_RENDERER.SHEET,
        file: 'Fire+Sparks-Sheet.png',
        // RGBA 480x192 sheet — 80x96 tiles, 6c x 2r = 12 frames (standard layout)
        // Was incorrectly set to 48x48/cols:8/frames:78 (palette-mode assumption — wrong)
        tileW: 80, tileH: 96, cols: 6, frames: 12, fps: 18,
        glow: '#ff4400',
        sizeM: 2.0, offsetY: -0.60, duration: 700,
    },

    // ── Electric / Lightning ──────────────────────────────────────────────────

    // Palette-mode sheet: 288x288, 48x48 tiles, 6c x 6r = 36 frames
    electric_a: {
        renderer: FX_RENDERER.SHEET,
        file: 'Eletric A-Sheet.png',
        tileW: 48, tileH: 48, cols: 6, frames: 36, fps: 18,
        glow: '#3366ff',
        sizeM: 2.2, offsetY: -0.60, duration: 2000,
    },

    // GIF — no RGBA sheet equivalent
    electric_b: {
        renderer: FX_RENDERER.GIF,
        file: 'Eletric B.gif',
        glow: '#66aaff',
        sizeM: 2.0, offsetY: -0.60, duration: 1200,
    },

    // RGBA sheet: 480x192, 80x96 tiles, 6c x 2r, 9 actual frames
    electric_aura: {
        renderer: FX_RENDERER.SHEET,
        file: 'Eletric Aura.png',
        tileW: 80, tileH: 96, cols: 6, frames: 9, fps: 12,
        glow: '#3399ff',
        sizeM: 2.4, offsetY: -0.40, duration: 800,
    },

    // GIF — no RGBA sheet equivalent
    lightning_bolt: {
        renderer: FX_RENDERER.GIF,
        file: 'Lightning Bolt.gif',
        glow: '#ffffff',
        sizeM: 2.0, offsetY: -0.60, duration: 1000,
    },

    // ── Poison / Nature ───────────────────────────────────────────────────────

    // RGBA sheet: 576x720, 48x48 tiles, 12c x 15r, 176 actual frames
    poison_cloud: {
        renderer: FX_RENDERER.SHEET,
        file: 'Poison Cloud-Sheet.png',
        tileW: 48, tileH: 48, cols: 12, frames: 176, fps: 24,
        glow: '#44bb44',
        sizeM: 2.4, offsetY: -0.50, duration: 7400,
    },

    // RGBA sheet: 480x192, 96x96 tiles, 5c x 2r, 6 actual frames
    toxic_fireball: {
        renderer: FX_RENDERER.SHEET,
        file: 'Toxic Fireball.png',
        tileW: 96, tileH: 96, cols: 5, frames: 6, fps: 12,
        glow: '#66cc22',
        sizeM: 2.2, offsetY: -0.60, duration: 500,
    },

    // ── Holy / Heal ───────────────────────────────────────────────────────────

    // RGBA sheet: 480x288, 80x144 tiles, 6c x 2r = 12 actual frames
    holy_burst: {
        renderer: FX_RENDERER.SHEET,
        file: 'Holy Burst Flame.png',
        tileW: 80, tileH: 144, cols: 6, frames: 12, fps: 12,
        glow: '#ffdd44',
        sizeM: 2.4, offsetY: -0.60, duration: 1000,
    },

    // RGBA sheet: 480x384, 80x96 tiles, 6c x 4r, 21 actual frames
    holy_aura: {
        renderer: FX_RENDERER.SHEET,
        file: 'Holy Light Aura.png',
        tileW: 80, tileH: 96, cols: 6, frames: 21, fps: 12,
        glow: '#ffee66',
        sizeM: 2.6, offsetY: -0.40, duration: 1800,
    },

    // RGBA sheet: 480x192, 96x96 tiles, 5c x 2r, 7 actual frames
    light_spark: {
        renderer: FX_RENDERER.SHEET,
        file: 'Light Spark.png',
        tileW: 96, tileH: 96, cols: 5, frames: 7, fps: 18,
        glow: '#ffff88',
        sizeM: 1.8, offsetY: -0.60, duration: 400,
    },

    // RGBA sheet: 480x192, 80x96 tiles, 6c x 2r, 10 actual frames
    regen: {
        renderer: FX_RENDERER.SHEET,
        file: 'Regen.png',
        tileW: 80, tileH: 96, cols: 6, frames: 10, fps: 12,
        glow: '#44ff88',
        sizeM: 2.0, offsetY: -0.40, duration: 850,
    },

    // RGBA sheet: 480x192, 80x96 tiles, 6c x 2r, 10 actual frames
    lifestream: {
        renderer: FX_RENDERER.SHEET,
        file: 'Lifestream Particle.png',
        tileW: 80, tileH: 96, cols: 6, frames: 10, fps: 12,
        glow: '#44ff44',
        sizeM: 2.2, offsetY: -0.60, duration: 850,
    },

    // ── Smoke ─────────────────────────────────────────────────────────────────

    // RGBA sheet: 480x192, 96x96 tiles, 5c x 2r, 7 actual frames
    smoke_simple: {
        renderer: FX_RENDERER.SHEET,
        file: 'Smoke Simple 1.png',
        tileW: 96, tileH: 96, cols: 5, frames: 7, fps: 12,
        glow: '#888888',
        sizeM: 2.0, offsetY: -0.40, duration: 600,
    },

    // ── Dark / Arcane ─────────────────────────────────────────────────────────

    // RGBA sheet: 480x192, 80x96 tiles, 6c x 2r, 11 actual frames
    dark_ritual: {
        renderer: FX_RENDERER.SHEET,
        file: 'Dark Ritual.png',
        tileW: 80, tileH: 96, cols: 6, frames: 11, fps: 12,
        glow: '#8800ff',
        sizeM: 2.6, offsetY: -0.60, duration: 950,
    },

    // RGBA sheet: 480x192, 96x96 tiles, 5c x 2r, 6 actual frames
    dark_aura: {
        renderer: FX_RENDERER.SHEET,
        file: 'Dark Aura.png',
        tileW: 96, tileH: 96, cols: 5, frames: 6, fps: 12,
        glow: '#6600cc',
        sizeM: 2.6, offsetY: -0.40, duration: 500,
    },

    // RGBA sheet: 480x288, 80x144 tiles, 6c x 2r = 12 actual frames
    dark_swirl: {
        renderer: FX_RENDERER.SHEET,
        file: 'Dark Swirl.png',
        tileW: 80, tileH: 144, cols: 6, frames: 12, fps: 12,
        glow: '#9933ff',
        sizeM: 2.2, offsetY: -0.60, duration: 1000,
    },

    // ── Ice ───────────────────────────────────────────────────────────────────

    // RGBA sheet: 480x192, 80x96 tiles, 6c x 2r, 8 actual frames
    icicle_pike: {
        renderer: FX_RENDERER.SHEET,
        file: 'Icicle Pike.png',
        tileW: 80, tileH: 96, cols: 6, frames: 8, fps: 12,
        glow: '#88ddff',
        sizeM: 2.0, offsetY: -0.70, duration: 700,
    },

    // Snow-Sheet is palette-mode — GIF used
    snow: {
        renderer: FX_RENDERER.GIF,
        file: 'Snow.gif',
        glow: '#aaddff',
        sizeM: 2.0, offsetY: -0.60, duration: 1400,
    },

    // ── Water ─────────────────────────────────────────────────────────────────
    // Water Vortex-Sheet and Water Drops-Sheet are palette-mode — GIF used.

    water_vortex: {
        renderer: FX_RENDERER.GIF,
        file: 'Water Vortex.gif',
        glow: '#0044ff',
        sizeM: 2.2, offsetY: -0.40, duration: 1600,
    },

    water_drops: {
        renderer: FX_RENDERER.GIF,
        file: 'Water Drops.gif',
        glow: '#2266cc',
        sizeM: 1.8, offsetY: -0.60, duration: 1200,
    },

    // RGBA sheet: 288x288, 96x96 tiles, 3c x 3r, 8 actual frames
    splash: {
        renderer: FX_RENDERER.SHEET,
        file: 'Splash-Sheet.png',
        tileW: 96, tileH: 96, cols: 3, frames: 8, fps: 18,
        glow: '#66aaff',
        sizeM: 1.8, offsetY: -0.60, duration: 450,
    },

    // ── Gravity / Physical ────────────────────────────────────────────────────
    // Gravity-Sheet is palette-mode — GIF used.

    gravity: {
        renderer: FX_RENDERER.GIF,
        file: 'Gravity.gif',
        glow: '#663399',
        sizeM: 2.4, offsetY: -0.40, duration: 1600,
    },

    // RGBA sheet: 480x288, 80x144 tiles, 6c x 2r = 12 actual frames
    rock_break: {
        renderer: FX_RENDERER.SHEET,
        file: 'Rock Break.png',
        tileW: 80, tileH: 144, cols: 6, frames: 12, fps: 18,
        glow: '#996633',
        sizeM: 2.0, offsetY: -0.60, duration: 700,
    },

    // ── Shield / Buff ─────────────────────────────────────────────────────────
    // Rotating Shield: 768x224 RGBA — no clean standard tile fit — GIF used.

    rotating_shield: {
        renderer: FX_RENDERER.GIF,
        file: 'Rotating Shield.gif',
        glow: '#4488ff',
        sizeM: 2.2, offsetY: -0.40, duration: 2000,
    },

    // ── Misc ──────────────────────────────────────────────────────────────────
    // Blue Vortex-Sheet is palette-mode — GIF used.

    blue_vortex: {
        renderer: FX_RENDERER.GIF,
        file: 'Blue Vortex.gif',
        glow: '#2244ff',
        sizeM: 2.2, offsetY: -0.40, duration: 1600,
    },

    // RGBA sheet: 480x96, 80x96 tiles, 6c x 1r = 6 actual frames
    confuse: {
        renderer: FX_RENDERER.SHEET,
        file: 'Confuse1.png',
        tileW: 80, tileH: 96, cols: 6, frames: 6, fps: 12,
        glow: '#ff44ff',
        sizeM: 2.0, offsetY: -0.60, duration: 500,
    },

    // RGBA sheet: 480x192, 96x96 tiles, 5c x 2r, 7 actual frames
    blood_splat: {
        renderer: FX_RENDERER.SHEET,
        file: 'Blood Splat.png',
        tileW: 96, tileH: 96, cols: 5, frames: 7, fps: 18,
        glow: '#cc0022',
        sizeM: 1.6, offsetY: -0.60, duration: 400,
    },

    // RGBA sheet: 288x288, 96x96 tiles, 3c x 3r, 7 actual frames
    sparks: {
        renderer: FX_RENDERER.SHEET,
        file: 'Sparks-Sheet.png',
        tileW: 96, tileH: 96, cols: 3, frames: 7, fps: 18,
        glow: '#ffcc00',
        sizeM: 1.8, offsetY: -0.60, duration: 400,
    },
};

export default FX_CATALOGUE;
