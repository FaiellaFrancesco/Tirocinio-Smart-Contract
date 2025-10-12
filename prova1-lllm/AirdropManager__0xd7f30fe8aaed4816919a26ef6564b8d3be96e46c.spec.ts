import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

/**
 * Scaffold generato automaticamente per AirdropManager.
 * I blocchi // TODO_AI vanno completati dall'LLM.
 */

describe("AirdropManager — LLM Scaffold", function () {
  async function deployFixture() {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AirdropManager");
    // TODO_AI: completa i parametri del costruttore se presenti
    const contract = await Factory.deploy();
    await contract.waitForDeployment();
    return { contract, owner, addr1, addr2 };
  }

  it("deployment di base", async function () {
    const { contract } = await loadFixture(deployFixture);
    expect(await contract.getAddress()).to.properAddress;
  });

  // Eventi in ABI: OwnershipTransferred

  
  describe("acceptTokens(address,uint256)", function () {
    it("happy path", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      // transazione che modifica lo stato
      const result = await contract.acceptTokens(addr1.address /* TODO_AI */, 1n /* TODO_AI */);
      // TODO_AI: verifica stato/eventi dopo la tx
      expect(await contract.tokenController(addr1.address)).to.equal(contract.address);
      expect(await contract.tokensPerChild(addr1.address)).to.equal(1n);
    });

    it("reverts su input/ruolo non valido", async function () {
      const { contract } = await loadFixture(deployFixture);
      await expect(
        contract.acceptTokens("0x0000000000000000000000000000000
