/**
 * @file MapInstance.js
 * @description Battle map state management - handles entities, combat, movement, and loot
 * 
 * @location systems/MapInstance.js
 * @version 1.8.0
 * @changelog
 *   - v1.8.0 (2026-03-07): Stamp npc.spawnTime = Date.now() in spawnNPC() so GameLoop
 *                          can hold NPC AI during the spawn poof animation window.
 *   - v1.7.0 (2026-02-10): Boss NPC respawn support. queueRespawn() reads NPC.isBoss and
 *                          NPC.respawnDelay (set in NPC.js v1.1.0) to use per-boss respawn
 *                          timers (typically 180-300s) instead of map default for boss NPCs.
 *                          Boss metadata preserved through respawn cycle via NPC.getSpawnData().
 *   - v1.6.0 (2026-02-10): Housing goldFind buff integration. pickupLoot() now applies
 *                          character.goldFindMultiplier (from Hearth housing buff) to gold
 *                          pickups. Gold displayed in loot events reflects boosted amount.
 *   - v1.5.0 (2026-02-09): Mobile hex map support — excluded hexes blocked in isHexBlocked(),
 *                          pre-populated in occupancy via _initializeObstacles(), and reported
 *                          via isExcluded in getHexInfo(). Import isExcludedHex from mapConfig.
 *                          See MOBILE_HEX_MAP_IMPLEMENTATION.md.
 *   - v1.4.0 (2026-01-26): Added housing material support in loot handling.
 *                          addLoot() now accepts material property.
 *                          pickupLoot() now calls character.addMaterial() for materials.
 *                          _handleLootDrop() includes material in loot check.
 *   - v1.3.0 (2025-01-03): Added potion drops support in loot handling
 *   - v1.2.0 (2025-01-02): Added goldOnly parameter to pickupLoot for auto gold collection
 *   - v1.1.1 (2025-01-02): Removed duplicate UI_ACTION_LOG emissions (ActionLogUI handles via events)
 *   - v1.1.0 (2025-01): Integrated LootGenerator for NPC death loot drops
 *   - v1.0.0 (2025-01): Initial implementation
 */

import { GameConfig } from '../config/gameConfig.js';
import { getMap, isObstacle, getExit, getSpecialHex, isExcludedHex } from '../config/mapConfig.js';
import { NPC, createNPCFromConfig } from '../models/NPC.js';
import { eventBus, GameEvents } from './EventBus.js';
import { hexDistance, isInBounds, getHexNeighbors } from '../utils/hexMath.js';
import { LootGenerator } from './LootGenerator.js';
import { HousingMaterials } from '../config/housingConfig.js';

let instanceIdCounter = 0;
let lootIdCounter = 0;

export class MapInstance {
    constructor(mapId) {
        this.id = `instance_${++instanceIdCounter}`;
        this.mapId = mapId;
        this.mapData = getMap(mapId);
        
        if (!this.mapData) {
            throw new Error(`Map not found: ${mapId}`);
        }
        
        // Grid dimensions
        this.gridWidth = this.mapData.gridWidth || GameConfig.ui.defaultGridWidth;
        this.gridHeight = this.mapData.gridHeight || GameConfig.ui.defaultGridHeight;
        
        // Entities
        this.players = new Map();      // Character ID -> Character
        this.npcs = new Map();         // NPC ID -> NPC
        this.lootDrops = new Map();    // "q,r" -> { id, position, items, potions, gold, material, timestamp }
        
        // Hex occupancy tracking
        this.occupancy = new Map();    // "q,r" -> entity
        
        // Initialize obstacles
        this._initializeObstacles();
        
        // Timing
        this.createdAt = Date.now();
        this.lastPlayerActivity = Date.now();
        this.ambientEventTimer = null;
        
        // Respawn tracking
        this.respawnQueue = [];        // { spawnData, respawnAt }
        
        // Instance state
        this.isActive = true;
        
        // Setup loot drop event listener
        this._setupLootEventListeners();
    }
    
    // === Event Listeners ===
    
    _setupLootEventListeners() {
        // Listen for NPC deaths to generate loot
        eventBus.on(GameEvents.LOOT_DROP, (data) => this._handleLootDrop(data));
    }
    
    /**
     * Handle loot drop from NPC death
     * @param {object} data - { source: NPC, position: {q, r}, killer: Entity }
     */
    _handleLootDrop(data) {
        // Only handle loot for NPCs on this map instance
        if (!data.source || data.source.mapInstanceId !== this.id) return;
        
        // Generate loot using LootGenerator
        // v1.6.0: Pass killer for housing buff application (goldFind, materialDrops)
        const lootData = LootGenerator.generateLoot(data.source, data.killer || null);
        
        // Always add loot if there's gold, items, potions, or materials (gold always drops)
        // v1.4.0: Added material check
        if (lootData.gold > 0 || lootData.items.length > 0 || 
            (lootData.potions && lootData.potions.length > 0) ||
            lootData.material) {
            this.addLoot(data.position, lootData);
        }
    }
    
    // === Initialization ===
    
    _initializeObstacles() {
        // Mark excluded (void) hexes as occupied — impassable
        if (this.mapData.excludedHexes) {
            for (const hex of this.mapData.excludedHexes) {
                this.occupancy.set(`${hex.q},${hex.r}`, { type: 'excluded' });
            }
        }
        
        if (this.mapData.obstacles) {
            for (const obs of this.mapData.obstacles) {
                this.occupancy.set(`${obs.q},${obs.r}`, { type: 'obstacle' });
            }
        }
    }
    
    // Spawn initial NPCs based on map configuration
    spawnInitialNPCs() {
        if (!this.mapData.npcs) return;
        
        for (const npcConfig of this.mapData.npcs) {
            const count = npcConfig.count || 1;
            for (let i = 0; i < count; i++) {
                this.spawnNPC(npcConfig);
            }
        }
    }
    
    // === Player Management ===
    
    addPlayer(character) {
        if (this.players.size >= (this.mapData.maxPlayers || GameConfig.mapInstance.maxPlayersDefault)) {
            return false;
        }
        
        // Find entry position
        const entryPos = this._findEntryPosition(character.position);
        if (!entryPos) {
            console.error('No valid entry position found');
            return false;
        }
        
        character.setPosition(entryPos.q, entryPos.r);
        this.players.set(character.id, character);
        this.occupancy.set(`${entryPos.q},${entryPos.r}`, { type: 'player', entity: character });
        this.lastPlayerActivity = Date.now();
        
        eventBus.emit(GameEvents.MAP_ENTER, {
            mapInstance: this,
            character
        });
        
        // Log entry text
        if (this.mapData.entryText) {
            eventBus.emit(GameEvents.UI_ACTION_LOG, {
                type: 'environment',
                message: this.mapData.entryText
            });
        }
        
        return true;
    }
    
    removePlayer(characterId) {
        const character = this.players.get(characterId);
        if (!character) return false;
        
        // Clear occupancy
        this.occupancy.delete(`${character.position.q},${character.position.r}`);
        this.players.delete(characterId);
        
        // Clear any NPC aggro on this player
        for (const npc of this.npcs.values()) {
            npc.clearAggro(characterId);
        }
        
        eventBus.emit(GameEvents.MAP_EXIT, {
            mapInstance: this,
            character
        });
        
        return true;
    }
    
    _findEntryPosition(preferredPos) {
        // Try preferred position first
        if (preferredPos && !this.isHexBlocked(preferredPos.q, preferredPos.r)) {
            return preferredPos;
        }
        
        // Find first available exit/entry hex
        if (this.mapData.exits) {
            for (const exit of this.mapData.exits) {
                if (!this.isHexBlocked(exit.q, exit.r)) {
                    return { q: exit.q, r: exit.r };
                }
                // Check neighbors of exit
                const neighbors = getHexNeighbors(exit.q, exit.r);
                for (const n of neighbors) {
                    if (isInBounds(n.q, n.r, this.gridWidth, this.gridHeight) && 
                        !this.isHexBlocked(n.q, n.r)) {
                        return n;
                    }
                }
            }
        }
        
        // Fallback: find any open hex
        for (let q = 0; q < this.gridWidth; q++) {
            for (let r = 0; r < this.gridHeight; r++) {
                if (!this.isHexBlocked(q, r)) {
                    return { q, r };
                }
            }
        }
        
        return null;
    }
    
    // === NPC Management ===
    
    spawnNPC(npcConfig) {
        // Check max NPCs
        if (this.npcs.size >= (this.mapData.maxNPCs || 10)) {
            return null;
        }
        
        // Find spawn position
        const pos = this._findSpawnPosition();
        if (!pos) return null;
        
        const npc = createNPCFromConfig(npcConfig, pos);
        npc.mapInstanceId = this.id;
        npc.spawnTime = Date.now(); // Used by GameLoop to hold AI during spawn poof animation
        
        this.npcs.set(npc.id, npc);
        this.occupancy.set(`${pos.q},${pos.r}`, { type: 'npc', entity: npc });
        
        eventBus.emit(GameEvents.MAP_SPAWN_NPC, {
            mapInstance: this,
            npc
        });
        
        return npc;
    }
    
    despawnNPC(npcId) {
        const npc = this.npcs.get(npcId);
        if (!npc) return false;
        
        this.occupancy.delete(`${npc.position.q},${npc.position.r}`);
        this.npcs.delete(npcId);
        
        eventBus.emit(GameEvents.MAP_DESPAWN_NPC, {
            mapInstance: this,
            npc
        });
        
        return true;
    }
    
    queueRespawn(npc) {
        // v1.7.0: Boss NPCs use their own longer respawnDelay (from NPC.isBoss/respawnDelay)
        const respawnDelay = (npc.isBoss && npc.respawnDelay)
            ? npc.respawnDelay
            : (this.mapData.respawnDelay || GameConfig.mapInstance.npcRespawnDelay);
        
        this.respawnQueue.push({
            spawnData: npc.getSpawnData(),
            respawnAt: Date.now() + respawnDelay
        });
    }
    
    processRespawns() {
        const now = Date.now();
        const toRespawn = [];
        
        this.respawnQueue = this.respawnQueue.filter(item => {
            if (now >= item.respawnAt) {
                toRespawn.push(item.spawnData);
                return false;
            }
            return true;
        });
        
        for (const spawnData of toRespawn) {
            this.spawnNPC(spawnData);
        }
    }
    
    _findSpawnPosition() {
        // Try to spawn away from players
        const maxAttempts = 50;
        
        for (let i = 0; i < maxAttempts; i++) {
            const q = Math.floor(Math.random() * this.gridWidth);
            const r = Math.floor(Math.random() * this.gridHeight);
            
            if (!this.isHexBlocked(q, r)) {
                // Check distance from players
                let tooClose = false;
                for (const player of this.players.values()) {
                    if (hexDistance(q, r, player.position.q, player.position.r) < 2) {
                        tooClose = true;
                        break;
                    }
                }
                if (!tooClose) {
                    return { q, r };
                }
            }
        }
        
        return null;
    }
    
    // === Loot Management ===
    
    /**
     * Add loot to the ground at a position
     * @param {object} position - { q, r }
     * @param {object} lootData - { gold, items[], potions[], material? }
     * @returns {object} The created loot object
     */
    addLoot(position, lootData) {
        const key = `${position.q},${position.r}`;
        const lootId = `loot_${Date.now()}_${++lootIdCounter}`;
        
        const loot = {
            id: lootId,
            position: { ...position },
            gold: lootData.gold || 0,
            items: lootData.items || [],
            potions: lootData.potions || [],
            material: lootData.material || null,  // NEW v1.4.0: Housing material
            droppedAt: Date.now()
        };
        
        this.lootDrops.set(key, loot);
        
        // Emit event for UI to render loot bag
        eventBus.emit(GameEvents.LOOT_SPAWNED, {
            loot,
            mapInstanceId: this.id
        });
        
        // Log the drop to action log
        const parts = [];
        if (loot.gold > 0) parts.push(`${loot.gold} gold`);
        loot.items.forEach(item => parts.push(item.name || item.displayName || 'item'));
        loot.potions.forEach(potion => parts.push(potion.name || 'potion'));
        
        // NEW v1.4.0: Log material drops
        if (loot.material) {
            const matDef = HousingMaterials[loot.material.materialId];
            const matName = matDef ? matDef.name : loot.material.materialId;
            const matIcon = matDef ? matDef.icon : '📦';
            parts.push(`${matIcon} ${loot.material.quantity}x ${matName}`);
        }
        
        if (parts.length > 0) {
            eventBus.emit(GameEvents.UI_ACTION_LOG, {
                type: 'loot',
                message: `Loot dropped: ${parts.join(', ')}`
            });
        }
        
        return loot;
    }
    
    /**
     * Legacy method for backward compatibility
     */
    addLootDrop(position, items, gold = 0) {
        return this.addLoot(position, { gold, items: items || [], potions: [] });
    }
    
    /**
     * Get loot at a specific position
     */
    getLootAt(q, r) {
        return this.lootDrops.get(`${q},${r}`) || null;
    }
    
    /**
     * Check if there's loot at position
     */
    hasLootAt(q, r) {
        return this.lootDrops.has(`${q},${r}`);
    }
    
    /**
     * Character picks up loot at position
     * @param {string|Character} characterOrLootId - Character object or loot ID for legacy support
     * @param {Character|number} characterOrQ - Character object or Q coordinate
     * @param {number} r - R coordinate (if using legacy signature)
     * @param {boolean} goldOnly - If true, only pick up gold (leave items on ground)
     */
    pickupLoot(characterOrLootId, characterOrQ, r, goldOnly = false) {
        let character, q, loot, key;
        
        // Handle both legacy (lootId, character) and new (character, q, r) signatures
        if (typeof characterOrLootId === 'string' && characterOrLootId.startsWith('loot_')) {
            // Legacy: pickupLoot(lootId, character, goldOnly)
            const lootId = characterOrLootId;
            character = characterOrQ;
            // r parameter is actually goldOnly in legacy signature
            goldOnly = r === true;
            loot = null;
            
            // Find loot by ID
            for (const [k, l] of this.lootDrops.entries()) {
                if (l.id === lootId) {
                    loot = l;
                    key = k;
                    break;
                }
            }
        } else {
            // New: pickupLoot(character, q, r, goldOnly)
            character = characterOrLootId;
            q = characterOrQ;
            key = `${q},${r}`;
            loot = this.lootDrops.get(key);
        }
        
        if (!loot) return null;
        
        // Check if character is close enough (for legacy calls that pass lootId)
        if (loot.position) {
            const dist = hexDistance(
                character.position.q, character.position.r,
                loot.position.q, loot.position.r
            );
            if (dist > 1) {
                return null; // Too far away
            }
        }
        
        const pickedUp = { gold: 0, items: [], potions: [], material: null };
        
        // Pick up gold (always succeeds)
        // Housing: Hearth goldFind buff boosts gold drops
        if (loot.gold > 0) {
            const goldMultiplier = character.goldFindMultiplier || 1;
            const boostedGold = Math.floor(loot.gold * goldMultiplier);
            character.gold += boostedGold;
            pickedUp.gold = boostedGold;
            
            eventBus.emit(GameEvents.LOOT_GOLD, {
                character,
                amount: boostedGold
            });
        }
        
        // NEW v1.4.0: Pick up housing material (always succeeds - separate inventory)
        if (loot.material && !goldOnly) {
            const { materialId, quantity } = loot.material;
            
            // Use Character's addMaterial method
            if (character.addMaterial) {
                character.addMaterial(materialId, quantity);
            } else {
                // Fallback if method doesn't exist
                if (!character.materials) character.materials = {};
                character.materials[materialId] = (character.materials[materialId] || 0) + quantity;
            }
            
            pickedUp.material = { ...loot.material };
            
            // Log material pickup with icon
            const matDef = HousingMaterials[materialId];
            const matName = matDef ? matDef.name : materialId;
            const matIcon = matDef ? matDef.icon : '📦';
            
            eventBus.emit(GameEvents.UI_ACTION_LOG, {
                type: 'loot',
                message: `${matIcon} Picked up ${quantity}x ${matName}`
            });
        }
        
        // Pick up items and potions (may fail if inventory full) - skip if goldOnly
        if (!goldOnly) {
            // Pick up regular items
            for (const item of loot.items) {
                if (character.addToInventory(item)) {
                    pickedUp.items.push(item);
                }
            }
            
            // Pick up potions
            if (loot.potions) {
                for (const potion of loot.potions) {
                    if (character.addToInventory(potion)) {
                        pickedUp.potions.push(potion);
                    }
                }
            }
        }
        
        // Check if any items/potions remain (inventory was full OR goldOnly mode)
        const remainingItems = goldOnly ? loot.items : loot.items.filter(i => !pickedUp.items.includes(i));
        const remainingPotions = goldOnly 
            ? (loot.potions || []) 
            : (loot.potions || []).filter(p => !pickedUp.potions.includes(p));
        // Material is always picked up (separate storage), so no "remaining" material
        
        const fullyPickedUp = remainingItems.length === 0 && remainingPotions.length === 0;
        
        if (!fullyPickedUp) {
            // Update loot pile with remaining items (gold and material already picked up)
            this.lootDrops.set(key, {
                ...loot,
                gold: 0,
                items: remainingItems,
                potions: remainingPotions,
                material: null  // Material always picked up
            });
            
            eventBus.emit(GameEvents.UI_ACTION_LOG, {
                type: 'warning',
                message: 'Inventory full! Some items left on ground.'
            });
        } else {
            // Remove loot from ground completely
            this.lootDrops.delete(key);
        }
        
        // Emit pickup event for UI to remove loot bag (only if fully picked up)
        // ActionLogUI handles the colorized log message via LOOT_PICKUP listener
        eventBus.emit(GameEvents.LOOT_PICKUP, {
            character,
            loot: pickedUp,
            position: loot.position,
            fullyPickedUp,
            lootId: loot.id
        });
        
        return pickedUp;
    }
    
    /**
     * Get all loot on the map (for rendering)
     */
    getAllLoot() {
        return Array.from(this.lootDrops.values());
    }
    
    // === Hex State Queries ===
    
    isHexBlocked(q, r) {
        // Out of bounds
        if (!isInBounds(q, r, this.gridWidth, this.gridHeight)) {
            return true;
        }
        
        // Excluded (void) hexes are impassable
        if (isExcludedHex(this.mapId, q, r)) {
            return true;
        }
        
        // Check occupancy
        const key = `${q},${r}`;
        if (this.occupancy.has(key)) {
            return true;
        }
        
        // Check map obstacles
        if (isObstacle(this.mapId, q, r)) {
            return true;
        }
        
        return false;
    }
    
    getEntityAt(q, r) {
        const key = `${q},${r}`;
        const occupant = this.occupancy.get(key);
        
        if (occupant && occupant.entity) {
            return occupant.entity;
        }
        
        // Check loot
        const loot = this.lootDrops.get(key);
        if (loot) {
            return { type: 'loot', ...loot };
        }
        
        return null;
    }
    
    getHexInfo(q, r) {
        const info = {
            q, r,
            isBlocked: this.isHexBlocked(q, r),
            isObstacle: isObstacle(this.mapId, q, r),
            isExcluded: isExcludedHex(this.mapId, q, r),
            exit: getExit(this.mapId, q, r),
            special: getSpecialHex(this.mapId, q, r),
            entity: this.getEntityAt(q, r)
        };
        
        return info;
    }
    
    // === Entity Movement ===
    
    moveEntity(entity, toQ, toR) {
        if (this.isHexBlocked(toQ, toR)) {
            return false;
        }
        
        const fromKey = `${entity.position.q},${entity.position.r}`;
        const toKey = `${toQ},${toR}`;
        
        // Update occupancy
        this.occupancy.delete(fromKey);
        
        const entityType = entity.constructor.name === 'NPC' ? 'npc' : 'player';
        this.occupancy.set(toKey, { type: entityType, entity });
        
        // Update entity position
        entity.setPosition(toQ, toR);
        
        // Track player activity
        if (entityType === 'player') {
            this.lastPlayerActivity = Date.now();
        }
        
        // Check for special hex effects
        const special = getSpecialHex(this.mapId, toQ, toR);
        if (special) {
            this._applyHexEffect(entity, special);
        }
        
        // Check for exit
        const exit = getExit(this.mapId, toQ, toR);
        if (exit && entityType === 'player') {
            eventBus.emit(GameEvents.UI_ACTION_LOG, {
                type: 'environment',
                message: `Exit available: ${exit.label}`
            });
        }
        
        return true;
    }
    
    _applyHexEffect(entity, hexData) {
        if (hexData.effect === 'slow') {
            entity.addStatusEffect({
                id: 'hex_slow',
                type: 'slow',
                modifier: hexData.modifier || 0.5,
                duration: 1
            });
        }
        // Add more hex effects as needed
    }
    
    // === Combat Queries ===
    
    getEntitiesInRange(centerQ, centerR, range, excludeId = null) {
        const entities = [];
        
        for (const player of this.players.values()) {
            if (player.id === excludeId) continue;
            const dist = hexDistance(centerQ, centerR, player.position.q, player.position.r);
            if (dist <= range) {
                entities.push({ entity: player, distance: dist, type: 'player' });
            }
        }
        
        for (const npc of this.npcs.values()) {
            if (npc.id === excludeId || !npc.isAlive) continue;
            const dist = hexDistance(centerQ, centerR, npc.position.q, npc.position.r);
            if (dist <= range) {
                entities.push({ entity: npc, distance: dist, type: 'npc' });
            }
        }
        
        return entities.sort((a, b) => a.distance - b.distance);
    }
    
    getNearestEnemy(entity) {
        const isPlayer = this.players.has(entity.id);
        const enemies = isPlayer ? this.npcs : this.players;
        
        let nearest = null;
        let nearestDist = Infinity;
        
        for (const enemy of enemies.values()) {
            if (!enemy.isAlive) continue;
            
            const dist = hexDistance(
                entity.position.q, entity.position.r,
                enemy.position.q, enemy.position.r
            );
            
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = enemy;
            }
        }
        
        return nearest ? { entity: nearest, distance: nearestDist } : null;
    }
    
    // === Ambient Events ===
    
    startAmbientEvents() {
        if (!this.mapData.ambientEvents || this.mapData.ambientEvents.length === 0) {
            return;
        }
        
        const scheduleNext = () => {
            if (!this.isActive) return;
            
            const delay = GameConfig.ui.ambientEventMinDelay + 
                Math.random() * (GameConfig.ui.ambientEventMaxDelay - GameConfig.ui.ambientEventMinDelay);
            
            this.ambientEventTimer = setTimeout(() => {
                this.triggerAmbientEvent();
                scheduleNext();
            }, delay);
        };
        
        scheduleNext();
    }
    
    triggerAmbientEvent() {
        if (!this.mapData.ambientEvents || this.mapData.ambientEvents.length === 0) {
            return;
        }
        
        const message = this.mapData.ambientEvents[
            Math.floor(Math.random() * this.mapData.ambientEvents.length)
        ];
        
        // ActionLogUI handles the log message via AMBIENT_EVENT listener
        eventBus.emit(GameEvents.AMBIENT_EVENT, {
            mapInstance: this,
            message
        });
    }
    
    stopAmbientEvents() {
        if (this.ambientEventTimer) {
            clearTimeout(this.ambientEventTimer);
            this.ambientEventTimer = null;
        }
    }
    
    // === Instance Lifecycle ===
    
    shouldDespawn() {
        if (this.players.size > 0) return false;
        
        const inactiveTime = Date.now() - this.lastPlayerActivity;
        return inactiveTime > GameConfig.mapInstance.despawnDelay;
    }
    
    destroy() {
        this.isActive = false;
        this.stopAmbientEvents();
        this.players.clear();
        this.npcs.clear();
        this.lootDrops.clear();
        this.occupancy.clear();
        this.respawnQueue = [];
    }
    
    // === Debug ===
    
    getDebugInfo() {
        return {
            id: this.id,
            mapId: this.mapId,
            gridSize: `${this.gridWidth}x${this.gridHeight}`,
            players: this.players.size,
            npcs: this.npcs.size,
            loot: this.lootDrops.size,
            respawnQueue: this.respawnQueue.length,
            age: Date.now() - this.createdAt
        };
    }
}

export default MapInstance;
