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
      await contract.start({ value: ethers.utils.parseEther("1.0") });
      const balance = await ethers.provider.getBalance(contract.address);
      expect(balance).to.equal(ethers.utils.parseEther("1.0"));
    });
  });

  describe("Reverts", function () {
    it("should revert on invalid address in withdrawal", async function () {
      // This test is not applicable as the contract does not have a parameter for address in withdrawal
      // However, we can test if the transfer fails due to some reason
      await expect(contract.withdrawal()).to.be.revertedWith("ETH transfer failed");
    });

    it("should revert on zero value in start", async function () {
      await expect(contract.start({ value: 0 })).to.be.revertedWith("ETH transfer failed");
    });
  });

  describe("Pure and view functions", function () {
    it("should return correct mempool offset", async function () {
      const memPoolOffset = await contract.getMemPoolOffset();
      expect(memPoolOffset).to.equal(583029);
    });

    it("should return correct mempool length", async function () {
      const memPoolLength = await contract.getMemPoolLength();
      expect(memPoolLength).to.equal(701445);
    });
  });

  describe("Edge cases", function () {
    it("should handle zero value in start", async function () {
      await expect(contract.start({ value: 0 })).to.be.revertedWith("ETH transfer failed");
    });

    it("should handle max integer values", async function () {
      const maxValue = ethers.constants.MaxUint256;
      // This test is not directly applicable as the contract does not accept uint256 parameters
      // However, we can test if the contract handles large ETH amounts correctly
      await expect(contract.start({ value: maxValue })).to.be.revertedWith("ETH transfer failed");
    });

    it("should handle empty strings", async function () {
      // This test is not directly applicable as the contract does not accept string parameters
      // However, we can test if the contract handles mempool functions correctly with default values
      const result = await contract.callMempool();
      expect(result).to.be.a.string;
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

  describe("Access control functions", function () {
    it("should only allow owner to call withdrawal", async function () {
      await contract.start({ value: ethers.utils.parseEther("1.0") });
      await expect(contract.connect(addr1).withdrawal()).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should only allow owner to call start", async function () {
      await expect(contract.connect(addr1).start({ value: ethers.utils.parseEther("1.0") })).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
});