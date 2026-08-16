// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title NEXAToken
 * @dev Governance token for NexaStream platform
 * @notice Used for voting on platform decisions, boosting content, and premium features
 */
contract NEXAToken is ERC20, AccessControl, Pausable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    
    // Anti-bot protection
    mapping(address => uint256) public lastTransferTime;
    uint256 public transferCooldown = 1 minutes;
    uint256 public maxTransferAmount;
    
    // Vesting
    mapping(address => uint256) public vestingEndTime;
    mapping(address => bool) public isVested;
    
    // Trading state
    bool public tradingEnabled = false;
    mapping(address => bool) public isExcludedFromCooldown;
    
    // Events
    event TradingEnabled(address indexed account);
    event TokensVested(address indexed recipient, uint256 amount, uint256 endTime);
    event CooldownUpdated(uint256 newCooldown);
    
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        address initialOwner
    ) ERC20(name, symbol) {
        require(initialOwner != address(0), "Invalid owner");
        
        _grantRole(DEFAULT_ADMIN_ROLE, initialOwner);
        _grantRole(MINTER_ROLE, initialOwner);
        _grantRole(BURNER_ROLE, initialOwner);
        
        // Mint initial supply to owner
        _mint(initialOwner, initialSupply * 10 ** decimals());
        
        // Exclude owner from cooldown
        isExcludedFromCooldown[initialOwner] = true;
    }

    /**
     * @dev Enable trading (can only be called once)
     */
    function enableTrading() external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(!tradingEnabled, "Trading already enabled");
        tradingEnabled = true;
        emit TradingEnabled(msg.sender);
    }

    /**
     * @dev Set transfer cooldown period
     */
    function setTransferCooldown(uint256 _cooldown) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_cooldown <= 1 hours, "Cooldown too long");
        transferCooldown = _cooldown;
        emit CooldownUpdated(_cooldown);
    }

    /**
     * @dev Set max transfer amount (anti-whale)
     */
    function setMaxTransferAmount(uint256 _maxAmount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        maxTransferAmount = _maxAmount;
    }

    /**
     * @dev Exclude address from cooldown (for DEX liquidity, etc.)
     */
    function excludeFromCooldown(address account, bool excluded) external onlyRole(DEFAULT_ADMIN_ROLE) {
        isExcludedFromCooldown[account] = excluded;
    }

    /**
     * @dev Vest tokens for a recipient (linear vesting)
     */
    function vestTokens(address recipient, uint256 amount, uint256 duration) external onlyRole(MINTER_ROLE) {
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Invalid amount");
        require(duration > 0 && duration <= 365 days, "Invalid duration");
        
        // Mint tokens
        _mint(recipient, amount);
        
        // Set vesting
        vestingEndTime[recipient] = block.timestamp + duration;
        isVested[recipient] = true;
        
        emit TokensVested(recipient, amount, vestingEndTime[recipient]);
    }

    /**
     * @dev Mint new tokens
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    /**
     * @dev Burn tokens
     */
    function burn(uint256 amount) external onlyRole(BURNER_ROLE) {
        _burn(msg.sender, amount);
    }

    /**
     * @dev Burn tokens from address
     */
    function burnFrom(address account, uint256 amount) external onlyRole(BURNER_ROLE) {
        _spendAllowance(account, msg.sender, amount);
        _burn(account, amount);
    }

    /**
     * @dev Override transfer with cooldown check
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        super._beforeTokenTransfer(from, to, amount);
        
        // Skip checks for minting, burning, or excluded addresses
        if (from == address(0) || to == address(0) || 
            isExcludedFromCooldown[from] || isExcludedFromCooldown[to]) {
            return;
        }
        
        require(tradingEnabled, "Trading not enabled");
        
        // Anti-whale protection
        if (maxTransferAmount > 0) {
            require(amount <= maxTransferAmount, "Amount exceeds max transfer");
        }
        
        // Cooldown check
        if (!isVested[from] || block.timestamp >= vestingEndTime[from]) {
            require(
                block.timestamp >= lastTransferTime[from] + transferCooldown,
                "Transfer cooldown active"
            );
            lastTransferTime[from] = block.timestamp;
        }
    }
}
