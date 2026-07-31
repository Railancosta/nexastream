import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, polygon, sepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'NexaStream',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'your-project-id',
  chains: [mainnet, polygon, sepolia],
  ssr: true,
});
