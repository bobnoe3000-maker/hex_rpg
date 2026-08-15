/* ============ DATA :: items/prefixes.js — prefixes (one stat + optional proc) ============ */
/* `normal` = no proc, no bonus (the most common roll). Others grant a stat and may carry a
   proc (a special effect). `w` = drop weight (proc prefixes are rarer).
   Proc effects are applied in combat via StatEngine.procVal / CombatSim (lifesteal wired now;
   more procs land with the status-effect / skill pass). */
"use strict";

export const PREFIXES = [
  { id: "normal",   name: "",         stat: null,    val: 0,   proc: null,                              w: 8 },
  { id: "keen",     name: "Keen",     stat: "crit",  val: 4,   proc: null,                              w: 4 },
  { id: "brutal",   name: "Brutal",   stat: "atk",   val: 2,   proc: null,                              w: 4 },
  { id: "sturdy",   name: "Sturdy",   stat: "def",   val: 3,   proc: null,                              w: 4 },
  { id: "vital",    name: "Vital",    stat: "hp",    val: 6,   proc: null,                              w: 4 },
  { id: "swift",    name: "Swift",    stat: "aspd",  val: 0.1, proc: null,                              w: 3 },
  { id: "vampiric", name: "Vampiric", stat: "atk",   val: 1,   proc: { kind: "lifesteal", val: 0.25 },  w: 1 },
];
