// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title NSTDAO - NexaStream Governance
 * @dev Decentralized Autonomous Organization for platform governance
 */

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";

contract NSTDAO is 
    Governor, 
    GovernorCountingSimple, 
    GovernorVotes, 
    GovernorVotesQuorumFraction,
    GovernorTimelockControl,
    ReentrancyGuard,
    AccessControl
{
    using SafeERC20 for IERC20;
    
    // Proposal states
    enum ProposalState {
        Pending,
        Active,
        Canceled,
        Defeated,
        Succeeded,
        Queued,
        Expired,
        Executed
    }
    
    // Proposal details
    struct ProposalDetails {
        string title;
        string description;
        uint256 proposedValue;
        address target;
        bytes callData;
        uint256 executionTime;
    }
    
    // Voting thresholds
    uint256 public proposalThreshold = 1000 * 10**18; // 1000 NST to propose
    uint256 public votingDuration = 7 days;
    uint256 public queueDuration = 2 days;
    uint256 public executionDelay = 1 days;
    
    // Quorum
    uint256 public quorumPercentage = 4; // 4% of total stake
    
    // Governor settings
    string public governanceName = "NexaStream DAO";
    uint256 public totalProposals;
    uint256 public proposalsExecuted;
    
    // Token snapshot (for voting power)
    IVotes public stakingToken;
    
    // Timelock
    TimelockController public timelock;
    
    // Proposal mappings
    mapping(uint256 => ProposalDetails) public proposalDetails;
    mapping(address => uint256) public votingPower;
    mapping(address => uint256) public delegateCount;
    
    // Events
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string title,
        string description
    );
    event VoteCast(
        address indexed voter,
        uint256 indexed proposalId,
        uint8 support,
        uint256 weight
    );
    event ProposalExecuted(uint256 indexed proposalId);
    event ProposalCanceled(uint256 indexed proposalId);
    event GovernanceParamUpdated(string param, uint256 newValue);
    
    constructor(
        IVotes _stakingToken,
        TimelockController _timelock
    ) 
        Governor("NexaStream DAO")
        GovernorCountingSimple()
        GovernorVotes(_stakingToken)
        GovernorVotesQuorumFraction(quorumPercentage)
        GovernorTimelockControl(_timelock)
    {
        stakingToken = _stakingToken;
        timelock = _timelock;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PROPOSER_ROLE, address(this));
        _grantRole(EXECUTOR_ROLE, address(0));
    }
    
    // Overrides required by Solidity
    function votingDelay() public view override returns (uint256) {
        return 1 days; // 1 day before voting starts
    }
    
    function votingPeriod() public view override returns (uint256) {
        return votingDuration;
    }
    
    function proposalThreshold() public view override returns (uint256) {
        return proposalThreshold;
    }
    
    function quorum(uint256 blockNumber) public view override returns (uint256) {
        return (stakingToken.totalSupply(blockNumber) * quorumPercentage) / 100;
    }
    
    /**
     * @dev Create a new proposal
     */
    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory title,
        string memory description
    ) public override returns (uint256) {
        // Check voting power
        uint256 weight = getVotes(msg.sender, block.number - 1);
        require(weight >= proposalThreshold, "Below proposal threshold");
        require(targets.length == values.length, "Invalid proposal");
        
        // Create proposal
        uint256 proposalId = super.propose(targets, values, calldatas, description);
        
        // Store details
        proposalDetails[proposalId] = ProposalDetails({
            title: title,
            description: description,
            proposedValue: values.length > 0 ? values[0] : 0,
            target: targets.length > 0 ? targets[0] : address(0),
            callData: calldatas.length > 0 ? calldatas[0] : bytes(""),
            executionTime: 0
        });
        
        totalProposals++;
        
        emit ProposalCreated(proposalId, msg.sender, title, description);
        
        return proposalId;
    }
    
    /**
     * @dev Execute a queued proposal
     */
    function execute(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) public payable override onlyGovernance returns (uint256) {
        uint256 proposalId = hashProposal(targets, values, calldatas, descriptionHash);
        
        ProposalState status = state(proposalId);
        require(
            status == ProposalState.Succeeded || status == ProposalState.Queued,
            "Proposal not successful"
        );
        
        // Update execution time
        proposalDetails[proposalId].executionTime = block.timestamp;
        
        uint256 id = super.execute(targets, values, calldatas, descriptionHash);
        proposalsExecuted++;
        
        emit ProposalExecuted(proposalId);
        
        return id;
    }
    
    /**
     * @dev Cast vote
     */
    function castVote(uint256 proposalId, uint8 support) public override {
        uint256 weight = getVotes(msg.sender, proposalSnapshot(proposalId));
        _castVote(proposalId, msg.sender, support, weight, "");
        
        emit VoteCast(msg.sender, proposalId, support, weight);
    }
    
    /**
     * @dev Cast vote with reason
     */
    function castVoteWithReason(
        uint256 proposalId,
        uint8 support,
        string calldata reason
    ) public override {
        uint256 weight = getVotes(msg.sender, proposalSnapshot(proposalId));
        _castVote(proposalId, msg.sender, support, weight, reason);
        
        emit VoteCast(msg.sender, proposalId, support, weight);
    }
    
    /**
     * @dev Update governance parameters
     */
    function updateProposalThreshold(uint256 newThreshold) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        proposalThreshold = newThreshold;
        emit GovernanceParamUpdated("proposalThreshold", newThreshold);
    }
    
    function updateVotingDuration(uint256 newDuration) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        votingDuration = newDuration;
        emit GovernanceParamUpdated("votingDuration", newDuration);
    }
    
    function updateQuorumPercentage(uint256 newPercentage) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(newPercentage >= 1 && newPercentage <= 20, "Invalid percentage");
        quorumPercentage = newPercentage;
        emit GovernanceParamUpdated("quorumPercentage", newPercentage);
    }
    
    /**
     * @dev Get proposal details
     */
    function getProposalDetails(uint256 proposalId) external view returns (
        string memory title,
        string memory description,
        uint256 proposedValue,
        address target,
        uint256 forVotes,
        uint256 againstVotes,
        uint256 abstainVotes,
        ProposalState state_
    ) {
        ProposalDetails storage details = proposalDetails[proposalId];
        (uint256 for, uint256 against, uint256 abstain) = proposalVotes(proposalId);
        
        return (
            details.title,
            details.description,
            details.proposedValue,
            details.target,
            for,
            against,
            abstain,
            state(proposalId)
        );
    }
    
    /**
     * @dev Get voter weight
     */
    function getVoterWeight(address voter) external view returns (uint256) {
        return getVotes(voter, block.number - 1);
    }
    
    /**
     * @dev Get governance stats
     */
    function getGovernanceStats() external view returns (
        uint256 totalProposals_,
        uint256 executedProposals,
        uint256 activeProposals,
        uint256 proposalThreshold_,
        uint256 votingDuration_,
        uint256 quorumPct
    ) {
        uint256 active;
        for (uint256 i = 0; i < totalProposals; i++) {
            if (state(i + 1) == ProposalState.Active) {
                active++;
            }
        }
        
        return (
            totalProposals,
            proposalsExecuted,
            active,
            proposalThreshold,
            votingDuration,
            quorumPercentage
        );
    }
    
    /**
     * @dev Cancel proposal (only governance)
     */
    function cancel(uint256 proposalId) public override onlyGovernance {
        super.cancel(proposalId);
        emit ProposalCanceled(proposalId);
    }
    
    /**
     * @dev Get token holder info
     */
    function getHolderInfo(address holder) external view returns (
        uint256 votingPower_,
        uint256 delegateCount_,
        bool isDelegated
    ) {
        return (
            votingPower[holder],
            delegateCount[holder],
            delegateCount[holder] > 0
        );
    }
}

// Required interfaces
interface IVotes {
    function totalSupply(uint256 blockNumber) external view returns (uint256);
    function getPastVotes(address account, uint256 blockNumber) external view returns (uint256);
}

interface TimelockController {
    function schedule(
        address target,
        uint256 value,
        bytes calldata data,
        bytes32 predecessor,
        bytes32 salt,
        uint256 delay
    ) external;
    
    function execute(
        address target,
        uint256 value,
        bytes calldata data,
        bytes32 predecessor,
        bytes32 salt
    ) external payable;
}
