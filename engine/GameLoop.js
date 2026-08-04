/**
 * @file GameLoop.js
 * @description Main game tick processing - handles combat, movement, AI, auto-battle, loot, potions, and auto-cast skills
 * 
 * @location engine/GameLoop.js
 * @version 1.6.0
 * @changelog
 *   - v1.6.0 (2026-03-07): _processNPCAI() skips AI for 800ms after npc.spawnTime so the
 *                          spawn poof animation completes before the NPC's first move.
 *   - v1.5.0 (2026-02-10): Housing hpRegen buff integration. _regenTick() now applies
 *                          Hearth housing hpRegen percentage multiplier to base health
 *                          regeneration. Also adds passive skill healthRegen flat bonus
 *                          to regen tick (was previously displayed in StatsUI but not
 *                          applied in actual regen calculation).
 *   - v1.4.0 (2025-01-19): Added auto-cast skill processing via SkillEngine.getNextAutoCastSkill()
 *   - v1.3.0 (2025-01-03): Added auto-potion processing during combat tick
 *   - v1.2.0 (2025-01-03): Passive regen now silent (no combat log messages)
 *   - v1.1.0 (2025-01-02): Gold always auto-collected when adjacent (regardless of auto-loot toggle)
 *   - v1.0.0 (2025-01): Initial implementation
 */

// GameLoop - Main game tick processing
import { GameConfig } from '../config/gameConfig.js';
import { eventBus, GameEvents } from '../systems/EventBus.js';
import { combatEngine } from './CombatEngine.js';
import { movementEngine } from './MovementEngine.js';
import SkillEngine from './SkillEngine.js';
import { hexDistance, findPath, getHexNeighbors, isInBounds } from '../utils/hexMath.js';

export class GameLoop {
    constructor() {
        this.isRunning = false;
        this.lastTick = 0;
        this.tickCount = 0;
        
        // References
        this.mapInstance = null;
        this.player = null;
        
        // Timing
        this.combatTickInterval = null;
        this.regenTickInterval = null;
        
        // Auto-battle state
        this.autoBattleActive = false;
    }
    
    /**
     * Start the game loop
     */
    start(mapInstance, player) {
        if (this.isRunning) {
            this.stop();
        }
        
        this.mapInstance = mapInstance;
        this.player = player;
        this.isRunning = true;
        this.lastTick = Date.now();
        
        // Start movement engine
        movementEngine.start();
        
        // Start combat tick
        this.combatTickInterval = setInterval(() => {
            this._combatTick();
        }, GameConfig.tick.combatRate);
        
        // Start regen tick
        this.regenTickInterval = setInterval(() => {
            this._regenTick();
        }, GameConfig.tick.regenRate);
        
        // Setup event listeners
        this._setupEventListeners();
        
        eventBus.emit(GameEvents.GAME_START, {
            mapInstance,
            player
        });
    }
    
    /**
     * Stop the game loop
     */
    stop() {
        this.isRunning = false;
        
        movementEngine.stop();
        
        if (this.combatTickInterval) {
            clearInterval(this.combatTickInterval);
            this.combatTickInterval = null;
        }
        
        if (this.regenTickInterval) {
            clearInterval(this.regenTickInterval);
            this.regenTickInterval = null;
        }
        
        eventBus.emit(GameEvents.GAME_PAUSE, {});
    }
    
    _setupEventListeners() {
        // Hex click - move to or interact
        eventBus.on(GameEvents.INPUT_HEX_CLICK, (data) => {
            if (!this.player || !this.mapInstance) return;
            
            // If clicked on loot, pick it up
            if (data.hasLoot) {
                const distance = hexDistance(
                    this.player.position.q, this.player.position.r,
                    data.q, data.r
                );
                
                if (distance <= 1) {
                    // Pick up loot
                    for (const loot of this.mapInstance.lootDrops.values()) {
                        if (loot.position.q === data.q && loot.position.r === data.r) {
                            this.mapInstance.pickupLoot(loot.id, this.player);
                            break;
                        }
                    }
                } else {
                    // Move toward loot
                    movementEngine.moveTo(this.player, data.q, data.r, this.mapInstance);
                }
            } else {
                // Check for exit
                const exit = this.mapInstance.mapData.exits?.find(e => e.q === data.q && e.r === data.r);
                if (exit) {
                    // Notify about exit (map transition would be handled by game manager)
                    eventBus.emit(GameEvents.UI_ACTION_LOG, {
                        type: 'system',
                        message: `Exit to ${exit.label} available. Click again to travel.`
                    });
                }
                
                // Move to clicked hex
                movementEngine.moveTo(this.player, data.q, data.r, this.mapInstance);
            }
        });
        
        // Entity click - target or attack
        eventBus.on(GameEvents.INPUT_ENTITY_CLICK, (data) => {
            if (!this.player || !this.mapInstance) return;
            
            const entity = data.entity;
            
            // If it's an NPC, target it
            if (this.mapInstance.npcs.has(entity.id)) {
                this.player.currentTarget = entity;
                
                const distance = hexDistance(
                    this.player.position.q, this.player.position.r,
                    entity.position.q, entity.position.r
                );
                
                const attackRange = this.player.attackRange || GameConfig.combat.meleeRange;
                
                if (distance <= attackRange) {
                    // Attack immediately
                    combatEngine.resolveAttack(this.player, entity);
                } else {
                    // Move toward target
                    movementEngine.moveToward(this.player, entity, this.mapInstance);
                }
            }
        });
        
        // Auto-battle toggle
        eventBus.on(GameEvents.AUTO_BATTLE_START, () => {
            this.autoBattleActive = true;
        });
        
        eventBus.on(GameEvents.AUTO_BATTLE_STOP, () => {
            this.autoBattleActive = false;
        });
    }
    
    /**
     * Combat tick - process all combat interactions
     */
    _combatTick() {
        if (!this.isRunning || !this.mapInstance || !this.player) return;
        
        this.tickCount++;
        
        // Process respawns
        this.mapInstance.processRespawns();
        
        // Process status effects for player
        combatEngine.processStatusEffects(this.player);
        
        // Process status effects and AI for all NPCs
        for (const npc of this.mapInstance.npcs.values()) {
            if (!npc.isAlive) {
                // Queue respawn if dead
                if (!npc.respawnQueued) {
                    this.mapInstance.queueRespawn(npc);
                    npc.respawnQueued = true;
                    this.mapInstance.despawnNPC(npc.id);
                }
                continue;
            }
            
            // Process NPC status effects
            combatEngine.processStatusEffects(npc);
            
            // Skip if stunned
            if (npc.isStunned()) continue;
            
            // Process NPC AI - always seek the player
            this._processNPCAI(npc);
        }
        
        // Player always attacks enemies in range (regardless of auto-battle toggle)
        this._processPlayerCombat();
        
        // Process auto-cast skills (NEW v1.4.0)
        this._processAutoSkills();
        
        // Process auto-potions (NEW) - check if player needs to use potions
        this._processAutoPotions();
        
        // Process auto-battle for player (seeking enemies)
        if (this.autoBattleActive && this.player.autoBattleEnabled) {
            this._processAutoBattle();
        }
        
        // Process auto-loot for items (when enabled)
        if (this.player.autoLootEnabled) {
            this._processAutoLoot();
        } else {
            // Always auto-collect gold even when auto-loot is disabled
            this._processAutoGoldPickup();
        }
        
        // Emit tick event
        eventBus.emit(GameEvents.GAME_TICK, {
            tick: this.tickCount,
            timestamp: Date.now()
        });
    }
    
    /**
     * Process auto-potion usage (NEW)
     * Automatically use potions when health/mana drops below threshold
     */
    _processAutoPotions() {
        if (!this.player.isAlive) return;
        
        const settings = this.player.potionSettings;
        if (!settings) return;
        
        // Auto health potion
        if (settings.autoHealthEnabled) {
            const healthPercent = this.player.healthPercent;
            
            if (healthPercent < settings.autoHealthThreshold && this.player.canUseHealthPotion()) {
                this.player.useHealthPotion();
            }
        }
        
        // Auto mana potion
        if (settings.autoManaEnabled) {
            const manaPercent = this.player.manaPercent;
            
            if (manaPercent < settings.autoManaThreshold && this.player.canUseManaPotion()) {
                this.player.useManaPotion();
            }
        }
    }
    
    /**
     * Player always attacks enemies in range
     */
    _processPlayerCombat() {
        if (!this.player.isAlive || this.player.isStunned?.()) return;
        
        const attackRange = this.player.attackRange || GameConfig.combat.meleeRange;
        
        // If player has a target in range, attack it
        if (this.player.currentTarget && this.player.currentTarget.isAlive) {
            const distance = hexDistance(
                this.player.position.q, this.player.position.r,
                this.player.currentTarget.position.q, this.player.currentTarget.position.r
            );
            
            if (distance <= attackRange) {
                combatEngine.resolveAttack(this.player, this.player.currentTarget);
                return;
            }
        }
        
        // Otherwise find nearest enemy in range
        for (const npc of this.mapInstance.npcs.values()) {
            if (!npc.isAlive) continue;
            
            const distance = hexDistance(
                this.player.position.q, this.player.position.r,
                npc.position.q, npc.position.r
            );
            
            if (distance <= attackRange) {
                this.player.currentTarget = npc;
                combatEngine.resolveAttack(this.player, npc);
                break;
            }
        }
    }
    
    /**
     * Process auto-cast skills for player (NEW v1.4.0)
     * Automatically uses skills that have autoCast enabled when conditions are met
     */
    _processAutoSkills() {
        if (!this.player.isAlive || this.player.isStunned?.()) return;
        
        // Check if any skills have auto-cast enabled
        const activeSkills = this.player.activeSkills;
        if (!activeSkills || !activeSkills.some(s => s?.autoCast)) return;
        
        // Use SkillEngine to find the next auto-cast skill
        const autoCast = SkillEngine.getNextAutoCastSkill(this.player, this.mapInstance);
        
        if (autoCast && autoCast.skill && autoCast.target) {
            // Execute the auto-cast skill
            const result = SkillEngine.executeSkill(
                autoCast.skill,
                this.player,
                autoCast.target,
                this.mapInstance
            );
            
            if (result.success) {
                // Emit event for UI updates and logging
                // BattleMapUI listens for this and logs to combat log
                eventBus.emit(GameEvents.SKILL_USED, {
                    source: this.player,
                    target: autoCast.target,
                    skill: autoCast.skill,
                    result: result,
                    auto: true
                });
            }
        }
    }
    
    /**
     * Process NPC AI - target player and attack/move
     */
    _processNPCAI(npc) {
        // NPCs always target and chase the player
        const target = this.player;
        
        if (!target || !target.isAlive) return;

        // Hold AI for 800ms after spawn so the poof animation completes before first move
        // (matches EntityAnimationConfig.SPAWN_DURATION = 750ms + small buffer)
        if (npc.spawnTime && (Date.now() - npc.spawnTime) < 800) {
            return;
        }
        
        const distance = hexDistance(
            npc.position.q, npc.position.r,
            target.position.q, target.position.r
        );
        
        const attackRange = npc.attackRange || GameConfig.combat.meleeRange;
        
        // Attack if in range
        if (distance <= attackRange) {
            combatEngine.resolveAttack(npc, target);
            return;
        }
        
        // Move toward player
        this._moveNPCTowardTarget(npc, target);
    }
    
    /**
     * Move NPC toward a target using pathfinding
     */
    _moveNPCTowardTarget(npc, target) {
        const targetQ = target.position.q;
        const targetR = target.position.r;
        
        // Initialize stuck detection data if needed
        if (!npc._stuckData) {
            npc._stuckData = {
                lastMoveTime: Date.now(),
                stuckTicks: 0
            };
        }
        
        // Check if NPC is stuck
        const now = Date.now();
        if (now - npc._stuckData.lastMoveTime > 3000) {
            npc._stuckData.stuckTicks++;
        }
        
        // Find path, excluding own position from blocked check
        const npcQ = npc.position.q;
        const npcR = npc.position.r;
        
        let path = findPath(
            npcQ, npcR,
            targetQ, targetR,
            this.mapInstance.gridWidth, this.mapInstance.gridHeight,
            (q, r) => {
                if (q === npcQ && r === npcR) return false;
                // Don't treat the target hex as blocked (we want to get adjacent to player)
                if (q === targetQ && r === targetR) return false;
                return this.mapInstance.isHexBlocked(q, r);
            }
        );
        
        // If no direct path or stuck for too long, try alternative approaches
        if (!path || path.length === 0 || npc._stuckData.stuckTicks > 3) {
            path = this._findAlternativePath(npc, target);
        }
        
        if (path && path.length > 0) {
            const nextStep = path[0];
            
            // Double-check the next step is valid
            if (!this.mapInstance.isHexBlocked(nextStep.q, nextStep.r)) {
                const success = this.mapInstance.moveEntity(npc, nextStep.q, nextStep.r);
                if (success) {
                    npc._stuckData.lastMoveTime = now;
                    npc._stuckData.stuckTicks = 0;
                    
                    eventBus.emit(GameEvents.ENTITY_MOVE_STEP, {
                        entity: npc,
                        position: { q: nextStep.q, r: nextStep.r },
                        remaining: path.length - 1
                    });
                }
            }
        }
    }
    
    /**
     * Find alternative path when direct path fails
     */
    _findAlternativePath(npc, target) {
        const neighbors = getHexNeighbors(target.position.q, target.position.r);
        const npcQ = npc.position.q;
        const npcR = npc.position.r;
        
        // Try to path to each neighbor of the target
        const validPaths = [];
        
        for (const neighbor of neighbors) {
            if (!isInBounds(neighbor.q, neighbor.r, this.mapInstance.gridWidth, this.mapInstance.gridHeight)) {
                continue;
            }
            if (this.mapInstance.isHexBlocked(neighbor.q, neighbor.r)) {
                continue;
            }
            
            const path = findPath(
                npcQ, npcR,
                neighbor.q, neighbor.r,
                this.mapInstance.gridWidth, this.mapInstance.gridHeight,
                (q, r) => {
                    if (q === npcQ && r === npcR) return false;
                    return this.mapInstance.isHexBlocked(q, r);
                }
            );
            
            if (path && path.length > 0) {
                validPaths.push({ path, distance: path.length });
            }
        }
        
        // Return the shortest valid path
        if (validPaths.length > 0) {
            validPaths.sort((a, b) => a.distance - b.distance);
            return validPaths[0].path;
        }
        
        // Last resort: try to move to any adjacent non-blocked hex closer to target
        const npcNeighbors = getHexNeighbors(npcQ, npcR);
        let bestNeighbor = null;
        let bestDistance = Infinity;
        
        for (const neighbor of npcNeighbors) {
            if (!isInBounds(neighbor.q, neighbor.r, this.mapInstance.gridWidth, this.mapInstance.gridHeight)) {
                continue;
            }
            if (this.mapInstance.isHexBlocked(neighbor.q, neighbor.r)) {
                continue;
            }
            
            const dist = hexDistance(neighbor.q, neighbor.r, target.position.q, target.position.r);
            if (dist < bestDistance) {
                bestDistance = dist;
                bestNeighbor = neighbor;
            }
        }
        
        if (bestNeighbor) {
            return [bestNeighbor];
        }
        
        return null;
    }
    
    /**
     * Process auto-battle for player
     */
    _processAutoBattle() {
        if (!this.player.isAlive) return;
        
        // Find nearest enemy
        const nearest = this.mapInstance.getNearestEnemy(this.player);
        
        if (!nearest) {
            return;
        }
        
        const { entity: target, distance } = nearest;
        const attackRange = this.player.attackRange || GameConfig.combat.meleeRange;
        
        // Set as current target
        this.player.currentTarget = target;
        
        // If not in range, move toward enemy
        if (distance > attackRange) {
            if (!movementEngine.isMoving(this.player.id)) {
                movementEngine.moveToward(this.player, target, this.mapInstance);
            }
        }
    }
    
    /**
     * Process auto-loot for player (gold and items)
     */
    _processAutoLoot() {
        if (!this.player.isAlive) return;
        
        // Check for nearby loot
        for (const loot of this.mapInstance.lootDrops.values()) {
            const distance = hexDistance(
                this.player.position.q, this.player.position.r,
                loot.position.q, loot.position.r
            );
            
            if (distance <= 1) {
                this.mapInstance.pickupLoot(loot.id, this.player);
                break;  // One loot pickup per tick
            }
        }
    }
    
    /**
     * Process auto gold pickup (always active, regardless of auto-loot toggle)
     * Only picks up gold, leaves items on ground
     */
    _processAutoGoldPickup() {
        if (!this.player.isAlive) return;
        
        // Check for nearby loot with gold
        for (const loot of this.mapInstance.lootDrops.values()) {
            if (loot.gold <= 0) continue;  // Skip if no gold
            
            const distance = hexDistance(
                this.player.position.q, this.player.position.r,
                loot.position.q, loot.position.r
            );
            
            if (distance <= 1) {
                // Pick up gold only (third param = true for goldOnly)
                this.mapInstance.pickupLoot(loot.id, this.player, true);
                break;  // One gold pickup per tick
            }
        }
    }
    
    /**
     * Regen tick - health and mana regeneration
     */
    _regenTick() {
        if (!this.isRunning || !this.player) return;
        
        // Skip if dead
        if (!this.player.isAlive) return;
        
        // Determine regen rates based on location
        const inTown = this.mapInstance?.mapData?.isTown;
        const healthRegenPercent = inTown 
            ? GameConfig.regen.townHealthPercent 
            : GameConfig.regen.battleHealthPercent;
        const manaRegenPercent = inTown 
            ? GameConfig.regen.townManaPercent 
            : GameConfig.regen.battleManaPercent;
        
        // Apply class modifiers
        const classData = this.player.classData;
        const healthMod = classData?.regenModifier?.health || 1;
        const manaMod = classData?.regenModifier?.mana || 1;
        
        // Housing hpRegen buff (Hearth) — percentage boost to base health regen
        const housingHPRegenBuff = this.player._housingBuffs?.hpRegen || 0;
        const housingRegenMult = 1 + (housingHPRegenBuff / 100);
        
        // Regen health (silent - no combat log message)
        if (this.player.currentHealth < this.player.maxHealth) {
            let healthRegen = Math.max(1, Math.floor(this.player.maxHealth * healthRegenPercent * healthMod));
            healthRegen = Math.floor(healthRegen * housingRegenMult);  // Apply housing buff
            // Add passive skill flat regen bonus
            healthRegen += this.player._passiveBonuses?.healthRegen || 0;
            this.player.heal(healthRegen, 'regen', true);  // Silent heal
        }
        
        // Regen mana (silent - no combat log message)
        if (this.player.currentMana < this.player.maxMana) {
            const manaRegen = Math.max(1, Math.floor(this.player.maxMana * manaRegenPercent * manaMod));
            this.player.restoreMana(manaRegen, 'regen', true);  // Silent mana restore
        }
    }
    
    /**
     * Get current game state
     */
    getState() {
        return {
            isRunning: this.isRunning,
            tickCount: this.tickCount,
            autoBattleActive: this.autoBattleActive,
            playerAlive: this.player?.isAlive,
            npcCount: this.mapInstance?.npcs.size || 0,
            lootCount: this.mapInstance?.lootDrops.size || 0
        };
    }
}

// Singleton instance
export const gameLoop = new GameLoop();

export default gameLoop;
