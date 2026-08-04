/**
 * @file AnimationManager.js
 * @description Central controller for combat animations. Listens to EventBus combat events
 *              and routes them to appropriate animation layers (floating text, canvas effects,
 *              status icons). Handles coordinate conversion, throttling, and settings.
 * 
 * @location ui/animations/AnimationManager.js
 * @usage Created by BattleMapUI, receives HexGrid reference for coordinate conversion
 * @dependencies 
 *   - EventBus, GameEvents (systems/EventBus.js)
 *   - FloatingTextPool (ui/animations/FloatingTextPool.js)
 *   - CanvasOverlay (ui/animations/CanvasOverlay.js)
 *   - StatusIconManager (ui/animations/StatusIconManager.js)
 *   - ScreenShake (ui/animations/ScreenShake.js)
 *   - AnimationSettings (config/AnimationSettings.js)
 *   - EffectLibrary (config/EffectLibrary.js)
 *   - AnimationConfig (ui/animations/AnimationConfig.js)
 *   - hexToPixel (utils/hexMath.js)
 * 
 * @version 2.3.2
 * @changelog
 *   - v2.3.2 (2026-03-10): Fixed fxId lookup in _onSkillUsed — skill.fxId || skill.config?.fxId.
 *                           Plain objects after JSON round-trip nest config under .config, so
 *                           skill.fxId was undefined and particleFX.play() was never called.
 *   - v2.3.1 (2026-03-09): Fixed particle FX never firing on manual skill use (all maps).
 *                           Bug 1: subscribed to COMBAT_SKILL_USE (what SkillEngine actually
 *                           emits, 'combat:skillUse') instead of SKILL_USED ('skill:used') —
 *                           confirmed via EventBus.js: different string constants.
 *                           Bug 2: _onSkillUsed now reads data.source || data.caster so
 *                           SkillEngine's {source} payload resolves correctly for caster position.
 * @changelog
 *   - v2.3.0 (2026-03-08): Phase 3 particle FX integration. Added ParticleFXSystem import and
 *                          init. Added _travelOnly() helper. Updated _onSkillUsed() to split
 *                          canvas travel arc vs GIF impact. Updated _onProcTriggered() to use
 *                          GIF when proc.fxId is set (replaces canvas ring). Added particleFX
 *                          cleanup in clearAll() and destroy().
 *   - v2.2.1 (2026-03-07): Spawn poof canvas effects now mirror death exactly — same aura
 *                          (dark grey, radius 40, 1200ms) and same particles (20, dark grey,
 *                          speed 80, friction 0.97) with gravity flipped to -40 so they rise.
 *   - v2.2.0 (2026-03-07): Added entity combat motion animations (lunge/shake/spawn poof).
 *                          - Attack lunge: attacker briefly shifts toward defender on COMBAT_HIT
 *                          - Hit shake: defender oscillates left/right when struck on COMBAT_HIT
 *                          - Spawn poof: NPC scales in + particle burst on MAP_SPAWN_NPC
 *                          Uses CSS keyframe animations via entity <g> element classes.
 *                          Requires HexGrid.getEntityElement() (v1.9.0).
 *   - v2.1.0 (2026-02-10): Added proc system visual feedback (Phase 5).
 *                          PROC_TRIGGERED shows canvas ring + particle burst in proc color.
 *                          PROC_EFFECT_APPLIED shows floating text for heal, reflect damage,
 *                          bonus damage, shield gained, and mana drained amounts.
 *   - v2.0.0 (2025-02-03): Major update - Added CanvasOverlay, StatusIconManager, ScreenShake,
 *                          configurable settings, skill effects, attack effects, gold/XP effects.
 *                          Now supports 50+ effect types with category toggles.
 *   - v1.0.1 (2025-01-18): Fixed coordinate conversion to use SVG getScreenCTM()
 *   - v1.0.0 (2025-01-18): Initial implementation - floating text for damage/heal/miss
 */

import { eventBus, GameEvents } from '../../systems/EventBus.js';
import { FloatingTextPool } from './FloatingTextPool.js';
import { VisibleHealSources, EntityAnimationConfig } from './AnimationConfig.js';
import { hexToPixel } from '../../utils/hexMath.js';

// New imports for Phase 2
import { AnimationSettings } from '../../config/AnimationSettings.js';
import { EffectTypeAnimations, SkillEffectMapping, SkillEffects, StatusIcons } from '../../config/EffectLibrary.js';

// Phase 3 — particle FX
import { ParticleFXSystem } from '../../systems/ParticleFXSystem.js';

// ── Module-level helpers ──────────────────────────────────────────────────────

/**
 * Strip impact-only fields from a canvas effect config so the canvas only
 * draws the travel portion (projectile arc, lightning arc, attack line).
 * The GIF layer handles the impact visual, so we suppress canvas rings/
 * particles/aura at the destination. Screen shake is kept — it's not a
 * visual duplicate of the GIF.
 *
 * @param {Object} config - A SkillEffects entry from EffectLibrary
 * @returns {Object|null} - Stripped config, or null if no travel elements
 */
function _travelOnly(config) {
    const { projectile, lightning, attackLine } = config;
    if (!projectile && !lightning && !attackLine) return null;

    const result = {};
    if (projectile) result.projectile = projectile;
    if (lightning)  result.lightning  = lightning;
    if (attackLine) result.attackLine = attackLine;
    // Keep shake — not a visual duplicate of the GIF
    if (config.onHit?.shake) result.onHit = { shake: config.onHit.shake };
    return result;
}

// ── AnimationManager ──────────────────────────────────────────────────────────

/**
 * AnimationManager - Central controller for combat animations
 */
export class AnimationManager {
    /**
     * Create an AnimationManager
     * @param {BattleMapUI} battleMapUI - Reference to parent BattleMapUI
     * @param {HexGrid} hexGrid - Reference to HexGrid for coordinate conversion
     */
    constructor(battleMapUI, hexGrid) {
        this.battleMapUI = battleMapUI;
        this.hexGrid = hexGrid;
        
        // Animation layers (initialized in init())
        this.floatingTextPool = null;
        this.floatingTextLayer = null;
        this.canvasOverlay = null;
        this.statusIconManager = null;
        this.screenShake = null;
        this.particleFX = null;          // Phase 3 — GIF/sheet renderer
        
        // Settings
        this.enabled = true;
        
        // Event listener cleanup
        this._unsubscribers = [];
    }
    
    /**
     * Initialize the animation system
     * @param {HTMLElement} container - Container element (typically .battle-main)
     * @param {Object} options - Optional layer references
     */
    async init(container, options = {}) {
        this.container = container;
        
        // Initialize settings
        AnimationSettings.init();
        
        // Create floating text layer (Phase 1 - existing)
        this.floatingTextLayer = document.createElement('div');
        this.floatingTextLayer.className = 'floating-text-layer';
        container.appendChild(this.floatingTextLayer);
        
        // Initialize floating text pool
        this.floatingTextPool = new FloatingTextPool(this.floatingTextLayer);
        
        // Initialize canvas overlay (Phase 2 - new)
        if (options.canvasOverlay) {
            this.canvasOverlay = options.canvasOverlay;
        } else {
            // Dynamically import to avoid circular dependencies
            const { CanvasOverlay } = await import('./CanvasOverlay.js');
            this.canvasOverlay = new CanvasOverlay(container);
            this.canvasOverlay.start();
        }
        
        // Initialize status icon manager (Phase 3 - new)
        if (options.statusIcons) {
            this.statusIconManager = options.statusIcons;
        } else {
            const { StatusIconManager } = await import('./StatusIconManager.js');
            this.statusIconManager = new StatusIconManager(container);
        }
        
        // Initialize screen shake (Phase 2 - new)
        const { ScreenShake } = await import('./ScreenShake.js');
        this.screenShake = new ScreenShake(container);

        // Initialize particle FX system (Phase 3 - new)
        const fxLayerEl = container.querySelector('.fx-gif-layer');
        if (fxLayerEl) {
            this.particleFX = new ParticleFXSystem(fxLayerEl, this.hexGrid);
        } else {
            console.warn('[AnimationManager] .fx-gif-layer not found — particle FX disabled');
        }

        // Subscribe to combat events
        this._setupEventListeners();
        
        console.log('[AnimationManager] Initialized v2.3.0');
    }
    
    /**
     * Setup EventBus listeners
     */
    _setupEventListeners() {
        // === Phase 1 Events (existing) ===
        this._subscribe(GameEvents.COMBAT_HIT, this._onCombatHit.bind(this));
        this._subscribe(GameEvents.COMBAT_HEAL, this._onCombatHeal.bind(this));
        this._subscribe(GameEvents.COMBAT_MISS, this._onCombatMiss.bind(this));
        this._subscribe(GameEvents.POTION_USED, this._onPotionUsed.bind(this));
        
        // === Phase 2 Events (new) ===
        this._subscribe(GameEvents.CHARACTER_XP_GAIN, this._onXPGain.bind(this));
        this._subscribe(GameEvents.CHARACTER_LEVEL_UP, this._onLevelUp.bind(this));
        
        // === Phase 3 Events (new) ===
        this._subscribe(GameEvents.STATUS_APPLIED, this._onStatusApplied.bind(this));
        this._subscribe(GameEvents.STATUS_REMOVED, this._onStatusRemoved.bind(this));
        this._subscribe(GameEvents.STATUS_TICK, this._onStatusTick.bind(this));
        this._subscribe(GameEvents.COMBAT_SKILL_USE, this._onSkillUsed.bind(this));
        this._subscribe(GameEvents.COMBAT_DEATH, this._onCombatDeath.bind(this));
        this._subscribe(GameEvents.LOOT_SPAWNED, this._onLootSpawned.bind(this));
        
        // === Phase 5 Events (proc system) ===
        this._subscribe(GameEvents.PROC_TRIGGERED, this._onProcTriggered.bind(this));
        this._subscribe(GameEvents.PROC_EFFECT_APPLIED, this._onProcEffectApplied.bind(this));

        // === Entity Motion Animations (lunge / shake / spawn poof) ===
        this._subscribe(GameEvents.MAP_SPAWN_NPC, this._onNpcSpawn.bind(this));
    }
    
    /**
     * Subscribe to an event with automatic cleanup tracking
     */
    _subscribe(event, handler) {
        const unsub = eventBus.on(event, handler);
        this._unsubscribers.push(unsub);
    }
    
    /**
     * Convert hex coordinates to screen coordinates
     * @param {object} position - {q, r} hex coordinates
     * @returns {object|null} {x, y} screen coordinates
     */
    _hexToScreen(position) {
        if (!position || typeof position.q !== 'number' || typeof position.r !== 'number') {
            return null;
        }
        
        const svg = this.hexGrid?.svg;
        if (!svg || !this.floatingTextLayer) {
            return null;
        }
        
        const hexRadius = this.hexGrid.hexRadius;
        const { x: svgX, y: svgY } = hexToPixel(position.q, position.r, hexRadius);
        
        const svgPoint = svg.createSVGPoint();
        svgPoint.x = svgX;
        svgPoint.y = svgY;
        
        const screenCTM = svg.getScreenCTM();
        if (!screenCTM) return null;
        
        const screenPoint = svgPoint.matrixTransform(screenCTM);
        const layerRect = this.floatingTextLayer.getBoundingClientRect();
        
        return {
            x: screenPoint.x - layerRect.left,
            y: screenPoint.y - layerRect.top
        };
    }
    
    // === Phase 1 Event Handlers (existing, enhanced) ===
    
    /**
     * Handle COMBAT_HIT event
     */
    _onCombatHit(data) {
        if (!this.enabled) return;
        
        const { attacker, defender, damage, isCritical } = data;
        if (!defender?.position || typeof damage !== 'number') return;
        
        const defenderPos = this._hexToScreen(defender.position);
        if (!defenderPos) return;
        
        // --- Entity motion animations ---
        // Attacker lunges toward defender
        if (attacker?.position && attacker?.id) {
            const attackerPos = this._hexToScreen(attacker.position);
            if (attackerPos) {
                this._lungeEntity(attacker.id, attackerPos, defenderPos);
            }
        }
        // Defender shakes on hit
        if (defender?.id) {
            this._shakeEntity(defender.id);
        }
        
        // Floating damage number (HP Effects category)
        if (AnimationSettings.isCategoryEnabled('hpEffects')) {
            const type = isCritical ? 'critical' : 'damage';
            this.floatingTextPool.spawn(type, damage, defenderPos.x, defenderPos.y);
        }
        
        // Attack line and hit spark (Regular Attack category)
        if (AnimationSettings.isCategoryEnabled('regularAttacks') && this.canvasOverlay) {
            const attackerPos = attacker?.position ? this._hexToScreen(attacker.position) : null;
            
            if (attackerPos) {
                // Attack line
                if (AnimationSettings.isSubcategoryEnabled('attackLines')) {
                    const lineColor = isCritical ? '#ffd700' : '#ff4444';
                    this.canvasOverlay.addLine(attackerPos.x, attackerPos.y, defenderPos.x, defenderPos.y, {
                        color: lineColor,
                        duration: isCritical ? 300 : 250
                    });
                }
            }
            
            // Hit sparks
            if (AnimationSettings.isSubcategoryEnabled('hitSparks')) {
                const sparkConfig = isCritical 
                    ? { count: 18, colors: ['#ffd700', '#ffaa00', '#ffffff'], speed: 280, life: 0.6, gravity: 70 }
                    : { count: 10, colors: ['#ff4444', '#ff6666', '#ffaaaa'], speed: 180, life: 0.4, gravity: 80 };
                
                this.canvasOverlay.hitSpark(defenderPos.x, defenderPos.y, sparkConfig);
            }
            
            // Screen shake for crits
            if (isCritical && this.screenShake) {
                this.screenShake.heavy();
            }
        }
    }
    
    /**
     * Handle COMBAT_HEAL event
     */
    _onCombatHeal(data) {
        if (!this.enabled) return;
        if (!AnimationSettings.isCategoryEnabled('hpEffects')) return;
        
        const { source, target, amount } = data;
        
        // Filter auto-regen heals
        if (source && !VisibleHealSources.includes(source)) return;
        if (source === 'regen' || source === 'regeneration') return;
        if (!target?.position || typeof amount !== 'number') return;
        if (amount < 5 && !source) return;
        
        const screenPos = this._hexToScreen(target.position);
        if (!screenPos) return;
        
        this.floatingTextPool.spawn('heal', amount, screenPos.x, screenPos.y);
        
        // Optional heal particles
        if (AnimationSettings.isCategoryEnabled('skillEffects') && this.canvasOverlay) {
            this.canvasOverlay.healEffect(screenPos.x, screenPos.y, { count: 8 });
        }
    }
    
    /**
     * Handle COMBAT_MISS event
     */
    _onCombatMiss(data) {
        if (!this.enabled) return;
        if (!AnimationSettings.isCategoryEnabled('hpEffects')) return;
        
        const { defender } = data;
        if (!defender?.position) return;
        
        const screenPos = this._hexToScreen(defender.position);
        if (!screenPos) return;
        
        this.floatingTextPool.spawn('miss', null, screenPos.x, screenPos.y);
    }
    
    /**
     * Handle POTION_USED event
     */
    _onPotionUsed(data) {
        if (!this.enabled) return;
        if (!AnimationSettings.isCategoryEnabled('hpEffects')) return;
        
        const { character, potionType, amount } = data;
        if (potionType !== 'health') return;
        if (!character?.position || typeof amount !== 'number') return;
        
        const screenPos = this._hexToScreen(character.position);
        if (!screenPos) return;
        
        this.floatingTextPool.spawn('heal', amount, screenPos.x, screenPos.y);
        
        // Potion effect
        if (this.canvasOverlay) {
            this.canvasOverlay.addRing(screenPos.x, screenPos.y, {
                color: '#ff4466',
                maxRadius: 35,
                duration: 280
            });
        }
    }
    
    // === Phase 2 Event Handlers (new) ===
    
    /**
     * Handle CHARACTER_XP_GAIN event
     */
    _onXPGain(data) {
        if (!this.enabled) return;
        if (!AnimationSettings.isCategoryEnabled('goldXpEffects')) return;
        if (!AnimationSettings.isSubcategoryEnabled('xpGain')) return;
        
        const { character, amount } = data;
        if (!character?.position || typeof amount !== 'number') return;
        
        const screenPos = this._hexToScreen(character.position);
        if (!screenPos) return;
        
        // XP floating text
        this.floatingTextPool.spawn('heal', `+${amount} XP`, screenPos.x, screenPos.y - 20);
    }
    
    /**
     * Handle CHARACTER_LEVEL_UP event
     */
    _onLevelUp(data) {
        if (!this.enabled) return;
        if (!AnimationSettings.isCategoryEnabled('goldXpEffects')) return;
        if (!AnimationSettings.isSubcategoryEnabled('levelUp')) return;
        
        const { character, newLevel } = data;
        if (!character?.position) return;
        
        const screenPos = this._hexToScreen(character.position);
        if (!screenPos) return;
        
        // Level up celebration
        if (this.canvasOverlay) {
            // Aura
            this.canvasOverlay.addAura(screenPos.x, screenPos.y, {
                color: '#ffdd44',
                duration: 1800,
                radius: 50
            });
            
            // Multiple expanding rings
            for (let i = 0; i < 4; i++) {
                setTimeout(() => {
                    this.canvasOverlay.addRing(screenPos.x, screenPos.y, {
                        color: '#ffdd44',
                        maxRadius: 30 + i * 25,
                        duration: 500
                    });
                }, i * 100);
            }
            
            // Star burst
            this.canvasOverlay.addParticles({
                x: screenPos.x,
                y: screenPos.y,
                count: 25,
                speed: 120,
                life: 1,
                colors: ['#ffdd44', '#ffee88', '#ffffff', '#ffaa00'],
                type: 'star',
                rotationSpeed: 4
            });
        }
        
        // Screen shake
        if (this.screenShake) {
            setTimeout(() => this.screenShake.medium(), 300);
        }
        
        // Floating text
        this.floatingTextPool.spawn('critical', `LEVEL ${newLevel}!`, screenPos.x, screenPos.y - 30);
    }
    
    // === Phase 3 Event Handlers (new) ===
    
    /**
     * Handle STATUS_APPLIED event (from EffectSystem)
     */
    _onStatusApplied(data) {
        if (!this.enabled) return;
        if (!AnimationSettings.isCategoryEnabled('skillEffects')) return;
        
        const { target, effect, source } = data;
        if (!target?.position || !effect) return;
        
        const screenPos = this._hexToScreen(target.position);
        if (!screenPos) return;
        
        const effectType = effect.effectType;
        const effectConfig = EffectTypeAnimations[effectType];
        
        if (!effectConfig) return;
        
        // Add status icon
        if (this.statusIconManager && AnimationSettings.isSubcategoryEnabled('statusIcons')) {
            const icon = effectConfig.icon || StatusIcons[effectType] || '✨';
            const iconType = effectConfig.iconType || (effectType.startsWith('buff') ? 'buff' : 'debuff');
            const duration = effect.duration ? effect.duration * 1000 : 0; // Convert ticks to ms
            
            this.statusIconManager.addStatus(
                target.id,
                effect.id,
                screenPos,
                icon,
                iconType,
                duration
            );
        }
        
        // Play visual effect on apply
        if (effectConfig.onApply && this.canvasOverlay) {
            this._playEffectConfig(screenPos, effectConfig.onApply);
        }
    }
    
    /**
     * Handle STATUS_REMOVED event
     */
    _onStatusRemoved(data) {
        if (!this.enabled) return;
        
        const { target, effect } = data;
        if (!target || !effect) return;
        
        // Remove status icon
        if (this.statusIconManager) {
            this.statusIconManager.removeStatus(target.id, effect.id);
        }
    }
    
    /**
     * Handle STATUS_TICK event (DoT/HoT ticks)
     */
    _onStatusTick(data) {
        if (!this.enabled) return;
        if (!AnimationSettings.isCategoryEnabled('skillEffects')) return;
        
        const { target, effect, damage, healing } = data;
        if (!target?.position || !effect) return;
        
        const screenPos = this._hexToScreen(target.position);
        if (!screenPos) return;
        
        const effectConfig = EffectTypeAnimations[effect.effectType];
        
        // Play tick effect
        if (effectConfig?.onTick && this.canvasOverlay) {
            this._playEffectConfig(screenPos, effectConfig.onTick);
        }
        
        // Show damage/heal number
        if (AnimationSettings.isCategoryEnabled('hpEffects')) {
            if (damage && damage > 0) {
                this.floatingTextPool.spawn('damage', damage, screenPos.x, screenPos.y);
            } else if (healing && healing > 0) {
                this.floatingTextPool.spawn('heal', healing, screenPos.x, screenPos.y);
            }
        }
    }
    
    /**
     * Handle COMBAT_SKILL_USE event (v2.3.1: was SKILL_USED — wrong event name).
     * Canvas handles travel (projectile/lightning arcs).
     * GIF handles impact at target position(s) when skill.fxId is set.
     * No double-firing: if fxId present, canvas strips impact fields via _travelOnly().
     */
    _onSkillUsed(data) {
        if (!this.enabled) return;
        if (!AnimationSettings.isCategoryEnabled('skillEffects')) return;

        // SkillEngine emits { skill, source, targets, results }.
        // Support both 'source' (SkillEngine) and 'caster' (any legacy emitters).
        const skill   = data.skill;
        const caster  = data.source || data.caster;
        const targets = data.targets;
        if (!caster?.position || !skill) return;

        const casterPos = this._hexToScreen(caster.position);
        if (!casterPos) return;

        // Canvas: travel arc only when GIF takes impact; full effect when no GIF
        const effectKey    = SkillEffectMapping[skill.name || skill.id];
        const effectConfig = effectKey ? SkillEffects[effectKey] : null;
        // fxId may live on the Skill instance directly, or on skill.config after JSON round-trip
        const fxId = skill.fxId || skill.config?.fxId;

        if (effectConfig) {
            if (fxId) {
                // GIF handles the impact — give canvas the travel arc only
                const travelConfig = _travelOnly(effectConfig);
                if (travelConfig) this._playSkillEffect(casterPos, targets, travelConfig);
            } else {
                // No GIF — canvas plays the full effect (unchanged legacy path)
                this._playSkillEffect(casterPos, targets, effectConfig);
            }
        }

        // GIF: impact at each target position
        if (fxId && AnimationSettings.isCategoryEnabled('particleFX')
                && AnimationSettings.quality !== 'low') {
            const positions = targets?.map(t => t.position).filter(Boolean) ?? [];
            if (positions.length === 0 && caster?.position) {
                positions.push(caster.position); // self-target fallback
            }
            positions.forEach(pos => this.particleFX?.play(fxId, pos));
        }
    }
    
    /**
     * Handle COMBAT_DEATH event
     */
    _onCombatDeath(data) {
        if (!this.enabled) return;
        
        const { entity } = data;
        if (!entity?.position) return;
        
        const screenPos = this._hexToScreen(entity.position);
        if (!screenPos) return;
        
        // Clear status icons
        if (this.statusIconManager) {
            this.statusIconManager.clearEntity(entity.id);
        }
        
        // Death effect
        if (AnimationSettings.isCategoryEnabled('skillEffects') && this.canvasOverlay) {
            this.canvasOverlay.addAura(screenPos.x, screenPos.y, {
                color: '#444444',
                duration: 1200,
                radius: 40
            });
            
            this.canvasOverlay.addParticles({
                x: screenPos.x,
                y: screenPos.y,
                count: 20,
                speed: 80,
                life: 1,
                colors: ['#444444', '#666666', '#333333', '#222222'],
                gravity: 40,
                friction: 0.97
            });
        }
    }
    
    /**
     * Handle LOOT_SPAWNED event
     */
    _onLootSpawned(data) {
        if (!this.enabled) return;
        if (!AnimationSettings.isCategoryEnabled('lootEffects')) return;
        
        const { loot, position } = data;
        if (!position) return;
        
        const screenPos = this._hexToScreen(position);
        if (!screenPos) return;
        
        if (this.canvasOverlay && AnimationSettings.isSubcategoryEnabled('dropParticles')) {
            // Loot drop effect
            this.canvasOverlay.addRing(screenPos.x, screenPos.y, {
                color: '#ffaa00',
                maxRadius: 50,
                duration: 400
            });
            
            this.canvasOverlay.addParticles({
                x: screenPos.x,
                y: screenPos.y,
                count: 15,
                speed: 100,
                life: 0.7,
                colors: ['#ffaa00', '#ffcc44', '#ffdd88', '#ffffff'],
                type: 'star',
                rotationSpeed: 2,
                gravity: 60
            });
        }
    }
    
    // === Phase 5 Event Handlers (proc system) ===
    
    /**
     * Handle PROC_TRIGGERED event - show proc name at target position
     * If proc.fxId is set: GIF plays and canvas ring is suppressed.
     * If no fxId: existing canvas ring + particles play unchanged.
     */
    _onProcTriggered(data) {
        if (!this.enabled) return;
        if (!AnimationSettings.isCategoryEnabled('skillEffects')) return;

        const { target, proc, source } = data;
        const position = target?.position || source?.position;
        if (!position) return;

        const screenPos = this._hexToScreen(position);
        if (!screenPos) return;

        if (proc?.fxId && AnimationSettings.isCategoryEnabled('particleFX')
                && AnimationSettings.quality !== 'low') {
            // GIF replaces the canvas ring entirely — no double-firing
            this.particleFX?.play(proc.fxId, position);
        } else {
            // No fxId — existing canvas ring + particles (unchanged)
            const procColor = proc?.color || '#FFD700';
            if (this.canvasOverlay && AnimationSettings.isSubcategoryEnabled('dropParticles')) {
                this.canvasOverlay.addRing(screenPos.x, screenPos.y, {
                    color: procColor,
                    maxRadius: 35,
                    duration: 350
                });

                this.canvasOverlay.addParticles({
                    x: screenPos.x,
                    y: screenPos.y,
                    count: 8,
                    speed: 60,
                    life: 0.5,
                    colors: [procColor, '#ffffff'],
                    type: 'star',
                    rotationSpeed: 3
                });
            }
        }
    }
    
    /**
     * Handle PROC_EFFECT_APPLIED event - show effect amounts as floating text
     */
    _onProcEffectApplied(data) {
        if (!this.enabled) return;
        if (!AnimationSettings.isCategoryEnabled('hpEffects')) return;
        if (!this.floatingTextPool) return;
        
        const { source, target, healAmount, reflectDamage, bonusDamage, shieldAmount, manaDrained } = data;
        
        // Heal amount (lifesteal, soulreaper) — green heal text on source
        if (healAmount && healAmount > 0 && source?.position) {
            const pos = this._hexToScreen(source.position);
            if (pos) this.floatingTextPool.spawn('heal', `+${healAmount}`, pos.x, pos.y);
        }
        
        // Reflect damage (thorns) — red damage text on attacker
        if (reflectDamage && reflectDamage > 0 && target?.position) {
            const pos = this._hexToScreen(target.position);
            if (pos) this.floatingTextPool.spawn('damage', reflectDamage, pos.x, pos.y);
        }
        
        // Bonus damage (executioner) — critical-styled text on target
        if (bonusDamage && bonusDamage > 0 && target?.position) {
            const pos = this._hexToScreen(target.position);
            if (pos) this.floatingTextPool.spawn('critical', bonusDamage, pos.x, pos.y);
        }
        
        // Shield amount (warding) — heal-styled text on source
        if (shieldAmount && shieldAmount > 0 && source?.position) {
            const pos = this._hexToScreen(source.position);
            if (pos) this.floatingTextPool.spawn('heal', `🛡${shieldAmount}`, pos.x, pos.y - 10);
        }
        
        // Mana drained — damage-styled on target
        if (manaDrained && manaDrained > 0 && target?.position) {
            const pos = this._hexToScreen(target.position);
            if (pos) this.floatingTextPool.spawn('damage', `-${manaDrained}MP`, pos.x, pos.y);
        }
    }
    
    // === Entity Motion Animation Handlers ===

    /**
     * Handle MAP_SPAWN_NPC — play spawn poof on the newly added entity.
     * Small RAF delay ensures HexGrid.addEntity() has written to the DOM first.
     */
    _onNpcSpawn(data) {
        if (!this.enabled) return;
        const { npc } = data;
        if (!npc?.id) return;

        // One frame delay: BattleMapUI calls hexGrid.addEntity() in its own MAP_SPAWN_NPC
        // listener. We need the <g> to exist before we can animate it.
        requestAnimationFrame(() => {
            this._spawnPoofEntity(npc.id);

            // Canvas effects — mirror of death poof with gravity reversed (particles rise)
            if (npc.position && this.canvasOverlay && AnimationSettings.isCategoryEnabled('skillEffects')) {
                const screenPos = this._hexToScreen(npc.position);
                if (screenPos) {
                    this.canvasOverlay.addAura(screenPos.x, screenPos.y, {
                        color: '#444444',
                        duration: 1200,
                        radius: 40
                    });

                    this.canvasOverlay.addParticles({
                        x: screenPos.x,
                        y: screenPos.y,
                        count: 20,
                        speed: 80,
                        life: 1,
                        colors: ['#444444', '#666666', '#333333', '#222222'],
                        gravity: -40,
                        friction: 0.97
                    });
                }
            }
        });
    }

    // === Entity Motion Helpers ===

    /**
     * Parse the current CSS translate values from an entity <g> style.transform.
     * @param {SVGGElement} g
     * @returns {{ tx: number, ty: number }}
     */
    _parseEntityTranslate(g) {
        const t = g.style.transform || '';
        const m = t.match(/translate\(\s*([-\d.]+)px,\s*([-\d.]+)px\s*\)/);
        return { tx: m ? parseFloat(m[1]) : 0, ty: m ? parseFloat(m[2]) : 0 };
    }

    /**
     * Briefly lunge the attacker's tile toward the defender then snap back.
     * @param {string} entityId - Attacker entity id
     * @param {{ x: number, y: number }} fromPos - Screen coords of attacker
     * @param {{ x: number, y: number }} toPos   - Screen coords of defender
     */
    _lungeEntity(entityId, fromPos, toPos) {
        const g = this.hexGrid?.getEntityElement?.(entityId);
        if (!g || g.classList.contains('entity-lunging')) return;

        const dx = toPos.x - fromPos.x;
        const dy = toPos.y - fromPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist === 0) return;

        const { tx, ty } = this._parseEntityTranslate(g);
        const lungeX = (dx / dist) * EntityAnimationConfig.LUNGE_DISTANCE;
        const lungeY = (dy / dist) * EntityAnimationConfig.LUNGE_DISTANCE;

        g.style.setProperty('--base-tx', `${tx}px`);
        g.style.setProperty('--base-ty', `${ty}px`);
        g.style.setProperty('--lunge-x', `${lungeX}px`);
        g.style.setProperty('--lunge-y', `${lungeY}px`);
        g.classList.add('entity-lunging');

        setTimeout(() => {
            g.classList.remove('entity-lunging');
            g.style.removeProperty('--lunge-x');
            g.style.removeProperty('--lunge-y');
        }, EntityAnimationConfig.LUNGE_DURATION + 20);
    }

    /**
     * Rapidly oscillate the defender's tile left/right on a hit.
     * @param {string} entityId - Defender entity id
     */
    _shakeEntity(entityId) {
        const g = this.hexGrid?.getEntityElement?.(entityId);
        if (!g) return;

        const { tx, ty } = this._parseEntityTranslate(g);
        g.style.setProperty('--base-tx', `${tx}px`);
        g.style.setProperty('--base-ty', `${ty}px`);

        // Restart animation if already shaking (rapid hits)
        g.classList.remove('entity-shaking');
        void g.offsetWidth; // force reflow to restart keyframe
        g.classList.add('entity-shaking');

        setTimeout(() => {
            g.classList.remove('entity-shaking');
        }, EntityAnimationConfig.SHAKE_DURATION + 20);
    }

    /**
     * Scale-and-blur an NPC entity in from nothing (mirrors the death poof out).
     * @param {string} entityId - NPC entity id
     */
    _spawnPoofEntity(entityId) {
        const g = this.hexGrid?.getEntityElement?.(entityId);
        if (!g) return;

        // Ensure any stale spawning class is cleared first
        g.classList.remove('entity-spawning');
        void g.offsetWidth;
        g.classList.add('entity-spawning');

        setTimeout(() => {
            g.classList.remove('entity-spawning');
        }, EntityAnimationConfig.SPAWN_DURATION + 20);
    }

    // === Helper Methods ===
    
    /**
     * Play an effect configuration at a position
     */
    _playEffectConfig(pos, config) {
        if (!this.canvasOverlay) return;
        
        // Aura
        if (config.aura) {
            this.canvasOverlay.addAura(pos.x, pos.y, config.aura);
        }
        
        // Rings
        if (config.rings) {
            config.rings.forEach((ringConfig, i) => {
                const delay = ringConfig.delay || 0;
                setTimeout(() => {
                    this.canvasOverlay.addRing(pos.x, pos.y, ringConfig);
                }, delay);
            });
        } else if (config.ring) {
            this.canvasOverlay.addRing(pos.x, pos.y, config.ring);
        }
        
        // Particles
        if (config.particles) {
            this.canvasOverlay.addParticles({
                x: pos.x,
                y: pos.y,
                ...config.particles
            });
        }
        
        // Screen shake
        if (config.shake && this.screenShake) {
            this.screenShake.shake(config.shake);
        }
    }
    
    /**
     * Play a skill effect
     */
    _playSkillEffect(casterPos, targets, config) {
        if (!this.canvasOverlay) return;
        
        // Get first target position
        let targetPos = casterPos;
        if (targets && targets.length > 0 && targets[0].position) {
            targetPos = this._hexToScreen(targets[0].position) || casterPos;
        }
        
        // Projectile
        if (config.projectile) {
            this.canvasOverlay.addProjectile({
                x: casterPos.x,
                y: casterPos.y,
                targetX: targetPos.x,
                targetY: targetPos.y,
                ...config.projectile,
                onHit: (x, y) => {
                    if (config.onHit) {
                        this._playEffectConfig({ x, y }, config.onHit);
                    }
                }
            });
        }
        
        // Lightning
        if (config.lightning) {
            this.canvasOverlay.addLightning(
                casterPos.x, casterPos.y,
                targetPos.x, targetPos.y,
                config.lightning
            );
            
            if (config.onHit) {
                setTimeout(() => {
                    this._playEffectConfig(targetPos, config.onHit);
                }, 50);
            }
        }
        
        // Attack line
        if (config.attackLine) {
            this.canvasOverlay.addLine(
                casterPos.x, casterPos.y,
                targetPos.x, targetPos.y,
                config.attackLine
            );
            
            if (config.onHit) {
                setTimeout(() => {
                    this._playEffectConfig(targetPos, config.onHit);
                }, 100);
            }
        }
        
        // Self-cast effects (aura, rings, particles at caster)
        if (config.aura || config.rings || (config.particles && !config.projectile)) {
            this._playEffectConfig(casterPos, config);
        }
    }
    
    // === Public API ===
    
    /**
     * Enable or disable all animations
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        
        if (!enabled) {
            this.floatingTextPool?.clearAll();
            this.canvasOverlay?.clearAll();
            this.statusIconManager?.clearAll();
        }
    }
    
    /**
     * Get current active animation count
     */
    getActiveCount() {
        const textCount = this.floatingTextPool?.getActiveCount() || 0;
        const canvasStats = this.canvasOverlay?.getStats() || {};
        
        return {
            floatingText: textCount,
            ...canvasStats
        };
    }
    
    /**
     * Clear all active animations
     */
    clearAll() {
        this.floatingTextPool?.clearAll();
        this.canvasOverlay?.clearAll();
        this.statusIconManager?.clearAll();
        this.particleFX?.clearAll();
    }
    
    /**
     * Cleanup and destroy
     */
    destroy() {
        // Unsubscribe from all events
        for (const unsub of this._unsubscribers) {
            if (typeof unsub === 'function') unsub();
        }
        this._unsubscribers = [];
        
        // Destroy layers
        this.floatingTextPool?.destroy();
        this.canvasOverlay?.destroy();
        this.statusIconManager?.destroy();
        this.screenShake?.destroy();
        this.particleFX?.destroy();

        // Remove floating text layer
        this.floatingTextLayer?.remove();

        // Clear references
        this.floatingTextPool = null;
        this.floatingTextLayer = null;
        this.canvasOverlay = null;
        this.statusIconManager = null;
        this.screenShake = null;
        this.particleFX = null;
        
        console.log('[AnimationManager] Destroyed');
    }
}

export default AnimationManager;
