/* ============ DATA :: items/gearTypes.js — gear types (slot + class + one stat) ============ */
/* Each gear type: equip `slot`, the class that can `use` it (weapons are class-specific;
   most wearables are "any"), its signature `stat`+`val`, a drop weight `w` (rarer = lower),
   and `mat` = which material category applies. Slots: weapon, offhand, helm, armor, gloves,
   boots, ring, amulet. */
"use strict";

export const GEAR_TYPES = [
  // --- weapons (class-specific) ---
  { id: "sword",      name: "Sword",      slot: "weapon",  use: "knight", stat: "atk",   val: 3,  w: 6, mat: "weapon" },
  { id: "greatsword", name: "Greatsword", slot: "weapon",  use: "knight", stat: "atk",   val: 5,  w: 3, mat: "weapon" },
  { id: "wand",       name: "Wand",       slot: "weapon",  use: "mage",   stat: "atk",   val: 3,  w: 6, mat: "weapon" },
  { id: "staff",      name: "Staff",      slot: "weapon",  use: "mage",   stat: "atk",   val: 5,  w: 3, mat: "weapon" },
  { id: "mace",       name: "Mace",       slot: "weapon",  use: "cleric", stat: "atk",   val: 3,  w: 6, mat: "weapon" },
  { id: "scepter",    name: "Scepter",    slot: "weapon",  use: "cleric", stat: "hp",    val: 8,  w: 4, mat: "weapon" },
  { id: "dagger",     name: "Dagger",     slot: "weapon",  use: "rogue",  stat: "crit",  val: 5,  w: 6, mat: "weapon" },
  { id: "kris",       name: "Kris",       slot: "weapon",  use: "rogue",  stat: "atk",   val: 4,  w: 4, mat: "weapon" },
  { id: "shortbow",   name: "Shortbow",   slot: "weapon",  use: "rogue",  stat: "dodge", val: 5,  w: 3, mat: "weapon" },
  // --- offhand ---
  { id: "shield",     name: "Shield",     slot: "offhand", use: "knight", stat: "def",   val: 7,  w: 4, mat: "weapon" },
  { id: "orb",        name: "Orb",        slot: "offhand", use: "mage",   stat: "crit",  val: 5,  w: 4, mat: "wear" },
  { id: "tome",       name: "Tome",       slot: "offhand", use: "cleric", stat: "hp",    val: 8,  w: 4, mat: "wear" },
  { id: "cloak",      name: "Cloak",      slot: "offhand", use: "rogue",  stat: "dodge", val: 5,  w: 4, mat: "wear" },
  { id: "buckler",    name: "Buckler",    slot: "offhand", use: "any",    stat: "dodge", val: 4,  w: 5, mat: "weapon" },
  // --- helm ---
  { id: "helm",       name: "Helm",       slot: "helm",    use: "any",    stat: "def",   val: 4,  w: 6, mat: "wear" },
  { id: "hood",       name: "Hood",       slot: "helm",    use: "any",    stat: "dodge", val: 4,  w: 5, mat: "wear" },
  { id: "circlet",    name: "Circlet",    slot: "helm",    use: "any",    stat: "crit",  val: 4,  w: 4, mat: "wear" },
  // --- armor (chest/body) ---
  { id: "plate",      name: "Plate",      slot: "armor",   use: "knight", stat: "def",   val: 8,  w: 4, mat: "wear" },
  { id: "robe",       name: "Robe",       slot: "armor",   use: "mage",   stat: "def",   val: 5,  w: 5, mat: "wear" },
  { id: "vestments",  name: "Vestments",  slot: "armor",   use: "cleric", stat: "def",   val: 6,  w: 5, mat: "wear" },
  { id: "mail",       name: "Mail",       slot: "armor",   use: "any",    stat: "def",   val: 5,  w: 6, mat: "wear" },
  { id: "leathers",   name: "Leathers",   slot: "armor",   use: "any",    stat: "dodge", val: 5,  w: 4, mat: "wear" },
  // --- gloves ---
  { id: "gauntlets",  name: "Gauntlets",  slot: "gloves",  use: "any",    stat: "atk",   val: 3,  w: 5, mat: "wear" },
  { id: "gloves",     name: "Gloves",     slot: "gloves",  use: "any",    stat: "dodge", val: 4,  w: 6, mat: "wear" },
  { id: "grips",      name: "Grips",      slot: "gloves",  use: "any",    stat: "crit",  val: 4,  w: 4, mat: "wear" },
  // --- boots ---
  { id: "boots",      name: "Boots",      slot: "boots",   use: "any",    stat: "dodge", val: 4,  w: 6, mat: "wear" },
  { id: "greaves",    name: "Greaves",    slot: "boots",   use: "any",    stat: "def",   val: 4,  w: 5, mat: "wear" },
  { id: "treads",     name: "Treads",     slot: "boots",   use: "any",    stat: "aspd",  val: 0.1,w: 3, mat: "wear" },
  // --- ring ---
  { id: "ring",       name: "Ring",       slot: "ring",    use: "any",    stat: "crit",  val: 5,  w: 6, mat: "wear" },
  { id: "band",       name: "Band",       slot: "ring",    use: "any",    stat: "atk",   val: 3,  w: 5, mat: "wear" },
  { id: "signet",     name: "Signet",     slot: "ring",    use: "any",    stat: "hp",    val: 8,  w: 4, mat: "wear" },
  // --- amulet ---
  { id: "amulet",     name: "Amulet",     slot: "amulet",  use: "any",    stat: "hp",    val: 10, w: 6, mat: "wear" },
  { id: "pendant",    name: "Pendant",    slot: "amulet",  use: "any",    stat: "def",   val: 5,  w: 5, mat: "wear" },
  { id: "talisman",   name: "Talisman",   slot: "amulet",  use: "any",    stat: "atk",   val: 3,  w: 4, mat: "wear" },
];

/* Equip slots in display order (single source; Character.gear and the panel read this). */
export const SLOTS = ["weapon", "offhand", "helm", "armor", "gloves", "boots", "ring", "amulet"];
