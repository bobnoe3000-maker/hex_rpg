/* ============ DATA :: balance.js — combat tunables (single source of truth) ============ */
/* Phase 1 placeholders. No magic numbers live in systems/ — they read from here. */
"use strict";

export const BAL = {
  // action cadence: seconds between actions at aspd = 1.0 (interval = BASE_INTERVAL / aspd)
  BASE_INTERVAL: 1.30,
  ASPD_JITTER:   0.20,   // small per-action randomization so units don't lock-step

  // kiting: a ranged unit backs off (instead of shooting) when a foe closes within this distance,
  // keeping the classic attack/retreat dance. Melee units ignore this.
  KITE_MIN: 1,

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
  BOSS_RESPAWN: 600,      // seconds the dungeon boss stays down before it returns (trash farms in between)
  DROP_CHANCE: 0.06,      // chance a normal enemy drops an item on death (bosses always drop)
  // (per-component drop weights live in data/items/*; rarer components fall less often)

  // tiered dungeons: enemy stats scale to a room's level as base*(1 + rate*(level-1)). Roughly linear
  // to track the (roughly-linear) hero growth curve, so a Lv-N pack is a fair fight for a Lv-N party.
  // First-pass numbers — the balance pass tunes these. (Lv 100 skeleton ≈ hp×55, atk×29, def×22.)
  ENEMY_SCALE: { hp: 0.55, atk: 0.28, def: 0.22, dodge: 0.05, crit: 0.04, xp: 0.35 },
  // loot scales with a dungeon's tier (1–10): rolled stat values ×(1 + LOOT_POWER_STEP*(tier-1)),
  // and drop/gem rates rise a little each tier. A dungeon's dropFloor sets the worst rarity it rolls.
  LOOT_POWER_STEP: 0.55,
  DROP_CHANCE_PER_TIER: 0.02,   // + this to DROP_CHANCE per tier above 1 (capped below)
  DROP_CHANCE_MAX: 0.30,
  FIRST_CLEAR_GRADE_BUMP: 1,    // first boss kill guarantees a drop, floor lifted this many grades

  // silver (the shop/economy currency) — a little from every kill
  SILVER_MULT: 0.4,       // silver ≈ enemy.xp * (SILVER_MULT + rng*SILVER_JITTER)
  SILVER_JITTER: 0.3,

  // runic gems (the Forge currency)
  GEM_CHANCE: 0.06,       // chance a normal enemy drops a runic gem
  GEM_CHANCE_BOSS: 0.90,  // bosses almost always drop one

  // starting purse: enough to hire two level-1 companions (+ a reroll)
  STARTING_SILVER: 130,

  // Tavern (hiring companions; party caps at 4 = main + 3)
  // recruits scale to the main hero's level; hire = HIRE_BASE + level*HIRE_PER_LEVEL
  TAVERN: { RECRUITS: 3, HIRE_BASE: 40, HIRE_PER_LEVEL: 20, REFRESH_COST: 10 },

  // Temple: resurrect a fallen hero; fee = RESURRECT_BASE + level*RESURRECT_PER_LEVEL
  TEMPLE: { RESURRECT_BASE: 30, RESURRECT_PER_LEVEL: 20 },

  // Level-up points (MAIN hero only — companions use the fixed per-class growth in classes.js).
  // No level cap. PER_LEVEL points earned per level: 3 up to L50, 2 up to L100, then 1.
  // STEP = how much one point raises each assignable stat.
  POINTS: {
    PER_LEVEL: [{ upTo: 50, pts: 3 }, { upTo: 100, pts: 2 }, { upTo: Infinity, pts: 1 }],
    STEP: { hp: 4, atk: 1, def: 1, dodge: 1, crit: 1 },   // one point = +4 HP, or +1 to any other stat
  },

  // Respec: wiping the skill tree refunds every point for silver — cost rises with how much is invested.
  SKILL_RESPEC: { BASE: 40, PER_POINT: 15 },

  WIPE_DELAY: 1.6,        // seconds after a full wipe before you're pulled back to the Keep

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
    // Each attempt costs runic gems AND silver, both rising with the item's current upgrade level.
    // gems   = GEM_BASE + floor(level / GEM_PER)   (1 → +3 → +6 … buys another gem)
    // silver = SILVER_BASE + level * SILVER_PER    (linear ramp)
    COST: { GEM_BASE: 1, GEM_PER: 3, SILVER_BASE: 20, SILVER_PER: 15 },
  },
};
