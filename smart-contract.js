const SHA256 = require('crypto-js/sha256');

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
      const result = this.code[method](this.state, params, { sender });
      
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
      transfer: (state, { to, amount }, { sender }) => {
        if (!state.balances[sender] || state.balances[sender] < amount) {
          throw new Error('Insufficient balance');
        }
        
        state.balances[sender] -= amount;
        state.balances[to] = (state.balances[to] || 0) + amount;
        
        return { 
          newState: { balances: state.balances },
          result: { from: sender, to, amount } 
        };
      },
      
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
      
      transferFrom: (state, { from, to, amount }, { sender }) => {
        if (!state.allowances[from] || 
            !state.allowances[from][sender] || 
            state.allowances[from][sender] < amount) {
          throw new Error('Insufficient allowance');
        }
        
        if (!state.balances[from] || state.balances[from] < amount) {
          throw new Error('Insufficient balance');
        }
        
        state.balances[from] -= amount;
        state.balances[to] = (state.balances[to] || 0) + amount;
        
        state.allowances[from][sender] -= amount;
        
        return { 
          newState: { 
            balances: state.balances,
            allowances: state.allowances
          },
          result: { from, to, amount, spender: sender } 
        };
      },
      
      mint: (state, { to, amount }, { sender }) => {
        if (sender !== state.owner) {
          throw new Error('Only owner can mint tokens');
        }
        
        if (state.totalSupply + amount > state.maxSupply) {
          throw new Error('Exceeds maximum supply');
        }
        
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
      
      burn: (state, { amount }, { sender }) => {
        if (!state.balances[sender] || state.balances[sender] < amount) {
          throw new Error('Insufficient balance');
        }
        
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
      
      balanceOf: (state, { address }) => {
        return { 
          newState: {},
          result: { address, balance: state.balances[address] || 0 } 
        };
      },
      
      allowance: (state, { owner, spender }) => {
        const allowance = state.allowances[owner] ? 
          (state.allowances[owner][spender] || 0) : 0;
          
        return { 
          newState: {},
          result: { owner, spender, allowance } 
        };
      }
    };
    
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
    
    initialState.balances[owner] = initialSupply;
    
    super(owner, CONTRACT_TYPES.TOKEN, tokenCode, initialState);
  }
  
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
