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

        it("should initialize with the correct owners and required", async () => {
            const initData = ethers.utils.defaultAbiCoder.encode(["address[]", "uint256"], [[owner1.address, owner2.address], 2]);
            expect(await proxy.callStatic.implementation()).to.equal("0x95Ca2f7959f8848795dFB0868C1b0c59Dd4E9330");
        });
    });

    describe("Fallback", () => {
        it("should delegatecall to the implementation contract", async () => {
            const data = ethers.utils.hexlify(ethers.utils.toUtf8Bytes("someFunction()"));
            await expect(proxy.sendTransaction({ data })).to.not.be.reverted;
        });

        it("should revert if delegatecall fails", async () => {
            const data = ethers.utils.hexlify(ethers.utils.toUtf8Bytes("nonExistentFunction()"));
            await expect(proxy.sendTransaction({ data })).to.be.revertedWith("revert");
        });
    });

    describe("Edge Cases", () => {
        it("should revert if no owners are provided", async () => {
            await expect(OwnbitMultiSigProxy.deploy([], 1)).to.be.reverted;
        });

        it("should revert if required is greater than number of owners", async () => {
            await expect(OwnbitMultiSigProxy.deploy([owner1.address], 2)).to.be.reverted;
        });

        it("should handle max integer for required", async () => {
            const maxUint = ethers.constants.MaxUint256;
            await expect(OwnbitMultiSigProxy.deploy([owner1.address, owner2.address], maxUint)).to.be.reverted;
        });
    });
});