// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/// @notice This contract allows users to vote on proposals.
contract DCTXDMCP {

    /// @dev Struct representing a governance proposal.
    struct Proposal {
        uint256 id;                     // Unique proposal ID
        uint256 supportVotes;          // Number of support votes
        uint256 rejectVotes;           // Number of reject votes
        mapping(address => bool) hasVoted;  // Tracks if a user has already voted
    }

    /// @dev Mapping from proposal ID to its Proposal data.
    mapping(uint256 => Proposal) private _proposals;

    /// @dev Mapping from user address to their registered DMCP node ID.
    mapping(address => string) private _dmcpNodes;

    /// @notice Cast a vote on a proposal.
    /// @dev A user can only vote once per proposal. Votes are recorded on-chain.
    /// @param proposalId The ID of the proposal to vote on.
    /// @param support If true, vote counts as support. If false, counts as rejection.
    function voteOnProposal(uint256 proposalId, bool support) external {
        Proposal storage p = _proposals[proposalId];
        require(!p.hasVoted[msg.sender], "Already voted");
        p.id = proposalId;
        p.hasVoted[msg.sender] = true;

        if (support) {
            p.supportVotes++;
        } else {
            p.rejectVotes++;
        }
    }

    /// @notice Returns the voting result for a proposal.
    /// @param proposalId The ID of the proposal.
    /// @return id The proposal ID.
    /// @return supportVotes Number of support votes.
    /// @return rejectVotes Number of reject votes.
    /// @return hasVoted Whether the caller has voted on this proposal.
    function getProposal(uint256 proposalId) external view returns (
        uint256 id,
        uint256 supportVotes,
        uint256 rejectVotes,
        bool hasVoted
    ) {
        Proposal storage p = _proposals[proposalId];
        return (
            p.id,
            p.supportVotes,
            p.rejectVotes,
            p.hasVoted[msg.sender]
        );
    }

    /// @notice Register your address to a DMCP node.
    /// @dev A user can only register once. Duplicate registration is blocked.
    /// @param nodeId The string ID of the DMCP node to register to.
    function registerToDMCPNode(string calldata nodeId) external {
        require(bytes(_dmcpNodes[msg.sender]).length == 0, "Already registered");
        _dmcpNodes[msg.sender] = nodeId;
    }

    /// @notice Get the node ID that a user is registered to.
    /// @param user The address of the user.
    /// @return The string node ID the user is registered to.
    function getDMCPNode(address user) external view returns (string memory) {
        return _dmcpNodes[user];
    }
}