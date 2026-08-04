/**
 * @file AccountManager.js
 * @description Handle player accounts (email/password) and guest sessions.
 *              Uses localStorage for permanent accounts (proof of concept) and
 *              sessionStorage for guest sessions (auto-cleared on tab close).
 *
 * @usage Import singleton `accountManager`. Call createGuestSession() for guest play,
 *        createAccount() / login() for permanent accounts.
 *        Check isGuest getter throughout the app to gate save/register prompts.
 * @dependencies None (pure data layer)
 *
 * @version 1.1.0
 * @changelog
 *   - v1.1.0 (2026-03-06): Added guest session support. createGuestSession(),
 *                           convertGuestToAccount(), isGuest getter,
 *                           _clearGuestSession(). checkSession() now also
 *                           restores guest sessions from sessionStorage.
 *                           logout() clears guest sessionStorage on exit.
 *   - v1.0.0 (2025-01-01): Initial account system with localStorage persistence.
 */

export class AccountManager {
    constructor() {
        this.currentAccount = null;
        this.storageKey = 'hexRpg_accounts';
        this._guestSessionKey = 'hexRpg_guestSession';
    }
    
    // ============================================
    // GETTERS
    // ============================================
    
    /**
     * True when the active session belongs to a guest (no permanent account)
     * @returns {boolean}
     */
    get isGuest() {
        return this.currentAccount?.isGuest === true;
    }
    
    // ============================================
    // STORAGE HELPERS
    // ============================================

    _getAccounts() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : {};
        } catch (e) {
            console.error('Error loading accounts:', e);
            return {};
        }
    }
    
    _saveAccounts(accounts) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(accounts));
            return true;
        } catch (e) {
            console.error('Error saving accounts:', e);
            return false;
        }
    }
    
    _hashPassword(password) {
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(16);
    }
    
    _isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
    
    _isValidPassword(password) {
        return password && password.length >= 6;
    }
    
    _saveCurrentSession(email) {
        try {
            localStorage.setItem('hexRpg_currentSession', email);
        } catch (e) {
            console.error('Error saving session:', e);
        }
    }
    
    _clearCurrentSession() {
        try {
            localStorage.removeItem('hexRpg_currentSession');
        } catch (e) {
            console.error('Error clearing session:', e);
        }
    }
    
    _clearGuestSession() {
        try {
            sessionStorage.removeItem(this._guestSessionKey);
        } catch (e) {
            console.error('Error clearing guest session:', e);
        }
    }
    
    // ============================================
    // GUEST SESSION
    // ============================================

    /**
     * Start a temporary guest session.
     * Session lives in sessionStorage — cleared automatically when the tab closes.
     * Characters are still saved to localStorage so they survive refreshes,
     * but with no permanent account, the guest cannot log back in after closing.
     *
     * @returns {{ success: boolean, account: Object }}
     */
    createGuestSession() {
        const guestId = 'guest_' + Math.floor(Math.random() * 9000 + 1000);
        const account = {
            email: guestId,
            isGuest: true,
            createdAt: Date.now(),
            lastLogin: Date.now(),
            characterSlots: 1,   // Guests get one character slot
            characters: []
        };
        this.currentAccount = account;
        try {
            sessionStorage.setItem(this._guestSessionKey, JSON.stringify(account));
        } catch (e) {
            console.error('Error saving guest session:', e);
        }
        console.log('Guest session started:', guestId);
        return { success: true, account };
    }

    /**
     * Upgrade a guest session to a permanent account, preserving the character.
     * On success, sessionStorage guest data is removed and a permanent
     * localStorage session is created.
     *
     * @param {string} email
     * @param {string} password
     * @returns {{ success: boolean, message: string, account?: Object }}
     */
    convertGuestToAccount(email, password) {
        if (!email || !password) {
            return { success: false, message: 'Email and password are required' };
        }
        email = email.toLowerCase().trim();

        if (!this._isValidEmail(email)) {
            return { success: false, message: 'Please enter a valid email address' };
        }
        if (!this._isValidPassword(password)) {
            return { success: false, message: 'Password must be at least 6 characters' };
        }

        const accounts = this._getAccounts();
        if (accounts[email]) {
            return { success: false, message: 'An account with this email already exists' };
        }

        // Carry over any characters the guest created
        const inheritedCharacters = [...(this.currentAccount?.characters || [])];

        const account = {
            email,
            passwordHash: this._hashPassword(password),
            createdAt: Date.now(),
            lastLogin: Date.now(),
            characterSlots: 3,
            characters: inheritedCharacters
        };

        accounts[email] = account;
        if (!this._saveAccounts(accounts)) {
            return { success: false, message: 'Failed to save account' };
        }

        // Promote session: clear guest, create permanent
        this._clearGuestSession();
        this.currentAccount = account;
        this._saveCurrentSession(email);

        console.log('Guest converted to permanent account:', email);
        return { success: true, message: 'Account created! Your progress has been saved.', account };
    }

    // ============================================
    // PERMANENT ACCOUNTS
    // ============================================

    /**
     * Create a new permanent account
     * @returns {{ success: boolean, message: string, account?: Object }}
     */
    createAccount(email, password) {
        if (!email || !password) {
            return { success: false, message: 'Email and password are required' };
        }
        email = email.toLowerCase().trim();
        if (!this._isValidEmail(email)) {
            return { success: false, message: 'Please enter a valid email address' };
        }
        if (!this._isValidPassword(password)) {
            return { success: false, message: 'Password must be at least 6 characters' };
        }

        const accounts = this._getAccounts();
        if (accounts[email]) {
            return { success: false, message: 'An account with this email already exists' };
        }

        const account = {
            email,
            passwordHash: this._hashPassword(password),
            createdAt: Date.now(),
            lastLogin: Date.now(),
            characterSlots: 3,
            characters: []
        };
        accounts[email] = account;
        if (!this._saveAccounts(accounts)) {
            return { success: false, message: 'Failed to save account' };
        }

        this.currentAccount = account;
        this._saveCurrentSession(email);
        return { success: true, message: 'Account created successfully', account };
    }

    /**
     * Login to an existing permanent account
     * @returns {{ success: boolean, message: string, account?: Object }}
     */
    login(email, password) {
        if (!email || !password) {
            return { success: false, message: 'Email and password are required' };
        }
        email = email.toLowerCase().trim();

        const accounts = this._getAccounts();
        const account = accounts[email];
        if (!account) {
            return { success: false, message: 'Account not found' };
        }
        if (account.passwordHash !== this._hashPassword(password)) {
            return { success: false, message: 'Incorrect password' };
        }

        account.lastLogin = Date.now();
        accounts[email] = account;
        this._saveAccounts(accounts);

        this.currentAccount = account;
        this._saveCurrentSession(email);
        return { success: true, message: 'Login successful', account };
    }

    /**
     * Logout current account (permanent or guest)
     */
    logout() {
        if (this.isGuest) {
            this._clearGuestSession();
        }
        this.currentAccount = null;
        this._clearCurrentSession();
        return { success: true, message: 'Logged out' };
    }

    /**
     * Restore an active session on page load.
     * Checks permanent localStorage session first, then guest sessionStorage.
     * @returns {Object|null} account or null
     */
    checkSession() {
        // Permanent session
        try {
            const email = localStorage.getItem('hexRpg_currentSession');
            if (email) {
                const accounts = this._getAccounts();
                const account = accounts[email];
                if (account) {
                    this.currentAccount = account;
                    return account;
                }
            }
        } catch (e) {
            console.error('Error checking session:', e);
        }

        // Guest session (sessionStorage — only lives for this browser session)
        try {
            const raw = sessionStorage.getItem(this._guestSessionKey);
            if (raw) {
                const account = JSON.parse(raw);
                this.currentAccount = account;
                console.log('Restored guest session:', account.email);
                return account;
            }
        } catch (e) {
            console.error('Error checking guest session:', e);
        }

        return null;
    }

    // ============================================
    // ACCOUNT HELPERS
    // ============================================

    getCurrentAccount() {
        return this.currentAccount;
    }

    addCharacterToAccount(characterId) {
        if (!this.currentAccount) return false;
        if (this.currentAccount.characters.length >= this.currentAccount.characterSlots) {
            return false;
        }
        this.currentAccount.characters.push(characterId);
        this._updateAccount();
        return true;
    }

    removeCharacterFromAccount(characterId) {
        if (!this.currentAccount) return false;
        const index = this.currentAccount.characters.indexOf(characterId);
        if (index > -1) {
            this.currentAccount.characters.splice(index, 1);
            this._updateAccount();
            return true;
        }
        return false;
    }

    _updateAccount() {
        if (!this.currentAccount || this.isGuest) return false;
        const accounts = this._getAccounts();
        accounts[this.currentAccount.email] = this.currentAccount;
        return this._saveAccounts(accounts);
    }

    getAvailableSlots() {
        if (!this.currentAccount) return 0;
        return this.currentAccount.characterSlots - this.currentAccount.characters.length;
    }
}

// Singleton instance
export const accountManager = new AccountManager();

export default AccountManager;
