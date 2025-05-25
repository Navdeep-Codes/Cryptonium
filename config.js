module.exports = {
    // Blockchain configuration
    DIFFICULTY: 4,  
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
    JWT_SECRET: process.env.JWT_SECRET || 'crytonuium',
    JWT_EXPIRATION: '24h',
    
    // Database (for persistence)
    DB_URI: process.env.DB_URI || 'mongodb+srv://navdeep13dps:e6jbmACne2Vy5Qor@blockchaindata.w4pse2t.mongodb.net/?retryWrites=true&w=majority&appName=BlockchainData'
};      