import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

/**
 * Scaffold generato automaticamente per AIDynamics.
 * I blocchi // TODO_AI vanno completati dall'LLM.
 */

describe("AIDynamics — LLM Scaffold", function () {
  async function deployFixture() {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AIDynamics");
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

  
  describe("add_TLfzr(uint256)", function () {
    it("happy path", async function () {
      const { contract, owner } = await loadFixture(deployFixture);
      const tx = await contract.add_TLfzr(100); // Example value
      await tx.wait();
      expect(await contract.get_var_OzFkel()).to.equal(100);
    });

    it("reverts if var_OzFkel is already set", async function () {
      const { contract, owner } = await loadFixture(deployFixture);
      await contract.add_TLfzr(100); // Set the value
      await expect(contract.add_TLfzr(200)).to.be.revertedWith("Var_OzFkel already set");
    });

    it("reverts if input is zero", async function () {
      const { contract, owner } = await loadFixture(deployFixture);
      await expect(contract.add_TLfzr(0)).to.be.revertedWith("Input cannot be zero");
    });
  });


  describe("get_var_OzFkel()", function () {
    it("returns the correct value", async function () {
      const { contract, owner } = await loadFixture(deployFixture);
      await contract.add_TLfzr(100); // Set the value
      expect(await contract.get_var_OzFkel()).to.equal(100);
    });
  });

  describe("update_var_OzFkel(uint256)", function () {
    it("happy path", async function () {
      const { contract, owner } = await loadFixture(deployFixture);
      await contract.add_TLfzr(100); // Set the value
      const tx = await contract.update_var_OzFkel(200);
      await tx.wait();
      expect(await contract.get_var_OzFkel()).to.equal(200);
    });

    it("reverts if input is zero", async function () {
      const { contract, owner } = await loadFixture(deployFixture);
      await contract.add_TLfzr(100); // Set the value
      await expect(contract.update_var_OzFkel(0)).to.be.revertedWith("Input cannot be zero");
    });
  });

});
