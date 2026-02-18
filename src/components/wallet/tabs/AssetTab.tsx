import { WalletCard } from '../WalletCard';
import { AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

interface AssetTabProps {
  walletAddress: string | null;
  walletName: string;
  connectorType: 'metamask' | 'bitget' | 'trust' | 'fun' | 'other' | null;
  isConnected: boolean;
  accountCount: number;
  tokens: any[];
  totalUsdValue: number;
  isTokensLoading: boolean;
  copied: boolean;
  chainId: number | undefined;
  onCopy: () => void;
  onRefresh: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onSwitchAccount: () => void;
  onReceive: () => void;
  onSend: () => void;
  onSwap: () => void;
  onBuy: () => void;
}

export function AssetTab({
  walletAddress,
  walletName,
  connectorType,
  isConnected,
  accountCount,
  tokens,
  totalUsdValue,
  isTokensLoading,
  copied,
  chainId,
  onCopy,
  onRefresh,
  onConnect,
  onDisconnect,
  onSwitchAccount,
  onReceive,
  onSend,
  onSwap,
  onBuy,
}: AssetTabProps) {
  const { t } = useLanguage();
  const bscTestnetId = 97;

  return (
    <div className="space-y-4">
      {/* Testnet Warning Banner */}
      {chainId === bscTestnetId && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0" />
          <span className="text-sm text-orange-700">
            {t('walletTestnetWarning')}
          </span>
        </div>
      )}

      {/* Wallet Card with token balances */}
      <WalletCard
        walletAddress={walletAddress}
        walletName={walletName}
        connectorType={connectorType}
        isConnected={isConnected}
        accountCount={accountCount}
        tokens={tokens}
        totalUsdValue={totalUsdValue}
        isTokensLoading={isTokensLoading}
        copied={copied}
        onCopy={onCopy}
        onRefresh={onRefresh}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
        onSwitchAccount={onSwitchAccount}
        onReceive={onReceive}
        onSend={onSend}
        onSwap={onSwap}
        onBuy={onBuy}
      />
    </div>
  );
}
