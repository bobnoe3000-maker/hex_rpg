/* ============ UI :: CharacterPanel.js — hero stats, gear, bag, and the Forge ============ */
/* A self-contained modal rendered into #overlay. Opening it pauses the battle (the caller
   supplies pause/resume via ctx). Standalone until the SceneManager arrives in Phase 4. */
"use strict";

import { derive } from "../systems/StatEngine.js";
import { canEquip, equip, unequip, isUpgrade } from "../systems/Equipment.js";
import { STAT_STEP, ASSIGNABLE } from "../systems/Leveling.js";
import { heroKit } from "../systems/Skills.js";
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
  .cpanel{width:100%;max-width:420px;max-height:calc(100dvh - 40px);overflow-y:auto;
    background:linear-gradient(#241b38,#181128);border:1px solid var(--line);border-radius:12px;
    padding:12px 13px;box-shadow:0 6px 24px #000;text-align:left}
  .cp-tabs{display:flex;gap:8px;margin:2px 0 11px}
  .cp-tab{flex:1;font-family:inherit;font-weight:bold;letter-spacing:1px;font-size:13px;border:1px solid var(--line);
    border-radius:9px;padding:10px;cursor:pointer;background:#1c1630;color:#9a8fb8}
  .cp-tab.sel{border-color:var(--gold);background:linear-gradient(#2c2342,#1c1630);color:var(--gold)}
  .cp-tab:active{transform:translateY(1px)}
  .cp-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#e0b063;
    box-shadow:0 0 5px #e0b063;margin-left:5px;vertical-align:middle}
  .cp-dot.roll{background:#8fd39a;box-shadow:0 0 5px #8fd39a}
  .cp-rollcta{width:100%;font-family:inherit;font-weight:bold;font-size:13px;border:0;border-radius:9px;padding:12px;
    cursor:pointer;margin-bottom:10px;color:#04140f;background:linear-gradient(#8fd39a,#3a8a5a);
    box-shadow:0 3px 0 #1c4a30;display:flex;align-items:center;justify-content:center;gap:8px;letter-spacing:.3px}
  .cp-rollcta:active{transform:translateY(2px);box-shadow:0 1px 0 #1c4a30}
  .cp-rollcta small{font-weight:normal;opacity:.8}
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
  .skhint{font-size:10.5px;color:#6f6486;margin-top:5px}
  .cp-subtabs{display:flex;gap:8px;margin-bottom:11px}
  .cp-subtab{flex:1;font-family:inherit;font-size:9.5px;letter-spacing:1px;text-transform:uppercase;
    border:1px solid var(--line);border-radius:9px;padding:8px 6px;cursor:pointer;background:#1c1630;color:#9a8fb8;
    display:flex;flex-direction:column;align-items:center;gap:2px;line-height:1.2}
  .cp-subtab b{font-family:Georgia,serif;font-size:14px;letter-spacing:0;text-transform:none;color:var(--parchment)}
  .cp-subtab span{font-size:8.5px;letter-spacing:.5px;color:#6f6486}
  .cp-subtab.off.sel{border-color:#ff8a5a;background:rgba(255,138,90,.1);color:#ff8a5a}
  .cp-subtab.def.sel{border-color:#79c7e6;background:rgba(121,199,230,.1);color:#79c7e6}
  .cp-subtab.sel b{color:var(--parchment)}
  .cp-subtab:active{transform:translateY(1px)}
  .cp-branch{margin-bottom:12px}
  .cbh{font-family:inherit;font-size:11px;letter-spacing:1px;text-transform:uppercase;font-weight:bold;
    padding:7px 9px;border-radius:8px;margin-bottom:7px;display:flex;justify-content:space-between;align-items:center}
  .cp-branch.off .cbh{color:#ff8a5a;background:rgba(255,138,90,.08);border:1px solid rgba(255,138,90,.35)}
  .cp-branch.def .cbh{color:#79c7e6;background:rgba(121,199,230,.08);border:1px solid rgba(121,199,230,.35)}
  .cbh .inv{font-size:9.5px;color:#9a8fb8;letter-spacing:.5px}
  .ctier{font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:#6f6486;margin:8px 2px 4px}
  .cp-skill{background:#1c1630;border:1px solid var(--line);border-radius:9px;padding:7px 9px;margin-bottom:5px}
  .cp-skill.on.off{border-color:rgba(255,138,90,.55);background:linear-gradient(180deg,rgba(255,138,90,.09),#1c1630)}
  .cp-skill.on.def{border-color:rgba(121,199,230,.55);background:linear-gradient(180deg,rgba(121,199,230,.09),#1c1630)}
  .cp-skill.lk{opacity:.5}
  .cp-skill .sh{display:flex;justify-content:space-between;align-items:baseline;gap:6px}
  .cp-skill .sn{font-size:12.5px;font-weight:bold;color:var(--parchment)}
  .cp-skill .stype{font-size:8px;letter-spacing:.08em;text-transform:uppercase;font-weight:bold;padding:1px 5px;border-radius:4px}
  .cp-skill .stype.a{color:#2a0f08;background:#ff8a5a}.cp-skill .stype.p{color:#06121a;background:#79c7e6}
  .cp-skill .sd{font-size:11px;color:#9a8fb8;margin:3px 0 6px;line-height:1.35}
  .cp-skill .sr{display:flex;align-items:center;gap:7px}
  .spips{display:flex;gap:3px;flex:1}
  .spips i{flex:1;height:5px;border-radius:2px;background:#2a2338}
  .cp-skill.off .spips i.f{background:#ff8a5a}.cp-skill.def .spips i.f{background:#79c7e6}
  .cp-skill.off .spips i.d{background:rgba(255,138,90,.5)}.cp-skill.def .spips i.d{background:rgba(121,199,230,.5)}
  .cp-skill .pend{font-size:10px;color:var(--gold);font-weight:bold}
  .cp-respec{width:100%;font-family:inherit;font-weight:bold;font-size:12px;border:1px solid var(--line2);border-radius:8px;
    padding:9px;cursor:pointer;background:#241a2e;color:#c9a0ff;display:flex;align-items:center;justify-content:center;gap:6px}
  .cp-respec:disabled{opacity:.4;cursor:default;color:#6f6486}
  .cp-respec.arm{background:linear-gradient(#7a2020,#4a1414);color:#ffd8c0;border-color:#c0392b}
  .cp-respec:active:not(:disabled){transform:translateY(1px)}
  .sbtn{width:26px;height:24px;flex:0 0 auto;font-family:inherit;font-size:15px;font-weight:bold;line-height:1;
    border:1px solid var(--line);border-radius:6px;background:#241a2e;color:var(--gold);cursor:pointer;padding:0}
  .sbtn:disabled{opacity:.3;cursor:default;color:#6f6486}
  .sbtn:active:not(:disabled){transform:translateY(1px)}
  .slock{font-size:9.5px;color:#8a6a4a;margin-top:5px;font-style:italic}
  .cp-kit{display:flex;align-items:center;gap:8px;padding:6px 9px;border-radius:8px;background:#1c1630;border:1px solid var(--line);margin-bottom:5px}
  .cp-kit.off{border-left:2px solid #ff8a5a}.cp-kit.def{border-left:2px solid #79c7e6}
  .cp-kit .kn{flex:1;font-size:12.5px;font-weight:bold;color:var(--parchment)}
  .cp-kit .kr{font-size:10px;color:var(--gold);letter-spacing:1px}
  .cp-kit .kr .ko{color:#3a3450}
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
  let tab = "stats";     // main-hero panel tab: "stats" | "skills" | "equip"
  let skillBranch = "off"; // Skills tab sub-tab: "off" | "def"
  let keepScroll = true;   // preserve scroll across re-render (false = jump to top, for main-tab switches)
  const skillDraft = {};   // pending skill ranks (id → count) not yet committed
  let skillResetArm = false; // two-tap guard on the paid tree reset
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

    const statsBlock = `
      <div class="cp-stats">
        <div class="hp"><span class="k">HP</span><span class="v">${hero.hp} / ${D.maxhp}</span></div>
        ${STAT_ROWS.map(([k, key]) => statCell(k, key)).join("")}
        <div><span class="k">Speed</span><span class="v">${D.aspd.toFixed(2)}</span></div>
        <div><span class="k">Range</span><span class="v">${D.rng > 1 ? "Ranged" : "Melee"}</span></div>
      </div>
      ${attrSection()}`;
    const equipBlock = `
      <div class="cp-sec"><span>Equipped</span><span class="hint">tap a slot to filter the bag</span></div>
      ${SLOTS.map(slotRow).join("")}
      <div class="cp-sec"><span>Bag${filterSlot ? ` — ${cap(filterSlot)}` : ""}${others > 0 && !filterSlot ? ` · ${others} for other heroes` : ""}</span>${filterSlot ? `<span class="cp-clear" data-clear="1">show all ✕</span>` : ""}</div>
      ${usable.length ? usable.map(it => itemRow(it, ctx.inventory.indexOf(it))).join("")
                      : `<div class="cp-none">${filterSlot ? "No " + cap(filterSlot) + " items in the bag." : "No items " + hero.name + " can equip yet — fight to find loot."}</div>`}`;

    // Skills tree (main hero only, when the class has a tree). Two branches × 5 tiers, learn ranks
    // immediately (allocation persists); tiers gate on branch investment.
    const skillsBlock = () => {
      const sk = ctx.skills; if (!sk) return "";
      const R = sk.ranks();
      const committedOf = id => R[id] || 0;
      const draftN = id => skillDraft[id] || 0;
      const rankOfId = id => committedOf(id) + draftN(id);
      const draftSum = () => { let n = 0; for (const k in skillDraft) n += skillDraft[k]; return n; };
      const investedWith = br => sk.tree[br].skills.reduce((n, s) => n + rankOfId(s.id), 0);
      const unlockedNow = (br, tier) => investedWith(br) >= sk.gates[tier];
      const avail = sk.points() - draftSum();
      const dirty = draftSum() > 0;
      const committedTotal = Object.values(R).reduce((a, b) => a + b, 0);

      const branch = (br) => {
        const b = sk.tree[br];
        const rows = b.skills.map(s => {
          const committed = committedOf(s.id), r = rankOfId(s.id), un = unlockedNow(br, s.tier);
          const canAdd = un && r < sk.maxRank && avail > 0;
          const canDec = draftN(s.id) > 0;                    // only pending ranks can be pulled back
          const txt = r > 0 ? s.text[r - 1] : s.text[0];
          const pend = r - committed;
          return `<div class="cp-skill ${r > 0 ? "on" : ""} ${un ? "" : "lk"} ${br}">
            <div class="sh"><span class="sn">${s.name}${pend > 0 ? ` <span class="pend">+${pend}</span>` : ""}</span><span class="stype ${s.type[0]}">${s.type === "active" ? "Active" : "Passive"}</span></div>
            <div class="sd">${txt}</div>
            <div class="sr">
              <span class="spips">${[0,1,2,3,4].map(i => `<i class="${i < committed ? "f" : i < r ? "d" : ""}"></i>`).join("")}</span>
              <button class="sbtn" data-sk-dec="${s.id}" ${canDec ? "" : "disabled"}>−</button>
              <button class="sbtn add" data-sk-inc="${s.id}" ${canAdd ? "" : "disabled"}>+</button>
            </div>${un ? "" : `<div class="slock">Locked · needs ${sk.gates[s.tier]} in ${b.name}</div>`}</div>`;
        });
        let out = `<div class="cp-branch ${br}">`;
        let lastT = 0;
        b.skills.forEach((s, i) => { if (s.tier !== lastT) { lastT = s.tier;
          out += `<div class="ctier">${s.tier === 5 ? "Capstone" : "Tier " + s.tier}</div>`; } out += rows[i]; });
        return out + "</div>";
      };

      const off = sk.tree.off, def = sk.tree.def, cost = sk.resetCost();
      const canReset = committedTotal > 0 && sk.silver() >= cost;
      const footer = dirty
        ? `<div class="cp-pts-act" style="margin-top:6px">
             <button class="cp-reset" data-sk-discard>Discard</button>
             <button class="cp-confirm" data-sk-commit>Confirm</button></div>`
        : committedTotal > 0
          ? `<div class="cp-pts-act" style="margin-top:6px"><button class="cp-respec ${skillResetArm ? "arm" : ""}" data-sk-reset ${canReset ? "" : "disabled"}>
             ${skillResetArm ? `Tap again to reset · ${iconImg("coin", 11)} ${cost}` : `Reset tree · ${iconImg("coin", 11)} ${cost}`}</button></div>`
          : "";

      return `<div class="cp-pts" style="margin-bottom:11px"><div class="cp-pts-h"><span>Skill points</span><span class="av ${avail ? "" : "none"}">${avail}</span></div>
        <div class="skhint">Add points, then Confirm to commit · resetting the tree costs silver</div></div>
        <div class="cp-subtabs">
          <button class="cp-subtab off ${skillBranch === "off" ? "sel" : ""}" data-branch="off">Offensive<b>${off.name}</b><span>${sk.invested("off")} pts</span></button>
          <button class="cp-subtab def ${skillBranch === "def" ? "sel" : ""}" data-branch="def">Defensive<b>${def.name}</b><span>${sk.invested("def")} pts</span></button>
        </div>
        ${branch(skillBranch)}
        ${footer}`;
    };

    // Read-only kit for companions (their skills are a fixed, seed-rolled loadout).
    const kitSection = () => {
      const kit = heroKit(hero); if (!kit.length) return "";
      const na = kit.filter(k => k.type === "active").length, np = kit.filter(k => k.type === "passive").length;
      const row = k => `<div class="cp-kit ${k.br}">
        <span class="stype ${k.type[0]}">${k.type === "active" ? "Active" : "Passive"}</span>
        <span class="kn">${k.name}</span>
        <span class="kr">${"★".repeat(k.rank)}<span class="ko">${"★".repeat(5 - k.rank)}</span></span></div>`;
      return `<div class="cp-sec"><span>Skills</span><span class="hint">${na} active · ${np} passive · auto-cast in battle</span></div>
        ${kit.map(row).join("")}`;
    };

    // A gold dot flags a tab (and character tile) with points waiting to be spent. Reflects points
    // still unspent AFTER the current draft, so it clears as you allocate — before you even Confirm.
    const skillDraftTotal = () => { let n = 0; for (const k in skillDraft) n += skillDraft[k]; return n; };
    const statDot = ctx.points && (ctx.points() - draftSum()) > 0 ? `<span class="cp-dot"></span>` : "";
    const skillDot = ctx.skills && (ctx.skills.points() - skillDraftTotal()) > 0 ? `<span class="cp-dot"></span>` : "";

    // Main hero gets three tabs (Stats / Skills / Equipment). Companions get two: their stats + fixed
    // skill kit share one tab, gear the other.
    let body;
    if (ctx.isMain) {
      const paneFor = t => t === "stats" ? statsBlock : t === "skills" ? skillsBlock() : equipBlock;
      body = `<div class="cp-tabs">
           <button class="cp-tab ${tab === "stats" ? "sel" : ""}" data-tab="stats">Stats${statDot}</button>
           ${ctx.skills ? `<button class="cp-tab ${tab === "skills" ? "sel" : ""}" data-tab="skills">Skills${skillDot}</button>` : ""}
           <button class="cp-tab ${tab === "equip" ? "sel" : ""}" data-tab="equip">Equipment</button>
         </div>${paneFor(tab)}`;
    } else {
      const ct = tab === "equip" ? "equip" : "stats";   // companion tabs are stats-&-skills | equipment
      const pend = ctx.pendRolls ? ctx.pendRolls() : 0;  // queued level-up rolls
      const rollDot = pend > 0 ? `<span class="cp-dot roll"></span>` : "";
      const rollCta = pend > 0
        ? `<button class="cp-rollcta" data-openroll>${iconImg("spark", 14)} Level-Up Roll ${pend > 1 ? `<small>· ${pend} pending</small>` : ""} — Roll!</button>` : "";
      body = `<div class="cp-tabs">
           <button class="cp-tab ${ct === "stats" ? "sel" : ""}" data-tab="stats">Stats &amp; Skills${rollDot}</button>
           <button class="cp-tab ${ct === "equip" ? "sel" : ""}" data-tab="equip">Equipment</button>
         </div>${ct === "equip" ? equipBlock : rollCta + statsBlock + kitSection()}`;
    }

    // keep the scroll position across a re-render (learning a rank shouldn't jump back to the top);
    // a main-tab switch resets to the top instead
    const prevScroll = keepScroll ? ((overlay.querySelector(".cpanel") || {}).scrollTop || 0) : 0;
    keepScroll = true;
    overlay.innerHTML = `<div class="cpanel">
      <div class="cp-head">
        <canvas width="96" height="96"></canvas>
        <div class="nm"><b>${ctx.isMain ? iconImg("crown", 12) + " " : ""}${hero.name}</b> <span class="lvl">Lv ${hero.level}</span><br><span class="cls">${cap(hero.cls)}${ctx.isMain ? " · Main" : ""}</span></div>
        <span class="cur">${iconImg("coin", 13)} ${silver}<br>${iconImg("gem", 13)} ${gems}</span>
        <span class="cp-x" data-close="1">✕</span>
      </div>
      ${xpBar()}
      ${msg ? `<div class="cp-msg ${msg[0]}">${msg[1]}</div>` : ""}
      ${body}
    </div>`;

    const panel = overlay.querySelector(".cpanel"); if (panel) panel.scrollTop = prevScroll;
    overlay.querySelector(".cp-head canvas").getContext("2d").drawImage(ctx.portrait, 0, 0, 96, 96);
    overlay.querySelector("[data-close]").onclick = () => { overlay.classList.remove("show"); ctx.close(); };
    const orb = overlay.querySelector("[data-openroll]"); if (orb && ctx.openRoll) orb.onclick = () => ctx.openRoll();
    overlay.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => { tab = b.getAttribute("data-tab"); keepScroll = false; render(); });
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
    // skill tree: sub-tab, draft +/-, then Confirm to commit; Reset (paid) is a two-tap
    overlay.querySelectorAll("[data-branch]").forEach(b => b.onclick = () => { skillBranch = b.getAttribute("data-branch"); skillResetArm = false; render(); });
    overlay.querySelectorAll("[data-sk-inc]").forEach(b => b.onclick = () => {
      const id = b.getAttribute("data-sk-inc"); skillDraft[id] = (skillDraft[id] || 0) + 1; skillResetArm = false; render();
    });
    overlay.querySelectorAll("[data-sk-dec]").forEach(b => b.onclick = () => {
      const id = b.getAttribute("data-sk-dec"); if (skillDraft[id] > 0) { skillDraft[id]--; if (!skillDraft[id]) delete skillDraft[id]; } render();
    });
    const skCommit = overlay.querySelector("[data-sk-commit]"); if (skCommit) skCommit.onclick = () => {
      if (ctx.skills && ctx.skills.commit({ ...skillDraft })) { for (const k in skillDraft) delete skillDraft[k]; ctx.refresh && ctx.refresh(); render(["good", "Skills learned."]); }
    };
    const skDiscard = overlay.querySelector("[data-sk-discard]"); if (skDiscard) skDiscard.onclick = () => { for (const k in skillDraft) delete skillDraft[k]; render(); };
    const skReset = overlay.querySelector("[data-sk-reset]"); if (skReset) skReset.onclick = () => {
      if (!skillResetArm) { skillResetArm = true; render(); return; }        // first tap arms
      skillResetArm = false;
      if (ctx.skills && ctx.skills.reset()) { ctx.refresh && ctx.refresh(); render(["meh", "Skill tree reset."]); } else render();
    };
    const rst = overlay.querySelector("[data-preset]"); if (rst) rst.onclick = () => { clearDraft(); render(); };
    const cf = overlay.querySelector("[data-pconfirm]"); if (cf) cf.onclick = () => {
      if (ctx.assign && ctx.assign({ ...draft })) { clearDraft(); ctx.refresh && ctx.refresh(); render(["good", "Attributes updated."]); }
    };
  }

  render();
  overlay.classList.add("show");
}
