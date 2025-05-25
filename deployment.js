const fs = require('fs');
const path = require('path');

class BlockchainPersistence {
    constructor(filePath = 'blockchain-data.json') {
        this.filePath = path.join(__dirname, filePath);
    }

    saveChain(blockchain) {
        try {
            fs.writeFileSync(this.filePath, JSON.stringify(blockchain, null, 2));
            return true;
        } catch (error) {
            console.error('Failed to save blockchain:', error);
            return false;
        }
    }

    loadChain() {
        try {
            if (!fs.existsSync(this.filePath)) {
                return null;
            }
            
            const data = fs.readFileSync(this.filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Failed to load blockchain:', error);
            return null;
        }
    }
}

module.exports = BlockchainPersistence;