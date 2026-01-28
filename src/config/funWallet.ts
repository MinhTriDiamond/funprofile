import { Wallet, getWalletConnectConnector } from '@rainbow-me/rainbowkit';
import funWalletLogo from '@/assets/fun-wallet-logo.png';

export interface FunWalletOptions {
  projectId: string;
}

export const funWallet = ({ projectId }: FunWalletOptions): Wallet => ({
  id: 'fun-wallet',
  name: 'FUN Wallet',
  iconUrl: funWalletLogo,
  iconBackground: '#2E7D32',
  downloadUrls: {
    android: 'https://play.google.com/store/apps/details?id=fun.wallet',
    ios: 'https://apps.apple.com/app/fun-wallet',
    qrCode: 'https://funwallet.app',
  },
  mobile: {
    getUri: (uri: string) => `funwallet://wc?uri=${encodeURIComponent(uri)}`,
  },
  qrCode: {
    getUri: (uri: string) => uri,
    instructions: {
      learnMoreUrl: 'https://funwallet.app/learn-more',
      steps: [
        {
          description: 'Mở ứng dụng FUN Wallet trên điện thoại',
          step: 'install',
          title: 'Mở FUN Wallet',
        },
        {
          description: 'Quét mã QR để kết nối ví của bạn',
          step: 'scan',
          title: 'Quét mã QR',
        },
      ],
    },
  },
  createConnector: getWalletConnectConnector({ projectId }),
});
