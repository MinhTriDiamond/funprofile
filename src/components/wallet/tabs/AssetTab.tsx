import { useState } from 'react';
import { WalletCard } from '../WalletCard';
import { AlertTriangle, Copy, Check, ExternalLink } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { copyToClipboard } from '@/utils/clipboard';
import { toast } from 'sonner';
import { useBtcBalance } from '@/hooks/useBtcBalance';
import { cn } from '@/lib/utils';
import btcLogo from '@/assets/tokens/btc-logo.png';

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
  btcAddress?: string | null;
  selectedNetwork?: 'evm' | 'bitcoin';
  prices?: Record<string, { usd: number; usd_24h_change: number }>;
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
  btcAddress,
  selectedNetwork = 'evm',
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
  const navigate = useNavigate();
  const bscTestnetId = 97;
  const [btcCopied, setBtcCopied] = useState(false);

  const shortenBtc = (addr: string) => `${addr.slice(0, 8)}...${addr.slice(-6)}`;

  const handleCopyBtc = async () => {
    if (!btcAddress) return;
    const ok = await copyToClipboard(btcAddress);
    if (ok) {
      setBtcCopied(true);
      toast.success(t('walletAddressCopied'));
      setTimeout(() => setBtcCopied(false), 2000);
    }
  };

  if (selectedNetwork === 'bitcoin') {
    return (
      <div className="space-y-4">
        {/* Bitcoin Network Address Section */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border-2 border-orange-200">
          <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400 px-4 py-3 flex items-center gap-2">
            <img src={btcLogo} alt="BTC" className="w-5 h-5 rounded-full" />
            <span className="font-bold text-white text-sm">BTC</span>
          </div>

          <div className="px-4 py-3">
            {btcAddress ? (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-muted-foreground">Địa chỉ:</span>
                  <span className="text-sm font-mono truncate">{shortenBtc(btcAddress)}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={handleCopyBtc}
                    className="p-1.5 rounded-lg hover:bg-orange-50 transition-colors"
                    title="Copy"
                  >
                    {btcCopied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                  <a
                    href={`https://mempool.space/address/${btcAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg hover:bg-orange-50 transition-colors"
                    title="Xem trên Mempool"
                  >
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                  </a>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Chưa liên kết địa chỉ BTC</span>
                <button
                  onClick={() => navigate('/edit-profile')}
                  className="text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors"
                >
                  + Thêm địa chỉ
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {chainId === bscTestnetId && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0" />
          <span className="text-sm text-orange-700">
            {t('walletTestnetWarning')}
          </span>
        </div>
      )}

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

      {/* Bitcoin Network Address Section */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border-2 border-orange-200">
        <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400 px-4 py-3 flex items-center gap-2">
          <img src={btcLogo} alt="BTC" className="w-5 h-5 rounded-full" />
            <span className="font-bold text-white text-sm">BTC</span>
        </div>

        <div className="px-4 py-3">
          {btcAddress ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-muted-foreground">Địa chỉ:</span>
                <span className="text-sm font-mono truncate">{shortenBtc(btcAddress)}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={handleCopyBtc}
                  className="p-1.5 rounded-lg hover:bg-orange-50 transition-colors"
                  title="Copy"
                >
                  {btcCopied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
                <a
                  href={`https://mempool.space/address/${btcAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg hover:bg-orange-50 transition-colors"
                  title="Xem trên Mempool"
                >
                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                </a>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Chưa liên kết địa chỉ BTC</span>
              <button
                onClick={() => navigate('/edit-profile')}
                className="text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors"
              >
                + Thêm địa chỉ
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
