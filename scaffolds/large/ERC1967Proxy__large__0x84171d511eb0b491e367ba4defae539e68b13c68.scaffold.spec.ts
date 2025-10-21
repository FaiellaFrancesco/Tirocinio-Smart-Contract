import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

/**
 * Scaffold generato automaticamente per ERC1967Proxy.
 * I blocchi // TODO_AI vanno completati dall'LLM.
 */

describe("ERC1967Proxy — LLM Scaffold", function () {
  async function deployFixture() {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ERC1967Proxy");
    // TODO_AI: completa i parametri del costruttore se presenti
    const contract = await Factory.deploy(addr1.address /* TODO_AI */, "0x" /* TODO_AI */);
    await contract.waitForDeployment();
    return { contract, owner, addr1, addr2 };
  }

  it("deployment di base", async function () {
    const { contract } = await loadFixture(deployFixture);
    expect(await contract.getAddress()).to.properAddress;
  });

  // Eventi in ABI: Upgraded

  
});
