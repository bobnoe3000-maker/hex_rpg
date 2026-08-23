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

  // formation AI: the party fights as a unit — tanks hold the front, casters/support stay behind.
  LEASH: 4,          // a hero this many tiles from the party centroid regroups instead of chasing
  BACK_STANDOFF: 2,  // back-line units (ranged/support) keep at least this far from the nearest foe

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
  ROAM_STALL: 12,         // roaming floor: seconds with no foe damage before the stall guard re-forms the level
                          //   (so a straggler the party can't path to never hangs the floor). Unreachable
                          //   stragglers re-form at 1×; a reachable-but-unreached foe waits for the 2× backstop.

  // Offline progress: while the app is closed, the party "keeps farming" the dungeon+level you left it
  // on and earns a fraction of your live rate. Only pays out if you exited mid-delve (never from town).
  OFFLINE: {
    MAX_HOURS: 8,     // cap on how long the party keeps earning while you're away
    RATE: 0.10,       // offline yield = this fraction of your live farming rate (10%)
    TAU: 240,         // seconds — window of the live farm-rate moving average (recent activity dominates)
    MIN_SAMPLE: 45,   // need this much established rate (accumulated farm-seconds) before offline pays out
    MIN_AWAY: 120,    // ignore gaps shorter than this (seconds) — no popup for a quick app-switch
  },
  DROP_CHANCE: 0.015,     // chance a normal enemy drops an item on death (bosses always drop) — kept low so the Loot Roll popup stays occasional
  // (per-component drop weights live in data/items/*; rarer components fall less often)

  // tiered dungeons: enemy stats scale to a room's level as base*(1 + rate*(level-1)). Roughly linear
  // to track the (roughly-linear) party power curve, so a Lv-N pack is a fair fight for a Lv-N party.
  // Tuned against tests/balance.sim.mjs so difficulty stays consistent (a gentle ramp) 1→100 while
  // the party keeps pace via level-up points + tier-scaled loot. (Lv 100 skeleton ≈ hp×48, atk×25.)
  ENEMY_SCALE: { hp: 0.48, atk: 0.24, def: 0.18, dodge: 0.05, crit: 0.04, xp: 0.35 },
  // flat multiplier on every NON-boss enemy's final ATK — a global difficulty dial so trash packs
  // (and their focus-fire on a squishy hero) hit softer without touching HP/DEF pacing or bosses.
  ENEMY_ATK_MULT: 0.8,
  // Every dungeon boss spawns from this normalized level-1 block (scaled to the band top by
  // ENEMY_SCALE), NOT from its figure's archetype — so a boss's difficulty is consistent across
  // dungeons and the dragon figure can't make a tier unwinnable. Tuned against tests/balance.sim.mjs.
  BOSS_BASE: { hp: 125, atk: 13, def: 18, dodge: 5, crit: 10, aspd: 0.92, rng: 1, xp: 90 },
  // Mini-boss (guards the descent on the Misty Wetlands' upper levels): boss-flavoured but softer than
  // a floor boss — a real wall you must break to go deeper, without being a full boss fight.
  MINIBOSS_BASE: { hp: 78, atk: 12, def: 15, dodge: 5, crit: 10, aspd: 0.95, rng: 1, xp: 55 },
  // Elite NPCs (random, spawn as you progress the roaming floor — "a bit harder"). A normal roster
  // enemy, level-bumped and beefed, that (with bosses) is the only non-boss to drop gear.
  ELITE: { LEVEL_BUMP: 3, HP_MULT: 1.7, ATK_MULT: 1.35, CHANCE: 0.34, CHANCE_PER_LEVEL: 0.12, XP_MULT: 2.4 },
  // Gear-drop odds on the Misty Wetlands roaming floor, by champion tier (ordinary foes never drop gear).
  ROAM_GEAR: { ELITE: 0.25, MINIBOSS: 0.5, BOSS: 1.0 },
  // loot scales with a dungeon's tier (1–10): rolled stat values ×(1 + LOOT_POWER_STEP*(tier-1)),
  // and drop/gem rates rise a little each tier. A dungeon's dropFloor sets the worst rarity it rolls.
  // The 0.75 step is what keeps party gear pacing enemy scaling through the deep tiers.
  LOOT_POWER_STEP: 0.75,
  DROP_CHANCE_PER_TIER: 0.005,  // + this to DROP_CHANCE per tier above 1 (capped below)
  DROP_CHANCE_MAX: 0.075,
  FIRST_CLEAR_GRADE_BUMP: 1,    // first boss kill guarantees a drop, floor lifted this many grades
  // Loot Roll: rerolling a drop costs (BASE + tier*TIER) × GROWTH^n — rises per reroll within a drop
  // (n resets each drop) and scales with the dungeon tier, so chasing epics burns silver.
  LOOT_REROLL_BASE: 15, LOOT_REROLL_TIER: 8, LOOT_REROLL_GROWTH: 1.6,
  POTION_DROP_CHANCE: 0.05,     // chance a slain foe drops a potion (bosses always do); size scales with tier

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
  TAVERN: { RECRUITS: 3, HIRE_BASE: 40, HIRE_PER_LEVEL: 20, REFRESH_COST: 10,
            RECALL_BASE: 15, RECALL_PER_LEVEL: 6 },   // fee to call a benched reserve back into the party

  // Temple: resurrect a fallen hero; fee = RESURRECT_BASE + level*RESURRECT_PER_LEVEL
  TEMPLE: { RESURRECT_BASE: 30, RESURRECT_PER_LEVEL: 20 },

  // Level-up points (MAIN hero only — companions use the fixed per-class growth in classes.js).
  // No level cap. PER_LEVEL points earned per level: 3 up to L50, 2 up to L100, then 1.
  // STEP = how much one point raises each assignable stat.
  POINTS: {
    PER_LEVEL: [{ upTo: 50, pts: 3 }, { upTo: 100, pts: 2 }, { upTo: Infinity, pts: 1 }],
    STEP: { hp: 4, atk: 1, def: 1, dodge: 1, crit: 1 },   // one point = +4 HP, or +1 to any other stat
    // Per-class affinity ADDED to STEP for that class's signature stats, so a point spent scales
    // toward the class's identity (applies to the main hero's point-buy AND companion stat rolls).
    CLASS_STEP: {
      fighter: { hp: 1, def: 1 },   // hp +5/pt, def +2/pt
      mage:    { atk: 2 },          // atk +3/pt
      rogue:   { crit: 1, dodge: 1 }, // crit +2/pt, dodge +2/pt
      cleric:  { def: 1, atk: 1 },  // def +2/pt, atk +2/pt
    },
  },

  // Respec: wiping the skill tree refunds every point for silver — cost rises with how much is invested.
  SKILL_RESPEC: { BASE: 40, PER_POINT: 15 },

  // PvP Arena (The Proving Grounds). A ladder of seeded "ghost" rival teams + you, ranked by ELO rating.
  ARENA: {
    START_RATING: 1000,
    LADDER_SIZE: 60,             // number of ghost teams on the board
    LADDER_SEED: 0x5eed4a2b,     // fixed master seed → the same ladder every session
    TOP_RATING: 2180, BOT_RATING: 840,   // the ghost ladder's rating span (player can pass the top)
    LEVEL_BASE: 1, LEVEL_PER: 0.03,      // absolute rating→level fallback: round(BASE + rating*PER)
    LEVEL_REL: 45,              // a rival scales to your level ±1 per this much rating difference…
    LEVEL_WINDOW: 6,            // …capped to ±this many levels, so every match is winnable (not hopeless/trivial)
    ELO_K: 32,                  // rating swing per match
    DAILY_RANKED: 10,           // ranked battles per day (unranked "practice" is unlimited)
    // battle rewards. Ranked wins pay the full purse (scaled by the rival's tier), a loss a small
    // consolation; practice pays a token amount. Valor is the arena currency (banked for a future vendor).
    REWARD: { WIN_VALOR: 40, WIN_SILVER: 60, WIN_GEM_CHANCE: 0.5,
              LOSS_VALOR: 10, LOSS_SILVER: 12,
              PRACTICE_VALOR: 3, TIER_BONUS: 0.14 },   // +TIER_BONUS × tierIndex to the win purse
    // named tiers: [name, minRating, color]; a tier band is split into three divisions (III low → I high)
    TIERS: [
      ["Bronze", 0, "#b08d57"], ["Iron", 1100, "#8a8f99"], ["Steel", 1300, "#9fb0c3"],
      ["Silver", 1500, "#cfd6e0"], ["Gold", 1650, "#e0b063"], ["Ember", 1850, "#ff8a5a"], ["Champion", 2050, "#c78aff"],
    ],
  },

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
