it('should have correct totalSupply', async () => {
  const totalSupply = await contract.totalSupply();
  expect(totalSupply).to.equal(1000000); // Assuming the total supply is set to 1,000,000
});
