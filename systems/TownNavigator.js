/**
 * @file TownNavigator.js
 * @description Manages town location state, movement between locations, and visit tracking.
 *              Handles movement validation, transition text generation, and location persistence.
 * 
 * @usage Instantiated by TownScreen.js to manage location navigation
 * @dependencies 
 *   - mudConfig.js (Locations, MovementText, getLocation, getMovementText, getLocationExits)
 * 
 * @version 1.0.0
 * @changelog
 *   - v1.0.0 (2025-01-20): Initial implementation with location tracking, movement,
 *                          visit history, and time-of-day support.
 */

import { 
    Locations, 
    getLocation, 
    getMovementText, 
    getLocationExits 
} from '../config/mudConfig.js';

/**
 * TownNavigator - Manages player location within town
 */
export class TownNavigator {
    /**
     * Create a TownNavigator instance
     * @param {Object} character - Character object for state persistence
     * @param {Object} options - Configuration options
     */
    constructor(character, options = {}) {
        this.character = character;
        
        // Current location state
        this.currentLocationId = character?.townLocationId || options.startLocation || 'market_square';
        this.previousLocationId = null;
        
        // Visit tracking
        this.visitedLocations = new Set(character?.visitedTownLocations || []);
        this.locationVisitCounts = character?.townVisitCounts || {};
        
        // Time of day (affects descriptions and NPC availability)
        this.timeOfDay = options.timeOfDay || 'afternoon';
        
        // Callbacks for UI updates (set by TownScreen)
        this.onLocationChanged = options.onLocationChanged || null;
        this.onTextOutput = options.onTextOutput || null;
        
        // Mark current location as visited
        this.visitedLocations.add(this.currentLocationId);
    }
    
    /**
     * Get the current location object
     * @returns {Object|null} Current location data
     */
    getCurrentLocation() {
        return getLocation(this.currentLocationId);
    }
    
    /**
     * Get the previous location object (where player came from)
     * @returns {Object|null} Previous location data
     */
    getPreviousLocation() {
        return this.previousLocationId ? getLocation(this.previousLocationId) : null;
    }
    
    /**
     * Get all available exits from current location
     * @returns {Array<Object>} Array of location objects that can be reached
     */
    getAvailableExits() {
        return getLocationExits(this.currentLocationId)
            .filter(loc => this.isLocationAccessible(loc));
    }
    
    /**
     * Check if a location is currently accessible
     * @param {Object} location - Location object to check
     * @returns {boolean} True if accessible
     */
    isLocationAccessible(location) {
        if (!location) return false;
        
        // Check time-of-day restrictions
        if (location.closedAtNight && this.timeOfDay === 'night') {
            return false;
        }
        
        // Future: Check quest flags, level requirements, etc.
        
        return true;
    }
    
    /**
     * Check if a specific location ID can be reached from current location
     * @param {string} destinationId - Target location ID
     * @returns {boolean} True if movement is valid
     */
    canMoveTo(destinationId) {
        const currentLocation = this.getCurrentLocation();
        if (!currentLocation || !currentLocation.exits) return false;
        
        // Check if destination is a valid exit
        if (!currentLocation.exits.includes(destinationId)) return false;
        
        // Check if destination is accessible
        const destination = getLocation(destinationId);
        return this.isLocationAccessible(destination);
    }
    
    /**
     * Move to a new location
     * @param {string} destinationId - Target location ID
     * @returns {Object} Result object { success, message, isFirstVisit, location, arrivalText }
     */
    moveTo(destinationId) {
        // Validate movement
        if (!this.canMoveTo(destinationId)) {
            const destination = getLocation(destinationId);
            
            if (destination?.closedAtNight && this.timeOfDay === 'night') {
                return {
                    success: false,
                    message: `The ${destination.name} is closed at night.`,
                    isFirstVisit: false,
                    location: null,
                    arrivalText: null
                };
            }
            
            return {
                success: false,
                message: "You can't go that way.",
                isFirstVisit: false,
                location: null,
                arrivalText: null
            };
        }
        
        const destination = getLocation(destinationId);
        
        // Generate movement text
        const movementText = getMovementText(this.currentLocationId, destinationId);
        
        // Track previous location
        this.previousLocationId = this.currentLocationId;
        
        // Update current location
        this.currentLocationId = destinationId;
        
        // Track visit
        const isFirstVisit = !this.visitedLocations.has(destinationId);
        this.visitedLocations.add(destinationId);
        this.locationVisitCounts[destinationId] = (this.locationVisitCounts[destinationId] || 0) + 1;
        
        // Get arrival description (day or night variant)
        const arrivalText = this.getArrivalText(destination);
        
        // Output text if callback provided
        if (this.onTextOutput) {
            this.onTextOutput(movementText, 'system');
            this.onTextOutput(arrivalText, 'narration');
        }
        
        // Notify UI of location change
        if (this.onLocationChanged) {
            this.onLocationChanged({
                location: destination,
                isFirstVisit,
                previousLocationId: this.previousLocationId
            });
        }
        
        // Sync to character for persistence
        this._syncToCharacter();
        
        return {
            success: true,
            message: movementText,
            isFirstVisit,
            location: destination,
            arrivalText
        };
    }
    
    /**
     * Get the appropriate arrival text based on time of day
     * @param {Object} location - Location object
     * @returns {string} Description text
     */
    getArrivalText(location) {
        if (!location) return '';
        
        if (this.timeOfDay === 'night' && location.descriptionNight) {
            return location.descriptionNight;
        }
        
        return location.description || '';
    }
    
    /**
     * Set the time of day (affects descriptions and accessibility)
     * @param {string} timeOfDay - 'morning', 'afternoon', 'evening', or 'night'
     */
    setTimeOfDay(timeOfDay) {
        const validTimes = ['morning', 'afternoon', 'evening', 'night'];
        if (validTimes.includes(timeOfDay)) {
            this.timeOfDay = timeOfDay;
        }
    }
    
    /**
     * Get visit count for a location
     * @param {string} locationId - Location ID
     * @returns {number} Number of times visited
     */
    getVisitCount(locationId) {
        return this.locationVisitCounts[locationId] || 0;
    }
    
    /**
     * Check if a location has been visited
     * @param {string} locationId - Location ID
     * @returns {boolean} True if visited at least once
     */
    hasVisited(locationId) {
        return this.visitedLocations.has(locationId);
    }
    
    /**
     * Get all visited location IDs
     * @returns {Array<string>} Array of location IDs
     */
    getVisitedLocations() {
        return Array.from(this.visitedLocations);
    }
    
    /**
     * Sync navigator state to character for persistence
     * @private
     */
    _syncToCharacter() {
        if (this.character) {
            this.character.townLocationId = this.currentLocationId;
            this.character.visitedTownLocations = Array.from(this.visitedLocations);
            this.character.townVisitCounts = { ...this.locationVisitCounts };
        }
    }
    
    /**
     * Serialize navigator state for save/load
     * @returns {Object} Serializable state object
     */
    toJSON() {
        return {
            currentLocationId: this.currentLocationId,
            previousLocationId: this.previousLocationId,
            visitedLocations: Array.from(this.visitedLocations),
            locationVisitCounts: { ...this.locationVisitCounts },
            timeOfDay: this.timeOfDay
        };
    }
    
    /**
     * Restore navigator state from saved data
     * @param {Object} data - Saved state object
     */
    fromJSON(data) {
        if (!data) return;
        
        this.currentLocationId = data.currentLocationId || 'market_square';
        this.previousLocationId = data.previousLocationId || null;
        this.visitedLocations = new Set(data.visitedLocations || []);
        this.locationVisitCounts = data.locationVisitCounts || {};
        this.timeOfDay = data.timeOfDay || 'afternoon';
        
        // Ensure current location is marked as visited
        this.visitedLocations.add(this.currentLocationId);
    }
    
    /**
     * Force set current location (for teleportation, respawn, etc.)
     * @param {string} locationId - Target location ID
     * @param {boolean} addToHistory - Whether to track as a visit
     */
    setLocation(locationId, addToHistory = true) {
        const location = getLocation(locationId);
        if (!location) return;
        
        this.previousLocationId = this.currentLocationId;
        this.currentLocationId = locationId;
        
        if (addToHistory) {
            this.visitedLocations.add(locationId);
            this.locationVisitCounts[locationId] = (this.locationVisitCounts[locationId] || 0) + 1;
        }
        
        this._syncToCharacter();
    }
}

export default TownNavigator;
