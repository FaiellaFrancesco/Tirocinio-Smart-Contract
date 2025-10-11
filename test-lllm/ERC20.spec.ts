import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

/**
 * Scaffold generato automaticamente per ERC20.
 * I blocchi // TODO_AI vanno completati dall'LLM.
 */

describe("ERC20 — LLM Scaffold", function () {
  async function deployFixture() {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ERC20");
    // TODO_AI: completa i parametri del costruttore se presenti
    const contract = await Factory.deploy("Example Token", "EXAMPLE");
    await contract.waitForDeployment();
    return { contract, owner, addr1, addr2 };
  }

  it("deployment di base", async function () {
    const { contract } = await loadFixture(deployFixture);
    expect(await contract.getAddress()).to.properAddress;
  });

  // Eventi in ABI: Approval, Transfer

  
  describe("allowance(address,address)", function () {
    it("happy path", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      // chiamata di sola lettura
      const result = await contract.allowance(addr1.address, addr1.address);
      expect(result).to.equal(0n); // Atteso: 0 per l'allowance di un utente verso se stesso

      // Approva 10 tokens a addr2
      const approveTx = await contract.approve(addr2.address, 10n);
      await approveTx.wait();

      // Verifica il nuovo allowance
      const newAllowance = await contract.allowance(addr1.address, addr2.address);
      expect(newAllowance).to.equal(10n); // Atteso: 10 tokens per l'allowance di addr1 verso addr2

      // Verifica che l'evento Approval sia emesso correttamente
      await expect(approveTx)
        .to.emit(contract, "Approval")
        .withArgs(addr1.address, addr2.address, 10n);
    });

    it("reverts su input/ruolo non valido", async function () {
      const { contract } = await loadFixture(deployFixture);
      await expect(
        contract.allowance("0x0000000000000000000000000000000
