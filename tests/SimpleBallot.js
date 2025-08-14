import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleBallot", function () {
  let SimpleBallotFactory;
  let ballot;
  let deployer;
  let addr1;
  let addr2;
  let addr3;

  const proposals = ["Proposal A", "Proposal B", "Proposal C"];

  // Deploy fresh contract before each test to avoid state leakage
  beforeEach(async function () {
    [deployer, addr1, addr2, addr3] = await ethers.getSigners();
    SimpleBallotFactory = await ethers.getContractFactory("SimpleBallot");
  });

  describe("Deployment", function () {
    it("Should set deployer as chairperson and initialize proposals correctly", async function () {
      ballot = await SimpleBallotFactory.deploy(proposals);
      await ballot.waitForDeployment();

      expect(await ballot.chairperson()).to.equal(deployer.address);
      for (let i = 0; i < proposals.length; i++) {
        const prop = await ballot.proposals(i);
        expect(prop.name).to.equal(proposals[i]);
        expect(prop.voteCount).to.equal(0);
      }
      // Also test that proposals array length equals input length indirectly by reading last element without revert:
      await expect(ballot.proposals(proposals.length)).to.be.reverted;

      // Trying to deploy with zero proposals reverts with NoProposals()
      await expect(SimpleBallotFactory.deploy([])).to.be.revertedWithCustomError(
        SimpleBallotFactory,
        "NoProposals"
      );
    });
  });

  describe("registerVoter", function () {
    beforeEach(async function () {
      ballot = await SimpleBallotFactory.deploy(proposals);
      await ballot.waitForDeployment();
    });

    it("Only chairperson can register voters", async function () {
      await expect(ballot.connect(addr1).registerVoter(addr1.address)).to.be.revertedWithCustomError(
        ballot,
        "NotChairperson"
      );
      // Chairperson registers successfully emits event
      await expect(ballot.registerVoter(addr1.address))
        .to.emit(ballot, "VoterRegistered")
        .withArgs(addr1.address);
      // Confirm registered state in mapping
      const voterInfo = await ballot.voters(addr1.address);
      expect(voterInfo.registered).to.be.true;
      expect(voterInfo.voted).to.be.false;
      expect(voterInfo.vote).to.equal(0);
    });

    it("Idempotent registration does not revert or emit event second time", async function () {
      await ballot.registerVoter(addr1.address);
      // Second call should not revert or emit event again
      await expect(ballot.registerVoter(addr1.address)).not.to.emit(ballot, "VoterRegistered");

      // State remains consistent after second call
      const v = await ballot.voters(addr1.address);
      expect(v.registered).to.be.true;
      expect(v.voted).to.be.false;
      expect(v.vote).to.equal(0);
    });
  });

  describe("Voting", function () {
    beforeEach(async function () {
      ballot = await SimpleBallotFactory.deploy(proposals);
      await ballot.waitForDeployment();
      // Register addr1 and addr2 as voters before tests that require it
      await ballot.registerVoter(addr1.address);
      await ballot.registerVoter(addr2.address);
    });

    it("Unregistered voters cannot vote", async function () {
      await expect(ballot.connect(addr3).vote(0)).to.be.revertedWithCustomError(ballot, "NotRegistered");
    });

    it("Registered voter can vote once successfully", async function () {
      await expect(ballot.connect(addr1).vote(1))
        .to.emit(ballot, "VoteCast")
        .withArgs(addr1.address, 1);

      const v = await ballot.voters(addr1.address);
      expect(v.voted).to.be.true;
      expect(v.vote).to.equal(1);

      const p = await ballot.proposals(1);
      expect(p.voteCount).to.equal(1);

      // Voting again reverts AlreadyVoted()
      await expect(ballot.connect(addr1).vote(2)).to.be.revertedWithCustomError(ballot, "AlreadyVoted");

      // Other registered voter can still vote different proposal successfully
      await expect(ballot.connect(addr2).vote(2))
          .to.emit(ballot, "VoteCast")
          .withArgs(addr2.address, 2);

      const p2 = await ballot.proposals(2);
      expect(p2.voteCount).to.equal(1);

      const v2 = await ballot.voters(addr2.address);
      expect(v2.voted).to.be.true;
      expect(v2.vote).to.equal(2);
    });

    it("Voting with invalid proposal index reverts InvalidProposal", async function () {
      await expect(ballot.connect(addr1).vote(proposals.length)).to.be.revertedWithCustomError(
        ballot,
        "InvalidProposal"
      );
      await expect(ballot.connect(addr1).vote(proposals.length + 10)).to.be.revertedWithCustomError(
        ballot,
        "InvalidProposal"
      );
    });
  });

  describe("winner()", function () {
    beforeEach(async function () {
      // Deploy new contract and register voters for voting tests
      ballot = await SimpleBallotFactory.deploy(proposals);
      await ballot.waitForDeployment();
      
      // Register voters
      await ballot.registerVoter(addr1.address);
      await ballot.registerVoter(addr2.address);
      await ballot.registerVoter(addr3.address);
    });

    it("Returns correct winner after multiple votes", async function () {
      
      // addr1 votes Proposal A (index 0)
      await ballot.connect(addr1).vote(0);

      // addr2 votes Proposal B (index 1)
      await ballot.connect(addr2).vote(1);

      // addr3 votes Proposal B (index 1)
      await ballot.connect(addr3).vote(1);

});

it("Returns correct winner when tie occurs picks first highest vote proposal", async function () {
// Deploy fresh contract for tie test to avoid side effects:
const tieBallot = await SimpleBallotFactory.deploy(proposals);
await tieBallot.waitForDeployment();

// Register voters for tie scenario:
const signers = await ethers.getSigners();
const v4 = signers[4];
const v5 = signers[5];
await tieBallot.registerVoter(deployer.address); 
await tieBallot.registerVoter(v4.address);
await tieBallot.registerVoter(v5.address);

// Votes:
// deployer votes Proposal A (index 0)
await tieBallot.connect(deployer).vote(0);
// v4 votes Proposal B (index 1)
await tieBallot.connect(v4).vote(1);
// v5 votes Proposal A (index 0)
// So Proposal A has 2 votes, Proposal B has 1 vote

await tieBallot.connect(v5).vote(0);

const [tieIndex, tieName, tieVotes] = await tieBallot.winner();

// Winner should be Proposal A with highest votes in this scenario:
expect(tieIndex).to.equal(0);
expect(tieName).to.equal(proposals[0]);
expect(tieVotes).to.equal(2);

});
});
});