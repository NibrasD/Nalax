import { HardhatUserConfig, vars } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-ignition";
import "@nomicfoundation/hardhat-ignition-ethers";

/**
 * Horizen Base L3 Testnet Configuration
 * RPC: https://horizen-testnet.rpc.caldera.xyz/http
 * Explorer: https://horizen-testnet.explorer.caldera.xyz/
 * 
 * For production, replace with mainnet Horizen L3 RPC.
 */
const INFURA_API_KEY = vars.get("INFURA_API_KEY", "");
const PRIVATE_KEY = vars.get("DEPLOYER_PRIVATE_KEY", "");

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200, // Optimized for deployment + reasonable interaction
        details: {
          yul: true,
          yulDetails: {
            stackAllocation: true,
          },
        },
      },
      evmVersion: "cancun", // Horizen L3 supports Cancun EVM features
    },
  },
  defaultNetwork: "hardhat",
  networks: {
    /**
     * Local development network
     */
    localhost: {
      url: "http://127.0.0.1:8545",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : undefined,
    },
    /**
     * Horizen Base L3 Testnet (Caldera)
     * Update RPC URL from Horizen docs if changed
     */
    horizenTestnet: {
      url: "https://horizen-testnet.rpc.caldera.xyz/http",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : undefined,
      gasPrice: 100000000, // 0.1 Gwei (adjust based on network conditions)
      chainId: 79939,
    },
    /**
     * Horizen Base L3 Mainnet placeholder
     * Replace with actual mainnet values when available
     */
    horizenMainnet: {
      url: "https://horizen-mainnet.rpc.caldera.xyz/http", // Placeholder
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : undefined,
      chainId: 79938, // Placeholder - verify from docs
    },
    /**
     * Base Mainnet (for reference / testing ZEN bridging)
     */
    base: {
      url: INFURA_API_KEY
        ? `https://base-mainnet.g.alchemy.com/v2/${INFURA_API_KEY}`
        : "https://mainnet.base.org",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : undefined,
      chainId: 8453,
    },
  },
  etherscan: {
    apiKey: {
      horizenTestnet: "placeholder", // Not required for Caldera explorers
    },
    customChains: [
      {
        network: "horizenTestnet",
        chainId: 79939,
        urls: {
          apiURL: "https://horizen-testnet.explorer.caldera.xyz/api",
          browserURL: "https://horizen-testnet.explorer.caldera.xyz",
        },
      },
    ],
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    coinmarketcap: process.env.CMC_API_KEY,
    outputFile: "gas-report.txt",
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
  mocha: {
    timeout: 120000, // 2 minutes for complex tests
    slow: 5000,
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
    ignition: "./ignition",
  },
};

export default config;
