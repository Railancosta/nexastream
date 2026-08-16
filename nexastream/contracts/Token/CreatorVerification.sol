// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract CreatorVerification is Ownable, ReentrancyGuard {
    // Verification levels
    enum VerificationLevel { None, Basic, Professional, Enterprise }
    
    // Creator info
    struct Creator {
        string name;
        string metadataURI; // IPFS URI with KYC documents
        VerificationLevel level;
        uint256 registrationTime;
        uint256 stakedAmount;
        bool verified;
        mapping(string => bool) contentTypes; // streaming, nft, dao, etc.
    }
    
    // Staking requirements per level
    mapping(VerificationLevel => uint256) public stakingRequirements;
    
    // Creator address to info
    mapping(address => Creator) public creators;
    
    // Verification requests queue
    struct VerificationRequest {
        address applicant;
        string name;
        string metadataURI;
        VerificationLevel requestedLevel;
        uint256 timestamp;
        bool processed;
    }
    mapping(uint256 => VerificationRequest) public verificationRequests;
    uint256 public requestCount;
    
    // Staking pool
    uint256 public stakingPool;
    
    // Content type registry
    mapping(string => bool) public registeredContentTypes;
    
    // Statistics
    uint256 public totalCreators;
    uint256 public verifiedCreatorsCount;
    
    // Events
    event CreatorRegistered(address indexed creator, string name, VerificationLevel level);
    event CreatorVerified(address indexed creator, VerificationLevel level);
    event VerificationLevelUpgraded(address indexed creator, VerificationLevel newLevel);
    event VerificationRevoked(address indexed creator);
    event Staked(address indexed creator, uint256 amount);
    event Unstaked(address indexed creator, uint256 amount);
    event ContentTypeAdded(address indexed creator, string contentType);
    event VerificationRequested(address indexed applicant, uint256 requestId);
    event ContentTypeRegistered(string indexed contentType);

    constructor(address initialOwner) Ownable(initialOwner) {
        // Set default staking requirements (in wei)
        stakingRequirements[VerificationLevel.Basic] = 0.1 ether;
        stakingRequirements[VerificationLevel.Professional] = 1 ether;
        stakingRequirements[VerificationLevel.Enterprise] = 10 ether;
        
        // Register default content types
        _registerContentType("streaming");
        _registerContentType("nft");
        _registerContentType("dao");
        _registerContentType("education");
        _registerContentType("gaming");
    }

    function _registerContentType(string memory contentType) internal {
        registeredContentTypes[contentType] = true;
        emit ContentTypeRegistered(contentType);
    }

    function registerContentType(string memory contentType) public onlyOwner {
        _registerContentType(contentType);
    }

    function requestVerification(
        string memory name,
        string memory metadataURI,
        VerificationLevel level
    ) public payable returns (uint256) {
        require(bytes(name).length > 0, "Name required");
        require(creators[msg.sender].registrationTime == 0, "Already registered");
        require(
            msg.value >= stakingRequirements[level],
            "Insufficient stake"
        );
        require(
            level != VerificationLevel.None,
            "Invalid level"
        );
        
        uint256 requestId = requestCount++;
        
        verificationRequests[requestId] = VerificationRequest({
            applicant: msg.sender,
            name: name,
            metadataURI: metadataURI,
            requestedLevel: level,
            timestamp: block.timestamp,
            processed: false
        });
        
        if (msg.value > 0) {
            stakingPool += msg.value;
            creators[msg.sender].stakedAmount += msg.value;
            emit Staked(msg.sender, msg.value);
        }
        
        emit VerificationRequested(msg.sender, requestId);
        
        return requestId;
    }

    function processVerification(
        uint256 requestId,
        bool approve,
        VerificationLevel level
    ) public onlyOwner {
        VerificationRequest storage request = verificationRequests[requestId];
        require(!request.processed, "Already processed");
        require(request.applicant != address(0), "Invalid request");
        
        request.processed = true;
        
        if (approve) {
            Creator storage creator = creators[request.applicant];
            creator.name = request.name;
            creator.metadataURI = request.metadataURI;
            creator.level = level;
            creator.registrationTime = block.timestamp;
            creator.verified = true;
            
            totalCreators++;
            verifiedCreatorsCount++;
            
            emit CreatorRegistered(request.applicant, request.name, level);
            emit CreatorVerified(request.applicant, level);
        }
    }

    function upgradeVerificationLevel(VerificationLevel newLevel) public payable {
        Creator storage creator = creators[msg.sender];
        require(creator.verified, "Not verified");
        require(
            uint256(newLevel) > uint256(creator.level),
            "Cannot downgrade"
        );
        
        uint256 additionalStake = stakingRequirements[newLevel] - creator.stakedAmount;
        require(msg.value >= additionalStake, "Insufficient stake");
        
        if (msg.value > additionalStake) {
            payable(msg.sender).transfer(msg.value - additionalStake);
        }
        
        creator.stakedAmount += additionalStake;
        creator.level = newLevel;
        stakingPool += additionalStake;
        
        emit VerificationLevelUpgraded(msg.sender, newLevel);
        emit Staked(msg.sender, additionalStake);
    }

    function revokeVerification(address creator) public onlyOwner {
        require(creators[creator].verified, "Not verified");
        
        creators[creator].verified = false;
        creators[creator].level = VerificationLevel.None;
        verifiedCreatorsCount--;
        
        emit VerificationRevoked(creator);
    }

    function addContentType(address creator, string memory contentType) public onlyOwner {
        require(creators[creator].verified, "Creator not verified");
        require(registeredContentTypes[contentType], "Content type not registered");
        creators[creator].contentTypes[contentType] = true;
        
        emit ContentTypeAdded(creator, contentType);
    }

    function updateStakingRequirement(
        VerificationLevel level,
        uint256 newRequirement
    ) public onlyOwner {
        stakingRequirements[level] = newRequirement;
    }

    function withdrawStakingPool(address payable to, uint256 amount) public onlyOwner {
        require(amount <= stakingPool, "Insufficient pool balance");
        stakingPool -= amount;
        to.transfer(amount);
    }

    function getCreatorInfo(address creator) public view returns (
        string memory name,
        VerificationLevel level,
        uint256 registrationTime,
        uint256 stakedAmount,
        bool verified
    ) {
        Creator storage c = creators[creator];
        return (
            c.name,
            c.level,
            c.registrationTime,
            c.stakedAmount,
            c.verified
        );
    }

    function getCreatorContentTypes(address creator) public view returns (string[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < bytes("streamingnftdaoeducationgaming").length; i++) {
            if (creators[creator].contentTypes["streaming"]) count++;
            if (creators[creator].contentTypes["nft"]) count++;
            if (creators[creator].contentTypes["dao"]) count++;
            if (creators[creator].contentTypes["education"]) count++;
            if (creators[creator].contentTypes["gaming"]) count++;
            break;
        }
        
        string[] memory types = new string[](count);
        uint256 index = 0;
        if (creators[creator].contentTypes["streaming"]) types[index++] = "streaming";
        if (creators[creator].contentTypes["nft"]) types[index++] = "nft";
        if (creators[creator].contentTypes["dao"]) types[index++] = "dao";
        if (creators[creator].contentTypes["education"]) types[index++] = "education";
        if (creators[creator].contentTypes["gaming"]) types[index++] = "gaming";
        
        return types;
    }

    function isVerified(address creator) public view returns (bool) {
        return creators[creator].verified;
    }

    function getVerificationLevel(address creator) public view returns (VerificationLevel) {
        return creators[creator].level;
    }

    function getStakingRequirement(VerificationLevel level) public view returns (uint256) {
        return stakingRequirements[level];
    }

    function getStats() public view returns (
        uint256 _totalCreators,
        uint256 _verifiedCreators,
        uint256 _stakingPool
    ) {
        return (totalCreators, verifiedCreatorsCount, stakingPool);
    }
}
