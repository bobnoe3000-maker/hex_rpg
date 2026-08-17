/* ============ SYSTEM :: Skills.js — skill trees, points, and combat modifiers ============ */
/* Pure & DOM-free. Reads a hero's `skills:{id:rank}` and runtime `buffs:[]` (timed effects placed by
   the game each tick), and returns the stat/combat modifiers they imply. StatEngine.derive folds in
   the flat/mult results; the game layer applies combatMods() to each hit and reads activeSkills()
   to decide casts. Nothing here imports StatEngine, so there's no cycle. */
"use strict";

import { CLASS_SKILLS, TIER_GATES, MAX_RANK, MAX_POINTS, PTS_PER_STAR } from "../data/skills.js";
import { mulberry32 } from "../core/rng.js";

/* ---- five-star scaling -------------------------------------------------------------- */
/* A skill now holds up to MAX_POINTS (25) lit tips = five full stars, but its `fx` arrays still
   carry MAX_RANK (5) tuning anchors. Two ways to read a value at `pts` points invested:
   • fxNum  — smooth, per-point interpolation of the 5 anchors across the 0→25 range (from 0).
              Used for continuous passive magnitudes so every single point is felt.
              fxNum(arr, R*PTS_PER_STAR) === arr[R-1], so star boundaries reproduce the old ranks.
   • starTier/fxStep — the old integer rank (1..5), one per full star. Used for discrete counts
              (cleave targets, bleed stacks, extra uses …) and, via starTier, to feed the
              unchanged active-cast path so an ability's shape only shifts on a full star. */
export const starTier = pts => Math.max(1, Math.min(MAX_RANK, Math.ceil((pts | 0) / PTS_PER_STAR)));
export function fxNum(arr, pts) {
  if (!arr || !arr.length) return 0;
  const x = Math.max(0, pts | 0) / PTS_PER_STAR;      // 0 … 5
  const i = Math.floor(x);
  const lo = i === 0 ? 0 : (arr[Math.min(i - 1, arr.length - 1)] || 0);
  const hi = arr[Math.min(i, arr.length - 1)] || 0;
  return lo + (hi - lo) * (x - i);
}
export const fxStep = (arr, pts) => (arr ? (arr[starTier(pts) - 1] || 0) : 0);

/* ---- tree lookups ---- */
export function classTree(cls) { return CLASS_SKILLS[cls] || null; }
export function skillDef(cls, id) {
  const t = classTree(cls); if (!t) return null;
  for (const br of ["off", "def"]) { const s = t.skills ? null : t[br].skills.find(x => x.id === id); if (s) return { ...s, br }; }
  return null;
}
export function allSkills(cls) {
  const t = classTree(cls); if (!t) return [];
  return [...t.off.skills.map(s => ({ ...s, br: "off" })), ...t.def.skills.map(s => ({ ...s, br: "def" }))];
}
export const rankOf = (u, id) => (u && u.skills && u.skills[id]) || 0;

/* ---- point economy (main hero) ---- */
/* 1 skill point per level, starting at level 2 — mirrors the stat-point cadence. */
export const earnedSkillPoints = level => Math.max(0, (level | 0) - 1);
export function spentSkillPoints(u) { let n = 0; if (u && u.skills) for (const id in u.skills) n += u.skills[id]; return n; }
export function unspentSkillPoints(u) { return Math.max(0, earnedSkillPoints(u.level || 1) - spentSkillPoints(u)); }
export function branchInvested(u, cls, br) {
  const t = classTree(cls); if (!t) return 0;
  return t[br].skills.reduce((n, s) => n + rankOf(u, s.id), 0);
}
export function tierUnlocked(u, cls, br, tier) { return branchInvested(u, cls, br) >= TIER_GATES[tier]; }

/* ---- derive() inputs ---------------------------------------------------------------- */
/* flat stat bonuses from passive skills + any flat timed buffs */
export function skillFlat(u) {
  const out = { atk: 0, def: 0, hp: 0, dodge: 0, crit: 0, aspd: 0 };
  if (u && u.skills && u.cls) for (const s of allSkills(u.cls)) {
    const r = rankOf(u, s.id); if (!r || !s.fx.flat) continue;
    for (const k in s.fx.flat) out[k] += fxNum(s.fx.flat[k], r);
  }
  if (u && u.buffs) for (const b of u.buffs) if (b.flat) out[b.stat] = (out[b.stat] || 0) + b.v;
  return out;
}
/* multiplier for one stat from missing-HP passives (Berserker / Fortify), given missing-HP fraction */
export function skillMult(u, stat, missing) {
  let m = 1;
  if (u && u.skills && u.cls) for (const s of allSkills(u.cls)) {
    const r = rankOf(u, s.id); if (!r || !s.fx.mult || s.fx.mult.stat !== stat) continue;
    m *= 1 + fxNum(s.fx.mult.pct, r) * Math.max(0, Math.min(1, missing));
  }
  return m;
}
/* multiplier for one stat from timed buffs/debuffs (Guard, Wrath, Momentum, Sunder shred, …) */
export function buffMult(u, stat) {
  let m = 1;
  if (u && u.buffs) for (const b of u.buffs) if (b.mult && b.stat === stat) m *= 1 + b.v;
  return Math.max(0, m);
}

/* ---- per-hit combat modifiers ------------------------------------------------------- */
/* Combined offensive (attacker) + defensive (defender) skill effects for one hit.
   `defHpFrac` = defender.hp / defender maxhp (passed in so we don't import derive). */
export function combatMods(att, def, defHpFrac) {
  const m = { dmgMult: 1, critDefIgnore: 0, critDmgReduce: 0, lifesteal: 0, cleaveTargets: 0, cleavePct: 0, bleed: null };
  if (att && att.skills && att.cls) for (const s of allSkills(att.cls)) {
    const r = rankOf(att, s.id); if (!r) continue; const fx = s.fx;
    if (fx.exec && defHpFrac < fx.exec.thr) m.dmgMult *= 1 + fxNum(fx.exec.pct, r);
    if (fx.critDefIgnore) m.critDefIgnore = Math.max(m.critDefIgnore, fxNum(fx.critDefIgnore, r));
    if (fx.lifesteal) m.lifesteal += fxNum(fx.lifesteal, r);
    if (fx.cleave) { m.cleaveTargets = fxStep(fx.cleave.tg, r); m.cleavePct = fxNum(fx.cleave.pct, r); }
    if (fx.rend) m.bleed = { pct: fxNum(fx.rend.pct, r), dur: fx.rend.dur, stacks: fxStep(fx.rend.stacks, r) };
  }
  if (def && def.skills && def.cls) for (const s of allSkills(def.cls)) {
    const r = rankOf(def, s.id); if (!r) continue; const fx = s.fx;
    if (fx.critDmgReduce) m.critDmgReduce = Math.max(m.critDmgReduce, fxNum(fx.critDmgReduce, r));
  }
  return m;
}
/* reflect / guardian / lastst / waveheal / momentum readouts for the game layer */
export function reflectFrac(u) { return passiveVal(u, "reflect"); }
export function guardianFrac(u) { return passiveVal(u, "guardian"); }
export function waveHealFrac(u) { return passiveVal(u, "waveheal"); }
export function lastStand(u) {
  if (!u || !u.skills || !u.cls) return null;
  for (const s of allSkills(u.cls)) { const r = rankOf(u, s.id); if (r && s.fx.lastst) return { heal: fxNum(s.fx.lastst.heal, r), uses: fxStep(s.fx.lastst.uses, r) }; }
  return null;
}
export function momentum(u) {
  if (!u || !u.skills || !u.cls) return null;
  for (const s of allSkills(u.cls)) { const r = rankOf(u, s.id); if (r && s.fx.momentum) return { pct: fxNum(s.fx.momentum.pct, r), stacks: fxStep(s.fx.momentum.stacks, r), dur: s.fx.momentum.dur }; }
  return null;
}
function passiveVal(u, key) {
  let v = 0;
  if (u && u.skills && u.cls) for (const s of allSkills(u.cls)) { const r = rankOf(u, s.id); if (r && Array.isArray(s.fx[key])) v = Math.max(v, fxNum(s.fx[key], r)); }
  return v;
}

/* ---- companion loadouts ------------------------------------------------------------- */
/* A seeded, class-appropriate kit for an auto-generated companion: exactly 2 active + 3 passive
   skills, drawn from tiers the companion's level would plausibly reach, all at a level-scaled rank.
   Deterministic per seed, so re-rolling the tavern is a real hunt for the kit you want. */
export function rollCompanionSkills(cls, seed, level) {
  const all = allSkills(cls); if (!all.length) return {};
  const maxTier = level <= 3 ? 2 : level <= 6 ? 3 : level <= 11 ? 4 : 5;
  const pool = all.filter(s => s.tier <= maxTier);
  const actives = pool.filter(s => s.type === "active");
  const passives = pool.filter(s => s.type === "passive");
  const r = mulberry32((seed >>> 0) || 1);
  const draw = (arr, n) => { const a = arr.slice(), out = [];
    for (let i = 0; i < n && a.length; i++) out.push(a.splice((r() * a.length) | 0, 1)[0]); return out; };
  // Companions start a kit at a whole number of stars scaled by level (1 star per 3 levels).
  const points = Math.min(MAX_POINTS, Math.max(1, 1 + Math.floor((level - 1) / 3)) * PTS_PER_STAR);
  const skills = {};
  for (const s of [...draw(actives, 2), ...draw(passives, 3)]) skills[s.id] = points;
  return skills;
}
/* resolved skill list for display (name / type / rank / branch), e.g. a companion's kit */
export function heroKit(hero) {
  if (!hero || !hero.skills || !hero.cls) return [];
  const out = [];
  for (const s of allSkills(hero.cls)) { const r = hero.skills[s.id];
    if (r) out.push({ id: s.id, name: s.name, type: s.type, points: r, stars: starTier(r), br: s.br }); }
  return out;
}

/* ---- actives ------------------------------------------------------------------------ */
/* The active skills a unit currently owns (rank>0), with resolved per-rank params. Highest tier
   first, so the caster prefers its strongest ready ability. The game handles cooldowns + casting. */
export function activeSkills(u) {
  if (!u || !u.skills || !u.cls) return [];
  const out = [];
  for (const s of allSkills(u.cls)) {
    const r = rankOf(u, s.id); if (!r || !s.fx.active) continue;
    out.push({ id: s.id, name: s.name, tier: s.tier, rank: starTier(r), points: r, a: s.fx.active });
  }
  return out.sort((x, y) => y.tier - x.tier);
}
