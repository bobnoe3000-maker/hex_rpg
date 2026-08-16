/* ============ UI :: CharacterPanel.js — hero stats, gear, bag, and the Forge ============ */
/* A self-contained modal rendered into #overlay. Opening it pauses the battle (the caller
   supplies pause/resume via ctx). Standalone until the SceneManager arrives in Phase 4. */
"use strict";

import { derive } from "../systems/StatEngine.js";
import { canEquip, equip, unequip, isUpgrade } from "../systems/Equipment.js";
import { STAT_STEP, ASSIGNABLE } from "../systems/Leveling.js";
import { SLOTS } from "../data/items/gearTypes.js";
import { itemNameHtml as itemName } from "./itemView.js";
import { iconImg } from "../engine/icons.js";
import { gearIconImg } from "../engine/gearIcon.js";

const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const STAT_ROWS = [["ATK", "atk"], ["DEF", "def"], ["Dodge", "dodge"], ["Crit", "crit"]];
const ATTR_LABEL = { hp: "HP", atk: "ATK", def: "DEF", dodge: "Dodge", crit: "Crit" };
const fmtStep = (k, n) => k === "aspd" ? n.toFixed(2) : n;   // (aspd isn't assignable, kept for safety)

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
  .cp-xp{margin:0 2px 9px;font-size:10.5px;color:#9a8fb8}
  .cp-xp-l{display:block;margin-bottom:3px}.cp-xp-l b{color:#e8dcc4;font-variant-numeric:tabular-nums}
  .cp-xp-max{color:#d8a24a;font-style:italic}
  .cp-xp-bar{height:5px;background:#241a2e;border-radius:3px;overflow:hidden;border:1px solid var(--line)}
  .cp-xp-bar i{display:block;height:100%;background:linear-gradient(#c9a0ff,#7a4ad1);transition:width .25s}
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
  .cp-btn:active{transform:translateY(1px)}
  .cp-none{opacity:.55;font-size:11.5px;font-style:italic;padding:2px}
  .cp-pts{background:#120d1c;border:1px solid var(--line);border-radius:8px;padding:7px 9px;margin-bottom:10px}
  .cp-pts-h{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px}
  .cp-pts-h .av{font-size:11px;color:var(--gold);font-weight:bold}
  .cp-pts-h .av.none{color:#6f6486;font-weight:normal}
  .cp-arow{display:flex;align-items:center;gap:8px;font-size:12px;padding:3px 0}
  .cp-arow .k{color:#9a8fb8;width:44px;flex:0 0 auto}
  .cp-arow .v{flex:1;color:var(--parchment);font-variant-numeric:tabular-nums}
  .cp-arow .v .pend{color:#7ee787;font-weight:bold} .cp-arow .v .pend.neg{color:#ff8a5a}
  .cp-astep{color:#6f6486;font-size:10px}
  .cp-ab{width:26px;height:26px;flex:0 0 auto;font-family:inherit;font-size:16px;font-weight:bold;line-height:1;
    border:1px solid var(--line);border-radius:6px;background:#1c1630;color:var(--gold);cursor:pointer;padding:0}
  .cp-ab:disabled{opacity:.3;cursor:default;color:#6f6486}
  .cp-ab:active:not(:disabled){transform:translateY(1px)}
  .cp-pts-act{display:flex;gap:7px;margin-top:8px}
  .cp-pts-act button{flex:1;font-family:inherit;font-weight:bold;font-size:12px;border:0;border-radius:7px;padding:8px;cursor:pointer}
  .cp-confirm{background:linear-gradient(#e0b063,#a8722a);color:#241606;box-shadow:0 2px 0 #6e4a14}
  .cp-reset{background:#2c2342;color:var(--parchment);box-shadow:0 2px 0 #100b1c}
  .cp-pts-act button:active{transform:translateY(1px)}
  `;
  document.head.appendChild(s);
}

/* ctx = { inventory, portrait, refresh, gems:()=>n, silver:()=>n, isMain, xp, close,
           points:()=>n|null, assign:(deltas)=>bool|null }   // points/assign: main hero only
   (Forging lives at the Keep's Forge now, not here.) */
export function openCharacter(hero, ctx) {
  injectCss();
  const overlay = document.getElementById("overlay");
  let filterSlot = null; // when set, the bag lists only items for that slot
  const draft = {};      // pending, unconfirmed point allocation (stat → signed count)
  for (const k of ASSIGNABLE) draft[k] = 0;
  const draftSum = () => ASSIGNABLE.reduce((a, k) => a + draft[k], 0);
  const clearDraft = () => { for (const k of ASSIGNABLE) draft[k] = 0; };

  function render(msg) {
    const D = derive(hero);
    const gems = ctx.gems ? ctx.gems() : 0;
    const silver = ctx.silver ? ctx.silver() : 0;
    let usable = ctx.inventory.filter(it => canEquip(hero, it));
    const others = ctx.inventory.length - usable.length;
    if (filterSlot) usable = usable.filter(it => it.slot === filterSlot);

    const statCell = (k, key) => `<div><span class="k">${k}</span><span class="v">${D[key]}</span></div>`;
    const xpBar = () => {
      const x = ctx.xp ? ctx.xp(hero) : null;
      if (!x) return "";
      if (x.max) return `<div class="cp-xp"><span class="cp-xp-l">Experience <span class="cp-xp-max">· Max level</span></span></div>`;
      const w = Math.max(0, Math.min(100, x.cur / x.need * 100));
      return `<div class="cp-xp"><span class="cp-xp-l">XP <b>${x.cur} / ${x.need}</b> · ${x.need - x.cur} to Lv ${x.nextLevel}</span>
        <div class="cp-xp-bar"><i style="width:${w}%"></i></div></div>`;
    };
    const slotRow = key => {
      const it = hero.gear[key];
      return `<div class="cp-slot ${filterSlot === key ? "sel" : ""}" data-filter="${key}"><span class="sl">${cap(key)}</span>` +
        (it
          ? `${gearIconImg(it, 26)}<span class="it">${itemName(it)}<br><small>${it.d}</small></span>` +
            `<button class="cp-btn off" data-uneq="${key}">✕</button>`
          : `<span class="it cp-empty">— empty —</span>`) +
        `</div>`;
    };
    const itemRow = (it, i) =>
      `<div class="cp-item">${gearIconImg(it, 26)}<span class="it">${isUpgrade(hero, it) ? `<span class="cp-up" title="Upgrade for an empty/weaker slot">${iconImg("chevron", 11)}</span>` : ""}${itemName(it)}<br><small>${it.d}</small></span>` +
      `<button class="cp-btn" data-eq="${i}">Equip</button></div>`;

    // Attribute point-buy — main hero only (ctx.points supplied). Draft with +/−, then Confirm.
    const attrSection = () => {
      if (!ctx.points) return "";
      const avail = ctx.points();
      const remaining = avail - draftSum();          // draft>0 spends, draft<0 refunds
      const dirty = ASSIGNABLE.some(k => draft[k] !== 0);
      const dval = k => k === "hp" ? D.maxhp : D[k];  // D already includes committed points
      const arow = k => {
        const committed = (hero.pts && hero.pts[k]) || 0;
        const canAdd = remaining > 0, canSub = committed + draft[k] > 0;
        const preview = dval(k) + draft[k] * STAT_STEP[k];
        const pend = draft[k] !== 0 ? ` <span class="pend ${draft[k] < 0 ? "neg" : ""}">(${draft[k] > 0 ? "+" : ""}${draft[k] * STAT_STEP[k]})</span>` : "";
        return `<div class="cp-arow"><span class="k">${ATTR_LABEL[k]}</span>
          <span class="v">${fmtStep(k, preview)}${pend} <span class="cp-astep">+${STAT_STEP[k]}/pt</span></span>
          <button class="cp-ab" data-dec="${k}" ${canSub ? "" : "disabled"}>−</button>
          <button class="cp-ab" data-inc="${k}" ${canAdd ? "" : "disabled"}>+</button></div>`;
      };
      return `<div class="cp-sec"><span>Attributes</span><span class="hint">spend level-up points</span></div>
        <div class="cp-pts">
          <div class="cp-pts-h"><span>Points to spend</span><span class="av ${remaining ? "" : "none"}">${remaining}</span></div>
          ${ASSIGNABLE.map(arow).join("")}
          ${dirty ? `<div class="cp-pts-act">
            <button class="cp-reset" data-preset>Reset</button>
            <button class="cp-confirm" data-pconfirm>Confirm</button></div>` : ""}
        </div>`;
    };

    overlay.innerHTML = `<div class="cpanel">
      <div class="cp-head">
        <canvas width="96" height="96"></canvas>
        <div class="nm"><b>${ctx.isMain ? iconImg("crown", 12) + " " : ""}${hero.name}</b> <span class="lvl">Lv ${hero.level}</span><br><span class="cls">${cap(hero.cls)}${ctx.isMain ? " · Main" : ""}</span></div>
        <span class="cur">${iconImg("coin", 13)} ${silver}<br>${iconImg("gem", 13)} ${gems}</span>
        <span class="cp-x" data-close="1">✕</span>
      </div>
      ${xpBar()}
      ${msg ? `<div class="cp-msg ${msg[0]}">${msg[1]}</div>` : ""}
      <div class="cp-stats">
        <div class="hp"><span class="k">HP</span><span class="v">${hero.hp} / ${D.maxhp}</span></div>
        ${STAT_ROWS.map(([k, key]) => statCell(k, key)).join("")}
        <div><span class="k">Speed</span><span class="v">${D.aspd.toFixed(2)}</span></div>
        <div><span class="k">Range</span><span class="v">${D.rng > 1 ? "Ranged" : "Melee"}</span></div>
      </div>
      ${attrSection()}
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
    // attribute point-buy: draft with +/−, Reset discards, Confirm commits via ctx.assign
    overlay.querySelectorAll("[data-inc]").forEach(b => b.onclick = () => {
      const k = b.getAttribute("data-inc");
      if (ctx.points() - draftSum() > 0) { draft[k]++; render(); }
    });
    overlay.querySelectorAll("[data-dec]").forEach(b => b.onclick = () => {
      const k = b.getAttribute("data-dec"); const committed = (hero.pts && hero.pts[k]) || 0;
      if (committed + draft[k] > 0) { draft[k]--; render(); }
    });
    const rst = overlay.querySelector("[data-preset]"); if (rst) rst.onclick = () => { clearDraft(); render(); };
    const cf = overlay.querySelector("[data-pconfirm]"); if (cf) cf.onclick = () => {
      if (ctx.assign && ctx.assign({ ...draft })) { clearDraft(); render(["good", "Attributes updated."]); }
    };
  }

  render();
  overlay.classList.add("show");
}
