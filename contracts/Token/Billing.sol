// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title NexaStreamBilling
 * @dev Payment processing and subscription management contract
 * @notice ALL PAYMENTS ARE FINAL AND NON-REFUNDABLE
 */
contract NexaStreamBilling {
    
    // Plan types
    enum PlanType { None, Monthly, Annual, Lifetime, PayPerUse }
    
    // Plan pricing in wei (1 ETH = 10^18 wei)
    uint256 public constant MONTHLY_PRICE = 10 * 10**18 / 100; // ~$10 in CELO (assuming 1 CELO = $1)
    uint256 public constant ANNUAL_PRICE = 100 * 10**18 / 100; // ~$100 in CELO
    uint256 public constant LIFETIME_PRICE = 1000 * 10**18 / 100; // ~$1000 in CELO
    
    // Usage pricing
    uint256 public constant API_CALL_PRICE = 0.001 ether;
    uint256 public constant NFT_MINT_PRICE = 0.1 ether;
    uint256 public constant STORAGE_PRICE_PER_GB = 0.05 ether;
    
    // Plan limits
    mapping(PlanType => uint256) public planApiLimits;
    mapping(PlanType => uint256) public planNftLimits;
    mapping(PlanType => uint256) public planStorageLimits;
    
    // User subscriptions
    struct Subscription {
        PlanType plan;
        uint256 startTime;
        uint256 lastPaymentTime;
        uint256 apiCallsUsed;
        uint256 nftsMinted;
        uint256 storageUsed;
        bool isActive;
        string licenseKey;
    }
    
    mapping(address => Subscription) public subscriptions;
    
    // License keys
    mapping(string => bool) public validLicenseKeys;
    mapping(address => string) public userLicenseKeys;
    
    // Events
    event SubscriptionCreated(address indexed user, PlanType plan, uint256 amount);
    event SubscriptionRenewed(address indexed user, PlanType plan, uint256 amount);
    event SubscriptionCancelled(address indexed user);
    event PaymentReceived(address indexed user, uint256 amount, string planType);
    event LicenseKeyGenerated(address indexed user, string licenseKey);
    event ApiCallCharged(address indexed user, uint256 amount);
    
    // Trade secrets access
    mapping(address => bool) public hasTradeSecretsAccess;
    
    // Owner
    address public owner;
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        
        // Set plan limits
        planApiLimits[PlanType.Monthly] = 10000;
        planNftLimits[PlanType.Monthly] = 100;
        planStorageLimits[PlanType.Monthly] = 10 * 1024 * 1024 * 1024; // 10 GB
        
        planApiLimits[PlanType.Annual] = 50000;
        planNftLimits[PlanType.Annual] = 1500;
        planStorageLimits[PlanType.Annual] = 100 * 1024 * 1024 * 1024; // 100 GB
        
        // Lifetime = unlimited (using max uint256)
        planApiLimits[PlanType.Lifetime] = type(uint256).max;
        planNftLimits[PlanType.Lifetime] = type(uint256).max;
        planStorageLimits[PlanType.Lifetime] = type(uint256).max;
    }
    
    /**
     * @dev Subscribe to Monthly Plan ($10/month)
     */
    function subscribeMonthly() external payable {
        require(msg.value >= MONTHLY_PRICE, "Insufficient payment");
        require(!subscriptions[msg.sender].isActive || subscriptions[msg.sender].plan != PlanType.Monthly, "Already subscribed");
        
        _processMonthlySubscription(msg.sender);
        
        emit SubscriptionCreated(msg.sender, PlanType.Monthly, msg.value);
        emit PaymentReceived(msg.sender, msg.value, "Monthly");
        
        // Refund excess
        if (msg.value > MONTHLY_PRICE) {
            payable(msg.sender).transfer(msg.value - MONTHLY_PRICE);
        }
    }
    
    /**
     * @dev Subscribe to Annual Plan ($100/year)
     */
    function subscribeAnnual() external payable {
        require(msg.value >= ANNUAL_PRICE, "Insufficient payment");
        
        _processAnnualSubscription(msg.sender);
        
        emit SubscriptionCreated(msg.sender, PlanType.Annual, msg.value);
        emit PaymentReceived(msg.sender, msg.value, "Annual");
        
        if (msg.value > ANNUAL_PRICE) {
            payable(msg.sender).transfer(msg.value - ANNUAL_PRICE);
        }
    }
    
    /**
     * @dev Purchase Lifetime Plan ($1,000 - one-time)
     * @notice INCLUDES: Source code, trade secrets, white-label rights, commercial rights
     */
    function purchaseLifetime() external payable {
        require(msg.value >= LIFETIME_PRICE, "Insufficient payment");
        require(!subscriptions[msg.sender].isActive || subscriptions[msg.sender].plan != PlanType.Lifetime, "Already lifetime member");
        
        subscriptions[msg.sender] = Subscription({
            plan: PlanType.Lifetime,
            startTime: block.timestamp,
            lastPaymentTime: block.timestamp,
            apiCallsUsed: 0,
            nftsMinted: 0,
            storageUsed: 0,
            isActive: true,
            licenseKey: ""
        });
        
        // Grant trade secrets access
        hasTradeSecretsAccess[msg.sender] = true;
        
        // Generate license key
        _generateLicenseKey(msg.sender);
        
        emit SubscriptionCreated(msg.sender, PlanType.Lifetime, msg.value);
        emit PaymentReceived(msg.sender, msg.value, "Lifetime");
        
        if (msg.value > LIFETIME_PRICE) {
            payable(msg.sender).transfer(msg.value - LIFETIME_PRICE);
        }
    }
    
    /**
     * @dev Pay per use - add credit
     */
    function addCredit() external payable {
        require(msg.value > 0, "Must send ETH");
        
        Subscription storage sub = subscriptions[msg.sender];
        if (!sub.isActive) {
            sub.plan = PlanType.PayPerUse;
            sub.isActive = true;
            sub.startTime = block.timestamp;
        }
        
        emit PaymentReceived(msg.sender, msg.value, "Credit");
    }
    
    /**
     * @dev Internal function to process monthly subscription
     */
    function _processMonthlySubscription(address user) internal {
        subscriptions[user] = Subscription({
            plan: PlanType.Monthly,
            startTime: block.timestamp,
            lastPaymentTime: block.timestamp,
            apiCallsUsed: 0,
            nftsMinted: 0,
            storageUsed: 0,
            isActive: true,
            licenseKey: ""
        });
    }
    
    /**
     * @dev Internal function to process annual subscription
     */
    function _processAnnualSubscription(address user) internal {
        subscriptions[user] = Subscription({
            plan: PlanType.Annual,
            startTime: block.timestamp,
            lastPaymentTime: block.timestamp,
            apiCallsUsed: 0,
            nftsMinted: 0,
            storageUsed: 0,
            isActive: true,
            licenseKey: ""
        });
        
        // Generate license key for annual
        _generateLicenseKey(user);
    }
    
    /**
     * @dev Generate unique license key
     */
    function _generateLicenseKey(address user) internal {
        string memory key = _createLicenseKey(user);
        validLicenseKeys[key] = true;
        userLicenseKeys[user] = key;
        subscriptions[user].licenseKey = key;
        
        emit LicenseKeyGenerated(user, key);
    }
    
    /**
     * @dev Create license key string
     */
    function _createLicenseKey(address user) internal view returns (string memory) {
        bytes32 hash = keccak256(abi.encodePacked(
            user,
            block.timestamp,
            "NEXA-LICENSE",
            address(this)
        ));
        
        return string(abi.encodePacked(
            "NEXA-",
            _toString(uint256(uint160(user)) % 100000000),
            "-",
            _toHexString(uint256(hash) % 0xFFFFFFFFFFFFF),
            "-LIFETIME"
        ));
    }
    
    /**
     * @dev Convert uint to string
     */
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + value % 10));
            value /= 10;
        }
        return string(buffer);
    }
    
    /**
     * @dev Convert to hex string
     */
    function _toHexString(uint256 value) internal pure returns (string memory) {
        bytes memory buffer = new bytes(8);
        for (uint256 i = 0; i < 8; i++) {
            buffer[i] = bytes1(uint8(48 + uint256(uint8((value / (2**(4*i))) % 16))));
        }
        return string(buffer);
    }
    
    /**
     * @dev Check if user has valid subscription
     */
    function hasValidSubscription(address user) external view returns (bool) {
        Subscription storage sub = subscriptions[user];
        return sub.isActive && (
            sub.plan == PlanType.Lifetime ||
            (sub.plan == PlanType.Monthly && block.timestamp < sub.lastPaymentTime + 30 days) ||
            (sub.plan == PlanType.Annual && block.timestamp < sub.lastPaymentTime + 365 days) ||
            sub.plan == PlanType.PayPerUse
        );
    }
    
    /**
     * @dev Get subscription details
     */
    function getSubscription(address user) external view returns (
        PlanType plan,
        uint256 startTime,
        uint256 apiCallsUsed,
        uint256 nftsMinted,
        bool isActive,
        string memory licenseKey,
        bool tradeSecretsAccess
    ) {
        Subscription storage sub = subscriptions[user];
        return (
            sub.plan,
            sub.startTime,
            sub.apiCallsUsed,
            sub.nftsMinted,
            sub.isActive,
            sub.licenseKey,
            hasTradeSecretsAccess[user]
        );
    }
    
    /**
     * @dev Record API call usage
     */
    function recordApiCall(address user, uint256 count) external {
        Subscription storage sub = subscriptions[user];
        require(sub.isActive, "No active subscription");
        
        if (sub.plan == PlanType.PayPerUse) {
            uint256 cost = count * API_CALL_PRICE;
            // Would need credit system implementation
        }
        
        sub.apiCallsUsed += count;
        emit ApiCallCharged(user, count * API_CALL_PRICE);
    }
    
    /**
     * @dev Check if user has source code access (Lifetime only)
     */
    function hasSourceCodeAccess(address user) external view returns (bool) {
        return subscriptions[user].plan == PlanType.Lifetime;
    }
    
    /**
     * @dev Check if user has commercial rights (Lifetime only)
     */
    function hasCommercialRights(address user) external view returns (bool) {
        return subscriptions[user].plan == PlanType.Lifetime;
    }
    
    /**
     * @dev Get remaining API calls
     */
    function getRemainingApiCalls(address user) external view returns (uint256) {
        Subscription storage sub = subscriptions[user];
        if (sub.plan == PlanType.Lifetime) {
            return type(uint256).max - sub.apiCallsUsed;
        }
        
        uint256 limit = planApiLimits[sub.plan];
        if (limit == 0) return 0;
        
        return limit > sub.apiCallsUsed ? limit - sub.apiCallsUsed : 0;
    }
    
    /**
     * @dev Withdraw funds (owner only)
     */
    function withdraw() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    /**
     * @dev Update owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
    
    /**
     * @notice IMPORTANT: All payments are final and non-refundable
     */
    receive() external payable {
        emit PaymentReceived(msg.sender, msg.value, "Direct");
    }
}
