import { ethers } from 'ethers';

// Network Configuration
export const NETWORKS = {
  ethereum: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpcUrl: process.env.NEXT_PUBLIC_ETH_RPC_URL || 'https://mainnet.infura.io/v3/',
    symbol: 'ETH',
    explorer: 'https://etherscan.io',
  },
  polygon: {
    chainId: 137,
    name: 'Polygon Mainnet',
    rpcUrl: process.env.NEXT_PUBLIC_POLYGON_RPC_URL || 'https://polygon-rpc.com',
    symbol: 'MATIC',
    explorer: 'https://polygonscan.com',
  },
  sepolia: {
    chainId: 11155111,
    name: 'Sepolia Testnet',
    rpcUrl: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || 'https://rpc.sepolia.org',
    symbol: 'SEP',
    explorer: 'https://sepolia.etherscan.io',
  },
} as const;

// USDC Contract Addresses (Mainnet)
export const USDC_ADDRESSES = {
  ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  polygon: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
  sepolia: '0x94a9D9AC41910B0FF0A659cEb435Aa4D5E7AF25A',
} as const;

// Platform Owner USDC Address
export const PLATFORM_OWNER_ADDRESS = '0xa453B71A216a8A6608e79247B162df47B2770899';

// ERC20 ABI (minimal for transfers)
export const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 amount)',
  'event Approval(address indexed owner, address indexed spender, uint256 amount)',
];

// Get provider based on network
export function getProvider(network: keyof typeof NETWORKS = 'ethereum'): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(NETWORKS[network].rpcUrl);
}

// Get USDC contract instance
export function getUSDCContract(network: keyof typeof NETWORKS = 'ethereum'): ethers.Contract {
  const provider = getProvider(network);
  return new ethers.Contract(USDC_ADDRESSES[ethereum], ERC20_ABI, provider);
}

// Wallet connection types
export interface WalletState {
  address: string | null;
  chainId: number | null;
  balance: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

// Check if MetaMask is available
export function isMetaMaskAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
}

// Connect wallet function
export async function connectWallet(): Promise<{
  address: string;
  chainId: number;
  balance: string;
}> {
  if (!isMetaMaskAvailable()) {
    throw new Error('MetaMask is not installed. Please install it from https://metamask.io');
  }

  try {
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });

    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found. Please unlock your MetaMask wallet.');
    }

    const address = accounts[0];
    const chainId = await window.ethereum.request({
      method: 'eth_chainId',
    });

    const provider = new ethers.BrowserProvider(window.ethereum);
    const balance = await provider.getBalance(address);

    return {
      address,
      chainId: parseInt(chainId, 16),
      balance: ethers.formatEther(balance),
    };
  } catch (error: any) {
    if (error.code === 4001) {
      throw new Error('Connection rejected. Please approve the connection request in MetaMask.');
    }
    throw error;
  }
}

// Disconnect wallet
export function disconnectWallet(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('walletConnected');
    window.location.reload();
  }
}

// Switch network
export async function switchNetwork(network: keyof typeof NETWORKS): Promise<void> {
  if (!isMetaMaskAvailable()) {
    throw new Error('MetaMask is not installed');
  }

  const chainId = `0x${NETWORKS[network].chainId.toString(16)}`;

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId }],
    });
  } catch (error: any) {
    if (error.code === 4902) {
      // Chain not added, add it
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId,
            chainName: NETWORKS[network].name,
            nativeCurrency: {
              name: NETWORKS[network].symbol,
              symbol: NETWORKS[network].symbol,
              decimals: 18,
            },
            rpcUrls: [NETWORKS[network].rpcUrl],
            blockExplorerUrls: [NETWORKS[network].explorer],
          },
        ],
      });
    }
    throw error;
  }
}

// Get USDC balance
export async function getUSDCBalance(address: string): Promise<string> {
  try {
    const contract = getUSDCContract();
    const balance = await contract.balanceOf(address);
    return ethers.formatUnits(balance, 6); // USDC has 6 decimals
  } catch (error) {
    console.error('Error getting USDC balance:', error);
    return '0';
  }
}

// Transfer USDC
export async function transferUSDC(
  toAddress: string,
  amount: string
): Promise<string> {
  if (!isMetaMaskAvailable()) {
    throw new Error('MetaMask is not installed');
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  
  const contract = new ethers.Contract(
    USDC_ADDRESSES.ethereum,
    ERC20_ABI,
    signer
  );

  const amountInSmallestUnit = ethers.parseUnits(amount, 6);
  
  const tx = await contract.transfer(toAddress, amountInSmallestUnit);
  await tx.wait();

  return tx.hash;
}

// Withdraw USDC to platform owner
export async function withdrawToPlatform(amount: string): Promise<string> {
  return transferUSDC(PLATFORM_OWNER_ADDRESS, amount);
}

// Listen for account changes
export function onAccountChange(callback: (accounts: string[]) => void): void {
  if (isMetaMaskAvailable()) {
    window.ethereum.on('accountsChanged', callback);
  }
}

// Listen for chain changes
export function onChainChange(callback: (chainId: string) => void): void {
  if (isMetaMaskAvailable()) {
    window.ethereum.on('chainChanged', callback);
  }
}

// Type declarations for window.ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
      isMetaMask?: boolean;
    };
  }
}
