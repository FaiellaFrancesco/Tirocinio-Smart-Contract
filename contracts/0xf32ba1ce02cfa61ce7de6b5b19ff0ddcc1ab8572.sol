// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title TicketFactory
 * @dev Factory contract for deploying Ticket contracts via CREATE2 using a deterministic salt.
 *      Maintains a per-user nonce for address uniqueness, stores created ticket addresses,
 *      emits creation events, provides address prediction functionality, globally
 *      indexes every ticket with creator info, and can generate a unique identifier
 *      for any created ticket.
 */
contract TicketFactory {
    /// @notice Owner of the factory contract
    address public owner;

    /// @notice Per-user counter to ensure unique CREATE2 salts
    mapping(address => uint256) public userNonce;

    /// @notice Mapping from user address to the list of ticket addresses they have created
    mapping(address => address[]) public userTickets;

    /**
     * @notice Struct containing global info for each created ticket
     * @param user Address of the ticket creator
     * @param ticketAddress Deployed Ticket contract address
     * @param userTicketCount Total number of tickets the user has created (including this one)
     */
    struct TicketInfo {
        address user;
        address ticketAddress;
        uint256 userTicketCount;
    }

    /// @notice Global mapping from a sequential index to each ticket’s info
    mapping(uint256 => TicketInfo) public ticketsIndex;

    /// @notice Total number of tickets ever created through this factory
    uint256 public totalTickets;

    /**
     * @dev Emitted when the contract ownership is transferred from one address to another.
     * @param previousOwner The address of the previous owner.
     * @param newOwner The address of the new owner.
     */
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Emitted when a new Ticket is created for a user.
     * @param user The address initiating the ticket creation.
     * @param ticket The address of the newly deployed Ticket contract.
     * @param nonce The nonce of the user at the time of creation.
     * @param timestamp The block timestamp when the ticket was deployed.
     */
    event TicketCreated(
        address indexed user,
        address indexed ticket,
        uint256 indexed nonce,
        uint256 timestamp
    );

    /// @dev Restricts function access to the contract owner.
    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not the owner");
        _;
    }

    /// @notice Contract constructor. Sets the deployer as the initial owner.
    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    /**
     * @notice Transfers contract ownership to a new address.
     * @dev Can only be called by the current owner.
     * @param newOwner The address to transfer ownership to.
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner is the zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    /**
     * @notice Executes a low-level call to a target address, forwarding a specified amount of Ether and data.
     * @dev Can only be called by the owner. Reverts if the call fails.
     * @param target The address to call.
     * @param value The amount of Wei to send with the call.
     * @param data The calldata to include in the call.
     * @return returnData The data returned from the call.
     */
    function executeCall(
        address target,
        uint256 value,
        bytes calldata data
    ) external payable onlyOwner returns (bytes memory returnData) {
        require(address(this).balance >= value, "Insufficient balance for call");
        (bool success, bytes memory result) = target.call{value: value}(data);
        require(success, "Low-level call failed");
        return result;
    }

    /**
     * @notice Retrieves both the nonce and the list of tickets created by a specific user.
     * @param user The address of the user whose data is being requested.
     * @return nonce The current creation nonce for the user.
     * @return tickets The array of ticket contract addresses created by the user.
     */
    function getUserData(address user)
        external
        view
        returns (uint256 nonce, address[] memory tickets)
    {
        nonce = userNonce[user];
        tickets = userTickets[user];
    }

    /**
     * @notice Returns the runtime bytecode for the Ticket contract.
     * @dev Should return the compiled runtime bytecode of Ticket.sol with any embedded constants.
     * @return bytecode The raw creation code for the Ticket contract.
     */
    function getTicketBytecode() public pure returns (bytes memory bytecode) {
        return hex"6080604052348015600e575f5ffd5b506103a88061001c5f395ff3fe60806040526004361061002c575f3560e01c806309a483431461015d578063c0406226146101835761006d565b3661006d576040805134815242602082015233917f1d57945c1033a96907a78f6e0ebf6a03815725dac25f33cc806558670344ac88910160405180910390a2005b5f738c68123f200823decf204211d39054127dd75b2a73ffffffffffffffffffffffffffffffffffffffff16635c60da1b6040518163ffffffff1660e01b8152600401602060405180830381865afa1580156100cb573d5f5f3e3d5ffd5b505050506040513d601f19601f820116820180604052508101906100ef9190610338565b905073ffffffffffffffffffffffffffffffffffffffff811661010e57005b5f80547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0016600117815560405190369082375f813683855af43d805f843e818015610157578184f35b8184fd5b005b348015610168575f5ffd5b505f5460ff1615604051901515815260200160405180910390f35b34801561018e575f5ffd5b5061015b5f738c68123f200823decf204211d39054127dd75b2a73ffffffffffffffffffffffffffffffffffffffff1663481c6a756040518163ffffffff1660e01b8152600401602060405180830381865afa1580156101f0573d5f5f3e3d5ffd5b505050506040513d601f19601f820116820180604052508101906102149190610338565b90503373ffffffffffffffffffffffffffffffffffffffff8216146102bf576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152602560248201527f4d73672e73656e646572206973206e6f7420746865206d616e6167657220616460448201527f6472657373000000000000000000000000000000000000000000000000000000606482015260840160405180910390fd5b5f80547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00166001178155367fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffbc01908190604490375f5f825f60243560043560601c5af190503d805f5f3e81801561033457815ff35b815ffd5b5f60208284031215610348575f5ffd5b815173ffffffffffffffffffffffffffffffffffffffff8116811461036b575f5ffd5b939250505056fea2646970667358221220b212380e3b9d79c5e4b123e47256221a273f65e23db94a232b64cfa4daf777e864736f6c634300081e0033";
    }

    /**
     * @notice Predicts the address of the next Ticket contract for a given user.
     * @dev Calculates the deterministic CREATE2 address using the user nonce and contract bytecode hash.
     * @param user The address of the user whose next ticket address is being predicted.
     * @return predicted The predicted contract address if create() is called next for this user.
     */
    function viewCreateTicketContract(address user) external view returns (address predicted) {
        uint256 n = userNonce[user];
        bytes32 salt = keccak256(abi.encodePacked(user, n));
        bytes32 codeHash = keccak256(getTicketBytecode());
        bytes32 raw = keccak256(
            abi.encodePacked(bytes1(0xff), address(this), salt, codeHash)
        );
        return address(uint160(uint256(raw)));
    }

    /**
     * @notice Deploys a new Ticket contract for the calling user using CREATE2.
     * @dev Computes salt = keccak256(abi.encodePacked(msg.sender, userNonce[msg.sender])) for deterministic address.
     *      Increments the user's nonce, stores the new ticket address, emits TicketCreated, and
     *      globally indexes it in ticketsIndex.
     * @return ticketAddress The address of the newly deployed Ticket contract.
     */
    function create() external returns (address ticketAddress) {
        // 1. Fetch and increment the per-user nonce
        uint256 currentNonce = userNonce[msg.sender];
        bytes32 salt = keccak256(abi.encodePacked(msg.sender, currentNonce));
        userNonce[msg.sender] = currentNonce + 1;

        // 2. Deploy the new Ticket contract via CREATE2
        bytes memory creationCode = getTicketBytecode();
        assembly {
            let codePtr := add(creationCode, 0x20)
            let codeSize := mload(creationCode)
            ticketAddress := create2(0, codePtr, codeSize, salt)
            if iszero(ticketAddress) {
                revert(0, 0)
            }
        }

        // 3. Record per-user tickets
        userTickets[msg.sender].push(ticketAddress);

        // 4. Global indexing of this ticket
        ticketsIndex[totalTickets] = TicketInfo({
            user: msg.sender,
            ticketAddress: ticketAddress,
            userTicketCount: userNonce[msg.sender]
        });
        totalTickets++;

        // 5. Emit creation event
        emit TicketCreated(msg.sender, ticketAddress, currentNonce, block.timestamp);

        return ticketAddress;
    }

    /**
     * @notice Computes a unique identifier for a ticket by hashing its stored parameters.
     * @dev Reads the creator address, deployed ticket address, and userTicketCount
     *      from the ticketsIndex mapping at the given index, then computes
     *      keccak256 over their packed encoding and returns the result as uint256.
     * @param index The global index of the ticket in ticketsIndex.
     * @return ticketIdentifier The uint256 representation of the keccak256 hash.
     */
    function getTicketIdentifier(uint256 index)
        external
        view
        returns (uint256 ticketIdentifier)
    {
        TicketInfo storage info = ticketsIndex[index];
        bytes32 hash = keccak256(
            abi.encodePacked(
                info.user,
                info.ticketAddress,
                info.userTicketCount
            )
        );
        ticketIdentifier = uint256(hash);
    }
}