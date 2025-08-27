require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: {
    compilers: [
      { version: "0.8.0" },
      { version: "0.8.4" },
      { version: "0.8.9" },
      { version: "0.8.16" },
      { version: "0.8.17" },
      { version: "0.8.18" },
      { version: "0.8.19" },
      { version: "0.8.20" },
      { version: "0.8.21" },
      { version: "0.8.22" },
      { version: "0.8.23" },
      { version: "0.8.24" },
      { version: "0.8.25" },
      { version: "0.8.26" },
      { version: "0.8.27" },
      { version: "0.8.28" },
      { version: "0.8.29" },
      { version: "0.8.30" }
    ]
  },
  paths: {
    tests: "./tests"
  },
  mocha: {
    timeout: 20000
  }
};