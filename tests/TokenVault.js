const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TokenVault", function () {
  let tokenVault;
  let mockToken;
  let owner, user1, user2;
  const tokenAmount = ethers.parseEther("100");

  // Mock ERC20 Token for testing
  const mockTokenContract = `
    // SPDX-License-Identifier: MIT
    pragma solidity ^0.8.0;

    contract MockERC20 {
        mapping(address => uint256) private _balances;
        mapping(address => mapping(address => uint256)) private _allowances;
        
        uint256 private _totalSupply;
        string public name = "MockToken";
        string public symbol = "MTK";
        uint8 public decimals = 18;
        
        constructor(uint256 _initialSupply) {
            _totalSupply = _initialSupply;
            _balances[msg.sender] = _initialSupply;
        }
        
        function totalSupply() public view returns (uint256) {
            return _totalSupply;
        }
        
        function balanceOf(address account) public view returns (uint256) {
            return _balances[account];
        }
        
        function transfer(address to, uint256 amount) public returns (bool) {
            require(_balances[msg.sender] >= amount, "Insufficient balance");
            _balances[msg.sender] -= amount;
            _balances[to] += amount;
            return true;
        }
        
        function allowance(address _owner, address spender) public view returns (uint256) {
            return _allowances[_owner][spender];
        }
        
        function approve(address spender, uint256 amount) public returns (bool) {
            _allowances[msg.sender][spender] = amount;
            return true;
        }
        
        function transferFrom(address from, address to, uint256 amount) public returns (bool) {
            require(_allowances[from][msg.sender] >= amount, "Insufficient allowance");
            require(_balances[from] >= amount, "Insufficient balance");
            
            _allowances[from][msg.sender] -= amount;
            _balances[from] -= amount;
            _balances[to] += amount;
            return true;
        }
        
        function mint(address to, uint256 amount) public {
            _balances[to] += amount;
            _totalSupply += amount;
        }
    }
  `;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    
    // Deploy mock token
    const MockToken = await ethers.getContractFactory("MockERC20");
    mockToken = await MockToken.deploy(ethers.parseEther("1000000")); // 1M tokens
    await mockToken.waitForDeployment();
    
    // Deploy TokenVault
    const TokenVault = await ethers.getContractFactory("TokenVault");
    tokenVault = await TokenVault.deploy(mockToken.target);
    await tokenVault.waitForDeployment();
    
    // Give some tokens to users
    await mockToken.transfer(user1.address, tokenAmount);
    await mockToken.transfer(user2.address, tokenAmount);
  });

  describe("Deployment", function () {
    it("Should set the correct owner and token", async function () {
      expect(await tokenVault.owner()).to.equal(owner.address);
      expect(await tokenVault.token()).to.equal(mockToken.target);
    });
  });

  describe("Deposit", function () {
    beforeEach(async function () {
      // Approve the vault to spend user's tokens
      await mockToken.connect(user1).approve(tokenVault.target, tokenAmount);
    });

    it("Should allow users to deposit tokens", async function () {
      const depositAmount = ethers.parseEther("50");
      
      await expect(tokenVault.connect(user1).deposit(depositAmount))
        .to.emit(tokenVault, "Deposited")
        .withArgs(user1.address, depositAmount);
      
      expect(await tokenVault.balanceOf(user1.address)).to.equal(depositAmount);
      expect(await mockToken.balanceOf(user1.address)).to.equal(tokenAmount - depositAmount);
    });

    it("Should reject zero amount deposits", async function () {
      await expect(tokenVault.connect(user1).deposit(0))
        .to.be.revertedWith("Amount must be positive");
    });

    it("Should reject deposits without sufficient allowance", async function () {
      const largeAmount = ethers.parseEther("200");
      
      await expect(tokenVault.connect(user1).deposit(largeAmount))
        .to.be.revertedWith("Insufficient allowance");
    });

    it("Should reject deposits without sufficient balance", async function () {
      const largeAmount = ethers.parseEther("200");
      await mockToken.connect(user1).approve(tokenVault.target, largeAmount);
      
      await expect(tokenVault.connect(user1).deposit(largeAmount))
        .to.be.revertedWith("Insufficient balance");
    });

    it("Should accumulate multiple deposits", async function () {
      const firstDeposit = ethers.parseEther("30");
      const secondDeposit = ethers.parseEther("20");
      
      await tokenVault.connect(user1).deposit(firstDeposit);
      await tokenVault.connect(user1).deposit(secondDeposit);
      
      expect(await tokenVault.balanceOf(user1.address)).to.equal(firstDeposit + secondDeposit);
    });
  });

  describe("Withdrawal", function () {
    beforeEach(async function () {
      // Deposit some tokens first
      await mockToken.connect(user1).approve(tokenVault.target, tokenAmount);
      await tokenVault.connect(user1).deposit(tokenAmount);
    });

    it("Should allow users to withdraw their tokens", async function () {
      const withdrawAmount = ethers.parseEther("30");
      const balanceBefore = await mockToken.balanceOf(user1.address);
      
      await expect(tokenVault.connect(user1).withdraw(withdrawAmount))
        .to.emit(tokenVault, "Withdrawn")
        .withArgs(user1.address, withdrawAmount);
      
      expect(await tokenVault.balanceOf(user1.address)).to.equal(tokenAmount - withdrawAmount);
      expect(await mockToken.balanceOf(user1.address)).to.equal(balanceBefore + withdrawAmount);
    });

    it("Should allow users to withdraw all their tokens", async function () {
      await tokenVault.connect(user1).withdraw(tokenAmount);
      
      expect(await tokenVault.balanceOf(user1.address)).to.equal(0);
      expect(await mockToken.balanceOf(user1.address)).to.equal(tokenAmount);
    });

    it("Should reject withdrawals exceeding balance", async function () {
      const largeAmount = ethers.parseEther("200");
      
      await expect(tokenVault.connect(user1).withdraw(largeAmount))
        .to.be.revertedWith("Insufficient balance");
    });

    it("Should reject withdrawals from users with no balance", async function () {
      await expect(tokenVault.connect(user2).withdraw(ethers.parseEther("10")))
        .to.be.revertedWith("Insufficient balance");
    });
  });

  describe("Balance tracking", function () {
    it("Should correctly track balances for multiple users", async function () {
      const amount1 = ethers.parseEther("40");
      const amount2 = ethers.parseEther("60");
      
      // User1 deposits
      await mockToken.connect(user1).approve(tokenVault.target, amount1);
      await tokenVault.connect(user1).deposit(amount1);
      
      // User2 deposits
      await mockToken.connect(user2).approve(tokenVault.target, amount2);
      await tokenVault.connect(user2).deposit(amount2);
      
      expect(await tokenVault.balanceOf(user1.address)).to.equal(amount1);
      expect(await tokenVault.balanceOf(user2.address)).to.equal(amount2);
      expect(await tokenVault.balanceOf(owner.address)).to.equal(0);
    });

    it("Should return zero balance for addresses that never deposited", async function () {
      expect(await tokenVault.balanceOf(user1.address)).to.equal(0);
      expect(await tokenVault.balanceOf(owner.address)).to.equal(0);
    });
  });

  describe("Complex scenarios", function () {
    it("Should handle multiple deposits and withdrawals correctly", async function () {
      await mockToken.connect(user1).approve(tokenVault.target, tokenAmount);
      
      // Multiple deposits
      await tokenVault.connect(user1).deposit(ethers.parseEther("30"));
      await tokenVault.connect(user1).deposit(ethers.parseEther("20"));
      await tokenVault.connect(user1).deposit(ethers.parseEther("50"));
      
      expect(await tokenVault.balanceOf(user1.address)).to.equal(tokenAmount);
      
      // Multiple withdrawals
      await tokenVault.connect(user1).withdraw(ethers.parseEther("40"));
      await tokenVault.connect(user1).withdraw(ethers.parseEther("30"));
      
      expect(await tokenVault.balanceOf(user1.address)).to.equal(ethers.parseEther("30"));
    });

    it("Should handle edge case of deposit and immediate withdrawal", async function () {
      const amount = ethers.parseEther("50");
      await mockToken.connect(user1).approve(tokenVault.target, amount);
      
      await tokenVault.connect(user1).deposit(amount);
      await tokenVault.connect(user1).withdraw(amount);
      
      expect(await tokenVault.balanceOf(user1.address)).to.equal(0);
      expect(await mockToken.balanceOf(user1.address)).to.equal(tokenAmount);
    });
  });
});
