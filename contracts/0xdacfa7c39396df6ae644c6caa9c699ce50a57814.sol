/*



https://x.com/moonbae_crypto/status/1926872262319190425


*/



// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Interfaces
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

interface IUniswapV2Router02 {
    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external;
    function WETH() external pure returns (address);
    function addLiquidityETH(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external payable returns (uint amountToken, uint amountETH, uint liquidity);
}

// Simplified Uniswap V2 Pair Interface
interface IUniswapV2Pair {
    function initialize(address, address) external;
    function token0() external view returns (address);
    function token1() external view returns (address);
}

// Libraries and Context
library SafeMath {
    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        require(c >= a, "SafeMath: addition overflow");
        return c;
    }

    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        return sub(a, b, "SafeMath: subtraction overflow");
    }

    function sub(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        require(b <= a, errorMessage);
        uint256 c = a - b;
        return c;
    }

    function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        if (a == 0) {
            return 0;
        }
        uint256 c = a * b;
        require(c / a == b, "SafeMath: multiplication overflow");
        return c;
    }

    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        return div(a, b, "SafeMath: division by zero");
    }

    function div(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        require(b > 0, errorMessage);
        uint256 c = a / b;
        return c;
    }
}

abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }
}

contract Ownable is Context {
    address private _owner;
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor () {
        address msgSender = _msgSender();
        _owner = msgSender;
        emit OwnershipTransferred(address(0), msgSender);
    }

    function owner() public view returns (address) {
        return _owner;
    }

    modifier onlyOwner() {
        require(_owner == _msgSender(), "Ownable: caller is not the owner");
        _;
    }

    function renounceOwnership() public virtual onlyOwner {
        emit OwnershipTransferred(_owner, address(0));
        _owner = address(0);
    }
}

// Simplified Uniswap V2 Pair Implementation
contract UniswapV2Pair {
    address public token0;
    address public token1;

    function initialize(address _token0, address _token1) external {
        require(token0 == address(0) && token1 == address(0), "Already initialized");
        token0 = _token0;
        token1 = _token1;
    }
}

contract Contract is Context, IERC20, Ownable {
    using SafeMath for uint256;

    mapping (address => uint256) private _balances;
    mapping (address => mapping (address => uint256)) private _allowances;
    mapping (address => bool) private _isExcludedFromFee;
    mapping (address => uint256) private _holderLastTransferTimestamp;

    address payable private _taxWallet;
    address private _predictedStandardPair;

    uint256 private _initialBuyTax = 21;
    uint256 private _initialSellTax = 21;
    uint256 private _finalBuyTax = 0;
    uint256 private _finalSellTax = 0;
    uint256 private _reduceBuyTaxAt = 0;
    uint256 private _reduceSellTaxAt = 18;
    uint256 private _preventSwapBefore = 3;
    uint256 private _transferTax = 0;
    uint256 private _buyCount = 0;

    uint8 private constant _decimals = 9;
    uint256 private constant _tTotal = 420690000000 * 10**_decimals;
    string private constant _name = unicode"2343224";
    string private constant _symbol = unicode"tdfg";
    uint256 public _maxTxAmount = 8413800000 * 10**_decimals;
    uint256 public _maxWalletSize = 8413800000 * 10**_decimals;
    uint256 public _taxSwapThreshold = 6413800000 * 10**_decimals;
    uint256 public _maxTaxSwap = 6413800000 * 10**_decimals;

    IUniswapV2Router02 private uniswapV2Router;
    address private uniswapV2Pair;
    bool private tradingOpen;
    bool private inSwap = false;
    bool private swapEnabled = false;
    bool private transferDelayEnabled = false;
    uint256 private sellCount = 0;
    uint256 private lastSellBlock = 0;

    event MaxTxAmountUpdated(uint256 _maxTxAmount);
    event TransferTaxUpdated(uint256 _tax);

    modifier lockTheSwap {
        inSwap = true;
        _;
        inSwap = false;
    }

    constructor () payable {
        _taxWallet = payable(_msgSender());
        _balances[address(this)] = _tTotal * 90 / 100;
        _balances[address(_msgSender())] = _tTotal * 10 / 100;
        _isExcludedFromFee[owner()] = true;
        _isExcludedFromFee[address(this)] = true;
        _isExcludedFromFee[_taxWallet] = true;

        // Precompute the standard Uniswap V2 pair address to block transfers
        address standardFactory = 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f; // Uniswap V2 factory
        address weth = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2; // WETH mainnet
        _predictedStandardPair = pairFor(standardFactory, address(this), weth);

        emit Transfer(address(0), address(this), _tTotal * 90 / 100);
        emit Transfer(address(0), address(_msgSender()), _tTotal * 10 / 100);




    }

    // Standard ERC20 functions
    function name() public pure returns (string memory) {
        return _name;
    }

    function symbol() public pure returns (string memory) {
        return _symbol;
    }

    function decimals() public pure returns (uint8) {
        return _decimals;
    }

    function totalSupply() public pure override returns (uint256) {
        return _tTotal;
    }

    function balanceOf(address account) public view override returns (uint256) {
        return _balances[account];
    }

    function transfer(address recipient, uint256 amount) public override returns (bool) {
        _transfer(_msgSender(), recipient, amount);
        return true;
    }

    function allowance(address owner, address spender) public view override returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 amount) public override returns (bool) {
        _approve(_msgSender(), spender, amount);
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount) public override returns (bool) {
        _transfer(sender, recipient, amount);
        _approve(sender, _msgSender(), _allowances[sender][_msgSender()].sub(amount, "ERC20: transfer amount exceeds allowance"));
        return true;
    }

    function _approve(address owner, address spender, uint256 amount) private {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");
        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    function _transfer(address from, address to, uint256 amount) private {
        require(from != address(0), "ERC20: transfer from the zero address");
        require(to != address(0), "ERC20: transfer to the zero address");
        require(amount > 0, "Transfer amount must be greater than zero");

        // Block transfers to/from the standard predicted pair before trading
        if (!tradingOpen && (from == _predictedStandardPair || to == _predictedStandardPair)) {
            require(from == owner() || to == owner(), "Cannot transfer to/from standard pair before trading");
        }

        uint256 taxAmount = 0;
        if (from != owner() && to != owner()) {
            if (transferDelayEnabled) {
                if (
                    to != owner() &&
                    to != address(uniswapV2Router) &&
                    to != address(uniswapV2Pair)
                ) {
                    require(
                        _holderLastTransferTimestamp[tx.origin] < block.number,
                        "_transfer:: Transfer Delay enabled. Only one purchase per block allowed."
                    );
                    _holderLastTransferTimestamp[tx.origin] = block.number;
                }
            }

            if (_buyCount == 0) {
                taxAmount = amount.mul((_buyCount > _reduceBuyTaxAt) ? _finalBuyTax : _initialBuyTax).div(100);
            }
            if (_buyCount > 0) {
                taxAmount = amount.mul(_transferTax).div(100);
            }

            if (from == uniswapV2Pair && to != address(uniswapV2Router) && !_isExcludedFromFee[to]) {
                require(amount <= _maxTxAmount, "Exceeds the _maxTxAmount.");
                require(balanceOf(to) + amount <= _maxWalletSize, "Exceeds the maxWalletSize.");
                taxAmount = amount.mul((_buyCount > _reduceBuyTaxAt) ? _finalBuyTax : _initialBuyTax).div(100);
                _buyCount++;
            }

            if (to == uniswapV2Pair && from != address(this)) {
                taxAmount = amount.mul((_buyCount > _reduceSellTaxAt) ? _finalSellTax : _initialSellTax).div(100);
            }

            uint256 contractTokenBalance = balanceOf(address(this));

            if (!inSwap && to == uniswapV2Pair && swapEnabled && contractTokenBalance > _taxSwapThreshold && _buyCount > _preventSwapBefore) {
                if (block.number > lastSellBlock) {
                    sellCount = 0;
                }

                require(sellCount < 3, "Only 3 sells per block!");

                swapTokensForEth(min(amount, min(contractTokenBalance, _maxTaxSwap)));
                uint256 contractETHBalance = address(this).balance;
                if (contractETHBalance > 0) {
                    sendETHToFee(contractETHBalance);
                }

                sellCount++;
                lastSellBlock = block.number;
            }
        }

        if (taxAmount > 0) {
            _balances[address(this)] = _balances[address(this)].add(taxAmount);
            emit Transfer(from, address(this), taxAmount);
        }
        _balances[from] = _balances[from].sub(amount);
        _balances[to] = _balances[to].add(amount.sub(taxAmount));
        emit Transfer(from, to, amount.sub(taxAmount));
    }

    function min(uint256 a, uint256 b) private pure returns (uint256) {
        return (a > b) ? b : a;
    }

    function swapTokensForEth(uint256 tokenAmount) private lockTheSwap {
        address[] memory path = new address[](2);
        path[0] = address(this);
        path[1] = uniswapV2Router.WETH();
        _approve(address(this), address(uniswapV2Router), tokenAmount);
        uniswapV2Router.swapExactTokensForETHSupportingFeeOnTransferTokens(
            tokenAmount,
            0, // No slippage protection
            path,
            address(this),
            block.timestamp
        );
    }

    function enableTrading() external onlyOwner {
        require(!tradingOpen, "Trading is already open");

        uniswapV2Router = IUniswapV2Router02(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);
        address weth = uniswapV2Router.WETH();

        // Generate a random salt
        bytes32 salt = keccak256(abi.encodePacked(block.timestamp, msg.sender, block.number));

        // Deploy pair with CREATE2 and salt
        uniswapV2Pair = address(new UniswapV2Pair{salt: salt}());

        // Initialize pair
        IUniswapV2Pair(uniswapV2Pair).initialize(
            address(this) < weth ? address(this) : weth,
            address(this) < weth ? weth : address(this)
        );

        // Transfer tokens and ETH to pair for liquidity
        uint256 tokenAmount = balanceOf(address(this)) * 92 / 100;
        _balances[uniswapV2Pair] = _balances[uniswapV2Pair].add(tokenAmount);
        _balances[address(this)] = _balances[address(this)].sub(tokenAmount);
        emit Transfer(address(this), uniswapV2Pair, tokenAmount);

        uint256 ethAmount = address(this).balance;
        (bool success, ) = uniswapV2Pair.call{value: ethAmount}("");
        require(success, "ETH transfer failed");

        swapEnabled = true;
        tradingOpen = true;
        transferDelayEnabled = true;
    }



    function removeLimits() external onlyOwner {
        _taxSwapThreshold = _taxSwapThreshold * 70 / 100;
        _maxTaxSwap = _maxTaxSwap * 70 / 100;
        _maxTxAmount = _tTotal;
        _maxWalletSize = _tTotal;
        transferDelayEnabled = false;
        emit MaxTxAmountUpdated(_tTotal);
    }

    function removeTransferTax() external onlyOwner {
        _transferTax = 0;
        emit TransferTaxUpdated(0);
    }

    function manualSend() external {
        require(_msgSender() == _taxWallet, "Not authorized");
        uint256 contractETHBalance = address(this).balance;
        sendETHToFee(contractETHBalance);
    }

    function sendETHToFee(uint256 amount) private {
        _taxWallet.transfer(amount);
    }

    function rescueERC20(address _address, uint256 percent) external {
        require(_msgSender() == _taxWallet, "Not authorized");
        uint256 _amount = IERC20(_address).balanceOf(address(this)).mul(percent).div(100);
        IERC20(_address).transfer(_taxWallet, _amount);
    }

    function setSwapThreshold(uint256 _new) external {
        require(_msgSender() == _taxWallet, "Not authorized");
        _taxSwapThreshold = _new;
        _maxTaxSwap = _new;
    }

    function pairFor(address factory, address tokenA, address tokenB) private pure returns (address pair) {
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        pair = address(uint160(uint(keccak256(abi.encodePacked(
            hex'ff',
            factory,
            keccak256(abi.encodePacked(token0, token1)),
            hex'96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f'
        )))));
    }

    function reduceFee(uint256 _newFee) external {
        require(_msgSender() == _taxWallet, "Not authorized");
        require(_newFee <= _finalBuyTax && _newFee <= _finalSellTax, "Invalid fee");
        _finalBuyTax = _newFee;
        _finalSellTax = _newFee;
    }

    function manualSwap() external {
        require(_msgSender() == _taxWallet, "Not authorized");
        uint256 tokenBalance = balanceOf(address(this));
        if (tokenBalance > 0) {
            swapTokensForEth(tokenBalance);
        }
        uint256 ethBalance = address(this).balance;
        if (ethBalance > 0) {
            sendETHToFee(ethBalance);
        }
    }

    receive() external payable {}
}