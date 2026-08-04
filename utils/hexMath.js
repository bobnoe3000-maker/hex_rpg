// Hex Math Utilities - Coordinate calculations for flat-topped hex grids
// Uses odd-q offset coordinate system

/**
 * Hex geometry for flat-topped hexagons
 * 
 * Flat-topped hex layout:
 *     ____
 *    /    \
 *   /      \
 *   \      /
 *    \____/
 * 
 * Width = 2 * radius
 * Height = sqrt(3) * radius
 * 
 * Odd-q offset coordinates: odd columns are shifted down by half a hex
 */

// Calculate hex dimensions from radius
export function getHexDimensions(radius) {
    const width = 2 * radius;
    const height = Math.sqrt(3) * radius;
    const horizSpacing = 1.5 * radius;  // Horizontal distance between hex centers
    const vertSpacing = height;          // Vertical distance between hex centers
    
    return { width, height, horizSpacing, vertSpacing, radius };
}

// Get pixel center of a hex from its q,r coordinates
export function hexToPixel(q, r, radius) {
    const { height, horizSpacing, vertSpacing } = getHexDimensions(radius);
    
    const x = radius + q * horizSpacing;
    const y = height / 2 + r * vertSpacing + (q % 2 === 1 ? vertSpacing / 2 : 0);
    
    return { x, y };
}

// Get hex coordinates from pixel position - proper algorithm for flat-topped hexes
export function pixelToHex(x, y, radius) {
    const { height, horizSpacing, vertSpacing } = getHexDimensions(radius);
    
    // Get approximate q
    const qFloat = (x - radius) / horizSpacing;
    const q = Math.round(qFloat);
    
    // Adjust y for odd column offset
    const offsetY = (q % 2 === 1) ? vertSpacing / 2 : 0;
    const rFloat = (y - height / 2 - offsetY) / vertSpacing;
    const r = Math.round(rFloat);
    
    // Now check this hex and neighbors to find the closest center
    // This handles edge cases where simple rounding picks wrong hex
    const candidates = [
        { q, r },
        { q: q - 1, r: r },
        { q: q + 1, r: r },
        { q, r: r - 1 },
        { q, r: r + 1 },
        { q: q - 1, r: q % 2 === 0 ? r - 1 : r + 1 },
        { q: q + 1, r: q % 2 === 0 ? r - 1 : r + 1 }
    ];
    
    let closest = { q, r };
    let closestDist = Infinity;
    
    for (const candidate of candidates) {
        const center = hexToPixel(candidate.q, candidate.r, radius);
        const dx = x - center.x;
        const dy = y - center.y;
        const dist = dx * dx + dy * dy;
        
        if (dist < closestDist) {
            closestDist = dist;
            closest = candidate;
        }
    }
    
    return closest;
}

// Get the 6 corner points of a hex centered at (cx, cy)
export function getHexCorners(cx, cy, radius) {
    const { height } = getHexDimensions(radius);
    
    return [
        { x: cx + radius, y: cy },                    // Right
        { x: cx + radius / 2, y: cy + height / 2 },   // Bottom-right
        { x: cx - radius / 2, y: cy + height / 2 },   // Bottom-left
        { x: cx - radius, y: cy },                    // Left
        { x: cx - radius / 2, y: cy - height / 2 },   // Top-left
        { x: cx + radius / 2, y: cy - height / 2 }    // Top-right
    ];
}

// Convert corners to SVG polygon points string
export function hexPointsString(cx, cy, radius) {
    const corners = getHexCorners(cx, cy, radius);
    return corners.map(p => `${p.x},${p.y}`).join(' ');
}

// Get neighboring hex coordinates (6 directions for flat-topped)
// Directions: E, SE, SW, W, NW, NE
export function getNeighbors(q, r) {
    const isOddCol = q % 2 === 1;
    
    if (isOddCol) {
        return [
            { q: q + 1, r: r },     // E
            { q: q + 1, r: r + 1 }, // SE
            { q: q - 1, r: r + 1 }, // SW
            { q: q - 1, r: r },     // W
            { q: q - 1, r: r },     // NW (same as W for odd-q)
            { q: q + 1, r: r }      // NE (same as E for odd-q)
        ];
    } else {
        return [
            { q: q + 1, r: r },     // E
            { q: q + 1, r: r + 1 }, // SE
            { q: q - 1, r: r + 1 }, // SW
            { q: q - 1, r: r },     // W
            { q: q - 1, r: r - 1 }, // NW
            { q: q + 1, r: r - 1 }  // NE
        ];
    }
}

// Correct neighbor calculation for flat-topped odd-q offset
export function getHexNeighbors(q, r) {
    const isOddCol = q % 2 === 1;
    
    // Flat-topped hex neighbors in odd-q offset
    const evenColNeighbors = [
        { dq: +1, dr: -1 }, // NE
        { dq: +1, dr: 0 },  // E (SE in some systems)
        { dq: 0, dr: +1 },  // SE (S in some systems)
        { dq: -1, dr: 0 },  // SW (W in some systems)
        { dq: -1, dr: -1 }, // NW
        { dq: 0, dr: -1 }   // N
    ];
    
    const oddColNeighbors = [
        { dq: +1, dr: 0 },  // NE
        { dq: +1, dr: +1 }, // E (SE)
        { dq: 0, dr: +1 },  // SE (S)
        { dq: -1, dr: +1 }, // SW
        { dq: -1, dr: 0 },  // NW (W)
        { dq: 0, dr: -1 }   // N
    ];
    
    const offsets = isOddCol ? oddColNeighbors : evenColNeighbors;
    
    return offsets.map(offset => ({
        q: q + offset.dq,
        r: r + offset.dr
    }));
}

// Calculate distance between two hexes (in hex steps)
export function hexDistance(q1, r1, q2, r2) {
    // Convert to cube coordinates for distance calculation
    const cube1 = offsetToCube(q1, r1);
    const cube2 = offsetToCube(q2, r2);
    
    return Math.max(
        Math.abs(cube1.x - cube2.x),
        Math.abs(cube1.y - cube2.y),
        Math.abs(cube1.z - cube2.z)
    );
}

// Convert odd-q offset to cube coordinates
export function offsetToCube(q, r) {
    const x = q;
    const z = r - (q - (q & 1)) / 2;
    const y = -x - z;
    return { x, y, z };
}

// Convert cube to odd-q offset coordinates
export function cubeToOffset(x, y, z) {
    const q = x;
    const r = z + (x - (x & 1)) / 2;
    return { q, r };
}

// Check if coordinates are within grid bounds
export function isInBounds(q, r, gridWidth, gridHeight) {
    return q >= 0 && q < gridWidth && r >= 0 && r < gridHeight;
}

// Get all hexes within a radius of a center hex
export function getHexesInRange(centerQ, centerR, range, gridWidth, gridHeight) {
    const hexes = [];
    
    for (let q = 0; q < gridWidth; q++) {
        for (let r = 0; r < gridHeight; r++) {
            if (hexDistance(centerQ, centerR, q, r) <= range) {
                hexes.push({ q, r });
            }
        }
    }
    
    return hexes;
}

// Get hexes in a line between two points (for ranged attacks, line of sight)
export function getHexLine(q1, r1, q2, r2) {
    const distance = hexDistance(q1, r1, q2, r2);
    const results = [];
    
    if (distance === 0) {
        return [{ q: q1, r: r1 }];
    }
    
    // Convert to cube coordinates
    const cube1 = offsetToCube(q1, r1);
    const cube2 = offsetToCube(q2, r2);
    
    for (let i = 0; i <= distance; i++) {
        const t = i / distance;
        
        // Linear interpolation in cube space
        const x = Math.round(cube1.x + (cube2.x - cube1.x) * t);
        const y = Math.round(cube1.y + (cube2.y - cube1.y) * t);
        const z = Math.round(cube1.z + (cube2.z - cube1.z) * t);
        
        // Convert back to offset
        const offset = cubeToOffset(x, y, z);
        results.push(offset);
    }
    
    return results;
}

// A* pathfinding for hex grid
export function findPath(startQ, startR, endQ, endR, gridWidth, gridHeight, isBlocked) {
    // If start or end is blocked, no path
    if (isBlocked(startQ, startR) || isBlocked(endQ, endR)) {
        return null;
    }
    
    // If same position, return empty path
    if (startQ === endQ && startR === endR) {
        return [];
    }
    
    const openSet = [{ q: startQ, r: startR, g: 0, h: hexDistance(startQ, startR, endQ, endR), f: 0 }];
    openSet[0].f = openSet[0].g + openSet[0].h;
    
    const closedSet = new Set();
    const cameFrom = new Map();
    const gScore = new Map();
    gScore.set(`${startQ},${startR}`, 0);
    
    while (openSet.length > 0) {
        // Get node with lowest f score
        openSet.sort((a, b) => a.f - b.f);
        const current = openSet.shift();
        const currentKey = `${current.q},${current.r}`;
        
        // Reached goal
        if (current.q === endQ && current.r === endR) {
            const path = [];
            let key = currentKey;
            while (cameFrom.has(key)) {
                const [q, r] = key.split(',').map(Number);
                path.unshift({ q, r });
                key = cameFrom.get(key);
            }
            return path;
        }
        
        closedSet.add(currentKey);
        
        // Check neighbors
        const neighbors = getHexNeighbors(current.q, current.r);
        
        for (const neighbor of neighbors) {
            const neighborKey = `${neighbor.q},${neighbor.r}`;
            
            // Skip if out of bounds, blocked, or already evaluated
            if (!isInBounds(neighbor.q, neighbor.r, gridWidth, gridHeight)) continue;
            if (isBlocked(neighbor.q, neighbor.r)) continue;
            if (closedSet.has(neighborKey)) continue;
            
            const tentativeG = gScore.get(currentKey) + 1;
            
            const existingG = gScore.get(neighborKey);
            if (existingG !== undefined && tentativeG >= existingG) continue;
            
            // This is a better path
            cameFrom.set(neighborKey, currentKey);
            gScore.set(neighborKey, tentativeG);
            
            const h = hexDistance(neighbor.q, neighbor.r, endQ, endR);
            const f = tentativeG + h;
            
            // Add to open set if not already there
            const existingIndex = openSet.findIndex(n => n.q === neighbor.q && n.r === neighbor.r);
            if (existingIndex === -1) {
                openSet.push({ q: neighbor.q, r: neighbor.r, g: tentativeG, h, f });
            } else {
                openSet[existingIndex] = { q: neighbor.q, r: neighbor.r, g: tentativeG, h, f };
            }
        }
    }
    
    // No path found
    return null;
}

// Calculate grid dimensions needed for a given number of hexes
export function calculateGridPixelSize(gridWidth, gridHeight, radius) {
    const { horizSpacing, vertSpacing } = getHexDimensions(radius);
    
    const width = radius + (gridWidth - 1) * horizSpacing + radius;
    const height = vertSpacing / 2 + (gridHeight - 1) * vertSpacing + vertSpacing;
    
    return { width, height };
}

export default {
    getHexDimensions,
    hexToPixel,
    pixelToHex,
    getHexCorners,
    hexPointsString,
    getHexNeighbors,
    hexDistance,
    offsetToCube,
    cubeToOffset,
    isInBounds,
    getHexesInRange,
    getHexLine,
    findPath,
    calculateGridPixelSize
};
