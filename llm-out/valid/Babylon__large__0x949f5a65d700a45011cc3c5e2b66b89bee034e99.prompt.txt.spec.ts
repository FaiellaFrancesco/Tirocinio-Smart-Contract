import { expect } from "chai";
import { ethers } from "hardhat";

describe("Babylon", function () {
  let Babylon;
  let babylon: any;
  let owner: any;
  let addr1: any;
  let addr2: any;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    Babylon = await ethers.getContractFactory("Babylon");
    babylon = await Babylon.deploy();
    await babylon.deployed();
  });

  describe("Deployment", function () {
    it("should set the correct owner", async function () {
      expect(await babylon.owner()).to.equal(owner.address);
    });

    it("should mint initial supply to the owner", async function () {
      const totalSupply = await babylon.totalSupply();
      const ownerBalance = await babylon.balanceOf(owner.address);
      expect(totalSupply).to.equal(ethers.utils.parseUnits("10000000000", 18));
      expect(ownerBalance).to.equal(ethers.utils.parseUnits("10000000000", 18));
    });
  });

  describe("Happy paths", function () {
    it("should transfer tokens between accounts", async function () {
      await babylon.transfer(addr1.address, ethers.utils.parseUnits("100", 18));
      expect(await babylon.balanceOf(addr1.address)).to.equal(ethers.utils.parseUnits("100", 18));
    });

    it("should approve and transferFrom tokens", async function () {
      await babylon.approve(addr1.address, ethers.utils.parseUnits("200", 18));
      expect(await babylon.allowance(owner.address, addr1.address)).to.equal(ethers.utils.parseUnits("200", 18));

      await babylon.connect(addr1).transferFrom(owner.address, addr2.address, ethers.utils.parseUnits("150", 18));
      expect(await babylon.balanceOf(addr2.address)).to.equal(ethers.utils.parseUnits("150", 18));
    });

    it("should mint tokens to a specific address", async function () {
      await babylon.mint(addr1.address, ethers.utils.parseUnits("300", 18));
      expect(await babylon.balanceOf(addr1.address)).to.equal(ethers.utils.parseUnits("300", 18));
    });

    it("should burn tokens from the owner's account", async function () {
      await babylon.burn(ethers.utils.parseUnits("50", 18));
      expect(await babylon.balanceOf(owner.address)).to.equal(ethers.utils.parseUnits("9999999950", 18));
    });
  });

  describe("Reverts", function () {
    it("should revert on transfer to the zero address", async function () {
      await expect(
        babylon.transfer(ethers.constants.AddressZero, ethers.utils.parseUnits("100", 18))
      ).to.be.revertedWithCustomError(babylon, "ERC20InvalidReceiver");
    });

    it("should revert on transferFrom with insufficient allowance", async function () {
      await expect(
        babylon.connect(addr1).transferFrom(owner.address, addr2.address, ethers.utils.parseUnits("150", 18))
      ).to.be.revertedWithCustomError(babylon, "ERC20InsufficientAllowance");
    });

    it("should revert on burn with insufficient balance", async function () {
      await expect(
        babylon.burn(ethers.utils.parseUnits("10000000001", 18))
      ).to.be.revertedWithCustomError(babylon, "ERC20InsufficientBalance");
    });

    it("should revert on mint by non-owner", async function () {
      await expect(
        babylon.connect(addr1).mint(addr2.address, ethers.utils.parseUnits("300", 18))
      ).to.be.revertedWithCustomError(babylon, "OwnableUnauthorizedAccount");
    });

    it("should revert on burn by non-owner", async function () {
      await expect(
        babylon.connect(addr1).burn(ethers.utils.parseUnits("50", 18))
      ).to.be.revertedWithCustomError(babylon, "OwnableUnauthorizedAccount");
    });
  });

  describe("Events", function () {
    it("should emit Transfer event on token transfer", async function () {
      await expect(
        babylon.transfer(addr1.address, ethers.utils.parseUnits("100", 18))
      ).to.emit(babylon, "Transfer")
        .withArgs(owner.address, addr1.address, ethers.utils.parseUnits("100", 18));
    });

    it("should emit Approval event on token approval", async function () {
      await expect(
        babylon.approve(addr1.address, ethers.utils.parseUnits("200", 18))
      ).to.emit(babylon, "Approval")
        .withArgs(owner.address, addr1.address, ethers.utils.parseUnits("200", 18));
    });

    it("should emit Transfer event on token mint", async function () {
      await expect(
        babylon.mint(addr1.address, ethers.utils.parseUnits("300", 18))
      ).to.emit(babylon, "Transfer")
        .withArgs(ethers.constants.AddressZero, addr1.address, ethers.utils.parseUnits("300", 18));
    });

    it("should emit Transfer event on token burn", async function () {
      await expect(
        babylon.burn(ethers.utils.parseUnits("50", 18))
      ).to.emit(babylon, "Transfer")
        .withArgs(owner.address, ethers.constants.AddressZero, ethers.utils.parseUnits("50", 18));
    });
  });

  describe("Edge cases", function () {
    it("should handle zero value transfers", async function () {
      await babylon.transfer(addr1.address, ethers.utils.parseUnits("0", 18));
      expect(await babylon.balanceOf(addr1.address)).to.equal(ethers.utils.parseUnits("0", 18));
    });

    it("should handle max integer values for approval", async function () {
      await babylon.approve(addr1.address, ethers.constants.MaxUint256);
      expect(await babylon.allowance(owner.address, addr1.address)).to.equal(ethers.constants.MaxUint256);
    });
  });
});