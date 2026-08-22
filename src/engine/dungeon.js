import { mulberry32, R, ri, rf, pick, chance, maskToSnap, applyMask, T, WH, OX, OY, CW, CH, PARTS, newLayer, gradeLayer, seedRng, setParts, setGeom } from './core.js';
import { STONE, pFloor, pCracked, pMoss, pGrate, pPuddle, pPit, pFirePit, pColumn,
         pEmber, pRune, pBones, pRubble, pMushroom, pAsh, pFrost, pCrystal, pWallBlock, pExitWall } from './tiles.js';
/* ============ DP ENGINE :: dungeon.js — open-floor rooms (no walls; islands over the void) ============ */
/* A room is now an irregular island of stone floating in the void. Its shape comes from one of five
   generators; the walkable area is guaranteed fully connected (no unreachable tiles); exits are
   glowing portals where the floor meets the dark. Blocking features (pit/column/firepit) are only
   ever placed where they can't strand a tile. */
"use strict";

const GCOLS=8, GROWS=11;
function setRoomGeom(){ const T=44, WH=24, OX=12, OY=WH+30, CW=GCOLS*T+OX*2, CH=GROWS*T+OY+26; setGeom(T,WH,OX,OY,CW,CH); }
const cx0g=c=>OX+c*T, cy0g=r=>OY+r*T;

/* ---- floor-shape generators: is (r,c) part of the island? rnd(r,c)→[0,1) is stable per cell ---- */
const SHAPES = {
  full: (r,c,rnd,g) => { const edge = r===0||c===0||r===g.rows-1||c===g.cols-1;
    return edge ? rnd(r,c) > .38 : rnd(r,c) > .05; },
  ring: (r,c,rnd,g) => { const ring = Math.min(r, g.rows-1-r, c, g.cols-1-c);
    if(ring>=2) return true;                              // solid core
    return Math.sin(r*1.3)*Math.cos(c*1.5) + rnd(r,c)*.8 > .35; },   // crumbling outer ring
  causeway: (r,c,rnd,g) => { const cx=(g.cols-1)/2;
    const top = r<=3 && Math.abs(c-cx)<=2.4;
    const bot = r>=g.rows-4 && Math.abs(c-cx)<=2.4;
    const bridge = Math.abs(c-cx)<=1 && r>2 && r<g.rows-3;   // two platforms joined over the dark
    return top||bot||bridge; },
  cavern: (r,c,rnd,g) => { const cx=(g.cols-1)/2, cy=(g.rows-1)/2, rx=g.cols*.5, ry=g.rows*.5;
    const wob = .18*Math.sin(c*1.1+g.phase) + .15*Math.cos(r*.7-g.phase) + .1*Math.sin((r+c)*.6);
    return ((c-cx)/rx)**2 + ((r-cy)/ry)**2 < .8 + wob; },
  cross: (r,c,rnd,g) => { const cx=(g.cols-1)/2, cy=(g.rows-1)/2;
    return Math.abs(c-cx)<=1.5 || Math.abs(r-cy)<=2; },
};

const NEI = [[1,0],[-1,0],[0,1],[0,-1]];
/* reachable floor cells from `start`, walking 4-neighbours, skipping any cell in `block` */
function reachFrom(floor, start, block){
  const seen=new Set([start]), q=[start];
  while(q.length){ const [r,c]=q.pop().split(",").map(Number);
    for(const [dr,dc] of NEI){ const k=(r+dr)+","+(c+dc);
      if(floor.has(k) && !seen.has(k) && !(block&&block.has(k))){ seen.add(k); q.push(k); } } }
  return seen;
}

const EXIT_LABEL = { onward:"Onward", shrine:"Shrine", vault:"Vault", boss:"Descent", stair:"Daylight" };

/* map a decorative tile name → its painter (walkable tiles only) */
const DECO = { crack:pCracked, moss:pMoss, grate:pGrate, puddle:pPuddle,
  ember:pEmber, rune:pRune, bones:pBones, rubble:pRubble, mushroom:pMushroom, ash:pAsh,
  frost:pFrost, crystal:pCrystal };
const BLOCKER = { pit:pPit, column:pColumn, fire:pFirePit, wall:pWallBlock };

function buildGameRoom(seed, spec){
  setRoomGeom();
  seedRng(seed); setParts([]);
  const layer=newLayer(); const g=layer.getContext("2d");
  g.fillStyle="#0a0812"; g.fillRect(0,0,CW,CH);
  const tone=pick(spec.palette&&spec.palette.length?spec.palette:STONE);   // themed floor stone per dungeon
  const rng=mulberry32((seed*2654435761)>>>0);                       // sequence rng for placement
  const rnd=(r,c)=>{ let h=(((r+3)*73856093)^((c+7)*19349663)^(seed|0))>>>0;   // stable per-cell noise
    h=Math.imul(h^h>>>13,0x5bd1e995); return ((h^h>>>15)>>>0)/4294967296; };
  const geo={cols:GCOLS, rows:GROWS, phase:seed%10};

  // 1) island from the shape generator
  const floor=new Set();
  const shape=SHAPES[spec.shape]||SHAPES.full;
  for(let r=0;r<GROWS;r++) for(let c=0;c<GCOLS;c++) if(shape(r,c,rnd,geo)) floor.add(r+","+c);

  // 2) forced entry platform (bottom-centre) + a top landing so every run reads as a climb
  const ctr=Math.floor(GCOLS/2), entry=[];
  for(let r=GROWS-2;r<=GROWS-1;r++) for(let c=ctr-1;c<=ctr+1;c++)
    if(c>=0&&c<GCOLS){ floor.add(r+","+c); entry.push([r,c]); }
  for(let c=ctr-1;c<=ctr+1;c++) if(c>=0&&c<GCOLS) floor.add("0,"+c);

  // 3) connectivity: guarantee the top landing joins the entry (carve a central spine only if needed),
  //    then discard every cell the party can't actually reach — no orphan tiles, ever.
  const start=(GROWS-1)+","+ctr;
  if(!reachFrom(floor,start).has("0,"+ctr)) for(let r=0;r<GROWS;r++) floor.add(r+","+ctr);
  const reach=reachFrom(floor,start);
  for(const k of [...floor]) if(!reach.has(k)) floor.delete(k);

  // 4) blocking features — placed only where they keep the whole walkable island connected
  const isEntry=(r,c)=> r>=GROWS-3;
  const interior=[...floor].filter(k=>{ const [r,c]=k.split(",").map(Number);
    return r>0 && !isEntry(r,c) && NEI.every(([dr,dc])=>floor.has((r+dr)+","+(c+dc))); });
  for(let i=interior.length-1;i>0;i--){ const j=(rng()*(i+1))|0; [interior[i],interior[j]]=[interior[j],interior[i]]; }
  const blockers=new Map();                       // cellKey → blocker kind
  const interiorSet=new Set(interior);
  const kinds=spec.blockerKinds||["column","pit"];
  const maxB=spec.blockers==null?2:spec.blockers;
  for(const k of interior){
    if(blockers.size>=maxB || blockers.has(k)) continue;
    const kind=kinds[(rng()*kinds.length)|0];
    // walls often come as a short run of 2–3 in a line; other blockers are single cells
    const group=[k];
    if(kind==="wall" && rng()<0.72){
      const [r,c]=k.split(",").map(Number);
      const [dr,dc]=rng()<.5?[0,1]:[1,0];        // horizontal or vertical run
      const extra=1+((rng()*2)|0);               // +1 or +2 → total 2 or 3
      for(let n=1;n<=extra && group.length<3;n++){ const nk=(r+dr*n)+","+(c+dc*n);
        if(interiorSet.has(nk) && !blockers.has(nk)) group.push(nk); else break; }
    }
    const test=new Set([...blockers.keys(), ...group]);
    if(reachFrom(floor,start,test).size === floor.size-test.size)   // still reaches every open tile
      for(const gk of group) blockers.set(gk, kind);
  }

  // 5) decorative (walkable) tiles on the remaining open floor
  const decoPool=spec.tiles&&spec.tiles.length?spec.tiles:["crack","moss","rubble"];
  const deco=new Map();
  for(const k of [...floor]){ const [r,c]=k.split(",").map(Number);
    if(blockers.has(k)||isEntry(r,c)||k==="0,"+ctr) continue;
    if(rng()<.26) deco.set(k, decoPool[(rng()*decoPool.length)|0]); }

  // 6) exits: walkable edge cells (touching the void), spread out from the entry
  const walk=[...floor].filter(k=>!blockers.has(k)).map(k=>k.split(",").map(Number));
  const edges=walk.filter(([r,c])=> NEI.some(([dr,dc])=> !floor.has((r+dr)+","+(c+dc)) ));
  const exitKinds=spec.exits||["onward"];
  const exits=[]; let pool=edges.slice();
  for(let i=0;i<exitKinds.length && pool.length;i++){
    let best=null,bd=-1;
    for(const e of pool){ const d = exits.length
        ? Math.min(...exits.map(x=>(e[0]-x.r)**2+(e[1]-x.c)**2))
        : (e[0]-(GROWS-1))**2+(e[1]-ctr)**2;
      if(d>bd){ bd=d; best=e; } }
    if(!best) break;
    const [r,c]=best;
    const hit=[["N",-1,0],["S",1,0],["W",0,-1],["E",0,1]].find(([d,dr,dc])=>!floor.has((r+dr)+","+(c+dc)));
    exits.push({ r, c, dir:hit[0], kind:exitKinds[i], label:EXIT_LABEL[exitKinds[i]]||"Onward" });
    pool=pool.filter(e=>e!==best);
  }

  // 7) paint — floors + rims + decorations, then blockers, then portals, then the title
  for(const k of [...floor]){ const [r,c]=k.split(",").map(Number);
    if(blockers.has(k)) continue;
    const x=cx0g(c), y=cy0g(r), d=deco.get(k);
    (d&&DECO[d]?DECO[d]:pFloor)(g,x,y,tone);
    paintRim(g,x,y,floor,r,c);
  }
  for(const [k,kind] of [...blockers].sort((a,b)=>(+a[0].split(",")[0])-(+b[0].split(",")[0]))){   // back→front
    const [r,c]=k.split(",").map(Number); (BLOCKER[kind]||pColumn)(g, cx0g(c), cy0g(r), tone); }
  for(const e of exits) pExitWall(g, cx0g(e.c), cy0g(e.r), e.dir, e.kind, e.label, tone);
  // (room title lives in the DOM dungeon header now, so it no longer overlaps the canvas compass)

  gradeLayer(layer);
  const parts=PARTS; setParts(null);
  for(const p of parts){ const snap=maskToSnap(p.canvas); gradeLayer(p.canvas); applyMask(p.canvas,snap); }

  // 8) blocked map: void everywhere off the island, plus each blocker cell
  const blocked={};
  for(let r=0;r<GROWS;r++) for(let c=0;c<GCOLS;c++){ const k=r+","+c;
    if(!floor.has(k)) blocked[k]="void"; else if(blockers.has(k)) blocked[k]=blockers.get(k); }

  return { base:layer, parts, blocked, exits, entry,
           floorCells:[...floor].map(k=>k.split(",").map(Number)), seed };
}

/* darken the inner edge of any tile facing the void + a faint top lip — reads as a raised floor
   over the abyss without any wall geometry */
function paintRim(g,x,y,floor,r,c){
  const F=T*.25;   // fade span — halved from T·0.5 for a tighter, crisper drop-off to the void
  const side=(dr,dc,s)=>{ if(floor.has((r+dr)+","+(c+dc))) return;
    let grd;
    if(s==="N") grd=g.createLinearGradient(x,y,x,y+F);
    else if(s==="S") grd=g.createLinearGradient(x,y+T,x,y+T-F);
    else if(s==="W") grd=g.createLinearGradient(x,y,x+F,y);
    else grd=g.createLinearGradient(x+T,y,x+T-F,y);
    grd.addColorStop(0,"rgba(4,3,9,.78)"); grd.addColorStop(1,"rgba(4,3,9,0)");
    g.fillStyle=grd;
    if(s==="N") g.fillRect(x,y,T,F); else if(s==="S") g.fillRect(x,y+T-F,T,F);
    else if(s==="W") g.fillRect(x,y,F,T); else g.fillRect(x+T-F,y,F,T);
    g.strokeStyle="rgba(232,220,200,.12)"; g.lineWidth=1.4; g.beginPath();
    if(s==="N"){ g.moveTo(x,y+1); g.lineTo(x+T,y+1); }
    else if(s==="S"){ g.moveTo(x,y+T-1); g.lineTo(x+T,y+T-1); }
    else if(s==="W"){ g.moveTo(x+1,y); g.lineTo(x+1,y+T); }
    else { g.moveTo(x+T-1,y); g.lineTo(x+T-1,y+T); }
    g.stroke();
  };
  side(-1,0,"N"); side(1,0,"S"); side(0,-1,"W"); side(0,1,"E");
}

function isBlocked(room,r,c){
  const R=room.rows||GROWS, C=room.cols||GCOLS;      // roaming floors are taller than the classic 8×11
  if(r<0||c<0||r>=R||c>=C) return true;
  return !!room.blocked[r+","+c];
}

/* ---- Roaming Floor: one tall, larger-than-screen level of sub-rooms joined by corridors (dungeon 2).
   Width is kept at GCOLS so the camera only scrolls vertically. `spec.rooms` are rectangles, `spec.links`
   join them with 2-wide corridors. Returns the same room shape as buildGameRoom plus rows/cols/roaming
   and roomRects (used to place enemies + draw the minimap). No animated tile-parts (bog = static deco). */
function buildRoamingFloor(seed, spec){
  setRoomGeom();
  seedRng(seed); setParts([]);
  const FC=GCOLS, FR=spec.rows;
  const worldH=OY+FR*T+26, worldW=OX*2+FC*T;
  const base=document.createElement("canvas"); base.width=worldW*2; base.height=worldH*2;
  const g=base.getContext("2d"); g.scale(2,2);
  g.fillStyle="#0a0812"; g.fillRect(0,0,worldW,worldH);
  const tone=pick(spec.palette&&spec.palette.length?spec.palette:STONE);
  const rng=mulberry32((seed*2654435761)>>>0);

  const floor=new Set();
  const inb=(r,c)=> r>=0&&r<FR&&c>=0&&c<FC;
  const addRect=(r0,c0,h,w)=>{ for(let r=r0;r<r0+h;r++) for(let c=c0;c<c0+w;c++) if(inb(r,c)) floor.add(r+","+c); };
  const rects=spec.rooms.map(rm=>({ ...rm, cr:Math.round(rm.r+rm.h/2), cc:Math.round(rm.c+rm.w/2) }));
  for(const rm of rects) addRect(rm.r,rm.c,rm.h,rm.w);
  // corridors: an L-path (vertical then horizontal), 2 cells wide, between two room centres
  for(const [i,j] of spec.links){ const a=rects[i], b=rects[j];
    let r=a.cr; const cc=a.cc, tr=b.cr, tc=b.cc, sr=r<tr?1:-1;
    while(r!==tr){ addRect(r, cc-1, 1, 2); r+=sr; }
    let c=cc, sc=c<tc?1:-1;
    while(c!==tc){ addRect(tr-1, c, 2, 1); c+=sc; }
    addRect(tr-1, tc-1, 2, 2);
  }
  // decorative (walkable) bog tiles
  const decoPool=spec.tiles&&spec.tiles.length?spec.tiles:["moss","puddle","mushroom"];
  const deco=new Map();
  for(const k of floor){ if(rng()<.22){ deco.set(k, decoPool[(rng()*decoPool.length)|0]); } }
  // paint floors + rims
  for(const k of floor){ const [r,c]=k.split(",").map(Number); const x=cx0g(c), y=cy0g(r), d=deco.get(k);
    (d&&DECO[d]?DECO[d]:pFloor)(g,x,y,tone); paintRim(g,x,y,floor,r,c); }
  setParts(null);

  const blocked={};
  for(let r=0;r<FR;r++) for(let c=0;c<FC;c++){ const k=r+","+c; if(!floor.has(k)) blocked[k]="void"; }
  // entry cells: the bottom row(s) of the entrance room
  const eRoom=rects[spec.entry!=null?spec.entry:0], entry=[];
  for(let r=eRoom.r+eRoom.h-2;r<eRoom.r+eRoom.h;r++) for(let c=eRoom.c+1;c<eRoom.c+eRoom.w-1;c++)
    if(floor.has(r+","+c)) entry.push([r,c]);

  return { base, parts:[], blocked, exits:[], entry, cols:FC, rows:FR, roaming:true,
           roomRects:rects, worldW, worldH, floorCells:[...floor].map(k=>k.split(",").map(Number)), seed };
}

export { GCOLS, GROWS, setRoomGeom, buildGameRoom, buildRoamingFloor, cx0g, cy0g, isBlocked };
