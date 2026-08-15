/* ============ DATA :: balance.js — combat tunables (single source of truth) ============ */
/* Phase 1 placeholders. No magic numbers live in systems/ — they read from here. */
"use strict";

export const BAL = {
  // action cadence: seconds between actions at aspd = 1.0 (interval = BASE_INTERVAL / aspd)
  BASE_INTERVAL: 1.30,
  ASPD_JITTER:   0.20,   // small per-action randomization so units don't lock-step

  // damage
  CRIT_MULT: 1.5,        // critical hits deal x this

  // rating -> chance curves:  chance = rating / (rating + K * opponentLevel)
  K_DODGE: 40,
  K_CRIT:  40,
  CHANCE_MIN: 0,
  CHANCE_MAX: 0.75,      // soft cap so nothing becomes un-hittable / always-crit

  // between-room recovery (basic-attacks-only; no in-combat healing until skills land)
  ROOM_HEAL_FRAC: 0.35,
};
