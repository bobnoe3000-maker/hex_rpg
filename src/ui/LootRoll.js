/* ============ UI :: LootRoll.js — the loot drop "slot roll" ============ */
/* Every gear drop opens this over the delve (the overlay freezes the fight). An item is Prefix +
   Material + Type; three reels spin and settle on the drop's components, each granting a stat, with
   the rarity set by the rarest of the three. Reroll re-spins the whole item for silver, or Accept
   drops it into the bag. Pure presentation — silver, reroll and accept all come through ctx. */
"use strict";

import { GRADE_COLOR } from "./itemView.js";
import { gearIconImg } from "../engine/gearIcon.js";
import { iconImg } from "../engine/icons.js";

const SL = { atk: "ATK", def: "DEF", hp: "HP", crit: "Crit", dodge: "Dodge", aspd: "Speed" };
const CELL_H = 56;
const easeOut = x => 1 - Math.pow(1 - x, 3);
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

let cssDone = false;
function injectCss() {
  if (cssDone) return; cssDone = true;
  const s = document.createElement("style"); s.id = "lr-style";
  s.textContent = `
  .lr{width:100%;max-width:440px;max-height:calc(100dvh - 28px);overflow-y:auto;
    background:linear-gradient(#221a36,#171025);border:1px solid var(--line2,#4a3d68);border-radius:16px;
    padding:15px 15px 16px;box-shadow:0 20px 48px -18px #000,inset 0 1px 0 #4a3d68;text-align:left;
    font-family:Georgia,serif;--gc:#e8e8e8}
  .lr-top{display:flex;align-items:center;gap:11px;margin-bottom:13px}
  .lr-slot{width:46px;height:46px;flex:0 0 auto;border-radius:11px;border:1px solid var(--gc);display:grid;place-items:center;
    background:radial-gradient(circle at 40% 30%,color-mix(in srgb,var(--gc) 30%,#1a1228),#120d1c)}
  .lr-who{flex:1;min-width:0}
  .lr-who .eye{font-family:ui-monospace,monospace;font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:#e0b063;opacity:.85}
  .lr-who b{font-size:17px;display:block;line-height:1.15;color:var(--gc)}
  .lr-grade{font-family:ui-monospace,monospace;font-size:8.5px;letter-spacing:.14em;text-transform:uppercase;padding:3px 8px;border-radius:999px;
    white-space:nowrap;color:var(--gc);border:1px solid color-mix(in srgb,var(--gc) 55%,transparent);background:color-mix(in srgb,var(--gc) 12%,transparent)}
  .lr-reels{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-bottom:12px}
  .lr-reel{background:linear-gradient(#181022,#120c1c);border:1px solid var(--line,#332a48);border-radius:11px;padding:7px 5px}
  .lr-reel .rl{font-family:ui-monospace,monospace;font-size:8px;letter-spacing:.14em;text-transform:uppercase;color:#6d6390;text-align:center;display:block;margin-bottom:5px}
  .lr-win{position:relative;height:${CELL_H}px;overflow:hidden;border-radius:8px;background:linear-gradient(#0d0916,#160f24);box-shadow:inset 0 0 0 1px #2a2340}
  .lr-win::before,.lr-win::after{content:"";position:absolute;left:0;right:0;height:14px;z-index:2;pointer-events:none}
  .lr-win::before{top:0;background:linear-gradient(#0d0916,transparent)}
  .lr-win::after{bottom:0;background:linear-gradient(transparent,#0d0916)}
  .lr-strip{position:absolute;left:0;right:0;top:0;will-change:transform}
  .lr-cell{height:${CELL_H}px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:0 4px;text-align:center}
  .lr-cell b{font-size:13.5px;color:var(--parchment,#efe7ff);line-height:1.05}
  .lr-cell.none b{color:#6d6390;font-style:italic;font-weight:normal;font-size:12px}
  .lr-cell .st{font-family:ui-monospace,monospace;font-size:9px;color:#f0c877}
  .lr-cell .st.bad{color:#e5867f}.lr-cell .st.no{color:#6d6390}
  .lr-cell .st .bad{color:#e5867f}
  .lr-reel.locked{border-color:var(--gc);box-shadow:0 0 0 1px color-mix(in srgb,var(--gc) 30%,transparent)}
  .lr-reel.pop{animation:lrpop .3s ease}
  @keyframes lrpop{0%{transform:scale(1)}42%{transform:scale(1.06)}100%{transform:scale(1)}}
  .lr-item{border:1px solid color-mix(in srgb,var(--gc) 55%,#2a2340);border-radius:12px;padding:11px 12px;margin-bottom:13px;
    background:radial-gradient(120% 90% at 50% -20%,color-mix(in srgb,var(--gc) 12%,transparent),transparent 70%),#150f24}
  .lr-item .nm{font-size:15px;font-weight:bold;color:var(--gc);margin-bottom:7px}
  .lr-stats{display:flex;flex-wrap:wrap;gap:5px}
  .lr-chip{font-family:ui-monospace,monospace;font-size:9.5px;padding:3px 7px;border-radius:6px;background:#241b38;color:var(--parchment,#efe7ff);border:1px solid #332a4a}
  .lr-chip.bad{color:#e5867f;border-color:#5a2f2f}
  .lr-chip.kw{color:#2a0f08;background:#e0b063;border-color:#8a5f22;font-weight:bold}
  .lr-chip.kw.blue{color:#06121a;background:#9ad1ff;border-color:#2f4a63}
  .lr-ctrl{display:flex;gap:8px}
  .lr-ctrl button{font-family:Georgia,serif;font-weight:bold;border:0;border-radius:11px;cursor:pointer;letter-spacing:.05em}
  .lr-reroll{flex:1;padding:13px;font-size:13px;color:var(--parchment,#efe7ff);background:linear-gradient(#2c2342,#1c1630);box-shadow:0 4px 0 #100b1c;
    display:flex;align-items:center;justify-content:center;gap:6px}
  .lr-reroll:active{transform:translateY(2px);box-shadow:0 2px 0 #100b1c}
  .lr-reroll:disabled{opacity:.45;cursor:default;transform:none;box-shadow:0 4px 0 #100b1c}
  .lr-accept{flex:1.3;padding:13px;font-size:14px;text-transform:uppercase;letter-spacing:.08em;color:#241606;background:linear-gradient(#e8bf78,#b47f34);box-shadow:0 4px 0 #6e4a14}
  .lr-accept:active{transform:translateY(2px);box-shadow:0 2px 0 #6e4a14}
  .lr-accept:disabled{opacity:.5;cursor:default;transform:none;box-shadow:0 4px 0 #6e4a14}
  .lr-hint{text-align:center;font-family:ui-monospace,monospace;font-size:10px;color:#6d6390;margin-top:11px;min-height:12px}
  .lr-hint b{color:#9a8fb8}
  `;
  document.head.appendChild(s);
}

/* ctx = { silver:()=>n, rerollCost:()=>n, reroll:()=>rollOrNull, accept:()=>void, close:()=>void, from } */
export function openLootRoll(roll, ctx) {
  injectCss();
  const overlay = document.getElementById("overlay");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let spinning = false;

  const statText = c => {
    if (!c.stat) return "";
    const main = `${c.val >= 0 ? "+" : ""}${c.stat === "aspd" ? c.val.toFixed(1) : c.val} ${SL[c.stat]}`;
    const proc = c.proc ? ` · ${c.proc}` : "";
    const draw = c.draw ? ` <span class="bad">${c.draw.val} ${SL[c.draw.stat]}</span>` : "";
    return main + proc + draw;
  };
  const cellHtml = (c, kind) => `<div class="lr-cell ${c.name ? "" : "none"}"><b>${c.name || "— none —"}</b>` +
    (c.stat ? `<span class="st ${c.val < 0 ? "bad" : ""}">${statText(c)}</span>` : `<span class="st no">${kind === "prefix" ? "no prefix" : "—"}</span>`) + `</div>`;

  const el = sel => overlay.querySelector(sel);
  const stripOf = k => overlay.querySelector(`[data-reel="${k}"] .lr-strip`);
  const reelOf = k => overlay.querySelector(`[data-reel="${k}"]`);

  function shell() {
    overlay.innerHTML = `<div class="lr" style="--gc:${GRADE_COLOR[roll.item.grade] || "#e8e8e8"}">
      <div class="lr-top">
        <div class="lr-slot" data-slot>${gearIconImg(roll.item, 28)}</div>
        <div class="lr-who"><span class="eye" data-eye>${cap(roll.item.slot)} drop${ctx.from ? ` · ${ctx.from}` : ""}</span><b data-nm>${roll.item.n}</b></div>
        <span class="lr-grade" data-grade>${roll.item.grade}</span>
      </div>
      <div class="lr-reels">
        ${["prefix", "material", "type"].map(k => `<div class="lr-reel" data-reel="${k}"><span class="rl">${k}</span><div class="lr-win"><div class="lr-strip"></div></div></div>`).join("")}
      </div>
      <div class="lr-item" data-item><div class="nm" data-inm>${roll.item.n}</div><div class="lr-stats" data-istats></div></div>
      <div class="lr-ctrl">
        <button class="lr-reroll" data-reroll>${iconImg("refresh", 12)} Reroll · ${iconImg("coin", 11)} <span data-rc>${ctx.rerollCost()}</span></button>
        <button class="lr-accept" data-accept>Accept → Bag</button>
      </div>
      <div class="lr-hint" data-hint>Reroll the drop for silver, or accept it into your bag.</div>
    </div>`;
    el("[data-reroll]").onclick = doReroll;
    el("[data-accept]").onclick = doAccept;
    paint();
    spin(true);
  }

  // fill the assembled-item card + recolor the modal to the current grade
  function paint() {
    const g = GRADE_COLOR[roll.item.grade] || "#e8e8e8";
    el(".lr").style.setProperty("--gc", g);
    el("[data-slot]").innerHTML = gearIconImg(roll.item, 28);
    el("[data-eye]").textContent = `${cap(roll.item.slot)} drop${ctx.from ? ` · ${ctx.from}` : ""}`;
    el("[data-nm]").innerHTML = roll.item.n;
    el("[data-inm]").innerHTML = roll.item.n;
    el("[data-grade]").textContent = roll.item.grade;
    const it = roll.item, chips = [];
    for (const s of ["atk", "crit", "def", "hp", "aspd", "dodge"]) if (it[s] !== undefined)
      chips.push(`<span class="lr-chip ${it[s] < 0 ? "bad" : ""}">${it[s] >= 0 ? "+" : ""}${s === "aspd" ? it[s].toFixed(1) : it[s]} ${SL[s]}</span>`);
    if (it.rng > 1) chips.push(`<span class="lr-chip kw blue">Ranged</span>`);
    if (it.twoH) chips.push(`<span class="lr-chip kw blue">Two-handed</span>`);
    if (it.proc) chips.push(`<span class="lr-chip kw">${cap(it.proc.kind)}</span>`);
    el("[data-istats]").innerHTML = chips.join("");
    const rc = el("[data-rc]"); if (rc) rc.textContent = ctx.rerollCost();
    syncReroll();
  }
  function syncReroll() {
    const b = el("[data-reroll]"); if (!b) return;
    b.disabled = spinning || ctx.silver() < ctx.rerollCost();
  }

  function spin(first) {
    spinning = true; el("[data-accept]").disabled = true; syncReroll();
    const anims = [];
    ["prefix", "material", "type"].forEach((k, i) => {
      const strip = stripOf(k), reel = reelOf(k), pool = roll.pools[k];
      reel.classList.remove("locked", "pop");
      const turns = reduce ? 0 : 9 + i * 4;
      let cells = "";
      for (let n = 0; n < turns; n++) cells += cellHtml(pool[(Math.random() * pool.length) | 0], k);
      cells += cellHtml(roll.parts[k], k);         // land on the actual component (last cell)
      strip.innerHTML = cells; strip.style.transform = "translateY(0)";
      anims.push({ strip, reel, end: turns, dur: reduce ? 220 : 850 + i * 300 });
    });
    const start = performance.now();
    (function frame(now) {
      let done = true;
      for (const a of anims) {
        if (a.fin) continue;
        const t = Math.min(1, (now - start) / a.dur), pos = a.end * easeOut(t);
        a.strip.style.transform = `translateY(${-pos * CELL_H}px)`;
        if (t >= 1) { a.fin = true; a.reel.classList.add("locked", "pop"); setTimeout(() => a.reel.classList.remove("pop"), 300); }
        else done = false;
      }
      if (!done) requestAnimationFrame(frame);
      else { spinning = false; el("[data-accept]").disabled = false; paint(); }
    })(start);
  }

  function doReroll() {
    if (spinning) return;
    const nr = ctx.reroll();
    if (!nr) { el("[data-hint]").innerHTML = `<b>Not enough silver</b> to reroll.`; return; }
    roll = nr;
    el("[data-hint]").textContent = "Rolling…";
    spin(false);
  }
  function doAccept() {
    if (spinning) return;
    ctx.accept();
    ctx.close();
  }

  overlay.classList.add("show");
  shell();
}
