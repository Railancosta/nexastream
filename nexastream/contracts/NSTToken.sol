// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title NSTToken - NexaStream Token
 * @dev Decentralized cryptocurrency for NexaStream Platform
 * @notice 55,000,000 NST Max Supply
 */

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract NSTToken is ERC20, ERC20Burnable, Pausable, AccessControl, ReentrancyGuard {
    
    // Constants
    uint256 public constant MAX_SUPPLY = 55000000 * 10**18; // 55M NST
    uint256 public constant INITIAL_SUPPLY = 10000000 * 10**18; // 10M initial
    
    // Roles
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
    
    // Tax configuration
    uint256 public burnRate = 1; // 1% burn on transfer
    uint256 public rewardRate = 2; // 2% goes to reward pool
    
    // Addresses
    address public rewardPool;
    address public treasury;
    address public governance;
    
    // Anti-bot protection
    mapping(address => uint256) public lastTransferTime;
    uint256 public antiBotDelay = 60 seconds;
    
    // Supply tracking
    uint256 public burnedSupply;
    uint256 public totalStaked;
    
    // Events
    event TokenBurned(address indexed from, uint256 amount, uint256 newSupply);
    event TaxCollected(address indexed from, uint256 burnAmount, uint256 rewardAmount);
    event RewardPoolUpdated(address indexed newPool);
    event TreasuryUpdated(address indexed newTreasury);
    event GovernanceUpdated(address indexed newGovernance);
    
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
        
        // Initial supply distribution
        _mint(msg.sender, INITIAL_SUPPLY);
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
     * @dev Burn tokens with automatic supply tracking
     */
    function burnWithReason(address from, uint256 amount, string calldata reason) 
        external 
        onlyRole(BURNER_ROLE) 
    {
        _burn(from, amount);
        burnedSupply += amount;
        emit TokenBurned(from, amount, MAX_SUPPLY - totalSupply());
    }
    
    /**
     * @dev Transfer with tax collection
     */
    function _transfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        // Anti-bot protection
        if (block.timestamp < lastTransferTime[from] + antiBotDelay) {
            require(amount <= totalSupply() / 100, "Anti-bot: amount too large");
        }
        lastTransferTime[from] = block.timestamp;
        
        // Calculate tax
        uint256 burnAmount = (amount * burnRate) / 100;
        uint256 rewardAmount = (amount * rewardRate) / 100;
        uint256 taxTotal = burnAmount + rewardAmount;
        
        if (taxTotal > 0) {
            super._transfer(from, address(this), taxTotal);
            
            // Process taxes
            if (burnAmount > 0) {
                _burn(address(this), burnAmount);
                burnedSupply += burnAmount;
            }
            
            if (rewardAmount > 0 && rewardPool != address(0)) {
                super._transfer(rewardPool, rewardAmount, "reward");
            }
        }
        
        uint256 transferAmount = amount - taxTotal;
        super._transfer(from, to, transferAmount);
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
}
