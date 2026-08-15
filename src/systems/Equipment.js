/* ============ SYSTEM :: Equipment.js — equip / unequip gear ============ */
/* Pure & DOM-free. Mutates a hero's `gear` and a shared `inventory` array.
   Class restriction: an item is equippable if it's "any" or matches the hero's class. */
"use strict";

export function canEquip(hero, item) {
  return !!item && (item.use === "any" || item.use === hero.cls);
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
