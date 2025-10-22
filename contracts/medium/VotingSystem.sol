// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title VotingSystem
 * @notice Allows users to create proposals and vote on them within a fixed duration.
 */
contract VotingSystem {
    struct Proposal {
        string description;
        uint256 voteCount;
        uint256 endTime;
        mapping(address => bool) hasVoted;
    }

    mapping(uint256 => Proposal) private proposals;
    uint256 public proposalCount;

    event ProposalCreated(uint256 proposalId, string description, uint256 endTime);
    event Voted(uint256 proposalId, address voter);

    /**
     * @notice Create a new proposal with a description and voting duration.
     * @param _description The description of the proposal.
     * @param _duration Voting duration in seconds.
     */
    function createProposal(string calldata _description, uint256 _duration) external {
        require(_duration > 0, "Duration must be > 0");

        proposalCount++;
        Proposal storage p = proposals[proposalCount];
        p.description = _description;
        p.endTime = block.timestamp + _duration;

        emit ProposalCreated(proposalCount, _description, p.endTime);
    }

    /**
     * @notice Vote on a given proposal.
     * @param _proposalId ID of the proposal to vote on.
     */
    function vote(uint256 _proposalId) external {
        Proposal storage p = proposals[_proposalId];
        require(block.timestamp <= p.endTime, "Voting has ended");
        require(!p.hasVoted[msg.sender], "Already voted");

        p.voteCount++;
        p.hasVoted[msg.sender] = true;

        emit Voted(_proposalId, msg.sender);
    }

    /**
     * @notice Get the vote count and status for a proposal.
     * @param _proposalId The ID of the proposal.
     */
    function getProposal(uint256 _proposalId) external view returns (string memory, uint256, uint256, bool) {
        Proposal storage p = proposals[_proposalId];
        return (
            p.description,
            p.voteCount,
            p.endTime,
            p.hasVoted[msg.sender]
        );
    }
}
