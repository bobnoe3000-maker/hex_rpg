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
    // any fallen hero, main or companion (index 0 is the main hero)
    const fallen = ctx.party().map((h, i) => ({ h, i })).filter(x => !x.h.alive);
    const row = ({ h, i }) => {
      const D = derive(h), fee = ctx.fee(h);
      return `<div class="shop-row">
        <span style="position:relative;flex:0 0 auto;width:42px;height:42px">
          <canvas width="96" height="96" style="width:42px;height:42px;border-radius:8px;border:1px solid #5a2a2a;display:block;filter:grayscale(1) brightness(.7)"></canvas>
          <span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">${iconImg("skull", 22)}</span>
        </span>
        <span class="it"><b style="color:var(--gold)">${i === 0 ? iconImg("crown", 11) + " " : ""}${h.name}</b> · ${h.cls} · Lv ${h.level}${i === 0 ? " · Main" : ""}<br>
          <small style="color:#9a8fb8">Fallen — HP ${D.maxhp} when restored</small></span>
        <span class="price">${iconImg("coin", 12)} ${fee}</span>
        <button class="shop-btn" data-res="${i}" ${silver < fee ? "disabled" : ""}>Restore</button>
      </div>`;
    };

    el.innerHTML = `<div class="tw-wrap">
      <div class="shop-top" style="justify-content:flex-end">
        <span class="tw-cur"><span>${iconImg("coin", 13)} ${silver}</span></span>
      </div>
      <div class="tw-head"><h1>Temple</h1><p style="font-size:12px;color:#9a8fb8;font-style:italic">
        Restore fallen heroes to life. The fee rises with their level.<br>
        <span style="color:#8fd39a">If your whole party falls, your main hero wakes at the Keep for free.</span></p></div>
      <div class="tw-sec">Fallen heroes</div>
      ${fallen.length ? fallen.map(row).join("") : `<div class="shop-none">None of your heroes have fallen. Rest easy.</div>`}
      <button class="tw-btn primary" data-back style="justify-content:center;margin-top:6px">${iconImg("house", 16)} Return to the Keep</button>
    </div>`;

    fallen.forEach((x, k) => {
      const cv = el.querySelectorAll(".shop-row canvas")[k];
      if (cv) cv.getContext("2d").drawImage(ctx.portrait(x.h), 0, 0, 96, 96);
    });
    el.querySelectorAll("[data-back]").forEach(b => b.onclick = () => ctx.back());
    el.querySelectorAll("[data-res]").forEach(b => b.onclick = () => {
      const h = ctx.party()[+b.getAttribute("data-res")];
      if (h && !h.alive && ctx.resurrect(h)) render();
    });
  }

  render();
}
