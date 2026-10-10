import type { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-ethers';
import '@nomicfoundation/hardhat-verify';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../.env' });
dotenv.config();

const baseSepoliaRpcUrl = process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY;

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.24',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  paths: {
    sources: './src',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
  networks: {
    hardhat: {},
    baseSepolia: {
      chainId: 84532,
      url: baseSepoliaRpcUrl,
      accounts: deployerPrivateKey ? [deployerPrivateKey] : [],
    },
  },
  etherscan: {
    apiKey: {
      baseSepolia: process.env.BASESCAN_API_KEY || '',
    },
    customChains: [
      {
        network: 'baseSepolia',
        chainId: 84532,
        urls: {
          apiURL: 'https://api-sepolia.basescan.org/api',
          browserURL: 'https://sepolia.basescan.org',
        },
      },
    ],
  },
};

export default config;
