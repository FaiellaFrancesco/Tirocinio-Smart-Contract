const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VotingSystem", function () {
  let votingSystem;
  let owner, user1, user2, user3;
  const votingDuration = 3600; // 1 hour in seconds

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();
    const VotingSystem = await ethers.getContractFactory("VotingSystem");
    votingSystem = await VotingSystem.deploy();
    await votingSystem.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should initialize with zero proposals", async function () {
      expect(await votingSystem.proposalCount()).to.equal(0);
    });
  });

  describe("Proposal Creation", function () {
    it("Should allow anyone to create a proposal", async function () {
      const description = "Should we implement feature X?";
      
      const tx = await votingSystem.connect(user1).createProposal(description, votingDuration);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);
      const expectedEndTime = block.timestamp + votingDuration;
      
      await expect(tx)
        .to.emit(votingSystem, "ProposalCreated")
        .withArgs(1, description, expectedEndTime);
      
      expect(await votingSystem.proposalCount()).to.equal(1);
    });

    it("Should reject proposals with zero duration", async function () {
      await expect(votingSystem.createProposal("Test proposal", 0))
        .to.be.revertedWith("Duration must be > 0");
    });

    it("Should increment proposal count for multiple proposals", async function () {
      await votingSystem.createProposal("Proposal 1", votingDuration);
      await votingSystem.createProposal("Proposal 2", votingDuration);
      await votingSystem.createProposal("Proposal 3", votingDuration);
      
      expect(await votingSystem.proposalCount()).to.equal(3);
    });

    it("Should emit correct event data on proposal creation", async function () {
      const description = "Test proposal for events";
      const tx = await votingSystem.createProposal(description, votingDuration);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);
      const expectedEndTime = block.timestamp + votingDuration;
      
      await expect(tx)
        .to.emit(votingSystem, "ProposalCreated")
        .withArgs(1, description, expectedEndTime);
    });
  });

  describe("Voting", function () {
    beforeEach(async function () {
      await votingSystem.createProposal("Test proposal", votingDuration);
    });

    it("Should allow users to vote on active proposals", async function () {
      await expect(votingSystem.connect(user1).vote(1))
        .to.emit(votingSystem, "Voted")
        .withArgs(1, user1.address);
      
      const proposal = await votingSystem.connect(user1).getProposal(1);
      expect(proposal[1]).to.equal(1); // vote count
      expect(proposal[3]).to.be.true; // hasVoted for user1
    });

    it("Should reject votes on non-existent proposals", async function () {
      await expect(votingSystem.connect(user1).vote(999))
        .to.be.reverted; // This will revert because the proposal doesn't exist
    });

    it("Should reject double voting from the same address", async function () {
      await votingSystem.connect(user1).vote(1);
      
      await expect(votingSystem.connect(user1).vote(1))
        .to.be.revertedWith("Already voted");
    });

    it("Should allow multiple users to vote on the same proposal", async function () {
      await votingSystem.connect(user1).vote(1);
      await votingSystem.connect(user2).vote(1);
      await votingSystem.connect(user3).vote(1);
      
      const proposal = await votingSystem.connect(user1).getProposal(1);
      expect(proposal[1]).to.equal(3); // vote count should be 3
    });

    it("Should reject votes after voting period ends", async function () {
      // Advance time beyond voting duration
      await ethers.provider.send("evm_increaseTime", [votingDuration + 1]);
      await ethers.provider.send("evm_mine");
      
      await expect(votingSystem.connect(user1).vote(1))
        .to.be.revertedWith("Voting has ended");
    });

    it("Should handle voting just before deadline", async function () {
      // Advance time to just before deadline
      await ethers.provider.send("evm_increaseTime", [votingDuration - 1]);
      await ethers.provider.send("evm_mine");
      
      // Should still be able to vote
      await expect(votingSystem.connect(user1).vote(1))
        .to.emit(votingSystem, "Voted");
    });
  });

  describe("Proposal Information", function () {
    beforeEach(async function () {
      await votingSystem.createProposal("Test proposal for info", votingDuration);
    });

    it("Should return correct proposal information", async function () {
      const proposal = await votingSystem.connect(user1).getProposal(1);
      expect(proposal[0]).to.equal("Test proposal for info"); // description
      expect(proposal[1]).to.equal(0); // initial vote count
      expect(proposal[2]).to.be.greaterThan(0); // end time
      expect(proposal[3]).to.be.false; // hasVoted for caller
    });

    it("Should update vote count after voting", async function () {
      await votingSystem.connect(user1).vote(1);
      await votingSystem.connect(user2).vote(1);
      
      const proposal = await votingSystem.connect(user1).getProposal(1);
      expect(proposal[1]).to.equal(2); // vote count
    });

    it("Should track individual voting status correctly", async function () {
      // Before voting
      let proposal = await votingSystem.connect(user1).getProposal(1);
      expect(proposal[3]).to.be.false; // hasVoted should be false
      
      // After voting
      await votingSystem.connect(user1).vote(1);
      proposal = await votingSystem.connect(user1).getProposal(1);
      expect(proposal[3]).to.be.true; // hasVoted should be true
      
      // Other user should still show false
      proposal = await votingSystem.connect(user2).getProposal(1);
      expect(proposal[3]).to.be.false; // hasVoted should be false for user2
    });
  });

  describe("Multiple Proposals", function () {
    it("Should handle multiple independent proposals", async function () {
      await votingSystem.createProposal("Proposal A", votingDuration);
      await votingSystem.createProposal("Proposal B", votingDuration * 2);
      
      // Vote on both proposals
      await votingSystem.connect(user1).vote(1);
      await votingSystem.connect(user1).vote(2);
      await votingSystem.connect(user2).vote(1);
      
      const proposalA = await votingSystem.connect(user1).getProposal(1);
      const proposalB = await votingSystem.connect(user1).getProposal(2);
      
      expect(proposalA[1]).to.equal(2); // Proposal A: 2 votes
      expect(proposalB[1]).to.equal(1); // Proposal B: 1 vote
    });

    it("Should have different end times for proposals with different durations", async function () {
      await votingSystem.createProposal("Short proposal", 1800); // 30 minutes
      await votingSystem.createProposal("Long proposal", 7200); // 2 hours
      
      const shortProposal = await votingSystem.connect(user1).getProposal(1);
      const longProposal = await votingSystem.connect(user1).getProposal(2);
      
      expect(longProposal[2]).to.be.greaterThan(shortProposal[2]); // Long proposal ends later
    });
  });

  describe("Edge Cases", function () {
    it("Should handle proposals with very long descriptions", async function () {
      const longDescription = "A".repeat(1000); // Very long description
      
      await expect(votingSystem.createProposal(longDescription, votingDuration))
        .to.emit(votingSystem, "ProposalCreated");
      
      const proposal = await votingSystem.connect(user1).getProposal(1);
      expect(proposal[0]).to.equal(longDescription);
    });

    it("Should handle proposals with minimum duration", async function () {
      await votingSystem.createProposal("Minimum duration proposal", 1);
      
      const proposal = await votingSystem.connect(user1).getProposal(1);
      expect(proposal[2]).to.be.greaterThan(0); // Should have a valid end time
    });

    it("Should handle voting on expired proposal correctly", async function () {
      await votingSystem.createProposal("Quick proposal", 1); // 1 second duration
      
      // Wait for proposal to expire
      await ethers.provider.send("evm_increaseTime", [2]);
      await ethers.provider.send("evm_mine");
      
      await expect(votingSystem.connect(user1).vote(1))
        .to.be.revertedWith("Voting has ended");
    });
  });
});
