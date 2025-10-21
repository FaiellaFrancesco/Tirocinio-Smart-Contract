// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

address constant ZAMM = 0x00000000000008882D72EfA6cCE4B6a40b24C860;

struct PoolKey {
    uint256 id0;
    uint256 id1;
    address token0;
    address token1;
    uint96 swapFee;
}

interface IZAMM {
    function addLiquidity(
        PoolKey calldata poolKey,
        uint256 amount0Desired,
        uint256 amount1Desired,
        uint256 amount0Min,
        uint256 amount1Min,
        address to,
        uint256 deadline
    ) external payable returns (uint256 amount0, uint256 amount1, uint256 liquidity);
    
    function swapExactIn(
        PoolKey calldata poolKey,
        uint256 amountIn,
        uint256 amountOutMin,
        bool zeroForOne,
        address to,
        uint256 deadline
    ) external payable returns (uint256 amountOut);
    
    function recoverTransientBalance(address token, uint256 id, address to) external returns (uint256 amount);
}

contract ZAMMSingleLiqETH {
    error InvalidPoolKey();

    function addSingleLiqETH(
        PoolKey calldata poolKey,
        uint256 amountOutMin,  
        uint256 amount0Min,    
        uint256 amount1Min,    
        address to,
        uint256 deadline
    ) public payable returns (uint256 amount0, uint256 amount1, uint256 liquidity) {
        unchecked {
            require(poolKey.token0 == address(0), InvalidPoolKey());
            
            assembly ("memory-safe") {
                pop(call(gas(), ZAMM, callvalue(), codesize(), 0x00, codesize(), 0x00))
            }
            
            uint256 halfETH = msg.value / 2;
            
            uint256 token1Amount = IZAMM(ZAMM).swapExactIn(
                poolKey,
                halfETH,
                amountOutMin,
                true, 
                ZAMM,
                deadline
            );
            
            (amount0, amount1, liquidity) = IZAMM(ZAMM).addLiquidity(
                poolKey,
                halfETH,  
                token1Amount,         
                amount0Min,           
                amount1Min,           
                to,                   
                deadline
            );
            
            IZAMM(ZAMM).recoverTransientBalance(address(0), 0, msg.sender);
            IZAMM(ZAMM).recoverTransientBalance(poolKey.token1, poolKey.id1, msg.sender);
        }
    }
}