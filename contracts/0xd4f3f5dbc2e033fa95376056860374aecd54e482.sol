// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
}

contract Gunthy {
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    function airdrop(address tokenAddress, address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Invalid recipient");
        require(tokenAddress != address(0), "Invalid token address");

        IERC20 token = IERC20(tokenAddress);
        require(token.transfer(to, amount), "Transfer failed");
    }
}