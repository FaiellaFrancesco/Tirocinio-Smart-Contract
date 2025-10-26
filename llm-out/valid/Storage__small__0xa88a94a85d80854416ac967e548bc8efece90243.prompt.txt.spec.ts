import { ethers } from "hardhat";
import { expect } from "chai";

describe("Storage", function () {
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
        it("should deploy with the initial number set to 0", async function () {
            expect(await storage.retrieve()).to.equal(0);
        });
    });

    describe("store", function () {
        it("should store a number correctly", async function () {
            await storage.store(42);
            expect(await storage.retrieve()).to.equal(42);
        });

        it("should emit an event when storing a number", async function () {
            await expect(storage.store(42))
                .to.emit(storage, "Stored")
                .withArgs(42);
        });
    });

    describe("retrieve", function () {
        it("should retrieve the stored number correctly", async function () {
            await storage.store(42);
            expect(await storage.retrieve()).to.equal(42);
        });
    });

    describe("Edge Cases", function () {
        it("should handle storing zero value", async function () {
            await storage.store(0);
            expect(await storage.retrieve()).to.equal(0);
        });

        it("should handle storing max uint256 value", async function () {
            const maxValue = ethers.constants.MaxUint256;
            await storage.store(maxValue);
            expect(await storage.retrieve()).to.equal(maxValue);
        });
    });
});