'use client';

import { WagmiProvider, createConfig, http } from 'wagmi';
import { mainnet, celo, base } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

const config = createConfig({
  chains: [mainnet, celo, base],
  transports: {
    [mainnet.id]: http(),
    [celo.id]: http('https://forno.celo.org'),
    [base.id]: http('https://mainnet.base.org'),
  },
});

const queryClient = new QueryClient();

export default function WagmiProviderWrapper({ children }: { children: ReactNode }) {
  const [queryClientState] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClientState}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
