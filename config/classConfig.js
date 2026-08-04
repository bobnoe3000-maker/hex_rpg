/**
 * @file classConfig.js
 * @description Class definitions for Warrior, Mage, and Rogue including stat bonuses,
 *              armor types, skill branches, starting gear, and derived stat multipliers.
 * 
 * @usage Imported by Character.js for class data, CharacterCreation for class selection,
 *        and various UI components for class-specific display.
 * @dependencies None (pure configuration)
 * 
 * @version 1.1.0
 * @changelog
 *   - v1.1.0 (2025-01-19): Changed Mage and Rogue defense scaling to use STR instead of
 *                          INT/DEX. STR is now the universal defense stat for all classes.
 *   - v1.0.0 (2025-01-01): Initial class configuration with Warrior, Mage, Rogue.
 */

// Class Configuration - Warrior, Mage, Rogue definitions
export const ClassConfig = {
    warrior: {
        id: 'warrior',
        name: 'Warrior',
        description: 'Masters of martial combat, warriors excel at close-quarters fighting and can withstand tremendous punishment.',
        
        // Armor restrictions
        armorType: 'heavy',  // heavy, medium, light
        
        // Starting stat bonuses
        statBonus: {
            strength: 5,
            dexterity: 0,
            intelligence: 0,
            stamina: 5
        },
        
        // Primary stat for weapon scaling
        primaryStat: 'strength',
        
        // Regeneration modifiers (multipliers on base regen)
        regenModifier: {
            health: 1.5,    // 50% faster health regen
            mana: 0.5       // 50% slower mana regen
        },
        
        // Available skill branches
        skillBranches: ['guardian', 'berserker', 'champion'],
        
        // Combat role
        role: 'tank',
        
        // Aggro generation multiplier
        aggroMultiplier: 1.5,
        
        // Starting gear IDs
        startingGear: {
            mainHand: 'iron_sword',
            offHand: 'wooden_shield',
            body: 'iron_chainmail',
            head: 'iron_helm'
        },
        
        // Base derived stats formula multipliers
        derivedStats: {
            healthPerStamina: 12,
            manaPerIntelligence: 5,
            attackPerStrength: 2.0,
            defensePerStrength: 1.0,
        }
    },
    
    mage: {
        id: 'mage',
        name: 'Mage',
        description: 'Wielders of arcane power, mages command devastating magical attacks but are physically fragile.',
        
        armorType: 'light',
        
        statBonus: {
            strength: 0,
            dexterity: 0,
            intelligence: 8,
            stamina: 2
        },
        
        primaryStat: 'intelligence',
        
        regenModifier: {
            health: 0.5,
            mana: 1.5
        },
        
        skillBranches: ['elementalist', 'arcanist', 'enchanter'],
        
        role: 'dps',
        aggroMultiplier: 0.8,
        
        startingGear: {
            mainHand: 'wooden_staff',
            offHand: null,
            body: 'cloth_robe',
            head: 'cloth_hood'
        },
        
        derivedStats: {
            healthPerStamina: 8,
            manaPerIntelligence: 12,
            attackPerIntelligence: 2.5,
            defensePerStrength: 0.5,
        }
    },
    
    rogue: {
        id: 'rogue',
        name: 'Rogue',
        description: 'Swift and deadly, rogues strike from the shadows with precision attacks and unmatched agility.',
        
        armorType: 'medium',
        
        statBonus: {
            strength: 2,
            dexterity: 6,
            intelligence: 0,
            stamina: 2
        },
        
        primaryStat: 'dexterity',
        
        regenModifier: {
            health: 1.2,
            mana: 0.8
        },
        
        skillBranches: ['assassin', 'ranger', 'shadowdancer'],
        
        role: 'dps',
        aggroMultiplier: 0.7,
        
        startingGear: {
            mainHand: 'iron_dagger',
            offHand: 'iron_dagger',
            body: 'leather_vest',
            head: 'leather_cap'
        },
        
        derivedStats: {
            healthPerStamina: 10,
            manaPerIntelligence: 8,
            attackPerDexterity: 1.8,
            attackPerStrength: 0.8,
            defensePerStrength: 0.8,
        }
    }
};

// Helper to get class by ID
export function getClass(classId) {
    return ClassConfig[classId] || null;
}

// Get all class IDs
export function getClassIds() {
    return Object.keys(ClassConfig);
}

// Armor type defense modifiers
export const ArmorTypeModifiers = {
    heavy: { defense: 1.3, dodge: 0.7 },
    medium: { defense: 1.0, dodge: 1.0 },
    light: { defense: 0.7, dodge: 1.3 }
};

export default ClassConfig;
