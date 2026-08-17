/* ============ UI :: stars.js — five-star skill meter (shared SVG) ============ */
/* A skill holds up to 25 points = five stars, each star five lit "tips". This renders that meter
   as inline SVG so it looks identical in the skill tree, a companion's kit, and the level-up roll.
   Pure string output, DOM-free. Tip geometry mirrors the approved mockup exactly:
   R=11.2/r=4.6 on a 24×24 box, tips light top-first clockwise, center pentagon fills at 5/5.
   Override the lit color per-call via the `--sc` CSS var on a wrapping element (off/def branches). */
"use strict";

import { PTS_PER_STAR, MAX_POINTS } from "../data/skills.js";

const R = 11.2, r = 4.6, cx = 12, cy = 12, D = Math.PI / 180;
const O  = k => [+(cx + R * Math.sin(k * 72 * D)).toFixed(2),        +(cy - R * Math.cos(k * 72 * D)).toFixed(2)];
const IN = k => [+(cx + r * Math.sin((k * 72 + 36) * D)).toFixed(2), +(cy - r * Math.cos((k * 72 + 36) * D)).toFixed(2)];

/* one star with `fill` (0..5) lit tips, `size` px. */
export function starSVG(fill, size = 18) {
  let tips = "";
  for (let k = 0; k < 5; k++) {
    const a = IN((k + 4) % 5), b = O(k), c = IN(k);
    tips += `<path d="M${a} L${b} L${c} Z" fill="${k < fill ? "var(--sc,#f0c877)" : "#302845"}"/>`;
  }
  const pent = "M" + [IN(0), IN(1), IN(2), IN(3), IN(4)].join(" L") + " Z";
  const outline = "M" + [O(0), IN(0), O(1), IN(1), O(2), IN(2), O(3), IN(3), O(4), IN(4)].join(" L") + " Z";
  return `<svg class="star" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">`
    + `<path d="${pent}" fill="${fill >= 5 ? "var(--sc,#f0c877)" : "#241d33"}"/>${tips}`
    + `<path d="${outline}" fill="none" stroke="#0b0912" stroke-width="1" stroke-linejoin="round"/></svg>`;
}

/* a full row of 5 stars from `pts` (0..25). `cls` extra classes on the wrapper. */
export function starsHtml(pts, size = 18, cls = "") {
  const p = Math.max(0, Math.min(MAX_POINTS, pts | 0));
  let s = "";
  for (let i = 0; i < 5; i++) s += starSVG(Math.max(0, Math.min(PTS_PER_STAR, p - i * PTS_PER_STAR)) , size);
  return `<span class="stars ${cls}">${s}</span>`;
}

/* compact "3.4★" label from points. */
export const starLabel = pts => (Math.max(0, Math.min(MAX_POINTS, pts | 0)) / PTS_PER_STAR).toFixed(1) + "★";
