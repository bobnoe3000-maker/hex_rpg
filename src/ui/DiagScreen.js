/* ============ UI :: DiagScreen.js — export the diagnostic log from the Keep ============ */
/* Renders into #town over the hub. Shows the assembled diagnostics (state + event/error log +
   combat log) with a Copy button and a selectable textarea fallback for phones. */
"use strict";

import { ensureTownCss } from "./TownScreen.js";
import { iconImg } from "../engine/icons.js";

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
    <p class="diag-note">If something breaks or freezes, tap <b>Copy</b> and paste the log to report it —
      it captures recent errors, game state, and the combat log.</p>
    <textarea class="diag-ta" readonly>${text.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</textarea>
    <button class="tw-btn primary" data-copy>${iconImg("check", 15)} Copy diagnostics</button>
    <button class="tw-btn" data-back style="justify-content:center">Back to the Keep</button>
  </div>`;

  const status = el.querySelector("#diag-status");
  const ta = el.querySelector(".diag-ta");
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
