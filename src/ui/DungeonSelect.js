/* ============ UI :: DungeonSelect.js — the Dungeons board (tiered descent) ============ */
/* Renders the ladder of dungeons into #town over the Keep. A "Continue" banner resumes the active
   delve; each rung shows its level band, boss, and loot floor. Unlocked rungs start a delve; locked
   rungs show what boss to beat first. Pure UI — all state/logic comes through ctx. */
"use strict";

import { ensureTownCss } from "./TownScreen.js";
import { isUnlocked, prevDungeon, ROOM_COUNT } from "../data/dungeons.js";
import { iconImg } from "../engine/icons.js";

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
const FLOOR_LABEL = { plain: "Plain+", fine: "Fine+", rare: "Rare+", epic: "Epic" };
const FLOOR_CLASS = { plain: "", fine: "", rare: "rare", epic: "epic" };

let dsCssDone = false;
function ensureDungeonCss() {
  if (dsCssDone) return; dsCssDone = true;
  const s = document.createElement("style"); s.id = "dungeon-style";
  s.textContent = `
  .ds-cont{display:flex;align-items:center;gap:11px;border-radius:12px;padding:11px 13px;cursor:pointer;
    background:linear-gradient(100deg,#2a2140,#221a36);border:1px solid #4a3d68;margin-bottom:4px}
  .ds-cont:active{transform:translateY(1px)}
  .ds-cont .cbtn{width:36px;height:36px;border-radius:9px;flex:0 0 auto;display:grid;place-items:center;
    background:radial-gradient(circle at 35% 30%,#3a5aa0,#16243f);border:1px solid #3f5c94}
  .ds-cont .ct{flex:1;min-width:0} .ds-cont .ct b{font-size:12.5px;color:var(--parchment)}
  .ds-cont .ct small{display:block;color:#9a8fb8;font-size:10.5px;margin-top:2px}
  .ds-cont .go{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#9ad1ff;white-space:nowrap}

  .ds-card{position:relative;display:flex;gap:11px;align-items:center;padding:11px 12px;border-radius:12px;
    border:1px solid var(--line);background:linear-gradient(#231a37,#1b1430);overflow:hidden;cursor:pointer}
  .ds-card:active{transform:translateY(1px)}
  .ds-card .rail{position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--acc,#6a5a8c)}
  .ds-badge{width:44px;height:44px;flex:0 0 auto;border-radius:10px;display:grid;place-items:center;
    font-family:Georgia,serif;font-weight:bold;font-size:15px;color:#f0e6d2;border:1px solid var(--line2,#4a3d68);
    background:radial-gradient(circle at 35% 25%,color-mix(in srgb,var(--acc) 60%,transparent),transparent 62%),#191125;
    text-shadow:0 1px 2px #000}
  .ds-body{flex:1;min-width:0}
  .ds-name{font-size:14.5px;color:var(--parchment);line-height:1.15}
  .ds-meta{display:flex;gap:8px;align-items:center;margin-top:3px;flex-wrap:wrap}
  .ds-band{font-size:11px;color:var(--acc,#c9bce6);filter:brightness(1.4);letter-spacing:.03em;font-variant-numeric:tabular-nums}
  .ds-boss{font-size:10.5px;color:#9a8fb8} .ds-boss b{color:#d7c6a2}
  .ds-pills{display:flex;gap:6px;margin-top:6px;flex-wrap:wrap}
  .ds-pill{font-size:9px;letter-spacing:.06em;text-transform:uppercase;padding:2.5px 7px;border-radius:999px;
    border:1px solid var(--line2,#4a3d68);color:#9a8fb8;background:#00000030}
  .ds-pill.drop{color:#d8c47a;border-color:#5a4a2a}
  .ds-pill.drop.rare{color:#8fb7ff;border-color:#38466e}
  .ds-pill.drop.epic{color:#d69bff;border-color:#5a3a72}
  .ds-pill.rec{color:#9ad1ff;border-color:#33506e}
  .ds-num{position:absolute;right:10px;top:8px;font-size:9px;color:#6d6390;letter-spacing:.1em}
  .ds-flag{position:absolute;right:9px;bottom:9px;font-size:8.5px;letter-spacing:.12em;text-transform:uppercase;
    font-weight:bold;padding:3px 8px;border-radius:7px}
  .ds-flag.cleared{color:#8fd39a;background:#173021;border:1px solid #2f5a3e}
  .ds-flag.active{color:#0f0a1c;background:linear-gradient(#ffd98a,#e0a94e);border:1px solid #f0c877}
  .ds-flag.new{color:#e0b063;background:#2a2036;border:1px solid #5a4630}
  .ds-flag.locked{color:#6d6390;background:#1a1428;border:1px solid #322a46}
  .ds-card.cleared{opacity:.74} .ds-card.cleared .ds-badge{filter:grayscale(.35)}
  .ds-card.active{border-color:#e0a94e;box-shadow:0 0 0 1px #e0a94e55}
  .ds-card.locked{opacity:.6;cursor:default} .ds-card.locked:active{transform:none}
  .ds-card.locked .ds-name{color:#9a8fb8} .ds-card.locked .ds-badge{filter:grayscale(.85) brightness(.7)}
  .ds-lock{font-size:10px;color:#c98a8a;margin-top:5px}
  .ds-list{display:flex;flex-direction:column;gap:9px}
  `;
  document.head.appendChild(s);
}

/* ctx = { dungeons, active, cleared, roomIdx, resumable, partyLevel, silver, gems,
           select:(id)=>void, resume:()=>void, back:()=>void } */
export function openDungeonSelect(ctx) {
  ensureTownCss(); ensureDungeonCss();
  const el = document.getElementById("town");
  const cleared = ctx.cleared || [];
  const activeId = ctx.active;
  const activeD = ctx.dungeons.find(d => d.id === activeId) || ctx.dungeons[0];

  const card = d => {
    const unlocked = isUnlocked(d, cleared);
    const done = cleared.includes(d.id);
    const here = d.id === activeId && ctx.resumable;
    const state = !unlocked ? "locked" : here ? "active" : done ? "cleared" : "new";
    const flag = { locked: "Locked", active: "In Progress", cleared: "Cleared ✓", new: "✦ New" }[state];
    const dropClass = FLOOR_CLASS[d.dropFloor] || "";
    const showPills = unlocked && !done;   // keep cleared rows tidy; live rungs advertise the spoils
    const lockHint = !unlocked
      ? `<div class="ds-lock">${iconImg("skull", 10)} Defeat ${prevDungeon(d) ? prevDungeon(d).boss.name : "the previous boss"}</div>` : "";
    return `<div class="ds-card ${state}" ${unlocked ? `data-go="${d.id}"` : ""} style="--acc:${d.accent}">
      <span class="rail"></span>
      <div class="ds-badge">${ROMAN[d.tier - 1]}</div>
      <div class="ds-body">
        <div class="ds-name">${d.name}</div>
        <div class="ds-meta"><span class="ds-band">Lv ${d.band[0]}–${d.band[1]}</span>
          <span class="ds-boss">boss · <b>${d.boss.name}</b></span></div>
        ${showPills ? `<div class="ds-pills"><span class="ds-pill drop ${dropClass}">Drops · ${FLOOR_LABEL[d.dropFloor]}</span><span class="ds-pill rec">Rec. Lv ${d.recLevel}</span></div>` : ""}
        ${lockHint}
      </div>
      <span class="ds-num">${ROMAN[d.tier - 1]}</span>
      <span class="ds-flag ${state}">${flag}</span>
    </div>`;
  };

  const roomsInto = ctx.resumable ? `Room ${Math.min(ROOM_COUNT, ctx.roomIdx + 1)} of ${ROOM_COUNT}` : "Ready to descend";
  const cont = `<div class="ds-cont" data-resume>
      <div class="cbtn">${iconImg("sword", 18)}</div>
      <div class="ct"><b>Continue — ${activeD.name}</b><small>${roomsInto} · party Lv ${ctx.partyLevel}</small></div>
      <span class="go">Resume ›</span>
    </div>`;

  el.innerHTML = `<div class="tw-wrap">
    <button class="tw-btn primary" data-back style="justify-content:center;margin-bottom:6px">${iconImg("house", 16)} Return to the Keep</button>
    <div class="shop-top" style="justify-content:flex-end">
      <span class="tw-cur"><span>${iconImg("coin", 12)} ${ctx.silver}</span> <span class="g">${iconImg("gem", 12)} ${ctx.gems}</span></span>
    </div>
    <div class="tw-head"><h1>Dungeons</h1><p>Descend deeper for deadlier foes — and richer spoils.</p></div>
    ${cont}
    <div class="tw-sec">The Descent — clear a boss to open the next</div>
    <div class="ds-list">${ctx.dungeons.map(card).join("")}</div>
  </div>`;

  el.querySelector("[data-back]").onclick = () => ctx.back();
  el.querySelector("[data-resume]").onclick = () => ctx.resume();
  el.querySelectorAll("[data-go]").forEach(c => c.onclick = () => ctx.select(c.getAttribute("data-go")));
}
