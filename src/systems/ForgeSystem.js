/* ============ SYSTEM :: ForgeSystem.js — runic-gem item upgrades ============ */
/* Pure & DOM-free. Spend a gem to attempt +1 to an item's primary stat: success chance
   diminishes as the item's upgradeLevel rises, and on failure there's a growing chance the
   item shatters. All odds live in data/balance.js. `rng` is injected. */
"use strict";

import { BAL } from "../data/balance.js";

const round1 = v => Math.round(v * 10) / 10;

/* the stat the Forge upgrades: the item's stored primary, else its largest stat bonus */
export function primaryStat(item) {
  if (item.primary) return item.primary;
  const stats = ["atk", "def", "hp", "dodge", "crit", "aspd"];
  let best = "atk", bv = -Infinity;
  for (const s of stats) if (item[s] !== undefined && item[s] > bv) { bv = item[s]; best = s; }
  return best;
}

export function canUpgrade(item) {
  return !!item && (item.upgradeLevel | 0) < BAL.FORGE.MAX_LEVEL;
}

/* Attempt one upgrade. Mutates `item` on success. Returns:
     { outcome: "success", stat, step } | { outcome: "fail" } | { outcome: "destroyed" } | { outcome: "max" } */
export function upgrade(item, rng) {
  const lvl = item.upgradeLevel | 0;
  if (lvl >= BAL.FORGE.MAX_LEVEL) return { outcome: "max" };

  const clampIdx = arr => arr[Math.min(lvl, arr.length - 1)];
  if (rng() < clampIdx(BAL.FORGE.SUCCESS)) {
    const st = primaryStat(item);
    const step = BAL.FORGE.STEP[st] || 1;
    item[st] = round1((item[st] || 0) + step);
    item.upgradeLevel = lvl + 1;
    return { outcome: "success", stat: st, step };
  }
  if (rng() < clampIdx(BAL.FORGE.DESTROY)) return { outcome: "destroyed" };
  return { outcome: "fail" };
}
