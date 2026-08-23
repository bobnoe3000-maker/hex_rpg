/* ============ DP ENGINE :: diag.js — lightweight in-app diagnostics buffer ============ */
/* Captures console errors/warnings, uncaught exceptions, and hand-recorded events into a small
   ring buffer so they can be exported from the Keep's Diagnostics screen. This is the only way to
   see what went wrong on a phone (no dev console), e.g. a recovered render/loop exception. */
"use strict";

/* Bump on each meaningful deploy so a stale browser cache is visible at a glance
   (shown on the Diagnostics screen + in the export). */
export const APP_BUILD = "2026-08-23c · PvP Arena — now you WATCH the fight. Choosing a rival drops you onto a real dungeon floor and runs a live auto-battle — your party (gold) vs the rival team (blue), hero vs hero, cast for cast — on the very same engine as a delve, with a You/Foe counter, a 1×/2× speed toggle and Forfeit. When one side falls, VICTORY/DEFEAT shows and the result screen opens with your ELO swing, Valor + silver rewards and streak/promotion. The arena is consequence-free (your roster is healed after). Plus the rank shield (Bronze→Champion), Scout-reroll of Hard/Even/Favoured rivals, Leaderboard, and View Team. Prior: skill ranks clearer/smoother; every dungeon a roaming descent; offline progress; party bar fits three; rally flag order";

const BUF = [];
const MAX = 400;

function stamp() {
  // wall-clock HH:MM:SS.mmm — plain browser Date is fine here (this is runtime, not a build step)
  try { return new Date().toISOString().slice(11, 23); } catch { return "--:--:--"; }
}
function safe(o) {
  if (o instanceof Error) return `${o.name}: ${o.message}${o.stack ? "\n" + o.stack : ""}`;
  if (typeof o === "string") return o;
  try { return JSON.stringify(o); } catch { return String(o); }
}
function push(level, text) {
  BUF.push(`${stamp()} [${level}] ${text}`);
  while (BUF.length > MAX) BUF.shift();
}

/* Record a hand-tagged line (game lifecycle events, recovered errors, state snapshots). */
export function diag(level, ...args) { push(level, args.map(safe).join(" ")); }

/* Patch console + window once so stray errors are captured even when nothing calls diag(). */
export function installDiag() {
  if (installDiag._done || typeof window === "undefined") return;
  installDiag._done = true;
  const oErr = console.error.bind(console), oWarn = console.warn.bind(console);
  console.error = (...a) => { push("error", a.map(safe).join(" ")); oErr(...a); };
  console.warn = (...a) => { push("warn", a.map(safe).join(" ")); oWarn(...a); };
  window.addEventListener("error", e => {
    push("uncaught", `${e.message} @ ${(e.filename || "?").split("/").pop()}:${e.lineno || 0}:${e.colno || 0}` +
      (e.error && e.error.stack ? `\n${e.error.stack}` : ""));
  });
  window.addEventListener("unhandledrejection", e => push("promise", safe(e.reason)));
  push("info", `session start · ${navigator.userAgent}`);
}

export function diagText() { return BUF.join("\n"); }
export function diagCount() { return BUF.length; }
