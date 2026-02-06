import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  metaMaskWallet,
  trustWallet,
  bitgetWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { funWallet } from './funWallet';
import { createConfig, http } from 'wagmi';
import { mainnet, bsc, bscTestnet } from 'wagmi/chains';

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

export const config = createConfig({
  connectors,
  chains: [mainnet, bsc, bscTestnet],
  transports: {
    [mainnet.id]: http(),
    [bsc.id]: http(),
    [bscTestnet.id]: http('https://data-seed-prebsc-1-s1.binance.org:8545/'),
  },
});
