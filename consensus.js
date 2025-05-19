const SHA256 = require('crypto-js/sha256');

class ConsensusEngine {
    static proofOfWork(block, difficulty) {
        const target = Array(difficulty + 1).join('0');
        let nonce = 0;
        let hash = '';
        
        console.log('Mining block...');
        
        while (!hash.startsWith(target)) {
            nonce++;
            hash = SHA256(block.index + block.timestamp + JSON.stringify(block.data) + 
                  block.previousHash + nonce).toString();
            
            // Log progress periodically
            if (nonce % 10000 === 0) {
                process.stdout.write('.');
            }
        }
        
        console.log(`\nBlock mined with nonce: ${nonce}, hash: ${hash}`);
        return { nonce, hash };
    }
    
    static proofOfStake(validators, currentValidator) {
        // Simple PoS implementation based on stake
        // In a real implementation, this would consider stake amount, coin age, etc.
        const totalStake = validators.reduce((sum, v) => sum + v.stake, 0);
        const threshold = Math.random() * totalStake;
        
        let stakeSoFar = 0;
        for (const validator of validators) {
            stakeSoFar += validator.stake;
            if (stakeSoFar >= threshold) {
                return validator.address;
            }
        }
        
        return validators[0].address; // Fallback
    }

    static validateBlock(block, previousBlock, difficulty) {
        // Check index
        if (block.index !== previousBlock.index + 1) {
            return { valid: false, reason: 'Invalid block index' };
        }
        
        // Check previous hash
        if (block.previousHash !== previousBlock.hash) {
            return { valid: false, reason: 'Invalid previous hash' };
        }
        
        // Check block hash
        const hash = SHA256(block.index + block.timestamp + JSON.stringify(block.data) + 
                    block.previousHash + block.nonce).toString();
        
        if (hash !== block.hash) {
            return { valid: false, reason: 'Invalid hash' };
        }
        
        // Check hash meets difficulty
        if (!block.hash.startsWith(Array(difficulty + 1).join('0'))) {
            return { valid: false, reason: 'Hash does not meet difficulty requirement' };
        }
        
        return { valid: true };
    }
}

module.exports = ConsensusEngine;