/* ============ UI :: CharacterPanel.js — hero stats, gear, bag, and the Forge ============ */
/* A self-contained modal rendered into #overlay. Opening it pauses the battle (the caller
   supplies pause/resume via ctx). Standalone until the SceneManager arrives in Phase 4. */
"use strict";

import { derive } from "../systems/StatEngine.js";
import { canEquip, equip, unequip, compareToEquipped } from "../systems/Equipment.js";
import { STAT_STEP, ASSIGNABLE } from "../systems/Leveling.js";
import { heroKit, starTier, skillDef } from "../systems/Skills.js";
import { starsHtml, starLabel } from "./stars.js";
import { SLOTS } from "../data/items/gearTypes.js";
import { POTION_BY_ID, potionName, potionEffectText } from "../data/potions.js";
import { flaskSvg } from "./potionChip.js";
import { itemNameHtml as itemName } from "./itemView.js";
import { iconImg } from "../engine/icons.js";
import { gearIconImg } from "../engine/gearIcon.js";

const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const STAT_ROWS = [["ATK", "atk"], ["DEF", "def"], ["Dodge", "dodge"], ["Crit", "crit"]];
const ATTR_LABEL = { hp: "HP", atk: "ATK", def: "DEF", dodge: "Dodge", crit: "Crit" };
/* gear-comparison formatting */
const CMP_LABEL = { atk: "ATK", def: "DEF", hp: "HP", dodge: "Dodge", crit: "Crit", aspd: "Speed" };
const VD_TEXT = { up: "▲ Upgrade", side: "⇄ Sidegrade", down: "▼ Downgrade", new: "✦ New" };
const cmpEps = s => s === "aspd" ? 0.005 : 0.05;
const cmpNum = (s, v) => s === "aspd" ? (Math.round(v * 100) / 100).toFixed(2) : String(Math.round(v * 10) / 10);
const cmpDelta = (s, v) => (v > 0 ? "+" : "−") + cmpNum(s, Math.abs(v));   // signed, uses a real minus glyph
const fmtStep = (k, n) => k === "aspd" ? n.toFixed(2) : n;   // (aspd isn't assignable, kept for safety)

/* ---- skill-node glyphs (stroke icons, currentColor). A skill's glyph is derived from its effect
   signature so all four classes' trees get sensible icons without a per-id table. ---- */
const SK_GLYPH = {
  burst:'<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l3 3M18 6l-3 3M6 18l3-3M18 18l-3-3"/><circle cx="12" cy="12" r="2.4"/>',
  fist:'<path d="M7.5 12V8.5a1.4 1.4 0 012.8 0M10.3 8.5V7.2a1.4 1.4 0 012.8 0v1.3M13.1 8.7a1.4 1.4 0 012.8 0V13c0 3-2.2 5.6-4.9 5.6S6 16.4 6 13.6v-1.4a1.4 1.4 0 012.8-.5"/>',
  target:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none"/>',
  axe:'<path d="M8 20L15.5 7"/><path d="M12.5 4.2a7 7 0 015 6.2c-3.2 1-5.4-.2-7.2-2.4z"/>',
  drop:'<path d="M12 3.5c3 4.6 5 6.7 5 9.5a5 5 0 01-10 0c0-2.8 2-4.9 5-9.5z"/>',
  chevrons:'<path d="M5 7.5l6.5 4.5L5 16.5M12 7.5l6.5 4.5L12 16.5"/>',
  spiral:'<path d="M12 12a1.4 1.4 0 011.4 1.4 2.6 2.6 0 01-2.6 2.6 3.8 3.8 0 01-3.8-3.8 5 5 0 015-5 6.2 6.2 0 016.2 6.2"/>',
  skull:'<path d="M6 11.5a6 6 0 1112 0v2.5l-1 1v2.2H7v-2.2l-1-1z"/><circle cx="9.4" cy="11.6" r="1.5" fill="currentColor" stroke="none"/><circle cx="14.6" cy="11.6" r="1.5" fill="currentColor" stroke="none"/><path d="M11 17v-1.5M13 17v-1.5"/>',
  claw:'<path d="M6.5 4c1 6 2 10.5 4 15.5M11 4c0 6 .2 10.5 1.2 15.5M15.5 4c-1 6-2 10.5-3.6 15.5"/>',
  swords:'<path d="M5 5.5l9.5 9.5M19 5.5L9.5 15"/><path d="M4 6.5l2-2M20 6.5l-2-2M6.5 17.5l-2 2M17.5 17.5l2 2"/>',
  flame:'<path d="M12 3.5c1.2 3 4.2 4.2 4.2 8.2a4.2 4.2 0 01-8.4 0c0-1.2.5-2.3 1.3-3.2.3 2 1.1 2.2 1.1 2.2.6-2.2-1.3-4.4 1.8-7.2z"/>',
  hammer:'<path d="M4.5 19.5l6.2-6.2"/><path d="M9.5 9.2l4.3-4.3 5.3 5.3-4.3 4.3z"/>',
  banner:'<path d="M7 4.5h9.5l-2.2 3.2 2.2 3.2H7"/><path d="M7 3.5v17"/>',
  shield:'<path d="M12 3.2l7 2.8v5.2c0 5.2-3.6 8.3-7 9.3-3.4-1-7-4.1-7-9.3V6z"/>',
  shieldcross:'<path d="M12 3.2l7 2.8v5.2c0 5.2-3.6 8.3-7 9.3-3.4-1-7-4.1-7-9.3V6z"/><path d="M12 8v7M8.6 11.5h6.8"/>',
  aegis:'<path d="M12 3.2l7 2.8v5.2c0 5.2-3.6 8.3-7 9.3-3.4-1-7-4.1-7-9.3V6z"/><path d="M12 8.4l1.15 2.35 2.6.35-1.9 1.85.46 2.6L12 14.3l-2.32 1.24.46-2.6-1.9-1.85 2.6-.35z" fill="currentColor" stroke="none"/>',
  bolt:'<path d="M13.5 3l-6.5 9.5h4.2l-1.2 8.5 6.5-10.2h-4.2z"/>',
  wave:'<path d="M3.5 9.5c2-2 4.2-2 6.2 0s4.2 2 6.2 0 3-1.6 4.6-.4M3.5 14.5c2-2 4.2-2 6.2 0s4.2 2 6.2 0 3-1.6 4.6-.4"/>',
  reflect:'<path d="M4.5 9.5h11l-3-3M19.5 14.5h-11l3 3"/>',
  uparrow:'<path d="M12 20.5V5M6.5 11L12 5l5.5 6"/>',
  heart:'<path d="M12 20s-7-4.6-7-9.2A3.8 3.8 0 0112 8a3.8 3.8 0 017 2.8C19 15.4 12 20 12 20z"/>',
  wind:'<path d="M3 9h10.5a2.4 2.4 0 10-2.4-2.6M3 14h13.5a2.4 2.4 0 11-2.4 2.6"/>',
  cross:'<path d="M12 6v12M6 12h12"/>',
  lock:'<rect x="5.5" y="10.5" width="13" height="9" rx="1.6"/><path d="M8 10.5V8a4 4 0 018 0v2.5"/>',
};
function glyphFor(s) {
  if (s.tier === 5) return "banner";
  const fx = s.fx || {};
  if (fx.cleave) return "burst";
  if (fx.momentum) return "chevrons";
  if (fx.rend) return "claw";
  if (fx.lifesteal) return "drop";
  if (fx.exec) return "skull";
  if (fx.critDefIgnore) return "hammer";
  if (fx.critDmgReduce) return "shieldcross";
  if (fx.reflect) return "reflect";
  if (fx.guardian) return "aegis";
  if (fx.waveheal) return "wave";
  if (fx.lastst) return "flame";
  if (fx.mult) return fx.mult.stat === "atk" ? "flame" : "uparrow";
  if (fx.flat) { const st = fx.flat;
    if (st.atk) return "fist"; if (st.crit) return "target"; if (st.hp) return "heart";
    if (st.dodge != null || st.aspd != null) return "wind"; if (st.def) return "shield"; }
  if (fx.active) return { bolt:"bolt", nova:"burst", heal:"cross", buff:"uparrow", sunder:"axe",
    bash:"hammer", whirl:"spiral", rampage:"swords", guard:"shield", taunt:"bolt", rally:"banner",
    wrath:"banner", unbreak:"aegis" }[fx.active.kind] || "swords";
  return "burst";
}
const skIcon = (key, size = 24) => `<svg class="skg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SK_GLYPH[key] || SK_GLYPH.burst}</svg>`;

function injectCss() {
  if (document.getElementById("cp-style")) return;
  const s = document.createElement("style"); s.id = "cp-style";
  s.textContent = `
  .cpanel{width:100%;max-width:420px;max-height:calc(100dvh - 40px);overflow-y:auto;
    background:linear-gradient(#241b38,#181128);border:1px solid var(--line);border-radius:12px;
    padding:12px 13px;box-shadow:0 6px 24px #000;text-align:left}
  .cp-tabs{display:flex;gap:6px;margin:2px 0 11px}
  .cp-tab{flex:1;min-width:0;font-family:inherit;font-weight:bold;letter-spacing:.4px;font-size:12.5px;border:1px solid var(--line);
    border-radius:9px;padding:10px 5px;cursor:pointer;background:#1c1630;color:#9a8fb8;white-space:nowrap}
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
  .cp-slot{display:flex;align-items:center;gap:6px;padding:6px 8px;border-radius:7px;
    background:#1c1630;border:1px solid var(--line);margin-bottom:5px;font-size:12px;cursor:pointer}
  .cp-item{background:#1c1630;border:1px solid var(--line);border-radius:8px;margin-bottom:6px;font-size:12px;overflow:hidden}
  .cp-irow{display:flex;align-items:center;gap:6px;padding:6px 8px}
  .cp-vd{font-family:ui-monospace,monospace;font-size:8px;font-weight:bold;letter-spacing:.05em;text-transform:uppercase;
    padding:3px 6px;border-radius:5px;white-space:nowrap;flex:0 0 auto}
  .cp-vd.up{color:#08260f;background:#7ee787}.cp-vd.side{color:#241606;background:#e0b063}
  .cp-vd.down{color:#2a0808;background:#ff6b6b}.cp-vd.new{color:#06121a;background:#9ad1ff}
  .cp-cmpline{display:flex;flex-wrap:wrap;gap:5px;align-items:center;padding:0 8px 7px 40px}
  .cp-dl{font-family:ui-monospace,monospace;font-size:8.5px;letter-spacing:.05em;text-transform:uppercase;color:#6f6486;margin-right:1px}
  .cp-chip{font-family:ui-monospace,monospace;font-size:10px;font-weight:bold;padding:1.5px 6px;border-radius:999px;font-variant-numeric:tabular-nums}
  .cp-chip.p{color:#7ee787;background:rgba(126,231,135,.12);border:1px solid rgba(126,231,135,.4)}
  .cp-chip.n{color:#ff6b6b;background:rgba(255,107,107,.12);border:1px solid rgba(255,107,107,.4)}
  .cp-chip.kw{color:#9ad1ff;background:rgba(154,209,255,.12);border:1px solid rgba(154,209,255,.4)}
  .cp-chip.kwn{color:#ff6b6b;background:rgba(255,107,107,.12);border:1px solid rgba(255,107,107,.4)}
  .cp-chip.kw0{color:#9a8fb8;background:#00000030;border:1px solid var(--line2)}
  .cp-cmpx{cursor:pointer;color:#6f6486;font-size:10px;font-family:ui-monospace,monospace;margin-left:auto}
  .cp-cmpx:active{color:#9ad1ff}
  .cp-cmpgrid{display:grid;grid-template-columns:1fr auto auto auto;gap:3px 10px;padding:8px 9px 9px 40px;
    border-top:1px dashed var(--line2);background:#160f24;font-size:11.5px;align-items:center}
  .cp-cmpgrid .h{font-family:ui-monospace,monospace;font-size:8px;letter-spacing:.05em;text-transform:uppercase;color:#6f6486;padding-bottom:1px}
  .cp-cmpgrid .k{color:#9a8fb8}
  .cp-cmpgrid .a{text-align:right;color:#6f6486;font-variant-numeric:tabular-nums}
  .cp-cmpgrid .b{text-align:right;color:var(--parchment);font-variant-numeric:tabular-nums;font-weight:bold}
  .cp-cmpgrid .d{text-align:right;font-variant-numeric:tabular-nums;font-weight:bold}
  .cp-cmpgrid .d.p{color:#7ee787}.cp-cmpgrid .d.n{color:#ff6b6b}.cp-cmpgrid .d.z{color:#6f6486}
  .cp-slot.sel{border-color:var(--gold);background:#241a12}
  .cp-slot .sl{color:#9a8fb8;width:58px;flex:0 0 auto;font-size:10px;text-transform:uppercase;letter-spacing:1px}
  .cp-slot.sel .sl{color:var(--gold)}
  .cp-slot .it,.cp-item .it{flex:1;line-height:1.3;min-width:0}
  .cp-slot .it small,.cp-item .it small{color:#8fd39a;font-style:italic}
  .cp-empty{opacity:.5;font-style:italic}
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
  .stars{display:inline-flex;gap:2px;align-items:center;vertical-align:middle}
  .cp-respec{width:100%;font-family:inherit;font-weight:bold;font-size:12px;border:1px solid var(--line2);border-radius:8px;
    padding:9px;cursor:pointer;background:#241a2e;color:#c9a0ff;display:flex;align-items:center;justify-content:center;gap:6px}
  .cp-respec:disabled{opacity:.4;cursor:default;color:#6f6486}
  .cp-respec.arm{background:linear-gradient(#7a2020,#4a1414);color:#ffd8c0;border-color:#c0392b}
  .cp-respec:active:not(:disabled){transform:translateY(1px)}
  /* ---- talent-grid skill tree ---- */
  .sk-grid{display:flex;flex-direction:column;gap:2px}
  .sk-tier{position:relative;padding:6px 2px 10px}
  .sk-tier+.sk-tier{border-top:1px dashed var(--line)}
  .sk-tl{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;padding:0 2px}
  .sk-tl span{font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:#6f6486}
  .sk-tier.lk .sk-tl span{color:#4a4460}
  .sk-gate{display:inline-flex;align-items:center;gap:3px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:9px;
    color:#8a6a4a;background:rgba(216,162,74,.09);border:1px solid rgba(216,162,74,.28);border-radius:20px;padding:1px 7px}
  .sk-gate.ok{color:var(--gold)}
  .sk-gate .skg{stroke:currentColor}
  .sk-trow{display:flex;justify-content:center;gap:8px;flex-wrap:wrap}
  .sk-tier.cap .sk-trow{margin-top:2px}
  .sk-node{flex:1 1 0;min-width:0;max-width:118px;display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center;
    background:none;border:0;box-shadow:none;border-radius:0;cursor:pointer;padding:2px 0;font-family:inherit}
  .sk-node:active{transform:translateY(1px)}
  .sk-ic{position:relative;width:50px;height:50px;border-radius:13px;display:grid;place-items:center;
    background:linear-gradient(180deg,#241a38,#150e24);border:1.5px solid var(--line2);color:#8a7fae;transition:.12s}
  .sk-tier.cap .sk-ic{width:56px;height:56px;border-radius:15px}
  .sk-ic .skg{stroke:currentColor}
  .sk-node.on.off .sk-ic{color:#ffb184;border-color:#ff8a5a;background:radial-gradient(circle at 40% 30%,#3a2214,#1c1330);box-shadow:0 0 13px rgba(255,138,90,.32)}
  .sk-node.on.def .sk-ic{color:#aed2ff;border-color:#79c7e6;background:radial-gradient(circle at 40% 30%,#16283c,#141c30);box-shadow:0 0 13px rgba(121,199,230,.3)}
  .sk-node.open .sk-ic{outline:2px solid var(--parchment);outline-offset:2px}
  .sk-node.lk{opacity:.5}
  .sk-node.lk .sk-ic{border-style:dashed;background:repeating-linear-gradient(45deg,#191223,#191223 4px,#140e20 4px,#140e20 8px)}
  .sk-rk{position:absolute;bottom:-6px;right:-6px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:8.5px;font-weight:bold;
    background:#0d0a16;border:1px solid var(--line2);border-radius:8px;padding:0 4px;color:var(--gold)}
  .sk-node.on.off .sk-rk{border-color:#ff8a5a;color:#ffb184}.sk-node.on.def .sk-rk{border-color:#79c7e6;color:#aed2ff}
  .sk-pd{position:absolute;top:-6px;right:-6px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:8.5px;font-weight:bold;
    background:var(--gold);color:#231708;border-radius:8px;padding:0 4px}
  .sk-badge{position:absolute;top:-5px;left:-5px;width:14px;height:14px;border-radius:50%;display:grid;place-items:center;
    font-size:7px;background:#0d0a16;border:1px solid var(--line2)}
  .sk-badge.a{color:#ff8a5a}.sk-badge.p{color:#79c7e6}
  .sk-nm{font-size:10.5px;line-height:1.15;color:var(--parchment);min-height:24px;display:flex;align-items:center}
  .sk-node.lk .sk-nm{color:#8a7fae}
  .sk-node .stars{line-height:0}
  .sk-node.off .stars{--sc:#ff8a5a}.sk-node.def .stars{--sc:#79c7e6}
  /* ---- center detail modal ---- */
  .skm-back{position:fixed;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;padding:16px;
    background:rgba(6,4,10,.66);backdrop-filter:blur(2px);animation:skmfade .12s ease-out}
  @keyframes skmfade{from{opacity:0}to{opacity:1}}
  @media(prefers-reduced-motion:reduce){.skm-back{animation:none}}
  .skm{position:relative;width:100%;max-width:340px;max-height:calc(100dvh - 40px);overflow-y:auto;text-align:left;
    background:linear-gradient(180deg,#241b38,#171029);border:1px solid var(--line2);border-radius:14px;box-shadow:0 12px 40px #000}
  .skm-x{position:absolute;top:10px;right:12px;font-size:15px;color:#8a7fae;background:none;border:0;cursor:pointer;z-index:2}
  .skm-x:hover{color:var(--parchment)}
  .skm-hd{position:relative;padding:16px 16px 14px;border-bottom:1px solid var(--line)}
  .skm-ic{width:48px;height:48px;border-radius:13px;display:grid;place-items:center;margin-bottom:10px;
    background:radial-gradient(circle at 40% 30%,#3a2a12,#1c1330);border:1.5px solid var(--gold);color:var(--gold)}
  .skm-ic.off{border-color:#ff8a5a;color:#ffb184}.skm-ic.def{border-color:#79c7e6;color:#aed2ff}
  .skm-ic.lk{border-color:var(--line2);color:#8a7fae;background:#221733}
  .skm-ic .skg{stroke:currentColor}
  .skm-tags{display:flex;gap:5px;margin-bottom:7px;flex-wrap:wrap}
  .skm-tags .tg{font-size:8.5px;letter-spacing:.06em;text-transform:uppercase;font-weight:bold;padding:2px 6px;border-radius:5px}
  .skm-tags .tg.off{background:rgba(255,138,90,.16);color:#ffb184}.skm-tags .tg.def{background:rgba(121,199,230,.16);color:#aed2ff}
  .skm-tags .tg.tr{background:#2a2342;color:#b7abd2}.skm-tags .tg.ty{background:rgba(216,162,74,.15);color:var(--gold)}
  .skm-nm{font-family:Georgia,serif;font-size:19px;font-weight:bold;color:#fff;line-height:1.12;margin-bottom:4px}
  .skm-de{font-family:Georgia,serif;font-size:12.5px;font-style:italic;color:#9a8fb8;line-height:1.45}
  .skm-st{display:flex;align-items:center;gap:8px;margin-top:11px}
  .skm.off .skm-st .stars{--sc:#ff8a5a}.skm.def .skm-st .stars{--sc:#79c7e6}
  .skm-st .lb{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;color:var(--gold);font-weight:bold}
  .skm-st .lb small{color:#8a7fae;font-weight:normal}
  .skm-bd{padding:13px 16px}
  .skm-sec{font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:#6f6486;margin-bottom:7px}
  .skm-lad{display:flex;flex-direction:column;gap:2px}
  .skm-rung{display:flex;align-items:center;gap:9px;padding:6px 8px;border-radius:7px;font-size:12px;color:#9a8fb8}
  .skm-rung .rk{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:9.5px;color:#6f6486;flex:0 0 auto;width:18px}
  .skm-rung .rx{font-family:Georgia,serif;flex:1}
  .skm-rung.done{color:var(--parchment)}.skm-rung.done .rk{color:var(--gold)}
  .skm-rung.cur{background:linear-gradient(90deg,rgba(216,162,74,.16),transparent);box-shadow:inset 2px 0 0 var(--gold)}
  .skm-rung.cur .rk{color:#f0c877}.skm-rung.cur .rx{color:#fff;font-weight:bold}
  .skm-rung.next{background:rgba(255,255,255,.03)}.skm-rung.next .rk{color:var(--parchment)}
  .skm-ft{padding:12px 16px 16px;border-top:1px solid var(--line);position:sticky;bottom:0;
    background:linear-gradient(180deg,rgba(23,16,41,0),#171029 30%)}
  .skm-learn{width:100%;display:flex;align-items:center;justify-content:center;gap:7px;padding:12px;border-radius:10px;
    font-family:inherit;font-weight:bold;font-size:13.5px;border:0;cursor:pointer;
    background:linear-gradient(#e0b063,#a8722a);color:#241606;box-shadow:0 3px 0 #6e4a14}
  .skm-learn small{font-family:ui-monospace,Menlo,Consolas,monospace;font-weight:normal;font-size:10.5px;opacity:.8}
  .skm-learn:active{transform:translateY(2px);box-shadow:0 1px 0 #6e4a14}
  .skm-learn.no{background:#221733;color:#6f6486;box-shadow:none;border:1px solid var(--line);cursor:default}
  .skm-undo{width:100%;margin-top:7px;font-family:inherit;font-size:11.5px;color:#9a8fb8;background:none;
    border:1px solid var(--line2);border-radius:8px;padding:8px;cursor:pointer}
  .skm-undo:active{transform:translateY(1px)}
  .skm-lock{display:flex;align-items:center;gap:7px;justify-content:center;text-align:center;font-size:11.5px;color:var(--gold);
    background:rgba(216,162,74,.08);border:1px solid rgba(216,162,74,.25);border-radius:9px;padding:10px}
  .skm-lock b{color:#f0c877}.skm-lock span{color:#8a7fae}
  .skm-lock .skg{stroke:currentColor;flex:0 0 auto}
  .skm-max{text-align:center;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;color:#f0c877;
    background:rgba(216,162,74,.1);border-radius:9px;padding:10px}
  .skm-draft{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:9px;padding-top:9px;border-top:1px dashed var(--line)}
  .skm-draft>span{font-size:11px;color:var(--gold)}
  .skm-dbtns{display:flex;gap:6px}
  .skm-disc,.skm-conf{font-family:inherit;font-weight:bold;font-size:11.5px;border:0;border-radius:7px;padding:7px 12px;cursor:pointer}
  .skm-disc{background:#2a2342;color:#b7abd2}
  .skm-conf{background:linear-gradient(#e0b063,#a8722a);color:#241606;box-shadow:0 2px 0 #6e4a14}
  .skm-disc:active,.skm-conf:active{transform:translateY(1px)}
  .cp-kit{padding:6px 9px;border-radius:8px;background:#1c1630;border:1px solid var(--line);margin-bottom:5px;cursor:pointer}
  .cp-kit.off{border-left:2px solid #ff8a5a}.cp-kit.def{border-left:2px solid #79c7e6}
  .cp-kit.open{background:#231b3a;border-color:var(--line2)}
  .cp-kit:active{transform:translateY(1px)}
  .cp-kit-h{display:flex;align-items:center;gap:8px}
  .cp-kit .kn{flex:1;font-size:12.5px;font-weight:bold;color:var(--parchment)}
  .cp-kit .stars{flex:0 0 auto}
  .cp-kit.off .stars{--sc:#ff8a5a}.cp-kit.def .stars{--sc:#79c7e6}
  .cp-kit .kr{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:9px;color:var(--gold);min-width:26px;text-align:right}
  .cp-kit-caret{color:#6f6486;font-size:10px;flex:0 0 auto;width:10px;text-align:center}
  .cp-kit-d{margin-top:6px;padding-top:6px;border-top:1px solid var(--line);line-height:1.45}
  .cp-kit-d .kd{display:block;font-size:11px;color:#9a8fb8;margin-bottom:3px}
  .cp-kit-d .ke{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:10.5px;color:#8fd39a}
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
  const expandedCmp = new WeakSet(); // bag items whose side-by-side compare is open
  let tab = "stats";     // main-hero panel tab: "stats" | "skills" | "equip"
  let skillBranch = "off"; // Skills tab sub-tab: "off" | "def"
  let keepScroll = true;   // preserve scroll across re-render (false = jump to top, for main-tab switches)
  const skillDraft = {};   // pending skill ranks (id → count) not yet committed
  let skillResetArm = false; // two-tap guard on the paid tree reset
  let skillOpen = null;    // id of the skill whose center detail modal is open (Skills tab)
  let kitOpen = null;      // companion kit: id of the skill whose effect row is expanded
  const draft = {};      // pending, unconfirmed point allocation (stat → signed count)
  for (const k of ASSIGNABLE) draft[k] = 0;
  const draftSum = () => ASSIGNABLE.reduce((a, k) => a + draft[k], 0);
  const clearDraft = () => { for (const k of ASSIGNABLE) draft[k] = 0; };

  function render(msg) {
    const D = derive(hero);
    const gems = ctx.gems ? ctx.gems() : 0;
    const silver = ctx.silver ? ctx.silver() : 0;
    const preview = !!ctx.preview;   // read-only inspection (e.g. a tavern recruit you don't own yet)
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
      const body = it
        ? `${gearIconImg(it, 26)}<span class="it">${itemName(it)}<br><small>${it.d}</small></span>` + (preview ? "" : `<button class="cp-btn off" data-uneq="${key}">✕</button>`)
        : `<span class="it cp-empty">— empty —</span>`;
      if (preview) return `<div class="cp-slot" style="cursor:default"><span class="sl">${cap(key)}</span>${body}</div>`;
      return `<div class="cp-slot ${filterSlot === key ? "sel" : ""}" data-filter="${key}"><span class="sl">${cap(key)}</span>${body}</div>`;
    };
    // A bag item shows how it compares to what's equipped in its slot: a verdict pill, always-on
    // stat-delta chips, and a tap-to-open side-by-side (Equipped → This → Δ).
    const itemRow = (it, i) => {
      const c = compareToEquipped(hero, it);
      const isNew = c.verdict === "new", isOpen = expandedCmp.has(it);
      const changed = c.stats.filter(x => Math.abs(x.diff) >= cmpEps(x.stat));
      const statChips = changed.map(x =>
        `<span class="cp-chip ${x.diff > 0 ? "p" : "n"}">${cmpDelta(x.stat, x.diff)} ${CMP_LABEL[x.stat]}</span>`).join("");
      const kwChips = c.keywords.map(k =>
        `<span class="cp-chip ${k.sign > 0 ? "kw" : k.sign < 0 ? "kwn" : "kw0"}">${k.sign > 0 ? "+ " : k.sign < 0 ? "− " : ""}${cap(k.label)}</span>`).join("");
      const grid = isOpen ? `<div class="cp-cmpgrid">
          <span class="h">Stat</span><span class="h" style="text-align:right">Equipped</span><span class="h" style="text-align:right">This</span><span class="h" style="text-align:right">Δ</span>
          ${c.stats.map(x => { const z = Math.abs(x.diff) < cmpEps(x.stat);
            return `<span class="k">${CMP_LABEL[x.stat]}</span><span class="a">${x.from ? cmpNum(x.stat, x.from) : "—"}</span><span class="b">${x.to ? cmpNum(x.stat, x.to) : "—"}</span><span class="d ${z ? "z" : x.diff > 0 ? "p" : "n"}">${z ? "—" : cmpDelta(x.stat, x.diff)}</span>`; }).join("")}
          ${c.keywords.map(k => `<span class="k">${cap(k.label)}</span><span class="a">${k.sign < 0 ? "✓" : "—"}</span><span class="b">${k.sign >= 0 ? "✓" : "—"}</span><span class="d ${k.sign > 0 ? "p" : k.sign < 0 ? "n" : "z"}">${k.sign > 0 ? "new" : k.sign < 0 ? "lost" : "—"}</span>`).join("")}
        </div>` : "";
      return `<div class="cp-item ${isOpen ? "open" : ""}">
        <div class="cp-irow">${gearIconImg(it, 26)}<span class="it">${itemName(it)}<br><small>${it.d}</small></span>
          <span class="cp-vd ${c.verdict}">${VD_TEXT[c.verdict]}</span></div>
        <div class="cp-cmpline"><span class="cp-dl">${isNew ? "empty slot" : "vs equipped"}</span>${statChips}${kwChips}
          ${isNew ? "" : `<span class="cp-cmpx" data-cmp="${i}">${isOpen ? "hide ▲" : "compare ▾"}</span>`}
          <button class="cp-btn" data-eq="${i}" style="${isNew ? "margin-left:auto" : "margin-left:6px"}">Equip</button></div>
        ${grid}</div>`;
    };

    // Attribute point-buy — main hero only (ctx.points supplied). Draft with +/−, then Confirm.
    const attrSection = () => {
      if (!ctx.points) return "";
      const avail = ctx.points();
      const remaining = avail - draftSum();          // draft>0 spends, draft<0 refunds
      const dirty = ASSIGNABLE.some(k => draft[k] !== 0);
      const dval = k => k === "hp" ? D.maxhp : D[k];  // D already includes committed points
      const arow = k => {
        // − only pulls back points added in THIS uncommitted draft — committed stats can't be refunded
        const canAdd = remaining > 0, canSub = draft[k] > 0;
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
    // Potion belt — the equipped consumable + the shared stash you can load from.
    const potionBlock = () => {
      const P = ctx.potion; if (!P) return "";
      const eq = P.equipped(), stash = P.stash();
      const slot = eq && eq.qty > 0
        ? `<div class="cp-slot" style="cursor:default">${flaskSvg(POTION_BY_ID[eq.type].color, 24)}<span class="it"><b>${potionName(eq.type, eq.size)}</b> <span style="color:#9ad1ff">×${eq.qty}</span><br><small>${potionEffectText(eq.type, eq.size)}</small></span><button class="cp-btn off" data-punequip>✕</button></div>`
        : `<div class="cp-slot" style="cursor:default"><span class="it cp-empty">— no potion equipped —</span></div>`;
      const stackRow = (s, i) => `<div class="cp-item"><div class="cp-irow">${flaskSvg(POTION_BY_ID[s.type].color, 24)}<span class="it"><b>${potionName(s.type, s.size)}</b> <span style="color:#9ad1ff">×${s.qty}</span><br><small>${potionEffectText(s.type, s.size)} · ${POTION_BY_ID[s.type].cd}s cd</small></span><button class="cp-btn" data-pequip="${i}">Equip</button></div></div>`;
      return `<div class="cp-sec"><span>Potion Belt</span><span class="hint">auto-quaffed in battle on a cooldown</span></div>
        ${slot}
        <div class="cp-sec"><span>Potions${stash.length ? "" : " — none"}</span></div>
        ${stash.length ? stash.map(stackRow).join("") : `<div class="cp-none">Buy at the Shop's Potions tab, or find them as loot.</div>`}`;
    };
    const equipBlock = preview
      ? `<div class="cp-sec"><span>Equipped</span></div>
        ${SLOTS.map(slotRow).join("")}
        <div class="cp-none">Preview — hire ${hero.name} to manage their gear.</div>`
      : `
      <div class="cp-sec"><span>Equipped</span><span class="hint">tap a slot to filter the bag</span></div>
      ${SLOTS.map(slotRow).join("")}
      <div class="cp-sec"><span>Bag${filterSlot ? ` — ${cap(filterSlot)}` : ""}${others > 0 && !filterSlot ? ` · ${others} for other heroes` : ""}</span>${filterSlot ? `<span class="cp-clear" data-clear="1">show all ✕</span>` : ""}</div>
      ${usable.length ? usable.map(it => itemRow(it, ctx.inventory.indexOf(it))).join("")
                      : `<div class="cp-none">${filterSlot ? "No " + cap(filterSlot) + " items in the bag." : "No items " + hero.name + " can equip yet — fight to find loot."}</div>`}`;

    // Skills tree (main hero only). A talent-grid of icon nodes — columns are branches (via the
    // sub-tabs), rows are gated tiers. Tapping a node opens a center-screen detail modal (skModalHtml)
    // where you Learn ranks into a draft; Confirm commits (a paid reset wipes the tree).
    const sk = ctx.skills;
    let skCommitted, skDraftN, skRank, skDraftSum, skInvested, skUnlocked, skCommittedTotal, skAvail;
    if (sk) {
      const R = sk.ranks();
      skCommitted = id => R[id] || 0;
      skDraftN = id => skillDraft[id] || 0;
      skRank = id => skCommitted(id) + skDraftN(id);                      // points 0..25 (committed + pending)
      skDraftSum = () => { let n = 0; for (const k in skillDraft) n += skillDraft[k]; return n; };
      skInvested = br => sk.tree[br].skills.reduce((n, s) => n + skRank(s.id), 0);
      skUnlocked = (br, tier) => skInvested(br) >= sk.gates[tier];
      skCommittedTotal = Object.values(R).reduce((a, b) => a + b, 0);
      skAvail = () => sk.points() - skDraftSum();
    }

    const skillsBlock = () => {
      if (!sk) return "";
      const gridBranch = (br) => {
        const b = sk.tree[br]; let rows = "";
        for (let t = 1; t <= 5; t++) {
          const un = skUnlocked(br, t), skills = b.skills.filter(s => s.tier === t);
          const gate = t > 1 ? `<span class="sk-gate ${un ? "ok" : ""}">${un ? "✓" : skIcon("lock", 10)} ${sk.gates[t]} pts</span>` : "";
          const nodes = skills.map(s => {
            const committed = skCommitted(s.id), r = skRank(s.id), pend = r - committed, rank = r > 0 ? starTier(r) : 0;
            const st = !un ? "lk" : (r > 0 ? "on" : "");
            return `<button class="sk-node ${st} ${br} ${skillOpen === s.id ? "open" : ""}" data-sk-open="${s.id}">
              <span class="sk-ic">${skIcon(glyphFor(s), 26)}
                ${r > 0 ? `<span class="sk-rk">${rank}★</span>` : ""}${pend > 0 ? `<span class="sk-pd">+${pend}</span>` : ""}
                <span class="sk-badge ${s.type[0]}">${s.type === "active" ? "◆" : "○"}</span></span>
              <span class="sk-nm">${s.name}</span>
              ${starsHtml(r, 10)}</button>`;
          }).join("");
          rows += `<div class="sk-tier ${un ? "" : "lk"} ${t === 5 ? "cap" : ""}">
            <div class="sk-tl"><span>${t === 5 ? "Capstone" : "Tier " + t}</span>${gate}</div>
            <div class="sk-trow">${nodes}</div></div>`;
        }
        return `<div class="sk-grid ${br}">${rows}</div>`;
      };

      const off = sk.tree.off, def = sk.tree.def, cost = sk.resetCost();
      const dirty = skDraftSum() > 0, avail = skAvail();
      const canReset = skCommittedTotal > 0 && sk.silver() >= cost;
      const footer = dirty
        ? `<div class="cp-pts-act" style="margin-top:8px">
             <button class="cp-reset" data-sk-discard>Discard</button>
             <button class="cp-confirm" data-sk-commit>Confirm ${skDraftSum()} pt${skDraftSum() > 1 ? "s" : ""}</button></div>`
        : skCommittedTotal > 0
          ? `<div class="cp-pts-act" style="margin-top:8px"><button class="cp-respec ${skillResetArm ? "arm" : ""}" data-sk-reset ${canReset ? "" : "disabled"}>
             ${skillResetArm ? `Tap again to reset · ${iconImg("coin", 11)} ${cost}` : `Reset tree · ${iconImg("coin", 11)} ${cost}`}</button></div>`
          : "";

      return `<div class="cp-pts" style="margin-bottom:11px"><div class="cp-pts-h"><span>Skill points</span><span class="av ${avail ? "" : "none"}">${avail}</span></div>
        <div class="skhint">Tap a skill to read it and learn a rank · resetting the tree costs silver</div></div>
        <div class="cp-subtabs">
          <button class="cp-subtab off ${skillBranch === "off" ? "sel" : ""}" data-branch="off">Offensive<b>${off.name}</b><span>${skInvested("off")} pts</span></button>
          <button class="cp-subtab def ${skillBranch === "def" ? "sel" : ""}" data-branch="def">Defensive<b>${def.name}</b><span>${skInvested("def")} pts</span></button>
        </div>
        ${gridBranch(skillBranch)}
        ${footer}`;
    };

    // Center-screen detail modal for the tapped skill node (rendered as a sibling of .cpanel).
    const skModalHtml = () => {
      if (!sk || !skillOpen) return "";
      let s = null, br = null;
      for (const bb of ["off", "def"]) { const f = sk.tree[bb].skills.find(x => x.id === skillOpen); if (f) { s = f; br = bb; } }
      if (!s) return "";
      const bname = sk.tree[br].name;
      const committed = skCommitted(s.id), r = skRank(s.id), pend = r - committed, rank = r > 0 ? starTier(r) : 0;
      const un = skUnlocked(br, s.tier), maxed = r >= sk.maxRank;
      const ladder = s.text.map((tx, i) => { const rk = i + 1;
        const cls = rk < rank ? "done" : rk === rank ? "cur" : rk === rank + 1 ? "next" : "";
        return `<div class="skm-rung ${cls}"><span class="rk">${rk}★</span><span class="rx">${tx || "—"}</span></div>`;
      }).join("");
      let action;
      if (!un) action = `<div class="skm-lock">${skIcon("lock", 13)} Locked — invest <b>${sk.gates[s.tier]}</b> in ${bname} to unlock ${s.tier === 5 ? "the Capstone" : "Tier " + s.tier} <span>(${skInvested(br)} now)</span></div>`;
      else if (maxed) action = `<div class="skm-max">★ Mastered — 5 / 5 stars</div>`;
      else {
        const canAdd = skAvail() > 0, nextTxt = s.text[starTier(r + 1) - 1] || "";
        action = `<button class="skm-learn ${canAdd ? "" : "no"}" data-sk-inc="${s.id}" ${canAdd ? "" : "disabled"}>
          ${canAdd ? "Learn" : "No points to spend"}${canAdd && nextTxt ? ` <small>+1 pt → ${nextTxt}</small>` : ""}</button>`;
      }
      const undo = skDraftN(s.id) > 0 ? `<button class="skm-undo" data-sk-dec="${s.id}">− Undo pending point</button>` : "";
      const dirty = skDraftSum() > 0;
      const draftBar = dirty
        ? `<div class="skm-draft"><span>${skDraftSum()} pt${skDraftSum() > 1 ? "s" : ""} pending</span>
             <span class="skm-dbtns"><button class="skm-disc" data-sk-discard>Discard</button><button class="skm-conf" data-sk-commit>Confirm</button></span></div>` : "";
      return `<div class="skm-back" data-skm-back>
        <div class="skm ${br}" role="dialog" aria-modal="true">
          <button class="skm-x" data-skm-close aria-label="Close">✕</button>
          <div class="skm-hd">
            <span class="skm-ic ${un ? br : "lk"}">${skIcon(glyphFor(s), 30)}</span>
            <div class="skm-tags"><span class="tg ${br}">${bname}</span><span class="tg tr">${s.tier === 5 ? "Capstone" : "Tier " + s.tier}</span><span class="tg ty">${s.type === "active" ? "Active" : "Passive"}</span></div>
            <div class="skm-nm">${s.name}</div>
            <div class="skm-de">${s.desc}</div>
            <div class="skm-st">${starsHtml(r, 15)}<span class="lb">${rank} / 5 ★ <small>· ${r}/${sk.maxRank} pts${pend > 0 ? ` (+${pend})` : ""}</small></span></div>
          </div>
          <div class="skm-bd"><div class="skm-sec">Rank ladder</div><div class="skm-lad">${ladder}</div></div>
          <div class="skm-ft">${action}${undo}${draftBar}</div>
        </div></div>`;
    };

    // Read-only kit for companions (their skills are a fixed, seed-rolled loadout).
    // Tap a skill to expand its description + the effect at its current star tier.
    const kitSection = () => {
      const kit = heroKit(hero); if (!kit.length) return "";
      const na = kit.filter(k => k.type === "active").length, np = kit.filter(k => k.type === "passive").length;
      const row = k => {
        const def = skillDef(hero.cls, k.id), open = kitOpen === k.id;
        const eff = def ? (def.text[k.stars - 1] || def.text[0]) : "";
        return `<div class="cp-kit ${k.br} ${open ? "open" : ""}" data-kit="${k.id}">
          <div class="cp-kit-h">
            <span class="stype ${k.type[0]}">${k.type === "active" ? "Active" : "Passive"}</span>
            <span class="kn">${k.name}</span>
            ${starsHtml(k.points, 13)}<span class="kr">${starLabel(k.points)}</span>
            <span class="cp-kit-caret">${open ? "▾" : "▸"}</span>
          </div>
          ${open ? `<div class="cp-kit-d">${def ? `<span class="kd">${def.desc}</span>` : ""}<span class="ke">${eff} · ${k.stars}/5★</span></div>` : ""}
        </div>`;
      };
      return `<div class="cp-sec"><span>Skills</span><span class="hint">${na} active · ${np} passive · tap to read</span></div>
        ${kit.map(row).join("")}`;
    };

    // A gold dot flags a tab (and character tile) with points waiting to be spent. Reflects points
    // still unspent AFTER the current draft, so it clears as you allocate — before you even Confirm.
    const skillDraftTotal = () => { let n = 0; for (const k in skillDraft) n += skillDraft[k]; return n; };
    const statDot = ctx.points && (ctx.points() - draftSum()) > 0 ? `<span class="cp-dot"></span>` : "";
    const skillDot = ctx.skills && (ctx.skills.points() - skillDraftTotal()) > 0 ? `<span class="cp-dot"></span>` : "";

    // Tabs. Main hero: Stats / Skills / Gear / Potions. Companion: Stats & Skills / Gear / Potions.
    const hasPot = !!ctx.potion;
    const potTab = hasPot ? `<button class="cp-tab ${tab === "potions" ? "sel" : ""}" data-tab="potions">Potions</button>` : "";
    let body;
    if (ctx.isMain) {
      const paneFor = t => t === "stats" ? statsBlock : t === "skills" ? skillsBlock() : t === "potions" ? potionBlock() : equipBlock;
      body = `<div class="cp-tabs">
           <button class="cp-tab ${tab === "stats" ? "sel" : ""}" data-tab="stats">Stats${statDot}</button>
           ${ctx.skills ? `<button class="cp-tab ${tab === "skills" ? "sel" : ""}" data-tab="skills">Skills${skillDot}</button>` : ""}
           <button class="cp-tab ${tab === "equip" ? "sel" : ""}" data-tab="equip">Gear</button>
           ${potTab}
         </div>${paneFor(tab)}`;
    } else {
      const ct = tab === "equip" ? "equip" : tab === "potions" ? "potions" : "stats";
      const pend = ctx.pendRolls ? ctx.pendRolls() : 0;  // queued level-up rolls
      const rollDot = pend > 0 ? `<span class="cp-dot roll"></span>` : "";
      const rollCta = pend > 0
        ? `<button class="cp-rollcta" data-openroll>${iconImg("spark", 14)} Level-Up Roll ${pend > 1 ? `<small>· ${pend} pending</small>` : ""} — Roll!</button>` : "";
      const cPane = ct === "equip" ? equipBlock : ct === "potions" ? potionBlock() : rollCta + statsBlock + kitSection();
      body = `<div class="cp-tabs">
           <button class="cp-tab ${ct === "stats" ? "sel" : ""}" data-tab="stats">Stats &amp; Skills${rollDot}</button>
           <button class="cp-tab ${ct === "equip" ? "sel" : ""}" data-tab="equip">Gear</button>
           ${potTab}
         </div>${cPane}`;
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
    </div>${ctx.isMain && tab === "skills" ? skModalHtml() : ""}`;

    const panel = overlay.querySelector(".cpanel"); if (panel) panel.scrollTop = prevScroll;
    overlay.querySelector(".cp-head canvas").getContext("2d").drawImage(ctx.portrait, 0, 0, 96, 96);
    overlay.querySelector("[data-close]").onclick = () => { overlay.classList.remove("show"); ctx.close(); };
    const orb = overlay.querySelector("[data-openroll]"); if (orb && ctx.openRoll) orb.onclick = () => ctx.openRoll();
    overlay.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => { tab = b.getAttribute("data-tab"); keepScroll = false; skillOpen = null; render(); });
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
    overlay.querySelectorAll("[data-cmp]").forEach(b => b.onclick = () => {
      const it = ctx.inventory[+b.getAttribute("data-cmp")];
      if (it) { expandedCmp.has(it) ? expandedCmp.delete(it) : expandedCmp.add(it); render(); }
    });
    const pun = overlay.querySelector("[data-punequip]"); if (pun && ctx.potion) pun.onclick = () => { ctx.potion.unequip(); render(); };
    overlay.querySelectorAll("[data-pequip]").forEach(b => b.onclick = () => {
      const s = ctx.potion && ctx.potion.stash()[+b.getAttribute("data-pequip")];
      if (s) { ctx.potion.equip(s); render(); }
    });
    // attribute point-buy: draft with +/−, Reset discards, Confirm commits via ctx.assign
    overlay.querySelectorAll("[data-inc]").forEach(b => b.onclick = () => {
      const k = b.getAttribute("data-inc");
      if (ctx.points() - draftSum() > 0) { draft[k]++; render(); }
    });
    overlay.querySelectorAll("[data-dec]").forEach(b => b.onclick = () => {
      const k = b.getAttribute("data-dec");
      if (draft[k] > 0) { draft[k]--; render(); }   // only remove points added this draft, never committed
    });
    // companion kit: tap a skill to expand/collapse its description + effect
    overlay.querySelectorAll("[data-kit]").forEach(el => el.onclick = () => {
      const id = el.getAttribute("data-kit"); kitOpen = kitOpen === id ? null : id; render();
    });
    // skill tree: sub-tab, draft +/-, then Confirm to commit; Reset (paid) is a two-tap
    overlay.querySelectorAll("[data-branch]").forEach(b => b.onclick = () => { skillBranch = b.getAttribute("data-branch"); skillResetArm = false; skillOpen = null; render(); });
    // open a node's center detail modal
    overlay.querySelectorAll("[data-sk-open]").forEach(b => b.onclick = () => { skillOpen = b.getAttribute("data-sk-open"); skillResetArm = false; render(); });
    // close the modal (✕ or a click on the backdrop itself)
    const skmClose = () => { skillOpen = null; render(); };
    const skmX = overlay.querySelector("[data-skm-close]"); if (skmX) skmX.onclick = skmClose;
    const skmBack = overlay.querySelector("[data-skm-back]"); if (skmBack) skmBack.onclick = e => { if (e.target === skmBack) skmClose(); };
    // Learn (+1) / Undo (−1) draft, from within the modal
    overlay.querySelectorAll("[data-sk-inc]").forEach(b => b.onclick = () => {
      const id = b.getAttribute("data-sk-inc"); if (skAvail && skAvail() > 0) { skillDraft[id] = (skillDraft[id] || 0) + 1; skillResetArm = false; render(); }
    });
    overlay.querySelectorAll("[data-sk-dec]").forEach(b => b.onclick = () => {
      const id = b.getAttribute("data-sk-dec"); if (skillDraft[id] > 0) { skillDraft[id]--; if (!skillDraft[id]) delete skillDraft[id]; } render();
    });
    const skCommit = overlay.querySelector("[data-sk-commit]"); if (skCommit) skCommit.onclick = () => {
      if (ctx.skills && ctx.skills.commit({ ...skillDraft })) { for (const k in skillDraft) delete skillDraft[k]; skillOpen = null; ctx.refresh && ctx.refresh(); render(["good", "Skills learned."]); }
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
