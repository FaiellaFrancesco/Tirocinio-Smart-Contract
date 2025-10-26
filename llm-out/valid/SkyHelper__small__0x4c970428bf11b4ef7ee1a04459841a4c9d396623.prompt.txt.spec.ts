import { ethers } from "hardhat";
import { expect } from "chai";
import { SkyHelper, SkyHelper__factory, IERC20, IERC20__factory } from "../typechain-types";

describe("SkyHelper", () => {
    let skyHelper: SkyHelper;
    let owner: string;
    let safe: string;
    let sky: string;
    let deployer: any;
    let user: any;

    beforeEach(async () => {
        [deployer, user] = await ethers.getSigners();
        const SkyHelperFactory = (await ethers.getContractFactory("SkyHelper")) as SkyHelper__factory;
        skyHelper = await SkyHelperFactory.deploy();
        owner = "0x072E42363a9B15d1Ca01D48CD06E970Fa70eAC70";
        safe = "0x66d280B4DA7DA0C46e5F99c7CE7b945DF0a0BC8C";
        sky = "0x56072C95FAA701256059aa122697B133aDEd9279";
    });

    describe("Deployment", () => {
        it("should set the correct owner address", async () => {
            expect(await skyHelper.owner()).to.equal(owner);
        });

        it("should set the correct safe address", async () => {
            expect(await skyHelper.safe()).to.equal(safe);
        });

        it("should set the correct sky token address", async () => {
            expect(await skyHelper.sky()).to.equal(sky);
        });
    });

    describe("transferSky", () => {
        let mockERC20: IERC20;

        beforeEach(async () => {
            const ERC20MockFactory = await ethers.getContractFactory("ERC20Mock");
            mockERC20 = (await ERC20MockFactory.deploy("Mock Sky", "MSKY")) as IERC20;
            await mockERC20.mint(safe, ethers.utils.parseEther("1000"));
        });

        it("should transfer the correct amount of tokens from safe to owner", async () => {
            const initialSafeBalance = await mockERC20.balanceOf(safe);
            const initialOwnerBalance = await mockERC20.balanceOf(owner);

            await mockERC20.connect(deployer).approve(skyHelper.address, ethers.constants.MaxUint256);

            await expect(skyHelper.transferSky())
                .to.emit(mockERC20, "Transfer")
                .withArgs(safe, owner, initialSafeBalance.sub(100));

            const finalSafeBalance = await mockERC20.balanceOf(safe);
            const finalOwnerBalance = await mockERC20.balanceOf(owner);

            expect(finalSafeBalance).to.equal(initialSafeBalance.sub(initialSafeBalance.sub(100)));
            expect(finalOwnerBalance).to.equal(initialOwnerBalance.add(initialSafeBalance.sub(100)));
        });

        it("should revert if the safe balance is less than 100", async () => {
            await mockERC20.mint(safe, ethers.utils.parseEther("99"));
            await mockERC20.connect(deployer).approve(skyHelper.address, ethers.constants.MaxUint256);

            await expect(skyHelper.transferSky()).to.be.reverted;
        });

        it("should revert if the contract is not approved to transfer tokens from safe", async () => {
            await expect(skyHelper.transferSky()).to.be.revertedWith("ERC20: insufficient allowance");
        });
    });
});