/* ============ SYSTEM :: StatEngine.js — derive final stats + chance curves ============ */
/* Pure & DOM-free (headless-testable). One derive() for heroes AND enemies, so combat
   never branches on team. dodge/crit are ratings; effective chance is contested vs level. */
"use strict";

import { BAL } from "../data/balance.js";
import { pointBonus } from "./Leveling.js";
import { skillFlat, skillMult, buffMult } from "./Skills.js";

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

/* final six-stats for any unit = base + gear + spent level-up points + skills/buffs. The single
   stat source of truth. Skill passives fold in as flat bonuses; Berserker/Fortify and timed buffs
   (Guard, Wrath, Momentum, Sunder shred, …) fold in as multipliers. */
export function derive(u) {
  const F = skillFlat(u);
  const maxhp = Math.max(1, Math.round(u.maxhp + gearSum(u, "hp") + pointBonus(u, "hp") + F.hp));
  const missing = 1 - clampN((u.hp != null ? u.hp : maxhp) / maxhp, 0, 1);
  // atk/def/dodge/crit are whole-number stats (multipliers can make them fractional, and float math
  // leaves noise like 23.7999997) — round them here, the single source of truth, so every readout is
  // clean and combat works in integers. aspd stays a fine-grained speed, trimmed to 2 dp to kill float dust.
  const r2 = v => Math.round(v * 100) / 100;
  return {
    maxhp,
    atk:   Math.round(Math.max(0, (u.atk + gearSum(u, "atk") + pointBonus(u, "atk") + F.atk) * skillMult(u, "atk", missing) * buffMult(u, "atk"))),
    def:   Math.round(Math.max(0, (u.def + gearSum(u, "def") + pointBonus(u, "def") + F.def) * skillMult(u, "def", missing) * buffMult(u, "def"))),
    dodge: Math.round(Math.max(0, u.dodge + gearSum(u, "dodge") + pointBonus(u, "dodge") + F.dodge)),
    crit:  Math.round(Math.max(0, u.crit  + gearSum(u, "crit")  + pointBonus(u, "crit")  + F.crit)),
    aspd:  Math.max(0.1, r2((u.aspd + gearSum(u, "aspd") + F.aspd) * buffMult(u, "aspd"))),
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
