import { useCallback, Component, type ReactNode } from 'react';
import { MemoizedLightScoreDashboard } from '../LightScoreDashboard';
import { AttesterSigningPanel } from '../AttesterSigningPanel';
import { useAttesterSigning } from '@/hooks/useAttesterSigning';
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

function FunMoneyTabInner({
  externalAddress,
  onActivate,
  onClaim,
}: FunMoneyTabProps) {
  const {
    isAttester,
    attesterGroup,
    attesterName,
    requests,
    isLoading: isAttesterLoading,
    isSigning,
    signRequest,
  } = useAttesterSigning(externalAddress);

  return (
    <div className="space-y-4">
      {/* Attester Signing Panel — chỉ hiển thị khi ví kết nối là 1 trong 9 GOV attester */}
      {isAttester && attesterGroup && (
        <AttesterSigningPanel
          attesterGroup={attesterGroup}
          attesterName={attesterName}
          requests={requests}
          isLoading={isAttesterLoading}
          isSigning={isSigning}
          onSign={signRequest}
        />
      )}

      {/* Light Score Dashboard */}
      <MemoizedLightScoreDashboard
        walletAddress={externalAddress}
        onActivate={onActivate}
        onClaim={onClaim}
      />
    </div>
  );
}

export function FunMoneyTab(props: FunMoneyTabProps) {
  return (
    <Web3ErrorBoundary>
      <FunMoneyTabInner {...props} />
    </Web3ErrorBoundary>
  );
}
