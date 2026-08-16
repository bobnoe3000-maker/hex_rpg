/* ============ ENGINE :: icons.js — procedural ink-style UI icons ============ */
/* Small hand-inked glyphs that replace emoji across the UI, matching the game's art style.
   Each icon is drawn once into a cached canvas; iconImg() returns an <img> data-URL for
   use inside HTML templates. Drawing space is 24×24, scaled to the requested size. */
"use strict";

import { inkPath, ell, shade } from "./core.js";

const INK = "rgba(12,9,18,.9)";
const GOLD = "#d8a24a", GOLDH = "#f0c877", SILVER = "#c7c2b4", GEM = "#79c7e6";
const PARCH = "#e8dcc4", BONE = "#e9e2cf";

function line(g, pts, w, col) {
  g.strokeStyle = col; g.lineWidth = w; g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.stroke();
}
function poly(g, pts, fill) { g.fillStyle = fill; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); g.fill(); }
function inkPoly(g, pts, w = 1.4) { inkPath(g, gg => { gg.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) gg.lineTo(pts[i][0], pts[i][1]); gg.closePath(); }, w, INK); }

const DRAW = {
  dot(g) { ell(g, 12, 12, 5, 5, GOLD); inkPath(g, gg => gg.ellipse(12, 12, 5, 5, 0, 0, 7), 1.4, INK); },
  coin(g) {
    ell(g, 12, 12, 8.5, 8.5, SILVER); ell(g, 12, 12, 8.5, 8.5, shade(SILVER, .82));
    ell(g, 12, 11, 8, 8, SILVER); inkPath(g, gg => gg.ellipse(12, 12, 8.4, 8.4, 0, 0, 7), 1.5, INK);
    inkPath(g, gg => gg.ellipse(12, 12, 5.4, 5.4, 0, 0, 7), 1, "rgba(12,9,18,.5)");
    line(g, [[10, 12], [14, 12]], 1.4, shade(SILVER, .6)); line(g, [[12, 10], [12, 14]], 1.4, shade(SILVER, .6));
  },
  gem(g) {
    const p = [[12, 3], [19, 10], [12, 21], [5, 10]]; poly(g, p, GEM);
    poly(g, [[12, 3], [19, 10], [12, 12]], shade(GEM, 1.25)); poly(g, [[12, 3], [5, 10], [12, 12]], shade(GEM, .82));
    inkPoly(g, p, 1.5); line(g, [[5, 10], [19, 10]], 1, "rgba(12,9,18,.45)"); line(g, [[12, 12], [12, 21]], 1, "rgba(12,9,18,.35)");
  },
  sword(g) {
    poly(g, [[12, 2], [14, 6], [13.2, 15], [12, 17], [10.8, 15], [10, 6]], shade(SILVER, 1.05));
    inkPoly(g, [[12, 2], [14, 6], [13.2, 15], [12, 17], [10.8, 15], [10, 6]], 1.4);
    line(g, [[7, 16], [17, 16]], 2.6, GOLD); inkPath(g, gg => { gg.moveTo(7, 16); gg.lineTo(17, 16); }, 1.4, INK);
    line(g, [[12, 17], [12, 21]], 2.4, shade(GOLD, .7)); ell(g, 12, 22, 1.6, 1.6, GOLDH);
  },
  cross(g) { // cleric plus
    poly(g, [[10, 3], [14, 3], [14, 10], [21, 10], [21, 14], [14, 14], [14, 21], [10, 21], [10, 14], [3, 14], [3, 10], [10, 10]], GOLD);
    inkPoly(g, [[10, 3], [14, 3], [14, 10], [21, 10], [21, 14], [14, 14], [14, 21], [10, 21], [10, 14], [3, 14], [3, 10], [10, 10]], 1.4);
  },
  star(g) { // 5-point
    const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 4 : 9.5;
      pts.push([12 + Math.cos(a) * r, 12 + Math.sin(a) * r]); } poly(g, pts, GOLDH); inkPoly(g, pts, 1.3);
  },
  spark(g) { // 4-point sparkle
    poly(g, [[12, 2], [14, 10], [22, 12], [14, 14], [12, 22], [10, 14], [2, 12], [10, 10]], GOLDH);
    inkPoly(g, [[12, 2], [14, 10], [22, 12], [14, 14], [12, 22], [10, 14], [2, 12], [10, 10]], 1.2);
  },
  tankard(g) { // tavern
    g.fillStyle = shade(GOLD, .55); g.beginPath(); g.rect(6, 8, 9, 12); g.fill();
    poly(g, [[6, 8], [15, 8], [15, 10], [6, 10]], BONE); // foam
    inkPath(g, gg => gg.rect(6, 8, 9, 12), 1.5); line(g, [[15, 11], [19, 12], [19, 16], [15, 17]], 1.6, INK);
    line(g, [[8, 12], [8, 18]], 1, "rgba(12,9,18,.4)"); line(g, [[11, 12], [11, 18]], 1, "rgba(12,9,18,.4)");
  },
  pouch(g) { // shop / coin bag
    g.fillStyle = shade(GOLD, .5); g.beginPath(); g.moveTo(6, 12); g.quadraticCurveTo(6, 21, 12, 21);
    g.quadraticCurveTo(18, 21, 18, 12); g.quadraticCurveTo(18, 9, 12, 9); g.quadraticCurveTo(6, 9, 6, 12); g.fill();
    inkPath(g, gg => { gg.moveTo(6, 12); gg.quadraticCurveTo(6, 21, 12, 21); gg.quadraticCurveTo(18, 21, 18, 12);
      gg.quadraticCurveTo(18, 9, 12, 9); gg.quadraticCurveTo(6, 9, 6, 12); }, 1.5);
    line(g, [[8, 9], [10, 5], [14, 5], [16, 9]], 1.6, INK); ell(g, 12, 14, 2.4, 2.4, GOLDH);
  },
  vault(g) { // bank chest
    g.fillStyle = shade(GOLD, .5); g.beginPath(); g.rect(4, 10, 16, 10); g.fill();
    poly(g, [[4, 10], [12, 5], [20, 10]], shade(GOLD, .68)); inkPath(g, gg => { gg.rect(4, 10, 16, 10);
      gg.moveTo(4, 10); gg.lineTo(12, 5); gg.lineTo(20, 10); }, 1.5); ell(g, 12, 14, 1.6, 1.6, GOLDH);
    line(g, [[12, 15], [12, 18]], 1.4, INK);
  },
  anvil(g) { // forge
    poly(g, [[4, 9], [20, 9], [18, 12], [14, 13], [14, 15], [16, 15], [16, 17], [8, 17], [8, 15], [10, 15], [10, 12], [4, 11]], shade(SILVER, .78));
    inkPoly(g, [[4, 9], [20, 9], [18, 12], [14, 13], [14, 15], [16, 15], [16, 17], [8, 17], [8, 15], [10, 15], [10, 12], [4, 11]], 1.4);
  },
  hammer(g) { // forge action
    g.save(); g.translate(12, 12); g.rotate(-0.5);
    g.fillStyle = shade(SILVER, .8); g.fillRect(-8, -8, 12, 6);
    inkPath(g, gg => gg.rect(-8, -8, 12, 6), 1.4); line(g, [[-2, -2], [2, 9]], 2.4, GOLD);
    inkPath(g, gg => { gg.moveTo(-2, -2); gg.lineTo(2, 9); }, 1.2, INK); g.restore();
  },
  house(g) { // keep / home
    g.fillStyle = shade(GOLD, .45); g.fillRect(6, 11, 12, 9);
    poly(g, [[4, 11], [12, 4], [20, 11]], shade(GOLD, .62));
    inkPath(g, gg => { gg.rect(6, 11, 12, 9); gg.moveTo(4, 11); gg.lineTo(12, 4); gg.lineTo(20, 11); }, 1.5);
    g.fillStyle = INK; g.fillRect(10.5, 14, 3, 6);
  },
  dice(g) {
    g.fillStyle = BONE; g.beginPath(); g.roundRect ? g.roundRect(5, 5, 14, 14, 3) : g.rect(5, 5, 14, 14); g.fill();
    inkPath(g, gg => { gg.rect(5, 5, 14, 14); }, 1.5);
    for (const [x, y] of [[9, 9], [15, 9], [12, 12], [9, 15], [15, 15]]) ell(g, x, y, 1.4, 1.4, INK);
  },
  brush(g) { // roll portrait
    line(g, [[15, 4], [9, 14]], 2.2, GOLD); inkPath(g, gg => { gg.moveTo(15, 4); gg.lineTo(9, 14); }, 1.1, INK);
    poly(g, [[7, 13], [11, 15], [8, 21], [5, 18]], shade(GEM, .95)); inkPoly(g, [[7, 13], [11, 15], [8, 21], [5, 18]], 1.3);
  },
  refresh(g) {
    g.strokeStyle = GOLD; g.lineWidth = 2; g.beginPath(); g.arc(12, 12, 7, 0.5, 5.6); g.stroke();
    poly(g, [[18, 7], [19, 12], [14.5, 10]], GOLDH); inkPath(g, gg => gg.arc(12, 12, 7, 0.5, 5.6), 1, INK);
  },
  skull(g) {
    g.fillStyle = BONE; g.beginPath(); g.arc(12, 10, 7, Math.PI, 0); g.rect(5, 10, 14, 5); g.fill();
    poly(g, [[9, 16], [15, 16], [14, 20], [10, 20]], BONE);
    inkPath(g, gg => { gg.arc(12, 10, 7, Math.PI, 0); gg.moveTo(5, 10); gg.lineTo(5, 15); gg.moveTo(19, 10); gg.lineTo(19, 15); }, 1.4);
    ell(g, 9, 11, 2, 2.4, INK); ell(g, 15, 11, 2, 2.4, INK); line(g, [[10, 20], [10, 16]], 1, INK); line(g, [[14, 20], [14, 16]], 1, INK);
  },
  chest(g) { // loot
    g.fillStyle = shade(GOLD, .5); g.fillRect(5, 11, 14, 8);
    poly(g, [[5, 11], [5, 8], [19, 8], [19, 11]], shade(GOLD, .68));
    inkPath(g, gg => { gg.rect(5, 11, 14, 8); gg.rect(5, 8, 14, 3); }, 1.5); ell(g, 12, 12, 1.4, 1.4, GOLDH);
  },
  fang(g) { // generic enemy glyph
    poly(g, [[6, 6], [10, 6], [8, 16]], BONE); poly(g, [[14, 6], [18, 6], [16, 16]], BONE);
    inkPoly(g, [[6, 6], [10, 6], [8, 16]], 1.3); inkPoly(g, [[14, 6], [18, 6], [16, 16]], 1.3);
  },
  chevron(g) { line(g, [[6, 15], [12, 9], [18, 15]], 2.6, "#7ee787"); },
  check(g) { line(g, [[4, 13], [10, 19], [20, 5]], 2.8, "#7ee787"); },
  dagger(g) { // rogue glyph
    poly(g, [[12, 2], [13.4, 7], [13, 13], [12, 15], [11, 13], [10.6, 7]], shade(SILVER, 1.05));
    inkPoly(g, [[12, 2], [13.4, 7], [13, 13], [12, 15], [11, 13], [10.6, 7]], 1.3);
    line(g, [[8, 15], [16, 15]], 2.2, GOLD); inkPath(g, gg => { gg.moveTo(8, 15); gg.lineTo(16, 15); }, 1.2, INK);
    line(g, [[12, 15], [12, 21]], 2, shade(GOLD, .6)); ell(g, 12, 22, 1.5, 1.5, GOLDH);
  },
  crown(g) { // main-hero marker
    const p = [[4, 18], [5, 9], [8.5, 13.5], [12, 6], [15.5, 13.5], [19, 9], [20, 18]];
    poly(g, p, GOLD); inkPoly(g, p, 1.3);
    for (const x of [5, 12, 19]) ell(g, x, 8.5, 1.3, 1.3, GOLDH);
    g.fillStyle = shade(GOLD, .7); g.fillRect(5, 17.5, 14, 3);
    inkPath(g, gg => gg.rect(5, 17.5, 14, 3), 1, INK);
  },
  temple(g) { // resurrection shrine: pediment on pillars
    poly(g, [[3, 9], [12, 3], [21, 9]], shade(GOLD, .62)); inkPoly(g, [[3, 9], [12, 3], [21, 9]], 1.4);
    g.fillStyle = shade(BONE, .92); for (const x of [5, 11, 16]) g.fillRect(x, 9, 3, 10);
    for (const x of [5, 11, 16]) inkPath(g, gg => gg.rect(x, 9, 3, 10), 1, INK);
    g.fillStyle = shade(GOLD, .5); g.fillRect(4, 19, 16, 2.4); inkPath(g, gg => gg.rect(4, 19, 16, 2.4), 1.3, INK);
  },
};

const CANVAS = {}, URL = {};
function build(name, px) {
  const c = document.createElement("canvas"); c.width = c.height = px;
  const g = c.getContext("2d");
  // Error isolation: a bug in one glyph's draw must never throw into the caller and take down a
  // whole screen render (as a stray inkPath() call once did). Fall back to a blank tile + log.
  try {
    g.scale(px / 24, px / 24); g.lineCap = "round"; g.lineJoin = "round";
    (DRAW[name] || DRAW.dot)(g);
  } catch (err) {
    console.error(`icon "${name}" draw failed:`, err && err.message || err);
  }
  return c;
}
export function iconCanvas(name, px = 44) { const k = name + ":" + px; return CANVAS[k] || (CANVAS[k] = build(name, px)); }
export function iconImg(name, size = 18, style = "") {
  const k = name + ":" + size;
  if (!URL[k]) URL[k] = iconCanvas(name, size * 2).toDataURL();
  return `<img width="${size}" height="${size}" style="vertical-align:-3px;${style}" src="${URL[k]}" alt="">`;
}
export const ICON_NAMES = Object.keys(DRAW);
