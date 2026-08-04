/**
 * @file Character.js
 * @description Player character model with stats, equipment, inventory, and progression.
 *              Handles equip/unequip, buying/selling items, death penalties, combat state,
 *              potion management with auto-use functionality, map position tracking,
 *              player housing system with materials, and bank vault storage.
 * 
 * @location models/Character.js
 * @usage Instantiated by CharacterManager, used by combat and UI systems
 * @dependencies 
 *   - GameConfig (config/gameConfig.js)
 *   - ClassConfig (config/classConfig.js)
 *   - RaceConfig (config/raceConfig.js)
 *   - ShopConfig (config/shopConfig.js) - for sell price calculation
 *   - ItemConfig (config/itemConfig.js) - for potion definitions
 *   - BankConfig (config/bankConfig.js) - for vault configuration
 *   - HousingConfig (config/housingConfig.js) - for housing buff calculations
 *   - Skill (models/Skill.js) - for skill reconstruction
 *   - Item (models/Item.js) - for item reconstruction
 *   - EventBus (systems/EventBus.js)
 * 
 * @version 3.5.1
 * @changelog
 *   - v3.5.1 (2026-03-06): Added hiredStaff and pendingUpgrades to toJSON().
 *                          Both fields were missing from save serialization, causing
 *                          hired staff and upgrade timers to reset on every reload.
 *   - v3.5.0 (2026-02-10): Fixed usePotion() reading potionDef.value (undefined) instead of
 *                          potionDef.effect.heal / potionDef.effect.mana from itemConfig.
 *                          All potions were healing 50 HP / 30 MP regardless of tier.
 *                          Now correctly reads: Minor=30, Standard=60, Greater=120, Superior=200.
 *   - v3.4.0 (2026-02-10): Housing buff integration. Added _recalculateHousingBuffs()
 *                          method that calculates diminishing-returns housing buffs from
 *                          housingLevels. Added housingBuffs getter for external access.
 *                          Modified _getEquipmentAttackBonus(), _getEquipmentDefenseBonus(),
 *                          _getEquipmentStatBonus(), _getEquipmentDodgeBonus(),
 *                          _getEquipmentCritBonus() to apply Armory equipmentStats % multiplier.
 *                          Added goldFindMultiplier getter for loot system integration.
 *                          Added HOUSING_UPGRADED event listener for live recalculation.
 *                          Import: HousingStructures, HousingSettings from housingConfig.js.
 *   - v3.3.0 (2026-02-09): Added hasStatusEffect(), isStunned(), isSlowed() methods
 *                          for proc system Phase 3 (PROC_SYSTEM_IMPLEMENTATION.md).
 *                          Matches NPC.js status effect query API for polymorphic combat.
 *   - v3.2.0 (2026-02-08): Potion level scaling (Option A from BALANCE_AND_PROGRESSION.md §6).
 *                          usePotion() now applies level-based multiplier to heal/mana values:
 *                          effectiveValue = baseValue × (1 + (level - 1) × levelScaling).
 *                          Uses GameConfig.combat.potions.levelScaling (default 0.03 = 3%/level).
 *                          At Lv23, Greater Health Potion heals 166 HP instead of 100.
 *   - v3.1.0 (2026-02-08): Added per-level HP bonus to maxHealth getter.
 *                          Uses GameConfig.character.healthPerLevel (default 10).
 *                          Provides survivability floor that scales with progression.
 *   - v3.0.0 (2026-02-08): Passive skill integration. Added _recalculatePassiveBonuses()
 *                          method that aggregates all learned passive skill effects.
 *                          Modified attackPower, defensePower, dodgeChance, critChance,
 *                          maxHealth, maxMana getters to incorporate passive bonuses.
 *                          Added attackSpeed getter (placeholder, DEX-based + passive bonuses).
 *                          Added import of SkillType, EffectType, calculateEffectValue from skillConfig.
 *                          Passive recalc called in constructor, fromJSON, and learnSkill.
 *   - v2.10.0 (2026-01-27): Merged from v57 base + v2.9.x features.
 *                           Restored missing getters: totalStats, classData, raceData,
 *                           dodgeChance, critChance, isAlive, healthPercent, manaPercent, sprite.
 *                           Restored _getEquipmentAttackBonus(), _getEquipmentDefenseBonus().
 *                           Added setPosition() method for MapInstance compatibility.
 *                           Added bank vault system (bankGold, bankVault, bankVaultSlots).
 *                           Added bank methods: depositGold, withdrawGold, depositItem,
 *                           withdrawItem, expandVault, getBankVaultUsed, canDepositItem.
 *   - v2.8.0 (2025-01-27): Added getHealthPotionInfo() and getManaPotionInfo() methods
 *                          for BattleMapUI cooldown display. Returns equipped potion object.
 *   - v2.7.0 (2025-01-27): Fixed equipPotion() not working - was checking effect === 'restoreHealth'
 *                          but effect is an object like { heal: 30 }. Now correctly checks potionType
 *                          property ('health' or 'mana') to determine equipment slot.
 *   - v2.6.0 (2025-01-27): Added two-handed weapon support. canEquip() now prevents equipping
 *                          offHand items when a two-handed weapon is equipped. equipItem() now
 *                          auto-unequips offHand when equipping a two-handed weapon (bow, staff, greatsword).
 *   - v2.5.0 (2026-01-26): Added housing system support (housingLevels, materials).
 *                          Added material management methods (addMaterial, spendMaterial, etc.)
 *                          Added housing structure methods (getHousingLevel, upgradeHousingStructure, etc.)
 *   - v2.4.0 (2025-01-25): Added lastActiveTimestamp for offline progress tracking.
 *                          Added updateLastActiveTimestamp() method.
 *                          Updated toJSON/fromJSON to persist timestamp.
 *   - v2.3.0 (2025-01-21): Added Aether currency tracking for forge upgrades.
 *                          Added addAether(), spendAether(), hasAether() methods.
 *   - v2.2.0 (2025-01-20): Added motivation field for character backstory/personal hooks.
 *   - v2.1.0 (2025-01-19): Removed Math.floor() from attackPower, defensePower, magicPower
 *                          getters to enable full precision combat calculations.
 *   - v2.0.1 (2025-01-19): Fixed defensePower getter to check defensePerStrength and
 *                          defensePerIntelligence (was only checking stamina/dexterity).
 *   - v2.0.0 (2025-01-17): Added lastMapPositions tracking for world map "return to position" feature.
 *                          Added saveMapPosition(), getLastMapPosition(), clearMapPosition() methods.
 *   - v1.9.0 (2025-01-10): Updated fromJSON() to reconstruct items using Item.fromData(),
 *                          fixing item property loss (name, stats, description) after save/load
 *   - v1.8.0 (2025-01-10): Updated fromJSON() to reconstruct skills using Skill.fromData(),
 *                          fixing skill method loss after save/load
 *   - v1.7.0 (2025-01-10): Added skill management methods (equipSkill, unequipSkill, getSkillSlot, getLearnedActiveSkills). Fixed learnedSkills to use object structure.
 *   - v1.6.0 (2025-01-10): Characters now start with 1 skill point (uses GameConfig.character.startingSkillPoints)
 *   - v1.5.2 (2025-01-03): Fixed potion usage methods - use baseId instead of potionId for getPotion() calls
 *   - v1.5.1 (2025-01-03): Fixed equipPotion stacking - use baseId instead of potionId for comparison
 *   - v1.5.0 (2025-01-03): Added potion system with equipment slots, auto-use, cooldowns, and stacking
 *   - v1.4.0 (2025-01-03): Added silent parameter to heal() to suppress passive regen log messages
 *   - v1.3.0 (2025-01-03): Removed class restrictions on equipment - any character can equip any item
 *   - v1.2.0 (2025-01-02): Enhanced die() to calculate item drop penalties, return death details
 *   - v1.1.0 (2025-01-02): Added equipItem, unequipItem, canEquip, buyItem, sellItem methods
 *   - v1.0.0 (2025-01): Initial implementation
 */

import { GameConfig, xpForLevel, statPointsForLevel, skillPointsForLevel } from '../config/gameConfig.js';
import { getClass, ArmorTypeModifiers } from '../config/classConfig.js';
import { getRace } from '../config/raceConfig.js';
import { eventBus, GameEvents } from '../systems/EventBus.js';
import { calculateSellPrice } from '../config/shopConfig.js';
import { getPotion } from '../config/itemConfig.js';
import { BankConfig } from '../config/bankConfig.js';
import { SkillType, EffectType, calculateEffectValue } from '../config/skillConfig.js';
import { HousingStructures, HousingSettings } from '../config/housingConfig.js';
import { Skill } from './Skill.js';
import { Item } from './Item.js';

let characterIdCounter = 0;

export class Character {
    constructor(data = {}) {
        // Identity
        this.id = data.id || `char_${++characterIdCounter}`;
        this.name = data.name || 'Unnamed Hero';
        this.classId = data.classId || 'warrior';
        this.raceId = data.raceId || 'human';
        this.alignment = data.alignment || 'neutral';
        this.motivation = data.motivation || 'simple_greed';
        this.sex = data.sex || 'M';
        
        // Cache class and race data EARLY - needed for stat calculations
        this._classData = getClass(this.classId);
        this._raceData = getRace(this.raceId);
        
        // Appearance
        this.appearance = data.appearance || {
            hairStyle: 'short',
            hairColor: 'brown',
            skinColor: 'fair',
            eyeColor: 'brown',
            height: 'average',
            build: 'average'
        };
        
        // Level and XP
        this.level = data.level || 1;
        this.xp = data.xp || 0;
        this.xpToNextLevel = xpForLevel(this.level + 1);
        
        // Unspent points
        this.unspentStatPoints = data.unspentStatPoints ?? GameConfig.character.startingStatPoints;
        this.unspentSkillPoints = data.unspentSkillPoints ?? GameConfig.character.startingSkillPoints;
        
        // Base stats (player-assigned)
        this.baseStats = data.baseStats || {
            strength: 10,
            dexterity: 10,
            intelligence: 10,
            stamina: 10
        };
        
        // Equipment slots - MUST be before currentHealth/Mana since maxHealth depends on equipment
        this.equipment = data.equipment || {
            head: null,
            necklace: null,
            ring1: null,
            ring2: null,
            body: null,
            cape: null,
            boots: null,
            mainHand: null,
            offHand: null,
            potionHealth: null,  // NEW: Health potion slot
            potionMana: null     // NEW: Mana potion slot
        };
        
        // Ensure potion slots exist for loaded characters
        if (!this.equipment.potionHealth) this.equipment.potionHealth = null;
        if (!this.equipment.potionMana) this.equipment.potionMana = null;
        
        // Current resources (now safe to access maxHealth/maxMana)
        this.currentHealth = data.currentHealth ?? this.maxHealth;
        this.currentMana = data.currentMana ?? this.maxMana;
        
        // Position on map
        this.position = data.position || { q: 0, r: 0 };
        this.currentMapId = data.currentMapId || 'town';
        
        // === LAST MAP POSITIONS (NEW v2.0.0) ===
        // Tracks the last position visited on each map for "return to position" feature
        this.lastMapPositions = data.lastMapPositions || {};
        
        // Inventory
        this.inventory = data.inventory || [];
        this.maxInventory = data.maxInventory || GameConfig.character.inventorySlots;
        
        // Gold
        this.gold = data.gold || 0;
        
        // Aether currency for forge upgrades (NEW v2.3.0)
        this.aether = data.aether || 0;
        
        // === BANK VAULT SYSTEM (NEW v2.9.0) ===
        // Gold stored in the bank (separate from carried gold)
        this.bankGold = data.bankGold || 0;
        
        // Items stored in the bank vault
        this.bankVault = data.bankVault || [];
        
        // Current vault capacity (can be expanded)
        this.bankVaultSlots = data.bankVaultSlots || BankConfig.initialVaultSlots;
        
        // === HOUSING SYSTEM (NEW v2.5.0) ===
        // Structure levels for player housing (0 = not built)
        this.housingLevels = data.housingLevels || {
            hearth: 0,
            training: 0,
            armory: 0,
            garden: 0,
            shrine: 0,
            trophy: 0
        };
        
        // Materials inventory for housing upgrades (separate from item inventory)
        // Keys are material IDs, values are quantities
        this.materials = data.materials || {};
        
        // Skills
        this.learnedSkills = data.learnedSkills || {};  // Object keyed by skillId
        this.activeSkills = data.activeSkills || [null, null, null, null, null];  // Array of 5 slots
        
        // Calculate passive bonuses from learned skills (must be after learnedSkills set)
        this._recalculatePassiveBonuses();
        
        // Calculate housing buffs from structure levels (must be after housingLevels set)
        this._recalculateHousingBuffs();
        
        // Listen for housing upgrades to recalculate buffs in real-time
        this._onHousingUpgraded = () => this._recalculateHousingBuffs();
        eventBus.on(GameEvents.HOUSING_UPGRADED, this._onHousingUpgraded);
        
        // Combat state
        this.inCombat = false;
        this.currentTarget = null;
        this.statusEffects = [];
        
        // Auto-battle
        this.autoBattleEnabled = data.autoBattleEnabled ?? false;
        this.autoLootEnabled = data.autoLootEnabled ?? true;
        this.autoBattleTimer = data.autoBattleTimer || GameConfig.autoBattle.defaultTimer;
        
        // Movement state
        this.isMoving = false;
        this.movementPath = [];
        
        // === POTION SYSTEM (NEW) ===
        this.potionSettings = data.potionSettings || {
            autoHealthEnabled: true,
            autoHealthThreshold: 0.5,   // Use at 50% HP
            autoManaEnabled: true,
            autoManaThreshold: 0.3      // Use at 30% MP
        };
        
        // Potion cooldowns (timestamps)
        this.healthPotionCooldownEnd = data.healthPotionCooldownEnd || 0;
        this.manaPotionCooldownEnd = data.manaPotionCooldownEnd || 0;
        
        // === OFFLINE PROGRESS TRACKING (NEW v2.4.0) ===
        // Timestamp of when character was last actively played
        // Used to calculate offline progress when returning to the game
        this.lastActiveTimestamp = data.lastActiveTimestamp || Date.now();
    }
    
    // === Computed Stats ===
    
    get classData() {
        return this._classData || getClass(this.classId);
    }
    
    get raceData() {
        return this._raceData || getRace(this.raceId);
    }
    
    // Total stats including race and class bonuses
    get totalStats() {
        const classBonus = this.classData?.statBonus || {};
        const raceBonus = this.raceData?.statBonus || {};
        const equipBonus = this._getEquipmentStatBonus();
        
        return {
            strength: this.baseStats.strength + (classBonus.strength || 0) + (raceBonus.strength || 0) + (equipBonus.strength || 0),
            dexterity: this.baseStats.dexterity + (classBonus.dexterity || 0) + (raceBonus.dexterity || 0) + (equipBonus.dexterity || 0),
            intelligence: this.baseStats.intelligence + (classBonus.intelligence || 0) + (raceBonus.intelligence || 0) + (equipBonus.intelligence || 0),
            stamina: this.baseStats.stamina + (classBonus.stamina || 0) + (raceBonus.stamina || 0) + (equipBonus.stamina || 0)
        };
    }
    
    get maxHealth() {
        const derived = this.classData?.derivedStats || { healthPerStamina: 10 };
        let health = Math.floor(this.totalStats.stamina * derived.healthPerStamina);
        
        // Per-level HP bonus (v3.1.0) - flat HP from adventuring experience
        const hpPerLevel = GameConfig.character.healthPerLevel || 0;
        if (hpPerLevel > 0) {
            health += this.level * hpPerLevel;
        }
        
        // Apply passive skill flat HP bonus
        health += this._passiveBonuses?.maxHealth || 0;
        
        return health;
    }
    
    get maxMana() {
        const derived = this.classData?.derivedStats || { manaPerIntelligence: 8 };
        let mana = Math.floor(this.totalStats.intelligence * derived.manaPerIntelligence);
        
        // Apply passive skill flat MP bonus
        mana += this._passiveBonuses?.maxMana || 0;
        
        return mana;
    }
    
    get attackPower() {
        const derived = this.classData?.derivedStats || {};
        const stats = this.totalStats;
        let attack = 0;
        
        // Primary stat contribution
        if (derived.attackPerStrength) attack += stats.strength * derived.attackPerStrength;
        if (derived.attackPerDexterity) attack += stats.dexterity * derived.attackPerDexterity;
        if (derived.attackPerIntelligence) attack += stats.intelligence * derived.attackPerIntelligence;
        
        // Equipment attack bonus
        attack += this._getEquipmentAttackBonus();
        
        // Apply passive skill damage bonus (percentage multiplier)
        const passiveDamageBonus = this._passiveBonuses?.damage || 0;
        if (passiveDamageBonus > 0) {
            attack *= (1 + passiveDamageBonus / 100);
        }
        
        return attack;
    }
    
    get defensePower() {
        const derived = this.classData?.derivedStats || {};
        const stats = this.totalStats;
        let defense = 0;
        
        // Primary stat contribution (check all possible defense scaling stats)
        if (derived.defensePerStrength) defense += stats.strength * derived.defensePerStrength;
        if (derived.defensePerDexterity) defense += stats.dexterity * derived.defensePerDexterity;
        if (derived.defensePerIntelligence) defense += stats.intelligence * derived.defensePerIntelligence;
        if (derived.defensePerStamina) defense += stats.stamina * derived.defensePerStamina;
        
        // Equipment defense bonus (with armor type modifiers)
        defense += this._getEquipmentDefenseBonus();
        
        // Apply passive skill defense bonus (percentage multiplier)
        const passiveDefenseBonus = this._passiveBonuses?.defense || 0;
        if (passiveDefenseBonus > 0) {
            defense *= (1 + passiveDefenseBonus / 100);
        }
        
        return defense;
    }
    
    get magicPower() {
        const derived = this.classData?.derivedStats || {};
        const stats = this.totalStats;
        let magic = 0;
        
        if (derived.magicPerIntelligence) magic += stats.intelligence * derived.magicPerIntelligence;
        
        // Equipment magic bonus
        magic += this._getEquipmentMagicBonus();
        
        return magic;
    }
    
    get critChance() {
        const derived = this.classData?.derivedStats || {};
        const stats = this.totalStats;
        let crit = derived.baseCritChance || 0.05;
        
        if (derived.critPerDexterity) crit += stats.dexterity * derived.critPerDexterity;
        crit += this._getEquipmentCritBonus();
        
        // Apply passive skill crit chance bonus (flat additive, already decimal)
        crit += this._passiveBonuses?.critChance || 0;
        
        return Math.min(crit, 0.75); // Cap at 75%
    }
    
    get critMultiplier() {
        return this.classData?.derivedStats?.critMultiplier || 1.5;
    }
    
    /**
     * Attack speed modifier (placeholder - percentage modifier on combat tick rate)
     * Base: 1.0 (normal speed). Higher = faster attacks.
     * DEX provides 0.5% attack speed per point above 10.
     * Passive skills add percentage bonuses.
     * @returns {number} Attack speed multiplier (1.0 = normal, 1.1 = 10% faster)
     */
    get attackSpeed() {
        const stats = this.totalStats;
        // Base speed + DEX scaling (0.5% per DEX above 10)
        let speed = 1.0;
        const dexAboveBase = Math.max(0, stats.dexterity - 10);
        speed += dexAboveBase * 0.005;
        
        // Apply passive skill attack speed bonus (percentage)
        const passiveSpeedBonus = this._passiveBonuses?.attackSpeed || 0;
        if (passiveSpeedBonus > 0) {
            speed *= (1 + passiveSpeedBonus / 100);
        }
        
        return Math.round(speed * 1000) / 1000; // 3 decimal precision
    }
    
    get dodgeChance() {
        const stats = this.totalStats;
        let dodge = stats.dexterity * 0.002; // 0.2% per dex
        dodge += this._getEquipmentDodgeBonus();
        
        // Apply race bonus if any
        const raceDodge = this.raceData?.traits?.dodgeBonus || 0;
        dodge += raceDodge;
        
        // Apply passive skill dodge bonus (flat additive, already decimal)
        dodge += this._passiveBonuses?.dodge || 0;
        
        return Math.min(dodge, 0.5); // Cap at 50%
    }
    
    get isAlive() {
        return this.currentHealth > 0;
    }
    
    get healthPercent() {
        return this.maxHealth > 0 ? this.currentHealth / this.maxHealth : 0;
    }
    
    get manaPercent() {
        return this.maxMana > 0 ? this.currentMana / this.maxMana : 0;
    }
    
    get sprite() {
        const sprites = {
            warrior: '⚔️',
            mage: '🧙',
            rogue: '🗡️'
        };
        return sprites[this.classId] || '👤';
    }
    
    // === Passive Skill Bonuses ===
    
    /**
     * Recalculate passive skill bonuses from all learned passive skills.
     * Called on construction, load, skill learn, and skill rank-up.
     * Stores result in this._passiveBonuses for use by stat getters.
     * @private
     */
    _recalculatePassiveBonuses() {
        const bonuses = {
            damage: 0,        // % increase to attack power
            defense: 0,       // % increase to defense power
            critChance: 0,    // Flat additive (already decimal, e.g. 0.02 = 2%)
            critDamage: 0,    // Flat additive multiplier bonus
            dodge: 0,         // Flat additive (already decimal)
            maxHealth: 0,     // Flat HP bonus
            maxMana: 0,       // Flat MP bonus
            attackSpeed: 0,   // % modifier
            manaRegen: 0,     // Flat or % bonus
            healthRegen: 0,   // Flat or % bonus
            lifesteal: 0,     // Decimal (0.05 = 5%)
            armorPenetration: 0  // Decimal
        };

        if (!this.learnedSkills) {
            this._passiveBonuses = bonuses;
            return;
        }

        for (const [skillId, skill] of Object.entries(this.learnedSkills)) {
            const skillType = skill.type || skill.config?.type;
            const isPassive = skill.isPassive || (skillType === SkillType.PASSIVE);
            if (!isPassive) continue;

            const effects = skill.effects || skill.config?.effects || [];
            const config = skill.config || skill;
            const rank = skill.rank || 1;

            for (let i = 0; i < effects.length; i++) {
                const effect = effects[i];
                const value = calculateEffectValue(config, rank, i, this);

                switch (effect.type) {
                    case EffectType.BUFF_DAMAGE:      bonuses.damage += value; break;
                    case EffectType.BUFF_DEFENSE:
                    case EffectType.BUFF_ARMOR:        bonuses.defense += value; break;
                    case EffectType.BUFF_CRIT_CHANCE:  bonuses.critChance += value / 100; break;
                    case EffectType.BUFF_CRIT_DAMAGE:  bonuses.critDamage += value / 100; break;
                    case EffectType.BUFF_DODGE:        bonuses.dodge += value / 100; break;
                    case EffectType.BUFF_MAX_HEALTH:   bonuses.maxHealth += value; break;
                    case EffectType.BUFF_MAX_MANA:     bonuses.maxMana += value; break;
                    case EffectType.BUFF_ATTACK_SPEED: bonuses.attackSpeed += value; break;
                    case EffectType.BUFF_MANA_REGEN:   bonuses.manaRegen += value; break;
                    case EffectType.BUFF_HEALTH_REGEN: bonuses.healthRegen += value; break;
                    case EffectType.LIFESTEAL:         bonuses.lifesteal += value / 100; break;
                    case EffectType.ARMOR_PENETRATION:  bonuses.armorPenetration += value / 100; break;
                }
            }
        }

        this._passiveBonuses = bonuses;
    }
    
    /**
     * Recalculate housing buff values from structure levels.
     * Uses same diminishing returns formula as HousingSystem.calculateBuff().
     * Called on construction, load, and when HOUSING_UPGRADED event fires.
     * Stores result in this._housingBuffs for use by stat getters and GameLoop.
     * @private
     */
    _recalculateHousingBuffs() {
        const buffs = {};
        const { diminishingFactor, flatBonusAfter100 } = HousingSettings;

        if (!this.housingLevels) {
            this._housingBuffs = buffs;
            return;
        }

        for (const [structureId, level] of Object.entries(this.housingLevels)) {
            if (level <= 0) continue;

            const structure = HousingStructures[structureId];
            if (!structure || !structure.baseBuff) continue;

            for (const [buffId, baseValue] of Object.entries(structure.baseBuff)) {
                if (!buffs[buffId]) buffs[buffId] = 0;

                // Diminishing returns formula (matches HousingSystem.calculateBuff)
                if (level <= 100) {
                    for (let i = 0; i < level; i++) {
                        buffs[buffId] += baseValue * Math.pow(diminishingFactor, i);
                    }
                } else {
                    // First 100 levels with diminishing returns
                    for (let i = 0; i < 100; i++) {
                        buffs[buffId] += baseValue * Math.pow(diminishingFactor, i);
                    }
                    // Flat bonus for levels 101+
                    buffs[buffId] += (level - 100) * baseValue * flatBonusAfter100;
                }
            }
        }

        this._housingBuffs = buffs;
    }
    
    // === Equipment Helpers ===
    
    _getEquipmentStatBonus() {
        const bonus = { strength: 0, dexterity: 0, intelligence: 0, stamina: 0 };
        
        for (const slot of Object.keys(this.equipment)) {
            const item = this.equipment[slot];
            if (!item || !item.stats) continue;
            
            if (item.stats.strength) bonus.strength += item.stats.strength;
            if (item.stats.dexterity) bonus.dexterity += item.stats.dexterity;
            if (item.stats.intelligence) bonus.intelligence += item.stats.intelligence;
            if (item.stats.stamina) bonus.stamina += item.stats.stamina;
        }
        
        // Housing: Armory equipmentStats buff (percentage boost to raw stats from gear)
        const equipBuff = this._housingBuffs?.equipmentStats || 0;
        if (equipBuff > 0) {
            const mult = 1 + equipBuff / 100;
            bonus.strength = Math.floor(bonus.strength * mult);
            bonus.dexterity = Math.floor(bonus.dexterity * mult);
            bonus.intelligence = Math.floor(bonus.intelligence * mult);
            bonus.stamina = Math.floor(bonus.stamina * mult);
        }
        
        return bonus;
    }
    
    _getEquipmentAttackBonus() {
        let attack = 0;
        
        for (const slot of Object.keys(this.equipment)) {
            const item = this.equipment[slot];
            if (!item || !item.stats) continue;
            if (item.stats.attack) attack += item.stats.attack;
        }
        
        // Housing: Armory equipmentStats buff (percentage boost)
        const equipBuff = this._housingBuffs?.equipmentStats || 0;
        if (equipBuff > 0) {
            attack *= (1 + equipBuff / 100);
        }
        
        return attack;
    }
    
    _getEquipmentDefenseBonus() {
        let defense = 0;
        const armorModifiers = ArmorTypeModifiers[this.classId] || {};
        
        for (const slot of Object.keys(this.equipment)) {
            const item = this.equipment[slot];
            if (!item || !item.stats) continue;
            
            let itemDefense = item.stats.defense || 0;
            
            // Apply armor type modifier
            if (item.armorType && armorModifiers[item.armorType]) {
                itemDefense = Math.floor(itemDefense * armorModifiers[item.armorType]);
            }
            
            defense += itemDefense;
        }
        
        // Housing: Armory equipmentStats buff (percentage boost)
        const equipBuff = this._housingBuffs?.equipmentStats || 0;
        if (equipBuff > 0) {
            defense *= (1 + equipBuff / 100);
        }
        
        return defense;
    }
    
    _getEquipmentMagicBonus() {
        let magic = 0;
        
        for (const slot of Object.keys(this.equipment)) {
            const item = this.equipment[slot];
            if (!item || !item.stats) continue;
            if (item.stats.magicDamage) magic += item.stats.magicDamage;
        }
        
        return magic;
    }
    
    _getEquipmentDodgeBonus() {
        let dodge = 0;
        
        for (const slot of Object.keys(this.equipment)) {
            const item = this.equipment[slot];
            if (!item || !item.stats) continue;
            if (item.stats.dodge) dodge += item.stats.dodge;
        }
        
        // Housing: Armory equipmentStats buff (percentage boost)
        const equipBuff = this._housingBuffs?.equipmentStats || 0;
        if (equipBuff > 0) {
            dodge *= (1 + equipBuff / 100);
        }
        
        return dodge;
    }
    
    _getEquipmentCritBonus() {
        let crit = 0;
        
        for (const slot of Object.keys(this.equipment)) {
            const item = this.equipment[slot];
            if (!item || !item.stats) continue;
            if (item.stats.critChance) crit += item.stats.critChance;
        }
        
        // Housing: Armory equipmentStats buff (percentage boost)
        const equipBuff = this._housingBuffs?.equipmentStats || 0;
        if (equipBuff > 0) {
            crit *= (1 + equipBuff / 100);
        }
        
        return crit;
    }
    
    /**
     * Get current housing buff values (for UI display and external systems)
     * @returns {Object} e.g. { hpRegen: 9.13, goldFind: 4.56, equipmentStats: 7.30, ... }
     */
    get housingBuffs() {
        return this._housingBuffs || {};
    }
    
    /**
     * Gold find multiplier from Hearth housing buff.
     * Used by MapInstance/LootGenerator when granting gold to player.
     * @returns {number} Multiplier (1.0 = no bonus, 1.10 = +10% gold)
     */
    get goldFindMultiplier() {
        const housingGoldFind = this._housingBuffs?.goldFind || 0;
        return 1 + (housingGoldFind / 100);
    }
    
    // === Combat Actions ===
    
    takeDamage(amount, source = null) {
        const actualDamage = Math.max(0, amount);
        this.currentHealth = Math.max(0, this.currentHealth - actualDamage);
        
        eventBus.emit(GameEvents.DAMAGE_TAKEN, {
            target: this,
            damage: actualDamage,
            source: source
        });
        
        if (this.currentHealth <= 0) {
            this.die(source);
        }
        
        return actualDamage;
    }
    
    heal(amount, source = null, silent = false) {
        const oldHealth = this.currentHealth;
        this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
        const actualHeal = this.currentHealth - oldHealth;
        
        if (actualHeal > 0 && !silent) {
            eventBus.emit(GameEvents.HEAL_RECEIVED, {
                target: this,
                amount: actualHeal,
                source: source
            });
        }
        
        return actualHeal;
    }
    
    useMana(amount) {
        if (this.currentMana < amount) return false;
        this.currentMana -= amount;
        return true;
    }
    
    restoreMana(amount, source = null, silent = false) {
        const oldMana = this.currentMana;
        this.currentMana = Math.min(this.maxMana, this.currentMana + amount);
        const actualRestore = this.currentMana - oldMana;
        
        if (actualRestore > 0 && !silent) {
            eventBus.emit(GameEvents.MANA_RESTORED, {
                target: this,
                amount: actualRestore,
                source: source
            });
        }
        
        return actualRestore;
    }
    
    /**
     * Handle character death
     * @param {Object} killer - The entity that killed this character
     * @returns {Object} Death info including dropped items
     */
    die(killer = null) {
        // Calculate death penalty
        const deathPenalty = GameConfig.deathPenalty || {};
        const droppedItems = [];
        
        // XP loss
        if (deathPenalty.xpLossPercent) {
            const xpLoss = Math.floor(this.xp * deathPenalty.xpLossPercent);
            this.xp = Math.max(0, this.xp - xpLoss);
        }
        
        // Gold loss
        if (deathPenalty.goldLossPercent) {
            const goldLoss = Math.floor(this.gold * deathPenalty.goldLossPercent);
            this.gold = Math.max(0, this.gold - goldLoss);
        }
        
        // Item drop chance
        if (deathPenalty.itemDropChance && this.inventory.length > 0) {
            const dropCount = Math.min(
                deathPenalty.maxItemsDropped || 1,
                this.inventory.length
            );
            
            for (let i = 0; i < dropCount; i++) {
                if (Math.random() < deathPenalty.itemDropChance) {
                    const randomIndex = Math.floor(Math.random() * this.inventory.length);
                    const droppedItem = this.inventory.splice(randomIndex, 1)[0];
                    if (droppedItem) {
                        droppedItems.push(droppedItem);
                    }
                }
            }
        }
        
        const deathInfo = {
            killer: killer,
            droppedItems: droppedItems,
            position: { ...this.position },
            mapId: this.currentMapId
        };
        
        eventBus.emit(GameEvents.CHARACTER_DEATH, {
            character: this,
            killer: killer,
            deathInfo: deathInfo
        });
        
        return deathInfo;
    }
    
    respawn() {
        // Restore to half health/mana
        this.currentHealth = Math.floor(this.maxHealth * 0.5);
        this.currentMana = Math.floor(this.maxMana * 0.5);
        
        // Reset combat state
        this.inCombat = false;
        this.currentTarget = null;
        this.statusEffects = [];
        
        // Move to town
        this.currentMapId = 'town';
        this.position = { q: 6, r: 5 }; // Town square
        
        eventBus.emit(GameEvents.CHARACTER_RESPAWN, {
            character: this
        });
    }
    
    /**
     * Set character position on the map
     * @param {number} q - Q coordinate
     * @param {number} r - R coordinate
     */
    setPosition(q, r) {
        this.position = { q, r };
    }
    
    // === XP and Leveling ===
    
    gainXP(amount) {
        this.xp += amount;
        
        eventBus.emit(GameEvents.XP_GAINED, {
            character: this,
            amount: amount
        });
        
        // Check for level up
        while (this.xp >= this.xpToNextLevel) {
            this._levelUp();
        }
    }
    
    _levelUp() {
        this.level++;
        this.xpToNextLevel = xpForLevel(this.level + 1);
        
        // Award stat points
        const statPointsEarned = statPointsForLevel(this.level);
        this.unspentStatPoints += statPointsEarned;
        
        // Award skill points
        const skillPointsEarned = skillPointsForLevel(this.level);
        this.unspentSkillPoints += skillPointsEarned;
        
        // Full heal on level up
        this.currentHealth = this.maxHealth;
        this.currentMana = this.maxMana;
        
        eventBus.emit(GameEvents.CHARACTER_LEVEL_UP, {
            character: this,
            newLevel: this.level,
            statPointsEarned: statPointsEarned,
            skillPointsEarned: skillPointsEarned
        });
    }
    
    // === Stat Allocation ===
    
    allocateStat(statName, points = 1) {
        if (this.unspentStatPoints < points) return false;
        if (!this.baseStats.hasOwnProperty(statName)) return false;
        
        this.baseStats[statName] += points;
        this.unspentStatPoints -= points;
        
        eventBus.emit(GameEvents.STAT_ALLOCATED, {
            character: this,
            stat: statName,
            points: points
        });
        
        return true;
    }
    
    /**
     * Alias for allocateStat - maintains backward compatibility
     */
    assignStatPoints(stat, amount = 1) {
        return this.allocateStat(stat, amount);
    }
    
    // === MAP POSITION TRACKING (NEW v2.0.0) ===
    
    /**
     * Save the player's last position on a map
     * @param {string} mapId - Map ID
     * @param {number} q - Q coordinate
     * @param {number} r - R coordinate
     */
    saveMapPosition(mapId, q, r) {
        if (!mapId || mapId === 'town') return; // Don't track town position
        
        this.lastMapPositions[mapId] = { q, r };
        
        eventBus.emit(GameEvents.MAP_POSITION_SAVED, {
            character: this,
            mapId,
            position: { q, r }
        });
    }
    
    /**
     * Get the last saved position for a map
     * @param {string} mapId - Map ID
     * @returns {Object|null} Position object {q, r} or null if not visited
     */
    getLastMapPosition(mapId) {
        return this.lastMapPositions[mapId] || null;
    }
    
    /**
     * Clear saved position for a map
     * @param {string} mapId - Map ID
     */
    clearMapPosition(mapId) {
        delete this.lastMapPositions[mapId];
    }
    
    /**
     * Check if a map has been visited
     * @param {string} mapId - Map ID
     * @returns {boolean}
     */
    hasVisitedMap(mapId) {
        return this.lastMapPositions.hasOwnProperty(mapId);
    }
    
    // === Offline Progress Tracking (NEW v2.4.0) ===
    
    /**
     * Update the last active timestamp
     * Called when saving the game to track when player was last active
     */
    updateLastActiveTimestamp() {
        this.lastActiveTimestamp = Date.now();
    }
    
    // === Inventory ===
    
    addItem(item) {
        if (this.inventory.length >= this.maxInventory) {
            return { success: false, reason: 'Inventory full' };
        }
        
        this.inventory.push(item);
        
        eventBus.emit(GameEvents.ITEM_ACQUIRED, {
            character: this,
            item: item
        });
        
        return { success: true };
    }
    
    removeItem(itemId) {
        const index = this.inventory.findIndex(i => i.id === itemId);
        if (index === -1) return null;
        
        return this.inventory.splice(index, 1)[0];
    }
    
    /**
     * Alias for addItem - maintains backward compatibility
     */
    addToInventory(item) {
        return this.addItem(item);
    }
    
    /**
     * Alias for removeItem - maintains backward compatibility
     */
    removeFromInventory(itemId) {
        return this.removeItem(itemId);
    }
    
    addGold(amount) {
        this.gold += amount;
        
        eventBus.emit(GameEvents.GOLD_CHANGED, {
            character: this,
            change: amount,
            newTotal: this.gold
        });
    }
    
    // === AETHER CURRENCY (NEW v2.3.0) ===
    
    /**
     * Add Aether to character's currency
     * @param {number} amount - Amount of Aether to add
     * @returns {number} New Aether total
     */
    addAether(amount) {
        if (amount <= 0) return this.aether;
        this.aether += amount;
        eventBus.emit(GameEvents.AETHER_CHANGED, {
            character: this,
            amount: amount,
            total: this.aether,
            type: 'gain'
        });
        return this.aether;
    }
    
    /**
     * Spend Aether from character's currency
     * @param {number} amount - Amount of Aether to spend
     * @returns {boolean} True if successful, false if insufficient
     */
    spendAether(amount) {
        if (amount <= 0) return true;
        if (this.aether < amount) return false;
        this.aether -= amount;
        eventBus.emit(GameEvents.AETHER_CHANGED, {
            character: this,
            amount: -amount,
            total: this.aether,
            type: 'spend'
        });
        return true;
    }
    
    /**
     * Check if character has enough Aether
     * @param {number} amount - Amount to check
     * @returns {boolean} True if character has enough
     */
    hasAether(amount) {
        return this.aether >= amount;
    }
    
    // === HOUSING MATERIALS (NEW v2.5.0) ===
    
    /**
     * Add material to character's materials inventory
     * @param {string} materialId - ID of the material
     * @param {number} amount - Amount to add
     * @returns {number} New total for this material
     */
    addMaterial(materialId, amount = 1) {
        if (!materialId || amount <= 0) return this.materials[materialId] || 0;
        
        this.materials[materialId] = (this.materials[materialId] || 0) + amount;
        
        eventBus.emit(GameEvents.MATERIAL_CHANGED, {
            character: this,
            materialId,
            amount: amount,
            total: this.materials[materialId],
            type: 'gain'
        });
        
        return this.materials[materialId];
    }
    
    /**
     * Spend material from character's materials inventory
     * @param {string} materialId - ID of the material
     * @param {number} amount - Amount to spend
     * @returns {boolean} True if successful, false if insufficient
     */
    spendMaterial(materialId, amount = 1) {
        if (!materialId || amount <= 0) return true;
        
        const current = this.materials[materialId] || 0;
        if (current < amount) return false;
        
        this.materials[materialId] = current - amount;
        
        // Clean up zero entries
        if (this.materials[materialId] <= 0) {
            delete this.materials[materialId];
        }
        
        eventBus.emit(GameEvents.MATERIAL_CHANGED, {
            character: this,
            materialId,
            amount: -amount,
            total: this.materials[materialId] || 0,
            type: 'spend'
        });
        
        return true;
    }
    
    /**
     * Check if character has enough of a material
     * @param {string} materialId - ID of the material
     * @param {number} amount - Amount to check
     * @returns {boolean} True if character has enough
     */
    hasMaterial(materialId, amount = 1) {
        return (this.materials[materialId] || 0) >= amount;
    }
    
    /**
     * Get current count of a material
     * @param {string} materialId - ID of the material
     * @returns {number} Current amount
     */
    getMaterialCount(materialId) {
        return this.materials[materialId] || 0;
    }
    
    /**
     * Get all materials as an object
     * @returns {Object} Materials object { materialId: quantity }
     */
    getAllMaterials() {
        return { ...this.materials };
    }
    
    /**
     * Spend multiple materials at once (atomic - all or nothing)
     * @param {Object} materialCosts - Object { materialId: amount, ... }
     * @returns {boolean} True if successful, false if insufficient
     */
    spendMaterials(materialCosts) {
        // First check if we have all materials
        for (const [materialId, amount] of Object.entries(materialCosts)) {
            if (!this.hasMaterial(materialId, amount)) {
                return false;
            }
        }
        
        // Spend all materials
        for (const [materialId, amount] of Object.entries(materialCosts)) {
            this.spendMaterial(materialId, amount);
        }
        
        return true;
    }
    
    // === HOUSING STRUCTURE LEVELS (NEW v2.5.0) ===
    
    /**
     * Get the level of a housing structure
     * @param {string} structureId - ID of the structure
     * @returns {number} Current level (0 if not built)
     */
    getHousingLevel(structureId) {
        return this.housingLevels[structureId] || 0;
    }
    
    /**
     * Set the level of a housing structure
     * @param {string} structureId - ID of the structure
     * @param {number} level - New level
     */
    setHousingLevel(structureId, level) {
        const oldLevel = this.housingLevels[structureId] || 0;
        this.housingLevels[structureId] = level;
        
        eventBus.emit(GameEvents.HOUSING_UPGRADED, {
            character: this,
            structureId,
            oldLevel,
            newLevel: level
        });
    }
    
    /**
     * Increment a housing structure's level by 1
     * @param {string} structureId - ID of the structure
     * @returns {number} New level
     */
    upgradeHousingStructure(structureId) {
        const newLevel = (this.housingLevels[structureId] || 0) + 1;
        this.setHousingLevel(structureId, newLevel);
        this._recalculateHousingBuffs();
        return newLevel;
    }
    
    /**
     * Get total combined level of all housing structures
     * @returns {number} Sum of all structure levels
     */
    getTotalHousingLevel() {
        return Object.values(this.housingLevels).reduce((sum, level) => sum + level, 0);
    }
    
    /**
     * Get average level of all housing structures
     * @returns {number} Average level
     */
    getAverageHousingLevel() {
        const levels = Object.values(this.housingLevels);
        if (levels.length === 0) return 0;
        const total = levels.reduce((sum, level) => sum + level, 0);
        return total / levels.length;
    }
    
    // === BANK VAULT SYSTEM (NEW v2.9.0) ===
    
    /**
     * Deposit gold into the bank
     * @param {number} amount - Amount of gold to deposit
     * @returns {Object} { success: boolean, reason?: string }
     */
    depositGold(amount) {
        if (amount <= 0) {
            return { success: false, reason: 'Invalid amount' };
        }
        if (this.gold < amount) {
            return { success: false, reason: 'Insufficient gold' };
        }
        
        this.gold -= amount;
        this.bankGold += amount;
        
        eventBus.emit(GameEvents.BANK_GOLD_CHANGED, {
            character: this,
            amount: amount,
            bankTotal: this.bankGold,
            walletTotal: this.gold,
            type: 'deposit'
        });
        
        return { success: true, newBankBalance: this.bankGold, newWalletBalance: this.gold };
    }
    
    /**
     * Withdraw gold from the bank
     * @param {number} amount - Amount of gold to withdraw
     * @returns {Object} { success: boolean, reason?: string }
     */
    withdrawGold(amount) {
        if (amount <= 0) {
            return { success: false, reason: 'Invalid amount' };
        }
        if (this.bankGold < amount) {
            return { success: false, reason: 'Insufficient bank balance' };
        }
        
        this.bankGold -= amount;
        this.gold += amount;
        
        eventBus.emit(GameEvents.BANK_GOLD_CHANGED, {
            character: this,
            amount: amount,
            bankTotal: this.bankGold,
            walletTotal: this.gold,
            type: 'withdraw'
        });
        
        return { success: true, newBankBalance: this.bankGold, newWalletBalance: this.gold };
    }
    
    /**
     * Get the number of used vault slots
     * @returns {number} Number of items in vault
     */
    getBankVaultUsed() {
        return this.bankVault.length;
    }
    
    /**
     * Check if an item can be deposited into the vault
     * @param {Object} item - Item to check
     * @returns {Object} { canDeposit: boolean, reason?: string }
     */
    canDepositItem(item) {
        if (!item) {
            return { canDeposit: false, reason: 'No item specified' };
        }
        if (this.bankVault.length >= this.bankVaultSlots) {
            return { canDeposit: false, reason: 'Vault is full' };
        }
        return { canDeposit: true };
    }
    
    /**
     * Deposit an item into the bank vault
     * @param {string} itemId - ID of the item to deposit
     * @returns {Object} { success: boolean, reason?: string }
     */
    depositItem(itemId) {
        const item = this.inventory.find(i => i.id === itemId);
        if (!item) {
            return { success: false, reason: 'Item not found in inventory' };
        }
        
        const canDeposit = this.canDepositItem(item);
        if (!canDeposit.canDeposit) {
            return { success: false, reason: canDeposit.reason };
        }
        
        // Remove from inventory
        this.removeItem(itemId);
        
        // Add to vault
        this.bankVault.push(item);
        
        eventBus.emit(GameEvents.BANK_ITEM_DEPOSITED, {
            character: this,
            item: item,
            vaultUsed: this.bankVault.length,
            vaultCapacity: this.bankVaultSlots
        });
        
        return { success: true, item: item };
    }
    
    /**
     * Withdraw an item from the bank vault
     * @param {string} itemId - ID of the item to withdraw
     * @returns {Object} { success: boolean, reason?: string, item?: Object }
     */
    withdrawItem(itemId) {
        const itemIndex = this.bankVault.findIndex(i => i.id === itemId);
        if (itemIndex === -1) {
            return { success: false, reason: 'Item not found in vault' };
        }
        
        if (this.inventory.length >= this.maxInventory) {
            return { success: false, reason: 'Inventory is full' };
        }
        
        // Remove from vault
        const item = this.bankVault.splice(itemIndex, 1)[0];
        
        // Add to inventory
        this.inventory.push(item);
        
        eventBus.emit(GameEvents.BANK_ITEM_WITHDRAWN, {
            character: this,
            item: item,
            vaultUsed: this.bankVault.length,
            vaultCapacity: this.bankVaultSlots
        });
        
        return { success: true, item: item };
    }
    
    /**
     * Expand the vault capacity
     * @param {number} additionalSlots - Number of slots to add
     * @param {number} cost - Gold cost for expansion
     * @returns {Object} { success: boolean, reason?: string, newCapacity?: number }
     */
    expandVault(additionalSlots, cost) {
        if (this.gold < cost) {
            return { success: false, reason: 'Insufficient gold' };
        }
        
        const newCapacity = this.bankVaultSlots + additionalSlots;
        if (newCapacity > BankConfig.maxVaultSlots) {
            return { success: false, reason: 'Maximum vault capacity reached' };
        }
        
        this.gold -= cost;
        this.bankVaultSlots = newCapacity;
        
        eventBus.emit(GameEvents.BANK_VAULT_EXPANDED, {
            character: this,
            additionalSlots: additionalSlots,
            newCapacity: this.bankVaultSlots,
            cost: cost
        });
        
        return { success: true, newCapacity: this.bankVaultSlots };
    }
    
    /**
     * Get vault item by ID
     * @param {string} itemId - ID of the item
     * @returns {Object|null} Item or null if not found
     */
    getVaultItem(itemId) {
        return this.bankVault.find(i => i.id === itemId) || null;
    }
    
    // === POTION SYSTEM ===
    
    /**
     * Equip a potion to the appropriate slot
     * @param {Object} potionItem - Potion item from inventory
     * @returns {Object} { success: boolean, reason?: string }
     */
    equipPotion(potionItem) {
        if (!potionItem || !potionItem.baseId) {
            return { success: false, reason: 'Invalid potion item' };
        }
        
        const potionDef = getPotion(potionItem.baseId);
        if (!potionDef) {
            return { success: false, reason: 'Unknown potion type' };
        }
        
        // Determine slot based on potion type (health or mana)
        // Check potionType property first, then fall back to checking effect object
        const potionType = potionDef.potionType || potionItem.potionType ||
                          (potionDef.effect?.heal ? 'health' : null) ||
                          (potionDef.effect?.mana ? 'mana' : null);
        
        const slot = potionType === 'health' ? 'potionHealth' : 
                     potionType === 'mana' ? 'potionMana' : null;
        
        if (!slot) {
            return { success: false, reason: 'Unsupported potion type' };
        }
        
        // Check if same type already equipped - stack if so
        const currentEquipped = this.equipment[slot];
        if (currentEquipped && currentEquipped.baseId === potionItem.baseId) {
            // Stack potions
            currentEquipped.quantity = (currentEquipped.quantity || 1) + (potionItem.quantity || 1);
            // Remove from inventory
            this.removeItem(potionItem.id);
            return { success: true, stacked: true };
        }
        
        // If different potion equipped, swap
        if (currentEquipped) {
            this.inventory.push(currentEquipped);
        }
        
        // Equip new potion
        this.equipment[slot] = potionItem;
        this.removeItem(potionItem.id);
        
        return { success: true };
    }
    
    /**
     * Unequip a potion back to inventory
     * @param {string} potionType - 'health' or 'mana'
     * @returns {Object} { success: boolean, reason?: string }
     */
    unequipPotion(potionType) {
        const slot = potionType === 'health' ? 'potionHealth' : 
                     potionType === 'mana' ? 'potionMana' : null;
        
        if (!slot) {
            return { success: false, reason: 'Invalid potion type' };
        }
        
        const potion = this.equipment[slot];
        if (!potion) {
            return { success: false, reason: 'No potion equipped' };
        }
        
        if (this.inventory.length >= this.maxInventory) {
            return { success: false, reason: 'Inventory full' };
        }
        
        this.inventory.push(potion);
        this.equipment[slot] = null;
        
        return { success: true };
    }
    
    /**
     * Use an equipped potion
     * @param {string} potionType - 'health' or 'mana'
     * @returns {Object} { success: boolean, reason?: string, amountRestored?: number }
     */
    usePotion(potionType) {
        const slot = potionType === 'health' ? 'potionHealth' : 
                     potionType === 'mana' ? 'potionMana' : null;
        
        if (!slot) {
            return { success: false, reason: 'Invalid potion type' };
        }
        
        const potion = this.equipment[slot];
        if (!potion) {
            return { success: false, reason: 'No potion equipped' };
        }
        
        // Check cooldown
        const now = Date.now();
        const cooldownEnd = potionType === 'health' ? this.healthPotionCooldownEnd : this.manaPotionCooldownEnd;
        if (now < cooldownEnd) {
            const remaining = Math.ceil((cooldownEnd - now) / 1000);
            return { success: false, reason: `Potion on cooldown (${remaining}s)` };
        }
        
        // Get potion definition for effect values
        const potionDef = getPotion(potion.baseId);
        if (!potionDef) {
            return { success: false, reason: 'Unknown potion' };
        }
        
        let amountRestored = 0;
        
        // Apply effect (with level scaling v3.2.0)
        const levelScale = GameConfig.combat.potions?.levelScaling || 0;
        const levelMultiplier = 1 + (this.level - 1) * levelScale;
        
        if (potionType === 'health') {
            const baseHeal = potionDef.effect?.heal || potionDef.value || 50;
            const healAmount = Math.floor(baseHeal * levelMultiplier);
            amountRestored = this.heal(healAmount, 'potion');
            this.healthPotionCooldownEnd = now + (potionDef.cooldown || 5000);
        } else if (potionType === 'mana') {
            const baseMana = potionDef.effect?.mana || potionDef.value || 30;
            const manaAmount = Math.floor(baseMana * levelMultiplier);
            amountRestored = this.restoreMana(manaAmount, 'potion');
            this.manaPotionCooldownEnd = now + (potionDef.cooldown || 5000);
        }
        
        // Consume one charge
        potion.quantity = (potion.quantity || 1) - 1;
        if (potion.quantity <= 0) {
            this.equipment[slot] = null;
        }
        
        eventBus.emit(GameEvents.POTION_USED, {
            character: this,
            potionType,
            amountRestored
        });
        
        return { success: true, amountRestored };
    }
    
    /**
     * Check and use potions automatically based on settings
     */
    checkAutoPotions() {
        // Check health potion
        if (this.potionSettings.autoHealthEnabled && this.equipment.potionHealth) {
            const healthPercent = this.currentHealth / this.maxHealth;
            if (healthPercent <= this.potionSettings.autoHealthThreshold) {
                const now = Date.now();
                if (now >= this.healthPotionCooldownEnd) {
                    this.usePotion('health');
                }
            }
        }
        
        // Check mana potion
        if (this.potionSettings.autoManaEnabled && this.equipment.potionMana) {
            const manaPercent = this.currentMana / this.maxMana;
            if (manaPercent <= this.potionSettings.autoManaThreshold) {
                const now = Date.now();
                if (now >= this.manaPotionCooldownEnd) {
                    this.usePotion('mana');
                }
            }
        }
    }
    
    // === POTION CONVENIENCE METHODS (for BattleMapUI compatibility) ===
    
    /**
     * Check if health potion can be used
     * @returns {boolean}
     */
    canUseHealthPotion() {
        const potion = this.equipment.potionHealth;
        if (!potion || (potion.quantity || 0) <= 0) return false;
        if (Date.now() < this.healthPotionCooldownEnd) return false;
        if (this.currentHealth >= this.maxHealth) return false;
        return true;
    }
    
    /**
     * Check if mana potion can be used
     * @returns {boolean}
     */
    canUseManaPotion() {
        const potion = this.equipment.potionMana;
        if (!potion || (potion.quantity || 0) <= 0) return false;
        if (Date.now() < this.manaPotionCooldownEnd) return false;
        if (this.currentMana >= this.maxMana) return false;
        return true;
    }
    
    /**
     * Use a health potion (convenience wrapper)
     * @returns {Object} { success: boolean, healed: number, reason: string }
     */
    useHealthPotion() {
        if (!this.canUseHealthPotion()) {
            return { success: false, healed: 0, reason: 'Cannot use health potion' };
        }
        
        const result = this.usePotion('health');
        return { 
            success: result.success, 
            healed: result.amountRestored || 0, 
            reason: result.reason || '' 
        };
    }
    
    /**
     * Use a mana potion (convenience wrapper)
     * @returns {Object} { success: boolean, restored: number, reason: string }
     */
    useManaPotion() {
        if (!this.canUseManaPotion()) {
            return { success: false, restored: 0, reason: 'Cannot use mana potion' };
        }
        
        const result = this.usePotion('mana');
        return { 
            success: result.success, 
            restored: result.amountRestored || 0, 
            reason: result.reason || '' 
        };
    }
    
    /**
     * Get remaining cooldown for health potion in seconds
     * @returns {number}
     */
    getHealthPotionCooldown() {
        const now = Date.now();
        return Math.max(0, Math.ceil((this.healthPotionCooldownEnd - now) / 1000));
    }
    
    /**
     * Get remaining cooldown for mana potion in seconds
     * @returns {number}
     */
    getManaPotionCooldown() {
        const now = Date.now();
        return Math.max(0, Math.ceil((this.manaPotionCooldownEnd - now) / 1000));
    }
    
    /**
     * Get equipped health potion quantity
     * @returns {number}
     */
    getHealthPotionCount() {
        return this.equipment.potionHealth?.quantity || 0;
    }
    
    /**
     * Get equipped mana potion quantity
     * @returns {number}
     */
    getManaPotionCount() {
        return this.equipment.potionMana?.quantity || 0;
    }
    
    /**
     * Get equipped health potion info (for cooldown display)
     * @returns {Object|null} The equipped health potion or null
     */
    getHealthPotionInfo() {
        return this.equipment.potionHealth || null;
    }
    
    /**
     * Get equipped mana potion info (for cooldown display)
     * @returns {Object|null} The equipped mana potion or null
     */
    getManaPotionInfo() {
        return this.equipment.potionMana || null;
    }
    
    // === EQUIPMENT MANAGEMENT ===
    
    /**
     * Check if an item can be equipped
     * @param {Object} item - Item to check
     * @returns {Object} { canEquip: boolean, reason?: string }
     */
    canEquip(item) {
        if (!item) {
            return { canEquip: false, reason: 'No item specified' };
        }
        
        if (!item.slot) {
            return { canEquip: false, reason: 'Item has no equipment slot' };
        }
        
        // Check if trying to equip offHand while a two-handed weapon is equipped
        if (item.slot === 'offHand') {
            const mainHandWeapon = this.equipment.mainHand;
            if (mainHandWeapon && mainHandWeapon.twoHanded) {
                return { canEquip: false, reason: 'Cannot equip off-hand with a two-handed weapon' };
            }
        }
        
        // No class restrictions - any character can equip any item (v1.3.0)
        return { canEquip: true };
    }
    
    /**
     * Equip an item from inventory
     * @param {string} itemId - ID of item to equip
     * @returns {Object} { success: boolean, reason?: string, unequipped?: Object, offHandUnequipped?: Object }
     */
    equipItem(itemId) {
        const itemIndex = this.inventory.findIndex(i => i.id === itemId);
        if (itemIndex === -1) {
            return { success: false, reason: 'Item not in inventory' };
        }
        
        const item = this.inventory[itemIndex];
        
        // Handle potions separately
        if (item.type === 'consumable' || item.subtype === 'potion') {
            return this.equipPotion(item);
        }
        
        const canEquipResult = this.canEquip(item);
        if (!canEquipResult.canEquip) {
            return { success: false, reason: canEquipResult.reason };
        }
        
        // Determine slot
        let slot = item.slot;
        
        // Handle ring slots specially (use first empty, or ring1)
        if (slot === 'ring') {
            if (!this.equipment.ring1) {
                slot = 'ring1';
            } else if (!this.equipment.ring2) {
                slot = 'ring2';
            } else {
                slot = 'ring1'; // Default to replacing ring1
            }
        }
        
        // Remove from inventory
        this.inventory.splice(itemIndex, 1);
        
        // Handle two-handed weapons: auto-unequip offHand
        let offHandUnequipped = null;
        if (slot === 'mainHand' && item.twoHanded && this.equipment.offHand) {
            offHandUnequipped = this.equipment.offHand;
            this.inventory.push(offHandUnequipped);
            this.equipment.offHand = null;
            
            eventBus.emit(GameEvents.ITEM_UNEQUIPPED, {
                character: this,
                item: offHandUnequipped,
                slot: 'offHand',
                reason: 'two-handed weapon equipped'
            });
        }
        
        // Swap with currently equipped item
        const unequipped = this.equipment[slot];
        if (unequipped) {
            this.inventory.push(unequipped);
        }
        
        this.equipment[slot] = item;
        
        eventBus.emit(GameEvents.ITEM_EQUIPPED, {
            character: this,
            item: item,
            slot: slot,
            unequipped: unequipped,
            offHandUnequipped: offHandUnequipped
        });
        
        return { success: true, unequipped: unequipped, offHandUnequipped: offHandUnequipped };
    }
    
    /**
     * Unequip an item from a slot
     * @param {string} slot - Equipment slot to unequip from
     * @returns {Object} { success: boolean, reason?: string, item?: Object }
     */
    unequipItem(slot) {
        const item = this.equipment[slot];
        if (!item) {
            return { success: false, reason: 'No item in that slot' };
        }
        
        if (this.inventory.length >= this.maxInventory) {
            return { success: false, reason: 'Inventory full' };
        }
        
        this.inventory.push(item);
        this.equipment[slot] = null;
        
        eventBus.emit(GameEvents.ITEM_UNEQUIPPED, {
            character: this,
            item: item,
            slot: slot
        });
        
        return { success: true, item: item };
    }
    
    // === BUYING AND SELLING ===
    
    /**
     * Buy an item from a shop
     * @param {Object} item - Item to buy
     * @param {number} price - Price to pay
     * @returns {Object} { success: boolean, reason?: string }
     */
    buyItem(item, price) {
        if (this.gold < price) {
            return { success: false, reason: 'Not enough gold' };
        }
        
        if (this.inventory.length >= this.maxInventory) {
            return { success: false, reason: 'Inventory full' };
        }
        
        this.gold -= price;
        this.inventory.push(item);
        
        eventBus.emit(GameEvents.ITEM_PURCHASED, {
            character: this,
            item: item,
            price: price
        });
        
        return { success: true };
    }
    
    /**
     * Sell an item
     * @param {string} itemId - ID of item to sell
     * @returns {Object} { success: boolean, reason?: string, gold?: number }
     */
    sellItem(itemId) {
        const itemIndex = this.inventory.findIndex(i => i.id === itemId);
        if (itemIndex === -1) {
            return { success: false, reason: 'Item not in inventory' };
        }
        
        const item = this.inventory[itemIndex];
        const sellPrice = calculateSellPrice(item);
        
        this.inventory.splice(itemIndex, 1);
        this.gold += sellPrice;
        
        eventBus.emit(GameEvents.ITEM_SOLD, {
            character: this,
            item: item,
            price: sellPrice
        });
        
        return { success: true, gold: sellPrice };
    }
    
    /**
     * Get sell value of an item
     * @param {Object} item - Item to evaluate
     * @returns {number} Gold value
     */
    getSellValue(item) {
        return calculateSellPrice(item);
    }
    
    // === SKILL MANAGEMENT (NEW v1.7.0) ===
    
    /**
     * Learn a skill
     * @param {Object} skill - Skill to learn
     * @returns {Object} { success: boolean, reason: string }
     */
    learnSkill(skill) {
        if (!skill || !skill.baseId) {
            return { success: false, reason: 'Invalid skill' };
        }
        
        if (this.learnedSkills[skill.baseId]) {
            return { success: false, reason: 'Skill already learned' };
        }
        
        this.learnedSkills[skill.baseId] = skill;
        
        // Recalculate passive bonuses if a passive skill was learned
        this._recalculatePassiveBonuses();
        
        eventBus.emit(GameEvents.SKILL_LEARNED, {
            character: this,
            skill
        });
        
        return { success: true, reason: '' };
    }
    
    /**
     * Equip a skill to an active slot
     * @param {string} skillId - ID of the skill to equip
     * @param {number} slot - Slot index (0-4)
     * @returns {Object} { success: boolean, reason: string }
     */
    equipSkill(skillId, slot) {
        // Validate slot
        if (slot < 0 || slot >= GameConfig.character.maxActiveSkills) {
            return { success: false, reason: 'Invalid skill slot' };
        }
        
        // Find the skill in learned skills (object keyed by skillId)
        const skill = this.learnedSkills[skillId];
        if (!skill) {
            return { success: false, reason: 'Skill not learned' };
        }
        
        // Check if it's an active skill type (not passive)
        if (skill.type === 'passive') {
            return { success: false, reason: 'Passive skills cannot be equipped to the skill bar' };
        }
        
        // Check if skill is already equipped in another slot
        const existingSlot = this.activeSkills.findIndex(s => s && (s.id === skillId || s.baseId === skillId));
        if (existingSlot !== -1 && existingSlot !== slot) {
            // Remove from old slot
            this.activeSkills[existingSlot] = null;
        }
        
        // Equip to the slot
        this.activeSkills[slot] = skill;
        
        eventBus.emit(GameEvents.SKILL_EQUIPPED, {
            character: this,
            skill,
            slot
        });
        
        return { success: true, reason: '' };
    }
    
    /**
     * Unequip a skill from an active slot
     * @param {number} slot - Slot index (0-4)
     * @returns {Object} { success: boolean, reason: string }
     */
    unequipSkill(slot) {
        // Validate slot
        if (slot < 0 || slot >= GameConfig.character.maxActiveSkills) {
            return { success: false, reason: 'Invalid skill slot' };
        }
        
        const skill = this.activeSkills[slot];
        if (!skill) {
            return { success: false, reason: 'No skill in that slot' };
        }
        
        this.activeSkills[slot] = null;
        
        eventBus.emit(GameEvents.SKILL_UNEQUIPPED, {
            character: this,
            skill,
            slot
        });
        
        return { success: true, reason: '' };
    }
    
    /**
     * Check if a skill is currently equipped
     * @param {string} skillId - ID of the skill
     * @returns {number} Slot index (0-4) or -1 if not equipped
     */
    getSkillSlot(skillId) {
        return this.activeSkills.findIndex(s => s && (s.id === skillId || s.baseId === skillId));
    }
    
    /**
     * Get all learned active skills (excludes passives)
     * @returns {Array} Array of active-type skills
     */
    getLearnedActiveSkills() {
        return Object.values(this.learnedSkills).filter(s => s && s.type !== 'passive');
    }
    
    // === Status Effects ===
    
    addStatusEffect(effect) {
        // Check if already has this effect
        const existing = this.statusEffects.find(e => e.id === effect.id);
        if (existing && !effect.stacks) {
            // Refresh duration
            existing.remainingDuration = effect.duration;
            return;
        }
        
        this.statusEffects.push({
            ...effect,
            remainingDuration: effect.duration
        });
        
        eventBus.emit(GameEvents.STATUS_APPLIED, {
            target: this,
            effect
        });
    }
    
    removeStatusEffect(effectId) {
        const index = this.statusEffects.findIndex(e => e.id === effectId);
        if (index === -1) return;
        
        const effect = this.statusEffects.splice(index, 1)[0];
        eventBus.emit(GameEvents.STATUS_REMOVED, {
            target: this,
            effect
        });
    }
    
    hasStatusEffect(effectId) {
        return this.statusEffects.some(e => e.id === effectId);
    }
    
    isStunned() {
        return this.statusEffects.some(e => e.type === 'stun');
    }
    
    isSlowed() {
        return this.statusEffects.some(e => e.type === 'slow');
    }
    
    // === Serialization ===
    
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            classId: this.classId,
            raceId: this.raceId,
            alignment: this.alignment,
            motivation: this.motivation,
            sex: this.sex,
            appearance: this.appearance,
            level: this.level,
            xp: this.xp,
            unspentStatPoints: this.unspentStatPoints,
            unspentSkillPoints: this.unspentSkillPoints,
            baseStats: this.baseStats,
            currentHealth: this.currentHealth,
            currentMana: this.currentMana,
            position: this.position,
            currentMapId: this.currentMapId,
            lastMapPositions: this.lastMapPositions,
            equipment: this.equipment,
            inventory: this.inventory,
            maxInventory: this.maxInventory,
            gold: this.gold,
            aether: this.aether,
            // Bank vault system (NEW v2.9.0)
            bankGold: this.bankGold,
            bankVault: this.bankVault,
            bankVaultSlots: this.bankVaultSlots,
            // Housing system (NEW v2.5.0)
            housingLevels: this.housingLevels,
            materials: this.materials,
            // Housing staff + timed upgrades (NEW v3.5.0)
            hiredStaff:      this.hiredStaff      || {},
            pendingUpgrades: this.pendingUpgrades || {},
            // Skills
            learnedSkills: this.learnedSkills,
            activeSkills: this.activeSkills,
            autoBattleEnabled: this.autoBattleEnabled,
            autoLootEnabled: this.autoLootEnabled,
            autoBattleTimer: this.autoBattleTimer,
            // Potion system
            potionSettings: this.potionSettings,
            healthPotionCooldownEnd: this.healthPotionCooldownEnd,
            manaPotionCooldownEnd: this.manaPotionCooldownEnd,
            // Offline progress
            lastActiveTimestamp: this.lastActiveTimestamp
        };
    }
    
    static fromJSON(data) {
        // Reconstruct skills and items before creating character
        const processedData = { ...data };
        
        // === Reconstruct Skills ===
        if (data.learnedSkills) {
            processedData.learnedSkills = {};
            for (const [skillId, skillData] of Object.entries(data.learnedSkills)) {
                const skill = Skill.fromData(skillData);
                if (skill) {
                    processedData.learnedSkills[skillId] = skill;
                }
            }
        }
        
        if (data.activeSkills) {
            processedData.activeSkills = data.activeSkills.map(skillData => {
                if (!skillData) return null;
                return Skill.fromData(skillData);
            });
        }
        
        // === Reconstruct Equipment Items ===
        if (data.equipment) {
            processedData.equipment = {};
            const equipSlots = ['head', 'necklace', 'ring1', 'ring2', 'body', 'cape', 'boots', 'mainHand', 'offHand', 'potionHealth', 'potionMana'];
            
            for (const slot of equipSlots) {
                const itemData = data.equipment[slot];
                if (itemData) {
                    // Use Item.fromData to reconstruct full Item instances
                    processedData.equipment[slot] = Item.fromData(itemData);
                } else {
                    processedData.equipment[slot] = null;
                }
            }
        }
        
        // === Reconstruct Inventory Items ===
        if (data.inventory && Array.isArray(data.inventory)) {
            processedData.inventory = data.inventory.map(itemData => {
                if (!itemData) return null;
                // Use Item.fromData to reconstruct full Item instances
                return Item.fromData(itemData);
            }).filter(item => item !== null);
        }
        
        // === Reconstruct Bank Vault Items (NEW v2.9.0) ===
        if (data.bankVault && Array.isArray(data.bankVault)) {
            processedData.bankVault = data.bankVault.map(itemData => {
                if (!itemData) return null;
                return Item.fromData(itemData);
            }).filter(item => item !== null);
        }
        
        const character = new Character(processedData);
        // Passive bonuses are already calculated in constructor,
        // but recalculate to ensure consistency after full reconstruction
        character._recalculatePassiveBonuses();
        character._recalculateHousingBuffs();
        return character;
    }
}

export default Character;
