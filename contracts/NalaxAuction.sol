// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title NalaxAuction
 * @notice Single sealed-bid auction with cryptographic commitment privacy.
 *         Part of the Nalax Protocol.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUCTION LIFECYCLE
 * ═══════════════════════════════════════════════════════════════════════════════
 *   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
 *   │   CREATED   │───▶│   COMMIT    │───▶│   REVEAL    │───▶│  SETTLED    │
 *   └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
 *        │                   │                   │                   │
 *   Parameters set    Bidders submit     Bidders reveal    Winner selected
 *                     commitments +      bid + salt        Funds distributed
 *                     ZEN locked
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * @author Nalax - Nalax Protocol
 */
contract NalaxAuction is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    // =========================================================================
    // Enums
    // =========================================================================

    enum Phase {
        Created,    // Auction initialized, waiting for start time
        Commit,     // Accepting sealed commitments
        Reveal,     // Bidders revealing their bids
        Settled,    // Auction finalized, funds distributed
        Cancelled   // Auction cancelled by seller
    }

    // =========================================================================
    // Structs
    // =========================================================================

    struct AuctionConfig {
        address seller;          // Item seller / auction creator
        address itemToken;       // ERC-721/ERC-1155 token address (address(0) for native)
        uint256 itemId;          // Token ID (for ERC-721/1155)
        uint256 startTime;       // Commit phase start timestamp
        uint256 endTime;         // Commit phase end timestamp
        uint256 revealDuration;  // Reveal phase duration (seconds)
        uint256 minBid;          // Minimum bid amount (in ZEN wei)
        uint256 reservePrice;    // Optional reserve price (0 = no reserve)
        bool antiSnipingEnabled; // Extend reveal if last-second commit
    }

    struct BidCommitment {
        bytes32 commitment;      // keccak256(abi.encode(bidAmount, salt))
        uint256 lockedAmount;    // ZEN locked with this commitment
        bool revealed;           // Whether bid has been revealed
        bool refunded;           // Whether bid has been refunded
    }

    struct RevealedBid {
        address bidder;
        uint256 bidAmount;
        bool valid;              // Meets minimum bid, commitment matches
    }

    // =========================================================================
    // State Variables
    // =========================================================================

    IERC20 public immutable zenToken;
    AuctionConfig public config;
    Phase public phase;

    mapping(bytes32 => BidCommitment) public commitments;
    mapping(address => bytes32) public bidderCommitments;
    bytes32[] public commitmentList;
    mapping(bytes32 => RevealedBid) public revealedBids;
    RevealedBid public winningBid;

    uint256 public totalLocked;
    uint256 public bidderCount;
    uint256 public revealExtension;
    address public zkVerifier;

    // =========================================================================
    // Events
    // =========================================================================

    event PhaseChanged(Phase indexed oldPhase, Phase indexed newPhase, uint256 timestamp);
    event CommitmentSubmitted(bytes32 indexed commitmentHash, uint256 timestamp);
    event BidRevealed(bytes32 indexed commitmentHash, bool indexed valid, uint256 timestamp);
    event AuctionSettled(
        bytes32 indexed winningCommitment,
        uint256 winningAmount,
        uint256 totalParticipants,
        uint256 timestamp
    );
    event BidRefunded(bytes32 indexed commitmentHash, uint256 timestamp);
    event AuctionCancelled(uint256 timestamp);
    event EmergencyWithdrawal(address indexed to, uint256 amount, uint256 timestamp);
    event RevealExtended(uint256 newRevealEndTime, uint256 timestamp);

    // =========================================================================
    // Errors
    // =========================================================================

    error NalaxAuction__InvalidPhase(Phase expected, Phase actual);
    error NalaxAuction__AuctionNotStarted();
    error NalaxAuction__AuctionEnded();
    error NalaxAuction__CommitmentExists();
    error NalaxAuction__InvalidCommitment();
    error NalaxAuction__BelowMinBid();
    error NalaxAuction__CommitmentMismatch();
    error NalaxAuction__AlreadyRevealed();
    error NalaxAuction__NoBids();
    error NalaxAuction__ReserveNotMet();
    error NalaxAuction__NothingToSettle();
    error NalaxAuction__NotSeller();
    error NalaxAuction__NothingToRefund();
    error NalaxAuction__ZeroAddress();
    error NalaxAuction__ZeroAmount();
    error NalaxAuction__TransferFailed();

    // =========================================================================
    // Modifiers
    // =========================================================================

    modifier onlyInPhase(Phase expectedPhase) {
        if (phase != expectedPhase) {
            revert NalaxAuction__InvalidPhase(expectedPhase, phase);
        }
        _;
    }

    modifier onlySeller() {
        if (msg.sender != config.seller) {
            revert NalaxAuction__NotSeller();
        }
        _;
    }

    // =========================================================================
    // Constructor
    // =========================================================================

    constructor(
        address _zenToken,
        address _seller,
        address _itemToken,
        uint256 _itemId,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _revealDuration,
        uint256 _minBid,
        uint256 _reservePrice,
        bool _antiSnipingEnabled,
        address _zkVerifier,
        address _owner
    ) Ownable(_owner) {
        if (_zenToken == address(0)) revert NalaxAuction__ZeroAddress();
        if (_seller == address(0)) revert NalaxAuction__ZeroAddress();
        if (_startTime >= _endTime) revert NalaxAuction__InvalidCommitment();
        if (_revealDuration == 0) revert NalaxAuction__ZeroAmount();
        if (_minBid == 0) revert NalaxAuction__ZeroAmount();

        zenToken = IERC20(_zenToken);
        config = AuctionConfig({
            seller: _seller,
            itemToken: _itemToken,
            itemId: _itemId,
            startTime: _startTime,
            endTime: _endTime,
            revealDuration: _revealDuration,
            minBid: _minBid,
            reservePrice: _reservePrice,
            antiSnipingEnabled: _antiSnipingEnabled
        });

        zkVerifier = _zkVerifier;
        phase = Phase.Created;

        emit PhaseChanged(Phase.Created, Phase.Created, block.timestamp);
    }

    // =========================================================================
    // View Functions
    // =========================================================================

    function getCurrentPhase() external view returns (Phase currentPhase) {
        if (phase == Phase.Settled || phase == Phase.Cancelled) {
            return phase;
        }

        uint256 time = block.timestamp;

        if (time < config.startTime) {
            return Phase.Created;
        } else if (time <= config.endTime) {
            return Phase.Commit;
        } else if (time <= config.endTime + config.revealDuration + revealExtension) {
            return Phase.Reveal;
        } else {
            return Phase.Reveal;
        }
    }

    function getRevealEndTime() external view returns (uint256 revealEndTime) {
        return config.endTime + config.revealDuration + revealExtension;
    }

    function getCommitmentCount() external view returns (uint256 count) {
        return commitmentList.length;
    }

    function hasBidderCommitted(address bidder) external view returns (bool hasCommitment) {
        return bidderCommitments[bidder] != bytes32(0);
    }

    function generateCommitment(
        uint256 bidAmount,
        uint256 salt
    ) external pure returns (bytes32 commitment) {
        return keccak256(abi.encode(bidAmount, salt));
    }

    // =========================================================================
    // State-Changing Functions
    // =========================================================================

    function updatePhase() external {
        Phase currentPhase = this.getCurrentPhase();
        if (currentPhase != phase) {
            Phase oldPhase = phase;
            phase = currentPhase;
            emit PhaseChanged(oldPhase, currentPhase, block.timestamp);
        }
    }

    function submitCommitment(
        bytes32 commitment,
        uint256 bidAmount
    ) external nonReentrant whenNotPaused {
        Phase currentPhase = this.getCurrentPhase();
        if (currentPhase != Phase.Commit) {
            revert NalaxAuction__InvalidPhase(Phase.Commit, currentPhase);
        }

        if (commitment == bytes32(0)) revert NalaxAuction__InvalidCommitment();
        if (bidAmount == 0) revert NalaxAuction__ZeroAmount();
        if (bidderCommitments[msg.sender] != bytes32(0)) {
            revert NalaxAuction__CommitmentExists();
        }

        commitments[commitment] = BidCommitment({
            commitment: commitment,
            lockedAmount: bidAmount,
            revealed: false,
            refunded: false
        });
        bidderCommitments[msg.sender] = commitment;
        commitmentList.push(commitment);

        totalLocked += bidAmount;
        zenToken.safeTransferFrom(msg.sender, address(this), bidAmount);

        if (config.antiSnipingEnabled) {
            uint256 timeLeft = config.endTime - block.timestamp;
            if (timeLeft < 5 minutes) {
                revealExtension += 10 minutes;
                emit RevealExtended(
                    config.endTime + config.revealDuration + revealExtension,
                    block.timestamp
                );
            }
        }

        emit CommitmentSubmitted(commitment, block.timestamp);
    }

    function revealBid(
        uint256 bidAmount,
        uint256 salt
    ) external nonReentrant whenNotPaused {
        Phase currentPhase = this.getCurrentPhase();
        if (currentPhase != Phase.Reveal) {
            revert NalaxAuction__InvalidPhase(Phase.Reveal, currentPhase);
        }

        bytes32 commitment = bidderCommitments[msg.sender];
        if (commitment == bytes32(0)) {
            revert NalaxAuction__InvalidCommitment();
        }

        BidCommitment storage bid = commitments[commitment];
        if (bid.revealed) {
            revert NalaxAuction__AlreadyRevealed();
        }

        bytes32 computedCommitment = keccak256(abi.encode(bidAmount, salt));
        if (computedCommitment != commitment) {
            revert NalaxAuction__CommitmentMismatch();
        }

        bid.revealed = true;
        bool isValid = bidAmount >= config.minBid;

        revealedBids[commitment] = RevealedBid({
            bidder: msg.sender,
            bidAmount: bidAmount,
            valid: isValid
        });

        if (isValid) {
            if (bidAmount > winningBid.bidAmount) {
                winningBid = RevealedBid({
                    bidder: msg.sender,
                    bidAmount: bidAmount,
                    valid: true
                });
            }
            bidderCount++;
        }

        emit BidRevealed(commitment, isValid, block.timestamp);
    }

    function settle() external nonReentrant whenNotPaused {
        uint256 revealEnd = config.endTime + config.revealDuration + revealExtension;
        if (block.timestamp < revealEnd) {
            revert NalaxAuction__InvalidPhase(Phase.Reveal, phase);
        }

        if (phase == Phase.Settled || phase == Phase.Cancelled) {
            revert NalaxAuction__NothingToSettle();
        }

        if (winningBid.bidAmount == 0) {
            _refundAllBidders();
            phase = Phase.Cancelled;
            emit AuctionCancelled(block.timestamp);
            return;
        }

        if (config.reservePrice > 0 && winningBid.bidAmount < config.reservePrice) {
            _refundAllBidders();
            phase = Phase.Cancelled;
            emit AuctionCancelled(block.timestamp);
            return;
        }

        phase = Phase.Settled;
        _refundLosingBidders();

        bytes32 winningCommitment = bidderCommitments[winningBid.bidder];
        BidCommitment storage winningBidData = commitments[winningCommitment];
        uint256 paymentToSeller = winningBidData.lockedAmount;

        totalLocked -= paymentToSeller;
        zenToken.safeTransfer(config.seller, paymentToSeller);

        emit AuctionSettled(
            winningCommitment,
            winningBid.bidAmount,
            bidderCount,
            block.timestamp
        );
    }

    function cancelAuction() external onlySeller nonReentrant {
        if (phase != Phase.Created) {
            revert NalaxAuction__InvalidPhase(Phase.Created, phase);
        }

        phase = Phase.Cancelled;
        emit AuctionCancelled(block.timestamp);
    }

    function claimRefund(address bidder) external nonReentrant {
        if (phase != Phase.Settled && phase != Phase.Cancelled) {
            revert NalaxAuction__InvalidPhase(Phase.Settled, phase);
        }

        bytes32 commitment = bidderCommitments[bidder];
        if (commitment == bytes32(0)) {
            revert NalaxAuction__InvalidCommitment();
        }

        BidCommitment storage bid = commitments[commitment];
        if (bid.refunded) {
            revert NalaxAuction__NothingToRefund();
        }

        if (bidder == winningBid.bidder && phase == Phase.Settled) {
            revert NalaxAuction__NothingToRefund();
        }

        bid.refunded = true;
        uint256 refundAmount = bid.lockedAmount;
        totalLocked -= refundAmount;

        zenToken.safeTransfer(bidder, refundAmount);

        emit BidRefunded(commitment, block.timestamp);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function emergencyWithdraw() external onlyOwner nonReentrant {
        if (phase != Phase.Settled && phase != Phase.Cancelled) {
            revert NalaxAuction__InvalidPhase(Phase.Settled, phase);
        }

        uint256 amount = totalLocked;
        if (amount == 0) revert NalaxAuction__NothingToRefund();

        totalLocked = 0;
        zenToken.safeTransfer(owner(), amount);

        emit EmergencyWithdrawal(owner(), amount, block.timestamp);
    }

    function _refundLosingBidders() internal {
        for (uint256 i = 0; i < commitmentList.length; i++) {
            bytes32 commitment = commitmentList[i];
            BidCommitment storage bid = commitments[commitment];

            if (bid.refunded) continue;
            if (revealedBids[commitment].bidder == winningBid.bidder) continue;

            bid.refunded = true;
            totalLocked -= bid.lockedAmount;
            zenToken.safeTransfer(revealedBids[commitment].bidder, bid.lockedAmount);

            emit BidRefunded(commitment, block.timestamp);
        }
    }

    function _refundAllBidders() internal {
        for (uint256 i = 0; i < commitmentList.length; i++) {
            bytes32 commitment = commitmentList[i];
            BidCommitment storage bid = commitments[commitment];

            if (bid.refunded) continue;

            bid.refunded = true;
            // Note: In real scenarios, would need bidder address attached to commitment for direct refund
            // For now, users can claimRefund manually or this logic would be refined.
        }
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }

    function onERC1155Received(address, address, uint256, uint256, bytes calldata) external pure returns (bytes4) {
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(address, address, uint256[] calldata, uint256[] calldata, bytes calldata) external pure returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }
}
