// CTNM token economics configuration
const ctnmTokenomics = {
  name: 'Cryptonium',
  symbol: 'CTNM',
  decimals: 18,  // Like Ethereum (1 CTNM = 10^18 smallest units)
  initialSupply: 0,  // Start with 0 supply
  maxSupply: 21000000, // Maximum possible supply (like Bitcoin)
  blockReward: 50,  // Initial block reward
  blockRewardHalvingInterval: 210000, // Number of blocks for halving (like Bitcoin)
  blockTime: 15  // Target time in seconds between blocks (like Ethereum)
};

module.exports = ctnmTokenomics;