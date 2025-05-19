const http = require('http');
const https = require('https');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3000';
const API_PROTOCOL = API_URL.startsWith('https') ? https : http;
const API_HOSTNAME = new URL(API_URL).hostname;
const API_PORT = new URL(API_URL).port || (API_URL.startsWith('https') ? 443 : 80);
const API_PATH = new URL(API_URL).pathname || '';

console.log('=== Blockchain API Test Script ===');
console.log(`Testing API at: ${API_URL}`);
console.log('Current Date:', new Date().toISOString());
console.log('-------------------------------------');


// Simple HTTP request function
function request(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_HOSTNAME,
      port: API_PORT,
      path: `${API_PATH}${path}`.replace('//', '/'),
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = API_PROTOCOL.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve({
            status: res.statusCode,
            data: parsedData
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: responseData
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Run tests
async function runTests() {
  try {
    console.log('1. Testing API connectivity...');
    let response = await request('GET', '/blockchain/info');
    
    if (response.status >= 200 && response.status < 300) {
      console.log('✓ API is available');
      console.log('  Chain length:', response.data.chainLength);
      console.log('  Is valid:', response.data.isValid);
      console.log('  Consensus:', response.data.consensus);
    } else {
      console.log('✗ API is not responding correctly (status:', response.status, ')');
      return;
    }

    // Register a test user
    console.log('\n2. Registering test user...');
    const testUser = {
      username: `tester_${Date.now().toString().slice(-5)}`,
      password: 'test123'
    };
    
    response = await request('POST', '/auth/register', testUser);
    
    if (response.status === 201 || response.status === 200) {
      console.log('✓ User registered successfully');
      console.log('  Username:', response.data.user?.username || testUser.username);
      console.log('  Wallet address:', response.data.wallet?.address);
    } else {
      console.log('✗ Registration failed (status:', response.status, ')');
      console.log('  Error:', response.data.error || 'Unknown error');
      console.log('  Trying login instead...');
    }
    
    // Login
    console.log('\n3. Logging in...');
    response = await request('POST', '/auth/login', testUser);
    
    let token;
    if (response.status === 200) {
      token = response.data.token;
      console.log('✓ Login successful');
      console.log('  User:', response.data.user?.username || testUser.username);
    } else {
      console.log('✗ Login failed (status:', response.status, ')');
      console.log('  Error:', response.data.error || 'Unknown error');
      return;
    }
    
    // Get user profile
    console.log('\n4. Getting user profile...');
    response = await request('GET', '/user/profile', null, token);
    
    const userAddress = response.data.address;
    if (response.status === 200) {
      console.log('✓ Profile retrieved');
      console.log('  Username:', response.data.username);
      console.log('  Address:', response.data.address);
      console.log('  Balance:', response.data.balance);
    } else {
      console.log('✗ Could not get profile (status:', response.status, ')');
    }
    
    // Create transaction (to self for testing)
    console.log('\n5. Creating a transaction...');
    response = await request('POST', '/transaction', {
      to: userAddress, // Send to self for testing
      amount: 1
    }, token);
    
    if (response.status === 200) {
      console.log('✓ Transaction created');
      console.log('  Message:', response.data.message);
    } else {
      console.log('✗ Transaction failed (status:', response.status, ')');
      console.log('  Error:', response.data.error || 'Unknown error');
    }
    
    // Mine a block
    console.log('\n6. Mining a block...');
    response = await request('POST', '/mine', null, token);
    
    if (response.status === 200) {
      console.log('✓ Block mined successfully');
      console.log('  Block index:', response.data.block?.index);
      console.log('  Block hash:', response.data.block?.hash?.substr(0, 10) + '...');
    } else {
      console.log('✗ Mining failed (status:', response.status, ')');
      console.log('  Error:', response.data.error || 'Unknown error');
    }
    
    // Get transaction history
    console.log('\n7. Getting transaction history...');
    response = await request('GET', '/transactions/history', null, token);
    
    if (response.status === 200) {
      console.log('✓ Transaction history retrieved');
      console.log('  Found', response.data.length, 'transactions');
      
      if (response.data.length > 0) {
        console.log('  Latest transaction:');
        console.log('    From:', response.data[0].from);
        console.log('    To:', response.data[0].to);
        console.log('    Amount:', response.data[0].amount);
      }
    } else {
      console.log('✗ Could not get transaction history (status:', response.status, ')');
    }
    
    // Get blocks
    console.log('\n8. Getting blockchain blocks...');
    response = await request('GET', '/blocks');
    
    if (response.status === 200) {
      console.log('✓ Blocks retrieved');
      console.log('  Total blocks:', response.data.total);
      console.log('  Retrieved', response.data.blocks?.length, 'blocks');
    } else {
      console.log('✗ Could not get blocks (status:', response.status, ')');
    }
    
    // Test P2P feature indirectly by checking updated info
    console.log('\n9. Checking if blockchain info was updated...');
    response = await request('GET', '/blockchain/info');
    
    console.log('  Current chain length:', response.data.chainLength);
    console.log('  Is blockchain valid:', response.data.isValid);
    
    console.log('\n✓ All tests completed!');
    
  } catch (error) {
    console.log('✗ Test failed with error:', error.message);
  }
}

runTests();