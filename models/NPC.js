/**
 * @file NPC.js
 * @description Non-player character entity model with stats, combat, aggro, and AI behavior.
 * 
 * @location models/NPC.js
 * @usage Created by MapInstance.spawnNPC() via createNPCFromConfig factory.
 * @dependencies gameConfig.js, npcConfig.js, EventBus.js
 * 
 * @version 1.1.0
 * @changelog
 *   - v1.1.0 (2026-02-10): Added boss spawn metadata (isBoss, respawnDelay) to constructor,
 *                          getSpawnData(), and createNPCFromConfig(). Boss NPCs carry their own
 *                          respawnDelay which MapInstance.queueRespawn() uses instead of map default.
 *   - v1.0.0: Initial implementation
 */
// NPC Model - Non-player character entity
import { GameConfig } from '../config/gameConfig.js';
import { getCreature, getSubtype, getBehavior, calculateNPCStats, getNPCDisplayName } from '../config/npcConfig.js';
import { eventBus, GameEvents } from '../systems/EventBus.js';

let npcIdCounter = 0;

export class NPC {
    constructor(data = {}) {
        // Identity
        this.id = data.id || `npc_${++npcIdCounter}`;
        this.creatureId = data.creatureId || 'rat';
        this.subtypeId = data.subtypeId || 'normal';
        this.level = data.level || 1;
        
        // Cache creature and subtype data
        this._creatureData = getCreature(this.creatureId);
        this._subtypeData = getSubtype(this.subtypeId);
        
        // Calculate stats based on level and subtype
        const scaledStats = calculateNPCStats(this.creatureId, this.level, this.subtypeId);
        
        // Stats
        this.stats = {
            strength: scaledStats?.strength || 5,
            dexterity: scaledStats?.dexterity || 5,
            intelligence: scaledStats?.intelligence || 5,
            stamina: scaledStats?.stamina || 5
        };
        
        this.maxHealth = scaledStats?.maxHealth || 50;
        this.maxMana = scaledStats?.maxMana || 0;
        this.currentHealth = data.currentHealth ?? this.maxHealth;
        this.currentMana = data.currentMana ?? this.maxMana;
        
        this.xpValue = scaledStats?.xpValue || 10;
        
        // Position
        this.position = data.position || { q: 0, r: 0 };
        this.mapInstanceId = data.mapInstanceId || null;
        
        // Combat properties
        this.alignment = this._creatureData?.alignment || 'neutral';
        this.attackType = this._creatureData?.attackType || 'melee';
        this.aggroRange = this._creatureData?.aggroRange || 3;
        this.abilities = this._creatureData?.abilities || [];
        
        // Behavior
        this.behaviorId = data.behaviorId || 'aggressive';
        this._behaviorData = getBehavior(this.behaviorId);
        
        // Combat state
        this.inCombat = false;
        this.currentTarget = null;
        this.aggroTable = new Map();  // Character ID -> aggro value
        this.statusEffects = [];
        
        // Movement state
        this.isMoving = false;
        this.movementPath = [];
        this.homePosition = data.homePosition || { ...this.position };
        
        // Loot
        this.lootTable = this._creatureData?.lootTable || 'common';
        this.lootMultiplier = this._subtypeData?.lootMultiplier || 1.0;
        
        // Spawn tracking
        this.spawnTime = Date.now();
        this.isDead = false;
        
        // Boss spawn metadata (v1.1.0)
        this.isBoss = data.isBoss || false;
        this.respawnDelay = data.respawnDelay || null;  // null = use map default
    }
    
    // === Computed Properties ===
    
    get creatureData() {
        return this._creatureData || getCreature(this.creatureId);
    }
    
    get subtypeData() {
        return this._subtypeData || getSubtype(this.subtypeId);
    }
    
    get behaviorData() {
        return this._behaviorData || getBehavior(this.behaviorId);
    }
    
    get name() {
        return getNPCDisplayName(this.creatureId, this.subtypeId, this.level);
    }
    
    get displayName() {
        return this.name;
    }
    
    get sprite() {
        return this.creatureData?.sprite || '❓';
    }
    
    get attackPower() {
        // NPCs use strength or intelligence for attack based on type
        if (this.attackType === 'magic') {
            return Math.floor(this.stats.intelligence * 2);
        }
        return Math.floor(this.stats.strength * 1.5);
    }
    
    get defensePower() {
        return Math.floor(this.stats.strength * 0.8 + this.stats.stamina * 0.5);
    }
    
    get dodgeChance() {
        const baseDodge = this.stats.dexterity * 0.002;
        return Math.min(baseDodge, GameConfig.combat.maxDodgeChance);
    }
    
    get critChance() {
        const baseCrit = this.stats.dexterity * 0.001;
        return Math.min(baseCrit, GameConfig.combat.maxCritChance);
    }
    
    get isAlive() {
        return this.currentHealth > 0 && !this.isDead;
    }
    
    get healthPercent() {
        return this.maxHealth > 0 ? this.currentHealth / this.maxHealth : 0;
    }
    
    get manaPercent() {
        return this.maxMana > 0 ? this.currentMana / this.maxMana : 0;
    }
    
    get attackRange() {
        if (this.attackType === 'ranged' || this.attackType === 'magic') {
            return GameConfig.combat.rangedRange;
        }
        return GameConfig.combat.meleeRange;
    }
    
    // === Aggro Management ===
    
    addAggro(characterId, amount) {
        const current = this.aggroTable.get(characterId) || 0;
        this.aggroTable.set(characterId, current + amount);
        
        if (!this.inCombat) {
            this.inCombat = true;
        }
    }
    
    getAggro(characterId) {
        return this.aggroTable.get(characterId) || 0;
    }
    
    clearAggro(characterId = null) {
        if (characterId) {
            this.aggroTable.delete(characterId);
        } else {
            this.aggroTable.clear();
        }
        
        if (this.aggroTable.size === 0) {
            this.inCombat = false;
            this.currentTarget = null;
        }
    }
    
    // Get highest aggro target
    getTopAggroTarget() {
        let maxAggro = 0;
        let topTarget = null;
        
        for (const [charId, aggro] of this.aggroTable) {
            if (aggro > maxAggro) {
                maxAggro = aggro;
                topTarget = charId;
            }
        }
        
        return topTarget;
    }
    
    // === Combat ===
    
    takeDamage(amount, source = null) {
        const actualDamage = Math.max(1, amount);
        this.currentHealth = Math.max(0, this.currentHealth - actualDamage);
        
        // Add aggro for damage
        if (source?.id) {
            this.addAggro(source.id, actualDamage);
        }
        
        eventBus.emit(GameEvents.COMBAT_DAMAGE, {
            target: this,
            source,
            amount: actualDamage
        });
        
        // Check flee behavior
        if (this.behaviorData.fleeAtHealthPercent > 0 && 
            this.healthPercent <= this.behaviorData.fleeAtHealthPercent) {
            // TODO: Implement flee behavior
        }
        
        if (!this.isAlive) {
            this.die(source);
        }
        
        return actualDamage;
    }
    
    die(killer = null) {
        this.currentHealth = 0;
        this.isDead = true;
        this.inCombat = false;
        this.currentTarget = null;
        this.aggroTable.clear();
        
        eventBus.emit(GameEvents.COMBAT_DEATH, {
            entity: this,
            killer,
            xpValue: this.xpValue
        });
        
        // Trigger loot drop
        eventBus.emit(GameEvents.LOOT_DROP, {
            source: this,
            position: this.position,
            lootTable: this.lootTable,
            multiplier: this.lootMultiplier
        });
    }
    
    // === Position and Movement ===
    
    setPosition(q, r) {
        this.position = { q, r };
        eventBus.emit(GameEvents.ENTITY_POSITION_CHANGED, {
            entity: this,
            position: this.position
        });
    }
    
    // === Status Effects ===
    
    addStatusEffect(effect) {
        const existing = this.statusEffects.find(e => e.id === effect.id);
        if (existing && !effect.stacks) {
            existing.remainingDuration = effect.duration;
            return;
        }
        
        this.statusEffects.push({
            ...effect,
            remainingDuration: effect.duration
        });
        
        eventBus.emit(GameEvents.STATUS_APPLIED, {
            target: this,
            effect
        });
    }
    
    removeStatusEffect(effectId) {
        const index = this.statusEffects.findIndex(e => e.id === effectId);
        if (index === -1) return;
        
        const effect = this.statusEffects.splice(index, 1)[0];
        eventBus.emit(GameEvents.STATUS_REMOVED, {
            target: this,
            effect
        });
    }
    
    hasStatusEffect(effectId) {
        return this.statusEffects.some(e => e.id === effectId);
    }
    
    isStunned() {
        return this.statusEffects.some(e => e.type === 'stun');
    }
    
    isSlowed() {
        return this.statusEffects.some(e => e.type === 'slow');
    }
    
    // === AI Behavior ===
    
    shouldAggro(character, distance) {
        if (!this.behaviorData.aggroOnSight) return false;
        if (distance > this.aggroRange) return false;
        if (this.isDead) return false;
        
        return true;
    }
    
    // === Serialization (for respawning) ===
    
    getSpawnData() {
        const data = {
            creatureId: this.creatureId,
            subtypeId: this.subtypeId,
            level: this.level,
            behaviorId: this.behaviorId,
            homePosition: this.homePosition
        };
        // Preserve boss metadata through respawn cycle
        if (this.isBoss) {
            data.isBoss = true;
            data.respawnDelay = this.respawnDelay;
        }
        return data;
    }
}

// Factory function to create NPC from map config
export function createNPCFromConfig(npcConfig, position) {
    const level = npcConfig.levelRange 
        ? Math.floor(Math.random() * (npcConfig.levelRange[1] - npcConfig.levelRange[0] + 1)) + npcConfig.levelRange[0]
        : npcConfig.level || 1;
    
    return new NPC({
        creatureId: npcConfig.creatureId,
        subtypeId: npcConfig.subtypeId || 'normal',
        level,
        position: { ...position },
        homePosition: { ...position },
        // Boss spawn metadata (passed from mapConfig NPC entries)
        isBoss: npcConfig.isBoss || false,
        respawnDelay: npcConfig.respawnDelay || null
    });
}

export default NPC;
