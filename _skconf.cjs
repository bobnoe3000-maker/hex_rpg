const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const dir='/tmp/claude-0/-home-user-hex-rpg/306f5839-7a1f-5e82-80f9-1b47825c72a5/scratchpad/';
(async()=>{
const exe='/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const b=await chromium.launch({executablePath:exe,args:['--no-sandbox']});
const p=await b.newPage({viewport:{width:430,height:880},deviceScaleFactor:2});
const errs=[]; p.on('console',m=>{if(m.type()==='error')errs.push(m.text());}); p.on('pageerror',e=>errs.push('PE '+e.message));
await p.goto('http://localhost:8094/index.html',{waitUntil:'networkidle'});
const clicks=["Enter the Deep","Continue as Guest","start a new game","Fighter","Next"];
for(const t of clicks){ try{ await p.locator(`text=${t}`).first().click({timeout:2500}); await p.waitForTimeout(300);}catch(e){} }
for(let i=0;i<8;i++){ try{ const c=p.locator('text=/Confirm|Begin|Continue|Start/').first(); if(await c.count()){ await c.click({timeout:1000}); await p.waitForTimeout(300);} }catch(e){} }
await p.waitForTimeout(800);
async function clickTxt(txt){const h=await p.evaluateHandle((t)=>{const els=[...document.querySelectorAll('button,a,[role=button],div,li,span')];return els.filter(e=>e.offsetParent!==null).find(e=>{const s=(e.textContent||'').toUpperCase();return s.includes(t)&&s.length<40;});},txt);const el=h.asElement();if(el){await el.click({force:true});await p.waitForTimeout(500);return true;}return false;}
await clickTxt('DEPART'); await p.waitForTimeout(400);
await clickTxt('SHADED FOOTHILLS'); await p.waitForTimeout(400);
await clickTxt('DESCEND'); await p.waitForTimeout(1500);
// set speed 2x
await p.locator('[data-spd]').click().catch(()=>{});
// poll hero level via bottom tile until >=2
let lvl=1;
for(let i=0;i<24;i++){
  await p.waitForTimeout(9000);
  lvl = await p.evaluate(()=>{ const t=document.body.innerText.match(/Lv\s*(\d+)/); return t?+t[1]:1; });
  if(lvl>=2) break;
}
const openPanel=async()=>{ await clickTxt('TAP FOR GEAR'); await p.waitForTimeout(400); await p.locator('[data-tab="skills"]').first().click().catch(()=>{}); await p.waitForTimeout(300); };
await openPanel();
const pts0 = await p.$eval('.cp-pts-h .av', e=>parseInt(e.textContent)||0).catch(()=>0);
let out={lvl,pts0};
if(pts0>0){
  // --- CONFIRM test ---
  await p.locator('[data-sk-open="fury"]').first().click(); await p.waitForTimeout(200);
  await p.locator('[data-sk-inc="fury"]').click(); await p.waitForTimeout(200);
  const draftBarVisible = await p.locator('.skm-draft').count();
  await p.screenshot({path:dir+'conf1.png'});
  await p.locator('.skm-conf').click(); await p.waitForTimeout(400);  // modal Confirm
  const furyCommitted = await p.$eval('.sk-node.on .sk-nm', e=>e.textContent).catch(()=>'');
  const modalGone = await p.locator('.skm').count();
  const ptsAfterConfirm = await p.$eval('.cp-pts-h .av', e=>parseInt(e.textContent)||0).catch(()=>-1);
  out={...out,draftBarVisible,furyCommitted,modalGone,ptsAfterConfirm};
  // --- DISCARD test (needs a point; only if points remain) ---
  if(ptsAfterConfirm>0){
    await p.locator('[data-sk-open="reckless"]').first().click(); await p.waitForTimeout(200);
    await p.locator('[data-sk-inc="reckless"]').click(); await p.waitForTimeout(200);
    const pend = await p.$eval('.skm-st .lb', e=>e.textContent.replace(/\s+/g,' ').trim());
    await p.locator('.skm-disc').click(); await p.waitForTimeout(300);  // modal Discard
    const ptsAfterDiscard = await p.$eval('.cp-pts-h .av', e=>parseInt(e.textContent)||0).catch(()=>-1);
    // reckless should be back to 0 pending
    const recklessOpen = await p.$eval('.skm-st .lb', e=>e.textContent.replace(/\s+/g,' ').trim()).catch(()=>'closed');
    out={...out,pendBeforeDiscard:pend,ptsAfterDiscard,recklessAfterDiscard:recklessOpen};
  }
}
console.log(JSON.stringify({...out,errs:errs.slice(0,5)}));
await b.close();
})().catch(e=>{console.log("FATAL",e.message);process.exit(1);});
