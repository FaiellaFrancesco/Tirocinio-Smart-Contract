import { expect } from "chai";
import { ethers } from "hardhat";

describe("Intentions", function () {
  let Intentions, intentions: any;
  let GWF, gwf: any;
  let owner, addr1, addr2: any;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy GWF mock contract
    const GWFMock = await ethers.getContractFactory("GWFMock");
    gwf = await GWFMock.deploy();
    await gwf.deployed();

    // Deploy Intentions contract
    Intentions = await ethers.getContractFactory("Intentions");
    intentions = await Intentions.deploy(gwf.address, { value: ethers.utils.parseEther("1") });
    await intentions.deployed();
  });

  describe("Deployment", function () {
    it("should set the correct masterCopy and GWF address", async function () {
      expect(await intentions.getMasterCopy()).to.equal(owner.address);
      expect(await intentions.GWF()).to.equal(gwf.address);
    });

    it("should emit Deployment event with correct parameters", async function () {
      await expect(Intentions.deploy(gwf.address, { value: ethers.utils.parseEther("1") }))
        .to.emit(intentions, "Deployment")
        .withArgs(owner.address, intentions.address);
    });

    it("should emit DeploymentIntentions event with correct parameters", async function () {
      const chainName = await intentions.chainName();
      const nodeHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(chainName));
      await expect(Intentions.deploy(gwf.address, { value: ethers.utils.parseEther("1") }))
        .to.emit(intentions, "DeploymentIntentions")
        .withArgs(intentions.address, nodeHash);
    });

    it("should revert if GWF address is zero", async function () {
      await expect(Intentions.deploy(ethers.constants.AddressZero)).to.be.revertedWith("Intentions CONST!");
    });

    it("should revert if version is less than 20010000", async function () {
      const GWFMock = await ethers.getContractFactory("GWFMock");
      const gwfMock = await GWFMock.deploy();
      await gwfMock.deployed();

      // Mock a GWF contract with lower version
      const GWFMockLowerVersion = await ethers.getContractFactory("GWFMockLowerVersion");
      const gwfMockLowerVersion = await GWFMockLowerVersion.deploy();
      await gwfMockLowerVersion.deployed();

      await expect(Intentions.deploy(gwfMockLowerVersion.address)).to.be.revertedWith("Intentions VERS!");
    });

    it("should revert if chainName is empty", async function () {
      const GWFMock = await ethers.getContractFactory("GWFMock");
      const gwfMock = await GWFMock.deploy();
      await gwfMock.deployed();

      // Mock a GWF contract with unsupported chain
      const GWFMockUnsupportedChain = await ethers.getContractFactory("GWFMockUnsupportedChain");
      const gwfMockUnsupportedChain = await GWFMockUnsupportedChain.deploy();
      await gwfMockUnsupportedChain.deployed();

      await expect(Intentions.deploy(gwfMockUnsupportedChain.address)).to.be.revertedWith("Intentions CHAIN!");
    });
  });

  describe("Happy paths", function () {
    it("should return correct version", async function () {
      expect(await intentions.version()).to.equal(20010023);
    });

    it("should return correct chainName and tld", async function () {
      const chainId = await ethers.provider.getNetwork().then(network => network.chainId);
      let expectedChainName, expectedTld;

      switch (chainId) {
        case 1: 
          expectedChainName = "mainnet";
          expectedTld = ".eth";
          break;
        case 10:
          expectedChainName = "optmain";
          expectedTld = ".op";
          break;
        // Add more cases as needed
        default:
          expectedChainName = "";
          expectedTld = "";
      }

      expect(await intentions.chainName()).to.equal(expectedChainName);
      expect(await intentions.tld()).to.equal(expectedTld);
    });

    it("should allow withdrawal by masterCopy", async function () {
      const initialBalance = await ethers.provider.getBalance(intentions.address);
      await expect(() => intentions.withdraw())
        .to.changeEtherBalances([intentions, owner], [-initialBalance.add(ethers.utils.parseEther("-1")), initialBalance.add(ethers.utils.parseEther("1"))]);
    });
  });

  describe("Reverts", function () {
    it("should revert if non-masterCopy tries to withdraw", async function () {
      await expect(intentions.connect(addr1).withdraw()).to.be.revertedWith("iW");
    });

    it("should revert on fallback with no value", async function () {
      await expect(intentions.connect(addr1).fallback({ value: 0 })).to.be.revertedWith("Intentions!");
    });
  });

  describe("Events", function () {
    it("should emit Deposit event on receive", async function () {
      await expect(intentions.connect(addr1).receive({ value: ethers.utils.parseEther("1") }))
        .to.emit(intentions, "Deposit")
        .withArgs(addr1.address, ethers.utils.parseEther("1"));
    });

    it("should emit Deposit event on fallback with value", async function () {
      await expect(() => intentions.connect(addr1).fallback({ value: ethers.utils.parseEther("1") }))
        .to.changeEtherBalances([intentions, addr1], [ethers.utils.parseEther("1"), ethers.utils.parseEther("-1")])
        .and.to.emit(intentions, "Deposit")
        .withArgs(addr1.address, ethers.utils.parseEther("1"));
    });
  });

  describe("Edge cases", function () {
    it("should handle zero values in Deposit event", async function () {
      await expect(() => intentions.connect(addr1).receive({ value: 0 }))
        .to.changeEtherBalances([intentions, addr1], [0, 0])
        .and.to.emit(intentions, "Deposit")
        .withArgs(addr1.address, 0);
    });

    it("should handle max integers in Deposit event", async function () {
      const maxValue = ethers.constants.MaxUint256;
      await expect(() => intentions.connect(addr1).receive({ value: maxValue }))
        .to.changeEtherBalances([intentions, addr1], [maxValue, -maxValue])
        .and.to.emit(intentions, "Deposit")
        .withArgs(addr1.address, maxValue);
    });

    it("should handle empty strings in chainName and tld", async function () {
      const GWFMockUnsupportedChain = await ethers.getContractFactory("GWFMockUnsupportedChain");
      const gwfMockUnsupportedChain = await GWFMockUnsupportedChain.deploy();
      await gwfMockUnsupportedChain.deployed();

      await expect(Intentions.deploy(gwfMockUnsupportedChain.address)).to.be.revertedWith("Intentions CHAIN!");
    });
  });
});