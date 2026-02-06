import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { config } from '@/config/web3';

interface Web3ProviderProps {
  children: React.ReactNode;
}

export const Web3Provider = ({ children }: Web3ProviderProps) => {
  return (
    <WagmiProvider config={config}>
      <RainbowKitProvider
        theme={darkTheme({
          accentColor: '#10b981',
          accentColorForeground: 'white',
          borderRadius: 'large',
        })}
      >
        {children}
      </RainbowKitProvider>
    </WagmiProvider>
  );
};
