import { clamp, ell, T, CW, CH, drawPartPx, mulberry32 } from './engine/core.js';
import { makeHeroPortrait } from './engine/portraits.js';
import { buildFigure } from './engine/creatures.js';
import { iconImg, iconCanvas } from './engine/icons.js';
import { fxUpdateDraw, fxClear, fxText, fxSlash, fxBolt, fxDissolve, fxRing, fxBlock } from './engine/fx.js';
import { GCOLS, GROWS, buildGameRoom, cx0g, cy0g, isBlocked } from './engine/dungeon.js';
import { xpToReach } from './engine/combat.js';
import { DUNGEONS, LAYOUTS, ROOM_COUNT, BOSS_ROOM, dungeonById, isUnlocked, nextDungeon } from './data/dungeons.js';
import { unspentPoints, earnedPoints, pointsForLevel, ASSIGNABLE, emptyPoints, STAT_STEP } from './systems/Leveling.js';
import { combatMods, activeSkills, unspentSkillPoints, earnedSkillPoints, spentSkillPoints, branchInvested, tierUnlocked, rankOf, allSkills,
         reflectFrac, guardianFrac, waveHealFrac, lastStand, momentum, heroKit } from './systems/Skills.js';
import { CLASS_SKILLS, TIER_GATES, MAX_POINTS, PTS_PER_STAR } from './data/skills.js';
import { BAL } from './data/balance.js';
import { derive, mitigate } from './systems/StatEngine.js';
import { resolveAttack } from './systems/CombatSim.js';
import { generate, generateRoll, describeItem } from './systems/LootGenerator.js';
import { openLootRoll } from './ui/LootRoll.js';
import { upgrade as forgeUpgrade, canUpgrade, forgePreview, forgeCost } from './systems/ForgeSystem.js';
import { priceOf, sellPriceOf } from './systems/Economy.js';
import { hasGearHint } from './systems/Equipment.js';
import { openCharacter } from './ui/CharacterPanel.js';
import { openTown, openPartyRoster } from './ui/TownScreen.js';
import { openShop } from './ui/ShopScreen.js';
import { openTavern } from './ui/TavernScreen.js';
import { openTemple } from './ui/TempleScreen.js';
import { openForge } from './ui/ForgeScreen.js';
import { openDiag } from './ui/DiagScreen.js';
import { startOnboarding } from './ui/Onboarding.js';
import { makeCompanion, makeEnemy } from './models/units.js';
import { openDungeonSelect } from './ui/DungeonSelect.js';
import { openCompanionRoll } from './ui/CompanionLevelUp.js';
import { POTION_BY_ID, POTION_CAP, potionEffect, potionCost, potionSell, rollLootPotion } from './data/potions.js';
import { potionTileChip, ensurePotChipCss, setPotRing, flashPotBox } from './ui/potionChip.js';
import { readSlot, writeSlot, SAVE_VERSION } from './state/save.js';
import { installDiag, diag, diagText, APP_BUILD } from './engine/diag.js';
installDiag(); // start capturing console errors / uncaught exceptions immediately
/* Surface caught glitches instead of failing silently: a throttled toast points the player at the
   Diagnostics export so any future issue is reportable rather than invisible. */
{ let lastToast=0, toastEl=null, toastTimer=0;
  const showToast=msg=>{ const now=performance.now(); if(now-lastToast<8000) return; lastToast=now;
    if(!toastEl){ toastEl=document.createElement("div"); toastEl.id="toast";
      toastEl.style.cssText="position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:40;"
        +"max-width:90%;background:#2a1420;color:#ffd7cf;border:1px solid #7a3a3a;border-radius:10px;"
        +"padding:9px 13px;font:12px Georgia,serif;box-shadow:0 4px 16px #000;text-align:center;"
        +"opacity:0;transition:opacity .35s"; document.body.appendChild(toastEl); }
    toastEl.textContent=msg; toastEl.style.opacity="1";
    clearTimeout(toastTimer); toastTimer=setTimeout(()=>{ toastEl.style.opacity="0"; },5200); };
  window.addEventListener("error", ()=>showToast("A glitch was caught & logged — open the Keep › Diagnostics to copy it."));
}
/* ============ DP ENGINE :: game.js — endless auto-battle loop ============ */
"use strict";
const cvG=document.getElementById("cv"), G=cvG.getContext("2d");
const logEl=document.getElementById("log"), partyEl=document.getElementById("party"),
      overlay=document.getElementById("overlay"),
      dheadEl=document.getElementById("dhead"),
      dtoastEl=document.getElementById("dtoast"), townEl=document.getElementById("town"),
      dmenufab=document.getElementById("dmenufab"), dlogov=document.getElementById("dlogov"),
      dmenuEl=document.getElementById("dmenu");
/* combat log is a pop-up opened from the game menu (which itself opens from the floating ☰ button) */
function openDLog(){ closeDMenu(); dlogov.classList.add("show"); logEl.scrollTop=logEl.scrollHeight; }
function closeDLog(){ dlogov.classList.remove("show"); }
dmenufab.onclick=()=>openDMenu();
dlogov.querySelectorAll("[data-dclose]").forEach(x=>x.onclick=closeDLog);
/* phase: idle → fight ⇄ paused. inventory holds dropped loot; respawn/revive are timers. */
const state={ roomIdx:0, scene:"town", phase:"idle", room:null, foes:[], t:0, speed:1,
  inventory:[], potions:[], gems:0, silver:0, shopStock:[], recruits:[], bench:[], respawnAt:null, wipeAt:null,
  dungeonId:"emberdeep", cleared:[], roomMax:0,   // active dungeon + set of cleared-boss ids (persisted) + furthest room reached this delve
  bossAt:null, bossInWave:false,       // when the boss may next appear (runtime) + is it on the field now
  autoLevel:false,   // when true, companion level-ups resolve their own free roll (no popup, no silver)
  rally:null };      // {r,c} flag heroes regroup on when no foe is engaged
/* the dungeon the party is currently delving (falls back to the Emberdeep) */
const activeDungeon=()=>dungeonById(state.dungeonId);
/* Combatants are DERIVED, never a synced parallel array: the living heroes come straight from
   `party` (the roster's source of truth) and the enemies from `state.foes`. This makes a whole
   bug class impossible — a hired/resurrected pal is a combatant simply by being alive in `party`,
   and a dead hero leaves combat simply by being `!alive` (it is never pruned from anywhere). */
const liveHeroes=()=>party.filter(h=>h.alive);
const liveFoes=()=>state.foes.filter(f=>f.alive);
const liveUnits=()=>{ const a=[]; for(const h of party) if(h.alive) a.push(h);
  for(const f of state.foes) if(f.alive) a.push(f); return a; };
/* The dungeon freezes while the character/gear panel is open. We derive that from whether the
   overlay is actually on-screen (a single source of truth) rather than a separate boolean —
   so the freeze can never get "stuck" if the overlay is dismissed by any path. */
let uiFrozen=false;
const panelShown=()=>overlay.classList.contains("show");
let heroPanelOpen=false;    // a character sheet (or its level-up roll) owns the overlay — loot must wait, never override it
let party=[];               // filled by onboarding: [main, ...companions]
const PARTY_CAP=3;          // main + 2 companions ("two companions only"); Tavern replaces the fallen
/* true when the MAIN hero has unspent level-up or skill points waiting — drives the "spend me" dot on
   character tiles. Only the main allocates, so companions never flag (they'd otherwise read earned>spent). */
const heroHasPoints = h => h===party[0] && (unspentPoints(h) > 0 || unspentSkillPoints(h) > 0);
/* a companion with unresolved level-up rolls waiting */
const heroHasRoll = h => h!==party[0] && (h.pendRolls||0) > 0;
/* what "attention" indicator a hero's tile should show: gold point-dot, green roll-dot, or none */
const heroTileFlag = h => heroHasPoints(h) ? "points" : heroHasRoll(h) ? "roll" : null;
/* whichever screen currently owns #town re-renders itself here, so spending points/gear from the
   character panel updates the portrait tiles (and their point-dots) underneath in realtime. */
let townRefresh = null;
function refreshParty(){ renderParty(); if(state.scene==="town" && townRefresh) townRefresh(); }
/* ---------- persistence: one of three save slots ---------- */
let activeSlot=null;        // which save slot this run writes to (set by onboarding)
function snapshotState(){
  return { v:SAVE_VERSION, party, bench:state.bench, silver:state.silver, gems:state.gems,
    inventory:state.inventory, potions:state.potions, roomIdx:state.roomIdx,
    dungeonId:state.dungeonId, cleared:state.cleared, roomMax:state.roomMax, autoLevel:state.autoLevel,
    savedAt:new Date().toISOString() };
}
function saveGame(){ if(activeSlot!==null) writeSlot(activeSlot, snapshotState()); }
function loadGame(save){
  party=(save.party||[]).map(h=>({alive:true, pts:emptyPoints(), skills:{}, potion:null, ...h}));   // defaults for older saves
  state.bench=(save.bench||[]).map(h=>({alive:true, pts:emptyPoints(), skills:{}, potion:null, ...h})); // benched reserves (keep gear)
  state.silver=save.silver||0; state.gems=save.gems||0;
  state.inventory=save.inventory||[]; state.potions=save.potions||[]; state.roomIdx=save.roomIdx||0;
  state.dungeonId=dungeonById(save.dungeonId).id;    // older saves default to the Emberdeep
  state.cleared=Array.isArray(save.cleared)?save.cleared.slice():[];
  state.roomMax=Math.max(save.roomMax||0, state.roomIdx||0);   // reached rooms are jumpable on the minimap
  state.autoLevel=!!save.autoLevel;                            // per-save preference (off for older saves)
}
const partyClasses=()=>party.length?[...new Set(party.map(h=>h.cls))]:["fighter","mage","cleric","rogue"];
let combatRng=Math.random;  // reseeded deterministically when a fight starts / area changes
/* currency readout lives in the slim dungeon header (rebuilt on each header render) */
function updateHud(){ const c=dheadEl.querySelector(".dh-cur");
  if(c) c.innerHTML=`${iconImg("coin",12)} ${state.silver}&nbsp;&nbsp;${iconImg("gem",12)} ${state.gems}`; }
const FIGCACHE={}, PORTCACHE={}, TILECACHE={}, HEROPORT={};
/* per-hero portrait bust, cached by the hero's portrait seed (rolled at creation) */
function heroPortrait(h){
  const k=h.cls+":"+h.portraitSeed;
  if(!HEROPORT[k]) HEROPORT[k]=makeHeroPortrait(h.cls,h.portraitSeed).canvas;
  return HEROPORT[k];
}
function figOf(u){
  const key=(u.cls||u.fig)+":"+u.figSeed;
  if(!FIGCACHE[key]) FIGCACHE[key]=buildFigure(u.cls||u.fig,u.figSeed);
  return FIGCACHE[key];
}
/* portrait source for a unit: heroes use their generated bust; NPCs get a
   head-crop of their full-body figure, re-centered into a 96 portrait canvas. */
function portOf(u){
  const key=(u.cls||u.fig)+":"+u.figSeed;
  if(PORTCACHE[key]) return PORTCACHE[key];
  let src;
  if(u.team===0){ src=heroPortrait(u); }
  else{
    // Fit the WHOLE standing figure into the tile. Creatures vary far too much for one humanoid
    // head-crop — rats are low, wide and left-headed (the old crop cut their heads off), while
    // dragons are tall and winged. The figure is 384×384 (creature drawn in 96-space @4×,
    // standing on y≈86); source [24,44]→336² captures head-top through ground for every creature.
    const fig=figOf(u);
    const c=document.createElement("canvas"); c.width=c.height=96;
    const g=c.getContext("2d");
    g.drawImage(fig, 24,44, 336,336, 4,4, 88,88);
    src=c;
  }
  PORTCACHE[key]=src; return src;
}
/* frame palettes */
const FRAME={
  gold:{o:"#3a2405",c1:"#ffe08a",c2:"#c9862a",gem:"#ffd166",glow:"rgba(255,209,102,.5)"},
  blue:{o:"#101a3a",c1:"#7aa8ff",c2:"#2a4aa8",gem:"#9ad1ff",glow:"rgba(90,140,255,.4)"},
  boss:{o:"#2a0808",c1:"#ff9a5a",c2:"#b8321e",gem:"#ffdf6b",glow:"rgba(255,110,60,.55)"},
};
function rrp(g,x,y,w,h,r){ g.beginPath();
  g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r);
  g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); }
/* bake a static framed tile (no HP/level — those draw live over it) */
function tileOf(u){
  const key=(u.cls||u.fig)+":"+u.figSeed+(u.boss?":b":"");
  if(TILECACHE[key]) return TILECACHE[key];
  const S=u.boss?Math.round(T*1.28):Math.round(T*0.92), c=document.createElement("canvas");
  c.width=c.height=S*2; const g=c.getContext("2d"); g.scale(2,2);
  const pal=u.boss?FRAME.boss:(u.team===0?FRAME.gold:FRAME.blue);
  const r=S*0.16, bw=Math.max(3,S*0.08);
  // backing
  g.fillStyle=pal.o; rrp(g,1,1,S-2,S-2,r); g.fill();
  // portrait clipped
  g.save(); rrp(g,bw*0.7,bw*0.7,S-bw*1.4,S-bw*1.4,r*0.8); g.clip();
  g.drawImage(portOf(u), bw*0.3,bw*0.1, S-bw*0.6, S-bw*0.2);
  // inner shade for depth
  const ish=g.createLinearGradient(0,0,0,S);
  ish.addColorStop(0,"rgba(255,255,255,.06)"); ish.addColorStop(1,"rgba(6,4,10,.4)");
  g.fillStyle=ish; g.fillRect(0,0,S,S);
  g.restore();
  // frame band
  const fg=g.createLinearGradient(0,0,0,S); fg.addColorStop(0,pal.c1); fg.addColorStop(1,pal.c2);
  g.strokeStyle=fg; g.lineWidth=bw; rrp(g,bw/2+1,bw/2+1,S-bw-2,S-bw-2,r); g.stroke();
  g.strokeStyle=pal.o; g.lineWidth=1.5; rrp(g,1,1,S-2,S-2,r+1); g.stroke();
  g.lineWidth=1; rrp(g,bw+1,bw+1,S-bw*2-2,S-bw*2-2,r*0.7); g.stroke();
  // edge diamonds
  const gem=(gx,gy)=>{ const s=S*0.07; g.save(); g.translate(gx,gy); g.rotate(Math.PI/4);
    g.fillStyle=pal.gem; g.fillRect(-s,-s,s*2,s*2);
    g.strokeStyle=pal.o; g.lineWidth=1; g.strokeRect(-s,-s,s*2,s*2); g.restore(); };
  gem(S/2,bw/2+1); gem(S/2,S-bw/2-1); gem(bw/2+1,S/2); gem(S-bw/2-1,S/2);
  // role icon medallion (top-right) — procedural sprite, not emoji
  const medal={fighter:"sword",mage:"spark",cleric:"cross",rogue:"dagger",rat:"fang",goblin:"fang",
    kobold:"fang",skeleton:"skull",wight:"skull",dragon:"star"};
  const mname=medal[u.cls||u.fig]||"sword", ir=S*0.15;
  g.fillStyle=pal.o; g.beginPath(); g.arc(S-ir*0.9,ir*0.9,ir,0,7); g.fill();
  g.strokeStyle=pal.c1; g.lineWidth=1.4; g.stroke();
  const isz=Math.round(ir*1.7);
  g.drawImage(iconCanvas(mname,isz*2), S-ir*0.9-isz/2, ir*0.9-isz/2, isz, isz);
  TILECACHE[key]={canvas:c,S,pal};
  return TILECACHE[key];
}
function log(msg,cls){ const p=document.createElement("div"); if(cls)p.className=cls; p.innerHTML=msg;
  logEl.appendChild(p); while(logEl.children.length>40)logEl.removeChild(logEl.firstChild);
  logEl.scrollTop=logEl.scrollHeight; }
/* display order for the party HUD: the MAIN hero sits in the middle, companions flank it
   (mirrors the combat formation) */
function hudOrder(){
  const others=party.slice(1), mid=Math.floor(party.length/2);
  return [...others.slice(0,mid), party[0], ...others.slice(mid)].filter(Boolean);
}
let potBoxes=[];   // {h, el} for each hero's HUD potion box — the loop drives their recharge rings live
function renderParty(){
  ensurePotChipCss();
  potBoxes=[];
  partyEl.innerHTML="";
  for(const h of hudOrder()){
    const D=derive(h), isMain=h===party[0];
    const c=document.createElement("div"); c.className="card"+(h.alive?"":" dead")+(isMain?" main":"");
    c.style.cursor="pointer"; c.title="Tap to view stats & gear";
    c.onclick=()=>openHero(h);
    const picWrap=document.createElement("div"); picWrap.className="picwrap";
    const img=document.createElement("canvas"); img.width=img.height=96; img.className="pic";
    img.getContext("2d").drawImage(heroPortrait(h),0,0,96,96);
    picWrap.appendChild(img);
    if(!h.alive){ const sk=document.createElement("div"); sk.className="skull"; sk.innerHTML=iconImg("skull",22); picWrap.appendChild(sk); }
    const flag = h.alive && heroTileFlag(h);
    if(flag){ const d=document.createElement("div");
      const col = flag==="roll" ? "#8fd39a" : "#e0b063";
      d.title = flag==="roll" ? "Level-up roll ready" : "Points to spend";
      d.style.cssText="position:absolute;top:-3px;right:-3px;width:12px;height:12px;border-radius:50%;"
        +`background:${col};border:2px solid #181128;box-shadow:0 0 6px ${col};z-index:3`; picWrap.appendChild(d); }
    const bag=Object.values(h.gear).filter(Boolean).length;
    const gearHint = h.alive && hasGearHint(h, state.inventory);   // bag holds an upgrade or an empty-slot fit
    const info=document.createElement("div");
    info.innerHTML=`${isMain?iconImg("crown",12)+" ":""}<b>${h.name}</b> <span class="lvl">Lv${h.level}</span> <span class="cls">${h.cls}</span><br>
      ${h.alive ? `<span style="opacity:.7">ATK ${D.atk} · DEF ${D.def}</span>
      <div class="bar"><i style="width:${clamp(h.hp/D.maxhp*100,0,100)}%"></i></div>
      ${h.hp}/${D.maxhp}<div class="gear">${bag} equipped · tap for gear ›${gearHint?`<span class="gear-up" title="An upgrade or new gear is waiting in the bag">▲</span>`:""}</div>`
        : `<span class="fallen">${iconImg("skull",11)} Fallen — restore at the Temple</span>`}`;
    // portrait column: portrait on top, the equipped-potion box below it
    const col=document.createElement("div"); col.style.cssText="display:flex;flex-direction:column;align-items:center;flex:0 0 auto";
    col.appendChild(picWrap);
    if(h.alive){ const pc=document.createElement("div"); pc.innerHTML=potionTileChip(h.potion);
      const boxEl=pc.firstElementChild; col.appendChild(boxEl); if(boxEl) potBoxes.push({h, el:boxEl}); }
    c.appendChild(col); c.appendChild(info); partyEl.appendChild(c);
  }
  tickPotionBoxes();   // set each ring to its current cooldown state right away (no ready→cooling flicker)
}
/* Drive the HUD potion boxes' recharge rings + cooldown timers from live combat state (called each
   frame while delving). Cheap: only sets stroke-dashoffset / a label / a class on existing nodes. */
function tickPotionBoxes(){
  for(const {h, el} of potBoxes){
    if(!el || !el.isConnected) continue;
    const p=h.potion; if(!p || p.qty<=0) continue;               // depleted boxes are rebuilt as "empty" by renderParty
    const cnt=el.querySelector(".potn"); if(cnt && cnt.textContent!==String(p.qty)) cnt.textContent=p.qty;
    const cdEnd=h.potCd||0, cdEl=el.querySelector(".potcd");
    if(state.t<cdEnd){
      const eff=potionEffect(p.type,p.size), frac=eff&&eff.cd?1-(cdEnd-state.t)/eff.cd:1;
      el.classList.add("cooling"); el.classList.remove("ready"); setPotRing(el,frac);
      if(cdEl) cdEl.textContent=Math.ceil(cdEnd-state.t)+"s";
    } else {
      el.classList.remove("cooling"); el.classList.add("ready"); setPotRing(el,1);
      if(cdEl && cdEl.textContent) cdEl.textContent="";
    }
  }
}
function flashHeroPot(u,color){ const b=potBoxes.find(x=>x.h===u); if(b) flashPotBox(b.el,color); }
const ease=k=>k*k*(3-2*k);
function uxS(u){ const k=(u.moveT===undefined)?1:ease(u.moveT);
  const c=(u.cc===undefined?u.c:u.cc)+((u.c)-(u.cc===undefined?u.c:u.cc))*k;
  return cx0g(0)+c*T+T/2; }
function uyS(u){ const k=(u.moveT===undefined)?1:ease(u.moveT);
  const r=(u.rr===undefined?u.r:u.rr)+((u.r)-(u.rr===undefined?u.r:u.rr))*k;
  return cy0g(0)+r*T+T/2; }

/* ---------- room, party placement, waves ---------- */
/* Form the living party up at the start line for the current room. Re-places all living heroes
   (unique start columns, nudged only off walls/foes), so hires and resurrections just work — a
   living party member is a combatant by definition; there's no roster/battlefield list to sync. */
function placeHeroes(){
  // Heroes form up on the room's entry platform (bottom-centre island of floor). The MAIN hero
  // takes the centre slot; companions flank. Any collision/blocked cell is nudged to a free floor
  // cell, so hires and resurrections just work — a living party member is a combatant by definition.
  const entry=(state.room&&state.room.entry&&state.room.entry.length)?state.room.entry:[[GROWS-2,4]];
  const mid=entry[Math.floor(entry.length/2)];
  const slots=[mid, entry[0], entry[entry.length-1], entry[1]||entry[0], entry[entry.length-2]||entry[0]];
  party.forEach((h,i)=>{ if(!h.alive) return; const s=slots[Math.min(i,slots.length-1)]; h.r=s[0]; h.c=s[1]; });
  const cells=(state.room&&state.room.floorCells)||[];
  party.forEach((h,i)=>{ if(!h.alive) return;
    let guard=0;
    while((isBlocked(state.room,h.r,h.c)||occupied(h.r,h.c,h))&&guard++<cells.length+2){
      const f=cells[(guard*7+i*13)%(cells.length||1)]; if(f){ h.r=f[0]; h.c=f[1]; } else break;
    }
    h.rr=h.r; h.cc=h.c; h.moveT=1; h.next=state.t+0.5+0.2*i; resetCombat(h); figOf(h);
  });
}
/* a random reachable floor cell (not blocked, not occupied). `pred(r,c)` optionally filters. */
function randFloor(pred){
  const cells=((state.room&&state.room.floorCells)||[])
    .filter(([r,c])=> !isBlocked(state.room,r,c) && !occupied(r,c) && (!pred||pred(r,c)));
  if(!cells.length) return null;
  const [r,c]=cells[Math.floor(combatRng()*cells.length)];
  return {r,c};
}
/* build one enemy from a composition token for the active dungeon at the given room depth */
function spawnFromToken(tok,d,idx){
  if(tok==="BOSS") return makeEnemy(d.boss.fig,{level:d.band[1], name:d.boss.name, boss:true, stats:BAL.BOSS_BASE, xp:BAL.BOSS_BASE.xp});
  const lvl=d.baseLevel+idx;                 // rooms ramp from the dungeon's base level down to the boss
  return makeEnemy(tok,{level:lvl, name:(d.roster&&d.roster[tok])||undefined});
}
/* Between boss kills the boss room fields a trash wave so it stays farmable (deep-level roster). */
const BOSS_FARM_COMP=["wight","skeleton","kobold","kobold","goblin"];
function spawnWave(){
  const d=activeDungeon(), idx=state.roomIdx, L=LAYOUTS[idx];
  // The boss only joins the wave when its timer is up; otherwise a trash pack keeps the room busy.
  let comp=L.comp;
  if(idx===BOSS_ROOM){
    const ready = state.bossAt===null || state.t>=state.bossAt;
    comp = ready ? L.comp : BOSS_FARM_COMP;
    state.bossInWave = ready;
  } else state.bossInWave=false;
  // NPCs appear on random reachable floor cells, kept off the hero line at the bottom when possible.
  // Enemy level scales with the dungeon's band, so the badge on each tile means something.
  comp.forEach((tok,i)=>{
    const cell=randFloor((r,c)=>r<=GROWS-4) || randFloor();
    if(!cell) return;
    const f=spawnFromToken(tok,d,idx);
    f.r=cell.r; f.c=cell.c; f.rr=f.r; f.cc=f.c; f.moveT=1; f.next=state.t+0.7+0.2*i;
    resetCombat(f);
    state.foes.push(f); figOf(f); });
}
function roomTitle(d,idx){
  return idx===BOSS_ROOM ? `${d.name} — ${d.boss.name}` : `${d.name} — ${LAYOUTS[idx].roomName}`;
}
function loadRoom(){
  const d=activeDungeon(), idx=state.roomIdx, L=LAYOUTS[idx];
  const spec={ title:roomTitle(d,idx), shape:L.shape, blockers:L.blockers,
    blockerKinds:L.blockerKinds, tiles:d.tiles||L.tiles, exits:L.exits, palette:d.palette };
  state.room=buildGameRoom((Date.now()+idx*7919)|0,spec);
  state.foes=[]; fxClear(); state.respawnAt=null; state.wipeAt=null; state.rally=null;
  state.bossInWave=false;   // re-determined by spawnWave; the boss RESPAWN timer (bossAt) persists across
                            // room hops so travelling the minimap never re-rolls it (set fresh in startDungeon)
  placeHeroes(); spawnWave();
  log(`— <span class="sys">${spec.title.split("— ")[1]}</span> —`);
}
function seedBattle(){ combatRng=mulberry32((((state.room&&state.room.seed)||1)^0x9e3779b9)>>>0); }

/* ---------- sim (continuous act-timer autobattle on the room grid) ---------- */
/* a unit's enemies are the *other* team, derived live from the two owners */
function livingFoes(team){ return team===0 ? liveFoes() : liveHeroes(); }
function distU(a,b){ return Math.abs(a.r-b.r)+Math.abs(a.c-b.c); }
function nearest(u){
  const foes=livingFoes(u.team);
  if(u.team===1){ const taunters=foes.filter(f=>hasBuff(f,"taunt"));   // Taunt forces enemies onto the tank
    if(taunters.length){ let b=null,bd=99; for(const f of taunters){ const d=distU(u,f); if(d<bd){bd=d;b=f;} } return b; } }
  let best=null,bd=99; for(const f of foes){ const dd=distU(u,f); if(dd<bd){bd=dd;best=f;} } return best; }
/* is a living unit (hero or foe) standing on this cell? `except` skips one unit (itself) */
function occupied(r,c,except){
  for(const h of party) if(h!==except&&h.alive&&h.r===r&&h.c===c) return true;
  for(const f of state.foes) if(f!==except&&f.alive&&f.r===r&&f.c===c) return true;
  return false;
}
/* free orthogonal neighbour cells (not walls, not occupied by another unit) */
function stepOpts(u){
  return [[1,0],[-1,0],[0,1],[0,-1]].map(([dr,dc])=>({r:u.r+dr,c:u.c+dc}))
    .filter(p=>!isBlocked(state.room,p.r,p.c)&&!occupied(p.r,p.c,u));
}
function moveTo(u,p){ u.rr=u.r; u.cc=u.c; u.r=p.r; u.c=p.c; u.moveT=0; } // remember prev cell for the slide
function stepToward(u,tg){
  const opts=stepOpts(u); if(!opts.length)return;
  opts.sort((a,b)=>(Math.abs(a.r-tg.r)+Math.abs(a.c-tg.c))-(Math.abs(b.r-tg.r)+Math.abs(b.c-tg.c)));
  moveTo(u,opts[0]);
}
/* kite: step to the neighbour that most increases distance from tg. Returns false if no cell is
   actually farther than where the unit stands (cornered) so the caller can fall back to attacking. */
function stepAway(u,tg){
  const opts=stepOpts(u); if(!opts.length)return false;
  opts.sort((a,b)=>(Math.abs(b.r-tg.r)+Math.abs(b.c-tg.c))-(Math.abs(a.r-tg.r)+Math.abs(a.c-tg.c)));
  if((Math.abs(opts[0].r-tg.r)+Math.abs(opts[0].c-tg.c))<=distU(u,tg)) return false;
  moveTo(u,opts[0]); return true;
}
/* ---------- skill runtime: timed buffs / debuffs / cooldowns (all units share this) ---------- */
function hasBuff(u,k){ return u.buffs && u.buffs.some(b=>b.k===k); }
function addBuff(u,b){ (u.buffs||(u.buffs=[])).push(b); }
function resetCombat(u){ u.buffs=[]; u.cd={}; u.mLast=0; u.potCd=0; }
function adjFoes(u){ return livingFoes(u.team).filter(f=>distU(f,u)<=1); }
function foesInRange(u,rad){ return livingFoes(u.team).filter(f=>distU(f,u)<=rad); }
function lowestHurtAlly(u,thr){ let best=null,bf=2;
  for(const h of party){ if(!h.alive)continue; const f=h.hp/Math.max(1,derive(h).maxhp); if(f<bf){bf=f;best=h;} }
  return (best && bf<(thr==null?0.999:thr))?best:null; }
function guardianNear(u){ for(const h of party){ if(h===u||!h.alive)continue;
  if(guardianFrac(h)>0 && distU(h,u)<=1) return h; } return null; }
function applyBleed(target,src,bl){
  const dps=Math.max(1, derive(src).atk*bl.pct);
  const cur=(target.buffs||[]).filter(b=>b.k==="bleed");
  if(cur.length>=bl.stacks){ cur.sort((a,b)=>a.until-b.until)[0].until=state.t+bl.dur; return; }
  addBuff(target,{k:"bleed",dps,src,until:state.t+bl.dur,nextTick:state.t+0.5});
}
function addMomentum(u,mo){
  const atkStacks=(u.buffs||[]).filter(b=>b.k==="mo"&&b.stat==="atk").length;
  if(atkStacks<mo.stacks){ addBuff(u,{k:"mo",mult:true,stat:"atk", v:mo.pct,until:state.t+mo.dur});
    addBuff(u,{k:"mo",mult:true,stat:"aspd",v:mo.pct,until:state.t+mo.dur}); }
  (u.buffs||[]).forEach(b=>{ if(b.k==="mo") b.until=state.t+mo.dur; });
  fxText(uxS(u),uyS(u)-40,"+momentum","#ff9a5c");
}
function tickBuffs(u){
  if(!u.buffs||!u.buffs.length) return;
  for(const b of u.buffs){
    if(b.k==="bleed" && u.alive && state.t>=b.nextTick){ b.nextTick+=0.5;
      hurt(u, Math.max(1,Math.round(b.dps*0.5)), b.src); }
    if(b.k==="regen" && u.alive && state.t>=b.nextTick){ b.nextTick+=0.5;   // potion heal-over-time
      const mh=derive(u).maxhp; u.hp=Math.min(mh, u.hp+Math.max(1,Math.round(b.hps*0.5)));
      if(u.team===0) renderParty(); } }
  u.buffs = u.buffs.filter(b=> b.until==null || state.t<b.until);
}
/* ---- potion belt: auto-quaff on cooldown when the trigger fits ---- */
function tryQuaff(u){
  const p=u.potion; if(!p||p.qty<=0) return;
  if(state.t < (u.potCd||0)) return;                       // still on cooldown
  const eff=potionEffect(p.type,p.size); if(!eff) return;
  const mh=derive(u).maxhp, hf=u.hp/Math.max(1,mh);
  const fire = eff.trigger==="hurt" ? hf<0.55 : livingFoes(u.team).length>0;   // heal/shield when hurt; buffs in a fight
  if(!fire) return;
  applyPotion(u,eff);
  p.qty=Math.max(0,p.qty-1); u.potCd=state.t+eff.cd;
  if(u.team===0){ renderParty(); flashHeroPot(u,eff.color); }   // refresh HP/charge, then flare the box
}
function applyPotion(u,eff){
  const mh=derive(u).maxhp, c=eff.color;
  if(eff.effect==="heal"){ const h=Math.max(1,Math.round(mh*eff.val)); u.hp=Math.min(mh,u.hp+h);
    fxText(uxS(u),uyS(u)-40,"+"+h,c,true); }
  else if(eff.effect==="regen"){ addBuff(u,{k:"regen",hps:mh*eff.val/Math.max(1,eff.dur),until:state.t+eff.dur,nextTick:state.t+0.5});
    fxText(uxS(u),uyS(u)-40,"regen",c); }
  else if(eff.effect==="shield"){ addBuff(u,{k:"shield",v:Math.max(1,Math.round(mh*eff.val)),until:state.t+eff.dur});
    fxText(uxS(u),uyS(u)-40,"shield",c); }
  else if(eff.effect==="mult"){ addBuff(u,{k:"pot",mult:true,stat:eff.stat,v:eff.val,until:state.t+eff.dur});
    fxText(uxS(u),uyS(u)-40,eff.name.split(" ")[0],c); }
  else if(eff.effect==="flat"){ addBuff(u,{k:"pot",flat:true,stat:eff.stat,v:eff.val,until:state.t+eff.dur});
    fxText(uxS(u),uyS(u)-40,eff.name.split(" ")[0],c); }
  fxRing(uxS(u),uyS(u)+6,c);
}
/* one basic attack, resolved by the deterministic CombatSim (+ this hero's skill modifiers) */
function attack(att,def){
  const dhf=def.hp/Math.max(1,derive(def).maxhp);
  const mods=combatMods(att,def,dhf);
  const res=resolveAttack(att,def,combatRng,mods);
  const who=`<b>${att.name}</b>`;
  att.lunge={tx:uxS(def),ty:uyS(def),t:0};
  if(res.type==="dodge"){
    log(`${who} strikes at ${def.name} — <span class="miss">dodged</span>`);
    fxText(uxS(def),uyS(def)-38,"dodge","#8b7fa8");
    if(def.team===0&&def.cls==="fighter") fxBlock(uxS(def),uyS(def)-18);
    return;
  }
  const deliver=()=>{
    log(`${who} hits ${def.name} — <span class="${res.crit?'crit':'hit'}">${res.crit?"CRIT!":"hit"}</span> <span class="dmg">${res.dmg}</span>`);
    hurt(def,res.dmg,att);
    fxText(uxS(def),uyS(def)-40,String(res.dmg),res.crit?"#ff6b6b":"#ffd166",res.crit);
    if(res.heal && att.alive){ const mh=derive(att).maxhp; att.hp=Math.min(mh,att.hp+res.heal);
      fxText(uxS(att),uyS(att)-30,"+"+res.heal,"#7ee787"); if(att.team===0) renderParty(); }
    if(mods.bleed && def.alive) applyBleed(def,att,mods.bleed);                 // Rend
    if(mods.cleaveTargets>0){                                                    // Cleave
      let hitN=0; for(const f of livingFoes(att.team)){ if(f===def) continue; if(distU(f,att)>1) continue;
        if(hitN>=mods.cleaveTargets) break; hitN++;
        const cd=Math.max(1,Math.round(mitigate(derive(att).atk*mods.cleavePct, derive(f).def)));
        fxSlash(uxS(f),uyS(f)-14,false); fxText(uxS(f),uyS(f)-36,String(cd),"#ffb066"); hurt(f,cd,att); } }
  };
  if(derive(att).rng>1){
    const col=att.cls==="mage"?"#b48bff":att.cls==="rogue"?"#d8c088":(att.fig==="kobold"?"#c8ccd6":"#7ee787");
    fxBolt(uxS(att),uyS(att)-18,uxS(def),uyS(def)-14,col,deliver);
  } else { fxSlash(uxS(def),uyS(def)-14,res.crit); deliver(); }
}
/* an active skill the battle AI chose to cast this action */
function castActive(u,s,tg){
  const a=s.a, r=s.rank, atk=derive(u).atk, def=derive(u).def;
  const say=(txt,col)=>{ fxText(uxS(u),uyS(u)-46,txt,col||"#ffd166",true);
    log(`${iconImg("spark",14)} <b>${u.name}</b> — <span class="sys">${s.name}</span>`,"sys"); };
  const hit=(foe,dmg)=>{ if(!foe.alive)return; const d=Math.max(1,Math.round(mitigate(dmg,derive(foe).def)));
    fxSlash(uxS(foe),uyS(foe)-14,false); fxText(uxS(foe),uyS(foe)-38,String(d),"#ffd166"); hurt(foe,d,u); };
  switch(a.kind){
    case "sunder":{ say("SUNDER","#ff9a5c"); hit(tg,atk*a.dmg);
      const sh=a.shred[r-1]; addBuff(tg,{k:"shred",mult:true,stat:"def",v:-sh,until:state.t+a.dur});
      if(r>=5) adjFoes(u).forEach(f=>{ if(f!==tg) addBuff(f,{k:"shred",mult:true,stat:"def",v:-sh,until:state.t+a.dur}); }); break; }
    case "whirl":{ say("WHIRLWIND","#ff9a5c"); fxRing(uxS(u),uyS(u)+6,"#ff9a5c");
      adjFoes(u).forEach(f=>{ hit(f,atk*a.dmg[r-1]); if(r>=a.bleedAt) applyBleed(f,u,{pct:.06,dur:4,stacks:1}); }); break; }
    case "rampage":{ say("RAMPAGE","#ff9a5c"); for(let i=0;i<a.hits;i++) hit(tg,atk*a.dmg[r-1]); break; }
    case "wrath":{ say("WARLORD'S WRATH","#ffdf6b"); fxRing(uxS(u),uyS(u)+6,"#ffdf6b");
      adjFoes(u).forEach(f=>hit(f,atk*a.dmg));
      const bf=a.buff[r-1]; party.forEach(h=>{ if(h.alive) addBuff(h,{k:"wrath",mult:true,stat:"atk",v:bf,until:state.t+a.dur}); }); break; }
    case "guard":{ say("GUARD","#9ad1ff"); addBuff(u,{k:"guard",mult:true,stat:"def",v:a.def[r-1],until:state.t+a.dur}); fxBlock(uxS(u),uyS(u)-18); break; }
    case "taunt":{ say("TAUNT","#9ad1ff"); const dur=a.dur[r-1]; addBuff(u,{k:"taunt",until:state.t+dur});
      if(a.defBuff[r-1]>0) addBuff(u,{k:"taunt",mult:true,stat:"def",v:a.defBuff[r-1],until:state.t+dur}); break; }
    case "bash":{ say("SHIELD BASH","#9ad1ff"); hit(tg,def*a.dmg); if(tg.alive){ addBuff(tg,{k:"stun",until:state.t+a.stun[r-1]}); fxText(uxS(tg),uyS(tg)-30,"stun","#9ad1ff"); } break; }
    case "rally":{ say("RALLYING CRY","#9ad1ff"); const sh=Math.round(derive(u).maxhp*a.shield[r-1]);
      party.forEach(h=>{ if(h.alive){ addBuff(h,{k:"shield",v:sh,until:state.t+12}); fxText(uxS(h),uyS(h)-30,"shield","#9ad1ff"); } }); break; }
    case "unbreak":{ say("UNBREAKABLE","#ffdf6b"); const dur=a.dur[r-1];
      addBuff(u,{k:"immune",until:state.t+dur}); addBuff(u,{k:"taunt",until:state.t+dur});
      const heal=Math.round(derive(u).maxhp*a.heal[r-1]); u.hp=Math.min(derive(u).maxhp,u.hp+heal);
      fxText(uxS(u),uyS(u)-30,"+"+heal,"#7ee787"); break; }
    // ---- generic archetypes shared by Mage / Cleric / Rogue ----
    case "bolt":{ say(s.name.split(" ")[0].toUpperCase(),"#b48bff"); hit(tg,atk*a.dmg[r-1]);
      if(tg.alive){
        if(a.burn&&a.burn[r-1]>0) applyBleed(tg,u,{pct:a.burn[r-1],dur:3,stacks:1});
        if(a.mark&&a.mark[r-1]>0) addBuff(tg,{k:"mark",mult:true,stat:"def",v:-a.mark[r-1],until:state.t+(a.dur||5)});
        if(a.slow&&a.slow[r-1]>0) addBuff(tg,{k:"slow",mult:true,stat:"aspd",v:-a.slow[r-1],until:state.t+3});
        if(a.stun&&a.stun[r-1]>0){ addBuff(tg,{k:"stun",until:state.t+a.stun[r-1]}); fxText(uxS(tg),uyS(tg)-30,"stun","#9ad1ff"); }
      } break; }
    case "nova":{ say(s.name.split(" ")[0].toUpperCase(),"#b48bff"); fxRing(uxS(u),uyS(u)+6,"#b48bff");
      foesInRange(u,a.radius||2).forEach(f=>{ hit(f,atk*a.dmg[r-1]);
        if(a.slow&&a.slow[r-1]>0) addBuff(f,{k:"slow",mult:true,stat:"aspd",v:-a.slow[r-1],until:state.t+3});
        if(a.stun&&a.stun[r-1]>0) addBuff(f,{k:"stun",until:state.t+a.stun[r-1]}); }); break; }
    case "heal":{ say("HEAL","#7ee787"); const imm=Array.isArray(a.immune)?a.immune[r-1]:0;
      const targets=a.party?party.filter(h=>h.alive):[lowestHurtAlly(u)].filter(Boolean);
      targets.forEach(t=>{ const mh=derive(t).maxhp, amt=Math.round(mh*a.pct[r-1]); t.hp=Math.min(mh,t.hp+amt);
        fxText(uxS(t),uyS(t)-30,"+"+amt,"#7ee787"); if(imm) addBuff(t,{k:"immune",until:state.t+imm}); }); break; }
    case "buff":{ say(s.name.toUpperCase().slice(0,10),"#9ad1ff"); const dur=Array.isArray(a.dur)?a.dur[r-1]:(a.dur||6);
      const targets=a.party?party.filter(h=>h.alive):[u];
      targets.forEach(t=>{
        if(a.stat) addBuff(t,{k:"sbuff",mult:!a.flat,flat:!!a.flat,stat:a.stat,v:a.v[r-1],until:state.t+dur});
        if(a.shield){ const sh=Math.round(derive(u).maxhp*a.shield[r-1]); addBuff(t,{k:"shield",v:sh,until:state.t+12}); fxText(uxS(t),uyS(t)-30,"shield","#9ad1ff"); } });
      break; }
  }
  if(u.team===0) renderParty();
}
/* try to spend this action on a ready, situationally-appropriate active. Returns true if one fired. */
function tryCast(u,tg){
  const acts=activeSkills(u); if(!acts.length) return false;
  u.cd=u.cd||{};
  const R=derive(u).rng, d=distU(u,tg);
  for(const s of acts){
    if(state.t < (u.cd[s.id]||0)) continue;
    const k=s.a.kind, fits =
      (k==="rally"||k==="buff") ? true :                          // buffs/shields fire on cooldown
      k==="heal"    ? !!lowestHurtAlly(u,0.72) :                   // heal only when a pal is hurt
      k==="unbreak" ? (u.hp/derive(u).maxhp<0.55 || adjFoes(u).length>=2) :
      k==="nova"    ? foesInRange(u,s.a.radius||2).length>=1 :     // AoE wants foes in the blast
      (k==="guard"||k==="taunt") ? d<=2 :
      d<=Math.max(1,R);                       // bolt + melee strikes need a foe in reach
    if(!fits) continue;
    u.cd[s.id]=state.t+s.a.cd[s.rank-1];
    castActive(u,s,tg);
    return true;
  }
  return false;
}
function hurt(u,dmg,src,opt){
  if(!u.alive) return;
  opt=opt||{};
  if(hasBuff(u,"immune")){ fxText(uxS(u),uyS(u)-30,"immune","#9ad1ff"); return; }   // Unbreakable
  // Guardian — an adjacent ally soaks part of the blow
  if(!opt.noGuard && u.team===0){ const g=guardianNear(u); if(g){ const gd=Math.max(1,Math.round(dmg*guardianFrac(g)));
    dmg-=gd; hurt(g,gd,src,{noGuard:true,noReflect:true}); } }
  // Shield (Rallying Cry) absorbs before HP
  if(dmg>0 && u.buffs){ for(const b of u.buffs){ if(b.k==="shield"&&b.v>0){ const a=Math.min(b.v,dmg); b.v-=a; dmg-=a;
    if(a>0) fxText(uxS(u),uyS(u)-26,"absorb","#9ad1ff"); if(dmg<=0) break; } }
    u.buffs=u.buffs.filter(b=>b.k!=="shield"||b.v>0); }
  if(dmg<=0){ if(u.team===0) renderParty(); return; }
  // Retaliation — reflect melee damage back to the attacker
  if(!opt.noReflect && src && src.alive && src.team!==u.team && derive(src).rng<=1){ const rfr=reflectFrac(u);
    if(rfr>0){ hurt(src,Math.max(1,Math.round(dmg*rfr)),u,{noReflect:true,noGuard:true}); } }
  u.hp-=dmg; u.flash=0.18;
  // Last Stand — cheat death
  if(u.hp<=0){ const ls=lastStand(u); if(ls && (u.mLast||0)<ls.uses){ u.mLast=(u.mLast||0)+1;
    u.hp=Math.max(1,Math.round(derive(u).maxhp*ls.heal)); u.flash=0.18;
    fxText(uxS(u),uyS(u)-44,"LAST STAND!","#ffd166",true);
    log(`${iconImg("spark",14)} <b>${u.name}</b> refuses to fall!`,"heal");
    if(u.team===0) renderParty(); return; } }
  if(u.hp<=0){ u.hp=0; u.alive=false;
    log(`${iconImg("skull",14)} <b>${u.name}</b> falls!`, u.team===0?"crit":"sys");
    const f=figOf(u), S=u.boss?76:54;
    fxDissolve(f,uxS(u),uyS(u)+4,S,S,u.team===0?"#9ad1ff":"#c98a8a");
    if(u.team===1&&src&&src.team===0){
      awardXP(u.xp);
      const d=activeDungeon();
      const dropChance=Math.min(BAL.DROP_CHANCE_MAX, BAL.DROP_CHANCE + BAL.DROP_CHANCE_PER_TIER*(d.power-1));
      if(u.boss||combatRng()<dropChance){
        // Only ONE roll popup at a time: while a loot ROLL is open, normal drops are skipped to prevent
        // stacking (the battle rolls on behind it). Boss drops always come through. Drops that land while
        // the character window is open still queue — they wait and show once that window is closed.
        if(u.boss || !lootOpen){
          fxText(uxS(u),uyS(u)-30,"loot!","#ffd166");
          queueDrop({classes:partyClasses(), power:d.power, floor:d.dropFloor}, u.name);   // opens the slot-roll popup
        }
      }
      if(combatRng()<(u.boss?BAL.GEM_CHANCE_BOSS:BAL.GEM_CHANCE)){ state.gems++;
        log(`${iconImg("gem",14)} <b>${u.name}</b> drops a <span class="sys">Runic Gem</span> <span style="opacity:.6">(${state.gems})</span>`,"sys");
        fxText(uxS(u),uyS(u)-46,"gem","#9ad1ff"); }
      if(u.boss||combatRng()<BAL.POTION_DROP_CHANCE){    // potions drop into the shared stash (size ~ tier)
        const pd=rollLootPotion(d.power, combatRng); addPotion(pd.type,pd.size,pd.qty);
        log(`${iconImg("chest",14)} <b>${u.name}</b> drops a <span class="sys">${POTION_BY_ID[pd.type].name}</span> <span style="opacity:.6">(${pd.size})</span>`,"sys");
        fxText(uxS(u),uyS(u)-58,"potion",POTION_BY_ID[pd.type].color); saveGame(); }
      const sv=Math.max(1,Math.round(u.xp*(BAL.SILVER_MULT+combatRng()*BAL.SILVER_JITTER)));
      state.silver+=sv;
      if(combatRng()<0.5) fxText(uxS(u),uyS(u)-14,"+"+sv,"#d8c47a");
      updateHud();
    }
    if(src && src.alive){ const mo=momentum(src); if(mo) addMomentum(src,mo); }   // Momentum snowball
  }
  if(u.team===0) renderParty();
}
/* xp progress toward the next level, for the character panel (no cap — always shows a bar) */
function xpProgress(h){
  const prev=xpToReach(h.level), next=xpToReach(h.level+1);
  return {cur:Math.max(0,(h.xp||0)-prev), need:next-prev, nextLevel:h.level+1};
}
/* Award XP to the living party. No level cap. The MAIN hero (party[0]) gains no automatic stats —
   each level grants assignable points instead (spent in the character panel). COMPANIONS no longer
   auto-grow either: each level queues a "level-up roll" (slot-machine of 0–2 stat points + one skill
   rank) the player resolves at a portrait — see companionRollData / applyCompanionRoll. */
function awardXP(xp){
  const share=Math.ceil(xp/Math.max(1,party.filter(p=>p.alive).length));
  let leveled=false;
  for(const h of party){ if(!h.alive)continue;
    const isMain=h===party[0];
    h.xp+=share;
    while(h.xp>=xpToReach(h.level+1)){
      h.level++; leveled=true;
      if(isMain){
        const pts=pointsForLevel(h.level);
        log(`${iconImg("spark",14)} <b>${h.name}</b> reaches <span class="sys">level ${h.level}</span>! <span class="heal">+${pts} stat point${pts>1?"s":""}</span> to spend.`,"heal");
      } else {
        h.pendRolls=(h.pendRolls||0)+1;   // stats/skill are rolled later, not applied now
        if(state.autoLevel){              // ...unless auto-level is on: resolve it now with a free roll
          const roll=resolveCompanionLevel(h);
          log(`${iconImg("spark",14)} <b>${h.name}</b> reaches <span class="sys">level ${h.level}</span>! <span class="heal">${rollSummary(roll,h)}</span>`,"heal");
        } else {
          log(`${iconImg("spark",14)} <b>${h.name}</b> reaches <span class="sys">level ${h.level}</span>! <span class="heal">Level-up roll ready.</span>`,"heal");
        }
      }
      fxRing(uxS(h),uyS(h)+6,"#7ee787"); fxText(uxS(h),uyS(h)-44,"LEVEL UP!","#7ee787",true);
    } }
  renderParty();
  if(leveled) saveGame();   // persist a level-up so hard-won progress survives a reload mid-run
}
/* ---- companion level-up roll ---- */
const companionRerollCost = n => Math.round(30*Math.pow(1.6, n|0));   // climbs per reroll of one level
/* one rolled level: 0–2 points per stat (weighted, never all-zero) + one kit skill for +1 (if any
   isn't already maxed). Uses Math.random — it's an interactive draw, not deterministic combat. */
function companionRollData(h){
  const stats={};
  for(const k of ASSIGNABLE){ const x=Math.random(); stats[k]= x<0.34?0 : x<0.80?1:2; }
  if(ASSIGNABLE.every(k=>!stats[k])) stats[ASSIGNABLE[(Math.random()*ASSIGNABLE.length)|0]]=1+Math.round(Math.random());
  // skill: the reel holds the kit + 2 blank slots, so ~2/7 of rolls grant no skill this level.
  const pool=heroKit(h).filter(s=>(h.skills[s.id]||0)<MAX_POINTS);
  const SKILL_MISS=2/7;                       // fixed ~29% "no upgrade" chance, independent of kit size
  const skillId=(pool.length && Math.random()>=SKILL_MISS) ? pool[(Math.random()*pool.length)|0].id : null;
  return { stats, skillId };
}
/* apply the current roll: fold points into pts (derive handles the rest), bump the skill, grant new
   HP, and decrement the queue. The NEXT level is NOT pre-rolled — the player initiates every roll.
   Returns pending rolls remaining. */
function applyCompanionRoll(h){
  const roll=h.pendRoll; if(!roll) return h.pendRolls||0;
  const before=derive(h).maxhp;
  const next={...emptyPoints(), ...(h.pts||{})};
  for(const k of ASSIGNABLE) next[k]=(next[k]||0)+(roll.stats[k]||0);
  h.pts=next;
  if(roll.skillId) h.skills[roll.skillId]=Math.min(MAX_POINTS,(h.skills[roll.skillId]||0)+1);
  const after=derive(h).maxhp;
  if(after>before) h.hp=Math.min(after, h.hp+(after-before));
  h.pendRolls=Math.max(0,(h.pendRolls||0)-1);
  h.pendRoll=null; h.rerollN=0;
  refreshParty(); updateHud(); saveGame();   // update HUD + the Keep/Tavern tiles (and their roll-dots)
  return h.pendRolls;
}
/* ---- auto-level: a companion resolves its own free roll (no popup, no silver) ---- */
const STAT_LABEL = { hp:"HP", atk:"ATK", def:"DEF", dodge:"Dodge", crit:"Crit" };
/* compact one-line readout of what a rolled level granted, for the combat log */
function rollSummary(roll, h){
  const parts=ASSIGNABLE.filter(k=>roll.stats[k]).map(k=>`+${roll.stats[k]*STAT_STEP[k]} ${STAT_LABEL[k]||k}`);
  if(roll.skillId){ const s=allSkills(h.cls).find(x=>x.id===roll.skillId); if(s) parts.push(`${s.name} ⭑`); }
  return parts.length ? parts.join(" · ") : "no gains";
}
/* resolve ONE queued level with a free first draw and apply it immediately; returns the roll shown */
function resolveCompanionLevel(h){
  if(!h.pendRoll) h.pendRoll=companionRollData(h);
  const roll=h.pendRoll;
  applyCompanionRoll(h);   // folds points/skill, grants HP, decrements pendRolls, clears pendRoll+rerollN, saves
  return roll;
}
/* drain EVERY companion's pending rolls at once (used when auto-level is switched on) */
function sweepAutoLevel(){
  let any=false;
  for(const h of party){ if(h===party[0]) continue;
    while((h.pendRolls||0)>0){ const roll=resolveCompanionLevel(h); any=true;
      log(`${iconImg("spark",14)} <b>${h.name}</b> auto-levels → <span class="heal">${rollSummary(roll,h)}</span>`,"heal"); } }
  if(any) refreshParty();
}
/* menu toggle: flip auto-level; turning it on clears any backlog of pending rolls right away */
function toggleAutoLevel(){
  state.autoLevel=!state.autoLevel;
  if(state.autoLevel) sweepAutoLevel();
  saveGame();
  return state.autoLevel;
}
function openCompanionRollScreen(h){
  openCompanionRoll(h, {
    portrait: heroPortrait(h),
    kit: ()=>heroKit(h),
    silver: ()=>state.silver,
    getRoll: ()=>h.pendRoll,        // null until the player clicks Roll (drawn on their click)
    levelFor: ()=> h.level - (h.pendRolls||0) + 1,
    // the free first draw for the current level, generated ON the click (persists so closing and
    // reopening shows the same roll — no free reroll by re-entering)
    firstRoll: ()=>{ if(!h.pendRoll){ h.pendRoll=companionRollData(h); saveGame(); } return h.pendRoll; },
    rerollCost: ()=>companionRerollCost(h.rerollN||0),
    reroll: ()=>{ const cost=companionRerollCost(h.rerollN||0); if(state.silver<cost) return false;
      state.silver-=cost; h.rerollN=(h.rerollN||0)+1; h.pendRoll=companionRollData(h); updateHud(); saveGame(); return true; },
    confirm: ()=>applyCompanionRoll(h),
    // return to the companion's screen (which shows the next Roll CTA if more levels wait, else the stats)
    close: ()=>openHero(h),
  });
}
/* Commit a pending point allocation for the main hero. `deltas` maps stat→signed count (add/remove).
   Validated against available points; grants any HP increase, clamps current HP on a refund. */
function assignPoints(h, deltas){
  if(h!==party[0]) return false;                       // main hero only
  // add-only: committed stat points are permanent — a delta can only INCREASE a stat, never refund it
  const next={...emptyPoints(), ...(h.pts||{})};
  for(const k of ASSIGNABLE) next[k]=(next[k]||0)+Math.max(0,deltas[k]||0);
  // reject an allocation that would overspend the earned pool
  let spent=0; for(const k of ASSIGNABLE) spent+=next[k];
  if(spent>earnedPoints(h.level)) return false;
  const before=derive(h).maxhp;
  h.pts=next;
  const after=derive(h).maxhp;
  if(after>before) h.hp=Math.min(after,h.hp+(after-before));   // new HP is granted live
  renderParty(); updateHud(); saveGame();
  return true;
}
/* Commit a drafted skill allocation for the main hero. `draft` maps skillId→ranks-to-add (all ≥0).
   Validated against the point pool and tier gates on the RESULTING build, then saved. Committed
   ranks can't be pulled back for free — respec via resetSkills() (paid). */
function learnSkills(h, draft){
  if(h!==party[0]) return false;
  const next={...(h.skills||{})};
  for(const id in draft){ if(draft[id]>0) next[id]=(next[id]||0)+draft[id]; }
  let spent=0; for(const id in next) spent+=next[id];
  if(spent>earnedSkillPoints(h.level)) return false;
  const inv={off:0,def:0}; for(const s of allSkills(h.cls)) inv[s.br]+=next[s.id]||0;
  for(const s of allSkills(h.cls)){ const r=next[s.id]||0; if(r>0 && inv[s.br]<TIER_GATES[s.tier]) return false; }
  for(const id in next) if(next[id]<=0) delete next[id];
  h.skills=next; renderParty(); updateHud(); saveGame();
  return true;
}
/* Cost to wipe & refund the whole skill tree — rises with how much is invested. */
function respecCost(h){ return BAL.SKILL_RESPEC.BASE + spentSkillPoints(h)*BAL.SKILL_RESPEC.PER_POINT; }
/* Reset the skill tree for silver: refunds every point, clearing the build. */
function resetSkills(h){
  if(h!==party[0]) return false;
  if(spentSkillPoints(h)<=0) return false;
  const cost=respecCost(h); if(state.silver<cost) return false;
  state.silver-=cost; h.skills={};
  renderParty(); updateHud(); saveGame();
  log(`${iconImg("spark",14)} <b>${h.name}</b> unlearns every skill for ${iconImg("coin",12)} ${cost}.`,"sys");
  return true;
}
function act(u){
  if(!u.alive)return;
  if(hasBuff(u,"stun")) return;               // stunned → skip this action entirely
  const tg=nearest(u);
  if(tg){
    if(tryCast(u,tg)) return;                  // spend the action on a ready skill when one fits
    const R=derive(u).rng, d=distU(u,tg);
    if(R>1){                                  // ranged: kite
      if(d<=BAL.KITE_MIN){ if(!stepAway(u,tg)) attack(u,tg); return; }  // foe too close → back off (or fight if cornered)
      if(d<=R){ attack(u,tg); return; }        // in range with a safe buffer → shoot
      stepToward(u,tg); return;                // too far → close the gap
    }
    if(d<=R) attack(u,tg);                     // melee: strike when adjacent
    else stepToward(u,tg);                     // otherwise chase
    return;
  }
  // no foe to engage — heroes regroup on the rally flag if one is planted
  if(u.team===0 && state.rally && distU(u,state.rally)>0) stepToward(u,state.rally);
}
/* wave clears -> schedule respawn; party wipes -> schedule revive (endless map) */
function updateWaves(){
  const heroesAlive=party.some(h=>h.alive);
  const foesAlive=state.foes.some(f=>f.alive);
  if(!heroesAlive){
    if(state.wipeAt===null){ state.wipeAt=state.t+BAL.WIPE_DELAY;
      log(`${iconImg("skull",14)} <span class="crit">The party falls…</span> retreating to the Keep.`); }
    return;
  }
  if(!foesAlive && state.respawnAt===null){
    // Every room (the boss room included) keeps an endless-wave rhythm so you can farm as long as you
    // like. In the boss room, killing the wave that HELD the boss puts the boss on a respawn timer —
    // the room then fields trash until the boss recovers, and you never get pulled back to the Keep.
    const bossKill = state.roomIdx===BOSS_ROOM && state.bossInWave;
    if(bossKill){ state.bossInWave=false; state.bossAt=state.t+BAL.BOSS_RESPAWN; onBossDown(); }
    state.respawnAt=state.t+BAL.RESPAWN_DELAY;
    for(const h of party) if(h.alive){ const mh=derive(h).maxhp;
      const heal=Math.round(mh*BAL.WAVE_HEAL_FRAC)+Math.round(mh*waveHealFrac(h));   // + Second Wind
      h.hp=Math.min(mh,h.hp+heal); }
    renderParty();
    if(!bossKill) log(`${iconImg("check",14)} <span class="sys">Wave cleared.</span> Another approaches…`);
  }
}
/* Boss slain: mark the dungeon cleared and unlock the next rung the FIRST time (with a guaranteed
   drop); every kill after just farms the boss's normal loot. The party stays in the dungeon — the
   boss returns on its timer (BAL.BOSS_RESPAWN) with trash to fight in the meantime. */
function onBossDown(){
  const d=activeDungeon(), first=!state.cleared.includes(d.id);
  log(`${iconImg("check",14)} <span class="heal">${d.boss.name} is slain!</span>`,"heal");
  if(first){
    state.cleared.push(d.id);
    const floor=["plain","fine","rare","epic"];
    const bump=Math.min(floor.length-1, floor.indexOf(d.dropFloor)+BAL.FIRST_CLEAR_GRADE_BUMP);
    log(`${iconImg("chest",14)} First clear! <b>${d.name}</b> yields a reward — roll it!`,"heal");
    queueDrop({classes:partyClasses(), power:d.power, floor:floor[bump]}, `${d.name} · first clear`);
    const nx=nextDungeon(d);
    if(nx) log(`${iconImg("spark",14)} <span class="sys">${nx.name} is now open at the Dungeons board.</span>`,"sys");
  }
  log(`${iconImg("skull",14)} <span class="sys">${d.boss.name} will return in ~${Math.round(BAL.BOSS_RESPAWN/60)} min.</span>`,"sys");
  updateHud(); saveGame();
}
/* ---------- controls & menus ---------- */
function removeItem(item){
  const i=state.inventory.indexOf(item); if(i>=0){ state.inventory.splice(i,1); return; }
  for(const h of party) for(const s in h.gear) if(h.gear[s]===item){ h.gear[s]=null; return; }
}
/* spend a gem to upgrade an item at the Forge; returns the outcome for the panel to show */
function tryForge(item){
  if(!canUpgrade(item)) return {outcome:"max"};
  const cost=forgeCost(item);
  if(state.gems<cost.gems) return {outcome:"nogem"};
  if(state.silver<cost.silver) return {outcome:"nosilver"};
  state.gems-=cost.gems; state.silver-=cost.silver;
  const res=forgeUpgrade(item, Math.random);
  if(res.outcome==="success"){ item.d=describeItem(item);   // rebuild the stat text so rows/panels show the new value
    log(`${iconImg("hammer",14)} <span class="heal">+${item.upgradeLevel}!</span> ${item.n} strengthened.`,"heal"); }
  else if(res.outcome==="destroyed"){ removeItem(item); log(`${iconImg("hammer",14)} <span class="crit">Shattered!</span> ${item.n} was destroyed.`,"crit"); }
  else log(`${iconImg("hammer",14)} <span class="miss">The gem fizzles</span> — ${item.n} is unharmed.`);
  renderParty(); updateHud(); saveGame();
  return res;
}
function openHero(h){
  // Opening the panel shows the overlay, which the loop reads to freeze the dungeon entirely
  // (combat, movement, FX) without touching the manual Fight/Pause state — so closing the panel
  // resumes exactly where the fight left off. No separate flag to leak. A companion with pending
  // level-ups sees a "Roll" call-to-action inside their screen (the player initiates every roll).
  const isCompanion = h!==party[0];
  heroPanelOpen=true;               // hold back any loot roll until this window is closed
  openCharacter(h, {
    inventory: state.inventory,
    portrait: heroPortrait(h),
    isMain: h===party[0],
    xp: xpProgress,
    pendRolls: isCompanion ? ()=>h.pendRolls||0 : null,     // companion level-up rolls waiting
    openRoll: isCompanion ? ()=>openCompanionRollScreen(h) : null,
    points: h===party[0] ? ()=>unspentPoints(h) : null,   // only the main hero allocates points
    assign: h===party[0] ? d=>assignPoints(h, d) : null,
    skills: h===party[0] && CLASS_SKILLS[h.cls] ? {
      tree: CLASS_SKILLS[h.cls],
      ranks: ()=>h.skills||{},                 // committed ranks
      points: ()=>unspentSkillPoints(h),       // unspent (committed) pool
      invested: br=>branchInvested(h,h.cls,br),
      gates: TIER_GATES, maxRank: MAX_POINTS, ptsPerStar: PTS_PER_STAR,
      commit: draft=>learnSkills(h,draft),     // apply a drafted allocation (saves)
      resetCost: ()=>respecCost(h),
      reset: ()=>resetSkills(h),
      silver: ()=>state.silver,
    } : null,
    refresh: refreshParty,   // scene-aware: updates the HUD and the visible Keep/Tavern portrait dots
    potion: {                // the belt: equipped brew + shared stash + load/unload
      equipped: ()=>h.potion,
      stash: ()=>state.potions,
      equip: stack=>equipPotion(h,stack),
      unequip: ()=>unequipPotion(h),
    },
    gems: ()=>state.gems,
    silver: ()=>state.silver,
    close: ()=>{ heroPanelOpen=false; pumpLoot(); },   // window closed → show any loot that dropped while it was open
  });
}
/* Read-only look at a tavern recruit (a stranger you don't own yet): full stats, skills and the gear
   they'd bring — but no equipping/potion controls, so you can't strand bag gear on someone unhired. */
function previewRecruit(h){
  heroPanelOpen=true;
  openCharacter(h, {
    inventory: [], portrait: heroPortrait(h), isMain: false, preview: true, xp: null,   // no XP bar for a stranger
    pendRolls: null, openRoll: null, points: null, assign: null, skills: null,
    refresh: ()=>{}, potion: null, gems: ()=>state.gems, silver: ()=>state.silver,
    close: ()=>{ heroPanelOpen=false; pumpLoot(); },
  });
}
/* ---------- loot roll: every gear drop opens a slot-roll popup (reroll for silver, or accept) ---------- */
let lootQ=[];            // queued drops waiting to be rolled: {roll, opts, from}
let lootOpen=false;      // a roll popup is currently showing (overlay frozen)
const lootRerollCost=(power,n)=>Math.round((BAL.LOOT_REROLL_BASE + (power||1)*BAL.LOOT_REROLL_TIER) * Math.pow(BAL.LOOT_REROLL_GROWTH, n|0));
/* Generate the drop NOW (advances combatRng at the moment of death, as loot always did) and queue it;
   bursts of drops in one wave show one popup after another. */
function queueDrop(opts, from){ lootQ.push({ roll: generateRoll(combatRng, opts), opts, from }); pumpLoot(); }
function pumpLoot(){
  if(lootOpen) return;                       // a roll is already up; its close will re-pump
  if(heroPanelOpen) return;                  // a character window is open — wait, never draw over it (its close re-pumps)
  if(!lootQ.length){
    if(panelShown()){ overlay.classList.remove("show"); overlay.innerHTML=""; }   // queue drained → resume the delve
    return;
  }
  lootOpen=true;
  const entry=lootQ.shift(), opts=entry.opts, from=entry.from, power=opts.power||1;
  let roll=entry.roll, rerolls=0;
  openLootRoll(roll, {
    from,
    silver:()=>state.silver,
    rerollCost:()=>lootRerollCost(power, rerolls),
    reroll:()=>{ const cost=lootRerollCost(power, rerolls); if(state.silver<cost) return null;
      state.silver-=cost; rerolls++; roll=generateRoll(Math.random, opts); updateHud(); return roll; },  // rerolls are interactive → Math.random
    accept:()=>{ state.inventory.push(roll.item);
      log(`${iconImg("chest",14)} ${from?`<b>${from}</b> drops `:""}<span class="sys">${roll.item.n}</span> <span style="opacity:.6">→ bag (${state.inventory.length})</span>`);
      renderParty(); saveGame(); },   // refresh the party bar so the gear-hint ▲ appears for anyone it fits
    close:()=>{ lootOpen=false; pumpLoot(); },   // next queued drop, or resume the delve
  });
}
/* ---------- scenes: town hub ⇄ dungeon ---------- */
function enterTown(fromWipe=false){
  state.scene="town"; townEl.classList.add("show");
  // The main hero now falls like anyone else and is raised at the Temple. Safety net: only if the
  // WHOLE party is down (nobody left to earn silver) does the main wake free at the Keep, so a total
  // wipe can never soft-lock the run. A main who falls with pals still standing waits at the Temple.
  const main=party[0];
  if(main && !main.alive && !party.some(h=>h.alive)){
    main.alive=true; main.hp=Math.round(derive(main).maxhp*BAL.REVIVE_HEAL_FRAC);
    log(`${iconImg("spark",14)} <span class="heal">Your whole party fell — you awaken at the Keep, battered but breathing.</span>`,"sys"); }
  // a wipe ends the delve: reset the battlefield so the next descent starts fresh (fallen pals stay
  // dead until raised at the Temple; they simply won't be placed until then).
  if(fromWipe){ state.phase="idle"; loadRoom(); }
  renderParty();
  dheadEl.classList.remove("show");   // hide the dungeon header + delve controls while at the Keep
  dmenufab.classList.remove("show"); closeDLog(); closeDMenu();
  openTownScreen();
  saveGame();          // persist the run whenever you're back at the Keep (loot, revives, etc.)
  diag("scene", `keep${fromWipe?" · wipe":""} · party ${party.filter(h=>h.alive).length}/${party.length}`);
}
function enterDungeon(){
  state.scene="dungeon"; townEl.classList.remove("show");
  state.roomMax=Math.max(state.roomMax||0, state.roomIdx||0);
  if(state.phase==="idle") seedBattle();
  placeHeroes();              // form up the living party (incl. any pals hired/resurrected since)
  state.phase="fight"; renderDungeonHeader();   // the delve auto-runs — there is no manual start/pause
  diag("scene", `descend · room ${state.roomIdx} · party ${party.filter(h=>h.alive).length}`);
}
function openTownScreen(){
  townRefresh=openTownScreen;
  openTown({ silver:()=>state.silver, gems:()=>state.gems, party, portrait:h=>heroPortrait(h),
    openHero, openParty:openPartyScreen, openShop:openShopScreen, openTavern:openTavernScreen, openTemple:openTempleScreen,
    openForge:openForgeScreen, openDiag:openDiagScreen, openDungeons:openDungeonBoard,
    exitToLogin:saveExitToLogin, autoLevel:{ on:()=>state.autoLevel, toggle:()=>toggleAutoLevel() },
    tileFlag:heroTileFlag, activeDungeon:()=>activeDungeon() });
}
/* Party roster (reached from the Keep's Party tab) — tap a pal to open their character screen */
function openPartyScreen(){
  townRefresh=openPartyScreen;
  openPartyRoster({ party, portrait:h=>heroPortrait(h), tileFlag:heroTileFlag, openHero, back:openTownScreen });
}
/* start a fresh delve of a chosen dungeon (resets to its first room) */
function startDungeon(id){
  state.dungeonId=dungeonById(id).id; state.roomIdx=0; state.roomMax=0; state.phase="idle";
  state.bossAt=null; state.bossInWave=false;      // boss is ready the first time you reach its room
  loadRoom(); saveGame(); enterDungeon();
}
function openDungeonBoard(){
  townRefresh=openDungeonBoard;
  openDungeonSelect({
    dungeons:DUNGEONS, active:state.dungeonId, cleared:state.cleared, roomIdx:state.roomIdx,
    resumable:state.roomIdx>0, partyLevel:party[0]?party[0].level:1,
    silver:state.silver, gems:state.gems,
    select:id=>startDungeon(id), resume:()=>enterDungeon(), back:openTownScreen });
}
function openDiagScreen(){ townRefresh=openDiagScreen; openDiag({ text:buildDiagnostics, back:openTownScreen }); }
/* ---------- forge: spend gems to upgrade gear (town service) ---------- */
/* every gear item across the party's equipped slots + the shared bag, tagged with its owner/slot
   so the Forge can filter by character (and the bag) and by gear slot */
function allGear(){
  const list=[];
  for(const h of party) for(const s in h.gear){ const it=h.gear[s];
    if(it) list.push({item:it, owner:h, where:h.name, slot:it.slot}); }
  for(const it of state.inventory) list.push({item:it, owner:null, where:"Bag", slot:it.slot});
  return list;
}
function openForgeScreen(){
  townRefresh=openForgeScreen;
  openForge({ gems:()=>state.gems, silver:()=>state.silver, gear:allGear, party:()=>party, portrait:h=>heroPortrait(h),
    preview:forgePreview, forge:tryForge, back:openTownScreen });
}
/* ---------- potions: shared stash + per-hero belt ---------- */
function addPotion(type,size,n=1){
  const st=state.potions.find(s=>s.type===type&&s.size===size);
  if(st) st.qty=Math.min(POTION_CAP, st.qty+n);
  else state.potions.push({type,size,qty:Math.min(POTION_CAP,n)});
}
function takePotion(type,size,n){   // pull up to n from the stash; returns how many came out
  const i=state.potions.findIndex(s=>s.type===type&&s.size===size); if(i<0) return 0;
  const st=state.potions[i], take=Math.min(st.qty,n); st.qty-=take; if(st.qty<=0) state.potions.splice(i,1); return take;
}
/* load a whole stash stack onto a hero's belt (merges same brew, swaps different, caps at 99). */
function equipPotion(h,stack){
  if(!stack) return false;
  const take=takePotion(stack.type,stack.size,POTION_CAP); if(!take) return false;
  const same=h.potion&&h.potion.qty>0&&h.potion.type===stack.type&&h.potion.size===stack.size;
  if(same){ const room=POTION_CAP-h.potion.qty, add=Math.min(room,take); h.potion.qty+=add;
    if(take-add>0) addPotion(stack.type,stack.size,take-add); }
  else { if(h.potion&&h.potion.qty>0) addPotion(h.potion.type,h.potion.size,h.potion.qty);   // old belt → stash
    const add=Math.min(POTION_CAP,take); h.potion={type:stack.type,size:stack.size,qty:add};
    if(take-add>0) addPotion(stack.type,stack.size,take-add); }
  refreshParty(); saveGame(); return true;
}
function unequipPotion(h){
  if(!h.potion||h.potion.qty<=0){ h.potion=null; return false; }
  addPotion(h.potion.type,h.potion.size,h.potion.qty); h.potion=null;
  refreshParty(); saveGame(); return true;
}
function buyPotion(type,size){
  const cost=potionCost(type,size); if(state.silver<cost) return false;
  state.silver-=cost; addPotion(type,size,1); updateHud(); saveGame(); return true;
}
function sellPotion(type,size){
  if(!takePotion(type,size,1)) return false;
  state.silver+=potionSell(type,size); updateHud(); saveGame(); return true;
}
/* ---------- tavern: hire companions (scale to the main hero's level) ---------- */
const mainLevel=()=>party[0]?party[0].level:1;
const hireCostFor=h=>BAL.TAVERN.HIRE_BASE + h.level*BAL.TAVERN.HIRE_PER_LEVEL;
function refreshRecruits(free){
  const cost=free?0:BAL.TAVERN.REFRESH_COST;
  if(state.silver<cost) return false;
  state.silver-=cost;
  state.recruits=Array.from({length:BAL.TAVERN.RECRUITS},()=>makeCompanion((Math.random()*1e9)>>>0, mainLevel()));
  updateHud(); saveGame(); return true;
}
/* hire a stranger — only into an OPEN slot (party full → bench a companion first) */
function hireCompanion(recruit){
  const cost=hireCostFor(recruit);
  if(state.silver<cost || party.length>=PARTY_CAP) return false;
  const i=state.recruits.indexOf(recruit); if(i<0) return false;
  state.silver-=cost; state.recruits.splice(i,1); party.push(recruit);
  log(`${iconImg("tankard",14)} <b>${recruit.name}</b> the ${recruit.cls} (Lv ${recruit.level}) joins the party!`,"sys");
  refreshParty(); updateHud(); saveGame(); return true;
}
/* ---------- bench: drop a companion to the reserves (keeps their gear), add them back later ---------- */
const recallCost=h=>BAL.TAVERN.RECALL_BASE + (h.level||1)*BAL.TAVERN.RECALL_PER_LEVEL;
function benchCompanion(h){
  const i=party.indexOf(h);
  if(i<=0) return false;                              // never the main hero (index 0); must be in the party
  party.splice(i,1); state.bench.push(h);             // the whole hero moves — equipped gear, skills, potion, rolls all ride along
  log(`${iconImg("tankard",14)} <b>${h.name}</b> the ${h.cls} steps back to the reserves (gear kept).`,"sys");
  refreshParty(); updateHud(); saveGame(); return true;
}
function addFromBench(h){
  if(party.length>=PARTY_CAP) return false;           // no open slot
  const i=state.bench.indexOf(h); if(i<0) return false;
  const cost=recallCost(h); if(state.silver<cost) return false;
  state.silver-=cost; state.bench.splice(i,1); party.push(h);
  log(`${iconImg("tankard",14)} <b>${h.name}</b> the ${h.cls} (Lv ${h.level}) returns to the party.`,"sys");
  refreshParty(); updateHud(); saveGame(); return true;
}
function releaseFromBench(h){
  const i=state.bench.indexOf(h); if(i<0) return false;
  state.bench.splice(i,1);
  log(`${iconImg("tankard",14)} <b>${h.name}</b> parts ways with the company for good.`,"sys");
  refreshParty(); saveGame(); return true;
}
function openTavernScreen(){
  townRefresh=openTavernScreen;
  if(!state.recruits.length) refreshRecruits(true); // first visit fills the tavern for free
  openTavern({ silver:()=>state.silver, party:()=>party, bench:()=>state.bench, recruits:()=>state.recruits,
    partyCap:PARTY_CAP, hireCost:hireCostFor, recallCost, refreshCost:BAL.TAVERN.REFRESH_COST,
    hire:hireCompanion, drop:benchCompanion, addBack:addFromBench, release:releaseFromBench,
    refresh:()=>refreshRecruits(false), portrait:h=>heroPortrait(h),
    openHero, preview:previewRecruit, tileFlag:heroTileFlag, back:openTownScreen });
}
/* ---------- temple: resurrect fallen companions (fee scales with level) ---------- */
const resurrectFee=h=>BAL.TEMPLE.RESURRECT_BASE + h.level*BAL.TEMPLE.RESURRECT_PER_LEVEL;
function resurrectHero(h){
  const fee=resurrectFee(h);
  if(h.alive || state.silver<fee) return false;
  state.silver-=fee; h.alive=true; h.hp=derive(h).maxhp;
  renderParty(); updateHud(); saveGame();
  log(`${iconImg("temple",14)} <b>${h.name}</b> is restored to life.`,"sys");
  return true;
}
function openTempleScreen(){
  townRefresh=openTempleScreen;
  openTemple({ silver:()=>state.silver, party:()=>party, fee:resurrectFee,
    resurrect:resurrectHero, portrait:h=>heroPortrait(h), back:openTownScreen });
}
function rerollStock(free){
  const cost=free?0:BAL.SHOP.REROLL_COST;
  if(state.silver<cost) return false;
  state.silver-=cost;
  state.shopStock=Array.from({length:BAL.SHOP.STOCK},()=>generate(Math.random,{classes:partyClasses()}));
  updateHud(); saveGame(); return true;
}
function buyItem(item){
  const p=priceOf(item), i=state.shopStock.indexOf(item);
  if(i<0||state.silver<p) return false;
  state.silver-=p; state.shopStock.splice(i,1); state.inventory.push(item); updateHud(); saveGame(); return true;
}
function sellItem(item){
  const i=state.inventory.indexOf(item); if(i<0) return false;
  state.silver+=sellPriceOf(item); state.inventory.splice(i,1); updateHud(); saveGame(); return true;
}
function buyGem(){
  if(state.silver<BAL.SHOP.GEM_PRICE) return false;
  state.silver-=BAL.SHOP.GEM_PRICE; state.gems++; updateHud(); saveGame(); return true;
}
function openShopScreen(){
  townRefresh=openShopScreen;
  if(!state.shopStock.length) rerollStock(true); // first visit fills the shelves for free
  openShop({ silver:()=>state.silver, gems:()=>state.gems,
    stock:()=>state.shopStock, inventory:()=>state.inventory,
    priceOf, sellPriceOf, gemPrice:BAL.SHOP.GEM_PRICE, rerollCost:BAL.SHOP.REROLL_COST,
    buy:buyItem, sell:sellItem, buyGem, reroll:()=>rerollStock(false),
    potions:()=>state.potions, buyPotion, sellPotion,   // potions tab (folded in from the Apothecary)
    back:openTownScreen });
}
/* Travel to a room via the minimap — any reached room + the next one. Tapping the current room is a
   no-op (never re-seeds), and loadRoom no longer touches the boss timer, so hops don't reset it. */
function goToRoom(idx){
  if(idx===state.roomIdx || idx<0 || idx>Math.min(BOSS_ROOM,(state.roomMax||0)+1)) return;
  state.roomIdx=idx; state.roomMax=Math.max(state.roomMax||0, idx);
  const wasFighting=state.phase!=="idle";
  loadRoom(); seedBattle();
  state.phase = wasFighting ? "fight" : "idle";
  renderParty(); renderDungeonHeader(); saveGame();
}
/* the slim dungeon header: [☰ menu] title · currency  /  tappable minimap · speed · boss timer */
function renderDungeonHeader(){
  if(state.scene!=="dungeon" || !state.room){ dheadEl.classList.remove("show"); dmenufab.classList.remove("show"); return; }
  dheadEl.classList.add("show"); dmenufab.classList.add("show");
  const d=activeDungeon(), idx=state.roomIdx, max=state.roomMax||0, reach=Math.min(BOSS_ROOM,max+1);
  const roomName = idx===BOSS_ROOM ? d.boss.name : LAYOUTS[idx].roomName;
  let nodes="";
  for(let i=0;i<ROOM_COUNT;i++){
    const boss=i===BOSS_ROOM, cur=i===idx, done=i<=max&&!cur, next=i===max+1;
    const cls = cur?"cur": done?"done": next?"next":"lock";
    const glyph = boss?"☠": done?"✓":(i+1);
    nodes+=`<button class="dh-node ${cls} ${boss?"boss":""}" ${i<=reach?`data-room="${i}"`:""}><span class="dot">${glyph}</span></button>`;
  }
  let bossPill="";
  if(idx===BOSS_ROOM){
    const onCd=state.bossAt!==null&&state.t<state.bossAt, rem=onCd?Math.max(0,state.bossAt-state.t):0;
    const txt=onCd?`BOSS ${Math.floor(rem/60)}:${String(Math.floor(rem%60)).padStart(2,"0")}`:"BOSS ✦ READY";
    bossPill=`<span class="dh-boss ${onCd?"":"ready"}" data-boss>${txt}</span>`;
  }
  dheadEl.innerHTML=`<div class="dh-r1">
      <div class="dh-title"><b>${d.name}</b> <span>· ${roomName}</span></div>
      <span class="dh-cur"></span></div>
    <div class="dh-r2"><div class="dh-mini">${nodes}</div><span class="dh-spd" data-spd>${state.speed}×</span>${bossPill}</div>`;
  dheadEl.querySelectorAll("[data-room]").forEach(b=>b.onclick=()=>goToRoom(+b.getAttribute("data-room")));
  dheadEl.querySelector("[data-spd]").onclick=()=>{ state.speed=state.speed===1?2:1; renderDungeonHeader(); };
  updateHud();
}
/* live boss-timer text (cheap; only touches the DOM when the displayed value changes) */
function tickDungeonHeader(){
  if(state.scene!=="dungeon" || state.roomIdx!==BOSS_ROOM) return;
  const el=dheadEl.querySelector("[data-boss]"); if(!el) return;
  const onCd=state.bossAt!==null&&state.t<state.bossAt, rem=onCd?Math.max(0,state.bossAt-state.t):0;
  const txt=onCd?`BOSS ${Math.floor(rem/60)}:${String(Math.floor(rem%60)).padStart(2,"0")}`:"BOSS ✦ READY";
  if(el.textContent!==txt){ el.textContent=txt; el.classList.toggle("ready",!onCd); }
}
function dtoast(msg){ dtoastEl.textContent=msg; dtoastEl.classList.add("on");
  clearTimeout(dtoast._h); dtoast._h=setTimeout(()=>dtoastEl.classList.remove("on"),1800); }
/* the game-menu bottom sheet (replaces the old nav bar): Keep · World · Arena · Speed · Diagnostics.
   The delve auto-runs, so there is no Pause/Start — leaving to the Keep is how you stop. */
const MENU_ICONS={
  keep:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21v-9l2.5-1.6M20 21v-9l-2.5-1.6M6.5 10.4V4.6l2 1.1 1.7-1.1 1.8 1.1 1.7-1.1 2 1.1v5.8M4 12h16M9.5 21v-4.2h5V21"/></svg>`,
  world:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.4"/><path d="M3.6 12h16.8M12 3.6c2.4 2.3 3.7 5.3 3.7 8.4S14.4 18.1 12 20.4C9.6 18.1 8.3 15.1 8.3 12S9.6 5.9 12 3.6Z"/></svg>`,
  arena:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4l9.5 9.5M4 8.5L8.5 4M15.5 15.5L20 20M15 19l4-4M19 4l-9.5 9.5M20 8.5L15.5 4M8.5 15.5L4 20M9 19l-4-4"/></svg>`,
  speed:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 18a7 7 0 1 1 14 0"/><path d="M12 13l3.6-3.6"/></svg>`,
  diag:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M12 3v2.5M12 18.5V21M4.2 7.5l2.2 1.3M17.6 15.2l2.2 1.3M19.8 7.5l-2.2 1.3M6.4 15.2l-2.2 1.3"/></svg>`,
  log:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l3 3v15H6z"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>`,
  level:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 13l6-6 6 6M6 18l6-6 6 6"/></svg>`,
};
function openDMenu(){
  closeDLog();
  dmenuEl.innerHTML=`<div class="dscrim" data-dclose></div>
    <div class="dsheet"><div class="dsh"><span class="t">Menu</span>
      <span class="cur">${iconImg("coin",12)} ${state.silver}&nbsp;&nbsp;${iconImg("gem",12)} ${state.gems}</span>
      <span class="x" data-dclose>✕</span></div>
    <div class="dmgrid">
      <div class="dmrow" data-mact="keep">${MENU_ICONS.keep}<span>Keep</span></div>
      <div class="dmrow" data-mact="world">${MENU_ICONS.world}<span>World map</span></div>
      <div class="dmrow" data-mact="arena">${MENU_ICONS.arena}<span>Arena</span></div>
      <div class="dmrow" data-mact="speed">${MENU_ICONS.speed}<span>Speed ${state.speed}×</span></div>
      <div class="dmrow wide ${state.autoLevel?"on":""}" data-mact="autolvl">${MENU_ICONS.level}<span>Auto-level companions</span><span class="dm-tag">${state.autoLevel?"On":"Off"}</span></div>
      <div class="dmrow wide" data-mact="log">${MENU_ICONS.log}<span>Combat log</span></div>
      <div class="dmrow wide" data-mact="diag">${MENU_ICONS.diag}<span>Diagnostics &amp; log export</span></div>
    </div></div>`;
  dmenuEl.querySelectorAll("[data-dclose]").forEach(x=>x.onclick=closeDMenu);
  dmenuEl.querySelectorAll("[data-mact]").forEach(b=>b.onclick=()=>menuAct(b.getAttribute("data-mact")));
  dmenuEl.classList.add("show");
}
function closeDMenu(){ dmenuEl.classList.remove("show"); }
function menuAct(a){
  if(a==="speed"){ state.speed=state.speed===1?2:1; renderDungeonHeader(); openDMenu(); return; }   // stay open; reflect new speed
  if(a==="autolvl"){ toggleAutoLevel(); openDMenu(); return; }   // stay open; reflect On/Off + apply any backlog
  if(a==="log") return openDLog();   // openDLog swaps the menu sheet for the log pop-up
  closeDMenu();
  if(state.scene!=="dungeon") return;
  if(a==="keep") return enterTown();
  if(a==="world"){ enterTown(); openDungeonBoard(); return; }
  if(a==="arena") return dtoast("The Arena opens soon — PvP challenges are in the forge");
  if(a==="diag"){ enterTown(); openDiagScreen(); return; }
}
{ let fav=document.querySelector("link[rel='icon']");
  if(!fav){ fav=document.createElement("link"); fav.rel="icon"; document.head.appendChild(fav); }
  fav.href=iconCanvas("sword",64).toDataURL(); }
/* tap the dungeon floor to plant a rally flag; idle pals (no foe engaged) regroup there */
cvG.addEventListener("click", e=>{
  if(state.scene!=="dungeon" || panelShown() || !state.room) return;
  const rect=cvG.getBoundingClientRect();
  const px=(e.clientX-rect.left)/rect.width*CW, py=(e.clientY-rect.top)/rect.height*CH;
  const c=Math.floor((px-cx0g(0))/T), r=Math.floor((py-cy0g(0))/T);
  if(r<0||c<0||r>=GROWS||c>=GCOLS||isBlocked(state.room,r,c)) return;  // any reachable floor cell
  state.rally={r,c};
});

/* ---------- render ---------- */
function drawUnit(u){
  if(!u.alive) return;
  if(u.r==null||u.c==null) return;  // alive but not on the field yet (e.g. a pal just hired in town)
  const tile=tileOf(u), S=tile.S, pal=tile.pal;
  const gx=uxS(u), gy=uyS(u);
  // little hop while sliding between cells, tiny idle breath while standing
  const moving=(u.moveT!==undefined&&u.moveT<1);
  const hop=moving ? -Math.sin(u.moveT*Math.PI)*4 : Math.sin(state.t*2.4+u.c*1.7)*1.0;
  let ox=0,oy=0;
  if(u.lunge){ if(!uiFrozen) u.lunge.t+=0.016*state.speed;
    const k=Math.sin(Math.min(1,u.lunge.t/0.22)*Math.PI);
    ox=(u.lunge.tx-gx)*0.20*k; oy=(u.lunge.ty-gy)*0.20*k;
    if(u.lunge.t>0.24)u.lunge=null; }
  const px=gx+ox, py=gy+hop+oy; // centered exactly on the floor cell
  // contact shadow directly under the tile center
  G.save(); G.globalAlpha=.35; ell(G,gx,gy+S*0.44,S*0.36,S*0.10,"#060409"); G.restore();
  G.save(); G.shadowColor=pal.glow; G.shadowBlur=u.boss?14:8;
  G.drawImage(tile.canvas,px-S/2,py-S/2,S,S); G.restore();
  if(u.flash>0){ G.save(); G.globalAlpha=Math.min(1,u.flash*4)*.7; G.globalCompositeOperation="lighter";
    G.drawImage(tile.canvas,px-S/2,py-S/2,S,S); G.restore(); if(!uiFrozen) u.flash-=0.016*state.speed; }
  // crown above the main hero so the leader reads at a glance
  if(u.team===0 && u===party[0]){ const cw=Math.max(13,Math.round(S*0.42));
    G.drawImage(iconCanvas("crown",cw*2), px-cw/2, py-S/2-cw*0.7, cw, cw); }
  // enemy level badge at the tile's bottom-right corner
  if(u.team===1 && u.level){ const bs=Math.max(12,Math.round(S*0.32)), bx=px+S*0.4, by=py+S*0.38;
    G.fillStyle="#2a0d0d"; rrp(G,bx-bs/2,by-bs/2,bs,bs,bs*0.32); G.fill();
    G.strokeStyle="#ff9a5c"; G.lineWidth=1.3; rrp(G,bx-bs/2,by-bs/2,bs,bs,bs*0.32); G.stroke();
    G.fillStyle="#ffd8c0"; G.font="bold "+Math.round(bs*0.62)+"px monospace"; G.textAlign="center"; G.textBaseline="middle";
    G.fillText(u.level,bx,by+0.5); G.textBaseline="alphabetic"; }
  // HP capsule under the tile (same schema for heroes and enemies now)
  const mh=derive(u).maxhp, hw=S*0.7, hh=Math.max(3.5,S*0.085);
  const hx=px-hw/2, hy=py+S*0.5+2;
  G.fillStyle="#0c0814"; rrp(G,hx-1.5,hy-1.5,hw+3,hh+3,hh); G.fill();
  G.fillStyle="#241a2e"; rrp(G,hx,hy,hw,hh,hh/2); G.fill();
  const pct=clamp(u.hp/mh,0,1);
  if(pct>0){ const hg=G.createLinearGradient(0,hy,0,hy+hh);
    if(u.team===0){ hg.addColorStop(0,"#9df09a"); hg.addColorStop(1,"#3fae4a"); }
    else{ hg.addColorStop(0,"#ff8a80"); hg.addColorStop(1,"#c92e2e"); }
    G.fillStyle=hg; rrp(G,hx,hy,Math.max(hh,hw*pct),hh,hh/2); G.fill(); }
  if(u.team===0){
    G.fillStyle="#0c0814"; rrp(G,hx-hh*1.6,hy-1.5,hh*1.7,hh+3,3); G.fill();
    G.fillStyle="#f4e3c1"; G.font="bold "+Math.round(hh*1.1)+"px monospace";
    G.textAlign="center"; G.textBaseline="middle";
    G.fillText(u.level, hx-hh*0.75, hy+hh/2); G.textBaseline="alphabetic";
  }
  if(u.boss){ G.fillStyle="#ffdf6b"; G.font="bold 8px monospace"; G.textAlign="center";
    G.fillText("· BOSS ·",px,py-S/2-2); }
}
/* rally flag: a small planted pennant heroes regroup on between fights */
function drawFlag(cx,cy){
  const sway=Math.sin(state.t*3)*1.6;
  G.save();
  G.strokeStyle="rgba(216,162,74,.6)"; G.lineWidth=1.5;
  G.beginPath(); G.ellipse(cx,cy+6,7,2.8,0,0,7); G.stroke();      // ground ring
  G.strokeStyle="#c9b78a"; G.lineWidth=2;
  G.beginPath(); G.moveTo(cx,cy+6); G.lineTo(cx,cy-16); G.stroke();  // pole
  G.fillStyle="#d8a24a"; G.beginPath();
  G.moveTo(cx,cy-16); G.lineTo(cx+13+sway,cy-12); G.lineTo(cx,cy-8); G.closePath(); G.fill();
  G.strokeStyle="#6e4a14"; G.lineWidth=1; G.stroke();               // pennant
  G.restore();
}
/* (The room compass + boss timer moved to the DOM dungeon header — see renderDungeonHeader.) */
function render(dt){
  G.setTransform(2,0,0,2,0,0);
  G.drawImage(state.room.base,0,0,CW,CH);
  for(const p of state.room.parts) drawPartPx(G,p,state.t);
  if(state.rally) drawFlag(cx0g(state.rally.c)+T/2, cy0g(state.rally.r)+T/2);
  // draw heroes + foes together, back-to-front; drawUnit skips the dead so fallen pals don't render
  const sorted=[...party,...state.foes].sort((a,b)=>a.r-b.r||a.c-b.c);
  for(const u of sorted) drawUnit(u);
  fxUpdateDraw(G,dt);
  if(state.phase==="idle"){
    G.fillStyle="#e8dcc4"; G.font="bold 13px monospace"; G.textAlign="center";
    G.fillText("Press Fight! to begin",CW/2,CH-8);
  } else if(state.phase==="paused"){
    G.fillStyle="#e8dcc4"; G.font="bold 13px monospace"; G.textAlign="center";
    G.fillText("Paused",CW/2,CH-8);
  }
}
/* ---------- main loop ---------- */
let last=performance.now();
function loop(now){
  let dt=Math.min(0.05,(now-last)/1000); last=now; dt*=state.speed;
  // A per-frame exception must never break the animation-frame chain (that's a hard freeze).
  // Catch, log once, and keep requesting frames so the game recovers on the next tick.
  try{
    // The battle keeps running behind overlays now (the Loot Roll popup and the character view sit on a
    // see-through scrim) — an idle-battler never pauses just because a window is open. Only the manual
    // Pause button (state.phase) stops the fight.
    const frozen=false; uiFrozen=false;
    if(!frozen){
      state.t+=dt;
      if(state.scene==="dungeon" && state.phase==="fight"){
        for(const u of liveUnits()){
          if(!u.alive)continue;   // a unit killed earlier this same tick shouldn't still act
          tickBuffs(u);           // advance bleeds / regen / expire timed buffs
          if(!u.alive)continue;   // a bleed may have finished it off
          tryQuaff(u);            // auto-quaff the equipped potion when it fits
          if(state.t>=u.next){ act(u); u.next=state.t+BAL.BASE_INTERVAL/derive(u).aspd+combatRng()*BAL.ASPD_JITTER; }
        }
        updateWaves();
        // endless map: respawn a fresh wave on its timer
        if(state.respawnAt!==null && state.t>=state.respawnAt){ state.respawnAt=null; spawnWave(); }
        // full wipe: pull back to the Keep (main revives free there; fallen pals need the Temple)
        if(state.wipeAt!==null && state.t>=state.wipeAt){ state.wipeAt=null; enterTown(true); }
        // prune slain FOES only (heroes are never pruned — they live in `party`, dead or alive)
        state.foes=state.foes.filter(f=>f.alive);
      }
      // advance grid-slide interpolation for every live unit
      for(const u of liveUnits()){ if(u.moveT!==undefined&&u.moveT<1)
        u.moveT=Math.min(1,u.moveT+dt*6.5); }
    }
    render(frozen?0:dt);
    if(state.scene==="dungeon" && !frozen){ tickPotionBoxes(); tickDungeonHeader(); }   // live recharge rings + boss timer
  }catch(err){
    // Recovered per-frame error: log the first few (with a state snapshot) to the diagnostics
    // buffer so it can be exported from the Keep, but never spam or break the frame chain.
    loop._errs=(loop._errs||0)+1;
    if(loop._errs<=3){ console.error("DP loop frame error (recovered):",err);
      diag("state", JSON.stringify({scene:state.scene,phase:state.phase,frozen:uiFrozen,
        foes:state.foes.length,heroes:liveHeroes().length,roomIdx:state.roomIdx,rally:state.rally,t:+state.t.toFixed(1)})); }
  }
  requestAnimationFrame(loop);
}
/* assemble a copy-pasteable diagnostics export: live state + captured errors + combat log */
function buildDiagnostics(){
  const snap={ scene:state.scene, phase:state.phase, panelShown:panelShown(), frozen:uiFrozen,
    speed:state.speed, roomIdx:state.roomIdx, rally:state.rally, silver:state.silver, gems:state.gems,
    foes:state.foes.length, heroesAlive:liveHeroes().length, inventory:state.inventory.length, recruits:state.recruits.length,
    respawnAt:state.respawnAt, wipeAt:state.wipeAt, loopErrs:loop._errs||0,
    party:party.map(h=>({name:h.name,cls:h.cls,lv:h.level,hp:h.hp,alive:h.alive})) };
  const logLines=[...logEl.children].slice(-40).map(d=>d.textContent).join("\n");
  return [
    `Dungeon Pals — The Emberdeep · diagnostics`,
    `build: ${APP_BUILD}`,
    `time: ${new Date().toISOString()}`,
    ``, `== state ==`, JSON.stringify(snap,null,2),
    ``, `== event / error log ==`, diagText()||"(none)",
    ``, `== combat log (recent) ==`, logLines||"(empty)",
  ].join("\n");
}
/* boot: splash → login → pick a save slot → (new) create a hero, or (continue) load the slot */
let loopStarted=false;
function beginRun(){
  loadRoom(); renderParty(); updateHud();
  saveGame();           // persist the freshly created/loaded state
  enterTown();          // open the hub, not straight into a fight
  if(!loopStarted){ loopStarted=true; requestAnimationFrame(loop); }   // one RAF loop for the session — re-entry never stacks another
}
/* Save the run and drop back to the login / save-slot screen (the loop keeps ticking under the flow). */
function saveExitToLogin(){
  saveGame();
  overlay.classList.remove("show"); overlay.innerHTML="";   // dismiss any open panel / loot roll
  heroPanelOpen=false; lootQ=[]; lootOpen=false;
  townEl.classList.remove("show");
  dheadEl.classList.remove("show"); dmenufab.classList.remove("show"); closeDLog(); closeDMenu();
  state.scene="town";                                       // park the loop (no dungeon ticking) behind the flow
  startOnboarding(ONBOARD_CB);
}
const ONBOARD_CB = {
  onNewGame:(hero, slot)=>{
    activeSlot=slot;
    party=[hero]; state.silver=BAL.STARTING_SILVER; state.gems=0; state.inventory=[]; state.potions=[]; state.roomIdx=0;
    state.dungeonId="emberdeep"; state.cleared=[];   // fresh ladder
    log(`Welcome to <span class="sys">The Emberdeep</span>, <b>${hero.name}</b> the ${hero.cls}.`,"sys");
    log(`Recruit up to two pals at the Tavern, gear up, then <b>Descend</b>. Fallen pals can be restored at the Temple.`,"sys");
    beginRun();
  },
  onContinue:(slot)=>{
    activeSlot=slot; loadGame(readSlot(slot)||{});
    const m=party[0];
    log(`Welcome back to <span class="sys">The Emberdeep</span>${m?`, <b>${m.name}</b>`:""}.`,"sys");
    beginRun();
  },
};
startOnboarding(ONBOARD_CB);
