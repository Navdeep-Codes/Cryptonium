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
    this.difficulty = 4; 
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
    this.tokenType = tokenType; 
    this.data = data; 
    this.timestamp = Date.now();
    this.signature = null;
    this.hash = this.calculateHash();
  }

  calculateHash() {
    return SHA256(this.from + this.to + this.amount + this.tokenType + 
                 JSON.stringify(this.data) + this.timestamp).toString();
  }

  signTransaction(signingKey) {
    this.signature = `signed:${signingKey}:${this.hash}`;
    return true;
  }

  isValid() {
    if (this.from === "BLOCKCHAIN_REWARD") {
      return true;
    }
    
    if (!this.signature) {
      return false;
    }
    
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
        contract: null 
      }
    };
  }

  createGenesisBlock() {
    const genesisTransactions = [];
    
  
    genesisTransactions.push(new Transaction(
      "Founder Address", 
      "wallet_fd698b1042eb86e2b2857ad779835e63c1a4e5a5", 
      1000000, 
      "CTNM",
      { type: "allocation", purpose: "founder" }
    ));
    
    
    const genesisBlock = new Block(0, Date.now(), genesisTransactions, '0');
    genesisBlock.hash = SHA256(JSON.stringify(genesisBlock)).toString();
    return genesisBlock;
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  minePendingTransactions(minerAddress) {
    this.updateMiningReward();
    
    const rewardTx = new Transaction(
      "BLOCKCHAIN_REWARD",
      minerAddress,
      this.miningReward,
      "CTNM",
      { type: "mining_reward" }
    );
    
    this.pendingTransactions.push(rewardTx);
    
    const block = new Block(
      this.chain.length,
      Date.now(),
      this.pendingTransactions,
      this.getLatestBlock().hash
    );
    
    block.mineBlock(this.difficulty);
    console.log('Block successfully mined!');
    this.chain.push(block);
    
    this.updateTokenSupply(block);
    
    this.pendingTransactions = [];
    
    this.blocksMined++;
    
    if (this.blocksMined % 2016 === 0) {
      this.adjustDifficulty();
    }
    
    this.emit('blockMined', block);
    
    return { 
      success: true, 
      block,
      reward: this.miningReward
    };
  }

  updateMiningReward() {
    const halvings = Math.floor(this.blocksMined / ctnmTokenomics.blockRewardHalvingInterval);
    if (halvings > 0) {
      this.miningReward = ctnmTokenomics.blockReward / Math.pow(2, halvings);
    }
  }

  updateTokenSupply(block) {
    block.data.forEach(tx => {
      if (tx.tokenType === 'CTNM' && tx.from === 'BLOCKCHAIN_REWARD') {
        this.tokenRegistry.CTNM.totalSupply += tx.amount;
      }
    });
    
    console.log(`CTNM Total Supply: ${this.tokenRegistry.CTNM.totalSupply}`);
  }

  createTransaction(transaction) {
    if (!transaction.from || !transaction.to || transaction.amount === undefined) {
      return { success: false, message: 'Invalid transaction parameters' };
    }
    
    if (!this.tokenRegistry[transaction.tokenType]) {
      return { success: false, message: `Token ${transaction.tokenType} does not exist` };
    }
    
    if (transaction.from !== 'BLOCKCHAIN_REWARD') {
      const senderBalance = this.getBalanceOfAddress(transaction.from, transaction.tokenType);
      if (senderBalance < transaction.amount) {
        return { 
          success: false, 
          message: `Insufficient balance. Required: ${transaction.amount}, Available: ${senderBalance}` 
        };
      }
      
      if (!transaction.isValid()) {
        return { success: false, message: 'Invalid transaction signature' };
      }
    }
    
    this.pendingTransactions.push(transaction);
    
    this.emit('newTransaction', transaction);
    
    return { success: true, transactionHash: transaction.hash };
  }
  
  getBalanceOfAddress(address, tokenType = 'CTNM') {
    let balance = 0;
    
    if (!this.tokenRegistry[tokenType]) {
      return 0;
    }

    for (const block of this.chain) {
      for (const trans of block.data) {
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

  isChainValid() {
  for (let i = 1; i < this.chain.length; i++) {
    const currentBlock = this.chain[i];
    const previousBlock = this.chain[i - 1];

    for (const tx of currentBlock.data) {
      if (typeof tx.isValid === 'function') {
        if (!tx.isValid()) {
          return { valid: false, reason: `Invalid transaction in block ${i}` };
        }
      } else {
        
        if (tx.from === "BLOCKCHAIN_REWARD") {
          continue;
        }
        
        
        if (!tx.from || !tx.to || tx.amount === undefined || tx.amount <= 0) {
          return { valid: false, reason: `Invalid transaction format in block ${i}` };
        }
        
        if (!tx.signature) {
          return { valid: false, reason: `Missing signature in transaction in block ${i}` };
        }
        
      }
    }

    if (currentBlock.previousHash !== previousBlock.hash) {
      return { valid: false, reason: `Invalid hash link at block ${i}` };
    }
    
    if (currentBlock.hash !== ConsensusEngine.calculateBlockHash(currentBlock)) {
      return { valid: false, reason: `Invalid hash at block ${i}` };
    }
  }
  
  return { valid: true };
}

  registerToken(name, symbol, decimals, initialSupply, maxSupply, contractAddress) {
    if (this.tokenRegistry[symbol]) {
      return { success: false, message: `Token ${symbol} already exists` };
    }
    
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
  
  executeSmartContract(contractAddress, method, params, sender) {
    return { success: false, message: 'Smart contracts not implemented yet' };
  }
}

module.exports = { Block, Transaction, Blockchain };