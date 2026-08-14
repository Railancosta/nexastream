// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title NexaStream Token (NST)
 * @notice ERC-20 token with a hard maximum supply cap of 55,000,000 NST.
 *
 * Invariants (rule 46-48):
 *   - MAX_SUPPLY is a constant and can NEVER be exceeded.
 *   - No infinite mint — mint is bounded by the cap and access-controlled.
 *   - No hidden admin functions that can drain or inflate beyond the cap.
 *   - Supply cap is separate from creator revenue economics (rule 47).
 *
 * Status: PROTOTYPE — not deployed to mainnet, not audited.
 */
interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract NSTToken is IERC20 {
    string public constant name = "NexaStream Token";
    string public constant symbol = "NST";
    uint8 public constant decimals = 18;

    /// @dev 55,000,000 NST * 10^18 — the absolute maximum that can ever exist.
    uint256 public constant MAX_SUPPLY = 55_000_000 * 10 ** 18;

    uint256 private _totalSupply;
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    address public owner;
    bool public mintingFinalized;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event MintingFinalized();

    modifier onlyOwner() {
        require(msg.sender == owner, "NST: not owner");
        _;
    }

    modifier mintingOpen() {
        require(!mintingFinalized, "NST: minting finalized");
        _;
    }

    constructor(address initialOwner) {
        require(initialOwner != address(0), "NST: zero owner");
        owner = initialOwner;
        emit OwnershipTransferred(address(0), initialOwner);
    }

    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }

    function allowance(address ownerAddr, address spender) external view returns (uint256) {
        return _allowances[ownerAddr][spender];
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        _allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = _allowances[from][msg.sender];
        require(allowed >= amount, "NST: insufficient allowance");
        _allowances[from][msg.sender] = allowed - amount;
        _transfer(from, to, amount);
        return true;
    }

    /**
     * @notice Mint tokens up to MAX_SUPPLY. Only callable by owner before finalization.
     * @dev Reverts if minting would exceed MAX_SUPPLY — the cap is an invariant.
     */
    function mint(address to, uint256 amount) external onlyOwner mintingOpen {
        require(to != address(0), "NST: zero address");
        require(_totalSupply + amount <= MAX_SUPPLY, "NST: exceeds max supply");
        _totalSupply += amount;
        _balances[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    /// @notice Permanently disable minting. Irreversible.
    function finalizeMinting() external onlyOwner mintingOpen {
        mintingFinalized = true;
        emit MintingFinalized();
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "NST: zero owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(_balances[from] >= amount, "NST: insufficient balance");
        _balances[from] -= amount;
        _balances[to] += amount;
        emit Transfer(from, to, amount);
    }
}
