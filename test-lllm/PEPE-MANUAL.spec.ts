import { ethers } from "hardhat";
import { expect } from "chai";

describe("ERC20 Token", function () {
  let erc20Token: any;

  beforeEach(async function () {
    const ERC20 = await ethers.getContractFactory("ERC20");
    erc20Token = await ERC20.deploy("Test Token", "TST");
    await erc20Token.deployed();
  });

  it("should have the correct name and symbol", async function () {
    expect(await erc20Token.name()).to.equal("Test Token");
    expect(await erc20Token.symbol()).to.equal("TST");
  });

  it("should mint tokens to the deployer", async function () {
    const [deployer] = await ethers.getSigners();
    expect(await erc20Token.balanceOf(deployer.address)).to.equal(1000);
  });

  it("should allow transferring tokens", async function () {
    const [deployer, recipient] = await ethers.getSigners();

    // Transfer 500 tokens from deployer to recipient
    await erc20Token.transfer(recipient.address, 500);

    expect(await erc20Token.balanceOf(deployer.address)).to.equal(500);
    expect(await erc20Token.balanceOf(recipient.address)).to.equal(500);
  });

  it("should not allow transferring more tokens than the sender has", async function () {
    const [deployer, recipient] = await ethers.getSigners();

    // Try to transfer 1001 tokens from deployer to recipient
    try {
      await erc20Token.transfer(recipient.address, 1001);
    } catch (error) {
      expect(error.message).to.include("ERC20: transfer amount exceeds balance");
    }
  });

  it("should not allow transferring to the zero address", async function () {
    const [deployer] = await ethers.getSigners();

    // Try to transfer tokens to the zero address
    try {
      await erc20Token.transfer(ethers.ZeroAddress, 100);
    } catch (error) {
      expect(error.message).to.include("ERC20: transfer to the zero address");
    }
  });

  it("should allow approving a spender", async function () {
    const [deployer, spender] = await ethers.getSigners();

    // Approve spender to spend 500 tokens on behalf of deployer
    await erc20Token.approve(spender.address, 500);

    expect(await erc20Token.allowance(deployer.address, spender.address)).to.equal(500);
  });

  it("should allow spending approved tokens", async function () {
    const [deployer, spender] = await ethers.getSigners();

    // Approve spender to spend 500 tokens on behalf of deployer
    await erc20Token.approve(spender.address, 500);

    // Spender transfers 300 tokens from deployer to recipient
    await erc20Token.connect(spender).transferFrom(deployer.address, ethers.ZeroAddress, 300);

    expect(await erc20Token.balanceOf(deployer.address)).to.equal(200);
    expect(await erc20Token.allowance(deployer.address, spender.address)).to.equal(200);
  });

  it("should not allow spending more tokens than the approved amount", async function () {
    const [deployer, spender] = await ethers.getSigners();

    // Approve spender to spend 500 tokens on behalf of deployer
    await erc20Token.approve(spender.address, 500);

    // Try to transfer 600 tokens from deployer to recipient using the approved amount
    try {
      await erc20Token.connect(spender).transferFrom(deployer.address, ethers.ZeroAddress, 600);
    } catch (error) {
      expect(error.message).to.include("ERC20: insufficient allowance");
    }
  });
});
