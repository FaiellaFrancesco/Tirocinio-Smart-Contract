Ecco un esempio di come potresti completare il test suite per la funzione `transferFrom`:

```javascript
describe("transferFrom", function () {
    it("happy path: owner transfers tokens to another account", async function () {
        // Transfer 100 tokens from owner to addr1
        const tx = await contract.transferFrom(owner.address, addr1.address, 100);
        
        // Check that the transfer was successful
        expect(await contract.balanceOf(addr1.address)).to.equal(100);

        // Check that the balance of the owner decreased by 100 tokens
        expect(await contract.balanceOf(owner.address)).to.equal(totalSupply - 100);
    });

    it("happy path: approved account transfers tokens to another account", async function () {
        // Approve addr2 to transfer 50 tokens from owner
        await contract.approve(addr2.address, 50);

        // Transfer 50 tokens from owner to addr1 using addr2's allowance
        const tx = await contract.transferFrom(owner.address, addr1.address, 50);
        
        // Check that the transfer was successful
        expect(await contract.balanceOf(addr1.address)).to.equal(50);

        // Check that the balance of the owner decreased by 50 tokens
        expect(await contract.balanceOf(owner.address)).to.equal(totalSupply - 50);

        // Check that addr2's allowance for owner is reduced by 50 tokens
        expect(await contract.allowance(owner.address, addr2.address)).to.equal(0);
    });

    it("reverts: sender does not have enough balance", async function () {
        await expect(contract.transferFrom(addr1.address, addr2.address, 100)).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });

    it("reverts: recipient is the zero address", async function () {
        await expect(contract.transferFrom(owner.address, "0x0000000000000000000000000000000
