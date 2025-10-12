Per completare il test suite di unità per la classe `Token`, è necessario implementare le funzioni `approve()`, `balanceOf()`, `decimals()`, `name()` e `symbol()`.

Ecco un esempio di come potrebbe essere implementate queste funzioni:

```javascript
describe('Token', function () {
  let token;

  beforeEach(async function () {
    // Creazione della classe Token
    const Token = await ethers.getContractFactory('Token');
    token = await Token.deploy();
  });

  describe('approve(address,uint256)', function () {
    it('should approve a transfer of tokens', async function () {
      const addr1 = accounts[1];
      const amount = 100;
      await token.approve(addr1.address, amount);
      expect(await token.allowance(owner.address, addr1.address)).to.equal(amount);
    });

    it('reverts if the spender is zero address', async function () {
      await expect(token.approve("0x0000000000000000000000000000000
