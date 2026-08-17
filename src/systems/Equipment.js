/* ============ SYSTEM :: Equipment.js — equip / unequip gear ============ */
/* Pure & DOM-free. Mutates a hero's `gear` and a shared `inventory` array.
   Class restriction: armour with a `family` (metal/leather/cloth) is worn only by the classes
   that use that family (fighters→metal, rogues→leather, casters→cloth); everything else is
   equippable if it's "any" or matches the hero's class. */
"use strict";

import { CLASS_FAMILY } from "../data/items/gearTypes.js";

export function canEquip(hero, item) {
  if (!item) return false;
  if (item.family) return CLASS_FAMILY[hero.cls] === item.family;
  return item.use === "any" || item.use === hero.cls;
}

/* Equip `item` (which must be in `inventory`) into its slot on `hero`.
   Any item already in that slot returns to the inventory. A two-handed weapon (staff, greatsword,
   shortbow) can't share the hero with an offhand: equipping one frees the offhand, and equipping an
   offhand frees a two-handed weapon. Returns true on success. */
export function equip(hero, item, inventory) {
  if (!canEquip(hero, item)) return false;
  const idx = inventory.indexOf(item);
  if (idx >= 0) inventory.splice(idx, 1);
  // enforce the two-handed / offhand exclusion before seating the new item
  if (item.slot === "weapon" && item.twoH && hero.gear.offhand) {
    inventory.push(hero.gear.offhand); hero.gear.offhand = null;
  } else if (item.slot === "offhand" && hero.gear.weapon && hero.gear.weapon.twoH) {
    inventory.push(hero.gear.weapon); hero.gear.weapon = null;
  }
  const prev = hero.gear[item.slot];
  hero.gear[item.slot] = item;
  if (prev) inventory.push(prev);
  return true;
}

/* Remove whatever is in `slot` on `hero` and return it to `inventory`. */
export function unequip(hero, slot, inventory) {
  const it = hero.gear[slot];
  if (!it) return false;
  hero.gear[slot] = null;
  inventory.push(it);
  return true;
}

/* A rough single-number worth for an item, so the bag can hint which drops upgrade a slot.
   Weights normalize the stats against each other (a heuristic, not the last word on a build). */
const SCORE_W = { atk: 2, def: 1.5, hp: 0.4, dodge: 1, crit: 1, aspd: 30 };
export function itemScore(item) {
  if (!item) return 0;
  let s = 0;
  for (const k in SCORE_W) if (item[k]) s += item[k] * SCORE_W[k];
  return s;
}

/* True if `item` is equippable by `hero` and scores higher than what's in that slot now. */
export function isUpgrade(hero, item) {
  if (!canEquip(hero, item)) return false;
  return itemScore(item) > itemScore(hero.gear[item.slot]);
}

/* Does the shared `inventory` hold anything worth equipping on `hero` right now — either a clear
   upgrade over a filled slot, or a piece for an empty slot? Uses the same verdict the character
   panel shows (only "up" / "new" count, never a sidegrade), so a tile hint matches what you'd see
   inside. Pure & DOM-free. */
export function hasGearHint(hero, inventory) {
  if (!hero || !hero.alive || !inventory || !inventory.length) return false;
  return inventory.some(it => {
    if (!canEquip(hero, it)) return false;
    const v = compareToEquipped(hero, it).verdict;
    return v === "up" || v === "new";
  });
}

/* Compare a bag `item` against what the hero has equipped in its slot (and any slot the swap would
   free — a 2H weapon frees the offhand; an offhand frees a 2H weapon). Returns a structured verdict
   the character panel renders: overall up/side/down/new, per-stat from→to→diff, and keyword changes
   (procs, ranged, two-handed). Pure & DOM-free. */
const CMP_STATS = ["atk", "def", "hp", "dodge", "crit", "aspd"];
const round1 = v => Math.round(v * 10) / 10;
export function compareToEquipped(hero, item) {
  const removed = [];
  const cur = hero.gear[item.slot];
  if (cur) removed.push(cur);
  if (item.slot === "weapon" && item.twoH && hero.gear.offhand) removed.push(hero.gear.offhand);
  if (item.slot === "offhand" && hero.gear.weapon && hero.gear.weapon.twoH) removed.push(hero.gear.weapon);

  const sumStat = s => removed.reduce((n, it) => n + (it[s] || 0), 0);
  const stats = CMP_STATS.map(s => {
    const from = round1(sumStat(s)), to = round1(item[s] || 0);
    return { stat: s, from, to, diff: round1(to - from) };
  }).filter(x => x.from || x.to);   // present in either the item or what it replaces

  const keywords = [];
  const remProcs = new Set(removed.map(it => it.proc && it.proc.kind).filter(Boolean));
  if (item.proc && !remProcs.has(item.proc.kind)) keywords.push({ label: item.proc.kind, sign: 1 });
  for (const k of remProcs) if (!(item.proc && item.proc.kind === k)) keywords.push({ label: k, sign: -1 });
  const itRanged = (item.rng || 1) > 1, remRanged = removed.some(it => (it.rng || 1) > 1);
  if (itRanged && !remRanged) keywords.push({ label: "Ranged", sign: 1 });
  if (!itRanged && remRanged) keywords.push({ label: "Ranged", sign: -1 });
  if (item.twoH && !(cur && cur.twoH)) keywords.push({ label: "Two-handed", sign: 0 });

  const scoreFrom = removed.reduce((n, it) => n + itemScore(it), 0), scoreTo = itemScore(item);
  let verdict;
  if (!removed.length) verdict = "new";
  else { const band = Math.max(2, 0.05 * Math.max(scoreFrom, scoreTo)), d = scoreTo - scoreFrom;
    verdict = d > band ? "up" : d < -band ? "down" : "side"; }

  return { verdict, stats, keywords, scoreFrom: round1(scoreFrom), scoreTo: round1(scoreTo) };
}
