/* ============ SYSTEM :: ArenaBattle.js — headless deterministic PvP battle sim ============ */
/* Pure & DOM-free. Runs a full auto-battle between two teams on an abstract 1-D lane, reusing the
   SAME resolution the live dungeon uses (StatEngine.derive, CombatSim.resolveAttack, the pure
   Skills.js modifiers, and a DOM-free port of the game's skill-cast / buff / hurt logic). Every
   random draw comes from one seeded RNG, so a given matchup always plays out identically — the
   result AND a compact frame timeline for the replay screen fall out of the same run.

   It never mutates the input heroes: each side is cloned (fresh hp/buffs/cooldowns). */
"use strict";

import { mulberry32 } from "../core/rng.js";
import { derive, mitigate } from "./StatEngine.js";
import { resolveAttack } from "./CombatSim.js";
import { combatMods, activeSkills, reflectFrac, guardianFrac, lastStand, momentum, fxNum } from "./Skills.js";
import { BAL } from "../data/balance.js";

const DT = 0.1;              // fixed simulation step (s) — deterministic, ~live cadence
const MAX_TIME = 60;         // hard cap; a stalemate is settled on remaining HP
const MOVE = 1;              // tiles a unit closes/retreats per action

/* clone a hero into a fresh combatant (never touches the source object) */
function clone(src, team, x) {
  const c = { ...src, team, x, buffs: [], cd: {}, mLast: 0, alive: true };
  c.hp = derive(c).maxhp;
  return c;
}

/* lay a team out on its side of the lane: melee in front (nearer centre), ranged behind */
function placeTeam(heroes, team, sign) {
  const order = heroes.slice().sort((a, b) => (derive(a).rng - derive(b).rng)); // melee (rng 1) first
  return order.map((h, j) => clone(h, team, sign * (2 + j)));
}

export function simulateBattle(playerHeroes, rivalHeroes, seed) {
  const rng = mulberry32((seed >>> 0) || 1);
  const P = placeTeam(playerHeroes.filter(h => h), 0, -1);
  const R = placeTeam(rivalHeroes.filter(h => h), 1, +1);
  const all = [...P, ...R];
  const units = all.map(u => ({ name: u.name, cls: u.cls, team: u.team, maxhp: derive(u).maxhp }));
  const idxOf = new Map(all.map((u, i) => [u, i]));

  let now = 0;
  const frames = [];
  const allies = u => (u.team === 0 ? P : R).filter(a => a.alive);
  const enemies = u => (u.team === 0 ? R : P).filter(a => a.alive);
  const teamAlive = arr => arr.some(u => u.alive);

  // ---- snapshot / event recording ----
  const snapHp = () => all.map(u => Math.max(0, Math.round(u.hp)));
  function frame(actor, kind, opts = {}) {
    frames.push({
      t: +now.toFixed(2),
      actor: actor ? idxOf.get(actor) : -1,
      target: opts.target != null ? idxOf.get(opts.target) : -1,
      kind, dmg: opts.dmg || 0, note: opts.note || "",
      hp: snapHp(),
    });
  }

  // ---- pure helpers (DOM-free ports of the game layer) ----
  const dist = (a, b) => Math.abs(a.x - b.x);
  function nearest(u) {
    let best = null, bd = 1e9, bh = 1e9;
    for (const f of enemies(u)) { const d = dist(u, f);
      if (d < bd || (d === bd && f.hp < bh)) { bd = d; bh = f.hp; best = f; } }
    return best;
  }
  const hasBuff = (u, k) => u.buffs.some(b => b.k === k);
  const addBuff = (u, b) => u.buffs.push(b);
  const foesInRange = (u, rad) => enemies(u).filter(f => dist(f, u) <= rad);
  const adjFoes = u => foesInRange(u, 1);
  function lowestHurtAlly(u, thr) {
    let best = null, bf = 2;
    for (const h of allies(u)) { const f = h.hp / Math.max(1, derive(h).maxhp); if (f < bf) { bf = f; best = h; } }
    return (best && bf < (thr == null ? 0.999 : thr)) ? best : null;
  }
  function guardianNear(u) {
    for (const h of allies(u)) { if (h === u) continue; if (guardianFrac(h) > 0 && dist(h, u) <= 1) return h; }
    return null;
  }
  function applyBleed(target, src, bl) {
    const dps = Math.max(1, derive(src).atk * bl.pct);
    const cur = target.buffs.filter(b => b.k === "bleed");
    if (cur.length >= bl.stacks) { cur.sort((a, b) => a.until - b.until)[0].until = now + bl.dur; return; }
    addBuff(target, { k: "bleed", dps, src, until: now + bl.dur, nextTick: now + 0.5 });
  }
  function addMomentum(u, mo) {
    const atkStacks = u.buffs.filter(b => b.k === "mo" && b.stat === "atk").length;
    if (atkStacks < mo.stacks) {
      addBuff(u, { k: "mo", mult: true, stat: "atk", v: mo.pct, until: now + mo.dur });
      addBuff(u, { k: "mo", mult: true, stat: "aspd", v: mo.pct, until: now + mo.dur });
    }
    u.buffs.forEach(b => { if (b.k === "mo") b.until = now + mo.dur; });
  }
  function tickBuffs(u) {
    if (!u.buffs.length) return;
    for (const b of u.buffs) {
      if (b.k === "bleed" && u.alive && now >= b.nextTick) { b.nextTick += 0.5; hurt(u, Math.max(1, Math.round(b.dps * 0.5)), b.src, { silent: true }); }
      if (b.k === "regen" && u.alive && now >= b.nextTick) { b.nextTick += 0.5; const mh = derive(u).maxhp; u.hp = Math.min(mh, u.hp + Math.max(1, Math.round(b.hps * 0.5))); }
    }
    u.buffs = u.buffs.filter(b => b.until == null || now < b.until);
  }

  function hurt(u, dmg, src, opt) {
    if (!u.alive) return;
    opt = opt || {};
    if (hasBuff(u, "immune")) return;
    // Guardian — an adjacent ally soaks part of the blow
    if (!opt.noGuard) { const g = guardianNear(u); if (g) { const gd = Math.max(1, Math.round(dmg * guardianFrac(g))); dmg -= gd; hurt(g, gd, src, { noGuard: true, noReflect: true, silent: true }); } }
    // Shield absorbs before HP
    if (dmg > 0 && u.buffs.length) {
      for (const b of u.buffs) { if (b.k === "shield" && b.v > 0) { const a = Math.min(b.v, dmg); b.v -= a; dmg -= a; if (dmg <= 0) break; } }
      u.buffs = u.buffs.filter(b => b.k !== "shield" || b.v > 0);
    }
    if (dmg <= 0) return;
    // Retaliation — reflect melee damage back to the attacker
    if (!opt.noReflect && src && src.alive && src.team !== u.team && derive(src).rng <= 1) {
      const rfr = reflectFrac(u); if (rfr > 0) hurt(src, Math.max(1, Math.round(dmg * rfr)), u, { noReflect: true, noGuard: true, silent: true });
    }
    u.hp -= dmg;
    if (u.hp <= 0) {
      const ls = lastStand(u);
      if (ls && (u.mLast || 0) < ls.uses) { u.mLast = (u.mLast || 0) + 1; u.hp = Math.max(1, Math.round(derive(u).maxhp * ls.heal)); frame(u, "laststand", { note: `${u.name} refuses to fall!` }); return; }
      u.hp = 0; u.alive = false;
      frame(u, "death", { note: `${u.name} falls`, target: u });
      if (u.team !== (src ? src.team : -1) && src && src.alive) { const mo = momentum(src); if (mo) addMomentum(src, mo); }
    }
  }

  // ---- basic attack (mirror of game.js attack + its cleave/bleed/lifesteal) ----
  function attack(att, def) {
    const dhf = def.hp / Math.max(1, derive(def).maxhp);
    const mods = combatMods(att, def, dhf);
    const res = resolveAttack(att, def, rng, mods);
    if (res.type === "dodge") { frame(att, "dodge", { target: def, note: `${def.name} dodges` }); return; }
    hurt(def, res.dmg, att);
    if (res.heal && att.alive) { const mh = derive(att).maxhp; att.hp = Math.min(mh, att.hp + res.heal); }
    if (mods.bleed && def.alive) applyBleed(def, att, mods.bleed);
    if (mods.cleaveTargets > 0) {
      let hitN = 0;
      for (const f of enemies(att)) { if (f === def || dist(f, att) > 1) continue; if (hitN >= mods.cleaveTargets) break; hitN++;
        const cd = Math.max(1, Math.round(mitigate(derive(att).atk * mods.cleavePct, derive(f).def))); hurt(f, cd, att); }
    }
    frame(att, res.crit ? "crit" : "hit", { target: def, dmg: res.dmg });
  }

  // ---- active skill (DOM-free port of game.js castActive) ----
  function castActive(u, s, tg) {
    const a = s.a, r = s.rank, atk = derive(u).atk, def = derive(u).def;
    const mag = arr => Array.isArray(arr) ? fxNum(arr, s.points) : (arr || 0);
    let dealt = 0;
    const hit = (foe, dmg) => { if (!foe.alive) return; const d = Math.max(1, Math.round(mitigate(dmg, derive(foe).def))); dealt += d; hurt(foe, d, u); };
    switch (a.kind) {
      case "sunder": { hit(tg, atk * a.dmg); const sh = mag(a.shred); addBuff(tg, { k: "shred", mult: true, stat: "def", v: -sh, until: now + a.dur });
        if (r >= 5) adjFoes(u).forEach(f => { if (f !== tg) addBuff(f, { k: "shred", mult: true, stat: "def", v: -sh, until: now + a.dur }); }); break; }
      case "whirl": adjFoes(u).forEach(f => { hit(f, atk * mag(a.dmg)); if (r >= a.bleedAt) applyBleed(f, u, { pct: .06, dur: 4, stacks: 1 }); }); break;
      case "rampage": for (let i = 0; i < a.hits; i++) hit(tg, atk * mag(a.dmg)); break;
      case "wrath": { adjFoes(u).forEach(f => hit(f, atk * a.dmg)); const bf = mag(a.buff);
        allies(u).forEach(h => addBuff(h, { k: "wrath", mult: true, stat: "atk", v: bf, until: now + a.dur })); break; }
      case "guard": addBuff(u, { k: "guard", mult: true, stat: "def", v: mag(a.def), until: now + a.dur }); break;
      case "taunt": { const dur = a.dur[r - 1]; addBuff(u, { k: "taunt", until: now + dur });
        if (a.defBuff[r - 1] > 0) addBuff(u, { k: "taunt", mult: true, stat: "def", v: mag(a.defBuff), until: now + dur }); break; }
      case "bash": hit(tg, def * a.dmg); if (tg.alive) addBuff(tg, { k: "stun", until: now + a.stun[r - 1] }); break;
      case "rally": { const sh = Math.round(derive(u).maxhp * mag(a.shield)); allies(u).forEach(h => addBuff(h, { k: "shield", v: sh, until: now + 12 })); break; }
      case "unbreak": { const dur = a.dur[r - 1]; addBuff(u, { k: "immune", until: now + dur }); addBuff(u, { k: "taunt", until: now + dur });
        const heal = Math.round(derive(u).maxhp * mag(a.heal)); u.hp = Math.min(derive(u).maxhp, u.hp + heal); break; }
      case "bolt": hit(tg, atk * mag(a.dmg));
        if (tg.alive) {
          if (a.burn && a.burn[r - 1] > 0) applyBleed(tg, u, { pct: a.burn[r - 1], dur: 3, stacks: 1 });
          if (a.mark && a.mark[r - 1] > 0) addBuff(tg, { k: "mark", mult: true, stat: "def", v: -mag(a.mark), until: now + (a.dur || 5) });
          if (a.slow && a.slow[r - 1] > 0) addBuff(tg, { k: "slow", mult: true, stat: "aspd", v: -mag(a.slow), until: now + 3 });
          if (a.stun && a.stun[r - 1] > 0) addBuff(tg, { k: "stun", until: now + a.stun[r - 1] });
        } break;
      case "nova": foesInRange(u, a.radius || 2).forEach(f => { hit(f, atk * mag(a.dmg));
        if (a.slow && a.slow[r - 1] > 0) addBuff(f, { k: "slow", mult: true, stat: "aspd", v: -mag(a.slow), until: now + 3 });
        if (a.stun && a.stun[r - 1] > 0) addBuff(f, { k: "stun", until: now + a.stun[r - 1] }); }); break;
      case "heal": { const imm = Array.isArray(a.immune) ? a.immune[r - 1] : 0;
        const targets = a.party ? allies(u) : [lowestHurtAlly(u)].filter(Boolean);
        targets.forEach(t => { const mh = derive(t).maxhp, amt = Math.round(mh * mag(a.pct)); t.hp = Math.min(mh, t.hp + amt); if (imm) addBuff(t, { k: "immune", until: now + imm }); }); break; }
      case "buff": { const dur = Array.isArray(a.dur) ? a.dur[r - 1] : (a.dur || 6);
        const targets = a.party ? allies(u) : [u];
        targets.forEach(t => {
          if (a.stat) addBuff(t, { k: "sbuff", mult: !a.flat, flat: !!a.flat, stat: a.stat, v: mag(a.v), until: now + dur });
          if (a.shield) { const sh = Math.round(derive(u).maxhp * mag(a.shield)); addBuff(t, { k: "shield", v: sh, until: now + 12 }); }
        }); break; }
    }
    frame(u, "cast", { target: tg, dmg: dealt, note: `${u.name} casts ${s.name}` });
  }

  function tryCast(u, tg) {
    const acts = activeSkills(u); if (!acts.length) return false;
    const Rr = derive(u).rng, d = dist(u, tg);
    for (const s of acts) {
      if (now < (u.cd[s.id] || 0)) continue;
      const k = s.a.kind, fits =
        (k === "rally" || k === "buff") ? true :
        k === "heal" ? !!lowestHurtAlly(u, 0.72) :
        k === "unbreak" ? (u.hp / derive(u).maxhp < 0.55 || adjFoes(u).length >= 2) :
        k === "nova" ? foesInRange(u, s.a.radius || 2).length >= 1 :
        (k === "guard" || k === "taunt") ? d <= 2 :
        d <= Math.max(1, Rr);
      if (!fits) continue;
      u.cd[s.id] = now + s.a.cd[s.rank - 1];
      castActive(u, s, tg);
      return true;
    }
    return false;
  }

  // ---- one action (move / attack / cast) — mirror of game.js act() plain chase+kite ----
  function act(u) {
    if (!u.alive || hasBuff(u, "stun")) return;
    const tg = nearest(u); if (!tg) return;
    if (tryCast(u, tg)) return;
    const Rr = derive(u).rng, d = dist(u, tg);
    const toward = () => { u.x += Math.sign(tg.x - u.x) * MOVE; };
    const away = () => { u.x -= Math.sign(tg.x - u.x) * MOVE; };
    if (Rr > 1) {
      if (d <= BAL.KITE_MIN) { away(); return; }
      if (d <= Rr) { attack(u, tg); return; }
      toward(); return;
    }
    if (d <= Rr) attack(u, tg); else toward();
  }

  // ---- fixed-step loop ----
  for (const u of all) u.next = rng() * BAL.ASPD_JITTER;   // stagger first actions
  frame(null, "start", { note: "Battle begins" });
  while (now < MAX_TIME && teamAlive(P) && teamAlive(R)) {
    now += DT;
    for (const u of all) if (u.alive) tickBuffs(u);
    for (const u of all) {
      if (!u.alive) continue;
      if (now >= u.next) { act(u); u.next = now + BAL.BASE_INTERVAL / Math.max(0.1, derive(u).aspd) + rng() * BAL.ASPD_JITTER; }
    }
  }

  const pAlive = P.filter(u => u.alive).length, rAlive = R.filter(u => u.alive).length;
  let won;
  if (!teamAlive(R)) won = true;
  else if (!teamAlive(P)) won = false;
  else {  // timeout → settle on remaining HP fraction
    const frac = arr => arr.reduce((s, u) => s + Math.max(0, u.hp) / Math.max(1, derive(u).maxhp), 0) / arr.length;
    won = frac(P) >= frac(R);
  }
  frame(null, won ? "win" : "loss", { note: won ? "Victory" : "Defeat" });

  return {
    won, seed: seed >>> 0, duration: +now.toFixed(1),
    units, frames,
    survivors: { player: pAlive, rival: rAlive },
    finalHp: snapHp(),
  };
}
