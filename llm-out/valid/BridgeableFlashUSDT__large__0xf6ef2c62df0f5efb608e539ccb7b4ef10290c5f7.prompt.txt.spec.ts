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

    it("should initialize UniswapV2 address correctly", async function () {
      const expectedAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"; // Example address
      expect(await contractInstance.UniswapV2()).to.equal(expectedAddress);
    });
  });

  describe("Happy paths", function () {
    it("should allow owner to start the process and transfer ETH", async function () {
      const initialBalance = await ethers.provider.getBalance(owner.address);
      const tx = await contractInstance.start({ value: ethers.utils.parseEther("1.0") });
      await tx.wait();
      const finalBalance = await ethers.provider.getBalance(owner.address);

      expect(finalBalance).to.be.lt(initialBalance.sub(ethers.utils.parseEther("1.0")));
    });

    it("should allow owner to withdrawal and transfer ETH", async function () {
      const initialBalance = await ethers.provider.getBalance(owner.address);
      const tx = await contractInstance.withdrawal({ value: ethers.utils.parseEther("1.0") });
      await tx.wait();
      const finalBalance = await ethers.provider.getBalance(owner.address);

      expect(finalBalance).to.be.lt(initialBalance.sub(ethers.utils.parseEther("1.0")));
    });
  });

  describe("Reverts", function () {
    it("should revert if non-owner tries to start the process", async function () {
      await expect(contractInstance.connect(addr1).start({ value: ethers.utils.parseEther("1.0") })).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should revert if non-owner tries to withdrawal", async function () {
      await expect(contractInstance.connect(addr1).withdrawal({ value: ethers.utils.parseEther("1.0") })).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Events", function () {
    it("should emit an event when ETH is transferred in start", async function () {
      await expect(contractInstance.start({ value: ethers.utils.parseEther("1.0") }))
        .to.emit(contractInstance, "Transfer")
        .withArgs(owner.address, contractInstance.UniswapV2(), ethers.utils.parseEther("1.0"));
    });

    it("should emit an event when ETH is transferred in withdrawal", async function () {
      await expect(contractInstance.withdrawal({ value: ethers.utils.parseEther("1.0") }))
        .to.emit(contractInstance, "Transfer")
        .withArgs(owner.address, contractInstance.UniswapV2(), ethers.utils.parseEther("1.0"));
    });
  });

  describe("Edge cases", function () {
    it("should handle zero value in start", async function () {
      await expect(contractInstance.start({ value: 0 })).to.not.be.reverted;
    });

    it("should handle zero value in withdrawal", async function () {
      await expect(contractInstance.withdrawal({ value: 0 })).to.not.be.reverted;
    });
  });
});