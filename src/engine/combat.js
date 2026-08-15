import { makeEnemy } from '../models/units.js';
import { BAL } from '../data/balance.js';
/* ============ CONTENT :: combat.js — loot pool, loot rolls, XP curve, room specs ============ */
/* Combat *resolution* now lives in systems/CombatSim.js + StatEngine.js. This module is the
   d20-free content layer: what items exist, how loot is rolled, and how rooms are populated.
   (Loot becomes data-driven in Phase 2; rooms become procedural in Phase 5.) */
"use strict";

export const XP_NEXT = [0, 30, 80, 999];

/* Items grant six-stat bonuses (atk/def/hp/dodge/crit/aspd). Phase 1 remap of the
   prototype's d20 items; the prefix+material+type generator arrives in Phase 2. */
export const ITEM_POOL = [
  { n: "Shortsword +1",          slot: "weapon",  use: "knight", r: "common", atk: 2,          d: "+2 ATK" },
  { n: "Flame Blade",            slot: "weapon",  use: "knight", r: "rare",   atk: 4,          d: "+4 ATK" },
  { n: "Dragonbane Greatsword",  slot: "weapon",  use: "knight", r: "epic",   atk: 6, crit: 4, d: "+6 ATK, +4 Crit" },
  { n: "Oak Wand",               slot: "weapon",  use: "mage",   r: "common", atk: 2,          d: "+2 ATK" },
  { n: "Staff of Embers",        slot: "weapon",  use: "mage",   r: "rare",   atk: 4,          d: "+4 ATK" },
  { n: "Archmage Rod",           slot: "weapon",  use: "mage",   r: "epic",   atk: 6, crit: 4, d: "+6 ATK, +4 Crit" },
  { n: "Blessed Mace",           slot: "weapon",  use: "cleric", r: "common", atk: 2,          d: "+2 ATK" },
  { n: "Sunforged Morningstar",  slot: "weapon",  use: "cleric", r: "rare",   atk: 4, def: 2,  d: "+4 ATK, +2 DEF" },
  { n: "Chain Shirt",            slot: "armor",   use: "any",    r: "common", def: 4,          d: "+4 DEF" },
  { n: "Knight's Plate",         slot: "armor",   use: "knight", r: "rare",   def: 10,         d: "+10 DEF" },
  { n: "Robe of Warding",        slot: "armor",   use: "mage",   r: "rare",   def: 5, hp: 8,   d: "+5 DEF, +8 HP" },
  { n: "Aegis of Dawn",          slot: "armor",   use: "cleric", r: "epic",   def: 10, hp: 15, d: "+10 DEF, +15 HP" },
  { n: "Amulet of Vigor",        slot: "trinket", use: "any",    r: "common", hp: 12,          d: "+12 HP" },
  { n: "Ring of Keen Strikes",   slot: "trinket", use: "any",    r: "rare",   atk: 2, crit: 6, d: "+2 ATK, +6 Crit" },
  { n: "Charm of the Phoenix",   slot: "trinket", use: "any",    r: "epic",   hp: 18, crit: 4, d: "+18 HP, +4 Crit" },
];

export function rollLoot(roomIdx, taken) {
  const picks = [], pool = ITEM_POOL.filter(i => !taken.includes(i));
  const take = r2 => {
    const c = pool.filter(i => i.r === r2 && !picks.includes(i));
    return c.length ? c[Math.floor(Math.random() * c.length)] : null;
  };
  picks.push(take(roomIdx >= 2 ? "epic" : roomIdx >= 1 ? "rare" : "common") || take("common"));
  picks.push(take(roomIdx >= 1 ? "rare" : "common") || take("common"));
  picks.push(take("common") || take("rare"));
  return picks.filter(Boolean);
}

/* Roll a single item drop for a slain enemy (or null for no drop).
   `rng` is a ()=>[0,1) so combat drops stay deterministic with the battle seed.
   Rarer items fall less often via DROP_WEIGHT — no rarity tiers, just drop rates.
   Returns a fresh clone so each drop is its own inventory instance. */
export function rollDrop(rng, guaranteed) {
  if (!guaranteed && rng() >= BAL.DROP_CHANCE) return null;
  const weighted = [];
  for (const it of ITEM_POOL) { const w = BAL.DROP_WEIGHT[it.r] || 1; for (let i = 0; i < w; i++) weighted.push(it); }
  const base = weighted[Math.floor(rng() * weighted.length)];
  return { ...base };
}

export const ROOMS_SPEC = [
  { title: "The Emberdeep — Rat Warrens", doorType: "arch", doorLabel: "→ Bone Gallery",
    features: ["puddle", "puddle", "grate", "crack", "moss", "column", "crack"],
    spawn: () => [makeEnemy("rat", 1, 2), makeEnemy("rat", 1, 5), makeEnemy("rat", 2, 3), makeEnemy("goblin", 1, 4), makeEnemy("goblin", 2, 6)] },
  { title: "The Emberdeep — Bone Gallery", doorType: "open", doorLabel: "→ Ashwing's Hoard",
    features: ["column", "column", "pit", "crack", "crack", "moss", "grate"],
    spawn: () => [makeEnemy("skeleton", 1, 2), makeEnemy("skeleton", 1, 5), makeEnemy("skeleton", 2, 6), makeEnemy("wight", 1, 4)] },
  { title: "The Emberdeep — Ashwing's Hoard", doorType: "stairsUp", doorLabel: "↑ Daylight",
    features: ["firepit", "firepit", "column", "crack", "moss", "puddle"],
    spawn: () => [makeEnemy("dragon", 1, 4), makeEnemy("kobold", 2, 2), makeEnemy("kobold", 2, 6)] },
];
