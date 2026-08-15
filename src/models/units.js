/* ============ MODEL :: units.js — build hero & enemy unit instances ============ */
/* One unit shape for both teams: identity + the six base stats + runtime fields.
   Effective stats always come from StatEngine.derive() — never read raw fields for combat. */
"use strict";

import { HERO_BASES } from "../data/classes.js";
import { ENEMIES } from "../data/enemies.js";
import { SLOTS } from "../data/items/gearTypes.js";

export function makeHero(cls, seed) {
  const b = HERO_BASES[cls];
  const gear = {};
  for (const s of SLOTS) gear[s] = null;
  return {
    name: b.name, cls: b.cls, team: 0, level: 1, xp: 0, rng: b.rng,
    hp: b.hp, maxhp: b.hp, atk: b.atk, def: b.def, dodge: b.dodge, crit: b.crit, aspd: b.aspd,
    gear,
    alive: true, seed, figSeed: (seed * 7 + 3) | 0,
  };
}

let _figCounter = 0; // deterministic-ish figure variety without Math.random
export function makeEnemy(kind, r, c) {
  const b = ENEMIES[kind];
  return {
    name: b.name, fig: b.fig, team: 1, level: 1, boss: !!b.boss, rng: b.rng, xp: b.xp,
    hp: b.hp, maxhp: b.hp, atk: b.atk, def: b.def, dodge: b.dodge, crit: b.crit, aspd: b.aspd,
    r, c, alive: true, figSeed: ((++_figCounter) * 2654435761) >>> 0 & 0x7fffffff,
  };
}
