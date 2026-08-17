/* ============ UI :: TownScreen.js — the Keep (home hub) ============ */
/* Renders the town hub into #town. The battle is idle/paused while the town is showing
   (the loop only advances when scene === "dungeon"). Standalone until the SceneManager
   generalises this in a later pass. */
"use strict";

import { iconImg } from "../engine/icons.js";

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
    background:linear-gradient(#0b091266 0%,transparent 15%,transparent 66%,#0b0912cc 100%)}
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
  /* top chrome */
  .kh-top{position:absolute;left:0;right:0;top:0;z-index:6;display:flex;align-items:flex-start;justify-content:space-between;
    padding:calc(env(safe-area-inset-top) + 10px) 11px 0}
  .kh-party{display:flex}
  .kh-av{position:relative;width:38px;height:38px;margin-left:-8px;padding:0;border:1px solid #6e5a2a;border-radius:9px;
    background:#1a1228;box-shadow:0 3px 8px #0009;cursor:pointer;overflow:visible}
  .kh-av:first-child{margin-left:0}
  .kh-av:active{transform:translateY(1px)}
  .kh-av canvas{width:100%;height:100%;border-radius:8px;display:block}
  .kh-av.dead{border-color:#5a2a2a}
  .kh-av.dead canvas{filter:grayscale(1) brightness(.62)}
  .kh-av .kh-crown{position:absolute;left:50%;top:-9px;transform:translateX(-50%);line-height:0}
  .kh-av .kh-skull{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
  .kh-dot{position:absolute;top:-4px;right:-4px;width:11px;height:11px;border-radius:50%;
    background:#e0b063;border:2px solid #1a1228;box-shadow:0 0 6px #e0b063;z-index:3}
  .kh-dot.roll{background:#8fd39a;box-shadow:0 0 6px #8fd39a}
  .kh-tr{display:flex;flex-direction:column;align-items:flex-end;gap:7px}
  .kh-cur{display:flex;gap:9px;font-size:12px;color:#f0d38a;font-variant-numeric:tabular-nums;
    background:#120d1ccc;border:1px solid var(--line);border-radius:9px;padding:4px 9px;box-shadow:0 2px 6px #0008}
  .kh-cur .g{color:#9ad1ff}
  .kh-menu-btn{width:32px;height:32px;border-radius:9px;border:1px solid #6e4a2a;cursor:pointer;font-size:15px;line-height:1;
    background:linear-gradient(#4a3527,#2e2016);color:#f0d9b0;box-shadow:0 3px 8px #0009}
  .kh-menu-btn:active{transform:translateY(1px)}
  .kh-menu{position:absolute;top:calc(env(safe-area-inset-top) + 48px);right:11px;z-index:9;min-width:210px;
    background:#170f26;border:1px solid var(--line);border-radius:11px;padding:6px;box-shadow:0 12px 30px -8px #000}
  .kh-menu[hidden]{display:none}
  .kh-menu button{display:flex;align-items:center;gap:9px;width:100%;text-align:left;font-family:inherit;font-size:12.5px;
    color:var(--parchment);background:none;border:0;border-radius:7px;padding:9px 10px;cursor:pointer}
  .kh-menu button:active{background:#241b38}
  .kh-menu button[disabled]{opacity:.4;pointer-events:none}
  /* bottom chrome */
  .kh-bottom{position:absolute;left:0;right:0;bottom:0;z-index:6;display:flex;align-items:flex-end;justify-content:space-between;
    padding:0 12px calc(env(safe-area-inset-bottom) + 14px)}
  .kh-arena{font-family:inherit;font-size:12px;color:#2c2114;cursor:pointer;transform:rotate(-2deg);
    background:linear-gradient(#efe2c4,#d0b985);border:1px solid #b49a63;border-radius:5px;padding:6px 11px;box-shadow:0 4px 10px #000a;
    display:flex;align-items:center;gap:6px}
  .kh-arena:active{transform:rotate(-2deg) translateY(1px)}
  .kh-depart{font-family:inherit;font-weight:bold;letter-spacing:.09em;text-transform:uppercase;font-size:14px;color:#241606;cursor:pointer;
    background:linear-gradient(#e8bf78,#b47f34);border:1px solid #f0c877;border-radius:12px;padding:11px 18px;
    box-shadow:0 5px 0 #6e4a14,0 12px 22px -8px #000;display:flex;flex-direction:column;align-items:center;gap:1px;line-height:1.1}
  .kh-depart small{font-weight:normal;letter-spacing:.02em;text-transform:none;font-size:10px;opacity:.85}
  .kh-depart:active{transform:translateY(3px);box-shadow:0 2px 0 #6e4a14}
  .kh-toast{position:absolute;left:50%;top:calc(env(safe-area-inset-top) + 52px);transform:translateX(-50%);z-index:20;
    background:#120d1cee;border:1px solid var(--gold);color:var(--gold);font-size:12px;padding:7px 13px;border-radius:9px;
    opacity:0;transition:opacity .25s;pointer-events:none;white-space:nowrap;box-shadow:0 6px 18px #000;max-width:88%;text-align:center}
  .kh-toast.on{opacity:1}
  `;
  document.head.appendChild(s);
}

/* The Keep is the illustrated town (assets/home_ui.png). Buildings are tappable hotspots wired to the
   existing services; the meta-nav lives in the corners so it never covers the art:
     · top-left  — party portraits (tap a pal → their character screen; a dot flags points/rolls)
     · top-right — wallet + a ⚙ menu (Diagnostics, future settings)
     · bottom    — Arena banner (coming soon) · gold Depart button → the Dungeons board (World Map)
   Hotspot %s are calibrated to the Iron-Vault artwork and match the reviewed mockup.
   ctx = { silver, gems, party, portrait, tileFlag, activeDungeon,
           openHero, openShop, openTavern, openTemple, openForge, openDiag, openDungeons, enterDungeon } */
const SPOTS = [
  { svc: "temple", label: "Temple", x: 54, y: 15, sc: "#ffd08a" },
  { svc: "forge",  label: "Forge",  x: 62, y: 33, sc: "#ff9a3c" },
  { svc: "bank",   label: "Bank",   x: 60, y: 47, sc: "#9ad1ff", soon: true },
  { svc: "tavern", label: "Tavern", x: 19, y: 80, sc: "#ffcf7a" },
  { svc: "shop",   label: "Shop",   x: 85, y: 78, sc: "#ffcf7a" },
];
export function openTown(ctx) {
  ensureTownCss();
  const el = document.getElementById("town");
  const active = ctx.activeDungeon ? ctx.activeDungeon() : null;

  const spot = s => `<button class="kh-spot ${s.soon ? "soon" : ""}" data-svc="${s.svc}"
      style="left:${s.x}%;top:${s.y}%;--sc:${s.sc}"><span class="ring"></span><span class="dot"></span>
      <span class="lbl">${s.label}${s.soon ? " · soon" : ""}</span></button>`;
  const av = (h, i) => {
    const flag = h.alive && ctx.tileFlag && ctx.tileFlag(h);
    const dot = flag ? `<span class="kh-dot ${flag === "roll" ? "roll" : ""}"></span>` : "";
    const crown = i === 0 ? `<span class="kh-crown">${iconImg("crown", 11)}</span>` : "";
    const skull = h.alive ? "" : `<span class="kh-skull">${iconImg("skull", 14)}</span>`;
    return `<button class="kh-av ${h.alive ? "" : "dead"}" data-hero="${i}" title="${h.name} · Lv ${h.level}">
      <canvas width="96" height="96"></canvas>${crown}${skull}${dot}</button>`;
  };

  el.innerHTML = `<div class="keephome">
    <div class="kh-art">${SPOTS.map(spot).join("")}</div>
    <div class="kh-vig"></div>
    <div class="kh-top">
      <div class="kh-party">${ctx.party.map(av).join("")}</div>
      <div class="kh-tr">
        <div class="kh-cur"><span>${iconImg("coin",13)} ${ctx.silver()}</span><span class="g">${iconImg("gem",13)} ${ctx.gems()}</span></div>
        <button class="kh-menu-btn" data-menu title="Menu">⚙</button>
      </div>
    </div>
    <div class="kh-menu" data-menupop hidden>
      <button data-diag>${iconImg("spark",16)} Diagnostics &amp; log export</button>
      <button disabled>${iconImg("hammer",16)} Settings — coming soon</button>
    </div>
    <div class="kh-bottom">
      <button class="kh-arena" data-arena>${iconImg("star",14)} Arena</button>
      <button class="kh-depart" data-depart><span>${iconImg("sword",14)} Depart</span>${active ? `<small>${active.name}</small>` : ""}</button>
    </div>
    <div class="kh-toast" data-toast></div>
  </div>`;

  ctx.party.forEach((h, i) => {
    const cv = el.querySelectorAll(".kh-av canvas")[i];
    cv.getContext("2d").drawImage(ctx.portrait(h), 0, 0, 96, 96);
  });

  const toastEl = el.querySelector("[data-toast]");
  const toast = msg => { toastEl.textContent = msg; toastEl.classList.add("on");
    clearTimeout(toast._h); toast._h = setTimeout(() => toastEl.classList.remove("on"), 1700); };

  const svc = { temple: ctx.openTemple, forge: ctx.openForge, tavern: ctx.openTavern, shop: ctx.openShop };
  el.querySelectorAll(".kh-spot").forEach(b => b.onclick = () => {
    const k = b.getAttribute("data-svc");
    if (k === "bank") return toast("The Iron Vault is sealed — a death-safe bank is coming soon");
    if (svc[k]) svc[k]();
  });
  el.querySelectorAll("[data-hero]").forEach(b => b.onclick = () => ctx.openHero(ctx.party[+b.getAttribute("data-hero")]));

  const pop = el.querySelector("[data-menupop]");
  el.querySelector("[data-menu]").onclick = e => { e.stopPropagation(); pop.hidden = !pop.hidden; };
  const dg = pop.querySelector("[data-diag]");
  if (ctx.openDiag) dg.onclick = () => { pop.hidden = true; ctx.openDiag(); }; else dg.disabled = true;
  el.querySelector(".keephome").addEventListener("click", e => {
    if (!pop.hidden && !pop.contains(e.target) && !e.target.closest("[data-menu]")) pop.hidden = true;
  });

  el.querySelector("[data-arena]").onclick = () => toast("The Arena is being raised — PvP challenges open soon");
  el.querySelector("[data-depart]").onclick = () => (ctx.openDungeons ? ctx.openDungeons() : ctx.enterDungeon && ctx.enterDungeon());
}
