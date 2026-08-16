/* ============ UI :: DiagScreen.js — export the diagnostic log from the Keep ============ */
/* Renders into #town over the hub. Shows the assembled diagnostics (state + event/error log +
   combat log) with a Copy button and a selectable textarea fallback for phones. */
"use strict";

import { ensureTownCss } from "./TownScreen.js";
import { iconImg } from "../engine/icons.js";
import { APP_BUILD } from "../engine/diag.js";

/* Blow away any persisted/cached data and force a fresh reload. This is a zero-build ESM site, so
   a stale browser cache (or an open tab running old code) is the usual reason a shipped change
   doesn't show up — this clears storage/caches/service-workers and reloads with a cache-buster. */
async function hardReset() {
  try { localStorage.clear(); } catch {}
  try { sessionStorage.clear(); } catch {}
  try { if (window.caches) { const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); } } catch {}
  try { if (navigator.serviceWorker) { const rs = await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map(r => r.unregister())); } } catch {}
  const base = location.href.split("?")[0].split("#")[0];
  location.replace(base + "?fresh=" + Date.now());   // fresh document URL → re-fetch, revalidating modules
}

let cssDone = false;
function ensureDiagCss() {
  if (cssDone) return; cssDone = true;
  const s = document.createElement("style"); s.id = "diag-style";
  s.textContent = `
  .diag-ta{width:100%;height:min(52vh,420px);resize:none;font-family:ui-monospace,Menlo,Consolas,monospace;
    font-size:10.5px;line-height:1.45;color:#cfc6e6;background:#0d0a16;border:1px solid var(--line);
    border-radius:9px;padding:9px 10px;white-space:pre;overflow:auto;-webkit-user-select:text;user-select:text}
  .diag-note{font-size:11px;color:#9a8fb8;font-style:italic;line-height:1.5}
  .diag-ok{color:#7ee787}
  .diag-build{font-size:10.5px;color:#7d7196;font-family:ui-monospace,Menlo,Consolas,monospace;text-align:center;margin:-2px 0 2px}
  .tw-btn.reset{background:linear-gradient(#3a2033,#241626);color:#e8cfe0;box-shadow:0 3px 0 #140b18}
  `;
  document.head.appendChild(s);
}

/* ctx = { text:()=>string, back:()=>void } */
export function openDiag(ctx) {
  ensureTownCss(); ensureDiagCss();
  const el = document.getElementById("town");
  const text = ctx.text();

  el.innerHTML = `<div class="tw-wrap">
    <div class="shop-top" style="justify-content:space-between">
      <span class="shop-back" data-back>‹ The Keep</span>
      <span class="tw-cur"><span id="diag-status" class="diag-note">${text.split("\n").length} lines</span></span>
    </div>
    <div class="tw-head"><h1>Diagnostics</h1></div>
    <div class="diag-build">build ${APP_BUILD}</div>
    <p class="diag-note">If something breaks or freezes, tap <b>Copy</b> and paste the log to report it —
      it captures recent errors, game state, and the combat log.</p>
    <textarea class="diag-ta" readonly>${text.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</textarea>
    <button class="tw-btn primary" data-copy>${iconImg("check", 15)} Copy diagnostics</button>
    <button class="tw-btn reset" data-reset style="justify-content:center">${iconImg("refresh", 15)} Clear cache &amp; reload</button>
    <p class="diag-note" style="text-align:center">Not seeing a recent change? This wipes cached code &amp; data and reloads fresh.<br>
      Or open the site with <b>?reset</b> on the URL (e.g. <code>…/?reset</code>) to do the same from a stale tab.</p>
    <button class="tw-btn" data-back style="justify-content:center">Back to the Keep</button>
  </div>`;

  const status = el.querySelector("#diag-status");
  const ta = el.querySelector(".diag-ta");
  el.querySelector("[data-reset]").onclick = () => { status.innerHTML = `<span class="diag-ok">Clearing…</span>`; hardReset(); };
  el.querySelectorAll("[data-back]").forEach(b => b.onclick = () => ctx.back());
  el.querySelector("[data-copy]").onclick = async () => {
    let ok = false;
    try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(text); ok = true; } } catch { ok = false; }
    if (!ok) { // fallback: select the textarea so the user can copy manually
      try { ta.focus(); ta.setSelectionRange(0, ta.value.length); ok = document.execCommand && document.execCommand("copy"); } catch { ok = false; }
    }
    status.innerHTML = ok
      ? `<span class="diag-ok">Copied ✓</span>`
      : `Select the text above &amp; copy`;
  };
}
