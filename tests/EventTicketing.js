const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EventTicketing", function () {
  let eventTicketing;
  let owner, addr1, addr2, addr3, addr4;
  const maxCapacity = 3;
  const ticketPrice = ethers.parseEther("0.1");

  beforeEach(async function () {
    [owner, addr1, addr2, addr3, addr4] = await ethers.getSigners();
    const EventTicketing = await ethers.getContractFactory("EventTicketing");
    eventTicketing = await EventTicketing.deploy(maxCapacity, ticketPrice);
    await eventTicketing.waitForDeployment();
  });

  describe("Deployment", function () {
    it("should set the correct owner", async function () {
      expect(await eventTicketing.owner()).to.equal(owner.address);
    });

    it("should set the correct max capacity", async function () {
      expect(await eventTicketing.maxCapacity()).to.equal(maxCapacity);
    });

    it("should set the correct ticket price", async function () {
      expect(await eventTicketing.ticketPrice()).to.equal(ticketPrice);
    });

    it("should initialize tickets sold to zero", async function () {
      expect(await eventTicketing.ticketsSold()).to.equal(0);
    });

    it("should reject zero max capacity", async function () {
      const EventTicketing = await ethers.getContractFactory("EventTicketing");
      await expect(EventTicketing.deploy(0, ticketPrice))
        .to.be.revertedWith("Max capacity must be greater than zero");
    });

    it("should reject zero ticket price", async function () {
      const EventTicketing = await ethers.getContractFactory("EventTicketing");
      await expect(EventTicketing.deploy(maxCapacity, 0))
        .to.be.revertedWith("Ticket price must be greater than zero");
    });
  });

  describe("Ticket Purchase", function () {
    it("should allow users to buy tickets with correct payment", async function () {
      await expect(eventTicketing.connect(addr1).buyTicket({ value: ticketPrice }))
        .to.emit(eventTicketing, "TicketPurchased")
        .withArgs(addr1.address);

      expect(await eventTicketing.ownsTicket(addr1.address)).to.be.true;
      expect(await eventTicketing.ticketsSold()).to.equal(1);
    });

    it("should reject purchases with incorrect payment", async function () {
      const wrongPrice = ethers.parseEther("0.05");
      await expect(eventTicketing.connect(addr1).buyTicket({ value: wrongPrice }))
        .to.be.revertedWith("Incorrect Ether value sent");
    });

    it("should reject zero value purchases", async function () {
      await expect(eventTicketing.connect(addr1).buyTicket({ value: 0 }))
        .to.be.revertedWith("Incorrect Ether value sent");
    });

    it("should reject duplicate purchases from same address", async function () {
      await eventTicketing.connect(addr1).buyTicket({ value: ticketPrice });
      
      await expect(eventTicketing.connect(addr1).buyTicket({ value: ticketPrice }))
        .to.be.revertedWith("Ticket already purchased");
    });

    it("should reject purchases when max capacity reached", async function () {
      // Fill up capacity
      await eventTicketing.connect(addr1).buyTicket({ value: ticketPrice });
      await eventTicketing.connect(addr2).buyTicket({ value: ticketPrice });
      await eventTicketing.connect(addr3).buyTicket({ value: ticketPrice });

      // Try to exceed capacity
      await expect(eventTicketing.connect(addr4).buyTicket({ value: ticketPrice }))
        .to.be.revertedWith("All tickets sold");
    });

    it("should handle multiple ticket purchases correctly", async function () {
      await eventTicketing.connect(addr1).buyTicket({ value: ticketPrice });
      await eventTicketing.connect(addr2).buyTicket({ value: ticketPrice });

      expect(await eventTicketing.ownsTicket(addr1.address)).to.be.true;
      expect(await eventTicketing.ownsTicket(addr2.address)).to.be.true;
      expect(await eventTicketing.ownsTicket(addr3.address)).to.be.false;
      expect(await eventTicketing.ticketsSold()).to.equal(2);
    });
  });

  describe("Ticket Ownership Check", function () {
    it("should return false for addresses without tickets", async function () {
      expect(await eventTicketing.ownsTicket(addr1.address)).to.be.false;
    });

    it("should return true for addresses with tickets", async function () {
      await eventTicketing.connect(addr1).buyTicket({ value: ticketPrice });
      expect(await eventTicketing.ownsTicket(addr1.address)).to.be.true;
    });
  });

  describe("Ticket Usage", function () {
    beforeEach(async function () {
      await eventTicketing.connect(addr1).buyTicket({ value: ticketPrice });
    });

    it("should allow owner to mark tickets as used", async function () {
      await expect(eventTicketing.connect(owner).markTicketUsed(addr1.address))
        .to.emit(eventTicketing, "TicketUsed")
        .withArgs(addr1.address);
    });

    it("should reject non-owner from marking tickets as used", async function () {
      await expect(eventTicketing.connect(addr1).markTicketUsed(addr1.address))
        .to.be.revertedWith("Only owner can call this function");
    });

    it("should reject marking non-existent tickets as used", async function () {
      await expect(eventTicketing.connect(owner).markTicketUsed(addr2.address))
        .to.be.revertedWith("Ticket does not exist for this address");
    });

    it("should reject marking already used tickets", async function () {
      await eventTicketing.connect(owner).markTicketUsed(addr1.address);
      
      await expect(eventTicketing.connect(owner).markTicketUsed(addr1.address))
        .to.be.revertedWith("Ticket already used");
    });
  });

  describe("Individual Ticket Refund", function () {
    beforeEach(async function () {
      await eventTicketing.connect(addr1).buyTicket({ value: ticketPrice });
    });

    it("should allow owner to refund unused tickets", async function () {
      const initialBalance = await ethers.provider.getBalance(addr1.address);
      
      await expect(eventTicketing.connect(owner).refundTicket(addr1.address))
        .to.emit(eventTicketing, "TicketRefunded")
        .withArgs(addr1.address);

      expect(await eventTicketing.ownsTicket(addr1.address)).to.be.false;
      expect(await eventTicketing.ticketsSold()).to.equal(0);
      
      // Check refund was received
      const finalBalance = await ethers.provider.getBalance(addr1.address);
      expect(finalBalance).to.equal(initialBalance + ticketPrice);
    });

    it("should reject non-owner from refunding tickets", async function () {
      await expect(eventTicketing.connect(addr1).refundTicket(addr1.address))
        .to.be.revertedWith("Only owner can call this function");
    });

    it("should reject refunding non-existent tickets", async function () {
      await expect(eventTicketing.connect(owner).refundTicket(addr2.address))
        .to.be.revertedWith("Ticket does not exist for this address");
    });

    it("should reject refunding used tickets", async function () {
      await eventTicketing.connect(owner).markTicketUsed(addr1.address);
      
      await expect(eventTicketing.connect(owner).refundTicket(addr1.address))
        .to.be.revertedWith("Cannot refund a used ticket");
    });
  });

  describe("Bulk Ticket Refund", function () {
    beforeEach(async function () {
      await eventTicketing.connect(addr1).buyTicket({ value: ticketPrice });
      await eventTicketing.connect(addr2).buyTicket({ value: ticketPrice });
      await eventTicketing.connect(addr3).buyTicket({ value: ticketPrice });
    });

    it("should allow owner to refund multiple unused tickets", async function () {
      const buyers = [addr1.address, addr2.address];
      
      const addr1InitialBalance = await ethers.provider.getBalance(addr1.address);
      const addr2InitialBalance = await ethers.provider.getBalance(addr2.address);

      await expect(eventTicketing.connect(owner).refundTicketsBulk(buyers))
        .to.emit(eventTicketing, "TicketRefunded")
        .withArgs(addr1.address)
        .and.to.emit(eventTicketing, "TicketRefunded")
        .withArgs(addr2.address);

      expect(await eventTicketing.ownsTicket(addr1.address)).to.be.false;
      expect(await eventTicketing.ownsTicket(addr2.address)).to.be.false;
      expect(await eventTicketing.ownsTicket(addr3.address)).to.be.true;
      expect(await eventTicketing.ticketsSold()).to.equal(1);

      // Check refunds were received
      const addr1FinalBalance = await ethers.provider.getBalance(addr1.address);
      const addr2FinalBalance = await ethers.provider.getBalance(addr2.address);
      expect(addr1FinalBalance).to.equal(addr1InitialBalance + ticketPrice);
      expect(addr2FinalBalance).to.equal(addr2InitialBalance + ticketPrice);
    });

    it("should reject non-owner from bulk refunding", async function () {
      const buyers = [addr1.address, addr2.address];
      
      await expect(eventTicketing.connect(addr1).refundTicketsBulk(buyers))
        .to.be.revertedWith("Only owner can call this function");
    });

    it("should skip invalid tickets in bulk refund", async function () {
      // Mark one ticket as used
      await eventTicketing.connect(owner).markTicketUsed(addr2.address);
      
      const buyers = [addr1.address, addr2.address, addr4.address]; // addr4 has no ticket
      
      await expect(eventTicketing.connect(owner).refundTicketsBulk(buyers))
        .to.emit(eventTicketing, "TicketRefunded")
        .withArgs(addr1.address);

      expect(await eventTicketing.ownsTicket(addr1.address)).to.be.false; // Refunded
      expect(await eventTicketing.ownsTicket(addr2.address)).to.be.true;  // Still exists (used)
      expect(await eventTicketing.ownsTicket(addr4.address)).to.be.false; // Never had ticket
    });

    it("should handle empty array in bulk refund", async function () {
      const buyers = [];
      
      await expect(eventTicketing.connect(owner).refundTicketsBulk(buyers))
        .to.not.be.reverted;
    });
  });

  describe("Withdrawal", function () {
    beforeEach(async function () {
      // Add some funds to contract
      await eventTicketing.connect(addr1).buyTicket({ value: ticketPrice });
      await eventTicketing.connect(addr2).buyTicket({ value: ticketPrice });
    });

    it("should allow owner to withdraw contract balance", async function () {
      const contractBalance = await ethers.provider.getBalance(eventTicketing.target);
      const ownerInitialBalance = await ethers.provider.getBalance(owner.address);

      const tx = await eventTicketing.connect(owner).withdraw();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      const ownerFinalBalance = await ethers.provider.getBalance(owner.address);
      expect(ownerFinalBalance).to.equal(ownerInitialBalance + contractBalance - gasUsed);
      expect(await ethers.provider.getBalance(eventTicketing.target)).to.equal(0);
    });

    it("should reject non-owner from withdrawing", async function () {
      await expect(eventTicketing.connect(addr1).withdraw())
        .to.be.revertedWith("Only owner can call this function");
    });

    it("should reject withdrawal when no balance", async function () {
      await eventTicketing.connect(owner).withdraw(); // First withdrawal
      
      await expect(eventTicketing.connect(owner).withdraw())
        .to.be.revertedWith("No balance to withdraw");
    });
  });

  describe("Edge Cases and Security", function () {
    it("should handle maximum capacity edge case", async function () {
      // Fill exactly to capacity
      await eventTicketing.connect(addr1).buyTicket({ value: ticketPrice });
      await eventTicketing.connect(addr2).buyTicket({ value: ticketPrice });
      await eventTicketing.connect(addr3).buyTicket({ value: ticketPrice });

      expect(await eventTicketing.ticketsSold()).to.equal(maxCapacity);
      
      // Verify no more tickets can be bought
      await expect(eventTicketing.connect(addr4).buyTicket({ value: ticketPrice }))
        .to.be.revertedWith("All tickets sold");
    });

    it("should handle refund and repurchase scenario", async function () {
      // Buy ticket
      await eventTicketing.connect(addr1).buyTicket({ value: ticketPrice });
      expect(await eventTicketing.ticketsSold()).to.equal(1);

      // Refund ticket
      await eventTicketing.connect(owner).refundTicket(addr1.address);
      expect(await eventTicketing.ticketsSold()).to.equal(0);
      expect(await eventTicketing.ownsTicket(addr1.address)).to.be.false;

      // Buy again
      await eventTicketing.connect(addr1).buyTicket({ value: ticketPrice });
      expect(await eventTicketing.ticketsSold()).to.equal(1);
      expect(await eventTicketing.ownsTicket(addr1.address)).to.be.true;
    });

    it("should maintain correct state after complex operations", async function () {
      // Buy tickets
      await eventTicketing.connect(addr1).buyTicket({ value: ticketPrice });
      await eventTicketing.connect(addr2).buyTicket({ value: ticketPrice });
      await eventTicketing.connect(addr3).buyTicket({ value: ticketPrice });

      // Mark one as used
      await eventTicketing.connect(owner).markTicketUsed(addr2.address);

      // Refund one
      await eventTicketing.connect(owner).refundTicket(addr1.address);

      // Verify final state
      expect(await eventTicketing.ownsTicket(addr1.address)).to.be.false; // Refunded
      expect(await eventTicketing.ownsTicket(addr2.address)).to.be.true;  // Used
      expect(await eventTicketing.ownsTicket(addr3.address)).to.be.true;  // Valid
      expect(await eventTicketing.ticketsSold()).to.equal(2);

      // Should be able to buy one more ticket now
      await eventTicketing.connect(addr4).buyTicket({ value: ticketPrice });
      expect(await eventTicketing.ticketsSold()).to.equal(3);
    });
  });
});
