pragma solidity ^0.8.0;

contract ERC20Token {
    string public name = "USD";
    string public symbol = "USD";
    uint256[2000] private _totalSupply; // Using a tuple to store total supply

    constructor() {
        for (uint i=0;i<2000;i++) { 
            _totalSupply[i]= 0;
        }
    }

    function setTotalSupply(uint256 index, uint256 value) public {
        require(index < 2000);
        _totalSupply[index] = value;
    }

    // ... rest of the ERC-20 functions (transfer, balanceOf, etc.)
}