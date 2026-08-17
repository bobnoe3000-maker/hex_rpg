/* ============ MODEL :: units.js — build hero & enemy unit instances ============ */
/* One unit shape for both teams: identity + the six base stats + runtime fields.
   Effective stats always come from StatEngine.derive(). Pure & DOM-free. */
"use strict";

import { mulberry32 } from "../core/rng.js";
import { HERO_BASES } from "../data/classes.js";
import { ENEMIES } from "../data/enemies.js";
import { SLOTS } from "../data/items/gearTypes.js";
import { starterGear } from "../data/items/starter.js";
import { emptyPoints } from "../systems/Leveling.js";
import { rollCompanionSkills } from "../systems/Skills.js";
import { COMPANION_NAMES } from "../data/names.js";
import { BAL } from "../data/balance.js";

const ENEMY_SCALE = BAL.ENEMY_SCALE;

const CLASSES = ["fighter", "mage", "cleric", "rogue"];

/* Roll a hero's six stats from a class base with per-stat variance (seeded → re-rollable). */
export function rollStats(cls, seed) {
  const b = HERO_BASES[cls];
  const r = mulberry32((seed >>> 0) || 1);
  const vary = (v, amt) => v * (1 + (r() * 2 - 1) * amt);
  return {
    hp:    Math.max(1, Math.round(vary(b.hp, 0.15))),
    atk:   Math.max(1, Math.round(vary(b.atk, 0.15))),
    def:   Math.max(0, Math.round(vary(b.def, 0.15))),
    dodge: Math.max(0, Math.round(vary(b.dodge, 0.20))),
    crit:  Math.max(0, Math.round(vary(b.crit, 0.20))),
    aspd:  Math.round(vary(b.aspd, 0.08) * 100) / 100,
  };
}

/* Build a hero. opts (or a bare number for legacy seed):
     { seed, statSeed, portraitSeed, name }
   statSeed present → rolled stats, else class base. Everyone gets starter gear. */
export function makeHero(cls, opts = {}) {
  if (typeof opts === "number") opts = { seed: opts };
  const b = HERO_BASES[cls];
  const seed = opts.seed != null ? opts.seed : (opts.portraitSeed != null ? opts.portraitSeed : 1);
  const pSeed = (opts.portraitSeed != null ? opts.portraitSeed : seed * 101 + 7) | 0;
  const stats = opts.statSeed != null
    ? rollStats(cls, opts.statSeed)
    : { hp: b.hp, atk: b.atk, def: b.def, dodge: b.dodge, crit: b.crit, aspd: b.aspd };

  const gear = {};
  for (const s of SLOTS) gear[s] = null;
  const kit = starterGear(cls);
  gear.weapon = kit.weapon;
  gear.armor = kit.armor;
  gear.boots = kit.boots;

  return {
    name: opts.name || b.name, cls: b.cls, team: 0, level: 1, xp: 0, rng: b.rng,
    hp: stats.hp, maxhp: stats.hp, atk: stats.atk, def: stats.def, dodge: stats.dodge, crit: stats.crit, aspd: stats.aspd,
    pts: emptyPoints(),   // spent level-up stat points (only the main hero allocates these)
    skills: {},           // learned skills → rank (main hero; companions get a loadout in a later phase)
    potion: null,         // equipped consumable brew {type,size,qty} — auto-quaffed in battle
    pendRolls: 0, pendRoll: null,   // companion level-up roll queue (companions only)
    gear, alive: true, seed, figSeed: pSeed, portraitSeed: pSeed,
  };
}

/* Grow a hero to `level` by applying its class growth (level-ups). Mutates and refills HP. */
export function growTo(hero, level) {
  const gr = HERO_BASES[hero.cls].growth;
  while (hero.level < level) {
    hero.level++;
    hero.atk += gr.atk; hero.def += gr.def; hero.dodge += gr.dodge; hero.crit += gr.crit; hero.maxhp += gr.hp;
  }
  hero.hp = hero.maxhp;
  return hero;
}

/* A randomly-generated companion (class, name, rolled stats & portrait, starter gear),
   grown to `level` so recruits can scale with the player. */
export function makeCompanion(seed, level = 1) {
  const r = mulberry32((seed >>> 0) || 1);
  const cls = CLASSES[Math.floor(r() * CLASSES.length)];
  const name = COMPANION_NAMES[Math.floor(r() * COMPANION_NAMES.length)];
  const h = makeHero(cls, { name, statSeed: (seed * 13 + 1) >>> 0, portraitSeed: (seed * 7 + 5) >>> 0 });
  growTo(h, Math.max(1, level));
  h.skills = rollCompanionSkills(cls, (seed * 2654435761) >>> 0, h.level);   // seeded 2-active/3-passive kit
  return h;
}

/* Scale an archetype's level-1 baseline up to `level`, in place. The rates are a linear fraction of
   base per level (mirrors the roughly-linear hero growth so a Lv-N pack stays a fair fight for a
   Lv-N party) and live in BAL.ENEMY_SCALE for the balance pass. HP/ATK/DEF carry the fight; dodge
   and crit ramp gently (they're rating-vs-level curves already); xp climbs so deeper = richer. */
export function scaleEnemy(e, level) {
  const L = Math.max(1, level | 0), s = L - 1, S = ENEMY_SCALE;
  e.level = L;
  e.maxhp = Math.max(1, Math.round(e.maxhp * (1 + S.hp * s)));
  e.hp = e.maxhp;
  e.atk = Math.max(1, Math.round(e.atk * (1 + S.atk * s)));
  e.def = Math.round(e.def * (1 + S.def * s));
  e.dodge = Math.round(e.dodge * (1 + S.dodge * s));
  e.crit = Math.round(e.crit * (1 + S.crit * s));
  e.xp = Math.max(1, Math.round(e.xp * (1 + S.xp * s)));
  return e;
}

let _figCounter = 0; // deterministic-ish figure variety without Math.random
/* makeEnemy(kind, opts) — opts = { r, c, level, name, boss, stats, xp }. Legacy positional
   makeEnemy(kind,r,c) still works (a numeric/absent second arg is read as r). `level` (>1) scales
   the baseline; `name`/`boss` override the flavour; `stats` overrides the six-stat block entirely
   (bosses pass a normalized BOSS_BASE so a boss's power is consistent regardless of which figure
   represents it — the dragon figure no longer makes a dungeon unwinnable). */
export function makeEnemy(kind, opts, c) {
  const b = ENEMIES[kind];
  if (typeof opts === "number" || opts == null) opts = { r: opts, c }; // legacy (kind, r, c)
  const s = opts.stats || b;                                            // stat block (boss override or archetype)
  const e = {
    name: opts.name || b.name, fig: b.fig, team: 1, level: 1,
    boss: opts.boss != null ? !!opts.boss : !!b.boss,
    rng: opts.rng != null ? opts.rng : (s.rng != null ? s.rng : b.rng),
    xp: opts.xp != null ? opts.xp : (s.xp != null ? s.xp : b.xp),
    hp: s.hp, maxhp: s.hp, atk: s.atk, def: s.def, dodge: s.dodge, crit: s.crit, aspd: s.aspd,
    r: opts.r, c: opts.c, alive: true, figSeed: ((++_figCounter) * 2654435761) >>> 0 & 0x7fffffff,
  };
  if (opts.level) scaleEnemy(e, opts.level);
  return e;
}
