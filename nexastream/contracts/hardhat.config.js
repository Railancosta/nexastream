require('@nomicfoundation/hardhat-toolbox');
require('dotenv').config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: '0.8.20',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    
    // 🚀 ZERO GAS FEES NETWORKS
    
    // Zora Network - Rede para criadores, taxas mínimas (~$0.001)
    zora: {
      url: process.env.ZORA_RPC_URL || 'https://rpc.zora.energy',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 7777777, // Zora mainnet
    },
    zoraTestnet: {
      url: process.env.ZORA_TESTNET_RPC_URL || 'https://testnet.rpc.zora.energy',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 999, // Zora testnet
    },
    
    // Celo - Taxas muito baixas (~$0.001)
    celo: {
      url: process.env.CELO_RPC_URL || 'https://forno.celo.org',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 42220, // Celo mainnet
    },
    celoAlfajores: {
      url: process.env.CELO_ALFAJORES_RPC_URL || 'https://alfajores-forno.celo-testnet.org',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 44787, // Celo Alfajores testnet
    },
    
    // Gnosis Chain - Taxas muito baixas
    gnosis: {
      url: process.env.GNOSIS_RPC_URL || 'https://rpc.ankr.com/gnosis',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 100, // Gnosis mainnet
    },
    gnosisChiado: {
      url: process.env.GNOSIS_CHIADO_RPC_URL || 'https://rpc.chiado.gnosis.gateway.fm',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 10200, // Gnosis Chiado testnet
    },
    
    // Polygon zkEVM - Taxas baixas
    polygonZkEVM: {
      url: process.env.POLYGON_ZKEVM_RPC_URL || 'https://zkevm-rpc.com',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 1101, // Polygon zkEVM mainnet
    },
    polygonZkEVMTestnet: {
      url: process.env.POLYGON_ZKEVM_TESTNET_RPC_URL || 'https://rpc.public.zkevm-testnet.com',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 1442, // Polygon zkEVM testnet
    },
    
    // Base - Taxas baixas
    base: {
      url: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 8453, // Base mainnet
    },
    baseSepolia: {
      url: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 84532, // Base Sepolia testnet
    },
    
    // Ethereum testnets (free with faucets)
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111,
    },
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY || '',
      sepolia: process.env.ETHERSCAN_API_KEY || '',
      celo: process.env.CELOSCAN_API_KEY || '',
      celoAlfajores: process.env.CELOSCAN_API_KEY || '',
      polygon: process.env.POLYGONSCAN_API_KEY || '',
      gnosis: process.env.GNOSISSCAN_API_KEY || '',
      base: process.env.BASESCAN_API_KEY || '',
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === 'true',
    currency: 'USD',
  },
  paths: {
    sources: './',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
};
