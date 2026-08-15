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
  DROP_CHANCE: 0.06,      // chance a normal enemy drops an item on death (bosses always drop)
  // (per-component drop weights live in data/items/*; rarer components fall less often)

  // silver (the shop/economy currency) — a little from every kill
  SILVER_MULT: 0.4,       // silver ≈ enemy.xp * (SILVER_MULT + rng*SILVER_JITTER)
  SILVER_JITTER: 0.3,

  // runic gems (the Forge currency)
  GEM_CHANCE: 0.06,       // chance a normal enemy drops a runic gem
  GEM_CHANCE_BOSS: 0.90,  // bosses almost always drop one

  // Tavern (hiring companions; party caps at 4 = main + 3)
  TAVERN: { RECRUITS: 3, HIRE_COST: 60, REFRESH_COST: 10 },

  // Shop / economy (silver)
  SHOP: {
    STOCK: 6,           // items on offer at once
    BASE_PRICE: 8,      // price = BASE_PRICE + score*PRICE_MULT + upgradeLevel*UPGRADE_PRICE
    PRICE_MULT: 4,
    UPGRADE_PRICE: 12,
    SELL_FRAC: 0.4,     // sell value = this fraction of buy price
    GEM_PRICE: 120,     // buy a runic gem for silver
    REROLL_COST: 15,    // refresh the shop stock
  },

  // Forge: spend a gem to attempt +1 to an item's primary stat.
  // SUCCESS[level] falls as the item's upgradeLevel rises; on failure, DESTROY[level]
  // is the chance the item shatters (else the attempt just fizzles). Data-driven per level.
  FORGE: {
    MAX_LEVEL: 10,
    SUCCESS: [0.95, 0.88, 0.80, 0.70, 0.60, 0.50, 0.42, 0.34, 0.27, 0.20],
    DESTROY: [0.00, 0.00, 0.05, 0.10, 0.16, 0.22, 0.28, 0.34, 0.40, 0.46],
    STEP: { atk: 1, def: 2, hp: 4, dodge: 2, crit: 2, aspd: 0.05 }, // stat gained per +1
  },
};
