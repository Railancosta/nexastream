/**
 * Ethereum Service
 * Integrates with Sepolia Testnet (FREE to use)
 */

const axios = require('axios');
const { CONTRACTS, TOKEN_ABI } = require('./contracts');

// Network configuration
const network = CONTRACTS.sepolia; // FREE testnet!

class EthereumService {
  constructor() {
    this.rpcUrl = network.rpcUrl;
    this.tokenAddress = network.tokenAddress;
    this.rewardsAddress = network.rewardsAddress;
  }

  // Make JSON-RPC call to Ethereum
  async rpcCall(method, params = []) {
    try {
      const response = await axios.post(this.rpcUrl, {
        jsonrpc: '2.0',
        id: 1,
        method,
        params
      }, {
        headers: { 'Content-Type': 'application/json' }
      });
      return response.data.result;
    } catch (error) {
      console.error('Ethereum RPC error:', error.message);
      throw error;
    }
  }

  // Get wallet balance
  async getBalance(address) {
    const balance = await this.rpcCall('eth_getBalance', [address, 'latest']);
    // Convert hex to ETH
    return parseInt(balance, 16) / 1e18;
  }

  // Get current gas price
  async getGasPrice() {
    const gasPrice = await this.rpcCall('eth_gasPrice');
    return parseInt(gasPrice, 16) / 1e9; // Convert to Gwei
  }

  // Estimate transaction gas
  async estimateGas(transaction) {
    return await this.rpcCall('eth_estimateGas', [transaction]);
  }

  // Send transaction
  async sendTransaction(txData, privateKey) {
    const { ethers } = require('ethers');
    
    const provider = new ethers.JsonRpcProvider(this.rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    
    const tx = await wallet.sendTransaction(txData);
    console.log('Transaction sent:', tx.hash);
    
    // Wait for confirmation
    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt.hash);
    
    return receipt;
  }

  // Get network stats
  async getNetworkStats() {
    try {
      const [blockNumber, gasPrice, ethPrice] = await Promise.all([
        this.rpcCall('eth_blockNumber'),
        this.getGasPrice(),
        this.fetchEthPrice()
      ]);

      return {
        network: network.network,
        chainId: network.chainId,
        blockNumber: parseInt(blockNumber, 16),
        gasPrice: `${gasPrice.toFixed(2)} Gwei`,
        explorer: network.explorer,
        ethPrice: ethPrice,
        status: 'connected'
      };
    } catch (error) {
      return {
        network: network.network,
        status: 'error',
        error: error.message
      };
    }
  }

  // Get current ETH price (from CoinGecko API - free)
  async fetchEthPrice() {
    try {
      const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
      return response.data.ethereum.usd;
    } catch {
      return null; // Price fetch failed, not critical
    }
  }

  // Generate new wallet
  generateWallet() {
    const { ethers } = require('ethers');
    const wallet = ethers.Wallet.createRandom();
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: wallet.mnemonic?.phrase
    };
  }

  // Verify signature
  async verifySignature(message, signature, address) {
    const { ethers } = require('ethers');
    const signerAddress = ethers.verifyMessage(message, signature);
    return signerAddress.toLowerCase() === address.toLowerCase();
  }
}

// Export singleton instance
module.exports = new EthereumService();
