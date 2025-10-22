pragma solidity >=0.8.0 <0.9.0;

// Proxy Contract
contract OwnbitMultiSigProxy {
    address public constant implementation = 0x95Ca2f7959f8848795dFB0868C1b0c59Dd4E9330; //ETH v6
   
    constructor(address[] memory _owners, uint _required) {
        bytes memory initData = abi.encodeWithSignature("initialize(address[],uint256)", _owners, _required);
        (bool success, ) = implementation.delegatecall(initData);
        require(success, "Initialization failed");
    }

    fallback() external payable {
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), implementation, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }
}