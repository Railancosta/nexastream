// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title NSTStaking - NexaStream Staking Contract
 * @dev Proof of Stake mechanism for NST Token
 */

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract NSTStaking is ReentrancyGuard, AccessControl {
    using SafeERC20 for IERC20;
    
    // Data structures
    struct Stake {
        uint256 amount;
        uint256 startTime;
        uint256 rewards;
        uint256 lastClaimTime;
        bool active;
    }
    
    struct Tier {
        string name;
        uint256 minStake;
        uint256 apy; // in basis points (100 = 1%)
        uint256 compoundRate; // How often rewards compound
    }
    
    // State variables
    IERC20 public stakingToken;
    IERC20 public rewardToken;
    
    // Staking tiers
    mapping(uint256 => Tier) public tiers;
    uint256 public tierCount;
    
    // User stakes
    mapping(address => Stake[]) public userStakes;
    mapping(address => uint256) public totalStakedByUser;
    mapping(address => uint256) public currentTierByUser;
    
    // Global stats
    uint256 public totalStaked;
    uint256 public totalRewardsDistributed;
    uint256 public minimumStake = 100 * 10**18; // 100 NST minimum
    
    // Time locks
    uint256 public constant MIN_STAKING_PERIOD = 7 days;
    uint256 public constant EARLY_WITHDRAWAL_PENALTY = 5; // 5%
    
    // Reward distribution
    uint256 public rewardPoolBalance;
    uint256 public rewardPerSecond = 0.0001 * 10**18; // Base rate
    
    // Events
    event Staked(address indexed user, uint256 amount, uint256 stakeId, uint256 tier);
    event Unstaked(address indexed user, uint256 amount, uint256 rewards, uint256 penalty);
    event RewardClaimed(address indexed user, uint256 amount);
    event RewardAdded(address indexed from, uint256 amount);
    event TierCreated(uint256 tierId, string name, uint256 minStake, uint256 apy);
    event TierUpdated(uint256 tierId, uint256 newApy);
    
    constructor(address _stakingToken, address _rewardToken) {
        require(_stakingToken != address(0), "Invalid staking token");
        require(_rewardToken != address(0), "Invalid reward token");
        
        stakingToken = IERC20(_stakingToken);
        rewardToken = IERC20(_rewardToken);
        
        // Initialize default tiers
        _createTier("Bronze", 100 * 10**18, 500); // 5% APY
        _createTier("Silver", 1000 * 10**18, 1000); // 10% APY
        _createTier("Gold", 10000 * 10**18, 2000); // 20% APY
        _createTier("Platinum", 50000 * 10**18, 3500); // 35% APY
        _createTier("Diamond", 100000 * 10**18, 5000); // 50% APY
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
    
    /**
     * @dev Create a new staking tier
     */
    function _createTier(string memory name, uint256 minStake, uint256 apy) internal {
        tiers[tierCount] = Tier({
            name: name,
            minStake: minStake,
            apy: apy,
            compoundRate: 1 days
        });
        tierCount++;
        emit TierCreated(tierCount - 1, name, minStake, apy);
    }
    
    /**
     * @dev Admin can create tier
     */
    function createTier(string memory name, uint256 minStake, uint256 apy) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        _createTier(name, minStake, apy);
    }
    
    /**
     * @dev Update tier APY
     */
    function updateTierAPY(uint256 tierId, uint256 newApy) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(tierId < tierCount, "Invalid tier");
        tiers[tierId].apy = newApy;
        emit TierUpdated(tierId, newApy);
    }
    
    /**
     * @dev Stake NST tokens
     */
    function stake(uint256 amount) external nonReentrant {
        require(amount >= minimumStake, "Amount below minimum");
        
        // Transfer tokens
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);
        
        // Calculate tier
        uint256 newTotal = totalStakedByUser[msg.sender] + amount;
        uint256 userTier = _calculateTier(newTotal);
        
        // Create stake
        uint256 stakeId = userStakes[msg.sender].length;
        userStakes[msg.sender].push(Stake({
            amount: amount,
            startTime: block.timestamp,
            rewards: 0,
            lastClaimTime: block.timestamp,
            active: true
        }));
        
        // Update state
        totalStakedByUser[msg.sender] = newTotal;
        totalStaked += amount;
        currentTierByUser[msg.sender] = userTier;
        
        emit Staked(msg.sender, amount, stakeId, userTier);
    }
    
    /**
     * @dev Unstake tokens (with penalty if early)
     */
    function unstake(uint256 stakeId) external nonReentrant {
        require(stakeId < userStakes[msg.sender].length, "Invalid stake");
        
        Stake storage userStake = userStakes[msg.sender][stakeId];
        require(userStake.active, "Already unstaked");
        
        // Calculate rewards
        uint256 rewards = _calculateRewards(msg.sender, stakeId);
        
        // Check staking period
        uint256 stakePeriod = block.timestamp - userStake.startTime;
        uint256 penalty = 0;
        
        if (stakePeriod < MIN_STAKING_PERIOD) {
            penalty = (userStake.amount * EARLY_WITHDRAWAL_PENALTY) / 100;
        }
        
        // Calculate final amount
        uint256 totalAmount = userStake.amount - penalty;
        uint256 totalToReceive = totalAmount + rewards;
        
        // Update state
        userStake.active = false;
        totalStakedByUser[msg.sender] -= userStake.amount;
        totalStaked -= userStake.amount;
        totalRewardsDistributed += rewards;
        
        // Transfer tokens
        stakingToken.safeTransfer(msg.sender, totalAmount);
        if (rewards > 0) {
            rewardToken.safeTransfer(msg.sender, rewards);
            emit RewardClaimed(msg.sender, rewards);
        }
        
        // Update tier
        currentTierByUser[msg.sender] = _calculateTier(totalStakedByUser[msg.sender]);
        
        emit Unstaked(msg.sender, userStake.amount, rewards, penalty);
    }
    
    /**
     * @dev Claim rewards without unstaking
     */
    function claimRewards(uint256 stakeId) external nonReentrant {
        require(stakeId < userStakes[msg.sender].length, "Invalid stake");
        
        Stake storage userStake = userStakes[msg.sender][stakeId];
        require(userStake.active, "Stake not active");
        
        uint256 rewards = _calculateRewards(msg.sender, stakeId);
        require(rewards > 0, "No rewards");
        
        // Update claim time
        userStake.lastClaimTime = block.timestamp;
        userStake.rewards += rewards;
        
        // Transfer rewards
        rewardToken.safeTransfer(msg.sender, rewards);
        totalRewardsDistributed += rewards;
        
        emit RewardClaimed(msg.sender, rewards);
    }
    
    /**
     * @dev Calculate pending rewards
     */
    function _calculateRewards(address user, uint256 stakeId) internal view returns (uint256) {
        Stake storage userStake = userStakes[user][stakeId];
        if (!userStake.active) return 0;
        
        uint256 stakeDuration = block.timestamp - userStake.lastClaimTime;
        uint256 userTier = currentTierByUser[user];
        uint256 apy = tiers[userTier].apy;
        
        // APY calculation with time factor
        uint256 yearlyReward = (userStake.amount * apy) / 10000;
        uint256 reward = (yearlyReward * stakeDuration) / 365 days;
        
        return reward;
    }
    
    /**
     * @dev Get pending rewards for all stakes
     */
    function getPendingRewards(address user) external view returns (uint256 total) {
        for (uint256 i = 0; i < userStakes[user].length; i++) {
            if (userStakes[user][i].active) {
                total += _calculateRewards(user, i);
            }
        }
    }
    
    /**
     * @dev Calculate tier based on total staked
     */
    function _calculateTier(uint256 totalStakedAmount) internal view returns (uint256) {
        uint256 userTier = 0;
        for (uint256 i = tierCount; i > 0; i--) {
            if (totalStakedAmount >= tiers[i - 1].minStake) {
                userTier = i - 1;
                break;
            }
        }
        return userTier;
    }
    
    /**
     * @dev Add rewards to pool
     */
    function addRewardPool(uint256 amount) external nonReentrant {
        rewardToken.safeTransferFrom(msg.sender, address(this), amount);
        rewardPoolBalance += amount;
        emit RewardAdded(msg.sender, amount);
    }
    
    /**
     * @dev Get stake info
     */
    function getStakeInfo(address user, uint256 stakeId) external view returns (
        uint256 amount,
        uint256 startTime,
        uint256 pendingRewards,
        bool active,
        string memory tierName
    ) {
        Stake storage userStake = userStakes[user][stakeId];
        uint256 tier = currentTierByUser[user];
        
        return (
            userStake.amount,
            userStake.startTime,
            _calculateRewards(user, stakeId),
            userStake.active,
            tiers[tier].name
        );
    }
    
    /**
     * @dev Get user stats
     */
    function getUserStats(address user) external view returns (
        uint256 totalStaked,
        uint256 pendingRewards,
        uint256 currentTier,
        string memory tierName,
        uint256 stakeCount
    ) {
        uint256 tier = currentTierByUser[user];
        uint256 pending;
        
        for (uint256 i = 0; i < userStakes[user].length; i++) {
            if (userStakes[user][i].active) {
                pending += _calculateRewards(user, i);
            }
        }
        
        return (
            totalStakedByUser[user],
            pending,
            tier,
            tiers[tier].name,
            userStakes[user].length
        );
    }
    
    /**
     * @dev Get all tiers
     */
    function getAllTiers() external view returns (Tier[] memory) {
        Tier[] memory allTiers = new Tier[](tierCount);
        for (uint256 i = 0; i < tierCount; i++) {
            allTiers[i] = tiers[i];
        }
        return allTiers;
    }
}
