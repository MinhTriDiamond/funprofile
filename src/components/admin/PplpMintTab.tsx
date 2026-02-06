import { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sparkles,
  Wallet,
  RefreshCw,
  CheckCircle,
  Clock,
  Send,
  ExternalLink,
  AlertCircle,
  Loader2,
  Pencil,
  RotateCcw,
} from 'lucide-react';
import { usePplpAdmin, MintRequest } from '@/hooks/usePplpAdmin';
import { ATTESTER_ADDRESS, formatFUN, getTxUrl, MINT_REQUEST_STATUS } from '@/config/pplp';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

interface PplpMintTabProps {
  adminId: string;
}

const PplpMintTab = ({ adminId }: PplpMintTabProps) => {
  const { address, isConnected } = useAccount();
  const { connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  
  const {
    isLoading,
    mintRequests,
    stats,
    isWritePending,
    fetchMintRequests,
    signMintRequest,
    batchSignMintRequests,
    submitToChain,
    resetToPending,
  } = usePplpAdmin();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('pending_sig');
  const [signingId, setSigningId] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  useEffect(() => {
    fetchMintRequests();
  }, [fetchMintRequests]);

  const handleConnectWallet = () => {
    connect({ connector: injected() });
  };

  const handleRefresh = () => {
    fetchMintRequests();
    setSelectedIds(new Set());
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const currentTabRequests = mintRequests.filter(r => r.status === activeTab);
      setSelectedIds(new Set(currentTabRequests.map(r => r.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  const handleSign = async (request: MintRequest) => {
    setSigningId(request.id);
    await signMintRequest(request);
    setSigningId(null);
    fetchMintRequests();
  };

  const handleBatchSign = async () => {
    const selectedRequests = mintRequests.filter(r => selectedIds.has(r.id) && r.status === MINT_REQUEST_STATUS.PENDING_SIG);
    if (selectedRequests.length === 0) return;
    
    await batchSignMintRequests(selectedRequests);
    setSelectedIds(new Set());
    fetchMintRequests();
  };

  const handleSubmit = async (request: MintRequest) => {
    setSubmittingId(request.id);
    await submitToChain(request);
    setSubmittingId(null);
    fetchMintRequests();
  };

  const handleReset = async (requestId: string) => {
    await resetToPending(requestId);
    fetchMintRequests();
  };

  const isAttesterWallet = address?.toLowerCase() === ATTESTER_ADDRESS.toLowerCase();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case MINT_REQUEST_STATUS.PENDING_SIG:
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">Chờ ký</Badge>;
      case MINT_REQUEST_STATUS.SIGNED:
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">Đã ký</Badge>;
      case MINT_REQUEST_STATUS.SUBMITTED:
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30">Đã gửi</Badge>;
      case MINT_REQUEST_STATUS.CONFIRMED:
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">Hoàn tất</Badge>;
      case MINT_REQUEST_STATUS.FAILED:
        return <Badge variant="destructive">Thất bại</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredRequests = mintRequests.filter(r => r.status === activeTab);

  return (
    <div className="space-y-6">
      {/* Header with Wallet Connection */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            ⚡ PPLP On-Chain Mint
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            {isConnected ? (
              <div className="flex items-center gap-2">
                <Badge variant={isAttesterWallet ? "default" : "destructive"} className="gap-1">
                  <Wallet className="w-3 h-3" />
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </Badge>
                {!isAttesterWallet && (
                  <span className="text-xs text-destructive">Không phải Attester</span>
                )}
                <Button variant="ghost" size="sm" onClick={() => disconnect()}>
                  Ngắt kết nối
                </Button>
              </div>
            ) : (
              <Button onClick={handleConnectWallet} disabled={isConnecting}>
                {isConnecting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Wallet className="w-4 h-4 mr-2" />
                )}
                Kết nối Ví Attester
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Chờ ký</span>
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <div className="text-2xl font-bold mt-1">{stats.pending_sig}</div>
            </div>
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Đã ký</span>
                <Pencil className="w-5 h-5 text-primary" />
              </div>
              <div className="text-2xl font-bold mt-1">{stats.signed}</div>
            </div>
            <div className="bg-secondary border border-border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Đã gửi</span>
                <Send className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold mt-1">{stats.submitted}</div>
            </div>
            <div className="bg-accent/50 border border-accent rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Hoàn tất</span>
                <CheckCircle className="w-5 h-5 text-accent-foreground" />
              </div>
              <div className="text-2xl font-bold mt-1">{stats.confirmed}</div>
            </div>
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tổng đã mint</span>
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div className="text-2xl font-bold mt-1">{formatFUN(stats.total_minted)} FUN</div>
            </div>
          </div>

          {!isConnected && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 text-yellow-600">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">Kết nối ví Attester để ký và submit transactions</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Địa chỉ Attester: <code className="bg-muted px-1 rounded">{ATTESTER_ADDRESS}</code>
              </p>
            </div>
          )}

          {isConnected && !isAttesterWallet && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">Ví hiện tại không phải là Attester!</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Vui lòng đổi sang ví: <code className="bg-muted px-1 rounded">{ATTESTER_ADDRESS}</code>
              </p>
            </div>
          )}

          {/* Tabs for different statuses */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="pending_sig" className="gap-1">
                <Clock className="w-4 h-4" />
                Chờ ký ({stats.pending_sig})
              </TabsTrigger>
              <TabsTrigger value="signed" className="gap-1">
                <Pencil className="w-4 h-4" />
                Đã ký ({stats.signed})
              </TabsTrigger>
              <TabsTrigger value="submitted" className="gap-1">
                <Send className="w-4 h-4" />
                Đã gửi ({stats.submitted})
              </TabsTrigger>
              <TabsTrigger value="confirmed" className="gap-1">
                <CheckCircle className="w-4 h-4" />
                Hoàn tất ({stats.confirmed})
              </TabsTrigger>
              <TabsTrigger value="failed" className="gap-1">
                <AlertCircle className="w-4 h-4" />
                Thất bại ({stats.failed})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              {/* Batch Actions */}
              {activeTab === 'pending_sig' && filteredRequests.length > 0 && (
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedIds.size === filteredRequests.length && filteredRequests.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                    <span className="text-sm text-muted-foreground">
                      Chọn tất cả ({selectedIds.size} đã chọn)
                    </span>
                  </div>
                  <Button
                    onClick={handleBatchSign}
                    disabled={selectedIds.size === 0 || !isConnected || !isAttesterWallet}
                    className="gap-2"
                  >
                    <Pencil className="w-4 h-4" />
                    Ký hàng loạt ({selectedIds.size})
                  </Button>
                </div>
              )}

              {activeTab === 'signed' && filteredRequests.length > 0 && (
                <div className="flex justify-end mb-4">
                  <Button
                    variant="outline"
                    className="gap-2"
                    disabled={!isConnected}
                  >
                    <Send className="w-4 h-4" />
                    Submit tất cả ({filteredRequests.length})
                  </Button>
                </div>
              )}

              {/* Request List */}
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredRequests.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      Không có request nào ở trạng thái này
                    </div>
                  ) : (
                    filteredRequests.map((request) => (
                      <MintRequestRow
                        key={request.id}
                        request={request}
                        isSelected={selectedIds.has(request.id)}
                        onSelect={(checked) => handleSelectOne(request.id, checked)}
                        onSign={() => handleSign(request)}
                        onSubmit={() => handleSubmit(request)}
                        onReset={() => handleReset(request.id)}
                        isSigning={signingId === request.id}
                        isSubmitting={submittingId === request.id}
                        canSign={isConnected && isAttesterWallet}
                        canSubmit={isConnected}
                        getStatusBadge={getStatusBadge}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

// Mint Request Row Component
interface MintRequestRowProps {
  request: MintRequest;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onSign: () => void;
  onSubmit: () => void;
  onReset: () => void;
  isSigning: boolean;
  isSubmitting: boolean;
  canSign: boolean;
  canSubmit: boolean;
  getStatusBadge: (status: string) => React.ReactNode;
}

const MintRequestRow = ({
  request,
  isSelected,
  onSelect,
  onSign,
  onSubmit,
  onReset,
  isSigning,
  isSubmitting,
  canSign,
  canSubmit,
  getStatusBadge,
}: MintRequestRowProps) => {
  const showCheckbox = request.status === MINT_REQUEST_STATUS.PENDING_SIG;
  const showSign = request.status === MINT_REQUEST_STATUS.PENDING_SIG;
  const showSubmit = request.status === MINT_REQUEST_STATUS.SIGNED;
  const showTxLink = request.tx_hash && !request.tx_hash.startsWith('pending_');
  const showReset = request.status === MINT_REQUEST_STATUS.FAILED;

  return (
    <div className="flex items-center gap-4 p-4 bg-card border rounded-lg hover:bg-muted/50 transition-colors">
      {/* Checkbox */}
      {showCheckbox && (
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
        />
      )}

      {/* User Info */}
      <div className="flex items-center gap-3 min-w-[150px]">
        <Avatar className="w-10 h-10">
          <AvatarImage src={request.profiles?.avatar_url || undefined} />
          <AvatarFallback>
            {request.profiles?.username?.[0]?.toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="font-medium">@{request.profiles?.username || 'Unknown'}</div>
          <div className="text-xs text-muted-foreground">
            {request.recipient_address.slice(0, 8)}...{request.recipient_address.slice(-6)}
          </div>
        </div>
      </div>

      {/* Amount */}
      <div className="min-w-[100px]">
        <div className="font-bold text-lg text-amber-500">
          {formatFUN(request.amount_display)} FUN
        </div>
        <div className="text-xs text-muted-foreground">
          {request.action_types.length} actions
        </div>
      </div>

      {/* Status */}
      <div className="min-w-[100px]">
        {getStatusBadge(request.status)}
      </div>

      {/* Time */}
      <div className="text-sm text-muted-foreground min-w-[100px]">
        {formatDistanceToNow(new Date(request.created_at), { addSuffix: true, locale: vi })}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 ml-auto">
        {showSign && (
          <Button
            size="sm"
            onClick={onSign}
            disabled={!canSign || isSigning}
            className="gap-1"
          >
            {isSigning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Pencil className="w-4 h-4" />
            )}
            Ký
          </Button>
        )}

        {showSubmit && (
          <Button
            size="sm"
            variant="default"
            onClick={onSubmit}
            disabled={!canSubmit || isSubmitting}
            className="gap-1 bg-gradient-to-r from-purple-500 to-blue-500"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Submit
          </Button>
        )}

        {showTxLink && (
          <a
            href={getTxUrl(request.tx_hash!)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button size="sm" variant="outline" className="gap-1">
              <ExternalLink className="w-4 h-4" />
              BSCScan
            </Button>
          </a>
        )}

        {showReset && (
          <Button
            size="sm"
            variant="outline"
            onClick={onReset}
            className="gap-1"
          >
            <RotateCcw className="w-4 h-4" />
            Thử lại
          </Button>
        )}
      </div>
    </div>
  );
};

export default PplpMintTab;
