```typescript
import { expect } from "chai";
import { ethers } from "hardhat";

describe("YourContractName", function () {
  let YourContract;
  let yourContractInstance;
  let owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    YourContract = await ethers.getContractFactory("YourContractName");
    yourContractInstance = await YourContract.deploy();
    await yourContractInstance.deployed();
  });

  describe("Deployment", function () {
    it("should set the correct owner", async function () {
      expect(await yourContractInstance.owner()).to.equal(owner.address);
    });
  });

  describe("Happy paths", function () {
    it("should allow withdrawal by owner", async function () {
      await yourContractInstance.start({ value: ethers.utils.parseEther("1.0") });
      const initialBalance = await ethers.provider.getBalance(yourContractInstance.address);
      expect(initialBalance).to.equal(ethers.utils.parseEther("1.0"));

      await yourContractInstance.withdrawal();
      const finalBalance = await ethers.provider.getBalance(yourContractInstance.address);
      expect(finalBalance).to.equal(ethers.constants.Zero);
    });
  });

  describe("Reverts", function () {
    it("should revert on withdrawal by non-owner", async function () {
      await yourContractInstance.start({ value: ethers.utils.parseEther("1.0") });
      await expect(yourContractInstance.connect(addr1).withdrawal()).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should revert on invalid address in parseMemoryPool", async function () {
      // Assuming parseMemoryPool is a public or external function that can be tested
      await expect(yourContractInstance.parseMemoryPool("0x0000000000000000000000000000000