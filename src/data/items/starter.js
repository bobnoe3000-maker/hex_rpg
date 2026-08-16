/* ============ DATA :: items/starter.js — the basic kit every character begins with ============ */
/* Martial classes start in wooden armor, casters in cloth — everyone gets worn boots.
   Fresh instances per call so heroes don't share the same item object. */
"use strict";

/* a basic starting weapon per class (carries `rng`, so range is weapon-driven from the start:
   mages/casters begin ranged, martials begin melee) */
const STARTER_WEAPON = {
  knight: { n: "Wooden Sword",    slot: "weapon", use: "knight", atk: 2,  rng: 1, primary: "atk",  d: "+2 ATK" },
  mage:   { n: "Apprentice Wand", slot: "weapon", use: "mage",   atk: 2,  rng: 4, primary: "atk",  d: "+2 ATK · Ranged" },
  cleric: { n: "Worn Mace",       slot: "weapon", use: "cleric", atk: 2,  rng: 1, primary: "atk",  d: "+2 ATK" },
  rogue:  { n: "Worn Dagger",     slot: "weapon", use: "rogue",  crit: 3, rng: 1, primary: "crit", d: "+3 Crit" },
};

export function starterGear(cls) {
  const caster = cls === "mage" || cls === "cleric";
  const armor = cls === "rogue"
    ? { n: "Leather Vest", slot: "armor", use: "any", dodge: 3, grade: "plain", upgradeLevel: 0, primary: "dodge", proc: null, d: "+3 Dodge" }
    : caster
    ? { n: "Cloth Robe",   slot: "armor", use: "any", def: 2, grade: "plain", upgradeLevel: 0, primary: "def", proc: null, d: "+2 DEF" }
    : { n: "Wooden Armor", slot: "armor", use: "any", def: 3, grade: "plain", upgradeLevel: 0, primary: "def", proc: null, d: "+3 DEF" };
  const boots = { n: "Worn Boots", slot: "boots", use: "any", dodge: 2, grade: "plain", upgradeLevel: 0, primary: "dodge", proc: null, d: "+2 Dodge" };
  const w = STARTER_WEAPON[cls] || STARTER_WEAPON.knight;
  const weapon = { ...w, grade: "plain", upgradeLevel: 0, proc: null };
  return { weapon, armor, boots };
}
