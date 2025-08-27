const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VotingWithQuorum", function () {
  let votingWithQuorum;
  let owner, voter1, voter2, voter3, voter4, nonVoter;
  const initialQuorumPercent = 50; // 50%

  beforeEach(async function () {
    [owner, voter1, voter2, voter3, voter4, nonVoter] = await ethers.getSigners();
    const VotingWithQuorum = await ethers.getContractFactory("VotingWithQuorum");
    votingWithQuorum = await VotingWithQuorum.deploy(initialQuorumPercent);
    await votingWithQuorum.waitForDeployment();
  });

  describe("Deployment", function () {
    it("should set the correct owner", async function () {
      expect(await votingWithQuorum.owner()).to.equal(owner.address);
    });

    it("should set the correct initial quorum percent", async function () {
      expect(await votingWithQuorum.quorumPercent()).to.equal(initialQuorumPercent);
    });

    it("should initialize voting as not started", async function () {
      expect(await votingWithQuorum.votingStarted()).to.be.false;
    });

    it("should initialize counters to zero", async function () {
      expect(await votingWithQuorum.totalVoters()).to.equal(0);
      expect(await votingWithQuorum.votesCast()).to.equal(0);
    });

    it("should reject invalid quorum percentages", async function () {
      const VotingWithQuorum = await ethers.getContractFactory("VotingWithQuorum");
      
      await expect(VotingWithQuorum.deploy(0))
        .to.be.revertedWith("Invalid quorum percent");
      
      await expect(VotingWithQuorum.deploy(101))
        .to.be.revertedWith("Invalid quorum percent");
    });

    it("should accept valid quorum percentages", async function () {
      const VotingWithQuorum = await ethers.getContractFactory("VotingWithQuorum");
      
      const voting1 = await VotingWithQuorum.deploy(1);
      expect(await voting1.quorumPercent()).to.equal(1);
      
      const voting100 = await VotingWithQuorum.deploy(100);
      expect(await voting100.quorumPercent()).to.equal(100);
    });
  });

  describe("Voter Registration", function () {
    it("should allow owner to register voters", async function () {
      await expect(votingWithQuorum.connect(owner).registerVoter(voter1.address))
        .to.emit(votingWithQuorum, "VoterRegistered")
        .withArgs(voter1.address);

      expect(await votingWithQuorum.registeredVoters(voter1.address)).to.be.true;
      expect(await votingWithQuorum.totalVoters()).to.equal(1);
    });

    it("should reject non-owner from registering voters", async function () {
      await expect(votingWithQuorum.connect(voter1).registerVoter(voter2.address))
        .to.be.revertedWith("Not owner");
    });

    it("should reject duplicate voter registration", async function () {
      await votingWithQuorum.connect(owner).registerVoter(voter1.address);
      
      await expect(votingWithQuorum.connect(owner).registerVoter(voter1.address))
        .to.be.revertedWith("Voter already registered");
    });

    it("should reject voter registration after voting started", async function () {
      await votingWithQuorum.connect(owner).registerVoter(voter1.address);
      await votingWithQuorum.connect(owner).addProposal("Proposal 1");
      await votingWithQuorum.connect(owner).startVoting();

      await expect(votingWithQuorum.connect(owner).registerVoter(voter2.address))
        .to.be.revertedWith("Voting already started");
    });

    it("should handle multiple voter registrations", async function () {
      await votingWithQuorum.connect(owner).registerVoter(voter1.address);
      await votingWithQuorum.connect(owner).registerVoter(voter2.address);
      await votingWithQuorum.connect(owner).registerVoter(voter3.address);

      expect(await votingWithQuorum.registeredVoters(voter1.address)).to.be.true;
      expect(await votingWithQuorum.registeredVoters(voter2.address)).to.be.true;
      expect(await votingWithQuorum.registeredVoters(voter3.address)).to.be.true;
      expect(await votingWithQuorum.registeredVoters(voter4.address)).to.be.false;
      expect(await votingWithQuorum.totalVoters()).to.equal(3);
    });
  });

  describe("Proposal Management", function () {
    it("should allow owner to add proposals", async function () {
      const proposalDesc = "Increase funding for schools";
      
      await expect(votingWithQuorum.connect(owner).addProposal(proposalDesc))
        .to.emit(votingWithQuorum, "ProposalAdded")
        .withArgs(proposalDesc);

      const proposal = await votingWithQuorum.proposals(0);
      expect(proposal.description).to.equal(proposalDesc);
      expect(proposal.voteCount).to.equal(0);
    });

    it("should reject non-owner from adding proposals", async function () {
      await expect(votingWithQuorum.connect(voter1).addProposal("Proposal"))
        .to.be.revertedWith("Not owner");
    });

    it("should reject adding proposals after voting started", async function () {
      await votingWithQuorum.connect(owner).registerVoter(voter1.address);
      await votingWithQuorum.connect(owner).addProposal("Proposal 1");
      await votingWithQuorum.connect(owner).startVoting();

      await expect(votingWithQuorum.connect(owner).addProposal("Proposal 2"))
        .to.be.revertedWith("Voting already started");
    });

    it("should handle multiple proposals", async function () {
      await votingWithQuorum.connect(owner).addProposal("Proposal 1");
      await votingWithQuorum.connect(owner).addProposal("Proposal 2");
      await votingWithQuorum.connect(owner).addProposal("Proposal 3");

      const proposal1 = await votingWithQuorum.proposals(0);
      const proposal2 = await votingWithQuorum.proposals(1);
      const proposal3 = await votingWithQuorum.proposals(2);

      expect(proposal1.description).to.equal("Proposal 1");
      expect(proposal2.description).to.equal("Proposal 2");
      expect(proposal3.description).to.equal("Proposal 3");
    });

    it("should handle empty proposal descriptions", async function () {
      await expect(votingWithQuorum.connect(owner).addProposal(""))
        .to.emit(votingWithQuorum, "ProposalAdded")
        .withArgs("");
    });
  });

  describe("Quorum Management", function () {
    it("should allow owner to change quorum before voting", async function () {
      const newQuorum = 75;
      
      await expect(votingWithQuorum.connect(owner).setQuorumPercent(newQuorum))
        .to.emit(votingWithQuorum, "QuorumChanged")
        .withArgs(newQuorum);

      expect(await votingWithQuorum.quorumPercent()).to.equal(newQuorum);
    });

    it("should reject non-owner from changing quorum", async function () {
      await expect(votingWithQuorum.connect(voter1).setQuorumPercent(75))
        .to.be.revertedWith("Not owner");
    });

    it("should reject invalid quorum percentages", async function () {
      await expect(votingWithQuorum.connect(owner).setQuorumPercent(0))
        .to.be.revertedWith("Invalid quorum percent");
      
      await expect(votingWithQuorum.connect(owner).setQuorumPercent(101))
        .to.be.revertedWith("Invalid quorum percent");
    });

    it("should reject quorum changes after voting started", async function () {
      await votingWithQuorum.connect(owner).registerVoter(voter1.address);
      await votingWithQuorum.connect(owner).addProposal("Proposal 1");
      await votingWithQuorum.connect(owner).startVoting();

      await expect(votingWithQuorum.connect(owner).setQuorumPercent(75))
        .to.be.revertedWith("Voting already started");
    });
  });

  describe("Voting Start", function () {
    it("should allow owner to start voting when conditions are met", async function () {
      await votingWithQuorum.connect(owner).registerVoter(voter1.address);
      await votingWithQuorum.connect(owner).addProposal("Proposal 1");

      await expect(votingWithQuorum.connect(owner).startVoting())
        .to.emit(votingWithQuorum, "VotingStarted");

      expect(await votingWithQuorum.votingStarted()).to.be.true;
    });

    it("should reject non-owner from starting voting", async function () {
      await votingWithQuorum.connect(owner).registerVoter(voter1.address);
      await votingWithQuorum.connect(owner).addProposal("Proposal 1");

      await expect(votingWithQuorum.connect(voter1).startVoting())
        .to.be.revertedWith("Not owner");
    });

    it("should reject starting voting without proposals", async function () {
      await votingWithQuorum.connect(owner).registerVoter(voter1.address);

      await expect(votingWithQuorum.connect(owner).startVoting())
        .to.be.revertedWith("No proposals added");
    });

    it("should reject starting voting without voters", async function () {
      await votingWithQuorum.connect(owner).addProposal("Proposal 1");

      await expect(votingWithQuorum.connect(owner).startVoting())
        .to.be.revertedWith("No voters registered");
    });

    it("should reject starting voting twice", async function () {
      await votingWithQuorum.connect(owner).registerVoter(voter1.address);
      await votingWithQuorum.connect(owner).addProposal("Proposal 1");
      await votingWithQuorum.connect(owner).startVoting();

      await expect(votingWithQuorum.connect(owner).startVoting())
        .to.be.revertedWith("Voting already started");
    });
  });

  describe("Voting Process", function () {
    beforeEach(async function () {
      // Setup voting scenario
      await votingWithQuorum.connect(owner).registerVoter(voter1.address);
      await votingWithQuorum.connect(owner).registerVoter(voter2.address);
      await votingWithQuorum.connect(owner).registerVoter(voter3.address);
      await votingWithQuorum.connect(owner).registerVoter(voter4.address);
      
      await votingWithQuorum.connect(owner).addProposal("Proposal A");
      await votingWithQuorum.connect(owner).addProposal("Proposal B");
      await votingWithQuorum.connect(owner).addProposal("Proposal C");
      
      await votingWithQuorum.connect(owner).startVoting();
    });

    it("should allow registered voters to vote", async function () {
      await expect(votingWithQuorum.connect(voter1).vote(0))
        .to.emit(votingWithQuorum, "VoteCast")
        .withArgs(voter1.address, 0);

      expect(await votingWithQuorum.hasVoted(voter1.address)).to.be.true;
      expect(await votingWithQuorum.votesCast()).to.equal(1);

      const proposal = await votingWithQuorum.proposals(0);
      expect(proposal.voteCount).to.equal(1);
    });

    it("should reject votes from non-registered voters", async function () {
      await expect(votingWithQuorum.connect(nonVoter).vote(0))
        .to.be.revertedWith("Not a registered voter");
    });

    it("should reject double voting from same voter", async function () {
      await votingWithQuorum.connect(voter1).vote(0);
      
      await expect(votingWithQuorum.connect(voter1).vote(1))
        .to.be.revertedWith("Already voted");
    });

    it("should reject votes for invalid proposal index", async function () {
      await expect(votingWithQuorum.connect(voter1).vote(3))
        .to.be.revertedWith("Invalid proposal index");
    });

    it("should reject votes before voting starts", async function () {
      const newVoting = await (await ethers.getContractFactory("VotingWithQuorum")).deploy(50);
      await newVoting.connect(owner).registerVoter(voter1.address);
      await newVoting.connect(owner).addProposal("Proposal 1");
      // Don't start voting

      await expect(newVoting.connect(voter1).vote(0))
        .to.be.revertedWith("Voting not started");
    });

    it("should handle multiple votes correctly", async function () {
      await votingWithQuorum.connect(voter1).vote(0); // Proposal A
      await votingWithQuorum.connect(voter2).vote(0); // Proposal A
      await votingWithQuorum.connect(voter3).vote(1); // Proposal B
      await votingWithQuorum.connect(voter4).vote(2); // Proposal C

      expect(await votingWithQuorum.votesCast()).to.equal(4);

      const proposalA = await votingWithQuorum.proposals(0);
      const proposalB = await votingWithQuorum.proposals(1);
      const proposalC = await votingWithQuorum.proposals(2);

      expect(proposalA.voteCount).to.equal(2);
      expect(proposalB.voteCount).to.equal(1);
      expect(proposalC.voteCount).to.equal(1);
    });
  });

  describe("Winning Proposal and Quorum", function () {
    beforeEach(async function () {
      // Setup with 4 voters (quorum = 50% = 2 votes needed)
      await votingWithQuorum.connect(owner).registerVoter(voter1.address);
      await votingWithQuorum.connect(owner).registerVoter(voter2.address);
      await votingWithQuorum.connect(owner).registerVoter(voter3.address);
      await votingWithQuorum.connect(owner).registerVoter(voter4.address);
      
      await votingWithQuorum.connect(owner).addProposal("Proposal A");
      await votingWithQuorum.connect(owner).addProposal("Proposal B");
      
      await votingWithQuorum.connect(owner).startVoting();
    });

    it("should reject getting winner before voting starts", async function () {
      const newVoting = await (await ethers.getContractFactory("VotingWithQuorum")).deploy(50);
      
      await expect(newVoting.getWinningProposal())
        .to.be.revertedWith("Voting not started");
    });

    it("should return no winner when quorum not reached", async function () {
      // Only 1 vote out of 4 voters (25% < 50% quorum)
      await votingWithQuorum.connect(voter1).vote(0);

      const [description, accepted] = await votingWithQuorum.getWinningProposal();
      expect(description).to.equal("");
      expect(accepted).to.be.false;
    });

    it("should return winner when quorum is exactly reached", async function () {
      // Exactly 2 votes out of 4 voters (50% = 50% quorum)
      await votingWithQuorum.connect(voter1).vote(0);
      await votingWithQuorum.connect(voter2).vote(0);

      const [description, accepted] = await votingWithQuorum.getWinningProposal();
      expect(description).to.equal("Proposal A");
      expect(accepted).to.be.true;
    });

    it("should return winner when quorum is exceeded", async function () {
      // 3 votes out of 4 voters (75% > 50% quorum)
      await votingWithQuorum.connect(voter1).vote(1);
      await votingWithQuorum.connect(voter2).vote(1);
      await votingWithQuorum.connect(voter3).vote(0);

      const [description, accepted] = await votingWithQuorum.getWinningProposal();
      expect(description).to.equal("Proposal B");
      expect(accepted).to.be.true;
    });

    it("should handle ties correctly (first proposal wins)", async function () {
      // Equal votes for proposals A and B
      await votingWithQuorum.connect(voter1).vote(0);
      await votingWithQuorum.connect(voter2).vote(1);

      const [description, accepted] = await votingWithQuorum.getWinningProposal();
      expect(description).to.equal("Proposal A"); // First proposal wins in tie
      expect(accepted).to.be.true;
    });

    it("should work with 100% quorum requirement", async function () {
      // Create new voting instance with 100% quorum
      const newVoting = await (await ethers.getContractFactory("VotingWithQuorum")).deploy(100);
      
      // Setup voters and proposals
      await newVoting.connect(owner).registerVoter(voter1.address);
      await newVoting.connect(owner).registerVoter(voter2.address);
      await newVoting.connect(owner).registerVoter(voter3.address);
      await newVoting.connect(owner).registerVoter(voter4.address);
      await newVoting.connect(owner).addProposal("Proposal A");
      await newVoting.connect(owner).addProposal("Proposal B");
      await newVoting.connect(owner).startVoting();

      // 3 out of 4 votes (75% < 100%)
      await newVoting.connect(voter1).vote(0);
      await newVoting.connect(voter2).vote(0);
      await newVoting.connect(voter3).vote(0);

      let [description, accepted] = await newVoting.getWinningProposal();
      expect(accepted).to.be.false;

      // All 4 votes (100% = 100%)
      await newVoting.connect(voter4).vote(0);

      [description, accepted] = await newVoting.getWinningProposal();
      expect(description).to.equal("Proposal A");
      expect(accepted).to.be.true;
    });

    it("should work with 1% quorum requirement", async function () {
      // Create new voting instance with 1% quorum
      const newVoting = await (await ethers.getContractFactory("VotingWithQuorum")).deploy(1);
      
      // Setup voters and proposals
      await newVoting.connect(owner).registerVoter(voter1.address);
      await newVoting.connect(owner).registerVoter(voter2.address);
      await newVoting.connect(owner).registerVoter(voter3.address);
      await newVoting.connect(owner).registerVoter(voter4.address);
      await newVoting.connect(owner).addProposal("Proposal A");
      await newVoting.connect(owner).addProposal("Proposal B");
      await newVoting.connect(owner).startVoting();

      // 1 out of 4 votes (25% > 1%)
      await newVoting.connect(voter1).vote(0);

      const [description, accepted] = await newVoting.getWinningProposal();
      expect(description).to.equal("Proposal A");
      expect(accepted).to.be.true;
    });
  });

  describe("Edge Cases and Complex Scenarios", function () {
    it("should handle single voter scenario", async function () {
      await votingWithQuorum.connect(owner).registerVoter(voter1.address);
      await votingWithQuorum.connect(owner).addProposal("Solo Proposal");
      await votingWithQuorum.connect(owner).startVoting();

      await votingWithQuorum.connect(voter1).vote(0);

      const [description, accepted] = await votingWithQuorum.getWinningProposal();
      expect(description).to.equal("Solo Proposal");
      expect(accepted).to.be.true;
    });

    it("should handle single proposal scenario", async function () {
      await votingWithQuorum.connect(owner).registerVoter(voter1.address);
      await votingWithQuorum.connect(owner).registerVoter(voter2.address);
      await votingWithQuorum.connect(owner).addProposal("Only Proposal");
      await votingWithQuorum.connect(owner).startVoting();

      await votingWithQuorum.connect(voter1).vote(0);

      const [description, accepted] = await votingWithQuorum.getWinningProposal();
      expect(description).to.equal("Only Proposal");
      expect(accepted).to.be.true;
    });

    it("should handle scenario where no one votes", async function () {
      await votingWithQuorum.connect(owner).registerVoter(voter1.address);
      await votingWithQuorum.connect(owner).registerVoter(voter2.address);
      await votingWithQuorum.connect(owner).addProposal("Proposal A");
      await votingWithQuorum.connect(owner).startVoting();

      // No votes cast
      const [description, accepted] = await votingWithQuorum.getWinningProposal();
      expect(description).to.equal("");
      expect(accepted).to.be.false;
    });

    it("should maintain state consistency through complex operations", async function () {
      // Create new voting instance
      const newVoting = await (await ethers.getContractFactory("VotingWithQuorum")).deploy(67);
      
      // Register voters
      await newVoting.connect(owner).registerVoter(voter1.address);
      await newVoting.connect(owner).registerVoter(voter2.address);
      await newVoting.connect(owner).registerVoter(voter3.address);

      // Add proposals
      await newVoting.connect(owner).addProposal("Alpha");
      await newVoting.connect(owner).addProposal("Beta");
      await newVoting.connect(owner).addProposal("Gamma");

      // Start voting
      await newVoting.connect(owner).startVoting();

      // Cast votes (3 votes = 100% turnout, 67% quorum is met)
      await newVoting.connect(voter1).vote(1); // Beta
      await newVoting.connect(voter2).vote(1); // Beta
      await newVoting.connect(voter3).vote(0); // Alpha

      // Check state
      expect(await newVoting.totalVoters()).to.equal(3);
      expect(await newVoting.votesCast()).to.equal(3);
      expect(await newVoting.quorumPercent()).to.equal(67);

      const [description, accepted] = await newVoting.getWinningProposal();
      expect(description).to.equal("Beta"); // Beta has 2 votes vs Alpha's 1
      expect(accepted).to.be.true; // 3/3 = 100% >= 67% quorum
    });

    it("should handle very long proposal descriptions", async function () {
      const longDescription = "A".repeat(1000);
      
      await votingWithQuorum.connect(owner).registerVoter(voter1.address);
      await votingWithQuorum.connect(owner).addProposal(longDescription);
      await votingWithQuorum.connect(owner).startVoting();
      await votingWithQuorum.connect(voter1).vote(0);

      const [description, accepted] = await votingWithQuorum.getWinningProposal();
      expect(description).to.equal(longDescription);
      expect(accepted).to.be.true;
    });
  });
});
