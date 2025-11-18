```typescript
import { expect } from "chai";
import { ethers, network } from "hardhat";

describe("SparkStarterToken and SparkStarterTokenFactory", function () {
  let owner: any;
  let addr1: any;
  let addr2: any;
  let sparkStarterTokenFactory: any;
  let authorizedChecker: any;
  let vaultFactory: any;
  let platformAddress: string;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy AuthorizedChecker
    const AuthorizedChecker = await ethers.getContractFactory("AuthorizedChecker");
    authorizedChecker = await AuthorizedChecker.deploy(owner.address);
    await authorizedChecker.deployed();

    // Deploy VaultFactory (mock)
    vaultFactory = owner.address; // Assuming vaultFactory is just an address for this test

    // Set platformAddress
    platformAddress = addr1.address;

    // Deploy SparkStarterTokenFactory
    const SparkStarterTokenFactory = await ethers.getContractFactory("SparkStarterTokenFactory");
    sparkStarterTokenFactory = await SparkStarterTokenFactory.deploy(platformAddress, authorizedChecker.address, vaultFactory);
    await sparkStarterTokenFactory.deployed();

    // Authorize owner as deployer
    await authorizedChecker.updateDeployerAddress(owner.address, true);
  });

  describe("Deployment", function () {
    it("should initialize with correct platform address", async function () {
      expect(await sparkStarterTokenFactory.platformAddress()).to.equal(platformAddress);
    });

    it("should initialize with correct authorized checker address", async function () {
      expect(await sparkStarterTokenFactory.authorizedChecker()).to.equal(authorizedChecker.address);
    });

    it("should initialize with correct vault factory address", async function () {
      expect(await sparkStarterTokenFactory.vaultFactory()).to.equal(vaultFactory);
    });
  });

  describe("Happy Paths", function () {
    let tokenInfo: any;
    let newTokenAddress: string;
    let newToken: any;

    beforeEach(async function () {
      // Define TokenInfo
      tokenInfo = {
        _name: "TestToken",
        _symbol: "TTK",
        _supply: ethers.utils.parseEther("1000"),
        _teamTokenPercent: 5,
        _teamTokensWallet: addr2.address,
        _maxWallets: [10, 20, 30, 40],
        _buyTaxes: [1, 2, 3, 4],
        _sellTaxes: [1, 2, 3, 4],
        _incubatorWallet: addr1.address,
        _taxWallet1: addr1.address,
        _taxWallet1Split: 50,
        _taxWallet2: addr2.address,
        _isWhitelistLaunch: false,
        lpLockDurationInMonths: 6,
        _vestTeamTokens: true
      };

      // Generate new token
      const tx = await sparkStarterTokenFactory.generateToken(tokenInfo, { value: ethers.utils.parseEther("1") });
      const receipt = await tx.wait();
      const event = receipt.events?.find((e: any) => e.event === "NewTokenCreated");
      newTokenAddress = event.args[0];
      newToken = await ethers.getContractAt("SparkStarterToken", newTokenAddress);
    });

    it("should create a new token with correct parameters", async function () {
      expect(await newToken.name()).to.equal(tokenInfo._name);
      expect(await newToken.symbol()).to.equal(tokenInfo._symbol);
      expect(await newToken.totalSupply()).to.equal(ethers.utils.parseEther("1000"));
    });

    it("should add LP tokens correctly", async function () {
      const initialEthBalance = await ethers.provider.getBalance(newTokenAddress);
      const initialLpBalance = await newToken.balanceOf(newToken.lpPair());

      await newToken.addLp({ value: ethers.utils.parseEther("1") });

      expect(await ethers.provider.getBalance(newTokenAddress)).to.equal(initialEthBalance.sub(ethers.utils.parseEther("1")));
      expect(await newToken.balanceOf(newToken.lpPair())).to.be.gt(initialLpBalance);
    });
  });

  describe("Reverts", function () {
    it("should revert if deployer is not authorized", async function () {
      await authorizedChecker.updateDeployerAddress(owner.address, false);

      const tokenInfo = {
        _name: "TestToken",
        _symbol: "TTK",
        _supply: ethers.utils.parseEther("1000"),
        _teamTokenPercent: 5,
        _teamTokensWallet: addr2.address,
        _maxWallets: [10, 20, 30, 40],
        _buyTaxes: [1, 2, 3, 4],
        _sellTaxes: [1, 2, 3, 4],
        _incubatorWallet: addr1.address,
        _taxWallet1: addr1.address,
        _taxWallet1Split: 50,
        _taxWallet2: addr2.address,
        _isWhitelistLaunch: false,
        lpLockDurationInMonths: 6,
        _vestTeamTokens: true
      };

      await expect(
        sparkStarterTokenFactory.generateToken(tokenInfo, { value: ethers.utils.parseEther("1") })
      ).to.be.revertedWith("invalid deployer");
    });

    it("should revert if invalid address is provided", async function () {
      const tokenInfo = {
        _name: "TestToken",
        _symbol: "TTK",
        _supply: ethers.utils.parseEther("1000"),
        _teamTokenPercent: 5,
        _teamTokensWallet: ethers.constants.AddressZero,
        _maxWallets: [10, 20, 30, 40],
        _buyTaxes: [1, 2, 3, 4],
        _sellTaxes: [1, 2, 3, 4],
        _incubatorWallet: addr1.address,
        _taxWallet1: addr1.address,
        _taxWallet1Split: 50,
        _taxWallet2: ethers.constants.AddressZero,
        _isWhitelistLaunch: false,
        lpLockDurationInMonths: 6,
        _vestTeamTokens: true
      };

      await expect(
        sparkStarterTokenFactory.generateToken(tokenInfo, { value: ethers.utils.parseEther("1") })
      ).to.be.revertedWith("invalid address");
    });
  });

  describe("Events", function () {
    it("should emit NewTokenCreated event with correct parameters", async function () {
      const tokenInfo = {
        _name: "TestToken",
        _symbol: "TTK",
        _supply: ethers.utils.parseEther("1000"),
        _teamTokenPercent: 5,
        _teamTokensWallet: addr2.address,
        _maxWallets: [10, 20, 30, 40],
        _buyTaxes: [1, 2, 3, 4],
        _sellTaxes: [1, 2, 3, 4],
        _incubatorWallet: addr1.address,
        _taxWallet1: addr1.address,
        _taxWallet1Split: 50,
        _taxWallet2: addr2.address,
        _isWhitelistLaunch: false,
        lpLockDurationInMonths: 6,
        _vestTeamTokens: true
      };

      await expect(sparkStarterTokenFactory.generateToken(tokenInfo, { value: ethers.utils.parseEther("1") }))
        .to.emit(sparkStarterTokenFactory, "NewTokenCreated")
        .withArgs(ethers.anyValue);
    });
  });

  describe("Edge Cases", function () {
    it("should handle zero values correctly", async function () {
      const tokenInfo = {
        _name: "TestToken",
        _symbol: "TTK",
        _supply: ethers.utils.parseEther("0"),
        _teamTokenPercent: 0,
        _teamTokensWallet: addr2.address,
        _maxWallets: [0, 0, 0, 0],
        _buyTaxes: [0, 0, 0, 0],
        _sellTaxes: [0, 0, 0, 0],
        _incubatorWallet: addr1.address,
        _taxWallet1: addr1.address,
        _taxWallet1Split: 0,
        _taxWallet2: addr2.address,
        _isWhitelistLaunch: false,
        lpLockDurationInMonths: 0,
        _vestTeamTokens: false
      };

      await expect(sparkStarterTokenFactory.generateToken(tokenInfo, { value: ethers.utils.parseEther("1") }))
        .to.emit(sparkStarterTokenFactory, "NewTokenCreated")
        .withArgs(ethers.anyValue);
    });

    it("should handle max integers correctly", async function () {
      const tokenInfo = {
        _name: "TestToken",
        _symbol: "TTK",
        _supply: ethers.constants.MaxUint256,
        _teamTokenPercent: 100,
        _teamTokensWallet: addr2.address,
        _maxWallets: [ethers.constants.MaxUint256, ethers.constants.MaxUint256, ethers.constants.MaxUint256, ethers.constants.MaxUint256],
        _buyTaxes: [ethers.constants.MaxUint24, ethers.constants.MaxUint24, ethers.constants.MaxUint24, ethers