const crypto = require('crypto');
const EC = require('elliptic').ec;
const ec = new EC('secp256k1'); // same as Bitcoin

class Transaction {
  constructor(fromAddress, toAddress, amount) {
    this.fromAddress = fromAddress;
    this.toAddress = toAddress;
    this.amount = amount;
    this.signature = null;
  }

  calculateHash() {
    return crypto
      .createHash('sha256')
      .update(this.fromAddress + this.toAddress + this.amount)
      .digest('hex');
  }

  signTransaction(signingKey) {
    if (signingKey.getPublic('hex') !== this.fromAddress) {
      throw new Error('You cannot sign transactions for other wallets!');
    }

    const hashTx = this.calculateHash();
    const sig = signingKey.sign(hashTx, 'base64');
    this.signature = sig.toDER('hex');
  }

  isValid() {
    // Mining reward (no from address)
    if (this.fromAddress === null) return true;

    if (!this.signature || this.signature.length === 0) {
      throw new Error('No signature in this transaction');
    }

    const publicKey = ec.keyFromPublic(this.fromAddress, 'hex');
    return publicKey.verify(this.calculateHash(), this.signature);
  }
}

class Block {
  constructor(timestamp, transactions, previousHash = '') {
    this.timestamp = timestamp;
    this.transactions = transactions;
    this.previousHash = previousHash;
    this.nonce = 0;
    this.hash = this.calculateHash();
  }

  calculateHash() {
    return crypto
      .createHash('sha256')
      .update(this.timestamp + JSON.stringify(this.transactions) + this.previousHash + this.nonce)
      .digest('hex');
  }

  mineBlock(difficulty) {
    const target = Array(difficulty + 1).join('0');
    while (this.hash.substring(0, difficulty) !== target) {
      this.nonce++;
      this.hash = this.calculateHash();
    }
    console.log(`⛏️ Mined CRTN Block: ${this.hash}`);
  }

  hasValidTransactions() {
    return this.transactions.every(tx => tx.isValid());
  }
}

class CryptoniumBlockchain {
  constructor() {
    this.chain = [this.createGenesisBlock()];
    this.difficulty = 2;
    this.pendingTransactions = [];
  }

  createGenesisBlock() {
    return new Block(Date.now().toString(), [], '0');
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  addTransaction(transaction) {
    if (!transaction.fromAddress || !transaction.toAddress) {
      throw new Error('Transaction must include from and to address');
    }

    if (!transaction.isValid()) {
      throw new Error('Invalid transaction!');
    }

    this.pendingTransactions.push(transaction);
  }

  minePendingTransactions(minerAddress) {
    const rewardTx = new Transaction(null, minerAddress, 100);
    this.pendingTransactions.push(rewardTx);

    const block = new Block(Date.now().toString(), this.pendingTransactions, this.getLatestBlock().hash);
    block.mineBlock(this.difficulty);

    this.chain.push(block);
    this.pendingTransactions = [];
  }

  getBalance(address) {
    let balance = 0;

    for (const block of this.chain) {
      for (const tx of block.transactions) {
        if (tx.fromAddress === address) balance -= tx.amount;
        if (tx.toAddress === address) balance += tx.amount;
      }
    }

    return balance;
  }

  isChainValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const curr = this.chain[i];

      if (!curr.hasValidTransactions()) return false;
      if (curr.hash !== curr.calculateHash()) return false;
      if (curr.previousHash !== this.chain[i - 1].hash) return false;
    }

    return true;
  }
}

module.exports = { Transaction, CryptoniumBlockchain, ec };
