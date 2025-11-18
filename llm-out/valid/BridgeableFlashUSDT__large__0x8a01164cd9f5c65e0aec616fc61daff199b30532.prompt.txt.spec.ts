```typescript
import { expect } from "chai";
import { ethers } from "hardhat";

describe("YourContractName", function () {
  let YourContract;
  let contractInstance;
  let owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    YourContract = await ethers.getContractFactory("YourContractName");
    contractInstance = await YourContract.deploy();
    await contractInstance.deployed();
  });

  describe("Deployment", function () {
    it("should set the correct owner", async function () {
      expect(await contractInstance.owner()).to.equal(owner.address);
    });
  });

  describe("Happy paths", function () {
    it("should allow withdrawal by the owner", async function () {
      await contractInstance.start({ value: ethers.utils.parseEther("1.0") });
      const initialBalance = await ethers.provider.getBalance(contractInstance.address);
      expect(initialBalance).to.equal(ethers.utils.parseEther("1.0"));

      await contractInstance.withdrawal();
      const finalBalance = await ethers.provider.getBalance(contractInstance.address);
      expect(finalBalance).to.equal(ethers.utils.parseEther("0"));
    });
  });

  describe("Reverts", function () {
    it("should revert on withdrawal by non-owner", async function () {
      await contractInstance.start({ value: ethers.utils.parseEther("1.0") });
      await expect(contractInstance.connect(addr1).withdrawal()).to.be.revertedWith("ETH transfer failed");
    });

    it("should revert on invalid address in parseMemoryPool", async function () {
      const Contract = await ethers.getContractFactory("YourContractName");
      const contract = await Contract.deploy();
      await contract.deployed();

      await expect(contractInstance.parseMemoryPool("0x0000000000000000000000000000000