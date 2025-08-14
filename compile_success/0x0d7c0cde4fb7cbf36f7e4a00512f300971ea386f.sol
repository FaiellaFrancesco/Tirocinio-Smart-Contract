// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract VitalikWorld {
    string public constant name = "VitalikWorld";
    string public constant symbol = "VW";
    uint8 public constant decimals = 18;

    uint256 public totalSupply;

    mapping(address => uint256) public balances;
    mapping(address => mapping(address => uint256)) public authorizations;

    event Transfer(address indexed sender, address indexed recipient, uint256 amount);
    event Approval(address indexed holder, address indexed spender, uint256 amount);

    constructor() {
        uint256 supply = 10_000_000_000 * (10 ** uint256(decimals));
        totalSupply = supply;
        balances[msg.sender] = supply;
        emit Transfer(address(0), msg.sender, supply);
    }

    function transfer(address recipient, uint256 amount) external returns (bool) {
        address sender = msg.sender;
        require(recipient != address(0), "Invalid recipient");
        require(balances[sender] >= amount, "Not enough balance");

        balances[sender] -= amount;
        balances[recipient] += amount;

        emit Transfer(sender, recipient, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        address owner = msg.sender;
        require(spender != address(0), "Invalid spender");

        authorizations[owner][spender] = amount;
        emit Approval(owner, spender, amount);
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool) {
        address caller = msg.sender;

        require(recipient != address(0), "Invalid recipient");
        require(balances[sender] >= amount, "Not enough balance");
        require(authorizations[sender][caller] >= amount, "Allowance exceeded");

        balances[sender] -= amount;
        balances[recipient] += amount;
        authorizations[sender][caller] -= amount;

        emit Transfer(sender, recipient, amount);
        return true;
    }
}