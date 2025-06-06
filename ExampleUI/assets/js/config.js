
const config = {
    apiUrl: 'http://localhost:1586',
    
    tokenStorageKey: 'ctnm_auth_token',
    userStorageKey: 'ctnm_user_data',

    maxRecentTransactions: 10,
    maxBlocksPerPage: 10,
    refreshInterval: 30000, 

    addressDisplayLength: 10, 
    
    dateFormat: {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }
};
