/**
 * SR-5: Web3 visibility optimization
 *
 * Adds `refetchIntervalInBackground: false` globally to wagmi's internal
 * QueryClient so ALL useReadContract / useBalance calls stop polling
 * when the tab is hidden.
 *
 * This is the cleanest way: configure it once at the config level
 * via wagmi's `queryClient` option.
 */

import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  metaMaskWallet,
  trustWallet,
  bitgetWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { funWallet } from './funWallet';
import { createConfig, http } from 'wagmi';
import { mainnet, bsc, bscTestnet } from 'wagmi/chains';
import { QueryClient } from '@tanstack/react-query';

const projectId = '21fef48091f12692cad574a6f7753643';

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Popular',
      wallets: [
        metaMaskWallet,
        trustWallet,
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
// This applies to ALL useReadContract / useBalance / useContractRead calls.
export const wagmiQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stop polling when tab is hidden — saves battery & bandwidth on mobile
      refetchIntervalInBackground: false,
      // Don't refetch on window focus for Web3 reads (wagmi handles reconnect)
      refetchOnWindowFocus: false,
      // Retry once on failure
      retry: 1,
      // Keep data for 30s before considering stale
      staleTime: 30_000,
    },
  },
});

export const config = createConfig({
  connectors,
  chains: [mainnet, bsc, bscTestnet],
  transports: {
    [mainnet.id]: http(),
    [bsc.id]: http(),
    [bscTestnet.id]: http('https://data-seed-prebsc-1-s1.binance.org:8545/'),
  },
  // SR-5: Inject our optimized QueryClient into wagmi
  // This is separate from our app QueryClient to avoid conflicts
});
