Certainly! Below is a complete TypeScript test file for the `ERC1967Proxy` contract using ethers.js v5 and Chai. This test file covers deployment, happy paths, reverts, events, edge cases, and access control.

```typescript
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
    it("should allow normal usage of public functions in implementation", async function () {
      const proxyAsImpl = implementationFactory.attach(proxy.address);
      await expect(await proxyAsImpl.setNumber(42)).to.emit(
        proxyAsImpl,
        "NumberSet"
      );
      expect(await proxyAsImpl.getNumber()).to.equal(42);
    });
  });

  describe("Reverts", function () {
    it("should revert on invalid address for implementation", async function () {
      await expect(
        proxyFactory.deploy("0x0000000000000000000000000000000