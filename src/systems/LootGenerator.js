/* ============ SYSTEM :: LootGenerator.js — procedural item generation ============ */
/* Pure & DOM-free. An item = Prefix + Material + Gear Type (+ upgrade level, added later by
   the Forge). Each component grants one stat; rarer components have lower drop weights (no
   rarity tiers — quality is emergent). All randomness is injected via `rng` so drops are
   deterministic with the battle seed. */
"use strict";

import { PREFIXES } from "../data/items/prefixes.js";
import { MATERIALS } from "../data/items/materials.js";
import { GEAR_TYPES } from "../data/items/gearTypes.js";

const STAT_ORDER = ["atk", "def", "hp", "dodge", "crit", "aspd"];
const STAT_LABEL = { atk: "ATK", def: "DEF", hp: "HP", dodge: "Dodge", crit: "Crit", aspd: "Speed" };
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const round1 = v => Math.round(v * 10) / 10;

function wpick(rng, arr) {
  let total = 0; for (const x of arr) total += x.w;
  let n = rng() * total;
  for (const x of arr) { n -= x.w; if (n < 0) return x; }
  return arr[arr.length - 1];
}

function fmtVal(stat, v) {
  const num = stat === "aspd" ? round1(v).toFixed(1) : v;
  return `${v >= 0 ? "+" : ""}${num} ${STAT_LABEL[stat]}`;
}

/* Generate one item. opts.classes (array) restricts gear types to those the party can use. */
export function generate(rng, opts = {}) {
  let typePool = GEAR_TYPES;
  if (opts.classes) typePool = GEAR_TYPES.filter(g => g.use === "any" || opts.classes.includes(g.use));

  const type = wpick(rng, typePool);
  const material = wpick(rng, MATERIALS.filter(m => m.mat === type.mat));
  const prefix = wpick(rng, PREFIXES);

  // sum stat contributions from the three components (+ any material drawback)
  const stats = {};
  const add = (st, v) => { if (st) stats[st] = round1((stats[st] || 0) + v); };
  add(type.stat, type.val);
  add(material.stat, material.val);
  if (material.drawback) add(material.drawback.stat, material.drawback.val);
  add(prefix.stat, prefix.val);

  const name = [prefix.name, material.name, type.name].filter(Boolean).join(" ");
  const descParts = STAT_ORDER.filter(s => stats[s] !== undefined).map(s => fmtVal(s, stats[s]));
  if (type.rng > 1) descParts.push("Ranged");
  if (prefix.proc) descParts.push(cap(prefix.proc.kind));

  // cosmetic grade from the rarest component (colour only — not a mechanical tier)
  const minW = Math.min(type.w, material.w, prefix.w);
  const grade = minW <= 1 ? "epic" : minW <= 2 ? "rare" : minW <= 3 ? "fine" : "plain";

  const item = {
    n: name, slot: type.slot, use: type.use, primary: type.stat,
    proc: prefix.proc || null, upgradeLevel: 0, grade,
    d: descParts.join(", "),
    parts: { prefix: prefix.id, material: material.id, type: type.id },
  };
  if (type.rng) item.rng = type.rng;   // weapons carry their range (drives melee vs ranged combat)
  for (const s in stats) item[s] = stats[s];
  return item;
}
