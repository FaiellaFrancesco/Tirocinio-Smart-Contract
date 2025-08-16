const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SubscriptionManager", function () {
  let subscriptionManager;
  let owner, user1, user2;
  const subscriptionPrice = ethers.parseEther("0.1");
  const subscriptionDuration = 3600; // 1 hour in seconds

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    const SubscriptionManager = await ethers.getContractFactory("SubscriptionManager");
    subscriptionManager = await SubscriptionManager.deploy(subscriptionPrice, subscriptionDuration);
    await subscriptionManager.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct owner, price, and duration", async function () {
      expect(await subscriptionManager.owner()).to.equal(owner.address);
      expect(await subscriptionManager.subscriptionPrice()).to.equal(subscriptionPrice);
      expect(await subscriptionManager.subscriptionDuration()).to.equal(subscriptionDuration);
    });
  });

  describe("Subscription", function () {
    it("Should allow users to subscribe with correct payment", async function () {
      await expect(subscriptionManager.connect(user1).subscribe({ value: subscriptionPrice }))
        .to.emit(subscriptionManager, "Subscribed");
      
      expect(await subscriptionManager.isSubscribed(user1.address)).to.be.true;
    });

    it("Should reject incorrect payment amounts", async function () {
      const wrongAmount = ethers.parseEther("0.05");
      await expect(subscriptionManager.connect(user1).subscribe({ value: wrongAmount }))
        .to.be.revertedWith("Incorrect payment amount");
    });

    it("Should extend subscription if user is already subscribed", async function () {
      // First subscription
      await subscriptionManager.connect(user1).subscribe({ value: subscriptionPrice });
      const firstExpiry = await subscriptionManager.getExpiry(user1.address);
      
      // Second subscription should extend the duration
      await subscriptionManager.connect(user1).subscribe({ value: subscriptionPrice });
      const secondExpiry = await subscriptionManager.getExpiry(user1.address);
      
      expect(secondExpiry).to.be.greaterThan(firstExpiry);
    });

    it("Should handle new subscription correctly when current has expired", async function () {
      // Subscribe and let it expire by advancing time
      await subscriptionManager.connect(user1).subscribe({ value: subscriptionPrice });
      
      // Advance time beyond subscription duration
      await ethers.provider.send("evm_increaseTime", [subscriptionDuration + 1]);
      await ethers.provider.send("evm_mine");
      
      expect(await subscriptionManager.isSubscribed(user1.address)).to.be.false;
      
      // Subscribe again
      await subscriptionManager.connect(user1).subscribe({ value: subscriptionPrice });
      expect(await subscriptionManager.isSubscribed(user1.address)).to.be.true;
    });

    it("Should emit correct events on subscription", async function () {
      const tx = await subscriptionManager.connect(user1).subscribe({ value: subscriptionPrice });
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);
      const expectedExpiry = block.timestamp + subscriptionDuration;
      
      await expect(tx)
        .to.emit(subscriptionManager, "Subscribed")
        .withArgs(user1.address, expectedExpiry);
    });
  });

  describe("Parameter Updates", function () {
    it("Should allow owner to update subscription parameters", async function () {
      const newPrice = ethers.parseEther("0.2");
      const newDuration = 7200; // 2 hours
      
      await expect(subscriptionManager.updateParameters(newPrice, newDuration))
        .to.emit(subscriptionManager, "ParametersUpdated")
        .withArgs(newPrice, newDuration);
      
      expect(await subscriptionManager.subscriptionPrice()).to.equal(newPrice);
      expect(await subscriptionManager.subscriptionDuration()).to.equal(newDuration);
    });

    it("Should reject parameter updates from non-owner", async function () {
      const newPrice = ethers.parseEther("0.2");
      const newDuration = 7200;
      
      await expect(subscriptionManager.connect(user1).updateParameters(newPrice, newDuration))
        .to.be.revertedWith("Only owner can call this");
    });
  });

  describe("Withdrawal", function () {
    beforeEach(async function () {
      // Add some funds to the contract
      await subscriptionManager.connect(user1).subscribe({ value: subscriptionPrice });
      await subscriptionManager.connect(user2).subscribe({ value: subscriptionPrice });
    });

    it("Should allow owner to withdraw funds", async function () {
      const contractBalance = await ethers.provider.getBalance(subscriptionManager.target);
      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      
      const tx = await subscriptionManager.withdraw();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
      expect(ownerBalanceAfter).to.equal(ownerBalanceBefore + contractBalance - gasUsed);
      expect(await ethers.provider.getBalance(subscriptionManager.target)).to.equal(0);
    });

    it("Should reject withdrawal from non-owner", async function () {
      await expect(subscriptionManager.connect(user1).withdraw())
        .to.be.revertedWith("Only owner can call this");
    });
  });

  describe("View Functions", function () {
    it("Should correctly report subscription status", async function () {
      expect(await subscriptionManager.isSubscribed(user1.address)).to.be.false;
      
      await subscriptionManager.connect(user1).subscribe({ value: subscriptionPrice });
      expect(await subscriptionManager.isSubscribed(user1.address)).to.be.true;
      
      // Advance time to expire subscription
      await ethers.provider.send("evm_increaseTime", [subscriptionDuration + 1]);
      await ethers.provider.send("evm_mine");
      
      expect(await subscriptionManager.isSubscribed(user1.address)).to.be.false;
    });

    it("Should return correct expiry times", async function () {
      expect(await subscriptionManager.getExpiry(user1.address)).to.equal(0);
      
      await subscriptionManager.connect(user1).subscribe({ value: subscriptionPrice });
      const expiry = await subscriptionManager.getExpiry(user1.address);
      expect(expiry).to.be.greaterThan(0);
    });
  });

  describe("Receive Function", function () {
    it("Should reject direct Ether transfers", async function () {
      await expect(user1.sendTransaction({
        to: subscriptionManager.target,
        value: subscriptionPrice
      })).to.be.revertedWith("Use subscribe() to make a payment");
    });
  });
});
