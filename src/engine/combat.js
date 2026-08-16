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

/* A descent is up to seven rooms. Each names a floor SHAPE (see dungeon.js SHAPES), a pool of
   walkable decorative TILES, how many BLOCKERS to attempt (pit/column/firepit, always placed so
   they can't strand a tile), the EXIT kinds to render as portals, and its wave. Spawns no longer
   carry fixed r/c — the game drops each foe on a random reachable floor cell. */
export const ROOMS_SPEC = [
  { title: "The Emberdeep — Rat Warren", shape: "full", blockers: 2,
    tiles: ["crack", "moss", "grate", "puddle", "bones", "rubble"], exits: ["onward"],
    spawn: () => [makeEnemy("rat"), makeEnemy("rat"), makeEnemy("rat"), makeEnemy("goblin"), makeEnemy("goblin")] },
  { title: "The Emberdeep — Bone Gallery", shape: "cross", blockers: 3, blockerKinds: ["column", "pit"],
    tiles: ["bones", "bones", "crack", "rubble", "ash", "grate"], exits: ["onward"],
    spawn: () => [makeEnemy("skeleton"), makeEnemy("skeleton"), makeEnemy("skeleton"), makeEnemy("goblin")] },
  { title: "The Emberdeep — Ember Causeway", shape: "causeway", blockers: 1, blockerKinds: ["fire", "column"],
    tiles: ["ember", "ash", "crack", "rubble"], exits: ["onward"],
    spawn: () => [makeEnemy("kobold"), makeEnemy("kobold"), makeEnemy("goblin")] },
  { title: "The Emberdeep — Fungal Hollow", shape: "cavern", blockers: 2, blockerKinds: ["column", "pit"],
    tiles: ["mushroom", "moss", "rune", "puddle", "crack"], exits: ["shrine", "onward"],
    spawn: () => [makeEnemy("goblin"), makeEnemy("kobold"), makeEnemy("skeleton")] },
  { title: "The Emberdeep — Flooded Vault", shape: "ring", blockers: 3, blockerKinds: ["column", "pit"],
    tiles: ["puddle", "puddle", "rune", "moss", "grate"], exits: ["vault", "onward"],
    spawn: () => [makeEnemy("skeleton"), makeEnemy("skeleton"), makeEnemy("wight")] },
  { title: "The Emberdeep — Ashen Approach", shape: "cross", blockers: 3, blockerKinds: ["fire", "column", "pit"],
    tiles: ["ember", "ash", "bones", "rubble"], exits: ["onward"],
    spawn: () => [makeEnemy("wight"), makeEnemy("kobold"), makeEnemy("kobold"), makeEnemy("skeleton")] },
  { title: "The Emberdeep — Ashwing's Hoard", shape: "cavern", blockers: 2, blockerKinds: ["fire", "column"],
    tiles: ["ember", "ember", "ash", "bones"], exits: ["stair"],
    spawn: () => [makeEnemy("dragon"), makeEnemy("kobold"), makeEnemy("kobold")] },
];
