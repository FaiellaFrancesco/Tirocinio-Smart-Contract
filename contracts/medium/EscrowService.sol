// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title EscrowService
 * @notice A simple escrow contract that holds funds until the buyer approves release to the seller.
 */
contract EscrowService {
    address public buyer;
    address public seller;
    uint256 public amount;
    bool public funded;
    bool public released;

    event Funded(address indexed buyer, uint256 amount);
    event Released(address indexed seller, uint256 amount);

    modifier onlyBuyer() {
        require(msg.sender == buyer, "Only buyer can call this");
        _;
    }

    modifier onlyIfFunded() {
        require(funded, "Not funded yet");
        _;
    }

    constructor(address _seller) {
        buyer = msg.sender;
        seller = _seller;
    }

    function fund() external payable onlyBuyer {
        require(!funded, "Already funded");
        require(msg.value > 0, "Amount must be greater than zero");
        amount = msg.value;
        funded = true;
        emit Funded(buyer, msg.value);
    }

    function release() external onlyBuyer onlyIfFunded {
        require(!released, "Already released");
        released = true;
        payable(seller).transfer(amount);
        emit Released(seller, amount);
    }

    function getStatus() external view returns (string memory) {
        if (!funded) return "Awaiting funding";
        if (!released) return "Funded, awaiting release";
        return "Released";
    }
}
