import { cn } from '@/lib/utils';
import { BSC_MAINNET, BSC_TESTNET, getChainDisplayName } from '@/lib/chainTokenMapping';
import bnbLogo from '@/assets/tokens/bnb-logo.webp';
import { AlertTriangle, Wifi } from 'lucide-react';

interface NetworkSelectorProps {
  selectedChainId: number;
  onChainChange: (chainId: number) => void;
  walletChainId?: number;
}

const NETWORKS = [
  { chainId: BSC_MAINNET, label: 'Mainnet', color: 'from-amber-400 to-yellow-300' },
  { chainId: BSC_TESTNET, label: 'Testnet', color: 'from-blue-400 to-cyan-300' },
];

export function NetworkSelector({ selectedChainId, onChainChange, walletChainId }: NetworkSelectorProps) {
  const needsSwitch = walletChainId !== undefined && walletChainId !== selectedChainId;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground block">Chọn mạng:</label>
      <div className="flex gap-2">
        {NETWORKS.map((net) => (
          <button
            key={net.chainId}
            type="button"
            onClick={() => onChainChange(net.chainId)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all duration-200 flex-1 justify-center',
              selectedChainId === net.chainId
                ? 'border-gold bg-gradient-to-br from-gold/20 to-amber-500/10 shadow-md font-semibold'
                : 'border-border hover:border-gold/50 hover:bg-muted/50'
            )}
          >
            <img src={bnbLogo} alt="BNB" className="w-5 h-5 rounded-full" />
            <span className="text-sm">{net.label}</span>
          </button>
        ))}
      </div>
      
      {/* Testnet hint */}
      {selectedChainId === BSC_TESTNET && (
        <div className="flex items-center gap-2 p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <Wifi className="w-4 h-4 text-blue-600 shrink-0" />
          <p className="text-xs text-blue-700">Testnet — chỉ để thử nghiệm, token không có giá trị thực.</p>
        </div>
      )}
    </div>
  );
}
