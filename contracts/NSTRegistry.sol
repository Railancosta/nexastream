// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
/// @notice NST (55M max) + registro publico de obras. TESTNET (Item 40).
contract NSTRegistry {
    string public constant name = "NexaStream Token";
    string public constant symbol = "NST";
    uint8  public constant decimals = 18;
    uint256 public constant MAX_SUPPLY = 55_000_000 * 10 ** 18;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed o, address indexed s, uint256 v);
    event VideoRegistered(bytes32 indexed contentHash, string magnet, address indexed author, uint256 ts);
    constructor() { balanceOf[msg.sender] = MAX_SUPPLY; emit Transfer(address(0), msg.sender, MAX_SUPPLY); }
    function approve(address s, uint256 v) external returns (bool) { allowance[msg.sender][s] = v; emit Approval(msg.sender, s, v); return true; }
    function transfer(address to, uint256 v) external returns (bool) {
        require(balanceOf[msg.sender] >= v, "saldo");
        balanceOf[msg.sender] -= v; balanceOf[to] += v;
        emit Transfer(msg.sender, to, v); return true;
    }
    function transferFrom(address f, address t, uint256 v) external returns (bool) {
        require(balanceOf[f] >= v && allowance[f][msg.sender] >= v, "saldo/aprovacao");
        allowance[f][msg.sender] -= v; balanceOf[f] -= v; balanceOf[t] += v;
        emit Transfer(f, t, v); return true;
    }
    /// @notice Registro imutavel e publico da obra (hash + magnet). Autoria != copyright (Item 19).
    function registerVideo(bytes32 contentHash, string calldata magnet) external {
        emit VideoRegistered(contentHash, magnet, msg.sender, block.timestamp);
    }
}
