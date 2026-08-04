/**
 * @file IntroScreen.js
 * @description Game intro/story screen shown after character creation. Displays
 *              narrative text introducing the player to Eron's Landing and the
 *              Shattered Coast, incorporating their chosen motivation/personal hook.
 * 
 * @usage Instantiated after character creation, before entering town.
 * @dependencies 
 *   - GameConfig (config/gameConfig.js) - for motivations
 *   - ClassConfig (config/classConfig.js)
 *   - RaceConfig (config/raceConfig.js)
 * 
 * @version 2.1.0
 * @changelog
 *   - v2.1.0 (2026-02-10): Shortened intro from 4 paragraphs to 1 + motivation line
 *                          so "Enter Eron's Landing" button is above fold on iPhone.
 *                          Motivation introText now rendered as styled gold italic line.
 *                          Removed simple_greed fallback — motivation displays accurately
 *                          or gracefully omits if null (requires CharacterManager v1.4.0 fix).
 *   - v2.0.0 (2025-01-20): Complete rewrite with Eron's Landing/Shattered Coast lore.
 *                          Added motivation-based narrative paragraph. Updated scene
 *                          imagery and button text.
 *   - v1.0.0 (2025-01-01): Initial implementation with placeholder narrative.
 */

// IntroScreen - Game intro/story screen
import { GameConfig } from '../config/gameConfig.js';
import { getClass } from '../config/classConfig.js';
import { getRace } from '../config/raceConfig.js';

export class IntroScreen {
    constructor(container, character, callbacks) {
        this.container = container;
        this.character = character;
        this.callbacks = callbacks || {};
        // callbacks: { onContinue }
        
        this._init();
    }
    
    _init() {
        this.container.innerHTML = '';
        this.container.classList.add('intro-screen');
        
        const classData = getClass(this.character.classId);
        const raceData = getRace(this.character.raceId);
        const motivation = GameConfig.motivations?.[this.character.motivation] || null;
        
        // Build motivation paragraph only if motivation exists
        const motivationHtml = motivation?.introText 
            ? `<div class="intro-paragraph intro-motivation">
                   <p>${motivation.introText}</p>
               </div>`
            : '';
        
        this.container.innerHTML = `
            <div class="intro-wrapper">
                <div class="intro-content">
                    <div class="intro-scene">
                        <div class="scene-image">⚓</div>
                    </div>
                    
                    <div class="intro-text">
                        <h1>The Shattered Coast</h1>
                        
                        <div class="intro-paragraph">
                            <p>The ship that carried you across the western sea grows smaller on the horizon, 
                            returning to the Old World you've left behind. Salt wind whips across the weathered 
                            dock as you step onto the <strong>Shattered Coast</strong>. Before you rises 
                            <strong>Eron's Landing</strong>—a frontier town clinging to the edge of an 
                            untamed land, where ancient ruins hold secrets older than memory.</p>
                        </div>
                        
                        ${motivationHtml}
                    </div>
                    
                    <div class="intro-character">
                        <div class="char-summary">
                            <span class="char-icon">${this._getClassIcon(this.character.classId)}</span>
                            <span class="char-name">${this.character.name}</span>
                            <span class="char-title">Level ${this.character.level} ${raceData?.name} ${classData?.name}</span>
                            ${motivation ? `<span class="char-motivation">${motivation.icon || '⚔️'} ${motivation.name}</span>` : ''}
                        </div>
                    </div>
                </div>
                
                <div class="intro-footer">
                    <button class="btn-continue" id="btnContinue">
                        <span>Enter Eron's Landing</span>
                        <span class="btn-arrow">→</span>
                    </button>
                </div>
            </div>
        `;
        
        this._setupEventListeners();
        this._animateText();
    }
    
    _setupEventListeners() {
        const continueBtn = this.container.querySelector('#btnContinue');
        continueBtn?.addEventListener('click', () => {
            if (this.callbacks.onContinue) {
                this.callbacks.onContinue();
            }
        });
    }
    
    _animateText() {
        // Simple fade-in animation for paragraphs
        const paragraphs = this.container.querySelectorAll('.intro-paragraph');
        paragraphs.forEach((p, i) => {
            p.style.opacity = '0';
            p.style.transform = 'translateY(20px)';
            p.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            
            setTimeout(() => {
                p.style.opacity = '1';
                p.style.transform = 'translateY(0)';
            }, 300 + (i * 400));
        });
    }
    
    _getClassIcon(classId) {
        const icons = {
            warrior: '⚔️',
            mage: '🧙',
            rogue: '🗡️'
        };
        return icons[classId] || '👤';
    }
    
    /**
     * Clean up
     */
    destroy() {
        this.container.innerHTML = '';
        this.container.classList.remove('intro-screen');
    }
}

export default IntroScreen;
