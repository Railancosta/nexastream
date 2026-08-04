// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title NSTToken - NexaStream Token
 * @dev NexaChain Native Token for the NexaStream Platform
 * @notice 55,000,000 NST Max Supply
 * 
 * Tokenomics:
 * - 50% Ecosystem (27,500,000 NST) - Creator rewards, partnerships, grants
 * - 30% Rewards (16,500,000 NST) - Staking rewards, yield farming
 * - 10% Team (5,500,000 NST) - 4-year vesting, 1-year cliff
 * - 5% Public Sale (2,750,000 NST) - Token sale
 * - 5% Liquidity (2,750,000 NST) - DEX liquidity
 */

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract NSTToken is ERC20, ERC20Burnable, Pausable, AccessControl, ReentrancyGuard {
    
    // Constants
    uint256 public constant MAX_SUPPLY = 55000000 * 10**18; // 55M NST
    uint256 public constant INITIAL_SUPPLY = 55000000 * 10**18; // All tokens minted at genesis
    
    // Roles
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
    bytes32 public constant REWARDS_ROLE = keccak256("REWARDS_ROLE");
    
    // Tax configuration
    uint256 public burnRate = 1; // 1% burn on transfer
    uint256 public rewardRate = 2; // 2% goes to reward pool
    uint256 public stakingAPY = 12.5 * 10**16; // 12.5% APY
    
    // Addresses
    address public rewardPool;
    address public treasury;
    address public governance;
    address public stakingContract;
    
    // Anti-bot protection
    mapping(address => uint256) public lastTransferTime;
    uint256 public antiBotDelay = 60 seconds;
    
    // Supply tracking
    uint256 public burnedSupply;
    uint256 public totalStaked;
    
    // Staking
    mapping(address => uint256) public stakingAmount;
    mapping(address => uint256) public stakingStartTime;
    mapping(address => uint256) public accumulatedRewards;
    
    // Vesting
    mapping(address => uint256) public vestedAmount;
    mapping(address => uint256) public vestingStart;
    uint256 public constant VESTING_DURATION = 4 * 365 days;
    uint256 public constant VESTING_CLIFF = 1 * 365 days;
    
    // Events
    event TokenBurned(address indexed from, uint256 amount, uint256 newSupply);
    event TaxCollected(address indexed from, uint256 burnAmount, uint256 rewardAmount);
    event RewardPoolUpdated(address indexed newPool);
    event TreasuryUpdated(address indexed newTreasury);
    event GovernanceUpdated(address indexed newGovernance);
    event Staked(address indexed user, uint256 amount, uint256 totalStaked);
    event Unstaked(address indexed user, uint256 amount, uint256 totalStaked);
    event RewardsClaimed(address indexed user, uint256 amount);
    event TokensVested(address indexed user, uint256 amount);
    
    /**
     * @dev Constructor - mints entire supply
     */
    constructor(
        address _rewardPool,
        address _treasury,
        address _governance
    ) ERC20("NexaStream Token", "NST") {
        require(_rewardPool != address(0), "Invalid reward pool");
        require(_treasury != address(0), "Invalid treasury");
        require(_governance != address(0), "Invalid governance");
        
        rewardPool = _rewardPool;
        treasury = _treasury;
        governance = _governance;
        
        // Grant roles
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(BURNER_ROLE, msg.sender);
        _grantRole(GOVERNANCE_ROLE, _governance);
        
        // Mint entire supply to treasury
        // Distribution:
        // - 50% Ecosystem (27.5M) -> Treasury
        // - 30% Rewards (16.5M) -> Reward Pool  
        // - 10% Team (5.5M) -> Team Vesting (4 years)
        // - 5% Public Sale (2.75M) -> Treasury
        // - 5% Liquidity (2.75M) -> Treasury
        
        uint256 ecosystemAndSale = MAX_SUPPLY * 55 / 100; // 55%
        uint256 rewards = MAX_SUPPLY * 30 / 100; // 30%
        uint256 teamAndLiquidity = MAX_SUPPLY * 15 / 100; // 15%
        
        _mint(address(this), MAX_SUPPLY);
        
        // Transfer ecosystem and public sale to treasury
        _transfer(address(this), _treasury, ecosystemAndSale);
        
        // Transfer rewards to reward pool
        _transfer(address(this), _rewardPool, rewards);
        
        // Track team and liquidity tokens separately
        vestedAmount[address(this)] = teamAndLiquidity;
        vestingStart[address(this)] = block.timestamp;
    }
    
    /**
     * @dev Mint new tokens (only minter role)
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        require(totalSupply() + amount <= MAX_SUPPLY, "Max supply exceeded");
        _mint(to, amount);
    }
    
    /**
     * @dev Burn tokens from circulation
     */
    function burn(uint256 amount) public override onlyRole(BURNER_ROLE) {
        _burn(msg.sender, amount);
        burnedSupply += amount;
        emit TokenBurned(msg.sender, amount, MAX_SUPPLY - totalSupply());
    }
    
    /**
     * @dev Transfer with tax collection
     */
    function _transfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        // Anti-bot protection for first 60 seconds
        if (block.timestamp < lastTransferTime[from] + antiBotDelay) {
            require(amount <= totalSupply() / 100, "Anti-bot: amount too large");
        }
        lastTransferTime[from] = block.timestamp;
        
        // Calculate tax
        uint256 burnAmount = (amount * burnRate) / 100;
        uint256 rewardAmount = (amount * rewardRate) / 100;
        uint256 taxTotal = burnAmount + rewardAmount;
        
        if (taxTotal > 0 && !paused()) {
            super._transfer(from, address(this), taxTotal);
            
            // Process taxes
            if (burnAmount > 0) {
                _burn(address(this), burnAmount);
                burnedSupply += burnAmount;
            }
            
            if (rewardAmount > 0 && rewardPool != address(0)) {
                super._transfer(address(this), rewardPool, rewardAmount);
            }
        }
        
        uint256 transferAmount = amount - taxTotal;
        super._transfer(from, to, transferAmount);
    }
    
    /**
     * @dev Stake tokens for rewards
     */
    function stake(uint256 amount) external nonReentrant {
        require(amount > 0, "Cannot stake 0");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        // Claim existing rewards first
        if (stakingAmount[msg.sender] > 0) {
            _claimRewards();
        }
        
        // Transfer tokens to contract
        _transfer(msg.sender, address(this), amount);
        
        // Update staking state
        stakingAmount[msg.sender] += amount;
        totalStaked += amount;
        
        // Update validator set
        emit Staked(msg.sender, amount, totalStaked);
    }
    
    /**
     * @dev Unstake tokens
     */
    function unstake(uint256 amount) external nonReentrant {
        require(amount > 0, "Cannot unstake 0");
        require(stakingAmount[msg.sender] >= amount, "Insufficient staked amount");
        
        // Claim existing rewards first
        _claimRewards();
        
        // Update staking state
        stakingAmount[msg.sender] -= amount;
        totalStaked -= amount;
        
        // Transfer tokens back
        _transfer(address(this), msg.sender, amount);
        
        emit Unstaked(msg.sender, amount, totalStaked);
    }
    
    /**
     * @dev Claim accumulated staking rewards
     */
    function claimRewards() external nonReentrant {
        _claimRewards();
    }
    
    function _claimRewards() internal {
        uint256 rewards = calculateRewards(msg.sender);
        require(rewards > 0, "No rewards to claim");
        
        accumulatedRewards[msg.sender] = 0;
        
        // Transfer rewards from reward pool
        if (rewards > 0 && rewardPool != address(0)) {
            _transfer(rewardPool, msg.sender, rewards);
        }
        
        emit RewardsClaimed(msg.sender, rewards);
    }
    
    /**
     * @dev Calculate pending rewards for a staker
     */
    function calculateRewards(address staker) public view returns (uint256) {
        if (stakingAmount[staker] == 0) {
            return 0;
        }
        
        uint256 timeStaked = block.timestamp - stakingStartTime[staker];
        uint256 yearlyReward = (stakingAmount[staker] * stakingAPY) / 10**18;
        uint256 pendingReward = (yearlyReward * timeStaked) / (365 days);
        
        return pendingReward + accumulatedRewards[staker];
    }
    
    /**
     * @dev Get staking info for an address
     */
    function getStakingInfo(address staker) external view returns (
        uint256 stakedAmount,
        uint256 pendingRewards,
        uint256 totalStaked_,
        uint256 currentAPY
    ) {
        return (
            stakingAmount[staker],
            calculateRewards(staker),
            totalStaked,
            stakingAPY
        );
    }
    
    /**
     * @dev Update reward pool address
     */
    function setRewardPool(address newPool) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newPool != address(0), "Invalid address");
        rewardPool = newPool;
        emit RewardPoolUpdated(newPool);
    }
    
    /**
     * @dev Update treasury address
     */
    function setTreasury(address newTreasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newTreasury != address(0), "Invalid address");
        treasury = newTreasury;
        emit TreasuryUpdated(newTreasury);
    }
    
    /**
     * @dev Update governance address
     */
    function setGovernance(address newGovernance) external onlyRole(GOVERNANCE_ROLE) {
        require(newGovernance != address(0), "Invalid address");
        governance = newGovernance;
        emit GovernanceUpdated(newGovernance);
    }
    
    /**
     * @dev Set staking contract
     */
    function setStakingContract(address newContract) external onlyRole(DEFAULT_ADMIN_ROLE) {
        stakingContract = newContract;
    }
    
    /**
     * @dev Set burn rate (max 5%)
     */
    function setBurnRate(uint256 newRate) external onlyRole(GOVERNANCE_ROLE) {
        require(newRate <= 5, "Max 5%");
        burnRate = newRate;
    }
    
    /**
     * @dev Set reward rate (max 5%)
     */
    function setRewardRate(uint256 newRate) external onlyRole(GOVERNANCE_ROLE) {
        require(newRate <= 5, "Max 5%");
        rewardRate = newRate;
    }
    
    /**
     * @dev Set staking APY
     */
    function setStakingAPY(uint256 newAPY) external onlyRole(GOVERNANCE_ROLE) {
        require(newAPY <= 50 * 10**16, "Max 50% APY");
        stakingAPY = newAPY;
    }
    
    /**
     * @dev Pause all transfers
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }
    
    /**
     * @dev Unpause all transfers
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
    
    /**
     * @dev Get circulating supply
     */
    function circulatingSupply() public view returns (uint256) {
        return totalSupply() - burnedSupply;
    }
    
    /**
     * @dev Get supply breakdown
     */
    function getSupplyBreakdown() external view returns (
        uint256 maxSupply,
        uint256 totalIssued,
        uint256 burned,
        uint256 circulating,
        uint256 staked
    ) {
        return (
            MAX_SUPPLY,
            totalSupply(),
            burnedSupply,
            circulatingSupply(),
            totalStaked
        );
    }
    
    /**
     * @dev Batch transfer for airdrops
     */
    function airdrop(address[] calldata recipients, uint256[] calldata amounts) 
        external 
        onlyRole(MINTER_ROLE) 
        nonReentrant 
    {
        require(recipients.length == amounts.length, "Length mismatch");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            require(totalSupply() + amounts[i] <= MAX_SUPPLY, "Max supply exceeded");
            _mint(recipients[i], amounts[i]);
        }
    }
    
    /**
     * @dev Recover accidentally sent tokens
     */
    function recoverERC20(address tokenAddress, uint256 tokenAmount) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(tokenAddress != address(this), "Cannot recover NST");
        IERC20(tokenAddress).transfer(msg.sender, tokenAmount);
    }
    
    /**
     * @dev Withdraw team tokens after vesting
     */
    function withdrawVestedTokens() external {
        require(msg.sender == treasury || hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Not authorized");
        
        uint256 vested = getVestedAmount(msg.sender);
        require(vested > 0, "No vested tokens");
        
        vestedAmount[msg.sender] -= vested;
        _transfer(address(this), treasury, vested);
        
        emit TokensVested(msg.sender, vested);
    }
    
    /**
     * @dev Get vested amount for an address
     */
    function getVestedAmount(address account) public view returns (uint256) {
        if (vestedAmount[account] == 0) {
            return 0;
        }
        
        uint256 timeSinceStart = block.timestamp - vestingStart[account];
        
        if (timeSinceStart < VESTING_CLIFF) {
            return 0;
        }
        
        if (timeSinceStart >= VESTING_DURATION) {
            return vestedAmount[account];
        }
        
        return (vestedAmount[account] * timeSinceStart) / VESTING_DURATION;
    }
}
