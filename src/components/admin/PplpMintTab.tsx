import { useState, useEffect, useMemo } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
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
  ChevronDown,
  ChevronUp,
  XCircle,
  Trash2,
  FileText,
  Heart,
  MessageCircle,
  Users,
  Search,
  Zap,
} from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { usePplpAdmin, MintRequest, ActionBreakdown, EcosystemTopUser } from '@/hooks/usePplpAdmin';
import { isAttesterAddress, ATTESTER_ADDRESSES, formatFUN, getTxUrl, MINT_REQUEST_STATUS } from '@/config/pplp';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

interface PplpMintTabProps {
  adminId: string;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  post: <FileText className="w-4 h-4 text-blue-500" />,
  reaction: <Heart className="w-4 h-4 text-pink-500" />,
  comment: <MessageCircle className="w-4 h-4 text-green-500" />,
  share: <Send className="w-4 h-4 text-purple-500" />,
  friend: <Users className="w-4 h-4 text-cyan-500" />,
};

const ACTION_LABELS: Record<string, string> = {
  post: 'Tạo bài viết',
  reaction: 'Cảm xúc',
  comment: 'Bình luận',
  share: 'Chia sẻ',
  friend: 'Kết bạn',
  livestream: 'Phát trực tiếp',
  new_user_bonus: 'Thưởng người mới',
};

const PplpMintTab = ({ adminId }: PplpMintTabProps) => {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { disconnect } = useDisconnect();
  
  const {
    isLoading,
    mintRequests,
    stats,
    isWritePending,
    fetchMintRequests,
    fetchEcosystemStats,
    ecosystemStats,
    isLoadingEcosystem,
    signMintRequest,
    batchSignMintRequests,
    submitToChain,
    batchSubmitToChain,
    resetToPending,
    fetchActionDetails,
    rejectRequest,
    deleteRequest,
    batchCreateMintRequests,
    isBatchCreating,
  } = usePplpAdmin();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('pending_sig');
  const [signingId, setSigningId] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionDetails, setActionDetails] = useState<Record<string, ActionBreakdown[]>>({});
  const [loadingDetails, setLoadingDetails] = useState<string | null>(null);
  
  // Reject dialog state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingRequest, setRejectingRequest] = useState<MintRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [batchSubmitProgress, setBatchSubmitProgress] = useState<{ current: number; total: number } | null>(null);
  const [batchCreateDialogOpen, setBatchCreateDialogOpen] = useState(false);
  const [batchCreateResult, setBatchCreateResult] = useState<{ created: number; skipped_no_wallet: number; rejected_cleaned: number } | null>(null);

  // Search & filter state for Top Users
  const [searchQuery, setSearchQuery] = useState('');
  const [walletFilter, setWalletFilter] = useState<'all' | 'primary' | 'legacy' | 'none'>('all');
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Wallet status helper
  const getWalletStatus = (user: EcosystemTopUser) =>
    user.has_wallet ? 'primary' : (user.wallet_address ? 'legacy' : 'none');

  // Filtered top users
  const filteredTopUsers = useMemo(() => {
    if (!ecosystemStats?.top_users) return [];
    return ecosystemStats.top_users.filter((user: EcosystemTopUser) => {
      const matchesSearch = !debouncedSearch || 
        (user.username || '').toLowerCase().includes(debouncedSearch.toLowerCase());
      const status = getWalletStatus(user);
      const matchesFilter = walletFilter === 'all' || status === walletFilter;
      return matchesSearch && matchesFilter;
    });
  }, [ecosystemStats?.top_users, debouncedSearch, walletFilter]);

  // Wallet filter counts
  const walletCounts = useMemo(() => {
    if (!ecosystemStats?.top_users) return { all: 0, primary: 0, legacy: 0, none: 0 };
    const users = ecosystemStats.top_users as EcosystemTopUser[];
    return {
      all: users.length,
      primary: users.filter(u => getWalletStatus(u) === 'primary').length,
      legacy: users.filter(u => getWalletStatus(u) === 'legacy').length,
      none: users.filter(u => getWalletStatus(u) === 'none').length,
    };
  }, [ecosystemStats?.top_users]);

  useEffect(() => {
    fetchMintRequests();
    fetchEcosystemStats();
  }, [fetchMintRequests, fetchEcosystemStats]);

  const handleConnectWallet = () => {
    openConnectModal?.();
  };

  const handleRefresh = () => {
    fetchMintRequests();
    fetchEcosystemStats();
    setSelectedIds(new Set());
    setExpandedId(null);
    setActionDetails({});
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

  const handleBatchSubmit = async () => {
    const selectedRequests = mintRequests.filter(
      r => selectedIds.has(r.id) && r.status === MINT_REQUEST_STATUS.SIGNED
    );
    if (selectedRequests.length === 0) return;

    setBatchSubmitProgress({ current: 0, total: selectedRequests.length });
    await batchSubmitToChain(selectedRequests, (current, total) => {
      setBatchSubmitProgress({ current, total });
    });
    setBatchSubmitProgress(null);
    setSelectedIds(new Set());
    fetchMintRequests();
  };

  const handleReset = async (requestId: string) => {
    await resetToPending(requestId);
    fetchMintRequests();
  };

  const handleToggleExpand = async (request: MintRequest) => {
    if (expandedId === request.id) {
      setExpandedId(null);
      return;
    }
    
    setExpandedId(request.id);
    
    // Fetch action details if not cached
    if (!actionDetails[request.id] && request.action_ids?.length > 0) {
      setLoadingDetails(request.id);
      const details = await fetchActionDetails(request.action_ids);
      setActionDetails(prev => ({ ...prev, [request.id]: details }));
      setLoadingDetails(null);
    }
  };

  const handleOpenRejectDialog = (request: MintRequest) => {
    setRejectingRequest(request);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectingRequest) return;
    
    setIsRejecting(true);
    const success = await rejectRequest(rejectingRequest.id, rejectReason || 'Bị từ chối bởi Admin');
    setIsRejecting(false);
    
    if (success) {
      setRejectDialogOpen(false);
      setRejectingRequest(null);
      fetchMintRequests();
    }
  };

  const handleDelete = async (requestId: string) => {
    if (!confirm('Xóa mint request này? Actions sẽ được reset về trạng thái approved.')) return;
    
    await deleteRequest(requestId);
    fetchMintRequests();
  };

  const isAttesterWallet = isAttesterAddress(address ?? '');

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
      case 'rejected':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">Từ chối</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredRequests = mintRequests.filter(r => r.status === activeTab);

  return (
    <div className="space-y-6">
      {/* Ecosystem Overview */}
      {ecosystemStats && (
        <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              🌍 Tổng Quan FUN Money Ecosystem
              {isLoadingEcosystem && <Loader2 className="w-4 h-4 animate-spin" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                <div className="text-sm text-muted-foreground">Tổng FUN chờ claim</div>
                <div className="text-2xl font-bold text-amber-500">{formatFUN(ecosystemStats.total_approved_fun)}</div>
                <div className="text-xs text-muted-foreground">{ecosystemStats.total_approved_actions.toLocaleString()} actions</div>
              </div>
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <Wallet className="w-3 h-3" /> Users có ví
                </div>
                <div className="text-2xl font-bold text-green-500">{ecosystemStats.users_with_wallet.count}</div>
                <div className="text-xs text-muted-foreground">{formatFUN(ecosystemStats.users_with_wallet.total_fun)} FUN</div>
              </div>
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Users chưa có ví
                </div>
                <div className="text-2xl font-bold text-red-500">{ecosystemStats.users_without_wallet.count}</div>
                <div className="text-xs text-muted-foreground">{formatFUN(ecosystemStats.users_without_wallet.total_fun)} FUN</div>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <div className="text-sm text-muted-foreground">Đã mint thành công</div>
                <div className="text-2xl font-bold text-blue-500">{formatFUN(ecosystemStats.total_minted_fun)}</div>
                <div className="text-xs text-muted-foreground">{ecosystemStats.total_minted_requests} requests</div>
              </div>
            </div>

            {/* Batch Create Button */}
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setBatchCreateDialogOpen(true)}
                disabled={isBatchCreating}
                className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white gap-2"
              >
                {isBatchCreating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                Tạo Mint Requests Hàng Loạt
                {ecosystemStats.users_with_wallet && (
                  <Badge variant="secondary" className="ml-1">{ecosystemStats.users_with_wallet.count} users</Badge>
                )}
              </Button>
              {batchCreateResult && (
                <div className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  Đã tạo {batchCreateResult.created} requests, dọn {batchCreateResult.rejected_cleaned} rejected, bỏ qua {batchCreateResult.skipped_no_wallet} (chưa ví)
                </div>
              )}
            </div>

            {/* Top Users Table */}
            {ecosystemStats.top_users && ecosystemStats.top_users.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  🏆 Tất Cả Users Chờ Claim ({ecosystemStats.top_users.length} users)
                </h4>

                {/* Search & Filter Toolbar */}
                <div className="space-y-2 mb-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Tìm kiếm theo username..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={walletFilter === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setWalletFilter('all')}
                      className="text-xs h-7"
                    >
                      Tất cả ({walletCounts.all})
                    </Button>
                    <Button
                      variant={walletFilter === 'primary' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setWalletFilter('primary')}
                      className="text-xs h-7 border-green-500/50 text-green-600 hover:bg-green-500/10"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" /> Có ví chính thức ({walletCounts.primary})
                    </Button>
                    <Button
                      variant={walletFilter === 'legacy' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setWalletFilter('legacy')}
                      className="text-xs h-7 border-yellow-500/50 text-yellow-600 hover:bg-yellow-500/10"
                    >
                      <AlertCircle className="w-3 h-3 mr-1" /> Ví cũ ({walletCounts.legacy})
                    </Button>
                    <Button
                      variant={walletFilter === 'none' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setWalletFilter('none')}
                      className="text-xs h-7 border-red-500/50 text-red-600 hover:bg-red-500/10"
                    >
                      <XCircle className="w-3 h-3 mr-1" /> Chưa có ví ({walletCounts.none})
                    </Button>
                  </div>
                  {debouncedSearch && (
                    <div className="text-xs text-muted-foreground">
                      Hiển thị {filteredTopUsers.length} / {ecosystemStats.top_users.length} users
                    </div>
                  )}
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <div className="grid grid-cols-[40px_1fr_1fr_100px_80px_60px] gap-2 p-2 bg-muted/50 text-xs font-medium text-muted-foreground">
                    <span>#</span>
                    <span>User</span>
                    <span>Địa chỉ ví</span>
                    <span className="text-right">FUN</span>
                    <span className="text-right">Actions</span>
                    <span className="text-center">Ví</span>
                  </div>
                  <ScrollArea className="h-[500px]">
                    {filteredTopUsers.length === 0 ? (
                      <div className="p-6 text-center text-sm text-muted-foreground">
                        Không tìm thấy user nào phù hợp
                      </div>
                    ) : filteredTopUsers.map((user: EcosystemTopUser, idx: number) => {
                      const walletAddr = user.public_wallet_address || user.wallet_address;
                      const walletStatus = getWalletStatus(user);
                      return (
                        <div key={user.user_id} className="grid grid-cols-[40px_1fr_1fr_100px_80px_60px] gap-2 p-2 items-center border-t text-sm hover:bg-muted/30">
                          <span className="text-muted-foreground font-medium">{idx + 1}</span>
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar className="w-7 h-7">
                              <AvatarImage src={user.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {user.username?.[0]?.toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <a
                              href={`/profile/${user.user_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline truncate text-xs"
                            >
                              @{user.username || 'Unknown'}
                            </a>
                          </div>
                          <div className="truncate text-xs font-mono text-muted-foreground">
                            {walletAddr ? (
                              <a
                                href={`https://testnet.bscscan.com/address/${walletAddr}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-primary hover:underline"
                                title={walletAddr}
                              >
                                {walletAddr.slice(0, 6)}...{walletAddr.slice(-4)}
                              </a>
                            ) : (
                              <span className="text-red-400 italic">Chưa cài ví</span>
                            )}
                          </div>
                          <span className="text-right font-bold text-amber-500">{formatFUN(user.total_fun)}</span>
                          <span className="text-right text-muted-foreground">{user.action_count}</span>
                          <div className="flex justify-center" title={
                            walletStatus === 'primary' ? 'Ví chính thức (public_wallet_address)' :
                            walletStatus === 'legacy' ? 'Ví cũ (wallet_address) - cần cập nhật' :
                            'Chưa có ví'
                          }>
                            {walletStatus === 'primary' ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : walletStatus === 'legacy' ? (
                              <AlertCircle className="w-4 h-4 text-yellow-500" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-500" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </ScrollArea>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
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
              <Button onClick={handleConnectWallet}>
                <Wallet className="w-4 h-4 mr-2" />
                Kết nối Ví Attester
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
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
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Từ chối</span>
                <XCircle className="w-5 h-5 text-destructive" />
              </div>
              <div className="text-2xl font-bold mt-1">{stats.rejected}</div>
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
                Địa chỉ Attester: {ATTESTER_ADDRESSES.map((a, i) => <code key={i} className="bg-muted px-1 rounded text-xs mr-1">{a.slice(0,6)}...{a.slice(-4)}</code>)}
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
                Vui lòng đổi sang một trong các ví Attester được ủy quyền
              </p>
            </div>
          )}

          {/* Tabs for different statuses */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-6">
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
              <TabsTrigger value="rejected" className="gap-1">
                <XCircle className="w-4 h-4" />
                Từ chối ({stats.rejected})
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
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const selectedRequests = mintRequests.filter(r => selectedIds.has(r.id));
                        if (selectedRequests.length > 0) {
                          handleOpenRejectDialog(selectedRequests[0]);
                        }
                      }}
                      disabled={selectedIds.size === 0}
                      className="text-destructive hover:text-destructive"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Từ chối ({selectedIds.size})
                    </Button>
                    <Button
                      onClick={handleBatchSign}
                      disabled={selectedIds.size === 0 || !isConnected || !isAttesterWallet}
                      className="gap-2"
                    >
                      <Pencil className="w-4 h-4" />
                      Ký hàng loạt ({selectedIds.size})
                    </Button>
                  </div>
                </div>
              )}

              {activeTab === 'signed' && filteredRequests.length > 0 && (
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
                  <div className="flex items-center gap-2">
                    {batchSubmitProgress && (
                      <span className="text-sm text-muted-foreground">
                        Đang submit {batchSubmitProgress.current}/{batchSubmitProgress.total}...
                      </span>
                    )}
                    <Button
                      onClick={handleBatchSubmit}
                      disabled={selectedIds.size === 0 || !isConnected || !!batchSubmitProgress}
                      className="gap-2 bg-gradient-to-r from-purple-500 to-blue-500"
                    >
                      {batchSubmitProgress ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Submit hàng loạt ({selectedIds.size})
                    </Button>
                  </div>
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
                        isExpanded={expandedId === request.id}
                        actionBreakdown={actionDetails[request.id]}
                        isLoadingDetails={loadingDetails === request.id}
                        onSelect={(checked) => handleSelectOne(request.id, checked)}
                        onSign={() => handleSign(request)}
                        onSubmit={() => handleSubmit(request)}
                        onReset={() => handleReset(request.id)}
                        onReject={() => handleOpenRejectDialog(request)}
                        onDelete={() => handleDelete(request.id)}
                        onToggleExpand={() => handleToggleExpand(request)}
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

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-destructive" />
              Từ chối Mint Request
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Avatar className="w-10 h-10">
                <AvatarImage src={rejectingRequest?.profiles?.avatar_url || undefined} />
                <AvatarFallback>
                  {rejectingRequest?.profiles?.username?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">@{rejectingRequest?.profiles?.username || 'Unknown'}</p>
                <p className="text-sm text-amber-600 font-bold">
                  {formatFUN(rejectingRequest?.amount_display || 0)} FUN
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Lý do từ chối (tùy chọn)</label>
              <Textarea
                placeholder="Nhập lý do từ chối..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Hủy
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmReject}
              disabled={isRejecting}
            >
              {isRejecting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              Xác nhận từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Create Dialog */}
      <Dialog open={batchCreateDialogOpen} onOpenChange={setBatchCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Tạo Mint Requests Hàng Loạt
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Thao tác này sẽ:
            </p>
            <ul className="text-sm space-y-1 list-disc pl-5">
              <li>Xóa tất cả mint requests bị <strong>từ chối</strong></li>
              <li>Reset light_actions bị rejected về <strong>approved</strong></li>
              <li>Tạo mint requests mới cho tất cả users có ví + actions approved</li>
            </ul>
            <p className="text-sm font-medium text-amber-600">
              ⚠️ Bạn có chắc chắn muốn thực hiện?
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchCreateDialogOpen(false)}>
              Hủy
            </Button>
            <Button
              onClick={async () => {
                const result = await batchCreateMintRequests();
                if (result) {
                  setBatchCreateResult(result);
                  setBatchCreateDialogOpen(false);
                  handleRefresh();
                }
              }}
              disabled={isBatchCreating}
              className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white"
            >
              {isBatchCreating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 mr-2" />
              )}
              Xác nhận tạo hàng loạt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Mint Request Row Component
interface MintRequestRowProps {
  request: MintRequest;
  isSelected: boolean;
  isExpanded: boolean;
  actionBreakdown?: ActionBreakdown[];
  isLoadingDetails: boolean;
  onSelect: (checked: boolean) => void;
  onSign: () => void;
  onSubmit: () => void;
  onReset: () => void;
  onReject: () => void;
  onDelete: () => void;
  onToggleExpand: () => void;
  isSigning: boolean;
  isSubmitting: boolean;
  canSign: boolean;
  canSubmit: boolean;
  getStatusBadge: (status: string) => React.ReactNode;
}

const MintRequestRow = ({
  request,
  isSelected,
  isExpanded,
  actionBreakdown,
  isLoadingDetails,
  onSelect,
  onSign,
  onSubmit,
  onReset,
  onReject,
  onDelete,
  onToggleExpand,
  isSigning,
  isSubmitting,
  canSign,
  canSubmit,
  getStatusBadge,
}: MintRequestRowProps) => {
  const showCheckbox = request.status === MINT_REQUEST_STATUS.PENDING_SIG || request.status === MINT_REQUEST_STATUS.SIGNED;
  const showSign = request.status === MINT_REQUEST_STATUS.PENDING_SIG;
  const showSubmit = request.status === MINT_REQUEST_STATUS.SIGNED;
  const showTxLink = request.tx_hash && !request.tx_hash.startsWith('pending_');
  const showReset = request.status === MINT_REQUEST_STATUS.FAILED;
  const showReject = request.status === MINT_REQUEST_STATUS.PENDING_SIG;
  const showDelete = request.status === 'rejected' || request.status === MINT_REQUEST_STATUS.FAILED;

  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      <div className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors">
        {/* Checkbox */}
        {showCheckbox && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelect}
          />
        )}

        {/* Expand Button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onToggleExpand}
        >
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </Button>

        {/* User Info - Clickable */}
        <div className="flex items-center gap-3 min-w-[180px]">
          <Avatar className="w-10 h-10">
            <AvatarImage src={request.profiles?.avatar_url || undefined} />
            <AvatarFallback>
              {request.profiles?.username?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <a
              href={`/profile/${request.user_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              @{request.profiles?.username || 'Unknown'}
            </a>
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
          {showReject && (
            <Button
              size="sm"
              variant="outline"
              onClick={onReject}
              className="gap-1 text-destructive hover:text-destructive"
            >
              <XCircle className="w-4 h-4" />
              Từ chối
            </Button>
          )}

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

          {showDelete && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onDelete}
              className="gap-1 text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Expanded Action Details */}
      {isExpanded && (
        <div className="border-t bg-muted/30 p-4">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            📊 Chi tiết Actions ({request.action_ids?.length || 0} actions)
          </h4>
          
          {isLoadingDetails ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : actionBreakdown && actionBreakdown.length > 0 ? (
            <div className="space-y-4">
              {actionBreakdown.map((breakdown) => (
                <div key={breakdown.action_type} className="space-y-2">
                  <div className="flex items-center gap-2 font-medium">
                    {ACTION_ICONS[breakdown.action_type] || <FileText className="w-4 h-4" />}
                    <span>{ACTION_LABELS[breakdown.action_type] || breakdown.action_type}</span>
                    <Badge variant="secondary" className="ml-auto">
                      {breakdown.count} actions = {formatFUN(breakdown.total_amount)} FUN
                    </Badge>
                  </div>
                  <div className="pl-6 space-y-1">
                    {breakdown.items.slice(0, 5).map((item) => (
                      <div key={item.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="text-xs">•</span>
                        <span className="flex-1 truncate">
                          {item.content_preview || `${breakdown.action_type} action`}
                        </span>
                        <span className="text-green-600 font-medium">
                          +{item.mint_amount} FUN
                        </span>
                        <span className="text-xs">
                          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: vi })}
                        </span>
                      </div>
                    ))}
                    {breakdown.items.length > 5 && (
                      <div className="text-xs text-muted-foreground pl-3">
                        ... và {breakdown.items.length - 5} actions khác
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Không có chi tiết actions</p>
          )}

          {/* Error message if any */}
          {request.error_message && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
              <p className="text-sm text-destructive font-medium">Lỗi: {request.error_message}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PplpMintTab;
