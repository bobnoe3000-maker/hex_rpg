import { ri } from './core.js';
/* ============ DP ENGINE :: combat.js — D&D-lite sim: dice, units, loot, XP ============ */
"use strict";
const d=(n,s)=>{ let t=0; for(let i=0;i<n;i++) t+=ri(1,s); return t; };
const d20=()=>ri(1,20);
const mod=v=>Math.floor((v-10)/2);
const fm=v=>(v>=0?"+":"")+v;
function makeHero(cls,seed){
  const base={
    knight:{name:"Bram", cls:"knight", STR:16,DEX:12,CON:14,INT:8,WIS:10, hpDie:10, ac:16, dice:[1,8], stat:"STR", rng:1, spd:1.0},
    mage:  {name:"Wren", cls:"mage",   STR:8, DEX:14,CON:10,INT:16,WIS:12, hpDie:6,  ac:12, dice:[2,6], stat:"INT", rng:4, spd:1.15},
    cleric:{name:"Odo",  cls:"cleric", STR:12,DEX:10,CON:14,INT:10,WIS:16, hpDie:8,  ac:14, dice:[1,6], stat:"WIS", rng:1, spd:1.25},
  }[cls];
  const h={...base, team:0, lvl:1, xp:0, prof:2, gear:{weapon:null,armor:null,trinket:null},
    alive:true, seed, figSeed:(seed*7+3)|0};
  h.maxhp=Math.round((base.hpDie+mod(h.CON))*1.25); h.hp=h.maxhp;
  return h;
}
const XP_NEXT=[0,30,80,999];
function gearSum(u,k){ let t=0; for(const s in u.gear){ const g2=u.gear[s]; if(g2&&g2[k]) t+=g2[k]; } return t; }
function atkBonus(u){ return u.prof+mod(u[u.stat])+gearSum(u,"atk"); }
function dmgBonus(u){ return mod(u[u.stat])+gearSum(u,"dmgB"); }
function acOf(u){ return u.ac+gearSum(u,"ac"); }
function maxHp(u){ return u.maxhp+gearSum(u,"hp"); }
function dmgDice(u){ const w=u.gear.weapon; return (w&&w.dice)?w.dice:u.dice; }
const ITEM_POOL=[
 {n:"Shortsword +1",slot:"weapon",use:"knight",r:"common",atk:1,dmgB:1,d:"+1 hit, +1 dmg"},
 {n:"Flame Blade",slot:"weapon",use:"knight",r:"rare",atk:1,dmgB:3,d:"+1 hit, +3 dmg"},
 {n:"Dragonbane Greatsword",slot:"weapon",use:"knight",r:"epic",atk:2,dmgB:4,dice:[2,8],d:"2d8, +2 hit, +4 dmg"},
 {n:"Oak Wand",slot:"weapon",use:"mage",r:"common",atk:1,dmgB:1,d:"+1 hit, +1 dmg"},
 {n:"Staff of Embers",slot:"weapon",use:"mage",r:"rare",atk:1,dmgB:3,d:"+1 hit, +3 dmg"},
 {n:"Archmage Rod",slot:"weapon",use:"mage",r:"epic",atk:2,dmgB:3,dice:[3,6],d:"3d6, +2 hit, +3 dmg"},
 {n:"Blessed Mace",slot:"weapon",use:"cleric",r:"common",atk:1,dmgB:1,d:"+1 hit, +1 dmg"},
 {n:"Sunforged Morningstar",slot:"weapon",use:"cleric",r:"rare",atk:1,dmgB:3,healB:2,d:"+3 dmg, heals +2"},
 {n:"Chain Shirt",slot:"armor",use:"any",r:"common",ac:1,d:"+1 AC"},
 {n:"Knight's Plate",slot:"armor",use:"knight",r:"rare",ac:3,d:"+3 AC"},
 {n:"Robe of Warding",slot:"armor",use:"mage",r:"rare",ac:2,hp:5,d:"+2 AC, +5 HP"},
 {n:"Aegis of Dawn",slot:"armor",use:"cleric",r:"epic",ac:3,hp:8,d:"+3 AC, +8 HP"},
 {n:"Amulet of Vigor",slot:"trinket",use:"any",r:"common",hp:6,d:"+6 max HP"},
 {n:"Ring of Keen Strikes",slot:"trinket",use:"any",r:"rare",atk:1,dmgB:2,d:"+1 hit, +2 dmg"},
 {n:"Charm of the Phoenix",slot:"trinket",use:"any",r:"epic",hp:10,healB:3,d:"+10 HP, heals +3"},
];
function rollLoot(roomIdx,taken){
  const picks=[], pool=ITEM_POOL.filter(i=>!taken.includes(i));
  const take=r2=>{ const c=pool.filter(i=>i.r===r2&&!picks.includes(i)); return c.length?c[ri(0,c.length-1)]:null; };
  picks.push(take(roomIdx>=2?"epic":roomIdx>=1?"rare":"common")||take("common"));
  picks.push(take(roomIdx>=1?"rare":"common")||take("common"));
  picks.push(take("common")||take("rare"));
  return picks.filter(Boolean);
}
function foe(kind,r,c){
  const F={
    rat:     {name:"Giant Rat", hp:7,  ac:12, atk:3, dice:[1,4], dmgB:1, rng:1, spd:1.3, xp:6,  fig:"rat"},
    goblin:  {name:"Goblin",    hp:10, ac:13, atk:4, dice:[1,6], dmgB:2, rng:1, spd:1.1, xp:10, fig:"goblin"},
    kobold:  {name:"Kobold",    hp:8,  ac:13, atk:4, dice:[1,6], dmgB:1, rng:3, spd:1.0, xp:9,  fig:"kobold"},
    skeleton:{name:"Skeleton",  hp:13, ac:13, atk:4, dice:[1,8], dmgB:2, rng:1, spd:0.95,xp:12, fig:"skeleton"},
    wight:   {name:"Barrow Wight",hp:22,ac:14,atk:5, dice:[1,8], dmgB:3, rng:1, spd:0.9, xp:25, fig:"wight"},
    dragon:  {name:"Ashwing the Young",hp:60,ac:16,atk:7,dice:[2,8],dmgB:4,rng:1,spd:0.8,xp:90,fig:"dragon",boss:true,
              breath:{cd:3,dice:[4,6],dc:13}},
  }[kind];
  return {...F, team:1, r, c, hp:F.hp, maxFoeHp:F.hp, alive:true, cd:0, figSeed:(Math.random()*1e9)|0};
}
const ROOMS_SPEC=[
 {title:"The Emberdeep — Rat Warrens", doorType:"arch", doorLabel:"→ Bone Gallery",
  features:["puddle","puddle","grate","crack","moss","column","crack"],
  spawn:()=>[foe("rat",1,2),foe("rat",1,5),foe("rat",2,3),foe("goblin",1,4),foe("goblin",2,6)]},
 {title:"The Emberdeep — Bone Gallery", doorType:"open", doorLabel:"→ Ashwing's Hoard",
  features:["column","column","pit","crack","crack","moss","grate"],
  spawn:()=>[foe("skeleton",1,2),foe("skeleton",1,5),foe("skeleton",2,6),foe("wight",1,4)]},
 {title:"The Emberdeep — Ashwing's Hoard", doorType:"stairsUp", doorLabel:"↑ Daylight",
  features:["firepit","firepit","column","crack","moss","puddle"],
  spawn:()=>[foe("dragon",1,4),foe("kobold",2,2),foe("kobold",2,6)]},
];

export {
  d, d20, mod, fm, makeHero, XP_NEXT, gearSum, atkBonus, dmgBonus, acOf, maxHp, dmgDice, ITEM_POOL, rollLoot, foe, ROOMS_SPEC
};
