/* ============ UI :: CharacterPanel.js — hero stats, gear, bag, and the Forge ============ */
/* A self-contained modal rendered into #overlay. Opening it pauses the battle (the caller
   supplies pause/resume via ctx). Standalone until the SceneManager arrives in Phase 4. */
"use strict";

import { derive } from "../systems/StatEngine.js";
import { canEquip, equip, unequip } from "../systems/Equipment.js";
import { canUpgrade } from "../systems/ForgeSystem.js";

const SLOTS = [
  { key: "weapon",  label: "Weapon"  },
  { key: "armor",   label: "Armor"   },
  { key: "trinket", label: "Trinket" },
];
const STAT_ROWS = [["ATK", "atk"], ["DEF", "def"], ["Dodge", "dodge"], ["Crit", "crit"]];
const GRADE_COLOR = { plain: "#e8e8e8", fine: "#8fd39a", rare: "#4da6ff", epic: "#c77dff" };
const itemName = it => `<b style="color:${GRADE_COLOR[it.grade] || "#e8e8e8"}">${it.n}${it.upgradeLevel ? " +" + it.upgradeLevel : ""}</b>`;

function injectCss() {
  if (document.getElementById("cp-style")) return;
  const s = document.createElement("style"); s.id = "cp-style";
  s.textContent = `
  .cpanel{width:100%;max-width:340px;max-height:calc(100dvh - 40px);overflow-y:auto;
    background:linear-gradient(#241b38,#181128);border:1px solid var(--line);border-radius:12px;
    padding:12px 13px;box-shadow:0 6px 24px #000;text-align:left}
  .cp-head{display:flex;align-items:center;gap:10px;margin-bottom:8px}
  .cp-head canvas{width:52px;height:52px;border-radius:8px;border:1px solid #6e5a2a;flex:0 0 auto}
  .cp-head .nm{flex:1}.cp-head b{font-size:15px;color:var(--gold)} .cp-head .lvl{color:#9ad1ff;font-size:12px}
  .cp-head .gems{font-size:12px;color:#9ad1ff;white-space:nowrap}
  .cp-x{cursor:pointer;font-size:20px;color:#9a8fb8;padding:2px 8px;line-height:1}
  .cp-x:active{transform:translateY(1px)}
  .cp-msg{font-size:11.5px;margin:2px 2px 8px;padding:5px 8px;border-radius:6px;background:#120d1c;border:1px solid var(--line)}
  .cp-msg.good{color:#7ee787}.cp-msg.bad{color:#ff6b6b}.cp-msg.meh{color:#9a8fb8}
  .cp-stats{display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;font-size:12px;margin-bottom:10px;
    padding:8px 10px;background:#120d1c;border:1px solid var(--line);border-radius:8px}
  .cp-stats .k{color:#9a8fb8}.cp-stats .v{float:right;color:var(--parchment);font-variant-numeric:tabular-nums}
  .cp-stats .hp{grid-column:1 / -1;color:#9df09a}
  .cp-sec{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--gold);margin:8px 2px 5px}
  .cp-slot,.cp-item{display:flex;align-items:center;gap:6px;padding:6px 8px;border-radius:7px;
    background:#1c1630;border:1px solid var(--line);margin-bottom:5px;font-size:12px}
  .cp-slot .sl{color:#9a8fb8;width:48px;flex:0 0 auto;font-size:10px;text-transform:uppercase;letter-spacing:1px}
  .cp-slot .it,.cp-item .it{flex:1;line-height:1.3;min-width:0}
  .cp-slot .it small,.cp-item .it small{color:#8fd39a;font-style:italic}
  .cp-empty{opacity:.5;font-style:italic}
  .cp-btn{font-family:inherit;font-weight:bold;font-size:11px;border:0;border-radius:6px;padding:6px 9px;
    cursor:pointer;background:linear-gradient(#e0b063,#a8722a);color:#241606;box-shadow:0 2px 0 #6e4a14;flex:0 0 auto}
  .cp-btn.off{background:linear-gradient(#2c2342,#1c1630);color:var(--parchment);box-shadow:0 2px 0 #100b1c}
  .cp-btn.forge{background:linear-gradient(#7aa8ff,#2a4aa8);color:#06122e;box-shadow:0 2px 0 #14204a}
  .cp-btn:active{transform:translateY(1px)}
  .cp-none{opacity:.55;font-size:11.5px;font-style:italic;padding:2px}
  `;
  document.head.appendChild(s);
}

/* ctx = { inventory:Item[], portrait:Canvas, refresh:fn, gems:()=>n, forge:(item)=>result, close:fn } */
export function openCharacter(hero, ctx) {
  injectCss();
  const overlay = document.getElementById("overlay");
  const forgeMsg = res => res.outcome === "success" ? ["good", "🔨 Upgrade succeeded!"]
    : res.outcome === "destroyed" ? ["bad", "🔨 The item shattered!"]
    : res.outcome === "max" ? ["meh", "Already at max upgrade."]
    : res.outcome === "nogem" ? ["meh", "No runic gems."]
    : ["meh", "🔨 The gem fizzled — no change."];

  function render(msg) {
    const D = derive(hero);
    const gems = ctx.gems ? ctx.gems() : 0;
    const usable = ctx.inventory.filter(it => canEquip(hero, it));
    const others = ctx.inventory.length - usable.length;
    const canForge = it => ctx.forge && gems > 0 && canUpgrade(it);

    const forgeBtn = (attr) => `<button class="cp-btn forge" ${attr}>🔨</button>`;
    const statCell = (k, key) => `<div><span class="k">${k}</span><span class="v">${D[key]}</span></div>`;
    const slotRow = s => {
      const it = hero.gear[s.key];
      return `<div class="cp-slot"><span class="sl">${s.label}</span>` +
        (it
          ? `<span class="it">${itemName(it)}<br><small>${it.d}</small></span>` +
            (canForge(it) ? forgeBtn(`data-fslot="${s.key}"`) : "") +
            `<button class="cp-btn off" data-uneq="${s.key}">✕</button>`
          : `<span class="it cp-empty">— empty —</span>`) +
        `</div>`;
    };
    const itemRow = (it, i) =>
      `<div class="cp-item"><span class="it">${itemName(it)}<br><small>${it.d}</small></span>` +
      (canForge(it) ? forgeBtn(`data-fbag="${i}"`) : "") +
      `<button class="cp-btn" data-eq="${i}">Equip</button></div>`;

    overlay.innerHTML = `<div class="cpanel">
      <div class="cp-head">
        <canvas width="96" height="96"></canvas>
        <div class="nm"><b>${hero.name}</b> <span class="lvl">Lv ${hero.level}</span></div>
        <span class="gems">💎 ${gems}</span>
        <span class="cp-x" data-close="1">✕</span>
      </div>
      ${msg ? `<div class="cp-msg ${msg[0]}">${msg[1]}</div>` : ""}
      <div class="cp-stats">
        <div class="hp"><span class="k">HP</span><span class="v">${hero.hp} / ${D.maxhp}</span></div>
        ${STAT_ROWS.map(([k, key]) => statCell(k, key)).join("")}
        <div><span class="k">Speed</span><span class="v">${D.aspd.toFixed(2)}</span></div>
      </div>
      <div class="cp-sec">Equipped${gems > 0 ? " · 🔨 = upgrade (spends a gem)" : ""}</div>
      ${SLOTS.map(slotRow).join("")}
      <div class="cp-sec">Bag${others > 0 ? ` · ${others} for other heroes` : ""}</div>
      ${usable.length ? usable.map(it => itemRow(it, ctx.inventory.indexOf(it))).join("")
                      : `<div class="cp-none">No items ${hero.name} can equip yet — fight to find loot.</div>`}
    </div>`;

    overlay.querySelector(".cp-head canvas").getContext("2d").drawImage(ctx.portrait, 0, 0, 96, 96);
    overlay.querySelector("[data-close]").onclick = () => { overlay.classList.remove("show"); ctx.close(); };
    overlay.querySelectorAll("[data-uneq]").forEach(b => b.onclick = () => {
      unequip(hero, b.getAttribute("data-uneq"), ctx.inventory); ctx.refresh(); render();
    });
    overlay.querySelectorAll("[data-eq]").forEach(b => b.onclick = () => {
      const it = ctx.inventory[+b.getAttribute("data-eq")];
      if (it) { equip(hero, it, ctx.inventory); ctx.refresh(); render(); }
    });
    overlay.querySelectorAll("[data-fslot]").forEach(b => b.onclick = () => {
      const it = hero.gear[b.getAttribute("data-fslot")];
      if (it) render(forgeMsg(ctx.forge(it)));
    });
    overlay.querySelectorAll("[data-fbag]").forEach(b => b.onclick = () => {
      const it = ctx.inventory[+b.getAttribute("data-fbag")];
      if (it) render(forgeMsg(ctx.forge(it)));
    });
  }

  render();
  overlay.classList.add("show");
}
