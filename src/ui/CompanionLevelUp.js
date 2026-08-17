/* ============ UI :: CompanionLevelUp.js — the companion level-up "roll" ============ */
/* A slot-machine level-up for companions: five stat reels (0–2 points each) + one skill reel (+1
   rank) spin down and settle left-to-right. Reroll for silver before committing. Pure presentation —
   the roll data, silver, and apply/commit all come through ctx. Renders into #overlay. */
"use strict";

import { STAT_STEP, ASSIGNABLE } from "../systems/Leveling.js";
import { MAX_RANK } from "../data/skills.js";
import { iconImg } from "../engine/icons.js";

const STAT_LABEL = { hp: "HP", atk: "ATK", def: "DEF", dodge: "Dodge", crit: "Crit" };

let cssDone = false;
function injectCss() {
  if (cssDone) return; cssDone = true;
  const s = document.createElement("style"); s.id = "clv-style";
  s.textContent = `
  .clv{width:100%;max-width:440px;max-height:calc(100dvh - 32px);overflow-y:auto;
    background:linear-gradient(#221a36,#171025);border:1px solid var(--line2);border-radius:16px;
    padding:15px 15px 16px;box-shadow:0 20px 48px -18px #000,inset 0 1px 0 #4a3d68;text-align:left}
  .clv-top{display:flex;align-items:center;gap:11px;margin-bottom:13px}
  .clv-top canvas{width:52px;height:52px;border-radius:11px;border:1px solid #6e5a2a;flex:0 0 auto}
  .clv-who{flex:1;min-width:0}
  .clv-who b{font-family:Georgia,serif;font-size:18px;color:var(--gold)}
  .clv-who .cls{color:#9a8fb8;font-style:italic;font-size:12px;text-transform:capitalize}
  .clv-lv{display:flex;align-items:center;gap:6px;margin-top:2px;font-size:12px}
  .clv-lv .from{color:#9a8fb8}.clv-lv .arrow{color:#6d6390}.clv-lv .to{color:#8fd39a;font-weight:bold}
  .clv-purse{font-size:12.5px;color:#d8c47a;white-space:nowrap;display:flex;align-items:center;gap:4px}
  .clv-x{cursor:pointer;font-size:20px;color:#9a8fb8;padding:2px 6px;line-height:1;align-self:flex-start}
  .clv-x:active{transform:translateY(1px)}
  .clv-reels{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-bottom:9px}
  .clv-reel{background:linear-gradient(#181022,#120c1c);border:1px solid var(--line);border-radius:10px;
    padding:7px 3px 6px;display:flex;flex-direction:column;align-items:center;gap:5px;overflow:hidden}
  .clv-reel .rl{font-family:ui-monospace,monospace;font-size:8.5px;letter-spacing:.1em;text-transform:uppercase;color:#6d6390}
  .clv-win{position:relative;width:100%;height:46px;overflow:hidden;border-radius:6px;
    background:linear-gradient(#0d0916,#160f24);box-shadow:inset 0 0 0 1px #2a2340}
  .clv-win::before,.clv-win::after{content:"";position:absolute;left:0;right:0;height:13px;z-index:2;pointer-events:none}
  .clv-win::before{top:0;background:linear-gradient(#0d0916,transparent)}
  .clv-win::after{bottom:0;background:linear-gradient(transparent,#0d0916)}
  .clv-strip{position:absolute;left:0;right:0;top:0;will-change:transform}
  .clv-cell{height:46px;display:flex;align-items:center;justify-content:center;font-family:Georgia,serif;font-size:23px;font-weight:bold;line-height:1}
  .clv-cell.v0{color:#6d6390}.clv-cell.v1{color:#efe7ff}.clv-cell.v2{color:var(--gold)}
  .clv-eff{font-family:ui-monospace,monospace;font-size:9.5px;color:#9a8fb8;height:11px}
  .clv-reel.locked{border-color:var(--gold);box-shadow:0 0 0 1px rgba(224,176,99,.25)}
  .clv-reel.zero.locked{border-color:var(--line2);box-shadow:none}
  .clv-reel.pop{animation:clvpop .28s ease}
  @keyframes clvpop{0%{transform:scale(1)}40%{transform:scale(1.07)}100%{transform:scale(1)}}
  .clv-skill{margin-bottom:13px;background:linear-gradient(#1c1330,#140d22);border:1px solid var(--line);
    border-radius:11px;padding:9px 11px;display:flex;align-items:center;gap:11px;overflow:hidden}
  .clv-skill .rl{font-family:ui-monospace,monospace;font-size:8.5px;letter-spacing:.1em;text-transform:uppercase;color:#6d6390;
    writing-mode:vertical-rl;transform:rotate(180deg)}
  .clv-swin{position:relative;flex:1;height:42px;overflow:hidden;border-radius:8px;background:linear-gradient(#0d0916,#160f24);box-shadow:inset 0 0 0 1px #2a2340}
  .clv-swin::before,.clv-swin::after{content:"";position:absolute;left:0;right:0;height:11px;z-index:2;pointer-events:none}
  .clv-swin::before{top:0;background:linear-gradient(#0d0916,transparent)}
  .clv-swin::after{bottom:0;background:linear-gradient(transparent,#0d0916)}
  .clv-sstrip{position:absolute;left:0;right:0;top:0;will-change:transform}
  .clv-scell{height:42px;display:flex;align-items:center;justify-content:space-between;padding:0 12px;gap:9px}
  .clv-scell .sn{font-family:Georgia,serif;font-size:15px;font-weight:bold;color:#efe7ff}
  .clv-scell .st{font-family:ui-monospace,monospace;font-size:7.5px;letter-spacing:.1em;text-transform:uppercase;padding:2px 5px;border-radius:4px}
  .clv-scell .st.a{color:#2a0f08;background:#ff9a5c}.clv-scell .st.p{color:#06121a;background:#9ad1ff}
  .clv-scell.miss .sn{color:#5b5473;font-style:italic;font-weight:normal;font-size:13px}
  .clv-skill.locked{border-color:var(--gold);box-shadow:0 0 0 1px rgba(224,176,99,.25)}
  .clv-skill.pop{animation:clvpop .3s ease}
  .clv-pips{display:flex;gap:3px}
  .clv-pips i{width:8px;height:8px;border-radius:2px;background:#2a2338}
  .clv-pips i.f{background:var(--gold)}.clv-pips i.n{background:#8fd39a;box-shadow:0 0 6px #8fd39a}
  .clv-sup{font-family:ui-monospace,monospace;font-size:10px;color:#8fd39a;white-space:nowrap;min-width:58px;text-align:right}
  .clv-ctrl{display:flex;gap:8px}
  .clv-ctrl button{font-family:Georgia,serif;font-weight:bold;border:0;border-radius:11px;cursor:pointer;letter-spacing:.05em}
  .clv-roll{flex:1;padding:14px;font-size:16px;text-transform:uppercase;letter-spacing:.1em;color:#241606;
    background:linear-gradient(#e8bf78,#b47f34);box-shadow:0 4px 0 #6e4a14}
  .clv-roll:active{transform:translateY(2px);box-shadow:0 2px 0 #6e4a14}
  .clv-reroll{flex:1;padding:13px;font-size:13.5px;color:#efe7ff;background:linear-gradient(#2c2342,#1c1630);
    box-shadow:0 4px 0 #100b1c;display:flex;align-items:center;justify-content:center;gap:6px}
  .clv-reroll:active{transform:translateY(2px);box-shadow:0 2px 0 #100b1c}
  .clv-confirm{flex:1.25;padding:13px;font-size:14px;text-transform:uppercase;letter-spacing:.08em;color:#04140f;
    background:linear-gradient(#8fd39a,#3a8a5a);box-shadow:0 4px 0 #1c4a30}
  .clv-confirm:active{transform:translateY(2px);box-shadow:0 2px 0 #1c4a30}
  .clv-ctrl button:disabled{opacity:.4;pointer-events:none}
  .clv-hint{text-align:center;font-family:ui-monospace,monospace;font-size:10px;color:#6d6390;margin-top:10px;min-height:13px;letter-spacing:.02em}
  .clv-hint b{color:#9a8fb8}
  `;
  document.head.appendChild(s);
}

const easeOut = x => 1 - Math.pow(1 - x, 3);
const POINTS = [0, 1, 2];

/* ctx = { portrait, kit:()=>[{id,name,type,rank}], silver:()=>n, getRoll:()=>({stats,skillId}),
           levelFor:()=>n, rerollCost:()=>n, reroll:()=>bool, confirm:()=>remaining, close:()=>void } */
export function openCompanionRoll(hero, ctx) {
  injectCss();
  const overlay = document.getElementById("overlay");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let phase = "ready";   // ready → spinning → rolled → done

  const shell = () => {
    const to = ctx.levelFor();
    overlay.innerHTML = `<div class="clv">
      <div class="clv-top">
        <canvas width="96" height="96"></canvas>
        <div class="clv-who"><b>${hero.name}</b> <span class="cls">· ${hero.cls}</span>
          <div class="clv-lv"><span class="from">Lv ${to - 1}</span><span class="arrow">→</span><span class="to">Lv ${to}</span></div></div>
        <span class="clv-purse">${iconImg("coin", 13)} <span data-silver>${ctx.silver()}</span></span>
        <span class="clv-x" data-close>✕</span>
      </div>
      <div class="clv-reels">${ASSIGNABLE.map(k => `
        <div class="clv-reel" data-reel="${k}"><span class="rl">${STAT_LABEL[k]}</span>
          <div class="clv-win"><div class="clv-strip"></div></div><span class="clv-eff"></span></div>`).join("")}</div>
      <div class="clv-skill" data-skill><span class="rl">Skill</span>
        <div class="clv-swin"><div class="clv-sstrip"></div></div><span class="clv-sup">—</span></div>
      <div class="clv-ctrl" data-ctrl></div>
      <div class="clv-hint" data-hint>One free roll — reroll costs silver.</div>
    </div>`;
    overlay.querySelector(".clv-top canvas").getContext("2d").drawImage(ctx.portrait, 0, 0, 96, 96);
    overlay.querySelector("[data-close]").onclick = () => finish();
    idle();
    // A roll drawn earlier (then closed without confirming) shows settled — no free re-draw. Otherwise
    // start idle with just the Roll button: the player initiates every draw, the first included.
    const existing = ctx.getRoll && ctx.getRoll();
    if (existing) showSettled(existing); else { phase = "ready"; controls(); }
  };

  const stripOf = k => overlay.querySelector(`[data-reel="${k}"] .clv-strip`);
  const effOf = k => overlay.querySelector(`[data-reel="${k}"] .clv-eff`);
  const boxOf = k => overlay.querySelector(`[data-reel="${k}"]`);
  const sstrip = () => overlay.querySelector(".clv-sstrip");
  const skillBox = () => overlay.querySelector("[data-skill]");
  const supEl = () => overlay.querySelector(".clv-sup");
  const hintEl = () => overlay.querySelector("[data-hint]");
  const ctrlEl = () => overlay.querySelector("[data-ctrl]");
  const cellHtml = v => `<div class="clv-cell v${v}">+${v}</div>`;
  const scellHtml = s => s
    ? `<div class="clv-scell"><span class="sn">${s.name}</span><span class="st ${s.type[0]}">${s.type === "active" ? "Active" : "Passive"}</span></div>`
    : `<div class="clv-scell miss"><span class="sn">— no upgrade —</span></div>`;
  // reel cycle = the companion's skills + 2 blank slots (a roll can land on a blank → no skill this level)
  const reelList = () => ctx.kit().concat([null, null]);
  const hasEligible = () => ctx.kit().some(k => k.rank < MAX_RANK);   // any skill left to raise? (else "maxed")

  function idle() {
    for (const k of ASSIGNABLE) { const st = stripOf(k); st.style.transform = "translateY(0)"; st.innerHTML = cellHtml(1); effOf(k).textContent = ""; boxOf(k).className = "clv-reel"; }
    const kit = ctx.kit(); sstrip().style.transform = "translateY(0)"; sstrip().innerHTML = scellHtml(kit[0] || null); supEl().textContent = "—"; skillBox().className = "clv-skill";
  }

  function buildStrip(strip, item, endIdx) { let h = ""; for (let k = 0; k <= endIdx + 1; k++) h += item(k); strip.innerHTML = h; }

  // draw the current level's free roll on the player's click, then spin to reveal it
  function doRoll() { if (ctx.firstRoll) ctx.firstRoll(); spin(); }

  // place a persisted roll in its final position without animating (reopen case)
  function showSettled(roll) {
    const kit = ctx.kit();
    ASSIGNABLE.forEach(k => {
      const v = roll.stats[k] || 0, st = stripOf(k);
      st.innerHTML = cellHtml(v); st.style.transform = "translateY(0)";
      effOf(k).textContent = v > 0 ? `+${v * STAT_STEP[k]} ${STAT_LABEL[k]}` : "—";
      boxOf(k).className = "clv-reel locked" + (v === 0 ? " zero" : "");
    });
    const s = roll.skillId ? kit.find(x => x.id === roll.skillId) : null;
    sstrip().innerHTML = scellHtml(s); sstrip().style.transform = "translateY(0)";
    if (s) {
      const before = s.rank, after = Math.min(5, before + 1), cell = sstrip().firstElementChild;
      if (cell) cell.insertAdjacentHTML("beforeend", `<span class="clv-pips">${[0,1,2,3,4].map(n => `<i class="${n < before ? "f" : n === before ? "n" : ""}"></i>`).join("")}</span>`);
      supEl().innerHTML = `${"★".repeat(before)}<span style="color:#3a3450">${"★".repeat(5 - before)}</span> → <b>${after}★</b>`;
    } else supEl().textContent = hasEligible() ? "no upgrade" : "maxed";
    skillBox().className = "clv-skill locked";
    phase = "rolled"; hintRoll(roll); controls();
  }

  function spin() {
    const roll = ctx.getRoll(); if (!roll) return;
    phase = "spinning"; controls(); hintEl().textContent = "Rolling…";
    const kit = ctx.kit();
    const start = performance.now(), turnsBase = reduce ? 0 : 4;
    const anims = [];
    ASSIGNABLE.forEach((k, i) => {
      const target = roll.stats[k] || 0, turns = turnsBase + i, endIdx = turns * POINTS.length + target;
      buildStrip(stripOf(k), n => cellHtml(POINTS[n % POINTS.length]), endIdx);
      boxOf(k).className = "clv-reel";
      anims.push({ kind: "stat", k, strip: stripOf(k), endIdx, cellH: 46, dur: reduce ? 240 : 1050 + i * 340 });
    });
    // skill reel — cycle the kit + 2 blank slots; land on the rolled skill, or on a blank when the
    // roll granted no skill (a "miss"). All skills maxed → also settles on a blank ("maxed").
    const list = reelList();
    const sIdx = roll.skillId ? Math.max(0, kit.findIndex(s => s.id === roll.skillId)) : kit.length;
    const sTurns = turnsBase + ASSIGNABLE.length, sEnd = sTurns * Math.max(1, list.length) + sIdx;
    buildStrip(sstrip(), n => scellHtml(list[n % list.length]), sEnd);
    skillBox().className = "clv-skill";
    anims.push({ kind: "skill", strip: sstrip(), endIdx: sEnd, cellH: 42, dur: reduce ? 300 : 1050 + ASSIGNABLE.length * 340, sIdx, kit, roll });

    (function frame(now) {
      let done = true;
      for (const a of anims) {
        if (a.fin) continue;
        const t = Math.min(1, (now - start) / a.dur), pos = a.endIdx * easeOut(t);
        a.strip.style.transform = `translateY(${-pos * a.cellH}px)`;
        if (t >= 1) { a.fin = true; settle(a); } else done = false;
      }
      if (!done) requestAnimationFrame(frame); else { phase = "rolled"; hintRoll(roll); controls(); }
    })(performance.now());
  }

  function settle(a) {
    if (a.kind === "stat") {
      const v = ctx.getRoll().stats[a.k] || 0, box = boxOf(a.k);
      box.classList.add("locked", "pop"); if (v === 0) box.classList.add("zero");
      effOf(a.k).textContent = v > 0 ? `+${v * STAT_STEP[a.k]} ${STAT_LABEL[a.k]}` : "—";
      setTimeout(() => box.classList.remove("pop"), 300);
    } else {
      skillBox().classList.add("locked", "pop");
      const roll = a.roll, s = roll.skillId ? a.kit.find(x => x.id === roll.skillId) : null;
      if (s) {
        const before = s.rank, after = Math.min(5, before + 1);
        const cell = a.strip.children[a.endIdx];
        if (cell && !cell.querySelector(".clv-pips"))
          cell.insertAdjacentHTML("beforeend", `<span class="clv-pips">${[0,1,2,3,4].map(n => `<i class="${n < before ? "f" : n === before ? "n" : ""}"></i>`).join("")}</span>`);
        supEl().innerHTML = `${"★".repeat(before)}<span style="color:#3a3450">${"★".repeat(5 - before)}</span> → <b>${after}★</b>`;
      } else supEl().textContent = hasEligible() ? "no upgrade" : "maxed";
      setTimeout(() => skillBox().classList.remove("pop"), 320);
    }
  }

  function hintRoll(roll) {
    const parts = ASSIGNABLE.filter(k => roll.stats[k]).map(k => `+${roll.stats[k] * STAT_STEP[k]} ${STAT_LABEL[k]}`);
    const kit = ctx.kit(), s = roll.skillId ? kit.find(x => x.id === roll.skillId) : null;
    const skillTxt = s ? `<b>${s.name} +1</b>` : (hasEligible() ? `<b>no skill</b>` : "");
    hintEl().innerHTML = `This roll: <b>${parts.join(" · ") || "no stats"}</b>${skillTxt ? ` · ${skillTxt}` : ""}`;
  }

  function controls() {
    const c = ctrlEl();
    if (phase === "ready") {
      c.innerHTML = `<button class="clv-roll" data-roll>Roll for Lv ${ctx.levelFor()}</button>`;
      c.querySelector("[data-roll]").onclick = doRoll;
    } else if (phase === "spinning") {
      c.innerHTML = `<button class="clv-reroll" disabled>Spinning…</button><button class="clv-confirm" disabled>Confirm</button>`;
    } else if (phase === "rolled") {
      const cost = ctx.rerollCost(), broke = ctx.silver() < cost;
      c.innerHTML = `<button class="clv-reroll" data-reroll ${broke ? "disabled" : ""}>${iconImg("refresh", 12)} Reroll · ${iconImg("coin", 11)} ${cost}</button>`
        + `<button class="clv-confirm" data-confirm>Confirm</button>`;
      c.querySelector("[data-confirm]").onclick = doConfirm;
      const rb = c.querySelector("[data-reroll]");
      if (rb) rb.onclick = () => { if (ctx.reroll()) { const s = overlay.querySelector("[data-silver]"); if (s) s.textContent = ctx.silver(); spin(); } };
    }
  }

  function doConfirm() {
    const remaining = ctx.confirm();
    if (remaining > 0) { phase = "ready"; shell(); }   // fresh reels for the next queued level
    else finish();
  }
  function finish() { overlay.classList.remove("show"); overlay.innerHTML = ""; ctx.close && ctx.close(); }

  shell();
  overlay.classList.add("show");
}
