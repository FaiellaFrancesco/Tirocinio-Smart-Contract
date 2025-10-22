import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("MockERC20 Base Test", function () {
  async function deployFixture() {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy del contratto MockERC20 con il parametro richiesto
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const initialSupply = ethers.parseEther("1000000"); // 1M tokens
    const contract = await MockERC20.deploy(initialSupply);
    await contract.waitForDeployment();
    
    return { contract, owner, addr1, addr2 };
  }

  it("should deploy successfully", async function () {
    const { contract } = await loadFixture(deployFixture);
    expect(await contract.getAddress()).to.be.a('string');
  });

  it("should have signers available", async function () {
    const { owner, addr1 } = await loadFixture(deployFixture);
    expect(owner.address).to.be.a('string');
    expect(addr1.address).to.be.a('string');
    expect(addr1.address).to.not.equal(owner.address);
  });
  
  it("should have basic ERC20 functions", async function () {
    const { contract } = await loadFixture(deployFixture);
    // Test funzioni di base che dovrebbero esistere
    expect(await contract.name()).to.be.a('string');
    expect(await contract.symbol()).to.be.a('string');
  });
});
