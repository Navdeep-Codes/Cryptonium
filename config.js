module.exports = {
    // Blockchain configuration
    DIFFICULTY: 4,  // Adjust this to control mining difficulty
    MINING_REWARD: 50,
    
    // API configuration
    API_PORT: process.env.PORT || 3000,
    CORS_ORIGINS: ['http://localhost:8080'], // Add your frontend origins here
    
    // Security
    JWT_SECRET: 'cryptonium', // Change this in production!
    
    // Database (for persistence)
    DB_URI: process.env.DB_URI || 'mongodb://localhost:27017/blockchain'
};