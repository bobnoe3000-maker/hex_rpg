/* ============ DATA :: items/starter.js — the basic kit every character begins with ============ */
/* Martial classes start in wooden armor, casters in cloth — everyone gets worn boots.
   Fresh instances per call so heroes don't share the same item object. */
"use strict";

export function starterGear(cls) {
  const caster = cls === "mage" || cls === "cleric";
  const armor = cls === "rogue"
    ? { n: "Leather Vest", slot: "armor", use: "any", dodge: 3, grade: "plain", upgradeLevel: 0, primary: "dodge", proc: null, d: "+3 Dodge" }
    : caster
    ? { n: "Cloth Robe",   slot: "armor", use: "any", def: 2, grade: "plain", upgradeLevel: 0, primary: "def", proc: null, d: "+2 DEF" }
    : { n: "Wooden Armor", slot: "armor", use: "any", def: 3, grade: "plain", upgradeLevel: 0, primary: "def", proc: null, d: "+3 DEF" };
  const boots = { n: "Worn Boots", slot: "boots", use: "any", dodge: 2, grade: "plain", upgradeLevel: 0, primary: "dodge", proc: null, d: "+2 Dodge" };
  return { armor, boots };
}
