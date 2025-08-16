const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EscrowService", function () {
  let escrowService;
  let buyer, seller, other;
  const escrowAmount = ethers.parseEther("1.0");

  beforeEach(async function () {
    [buyer, seller, other] = await ethers.getSigners();
    const EscrowService = await ethers.getContractFactory("EscrowService");
    escrowService = await EscrowService.connect(buyer).deploy(seller.address);
    await escrowService.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct buyer and seller", async function () {
      expect(await escrowService.buyer()).to.equal(buyer.address);
      expect(await escrowService.seller()).to.equal(seller.address);
      expect(await escrowService.funded()).to.be.false;
      expect(await escrowService.released()).to.be.false;
      expect(await escrowService.amount()).to.equal(0);
    });

    it("Should have correct initial status", async function () {
      expect(await escrowService.getStatus()).to.equal("Awaiting funding");
    });
  });

  describe("Funding", function () {
    it("Should allow buyer to fund the escrow", async function () {
      await expect(escrowService.connect(buyer).fund({ value: escrowAmount }))
        .to.emit(escrowService, "Funded")
        .withArgs(buyer.address, escrowAmount);
      
      expect(await escrowService.funded()).to.be.true;
      expect(await escrowService.amount()).to.equal(escrowAmount);
      expect(await ethers.provider.getBalance(escrowService.target)).to.equal(escrowAmount);
      expect(await escrowService.getStatus()).to.equal("Funded, awaiting release");
    });

    it("Should reject funding from non-buyer", async function () {
      await expect(escrowService.connect(seller).fund({ value: escrowAmount }))
        .to.be.revertedWith("Only buyer can call this");
      
      await expect(escrowService.connect(other).fund({ value: escrowAmount }))
        .to.be.revertedWith("Only buyer can call this");
    });

    it("Should reject zero amount funding", async function () {
      await expect(escrowService.connect(buyer).fund({ value: 0 }))
        .to.be.revertedWith("Amount must be greater than zero");
    });

    it("Should reject double funding", async function () {
      await escrowService.connect(buyer).fund({ value: escrowAmount });
      
      await expect(escrowService.connect(buyer).fund({ value: escrowAmount }))
        .to.be.revertedWith("Already funded");
    });
  });

  describe("Release", function () {
    beforeEach(async function () {
      await escrowService.connect(buyer).fund({ value: escrowAmount });
    });

    it("Should allow buyer to release funds to seller", async function () {
      const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);
      
      await expect(escrowService.connect(buyer).release())
        .to.emit(escrowService, "Released")
        .withArgs(seller.address, escrowAmount);
      
      const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);
      expect(sellerBalanceAfter).to.equal(sellerBalanceBefore + escrowAmount);
      expect(await escrowService.released()).to.be.true;
      expect(await ethers.provider.getBalance(escrowService.target)).to.equal(0);
      expect(await escrowService.getStatus()).to.equal("Released");
    });

    it("Should reject release from non-buyer", async function () {
      await expect(escrowService.connect(seller).release())
        .to.be.revertedWith("Only buyer can call this");
      
      await expect(escrowService.connect(other).release())
        .to.be.revertedWith("Only buyer can call this");
    });

    it("Should reject double release", async function () {
      await escrowService.connect(buyer).release();
      
      await expect(escrowService.connect(buyer).release())
        .to.be.revertedWith("Already released");
    });
  });

  describe("Release without funding", function () {
    it("Should reject release when not funded", async function () {
      await expect(escrowService.connect(buyer).release())
        .to.be.revertedWith("Not funded yet");
    });
  });

  describe("Status updates", function () {
    it("Should correctly update status through the escrow lifecycle", async function () {
      // Initial state
      expect(await escrowService.getStatus()).to.equal("Awaiting funding");
      
      // After funding
      await escrowService.connect(buyer).fund({ value: escrowAmount });
      expect(await escrowService.getStatus()).to.equal("Funded, awaiting release");
      
      // After release
      await escrowService.connect(buyer).release();
      expect(await escrowService.getStatus()).to.equal("Released");
    });
  });

  describe("Multiple escrow instances", function () {
    it("Should handle multiple independent escrow contracts", async function () {
      // Create another escrow with different parties
      const [newBuyer, newSeller] = await ethers.getSigners();
      const EscrowService = await ethers.getContractFactory("EscrowService");
      const escrowService2 = await EscrowService.connect(newBuyer).deploy(newSeller.address);
      await escrowService2.waitForDeployment();
      
      // Fund first escrow
      await escrowService.connect(buyer).fund({ value: escrowAmount });
      
      // Second escrow should still be unfunded
      expect(await escrowService2.getStatus()).to.equal("Awaiting funding");
      expect(await escrowService.getStatus()).to.equal("Funded, awaiting release");
    });
  });
});
