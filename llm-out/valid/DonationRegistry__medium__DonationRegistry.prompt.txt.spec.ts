import { expect } from "chai";
import { ethers } from "hardhat";

describe("DonationRegistry", function () {
  let contract, owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("DonationRegistry");
    contract = await Factory.deploy();
    await contract.deployed();
  });

  describe("Deployment", function () {
    it("should set the correct owner", async function () {
      expect(await contract.owner()).to.equal(owner.address);
    });
  });

  describe("donate()", function () {
    it("happy path", async function () {
      const donationAmount = ethers.utils.parseEther("1");
      await expect(contract.donate({ value: donationAmount }))
        .to.emit(contract, "DonationReceived")
        .withArgs(owner.address, donationAmount);

      expect(await contract.getDonationTotal(owner.address)).to.equal(donationAmount);
    });

    it("reverts on invalid input", async function () {
      await expect(contract.donate({ value: 0 })).to.be.revertedWith("Donation must be greater than 0");
    });

    it("boundary cases", async function () {
      const maxUint256 = ethers.constants.MaxUint256;
      await expect(contract.donate({ value: maxUint256 })).to.be.reverted; // Assuming block gas limit will prevent this
    });
  });

  describe("getDonationTotal(address)", function () {
    it("happy path", async function () {
      const donationAmount = ethers.utils.parseEther("1");
      await contract.donate({ value: donationAmount });
      expect(await contract.getDonationTotal(owner.address)).to.equal(donationAmount);
    });

    it("boundary cases", async function () {
      expect(await contract.getDonationTotal(ethers.constants.AddressZero)).to.equal(0);
    });
  });

  describe("owner()", function () {
    it("happy path", async function () {
      expect(await contract.owner()).to.equal(owner.address);
    });
  });

  describe("withdraw()", function () {
    it("happy path", async function () {
      const donationAmount = ethers.utils.parseEther("1");
      await contract.donate({ value: donationAmount });

      const initialBalance = await owner.getBalance();
      const tx = await contract.withdraw();

      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);
      const finalBalance = await owner.getBalance();

      expect(finalBalance).to.equal(initialBalance.add(donationAmount).sub(gasUsed));

      await expect(tx)
        .to.emit(contract, "FundsWithdrawn")
        .withArgs(owner.address, donationAmount);

      expect(await ethers.provider.getBalance(contract.getAddress())).to.equal(0);
    });

    it("reverts on invalid input/role", async function () {
      await expect(contract.connect(addr1).withdraw()).to.be.revertedWith("Only owner can call this");
    });
  });
});