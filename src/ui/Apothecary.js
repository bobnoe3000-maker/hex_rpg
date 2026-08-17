/* ============ UI :: Apothecary.js — buy/sell potions (the silver sink) ============ */
/* Renders into #town over the hub. A grid of the seven brews, each with five size buttons priced by
   size; plus a "Your potions" list to sell surplus back. Pure UI — economy/state via ctx. */
"use strict";

import { ensureTownCss } from "./TownScreen.js";
import { POTIONS, SIZES, potionCost, potionSell, potionEffectText, potionName } from "../data/potions.js";
import { flaskSvg } from "./potionChip.js";
import { iconImg } from "../engine/icons.js";

let cssDone = false;
function ensureApoCss() {
  if (cssDone) return; cssDone = true;
  const s = document.createElement("style"); s.id = "apo-style";
  s.textContent = `
  .apo-row{display:flex;gap:9px;align-items:flex-start;padding:9px 10px;border-radius:10px;background:#1c1630;
    border:1px solid var(--line);margin-bottom:7px}
  .apo-row .fl{flex:0 0 auto;width:34px;height:34px;margin-top:2px}
  .apo-row .b{flex:1;min-width:0}
  .apo-row .pn{font-weight:bold;font-size:13px}
  .apo-row .pe{color:#9a8fb8;font-size:10.5px;margin-top:1px}
  .apo-sizes{display:flex;gap:4px;margin-top:7px;flex-wrap:wrap}
  .apo-sz{flex:1 1 auto;min-width:54px;font-family:inherit;border:1px solid var(--line2);border-radius:7px;padding:5px 4px;cursor:pointer;
    background:#241a2e;color:var(--parchment);display:flex;flex-direction:column;align-items:center;gap:1px;line-height:1.15}
  .apo-sz:active{transform:translateY(1px)} .apo-sz[disabled]{opacity:.4;pointer-events:none}
  .apo-sz b{font-size:9.5px;letter-spacing:.03em}
  .apo-sz .pr{font-size:9.5px;color:#d8c47a;font-variant-numeric:tabular-nums}
  .apo-own{display:flex;align-items:center;gap:8px;padding:6px 9px;border-radius:8px;background:#1c1630;border:1px solid var(--line);margin-bottom:5px;font-size:12px}
  .apo-own .fl{flex:0 0 auto;width:24px;height:24px}
  .apo-own .n{flex:1;min-width:0} .apo-own .q{color:#9ad1ff;font-variant-numeric:tabular-nums;font-size:11px}
  .apo-sell{font-family:inherit;font-weight:bold;font-size:11px;border:0;border-radius:6px;padding:6px 10px;cursor:pointer;flex:0 0 auto;
    background:linear-gradient(#8fbf9a,#2a6a4a);color:#04140f;box-shadow:0 2px 0 #14402e}
  .apo-sell:active{transform:translateY(1px)}
  `;
  document.head.appendChild(s);
}

/* ctx = { silver:()=>n, potions:()=>[{type,size,qty}], cost, sell, buy:(type,size)=>bool,
           sellOne:(type,size)=>bool, back:()=>void } */
export function openApothecary(ctx) {
  ensureTownCss(); ensureApoCss();
  const el = document.getElementById("town");

  function render() {
    const silver = ctx.silver(), owned = ctx.potions();
    const brewRow = p => `<div class="apo-row">
        <div class="fl">${flaskSvg(p.color, 34)}</div>
        <div class="b"><div class="pn" style="color:${p.color}">${p.name}</div>
          <div class="pe">${p.blurb} · ${p.cd}s cooldown · ${p.trigger === "hurt" ? "when hurt" : "in combat"}</div>
          <div class="apo-sizes">${SIZES.map(s => {
            const cost = potionCost(p.id, s.id);
            return `<button class="apo-sz" data-buy="${p.id}:${s.id}" title="${potionEffectText(p.id, s.id)}" ${silver < cost ? "disabled" : ""}>
              <b>${s.name}</b><span class="pr">${iconImg("coin", 10)} ${cost}</span></button>`;
          }).join("")}</div>
        </div></div>`;
    const ownRow = st => { const p = POTIONS.find(x => x.id === st.type), price = ctx.sell(st.type, st.size);
      return `<div class="apo-own"><div class="fl">${flaskSvg(p.color, 24)}</div>
        <span class="n">${potionName(st.type, st.size)}</span><span class="q">×${st.qty}</span>
        <button class="apo-sell" data-sell="${st.type}:${st.size}">Sell ${iconImg("coin", 10)} ${price}</button></div>`; };

    el.innerHTML = `<div class="tw-wrap">
      <button class="tw-btn primary" data-back style="justify-content:center;margin-bottom:6px">${iconImg("house", 16)} Return to the Keep</button>
      <div class="shop-top" style="justify-content:flex-end"><span class="tw-cur"><span>${iconImg("coin", 12)} ${silver}</span></span></div>
      <div class="tw-head"><h1>Apothecary</h1><p>Stock your heroes' potion belts — bigger brews cost dearly.</p></div>
      <div class="tw-sec">Brews — tap a size to buy one</div>
      ${POTIONS.map(brewRow).join("")}
      <div class="tw-sec">Your potions${owned.length ? "" : " — none yet"}</div>
      ${owned.length ? owned.map(ownRow).join("") : `<div class="shop-none">Buy a brew above, or find them as loot.</div>`}
    </div>`;

    el.querySelector("[data-back]").onclick = () => ctx.back();
    el.querySelectorAll("[data-buy]").forEach(b => b.onclick = () => {
      const [t, s] = b.getAttribute("data-buy").split(":"); if (ctx.buy(t, s)) render();
    });
    el.querySelectorAll("[data-sell]").forEach(b => b.onclick = () => {
      const [t, s] = b.getAttribute("data-sell").split(":"); if (ctx.sellOne(t, s)) render();
    });
  }
  render();
}
