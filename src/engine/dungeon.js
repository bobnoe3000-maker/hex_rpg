import { mulberry32, R, ri, pick, maskToSnap, applyMask, T, WH, OX, OY, CW, CH, PARTS, newLayer, gradeLayer, seedRng, setParts, setGeom } from './core.js';
import { STONE, pFloor, pCracked, pMoss, pGrate, pPuddle, pPit, pFirePit, pColumn, pWall, pDoor } from './tiles.js';
/* ============ DP ENGINE :: dungeon.js — room generation + graph ============ */
"use strict";
const GCOLS=8, GROWS=11;
function setRoomGeom(){ const T=44, WH=24, OX=12, OY=WH+30, CW=GCOLS*T+OX*2, CH=GROWS*T+OY+26; setGeom(T,WH,OX,OY,CW,CH); }
function buildGameRoom(seed,spec){
  setRoomGeom();
  seedRng(seed); setParts([]);
  const layer=newLayer(); const g=layer.getContext("2d");
  g.fillStyle="#0a0812"; g.fillRect(0,0,CW,CH);
  const tone=pick(STONE), wallTone=pick(STONE);
  const blocked={}, B=(r,c,v)=>blocked[r+","+c]=v;
  for(let r=0;r<GROWS;r++) for(let c=0;c<GCOLS;c++)
    if(r===0||r===GROWS-1||c===0||c===GCOLS-1) B(r,c,"wall");
  // north door + decos
  const doorC=ri(2,5);
  const decos={}; const rem=[1,2,3,4,5,6].filter(c=>c!==doorC).sort(()=>R()-.5);
  decos[rem[0]]="torch"; decos[rem[1]]="chains"; decos[rem[2]]="torch"; decos[rem[3]]="crack";
  const decosS={}; const remS=[1,2,3,4,5,6].sort(()=>R()-.5);
  decosS[remS[0]]="torch"; decosS[remS[1]]="crack";
  // interior features (kept off spawn rows 1-2 top / 5-6 bottom edges lightly)
  const open=[]; for(let r=2;r<GROWS-2;r++) for(let c=1;c<GCOLS-1;c++) open.push([r,c]);
  open.sort(()=>R()-.5);
  const feats=(spec.features||["column","pit","firepit","puddle","crack","moss","grate"]);
  const featMap={};
  feats.forEach((f,i)=>{ if(open[i]) featMap[open[i][0]+","+open[i][1]]=f; });
  // floors
  for(let r=1;r<GROWS-1;r++) for(let c=1;c<GCOLS-1;c++){
    const f=featMap[r+","+c], x=cx0g(c), y=cy0g(r);
    if(f==="crack") pCracked(g,x,y,tone);
    else if(f==="moss") pMoss(g,x,y,tone);
    else if(f==="grate") pGrate(g,x,y,tone);
    else if(f==="puddle") pPuddle(g,x,y,tone);
    else if(f==="pit"){ pPit(g,x,y,tone); B(r,c,"pit"); }
    else pFloor(g,x,y,tone);
  }
  // rows top→bottom: walls + tall features
  for(let r=0;r<GROWS;r++) for(let c=0;c<GCOLS;c++){
    const x=cx0g(c), y=cy0g(r), f=featMap[r+","+c];
    if(blocked[r+","+c]==="wall"){
      if(r===0&&c===doorC) pDoor(g,x,y,wallTone,spec.doorType||"arch",spec.doorLabel||"→ ???");
      else if(r===0) pWall(g,x,y,wallTone,decos[c]);
      else if(r===GROWS-1) pWall(g,x,y,wallTone,decosS[c]);
      else pWall(g,x,y,wallTone,null);
    }
    else if(f==="firepit"){ pFirePit(g,x,y,tone); B(r,c,"fire"); }
    else if(f==="column"){ pColumn(g,x,y,tone); B(r,c,"column"); }
  }
  // room title
  g.font="italic 12px Georgia"; g.textAlign="left";
  g.fillStyle="rgba(6,4,10,.8)"; g.fillText(spec.title+"  ·  #"+(seed%100000),OX+1,15);
  g.fillStyle="#d8a24a"; g.fillText(spec.title+"  ·  #"+(seed%100000),OX,14);
  gradeLayer(layer);
  const parts=PARTS; setParts(null);
  for(const p of parts){ const snap=maskToSnap(p.canvas); gradeLayer(p.canvas); applyMask(p.canvas,snap); }
  return {base:layer,parts,blocked,door:{r:0,c:doorC},seed};
}
const cx0g=c=>OX+c*T, cy0g=r=>OY+r*T;
function isBlocked(room,r,c){
  if(r<0||c<0||r>=GROWS||c>=GCOLS) return true;
  return !!room.blocked[r+","+c];
}

export {
  GCOLS, GROWS, setRoomGeom, buildGameRoom, cx0g, cy0g, isBlocked
};
