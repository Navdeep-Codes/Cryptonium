const { Transaction, CryptoniumBlockchain, ec } = require('./cryptonium');

// Generate wallet key pair
const myKey = ec.genKeyPair();
const myWalletAddress = myKey.getPublic('hex');

const CRTN = new CryptoniumBlockchain();

const tx1 = new Transaction(myWalletAddress, 'recipient-public-key', 50);
tx1.signTransaction(myKey);
CRTN.addTransaction(tx1);

console.log('🚀 Mining...');
CRTN.minePendingTransactions(myWalletAddress);

console.log(`💰 Balance of my wallet is: ${CRTN.getBalance(myWalletAddress)}`);
console.log('✅ Blockchain valid?', CRTN.isChainValid());
