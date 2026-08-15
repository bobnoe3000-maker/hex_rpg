/* ============ DP ENGINE :: fx.js — combat & spell effects ============ */
"use strict";
const FXS=[];
function fxSpawn(dur,drawFn,z){ const f={t:0,dur,draw:drawFn,z:z||1}; FXS.push(f); return f; }
function fxUpdateDraw(g,dt){
  for(const f of FXS){ f.t+=dt; f.draw(g,Math.min(1,f.t/f.dur)); }
  for(let i=FXS.length;i--;) if(FXS[i].t>=FXS[i].dur) FXS.splice(i,1);
}
function fxClear(){ FXS.length=0; }
const easeOut=k=>1-Math.pow(1-k,2.2);

/* ---- floating text ---- */
function fxText(x,y,txt,col,big){
  fxSpawn(0.95,(g,k)=>{
    g.save(); g.globalAlpha=1-k*k;
    g.font=(big?"bold 17px":"bold 13px")+" Georgia"; g.textAlign="center";
    g.fillStyle="rgba(6,4,10,.9)"; g.fillText(txt,x+1,y-k*30+1);
    g.fillStyle=col; g.fillText(txt,x,y-k*30);
    g.restore();
  });
}
/* ---- melee slash arc ---- */
function fxSlash(x,y,crit){
  const ang=rf(-.5,.5), col=crit?"#ffdf6b":"#f0ece0";
  fxSpawn(0.24,(g,k)=>{
    const e=easeOut(k), a0=ang-1.5+e*2.2;
    g.save(); g.translate(x,y); g.rotate(ang);
    g.globalAlpha=1-k;
    g.strokeStyle=col; g.lineCap="round";
    g.lineWidth=crit?4:2.6;
    g.beginPath(); g.arc(0,0,15+e*5,a0,a0+1.1); g.stroke();
    g.lineWidth=1; g.strokeStyle="rgba(10,8,14,.7)";
    g.beginPath(); g.arc(0,0,15+e*5,a0,a0+1.1); g.stroke();
    g.restore();
  });
  fxSparks(x,y,crit?"#ffdf6b":"#c8ccd6",crit?8:5);
}
/* ---- hit sparks ---- */
function fxSparks(x,y,col,n){
  const ps=[]; for(let i=0;i<(n||6);i++){ const a=rf(0,6.28), s=rf(24,70);
    ps.push([Math.cos(a)*s,Math.sin(a)*s,rf(.6,1.6)]); }
  fxSpawn(0.4,(g,k)=>{
    const e=easeOut(k);
    g.save(); g.globalAlpha=1-k;
    for(const [dx,dy,r] of ps){
      g.fillStyle=col;
      g.fillRect(x+dx*e-r,y+dy*e+18*k*k-r,r*2,r*2); }
    g.restore();
  });
}
/* ---- projectile bolt + impact ---- */
function fxBolt(x1,y1,x2,y2,col,onHit){
  const d=Math.hypot(x2-x1,y2-y1), dur=clamp(d/260,.18,.5);
  fxSpawn(dur,(g,k)=>{
    const x=x1+(x2-x1)*k, y=y1+(y2-y1)*k;
    g.save();
    for(let i=0;i<4;i++){ const kk=Math.max(0,k-i*.05);
      const tx=x1+(x2-x1)*kk, ty=y1+(y2-y1)*kk;
      g.globalAlpha=(1-i*.22);
      g.shadowColor=col; g.shadowBlur=8;
      ell(g,tx,ty,4-i*.7,4-i*.7,col); }
    g.restore();
    if(k>=1){ fxSparks(x2,y2,col,7);
      fxSpawn(.22,(g2,k2)=>{ g2.save(); g2.globalAlpha=1-k2;
        g2.strokeStyle=col; g2.lineWidth=2;
        g2.beginPath(); g2.arc(x2,y2,4+k2*14,0,7); g2.stroke(); g2.restore(); });
      if(onHit){ onHit(); onHit=null; } }
  });
}
/* ---- holy heal burst ---- */
function fxHeal(x,y){
  const motes=[]; for(let i=0;i<7;i++) motes.push([rf(-14,14),rf(0,10),rf(1,2),rf(.6,1)]);
  fxSpawn(0.8,(g,k)=>{
    g.save(); g.globalAlpha=(1-k)*.9;
    g.strokeStyle="#7ee787"; g.lineWidth=2;
    g.beginPath(); g.arc(x,y,6+easeOut(k)*16,0,7); g.stroke();
    g.shadowColor="#7ee787"; g.shadowBlur=6;
    for(const [dx,dy,r,sp] of motes){
      ell(g,x+dx,y+dy-k*34*sp,r*(1-k*.5),r*(1-k*.5),"#a4f0a4"); }
    g.fillStyle="#e8ffe8"; g.globalAlpha=(1-k);
    g.fillRect(x-1.2,y-10-k*22,2.4,8); g.fillRect(x-4.5,y-7.6-k*22,9,2.4);
    g.restore();
  });
}
/* ---- fire breath cone ---- */
function fxBreath(x,y,tx,ty){
  const ang=Math.atan2(ty-y,tx-x), len=Math.hypot(tx-x,ty-y)+20;
  const tongues=[]; for(let i=0;i<16;i++)
    tongues.push([rf(.1,1),rf(-.45,.45),rf(3,7),pick(["#ff6b3d","#ffb54d","#ffd166"])]);
  fxSpawn(0.7,(g,k)=>{
    g.save(); g.translate(x,y); g.rotate(ang);
    g.globalAlpha=(k<.15?k/.15:1-((k-.15)/.85))*.95;
    for(const [d,off,r,col] of tongues){
      const px=d*len*Math.min(1,k*2.4), py=off*px*.55+Math.sin(k*20+d*9)*2;
      g.shadowColor=col; g.shadowBlur=7;
      ell(g,px,py,r*(0.6+d),r*(0.5+d*.7),col);
    }
    g.restore();
  });
}
/* ---- poison / frost cloud ---- */
function fxCloud(x,y,col){
  const puffs=[]; for(let i=0;i<8;i++) puffs.push([rf(-16,16),rf(-8,8),rf(5,11),rf(.4,1)]);
  fxSpawn(1.1,(g,k)=>{
    g.save(); g.globalAlpha=(k<.2?k/.2:1-((k-.2)/.8))*.5;
    for(const [dx,dy,r,sp] of puffs)
      ell(g,x+dx+Math.sin(k*4+dx)*3,y+dy-k*14*sp,r*(1+k*.6),r*(.8+k*.4),col);
    g.restore();
  });
}
/* ---- lightning strike ---- */
function fxLightning(x,y){
  const seg=[]; let px=x+rf(-18,18), py=y-70;
  seg.push([px,py]);
  while(py<y-4){ px+=rf(-9,9); py+=rf(8,14); seg.push([px,py]); }
  seg.push([x,y]);
  fxSpawn(0.35,(g,k)=>{
    g.save(); g.globalAlpha=k<.5?1:(1-(k-.5)/.5);
    g.shadowColor="#9ad1ff"; g.shadowBlur=10;
    g.strokeStyle="#e8f4ff"; g.lineWidth=k<.3?3:1.4;
    g.beginPath(); g.moveTo(seg[0][0],seg[0][1]);
    for(const [sx,sy] of seg) g.lineTo(sx,sy);
    g.stroke(); g.restore();
  });
  fxSparks(x,y,"#9ad1ff",8);
}
/* ---- death dissolve: unit figure crumbles upward ---- */
function fxDissolve(canvas,x,y,w,h,col){
  fxSpawn(0.9,(g,k)=>{
    g.save(); g.globalAlpha=(1-k);
    const rows=6;
    for(let i=0;i<rows;i++){
      const sy=(canvas.height/rows)*i, sh=canvas.height/rows;
      const lift=k*k*(28+i*8), drift=Math.sin(i*2.4)*k*10;
      g.drawImage(canvas,0,sy,canvas.width,sh,
        x-w/2+drift, y-h+(h/rows)*i-lift, w,h/rows);
    }
    g.globalAlpha=(1-k)*.8; g.shadowColor=col||"#9a8fb8"; g.shadowBlur=5;
    for(let i=0;i<5;i++) ell(g,x+rf(-w/2,w/2),y-rf(0,h)-k*30,rf(.8,1.8),rf(.8,1.8),col||"#9a8fb8");
    g.restore();
  });
}
/* ---- level-up / buff ring ---- */
function fxRing(x,y,col){
  fxSpawn(0.7,(g,k)=>{
    g.save(); g.globalAlpha=1-k;
    g.strokeStyle=col; g.lineWidth=2.4;
    g.beginPath(); g.ellipse(x,y,8+easeOut(k)*20,(8+easeOut(k)*20)*.45,0,0,7); g.stroke();
    g.lineWidth=1; g.globalAlpha=(1-k)*.6;
    g.beginPath(); g.ellipse(x,y,4+easeOut(k)*30,(4+easeOut(k)*30)*.45,0,0,7); g.stroke();
    g.restore();
  });
}
/* ---- shield block ---- */
function fxBlock(x,y){
  fxSpawn(0.35,(g,k)=>{
    g.save(); g.globalAlpha=1-k;
    g.strokeStyle="#9ad1ff"; g.lineWidth=2.6;
    g.beginPath(); g.arc(x,y,16,-2.2,-0.9); g.stroke();
    g.beginPath(); g.arc(x,y,20,-2.0,-1.1); g.stroke();
    g.restore();
  });
}
