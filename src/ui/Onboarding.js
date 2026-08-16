/* ============ UI :: Onboarding.js — splash → login → save slots → character creation ============ */
/* Runs the pre-game flow in #flow (top layer). After login the player picks one of three save
   slots: an empty slot leads into character creation (cb.onNewGame(hero, slot)); a saved slot is
   loaded directly (cb.onContinue(slot)). The caller then hides #flow and shows the town. */
"use strict";

import { makeHeroPortrait } from "../engine/portraits.js";
import { rollStats, makeHero } from "../models/units.js";
import { HERO_BASES } from "../data/classes.js";
import { COMPANION_NAMES } from "../data/names.js";
import { iconImg } from "../engine/icons.js";
import { listSlots, deleteSlot } from "../state/save.js";

const randomName = () => COMPANION_NAMES[(Math.random() * COMPANION_NAMES.length) | 0];
const capw = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

const CLASS_INFO = {
  fighter: { name: "Fighter", icon: "sword",  blurb: "Frontline bruiser — high HP &amp; metal armor. Soaks hits and holds the line." },
  mage:   { name: "Mage",   icon: "spark",  blurb: "Glass cannon — high attack &amp; crit, ranged, but fragile." },
  cleric: { name: "Cleric", icon: "cross",  blurb: "Sturdy support — balanced, durable, the party's backbone." },
  rogue:  { name: "Rogue",  icon: "dagger", blurb: "Nimble skirmisher — high dodge &amp; crit with twin daggers, fast strikes." },
};
const STAT_ROWS = [["HP", "hp"], ["ATK", "atk"], ["DEF", "def"], ["Dodge", "dodge"], ["Crit", "crit"], ["Speed", "aspd"]];
const seed = () => (Math.random() * 1e9) >>> 0;

let cssDone = false;
function ensureCss() {
  if (cssDone) return; cssDone = true;
  const s = document.createElement("style"); s.id = "flow-style";
  s.textContent = `
  #flow{position:fixed;inset:0;z-index:20;display:none;flex-direction:column;align-items:center;justify-content:center;
    overflow-y:auto;color:var(--parchment);font-family:Georgia,"Times New Roman",serif;text-align:center;
    background:radial-gradient(130% 100% at 50% -20%, #35264f 0%, #140f22 45%, #08060f 100%);
    padding:calc(env(safe-area-inset-top) + 16px) 16px calc(env(safe-area-inset-bottom) + 20px)}
  #flow.show{display:flex}
  .fl-wrap{width:min(440px,100%);display:flex;flex-direction:column;gap:14px;align-items:center}
  /* splash */
  .sp-emblem{font-size:74px;filter:drop-shadow(0 0 18px rgba(255,180,90,.55));animation:spglow 3.2s ease-in-out infinite}
  @keyframes spglow{0%,100%{filter:drop-shadow(0 0 12px rgba(255,180,90,.4)) translateY(0)}50%{filter:drop-shadow(0 0 26px rgba(255,180,90,.75)) translateY(-4px)}}
  @media (prefers-reduced-motion:reduce){.sp-emblem{animation:none}}
  .sp-title{font-size:34px;letter-spacing:5px;text-transform:uppercase;color:var(--gold);
    text-shadow:0 2px 12px rgba(216,162,74,.4);line-height:1.1}
  .sp-sub{font-size:14px;color:#b9a9d6;font-style:italic;letter-spacing:1px}
  .sp-tag{font-size:12px;color:#7d7196;max-width:320px;line-height:1.6;margin-top:2px}
  /* generic */
  .fl-h{font-size:20px;color:var(--gold);letter-spacing:2px;text-transform:uppercase}
  .fl-p{font-size:12.5px;color:#9a8fb8;line-height:1.5;max-width:340px}
  .fl-btn{font-family:inherit;font-weight:bold;letter-spacing:1.5px;font-size:15px;border:0;border-radius:11px;padding:14px 22px;
    cursor:pointer;background:linear-gradient(#e0b063,#a8722a);color:#241606;box-shadow:0 4px 0 #6e4a14;min-width:220px}
  .fl-btn:active{transform:translateY(2px);box-shadow:0 2px 0 #6e4a14}
  .fl-btn.ghost{background:linear-gradient(#2c2342,#1c1630);color:var(--parchment);box-shadow:0 4px 0 #100b1c;font-size:13px;min-width:0;padding:11px 18px}
  .fl-in{font-family:inherit;font-size:15px;text-align:center;padding:11px;border-radius:9px;border:1px solid var(--line);
    background:#120d1c;color:var(--parchment);width:min(300px,100%)}
  .fl-in:focus{outline:none;border-color:var(--gold)}
  .fl-row{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
  .fl-back{color:#9ad1ff;cursor:pointer;font-size:13px;align-self:flex-start}
  /* class picker */
  .cls-grid{display:flex;flex-direction:column;gap:10px;width:100%}
  .cls-card{display:flex;align-items:center;gap:12px;text-align:left;padding:12px 14px;border-radius:11px;cursor:pointer;
    background:linear-gradient(#241b38,#1a1328);border:1px solid var(--line)}
  .cls-card:active{transform:translateY(1px)}
  .cls-card.sel{border-color:var(--gold);background:#241a12}
  .cls-card .ic{font-size:26px;color:var(--gold);flex:0 0 auto;width:34px;text-align:center}
  .cls-card b{font-size:15px;color:var(--gold)} .cls-card small{display:block;color:#9a8fb8;font-size:11.5px;line-height:1.45;margin-top:2px}
  /* create */
  .cr-port{width:118px;height:118px;border-radius:12px;border:2px solid #6e5a2a;background:#120d1c;box-shadow:0 4px 16px #000}
  .cr-stats{width:100%;max-width:300px;display:grid;grid-template-columns:1fr 1fr;gap:5px 16px;font-size:13px;
    padding:11px 14px;background:#120d1c;border:1px solid var(--line);border-radius:10px}
  .cr-stats .k{color:#9a8fb8}.cr-stats .v{float:right;color:var(--parchment);font-variant-numeric:tabular-nums}
  /* save slots */
  .slot-list{display:flex;flex-direction:column;gap:11px;width:100%}
  .slot-card{display:flex;align-items:center;gap:12px;text-align:left;padding:12px 14px;border-radius:12px;cursor:pointer;
    background:linear-gradient(#241b38,#1a1328);border:1px solid var(--line);position:relative}
  .slot-card:active{transform:translateY(1px)}
  .slot-card.empty{border-style:dashed;justify-content:center;color:#8fd39a;font-style:italic;min-height:78px}
  .slot-card canvas{width:56px;height:56px;border-radius:10px;border:1px solid #6e5a2a;flex:0 0 auto;background:#120d1c}
  .slot-mid{flex:1;min-width:0}
  .slot-mid b{font-size:15px;color:var(--gold)} .slot-mid .sub{color:#9a8fb8;font-size:12px;margin-top:2px}
  .slot-mid .when{color:#6f6486;font-size:10.5px;font-style:italic;margin-top:3px}
  .slot-num{position:absolute;top:8px;right:11px;font-size:10px;letter-spacing:1px;color:#6f6486;text-transform:uppercase}
  .slot-del{flex:0 0 auto;background:#1c1226;border:1px solid #5a2a2a;color:#c98a8a;border-radius:8px;padding:7px 9px;cursor:pointer;font-size:11px;font-family:inherit}
  .slot-del:active{transform:translateY(1px)}
  `;
  document.head.appendChild(s);
}

/* callbacks: { onNewGame: (hero, slot) => void, onContinue: (slot) => void } */
export function startOnboarding(cb) {
  ensureCss();
  const el = document.getElementById("flow");
  el.classList.add("show");
  const S = { step: "splash", cls: null, statSeed: seed(), portSeed: seed(), name: "", slot: 0 };

  function drawPortrait() {
    const cv = el.querySelector(".cr-port"); if (!cv || !S.cls) return;
    const p = makeHeroPortrait(S.cls, S.portSeed);
    cv.getContext("2d").clearRect(0, 0, cv.width, cv.height);
    cv.getContext("2d").drawImage(p.canvas, 0, 0, cv.width, cv.height);
  }

  function render() {
    if (S.step === "splash") {
      el.innerHTML = `<div class="fl-wrap">
        <div class="sp-emblem">${iconImg("sword",68)}</div>
        <h1 class="sp-title">The Emberdeep</h1>
        <div class="sp-sub">Dungeon Pals</div>
        <p class="sp-tag">Forge a hero, gather pals, and delve an endless dungeon of loot, gems, and ember-scarred foes.</p>
        <button class="fl-btn" data-go="login">Enter the Deep</button>
      </div>`;
    } else if (S.step === "login") {
      el.innerHTML = `<div class="fl-wrap">
        <h2 class="fl-h">Sign In</h2>
        <p class="fl-p">Play as a guest — your progress saves to a slot on this device. (Accounts &amp; cloud saves come later.)</p>
        <input class="fl-in" id="fl-name" placeholder="Name (optional)" maxlength="16" autocomplete="off">
        <button class="fl-btn" data-go="slots">Continue as Guest</button>
      </div>`;
    } else if (S.step === "slots") {
      const slots = listSlots();
      const card = ({ slot, save }) => {
        if (!save || !save.party || !save.party[0]) {
          return `<div class="slot-card empty" data-new="${slot}"><span class="slot-num">Slot ${slot + 1}</span>${iconImg("chest",16)} &nbsp;Empty — start a new game</div>`;
        }
        const m = save.party[0], when = (save.savedAt || "").replace("T", " ").slice(0, 16);
        return `<div class="slot-card" data-load="${slot}"><span class="slot-num">Slot ${slot + 1}</span>
          <canvas width="96" height="96" data-sport="${slot}"></canvas>
          <div class="slot-mid"><b>${m.name}</b>
            <div class="sub">${capw(m.cls)} · Lv ${m.level} · party of ${save.party.length} · ${iconImg("coin",11)} ${save.silver || 0}</div>
            <div class="when">saved ${when || "—"}</div></div>
          <button class="slot-del" data-del="${slot}">Delete</button></div>`;
      };
      el.innerHTML = `<div class="fl-wrap">
        <span class="fl-back" data-go="login">‹ back</span>
        <h2 class="fl-h">Choose a Save</h2>
        <p class="fl-p">Continue a saved run or start a new one. Each slot is a separate adventure.</p>
        <div class="slot-list">${slots.map(card).join("")}</div>
      </div>`;
      slots.forEach(({ slot, save }) => {
        if (save && save.party && save.party[0]) {
          const cv = el.querySelector(`[data-sport="${slot}"]`), m = save.party[0];
          if (cv) cv.getContext("2d").drawImage(makeHeroPortrait(m.cls, m.portraitSeed).canvas, 0, 0, cv.width, cv.height);
        }
      });
    } else if (S.step === "class") {
      el.innerHTML = `<div class="fl-wrap">
        <span class="fl-back" data-go="slots">‹ back</span>
        <h2 class="fl-h">Choose Your Class</h2>
        <div class="cls-grid">${Object.keys(CLASS_INFO).map(k => `
          <div class="cls-card ${S.cls === k ? "sel" : ""}" data-cls="${k}">
            <span class="ic">${iconImg(CLASS_INFO[k].icon,26)}</span>
            <span><b>${CLASS_INFO[k].name}</b><small>${CLASS_INFO[k].blurb}</small></span>
          </div>`).join("")}</div>
        <button class="fl-btn" data-go="create" ${S.cls ? "" : "disabled style='opacity:.45;pointer-events:none'"}>Next</button>
      </div>`;
    } else if (S.step === "create") {
      if (!S.name) S.name = randomName();   // pre-fill a suggested name; the player can edit it
      const st = rollStats(S.cls, S.statSeed);
      el.innerHTML = `<div class="fl-wrap">
        <span class="fl-back" data-go="class">‹ class</span>
        <h2 class="fl-h">${CLASS_INFO[S.cls].name}</h2>
        <canvas class="cr-port" width="118" height="118"></canvas>
        <div class="fl-row">
          <button class="fl-btn ghost" data-roll="port">${iconImg("brush",15)} Roll Portrait</button>
          <button class="fl-btn ghost" data-roll="stats">${iconImg("dice",15)} Roll Stats</button>
        </div>
        <div class="cr-stats">${STAT_ROWS.map(([k, key]) =>
          `<div><span class="k">${k}</span><span class="v">${key === "aspd" ? st[key].toFixed(2) : st[key]}</span></div>`).join("")}</div>
        <div class="fl-row" style="width:min(300px,100%);flex-wrap:nowrap">
          <input class="fl-in" id="fl-hero" placeholder="Name your hero" maxlength="16" value="${S.name}" autocomplete="off" style="flex:1">
          <button class="fl-btn ghost" data-roll="name" title="Suggest a name">${iconImg("dice",15)}</button>
        </div>
        <button class="fl-btn" data-finish>${iconImg("sword",16)} Begin the Descent</button>
      </div>`;
      drawPortrait();
    }

    // wiring
    el.querySelectorAll("[data-go]").forEach(b => b.onclick = () => {
      const to = b.getAttribute("data-go");
      if (S.step === "login") { const n = el.querySelector("#fl-name"); if (n) S.name = n.value.trim(); }
      if (S.step === "create") { const n = el.querySelector("#fl-hero"); if (n) S.name = n.value.trim() || S.name; }
      S.step = to; render();
    });
    el.querySelectorAll("[data-cls]").forEach(c => c.onclick = () => { S.cls = c.getAttribute("data-cls"); render(); });
    el.querySelectorAll("[data-new]").forEach(c => c.onclick = () => { S.slot = +c.getAttribute("data-new"); S.step = "class"; render(); });
    el.querySelectorAll("[data-load]").forEach(c => c.onclick = () => {
      const slot = +c.getAttribute("data-load");
      el.classList.remove("show"); el.innerHTML = "";
      cb.onContinue(slot);
    });
    el.querySelectorAll("[data-del]").forEach(b => b.onclick = e => {
      e.stopPropagation(); deleteSlot(+b.getAttribute("data-del")); render();
    });
    el.querySelectorAll("[data-roll]").forEach(b => b.onclick = () => {
      const nm = el.querySelector("#fl-hero"); if (nm) S.name = nm.value;
      const kind = b.getAttribute("data-roll");
      if (kind === "port") { S.portSeed = seed(); drawPortrait(); }
      else if (kind === "name") { S.name = randomName(); render(); }
      else { S.statSeed = seed(); render(); }
    });
    const fin = el.querySelector("[data-finish]");
    if (fin) fin.onclick = () => {
      const nm = el.querySelector("#fl-hero");           // read the current input, not just S.name
      const name = (nm && nm.value.trim()) || (S.name && S.name.trim()) || HERO_BASES[S.cls].name;
      const hero = makeHero(S.cls, { name, statSeed: S.statSeed, portraitSeed: S.portSeed });
      el.classList.remove("show"); el.innerHTML = "";
      cb.onNewGame(hero, S.slot);   // start solo in the chosen slot — companions recruited at the Tavern
    };
  }

  render();
}
