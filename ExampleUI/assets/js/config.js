/**
 * Configuration file for the CTNM blockchain frontend
 */
const config = {
    // API configuration
    apiUrl: 'http://localhost:3000', // Change this to match your API URL
    
    // Authentication
    tokenStorageKey: 'ctnm_auth_token',
    userStorageKey: 'ctnm_user_data',
    
    // Blockchain display
    maxRecentTransactions: 10,
    maxBlocksPerPage: 10,
    refreshInterval: 30000, // Auto refresh data every 30 seconds
    
    // Wallet configuration
    addressDisplayLength: 10, // Number of characters to display for shortened addresses
    
    // General
    dateFormat: {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }
};