/**
 * NexaStream Smart Contract
 * Deploy on Ethereum Sepolia Testnet (FREE!)
 * 
 * Faucet Sepolia: https://www.alchemy.com/faucets/ethereum-sepolia
 */

const CONTRACTS = {
  // Sepolia Testnet (FREE - usar faucet)
  sepolia: {
    network: 'Ethereum Sepolia Testnet',
    rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/demo',
    chainId: 11155111,
    symbol: 'SEP',
    explorer: 'https://sepolia.etherscan.io',
    
    // NEXA Token Contract (ERC-20)
    tokenAddress: process.env.SEPOLIA_TOKEN_ADDRESS || '0x0000000000000000000000000000000000000000',
    
    // Rewards Pool Contract
    rewardsAddress: process.env.SEPOLIA_REWARDS_ADDRESS || '0x0000000000000000000000000000000000000000',
  },
  
  // Mainnet (CUSTO REAL ~$10-100)
  mainnet: {
    network: 'Ethereum Mainnet',
    rpcUrl: process.env.MAINNET_RPC_URL || '',
    chainId: 1,
    symbol: 'ETH',
    explorer: 'https://etherscan.io',
    tokenAddress: process.env.MAINNET_TOKEN_ADDRESS || '',
    rewardsAddress: process.env.MAINNET_REWARDS_ADDRESS || '',
  }
};

// ABI do Token ERC-20
const TOKEN_ABI = [
  "function name() public view returns (string)",
  "function symbol() public view returns (string)",
  "function decimals() public view returns (uint8)",
  "function totalSupply() public view returns (uint256)",
  "function balanceOf(address account) public view returns (uint256)",
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function allowance(address owner, address spender) public view returns (uint256)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) public returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)"
];

// ABI do Rewards Pool
const REWARDS_ABI = [
  "function stake(uint256 amount) public",
  "function unstake(uint256 amount) public",
  "function claimRewards() public",
  "function getRewardRate() public view returns (uint256)",
  "function getStakedBalance(address user) public view returns (uint256)",
  "function getPendingRewards(address user) public view returns (uint256)",
  "event Staked(address indexed user, uint256 amount)",
  "event Unstaked(address indexed user, uint256 amount)",
  "event RewardsClaimed(address indexed user, uint256 amount)"
];

module.exports = {
  CONTRACTS,
  TOKEN_ABI,
  REWARDS_ABI
};
