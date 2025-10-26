import { ethers } from "hardhat";
import { expect } from "chai";

describe("OwnbitMultiSigProxy", () => {
    let OwnbitMultiSigProxy: any;
    let proxy: any;
    let owner1: any, owner2: any, owner3: any;

    beforeEach(async () => {
        [owner1, owner2, owner3] = await ethers.getSigners();
        OwnbitMultiSigProxy = await ethers.getContractFactory("OwnbitMultiSigProxy");
        proxy = await OwnbitMultiSigProxy.deploy([owner1.address, owner2.address], 2);
        await proxy.deployed();
    });

    describe("Deployment", () => {
        it("should set the correct implementation address", async () => {
            expect(await proxy.implementation()).to.equal("0x95Ca2f7959f8848795dFB0868C1b0c59Dd4E9330");
        });

        it("should initialize with the correct owners and required number", async () => {
            const initData = ethers.utils.defaultAbiCoder.encode(["address[]", "uint256"], [[owner1.address, owner2.address], 2]);
            await expect(proxy.deployTransaction).to.emit(proxy, "Initialized").withArgs(initData);
        });
    });

    describe("Fallback Function", () => {
        it("should delegatecall to the implementation contract", async () => {
            const data = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("someFunction()")).slice(0, 10);
            await expect(() => owner1.sendTransaction({ to: proxy.address, data })).to.changeEtherBalance(proxy, 0);
        });

        it("should revert if delegatecall fails", async () => {
            const invalidData = "0x12345678";
            await expect(owner1.sendTransaction({ to: proxy.address, data: invalidData })).to.be.reverted;
        });
    });

    describe("Edge Cases", () => {
        it("should revert if no owners are provided", async () => {
            await expect(OwnbitMultiSigProxy.deploy([], 2)).to.be.revertedWith("Initialization failed");
        });

        it("should revert if required number of owners is zero", async () => {
            await expect(OwnbitMultiSigProxy.deploy([owner1.address], 0)).to.be.revertedWith("Initialization failed");
        });

        it("should revert if required number of owners exceeds the number of provided owners", async () => {
            await expect(OwnbitMultiSigProxy.deploy([owner1.address, owner2.address], 3)).to.be.revertedWith("Initialization failed");
        });
    });
});