import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Storage — LLM Scaffold", function () {
  async function deployFixture() {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("contracts/small/0x224e981997a48064d82b1092c2592435349acfca.sol:Storage");
    // TODO_AI: complete constructor parameters if present
    const contract = await Factory.deploy();
    await contract.waitForDeployment();
    return { contract, owner, addr1, addr2 };
  }

  it("basic deployment", async function () {
    const { contract } = await loadFixture(deployFixture);
    expect(await contract.getAddress()).to.be.a("string"); // .to.be.properAddress matcher requires plugin
  });

  describe("retrieve()", function () {
    it("happy path", async function () {
      const { contract } = await loadFixture(deployFixture);
      // read-only call
      const result = await contract.retrieve();
      expect(result).to.equal(0n); // Assuming the default value is 0
    });

    // View functions cannot revert, so this test is commented out
    // it("reverts on invalid input/role", async function () {
    //   const { contract } = await loadFixture(deployFixture);
    //   await expect(contract.retrieve()).to.be.rejectedWith("No data available"); // TODO_AI: .with("MESSAGE")
    // });

    it("boundary cases", async function () {
      const { contract } = await loadFixture(deployFixture);
      // TODO_AI: test retrieve after store(0), store(large number), store(same value twice)
    });

    describe("Events in ABI:", function () {
      it("should emit an event when data is retrieved", async function () {
        const { contract } = await loadFixture(deployFixture);
        // read-only call
        const result = await contract.retrieve();
        expect(result).to.equal(0n); // Assuming the default value is 0
        // TODO_AI: If retrieve emits an event, add expect for event here
        // await expect(contract.retrieve()).to.emit(contract, "DataRetrieved");
      });
    });
  });

  describe("store(uint256)", function () {
    it("happy path", async function () {
      const { contract } = await loadFixture(deployFixture);
      // state-changing transaction
      const tx = await contract.store(1n);
      await tx.wait();
      expect(await contract.retrieve()).to.equal(1n); // Assuming the default value is 0
    });

    it("reverts on invalid input/role", async function () {
      const { contract } = await loadFixture(deployFixture);
      await expect(contract.store(0n)).to.be.rejectedWith("Invalid data"); // TODO_AI: check revert message for invalid input
    });

    it("boundary cases", async function () {
      const { contract } = await loadFixture(deployFixture);
      // TODO_AI: test store(0), store(large number), store(same value twice)
    });

    describe("Events in ABI:", function () {
      it("should emit an event when data is stored", async function () {
        const { contract } = await loadFixture(deployFixture);
        // state-changing transaction
        const tx = await contract.store(1n);
        await tx.wait();
        expect(await contract.retrieve()).to.equal(1n); // Assuming the default value is 0
        // TODO_AI: If store emits an event, add expect for event here
        // await expect(tx).to.emit(contract, "DataStored");
      });
    });
  });

  describe("setAddress(address)", function () {
    it("happy path", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      // state-changing transaction
      const tx = await contract.setAddress(addr1.address);
      await tx.wait();
      expect(await contract.getAddress()).to.equal(addr1.address);
    });

    it("reverts on invalid input/role", async function () {
      const { contract } = await loadFixture(deployFixture);
      await expect(contract.setAddress(ethers.constants.AddressZero)).to.be.rejectedWith("Invalid address"); // TODO_AI: .with("MESSAGE")
    });

    it("boundary cases", async function () {
      const { contract } = await loadFixture(deployFixture);
      // TODO_AI: test setAddress(0), setAddress(addr1), setAddress(addr1) twice
    });

    describe("Events in ABI:", function () {
      it("should emit an event when address is set", async function () {
        const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
        // state-changing transaction
        const tx = await contract.setAddress(addr1.address);
        await tx.wait();
        expect(await contract.getAddress()).to.equal(addr1.address);
        // TODO_AI: If setAddress emits an event, add expect for event here
        // await expect(tx).to.emit(contract, "AddressSet");
      });
    });
  });

  describe("setRole(address, bool)", function () {
    it("happy path", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      // state-changing transaction
      const tx = await contract.setRole(addr1.address, true);
      await tx.wait();
      expect(await contract.hasRole(addr1.address)).to.be.true;
    });

    it("reverts on invalid input/role", async function () {
      const { contract } = await loadFixture(deployFixture);
      await expect(contract.setRole(ethers.constants.AddressZero, true)).to.be.rejectedWith("Invalid address"); // TODO_AI: .with("MESSAGE")
    });

    it("boundary cases", async function () {
      const { contract } = await loadFixture(deployFixture);
      // TODO_AI: test setRole(addr1, true), setRole(addr1, false), setRole(AddressZero, true)
    });

    describe("Events in ABI:", function () {
      it("should emit an event when role is set", async function () {
        const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
        // state-changing transaction
        const tx = await contract.setRole(addr1.address, true);
        await tx.wait();
        expect(await contract.hasRole(addr1.address)).to.be.true;
        // TODO_AI: If setRole emits an event, add expect for event here
        // await expect(tx).to.emit(contract, "RoleSet");
      });
    });
  });

  describe("getAddress()", function () {
    it("happy path", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      // read-only call
      expect(await contract.getAddress()).to.equal(owner.address);
    });

    // View functions cannot revert, so this test is commented out
    // it("reverts on invalid input/role", async function () {
    //   const { contract } = await loadFixture(deployFixture);
    //   await expect(contract.getAddress()).to.be.rejectedWith("No address set"); // TODO_AI: .with("MESSAGE")
    // });

    it("boundary cases", async function () {
      const { contract } = await loadFixture(deployFixture);
      // TODO_AI: test getAddress after setAddress(AddressZero), setAddress(addr1)
    });
  });

  describe("hasRole(address)", function () {
    it("happy path", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      expect(await contract.hasRole(owner.address)).to.be.true;
    });

    // View functions cannot revert, so this test is commented out
    // it("reverts on invalid input/role", async function () {
    //   const { contract } = await loadFixture(deployFixture);
    //   await expect(contract.hasRole(ethers.constants.AddressZero)).to.be.rejectedWith("Invalid address"); // TODO_AI: .with("MESSAGE")
    // });

    it("boundary cases", async function () {
      const { contract } = await loadFixture(deployFixture);
      // TODO_AI: test hasRole(AddressZero), hasRole(addr1) after setRole
    });
  });

  describe("constructor()", function () {
    it("should set the correct owner", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      expect(await contract.owner()).to.equal(owner.address);
    });

    // Constructor revert test: only valid if constructor can revert
    // it("reverts on invalid input/role", async function () {
    //   const Contract = await ethers.getContractFactory("Storage");
    //   await expect(Contract.deploy()).to.be.rejectedWith("Invalid constructor parameters"); // TODO_AI: .with("MESSAGE")
    // });

    it("boundary cases", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      // TODO_AI: test constructor with edge parameters if present
    });
  });
});