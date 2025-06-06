const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const crypto = require('crypto');
const config = require('./config');

const { Block, Blockchain } = require('./blockchain');
const P2PNetwork = require('./p2p-network');
const { BlockchainPersistence } = require('./persistence');
const { AuthManager } = require('./auth');

const app = express();
app.use(bodyParser.json());
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

const blockchain = new Blockchain();
blockchain.difficulty = config.DIFFICULTY;
blockchain.miningReward = config.MINING_REWARD;

const p2pNetwork = new P2PNetwork(blockchain, config.P2P_PORT || 6001);
const p2pServer = p2pNetwork.initP2PServer();

const persistence = new BlockchainPersistence(config);
persistence.connect().then(async connected => {
    if (connected) {
        const savedData = await persistence.loadChain();
        if (savedData && savedData.chain && savedData.chain.length > 0) {
            blockchain.chain = savedData.chain;
            console.log(`Blockchain loaded from database: ${blockchain.chain.length} blocks`);
        }
        
        const pendingTxs = await persistence.loadPendingTransactions();
        if (pendingTxs && pendingTxs.length > 0) {
            blockchain.pendingTransactions = pendingTxs;
            console.log(`Loaded ${pendingTxs.length} pending transactions`);
        }
    }
});

setInterval(() => {
    persistence.saveChain(blockchain);
    persistence.savePendingTransactions(blockchain.pendingTransactions);
}, 60000); 
const authManager = new AuthManager(config);

const authMiddleware = (req, res, next) => {
    return authManager.authMiddleware.call(authManager, req, res, next);
};

const adminMiddleware = (req, res, next) => {
    return authManager.adminMiddleware.call(authManager, req, res, next);
};

function generateWallet() {
    const privateKey = crypto.randomBytes(32).toString('hex');
    const address = 'wallet_' + crypto.createHash('sha256').update(privateKey).digest('hex').substring(0, 40);
    
    return { address, privateKey };
}


app.get('/blockchain/info', (req, res) => {
    res.json({
        chainLength: blockchain.chain.length,
        difficulty: blockchain.difficulty,
        miningReward: blockchain.miningReward,
        pendingTransactions: blockchain.pendingTransactions.length,
        consensus: blockchain.currentConsensus,
        isValid: blockchain.isChainValid().valid
    });
});

app.get('/blocks', (req, res) => {
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 10;
    
    const startIndex = Math.max(0, blockchain.chain.length - 1 - (page * limit));
    const endIndex = Math.max(0, startIndex - limit + 1);
    
    const blocks = [];
    for (let i = startIndex; i >= endIndex; i--) {
        blocks.push(blockchain.chain[i]);
    }
    
    res.json({
        blocks,
        page,
        limit,
        total: blockchain.chain.length,
        hasMore: endIndex > 0
    });
});

app.get('/block/:index', (req, res) => {
    const index = parseInt(req.params.index);
    if (isNaN(index) || index < 0 || index >= blockchain.chain.length) {
        return res.status(404).json({ error: 'Block not found' });
    }
    
    res.json(blockchain.chain[index]);
});

app.post('/auth/register', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }
    
    const { address, privateKey } = generateWallet();
    
    const result = await authManager.registerUser(username, password, address, privateKey);
    
    if (!result.success) {
        return res.status(400).json({ error: result.message });
    }
    
    res.status(201).json({ 
        message: 'User registered successfully',
        user: result.user,
        wallet: { address }
    });
});

app.post('/auth/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }
    
    const result = await authManager.authenticateUser(username, password);
    
    if (!result.success) {
        return res.status(401).json({ error: result.message });
    }
    
    res.json({
        message: 'Authentication successful',
        token: result.token,
        user: result.user
    });
});


app.get('/user/profile', authMiddleware, (req, res) => {
    try {
        if (!req.user || !req.user.address) {
            return res.status(400).json({ error: 'Invalid user data in request' });
        }
        
        const balance = blockchain.getBalanceOfAddress(req.user.address);
        
        res.json({
            username: req.user.username,
            address: req.user.address,
            balance,
            isAdmin: req.user.isAdmin || false
        });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ error: 'Failed to retrieve user profile', details: error.message });
    }
});

app.post('/transaction', authMiddleware, (req, res) => {
    try {
        const { to, amount } = req.body;
        
        if (!to) {
            return res.status(400).json({ error: 'Recipient address (to) is required' });
        }
        
        if (!amount) {
            return res.status(400).json({ error: 'Transaction amount is required' });
        }
        
        if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
            return res.status(400).json({ error: 'Amount must be a positive number' });
        }
        
        const balance = blockchain.getBalanceOfAddress(req.user.address);
        if (parseFloat(amount) > balance) {
            return res.status(400).json({ error: 'Insufficient balance', available: balance });
        }
        
        const transaction = {
            from: req.user.address,
            to,
            amount: parseFloat(amount),
            timestamp: Date.now()
        };
        
        
        const result = blockchain.createTransaction(transaction);
        
        if (!result.success) {
            return res.status(400).json({ error: result.message });
        }
        
        res.json({ 
            message: 'Transaction created successfully',
            transaction
        });
    } catch (error) {
        console.error('Error creating transaction:', error);
        res.status(500).json({ error: 'Failed to create transaction', details: error.message });
    }
});

app.post('/mine', authMiddleware, (req, res) => {
    const result = blockchain.minePendingTransactions(req.user.address);
    
    if (!result.success) {
        return res.status(400).json({ error: result.message });
    }
    
    persistence.saveChain(blockchain);
    
    res.json({
        message: 'Block mined successfully',
        block: result.block
    });
});

app.get('/transactions/history', authMiddleware, (req, res) => {
    const address = req.user.address;
    const transactions = [];
    
    blockchain.chain.forEach(block => {
        if (Array.isArray(block.data)) {
            block.data.forEach(tx => {
                if (tx.from === address || tx.to === address) {
                    transactions.push({
                        ...tx,
                        blockIndex: block.index,
                        blockHash: block.hash,
                        confirmed: true
                    });
                }
            });
        }
    });
    
    blockchain.pendingTransactions.forEach(tx => {
        if (tx.from === address || tx.to === address) {
            transactions.push({
                ...tx,
                confirmed: false
            });
        }
    });
    
    transactions.sort((a, b) => b.timestamp - a.timestamp);
    
    res.json(transactions);
});

app.get('/network/status', authMiddleware, adminMiddleware, (req, res) => {
    const stats = p2pNetwork.getNetworkStats();
    res.json(stats);
});

app.post('/network/peers', authMiddleware, adminMiddleware, (req, res) => {
    const { peer } = req.body;
    
    if (!peer) {
        return res.status(400).json({ error: 'Peer URL is required' });
    }
    
    p2pNetwork.connectToPeers([peer]);
    
    res.json({ message: 'Connecting to peer', peer });
});

app.put('/admin/config', authMiddleware, adminMiddleware, (req, res) => {
    const { difficulty, miningReward, consensus } = req.body;
    
    if (difficulty !== undefined) {
        blockchain.difficulty = parseInt(difficulty);
    }
    
    if (miningReward !== undefined) {
        blockchain.miningReward = parseFloat(miningReward);
    }
    
    if (consensus) {
        blockchain.switchConsensus(consensus);
    }
    
    res.json({
        message: 'Configuration updated',
        config: {
            difficulty: blockchain.difficulty,
            miningReward: blockchain.miningReward,
            consensus: blockchain.currentConsensus
        }
    });
});

const PORT = config.API_PORT;
app.listen(PORT, () => {
    console.log(`Blockchain API server running on port ${PORT}`);
});

process.on('SIGINT', async () => {
    console.log('Shutting down...');
    await persistence.saveChain(blockchain);
    await persistence.savePendingTransactions(blockchain.pendingTransactions);
    await persistence.close();
    process.exit();
});