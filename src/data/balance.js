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

  // between-wave recovery (basic-attacks-only; no in-combat healing until skills land)
  WAVE_HEAL_FRAC: 0.15,   // heal this fraction of max HP when a wave is cleared
  REVIVE_HEAL_FRAC: 0.6,  // party revives to this fraction of max HP after a wipe

  // endless-map loop
  RESPAWN_DELAY: 1.6,     // seconds after a wave clears before the next spawns
  REVIVE_DELAY: 2.2,      // seconds after a wipe before the party revives
  DROP_CHANCE: 0.30,      // chance a normal enemy drops an item on death (bosses always drop)
  // (per-component drop weights live in data/items/*; rarer components fall less often)
};
