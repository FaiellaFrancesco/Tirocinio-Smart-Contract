import { expect } from "chai";
import { ethers } from "hardhat";

describe("Storage — LLM Scaffold", function () {
  async function deployFixture() {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Storage");
    // TODO_AI: complete constructor parameters if present
    const contract = await Factory.deploy();
    await contract.waitForDeployment();
    return { contract, owner, addr1, addr2 };
  }

  it("basic deployment", async function () {
    const { contract } = await loadFixture(deployFixture);
    expect(await contract.getAddress()).to.properAddress;
  });

  describe("retrieve()", function () {
    it("happy path", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      // read-only call
      const result = await contract.retrieve();
      expect(result).to.equal(0); // Assuming initial value is 0
    });

    it("reverts on invalid input/role", async function () {
      const { contract } = await loadFixture(deployFixture);
      await expect(
        contract.retrieve()
      ).to.be.revertedWith("Function requires a valid number"); // TODO_AI: Adjust error message as needed
    });

    it("boundary cases", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      // Test with 0 and max uint256 value
      expect(await contract.retrieve()).to.equal(0); // Initial value is 0
      expect(await contract.retrieve(uint256.maxValue)).to.equal(uint256.maxValue);
    });

    // TODO_AI: if emits events: await expect(tx).to.emit(contract, "Event").withArgs(...)
  });


  describe("store(uint256)", function () {
    it("happy path", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      // state-changing transaction
      const result = await contract.store(1n); // Store a value of 1
      expect(await contract.retrieve()).to.equal(1n); // Verify the stored value

      // TODO_AI: verifica stato/eventi dopo la tx
    });

    it("reverts on invalid input/role", async function () {
      const { contract } = await loadFixture(deployFixture);
      await expect(
        contract.store(0n)
      ).to.be.revertedWith("Function requires a valid number"); // TODO_AI: Adjust error message as needed
    });

    it("boundary cases", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      // Test with 0 and max uint256 value
      expect(await contract.retrieve()).to.equal(0); // Initial value is 0
      expect(await contract.store(uint256.maxValue)).to.equal(uint256.maxValue);
    });

    // TODO_AI: if emits events: await expect(tx).to.emit(contract, "Event").withArgs(...)
  });
});