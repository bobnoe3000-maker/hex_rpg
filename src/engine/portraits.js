import { mulberry32, R, rf, pick, chance, shade, ell, inkPath, hatch, GRAIN, seedRng } from './core.js';
/* ============ DP ENGINE :: portraits.js — hero portrait generator ============ */
"use strict";
const SKIN={
  human:["#8a5a38","#6e452b","#c9915f","#a06a3f","#5c3a24","#b87f52"],
  elf:["#d8c2a4","#b8a288","#c4a8b8","#a89a80"],
  goblin:["#6f9e4d","#5a8a3f","#7fae57","#4f7a38"],
  orc:["#4f7a44","#3e6236","#5c8a4a"],
  undead:["#b8b09a","#a8a292","#c4bca4"],
  demon:["#9a3a3a","#7a2e4a","#8a3a5e","#a84a32"],
};
const HAIR=["#14100c","#2a1c10","#4a2c14","#6e3a1a","#8a8078","#d8d0c0","#3a3a44","#6e2a1a"];
const BGH=[ // background moods: inner, outer
  ["#3a4a52","#0e1418"],["#4a2e3a","#140a10"],["#3a3052","#0e0a1c"],
  ["#4a3a24","#140f08"],["#2e4234","#0a120c"],["#42303a","#120a10"],
  ["#523a2a","#160e08"],["#2a3a4a","#080e14"] ];
const CLOTH=["#3a3448","#4a3828","#2e3e34","#48303a","#3e3e46","#523a22","#2a3444"];
const METAL=["#6e7480","#7a7268","#5e6470"];




/* ================= feature layers ================= */
function drawBG(g,pal){
  const [inA,outA]=pal.bg;
  const bg=g.createRadialGradient(48,36,4,48,52,72);
  bg.addColorStop(0,inA); bg.addColorStop(1,outA);
  g.fillStyle=bg; g.fillRect(0,0,96,96);
  // drifting smoke blobs
  for(let i=0;i<5;i++){ g.globalAlpha=rf(.04,.10);
    ell(g,rf(10,86),rf(20,90),rf(14,30),rf(8,18),chance(.5)?"#000":"#ffffff"); }
  g.globalAlpha=1;
}
function drawShoulders(g,pal,f){
  const cl=g.createLinearGradient(0,60,0,96);
  cl.addColorStop(0,pal.cloth); cl.addColorStop(1,"#0a0810");
  g.fillStyle=cl; g.beginPath();
  g.moveTo(6,96); g.quadraticCurveTo(10,66,34,62); g.lineTo(62,62);
  g.quadraticCurveTo(86,66,90,96); g.closePath(); g.fill();
  const o=f.outfit;
  if(o==="cloak"){
    for(let i=0;i<3;i++){ const fx=22+i*22;
      inkPath(g,gg=>{ gg.moveTo(fx,96); gg.quadraticCurveTo(fx+rf(-4,4),78,fx+rf(-2,2),68); },1,"rgba(8,6,12,.4)"); }
    if(chance(.6)){ ell(g,48,70,3,3,"#c9a04a"); inkPath(g,gg=>{ gg.ellipse(48,70,3,3,0,0,7); },1); }
  }
  if(o==="robe"){
    g.fillStyle=shade(pal.cloth,.7); g.beginPath();
    g.moveTo(34,62); g.quadraticCurveTo(48,58,62,62); g.lineTo(64,70);
    g.quadraticCurveTo(48,65,32,70); g.closePath(); g.fill();
    g.fillStyle=f.cloth2; g.fillRect(45,66,6,30);
    inkPath(g,gg=>{ gg.rect(45,66,6,30); },1.1);
    for(const fx of [26,70]) inkPath(g,gg=>{ gg.moveTo(fx,96); gg.quadraticCurveTo(fx+rf(-3,3),80,fx+rf(-2,2),68); },1,"rgba(8,6,12,.45)");
    inkPath(g,gg=>{ gg.moveTo(34,62); gg.quadraticCurveTo(48,58,62,62); },1.4);
  }
  if(o==="tunic"){
    g.fillStyle=f.cloth2; g.beginPath();
    g.moveTo(36,64); g.quadraticCurveTo(48,60,60,64); g.lineTo(58,96); g.lineTo(38,96); g.closePath(); g.fill();
    hatch(g,gg=>{ gg.moveTo(36,64); gg.quadraticCurveTo(48,60,60,64); gg.lineTo(58,96); gg.lineTo(38,96); gg.closePath(); },50,62,64,96,-0.55,4,"rgba(8,6,12,.12)");
    inkPath(g,gg=>{ gg.moveTo(36,64); gg.quadraticCurveTo(48,60,60,64); },1.4);
    inkPath(g,gg=>{ gg.moveTo(48,66); gg.lineTo(48,80); },1.2);
    for(let i=0;i<3;i++) inkPath(g,gg=>{ gg.moveTo(44,68+i*4); gg.lineTo(52,70+i*4); },.9,"rgba(8,6,12,.55)");
  }
  if(o==="vest"){
    g.fillStyle=f.cloth2; g.beginPath();
    g.moveTo(38,63); g.lineTo(58,63); g.lineTo(56,96); g.lineTo(40,96); g.closePath(); g.fill();
    g.fillStyle=shade(pal.cloth,.65);
    g.beginPath(); g.moveTo(34,62); g.lineTo(44,66); g.lineTo(40,96); g.lineTo(24,96); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(62,62); g.lineTo(52,66); g.lineTo(56,96); g.lineTo(72,96); g.closePath(); g.fill();
    inkPath(g,gg=>{ gg.moveTo(44,66); gg.lineTo(40,96); gg.moveTo(52,66); gg.lineTo(56,96); },1.4);
    inkPath(g,gg=>{ gg.moveTo(42,64); gg.lineTo(48,74); gg.lineTo(54,64); },1.2);
    for(let i=0;i<2;i++) ell(g,48,80+i*7,1.4,1.4,"rgba(10,8,14,.8)");
  }
  if(pal.pauldrons){
    for(const sx of [17,79]){ ell(g,sx,80,15,13,pal.metal);
      g.globalAlpha=.5; ell(g,sx-3,76,9,6,"#e8e8f0"); g.globalAlpha=1;
      inkPath(g,gg=>{ gg.ellipse(sx,80,15,13,0,0,7); },1.6);
      inkPath(g,gg=>{ gg.moveTo(sx-12,74); gg.quadraticCurveTo(sx,68,sx+12,74); },1,"rgba(8,6,12,.5)"); }
  }
  inkPath(g,gg=>{ gg.moveTo(10,96); gg.quadraticCurveTo(14,68,36,63); gg.lineTo(60,63);
    gg.quadraticCurveTo(82,68,86,96); },1.6);
}
function headPath(g,f){ g.ellipse(48,44,f.headW,f.headH,0,0,7); }
function drawHead(g,pal,f){
  g.fillStyle=pal.skinD; g.fillRect(41,60,14,13); // neck
  inkPath(g,gg=>{ gg.moveTo(41,62); gg.lineTo(41,72); gg.moveTo(55,62); gg.lineTo(55,72); },1.1);
  ell(g,48,44,f.headW,f.headH,pal.skin);
  if(f.jaw){ g.fillStyle=pal.skin; g.beginPath();
    g.moveTo(48-f.headW*.7,50); g.quadraticCurveTo(48,50+f.headH*.85,48+f.headW*.7,50); g.fill(); }
  // core shadow (right side) + key light (upper left)
  g.globalAlpha=.42; ell(g,48+f.headW*.45,46,f.headW*.55,f.headH*.85,pal.skinD);
  g.globalAlpha=.20; ell(g,42,38,f.headW*.5,f.headH*.6,"#fff8e8");
  g.globalAlpha=1;
  // hatching in shadow half
  hatch(g,gg=>headPath(gg,f),48,48+f.headW,20,68);
  // head outline ink
  inkPath(g,gg=>headPath(gg,f),1.8);
}
function drawEars(g,pal,f){
  const hw=f.headW;
  if(f.ears==="point"){ // elf: swept blade with inner ridge line
    for(const s of [-1,1]){ const bx=48+s*(hw-2);
      g.fillStyle=pal.skin; g.beginPath();
      g.moveTo(bx,38); g.quadraticCurveTo(48+s*(hw+10),30,48+s*(hw+17),26+rf(-2,2));
      g.quadraticCurveTo(48+s*(hw+8),38,48+s*(hw-3),50); g.closePath(); g.fill();
      g.globalAlpha=.4; ell(g,48+s*(hw+5),36,4,3,pal.skinD,s*.5); g.globalAlpha=1;
      inkPath(g,gg=>{ gg.moveTo(bx,38); gg.quadraticCurveTo(48+s*(hw+10),30,48+s*(hw+17),26);
        gg.quadraticCurveTo(48+s*(hw+8),38,48+s*(hw-3),50); },1.3);
      inkPath(g,gg=>{ gg.moveTo(48+s*(hw+12),28); gg.quadraticCurveTo(48+s*(hw+4),34,48+s*hw,42); },.9,"rgba(10,8,14,.5)");
    }
  } else if(f.ears==="big"){ // goblin/orc: long back-swept ear, torn notch, concha shadow
    for(const s of [-1,1]){ const bx=48+s*(hw-2), tipx=48+s*(hw+16), tipy=30+rf(-4,3);
      g.fillStyle=pal.skin; g.beginPath();
      g.moveTo(bx,38);
      g.quadraticCurveTo(48+s*(hw+8),32,tipx,tipy);
      g.quadraticCurveTo(48+s*(hw+12),40,48+s*(hw+7),46);
      g.lineTo(48+s*(hw+5),44);
      g.lineTo(48+s*(hw+4),49);
      g.quadraticCurveTo(48+s*hw,52,48+s*(hw-3),52);
      g.closePath(); g.fill();
      g.globalAlpha=.5; ell(g,48+s*(hw+5),40,5.5,3,pal.skinD,-s*.5); g.globalAlpha=1;
      inkPath(g,gg=>{ gg.moveTo(bx,38); gg.quadraticCurveTo(48+s*(hw+8),32,tipx,tipy);
        gg.quadraticCurveTo(48+s*(hw+12),40,48+s*(hw+7),46);
        gg.lineTo(48+s*(hw+5),44); gg.lineTo(48+s*(hw+4),49);
        gg.quadraticCurveTo(48+s*hw,52,48+s*(hw-3),52); },1.3);
      inkPath(g,gg=>{ gg.moveTo(tipx-s*3,tipy+3); gg.quadraticCurveTo(48+s*(hw+5),38,48+s*(hw+1),44); },.9,"rgba(10,8,14,.5)");
      if(chance(.35)) ell(g,48+s*(hw+6),47,1.6,1.6,"#c9a04a"); // earring
    }
  } else if(f.ears==="human"){ // C-curl helix, lobe, concha shadow, inner ridge
    for(const s of [-1,1]){ const ex=48+s*hw;
      g.fillStyle=pal.skin; g.beginPath();
      g.moveTo(ex-s*1,40);
      g.quadraticCurveTo(ex+s*5.5,39,ex+s*5,45);
      g.quadraticCurveTo(ex+s*4.5,50,ex+s*1.5,52);
      g.quadraticCurveTo(ex-s*1,52,ex-s*1,49);
      g.closePath(); g.fill();
      g.globalAlpha=.45; ell(g,ex+s*2,45.5,1.8,2.6,pal.skinD,s*.3); g.globalAlpha=1;
      inkPath(g,gg=>{ gg.moveTo(ex-s*1,40); gg.quadraticCurveTo(ex+s*5.5,39,ex+s*5,45);
        gg.quadraticCurveTo(ex+s*4.5,50,ex+s*1.5,52); },1.1);
      inkPath(g,gg=>{ gg.moveTo(ex+s*3.5,41.5); gg.quadraticCurveTo(ex+s*4,45,ex+s*2,47.5); },.8,"rgba(10,8,14,.55)");
    }
  }
}
function drawEyes(g,pal,f){
  const y=f.eyeY, dx=f.eyeGap;
  if(f.skull){
    for(const s of [-1,1]){ ell(g,48+s*dx,y,7,8,"#0a0810");
      if(f.glow){ g.save(); g.shadowColor=f.glowCol; g.shadowBlur=8;
        ell(g,48+s*dx,y+1,2.4,3,f.glowCol); g.restore(); } }
    return;
  }
  const st=f.eyeStyle||"round";
  const hFac={round:1, almond:.85, narrow:.55, hooded:.72, menace:.68}[st]||1;
  const rot={round:0, almond:.16, narrow:.12, hooded:.06, menace:.28}[st]||0;
  for(const s of [-1,1]){
    const x=48+s*dx, rX=5.4, rY=4.2*hFac, a=rot*s; // outer-up tilt
    ell(g,x,y,rX,rY,"#e8e0d0",a);
    g.globalAlpha=.5; ell(g,x,y-rY*.5,rX,rY*.5,"#8a8070",a); g.globalAlpha=1;
    const iy=Math.max(2,Math.min(3.1,rY*.9));
    if(f.glow){ g.save(); g.shadowColor=f.glowCol; g.shadowBlur=7;
      ell(g,x+s*.5,y+.4,2.6,iy,f.glowCol); g.restore();
      ell(g,x+s*.5,y+.4,1.1,iy*.5,"#fff"); }
    else{ ell(g,x+s*.5,y+.4,2.7,iy,f.iris); ell(g,x+s*.5,y+.6,1.3,iy*.55,"#0c0a10");
      ell(g,x,y-1,.9,.9,"#fff"); }
    // lid treatment per style
    if(st==="menace"){
      inkPath(g,gg=>{ gg.moveTo(x-s*rX*.95,y-1); gg.lineTo(x+s*rX*1.05,y-rY-1.6); },1.7);
      g.fillStyle=pal.skin; g.beginPath(); // slanted lid covers inner-top
      g.moveTo(x-s*rX*1.1,y-.6); g.lineTo(x+s*rX*1.1,y-rY-2); g.lineTo(x-s*rX*1.1,y-rY-3); g.closePath(); g.fill();
    } else if(st==="hooded"){
      g.fillStyle=pal.skin; g.beginPath(); g.ellipse(x,y-rY*.95,rX+.9,rY*.85,a,Math.PI,0); g.fill();
      inkPath(g,gg=>{ gg.moveTo(x-rX,y-1.6); gg.quadraticCurveTo(x,y-3.4,x+rX,y-1.6); },1.5);
    } else {
      inkPath(g,gg=>{ gg.moveTo(x-rX,y-rY*.6-1); gg.quadraticCurveTo(x,y-rY-1.6,x+rX,y-rY*.6-1); },1.6);
    }
    if(f.eyeBags) inkPath(g,gg=>{ gg.moveTo(x-3.5,y+rY+1.4); gg.quadraticCurveTo(x,y+rY+2.6,x+3.5,y+rY+1.4); },.9,"rgba(10,8,14,.4)");
  }
  // brows: inner end drops when angry/menacing
  const tilt=(f.angry||st==="menace")?3.6:(f.sad?-2.2:rf(-.5,1));
  for(const s of [-1,1]){ const x=48+s*dx;
    inkPath(g,gg=>{ gg.moveTo(x-s*6,y-7+tilt); gg.lineTo(x+s*6.5,y-8.5); },f.browW,pal.brow); }
}
function drawNoseMouth(g,pal,f){
  const y=f.eyeY;
  inkPath(g,gg=>{ gg.moveTo(48,y+3); gg.quadraticCurveTo(46,y+9,45,y+10); gg.lineTo(48,y+11); },1.3,"rgba(10,8,14,.7)");
  if(f.grin){
    inkPath(g,gg=>{ gg.moveTo(36,y+15); gg.quadraticCurveTo(48,y+23,60,y+14); },2);
    g.fillStyle="#e8e0d0";
    for(let i=0;i<4;i++){ g.beginPath();
      g.moveTo(39+i*5,y+15+i%2); g.lineTo(41+i*5,y+20); g.lineTo(43+i*5,y+15+i%2); g.fill(); }
  } else if(f.snarl){
    inkPath(g,gg=>{ gg.moveTo(38,y+16); gg.quadraticCurveTo(48,y+13,58,y+16); },2);
  } else {
    const m=f.mouth||"smile";
    if(m==="dash") inkPath(g,gg=>{ gg.moveTo(45,y+16.5); gg.lineTo(51,y+16.5); },1.8);
    else if(m==="frown") inkPath(g,gg=>{ gg.moveTo(42,y+18); gg.quadraticCurveTo(48,y+14.5,54,y+18); },1.8);
    else if(m==="smirk"){ inkPath(g,gg=>{ gg.moveTo(43,y+17); gg.quadraticCurveTo(49,y+18.5,55,y+14.5); },1.8);
      inkPath(g,gg=>{ gg.moveTo(55,y+14.5); gg.lineTo(56.5,y+16); },1); }
    else if(m==="pout") inkPath(g,gg=>{ gg.moveTo(44.5,y+16.5); gg.quadraticCurveTo(48,y+15.5,51.5,y+16.5); },2.2);
    else{ inkPath(g,gg=>{ gg.moveTo(41,y+16); gg.quadraticCurveTo(48,y+19,55,y+16); },1.8);
      g.globalAlpha=.35; inkPath(g,gg=>{ gg.moveTo(43,y+20); gg.quadraticCurveTo(48,y+22,53,y+20); },1,"rgba(10,8,14,.5)"); g.globalAlpha=1; }
  }
  if(f.tusks){ g.fillStyle="#e8e0cc";
    for(const s of [-1,1]){ g.beginPath();
      g.moveTo(48+s*10,y+16); g.lineTo(48+s*13,y+6); g.lineTo(48+s*6,y+13); g.closePath(); g.fill();
      inkPath(g,gg=>{ gg.moveTo(48+s*10,y+16); gg.lineTo(48+s*13,y+6); },1); } }
  if(f.fangs){ g.fillStyle="#e8e0cc";
    for(const s of [-1,1]){ g.beginPath();
      g.moveTo(48+s*4,y+16); g.lineTo(48+s*5,y+21); g.lineTo(48+s*7,y+15); g.fill(); } }
}


/* ================= hair / headgear / extras ================= */
function drawHair(g,pal,f){
  const hw=f.headW,hh=f.headH,hc=f.hairCol;
  const styles={
    bald(){}, 
    crop(){ ell(g,48,32,hw*.95,hh*.55,hc); inkPath(g,gg=>{ gg.ellipse(48,32,hw*.95,hh*.55,0,Math.PI*1.05,Math.PI*1.95); },1.4); },
    manbun(){ ell(g,48,30,hw*.92,hh*.5,hc); ell(g,48,18,7,6,hc);
      inkPath(g,gg=>{ gg.ellipse(48,18,7,6,0,0,7); },1.2); },
    long(){ ell(g,48,30,hw*.98,hh*.55,hc);
      for(const s of [-1,1]){ g.fillStyle=hc; g.beginPath();
        g.moveTo(48+s*(hw-3),30); g.quadraticCurveTo(48+s*(hw+10),60,48+s*(hw+2),88);
        g.lineTo(48+s*(hw-8),56); g.closePath(); g.fill();
        inkPath(g,gg=>{ gg.moveTo(48+s*(hw-3),30); gg.quadraticCurveTo(48+s*(hw+10),60,48+s*(hw+2),88); },1.3); } },
    mohawk(){ g.fillStyle=hc;
      for(let i=0;i<5;i++){ g.beginPath();
        g.moveTo(38+i*5,26); g.lineTo(40.5+i*5,10+rf(-2,2)); g.lineTo(43+i*5,26); g.fill(); }
      inkPath(g,gg=>{ gg.moveTo(38,26); gg.lineTo(48,10); gg.lineTo(58,26); },1); },
    topknot(){ ell(g,48,28,hw*.7,hh*.35,hc); g.fillStyle=hc; g.fillRect(45,14,6,10);
      ell(g,48,13,6,5,hc); inkPath(g,gg=>{ gg.ellipse(48,13,6,5,0,0,7); },1.2); },
    wild(){ for(let i=0;i<9;i++){ ell(g,48+rf(-hw,hw)*.8,26+rf(-6,4),rf(5,9),rf(5,9),hc); }
      inkPath(g,gg=>{ gg.moveTo(48-hw,34); gg.quadraticCurveTo(48,12,48+hw,34); },1.3); },
  };
  (styles[f.hair]||styles.bald)();
}
function drawGear(g,pal,f){
  const hw=f.headW;
  if(f.gear==="hood"){
    g.fillStyle=f.gearCol; g.beginPath();
    g.moveTo(48-hw-9,58); g.quadraticCurveTo(48-hw-12,14,48,10);
    g.quadraticCurveTo(48+hw+12,14,48+hw+9,58);
    g.quadraticCurveTo(48+hw,26,48,24); g.quadraticCurveTo(48-hw,26,48-hw-9,58);
    g.closePath(); g.fill();
    hatch(g,gg=>{ gg.moveTo(48,10); gg.quadraticCurveTo(48+hw+12,14,48+hw+9,58); gg.lineTo(48,58); gg.closePath(); },48,86,10,58);
    inkPath(g,gg=>{ gg.moveTo(48-hw-9,58); gg.quadraticCurveTo(48-hw-12,14,48,10);
      gg.quadraticCurveTo(48+hw+12,14,48+hw+9,58); },1.8);
    inkPath(g,gg=>{ gg.moveTo(48-hw,30); gg.quadraticCurveTo(48,22,48+hw,30); },1.4);
  }
  if(f.gear==="helm"){
    g.fillStyle=f.gearCol; g.beginPath(); g.ellipse(48,30,hw+2,16,0,Math.PI,0); g.fill();
    g.fillRect(48-hw-2,28,2*(hw+2),6);
    g.globalAlpha=.4; ell(g,42,24,8,5,"#e8ecf2"); g.globalAlpha=1;
    if(chance(.6)){ g.fillStyle="#8a2a22"; // plume
      g.beginPath(); g.moveTo(44,16); g.quadraticCurveTo(48,2,58,8); g.quadraticCurveTo(52,12,52,16); g.closePath(); g.fill(); }
    inkPath(g,gg=>{ gg.ellipse(48,30,hw+2,16,0,Math.PI,0); gg.moveTo(48-hw-2,34); gg.lineTo(48+hw+2,34); },1.6);
    // nose guard
    if(chance(.5)){ g.fillStyle=f.gearCol; g.fillRect(46,32,4,12); inkPath(g,gg=>{ gg.rect(46,32,4,12); },1); }
  }
  if(f.gear==="circlet"){
    inkPath(g,gg=>{ gg.moveTo(48-hw,32); gg.quadraticCurveTo(48,26,48+hw,32); },2.4,"#c9a04a");
    g.save(); g.shadowColor="#7ae0ff"; g.shadowBlur=6; ell(g,48,28,2.6,2.6,"#7ae0ff"); g.restore();
  }
  if(f.gear==="horns"){
    for(const s of [-1,1]){ g.fillStyle="#d8c8a0"; g.beginPath();
      g.moveTo(48+s*(hw*.6),26); g.quadraticCurveTo(48+s*(hw+14),18,48+s*(hw+8),2+rf(0,4));
      g.quadraticCurveTo(48+s*(hw+2),16,48+s*(hw*.35),24); g.closePath(); g.fill();
      inkPath(g,gg=>{ gg.moveTo(48+s*(hw*.6),26); gg.quadraticCurveTo(48+s*(hw+14),18,48+s*(hw+8),4); },1.4);
      inkPath(g,gg=>{ gg.moveTo(48+s*(hw*.75),22); gg.lineTo(48+s*(hw*.95),19); },1,"rgba(10,8,14,.5)"); }
  }
  if(f.gear==="hat"){
    g.fillStyle=f.gearCol;
    g.beginPath(); g.ellipse(48,30,hw+12,7,0,0,7); g.fill();
    g.beginPath(); g.moveTo(38,28); g.quadraticCurveTo(44,4,62,8); g.quadraticCurveTo(56,14,58,28); g.closePath(); g.fill();
    inkPath(g,gg=>{ gg.ellipse(48,30,hw+12,7,0,0,7); },1.5);
    inkPath(g,gg=>{ gg.moveTo(38,28); gg.quadraticCurveTo(44,4,62,8); },1.5);
  }
}
function drawFace(g,pal,f){
  if(f.beard){
    g.fillStyle=f.hairCol; g.beginPath();
    g.moveTo(48-f.headW*.75,48); g.quadraticCurveTo(48,52+f.headH*(f.beard==="long"?2.2:1.3),48+f.headW*.75,48);
    g.quadraticCurveTo(48+f.headW*.4,60,48,62); g.quadraticCurveTo(48-f.headW*.4,60,48-f.headW*.75,48);
    g.closePath(); g.fill();
    inkPath(g,gg=>{ gg.moveTo(48-f.headW*.75,48); gg.quadraticCurveTo(48,52+f.headH*(f.beard==="long"?2.2:1.3),48+f.headW*.75,48); },1.5);
    for(let i=0;i<4;i++) inkPath(g,gg=>{ gg.moveTo(42+i*4,58); gg.lineTo(41+i*4,64+rf(0,6)); },.8,"rgba(10,8,14,.4)");
    // redraw mouth over beard
    inkPath(g,gg=>{ gg.moveTo(43,f.eyeY+16); gg.quadraticCurveTo(48,f.eyeY+18,53,f.eyeY+16); },1.6,"#241812");
  }
  if(f.scar){ const sx=48+pick([-1,1])*rf(6,12), sy=f.eyeY+rf(-10,6);
    inkPath(g,gg=>{ gg.moveTo(sx-2,sy-7); gg.lineTo(sx+2,sy+7); },1.4,"rgba(90,30,30,.8)");
    for(let i=-1;i<2;i++) inkPath(g,gg=>{ gg.moveTo(sx-3,sy+i*4); gg.lineTo(sx+3,sy+i*4-1); },.9,"rgba(90,30,30,.6)"); }
  if(f.paint){ g.globalAlpha=.55; g.fillStyle=f.paintCol;
    if(chance(.5)){ g.fillRect(48-f.headW,f.eyeY-2,f.headW*2,5); }
    else{ for(const s of [-1,1]){ g.beginPath(); g.moveTo(48+s*f.eyeGap-6,f.eyeY+5);
      g.lineTo(48+s*f.eyeGap,f.eyeY+16); g.lineTo(48+s*f.eyeGap+6,f.eyeY+5); g.fill(); } }
    g.globalAlpha=1; }
  if(f.skullNose){ ell(g,48,f.eyeY+8,3.4,4.4,"#0a0810"); }
  if(f.boneJaw){ // skeleton teeth band (small, fine)
    g.fillStyle="#d8d0b8"; g.fillRect(40,f.eyeY+14,16,5);
    inkPath(g,gg=>{ gg.rect(40,f.eyeY+14,16,5);
      for(let i=1;i<6;i++){ gg.moveTo(40+i*2.7,f.eyeY+14); gg.lineTo(40+i*2.7,f.eyeY+19); } },.8);
  }
}
/* ================= illustration finish pass ================= */
function finish(g,pal,f){
  // rim light on the lit side
  g.save(); g.globalCompositeOperation="screen"; g.globalAlpha=.5;
  g.strokeStyle=pal.rim||"#d8b06a"; g.lineWidth=2;
  g.beginPath(); g.ellipse(48,44,f.headW+1,f.headH+1,0,Math.PI*.75,Math.PI*1.35); g.stroke();
  g.beginPath(); g.moveTo(14,92); g.quadraticCurveTo(16,70,34,64); g.stroke();
  g.restore();
  // color grade: cool multiply + warm key
  g.globalCompositeOperation="multiply";
  const grd=g.createLinearGradient(0,0,0,96);
  grd.addColorStop(0,"rgba(210,190,170,1)"); grd.addColorStop(1,"rgba(120,110,150,1)");
  g.fillStyle=grd; g.fillRect(0,0,96,96);
  g.globalCompositeOperation="overlay";
  g.globalAlpha=.5; g.drawImage(GRAIN,0,0); g.globalAlpha=1;
  g.globalCompositeOperation="source-over";
  // heavy corner vignette
  const vg=g.createRadialGradient(48,44,30,48,48,74);
  vg.addColorStop(0,"rgba(0,0,0,0)"); vg.addColorStop(1,"rgba(6,4,10,.75)");
  g.fillStyle=vg; g.fillRect(0,0,96,96);
  // ink border frame line (illustrated card feel)
  g.strokeStyle="rgba(10,8,14,.9)"; g.lineWidth=2.5; g.strokeRect(1.2,1.2,93.6,93.6);
  g.strokeStyle="rgba(216,162,74,.35)"; g.lineWidth=1; g.strokeRect(3.2,3.2,89.6,89.6);
}

const ARCH=[
 {id:"Knight",   sp:"human", gear:["helm","helm","none"], hair:["crop","manbun","bald"], beard:.7, pauld:.9, outfits:["tunic","cloak","tunic"], iris:["#3a2c22","#4a5a6e"]},
 {id:"Mage",     sp:"elf",   gear:["hat","circlet","none"], hair:["long","long","crop"], beard:.1, glow:.5, glowCol:["#7ae0ff","#b48bff"], outfits:["robe","robe","cloak"], iris:["#7a4ad1","#3a7ac9"]},
 {id:"Cleric",   sp:"human", gear:["hood","hood","circlet"], hair:["crop","bald"], beard:.5, outfits:["robe","cloak"], iris:["#5a7a9a","#6e5a3a"]},
 {id:"Rogue",    sp:"human", gear:["hood","hood","none"], hair:["crop","long"], beard:.3, scar:.7, outfits:["vest","cloak","tunic"], iris:["#3a5a3a","#4a4a5e"]},
 {id:"Barbarian",sp:"human", gear:["none","horns"], hair:["wild","mohawk","long","topknot"], beard:.6, paint:.8, pauld:.4, snarl:.5, outfits:["vest","tunic"], iris:["#4a3a2a"]},
 {id:"Warlock",  sp:"human", gear:["hood","none"], hair:["bald","crop"], beard:.3, glow:.9, glowCol:["#a4ff6e","#ff6ea4","#b48bff"], paint:.4, outfits:["robe","cloak"], iris:["#8a3ad1"]},
 {id:"Elf Ranger",sp:"elf",  gear:["hood","none"], hair:["long","topknot"], beard:0, scar:.4, iris:["#3a8a5e","#7a9a4a"]},
 {id:"Goblin",   sp:"goblin",gear:["none","none","hood"], hair:["mohawk","bald","wild"], grin:.75, snarl:.25, angry:1, outfits:["vest","tunic","cloak"], iris:["#d43a3a","#ffd166"]},
 {id:"Gob Shaman",sp:"goblin",gear:["hood","horns"], hair:["bald"], glow:.7, glowCol:["#7ee787","#ffd166"], angry:1, paint:.5, iris:["#ffd166"]},
 {id:"Orc",      sp:"orc",   gear:["helm","none","horns"], hair:["topknot","mohawk","bald"], tusks:1, snarl:.8, angry:1, pauld:.7, beard:.3, outfits:["tunic","vest"], iris:["#ffdf6b","#d46a3a"]},
 {id:"Skeleton", sp:"undead",skull:1, gear:["none","hood","helm"], glow:.8, glowCol:["#9ad1ff","#7ee787","#ff8a5a"], iris:["#9ad1ff"]},
 {id:"Vampire",  sp:"undead",gear:["none"], hair:["crop","long"], fangs:1, glow:.6, glowCol:["#ff4a4a"], iris:["#c92e2e"], sad:0},
 {id:"Demon",    sp:"demon", gear:["horns"], hair:["bald","crop","wild"], glow:.8, glowCol:["#ffdf6b","#ff8a3a"], snarl:.6, angry:1, fangs:.5, iris:["#ffdf6b"]},
];
function buildPortrait(seed, archIdx){
  seedRng(seed);
  const a=ARCH[archIdx%ARCH.length];
  const skin=pick(SKIN[a.sp]);
  const pal={
    skin, skinD:shade(skin,.55), bg:pick(BGH), cloth:pick(CLOTH), metal:pick(METAL),
    brow:"rgba(12,10,16,.9)", rim:pick(["#d8b06a","#8ab0d8","#c98a8a","#9ad1a4"]),
    pauldrons: chance(a.pauld||0),
  };
  const skull=!!a.skull;
  const evil=(a.angry||0)>=.5;
  const f={
    headW: rf(17,21)*(a.sp==="goblin"?0.92:1),
    headH: rf(21,26)*(skull?0.95:1),
    jaw: chance(.5)&&!skull,
    eyeY: rf(42,46),
    eyeGap: rf(8.5,10.5),
    ears: skull?"none":(a.sp==="elf"?"point":(a.sp==="goblin"?"big":(a.sp==="orc"&&chance(.5)?"big":"human"))),
    skull, boneJaw:skull, skullNose:skull,
    hair: skull?"bald":pick(a.hair||["bald"]),
    hairCol: pick(HAIR),
    gear: pick(a.gear||["none"]),
    gearCol: pick(CLOTH.concat(["#4a3828","#3a2e22"])),
    beard: !skull&&chance(a.beard||0) ? pick(["short","long"]) : null,
    glow: chance(a.glow||0), glowCol: a.glowCol?pick(a.glowCol):"#7ae0ff",
    iris: pick(a.iris||["#3a2c22"]),
    angry: chance(a.angry||0.15), sad: chance(.1),
    grin: chance(a.grin||0), snarl: !a.grin&&chance(a.snarl||0),
    tusks: chance(a.tusks||0), fangs: chance(a.fangs||0),
    scar: chance(a.scar||.2), paint: chance(a.paint||0), paintCol: pick(["#c92e2e","#e8e0d0","#3a7ac9","#1a1a22"]),
    mouth: pick(evil?["dash","frown","smirk","dash","frown"]:["smile","dash","smirk","frown","pout","smile"]),
    eyeStyle: pick(evil?["menace","narrow","almond","menace"]:["round","almond","hooded","narrow","round","menace"]),
    eyeBags: chance(.3),
    outfit: pick(a.outfits||["cloak","tunic","vest","robe"]),
    cloth2: pick(["#8a7a5e","#a89878","#6e7a8a","#9a8468","#7a8a72"]),
    browW: rf(1.4,2.6),
  };
  if(f.gear==="helm"||f.gear==="hood"||f.gear==="hat") f.hair=chance(.4)?f.hair:"bald";
  const c=document.createElement("canvas"); c.width=c.height=384;
  const g=c.getContext("2d"); g.scale(4,4);
  drawBG(g,pal); drawShoulders(g,pal,f); drawHead(g,pal,f); drawEars(g,pal,f);
  drawHair(g,pal,f); drawEyes(g,pal,f); drawNoseMouth(g,pal,f); drawFace(g,pal,f);
  drawGear(g,pal,f); finish(g,pal,f);
  return {canvas:c, label:a.id, seed};
}


/* engine entry: portrait canvas for a hero class */
const PORTRAIT_ARCH={knight:0,mage:1,cleric:2};
function makeHeroPortrait(cls,seed){
  return buildPortrait(seed, PORTRAIT_ARCH[cls]!==undefined?PORTRAIT_ARCH[cls]:0);
}

export {
  SKIN, HAIR, BGH, CLOTH, METAL, drawBG, drawShoulders, headPath, drawHead, drawEars, drawEyes, drawNoseMouth, drawHair, drawGear, drawFace, finish, ARCH, buildPortrait, PORTRAIT_ARCH, makeHeroPortrait
};
