# Hex RPG — Game Design Document

> **Working title:** Dungeon Pals (v2 lineage)
> **Genre:** Party auto-battler / theorycraft RPG with idle & PvP layers
> **Platform:** Mobile-first web (portrait), zero-install, later PWA
> **Status:** Living design doc. Confirmed decisions are marked ✅; open items are marked 🔶.

---

## 1. Vision & Pillars

A **strategy-first auto-battler**. The player does not click attacks — they **build** a party and a plan, then watch it play out. The depth is in **theorycrafting**: stat optimization, gear combinations, skill rotations, and party composition.

**Design pillars**
1. **Theorycraft over twitch.** Every meaningful decision happens *before* the fight — gear, skills, priority order, party makeup.
2. **Loot is the engine.** Deeply randomized, data-driven gear with meaningful trade-offs drives the chase.
3. **Readable systems.** Numbers and effects are transparent so players can reason about and optimize them.
4. **Own art identity.** A procedural, hand-inked visual engine — no stock assets, fully expandable.
5. **Respect offline time.** Progress continues while away; sessions are short and rewarding.

---

## 2. Core Combat Model ✅ (stat-based %)

We **replace the prototype's D&D d20 system** with a deterministic, stat-driven model built for optimization.

### 2.1 Character Stats (the six)
| Stat | Symbol | Role |
|---|---|---|
| **HP** | `hp` | Health pool. Unit dies at 0. |
| **Attack** | `atk` | Scales outgoing damage. |
| **Defense** | `def` | Mitigates incoming damage (diminishing curve). |
| **Dodge** | `dodge` | **Rating** for avoiding a hit. Effective chance is derived by contesting the rating against the attacker's level (§2.2). |
| **Crit** | `crit` | **Rating** for landing a critical hit (`× critMult`). Effective chance is derived by contesting against the target's level (§2.2). |
| **Attack Speed** | `aspd` | Governs how often the unit acts (action cadence). |

**Dodge and Crit are ratings, not raw percentages.** Storing them as scores (contested against the opponent) — rather than flat % — is what keeps combat balanceable across the whole level/gear curve:
- **No hard caps:** ratings stack without ever reaching a literal 100%; the derived chance soft-caps naturally via the formula.
- **Level-relative:** the same rating yields high avoidance/crit vs weaker foes and low vs stronger ones, so high-level content self-balances instead of needing per-enemy % tuning.
- **Clean gear rolls:** items grant integer amounts ("+12 Dodge") that always feel additive.
- **One tuning knob:** a single curve constant per stat in `balance.js` retunes the whole game.
This mirrors how **Defense** already works (`x/(x+…)` diminishing returns), so all three chance/mitigation stats share one consistent shape. The UI always shows the **derived effective %** against the current target.

**Hidden / derived (not core-six, sourced from gear procs & skills):**
- `critMult` (base ×1.5) — crit damage multiplier; raised by procs/skills.
- `lifesteal%`, elemental/DoT proc magnitudes, buff/debuff values.

### 2.2 Action economy
- **Combat is continuous, not turn-based.** There are no discrete global rounds — the battle flows in real time and every unit acts **independently on its own attack-speed cadence**. A high-`aspd` unit simply acts more often. This is the whole reason Attack Speed is a stat, and it keeps the fight visually continuous rather than a stop-start exchange.
- Combat is a **fixed-timestep simulation** on a grid (inherits the prototype's 8×11 board and Manhattan movement).
- Each unit has an **action timer**; interval = `BASE_INTERVAL / aspd`. When it fires, the unit takes **one action** — timers run in parallel, so actions interleave smoothly.
- An action = resolve the unit's **skill priority list** (§4): fire the first eligible skill, else a **basic attack**.
- Ranged units act at range; melee units path toward the nearest valid target first.

### 2.3 Damage resolution (per hit)
```
0. Derive chances from ratings (contested against opponent level):
     dodgeChance = dodge / (dodge + K_dodge * attacker.level)
     critChance  = crit  / (crit  + K_crit  * target.level)
     (both clamped to a soft floor/cap, e.g. 0%..75%)
1. Dodge check:   rand() < dodgeChance          → AVOIDED (0 dmg, "dodge")
2. Base damage:   dmg = skill.base * atkScale(attacker.atk)
3. Crit check:    rand() < critChance           → dmg *= critMult   (crit)
4. Mitigation:    dmg *= 100 / (100 + target.def)   // smooth diminishing returns
5. Floor:         dmg = max(1, round(dmg))
6. Apply procs (lifesteal, burn, etc.)
```
All tunables (`atkScale`, `critMult`, `K_dodge`, `K_crit`, dodge/crit clamps, mitigation curve) live in `data/balance.js` — no magic numbers in code. Contesting dodge against the *attacker's* level and crit against the *target's* level is what makes both scale correctly with progression. 🔶 Exact constants pending balance passes; the opposing term can later become an explicit `accuracy`/`resilience` stat instead of raw level if fights need finer control.

### 2.4 Determinism
All randomness flows through a **seeded RNG** (mulberry32, already in the prototype). Same seed + same inputs ⇒ identical battle. This is mandatory for **fair async PvP** and **server-side verification** later.

---

## 3. Classes ✅ (fighter / mage / rogue / cleric)

Four base classes. Each defines: base stats, per-level growth, allowed gear types, a native **skill pool**, and (future) a **skill tree** for specialization (§4.1). **All four are implemented** (the "fighter" ships as **Knight** in code/UI): Knight, Mage, Cleric, and **Rogue** (nimble skirmisher — high dodge/crit, twin daggers, starts in a Leather Vest; native gear: dagger, kris, shortbow, cloak). Rogue-restricted loot rolls through the same `LootGenerator` class filter as the others.

| Class | Fantasy | Stat lean | Role |
|---|---|---|---|
| **Fighter** | Frontline bruiser | High HP / DEF, melee ATK | Soak & hold the line; taunt/guard skills |
| **Mage** | Glass cannon | High ATK, AoE; low HP/DEF; ranged | Burst & crowd damage; elemental procs |
| **Rogue** | Skirmisher | High DODGE / ASPD / CRIT; single-target | Burst priority targets, utility (poison/bleed) |
| **Cleric** | Support / divine | High HP / WIS-flavored; mid ATK | Healing, party buffs, and enemy debuffs |

**Cleric** is a full support class — it can lean toward **healing/buffs** to keep the party alive, or toward **combat/debuffs** to bend fights. Which way a given cleric goes is a **skill-tree** choice (§4.1), and is the flagship example of the theorycraft the game is built around.

---

## 4. Skills & Priority Rotation ✅ (cooldown + priority list, no mana)

- Every hero has a **basic attack** (always available) + up to **4 skill slots**.
- Each skill has: `id, name, class, targetRule, condition, cooldown, effect, scalingStat, upgradeLevel`.
  - **targetRule:** nearest enemy, lowest-HP enemy, lowest-HP% ally, self, all enemies, all allies, random enemy…
  - **condition:** gate for firing — e.g. `always`, `ally.hp% < 50`, `enemies >= 3`, `self.hp% < 30`, `target.hasDebuff(x)`.
  - **effect:** damage (mult of scaling stat), heal, buff, debuff, DoT, shield, AoE, summon (future 🔶).
- **Priority list:** the player **orders** their skills. On each action the engine walks the list top→down and fires the **first skill whose cooldown is ready and condition is met**; if none, basic attack. (Feature 3.)
- **Upgrades:** skills level up (stronger effect / lower cooldown / added rider) via **skill points** (from leveling) and/or materials. Diminishing per level. (Features 1 & 2.)
- No mana/energy — the knobs are **cooldown, condition, and order**. This is the heart of the theorycraft.

### 4.1 Skill Trees & Specialization 🔶 (future depth)

Each class owns a **skill tree**: a branching set of skills and passives the player unlocks with skill points as they level. Trees let two heroes of the same class play completely differently — the core of long-term theorycraft.

- **Branches** within a tree pull toward different roles; investing deeply in one branch (and its capstone) means investing less elsewhere — meaningful opportunity cost.
- Points are **respec-able** (for a cost 🔶) so builds can be experimented with.
- Trees feed the **priority list** (§4): specialization changes *which* skills you have to order, not just their numbers.

**Flagship example — the Cleric:**
| Branch | Focus | Playstyle it enables |
|---|---|---|
| **Devotion** | Party buffs & healing | Keep a fragile glass-cannon party alive; enable aggressive comps |
| **Wrath** | Combat & debuffs (smites, curses, armor-break) | Turn the cleric into a damage/control piece that bends the fight |

The same pattern applies to every class (e.g. Fighter: *Guardian* tank vs *Berserker* damage; Mage: *Elementalist* AoE vs *Arcanist* single-target burst; Rogue: *Assassin* burst vs *Trickster* evasion/utility). 🔶 Exact trees are designed per-class in a later phase; the data model reserves space for them now.

---

## 5. Progression

- **XP & Levels:** kills grant shared party XP (prototype behavior, generalized). Level cap removed; XP curve is formula-driven in `data/xp-curve.js`.
- **On level-up:** class-based stat growth + skill point(s).
- **Skill points:** spent to unlock/upgrade skills.
- **Main hero** is created by the player — **implemented**: splash → guest login → pick class → **roll stats** (seeded, re-rollable) → **roll portrait** → name. (Feature 1; skills come with Phase 3.)
- **Companions** are randomly generated recruits (see §7).
- **Starting kit:** every character (main + companions) begins with basic armor (wooden for martial, cloth for casters) and worn boots equipped.

---

## 6. Loot System ✅ (data-driven, procedural)

Every item is composed of **Prefix + Material + Gear Type + Upgrade Level**, and is **class-specific**. (Feature 9.)

```
[Prefix]  [Material]  [Gear Type]  (+UpgradeLevel)
  Icy       Iron         Sword         (+2)      → "Icy Iron Sword (+2)"
  —         Silk         Slippers       —        → "Silk Slippers"
  Vampiric  Dragonhide   Shield         —        → "Vampiric Dragonhide Shield"
```

### 6.1 The three component tables (each grants exactly one stat) ✅ (implemented)
> Live in `data/items/{prefixes,materials,gearTypes}.js`; `systems/LootGenerator.js` composes them into drops. Names read `[Prefix] [Material] [Type]` (e.g. *Sturdy Meteoric Wand*), class-restricted, colour-graded by the rarest component. The `lifesteal` proc is wired; `+N` upgrade levels and more procs are still ahead.

- **Gear Type** — defines the **slot**, the **class** it serves, one stat bonus, and (weapons) a **range**.
  - *Weapon types:* sword, greatsword (knight, melee); wand, staff (mage, **ranged**); mace, scepter (cleric, melee); dagger, kris (rogue, melee), shortbow (rogue, **ranged**).
  - **Range is weapon-driven** (`StatEngine.derive`): equip a **ranged** weapon and the hero attacks/animates at range (projectile FX); a **melee** weapon (or an unarmed hero) fights up close. Unarmed heroes fall back to their class's innate range, so a fresh mage still casts at range. A rogue is melee with daggers but turns **ranged the moment they equip a shortbow**.
  - **Ranged units kite** (`act()`): they close to firing range, shoot while a safe buffer holds, and **back off a step when a foe closes to melee** (`BAL.KITE_MIN`) — the classic attack/retreat dance. Cornered (no farther cell), they stand and fight. Melee units simply chase and strike.
  - *Wearable types:* helm, chest, gloves, boots, cloak, ring, amulet, shield.
- **Material** — defines **base stats**; carries one stat bonus and may carry a **drawback**.
  - *Weapon materials:* iron, steel, meteoric, emberglass… (e.g. *meteoric*: +ATK, −ASPD). **Better materials have a lower drop rate.**
  - *Wearable materials:* cotton, silk, leather, dragonhide… (e.g. *dragonhide*: +DEF, +HP). **Better materials have a lower drop rate.**
- **Prefix** — defines a **proc** (special effect) + one stat bonus. `normal` = no proc (the most common roll); **stronger procs have a lower drop rate**.
  - e.g. *fiery* (burn DoT), *icy* (slow/chill), *vampiric* (lifesteal), *keen* (+crit).

Item's total stats = prefix bonus + material bonus + gear-type bonus + upgrade bonuses. **Benefits *and* drawbacks** emerge from materials/prefixes carrying negative modifiers. (Feature 9.)

### 6.2 No rarity tiers — quality is emergent ✅
There are **no labeled rarity tiers** (no common/rare/epic/legendary). Loot is a **random drop**: each item is an independent roll of prefix + material + gear type. **Better materials and stronger procs simply drop less often**, so a powerful item is one where scarce components happened to roll together. An item's power reads directly from its **components + upgrade level** (`+1`, `+2`, … via runic gems, §6.3) — not from a tier badge. Drop weights live in the component tables / `data/lootTables.js`; changing a weight changes how often that component appears. (UI may still tint an item by its best component for readability, but that's cosmetic, not a mechanical tier.)

### 6.3 Forge — gem upgrades ✅ (Feature 10) — implemented
- **Runic gems** are rare drops (`BAL.GEM_CHANCE`, bosses almost always drop one).
- Spend a gem to attempt **+1 to the item's primary stat** (raises `upgradeLevel`; name shows `+N`).
- **Diminishing success** as level rises; on failure, a growing **chance the item shatters** — all odds per level in `data/balance.js` (`FORGE.SUCCESS` / `FORGE.DESTROY` / `FORGE.STEP`). Logic in `systems/ForgeSystem.js` (pure).
- Now a **dedicated Forge service** at the Keep (`ui/ForgeScreen.js`) — the **Runic Anvil**: seat a piece of gear, see its **success chance** + the exact **stat delta** and shatter risk for the next `+`, then **Fuse Gem** to attempt it (one gem each). The gear list spans every hero's equipped gear + the shared bag, filterable by **owner** (a portrait chip per hero + a Bag chip) and by **gear slot**. The character/gear panel no longer forges — it's town-only. Reached via the **Forge** service button (anvil icon).

---

## 7. Party & Companions ✅ (main + up to 3)

- **Party = 3 slots:** the player's **main hero** + up to **2 companions** ("two companions only", `PARTY_CAP`). (Feature 2.) The player **starts solo** after character creation and **recruits companions at the Tavern** (starting silver covers two Lv-1 hires). When a companion **falls**, the Tavern lets you **hire a fresh recruit to take their place** (a level-1 replacement) — the cheaper alternative to reviving your veteran at the Temple. The **main hero is marked with a crown** (battlefield tile, party HUD, Keep roster, tavern strip, character panel) and takes the **front-center** slot in the combat formation (companions flank) so the leader always reads at a glance.
- **Companions** are **randomly generated** (class, name, rolled stats, rolled portrait, starter gear) — **implemented** via the **Tavern** service (`ui/TavernScreen.js`, `models/makeCompanion`): hire for silver, refresh the recruits, party caps at 4 (main + 3). The player **starts with silver to hire two** (`BAL.STARTING_SILVER`). Recruits **scale to the main hero's level**, and the **hire fee scales with recruit level** (`HIRE_BASE + level*HIRE_PER_LEVEL`), so higher-level pals cost more as you grow.
- Companions **earn XP and loot**, are **equippable**, and the player chooses **which of their skills to upgrade**. (Feature 2.)
- Heroes are **not permanently deleted**, but death carries a real penalty (§7.1). A **roster cap** limits benched companions (expandable — monetization hook).

### 7.1 Death & Loss ✅ (roguelite stakes)
Both the main hero and companions **can die**. A **party wipe** ends the run with real consequences — this is what gives combat and gearing weight:
- **Lost:** every **item the party was carrying** — all equipped gear *and* run inventory. You come back stripped to nothing.
- **Kept:** each hero themselves and all of their **progression — XP, level, stats, and skills**. Death is *"almost start fresh,"* not a wipe of who your heroes are.
- **Safe:** anything in the **Bank** — items and silver — survives. Banking valuables before a risky delve becomes a core strategic decision, and gives the Bank a real purpose.

Individually downed heroes in a fight the party still **wins** are revived at run's end with **no loss** — only a **full party wipe** strips carried items. This turns each dungeon into a risk/reward push: press deeper for better drops, or bank your haul and retreat.

**Current model (pre-Bank):** on a party wipe you're sent back to **the Keep**. The **main hero auto-revives for free** (partial HP — *"You awaken at the Keep"*), but **fallen companions stay dead** until you pay to raise them at the **Temple** (`ui/TempleScreen.js`). The **resurrection fee scales with the companion's level** (`BAL.TEMPLE: RESURRECT_BASE + level*RESURRECT_PER_LEVEL`), so keeping a high-level pal alive is a real silver cost. The item-loss penalty (§7.1, above) activates once the **Bank** exists to hold death-safe valuables.

🔶 **Open:** on a wipe, does the party keep **silver carried on hand**, or only banked silver? *Default assumption: on-hand silver is kept — only carried **items** are lost.*

---

## 8. Meta Structure & Screens

### 8.1 Keep / Town hub ✅ (Feature 6) — implemented
**Save slots:** after guest login the player picks one of **three save slots** (`state/save.js`, `ui/Onboarding.js`) — an empty slot starts character creation, a filled slot shows the main hero + party summary and loads directly. A save is a plain-JSON snapshot (party, currencies, bag, room); heroes carry their portrait/figure **seeds**, so all art regenerates on load and nothing non-serializable is stored. The run auto-saves to its slot on returning to the Keep and after every town transaction. Slots can be deleted from the picker.

The game **boots into the Keep**, not a fight. The hub shows the party (tap a hero to manage gear/forge), currency (💰 silver, 💎 gems), and services; **Descend** enters the dungeon and 🏠 returns. The **Shop** is live (buy/sell gear priced by `systems/Economy.js`, reroll stock, trade silver for gems); **Bank** is a stub. The single currency is **silver**. Home screen with services:
| Service | Function |
|---|---|
| **Shop** | Buy/sell gear, consumables, gems (rotating stock). |
| **Bank** | Store silver & items; the only **death-safe** vault (§7.1); stash tabs (extra tabs = monetization 🔶). |
| **Forge** | Gem upgrades (§6.3). |
| **Tavern** | Hire randomly-generated companions. |
| **Barracks/Roster** | Manage party & bench; view/equip characters. |
| **Arena** | PvP entry (§9). |
| **World Map** | Depart to dungeons. |

Keep-level upgrades (unlock/boost services) are 🔶 future.

### 8.2 Character & Inventory ✅ (Features 13, 14)
- **Character screen (implemented):** tap a hero → six stats, **8 gear slots** (weapon, offhand, helm, armor, gloves, boots, ring, amulet), and the bag. Equip/unequip/forge in place. **Tap a slot to filter** the bag to that slot; bag items show a **▲** hint when they'd upgrade the hero (score-based, `Equipment.isUpgrade`). Currency (💰 silver, 💎 gems) shown here and in a small HUD.
- **Full inventory screen:** grid management, sort, side-by-side compare, sell — still ahead.

### 8.3 World Map & Dungeons ✅ (Features 11, 12)
- **World map:** node graph of dungeons/regions, gated by level/progression/keys. Future open-world hunting areas 🔶.
- **Dungeons:** **procedurally generated** rooms from a **dungeon config** (data-driven):
  - `theme, levelRange, enemyPool, lootBias, boss, roomCount, palette/tileset, npcTypes`.
  - Low-level dungeons → rats/kobolds, a weaker drop pool, easier boss. Higher-level dungeons scale enemy stats **and** bias drops toward better materials/procs (via `data/lootTables.js` weights) — deeper delves = better *odds*, still no rarity tiers.
  - **Themes/regions** reskin enemies, loot bias, and visual styling for a distinct feel.

### 8.4 Skill Priority screen ✅ (Feature 3)
Drag-to-order each hero's skill rotation; set per-skill conditions.

### 8.5 Map loop — endless farm + optional advance ✅ (implemented)
The battle map is a **continuous farm**, not a one-shot room clear:
- **Stay as long as you like.** When a wave is cleared, a fresh wave respawns after a short delay — the fight never forces you onward.
- **Enemies spawn at random spots** across the upper room each wave, so no two waves line up the same way.
- **Loot drops into your bag mid-combat.** Slain foes have a drop chance (bosses always drop); items fall straight into a shared **inventory** (no more "pick 1 of 3" gate). Better materials/procs drop less often (§6.2).
- **Rally flag.** Tap the floor to plant a rally point; pals with **no foe engaged** regroup on it — a light-touch way to steer positioning between waves. (Full formation/command control is a later pass.)
- **Tap a hero** to open a stats + gear panel; equipping/unequipping is done here. Opening any panel **fully freezes** the dungeon — combat, movement, and effects — and closing it resumes exactly where you left off. This freeze is **independent of the manual Fight/Pause button** (opening a panel no longer flips it), so theorycrafting never disturbs the run state.
- **Area →** advances to the next room (Rat Warrens → Bone Gallery → Ashwing's Hoard) when *you* choose; the world map (§8.3) generalizes this later.
- **On a party wipe** you're returned to **the Keep**: the **main hero auto-revives for free** at partial HP, while **fallen companions stay dead** until raised at the **Temple** for a level-scaled fee (§7.1). The roguelite item-loss penalty (§7.1) activates once the **Bank** exists to hold death-safe valuables.

---

## 9. Multiplayer ✅ (async PvP first; local-first seam)

- **PvP Arena (async snapshot):** the player's party — stats, gear, and skill priorities — serializes into a **battle snapshot**. Matchmaking pairs snapshots; the **deterministic sim** (§2.4) runs both parties head-to-head. Client-side now (local "ghost" opponents from generated snapshots), **server-authoritative later**. Ladder/ELO + rewards. (Feature 4.)
- **Co-op dungeons:** 🔶 future.
- All net access is behind a **`NetService`** interface — mocked locally today, swapped for a real backend with **no gameplay rewrites**.

---

## 10. Persistence, Slots & Offline

### 10.1 Save slots ✅ (Feature 5)
- Multiple **game slots** = independent profiles (separate parties/progress). 1–2 free; more **paid** (monetization).
- All state serializes to JSON behind a **`SaveService`** (localStorage now → cloud later).

### 10.2 Offline progression ✅ (Feature 7)
- On load, compute elapsed time since last save, **capped at 8h** (free). Simulate idle rewards (runs/resources) over that window and present an **offline earnings** summary.
- Extended caps (**24h / 48h**) are a monetization hook.
- ⚠️ Client-side offline sim is **clock-exploitable** — acceptable for MVP; **server-authoritative time** closes it later (`TimeService` seam).

---

## 11. Monetization (design-in, don't build yet) 🔶

Hooks reserved (all behind feature flags, no store in MVP):
- Extra **game slots**.
- Extended **offline cap** (24/48h).
- Extra **bank/stash tabs**.
- Premium **companion hires** / roster expansion.
- Cosmetics. **No pay-to-win on raw power** is the guiding constraint.

---

## 12. Art / Asset Engine ✅ (Feature 16)

Keep the prototype's **procedural, seeded, hand-inked engine** (portraits, creatures, tiles, fx). It is deterministic, cache-friendly, asset-free, and expandable. Wrapped as a rendering module; individual generators can later be swapped for authored art per-entity without touching game logic.

**No emoji — everything is a sprite.** All UI/status/currency glyphs are drawn procedurally in the same ink style by `engine/icons.js`, and **gear has visual identity** via `engine/gearIcon.js` — an item's icon is composed from its **gear type** (shape), **material** (palette), **prefix** (accent), and **forge level** (rim), matching the loot generator. Both are cached (canvas + data-URL) and used across the HUD, shop, tavern, character panel, onboarding, and the in-battle role medallions.

---

## 13. Feature Coverage Map

| # | Feature | Section | Status |
|---|---|---|---|
| 1 | Main character: name, stats, skills, upgrades | §3–5 | ✅ |
| 2 | Hire/equip/upgrade random companions | §7 | ✅ |
| 3 | Skill priority ordering | §4, §8.4 | ✅ |
| 4 | Multiplayer PvP arenas (co-op later) | §9 | ✅ async / 🔶 co-op |
| 5 | Multiple game slots (monetization) | §10.1 | ✅ |
| 6 | Keep/Town hub with services | §8.1 | ✅ |
| 7 | Offline progression (8h; 24/48h paid) | §10.2 | ✅ |
| 8 | Auto-battler; strategy/theorycraft | §1–2, §4 | ✅ |
| 9 | Data-driven random loot (prefix+material+type+level) | §6 | ✅ |
| 10 | Forge gem upgrades (diminishing, destruction) | §6.3 | ✅ |
| 11 | World map → dungeons (open world later) | §8.3 | ✅ / 🔶 open-world |
| 12 | Procedural themed dungeons w/ gating | §8.3 | ✅ |
| 13 | Inventory management | §8.2 | ✅ |
| 14 | Character view + gear swap | §8.2 | ✅ |
| 15 | Stats: atk/def/dodge/crit/aspd/hp | §2.1 | ✅ |
| 16 | Expandable asset engine | §12 | ✅ |

---

## 14. Open Questions / To-Decide 🔶

1. ~~Dedicated healer/support class~~ — **resolved:** Cleric is a core class (§3).
2. ~~Crit as a stat vs proc-only~~ — **resolved:** Crit is a first-class stat (§2.1).
3. ~~Rarity tiers~~ — **resolved:** no tiers; random drops, better components drop less often, power via components + upgrade level (§6.2).
4. ~~Permadeath~~ — **resolved:** party wipe strips all carried items but keeps XP/stats/skills; Bank is death-safe (§7.1).
5. **Damage-formula constants** — needs a balance pass (placeholders in `balance.js`).
6. **Live PvP / co-op** — async only for now; realtime is a later backend decision.
7. **Skill-tree respec cost** — free experimentation vs silver/material sink (§4.1).
8. **On-wipe silver** — keep silver carried on hand, or only banked silver? (default: keep on-hand; §7.1).
9. **Energy/stamina** gating on dungeon runs? (Not in the feature list — omitted unless desired.)
10. **Consumables** (potions, scrolls) — in scope? Implied by Shop; needs a small spec.

See `docs/ARCHITECTURE.md` for the technical realization and the phased build roadmap.
