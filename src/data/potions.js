/* ============ DATA :: potions.js — consumable brews (the potion belt) ============ */
/* Pure content. Seven brews × five sizes. A hero equips a stack into their potion slot and the
   battle AI auto-quaffs it on cooldown when the trigger fits (see game.js tryQuaff). Effects reuse
   the timed-buff system (heal / heal-over-time / shield / stat auras). Sizes scale the magnitude
   (and buff duration) and, steeply, the price — a silver sink. Stacks cap at 99. */
"use strict";

export const POTION_CAP = 99;

/* effect: heal (instant %HP) · regen (%HP over dur) · shield (%HP absorb for dur) ·
   mult (stat ×(1+val) for dur) · flat (stat +val for dur). trigger: hurt | combat. */
export const POTIONS = [
  { id: "heal",    name: "Healing Draught", color: "#e5484d", effect: "heal",   base: 0.12, dur: 0, cd: 10, trigger: "hurt",   blurb: "Restore HP instantly" },
  { id: "regen",   name: "Regen Elixir",    color: "#6bbf59", effect: "regen",  base: 0.22, dur: 6, cd: 14, trigger: "hurt",   blurb: "Heal over time" },
  { id: "aegis",   name: "Aegis Potion",    color: "#5fd0cf", effect: "shield", base: 0.16, dur: 8, cd: 16, trigger: "hurt",   blurb: "A damage-absorbing shield" },
  { id: "might",   name: "Potion of Might", color: "#ff9a5c", effect: "mult", stat: "atk",  base: 0.10, dur: 6, cd: 18, trigger: "combat", blurb: "+ATK for a while" },
  { id: "iron",    name: "Ironhide Tonic",  color: "#7aa8d6", effect: "mult", stat: "def",  base: 0.12, dur: 6, cd: 18, trigger: "combat", blurb: "+DEF for a while" },
  { id: "swift",   name: "Swiftdraught",    color: "#f2d15b", effect: "mult", stat: "aspd", base: 0.10, dur: 6, cd: 20, trigger: "combat", blurb: "+Attack Speed for a while" },
  { id: "fortune", name: "Fortune Philter", color: "#b48bff", effect: "flat", stat: "crit", base: 8,    dur: 6, cd: 20, trigger: "combat", blurb: "+Crit for a while" },
];

export const SIZES = [
  { id: "tiny",   name: "Tiny",   mult: 1.00, durMult: 1.00, cost: 8   },
  { id: "small",  name: "Small",  mult: 1.67, durMult: 1.15, cost: 20  },
  { id: "medium", name: "Medium", mult: 2.67, durMult: 1.30, cost: 50  },
  { id: "large",  name: "Large",  mult: 4.00, durMult: 1.50, cost: 120 },
  { id: "giant",  name: "Giant",  mult: 5.83, durMult: 1.75, cost: 280 },
];

export const POTION_BY_ID = Object.fromEntries(POTIONS.map(p => [p.id, p]));
export const SIZE_BY_ID = Object.fromEntries(SIZES.map((s, i) => [s.id, { ...s, order: i }]));
const STAT_LABEL = { atk: "ATK", def: "DEF", aspd: "Speed", crit: "Crit" };
const round3 = v => Math.round(v * 1000) / 1000;
const round1 = v => Math.round(v * 10) / 10;

export const potionName = (typeId, sizeId) => `${SIZE_BY_ID[sizeId].name} ${POTION_BY_ID[typeId].name}`;
export const potionCost = (typeId, sizeId) => SIZE_BY_ID[sizeId].cost;
export const potionSell = (typeId, sizeId) => Math.max(1, Math.floor(potionCost(typeId, sizeId) * 0.35));

/* resolved effect for a brew at a size: magnitude (val), duration, cooldown, trigger. */
export function potionEffect(typeId, sizeId) {
  const t = POTION_BY_ID[typeId], s = SIZE_BY_ID[sizeId];
  if (!t || !s) return null;
  const val = t.effect === "flat" ? Math.round(t.base * s.mult) : round3(t.base * s.mult);
  const dur = t.dur ? round1(t.dur * s.durMult) : 0;
  return { effect: t.effect, stat: t.stat || null, val, dur, cd: t.cd, trigger: t.trigger, color: t.color, name: t.name };
}
/* one-line human description of what a brew at a size does */
export function potionEffectText(typeId, sizeId) {
  const e = potionEffect(typeId, sizeId); if (!e) return "";
  switch (e.effect) {
    case "heal":   return `Restore ${Math.round(e.val * 100)}% HP`;
    case "regen":  return `Heal ${Math.round(e.val * 100)}% HP over ${e.dur}s`;
    case "shield": return `Absorb ${Math.round(e.val * 100)}% HP for ${e.dur}s`;
    case "mult":   return `+${Math.round(e.val * 100)}% ${STAT_LABEL[e.stat]} for ${e.dur}s`;
    case "flat":   return `+${e.val} ${STAT_LABEL[e.stat]} for ${e.dur}s`;
  }
  return "";
}

/* a loot-dropped potion: random brew, size biased toward the dungeon tier (deeper = bigger). */
export function rollLootPotion(tier, rng) {
  const type = POTIONS[(rng() * POTIONS.length) | 0].id;
  const center = Math.max(0, Math.min(4, (Math.max(1, tier || 1) - 1) / 2));
  const idx = Math.round(Math.max(0, Math.min(4, center + (rng() * 2 - 1) * 1.5)));
  return { type, size: SIZES[idx].id, qty: 1 };
}
