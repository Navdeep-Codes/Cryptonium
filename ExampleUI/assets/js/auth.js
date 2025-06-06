
const auth = {
    /**
     * @returns {boolean} Login status
     */
    isLoggedIn() {
        const token = localStorage.getItem(config.tokenStorageKey);
        return !!token;
    },

    /**
     * @returns {Object|null} User data or null if not logged in
     */
    getCurrentUser() {
        const userData = localStorage.getItem(config.userStorageKey);
        return userData ? JSON.parse(userData) : null;
    },

    /**
     * @param {string} username - Username
     * @param {string} password - Password
     * @param {string} confirmPassword - Password confirmation
     * @returns {Promise} Registration result
     */
    async register(username, password, confirmPassword) {
    if (!username || !password) {
        throw new Error('Username and password are required');
    }

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
     * @param {string} username - Username
     * @param {string} password - Password
     * @returns {Promise} Login result
     */
    async login(username, password) {
        if (!username || !password) {
            throw new Error('Username and password are required');
        }

        try {
            const result = await api.auth.login(username, password);
            
            localStorage.setItem(config.tokenStorageKey, result.token);
            localStorage.setItem(config.userStorageKey, JSON.stringify(result.user));
            
            return result;
        } catch (error) {
            throw error;
        }
    },

    
    logout() {
        localStorage.removeItem(config.tokenStorageKey);
        localStorage.removeItem(config.userStorageKey);
        
        window.location.href = 'index.html';
    }
};