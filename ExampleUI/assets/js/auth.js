/**
 * Authentication service for user management
 */
const auth = {
    /**
     * Check if user is logged in
     * @returns {boolean} Login status
     */
    isLoggedIn() {
        const token = localStorage.getItem(config.tokenStorageKey);
        return !!token;
    },

    /**
     * Get current user data
     * @returns {Object|null} User data or null if not logged in
     */
    getCurrentUser() {
        const userData = localStorage.getItem(config.userStorageKey);
        return userData ? JSON.parse(userData) : null;
    },

    /**
     * Register a new user
     * @param {string} username - Username
     * @param {string} password - Password
     * @param {string} confirmPassword - Password confirmation
     * @returns {Promise} Registration result
     */
    async register(username, password, confirmPassword) {
    // Validate inputs
    if (!username || !password) {
        throw new Error('Username and password are required');
    }

    // Trim both passwords to remove any whitespace issues
    const trimmedPassword = password.trim();
    const trimmedConfirmPassword = confirmPassword.trim();

    if (trimmedPassword !== trimmedConfirmPassword) {
        throw new Error('Passwords do not match');
    }

    try {
        const result = await api.auth.register(username, trimmedPassword);
        return result;
    } catch (error) {
        throw error;
    }
},

    /**
     * Login user
     * @param {string} username - Username
     * @param {string} password - Password
     * @returns {Promise} Login result
     */
    async login(username, password) {
        // Validate inputs
        if (!username || !password) {
            throw new Error('Username and password are required');
        }

        try {
            const result = await api.auth.login(username, password);
            
            // Store auth token and user data
            localStorage.setItem(config.tokenStorageKey, result.token);
            localStorage.setItem(config.userStorageKey, JSON.stringify(result.user));
            
            return result;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Logout user
     */
    logout() {
        localStorage.removeItem(config.tokenStorageKey);
        localStorage.removeItem(config.userStorageKey);
        
        // Redirect to login page
        window.location.href = 'index.html';
    }
};