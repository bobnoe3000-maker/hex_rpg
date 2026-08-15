/* ============ DATA :: items/gearTypes.js — gear types (slot + class + one stat) ============ */
/* Each gear type: the equip `slot`, the class that can `use` it, its signature `stat`+`val`,
   a drop weight `w` (rarer = lower), and `mat` = which material category applies. */
"use strict";

export const GEAR_TYPES = [
  // --- weapons (weapon slot) ---
  { id: "sword",      name: "Sword",      slot: "weapon",  use: "knight", stat: "atk",   val: 3,  w: 6, mat: "weapon" },
  { id: "greatsword", name: "Greatsword", slot: "weapon",  use: "knight", stat: "atk",   val: 5,  w: 3, mat: "weapon" },
  { id: "dagger",     name: "Dagger",     slot: "weapon",  use: "knight", stat: "crit",  val: 5,  w: 4, mat: "weapon" },
  { id: "wand",       name: "Wand",       slot: "weapon",  use: "mage",   stat: "atk",   val: 3,  w: 6, mat: "weapon" },
  { id: "staff",      name: "Staff",      slot: "weapon",  use: "mage",   stat: "atk",   val: 5,  w: 3, mat: "weapon" },
  { id: "orb",        name: "Orb",        slot: "weapon",  use: "mage",   stat: "crit",  val: 5,  w: 4, mat: "weapon" },
  { id: "mace",       name: "Mace",       slot: "weapon",  use: "cleric", stat: "atk",   val: 3,  w: 6, mat: "weapon" },
  { id: "scepter",    name: "Scepter",    slot: "weapon",  use: "cleric", stat: "hp",    val: 8,  w: 4, mat: "weapon" },
  // --- armor (armor slot) ---
  { id: "plate",      name: "Plate",      slot: "armor",   use: "knight", stat: "def",   val: 8,  w: 4, mat: "wear" },
  { id: "leathers",   name: "Leathers",   slot: "armor",   use: "knight", stat: "dodge", val: 6,  w: 4, mat: "wear" },
  { id: "shield",     name: "Shield",     slot: "armor",   use: "knight", stat: "def",   val: 7,  w: 3, mat: "wear" },
  { id: "robe",       name: "Robe",       slot: "armor",   use: "mage",   stat: "def",   val: 4,  w: 6, mat: "wear" },
  { id: "vestments",  name: "Vestments",  slot: "armor",   use: "cleric", stat: "def",   val: 6,  w: 5, mat: "wear" },
  { id: "mail",       name: "Mail",       slot: "armor",   use: "any",    stat: "def",   val: 5,  w: 6, mat: "wear" },
  // --- trinkets (trinket slot, any class) ---
  { id: "ring",       name: "Ring",       slot: "trinket", use: "any",    stat: "crit",  val: 5,  w: 6, mat: "wear" },
  { id: "amulet",     name: "Amulet",     slot: "trinket", use: "any",    stat: "hp",    val: 10, w: 6, mat: "wear" },
  { id: "charm",      name: "Charm",      slot: "trinket", use: "any",    stat: "dodge", val: 6,  w: 5, mat: "wear" },
  { id: "talisman",   name: "Talisman",   slot: "trinket", use: "any",    stat: "atk",   val: 3,  w: 4, mat: "wear" },
];
