import { useCallback, Component, type ReactNode } from 'react';
import { MemoizedLightScoreDashboard } from '../LightScoreDashboard';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

// Error boundary to catch wagmi hook crashes (e.g. during HMR when store resets)
class Web3ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('[Web3ErrorBoundary] Caught wagmi/web3 error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
          <p className="text-muted-foreground text-sm">Kết nối Web3 bị gián đoạn. Vui lòng tải lại trang.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Tải lại trang
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

interface FunMoneyTabProps {
  externalAddress?: `0x${string}`;
  onActivate: () => void;
  onClaim: () => void;
  onClaimSuccess: () => void;
}

// MED-6: onActivate/onClaim are passed as props — parent should useCallback to keep them stable
// MemoizedLightScoreDashboard will skip re-renders unless walletAddress/callbacks change
export function FunMoneyTab({
  externalAddress,
  onActivate,
  onClaim,
}: FunMoneyTabProps) {
  return (
    <Web3ErrorBoundary>
      <MemoizedLightScoreDashboard
        walletAddress={externalAddress}
        onActivate={onActivate}
        onClaim={onClaim}
      />
    </Web3ErrorBoundary>
  );
}


