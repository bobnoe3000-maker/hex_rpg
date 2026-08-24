/* ============ SYSTEM :: Overworld.js — biome region floors on the delve engine ============ */
/* A region is a LARGE roaming floor built the same way a dungeon is: buildRoamingFloor gives a valid
   room scaffold (geometry, camera, minimap, entry, floor cells), and we overpaint its baked base with
   biome tiles + props, then recompute which cells are walkable. The game loop then walks the party
   across it with the exact framed unit tiles + follow-camera + minimap it uses in a delve.

   Portals (cave/dungeon mouths) and edge gates are returned as tile data — the game draws their live
   glow and handles "walk onto it → travel". Each region's boss portal maps to one existing dungeon. */
"use strict";

import { mulberry32 } from "../core/rng.js";
import { buildRoamingFloor, cx0g, cy0g } from "../engine/dungeon.js";

/* ---- region / biome data (also drives the Atlas map) ---- */
export const REGIONS = {
  plains:{ name:"Rolling Downs", biome:"Plains", tier:1, tint:"#6f8f4a", dungeonId:"emberdeep",
    blurb:"Gentle grassland of farms and old barrows — the first steps out of town.",
    pal:{gA:"#4a6b3e",gB:"#567a45",gC:"#3f5c37",road:"#8a6b45",roadB:"#6f5238",water:"#2f5f78",waterD:"#244d63",accent:"#e0b063",canopy:"#31502b",rock:"#6a6470"} },
  forest:{ name:"Thornwood", biome:"Forest", tier:2, tint:"#34612f", dungeonId:"thornwild",
    blurb:"Close, mossy canopy split by a stream — easy to lose the path.",
    pal:{gA:"#2f4a30",gB:"#375737",gC:"#263d28",road:"#6a5236",roadB:"#54402a",water:"#2c5a6a",waterD:"#214553",accent:"#6f9a86",canopy:"#24401f",rock:"#5a5346"} },
  docks:{ name:"Saltmarket Quay", biome:"City Docks", tier:3, tint:"#4a6e86", dungeonId:"foundry",
    blurb:"A walled port of piers and warehouses — smugglers keep the undercroft busy.",
    pal:{gA:"#6a6274",gB:"#5a5366",gC:"#7a6e5c",road:"#7a6e5c",roadB:"#5f5546",water:"#274c6e",waterD:"#1f3d5c",accent:"#79c7e6",canopy:"#3a5540",rock:"#6a6274"} },
  swamp:{ name:"Mirefen", biome:"Swamp", tier:4, tint:"#5a6a44", dungeonId:"frostmere",
    blurb:"Black water and peat, lit by wisps — a boardwalk is the only dry road.",
    pal:{gA:"#40502f",gB:"#4a5a3a",gC:"#3a4628",mud:"#4a4030",peat:"#3a3826",water:"#2e3a28",waterD:"#25301f",accent:"#9ad46f",canopy:"#3a4a2a",rock:"#4a4640"} },
  mountains:{ name:"Frostcrag", biome:"Mountains", tier:5, tint:"#8a94a6", dungeonId:"vael",
    blurb:"Snowline cliffs and old mineworks — mind the chasm.",
    pal:{rock:"#6a6470",scree:"#7d7684",snow:"#cdd6e2",ice:"#9fc6dd",water:"#3a6a86",accent:"#bcd4f0",canopy:"#2f4636",gC:"#6a6470"} },
};
export const REGION_ORDER = ["plains","forest","docks","swamp","mountains"];
/* routes between regions (+ town) — drives Atlas lines AND a region's edge gates */
export const REGION_ROUTES = [
  ["town","plains"],["plains","forest"],["forest","docks"],["forest","mountains"],
  ["docks","swamp"],["plains","swamp"],["docks","mountains"],["town","forest"],
];
/* fill missing palette keys so no tile ever reads undefined */
const PAL_DEF={gA:"#4a5a3a",gB:"#556546",gC:"#3f4c34",road:"#7a5e40",roadB:"#5f4a30",water:"#2c5070",waterD:"#20405c",accent:"#e0b063",canopy:"#2f4a2a",rock:"#6a6470",scree:"#7d7684",snow:"#cdd6e2",ice:"#9fc6dd",mud:"#4a4030",peat:"#3a3826"};
for(const id in REGIONS) REGIONS[id].pal={...PAL_DEF,...REGIONS[id].pal};

export const regionNeighbours = id => {
  const out=[]; for(const [a,b] of REGION_ROUTES){ if(a===id)out.push(b); if(b===id)out.push(a); }
  return [...new Set(out)];
};

/* ---- colour helpers ---- */
function shade(hex,amt){const c=parseInt(hex.slice(1),16);let r=(c>>16)+amt,g=((c>>8)&255)+amt,b=(c&255)+amt;r=Math.max(0,Math.min(255,r));g=Math.max(0,Math.min(255,g));b=Math.max(0,Math.min(255,b));return "#"+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);}

/* ---- biome tile painter (T-scaled; mirrors the mockup) ---- */
function drawTile(c,X,Y,S,type,P,n){
  const s=S/14;
  const fill=col=>{c.fillStyle=col;c.fillRect(X,Y,S,S);};
  const fleck=(col,dx,dy,w,h)=>{c.fillStyle=col;c.fillRect(X+dx*s,Y+dy*s,Math.max(1,w*s),Math.max(1,h*s));};
  switch(type){
    case "grass": fill(P.gA); fleck(P.gB,2,3,2,1); fleck(P.gB,9-n,8,2,1); if(n===2)fleck(P.gC,7,5,3,1); break;
    case "grass2": fill(P.gB); fleck(P.gA,3,4,2,1); fleck(P.gC,8,9,2,1); break;
    case "grassC": fill(P.gC); fleck(P.gB,4,4,2,1); break;
    case "road": fill(P.roadB); c.fillStyle=P.road; c.fillRect(X,Y,S,S-2*s); fleck(P.roadB,3+n,5,2,1); fleck(shade(P.road,10),8,9,2,1); break;
    case "forest": fill(P.gA); fleck(P.gC,3,4,2,1); fleck(P.gB,8,9,2,1); fleck(P.canopy,6-n,6,3,1); break;
    case "water": fill(P.waterD); c.fillStyle=P.water; c.fillRect(X,Y,S,S-2*s); if((n+((X/S|0)+(Y/S|0)))%4===0){c.fillStyle="rgba(150,190,225,.16)";c.fillRect(X+5*s,Y+5*s,4*s,1);} break;
    case "shallow": fill(shade(P.water,26)); fleck("#bfe0ee",4,6,3,1); break;
    case "quay": fill(P.gC); fleck(shade(P.gC,-14),3+n,4,3,1); c.fillStyle="rgba(255,240,210,.05)"; c.fillRect(X,Y,S,1); break;
    case "cobble": fill(P.gB); fleck(shade(P.gB,-16),3,4,2,1); fleck(shade(P.gB,-16),8,9,2,1); break;
    case "mud": fill(P.mud); fleck(shade(P.mud,8),3,4,3,1); fleck(shade(P.mud,-10),8,9,2,1); break;
    case "peat": fill(P.peat); fleck(shade(P.peat,10),4,5,2,1); break;
    case "rock": fill(P.rock); fleck(shade(P.rock,-10),3+n,4,3,1); fleck(shade(P.rock,10),8,9,2,1); break;
    case "scree": fill(P.scree); fleck(shade(P.scree,-14),3,4,2,2); fleck(shade(P.scree,-14),8,8,2,2); break;
    case "snow": fill(P.snow); fleck("#eef3fa",3,4,3,1); fleck(shade(P.snow,-14),8,9,2,1); break;
    case "chasm": fill("#0c0a12"); c.fillStyle="#1a1622"; c.fillRect(X,Y,S,2*s); break;
    default: fill(P.gA||"#3a3040");
  }
}
/* impassable blocker art (tree / rock / etc.) baked over its tile; the cell is marked blocked */
function drawBlocker(c,X,Y,S,type,P){
  const cx=X+S/2, base=Y+S-3, sc=S/44;
  const sh=w=>{c.fillStyle="rgba(6,4,10,.32)";c.fillRect(cx-w/2,base-2,w,6*sc);};
  if(type==="tree"){ sh(26*sc); c.fillStyle="#3c2a18"; c.fillRect(cx-3*sc,base-16*sc,6*sc,16*sc);
    c.fillStyle=shade(P.canopy,7); c.fillRect(cx-18*sc,base-46*sc,36*sc,30*sc); c.fillStyle=P.canopy; c.fillRect(cx-16*sc,base-50*sc,32*sc,28*sc);
    c.fillStyle="rgba(255,255,255,.07)"; c.fillRect(cx-13*sc,base-50*sc,14*sc,6*sc); }
  else if(type==="pine"){ sh(24*sc); c.fillStyle="#3a2a1a"; c.fillRect(cx-3*sc,base-12*sc,6*sc,12*sc); c.fillStyle=P.canopy;
    for(let i=0;i<4;i++){c.beginPath();c.moveTo(cx-17*sc+i*3*sc,base-8*sc-i*11*sc);c.lineTo(cx+17*sc-i*3*sc,base-8*sc-i*11*sc);c.lineTo(cx,base-30*sc-i*11*sc);c.fill();}
    c.fillStyle="rgba(230,240,250,.55)"; c.fillRect(cx-7*sc,base-34*sc,14*sc,4*sc); }
  else if(type==="deadtree"){ sh(18*sc); c.fillStyle="#3a3226"; c.fillRect(cx-2*sc,base-40*sc,5*sc,40*sc); c.fillStyle="#463a2c";
    c.fillRect(cx-13*sc,base-30*sc,13*sc,3*sc); c.fillRect(cx+2*sc,base-34*sc,13*sc,3*sc); }
  else if(type==="boulder"){ sh(28*sc); c.fillStyle=shade(P.rock,-14); c.beginPath(); c.ellipse(cx,base-10*sc,17*sc,14*sc,0,0,7); c.fill();
    c.fillStyle=shade(P.rock,8); c.beginPath(); c.ellipse(cx-4*sc,base-16*sc,7*sc,4*sc,0,0,7); c.fill(); }
  else if(type==="reeds"){ c.fillStyle=shade(P.accent,-34); for(const dx of[-7,-2,3,8,11]){c.fillRect(cx+dx*sc,base-18*sc,2*sc,18*sc);} }
}
/* a baked portal mound / gate posts (glow + labels are drawn live by the game) */
function drawPortalBase(c,X,Y,S,boss,P){
  const cx=X+S/2, base=Y+S-4, sc=S/44, s=boss?1.15:0.92;
  c.fillStyle="rgba(6,4,10,.34)"; c.fillRect(cx-16*sc*s,base-2,32*sc*s,7*sc);
  c.fillStyle=shade(P.rock||P.gC||"#5a5346",-6); c.beginPath(); c.ellipse(cx,base-14*sc*s,26*sc*s,20*sc*s,0,Math.PI,0); c.fill();
  c.fillStyle=shade(P.rock||P.gC||"#4a4358",-18); c.beginPath(); c.ellipse(cx,base-6*sc,22*sc*s,15*sc*s,0,Math.PI,0); c.fill();
  c.fillStyle="#08060e"; c.beginPath(); c.ellipse(cx,base-4*sc,11*sc*s,13*sc*s,0,Math.PI,0); c.fill();
}
function drawGateBase(c,X,Y,S,town){
  const cx=X+S/2, base=Y+S-4, sc=S/44, col=town?"#e0b063":"#cdbff0";
  c.fillStyle="rgba(6,4,10,.34)"; c.fillRect(cx-14*sc,base-2,28*sc,7*sc);
  c.fillStyle="#4a4358"; c.fillRect(cx-13*sc,base-30*sc,6*sc,30*sc); c.fillRect(cx+7*sc,base-30*sc,6*sc,30*sc);
  c.fillStyle="#3a3448"; c.fillRect(cx-15*sc,base-34*sc,30*sc,5*sc); c.fillStyle=col; c.globalAlpha=.85; c.fillRect(cx-15*sc,base-34*sc,30*sc,2*sc); c.globalAlpha=1;
  c.fillStyle="#0a0710"; c.fillRect(cx-7*sc,base-29*sc,14*sc,29*sc);
}

/* ---- per-biome tile grid ---- */
function genGrid(id,FR,FC,rng){
  const g=Array.from({length:FR},()=>new Array(FC).fill("grass"));
  const rint=(a,b)=>a+Math.floor(rng()*(b-a+1));
  for(let r=0;r<FR;r++)for(let c=0;c<FC;c++){ const n=(c*7+r*13)%5;
    if(id==="plains") g[r][c]= n===0?"grassC":n===1?"grass2":"grass";
    else if(id==="forest") g[r][c]="forest";
    else if(id==="docks") g[r][c]= c<Math.floor(FC*0.32)?"water":(c<Math.floor(FC*0.32)+1?"shallow":(n===0?"cobble":"quay"));
    else if(id==="swamp") g[r][c]= n===0?"water":n===1?"mud":"peat";
    else if(id==="mountains") g[r][c]= r<Math.floor(FR*0.28)?"snow":(n===0?"scree":"rock");
  }
  const put=(x,y,t)=>{ if(x>=0&&y>=0&&x<FC&&y<FR) g[y][x]=t; };
  if(id==="plains"){ let ry=Math.floor(FR*0.55); for(let c=0;c<FC;c++){ if(rng()<0.2)ry+=rint(-1,1); ry=Math.max(3,Math.min(FR-4,ry)); put(c,ry,"road"); } }
  else if(id==="forest"){ let rx=Math.floor(FC*0.5); for(let r=0;r<FR;r++){ if(rng()<0.22)rx+=rint(-1,1); rx=Math.max(4,Math.min(FC-5,rx)); put(rx,r,"water"); put(rx+1,r,"water"); }
    // a crossing (walkable) mid-way
    const cr=Math.floor(FR/2); put(rx0(g,cr),cr,"road"); }
  else if(id==="mountains"){ const cr=Math.floor(FR*0.55); for(let c=0;c<FC;c++){ put(c,cr,"chasm"); put(c,cr+1,"chasm"); }
    // a bridge crossing (walkable)
    const bx=Math.floor(FC/2); put(bx,cr,"scree"); put(bx,cr+1,"scree"); put(bx+1,cr,"scree"); put(bx+1,cr+1,"scree"); }
  else if(id==="swamp"){ let by=Math.floor(FR*0.5); for(let c=0;c<FC;c++){ if(rng()<0.18)by+=rint(-1,1); by=Math.max(3,Math.min(FR-4,by)); put(c,by,"peat"); } }
  return g;
  function rx0(){ return Math.floor(FC/2); }
}

/* ---- build a full region floor room ---- */
export function buildRegionFloor(id, seed){
  const R=REGIONS[id]||REGIONS.plains, P=R.pal;
  const FC=30, FR=20;
  const room=buildRoamingFloor((seed>>>0)||1, { cols:FC, rows:FR, rooms:[{r:0,c:0,h:FR,w:FC}], links:[], entry:0, palette:[], tiles:[] });
  const TT=cx0g(1)-cx0g(0);
  const rng=mulberry32(((seed^0x51ed3c7)>>>0)||1);
  const G=genGrid(id,FR,FC,rng);
  const impass=new Set(["water","chasm"]);
  const reserved=new Set();
  const cellOpen=(r,c)=> r>=0&&c>=0&&r<FR&&c<FC && !impass.has(G[r][c]);

  // portals: 1 boss + 2 caves on open cells
  const portals=[];
  const placeP=(kind,name,dungeonId,pref)=>{ let cell=pref&&cellOpen(pref.r,pref.c)&&!reserved.has(pref.r+","+pref.c)?pref:null;
    let k=0; while(!cell&&k++<300){ const r=2+Math.floor(rng()*(FR-4)), c=2+Math.floor(rng()*(FC-4)); if(cellOpen(r,c)&&!reserved.has(r+","+c)) cell={r,c}; }
    if(cell){ reserved.add(cell.r+","+cell.c); portals.push({r:cell.r,c:cell.c,kind,name,dungeonId}); } };
  placeP("boss", R.dungeonId+"-boss", R.dungeonId, {r:2,c:FC-3});
  placeP("cave","A dark cave","emberdeep"); placeP("cave","A dark cave","emberdeep");

  // edge gates from routes (town + neighbours), on the map border, open cells
  const gates=[]; const neigh=[]; for(const [a,b] of REGION_ROUTES){ if(a===id&&b!=="town")neigh.push(b); else if(b===id&&a!=="town")neigh.push(a); else if((a===id&&b==="town")||(b===id&&a==="town"))neigh.push("town"); }
  const uniq=[...new Set(neigh)].slice(0,4);
  const slots=[{r:Math.floor(FR/2),c:0,dir:"W"},{r:Math.floor(FR/2),c:FC-1,dir:"E"},{r:0,c:Math.floor(FC/2),dir:"N"},{r:FR-1,c:Math.floor(FC/2),dir:"S"}];
  uniq.forEach((to,i)=>{ const s=slots[i]; if(!s)return; G[s.r][s.c]= id==="docks"?"quay": G[s.r][s.c]; reserved.add(s.r+","+s.c);
    gates.push({r:s.r,c:s.c,dir:s.dir,to,town:to==="town",name: to==="town"?"Hearthwatch":(REGIONS[to]?REGIONS[to].name:to)}); });

  // scatter blockers (trees/rocks/…) on open, non-reserved cells
  const bTypes= id==="forest"?["tree","tree","tree","reeds"]: id==="mountains"?["pine","boulder"]: id==="swamp"?["deadtree","reeds"]: id==="plains"?["tree","boulder"]:["boulder"];
  const nBlock= id==="forest"?46: id==="docks"?10: id==="mountains"?34: id==="swamp"?26:22;
  const blockers=[]; let bk=0;
  while(blockers.length<nBlock && bk++<nBlock*30){ const r=1+Math.floor(rng()*(FR-2)), c=1+Math.floor(rng()*(FC-2));
    const key=r+","+c; if(!cellOpen(r,c)||reserved.has(key)) continue; if(G[r][c]==="road"||G[r][c]==="cobble") continue;
    reserved.add(key); G[r][c]="__block"; blockers.push({r,c,type:bTypes[(rng()*bTypes.length)|0]}); }

  // ---- paint everything into the baked base ----
  const g=room.base.getContext("2d"); g.setTransform(2,0,0,2,0,0);
  for(let r=0;r<FR;r++)for(let c=0;c<FC;c++){ const t=G[r][c]==="__block"?R.base||groundOf(id):G[r][c]; drawTile(g,cx0g(c),cy0g(r),TT,t,P,(c*7+r*13)%5); }
  // structures baked row-by-row (portals + gates + blockers) for correct overlap
  const baked=[...portals.map(p=>({r:p.r,c:p.c,kind:"portal",boss:p.kind==="boss"})),
               ...gates.map(gt=>({r:gt.r,c:gt.c,kind:"gate",town:gt.town})),
               ...blockers.map(b=>({r:b.r,c:b.c,kind:"block",type:b.type}))].sort((a,b)=>a.r-b.r);
  for(const e of baked){ const X=cx0g(e.c),Y=cy0g(e.r);
    if(e.kind==="portal") drawPortalBase(g,X,Y,TT,e.boss,P);
    else if(e.kind==="gate") drawGateBase(g,X,Y,TT,e.town);
    else drawBlocker(g,X,Y,TT,e.type,P); }

  // ---- walkability + entry ----
  const blocked={}, floorCells=[];
  for(let r=0;r<FR;r++)for(let c=0;c<FC;c++){ const t=G[r][c];
    if(impass.has(t)||t==="__block") blocked[r+","+c]="x"; else floorCells.push([r,c]); }
  room.blocked=blocked; room.floorCells=floorCells; room.roamOverworld=true;
  const er=FR-2, mid=Math.floor(FC/2); room.entry=[];
  for(let c=mid-1;c<=mid+1;c++){ if(!blocked[er+","+c]) room.entry.push([er,c]); }
  if(!room.entry.length){ // fall back to any open cell near bottom-centre
    for(const [r,c] of floorCells){ if(r>=FR-4){ room.entry.push([r,c]); if(room.entry.length>=3)break; } }
  }
  if(!room.entry.length) room.entry=[floorCells[0]||[er,mid]];

  return { id, region:R, room, portals, gates, cols:FC, rows:FR };
}
function groundOf(id){ return id==="forest"?"forest":id==="mountains"?"rock":id==="swamp"?"peat":id==="docks"?"quay":"grass"; }
