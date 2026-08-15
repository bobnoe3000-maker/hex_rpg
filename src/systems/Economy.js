/* ============ SYSTEM :: Economy.js — item pricing ============ */
/* Pure & DOM-free. Buy/sell prices derive from the same item score the bag uses to flag
   upgrades, plus a premium for forge levels. All constants live in data/balance.js. */
"use strict";

import { BAL } from "../data/balance.js";
import { itemScore } from "./Equipment.js";

export function priceOf(item) {
  return BAL.SHOP.BASE_PRICE
    + Math.round(itemScore(item) * BAL.SHOP.PRICE_MULT)
    + (item.upgradeLevel || 0) * BAL.SHOP.UPGRADE_PRICE;
}

export function sellPriceOf(item) {
  return Math.max(2, Math.round(priceOf(item) * BAL.SHOP.SELL_FRAC));
}
