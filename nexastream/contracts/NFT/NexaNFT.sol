// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract NexaNFT is ERC721, ERC721URIStorage, ERC721Burnable, Ownable {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;
    
    // Royalty percentage (in basis points, 100 = 1%)
    uint256 public royaltyPercentage = 250; // 2.5%
    
    // Platform fee percentage
    uint256 public platformFeePercentage = 250; // 2.5%
    
    // Creator royalties mapping
    mapping(uint256 => address) public tokenCreators;
    mapping(uint256 => uint256) public tokenRoyalties;
    
    // IPFS metadata base URL
    string public baseURI = "ipfs://QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco/";
    
    // Verified creators
    mapping(address => bool) public verifiedCreators;
    
    event NFTMinted(uint256 indexed tokenId, address indexed creator, string uri);
    event NFTTransferred(uint256 indexed tokenId, address indexed from, address indexed to);
    event RoyaltyUpdated(uint256 indexed tokenId, uint256 newRoyalty);
    event CreatorVerified(address indexed creator, bool status);

    constructor(address initialOwner) ERC721("NexaStream NFT", "NXNFT") Ownable(initialOwner) {}

    function mintNFT(address to, string memory uri, uint256 royalty) public returns (uint256) {
        require(bytes(uri).length > 0, "URI cannot be empty");
        require(royalty <= 1000, "Royalty cannot exceed 10%");
        
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        
        tokenCreators[tokenId] = msg.sender;
        tokenRoyalties[tokenId] = royalty;
        
        emit NFTMinted(tokenId, msg.sender, uri);
        
        return tokenId;
    }

    function mintVerifiedNFT(address to, string memory uri, uint256 royalty) public returns (uint256) {
        require(verifiedCreators[msg.sender], "Caller is not a verified creator");
        return mintNFT(to, uri, royalty);
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function setRoyaltyPercentage(uint256 _percentage) public onlyOwner {
        require(_percentage <= 1000, "Royalty cannot exceed 10%");
        royaltyPercentage = _percentage;
    }

    function setPlatformFee(uint256 _fee) public onlyOwner {
        require(_fee <= 1000, "Fee cannot exceed 10%");
        platformFeePercentage = _fee;
    }

    function setBaseURI(string memory _newBaseURI) public onlyOwner {
        baseURI = _newBaseURI;
    }

    function verifyCreator(address creator, bool status) public onlyOwner {
        verifiedCreators[creator] = status;
        emit CreatorVerified(creator, status);
    }

    function getNFTInfo(uint256 tokenId) public view returns (
        address creator,
        uint256 royalty,
        string memory uri
    ) {
        require(_exists(tokenId), "NFT does not exist");
        return (
            tokenCreators[tokenId],
            tokenRoyalties[tokenId],
            tokenURI(tokenId)
        );
    }

    function calculateFees(uint256 price) public view returns (
        uint256 platformFee,
        uint256 creatorRoyalty
    ) {
        platformFee = (price * platformFeePercentage) / 10000;
        creatorRoyalty = (price * royaltyPercentage) / 10000;
    }

    function getTokenRoyalty(uint256 tokenId) public view returns (uint256) {
        require(_exists(tokenId), "NFT does not exist");
        return tokenRoyalties[tokenId];
    }

    function getCreatorOfToken(uint256 tokenId) public view returns (address) {
        require(_exists(tokenId), "NFT does not exist");
        return tokenCreators[tokenId];
    }

    function isVerified(address creator) public view returns (bool) {
        return verifiedCreators[creator];
    }
}
