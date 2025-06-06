const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const blockSchema = new mongoose.Schema({
    index: { type: Number, required: true, unique: true },
    timestamp: { type: Number, required: true },
    data: { type: Array, required: true },
    previousHash: { type: String, required: true },
    hash: { type: String, required: true },
    nonce: { type: Number, required: true }
});

const transactionSchema = new mongoose.Schema({
    from: { type: String, required: true },
    to: { type: String, required: true },
    amount: { type: Number, required: true },
    timestamp: { type: Number, required: true },
    blockIndex: { type: Number, default: null }, 
    signature: { type: String, default: null }
});

const BlockModel = mongoose.model('Block', blockSchema);
const TransactionModel = mongoose.model('Transaction', transactionSchema);

class BlockchainPersistence {
    constructor(config) {
        this.config = config;
        this.connected = false;
        this.backupPath = path.join(__dirname, 'blockchain-backup.json');
    }
    
    async connect() {
        try {
            await mongoose.connect(this.config.DB_URI, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                useCreateIndex: true
            });
            
            console.log('Connected to MongoDB database');
            this.connected = true;
            return true;
        } catch (error) {
            console.error('Failed to connect to MongoDB:', error);
            return false;
        }
    }
    
    async saveChain(blockchain) {
        if (!this.connected) {
            return this.saveToFile(blockchain);
        }
        
        try {
            await BlockModel.deleteMany({});
            
            const savePromises = blockchain.chain.map(block => {
                const blockDoc = new BlockModel({
                    index: block.index,
                    timestamp: block.timestamp,
                    data: block.data,
                    previousHash: block.previousHash,
                    hash: block.hash,
                    nonce: block.nonce
                });
                
                return blockDoc.save();
            });
            
            await Promise.all(savePromises);
            console.log(`Chain saved to database: ${blockchain.chain.length} blocks`);

            this.saveToFile(blockchain);
            
            return true;
        } catch (error) {
            console.error('Failed to save blockchain to database:', error);
            return this.saveToFile(blockchain); 
        }
    }
    
    async loadChain() {
        if (!this.connected) {
            return this.loadFromFile();
        }
        
        try {
            const blocks = await BlockModel.find({}).sort({ index: 1 });
            
            if (blocks.length === 0) {
                console.log('No blockchain found in database');
                return this.loadFromFile();
            }
            
            console.log(`Loaded ${blocks.length} blocks from database`);
            return blocks;
        } catch (error) {
            console.error('Failed to load blockchain from database:', error);
            return this.loadFromFile(); 
        }
    }
    
    async savePendingTransactions(transactions) {
        if (!this.connected) {
            return false;
        }
        
        try {
            await TransactionModel.deleteMany({ blockIndex: null });
            
            const savePromises = transactions.map(tx => {
                const txDoc = new TransactionModel({
                    from: tx.from,
                    to: tx.to,
                    amount: tx.amount,
                    timestamp: tx.timestamp || Date.now(),
                    blockIndex: null,
                    signature: tx.signature || null
                });
                
                return txDoc.save();
            });
            
            await Promise.all(savePromises);
            return true;
        } catch (error) {
            console.error('Failed to save pending transactions:', error);
            return false;
        }
    }
    
    async loadPendingTransactions() {
        if (!this.connected) {
            return [];
        }
        
        try {
            const transactions = await TransactionModel.find({ blockIndex: null });
            return transactions;
        } catch (error) {
            console.error('Failed to load pending transactions:', error);
            return [];
        }
    }
    
    saveToFile(blockchain) {
        try {
            const data = {
                chain: blockchain.chain,
                pendingTransactions: blockchain.pendingTransactions
            };
            
            fs.writeFileSync(this.backupPath, JSON.stringify(data, null, 2));
            console.log('Blockchain saved to backup file');
            return true;
        } catch (error) {
            console.error('Failed to save blockchain to file:', error);
            return false;
        }
    }
    
    loadFromFile() {
        try {
            if (!fs.existsSync(this.backupPath)) {
                console.log('No backup file found');
                return null;
            }
            
            const data = fs.readFileSync(this.backupPath, 'utf8');
            const parsedData = JSON.parse(data);
            console.log(`Loaded blockchain from backup file: ${parsedData.chain.length} blocks`);
            return parsedData;
        } catch (error) {
            console.error('Failed to load blockchain from file:', error);
            return null;
        }
    }
    
    async close() {
        if (this.connected) {
            await mongoose.disconnect();
            this.connected = false;
        }
    }
}

module.exports = { BlockchainPersistence, BlockModel, TransactionModel };;