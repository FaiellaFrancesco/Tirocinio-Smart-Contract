import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

/**
 * Scaffold generato automaticamente per SWAPXDEX.
 * I blocchi // TODO_AI vanno completati dall'LLM.
 */

describe("SWAPXDEX — LLM Scaffold", function () {
  async function deployFixture() {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SWAPXDEX");
    // TODO_AI: completa i parametri del costruttore se presenti
    const contract = await Factory.deploy();
    await contract.waitForDeployment();
    return { contract, owner, addr1, addr2 };
  }

  it("deployment di base", async function () {
    const { contract } = await loadFixture(deployFixture);
    expect(await contract.getAddress()).to.properAddress;
  });

  // Eventi in ABI: MaxTokensUpdated, OwnershipTransferred, Paused, TokensBought, TokensClaimed, Unpaused

  
  describe("ETHBuyHelper(uint256)", function () {
    it("happy path", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      // chiamata di sola lettura
      const result = await contract.ETHBuyHelper(1n /* TODO_AI */);
      // TODO_AI: expect(await contract.ETHBuyHelper(1n /* TODO_AI */)).to.equal(/* atteso */);
    });

    it("reverts su input/ruolo non valido", async function () {
      const { contract } = await loadFixture(deployFixture);
      await expect(
        contract.ETHBuyHelper(0n /* TODO_AI: rendi invalido/edge */)
      ).to.be.reverted; // TODO_AI: .with("MESSAGGIO")
    });

    it("boundary cases", async function () {
      const { contract } = await loadFixture(deployFixture);
      // TODO_AI: 0, max, address(0), limiti ruoli, ecc.
    });

    // TODO_AI: se emette eventi: await expect(tx).to.emit(contract, "Evento").withArgs(...)
  });


  describe("MaxUSDTRaised()", function () {
    it("happy path", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      // chiamata di sola lettura
      const result = await contract.MaxUSDTRaised();
      // TODO_AI: expect(await contract.MaxUSDTRaised()).to.equal(/* atteso */);
    });

    it("reverts su input/ruolo non valido", async function () {
      const { contract } = await loadFixture(deployFixture);
      await expect(
        contract.MaxUSDTRaised()
      ).to.be.reverted; // TODO_AI: .with("MESSAGGIO")
    });

    it("boundary cases", async function () {
      const { contract } = await loadFixture(deployFixture);
      // TODO_AI: 0, max, address(0), limiti ruoli, ecc.
    });

    // TODO_AI: se emette eventi: await expect(tx).to.emit(contract, "Evento").withArgs(...)
  });


  describe("PresaleRate()", function () {
    it("happy path", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      // chiamata di sola lettura
      const result = await contract.PresaleRate();
      // TODO_AI: expect(await contract.PresaleRate()).to.equal(/* atteso */);
    });

    it("reverts su input/ruolo non valido", async function () {
      const { contract } = await loadFixture(deployFixture);
      await expect(
        contract.PresaleRate()
      ).to.be.reverted; // TODO_AI: .with("MESSAGGIO")
    });

    it("boundary cases", async function () {
      const { contract } = await loadFixture(deployFixture);
      // TODO_AI: 0, max, address(0), limiti ruoli, ecc.
    });

    // TODO_AI: se emette eventi: await expect(tx).to.emit(contract, "Evento").withArgs(...)
  });


  describe("USDTRaised()", function () {
    it("happy path", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      // chiamata di sola lettura
      const result = await contract.USDTRaised();
      // TODO_AI: expect(await contract.USDTRaised()).to.equal(/* atteso */);
    });

    it("reverts su input/ruolo non valido", async function () {
      const { contract } = await loadFixture(deployFixture);
      await expect(
        contract.USDTRaised()
      ).to.be.reverted; // TODO_AI: .with("MESSAGGIO")
    });

    it("boundary cases", async function () {
      const { contract } = await loadFixture(deployFixture);
      // TODO_AI: 0, max, address(0), limiti ruoli, ecc.
    });

    // TODO_AI: se emette eventi: await expect(tx).to.emit(contract, "Evento").withArgs(...)
  });


  describe("aggregatorInterface()", function () {
    it("happy path", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      // chiamata di sola lettura
      const result = await contract.aggregatorInterface();
      // TODO_AI: expect(await contract.aggregatorInterface()).to.equal(/* atteso */);
    });

    it("reverts su input/ruolo non valido", async function () {
      const { contract } = await loadFixture(deployFixture);
      await expect(
        contract.aggregatorInterface()
      ).to.be.reverted; // TODO_AI: .with("MESSAGGIO")
    });

    it("boundary cases", async function () {
      const { contract } = await loadFixture(deployFixture);
      // TODO_AI: 0, max, address(0), limiti ruoli, ecc.
    });

    // TODO_AI: se emette eventi: await expect(tx).to.emit(contract, "Evento").withArgs(...)
  });


  describe("buyWithETH()", function () {
    it("happy path", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      // transazione che modifica lo stato
      const result = await contract.buyWithETH({ value: 1n /* TODO_AI in wei */ });
      // TODO_AI: verifica stato/eventi dopo la tx
    });

    it("reverts su input/ruolo non valido", async function () {
      const { contract } = await loadFixture(deployFixture);
      await expect(
        contract.buyWithETH()
      ).to.be.reverted; // TODO_AI: .with("MESSAGGIO")
    });

    it("boundary cases", async function () {
      const { contract } = await loadFixture(deployFixture);
      // TODO_AI: 0, max, address(0), limiti ruoli, ecc.
    });

    // TODO_AI: se emette eventi: await expect(tx).to.emit(contract, "Evento").withArgs(...)
  });


  describe("buyWithUSDT(uint256)", function () {
    it("happy path", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      // transazione che modifica lo stato
      const result = await contract.buyWithUSDT(1n /* TODO_AI */);
      // TODO_AI: verifica stato/eventi dopo la tx
    });

    it("reverts su input/ruolo non valido", async function () {
      const { contract } = await loadFixture(deployFixture);
      await expect(
        contract.buyWithUSDT(0n /* TODO_AI: rendi invalido/edge */)
      ).to.be.reverted; // TODO_AI: .with("MESSAGGIO")
    });

    it("boundary cases", async function () {
      const { contract } = await loadFixture(deployFixture);
      // TODO_AI: 0, max, address(0), limiti ruoli, ecc.
    });

    // TODO_AI: se emette eventi: await expect(tx).to.emit(contract, "Evento").withArgs(...)
  });


  describe("changeMaxTokensToBuy(uint256)", function () {
    it("happy path", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      // transazione che modifica lo stato
      const result = await contract.changeMaxTokensToBuy(1n /* TODO_AI */);
      // TODO_AI: verifica stato/eventi dopo la tx
    });

    it("reverts su input/ruolo non valido", async function () {
      const { contract } = await loadFixture(deployFixture);
      await expect(
        contract.changeMaxTokensToBuy(0n /* TODO_AI: rendi invalido/edge */)
      ).to.be.reverted; // TODO_AI: .with("MESSAGGIO")
    });

    it("boundary cases", async function () {
      const { contract } = await loadFixture(deployFixture);
      // TODO_AI: 0, max, address(0), limiti ruoli, ecc.
    });

    // TODO_AI: se emette eventi: await expect(tx).to.emit(contract, "Evento").withArgs(...)
  });


  describe("changeSaleEndTime(uint256)", function () {
    it("happy path", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      // transazione che modifica lo stato
      const result = await contract.changeSaleEndTime(1n /* TODO_AI */);
      // TODO_AI: verifica stato/eventi dopo la tx
    });

    it("reverts su input/ruolo non valido", async function () {
      const { contract } = await loadFixture(deployFixture);
      await expect(
        contract.changeSaleEndTime(0n /* TODO_AI: rendi invalido/edge */)
      ).to.be.reverted; // TODO_AI: .with("MESSAGGIO")
    });

    it("boundary cases", async function () {
      const { contract } = await loadFixture(deployFixture);
      // TODO_AI: 0, max, address(0), limiti ruoli, ecc.
    });

    // TODO_AI: se emette eventi: await expect(tx).to.emit(contract, "Evento").withArgs(...)
  });


  describe("changeSaleStartTime(uint256)", function () {
    it("happy path", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      // transazione che modifica lo stato
      const result = await contract.changeSaleStartTime(1n /* TODO_AI */);
      // TODO_AI: verifica stato/eventi dopo la tx
    });

    it("reverts su input/ruolo non valido", async function () {
      const { contract } = await loadFixture(deployFixture);
      await expect(
        contract.changeSaleStartTime(0n /* TODO_AI: rendi invalido/edge */)
      ).to.be.reverted; // TODO_AI: .with("MESSAGGIO")
    });

    it("boundary cases", async function () {
      const { contract } = await loadFixture(deployFixture);
      // TODO_AI: 0, max, address(0), limiti ruoli, ecc.
    });

    // TODO_AI: se emette eventi: await expect(tx).to.emit(contract, "Evento").withArgs(...)
  });


  describe("claim()", function () {
    it("happy path", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      // transazione che modifica lo stato
      const result = await contract.claim();
      // TODO_AI: verifica stato/eventi dopo la tx
    });

    it("reverts su input/ruolo non valido", async function () {
      const { contract } = await loadFixture(deployFixture);
      await expect(
        contract.claim()
      ).to.be.reverted; // TODO_AI: .with("MESSAGGIO")
    });

    it("boundary cases", async function () {
      const { contract } = await loadFixture(deployFixture);
      // TODO_AI: 0, max, address(0), limiti ruoli, ecc.
    });

    // TODO_AI: se emette eventi: await expect(tx).to.emit(contract, "Evento").withArgs(...)
  });


  describe("endTime()", function () {
    it("happy path", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      // chiamata di sola lettura
      const result = await contract.endTime();
      // TODO_AI: expect(await contract.endTime()).to.equal(/* atteso */);
    });

    it("reverts su input/ruolo non valido", async function () {
      const { contract } = await loadFixture(deployFixture);
      await expect(
        contract.endTime()
      ).to.be.reverted; // TODO_AI: .with("MESSAGGIO")
    });

    it("boundary cases", async function () {
      const { contract } = await loadFixture(deployFixture);
      // TODO_AI: 0, max, address(0), limiti ruoli, ecc.
    });

    // TODO_AI: se emette eventi: await expect(tx).to.emit(contract, "Evento").withArgs(...)
  });


  describe("getETHBalance()", function () {
    it("happy path", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      // chiamata di sola lettura
      const result = await contract.getETHBalance();
      // TODO_AI: expect(await contract.getETHBalance()).to.equal(/* atteso */);
    });

    it("reverts su input/ruolo non valido", async function () {
      const { contract } = await loadFixture(deployFixture);
      await expect(
        contract.getETHBalance()
      ).to.be.reverted; // TODO_AI: .with("MESSAGGIO")
    });

    it("boundary cases", async function () {
      const { contract } = await loadFixture(deployFixture);
      // TODO_AI: 0, max, address(0), limiti ruoli, ecc.
    });

    // TODO_AI: se emette eventi: await expect(tx).to.emit(contract, "Evento").withArgs(...)
  });


  describe("getLatestPrice()", function () {
    it("happy path", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      // chiamata di sola lettura
      const result = await contract.getLatestPrice();
      // TODO_AI: expect(await contract.getLatestPrice()).to.equal(/* atteso */);
    });

    it("reverts su input/ruolo non valido", async function () {
      const { contract } = await loadFixture(deployFixture);
      await expect(
        contract.getLatestPrice()
      ).to.be.reverted; // TODO_AI: .with("MESSAGGIO")
    });

    it("boundary cases", async function () {
      const { contract } = await loadFixture(deployFixture);
      // TODO_AI: 0, max, address(0), limiti ruoli, ecc.
    });

    // TODO_AI: se emette eventi: await expect(tx).to.emit(contract, "Evento").withArgs(...)
  });


  describe("getTokenBalance()", function () {
    it("happy path", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      // chiamata di sola lettura
      const result = await contract.getTokenBalance();
      // TODO_AI: expect(await contract.getTokenBalance()).to.equal(/* atteso */);
    });

    it("reverts su input/ruolo non valido", async function () {
      const { contract } = await loadFixture(deployFixture);
      await expect(
        contract.getTokenBalance()
      ).to.be.reverted; // TODO_AI: .with("MESSAGGIO")
    });

    it("boundary cases", async function () {
      const { contract } = await loadFixture(deployFixture);
      // TODO_AI: 0, max, address(0), limiti ruoli, ecc.
    });

    // TODO_AI: se emette eventi: await expect(tx).to.emit(contract, "Evento").withArgs(...)
  });


  describe("getUsdtBalance()", function () {
    it("happy path", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      // chiamata di sola lettura
      const result = await contract.getUsdtBalance();
      // TODO_AI: expect(await contract.getUsdtBalance()).to.equal(/* atteso */);
    });

    it("reverts su input/ruolo non valido", async function () {
      const { contract } = await loadFixture(deployFixture);
      await expect(
        contract.getUsdtBalance()
      ).to.be.reverted; // TODO_AI: .with("MESSAGGIO")
    });

    it("boundary cases", async function () {
      const { contract } = await loadFixture(deployFixture);
      // TODO_AI: 0, max, address(0), limiti ruoli, ecc.
    });

    // TODO_AI: se emette eventi: await expect(tx).to.emit(contract, "Evento").withArgs(...)
  });


  describe("maxTokensToBuy()", function () {
    it("happy path", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      // chiamata di sola lettura
      const result = await contract.maxTokensToBuy();
      // TODO_AI: expect(await contract.maxTokensToBuy()).to.equal(/* atteso */);
    });

    it("reverts su input/ruolo non valido", async function () {
      const { contract } = await loadFixture(deployFixture);
      await expect(
        contract.maxTokensToBuy()
      ).to.be.reverted; // TODO_AI: .with("MESSAGGIO")
    });

    it("boundary cases", async function () {
      const { contract } = await loadFixture(deployFixture);
      // TODO_AI: 0, max, address(0), limiti ruoli, ecc.
    });

    // TODO_AI: se emette eventi: await expect(tx).to.emit(contract, "Evento").withArgs(...)
  });


  describe("owner()", function () {
    it("happy path", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      // chiamata di sola lettura
      const result = await contract.owner();
      // TODO_AI: expect(await contract.owner()).to.equal(/* atteso */);
    });

    it("reverts su input/ruolo non valido", async function () {
      const { contract } = await loadFixture(deployFixture);
      await expect(
        contract.owner()
      ).to.be.reverted; // TODO_AI: .with("MESSAGGIO")
    });

    it("boundary cases", async function () {
      const { contract } = await loadFixture(deployFixture);
      // TODO_AI: 0, max, address(0), limiti ruoli, ecc.
    });

    // TODO_AI: se emette eventi: await expect(tx).to.emit(contract, "Evento").withArgs(...)
  });


  describe("pause()", function () {
    it("happy path", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      // transazione che modifica lo stato
      const result = await contract.pause();
      // TODO_AI: verifica stato/eventi dopo la tx
    });

    it("reverts su input/ruolo non valido", async function () {
      const { contract } = await loadFixture(deployFixture);
      await expect(
        contract.pause()
      ).to.be.reverted; // TODO_AI: .with("MESSAGGIO")
    });

    it("boundary cases", async function () {
      const { contract } = await loadFixture(deployFixture);
      // TODO_AI: 0, max, address(0), limiti ruoli, ecc.
    });

    // TODO_AI: se emette eventi: await expect(tx).to.emit(contract, "Evento").withArgs(...)
  });


  describe("paused()", function () {
    it("happy path", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      // chiamata di sola lettura
      const result = await contract.paused();
      // TODO_AI: expect(await contract.paused()).to.equal(/* atteso */);
    });

    it("reverts su input/ruolo non valido", async function () {
      const { contract } = await loadFixture(deployFixture);
      await expect(
        contract.paused()
      ).to.be.reverted; // TODO_AI: .with("MESSAGGIO")
    });

    it("boundary cases", async function () {
      const { contract } = await loadFixture(deployFixture);
      // TODO_AI: 0, max, address(0), limiti ruoli, ecc.
    });

    // TODO_AI: se emette eventi: await expect(tx).to.emit(contract, "Evento").withArgs(...)
  });


  describe("setMaxUSDTRaised(uint256)", function () {
    it("happy path", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      // transazione che modifica lo stato
      const result = await contract.setMaxUSDTRaised(1n /* TODO_AI */);
      // TODO_AI: verifica stato/eventi dopo la tx
    });

    it("reverts su input/ruolo non valido", async function () {
      const { contract } = await loadFixture(deployFixture);
      await expect(
        contract.setMaxUSDTRaised(0n /* TODO_AI: rendi invalido/edge */)
      ).to.be.reverted; // TODO_AI: .with("MESSAGGIO")
    });

    it("boundary cases", async function () {
      const { contract } = await loadFixture(deployFixture);
      // TODO_AI: 0, max, address(0), limiti ruoli, ecc.
    });

    // TODO_AI: se emette eventi: await expect(tx).to.emit(contract, "Evento").withArgs(...)
  });


  describe("startTime()", function () {
    it("happy path", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      // chiamata di sola lettura
      const result = await contract.startTime();
      // TODO_AI: expect(await contract.startTime()).to.equal(/* atteso */);
    });

    it("reverts su input/ruolo non valido", async function () {
      const { contract } = await loadFixture(deployFixture);
      await expect(
        contract.startTime()
      ).to.be.reverted; // TODO_AI: .with("MESSAGGIO")
    });

    it("boundary cases", async function () {
      const { contract } = await loadFixture(deployFixture);
      // TODO_AI: 0, max, address(0), limiti ruoli, ecc.
    });

    // TODO_AI: se emette eventi: await expect(tx).to.emit(contract, "Evento").withArgs(...)
  });


  describe("token()", function () {
    it("happy path", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      // chiamata di sola lettura
      const result = await contract.token();
      // TODO_AI: expect(await contract.token()).to.equal(/* atteso */);
    });

    it("reverts su input/ruolo non valido", async function () {
      const { contract } = await loadFixture(deployFixture);
      await expect(
        contract.token()
      ).to.be.reverted; // TODO_AI: .with("MESSAGGIO")
    });

    it("boundary cases", async function () {
      const { contract } = await loadFixture(deployFixture);
      // TODO_AI: 0, max, address(0), limiti ruoli, ecc.
    });

    // TODO_AI: se emette eventi: await expect(tx).to.emit(contract, "Evento").withArgs(...)
  });


  describe("totalTokensSold()", function () {
    it("happy path", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      // chiamata di sola lettura
      const result = await contract.totalTokensSold();
      // TODO_AI: expect(await contract.totalTokensSold()).to.equal(/* atteso */);
    });

    it("reverts su input/ruolo non valido", async function () {
      const { contract } = await loadFixture(deployFixture);
      await expect(
        contract.totalTokensSold()
      ).to.be.reverted; // TODO_AI: .with("MESSAGGIO")
    });

    it("boundary cases", async function () {
      const { contract } = await loadFixture(deployFixture);
      // TODO_AI: 0, max, address(0), limiti ruoli, ecc.
    });

    // TODO_AI: se emette eventi: await expect(tx).to.emit(contract, "Evento").withArgs(...)
  });


  describe("transferOwnership(address)", function () {
    it("happy path", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      // transazione che modifica lo stato
      const result = await contract.transferOwnership(addr1.address /* TODO_AI */);
      // TODO_AI: verifica stato/eventi dopo la tx
    });

    it("reverts su input/ruolo non valido", async function () {
      const { contract } = await loadFixture(deployFixture);
      await expect(
        contract.transferOwnership("0x0000000000000000000000000000000000000000" /* TODO_AI: usa zero/non autorizzato */)
      ).to.be.reverted; // TODO_AI: .with("MESSAGGIO")
    });

    it("boundary cases", async function () {
      const { contract } = await loadFixture(deployFixture);
      // TODO_AI: 0, max, address(0), limiti ruoli, ecc.
    });

    // TODO_AI: se emette eventi: await expect(tx).to.emit(contract, "Evento").withArgs(...)
  });


  describe("unpause()", function () {
    it("happy path", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      // transazione che modifica lo stato
      const result = await contract.unpause();
      // TODO_AI: verifica stato/eventi dopo la tx
    });

    it("reverts su input/ruolo non valido", async function () {
      const { contract } = await loadFixture(deployFixture);
      await expect(
        contract.unpause()
      ).to.be.reverted; // TODO_AI: .with("MESSAGGIO")
    });

    it("boundary cases", async function () {
      const { contract } = await loadFixture(deployFixture);
      // TODO_AI: 0, max, address(0), limiti ruoli, ecc.
    });

    // TODO_AI: se emette eventi: await expect(tx).to.emit(contract, "Evento").withArgs(...)
  });


  describe("updatePresaleRate(uint256)", function () {
    it("happy path", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      // transazione che modifica lo stato
      const result = await contract.updatePresaleRate(1n /* TODO_AI */);
      // TODO_AI: verifica stato/eventi dopo la tx
    });

    it("reverts su input/ruolo non valido", async function () {
      const { contract } = await loadFixture(deployFixture);
      await expect(
        contract.updatePresaleRate(0n /* TODO_AI: rendi invalido/edge */)
      ).to.be.reverted; // TODO_AI: .with("MESSAGGIO")
    });

    it("boundary cases", async function () {
      const { contract } = await loadFixture(deployFixture);
      // TODO_AI: 0, max, address(0), limiti ruoli, ecc.
    });

    // TODO_AI: se emette eventi: await expect(tx).to.emit(contract, "Evento").withArgs(...)
  });


  describe("usdt()", function () {
    it("happy path", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      // chiamata di sola lettura
      const result = await contract.usdt();
      // TODO_AI: expect(await contract.usdt()).to.equal(/* atteso */);
    });

    it("reverts su input/ruolo non valido", async function () {
      const { contract } = await loadFixture(deployFixture);
      await expect(
        contract.usdt()
      ).to.be.reverted; // TODO_AI: .with("MESSAGGIO")
    });

    it("boundary cases", async function () {
      const { contract } = await loadFixture(deployFixture);
      // TODO_AI: 0, max, address(0), limiti ruoli, ecc.
    });

    // TODO_AI: se emette eventi: await expect(tx).to.emit(contract, "Evento").withArgs(...)
  });


  describe("usdtBuyHelper(uint256)", function () {
    it("happy path", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      // chiamata di sola lettura
      const result = await contract.usdtBuyHelper(1n /* TODO_AI */);
      // TODO_AI: expect(await contract.usdtBuyHelper(1n /* TODO_AI */)).to.equal(/* atteso */);
    });

    it("reverts su input/ruolo non valido", async function () {
      const { contract } = await loadFixture(deployFixture);
      await expect(
        contract.usdtBuyHelper(0n /* TODO_AI: rendi invalido/edge */)
      ).to.be.reverted; // TODO_AI: .with("MESSAGGIO")
    });

    it("boundary cases", async function () {
      const { contract } = await loadFixture(deployFixture);
      // TODO_AI: 0, max, address(0), limiti ruoli, ecc.
    });

    // TODO_AI: se emette eventi: await expect(tx).to.emit(contract, "Evento").withArgs(...)
  });


  describe("userDeposits(address)", function () {
    it("happy path", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      // chiamata di sola lettura
      const result = await contract.userDeposits(addr1.address /* TODO_AI */);
      // TODO_AI: expect(await contract.userDeposits(addr1.address /* TODO_AI */)).to.equal(/* atteso */);
    });

    it("reverts su input/ruolo non valido", async function () {
      const { contract } = await loadFixture(deployFixture);
      await expect(
        contract.userDeposits("0x0000000000000000000000000000000000000000" /* TODO_AI: usa zero/non autorizzato */)
      ).to.be.reverted; // TODO_AI: .with("MESSAGGIO")
    });

    it("boundary cases", async function () {
      const { contract } = await loadFixture(deployFixture);
      // TODO_AI: 0, max, address(0), limiti ruoli, ecc.
    });

    // TODO_AI: se emette eventi: await expect(tx).to.emit(contract, "Evento").withArgs(...)
  });


  describe("withdrawETH(uint256)", function () {
    it("happy path", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      // transazione che modifica lo stato
      const result = await contract.withdrawETH(1n /* TODO_AI */);
      // TODO_AI: verifica stato/eventi dopo la tx
    });

    it("reverts su input/ruolo non valido", async function () {
      const { contract } = await loadFixture(deployFixture);
      await expect(
        contract.withdrawETH(0n /* TODO_AI: rendi invalido/edge */)
      ).to.be.reverted; // TODO_AI: .with("MESSAGGIO")
    });

    it("boundary cases", async function () {
      const { contract } = await loadFixture(deployFixture);
      // TODO_AI: 0, max, address(0), limiti ruoli, ecc.
    });

    // TODO_AI: se emette eventi: await expect(tx).to.emit(contract, "Evento").withArgs(...)
  });


  describe("withdrawTokens(address,uint256)", function () {
    it("happy path", async function () {
      const { contract, owner, addr1, addr2 } = await loadFixture(deployFixture);
      // transazione che modifica lo stato
      const result = await contract.withdrawTokens(addr1.address /* TODO_AI */, 1n /* TODO_AI */);
      // TODO_AI: verifica stato/eventi dopo la tx
    });

    it("reverts su input/ruolo non valido", async function () {
      const { contract } = await loadFixture(deployFixture);
      await expect(
        contract.withdrawTokens("0x0000000000000000000000000000000000000000" /* TODO_AI: usa zero/non autorizzato */, 0n /* TODO_AI: rendi invalido/edge */)
      ).to.be.reverted; // TODO_AI: .with("MESSAGGIO")
    });

    it("boundary cases", async function () {
      const { contract } = await loadFixture(deployFixture);
      // TODO_AI: 0, max, address(0), limiti ruoli, ecc.
    });

    // TODO_AI: se emette eventi: await expect(tx).to.emit(contract, "Evento").withArgs(...)
  });

});
