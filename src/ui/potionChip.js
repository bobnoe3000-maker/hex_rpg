/* ============ UI :: potionChip.js — the on-tile potion box ============ */
/* A little box that rides below a hero's portrait: the flask (tinted the brew's colour), a charge
   badge, and a circular recharge RING that fills as the potion's cooldown ticks down (driven live
   by the game loop via setPotRing), plus a flare on quaff (flashPotBox). Pure markup helpers. */
"use strict";

import { POTION_BY_ID, potionName } from "../data/potions.js";

/* an SVG bottle tinted `color`, sized `px`. Lighter top = glass, solid lower = liquid. */
export function flaskSvg(color, px) {
  return `<svg viewBox="0 0 32 32" width="${px}" height="${px}" class="fl" style="display:block">
    <rect x="13.3" y="4.4" width="5.4" height="6.2" rx="1" fill="#2a2340" stroke="#4a3d68" stroke-width=".8"/>
    <rect x="11.7" y="2.8" width="8.6" height="2.7" rx="1.3" fill="#c98f4a"/>
    <circle cx="16" cy="20" r="9.4" fill="${color}" stroke="#0d0916" stroke-width="1.3"/>
    <path d="M6.9 16.5a9.4 9.4 0 0 0 18.2 0 9.4 9.4 0 0 1-18.2 0Z" fill="#ffffff" opacity=".16"/>
    <ellipse cx="12.7" cy="16.2" rx="2.3" ry="1.5" fill="#fff" opacity=".4"/>
  </svg>`;
}

/* recharge ring geometry (box is 34px; ring r=14). fg dashoffset 0 = full/ready. */
const RING_R = 14, RING_C = 2 * Math.PI * RING_R;
function ringSvg(color) {
  return `<svg class="potring" viewBox="0 0 34 34"><circle class="rbg" cx="17" cy="17" r="${RING_R}"/>
    <circle class="rfg" cx="17" cy="17" r="${RING_R}" stroke="${color}" stroke-linecap="round" stroke-dasharray="${RING_C}" stroke-dashoffset="0"/></svg>`;
}
/* set the recharge ring: frac 0 (empty, just used) → 1 (full, ready). */
export function setPotRing(boxEl, frac) {
  const fg = boxEl && boxEl.querySelector(".potring .rfg");
  if (fg) fg.style.strokeDashoffset = RING_C * (1 - Math.max(0, Math.min(1, frac)));
}
/* flare the box in the potion's colour (called on a quaff). */
export function flashPotBox(boxEl, color) {
  const f = boxEl && boxEl.querySelector(".potflash"); if (!f) return;
  boxEl.style.setProperty("--pc", color);
  f.classList.remove("go"); void f.offsetWidth; f.classList.add("go");
}

let cssDone = false;
export function ensurePotChipCss() {
  if (cssDone || typeof document === "undefined") return; cssDone = true;
  const s = document.createElement("style"); s.id = "potchip-style";
  s.textContent = `
  .potbox{position:relative;width:34px;height:34px;margin:4px auto 0;border-radius:8px;border:1px solid #4a3d68;
    background:linear-gradient(#191125,#120c1e);display:grid;place-items:center;box-shadow:inset 0 0 6px -3px #000}
  .potbox .fl{position:relative;z-index:2;width:20px;height:20px}
  .potbox.ready .fl{animation:potbreathe 2.2s ease-in-out infinite}
  @keyframes potbreathe{0%,100%{filter:drop-shadow(0 0 0 transparent)}50%{filter:drop-shadow(0 0 4px var(--pc))}}
  .potbox.cooling .fl{opacity:.42;filter:grayscale(.5)}
  .potbox.empty{opacity:.4;border-color:#322a46}
  .potbox.empty .fl{opacity:.5}
  .potbox .plus{position:absolute;inset:0;display:grid;place-items:center;color:#6d6390;font:bold 15px system-ui;z-index:3}
  .potring{position:absolute;inset:0;transform:rotate(-90deg);z-index:1}
  .potring circle{fill:none;stroke-width:3}
  .potring .rbg{stroke:#241a34}
  .potring .rfg{transition:stroke-dashoffset .12s linear}
  .potn{position:absolute;right:-4px;bottom:-4px;min-width:13px;height:13px;border-radius:7px;background:#1a1226;border:1px solid #4a3d68;z-index:4;
    font:bold 8px ui-monospace,monospace;color:#efe7ff;display:flex;align-items:center;justify-content:center;padding:0 2px;line-height:1}
  .potcd{position:absolute;left:50%;bottom:-11px;transform:translateX(-50%);font:8px ui-monospace,monospace;color:#9a8fb8;z-index:4;white-space:nowrap}
  .potflash{position:absolute;inset:0;border-radius:8px;background:radial-gradient(circle,var(--pc),transparent 70%);opacity:0;z-index:5;pointer-events:none}
  .potflash.go{animation:potflash .5s ease-out}
  @keyframes potflash{0%{opacity:.85;transform:scale(1)}100%{opacity:0;transform:scale(1.5)}}
  `;
  document.head.appendChild(s);
}

/* the below-portrait box for a hero's equipped potion (ready state; the loop drives the ring live). */
export function potionTileChip(potion) {
  if (potion && potion.qty > 0) {
    const p = POTION_BY_ID[potion.type]; if (!p) return "";
    return `<div class="potbox ready" style="--pc:${p.color}" title="${potionName(potion.type, potion.size)} · ${potion.qty} left">
      ${ringSvg(p.color)}${flaskSvg(p.color, 20)}<span class="potn">${potion.qty}</span><span class="potcd"></span>
      <span class="potflash"></span></div>`;
  }
  return `<div class="potbox empty" title="No potion equipped">${flaskSvg("#3a3450", 20)}<span class="plus">＋</span></div>`;
}
