import { makeEnemy } from '../models/units.js';
/* ============ CONTENT :: combat.js — XP curve + room specs ============ */
/* Combat resolution lives in systems/CombatSim.js + StatEngine.js; loot generation lives in
   systems/LootGenerator.js. This module is just the remaining content: the XP curve and the
   hand-authored room specs (rooms become procedural in Phase 5). */
"use strict";

/* XP curve — no level cap. `xpToReach(L)` is the cumulative XP needed to BE level L; the quadratic
   10·(L²−1) keeps the classic early pacing (L2 = 30, L3 = 80) and scales smoothly forever.
   `xpForNext(L)` is the increment from L to L+1 (= 20L + 10). */
export const xpToReach = lvl => 10 * (lvl * lvl - 1);
export const xpForNext = lvl => xpToReach(lvl + 1) - xpToReach(lvl);

export const ROOMS_SPEC = [
  { title: "The Emberdeep — Rat Warrens", doorType: "arch", doorLabel: "→ Bone Gallery",
    features: ["puddle", "puddle", "grate", "crack", "moss", "column", "crack"],
    spawn: () => [makeEnemy("rat", 1, 2), makeEnemy("rat", 1, 5), makeEnemy("rat", 2, 3), makeEnemy("goblin", 1, 4), makeEnemy("goblin", 2, 6)] },
  { title: "The Emberdeep — Bone Gallery", doorType: "open", doorLabel: "→ Ashwing's Hoard",
    features: ["column", "column", "pit", "crack", "crack", "moss", "grate"],
    spawn: () => [makeEnemy("skeleton", 1, 2), makeEnemy("skeleton", 1, 5), makeEnemy("skeleton", 2, 6), makeEnemy("wight", 1, 4)] },
  { title: "The Emberdeep — Ashwing's Hoard", doorType: "stairsUp", doorLabel: "↑ Daylight",
    features: ["firepit", "firepit", "column", "crack", "moss", "puddle"],
    spawn: () => [makeEnemy("dragon", 1, 4), makeEnemy("kobold", 2, 2), makeEnemy("kobold", 2, 6)] },
];
