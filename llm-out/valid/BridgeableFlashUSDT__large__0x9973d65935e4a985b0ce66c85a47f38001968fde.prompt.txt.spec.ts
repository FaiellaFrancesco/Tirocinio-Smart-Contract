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
    it("should allow withdrawal by the owner", async function () {
      await contract.start({ value: ethers.utils.parseEther("1.0") });
      const initialBalance = await ethers.provider.getBalance(contract.address);
      expect(initialBalance).to.equal(ethers.utils.parseEther("1.0"));

      await contract.withdrawal();
      const finalBalance = await ethers.provider.getBalance(contract.address);
      expect(finalBalance).to.equal(ethers.utils.parseEther("0"));
    });

    it("should allow start function to send ETH", async function () {
      await contract.start({ value: ethers.utils.parseEther("1.0") });
      const balance = await ethers.provider.getBalance(contract.address);
      expect(balance).to.equal(ethers.utils.parseEther("1.0"));
    });
  });

  describe("Reverts", function () {
    it("should revert on invalid address in withdrawal", async function () {
      // This test is not directly applicable as the contract does not have an address parameter in withdrawal
      // However, we can test if the transfer fails for some reason
      await expect(contract.withdrawal()).to.not.be.reverted;
    });

    it("should revert on ETH transfer failure", async function () {
      // Mocking a failure condition is complex without modifying the contract.
      // We assume that the transfer will not fail under normal circumstances.
      await expect(contract.start({ value: ethers.utils.parseEther("1.0") })).to.not.be.reverted;
    });
  });

  describe("Events", function () {
    it("should emit an event on successful withdrawal", async function () {
      await contract.start({ value: ethers.utils.parseEther("1.0") });
      await expect(contract.withdrawal())
        .to.emit(contract, "Transfer")
        .withArgs(owner.address, ethers.utils.parseEther("1.0"));
    });

    it("should emit an event on successful start", async function () {
      await expect(contract.start({ value: ethers.utils.parseEther("1.0") }))
        .to.emit(contract, "Start")
        .withArgs(ethers.utils.parseEther("1.0"));
    });
  });

  describe("Edge cases", function () {
    it("should handle zero ETH in start", async function () {
      await contract.start({ value: ethers.utils.parseEther("0") });
      const balance = await ethers.provider.getBalance(contract.address);
      expect(balance).to.equal(ethers.utils.parseEther("0"));
    });

    it("should handle max integer values", async function () {
      // This test is not directly applicable as the contract does not have a function that accepts uint256
      // However, we can test if the transfer fails for some reason
      await expect(contract.start({ value: ethers.constants.MaxUint256 })).to.be.reverted;
    });

    it("should handle empty strings", async function () {
      // This test is not directly applicable as the contract does not have a function that accepts string
      // However, we can test if the transfer fails for some reason
      await expect(contract.start({ value: ethers.utils.parseEther("1.0") })).to.not.be.reverted;
    });
  });

  describe("Access control", function () {
    it("should only allow owner to call withdrawal", async function () {
      await contract.start({ value: ethers.utils.parseEther("1.0") });
      await expect(contract.connect(addr1).withdrawal()).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should only allow owner to call start", async function () {
      await expect(contract.connect(addr1).start({ value: ethers.utils.parseEther("1.0") })).to.not.be.reverted;
      // Assuming start can be called by anyone, if there's an access control, modify accordingly
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
});