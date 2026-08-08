import { Video, Channel, User, Transaction, Alert, Boost, Ad } from '@/types';

/**
 * NexaStream Data Layer
 * 
 * ⚠️ IMPORTANT: This file contains SAMPLE DATA ONLY for development purposes.
 * All data below is FAKE/MOCK and should NEVER be presented as real statistics.
 * 
 * In production, data should come from:
 * - NexaChain blockchain (for transactions, balances, staking)
 * - IPFS/libp2p network (for video content, metadata)
 * - Local P2P nodes (for network statistics)
 * 
 * DO NOT USE THIS DATA IN PRODUCTION.
 */

// Network status - represents ACTUAL network state when running
export interface NetworkStatus {
  isConnected: boolean;
  peerCount: number;
  blockHeight: number;
  totalStorageNodes: number;
  activeNodes: number;
}

// Default network status - shows real state, not simulated
export function getNetworkStatus(): NetworkStatus {
  // In production, this would query actual P2P network state
  return {
    isConnected: false, // Will be true when connected to real network
    peerCount: 0,
    blockHeight: 0,
    totalStorageNodes: 0,
    activeNodes: 0,
  };
}

// Empty arrays - no fake data in production
export function getDemoVideos(): Video[] {
  return []; // No demo videos - use real data from network
}

export function getDemoChannels(): Channel[] {
  return []; // No demo channels - use real data from network
}

export function getDemoUsers(): User[] {
  return []; // No demo users - use real wallet data
}

export function getDemoTransactions(): Transaction[] {
  return []; // No demo transactions - use real blockchain data
}

export function getDemoAlerts(): Alert[] {
  return []; // No demo alerts - use real notifications
}

export function getDemoBoosts(): Boost[] {
  return []; // No demo boosts - use real boost data
}

export function getDemoAds(): Ad[] {
  return []; // No demo ads - use real ad inventory
}

// Placeholder function to check if network is available
export function isNetworkAvailable(): boolean {
  const status = getNetworkStatus();
  return status.isConnected;
}

// Get real network statistics (placeholder for actual implementation)
export function getNetworkStats() {
  return {
    networkStatus: 'NOT_INITIALIZED',
    peers: 0,
    blockHeight: 0,
    validators: 0,
    totalStake: '0 NST',
    circulatingSupply: '0 NST',
    storageNodes: 0,
    activeStorageNodes: 0,
    totalVideos: 0,
    totalViews: 0,
    totalEarnings: '0 NST',
  };
}
