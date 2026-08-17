/* ============ UI :: DungeonSelect.js — the world map (tiered descent) ============ */
/* The Depart button opens this: the illustrated Dreadmere Trails map (assets/world.png) with a
   tappable node per dungeon. A node's ring shows its state (cleared ✓ / open / locked); tapping one
   raises a detail sheet — level band, boss, drops — and a Descend/Resume button, or the unlock
   requirement when it's locked. Pure UI: all state/logic comes through ctx. */
"use strict";

import { ensureTownCss } from "./TownScreen.js";
import { isUnlocked, prevDungeon, ROOM_COUNT } from "../data/dungeons.js";
import { iconImg } from "../engine/icons.js";

const FLOOR_LABEL = { plain: "Plain+", fine: "Fine+", rare: "Rare+", epic: "Epic+" };
/* node centres as % of the artwork, calibrated to the printed locations on world.png (tier 1 → 10) */
const POS = [
  [27, 88], [49, 83], [64, 80], [23, 65], [62, 58],
  [64, 43], [17, 38], [64, 31], [21, 24], [21, 13],
];
const AR = 768 / 1376;          // world.png aspect
let dmObs = null;               // disconnect the previous fit-observer on each re-render

let dsCssDone = false;
function ensureDungeonCss() {
  if (dsCssDone) return; dsCssDone = true;
  const s = document.createElement("style"); s.id = "dungeon-style";
  s.textContent = `
  .dsmap{position:fixed;inset:0;z-index:1;overflow:hidden;background:#0b0912;display:flex;flex-direction:column;
    font-family:Georgia,"Times New Roman",serif;color:var(--parchment);
    -webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
  .dm-artwrap{flex:1 1 auto;min-height:0;position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden}
  .dm-art{position:relative;background:#0b0912 url('assets/world.png') center/cover no-repeat}
  .dm-vig{position:absolute;inset:0;pointer-events:none;background:linear-gradient(#0b091255 0%,transparent 10%,transparent 60%,#0b0912dd 100%)}
  /* top chrome */
  .dm-top{position:absolute;left:0;right:0;top:0;z-index:8;display:flex;align-items:center;justify-content:space-between;
    padding:calc(env(safe-area-inset-top) + 9px) 11px 0}
  .dm-back{font-size:13px;color:#9ad1ff;cursor:pointer;background:#120d1ccc;border:1px solid var(--line);border-radius:9px;padding:6px 11px}
  .dm-back:active{transform:translateY(1px)}
  .dm-cur{font-size:12px;color:#f0d38a;font-variant-numeric:tabular-nums;background:#120d1ccc;border:1px solid var(--line);border-radius:9px;padding:5px 10px;display:flex;gap:9px}
  .dm-cur .g{color:#9ad1ff}
  /* nodes */
  .dm-node{position:absolute;transform:translate(-50%,-50%);width:30px;height:30px;border-radius:50%;cursor:pointer;z-index:6;
    border:2px solid var(--nc,#f0c877);background:radial-gradient(circle at 40% 35%,#241b38,#0d0a16);
    display:grid;place-items:center;font-family:inherit;font-weight:bold;font-size:12px;color:var(--nc,#f0c877);
    box-shadow:0 3px 9px #000a,0 0 0 3px #0b091288}
  .dm-node:active{transform:translate(-50%,-50%) scale(.9)}
  .dm-node.cleared{--nc:#8fd39a}
  .dm-node.cleared::after{content:"✓";position:absolute;font-size:14px;color:#8fd39a}
  .dm-node.cleared .num{display:none}
  .dm-node.locked{--nc:#6d6390;border-color:#4a4360;color:#6d6390;filter:saturate(.6)}
  .dm-node.current .ring{position:absolute;inset:-6px;border-radius:50%;border:2px solid var(--nc,#f0c877);animation:dmpulse 2s ease-out infinite}
  @keyframes dmpulse{0%{transform:scale(.85);opacity:.8}100%{transform:scale(1.5);opacity:0}}
  .dm-node.sel{box-shadow:0 0 0 3px var(--nc),0 4px 12px #000b}
  /* hint pill */
  .dm-hint{position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom) + 14px);transform:translateX(-50%);z-index:7;
    font-size:11px;letter-spacing:.02em;color:#b9add6;background:#120d1ce8;border:1px solid var(--line);border-radius:999px;
    padding:7px 14px;white-space:nowrap;box-shadow:0 4px 14px #000a;transition:opacity .2s}
  .dm-hint b{color:#f0c877}
  /* detail sheet */
  .dm-sheet{position:absolute;left:0;right:0;bottom:0;z-index:9;background:linear-gradient(#181026f2,#0f0a1af8);
    border-top:1px solid #4a3d68;box-shadow:0 -10px 26px -12px #000;padding:8px 14px calc(14px + env(safe-area-inset-bottom));
    transform:translateY(115%);transition:transform .26s cubic-bezier(.2,.8,.2,1)}
  .dm-sheet.open{transform:translateY(0)}
  .dm-grab{display:flex;align-items:center;justify-content:center;position:relative;height:14px;margin-bottom:2px}
  .dm-grab i{width:34px;height:4px;border-radius:2px;background:#4a3d68}
  .dm-grab .x{position:absolute;right:0;top:-2px;font-size:16px;color:#6d6390;cursor:pointer;padding:2px 6px;line-height:1}
  .dm-hd{display:flex;align-items:center;gap:10px}
  .dm-crest{width:40px;height:40px;flex:0 0 auto;border-radius:9px;border:1px solid var(--sc,#6e5a2a);display:grid;place-items:center;font-size:20px;
    background:radial-gradient(circle at 40% 30%,color-mix(in srgb,var(--sc,#e0b063) 40%,#1a1228),#120d1c)}
  .dm-tt{flex:1;min-width:0}
  .dm-tt b{font-size:16px;color:#f0c877}
  .dm-tt .sub{font-size:11px;color:#b9add6;font-style:italic}
  .dm-flag{font-family:ui-monospace,monospace;font-size:8.5px;letter-spacing:.08em;text-transform:uppercase;padding:3px 8px;border-radius:999px;white-space:nowrap}
  .dm-flag.cleared{color:#8fd39a;background:#173021;border:1px solid #2f5a3e}
  .dm-flag.open{color:#0f0a1c;background:linear-gradient(#ffd98a,#e0a94e);border:1px solid #f0c877}
  .dm-flag.locked{color:#6d6390;background:#1a1428;border:1px solid #322a46}
  .dm-meta{display:flex;gap:15px;margin:10px 2px 0;font-size:11.5px;color:#b9add6;flex-wrap:wrap}
  .dm-meta b{color:var(--parchment)}
  .dm-meta .k{font-family:ui-monospace,monospace;font-size:8.5px;letter-spacing:.1em;text-transform:uppercase;color:#6d6390;display:block;margin-bottom:1px}
  .dm-cta{margin-top:12px}
  .dm-btn{width:100%;font-family:inherit;font-weight:bold;letter-spacing:.08em;text-transform:uppercase;font-size:15px;border:0;border-radius:12px;padding:13px;cursor:pointer}
  .dm-btn.go{background:linear-gradient(#e8bf78,#b47f34);color:#241606;box-shadow:0 4px 0 #6e4a14}
  .dm-btn.go:active{transform:translateY(2px);box-shadow:0 2px 0 #6e4a14}
  .dm-btn.farm{background:linear-gradient(#8fd39a,#3a8a5a);color:#04140f;box-shadow:0 4px 0 #1c4a30}
  .dm-btn.farm:active{transform:translateY(2px);box-shadow:0 2px 0 #1c4a30}
  .dm-btn.lock{background:#1a1428;color:#6d6390;border:1px solid #322a46;box-shadow:none;cursor:default;text-transform:none;font-weight:normal;font-size:12px;letter-spacing:0;display:flex;align-items:center;justify-content:center;gap:6px}
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
  const D = ctx.dungeons;

  const stateOf = d => !isUnlocked(d, cleared) ? "locked" : cleared.includes(d.id) ? "cleared" : "open";

  const nodes = D.map((d, i) => {
    const st = stateOf(d), isActive = d.id === activeId && st !== "locked";
    const [x, y] = POS[d.tier - 1] || [50, 50];
    return `<button class="dm-node ${st}${isActive ? " current" : ""}" data-i="${i}" style="left:${x}%;top:${y}%">${isActive ? `<span class="ring"></span>` : ""}<span class="num">${d.tier}</span></button>`;
  }).join("");

  el.innerHTML = `<div class="dsmap">
    <div class="dm-artwrap"><div class="dm-art" data-art>
      <div class="dm-vig"></div>
      ${nodes}
    </div></div>
    <div class="dm-top">
      <span class="dm-back" data-back>‹ Keep</span>
      <span class="dm-cur"><span>${iconImg("coin",12)} ${ctx.silver}</span><span class="g">${iconImg("gem",12)} ${ctx.gems}</span></span>
    </div>
    <div class="dm-hint" data-hint>Tap a trail · <b>◆ open</b> · ✓ cleared · 🔒 locked</div>
    <div class="dm-sheet" data-sheet></div>
  </div>`;

  const art = el.querySelector("[data-art]"), wrap = art.parentElement;
  const sheet = el.querySelector("[data-sheet]"), hint = el.querySelector("[data-hint]");

  // contain-fit the map so the whole image shows and node %s stay pinned to the locations
  const fit = () => { const w = wrap.clientWidth, h = wrap.clientHeight; if (!w || !h) return;
    let aw = w, ah = w / AR; if (ah > h) { ah = h; aw = h * AR; }
    art.style.width = aw + "px"; art.style.height = ah + "px"; };
  fit();
  if (dmObs) dmObs.disconnect();
  if (typeof ResizeObserver !== "undefined") { dmObs = new ResizeObserver(fit); dmObs.observe(wrap); }

  const nodeEls = [...el.querySelectorAll(".dm-node")];
  const close = () => { sheet.classList.remove("open"); nodeEls.forEach(b => b.classList.remove("sel")); hint.style.opacity = "1"; };

  function select(i) {
    const d = D[i], st = stateOf(d);
    const isActive = d.id === activeId && st !== "locked";
    const resumeHere = isActive && ctx.resumable;
    nodeEls.forEach((b, j) => b.classList.toggle("sel", j === i));
    const flag = st === "cleared" ? `<span class="dm-flag cleared">Cleared ✓</span>`
      : st === "open" ? `<span class="dm-flag open">Open</span>`
      : `<span class="dm-flag locked">Locked</span>`;
    let cta;
    if (st === "locked") {
      const prev = prevDungeon(d);
      cta = `<button class="dm-btn lock">${iconImg("skull", 12)} Defeat ${prev ? prev.boss.name : "the prior boss"} to unlock</button>`;
    } else if (resumeHere) {
      cta = `<button class="dm-btn go" data-resume>${iconImg("sword", 14)} Resume · Room ${Math.min(ROOM_COUNT, ctx.roomIdx + 1)}/${ROOM_COUNT}</button>`;
    } else if (st === "cleared") {
      cta = `<button class="dm-btn farm" data-go="${d.id}">${iconImg("sword", 14)} Descend · Farm</button>`;
    } else {
      cta = `<button class="dm-btn go" data-go="${d.id}">${iconImg("sword", 14)} Descend</button>`;
    }
    sheet.innerHTML = `<div class="dm-grab"><i></i><span class="x" data-close>✕</span></div>
      <div class="dm-hd"><div class="dm-crest" style="--sc:${d.accent}">${d.crest || ""}</div>
        <div class="dm-tt"><b>${d.name}</b><div class="sub">${d.sub || ""}</div></div>${flag}</div>
      <div class="dm-meta">
        <div><span class="k">Levels</span><b>Lv ${d.band[0]}–${d.band[1]}</b></div>
        <div><span class="k">Boss</span><b>${d.boss.name}</b></div>
        <div><span class="k">Drops</span><b>${FLOOR_LABEL[d.dropFloor] || d.dropFloor}</b></div>
      </div>
      <div class="dm-cta">${cta}</div>`;
    sheet.classList.add("open"); hint.style.opacity = "0";
    sheet.querySelector("[data-close]").onclick = e => { e.stopPropagation(); close(); };
    const g = sheet.querySelector("[data-go]"); if (g) g.onclick = () => ctx.select(g.getAttribute("data-go"));
    const r = sheet.querySelector("[data-resume]"); if (r) r.onclick = () => ctx.resume();
  }

  nodeEls.forEach((b, i) => b.onclick = e => { e.stopPropagation(); select(i); });
  art.onclick = () => { if (sheet.classList.contains("open")) close(); };
  el.querySelector("[data-back]").onclick = () => ctx.back();

  // land on the trail the player is most likely to want: the active dungeon, else the deepest open one
  let start = D.findIndex(d => d.id === activeId && stateOf(d) !== "locked");
  if (start < 0) { for (let i = D.length - 1; i >= 0; i--) if (stateOf(D[i]) === "open") { start = i; break; } }
  if (start >= 0) select(start);
}
