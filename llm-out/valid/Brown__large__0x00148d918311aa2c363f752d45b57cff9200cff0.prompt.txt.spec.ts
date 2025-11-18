Certainly! Below is a comprehensive TypeScript test suite for the provided smart contract using `ethers.js v5` and `Chai`. This test suite covers deployment, happy paths, reverts, events, edge cases, and access control.

```typescript
import { expect } from "chai";
import { ethers } from "hardhat";

describe("TokenContract", function () {
  let Token;
  let token;
  let owner;
  let addr1;
  let addr2;
  let dexRouterAddress; // Replace with a valid Uniswap V2 Router address for testing
  let dexPairAddress;   // Replace with a valid Uniswap V2 Pair address for testing

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    Token = await ethers.getContractFactory("TokenContract");
    token = await Token.deploy(dexRouterAddress, dexPairAddress);
    await token.deployed();
  });

  describe("Deployment", function () {
    it("should set the correct owner", async function () {
      expect(await token.owner()).to.equal(owner.address);
    });

    it("should initialize swapBackValueMin and swapBackValueMax correctly", async function () {
      // Assuming default values are set in the constructor
      const swapBackValueMin = await token.swapBackValueMin();
      const swapBackValueMax = await token.swapBackValueMax();
      expect(swapBackValueMin).to.equal(ethers.utils.parseEther("1")); // Example value
      expect(swapBackValueMax).to.equal(ethers.utils.parseEther("10")); // Example value
    });
  });

  describe("Happy Paths", function () {
    it("should allow owner to set tradingEnabled", async function () {
      await token.setTradingEnabled(true);
      expect(await token.tradingEnabled()).to.be.true;
    });

    it("should allow owner to exclude address from fees and limits", async function () {
      await token.excludeFromFees(addr1.address, true);
      await token.excludeFromLimits(addr1.address, true);
      const isExcludedFromFees = await token.transferTaxExempt(addr1.address);
      const isExcludedFromLimits = await token.transferLimitExempt(addr1.address);
      expect(isExcludedFromFees).to.be.true;
      expect(isExcludedFromLimits).to.be.true;
    });

    it("should allow owner to set swapBackValues", async function () {
      await token.setSwapBackValues(ethers.utils.parseEther("2"), ethers.utils.parseEther("15"));
      const newSwapBackValueMin = await token.swapBackValueMin();
      const newSwapBackValueMax = await token.swapBackValueMax();
      expect(newSwapBackValueMin).to.equal(ethers.utils.parseEther("2"));
      expect(newSwapBackValueMax).to.equal(ethers.utils.parseEther("15"));
    });

    it("should allow owner to set taxes", async function () {
      await token.setTaxes(3, 4, 2, 3);
      const [buyTax, sellTax, transferTax] = await token.getTaxes();
      expect(buyTax).to.equal(3);
      expect(sellTax).to.equal(4);
      expect(transferTax).to.equal(2);
    });

    it("should allow owner to set wallets", async function () {
      await token.setWallets(addr1.address, addr2.address);
      const projectWallet = await token.projectWallet();
      const marketingWallet = await token.marketingWallet();
      expect(projectWallet).to.equal(addr1.address);
      expect(marketingWallet).to.equal(addr2.address);
    });

    it("should allow owner to set anti", async function () {
      await token.setAnti(false);
      expect(await token.anti()).to.be.false;
    });
  });

  describe("Reverts", function () {
    it("should revert when non-owner tries to set tradingEnabled", async function () {
      await expect(token.connect(addr1).setTradingEnabled(true)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should revert when setting invalid swapBackValues", async function () {
      await expect(token.setSwapBackValues(ethers.utils.parseEther("20"), ethers.utils.parseEther("15"))).to.be.revertedWith("Invalid values");
    });

    it("should revert when transferring to blacklisted address", async function () {
      await token.blacklistAddress(addr1.address, true);
      await expect(token.transfer(addr1.address, 1)).to.be.revertedWith("Blacklisted address");
    });

    it("should revert when transferring more than maxTx", async function () {
      await token.setTradingEnabled(true);
      await token.excludeFromFees(owner.address, false);
      await token.excludeFromLimits(owner.address, false);
      const maxTx = await token.maxTx();
      await expect(token.transfer(addr1.address, maxTx.add(1))).to.be.revertedWith("Buy transfer amount exceeds the maxTx.");
    });

    it("should revert when transferring to address exceeding maxWallet", async function () {
      await token.setTradingEnabled(true);
      await token.excludeFromFees(owner.address, false);
      await token.excludeFromLimits(owner.address, false);
      const maxWallet = await token.maxWallet();
      await expect(token.transfer(addr1.address, maxWallet.add(1))).to.be.revertedWith("Max wallet exceeded");
    });
  });

  describe("Events", function () {
    it("should emit TradingEnabledSet event when trading is enabled", async function () {
      await expect(token.setTradingEnabled(true))
        .to.emit(token, "TradingEnabledSet")
        .withArgs(true);
    });

    it("should emit ExcludedFromFeesSet event when address is excluded from fees", async function () {
      await expect(token.excludeFromFees(addr1.address, true))
        .to.emit(token, "ExcludedFromFeesSet")
        .withArgs(addr1.address, true);
    });

    it("should emit ExcludedFromLimitsSet event when address is excluded from limits", async function () {
      await expect(token.excludeFromLimits(addr1.address, true))
        .to.emit(token, "ExcludedFromLimitsSet")
        .withArgs(addr1.address, true);
    });

    it("should emit SwapBackValuesSet event when swap back values are set", async function () {
      await expect(token.setSwapBackValues(ethers.utils.parseEther("2"), ethers.utils.parseEther("15")))
        .to.emit(token, "SwapBackValuesSet")
        .withArgs(ethers.utils.parseEther("2"), ethers.utils.parseEther("15"));
    });

    it("should emit TaxesSet event when taxes are set", async function () {
      await expect(token.setTaxes(3, 4, 2, 3))
        .to.emit(token, "TaxesSet")
        .withArgs(3, 4, 2, 3);
    });

    it("should emit WalletsSet event when wallets are set", async function () {
      await expect(token.setWallets(addr1.address, addr2.address))
        .to.emit(token, "WalletsSet")
        .withArgs(addr1.address, addr2.address);
    });

    it("should emit AntiSet event when anti is set", async function () {
      await expect(token.setAnti(false))
        .to.emit(token, "AntiSet")
        .withArgs(false);
    });
  });

  describe("Edge Cases", function () {
    it("should handle zero value transfers", async function () {
      await token.transfer(addr1.address, 0);
      expect(await token.balanceOf(addr1.address)).to.equal(0);
    });

    it("should revert when transferring to address(0)", async function () {
      await expect(token.transfer(ethers.constants.AddressZero, 1)).to.be.revertedWith("ERC20: transfer to the zero address");
    });

    it("should handle max integer values", async function () {
      const maxUint256 = ethers.constants.MaxUint256;
      await token.excludeFromFees(owner.address, true);
      await token.excludeFromLimits(owner.address, true);
      await expect(token.transfer(addr1.address, maxUint256)).to.be.reverted; // Reverts due to overflow
    });

    it("should handle empty strings", async function () {
      // No applicable edge case for empty strings in this contract
    });
  });

  describe("Access Control", function () {
    it("only owner can set tradingEnabled", async function () {
      await expect(token.connect(addr1).setTradingEnabled(true)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("only owner can exclude address from fees and limits", async function () {
      await expect(token.connect(addr1).excludeFromFees(addr2.address, true)).to.be.revertedWith("Ownable: caller is not the owner");
      await expect(token.connect(addr1).excludeFromLimits(addr2.address, true)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("only owner can set swapBackValues", async function () {
      await expect(token.connect(addr1).setSwapBackValues(ethers.utils.parseEther("2"), ethers.utils.parseEther("15"))).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("only owner can set taxes", async function () {
      await expect(token.connect(addr1).setTaxes(3, 4, 2, 3)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("only owner can set wallets", async function () {
      await expect(token.connect(addr1