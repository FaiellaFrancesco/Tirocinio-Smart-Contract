import { expect } from "chai";
import { ethers } from "hardhat";

describe("TokenContract", function () {
  let TokenContract;
  let contract;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    TokenContract = await ethers.getContractFactory("TokenContract");
    contract = await TokenContract.deploy();
    await contract.deployed();
  });

  describe("Deployment", function () {
    it("should set the correct owner", async function () {
      expect(await contract.owner()).to.equal(owner.address);
    });

    it("should initialize token balances correctly", async function () {
      const totalSupply = await contract.totalSupply();
      expect(await contract.balanceOf(owner.address)).to.equal(totalSupply);
    });
  });

  describe("Happy Paths", function () {
    it("should allow owner to enable swap", async function () {
      await contract.setSwapEnabled(true);
      expect(await contract.swapEnabled()).to.be.true;
    });

    it("should allow owner to set marketing wallet", async function () {
      await contract.setMarketingWallet(addr1.address);
      expect(await contract.marketingWallet()).to.equal(addr1.address);
    });

    it("should allow owner to set dev wallet", async function () {
      await contract.setDevWallet(addr2.address);
      expect(await contract.devWallet()).to.equal(addr2.address);
    });

    it("should allow owner to set axom wallet", async function () {
      await contract.setAxomWallet(addr1.address);
      expect(await contract.axomWallet()).to.equal(addr1.address);
    });

    it("should allow owner to reset tax amounts", async function () {
      await contract.resetTaxAmount();
      expect(await contract.tokensForLiquidity()).to.equal(0);
      expect(await contract.tokensForMarketing()).to.equal(0);
      expect(await contract.tokensForDev()).to.equal(0);
      expect(await contract.tokensForAxom()).to.equal(0);
    });

    it("should allow owner to transfer tokens", async function () {
      await contract.transfer(addr1.address, 100);
      expect(await contract.balanceOf(addr1.address)).to.equal(100);
    });
  });

  describe("Reverts", function () {
    it("should revert when non-owner tries to enable swap", async function () {
      await expect(contract.connect(addr1).setSwapEnabled(true))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should revert when non-owner tries to set marketing wallet", async function () {
      await expect(contract.connect(addr1).setMarketingWallet(addr2.address))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should revert when non-owner tries to set dev wallet", async function () {
      await expect(contract.connect(addr1).setDevWallet(addr2.address))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should revert when non-owner tries to set axom wallet", async function () {
      await expect(contract.connect(addr1).setAxomWallet(addr2.address))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should revert when transferring tokens to zero address", async function () {
      await expect(contract.transfer(ethers.constants.AddressZero, 100))
        .to.be.reverted;
    });

    it("should revert when transferring more tokens than balance", async function () {
      await expect(contract.transfer(addr1.address, ethers.utils.parseEther("1000000")))
        .to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });
  });

  describe("Events", function () {
    it("should emit Transfer event on token transfer", async function () {
      await expect(contract.transfer(addr1.address, 100))
        .to.emit(contract, "Transfer")
        .withArgs(owner.address, addr1.address, 100);
    });

    it("should emit SwapAndLiquify event when swapping tokens for liquidity", async function () {
      // Simulate some token transfers to accumulate fees
      await contract.transfer(addr1.address, ethers.utils.parseEther("1"));
      await contract.connect(addr1).transfer(owner.address, ethers.utils.parseEther("0.5"));

      await expect(contract.swapBack())
        .to.emit(contract, "SwapAndLiquify")
        .withArgs(ethers.utils.parseEther("0.25"), ethers.utils.parseEther("0.25"), 0);
    });
  });

  describe("Edge Cases", function () {
    it("should handle zero value transfers", async function () {
      await contract.transfer(addr1.address, 0);
      expect(await contract.balanceOf(addr1.address)).to.equal(0);
    });

    it("should handle max integer values", async function () {
      const maxUint256 = ethers.constants.MaxUint256;
      await expect(contract.transfer(addr1.address, maxUint256))
        .to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });
  });

  describe("Access Control", function () {
    it("should only allow owner to set swap enabled", async function () {
      await contract.setSwapEnabled(true);
      expect(await contract.swapEnabled()).to.be.true;

      await expect(contract.connect(addr1).setSwapEnabled(false))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should only allow owner to set marketing wallet", async function () {
      await contract.setMarketingWallet(addr1.address);
      expect(await contract.marketingWallet()).to.equal(addr1.address);

      await expect(contract.connect(addr1).setMarketingWallet(addr2.address))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should only allow owner to set dev wallet", async function () {
      await contract.setDevWallet(addr1.address);
      expect(await contract.devWallet()).to.equal(addr1.address);

      await expect(contract.connect(addr1).setDevWallet(addr2.address))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should only allow owner to set axom wallet", async function () {
      await contract.setAxomWallet(addr1.address);
      expect(await contract.axomWallet()).to.equal(addr1.address);

      await expect(contract.connect(addr1).setAxomWallet(addr2.address))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should only allow owner to reset tax amounts", async function () {
      await contract.resetTaxAmount();
      expect(await contract.tokensForLiquidity()).to.equal(0);
      expect(await contract.tokensForMarketing()).to.equal(0);
      expect(await contract.tokensForDev()).to.equal(0);
      expect(await contract.tokensForAxom()).to.equal(0);

      await expect(contract.connect(addr1).resetTaxAmount())
        .to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Pure and View Functions", function () {
    it("should return correct total supply", async function () {
      const totalSupply = await contract.totalSupply();
      expect(totalSupply).to.not.equal(0);
    });

    it("should return correct balance of an address", async function () {
      const balance = await contract.balanceOf(owner.address);
      expect(balance).to.not.equal(0);
    });
  });
});