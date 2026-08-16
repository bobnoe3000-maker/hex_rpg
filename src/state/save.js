/* ============ STATE :: save.js — localStorage save slots ============ */
/* Three named slots. A save is a plain-JSON snapshot (party, currencies, bag, room) — heroes carry
   their portrait/figure SEEDS, so all the canvas art regenerates on load; nothing non-serializable
   is stored. All localStorage access is guarded so private-mode / disabled storage degrades to
   "no saves" rather than throwing. */
"use strict";

export const SLOT_COUNT = 3;
export const SAVE_VERSION = 1;
const KEY = slot => `dp_save_${slot}`;

function get(k) { try { return localStorage.getItem(k); } catch { return null; } }
function set(k, v) { try { localStorage.setItem(k, v); return true; } catch { return false; } }

export function readSlot(slot) {
  const raw = get(KEY(slot));
  if (!raw) return null;
  try { const d = JSON.parse(raw); return d && d.v === SAVE_VERSION ? d : null; } catch { return null; }
}
export function writeSlot(slot, data) { return set(KEY(slot), JSON.stringify(data)); }
export function deleteSlot(slot) { try { localStorage.removeItem(KEY(slot)); } catch {} }

/* [{ slot, save|null }] for every slot, for the slot-picker */
export function listSlots() {
  const out = [];
  for (let i = 0; i < SLOT_COUNT; i++) out.push({ slot: i, save: readSlot(i) });
  return out;
}
