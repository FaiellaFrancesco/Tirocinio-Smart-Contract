import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredicatePermitter", function () {
  let PredicatePermitter;
  let predicatePermitter: any;
  let owner: any;
  let addr1: any;
  let addr2: any;
  let predicateManager: any;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    PredicatePermitter = await ethers.getContractFactory("PredicatePermitter");
    predicateManager = await ethers.deployContract("MockPredicateManager"); // Assuming you have a mock for testing
    await predicateManager.waitForDeployment();

    predicatePermitter = await PredicatePermitter.deploy();
    await predicatePermitter.initialize(
      owner.address,
      await predicateManager.getAddress(),
      "testPolicyID"
    );
  });

  describe("Deployment", function () {
    it("should set the correct admin (owner)", async function () {
      expect(await predicatePermitter.owner()).to.equal(owner.address);
    });

    it("should set the correct Predicate Manager address", async function () {
      expect(await predicatePermitter._getPredicateManager()).to.equal(
        await predicateManager.getAddress()
      );
    });

    it("should set the correct policy ID", async function () {
      expect(await predicatePermitter.policyID()).to.equal("testPolicyID");
    });
  });

  describe("Happy Paths", function () {
    it("should allow owner to set a new policy ID", async function () {
      await predicatePermitter.setPolicy("newPolicyID");
      expect(await predicatePermitter.policyID()).to.equal("newPolicyID");
    });

    it("should allow owner to set a new Predicate Manager address", async function () {
      const newPredicateManager = await ethers.deployContract(
        "MockPredicateManager"
      );
      await newPredicateManager.waitForDeployment();

      await predicatePermitter.setPredicateManager(
        await newPredicateManager.getAddress()
      );
      expect(await predicatePermitter._getPredicateManager()).to.equal(
        await newPredicateManager.getAddress()
      );
    });

    it("should permit a transaction with valid PredicateMessage", async function () {
      const encodedData = ethers.utils.defaultAbiCoder.encode(["uint256"], [1]);
      const taskID = "task1";
      const expireByBlockNumber = 100;

      const predicateMessage: any = {
        taskId: taskID,
        expireByBlockNumber: expireByBlockNumber,
        signerAddresses: [owner.address],
        signatures: ["0xdeadbeef"], // Mock signature
      };

      const encodedPredicateMessage = ethers.utils.defaultAbiCoder.encode(
        [
          "tuple(string taskId, uint256 expireByBlockNumber, address[] signerAddresses, bytes[] signatures)",
        ],
        [predicateMessage]
      );

      await predicatePermitter.permit(
        owner.address,
        0,
        encodedData,
        encodedPredicateMessage
      );
    });
  });

  describe("Reverts", function () {
    it("should revert on invalid address in initialize", async function () {
      const Contract = await ethers.getContractFactory("PredicatePermitter");
      const contract = await Contract.deploy();

      await expect(
        contract.initialize(
          ethers.constants.AddressZero,
          await predicateManager.getAddress(),
          "testPolicyID"
        )
      ).to.be.revertedWithCustomError(contract, "AddressZero");

      await expect(
        contract.initialize(
          owner.address,
          ethers.constants.AddressZero,
          "testPolicyID"
        )
      ).to.be.revertedWithCustomError(contract, "AddressZero");
    });

    it("should revert on empty policy ID in initialize", async function () {
      const Contract = await ethers.getContractFactory("PredicatePermitter");
      const contract = await Contract.deploy();

      await expect(
        contract.initialize(owner.address, await predicateManager.getAddress(), "")
      ).to.be.revertedWithCustomError(contract, "PolicyIDEmpty");
    });

    it("should revert on unauthorized access to setPolicy", async function () {
      await expect(
        predicatePermitter.connect(addr1).setPolicy("newPolicyID")
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should revert on unauthorized access to setPredicateManager", async function () {
      await expect(
        predicatePermitter.connect(addr1).setPredicateManager(owner.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Events", function () {
    it("should emit PolicySet event on setting new policy ID", async function () {
      await expect(predicatePermitter.setPolicy("newPolicyID"))
        .to.emit(predicatePermitter, "PolicySet")
        .withArgs("newPolicyID");
    });

    it("should emit PredicateManagerSet event on setting new Predicate Manager address", async function () {
      const newPredicateManager = await ethers.deployContract(
        "MockPredicateManager"
      );
      await newPredicateManager.waitForDeployment();

      await expect(
        predicatePermitter.setPredicateManager(await newPredicateManager.getAddress())
      )
        .to.emit(predicatePermitter, "PredicateManagerSet")
        .withArgs(await newPredicateManager.getAddress());
    });
  });

  describe("Edge Cases", function () {
    it("should handle zero value in permit", async function () {
      const encodedData = ethers.utils.defaultAbiCoder.encode(["uint256"], [1]);
      const taskID = "task1";
      const expireByBlockNumber = 100;

      const predicateMessage: any = {
        taskId: taskID,
        expireByBlockNumber: expireByBlockNumber,
        signerAddresses: [owner.address],
        signatures: ["0xdeadbeef"], // Mock signature
      };

      const encodedPredicateMessage = ethers.utils.defaultAbiCoder.encode(
        [
          "tuple(string taskId, uint256 expireByBlockNumber, address[] signerAddresses, bytes[] signatures)",
        ],
        [predicateMessage]
      );

      await predicatePermitter.permit(
        owner.address,
        0,
        encodedData,
        encodedPredicateMessage
      );
    });

    it("should handle max integer in permit", async function () {
      const encodedData = ethers.utils.defaultAbiCoder.encode(["uint256"], [1]);
      const taskID = "task1";
      const expireByBlockNumber = ethers.MaxUint256;

      const predicateMessage: any = {
        taskId: taskID,
        expireByBlockNumber: expireByBlockNumber,
        signerAddresses: [owner.address],
        signatures: ["0xdeadbeef"], // Mock signature
      };

      const encodedPredicateMessage = ethers.utils.defaultAbiCoder.encode(
        [
          "tuple(string taskId, uint256 expireByBlockNumber, address[] signerAddresses, bytes[] signatures)",
        ],
        [predicateMessage]
      );

      await predicatePermitter.permit(
        owner.address,
        0,
        encodedData,
        encodedPredicateMessage
      );
    });

    it("should handle empty string in policy ID", async function () {
      const Contract = await ethers.getContractFactory("PredicatePermitter");
      const contract = await Contract.deploy();

      await expect(
        contract.initialize(owner.address, await predicateManager.getAddress(), "")
      ).to.be.revertedWithCustomError(contract, "PolicyIDEmpty");
    });

    it("should handle address(0) in setPredicateManager", async function () {
      await expect(
        predicatePermitter.setPredicateManager(ethers.constants.AddressZero)
      ).to.be.revertedWithCustomError(predicatePermitter, "AddressZero");
    });
  });
});