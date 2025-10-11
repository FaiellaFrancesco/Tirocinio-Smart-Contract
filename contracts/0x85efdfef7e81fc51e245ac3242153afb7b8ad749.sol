// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IERC20 {
    function totalSupply() external view returns (uint256);

    function balanceOf(address account) external view returns (uint256);

    function transfer(address recipient, uint256 amount) external returns (bool);

    function allowance(address owner, address spender) external view returns (uint256);

    function approve(address spender, uint256 amount) external returns (bool);

    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);

    event Transfer(address indexed from, address indexed to, uint256 value);
    
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract BatchTransfer {
    address public owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice Batch transfer ERC20 tokens (using transferFrom authorized by msg.sender)
    /// @param token Address of the ERC20 token
    /// @param recipients Array of recipient addresses
    /// @param amounts Array of token amounts to transfer, corresponding to recipients
    function batchTransferTokenByTransferFrom(
        address token,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external {
        require(recipients.length == amounts.length, "Length mismatch");

        for (uint i = 0; i < recipients.length; i++) {
            require(
                IERC20(token).transferFrom(msg.sender, recipients[i], amounts[i]),
                "TransferFrom failed"
            );
        }
    }

    /// @notice Batch transfer ETH
    /// @param recipients Array of recipient addresses
    /// @param amounts Array of ETH amounts to transfer (in wei), corresponding to recipients
    function batchTransferETH(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external payable {
        require(recipients.length == amounts.length, "Length mismatch");

        uint256 total = 0;
        for (uint i = 0; i < amounts.length; i++) {
            total += amounts[i];
        }

        require(msg.value >= total, "Insufficient ETH sent");

        for (uint i = 0; i < recipients.length; i++) {
            (bool success, ) = recipients[i].call{value: amounts[i]}("");
            require(success, "ETH transfer failed");
        }

        // Refund any excess ETH to the contract owner
        uint256 remaining = msg.value - total;
        if (remaining > 0) {
            (bool refundSuccess, ) = owner.call{value: remaining}("");
            require(refundSuccess, "Refund failed");
        }
    }

    /// @notice Withdraw all ETH from the contract to the owner
    function withdrawETH() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH to withdraw");

        (bool success, ) = owner.call{value: balance}("");
        require(success, "Withdraw ETH failed");
    }

    /// @notice Withdraw all of a specified ERC20 token from the contract to the owner
    /// @param token Address of the ERC20 token
    function withdrawToken(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No token to withdraw");

        require(IERC20(token).transfer(owner, balance), "Withdraw token failed");
    }

    // Fallback function to receive ETH transfers
    receive() external payable {}
}