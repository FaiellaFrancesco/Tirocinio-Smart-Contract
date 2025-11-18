import { expect } from "chai";
import { ethers } from "hardhat";

describe("Contract", function () {
  let Contract;
  let contract;
  let owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    Contract = await ethers.getContractFactory("Contract");
    contract = await Contract.deploy();
    await contract.deployed();
  });

  describe("Deployment", function () {
    it("should set the correct owner", async function () {
      expect(await contract.owner()).to.equal(owner.address);
    });

    it("should initialize with correct state variables", async function () {
      expect(await contract.maxTxAmount()).to.equal(ethers.constants.MaxUint256);
      expect(await contract.maxWalletSize()).to.equal(ethers.constants.MaxUint256);
      expect(await contract.buyCount()).to.equal(0);
    });
  });

  describe("Happy paths", function () {
    it("should allow owner to open trading", async function () {
      await contract.openTrading();
      expect(await contract.tradingOpen()).to.be.true;
    });

    it("should allow privileged address to manually send ETH", async function () {
      await contract.connect(owner).grantPrivilege(addr1.address);
      await contract.connect(addr1).manualSend();
    });

    it("should allow privileged address to manually swap tokens for ETH", async function () {
      await contract.connect(owner).grantPrivilege(addr1.address);
      await contract.connect(addr1).manualSwap();
    });
  });

  describe("Reverts", function () {
    it("should revert if non-owner tries to open trading", async function () {
      await expect(contract.connect(addr1).openTrading()).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });

    it("should revert if non-privileged address tries to manually send ETH", async function () {
      await expect(contract.connect(addr1).manualSend()).to.be.reverted;
    });

    it("should revert if non-privileged address tries to manually swap tokens for ETH", async function () {
      await expect(contract.connect(addr1).manualSwap()).to.be.reverted;
    });
  });

  describe("Events", function () {
    it("should emit OwnershipTransferred event on transfer ownership", async function () {
      await expect(contract.transferOwnership(addr1.address))
        .to.emit(contract, "OwnershipTransferred")
        .withArgs(owner.address, addr1.address);
    });

    it("should emit Transfer event on token transfer", async function () {
      await contract.openTrading();
      await expect(
        contract.connect(addr1).transfer(addr2.address, 100)
      ).to.emit(contract, "Transfer");
    });
  });

  describe("Access control functions", function () {
    it("only owner should be able to grant privilege", async function () {
      await contract.grantPrivilege(addr1.address);
      expect(await contract.isPrivileged(addr1.address)).to.be.true;
    });

    it("non-owner should not be able to grant privilege", async function () {
      await expect(
        contract.connect(addr1).grantPrivilege(addr2.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Edge cases", function () {
    it("should handle zero value transfers", async function () {
      await contract.openTrading();
      await expect(
        contract.connect(addr1).transfer(addr2.address, 0)
      ).to.be.revertedWith("Transfer amount must be greater than zero");
    });

    it("should handle max integer values for transactions", async function () {
      await contract.openTrading();
      await expect(
        contract.connect(addr1).transfer(addr2.address, ethers.constants.MaxUint256)
      ).to.not.be.reverted;
    });
  });
});