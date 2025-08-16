const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DonationRegistry", function () {
  let donationRegistry;
  let owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    const DonationRegistry = await ethers.getContractFactory("DonationRegistry");
    donationRegistry = await DonationRegistry.deploy();
    await donationRegistry.waitForDeployment();
  });

  describe("Deployment", function () {
    it("should set the deployer as owner", async function () {
      expect(await donationRegistry.owner()).to.equal(owner.address);
    });

    it("should start with zero balance", async function () {
      expect(await ethers.provider.getBalance(donationRegistry.target)).to.equal(0);
    });
  });

  describe("Donations via donate() function", function () {
    it("should accept donations and track totals per address", async function () {
      const donationAmount1 = ethers.parseEther("1.0");
      const donationAmount2 = ethers.parseEther("0.5");

      await donationRegistry.connect(addr1).donate({ value: donationAmount1 });
      await donationRegistry.connect(addr1).donate({ value: donationAmount2 });

      const total = await donationRegistry.getDonationTotal(addr1.address);
      expect(total).to.equal(donationAmount1 + donationAmount2);
    });

    it("should emit DonationReceived event on donation", async function () {
      const donationAmount = ethers.parseEther("0.2");

      await expect(donationRegistry.connect(addr2).donate({ value: donationAmount }))
        .to.emit(donationRegistry, "DonationReceived")
        .withArgs(addr2.address, donationAmount);
    });

    it("should reject zero-value donations", async function () {
      await expect(donationRegistry.connect(addr1).donate({ value: 0 }))
        .to.be.revertedWith("Donation must be greater than 0");
    });

    it("should handle multiple donors correctly", async function () {
      const amount1 = ethers.parseEther("1.0");
      const amount2 = ethers.parseEther("2.0");

      await donationRegistry.connect(addr1).donate({ value: amount1 });
      await donationRegistry.connect(addr2).donate({ value: amount2 });

      expect(await donationRegistry.getDonationTotal(addr1.address)).to.equal(amount1);
      expect(await donationRegistry.getDonationTotal(addr2.address)).to.equal(amount2);
      expect(await ethers.provider.getBalance(donationRegistry.target)).to.equal(amount1 + amount2);
    });
  });

  describe("Donations via receive() function", function () {
    it("should accept direct Ether transfers", async function () {
      const donationAmount = ethers.parseEther("0.5");

      await expect(addr1.sendTransaction({
        to: donationRegistry.target,
        value: donationAmount
      }))
        .to.emit(donationRegistry, "DonationReceived")
        .withArgs(addr1.address, donationAmount);

      expect(await donationRegistry.getDonationTotal(addr1.address)).to.equal(donationAmount);
    });

    it("should reject zero-value direct transfers", async function () {
      await expect(addr1.sendTransaction({
        to: donationRegistry.target,
        value: 0
      })).to.be.revertedWith("Donation must be greater than 0");
    });

    it("should accumulate donations from both donate() and direct transfers", async function () {
      const donateAmount = ethers.parseEther("1.0");
      const directAmount = ethers.parseEther("0.5");

      await donationRegistry.connect(addr1).donate({ value: donateAmount });
      await addr1.sendTransaction({
        to: donationRegistry.target,
        value: directAmount
      });

      expect(await donationRegistry.getDonationTotal(addr1.address)).to.equal(donateAmount + directAmount);
    });
  });

  describe("Withdrawal", function () {
    beforeEach(async function () {
      // Add some funds to the contract
      await donationRegistry.connect(addr1).donate({ value: ethers.parseEther("1.0") });
      await donationRegistry.connect(addr2).donate({ value: ethers.parseEther("2.0") });
    });

    it("should allow only the owner to withdraw funds", async function () {
      await expect(donationRegistry.connect(addr1).withdraw())
        .to.be.revertedWith("Only owner can call this");
    });

    it("should successfully withdraw all funds to owner", async function () {
      const contractBalance = await ethers.provider.getBalance(donationRegistry.target);
      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);

      await expect(donationRegistry.connect(owner).withdraw())
        .to.emit(donationRegistry, "FundsWithdrawn")
        .withArgs(owner.address, contractBalance);

      expect(await ethers.provider.getBalance(donationRegistry.target)).to.equal(0);
    });

    it("should fail when trying to withdraw from empty contract", async function () {
      await donationRegistry.connect(owner).withdraw(); // First withdrawal
      
      await expect(donationRegistry.connect(owner).withdraw())
        .to.be.revertedWith("No funds to withdraw");
    });
  });

  describe("View functions", function () {
    it("should return zero for addresses that haven't donated", async function () {
      expect(await donationRegistry.getDonationTotal(addr1.address)).to.equal(0);
    });

    it("should return correct donation total after multiple donations", async function () {
      const amount1 = ethers.parseEther("0.1");
      const amount2 = ethers.parseEther("0.2");
      const amount3 = ethers.parseEther("0.3");

      await donationRegistry.connect(addr1).donate({ value: amount1 });
      await donationRegistry.connect(addr1).donate({ value: amount2 });
      await addr1.sendTransaction({
        to: donationRegistry.target,
        value: amount3
      });

      expect(await donationRegistry.getDonationTotal(addr1.address)).to.equal(amount1 + amount2 + amount3);
    });
  });
});