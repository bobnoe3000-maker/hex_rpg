/* ============ CORE :: rng.js — seeded PRNG (pure, no deps) ============ */
/* mulberry32: fast, seedable, deterministic. Returns a ()=>[0,1) generator. */
"use strict";

export function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
