
const wallet = {
    /**
     * @returns {Promise} User wallet data
     */
    async getProfile() {
        try {
            const profile = await api.wallet.getProfile();
            return profile;
        } catch (error) {
            console.error('Failed to get wallet profile:', error);
            throw error;
        }
    },

    /**
     * @returns {Promise} Transaction history
     */
    async getTransactionHistory() {
        try {
            const history = await api.wallet.getTransactionHistory();
            return history;
        } catch (error) {
            console.error('Failed to get transaction history:', error);
            throw error;
        }
    },

    /**
     * @param {string} to - Recipient address
     * @param {number} amount - Amount to send
     * @returns {Promise} Transaction result
     */
    async sendTransaction(to, amount) {
        try {
            if (!to || !amount) {
                throw new Error('Recipient address and amount are required');
            }

            const numAmount = parseFloat(amount);
            if (isNaN(numAmount) || numAmount <= 0) {
                throw new Error('Amount must be a positive number');
            }

            return await api.wallet.createTransaction(to, numAmount);
        } catch (error) {
            console.error('Failed to send transaction:', error);
            throw error;
        }
    },

    /**
     * @returns {Promise} Mining result
     */
    async mineBlock() {
        try {
            return await api.wallet.mineBlock();
        } catch (error) {
            console.error('Failed to mine block:', error);
            throw error;
        }
    },
    
    /**
     * @param {string} address - Full wallet address
     * @returns {string} Abbreviated address
     */
    formatAddress(address) {
        if (!address) return 'N/A';
        
        const start = address.substring(0, 10);
        const end = address.substring(address.length - 5);
        return `${start}...${end}`;
    }
};