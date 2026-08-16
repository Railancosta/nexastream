// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title NSTRewards - NexaStream Creator Rewards
 * @dev Automatic reward distribution for content creators
 */

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract NSTRewards is ReentrancyGuard, AccessControl {
    using SafeERC20 for IERC20;
    
    // Configuration
    uint256 public constant CREATOR_SHARE = 5000; // 50% basis points
    uint256 public constant PLATFORM_SHARE = 5000; // 50% basis points
    
    // Reward metrics per video
    struct VideoRewards {
        uint256 totalViews;
        uint256 watchTime; // in minutes
        uint256 engagement; // likes + comments + shares
        uint256 lastRewardCalculation;
        uint256 accumulatedRewards;
        bool isActive;
    }
    
    // Creator profile
    struct CreatorProfile {
        address wallet;
        uint256 totalEarned;
        uint256 pendingWithdrawals;
        uint256 totalViews;
        uint256 subscriberCount;
        bool isVerified;
        bool isMonetized;
        uint256 minWatchTime; // minimum watch time for rewards (in seconds)
    }
    
    // Global reward pool
    uint256 public rewardPoolBalance;
    uint256 public totalRewardsDistributed;
    uint256 public rewardPerView = 0.01 * 10**18; // 0.01 NST per view
    uint256 public rewardPerMinuteWatched = 0.05 * 10**18; // 0.05 NST per minute
    
    // Engagement multipliers (basis points)
    uint256 public likeMultiplier = 100; // 1%
    uint256 public commentMultiplier = 200; // 2%
    uint256 public shareMultiplier = 500; // 5%
    uint256 public subscriberMultiplier = 300; // 3%
    
    // Token
    IERC20 public nstToken;
    address public platformTreasury;
    
    // Mappings
    mapping(string => VideoRewards) public videoRewards; // videoId => rewards
    mapping(address => CreatorProfile) public creators;
    mapping(address => uint256) public creatorPendingRewards;
    
    // Whitelist for premium content
    mapping(string => bool) public premiumVideos;
    uint256 public premiumMultiplier = 300; // 3x rewards for premium
    
    // Anti-fraud
    mapping(address => uint256) public lastRewardClaim;
    mapping(address => uint256) public dailyClaimCount;
    uint256 public maxDailyClaims = 100;
    uint256 public antiBotDelay = 60 seconds;
    
    // Events
    event RewardEarned(address indexed creator, string videoId, uint256 amount, uint256 views);
    event RewardsWithdrawn(address indexed creator, uint256 amount);
    event VideoRegistered(string indexed videoId, address indexed creator);
    event ViewRecorded(string indexed videoId, uint256 views, uint256 engagement);
    event CreatorVerified(address indexed creator);
    event MonetizationToggled(address indexed creator, bool enabled);
    event RewardRateUpdated(uint256 newRate);
    event PremiumVideoSet(string indexed videoId, bool isPremium);
    
    constructor(address _nstToken, address _treasury) {
        require(_nstToken != address(0), "Invalid token");
        require(_treasury != address(0), "Invalid treasury");
        
        nstToken = IERC20(_nstToken);
        platformTreasury = _treasury;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(GOVERNANCE_ROLE, msg.sender);
    }
    
    /**
     * @dev Register a video for rewards
     */
    function registerVideo(string memory videoId, address creator) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(!videoRewards[videoId].isActive, "Video already registered");
        
        videoRewards[videoId] = VideoRewards({
            totalViews: 0,
            watchTime: 0,
            engagement: 0,
            lastRewardCalculation: block.timestamp,
            accumulatedRewards: 0,
            isActive: true
        });
        
        emit VideoRegistered(videoId, creator);
    }
    
    /**
     * @dev Record views and engagement for a video
     */
    function recordEngagement(
        string memory videoId,
        uint256 views,
        uint256 watchTimeSeconds,
        uint256 likes,
        uint256 comments,
        uint256 shares
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(videoRewards[videoId].isActive, "Video not registered");
        
        VideoRewards storage video = videoRewards[videoId];
        
        // Update metrics
        video.totalViews += views;
        video.watchTime += watchTimeSeconds / 60; // Convert to minutes
        
        // Calculate engagement score
        uint256 engagement = 
            (likes * likeMultiplier) +
            (comments * commentMultiplier) +
            (shares * shareMultiplier);
        video.engagement += engagement;
        
        // Calculate reward
        uint256 baseReward = (views * rewardPerView) +
                           (video.watchTime * rewardPerMinuteWatched / 100);
        uint256 engagementBonus = (baseReward * engagement) / 10000;
        
        // Premium multiplier
        uint256 multiplier = premiumVideos[videoId] ? premiumMultiplier : 100;
        uint256 totalReward = ((baseReward + engagementBonus) * multiplier) / 100;
        
        // Distribute reward
        uint256 creatorReward = (totalReward * CREATOR_SHARE) / 10000;
        uint256 platformFee = (totalReward * PLATFORM_SHARE) / 10000;
        
        video.accumulatedRewards += creatorReward;
        
        // Get video creator (simplified - would need video contract)
        address creator = msg.sender; // Placeholder
        creatorPendingRewards[creator] += creatorReward;
        
        // Update creator stats
        CreatorProfile storage profile = creators[creator];
        profile.totalViews += views;
        profile.totalEarned += creatorReward;
        
        emit ViewRecorded(videoId, views, engagement);
        emit RewardEarned(creator, videoId, creatorReward, views);
    }
    
    /**
     * @dev Creator withdraws pending rewards
     */
    function withdrawRewards() external nonReentrant {
        // Anti-bot check
        require(
            block.timestamp >= lastRewardClaim[msg.sender] + antiBotDelay,
            "Anti-bot: wait before claiming"
        );
        require(
            dailyClaimCount[msg.sender] < maxDailyClaims,
            "Anti-bot: daily limit reached"
        );
        
        uint256 pending = creatorPendingRewards[msg.sender];
        require(pending > 0, "No pending rewards");
        require(
            nstToken.balanceOf(address(this)) >= pending,
            "Insufficient pool balance"
        );
        
        // Update state
        creatorPendingRewards[msg.sender] = 0;
        creators[msg.sender].pendingWithdrawals = 0;
        lastRewardClaim[msg.sender] = block.timestamp;
        dailyClaimCount[msg.sender]++;
        
        // Transfer
        nstToken.safeTransfer(msg.sender, pending);
        totalRewardsDistributed += pending;
        
        emit RewardsWithdrawn(msg.sender, pending);
    }
    
    /**
     * @dev Register creator profile
     */
    function registerCreator(address wallet) external onlyRole(DEFAULT_ADMIN_ROLE) {
        CreatorProfile storage profile = creators[wallet];
        require(profile.wallet == address(0), "Creator already registered");
        
        creators[wallet] = CreatorProfile({
            wallet: wallet,
            totalEarned: 0,
            pendingWithdrawals: 0,
            totalViews: 0,
            subscriberCount: 0,
            isVerified: false,
            isMonetized: true,
            minWatchTime: 30 // 30 seconds minimum watch time
        });
    }
    
    /**
     * @dev Verify a creator
     */
    function verifyCreator(address creator) external onlyRole(DEFAULT_ADMIN_ROLE) {
        creators[creator].isVerified = true;
        emit CreatorVerified(creator);
    }
    
    /**
     * @dev Toggle monetization
     */
    function toggleMonetization(address creator) external onlyRole(DEFAULT_ADMIN_ROLE) {
        creators[creator].isMonetized = !creators[creator].isMonetized;
        emit MonetizationToggled(creator, creators[creator].isMonetized);
    }
    
    /**
     * @dev Set premium video
     */
    function setPremiumVideo(string memory videoId, bool isPremium) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        premiumVideos[videoId] = isPremium;
        emit PremiumVideoSet(videoId, isPremium);
    }
    
    /**
     * @dev Update reward rates
     */
    function updateRewardRates(
        uint256 newRewardPerView,
        uint256 newRewardPerMinute
    ) external onlyRole(GOVERNANCE_ROLE) {
        rewardPerView = newRewardPerView;
        rewardPerMinuteWatched = newRewardPerMinute;
        emit RewardRateUpdated(newRewardPerView);
    }
    
    /**
     * @dev Add to reward pool
     */
    function addToRewardPool(uint256 amount) external nonReentrant {
        nstToken.safeTransferFrom(msg.sender, address(this), amount);
        rewardPoolBalance += amount;
    }
    
    /**
     * @dev Get creator stats
     */
    function getCreatorStats(address creator) external view returns (
        uint256 totalEarned,
        uint256 pendingWithdrawals,
        uint256 totalViews,
        uint256 subscriberCount,
        bool isVerified,
        bool isMonetized
    ) {
        CreatorProfile storage profile = creators[creator];
        return (
            profile.totalEarned,
            creatorPendingRewards[creator],
            profile.totalViews,
            profile.subscriberCount,
            profile.isVerified,
            profile.isMonetized
        );
    }
    
    /**
     * @dev Get video reward stats
     */
    function getVideoStats(string memory videoId) external view returns (
        uint256 totalViews,
        uint256 watchTime,
        uint256 engagement,
        uint256 accumulatedRewards,
        bool isPremium
    ) {
        VideoRewards storage video = videoRewards[videoId];
        return (
            video.totalViews,
            video.watchTime,
            video.engagement,
            video.accumulatedRewards,
            premiumVideos[videoId]
        );
    }
    
    /**
     * @dev Get platform stats
     */
    function getPlatformStats() external view returns (
        uint256 totalDistributed,
        uint256 poolBalance,
        uint256 rewardPerView,
        uint256 rewardPerMinute
    ) {
        return (
            totalRewardsDistributed,
            rewardPoolBalance,
            rewardPerView,
            rewardPerMinuteWatched
        );
    }
    
    /**
     * @dev Reset daily counters (called by keeper)
     */
    function resetDailyCounters() external onlyRole(DEFAULT_ADMIN_ROLE) {
        // This would be called by an automated keeper
        // For simplicity, not implementing full keeper here
    }
    
    // Governance role
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
}
