import { expect } from "chai";
import { ethers } from "hardhat";

describe("ContractName", function () {
  let Contract;
  let contract;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    Contract = await ethers.getContractFactory("ContractName");
    contract = await Contract.deploy();
    await contract.deployed();
  });

  describe("Deployment", function () {
    it("should set the correct owner", async function () {
      expect(await contract.owner()).to.equal(owner.address);
    });
  });

  describe("Happy paths", function () {
    it("should allow withdrawal by owner", async function () {
      await contract.start({ value: ethers.utils.parseEther("1.0") });
      const initialBalance = await ethers.provider.getBalance(owner.address);

      await expect(contract.withdrawal())
        .to.emit(contract, "Withdrawal")
        .withArgs(ethers.utils.parseEther("1.0"));

      const finalBalance = await ethers.provider.getBalance(owner.address);
      expect(finalBalance).to.be.gt(initialBalance);
    });

    it("should allow start function to send ETH", async function () {
      const initialBalance = await ethers.provider.getBalance(contract.address);

      await contract.start({ value: ethers.utils.parseEther("1.0") });

      const finalBalance = await ethers.provider.getBalance(contract.address);
      expect(finalBalance).to.equal(initialBalance.add(ethers.utils.parseEther("1.0")));
    });
  });

  describe("Reverts", function () {
    it("should revert on invalid address in withdrawal", async function () {
      // Assuming there's a check for the recipient address
      await expect(contract.withdrawal()).to.be.revertedWith("ETH transfer failed");
    });

    it("should revert if non-owner tries to withdraw", async function () {
      await contract.start({ value: ethers.utils.parseEther("1.0") });
      await expect(contract.connect(addr1).withdrawal()).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Events", function () {
    it("should emit Withdrawal event on successful withdrawal", async function () {
      await contract.start({ value: ethers.utils.parseEther("1.0") });

      await expect(contract.withdrawal())
        .to.emit(contract, "Withdrawal")
        .withArgs(ethers.utils.parseEther("1.0"));
    });
  });

  describe("Edge cases", function () {
    it("should handle zero ETH in start function", async function () {
      const initialBalance = await ethers.provider.getBalance(contract.address);

      await contract.start({ value: 0 });

      const finalBalance = await ethers.provider.getBalance(contract.address);
      expect(finalBalance).to.equal(initialBalance);
    });

    it("should handle max integer values", async function () {
      // Assuming there's a check for max integer values
      const maxValue = ethers.constants.MaxUint256;
      await expect(contract.start({ value: maxValue })).to.be.revertedWith("ETH transfer failed");
    });
  });

  describe("Pure and view functions", function () {
    it("should return correct mempool offset", async function () {
      const expectedOffset = "x" + contract.checkLiquidity(contract.getMemPoolOffset());
      expect(await contract.callMempool()).to.include(expectedOffset);
    });

    it("should convert uint to string correctly", async function () {
      expect(await contract.uint2str(123)).to.equal("123");
      expect(await contract.uint2str(0)).to.equal("0");
    });
  });

  describe("Access control functions", function () {
    it("should only allow owner to call withdrawal", async function () {
      await contract.start({ value: ethers.utils.parseEther("1.0") });
      await expect(contract.connect(addr1).withdrawal()).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should only allow owner to start", async function () {
      await expect(contract.connect(addr1).start({ value: ethers.utils.parseEther("1.0") })).to.not.be.reverted;
    });
  });
});