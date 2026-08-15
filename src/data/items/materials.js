/* ============ DATA :: items/materials.js — materials (base stat + optional drawback) ============ */
/* `mat` matches a gear type's category. Each grants one stat; some carry a drawback (a
   negative stat) — that's the "benefits AND drawbacks" of the design. `w` = drop weight. */
"use strict";

export const MATERIALS = [
  // --- weapon materials ---
  { id: "iron",       name: "Iron",       mat: "weapon", stat: "atk",   val: 1, w: 6 },
  { id: "steel",      name: "Steel",      mat: "weapon", stat: "atk",   val: 2, w: 4 },
  { id: "meteoric",   name: "Meteoric",   mat: "weapon", stat: "atk",   val: 3, w: 2, drawback: { stat: "aspd", val: -0.1 } },
  { id: "emberglass", name: "Emberglass", mat: "weapon", stat: "crit",  val: 4, w: 1 },
  // --- wearable materials (armor + trinkets) ---
  { id: "cotton",     name: "Cotton",     mat: "wear",   stat: "hp",    val: 4, w: 6 },
  { id: "silk",       name: "Silk",       mat: "wear",   stat: "dodge", val: 3, w: 5 },
  { id: "leather",    name: "Leather",    mat: "wear",   stat: "def",   val: 2, w: 5 },
  { id: "dragonhide", name: "Dragonhide", mat: "wear",   stat: "def",   val: 5, w: 2, drawback: { stat: "dodge", val: -2 } },
];
