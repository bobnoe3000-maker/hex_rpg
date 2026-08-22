/* ============ UI :: FloorMap.js — Fogbound Floor traversal (dungeon 1 playtest) ============ */
/* An ALTERNATE, opt-in traversal for The Shaded Foothills: instead of a linear 1→7 room chain, the
   party roams an interconnected floor with two optional side-rooms, unveiled by fog of war. Each node
   maps to one of the seven shared room LAYOUTS, so combat is completely unchanged — only navigation
   is new. Pure/DOM-free render helpers; game.js owns the state and wires travel. */
"use strict";

/* nodes: {name, x,y (map coords), layout (index into data/dungeons LAYOUTS → room shape + comp + level
   offset), kind}. edges connect them. `start` is where a fresh floor begins. */
export const FLOOR = {
  start: "n0",
  nodes: {
    n0: { name: "The Threshold", x: 150, y: 392, layout: 0, kind: "start" },
    n1: { name: "The Gallery",   x: 150, y: 318, layout: 1, kind: "fight" },
    n2: { name: "The Warren",    x: 58,  y: 318, layout: 0, kind: "treasure" },
    n3: { name: "The Causeway",  x: 150, y: 244, layout: 2, kind: "fight" },
    n4: { name: "The Hollow",    x: 150, y: 170, layout: 3, kind: "fight" },
    n5: { name: "The Vault",     x: 244, y: 170, layout: 4, kind: "treasure" },
    n6: { name: "The Approach",  x: 150, y: 96,  layout: 5, kind: "fight" },
    n7: { name: "Inner Sanctum", x: 150, y: 26,  layout: 6, kind: "boss" },
  },
  edges: [["n0","n1"],["n1","n2"],["n1","n3"],["n3","n4"],["n4","n5"],["n4","n6"],["n6","n7"]],
};

const _NB = {};
for (const id in FLOOR.nodes) _NB[id] = [];
for (const [a, b] of FLOOR.edges) { _NB[a].push(b); _NB[b].push(a); }
export const floorNeighbors = id => _NB[id] || [];

/* sensed = discovered-but-unentered: neighbours of any visited node that aren't visited themselves. */
export function floorSensed(visited) {
  const v = new Set(visited), s = new Set();
  for (const id of v) for (const n of floorNeighbors(id)) if (!v.has(n)) s.add(n);
  return s;
}
/* where you may travel: any visited node (backtrack) or any sensed frontier node (push on / detour). */
export function floorReachable(visited) {
  const set = new Set(visited);
  for (const n of floorSensed(visited)) set.add(n);
  return set;
}
export function floorStateOf(id, cur, visited, sensed) {
  return id === cur ? "current" : new Set(visited).has(id) ? "explored" : sensed.has(id) ? "sensed" : "hidden";
}

const KIND_FILL = { start: "#4a5a2e", fight: "#3f5030", treasure: "#7a5a1e", boss: "#5a2420" };
const GLYPH = {
  chest: '<path d="M-6 -1h12v6h-12z M-6 1h12 M0 -1v3" transform="scale(1)"/><path d="M-6 -1a6 3 0 0112 0" />',
  skull: '<path d="M-5 -1a5 5 0 0110 0v2l-1 1v2h-8v-2l-1-1z"/><circle cx="-2" cy="0" r="1.1" fill="currentColor"/><circle cx="2" cy="0" r="1.1" fill="currentColor"/>',
  arch:  '<path d="M-5 6V0a5 5 0 0110 0v6"/>',
};

/* renderFloorMap(floor, {expanded}) → SVG string. `floor` = {cur, visited:[]}.
   expanded=true draws labels and marks reachable nodes tappable (data-fnode). */
export function renderFloorMap(floor, { expanded = false } = {}) {
  const cur = floor.cur, visited = floor.visited || [];
  const sensed = floorSensed(visited), reach = floorReachable(visited);
  const V = new Set(visited);
  let edges = "", nodes = "";
  for (const [a, b] of FLOOR.edges) {
    const A = FLOOR.nodes[a], B = FLOOR.nodes[b];
    const va = V.has(a) || sensed.has(a), vb = V.has(b) || sensed.has(b);
    if (!(va && vb)) continue;
    const solid = V.has(a) && V.has(b);
    edges += `<line x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}" stroke="${solid ? "#5a6a42" : "#3a3352"}" stroke-width="${solid ? 3 : 2}" ${solid ? "" : 'stroke-dasharray="3 3"'} stroke-linecap="round"/>`;
  }
  for (const id in FLOOR.nodes) {
    const n = FLOOR.nodes[id], st = floorStateOf(id, cur, visited, sensed);
    if (st === "hidden") continue;
    const rad = n.kind === "boss" ? 18 : n.kind === "treasure" ? 13 : 14;
    const tappable = expanded && reach.has(id) && id !== cur;
    if (st === "sensed") {
      nodes += `<g ${tappable ? `class="fnode" data-fnode="${id}"` : ""}>
        ${tappable ? `<circle cx="${n.x}" cy="${n.y}" r="${rad + 6}" fill="none" stroke="#d8a24a" stroke-width="1.4" stroke-dasharray="2 3" opacity=".85"/>` : ""}
        <circle cx="${n.x}" cy="${n.y}" r="${rad}" fill="rgba(24,20,42,.85)" stroke="rgba(150,138,190,.55)" stroke-width="1.4" stroke-dasharray="3 3"/>
        <text x="${n.x}" y="${n.y + 4}" text-anchor="middle" font-family="Georgia,serif" font-size="13" fill="rgba(160,148,200,.75)">?</text>
        ${expanded ? `<text x="${n.x}" y="${n.y + rad + 12}" text-anchor="middle" font-family="ui-monospace,monospace" font-size="8" fill="#6f6486">? ? ?</text>` : ""}</g>`;
      continue;
    }
    const fill = KIND_FILL[n.kind] || "#3f5030";
    const ring = st === "current" ? "#f0c877" : "rgba(0,0,0,.55)";
    nodes += `<g ${tappable ? `class="fnode" data-fnode="${id}"` : ""}>
      <circle cx="${n.x}" cy="${n.y}" r="${rad}" fill="${fill}" stroke="${ring}" stroke-width="${st === "current" ? 2.6 : 1.4}"/>
      ${n.kind === "treasure" ? `<g transform="translate(${n.x} ${n.y})" fill="none" stroke="#f0c877" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${GLYPH.chest}</g>` : ""}
      ${n.kind === "boss" ? `<g transform="translate(${n.x} ${n.y - 1})" fill="none" stroke="#ff9a8a" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${GLYPH.skull}</g>` : ""}
      ${n.kind === "start" ? `<g transform="translate(${n.x} ${n.y - 1})" fill="none" stroke="#cbe0a8" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${GLYPH.arch}</g>` : ""}
      ${st === "current" ? `<circle cx="${n.x}" cy="${n.y}" r="${rad + 4}" fill="none" stroke="#f0c877" stroke-width="1.4"><animate attributeName="opacity" values="1;.25;1" dur="1.6s" repeatCount="indefinite"/></circle>` : ""}
      ${expanded ? `<text x="${n.x}" y="${n.y + rad + 12}" text-anchor="middle" font-family="Georgia,serif" font-size="10" fill="${st === "current" ? "#fff" : "#c9bfe0"}">${n.name}</text>` : ""}</g>`;
  }
  // fit the viewBox to what's discovered (visited + sensed) so the map zooms to the explored region
  // and grows as you push on, rather than floating in a mostly-empty full-floor frame.
  const shown = [...V, ...sensed].map(id => FLOOR.nodes[id]).filter(Boolean);
  let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
  for (const n of shown) { minx = Math.min(minx, n.x); maxx = Math.max(maxx, n.x); miny = Math.min(miny, n.y); maxy = Math.max(maxy, n.y); }
  const padX = 34, padT = 30, padB = expanded ? 40 : 30, minW = 150, minH = 170;
  let vx = minx - padX, vy = miny - padT, vw = (maxx - minx) + padX * 2, vh = (maxy - miny) + padT + padB;
  if (vw < minW) { vx -= (minW - vw) / 2; vw = minW; }
  if (vh < minH) { vy -= (minH - vh) / 2; vh = minH; }
  const vb = `${vx.toFixed(0)} ${vy.toFixed(0)} ${vw.toFixed(0)} ${vh.toFixed(0)}`;
  return `<svg viewBox="${vb}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Floor map">${edges}${nodes}</svg>`;
}

/* progress label like "3 / 8 rooms" */
export const floorProgress = visited => `${new Set(visited).size} / ${Object.keys(FLOOR.nodes).length}`;
