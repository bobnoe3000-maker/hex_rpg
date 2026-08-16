/* Balance simulation — models a representative party vs. each dungeon tier and reports win-rate,
   survival, and time-to-kill, so the enemy/loot scaling can be tuned against real combat math
   (uses the actual derive() + resolveAttack() + combatMods()). Dev tool, not a CI gate.
   Run: node tests/balance.sim.mjs   (optionally a single tier: node tests/balance.sim.mjs 7) */
import { makeHero, makeEnemy, makeCompanion, growTo } from "../src/models/units.js";
import { derive } from "../src/systems/StatEngine.js";
import { resolveAttack } from "../src/systems/CombatSim.js";
import { generate } from "../src/systems/LootGenerator.js";
import { canEquip, itemScore } from "../src/systems/Equipment.js";
import { combatMods } from "../src/systems/Skills.js";
import { allSkills } from "../src/systems/Skills.js";
import { TIER_GATES, MAX_RANK } from "../src/data/skills.js";
import { earnedPoints } from "../src/systems/Leveling.js";
import { earnedSkillPoints } from "../src/systems/Skills.js";
import { DUNGEONS, LAYOUTS, BOSS_ROOM } from "../src/data/dungeons.js";
import { BAL } from "../src/data/balance.js";

const mb = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const SLOTS = ["weapon","offhand","helm","armor","gloves","boots","ring","amulet"];

/* live-tune knobs via env so a sweep doesn't need editing balance.js:
   ENEMY_HP=.4 ENEMY_ATK=.18 ENEMY_DEF=.15 LOOT_STEP=.85 BOSS_HP=110 BOSS_ATK=12 node tests/balance.sim.mjs */
const env = (k, d) => process.env[k] != null ? +process.env[k] : d;
BAL.ENEMY_SCALE.hp  = env("ENEMY_HP",  BAL.ENEMY_SCALE.hp);
BAL.ENEMY_SCALE.atk = env("ENEMY_ATK", BAL.ENEMY_SCALE.atk);
BAL.ENEMY_SCALE.def = env("ENEMY_DEF", BAL.ENEMY_SCALE.def);
BAL.LOOT_POWER_STEP = env("LOOT_STEP", BAL.LOOT_POWER_STEP);
BAL.BOSS_BASE.hp    = env("BOSS_HP",   BAL.BOSS_BASE.hp);
BAL.BOSS_BASE.atk   = env("BOSS_ATK",  BAL.BOSS_BASE.atk);

/* spend a hero's earned level-up points across stats with a per-class priority */
function allocPoints(h) {
  const pri = { fighter:["hp","def","atk","crit","dodge"], mage:["atk","crit","hp","def","dodge"],
    cleric:["hp","atk","def","crit","dodge"], rogue:["atk","crit","dodge","hp","def"] }[h.cls];
  let pts = earnedPoints(h.level); const p = { hp:0,atk:0,def:0,dodge:0,crit:0 };
  for (let i = 0; pts > 0; i = (i+1) % pri.length) { p[pri[i]]++; pts--; }
  h.pts = p;
}
/* spend skill points into the tree's stat-passives (flat/mult), respecting tier gates — a plausible
   build; active skills are ignored by the sim, so this is a conservative lower bound on party power */
function allocSkills(h) {
  let budget = earnedSkillPoints(h.level);
  const skills = {};
  const invested = { off:0, def:0 };
  const passives = allSkills(h.cls).filter(s => s.type === "passive" && (s.fx.flat || s.fx.mult))
    .sort((a,b) => a.tier - b.tier);
  let progress = true;
  while (budget > 0 && progress) { progress = false;
    for (const s of passives) {
      if (budget <= 0) break;
      const cur = skills[s.id] || 0;
      if (cur >= MAX_RANK) continue;
      if (invested[s.br] < TIER_GATES[s.tier]) continue;   // tier locked until enough in-branch
      skills[s.id] = cur + 1; invested[s.br]++; budget--; progress = true;
    }
  }
  h.skills = skills;
}
/* generate a batch of tier-power loot and greedily equip the best item per slot for this hero */
function gearUp(h, tier, rng) {
  const best = {};
  for (let i = 0; i < 80; i++) {
    const it = generate(rng, { classes:[h.cls], power: tier });
    if (!canEquip(h, it)) continue;
    if (!best[it.slot] || itemScore(it) > itemScore(best[it.slot])) best[it.slot] = it;
  }
  for (const s of SLOTS) if (best[s]) h.gear[s] = best[s];
}

function buildParty(level, tier, seed) {
  const rng = mb(seed);
  const main = makeHero("fighter", { seed: seed|0 });
  main.level = level; allocPoints(main); allocSkills(main); gearUp(main, tier, rng);
  main.hp = derive(main).maxhp;
  const comps = [ makeCompanion((seed*7+1)>>>0, level), makeCompanion((seed*13+5)>>>0, level) ];
  for (const c of comps) { gearUp(c, tier, rng); c.hp = derive(c).maxhp; }
  return [main, ...comps];
}
function buildWave(d, roomIdx) {
  const comp = LAYOUTS[roomIdx].comp;
  return comp.map(tok => tok === "BOSS"
    ? makeEnemy(d.boss.fig, { level: d.band[1], name: d.boss.name, boss: true, stats: BAL.BOSS_BASE, xp: BAL.BOSS_BASE.xp })
    : makeEnemy(tok, { level: d.baseLevel + roomIdx })).map(e => (e.hp = e.maxhp, e));
}

/* event-scheduled autobattle: basic attacks + passive combatMods (exec/crit/lifesteal/critDmgReduce).
   Active skills, AoE, bleeds and heals are omitted → a conservative lower bound on party strength. */
function simFight(heroes, foes, seed) {
  const rng = mb(seed ^ 0x9e3779b9);
  const units = [...heroes.map(u=>({u,team:0})), ...foes.map(u=>({u,team:1}))];
  for (const x of units) x.t = 0.2 * rng();
  const alive = team => units.filter(x => x.team===team && x.u.hp > 0);
  let guard = 0;
  while (alive(0).length && alive(1).length && guard++ < 100000) {
    units.sort((a,b) => a.t - b.t);
    const act = units.find(x => x.u.hp > 0); if (!act) break;
    const foesOf = alive(act.team===0?1:0); if (!foesOf.length) break;
    const tg = foesOf.reduce((lo,x)=> x.u.hp < lo.u.hp ? x : lo, foesOf[0]);
    const A = act.u, D = tg.u;
    const dhf = D.hp / derive(D).maxhp;
    const res = resolveAttack(A, D, rng, combatMods(A, D, dhf));
    if (res.type === "hit") { D.hp -= res.dmg; if (res.heal) A.hp = Math.min(derive(A).maxhp, A.hp + res.heal); }
    const step = BAL.BASE_INTERVAL / Math.max(0.1, derive(A).aspd) + rng()*BAL.ASPD_JITTER;
    act.t += step;
  }
  const win = alive(0).length > 0 && alive(1).length === 0;
  const hpFrac = heroes.reduce((s,h)=> s + Math.max(0,h.hp)/derive(h).maxhp, 0) / heroes.length;
  const survivors = alive(0).length;
  return { win, hpFrac, survivors, tEnd: units.reduce((m,x)=>Math.max(m,x.t),0) };
}

function scenario(tier, level, roomIdx, N) {
  const d = DUNGEONS[tier-1];
  let wins=0, hp=0, surv=0, tt=0;
  for (let s=1; s<=N; s++) {
    const heroes = buildParty(level, tier, s*1009+tier);
    const foes = buildWave(d, roomIdx);
    const r = simFight(heroes, foes, s*31+tier);
    wins += r.win?1:0; hp += r.hpFrac; surv += r.survivors; tt += r.tEnd;
  }
  return { win: wins/N, hp: hp/N, surv: surv/N, tt: tt/N };
}

const only = process.argv[2] ? +process.argv[2] : null;
const N = 60;
const MIDROOM = 4;   // a representative non-boss room
/* Three read points, each with the party at the level a real player would plausibly be:
   arrive = walked in at the band bottom vs an early room; farm = leveled mid-band vs a mid room;
   boss   = geared to the band top vs the boss. Targets: arrive survivable, farm easy, boss a real win. */
console.log(`tier  band       | arrive@bot (win/hp)  | farm@mid (win/hp)   | BOSS@top (win/hp/surv)`);
console.log("-".repeat(94));
for (const d of DUNGEONS) {
  if (only && d.tier !== only) continue;
  const bot = d.baseLevel, mid = d.baseLevel + 5, top = d.band[1];
  const arrive = scenario(d.tier, bot, 1, N);
  const farm = scenario(d.tier, mid, MIDROOM, N);
  const boss = scenario(d.tier, top, BOSS_ROOM, N);
  const pct = v => (v*100).toFixed(0).padStart(3)+"%";
  const f1 = v => v.toFixed(2);
  console.log(
    `${String(d.tier).padStart(2)}   Lv${String(d.band[0]).padStart(2)}-${String(d.band[1]).padStart(3)} | `+
    `${pct(arrive.win)} hp ${f1(arrive.hp)}       | `+
    `${pct(farm.win)} hp ${f1(farm.hp)}     | `+
    `${pct(boss.win)} hp ${f1(boss.hp)} s ${f1(boss.surv)}`);
}
