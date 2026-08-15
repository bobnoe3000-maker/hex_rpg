/* ============ UI :: TempleScreen.js — resurrect fallen companions for a fee ============ */
/* Renders into #town over the hub; ctx.back returns to the Keep. Fees scale with level. */
"use strict";

import { ensureTownCss } from "./TownScreen.js";
import { derive } from "../systems/StatEngine.js";
import { iconImg } from "../engine/icons.js";

/* ctx = { silver, party:()=>[], fee:(hero)=>n, resurrect:(hero)=>bool, portrait:(hero)=>canvas, back } */
export function openTemple(ctx) {
  ensureTownCss();
  const el = document.getElementById("town");

  function render() {
    const silver = ctx.silver();
    // companions only (index > 0); the main hero revives for free at the Keep
    const fallen = ctx.party().map((h, i) => ({ h, i })).filter(x => x.i > 0 && !x.h.alive);
    const row = ({ h, i }) => {
      const D = derive(h), fee = ctx.fee(h);
      return `<div class="shop-row">
        <canvas width="96" height="96" style="width:42px;height:42px;border-radius:8px;border:1px solid #6e5a2a;flex:0 0 auto;filter:grayscale(1);opacity:.7"></canvas>
        <span class="it"><b style="color:var(--gold)">${h.name}</b> · ${h.cls} · Lv ${h.level}<br>
          <small style="color:#9a8fb8">Fallen — HP ${D.maxhp} when restored</small></span>
        <span class="price">${iconImg("coin", 12)} ${fee}</span>
        <button class="shop-btn" data-res="${i}" ${silver < fee ? "disabled" : ""}>Restore</button>
      </div>`;
    };

    el.innerHTML = `<div class="tw-wrap">
      <div class="shop-top">
        <span class="shop-back" data-back>‹ The Keep</span>
        <span class="tw-cur"><span>${iconImg("coin", 13)} ${silver}</span></span>
      </div>
      <div class="tw-head"><h1>Temple</h1><p style="font-size:12px;color:#9a8fb8;font-style:italic">
        Restore fallen pals to life. The fee rises with their level.</p></div>
      <div class="tw-sec">Fallen companions</div>
      ${fallen.length ? fallen.map(row).join("") : `<div class="shop-none">None of your pals have fallen. Rest easy.</div>`}
    </div>`;

    fallen.forEach((x, k) => {
      const cv = el.querySelectorAll(".shop-row canvas")[k];
      if (cv) cv.getContext("2d").drawImage(ctx.portrait(x.h), 0, 0, 96, 96);
    });
    el.querySelector("[data-back]").onclick = () => ctx.back();
    el.querySelectorAll("[data-res]").forEach(b => b.onclick = () => {
      const h = ctx.party()[+b.getAttribute("data-res")];
      if (h && !h.alive && ctx.resurrect(h)) render();
    });
  }

  render();
}
