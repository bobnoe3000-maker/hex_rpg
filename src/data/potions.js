/* ============ DATA :: potions.js — consumable brews (the potion belt) ============ */
/* Pure content. Seven brews, one standard size each. A hero equips a stack into their potion slot
   and the battle AI auto-quaffs it on cooldown when the trigger fits (see game.js tryQuaff). Effects
   reuse the timed-buff system (heal / heal-over-time / shield / stat auras). Stacks cap at 99. */
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

/* One standard potion — no size tiers. The single size scales the brews' base magnitude/duration and
   sets the flat shop price. (Potion stacks still carry a `size` field so the stash/belt key stays
   stable and old saves keep working, but there is only ever this one value.) */
export const STD_SIZE = "std";
export const SIZES = [
  { id: STD_SIZE, name: "", mult: 2.00, durMult: 1.25, cost: 25 },
];

export const POTION_BY_ID = Object.fromEntries(POTIONS.map(p => [p.id, p]));
export const SIZE_BY_ID = Object.fromEntries(SIZES.map((s, i) => [s.id, { ...s, order: i }]));
/* every stack resolves to the one size — any legacy id (tiny/small/…/giant) folds to the standard. */
const sizeOf = sizeId => SIZE_BY_ID[sizeId] || SIZE_BY_ID[STD_SIZE];
const STAT_LABEL = { atk: "ATK", def: "DEF", aspd: "Speed", crit: "Crit" };
const round3 = v => Math.round(v * 1000) / 1000;
const round1 = v => Math.round(v * 10) / 10;

export const potionName = typeId => POTION_BY_ID[typeId].name;
export const potionCost = () => SIZE_BY_ID[STD_SIZE].cost;
export const potionSell = () => Math.max(1, Math.floor(potionCost() * 0.35));

/* resolved effect for a brew: magnitude (val), duration, cooldown, trigger. */
export function potionEffect(typeId, sizeId) {
  const t = POTION_BY_ID[typeId], s = sizeOf(sizeId);
  if (!t) return null;
  const val = t.effect === "flat" ? Math.round(t.base * s.mult) : round3(t.base * s.mult);
  const dur = t.dur ? round1(t.dur * s.durMult) : 0;
  return { effect: t.effect, stat: t.stat || null, val, dur, cd: t.cd, trigger: t.trigger, color: t.color, name: t.name };
}
/* one-line human description of what a brew does */
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

/* a loot-dropped potion: a random brew in the one standard size. */
export function rollLootPotion(tier, rng) {
  const type = POTIONS[(rng() * POTIONS.length) | 0].id;
  return { type, size: STD_SIZE, qty: 1 };
}
