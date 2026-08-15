/* Headless regression tests for the pure combat layer (no DOM, no deps).
   Run: node tests/combat.test.mjs   — exits non-zero on failure. */
import { makeHero, makeEnemy } from "../src/models/units.js";
import { derive, dodgeChance, critChance, mitigate } from "../src/systems/StatEngine.js";
import { resolveAttack } from "../src/systems/CombatSim.js";

let fails = 0;
const ok = (name, cond) => { console.log(`${cond ? "PASS" : "FAIL"}  ${name}`); if (!cond) fails++; };
const mb = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

const knight = makeHero("knight", 11);
const rat = makeEnemy("rat", 1, 1);

// unified schema: heroes and enemies both derive the same six-stat shape
const hk = Object.keys(derive(knight)).sort().join(",");
const rk = Object.keys(derive(rat)).sort().join(",");
ok("hero and enemy derive identical stat keys", hk === rk);
ok("derive exposes the six stats", ["hp","atk","def","dodge","crit","aspd"].every(k =>
  k === "hp" ? "maxhp" in derive(knight) : k in derive(knight)));

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
const r = mb(5); let bad = 0;
for (let i = 0; i < 2000; i++) { const res = resolveAttack(knight, rat, r);
  if (res.type === "hit" && !(res.dmg >= 1 && Number.isInteger(res.dmg))) bad++;
  if (res.type !== "hit" && res.type !== "dodge") bad++; }
ok("every result is dodge or integer hit >= 1", bad === 0);

console.log(fails ? `\n${fails} FAILED` : "\nall passed");
process.exit(fails ? 1 : 0);
