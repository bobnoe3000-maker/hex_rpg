/* ============ UI :: ArenaScreen.js — The Proving Grounds (PvP arena) ============ */
/* Renders into #town over the Keep. Screens: Battle (rank + rival browser), Leaderboard, View Team,
   and a Battle Result. Fighting hands off to the live engine (ctx.fight) — you watch the bout play
   out on the dungeon canvas, hero vs hero — and the result screen re-opens here afterwards. */
"use strict";

import { ensureTownCss } from "./TownScreen.js";
import { derive } from "../systems/StatEngine.js";
import { heroKit } from "../systems/Skills.js";
import {
  buildLadder, tierOf, playerRank, pickRivals, difficultyOf, rivalMembers, rivalLevel,
} from "../systems/Arena.js";
import { BAL } from "../data/balance.js";
import { iconImg } from "../engine/icons.js";

const ACCENT = { fighter: "#ff8a5a", mage: "#b48bff", cleric: "#79c7e6", rogue: "#d8c088" };
const accentCls = cls => ACCENT[cls] || "#8fb3d9";
const kfmt = n => (n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "k" : "" + n);

let arCssDone = false;
function ensureArenaCss() {
  if (arCssDone) return; arCssDone = true;
  const s = document.createElement("style"); s.id = "arena-style";
  s.textContent = `
  .ar-wrap{--rung:#191026;--line:#33284d;--line2:#4a3d68;--gold:#e0b063;--gold2:#f0c877;
    --parch:#cdbff0;--muted:#8a7fae;--dim:#6f6486;--win:#8fd39a;--loss:#e6748a;
    --mono:ui-monospace,Menlo,Consolas,monospace;--serif:Georgia,"Times New Roman",serif}
  .ar-return{font-family:inherit;font-weight:bold;letter-spacing:1.5px;font-size:15px;text-transform:uppercase;
    border:0;border-radius:11px;padding:14px;cursor:pointer;width:100%;margin:0 0 12px;
    background:linear-gradient(#e0b063,#a8722a);color:#241606;box-shadow:0 4px 0 #6e4a14;
    display:flex;align-items:center;justify-content:center;gap:9px}
  .ar-return:active{transform:translateY(2px);box-shadow:0 2px 0 #6e4a14}
  .ar-head{display:flex;align-items:baseline;gap:9px;margin:2px 2px 12px}
  .ar-head h1{font-family:var(--serif);font-size:23px;font-weight:bold;color:#fff;margin:0}
  .ar-head .sub{font-size:11.5px;color:var(--muted);font-style:italic}
  .ar-valor{margin-left:auto;font-family:var(--mono);font-size:11px;color:var(--gold);white-space:nowrap}

  .ar-rank{display:flex;align-items:center;gap:14px;background:var(--rung);border:1px solid var(--line);border-radius:13px;padding:13px 14px}
  .ar-shield{width:52px;height:58px;flex:0 0 auto;display:grid;place-items:center;position:relative;
    clip-path:polygon(50% 0,100% 18%,100% 68%,50% 100%,0 68%,0 18%);
    background:linear-gradient(160deg,color-mix(in srgb,var(--tc) 55%,#241a10),#1a1220)}
  .ar-shield::after{content:"";position:absolute;inset:2px;clip-path:inherit;border:1.5px solid color-mix(in srgb,var(--tc) 70%,#000)}
  .ar-shield b{position:relative;font-family:var(--serif);font-weight:bold;font-size:19px;color:#fff;text-shadow:0 1px 3px #000}
  .ar-rk-tier{font-family:var(--serif);font-size:17px;font-weight:bold;color:var(--tc)}
  .ar-rk-rating{font-family:var(--mono);font-size:22px;font-weight:bold;color:#fff;line-height:1.1}
  .ar-rk-sub{font-size:11px;color:var(--muted)}
  .ar-rk-right{margin-left:auto;text-align:right}
  .ar-rk-rec{font-family:var(--mono);font-size:13px;color:var(--parch);font-weight:bold}
  .ar-rk-streak{font-size:10.5px;font-weight:bold}
  .ar-rk-streak.up{color:var(--win)}.ar-rk-streak.dn{color:var(--loss)}
  .ar-prog{height:6px;border-radius:4px;background:#120c1e;border:1px solid var(--line);margin-top:8px;overflow:hidden}
  .ar-prog i{display:block;height:100%;background:linear-gradient(90deg,#a8722a,var(--gold2))}
  .ar-cap{font-size:10.5px;color:var(--muted);margin:6px 3px 0}
  .ar-cap b{color:var(--parch)}

  .ar-sec{font-size:9.5px;letter-spacing:1.5px;text-transform:uppercase;color:var(--dim);margin:18px 2px 9px;font-weight:700;display:flex;justify-content:space-between}
  .ar-sec .r{color:var(--muted);letter-spacing:.4px;text-transform:none;font-weight:normal}

  .ar-rival{display:flex;align-items:center;gap:11px;background:var(--rung);border:1px solid var(--line);border-radius:12px;padding:10px 11px;margin-bottom:8px}
  .ar-crest{width:38px;height:38px;flex:0 0 auto;border-radius:10px;display:grid;place-items:center;font-size:18px;color:var(--tc,#cdbff0);
    background:radial-gradient(circle at 40% 30%,#2c2440,#181022);border:1px solid var(--line2)}
  .ar-rv-mid{flex:1;min-width:0}
  .ar-rv-nm{font-family:var(--serif);font-size:14px;font-weight:bold;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .ar-rv-line{display:flex;align-items:center;gap:7px;margin-top:3px}
  .ar-dots{display:flex;gap:3px}
  .ar-dot{width:9px;height:9px;border-radius:50%;background:var(--c)}
  .ar-rv-rt{font-family:var(--mono);font-size:11px;color:var(--parch);font-weight:bold}
  .ar-diff{font-size:9.5px;font-weight:bold;padding:2px 7px;border-radius:20px}
  .ar-diff.hard{color:var(--loss);background:rgba(230,116,138,.13);border:1px solid rgba(230,116,138,.3)}
  .ar-diff.even{color:var(--gold2);background:rgba(216,162,74,.13);border:1px solid rgba(216,162,74,.3)}
  .ar-diff.fav{color:var(--win);background:rgba(143,211,154,.13);border:1px solid rgba(143,211,154,.3)}
  .ar-rv-act{display:flex;flex-direction:column;gap:5px;flex:0 0 auto}
  .ar-btn{font-family:inherit;font-weight:bold;border:0;border-radius:8px;padding:7px 12px;font-size:11.5px;cursor:pointer;white-space:nowrap;text-align:center}
  .ar-btn:active{transform:translateY(1px)}
  .ar-btn.p{background:linear-gradient(var(--gold),#a8722a);color:#241606;box-shadow:0 2px 0 #6e4a14}
  .ar-btn.g{background:#2a2342;color:var(--parch);border:1px solid var(--line2)}
  .ar-btn.wide{width:100%;padding:12px;font-size:14px;display:flex;align-items:center;justify-content:center;gap:7px}
  .ar-reroll{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;margin-top:2px;padding:10px;border-radius:9px;
    background:none;border:1px dashed var(--line2);color:var(--muted);font-size:11.5px;font-family:inherit;cursor:pointer}
  .ar-reroll:active{transform:translateY(1px)}

  .ar-tabs{display:flex;gap:7px;margin:14px 0 4px}
  .ar-tab{flex:1;text-align:center;padding:10px 4px;font-size:12px;font-family:inherit;color:var(--dim);cursor:pointer;
    background:var(--rung);border:1px solid var(--line);border-radius:10px}
  .ar-tab.on{color:#241606;background:linear-gradient(var(--gold2),#c9862a);border-color:transparent;font-weight:bold}

  .ar-lb-filt{display:flex;gap:6px;margin-bottom:10px}
  .ar-chip{font-size:11px;padding:5px 12px;border-radius:20px;border:1px solid var(--line2);color:var(--muted);background:#191026;cursor:pointer}
  .ar-chip.on{background:rgba(216,162,74,.14);border-color:rgba(216,162,74,.4);color:var(--gold2);font-weight:bold}
  .ar-lrow{display:flex;align-items:center;gap:10px;padding:9px 6px;border-bottom:1px solid rgba(255,255,255,.04);cursor:pointer}
  .ar-lrow .pos{width:26px;text-align:center;font-family:var(--mono);font-size:13px;color:var(--muted);font-weight:bold;flex:0 0 auto}
  .ar-lrow .lcrest{width:28px;height:28px;border-radius:7px;display:grid;place-items:center;font-size:13px;color:var(--tc,#cdbff0);background:#20182f;border:1px solid var(--line);flex:0 0 auto}
  .ar-lrow .lnm{flex:1;min-width:0;font-family:var(--serif);font-size:13px;color:var(--parch);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .ar-lrow .lnm .tier{font-size:9.5px;color:var(--tc);font-family:system-ui;font-weight:bold;letter-spacing:.3px}
  .ar-lrow .lrt{font-family:var(--mono);font-size:13px;font-weight:bold;color:#fff;flex:0 0 auto}
  .ar-lrow .lrec{font-family:var(--mono);font-size:10px;color:var(--dim);width:44px;text-align:right;flex:0 0 auto}
  .ar-lrow.you{background:linear-gradient(90deg,rgba(216,162,74,.15),transparent);border-radius:9px;box-shadow:inset 2px 0 0 var(--gold)}
  .ar-lrow.you .lnm{color:#fff;font-weight:bold}
  .ar-lb-gap{text-align:center;color:var(--dim);font-size:14px;letter-spacing:3px;padding:6px}

  .ar-vt-hd{display:flex;align-items:center;gap:10px;margin:0 2px 12px}
  .ar-vt-hd .ti{font-family:var(--serif);font-size:19px;font-weight:bold;color:#fff;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .ar-vt-hd .rt{font-family:var(--mono);font-size:12px;color:var(--tc);font-weight:bold;white-space:nowrap}
  .ar-tcard{display:flex;gap:11px;background:var(--rung);border:1px solid var(--line);border-radius:12px;padding:11px;margin-bottom:8px;border-left:3px solid var(--c)}
  .ar-tcard .av{width:46px;height:46px;flex:0 0 auto}
  .ar-tcard .av canvas{width:46px;height:46px;border-radius:9px;border:1px solid var(--c);display:block}
  .ar-tc-mid{flex:1;min-width:0}
  .ar-tc-nm{font-family:var(--serif);font-size:14.5px;font-weight:bold;color:#fff}
  .ar-tc-nm .cls{font-size:11px;color:var(--c);font-style:italic;font-weight:normal;text-transform:capitalize}
  .ar-tc-nm .lv{font-family:var(--mono);font-size:10px;color:var(--muted)}
  .ar-tc-stats{display:flex;gap:12px;margin:5px 0 4px;font-family:var(--mono);font-size:11px;color:var(--parch)}
  .ar-tc-stats .k{color:var(--dim)}
  .ar-tc-tags{display:flex;flex-wrap:wrap;gap:5px}
  .ar-kt{font-size:9.5px;padding:2px 7px;border-radius:6px;background:#1d1530;border:1px solid var(--line);color:var(--muted)}
  .ar-kt.sk{color:#c9bde6;border-color:var(--line2)}
  .ar-kt.gear{color:var(--gold2);border-color:rgba(216,162,74,.3);background:rgba(216,162,74,.08)}
  .ar-vt-act{margin-top:12px;display:flex;gap:8px}
  .ar-empty{color:var(--dim);font-style:italic;font-size:12px;text-align:center;padding:14px;border:1px dashed var(--line2);border-radius:11px}

  .ar-res{padding:16px 6px 6px;text-align:center}
  .ar-banner{font-family:var(--serif);font-size:34px;font-weight:bold;letter-spacing:1px}
  .ar-banner.win{background:linear-gradient(var(--win),#4f9e63);-webkit-background-clip:text;background-clip:text;color:transparent}
  .ar-banner.loss{background:linear-gradient(var(--loss),#8f3f52);-webkit-background-clip:text;background-clip:text;color:transparent}
  .ar-rd{font-family:var(--mono);font-size:15px;color:var(--parch);margin-top:4px}
  .ar-rd b{color:#fff}.ar-rd .up{color:var(--win);font-weight:bold}.ar-rd .dn{color:var(--loss);font-weight:bold}
  .ar-rd .arw{color:#fff}
  .ar-unrk{font-size:11px;color:var(--muted);margin-top:4px;font-style:italic}
  .ar-rewards{display:flex;justify-content:center;gap:9px;margin:16px 0 4px;flex-wrap:wrap}
  .ar-rw{background:var(--rung);border:1px solid var(--line);border-radius:11px;padding:9px 13px;min-width:78px}
  .ar-rw .rn{font-family:var(--mono);font-size:16px;font-weight:bold;color:var(--gold2)}
  .ar-rw .rl{font-size:9.5px;letter-spacing:.6px;text-transform:uppercase;color:var(--muted);margin-top:1px}
  .ar-note{font-size:11.5px;color:var(--muted);margin-top:12px}
  .ar-note b{color:var(--gold2)}
  `;
  document.head.appendChild(s);
}

function arToast(msg) {
  let t = document.getElementById("toast");
  if (!t) {
    t = document.createElement("div"); t.id = "toast";
    t.style.cssText = "position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:40;max-width:90%;"
      + "background:#2a1420;color:#ffd7cf;border:1px solid #7a3a3a;border-radius:10px;padding:9px 13px;"
      + "font:12px Georgia,serif;box-shadow:0 4px 16px #000;text-align:center;opacity:0;transition:opacity .35s";
    document.body.appendChild(t);
  }
  t.textContent = msg; t.style.opacity = "1";
  clearTimeout(arToast._tm); arToast._tm = setTimeout(() => { t.style.opacity = "0"; }, 2600);
}

function nextTierGap(rating) {
  for (const [name, min, color] of BAL.ARENA.TIERS) if (min > rating) return { name, color, gap: min - rating, min };
  return null;
}

/* ctx = { arena:()=>{rating,wins,losses,streak,best,valor}, party:()=>[heroes], playerLevel:()=>n,
           portrait:h=>canvas, ranked:()=>{left,cap}, fight:(team,ranked)=>bool, pendingResult:()=>result, back } */
export function openArena(ctx) {
  ensureTownCss(); ensureArenaCss();
  const el = document.getElementById("town");
  const ladder = buildLadder();

  const pending = ctx.pendingResult ? ctx.pendingResult() : null;
  let mode = pending ? "result" : "home";   // home | team | result
  let tab = "battle";
  let lbFilter = "top";
  let nonce = 0;
  let viewing = null;
  let result = pending || null;

  const A = () => ctx.arena();
  const pLevel = () => (ctx.playerLevel ? ctx.playerLevel() : 1);
  const levelFor = team => rivalLevel(team.rating, A().rating, pLevel());

  const playerTeam = () => {
    const a = A();
    return { you: true, name: "Your Party", crest: "★", rating: a.rating, wins: a.wins, losses: a.losses, _members: ctx.party() };
  };

  function rankHtml() {
    const a = A(), t = tierOf(a.rating), rank = playerRank(a.rating, ladder), total = ladder.length + 1;
    const nx = nextTierGap(a.rating);
    let prog = 100, capLine = "At the top of the ladder — hold the throne.";
    if (nx) {
      const cur = BAL.ARENA.TIERS.filter(x => x[1] <= a.rating).pop();
      const t0 = cur ? cur[1] : 0, span = nx.min - t0;
      prog = Math.max(3, Math.min(100, Math.round(((a.rating - t0) / span) * 100)));
      capLine = `<b>${nx.gap}</b> to <b style="color:${nx.color}">${nx.name}</b>`;
    }
    const r = ctx.ranked ? ctx.ranked() : { left: 0, cap: 0 };
    capLine += ` · <b>${r.left}</b>/${r.cap} ranked battles left today`;
    const streak = a.streak || 0;
    const streakHtml = streak > 0 ? `<div class="ar-rk-streak up">▲ ${streak} win streak</div>`
      : streak < 0 ? `<div class="ar-rk-streak dn">▼ ${-streak} lost</div>` : "";
    return `<div class="ar-rank" style="--tc:${t.color}">
      <div class="ar-shield"><b>${t.div ? ["", "I", "II", "III"][t.div] : "★"}</b></div>
      <div><div class="ar-rk-tier">${t.label}</div><div class="ar-rk-rating">${a.rating}</div>
        <div class="ar-rk-sub">rank #${rank} of ${total}</div></div>
      <div class="ar-rk-right"><div class="ar-rk-rec">${a.wins} – ${a.losses}</div>${streakHtml}</div>
    </div>
    <div class="ar-prog"><i style="width:${prog}%"></i></div>
    <div class="ar-cap">${capLine}</div>`;
  }

  function battleHtml() {
    const a = A();
    const rivals = pickRivals(a.rating, nonce, ladder);
    const card = g => {
      const members = rivalMembers(g, levelFor(g)), t = tierOf(g.rating), diff = difficultyOf(g.rating, a.rating);
      const diffLbl = diff === "hard" ? "Hard" : diff === "fav" ? "Favoured" : "Even";
      const dots = members.map(h => `<i class="ar-dot" style="--c:${accentCls(h.cls)}"></i>`).join("");
      return `<div class="ar-rival" style="--tc:${t.color}">
        <div class="ar-crest">${g.crest}</div>
        <div class="ar-rv-mid"><div class="ar-rv-nm">${g.name}</div>
          <div class="ar-rv-line"><span class="ar-dots">${dots}</span><span class="ar-rv-rt">${g.rating}</span><span class="ar-diff ${diff}">${diffLbl}</span></div></div>
        <div class="ar-rv-act"><button class="ar-btn p" data-fight="${g.seed}">Fight</button><button class="ar-btn g" data-view="${g.seed}">View</button></div>
      </div>`;
    };
    return `${rankHtml()}
      <div class="ar-sec">Choose a rival <span class="r">near your rating</span></div>
      ${rivals.map(card).join("") || `<div class="ar-empty">No rivals in range.</div>`}
      <button class="ar-reroll" data-reroll>${iconImg("refresh", 12)} Scout new rivals · free</button>`;
  }

  function boardHtml() {
    const me = playerTeam();
    const all = [...ladder, me].sort((x, y) => y.rating - x.rating);
    all.forEach((g, i) => { g._pos = i + 1; });
    const myPos = me._pos;
    let rows;
    if (lbFilter === "near") rows = all.slice(Math.max(0, myPos - 5), myPos + 5);
    else { const top = all.slice(0, 12); rows = myPos > 12 ? [...top, "gap", ...all.slice(myPos - 2, myPos + 1)] : top; }
    const medal = p => (p === 1 ? "🥇" : p === 2 ? "🥈" : p === 3 ? "🥉" : "" + p);
    const row = g => {
      if (g === "gap") return `<div class="ar-lb-gap">· · ·</div>`;
      const t = tierOf(g.rating);
      return `<div class="ar-lrow ${g.you ? "you" : ""}" style="--tc:${t.color}" data-row="${g.you ? "me" : g.seed}">
        <span class="pos">${medal(g._pos)}</span><span class="lcrest">${g.crest}</span>
        <span class="lnm">${g.name}${g.you ? " (you)" : ""} <span class="tier">· ${g.you ? t.label : t.name}</span></span>
        <span class="lrt">${g.rating}</span><span class="lrec">${g.wins}-${g.losses}</span></div>`;
    };
    return `<div class="ar-lb-filt"><span class="ar-chip ${lbFilter === "top" ? "on" : ""}" data-filt="top">Top</span>
        <span class="ar-chip ${lbFilter === "near" ? "on" : ""}" data-filt="near">Near me</span></div>
      ${rows.map(row).join("")}`;
  }

  function viewTeamHtml(team) {
    const members = team.you ? team._members : rivalMembers(team, levelFor(team));
    const t = tierOf(team.rating);
    const heroCard = h => {
      const d = derive(h), acc = accentCls(h.cls);
      const kit = heroKit(h).slice().sort((x, y) => y.points - x.points);
      const skills = kit.slice(0, 2).map(k => `<span class="ar-kt sk">${k.name} ★${k.stars}</span>`).join("");
      const g = h.gear || {}, pick = g.weapon || Object.values(g).find(Boolean);
      const gearName = pick && (pick.name || pick.n);
      const gearTag = gearName ? `<span class="ar-kt gear">${gearName}${pick.upgradeLevel > 0 ? " +" + pick.upgradeLevel : ""}</span>` : "";
      const lead = members[0] === h ? ` <span style="color:${t.color}">♛</span>` : "";
      return `<div class="ar-tcard" style="--c:${acc}"><div class="av"><canvas width="96" height="96"></canvas></div>
        <div class="ar-tc-mid"><div class="ar-tc-nm">${h.name} <span class="cls">${h.cls}</span> <span class="lv">Lv ${h.level}${lead}</span></div>
          <div class="ar-tc-stats"><span><span class="k">ATK</span> ${d.atk}</span><span><span class="k">DEF</span> ${d.def}</span><span><span class="k">HP</span> ${kfmt(d.maxhp)}</span></div>
          <div class="ar-tc-tags">${skills}${gearTag}</div></div></div>`;
    };
    const act = team.you ? "" : `<div class="ar-vt-act"><button class="ar-btn p wide" data-fight="${team.seed}">${iconImg("sword", 14)} Fight this team</button></div>`;
    return `<div class="ar-vt-hd"><span class="ti">${team.name}${team.you ? " (you)" : ""}</span>
        <span class="rt" style="--tc:${t.color}">${team.rating} · ${team.you ? t.label : t.name}</span></div>
      ${members.map(heroCard).join("")}${act}`;
  }

  function resultHtml(res) {
    const won = res.won;
    const rd = res.ranked
      ? `<div class="ar-rd">${res.before} <span class="arw">→</span> <b>${res.after}</b> <span class="${res.delta >= 0 ? "up" : "dn"}">(${res.delta >= 0 ? "+" : ""}${res.delta})</span></div>`
      : `<div class="ar-unrk">Practice bout — rating unchanged</div>`;
    const rw = res.rewards, chips = [];
    if (rw.valor) chips.push(`<div class="ar-rw"><div class="rn">+${rw.valor}</div><div class="rl">◈ Valor</div></div>`);
    if (rw.silver) chips.push(`<div class="ar-rw"><div class="rn">+${rw.silver}</div><div class="rl">Silver</div></div>`);
    if (rw.gems) chips.push(`<div class="ar-rw"><div class="rn">+${rw.gems}</div><div class="rl">Gems</div></div>`);
    let note = "";
    if (res.promoted) note = `<div class="ar-note">🏅 Promoted to <b>${res.tierAfter.label}</b>!</div>`;
    else if (won && res.streak >= 3) note = `<div class="ar-note">🔥 <b>${res.streak}-win streak</b> — keep climbing.</div>`;
    else if (!won && res.ranked) note = `<div class="ar-note">A setback — re-scout and try a softer draw.</div>`;
    const canRematch = ladder.some(x => String(x.seed) === String(res.rivalSeed));
    return `<div class="ar-res">
      <div class="ar-banner ${won ? "win" : "loss"}">${won ? "VICTORY" : "DEFEAT"}</div>
      <div class="ar-rd" style="font-size:12px;color:var(--muted)">vs ${res.rivalName}</div>
      ${rd}
      <div class="ar-rewards">${chips.join("")}</div>
      ${note}
      <div class="ar-vt-act">${canRematch ? `<button class="ar-btn p wide" data-rematch="${res.rivalSeed}">${iconImg("sword", 13)} Rematch</button>` : ""}
        <button class="ar-btn g wide" data-continue>Continue</button></div>
    </div>`;
  }

  function render() {
    let backLabel, body;
    if (mode === "home") {
      backLabel = "Return to the Keep";
      body = `<div class="ar-head"><h1>The Proving Grounds</h1><span class="sub">rated ladder</span>
          <span class="ar-valor">◈ ${A().valor || 0} Valor</span></div>
        <div class="ar-tabs">
          <button class="ar-tab ${tab === "battle" ? "on" : ""}" data-tab="battle">${iconImg("sword", 13)} Battle</button>
          <button class="ar-tab ${tab === "board" ? "on" : ""}" data-tab="board">${iconImg("crown", 13)} Leaderboard</button></div>
        ${tab === "battle" ? battleHtml() : boardHtml()}`;
    } else if (mode === "team") { backLabel = "Back to the Arena"; body = viewTeamHtml(viewing); }
    else { backLabel = "Back to the Arena"; body = resultHtml(result); }

    const bIcon = mode === "home" ? "house" : "chevron";
    el.innerHTML = `<div class="tw-wrap ar-wrap">
      <button class="ar-return" data-back>${iconImg(bIcon, 16)} ${backLabel}</button>${body}</div>`;

    if (mode === "team") {
      const members = viewing.you ? viewing._members : rivalMembers(viewing, levelFor(viewing));
      el.querySelectorAll(".ar-tcard canvas").forEach((cv, i) => { if (members[i]) cv.getContext("2d").drawImage(ctx.portrait(members[i]), 0, 0, 96, 96); });
    }
    wire();
  }

  function launch(team) {
    const ok = ctx.fight && ctx.fight(team, true);
    if (!ok) arToast("Your party can't fight — revive a fallen hero at the Temple first.");
    // on success the scene switches to the live battle; this screen is torn down.
  }

  function openTeamBySeed(seed) {
    if (seed === "me") { viewing = playerTeam(); mode = "team"; render(); return; }
    const g = ladder.find(x => String(x.seed) === String(seed));
    if (g) { viewing = g; mode = "team"; render(); }
  }

  function wire() {
    el.querySelector("[data-back]").onclick = () => {
      if (mode === "home") return ctx.back();
      mode = "home"; render();               // team / result → home
    };
    el.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => { tab = b.getAttribute("data-tab"); render(); });
    const rr = el.querySelector("[data-reroll]"); if (rr) rr.onclick = () => { nonce++; render(); };
    el.querySelectorAll("[data-filt]").forEach(c => c.onclick = () => { lbFilter = c.getAttribute("data-filt"); render(); });
    el.querySelectorAll("[data-view]").forEach(b => b.onclick = () => openTeamBySeed(b.getAttribute("data-view")));
    el.querySelectorAll("[data-row]").forEach(r => r.onclick = () => openTeamBySeed(r.getAttribute("data-row")));
    el.querySelectorAll("[data-fight]").forEach(b => b.onclick = () => {
      const seed = b.getAttribute("data-fight");
      const team = ladder.find(x => String(x.seed) === String(seed));
      if (team) launch(team);
    });
    const rm = el.querySelector("[data-rematch]"); if (rm) rm.onclick = () => {
      const team = ladder.find(x => String(x.seed) === String(rm.getAttribute("data-rematch")));
      if (team) launch(team);
    };
    const cont = el.querySelector("[data-continue]"); if (cont) cont.onclick = () => { mode = "home"; tab = "battle"; render(); };
  }

  render();
}
