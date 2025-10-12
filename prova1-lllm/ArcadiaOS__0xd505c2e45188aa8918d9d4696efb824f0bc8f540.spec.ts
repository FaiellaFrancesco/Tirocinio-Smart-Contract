import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

/**
 * Scaffold generato automaticamente per ArcadiaOS.
 * I blocchi // TODO_AI vanno completati dall'LLM.
 */

describe("ArcadiaOS — LLM Scaffold", function () {
  async function deployFixture() {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ArcadiaOS");
    // TODO_AI: completa i parametri del costruttore se presenti
    const contract = await Factory.deploy();
    await contract.waitForDeployment();
    return { contract, owner, addr1, addr2 };
  }

  it("deployment di base", async function () {
    const { contract } = await loadFixture(deployFixture);
    expect(await contract.getAddress()).to.properAddress;
  });

  // Eventi in ABI: Approval, OwnershipTransferred, Transfer

  
  describe("TransferOwnership(address)", function () {
    it("happy path", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      // transazione che modifica lo stato
      const result = await contract.TransferOwnership(addr1.address /* TODO_AI: passa l'indirizzo di addr1 */);
      // verifica stato/eventi dopo la tx
      expect(await contract.owner()).to.equal(addr1.address);
      expect(result).to.emit(contract, "OwnershipTransferred").withArgs(owner.address, addr1.address);
    });

    it("reverts su input/ruolo non valido", async function () {
      const { contract } = await loadFixture(deployFixture);
      await expect(
        contract.TransferOwnership("0x0000000000000000000000000000000
