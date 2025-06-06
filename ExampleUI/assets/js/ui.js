
const ui = {
    /**
     * @param {string} elementId - Target element ID
     * @param {string} message - Message text
     * @param {string} type - Message type (success, error, warning)
     * @param {number} timeout - Auto-hide timeout in ms (0 for no auto-hide)
     */
    showMessage(elementId, message, type = 'info', timeout = 5000) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        element.textContent = message;
        element.className = `message ${type}`;
        element.style.display = 'block';
        
        if (timeout > 0) {
            setTimeout(() => {
                element.style.display = 'none';
            }, timeout);
        }
    },
    
    /**
     * @param {string} elementId - Target element ID
     */
    clearMessage(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = '';
            element.style.display = 'none';
        }
    },

    /**
     * @param {number|string|Date} timestamp - Timestamp to format
     * @returns {string} Formatted date/time string
     */
    formatTimestamp(timestamp) {
        if (!timestamp) return 'N/A';
        
        return new Date(timestamp).toLocaleString(undefined, config.dateFormat);
    },
    
    /**
     * @param {number} amount - Amount to format
     * @returns {string} Formatted amount
     */
    formatAmount(amount) {
        if (amount === undefined || amount === null) return 'N/A';
        
        return Number(amount).toLocaleString(undefined, {
            minimumFractionDigits: 5,
            maximumFractionDigits: 5
        });
    },
    
    /**
     * @param {string} text - Text to copy
     * @returns {Promise} Result of the copy operation
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (error) {
            console.error('Failed to copy text:', error);
            return false;
        }
    },
    
    updateUserMenu() {
        const user = auth.getCurrentUser();
        if (!user) return;
        
        const usernameElement = document.getElementById('username');
        if (usernameElement) {
            usernameElement.textContent = user.username;
        }
        
        const userAddressElement = document.getElementById('user-address');
        if (userAddressElement && user.address) {
            userAddressElement.textContent = `Wallet: ${wallet.formatAddress(user.address)}`;
            userAddressElement.title = user.address;
        }
    }
};