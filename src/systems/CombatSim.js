/* ============ SYSTEM :: CombatSim.js — deterministic combat resolution ============ */
/* Pure & DOM-free. resolveAttack() is the single place a hit is decided, for every unit.
   All randomness is injected via `rng` (a ()=>[0,1) function) so battles are reproducible
   and server-verifiable. Phase 1 = basic attacks only (skills arrive in Phase 3). */
"use strict";

import { BAL } from "../data/balance.js";
import { derive, dodgeChance, critChance, mitigate, procVal } from "./StatEngine.js";

/* Resolve one basic attack from `attacker` against `defender`.
   Returns a plain result object (no DOM, no side effects):
     { type: "dodge" }
     { type: "hit", crit: bool, dmg: number, heal?: number }  // heal = lifesteal to attacker */
export function resolveAttack(attacker, defender, rng) {
  if (rng() < dodgeChance(defender, attacker)) return { type: "dodge" };

  const A = derive(attacker), D = derive(defender);
  const crit = rng() < critChance(attacker, defender);
  let dmg = A.atk * (crit ? BAL.CRIT_MULT : 1);
  dmg = mitigate(dmg, D.def);
  dmg = Math.max(1, Math.round(dmg));

  const res = { type: "hit", crit, dmg };
  const ls = procVal(attacker, "lifesteal");
  if (ls > 0) res.heal = Math.max(1, Math.round(dmg * ls));
  return res;
}
