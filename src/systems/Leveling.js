/* ============ SYSTEM :: Leveling.js — level-up stat points (main hero) ============ */
/* Pure & DOM-free. The MAIN hero gains no automatic per-class growth; instead each level grants
   assignable points (3/level up to L50, 2 up to L100, then 1) that the player spends on stats via
   the character panel. Companions keep the fixed class growth in classes.js and never use points.
   All tunables live in data/balance.js (BAL.POINTS). */
"use strict";

import { BAL } from "../data/balance.js";

export const STAT_STEP = BAL.POINTS.STEP;                 // { hp, atk, def, dodge, crit } per point — class-neutral base
export const ASSIGNABLE = Object.keys(STAT_STEP);         // the stats points can be spent on
const CLASS_STEP = BAL.POINTS.CLASS_STEP || {};           // per-class affinity added on top of STEP

/* How much ONE point raises `key` for this class — the base STEP plus any class affinity.
   Accepts a class string or a hero object; falls back to the class-neutral step. */
export function stepFor(clsOrHero, key) {
  const cls = clsOrHero && typeof clsOrHero === "object" ? clsOrHero.cls : clsOrHero;
  const base = STAT_STEP[key] || 0;
  const bonus = (cls && CLASS_STEP[cls] && CLASS_STEP[cls][key]) || 0;
  return base + bonus;
}

/* points granted for reaching a single level */
export function pointsForLevel(level) {
  for (const band of BAL.POINTS.PER_LEVEL) if (level <= band.upTo) return band.pts;
  return 1;
}

/* total points a hero has earned by its current level (cumulative). Points begin at level 2 — a
   freshly created level-1 hero has none until its first level-up. */
export function earnedPoints(level) {
  let total = 0;
  for (let L = 2; L <= level; L++) total += pointsForLevel(L);
  return total;
}

/* points a hero has already committed to stats */
export function spentPoints(hero) {
  let s = 0;
  if (hero.pts) for (const k of ASSIGNABLE) s += hero.pts[k] || 0;
  return s;
}

/* points still available to spend (never negative) */
export function unspentPoints(hero) {
  return Math.max(0, earnedPoints(hero.level || 1) - spentPoints(hero));
}

/* the stat bonus a hero's committed points add to one stat (fed into StatEngine.derive).
   Scaled by the hero's class affinity, so the same allocation is worth more on a class's key stats. */
export function pointBonus(hero, key) {
  return hero && hero.pts && STAT_STEP[key] ? (hero.pts[key] || 0) * stepFor(hero, key) : 0;
}

/* a fresh, empty allocation block for a new hero */
export function emptyPoints() {
  const p = {};
  for (const k of ASSIGNABLE) p[k] = 0;
  return p;
}
