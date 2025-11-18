```typescript
import { expect } from "chai";
import { ethers } from "hardhat";

describe("ChocoToken", function () {
  let ChocoToken;
  let chocoToken: any;
  let owner: any, addr1: any, addr2: any;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    ChocoToken = await ethers.getContractFactory("ChocoToken");
    chocoToken = await ChocoToken.deploy();
    await chocoToken.deployed();
  });

  describe("Deployment", function () {
    it("should set the right owner", async function () {
      expect(await chocoToken.owner()).to.equal(owner.address);
    });

    it("should initialize with correct total supply", async function () {
      const totalSupply = ethers.utils.parseUnits("1000000", 18);
      expect(await chocoToken.totalSupply()).to.equal(totalSupply);
    });
  });

  describe("Happy paths", function () {
    it("should transfer tokens between accounts", async function () {
      await chocoToken.transfer(addr1.address, ethers.utils.parseUnits("100", 18));
      expect(await chocoToken.balanceOf(addr1.address)).to.equal(ethers.utils.parseUnits("100", 18));
    });

    it("should approve and transferFrom tokens between accounts", async function () {
      await chocoToken.approve(addr1.address, ethers.utils.parseUnits("50", 18));
      expect(await chocoToken.allowance(owner.address, addr1.address)).to.equal(ethers.utils.parseUnits("50", 18));

      await chocoToken.connect(addr1).transferFrom(owner.address, addr2.address, ethers.utils.parseUnits("30", 18));
      expect(await chocoToken.balanceOf(addr2.address)).to.equal(ethers.utils.parseUnits("30", 18));
    });

    it("should set fees and swap tokens for ETH", async function () {
      await chocoToken.setFee(5, 5, 5, 5);
      expect(await chocoToken._redisFeeOnBuy()).to.equal(5);
      expect(await chocoToken._redisFeeOnSell()).to.equal(5);
      expect(await chocoToken._taxFeeOnBuy()).to.equal(5);
      expect(await chocoToken._taxFeeOnSell()).to.equal(5);

      await chocoToken.setMinSwapTokensThreshold(ethers.utils.parseUnits("10", 18));
      expect(await chocoToken._swapTokensAtAmount()).to.equal(ethers.utils.parseUnits("10", 18));

      await chocoToken.toggleSwap(true);
      expect(await chocoToken.swapEnabled()).to.be.true;

      // Transfer tokens to the contract
      await chocoToken.transfer(chocoToken.address, ethers.utils.parseUnits("20", 18));
      expect(await chocoToken.balanceOf(chocoToken.address)).to.equal(ethers.utils.parseUnits("20", 18));

      // Manually swap tokens for ETH
      await chocoToken.manualswap();
    });

    it("should exclude accounts from fees", async function () {
      await chocoToken.excludeMultipleAccountsFromFees([addr1.address], true);
      expect(await chocoToken.isExcludedFromFee(addr1.address)).to.be.true;
    });
  });

  describe("Reverts", function () {
    it("should revert on invalid address", async function () {
      await expect(
        chocoToken.transfer("0x0000000000000000000000000000000