import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-network-helpers";
import { HardhatUserConfig } from "hardhat/config";

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      { version: "0.8.0",  settings: { optimizer: { enabled: true, runs: 200 } } },
      { version: "0.8.4",  settings: { optimizer: { enabled: true, runs: 200 } } },
      { version: "0.8.9",  settings: { optimizer: { enabled: true, runs: 200 } } },
      { version: "0.8.16", settings: { optimizer: { enabled: true, runs: 200 } } },
      { version: "0.8.17", settings: { optimizer: { enabled: true, runs: 200 } } },
      { version: "0.8.18", settings: { optimizer: { enabled: true, runs: 200 } } },
      { version: "0.8.19", settings: { optimizer: { enabled: true, runs: 200 } } },
      { version: "0.8.20", settings: { optimizer: { enabled: true, runs: 200 } } },
      { version: "0.8.21", settings: { optimizer: { enabled: true, runs: 200 } } },
      { version: "0.8.22", settings: { optimizer: { enabled: true, runs: 200 } } },
      { version: "0.8.23", settings: { optimizer: { enabled: true, runs: 200 } } },
      { version: "0.8.24", settings: { optimizer: { enabled: true, runs: 200 } } },
      { version: "0.8.25", settings: { optimizer: { enabled: true, runs: 200 } } },
      { version: "0.8.26", settings: { optimizer: { enabled: true, runs: 200 } } },
      { version: "0.8.27", settings: { optimizer: { enabled: true, runs: 200 } } },
      { version: "0.8.28", settings: { optimizer: { enabled: true, runs: 200 } } },
      { version: "0.8.29", settings: { optimizer: { enabled: true, runs: 200 } } },
      { version: "0.8.30", settings: { optimizer: { enabled: true, runs: 200 } } }
    ]
  },
  networks: {
    hardhat: { chainId: 31337 },
    localhost: { url: "http://127.0.0.1:8545" }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6"
  }
};

export default config;
