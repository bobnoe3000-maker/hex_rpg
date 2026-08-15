/* ============ UI :: TownScreen.js — the Keep (home hub) ============ */
/* Renders the town hub into #town. The battle is idle/paused while the town is showing
   (the loop only advances when scene === "dungeon"). Standalone until the SceneManager
   generalises this in a later pass. */
"use strict";

import { derive } from "../systems/StatEngine.js";

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
  .tw-card canvas{width:46px;height:46px;border-radius:8px;border:1px solid #6e5a2a}
  .tw-card b{font-size:11px;color:var(--gold)} .tw-card .lv{color:#9ad1ff}
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
  `;
  document.head.appendChild(s);
}

/* ctx = { silver, gems, party, portrait:(cls)=>canvas, openHero, openShop, enterDungeon } */
export function openTown(ctx) {
  ensureTownCss();
  const el = document.getElementById("town");
  const card = (h, i) => {
    const mh = derive(h).maxhp;
    return `<div class="tw-card" data-hero="${i}"><canvas width="96" height="96"></canvas>
      <b>${h.name}</b><span class="lv">Lv ${h.level}</span>
      <div class="bar"><i style="width:${Math.max(0, Math.min(100, h.hp / mh * 100))}%"></i></div></div>`;
  };
  el.innerHTML = `<div class="tw-wrap">
    <div class="tw-head">
      <h1>The Keep</h1>
      <p>Emberdeep hold — your pals rest between delves</p>
      <div class="tw-cur"><span>💰 ${ctx.silver()}</span><span class="g">💎 ${ctx.gems()}</span></div>
    </div>
    <div class="tw-sec">Party — tap to manage gear</div>
    <div class="tw-party">${ctx.party.map(card).join("")}</div>
    <div class="tw-sec">Services</div>
    <div class="tw-svc">
      <button class="tw-btn" data-shop><span class="ic">🛒</span><span>Shop<small>Buy &amp; sell gear · trade silver for runic gems</small></span></button>
      <button class="tw-btn" disabled><span class="ic">🏦</span><span>Bank<small>Coming soon — a death-safe vault</small></span></button>
      <button class="tw-btn primary" data-enter>⚔️ Descend into the Emberdeep</button>
    </div>
  </div>`;

  ctx.party.forEach((h, i) => {
    const cv = el.querySelectorAll(".tw-card canvas")[i];
    cv.getContext("2d").drawImage(ctx.portrait(h.cls), 0, 0, 96, 96);
  });
  el.querySelectorAll("[data-hero]").forEach(c => c.onclick = () => ctx.openHero(ctx.party[+c.getAttribute("data-hero")]));
  el.querySelector("[data-shop]").onclick = () => ctx.openShop();
  el.querySelector("[data-enter]").onclick = () => ctx.enterDungeon();
}
