import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERC1967Proxy", function () {
  let owner: any;
  let addr1: any;
  let implementationFactory: any;
  let proxyFactory: any;
  let implementation: any;
  let proxy: any;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();

    // Deploy the Implementation contract
    implementationFactory = await ethers.getContractFactory("Implementation");
    implementation = await implementationFactory.deploy();
    await implementation.deployed();

    // Deploy the ERC1967Proxy contract pointing to the Implementation
    proxyFactory = await ethers.getContractFactory("ERC1967Proxy");
    proxy = await proxyFactory.deploy(implementation.address, "0x");
    await proxy.deployed();
  });

  describe("Deployment", function () {
    it("should initialize with correct implementation address", async function () {
      const ERC1967Utils = await ethers.getContractAt("ERC1967Utils", proxy.address);
      expect(await ERC1967Utils.getImplementation()).to.equal(implementation.address);
    });
  });

  describe("Happy paths", function () {
    it("should allow owner to set a new value", async function () {
      const Implementation = await ethers.getContractAt("Implementation", proxy.address);
      await Implementation.connect(owner).setValue(42);
      expect(await Implementation.getValue()).to.equal(42);
    });

    it("should emit an event when a value is set", async function () {
      const Implementation = await ethers.getContractAt("Implementation", proxy.address);
      await expect(Implementation.connect(owner).setValue(42))
        .to.emit(Implementation, "ValueChanged")
        .withArgs(42);
    });
  });

  describe("Reverts", function () {
    it("should revert when non-owner tries to set a value", async function () {
      const Implementation = await ethers.getContractAt("Implementation", proxy.address);
      await expect(Implementation.connect(addr1).setValue(42))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should revert on invalid address for implementation", async function () {
      await expect(
        proxyFactory.deploy(ethers.constants.AddressZero, "0x")
      ).to.be.reverted;
    });
  });

  describe("Getter and setter functions", function () {
    it("should return the correct value after setting", async function () {
      const Implementation = await ethers.getContractAt("Implementation", proxy.address);
      await Implementation.connect(owner).setValue(100);
      expect(await Implementation.getValue()).to.equal(100);
    });
  });

  describe("Pure and view functions", function () {
    it("should return the correct owner", async function () {
      const Implementation = await ethers.getContractAt("Implementation", proxy.address);
      expect(await Implementation.owner()).to.equal(owner.address);
    });
  });

  describe("Access control functions", function () {
    it("should only allow owner to change implementation", async function () {
      const newImplementationFactory = await ethers.getContractFactory("NewImplementation");
      const newImplementation = await newImplementationFactory.deploy();
      await newImplementation.deployed();

      const ERC1967Utils = await ethers.getContractAt("ERC1967Utils", proxy.address);
      await expect(ERC1967Utils.connect(owner).upgradeTo(newImplementation.address))
        .to.emit(ERC1967Utils, "Upgraded")
        .withArgs(newImplementation.address);

      expect(await ERC1967Utils.getImplementation()).to.equal(newImplementation.address);
    });

    it("should revert when non-owner tries to change implementation", async function () {
      const newImplementationFactory = await ethers.getContractFactory("NewImplementation");
      const newImplementation = await newImplementationFactory.deploy();
      await newImplementation.deployed();

      const ERC1967Utils = await ethers.getContractAt("ERC1967Utils", proxy.address);
      await expect(ERC1967Utils.connect(addr1).upgradeTo(newImplementation.address))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Edge cases", function () {
    it("should handle zero value for setter", async function () {
      const Implementation = await ethers.getContractAt("Implementation", proxy.address);
      await Implementation.connect(owner).setValue(0);
      expect(await Implementation.getValue()).to.equal(0);
    });

    it("should handle max integer for setter", async function () {
      const Implementation = await ethers.getContractAt("Implementation", proxy.address);
      const maxValue = ethers.constants.MaxUint256;
      await Implementation.connect(owner).setValue(maxValue);
      expect(await Implementation.getValue()).to.equal(maxValue);
    });
  });
});