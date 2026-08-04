/**
 * @file HexGrid.js
 * @description SVG-based hex grid rendering system with optimized entity movement
 *              rendering and smooth sliding animations
 * 
 * @location ui/HexGrid.js
 * @version 1.9.0
 * @changelog
 *   - v1.9.0 (2026-03-07): Added getEntityElement(entityId) public method for AnimationManager
 *                          access. Supports lunge, shake, and spawn-poof combat animations.
 *   - v1.8.0 (2026-02-28): TILE ROTATION - terrainTiles entries can now be objects with
 *                          { tile, rot } for rotation support. Backward compatible with
 *                          string-only entries. Rotation applied as SVG transform around
 *                          hex center. Enables reusing path/river tiles at different angles.
 *   - v1.7.0 (2026-02-26): TERRAIN TILES - Added illustrated hex tile support. New terrain SVG layer
 *                          between background and hexes. _renderHex() inserts <image> elements for maps
 *                          with terrainTiles config. Polygons get hex-has-terrain class (transparent fill)
 *                          so tiles show through while preserving click/hover. Import getTerrainTilePath.
 *                          Terrain layer cleared in renderGrid(). Greenward Paths pilot.
 *   - v1.6.0 (2026-02-10): Removed loot drop rendering - loot is always auto-picked up
 *                          so visual loot bags on map are unnecessary. Removed loot SVG layer,
 *                          lootElements map, LOOT_SPAWNED/LOOT_PICKUP listeners, renderLoot(),
 *                          _renderLoot(), _onLootSpawned(), _onLootPickup(), _onLootClick(),
 *                          removeLoot(), and lootFill theme color.
 *   - v1.5.0 (2026-02-09): MOBILE HEX MAP - Fixed hex sizing via _calculateHexRadius() using
 *                          device container + maxGridCols/maxGridRows from gameConfig. SVG set to
 *                          exact pixel dimensions (no stretching). Excluded hexes skipped in render,
 *                          click, and hover. Import isExcludedHex from mapConfig.
 *                          See MOBILE_HEX_MAP_IMPLEMENTATION.md.
 *   - v1.4.0 (2025-01-23): SMOOTH MOVEMENT - Entities now slide between tiles using CSS transforms
 *                          instead of jumping. Added transform-based positioning, configurable
 *                          animation duration, and reduced-motion support.
 *   - v1.3.0 (2025-01-03): PERFORMANCE - Added addEntity() for efficient single-entity rendering,
 *                          CSS transitions for smooth movement, optimized updateEntityPosition()
 *   - v1.2.0 (2025-01-02): Added configurable loot icon visibility (hide gold/consumable-only drops)
 *   - v1.1.0 (2025-01): Added dynamic loot rendering via LOOT_SPAWNED/LOOT_PICKUP events
 *   - v1.0.0 (2025-01): Initial implementation
 */

import { GameConfig } from '../config/gameConfig.js';
import { isExcludedHex } from '../config/mapConfig.js';
import { hexToPixel, hexPointsString, calculateGridPixelSize, pixelToHex, hexDistance } from '../utils/hexMath.js';
import { eventBus, GameEvents } from '../systems/EventBus.js';
import { getTerrainTilePath } from '../config/terrainAssets.js';

export class HexGrid {
    constructor(container, options = {}) {
        this.container = container;
        this.hexRadius = options.hexRadius || GameConfig.ui.hexSize; // Fallback; overridden in _init()
        this.gridWidth = options.gridWidth || GameConfig.ui.defaultGridWidth;
        this.gridHeight = options.gridHeight || GameConfig.ui.defaultGridHeight;
        
        // Animation settings
        this.movementDuration = options.movementDuration || 225; // ms per tile
        
        // Create SVG element
        this.svg = null;
        this.layers = {
            background: null,
            terrain: null,    // Terrain tile images (v1.7.0)
            hexes: null,
            paths: null,
            entities: null,
            effects: null,
            ui: null
        };
        
        // State
        this.hexElements = new Map();  // "q,r" -> hex element
        this.entityElements = new Map();  // entity.id -> element
        this.selectedHex = null;
        this.hoveredHex = null;
        
        // Track entity base positions for transform calculations
        this.entityBasePositions = new Map(); // entity.id -> {x, y, q, r}
        
        // Map instance reference
        this.mapInstance = null;
        this.player = null;
        
        // Theme colors
        this.theme = {
            hexFill: '#3a5a40',
            hexStroke: '#2d4a34',
            hexHover: '#4a6a50',
            hexSelected: '#5a7a60',
            hexBlocked: '#2a3a2a',
            hexExit: '#6a8a6a',
            hexPath: 'rgba(100, 200, 100, 0.4)',
            playerFill: '#4a90d9',
            npcFill: '#d94a4a',
            ...options.theme
        };
        
        this._init();
    }
    
    _init() {
        // Calculate device-appropriate hex radius (fixed for all maps)
        this.hexRadius = this._calculateHexRadius();
        
        // Calculate pixel dimensions for the current map at the computed radius
        const { width, height } = calculateGridPixelSize(this.gridWidth, this.gridHeight, this.hexRadius);
        
        // Create SVG at exact pixel dimensions — no stretching
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.setAttribute('width', width);
        this.svg.setAttribute('height', height);
        this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        // No preserveAspectRatio needed — SVG pixels = CSS pixels (1:1)
        this.svg.classList.add('hex-grid-svg');
        
        // Create layers in order (bottom to top)
        for (const layerName of Object.keys(this.layers)) {
            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.classList.add(`hex-layer-${layerName}`);
            this.svg.appendChild(g);
            this.layers[layerName] = g;
        }
        
        // Add to container
        this.container.appendChild(this.svg);
        
        // Add event listeners
        this._setupEventListeners();
    }
    
    /**
     * Calculate hex radius from container dimensions, ensuring:
     * - The LARGEST possible grid (maxCols × maxRows) fits within the container
     * - Minimum radius meets touch target requirements (44px diameter)
     * - Same radius used for all maps on this device → consistent hex sizes
     *
     * @returns {number} Hex radius in CSS pixels
     */
    _calculateHexRadius() {
        const maxCols = GameConfig.ui.maxGridCols;   // 8
        const maxRows = GameConfig.ui.maxGridRows;   // 12
        const minR    = GameConfig.ui.minHexRadius;  // 22
        
        // Measure actual container dimensions
        const containerRect = this.container.getBoundingClientRect();
        const availW = containerRect.width;
        const availH = containerRect.height;
        
        // Fallback if container has no dimensions yet
        if (availW === 0 || availH === 0) {
            return GameConfig.ui.hexSize || 40;
        }
        
        // colFactor: pixel width of grid = R * colFactor
        const colFactor = 2 + 1.5 * (maxCols - 1);     // 12.5
        
        // rowFactor: pixel height of grid = R * rowFactor
        // height = sqrt(3)*R * (rows + 0.5)
        const rowFactor = Math.sqrt(3) * (maxRows + 0.5); // ~21.65
        
        // R that fits width, R that fits height — take the smaller
        const rFromWidth  = availW / colFactor;
        const rFromHeight = availH / rowFactor;
        
        // Apply minimum, then floor for clean pixels
        return Math.max(minR, Math.floor(Math.min(rFromWidth, rFromHeight)));
    }
    
    _setupEventListeners() {
        // Click handler - use event target for accurate hex detection
        this.svg.addEventListener('click', (e) => {
            const hex = this._getHexFromEvent(e);
            if (hex) {
                this._onHexClick(hex.q, hex.r);
            }
        });
        
        // Hover handler
        this.svg.addEventListener('mousemove', (e) => {
            const hex = this._getHexFromEvent(e);
            if (hex) {
                this._onHexHover(hex.q, hex.r);
            }
        });
        
        // Touch handler for mobile
        this.svg.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const hex = this._getHexFromEvent(touch);
            if (hex) {
                this._onHexClick(hex.q, hex.r);
            }
        }, { passive: false });
    }
    
    _getHexFromEvent(e) {
        const rect = this.svg.getBoundingClientRect();
        const viewBox = this.svg.viewBox.baseVal;
        
        // Convert screen coords to SVG coords
        const scaleX = viewBox.width / rect.width;
        const scaleY = viewBox.height / rect.height;
        
        const svgX = (e.clientX - rect.left) * scaleX;
        const svgY = (e.clientY - rect.top) * scaleY;
        
        // First, try to get hex from the clicked element directly
        let target = e.target;
        
        // Walk up to find a hex polygon with data attributes
        while (target && target !== this.svg) {
            if (target.classList?.contains('hex') && target.hasAttribute('data-q')) {
                const q = parseInt(target.getAttribute('data-q'), 10);
                const r = parseInt(target.getAttribute('data-r'), 10);
                return { q, r };
            }
            target = target.parentElement;
        }
        
        // If we clicked on an entity or other element, use elementsFromPoint
        // to find the hex underneath
        const elements = document.elementsFromPoint(e.clientX, e.clientY);
        for (const el of elements) {
            if (el.classList?.contains('hex') && el.hasAttribute('data-q')) {
                const q = parseInt(el.getAttribute('data-q'), 10);
                const r = parseInt(el.getAttribute('data-r'), 10);
                return { q, r };
            }
        }
        
        // Final fallback: calculate from pixel position
        return pixelToHex(svgX, svgY, this.hexRadius);
    }
    
    _onHexClick(q, r) {
        if (q < 0 || q >= this.gridWidth || r < 0 || r >= this.gridHeight) {
            return;
        }
        
        // Ignore clicks on excluded (void) hexes
        if (this.mapInstance && isExcludedHex(this.mapInstance.mapId, q, r)) {
            return;
        }
        
        // Check for entity at hex
        const entity = this.mapInstance?.getEntityAt(q, r);
        
        if (entity) {
            eventBus.emit(GameEvents.INPUT_ENTITY_CLICK, {
                entity,
                position: { q, r }
            });
        } else {
            eventBus.emit(GameEvents.INPUT_HEX_CLICK, {
                q, r
            });
        }
        
        this.selectHex(q, r);
    }
    
    _onHexHover(q, r) {
        if (this.hoveredHex?.q === q && this.hoveredHex?.r === r) return;
        
        // Clear previous hover
        if (this.hoveredHex) {
            const prevKey = `${this.hoveredHex.q},${this.hoveredHex.r}`;
            const prevHex = this.hexElements.get(prevKey);
            if (prevHex) {
                prevHex.classList.remove('hex-hover');
            }
        }
        
        // Set new hover (skip excluded hexes)
        if (q >= 0 && q < this.gridWidth && r >= 0 && r < this.gridHeight
            && !(this.mapInstance && isExcludedHex(this.mapInstance.mapId, q, r))) {
            this.hoveredHex = { q, r };
            const key = `${q},${r}`;
            const hex = this.hexElements.get(key);
            if (hex) {
                hex.classList.add('hex-hover');
            }
        } else {
            this.hoveredHex = null;
        }
    }
    
    // === Grid Rendering ===
    
    /**
     * Render the entire hex grid
     */
    renderGrid(mapInstance, player = null) {
        this.mapInstance = mapInstance;
        this.player = player;
        
        // Update dimensions if needed
        if (mapInstance.gridWidth !== this.gridWidth || mapInstance.gridHeight !== this.gridHeight) {
            this.gridWidth = mapInstance.gridWidth;
            this.gridHeight = mapInstance.gridHeight;
            this._updateViewBox();
        }
        
        // Clear existing hexes and terrain tiles
        this.layers.hexes.innerHTML = '';
        this.layers.terrain.innerHTML = '';  // v1.7.0: clear terrain tiles
        this.hexElements.clear();
        
        // Render all hexes
        for (let q = 0; q < this.gridWidth; q++) {
            for (let r = 0; r < this.gridHeight; r++) {
                this._renderHex(q, r);
            }
        }
        
        // Render entities
        this.renderEntities();
    }
    
    _updateViewBox() {
        const { width, height } = calculateGridPixelSize(this.gridWidth, this.gridHeight, this.hexRadius);
        this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        this.svg.setAttribute('width', width);   // Match SVG size to new map dims
        this.svg.setAttribute('height', height); // Match SVG size to new map dims
    }
    
    _renderHex(q, r) {
        // Skip excluded (void) hexes entirely — no DOM element, no interaction
        if (this.mapInstance && isExcludedHex(this.mapInstance.mapId, q, r)) {
            return;
        }
        
        const { x, y } = hexToPixel(q, r, this.hexRadius);
        const points = hexPointsString(x, y, this.hexRadius);
        
        // --- Render terrain tile image if available (v1.7.0, rotation v1.8.0) ---
        const tileEntry = this.mapInstance?.mapData?.terrainTiles?.[`${q},${r}`] || null;
        // Support both string ("plains_lush_1") and object ({ tile: "dirt_path_1_n", rot: 60 })
        let tileKey, tileRot;
        if (tileEntry && typeof tileEntry === 'object') {
            tileKey = tileEntry.tile;
            tileRot = tileEntry.rot || 0;
        } else {
            tileKey = tileEntry || this.mapInstance?.mapData?.terrainTileDefault || null;
            tileRot = 0;
        }
        if (!tileKey && !tileEntry) {
            tileKey = this.mapInstance?.mapData?.terrainTileDefault || null;
        }
        
        if (tileKey) {
            const tilePath = getTerrainTilePath(tileKey);
            if (tilePath) {
                // 2MT tile image dimensions and content offset
                const IMG_W = 224, IMG_H = 194;
                const CONTENT_LEFT = 52, CONTENT_TOP = 46;
                const CONTENT_W = 118, CONTENT_H = 111;
                
                // The hex polygon has: width = 2*R, height = sqrt(3)*R
                const hexW = this.hexRadius * 2;
                const hexH = this.hexRadius * Math.sqrt(3);
                
                // Scale factor: map content hex size to game hex size
                const scaleX = hexW / CONTENT_W;
                const scaleY = hexH / CONTENT_H;
                
                // Scaled full image dimensions
                const scaledImgW = IMG_W * scaleX;
                const scaledImgH = IMG_H * scaleY;
                
                // Position: center of hex minus scaled content offset and half content
                const imgX = x - (CONTENT_LEFT * scaleX) - (CONTENT_W * scaleX / 2);
                const imgY = y - (CONTENT_TOP * scaleY) - (CONTENT_H * scaleY / 2);
                
                const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
                img.setAttribute('href', tilePath);
                img.setAttribute('x', imgX);
                img.setAttribute('y', imgY);
                img.setAttribute('width', scaledImgW);
                img.setAttribute('height', scaledImgH);
                img.setAttribute('preserveAspectRatio', 'none');
                img.setAttribute('class', 'hex-terrain-tile');
                img.setAttribute('data-q', q);
                img.setAttribute('data-r', r);
                
                // Apply rotation around hex center if specified (v1.8.0)
                if (tileRot) {
                    img.setAttribute('transform', `rotate(${tileRot} ${x} ${y})`);
                }
                
                this.layers.terrain.appendChild(img);
            }
        }
        // --- END terrain tile ---
        
        // Create hex polygon
        const hex = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        hex.setAttribute('points', points);
        hex.setAttribute('data-q', q);
        hex.setAttribute('data-r', r);
        hex.classList.add('hex');
        
        // If this hex has a terrain tile, make polygon transparent (tile provides visuals)
        if (tileKey) {
            hex.classList.add('hex-has-terrain');
        }
        
        // Determine hex type
        const hexInfo = this.mapInstance?.getHexInfo(q, r);
        
        if (hexInfo?.isObstacle) {
            hex.classList.add('hex-obstacle');
        } else if (hexInfo?.exit) {
            hex.classList.add('hex-exit');
        } else if (hexInfo?.special) {
            hex.classList.add('hex-special');
        }
        
        this.layers.hexes.appendChild(hex);
        this.hexElements.set(`${q},${r}`, hex);
    }
    
    // === Entity Rendering ===
    
    renderEntities() {
        // Clear existing entities
        this.layers.entities.innerHTML = '';
        this.entityElements.clear();
        this.entityBasePositions.clear();
        
        if (!this.mapInstance) return;
        
        // Render players from mapInstance.players (original approach)
        if (this.mapInstance.players && this.mapInstance.players.size > 0) {
            for (const player of this.mapInstance.players.values()) {
                this._renderEntity(player, 'player');
            }
        } 
        // Fallback: render this.player if passed directly
        else if (this.player) {
            this._renderEntity(this.player, 'player');
        }
        
        // Render NPCs
        for (const npc of this.mapInstance.npcs.values()) {
            if (npc.isAlive) {
                this._renderEntity(npc, 'npc');
            }
        }
    }
    
    /**
     * Render a single entity with transform-based positioning for smooth movement
     * @param {Object} entity - The entity to render
     * @param {string} type - Entity type ('player' or 'npc')
     */
    _renderEntity(entity, type) {
        const { x, y } = hexToPixel(entity.position.q, entity.position.r, this.hexRadius);
        
        // Store base position for this entity (used for transform calculations)
        this.entityBasePositions.set(entity.id, {
            x: x,
            y: y,
            q: entity.position.q,
            r: entity.position.r
        });
        
        // Create entity group with transform for smooth movement
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.classList.add('entity', `entity-${type}`);
        g.setAttribute('data-id', entity.id);
        
        // Set CSS custom property for animation duration
        g.style.setProperty('--movement-duration', `${this.movementDuration}ms`);
        
        // Entity circle background - positioned at origin, group transform moves it
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', x);
        circle.setAttribute('cy', y);
        circle.setAttribute('r', this.hexRadius * 0.6);
        circle.classList.add('entity-bg');
        g.appendChild(circle);
        
        // Entity sprite (image or emoji fallback)
        const sprite = this._getEntitySprite(entity, type);
        if (this._isImagePath(sprite)) {
            const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
            const imgSize = this.hexRadius * 1.4;
            img.setAttribute('x', x - imgSize / 2);
            img.setAttribute('y', y - imgSize / 2);
            img.setAttribute('width', imgSize);
            img.setAttribute('height', imgSize);
            img.setAttribute('href', sprite);
            img.setAttribute('preserveAspectRatio', 'xMidYMid meet');
            img.classList.add('svg-entity-sprite');
            
            // Fallback to emoji if image fails to load
            img.addEventListener('error', () => {
                img.remove();
                const fallbackEmoji = entity.sprite || (type === 'player' ? '⚔️' : '👹');
                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.setAttribute('x', x);
                text.setAttribute('y', y);
                text.setAttribute('text-anchor', 'middle');
                text.setAttribute('dominant-baseline', 'central');
                text.setAttribute('font-size', this.hexRadius * 0.8);
                text.textContent = fallbackEmoji;
                text.classList.add('svg-entity-sprite');
                g.insertBefore(text, g.querySelector('.health-bar-bg'));
            });
            
            g.appendChild(img);
        } else {
            // Emoji fallback
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', x);
            text.setAttribute('y', y);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('dominant-baseline', 'central');
            text.setAttribute('font-size', this.hexRadius * 0.8);
            text.textContent = sprite || (type === 'player' ? '⚔️' : '👹');
            text.classList.add('svg-entity-sprite');
            g.appendChild(text);
        }
        
        // Health bar background
        const healthBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        const barWidth = this.hexRadius * 1.2;
        const barHeight = 4;
        healthBg.setAttribute('x', x - barWidth / 2);
        healthBg.setAttribute('y', y + this.hexRadius * 0.5);
        healthBg.setAttribute('width', barWidth);
        healthBg.setAttribute('height', barHeight);
        healthBg.setAttribute('rx', 2);
        healthBg.classList.add('health-bar-bg');
        g.appendChild(healthBg);
        
        // Health bar fill
        const healthFill = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        healthFill.setAttribute('x', x - barWidth / 2);
        healthFill.setAttribute('y', y + this.hexRadius * 0.5);
        healthFill.setAttribute('width', barWidth * entity.healthPercent);
        healthFill.setAttribute('height', barHeight);
        healthFill.setAttribute('rx', 2);
        healthFill.classList.add('health-bar-fill');
        healthFill.setAttribute('data-entity-health', entity.id);
        g.appendChild(healthFill);
        
        this.layers.entities.appendChild(g);
        this.entityElements.set(entity.id, g);
    }
    
    _getEntitySprite(entity, type) {
        if (type === 'player') {
            // Use emoji directly - image fallback wasn't working
            return '⚔️';
        }
        
        // Get sprite directly from entity (which comes from npcConfig)
        // If entity has an emoji sprite, use it; otherwise try image path
        if (entity.sprite && !entity.sprite.includes('/') && !entity.sprite.endsWith('.png')) {
            return entity.sprite;  // It's an emoji
        }
        return entity.sprite || '👹';  // Fallback to goblin emoji
    }
    
    _isImagePath(sprite) {
        return sprite && (sprite.includes('/') || sprite.endsWith('.png') || sprite.endsWith('.jpg'));
    }
    
    /**
     * Update entity position with smooth sliding animation using CSS transforms
     * @param {Object} entity - The entity to update
     */
    updateEntityPosition(entity) {
        const g = this.entityElements.get(entity.id);
        if (!g) return;
        
        const basePos = this.entityBasePositions.get(entity.id);
        if (!basePos) {
            // No base position stored, fall back to direct update
            this._updateEntityPositionDirect(entity);
            return;
        }
        
        // Calculate new pixel position
        const { x: newX, y: newY } = hexToPixel(entity.position.q, entity.position.r, this.hexRadius);
        
        // Calculate delta from base position
        const deltaX = newX - basePos.x;
        const deltaY = newY - basePos.y;
        
        // Apply transform for smooth sliding
        // The CSS transition on .entity will animate this change
        g.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        
        // Update stored position for next calculation
        // We keep the original base position but track current hex
        this.entityBasePositions.set(entity.id, {
            ...basePos,
            currentQ: entity.position.q,
            currentR: entity.position.r
        });
    }
    
    /**
     * Direct position update without animation (fallback)
     * @param {Object} entity - The entity to update
     */
    _updateEntityPositionDirect(entity) {
        const g = this.entityElements.get(entity.id);
        if (!g) return;
        
        const { x, y } = hexToPixel(entity.position.q, entity.position.r, this.hexRadius);
        
        // Update all children positions directly
        const circle = g.querySelector('circle');
        if (circle) {
            circle.setAttribute('cx', x);
            circle.setAttribute('cy', y);
        }
        
        // Update image position if exists
        const img = g.querySelector('image');
        if (img) {
            const imgSize = this.hexRadius * 1.4;
            img.setAttribute('x', x - imgSize / 2);
            img.setAttribute('y', y - imgSize / 2);
        }
        
        // Update text position if exists (emoji fallback)
        const text = g.querySelector('text');
        if (text) {
            text.setAttribute('x', x);
            text.setAttribute('y', y);
        }
        
        const healthBg = g.querySelector('.health-bar-bg');
        const healthFill = g.querySelector('.health-bar-fill');
        const barWidth = this.hexRadius * 1.2;
        
        if (healthBg) {
            healthBg.setAttribute('x', x - barWidth / 2);
            healthBg.setAttribute('y', y + this.hexRadius * 0.5);
        }
        if (healthFill) {
            healthFill.setAttribute('x', x - barWidth / 2);
            healthFill.setAttribute('y', y + this.hexRadius * 0.5);
        }
        
        // Update base position
        this.entityBasePositions.set(entity.id, {
            x: x,
            y: y,
            q: entity.position.q,
            r: entity.position.r
        });
    }
    
    /**
     * Reset entity to use direct positioning (call after extended movement)
     * This prevents transform values from growing too large over time
     * @param {Object} entity - The entity to reset
     */
    resetEntityPosition(entity) {
        const g = this.entityElements.get(entity.id);
        if (!g) return;
        
        // Remove transition temporarily for instant reset
        g.style.transition = 'none';
        g.style.transform = 'translate(0, 0)';
        
        // Update to new base position
        this._updateEntityPositionDirect(entity);
        
        // Re-enable transition after a frame
        requestAnimationFrame(() => {
            g.style.transition = '';
        });
    }
    
    updateEntityHealth(entity) {
        const healthFill = this.layers.entities.querySelector(`[data-entity-health="${entity.id}"]`);
        if (healthFill) {
            const barWidth = this.hexRadius * 1.2;
            healthFill.setAttribute('width', barWidth * Math.max(0, entity.healthPercent));
        }
    }
    
    removeEntity(entityId) {
        const g = this.entityElements.get(entityId);
        if (g) {
            g.remove();
            this.entityElements.delete(entityId);
            this.entityBasePositions.delete(entityId);
        }
    }
    
    /**
     * Add a single entity to the grid (efficient alternative to full renderEntities)
     * @param {Object} entity - The entity to add (player or NPC)
     * @param {string} type - Entity type ('player' or 'npc')
     */
    addEntity(entity, type) {
        // Don't add if already exists
        if (this.entityElements.has(entity.id)) {
            return;
        }
        this._renderEntity(entity, type);
    }

    /**
     * Get the SVG <g> element for an entity by ID.
     * Used by AnimationManager to apply lunge, shake, and spawn-poof animations.
     * @param {string} entityId - The entity's id
     * @returns {SVGGElement|null}
     */
    getEntityElement(entityId) {
        return this.entityElements.get(entityId) || null;
    }
    
    // === Path Rendering ===
    
    renderPath(path) {
        this.clearPath();
        
        if (!path || path.length === 0) return;
        
        for (const { q, r } of path) {
            const { x, y } = hexToPixel(q, r, this.hexRadius);
            const points = hexPointsString(x, y, this.hexRadius);
            
            const hex = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            hex.setAttribute('points', points);
            hex.classList.add('hex-path');
            
            this.layers.paths.appendChild(hex);
        }
    }
    
    clearPath() {
        this.layers.paths.innerHTML = '';
    }
    
    // === Selection ===
    
    selectHex(q, r) {
        // Clear previous selection
        if (this.selectedHex) {
            const prevKey = `${this.selectedHex.q},${this.selectedHex.r}`;
            const prevHex = this.hexElements.get(prevKey);
            if (prevHex) {
                prevHex.classList.remove('hex-selected');
            }
        }
        
        // Set new selection
        this.selectedHex = { q, r };
        const key = `${q},${r}`;
        const hex = this.hexElements.get(key);
        if (hex) {
            hex.classList.add('hex-selected');
        }
    }
    
    clearSelection() {
        if (this.selectedHex) {
            const key = `${this.selectedHex.q},${this.selectedHex.r}`;
            const hex = this.hexElements.get(key);
            if (hex) {
                hex.classList.remove('hex-selected');
            }
            this.selectedHex = null;
        }
    }
    
    // === Effects ===
    
    showDamageNumber(q, r, damage, isCritical = false) {
        const { x, y } = hexToPixel(q, r, this.hexRadius);
        
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', x);
        text.setAttribute('y', y - this.hexRadius * 0.5);
        text.setAttribute('text-anchor', 'middle');
        text.classList.add('damage-number');
        if (isCritical) {
            text.classList.add('critical');
        }
        text.textContent = `-${damage}`;
        
        this.layers.effects.appendChild(text);
        
        // Animate and remove
        setTimeout(() => text.remove(), 1000);
    }
    
    showHealNumber(q, r, amount) {
        const { x, y } = hexToPixel(q, r, this.hexRadius);
        
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', x);
        text.setAttribute('y', y - this.hexRadius * 0.5);
        text.setAttribute('text-anchor', 'middle');
        text.classList.add('heal-number');
        text.textContent = `+${amount}`;
        
        this.layers.effects.appendChild(text);
        
        setTimeout(() => text.remove(), 1000);
    }
    
    showLootNumber(q, r, text_content) {
        const { x, y } = hexToPixel(q, r, this.hexRadius);
        
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', x);
        text.setAttribute('y', y - this.hexRadius * 0.3);
        text.setAttribute('text-anchor', 'middle');
        text.classList.add('loot-number');
        text.textContent = text_content;
        
        this.layers.effects.appendChild(text);
        
        setTimeout(() => text.remove(), 1500);
    }
    
    // === Utility ===
    
    /**
     * Get the SVG element for coordinate conversions
     * @returns {SVGElement}
     */
    getSvgElement() {
        return this.svg;
    }
    
    // === Cleanup ===
    
    destroy() {
        this.svg.remove();
        this.hexElements.clear();
        this.entityElements.clear();
        this.entityBasePositions.clear();
    }
}

export default HexGrid;
