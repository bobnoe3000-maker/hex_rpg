// MovementEngine - Handles pathfinding and entity movement
import { GameConfig } from '../config/gameConfig.js';
import { eventBus, GameEvents } from '../systems/EventBus.js';
import { findPath, hexDistance, getHexNeighbors, isInBounds } from '../utils/hexMath.js';

export class MovementEngine {
    constructor() {
        this.movementQueue = new Map();  // entity.id -> movement state
        this.isRunning = false;
        this.tickInterval = null;
    }
    
    /**
     * Start the movement tick loop
     */
    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        
        this.tickInterval = setInterval(() => {
            this.processTick();
        }, GameConfig.tick.movementRate);
    }
    
    /**
     * Stop the movement tick loop
     */
    stop() {
        this.isRunning = false;
        if (this.tickInterval) {
            clearInterval(this.tickInterval);
            this.tickInterval = null;
        }
    }
    
    /**
     * Process all queued movements
     */
    processTick() {
        for (const [entityId, state] of this.movementQueue) {
            this._processEntityMovement(state);
        }
    }
    
    /**
     * Request movement to a target hex
     */
    moveTo(entity, targetQ, targetR, mapInstance) {
        // Cancel any existing movement
        this.cancelMovement(entity.id);
        
        // Validate target
        if (!isInBounds(targetQ, targetR, mapInstance.gridWidth, mapInstance.gridHeight)) {
            return { success: false, reason: 'out_of_bounds' };
        }
        
        // Check if target is blocked
        if (mapInstance.isHexBlocked(targetQ, targetR)) {
            // Try to find nearest open hex
            const nearestOpen = this._findNearestOpen(targetQ, targetR, mapInstance);
            if (nearestOpen) {
                targetQ = nearestOpen.q;
                targetR = nearestOpen.r;
            } else {
                return { success: false, reason: 'target_blocked' };
            }
        }
        
        // Already at target
        if (entity.position.q === targetQ && entity.position.r === targetR) {
            return { success: true, reason: 'already_there' };
        }
        
        // Calculate path - exclude entity's own position from blocked check
        const entityQ = entity.position.q;
        const entityR = entity.position.r;
        const path = findPath(
            entity.position.q, entity.position.r,
            targetQ, targetR,
            mapInstance.gridWidth, mapInstance.gridHeight,
            (q, r) => {
                // Don't consider entity's own position as blocked
                if (q === entityQ && r === entityR) return false;
                return mapInstance.isHexBlocked(q, r);
            }
        );
        
        if (!path || path.length === 0) {
            return { success: false, reason: 'no_path' };
        }
        
        // Queue movement
        const moveState = {
            entity,
            mapInstance,
            path,
            currentIndex: 0,
            targetQ,
            targetR,
            startTime: Date.now(),
            lastMoveTime: Date.now()
        };
        
        this.movementQueue.set(entity.id, moveState);
        entity.isMoving = true;
        entity.movementPath = path;
        
        eventBus.emit(GameEvents.ENTITY_MOVE_START, {
            entity,
            path,
            target: { q: targetQ, r: targetR }
        });
        
        return { success: true, path };
    }
    
    /**
     * Move entity toward a target (for auto-battle/AI)
     */
    moveToward(entity, targetEntity, mapInstance) {
        // Find a hex adjacent to target
        const neighbors = getHexNeighbors(targetEntity.position.q, targetEntity.position.r);
        
        let bestTarget = null;
        let bestDist = Infinity;
        
        for (const neighbor of neighbors) {
            if (!isInBounds(neighbor.q, neighbor.r, mapInstance.gridWidth, mapInstance.gridHeight)) continue;
            if (mapInstance.isHexBlocked(neighbor.q, neighbor.r)) continue;
            
            const dist = hexDistance(entity.position.q, entity.position.r, neighbor.q, neighbor.r);
            if (dist < bestDist) {
                bestDist = dist;
                bestTarget = neighbor;
            }
        }
        
        if (bestTarget) {
            return this.moveTo(entity, bestTarget.q, bestTarget.r, mapInstance);
        }
        
        return { success: false, reason: 'no_adjacent_hex' };
    }
    
    /**
     * Move entity one step toward target (for tick-based movement)
     */
    stepToward(entity, targetQ, targetR, mapInstance) {
        const entityQ = entity.position.q;
        const entityR = entity.position.r;
        const path = findPath(
            entity.position.q, entity.position.r,
            targetQ, targetR,
            mapInstance.gridWidth, mapInstance.gridHeight,
            (q, r) => {
                if (q === entityQ && r === entityR) return false;
                return mapInstance.isHexBlocked(q, r);
            }
        );
        
        if (path && path.length > 0) {
            const nextStep = path[0];
            return mapInstance.moveEntity(entity, nextStep.q, nextStep.r);
        }
        
        return false;
    }
    
    /**
     * Cancel entity's current movement
     */
    cancelMovement(entityId) {
        const state = this.movementQueue.get(entityId);
        if (state) {
            state.entity.isMoving = false;
            state.entity.movementPath = [];
            this.movementQueue.delete(entityId);
            
            eventBus.emit(GameEvents.ENTITY_MOVE_END, {
                entity: state.entity,
                reason: 'cancelled'
            });
        }
    }
    
    /**
     * Process a single entity's movement
     */
    _processEntityMovement(state) {
        const { entity, mapInstance, path } = state;
        
        // Check if entity can move (not stunned, etc)
        if (entity.isStunned?.()) {
            return;
        }
        
        // Check movement timing
        const now = Date.now();
        let moveDelay = GameConfig.tick.movementRate;
        
        // Apply slow effect
        if (entity.isSlowed?.()) {
            const slowEffect = entity.statusEffects?.find(e => e.type === 'slow');
            if (slowEffect) {
                moveDelay = moveDelay / (slowEffect.modifier || 0.5);
            }
        }
        
        if (now - state.lastMoveTime < moveDelay) {
            return;
        }
        
        // Get next step
        if (state.currentIndex >= path.length) {
            // Reached destination
            this._completeMovement(state);
            return;
        }
        
        const nextHex = path[state.currentIndex];
        
        // Check if next hex is still available
        if (mapInstance.isHexBlocked(nextHex.q, nextHex.r)) {
            // Recalculate path
            const entityQ = entity.position.q;
            const entityR = entity.position.r;
            const newPath = findPath(
                entity.position.q, entity.position.r,
                state.targetQ, state.targetR,
                mapInstance.gridWidth, mapInstance.gridHeight,
                (q, r) => {
                    if (q === entityQ && r === entityR) return false;
                    return mapInstance.isHexBlocked(q, r);
                }
            );
            
            if (newPath && newPath.length > 0) {
                state.path = newPath;
                state.currentIndex = 0;
                entity.movementPath = newPath;
                return;
            } else {
                // Can't reach destination
                this._completeMovement(state, 'blocked');
                return;
            }
        }
        
        // Move to next hex
        const success = mapInstance.moveEntity(entity, nextHex.q, nextHex.r);
        
        if (success) {
            state.currentIndex++;
            state.lastMoveTime = now;
            
            eventBus.emit(GameEvents.ENTITY_MOVE_STEP, {
                entity,
                position: { q: nextHex.q, r: nextHex.r },
                remaining: path.length - state.currentIndex
            });
            
            // Update movement path visual
            entity.movementPath = path.slice(state.currentIndex);
            
            // Check if reached destination
            if (state.currentIndex >= path.length) {
                this._completeMovement(state);
            }
        } else {
            // Movement failed, recalculate
            this.cancelMovement(entity.id);
        }
    }
    
    /**
     * Complete an entity's movement
     */
    _completeMovement(state, reason = 'arrived') {
        const { entity } = state;
        
        entity.isMoving = false;
        entity.movementPath = [];
        this.movementQueue.delete(entity.id);
        
        eventBus.emit(GameEvents.ENTITY_MOVE_END, {
            entity,
            position: entity.position,
            reason
        });
    }
    
    /**
     * Find nearest open hex to a blocked target
     */
    _findNearestOpen(q, r, mapInstance) {
        const neighbors = getHexNeighbors(q, r);
        
        for (const neighbor of neighbors) {
            if (isInBounds(neighbor.q, neighbor.r, mapInstance.gridWidth, mapInstance.gridHeight) &&
                !mapInstance.isHexBlocked(neighbor.q, neighbor.r)) {
                return neighbor;
            }
        }
        
        return null;
    }
    
    /**
     * Check if entity has active movement
     */
    isMoving(entityId) {
        return this.movementQueue.has(entityId);
    }
    
    /**
     * Get entity's movement target
     */
    getMovementTarget(entityId) {
        const state = this.movementQueue.get(entityId);
        return state ? { q: state.targetQ, r: state.targetR } : null;
    }
}

// Singleton instance
export const movementEngine = new MovementEngine();

export default movementEngine;
