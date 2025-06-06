
const blockchain = {
    /**
     * @returns {Promise} Blockchain information
     */
    async getInfo() {
        try {
            return await api.blockchain.getInfo();
        } catch (error) {
            console.error('Failed to get blockchain info:', error);
            throw error;
        }
    },

    /**
     * @param {number} page - Page number (0-based)
     * @param {number} limit - Number of blocks per page
     * @returns {Promise} Blocks data
     */
    async getBlocks(page = 0, limit = config.maxBlocksPerPage) {
        try {
            return await api.blockchain.getBlocks(page, limit);
        } catch (error) {
            console.error('Failed to get blocks:', error);
            throw error;
        }
    },

    /**
     * @param {number} index - Block index
     * @returns {Promise} Block data
     */
    async getBlock(index) {
        try {
            return await api.blockchain.getBlock(index);
        } catch (error) {
            console.error(`Failed to get block ${index}:`, error);
            throw error;
        }
    },
    
    /**
     * @param {Object} block - Block data
     * @returns {Object} Formatted block data
     */
    formatBlock(block) {
        return {
            ...block,
            formattedTimestamp: new Date(block.timestamp).toLocaleString(undefined, config.dateFormat),
            shortHash: block.hash ? block.hash.substring(0, 10) + '...' : 'N/A',
            shortPreviousHash: block.previousHash ? block.previousHash.substring(0, 10) + '...' : 'N/A',
            transactionCount: Array.isArray(block.data) ? block.data.length : 0
        };
    },
    
    /**
     * @param {Object} tx - Transaction data
     * @param {string} currentUserAddress - Current user's address
     * @returns {Object} Formatted transaction data
     */
    formatTransaction(tx, currentUserAddress) {
        const isSender = tx.from === currentUserAddress;
        const isReward = tx.from === 'BLOCKCHAIN_REWARD';
        
        let type = 'UNKNOWN';
        if (isReward) type = 'REWARD';
        else if (isSender) type = 'SENT';
        else type = 'RECEIVED';
        
        const partner = isSender ? tx.to : tx.from;
        
        return {
            ...tx,
            type,
            formattedTimestamp: new Date(tx.timestamp).toLocaleString(undefined, config.dateFormat),
            shortPartnerAddress: partner ? partner.substring(0, config.addressDisplayLength) + '...' : 'N/A',
            fullPartnerAddress: partner || 'N/A',
            statusText: tx.confirmed ? 'Confirmed' : 'Pending'
        };
    }
};