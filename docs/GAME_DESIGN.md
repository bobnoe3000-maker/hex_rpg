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

Four base classes. Each defines: base stats, per-level growth, allowed gear types, a native **skill pool**, and (future) a **skill tree** for specialization (§4.1). **All four are implemented** as **Fighter, Mage, Cleric, and Rogue** (rogue: nimble skirmisher — high dodge/crit, twin daggers, starts in a Leather Vest; native gear: dagger, kris, shortbow, cloak). Rogue-restricted loot rolls through the same `LootGenerator` class filter as the others. **Knight** is reserved as a future **skill-tree specialization of the Fighter**, not a base class.

**Armour families.** Each class wears one armour family, enforced at equip time (`Equipment.canEquip`) and at drop time (`LootGenerator`): **Fighter → metal**, **Rogue → leather**, **Mage & Cleric → cloth**. A gear type's `fam` selects both which materials can roll (a Plate only rolls metals — no more "Cotton Mail") and who can wear it. Weapons and jewellery have no family and gate by `use`. Materials are grouped into matching categories — `weapon` (atk/crit), `metal` (def/hp), `leather` (dodge/def), `cloth` (hp/dodge/crit), and `trinket` (mixed, for rings & amulets).

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

### 4.1 Skill Trees & Specialization ✅ (all four classes shipped)

Each class owns a **skill tree**: a branching set of skills and passives the main hero unlocks with skill points as they level. Trees let two heroes of the same class play completely differently — the core of long-term theorycraft. **All four classes implemented** (`data/skills.js`, `systems/Skills.js`, Skills tab in the character panel): **Fighter** (Onslaught / Bulwark), **Mage** (Evocation / Warding), **Cleric** (Judgment / Sanctuary), **Rogue** (Assassination / Shadow). Actives run through a small set of shared archetypes — single-target nuke, AoE nova, heal (self/party), and self/party buffs & shields — plus control riders (slow, stun, armor-shred, burn) layered on top.

- **Two branches per class**, one **offensive** and one **defensive**, of **13 skills each** (5 tiers: 3·3·3·3 + a capstone). 4 classes → 104 skills.
- **Active or passive.** Passives fold into `StatEngine.derive` (flat + missing-HP multipliers) and per-hit `combatMods` (Executioner, Crushing Blows, Bulwark, Bloodthirst). Actives are cast by the battle AI on cooldown when their trigger fits (`Skills.activeSkills` + the game's `tryCast`) — Cleave, Sunder, Whirlwind, Rampage, Guard, Taunt, Shield Bash, Rallying Cry, and the capstones, all driven through a unified **timed-buff system** (shields, stuns, DEF shred, party auras, immunity, bleeds).
- **Ranks 1→5**, breakpoints at 3 and 5. **1 skill point per level** (separate from stat points, from level 2). **Tier gates** (0·2·6·12·20 points-in-branch) make deep investment a real cost.
- **Draft → Confirm.** Allocating points is a pending draft (add/remove freely, live preview); **Confirm** commits and saves. Committed ranks can't be pulled back for free — **resetting the tree costs silver** (`BAL.SKILL_RESPEC`: base + per-point) and refunds every point, so respec is a deliberate, priced choice.
- **Companion loadouts ✅ (Phase 3).** Every auto-generated companion ships a **seed-rolled, class-appropriate kit of exactly 2 active + 3 passive skills** (`Skills.rollCompanionSkills`), drawn from the tiers their level can plausibly reach and set to a level-scaled rank. Because it's seeded, re-rolling the Tavern is a real hunt for the loadout you want — recruiting is a build choice. The kit auto-casts in battle through the same `tryCast`/timed-buff path as the main hero (no combat code is companion-specific), and is surfaced read-only in the **Tavern** recruit rows and the character panel (`Skills.heroKit`). Companion kits are fixed (no point spend) — only the main hero allocates.

**Flagship example — the Cleric:**
| Branch | Focus | Playstyle it enables |
|---|---|---|
| **Devotion** | Party buffs & healing | Keep a fragile glass-cannon party alive; enable aggressive comps |
| **Wrath** | Combat & debuffs (smites, curses, armor-break) | Turn the cleric into a damage/control piece that bends the fight |

The same pattern applies to every class (e.g. Fighter: *Guardian* tank vs *Berserker* damage; Mage: *Elementalist* AoE vs *Arcanist* single-target burst; Rogue: *Assassin* burst vs *Trickster* evasion/utility). 🔶 Exact trees are designed per-class in a later phase; the data model reserves space for them now.

---

## 5. Progression

- **XP & Levels:** kills grant shared party XP (split among the living). **No level cap** — the XP curve is formula-driven (`engine/combat.js`: `xpToReach(L) = 10·(L²−1)`, keeping the classic early pacing L2=30, L3=80 and scaling forever). **Implemented.**
- **On level-up (main hero):** **no automatic stat growth** — each level grants **assignable stat points**, starting at **level 2** (a fresh level-1 hero has none). Rate (`BAL.POINTS`): **3/level up to L50, 2 up to L100, then 1**. The player spends them in the character panel's **Stats tab** (add/remove with a live preview, then **Confirm**); one point = **+4 HP** or **+1** to any other stat (`STAT_STEP`). Points live on the hero as `pts{}` and feed `StatEngine.derive`; the available pool is `earnedPoints(level) − spent` (summed from L2). `systems/Leveling.js` (pure). **Implemented.**
- **On level-up (companions):** keep the **fixed per-class growth block** in `data/classes.js` (no point allocation) — they auto-scale so the player only micromanages the main hero. **Implemented.**
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
  - *Weapon types:* sword, greatsword (fighter, melee); wand, staff (mage, **ranged**); mace, scepter (cleric, melee); dagger, kris (rogue, melee), shortbow (rogue, **ranged**).
  - **Range is weapon-driven** (`StatEngine.derive`): equip a **ranged** weapon and the hero attacks/animates at range (projectile FX); a **melee** weapon (or an unarmed hero) fights up close. Unarmed heroes fall back to their class's innate range, so a fresh mage still casts at range. A rogue is melee with daggers but turns **ranged the moment they equip a shortbow**.
  - **Ranged units kite** (`act()`): they close to firing range, shoot while a safe buffer holds, and **back off a step when a foe closes to melee** (`BAL.KITE_MIN`) — the classic attack/retreat dance. Cornered (no farther cell), they stand and fight. Melee units simply chase and strike.
  - *Wearable types:* helm, chest, gloves, boots, cloak, ring, amulet, shield.
- **Material** — defines **base stats**; carries one stat bonus and may carry a **drawback**.
  - *Weapon materials:* iron, bronze, steel, meteoric, obsidian, emberglass… (e.g. *meteoric*: +ATK, −ASPD). **Better materials have a lower drop rate.**
  - *Armour materials, by family:* **metal** — iron, bronze, steel, mithril, adamant (fighter); **leather** — leather, padded, studded, wyvernhide, dragonhide (rogue); **cloth** — cotton, linen, silk, wool, runeweave (mage/cleric). A gear type only rolls materials from its own family, so pairings always read sensibly.
  - *Trinket materials* (rings & amulets): copper, silver, jade, gold, onyx, ruby — small mixed bonuses.
- **Prefix** — defines a **proc** (special effect) + one stat bonus. `normal` = no proc (the most common roll); **stronger procs have a lower drop rate**.
  - e.g. *fiery* (burn DoT), *icy* (slow/chill), *vampiric* (lifesteal), *keen* (+crit).

Item's total stats = prefix bonus + material bonus + gear-type bonus + upgrade bonuses. **Benefits *and* drawbacks** emerge from materials/prefixes carrying negative modifiers. (Feature 9.)

### 6.2 No rarity tiers — quality is emergent ✅
There are **no labeled rarity tiers** (no common/rare/epic/legendary). Loot is a **random drop**: each item is an independent roll of prefix + material + gear type. **Better materials and stronger procs simply drop less often**, so a powerful item is one where scarce components happened to roll together. An item's power reads directly from its **components + upgrade level** (`+1`, `+2`, … via runic gems, §6.3) — not from a tier badge. Drop weights live in the component tables / `data/lootTables.js`; changing a weight changes how often that component appears. (UI may still tint an item by its best component for readability, but that's cosmetic, not a mechanical tier.)

### 6.3 Forge — gem upgrades ✅ (Feature 10) — implemented
- **Runic gems** are rare drops (`BAL.GEM_CHANCE`, bosses almost always drop one).
- Each attempt costs **runic gems AND silver**, both **rising with the item's current upgrade level** (`FORGE.COST`: gems = `1 + ⌊level/3⌋`, silver = `20 + level·15`) — so pushing a `+8` item further is a real gem-and-silver sink, not just a gem each.
- Spend the cost to attempt **+1 to the item's primary stat** (raises `upgradeLevel`; name shows `+N`).
- **Diminishing success** as level rises; on failure, a growing **chance the item shatters** — all odds per level in `data/balance.js` (`FORGE.SUCCESS` / `FORGE.DESTROY` / `FORGE.STEP` / `FORGE.COST`). Logic in `systems/ForgeSystem.js` (pure).
- A **dedicated Forge service** at the Keep (`ui/ForgeScreen.js`) — the **Runic Anvil**: seat a piece of gear, see its **success chance**, the exact **stat delta**, the shatter risk, and the **gem + silver cost** for the next `+`, then **Fuse Gem** (disabled unless you can afford both). The gear list spans every hero's equipped gear + the shared bag, filterable by **owner** (a portrait chip per hero + a Bag chip) and by **gear slot**. The character/gear panel no longer forges — it's town-only. Reached via the **Forge** service button (anvil icon).

---

## 7. Party & Companions ✅ (main + up to 3)

- **Party = 3 slots:** the player's **main hero** + up to **2 companions** ("two companions only", `PARTY_CAP`). (Feature 2.) The player **starts solo** after character creation and **recruits companions at the Tavern** (starting silver covers two Lv-1 hires). When a companion **falls**, the Tavern lets you **hire a fresh recruit to take their place** (a level-1 replacement) — the cheaper alternative to reviving your veteran at the Temple. The **main hero is marked with a crown** (battlefield tile, party HUD, Keep roster, tavern strip, character panel) and takes the **front-center** slot in the combat formation (companions flank) so the leader always reads at a glance.
- **Companions** are **randomly generated** (class, name, rolled stats, rolled portrait, starter gear) — **implemented** via the **Tavern** service (`ui/TavernScreen.js`, `models/makeCompanion`): hire for silver, refresh the recruits, party caps at 4 (main + 3). The player **starts with silver to hire two** (`BAL.STARTING_SILVER`). Recruits **scale to the main hero's level**, and the **hire fee scales with recruit level** (`HIRE_BASE + level*HIRE_PER_LEVEL`), so higher-level pals cost more as you grow.
- Companions **earn XP and loot** and are **equippable**. (Feature 2.)
- **Level-up roll ✅ (`ui/CompanionLevelUp.js`).** Companions **no longer auto-grow** on level-up — each level queues a **roll** the player resolves at the companion's portrait. It's a **slot-machine**: five stat reels (HP · ATK · DEF · Dodge · Crit) each spin down to **0–2 points** (HP points ×4, the rest ×1; folded into the companion's `pts`, applied through `StatEngine.derive`), and one **skill reel** lands on a single kit skill for **+1 rank**. Reels settle **left-to-right** with a decelerating cascade (skill last). You can **reroll for silver** — an **escalating cost** (`30·1.6ⁿ`, resets per level) — until you like it, then **Confirm** to bank it; nothing changes until you confirm. Multiple queued levels roll **one after another**. **Every roll is player-initiated — the first included:** the outcome is drawn only when you click **Roll** (the reels open blank), never pre-generated, and a drawn-but-unconfirmed roll persists so closing and reopening can't dodge the reroll cost. You reach it **by visiting the companion's character screen** — a **green dot** on their tiles (Keep · dungeon HUD · Tavern) and a **"Level-Up Roll — Roll!"** call-to-action on the Stats & Skills tab flag a pending roll; the roll never auto-opens or auto-applies. The main hero keeps its own point-buy (§8.2); this is companions-only.
- Heroes are **not permanently deleted**, but death carries a real penalty (§7.1). A **roster cap** limits benched companions (expandable — monetization hook).

### 7.1 Death & Loss ✅ (roguelite stakes)
Both the main hero and companions **can die**. A **party wipe** ends the run with real consequences — this is what gives combat and gearing weight:
- **Lost:** every **item the party was carrying** — all equipped gear *and* run inventory. You come back stripped to nothing.
- **Kept:** each hero themselves and all of their **progression — XP, level, stats, and skills**. Death is *"almost start fresh,"* not a wipe of who your heroes are.
- **Safe:** anything in the **Bank** — items and silver — survives. Banking valuables before a risky delve becomes a core strategic decision, and gives the Bank a real purpose.

Individually downed heroes in a fight the party still **wins** are revived at run's end with **no loss** — only a **full party wipe** strips carried items. This turns each dungeon into a risk/reward push: press deeper for better drops, or bank your haul and retreat.

**Current model (pre-Bank):** on a party wipe you're sent back to **the Keep**. **Every fallen hero — main and companions alike — is raised at the Temple** (`ui/TempleScreen.js`) for a **level-scaled fee** (`BAL.TEMPLE: RESURRECT_BASE + level*RESURRECT_PER_LEVEL`), so keeping a high-level hero alive is a real silver cost. **Safety net:** if the *whole* party falls (nobody left to earn silver), the **main hero wakes at the Keep for free** at partial HP, so a total wipe can never soft-lock the run — but a main who falls while pals still stand waits at the Temple like anyone else. The item-loss penalty (§7.1, above) activates once the **Bank** exists to hold death-safe valuables.

🔶 **Open:** on a wipe, does the party keep **silver carried on hand**, or only banked silver? *Default assumption: on-hand silver is kept — only carried **items** are lost.*

---

## 8. Meta Structure & Screens

### 8.1 Keep / Town hub ✅ (Feature 6) — implemented
**Save slots:** after guest login the player picks one of **three save slots** (`state/save.js`, `ui/Onboarding.js`) — an empty slot starts character creation, a filled slot shows the main hero + party summary and loads directly. A save is a plain-JSON snapshot (party, currencies, bag, room); heroes carry their portrait/figure **seeds**, so all art regenerates on load and nothing non-serializable is stored. The run auto-saves to its slot on returning to the Keep and after every town transaction. Slots can be deleted from the picker.

The game **boots into the Keep**, not a fight. The hub shows the party (tap a hero to manage gear/forge), currency (💰 silver, 💎 gems), and services; **Dungeons** opens the tiered descent board (§8.3) and 🏠 returns. The **Shop** is live (buy/sell gear priced by `systems/Economy.js`, reroll stock, trade silver for gems); **Bank** is a stub. The single currency is **silver**. Home screen with services:
| Service | Function |
|---|---|
| **Shop** | Three tabs — **Gear** (buy rotating stock, trade silver for gems), **Potions** (buy/sell every brew & size — §8.2 potion belt), **Sell** (bag gear). |
| **Bank** | Store silver & items; the only **death-safe** vault (§7.1); stash tabs (extra tabs = monetization 🔶). |
| **Forge** | Gem upgrades (§6.3). |
| **Tavern** | Hire randomly-generated companions. |
| **Barracks/Roster** | Manage party & bench; view/equip characters. |
| **Arena** | PvP entry (§9). |
| **World Map** | Depart to dungeons. |

Keep-level upgrades (unlock/boost services) are 🔶 future.

### 8.2 Character & Inventory ✅ (Features 13, 14)
- **Character screen (implemented):** tap a hero → six stats, **8 gear slots** (weapon, offhand, helm, armor, gloves, boots, ring, amulet), and the bag. Equip/unequip/forge in place. **Tap a slot to filter** the bag to that slot. Currency (💰 silver, 💎 gems) shown here and in a small HUD.
  - **Gear comparison ✅ (`Equipment.compareToEquipped`).** Every bag item shows **how it stacks up against what's equipped in its slot**: a one-word **verdict** pill (▲ Upgrade / ⇄ Sidegrade / ▼ Downgrade / ✦ New for an empty slot, from the same `itemScore` with a ~5% sidegrade band), **always-on stat-delta chips** (green gains / red losses / blue new keyword — proc, ranged, two-handed), and a tap-to-open **side-by-side** (Equipped → This → Δ). The comparison respects slot rules — a two-handed weapon is weighed against your weapon **and** the offhand it would free.
  - **Tabs:** the **main hero** panel has four tabs — **Stats** (with the level-up point-buy), **Skills** (the tree), **Gear**, **Potions**. A **companion** panel has three — **Stats & Skills** (their stats + read-only auto-cast kit), **Gear**, **Potions**.
  - **Unspent-point dots:** a gold dot marks the main hero's **character tiles** (Keep, dungeon HUD, Tavern) and the panel's **Stats / Skills tabs** whenever level-up or skill points are waiting to be spent; it clears as you allocate them (only the main hero earns spendable points).
  - **Potion belt ✅ (`data/potions.js`, `ui/potionChip.js`).** Every hero has a **potion slot** loaded with a stack (cap **99**) of one brew; the flask rides **below their portrait** (Keep, dungeon HUD) with its charge count. In battle the AI **auto-quaffs on the potion's cooldown** when the trigger fits — heals/shields below ~55% HP, stat brews when a fight is engaged — **consuming a charge** (a silver sink). **Seven brews:** Healing (instant HP), Regen (HoT), Aegis (shield), Might (+ATK), Ironhide (+DEF), Swiftdraught (+Speed), Fortune (+Crit) — all reusing the timed-buff engine. **Five sizes** (Tiny→Giant) scale the magnitude **and** buff duration, at a steeply rising price (8 → 280 silver). Buy/sell on the **Shop's Potions tab**; foes also **drop** potions (size weighted by dungeon tier). Manage the belt on its own **Potions tab** in the character panel. Save-compatible (additive `state.potions` + `hero.potion`).
- **Full inventory screen:** grid management, sort, side-by-side compare, sell — still ahead.

### 8.3 The Dungeons board & tiered descent ✅ (Features 11, 12) — implemented
The Keep's **Dungeons** button (was "Descend") opens the **Dungeons board** (`ui/DungeonSelect.js`) — a scrollable **ladder of ten tiered dungeons** climbing from the **Emberdeep** (Lv 1–10) to **Draconis Apex** (Lv 90–100). A **Continue** banner up top resumes the active delve in one tap; each rung shows its **level band**, **boss**, **loot floor**, and **recommended level**, with a status flag (**Cleared ✓ / In Progress / ✦ New / Locked**).

- **The ladder** (`data/dungeons.js`): 10 dungeons, each a 10-level band, each capped by a themed boss (Ashwing the Young, Malketh the Cold Lich, the Drowned King … Vurmalax the Elder Wyrm). All reuse the **seven shared room LAYOUTS** (shape / exits / blockers + an enemy composition of archetype figures) and re-skin them with a themed **roster** (each of the six figures renamed per theme), a **boss**, an accent colour, a **palette + tileset**, and a loot **power** — so we get ten distinct dungeons with no new floor geometry.
- **Distinct look per theme.** Each dungeon carries its own **floor-stone palette** and **decorative tileset** (`data/dungeons.js` → `dungeon.palette` / `dungeon.tiles`, threaded through `buildGameRoom` and the exit walls). Warm ember-brown Emberdeep, cold blue Frostmere, teal drowned Vael, olive Thornwild, rust Foundry/Wastes, pale Skyreach, white Rimeheart, violet-crystal Apex. Two new decorative tiles back this — **frost** (icy shards) and **crystal** (glowing gem shards) — alongside the existing ember/rune/bones/moss/mushroom/ash set.
- **Enemies scale to Lv 100.** Each dungeon carries a `baseLevel`; foes spawn at **baseLevel + room depth**, the boss at the band's top. `models/units.scaleEnemy` grows the six archetype baselines by `base·(1 + rate·(level−1))` (rates in `BAL.ENEMY_SCALE`), so the tile **level badge** drives real stats — a Lv 95 pack is a genuine wall while the Emberdeep stays a Lv 1 tutorial.
- **Bosses are normalized.** Every boss spawns from a single tuned block (`BAL.BOSS_BASE`) scaled to the band top, **not** from its figure's archetype — so a boss's difficulty is consistent across dungeons and the heavy dragon figure can't make a tier unwinnable.
- **Loot keeps pace.** A dungeon's tier feeds a **power** into `LootGenerator.generate`: rolled stat values scale up (`BAL.LOOT_POWER_STEP`), the **grade floor** rises (plain → fine → rare → epic as you climb), and drop rates bump per tier. Clearing a boss the **first time** grants a **guaranteed tier-appropriate drop** (floor lifted one grade) — the carrot for descending.
- **Balance pass.** `ENEMY_SCALE`, `LOOT_POWER_STEP`, and `BOSS_BASE` were tuned with a real combat simulator (`tests/balance.sim.mjs`, using the actual `derive`/`resolveAttack`) that pits a representative leveled-and-geared party against every tier. The curve is a gentle ramp — a fair fight that stays winnable but costly from Lv 1 to Lv 100, with the party keeping pace via level-up points + tier-scaled loot. Re-run it after any combat-math change: `node tests/balance.sim.mjs`.
- **Boss-clear gating.** A rung unlocks only once the **previous boss is defeated** (`isUnlocked` against `state.cleared`); tier 1 is always open. Cleared dungeons stay open to farm.
- **Save-compatible (v2).** `state.dungeonId` + `state.cleared[]` are additive; older saves default to the Emberdeep with an empty cleared set.

### 8.4 Skill Priority screen ✅ (Feature 3)
Drag-to-order each hero's skill rotation; set per-skill conditions.

### 8.5 Map loop — endless farm + optional advance ✅ (implemented)
The battle map is a **continuous farm**, not a one-shot room clear:
- **Open-floor rooms.** Each room is an irregular **island of stone over the void** — no bounding walls; the edge itself is the boundary, drawn with a **tight half-width fade** to the dark. Five shape generators (`dungeon.js` SHAPES: full / broken-ring / causeway / cavern / cross) give every room a different footprint, and outer rings can crumble to void. The **walkable area is guaranteed fully connected** (flood-fill prune + blockers only placed where they can't strand a tile), so there's never an unreachable cell. Walkable tile variety: crack, moss, grate, puddle, **ember, rune, bones, rubble, mushroom, ash**.
- **Walls, reused two ways.** The old extruded wall art returns as (a) **impassable obstacle blocks** dropped inside rooms — sometimes in short **runs of 2–3** — alongside pit/column/firepit (`pWallBlock`, a `wall` blocker kind), and (b) **exit architecture**: every exit is a wall segment at the floor's edge with an opening cut through it (`pExitWall`), keyed by kind — **arch** (onward/vault, gold), **framed doorway** (shrine, blue), **stairs up** (descent/daylight, green). Everywhere else the perimeter is blank void.
- **Rune Compass.** A corner dial shows the descent — **ROOM x / 7**, current room glowing, cleared rooms filled, the boss node ringed. A run is **seven rooms** (the shared `LAYOUTS`), each with its own shape, tile theme, and wave, ending in the dungeon's **boss room**.
- **Stay as long as you like — the boss is a farmable timed spawn.** Every room, the boss room included, respawns a cleared wave after a short delay, so you can farm indefinitely and the fight never pulls you back to the Keep on its own. The **boss** joins the wave only when its **respawn timer** is up (`BAL.BOSS_RESPAWN`, 10 min for now); between kills the boss room fields a deep-level **trash pack** so there's always something to fight. Slaying the boss puts it back on the timer, and the **first** kill in a dungeon marks it cleared, unlocks the next rung, and grants a guaranteed first-clear drop (every kill after just drops the boss's normal loot). The Rune Compass shows a **BOSS m:ss** countdown (or **BOSS ✦ READY**) below the dial.
- **Enemies spawn on random reachable floor cells** each wave (never in the void), and each carries a **level badge** (bottom-right of its tile) that **scales with the dungeon's band** (§8.3) — deeper dungeons field far tougher foes.
- **Loot drops into your bag mid-combat.** Slain foes have a drop chance (bosses always drop); items fall straight into a shared **inventory** (no more "pick 1 of 3" gate). Better materials/procs drop less often (§6.2).
- **Rally flag.** Tap the floor to plant a rally point; pals with **no foe engaged** regroup on it — a light-touch way to steer positioning between waves. (Full formation/command control is a later pass.)
- **Tap a hero** to open a stats + gear panel; equipping/unequipping is done here. Opening any panel **fully freezes** the dungeon — combat, movement, and effects — and closing it resumes exactly where you left off. This freeze is **independent of the manual Fight/Pause button** (opening a panel no longer flips it), so theorycrafting never disturbs the run state.
- **Area →** advances to the next room (The Threshold → Gallery → Causeway → Hollow → Vault → Approach → the boss's Inner Sanctum) when *you* choose, stopping at the boss room; the Rune Compass tracks where you are. Branch-choice at portals (shrine vs. vault) is a later pass — the exits already render their kind.
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
