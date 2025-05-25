const SHA256 = require('crypto-js/sha256');

// Contract types
const CONTRACT_TYPES = {
  TOKEN: 'token',
  CUSTOM: 'custom'
};

class SmartContract {
  constructor(owner, type, code, initialState = {}) {
    this.owner = owner;
    this.type = type;
    this.code = code;
    this.state = initialState;
    this.address = this.generateAddress();
    this.createdAt = Date.now();
  }
  
  generateAddress() {
    return SHA256(this.owner + this.type + JSON.stringify(this.code) + 
                 this.createdAt).toString().substring(0, 40);
  }
  
  execute(method, params, sender) {
    if (!this.code[method]) {
      return { success: false, message: `Method ${method} does not exist` };
    }
    
    try {
      // Execute the method
      const result = this.code[method](this.state, params, { sender });
      
      // Update contract state
      if (result.newState) {
        this.state = { ...this.state, ...result.newState };
      }
      
      return { success: true, result: result.result };
    } catch (error) {
      return { success: false, message: `Execution error: ${error.message}` };
    }
  }
}

class TokenContract extends SmartContract {
  constructor(owner, name, symbol, decimals, initialSupply, maxSupply) {
    
    const tokenCode = {
      // Transfer tokens from sender to recipient
      transfer: (state, { to, amount }, { sender }) => {
        if (!state.balances[sender] || state.balances[sender] < amount) {
          throw new Error('Insufficient balance');
        }
        
        // Update balances
        state.balances[sender] -= amount;
        state.balances[to] = (state.balances[to] || 0) + amount;
        
        return { 
          newState: { balances: state.balances },
          result: { from: sender, to, amount } 
        };
      },
      
      // Allow another address to spend tokens on behalf of the owner
      approve: (state, { spender, amount }, { sender }) => {
        if (!state.allowances[sender]) {
          state.allowances[sender] = {};
        }
        
        state.allowances[sender][spender] = amount;
        
        return { 
          newState: { allowances: state.allowances },
          result: { owner: sender, spender, amount } 
        };
      },
      
      // Transfer tokens from one address to another (if approved)
      transferFrom: (state, { from, to, amount }, { sender }) => {
        // Check allowance
        if (!state.allowances[from] || 
            !state.allowances[from][sender] || 
            state.allowances[from][sender] < amount) {
          throw new Error('Insufficient allowance');
        }
        
        // Check balance
        if (!state.balances[from] || state.balances[from] < amount) {
          throw new Error('Insufficient balance');
        }
        
        // Update balances
        state.balances[from] -= amount;
        state.balances[to] = (state.balances[to] || 0) + amount;
        
        // Update allowance
        state.allowances[from][sender] -= amount;
        
        return { 
          newState: { 
            balances: state.balances,
            allowances: state.allowances
          },
          result: { from, to, amount, spender: sender } 
        };
      },
      
      // Mint new tokens (only owner)
      mint: (state, { to, amount }, { sender }) => {
        // Check if sender is contract owner
        if (sender !== state.owner) {
          throw new Error('Only owner can mint tokens');
        }
        
        // Check max supply
        if (state.totalSupply + amount > state.maxSupply) {
          throw new Error('Exceeds maximum supply');
        }
        
        // Update balance and total supply
        state.balances[to] = (state.balances[to] || 0) + amount;
        state.totalSupply += amount;
        
        return { 
          newState: { 
            balances: state.balances,
            totalSupply: state.totalSupply
          },
          result: { to, amount, totalSupply: state.totalSupply } 
        };
      },
      
      // Burn tokens
      burn: (state, { amount }, { sender }) => {
        // Check balance
        if (!state.balances[sender] || state.balances[sender] < amount) {
          throw new Error('Insufficient balance');
        }
        
        // Update balance and total supply
        state.balances[sender] -= amount;
        state.totalSupply -= amount;
        
        return { 
          newState: { 
            balances: state.balances,
            totalSupply: state.totalSupply
          },
          result: { from: sender, amount, totalSupply: state.totalSupply } 
        };
      },
      
      // Get token balance
      balanceOf: (state, { address }) => {
        return { 
          newState: {},
          result: { address, balance: state.balances[address] || 0 } 
        };
      },
      
      // Get token allowance
      allowance: (state, { owner, spender }) => {
        const allowance = state.allowances[owner] ? 
          (state.allowances[owner][spender] || 0) : 0;
          
        return { 
          newState: {},
          result: { owner, spender, allowance } 
        };
      }
    };
    
    // Initial state for token contract
    const initialState = {
      name,
      symbol,
      decimals,
      totalSupply: initialSupply,
      maxSupply,
      owner,
      balances: {},
      allowances: {}
    };
    
    // Assign initial supply to owner
    initialState.balances[owner] = initialSupply;
    
    super(owner, CONTRACT_TYPES.TOKEN, tokenCode, initialState);
  }
  
  // Helper methods specific to tokens
  getName() {
    return this.state.name;
  }
  
  getSymbol() {
    return this.state.symbol;
  }
  
  getTotalSupply() {
    return this.state.totalSupply;
  }
  
  getDecimals() {
    return this.state.decimals;}
  }    
