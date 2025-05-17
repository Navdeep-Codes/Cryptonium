const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Blockchain } = require('./blockchain');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Initialize our blockchain
const myBlockchain = new Blockchain();

// Get the entire blockchain
app.get('/blockchain', (req, res) => {
    res.json({
        chain: myBlockchain.chain,
        pendingTransactions: myBlockchain.pendingTransactions,
        isValid: myBlockchain.isChainValid()
    });
});

// Create a new transaction
app.post('/transaction', (req, res) => {
    const { from, to, amount } = req.body;
    
    if (!from || !to || !amount) {
        return res.status(400).json({ error: 'Please provide from, to, and amount fields' });
    }
    
    myBlockchain.createTransaction({ from, to, amount });
    res.json({ message: 'Transaction added to pending transactions' });
});

// Mine pending transactions
app.post('/mine', (req, res) => {
    const { minerAddress } = req.body;
    
    if (!minerAddress) {
        return res.status(400).json({ error: 'Please provide a miner address' });
    }
    
    myBlockchain.minePendingTransactions(minerAddress);
    res.json({ 
        message: 'Mining successful!',
        newBlock: myBlockchain.getLatestBlock() 
    });
});

// Get balance of an address
app.get('/balance/:address', (req, res) => {
    const balance = myBlockchain.getBalanceOfAddress(req.params.address);
    res.json({ address: req.params.address, balance });
});

// Get all blocks
app.get('/blocks', (req, res) => {
    res.json(myBlockchain.chain);
});

// Get a specific block by index
app.get('/block/:index', (req, res) => {
    const index = parseInt(req.params.index);
    if (index >= 0 && index < myBlockchain.chain.length) {
        res.json(myBlockchain.chain[index]);
    } else {
        res.status(404).json({ error: 'Block not found' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Blockchain API server running on port ${PORT}`);
});