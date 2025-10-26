import { ethers } from "hardhat";
import { expect } from "chai";

describe("AIblessed", () => {
    let AIblessed: any;
    let deployer: any;
    let recipient: any;

    beforeEach(async () => {
        [deployer, recipient] = await ethers.getSigners();
        const AIblessedFactory = await ethers.getContractFactory("AIblessed");
        AIblessed = await AIblessedFactory.deploy();
        await AIblessed.deployed();
    });

    describe("Deployment", () => {
        it("should set the correct name", async () => {
            expect(await AIblessed.name()).to.equal("AIblessed");
        });

        it("should set the correct symbol", async () => {
            expect(await AIblessed.symbol()).to.equal("AIB");
        });

        it("should set the correct decimals", async () => {
            expect(await AIblessed.decimals()).to.equal(18);
        });

        it("should set the correct total supply", async () => {
            expect(await AIblessed.totalSupply()).to.equal(ethers.utils.parseUnits("1000000", 18));
        });

        it("should assign the total supply to the deployer", async () => {
            expect(await AIblessed.balanceOf(deployer.address)).to.equal(ethers.utils.parseUnits("1000000", 18));
        });
    });

    describe("Transfer", () => {
        it("should transfer tokens successfully", async () => {
            const amount = ethers.utils.parseUnits("100", 18);
            await expect(AIblessed.transfer(recipient.address, amount))
                .to.emit(AIblessed, "Transfer")
                .withArgs(deployer.address, recipient.address, amount);

            expect(await AIblessed.balanceOf(deployer.address)).to.equal(ethers.utils.parseUnits("999900", 18));
            expect(await AIblessed.balanceOf(recipient.address)).to.equal(amount);
        });

        it("should revert on transfer with insufficient balance", async () => {
            const amount = ethers.utils.parseUnits("1000001", 18);
            await expect(AIblessed.transfer(recipient.address, amount)).to.be.revertedWith("Insufficient balance");
        });

        it("should revert on transfer to the zero address", async () => {
            const amount = ethers.utils.parseUnits("100", 18);
            await expect(AIblessed.transfer(ethers.constants.AddressZero, amount)).to.be.reverted;
        });

        it("should allow transferring zero tokens", async () => {
            const amount = ethers.utils.parseUnits("0", 18);
            await expect(AIblessed.transfer(recipient.address, amount))
                .to.emit(AIblessed, "Transfer")
                .withArgs(deployer.address, recipient.address, amount);

            expect(await AIblessed.balanceOf(deployer.address)).to.equal(ethers.utils.parseUnits("1000000", 18));
            expect(await AIblessed.balanceOf(recipient.address)).to.equal(amount);
        });
    });
});