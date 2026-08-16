/* ============ UI :: ForgeScreen.js — spend runic gems to upgrade gear (town only) ============ */
/* Renders into #town over the hub. Lists every upgradeable item across the party's gear and the
   shared bag; each forge attempt spends one gem via ctx.forge (higher +levels can fizzle/shatter). */
"use strict";

import { ensureTownCss } from "./TownScreen.js";
import { iconImg } from "../engine/icons.js";
import { gearIconImg } from "../engine/gearIcon.js";
import { itemNameHtml as itemName } from "./itemView.js";

const forgeMsg = res =>
  res.outcome === "success"   ? ["good", `${iconImg("hammer", 13)} Success — the item grows stronger!`]
  : res.outcome === "destroyed" ? ["bad",  `${iconImg("hammer", 13)} Shattered! The item was destroyed.`]
  : res.outcome === "max"       ? ["meh",  "Already at max upgrade."]
  : res.outcome === "nogem"     ? ["meh",  "No runic gems — trade silver for gems at the Shop."]
  :                               ["meh",  `${iconImg("hammer", 13)} The gem fizzled — no change.`];

let cssDone = false;
function ensureForgeCss() {
  if (cssDone) return; cssDone = true;
  const s = document.createElement("style"); s.id = "forge-style";
  s.textContent = `
  .fg-msg{font-size:12px;margin:2px 2px 8px;padding:7px 10px;border-radius:7px;background:#120d1c;border:1px solid var(--line)}
  .fg-msg.good{color:#7ee787}.fg-msg.bad{color:#ff6b6b}.fg-msg.meh{color:#9a8fb8}
  .fg-where{color:#8f86a8;font-style:italic}
  .shop-btn.forge{background:linear-gradient(#7aa8ff,#2a4aa8);color:#eaf1ff;box-shadow:0 2px 0 #14204a}
  `;
  document.head.appendChild(s);
}

/* ctx = { gems:()=>n, items:()=>[{item, where}], forge:(item)=>result, back:()=>void } */
export function openForge(ctx) {
  ensureTownCss(); ensureForgeCss();
  const el = document.getElementById("town");

  function render(msg) {
    const gems = ctx.gems(), items = ctx.items();
    const row = (x, i) => {
      const it = x.item, lvl = it.upgradeLevel | 0;
      return `<div class="shop-row">
        ${gearIconImg(it, 30)}
        <span class="it">${itemName(it)}<br><small>${it.d} · <span class="fg-where">${x.where}</span></small></span>
        <button class="shop-btn forge" data-fitem="${i}" ${gems <= 0 ? "disabled" : ""}>${iconImg("hammer", 12)} →+${lvl + 1}</button>
      </div>`;
    };

    el.innerHTML = `<div class="tw-wrap">
      <div class="shop-top" style="justify-content:flex-end">
        <span class="tw-cur"><span>${iconImg("gem", 13)} ${gems}</span></span>
      </div>
      <div class="tw-head"><h1>Forge</h1><p style="font-size:12px;color:#9a8fb8;font-style:italic">
        Spend a runic gem to strengthen gear (+1, +2 …). Each level is harder — a gem can fizzle,
        and higher up it can even shatter the item.</p></div>
      ${msg ? `<div class="fg-msg ${msg[0]}">${msg[1]}</div>` : ""}
      <div class="tw-sec">Upgradeable gear${gems <= 0 ? " — need a gem" : ""}</div>
      ${items.length ? items.map(row).join("")
        : `<div class="shop-none">No upgradeable gear right now — find loot in the Emberdeep.</div>`}
      <button class="tw-btn primary" data-back style="justify-content:center;margin-top:6px">${iconImg("house", 16)} Return to the Keep</button>
    </div>`;

    el.querySelector("[data-back]").onclick = () => ctx.back();
    el.querySelectorAll("[data-fitem]").forEach(b => b.onclick = () => {
      const x = ctx.items()[+b.getAttribute("data-fitem")];
      if (x) render(forgeMsg(ctx.forge(x.item)));
    });
  }

  render();
}
