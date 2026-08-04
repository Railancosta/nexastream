// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract NFTMarketplace is Ownable, ReentrancyGuard {
    struct Listing {
        address seller;
        uint256 price;
        bool active;
    }

    struct Offer {
        address offerer;
        uint256 price;
        bool active;
    }

    // NFT contract address
    address public nftContract;
    
    // Platform fee recipient
    address public feeRecipient;
    
    // Platform fee percentage (in basis points)
    uint256 public platformFee = 250; // 2.5%
    
    // Listings mapping: tokenId => Listing
    mapping(address => mapping(uint256 => Listing)) public listings;
    
    // Offers mapping: tokenId => Offer[]
    mapping(address => mapping(uint256 => Offer[])) public offers;
    
    // Auction state
    struct Auction {
        address seller;
        uint256 startPrice;
        uint256 highestBid;
        address highestBidder;
        uint256 endTime;
        bool active;
    }
    mapping(address => mapping(uint256 => Auction)) public auctions;
    
    // Transaction history
    event ItemListed(
        address indexed nftAddress,
        uint256 indexed tokenId,
        address indexed seller,
        uint256 price
    );
    
    event ItemSold(
        address indexed nftAddress,
        uint256 indexed tokenId,
        address indexed seller,
        address buyer,
        uint256 price
    );
    
    event ItemUnlisted(
        address indexed nftAddress,
        uint256 indexed tokenId
    );
    
    event OfferMade(
        address indexed nftAddress,
        uint256 indexed tokenId,
        address indexed offerer,
        uint256 price
    );
    
    event AuctionStarted(
        address indexed nftAddress,
        uint256 indexed tokenId,
        address indexed seller,
        uint256 startPrice,
        uint256 endTime
    );
    
    event BidPlaced(
        address indexed nftAddress,
        uint256 indexed tokenId,
        address indexed bidder,
        uint256 amount
    );
    
    event AuctionEnded(
        address indexed nftAddress,
        uint256 indexed tokenId,
        address indexed winner,
        uint256 finalPrice
    );

    constructor(address initialOwner) Ownable(initialOwner) {
        feeRecipient = initialOwner;
    }

    function setNFTContract(address _nftContract) public onlyOwner {
        nftContract = _nftContract;
    }

    function setFeeRecipient(address _feeRecipient) public onlyOwner {
        feeRecipient = _feeRecipient;
    }

    function setPlatformFee(uint256 _fee) public onlyOwner {
        require(_fee <= 1000, "Fee cannot exceed 10%");
        platformFee = _fee;
    }

    function listItem(
        address nftAddress,
        uint256 tokenId,
        uint256 price
    ) public nonReentrant {
        require(price > 0, "Price must be greater than 0");
        
        IERC721 nft = IERC721(nftAddress);
        require(nft.ownerOf(tokenId) == msg.sender, "Not the owner");
        require(
            nft.getApproved(tokenId) == address(this) || 
            nft.isApprovedForAll(msg.sender, address(this)),
            "Not approved for marketplace"
        );
        
        listings[nftAddress][tokenId] = Listing({
            seller: msg.sender,
            price: price,
            active: true
        });
        
        emit ItemListed(nftAddress, tokenId, msg.sender, price);
    }

    function buyItem(address nftAddress, uint256 tokenId) public payable nonReentrant {
        Listing memory listing = listings[nftAddress][tokenId];
        require(listing.active, "Item not listed");
        require(msg.value >= listing.price, "Insufficient payment");
        
        uint256 fee = (listing.price * platformFee) / 10000;
        uint256 sellerAmount = listing.price - fee;
        
        IERC721(nftAddress).safeTransferFrom(
            listing.seller, 
            msg.sender, 
            tokenId
        );
        
        payable(listing.seller).transfer(sellerAmount);
        payable(feeRecipient).transfer(fee);
        
        // Refund excess payment
        if (msg.value > listing.price) {
            payable(msg.sender).transfer(msg.value - listing.price);
        }
        
        emit ItemSold(nftAddress, tokenId, listing.seller, msg.sender, listing.price);
        
        delete listings[nftAddress][tokenId];
    }

    function unlistItem(address nftAddress, uint256 tokenId) public nonReentrant {
        Listing storage listing = listings[nftAddress][tokenId];
        require(listing.seller == msg.sender, "Not the seller");
        
        listing.active = false;
        emit ItemUnlisted(nftAddress, tokenId);
        
        delete listings[nftAddress][tokenId];
    }

    function makeOffer(
        address nftAddress,
        uint256 tokenId
    ) public payable nonReentrant {
        require(msg.value > 0, "Offer must include payment");
        
        offers[nftAddress][tokenId].push(Offer({
            offerer: msg.sender,
            price: msg.value,
            active: true
        }));
        
        emit OfferMade(nftAddress, tokenId, msg.sender, msg.value);
    }

    function acceptOffer(
        address nftAddress,
        uint256 tokenId,
        uint256 offerIndex
    ) public nonReentrant {
        Offer storage offer = offers[nftAddress][tokenId][offerIndex];
        require(offer.active, "Offer not active");
        require(offer.offerer != msg.sender, "Cannot accept own offer");
        
        IERC721 nft = IERC721(nftAddress);
        require(nft.ownerOf(tokenId) == msg.sender, "Not the owner");
        
        uint256 fee = (offer.price * platformFee) / 10000;
        uint256 sellerAmount = offer.price - fee;
        
        nft.safeTransferFrom(msg.sender, offer.offerer, tokenId);
        
        payable(msg.sender).transfer(sellerAmount);
        payable(feeRecipient).transfer(fee);
        
        emit ItemSold(nftAddress, tokenId, msg.sender, offer.offerer, offer.price);
        
        offer.active = false;
    }

    function startAuction(
        address nftAddress,
        uint256 tokenId,
        uint256 startPrice,
        uint256 duration
    ) public nonReentrant {
        require(duration >= 1 hours && duration <= 7 days, "Invalid duration");
        
        IERC721 nft = IERC721(nftAddress);
        require(nft.ownerOf(tokenId) == msg.sender, "Not the owner");
        require(
            nft.getApproved(tokenId) == address(this) || 
            nft.isApprovedForAll(msg.sender, address(this)),
            "Not approved for marketplace"
        );
        
        auctions[nftAddress][tokenId] = Auction({
            seller: msg.sender,
            startPrice: startPrice,
            highestBid: 0,
            highestBidder: address(0),
            endTime: block.timestamp + duration,
            active: true
        });
        
        emit AuctionStarted(nftAddress, tokenId, msg.sender, startPrice, block.timestamp + duration);
    }

    function placeBid(address nftAddress, uint256 tokenId) public payable nonReentrant {
        Auction storage auction = auctions[nftAddress][tokenId];
        require(auction.active, "Auction not active");
        require(block.timestamp < auction.endTime, "Auction ended");
        require(msg.value > auction.highestBid, "Bid too low");
        require(msg.value >= auction.startPrice, "Bid below start price");
        
        // Return previous highest bid
        if (auction.highestBidder != address(0)) {
            payable(auction.highestBidder).transfer(auction.highestBid);
        }
        
        auction.highestBid = msg.value;
        auction.highestBidder = msg.sender;
        
        emit BidPlaced(nftAddress, tokenId, msg.sender, msg.value);
    }

    function endAuction(address nftAddress, uint256 tokenId) public nonReentrant {
        Auction storage auction = auctions[nftAddress][tokenId];
        require(auction.active, "Auction not active");
        require(block.timestamp >= auction.endTime, "Auction not ended");
        
        auction.active = false;
        
        if (auction.highestBidder != address(0)) {
            IERC721(nftAddress).safeTransferFrom(
                auction.seller,
                auction.highestBidder,
                tokenId
            );
            
            uint256 fee = (auction.highestBid * platformFee) / 10000;
            uint256 sellerAmount = auction.highestBid - fee;
            
            payable(auction.seller).transfer(sellerAmount);
            payable(feeRecipient).transfer(fee);
            
            emit AuctionEnded(nftAddress, tokenId, auction.highestBidder, auction.highestBid);
        } else {
            emit AuctionEnded(nftAddress, tokenId, address(0), 0);
        }
    }

    function getActiveListings(address nftAddress) public view returns (Listing[] memory) {
        // This is a simplified version - in production, you'd track active listings separately
        Listing[] memory emptyListings = new Listing[](0);
        return emptyListings;
    }

    function getOffers(address nftAddress, uint256 tokenId) public view returns (Offer[] memory) {
        return offers[nftAddress][tokenId];
    }

    function getAuction(address nftAddress, uint256 tokenId) public view returns (Auction memory) {
        return auctions[nftAddress][tokenId];
    }
}
