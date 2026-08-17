/* ============ UI :: potionChip.js — the flask icon + belt chip ============ */
/* A small inline-SVG flask (no gradient ids → safe to render many), plus the tile chip that rides
   below a hero's portrait showing their equipped potion + charge count. Pure markup helpers. */
"use strict";

import { POTION_BY_ID, potionName } from "../data/potions.js";

/* an SVG bottle tinted `color`, sized `px`. Lighter top = glass, solid lower = liquid. */
export function flaskSvg(color, px) {
  return `<svg viewBox="0 0 32 32" width="${px}" height="${px}" style="display:block">
    <rect x="13.3" y="4.4" width="5.4" height="6.2" rx="1" fill="#2a2340" stroke="#4a3d68" stroke-width=".8"/>
    <rect x="11.7" y="2.8" width="8.6" height="2.7" rx="1.3" fill="#c98f4a"/>
    <circle cx="16" cy="20" r="9.4" fill="${color}" stroke="#0d0916" stroke-width="1.3"/>
    <path d="M6.9 16.5a9.4 9.4 0 0 0 18.2 0 9.4 9.4 0 0 1-18.2 0Z" fill="#ffffff" opacity=".16"/>
    <ellipse cx="12.7" cy="16.2" rx="2.3" ry="1.5" fill="#fff" opacity=".4"/>
  </svg>`;
}

let cssDone = false;
export function ensurePotChipCss() {
  if (cssDone || typeof document === "undefined") return; cssDone = true;
  const s = document.createElement("style"); s.id = "potchip-style";
  s.textContent = `
  .potchip{position:relative;width:22px;height:26px;margin:3px auto 0;display:flex;justify-content:center;align-items:flex-start}
  .potchip .potn{position:absolute;right:-5px;bottom:-1px;font:bold 8px ui-monospace,monospace;color:#efe7ff;
    background:#1a1226;border:1px solid #4a3d68;border-radius:6px;padding:0 2.5px;line-height:1.35}
  .potchip.empty{opacity:.32}
  `;
  document.head.appendChild(s);
}

/* the below-portrait chip for a hero's equipped potion (empty = faint bottle). */
export function potionTileChip(potion) {
  if (potion && potion.qty > 0) {
    const p = POTION_BY_ID[potion.type]; if (!p) return "";
    return `<div class="potchip" title="${potionName(potion.type, potion.size)} · ${potion.qty} left">${flaskSvg(p.color, 20)}<span class="potn">${potion.qty}</span></div>`;
  }
  return `<div class="potchip empty" title="No potion equipped">${flaskSvg("#3a3450", 20)}</div>`;
}
