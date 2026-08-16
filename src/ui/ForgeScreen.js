/* ============ UI :: ForgeScreen.js — the Runic Anvil (town-only gear upgrades) ============ */
/* Seat a piece of gear + spend a runic gem to attempt +1 (higher levels fizzle, then shatter).
   Renders into #town. Filter the gear list by owner (each hero + the Bag) and by gear slot. */
"use strict";

import { ensureTownCss } from "./TownScreen.js";
import { iconImg } from "../engine/icons.js";
import { gearIconImg } from "../engine/gearIcon.js";
import { itemNameHtml as itemName } from "./itemView.js";
import { SLOTS } from "../data/items/gearTypes.js";
import { BAL } from "../data/balance.js";

const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const pct = f => Math.round(f * 100) + "%";
const STATL = { atk: "ATK", def: "DEF", hp: "HP", dodge: "Dodge", crit: "Crit", aspd: "Speed" };
const MAXLVL = BAL.FORGE.MAX_LEVEL;
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
  .fg-title{font-size:19px;color:var(--parchment);font-family:Georgia,serif} .fg-title b{color:var(--gold)}
  .fg-anvil{background:linear-gradient(#1a1428,#120d1c);border:1px solid var(--line);border-radius:12px;padding:13px;margin-bottom:11px}
  .fg-anvil-h{text-align:center;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--gold);margin-bottom:11px}
  .fg-seats{display:flex;align-items:center;justify-content:center;gap:14px;margin-bottom:13px}
  .fg-seat{width:96px;height:96px;border:1.5px dashed var(--line);border-radius:10px;display:flex;flex-direction:column;
    align-items:center;justify-content:center;gap:4px;background:#0d0a16;cursor:default}
  .fg-seat.filled{border-style:solid;border-color:var(--gold);background:#1c1526}
  .fg-seat img{width:46px;height:46px}
  .fg-seat-n{font-size:9.5px;text-align:center;line-height:1.2;padding:0 3px}
  .fg-seat-hint{font-size:9.5px;color:#6f6486;text-align:center;letter-spacing:1px;text-transform:uppercase;line-height:1.5}
  .fg-plus{font-size:22px;color:#6f6486}
  .fg-gem{display:flex;flex-direction:column;align-items:center;gap:4px}
  .fg-gembox{position:relative;width:72px;height:72px;border:1px solid #2a4a6a;border-radius:10px;display:flex;align-items:center;
    justify-content:center;background:radial-gradient(circle,#12283a,#0d0a16);box-shadow:0 0 16px rgba(121,199,230,.28)}
  .fg-gemn{position:absolute;top:3px;right:6px;font-size:10px;color:#9ad1ff}
  .fg-gem-l{font-size:9px;letter-spacing:1px;text-transform:uppercase;color:#8f86a8}
  .fg-sec{display:flex;justify-content:space-between;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#8f86a8;margin-bottom:4px}
  .fg-pct{color:var(--gold)}
  .fg-bar{height:8px;background:#241a2e;border-radius:4px;overflow:hidden;border:1px solid var(--line)}
  .fg-bar i{display:block;height:100%;background:linear-gradient(#7ee787,#3fae4a);transition:width .2s}
  .fg-preview{font-size:11.5px;color:#c9c0e0;text-align:center;margin:9px 0}
  .fg-preview b{color:#7ee787} .fg-risk{color:#ff6b6b}
  .fg-fuse{width:100%;font-family:inherit;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;font-size:14px;border:0;
    border-radius:10px;padding:12px;cursor:pointer;background:linear-gradient(#e0b063,#a8722a);color:#241606;box-shadow:0 3px 0 #6e4a14;
    display:flex;align-items:center;justify-content:center;gap:8px}
  .fg-fuse[disabled]{opacity:.5;pointer-events:none;background:linear-gradient(#3a3448,#241a2e);color:#8f86a8;box-shadow:0 3px 0 #140f1e}
  .fg-fuse:active{transform:translateY(2px);box-shadow:0 1px 0 #6e4a14}
  .fg-msg{margin-top:9px;font-size:11.5px;text-align:center;padding:6px;border-radius:6px;background:#0d0a16;border:1px solid var(--line)}
  .fg-msg.good{color:#7ee787}.fg-msg.bad{color:#ff6b6b}.fg-msg.meh{color:#9a8fb8}
  .fg-hint{font-size:10px;color:#6f6486;letter-spacing:.5px;text-transform:none}
  .fg-filters{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:6px}
  .fg-chip{font-family:inherit;font-size:11px;color:var(--parchment);background:#1c1630;border:1px solid var(--line);border-radius:8px;
    padding:5px 9px;cursor:pointer;display:flex;align-items:center;gap:4px;line-height:1}
  .fg-chip.sel{border-color:var(--gold);background:#241a12;color:var(--gold)}
  .fg-chip:active{transform:translateY(1px)}
  .fg-chip.owner{flex-direction:column;gap:3px;padding:4px 8px;font-size:10px}
  .fg-chip.owner canvas{width:28px;height:28px;border-radius:6px;border:1px solid #6e5a2a}
  .fg-row{cursor:pointer} .fg-row.seated{border-color:var(--gold);background:#241a12}
  .fg-max{font-size:9px;color:#8f86a8;letter-spacing:1px;border:1px solid var(--line);border-radius:5px;padding:2px 5px;white-space:nowrap}
  .fg-where{color:#8f86a8;font-style:italic}
  `;
  document.head.appendChild(s);
}

/* ctx = { gems:()=>n, gear:()=>[{item,owner,where,slot}], party:()=>[], portrait:(hero)=>canvas,
           preview:(item)=>info, forge:(item)=>result, back:()=>void } */
export function openForge(ctx) {
  ensureTownCss(); ensureForgeCss();
  const el = document.getElementById("town");
  let seated = null;   // the item object seated on the anvil
  let ownerF = null;   // filter: hero object | "bag" | null (all)
  let slotF = null;    // filter: slot string | null (all)
  let msg = null;

  function render() {
    const gems = ctx.gems(), gearAll = ctx.gear(), party = ctx.party();
    if (seated && !gearAll.some(x => x.item === seated)) seated = null;   // seated item shattered → clear

    let list = gearAll;
    if (ownerF === "bag") list = list.filter(x => x.owner === null);
    else if (ownerF) list = list.filter(x => x.owner === ownerF);
    if (slotF) list = list.filter(x => x.slot === slotF);

    const pv = seated ? ctx.preview(seated) : null;

    const ownerChips = party.map((h, i) =>
      `<button class="fg-chip owner ${ownerF === party[i] ? "sel" : ""}" data-owner="${i}">
        <canvas width="72" height="72" data-ochip="${i}"></canvas>
        <span>${i === 0 ? iconImg("crown", 9) + " " : ""}${h.name}</span></button>`).join("")
      + `<button class="fg-chip owner ${ownerF === "bag" ? "sel" : ""}" data-owner="bag">
          <span style="font-size:0;line-height:0;padding:5px 0">${iconImg("pouch", 22)}</span><span>Bag</span></button>`;
    const slotChips = `<button class="fg-chip ${slotF === null ? "sel" : ""}" data-slot="">All</button>`
      + SLOTS.map(s => `<button class="fg-chip ${slotF === s ? "sel" : ""}" data-slot="${s}">${cap(s)}</button>`).join("");

    const row = (x, i) => `<div class="shop-row fg-row ${seated === x.item ? "seated" : ""}" data-seat="${i}">
        ${gearIconImg(x.item, 26)}
        <span class="it">${itemName(x.item)}<br><small>${cap(x.slot)} · ${x.item.d} · <span class="fg-where">${x.where}</span></small></span>
        ${(x.item.upgradeLevel | 0) >= MAXLVL ? `<span class="fg-max">MAX</span>` : ""}
      </div>`;

    const previewHtml = !seated ? "Seat gear to see the upgrade"
      : pv.max ? `This item is at max upgrade (+${pv.level}).`
      : `+${pv.level} → <b>+${pv.level + 1}</b> · ${STATL[pv.stat] || pv.stat} ${pv.curVal} → <b>${pv.nextVal}</b>` +
        (pv.destroy > 0 ? ` · <span class="fg-risk">${pct(pv.destroy)} shatter</span>` : "");

    el.innerHTML = `<div class="tw-wrap">
      <div class="shop-top" style="justify-content:space-between">
        <span class="fg-title">The <b>Forge</b></span>
        <span class="tw-cur"><span>${iconImg("gem", 13)} ${gems}</span></span>
      </div>
      <div class="fg-anvil">
        <div class="fg-anvil-h">${iconImg("anvil", 13)} Runic Anvil</div>
        <div class="fg-seats">
          <div class="fg-seat ${seated ? "filled" : ""}">${seated
            ? `${gearIconImg(seated, 46)}<span class="fg-seat-n">${itemName(seated)}</span>`
            : `<span class="fg-seat-hint">Tap gear<br>to upgrade</span>`}</div>
          <span class="fg-plus">+</span>
          <div class="fg-gem"><span class="fg-gembox">${iconImg("gem", 30)}<span class="fg-gemn">×${gems}</span></span><span class="fg-gem-l">Runic Gem</span></div>
        </div>
        <div class="fg-sec"><span>Success chance</span><span class="fg-pct">${pv && !pv.max ? pct(pv.success) : pv && pv.max ? "MAX" : "—"}</span></div>
        <div class="fg-bar"><i style="width:${pv && !pv.max ? pct(pv.success) : "0%"}"></i></div>
        <div class="fg-preview">${previewHtml}</div>
        <button class="fg-fuse" data-fuse ${(!seated || gems <= 0 || (pv && pv.max)) ? "disabled" : ""}>${iconImg("hammer", 15)} Fuse Gem</button>
        ${msg ? `<div class="fg-msg ${msg[0]}">${msg[1]}</div>` : ""}
      </div>
      <div class="tw-sec" style="display:flex;justify-content:space-between"><span>Your Gear</span><span class="fg-hint">tap a piece to upgrade</span></div>
      <div class="fg-filters">${ownerChips}</div>
      <div class="fg-filters">${slotChips}</div>
      ${list.length ? list.map(row).join("") : `<div class="shop-none">No gear matches this filter.</div>`}
      <button class="tw-btn primary" data-back style="justify-content:center;margin-top:8px">${iconImg("house", 16)} Return to the Keep</button>
    </div>`;

    party.forEach((h, i) => { const cv = el.querySelector(`[data-ochip="${i}"]`);
      if (cv) cv.getContext("2d").drawImage(ctx.portrait(h), 0, 0, 72, 72); });

    el.querySelector("[data-back]").onclick = () => ctx.back();
    el.querySelectorAll("[data-owner]").forEach(b => b.onclick = () => {
      const v = b.getAttribute("data-owner"); const nv = v === "bag" ? "bag" : party[+v];
      ownerF = ownerF === nv ? null : nv; render();
    });
    el.querySelectorAll("[data-slot]").forEach(b => b.onclick = () => {
      const v = b.getAttribute("data-slot") || null; slotF = slotF === v ? null : v; render();
    });
    el.querySelectorAll("[data-seat]").forEach(r => r.onclick = () => {
      const x = list[+r.getAttribute("data-seat")]; if (x) { seated = seated === x.item ? null : x.item; msg = null; render(); }
    });
    const fuse = el.querySelector("[data-fuse]");
    if (fuse) fuse.onclick = () => { if (!seated) return; const res = ctx.forge(seated); msg = forgeMsg(res);
      if (res.outcome === "destroyed") seated = null; render(); };
  }

  render();
}
