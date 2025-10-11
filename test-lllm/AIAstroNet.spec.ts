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

  
  describe("add_VWRjt(uint256)", function () {
    it("happy path", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      const tx = await contract.add_VWRjt(100); // Example value
      await tx.wait();
      expect(await contract.get_var_wonYjO()).to.equal(100);
    });

    it("reverts if input is zero", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      await expect(contract.add_VWRjt(0)).to.be.revertedWith("Input cannot be zero");
    });
  });


  describe("get_var_wonYjO()", function () {
    it("returns the current value of var_wonYjO", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      expect(await contract.get_var_wonYjO()).to.equal(0); // Default value
    });
  });


  describe("update_var_wonYjO(uint256)", function () {
    it("happy path", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      const tx = await contract.update_var_wonYjO(100); // Example value
      await tx.wait();
      expect(await contract.get_var_wonYjO()).to.equal(100);
    });

    it("reverts if input is zero", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      await expect(contract.update_var_wonYjO(0)).to.be.revertedWith("Input cannot be zero");
    });
  });


  describe("transfer(address,uint256)", function () {
    it("happy path", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      const tx = await contract.transfer(addr1.address, 100); // Example value
      await tx.wait();
      expect(await contract.balanceOf(owner.address)).to.equal(900);
      expect(await contract.balanceOf(addr1.address)).to.equal(100);
    });

    it("reverts if input is zero", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      await expect(contract.transfer(addr1.address, 0)).to.be.revertedWith("Amount cannot be zero");
    });
  });


  describe("transferFrom(address,address,uint256)", function () {
    it("happy path", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      await contract.approve(addr1.address, 100); // Approve transfer
      const tx = await contract.transferFrom(owner.address, addr1.address, 100);
      await tx.wait();
      expect(await contract.balanceOf(owner.address)).to.equal(900);
      expect(await contract.balanceOf(addr1.address)).to.equal(100);
    });

    it("reverts if input is zero", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      await expect(contract.transferFrom(owner.address, addr1.address, 0)).to.be.revertedWith("Amount cannot be zero");
    });
  });

});
