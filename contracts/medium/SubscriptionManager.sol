// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title SubscriptionManager
 * @notice This contract allows users to subscribe for a period of time by paying Ether. The owner can manage subscription price and duration.
 */
contract SubscriptionManager {
    address public owner;
    uint256 public subscriptionPrice;
    uint256 public subscriptionDuration;

    mapping(address => uint256) private subscriptions;

    event Subscribed(address indexed user, uint256 expiresAt);
    event ParametersUpdated(uint256 newPrice, uint256 newDuration);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }

    constructor(uint256 _price, uint256 _duration) {
        owner = msg.sender;
        subscriptionPrice = _price;
        subscriptionDuration = _duration;
    }

    function subscribe() external payable {
        require(msg.value == subscriptionPrice, "Incorrect payment amount");

        uint256 newExpiry = block.timestamp > subscriptions[msg.sender]
            ? block.timestamp + subscriptionDuration
            : subscriptions[msg.sender] + subscriptionDuration;

        subscriptions[msg.sender] = newExpiry;

        emit Subscribed(msg.sender, newExpiry);
    }

    function updateParameters(uint256 _price, uint256 _duration) external onlyOwner {
        subscriptionPrice = _price;
        subscriptionDuration = _duration;
        emit ParametersUpdated(_price, _duration);
    }

    function isSubscribed(address user) external view returns (bool) {
        return subscriptions[user] >= block.timestamp;
    }

    function getExpiry(address user) external view returns (uint256) {
        return subscriptions[user];
    }

    function withdraw() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }

    receive() external payable {
        revert("Use subscribe() to make a payment");
    }
}
