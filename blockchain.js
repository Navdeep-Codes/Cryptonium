const SHA256 = require('crypto-js/sha256');
const ConsensusEngine = require('./consensus');
const EventEmitter = require('events');

class Block {
    constructor(index, timestamp, data, previousHash = '') {
        this.index = index;
        this.timestamp = timestamp;
        this.data = data;
        this.previousHash = previousHash;
        this.hash = '';
        this.nonce = 0;
    }

    mineBlock(difficulty) {
        const result = ConsensusEngine.proofOfWork(this, difficulty);
        this.nonce = result.nonce;
        this.hash = result.hash;
    }
}

class Blockchain extends EventEmitter {
    constructor() {
        super();
        this.chain = [this.createGenesisBlock()];
        this.difficulty = 4;
        this.pendingTransactions = [];
        this.miningReward = 100;
        this.validators = [];
        this.currentConsensus = 'pow'; // 'pow' or 'pos'
    }

    createGenesisBlock() {
        const genesisBlock = new Block(0, Date.now(), { message: 'Genesis Block' }, '0');
        genesisBlock.hash = SHA256(JSON.stringify(genesisBlock)).toString();
        return genesisBlock;
    }

    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    minePendingTransactions(miningRewardAddress) {
        // Create a new block with all pending transactions
        const block = new Block(
            this.chain.length,
            Date.now(),
            this.pendingTransactions,
            this.getLatestBlock().hash
        );
        
        // Mine the block (using the appropriate consensus mechanism)
        if (this.currentConsensus === 'pow') {
            block.mineBlock(this.difficulty);
        } else if (this.currentConsensus === 'pos') {
            // For PoS, select a validator and let them create the block
            const validator = ConsensusEngine.proofOfStake(this.validators, null);
            if (miningRewardAddress !== validator) {
                return { success: false, message: 'Not authorized to forge this block' };
            }
            block.hash = SHA256(block.index + block.timestamp + JSON.stringify(block.data) + 
                              block.previousHash).toString();
        }
        
        console.log('Block successfully mined!');
        this.chain.push(block);
        
        // Reset pending transactions and send reward
        this.pendingTransactions = [
            {
                from: "BLOCKCHAIN_REWARD",
                to: miningRewardAddress,
                amount: this.miningReward,
                timestamp: Date.now()
            }
        ];
        
        // Emit event for P2P network propagation
        this.emit('blockMined', block);
        
        return { success: true, block };
    }

    createTransaction(transaction) {
        // Validate transaction
        if (!transaction.from || !transaction.to || !transaction.amount) {
            return { success: false, message: 'Invalid transaction' };
        }
        
        // Add timestamp if not present
        if (!transaction.timestamp) {
            transaction.timestamp = Date.now();
        }
        
        // Add transaction signature validation here in a real implementation
        
        this.pendingTransactions.push(transaction);
        
        // Emit event for P2P network propagation
        this.emit('newTransaction', transaction);
        
        return { success: true, index: this.pendingTransactions.length - 1 };
    }

    // Add a validator for PoS
    addValidator(address, stake) {
        this.validators.push({ address, stake });
        return this.validators.length - 1;
    }

    // Switch consensus mechanism
    switchConsensus(mechanism) {
        if (mechanism === 'pow' || mechanism === 'pos') {
            this.currentConsensus = mechanism;
            return true;
        }
        return false;
    }

    // Other methods (getBalanceOfAddress, isChainValid) remain the same as before
    getBalanceOfAddress(address) {
        let balance = 0;

        for (const block of this.chain) {
            for (const trans of block.data) {
                if (trans.from === address) {
                    balance -= trans.amount;
                }
                if (trans.to === address) {
                    balance += trans.amount;
                }
            }
        }

        return balance;
    }

    isChainValid() {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];

            const result = ConsensusEngine.validateBlock(currentBlock, previousBlock, this.difficulty);
            if (!result.valid) {
                return result;
            }
        }
        return { valid: true };
    }

    // Calculate the next block difficulty based on recent mining times
    adjustDifficulty() {
        if (this.chain.length < 3) return this.difficulty;
        
        const lastBlock = this.getLatestBlock();
        const prevBlock = this.chain[this.chain.length - 2];
        
        const timeExpected = 10 * 1000; // 10 seconds
        const timeTaken = lastBlock.timestamp - prevBlock.timestamp;
        
        if (timeTaken < timeExpected / 2) {
            return this.difficulty + 1;
        } else if (timeTaken > timeExpected * 2) {
            return Math.max(1, this.difficulty - 1);
        }
        return this.difficulty;
    }
}

module.exports = { Block, Blockchain };