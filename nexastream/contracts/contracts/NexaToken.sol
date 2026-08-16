// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title NexaToken
 * @dev ERC-20 Token for NexaStream Platform
 * Total Supply: 1,000,000,000 NEXA
 */
contract NexaToken {
    string public name = "NexaStream Token";
    string public symbol = "NEXA";
    uint256 public decimals = 18;
    uint256 public totalSupply = 1000000000 * 10**18;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    address public platformTreasury;
    address public rewardsPool;
    address public stakingPool;
    address public teamReserve;
    bool public initialized = false;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address indexed to, uint256 value);
    event Burn(address indexed from, uint256 value);
    
    constructor() {}
    
    function initialize(
        address _platformTreasury,
        address _rewardsPool,
        address _stakingPool,
        address _teamReserve
    ) external {
        require(!initialized, "Already initialized");
        platformTreasury = _platformTreasury;
        rewardsPool = _rewardsPool;
        stakingPool = _stakingPool;
        teamReserve = _teamReserve;
        
        balanceOf[_rewardsPool] = totalSupply * 30 / 100;
        balanceOf[_stakingPool] = totalSupply * 15 / 100;
        balanceOf[_teamReserve] = totalSupply * 5 / 100;
        initialized = true;
        
        emit Transfer(address(0), _rewardsPool, balanceOf[_rewardsPool]);
        emit Transfer(address(0), _stakingPool, balanceOf[_stakingPool]);
        emit Transfer(address(0), _teamReserve, balanceOf[_teamReserve]);
    }
    
    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Allowance exceeded");
        balanceOf[from] -= amount;
        allowance[from][msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }
    
    function mint(address to, uint256 amount) external {
        require(msg.sender == stakingPool, "Only staking pool");
        balanceOf[to] += amount;
        totalSupply += amount;
        emit Mint(to, amount);
        emit Transfer(address(0), to, amount);
    }
}
