/* ============ SYSTEM :: Arena.js — PvP ladder of seeded "ghost" rival teams ============ */
/* Pure & DOM-free. Since the game isn't multiplayer, every opponent is a deterministic ghost:
   a rival team is fully reconstructed from its seed + rating, so the SAME ladder appears every
   session (LADDER_SEED) and any rival's roster can be rebuilt on demand for View Team / battle.
   Ratings drive both the ladder order (ELO) and each team's power (rating → level). */
"use strict";

import { mulberry32 } from "../core/rng.js";
import { makeCompanion } from "../models/units.js";
import { derive } from "./StatEngine.js";
import { BAL } from "../data/balance.js";

const A = BAL.ARENA;

/* ---------- tiers & divisions ---------- */
/* A rating maps to a named tier (Bronze…Champion). Each tier's band (its min → the next tier's
   min) is split into three divisions, III (low) → I (high), so climbing shows progress within a
   tier. The top tier is open-ended (no division). */
export function tierOf(rating) {
  const T = A.TIERS;
  let i = 0;
  for (let k = 0; k < T.length; k++) if (rating >= T[k][1]) i = k;
  const [name, min, color] = T[i];
  const top = i === T.length - 1;
  if (top) return { name, color, div: 0, label: name };
  const span = T[i + 1][1] - min;
  // III at the bottom of the band, I at the top
  const frac = Math.max(0, Math.min(0.999, (rating - min) / span));
  const div = 3 - Math.floor(frac * 3);            // 3 → 1
  const ROMAN = { 1: "I", 2: "II", 3: "III" };
  return { name, color, div, label: `${name} ${ROMAN[div]}` };
}

/* absolute rating → level (the ladder's own power curve; used only as a fallback) */
export function ratingToLevel(rating) {
  return Math.max(1, Math.round(A.LEVEL_BASE + rating * A.LEVEL_PER));
}

/* Level a rival's roster is built at FOR A GIVEN PLAYER. So the arena is always a real contest, a
   rival is scaled around the player's own party level, nudged by how its rating compares to yours:
   an Even rival ≈ your level, a Hard one a couple above, a Favoured one a couple below — capped to a
   ±window so a far-off-ladder ghost is a stretch, never hopeless (or trivial). Rating still drives
   the ladder order & rewards; this keeps every matchup winnable so ELO can find your true level. */
export function rivalLevel(rivalRating, playerRating, playerLevel) {
  const L = Math.max(1, playerLevel | 0);
  const rel = Math.round((rivalRating - playerRating) / A.LEVEL_REL);   // ~1 level per LEVEL_REL rating
  const w = A.LEVEL_WINDOW;
  return Math.max(1, Math.min(L + w, Math.max(L - w, L + rel)));
}

/* ---------- procedural rival names ---------- */
const ADJ = ["Iron", "Crimson", "Ashen", "Golden", "Silent", "Savage", "Radiant", "Grim",
  "Emerald", "Frost", "Thunder", "Obsidian", "Wild", "Sacred", "Vengeful", "Azure",
  "Molten", "Twilight", "Dread", "Gilded", "Feral", "Storm", "Ivory", "Scarlet"];
const NOUN = ["Vanguard", "Talons", "Wardens", "Reavers", "Sentinels", "Blades", "Fangs", "Wolves",
  "Phoenix", "Ravens", "Legion", "Covenant", "Marauders", "Bastion", "Hydra", "Serpents",
  "Griffins", "Company", "Order", "Syndicate", "Wraiths", "Vipers", "Titans", "Ember"];
const HOUSE = ["Valebrook", "Ashford", "Draven", "Korr", "Mournhold", "Vaelric", "Thorne",
  "Blackmere", "Ironwood", "Sunspire", "Halloran", "Greymoor", "Duskfell", "Marrow", "Wyrmwood"];

/* deterministic crest glyph for a rival (drawn as a colored initial/rune in the UI) */
const CRESTS = ["✦", "✕", "❖", "⚔", "✧", "▲", "◆", "✷", "✹", "★", "☗", "⬢"];

export function rivalName(seed) {
  const r = mulberry32((seed >>> 0) || 1);
  const pick = a => a[Math.floor(r() * a.length)];
  switch (Math.floor(r() * 4)) {
    case 0: return `The ${pick(ADJ)} ${pick(NOUN)}`;
    case 1: return `House ${pick(HOUSE)}`;
    case 2: return `${pick(NOUN)} of ${pick(ADJ)}`;
    default: return `${pick(HOUSE)}'s ${pick(NOUN)}`;
  }
}

/* ---------- rival teams (ghosts) ---------- */
/* A rival descriptor is cheap: seed + rating + a little flavour. Its actual roster of heroes is
   built lazily (rivalMembers) since most rivals are never inspected or fought. */
export function makeRival(seed, rating) {
  const s = seed >>> 0;
  const r = mulberry32(s || 1);
  const size = 2 + Math.floor(r() * 2);            // 2–3 heroes per rival team
  return {
    seed: s,
    name: rivalName(s ^ 0x9e3779b9),
    crest: CRESTS[Math.floor(r() * CRESTS.length)],
    rating: Math.round(rating),
    size,
    wins: 40 + Math.floor(r() * 160),              // cosmetic ladder record
    losses: 20 + Math.floor(r() * 140),
    _members: null,                                // lazily built roster (cache)
  };
}

/* Build (and cache) a rival's roster at `level`: `size` companions seeded off the rival's seed. The
   first is the team leader. Deterministic per (seed, level) → View Team and the battle see the
   identical squad. Cached by level so re-rendering at the same scale is free. */
export function rivalMembers(team, level = ratingToLevel(team.rating)) {
  const L = Math.max(1, level | 0);
  if (team._members && team._level === L) return team._members;
  const list = [];
  for (let i = 0; i < team.size; i++) {
    const h = makeCompanion((team.seed * 2654435761 + i * 40503) >>> 0, L);
    h.team = 1;                                      // rival side
    list.push(h);
  }
  team._members = list; team._level = L;
  return list;
}

/* summed effective power of a team's roster (a quick strength gauge for cards) */
export function teamPower(team, level) {
  return rivalMembers(team, level).reduce((sum, h) => {
    const d = derive(h);
    return sum + d.maxhp + (d.atk + d.def) * 6;
  }, 0);
}

/* ---------- the ladder ---------- */
/* A fixed board of LADDER_SIZE ghosts, ratings spread evenly TOP→BOT with a little seeded jitter,
   sorted high→low. Cached on the module so the same session reuses one array (rivals keep their
   built rosters). */
let _ladder = null, _ladderKey = null;
export function buildLadder(seed = A.LADDER_SEED, size = A.LADDER_SIZE) {
  const key = `${seed}:${size}`;
  if (_ladder && _ladderKey === key) return _ladder;
  const r = mulberry32((seed >>> 0) || 1);
  const span = A.TOP_RATING - A.BOT_RATING;
  const rivals = [];
  for (let i = 0; i < size; i++) {
    const base = A.TOP_RATING - (span * i) / (size - 1);
    const jitter = (r() * 2 - 1) * (span / size) * 0.6;
    const rating = Math.max(A.BOT_RATING - 40, base + jitter);
    rivals.push(makeRival((seed + i * 0x1000193) >>> 0, rating));
  }
  rivals.sort((a, b) => b.rating - a.rating);
  _ladder = rivals; _ladderKey = key;
  return rivals;
}

/* Where the player's rating slots into the ghost board (1 = top). The player is NOT stored in the
   ladder — they're ranked live against it, so passing the top ghost puts them at rank 1. */
export function playerRank(playerRating, ladder = buildLadder()) {
  let rank = 1;
  for (const g of ladder) if (g.rating > playerRating) rank++;
  return rank;
}

/* total entries on the board including the player */
export function ladderTotal(ladder = buildLadder()) { return ladder.length + 1; }

/* ---------- matchmaking ---------- */
/* Difficulty of a rival relative to you (drives the card's tag/color). */
export function difficultyOf(rivalRating, playerRating) {
  const d = rivalRating - playerRating;
  if (d > 25) return "hard";
  if (d < -25) return "fav";
  return "even";
}

/* Pick three challengers near the player: one tougher, one even, one favourable, drawn from the
   band around the player's rank. `nonce` reshuffles the picks (the "find new rivals" reroll). */
export function pickRivals(playerRating, nonce = 0, ladder = buildLadder()) {
  const r = mulberry32(((playerRating | 0) * 2246822519 + nonce * 3266489917) >>> 0 || 1);
  // candidates within a rating window around the player, nearest first
  const near = ladder
    .map(g => ({ g, d: Math.abs(g.rating - playerRating) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, Math.min(ladder.length, 18))
    .map(x => x.g);
  const harder = near.filter(g => g.rating >= playerRating + 15);
  const easier = near.filter(g => g.rating <= playerRating - 15);
  const even = near.filter(g => Math.abs(g.rating - playerRating) < 60);
  const grab = pool => (pool.length ? pool[Math.floor(r() * pool.length)] : null);
  const chosen = [];
  const push = g => { if (g && !chosen.includes(g)) chosen.push(g); };
  push(grab(harder)); push(grab(even)); push(grab(easier));
  // backfill from the nearest pool if a bucket was empty (low/high ends of the ladder)
  for (const g of near) { if (chosen.length >= 3) break; push(g); }
  return chosen.slice(0, 3);
}

/* ---------- ELO (slice 3 uses this to settle a match) ---------- */
export function eloExpected(playerRating, oppRating) {
  return 1 / (1 + Math.pow(10, (oppRating - playerRating) / 400));
}
export function eloResult(playerRating, oppRating, won) {
  const exp = eloExpected(playerRating, oppRating);
  const delta = Math.round(A.ELO_K * ((won ? 1 : 0) - exp));
  return { delta, next: Math.max(0, playerRating + delta) };
}
