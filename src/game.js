import { clamp, ell, T, CW, CH, drawPartPx, mulberry32 } from './engine/core.js';
import { makeHeroPortrait } from './engine/portraits.js';
import { buildFigure } from './engine/creatures.js';
import { fxUpdateDraw, fxClear, fxText, fxSlash, fxBolt, fxDissolve, fxRing, fxBlock } from './engine/fx.js';
import { GCOLS, GROWS, buildGameRoom, cx0g, cy0g, isBlocked } from './engine/dungeon.js';
import { XP_NEXT, rollDrop, ROOMS_SPEC } from './engine/combat.js';
import { makeHero } from './models/units.js';
import { HERO_BASES } from './data/classes.js';
import { BAL } from './data/balance.js';
import { derive } from './systems/StatEngine.js';
import { resolveAttack } from './systems/CombatSim.js';
import { openCharacter } from './ui/CharacterPanel.js';
/* ============ DP ENGINE :: game.js — endless auto-battle loop ============ */
"use strict";
const cvG=document.getElementById("cv"), G=cvG.getContext("2d");
const logEl=document.getElementById("log"), partyEl=document.getElementById("party"),
      overlay=document.getElementById("overlay"), btnStart=document.getElementById("btnStart"),
      btnNext=document.getElementById("btnNext"), btnSpeed=document.getElementById("btnSpeed"),
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
const state={ roomIdx:0, phase:"idle", room:null, units:[], t:0, speed:1,
  inventory:[], respawnAt:null, reviveAt:null };
const party=[makeHero("knight",11),makeHero("mage",22),makeHero("cleric",33)];
let combatRng=Math.random;  // reseeded deterministically when a fight starts / area changes
const FIGCACHE={}, PORTCACHE={}, TILECACHE={};
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
  if(u.team===0){ src=PORTS[u.cls]; }
  else{
    const fig=figOf(u); // 384x384 (96-space @4x); heads sit around y 16..52 in 96-space
    const c=document.createElement("canvas"); c.width=c.height=96;
    const g=c.getContext("2d");
    // crop the head region and scale it to fill the portrait
    const sx=u.boss?60:120, sy=u.boss?40:70, sw=384-sx*2, sh=u.boss?260:210;
    g.drawImage(fig, sx,sy,sw,sh, -6,2, 108,104);
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
  // role icon medallion (top-right)
  const icons={knight:"⚔",mage:"✦",cleric:"✚",rat:"~",goblin:"🗡",kobold:"▲",
    skeleton:"☠",wight:"✦",dragon:"★"};
  const ic=icons[u.cls||u.fig]||"⚔", ir=S*0.15;
  g.fillStyle=pal.o; g.beginPath(); g.arc(S-ir*0.9,ir*0.9,ir,0,7); g.fill();
  g.strokeStyle=pal.c1; g.lineWidth=1.4; g.stroke();
  g.fillStyle="#f4e3c1"; g.font=Math.round(ir*1.15)+"px serif"; g.textAlign="center"; g.textBaseline="middle";
  g.fillText(ic, S-ir*0.9, ir*1.0);
  TILECACHE[key]={canvas:c,S,pal};
  return TILECACHE[key];
}
const PORTS={};
for(const h of party){ const p=makeHeroPortrait(h.cls,h.seed*101+7); PORTS[h.cls]=p.canvas; }

function log(msg,cls){ const p=document.createElement("div"); if(cls)p.className=cls; p.innerHTML=msg;
  logEl.appendChild(p); while(logEl.children.length>40)logEl.removeChild(logEl.firstChild);
  logEl.scrollTop=logEl.scrollHeight; }
function renderParty(){
  partyEl.innerHTML="";
  for(const h of party){
    const D=derive(h);
    const c=document.createElement("div"); c.className="card"+(h.alive?"":" dead");
    c.style.cursor="pointer"; c.title="Tap to view stats & gear";
    c.onclick=()=>openHero(h);
    const img=document.createElement("canvas"); img.width=img.height=96; img.className="pic";
    img.getContext("2d").drawImage(PORTS[h.cls],0,0,96,96);
    const bag=Object.values(h.gear).filter(Boolean).length;
    const info=document.createElement("div");
    info.innerHTML=`<b>${h.name}</b> <span class="lvl">Lv${h.level}</span><br>
      <span style="opacity:.7">ATK ${D.atk} · DEF ${D.def}</span>
      <div class="bar"><i style="width:${clamp(h.hp/D.maxhp*100,0,100)}%"></i></div>
      ${h.hp}/${D.maxhp}<div class="gear">${bag} equipped · ⚙ gear</div>`;
    c.appendChild(img); c.appendChild(info); partyEl.appendChild(c);
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
function placeParty(){
  const pcols=[2,4,6], prow=GROWS-2; // GROWS-1 is the south wall; GROWS-2 is floor
  party.forEach((h,i)=>{ if(h.hp<=0){h.hp=1;h.alive=true;}
    h.r=prow; h.c=pcols[i];
    let guard=0; while((isBlocked(state.room,h.r,h.c)||state.units.some(u=>u.r===h.r&&u.c===h.c))&&guard++<10){
      h.r--; if(h.r<GROWS-3)h.r=GROWS-2, h.c=1+((h.c)%(GCOLS-2)); }
    h.rr=h.r; h.cc=h.c; h.moveT=1; h.next=state.t+0.5+0.2*i;
    if(!state.units.includes(h)) state.units.push(h); });
  party.forEach(figOf);
}
function spawnWave(){
  const spec=ROOMS_SPEC[state.roomIdx];
  spec.spawn().forEach((f,i)=>{ f.next=state.t+0.7+0.2*i;
    let guard=0; while((isBlocked(state.room,f.r,f.c)||state.units.some(u=>u.r===f.r&&u.c===f.c))&&guard++<20){
      f.c=1+((f.c)%(GCOLS-2)); if(guard%8===0)f.r=Math.min(GROWS-3,f.r+1); }
    f.rr=f.r; f.cc=f.c; f.moveT=1;
    state.units.push(f); figOf(f); });
}
function loadRoom(){
  const spec=ROOMS_SPEC[state.roomIdx];
  state.room=buildGameRoom((Date.now()+state.roomIdx*7919)|0,spec);
  state.units=[]; fxClear(); state.respawnAt=null; state.reviveAt=null;
  placeParty(); spawnWave();
  log(`— <span class="sys">${spec.title.split("— ")[1]}</span> —`);
}
function seedBattle(){ combatRng=mulberry32((((state.room&&state.room.seed)||1)^0x9e3779b9)>>>0); }

/* ---------- sim (continuous act-timer autobattle on the room grid) ---------- */
function livingFoes(team){ return state.units.filter(u=>u.alive&&u.team!==team); }
function distU(a,b){ return Math.abs(a.r-b.r)+Math.abs(a.c-b.c); }
function nearest(u){ let best=null,bd=99; for(const f of livingFoes(u.team)){ const dd=distU(u,f);
  if(dd<bd){bd=dd;best=f;} } return best; }
function occupied(r,c){ return state.units.some(u=>u.alive&&u.r===r&&u.c===c); }
function stepToward(u,tg){
  const opts=[[1,0],[-1,0],[0,1],[0,-1]].map(([dr,dc])=>({r:u.r+dr,c:u.c+dc}))
    .filter(p=>!isBlocked(state.room,p.r,p.c)&&!occupied(p.r,p.c));
  if(!opts.length)return;
  opts.sort((a,b)=>(Math.abs(a.r-tg.r)+Math.abs(a.c-tg.c))-(Math.abs(b.r-tg.r)+Math.abs(b.c-tg.c)));
  u.rr=u.r; u.cc=u.c;        // remember where we were (for the slide)
  u.r=opts[0].r; u.c=opts[0].c;
  u.moveT=0;                 // start the slide
}
/* one basic attack, resolved by the deterministic CombatSim; this layer only renders/logs */
function attack(att,def){
  const res=resolveAttack(att,def,combatRng);
  const who=`<b>${att.name}</b>`;
  att.lunge={tx:uxS(def),ty:uyS(def),t:0};
  if(res.type==="dodge"){
    log(`${who} strikes at ${def.name} — <span class="miss">dodged</span>`);
    fxText(uxS(def),uyS(def)-38,"dodge","#8b7fa8");
    if(def.team===0&&def.cls==="knight") fxBlock(uxS(def),uyS(def)-18);
    return;
  }
  const deliver=()=>{
    log(`${who} hits ${def.name} — <span class="${res.crit?'crit':'hit'}">${res.crit?"CRIT!":"hit"}</span> <span class="dmg">${res.dmg}</span>`);
    hurt(def,res.dmg,att);
    fxText(uxS(def),uyS(def)-40,String(res.dmg),res.crit?"#ff6b6b":"#ffd166",res.crit);
  };
  if(derive(att).rng>1){
    const col=att.cls==="mage"?"#b48bff":(att.fig==="kobold"?"#c8ccd6":"#7ee787");
    fxBolt(uxS(att),uyS(att)-18,uxS(def),uyS(def)-14,col,deliver);
  } else { fxSlash(uxS(def),uyS(def)-14,res.crit); deliver(); }
}
function hurt(u,dmg,src){
  u.hp-=dmg; u.flash=0.18;
  if(u.hp<=0){ u.hp=0; u.alive=false;
    log(`💀 <b>${u.name}</b> falls!`, u.team===0?"crit":"sys");
    const f=figOf(u), S=u.boss?76:54;
    fxDissolve(f,uxS(u),uyS(u)+4,S,S,u.team===0?"#9ad1ff":"#c98a8a");
    if(u.team===1&&src&&src.team===0){
      awardXP(u.xp);
      const drop=rollDrop(combatRng,!!u.boss);
      if(drop){ state.inventory.push(drop);
        log(`🎁 <b>${u.name}</b> drops <span class="sys">${drop.n}</span> <span style="opacity:.6">→ bag (${state.inventory.length})</span>`);
        fxText(uxS(u),uyS(u)-30,"+"+drop.n.split(" ")[0],"#ffd166"); }
    }
  }
  if(u.team===0) renderParty();
}
function awardXP(xp){
  const share=Math.ceil(xp/Math.max(1,party.filter(p=>p.alive).length));
  for(const h of party){ if(!h.alive)continue;
    h.xp+=share;
    while(h.level<3&&h.xp>=XP_NEXT[h.level]){
      h.level++; const gr=HERO_BASES[h.cls].growth;
      h.atk+=gr.atk; h.def+=gr.def; h.dodge+=gr.dodge; h.crit+=gr.crit; h.maxhp+=gr.hp;
      h.hp=derive(h).maxhp;
      log(`✨ <b>${h.name}</b> reaches <span class="sys">level ${h.level}</span>! (+${gr.hp} HP, +${gr.atk} ATK)`,"heal");
      fxRing(uxS(h),uyS(h)+6,"#7ee787"); fxText(uxS(h),uyS(h)-44,"LEVEL UP!","#7ee787",true);
    } }
  renderParty();
}
function act(u){
  if(!u.alive)return;
  const tg=nearest(u); if(!tg)return;
  if(distU(u,tg)<=derive(u).rng) attack(u,tg);
  else stepToward(u,tg);
}
/* wave clears -> schedule respawn; party wipes -> schedule revive (endless map) */
function updateWaves(){
  const heroesAlive=party.some(h=>h.alive);
  const foesAlive=state.units.some(u=>u.team===1&&u.alive);
  if(!heroesAlive){
    if(state.reviveAt===null){ state.reviveAt=state.t+BAL.REVIVE_DELAY;
      log(`☠️ <span class="crit">The party falls…</span> they'll regroup.`); }
    return;
  }
  if(!foesAlive && state.respawnAt===null){
    state.respawnAt=state.t+BAL.RESPAWN_DELAY;
    for(const h of party) if(h.alive){ const mh=derive(h).maxhp;
      h.hp=Math.min(mh,h.hp+Math.round(mh*BAL.WAVE_HEAL_FRAC)); }
    renderParty();
    log(`✅ <span class="sys">Wave cleared.</span> Another approaches…`);
  }
}
/* ---------- controls & menus ---------- */
function syncButtons(){
  btnStart.textContent = state.phase==="idle" ? "Fight!" : state.phase==="fight" ? "Pause" : "Resume";
  btnStart.disabled=false;
  btnNext.disabled=false;
}
function openHero(h){
  const back = state.phase==="fight" ? "fight" : "idle";
  state.phase="paused"; syncButtons();
  openCharacter(h, {
    inventory: state.inventory,
    portrait: PORTS[h.cls],
    refresh: renderParty,
    close: ()=>{ state.phase=back; syncButtons(); },
  });
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
btnSpeed.onclick=()=>{ state.speed=state.speed===1?2:1; btnSpeed.textContent=`${state.speed}×`; };

/* ---------- render ---------- */
function drawUnit(u){
  if(!u.alive) return;
  const tile=tileOf(u), S=tile.S, pal=tile.pal;
  const gx=uxS(u), gy=uyS(u);
  // little hop while sliding between cells, tiny idle breath while standing
  const moving=(u.moveT!==undefined&&u.moveT<1);
  const hop=moving ? -Math.sin(u.moveT*Math.PI)*4 : Math.sin(state.t*2.4+u.c*1.7)*1.0;
  let ox=0,oy=0;
  if(u.lunge){ u.lunge.t+=0.016*state.speed;
    const k=Math.sin(Math.min(1,u.lunge.t/0.22)*Math.PI);
    ox=(u.lunge.tx-gx)*0.20*k; oy=(u.lunge.ty-gy)*0.20*k;
    if(u.lunge.t>0.24)u.lunge=null; }
  const px=gx+ox, py=gy+hop+oy; // centered exactly on the floor cell
  // contact shadow directly under the tile center
  G.save(); G.globalAlpha=.35; ell(G,gx,gy+S*0.44,S*0.36,S*0.10,"#060409"); G.restore();
  G.save(); G.shadowColor=pal.glow; G.shadowBlur=u.boss?14:8;
  G.drawImage(tile.canvas,px-S/2,py-S/2,S,S); G.restore();
  if(u.flash>0){ G.save(); G.globalAlpha=Math.min(1,u.flash*4)*.7; G.globalCompositeOperation="lighter";
    G.drawImage(tile.canvas,px-S/2,py-S/2,S,S); G.restore(); u.flash-=0.016*state.speed; }
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
    G.fillText("★ BOSS ★",px,py-S/2-2); }
}
function render(dt){
  G.setTransform(2,0,0,2,0,0);
  G.drawImage(state.room.base,0,0,CW,CH);
  for(const p of state.room.parts) drawPartPx(G,p,state.t);
  const sorted=[...state.units].sort((a,b)=>a.r-b.r||a.c-b.c);
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
  state.t+=dt;
  if(state.phase==="fight"){
    for(const u of state.units){
      if(!u.alive)continue;
      if(state.t>=u.next){ act(u); u.next=state.t+BAL.BASE_INTERVAL/derive(u).aspd+combatRng()*BAL.ASPD_JITTER; }
    }
    updateWaves();
    // endless map: respawn a fresh wave / revive a fallen party on their timers
    if(state.respawnAt!==null && state.t>=state.respawnAt){ state.respawnAt=null; spawnWave(); }
    if(state.reviveAt!==null && state.t>=state.reviveAt){ state.reviveAt=null;
      for(const h of party){ h.alive=true; const mh=derive(h).maxhp; h.hp=Math.round(mh*BAL.REVIVE_HEAL_FRAC); }
      renderParty(); log(`✨ <span class="heal">The party regroups and fights on.</span>`); }
    // prune slain enemies so the unit list doesn't grow without bound over endless waves
    state.units=state.units.filter(u=>u.team===0||u.alive);
  }
  // advance grid-slide interpolation for every unit
  for(const u of state.units){ if(u.moveT!==undefined&&u.moveT<1)
    u.moveT=Math.min(1,u.moveT+dt*6.5); }
  render(dt);
  requestAnimationFrame(loop);
}
log(`Welcome to <span class="sys">The Emberdeep</span>. Bram, Wren & Odo descend.`,"sys");
log(`ATK vs DEF · loot drops from foes → your bag · <b>tap a hero</b> to equip · foes respawn · Area → goes deeper.`,"sys");
loadRoom(); renderParty(); syncButtons();
requestAnimationFrame(loop);
