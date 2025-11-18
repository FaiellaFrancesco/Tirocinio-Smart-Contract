import { expect } from "chai";
import { ethers } from "hardhat";

describe("ArcaneToken", function () {
  let ArcaneToken;
  let arcaneToken: any;
  let owner: any, addr1: any, addr2: any;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    ArcaneToken = await ethers.getContractFactory("ArcaneToken");
    arcaneToken = await ArcaneToken.deploy();
    await arcaneToken.deployed();
  });

  describe("Deployment", function () {
    it("should set the correct owner", async function () {
      expect(await arcaneToken.owner()).to.equal(owner.address);
    });

    it("should initialize state variables correctly", async function () {
      expect(await arcaneToken.buyTax()).to.equal(0);
      expect(await arcaneToken.sellTax()).to.equal(0);
      expect(await arcaneToken.transferTax()).to.equal(0);
      expect(await arcaneToken.tokensForSwap()).to.equal(ethers.utils.parseEther("1"));
    });
  });

  describe("Happy Paths", function () {
    it("should allow owner to set buy tax", async function () {
      await arcaneToken.setBuyTax(5);
      expect(await arcaneToken.buyTax()).to.equal(5);
    });

    it("should allow owner to set sell tax", async function () {
      await arcaneToken.setSellTax(5);
      expect(await arcaneToken.sellTax()).to.equal(5);
    });

    it("should allow owner to set transfer tax", async function () {
      await arcaneToken.setTransferTax(5);
      expect(await arcaneToken.transferTax()).to.equal(5);
    });

    it("should allow owner to set tokens for swap", async function () {
      await arcaneToken.setTokensForSwap(ethers.utils.parseEther("2"));
      expect(await arcaneToken.tokensForSwap()).to.equal(ethers.utils.parseEther("2"));
    });

    it("should allow owner to exclude from fees", async function () {
      await arcaneToken.excludeFromFees(addr1.address, true);
      expect(await arcaneToken.excludedFromFees(addr1.address)).to.be.true;
    });

    it("should allow owner to exclude from limits", async function () {
      await arcaneToken.excludeFromLimits(addr1.address, true);
      expect(await arcaneToken.excludedFromLimits(addr1.address)).to.be.true;
    });

    it("should allow owner to set market pair", async function () {
      await arcaneToken.setMarketPair(addr1.address, true);
      expect(await arcaneToken.marketPairs(addr1.address)).to.be.true;
    });
  });

  describe("Reverts", function () {
    it("should revert when non-owner tries to set buy tax", async function () {
      await expect(arcaneToken.connect(addr1).setBuyTax(5)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should revert when setting invalid address as market pair", async function () {
      await expect(arcaneToken.setMarketPair(ethers.constants.AddressZero, true)).to.be.revertedWith("PairAlreadySet()");
    });
  });

  describe("Events", function () {
    it("should emit event on setting buy tax", async function () {
      await expect(arcaneToken.setBuyTax(5))
        .to.emit(arcaneToken, "BuyTaxUpdated")
        .withArgs(0, 5);
    });

    it("should emit event on setting sell tax", async function () {
      await expect(arcaneToken.setSellTax(5))
        .to.emit(arcaneToken, "SellTaxUpdated")
        .withArgs(0, 5);
    });

    it("should emit event on setting transfer tax", async function () {
      await expect(arcaneToken.setTransferTax(5))
        .to.emit(arcaneToken, "TransferTaxUpdated")
        .withArgs(0, 5);
    });

    it("should emit event on setting tokens for swap", async function () {
      await expect(arcaneToken.setTokensForSwap(ethers.utils.parseEther("2")))
        .to.emit(arcaneToken, "TokensForSwapUpdated")
        .withArgs(ethers.utils.parseEther("1"), ethers.utils.parseEther("2"));
    });

    it("should emit event on excluding from fees", async function () {
      await expect(arcaneToken.excludeFromFees(addr1.address, true))
        .to.emit(arcaneToken, "ExcludedFromFees")
        .withArgs(addr1.address, true);
    });

    it("should emit event on excluding from limits", async function () {
      await expect(arcaneToken.excludeFromLimits(addr1.address, true))
        .to.emit(arcaneToken, "ExcludedFromLimits")
        .withArgs(addr1.address, true);
    });

    it("should emit event on setting market pair", async function () {
      await expect(arcaneToken.setMarketPair(addr1.address, true))
        .to.emit(arcaneToken, "MarketPairStatusUpdated")
        .withArgs(addr1.address, true);
    });
  });

  describe("Edge Cases", function () {
    it("should handle zero values for taxes", async function () {
      await arcaneToken.setBuyTax(0);
      expect(await arcaneToken.buyTax()).to.equal(0);

      await arcaneToken.setSellTax(0);
      expect(await arcaneToken.sellTax()).to.equal(0);

      await arcaneToken.setTransferTax(0);
      expect(await arcaneToken.transferTax()).to.equal(0);
    });

    it("should handle max integer values for taxes", async function () {
      const maxUint256 = ethers.constants.MaxUint256;
      await arcaneToken.setBuyTax(maxUint256);
      expect(await arcaneToken.buyTax()).to.equal(maxUint256);

      await arcaneToken.setSellTax(maxUint256);
      expect(await arcaneToken.sellTax()).to.equal(maxUint256);

      await arcaneToken.setTransferTax(maxUint256);
      expect(await arcaneToken.transferTax()).to.equal(maxUint256);
    });

    it("should handle zero address for market pair", async function () {
      await expect(arcaneToken.setMarketPair(ethers.constants.AddressZero, true)).to.be.revertedWith("PairAlreadySet()");
    });
  });
});