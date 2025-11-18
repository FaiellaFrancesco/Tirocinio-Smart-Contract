import { expect } from "chai";
import { ethers } from "hardhat";

describe("YourContractName", function () {
  let YourContract;
  let contract;
  let owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    YourContract = await ethers.getContractFactory("YourContractName");
    contract = await YourContract.deploy();
    await contract.deployed();
  });

  describe("Deployment", function () {
    it("should set the correct owner", async function () {
      expect(await contract.owner()).to.equal(owner.address);
    });

    it("should initialize tradingOpen to false", async function () {
      expect(await contract.tradingOpen()).to.be.false;
    });

    it("should initialize swapEnabled to false", async function () {
      expect(await contract.swapEnabled()).to.be.false;
    });
  });

  describe("Happy paths", function () {
    it("should allow owner to open trading with existing pair", async function () {
      const routerAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
      const factory = await ethers.getContractAt("IUniswapV2Factory", "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f");
      const weth = await ethers.getContractAt("IERC20", "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");

      // Create a pair for testing
      await factory.createPair(contract.address, weth.address);
      const pairAddress = await factory.getPair(contract.address, weth.address);

      await expect(
        contract.openTradingPairCreatedAlready(pairAddress, { value: ethers.utils.parseEther("0.1") })
      ).to.emit(contract, "Transfer").withArgs(contract.address, pairAddress, ethers.utils.parseUnits("920000", 18));

      expect(await contract.tradingOpen()).to.be.true;
    });

    it("should allow owner to open trading with new pair", async function () {
      await expect(
        contract.openTrading()
      ).to.emit(contract, "Transfer").withArgs(contract.address, ethers.constants.AddressZero, ethers.utils.parseUnits("920000", 18));

      expect(await contract.tradingOpen()).to.be.true;
    });

    it("should allow owner to reduce fee", async function () {
      await contract.openTrading();
      await expect(
        contract.reduceFee(5)
      ).to.not.emit(contract, "Transfer");

      expect(await contract.finalBuyTax()).to.equal(5);
      expect(await contract.finalSellTax()).to.equal(5);
    });

    it("should allow owner to set tax swap threshold", async function () {
      await expect(
        contract.setTaxSwapThreshold(ethers.utils.parseUnits("100", 18))
      ).to.not.emit(contract, "Transfer");

      expect(await contract.taxSwapThreshold()).to.equal(ethers.utils.parseUnits("100", 18));
    });

    it("should allow owner to manually swap tokens for ETH", async function () {
      await contract.openTrading();
      await expect(
        contract.manualSwap()
      ).to.not.emit(contract, "Transfer");
    });
  });

  describe("Reverts", function () {
    it("should revert if non-owner tries to open trading", async function () {
      await expect(
        contract.connect(addr1).openTrading()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should revert if invalid pair address is provided", async function () {
      await expect(
        contract.openTradingPairCreatedAlready(ethers.constants.AddressZero, { value: ethers.utils.parseEther("0.1") })
      ).to.be.revertedWith("Invalid pair address");
    });

    it("should revert if trading is already open", async function () {
      await contract.openTrading();
      await expect(
        contract.openTrading()
      ).to.be.revertedWith("Trading is already open");
    });

    it("should revert if non-owner tries to reduce fee", async function () {
      await expect(
        contract.connect(addr1).reduceFee(5)
      ).to.be.revertedWith("Not authorized");
    });
  });

  describe("Events", function () {
    it("should emit Transfer event when opening trading with existing pair", async function () {
      const routerAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
      const factory = await ethers.getContractAt("IUniswapV2Factory", "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f");
      const weth = await ethers.getContractAt("IERC20", "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");

      // Create a pair for testing
      await factory.createPair(contract.address, weth.address);
      const pairAddress = await factory.getPair(contract.address, weth.address);

      await expect(
        contract.openTradingPairCreatedAlready(pairAddress, { value: ethers.utils.parseEther("0.1") })
      ).to.emit(contract, "Transfer").withArgs(contract.address, pairAddress, ethers.utils.parseUnits("920000", 18));
    });

    it("should emit Transfer event when opening trading with new pair", async function () {
      await expect(
        contract.openTrading()
      ).to.emit(contract, "Transfer").withArgs(contract.address, ethers.constants.AddressZero, ethers.utils.parseUnits("920000", 18));
    });
  });

  describe("Edge cases", function () {
    it("should handle zero values for tax swap threshold", async function () {
      await expect(
        contract.setTaxSwapThreshold(0)
      ).to.not.emit(contract, "Transfer");

      expect(await contract.taxSwapThreshold()).to.equal(0);
    });
  });

  describe("Access control functions", function () {
    it("should only allow owner to open trading", async function () {
      await expect(
        contract.connect(addr1).openTrading()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should only allow owner to reduce fee", async function () {
      await expect(
        contract.connect(addr1).reduceFee(5)
      ).to.be.revertedWith("Not authorized");
    });
  });
});