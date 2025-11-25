// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

// Context
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }
}

// Ownable
abstract contract Ownable is Context {
    address private _owner;
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    constructor() {
        _transferOwnership(_msgSender());
    }
    modifier onlyOwner() {
        require(owner() == _msgSender(), "Ownable: caller is not the owner");
        _;
    }
    function owner() public view virtual returns (address) {
        return _owner;
    }
    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
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

// IERC20
interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

// ERC20
contract ERC20 is Context, IERC20 {
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    uint256 private _totalSupply;
    string private _name;
    string private _symbol;

    constructor(string memory name_, string memory symbol_) {
        _name = name_;
        _symbol = symbol_;
    }

    function name() public view virtual returns (string memory) {
        return _name;
    }
    function symbol() public view virtual returns (string memory) {
        return _symbol;
    }
    function decimals() public view virtual returns (uint8) {
        return 18;
    }
    function totalSupply() public view virtual override returns (uint256) {
        return _totalSupply;
    }
    function balanceOf(address account) public view virtual override returns (uint256) {
        return _balances[account];
    }
    function transfer(address to, uint256 amount) public virtual override returns (bool) {
        address owner = _msgSender();
        _transfer(owner, to, amount);
        return true;
    }
    function allowance(address owner, address spender) public view virtual override returns (uint256) {
        return _allowances[owner][spender];
    }
    function approve(address spender, uint256 amount) public virtual override returns (bool) {
        address owner = _msgSender();
        _approve(owner, spender, amount);
        return true;
    }
    function transferFrom(address from, address to, uint256 amount) public virtual override returns (bool) {
        address spender = _msgSender();
        _spendAllowance(from, spender, amount);
        _transfer(from, to, amount);
        return true;
    }
    function increaseAllowance(address spender, uint256 addedValue) public virtual returns (bool) {
        address owner = _msgSender();
        _approve(owner, spender, _allowances[owner][spender] + addedValue);
        return true;
    }
    function decreaseAllowance(address spender, uint256 subtractedValue) public virtual returns (bool) {
        address owner = _msgSender();
        uint256 currentAllowance = _allowances[owner][spender];
        require(currentAllowance >= subtractedValue, "ERC20: decreased allowance below zero");
        unchecked {
            _approve(owner, spender, currentAllowance - subtractedValue);
        }
        return true;
    }
    function _transfer(address from, address to, uint256 amount) internal virtual {
        require(from != address(0), "ERC20: transfer from the zero address");
        require(to != address(0), "ERC20: transfer to the zero address");

        uint256 fromBalance = _balances[from];
        require(fromBalance >= amount, "ERC20: transfer amount exceeds balance");
        unchecked {
            _balances[from] = fromBalance - amount;
            _balances[to] += amount;
        }

        emit Transfer(from, to, amount);
    }
    function _mint(address account, uint256 amount) internal virtual {
        require(account != address(0), "ERC20: mint to the zero address");

        _totalSupply += amount;
        _balances[account] += amount;
        emit Transfer(address(0), account, amount);
    }
    function _burn(address account, uint256 amount) internal virtual {
        require(account != address(0), "ERC20: burn from the zero address");

        uint256 accountBalance = _balances[account];
        require(accountBalance >= amount, "ERC20: burn amount exceeds balance");
        unchecked {
            _balances[account] = accountBalance - amount;
            _totalSupply -= amount;
        }

        emit Transfer(account, address(0), amount);
    }
    function _approve(address owner, address spender, uint256 amount) internal virtual {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }
    function _spendAllowance(address owner, address spender, uint256 amount) internal virtual {
        uint256 currentAllowance = _allowances[owner][spender];
        if (currentAllowance != type(uint256).max) {
            require(currentAllowance >= amount, "ERC20: insufficient allowance");
            unchecked {
                _approve(owner, spender, currentAllowance - amount);
            }
        }
    }
}

// CounterfeitPopStar contract
contract CounterfeitPopStar is ERC20, Ownable {
    uint256 public constant TOTAL_SUPPLY = 21_000_000 * 10 ** 18;

    address public devWallet;
    address public marketingWallet;

    uint256 public devRate = 200;
    uint256 public marketingRate = 100;
    uint256 public burnRate = 100;

    uint256 public cooldownTime = 30;
    uint256 public maxWalletPercent = 3;

    mapping(address => uint256) private lastTransferTimestamp;

    event DevWalletUpdated(address indexed newWallet);
    event MarketingWalletUpdated(address indexed newWallet);
    event DevRateUpdated(uint256 newRate);
    event MarketingRateUpdated(uint256 newRate);
    event BurnRateUpdated(uint256 newRate);
    event CooldownUpdated(uint256 cooldownSeconds);
    event MaxWalletUpdated(uint256 percent);

    constructor() ERC20("Counterfeit PopStar", "CPS") {
        devWallet = 0xfBfb727DD89997E64ec8E649187429E88b292E2e;
        marketingWallet = 0x13c2888c86E871eCCb80c4C606D3b16f66D06958;
        _mint(msg.sender, TOTAL_SUPPLY);
    }

    function _transfer(address sender, address recipient, uint256 amount) internal override {
        require(sender != address(0) && recipient != address(0), "Zero address");
        require(balanceOf(sender) >= amount, "Insufficient balance");

        if (sender != owner()) {
            require(block.timestamp - lastTransferTimestamp[sender] >= cooldownTime, "Cooldown in effect");
            lastTransferTimestamp[sender] = block.timestamp;
        }

        if (recipient != owner()) {
            uint256 maxWallet = (TOTAL_SUPPLY * maxWalletPercent) / 100;
            require(balanceOf(recipient) + amount <= maxWallet, "Exceeds max wallet limit");
        }

        uint256 devAmount = (amount * devRate) / 10000;
        uint256 marketingAmount = (amount * marketingRate) / 10000;
        uint256 burnAmount = (amount * burnRate) / 10000;
        uint256 totalFees = devAmount + marketingAmount + burnAmount;
        uint256 netAmount = amount - totalFees;

        super._transfer(sender, devWallet, devAmount);
        super._transfer(sender, marketingWallet, marketingAmount);
        super._burn(sender, burnAmount);
        super._transfer(sender, recipient, netAmount);
    }

    function setDevWallet(address _wallet) external onlyOwner {
        require(_wallet != address(0), "Zero address");
        devWallet = _wallet;
        emit DevWalletUpdated(_wallet);
    }

    function setMarketingWallet(address _wallet) external onlyOwner {
        require(_wallet != address(0), "Zero address");
        marketingWallet = _wallet;
        emit MarketingWalletUpdated(_wallet);
    }

    function setDevRate(uint256 _rate) external onlyOwner {
        require(_rate <= 1000, "Max 10%");
        devRate = _rate;
        emit DevRateUpdated(_rate);
    }

    function setMarketingRate(uint256 _rate) external onlyOwner {
        require(_rate <= 1000, "Max 10%");
        marketingRate = _rate;
        emit MarketingRateUpdated(_rate);
    }

    function setBurnRate(uint256 _rate) external onlyOwner {
        require(_rate <= 1000, "Max 10%");
        burnRate = _rate;
        emit BurnRateUpdated(_rate);
    }

    function setCooldownTime(uint256 seconds_) external onlyOwner {
        require(seconds_ <= 3600, "Max 1 hour");
        cooldownTime = seconds_;
        emit CooldownUpdated(seconds_);
    }

    function setMaxWalletPercent(uint256 percent) external onlyOwner {
        require(percent >= 1 && percent <= 100, "Must be 1% to 100%");
        maxWalletPercent = percent;
        emit MaxWalletUpdated(percent);
    }

    function getSecondsUntilNextTransfer(address user) external view returns (uint256) {
        if (block.timestamp >= lastTransferTimestamp[user] + cooldownTime) return 0;
        return (lastTransferTimestamp[user] + cooldownTime) - block.timestamp;
    }
}