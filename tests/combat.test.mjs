/* Headless regression tests for the pure combat + equipment layers (no DOM, no deps).
   Run: node tests/combat.test.mjs   — exits non-zero on failure. */
import { makeHero, makeEnemy, makeCompanion, rollStats, growTo } from "../src/models/units.js";
import { derive, dodgeChance, critChance, mitigate } from "../src/systems/StatEngine.js";
import { resolveAttack } from "../src/systems/CombatSim.js";
import { canEquip, equip, unequip, isUpgrade, itemScore } from "../src/systems/Equipment.js";
import { generate, describeItem } from "../src/systems/LootGenerator.js";
import { upgrade, canUpgrade, primaryStat } from "../src/systems/ForgeSystem.js";
import { priceOf, sellPriceOf } from "../src/systems/Economy.js";
import { xpToReach, xpForNext } from "../src/engine/combat.js";
import { earnedPoints, pointsForLevel, unspentPoints, pointBonus, STAT_STEP } from "../src/systems/Leveling.js";

let fails = 0;
const ok = (name, cond) => { console.log(`${cond ? "PASS" : "FAIL"}  ${name}`); if (!cond) fails++; };
const mb = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

const fighter = makeHero("fighter", 11);
const rat = makeEnemy("rat", 1, 1);

// unified schema: heroes and enemies both derive the same six-stat shape
ok("hero and enemy derive identical stat keys",
  Object.keys(derive(fighter)).sort().join(",") === Object.keys(derive(rat)).sort().join(","));
ok("derive exposes the six stats",
  ["atk","def","dodge","crit","aspd"].every(k => k in derive(fighter)) && "maxhp" in derive(fighter));

// chances are probabilities within the configured clamp
ok("dodgeChance in [0,0.75]", (() => { const c = dodgeChance(rat, fighter); return c >= 0 && c <= 0.75; })());
ok("critChance in [0,0.75]", (() => { const c = critChance(fighter, rat); return c >= 0 && c <= 0.75; })());

// mitigation reduces damage and is monotonic in def
ok("mitigate reduces damage", mitigate(100, 24) < 100);
ok("more def = less damage through", mitigate(100, 40) < mitigate(100, 10));

// determinism: identical seed -> identical result stream; different seed -> differs
const seq = seed => { const r = mb(seed); return Array.from({ length: 12 }, () => JSON.stringify(resolveAttack(fighter, rat, r))).join("|"); };
ok("same seed is reproducible", seq(123) === seq(123));
ok("different seed diverges", seq(123) !== seq(777));

// results are well-formed and damage respects the floor
{
  const r = mb(5); let bad = 0;
  for (let i = 0; i < 2000; i++) { const res = resolveAttack(fighter, rat, r);
    if (res.type === "hit" && !(res.dmg >= 1 && Number.isInteger(res.dmg))) bad++;
    if (res.type !== "hit" && res.type !== "dodge") bad++; }
  ok("every result is dodge or integer hit >= 1", bad === 0);
}

// Equipment: equip / unequip / class restriction
{
  const h = makeHero("fighter", 1);
  const sword = { n: "Test Sword", slot: "weapon", use: "fighter", r: "common", atk: 3 };
  const wand  = { n: "Test Wand",  slot: "weapon", use: "mage",   r: "common", atk: 3 };
  const ring  = { n: "Test Ring",  slot: "amulet", use: "any",   r: "common", hp: 5 };
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

// Two-handed weapons and offhands are mutually exclusive
{
  const h = makeHero("fighter", 1);
  const shield  = { n: "Iron Shield",  slot: "offhand", use: "any", family: "metal", def: 7 };
  const greatsw = { n: "Steel Greatsword", slot: "weapon", use: "fighter", atk: 8, twoH: true };
  const sword   = { n: "Iron Sword",   slot: "weapon", use: "fighter", atk: 3 };
  const inv = [shield, greatsw, sword];
  equip(h, shield, inv);
  ok("offhand equips normally", h.gear.offhand === shield);
  equip(h, greatsw, inv);
  ok("equipping a two-handed weapon frees the offhand", h.gear.weapon === greatsw && h.gear.offhand === null && inv.includes(shield));
  equip(h, shield, inv);
  ok("equipping an offhand frees a two-handed weapon", h.gear.offhand === shield && h.gear.weapon === null && inv.includes(greatsw));
  equip(h, sword, inv); equip(h, shield, inv);
  ok("a one-handed weapon coexists with an offhand", h.gear.weapon === sword && h.gear.offhand === shield);
}

// describeItem tracks the numbers: a forged stat shows up in the description text
{
  const it = generate(mb(88));
  ok("generated description matches describeItem", it.d === describeItem(it));
  // force it to a known stat and re-describe
  it.atk = 99; it.d = describeItem(it);
  ok("rebuilt description reflects the new stat", /\+99 ATK/.test(it.d));
  // a rolled staff is two-handed and says so
  let staff = null; const r = mb(4);
  for (let i = 0; i < 500 && !staff; i++) { const g = generate(r, { classes: ["mage"] }); if (g.parts.type === "staff") staff = g; }
  ok("a staff is flagged two-handed and labelled", !!staff && staff.twoH === true && /Two-handed/.test(staff.d));
}

// LootGenerator: deterministic, valid shape, class-respecting
{
  const g1 = generate(mb(42)), g2 = generate(mb(42));
  ok("generator is deterministic for a seed", JSON.stringify(g1) === JSON.stringify(g2));
  ok("generated item has a name, slot and description", !!g1.n && typeof g1.slot === "string" && g1.slot.length > 0 && typeof g1.d === "string");
  ok("generated item carries at least one stat", ["atk","def","hp","dodge","crit","aspd"].some(k => k in g1));
  ok("upgradeLevel starts at 0", g1.upgradeLevel === 0);
  // class restriction: only fighter-usable weapons/items when we ask for fighter
  const r = mb(7); let offClass = 0;
  for (let i = 0; i < 300; i++) { const it = generate(r, { classes: ["fighter"] });
    if (it.use !== "any" && it.use !== "fighter") offClass++; }
  ok("class-restricted drops are all usable by the party", offClass === 0);
  // a vampiric item carries the lifesteal proc; procVal reads it
  let sawProc = false; const r2 = mb(3);
  for (let i = 0; i < 500 && !sawProc; i++) { const it = generate(r2); if (it.proc && it.proc.kind === "lifesteal") sawProc = true; }
  ok("some items roll a proc (lifesteal exists in the pool)", sawProc);
}

// Armour families: sensible material pairings + class gating (no more "Cotton Mail")
{
  const CLOTH = new Set(["Cotton","Linen","Silk","Wool","Runeweave"]);
  const METAL = new Set(["Iron","Bronze","Steel","Mithril","Adamant"]);
  const LEATHER = new Set(["Leather","Padded","Studded","Wyvernhide","Dragonhide"]);
  const famFor = { metal: METAL, leather: LEATHER, cloth: CLOTH };
  const r = mb(31); let mismatch = 0, sawFam = 0;
  for (let i = 0; i < 800; i++) {
    const it = generate(r);
    if (!it.family) continue;
    sawFam++;
    // the material word in the name must belong to the item's own family
    const words = it.n.split(" ");
    const hitFamWord = words.some(w => famFor[it.family].has(w));
    if (!hitFamWord) mismatch++;
  }
  ok("every family item's material matches its family (no Cotton Mail)", sawFam > 0 && mismatch === 0);

  // fighter-only party never rolls leather/cloth armour
  const rf = mb(17); let offFam = 0;
  for (let i = 0; i < 400; i++) { const it = generate(rf, { classes: ["fighter"] });
    if (it.family && it.family !== "metal") offFam++; }
  ok("a fighter party only finds metal armour", offFam === 0);

  // canEquip enforces the family rule
  const fighterH = makeHero("fighter", 1), mageH = makeHero("mage", 1);
  const plate = { n: "Steel Plate", slot: "armor", use: "any", family: "metal", def: 8 };
  const robe  = { n: "Silk Robe",   slot: "armor", use: "any", family: "cloth", def: 5 };
  ok("a fighter can wear metal but not cloth", canEquip(fighterH, plate) && !canEquip(fighterH, robe));
  ok("a mage can wear cloth but not metal", canEquip(mageH, robe) && !canEquip(mageH, plate));
}

// ForgeSystem: success raises stat+level, determinism, max cap, destroy path
{
  const mk = () => ({ n: "Iron Sword", slot: "weapon", use: "fighter", primary: "atk", atk: 3, upgradeLevel: 0 });
  // rng that always succeeds (returns 0 < any success chance)
  const always = () => 0;
  const it = mk();
  const r = upgrade(it, always);
  ok("successful upgrade raises level and primary stat", r.outcome === "success" && it.upgradeLevel === 1 && it.atk === 4);
  // determinism: same item + same rng stream -> same outcome
  const seq = seed => { const rr = mb(seed); const x = mk(); const outs = []; for (let i = 0; i < 6; i++) outs.push(upgrade(x, rr).outcome + ":" + x.upgradeLevel); return outs.join("|"); };
  ok("forge is deterministic for a seed", seq(9) === seq(9));
  // rng that always fails -> never success; may destroy at higher levels
  const it2 = mk(); it2.upgradeLevel = 5;
  const rFail = () => 0.999; // above any success chance
  const r2 = upgrade(it2, rFail);
  ok("failed upgrade does not raise the stat", r2.outcome !== "success" && it2.atk === 3);
  // max level guard
  const it3 = mk(); it3.upgradeLevel = 99;
  ok("cannot upgrade past max", !canUpgrade(it3) && upgrade(it3, always).outcome === "max");
  // primaryStat fallback picks the biggest stat when none stored
  ok("primaryStat falls back to the largest stat", primaryStat({ def: 8, atk: 2, upgradeLevel: 0 }) === "def");
}

// isUpgrade: an item that scores higher than the equipped slot is flagged
{
  const h = makeHero("fighter", 2);
  const weak = { n: "Iron Sword", slot: "weapon", use: "fighter", atk: 3 };
  const strong = { n: "Steel Greatsword", slot: "weapon", use: "fighter", atk: 7 };
  ok("any item beats an empty slot", isUpgrade(h, weak));
  equip(h, weak, [weak]);
  ok("a higher-scoring item is an upgrade", isUpgrade(h, strong) && itemScore(strong) > itemScore(weak));
  ok("a lower-scoring item is not an upgrade", !isUpgrade(h, { n:"Rusty", slot:"weapon", use:"fighter", atk:1 }));
  ok("wrong-class item is never an upgrade", !isUpgrade(h, { n:"Wand", slot:"weapon", use:"mage", atk:9 }));
}

// Economy: price scales with score/upgrades, sell < buy
{
  const cheap = { n: "Iron Sword", slot: "weapon", use: "fighter", atk: 3, upgradeLevel: 0 };
  const rich  = { n: "Epic Blade", slot: "weapon", use: "fighter", atk: 9, crit: 6, upgradeLevel: 3 };
  ok("a stronger item costs more", priceOf(rich) > priceOf(cheap));
  ok("upgrades add to the price", priceOf({ ...cheap, upgradeLevel: 4 }) > priceOf(cheap));
  ok("sell price is below buy price", sellPriceOf(rich) < priceOf(rich) && sellPriceOf(rich) >= 2);
}

// Character creation: rolled stats, starter gear, companions
{
  const a = rollStats("fighter", 123), b = rollStats("fighter", 123), c = rollStats("fighter", 999);
  ok("rollStats is deterministic for a seed", JSON.stringify(a) === JSON.stringify(b));
  ok("rollStats varies with the seed", JSON.stringify(a) !== JSON.stringify(c));
  ok("rolled stats stay near the class base (±~20%)", a.hp > 40 && a.hp < 75 && a.atk >= 1);
  const h = makeHero("fighter", { statSeed: 7, portraitSeed: 42, name: "Test" });
  ok("created hero keeps its name and rolled seed", h.name === "Test" && h.portraitSeed === 42);
  ok("every hero starts with a weapon, armor and boots", h.gear.armor && h.gear.boots && h.gear.weapon);
  ok("starter armour matches the class family (fighter metal, rogue leather, caster cloth)",
     makeHero("fighter", {}).gear.armor.family === "metal" &&
     makeHero("rogue", {}).gear.armor.family === "leather" &&
     makeHero("mage", {}).gear.armor.family === "cloth" &&
     makeHero("cleric", {}).gear.armor.family === "cloth");
  ok("starter weapon is class-appropriate + carries range (mage ranged, fighter melee)",
     makeHero("mage", {}).gear.weapon.rng > 1 && makeHero("fighter", {}).gear.weapon.rng === 1 && makeHero("rogue", {}).gear.weapon.n === "Worn Dagger");
  const comp = makeCompanion(555), comp2 = makeCompanion(555);
  ok("companions are deterministic per seed", comp.name === comp2.name && comp.cls === comp2.cls);
  ok("companion has a class, name, stats and starter gear",
     ["fighter","mage","cleric"].includes(comp.cls) && !!comp.name && comp.gear.boots && comp.team === 0);
}

// Companion scaling: growTo raises level & stats; makeCompanion(seed, level) scales
{
  const c1 = makeCompanion(2024, 1), c3 = makeCompanion(2024, 3);
  ok("same seed + level is deterministic", JSON.stringify(makeCompanion(2024,3)) === JSON.stringify(c3));
  ok("higher-level companion is the same identity, stronger", c3.cls === c1.cls && c3.name === c1.name && c3.level === 3 && c3.maxhp > c1.maxhp && c3.atk >= c1.atk);
  const h = makeHero("fighter", { statSeed: 1 }); const hp0 = h.maxhp;
  growTo(h, 4);
  ok("growTo lifts level and HP", h.level === 4 && h.maxhp > hp0 && h.hp === h.maxhp);
}

// Leveling: uncapped XP curve + main-hero stat points
{
  // XP curve keeps the classic early thresholds and scales forever (no cap)
  ok("xpToReach matches the classic early curve", xpToReach(2) === 30 && xpToReach(3) === 80 && xpToReach(1) === 0);
  ok("xpForNext grows every level (no cap)", xpForNext(1) === 30 && xpForNext(2) === 50 && xpForNext(50) < xpForNext(200));

  // points per level: 3 → 2 after 50 → 1 after 100
  ok("points per level step down at 50 and 100",
     pointsForLevel(1) === 3 && pointsForLevel(50) === 3 && pointsForLevel(51) === 2 &&
     pointsForLevel(100) === 2 && pointsForLevel(101) === 1);
  ok("earnedPoints is cumulative across the bands",
     earnedPoints(1) === 3 && earnedPoints(50) === 150 && earnedPoints(100) === 250 && earnedPoints(101) === 251);

  // a fresh hero has level-1 points unspent and none committed
  const h = makeHero("fighter", 1);
  ok("new hero starts with its level-1 points unspent", unspentPoints(h) === 3);
  ok("no committed points add nothing in derive", pointBonus(h, "atk") === 0);

  // committing points raises the derived stat by STEP and reduces the unspent pool
  const atk0 = derive(h).atk;
  h.pts.atk = 1;
  ok("a committed ATK point adds STEP.atk to derived ATK", derive(h).atk === atk0 + STAT_STEP.atk);
  ok("committing reduces the unspent pool", unspentPoints(h) === 2);

  // enemies never carry points, so derive stays clean for them
  ok("enemies get no point bonus", pointBonus(rat, "atk") === 0 && !rat.pts);
}

console.log(fails ? `\n${fails} FAILED` : "\nall passed");
process.exit(fails ? 1 : 0);
