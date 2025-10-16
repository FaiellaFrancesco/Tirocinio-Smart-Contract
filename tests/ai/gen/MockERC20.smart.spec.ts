import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

/**
 * Auto-generated scaffold for MockERC20.
 * ARTIFACT_SOURCE: contracts/MockERC20.sol
 * ARTIFACT_PATH: MockERC20.sol/MockERC20.json
 * ARTIFACT_FQN: contracts/MockERC20.sol:MockERC20
 *
 * FUNCTIONS:
 *   allowance(address,address)->view
 *   approve(address,uint256)->nonpayable
 *   balanceOf(address)->view
 *   decimals()->view
 *   mint(address,uint256)->nonpayable
 *   name()->view
 *   symbol()->view
 *   totalSupply()->view
 *   transfer(address,uint256)->nonpayable
 *   transferFrom(address,address,uint256)->nonpayable
 *
 * EVENTS:
 *   (none)
 *
 * LLM NOTES (follow strictly):
 * - Remove this.skip() and fill TODO_AI blocks when implementing tests.
 * - Use Ethers v6 (no ethers.utils), bigint literals, ethers.ZeroAddress.
 * - View/Pure: assert return values. State-changing: happy path + revert + boundary.
 * - Do NOT introduce functions that are not listed above.
 */

describe("MockERC20 — AI Generated Scaffold", function () {
  async function deployFixture() {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Contract = await ethers.getContractFactory("contracts/MockERC20.sol:MockERC20");
    const contract = await Contract.deploy(0n);
    await contract.waitForDeployment();
    return { contract, owner, addr1, addr2 };
  }

  it("deployment", async function () {
    const { contract } = await loadFixture(deployFixture);
    expect(await contract.getAddress()).to.be.properAddress;
  });

  describe("allowance(address,address)", function () {
    it("happy path", async function () {
      const { contract, owner, addr1 } = await loadFixture(deployFixture);
      // Arrange
      await contract.approve(addr1.address, ethers.parseEther("100"));
      // Act
      const allowance = await contract.allowance(owner.address, addr1.address);
      // Assert
      expect(allowance).to.equal(ethers.parseEther("100"));
    });

    it("edge cases", async function () {
      const { contract, owner } = await loadFixture(deployFixture);
      // Arrange
      // Test zero allowance
      let allowanceZero = await contract.allowance(owner.address, addr1.address);
      expect(allowanceZero).to.equal(ethers.Zero);

      // Test max allowance (assuming no limit)
      const maxAllowance = ethers.parseEther("100000000000000000000000000");
      await contract.approve(addr1.address, maxAllowance);
      let allowanceMax = await contract.allowance(owner.address, addr1.address);
      expect(allowanceMax).to.equal(maxAllowance);

      // Test zero address
      try {
        await contract.allowance(owner.address, ethers.ZeroAddress);
        expect.fail("Expected revert");
      } catch (error) {
        expect(error.message).to.include("ERC20: invalid address");
      }
    });
  });

  describe("approve(address,uint256)", function () {
    it("happy path", async function () {
      const { contract, owner, addr1 } = await loadFixture(deployFixture);
      // Arrange
      // Act
      await contract.approve(addr1.address, ethers.parseEther("100"));
      // Assert
      expect(await contract.allowance(owner.address, addr1.address)).to.equal(ethers.parseEther("100"));
    });

    it("reverts on invalid input/role", async function () {
      const { contract, owner } = await loadFixture(deployFixture);
      // Arrange
      try {
        await contract.approve(addr1.address, ethers.Zero);
        expect.fail("Expected revert");
      } catch (error) {
        expect(error.message).to.include("ERC20: invalid amount");
      }

      try {
        await contract.approve(ethers.ZeroAddress, ethers.parseEther("100"));
        expect.fail("Expected revert");
      } catch (error) {
        expect(error.message).to.include("ERC20: invalid address");
      }
    });

    it("boundary cases", async function () {
      const { contract, owner } = await loadFixture(deployFixture);
      // Arrange
      // Test zero allowance
      let allowanceZero = await contract.allowance(owner.address, addr1.address);
      expect(allowanceZero).to.equal(ethers.Zero);

      // Test max allowance (assuming no limit)
      const maxAllowance = ethers.parseEther("100000000000000000000000000");
      await contract.approve(addr1.address, maxAllowance);
      let allowanceMax = await contract.allowance(owner.address, addr1.address);
      expect(allowanceMax).to.equal(maxAllowance);

      // Test zero address
      try {
        await contract.approve(addr1.address, ethers.parseEther("100"));
        expect.fail("Expected revert");
      } catch (error) {
        expect(error.message).to.include("ERC20: invalid amount");
      }
    });
  });

  describe("balanceOf(address)", function () {
    it("happy path", async function () {
      const { contract, owner, addr1 } = await loadFixture(deployFixture);
      // Arrange
      await contract.mint(owner.address, ethers.parseEther("100"));
      // Act
      let balanceOwner = await contract.balanceOf(owner.address);
      expect(balanceOwner).to.equal(ethers.parseEther("100"));

      let balanceAddr1 = await contract.balanceOf(addr1.address);
      expect(balanceAddr1).to.equal(ethers.Zero);

      // Mint more tokens to addr1
      await contract.mint(addr1.address, ethers.parseEther("50"));
      balanceAddr1 = await contract.balanceOf(addr1.address);
      expect(balanceAddr1).to.equal(ethers.parseEther("50"));
    });

    it("edge cases", async function () {
      const { contract } = await loadFixture(deployFixture);
      // Arrange
      let balanceZero = await contract.balanceOf(ethers.ZeroAddress);
      expect(balanceZero).to.equal(ethers.Zero);

      try {
        await contract.balanceOf(addr1.address);
        expect.fail("Expected revert");
      } catch (error) {
        expect(error.message).to.include("ERC20: invalid address");
      }
    });
  });

  describe("decimals()", function () {
    it("happy path", async function () {
      const { contract } = await loadFixture(deployFixture);
      // Arrange
      let decimalsValue = await contract.decimals();
      expect(decimalsValue).to.equal(18);
    });

    it("edge cases", async function () {
      const { contract } = await loadFixture(deployFixture);
      // No edge cases for this function as it is a constant
    });
  });

  describe("mint(address,uint256)", function () {
    it("happy path", async function () {
      const { contract, owner, addr1 } = await loadFixture(deployFixture);
      // Arrange
      // Act
      await contract.mint(owner.address, ethers.parseEther("100"));
      // Assert
      let balanceOwner = await contract.balanceOf(owner.address);
      expect(balanceOwner).to.equal(ethers.parseEther("100"));

      try {
        await contract.mint(addr1.address, ethers.parseEther("50"));
        expect.fail("Expected revert");
      } catch (error) {
        expect(error.message).to.include("ERC20: invalid address");
      }
    });

    it("reverts on invalid input/role", async function () {
      const { contract, owner } = await loadFixture(deployFixture);
      // Arrange
      try {
        await contract.mint(ethers.ZeroAddress, ethers.parseEther("100"));
        expect.fail("Expected revert");
      } catch (error) {
        expect(error.message).to.include("ERC20: invalid address");
      }
    });

    it("boundary cases", async function () {
      const { contract, owner } = await loadFixture(deployFixture);
      // Arrange
      // No boundary cases for this function as it is a constant
    });
  });

  describe("transfer(address,uint256)", function () {
    it("happy path", async function () {
      const { contract, owner, addr1 } = await loadFixture(deployFixture);
      // Arrange
      await contract.mint(owner.address, ethers.parseEther("100"));
      // Act
      let balanceOwnerBefore = await contract.balanceOf(owner.address);
      let balanceAddr1Before = await contract.balanceOf(addr1.address);

      await contract.transfer(addr1.address, ethers.parseEther("50"));

      let balanceOwnerAfter = await contract.balanceOf(owner.address);
      let balanceAddr1After = await contract.balanceOf(addr1.address);

      // Assert
      expect(balanceOwnerAfter).to.equal(ethers.parseEther("50"));
      expect(balanceAddr1After).to.equal(ethers.parseEther("50"));

      // Check events
      const transferEvent = await contract.queryFilter(contract.filters.Transfer(owner.address, addr1.address));
      expect(transferEvent.length).to.equal(1);
      expect(transferEvent[0].args.value).to.equal(ethers.parseEther("50"));
    });

    it("reverts on invalid input/role", async function () {
      const { contract, owner } = await loadFixture(deployFixture);
      // Arrange
      try {
        await contract.transfer(addr1.address, ethers.Zero);
        expect.fail("Expected revert");
      } catch (error) {
        expect(error.message).to.include("ERC20: invalid amount");
      }

      try {
        await contract.transfer(ethers.ZeroAddress, ethers.parseEther("50"));
        expect.fail("Expected revert");
      } catch (error) {
        expect(error.message).to.include("ERC20: invalid address");
      }
    });

    it("boundary cases", async function () {
      const { contract, owner } = await loadFixture(deployFixture);
      // Arrange
      try {
        await contract.transfer(addr1.address, ethers.parseEther("101"));
        expect.fail("Expected revert");
      } catch (error) {
        expect(error.message).to.include("ERC20: transfer amount exceeds balance");
      }

      try {
        await contract.transfer(ethers.ZeroAddress, ethers.parseEther("50"));
        expect.fail("Expected revert");
      } catch (error) {
        expect(error.message).to.include("ERC20: invalid address");
      }
    });
  });

  describe("transferFrom(address,address,uint256)", function () {
    it("happy path", async function () {
      const { contract, owner, addr1 } = await loadFixture(deployFixture);
      // Arrange
      await contract.mint(owner.address, ethers.parseEther("100"));
      await contract.approve(addr1.address, ethers.parseEther("50"));

      // Act
      let balanceOwnerBefore = await contract.balanceOf(owner.address);
      let balanceAddr1Before = await contract.balanceOf(addr1.address);

      await contract.transferFrom(owner.address, addr1.address, ethers.parseEther("50"));

      let balanceOwnerAfter = await contract.balanceOf(owner.address);
      let balanceAddr1After = await contract.balanceOf(addr1.address);

      // Assert
      expect(balanceOwnerAfter).to.equal(ethers.parseEther("50"));
      expect(balanceAddr1After).to.equal(ethers.parseEther("50"));

      // Check events
      const transferEvent = await contract.queryFilter(contract.filters.Transfer(owner.address, addr1.address));
      expect(transferEvent.length).to.equal(1);
      expect(transferEvent[0].args.value).to.equal(ethers.parseEther("50"));
    });

    it("reverts on invalid input/role", async function () {
      const { contract, owner } = await loadFixture(deployFixture);
      // Arrange
      try {
        await contract.transferFrom(addr1.address, owner.address, ethers.parseEther("50"));
        expect.fail("Expected revert");
      } catch (error) {
        expect(error.message).to.include("ERC20: invalid sender");
      }

      try {
        await contract.transferFrom(owner.address, addr1.address, ethers.Zero);
        expect.fail("Expected revert");
      } catch (error) {
        expect(error.message).to.include("ERC20: invalid amount");
      }
    });

    it("boundary cases", async function () {
      const { contract, owner, addr1 } = await loadFixture(deployFixture);
      // Arrange
      try {
        await contract.transferFrom(owner.address, addr1.address, ethers.parseEther("51"));
        expect.fail("Expected revert");
      } catch (error) {
        expect(error.message).to.include("ERC20: transfer amount exceeds allowance");
      }

      try {
        await contract.transferFrom(addr1.address, owner.address, ethers.parseEther("50"));
        expect.fail("Expected revert");
      } catch (error) {
        expect(error.message).to.include("ERC20: invalid sender");
      }
    });
  });

});