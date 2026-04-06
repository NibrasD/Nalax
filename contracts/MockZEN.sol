// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title MockZEN
 * @notice Mock ERC-20 token for local testing of Nalax protocol (VeilBid).
 *         Simulates Horizen ZEN token (0xf43eB8De897Fbc7F2502483B2Bef7Bb9EA179229).
 * @dev Only for testing - use real ZEN address in production deployments.
 *
 * PRODUCTION NOTE: In production, use the official ZEN ERC-20 address:
 *   Mainnet: 0xf43eB8De897Fbc7F2502483B2Bef7Bb9EA179229
 *   Testnet: Check Horizen documentation for current testnet ZEN address
 *
 * @author Nalax - Nalax Protocol
 */
contract MockZEN {
    // =========================================================================
    // State Variables
    // =========================================================================

    string public constant name = "Horizen ZEN (Mock)";
    string public constant symbol = "ZEN";
    uint8 public constant decimals = 18;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    // =========================================================================
    // Events
    // =========================================================================

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address indexed to, uint256 amount);
    event Burn(address indexed from, uint256 amount);

    // =========================================================================
    // Errors
    // =========================================================================

    error MockZEN__ZeroAddress();
    error MockZEN__InsufficientBalance();
    error MockZEN__InsufficientAllowance();
    error MockZEN__ZeroValue();
    error MockZEN__MintToZeroAddress();
    error MockZEN__BurnExceedsBalance();

    // =========================================================================
    // Constructor
    // =========================================================================

    /**
     * @notice Initializes MockZEN with an initial mint to deployer.
     * @param initialSupply Initial tokens to mint (in wei units, 18 decimals).
     */
    constructor(uint256 initialSupply) {
        if (initialSupply > 0) {
            _mint(msg.sender, initialSupply);
        }
    }

    // =========================================================================
    // Public Functions
    // =========================================================================


    /**
     * @notice Transfers tokens to a specified address.
     * @param to The recipient address.
     * @param amount The number of tokens to transfer.
     * @return success Whether the transfer succeeded.
     */
    function transfer(address to, uint256 amount) external returns (bool success) {
        if (to == address(0)) revert MockZEN__ZeroAddress();
        if (amount == 0) revert MockZEN__ZeroValue();
        if (balanceOf[msg.sender] < amount) revert MockZEN__InsufficientBalance();

        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    /**
     * @notice Approves a spender to transfer tokens on behalf of the caller.
     * @param spender The address authorized to spend.
     * @param amount The maximum amount the spender can transfer.
     * @return success Whether the approval succeeded.
     */
    function approve(address spender, uint256 amount) external returns (bool success) {
        if (spender == address(0)) revert MockZEN__ZeroAddress();

        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    /**
     * @notice Transfers tokens from one address to another using allowance.
     * @param from The source address.
     * @param to The destination address.
     * @param amount The number of tokens to transfer.
     * @return success Whether the transfer succeeded.
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool success) {
        if (from == address(0) || to == address(0)) revert MockZEN__ZeroAddress();
        if (amount == 0) revert MockZEN__ZeroValue();
        if (balanceOf[from] < amount) revert MockZEN__InsufficientBalance();
        if (allowance[from][msg.sender] < amount) revert MockZEN__InsufficientAllowance();

        // Reduce allowance (use unchecked to avoid double spending with USDT-style tokens)
        uint256 currentAllowance = allowance[from][msg.sender];
        if (currentAllowance != type(uint256).max) {
            allowance[from][msg.sender] = currentAllowance - amount;
        }

        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }

    // =========================================================================
    // Internal Functions
    // =========================================================================

    /**
     * @notice Mints new tokens to an address.
     * @param to The recipient of the minted tokens.
     * @param amount The number of tokens to mint.
     */
    function _mint(address to, uint256 amount) internal {
        if (to == address(0)) revert MockZEN__MintToZeroAddress();

        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
        emit Mint(to, amount);
    }

    /**
     * @notice Burns tokens from an address.
     * @param from The address to burn tokens from.
     * @param amount The number of tokens to burn.
     */
    function _burn(address from, uint256 amount) internal {
        if (balanceOf[from] < amount) revert MockZEN__BurnExceedsBalance();

        balanceOf[from] -= amount;
        totalSupply -= amount;
        emit Transfer(from, address(0), amount);
        emit Burn(from, amount);
    }
}
