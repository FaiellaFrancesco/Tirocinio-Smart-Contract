// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title EventTicketing
 * @author akb
 * @notice This contract allows the owner to manage ticket sales for an event with a maximum capacity.
 * Users can buy tickets by paying Ether, tickets are tied to buyer addresses.
 * The owner can refund tickets individually or in bulk.
 * Tickets can be marked as used.
 * Events are emitted for key actions.
 */
contract EventTicketing {
    address public owner;
    uint256 public maxCapacity;
    uint256 public ticketPrice;
    uint256 public ticketsSold;

    struct Ticket {
        bool exists;
        bool used;
    }

    mapping(address => Ticket) private tickets;

    event TicketPurchased(address indexed buyer);
    event TicketRefunded(address indexed buyer);
    event TicketUsed(address indexed buyer);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier ticketExists(address buyer) {
        require(tickets[buyer].exists, "Ticket does not exist for this address");
        _;
    }

    constructor(uint256 _maxCapacity, uint256 _ticketPrice) {
        require(_maxCapacity > 0, "Max capacity must be greater than zero");
        require(_ticketPrice > 0, "Ticket price must be greater than zero");
        owner = msg.sender;
        maxCapacity = _maxCapacity;
        ticketPrice = _ticketPrice;
        ticketsSold = 0;
    }

    /**
     * @notice Buy a ticket by sending the exact ticket price in Ether.
     * @dev Reverts if max capacity is reached or if the buyer already has a ticket.
     */
    function buyTicket() external payable {
        require(ticketsSold < maxCapacity, "All tickets sold");
        require(msg.value == ticketPrice, "Incorrect Ether value sent");
        require(!tickets[msg.sender].exists, "Ticket already purchased");

        tickets[msg.sender] = Ticket({exists: true, used: false});
        ticketsSold++;

        emit TicketPurchased(msg.sender);
    }

    /**
     * @notice Refund a ticket for a specific buyer address.
     * @dev Only owner can call. Refunds the ticket price and marks ticket as non-existent.
     * @param buyer The address of the ticket holder to refund.
     */
    function refundTicket(address payable buyer) external onlyOwner ticketExists(buyer) {
        Ticket storage ticket = tickets[buyer];
        require(!ticket.used, "Cannot refund a used ticket");

        ticket.exists = false;
        ticketsSold--;

        (bool success, ) = buyer.call{value: ticketPrice}('');
        require(success, "Refund transfer failed");

        emit TicketRefunded(buyer);
    }

    /**
     * @notice Refund multiple tickets in bulk.
     * @dev Only owner can call. Refunds each ticket if valid.
     * @param buyers Array of buyer addresses to refund.
     */
    function refundTicketsBulk(address payable[] calldata buyers) external onlyOwner {
        for (uint256 i = 0; i < buyers.length; i++) {
            address buyer = buyers[i];
            if (tickets[buyer].exists && !tickets[buyer].used) {
                tickets[buyer].exists = false;
                ticketsSold--;

                (bool success, ) = payable(buyer).call{value: ticketPrice}('');
                require(success, "Refund transfer failed");

                emit TicketRefunded(buyer);
            }
        }
    }

    /**
     * @notice Check if an address owns a ticket.
     * @param buyer The address to check.
     * @return True if the address owns a ticket, false otherwise.
     */
    function ownsTicket(address buyer) external view returns (bool) {
        return tickets[buyer].exists;
    }

    /**
     * @notice Mark a ticket as used.
     * @dev Only owner can call.
     * @param buyer The address of the ticket holder.
     */
    function markTicketUsed(address buyer) external onlyOwner ticketExists(buyer) {
        require(!tickets[buyer].used, "Ticket already used");
        tickets[buyer].used = true;

        emit TicketUsed(buyer);
    }

    /**
     * @notice Withdraw contract balance to owner.
     * @dev Only owner can call.
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");

        (bool success, ) = owner.call{value: balance}('');
        require(success, "Withdraw transfer failed");
    }
}