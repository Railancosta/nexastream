// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title NexaStreamCore
 * @dev Main platform contract for NexaStream video platform
 * @notice Handles creator earnings, USDC distributions, and platform governance
 */
contract NexaStreamCore is AccessControl, Pausable, ReentrancyGuard {
    // Roles
    bytes32 public constant PLATFORM_ROLE = keccak256("PLATFORM_ROLE");
    bytes32 public constant CREATOR_ROLE = keccak256("CREATOR_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // Contracts
    IERC20 public immutable usdcToken;
    
    // Platform addresses
    address public platformWallet;
    address public treasuryWallet;
    
    // Fee configuration (in basis points, 100 = 1%)
    uint256 public platformFee = 2000; // 20% of creator earnings
    uint256 public treasuryFee = 500;   // 5% to treasury
    
    // Creator earnings tracking
    mapping(address => uint256) public creatorEarnings;
    mapping(address => uint256) public creatorPendingWithdrawals;
    mapping(address => uint256) public totalCreatorPayouts;
    
    // Video boosting
    mapping(bytes32 => uint256) public videoBoostBalances;
    uint256 public boostReserveRatio = 1000; // 10% of boost goes to reserve
    
    // Statistics
    uint256 public totalPlatformRevenue;
    uint256 public totalCreatorPayoutsAllTime;
    uint256 public totalViewsAllTime;
    uint256 public activeCreators;
    
    // Events
    event EarningsDeposited(address indexed creator, uint256 amount, uint256 platformShare, uint256 creatorShare);
    event WithdrawalProcessed(address indexed creator, address indexed recipient, uint256 amount);
    event CreatorRegistered(address indexed creator, string channelSlug);
    event VideoBoosted(bytes32 indexed videoId, address indexed booster, uint256 amount);
    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);
    event WalletUpdated(address indexed oldWallet, address indexed newWallet);
    
    // Modifiers
    modifier onlyCreator() {
        require(hasRole(CREATOR_ROLE, msg.sender), "Caller is not a registered creator");
        _;
    }
    
    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "Caller is not an admin");
        _;
    }

    constructor(
        address _usdcToken,
        address _platformWallet,
        address _treasuryWallet
    ) {
        require(_usdcToken != address(0), "Invalid USDC address");
        require(_platformWallet != address(0), "Invalid platform wallet");
        
        usdcToken = IERC20(_usdcToken);
        platformWallet = _platformWallet;
        treasuryWallet = _treasuryWallet;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Register a new creator on the platform
     */
    function registerCreator(address creator, string calldata channelSlug) external onlyAdmin whenNotPaused {
        require(creator != address(0), "Invalid creator address");
        grantRole(CREATOR_ROLE, creator);
        activeCreators++;
        emit CreatorRegistered(creator, channelSlug);
    }

    /**
     * @dev Deposit earnings from ad revenue
     * @param creator The creator's address
     * @param viewCount Number of views for this batch
     */
    function depositEarnings(address creator, uint256 viewCount) external onlyRole(PLATFORM_ROLE) whenNotPaused {
        require(creator != address(0), "Invalid creator address");
        require(viewCount > 0, "Invalid view count");
        
        // Simplified earnings calculation: $0.01 per view
        uint256 grossEarnings = viewCount * 0.01 ether; // In USDC terms (using wei for simplicity)
        
        // Calculate fees
        uint256 platformShare = (grossEarnings * platformFee) / 10000;
        uint256 treasuryShare = (grossEarnings * treasuryFee) / 10000;
        uint256 creatorShare = grossEarnings - platformShare - treasuryShare;
        
        // Update earnings
        creatorEarnings[creator] += creatorShare;
        totalPlatformRevenue += platformShare + treasuryShare;
        totalViewsAllTime += viewCount;
        
        emit EarningsDeposited(creator, grossEarnings, platformShare, creatorShare);
    }

    /**
     * @dev Direct earnings deposit (for testing or manual adjustments)
     */
    function depositCreatorEarnings(address creator, uint256 amount) external onlyAdmin whenNotPaused {
        require(creator != address(0), "Invalid creator address");
        require(amount > 0, "Invalid amount");
        
        creatorEarnings[creator] += amount;
        emit EarningsDeposited(creator, amount, 0, amount);
    }

    /**
     * @dev Creator withdraws their earnings
     */
    function withdraw(uint256 amount) external onlyCreator whenNotPaused nonReentrant {
        require(amount > 0, "Invalid amount");
        require(creatorEarnings[msg.sender] >= amount, "Insufficient balance");
        
        creatorEarnings[msg.sender] -= amount;
        creatorPendingWithdrawals[msg.sender] += amount;
        
        // Transfer USDC
        require(
            usdcToken.transfer(msg.sender, amount),
            "USDC transfer failed"
        );
        
        creatorPendingWithdrawals[msg.sender] -= amount;
        totalCreatorPayouts[msg.sender] += amount;
        totalCreatorPayoutsAllTime += amount;
        
        emit WithdrawalProcessed(msg.sender, msg.sender, amount);
    }

    /**
     * @dev Withdraw to a specific address (for users without wallet)
     */
    function withdrawToAddress(address recipient, uint256 amount) external onlyCreator whenNotPaused nonReentrant {
        require(amount > 0, "Invalid amount");
        require(creatorEarnings[msg.sender] >= amount, "Insufficient balance");
        require(recipient != address(0), "Invalid recipient");
        
        creatorEarnings[msg.sender] -= amount;
        
        require(
            usdcToken.transfer(recipient, amount),
            "USDC transfer failed"
        );
        
        totalCreatorPayouts[msg.sender] += amount;
        totalCreatorPayoutsAllTime += amount;
        
        emit WithdrawalProcessed(msg.sender, recipient, amount);
    }

    /**
     * @dev Boost a video (paid promotion)
     */
    function boostVideo(bytes32 videoId) external payable whenNotPaused nonReentrant {
        require(msg.value > 0, "Invalid boost amount");
        
        uint256 reserveAmount = (msg.value * boostReserveRatio) / 10000;
        uint256 boostAmount = msg.value - reserveAmount;
        
        videoBoostBalances[videoId] += boostAmount;
        
        // Send reserve to platform
        (bool success, ) = platformWallet.call{value: reserveAmount}("");
        require(success, "Reserve transfer failed");
        
        emit VideoBoosted(videoId, msg.sender, boostAmount);
    }

    /**
     * @dev Get creator's current earnings balance
     */
    function getCreatorBalance(address creator) external view returns (uint256) {
        return creatorEarnings[creator];
    }

    /**
     * @dev Get creator's statistics
     */
    function getCreatorStats(address creator) external view returns (
        uint256 earnings,
        uint256 totalPaid,
        uint256 pending
    ) {
        return (
            creatorEarnings[creator],
            totalCreatorPayouts[creator],
            creatorPendingWithdrawals[creator]
        );
    }

    /**
     * @dev Update platform fee (admin only)
     */
    function updatePlatformFee(uint256 newFee) external onlyAdmin {
        require(newFee <= 5000, "Fee too high (max 50%)");
        uint256 oldFee = platformFee;
        platformFee = newFee;
        emit PlatformFeeUpdated(oldFee, newFee);
    }

    /**
     * @dev Update platform wallet
     */
    function updatePlatformWallet(address newWallet) external onlyAdmin {
        require(newWallet != address(0), "Invalid wallet");
        address oldWallet = platformWallet;
        platformWallet = newWallet;
        emit WalletUpdated(oldWallet, newWallet);
    }

    /**
     * @dev Pause the contract (emergency)
     */
    function pauseContract() external onlyAdmin {
        _pause();
    }

    /**
     * @dev Unpause the contract
     */
    function unpauseContract() external onlyAdmin {
        _unpause();
    }

    /**
     * @dev Emergency withdrawal by admin
     */
    function emergencyWithdrawUSDC(address to, uint256 amount) external onlyAdmin {
        require(to != address(0), "Invalid recipient");
        require(usdcToken.transfer(to, amount), "Transfer failed");
    }

    // Receive ETH for boosts
    receive() external payable {}
}
