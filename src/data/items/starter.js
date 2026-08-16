/* ============ DATA :: items/starter.js — the basic kit every character begins with ============ */
/* Fighters start in metal, rogues in leather, casters in cloth — matching the armour families
   they'll wear for the rest of the run. Everyone gets generic worn boots. Fresh instances per
   call so heroes don't share the same item object. */
"use strict";

/* a basic starting weapon per class (carries `rng`, so range is weapon-driven from the start:
   mages/casters begin ranged, martials begin melee) */
const STARTER_WEAPON = {
  fighter: { n: "Wooden Sword",    slot: "weapon", use: "fighter", atk: 2,  rng: 1, primary: "atk",  d: "+2 ATK" },
  mage:    { n: "Apprentice Wand", slot: "weapon", use: "mage",    atk: 2,  rng: 4, primary: "atk",  d: "+2 ATK · Ranged" },
  cleric:  { n: "Worn Mace",       slot: "weapon", use: "cleric",  atk: 2,  rng: 1, primary: "atk",  d: "+2 ATK" },
  rogue:   { n: "Worn Dagger",     slot: "weapon", use: "rogue",   crit: 3, rng: 1, primary: "crit", d: "+3 Crit" },
};

/* starting body armour per class — carries `family` so it obeys the same equip rules as loot */
const STARTER_ARMOR = {
  fighter: { n: "Bronze Cuirass", slot: "armor", family: "metal",   def: 3,   primary: "def",   d: "+3 DEF" },
  rogue:   { n: "Leather Vest",   slot: "armor", family: "leather", dodge: 3, primary: "dodge", d: "+3 Dodge" },
  mage:    { n: "Cloth Robe",     slot: "armor", family: "cloth",   def: 2,   primary: "def",   d: "+2 DEF" },
  cleric:  { n: "Cloth Robe",     slot: "armor", family: "cloth",   def: 2,   primary: "def",   d: "+2 DEF" },
};

export function starterGear(cls) {
  const a = STARTER_ARMOR[cls] || STARTER_ARMOR.fighter;
  const armor = { ...a, use: "any", grade: "plain", upgradeLevel: 0, proc: null };
  const boots = { n: "Worn Boots", slot: "boots", use: "any", dodge: 2, grade: "plain", upgradeLevel: 0, primary: "dodge", proc: null, d: "+2 Dodge" };
  const w = STARTER_WEAPON[cls] || STARTER_WEAPON.fighter;
  const weapon = { ...w, grade: "plain", upgradeLevel: 0, proc: null };
  return { weapon, armor, boots };
}
