import { ethers } from "hardhat";
import { expect } from "chai";

describe("Gunthy", () => {
    let Gunthy;
    let gunthy: any;
    let owner: any;
    let addr1: any;
    let addr2: any;
    let token: any;

    beforeEach(async () => {
        [owner, addr1, addr2] = await ethers.getSigners();

        const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
        token = await ERC20Mock.deploy("Test Token", "TTK", owner.address, ethers.utils.parseEther("1000"));

        Gunthy = await ethers.getContractFactory("Gunthy");
        gunthy = await Gunthy.deploy();
    });

    describe("Deployment", () => {
        it("Should set the right owner", async () => {
            expect(await gunthy.owner()).to.equal(owner.address);
        });
    });

    describe("Airdrop Function", () => {
        it("Should transfer tokens to a valid recipient", async () => {
            await token.approve(gunthy.address, ethers.utils.parseEther("100"));
            await expect(gunthy.airdrop(token.address, addr1.address, ethers.utils.parseEther("10")))
                .to.emit(token, "Transfer")
                .withArgs(owner.address, addr1.address, ethers.utils.parseEther("10"));
        });

        it("Should revert if the recipient is address(0)", async () => {
            await expect(gunthy.airdrop(token.address, ethers.constants.AddressZero, ethers.utils.parseEther("10")))
                .to.be.revertedWith("Invalid recipient");
        });

        it("Should revert if the token address is address(0)", async () => {
            await expect(gunthy.airdrop(ethers.constants.AddressZero, addr1.address, ethers.utils.parseEther("10")))
                .to.be.revertedWith("Invalid token address");
        });

        it("Should revert if the transfer amount exceeds allowance", async () => {
            await token.approve(gunthy.address, ethers.utils.parseEther("5"));
            await expect(gunthy.airdrop(token.address, addr1.address, ethers.utils.parseEther("10")))
                .to.be.revertedWith("Transfer failed");
        });

        it("Should revert if called by a non-owner", async () => {
            await token.approve(gunthy.address, ethers.utils.parseEther("10"));
            await expect(gunthy.connect(addr1).airdrop(token.address, addr2.address, ethers.utils.parseEther("5")))
                .to.be.revertedWith("Not owner");
        });
    });

    describe("Edge Cases", () => {
        it("Should handle zero transfer amount", async () => {
            await token.approve(gunthy.address, ethers.utils.parseEther("10"));
            await expect(gunthy.airdrop(token.address, addr1.address, 0))
                .to.emit(token, "Transfer")
                .withArgs(owner.address, addr1.address, 0);
        });

        it("Should handle max uint256 transfer amount", async () => {
            const maxUint256 = ethers.constants.MaxUint256;
            await token.approve(gunthy.address, maxUint256);
            await expect(gunthy.airdrop(token.address, addr1.address, maxUint256))
                .to.be.revertedWith("Transfer failed");
        });
    });
});