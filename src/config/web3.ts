/**
 * SR-5: Web3 visibility optimization
 *
 * Adds `refetchIntervalInBackground: false` globally to wagmi's internal
 * QueryClient so ALL useReadContract / useBalance calls stop polling
 * when the tab is hidden.
 */

import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  metaMaskWallet,
  trustWallet,
  bitgetWallet,
  coinbaseWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { funWallet } from './funWallet';
import { createConfig, createStorage, http } from 'wagmi';
import { mainnet, bsc, bscTestnet, polygon } from 'wagmi/chains';
import { QueryClient } from '@tanstack/react-query';

const projectId = '21fef48091f12692cad574a6f7753643';

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Popular',
      wallets: [
        metaMaskWallet,
        trustWallet,
        coinbaseWallet,
        bitgetWallet,
        funWallet,
      ],
    },
  ],
  {
    appName: 'F.U. Profile',
    projectId,
  }
);

// SR-5: Dedicated wagmi QueryClient with background polling disabled globally.
export const wagmiQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 15_000,
    },
  },
});

export const config = createConfig({
  connectors,
  chains: [mainnet, bsc, bscTestnet, polygon],
  transports: {
    [mainnet.id]: http(),
    [bsc.id]: http(),
    [bscTestnet.id]: http('https://data-seed-prebsc-1-s1.binance.org:8545/'),
    [polygon.id]: http(),
  },
});
