// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20 <0.9.0;

/// @title SimpleBallot - A simple voting contract with chairperson-controlled voter registration
/// @author 
/// @notice This contract allows a chairperson to register voters and conduct a vote on predefined proposals.
/// @dev Uses custom errors, events, and access control modifier for clarity and security.
contract SimpleBallot {
    /// @notice Proposal structure containing name and vote count
    struct Proposal {
        string name;
        uint256 voteCount;
    }

    /// @notice Voter structure containing registration status, voting status, and voted proposal index
    struct Voter {
        bool registered;
        bool voted;
        uint256 vote;
    }

    /// @notice Address of the chairperson (deployer)
    address public immutable chairperson;

    /// @notice Array of proposals available for voting
    Proposal[] public proposals;

    /// @notice Mapping from voter address to Voter info
    mapping(address => Voter) public voters;

    /// @notice Emitted when a voter is registered by the chairperson
    /// @param voter The address of the registered voter
    event VoterRegistered(address indexed voter);

    /// @notice Emitted when a registered voter casts their vote
    /// @param voter The address of the voter who cast the vote
    /// @param proposalIndex The index of the proposal voted for
    event VoteCast(address indexed voter, uint256 indexed proposalIndex);

    /// @notice Error thrown when caller is not the chairperson
    error NotChairperson();

    /// @notice Error thrown when an action requires a registered voter but caller is not registered
    error NotRegistered();

    /// @notice Error thrown when a voter attempts to vote more than once
    error AlreadyVoted();

    /// @notice Error thrown when a given proposal index is invalid (out of range)
    error InvalidProposal();

    /// @notice Error thrown when no proposals are provided at deployment
    error NoProposals();

    /// @notice Modifier to restrict function access to only the chairperson
    modifier onlyChairperson() {
        if (msg.sender != chairperson) revert NotChairperson();
        _;
    }

    /// @notice Contract constructor sets the chairperson and initializes proposals
    /// @param proposalNames Array of proposal names to initialize voting options
    constructor(string[] memory proposalNames) {
        if (proposalNames.length == 0) revert NoProposals();
        chairperson = msg.sender;
        for (uint256 i = 0; i < proposalNames.length; i++) {
            proposals.push(Proposal({name: proposalNames[i], voteCount: 0}));
        }
    }

    /// @notice Register a voter; only callable by the chairperson.
    ///         Idempotent: does nothing if already registered.
    /// @param voter Address of the voter to register
    function registerVoter(address voter) external onlyChairperson {
        Voter storage v = voters[voter];
        if (!v.registered) {
            v.registered = true;
            emit VoterRegistered(voter);
        }
        // else do nothing (idempotent)
    }

    /// @notice Cast a vote for a given proposal index; caller must be registered and not have voted before.
    /// @param proposalIndex Index of the proposal to vote for
    function vote(uint256 proposalIndex) external {
        Voter storage sender = voters[msg.sender];
        if (!sender.registered) revert NotRegistered();
        if (sender.voted) revert AlreadyVoted();
        if (proposalIndex >= proposals.length) revert InvalidProposal();

        sender.voted = true;
        sender.vote = proposalIndex;
        unchecked {
            proposals[proposalIndex].voteCount++;
        }
        emit VoteCast(msg.sender, proposalIndex);
    }

    /// @notice Returns the winning proposal's index, name, and vote count.
    /// @return index The index of the winning proposal
    /// @return name The name of the winning proposal
    /// @return votes The number of votes the winning proposal received
    function winner() public view returns (uint256 index, string memory name, uint256 votes) {
        uint256 winningVoteCount = 0;
        uint256 winningIndex = 0;

        for (uint256 i = 0; i < proposals.length; i++) {
            if (proposals[i].voteCount > winningVoteCount) {
                winningVoteCount = proposals[i].voteCount;
                winningIndex = i;
            }
        }
        return (winningIndex, proposals[winningIndex].name, winningVoteCount);
    }
}