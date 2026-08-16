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
   Any item already in that slot returns to the inventory. Returns true on success. */
export function equip(hero, item, inventory) {
  if (!canEquip(hero, item)) return false;
  const idx = inventory.indexOf(item);
  if (idx >= 0) inventory.splice(idx, 1);
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
