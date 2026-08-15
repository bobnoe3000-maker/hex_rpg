/* ============ UI :: itemView.js — shared item rendering ============ */
/* Single source for how an item's name/grade renders, used by the character panel and shop. */
"use strict";

export const GRADE_COLOR = { plain: "#e8e8e8", fine: "#8fd39a", rare: "#4da6ff", epic: "#c77dff" };

export const itemNameHtml = it =>
  `<b style="color:${GRADE_COLOR[it.grade] || "#e8e8e8"}">${it.n}${it.upgradeLevel ? " +" + it.upgradeLevel : ""}</b>`;
