/**
 * API service to interact with the blockchain API
 */
const api = {
    /**
     * Make an API call with proper authentication
     * @param {string} method - HTTP method (GET, POST, etc.)
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request body data
     * @returns {Promise} - API response
     */
    async call(method, endpoint, data = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            },
            // Important: include these for CORS
            mode: 'cors',
            credentials: 'same-origin'
        };

        const token = localStorage.getItem(config.tokenStorageKey);
        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        if (data) {
            options.body = JSON.stringify(data);
        }

        try {
            // Make sure endpoint starts with a slash
            if (!endpoint.startsWith('/')) {
                endpoint = '/' + endpoint;
            }
            
            console.log(`Calling API: ${config.apiUrl}${endpoint}`);
            const response = await fetch(`${config.apiUrl}${endpoint}`, options);
            
            // Handle non-JSON responses
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                if (!response.ok) {
                    throw new Error(`API Error: ${response.status} ${response.statusText}`);
                }
                return { success: true };
            }
            
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `API Error: ${response.status} ${response.statusText}`);
            }

            return result;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    // Authentication methods
    auth: {
        async register(username, password) {
            return api.call('POST', '/auth/register', { username, password });
        },

        async login(username, password) {
            return api.call('POST', '/auth/login', { username, password });
        }
    },

    // Blockchain methods
    blockchain: {
        async getInfo() {
            return api.call('GET', '/blockchain/info');
        },

        async getBlocks(page = 0, limit = config.maxBlocksPerPage) {
            return api.call('GET', `/blocks?page=${page}&limit=${limit}`);
        },

        async getBlock(index) {
            return api.call('GET', `/block/${index}`);
        }
    },

    // User/wallet methods
    wallet: {
        async getProfile() {
            return api.call('GET', '/user/profile');
        },

        async getTransactionHistory() {
            return api.call('GET', '/transactions/history');
        },

        async createTransaction(to, amount) {
            return api.call('POST', '/transaction', { to, amount });
        },

        async mineBlock() {
            return api.call('POST', '/mine');
        }
    }
};