/* ============ SYSTEM :: StatEngine.js — derive final stats + chance curves ============ */
/* Pure & DOM-free (headless-testable). One derive() for heroes AND enemies, so combat
   never branches on team. dodge/crit are ratings; effective chance is contested vs level. */
"use strict";

import { BAL } from "../data/balance.js";
import { pointBonus } from "./Leveling.js";

const clampN = (v, a, b) => Math.max(a, Math.min(b, v));

/* sum a stat bonus across a unit's equipped gear (heroes); enemies have no gear */
export function gearSum(u, key) {
  let t = 0;
  if (u && u.gear) for (const slot in u.gear) {
    const it = u.gear[slot];
    if (it && it[key]) t += it[key];
  }
  return t;
}

/* final six-stats for any unit = base + gear + spent level-up points (main hero only; others have
   no points). The single stat source of truth. */
export function derive(u) {
  return {
    maxhp: Math.max(1,   Math.round(u.maxhp + gearSum(u, "hp")    + pointBonus(u, "hp"))),
    atk:   Math.max(0,   u.atk   + gearSum(u, "atk")   + pointBonus(u, "atk")),
    def:   Math.max(0,   u.def   + gearSum(u, "def")   + pointBonus(u, "def")),
    dodge: Math.max(0,   u.dodge + gearSum(u, "dodge") + pointBonus(u, "dodge")),
    crit:  Math.max(0,   u.crit  + gearSum(u, "crit")  + pointBonus(u, "crit")),
    aspd:  Math.max(0.1, u.aspd  + gearSum(u, "aspd")),
    // range comes from the equipped weapon (ranged weapon → ranged); unarmed falls back to the
    // unit's innate range (mages still cast at range; enemies use their base rng).
    rng:   (u.gear && u.gear.weapon && u.gear.weapon.rng) || u.rng || 1,
    level: u.level || 1,
  };
}

/* chance the defender avoids the attacker's hit entirely */
export function dodgeChance(defender, attacker) {
  const dodge = derive(defender).dodge, lvl = derive(attacker).level;
  return clampN(dodge / (dodge + BAL.K_DODGE * lvl), BAL.CHANCE_MIN, BAL.CHANCE_MAX);
}

/* chance the attacker lands a critical hit against the target */
export function critChance(attacker, target) {
  const crit = derive(attacker).crit, lvl = derive(target).level;
  return clampN(crit / (crit + BAL.K_CRIT * lvl), BAL.CHANCE_MIN, BAL.CHANCE_MAX);
}

/* diminishing-returns armor: fraction of damage that gets through */
export function mitigate(dmg, def) {
  return dmg * (100 / (100 + def));
}

/* total value of a named proc across a unit's equipped gear (e.g. "lifesteal") */
export function procVal(u, kind) {
  let t = 0;
  if (u && u.gear) for (const slot in u.gear) {
    const it = u.gear[slot];
    if (it && it.proc && it.proc.kind === kind) t += it.proc.val;
  }
  return t;
}
