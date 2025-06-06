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
            
            if (nonce % 10000 === 0) {
                process.stdout.write('.');
            }
        }
        
        console.log(`\nBlock mined with nonce: ${nonce}, hash: ${hash}`);
        return { nonce, hash };
    }
    
    static calculateBlockHash(block) {
        return SHA256(block.index + block.timestamp + JSON.stringify(block.data) + 
                block.previousHash + block.nonce).toString();
    }
    
    static proofOfStake(validators, currentValidator) {
        
        const totalStake = validators.reduce((sum, v) => sum + v.stake, 0);
        const threshold = Math.random() * totalStake;
        
        let stakeSoFar = 0;
        for (const validator of validators) {
            stakeSoFar += validator.stake;
            if (stakeSoFar >= threshold) {
                return validator.address;
            }
        }
        
        return validators[0].address; 
    }

    static validateBlock(block, previousBlock, difficulty) {
        if (block.index !== previousBlock.index + 1) {
            return { valid: false, reason: 'Invalid block index' };
        }
        
        if (block.previousHash !== previousBlock.hash) {
            return { valid: false, reason: 'Invalid previous hash' };
        }
        
        const hash = this.calculateBlockHash(block);
        
        if (hash !== block.hash) {
            return { valid: false, reason: 'Invalid hash' };
        }
        
        if (!block.hash.startsWith(Array(difficulty + 1).join('0'))) {
            return { valid: false, reason: 'Hash does not meet difficulty requirement' };
        }
        
        return { valid: true };
    }
}

module.exports = ConsensusEngine;