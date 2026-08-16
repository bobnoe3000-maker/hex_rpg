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

/* ================= new decorative tiles (walkable — never block a cell) ================= */
function pEmber(g,x,y,tone){ pFloor(g,x,y,tone);
  for(let j=0;j<2;j++){ let px=x+rf(8,34),py=y+rf(6,16);
    g.strokeStyle="rgba(224,115,58,.75)"; g.lineWidth=2; g.lineCap="round"; g.beginPath();
    g.moveTo(px,py); for(let i=0;i<3;i++){ px+=rf(-8,8); py+=rf(4,10); g.lineTo(px,py); } g.stroke(); }
  const fx=x+T/2, fy=y+T/2;
  part(0,0,{kind:"pulse",base:.4,amp:.35,speed:rf(2,4),phase:rf(0,6)},pg=>{
    const rg=pg.createRadialGradient(fx,fy,2,fx,fy,20);
    rg.addColorStop(0,"rgba(255,150,80,.32)"); rg.addColorStop(1,"rgba(255,150,80,0)");
    pg.fillStyle=rg; pg.fillRect(x-6,y-6,T+12,T+12); });
}
function pRune(g,x,y,tone){ pFloor(g,x,y,tone);
  const cx=x+T/2, cy=y+T/2;
  g.strokeStyle="rgba(121,199,230,.7)"; g.lineWidth=1.6;
  g.beginPath(); g.arc(cx,cy,T*.22,0,7); g.stroke();
  g.beginPath(); g.moveTo(cx,cy-T*.22); g.lineTo(cx+T*.18,cy+T*.13); g.lineTo(cx-T*.18,cy+T*.13); g.closePath(); g.stroke();
  part(0,0,{kind:"pulse",base:.4,amp:.35,speed:rf(1.5,3),phase:rf(0,6)},pg=>{
    const rg=pg.createRadialGradient(cx,cy,2,cx,cy,17);
    rg.addColorStop(0,"rgba(121,199,230,.3)"); rg.addColorStop(1,"rgba(121,199,230,0)");
    pg.fillStyle=rg; pg.fillRect(x-4,y-4,T+8,T+8); });
}
function pBones(g,x,y,tone){ pFloor(g,x,y,tone);
  g.lineCap="round";
  for(let i=0;i<3;i++){ const bx=x+rf(9,35),by=y+rf(9,35),a=rf(0,6.28),l=T*.15;
    g.strokeStyle="rgba(203,184,154,.8)"; g.lineWidth=2.2;
    g.beginPath(); g.moveTo(bx-Math.cos(a)*l,by-Math.sin(a)*l); g.lineTo(bx+Math.cos(a)*l,by+Math.sin(a)*l); g.stroke();
    ell(g,bx-Math.cos(a)*l,by-Math.sin(a)*l,1.5,1.5,"#cbb89a");
    ell(g,bx+Math.cos(a)*l,by+Math.sin(a)*l,1.5,1.5,"#cbb89a"); }
}
function pRubble(g,x,y,tone){ pFloor(g,x,y,tone);
  for(let i=0;i<6;i++){ const rx=x+rf(6,38),ry=y+rf(6,38);
    ell(g,rx,ry,rf(2,3.4),rf(1.6,2.6),i%2?tone[0]:tone[2],rf(-.4,.4));
    inkPath(g,gg=>gg.ellipse(rx,ry,rf(2,3.4),rf(1.6,2.6),0,0,7),.7,"rgba(10,8,14,.4)"); }
}
function pMushroom(g,x,y,tone){ pFloor(g,x,y,tone);
  for(let i=0;i<3;i++){ const bx=x+rf(9,35),by=y+rf(16,36);
    g.strokeStyle="rgba(220,210,225,.7)"; g.lineWidth=1.8;
    g.beginPath(); g.moveTo(bx,by); g.lineTo(bx,by-T*.13); g.stroke();
    g.fillStyle=["#b48bff","#7ae0ff","#e08a5a"][i%3];
    g.beginPath(); g.ellipse(bx,by-T*.13,T*.09,T*.055,0,Math.PI,0); g.fill(); }
}
function pAsh(g,x,y,tone){ pFloor(g,x,y,tone); g.globalAlpha=.5;
  for(let i=0;i<24;i++){ g.fillStyle=chance(.5)?"#3a3640":"#4a4650"; g.fillRect(x+rf(2,T-3),y+rf(2,T-3),1.4,1.4); }
  g.globalAlpha=1;
}
/* frost — an icy sheen with a couple of pale-blue crystal shards (Frostmere / Rimeheart / Skyreach) */
function pFrost(g,x,y,tone){ pFloor(g,x,y,tone);
  g.globalAlpha=.20; g.fillStyle="#cfe8ff"; g.fillRect(x+rf(3,10),y+rf(3,10),rf(14,26),rf(9,18)); g.globalAlpha=1;
  for(let i=0;i<2;i++){ const cx=x+rf(10,34),cy=y+rf(14,34),h=rf(5,9);
    g.fillStyle="rgba(190,228,255,.85)"; g.beginPath();
    g.moveTo(cx,cy-h); g.lineTo(cx+3,cy); g.lineTo(cx,cy+2); g.lineTo(cx-3,cy); g.closePath(); g.fill();
    inkPath(g,gg=>{ gg.moveTo(cx,cy-h); gg.lineTo(cx+3,cy); gg.lineTo(cx,cy+2); gg.lineTo(cx-3,cy); gg.closePath(); },.7,"rgba(70,100,130,.6)"); }
  part(0,0,{kind:"pulse",base:.3,amp:.2,speed:rf(1,2),phase:rf(0,6)},pg=>{
    const rg=pg.createRadialGradient(x+T/2,y+T/2,2,x+T/2,y+T/2,16);
    rg.addColorStop(0,"rgba(200,232,255,.24)"); rg.addColorStop(1,"rgba(200,232,255,0)");
    pg.fillStyle=rg; pg.fillRect(x-4,y-4,T+8,T+8); });
}
/* crystal — glowing violet/cyan gem shards jutting from the floor (Draconis Apex) */
function pCrystal(g,x,y,tone){ pFloor(g,x,y,tone);
  const cols=["#b48bff","#7ae0ff","#d69bff"];
  for(let i=0;i<3;i++){ const cx=x+rf(9,35),cy=y+rf(16,34),h=rf(6,12),w=rf(2.5,4),col=cols[i%3];
    g.globalAlpha=.85; g.fillStyle=col; g.beginPath();
    g.moveTo(cx,cy-h); g.lineTo(cx+w,cy-h*0.3); g.lineTo(cx,cy+2); g.lineTo(cx-w,cy-h*0.3); g.closePath(); g.fill(); g.globalAlpha=1;
    inkPath(g,gg=>{ gg.moveTo(cx,cy-h); gg.lineTo(cx+w,cy-h*0.3); gg.lineTo(cx,cy+2); gg.lineTo(cx-w,cy-h*0.3); gg.closePath(); },.7,"rgba(30,20,50,.7)"); }
  part(0,0,{kind:"pulse",base:.4,amp:.35,speed:rf(1.5,3),phase:rf(0,6)},pg=>{
    const rg=pg.createRadialGradient(x+T/2,y+T/2,2,x+T/2,y+T/2,18);
    rg.addColorStop(0,"rgba(180,139,255,.3)"); rg.addColorStop(1,"rgba(180,139,255,0)");
    pg.fillStyle=rg; pg.fillRect(x-4,y-4,T+8,T+8); });
}

/* ================= wall block — old wall art reused as an impassable obstacle ================= */
/* An extruded stone block sitting on a floor cell. Blocks movement like a column/pit. Variants
   (solid / broken / mossy) are picked here so a run of them still reads with variety. */
function pWallBlock(g,x,y,tone){
  pFloor(g,x,y,tone);
  const broken=chance(.28), mossy=!broken&&chance(.22);
  g.save(); g.globalAlpha=.4; ell(g,x+T/2,y+T*0.9,T*0.4,T*0.1,"#050308"); g.restore();   // contact shadow
  const fx=x+T*0.12, fw=T*0.76, top=y+T*0.14, capH=T*0.34, faceB=y+T*0.9, faceT=top+capH;
  const cg=g.createLinearGradient(fx,0,fx+fw,0); cg.addColorStop(0,tone[0]); cg.addColorStop(.5,"#8b857a"); cg.addColorStop(1,tone[2]);
  if(broken){ g.fillStyle=cg; g.beginPath(); g.moveTo(fx,faceT); let jx=fx;
    while(jx<fx+fw){ g.lineTo(jx+T*0.05, top-rf(0,T*0.08)+capH*0.4); g.lineTo(jx+T*0.1, faceT-capH*0.5); jx+=T*0.1; }
    g.lineTo(fx+fw,faceT); g.closePath(); g.fill();
  } else { g.fillStyle=cg; g.fillRect(fx,top,fw,capH); g.fillStyle="rgba(255,255,255,.1)"; g.fillRect(fx,top,fw,3); }
  const fg=g.createLinearGradient(0,faceT,0,faceB); fg.addColorStop(0,tone[1]); fg.addColorStop(1,tone[2]);
  g.fillStyle=fg; g.fillRect(fx,faceT,fw,faceB-faceT);
  const mid=faceT+(faceB-faceT)*0.5;
  inkPath(g,gg=>{gg.moveTo(fx,mid);gg.lineTo(fx+fw,mid);},1,"rgba(10,8,14,.5)");
  for(const bx of [fx+fw*0.35, fx+fw*0.7, fx+fw*0.5]){ const y0=bx<fx+fw*0.55?faceT:mid, y1=bx<fx+fw*0.55?mid:faceB;
    inkPath(g,gg=>{gg.moveTo(bx,y0+1);gg.lineTo(bx,y1-1);},.8,"rgba(10,8,14,.45)"); }
  g.strokeStyle="rgba(240,230,210,.3)"; g.lineWidth=1.3; g.beginPath(); g.moveTo(fx,faceT+.6); g.lineTo(fx+fw,faceT+.6); g.stroke();
  inkPath(g,gg=>gg.rect(fx,faceT,fw,faceB-faceT),1.1);
  if(!broken) inkPath(g,gg=>gg.rect(fx,top,fw,capH),1);
  if(broken) for(let i=0;i<4;i++) ell(g,x+T*0.1+rf(0,T*0.8),faceB-2+rf(0,4),T*0.05,T*0.035,tone[2]);
  if(mossy){ g.globalAlpha=.45; for(let i=0;i<7;i++) ell(g,fx+rf(0,fw),faceT+rf(0,faceB-faceT),T*0.06,T*0.04,"#4a6e3a"); g.globalAlpha=1; }
}

/* ================= exit — a wall segment at the floor's edge with a doorway/arch/stairs cut in ==== */
const XKIND = { onward:"arch", vault:"arch", shrine:"open", stair:"stairsUp", boss:"stairsUp" };
const XGLOW = { arch:"255,209,102", open:"121,199,230", stairsUp:"126,231,135" };
const XLABELC = { arch:"#e8c06a", open:"#a6e0f5", stairsUp:"#8fe6a0" };
function pExitWall(g,x,y,dir,kind,label,tone){
  const style=XKIND[kind]||"arch", glow=XGLOW[style], lc=XLABELC[style];
  tone=tone||STONE[0];
  const cx=x+T/2, cy=y+T/2;
  const rot = dir==="N"?0 : dir==="E"?Math.PI/2 : dir==="S"?Math.PI : -Math.PI/2;   // opening faces the void
  // pulsing glow beyond the opening (animated part layer, rotated to match)
  part(0,0,{kind:"pulse",base:.4,amp:.28,speed:rf(1.2,2.2),phase:rf(0,6)},pg=>{
    pg.save(); pg.translate(cx,cy); pg.rotate(rot);
    const oy=-T*0.34; const rg=pg.createRadialGradient(0,oy,2,0,oy,T*0.9);
    rg.addColorStop(0,"rgba("+glow+",.55)"); rg.addColorStop(1,"rgba("+glow+",0)");
    pg.fillStyle=rg; pg.fillRect(-T,oy-T,T*2,T*2); pg.restore();
  });
  g.save(); g.translate(cx,cy); g.rotate(rot);
  const bandTop=-T*0.5-WH*0.5, cap=WH*0.6, faceB=0, faceT=bandTop+cap;
  const cg=g.createLinearGradient(-T/2,0,T/2,0); cg.addColorStop(0,tone[0]); cg.addColorStop(.5,"#8b857a"); cg.addColorStop(1,tone[2]);
  g.fillStyle=cg; g.fillRect(-T/2-1,bandTop,T+2,cap);
  const fg=g.createLinearGradient(0,faceT,0,faceB); fg.addColorStop(0,tone[1]); fg.addColorStop(1,tone[2]);
  g.fillStyle=fg; g.fillRect(-T/2-1,faceT,T+2,faceB-faceT);
  g.strokeStyle="rgba(240,230,210,.28)"; g.lineWidth=1.3; g.beginPath(); g.moveTo(-T/2-1,faceT+.6); g.lineTo(T/2+1,faceT+.6); g.stroke();
  const ow=T*0.44, ox0=-ow/2, otop=faceT+T*0.05, ob=faceB;
  const cut=gg=>{ if(style==="arch"){ gg.beginPath(); gg.moveTo(ox0,ob); gg.lineTo(ox0,otop+ow/2); gg.arc(0,otop+ow/2,ow/2,Math.PI,0,false); gg.lineTo(ox0+ow,ob); gg.closePath(); } else { gg.beginPath(); gg.rect(ox0,otop,ow,ob-otop); } };
  g.fillStyle="#07060e"; cut(g); g.fill();
  const ig=g.createLinearGradient(0,otop,0,ob); ig.addColorStop(0,"rgba("+glow+",.6)"); ig.addColorStop(1,"rgba("+glow+",.05)");
  g.globalAlpha=.85; g.fillStyle=ig; cut(g); g.fill(); g.globalAlpha=1;
  if(style==="stairsUp"){ let sy=ob, sw=ow-4, sx=ox0+2;
    for(let i=0;i<4;i++){ const h=(ob-otop-2)/4;
      g.fillStyle="rgba("+glow+","+(.15+.2*(i/4))+")"; g.fillRect(sx,sy-h,sw,h*.75);
      g.strokeStyle="rgba(240,230,210,"+(.12+.2*(i/4))+")"; g.lineWidth=1; g.beginPath(); g.moveTo(sx,sy-h+.6); g.lineTo(sx+sw,sy-h+.6); g.stroke();
      sy-=h; sx+=1.4; sw-=2.8; } }
  if(style==="arch"){ for(let i=0;i<=6;i++){ const a=Math.PI+i/6*Math.PI, my=otop+ow/2;
      const x1=Math.cos(a)*ow/2, y1=my+Math.sin(a)*ow/2, x2=Math.cos(a)*(ow/2+5), y2=my+Math.sin(a)*(ow/2+5);
      g.strokeStyle=(i===3)?tone[0]:"#6a655c"; g.lineWidth=4.2; g.beginPath(); g.moveTo(x1,y1); g.lineTo(x2,y2); g.stroke(); }
    inkPath(g,gg=>cut(gg),1.2);
  } else { g.fillStyle="#6a655c"; g.fillRect(ox0-4,otop,4,ob-otop); g.fillRect(ox0+ow,otop,4,ob-otop);
    g.fillStyle="#7a746a"; g.fillRect(ox0-5,otop-4,ow+10,5);
    inkPath(g,gg=>{gg.rect(ox0-4,otop,4,ob-otop);gg.rect(ox0+ow,otop,4,ob-otop);},1); }
  g.restore();
  if(label){ g.font="italic 9px Georgia"; g.textAlign="center";
    let lx=cx, ly=cy;
    if(dir==="N") ly=cy-T*0.55; else if(dir==="S") ly=cy+T*0.62; else { lx=dir==="W"?cx-T*0.5:cx+T*0.5; ly=cy-T*0.32; }
    g.fillStyle="rgba(6,4,10,.85)"; g.fillText(label,lx+1,ly+1); g.fillStyle=lc; g.fillText(label,lx,ly); }
}

/* ================= portal (kept for reference; exits now use pExitWall) ================= */
const PKIND={ onward:{c:"#e8c06a",g:"255,209,102"}, shrine:{c:"#a6e0f5",g:"121,199,230"},
  vault:{c:"#e8c06a",g:"216,162,74"}, boss:{c:"#ff9a5c",g:"224,115,58"}, stair:{c:"#8fe6a0",g:"126,231,135"} };
function pPortal(g,x,y,dir,kind,label){
  const K=PKIND[kind]||PKIND.onward;
  let ox=x+T/2, oy=y+T/2;
  if(dir==="N")oy=y-1; else if(dir==="S")oy=y+T+1; else if(dir==="W")ox=x-1; else if(dir==="E")ox=x+T+1;
  // pulsing glow in the void beyond the edge (animated part layer)
  part(0,0,{kind:"pulse",base:.42,amp:.28,speed:rf(1.2,2.2),phase:rf(0,6)},pg=>{
    const rg=pg.createRadialGradient(ox,oy,2,ox,oy,T*0.95);
    rg.addColorStop(0,"rgba("+K.g+",.5)"); rg.addColorStop(1,"rgba("+K.g+",0)");
    pg.fillStyle=rg; pg.fillRect(ox-T,oy-T,T*2,T*2); });
  // the arch itself, baked into the base
  g.save(); g.translate(ox,oy); if(dir==="W"||dir==="E") g.rotate(Math.PI/2);
  const w=T*.32, h=T*.42;
  const arc=gg=>{ gg.beginPath(); gg.moveTo(-w,h*.5); gg.lineTo(-w,-h*.1); gg.arc(0,-h*.1,w,Math.PI,0,false); gg.lineTo(w,h*.5); };
  const ig=g.createLinearGradient(0,-h,0,h*.5); ig.addColorStop(0,"rgba("+K.g+",.5)"); ig.addColorStop(1,"rgba("+K.g+",0)");
  g.fillStyle=ig; arc(g); g.closePath(); g.fill();
  g.strokeStyle=K.c; g.lineWidth=2.4; g.lineCap="round"; arc(g); g.stroke();
  g.restore();
  if(label){ g.font="italic 9px Georgia"; g.textAlign="center";
    const ly = dir==="N"? oy-6 : dir==="S"? oy+11 : oy-T*.5;
    g.fillStyle="rgba(6,4,10,.85)"; g.fillText(label,ox+1,ly+1);
    g.fillStyle=K.c; g.fillText(label,ox,ly); }
}

export {
  STONE, crackLine, pFloor, pCracked, pMoss, pGrate, pPuddle, pPit, pFirePit, pColumn, pWallCap, pWallFace, pWall, doorLabel, pDoor,
  pEmber, pRune, pBones, pRubble, pMushroom, pAsh, pFrost, pCrystal, pPortal, pWallBlock, pExitWall
};
