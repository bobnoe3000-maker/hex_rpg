/* Headless regression tests for the pure combat + equipment layers (no DOM, no deps).
   Run: node tests/combat.test.mjs   — exits non-zero on failure. */
import { makeHero, makeEnemy } from "../src/models/units.js";
import { derive, dodgeChance, critChance, mitigate } from "../src/systems/StatEngine.js";
import { resolveAttack } from "../src/systems/CombatSim.js";
import { canEquip, equip, unequip } from "../src/systems/Equipment.js";

let fails = 0;
const ok = (name, cond) => { console.log(`${cond ? "PASS" : "FAIL"}  ${name}`); if (!cond) fails++; };
const mb = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

const knight = makeHero("knight", 11);
const rat = makeEnemy("rat", 1, 1);

// unified schema: heroes and enemies both derive the same six-stat shape
ok("hero and enemy derive identical stat keys",
  Object.keys(derive(knight)).sort().join(",") === Object.keys(derive(rat)).sort().join(","));
ok("derive exposes the six stats",
  ["atk","def","dodge","crit","aspd"].every(k => k in derive(knight)) && "maxhp" in derive(knight));

// chances are probabilities within the configured clamp
ok("dodgeChance in [0,0.75]", (() => { const c = dodgeChance(rat, knight); return c >= 0 && c <= 0.75; })());
ok("critChance in [0,0.75]", (() => { const c = critChance(knight, rat); return c >= 0 && c <= 0.75; })());

// mitigation reduces damage and is monotonic in def
ok("mitigate reduces damage", mitigate(100, 24) < 100);
ok("more def = less damage through", mitigate(100, 40) < mitigate(100, 10));

// determinism: identical seed -> identical result stream; different seed -> differs
const seq = seed => { const r = mb(seed); return Array.from({ length: 12 }, () => JSON.stringify(resolveAttack(knight, rat, r))).join("|"); };
ok("same seed is reproducible", seq(123) === seq(123));
ok("different seed diverges", seq(123) !== seq(777));

// results are well-formed and damage respects the floor
{
  const r = mb(5); let bad = 0;
  for (let i = 0; i < 2000; i++) { const res = resolveAttack(knight, rat, r);
    if (res.type === "hit" && !(res.dmg >= 1 && Number.isInteger(res.dmg))) bad++;
    if (res.type !== "hit" && res.type !== "dodge") bad++; }
  ok("every result is dodge or integer hit >= 1", bad === 0);
}

// Equipment: equip / unequip / class restriction
{
  const h = makeHero("knight", 1);
  const sword = { n: "Test Sword", slot: "weapon", use: "knight", r: "common", atk: 3 };
  const wand  = { n: "Test Wand",  slot: "weapon", use: "mage",   r: "common", atk: 3 };
  const ring  = { n: "Test Ring",  slot: "trinket", use: "any",   r: "common", hp: 5 };
  const inv = [sword, wand, ring];
  ok("class restriction blocks wrong-class item", !canEquip(h, wand) && canEquip(h, sword));
  ok("equip moves item out of the bag", equip(h, sword, inv) && h.gear.weapon === sword && !inv.includes(sword));
  ok("cannot equip other-class item", !equip(h, wand, inv) && h.gear.weapon === sword);
  const before = derive(h);
  equip(h, ring, inv);
  ok("equipping gear raises the derived stat", derive(h).maxhp === before.maxhp + 5);
  const sword2 = { n: "Better Sword", slot: "weapon", use: "any", r: "rare", atk: 6 };
  inv.push(sword2); equip(h, sword2, inv);
  ok("swapping returns the previous item to the bag", h.gear.weapon === sword2 && inv.includes(sword));
  ok("unequip clears the slot and returns to the bag",
    unequip(h, "weapon", inv) && h.gear.weapon === null && inv.includes(sword2));
}

console.log(fails ? `\n${fails} FAILED` : "\nall passed");
process.exit(fails ? 1 : 0);
