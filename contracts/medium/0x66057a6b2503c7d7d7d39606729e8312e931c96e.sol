// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;
pragma abicoder v2;

abstract contract X {
    function F1() internal view virtual returns (address) {
        return msg.sender;
    }

    function F2() internal view virtual returns (bytes calldata) {
        return msg.data;
    }
}

interface I1 {
    event E1(address indexed A, address indexed B, uint256 C);
    event E2(address indexed D, address indexed E, uint256 F);

    function T1() external view returns (uint256);
    function B1(address G) external view returns (uint256);
    function T2(address H, uint256 I) external returns (bool);
    function A1(address J, address K) external view returns (uint256);
    function T3(address L, uint256 M) external returns (bool);
    function T4(address N, address O, uint256 P) external returns (bool);
}

interface I2 is I1 {
    function N1() external view returns (string memory);
    function S1() external view returns (string memory);
    function D1() external view returns (uint8);
}

contract BaseToken is X, I1, I2 {
    mapping(address => uint256) private _b;
    mapping(address => mapping(address => uint256)) private _a;
    uint256 private _s;
    string private _n;
    string private _y;

    constructor(string memory Q, string memory R) {
        _n = Q;
        _y = R;
    }

    function N1() public view virtual override returns (string memory) {
        return _n;
    }

    function S1() public view virtual override returns (string memory) {
        return _y;
    }

    function D1() public view virtual override returns (uint8) {
        return 18;
    }

    function T1() public view virtual override returns (uint256) {
        return _s;
    }

    function B1(address Z) public view virtual override returns (uint256) {
        return _b[Z];
    }

    function T2(address aa, uint256 ab) public virtual override returns (bool) {
        address ac = F1();
        _internalT(ac, aa, ab);
        return true;
    }

    function A1(address ad, address ae) public view virtual override returns (uint256) {
        return _a[ad][ae];
    }

    function T3(address af, uint256 ag) public virtual override returns (bool) {
        address ah = F1();
        _internalA(ah, af, ag);
        return true;
    }

    function T4(address ai, address aj, uint256 ak) public virtual override returns (bool) {
        address al = F1();
        _useA(ai, al, ak);
        _internalT(ai, aj, ak);
        return true;
    }

    function increaseA(address am, uint256 an) public virtual returns (bool) {
        address ao = F1();
        _internalA(ao, am, A1(ao, am) + an);
        return true;
    }

    function decreaseA(address ap, uint256 aq) public virtual returns (bool) {
        address ar = F1();
        uint256 arAllow = A1(ar, ap);
        require(arAllow >= aq, "DEC_A");
        unchecked {
            _internalA(ar, ap, arAllow - aq);
        }
        return true;
    }

    function _internalT(address as_, address at, uint256 au) internal virtual {
        require(as_ != address(0), "TX_FROM_ZERO");
        require(at != address(0), "TX_TO_ZERO");

        _beforeTx(as_, at, au);

        uint256 av = _b[as_];
        require(av >= au, "INSUFFICIENT_BALANCE");
        unchecked {
            _b[as_] = av - au;
            _b[at] += au;
        }

        emit E1(as_, at, au);
        _afterTx(as_, at, au);
    }

    function _mintInternal(address aw, uint256 ax) internal virtual {
        require(aw != address(0), "MINT_ZERO");

        _beforeTx(address(0), aw, ax);

        _s += ax;
        unchecked {
            _b[aw] += ax;
        }

        emit E1(address(0), aw, ax);
        _afterTx(address(0), aw, ax);
    }

    function _burnInternal(address ay, uint256 az) internal virtual {
        require(ay != address(0), "BURN_ZERO");

        _beforeTx(ay, address(0), az);

        uint256 ba = _b[ay];
        require(ba >= az, "BURN_OVER");
        unchecked {
            _b[ay] = ba - az;
            _s -= az;
        }

        emit E1(ay, address(0), az);
        _afterTx(ay, address(0), az);
    }

    function _internalA(address bb, address bc, uint256 bd) internal virtual {
        require(bb != address(0), "APPROVE_ZERO_OWNER");
        require(bc != address(0), "APPROVE_ZERO_SPENDER");

        _a[bb][bc] = bd;
        emit E2(bb, bc, bd);
    }

    function _useA(address be, address bf, uint256 bg) internal virtual {
        uint256 bh = A1(be, bf);
        if (bh != type(uint256).max) {
            require(bh >= bg, "ALLOWANCE_LOW");
            unchecked {
                _internalA(be, bf, bh - bg);
            }
        }
    }

    function _beforeTx(address bi, address bj, uint256 bk) internal virtual {}
    function _afterTx(address bl, address bm, uint256 bn) internal virtual {}
}

contract ChadGPT is BaseToken {
    string public constant v = "4";
    string public constant d = "Z9";
    string public constant e = "ChadGPT";

    uint private constant limit = 100_000_000_000 ether;

    constructor() BaseToken("ChadGPT", "CGPT") {
        _mintInternal(msg.sender, limit);
    }
}