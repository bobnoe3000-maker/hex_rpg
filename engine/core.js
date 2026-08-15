/* ============ DP ENGINE :: core.js — shared style + rng + part system ============ */
"use strict";
function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0;
  let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t;
  return ((t^t>>>14)>>>0)/4294967296; }; }
let R=Math.random;
const rf=(a,b)=>a+R()*(b-a);
const ri=(a,b)=>a+Math.floor(R()*(b-a+1));
const pick=arr=>arr[Math.floor(R()*arr.length)];
const chance=p=>R()<p;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function shade(hex,k){ const n=parseInt(hex.slice(1),16);
  const r=Math.round(((n>>16)&255)*k), gg=Math.round(((n>>8)&255)*k), b=Math.round((n&255)*k);
  return `rgb(${r},${gg},${b})`; }
function ell(g,x,y,rx,ry,col,rot=0){ g.fillStyle=col; g.beginPath(); g.ellipse(x,y,rx,ry,rot,0,7); g.fill(); }
function inkPath(g,fn,w=1.5,col="rgba(10,8,14,.9)"){
  g.strokeStyle=col; g.lineCap="round"; g.lineJoin="round";
  for(let i=0;i<2;i++){ g.lineWidth=w*(i?0.6:1);
    g.save(); g.translate(rf(-.5,.5),rf(-.5,.5)); g.beginPath(); fn(g); g.stroke(); g.restore(); }
}
function hatch(g,clipFn,x0,x1,y0,y1,ang=-0.55,gap=3.2,col="rgba(8,6,12,.18)"){
  g.save(); g.beginPath(); clipFn(g); g.clip();
  g.strokeStyle=col; g.lineWidth=1;
  const L=Math.max(x1-x0,y1-y0)*2;
  for(let d=-L; d<L; d+=gap){
    g.beginPath(); g.moveTo(x0+d,y0-8); g.lineTo(x0+d+Math.tan(ang)*(y1-y0+16),y1+8); g.stroke(); }
  g.restore();
}
const GRAIN=(()=>{ const c=document.createElement("canvas"); c.width=c.height=96;
  const g=c.getContext("2d"), im=g.createImageData(96,96);
  for(let i=0;i<im.data.length;i+=4){ const v=128+(Math.random()*90-45)|0;
    im.data[i]=im.data[i+1]=im.data[i+2]=v; im.data[i+3]=255; }
  g.putImageData(im,0,0); return c; })();
/* figure canvases: 96-space at 4x */
function bakeGradeInto96(ctx){
  ctx.globalCompositeOperation="multiply";
  const grd=ctx.createLinearGradient(0,0,0,96);
  grd.addColorStop(0,"rgba(210,190,170,1)"); grd.addColorStop(1,"rgba(125,115,152,1)");
  ctx.fillStyle=grd; ctx.fillRect(0,0,96,96);
  ctx.globalCompositeOperation="overlay";
  ctx.globalAlpha=.5; ctx.drawImage(GRAIN,0,0); ctx.globalAlpha=1;
  ctx.globalCompositeOperation="source-over";
}
function maskToSnap(c2){ const snap=document.createElement("canvas");
  snap.width=c2.width; snap.height=c2.height;
  snap.getContext("2d").drawImage(c2,0,0);
  return snap; }
function applyMask(c2,snap){ const cg=c2.getContext("2d");
  cg.save(); cg.setTransform(1,0,0,1,0,0);
  cg.globalCompositeOperation="destination-in"; cg.drawImage(snap,0,0);
  cg.globalCompositeOperation="source-over"; cg.restore(); }
/* creature-drawing helpers */
function ground(g,w=26){ g.globalAlpha=.5; ell(g,48,86,w,5,"#060409"); g.globalAlpha=1; }
function limb(g,pts,w,col,inkW){
  g.strokeStyle=col; g.lineWidth=w; g.lineCap="round"; g.lineJoin="round";
  g.beginPath(); g.moveTo(pts[0][0],pts[0][1]);
  for(let i=1;i<pts.length;i++) g.lineTo(pts[i][0],pts[i][1]);
  g.stroke();
  inkPath(g,gg=>{ gg.moveTo(pts[0][0],pts[0][1]);
    for(let i=1;i<pts.length;i++) gg.lineTo(pts[i][0],pts[i][1]); },
    inkW||Math.max(.7,w*.3),"rgba(10,8,14,.55)");
}
function glowDot(g,x,y,r,col){ g.save(); g.shadowColor=col; g.shadowBlur=7; ell(g,x,y,r,r*1.1,col); g.restore(); }
function flameShape(pg,x,y,w,h,col){
  pg.fillStyle=col; pg.beginPath();
  pg.moveTo(x-w,y);
  pg.quadraticCurveTo(x-w*1.1,y-h*.45,x+rf(-1,1),y-h);
  pg.quadraticCurveTo(x+w*1.1,y-h*.45,x+w,y);
  pg.quadraticCurveTo(x,y+w*.8,x-w,y); pg.closePath(); pg.fill();
}
/* room geometry globals (assigned by dungeon.js per room) */
let T=44, WH=24, OX=12, OY=52, CW=464, CH=460;
/* pixel-space animated parts (rooms) */
let PARTS=null, BLINKS=null;
function newLayer(){ const c=document.createElement("canvas"); c.width=CW*2; c.height=CH*2;
  c.getContext("2d").scale(2,2); return c; }
function gradeLayer(c){ const g=c.getContext("2d");
  g.save(); g.setTransform(2,0,0,2,0,0);
  g.globalCompositeOperation="multiply";
  const grd=g.createLinearGradient(0,0,0,CH);
  grd.addColorStop(0,"rgba(212,194,172,1)"); grd.addColorStop(1,"rgba(128,118,152,1)");
  g.fillStyle=grd; g.fillRect(0,0,CW,CH);
  g.globalCompositeOperation="overlay";
  g.globalAlpha=.4; g.fillStyle=g.createPattern(GRAIN,"repeat"); g.fillRect(0,0,CW,CH); g.globalAlpha=1;
  g.globalCompositeOperation="source-over"; g.restore();
}
function part(px,py,motion,drawFn){
  if(!PARTS) return;
  const c=newLayer(); drawFn(c.getContext("2d"));
  PARTS.push({canvas:c,px,py,m:motion});
}
function partZ(z,px,py,motion,drawFn){ part(px,py,motion,drawFn); } // z ignored in-engine
function blink(){ if(BLINKS) BLINKS.push([].slice.call(arguments)); }
function partAngle(m,t){
  const ph=m.phase||0;
  if(m.kind==="sway") return Math.sin(t*m.speed+ph)*m.amp;
  if(m.kind==="flicker") return Math.sin(t*m.speed+ph)*m.amp + Math.sin(t*m.speed*2.63+ph*1.7)*m.amp*.6;
  return 0;
}
function drawPartPx(ctx,p,t){
  const m=p.m, ph=m.phase||0;
  ctx.save();
  if(m.kind==="pulse"){
    const base=(m.base!==undefined)?m.base:.7;
    ctx.globalAlpha=clamp(base+m.amp*Math.sin(t*m.speed+ph),0,1);
    ctx.drawImage(p.canvas,0,0,CW,CH); ctx.restore(); return;
  }
  const a=partAngle(m,t);
  ctx.translate(p.px,p.py); ctx.rotate(a);
  if(m.kind==="flicker") ctx.scale(1,1+0.13*Math.sin(t*m.speed*1.9+ph*1.3));
  ctx.translate(-p.px,-p.py);
  ctx.drawImage(p.canvas,0,0,CW,CH);
  ctx.restore();
}
