/**
 * @file LoginScreen.js
 * @description Login and account creation UI. Presents login/register tabs for
 *              permanent accounts, plus a "Play as Guest" path that starts an
 *              anonymous sessionStorage-backed session for quick try-out play.
 *
 * @usage Instantiated by main.js during LOADING → LOGIN transition.
 *        Calls onLoginSuccess(account) for both permanent and guest logins.
 * @dependencies accountManager (systems/AccountManager.js), GameConfig (config/gameConfig.js)
 *
 * @version 1.1.0
 * @changelog
 *   - v1.1.0 (2026-03-06): Added "Play as Guest" button and guest divider section.
 *                           _handleGuestLogin() calls accountManager.createGuestSession().
 *   - v1.0.0 (2025-01-01): Initial login/register screen.
 */

import { accountManager } from '../systems/AccountManager.js';
import { GameConfig } from '../config/gameConfig.js';

export class LoginScreen {
    constructor(container, onLoginSuccess) {
        this.container = container;
        this.onLoginSuccess = onLoginSuccess;
        this.isCreateMode = false;
        
        this._init();
    }
    
    _init() {
        this.container.innerHTML = '';
        this.container.classList.add('login-screen');
        
        this.container.innerHTML = `
            <div class="login-wrapper">
                <div class="login-header">
                    <div class="game-logo">⚔️</div>
                    <h1 class="game-title">${GameConfig.gameName}</h1>
                    <p class="game-subtitle">An Old-School Hex-Based RPG Adventure</p>
                </div>
                
                <div class="login-box">
                    <div class="login-tabs">
                        <button class="login-tab active" data-tab="login">Login</button>
                        <button class="login-tab" data-tab="create">Create Account</button>
                    </div>
                    
                    <form class="login-form" id="loginForm">
                        <div class="form-group">
                            <label for="email">Email</label>
                            <input type="email" id="email" name="email" placeholder="Enter your email" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="password">Password</label>
                            <input type="password" id="password" name="password" placeholder="Enter your password" required minlength="6">
                        </div>
                        
                        <div class="form-group confirm-password" style="display: none;">
                            <label for="confirmPassword">Confirm Password</label>
                            <input type="password" id="confirmPassword" name="confirmPassword" placeholder="Confirm your password">
                        </div>
                        
                        <div class="form-error" id="formError"></div>
                        
                        <button type="submit" class="btn-submit" id="submitBtn">Login</button>
                    </form>
                </div>

                <!-- Guest play option -->
                <div class="login-guest-section">
                    <div class="login-divider">
                        <span class="login-divider-line"></span>
                        <span class="login-divider-text">or</span>
                        <span class="login-divider-line"></span>
                    </div>
                    <button class="btn-guest" id="guestBtn">
                        ⚡ Play as Guest
                    </button>
                    <p class="guest-note">No account needed — jump right in.<br>Progress is lost when you close your browser.</p>
                </div>
                
                <div class="login-footer">
                    <p>Version ${GameConfig.version}</p>
                </div>
            </div>
        `;
        
        this._setupEventListeners();
        this._checkExistingSession();
    }
    
    _setupEventListeners() {
        // Tab switching
        const tabs = this.container.querySelectorAll('.login-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this._switchTab(tab.dataset.tab);
            });
        });
        
        // Permanent account form submission
        const form = this.container.querySelector('#loginForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this._handleSubmit();
        });

        // Guest play button
        const guestBtn = this.container.querySelector('#guestBtn');
        guestBtn.addEventListener('click', () => {
            this._handleGuestLogin();
        });
    }
    
    _switchTab(tabName) {
        const tabs = this.container.querySelectorAll('.login-tab');
        const confirmGroup = this.container.querySelector('.confirm-password');
        const submitBtn = this.container.querySelector('#submitBtn');
        const errorDiv = this.container.querySelector('#formError');
        
        tabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
        
        this.isCreateMode = tabName === 'create';
        
        if (this.isCreateMode) {
            confirmGroup.style.display = 'block';
            submitBtn.textContent = 'Create Account';
        } else {
            confirmGroup.style.display = 'none';
            submitBtn.textContent = 'Login';
        }
        
        errorDiv.textContent = '';
        errorDiv.style.display = 'none';
    }
    
    _handleSubmit() {
        const email = this.container.querySelector('#email').value;
        const password = this.container.querySelector('#password').value;
        const errorDiv = this.container.querySelector('#formError');
        
        errorDiv.textContent = '';
        errorDiv.style.display = 'none';
        
        if (this.isCreateMode) {
            const confirmPassword = this.container.querySelector('#confirmPassword').value;
            if (password !== confirmPassword) {
                this._showError('Passwords do not match');
                return;
            }
            const result = accountManager.createAccount(email, password);
            if (result.success) {
                this._onSuccess(result.account);
            } else {
                this._showError(result.message);
            }
        } else {
            const result = accountManager.login(email, password);
            if (result.success) {
                this._onSuccess(result.account);
            } else {
                this._showError(result.message);
            }
        }
    }

    /**
     * Start a guest session and proceed directly into the game
     */
    _handleGuestLogin() {
        const result = accountManager.createGuestSession();
        if (result.success) {
            this._onSuccess(result.account);
        }
    }
    
    _showError(message) {
        const errorDiv = this.container.querySelector('#formError');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
    
    _onSuccess(account) {
        if (this.onLoginSuccess) {
            this.onLoginSuccess(account);
        }
    }
    
    _checkExistingSession() {
        const account = accountManager.checkSession();
        if (account) {
            this._onSuccess(account);
        }
    }
    
    destroy() {
        this.container.innerHTML = '';
        this.container.classList.remove('login-screen');
    }
}

export default LoginScreen;
