import { WalletLoginContent } from './WalletLoginContent';

interface WalletLoginProvidersProps {
  onSuccess: (userId: string, isNewUser: boolean) => void;
}

export const WalletLoginProviders = ({ onSuccess }: WalletLoginProvidersProps) => {
  // Web3 providers are now global from App.tsx, no need to wrap here
  return <WalletLoginContent onSuccess={onSuccess} />;
};
