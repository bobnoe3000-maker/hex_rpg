/* ============ UI :: TavernScreen.js — hire randomly-generated companions ============ */
/* Renders into #town over the hub; ctx.back returns to the Keep. Party caps at 4 (main + 3). */
"use strict";

import { ensureTownCss } from "./TownScreen.js";
import { derive } from "../systems/StatEngine.js";
import { iconImg } from "../engine/icons.js";

const CAP = 3;   // main + 2 companions

let tvCssDone = false;
function ensureTavernCss() {
  if (tvCssDone) return; tvCssDone = true;
  const s = document.createElement("style"); s.id = "tavern-style";
  s.textContent = `
  .tv-party{display:flex;gap:6px}
  .tv-slot{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;
    background:linear-gradient(#241b38,#1a1328);border:1px solid var(--line);border-radius:9px;padding:7px 4px;font-size:10px}
  .tv-slot:active{transform:translateY(1px)}
  .tv-slot canvas{width:40px;height:40px;border-radius:7px;border:1px solid #6e5a2a}
  .tv-slot b{font-size:10.5px;color:var(--gold)} .tv-slot .cls{color:#9a8fb8;text-transform:capitalize;font-style:italic}
  .tv-slot .lv{color:#9ad1ff}
  .tv-slot.empty{opacity:.5;justify-content:center;color:#8fd39a;font-style:italic;cursor:default;min-height:74px}
  .tv-slot.dead{border-color:#5a2a2a}
  .tv-slot.dead canvas{filter:grayscale(1) brightness(.6)}
  .tv-slot.dead .cls{color:#c98a8a}
  .tv-return{font-family:inherit;font-weight:bold;letter-spacing:1.5px;font-size:16px;text-transform:uppercase;
    border:0;border-radius:11px;padding:15px 14px;cursor:pointer;width:100%;margin-top:4px;
    background:linear-gradient(#e0b063,#a8722a);color:#241606;box-shadow:0 4px 0 #6e4a14;
    display:flex;align-items:center;justify-content:center;gap:9px}
  .tv-return:active{transform:translateY(2px);box-shadow:0 2px 0 #6e4a14}
  `;
  document.head.appendChild(s);
}

/* ctx = { silver, party:()=>[], recruits:()=>[], hireCost, refreshCost,
           hire:(recruit)=>bool, refresh:()=>bool, portrait:(hero)=>canvas,
           openHero:(hero)=>void, back:()=>void } */
export function openTavern(ctx) {
  ensureTownCss(); ensureTavernCss();
  const el = document.getElementById("town");

  function render() {
    const party = ctx.party(), silver = ctx.silver(), recruits = ctx.recruits();
    const hasFallen = party.some((h, i) => i > 0 && !h.alive);
    const canReplace = party.length >= CAP && hasFallen;   // full, but a fallen pal can be swapped out
    const full = party.length >= CAP && !hasFallen;        // truly full only when every slot is alive
    const row = (h, i) => {
      const D = derive(h), cost = ctx.hireCost(h);
      return `<div class="shop-row">
        <canvas width="96" height="96" style="width:42px;height:42px;border-radius:8px;border:1px solid #6e5a2a;flex:0 0 auto"></canvas>
        <span class="it"><b style="color:var(--gold)">${h.name}</b> · ${h.cls} · Lv ${h.level}<br>
          <small>HP ${D.maxhp} · ATK ${D.atk} · DEF ${D.def} · Dodge ${D.dodge} · Crit ${D.crit}</small></span>
        <span class="price">${iconImg("coin",12)} ${cost}</span>
        <button class="shop-btn" data-hire="${i}" ${(silver < cost || full) ? "disabled" : ""}>${canReplace ? "Replace" : "Hire"}</button>
      </div>`;
    };
    // current party — mirrors the dungeon roster so you can see your class mix (and who has fallen)
    const slot = (h, i) => `<div class="tv-slot ${h.alive ? "" : "dead"}" data-hero="${i}" title="View ${h.name}'s stats">
        <canvas width="96" height="96"></canvas>
        <b>${i === 0 ? iconImg("crown", 11) + " " : ""}${h.name}</b><span class="cls">${h.alive ? h.cls : "fallen"}</span><span class="lv">Lv ${h.level}</span></div>`;
    const emptySlots = Array.from({ length: Math.max(0, CAP - party.length) }, () => `<div class="tv-slot empty">empty</div>`).join("");

    el.innerHTML = `<div class="tw-wrap">
      <button class="tv-return" data-back style="margin:0 0 10px">${iconImg("house",17)} Return to the Keep</button>
      <div class="shop-top" style="justify-content:flex-end">
        <span class="tw-cur"><span>${iconImg("coin",13)} ${silver}</span></span>
      </div>
      <div class="tw-head"><h1>Tavern</h1><p style="font-size:12px;color:#9a8fb8;font-style:italic">
        ${full ? "Your party is full — all present."
          : canReplace ? "A pal has fallen — hire a recruit to take their place (or revive them at the Temple)."
          : `Recruit to round out your party — ${party.length}/${CAP}.`}</p></div>
      <div class="tw-sec">Your party — tap to view stats</div>
      <div class="tv-party">${party.map(slot).join("")}${emptySlots}</div>
      <div class="tw-sec">Looking for work</div>
      ${recruits.length ? recruits.map(row).join("") : `<div class="shop-none">Nobody's here — check back later.</div>`}
      <button class="tw-btn" data-refresh style="justify-content:center" ${silver < ctx.refreshCost ? "disabled" : ""}>${iconImg("refresh",13)} New faces · ${iconImg("coin",12)} ${ctx.refreshCost}</button>
    </div>`;

    party.forEach((h, i) => {
      const cv = el.querySelectorAll(".tv-slot canvas")[i];
      if (cv) cv.getContext("2d").drawImage(ctx.portrait(h), 0, 0, 96, 96);
    });
    recruits.forEach((h, i) => {
      const cv = el.querySelectorAll(".shop-row canvas")[i];
      if (cv) cv.getContext("2d").drawImage(ctx.portrait(h), 0, 0, 96, 96);
    });
    el.querySelectorAll("[data-back]").forEach(b => b.onclick = () => ctx.back());
    el.querySelectorAll("[data-hero]").forEach(c => c.onclick = () => ctx.openHero(party[+c.getAttribute("data-hero")]));
    el.querySelector("[data-refresh]").onclick = () => { if (ctx.refresh()) render(); };
    el.querySelectorAll("[data-hire]").forEach(b => b.onclick = () => {
      const h = ctx.recruits()[+b.getAttribute("data-hire")];
      if (h && ctx.hire(h)) render();
    });
  }

  render();
}
