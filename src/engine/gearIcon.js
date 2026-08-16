/* ============ ENGINE :: gearIcon.js — procedural item icons ============ */
/* Draws a hand-inked icon for a generated item: shape from its gear type, palette from its
   material, an accent from its prefix, and a gold rim once it's been forged. Cached by the
   item's composition so identical items share one canvas. Matches the game's art style. */
"use strict";

import { inkPath, ell, shade } from "./core.js";

const INK = "rgba(12,9,18,.9)";
const MAT = {
  // weapon metals
  iron: "#8a8f98", bronze: "#b0813f", steel: "#9fb0c0", meteoric: "#8574ab", obsidian: "#4a4658", emberglass: "#e08a3a",
  // armour metals (fighter)
  iron_m: "#8a8f98", bronze_m: "#b0813f", steel_m: "#9fb0c0", mithril: "#a9d4dd", adamant: "#6b7280",
  // leathers (rogue)
  leather: "#9a6e42", padded: "#b8a06a", studded: "#7d6444", wyvernhide: "#6f8f7a", dragonhide: "#5f9061",
  // cloths (caster)
  cotton: "#d8cdb0", linen: "#cdc3a4", silk: "#c8b6e0", wool: "#b7a98c", runeweave: "#a98be0",
  // trinkets (jewellery)
  copper: "#c07b4a", silver: "#c8cdd6", jade: "#5fae7a", gold: "#e0b850", onyx: "#3a3646", ruby: "#d0475a",
};
const ACCENT = {
  keen: "#ffd166", brutal: "#ff8a5a", sturdy: "#9ad1ff", vital: "#7ee787", swift: "#a6e6ff", vampiric: "#ff5a6a",
};
const col = it => MAT[it.parts && it.parts.material] || "#a89f8c";

function poly(g, pts, fill) { g.fillStyle = fill; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); g.fill(); }
function ink(g, pts, w = 1.4) { inkPath(g, gg => { gg.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) gg.lineTo(pts[i][0], pts[i][1]); gg.closePath(); }, w, INK); }
function line(g, pts, w, c) { g.strokeStyle = c; g.lineWidth = w; g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.stroke(); }

const SHAPES = {
  blade(g, c) { const p = [[12, 2], [14, 6], [13, 15], [12, 17], [11, 15], [10, 6]]; poly(g, p, c);
    poly(g, [[12, 2], [12, 17], [11, 15], [10, 6]], shade(c, .8)); ink(g, p, 1.3);
    line(g, [[7, 16], [17, 16]], 2.4, "#b98a3a"); line(g, [[12, 17], [12, 21]], 2.2, shade(c, .55)); },
  rod(g, c) { line(g, [[9, 21], [15, 5]], 2.4, shade(c, .7)); inkPath(g, gg => { gg.moveTo(9, 21); gg.lineTo(15, 5); }, 1.2, INK);
    ell(g, 15.5, 4.5, 3, 3, shade(c, 1.2)); inkPath(g, gg => gg.ellipse(15.5, 4.5, 3, 3, 0, 0, 7), 1.2, INK); },
  shield(g, c) { const p = [[12, 3], [20, 6], [19, 14], [12, 21], [5, 14], [4, 6]]; poly(g, p, c);
    poly(g, [[12, 3], [12, 21], [5, 14], [4, 6]], shade(c, .82)); ink(g, p, 1.5); line(g, [[12, 4], [12, 20]], 1, "rgba(12,9,18,.4)"); },
  orb(g, c) { ell(g, 12, 13, 7, 7, c); ell(g, 10, 11, 2.6, 2.6, shade(c, 1.4)); inkPath(g, gg => gg.ellipse(12, 13, 7, 7, 0, 0, 7), 1.5, INK); },
  helm(g, c) { g.fillStyle = c; g.beginPath(); g.arc(12, 12, 8, Math.PI, 0); g.rect(4, 12, 16, 4); g.fill();
    inkPath(g, gg => { gg.arc(12, 12, 8, Math.PI, 0); gg.moveTo(4, 12); gg.lineTo(4, 16); gg.lineTo(20, 16); gg.lineTo(20, 12); }, 1.5);
    g.fillStyle = INK; g.fillRect(7, 12, 3, 3); g.fillRect(14, 12, 3, 3); line(g, [[12, 4], [12, 16]], 1, shade(c, .6)); },
  chest(g, c) { const p = [[7, 6], [17, 6], [19, 9], [16, 11], [16, 20], [8, 20], [8, 11], [5, 9]]; poly(g, p, c);
    ink(g, p, 1.5); line(g, [[12, 8], [12, 20]], 1, "rgba(12,9,18,.35)"); },
  glove(g, c) { g.fillStyle = c; g.beginPath(); g.rect(7, 10, 8, 10); g.fill();
    poly(g, [[7, 10], [8, 5], [10, 5], [10, 10]], c); poly(g, [[11, 10], [11, 6], [13, 6], [13, 10]], c);
    inkPath(g, gg => { gg.rect(7, 10, 8, 10); gg.moveTo(15, 12); gg.lineTo(17, 11); gg.lineTo(17, 14); gg.lineTo(15, 15); }, 1.4); },
  boot(g, c) { const p = [[8, 4], [12, 4], [12, 15], [19, 15], [19, 20], [8, 20]]; poly(g, p, c); ink(g, p, 1.5);
    line(g, [[8, 18], [19, 18]], 1.4, shade(c, .55)); },
  ring(g, c) { inkPath(g, gg => gg.ellipse(12, 14, 6, 6, 0, 0, 7), 2.2, shade(c, 1)); g.strokeStyle = c; g.lineWidth = 2.4;
    g.beginPath(); g.arc(12, 14, 6, 0, 7); g.stroke(); ell(g, 12, 6, 2.6, 2.6, shade(c, 1.4)); inkPath(g, gg => gg.ellipse(12, 6, 2.6, 2.6, 0, 0, 7), 1.2, INK); },
  amulet(g, c) { g.strokeStyle = shade(c, .7); g.lineWidth = 1.6; g.beginPath(); g.arc(12, 8, 6, 0.35 * Math.PI, 0.65 * Math.PI, true); g.stroke();
    poly(g, [[12, 11], [16, 15], [12, 20], [8, 15]], c); ink(g, [[12, 11], [16, 15], [12, 20], [8, 15]], 1.4); },
};
const SHAPE_FOR = {
  wand: "rod", staff: "rod", scepter: "rod",
  sword: "blade", greatsword: "blade", dagger: "blade", kris: "blade", mace: "blade", shortbow: "rod",
  shield: "shield", buckler: "shield", orb: "orb", tome: "chest", cloak: "chest",
  helm: "helm", hood: "helm", cowl: "helm",
  plate: "chest", chainmail: "chest", brigandine: "chest", leathers: "chest", robe: "chest", raiment: "chest",
  gauntlets: "glove", bracers: "glove", handwraps: "glove",
  boots: "boot", greaves: "boot", slippers: "boot",
  ring: "ring", band: "ring", signet: "ring",
  amulet: "amulet", pendant: "amulet", talisman: "amulet",
};
const SLOT_SHAPE = { weapon: "blade", offhand: "shield", helm: "helm", armor: "chest", gloves: "glove", boots: "boot", ring: "ring", amulet: "amulet" };

const CACHE = {}, URL = {};
function build(item, px) {
  const c = document.createElement("canvas"); c.width = c.height = px;
  const g = c.getContext("2d"); g.scale(px / 24, px / 24); g.lineCap = "round"; g.lineJoin = "round";
  const shape = SHAPES[SHAPE_FOR[item.parts && item.parts.type] || SLOT_SHAPE[item.slot] || "chest"];
  shape(g, col(item));
  // prefix accent gem
  const acc = ACCENT[item.parts && item.parts.prefix];
  if (acc) { g.save(); g.shadowColor = acc; g.shadowBlur = 4; ell(g, 19, 5, 2.2, 2.2, acc);
    inkPath(g, gg => gg.ellipse(19, 5, 2.2, 2.2, 0, 0, 7), 1, INK); g.restore(); }
  // forged rim
  if (item.upgradeLevel > 0) { g.strokeStyle = "rgba(255,209,102,.7)"; g.lineWidth = 1.4;
    g.strokeRect(1.5, 1.5, 21, 21); }
  return c;
}
function keyOf(item) {
  const p = item.parts || {};
  return `${p.prefix || "-"}:${p.material || "-"}:${p.type || item.slot}:${item.upgradeLevel || 0}`;
}
export function gearIconCanvas(item, px = 40) { const k = keyOf(item) + ":" + px; return CACHE[k] || (CACHE[k] = build(item, px)); }
export function gearIconImg(item, size = 22, style = "") {
  const k = keyOf(item) + ":" + size;
  if (!URL[k]) URL[k] = gearIconCanvas(item, size * 2).toDataURL();
  return `<img width="${size}" height="${size}" style="vertical-align:-5px;${style}" src="${URL[k]}" alt="">`;
}
