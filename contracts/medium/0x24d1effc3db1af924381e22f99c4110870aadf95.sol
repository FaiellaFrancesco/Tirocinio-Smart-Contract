// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Ownable contract
abstract contract Ownable {
    address private _owner;
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    constructor() {
        _transferOwnership(msg.sender);
    }
    function owner() public view virtual returns (address) {
        return _owner;
    }
    modifier onlyOwner() {
        require(owner() == msg.sender, "Ownable: caller is not the owner");
        _;
    }
    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        _transferOwnership(newOwner);
    }
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}

contract NeuroXOracle is Ownable {
    mapping(address => uint256) public referralRewards;
    mapping(address => uint256) public miningRewards;
    mapping(address => uint256) public nodeRewards;
    mapping(address => uint256) public stakingRewards;
    mapping(address => uint8) public walletScores;

    uint256 public autoBurnAmount = 0;
    uint256 public transferFeeBase = 100; // 1%

    function setReferralReward(address user, uint256 amount) external onlyOwner {
        referralRewards[user] = amount;
    }

    function setMiningReward(address user, uint256 amount) external onlyOwner {
        miningRewards[user] = amount;
    }

    function setNodeReward(address user, uint256 amount) external onlyOwner {
        nodeRewards[user] = amount;
    }

    function setStakingReward(address user, uint256 amount) external onlyOwner {
        stakingRewards[user] = amount;
    }

    function setWalletScore(address user, uint8 score) external onlyOwner {
        walletScores[user] = score;
    }

    function setAutoBurnAmount(uint256 amount) external onlyOwner {
        autoBurnAmount = amount;
    }

    function setTransferFeeBase(uint256 fee) external onlyOwner {
        transferFeeBase = fee;
    }

    function getReferralReward(address user) external view returns (uint256) {
        return referralRewards[user];
    }

    function getMiningReward(address user) external view returns (uint256) {
        return miningRewards[user];
    }

    function getNodeReward(address user) external view returns (uint256) {
        return nodeRewards[user];
    }

    function getStakingReward(address user) external view returns (uint256) {
        return stakingRewards[user];
    }

    function getWalletScore(address user) external view returns (uint8) {
        return walletScores[user];
    }

    function getAutoBurnAmount() external view returns (uint256) {
        return autoBurnAmount;
    }

    function getTransferFee(address from, address to, uint256 amount) external view returns (uint256) {
        uint8 score = walletScores[from];
        uint256 dynamicFee = (amount * (transferFeeBase + score)) / 10000;
        return dynamicFee;
    }

    function canMint(address to, uint256 amount) external pure returns (bool) {
        return true;
    }

    function isWhale(address from, address to, uint256 amount) external pure returns (bool) {
        return amount > 1_000_000 * 10 ** 18;
    }

    function logTransfer(address from, address to, uint256 amount) external pure {}

    function getFounderAllocation() external pure returns (uint256) {
        return 200_000_000 * 10 ** 18;
    }

    function getDailyMintLimit() external pure returns (uint256) {
        return 30_000_000 * 10 ** 18;
    }
}