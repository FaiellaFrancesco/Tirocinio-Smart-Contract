// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title DonationRegistry
 * @notice This contract allows users to donate Ether and keeps track of the total amount donated by each address.
 * Only the owner can withdraw the collected funds.
 */
contract DonationRegistry {
    address public owner;
    mapping(address => uint256) private donations;

    event DonationReceived(address indexed donor, uint256 amount);
    event FundsWithdrawn(address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Donate Ether to the contract. The amount is added to the sender's total donations.
     */
    function donate() external payable {
        require(msg.value > 0, "Donation must be greater than 0");
        donations[msg.sender] += msg.value;
        emit DonationReceived(msg.sender, msg.value);
    }

    /**
     * @notice Returns the total amount donated by a specific address.
     * @param donor The address to query.
     */
    function getDonationTotal(address donor) external view returns (uint256) {
        return donations[donor];
    }

    /**
     * @notice Withdraw all collected funds to the owner's address.
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        payable(owner).transfer(balance);
        emit FundsWithdrawn(owner, balance);
    }

    // Allow contract to receive Ether directly
    receive() external payable {
        require(msg.value > 0, "Donation must be greater than 0");
        donations[msg.sender] += msg.value;
        emit DonationReceived(msg.sender, msg.value);
    }
}