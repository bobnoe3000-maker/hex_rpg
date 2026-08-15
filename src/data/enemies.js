/* ============ DATA :: enemies.js — enemy six-stat blocks ============ */
/* Same schema as heroes (hp/atk/def/dodge/crit/aspd) so combat never branches on team. */
"use strict";

export const ENEMIES = {
  rat:      { name: "Giant Rat",         fig: "rat",      hp: 16,  atk: 5,  def: 6,  dodge: 12, crit: 6,  aspd: 1.30, rng: 1, xp: 6  },
  goblin:   { name: "Goblin",            fig: "goblin",   hp: 22,  atk: 7,  def: 10, dodge: 8,  crit: 8,  aspd: 1.10, rng: 1, xp: 10 },
  kobold:   { name: "Kobold",            fig: "kobold",   hp: 18,  atk: 7,  def: 8,  dodge: 10, crit: 8,  aspd: 1.00, rng: 3, xp: 9  },
  skeleton: { name: "Skeleton",          fig: "skeleton", hp: 28,  atk: 8,  def: 12, dodge: 6,  crit: 8,  aspd: 0.95, rng: 1, xp: 12 },
  wight:    { name: "Barrow Wight",      fig: "wight",    hp: 46,  atk: 11, def: 16, dodge: 6,  crit: 10, aspd: 0.90, rng: 1, xp: 25 },
  dragon:   { name: "Ashwing the Young", fig: "dragon",   hp: 130, atk: 15, def: 22, dodge: 4,  crit: 12, aspd: 0.85, rng: 1, xp: 90, boss: true },
};
