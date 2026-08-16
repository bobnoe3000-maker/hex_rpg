/* ============ DATA :: items/gearTypes.js — gear types (slot + class + one stat) ============ */
/* Each gear type: equip `slot`, the class that can `use` it, its signature `stat`+`val`, a drop
   weight `w` (rarer = lower), and `mat` = which material category rolls on it (see materials.js).
   Slots: weapon, offhand, helm, armor, gloves, boots, ring, amulet.

   ARMOUR FAMILIES — helm/armor/gloves/boots each come in three families keyed by `fam`:
     metal  → FIGHTERS,  leather → ROGUES,  cloth → MAGES & CLERICS.
   `fam` both selects the material category (a Plate only rolls metals) and gates who can wear it
   (Equipment.canEquip). Weapons and jewellery have no `fam` and gate by `use` instead. */
"use strict";

export const GEAR_TYPES = [
  // --- weapons (class-specific) ---
  // weapons carry `rng`: >1 = ranged, 1 = melee. A hero's effective range comes from the
  // equipped weapon (StatEngine.derive), falling back to the class's innate range when unarmed.
  { id: "sword",      name: "Sword",      slot: "weapon",  use: "fighter", stat: "atk",  val: 3,  w: 6, mat: "weapon", rng: 1 },
  { id: "greatsword", name: "Greatsword", slot: "weapon",  use: "fighter", stat: "atk",  val: 5,  w: 3, mat: "weapon", rng: 1, twoH: true },
  { id: "wand",       name: "Wand",       slot: "weapon",  use: "mage",    stat: "atk",  val: 3,  w: 6, mat: "weapon", rng: 4 },
  { id: "staff",      name: "Staff",      slot: "weapon",  use: "mage",    stat: "atk",  val: 5,  w: 3, mat: "weapon", rng: 5, twoH: true },
  { id: "mace",       name: "Mace",       slot: "weapon",  use: "cleric",  stat: "atk",  val: 3,  w: 6, mat: "weapon", rng: 1 },
  { id: "scepter",    name: "Scepter",    slot: "weapon",  use: "cleric",  stat: "hp",   val: 8,  w: 4, mat: "weapon", rng: 1 },
  { id: "dagger",     name: "Dagger",     slot: "weapon",  use: "rogue",   stat: "crit", val: 5,  w: 6, mat: "weapon", rng: 1 },
  { id: "kris",       name: "Kris",       slot: "weapon",  use: "rogue",   stat: "atk",  val: 4,  w: 4, mat: "weapon", rng: 1 },
  { id: "shortbow",   name: "Shortbow",   slot: "weapon",  use: "rogue",   stat: "dodge",val: 5,  w: 3, mat: "weapon", rng: 4, twoH: true },
  // --- offhand ---
  { id: "shield",     name: "Shield",     slot: "offhand", use: "any", fam: "metal", stat: "def",  val: 7, w: 4, mat: "metal" },
  { id: "orb",        name: "Orb",        slot: "offhand", use: "mage",   stat: "crit",  val: 5, w: 4, mat: "trinket" },
  { id: "tome",       name: "Tome",       slot: "offhand", use: "cleric", stat: "hp",    val: 8, w: 4, mat: "trinket" },
  { id: "cloak",      name: "Cloak",      slot: "offhand", use: "rogue",  stat: "dodge", val: 5, w: 4, mat: "cloth" },
  { id: "buckler",    name: "Buckler",    slot: "offhand", use: "any",    stat: "dodge", val: 4, w: 5, mat: "metal" },

  // --- helm (metal / leather / cloth) ---
  { id: "helm",       name: "Helm",       slot: "helm", use: "any", fam: "metal",   stat: "def",   val: 4, w: 6, mat: "metal" },
  { id: "hood",       name: "Hood",       slot: "helm", use: "any", fam: "leather", stat: "dodge", val: 4, w: 6, mat: "leather" },
  { id: "cowl",       name: "Cowl",       slot: "helm", use: "any", fam: "cloth",   stat: "crit",  val: 4, w: 6, mat: "cloth" },

  // --- armor / chest (metal / leather / cloth) ---
  { id: "plate",      name: "Plate",      slot: "armor", use: "any", fam: "metal",   stat: "def",   val: 8, w: 4, mat: "metal" },
  { id: "chainmail",  name: "Chainmail",  slot: "armor", use: "any", fam: "metal",   stat: "def",   val: 6, w: 6, mat: "metal" },
  { id: "brigandine", name: "Brigandine", slot: "armor", use: "any", fam: "leather", stat: "def",   val: 5, w: 4, mat: "leather" },
  { id: "leathers",   name: "Leathers",   slot: "armor", use: "any", fam: "leather", stat: "dodge", val: 5, w: 6, mat: "leather" },
  { id: "robe",       name: "Robe",       slot: "armor", use: "any", fam: "cloth",   stat: "def",   val: 5, w: 6, mat: "cloth" },
  { id: "raiment",    name: "Raiment",    slot: "armor", use: "any", fam: "cloth",   stat: "crit",  val: 4, w: 4, mat: "cloth" },

  // --- gloves (metal / leather / cloth) ---
  { id: "gauntlets",  name: "Gauntlets",  slot: "gloves", use: "any", fam: "metal",   stat: "atk",   val: 3, w: 6, mat: "metal" },
  { id: "bracers",    name: "Bracers",    slot: "gloves", use: "any", fam: "leather", stat: "dodge", val: 4, w: 6, mat: "leather" },
  { id: "handwraps",  name: "Handwraps",  slot: "gloves", use: "any", fam: "cloth",   stat: "crit",  val: 4, w: 6, mat: "cloth" },

  // --- boots (metal / leather / cloth) ---
  { id: "greaves",    name: "Greaves",    slot: "boots", use: "any", fam: "metal",   stat: "def",   val: 4, w: 6, mat: "metal" },
  { id: "boots",      name: "Boots",      slot: "boots", use: "any", fam: "leather", stat: "dodge", val: 4, w: 6, mat: "leather" },
  { id: "slippers",   name: "Slippers",   slot: "boots", use: "any", fam: "cloth",   stat: "aspd",  val: 0.1, w: 6, mat: "cloth" },

  // --- ring (jewellery: no family, any class) ---
  { id: "ring",       name: "Ring",       slot: "ring", use: "any", stat: "crit", val: 5, w: 6, mat: "trinket" },
  { id: "band",       name: "Band",       slot: "ring", use: "any", stat: "atk",  val: 3, w: 5, mat: "trinket" },
  { id: "signet",     name: "Signet",     slot: "ring", use: "any", stat: "hp",   val: 8, w: 4, mat: "trinket" },
  // --- amulet ---
  { id: "amulet",     name: "Amulet",     slot: "amulet", use: "any", stat: "hp",  val: 10, w: 6, mat: "trinket" },
  { id: "pendant",    name: "Pendant",    slot: "amulet", use: "any", stat: "def", val: 5,  w: 5, mat: "trinket" },
  { id: "talisman",   name: "Talisman",   slot: "amulet", use: "any", stat: "atk", val: 3,  w: 4, mat: "trinket" },
];

/* Equip slots in display order (single source; Character.gear and the panel read this). */
export const SLOTS = ["weapon", "offhand", "helm", "armor", "gloves", "boots", "ring", "amulet"];

/* Which armour family each class wears (metal = fighter, leather = rogue, cloth = caster).
   Used by Equipment.canEquip to gate `fam`-tagged gear, and by LootGenerator to drop only
   families the party can actually use. */
export const CLASS_FAMILY = { fighter: "metal", rogue: "leather", mage: "cloth", cleric: "cloth" };
