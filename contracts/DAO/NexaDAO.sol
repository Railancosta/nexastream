// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";

contract NexaToken is ERC20, ERC20Votes {
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18; // 1 billion tokens
    
    constructor(address initialOwner) ERC20("NexaStream DAO", "NEXA") EIP712("NexaStream DAO", "1") {
        _mint(initialOwner, MAX_SUPPLY);
    }
    
    function mint(address to, uint256 amount) public {
        require(totalSupply() + amount <= MAX_SUPPLY, "Max supply exceeded");
        _mint(to, amount);
    }
}

contract NexaDAO is 
    Governor, 
    GovernorCountingSimple, 
    GovernorVotes, 
    GovernorVotesQuorumFraction,
    GovernorTimelockControl,
    Ownable 
{
    uint256 public votingDelay;
    uint256 public votingPeriod;
    uint256 public proposalThreshold;
    uint256 public treasuryBalance;
    
    // Proposal tracking
    mapping(uint256 => ProposalInfo) public proposalInfo;
    
    struct ProposalInfo {
        string description;
        uint256 targetAmount;
        address payable target;
        bool isTreasuryProposal;
        uint256 executionTime;
    }
    
    // Verified creators who can propose
    mapping(address => bool) public verifiedProposers;
    
    // Delegation tracking
    mapping(address => address) public delegates;
    
    // Events
    event TreasuryUpdated(uint256 newBalance);
    event ProposerVerified(address indexed proposer, bool status);
    event ProposalExecuted(uint256 indexed proposalId);
    
    IVotes public immutable token;
    TimelockController public immutable timelock;
    
    constructor(
        IVotes _token,
        TimelockController _timelock,
        address initialOwner
    ) 
        Governor("NexaStream DAO", "NEXA", IVotes(address(_token)))
        GovernorVotes(_token)
        GovernorVotesQuorumFraction(4)
        GovernorTimelockControl(_timelock)
        Ownable(initialOwner)
    {
        token = _token;
        timelock = _timelock;
        votingDelay = 1 days;
        votingPeriod = 7 days;
        proposalThreshold = 1000000 * 10**18; // 1M tokens to propose
    }

    function votingDelay() public view override returns (uint256) {
        return votingDelay;
    }

    function votingPeriod() public view override returns (uint256) {
        return votingPeriod;
    }

    function proposalThreshold() public view override returns (uint256) {
        return proposalThreshold;
    }

    function setVotingDelay(uint256 _delay) public onlyOwner {
        require(_delay >= 1 hours && _delay <= 30 days, "Invalid delay");
        votingDelay = _delay;
    }

    function setVotingPeriod(uint256 _period) public onlyOwner {
        require(_period >= 1 days && _period <= 30 days, "Invalid period");
        votingPeriod = _period;
    }

    function setProposalThreshold(uint256 _threshold) public onlyOwner {
        proposalThreshold = _threshold;
    }

    function depositToTreasury() public payable {
        require(msg.value > 0, "No ETH sent");
        treasuryBalance += msg.value;
        emit TreasuryUpdated(treasuryBalance);
    }

    function withdrawTreasury(address payable to, uint256 amount) public onlyOwner {
        require(amount <= treasuryBalance, "Insufficient balance");
        treasuryBalance -= amount;
        to.transfer(amount);
    }

    function verifyProposer(address proposer, bool status) public onlyOwner {
        verifiedProposers[proposer] = status;
        emit ProposerVerified(proposer, status);
    }

    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    ) public override returns (uint256) {
        uint256 proposalId = super.propose(targets, values, calldatas, description);
        proposalInfo[proposalId].description = description;
        return proposalId;
    }

    function proposeTreasury(
        address payable target,
        uint256 amount,
        string memory description
    ) public returns (uint256) {
        require(
            token.balanceOf(msg.sender) >= proposalThreshold ||
            verifiedProposers[msg.sender],
            "Insufficient voting power"
        );
        require(amount <= treasuryBalance, "Insufficient treasury");
        
        bytes memory data = abi.encodeWithSignature(
            "withdrawTreasury(address,uint256)",
            target,
            amount
        );
        
        address[] memory targets = new address[](1);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        
        targets[0] = address(this);
        values[0] = 0;
        calldatas[0] = data;
        
        uint256 proposalId = propose(targets, values, calldatas, description);
        
        proposalInfo[proposalId].isTreasuryProposal = true;
        proposalInfo[proposalId].targetAmount = amount;
        proposalInfo[proposalId].target = target;
        
        return proposalId;
    }

    function executeProposal(uint256 proposalId) public {
        ProposalInfo memory info = proposalInfo[proposalId];
        require(info.isTreasuryProposal, "Not a treasury proposal");
        require(info.target != address(0), "Invalid target");
        
        _execute(
            proposalId,
            info.target,
            info.targetAmount,
            ""
        );
        
        emit ProposalExecuted(proposalId);
    }

    function execute(uint256 proposalId) public override returns (uint256) {
        uint256 result = super.execute(proposalId);
        emit ProposalExecuted(proposalId);
        return result;
    }

    function cancel(uint256 proposalId) public override {
        super.cancel(proposalId);
    }

    function state(uint256 proposalId) public view override(
        Governor,
        GovernorTimelockControl
    ) returns (ProposalState) {
        return super.state(proposalId);
    }

    function proposalNeedsQueuing(uint256 proposalId) internal view override(
        Governor,
        GovernorTimelockControl
    ) returns (bool) {
        return super.proposalNeedsQueuing(proposalId);
    }

    function _queueOperations(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(
        Governor,
        GovernorTimelockControl
    ) {
        super._queueOperations(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _executeOperations(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(
        Governor,
        GovernorTimelockControl
    ) {
        super._executeOperations(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(
        Governor,
        GovernorTimelockControl
    ) returns (uint256) {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    function getVotes(address account, uint256 blockNumber) public view override returns (uint256) {
        return super.getVotes(account, blockNumber);
    }

    function getProposalInfo(uint256 proposalId) public view returns (ProposalInfo memory) {
        return proposalInfo[proposalId];
    }

    function getTreasuryBalance() public view returns (uint256) {
        return treasuryBalance;
    }
}
