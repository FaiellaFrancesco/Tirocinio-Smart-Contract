import { ethers } from "hardhat";
import { expect } from "chai";

describe("Storage Contract", function () {
    let Storage: any;
    let storage: any;
    let owner: any;

    beforeEach(async function () {
        [owner] = await ethers.getSigners();
        Storage = await ethers.getContractFactory("Storage");
        storage = await Storage.deploy();
        await storage.deployed();
    });

    describe("Deployment", function () {
        it("Should deploy with the initial number set to 0", async function () {
            expect(await storage.retrieve()).to.equal(0);
        });
    });

    describe("Happy paths", function () {
        it("Should store a number correctly", async function () {
            await storage.store(42);
            expect(await storage.retrieve()).to.equal(42);
        });
    });

    describe("Reverts", function () {
        // No specific reverts in this contract, but testing for invalid inputs
        it("Should not revert when storing 0", async function () {
            await expect(storage.store(0)).not.to.be.reverted;
        });

        it("Should not revert when storing max uint256", async function () {
            const maxUint256 = ethers.constants.MaxUint256;
            await expect(storage.store(maxUint256)).not.to.be.reverted;
        });
    });

    describe("Events", function () {
        it("Should emit an event when a number is stored", async function () {
            await expect(storage.store(42))
                .to.emit(storage, "Store")
                .withArgs(owner.address, 42);
        });
    });

    describe("Edge cases", function () {
        it("Should handle storing zero correctly", async function () {
            await storage.store(0);
            expect(await storage.retrieve()).to.equal(0);
        });

        it("Should handle storing max uint256 correctly", async function () {
            const maxUint256 = ethers.constants.MaxUint256;
            await storage.store(maxUint256);
            expect(await storage.retrieve()).to.equal(maxUint256);
        });
    });
});