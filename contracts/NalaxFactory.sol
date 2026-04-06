// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {NalaxAuction} from "./NalaxAuction.sol";
import {Groth16Verifier} from "./verifier/Groth16Verifier.sol";

/**
 * @title NalaxFactory
 * @notice Factory contract for creating and managing VeilBid auctions.
 *         Part of the Nalax Protocol.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ARCHITECTURE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *                      ┌─────────────────────┐
 *                      │   NalaxFactory      │
 *                      │   (Singleton)       │
 *                      └──────────┬──────────┘
 *                                 │ creates
 *         ┌───────────────────────┼───────────────────────┐
 *         ▼                       ▼                       ▼
 *  ┌─────────────┐        ┌─────────────┐        ┌─────────────┐
 *  │  Auction #1 │        │  Auction #2 │        │  Auction #N │
 *  │  (VeilBid)  │        │  (VeilBid)  │        │  (VeilBid)  │
 *  └─────────────┘        └─────────────┘        └─────────────┘
 *
 * @author Nalax - Nalax Protocol
 */
contract NalaxFactory is Ownable, ReentrancyGuard, Pausable {
    // =========================================================================
    // State Variables
    // =========================================================================

    address public immutable zenToken;
    address public zkVerifier;
    uint256 public protocolFeeBps;
    address public feeRecipient;
    uint256 public auctionCount;

    mapping(uint256 => address) public auctions;
    mapping(address => uint256[]) public sellerAuctions;

    uint256 public minAuctionDuration;
    uint256 public maxAuctionDuration;
    uint256 public minRevealDuration;

    // =========================================================================
    // Events
    // =========================================================================

    event AuctionCreated(
        uint256 indexed auctionId,
        address indexed auction,
        address indexed seller,
        uint256 startTime,
        uint256 endTime,
        uint256 minBid,
        uint256 timestamp
    );
    event ProtocolFeeUpdated(uint256 oldFeeBps, uint256 newFeeBps);
    event FeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);
    event DurationLimitsUpdated(uint256 minDuration, uint256 maxDuration, uint256 minReveal);
    event ZkVerifierUpdated(address indexed oldVerifier, address indexed newVerifier);

    // =========================================================================
    // Errors
    // =========================================================================

    error NalaxFactory__ZeroAddress();
    error NalaxFactory__ZeroAmount();
    error NalaxFactory__InvalidDuration();
    error NalaxFactory__InvalidFeeBps();
    error NalaxFactory__AuctionNotFound();

    // =========================================================================
    // Constructor
    // =========================================================================

    constructor(
        address _zenToken,
        address _owner,
        address _feeRecipient,
        uint256 _protocolFeeBps
    ) Ownable(_owner) {
        if (_zenToken == address(0)) revert NalaxFactory__ZeroAddress();
        if (_feeRecipient == address(0)) revert NalaxFactory__ZeroAddress();
        if (_protocolFeeBps > 1000) revert NalaxFactory__InvalidFeeBps();

        zenToken = _zenToken;
        feeRecipient = _feeRecipient;
        protocolFeeBps = _protocolFeeBps;

        minAuctionDuration = 1 minutes;
        maxAuctionDuration = 30 days;
        minRevealDuration = 1 minutes;

        zkVerifier = address(new Groth16Verifier(_owner, true));
    }

    // =========================================================================
    // View Functions
    // =========================================================================

    function getSellerAuctions(address seller) external view returns (uint256[] memory auctionIds) {
        return sellerAuctions[seller];
    }

    function getSellerAuctionCount(address seller) external view returns (uint256 count) {
        return sellerAuctions[seller].length;
    }

    function isValidAuction(address auction) external view returns (bool isValid) {
        for (uint256 i = 0; i < auctionCount; i++) {
            if (auctions[i] == auction) return true;
        }
        return false;
    }

    // =========================================================================
    // Auction Creation
    // =========================================================================

    function createAuction(
        address itemToken,
        uint256 itemId,
        uint256 startTime,
        uint256 endTime,
        uint256 revealDuration,
        uint256 minBid,
        uint256 reservePrice,
        bool antiSnipingEnabled
    ) external nonReentrant whenNotPaused returns (uint256 auctionId, address auction) {
        if (minBid == 0) revert NalaxFactory__ZeroAmount();
        if (startTime == 0) startTime = block.timestamp + 5 minutes;

        uint256 duration = endTime - startTime;
        if (duration < minAuctionDuration || duration > maxAuctionDuration) revert NalaxFactory__InvalidDuration();
        if (revealDuration < minRevealDuration) revert NalaxFactory__InvalidDuration();

        NalaxAuction newAuction = new NalaxAuction({
            _zenToken: zenToken,
            _seller: msg.sender,
            _itemToken: itemToken,
            _itemId: itemId,
            _startTime: startTime,
            _endTime: endTime,
            _revealDuration: revealDuration,
            _minBid: minBid,
            _reservePrice: reservePrice,
            _antiSnipingEnabled: antiSnipingEnabled,
            _zkVerifier: zkVerifier,
            _owner: owner()
        });

        auction = address(newAuction);
        auctionId = auctionCount;

        auctions[auctionCount] = auction;
        sellerAuctions[msg.sender].push(auctionCount);
        auctionCount++;

        emit AuctionCreated(auctionId, auction, msg.sender, startTime, endTime, minBid, block.timestamp);
    }

    // =========================================================================
    // Admin Functions
    // =========================================================================

    function setProtocolFee(uint256 _protocolFeeBps) external onlyOwner {
        if (_protocolFeeBps > 1000) revert NalaxFactory__InvalidFeeBps();
        uint256 oldFee = protocolFeeBps;
        protocolFeeBps = _protocolFeeBps;
        emit ProtocolFeeUpdated(oldFee, _protocolFeeBps);
    }

    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        if (_feeRecipient == address(0)) revert NalaxFactory__ZeroAddress();
        address oldRecipient = feeRecipient;
        feeRecipient = _feeRecipient;
        emit FeeRecipientUpdated(oldRecipient, _feeRecipient);
    }

    function setDurationLimits(uint256 _minDuration, uint256 _maxDuration, uint256 _minReveal) external onlyOwner {
        if (_minDuration >= _maxDuration) revert NalaxFactory__InvalidDuration();
        minAuctionDuration = _minDuration;
        maxAuctionDuration = _maxDuration;
        minRevealDuration = _minReveal;
        emit DurationLimitsUpdated(_minDuration, _maxDuration, _minReveal);
    }

    function setZkVerifier(address _zkVerifier) external onlyOwner {
        if (_zkVerifier == address(0)) revert NalaxFactory__ZeroAddress();
        address oldVerifier = zkVerifier;
        zkVerifier = _zkVerifier;
        emit ZkVerifierUpdated(oldVerifier, _zkVerifier);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
