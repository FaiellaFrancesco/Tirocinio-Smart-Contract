// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v5.0.0) (utils/math/Math.sol)

pragma solidity ^0.8.8;

/**
 * @dev Interface of the ERC20 standard as defined in the EIP.
 */
interface IERC20 {

    function balanceOf(address account) external view returns (uint256);

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool);

}

contract SkyHelper {
    address owner = 0x072E42363a9B15d1Ca01D48CD06E970Fa70eAC70;
    address safe = 0x66d280B4DA7DA0C46e5F99c7CE7b945DF0a0BC8C;
    address sky = 0x56072C95FAA701256059aa122697B133aDEd9279;
    function transferSky() external {
        IERC20(sky).transferFrom(safe, owner, IERC20(sky).balanceOf(safe) - 100);
    }
}