module.exports = {
    // Blockchain configuration
    DIFFICULTY: 4,  // Adjust this to control mining difficulty
    MINING_REWARD: 50,
    
    // API configuration
    API_PORT: process.env.API_PORT || 3000,
    CORS_ORIGINS: process.env.CORS_ORIGINS ? 
        process.env.CORS_ORIGINS.split(',') : 
        ['http://localhost:8080', 'http://localhost:3001'],
    
    // P2P Network
    P2P_PORT: process.env.P2P_PORT || 6001,
    INITIAL_PEERS: process.env.INITIAL_PEERS ? 
        process.env.INITIAL_PEERS.split(',') : 
        [],
        
    // Security
    JWT_SECRET: process.env.JWT_SECRET || 'your-strong-secret-key-change-in-production',
    JWT_EXPIRATION: '24h',
    
    // Database (for persistence)
    DB_URI: process.env.DB_URI || 'mongodb://localhost:27017/blockchain'
};