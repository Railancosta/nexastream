// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title NSTStakingRewards - NexaStream Staking & Rewards Contract
 * @dev Complete staking with multiple reward tiers
 * @notice 12.5% APY base, with bonus tiers for long-term stakers
 */

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract NSTStakingRewards is AccessControl, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // ============================================
    // CONSTANTS
    // ============================================
    
    uint256 public constant SECONDS_PER_YEAR = 365 days;
    uint256 public constant SECONDS_PER_DAY = 1 days;
    
    // APY tiers (in basis points)
    uint256 public constant BASE_APY = 1250;           // 12.5%
    uint256 public constant SILVER_APY = 1500;         // 15%
    uint256 public constant GOLD_APY = 2000;           // 20%
    uint256 public constant PLATINUM_APY = 2500;       // 25%
    uint256 public constant DIAMOND_APY = 3000;         // 30%
    
    // Tier thresholds (in NST)
    uint256 public constant SILVER_THRESHOLD = 1000 ether;    // 1,000 NST
    uint256 public constant GOLD_THRESHOLD = 10000 ether;    // 10,000 NST
    uint256 public constant PLATINUM_THRESHOLD = 50000 ether; // 50,000 NST
    uint256 public constant DIAMOND_THRESHOLD = 100000 ether;  // 100,000 NST
    
    // Lock periods
    uint256 public constant MIN_LOCK_PERIOD = 7 days;
    uint256 public constant MEDIUM_LOCK_PERIOD = 30 days;
    uint256 public constant LONG_LOCK_PERIOD = 90 days;
    uint256 public constant XL_LOCK_PERIOD = 180 days;
    
    // Lock bonuses
    uint256 public constant NO_LOCK_BONUS = 0;
    uint256 public constant WEEK_BONUS = 100;           // +1%
    uint256 public constant MONTH_BONUS = 300;         // +3%
    uint256 public constant QUARTER_BONUS = 600;       // +6%
    uint256 public constant HALF_YEAR_BONUS = 1000;   // +10%
    
    // Anti-whale
    uint256 public constant MAX_STAKE_PER_USER = 1000000 ether; // 1M NST
    uint256 public constant MIN_STAKE = 100 ether;            // 100 NST

    // ============================================
    // ROLES
    // ============================================
    
    bytes32 public constant REWARDS_MANAGER = keccak256("REWARDS_MANAGER");
    bytes32 public constant TOKEN_MANAGER = keccak256("TOKEN_MANAGER");

    // ============================================
    // STATE VARIABLES
    // ============================================
    
    IERC20 public stakingToken;
    
    // Staking data
    mapping(address => StakeInfo) public stakes;
    uint256 public totalStaked;
    uint256 public totalStakers;
    
    // Rewards
    uint256 public totalRewardsDistributed;
    uint256 public rewardReserve;
    uint256 public lastRewardDistribution;
    
    // APY configuration
    uint256 public currentBaseAPY = BASE_APY;
    
    // Penalty for early unstake
    uint256 public earlyUnstakePenalty = 1000; // 10%
    
    // Compound interest flag
    bool public autoCompound = true;
    
    // Anti-bot
    mapping(address => uint256) public lastStakeTime;
    uint256 public antiBotDelay = 60 seconds;
    
    // Cumulative stats
    mapping(address => uint256) public totalEarned;
    mapping(address => uint256) public totalClaimed;

    // ============================================
    // STRUCTS
    // ============================================
    
    struct StakeInfo {
        uint256 amount;
        uint256 startTime;
        uint256 lockEndTime;
        uint256 lastClaimTime;
        uint256 accumulatedRewards;
        bool autoCompound;
        LockPeriod lockPeriod;
    }
    
    enum LockPeriod {
        None,
        Week,
        Month,
        Quarter,
        HalfYear
    }

    // ============================================
    // EVENTS
    // ============================================
    
    event Staked(
        address indexed user,
        uint256 indexed amount,
        LockPeriod indexed lockPeriod,
        uint256 effectiveAPY,
        uint256 timestamp
    );
    
    event Unstaked(
        address indexed user,
        uint256 indexed amount,
        uint256 indexed penalty,
        uint256 timestamp
    );
    
    event RewardsClaimed(
        address indexed user,
        uint256 indexed amount,
        uint256 indexed remainingStake
    );
    
    event RewardsDeposited(
        address indexed depositor,
        uint256 indexed amount,
        uint256 indexed newReserve
    );
    
    event APYUpdated(
        uint256 indexed oldAPY,
        uint256 indexed newAPY
    );
    
    event TierUpgraded(
        address indexed user,
        string indexed oldTier,
        string indexed newTier
    );
    
    event AutoCompoundToggled(
        address indexed user,
        bool indexed enabled
    );

    // ============================================
    // CONSTRUCTOR
    // ============================================
    
    constructor(address _stakingToken) {
        require(_stakingToken != address(0), "Invalid token address");
        
        stakingToken = IERC20(_stakingToken);
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(REWARDS_MANAGER, msg.sender);
        _grantRole(TOKEN_MANAGER, msg.sender);
        
        lastRewardDistribution = block.timestamp;
    }

    // ============================================
    // STAKING FUNCTIONS
    // ============================================
    
    /**
     * @dev Stake NST tokens
     */
    function stake(uint256 amount) external nonReentrant {
        _stake(amount, LockPeriod.None);
    }
    
    /**
     * @dev Stake with lock period for bonus APY
     */
    function stakeWithLock(uint256 amount, LockPeriod lockPeriod) 
        external 
        nonReentrant 
    {
        require(
            lockPeriod >= LockPeriod.Week && 
            lockPeriod <= LockPeriod.HalfYear,
            "Invalid lock period"
        );
        _stake(amount, lockPeriod);
    }
    
    function _stake(uint256 amount, LockPeriod lockPeriod) internal {
        // Anti-bot check
        require(
            block.timestamp >= lastStakeTime[msg.sender].add(antiBotDelay) ||
            stakes[msg.sender].amount > 0,
            "NST: Anti-bot protection"
        );
        
        require(amount >= MIN_STAKE, "NST: Below minimum stake");
        require(
            stakes[msg.sender].amount.add(amount) <= MAX_STAKE_PER_USER,
            "NST: Exceeds max stake per user"
        );
        
        // Transfer tokens
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);
        
        // Claim existing rewards
        uint256 pending = _calculateRewards(msg.sender);
        if (pending > 0) {
            if (stakes[msg.sender].autoCompound) {
                stakes[msg.sender].accumulatedRewards = pending;
            } else {
                _claimRewardsInternal(msg.sender);
            }
        }
        
        // Calculate lock period
        uint256 lockEndTime = 0;
        if (lockPeriod != LockPeriod.None) {
            lockEndTime = block.timestamp.add(_getLockDuration(lockPeriod));
        }
        
        // Update stake
        if (stakes[msg.sender].amount == 0) {
            totalStakers = totalStakers.add(1);
        }
        
        stakes[msg.sender].amount = stakes[msg.sender].amount.add(amount);
        stakes[msg.sender].startTime = block.timestamp;
        stakes[msg.sender].lockEndTime = lockEndTime;
        stakes[msg.sender].lastClaimTime = block.timestamp;
        stakes[msg.sender].autoCompound = autoCompound;
        
        totalStaked = totalStaked.add(amount);
        lastStakeTime[msg.sender] = block.timestamp;
        
        // Calculate effective APY
        uint256 effectiveAPY = _calculateEffectiveAPY(msg.sender);
        
        emit Staked(
            msg.sender, 
            amount, 
            lockPeriod,
            effectiveAPY,
            block.timestamp
        );
    }
    
    /**
     * @dev Unstake tokens (with penalty if locked)
     */
    function unstake(uint256 amount) external nonReentrant {
        require(
            stakes[msg.sender].amount >= amount,
            "NST: Insufficient stake"
        );
        
        // Check lock period
        if (stakes[msg.sender].lockEndTime > block.timestamp) {
            require(
                block.timestamp >= stakes[msg.sender].lockEndTime.sub(1 days),
                "NST: Still in lock period"
            );
        }
        
        // Claim rewards first
        _claimRewardsInternal(msg.sender);
        
        // Calculate penalty for early unstake
        uint256 penalty = 0;
        if (stakes[msg.sender].lockEndTime > block.timestamp) {
            penalty = amount.mul(earlyUnstakePenalty).div(10000);
        }
        
        uint256 withdrawAmount = amount.sub(penalty);
        
        // Update stake
        stakes[msg.sender].amount = stakes[msg.sender].amount.sub(amount);
        
        if (stakes[msg.sender].amount == 0) {
            totalStakers = totalStakers.sub(1);
        }
        
        totalStaked = totalStaked.sub(amount);
        
        // Transfer tokens
        stakingToken.safeTransfer(msg.sender, withdrawAmount);
        
        // Burn penalty
        if (penalty > 0) {
            stakingToken.safeTransfer(address(0x000000000000000000000000000000000000dEaD), penalty);
        }
        
        emit Unstaked(msg.sender, amount, penalty, block.timestamp);
    }
    
    /**
     * @dev Claim accumulated rewards
     */
    function claimRewards() external nonReentrant returns (uint256) {
        return _claimRewardsInternal(msg.sender);
    }
    
    function _claimRewardsInternal(address user) internal returns (uint256) {
        uint256 pending = _calculateRewards(user);
        uint256 totalPending = pending.add(stakes[user].accumulatedRewards);
        
        require(totalPending > 0, "NST: No rewards to claim");
        
        stakes[user].accumulatedRewards = 0;
        stakes[user].lastClaimTime = block.timestamp;
        
        // Transfer rewards
        stakingToken.safeTransfer(user, totalPending);
        
        totalRewardsDistributed = totalRewardsDistributed.add(totalPending);
        totalClaimed[user] = totalClaimed[user].add(totalPending);
        
        emit RewardsClaimed(user, totalPending, stakes[user].amount);
        
        return totalPending;
    }

    // ============================================
    // REWARD CALCULATIONS
    // ============================================
    
    function _calculateRewards(address user) internal view returns (uint256) {
        StakeInfo memory stakeInfo = stakes[user];
        if (stakeInfo.amount == 0) return 0;
        
        uint256 timeStaked = block.timestamp.sub(stakeInfo.lastClaimTime);
        uint256 yearlyReward = stakeInfo.amount
            .mul(_calculateEffectiveAPY(user))
            .div(10000);
        
        return yearlyReward.mul(timeStaked).div(SECONDS_PER_YEAR);
    }
    
    function _calculateEffectiveAPY(address user) internal view returns (uint256) {
        uint256 amount = stakes[user].amount;
        uint256 baseAPY = currentBaseAPY;
        uint256 lockBonus = 0;
        uint256 tierBonus = 0;
        
        // Tier bonus
        if (amount >= DIAMOND_THRESHOLD) {
            tierBonus = DIAMOND_APY.sub(BASE_APY);
        } else if (amount >= PLATINUM_THRESHOLD) {
            tierBonus = PLATINUM_APY.sub(BASE_APY);
        } else if (amount >= GOLD_THRESHOLD) {
            tierBonus = GOLD_APY.sub(BASE_APY);
        } else if (amount >= SILVER_THRESHOLD) {
            tierBonus = SILVER_APY.sub(BASE_APY);
        }
        
        // Lock bonus
        if (stakes[user].lockEndTime > block.timestamp) {
            LockPeriod period = stakes[user].lockPeriod;
            if (period == LockPeriod.HalfYear) {
                lockBonus = HALF_YEAR_BONUS;
            } else if (period == LockPeriod.Quarter) {
                lockBonus = QUARTER_BONUS;
            } else if (period == LockPeriod.Month) {
                lockBonus = MONTH_BONUS;
            } else if (period == LockPeriod.Week) {
                lockBonus = WEEK_BONUS;
            }
        }
        
        return baseAPY.add(tierBonus).add(lockBonus);
    }
    
    function _getLockDuration(LockPeriod period) internal pure returns (uint256) {
        if (period == LockPeriod.Week) return 7 days;
        if (period == LockPeriod.Month) return 30 days;
        if (period == LockPeriod.Quarter) return 90 days;
        if (period == LockPeriod.HalfYear) return 180 days;
        return 0;
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================
    
    function getStakeInfo(address user) external view returns (
        uint256 amount,
        uint256 pendingRewards,
        uint256 effectiveAPY,
        string memory tier,
        uint256 lockEndTime,
        bool autoCompoundEnabled
    ) {
        StakeInfo memory info = stakes[user];
        amount = info.amount;
        pendingRewards = _calculateRewards(user).add(info.accumulatedRewards);
        effectiveAPY = _calculateEffectiveAPY(user);
        tier = _getTier(info.amount);
        lockEndTime = info.lockEndTime;
        autoCompoundEnabled = info.autoCompound;
    }
    
    function _getTier(uint256 amount) internal pure returns (string memory) {
        if (amount >= DIAMOND_THRESHOLD) return "Diamond";
        if (amount >= PLATINUM_THRESHOLD) return "Platinum";
        if (amount >= GOLD_THRESHOLD) return "Gold";
        if (amount >= SILVER_THRESHOLD) return "Silver";
        return "Bronze";
    }
    
    function getAPYTiers() external pure returns (
        uint256 bronze,
        uint256 silver,
        uint256 gold,
        uint256 platinum,
        uint256 diamond
    ) {
        return (BASE_APY, SILVER_APY, GOLD_APY, PLATINUM_APY, DIAMOND_APY);
    }
    
    function getTierThresholds() external pure returns (
        uint256 silver,
        uint256 gold,
        uint256 platinum,
        uint256 diamond
    ) {
        return (SILVER_THRESHOLD, GOLD_THRESHOLD, PLATINUM_THRESHOLD, DIAMOND_THRESHOLD);
    }
    
    function getRewardsDashboard(address user) external view returns (
        uint256 stakedAmount,
        uint256 pendingRewards,
        uint256 totalEarned_,
        uint256 totalClaimed_,
        uint256 effectiveAPY,
        uint256 tierBonus,
        uint256 lockBonus,
        string memory currentTier
    ) {
        StakeInfo memory info = stakes[user];
        stakedAmount = info.amount;
        pendingRewards = _calculateRewards(user).add(info.accumulatedRewards);
        totalEarned_ = totalEarned[user];
        totalClaimed_ = totalClaimed[user];
        
        uint256 effective = _calculateEffectiveAPY(user);
        effectiveAPY = effective;
        tierBonus = effective.sub(currentBaseAPY);
        lockBonus = effective.sub(currentBaseAPY).sub(tierBonus);
        currentTier = _getTier(info.amount);
    }

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================
    
    function depositRewards() external nonReentrant {
        // Called by rewards manager to add to reward pool
        uint256 balance = stakingToken.balanceOf(msg.sender);
        require(balance > 0, "NST: Nothing to deposit");
        
        stakingToken.safeTransferFrom(msg.sender, address(this), balance);
        rewardReserve = rewardReserve.add(balance);
        
        emit RewardsDeposited(msg.sender, balance, rewardReserve);
    }
    
    function setBaseAPY(uint256 newAPY) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newAPY >= 500 && newAPY <= 5000, "NST: APY out of range"); // 5% - 50%
        
        emit APYUpdated(currentBaseAPY, newAPY);
        currentBaseAPY = newAPY;
    }
    
    function setAutoCompoundDefault(bool enabled) external onlyRole(DEFAULT_ADMIN_ROLE) {
        autoCompound = enabled;
    }
    
    function setAutoCompoundUser(address user, bool enabled) external {
        require(msg.sender == user || hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "NST: Not authorized");
        stakes[user].autoCompound = enabled;
        emit AutoCompoundToggled(user, enabled);
    }
    
    function setEarlyUnstakePenalty(uint256 penalty) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(penalty <= 5000, "NST: Max penalty 50%");
        earlyUnstakePenalty = penalty;
    }
    
    function withdrawExcessTokens(address to, uint256 amount) 
        external 
        onlyRole(TOKEN_MANAGER) 
    {
        uint256 excess = stakingToken.balanceOf(address(this))
            .sub(totalStaked)
            .sub(rewardReserve);
        require(amount <= excess, "NST: Cannot withdraw staked or reserved");
        stakingToken.safeTransfer(to, amount);
    }

    // ============================================
    // COMPOUNDING
    // ============================================
    
    /**
     * @dev Compound rewards (add to stake)
     */
    function compound() external nonReentrant {
        uint256 pending = _calculateRewards(msg.sender);
        require(pending > 0, "NST: No rewards to compound");
        
        stakes[msg.sender].accumulatedRewards = pending;
        stakes[msg.sender].lastClaimTime = block.timestamp;
        
        // Auto-compound increases stake
        stakes[msg.sender].amount = stakes[msg.sender].amount.add(pending);
        totalStaked = totalStaked.add(pending);
        
        totalRewardsDistributed = totalRewardsDistributed.add(pending);
        totalEarned[msg.sender] = totalEarned[msg.sender].add(pending);
        
        emit RewardsClaimed(msg.sender, pending, stakes[msg.sender].amount);
    }
}
