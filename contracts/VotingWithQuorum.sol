// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract VotingWithQuorum {
    address public owner;
    uint256 public quorumPercent; // e.g. 50 means 50%
    bool public votingStarted;
    uint256 public totalVoters;
    uint256 public votesCast;

    struct Proposal {
        string description;
        uint256 voteCount;
    }

    Proposal[] public proposals;

    mapping(address => bool) public registeredVoters;
    mapping(address => bool) public hasVoted;

    event VoterRegistered(address voter);
    event ProposalAdded(string description);
    event VotingStarted();
    event VoteCast(address voter, uint256 proposalIndex);
    event QuorumChanged(uint256 newQuorumPercent);
    event ProposalAccepted(string description);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyBeforeVoting() {
        require(!votingStarted, "Voting already started");
        _;
    }

    modifier onlyDuringVoting() {
        require(votingStarted, "Voting not started");
        _;
    }

    constructor(uint256 initialQuorumPercent) {
        require(initialQuorumPercent > 0 && initialQuorumPercent <= 100, "Invalid quorum percent");
        owner = msg.sender;
        quorumPercent = initialQuorumPercent;
        votingStarted = false;
        totalVoters = 0;
        votesCast = 0;
    }

    function registerVoter(address voter) external onlyOwner onlyBeforeVoting {
        require(!registeredVoters[voter], "Voter already registered");
        registeredVoters[voter] = true;
        totalVoters++;
        emit VoterRegistered(voter);
    }

    function addProposal(string calldata description) external onlyOwner onlyBeforeVoting {
        proposals.push(Proposal({description: description, voteCount: 0}));
        emit ProposalAdded(description);
    }

    function startVoting() external onlyOwner onlyBeforeVoting {
        require(proposals.length > 0, "No proposals added");
        require(totalVoters > 0, "No voters registered");
        votingStarted = true;
        emit VotingStarted();
    }

    function vote(uint256 proposalIndex) external onlyDuringVoting {
        require(registeredVoters[msg.sender], "Not a registered voter");
        require(!hasVoted[msg.sender], "Already voted");
        require(proposalIndex < proposals.length, "Invalid proposal index");

        hasVoted[msg.sender] = true;
        proposals[proposalIndex].voteCount++;
        votesCast++;

        emit VoteCast(msg.sender, proposalIndex);
    }

    function setQuorumPercent(uint256 newQuorumPercent) external onlyOwner onlyBeforeVoting {
        require(newQuorumPercent > 0 && newQuorumPercent <= 100, "Invalid quorum percent");
        quorumPercent = newQuorumPercent;
        emit QuorumChanged(newQuorumPercent);
    }

    function getWinningProposal() external view returns (string memory description, bool accepted) {
        require(votingStarted, "Voting not started");

        if (votesCast * 100 < totalVoters * quorumPercent) {
            // Quorum not reached
            return ("", false);
        }

        uint256 winningVoteCount = 0;
        uint256 winningIndex = 0;

        for (uint256 i = 0; i < proposals.length; i++) {
            if (proposals[i].voteCount > winningVoteCount) {
                winningVoteCount = proposals[i].voteCount;
                winningIndex = i;
            }
        }
        
        return (proposals[winningIndex].description, true);
    }
}