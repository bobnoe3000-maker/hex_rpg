/* ============ UI :: CharacterPanel.js — hero stats, gear, bag, and the Forge ============ */
/* A self-contained modal rendered into #overlay. Opening it pauses the battle (the caller
   supplies pause/resume via ctx). Standalone until the SceneManager arrives in Phase 4. */
"use strict";

import { derive } from "../systems/StatEngine.js";
import { canEquip, equip, unequip, isUpgrade } from "../systems/Equipment.js";
import { canUpgrade } from "../systems/ForgeSystem.js";
import { SLOTS } from "../data/items/gearTypes.js";
import { itemNameHtml as itemName } from "./itemView.js";
import { iconImg } from "../engine/icons.js";
import { gearIconImg } from "../engine/gearIcon.js";

const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const STAT_ROWS = [["ATK", "atk"], ["DEF", "def"], ["Dodge", "dodge"], ["Crit", "crit"]];

function injectCss() {
  if (document.getElementById("cp-style")) return;
  const s = document.createElement("style"); s.id = "cp-style";
  s.textContent = `
  .cpanel{width:100%;max-width:340px;max-height:calc(100dvh - 40px);overflow-y:auto;
    background:linear-gradient(#241b38,#181128);border:1px solid var(--line);border-radius:12px;
    padding:12px 13px;box-shadow:0 6px 24px #000;text-align:left}
  .cp-head{display:flex;align-items:center;gap:9px;margin-bottom:8px}
  .cp-head canvas{width:50px;height:50px;border-radius:8px;border:1px solid #6e5a2a;flex:0 0 auto}
  .cp-head .nm{flex:1;min-width:0}.cp-head b{font-size:15px;color:var(--gold)} .cp-head .lvl{color:#9ad1ff;font-size:12px}
  .cp-head .cls{color:#9a8fb8;font-size:11.5px;font-style:italic}
  .cp-head .cur{font-size:11px;color:#d8c47a;white-space:nowrap;text-align:right;line-height:1.3}
  .cp-x{cursor:pointer;font-size:20px;color:#9a8fb8;padding:2px 6px;line-height:1}
  .cp-x:active{transform:translateY(1px)}
  .cp-msg{font-size:11.5px;margin:2px 2px 8px;padding:5px 8px;border-radius:6px;background:#120d1c;border:1px solid var(--line)}
  .cp-msg.good{color:#7ee787}.cp-msg.bad{color:#ff6b6b}.cp-msg.meh{color:#9a8fb8}
  .cp-stats{display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;font-size:12px;margin-bottom:10px;
    padding:8px 10px;background:#120d1c;border:1px solid var(--line);border-radius:8px}
  .cp-stats .k{color:#9a8fb8}.cp-stats .v{float:right;color:var(--parchment);font-variant-numeric:tabular-nums}
  .cp-stats .hp{grid-column:1 / -1;color:#9df09a}
  .cp-sec{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--gold);margin:8px 2px 5px;
    display:flex;justify-content:space-between;align-items:baseline}
  .cp-sec .hint{color:#6f6486;letter-spacing:.5px;text-transform:none;font-size:10px}
  .cp-clear{color:#9ad1ff;cursor:pointer;text-transform:none;letter-spacing:.5px}
  .cp-slot,.cp-item{display:flex;align-items:center;gap:6px;padding:6px 8px;border-radius:7px;
    background:#1c1630;border:1px solid var(--line);margin-bottom:5px;font-size:12px}
  .cp-slot{cursor:pointer}
  .cp-slot.sel{border-color:var(--gold);background:#241a12}
  .cp-slot .sl{color:#9a8fb8;width:58px;flex:0 0 auto;font-size:10px;text-transform:uppercase;letter-spacing:1px}
  .cp-slot.sel .sl{color:var(--gold)}
  .cp-slot .it,.cp-item .it{flex:1;line-height:1.3;min-width:0}
  .cp-slot .it small,.cp-item .it small{color:#8fd39a;font-style:italic}
  .cp-empty{opacity:.5;font-style:italic}
  .cp-up{color:#7ee787;font-weight:bold;margin-right:3px}
  .cp-btn{font-family:inherit;font-weight:bold;font-size:11px;border:0;border-radius:6px;padding:6px 9px;
    cursor:pointer;background:linear-gradient(#e0b063,#a8722a);color:#241606;box-shadow:0 2px 0 #6e4a14;flex:0 0 auto}
  .cp-btn.off{background:linear-gradient(#2c2342,#1c1630);color:var(--parchment);box-shadow:0 2px 0 #100b1c}
  .cp-btn.forge{background:linear-gradient(#7aa8ff,#2a4aa8);color:#06122e;box-shadow:0 2px 0 #14204a}
  .cp-btn:active{transform:translateY(1px)}
  .cp-none{opacity:.55;font-size:11.5px;font-style:italic;padding:2px}
  `;
  document.head.appendChild(s);
}

/* ctx = { inventory, portrait, refresh, gems:()=>n, silver:()=>n, forge:(item)=>result, close } */
export function openCharacter(hero, ctx) {
  injectCss();
  const overlay = document.getElementById("overlay");
  let filterSlot = null; // when set, the bag lists only items for that slot
  const forgeMsg = res => res.outcome === "success" ? ["good", `${iconImg("hammer",13)} Upgrade succeeded!`]
    : res.outcome === "destroyed" ? ["bad", `${iconImg("hammer",13)} The item shattered!`]
    : res.outcome === "max" ? ["meh", "Already at max upgrade."]
    : res.outcome === "nogem" ? ["meh", "No runic gems."]
    : ["meh", `${iconImg("hammer",13)} The gem fizzled — no change.`];

  function render(msg) {
    const D = derive(hero);
    const gems = ctx.gems ? ctx.gems() : 0;
    const silver = ctx.silver ? ctx.silver() : 0;
    let usable = ctx.inventory.filter(it => canEquip(hero, it));
    const others = ctx.inventory.length - usable.length;
    if (filterSlot) usable = usable.filter(it => it.slot === filterSlot);
    const canForge = it => ctx.forge && gems > 0 && canUpgrade(it);

    const forgeBtn = attr => `<button class="cp-btn forge" ${attr}>${iconImg("hammer", 13)}</button>`;
    const statCell = (k, key) => `<div><span class="k">${k}</span><span class="v">${D[key]}</span></div>`;
    const slotRow = key => {
      const it = hero.gear[key];
      return `<div class="cp-slot ${filterSlot === key ? "sel" : ""}" data-filter="${key}"><span class="sl">${cap(key)}</span>` +
        (it
          ? `${gearIconImg(it, 26)}<span class="it">${itemName(it)}<br><small>${it.d}</small></span>` +
            (canForge(it) ? forgeBtn(`data-fslot="${key}"`) : "") +
            `<button class="cp-btn off" data-uneq="${key}">✕</button>`
          : `<span class="it cp-empty">— empty —</span>`) +
        `</div>`;
    };
    const itemRow = (it, i) =>
      `<div class="cp-item">${gearIconImg(it, 26)}<span class="it">${isUpgrade(hero, it) ? `<span class="cp-up" title="Upgrade for an empty/weaker slot">${iconImg("chevron", 11)}</span>` : ""}${itemName(it)}<br><small>${it.d}</small></span>` +
      (canForge(it) ? forgeBtn(`data-fbag="${i}"`) : "") +
      `<button class="cp-btn" data-eq="${i}">Equip</button></div>`;

    overlay.innerHTML = `<div class="cpanel">
      <div class="cp-head">
        <canvas width="96" height="96"></canvas>
        <div class="nm"><b>${ctx.isMain ? iconImg("crown", 12) + " " : ""}${hero.name}</b> <span class="lvl">Lv ${hero.level}</span><br><span class="cls">${cap(hero.cls)}${ctx.isMain ? " · Main" : ""}</span></div>
        <span class="cur">${iconImg("coin", 13)} ${silver}<br>${iconImg("gem", 13)} ${gems}</span>
        <span class="cp-x" data-close="1">✕</span>
      </div>
      ${msg ? `<div class="cp-msg ${msg[0]}">${msg[1]}</div>` : ""}
      <div class="cp-stats">
        <div class="hp"><span class="k">HP</span><span class="v">${hero.hp} / ${D.maxhp}</span></div>
        ${STAT_ROWS.map(([k, key]) => statCell(k, key)).join("")}
        <div><span class="k">Speed</span><span class="v">${D.aspd.toFixed(2)}</span></div>
        <div><span class="k">Range</span><span class="v">${D.rng > 1 ? "Ranged" : "Melee"}</span></div>
      </div>
      <div class="cp-sec"><span>Equipped</span><span class="hint">tap a slot to filter the bag</span></div>
      ${SLOTS.map(slotRow).join("")}
      <div class="cp-sec"><span>Bag${filterSlot ? ` — ${cap(filterSlot)}` : ""}${others > 0 && !filterSlot ? ` · ${others} for other heroes` : ""}</span>${filterSlot ? `<span class="cp-clear" data-clear="1">show all ✕</span>` : ""}</div>
      ${usable.length ? usable.map(it => itemRow(it, ctx.inventory.indexOf(it))).join("")
                      : `<div class="cp-none">${filterSlot ? "No " + cap(filterSlot) + " items in the bag." : "No items " + hero.name + " can equip yet — fight to find loot."}</div>`}
    </div>`;

    overlay.querySelector(".cp-head canvas").getContext("2d").drawImage(ctx.portrait, 0, 0, 96, 96);
    overlay.querySelector("[data-close]").onclick = () => { overlay.classList.remove("show"); ctx.close(); };
    const clr = overlay.querySelector("[data-clear]"); if (clr) clr.onclick = () => { filterSlot = null; render(); };
    overlay.querySelectorAll("[data-filter]").forEach(row => row.onclick = () => {
      const key = row.getAttribute("data-filter");
      filterSlot = filterSlot === key ? null : key; render();
    });
    overlay.querySelectorAll("[data-uneq]").forEach(b => b.onclick = e => {
      e.stopPropagation(); unequip(hero, b.getAttribute("data-uneq"), ctx.inventory); ctx.refresh(); render();
    });
    overlay.querySelectorAll("[data-eq]").forEach(b => b.onclick = e => {
      e.stopPropagation(); const it = ctx.inventory[+b.getAttribute("data-eq")];
      if (it) { equip(hero, it, ctx.inventory); ctx.refresh(); render(); }
    });
    overlay.querySelectorAll("[data-fslot]").forEach(b => b.onclick = e => {
      e.stopPropagation(); const it = hero.gear[b.getAttribute("data-fslot")];
      if (it) render(forgeMsg(ctx.forge(it)));
    });
    overlay.querySelectorAll("[data-fbag]").forEach(b => b.onclick = e => {
      e.stopPropagation(); const it = ctx.inventory[+b.getAttribute("data-fbag")];
      if (it) render(forgeMsg(ctx.forge(it)));
    });
  }

  render();
  overlay.classList.add("show");
}
