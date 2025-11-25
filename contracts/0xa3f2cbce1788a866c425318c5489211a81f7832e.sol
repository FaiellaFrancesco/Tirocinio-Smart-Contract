// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract ETHPayment {

    // Mapping to store the allowances of each address
    mapping(address => mapping(address => uint256)) private _allowances;

    // Event to log the approval
    event Approval(address indexed owner, address indexed spender, uint256 value);
    // Event to log the transfer of ETH
    event Transfer(address indexed from, address indexed to, uint256 value);

    // Approve a spender to transfer a certain amount of ETH on behalf of the sender
    function approve(address spender, uint256 amount) external returns (bool) {
        require(spender != address(0), "ETHPayment: approve to the zero address");
        _allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    // Check the allowance of a spender for a given owner
    function allowance(address owner, address spender) external view returns (uint256) {
        return _allowances[owner][spender];
    }

    // Transfer ETH from one address to another if allowed
    function transfer(address to, uint256 amount) external returns (bool) {
        require(to != address(0), "ETHPayment: transfer to the zero address");
        require(address(this).balance >= amount, "ETHPayment: insufficient balance");

        payable(to).transfer(amount);
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    // Transfer ETH from an allowed spender to another address
    function transferFrom(address sender, address to, uint256 amount) external returns (bool) {
        require(sender != address(0), "ETHPayment: transfer from the zero address");
        require(to != address(0), "ETHPayment: transfer to the zero address");
        require(_allowances[sender][msg.sender] >= amount, "ETHPayment: allowance exceeded");
        require(address(this).balance >= amount, "ETHPayment: insufficient balance");

        // Deduct the allowance
        _allowances[sender][msg.sender] -= amount;

        // Transfer the ETH
        payable(to).transfer(amount);

        emit Transfer(sender, to, amount);
        return true;
    }

    // Allow the contract to receive ETH
    receive() external payable {}

    // Get the balance of the contract
    function balance() external view returns (uint256) {
        return address(this).balance;
    }
}