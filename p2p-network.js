const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

class P2PNetwork {
    constructor(blockchain, port = 6001) {
        this.blockchain = blockchain;
        this.sockets = [];
        this.nodeId = uuidv4();
        this.port = port;
        this.knownPeers = new Set();
        
        // Listen for blockchain events
        this.setupBlockchainEvents();
    }
    
    setupBlockchainEvents() {
        this.blockchain.on('blockMined', (block) => {
            this.broadcast({
                type: 'NEW_BLOCK',
                data: block
            });
        });
        
        this.blockchain.on('newTransaction', (transaction) => {
            this.broadcast({
                type: 'NEW_TRANSACTION',
                data: transaction
            });
        });
    }
    
    initP2PServer() {
        const server = new WebSocket.Server({ port: this.port });
        server.on('connection', (socket) => this.connectSocket(socket));
        console.log(`P2P Server initialized, listening on port: ${this.port}`);
        
        return server;
    }
    
    connectSocket(socket) {
        this.sockets.push(socket);
        this.initMessageHandler(socket);
        this.initErrorHandler(socket);
        
        // Send blockchain state to the new peer
        this.sendMessage(socket, {
            type: 'BLOCKCHAIN_RESPONSE',
            data: this.blockchain.chain
        });
        
        // Send list of peers
        this.sendMessage(socket, {
            type: 'PEERS_RESPONSE',
            data: Array.from(this.knownPeers)
        });
        
        // Query peer for their known peers
        this.sendMessage(socket, {
            type: 'PEERS_QUERY'
        });
    }
    
    connectToPeers(newPeers) {
        newPeers.forEach((peer) => {
            // Prevent connecting to self or existing connections
            if (peer !== `ws://localhost:${this.port}` && !this.knownPeers.has(peer)) {
                try {
                    const socket = new WebSocket(peer);
                    
                    socket.on('open', () => {
                        this.connectSocket(socket);
                        this.knownPeers.add(peer);
                        console.log(`Connected to peer: ${peer}`);
                    });
                    
                    socket.on('error', (error) => {
                        console.log(`Connection to peer ${peer} failed: ${error.message}`);
                    });
                } catch (error) {
                    console.log(`Connection to peer ${peer} failed: ${error.message}`);
                }
            }
        });
    }
    
    initMessageHandler(socket) {
        socket.on('message', (data) => {
            try {
                const message = JSON.parse(data);
                this.handleMessage(socket, message);
            } catch (error) {
                console.log('Error parsing message:', error);
            }
        });
    }
    
    handleMessage(socket, message) {
        console.log(`Received message: ${message.type}`);
        
        switch (message.type) {
            case 'BLOCKCHAIN_QUERY':
                this.sendMessage(socket, {
                    type: 'BLOCKCHAIN_RESPONSE',
                    data: this.blockchain.chain
                });
                break;
                
            case 'BLOCKCHAIN_RESPONSE':
                this.handleBlockchainResponse(message.data);
                break;
                
            case 'NEW_BLOCK':
                this.handleNewBlock(message.data);
                break;
                
            case 'NEW_TRANSACTION':
                this.handleNewTransaction(message.data);
                break;
                
            case 'PEERS_QUERY':
                this.sendMessage(socket, {
                    type: 'PEERS_RESPONSE',
                    data: Array.from(this.knownPeers)
                });
                break;
                
            case 'PEERS_RESPONSE':
                this.connectToPeers(message.data);
                break;
        }
    }
    
    handleBlockchainResponse(receivedChain) {
        // Compare received chain with our chain
        const localChainLength = this.blockchain.chain.length;
        const receivedChainLength = receivedChain.length;
        
        if (receivedChainLength > localChainLength) {
            console.log('Received blockchain is longer than local blockchain');
            
            // Validate received chain
            const isValidChain = this.validateReceivedChain(receivedChain);
            
            if (isValidChain) {
                console.log('Replacing local chain with received chain');
                this.blockchain.chain = receivedChain;
            } else {
                console.log('Received chain is invalid');
            }
        } else {
            console.log('Received blockchain not longer than current blockchain. No replacement needed.');
        }
    }
    
    validateReceivedChain(chain) {
        // Simple validation - in a real implementation, you'd do more extensive validation
        if (!Array.isArray(chain) || chain.length === 0) {
            return false;
        }
        
        // Check if the genesis block matches
        if (JSON.stringify(chain[0]) !== JSON.stringify(this.blockchain.chain[0])) {
            return false;
        }
        
        // Additional validation would go here
        
        return true;
    }
    
    handleNewBlock(block) {
        // Validate the received block
        const latestBlock = this.blockchain.getLatestBlock();
        
        if (block.previousHash === latestBlock.hash && block.index === latestBlock.index + 1) {
            // Valid block, add to chain
            this.blockchain.chain.push(block);
            console.log('Added block received from network');
            
            // Clear transactions that are now in the block
            this.blockchain.pendingTransactions = this.blockchain.pendingTransactions.filter(tx => 
                !block.data.some(blockTx => 
                    blockTx.from === tx.from && 
                    blockTx.to === tx.to && 
                    blockTx.amount === tx.amount && 
                    blockTx.timestamp === tx.timestamp
                )
            );
        } else {
            // Request the full blockchain as our chain might be outdated
            this.broadcast({
                type: 'BLOCKCHAIN_QUERY'
            });
        }
    }
    
    handleNewTransaction(transaction) {
        // Check if transaction already in pending transactions
        const txExists = this.blockchain.pendingTransactions.some(tx => 
            tx.from === transaction.from && 
            tx.to === transaction.to && 
            tx.amount === transaction.amount && 
            tx.timestamp === transaction.timestamp
        );
        
        if (!txExists) {
            this.blockchain.pendingTransactions.push(transaction);
            console.log('Added transaction from network to pending transactions');
        }
    }
    
    initErrorHandler(socket) {
        socket.on('close', () => this.closeConnection(socket));
        socket.on('error', () => this.closeConnection(socket));
    }
    
    closeConnection(socket) {
        this.sockets = this.sockets.filter(s => s !== socket);
        console.log('Connection closed');
    }
    
    sendMessage(socket, message) {
        socket.send(JSON.stringify(message));
    }
    
    broadcast(message) {
        this.sockets.forEach(socket => this.sendMessage(socket, message));
    }
    
    queryBlockchain() {
        this.broadcast({ type: 'BLOCKCHAIN_QUERY' });
    }
    
    queryPeers() {
        this.broadcast({ type: 'PEERS_QUERY' });
    }
    
    getNetworkStats() {
        return {
            nodeId: this.nodeId,
            connectedPeers: this.sockets.length,
            knownPeers: Array.from(this.knownPeers),
            port: this.port
        };
    }
}

module.exports = P2PNetwork;