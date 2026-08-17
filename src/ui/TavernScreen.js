/* ============ UI :: TavernScreen.js — party · reserves · new hires ============ */
/* Three clearly-separated groups, rendered into #town over the hub (ctx.back → Keep):
     · your active party (main + up to 2) — companions can be BENCHED
     · your reserves — benched pals, kept with all their gear; ADD them back for a small recall fee
     · looking for work — freshly-generated strangers you HIRE for silver
   Bench a companion to free a slot; nothing is lost while they wait on the bench. */
"use strict";

import { ensureTownCss } from "./TownScreen.js";
import { derive } from "../systems/StatEngine.js";
import { heroKit } from "../systems/Skills.js";
import { starLabel } from "./stars.js";
import { iconImg } from "../engine/icons.js";

let tvCssDone = false;
function ensureTavernCss() {
  if (tvCssDone) return; tvCssDone = true;
  const s = document.createElement("style"); s.id = "tavern-style";
  s.textContent = `
  .tv-return{font-family:inherit;font-weight:bold;letter-spacing:1.5px;font-size:15px;text-transform:uppercase;
    border:0;border-radius:11px;padding:14px;cursor:pointer;width:100%;margin:0 0 10px;
    background:linear-gradient(#e0b063,#a8722a);color:#241606;box-shadow:0 4px 0 #6e4a14;
    display:flex;align-items:center;justify-content:center;gap:9px}
  .tv-return:active{transform:translateY(2px);box-shadow:0 2px 0 #6e4a14}
  /* section header with an accent bar */
  .tv-sech{display:flex;align-items:center;gap:8px;margin:16px 2px 8px}
  .tv-sech .bar{width:3px;height:15px;border-radius:2px;background:var(--sc,#e0b063)}
  .tv-sech .t{font-family:ui-monospace,monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--sc,#e0b063)}
  .tv-sech .n{margin-left:auto;font-family:ui-monospace,monospace;font-size:10px;color:#6d6390}
  /* member card */
  .tv-card{display:flex;align-items:center;gap:10px;background:linear-gradient(#1e1633,#171025);
    border:1px solid var(--line);border-left:3px solid var(--sc,var(--line));border-radius:11px;padding:9px 10px;margin-bottom:7px}
  .tv-card.tap{cursor:pointer}
  .tv-card.tap:active{transform:translateY(1px)}
  .tv-av{position:relative;width:42px;height:42px;flex:0 0 auto}
  .tv-av canvas{width:42px;height:42px;border-radius:9px;border:1px solid #6e5a2a;display:block}
  .tv-av.dead canvas{filter:grayscale(1) brightness(.62);border-color:#5a2a2a}
  .tv-av .crown{position:absolute;left:50%;top:-10px;transform:translateX(-50%);line-height:0}
  .tv-dot{position:absolute;top:-4px;right:-4px;width:11px;height:11px;border-radius:50%;background:#e0b063;border:2px solid #171025;box-shadow:0 0 6px #e0b063}
  .tv-dot.roll{background:#8fd39a;box-shadow:0 0 6px #8fd39a}
  .tv-who{flex:1;min-width:0}
  .tv-who b{font-family:inherit;font-size:13.5px;color:#f0c877}
  .tv-who .sub{font-size:10.5px;color:#b9add6;margin-top:1px}
  .tv-who .sub .cls{text-transform:capitalize;font-style:italic}
  .tv-who .sub .strg{color:#8fd39a}
  .tv-who .stat{font-family:ui-monospace,monospace;font-size:9px;color:#9a8fb8;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .tv-skrow{display:flex;flex-wrap:wrap;gap:4px;margin-top:5px}
  .tv-sk{font-family:ui-monospace,monospace;font-size:9px;letter-spacing:.02em;padding:2px 6px;border-radius:5px;line-height:1.4}
  .tv-sk.a{color:#2a0f08;background:#ff9a5c}
  .tv-sk.p{color:#06121a;background:#9ad1ff}
  .tv-sk .tv-sst{opacity:.7;font-weight:bold}
  .tv-chips{display:flex;gap:5px;margin-top:4px;flex-wrap:wrap}
  .tv-chip{font-family:ui-monospace,monospace;font-size:8.5px;letter-spacing:.03em;padding:2px 6px;border-radius:5px;
    background:#241b38;color:#b9add6;border:1px solid #332a4a}
  .tv-chip.gear{color:#8fb3d9;border-color:#2f4a63;background:#132030}
  .tv-chip.lead{color:#f0c877;border-color:#5a4a1e;background:#241d0d}
  .tv-chip.dead{color:#c98a8a;border-color:#5a2a2a;background:#241417}
  .tv-act{display:flex;flex-direction:column;gap:5px;align-items:flex-end;flex:0 0 auto}
  .tv-mut{font-family:ui-monospace,monospace;font-size:9px;color:#6d6390}
  .tv-price{font-family:ui-monospace,monospace;font-size:11px;color:#f0d38a;display:flex;align-items:center;gap:3px}
  .tv-b{font-family:inherit;font-weight:bold;font-size:11.5px;border:0;border-radius:8px;padding:8px 11px;cursor:pointer;white-space:nowrap}
  .tv-b:active{transform:translateY(1px)}
  .tv-b.bench{background:linear-gradient(#33415e,#222c42);color:#cfe0f5;box-shadow:0 2px 0 #131c2c}
  .tv-b.add{background:linear-gradient(#e8bf78,#b47f34);color:#241606;box-shadow:0 2px 0 #6e4a14}
  .tv-b.hire{background:linear-gradient(#8fd39a,#3a8a5a);color:#04140f;box-shadow:0 2px 0 #1c4a30}
  .tv-b.ghost{background:none;color:#6d6390;font-weight:normal;font-size:10px;padding:2px 4px;box-shadow:none}
  .tv-b.ghost:active{color:#e5484d}
  .tv-b[disabled]{opacity:.4;pointer-events:none}
  .tv-empty{display:flex;align-items:center;justify-content:center;color:#6d6390;font-style:italic;font-size:11.5px;
    border:1px dashed var(--sc,var(--line));border-radius:11px;padding:13px;margin-bottom:7px;text-align:center}
  .tv-refresh{width:100%;margin-top:2px;font-family:inherit;font-size:12px;color:var(--parchment);
    background:linear-gradient(#2c2342,#1c1630);border:0;border-radius:9px;padding:11px;cursor:pointer;
    box-shadow:0 3px 0 #100b1c;display:flex;align-items:center;justify-content:center;gap:7px}
  .tv-refresh:active{transform:translateY(1px)}
  .tv-refresh[disabled]{opacity:.4;pointer-events:none}
  `;
  document.head.appendChild(s);
}

const GOLD = "#e0b063", STEEL = "#8fb3d9", LIVE = "#8fd39a";
const gearCount = h => Object.values(h.gear || {}).filter(Boolean).length;

/* ctx = { silver, party, bench, recruits, partyCap, hireCost, recallCost, refreshCost,
           hire, drop, addBack, release, refresh, portrait, openHero, tileFlag, back } */
export function openTavern(ctx) {
  ensureTownCss(); ensureTavernCss();
  const el = document.getElementById("town");

  function render() {
    const party = ctx.party(), bench = ctx.bench(), recruits = ctx.recruits(), silver = ctx.silver();
    const cap = ctx.partyCap || 3;
    const openSlots = Math.max(0, cap - party.length);
    const roster = [];  // heroes in DOM order, for drawing portraits after innerHTML

    // ---- a member card (party / bench / recruit) ----
    // view: "manage" → tap opens the owned hero's panel · "preview" → tap opens a read-only look
    const card = (h, { accent, crown = false, dot = "", chips = "", stat = "", skills = "", strayLabel = "", actions = "", view = null }) => {
      roster.push(h);
      const idx = roster.length - 1;
      const attr = view === "preview" ? `data-preview="${idx}"` : view === "manage" ? `data-view="${idx}"` : "";
      return `<div class="tv-card ${view ? "tap" : ""}" style="--sc:${accent}" ${attr}>
        <div class="tv-av ${h.alive ? "" : "dead"}"><canvas width="96" height="96"></canvas>${crown ? `<span class="crown">${iconImg("crown", 11)}</span>` : ""}${dot}</div>
        <div class="tv-who"><b>${h.name}</b>
          <div class="sub"><span class="cls">${h.alive ? h.cls : "fallen"}</span> · Lv ${h.level}${strayLabel}</div>
          ${stat ? `<div class="stat">${stat}</div>` : ""}${skills ? `<div class="tv-skrow">${skills}</div>` : ""}${chips ? `<div class="tv-chips">${chips}</div>` : ""}</div>
        <div class="tv-act">${actions}</div></div>`;
    };
    // every skill the hero carries, as wrapping active/passive chips (so a recruit's whole kit is readable)
    const skillChips = h => heroKit(h).map(k => `<span class="tv-sk ${k.type[0]}" title="${k.type} · ${starLabel(k.points)}">${k.name} <span class="tv-sst">${starLabel(k.points)}</span></span>`).join("");

    // ---- party ----
    const partyCards = party.map((h, i) => {
      const flag = h.alive && ctx.tileFlag && ctx.tileFlag(h);
      const dot = flag ? `<span class="tv-dot ${flag === "roll" ? "roll" : ""}"></span>` : "";
      const chips = `<span class="tv-chip gear">${gearCount(h)} items</span>${h.alive ? "" : `<span class="tv-chip dead">fallen</span>`}`;
      const actions = i === 0
        ? `<span class="tv-mut">leader</span>`
        : `<button class="tv-b bench" data-drop="${i}">${iconImg("chevron", 11)} Bench</button>`;
      return card(h, { accent: GOLD, crown: i === 0, dot, chips, actions, view: "manage" });
    }).join("");
    const emptyCards = Array.from({ length: openSlots }, () =>
      `<div class="tv-empty" style="--sc:${GOLD}">open slot — add a reserve or hire below</div>`).join("");

    // ---- reserves (bench) ----
    const benchCards = bench.length ? bench.map((h, i) => {
      const cost = ctx.recallCost(h), room = openSlots > 0, canAfford = silver >= cost;
      const chips = `<span class="tv-chip gear">${iconImg("gem", 9)} gear kept · ${gearCount(h)} items</span>`;
      const addBtn = `<button class="tv-b add" data-add="${i}" ${(!room || !canAfford) ? "disabled" : ""}>${iconImg("chevron", 11)} Add · ${iconImg("coin", 10)} ${cost}</button>`;
      const actions = `${addBtn}<button class="tv-b ghost" data-release="${i}">release</button>`;
      return card(h, { accent: STEEL, chips, actions, view: "manage" });
    }).join("") : `<div class="tv-empty" style="--sc:${STEEL}">No one benched — drop a companion to keep them (and their gear) here.</div>`;

    // ---- for hire (recruits) ----
    const hireCards = recruits.length ? recruits.map((h, i) => {
      const D = derive(h), cost = ctx.hireCost(h), full = openSlots === 0, canAfford = silver >= cost;
      const stat = `HP ${D.maxhp} · ATK ${D.atk} · DEF ${D.def} · Dodge ${D.dodge} · Crit ${D.crit}`;
      const actions = `<span class="tv-price">${iconImg("coin", 11)} ${cost}</span>`
        + `<button class="tv-b hire" data-hire="${i}" ${(full || !canAfford) ? "disabled" : ""}>Hire</button>`;
      return card(h, { accent: LIVE, stat, skills: skillChips(h), strayLabel: ` · <span class="strg">stranger</span>`, actions, view: "preview" });
    }).join("") : `<div class="tv-empty" style="--sc:${LIVE}">Nobody's here — try <b>New faces</b>.</div>`;

    const subtitle = openSlots > 0
      ? `${openSlots} open slot${openSlots > 1 ? "s" : ""} — add a reserve or hire a stranger`
      : "Party full — bench a companion to make room";

    el.innerHTML = `<div class="tw-wrap">
      <button class="tv-return" data-back>${iconImg("house", 16)} Return to the Keep</button>
      <div class="shop-top" style="justify-content:flex-end"><span class="tw-cur"><span>${iconImg("coin", 13)} ${silver}</span></span></div>
      <div class="tw-head"><h1>Tavern</h1><p style="font-size:12px;color:#9a8fb8;font-style:italic">${subtitle}</p></div>

      <div class="tv-sech" style="--sc:${GOLD}"><span class="bar"></span><span class="t">In your party</span><span class="n">${party.length} / ${cap}</span></div>
      ${partyCards}${emptyCards}

      <div class="tv-sech" style="--sc:${STEEL}"><span class="bar"></span><span class="t">Your reserves · benched</span><span class="n">${bench.length ? bench.length + " kept" : ""}</span></div>
      ${benchCards}

      <div class="tv-sech" style="--sc:${LIVE}"><span class="bar"></span><span class="t">Looking for work · new hires</span></div>
      ${hireCards}
      <button class="tv-refresh" data-refresh ${silver < ctx.refreshCost ? "disabled" : ""}>${iconImg("refresh", 13)} New faces · ${iconImg("coin", 12)} ${ctx.refreshCost}</button>
    </div>`;

    // draw portraits (roster is in DOM order)
    el.querySelectorAll(".tv-card canvas").forEach((cv, i) => {
      if (roster[i]) cv.getContext("2d").drawImage(ctx.portrait(roster[i]), 0, 0, 96, 96);
    });

    // wire actions
    el.querySelector("[data-back]").onclick = () => ctx.back();
    el.querySelector("[data-refresh]").onclick = () => { if (ctx.refresh()) render(); };
    el.querySelectorAll("[data-view]").forEach(c => c.onclick = e => {
      if (e.target.closest("button")) return;         // let the action buttons handle their own clicks
      ctx.openHero(roster[+c.getAttribute("data-view")]);
    });
    el.querySelectorAll("[data-preview]").forEach(c => c.onclick = e => {
      if (e.target.closest("button")) return;         // Hire button handles its own click
      (ctx.preview || ctx.openHero)(roster[+c.getAttribute("data-preview")]);
    });
    el.querySelectorAll("[data-drop]").forEach(b => b.onclick = () => { if (ctx.drop(ctx.party()[+b.getAttribute("data-drop")])) render(); });
    el.querySelectorAll("[data-add]").forEach(b => b.onclick = () => { if (ctx.addBack(ctx.bench()[+b.getAttribute("data-add")])) render(); });
    el.querySelectorAll("[data-release]").forEach(b => b.onclick = () => { if (ctx.release(ctx.bench()[+b.getAttribute("data-release")])) render(); });
    el.querySelectorAll("[data-hire]").forEach(b => b.onclick = () => { const h = ctx.recruits()[+b.getAttribute("data-hire")]; if (h && ctx.hire(h)) render(); });
  }

  render();
}
