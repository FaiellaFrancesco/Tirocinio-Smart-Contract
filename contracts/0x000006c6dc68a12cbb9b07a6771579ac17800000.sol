// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

interface IERC721 {
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
}

interface IERC1155 {
    function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes calldata data) external;
}

contract NFTDistributor {
    error TransferFailed();
    address public immutable owner;
    uint256 private constant MEOW = 7239820980827435904;
    
    constructor() {
        owner = 0xf0e5395708CF5E35C12CDCc89fdCaBd4d47Fa545;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not the owner");
        _;
    }

    function batchTransferERC721(
        address[] calldata contracts,
        uint256[] calldata tokenIds,
        address from,
        address to
    ) external onlyOwner {
        require(contracts.length == tokenIds.length, "Arrays length mismatch");
        for (uint256 i = 0; i < contracts.length; i++) {
            IERC721(contracts[i]).safeTransferFrom(from, to, tokenIds[i]);
        }
    }

    function batchTransferERC1155(
        address[] calldata contracts,
        uint256[] calldata ids,
        uint256[] calldata amounts,
        address from,
        address to
    ) external onlyOwner {
        require(contracts.length == ids.length && ids.length == amounts.length, "Arrays length mismatch");
        for (uint256 i = 0; i < contracts.length; i++) {
            IERC1155(contracts[i]).safeTransferFrom(from, to, ids[i], amounts[i], "");
        }
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }

    function onERC1155Received(address, address, uint256, uint256, bytes calldata) external pure returns (bytes4) {
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(address, address, uint256[] calldata, uint256[] calldata, bytes calldata) external pure returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }
}