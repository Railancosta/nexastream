/**
 * NexaStream Web3 Client
 * React hooks and utilities for Web3 integration
 */

'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { formatEther, parseEther } from 'viem';

// ============================================
// CONFIG
// ============================================

const CONFIG = {
  chainId: 1,
  chainName: 'NexaStream Mainnet',
  nativeCurrency: {
    name: 'NexaStream Token',
    symbol: 'NST',
    decimals: 18
  },
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || 'http://localhost:8545',
  explorerUrl: process.env.NEXT_PUBLIC_EXPLORER_URL || 'http://localhost:4000',
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  maxSupply: BigInt('55000000000000000000000000') // 55M NST
};

// ============================================
// TYPES
// ============================================

interface Web3ContextType {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  chainId: number | null;
  balance: bigint | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  createWallet: () => Promise<WalletInfo | null>;
  getBalance: (address?: string) => Promise<TokenBalance>;
  transfer: (to: string, amount: string) => Promise<Transaction | null>;
  stake: (amount: string, duration?: number) => Promise<StakeResult | null>;
  unstake: (amount: string) => Promise<Transaction | null>;
  getStakeInfo: () => Promise<StakeInfo | null>;
  mintNFT: (data: MintNFTData) => Promise<NFT | null>;
  getNFTsByOwner: (address: string) => Promise<NFT[]>;
  listNFT: (tokenId: string, price: string) => Promise<NFT | null>;
  buyNFT: (tokenId: string, price: string) => Promise<NFT | null>;
  createProposal: (data: CreateProposalData) => Promise<Proposal | null>;
  getProposals: (filters?: ProposalFilters) => Promise<Proposal[]>;
  vote: (proposalId: string, voteType: 'for' | 'against' | 'abstain', power: string) => Promise<VoteResult | null>;
  formatBalance: (balance: bigint) => string;
  parseAmount: (amount: string) => bigint;
  truncateAddress: (address: string) => string;
}

interface WalletInfo {
  address: string;
  type: string;
  name?: string;
}

interface TokenBalance {
  balance: string;
  formatted: string;
  symbol: string;
  decimals: number;
}

interface Transaction {
  id: string;
  hash: string;
  type: number;
  from: string;
  to: string;
  value: string;
  status: string;
  blockNumber?: number;
  timestamp: string;
}

interface StakeInfo {
  totalStaked: string;
  pendingRewards: string;
  activeStakes: number;
  stakes: Array<{
    amount: string;
    startTime: number;
    duration: number;
    endTime: number;
  }>;
}

interface StakeResult extends Transaction {
  stakeInfo: {
    amount: string;
    startTime: number;
    duration: number;
    endTime: number;
  };
}

interface NFT {
  tokenId: string;
  owner: string;
  creator: string;
  name: string;
  description: string;
  image: string;
  animation?: string;
  attributes: Array<{ trait_type: string; value: string }>;
  royalty: number;
  auction?: {
    listingId: string;
    price: string;
    seller: string;
    active: boolean;
  };
}

interface MintNFTData {
  name: string;
  description?: string;
  image: string;
  animation?: string;
  attributes?: Array<{ trait_type: string; value: string }>;
  edition?: 'single' | 'multiple';
  supply?: number;
  royalty?: number;
}

interface Proposal {
  id: string;
  title: string;
  description: string;
  type: 'text' | 'treasury' | 'parameter' | 'emergency';
  status: 'draft' | 'active' | 'passed' | 'failed' | 'executed' | 'cancelled';
  author: string;
  votes: { for: string; against: string; abstain: string };
  quorum: string;
  startTime: string;
  endTime: string;
  isPassed: boolean;
  canExecute: boolean;
}

interface CreateProposalData {
  title: string;
  description: string;
  type?: 'text' | 'treasury' | 'parameter' | 'emergency';
  actions?: Array<{ to: string; value: string; data?: string }>;
  forumLink?: string;
}

interface ProposalFilters {
  status?: string;
  type?: string;
  limit?: number;
  offset?: number;
}

interface VoteResult {
  votes: { for: string; against: string; abstain: string };
  tx: Transaction;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================

export function Web3Provider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [chainId, setChainId] = useState<number | null>(null);
  const [balance, setBalance] = useState<bigint | null>(null);

  const apiFetch = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers
    };

    const response = await fetch(`${CONFIG.apiUrl}/api/web3${endpoint}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    try {
      const result = await apiFetch('/wallet/create', { method: 'POST' });
      if (result.wallet) {
        setAddress(result.wallet.address);
        if (result.balance) {
          setBalance(BigInt(result.balance.balance));
        }
      }
    } catch (error) {
      console.error('Connect wallet error:', error);
    } finally {
      setIsConnecting(false);
    }
  }, [apiFetch]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setBalance(null);
  }, []);

  const createWallet = useCallback(async (): Promise<WalletInfo | null> => {
    try {
      const result = await apiFetch('/wallet/create', { method: 'POST' });
      if (result.wallet) {
        setAddress(result.wallet.address);
        return result.wallet;
      }
      return null;
    } catch (error) {
      console.error('Create wallet error:', error);
      return null;
    }
  }, [apiFetch]);

  const getBalance = useCallback(async (addr?: string): Promise<TokenBalance> => {
    const targetAddress = addr || address;
    if (!targetAddress) {
      return { balance: '0', formatted: '0', symbol: 'NST', decimals: 18 };
    }
    
    try {
      const result = await apiFetch(`/wallet/balance?address=${targetAddress}`);
      if (result.balance) {
        const bal = BigInt(result.balance);
        if (!addr) setBalance(bal);
        return result;
      }
      return { balance: '0', formatted: '0', symbol: 'NST', decimals: 18 };
    } catch (error) {
      console.error('Get balance error:', error);
      return { balance: '0', formatted: '0', symbol: 'NST', decimals: 18 };
    }
  }, [apiFetch, address]);

  const transfer = useCallback(async (to: string, amount: string): Promise<Transaction | null> => {
    try {
      const result = await apiFetch('/transfer', {
        method: 'POST',
        body: JSON.stringify({ to, amount })
      });
      return result.transaction;
    } catch (error) {
      console.error('Transfer error:', error);
      return null;
    }
  }, [apiFetch]);

  const stake = useCallback(async (amount: string, duration = 30): Promise<StakeResult | null> => {
    try {
      const result = await apiFetch('/stake', {
        method: 'POST',
        body: JSON.stringify({ amount, duration })
      });
      return result;
    } catch (error) {
      console.error('Stake error:', error);
      return null;
    }
  }, [apiFetch]);

  const unstake = useCallback(async (amount: string): Promise<Transaction | null> => {
    try {
      const result = await apiFetch('/unstake', {
        method: 'POST',
        body: JSON.stringify({ amount })
      });
      return result.transaction;
    } catch (error) {
      console.error('Unstake error:', error);
      return null;
    }
  }, [apiFetch]);

  const getStakeInfo = useCallback(async (): Promise<StakeInfo | null> => {
    try {
      return await apiFetch('/stake');
    } catch (error) {
      console.error('Get stake info error:', error);
      return null;
    }
  }, [apiFetch]);

  const mintNFT = useCallback(async (data: MintNFTData): Promise<NFT | null> => {
    try {
      const result = await apiFetch('/nft/mint', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      return result.nft;
    } catch (error) {
      console.error('Mint NFT error:', error);
      return null;
    }
  }, [apiFetch]);

  const getNFTsByOwner = useCallback(async (ownerAddress: string): Promise<NFT[]> => {
    try {
      const result = await apiFetch(`/nft?owner=${ownerAddress}`);
      return result.nfts || [];
    } catch (error) {
      console.error('Get NFTs error:', error);
      return [];
    }
  }, [apiFetch]);

  const listNFT = useCallback(async (tokenId: string, price: string): Promise<NFT | null> => {
    try {
      const result = await apiFetch(`/nft/${tokenId}/list`, {
        method: 'POST',
        body: JSON.stringify({ price })
      });
      return result.nft;
    } catch (error) {
      console.error('List NFT error:', error);
      return null;
    }
  }, [apiFetch]);

  const buyNFT = useCallback(async (tokenId: string, price: string): Promise<NFT | null> => {
    try {
      const result = await apiFetch(`/nft/${tokenId}/buy`, {
        method: 'POST',
        body: JSON.stringify({ price })
      });
      return result.nft;
    } catch (error) {
      console.error('Buy NFT error:', error);
      return null;
    }
  }, [apiFetch]);

  const createProposal = useCallback(async (data: CreateProposalData): Promise<Proposal | null> => {
    try {
      const result = await apiFetch('/dao/proposals', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      return result.proposal;
    } catch (error) {
      console.error('Create proposal error:', error);
      return null;
    }
  }, [apiFetch]);

  const getProposals = useCallback(async (filters?: ProposalFilters): Promise<Proposal[]> => {
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.type) params.append('type', filters.type);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());
      
      const result = await apiFetch(`/dao/proposals?${params.toString()}`);
      return result.proposals || [];
    } catch (error) {
      console.error('Get proposals error:', error);
      return [];
    }
  }, [apiFetch]);

  const vote = useCallback(async (
    proposalId: string,
    voteType: 'for' | 'against' | 'abstain',
    power: string
  ): Promise<VoteResult | null> => {
    try {
      return await apiFetch(`/dao/proposals/${proposalId}/vote`, {
        method: 'POST',
        body: JSON.stringify({ voteType, votingPower: power })
      });
    } catch (error) {
      console.error('Vote error:', error);
      return null;
    }
  }, [apiFetch]);

  const formatBalance = useCallback((bal: bigint): string => {
    return formatEther(bal);
  }, []);

  const parseAmount = useCallback((amount: string): bigint => {
    return parseEther(amount);
  }, []);

  const truncateAddress = useCallback((addr: string): string => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }, []);

  const value: Web3ContextType = {
    address,
    isConnected: !!address,
    isConnecting,
    chainId,
    balance,
    connect,
    disconnect,
    createWallet,
    getBalance,
    transfer,
    stake,
    unstake,
    getStakeInfo,
    mintNFT,
    getNFTsByOwner,
    listNFT,
    buyNFT,
    createProposal,
    getProposals,
    vote,
    formatBalance,
    parseAmount,
    truncateAddress
  };

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useWeb3() {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
}

// ============================================
// EXPORTS
// ============================================

export { CONFIG };
export type {
  WalletInfo,
  TokenBalance,
  Transaction,
  StakeInfo,
  StakeResult,
  NFT,
  MintNFTData,
  Proposal,
  CreateProposalData,
  ProposalFilters,
  VoteResult
};
