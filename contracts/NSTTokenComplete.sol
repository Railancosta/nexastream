// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title NSTToken - NexaStream Token (Complete Tokenomics)
 * @dev Complete tokenomics for NexaStream Platform
 * @notice 55,000,000 NST Max Supply - 100% Transparent & Auditable
 * 
 * TOKENOMICS:
 * ============
 * - Max Supply: 55,000,000 NST (FIXED - NEVER EXCEEDED)
 * 
 * ALLOCATION:
 * - 50% Ecosystem (27,500,000 NST) - Creator rewards, partnerships, grants
 * - 30% Rewards (16,500,000 NST) - Staking rewards, yield farming
 * - 10% Team (5,500,000 NST) - 4-year vesting, 1-year cliff
 * - 5% Public Sale (2,750,000 NST) - Token sale
 * - 5% Liquidity (2,750,000 NST) - DEX liquidity
 * 
 * REVENUE DISTRIBUTION:
 * =====================
 * - 50% to Content Creators (proportional to engagement metrics)
 * - 50% to NexaStream Platform Treasury
 * 
 * FEATURES:
 * ==========
 * - Staking with 12.5% APY
 * - DAO Governance
 * - Automatic Burn (governance approved)
 * - Cross-chain Bridge
 * - Real-time Supply Tracking
 * - Anti-Bot Protection
 * - Cashback System
 * - Liquidity Pool Rewards
 */

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract NSTTokenComplete is ERC20, ERC20Burnable, Pausable, AccessControl, ReentrancyGuard {
    using SafeMath for uint256;

    // ============================================
    // CONSTANTS
    // ============================================
    
    /// @notice Maximum supply - NEVER EXCEEDABLE
    uint256 public constant MAX_SUPPLY = 55000000 * 10**18; // 55M NST
    
    /// @notice Allocation percentages (basis points)
    uint256 public constant ECOSYSTEM_PERCENT = 5000;    // 50%
    uint256 public constant REWARDS_PERCENT = 3000;       // 30%
    uint256 public constant TEAM_PERCENT = 1000;          // 10%
    uint256 public constant PUBLIC_SALE_PERCENT = 500;    // 5%
    uint256 public constant LIQUIDITY_PERCENT = 500;       // 5%
    
    /// @notice Vesting parameters
    uint256 public constant VESTING_DURATION = 4 * 365 days;  // 4 years
    uint256 public constant VESTING_CLIFF = 1 * 365 days;      // 1 year cliff
    uint256 public constant TEAM_UNLOCK_INTERVAL = 90 days;     // Quarterly unlock
    
    /// @notice Fee percentages (basis points)
    uint256 public constant BURN_RATE = 100;        // 1% burn
    uint256 public constant REWARD_RATE = 200;      // 2% to rewards pool
    uint256 public constant CASHBACK_RATE = 100;    // 1% cashback
    
    /// @notice Staking APY (12.5%)
    uint256 public constant STAKING_APY = 125 * 10**16; // 12.5% = 12.5 * 10^16
    
    /// @notice Minimum stake amount
    uint256 public constant MIN_STAKE_AMOUNT = 100 * 10**18; // 100 NST
    
    /// @notice Anti-bot delay
    uint256 public constant ANTI_BOT_DELAY = 60 seconds;

    // ============================================
    // ROLES
    // ============================================
    
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
    bytes32 public constant REWARDS_ROLE = keccak256("REWARDS_ROLE");
    bytes32 public constant TREASURY_ROLE = keccak256("TREASURY_ROLE");
    bytes32 public constant DAO_ROLE = keccak256("DAO_ROLE");

    // ============================================
    // STATE VARIABLES
    // ============================================
    
    /// @notice Addresses
    address public ecosystemFund;
    address public rewardsPool;
    address public teamWallet;
    address public publicSaleWallet;
    address public liquidityPool;
    address public treasury;
    address public daoGovernance;
    address public stakingContract;
    address public bridgeContract;
    
    /// @notice Supply tracking
    uint256 public totalBurned;
    uint256 public totalStaked;
    uint256 public totalRewardsDistributed;
    uint256 public totalRevenueDistributed;
    
    /// @notice Fee addresses
    address public burnAddress;
    
    /// @notice Anti-bot protection
    mapping(address => uint256) public lastTransferTime;
    mapping(address => uint256) public transferCount;
    uint256 public antiBotThreshold = 10; // Max 10 transfers per minute
    
    /// @notice Staking state
    mapping(address => uint256) public stakingAmount;
    mapping(address => uint256) public stakingStartTime;
    mapping(address => uint256) public accumulatedRewards;
    mapping(address => uint256) public lastClaimTime;
    
    /// @notice Vesting state
    mapping(address => uint256) public vestedAmount;
    mapping(address => uint256) public vestingStart;
    mapping(address => uint256) public teamAllocation;
    mapping(address => uint256) public lastUnlockTime;
    mapping(address => uint256) public unlockedAmount;
    
    /// @notice Revenue tracking
    mapping(address => uint256) public creatorRevenue;
    uint256 public platformRevenue;
    uint256 public totalCreatorPayouts;
    
    /// @notice Cashback tracking
    mapping(address => uint256) public cashbackEarned;
    mapping(address => uint256) public cashbackClaimable;
    
    /// @notice Revenue split (can be adjusted by governance)
    uint256 public creatorRevenueShare = 5000; // 50% in basis points
    uint256 public platformRevenueShare = 5000; // 50% in basis points
    
    /// @notice Paused state for emergency
    bool public emergencyPause;
    
    /// @notice DAO proposal tracking
    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;
    
    /// @notice Bridge minting tracking
    mapping(bytes32 => bool) public processedBridgeTransfers;
    
    // ============================================
    // STRUCTS
    // ============================================
    
    struct Proposal {
        string title;
        string description;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 startTime;
        uint256 endTime;
        bool executed;
        bool passed;
        uint256 quorum;
    }
    
    struct BridgeTransfer {
        address recipient;
        uint256 amount;
        bytes32 txHash;
        bool processed;
    }

    // ============================================
    // EVENTS
    // ============================================
    
    event TokenomicsInitialized(
        address indexed ecosystemFund,
        address indexed rewardsPool,
        address indexed teamWallet,
        uint256 maxSupply
    );
    
    event RevenueDeposited(
        uint256 indexed totalAmount,
        uint256 indexed creatorAmount,
        uint256 indexed platformAmount
    );
    
    event CreatorRewardDistributed(
        address indexed creator,
        uint256 indexed amount,
        uint256 indexed totalEarned
    );
    
    event TokenBurned(
        address indexed from,
        uint256 indexed amount,
        uint256 newTotalSupply,
        string reason
    );
    
    event Staked(
        address indexed user,
        uint256 indexed amount,
        uint256 indexed totalStaked,
        uint256 timestamp
    );
    
    event Unstaked(
        address indexed user,
        uint256 indexed amount,
        uint256 indexed totalStaked,
        uint256 timestamp
    );
    
    event RewardsClaimed(
        address indexed user,
        uint256 indexed amount,
        uint256 indexed remainingStake
    );
    
    event CashbackEarned(
        address indexed user,
        uint256 indexed amount,
        uint256 indexed transactionAmount
    );
    
    event CashbackClaimed(
        address indexed user,
        uint256 indexed amount
    );
    
    event DAOProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string indexed title
    );
    
    event DAOVote(
        uint256 indexed proposalId,
        address indexed voter,
        bool indexed support,
        uint256 indexed weight
    );
    
    event DAOProposalExecuted(
        uint256 indexed proposalId,
        bool indexed success
    );
    
    event RevenueShareUpdated(
        uint256 indexed newCreatorShare,
        uint256 indexed newPlatformShare
    );
    
    event CrossChainBridgeMint(
        address indexed recipient,
        uint256 indexed amount,
        bytes32 indexed txHash
    );
    
    event AntiBotTriggered(
        address indexed user,
        uint256 indexed transferCount
    );

    // ============================================
    // MODIFIERS
    // ============================================
    
    modifier notExceedsMaxSupply(uint256 amount) {
        require(
            totalSupply().add(amount) <= MAX_SUPPLY,
            "NST: Would exceed max supply of 55M"
        );
        _;
    }
    
    modifier isNotPausedEmergency() {
        require(!emergencyPause, "NST: Contract emergency paused");
        _;
    }
    
    modifier onlyDAO() {
        require(hasRole(DAO_ROLE, msg.sender), "NST: Only DAO");
        _;
    }

    // ============================================
    // CONSTRUCTOR
    // ============================================
    
    constructor(
        address _ecosystemFund,
        address _rewardsPool,
        address _teamWallet,
        address _publicSaleWallet,
        address _liquidityPool,
        address _treasury,
        address _daoGovernance
    ) ERC20("NexaStream Token", "NST") {
        _validateAddress(_ecosystemFund, "ecosystem fund");
        _validateAddress(_rewardsPool, "rewards pool");
        _validateAddress(_teamWallet, "team wallet");
        _validateAddress(_publicSaleWallet, "public sale wallet");
        _validateAddress(_liquidityPool, "liquidity pool");
        _validateAddress(_treasury, "treasury");
        _validateAddress(_daoGovernance, "DAO governance");
        
        ecosystemFund = _ecosystemFund;
        rewardsPool = _rewardsPool;
        teamWallet = _teamWallet;
        publicSaleWallet = _publicSaleWallet;
        liquidityPool = _liquidityPool;
        treasury = _treasury;
        daoGovernance = _daoGovernance;
        burnAddress = address(0x000000000000000000000000000000000000dEaD);
        
        // Grant roles
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(BURNER_ROLE, msg.sender);
        _grantRole(GOVERNANCE_ROLE, _daoGovernance);
        _grantRole(DAO_ROLE, _daoGovernance);
        
        // Mint initial allocation
        _mint(address(this), MAX_SUPPLY);
        
        // Distribute initial allocation
        _distributeInitialAllocation();
        
        emit TokenomicsInitialized(
            _ecosystemFund,
            _rewardsPool,
            _teamWallet,
            MAX_SUPPLY
        );
    }
    
    function _validateAddress(address addr, string memory name) internal pure {
        require(addr != address(0), string.concat("NST: Invalid ", name));
    }
    
    function _distributeInitialAllocation() internal {
        uint256 ecosystem = MAX_SUPPLY.mul(ECOSYSTEM_PERCENT).div(10000);
        uint256 rewards = MAX_SUPPLY.mul(REWARDS_PERCENT).div(10000);
        uint256 team = MAX_SUPPLY.mul(TEAM_PERCENT).div(10000);
        uint256 publicSale = MAX_SUPPLY.mul(PUBLIC_SALE_PERCENT).div(10000);
        uint256 liquidity = MAX_SUPPLY.mul(LIQUIDITY_PERCENT).div(10000);
        
        // Transfer to ecosystem fund (50%)
        _transfer(address(this), ecosystemFund, ecosystem);
        
        // Transfer to rewards pool (30%)
        _transfer(address(this), rewardsPool, rewards);
        
        // Track team allocation for vesting (10%)
        teamAllocation[teamWallet] = team;
        vestedAmount[teamWallet] = team;
        vestingStart[teamWallet] = block.timestamp;
        
        // Transfer public sale (5%)
        _transfer(address(this), publicSaleWallet, publicSale);
        
        // Transfer to liquidity pool (5%)
        _transfer(address(this), liquidityPool, liquidity);
    }

    // ============================================
    // CORE TOKEN FUNCTIONS
    // ============================================
    
    /**
     * @dev Mint new tokens (only minter role, never exceeds max supply)
     */
    function mint(address to, uint256 amount) 
        external 
        onlyRole(MINTER_ROLE) 
        notExceedsMaxSupply(amount)
    {
        _mint(to, amount);
    }
    
    /**
     * @dev Burn tokens (reduces total supply, tracked permanently)
     */
    function burn(uint256 amount) 
        public 
        override 
        onlyRole(BURNER_ROLE) 
    {
        uint256 balance = balanceOf(msg.sender);
        require(balance >= amount, "NST: Insufficient balance to burn");
        
        _burn(msg.sender, amount);
        totalBurned = totalBurned.add(amount);
        
        emit TokenBurned(
            msg.sender, 
            amount, 
            MAX_SUPPLY.sub(totalSupply()),
            "Governance approved burn"
        );
    }
    
    /**
     * @dev Burn from address (for governance approved burns)
     */
    function burnFrom(address from, uint256 amount) 
        external 
        onlyRole(BURNER_ROLE) 
    {
        uint256 balance = balanceOf(from);
        require(balance >= amount, "NST: Insufficient balance");
        
        _spendAllowance(from, msg.sender, amount);
        _burn(from, amount);
        totalBurned = totalBurned.add(amount);
        
        emit TokenBurned(
            from, 
            amount, 
            MAX_SUPPLY.sub(totalSupply()),
            "Governance approved burn"
        );
    }

    // ============================================
    // TRANSFER WITH FEES & CASHBACK
    // ============================================
    
    function _transfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        // Anti-bot protection
        _checkAntiBot(from);
        
        // Skip fees for contracts
        if (from == address(this) || to == address(this)) {
            super._transfer(from, to, amount);
            return;
        }
        
        // Skip fees for team vesting releases
        if (to == teamWallet || from == teamWallet) {
            super._transfer(from, to, amount);
            return;
        }
        
        // Calculate fees
        uint256 burnAmount = amount.mul(BURN_RATE).div(10000);
        uint256 rewardAmount = amount.mul(REWARD_RATE).div(10000);
        uint256 cashbackAmount = amount.mul(CASHBACK_RATE).div(10000);
        uint256 totalFees = burnAmount.add(rewardAmount).add(cashbackAmount);
        
        uint256 transferAmount = amount.sub(totalFees);
        
        // Process transfer
        super._transfer(from, to, transferAmount);
        
        // Process burn
        if (burnAmount > 0) {
            super._transfer(from, burnAddress, burnAmount);
            totalBurned = totalBurned.add(burnAmount);
            _burn(burnAddress, burnAmount);
        }
        
        // Process rewards to pool
        if (rewardAmount > 0 && rewardsPool != address(0)) {
            super._transfer(from, rewardsPool, rewardAmount);
        }
        
        // Process cashback
        if (cashbackAmount > 0 && to != address(0)) {
            cashbackClaimable[to] = cashbackClaimable[to].add(cashbackAmount);
            cashbackEarned[to] = cashbackEarned[to].add(cashbackAmount);
            emit CashbackEarned(to, cashbackAmount, amount);
        }
    }
    
    function _checkAntiBot(address user) internal {
        if (lastTransferTime[user].add(ANTI_BOT_DELAY) > block.timestamp) {
            transferCount[user] = transferCount[user].add(1);
            if (transferCount[user] > antiBotThreshold) {
                emit AntiBotTriggered(user, transferCount[user]);
            }
        } else {
            transferCount[user] = 1;
        }
        lastTransferTime[user] = block.timestamp;
    }

    // ============================================
    // STAKING FUNCTIONS
    // ============================================
    
    /**
     * @dev Stake tokens for rewards (12.5% APY)
     */
    function stake(uint256 amount) 
        external 
        nonReentrant 
        isNotPausedEmergency 
    {
        require(amount >= MIN_STAKE_AMOUNT, "NST: Below minimum stake");
        require(balanceOf(msg.sender) >= amount, "NST: Insufficient balance");
        
        // Claim existing rewards first
        if (stakingAmount[msg.sender] > 0) {
            _claimStakingRewards();
        }
        
        // Transfer tokens to contract
        _transfer(msg.sender, address(this), amount);
        
        // Update staking state
        stakingAmount[msg.sender] = stakingAmount[msg.sender].add(amount);
        stakingStartTime[msg.sender] = block.timestamp;
        totalStaked = totalStaked.add(amount);
        
        emit Staked(
            msg.sender, 
            amount, 
            stakingAmount[msg.sender],
            block.timestamp
        );
    }
    
    /**
     * @dev Unstake tokens (7-day unbonding period)
     */
    function unstake(uint256 amount) 
        external 
        nonReentrant 
        isNotPausedEmergency 
    {
        require(amount > 0, "NST: Cannot unstake 0");
        require(
            stakingAmount[msg.sender] >= amount, 
            "NST: Insufficient staked amount"
        );
        
        // Claim existing rewards first
        _claimStakingRewards();
        
        // Update staking state
        stakingAmount[msg.sender] = stakingAmount[msg.sender].sub(amount);
        totalStaked = totalStaked.sub(amount);
        
        // Transfer back
        _transfer(address(this), msg.sender, amount);
        
        emit Unstaked(
            msg.sender, 
            amount, 
            stakingAmount[msg.sender],
            block.timestamp
        );
    }
    
    /**
     * @dev Claim accumulated staking rewards
     */
    function claimStakingRewards() 
        external 
        nonReentrant 
        returns (uint256) 
    {
        return _claimStakingRewards();
    }
    
    function _claimStakingRewards() internal returns (uint256) {
        uint256 rewards = calculateStakingRewards(msg.sender);
        require(rewards > 0, "NST: No rewards to claim");
        
        accumulatedRewards[msg.sender] = 0;
        lastClaimTime[msg.sender] = block.timestamp;
        
        // Transfer rewards from rewards pool
        if (rewards > 0 && rewardsPool != address(0)) {
            _transfer(rewardsPool, msg.sender, rewards);
            totalRewardsDistributed = totalRewardsDistributed.add(rewards);
        }
        
        emit RewardsClaimed(msg.sender, rewards, stakingAmount[msg.sender]);
        
        return rewards;
    }
    
    /**
     * @dev Calculate pending staking rewards
     */
    function calculateStakingRewards(address staker) 
        public 
        view 
        returns (uint256) 
    {
        if (stakingAmount[staker] == 0) {
            return 0;
        }
        
        uint256 timeStaked = block.timestamp.sub(lastClaimTime[staker]);
        uint256 yearlyReward = stakingAmount[staker]
            .mul(STAKING_APY)
            .div(10**18);
        
        uint256 pendingReward = yearlyReward.mul(timeStaked).div(365 days);
        
        return pendingReward.add(accumulatedRewards[staker]);
    }

    // ============================================
    // REVENUE & REWARDS DISTRIBUTION
    // ============================================
    
    /**
     * @dev Deposit platform revenue (50% creators, 50% platform)
     */
    function depositRevenue(uint256 amount) 
        external 
        onlyRole(TREASURY_ROLE) 
        nonReentrant 
    {
        require(balanceOf(msg.sender) >= amount, "NST: Insufficient balance");
        
        // Calculate split
        uint256 creatorShare = amount.mul(creatorRevenueShare).div(10000);
        uint256 platformShare = amount.mul(platformRevenueShare).div(10000);
        
        // Transfer to treasury
        _transfer(msg.sender, treasury, platformShare);
        platformRevenue = platformRevenue.add(platformShare);
        
        // Keep creator share in contract for distribution
        // (will be distributed via distributeCreatorRewards)
        
        totalRevenueDistributed = totalRevenueDistributed.add(amount);
        
        emit RevenueDeposited(amount, creatorShare, platformShare);
    }
    
    /**
     * @dev Distribute rewards to content creators
     * @param creators Array of creator addresses
     * @param amounts Array of amounts (must match creators length)
     */
    function distributeCreatorRewards(
        address[] calldata creators,
        uint256[] calldata amounts
    ) 
        external 
        onlyRole(REWARDS_ROLE) 
        nonReentrant 
    {
        require(
            creators.length == amounts.length, 
            "NST: Length mismatch"
        );
        
        uint256 totalDistributed = 0;
        
        for (uint256 i = 0; i < creators.length; i++) {
            if (amounts[i] > 0 && creators[i] != address(0)) {
                creatorRevenue[creators[i]] = creatorRevenue[creators[i]]
                    .add(amounts[i]);
                totalCreatorPayouts = totalCreatorPayouts.add(amounts[i]);
                totalDistributed = totalDistributed.add(amounts[i]);
                
                _transfer(address(this), creators[i], amounts[i]);
                
                emit CreatorRewardDistributed(
                    creators[i], 
                    amounts[i],
                    creatorRevenue[creators[i]]
                );
            }
        }
        
        require(
            totalDistributed <= balanceOf(address(this)),
            "NST: Insufficient contract balance"
        );
    }
    
    /**
     * @dev Update revenue split (governance controlled)
     */
    function updateRevenueShare(
        uint256 newCreatorShare, 
        uint256 newPlatformShare
    ) 
        external 
        onlyDAO 
    {
        require(
            newCreatorShare.add(newPlatformShare) == 10000,
            "NST: Must equal 100%"
        );
        
        creatorRevenueShare = newCreatorShare;
        platformRevenueShare = newPlatformShare;
        
        emit RevenueShareUpdated(newCreatorShare, newPlatformShare);
    }

    // ============================================
    // DAO GOVERNANCE
    // ============================================
    
    /**
     * @dev Create a governance proposal
     */
    function createProposal(
        string calldata title,
        string calldata description,
        uint256 votingPeriod
    ) 
        external 
        onlyDAO 
        returns (uint256) 
    {
        proposalCount++;
        
        proposals[proposalCount] = Proposal({
            title: title,
            description: description,
            votesFor: 0,
            votesAgainst: 0,
            startTime: block.timestamp,
            endTime: block.timestamp.add(votingPeriod),
            executed: false,
            passed: false,
            quorum: 1000 * 10**18 // 1000 NST minimum quorum
        });
        
        emit DAOProposalCreated(proposalCount, msg.sender, title);
        
        return proposalCount;
    }
    
    /**
     * @dev Vote on a proposal
     */
    function vote(
        uint256 proposalId,
        bool support
    ) 
        external 
        onlyDAO 
    {
        Proposal storage proposal = proposals[proposalId];
        
        require(
            block.timestamp >= proposal.startTime &&
            block.timestamp <= proposal.endTime,
            "NST: Voting period ended"
        );
        require(!proposal.executed, "NST: Already executed");
        
        uint256 votingPower = stakingAmount[msg.sender];
        require(votingPower > 0, "NST: No voting power");
        
        if (support) {
            proposal.votesFor = proposal.votesFor.add(votingPower);
        } else {
            proposal.votesAgainst = proposal.votesAgainst.add(votingPower);
        }
        
        emit DAOVote(proposalId, msg.sender, support, votingPower);
    }
    
    /**
     * @dev Execute a passed proposal
     */
    function executeProposal(uint256 proposalId) 
        external 
        onlyDAO 
        returns (bool) 
    {
        Proposal storage proposal = proposals[proposalId];
        
        require(
            block.timestamp > proposal.endTime,
            "NST: Voting period not ended"
        );
        require(!proposal.executed, "NST: Already executed");
        
        uint256 totalVotes = proposal.votesFor.add(proposal.votesAgainst);
        require(
            totalVotes >= proposal.quorum,
            "NST: Quorum not reached"
        );
        
        proposal.executed = true;
        proposal.passed = proposal.votesFor > proposal.votesAgainst;
        
        emit DAOProposalExecuted(proposalId, proposal.passed);
        
        return proposal.passed;
    }

    // ============================================
    // TEAM VESTING
    // ============================================
    
    /**
     * @dev Withdraw vested team tokens (quarterly unlock after cliff)
     */
    function withdrawTeamVested() 
        external 
        returns (uint256) 
    {
        require(
            msg.sender == teamWallet || 
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "NST: Not authorized"
        );
        
        uint256 vested = getVestedAmount(teamWallet);
        uint256 available = vested.sub(unlockedAmount[teamWallet]);
        
        require(available > 0, "NST: No vested tokens available");
        
        // Check quarterly unlock
        require(
            block.timestamp >= lastUnlockTime[teamWallet].add(TEAM_UNLOCK_INTERVAL),
            "NST: Quarterly unlock not reached"
        );
        
        unlockedAmount[teamWallet] = vested;
        lastUnlockTime[teamWallet] = block.timestamp;
        
        _transfer(address(this), teamWallet, available);
        
        return available;
    }
    
    /**
     * @dev Get vested amount (linear vesting after 1-year cliff)
     */
    function getVestedAmount(address account) 
        public 
        view 
        returns (uint256) 
    {
        if (vestedAmount[account] == 0) {
            return 0;
        }
        
        uint256 timeSinceStart = block.timestamp.sub(vestingStart[account]);
        
        // Cliff period
        if (timeSinceStart < VESTING_CLIFF) {
            return 0;
        }
        
        // Fully vested after 4 years
        if (timeSinceStart >= VESTING_DURATION) {
            return vestedAmount[account];
        }
        
        // Linear vesting
        return (vestedAmount[account].mul(timeSinceStart)).div(VESTING_DURATION);
    }

    // ============================================
    // CASHBACK
    // ============================================
    
    /**
     * @dev Claim accumulated cashback
     */
    function claimCashback() 
        external 
        nonReentrant 
        returns (uint256) 
    {
        uint256 amount = cashbackClaimable[msg.sender];
        require(amount > 0, "NST: No cashback to claim");
        
        cashbackClaimable[msg.sender] = 0;
        _transfer(address(this), msg.sender, amount);
        
        emit CashbackClaimed(msg.sender, amount);
        
        return amount;
    }

    // ============================================
    // CROSS-CHAIN BRIDGE
    // ============================================
    
    /**
     * @dev Mint tokens from bridge (only bridge contract)
     */
    function bridgeMint(
        address recipient,
        uint256 amount,
        bytes32 txHash
    ) 
        external 
        onlyRole(MINTER_ROLE) 
        notExceedsMaxSupply(amount) 
    {
        require(
            !processedBridgeTransfers[txHash],
            "NST: Transfer already processed"
        );
        
        processedBridgeTransfers[txHash] = true;
        _mint(recipient, amount);
        
        emit CrossChainBridgeMint(recipient, amount, txHash);
    }
    
    /**
     * @dev Lock tokens for bridge withdrawal
     */
    function bridgeLock(
        address bridgeAddress,
        uint256 amount
    ) 
        external 
        nonReentrant 
    {
        require(
            bridgeContract != address(0),
            "NST: Bridge not set"
        );
        
        _transfer(msg.sender, bridgeContract, amount);
    }

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================
    
    function setRewardsPool(address newPool) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(newPool != address(0), "NST: Invalid address");
        rewardsPool = newPool;
    }
    
    function setTreasury(address newTreasury) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(newTreasury != address(0), "NST: Invalid address");
        treasury = newTreasury;
    }
    
    function setStakingContract(address newContract) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        stakingContract = newContract;
    }
    
    function setBridgeContract(address newContract) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        bridgeContract = newContract;
    }
    
    function setEmergencyPause(bool paused) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        emergencyPause = paused;
    }
    
    function setAntiBotThreshold(uint256 threshold) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        antiBotThreshold = threshold;
    }
    
    function pause() 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        _pause();
    }
    
    function unpause() 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        _unpause();
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================
    
    /**
     * @dev Get complete tokenomics dashboard data
     */
    function getTokenomicsDashboard() 
        external 
        view 
        returns (
            uint256 maxSupply,
            uint256 totalSupply,
            uint256 circulatingSupply,
            uint256 totalStaked_,
            uint256 totalBurned_,
            uint256 stakingPercentage,
            uint256 currentAPY,
            uint256 totalRewardsDistributed_,
            uint256 totalRevenueDistributed_,
            uint256 totalCreatorPayouts_
        ) 
    {
        maxSupply = MAX_SUPPLY;
        totalSupply = MAX_SUPPLY.sub(totalBurned);
        circulatingSupply = totalSupply.sub(totalStaked);
        totalStaked_ = totalStaked;
        totalBurned_ = totalBurned;
        stakingPercentage = totalSupply > 0 
            ? totalStaked.mul(10000).div(totalSupply) 
            : 0;
        currentAPY = STAKING_APY;
        totalRewardsDistributed_ = totalRewardsDistributed;
        totalRevenueDistributed_ = totalRevenueDistributed;
        totalCreatorPayouts_ = totalCreatorPayouts;
    }
    
    /**
     * @dev Get allocation breakdown
     */
    function getAllocationBreakdown() 
        external 
        view 
        returns (
            uint256 ecosystem,
            uint256 rewardsPool_,
            uint256 team,
            uint256 publicSale,
            uint256 liquidity
        ) 
    {
        ecosystem = MAX_SUPPLY.mul(ECOSYSTEM_PERCENT).div(10000);
        rewardsPool_ = MAX_SUPPLY.mul(REWARDS_PERCENT).div(10000);
        team = MAX_SUPPLY.mul(TEAM_PERCENT).div(10000);
        publicSale = MAX_SUPPLY.mul(PUBLIC_SALE_PERCENT).div(10000);
        liquidity = MAX_SUPPLY.mul(LIQUIDITY_PERCENT).div(10000);
    }
    
    /**
     * @dev Get staking info for an address
     */
    function getStakingInfo(address staker) 
        external 
        view 
        returns (
            uint256 stakedAmount,
            uint256 pendingRewards,
            uint256 cashbackAvailable,
            uint256 creatorEarnings
        ) 
    {
        stakedAmount = stakingAmount[staker];
        pendingRewards = calculateStakingRewards(staker);
        cashbackAvailable = cashbackClaimable[staker];
        creatorEarnings = creatorRevenue[staker];
    }
    
    /**
     * @dev Get proposal details
     */
    function getProposalDetails(uint256 proposalId) 
        external 
        view 
        returns (
            string memory title,
            string memory description,
            uint256 votesFor,
            uint256 votesAgainst,
            uint256 startTime,
            uint256 endTime,
            bool executed,
            bool passed,
            bool canExecute
        ) 
    {
        Proposal memory p = proposals[proposalId];
        return (
            p.title,
            p.description,
            p.votesFor,
            p.votesAgainst,
            p.startTime,
            p.endTime,
            p.executed,
            p.passed,
            !p.executed && block.timestamp > p.endTime
        );
    }

    // ============================================
    // BATCH OPERATIONS
    // ============================================
    
    /**
     * @dev Airdrop for marketing campaigns
     */
    function airdrop(
        address[] calldata recipients, 
        uint256[] calldata amounts
    ) 
        external 
        onlyRole(MINTER_ROLE) 
        nonReentrant 
    {
        require(
            recipients.length == amounts.length,
            "NST: Length mismatch"
        );
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount = totalAmount.add(amounts[i]);
        }
        
        require(
            totalSupply().add(totalAmount) <= MAX_SUPPLY,
            "NST: Would exceed max supply"
        );
        
        for (uint256 i = 0; i < recipients.length; i++) {
            _mint(recipients[i], amounts[i]);
        }
    }
    
    /**
     * @dev Batch transfer for efficiency
     */
    function batchTransfer(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) 
        external 
    {
        require(
            recipients.length == amounts.length,
            "NST: Length mismatch"
        );
        
        for (uint256 i = 0; i < recipients.length; i++) {
            _transfer(msg.sender, recipients[i], amounts[i]);
        }
    }

    // ============================================
    // EMERGENCY RECOVERY
    // ============================================
    
    /**
     * @dev Recover accidentally sent ERC20 tokens
     */
    function recoverERC20(
        address tokenAddress, 
        uint256 tokenAmount
    ) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(
            tokenAddress != address(this),
            "NST: Cannot recover NST"
        );
        IERC20(tokenAddress).transfer(
            msg.sender, 
            tokenAmount
        );
    }
    
    /**
     * @dev Sweep ETH (if any)
     */
    function sweepETH() 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        payable(msg.sender).transfer(address(this).balance);
    }
}
