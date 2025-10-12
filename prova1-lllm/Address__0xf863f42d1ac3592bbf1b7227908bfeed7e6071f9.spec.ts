import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

/**
 * Scaffold generato automaticamente per Address.
 * I blocchi // TODO_AI vanno completati dall'LLM.
 */

describe("Address — LLM Scaffold", function () {
  async function deployFixture() {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Address");
    // TODO_AI: completa i parametri del costruttore se presenti
    const contract = await Factory.deploy();
    await contract.waitForDeployment();
    return { contract, owner, addr1, addr2 };
  }

  it("deployment di base", async function () {
    const { contract } = await loadFixture(deployFixture);
    expect(await contract.getAddress()).to.properAddress;
  });

  it("happy path: setAddress", async function () {
    const { contract, owner, addr1 } = await loadFixture(deployFixture);

    // TODO_AI: setta un nuovo indirizzo
    await contract.setAddress(addr1.address);

    // Verifica che l'indirizzo sia stato impostato correttamente
    expect(await contract.getAddress()).to.equal(addr1.address);
  });

  it("revert case: setAddress with address(0)", async function () {
    const { contract, owner } = await loadFixture(deployFixture);

    // TODO_AI: prova a settare l'indirizzo a address(0)
    await expect(contract.setAddress(ethers.constants.AddressZero)).to.be.revertedWith("Invalid address");
  });

  it("boundary case: setAddress with max value", async function () {
    const { contract, owner } = await loadFixture(deployFixture);

    // TODO_AI: prova a settare l'indirizzo con un valore massimo (maxUint256)
    await expect(contract.setAddress(ethers.constants.MaxUint256)).to.be.revertedWith("Invalid address");
  });

  it("happy path: getAddress with owner", async function () {
    const { contract, owner } = await loadFixture(deployFixture);

    // TODO_AI: ottieni l'indirizzo corrente dell'owner
    expect(await contract.getAddress()).to.equal(owner.address);
  });
});
