import { ethers } from "hardhat";
import { expect } from "chai";

describe("ERC20Token", () => {
    let ERC20Token: any;
    let erc20Token: any;
    let owner: any;

    beforeEach(async () => {
        [owner] = await ethers.getSigners();
        ERC20Token = await ethers.getContractFactory("ERC20Token");
        erc20Token = await ERC20Token.deploy();
        await erc20Token.deployed();
    });

    describe("Deployment", () => {
        it("Should set the correct name and symbol", async () => {
            expect(await erc20Token.name()).to.equal("USD");
            expect(await erc20Token.symbol()).to.equal("USD");
        });

        it("Should initialize total supply array to zero", async () => {
            for (let i = 0; i < 2000; i++) {
                expect(await erc20Token._totalSupply(i)).to.equal(0);
            }
        });
    });

    describe("setTotalSupply", () => {
        it("Should set the total supply at a given index", async () => {
            await erc20Token.setTotalSupply(10, 1000);
            expect(await erc20Token._totalSupply(10)).to.equal(1000);
        });

        it("Should revert if index is out of bounds", async () => {
            await expect(erc20Token.setTotalSupply(2000, 1000)).to.be.revertedWith("index out of bounds");
        });

        it("Should emit an event when total supply is set", async () => {
            await expect(erc20Token.setTotalSupply(5, 500))
                .to.emit(erc20Token, "TotalSupplySet")
                .withArgs(5, 500);
        });

        it("Should handle zero values correctly", async () => {
            await erc20Token.setTotalSupply(15, 0);
            expect(await erc20Token._totalSupply(15)).to.equal(0);
        });
    });
});