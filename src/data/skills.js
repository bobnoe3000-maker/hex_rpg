/* ============ DATA :: skills.js — class skill trees (branches / tiers / ranks) ============ */
/* Pure content, DOM-free. Each class has an OFFENSIVE and a DEFENSIVE branch of 13 skills laid out
   in 5 tiers (3·3·3·3 + capstone). Deeper tiers unlock only after enough points are invested in
   that branch (TIER_GATES). Every skill upgrades to rank 5. `fx` is the machine-readable effect the
   Skills system interprets; `text[]` is the human rank breakdown for the panel. Phase 1 = Fighter. */
"use strict";

export const TIER_GATES = [0, 0, 2, 6, 12, 20];   // index = tier (1..5): points-in-branch to unlock
export const MAX_RANK = 5;
export const BRANCHES = { off: "Offensive", def: "Defensive" };

/* fx keys the engine understands (all arrays are per-rank, index 0 = rank 1):
   flat:{stat:[..]}          flat stat bonus (folded into derive)
   mult:{stat, pct:[..], missing:true}   stat × (1 + pct·missingHpFraction)  (Berserker / Fortify)
   exec:{thr, pct:[..]}      +dmg vs targets below `thr` HP fraction        (Executioner)
   critDefIgnore:[..]        crits ignore this fraction of the target's DEF (Crushing Blows)
   critDmgReduce:[..]        take this fraction less critical damage         (Bulwark)
   lifesteal:[..]            heal this fraction of damage dealt              (Bloodthirst)
   cleave:{pct:[..],tg:[..]} basic attack splashes tg adjacent foes for pct·ATK
   momentum:{pct:[..],stacks:[..],dur}  each kill → temp ATK/aspd stack
   rend:{pct:[..],dur,stacks:[..]}      hits apply a bleed DoT
   reflect:[..]              reflect this fraction of melee damage taken     (Retaliation)
   waveheal:[..]             heal this fraction of max HP on wave clear      (Second Wind)
   lastst:{heal:[..],uses:[..]}  survive a lethal blow, heal fraction        (Last Stand)
   guardian:[..]             redirect this fraction of adjacent allies' incoming damage to you
   active:{cd:[..], kind, ...params}    an ability the battle AI casts on cooldown */
export const FIGHTER = {
  off: { name: "Onslaught", skills: [
    { id:"cleave", tier:1, type:"active", name:"Cleave", desc:"Your basic attack also strikes adjacent foes.",
      fx:{ cleave:{ pct:[.40,.48,.56,.64,.80], tg:[1,1,2,2,99] } },
      text:["40% ATK splash","48%","56% · +1 target","64%","80% · hits ALL adjacent"] },
    { id:"fury", tier:1, type:"passive", name:"Battle Fury", desc:"Raw offense — flat ATK.",
      fx:{ flat:{ atk:[3,6,9,12,15] } }, text:["+3 ATK","+6","+9","+12","+15 ATK"] },
    { id:"reckless", tier:1, type:"passive", name:"Reckless Stance", desc:"Trade guard for killing power.",
      fx:{ flat:{ crit:[6,9,12,15,18], def:[-4,-4,-4,-4,0] } },
      text:["+6 Crit, −4 DEF","+9 Crit","+12 Crit","+15 Crit","+18 Crit, no penalty"] },
    { id:"sunder", tier:2, type:"active", name:"Sunder", desc:"A heavy blow that shreds the target's armor.",
      fx:{ active:{ kind:"sunder", cd:[6,6,5,5,4], dmg:1.5, shred:[.20,.20,.20,.20,.24], dur:5 } },
      text:["150% ATK · −20% DEF 5s","cd −0s","cd −1s","cd −1s","−24% DEF · spreads"] },
    { id:"blood", tier:2, type:"passive", name:"Bloodthirst", desc:"Heal for a share of damage dealt.",
      fx:{ lifesteal:[.08,.10,.12,.14,.16] }, text:["8% lifesteal","10%","12%","14%","16%"] },
    { id:"momentum", tier:2, type:"passive", name:"Momentum", desc:"Kills snowball your speed and power.",
      fx:{ momentum:{ pct:[.04,.06,.08,.10,.12], stacks:[3,3,3,3,5], dur:6 } },
      text:["+4%/kill ×3","+6%","+8%","+10%","+12% ×5"] },
    { id:"whirl", tier:3, type:"active", name:"Whirlwind", desc:"Spin to strike every adjacent foe.",
      fx:{ active:{ kind:"whirl", cd:[8,8,8,8,8], dmg:[.80,.95,1.10,1.25,1.50], bleedAt:3 } },
      text:["80% ATK all adjacent","95%","110% · +bleed","125%","150%"] },
    { id:"exec", tier:3, type:"passive", name:"Executioner", desc:"Finish the wounded.",
      fx:{ exec:{ thr:.30, pct:[.25,.31,.37,.43,.50] } },
      text:["+25% vs <30% HP","+31%","+37%","+43%","+50%"] },
    { id:"rend", tier:3, type:"passive", name:"Rend", desc:"Your strikes leave foes bleeding.",
      fx:{ rend:{ pct:[.06,.075,.09,.105,.12], dur:4, stacks:[1,1,1,1,3] } },
      text:["6% ATK/s 4s","7.5%","9%","10.5%","12% · stacks ×3"] },
    { id:"rampage", tier:4, type:"active", name:"Rampage", desc:"A flurry of rapid strikes.",
      fx:{ active:{ kind:"rampage", cd:[12,12,12,12,12], hits:4, dmg:[.60,.68,.76,.84,1.00] } },
      text:["4×60% ATK","4×68%","4×76%","4×84%","4×100%"] },
    { id:"berserk", tier:4, type:"passive", name:"Berserker", desc:"The closer to death, the harder you hit.",
      fx:{ mult:{ stat:"atk", missing:true, pct:[.30,.38,.46,.54,.65] } },
      text:["up to +30% ATK","+38%","+46%","+54%","+65%"] },
    { id:"crush", tier:4, type:"passive", name:"Crushing Blows", desc:"Crits punch through armor.",
      fx:{ critDefIgnore:[.25,.32,.39,.46,.55] }, text:["crits ignore 25% DEF","32%","39%","46%","55%"] },
    { id:"wrath", tier:5, type:"active", name:"Warlord's Wrath", desc:"CAPSTONE — a devastating cleave that rallies the party.",
      fx:{ active:{ kind:"wrath", cd:[20,20,20,20,20], dmg:2.5, buff:[.10,.13,.16,.19,.22], dur:8 } },
      text:["+10% party ATK 8s","+13%","+16%","+19%","+22%"] },
  ]},
  def: { name:"Bulwark", skills: [
    { id:"guard", tier:1, type:"active", name:"Guard", desc:"Brace behind your shield for a burst of armor.",
      fx:{ active:{ kind:"guard", cd:[8,8,8,8,6], def:[.60,.70,.80,.90,1.10], dur:3 } },
      text:["+60% DEF 3s","+70%","+80%","+90%","+110% · cd −2s"] },
    { id:"tough", tier:1, type:"passive", name:"Toughness", desc:"More life to spend.",
      fx:{ flat:{ hp:[15,30,45,60,75] } }, text:["+15 HP","+30","+45","+60","+75"] },
    { id:"iron", tier:1, type:"passive", name:"Iron Skin", desc:"Flat armor.",
      fx:{ flat:{ def:[3,6,9,12,15] } }, text:["+3 DEF","+6","+9","+12","+15"] },
    { id:"taunt", tier:2, type:"active", name:"Taunt", desc:"Force nearby foes to come at you.",
      fx:{ active:{ kind:"taunt", cd:[7,7,7,7,7], dur:[4,5,6,7,8], defBuff:[0,0,.25,.25,.25] } },
      text:["taunt 4s","5s","6s · +DEF","7s","8s"] },
    { id:"wind", tier:2, type:"passive", name:"Second Wind", desc:"Catch your breath between waves.",
      fx:{ waveheal:[.10,.13,.16,.19,.22] }, text:["heal 10% on clear","13%","16%","19%","22%"] },
    { id:"deflect", tier:2, type:"passive", name:"Bulwark", desc:"Blunt the big hits.",
      fx:{ critDmgReduce:[.20,.26,.32,.38,.45] }, text:["−20% crit dmg","−26%","−32%","−38%","−45%"] },
    { id:"bash", tier:3, type:"active", name:"Shield Bash", desc:"Bash a foe for armor-scaled damage and stun it.",
      fx:{ active:{ kind:"bash", cd:[6,6,6,6,6], dmg:1.2, stun:[1.5,1.5,1.5,1.5,2.5] } },
      text:["120% DEF · stun 1.5s","","","","190% path · stun 2.5s"] },
    { id:"retal", tier:3, type:"passive", name:"Retaliation", desc:"Attackers pay for touching you.",
      fx:{ reflect:[.15,.20,.25,.30,.38] }, text:["reflect 15%","20%","25%","30%","38%"] },
    { id:"fort", tier:3, type:"passive", name:"Fortify", desc:"Armor thickens as you're wounded.",
      fx:{ mult:{ stat:"def", missing:true, pct:[.30,.38,.46,.54,.65] } },
      text:["up to +30% DEF","+38%","+46%","+54%","+65%"] },
    { id:"rally", tier:4, type:"active", name:"Rallying Cry", desc:"Shield the whole party with your resolve.",
      fx:{ active:{ kind:"rally", cd:[14,14,14,14,14], shield:[.12,.15,.18,.21,.26] } },
      text:["12% maxHP shield","15%","18%","21%","26%"] },
    { id:"last", tier:4, type:"passive", name:"Last Stand", desc:"Cheat death, then rally.",
      fx:{ lastst:{ heal:[.20,.26,.32,.38,.45], uses:[1,1,1,1,2] } },
      text:["survive at 1 HP, heal 20%","26%","32%","38%","45% · twice"] },
    { id:"guardian", tier:4, type:"passive", name:"Guardian", desc:"Take the hits meant for your pals.",
      fx:{ guardian:[.15,.20,.25,.30,.38] }, text:["redirect 15%","20%","25%","30%","38%"] },
    { id:"unbreak", tier:5, type:"active", name:"Unbreakable", desc:"CAPSTONE — become nigh-immune, taunt all, and heal.",
      fx:{ active:{ kind:"unbreak", cd:[24,24,24,24,24], dur:[3,3,3,3,4], heal:[.25,.28,.31,.34,.38] } },
      text:["immune 3s + heal 25%","28%","31%","34%","immune 4s + heal 38%"] },
  ]},
};

/* class → its two branches. Only the Fighter ships in Phase 1; the rest reuse this shape. */
export const CLASS_SKILLS = { fighter: FIGHTER };
