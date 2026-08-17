/* ============ UI :: TownScreen.js — the Keep (home hub) ============ */
/* Renders the town hub into #town. The battle is idle/paused while the town is showing
   (the loop only advances when scene === "dungeon"). Standalone until the SceneManager
   generalises this in a later pass. */
"use strict";

import { derive } from "../systems/StatEngine.js";
import { iconImg } from "../engine/icons.js";
import { potionTileChip, ensurePotChipCss } from "./potionChip.js";

let cssDone = false;
export function ensureTownCss() {
  if (cssDone) return; cssDone = true;
  const s = document.createElement("style"); s.id = "town-style";
  s.textContent = `
  #town{position:fixed;inset:0;z-index:4;display:none;flex-direction:column;overflow-y:auto;
    background:radial-gradient(120% 80% at 50% -10%, #241b38 0%, #0c0a12 62%);color:var(--parchment);
    font-family:Georgia,"Times New Roman",serif;
    padding:calc(env(safe-area-inset-top) + 12px) 14px calc(env(safe-area-inset-bottom) + 16px)}
  #town.show{display:flex}
  .tw-wrap{width:min(460px,100%);margin:0 auto;display:flex;flex-direction:column;gap:11px}
  .tw-head{text-align:center;margin-top:4px}
  .tw-head h1{font-size:23px;color:var(--gold);letter-spacing:3px;text-transform:uppercase}
  .tw-head p{font-size:12px;color:#9a8fb8;margin-top:4px;font-style:italic}
  .tw-cur{display:flex;justify-content:center;gap:18px;font-size:14px;color:#d8c47a;margin-top:8px;
    font-variant-numeric:tabular-nums}
  .tw-cur .g{color:#9ad1ff}
  .tw-sec{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--gold);margin:6px 2px 1px}
  .tw-party{display:flex;gap:8px}
  .tw-card{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;
    background:linear-gradient(#241b38,#1a1328);border:1px solid var(--line);border-radius:10px;padding:9px 5px;font-size:10px}
  .tw-card:active{transform:translateY(1px)}
  .tw-card .tw-portwrap{position:relative;width:46px;height:46px}
  .tw-dot{position:absolute;top:-3px;right:-3px;width:12px;height:12px;border-radius:50%;
    background:#e0b063;border:2px solid #1a1328;box-shadow:0 0 6px #e0b063;z-index:2}
  .tw-dot.roll{background:#8fd39a;box-shadow:0 0 6px #8fd39a}
  .tw-card canvas{width:46px;height:46px;border-radius:8px;border:1px solid #6e5a2a;display:block}
  .tw-card .tw-skull{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
  .tw-card b{font-size:11px;color:var(--gold)} .tw-card .lv{color:#9ad1ff}
  .tw-card .cls{color:#9a8fb8;text-transform:capitalize;font-style:italic;font-size:9.5px}
  .tw-card .fallen{color:#c98a8a;font-style:italic;display:inline-flex;align-items:center;gap:3px;margin-top:3px;font-size:9.5px}
  .tw-card.dead{border-color:#5a2a2a}
  .tw-card.dead canvas{filter:grayscale(1) brightness(.7)}
  .tw-card .bar{width:100%;height:4px;background:#4a1f26;border-radius:2px;overflow:hidden;margin-top:2px}
  .tw-card .bar i{display:block;height:100%;background:linear-gradient(#ff7a70,#e5484d)}
  .tw-svc{display:flex;flex-direction:column;gap:8px}
  .tw-btn{font-family:inherit;font-weight:bold;letter-spacing:1px;font-size:14px;border:0;border-radius:10px;padding:13px 14px;
    cursor:pointer;background:linear-gradient(#2c2342,#1c1630);color:var(--parchment);box-shadow:0 3px 0 #100b1c;
    text-align:left;display:flex;align-items:center;gap:11px;width:100%}
  .tw-btn .ic{font-size:20px;flex:0 0 auto}
  .tw-btn small{display:block;font-weight:normal;font-size:11px;opacity:.65;letter-spacing:.3px}
  .tw-btn.primary{background:linear-gradient(#e0b063,#a8722a);color:#241606;box-shadow:0 3px 0 #6e4a14;justify-content:center;text-align:center}
  .tw-btn:active{transform:translateY(2px)}
  .tw-btn[disabled]{opacity:.45;pointer-events:none}
  .tw-foot{text-align:center;margin-top:4px}
  .tw-foot span{font-size:11px;color:#6f6486;cursor:pointer;letter-spacing:.3px}
  .tw-foot span:active{color:#9ad1ff}
  /* shop (shares the #town surface) */
  .shop-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:2px}
  .shop-back{cursor:pointer;color:#9ad1ff;font-size:13px}
  .shop-back:active{transform:translateY(1px)}
  .shop-row{display:flex;align-items:center;gap:8px;padding:7px 9px;border-radius:8px;background:#1c1630;
    border:1px solid var(--line);margin-bottom:5px;font-size:12px}
  .shop-row .it{flex:1;min-width:0;line-height:1.3}
  .shop-row .it small{color:#8fd39a;font-style:italic}
  .shop-row .price{color:#d8c47a;white-space:nowrap;font-variant-numeric:tabular-nums;font-size:11px}
  .shop-btn{font-family:inherit;font-weight:bold;font-size:11px;border:0;border-radius:6px;padding:6px 10px;cursor:pointer;
    background:linear-gradient(#e0b063,#a8722a);color:#241606;box-shadow:0 2px 0 #6e4a14;flex:0 0 auto}
  .shop-btn.sell{background:linear-gradient(#8fbf9a,#2a6a4a);color:#04140f;box-shadow:0 2px 0 #14402e}
  .shop-btn[disabled]{opacity:.4;pointer-events:none}
  .shop-btn:active{transform:translateY(1px)}
  .shop-none{opacity:.55;font-style:italic;font-size:11.5px;padding:3px 2px}

  /* ======= illustrated Keep (home hub) ======= */
  .keephome{position:fixed;inset:0;z-index:1;overflow:hidden;background:#0b0912;
    font-family:Georgia,"Times New Roman",serif;color:var(--parchment);
    -webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
  /* the artwork, sized to its own aspect and centred so hotspot %s stay locked to the buildings */
  .kh-art{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
    height:100%;width:auto;aspect-ratio:768/1375;max-width:100%;
    background:#0b0912 url('assets/home_ui.png') center/cover no-repeat}
  .kh-vig{position:absolute;inset:0;pointer-events:none;z-index:2;
    background:linear-gradient(#0b091255 0%,transparent 14%,transparent 60%,#0b0912cc 100%)}
  /* building hotspots — a glowing dot + a small standing name plate, both always visible for touch */
  .kh-spot{position:absolute;transform:translate(-50%,-50%);background:none;border:0;padding:0;cursor:pointer;z-index:5;
    display:flex;flex-direction:column;align-items:center;gap:3px}
  .kh-spot .ring{position:absolute;left:50%;top:0;width:34px;height:34px;transform:translate(-50%,-50%);border-radius:50%;
    border:2px solid var(--sc,#ffd08a);opacity:0;animation:khpulse 2.8s ease-in-out infinite}
  @keyframes khpulse{0%{transform:translate(-50%,-50%) scale(.6);opacity:0}45%{opacity:.5}100%{transform:translate(-50%,-50%) scale(1.15);opacity:0}}
  .kh-spot .dot{width:11px;height:11px;border-radius:50%;
    background:radial-gradient(circle at 40% 35%,#fff3d2,var(--sc,#ffb457));box-shadow:0 0 10px 2px var(--sc,#ffb457)}
  .kh-spot .lbl{font-size:10px;letter-spacing:.4px;color:#2c2114;
    background:linear-gradient(#efe2c4,#d6c194);border:1px solid #b49a63;border-radius:3px;padding:1px 7px;
    box-shadow:0 2px 5px #0009;white-space:nowrap}
  .kh-spot.soon .lbl{color:#5a5064;background:linear-gradient(#cfc6d8,#b3a9c2);border-color:#8d84a0}
  .kh-spot:active{transform:translate(-50%,-50%) scale(.9)}
  /* top chrome — wallet only (meta-nav lives in the bottom bar) */
  .kh-top{position:absolute;right:11px;top:calc(env(safe-area-inset-top) + 10px);z-index:6}
  .kh-cur{display:flex;gap:9px;font-size:12px;color:#f0d38a;font-variant-numeric:tabular-nums;
    background:#120d1ccc;border:1px solid var(--line);border-radius:9px;padding:5px 10px;box-shadow:0 2px 6px #0008}
  .kh-cur .g{color:#9ad1ff}
  /* ===== bottom navigation bar (Center-Depart layout) ===== */
  .kh-nav{position:absolute;left:0;right:0;bottom:0;z-index:7;height:calc(62px + env(safe-area-inset-bottom));
    padding-bottom:env(safe-area-inset-bottom);display:flex;align-items:stretch;
    background:linear-gradient(#150f24f2,#0d0a16f7);border-top:1px solid #4a3d68;box-shadow:0 -8px 22px -12px #000}
  .kh-nav::before{content:"";position:absolute;left:0;right:0;top:-1px;height:1px;
    background:linear-gradient(90deg,transparent,#e0b06355,transparent)}
  .kh-tab{flex:1;background:none;border:0;cursor:pointer;color:#6f6486;position:relative;padding-top:4px;
    display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;
    font-family:inherit;font-size:10px;letter-spacing:.02em}
  .kh-tab svg{opacity:.9}
  .kh-tab:active{transform:translateY(1px)}
  .kh-tab.on{color:#f0c877}
  .kh-tab.on::after{content:"";position:absolute;top:0;width:26px;height:2.5px;border-radius:2px;background:#f0c877;box-shadow:0 0 8px #f0c877}
  .kh-tab .badge{position:absolute;top:6px;left:calc(50% + 9px);width:8px;height:8px;border-radius:50%;
    background:#8fd39a;border:2px solid #100b1c;box-shadow:0 0 6px #8fd39a}
  /* raised center Depart CTA */
  .kh-cta{flex:0 0 auto;width:74px;display:flex;align-items:flex-start;justify-content:center;position:relative}
  .kh-cta button{position:absolute;top:-22px;width:60px;height:60px;border-radius:50%;cursor:pointer;border:2px solid #f0c877;
    background:radial-gradient(circle at 42% 34%,#f4d493,#c2892f 70%,#9a6b22);color:#241606;
    box-shadow:0 8px 20px -6px #000,0 0 0 6px #150f24,inset 0 2px 3px #fff3;
    display:flex;flex-direction:column;align-items:center;justify-content:center}
  .kh-cta button span{font-family:inherit;font-weight:bold;font-size:9px;letter-spacing:.08em;text-transform:uppercase;margin-top:-1px}
  .kh-cta button:active{transform:translateY(2px)}
  /* pop-up menu (anchored above the bar) */
  .kh-menu{position:absolute;right:8px;bottom:calc(70px + env(safe-area-inset-bottom));z-index:9;min-width:212px;
    background:#170f26;border:1px solid var(--line);border-radius:11px;padding:6px;box-shadow:0 12px 30px -8px #000}
  .kh-menu[hidden]{display:none}
  .kh-menu button{display:flex;align-items:center;gap:9px;width:100%;text-align:left;font-family:inherit;font-size:12.5px;
    color:var(--parchment);background:none;border:0;border-radius:7px;padding:9px 10px;cursor:pointer}
  .kh-menu button:active{background:#241b38}
  .kh-menu button[disabled]{opacity:.4;pointer-events:none}
  .kh-toast{position:absolute;left:50%;top:calc(env(safe-area-inset-top) + 52px);transform:translateX(-50%);z-index:20;
    background:#120d1cee;border:1px solid var(--gold);color:var(--gold);font-size:12px;padding:7px 13px;border-radius:9px;
    opacity:0;transition:opacity .25s;pointer-events:none;white-space:nowrap;box-shadow:0 6px 18px #000;max-width:88%;text-align:center}
  .kh-toast.on{opacity:1}
  /* party roster (reached from the Party tab; reuses the .tw-card look) */
  .kh-roster-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px}
  `;
  document.head.appendChild(s);
}

/* The Keep is the illustrated town (assets/home_ui.png). Buildings are tappable hotspots wired to the
   existing services; all "leave town" navigation lives in a bottom bar (Center-Depart layout):
     Keep (you're here) · Arena (soon) · ⟨Depart⟩ raised CTA → Dungeons · Party (badged) · Menu
   The wallet sits top-right; hotspot %s are calibrated to the Iron-Vault art and match the mockup.
   ctx = { silver, gems, party, portrait, tileFlag, activeDungeon,
           openHero, openParty, openShop, openTavern, openTemple, openForge, openDiag, openDungeons, enterDungeon } */
const SPOTS = [
  { svc: "temple", label: "Temple", x: 54, y: 15, sc: "#ffd08a" },
  { svc: "forge",  label: "Forge",  x: 62, y: 33, sc: "#ff9a3c" },
  { svc: "bank",   label: "Bank",   x: 60, y: 47, sc: "#9ad1ff", soon: true },
  { svc: "tavern", label: "Tavern", x: 19, y: 80, sc: "#ffcf7a" },
  { svc: "shop",   label: "Shop",   x: 85, y: 78, sc: "#ffcf7a" },
];
/* small stroke glyphs for the nav bar (currentColor), drawn as inline SVG */
const NAV_ICON = {
  keep:   `<path d="M4 21v-9l2.5-1.6M20 21v-9l-2.5-1.6M6.5 10.4V4.6l2 1.1 1.7-1.1 1.8 1.1 1.7-1.1 2 1.1v5.8M4 12h16M9.5 21v-4.2h5V21"/>`,
  arena:  `<path d="M5 4l9.5 9.5M4 8.5L8.5 4M15.5 15.5L20 20M15 19l4-4M19 4l-9.5 9.5M20 8.5L15.5 4M8.5 15.5L4 20M9 19l-4-4"/>`,
  party:  `<path d="M12 3.2l7 2.4v5.1c0 4.4-2.9 7.4-7 9.1-4.1-1.7-7-4.7-7-9.1V5.6l7-2.4Z"/><path d="M9.4 11.6l1.9 1.9 3.6-3.9"/>`,
  menu:   `<path d="M4 7h16M4 12h16M4 17h16"/>`,
  depart: `<path d="M12 3v13M8 12l4 4 4-4M6 20h12"/>`,
};
const navSvg = (k, sz = 22) => `<svg viewBox="0 0 24 24" width="${sz}" height="${sz}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${NAV_ICON[k]}</svg>`;

export function openTown(ctx) {
  ensureTownCss();
  const el = document.getElementById("town");
  const hasFlag = ctx.tileFlag && ctx.party.some(h => h.alive && ctx.tileFlag(h)); // badge the Party tab

  const spot = s => `<button class="kh-spot ${s.soon ? "soon" : ""}" data-svc="${s.svc}"
      style="left:${s.x}%;top:${s.y}%;--sc:${s.sc}"><span class="ring"></span><span class="dot"></span>
      <span class="lbl">${s.label}${s.soon ? " · soon" : ""}</span></button>`;

  el.innerHTML = `<div class="keephome">
    <div class="kh-art">${SPOTS.map(spot).join("")}</div>
    <div class="kh-vig"></div>
    <div class="kh-top">
      <div class="kh-cur"><span>${iconImg("coin",13)} ${ctx.silver()}</span><span class="g">${iconImg("gem",13)} ${ctx.gems()}</span></div>
    </div>
    <div class="kh-menu" data-menupop hidden>
      <button data-diag>${iconImg("spark",16)} Diagnostics &amp; log export</button>
      <button disabled>${iconImg("hammer",16)} Settings — coming soon</button>
    </div>
    <nav class="kh-nav">
      <button class="kh-tab on" data-nav="keep">${navSvg("keep")}Keep</button>
      <button class="kh-tab" data-nav="arena">${navSvg("arena")}Arena</button>
      <div class="kh-cta"><button data-nav="depart" title="Descend">${navSvg("depart",24)}<span>Depart</span></button></div>
      <button class="kh-tab" data-nav="party">${navSvg("party")}Party${hasFlag ? `<span class="badge"></span>` : ""}</button>
      <button class="kh-tab" data-nav="menu">${navSvg("menu")}Menu</button>
    </nav>
    <div class="kh-toast" data-toast></div>
  </div>`;

  const toastEl = el.querySelector("[data-toast]");
  const toast = msg => { toastEl.textContent = msg; toastEl.classList.add("on");
    clearTimeout(toast._h); toast._h = setTimeout(() => toastEl.classList.remove("on"), 1700); };
  const pop = el.querySelector("[data-menupop]");
  const closeMenu = () => { pop.hidden = true; };

  const svc = { temple: ctx.openTemple, forge: ctx.openForge, tavern: ctx.openTavern, shop: ctx.openShop };
  el.querySelectorAll(".kh-spot").forEach(b => b.onclick = () => {
    closeMenu();
    const k = b.getAttribute("data-svc");
    if (k === "bank") return toast("The Iron Vault is sealed — a death-safe bank is coming soon");
    if (svc[k]) svc[k]();
  });

  const dg = pop.querySelector("[data-diag]");
  if (ctx.openDiag) dg.onclick = () => { closeMenu(); ctx.openDiag(); }; else dg.disabled = true;

  const nav = {
    keep:   () => {},                                   // already home
    arena:  () => toast("The Arena is being raised — PvP challenges open soon"),
    depart: () => (ctx.openDungeons ? ctx.openDungeons() : ctx.enterDungeon && ctx.enterDungeon()),
    party:  () => (ctx.openParty ? ctx.openParty() : ctx.openHero(ctx.party[0])),
    menu:   () => { pop.hidden = !pop.hidden; },
  };
  el.querySelectorAll("[data-nav]").forEach(b => b.onclick = e => {
    const k = b.getAttribute("data-nav");
    if (k !== "menu") closeMenu();
    e.stopPropagation();
    nav[k] && nav[k]();
  });
  // tap anywhere else closes the menu
  el.querySelector(".keephome").addEventListener("click", e => {
    if (!pop.hidden && !pop.contains(e.target) && !e.target.closest("[data-nav='menu']")) closeMenu();
  });
}

/* Party roster — the Party tab's destination. The rich cards (portrait, HP, potion box, point/roll
   dot) that used to sit on the old home screen live here now; tap a card to manage that hero.
   ctx = { party, portrait, tileFlag, openHero, back } */
export function openPartyRoster(ctx) {
  ensureTownCss(); ensurePotChipCss();
  const el = document.getElementById("town");
  const card = (h, i) => {
    const mh = derive(h).maxhp;
    const skull = h.alive ? "" : `<div class="tw-skull">${iconImg("skull",20)}</div>`;
    const foot = h.alive
      ? `<div class="bar"><i style="width:${Math.max(0, Math.min(100, h.hp / mh * 100))}%"></i></div>`
      : `<span class="fallen">${iconImg("skull",10)} fallen</span>`;
    const flag = h.alive && ctx.tileFlag && ctx.tileFlag(h);
    const dot = flag ? `<span class="tw-dot ${flag}" title="${flag === "roll" ? "Level-up roll ready" : "Points to spend"}"></span>` : "";
    const pot = h.alive ? potionTileChip(h.potion) : "";
    return `<div class="tw-card ${h.alive ? "" : "dead"}" data-hero="${i}">
      <div class="tw-portwrap"><canvas width="96" height="96"></canvas>${skull}${dot}</div>${pot}
      <b>${i === 0 ? iconImg("crown", 11) + " " : ""}${h.name}</b><span class="cls">${h.cls}</span><span class="lv">Lv ${h.level}</span>
      ${foot}</div>`;
  };
  el.innerHTML = `<div class="tw-wrap">
    <div class="kh-roster-top shop-top">
      <span class="shop-back" data-back>‹ Keep</span>
      <div class="tw-cur" style="margin:0"><span class="tw-sec" style="margin:0">Party</span></div>
    </div>
    <div class="tw-sec">Tap a companion to manage gear, skills &amp; potions</div>
    <div class="tw-party">${ctx.party.map(card).join("")}</div>
  </div>`;
  ctx.party.forEach((h, i) => {
    const cv = el.querySelectorAll(".tw-card canvas")[i];
    cv.getContext("2d").drawImage(ctx.portrait(h), 0, 0, 96, 96);
  });
  el.querySelectorAll("[data-hero]").forEach(c => c.onclick = () => ctx.openHero(ctx.party[+c.getAttribute("data-hero")]));
  el.querySelector("[data-back]").onclick = () => ctx.back();
}
