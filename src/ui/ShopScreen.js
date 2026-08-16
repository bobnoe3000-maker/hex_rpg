/* ============ UI :: ShopScreen.js — buy / sell / trade for gems (tabbed) ============ */
/* Renders into #town over the hub; ctx.back returns to the Keep. Buy and Sell live on separate
   tabs. Re-renders after each transaction so prices/affordability/stock stay live. */
"use strict";

import { ensureTownCss } from "./TownScreen.js";
import { itemNameHtml } from "./itemView.js";
import { iconImg } from "../engine/icons.js";
import { gearIconImg } from "../engine/gearIcon.js";

let cssDone = false;
function ensureShopCss() {
  if (cssDone) return; cssDone = true;
  const s = document.createElement("style"); s.id = "shop-tabs-style";
  s.textContent = `
  .shop-tabs{display:flex;gap:8px;margin:2px 0 10px}
  .shop-tab{flex:1;font-family:inherit;font-weight:bold;letter-spacing:1px;font-size:13px;border:1px solid var(--line);
    border-radius:9px;padding:10px;cursor:pointer;background:#1c1630;color:#9a8fb8;display:flex;align-items:center;
    justify-content:center;gap:7px}
  .shop-tab.sel{border-color:var(--gold);background:linear-gradient(#2c2342,#1c1630);color:var(--gold)}
  .shop-tab .n{font-size:10px;opacity:.7;font-weight:normal}
  .shop-tab:active{transform:translateY(1px)}
  `;
  document.head.appendChild(s);
}

/* ctx = { silver, gems, stock:()=>[], inventory:()=>[], priceOf, sellPriceOf, gemPrice, rerollCost,
           buy:(item)=>bool, sell:(item)=>bool, buyGem:()=>bool, reroll:()=>bool, back:()=>void } */
export function openShop(ctx) {
  ensureTownCss(); ensureShopCss();
  const el = document.getElementById("town");
  let tab = "buy";

  function render() {
    const silver = ctx.silver(), stock = ctx.stock(), inv = ctx.inventory();
    const buyRow = (it, i) => {
      const p = ctx.priceOf(it);
      return `<div class="shop-row">${gearIconImg(it, 24)}<span class="it">${itemNameHtml(it)}<br><small>${it.d}</small></span>` +
        `<span class="price">${iconImg("coin", 12)} ${p}</span>` +
        `<button class="shop-btn" data-buy="${i}" ${silver < p ? "disabled" : ""}>Buy</button></div>`;
    };
    const sellRow = (it, i) => {
      const p = ctx.sellPriceOf(it);
      return `<div class="shop-row">${gearIconImg(it, 24)}<span class="it">${itemNameHtml(it)}<br><small>${it.d}</small></span>` +
        `<span class="price">${iconImg("coin", 12)} ${p}</span>` +
        `<button class="shop-btn sell" data-sell="${i}">Sell</button></div>`;
    };

    const buyPane = `
      <div class="tw-sec">For sale</div>
      ${stock.length ? stock.map(buyRow).join("") : `<div class="shop-none">Sold out — reroll for fresh stock.</div>`}
      <div class="tw-svc" style="flex-direction:row;gap:8px">
        <button class="tw-btn" data-reroll style="justify-content:center" ${silver < ctx.rerollCost ? "disabled" : ""}>${iconImg("refresh", 13)} Reroll · ${iconImg("coin", 12)} ${ctx.rerollCost}</button>
        <button class="tw-btn" data-gem style="justify-content:center" ${silver < ctx.gemPrice ? "disabled" : ""}>${iconImg("gem", 13)} Buy Gem · ${iconImg("coin", 12)} ${ctx.gemPrice}</button>
      </div>`;
    const sellPane = `
      <div class="tw-sec">Sell from your bag</div>
      ${inv.length ? inv.map(sellRow).join("") : `<div class="shop-none">Your bag is empty — find loot in the Emberdeep.</div>`}`;

    el.innerHTML = `<div class="tw-wrap">
      <button class="tw-btn primary" data-back style="justify-content:center;margin-bottom:10px">${iconImg("house", 16)} Return to the Keep</button>
      <div class="shop-top" style="justify-content:flex-end">
        <span class="tw-cur"><span>${iconImg("coin", 12)} ${silver}</span> <span class="g">${iconImg("gem", 12)} ${ctx.gems()}</span></span>
      </div>
      <div class="tw-head"><h1>Shop</h1></div>
      <div class="shop-tabs">
        <button class="shop-tab ${tab === "buy" ? "sel" : ""}" data-tab="buy">${iconImg("pouch", 15)} Buy</button>
        <button class="shop-tab ${tab === "sell" ? "sel" : ""}" data-tab="sell">${iconImg("coin", 15)} Sell <span class="n">(${inv.length})</span></button>
      </div>
      ${tab === "buy" ? buyPane : sellPane}
    </div>`;

    el.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => { tab = b.getAttribute("data-tab"); render(); });
    el.querySelector("[data-back]").onclick = () => ctx.back();
    const rr = el.querySelector("[data-reroll]"); if (rr) rr.onclick = () => { if (ctx.reroll()) render(); };
    const gm = el.querySelector("[data-gem]"); if (gm) gm.onclick = () => { if (ctx.buyGem()) render(); };
    el.querySelectorAll("[data-buy]").forEach(b => b.onclick = () => {
      const it = ctx.stock()[+b.getAttribute("data-buy")];
      if (it && ctx.buy(it)) render();
    });
    el.querySelectorAll("[data-sell]").forEach(b => b.onclick = () => {
      const it = ctx.inventory()[+b.getAttribute("data-sell")];
      if (it && ctx.sell(it)) render();
    });
  }

  render();
}
