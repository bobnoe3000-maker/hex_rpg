/* ============ DATA :: stats.js — the six character stats ============ */
"use strict";

/* Single definition of the stat set the whole game speaks in.
   dodge & crit are RATINGS (contested vs opponent level), not raw percentages. */
export const STATS = [
  { key: "hp",    label: "HP",    kind: "pool"   },
  { key: "atk",   label: "ATK",   kind: "flat"   },
  { key: "def",   label: "DEF",   kind: "flat"   },
  { key: "dodge", label: "Dodge", kind: "rating" },
  { key: "crit",  label: "Crit",  kind: "rating" },
  { key: "aspd",  label: "Speed", kind: "rate"   },
];

export const STAT_KEYS = STATS.map(s => s.key);
