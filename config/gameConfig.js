// Game Configuration - Global settings and balance values
/**
 * @file gameConfig.js
 * @description Global game configuration and balance values
 * 
 * @version 0.11.0
 * @changelog
 *   - v0.11.0 (2026-02-10): Alignment combat system. Replaced placeholder alignments block
 *                           with full attacker-vs-defender matrix (attack/defense % modifiers).
 *                           Master toggle via alignment.enabled. Good excels vs chaotic (+5% ATK,
 *                           +3% DEF), chaotic is aggressive but reckless vs good (+5% ATK, -3% DEF),
 *                           neutral is a safe generalist. Added getAlignmentModifiers() helper.
 *   - v0.10.0 (2026-02-09): Added mobile hex map config: maxGridCols (8), maxGridRows (12),
 *                           minHexRadius (22) to ui block for fixed-size hex rendering.
 *                           See MOBILE_HEX_MAP_IMPLEMENTATION.md.
 *   - v0.9.0 (2026-02-08): Deep Thornwood survivability fix (Options A+B+C from BALANCE_AND_PROGRESSION.md §6).
 *                          Added combat.potions.levelScaling (0.03 = 3% per level) for potion scaling.
 *                          Added combat.flatDefenseMultiplier (0.15) for flat gear-based damage reduction.
 *                          See also: npcConfig.js v0.7.0 (statScalePerLevel 0.1→0.07).
 *   - v0.8.1 (2026-02-08): Added combat balance constants: healthPerLevel (10 HP/level),
 *                          levelDiffDamageReduction (3%/level above attacker, cap 50%).
 *                          Provides survivability floor and makes level progression meaningful.
 *   - v0.8.0 (2025-01-25): Added offlineProgress configuration section for idle progress system.
 *                          Increased inventorySlots to 999 to support offline loot accumulation.
 *   - v0.7.1 (2025-01-21): Increased XP requirements 5x (baseXP 750, exponent 1.6)
 *                          for slower early-game leveling progression.
 *   - v0.7.0 (2025-01-21): Added combat balance constants for percentage-based damage reduction:
 *                          minDamagePercent, maxDamageReduction, defenseScaleFactor
 *   - v0.6.0 (2025-01-20): Added motivations config for character backstory/personal hooks
 *   - v0.5.1 (2025-01-18): Updated ambient event timing to 10-90 seconds for town atmosphere
 *   - v0.5.0 (2025-01-10): Added startingSkillPoints config for character creation
 *   - v0.4.5 (2025-01-02): Added loot display config (hide gold/consumable-only drops)
 *   - v0.4.4 (2025-01-02): Slowed combat (2s) and movement (1s) rates by 50% for better pacing
 *   - v0.4.3 (2025-01-02): Changed statPointsPerLevel to range-based config (default 4)
 *   - v0.1.0: Initial configuration
 */
export const GameConfig = {
    // Version
    version: '0.11.0',
    gameName: 'Hex Infinity RPG',
    
    // Tick System
    tick: {
        rate: 500,              // ms per game tick
        combatRate: 2000,       // ms per combat tick (2 seconds - slower paced)
        movementRate: 1000,     // ms per movement update (1 second - slower paced)
        regenRate: 1000,        // ms per regen tick
    },
    
    // Auto-Battle
    autoBattle: {
        defaultTimer: 4 * 60 * 60 * 1000,  // 4 hours in ms
        maxTimer: 48 * 60 * 60 * 1000,     // 48 hours max
        timerIncrement: 4 * 60 * 60 * 1000 // 4 hour purchase increments
    },
    
    // Map Instance Settings
    mapInstance: {
        maxPlayersDefault: 4,
        despawnDelay: 5 * 60 * 1000,  // 5 minutes no players
        npcRespawnDelay: 10000,        // 10 seconds
    },
    
    // Combat Settings
    combat: {
        meleeRange: 1,              // Adjacent hexes
        rangedRange: 3,             // Max ranged attack distance
        minDamage: 1,               // Absolute minimum damage floor
        minDamagePercent: 0.15,     // Min 15% of attack always gets through defense
        maxDamageReduction: 0.70,   // Defense caps at 70% damage reduction
        defenseScaleFactor: 1.5,    // Controls defense curve steepness
        critMultiplier: 2.0,        // Critical hit damage multiplier
        maxCritChance: 0.25,        // 25% max crit chance
        maxDodgeChance: 0.50,       // 50% max dodge chance
        
        // Flat defense reduction from equipped gear (v0.9.0 - Option C)
        // After percentage-based reduction, subtract flat amount based on gear defense
        // flatReduction = floor(totalEquipDefense × flatDefenseMultiplier)
        // Ensures gear investment always provides tangible damage mitigation
        flatDefenseMultiplier: 0.15, // 15% of equipped gear defense as flat reduction
        
        // Potion scaling with character level (v0.9.0 - Option A)
        // effectiveHeal = baseHeal × (1 + (level - 1) × levelScaling)
        // Keeps potions relevant at higher levels where HP pools outgrow flat heal values
        potions: {
            levelScaling: 0.03,     // 3% more healing per character level
        },
    },
    
    // Character Settings
    character: {
        maxLevel: 999,
        startingStatPoints: 10,
        startingSkillPoints: 1,
        
        // Per-level survivability scaling (v0.8.1)
        // Flat HP bonus per level - represents physical conditioning from adventuring
        // Disproportionately helps squishier classes (mage +125% at lv20 vs warrior +54%)
        healthPerLevel: 10,
        
        // Level-difference damage reduction (v0.8.1)
        // When defender level > attacker level, incoming damage is reduced
        // Makes overleveling feel meaningful without changing stat formulas
        // 0% at-level, scales linearly: 3% per level above, capped at 50%
        levelDiffDamageReduction: 0.03,     // 3% reduction per level above attacker
        levelDiffReductionCap: 0.50,        // Maximum 50% reduction (reached at +17 levels)
        // Stat points per level - configurable by level range for game balancing
        // Higher levels grant fewer points to slow power creep
        statPointsPerLevel: {
            default: 4,             // Fallback if no range matches
            ranges: [
                { minLevel: 1, maxLevel: 10, points: 5 },    // Early game: generous
                { minLevel: 11, maxLevel: 50, points: 4 },   // Mid game: standard
                { minLevel: 51, maxLevel: 100, points: 3 },  // Late game: slower
                { minLevel: 101, maxLevel: 200, points: 2 }, // End game: diminishing
                { minLevel: 201, maxLevel: 999, points: 1 }  // Post-game: minimal
            ]
        },
        skillPointsPerLevel: 1,     // Base, diminishes
        maxActiveSkills: 5,
        inventorySlots: 999,        // Increased from 30 for offline loot accumulation
        bankSlots: 30,
        maxCharacters: 4,
        startingCharacterSlots: 2,
    },
    
    // Regeneration (per tick at regenRate)
    regen: {
        townHealthPercent: 0.05,    // 5% per tick in town
        townManaPercent: 0.05,
        battleHealthPercent: 0.01,  // 1% per tick in battle
        battleManaPercent: 0.01,
    },
    
    // Death Penalties
    death: {
        equipDropChance: 0.10,      // 10% chance to drop equipped item
        inventoryDropChance: 0.25,  // 25% chance to drop inventory item
    },
    
    // Loot Display Settings
    loot: {
        showGoldOnlyDrops: false,       // Show map icon for gold-only drops
        showConsumableOnlyDrops: false, // Show map icon for consumable-only drops
        // Equipment drops always show icons
    },
    
    // Item Upgrade Settings
    upgrade: {
        maxTier: 10,
        baseSuccessRate: 0.90,      // 90% at tier 1
        successDecrement: 0.08,     // -8% per tier
        destroyChanceBase: 0.02,    // 2% at tier 1
        destroyIncrement: 0.03,     // +3% per tier
    },
    
    // Experience Formula: XP = base * (level ^ exponent)
    experience: {
        baseXP: 750,                // Increased from 100 for slower early leveling
        exponent: 1.6,              // Increased from 1.5 for steeper curve
        // Diminishing stat/skill points
        statDiminishStart: 50,      // Start diminishing after level 50
        statDiminishRate: 0.98,     // Multiply by this each level after
    },
    
    // UI Settings
    ui: {
        hexSize: 40,                // Radius in pixels (DEPRECATED - kept for backward compat; see _calculateHexRadius())
        maxGridCols: 8,             // Widest possible battle map (columns) - mobile portrait constraint
        maxGridRows: 12,            // Tallest possible battle map (rows) - mobile portrait constraint
        minHexRadius: 22,           // Minimum hex radius for 44px touch targets (Apple HIG)
        defaultGridWidth: 10,
        defaultGridHeight: 12,
        actionLogMaxEntries: 100,
        // Town ambient event timing (random atmospheric flavor text)
        ambientEventMinDelay: 10000,  // 10 seconds minimum
        ambientEventMaxDelay: 90000,  // 90 seconds maximum
    },
    
    // === OFFLINE PROGRESS SYSTEM (NEW v0.8.0) ===
    // Simulates combat progress while player is away
    offlineProgress: {
        enabled: true,
        maxDuration: 12 * 60 * 60 * 1000,  // 4 hours max in ms
        
        // Simulation rates
        combatsPerMinute: 1.5,             // Average fights per minute offline
        avgFightDuration: 8,               // Seconds per fight (for calculation reference)
        
        // Efficiency modifiers (compared to active play)
        // Set to 1.0 for same rates as online play
        xpMultiplier: 1.0,                 // 100% XP (same as active)
        goldMultiplier: 1.0,               // 100% gold (same as active)
        lootChanceMultiplier: 1.0,         // 100% loot drop chance (same as active)
        
        // Death mechanics
        deathCheckInterval: 30 * 60 * 1000,  // Check death risk every 30 mins
        baseDeathChance: 0.03,               // 3% death chance per interval
        deathChancePerLevelDiff: 0.02,       // +2% per level NPCs are above player
        
        // Loot settings
        maxRarityOffline: 'rare',            // Exclude 'epic' and 'legendary'
        excludeBossLoot: true,               // No boss-specific drops
        
        // Map restrictions (extensible for future use)
        excludedMaps: [],                    // Maps where offline progress doesn't work
        
        // Future: Town offline features placeholder
        townFeatures: {
            enabled: false,                  // Reserved for future crafting/skill training
            // crafting: { enabled: false },
            // training: { enabled: false },
        }
    },
    
    // Alignment display options (used by CharacterCreateScreen for picker/review)
    alignments: {
        good: { id: 'good', name: 'Good' },
        neutral: { id: 'neutral', name: 'Neutral' },
        chaotic: { id: 'chaotic', name: 'Chaotic' },
    },
    
    // === ALIGNMENT COMBAT SYSTEM (v0.11.0) ===
    // Attacker alignment vs defender alignment grants minor ATK/DEF percentage modifiers.
    // Values are percentages: 5 = +5%, -3 = -3%. Lookup: modifiers[attacker][defender]
    // Good = defensive PvE pick (most NPCs chaotic), Chaotic = aggressive/risky, Neutral = safe generalist
    alignment: {
        enabled: true,  // Master toggle — false = alignment has zero combat effect
        
        // modifiers[attackerAlignment][defenderAlignment] = { attack: %, defense: % }
        modifiers: {
            good: {
                good:    { attack: 0, defense: 0 },
                neutral: { attack: 0, defense: 2 },
                chaotic: { attack: 5, defense: 3 }
            },
            neutral: {
                good:    { attack: 0, defense: 0 },
                neutral: { attack: 0, defense: 0 },
                chaotic: { attack: 3, defense: 2 }
            },
            chaotic: {
                good:    { attack: 5, defense: -3 },
                neutral: { attack: 2, defense: 0 },
                chaotic: { attack: 0, defense: 0 }
            }
        }
    },
    
    // Personal Hooks / Motivations (from WORLD_LORE.md)
    // These drive character backstory and affect intro narrative
    motivations: {
        missing_expedition: {
            id: 'missing_expedition',
            name: 'The Missing Expedition',
            icon: '🔍',
            shortDesc: 'Someone you knew vanished here',
            description: 'A previous expedition vanished without a trace. Friends? Family? You need answers.',
            introText: 'Somewhere in this untamed land, answers await—answers about those who came before you and never returned.'
        },
        inherited_debt: {
            id: 'inherited_debt',
            name: 'Inherited Debt',
            icon: '💀',
            shortDesc: 'Flee the Old World\'s reach',
            description: 'Someone powerful in the Old World wants you dead. The Shattered Coast is far enough... you hope.',
            introText: 'Every league between you and the Old World is another breath of freedom. Here, you can start again—if your past doesn\'t follow.'
        },
        family_relic: {
            id: 'family_relic',
            name: 'The Family Relic',
            icon: '💎',
            shortDesc: 'An heirloom lost, now found',
            description: 'A treasured family heirloom was sold and shipped here. You\'ve come to reclaim what\'s rightfully yours.',
            introText: 'Somewhere in this frontier, an artifact of your bloodline waits. You can feel it calling to you, closer now than ever.'
        },
        visions: {
            id: 'visions',
            name: 'Visions of the Past',
            icon: '👁',
            shortDesc: 'Dreams led you here',
            description: 'Strange dreams have haunted you for months—visions of this place. They\'re growing stronger.',
            introText: 'The dreams that brought you here grow vivid now that you\'ve arrived. Ancient stones, forgotten words, a presence beneath the earth... the visions promise revelation.'
        },
        second_chance: {
            id: 'second_chance',
            name: 'Second Chance',
            icon: '🔄',
            shortDesc: 'A new identity, a fresh start',
            description: 'Your old life is over—by choice or circumstance. The Shattered Coast offers what the Old World couldn\'t: a clean slate.',
            introText: 'No one here knows your name, your past, your sins. The person who boarded that ship no longer exists. Who will you become?'
        },
        scholar_quest: {
            id: 'scholar_quest',
            name: 'The Scholar\'s Quest',
            icon: '📜',
            shortDesc: 'Prove a theory about the ancients',
            description: 'You have a theory about the lost civilization that once thrived here. You need proof—and this is the only place to find it.',
            introText: 'The ruins here predate the Shattering, perhaps even the Sunlit Empire itself. If your theory is correct, everything scholars believe about the ancient age is wrong.'
        },
        divine_mission: {
            id: 'divine_mission',
            name: 'Divine Mission',
            icon: '✨',
            shortDesc: 'Called by powers beyond',
            description: 'The gods—or something else—have called you here. You don\'t fully understand why, but you know you must answer.',
            introText: 'Faith brought you across the sea. Whether divine providence or cosmic fate, you sense purpose in this place—a role only you can fulfill.'
        },
        simple_greed: {
            id: 'simple_greed',
            name: 'Simple Greed',
            icon: '💰',
            shortDesc: 'Fortune favors the bold',
            description: 'Ancient ruins mean ancient treasure. You\'re here to get rich—is that so wrong?',
            introText: 'They say fortunes are made on the Shattered Coast, pulled from ruins older than memory. You intend to claim your share—and then some.'
        }
    }
};

// XP required for a given level
export function xpForLevel(level) {
    return Math.floor(GameConfig.experience.baseXP * Math.pow(level, GameConfig.experience.exponent));
}

// Stat points gained at a given level (uses range-based config)
export function statPointsForLevel(level) {
    const config = GameConfig.character.statPointsPerLevel;
    
    // If using simple number (backwards compatibility)
    if (typeof config === 'number') {
        return config;
    }
    
    // Find matching range
    if (config.ranges && Array.isArray(config.ranges)) {
        for (const range of config.ranges) {
            if (level >= range.minLevel && level <= range.maxLevel) {
                return range.points;
            }
        }
    }
    
    // Fallback to default
    return config.default || 4;
}

// Skill points gained at a given level
export function skillPointsForLevel(level) {
    const base = GameConfig.character.skillPointsPerLevel;
    if (level <= GameConfig.experience.statDiminishStart) {
        return base;
    }
    const diminishLevels = level - GameConfig.experience.statDiminishStart;
    return Math.max(0, Math.floor(base * Math.pow(GameConfig.experience.statDiminishRate, diminishLevels)));
}

// Get alignment combat modifiers for attacker vs defender (v0.11.0)
// Returns { attack: number, defense: number } as percentage modifiers
export function getAlignmentModifiers(attackerAlignment, defenderAlignment) {
    const config = GameConfig.alignment;
    if (!config?.enabled) return { attack: 0, defense: 0 };
    
    const attacker = attackerAlignment || 'neutral';
    const defender = defenderAlignment || 'neutral';
    
    return config.modifiers?.[attacker]?.[defender] || { attack: 0, defense: 0 };
}

export default GameConfig;
