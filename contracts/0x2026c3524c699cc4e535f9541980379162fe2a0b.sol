// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract VitalikWorld {
    string public constant name = "VitalikWorld";
    string public constant symbol = "VW";
    uint8 public constant decimals = 18;

    uint256 private _totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor() {
        uint256 initialSupply = 100_000_000_000 * (10 ** uint256(decimals));
        _totalSupply = initialSupply;
        balanceOf[msg.sender] = initialSupply;
        emit Transfer(address(0), msg.sender, initialSupply);
    }

    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(to != address(0), "Transfer to zero address");
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");

        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;

        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        require(spender != address(0), "Approve to zero address");

        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(to != address(0), "Transfer to zero address");
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Allowance exceeded");

        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;

        emit Transfer(from, to, amount);
        return true;
    }
}