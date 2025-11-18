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
      const implAddress = await ethers.provider.getStorageAt(
        proxy.address,
        "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc"
      );
      expect(implAddress).to.equal(
        ethers.utils.hexZeroPad(implementation.address, 32)
      );
    });
  });

  describe("Happy paths", function () {
    it("should allow owner to change implementation", async function () {
      const newImplementationFactory = await ethers.getContractFactory("NewImplementation");
      const newImplementation = await newImplementationFactory.deploy();
      await newImplementation.deployed();

      await expect(
        proxyFactory.attach(proxy.address).upgradeTo(newImplementation.address)
      ).to.emit(proxy, "Upgraded").withArgs(newImplementation.address);

      const implAddress = await ethers.provider.getStorageAt(
        proxy.address,
        "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc"
      );
      expect(implAddress).to.equal(
        ethers.utils.hexZeroPad(newImplementation.address, 32)
      );
    });

    it("should allow owner to call functions on implementation", async function () {
      const proxyWithImpl = implementationFactory.attach(proxy.address);
      await expect(await proxyWithImpl.setNumber(42)).to.emit(proxy, "NumberSet").withArgs(42);
      expect(await proxyWithImpl.getNumber()).to.equal(42);
    });
  });

  describe("Reverts", function () {
    it("should revert on invalid implementation address", async function () {
      await expect(
        proxyFactory.attach(proxy.address).upgradeTo(ethers.constants.AddressZero)
      ).to.be.revertedWith("ERC1967: new implementation is not a contract");
    });

    it("should revert if non-owner tries to change implementation", async function () {
      const newImplementationFactory = await ethers.getContractFactory("NewImplementation");
      const newImplementation = await newImplementationFactory.deploy();
      await newImplementation.deployed();

      await expect(
        proxyFactory.attach(proxy.address).connect(addr1).upgradeTo(newImplementation.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Events", function () {
    it("should emit Upgraded event on implementation change", async function () {
      const newImplementationFactory = await ethers.getContractFactory("NewImplementation");
      const newImplementation = await newImplementationFactory.deploy();
      await newImplementation.deployed();

      await expect(
        proxyFactory.attach(proxy.address).upgradeTo(newImplementation.address)
      ).to.emit(proxy, "Upgraded").withArgs(newImplementation.address);
    });

    it("should emit NumberSet event on setting number", async function () {
      const proxyWithImpl = implementationFactory.attach(proxy.address);
      await expect(await proxyWithImpl.setNumber(42)).to.emit(proxy, "NumberSet").withArgs(42);
    });
  });

  describe("Edge cases", function () {
    it("should handle zero values correctly", async function () {
      const proxyWithImpl = implementationFactory.attach(proxy.address);
      await expect(await proxyWithImpl.setNumber(0)).to.emit(proxy, "NumberSet").withArgs(0);
      expect(await proxyWithImpl.getNumber()).to.equal(0);
    });

    it("should handle max integers correctly", async function () {
      const proxyWithImpl = implementationFactory.attach(proxy.address);
      const maxInt = ethers.constants.MaxUint256;
      await expect(await proxyWithImpl.setNumber(maxInt)).to.emit(proxy, "NumberSet").withArgs(maxInt);
      expect(await proxyWithImpl.getNumber()).to.equal(maxInt);
    });
  });

  describe("Access control", function () {
    it("should only allow owner to change implementation", async function () {
      const newImplementationFactory = await ethers.getContractFactory("NewImplementation");
      const newImplementation = await newImplementationFactory.deploy();
      await newImplementation.deployed();

      await expect(
        proxyFactory.attach(proxy.address).connect(addr1).upgradeTo(newImplementation.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
});