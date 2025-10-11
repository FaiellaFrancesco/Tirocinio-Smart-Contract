import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("PEPE Token", function () {
  async function deployToken() {
    const PEPEToken = await ethers.getContractFactory("PEPE");
    return await PEPEToken.deploy();
  }

  describe("Deployment", function () {
    it("Should set the correct initial supply and name", async function () {
      const { pepe } = await loadFixture(deployToken);
      expect(await pepe.totalSupply()).to.equal(1000000); // Assuming 1 million tokens
      expect(await pepe.name()).to.equal("PEPE Token");
    });
  });

  describe("Transfer", function () {
    it("Should transfer tokens between accounts", async function () {
      const { pepe, owner, addr1 } = await loadFixture(deployToken);
      await pepe.transfer(addr1.address, 500);
      expect(await pepe.balanceOf(owner.address)).to.equal(999500);
      expect(await pepe.balanceOf(addr1.address)).to.equal(500);
    });

    it("Should fail if sender does not have enough tokens", async function () {
      const { pepe, owner, addr1 } = await loadFixture(deployToken);
      await expect(pepe.transfer(addr1.address, 1000001)).to.be.revertedWith(
        "ERC20: transfer amount exceeds balance"
      );
    });

    it("Should fail if recipient is the zero address", async function () {
      const { pepe, owner } = await loadFixture(deployToken);
      await expect(pepe.transfer(ethers.constants.AddressZero, 500)).to.be.revertedWith(
        "ERC20: transfer to the zero address"
      );
    });
  });

  describe("TransferFrom", function () {
    it("Should transfer tokens from one account to another", async function () {
      const { pepe, owner, addr1 } = await loadFixture(deployToken);
      await pepe.approve(addr1.address, 500);
      await pepe.transferFrom(owner.address, addr1.address, 500);
      expect(await pepe.balanceOf(owner.address)).to.equal(999500);
      expect(await pepe.balanceOf(addr1.address)).to.equal(500);
    });

    it("Should fail if sender does not have enough tokens", async function () {
      const { pepe, owner, addr1 } = await loadFixture(deployToken);
      await expect(pepe.transferFrom(owner.address, addr1.address, 1000)).to.be.revertedWith(
        "ERC20: insufficient allowance"
      );
    });

    it("Should fail if sender is the zero address", async function () {
      const { pepe, owner, addr1 } = await loadFixture(deployToken);
      await expect(pepe.transferFrom(ethers.constants.AddressZero, addr1.address, 500)).to.be.revertedWith(
        "ERC20: transfer from the zero address"
      );
    });

    it("Should fail if recipient is the zero address", async function () {
      const { pepe, owner } = await loadFixture(deployToken);
      await expect(pepe.transferFrom(owner.address, ethers.constants.AddressZero, 500)).to.be.revertedWith(
        "ERC20: transfer to the zero address"
      );
    });
  });

  describe("Approve", function () {
    it("Should set allowance for spender", async function () {
      const { pepe, owner, addr1 } = await loadFixture(deployToken);
      await pepe.approve(addr1.address, 500);
      expect(await pepe.allowance(owner.address, addr1.address)).to.equal(500);
    });

    it("Should fail if spender is the zero address", async function () {
      const { pepe, owner } = await loadFixture(deployToken);
      await expect(pepe.approve(ethers.constants.AddressZero, 500)).to.be.revertedWith(
        "ERC20: approve to the zero address"
      );
    });
  });

  describe("BalanceOf", function () {
    it("Should return the correct balance of an account", async function () {
      const { pepe, owner } = await loadFixture(deployToken);
      expect(await pepe.balanceOf(owner.address)).to.equal(1000000);
    });
  });

  describe("TotalSupply", function () {
    it("Should return the correct total supply of tokens", async function () {
      const { pepe } = await loadFixture(deployToken);
      expect(await pepe.totalSupply()).to.equal(1000000);
    });
  });
});
