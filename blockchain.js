const SHA256 = require('crypto-js/sha256');
const ConsensusEngine = require('./consensus');
const EventEmitter = require('events');
const ctnmTokenomics = require('./tokenomics');

class Block {
  constructor(index, timestamp, data, previousHash = '') {
    this.index = index;
    this.timestamp = timestamp;
    this.data = data;
    this.previousHash = previousHash;
    this.hash = '';
    this.nonce = 0;
    this.difficulty = 4; // Dynamic difficulty will be implemented
  }

  mineBlock(difficulty) {
    const result = ConsensusEngine.proofOfWork(this, difficulty);
    this.nonce = result.nonce;
    this.hash = result.hash;
  }
}

class Transaction {
  constructor(from, to, amount, tokenType = 'CTNM', data = null) {
    this.from = from;
    this.to = to;
    this.amount = amount;
    this.tokenType = tokenType; // CTNM for native token, others for custom tokens
    this.data = data; // For smart contract calls or token metadata
    this.timestamp = Date.now();
    this.signature = null;
    this.hash = this.calculateHash();
  }

  calculateHash() {
    return SHA256(this.from + this.to + this.amount + this.tokenType + 
                 JSON.stringify(this.data) + this.timestamp).toString();
  }

  signTransaction(signingKey) {
    // In a real implementation, use private key signing
    this.signature = `signed:${signingKey}:${this.hash}`;
    return true;
  }

  isValid() {
    // Check if it's a mining reward
    if (this.from === "BLOCKCHAIN_REWARD") {
      return true;
    }
    
    // Check signature exists
    if (!this.signature) {
      return false;
    }
    
    // In a real implementation, verify signature with public key
    return true;
  }
}

class Blockchain extends EventEmitter {
  constructor() {
    super();
    this.chain = [this.createGenesisBlock()];
    this.difficulty = 4;
    this.pendingTransactions = [];
    this.miningReward = ctnmTokenomics.blockReward;
    this.blocksMined = 0;
    this.tokenRegistry = {
      'CTNM': {
        name: ctnmTokenomics.name,
        symbol: ctnmTokenomics.symbol,
        decimals: ctnmTokenomics.decimals,
        totalSupply: ctnmTokenomics.initialSupply,
        maxSupply: ctnmTokenomics.maxSupply,
        contract: null // Native token has no contract
      }
    };
  }

  createGenesisBlock() {
    // Add Genesis allocation if you want to pre-allocate CTNM to founders/investors
    const genesisTransactions = [];
    
    // Example: Allocate tokens to founder, treasury, etc.
    // Uncomment and modify if you want initial allocation
    /*
    genesisTransactions.push(new Transaction(
      "GENESIS", 
      "FOUNDER_WALLET_ADDRESS", 
      1000000, 
      "CTNM",
      { type: "genesis_allocation", purpose: "founder" }
    ));
    */
    
    const genesisBlock = new Block(0, Date.now(), genesisTransactions, '0');
    genesisBlock.hash = SHA256(JSON.stringify(genesisBlock)).toString();
    return genesisBlock;
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  minePendingTransactions(minerAddress) {
    // Update mining reward based on halving schedule
    this.updateMiningReward();
    
    // Create reward transaction
    const rewardTx = new Transaction(
      "BLOCKCHAIN_REWARD",
      minerAddress,
      this.miningReward,
      "CTNM",
      { type: "mining_reward" }
    );
    
    // Add reward transaction to pending transactions
    this.pendingTransactions.push(rewardTx);
    
    // Create a new block with all pending transactions
    const block = new Block(
      this.chain.length,
      Date.now(),
      this.pendingTransactions,
      this.getLatestBlock().hash
    );
    
    // Mine the block
    block.mineBlock(this.difficulty);
    console.log('Block successfully mined!');
    this.chain.push(block);
    
    // Update token supply
    this.updateTokenSupply(block);
    
    // Clear pending transactions
    this.pendingTransactions = [];
    
    // Increment blocks mined counter
    this.blocksMined++;
    
    // Adjust difficulty every 2016 blocks (like Bitcoin)
    if (this.blocksMined % 2016 === 0) {
      this.adjustDifficulty();
    }
    
    // Emit event for P2P network propagation
    this.emit('blockMined', block);
    
    return { 
      success: true, 
      block,
      reward: this.miningReward
    };
  }

  updateMiningReward() {
    // Calculate how many halvings should have occurred
    const halvings = Math.floor(this.blocksMined / ctnmTokenomics.blockRewardHalvingInterval);
    if (halvings > 0) {
      // Reward = Initial Reward / 2^halvings
      this.miningReward = ctnmTokenomics.blockReward / Math.pow(2, halvings);
    }
  }

  updateTokenSupply(block) {
    // Update total supply based on mined block transactions
    block.data.forEach(tx => {
      if (tx.tokenType === 'CTNM' && tx.from === 'BLOCKCHAIN_REWARD') {
        this.tokenRegistry.CTNM.totalSupply += tx.amount;
      }
    });
    
    console.log(`CTNM Total Supply: ${this.tokenRegistry.CTNM.totalSupply}`);
  }

  createTransaction(transaction) {
    // Validate transaction
    if (!transaction.from || !transaction.to || transaction.amount === undefined) {
      return { success: false, message: 'Invalid transaction parameters' };
    }
    
    // Validate token exists
    if (!this.tokenRegistry[transaction.tokenType]) {
      return { success: false, message: `Token ${transaction.tokenType} does not exist` };
    }
    
    // Check if sender has enough balance (except for mining rewards)
    if (transaction.from !== 'BLOCKCHAIN_REWARD') {
      const senderBalance = this.getBalanceOfAddress(transaction.from, transaction.tokenType);
      if (senderBalance < transaction.amount) {
        return { 
          success: false, 
          message: `Insufficient balance. Required: ${transaction.amount}, Available: ${senderBalance}` 
        };
      }
      
      // Verify transaction signature
      if (!transaction.isValid()) {
        return { success: false, message: 'Invalid transaction signature' };
      }
    }
    
    this.pendingTransactions.push(transaction);
    
    // Emit event for P2P network propagation
    this.emit('newTransaction', transaction);
    
    return { success: true, transactionHash: transaction.hash };
  }
  
  getBalanceOfAddress(address, tokenType = 'CTNM') {
    let balance = 0;
    
    // Check if token exists
    if (!this.tokenRegistry[tokenType]) {
      return 0;
    }

    // Process all blocks
    for (const block of this.chain) {
      for (const trans of block.data) {
        // Only count transactions of requested token type
        if (trans.tokenType === tokenType) {
          if (trans.from === address) {
            balance -= trans.amount;
          }
          if (trans.to === address) {
            balance += trans.amount;
          }
        }
      }
    }
    
    // Also check pending transactions
    for (const trans of this.pendingTransactions) {
      if (trans.tokenType === tokenType) {
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

  // Other methods remain similar to before
  isChainValid() {
  // Chain validation logic
  for (let i = 1; i < this.chain.length; i++) {
    const currentBlock = this.chain[i];
    const previousBlock = this.chain[i - 1];

    // Check if transactions in the block are valid
    for (const tx of currentBlock.data) {
      // Check if tx is a Transaction instance with isValid method
      if (typeof tx.isValid === 'function') {
        // Use the Transaction's own validation method
        if (!tx.isValid()) {
          return { valid: false, reason: `Invalid transaction in block ${i}` };
        }
      } else {
        // Manual validation for plain objects
        // Skip validation for mining rewards
        if (tx.from === "BLOCKCHAIN_REWARD") {
          continue;
        }
        
        // For regular transactions, ensure they have required properties
        if (!tx.from || !tx.to || tx.amount === undefined || tx.amount <= 0) {
          return { valid: false, reason: `Invalid transaction format in block ${i}` };
        }
        
        // Check if signature exists for non-reward transactions
        if (!tx.signature) {
          return { valid: false, reason: `Missing signature in transaction in block ${i}` };
        }
        
        // Additional validation could be added here
      }
    }

    // Validate hash links
    if (currentBlock.previousHash !== previousBlock.hash) {
      return { valid: false, reason: `Invalid hash link at block ${i}` };
    }
    
    // Validate block hash
    if (currentBlock.hash !== ConsensusEngine.calculateBlockHash(currentBlock)) {
      return { valid: false, reason: `Invalid hash at block ${i}` };
    }
  }
  
  return { valid: true };
}

  // New methods for multi-token support
  registerToken(name, symbol, decimals, initialSupply, maxSupply, contractAddress) {
    // Check if token already exists
    if (this.tokenRegistry[symbol]) {
      return { success: false, message: `Token ${symbol} already exists` };
    }
    
    // Register new token
    this.tokenRegistry[symbol] = {
      name,
      symbol,
      decimals,
      totalSupply: initialSupply,
      maxSupply,
      contract: contractAddress
    };
    
    return { success: true, token: this.tokenRegistry[symbol] };
  }
  
  getTokenInfo(symbol) {
    return this.tokenRegistry[symbol] || null;
  }
  
  getAllTokens() {
    return this.tokenRegistry;
  }
  
  // For smart contracts later
  executeSmartContract(contractAddress, method, params, sender) {
    // This will be implemented in the next phase
    // It's a placeholder for future smart contract execution
    return { success: false, message: 'Smart contracts not implemented yet' };
  }
}

module.exports = { Block, Transaction, Blockchain };