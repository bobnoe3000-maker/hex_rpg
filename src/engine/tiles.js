import { rf, ri, pick, chance, shade, ell, inkPath, flameShape, T, WH, OY, part } from './core.js';
/* ============ DP ENGINE :: tiles.js — floor/wall/door painters ============ */
"use strict";


/* ================= tile painters (pixel-space, cell origin x,y) ================= */
const STONE=[
  ["#7a766e","#5e5a54","#403d38"],
  ["#767c84","#585e66","#3c4148"],
  ["#7a7260","#5c5546","#3f3a2e"],
  ["#6a7a6a","#4e5c4e","#363f36"],
];
function crackLine(g,x,y,steps){
  inkPath(g,gg=>{ gg.moveTo(x,y); let px=x,py=y;
    for(let i=0;i<steps;i++){ px+=rf(-5,5); py+=rf(2,6); gg.lineTo(px,py); } },.9,"rgba(10,8,14,.65)");
}
/* --- floors --- */
function pFloor(g,x,y,tone){
  g.fillStyle=tone[1]; g.fillRect(x,y,T,T);
  g.globalAlpha=rf(.05,.13); g.fillStyle=chance(.5)?tone[0]:tone[2];
  g.fillRect(x+rf(2,20),y+rf(2,20),rf(10,24),rf(8,20)); g.globalAlpha=1;
  g.strokeStyle="rgba(10,8,14,.3)"; g.lineWidth=1; g.strokeRect(x+.5,y+.5,T-1,T-1);
  if(chance(.5)) inkPath(g,gg=>{ const sx=x+rf(10,38);
    gg.moveTo(sx,y+2); gg.lineTo(sx+rf(-3,3),y+T-2); },.7,"rgba(10,8,14,.28)");
  if(chance(.5)) ell(g,x+rf(6,42),y+rf(6,42),rf(.5,1.2),rf(.4,.9),chance(.5)?tone[2]:tone[0]);
}
function pCracked(g,x,y,tone){ pFloor(g,x,y,tone); crackLine(g,x+rf(8,36),y+rf(4,14),ri(3,5));
  if(chance(.4)) crackLine(g,x+rf(8,36),y+rf(16,28),ri(2,4)); }
function pMoss(g,x,y,tone){ pFloor(g,x,y,tone); g.globalAlpha=.35;
  for(let i=0;i<3;i++) ell(g,x+rf(6,42),y+rf(6,42),rf(2,4.5),rf(1.4,3),"#4a6e3a"); g.globalAlpha=1; }
function pGrate(g,x,y,tone){ pFloor(g,x,y,tone);
  const x0=x+12,y0=y+12,w=24;
  g.fillStyle="#0a0810"; g.fillRect(x0,y0,w,w);
  g.strokeStyle="#5a5e66"; g.lineWidth=2.4; g.strokeRect(x0-1.5,y0-1.5,w+3,w+3);
  inkPath(g,gg=>gg.rect(x0-2.5,y0-2.5,w+5,w+5),1);
  for(let i=1;i<3;i++){ const o=x0+i*(w/3);
    g.strokeStyle="#5a5e66"; g.lineWidth=1.8;
    g.beginPath(); g.moveTo(o,y0); g.lineTo(o,y0+w); g.stroke();
    g.beginPath(); g.moveTo(x0,o-(x0-y0)); g.lineTo(x0+w,o-(x0-y0)); g.stroke(); }
  for(const [rx,ry] of [[x0-1.5,y0-1.5],[x0+w+1.5,y0-1.5],[x0-1.5,y0+w+1.5],[x0+w+1.5,y0+w+1.5]])
    ell(g,rx,ry,1,1,"#8a8a92");
}
function pPuddle(g,x,y,tone){ pFloor(g,x,y,tone);
  const corner=pick([[x+4,y+T-4,1,-1],[x+T-4,y+T-4,-1,-1],[x+4,y+4,1,1],[x+T-4,y+4,-1,1]]);
  const [px,py,sx,sy]=corner;
  g.fillStyle="#26343e"; g.beginPath();
  g.moveTo(px,py);
  g.quadraticCurveTo(px+sx*rf(16,24),py, px+sx*rf(14,20),py+sy*rf(6,9));
  g.quadraticCurveTo(px+sx*rf(7,12),py+sy*rf(11,16), px,py+sy*rf(15,22));
  g.closePath(); g.fill();
  inkPath(g,gg=>{ gg.moveTo(px+sx*rf(14,20),py+sy*1.5);
    gg.quadraticCurveTo(px+sx*rf(8,13),py+sy*rf(9,14), px,py+sy*rf(15,20)); },.9,"rgba(10,8,14,.55)");
  part(0,0,{kind:"pulse",base:.45,amp:.35,speed:rf(1.2,2.2),phase:rf(0,6)},pg=>{
    pg.strokeStyle="rgba(180,220,240,.5)"; pg.lineWidth=1;
    pg.beginPath(); pg.moveTo(px+sx*3,py+sy*5);
    pg.quadraticCurveTo(px+sx*9,py+sy*8,px+sx*13,py+sy*4); pg.stroke();
  });
}
/* --- flat blocking --- */
function pPit(g,x,y,tone){ pFloor(g,x,y,tone);
  const pd=g.createLinearGradient(0,y+8,0,y+T-4);
  pd.addColorStop(0,tone[2]); pd.addColorStop(.35,"#14121a"); pd.addColorStop(1,"#050308");
  g.fillStyle=pd; g.beginPath();
  g.moveTo(x+7,y+9); g.lineTo(x+41,y+8); g.lineTo(x+43,y+41); g.lineTo(x+6,y+42); g.closePath(); g.fill();
  g.fillStyle=tone[2]; g.beginPath();
  g.moveTo(x+7,y+9); g.lineTo(x+41,y+8); g.lineTo(x+39,y+13); g.lineTo(x+9,y+14); g.closePath(); g.fill();
  inkPath(g,gg=>{ gg.moveTo(x+7,y+9); gg.lineTo(x+41,y+8); gg.lineTo(x+43,y+41); gg.lineTo(x+6,y+42); gg.closePath(); },1.2);
  inkPath(g,gg=>{ gg.moveTo(x+9,y+14); gg.lineTo(x+39,y+13); },.8,"rgba(10,8,14,.55)");
  crackLine(g,x+rf(4,40),y+rf(2,7),2);
}
function pStairsDown(g,x,y,tone){ pFloor(g,x,y,tone);
  let sy=y+7, w=36, sx=x+6;
  inkPath(g,gg=>gg.rect(x+6,y+7,36,34),1.2);
  for(let i=0;i<5;i++){ const h=34/5, kk=1-(i/5)*.85;
    g.fillStyle=shade("#5e5a54",kk); g.fillRect(sx,sy,w,h);
    g.strokeStyle="rgba(240,230,210,"+(0.13*kk)+")"; g.lineWidth=1;
    g.beginPath(); g.moveTo(sx,sy+.6); g.lineTo(sx+w,sy+.6); g.stroke();
    inkPath(g,gg=>{ gg.moveTo(sx,sy+h); gg.lineTo(sx+w,sy+h); },.8,"rgba(10,8,14,.55)");
    sy+=h; sx+=1.7; w-=3.4; }
  g.fillStyle="#04030a"; g.fillRect(sx,sy-1.5,w,3);
}
/* --- tall blocking (extruded) --- */
function pFirePit(g,x,y,tone){ pFloor(g,x,y,tone);
  const fx=x+T/2, fy=y+T/2+4;
  part(0,0,{kind:"pulse",base:.55,amp:.3,speed:rf(5,8),phase:rf(0,6)},pg=>{
    const rg=pg.createRadialGradient(fx,fy,3,fx,fy,34);
    rg.addColorStop(0,"rgba(255,181,77,.55)"); rg.addColorStop(1,"rgba(255,181,77,0)");
    pg.fillStyle=rg; pg.fillRect(fx-40,fy-40,80,80);
  });
  for(let i=0;i<9;i++){ const a=i/9*6.283, rx=fx+Math.cos(a)*13, ry=fy+Math.sin(a)*8;
    ell(g,rx,ry,rf(2.6,3.6),rf(2,2.8),tone[0],rf(-.4,.4));
    inkPath(g,gg=>gg.ellipse(rx,ry,3.2,2.4,0,0,7),.8); }
  ell(g,fx,fy,9.5,5.5,"#14100c");
  for(let i=0;i<3;i++) ell(g,fx+rf(-6,6),fy+rf(-3,3),rf(1.4,2.2),rf(1,1.5),"#2a1c12");
  for(let i=0;i<3;i++){ g.save(); g.shadowColor="#ff6b3d"; g.shadowBlur=5;
    ell(g,fx+rf(-6,6),fy+rf(-2.5,2.5),rf(.5,.9),rf(.4,.7),"#ff8a3a"); g.restore(); }
  part(fx,fy,{kind:"flicker",amp:rf(.05,.09),speed:rf(7,10),phase:rf(0,6)},
    pg=>flameShape(pg,fx,fy,5,rf(14,18),"rgba(255,107,61,.9)"));
  part(fx,fy,{kind:"flicker",amp:rf(.07,.12),speed:rf(9,13),phase:rf(0,6)},
    pg=>flameShape(pg,fx,fy,2.8,rf(8,11),"rgba(255,209,102,.95)"));
}
function pColumn(g,x,y,tone){ pFloor(g,x,y,tone);
  const broken=chance(.35), col=pick(STONE);
  const bx=x+T/2, base=y+T-8, top=broken?y+rf(2,10):y-WH-6;
  g.globalAlpha=.4; ell(g,bx+7,base+2,13,4.5,"#060409"); g.globalAlpha=1;
  ell(g,bx,base,11.5,4,col[2]); inkPath(g,gg=>gg.ellipse(bx,base,11.5,4,0,0,7),1.1);
  const bd=g.createLinearGradient(bx-9,0,bx+9,0);
  bd.addColorStop(0,col[0]); bd.addColorStop(.5,col[1]); bd.addColorStop(1,col[2]);
  g.fillStyle=bd; g.fillRect(bx-9,top,18,base-top);
  inkPath(g,gg=>{ gg.moveTo(bx-9,top); gg.lineTo(bx-9,base); gg.moveTo(bx+9,top); gg.lineTo(bx+9,base); },1.2);
  for(let i=1;i<4;i++){ const fy=top+(base-top)*i/4;
    inkPath(g,gg=>{ gg.moveTo(bx-8,fy); gg.lineTo(bx+8,fy+rf(-1,1)); },.7,"rgba(10,8,14,.4)"); }
  if(broken){ g.fillStyle=col[1]; g.beginPath(); g.moveTo(bx-9,top+1.5);
    let jx=bx-9; while(jx<bx+9){ g.lineTo(jx+2,top-rf(1.5,5)); g.lineTo(jx+4,top+1.5); jx+=4; }
    g.closePath(); g.fill();
    inkPath(g,gg=>{ gg.moveTo(bx-9,top+1.5); let jx=bx-9;
      while(jx<bx+9){ gg.lineTo(jx+2,top-rf(1.5,5)); gg.lineTo(jx+4,top+1.5); jx+=4; } },1);
    for(let i=0;i<3;i++) ell(g,bx+rf(-13,13),base+rf(-2,3),rf(1.4,2.6),rf(1,1.7),col[2]);
  } else { ell(g,bx,top,10,3.6,col[0]); inkPath(g,gg=>gg.ellipse(bx,top,10,3.6,0,0,7),1.1);
    ell(g,bx,top-1.4,7.5,2.4,shade(col[0],1.15)); }
}


/* ================= walls & doorways (extruded 2.5D) ================= */
function pWallCap(g,x,y,tone){
  g.fillStyle=tone[0]; g.fillRect(x,y-WH,T,T);
  // slab streaks running "back"
  for(let i=0;i<2;i++){ const sx=x+rf(8,40);
    inkPath(g,gg=>{ gg.moveTo(sx,y-WH+2); gg.lineTo(sx+rf(-3,3),y+T-WH-2); },.7,"rgba(10,8,14,.3)"); }
  g.globalAlpha=rf(.06,.12); g.fillStyle=chance(.5)?"#fff":tone[2];
  g.fillRect(x+rf(2,18),y-WH+rf(2,18),rf(10,24),rf(8,20)); g.globalAlpha=1;
  // cap seams
  g.strokeStyle="rgba(10,8,14,.4)"; g.lineWidth=1; g.strokeRect(x+.5,y-WH+.5,T-1,T-1);
}
function pWallFace(g,x,y,tone){
  const fy=y+T-WH;
  g.fillStyle=tone[1]; g.fillRect(x,fy,T,WH);
  // 2 brick courses
  const mid=fy+WH*0.52;
  inkPath(g,gg=>{ gg.moveTo(x,mid); gg.lineTo(x+T,mid+rf(-1,1)); },.9,"rgba(10,8,14,.55)");
  for(const [bx,r] of [[x+rf(8,20),0],[x+rf(28,40),0],[x+rf(16,34),1]]){
    const y0=r?mid+1:fy+1, y1=r?fy+WH-1:mid-1;
    inkPath(g,gg=>{ gg.moveTo(bx,y0); gg.lineTo(bx+rf(-1,1),y1); },.8,"rgba(10,8,14,.45)"); }
  if(chance(.35)){ g.globalAlpha=rf(.08,.15);
    g.fillStyle=chance(.5)?tone[0]:tone[2]; g.fillRect(x+rf(4,24),fy+2,rf(12,20),WH*.45); g.globalAlpha=1; }
  // face shading + lit arris where cap meets face
  const sg=g.createLinearGradient(0,fy,0,fy+WH);
  sg.addColorStop(0,"rgba(0,0,0,.05)"); sg.addColorStop(1,"rgba(6,4,10,.42)");
  g.fillStyle=sg; g.fillRect(x,fy,T,WH);
  g.strokeStyle="rgba(240,230,210,.30)"; g.lineWidth=1.3;
  g.beginPath(); g.moveTo(x,fy+.8); g.lineTo(x+T,fy+.8); g.stroke();
  inkPath(g,gg=>{ gg.moveTo(x,fy); gg.lineTo(x+T,fy); },1.1);
  // contact shadow cast onto the floor below
  const cs=g.createLinearGradient(0,y+T,0,y+T+7);
  cs.addColorStop(0,"rgba(6,4,10,.5)"); cs.addColorStop(1,"rgba(6,4,10,0)");
  g.fillStyle=cs; g.fillRect(x,y+T,T,7);
}
function pWall(g,x,y,tone,deco){
  pWallCap(g,x,y,tone); pWallFace(g,x,y,tone);
  if(deco==="crack"){ crackLine(g,x+rf(8,36),y+T-WH+2,2);
    if(chance(.5)){ g.fillStyle="#0e0c12"; g.fillRect(x+rf(6,30),y+T-WH+rf(3,10),rf(8,13),rf(5,8)); } }
  if(deco==="torch"){
    const tx=x+T/2, base=y+T-4, cup=y+T-15;
    part(0,0,{kind:"pulse",base:.5,amp:.3,speed:rf(5,8),phase:rf(0,6)},pg=>{
      const rg=pg.createRadialGradient(tx,cup-4,2,tx,cup-4,30);
      rg.addColorStop(0,"rgba(255,181,77,.6)"); rg.addColorStop(1,"rgba(255,181,77,0)");
      pg.fillStyle=rg; pg.fillRect(tx-34,cup-38,68,72);
    });
    g.fillStyle="#3a3a42"; g.fillRect(tx-1.5,base-6,3,5); inkPath(g,gg=>gg.rect(tx-1.5,base-6,3,5),.8);
    g.strokeStyle="#5a4a32"; g.lineWidth=2.6;
    g.beginPath(); g.moveTo(tx,base-5); g.lineTo(tx,cup+2); g.stroke();
    inkPath(g,gg=>{ gg.moveTo(tx,base-5); gg.lineTo(tx,cup+2); },.9);
    g.fillStyle="#2a2018"; g.fillRect(tx-2.4,cup,4.8,3); inkPath(g,gg=>gg.rect(tx-2.4,cup,4.8,3),.8);
    part(tx,cup+1,{kind:"flicker",amp:rf(.06,.1),speed:rf(8,11),phase:rf(0,6)},
      pg=>flameShape(pg,tx,cup+1,3.6,rf(11,14),"rgba(255,107,61,.92)"));
    part(tx,cup+1,{kind:"flicker",amp:rf(.08,.13),speed:rf(10,14),phase:rf(0,6)},
      pg=>flameShape(pg,tx,cup+1,2,rf(6,8.5),"rgba(255,224,138,.95)"));
  }
  if(deco==="chains"){
    for(let c=0,n=ri(1,2);c<n;c++){
      const ax=x+(n===1?rf(16,32):(c===0?rf(9,17):rf(30,38)));
      const ay=y+T-WH+3, len=rf(14,19), drift=rf(-3,3);
      ell(g,ax,ay,1.9,1.9,"#3a3a42"); ell(g,ax,ay,.9,.9,"#0a0810");
      part(ax,ay,{kind:"sway",amp:rf(.04,.08),speed:rf(.7,1.3),phase:rf(0,6)},pg=>{
        const links=6;
        for(let i=0;i<links;i++){ const t2=i/(links-1);
          const lx=ax+drift*t2, ly=ay+2+t2*len;
          pg.strokeStyle="#4a4a52"; pg.lineWidth=1.2;
          pg.beginPath(); pg.ellipse(lx,ly,i%2?1.1:1.7,i%2?1.8:1.2,0,0,7); pg.stroke(); }
        const sx=ax+drift, sy=ay+len+5;
        pg.strokeStyle="#4a4a52"; pg.lineWidth=1.7;
        pg.beginPath(); pg.ellipse(sx,sy,2.8,3.2,0,0,7); pg.stroke();
      });
    }
  }
}
function doorLabel(g,x,y,txt,above){
  g.font="italic 10px Georgia"; g.textAlign="center";
  const ty=above? y-WH-7 : y+T+13;
  g.fillStyle="rgba(6,4,10,.8)"; g.fillText(txt,x+T/2+1,ty+1);
  g.fillStyle="#e8dcc4"; g.fillText(txt,x+T/2,ty);
}
function pDoor(g,x,y,tone,type,label){
  pWallCap(g,x,y,tone); pWallFace(g,x,y,tone);
  const vw=26, vx=x+(T-vw)/2, vtop=y+T-WH-11, vh=(y+T)-vtop;
  if(type==="stairsUp"){
    g.fillStyle="#0a0810"; g.fillRect(vx,vtop,vw,vh);
    let sy=y+T, w=vw-4, sx=vx+2;
    for(let i=0;i<4;i++){ const h=(vh-3)/4, kk=.5+(i/4)*.8;
      g.fillStyle=shade(tone[1],kk); g.fillRect(sx,sy-h,w,h);
      g.strokeStyle="rgba(240,230,210,"+(0.1+0.18*(i/4))+")"; g.lineWidth=1;
      g.beginPath(); g.moveTo(sx,sy-h+.6); g.lineTo(sx+w,sy-h+.6); g.stroke();
      sy-=h; sx+=1.1; w-=2.2; }
    const lg=g.createLinearGradient(0,vtop,0,vtop+8);
    lg.addColorStop(0,"rgba(240,224,180,.5)"); lg.addColorStop(1,"rgba(240,224,180,0)");
    g.fillStyle=lg; g.fillRect(vx+2,vtop,vw-4,8);
  } else {
    const dg=g.createLinearGradient(0,vtop,0,y+T);
    dg.addColorStop(0,"#04030a"); dg.addColorStop(1,"#0c0a14");
    g.fillStyle=dg;
    if(type==="arch"){ g.beginPath();
      g.moveTo(vx,y+T); g.lineTo(vx,vtop+vw/2);
      g.arc(vx+vw/2,vtop+vw/2,vw/2,Math.PI,0); g.lineTo(vx+vw,y+T); g.closePath(); g.fill();
    } else g.fillRect(vx,vtop,vw,vh);
    g.globalAlpha=.3; g.fillStyle="#3a3a52"; g.fillRect(vx+2,y+T-2.5,vw-4,1.6); g.globalAlpha=1;
  }
  if(type==="arch"){ // voussoirs
    for(let i=0;i<=5;i++){ const a=Math.PI+i/5*Math.PI;
      const mx=vx+vw/2, my=vtop+vw/2;
      const x1=mx+Math.cos(a)*(vw/2), y1=my+Math.sin(a)*(vw/2);
      const x2=mx+Math.cos(a)*(vw/2+5), y2=my+Math.sin(a)*(vw/2+5);
      g.strokeStyle=(i===2||i===3)?tone[0]:shade(tone[0],.85); g.lineWidth=4.4;
      g.beginPath(); g.moveTo(x1,y1); g.lineTo(x2,y2); g.stroke();
      inkPath(g,gg=>{ gg.moveTo(x1,y1); gg.lineTo(x2,y2); },.7); }
    inkPath(g,gg=>{ gg.moveTo(vx,y+T); gg.lineTo(vx,vtop+vw/2);
      gg.arc(vx+vw/2,vtop+vw/2,vw/2,Math.PI,0); gg.lineTo(vx+vw,y+T); },1.1);
  } else {
    g.fillStyle=tone[0]; g.fillRect(vx-3,vtop,3,vh); g.fillRect(vx+vw,vtop,3,vh);
    inkPath(g,gg=>{ gg.rect(vx-3,vtop,3,vh); gg.rect(vx+vw,vtop,3,vh); },.9);
    inkPath(g,gg=>gg.rect(vx,vtop,vw,vh),1.1);
    // lintel
    g.fillStyle=shade(tone[0],1.05); g.fillRect(vx-4,vtop-3.5,vw+8,4);
    inkPath(g,gg=>gg.rect(vx-4,vtop-3.5,vw+8,4),.9);
  }
  if(type==="arch"&&chance(.6)){ const gc=pick(["#7ae0ff","#b48bff","#7ee787"]);
    part(0,0,{kind:"pulse",base:.3,amp:.2,speed:rf(1,2),phase:rf(0,6)},pg=>{
      const rg=pg.createRadialGradient(vx+vw/2,y+T-6,2,vx+vw/2,y+T-6,14);
      rg.addColorStop(0,gc+"66"); rg.addColorStop(1,"rgba(0,0,0,0)");
      pg.fillStyle=rg; pg.fillRect(vx-4,vtop,vw+8,vh+4);
    }); }
  doorLabel(g,x,y,label,y<OY+T); // above for the north wall, below for the south
}

export {
  STONE, crackLine, pFloor, pCracked, pMoss, pGrate, pPuddle, pPit, pStairsDown, pFirePit, pColumn, pWallCap, pWallFace, pWall, doorLabel, pDoor
};
