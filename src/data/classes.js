/* ============ DATA :: classes.js — hero class base stats + per-level growth ============ */
/* Phase 1 keeps the prototype's three heroes (knight/mage/cleric) with six-stat blocks.
   The fighter/mage/rogue/cleric roster overhaul arrives in later phases. */
"use strict";

export const HERO_BASES = {
  knight: {
    name: "Bram", cls: "knight", rng: 1,
    hp: 58, atk: 9, def: 24, dodge: 8, crit: 8, aspd: 1.00,
    growth: { hp: 14, atk: 2, def: 4, dodge: 1, crit: 1 },
  },
  mage: {
    name: "Wren", cls: "mage", rng: 4,
    hp: 32, atk: 14, def: 8, dodge: 10, crit: 14, aspd: 1.15,
    growth: { hp: 8, atk: 3, def: 1, dodge: 1, crit: 2 },
  },
  cleric: {
    name: "Odo", cls: "cleric", rng: 1,
    hp: 46, atk: 9, def: 16, dodge: 8, crit: 8, aspd: 1.05,
    growth: { hp: 11, atk: 2, def: 3, dodge: 1, crit: 1 },
  },
};
