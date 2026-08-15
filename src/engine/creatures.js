import { mulberry32, R, rf, ri, pick, chance, shade, ell, inkPath, hatch, bakeGradeInto96, maskToSnap, applyMask, ground, limb, glowDot, part, blink, seedRng, setParts, setBlinks } from './core.js';
/* ============ DP ENGINE :: creatures.js — full-body NPC + hero builders ============ */
"use strict";


/* ================= creature builders (96-space, standing on y≈86) ================= */

function cSpider(g){
  const hide=pick(["#2a2430","#3a2c1e","#2e3a26","#3a2030"]), hideD=shade(hide,.6);
  const glow=pick(["#c92e2e","#7ee787","#ffd166"]);
  ground(g,30);
  const by=54, abR=rf(12,16);
  // 8 legs, jointed — two random legs get idle-twitch parts
  const animA=[pick([-1,1]),ri(0,3)], animB=[pick([-1,1]),ri(0,3)];
  for(const s of [-1,1]) for(let i=0;i<4;i++){
    const pts=[[48+s*5,by+4],[48+s*(15+i*7),by-16-i*2+rf(-3,3)],[48+s*(21+i*8),84+rf(-2,1)]];
    const isAnim=(s===animA[0]&&i===animA[1])||(s===animB[0]&&i===animB[1]);
    if(isAnim) part(48+s*5,by+4,
      {kind:"legtwitch",amp:rf(.10,.18)*s,speed:rf(.5,1.1),phase:rf(0,6)},
      pg=>limb(pg,pts,2.4,hide));
    else limb(g,pts,2.4,hide);
  }
  // abdomen (rear, raised)
  ell(g,48,by-abR*.55,abR,abR*.9,hide);
  hatch(g,gg=>gg.ellipse(48,by-abR*.55,abR,abR*.9,0,0,7),48,48+abR,by-abR*2,by+abR);
  inkPath(g,gg=>gg.ellipse(48,by-abR*.55,abR,abR*.9,0,0,7),1.6);
  // marking
  const mk=pick(["none","hourglass","stripes","skull"]);
  if(mk==="hourglass"){ g.fillStyle=glow; g.beginPath();
    g.moveTo(44,by-abR); g.lineTo(52,by-abR); g.lineTo(44,by-abR*.2); g.lineTo(52,by-abR*.2); g.closePath(); g.fill(); }
  if(mk==="stripes") for(let i=0;i<3;i++)
    inkPath(g,gg=>{ gg.moveTo(40,by-abR*1.2+i*6); gg.quadraticCurveTo(48,by-abR*1.35+i*6,56,by-abR*1.2+i*6); },1.8,shade(hide,1.9));
  if(mk==="skull"){ ell(g,48,by-abR*.7,4.5,5,"#d8d0b8"); ell(g,46.4,by-abR*.75,1.2,1.5,"#0a0810"); ell(g,49.6,by-abR*.75,1.2,1.5,"#0a0810"); }
  // bristles
  for(let i=0;i<7;i++){ const a=rf(-2.6,-0.5);
    inkPath(g,gg=>{ gg.moveTo(48+Math.cos(a)*abR*.9,by-abR*.55+Math.sin(a)*abR*.85);
      gg.lineTo(48+Math.cos(a)*(abR+4),by-abR*.55+Math.sin(a)*(abR*.95+4)); },.8,"rgba(10,8,14,.6)"); }
  // cephalothorax + eye cluster + fangs
  ell(g,48,by+8,abR*.55,abR*.45,hideD);
  inkPath(g,gg=>gg.ellipse(48,by+8,abR*.55,abR*.45,0,0,7),1.4);
  for(let i=0;i<6;i++) glowDot(g,44+(i%3)*4,by+5+Math.floor(i/3)*3.4,1+(i===1?.6:0),glow);
  g.fillStyle="#0a0810";
  g.beginPath(); g.moveTo(45,by+12); g.lineTo(46,by+17); g.lineTo(47.5,by+12); g.fill();
  g.beginPath(); g.moveTo(48.5,by+12); g.lineTo(50,by+17); g.lineTo(51,by+12); g.fill();
  return "Spider";
}

function cKobold(g){
  const hide=pick(["#8a4a2e","#6e5a2e","#5e7a3a","#7a3a3a"]), hideD=shade(hide,.6);
  const cloth=pick(["#4a3828","#3a3448","#2e3e34"]);
  ground(g,18);
  // tail
  limb(g,[[52,66],[64,72],[70,64+rf(-6,4)]],3.5,hide);
  // legs (digitigrade)
  limb(g,[[44,68],[41,76],[44,84]],4,hide); limb(g,[[52,68],[55,76],[52,84]],4,hide);
  // torso
  ell(g,48,60,9,11,hide);
  hatch(g,gg=>gg.ellipse(48,60,9,11,0,0,7),48,60,46,74);
  inkPath(g,gg=>gg.ellipse(48,60,9,11,0,0,7),1.5);
  // ragged loincloth
  g.fillStyle=cloth; g.beginPath(); g.moveTo(40,64); g.lineTo(56,64);
  g.lineTo(54,72); g.lineTo(51,69); g.lineTo(48,73); g.lineTo(45,69); g.lineTo(42,72); g.closePath(); g.fill();
  inkPath(g,gg=>{ gg.moveTo(40,64); gg.lineTo(56,64); },1.2);
  // arms + spear or dagger
  const wep=pick(["spear","spear","dagger"]);
  limb(g,[[42,54],[36,60],[34,64]],3,hide);
  limb(g,[[54,54],[60,58],[62,62]],3,hide);
  if(wep==="spear"){ limb(g,[[62,78],[62,30]],2,"#5a4a32",1);
    g.fillStyle="#8a8a92"; g.beginPath(); g.moveTo(59,32); g.lineTo(62,20); g.lineTo(65,32); g.closePath(); g.fill();
    inkPath(g,gg=>{ gg.moveTo(59,32); gg.lineTo(62,20); gg.lineTo(65,32); gg.closePath(); },1); }
  else { limb(g,[[62,62],[68,54]],2.4,"#8a8a92",1); }
  // head: skull + snout + horns + frill ears
  ell(g,46,42,8,7.5,hide);
  ell(g,39,45,6.5,4,hide); // snout
  inkPath(g,gg=>{ gg.ellipse(46,42,8,7.5,0,0,7); },1.4);
  inkPath(g,gg=>{ gg.ellipse(39,45,6.5,4,0,0,7); },1.2);
  ell(g,35,46,1,1,"#0a0810"); // nostril
  glowDot(g,46,40,1.9,pick(["#ffd166","#ff8a3a","#d43a3a"])); blink(46,39.7,2.4,2.1,hide);
  inkPath(g,gg=>{ gg.moveTo(34,48); gg.lineTo(43,49.5); },1.2); // mouth
  g.fillStyle="#e8e0cc"; g.beginPath(); g.moveTo(36,49.5); g.lineTo(37,47.5); g.lineTo(38.5,49.5); g.fill(); // tooth
  for(const hx of [50,54]){ g.fillStyle="#d8c8a0"; g.beginPath();
    g.moveTo(hx,37); g.lineTo(hx+3,29+rf(-2,2)); g.lineTo(hx+4,37); g.closePath(); g.fill();
    inkPath(g,gg=>{ gg.moveTo(hx,37); gg.lineTo(hx+3,29); },1); }
  ell(g,53,44,4,2.6,hideD,-.4); // ear frill
  inkPath(g,gg=>gg.ellipse(53,44,4,2.6,-.4,0,7),1);
  return "Kobold";
}

function cGoblin(g){
  const hide=pick(["#6f9e4d","#5a8a3f","#7fae57"]), hideD=shade(hide,.6);
  const cloth=pick(["#4a3828","#3a3448","#48303a"]);
  ground(g,18);
  // hunched legs
  limb(g,[[44,66],[40,75],[43,84]],4.4,hide); limb(g,[[53,66],[57,75],[54,84]],4.4,hide);
  // torso hunched forward
  ell(g,48,58,10,12,hide,-.15);
  hatch(g,gg=>gg.ellipse(48,58,10,12,-.15,0,7),48,62,44,72);
  inkPath(g,gg=>gg.ellipse(48,58,10,12,-.15,0,7),1.5);
  // vest
  g.fillStyle=cloth;
  g.beginPath(); g.moveTo(41,50); g.lineTo(45,54); g.lineTo(43,68); g.lineTo(38,66); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(55,50); g.lineTo(51,54); g.lineTo(53,68); g.lineTo(58,66); g.closePath(); g.fill();
  inkPath(g,gg=>{ gg.moveTo(45,54); gg.lineTo(43,68); gg.moveTo(51,54); gg.lineTo(53,68); },1.1);
  // arms + weapon
  limb(g,[[41,52],[33,58],[31,64]],3.4,hide);
  limb(g,[[55,52],[62,56],[64,62]],3.4,hide);
  const wep=pick(["club","knife","club"]);
  if(wep==="club"){ limb(g,[[64,62],[70,44]],3,"#5a4a32",1); ell(g,71,41,4.5,6,"#4a3a26");
    inkPath(g,gg=>gg.ellipse(71,41,4.5,6,0,0,7),1.2);
    for(let i=0;i<3;i++) ell(g,69+i*2,38+i*3,0.8,0.8,"#8a8a92"); }
  else { limb(g,[[64,62],[70,53]],2.2,"#8a8a92",1); }
  // head: big, big torn ears, mohawk chance
  ell(g,47,38,10,9,hide);
  inkPath(g,gg=>gg.ellipse(47,38,10,9,0,0,7),1.5);
  for(const s of [-1,1]){ const bx=47+s*8, tipx=47+s*24, tipy=30+rf(-3,3);
    g.fillStyle=hide; g.beginPath();
    g.moveTo(bx,34); g.quadraticCurveTo(47+s*16,28,tipx,tipy);
    g.quadraticCurveTo(47+s*18,38,47+s*13,42);
    g.lineTo(47+s*11,40); g.lineTo(47+s*10,44);
    g.quadraticCurveTo(47+s*8,45,bx,44); g.closePath(); g.fill();
    g.globalAlpha=.5; ell(g,47+s*13,36,4.5,2.4,hideD,-s*.4); g.globalAlpha=1;
    inkPath(g,gg=>{ gg.moveTo(bx,34); gg.quadraticCurveTo(47+s*16,28,tipx,tipy);
      gg.quadraticCurveTo(47+s*18,38,47+s*13,42); },1.2); }
  if(chance(.6)){ g.fillStyle=pick(["#d43a3a","#3a3a44"]);
    for(let i=0;i<4;i++){ g.beginPath(); g.moveTo(42+i*3,31); g.lineTo(43.5+i*3,24+rf(-2,2)); g.lineTo(45+i*3,31); g.fill(); } }
  glowDot(g,43,37,1.7,"#d43a3a"); glowDot(g,51,37,1.7,"#d43a3a");
  blink(43,36.8,2.2,1.9,hide); blink(51,36.8,2.2,1.9,hide);
  inkPath(g,gg=>{ gg.moveTo(41,43); gg.quadraticCurveTo(47,47,53,42.5); },1.6); // grin
  g.fillStyle="#e8e0cc"; for(let i=0;i<3;i++){ g.beginPath();
    g.moveTo(43.5+i*3,43.5+i*.5); g.lineTo(44.5+i*3,46); g.lineTo(45.5+i*3,43.3+i*.5); g.fill(); }
  return "Goblin";
}

function cSkeleton(g){
  const bone="#d8d0b8", boneD="#a89e82";
  ground(g,17);
  // leg bones
  limb(g,[[44,64],[42,74],[43,84]],2.6,bone); limb(g,[[52,64],[54,74],[53,84]],2.6,bone);
  ell(g,42,74,1.7,1.7,boneD); ell(g,54,74,1.7,1.7,boneD); // knee joints
  // pelvis + spine
  ell(g,48,62,6,4,bone); inkPath(g,gg=>gg.ellipse(48,62,6,4,0,0,7),1.1);
  limb(g,[[48,60],[48,44]],2.2,bone);
  // ribcage
  for(let i=0;i<4;i++){ const ry=47+i*3.4;
    inkPath(g,gg=>{ gg.moveTo(48,ry); gg.quadraticCurveTo(41-i*.5,ry+1.5,42,ry+4); },1.5,bone);
    inkPath(g,gg=>{ gg.moveTo(48,ry); gg.quadraticCurveTo(55+i*.5,ry+1.5,54,ry+4); },1.5,bone); }
  // arms + gear
  limb(g,[[43,46],[36,54],[34,62]],2.4,bone);
  const gear=pick(["sword","sword","bow","axe"]);
  if(gear==="sword"&&chance(.6)){ ell(g,32,58,6,8,"#5a4a32"); // shield stays on the still arm
    inkPath(g,gg=>gg.ellipse(32,58,6,8,0,0,7),1.4); ell(g,32,58,1.6,1.6,"#8a8a92"); }
  // weapon arm — slow menace raise/lower, pivot at shoulder
  part(53,46,{kind:"arm",amp:rf(-.16,-.07),speed:rf(.35,.7),phase:rf(0,6)},pg=>{
    limb(pg,[[53,46],[60,52],[62,60]],2.4,bone);
    ell(pg,60,52,1.5,1.5,boneD); // elbow joint
    if(gear==="sword"){ limb(pg,[[62,60],[62,36]],1.8,"#9a9aa4",.8);
      pg.fillStyle="#5a4a32"; pg.fillRect(60,58,4,5); inkPath(pg,gg=>{ gg.moveTo(58,58); gg.lineTo(66,58); },1.4); }
    if(gear==="bow"){ inkPath(pg,gg=>{ gg.moveTo(62,42); gg.quadraticCurveTo(72,60,62,76); },2.2,"#5a4a32");
      inkPath(pg,gg=>{ gg.moveTo(62,42); gg.lineTo(62,76); },.7,"rgba(220,214,196,.8)"); }
    if(gear==="axe"){ limb(pg,[[62,60],[64,38]],2,"#5a4a32",1);
      pg.fillStyle="#8a8a92"; pg.beginPath(); pg.moveTo(64,36); pg.quadraticCurveTo(74,38,72,48);
      pg.quadraticCurveTo(68,42,63,44); pg.closePath(); pg.fill();
      inkPath(pg,gg=>{ gg.moveTo(64,36); gg.quadraticCurveTo(74,38,72,48); },1.1); }
  });
  // skull
  ell(g,48,38,7.5,7,bone);
  g.fillStyle=bone; g.fillRect(44,42,8,5);
  inkPath(g,gg=>{ gg.ellipse(48,38,7.5,7,0,0,7); },1.4);
  ell(g,45,37,2.4,2.8,"#0a0810"); ell(g,51,37,2.4,2.8,"#0a0810");
  const gl=pick(["#9ad1ff","#7ee787","#ff8a5a",null]);
  if(gl){ glowDot(g,45,37.5,1,gl); glowDot(g,51,37.5,1,gl);
    blink(45,37,2.6,3,"#0a0810"); blink(51,37,2.6,3,"#0a0810"); }
  ell(g,48,41.5,1.3,1.7,"#0a0810");
  g.fillStyle=bone; g.fillRect(44.5,44,7,3);
  inkPath(g,gg=>{ gg.rect(44.5,44,7,3); for(let i=1;i<4;i++){ gg.moveTo(44.5+i*1.75,44); gg.lineTo(44.5+i*1.75,47); } },.7);
  if(chance(.4)){ g.fillStyle="#6e6e66"; g.beginPath(); g.ellipse(48,34,8,4.5,0,Math.PI,0); g.fill();
    inkPath(g,gg=>{ gg.ellipse(48,34,8,4.5,0,Math.PI,0); gg.moveTo(40,34); gg.lineTo(56,34); },1.2); } // rusty helm
  return "Skeleton";
}

function cRat(g){
  const fur=pick(["#5a5048","#4a4038","#6e5a48","#3e3a36"]), furD=shade(fur,.6);
  ground(g,26);
  // tail — idle swish part
  part(66,74,{kind:"sway",amp:rf(.10,.17),speed:rf(1.1,1.9),phase:rf(0,6)},
    pg=>inkPath(pg,gg=>{ gg.moveTo(66,74); gg.quadraticCurveTo(84,78,86,64); gg.quadraticCurveTo(87,56,80,54); },2.6,"#b89a8a"));
  // haunch + body (hunched)
  ell(g,60,70,13,12,fur);
  ell(g,44,70,16,11,fur,-.12);
  hatch(g,gg=>gg.ellipse(52,70,22,12,-.06,0,7),52,74,56,84);
  inkPath(g,gg=>{ gg.moveTo(28,74); gg.quadraticCurveTo(34,58,52,58); gg.quadraticCurveTo(70,58,72,70); },1.6);
  // mangy back ridge
  for(let i=0;i<8;i++) inkPath(g,gg=>{ gg.moveTo(34+i*4.4,60-Math.sin(i*.7)*2);
    gg.lineTo(35+i*4.4,55-Math.sin(i*.7)*2+rf(-1.5,1.5)); },.8,"rgba(10,8,14,.6)");
  // legs
  limb(g,[[38,78],[36,84]],3,furD); limb(g,[[48,79],[47,84]],3,furD);
  limb(g,[[60,79],[62,84]],3.4,furD);
  // head + snout
  ell(g,29,66,8.5,7,fur,.15);
  g.fillStyle=fur; g.beginPath(); g.moveTo(24,62); g.lineTo(12,69); g.lineTo(24,72); g.closePath(); g.fill();
  inkPath(g,gg=>{ gg.ellipse(29,66,8.5,7,.15,0,7); gg.moveTo(24,62); gg.lineTo(12,69); gg.lineTo(24,72); },1.3);
  ell(g,13,69,1.3,1.3,"#3a2430"); // nose
  // real ear: rounded shell + inner
  ell(g,33,58,4.5,5.5,fur); ell(g,33.5,58.5,2.6,3.4,"#b89a8a");
  inkPath(g,gg=>gg.ellipse(33,58,4.5,5.5,0,0,7),1.1);
  glowDot(g,26,64.5,1.6,"#d43a3a"); blink(26,64.2,2.3,1.9,fur);
  // whiskers + teeth
  for(let i=0;i<3;i++) inkPath(g,gg=>{ gg.moveTo(16,68+i*1.5); gg.lineTo(6,65+i*3); },.6,"rgba(220,214,196,.55)");
  g.fillStyle="#e8e0cc"; g.beginPath(); g.moveTo(15,71.5); g.lineTo(16,75); g.lineTo(17.5,71.5); g.fill();
  return "Giant Rat";
}


function cLich(g){
  const robe=pick(["#2e2a44","#3a2434","#242e38","#34242a"]), robeD=shade(robe,.55);
  const glow=pick(["#7ee787","#9ad1ff","#b48bff","#7ae0ff"]);
  const float_=chance(.5);
  ground(g,14);
  const hem=float_?76:84;
  // robe silhouette with tattered hem
  g.fillStyle=robe; g.beginPath();
  g.moveTo(48,26); g.quadraticCurveTo(62,30,60,52); g.quadraticCurveTo(64,70,62,hem);
  let x=62; while(x>34){ g.lineTo(x-3,hem-rf(3,7)); g.lineTo(x-6,hem); x-=6; }
  g.quadraticCurveTo(32,70,36,52); g.quadraticCurveTo(34,30,48,26); g.closePath(); g.fill();
  hatch(g,gg=>{ gg.moveTo(48,26); gg.quadraticCurveTo(62,30,60,52); gg.quadraticCurveTo(64,70,62,hem);
    gg.lineTo(36,hem); gg.quadraticCurveTo(34,30,48,26); gg.closePath(); },48,64,26,hem);
  inkPath(g,gg=>{ gg.moveTo(48,26); gg.quadraticCurveTo(62,30,60,52); gg.quadraticCurveTo(64,70,62,hem); },1.5);
  inkPath(g,gg=>{ gg.moveTo(48,26); gg.quadraticCurveTo(34,30,36,52); gg.quadraticCurveTo(32,70,34,hem); },1.5);
  // vertical drape folds
  for(const fx of [42,48,54]) inkPath(g,gg=>{ gg.moveTo(fx,44); gg.quadraticCurveTo(fx+rf(-2,2),62,fx+rf(-2,2),hem-4); },1,"rgba(8,6,12,.45)");
  // hood + skull
  g.fillStyle=robeD; g.beginPath(); g.ellipse(48,30,11,12,0,0,7); g.fill();
  inkPath(g,gg=>gg.ellipse(48,30,11,12,0,0,7),1.5);
  ell(g,48,32,6.5,6,"#d8d0b8");
  ell(g,45.4,31.5,2,2.4,"#0a0810"); ell(g,50.6,31.5,2,2.4,"#0a0810");
  glowDot(g,45.4,32,1,glow); glowDot(g,50.6,32,1,glow);
  blink(45.4,31.6,2.2,2.5,"#060409"); blink(50.6,31.6,2.2,2.5,"#060409");
  g.fillStyle="#d8d0b8"; g.fillRect(45,36,6,2.4);
  inkPath(g,gg=>{ gg.rect(45,36,6,2.4); for(let i=1;i<3;i++){ gg.moveTo(45+i*2,36); gg.lineTo(45+i*2,38.4); } },.7);
  if(chance(.6)){ g.fillStyle="#c9a04a"; // ancient crown
    g.beginPath(); g.moveTo(41,24); g.lineTo(41,19); g.lineTo(44,22); g.lineTo(48,17);
    g.lineTo(52,22); g.lineTo(55,19); g.lineTo(55,24); g.closePath(); g.fill();
    inkPath(g,gg=>{ gg.moveTo(41,24); gg.lineTo(41,19); gg.lineTo(44,22); gg.lineTo(48,17);
      gg.lineTo(52,22); gg.lineTo(55,19); gg.lineTo(55,24); gg.closePath(); },1); }
  // staff with orb
  limb(g,[[64,84],[63,34]],2,"#3a3026",1);
  glowDot(g,63,30,3.4,glow);
  inkPath(g,gg=>{ gg.moveTo(60,33); gg.quadraticCurveTo(63,26,66,33); },1,"rgba(10,8,14,.7)");
  // skeletal hand on staff
  ell(g,63,46,2.6,2,"#d8d0b8");
  for(let i=0;i<3;i++) inkPath(g,gg=>{ gg.moveTo(61+i*1.6,45); gg.lineTo(61+i*1.6,48.5); },.7,"rgba(10,8,14,.6)");
  // floating: gap + drifting motes
  if(float_){ g.globalAlpha=.5; ell(g,48,86,12,3.4,"#060409"); g.globalAlpha=1;
    for(let i=0;i<4;i++) glowDot(g,rf(34,62),rf(70,84),rf(.6,1.2),glow); }
  return "Lich";
}

function cWight(g){
  const shroud=pick(["#4a5a52","#44506e","#565a4a"]), shroudD=shade(shroud,.55);
  const glow=pick(["#9ad1ff","#7ee787","#c9e8ff"]);
  ground(g,15);
  // wispy shroud: hooded figure fading into strands
  g.fillStyle=shroud; g.beginPath();
  g.moveTo(48,24); g.quadraticCurveTo(63,28,61,50); g.quadraticCurveTo(65,64,60,74);
  g.closePath(); g.moveTo(48,24); g.quadraticCurveTo(33,28,35,50); g.quadraticCurveTo(31,64,36,74);
  g.fill();
  g.fillStyle=shroud; g.beginPath();
  g.moveTo(36,50); g.lineTo(60,50); g.lineTo(60,72); g.lineTo(36,72); g.closePath(); g.fill();
  // fading hem strands
  const fade=g.createLinearGradient(0,68,0,88);
  fade.addColorStop(0,shroud); fade.addColorStop(1,"rgba(0,0,0,0)");
  g.fillStyle=fade;
  for(let i=0;i<5;i++){ const sx=37+i*5;
    g.beginPath(); g.moveTo(sx,70); g.quadraticCurveTo(sx+rf(-3,3),80,sx+rf(-2,2),86+rf(-3,2));
    g.lineTo(sx+3.4,70); g.closePath(); g.fill(); }
  hatch(g,gg=>{ gg.moveTo(48,24); gg.quadraticCurveTo(63,28,61,50); gg.quadraticCurveTo(65,64,60,74);
    gg.lineTo(36,74); gg.quadraticCurveTo(33,28,48,24); gg.closePath(); },48,64,24,74);
  inkPath(g,gg=>{ gg.moveTo(48,24); gg.quadraticCurveTo(63,28,61,50); gg.quadraticCurveTo(65,64,60,74); },1.4);
  inkPath(g,gg=>{ gg.moveTo(48,24); gg.quadraticCurveTo(33,28,35,50); gg.quadraticCurveTo(31,64,36,74); },1.4);
  // hood void + cold eyes
  g.fillStyle="#0a0810"; g.beginPath(); g.ellipse(48,32,7.5,8.5,0,0,7); g.fill();
  inkPath(g,gg=>gg.ellipse(48,32,10,11,0,0,7),1.4);
  glowDot(g,45,32,1.5,glow); glowDot(g,51,32,1.5,glow);
  blink(45,32,2,2.2,"#0a0810"); blink(51,32,2,2.2,"#0a0810");
  // barrow crown chance
  if(chance(.5)){ inkPath(g,gg=>{ gg.moveTo(40,25); gg.quadraticCurveTo(48,21,56,25); },2,"#8a7a4a");
    for(const cx of [43,48,53]) ell(g,cx,22.6,.9,.9,"#8a7a4a"); }
  // ancient blade
  if(chance(.7)){ limb(g,[[62,70],[62,40]],1.8,"#7a8288",.7);
    inkPath(g,gg=>{ gg.moveTo(59,68); gg.lineTo(65,68); },1.3);
    for(let i=0;i<3;i++) ell(g,62,46+i*7,0.7,0.7,"#3a3026"); // pitted rust
    ell(g,62,68,2.2,1.8,"#d8d0b8"); } // skeletal grip
  // grave mist
  for(let i=0;i<3;i++){ g.globalAlpha=.14; ell(g,rf(30,66),rf(80,88),rf(8,14),rf(2.4,4),"#c9e8ff"); g.globalAlpha=1; }
  return "Barrow Wight";
}

function cWyvern(g){
  const hide=pick(["#5e7a3a","#7a4a3a","#4a5e6e","#6e4a6e"]), hideD=shade(hide,.6);
  const wing=shade(hide,.45);
  ground(g,22);
  // folded wings raised behind (two spikes with membrane)
  for(const s of [-1,1]){
    part(48+s*4,56,{kind:"flap",amp:rf(.035,.06),speed:rf(.7,1.3),phase:rf(0,6),dir:s},pg=>{
      pg.fillStyle=wing; pg.beginPath();
      pg.moveTo(48+s*4,56); pg.lineTo(48+s*20,22+rf(-3,3)); pg.lineTo(48+s*26,52);
      pg.quadraticCurveTo(48+s*16,46,48+s*4,56); pg.closePath(); pg.fill();
      inkPath(pg,gg=>{ gg.moveTo(48+s*4,56); gg.lineTo(48+s*20,22); gg.lineTo(48+s*26,52); },1.4);
      inkPath(pg,gg=>{ gg.moveTo(48+s*20,24); gg.lineTo(48+s*22,50); },.9,"rgba(10,8,14,.5)");
      pg.fillStyle="#d8c8a0"; pg.beginPath(); // wing claw
      pg.moveTo(48+s*19,24); pg.lineTo(48+s*22,18); pg.lineTo(48+s*22,25); pg.closePath(); pg.fill();
    });
  }
  // legs (two, raptor)
  limb(g,[[42,66],[38,76],[42,84]],4.4,hide); limb(g,[[55,66],[59,76],[55,84]],4.4,hide);
  for(const fx of [42,55]) for(let i=-1;i<2;i++)
    inkPath(g,gg=>{ gg.moveTo(fx,84); gg.lineTo(fx+i*3.4,87); },1.4,"#d8c8a0");
  // body
  ell(g,48,60,11,12,hide);
  hatch(g,gg=>gg.ellipse(48,60,11,12,0,0,7),48,62,46,74);
  inkPath(g,gg=>gg.ellipse(48,60,11,12,0,0,7),1.5);
  // belly band
  g.fillStyle="#d8b06a"; g.beginPath(); g.ellipse(48,63,5.5,8.5,0,0,7); g.fill();
  inkPath(g,gg=>{ for(let i=0;i<4;i++){ gg.moveTo(43.5,57+i*4); gg.lineTo(52.5,57+i*4); } },.8);
  // tail curled with barb
  limb(g,[[54,68],[68,74],[76,66],[72,56+rf(-4,4)]],3.4,hide);
  g.fillStyle="#d8c8a0"; g.beginPath(); g.moveTo(70,57); g.lineTo(72,48); g.lineTo(75,56); g.closePath(); g.fill();
  inkPath(g,gg=>{ gg.moveTo(70,57); gg.lineTo(72,48); gg.lineTo(75,56); },1);
  // S neck + head
  limb(g,[[46,50],[42,40],[46,32]],5.5,hide);
  ell(g,48,29,7,6,hide);
  g.fillStyle=hide; g.beginPath(); g.moveTo(52,26); g.lineTo(63,29); g.lineTo(52,33); g.closePath(); g.fill(); // beak snout
  inkPath(g,gg=>{ gg.ellipse(48,29,7,6,0,0,7); gg.moveTo(52,26); gg.lineTo(63,29); gg.lineTo(52,33); },1.4);
  inkPath(g,gg=>{ gg.moveTo(55,29.5); gg.lineTo(62,29.2); },.9); // mouth line
  glowDot(g,48,27.5,1.7,pick(["#ffd166","#ff8a3a"])); blink(48,27.2,2.4,2,hide);
  g.fillStyle="#d8c8a0"; g.beginPath(); g.moveTo(45,24); g.lineTo(41,15+rf(-2,2)); g.lineTo(48,22); g.closePath(); g.fill(); // horn
  inkPath(g,gg=>{ gg.moveTo(45,24); gg.lineTo(41,15); },1);
  return "Wyvern";
}

function cDragon(g){
  const hide=pick(["#a83a2e","#3a6e4a","#3a4a8a","#6e3a7a","#8a6e2a"]), hideD=shade(hide,.55);
  const wing=shade(hide,.4), belly="#d8b06a";
  ground(g,30);
  // spread wings
  for(const s of [-1,1]){
    g.fillStyle=wing; g.beginPath();
    g.moveTo(48+s*6,52);
    g.lineTo(48+s*22,26+rf(-3,3)); g.lineTo(48+s*38,34);
    g.quadraticCurveTo(48+s*34,44,48+s*30,48);
    g.quadraticCurveTo(48+s*22,44,48+s*16,52);
    g.quadraticCurveTo(48+s*10,50,48+s*6,52); g.closePath(); g.fill();
    inkPath(g,gg=>{ gg.moveTo(48+s*6,52); gg.lineTo(48+s*22,26); gg.lineTo(48+s*38,34); },1.4);
    for(const fx of [30,22]) inkPath(g,gg=>{ gg.moveTo(48+s*22,27); gg.lineTo(48+s*fx,48); },.9,"rgba(10,8,14,.5)");
    g.fillStyle="#d8c8a0"; g.beginPath();
    g.moveTo(48+s*21,27); g.lineTo(48+s*24,21); g.lineTo(48+s*24,28); g.closePath(); g.fill();
  }
  // hind legs + forelegs
  limb(g,[[40,66],[36,76],[40,84]],5,hide); limb(g,[[57,66],[61,76],[57,84]],5,hide);
  limb(g,[[42,62],[38,72],[41,80]],3.6,hideD); limb(g,[[54,62],[58,72],[55,80]],3.6,hideD);
  for(const fx of [40,57]) for(let i=-1;i<2;i++)
    inkPath(g,gg=>{ gg.moveTo(fx,84); gg.lineTo(fx+i*3.6,87); },1.5,"#d8c8a0");
  // body
  ell(g,48,58,13,14,hide);
  hatch(g,gg=>gg.ellipse(48,58,13,14,0,0,7),48,62,42,74);
  inkPath(g,gg=>gg.ellipse(48,58,13,14,0,0,7),1.6);
  g.fillStyle=belly; g.beginPath(); g.ellipse(48,61,6.5,10,0,0,7); g.fill();
  inkPath(g,gg=>{ for(let i=0;i<5;i++){ gg.moveTo(42.5,54+i*4); gg.lineTo(53.5,54+i*4); } },.8);
  // tail
  limb(g,[[56,66],[72,72],[82,62+rf(-6,4)]],4,hide);
  for(let i=0;i<3;i++){ g.fillStyle=hideD; g.beginPath();
    g.moveTo(62+i*7,69-i*2.4); g.lineTo(64+i*7,63-i*3); g.lineTo(66+i*7,68-i*2.6); g.closePath(); g.fill(); }
  // neck + head
  limb(g,[[46,48],[44,38],[47,31]],6.5,hide);
  ell(g,49,27,8,7,hide);
  g.fillStyle=hide; g.beginPath(); g.moveTo(54,23); g.lineTo(66,27); g.lineTo(54,31); g.closePath(); g.fill();
  inkPath(g,gg=>{ gg.ellipse(49,27,8,7,0,0,7); gg.moveTo(54,23); gg.lineTo(66,27); gg.lineTo(54,31); },1.4);
  inkPath(g,gg=>{ gg.moveTo(57,27.6); gg.lineTo(65,27.2); },.9);
  glowDot(g,49,25,1.9,"#ffdf6b"); blink(49,24.7,2.4,2.1,hide);
  for(const [hx,hy] of [[45,21],[51,20]]){ g.fillStyle="#d8c8a0"; g.beginPath();
    g.moveTo(hx,hy+2); g.lineTo(hx-3,hy-7+rf(-2,2)); g.lineTo(hx+3,hy); g.closePath(); g.fill();
    inkPath(g,gg=>{ gg.moveTo(hx,hy+2); gg.lineTo(hx-3,hy-7); },1); }
  // ember drift chance
  if(chance(.5)) for(let i=0;i<5;i++) glowDot(g,66+rf(-3,8),27+rf(-6,4),rf(.5,1.1),pick(["#ffb54d","#ff6b3d"]));
  return "Dragon";
}

function cGolem(g){
  const rock=pick(["#6e6a62","#5e5a6e","#6a5e52","#565e5a"]), rockD=shade(rock,.6);
  const rune=pick(["#7ae0ff","#7ee787","#ffb54d","#c77dff"]);
  ground(g,28);
  // legs (short slabs)
  g.fillStyle=rockD; g.fillRect(36,72,10,13); g.fillRect(51,72,10,13);
  inkPath(g,gg=>{ gg.rect(36,72,10,13); gg.rect(51,72,10,13); },1.4);
  // massive arms down to ground w/ boulder fists
  for(const s of [-1,1]){
    limb(g,[[48+s*14,50],[48+s*23,64],[48+s*24,76]],7.5,rock);
    ell(g,48+s*25,80,7.5,6,rockD);
    inkPath(g,gg=>gg.ellipse(48+s*25,80,7.5,6,0,0,7),1.4);
    for(let i=0;i<3;i++) inkPath(g,gg=>{ gg.moveTo(48+s*(20+i*3.4),83); gg.lineTo(48+s*(20+i*3.4),86.5); },.9);
  }
  // torso: broad trapezoid + shoulder boulders
  g.fillStyle=rock; g.beginPath();
  g.moveTo(31,46); g.lineTo(65,46); g.lineTo(60,74); g.lineTo(36,74); g.closePath(); g.fill();
  hatch(g,gg=>{ gg.moveTo(31,46); gg.lineTo(65,46); gg.lineTo(60,74); gg.lineTo(36,74); gg.closePath(); },48,66,46,74);
  inkPath(g,gg=>{ gg.moveTo(31,46); gg.lineTo(65,46); gg.lineTo(60,74); gg.lineTo(36,74); gg.closePath(); },1.6);
  ell(g,32,48,9,8,rock); ell(g,64,48,9,8,rock);
  inkPath(g,gg=>{ gg.ellipse(32,48,9,8,0,0,7); gg.ellipse(64,48,9,8,0,0,7); },1.4);
  // glowing cracks
  g.save(); g.shadowColor=rune; g.shadowBlur=5;
  for(let i=0;i<3;i++){ const sx=rf(38,58), sy=rf(50,70);
    inkPath(g,gg=>{ gg.moveTo(sx,sy); gg.lineTo(sx+rf(-4,4),sy+rf(3,6)); gg.lineTo(sx+rf(-5,5),sy+rf(7,11)); },1,rune); }
  g.restore();
  // chest rune
  g.save(); g.shadowColor=rune; g.shadowBlur=8;
  g.strokeStyle=rune; g.lineWidth=1.6;
  g.beginPath(); g.arc(48,58,4.5,0,7); g.stroke();
  g.beginPath(); g.moveTo(48,53.5); g.lineTo(48,62.5); g.moveTo(44,58); g.lineTo(52,58); g.stroke();
  g.restore();
  // small head sunk between shoulders
  g.fillStyle=rockD; g.fillRect(42,36,12,11);
  inkPath(g,gg=>gg.rect(42,36,12,11),1.4);
  glowDot(g,45.5,41,1.4,rune); glowDot(g,50.5,41,1.4,rune);
  blink(45.5,41,1.9,1.7,rockD); blink(50.5,41,1.9,1.7,rockD);
  // moss chance + rubble
  if(chance(.5)) for(let i=0;i<4;i++) ell(g,rf(34,62),rf(46,72),rf(1.5,3),rf(1,2),"#4a6e3a");
  for(let i=0;i<3;i++){ ell(g,rf(20,76),85+rf(-1,1),rf(1.5,3),rf(1,1.8),rockD);
  }
  return "Golem";
}

/* ---- hero full-body builders (96-space, standing y≈86) ---- */
function hKnight(g){
  const armor="#8f9ec4", armorD="#5b6b96", cloth="#4c5c86";
  ground(g,17);
  limb(g,[[44,64],[42,75],[44,84]],4.4,armorD); limb(g,[[52,64],[54,75],[52,84]],4.4,armorD);
  ell(g,48,56,10,12,armor);
  hatch(g,gg=>gg.ellipse(48,56,10,12,0,0,7),48,60,42,70);
  inkPath(g,gg=>gg.ellipse(48,56,10,12,0,0,7),1.5);
  inkPath(g,gg=>{ gg.moveTo(41,52); gg.lineTo(55,52); gg.moveTo(40,58); gg.lineTo(56,58); },1,"rgba(10,8,14,.45)");
  ell(g,39,48,6,5,"#aeb9cc"); ell(g,57,48,6,5,"#aeb9cc"); // pauldrons
  inkPath(g,gg=>{ gg.ellipse(39,48,6,5,0,0,7); gg.ellipse(57,48,6,5,0,0,7); },1.2);
  limb(g,[[40,52],[33,58],[31,63]],3.2,armorD);
  limb(g,[[56,52],[62,56],[64,61]],3.2,armorD);
  // sword + shield
  limb(g,[[64,61],[64,34]],1.9,"#c8ccd6",.8);
  g.fillStyle="#5a4a32"; g.fillRect(62,59,4,5); inkPath(g,gg=>{ gg.moveTo(60,59); gg.lineTo(68,59); },1.4);
  ell(g,30,58,6.5,8.5,"#4c5c86"); inkPath(g,gg=>gg.ellipse(30,58,6.5,8.5,0,0,7),1.4);
  ell(g,30,58,1.7,1.7,"#c9a04a");
  // helmed head
  ell(g,48,38,8.5,8,armor);
  g.fillStyle="#8f9ec4"; g.beginPath(); g.ellipse(48,34,9,6,0,Math.PI,0); g.fill();
  g.fillStyle="#0a0810"; g.fillRect(42,37,12,3.4); // visor slit
  inkPath(g,gg=>{ gg.ellipse(48,38,8.5,8,0,0,7); gg.rect(42,37,12,3.4); },1.3);
  g.fillStyle="#8a2a22"; g.beginPath(); g.moveTo(45,28); g.quadraticCurveTo(48,14,58,20); g.quadraticCurveTo(52,24,52,29); g.closePath(); g.fill();
  inkPath(g,gg=>{ gg.moveTo(45,28); gg.quadraticCurveTo(48,14,58,20); },1);
  return "Knight";
}
function hMage(g){
  const robe="#5c3ea8", robeD="#37246b";
  ground(g,15);
  g.fillStyle=robe; g.beginPath();
  g.moveTo(48,30); g.quadraticCurveTo(61,34,59,54); g.quadraticCurveTo(63,72,60,84);
  g.lineTo(36,84); g.quadraticCurveTo(33,72,37,54); g.quadraticCurveTo(35,34,48,30); g.closePath(); g.fill();
  hatch(g,gg=>{ gg.moveTo(48,30); gg.quadraticCurveTo(61,34,59,54); gg.quadraticCurveTo(63,72,60,84);
    gg.lineTo(36,84); gg.quadraticCurveTo(33,72,37,54); gg.quadraticCurveTo(35,34,48,30); gg.closePath(); },48,62,30,84);
  inkPath(g,gg=>{ gg.moveTo(48,30); gg.quadraticCurveTo(61,34,59,54); gg.quadraticCurveTo(63,72,60,84); },1.4);
  inkPath(g,gg=>{ gg.moveTo(48,30); gg.quadraticCurveTo(35,34,37,54); gg.quadraticCurveTo(33,72,36,84); },1.4);
  for(const fx of [43,53]) inkPath(g,gg=>{ gg.moveTo(fx,48); gg.quadraticCurveTo(fx+rf(-2,2),66,fx+rf(-2,2),82); },.9,"rgba(8,6,12,.45)");
  g.fillStyle="#c9a04a"; g.fillRect(38,56,20,3); inkPath(g,gg=>gg.rect(38,56,20,3),1); // belt
  // head + hair + hat
  ell(g,48,34,7.5,7,"#f0d6bc");
  ell(g,45,33,1,1.3,"#2b2b3a"); ell(g,51,33,1,1.3,"#2b2b3a");
  inkPath(g,gg=>{ gg.moveTo(45.5,37.5); gg.quadraticCurveTo(48,39,50.5,37.5); },1);
  g.fillStyle="#e8d089"; g.beginPath(); g.moveTo(41,32); g.quadraticCurveTo(38,44,41,52); g.lineTo(44,40); g.fill();
  g.beginPath(); g.moveTo(55,32); g.quadraticCurveTo(58,44,55,52); g.lineTo(52,40); g.fill();
  g.fillStyle=robeD;
  g.beginPath(); g.ellipse(48,29,12,4,0,0,7); g.fill();
  g.beginPath(); g.moveTo(41,28); g.quadraticCurveTo(45,10,58,14); g.quadraticCurveTo(52,18,54,28); g.closePath(); g.fill();
  inkPath(g,gg=>{ gg.ellipse(48,29,12,4,0,0,7); gg.moveTo(41,28); gg.quadraticCurveTo(45,10,58,14); },1.2);
  // staff w/ orb
  limb(g,[[63,84],[62,36]],2,"#5a4a32",1);
  glowDot(g,62,32,3.2,"#7ae0ff");
  ell(g,62,50,2.4,2,"#f0d6bc"); // hand
  return "Mage";
}
function hCleric(g){
  const robe="#d9c79c", robeD="#9a824f";
  ground(g,15);
  g.fillStyle=robe; g.beginPath();
  g.moveTo(48,30); g.quadraticCurveTo(62,34,60,56); g.quadraticCurveTo(63,72,60,84);
  g.lineTo(36,84); g.quadraticCurveTo(33,72,36,56); g.quadraticCurveTo(34,34,48,30); g.closePath(); g.fill();
  hatch(g,gg=>{ gg.moveTo(48,30); gg.quadraticCurveTo(62,34,60,56); gg.quadraticCurveTo(63,72,60,84);
    gg.lineTo(36,84); gg.quadraticCurveTo(34,34,48,30); gg.closePath(); },48,62,30,84);
  inkPath(g,gg=>{ gg.moveTo(48,30); gg.quadraticCurveTo(62,34,60,56); gg.quadraticCurveTo(63,72,60,84); },1.4);
  inkPath(g,gg=>{ gg.moveTo(48,30); gg.quadraticCurveTo(34,34,36,56); gg.quadraticCurveTo(33,72,36,84); },1.4);
  g.fillStyle="#c9a04a"; g.fillRect(45,52,6,10); g.fillRect(41,55,14,4); // cross tabard
  inkPath(g,gg=>{ gg.rect(45,52,6,10); gg.rect(41,55,14,4); },.9);
  // hooded head
  g.fillStyle=robeD; g.beginPath(); g.ellipse(48,32,10.5,11,0,0,7); g.fill();
  inkPath(g,gg=>gg.ellipse(48,32,10.5,11,0,0,7),1.4);
  ell(g,48,34,6.5,6,"#e2b088");
  ell(g,45.5,33,1,1.3,"#3a2b2b"); ell(g,50.5,33,1,1.3,"#3a2b2b");
  inkPath(g,gg=>{ gg.moveTo(46,37.5); gg.quadraticCurveTo(48,39,50,37.5); },1);
  // mace
  limb(g,[[62,66],[64,44]],2.2,"#5a4a32",1);
  ell(g,64.5,41,4.2,5,"#8a8a92");
  inkPath(g,gg=>gg.ellipse(64.5,41,4.2,5,0,0,7),1.1);
  for(let i=0;i<3;i++) ell(g,62.5+i*2,37.5+ (i%2)*7,0.8,0.8,"#c8ccd6");
  ell(g,62,60,2.4,2,"#e2b088");
  return "Cleric";
}
const FIGURES={rat:cRat,goblin:cGoblin,kobold:cKobold,skeleton:cSkeleton,wight:cWight,dragon:cDragon,
  spider:cSpider,lich:cLich,wyvern:cWyvern,golem:cGolem,knight:hKnight,mage:hMage,cleric:hCleric};
function buildFigure(kind,seed){
  seedRng(seed); setParts(null); setBlinks(null);
  const c=document.createElement("canvas"); c.width=c.height=384;
  const g=c.getContext("2d"); g.scale(4,4);
  (FIGURES[kind]||cGoblin)(g);
  const snap=maskToSnap(c);
  bakeGradeInto96(g); applyMask(c,snap);
  return c;
}

export {
  cSpider, cKobold, cGoblin, cSkeleton, cRat, cLich, cWight, cWyvern, cDragon, cGolem, hKnight, hMage, hCleric, FIGURES, buildFigure
};
