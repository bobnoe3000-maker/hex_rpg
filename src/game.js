import { clamp, ell, T, CW, CH, drawPartPx, mulberry32 } from './engine/core.js';
import { makeHeroPortrait } from './engine/portraits.js';
import { buildFigure } from './engine/creatures.js';
import { iconImg, iconCanvas } from './engine/icons.js';
import { fxUpdateDraw, fxClear, fxText, fxSlash, fxBolt, fxDissolve, fxRing, fxBlock } from './engine/fx.js';
import { GCOLS, GROWS, buildGameRoom, cx0g, cy0g, isBlocked } from './engine/dungeon.js';
import { xpToReach, ROOMS_SPEC } from './engine/combat.js';
import { unspentPoints, earnedPoints, pointsForLevel, ASSIGNABLE, emptyPoints } from './systems/Leveling.js';
import { combatMods, activeSkills, unspentSkillPoints, branchInvested, tierUnlocked, rankOf, allSkills,
         reflectFrac, guardianFrac, waveHealFrac, lastStand, momentum } from './systems/Skills.js';
import { CLASS_SKILLS, TIER_GATES, MAX_RANK } from './data/skills.js';
import { HERO_BASES } from './data/classes.js';
import { BAL } from './data/balance.js';
import { derive, mitigate } from './systems/StatEngine.js';
import { resolveAttack } from './systems/CombatSim.js';
import { generate, describeItem } from './systems/LootGenerator.js';
import { upgrade as forgeUpgrade, canUpgrade, forgePreview, forgeCost } from './systems/ForgeSystem.js';
import { priceOf, sellPriceOf } from './systems/Economy.js';
import { openCharacter } from './ui/CharacterPanel.js';
import { openTown } from './ui/TownScreen.js';
import { openShop } from './ui/ShopScreen.js';
import { openTavern } from './ui/TavernScreen.js';
import { openTemple } from './ui/TempleScreen.js';
import { openForge } from './ui/ForgeScreen.js';
import { openDiag } from './ui/DiagScreen.js';
import { startOnboarding } from './ui/Onboarding.js';
import { makeCompanion } from './models/units.js';
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
      overlay=document.getElementById("overlay"), btnStart=document.getElementById("btnStart"),
      btnNext=document.getElementById("btnNext"), btnSpeed=document.getElementById("btnSpeed"),
      btnTown=document.getElementById("btnTown"), townEl=document.getElementById("town"),
      logWrap=document.getElementById("logwrap"), logBar=document.getElementById("logbar"),
      logToggle=document.getElementById("logToggle");
/* combat log: cycle min → mid → max → min */
const LOG_STATES=["min","mid","max"], LOG_LABEL={min:"▤ expand",mid:"▤ full · ▁ min",max:"▁ minimize"};
function setLogState(st){ logWrap.dataset.s=st; logToggle.textContent=LOG_LABEL[st];
  logEl.scrollTop=logEl.scrollHeight; }
logBar.onclick=()=>{ const i=LOG_STATES.indexOf(logWrap.dataset.s||"mid");
  setLogState(LOG_STATES[(i+1)%LOG_STATES.length]); };
setLogState("mid");
/* phase: idle → fight ⇄ paused. inventory holds dropped loot; respawn/revive are timers. */
const state={ roomIdx:0, scene:"town", phase:"idle", room:null, foes:[], t:0, speed:1,
  inventory:[], gems:0, silver:0, shopStock:[], recruits:[], respawnAt:null, wipeAt:null,
  rally:null };      // {r,c} flag heroes regroup on when no foe is engaged
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
let party=[];               // filled by onboarding: [main, ...companions]
const PARTY_CAP=3;          // main + 2 companions ("two companions only"); Tavern replaces the fallen
/* ---------- persistence: one of three save slots ---------- */
let activeSlot=null;        // which save slot this run writes to (set by onboarding)
function snapshotState(){
  return { v:SAVE_VERSION, party, silver:state.silver, gems:state.gems,
    inventory:state.inventory, roomIdx:state.roomIdx, savedAt:new Date().toISOString() };
}
function saveGame(){ if(activeSlot!==null) writeSlot(activeSlot, snapshotState()); }
function loadGame(save){
  party=(save.party||[]).map(h=>({alive:true, pts:emptyPoints(), skills:{}, ...h}));   // defaults for older saves
  state.silver=save.silver||0; state.gems=save.gems||0;
  state.inventory=save.inventory||[]; state.roomIdx=save.roomIdx||0;
}
const partyClasses=()=>party.length?[...new Set(party.map(h=>h.cls))]:["fighter","mage","cleric","rogue"];
let combatRng=Math.random;  // reseeded deterministically when a fight starts / area changes
/* tiny currency readout in the log header */
const hudEl=document.createElement("span");
hudEl.style.cssText="font-size:10px;color:#d8c47a;letter-spacing:1px;margin:0 6px 0 auto";
logBar.insertBefore(hudEl, logToggle);
function updateHud(){ hudEl.innerHTML=`${iconImg("coin",13)} ${state.silver}&nbsp;&nbsp;${iconImg("gem",13)} ${state.gems}`; }
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
function renderParty(){
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
    const bag=Object.values(h.gear).filter(Boolean).length;
    const info=document.createElement("div");
    info.innerHTML=`${isMain?iconImg("crown",12)+" ":""}<b>${h.name}</b> <span class="lvl">Lv${h.level}</span> <span class="cls">${h.cls}</span><br>
      ${h.alive ? `<span style="opacity:.7">ATK ${D.atk} · DEF ${D.def}</span>
      <div class="bar"><i style="width:${clamp(h.hp/D.maxhp*100,0,100)}%"></i></div>
      ${h.hp}/${D.maxhp}<div class="gear">${bag} equipped · tap for gear ›</div>`
        : `<span class="fallen">${iconImg("skull",11)} Fallen — restore at the Temple</span>`}`;
    c.appendChild(picWrap); c.appendChild(info); partyEl.appendChild(c);
  }
}
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
function spawnWave(){
  const spec=ROOMS_SPEC[state.roomIdx];
  // NPCs appear on random reachable floor cells, kept off the hero line at the bottom when possible.
  // Enemy level scales with how deep you are, so the badge on each tile means something.
  spec.spawn().forEach((f,i)=>{
    const cell=randFloor((r,c)=>r<=GROWS-4) || randFloor();
    if(!cell) return;
    f.r=cell.r; f.c=cell.c; f.rr=f.r; f.cc=f.c; f.moveT=1; f.next=state.t+0.7+0.2*i;
    f.level=state.roomIdx+1+(f.boss?1:0); resetCombat(f);
    state.foes.push(f); figOf(f); });
}
function loadRoom(){
  const spec=ROOMS_SPEC[state.roomIdx];
  state.room=buildGameRoom((Date.now()+state.roomIdx*7919)|0,spec);
  state.foes=[]; fxClear(); state.respawnAt=null; state.wipeAt=null; state.rally=null;
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
function resetCombat(u){ u.buffs=[]; u.cd={}; u.mLast=0; }
function adjFoes(u){ return livingFoes(u.team).filter(f=>distU(f,u)<=1); }
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
  for(const b of u.buffs){ if(b.k==="bleed" && u.alive && state.t>=b.nextTick){ b.nextTick+=0.5;
    hurt(u, Math.max(1,Math.round(b.dps*0.5)), b.src); } }
  u.buffs = u.buffs.filter(b=> b.until==null || state.t<b.until);
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
      k==="rally"   ? true :
      k==="unbreak" ? (u.hp/derive(u).maxhp<0.55 || adjFoes(u).length>=2) :
      (k==="guard"||k==="taunt") ? d<=2 :
      d<=Math.max(1,R);                       // melee strikes need a foe in reach
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
      if(u.boss||combatRng()<BAL.DROP_CHANCE){
        const drop=generate(combatRng,{classes:partyClasses()});
        state.inventory.push(drop);
        log(`${iconImg("chest",14)} <b>${u.name}</b> drops <span class="sys">${drop.n}</span> <span style="opacity:.6">→ bag (${state.inventory.length})</span>`);
        fxText(uxS(u),uyS(u)-30,"+"+drop.n.split(" ").pop(),"#ffd166");
        saveGame();          // persist fresh loot so a drop survives a reload mid-run
      }
      if(combatRng()<(u.boss?BAL.GEM_CHANCE_BOSS:BAL.GEM_CHANCE)){ state.gems++;
        log(`${iconImg("gem",14)} <b>${u.name}</b> drops a <span class="sys">Runic Gem</span> <span style="opacity:.6">(${state.gems})</span>`,"sys");
        fxText(uxS(u),uyS(u)-46,"gem","#9ad1ff"); }
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
   each level grants assignable points instead (spent in the character panel). Companions keep the
   fixed per-class growth block. */
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
        const gr=HERO_BASES[h.cls].growth;
        h.atk+=gr.atk; h.def+=gr.def; h.dodge+=gr.dodge; h.crit+=gr.crit; h.maxhp+=gr.hp;
        h.hp=derive(h).maxhp;
        log(`${iconImg("spark",14)} <b>${h.name}</b> reaches <span class="sys">level ${h.level}</span>! (+${gr.hp} HP, +${gr.atk} ATK)`,"heal");
      }
      fxRing(uxS(h),uyS(h)+6,"#7ee787"); fxText(uxS(h),uyS(h)-44,"LEVEL UP!","#7ee787",true);
    } }
  renderParty();
  if(leveled) saveGame();   // persist a level-up so hard-won progress survives a reload mid-run
}
/* Commit a pending point allocation for the main hero. `deltas` maps stat→signed count (add/remove).
   Validated against available points; grants any HP increase, clamps current HP on a refund. */
function assignPoints(h, deltas){
  if(h!==party[0]) return false;                       // main hero only
  const next={...emptyPoints(), ...(h.pts||{})};
  for(const k of ASSIGNABLE) next[k]=Math.max(0,(next[k]||0)+(deltas[k]||0));
  // reject an allocation that would overspend the earned pool
  let spent=0; for(const k of ASSIGNABLE) spent+=next[k];
  if(spent>earnedPoints(h.level)) return false;
  const before=derive(h).maxhp;
  h.pts=next;
  const after=derive(h).maxhp;
  if(after>before) h.hp=Math.min(after,h.hp+(after-before));   // new HP is granted live
  else h.hp=Math.min(h.hp,after);                              // refunded HP → clamp down
  renderParty(); updateHud(); saveGame();
  return true;
}
/* Learn (+1) or unlearn (−1) a skill rank for the main hero. Validated against tier gates and the
   available skill-point pool; unlearning cascades a refund of any rank left stranded above a gate. */
function assignSkill(h, id, delta){
  if(h!==party[0]) return false;
  const sk=allSkills(h.cls).find(s=>s.id===id); if(!sk) return false;
  h.skills=h.skills||{};
  const cur=h.skills[id]||0;
  if(delta>0){
    if(cur>=MAX_RANK) return false;
    if(!tierUnlocked(h,h.cls,sk.br,sk.tier)) return false;
    if(unspentSkillPoints(h)<=0) return false;
    h.skills[id]=cur+1;
  } else {
    if(cur<=0) return false;
    h.skills[id]=cur-1; if(h.skills[id]===0) delete h.skills[id];
  }
  // refund any rank whose tier is no longer unlocked
  let changed=true;
  while(changed){ changed=false;
    for(const s of allSkills(h.cls)){ const r=h.skills[s.id]||0;
      if(r>0 && !tierUnlocked(h,h.cls,s.br,s.tier)){ delete h.skills[s.id]; changed=true; } } }
  renderParty(); updateHud(); saveGame();
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
    state.respawnAt=state.t+BAL.RESPAWN_DELAY;
    for(const h of party) if(h.alive){ const mh=derive(h).maxhp;
      const heal=Math.round(mh*BAL.WAVE_HEAL_FRAC)+Math.round(mh*waveHealFrac(h));   // + Second Wind
      h.hp=Math.min(mh,h.hp+heal); }
    renderParty();
    log(`${iconImg("check",14)} <span class="sys">Wave cleared.</span> Another approaches…`);
  }
}
/* ---------- controls & menus ---------- */
function syncButtons(){
  btnStart.textContent = state.phase==="idle" ? "Fight!" : state.phase==="fight" ? "Pause" : "Resume";
  btnStart.disabled=false;
  btnNext.disabled=false;
}
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
  // resumes exactly where the fight left off. No separate flag to leak.
  openCharacter(h, {
    inventory: state.inventory,
    portrait: heroPortrait(h),
    isMain: h===party[0],
    xp: xpProgress,
    points: h===party[0] ? ()=>unspentPoints(h) : null,   // only the main hero allocates points
    assign: h===party[0] ? d=>assignPoints(h, d) : null,
    skills: h===party[0] && CLASS_SKILLS[h.cls] ? {
      tree: CLASS_SKILLS[h.cls],
      ranks: ()=>h.skills||{},
      points: ()=>unspentSkillPoints(h),
      invested: br=>branchInvested(h,h.cls,br),
      unlocked: (br,tier)=>tierUnlocked(h,h.cls,br,tier),
      gates: TIER_GATES, maxRank: MAX_RANK,
      learn: (id,d)=>assignSkill(h,id,d),
    } : null,
    refresh: renderParty,
    gems: ()=>state.gems,
    silver: ()=>state.silver,
    close: ()=>{},
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
  openTownScreen();
  saveGame();          // persist the run whenever you're back at the Keep (loot, revives, etc.)
  diag("scene", `keep${fromWipe?" · wipe":""} · party ${party.filter(h=>h.alive).length}/${party.length}`);
}
function enterDungeon(){
  state.scene="dungeon"; townEl.classList.remove("show");
  if(state.phase==="idle") seedBattle();
  placeHeroes();              // form up the living party (incl. any pals hired/resurrected since)
  state.phase="fight"; syncButtons();
  diag("scene", `descend · room ${state.roomIdx} · party ${party.filter(h=>h.alive).length}`);
}
function openTownScreen(){
  openTown({ silver:()=>state.silver, gems:()=>state.gems, party, portrait:h=>heroPortrait(h),
    openHero, openShop:openShopScreen, openTavern:openTavernScreen, openTemple:openTempleScreen,
    openForge:openForgeScreen, openDiag:openDiagScreen, enterDungeon });
}
function openDiagScreen(){ openDiag({ text:buildDiagnostics, back:openTownScreen }); }
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
  openForge({ gems:()=>state.gems, silver:()=>state.silver, gear:allGear, party:()=>party, portrait:h=>heroPortrait(h),
    preview:forgePreview, forge:tryForge, back:openTownScreen });
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
function hireCompanion(recruit){
  const cost=hireCostFor(recruit);
  if(state.silver<cost) return false;
  const i=state.recruits.indexOf(recruit); if(i<0) return false;
  if(party.length<PARTY_CAP){                       // open slot → new pal joins
    state.silver-=cost; state.recruits.splice(i,1); party.push(recruit);
    log(`${iconImg("tankard",14)} <b>${recruit.name}</b> the ${recruit.cls} (Lv ${recruit.level}) joins the party!`,"sys");
  } else {                                           // party full → hire replaces a fallen companion
    const dead=party.findIndex((h,idx)=>idx>0 && !h.alive);
    if(dead<0) return false;                         // full and all alive → nothing to replace
    const fallen=party[dead];
    state.silver-=cost; state.recruits.splice(i,1); party[dead]=recruit;
    log(`${iconImg("tankard",14)} <b>${recruit.name}</b> the ${recruit.cls} (Lv ${recruit.level}) replaces the fallen <b>${fallen.name}</b>.`,"sys");
  }
  renderParty(); updateHud(); saveGame();
  return true;
}
function openTavernScreen(){
  if(!state.recruits.length) refreshRecruits(true); // first visit fills the tavern for free
  openTavern({ silver:()=>state.silver, party:()=>party, recruits:()=>state.recruits,
    hireCost:hireCostFor, refreshCost:BAL.TAVERN.REFRESH_COST,
    hire:hireCompanion, refresh:()=>refreshRecruits(false), portrait:h=>heroPortrait(h),
    openHero, back:openTownScreen });
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
  if(!state.shopStock.length) rerollStock(true); // first visit fills the shelves for free
  openShop({ silver:()=>state.silver, gems:()=>state.gems,
    stock:()=>state.shopStock, inventory:()=>state.inventory,
    priceOf, sellPriceOf, gemPrice:BAL.SHOP.GEM_PRICE, rerollCost:BAL.SHOP.REROLL_COST,
    buy:buyItem, sell:sellItem, buyGem, reroll:()=>rerollStock(false),
    back:openTownScreen });
}
function nextArea(){
  state.roomIdx=(state.roomIdx+1)%ROOMS_SPEC.length;
  const wasFighting = state.phase!=="idle";
  loadRoom(); seedBattle();
  state.phase = wasFighting ? "fight" : "idle";
  renderParty(); syncButtons();
}
btnStart.onclick=()=>{
  if(state.phase==="idle"){ seedBattle(); state.phase="fight"; }
  else if(state.phase==="fight"){ state.phase="paused"; }
  else if(state.phase==="paused"){ state.phase="fight"; }
  syncButtons();
};
btnNext.onclick=()=>{ if(state.phase!=="paused") nextArea(); };
btnTown.onclick=()=>{ if(state.scene==="dungeon") enterTown(); };
btnTown.innerHTML=iconImg("house",18);   // replace the emoji label with a sprite
{ let fav=document.querySelector("link[rel='icon']");
  if(!fav){ fav=document.createElement("link"); fav.rel="icon"; document.head.appendChild(fav); }
  fav.href=iconCanvas("sword",64).toDataURL(); }
btnSpeed.onclick=()=>{ state.speed=state.speed===1?2:1; btnSpeed.textContent=`${state.speed}×`; };
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
/* Rune Compass — a corner dial of the descent: current room glows, cleared rooms fill, the boss
   room carries a ring. Overlays the top-right void margin so it never covers the fight. */
function drawCompass(){
  if(!state.room) return;
  const n=ROOMS_SPEC.length, cur=state.roomIdx;
  const pw=Math.min(CW-16, 52+(n-1)*20), ph=40, x=CW-pw-8, y=8;
  G.fillStyle="rgba(12,9,22,.82)"; rrp(G,x,y,pw,ph,9); G.fill();
  G.strokeStyle="rgba(216,162,74,.45)"; G.lineWidth=1.2; rrp(G,x,y,pw,ph,9); G.stroke();
  G.fillStyle="#d8a24a"; G.font="bold 8px monospace"; G.textAlign="left"; G.textBaseline="alphabetic";
  G.fillText("ROOM "+(cur+1)+" / "+n, x+9, y+13);
  const nx0=x+13, span=(pw-26), ny=y+27, X=i=> nx0+span*(n>1?i/(n-1):0);
  for(let i=0;i<n-1;i++){ G.strokeStyle= i<cur?"rgba(216,162,74,.6)":"rgba(120,110,150,.3)"; G.lineWidth=2;
    G.beginPath(); G.moveTo(X(i),ny); G.lineTo(X(i+1),ny); G.stroke(); }
  for(let i=0;i<n;i++){ const nx=X(i), isCur=i===cur, past=i<cur, boss=i===n-1;
    if(isCur){ const pl=1+.25*Math.sin(state.t*3); const rg=G.createRadialGradient(nx,ny,0,nx,ny,8*pl);
      rg.addColorStop(0,"rgba(216,162,74,.6)"); rg.addColorStop(1,"rgba(216,162,74,0)"); G.fillStyle=rg;
      G.beginPath(); G.arc(nx,ny,8*pl,0,7); G.fill(); }
    G.fillStyle= isCur?"#f0d48a": past?"#d8a24a": boss?"#7a3f2c":"#2f2740";
    G.beginPath(); G.arc(nx,ny, boss?4.2:isCur?4:3,0,7); G.fill();
    if(boss){ G.strokeStyle=isCur?"#ff9a5c":"#8a4a34"; G.lineWidth=1.2; G.beginPath(); G.arc(nx,ny,6,0,7); G.stroke(); } }
  G.textBaseline="alphabetic";
}
function render(dt){
  G.setTransform(2,0,0,2,0,0);
  G.drawImage(state.room.base,0,0,CW,CH);
  for(const p of state.room.parts) drawPartPx(G,p,state.t);
  if(state.rally) drawFlag(cx0g(state.rally.c)+T/2, cy0g(state.rally.r)+T/2);
  // draw heroes + foes together, back-to-front; drawUnit skips the dead so fallen pals don't render
  const sorted=[...party,...state.foes].sort((a,b)=>a.r-b.r||a.c-b.c);
  for(const u of sorted) drawUnit(u);
  fxUpdateDraw(G,dt);
  drawCompass();
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
    // A panel open over the dungeon freezes time completely: no combat, no animation, no FX advance.
    // Derived from the overlay's real visibility so it can never stick frozen.
    const frozen=panelShown(); uiFrozen=frozen;
    if(!frozen){
      state.t+=dt;
      if(state.scene==="dungeon" && state.phase==="fight"){
        for(const u of liveUnits()){
          if(!u.alive)continue;   // a unit killed earlier this same tick shouldn't still act
          tickBuffs(u);           // advance bleeds / expire timed buffs
          if(!u.alive)continue;   // a bleed may have finished it off
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
function beginRun(){
  loadRoom(); renderParty(); syncButtons(); updateHud();
  saveGame();           // persist the freshly created/loaded state
  enterTown();          // open the hub, not straight into a fight
  requestAnimationFrame(loop);
}
startOnboarding({
  onNewGame:(hero, slot)=>{
    activeSlot=slot;
    party=[hero]; state.silver=BAL.STARTING_SILVER; state.gems=0; state.inventory=[]; state.roomIdx=0;
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
});
