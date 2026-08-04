/**
 * @file WorldMapUI.js
 * @description SVG-based visual world map component with circular node rendering,
 *              level-based color coding, glowing effects, and connection lines.
 *              Shows all battle maps as interconnected nodes with detail panel,
 *              pan/zoom support, and travel functionality.
 * 
 * @usage Instantiated by TownScreen when opening the World Map modal.
 *        Provides visual navigation and map selection.
 * @dependencies 
 *   - MapConfig (config/mapConfig.js) - map data, layout, exits
 *   - NPCConfig (config/npcConfig.js) - creature lootTable references
 *   - ItemConfig (config/itemConfig.js) - loot tables, item definitions
 *   - HousingConfig (config/housingConfig.js) - material tiers, drop tiers
 *   - EventBus (systems/EventBus.js) - for travel events
 * 
 * @version 2.0.0
 * @changelog
 *   - v2.0.0 (2026-02-11): Complete visual overhaul — switched to SVG-based node rendering
 *                          with circular glowing nodes, level-based color coding (green→purple),
 *                          dashed connection lines, and dark gradient background. Nodes show
 *                          emoji icons, map name, and level range. Current location pulses.
 *                          Town node has gold accent. Preserves all detail panel functionality,
 *                          loot/material inspection, zoom controls, and touch handlers.
 *   - v1.5.0 (2026-02-10): Gear material chains now filtered by map max level. Uses same
 *                          tier thresholds as LootGenerator (Lv1-9→T1, Lv10-19→T2, etc.).
 *                          Coastal Caves now shows Wood/Iron only, not full chain to Ethereal.
 *                          New method: _getMaxGearMaterialTier(). Housing materials already
 *                          reflect updated MaterialDropTiers (T2 now requires Lv15+).
 *   - v1.4.0 (2026-02-10): Added gear material pools to Gear loot detail panel.
 *                          Shows which material tiers can drop (Metal/Cloth/Leather)
 *                          by tracing item materialType -> getMaterialsForType() pool.
 *                          New methods: _buildGearMaterialPoolsHtml().
 *                          New imports: getMaterialsForType from itemConfig.
 *   - v1.3.0 (2026-02-10): Moved Cancel/Travel buttons above Creatures section (right
 *                          after description) so user doesn't need to scroll to travel.
 *                          Added Loot Drops section with expandable Gear and Materials
 *                          pills. Gear traces map NPCs -> npcConfig lootTable ->
 *                          itemConfig itemPool, grouped by slot. Materials sourced from
 *                          housingConfig MaterialDropTiers gated by map levelRange.max.
 *   - v1.2.1 (2026-02-09): Allow fast travel to any battle map from any location, not just
 *                          connected maps. Removed connection restriction from _isAccessible().
 *   - v1.2.0 (2025-01-21): UI improvements:
 *                          - Allow clicking on any location (including current) to view details
 *                          - Removed last position display from node boxes for cleaner UI
 *                          - Standardized node sizes (removed width/height overrides)
 *                          - Last position info still shown in detail panel
 *   - v1.1.0 (2025-01-17): Initial implementation with pan/zoom, detail panel,
 *                          connection lines, travel restrictions, last position tracking
 */

import { 
    getMap, 
    getSelectableMaps, 
    getWorldMapLayout, 
    getWorldMapSettings,
    getMapConnections,
    getAllMapExits,
    mapsAreConnected,
    getMapNPCSummary,
    getDifficultyLabel,
    getDifficultyColor
} from '../config/mapConfig.js';

import { getCreature } from '../config/npcConfig.js';
import { getLootTable, getItem, getMaterialsForType } from '../config/itemConfig.js';
import { HousingMaterials, MaterialDropTiers } from '../config/housingConfig.js';

/**
 * Slot grouping labels for gear loot display
 */
const LOOT_SLOT_GROUPS = {
    mainHand: { label: 'Weapon', order: 0 },
    offHand:  { label: 'Off Hand', order: 1 },
    head:     { label: 'Head', order: 2 },
    body:     { label: 'Body', order: 3 },
    cape:     { label: 'Cape', order: 4 },
    boots:    { label: 'Boots', order: 5 },
    necklace: { label: 'Accessories', order: 6, merge: 'accessories' },
    ring:     { label: 'Accessories', order: 6, merge: 'accessories' }
};

/**
 * Maps item materialType -> material pool key used by getMaterialsForType()
 */
const MATERIAL_POOL_MAP = {
    metal: 'metal',
    wood: 'metal',
    crystal: 'metal',
    jewelry: 'metal',
    cloth: 'cloth',
    leather: 'leather'
};

const MATERIAL_POOL_LABELS = {
    metal:   { label: 'Metal',   order: 0 },
    cloth:   { label: 'Cloth',   order: 1 },
    leather: { label: 'Leather', order: 2 }
};

/**
 * Theme icons for map nodes
 */
const THEME_ICONS = { 
    forest: '🌲', undead: '💀', cave: '🕳️', swamp: '🌿', 
    camp: '⛺', dungeon: '🏚️', town: '🏰', ruins: '🏛️',
    wasteland: '💨', road: '🛤️', mountain: '⛰️'
};

export class WorldMapUI {
    /**
     * Create a WorldMapUI instance
     * @param {HTMLElement} container - Container element to render into
     * @param {Object} character - Player character (for last positions)
     * @param {Object} options - Configuration options
     * @param {boolean} options.isInTown - Whether player is currently in town
     * @param {string} options.currentMapId - Current map ID
     * @param {Function} options.onTravel - Callback when traveling (receives {mapId, returnToPosition})
     * @param {Function} options.onClose - Callback when closing the map
     */
    constructor(container, character, options = {}) {
        this.container = container;
        this.character = character;
        this.isInTown = options.isInTown ?? true;
        this.currentMapId = options.currentMapId || 'town';
        this.onTravel = options.onTravel || (() => {});
        this.onClose = options.onClose || (() => {});
        
        // Layout and settings
        this.layout = getWorldMapLayout();
        this.settings = getWorldMapSettings();
        
        // SVG layout constants
        this.cellW = 90;
        this.cellH = 80;
        this.nodeRadius = 22;
        this.townRadius = 28;
        this.pad = 1; // grid padding in cells
        
        // Zoom state
        this.zoomLevel = this.settings.defaultZoom || 1.0;
        this.minZoom = this.settings.minZoom || 0.5;
        this.maxZoom = this.settings.maxZoom || 1.5;
        
        // Touch state for pinch-to-zoom
        this.touchState = {
            isPinching: false,
            initialDistance: 0,
            initialZoom: 1.0
        };
        
        // Selected map for detail panel
        this.selectedMapId = null;
        
        // DOM references
        this.canvas = null;
        this.canvasInner = null;
        this.detailPanel = null;
        
        this._render();
    }
    
    // ============================================
    // LEVEL COLOR SYSTEM
    // ============================================
    
    /**
     * Get color based on map level range — higher levels progress through the spectrum
     * @param {Object} map - Map config object
     * @returns {string} CSS color string
     */
    _getLevelColor(map) {
        if (!map.levelRange) return '#FFD700'; // Town = gold
        const min = map.levelRange.min;
        if (min <= 5) return '#4CAF50';    // Green - starter
        if (min <= 12) return '#8BC34A';   // Light green - early
        if (min <= 20) return '#CDDC39';   // Yellow-green - mid-early
        if (min <= 32) return '#FFC107';   // Amber - mid
        if (min <= 45) return '#FF9800';   // Orange - mid-late
        if (min <= 58) return '#FF5722';   // Deep orange - late
        if (min <= 72) return '#E91E63';   // Pink - endgame
        if (min <= 88) return '#9C27B0';   // Purple - deep endgame
        return '#6A0DAD';                  // Dark purple - max
    }
    
    // ============================================
    // MAIN RENDER
    // ============================================
    
    /**
     * Main render method - SVG-based map with HTML overlay for detail panel
     */
    _render() {
        const maps = this._getAllMaps();
        
        // Calculate SVG bounds from layout
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const pos of Object.values(this.layout)) {
            minX = Math.min(minX, pos.x);
            maxX = Math.max(maxX, pos.x);
            minY = Math.min(minY, pos.y);
            maxY = Math.max(maxY, pos.y);
        }
        
        this._bounds = { minX, maxX, minY, maxY };
        
        const svgW = (maxX - minX + this.pad * 2 + 1) * this.cellW;
        const svgH = (maxY - minY + this.pad * 2 + 1) * this.cellH;
        
        this.container.innerHTML = `
            <div class="world-map-ui">
                <!-- Header -->
                <div class="wm-header">
                    <div class="wm-title">🗺️ World Map</div>
                    <div class="wm-subtitle">
                        Fast travel to any location
                    </div>
                </div>
                
                <!-- Map Canvas (scrollable/pannable) -->
                <div class="wm-canvas" id="wmCanvas">
                    <div class="wm-canvas-inner" id="wmCanvasInner" style="transform: scale(${this.zoomLevel}); transform-origin: center center;">
                        <svg id="wmSvg" width="${svgW}" height="${svgH}" 
                             viewBox="0 0 ${svgW} ${svgH}"
                             style="display: block;">
                            <!-- Defs for glow filters and pulse animation -->
                            <defs>
                                ${this._renderSvgDefs(maps)}
                            </defs>
                            
                            <!-- Connection lines -->
                            ${this._renderConnections()}
                            
                            <!-- Map nodes -->
                            ${this._renderNodes(maps)}
                        </svg>
                    </div>
                </div>
                
                <!-- Footer with zoom controls and legend -->
                <div class="wm-footer">
                    <div class="wm-legend">
                        ${this._renderLegend()}
                    </div>
                    <div class="wm-zoom-controls">
                        <button class="wm-zoom-btn" id="wmZoomOut" title="Zoom out">−</button>
                        <span class="wm-zoom-level" id="wmZoomLevel">${Math.round(this.zoomLevel * 100)}%</span>
                        <button class="wm-zoom-btn" id="wmZoomIn" title="Zoom in">+</button>
                    </div>
                </div>
                
                <!-- Detail Panel (shows on node click) -->
                <div class="wm-detail-panel" id="wmDetailPanel">
                    <div class="wm-detail-content" id="wmDetailContent"></div>
                </div>
            </div>
        `;
        
        // Store references
        this.canvas = this.container.querySelector('#wmCanvas');
        this.canvasInner = this.container.querySelector('#wmCanvasInner');
        this.detailPanel = this.container.querySelector('#wmDetailPanel');
        
        this._setupEventListeners();
        this._setupTouchHandlers();
        this._centerOnCurrentLocation();

        // Tutorial system — notify TutorialManager that World Map has opened
        eventBus.emit(GameEvents.WORLD_MAP_OPENED, {});
    }

    /**
     * Convert grid coords to SVG pixel coords
     */
    _toScreen(gx, gy) {
        const b = this._bounds;
        return {
            sx: (gx - b.minX + this.pad) * this.cellW + this.cellW / 2,
            sy: (gy - b.minY + this.pad) * this.cellH + this.cellH / 2
        };
    }
    
    /**
     * Get all maps including town
     */
    _getAllMaps() {
        const mapIds = ['town', ...getSelectableMaps()];
        return mapIds.map(id => getMap(id)).filter(m => m);
    }
    
    // ============================================
    // SVG RENDERING
    // ============================================
    
    /**
     * Render SVG defs — glow filters for each unique level color + pulse animation
     */
    _renderSvgDefs(maps) {
        // Collect unique colors for glow filters
        const colorSet = new Set();
        maps.forEach(m => colorSet.add(this._getLevelColor(m)));
        
        const filters = Array.from(colorSet).map(color => {
            const id = 'glow-' + color.replace('#', '');
            return `
                <filter id="${id}" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="4" result="blur"/>
                    <feFlood flood-color="${color}" flood-opacity="0.3" result="color"/>
                    <feComposite in="color" in2="blur" operator="in" result="glow"/>
                    <feMerge>
                        <feMergeNode in="glow"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            `;
        }).join('');
        
        // Pulse animation for current location + hover style
        const styles = `
            <style>
                @keyframes wmSvgPulse {
                    0%, 100% { opacity: 0.3; }
                    50% { opacity: 0.7; }
                }
                .wm-svg-pulse {
                    animation: wmSvgPulse 2s ease-in-out infinite;
                }
                .wm-svg-node { cursor: pointer; }
                .wm-svg-node:hover .wm-node-bg { opacity: 0.9; stroke-width: 2.5; }
            </style>
        `;
        
        return filters + styles;
    }
    
    /**
     * Render dashed connection lines between connected maps
     */
    _renderConnections() {
        const lines = [];
        const drawnPairs = new Set();
        
        for (const mapId of Object.keys(this.layout)) {
            const map = getMap(mapId);
            if (!map?.exits) continue;
            
            const fromPos = this.layout[mapId];
            if (!fromPos) continue;
            
            for (const exit of map.exits) {
                const toPos = this.layout[exit.targetMap];
                if (!toPos) continue;
                
                const pairKey = [mapId, exit.targetMap].sort().join('-');
                if (drawnPairs.has(pairKey)) continue;
                drawnPairs.add(pairKey);
                
                const from = this._toScreen(fromPos.x, fromPos.y);
                const to = this._toScreen(toPos.x, toPos.y);
                
                lines.push(`
                    <line x1="${from.sx}" y1="${from.sy}" x2="${to.sx}" y2="${to.sy}"
                          stroke="#3a4a5a" stroke-width="1.5" stroke-dasharray="5,4" opacity="0.6"/>
                `);
            }
        }
        
        return lines.join('');
    }
    
    /**
     * Render SVG map nodes — circular with glow, emoji icon, name, level
     */
    _renderNodes(maps) {
        return maps.map(map => {
            const pos = this.layout[map.id];
            if (!pos) return '';
            
            const { sx, sy } = this._toScreen(pos.x, pos.y);
            const color = this._getLevelColor(map);
            const isTown = map.id === 'town' || map.isTown;
            const isCurrent = map.id === this.currentMapId;
            const r = isTown ? this.townRadius : this.nodeRadius;
            const icon = THEME_ICONS[map.theme] || '🗺️';
            const glowId = 'glow-' + color.replace('#', '');
            
            const levelText = map.levelRange 
                ? `Lv ${map.levelRange.min}-${map.levelRange.max}` 
                : 'TOWN';
            
            // Pulse ring for current location
            const pulseRing = isCurrent
                ? `<circle cx="${sx}" cy="${sy}" r="${r + 8}" fill="${color}" class="wm-svg-pulse" opacity="0.3"/>`
                : '';
            
            // "★ YOU" marker for current location
            const youMarker = isCurrent
                ? `<text x="${sx + r + 2}" y="${sy - r + 4}" fill="#00ff88" font-size="8" font-weight="700" font-family="sans-serif">★ YOU</text>`
                : '';
            
            return `
                <g class="wm-svg-node" data-map-id="${map.id}">
                    ${pulseRing}
                    <circle cx="${sx}" cy="${sy}" r="${r + 4}" fill="${color}" opacity="0.15"/>
                    <circle class="wm-node-bg" cx="${sx}" cy="${sy}" r="${r}" 
                            fill="${isTown ? '#2a1f00' : '#0d1117'}"
                            stroke="${color}" 
                            stroke-width="${isTown ? 2.5 : 1.5}"
                            filter="url(#${glowId})"/>
                    <text x="${sx}" y="${sy + 1}" text-anchor="middle" dominant-baseline="central"
                          font-size="${isTown ? 16 : 13}" style="pointer-events: none; user-select: none;">
                        ${icon}
                    </text>
                    <text x="${sx}" y="${sy + r + 13}" text-anchor="middle"
                          fill="#c0c8d4" font-size="8.5" font-weight="600"
                          font-family="'Segoe UI', 'Helvetica Neue', sans-serif"
                          style="pointer-events: none; user-select: none;">
                        ${map.name}
                    </text>
                    <text x="${sx}" y="${sy + r + 23}" text-anchor="middle"
                          fill="${color}" font-size="7.5" font-weight="700"
                          font-family="'Courier New', monospace"
                          opacity="0.9"
                          style="pointer-events: none; user-select: none;">
                        ${levelText}
                    </text>
                    ${youMarker}
                </g>
            `;
        }).join('');
    }
    
    /**
     * Render color-coded legend for level ranges
     */
    _renderLegend() {
        const tiers = [
            { color: '#4CAF50', label: '1-12' },
            { color: '#FFC107', label: '13-45' },
            { color: '#FF5722', label: '46-72' },
            { color: '#9C27B0', label: '73+' }
        ];
        
        return `
            <span class="wm-legend-item"><span class="wm-legend-dot current"></span> You</span>
            ${tiers.map(t => `
                <span class="wm-legend-item">
                    <span class="wm-legend-dot" style="background: ${t.color}; border-color: ${t.color};"></span>
                    ${t.label}
                </span>
            `).join('')}
        `;
    }
    
    // ============================================
    // EVENT HANDLERS
    // ============================================
    
    /**
     * Check if a map is accessible from current location
     */
    _isAccessible(mapId) {
        if (mapId === this.currentMapId) return false;
        return true;
    }
    
    /**
     * Setup event listeners
     */
    _setupEventListeners() {
        // SVG node clicks
        const nodes = this.container.querySelectorAll('.wm-svg-node');
        nodes.forEach(node => {
            node.addEventListener('click', (e) => {
                e.stopPropagation();
                const mapId = node.dataset.mapId;
                this._selectMap(mapId);
            });
        });
        
        // Close detail panel when clicking empty canvas area
        this.canvas?.addEventListener('click', (e) => {
            if (!e.target.closest('.wm-svg-node')) {
                this._hideDetailPanel();
            }
        });
        
        // Zoom controls
        this.container.querySelector('#wmZoomIn')?.addEventListener('click', () => {
            this._setZoom(this.zoomLevel + 0.1);
        });
        
        this.container.querySelector('#wmZoomOut')?.addEventListener('click', () => {
            this._setZoom(this.zoomLevel - 0.1);
        });
        
        // Keyboard zoom (+ / -)
        this._keyHandler = (e) => {
            if (e.key === '+' || e.key === '=') {
                this._setZoom(this.zoomLevel + 0.1);
            } else if (e.key === '-') {
                this._setZoom(this.zoomLevel - 0.1);
            }
        };
        document.addEventListener('keydown', this._keyHandler);
        
        // Scroll wheel zoom with Ctrl
        this.canvas?.addEventListener('wheel', (e) => {
            if (e.ctrlKey) {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -0.1 : 0.1;
                this._setZoom(this.zoomLevel + delta);
            }
        }, { passive: false });
    }
    
    /**
     * Setup touch handlers for pan and pinch-to-zoom
     */
    _setupTouchHandlers() {
        if (!this.canvas) return;
        
        this.canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                this.touchState.isPinching = true;
                this.touchState.initialDistance = this._getTouchDistance(e.touches);
                this.touchState.initialZoom = this.zoomLevel;
            }
        }, { passive: false });
        
        this.canvas.addEventListener('touchmove', (e) => {
            if (this.touchState.isPinching && e.touches.length === 2) {
                e.preventDefault();
                const currentDistance = this._getTouchDistance(e.touches);
                const scale = currentDistance / this.touchState.initialDistance;
                const newZoom = this.touchState.initialZoom * scale;
                this._setZoom(newZoom);
            }
        }, { passive: false });
        
        this.canvas.addEventListener('touchend', () => {
            this.touchState.isPinching = false;
        });
    }
    
    /**
     * Calculate distance between two touch points
     */
    _getTouchDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * Set zoom level
     */
    _setZoom(level) {
        this.zoomLevel = Math.min(this.maxZoom, Math.max(this.minZoom, level));
        
        if (this.canvasInner) {
            this.canvasInner.style.transform = `scale(${this.zoomLevel})`;
        }
        
        const zoomLabel = this.container.querySelector('#wmZoomLevel');
        if (zoomLabel) {
            zoomLabel.textContent = `${Math.round(this.zoomLevel * 100)}%`;
        }
    }
    
    /**
     * Center view on current location
     */
    _centerOnCurrentLocation() {
        const pos = this.layout[this.currentMapId];
        if (!pos || !this.canvas) return;
        
        const { sx, sy } = this._toScreen(pos.x, pos.y);
        
        const canvasWidth = this.canvas.clientWidth;
        const canvasHeight = this.canvas.clientHeight;
        
        const scrollX = sx - canvasWidth / 2;
        const scrollY = sy - canvasHeight / 2;
        
        this.canvas.scrollLeft = Math.max(0, scrollX);
        this.canvas.scrollTop = Math.max(0, scrollY);
    }
    
    // ============================================
    // DETAIL PANEL
    // ============================================
    
    /**
     * Select a map and show detail panel
     */
    _selectMap(mapId) {
        const map = getMap(mapId);
        if (!map) return;
        
        this.selectedMapId = mapId;
        
        // Restore all nodes to default, then highlight selected
        this._restoreAllNodeStrokes();
        
        const selectedGroup = this.container.querySelector(`.wm-svg-node[data-map-id="${mapId}"]`);
        const selectedBg = selectedGroup?.querySelector('.wm-node-bg');
        if (selectedBg) {
            selectedBg.setAttribute('data-selected', 'true');
            selectedBg.setAttribute('stroke', '#FFD700');
            selectedBg.setAttribute('stroke-width', '3');
        }
        
        this._showDetailPanel(map);
    }
    
    /**
     * Show detail panel for a map
     */
    _showDetailPanel(map) {
        const isCurrent = map.id === this.currentMapId;
        const isAccessible = this._isAccessible(map.id);
        const lastPos = this.character?.getLastMapPosition?.(map.id);
        const exits = getAllMapExits(map.id);
        const npcs = getMapNPCSummary(map.id);
        const diffLabel = getDifficultyLabel(map.difficulty);
        const diffColor = getDifficultyColor(map.difficulty);
        
        const icon = THEME_ICONS[map.theme] || '🗺️';
        
        const levelRange = map.levelRange 
            ? `Lv ${map.levelRange.min}-${map.levelRange.max}` 
            : 'Safe Zone';
        
        // NPC list
        const npcHtml = npcs.length > 0 
            ? npcs.map(n => `<div class="wm-npc-item"><span>${n.name}</span><span class="wm-npc-level">${n.levelRange}</span></div>`).join('')
            : '<div class="wm-no-npcs">No hostile creatures</div>';
        
        // Exits list
        const exitsHtml = exits.length > 0
            ? exits.map(e => `<div class="wm-exit-item"><span class="wm-exit-dir">→ ${e.direction || '?'}:</span> ${e.targetMapName}</div>`).join('')
            : '<div class="wm-no-exits">Hub area</div>';
        
        // Last position
        let positionHtml = '';
        if (lastPos && !isCurrent) {
            positionHtml = `
                <div class="wm-detail-section">
                    <div class="wm-section-title">Last Position</div>
                    <div class="wm-last-position">
                        <span class="wm-pos-coords">(${lastPos.q}, ${lastPos.r})</span>
                        <label class="wm-return-checkbox">
                            <input type="checkbox" id="wmReturnToPos" checked>
                            Return to last position
                        </label>
                    </div>
                </div>
            `;
        }
        
        // Button state
        let buttonText = 'TRAVEL HERE';
        let buttonDisabled = false;
        let buttonClass = 'wm-btn-travel';
        
        if (isCurrent) {
            buttonText = 'You are here';
            buttonDisabled = true;
            buttonClass = 'wm-btn-travel disabled';
        }
        
        const content = `
            <div class="wm-detail-header">
                <span class="wm-detail-icon">${icon}</span>
                <div class="wm-detail-title-group">
                    <div class="wm-detail-title">${map.name}</div>
                    <div class="wm-detail-meta">
                        <span class="wm-detail-difficulty" style="color: ${diffColor}">${diffLabel || ''}</span>
                        <span class="wm-detail-level">${levelRange}</span>
                    </div>
                </div>
            </div>
            
            <div class="wm-detail-desc">${map.description}</div>
            
            <div class="wm-detail-buttons">
                <button class="wm-btn wm-btn-cancel" id="wmBtnCancel">Cancel</button>
                <button class="wm-btn ${buttonClass}" 
                        id="wmBtnTravel" ${buttonDisabled ? 'disabled' : ''}>
                    ${buttonText}
                </button>
            </div>
            
            ${this._buildLootDropsHtml(map)}
            
            <div class="wm-detail-section">
                <div class="wm-section-title">Creatures</div>
                <div class="wm-npc-list">${npcHtml}</div>
            </div>
            
            <div class="wm-detail-section">
                <div class="wm-section-title">Exits</div>
                <div class="wm-exits-list">${exitsHtml}</div>
            </div>
            
            ${positionHtml}
        `;
        
        const detailContent = this.container.querySelector('#wmDetailContent');
        if (detailContent) {
            detailContent.innerHTML = content;
        }
        
        // Show panel
        this.detailPanel?.classList.add('visible');
        
        // Setup button handlers
        setTimeout(() => {
            this.container.querySelector('#wmBtnCancel')?.addEventListener('click', () => {
                this._hideDetailPanel();
            });
            
            this.container.querySelector('#wmBtnTravel')?.addEventListener('click', () => {
                this._travel();
            });
            
            // Loot pill expand/collapse handlers
            this.container.querySelectorAll('.wm-loot-pill').forEach(pill => {
                pill.addEventListener('click', () => {
                    const targetId = pill.dataset.lootTarget;
                    const detail = this.container.querySelector(`#${targetId}`);
                    if (detail) {
                        const isExpanded = pill.classList.contains('expanded');
                        pill.classList.toggle('expanded', !isExpanded);
                        detail.classList.toggle('visible', !isExpanded);
                    }
                });
            });
        }, 0);
    }
    
    // ============================================
    // LOOT DROPS SECTION
    // ============================================
    
    /**
     * Build the Loot Drops section HTML for a map
     */
    _buildLootDropsHtml(map) {
        if (!map.npcs || map.npcs.length === 0) return '';
        
        const gearDetailHtml = this._buildGearLootHtml(map);
        const materialDetailHtml = this._buildMaterialLootHtml(map);
        
        if (!gearDetailHtml && !materialDetailHtml) return '';
        
        return `
            <div class="wm-detail-section">
                <div class="wm-section-title">Loot Drops</div>
                <div class="wm-loot-pills">
                    ${gearDetailHtml ? `<span class="wm-loot-pill gear" data-loot-target="wmLootGear">&#x2694;&#xFE0F; Gear <span class="wm-pill-arrow">&#x25B6;</span></span>` : ''}
                    ${materialDetailHtml ? `<span class="wm-loot-pill materials" data-loot-target="wmLootMats">&#x1F3D7;&#xFE0F; Materials <span class="wm-pill-arrow">&#x25B6;</span></span>` : ''}
                </div>
                ${gearDetailHtml ? `<div class="wm-loot-detail" id="wmLootGear">${gearDetailHtml}</div>` : ''}
                ${materialDetailHtml ? `<div class="wm-loot-detail" id="wmLootMats">${materialDetailHtml}</div>` : ''}
            </div>
        `;
    }
    
    /**
     * Build gear loot detail HTML by tracing: map NPCs -> lootTable -> itemPool -> item slot
     */
    _buildGearLootHtml(map) {
        const creatureIds = new Set();
        for (const npc of map.npcs) {
            if (npc.creatureId) creatureIds.add(npc.creatureId);
        }
        
        const allBaseIds = new Set();
        for (const cId of creatureIds) {
            const creature = getCreature(cId);
            if (!creature?.lootTable) continue;
            const table = getLootTable(creature.lootTable);
            if (table?.itemPool) {
                for (const baseId of table.itemPool) {
                    allBaseIds.add(baseId);
                }
            }
        }
        
        if (allBaseIds.size === 0) return '';
        
        const slotGroups = {};
        const materialPools = new Set();
        for (const baseId of allBaseIds) {
            const itemDef = getItem(baseId);
            if (!itemDef) continue;
            
            const slot = itemDef.slot || 'unknown';
            const groupConfig = LOOT_SLOT_GROUPS[slot];
            const groupKey = groupConfig?.merge || slot;
            const groupLabel = groupConfig?.label || slot;
            const groupOrder = groupConfig?.order ?? 99;
            
            if (!slotGroups[groupKey]) {
                slotGroups[groupKey] = { label: groupLabel, order: groupOrder, items: [] };
            }
            const name = itemDef.name || baseId;
            if (!slotGroups[groupKey].items.includes(name)) {
                slotGroups[groupKey].items.push(name);
            }
            
            if (itemDef.materialType) {
                const poolKey = MATERIAL_POOL_MAP[itemDef.materialType] || itemDef.materialType;
                materialPools.add(poolKey);
            }
        }
        
        const sortedGroups = Object.values(slotGroups).sort((a, b) => a.order - b.order);
        
        const slotHtml = sortedGroups.map(group => `
            <div class="wm-loot-slot-group">
                <div class="wm-loot-slot-label">${group.label}</div>
                <div class="wm-loot-item-list">
                    ${group.items.sort().map(name => `<span class="wm-loot-item-tag">${name}</span>`).join('')}
                </div>
            </div>
        `).join('');
        
        const poolHtml = this._buildGearMaterialPoolsHtml(materialPools, map);
        
        return slotHtml + poolHtml;
    }
    
    /**
     * Build material pools sub-section for gear detail
     */
    _buildGearMaterialPoolsHtml(pools, map) {
        if (pools.size === 0) return '';
        
        const maxLevel = map?.levelRange?.max || 999;
        const maxTier = this._getMaxGearMaterialTier(maxLevel);
        
        const sortedPools = Array.from(pools)
            .map(key => ({ key, ...(MATERIAL_POOL_LABELS[key] || { label: key, order: 99 }) }))
            .sort((a, b) => a.order - b.order);
        
        const poolRows = sortedPools.map(pool => {
            const materials = getMaterialsForType(pool.key);
            if (!materials) return '';
            
            const sorted = Object.values(materials)
                .filter(m => m.tier <= maxTier)
                .sort((a, b) => a.tier - b.tier);
            
            if (sorted.length === 0) return '';
            
            const matTags = sorted.map(m => 
                `<span class="wm-gear-mat-tag" style="color: ${m.color}">${m.name}</span>`
            ).join('<span class="wm-gear-mat-arrow">›</span>');
            
            return `
                <div class="wm-loot-slot-group">
                    <div class="wm-loot-slot-label">${pool.label}</div>
                    <div class="wm-gear-mat-chain">${matTags}</div>
                </div>
            `;
        }).join('');
        
        return `
            <div class="wm-gear-mat-divider"></div>
            <div class="wm-loot-slot-group">
                <div class="wm-loot-slot-label wm-gear-mat-header">Gear Materials</div>
            </div>
            ${poolRows}
        `;
    }
    
    /**
     * Get max gear material tier based on map's max NPC level
     */
    _getMaxGearMaterialTier(level) {
        if (level >= 75) return 6;
        if (level >= 50) return 5;
        if (level >= 30) return 4;
        if (level >= 20) return 3;
        if (level >= 10) return 2;
        return 1;
    }
    
    /**
     * Build material loot detail HTML from MaterialDropTiers + HousingMaterials
     */
    _buildMaterialLootHtml(map) {
        const maxLevel = map.levelRange?.max || 0;
        if (maxLevel <= 0) return '';
        
        const availableTiers = [];
        for (const [tierKey, tierData] of Object.entries(MaterialDropTiers)) {
            const tierNum = parseInt(tierKey.replace('tier', ''));
            if (maxLevel >= tierData.minEnemyLevel) {
                availableTiers.push(tierNum);
            }
        }
        
        if (availableTiers.length === 0) return '';
        
        const materialsByTier = {};
        for (const [matId, mat] of Object.entries(HousingMaterials)) {
            if (availableTiers.includes(mat.tier)) {
                if (!materialsByTier[mat.tier]) materialsByTier[mat.tier] = [];
                materialsByTier[mat.tier].push(mat);
            }
        }
        
        return Object.entries(materialsByTier)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([tier, mats]) => `
                <div class="wm-loot-slot-group">
                    <div class="wm-loot-slot-label">Tier ${tier}</div>
                    <div class="wm-loot-item-list">
                        ${mats.map(m => `<span class="wm-loot-mat-tag wm-mat-t${tier}">${m.icon || ''} ${m.name}</span>`).join('')}
                    </div>
                </div>
            `).join('');
    }
    
    // ============================================
    // PANEL & TRAVEL
    // ============================================
    
    /**
     * Restore all SVG node strokes to their default level color
     */
    _restoreAllNodeStrokes() {
        this.container.querySelectorAll('.wm-svg-node .wm-node-bg[data-selected]').forEach(circle => {
            const group = circle.closest('.wm-svg-node');
            const mapId = group?.dataset?.mapId;
            if (mapId) {
                const map = getMap(mapId);
                const color = map ? this._getLevelColor(map) : '#4a5568';
                const isTown = mapId === 'town';
                circle.setAttribute('stroke', color);
                circle.setAttribute('stroke-width', isTown ? '2.5' : '1.5');
            }
            circle.removeAttribute('data-selected');
        });
    }
    
    /**
     * Hide detail panel and deselect node
     */
    _hideDetailPanel() {
        this.selectedMapId = null;
        this.detailPanel?.classList.remove('visible');
        this._restoreAllNodeStrokes();
    }
    
    /**
     * Execute travel to selected map
     */
    _travel() {
        if (!this.selectedMapId) return;
        if (!this._isAccessible(this.selectedMapId)) return;
        
        const returnCheckbox = this.container.querySelector('#wmReturnToPos');
        const returnToPosition = returnCheckbox?.checked ?? false;
        
        let position = null;
        if (returnToPosition) {
            position = this.character?.getLastMapPosition?.(this.selectedMapId);
        }
        
        this.onTravel({
            mapId: this.selectedMapId,
            returnToPosition: position
        });
    }
    
    /**
     * Clean up and destroy the component
     */
    destroy() {
        if (this._keyHandler) {
            document.removeEventListener('keydown', this._keyHandler);
        }
        
        this.container.innerHTML = '';
    }
}

export default WorldMapUI;
