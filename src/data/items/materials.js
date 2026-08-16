/* ============ DATA :: items/materials.js — materials (base stat + optional drawback) ============ */
/* A material's `mat` must match its gear type's `mat`, so only sensible pairings ever roll
   (no more "Cotton Mail"). Categories:
     weapon  — blades, hafts, foci (atk / crit)
     metal   — heavy armour worn by FIGHTERS  (def / hp)
     leather — supple armour worn by ROGUES    (dodge / def)
     cloth   — woven armour worn by MAGES & CLERICS (hp / dodge / crit)
     trinket — rings & amulets (small mixed bonuses)
   Each grants one stat; some carry a drawback (a negative stat) — the "benefits AND drawbacks"
   of the design. `w` = drop weight (rarer = lower). */
"use strict";

export const MATERIALS = [
  // --- weapon materials (atk / crit) ---
  { id: "iron",       name: "Iron",       mat: "weapon",  stat: "atk",   val: 1, w: 6 },
  { id: "bronze",     name: "Bronze",     mat: "weapon",  stat: "atk",   val: 1, w: 6 },
  { id: "steel",      name: "Steel",      mat: "weapon",  stat: "atk",   val: 2, w: 4 },
  { id: "meteoric",   name: "Meteoric",   mat: "weapon",  stat: "atk",   val: 3, w: 2, drawback: { stat: "aspd", val: -0.1 } },
  { id: "obsidian",   name: "Obsidian",   mat: "weapon",  stat: "crit",  val: 3, w: 2 },
  { id: "emberglass", name: "Emberglass", mat: "weapon",  stat: "crit",  val: 4, w: 1 },

  // --- metal (fighter armour): def / hp ---
  { id: "iron_m",     name: "Iron",       mat: "metal",   stat: "def",   val: 2, w: 6 },
  { id: "bronze_m",   name: "Bronze",     mat: "metal",   stat: "hp",    val: 4, w: 6 },
  { id: "steel_m",    name: "Steel",      mat: "metal",   stat: "def",   val: 3, w: 5 },
  { id: "mithril",    name: "Mithril",    mat: "metal",   stat: "def",   val: 3, w: 2, drawback: { stat: "aspd", val: 0.05 } },
  { id: "adamant",    name: "Adamant",    mat: "metal",   stat: "def",   val: 5, w: 1, drawback: { stat: "aspd", val: -0.1 } },

  // --- leather (rogue armour): dodge / def ---
  { id: "leather",    name: "Leather",    mat: "leather", stat: "def",   val: 2, w: 6 },
  { id: "padded",     name: "Padded",     mat: "leather", stat: "hp",    val: 4, w: 6 },
  { id: "studded",    name: "Studded",    mat: "leather", stat: "def",   val: 3, w: 4 },
  { id: "wyvernhide", name: "Wyvernhide", mat: "leather", stat: "dodge", val: 4, w: 2 },
  { id: "dragonhide", name: "Dragonhide", mat: "leather", stat: "def",   val: 5, w: 1, drawback: { stat: "dodge", val: -2 } },

  // --- cloth (mage & cleric armour): hp / dodge / crit ---
  { id: "cotton",     name: "Cotton",     mat: "cloth",   stat: "hp",    val: 4, w: 6 },
  { id: "linen",      name: "Linen",      mat: "cloth",   stat: "dodge", val: 2, w: 6 },
  { id: "silk",       name: "Silk",       mat: "cloth",   stat: "dodge", val: 3, w: 5 },
  { id: "wool",       name: "Wool",       mat: "cloth",   stat: "hp",    val: 6, w: 3 },
  { id: "runeweave",  name: "Runeweave",  mat: "cloth",   stat: "crit",  val: 4, w: 2 },

  // --- trinket (rings & amulets): small mixed bonuses ---
  { id: "copper",     name: "Copper",     mat: "trinket", stat: "hp",    val: 3, w: 6 },
  { id: "silver",     name: "Silver",     mat: "trinket", stat: "crit",  val: 3, w: 5 },
  { id: "jade",       name: "Jade",       mat: "trinket", stat: "dodge", val: 3, w: 4 },
  { id: "gold",       name: "Gold",       mat: "trinket", stat: "atk",   val: 2, w: 4 },
  { id: "onyx",       name: "Onyx",       mat: "trinket", stat: "def",   val: 4, w: 2 },
  { id: "ruby",       name: "Ruby",       mat: "trinket", stat: "crit",  val: 4, w: 2 },
];
