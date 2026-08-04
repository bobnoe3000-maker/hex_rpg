/**
 * @file HousingSystem.js
 * @description Core business logic for the player housing system.
 *              Handles buff calculations with diminishing returns, upgrade costs,
 *              and aggregated buff totals for character stats.
 * 
 * @location systems/HousingSystem.js
 * @usage Imported by HousingUI for display, main.js for buff application
 * @dependencies 
 *   - housingConfig.js (config/housingConfig.js)
 *   - EventBus (systems/EventBus.js)
 * 
 * @version 1.0.0
 * @changelog
 *   - v1.0.0 (2026-01-26): Initial implementation with buff calculations,
 *                          upgrade costs, and character integration
 */

import { 
    HousingSettings, 
    HousingMaterials, 
    HousingStructures,
    BuffLabels,
    BuffFormats,
    HomeTiers,
    MaterialTierRequirements,
    getNarrativeTier,
    getHomeTier,
    getStructure,
    getMaterial,
    getAllStructureIds,
    getRandomAmbientText,
    getRandomHomeAmbientText,
    getVisualTierClass
} from '../config/housingConfig.js';

import { eventBus, GameEvents } from './EventBus.js';

/**
 * HousingSystem - Singleton system for managing player housing
 */
class HousingSystem {
    constructor() {
        this._initialized = false;
        this._character = null;
    }
    
    /**
     * Initialize the housing system with a character reference
     * @param {Character} character - The player character
     */
    init(character) {
        this._character = character;
        this._initialized = true;
        
        // Ensure character has housing data
        if (!character.housingLevels) {
            character.housingLevels = {
                hearth: 0,
                training: 0,
                armory: 0,
                garden: 0,
                shrine: 0,
                trophy: 0
            };
        }
        
        if (!character.materials) {
            character.materials = {};
        }
    }
    
    // ===========================================
    // BUFF CALCULATIONS
    // ===========================================
    
    /**
     * Calculate the total buff value for a given base value and level
     * Uses geometric diminishing returns for levels 1-100,
     * then flat increments after level 100
     * 
     * @param {number} baseValue - Base buff value per level
     * @param {number} level - Current structure level
     * @param {number} diminishingFactor - Decay factor (default from settings)
     * @returns {number} Total buff value
     */
    calculateBuff(baseValue, level, diminishingFactor = HousingSettings.diminishingFactor) {
        if (level <= 0) return 0;
        
        if (level <= 100) {
            // Geometric series with diminishing returns
            // Sum = baseValue * (1 - factor^level) / (1 - factor)
            let total = 0;
            for (let i = 0; i < level; i++) {
                total += baseValue * Math.pow(diminishingFactor, i);
            }
            return total;
        } else {
            // Calculate value at level 100
            let totalAt100 = 0;
            for (let i = 0; i < 100; i++) {
                totalAt100 += baseValue * Math.pow(diminishingFactor, i);
            }
            // Add flat increment for levels beyond 100
            const levelsAfter100 = level - 100;
            const flatBonus = levelsAfter100 * baseValue * HousingSettings.flatBonusAfter100;
            return totalAt100 + flatBonus;
        }
    }
    
    /**
     * Calculate the incremental buff gain for the next level
     * @param {number} baseValue - Base buff value per level
     * @param {number} currentLevel - Current structure level
     * @returns {number} Buff gain from upgrading
     */
    calculateBuffGain(baseValue, currentLevel) {
        const currentBuff = this.calculateBuff(baseValue, currentLevel);
        const nextBuff = this.calculateBuff(baseValue, currentLevel + 1);
        return nextBuff - currentBuff;
    }
    
    /**
     * Get all buffs for a structure at a given level
     * @param {string} structureId - Structure ID
     * @param {number} level - Structure level
     * @returns {Object} Object with buff types as keys and calculated values
     */
    getStructureBuffs(structureId, level) {
        const structure = getStructure(structureId);
        if (!structure || level <= 0) return {};
        
        const buffs = {};
        for (const [buffType, baseValue] of Object.entries(structure.baseBuff)) {
            buffs[buffType] = this.calculateBuff(baseValue, level);
        }
        return buffs;
    }
    
    /**
     * Get all buffs aggregated across all structures for a character
     * @param {Character} character - The player character
     * @returns {Object} Combined buffs from all structures
     */
    getAggregatedBuffs(character = this._character) {
        if (!character || !character.housingLevels) return {};
        
        const aggregated = {};
        
        for (const structureId of getAllStructureIds()) {
            const level = character.housingLevels[structureId] || 0;
            const buffs = this.getStructureBuffs(structureId, level);
            
            for (const [buffType, value] of Object.entries(buffs)) {
                aggregated[buffType] = (aggregated[buffType] || 0) + value;
            }
        }
        
        return aggregated;
    }
    
    /**
     * Format a buff value for display
     * @param {string} buffType - Type of buff
     * @param {number} value - Buff value
     * @returns {string} Formatted string (e.g., "+5.2%")
     */
    formatBuffValue(buffType, value) {
        const format = BuffFormats[buffType] || { suffix: '', decimals: 1 };
        const formatted = value.toFixed(format.decimals);
        return `+${formatted}${format.suffix}`;
    }
    
    /**
     * Get the display label for a buff type
     * @param {string} buffType - Type of buff
     * @returns {string} Display label
     */
    getBuffLabel(buffType) {
        return BuffLabels[buffType] || buffType;
    }
    
    // ===========================================
    // COST CALCULATIONS
    // ===========================================
    
    /**
     * Calculate the upgrade cost for a structure at a given level
     * @param {string} structureId - Structure ID
     * @param {number} currentLevel - Current level (cost is for upgrading TO level+1)
     * @returns {Object} { gold: number, materials: { materialId: amount } }
     */
    calculateUpgradeCost(structureId, currentLevel) {
        const structure = getStructure(structureId);
        if (!structure) return { gold: 0, materials: {} };
        
        const baseCost = structure.baseCost;
        const level = currentLevel; // Cost for going from currentLevel to currentLevel+1
        
        // Gold scales exponentially
        const goldMultiplier = Math.pow(HousingSettings.goldCostMultiplier, level);
        const gold = Math.floor(baseCost.gold * goldMultiplier);
        
        // Materials scale more slowly (every 5 levels)
        const materialMultiplier = Math.pow(HousingSettings.materialCostMultiplier, Math.floor(level / 5));
        const materials = {};
        
        // Base materials
        for (const [materialId, baseAmount] of Object.entries(baseCost.materials)) {
            materials[materialId] = Math.floor(baseAmount * materialMultiplier);
        }
        
        // Additional tier materials at level thresholds
        if (level >= 25) {
            const req = MaterialTierRequirements.level25;
            materials[req.material] = (materials[req.material] || 0) + Math.floor((level - 15) / 10) * req.baseAmount;
        }
        if (level >= 50) {
            const req = MaterialTierRequirements.level50;
            materials[req.material] = (materials[req.material] || 0) + Math.floor((level - 40) / 10) * req.baseAmount;
        }
        if (level >= 75) {
            const req = MaterialTierRequirements.level75;
            materials[req.material] = (materials[req.material] || 0) + Math.floor((level - 65) / 15) * req.baseAmount;
        }
        if (level >= 100) {
            const req = MaterialTierRequirements.level100;
            materials[req.material] = (materials[req.material] || 0) + Math.floor((level - 90) / 20) * req.baseAmount;
        }
        
        return { gold, materials };
    }
    
    /**
     * Check if a character can afford an upgrade
     * @param {Character} character - The player character
     * @param {string} structureId - Structure ID
     * @returns {Object} { canAfford: boolean, missing: { gold?: number, materials?: Object } }
     */
    canAffordUpgrade(character, structureId) {
        const level = character.housingLevels?.[structureId] || 0;
        const cost = this.calculateUpgradeCost(structureId, level);
        
        const missing = {};
        let canAfford = true;
        
        // Check gold
        if (character.gold < cost.gold) {
            canAfford = false;
            missing.gold = cost.gold - character.gold;
        }
        
        // Check materials
        const missingMaterials = {};
        for (const [materialId, amount] of Object.entries(cost.materials)) {
            const owned = character.getMaterialCount?.(materialId) || character.materials?.[materialId] || 0;
            if (owned < amount) {
                canAfford = false;
                missingMaterials[materialId] = amount - owned;
            }
        }
        
        if (Object.keys(missingMaterials).length > 0) {
            missing.materials = missingMaterials;
        }
        
        return { canAfford, missing, cost };
    }
    
    // ===========================================
    // UPGRADE ACTIONS
    // ===========================================
    
    /**
     * Perform a structure upgrade
     * @param {Character} character - The player character
     * @param {string} structureId - Structure ID
     * @returns {Object} { success: boolean, reason?: string, newLevel?: number }
     */
    upgradeStructure(character, structureId) {
        // Validate structure exists
        const structure = getStructure(structureId);
        if (!structure) {
            return { success: false, reason: 'Invalid structure' };
        }
        
        // Check affordability
        const { canAfford, cost } = this.canAffordUpgrade(character, structureId);
        if (!canAfford) {
            return { success: false, reason: 'Cannot afford upgrade' };
        }
        
        // Deduct gold
        character.gold -= cost.gold;
        
        // Deduct materials
        for (const [materialId, amount] of Object.entries(cost.materials)) {
            if (character.spendMaterial) {
                character.spendMaterial(materialId, amount);
            } else {
                character.materials[materialId] = (character.materials[materialId] || 0) - amount;
                if (character.materials[materialId] <= 0) {
                    delete character.materials[materialId];
                }
            }
        }
        
        // Increment level
        const oldLevel = character.housingLevels[structureId] || 0;
        const newLevel = oldLevel + 1;
        character.housingLevels[structureId] = newLevel;
        
        // Get narrative info
        const oldNarrative = getNarrativeTier(structureId, oldLevel);
        const newNarrative = getNarrativeTier(structureId, newLevel);
        const stageChanged = newNarrative.stageName !== oldNarrative.stageName;
        
        // Emit events
        eventBus.emit(GameEvents.HOUSING_UPGRADED, {
            character,
            structureId,
            oldLevel,
            newLevel,
            stageChanged,
            newStageName: newNarrative.stageName,
            cost
        });
        
        eventBus.emit(GameEvents.SAVE_GAME, { reason: 'housing_upgrade' });
        
        return { 
            success: true, 
            newLevel, 
            stageChanged,
            newNarrative 
        };
    }
    
    // ===========================================
    // HOME INFO
    // ===========================================
    
    /**
     * Get home tier info for a character
     * @param {Character} character - The player character
     * @returns {Object} Home tier data
     */
    getHomeInfo(character = this._character) {
        if (!character || !character.housingLevels) {
            return {
                totalLevel: 0,
                averageLevel: 0,
                tier: HomeTiers[0],
                structureLevels: {}
            };
        }
        
        const levels = Object.values(character.housingLevels);
        const totalLevel = levels.reduce((sum, l) => sum + l, 0);
        const averageLevel = levels.length > 0 ? totalLevel / levels.length : 0;
        const tier = getHomeTier(averageLevel);
        
        return {
            totalLevel,
            averageLevel,
            tier,
            structureLevels: { ...character.housingLevels }
        };
    }
    
    /**
     * Get narrative info for a structure
     * @param {string} structureId - Structure ID
     * @param {number} level - Structure level
     * @returns {Object} Narrative tier data
     */
    getStructureNarrative(structureId, level) {
        return getNarrativeTier(structureId, level);
    }
    
    /**
     * Get structure definition
     * @param {string} structureId - Structure ID
     * @returns {Object} Structure definition
     */
    getStructureDefinition(structureId) {
        return getStructure(structureId);
    }
    
    /**
     * Get material definition
     * @param {string} materialId - Material ID
     * @returns {Object} Material definition
     */
    getMaterialDefinition(materialId) {
        return getMaterial(materialId);
    }
    
    /**
     * Get all structure IDs
     * @returns {string[]} Array of structure IDs
     */
    getAllStructureIds() {
        return getAllStructureIds();
    }
    
    /**
     * Get random ambient text for a structure
     * @param {string} structureId - Structure ID (optional, home if not provided)
     * @returns {string} Random ambient text
     */
    getAmbientText(structureId = null) {
        if (structureId) {
            return getRandomAmbientText(structureId);
        }
        return getRandomHomeAmbientText();
    }
    
    /**
     * Get visual tier class for CSS styling
     * @param {number} level - Structure level
     * @returns {string} CSS class name
     */
    getVisualTierClass(level) {
        return getVisualTierClass(level);
    }
    
    // ===========================================
    // BUFF APPLICATION HELPERS
    // ===========================================
    
    /**
     * Get HP regen bonus percentage
     * @param {Character} character 
     * @returns {number} HP regen bonus (0-100+ range)
     */
    getHpRegenBonus(character = this._character) {
        const buffs = this.getAggregatedBuffs(character);
        return buffs.hpRegen || 0;
    }
    
    /**
     * Get gold find bonus percentage
     * @param {Character} character 
     * @returns {number} Gold find bonus
     */
    getGoldFindBonus(character = this._character) {
        const buffs = this.getAggregatedBuffs(character);
        return buffs.goldFind || 0;
    }
    
    /**
     * Get offline XP bonus percentage
     * @param {Character} character 
     * @returns {number} Offline XP bonus
     */
    getOfflineXpBonus(character = this._character) {
        const buffs = this.getAggregatedBuffs(character);
        return buffs.offlineXp || 0;
    }
    
    /**
     * Get cooldown reduction percentage
     * @param {Character} character 
     * @returns {number} Cooldown reduction bonus
     */
    getCooldownReductionBonus(character = this._character) {
        const buffs = this.getAggregatedBuffs(character);
        return buffs.cooldownReduction || 0;
    }
    
    /**
     * Get equipment stats bonus percentage
     * @param {Character} character 
     * @returns {number} Equipment stats bonus
     */
    getEquipmentStatsBonus(character = this._character) {
        const buffs = this.getAggregatedBuffs(character);
        return buffs.equipmentStats || 0;
    }
    
    /**
     * Get reforge cost discount percentage
     * @param {Character} character 
     * @returns {number} Reforge discount
     */
    getReforgeDiscount(character = this._character) {
        const buffs = this.getAggregatedBuffs(character);
        return buffs.reforgeDiscount || 0;
    }
    
    /**
     * Get material drop bonus percentage
     * @param {Character} character 
     * @returns {number} Material drop bonus
     */
    getMaterialDropBonus(character = this._character) {
        const buffs = this.getAggregatedBuffs(character);
        return buffs.materialDrops || 0;
    }
    
    /**
     * Get blessing cost discount percentage
     * @param {Character} character 
     * @returns {number} Blessing discount
     */
    getBlessingDiscount(character = this._character) {
        const buffs = this.getAggregatedBuffs(character);
        return buffs.blessingDiscount || 0;
    }
    
    /**
     * Get blessing duration bonus percentage
     * @param {Character} character 
     * @returns {number} Blessing duration bonus
     */
    getBlessingDurationBonus(character = this._character) {
        const buffs = this.getAggregatedBuffs(character);
        return buffs.blessingDuration || 0;
    }
}

// Singleton export
export const housingSystem = new HousingSystem();

export default housingSystem;
