// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract AIblessed {
    string public name = "AIblessed";
    string public symbol = "AIB";
    uint8 public decimals = 18;
    uint256 public totalSupply = 1_000_000 * 10**uint256(decimals);

    mapping(address => uint256) public balanceOf;

    event Transfer(address indexed from, address indexed to, uint256 value);

    constructor() {
        balanceOf[msg.sender] = totalSupply;
    }

    function transfer(address to, uint256 value) public returns (bool success) {
        require(balanceOf[msg.sender] >= value, "Insufficient balance");
        balanceOf[msg.sender] -= value;
        balanceOf[to] += value;
        emit Transfer(msg.sender, to, value);
        return true;
    }
}