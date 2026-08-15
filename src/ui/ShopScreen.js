/* ============ UI :: ShopScreen.js — buy / sell / trade for gems ============ */
/* Renders into #town over the hub; ctx.back returns to the Town. Re-renders after each
   transaction so prices/affordability/stock stay live. */
"use strict";

import { ensureTownCss } from "./TownScreen.js";
import { itemNameHtml } from "./itemView.js";

/* ctx = { silver, gems, stock:()=>[], inventory:()=>[], priceOf, sellPriceOf, gemPrice, rerollCost,
           buy:(item)=>bool, sell:(item)=>bool, buyGem:()=>bool, reroll:()=>bool, back:()=>void } */
export function openShop(ctx) {
  ensureTownCss();
  const el = document.getElementById("town");

  function render() {
    const silver = ctx.silver(), stock = ctx.stock(), inv = ctx.inventory();
    const buyRow = (it, i) => {
      const p = ctx.priceOf(it);
      return `<div class="shop-row"><span class="it">${itemNameHtml(it)}<br><small>${it.d}</small></span>` +
        `<span class="price">💰 ${p}</span>` +
        `<button class="shop-btn" data-buy="${i}" ${silver < p ? "disabled" : ""}>Buy</button></div>`;
    };
    const sellRow = (it, i) => {
      const p = ctx.sellPriceOf(it);
      return `<div class="shop-row"><span class="it">${itemNameHtml(it)}<br><small>${it.d}</small></span>` +
        `<span class="price">💰 ${p}</span>` +
        `<button class="shop-btn sell" data-sell="${i}">Sell</button></div>`;
    };

    el.innerHTML = `<div class="tw-wrap">
      <div class="shop-top">
        <span class="shop-back" data-back>‹ The Keep</span>
        <span class="tw-cur"><span>💰 ${silver}</span> <span class="g">💎 ${ctx.gems()}</span></span>
      </div>
      <div class="tw-head"><h1>Shop</h1></div>

      <div class="tw-sec">For sale</div>
      ${stock.length ? stock.map(buyRow).join("") : `<div class="shop-none">Sold out — reroll for fresh stock.</div>`}
      <div class="tw-svc" style="flex-direction:row;gap:8px">
        <button class="tw-btn" data-reroll style="justify-content:center" ${silver < ctx.rerollCost ? "disabled" : ""}>🔄 Reroll · 💰 ${ctx.rerollCost}</button>
        <button class="tw-btn" data-gem style="justify-content:center" ${silver < ctx.gemPrice ? "disabled" : ""}>💎 Buy Gem · 💰 ${ctx.gemPrice}</button>
      </div>

      <div class="tw-sec">Sell from your bag</div>
      ${inv.length ? inv.map(sellRow).join("") : `<div class="shop-none">Your bag is empty.</div>`}
    </div>`;

    el.querySelector("[data-back]").onclick = () => ctx.back();
    el.querySelector("[data-reroll]").onclick = () => { if (ctx.reroll()) render(); };
    el.querySelector("[data-gem]").onclick = () => { if (ctx.buyGem()) render(); };
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
