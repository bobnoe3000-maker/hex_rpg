/* ============ UI :: ShopScreen.js — buy / sell / trade for gems (tabbed) ============ */
/* Renders into #town over the hub; ctx.back returns to the Keep. Buy and Sell live on separate
   tabs. Re-renders after each transaction so prices/affordability/stock stay live. */
"use strict";

import { ensureTownCss } from "./TownScreen.js";
import { itemNameHtml } from "./itemView.js";
import { iconImg } from "../engine/icons.js";
import { gearIconImg } from "../engine/gearIcon.js";
import { POTIONS, STD_SIZE, potionCost, potionSell, potionEffectText, potionName } from "../data/potions.js";
import { flaskSvg } from "./potionChip.js";

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
  /* potions tab */
  .pot-row{display:flex;gap:9px;align-items:flex-start;padding:9px 10px;border-radius:10px;background:#1c1630;
    border:1px solid var(--line);margin-bottom:7px}
  .pot-row .fl{flex:0 0 auto;width:34px;height:34px;margin-top:2px}
  .pot-row .b{flex:1;min-width:0}
  .pot-row .pn{font-weight:bold;font-size:13px}
  .pot-row .pe{color:#9a8fb8;font-size:10.5px;margin-top:1px}
  .pot-sizes{display:flex;gap:4px;margin-top:7px;flex-wrap:wrap}
  .pot-sz{flex:1 1 auto;min-width:54px;font-family:inherit;border:1px solid var(--line2);border-radius:7px;padding:5px 4px;cursor:pointer;
    background:#241a2e;color:var(--parchment);display:flex;flex-direction:column;align-items:center;gap:1px;line-height:1.15}
  .pot-sz:active{transform:translateY(1px)} .pot-sz[disabled]{opacity:.4;pointer-events:none}
  .pot-sz b{font-size:9.5px;letter-spacing:.03em}
  .pot-sz .pr{font-size:9.5px;color:#d8c47a;font-variant-numeric:tabular-nums}
  .pot-own{display:flex;align-items:center;gap:8px;padding:6px 9px;border-radius:8px;background:#1c1630;border:1px solid var(--line);margin-bottom:5px;font-size:12px}
  .pot-own .fl{flex:0 0 auto;width:24px;height:24px}
  .pot-own .n2{flex:1;min-width:0} .pot-own .q{color:#9ad1ff;font-variant-numeric:tabular-nums;font-size:11px}
  `;
  document.head.appendChild(s);
}

/* ctx = { silver, gems, stock:()=>[], inventory:()=>[], priceOf, sellPriceOf, gemPrice, rerollCost,
           buy:(item)=>bool, sell:(item)=>bool, buyGem:()=>bool, reroll:()=>bool,
           potions:()=>[{type,size,qty}], buyPotion:(type,size)=>bool, sellPotion:(type,size)=>bool,
           back:()=>void } */
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
      ${inv.length ? inv.map(sellRow).join("") : `<div class="shop-none">Your bag is empty — find loot down in the dungeons.</div>`}`;

    // Potions — brews × priced sizes to buy, plus a sell-back list (was the Apothecary).
    const owned = ctx.potions ? ctx.potions() : [];
    const brewRow = p => { const cost = potionCost();
      return `<div class="pot-row"><div class="fl">${flaskSvg(p.color, 34)}</div>
        <div class="b"><div class="pn" style="color:${p.color}">${p.name}</div>
          <div class="pe">${potionEffectText(p.id)} · ${p.cd}s cooldown · ${p.trigger === "hurt" ? "when hurt" : "in combat"}</div>
          <div class="pot-sizes"><button class="pot-sz" data-pbuy="${p.id}:${STD_SIZE}" ${silver < cost ? "disabled" : ""}>
            <b>Buy</b><span class="pr">${iconImg("coin", 10)} ${cost}</span></button></div>
        </div></div>`; };
    const ownRow = st => { const p = POTIONS.find(x => x.id === st.type);
      return `<div class="pot-own"><div class="fl">${flaskSvg(p.color, 24)}</div>
        <span class="n2">${potionName(st.type)}</span><span class="q">×${st.qty}</span>
        <button class="shop-btn sell" data-psell="${st.type}:${st.size}">Sell ${iconImg("coin", 10)} ${potionSell()}</button></div>`; };
    const potPane = `
      <div class="tw-sec">Brews — tap to buy</div>
      ${POTIONS.map(brewRow).join("")}
      <div class="tw-sec">Your potions${owned.length ? "" : " — none"}</div>
      ${owned.length ? owned.map(ownRow).join("") : `<div class="shop-none">Buy a brew above, or find them as loot.</div>`}`;

    el.innerHTML = `<div class="tw-wrap">
      <button class="tw-btn primary" data-back style="justify-content:center;margin-bottom:10px">${iconImg("house", 16)} Return to the Keep</button>
      <div class="shop-top" style="justify-content:flex-end">
        <span class="tw-cur"><span>${iconImg("coin", 12)} ${silver}</span> <span class="g">${iconImg("gem", 12)} ${ctx.gems()}</span></span>
      </div>
      <div class="tw-head"><h1>Shop</h1></div>
      <div class="shop-tabs">
        <button class="shop-tab ${tab === "buy" ? "sel" : ""}" data-tab="buy">${iconImg("pouch", 15)} Gear</button>
        <button class="shop-tab ${tab === "potions" ? "sel" : ""}" data-tab="potions">${flaskSvg("#e5484d", 15)} Potions</button>
        <button class="shop-tab ${tab === "sell" ? "sel" : ""}" data-tab="sell">${iconImg("coin", 15)} Sell <span class="n">(${inv.length})</span></button>
      </div>
      ${tab === "buy" ? buyPane : tab === "potions" ? potPane : sellPane}
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
    el.querySelectorAll("[data-pbuy]").forEach(b => b.onclick = () => {
      const [t, s] = b.getAttribute("data-pbuy").split(":"); if (ctx.buyPotion && ctx.buyPotion(t, s)) render();
    });
    el.querySelectorAll("[data-psell]").forEach(b => b.onclick = () => {
      const [t, s] = b.getAttribute("data-psell").split(":"); if (ctx.sellPotion && ctx.sellPotion(t, s)) render();
    });
  }

  render();
}
