/* ============ CONTENT :: combat.js — XP curve ============ */
/* Combat resolution lives in systems/CombatSim.js + StatEngine.js; loot generation lives in
   systems/LootGenerator.js; the room specs now live in data/dungeons.js (the tiered descent).
   This module is just the XP curve. */
"use strict";

/* XP curve — no level cap. `xpToReach(L)` is the cumulative XP needed to BE level L; the quadratic
   10·(L²−1) keeps the classic early pacing (L2 = 30, L3 = 80) and scales smoothly forever.
   `xpForNext(L)` is the increment from L to L+1 (= 20L + 10). */
export const xpToReach = lvl => 10 * (lvl * lvl - 1);
export const xpForNext = lvl => xpToReach(lvl + 1) - xpToReach(lvl);
