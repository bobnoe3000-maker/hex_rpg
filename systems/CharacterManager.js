/**
 * @file CharacterManager.js
 * @description Handle character storage, creation, and management.
 *              Creates new characters with starting gear, handles save/load,
 *              and manages the active character for the current session.
 *              Integrates with OfflineProgressSystem for idle gameplay rewards.
 * 
 * @location systems/CharacterManager.js
 * @usage Singleton instance used by UI screens and game systems
 * @dependencies
 *   - Character (models/Character.js)
 *   - AccountManager (systems/AccountManager.js)
 *   - ClassConfig (config/classConfig.js)
 *   - GameConfig (config/gameConfig.js)
 *   - OfflineProgressSystem (systems/OfflineProgressSystem.js)
 * 
 * @version 1.4.0
 * @changelog
 *   - v1.4.0 (2026-02-10): Fixed motivation not being passed through createCharacter().
 *                          Added motivation field to characterData construction, preventing
 *                          Character.js from defaulting every new character to 'simple_greed'.
 *   - v1.3.0 (2026-01-27): Added safety check in checkOfflineProgress() to handle
 *                          cases where character is a plain object instead of instance.
 *   - v1.2.0 (2025-01-25): Added offline progress integration.
 *                          saveCharacter() now updates lastActiveTimestamp.
 *                          Added checkOfflineProgress() method.
 *   - v1.1.0 (2025-01-18): Fixed starting gear baseIds to match itemConfig.js definitions.
 *                          Added materialId to starting items for proper Item reconstruction.
 *                          Fixes "Unknown Item" display bug for head/body slots.
 *   - v1.0.0 (2025-01): Initial implementation
 */

import { Character } from '../models/Character.js';
import { accountManager } from './AccountManager.js';
import { getClass } from '../config/classConfig.js';
import { GameConfig } from '../config/gameConfig.js';
import { OfflineProgressSystem } from './OfflineProgressSystem.js';

export class CharacterManager {
    constructor() {
        this.storageKey = 'hexRpg_characters';
        this.activeCharacter = null;
    }
    
    /**
     * Get all characters from storage
     */
    _getCharacterStorage() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : {};
        } catch (e) {
            console.error('Error loading characters:', e);
            return {};
        }
    }
    
    /**
     * Save characters to storage
     */
    _saveCharacterStorage(characters) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(characters));
            return true;
        } catch (e) {
            console.error('Error saving characters:', e);
            return false;
        }
    }
    
    /**
     * Generate unique character ID
     */
    _generateCharacterId() {
        return 'char_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    /**
     * Get characters for current account
     * @returns {Array} Array of character data objects
     */
    getAccountCharacters() {
        const account = accountManager.getCurrentAccount();
        if (!account) return [];
        
        const storage = this._getCharacterStorage();
        const characters = [];
        
        for (const charId of account.characters) {
            if (storage[charId]) {
                characters.push(storage[charId]);
            }
        }
        
        return characters;
    }
    
    /**
     * Get character slots info for account
     * @returns {Array} Array of slot info { isEmpty: boolean, character?: Object }
     */
    getCharacterSlots() {
        const account = accountManager.getCurrentAccount();
        if (!account) return [];
        
        const maxSlots = account.characterSlots || 3;
        const characters = this.getAccountCharacters();
        const slots = [];
        
        for (let i = 0; i < maxSlots; i++) {
            if (characters[i]) {
                slots.push({
                    isEmpty: false,
                    character: characters[i]
                });
            } else {
                slots.push({
                    isEmpty: true,
                    character: null
                });
            }
        }
        
        return slots;
    }
    
    /**
     * Create a new character
     * @param {Object} data - Character creation data
     * @returns {Object} { success: boolean, message: string, character?: Character }
     */
    createCharacter(data) {
        const account = accountManager.getCurrentAccount();
        if (!account) {
            return { success: false, message: 'Not logged in' };
        }
        
        // Check slot availability
        if (account.characters.length >= account.characterSlots) {
            return { success: false, message: 'No available character slots' };
        }
        
        // Validate name
        if (!data.name || data.name.trim().length < 2) {
            return { success: false, message: 'Character name must be at least 2 characters' };
        }
        
        if (data.name.trim().length > 16) {
            return { success: false, message: 'Character name cannot exceed 16 characters' };
        }
        
        // Check for duplicate name in account
        const existingChars = this.getAccountCharacters();
        const nameLower = data.name.trim().toLowerCase();
        if (existingChars.some(c => c.name.toLowerCase() === nameLower)) {
            return { success: false, message: 'You already have a character with this name' };
        }
        
        // Validate stat point allocation
        const totalStats = (data.baseStats?.strength || 0) +
                          (data.baseStats?.dexterity || 0) +
                          (data.baseStats?.intelligence || 0) +
                          (data.baseStats?.stamina || 0);
        
        const maxStartStats = GameConfig.character.startingStatPoints;
        if (totalStats > maxStartStats) {
            return { success: false, message: 'Too many stat points allocated' };
        }
        
        // Generate ID and create character
        const characterId = this._generateCharacterId();
        
        const characterData = {
            id: characterId,
            name: data.name.trim(),
            classId: data.classId || 'warrior',
            raceId: data.raceId || 'human',
            alignment: data.alignment || 'neutral',
            motivation: data.motivation || null,
            sex: data.sex || 'M',
            appearance: data.appearance || {},
            level: 1,
            xp: 0,
            unspentStatPoints: 0,  // All points spent during creation
            unspentSkillPoints: 0,
            baseStats: data.baseStats || {
                strength: 0,
                dexterity: 0,
                intelligence: 0,
                stamina: 0
            },
            position: { q: 6, r: 5 },  // Town starting position
            currentMapId: 'town',
            gold: 50,  // Starting gold
            equipment: this._getStartingGear(data.classId || 'warrior'),
            inventory: [],
            autoBattleEnabled: false,
            autoLootEnabled: true,
            // Initialize offline progress timestamp (NEW v1.2.0)
            lastActiveTimestamp: Date.now()
        };
        
        // Create Character instance to get computed stats
        const character = new Character(characterData);
        
        // Set full health/mana
        character.currentHealth = character.maxHealth;
        character.currentMana = character.maxMana;
        
        // Save to storage
        const storage = this._getCharacterStorage();
        storage[characterId] = character.toJSON();
        
        if (!this._saveCharacterStorage(storage)) {
            return { success: false, message: 'Failed to save character' };
        }
        
        // Add to account
        if (!accountManager.addCharacterToAccount(characterId)) {
            return { success: false, message: 'Failed to link character to account' };
        }
        
        return { 
            success: true, 
            message: 'Character created successfully', 
            character: character 
        };
    }
    
    /**
     * Get starting gear based on class
     * @param {string} classId - Class identifier (warrior, mage, rogue)
     * @returns {Object} Equipment object with items in slots
     */
    _getStartingGear(classId) {
        const classData = getClass(classId);
        if (!classData || !classData.startingGear) {
            return {
                head: null,
                necklace: null,
                ring1: null,
                ring2: null,
                body: null,
                cape: null,
                boots: null,
                mainHand: null,
                offHand: null
            };
        }
        
        const gear = {
            head: null,
            necklace: null,
            ring1: null,
            ring2: null,
            body: null,
            cape: null,
            boots: null,
            mainHand: null,
            offHand: null
        };
        
        // Generate basic starting items
        // IMPORTANT: baseId must match keys in itemConfig.js ItemConfig.items
        // materialId enables proper Item reconstruction after save/load
        const startingItems = {
            // Warrior gear (heavy armor, metal materials)
            iron_sword: { 
                id: 'start_sword', 
                baseId: 'sword',           // matches itemConfig.items.sword
                materialId: 'iron', 
                name: 'Rusty Sword', 
                slot: 'mainHand', 
                stats: { attack: 8 } 
            },
            wooden_shield: { 
                id: 'start_shield', 
                baseId: 'shield',          // matches itemConfig.items.shield
                materialId: 'wood', 
                name: 'Wooden Shield', 
                slot: 'offHand', 
                stats: { defense: 5 } 
            },
            iron_chainmail: { 
                id: 'start_chain', 
                baseId: 'chainmail',       // matches itemConfig.items.chainmail
                materialId: 'iron', 
                name: 'Worn Chainmail', 
                slot: 'body', 
                stats: { defense: 10 } 
            },
            iron_helm: { 
                id: 'start_helm', 
                baseId: 'plate_helm',      // FIX: was 'helm', now matches itemConfig.items.plate_helm
                materialId: 'iron', 
                name: 'Dented Helm', 
                slot: 'head', 
                stats: { defense: 3 } 
            },
            
            // Mage gear (light armor, cloth materials)
            wooden_staff: { 
                id: 'start_staff', 
                baseId: 'staff',           // matches itemConfig.items.staff
                materialId: 'wood', 
                name: 'Apprentice Staff', 
                slot: 'mainHand', 
                stats: { attack: 6, intelligence: 2 } 
            },
            cloth_robe: { 
                id: 'start_robe', 
                baseId: 'cloth_robe',      // FIX: was 'robe', now matches itemConfig.items.cloth_robe
                materialId: 'cloth', 
                name: 'Tattered Robe', 
                slot: 'body', 
                stats: { defense: 3, intelligence: 2 } 
            },
            cloth_hood: { 
                id: 'start_hood', 
                baseId: 'cloth_hood',      // FIX: was 'hood', now matches itemConfig.items.cloth_hood
                materialId: 'cloth', 
                name: 'Simple Hood', 
                slot: 'head', 
                stats: { defense: 1, intelligence: 1 } 
            },
            
            // Rogue gear (medium armor, leather materials)
            iron_dagger: { 
                id: 'start_dagger', 
                baseId: 'dagger',          // matches itemConfig.items.dagger
                materialId: 'iron', 
                name: 'Worn Dagger', 
                slot: 'mainHand', 
                stats: { attack: 5, dexterity: 1 } 
            },
            leather_vest: { 
                id: 'start_vest', 
                baseId: 'leather_vest',    // FIX: was 'vest', now matches itemConfig.items.leather_vest
                materialId: 'leather', 
                name: 'Leather Vest', 
                slot: 'body', 
                stats: { defense: 6, dexterity: 1 } 
            },
            leather_cap: { 
                id: 'start_cap', 
                baseId: 'leather_cap',     // FIX: was 'cap', now matches itemConfig.items.leather_cap
                materialId: 'leather', 
                name: 'Leather Cap', 
                slot: 'head', 
                stats: { defense: 2 } 
            }
        };
        
        // Map starting gear from class config to actual items
        for (const [slot, itemKey] of Object.entries(classData.startingGear)) {
            if (itemKey && startingItems[itemKey]) {
                const item = { ...startingItems[itemKey] };
                item.id = item.id + '_' + Date.now();
                
                // Handle dual wield for rogues
                if (slot === 'mainHand') gear.mainHand = item;
                else if (slot === 'offHand') {
                    if (itemKey === 'iron_dagger') {
                        // Create second dagger with different ID
                        const offhandDagger = { ...item };
                        offhandDagger.id = 'start_dagger_oh_' + Date.now();
                        offhandDagger.slot = 'offHand';
                        gear.offHand = offhandDagger;
                    } else {
                        gear.offHand = item;
                    }
                }
                else if (slot === 'body') gear.body = item;
                else if (slot === 'head') gear.head = item;
            }
        }
        
        return gear;
    }
    
    /**
     * Load a character by ID
     * @param {string} characterId - Character ID to load
     * @returns {Character|null} Loaded character or null if not found
     */
    loadCharacter(characterId) {
        const account = accountManager.getCurrentAccount();
        if (!account) return null;
        
        // Verify character belongs to account
        if (!account.characters.includes(characterId)) {
            console.error('Character does not belong to this account');
            return null;
        }
        
        const storage = this._getCharacterStorage();
        const charData = storage[characterId];
        
        if (!charData) {
            console.error('Character not found');
            return null;
        }
        
        this.activeCharacter = Character.fromJSON(charData);
        return this.activeCharacter;
    }
    
    /**
     * Save current active character
     * Updates lastActiveTimestamp before saving (NEW v1.2.0)
     * @returns {boolean} Success status
     */
    saveCharacter() {
        if (!this.activeCharacter) return false;
        
        // Update last active timestamp before saving (for offline progress tracking)
        this.activeCharacter.updateLastActiveTimestamp();
        
        const storage = this._getCharacterStorage();
        storage[this.activeCharacter.id] = this.activeCharacter.toJSON();
        return this._saveCharacterStorage(storage);
    }
    
    /**
     * Check and calculate offline progress for a character (NEW v1.2.0)
     * Should be called after loadCharacter() to check for idle rewards
     * @param {Character} character - Character to check
     * @returns {Object|null} Offline progress results or null if no progress
     */
    checkOfflineProgress(character) {
        if (!character) return null;
        
        // Safety check: Ensure character is a proper Character instance
        // This can happen if something passes raw JSON data instead of a Character instance
        if (typeof character.gainXP !== 'function') {
            console.warn('CharacterManager.checkOfflineProgress: Character is not a proper instance, reconstructing...');
            try {
                character = Character.fromJSON(character);
                // Also update activeCharacter reference if this was the issue
                if (this.activeCharacter && this.activeCharacter.id === character.id) {
                    this.activeCharacter = character;
                }
            } catch (e) {
                console.error('CharacterManager.checkOfflineProgress: Failed to reconstruct character:', e);
                return null;
            }
        }
        
        // Calculate offline progress
        const progress = OfflineProgressSystem.calculateOfflineProgress(character);
        
        // If meaningful progress occurred, apply it
        if (progress && progress.type === 'battle' && 
            (progress.xpEarned > 0 || progress.goldEarned > 0 || progress.kills > 0)) {
            
            // Apply progress to character (modifies character in place)
            const appliedProgress = OfflineProgressSystem.applyProgress(character, progress);
            
            // Save the updated character with new timestamp
            this.saveCharacter();
            
            console.log('Offline progress applied:', appliedProgress);
            return appliedProgress;
        }
        
        // Return result even for "town" case so UI can show appropriate message
        // But don't save since nothing changed
        if (progress && progress.type === 'none' && progress.reason === 'town') {
            // Update timestamp so we don't keep showing this
            character.updateLastActiveTimestamp();
            this.saveCharacter();
            return progress;
        }
        
        return progress;
    }
    
    /**
     * Delete a character
     * @param {string} characterId - Character ID to delete
     * @returns {Object} { success: boolean, message: string }
     */
    deleteCharacter(characterId) {
        const account = accountManager.getCurrentAccount();
        if (!account) {
            return { success: false, message: 'Not logged in' };
        }
        
        // Verify ownership
        if (!account.characters.includes(characterId)) {
            return { success: false, message: 'Character not found' };
        }
        
        // Remove from storage
        const storage = this._getCharacterStorage();
        delete storage[characterId];
        this._saveCharacterStorage(storage);
        
        // Remove from account
        accountManager.removeCharacterFromAccount(characterId);
        
        // Clear active if it was this character
        if (this.activeCharacter?.id === characterId) {
            this.activeCharacter = null;
        }
        
        return { success: true, message: 'Character deleted' };
    }
    
    /**
     * Get active character
     * @returns {Character|null} Current active character
     */
    getActiveCharacter() {
        return this.activeCharacter;
    }
    
    /**
     * Clear active character (saves before clearing)
     */
    clearActiveCharacter() {
        if (this.activeCharacter) {
            this.saveCharacter();
        }
        this.activeCharacter = null;
    }
}

// Singleton instance
export const characterManager = new CharacterManager();

export default CharacterManager;
