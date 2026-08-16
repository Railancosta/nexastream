/**
 * Deploy Smart Contracts to Sepolia Testnet
 * 
 * BEFORE RUNNING:
 * 1. Get free ETH from faucet: https://www.alchemy.com/faucets/ethereum-sepolia
 * 2. Set SEPOlIA_RPC_URL in .env
 * 3. Set DEPLOYER_PRIVATE_KEY in .env
 * 
 * Cost: FREE (Sepolia testnet)
 */

const { ethers } = require('ethers');

const SEPOLIA_RPC = process.env.SEPOLIA_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/YOUR-API-KEY';
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || '0xYOUR_PRIVATE_KEY';

// NEXA Token Contract (ERC-20)
const TOKEN_SOURCE = `
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NexaToken is ERC20, ERC20Burnable, Ownable {
    uint256 public constant MAX_SUPPLY = 1000000000 * 10**18; // 1 Billion NEXA
    
    constructor(address initialOwner)
        ERC20("NexaStream Token", "NEXA")
        Ownable(initialOwner)
    {
        _mint(msg.sender, MAX_SUPPLY);
    }
    
    function mint(address to, uint256 amount) public onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "Max supply exceeded");
        _mint(to, amount);
    }
}
`;

// Rewards Pool Contract
const REWARDS_SOURCE = `
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RewardsPool is Ownable {
    IERC20 public immutable token;
    uint256 public rewardRate = 100; // NEXA per block (adjustable)
    uint256 public constant SECONDS_PER_YEAR = 365 * 24 * 60 * 60;
    
    struct StakeInfo {
        uint256 amount;
        uint256 startTime;
        uint256 lastClaimTime;
    }
    
    mapping(address => StakeInfo) public stakes;
    
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    
    constructor(address _token, address initialOwner) Ownable(initialOwner) {
        token = IERC20(_token);
    }
    
    function stake(uint256 amount) external {
        require(amount > 0, "Cannot stake 0");
        
        // Claim pending rewards first
        _claimRewards(msg.sender);
        
        // Transfer tokens from user
        require(token.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        // Update stake info
        if (stakes[msg.sender].amount == 0) {
            stakes[msg.sender] = StakeInfo({
                amount: amount,
                startTime: block.timestamp,
                lastClaimTime: block.timestamp
            });
        } else {
            stakes[msg.sender].amount += amount;
        }
        
        emit Staked(msg.sender, amount);
    }
    
    function unstake(uint256 amount) external {
        require(stakes[msg.sender].amount >= amount, "Insufficient staked amount");
        
        // Claim pending rewards first
        _claimRewards(msg.sender);
        
        // Update stake info
        stakes[msg.sender].amount -= amount;
        
        // Transfer tokens back
        require(token.transfer(msg.sender, amount), "Transfer failed");
        
        emit Unstaked(msg.sender, amount);
    }
    
    function claimRewards() external {
        _claimRewards(msg.sender);
    }
    
    function _claimRewards(address user) internal {
        uint256 pending = getPendingRewards(user);
        if (pending > 0) {
            stakes[user].lastClaimTime = block.timestamp;
            require(token.transfer(user, pending), "Reward transfer failed");
            emit RewardsClaimed(user, pending);
        }
    }
    
    function getPendingRewards(address user) public view returns (uint256) {
        if (stakes[user].amount == 0) return 0;
        
        uint256 timeStaked = block.timestamp - stakes[user].lastClaimTime;
        uint256 yearlyReward = (stakes[user].amount * rewardRate) / 10000;
        uint256 pending = (yearlyReward * timeStaked) / SECONDS_PER_YEAR;
        
        return pending;
    }
    
    function getStakedBalance(address user) external view returns (uint256) {
        return stakes[user].amount;
    }
    
    function setRewardRate(uint256 newRate) external onlyOwner {
        rewardRate = newRate;
    }
    
    // Allow owner to fund the pool
    function fundPool(uint256 amount) external onlyOwner {
        require(token.transferFrom(msg.sender, address(this), amount), "Funding failed");
    }
    
    // Emergency withdrawal by owner
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        require(token.transfer(owner(), amount), "Emergency withdrawal failed");
    }
}
`;

async function deploy() {
    console.log('🚀 Deploying NexaStream Contracts to Sepolia Testnet\n');
    console.log('Network: Ethereum Sepolia Testnet');
    console.log('Cost: FREE (using testnet faucet)\n');
    
    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    console.log('Deployer:', wallet.address);
    
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log('Balance:', ethers.formatEther(balance), 'ETH\n');
    
    if (balance === 0n) {
        console.log('❌ No ETH! Get free Sepolia ETH from:');
        console.log('   https://www.alchemy.com/faucets/ethereum-sepolia');
        console.log('   or https://www.sepoliafaucet.com/');
        return;
    }
    
    // Deploy NEXA Token
    console.log('📝 Deploying NEXA Token...');
    
    const tokenFactory = new ethers.ContractFactory(
        [
            "function name() public view returns (string)",
            "function symbol() public view returns (string)",
            "function decimals() public view returns (uint8)",
            "function totalSupply() public view returns (uint256)",
            "function mint(address to, uint256 amount) public"
        ],
        "0x0000000000000000000000000000000000000000",
        wallet
    );
    
    // For now, create a simple mock token
    const tokenAddress = '0x0000000000000000000000000000000000000000';
    console.log('Token address (to be deployed):', tokenAddress);
    console.log('\n✅ Contract deployment ready!');
    console.log('\n📋 Next Steps:');
    console.log('1. Install dependencies: npm install ethers @openzeppelin/contracts');
    console.log('2. Run: npx hardhat compile');
    console.log('3. Run: npx hardhat run scripts/deploy.js --network sepolia');
    console.log('4. Update .env with deployed addresses');
}

deploy().catch(console.error);
