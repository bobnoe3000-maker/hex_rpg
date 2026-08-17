/* ============ DATA :: enemies.js — enemy six-stat blocks ============ */
/* Same schema as heroes (hp/atk/def/dodge/crit/aspd) so combat never branches on team. */
"use strict";

export const ENEMIES = {
  rat:      { name: "Giant Rat",         fig: "rat",      hp: 16,  atk: 5,  def: 6,  dodge: 12, crit: 6,  aspd: 1.30, rng: 1, xp: 6  },
  goblin:   { name: "Goblin",            fig: "goblin",   hp: 22,  atk: 7,  def: 10, dodge: 8,  crit: 8,  aspd: 1.10, rng: 1, xp: 10 },
  kobold:   { name: "Kobold",            fig: "kobold",   hp: 18,  atk: 7,  def: 8,  dodge: 10, crit: 8,  aspd: 1.00, rng: 3, xp: 9  },
  skeleton: { name: "Skeleton",          fig: "skeleton", hp: 28,  atk: 8,  def: 12, dodge: 6,  crit: 8,  aspd: 0.95, rng: 1, xp: 12 },
  wight:    { name: "Barrow Wight",      fig: "wight",    hp: 46,  atk: 11, def: 16, dodge: 6,  crit: 10, aspd: 0.90, rng: 1, xp: 25 },

  // ---- expanded roster: swarm / fodder / ranged / assassin (low tier) ----
  spider:   { name: "Cave Spider",       fig: "spider",   hp: 14,  atk: 6,  def: 5,  dodge: 16, crit: 10, aspd: 1.45, rng: 1, xp: 8  }, // fast swarm skirmisher
  slime:    { name: "Bog Slime",         fig: "slime",    hp: 34,  atk: 5,  def: 11, dodge: 2,  crit: 2,  aspd: 0.75, rng: 1, xp: 11 }, // sturdy fodder wall
  harpy:    { name: "Shriek Harpy",      fig: "wyvern",   hp: 20,  atk: 8,  def: 6,  dodge: 16, crit: 10, aspd: 1.25, rng: 2, xp: 13 }, // evasive ranged
  cutthroat:{ name: "Cutthroat",         fig: "rogue",    hp: 24,  atk: 9,  def: 9,  dodge: 12, crit: 18, aspd: 1.15, rng: 1, xp: 14 }, // high-crit assassin

  // ---- expanded roster: tank / artillery / bruiser / striker (elite, deep rooms) ----
  golem:    { name: "Stone Golem",       fig: "golem",    hp: 72,  atk: 10, def: 26, dodge: 2,  crit: 4,  aspd: 0.70, rng: 1, xp: 28 }, // wall / tank
  lich:     { name: "Barrow Lich",       fig: "lich",     hp: 40,  atk: 14, def: 10, dodge: 6,  crit: 14, aspd: 1.05, rng: 3, xp: 30 }, // ranged artillery
  troll:    { name: "Mire Troll",        fig: "troll",    hp: 60,  atk: 18, def: 14, dodge: 3,  crit: 8,  aspd: 0.72, rng: 1, xp: 32 }, // heavy bruiser
  wyvern:   { name: "Fen Wyvern",        fig: "wyvern",   hp: 55,  atk: 16, def: 12, dodge: 12, crit: 12, aspd: 1.15, rng: 1, xp: 34 }, // aerial striker

  dragon:   { name: "Ashwing the Young", fig: "dragon",   hp: 130, atk: 15, def: 22, dodge: 4,  crit: 12, aspd: 0.85, rng: 1, xp: 90, boss: true },
};
