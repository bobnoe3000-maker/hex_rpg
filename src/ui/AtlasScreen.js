/* ============ UI :: AtlasScreen.js — the overworld world map (top-level nav) ============ */
/* Renders a stylised continent of biome regions into #town: territories, routes, a town hub, and
   tappable region nodes. Tapping a discovered region travels there (ctx.travel). Replaces the Party
   tab as the world-travel screen. */
"use strict";

import { ensureTownCss } from "./TownScreen.js";
import { REGIONS, REGION_ORDER, REGION_ROUTES, regionNeighbours } from "../systems/Overworld.js";
import { iconImg } from "../engine/icons.js";

const AW=480, AH=300;
const ATLAS={
  town:{x:.50,y:.55},
  nodes:{ plains:{x:.36,y:.62}, forest:{x:.28,y:.34}, docks:{x:.66,y:.30}, swamp:{x:.72,y:.66}, mountains:{x:.50,y:.16} },
  terr:{
    plains:[[.20,.55],[.44,.50],[.50,.70],[.34,.80],[.18,.72]],
    forest:[[.14,.22],[.36,.20],[.40,.42],[.24,.48],[.10,.38]],
    docks:[[.54,.18],[.80,.20],[.82,.40],[.62,.44],[.52,.30]],
    swamp:[[.58,.56],[.84,.56],[.86,.78],[.64,.82],[.56,.70]],
    mountains:[[.36,.06],[.66,.06],[.64,.26],[.46,.28],[.34,.18]],
  },
  land:[[.10,.30],[.30,.10],[.62,.06],[.86,.20],[.90,.55],[.82,.82],[.52,.90],[.22,.82],[.08,.55]],
};
function shade(hex,amt){const c=parseInt(hex.slice(1),16);let r=(c>>16)+amt,g=((c>>8)&255)+amt,b=(c&255)+amt;r=Math.max(0,Math.min(255,r));g=Math.max(0,Math.min(255,g));b=Math.max(0,Math.min(255,b));return "#"+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);}
function hexA(hex,a){const c=parseInt(hex.slice(1),16);return `rgba(${c>>16&255},${c>>8&255},${c&255},${a})`;}
function mul32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}

let atlasCssDone=false;
function ensureAtlasCss(){
  if(atlasCssDone)return; atlasCssDone=true;
  const s=document.createElement("style"); s.id="atlas-style";
  s.textContent=`
  .atl-wrap{--line:#33284d;--line2:#4a3d68;--gold:#e0b063;--gold2:#f0c877;--parch:#cdbff0;--muted:#8a7fae;--dim:#6f6486;--serif:Georgia,serif;--mono:ui-monospace,monospace}
  .atl-return{font-family:inherit;font-weight:bold;letter-spacing:1.5px;font-size:15px;text-transform:uppercase;border:0;border-radius:11px;padding:14px;cursor:pointer;width:100%;margin:0 0 12px;background:linear-gradient(#e0b063,#a8722a);color:#241606;box-shadow:0 4px 0 #6e4a14;display:flex;align-items:center;justify-content:center;gap:9px}
  .atl-return:active{transform:translateY(2px);box-shadow:0 2px 0 #6e4a14}
  .atl-head{display:flex;align-items:baseline;gap:9px;margin:2px 2px 11px}
  .atl-head h1{font-family:var(--serif);font-size:22px;font-weight:bold;color:#fff;margin:0}
  .atl-head .sub{font-size:11.5px;color:var(--muted);font-style:italic}
  .atl-stage{position:relative;width:100%;aspect-ratio:480/300;border:1px solid var(--line2);border-radius:13px;overflow:hidden;background:#0a0f1a}
  .atl-stage canvas{position:absolute;inset:0;width:100%;height:100%}
  #atl-map{image-rendering:pixelated} #atl-ui{pointer-events:none}
  .atl-info{margin-top:12px;background:#191026;border:1px solid var(--line);border-radius:12px;padding:13px 14px}
  .atl-info .rn{font-family:var(--serif);font-size:18px;font-weight:bold;color:#fff}
  .atl-info .rn small{font-family:var(--mono);font-size:9px;letter-spacing:1px;margin-left:8px}
  .atl-badges{display:flex;flex-wrap:wrap;gap:6px;margin:7px 0 8px}
  .atl-bdg{font-family:var(--mono);font-size:10px;padding:4px 8px;border-radius:6px;border:1px solid var(--line2);color:var(--parch);background:#211634}
  .atl-bdg.tier{color:#241606;background:linear-gradient(var(--gold2),#c9862a);border:0}
  .atl-info p{margin:0 0 11px;font-size:12.5px;color:var(--muted);line-height:1.5}
  .atl-travel{width:100%;font-family:inherit;font-weight:bold;font-size:15px;letter-spacing:1px;text-transform:uppercase;border:0;border-radius:11px;padding:13px;cursor:pointer;background:linear-gradient(#8fd39a,#3a8a5a);color:#04140f;box-shadow:0 4px 0 #1c4a30;display:flex;align-items:center;justify-content:center;gap:9px}
  .atl-travel:active{transform:translateY(2px);box-shadow:0 2px 0 #1c4a30}
  .atl-travel[disabled]{opacity:.5;pointer-events:none;background:linear-gradient(#3a4152,#2a3040);color:#8a94a6;box-shadow:0 4px 0 #151a24}
  .atl-tip{position:absolute;right:10px;bottom:9px;font-size:9.5px;color:#d8ccf6;background:rgba(8,10,18,.6);border:1px solid var(--line);border-radius:7px;padding:3px 8px;z-index:3}
  `;
  document.head.appendChild(s);
}

export function openAtlas(ctx){
  ensureTownCss(); ensureAtlasCss();
  const el=document.getElementById("town");
  let selected = ctx.current && ctx.current() || REGION_ORDER[0];

  el.innerHTML=`<div class="tw-wrap atl-wrap">
    <button class="atl-return" data-back>${iconImg("house",16)} Return to the Keep</button>
    <div class="atl-head"><h1>The Wildmarch</h1><span class="sub">overworld · tap a region</span></div>
    <div class="atl-stage"><canvas id="atl-map" width="${AW}" height="${AH}"></canvas><canvas id="atl-ui"></canvas>
      <div class="atl-tip">◆ dungeon · ⌂ town · dashed = route</div></div>
    <div class="atl-info" id="atl-info"></div>
  </div>`;

  const map=el.querySelector("#atl-map"), mx=map.getContext("2d");
  const ui=el.querySelector("#atl-ui"), ux=ui.getContext("2d");
  const dpr=Math.max(1,Math.min(2,window.devicePixelRatio||1));
  function sizeUi(){ const r=map.getBoundingClientRect(); ui.style.width=r.width+"px"; ui.style.height=r.height+"px";
    ui.width=Math.round(r.width*dpr); ui.height=Math.round(r.height*dpr); ux.setTransform(dpr*r.width/AW,0,0,dpr*r.height/AH,0,0); }

  const nodePos=id=>id==="town"?ATLAS.town:ATLAS.nodes[id];
  const AXf=p=>p*AW, AYf=p=>p*AH;
  let badges=[];

  function poly(c,pts){ pts.forEach((p,i)=>{const X=p[0]*AW,Y=p[1]*AH; i?c.lineTo(X,Y):c.moveTo(X,Y);}); c.closePath(); }
  function blob(c,pts){ c.beginPath(); for(let i=0;i<pts.length;i++){ const a=pts[i],b=pts[(i+1)%pts.length]; const ax=a[0]*AW,ay=a[1]*AH,bx=b[0]*AW,by=b[1]*AH,mxx=(ax+bx)/2,myy=(ay+by)/2; if(i===0)c.moveTo(mxx,myy); c.quadraticCurveTo(ax,ay,mxx,myy);} c.closePath(); c.fill(); }
  function dash(c,x0,y0,x1,y1,t,ok){ c.save(); c.setLineDash([3.5,4.5]); c.lineDashOffset=-(t*10)%14; c.strokeStyle=ok?"rgba(230,210,160,.5)":"rgba(120,110,140,.35)"; c.lineWidth=1.4; c.beginPath(); c.moveTo(x0,y0); c.lineTo(x1,y1); c.stroke(); c.restore(); }

  function drawMap(t){
    mx.fillStyle="#12283f"; mx.fillRect(0,0,AW,AH);
    for(let i=0;i<AH;i+=3){ mx.fillStyle=i%6?"#143050":"#122b46"; mx.fillRect(0,i,AW,1); }
    for(let i=0;i<70;i++){ const x=(i*67+(t*8|0))%AW, y=(i*137)%AH; mx.fillStyle="rgba(120,170,210,.10)"; mx.fillRect(x,y,3,1); }
    mx.fillStyle="#3a4a2f"; blob(mx,ATLAS.land);
    mx.strokeStyle="#e7d9a8"; mx.globalAlpha=.25; mx.lineWidth=1; mx.beginPath(); poly(mx,ATLAS.land); mx.stroke(); mx.globalAlpha=1;
    for(const id of REGION_ORDER){ mx.fillStyle=hexA(REGIONS[id].tint,.9); blob(mx,ATLAS.terr[id]); }
    for(const [a,b] of REGION_ROUTES){ const p=nodePos(a),q=nodePos(b); const ok=(a==="town"||ctx.unlocked(a))&&(b==="town"||ctx.unlocked(b)); dash(mx,AXf(p.x),AYf(p.y),AXf(q.x),AYf(q.y),t,ok); }
    // scattered biome icons
    for(const id of REGION_ORDER){ const r=mul32(hash(id)); const pts=ATLAS.terr[id]; const cx=pts.reduce((s,p)=>s+p[0],0)/pts.length*AW, cy=pts.reduce((s,p)=>s+p[1],0)/pts.length*AH; const tint=REGIONS[id].tint;
      for(let i=0;i<6;i++){ const a=r()*6.28,rad=8+r()*28; miniIcon(mx,id,cx+Math.cos(a)*rad,cy+Math.sin(a)*rad*0.7,tint); } }
    badges=[];
    for(const id of REGION_ORDER){ const p=ATLAS.nodes[id]; drawNode(mx,AXf(p.x),AYf(p.y),id,id===selected,t); badges.push({id,x:p.x*AW,y:p.y*AH,name:REGIONS[id].name,tier:REGIONS[id].tier,tint:REGIONS[id].tint}); }
    drawTown(mx,AXf(ATLAS.town.x),AYf(ATLAS.town.y),t);
    const g=mx.createRadialGradient(AW/2,AH/2,AH*0.3,AW/2,AH/2,AH*0.9); g.addColorStop(0,"rgba(0,0,0,0)"); g.addColorStop(1,"rgba(4,6,14,.5)"); mx.fillStyle=g; mx.fillRect(0,0,AW,AH);
  }
  function miniIcon(c,id,x,y,tint){ x=Math.round(x);y=Math.round(y);
    if(id==="forest"){ c.fillStyle="#3c2a18"; c.fillRect(x,y,1,3); c.fillStyle=shade(tint,-6); c.beginPath(); c.moveTo(x-3,y); c.lineTo(x+4,y); c.lineTo(x+0.5,y-5); c.fill(); }
    else if(id==="plains"){ c.fillStyle=shade(tint,18); c.fillRect(x-2,y-1,1,3); c.fillRect(x,y-2,1,4); c.fillRect(x+2,y-1,1,3); }
    else if(id==="docks"){ c.strokeStyle=shade(tint,26); c.lineWidth=1; c.beginPath(); c.arc(x,y,2,0,6.5); c.moveTo(x,y-3); c.lineTo(x,y+3); c.stroke(); }
    else if(id==="swamp"){ c.fillStyle=shade(tint,10); c.fillRect(x-1,y-3,1,4); c.fillRect(x+1,y-4,1,5); }
    else{ c.fillStyle=shade(tint,-14); c.beginPath(); c.moveTo(x-4,y+1); c.lineTo(x+4,y+1); c.lineTo(x,y-5); c.fill(); c.fillStyle="#e6eefc"; c.beginPath(); c.moveTo(x-1.4,y-1.6); c.lineTo(x+1.4,y-1.6); c.lineTo(x,y-5); c.fill(); } }
  function drawNode(c,x,y,id,sel,t){ x=Math.round(x);y=Math.round(y); const R=REGIONS[id], open=ctx.unlocked(id);
    const pulse=sel?(1+Math.sin(t*4)*0.12):1, rad=6*pulse;
    if(sel){ const g=c.createRadialGradient(x,y,0,x,y,20); g.addColorStop(0,hexA(R.tint,.5)); g.addColorStop(1,hexA(R.tint,0)); c.fillStyle=g; c.fillRect(x-22,y-22,44,44); }
    c.fillStyle="#0c0914"; c.beginPath(); c.arc(x,y,rad+2,0,6.5); c.fill();
    c.fillStyle=open?R.tint:shade(R.tint,-28); c.beginPath(); c.arc(x,y,rad,0,6.5); c.fill();
    c.fillStyle="rgba(255,255,255,.28)"; c.beginPath(); c.arc(x-1.5,y-1.5,rad*0.4,0,6.5); c.fill();
    c.strokeStyle=sel?"#fff":shade(R.tint,26); c.lineWidth=1.4; c.beginPath(); c.arc(x,y,rad,0,6.5); c.stroke();
    c.fillStyle="#ffb066"; c.save(); c.translate(x+rad+3,y-rad-1); c.rotate(Math.PI/4); c.fillRect(-2,-2,4,4); c.restore();
    c.fillStyle="#0c0914"; c.font="bold 7px monospace"; c.textAlign="center"; c.textBaseline="middle"; c.fillText(open?R.tier:"🔒",x,y+0.5); c.textBaseline="alphabetic";
  }
  function drawTown(c,x,y,t){ x=Math.round(x);y=Math.round(y);
    const g=c.createRadialGradient(x,y,0,x,y,24); g.addColorStop(0,"rgba(240,200,119,.35)"); g.addColorStop(1,"rgba(240,200,119,0)"); c.fillStyle=g; c.fillRect(x-26,y-26,52,52);
    c.fillStyle="#0c0914"; c.beginPath(); c.arc(x,y,9,0,6.5); c.fill(); c.fillStyle="#e0b063"; c.beginPath(); c.arc(x,y,7.5,0,6.5); c.fill();
    c.fillStyle="#3a2606"; c.fillRect(x-4,y-1,8,5); c.fillRect(x-4,y-3,2,2); c.fillRect(x-1,y-3,2,2); c.fillRect(x+2,y-3,2,2); c.fillStyle="#20140a"; c.fillRect(x-1,y+1,2,3);
    c.strokeStyle="#fff"; c.lineWidth=1.4; c.beginPath(); c.arc(x,y,7.5,0,6.5); c.stroke(); }
  function drawLabels(){ ux.clearRect(0,0,AW,AH); ux.textAlign="center"; ux.textBaseline="alphabetic";
    const lab=(x,y,txt,col)=>{ ux.font='6px "Silkscreen",monospace'; const w=ux.measureText(txt).width;
      ux.fillStyle="rgba(8,10,18,.72)"; rr(ux,x-w/2-4,y-8,w+8,11,3); ux.fill(); ux.fillStyle=col; ux.fillText(txt,x,y); };
    for(const b of badges) lab(b.x,b.y+17,b.name.toUpperCase(), b.id===selected?"#fff":"#cdbff0");
    lab(ATLAS.town.x*AW,ATLAS.town.y*AH+22,"HEARTHWATCH","#f0c877");
  }
  function rr(c,x,y,w,h,r){ c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); }

  function renderInfo(){
    const R=REGIONS[selected], open=ctx.unlocked(selected);
    const info=el.querySelector("#atl-info");
    info.innerHTML=`<div class="rn">${R.name}<small style="color:${R.tint}">${R.biome.toUpperCase()}</small></div>
      <div class="atl-badges"><span class="atl-bdg tier">TIER ${R.tier}</span><span class="atl-bdg">◆ boss dungeon</span><span class="atl-bdg">2 caves</span></div>
      <p>${R.blurb}</p>
      <button class="atl-travel" data-travel ${open?"":"disabled"}>${open?`${iconImg("sword",15)} Travel to ${R.name}`:"🔒 Locked — clear the prior region"}</button>`;
    info.querySelector("[data-travel]").onclick=()=>{ if(ctx.unlocked(selected)) ctx.travel(selected); };
  }

  map.parentElement.addEventListener("click",e=>{
    const r=map.getBoundingClientRect(), px=(e.clientX-r.left)/r.width*AW, py=(e.clientY-r.top)/r.height*AH;
    let best=null,bd=1e9; for(const b of badges){ const d=Math.hypot(b.x-px,b.y-py); if(d<bd){bd=d;best=b;} }
    if(best&&bd<34){ selected=best.id; renderInfo(); }
  });
  el.querySelector("[data-back]").onclick=()=>ctx.back();

  sizeUi(); renderInfo();
  let raf=0, t0=performance.now();
  function loop(now){ if(!map.isConnected){ cancelAnimationFrame(raf); return; } const t=(now-t0)/1000; drawMap(t); drawLabels(); raf=requestAnimationFrame(loop); }
  raf=requestAnimationFrame(loop);
}
