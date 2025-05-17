// Example client-side code to interact with your blockchain API
async function getBlockchain() {
    const response = await fetch('http://your-blockchain-api.com/blockchain');
    return await response.json();
}

async function createTransaction(from, to, amount) {
    const response = await fetch('http://your-blockchain-api.com/transaction', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ from, to, amount })
    });
    
    return await response.json();
}

async function mineTransactions(minerAddress) {
    const response = await fetch('http://your-blockchain-api.com/mine', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ minerAddress })
    });
    
    return await response.json();
}

async function getBalance(address) {
    const response = await fetch(`http://your-blockchain-api.com/balance/${address}`);
    return await response.json();
}
console.log('Blockchain API client ready to use!');