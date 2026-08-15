/* ============ UI :: TavernScreen.js — hire randomly-generated companions ============ */
/* Renders into #town over the hub; ctx.back returns to the Keep. Party caps at 4 (main + 3). */
"use strict";

import { ensureTownCss } from "./TownScreen.js";
import { derive } from "../systems/StatEngine.js";
import { iconImg } from "../engine/icons.js";

const CAP = 4;

/* ctx = { silver, party:()=>[], recruits:()=>[], hireCost, refreshCost,
           hire:(recruit)=>bool, refresh:()=>bool, portrait:(hero)=>canvas, back:()=>void } */
export function openTavern(ctx) {
  ensureTownCss();
  const el = document.getElementById("town");

  function render() {
    const silver = ctx.silver(), full = ctx.party().length >= CAP, recruits = ctx.recruits();
    const row = (h, i) => {
      const D = derive(h);
      return `<div class="shop-row">
        <canvas width="96" height="96" style="width:42px;height:42px;border-radius:8px;border:1px solid #6e5a2a;flex:0 0 auto"></canvas>
        <span class="it"><b style="color:var(--gold)">${h.name}</b> · ${h.cls}<br>
          <small>HP ${D.maxhp} · ATK ${D.atk} · DEF ${D.def} · Dodge ${D.dodge} · Crit ${D.crit}</small></span>
        <span class="price">${iconImg("coin",12)} ${ctx.hireCost}</span>
        <button class="shop-btn" data-hire="${i}" ${(silver < ctx.hireCost || full) ? "disabled" : ""}>Hire</button>
      </div>`;
    };

    el.innerHTML = `<div class="tw-wrap">
      <div class="shop-top">
        <span class="shop-back" data-back>‹ The Keep</span>
        <span class="tw-cur"><span>${iconImg("coin",13)} ${silver}</span></span>
      </div>
      <div class="tw-head"><h1>Tavern</h1><p style="font-size:12px;color:#9a8fb8;font-style:italic">
        ${full ? "Your party is full (4)." : `Hire pals to fill your party — ${ctx.party().length}/${CAP}.`}</p></div>
      <div class="tw-sec">Looking for work</div>
      ${recruits.length ? recruits.map(row).join("") : `<div class="shop-none">Nobody's here — check back later.</div>`}
      <button class="tw-btn" data-refresh style="justify-content:center" ${silver < ctx.refreshCost ? "disabled" : ""}>${iconImg("refresh",13)} New faces · ${iconImg("coin",12)} ${ctx.refreshCost}</button>
    </div>`;

    ctx.recruits().forEach((h, i) => {
      const cv = el.querySelectorAll(".shop-row canvas")[i];
      if (cv) cv.getContext("2d").drawImage(ctx.portrait(h), 0, 0, 96, 96);
    });
    el.querySelector("[data-back]").onclick = () => ctx.back();
    el.querySelector("[data-refresh]").onclick = () => { if (ctx.refresh()) render(); };
    el.querySelectorAll("[data-hire]").forEach(b => b.onclick = () => {
      const h = ctx.recruits()[+b.getAttribute("data-hire")];
      if (h && ctx.hire(h)) render();
    });
  }

  render();
}
