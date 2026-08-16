// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title StakingRewards
 * @dev Staking mechanism for NEXA token with 12% APY
 */
contract StakingRewards {
    string public name = "NexaStream Staking";
    
    struct Stake {
        uint256 amount;
        uint256 startTime;
        uint256 lastClaimTime;
        uint256 rewardsEarned;
    }
    
    address public tokenAddress;
    address public rewardsPool;
    uint256 public constant APY = 12; // 12% Annual Percentage Yield
    uint256 public constant SECONDS_PER_YEAR = 365 days;
    
    uint256 public totalStaked;
    uint256 public totalRewardsDistributed;
    uint256 public minimumStake = 100 * 10**18; // 100 NEXA minimum
    
    mapping(address => Stake) public stakes;
    address[] public stakerList;
    
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardClaimed(address indexed user, uint256 amount);
    event RewardAdded(uint256 amount);
    
    constructor(address _tokenAddress, address _rewardsPool) {
        tokenAddress = _tokenAddress;
        rewardsPool = _rewardsPool;
    }
    
    function stake(uint256 amount) external {
        require(amount >= minimumStake, "Below minimum stake");
        
        // Transfer tokens from user
        (bool success,) = tokenAddress.call(
            abi.encodeWithSignature("transferFrom(address,address,uint256)", msg.sender, address(this), amount)
        );
        require(success, "Transfer failed");
        
        if (stakes[msg.sender].amount == 0) {
            stakerList.push(msg.sender);
        }
        
        // Claim existing rewards first
        if (stakes[msg.sender].amount > 0) {
            claimRewards();
        }
        
        stakes[msg.sender].amount += amount;
        stakes[msg.sender].startTime = block.timestamp;
        stakes[msg.sender].lastClaimTime = block.timestamp;
        
        totalStaked += amount;
        
        emit Staked(msg.sender, amount);
    }
    
    function unstake(uint256 amount) external {
        Stake storage userStake = stakes[msg.sender];
        require(userStake.amount >= amount, "Insufficient staked amount");
        
        // Claim rewards first
        claimRewards();
        
        userStake.amount -= amount;
        totalStaked -= amount;
        
        // Transfer tokens back
        (bool success,) = tokenAddress.call(
            abi.encodeWithSignature("transfer(address,uint256)", msg.sender, amount)
        );
        require(success, "Transfer failed");
        
        emit Unstaked(msg.sender, amount);
    }
    
    function claimRewards() public {
        Stake storage userStake = stakes[msg.sender];
        require(userStake.amount > 0, "No staked tokens");
        
        uint256 reward = calculateReward(msg.sender);
        require(reward > 0, "No rewards to claim");
        
        userStake.rewardsEarned += reward;
        userStake.lastClaimTime = block.timestamp;
        totalRewardsDistributed += reward;
        
        // Transfer rewards
        (bool success,) = tokenAddress.call(
            abi.encodeWithSignature("transfer(address,uint256)", msg.sender, reward)
        );
        require(success, "Reward transfer failed");
        
        emit RewardClaimed(msg.sender, reward);
    }
    
    function calculateReward(address user) public view returns (uint256) {
        Stake storage userStake = stakes[user];
        if (userStake.amount == 0) return 0;
        
        uint256 stakingDuration = block.timestamp - userStake.lastClaimTime;
        uint256 yearlyReward = (userStake.amount * APY) / 100;
        uint256 reward = (yearlyReward * stakingDuration) / SECONDS_PER_YEAR;
        
        return reward;
    }
    
    function getPendingReward(address user) external view returns (uint256) {
        return calculateReward(user);
    }
    
    function getStakerInfo(address user) external view returns (
        uint256 stakedAmount,
        uint256 pendingRewards,
        uint256 totalEarned,
        uint256 stakingDays
    ) {
        Stake storage s = stakes[user];
        uint256 days = (block.timestamp - s.startTime) / 1 days;
        return (s.amount, calculateReward(user), s.rewardsEarned, days);
    }
    
    function getTotalStakers() external view returns (uint256) {
        return stakerList.length;
    }
    
    function getAllStakers() external view returns (address[] memory) {
        return stakerList;
    }
    
    function addRewards() external payable {
        require(msg.value > 0, "No rewards added");
        emit RewardAdded(msg.value);
    }
}
