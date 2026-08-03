// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title CreatorRewards
 * @dev Distributes 50% of platform revenue to content creators
 */
contract CreatorRewards {
    struct Creator {
        address wallet;
        string username;
        uint256 totalEarned;
        uint256 pendingWithdrawals;
        uint256 totalViews;
        uint256 subscriberCount;
        bool isActive;
    }
    
    struct Video {
        address creator;
        uint256 views;
        uint256 watchTime;
        uint256 engagement;
        uint256 lastRewardCalculation;
    }
    
    address public platformOwner;
    address public tokenAddress;
    uint256 public rewardsPoolBalance;
    uint256 public constant CREATOR_SHARE = 50; // 50% to creators
    uint256 public constant PLATFORM_SHARE = 50; // 50% to platform
    
    mapping(address => Creator) public creators;
    mapping(bytes32 => Video) public videos;
    mapping(address => uint256) public creatorPendingRewards;
    address[] public creatorList;
    
    event RewardClaimed(address indexed creator, uint256 amount);
    event VideoRegistered(bytes32 indexed videoId, address indexed creator);
    event RewardDistributed(address indexed creator, uint256 amount, uint256 platformAmount);
    event CreatorRegistered(address indexed wallet, string username);
    
    constructor(address _tokenAddress, address _platformOwner) {
        tokenAddress = _tokenAddress;
        platformOwner = _platformOwner;
    }
    
    modifier onlyPlatformOwner() {
        require(msg.sender == platformOwner, "Only platform owner");
        _;
    }
    
    function registerCreator(address wallet, string memory username) external {
        require(!creators[wallet].isActive, "Creator already registered");
        creators[wallet] = Creator({
            wallet: wallet,
            username: username,
            totalEarned: 0,
            pendingWithdrawals: 0,
            totalViews: 0,
            subscriberCount: 0,
            isActive: true
        });
        creatorList.push(wallet);
        emit CreatorRegistered(wallet, username);
    }
    
    function registerVideo(bytes32 videoId, address creator) external onlyPlatformOwner {
        require(creators[creator].isActive, "Creator not registered");
        videos[videoId] = Video({
            creator: creator,
            views: 0,
            watchTime: 0,
            engagement: 0,
            lastRewardCalculation: 0
        });
        emit VideoRegistered(videoId, creator);
    }
    
    function recordView(bytes32 videoId) external onlyPlatformOwner {
        Video storage video = videos[videoId];
        video.views++;
        creators[video.creator].totalViews++;
    }
    
    function recordWatchTime(bytes32 videoId, uint256 seconds) external onlyPlatformOwner {
        Video storage video = videos[videoId];
        video.watchTime += seconds;
    }
    
    function distributeRewards() external payable onlyPlatformOwner {
        require(msg.value > 0, "No rewards to distribute");
        rewardsPoolBalance += msg.value;
        
        uint256 creatorShare = msg.value * CREATOR_SHARE / 100;
        uint256 platformShare = msg.value * PLATFORM_SHARE / 100;
        
        // Distribute to creator rewards pool
        (bool success, ) = tokenAddress.call{value: creatorShare}("");
        require(success, "Transfer to rewards pool failed");
    }
    
    function calculateCreatorReward(address creator) public view returns (uint256) {
        Creator storage c = creators[creator];
        if (!c.isActive) return 0;
        
        uint256 baseReward = c.totalViews * 0.00001 ether; // 0.01 NEXA per view (example)
        uint256 engagementBonus = c.totalViews * 10 / 100; // 10% engagement bonus
        
        return baseReward + engagementBonus;
    }
    
    function claimRewards() external {
        Creator storage c = creators[msg.sender];
        require(c.isActive, "Not a registered creator");
        
        uint256 reward = calculateCreatorReward(msg.sender);
        require(reward > 0, "No rewards available");
        
        c.pendingWithdrawals += reward;
        c.totalEarned += reward;
        
        emit RewardClaimed(msg.sender, reward);
    }
    
    function withdraw() external {
        Creator storage c = creators[msg.sender];
        require(c.pendingWithdrawals > 0, "No pending withdrawals");
        
        uint256 amount = c.pendingWithdrawals;
        c.pendingWithdrawals = 0;
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
    }
    
    function getCreatorStats(address creator) external view returns (
        uint256 totalEarned,
        uint256 pending,
        uint256 totalViews,
        uint256 subscribers
    ) {
        Creator storage c = creators[creator];
        return (c.totalEarned, c.pendingWithdrawals, c.totalViews, c.subscriberCount);
    }
    
    function getAllCreators() external view returns (address[] memory) {
        return creatorList;
    }
}
