import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

/**
 * Scaffold generato automaticamente per AIAstroNet.
 * I blocchi // TODO_AI vanno completati dall'LLM.
 */

describe("AIAstroNet — LLM Scaffold", function () {
  async function deployFixture() {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AIAstroNet");
    // TODO_AI: completa i parametri del costruttore se presenti
    const contract = await Factory.deploy();
    await contract.waitForDeployment();
    return { contract, owner, addr1, addr2 };
  }

  it("deployment di base", async function () {
    const { contract } = await loadFixture(deployFixture);
    expect(await contract.getAddress()).to.properAddress;
  });

  // Eventi in ABI: Approval, Transfer

  
  describe("add_vEIaP(uint256)", function () {
    it("happy path", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      const amountToAdd = ethers.utils.parseUnits("100", "ether");
      const tx = await contract.add_vEIaP(amountToAdd);
      expect(tx).to.emit(contract, "Transfer").withArgs(owner.address, addr1.address, amountToAdd);
    });

    it("reverts if amount is zero", async function () {
      const { contract, owner } = await loadFixture(deployFixture);
      await expect(contract.add_vEIaP(0)).to.be.revertedWith("Amount must be greater than zero");
    });
  });


  describe("get_var_yAsITC()", function () {
    it("happy path", async function () {
      const { contract, owner } = await loadFixture(deployFixture);
      const expectedValue = ethers.utils.parseUnits("100", "ether");
      await contract.update_var_yAsITC(expectedValue);
      expect(await contract.get_var_yAsITC()).to.equal(expectedValue);
    });
  });

  // Add similar tests for other functions as needed
});
