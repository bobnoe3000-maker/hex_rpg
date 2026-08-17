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

  /* ======= illustrated Keep (home hub) — stacked: town art · party tiles · nav ======= */
  .keephome{position:fixed;inset:0;z-index:1;overflow:hidden;background:#0b0912;display:flex;flex-direction:column;
    font-family:Georgia,"Times New Roman",serif;color:var(--parchment);
    -webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
  /* town image block — fills the space left by the tiles + nav; the art is contain-fit (whole image,
     never cropped) by a tiny JS calc, so hotspot %s stay locked to the buildings on any phone height */
  .kh-artwrap{flex:1 1 auto;min-height:0;position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden}
  .kh-art{position:relative;background:#0b0912 url('assets/home_ui.png') center/cover no-repeat}
  .kh-vig{position:absolute;inset:0;pointer-events:none;background:linear-gradient(#0b091240 0%,transparent 12%,transparent 82%,#0b091288 100%)}
  .kh-wallet{position:absolute;z-index:6;right:11px;top:calc(env(safe-area-inset-top) + 8px);display:flex;gap:9px;font-size:12px;
    color:#f0d38a;font-variant-numeric:tabular-nums;background:#120d1ccc;border:1px solid var(--line);border-radius:9px;padding:5px 10px;box-shadow:0 2px 6px #0008}
  .kh-wallet .g{color:#9ad1ff}
  /* building hotspots — a glowing dot + a small standing name plate, both always visible for touch */
  .kh-spot{position:absolute;transform:translate(-50%,-50%);background:none;border:0;padding:0;cursor:pointer;z-index:5;
    display:flex;flex-direction:column;align-items:center;gap:3px}
  .kh-spot .ring{position:absolute;left:50%;top:0;width:32px;height:32px;transform:translate(-50%,-50%);border-radius:50%;
    border:2px solid var(--sc,#ffd08a);opacity:0;animation:khpulse 2.8s ease-in-out infinite}
  @keyframes khpulse{0%{transform:translate(-50%,-50%) scale(.6);opacity:0}45%{opacity:.5}100%{transform:translate(-50%,-50%) scale(1.15);opacity:0}}
  .kh-spot .dot{width:10px;height:10px;border-radius:50%;
    background:radial-gradient(circle at 40% 35%,#fff3d2,var(--sc,#ffb457));box-shadow:0 0 10px 2px var(--sc,#ffb457)}
  .kh-spot .lbl{font-size:10px;letter-spacing:.4px;color:#2c2114;
    background:linear-gradient(#efe2c4,#d6c194);border:1px solid #b49a63;border-radius:3px;padding:1px 7px;
    box-shadow:0 2px 5px #0009;white-space:nowrap}
  .kh-spot.soon .lbl{color:#5a5064;background:linear-gradient(#cfc6d8,#b3a9c2);border-color:#8d84a0}
  .kh-spot:active{transform:translate(-50%,-50%) scale(.9)}
  /* ===== party tiles band (between the art and the nav) — main hero centred ===== */
  .kh-strip{flex:0 0 auto;display:flex;gap:7px;padding:8px 9px calc(8px + env(safe-area-inset-bottom, 0px)*0);
    background:linear-gradient(#140e24,#0e0a1a);border-top:1px solid #2e2540;box-shadow:0 -6px 14px -10px #000}
  .kh-tile{flex:1;min-width:0;display:flex;align-items:center;gap:8px;cursor:pointer;text-align:left;
    background:linear-gradient(#221a38,#191228);border:1px solid #382d52;border-radius:11px;padding:7px 8px;font-family:inherit}
  .kh-tile:active{transform:translateY(1px)}
  .kh-tile.dead{border-color:#4a2530;background:linear-gradient(#1f1622,#171019)}
  .kh-pp{position:relative;width:38px;height:38px;flex:0 0 auto}
  .kh-pp canvas{width:38px;height:38px;border-radius:8px;border:1px solid #6e5a2a;display:block}
  .kh-tile.dead .kh-pp canvas{filter:grayscale(1) brightness(.6)}
  .kh-pp .crown{position:absolute;left:50%;top:-10px;transform:translateX(-50%);line-height:0}
  .kh-pp .sk{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
  .kh-pdot{position:absolute;top:-4px;right:-4px;width:11px;height:11px;border-radius:50%;background:#e0b063;border:2px solid #191228;box-shadow:0 0 6px #e0b063}
  .kh-pdot.roll{background:#8fd39a;box-shadow:0 0 6px #8fd39a}
  .kh-pi{min-width:0;flex:1;display:flex;flex-direction:column;gap:2px}
  .kh-pi b{font-size:12.5px;color:#f0c877;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .kh-pi .lv{font-size:9.5px;color:#b9add6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .kh-pi .hp{display:block;height:5px;border-radius:3px;background:#3a1f26;overflow:hidden;margin-top:2px}
  .kh-pi .hp i{display:block;height:100%;background:linear-gradient(90deg,#ff7a70,#e5484d)}
  .kh-pi .fallen{font-size:9.5px;color:#c98a8a;font-style:italic;margin-top:2px}
  /* ===== bottom navigation bar (Center-Depart; CTA sits inside the bar) ===== */
  .kh-nav{flex:0 0 auto;height:calc(62px + env(safe-area-inset-bottom));padding-bottom:env(safe-area-inset-bottom);
    display:flex;align-items:stretch;position:relative;background:linear-gradient(#150f24,#0d0a16);border-top:1px solid #2e2540}
  .kh-tab{flex:1;background:none;border:0;cursor:pointer;color:#6f6486;position:relative;padding-top:4px;
    display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;
    font-family:inherit;font-size:10px;letter-spacing:.02em}
  .kh-tab svg{opacity:.9}
  .kh-tab:active{transform:translateY(1px)}
  .kh-tab.on{color:#f0c877}
  .kh-tab .badge{position:absolute;top:6px;left:calc(50% + 9px);width:8px;height:8px;border-radius:50%;
    background:#8fd39a;border:2px solid #100b1c;box-shadow:0 0 6px #8fd39a}
  /* center Depart CTA — vertically centred within the bar (no longer overlaps the tiles) */
  .kh-cta{flex:0 0 auto;width:76px;display:flex;align-items:center;justify-content:center}
  .kh-cta button{width:54px;height:54px;border-radius:50%;cursor:pointer;border:2px solid #f0c877;
    background:radial-gradient(circle at 42% 34%,#f4d493,#c2892f 70%,#9a6b22);color:#241606;
    box-shadow:0 6px 16px -6px #000,inset 0 2px 3px #fff3;display:flex;flex-direction:column;align-items:center;justify-content:center}
  .kh-cta button span{font-family:inherit;font-weight:bold;font-size:8.5px;letter-spacing:.06em;text-transform:uppercase;margin-top:-2px}
  .kh-cta button:active{transform:translateY(1px)}
  /* game menu — a bottom sheet matching the dungeon screen (reuses the global .dsheet/.dmgrid/.dmrow) */
  .kh-menuwrap{position:fixed;inset:0;z-index:15;display:flex;flex-direction:column;justify-content:flex-end;align-items:center}
  .kh-menuwrap[hidden]{display:none}
  .kh-toast{position:absolute;left:50%;top:calc(env(safe-area-inset-top) + 16px);transform:translateX(-50%);z-index:20;
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
/* icons for the Menu bottom-sheet rows (match the dungeon menu's stroke style) */
const SHEET_ICON = {
  diag:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M12 3v2.5M12 18.5V21M4.2 7.5l2.2 1.3M17.6 15.2l2.2 1.3M19.8 7.5l-2.2 1.3M6.4 15.2l-2.2 1.3"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h16M4 18h10"/><circle cx="18" cy="18" r="2.2"/></svg>`,
  exit:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3M10 16l-4-4 4-4M6 12h9"/></svg>`,
};

/* order the party tiles so the main hero (index 0) sits in the centre: [comp, MAIN, comp].
   Returns original party indices in display order (works for a party of 1, 2 or 3). */
function partyDisplayOrder(party) {
  const order = party.map((_, i) => i).filter(i => i !== 0);
  order.splice(Math.floor(party.length / 2), 0, 0);
  return order;
}
const AR = 768 / 1375;           // artwork aspect (portrait)
let khResizeObs = null;          // disconnect the previous observer on each re-render

export function openTown(ctx) {
  ensureTownCss();
  const el = document.getElementById("town");
  const hasFlag = ctx.tileFlag && ctx.party.some(h => h.alive && ctx.tileFlag(h)); // badge the Party tab
  const order = partyDisplayOrder(ctx.party);

  const spot = s => `<button class="kh-spot ${s.soon ? "soon" : ""}" data-svc="${s.svc}"
      style="left:${s.x}%;top:${s.y}%;--sc:${s.sc}"><span class="ring"></span><span class="dot"></span>
      <span class="lbl">${s.label}${s.soon ? " · soon" : ""}</span></button>`;
  const tile = idx => {
    const h = ctx.party[idx];
    const flag = h.alive && ctx.tileFlag && ctx.tileFlag(h);
    const crown = idx === 0 ? `<span class="crown">${iconImg("crown", 12)}</span>` : "";
    const mark = !h.alive ? `<span class="sk">${iconImg("skull", 16)}</span>`
      : flag ? `<span class="kh-pdot ${flag === "roll" ? "roll" : ""}"></span>` : "";
    const foot = h.alive
      ? `<span class="hp"><i style="width:${Math.max(0, Math.min(100, h.hp / derive(h).maxhp * 100))}%"></i></span>`
      : `<span class="fallen">fallen</span>`;
    return `<button class="kh-tile ${h.alive ? "" : "dead"}" data-hero="${idx}" title="${h.name} · Lv ${h.level}">
      <div class="kh-pp"><canvas width="96" height="96"></canvas>${crown}${mark}</div>
      <div class="kh-pi"><b>${h.name}</b><span class="lv">Lv ${h.level} · ${h.cls}</span>${foot}</div></button>`;
  };

  el.innerHTML = `<div class="keephome">
    <div class="kh-artwrap"><div class="kh-art" data-art>
      <div class="kh-vig"></div>
      ${SPOTS.map(spot).join("")}
      <div class="kh-wallet"><span>${iconImg("coin",13)} ${ctx.silver()}</span><span class="g">${iconImg("gem",13)} ${ctx.gems()}</span></div>
    </div></div>
    <div class="kh-strip">${order.map(tile).join("")}</div>
    <nav class="kh-nav">
      <button class="kh-tab on" data-nav="keep">${navSvg("keep")}Keep</button>
      <button class="kh-tab" data-nav="arena">${navSvg("arena")}Arena</button>
      <div class="kh-cta"><button data-nav="depart" title="Descend">${navSvg("depart",22)}<span>Depart</span></button></div>
      <button class="kh-tab" data-nav="party">${navSvg("party")}Party${hasFlag ? `<span class="badge"></span>` : ""}</button>
      <button class="kh-tab" data-nav="menu">${navSvg("menu")}Menu</button>
    </nav>
    <div class="kh-menuwrap" data-menupop hidden>
      <div class="dscrim" data-menuclose></div>
      <div class="dsheet">
        <div class="dsh"><span class="t">Menu</span><span class="x" data-menuclose>✕</span></div>
        <div class="dmgrid">
          <div class="dmrow wide" data-diag>${SHEET_ICON.diag}<span>Diagnostics &amp; log export</span></div>
          <div class="dmrow wide" style="opacity:.45;cursor:default">${SHEET_ICON.settings}<span>Settings — coming soon</span></div>
          <div class="dmrow wide danger" data-exit>${SHEET_ICON.exit}<span>Save &amp; exit to login</span></div>
        </div>
      </div>
    </div>
    <div class="kh-toast" data-toast></div>
  </div>`;

  // draw portraits into the strip tiles (display order)
  const canvases = el.querySelectorAll(".kh-tile canvas");
  order.forEach((idx, pos) => canvases[pos].getContext("2d").drawImage(ctx.portrait(ctx.party[idx]), 0, 0, 96, 96));

  // contain-fit the art so the WHOLE image shows and hotspots stay pinned to the buildings
  const art = el.querySelector("[data-art]"), wrap = art.parentElement;
  const fit = () => { const w = wrap.clientWidth, h = wrap.clientHeight; if (!w || !h) return;
    let aw = w, ah = w / AR; if (ah > h) { ah = h; aw = h * AR; }
    art.style.width = aw + "px"; art.style.height = ah + "px"; };
  fit();
  if (khResizeObs) khResizeObs.disconnect();
  if (typeof ResizeObserver !== "undefined") { khResizeObs = new ResizeObserver(fit); khResizeObs.observe(wrap); }

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
  el.querySelectorAll("[data-hero]").forEach(b => b.onclick = () => { closeMenu(); ctx.openHero(ctx.party[+b.getAttribute("data-hero")]); });

  // menu sheet: close (scrim / ✕), diagnostics, and save & exit to login
  pop.querySelectorAll("[data-menuclose]").forEach(x => x.onclick = closeMenu);
  const dg = pop.querySelector("[data-diag]");
  if (ctx.openDiag) dg.onclick = () => { closeMenu(); ctx.openDiag(); }; else dg.style.display = "none";
  const exitBtn = pop.querySelector("[data-exit]");
  if (ctx.exitToLogin) exitBtn.onclick = () => { closeMenu(); ctx.exitToLogin(); }; else exitBtn.style.display = "none";

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
