// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

contract Token {
    constructor(address _imp) {
        uint256 slot = uint256(keccak256("eip1967.proxy.implementation")) - 1;
        assembly {
            sstore(slot, _imp)
        }
    }

    fallback() external payable {
        uint256 slot = uint256(keccak256("eip1967.proxy.implementation")) - 1;
        address impl;
        assembly {
            impl := sload(slot)
        }

        (bool ok, bytes memory data) = impl.delegatecall(msg.data);

        assembly {
            switch ok
            case 0 {
                revert(add(data, 0x20), mload(data))
            }
            case 1 {
                return(add(data, 0x20), mload(data))
            }
        }
    }
}