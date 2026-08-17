/* ============ SYSTEM :: LootGenerator.js — procedural item generation ============ */
/* Pure & DOM-free. An item = Prefix + Material + Gear Type (+ upgrade level, added later by
   the Forge). Each component grants one stat; rarer components have lower drop weights (no
   rarity tiers — quality is emergent). All randomness is injected via `rng` so drops are
   deterministic with the battle seed. */
"use strict";

import { PREFIXES } from "../data/items/prefixes.js";
import { MATERIALS } from "../data/items/materials.js";
import { GEAR_TYPES, CLASS_FAMILY } from "../data/items/gearTypes.js";
import { BAL } from "../data/balance.js";

const STAT_ORDER = ["atk", "def", "hp", "dodge", "crit", "aspd"];
const GRADES = ["plain", "fine", "rare", "epic"];      // ascending rarity (also the loot grade floor order)
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

/* Build an item's description string from its CURRENT stats + tags. Used at generation time and
   again after the Forge upgrades a stat, so the text never drifts from the numbers. */
export function describeItem(item) {
  const parts = STAT_ORDER.filter(s => item[s] !== undefined).map(s => fmtVal(s, item[s]));
  if (item.rng > 1) parts.push("Ranged");
  if (item.twoH) parts.push("Two-handed");
  if (item.proc) parts.push(cap(item.proc.kind));
  return parts.join(", ");
}

/* Generate one item. opts.classes (array) restricts gear types to those the party can use:
   family armour (fam) only drops in families the party wears; weapons/jewellery gate by `use`.
   opts.power (dungeon tier, ≥1) scales rolled stat values up; opts.floor ("plain".."epic") is the
   worst rarity the drop may roll (grade is lifted to it), so deeper dungeons drop richer gear. */
export function generate(rng, opts = {}) {
  const power = Math.max(1, opts.power || 1);
  const powMult = 1 + BAL.LOOT_POWER_STEP * (power - 1);
  let typePool = GEAR_TYPES;
  if (opts.classes) {
    const wantFam = new Set(opts.classes.map(c => CLASS_FAMILY[c]).filter(Boolean));
    typePool = GEAR_TYPES.filter(g =>
      g.fam ? wantFam.has(g.fam)
            : (g.use === "any" || opts.classes.includes(g.use)));
  }

  const type = wpick(rng, typePool);
  const material = wpick(rng, MATERIALS.filter(m => m.mat === type.mat));
  const prefix = wpick(rng, PREFIXES);

  // sum stat contributions from the three components (+ any material drawback), scaled by dungeon power.
  // aspd is a speed multiplier, not a raw pool — it never scales with tier (a +0.1 boot stays +0.1).
  const stats = {};
  const add = (st, v) => { if (st) stats[st] = round1((stats[st] || 0) + (st === "aspd" ? v : v * powMult)); };
  add(type.stat, type.val);
  add(material.stat, material.val);
  if (material.drawback) add(material.drawback.stat, material.drawback.val);
  add(prefix.stat, prefix.val);

  const name = [prefix.name, material.name, type.name].filter(Boolean).join(" ");

  // cosmetic grade from the rarest component, then lifted to the dungeon's drop floor.
  const minW = Math.min(type.w, material.w, prefix.w);
  let grade = minW <= 1 ? "epic" : minW <= 2 ? "rare" : minW <= 3 ? "fine" : "plain";
  if (opts.floor && GRADES.indexOf(opts.floor) > GRADES.indexOf(grade)) grade = opts.floor;

  const item = {
    n: name, slot: type.slot, use: type.use, primary: type.stat,
    proc: prefix.proc || null, upgradeLevel: 0, grade,
    parts: { prefix: prefix.id, material: material.id, type: type.id },
  };
  if (type.fam) item.family = type.fam; // armour family gates who can wear it (Equipment.canEquip)
  if (type.rng) item.rng = type.rng;   // weapons carry their range (drives melee vs ranged combat)
  if (type.twoH) item.twoH = true;     // two-handers block the offhand slot (Equipment.equip)
  for (const s in stats) item[s] = stats[s];
  item.d = describeItem(item);
  return item;
}

/* Generate a drop AND the per-component breakdown the Loot Roll popup needs: the three landed
   components (Prefix · Material · Type) with their power-scaled stat contribution, plus the pool of
   alternatives each reel can spin through. Presentation data only — `item` is the clean item to keep. */
export function generateRoll(rng, opts = {}) {
  const item = generate(rng, opts);
  const power = Math.max(1, opts.power || 1);
  const powMult = 1 + BAL.LOOT_POWER_STEP * (power - 1);
  const scale = (stat, val) => round1(stat === "aspd" ? val : val * powMult);
  const disp = (c, kind) => ({
    name: c.name || "",
    stat: c.stat || null,
    val: c.stat ? scale(c.stat, c.val) : 0,
    proc: c.proc ? cap(c.proc.kind) : null,
    draw: c.drawback ? { stat: c.drawback.stat, val: scale(c.drawback.stat, c.drawback.val) } : null,
    twoH: kind === "type" ? !!c.twoH : false,
    rng: kind === "type" ? (c.rng || 1) : null,
  });
  const prefix = PREFIXES.find(p => p.id === item.parts.prefix);
  const material = MATERIALS.find(m => m.id === item.parts.material);
  const type = GEAR_TYPES.find(g => g.id === item.parts.type);
  const parts = { prefix: disp(prefix, "prefix"), material: disp(material, "material"), type: disp(type, "type") };
  const pools = {
    prefix: PREFIXES.map(p => disp(p, "prefix")),
    material: MATERIALS.filter(m => m.mat === material.mat).map(m => disp(m, "material")),
    type: GEAR_TYPES.filter(g => g.slot === type.slot).map(g => disp(g, "type")),
  };
  return { item, parts, pools, power };
}
