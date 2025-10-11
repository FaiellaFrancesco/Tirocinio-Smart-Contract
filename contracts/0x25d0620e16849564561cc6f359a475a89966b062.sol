// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }
}

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract RIGGED is Context, IERC20 {
    string public constant name = "RIGGED";
    string public constant symbol = "RIGGED";
    uint8 public constant decimals = 18;

    uint256 private _totalSupply = 1_000_000_000 * 10**uint256(decimals);

    address public owner;
    address public devWallet = 0x8f21E0fCA90077608e22531BF42DBbD5e99c8125;

    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    constructor() {
        owner = _msgSender();

        uint256 devAmount = (_totalSupply * 15) / 100;  // 15%
        uint256 lpAmount = _totalSupply - devAmount;    // 85%

        _balances[devWallet] = devAmount;
        _balances[owner] = lpAmount;

        emit Transfer(address(0), devWallet, devAmount);
        emit Transfer(address(0), owner, lpAmount);
    }

    function totalSupply() public view override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) public view override returns (uint256) {
        return _balances[account];
    }

    function transfer(address recipient, uint256 amount) public override returns (bool) {
        _transfer(_msgSender(), recipient, amount);
        return true;
    }

    function allowance(address ownerAddr, address spender) public view override returns (uint256) {
        return _allowances[ownerAddr][spender];
    }

    function approve(address spender, uint256 amount) public override returns (bool) {
        _approve(_msgSender(), spender, amount);
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount) public override returns (bool) {
        _transfer(sender, recipient, amount);
        _approve(sender, _msgSender(), _allowances[sender][_msgSender()] - amount);
        return true;
    }

    function _approve(address ownerAddr, address spender, uint256 amount) private {
        require(ownerAddr != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");

        _allowances[ownerAddr][spender] = amount;
        emit Approval(ownerAddr, spender, amount);
    }

    function _transfer(address sender, address recipient, uint256 amount) private {
        require(sender != address(0), "ERC20: transfer from zero");
        require(recipient != address(0), "ERC20: transfer to zero");
        require(_balances[sender] >= amount, "ERC20: insufficient balance");

        uint256 fee = amount / 100;  // 1% fee
        uint256 amountAfterFee = amount - fee;

        _balances[sender] -= amount;
        _balances[recipient] += amountAfterFee;
        _balances[devWallet] += fee;

        emit Transfer(sender, recipient, amountAfterFee);
        emit Transfer(sender, devWallet, fee);
    }

    function renounceOwnership() public {
        require(_msgSender() == owner, "Only owner can renounce");
        owner = address(0);
    }
}