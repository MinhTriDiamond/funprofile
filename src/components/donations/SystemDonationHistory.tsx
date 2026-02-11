import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Globe, Search, Download, RefreshCw, Loader2,
  ChevronLeft, ChevronRight, Sparkles, ArrowLeft,
  Copy, ExternalLink, Eye, CheckCircle, Clock, TrendingUp, Activity, ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAdminDonationHistory, fetchAllDonationsForExport } from '@/hooks/useAdminDonationHistory';
import { DonationRecord } from '@/hooks/useDonationHistory';
import { DonationSuccessCard } from '@/components/donations/DonationSuccessCard';
import { DonationReceivedCard } from '@/components/donations/DonationReceivedCard';
import { exportDonationsToCSV } from '@/utils/exportDonations';
import { formatNumber, formatDate } from '@/lib/formatters';
import { getBscScanTxUrl, getBscScanAddressUrl } from '@/lib/bscScanHelpers';
import { toast } from 'sonner';

const shortenAddress = (addr: string) => {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
  toast.success('Đã sao chép!');
};

const getWalletAddress = (user: any) =>
  user?.public_wallet_address || user?.custodial_wallet_address || null;

export function SystemDonationHistory() {
  const navigate = useNavigate();
  const {
    donations,
    totalCount,
    totalPages,
    stats,
    filters,
    isLoading,
    isStatsLoading,
    updateFilters,
    resetFilters,
    refetch,
  } = useAdminDonationHistory();

  const [selectedDonation, setSelectedDonation] = useState<DonationRecord | null>(null);
  const [celebrationType, setCelebrationType] = useState<'sent' | 'received'>('sent');
  const [isCelebrationOpen, setIsCelebrationOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleDonationClick = (donation: DonationRecord) => {
    setSelectedDonation(donation);
    setCelebrationType('sent');
    setIsCelebrationOpen(true);
  };

  const handleCloseCelebration = () => {
    setIsCelebrationOpen(false);
    setSelectedDonation(null);
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const allDonations = await fetchAllDonationsForExport({
        searchTerm: filters.searchTerm,
        tokenSymbol: filters.tokenSymbol,
        status: filters.status,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        onlyOnchain: filters.onlyOnchain,
        type: filters.type,
      });

      if (allDonations.length === 0) {
        toast.error('Không có dữ liệu để xuất');
        return;
      }

      exportDonationsToCSV(allDonations, 'sent', `all-donations-${new Date().toISOString().split('T')[0]}.csv`);
      toast.success(`Đã xuất ${allDonations.length} giao dịch ra file CSV`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Lỗi khi xuất file');
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Thành công</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Đang xử lý</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Thất bại</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Render user block with avatar + name + wallet address
  const renderUserBlock = (user: any, tokenSymbol?: string, align: 'left' | 'right' = 'left') => {
    const walletAddr = getWalletAddress(user);
    const isRight = align === 'right';
    return (
      <div className={`flex items-center gap-2 ${isRight ? 'flex-row-reverse' : ''}`}>
        <Avatar className="w-9 h-9 shrink-0 ring-2 ring-white/80 shadow-sm">
          <AvatarImage src={user?.avatar_url || undefined} />
          <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-bold">
            {user?.username?.charAt(0).toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        <div className={`min-w-0 ${isRight ? 'text-right' : ''}`}>
          <p className="font-semibold text-sm truncate">@{user?.username || 'Unknown'}</p>
          {walletAddr && (
            <div className={`flex items-center gap-1 ${isRight ? 'justify-end' : ''}`}>
              <a
                href={getBscScanAddressUrl(walletAddr, tokenSymbol)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[10px] text-blue-600 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {shortenAddress(walletAddr)}
              </a>
              <button
                onClick={(e) => { e.stopPropagation(); copyToClipboard(walletAddr); }}
                className="text-muted-foreground hover:text-foreground"
              >
                <Copy className="w-2.5 h-2.5" />
              </button>
              <a
                href={getBscScanAddressUrl(walletAddr, tokenSymbol)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-blue-600"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render a single transaction card
  const renderTransactionCard = (donation: DonationRecord) => {
    return (
      <div key={donation.id} className="bg-white/95 rounded-xl p-4 shadow-sm border border-green-200/50 hover:shadow-md transition-shadow">
        {/* Row 1: Sender -> Recipient */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            {renderUserBlock(donation.sender, donation.token_symbol, 'left')}
          </div>
          <div className="shrink-0 px-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
              <ArrowRight className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            {renderUserBlock(donation.recipient, donation.token_symbol, 'right')}
          </div>
        </div>

        {/* Row 2: Badges + Amount */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex gap-1.5 flex-wrap">
            <Badge className="bg-amber-500 text-white hover:bg-amber-500 text-[10px] px-2 py-0.5 font-semibold">
              Tặng thưởng
            </Badge>
            {donation.tx_hash && (
              <Badge className="bg-emerald-500 text-white hover:bg-emerald-500 text-[10px] px-2 py-0.5 font-semibold">
                Onchain
              </Badge>
            )}
          </div>
          <p className="font-bold text-base text-amber-600">
            {formatNumber(parseFloat(donation.amount))} <span className="text-sm">{donation.token_symbol}</span>
          </p>
        </div>

        {/* Row 3: Message */}
        {donation.message && (
          <div className="mt-2 px-3 py-2 bg-green-50/80 rounded-lg border border-green-100">
            <p className="text-sm italic text-gray-700">"{donation.message}"</p>
          </div>
        )}

        {/* Row 4: Footer - Status + TX Hash + View Card */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-green-100">
          <div className="flex items-center gap-2">
            {donation.status === 'confirmed' && <CheckCircle className="w-3.5 h-3.5 text-green-500" />}
            {donation.status === 'pending' && <Clock className="w-3.5 h-3.5 text-yellow-500" />}
            <span className="text-xs text-gray-500">{getStatusBadge(donation.status)}</span>
            <span className="text-[10px] text-gray-400">{formatDate(donation.created_at)}</span>
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">BSC</Badge>
          </div>

          <div className="flex items-center gap-2">
            {donation.tx_hash && (
              <div className="flex items-center gap-1">
                <a
                  href={getBscScanTxUrl(donation.tx_hash, donation.token_symbol)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[10px] text-blue-600 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {shortenAddress(donation.tx_hash)}
                </a>
                <button
                  onClick={(e) => { e.stopPropagation(); copyToClipboard(donation.tx_hash); }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Copy className="w-2.5 h-2.5" />
                </button>
              </div>
            )}
            <Button
              size="sm"
              onClick={(e) => { e.stopPropagation(); handleDonationClick(donation); }}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs h-7 px-3 rounded-full shadow-sm"
            >
              <Eye className="w-3 h-3 mr-1" />
              Xem Card
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 via-green-700 to-emerald-800 -m-4 md:-m-6 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="md:hidden text-white hover:bg-white/20"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white">Lịch Sử Giao Dịch</h2>
              <p className="text-sm text-green-100">Minh bạch · Truy vết Blockchain · Chuẩn Web3</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
              className="bg-white/10 border-white/30 text-white hover:bg-white/20"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Làm mới</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={isExporting || donations.length === 0}
              className="bg-white/10 border-white/30 text-white hover:bg-white/20"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              <span className="hidden sm:inline">Xuất CSV</span>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="bg-white/90 border-0 shadow-lg">
            <CardHeader className="pb-2 px-3 pt-3">
              <CardTitle className="text-xs font-medium text-gray-500 flex items-center gap-1">
                <Activity className="w-3 h-3" />
                Tổng giao dịch
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-xl font-bold text-gray-800">
                {isStatsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : formatNumber(stats?.totalCount || 0)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 border-0 shadow-lg">
            <CardHeader className="pb-2 px-3 pt-3">
              <CardTitle className="text-xs font-medium text-gray-500 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Tổng giá trị
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-xl font-bold text-amber-600">
                {isStatsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : formatNumber(stats?.totalValue || 0)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 border-0 shadow-lg">
            <CardHeader className="pb-2 px-3 pt-3">
              <CardTitle className="text-xs font-medium text-gray-500 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Hôm nay
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-xl font-bold text-blue-600">
                {isStatsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : formatNumber(stats?.todayCount || 0)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 border-0 shadow-lg">
            <CardHeader className="pb-2 px-3 pt-3">
              <CardTitle className="text-xs font-medium text-gray-500 flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-500" />
                Thành công
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-xl font-bold text-green-600">
                {isStatsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : formatNumber(stats?.confirmedCount || 0)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 border-0 shadow-lg col-span-2 md:col-span-1">
            <CardHeader className="pb-2 px-3 pt-3">
              <CardTitle className="text-xs font-medium text-gray-500 flex items-center gap-1">
                <Clock className="w-3 h-3 text-yellow-500" />
                Chờ xử lý
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="text-xl font-bold text-yellow-600">
                {isStatsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : formatNumber(stats?.pendingCount || 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-white/90 border-0 shadow-lg">
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Tìm theo tên, địa chỉ ví, mã giao dịch (tx hash)..."
                    value={filters.searchTerm}
                    onChange={(e) => updateFilters({ searchTerm: e.target.value })}
                    className="pl-9 bg-white"
                  />
                </div>
              </div>

              <Select
                value={filters.tokenSymbol}
                onValueChange={(value) => updateFilters({ tokenSymbol: value })}
              >
                <SelectTrigger className="w-[120px] bg-white">
                  <SelectValue placeholder="Token" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="CAMLY">CAMLY</SelectItem>
                  <SelectItem value="BNB">BNB</SelectItem>
                  <SelectItem value="FUN">FUN</SelectItem>
                  <SelectItem value="USDT">USDT</SelectItem>
                  <SelectItem value="BTCB">BTCB</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.type}
                onValueChange={(value: any) => updateFilters({ type: value })}
              >
                <SelectTrigger className="w-[130px] bg-white">
                  <SelectValue placeholder="Loại" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả loại</SelectItem>
                  <SelectItem value="reward">Tặng thưởng</SelectItem>
                  <SelectItem value="transfer">Chuyển tiền</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.status}
                onValueChange={(value: any) => updateFilters({ status: value })}
              >
                <SelectTrigger className="w-[130px] bg-white">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="confirmed">Thành công</SelectItem>
                  <SelectItem value="pending">Đang xử lý</SelectItem>
                  <SelectItem value="failed">Thất bại</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <Switch
                  id="onchain-filter"
                  checked={filters.onlyOnchain}
                  onCheckedChange={(checked) => updateFilters({ onlyOnchain: checked })}
                />
                <Label htmlFor="onchain-filter" className="text-sm cursor-pointer whitespace-nowrap">
                  Chỉ onchain
                </Label>
              </div>

              <div className="hidden md:flex gap-2">
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => updateFilters({ dateFrom: e.target.value })}
                  className="w-[140px] bg-white"
                />
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => updateFilters({ dateTo: e.target.value })}
                  className="w-[140px] bg-white"
                />
              </div>

              <Button variant="ghost" size="sm" onClick={resetFilters} className="text-gray-600 hover:bg-white/50">
                Xóa lọc
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Transaction Cards */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
        ) : donations.length === 0 ? (
          <div className="text-center py-12">
            <Globe className="w-12 h-12 mx-auto text-white/50 mb-3" />
            <p className="text-white/70">Không có giao dịch nào</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {donations.map((donation) => renderTransactionCard(donation))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-2 py-3">
              <div className="text-sm text-white/80">
                {donations.length} / {totalCount}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateFilters({ page: filters.page - 1 })}
                  disabled={filters.page <= 1}
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-white">
                  {filters.page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateFilters({ page: filters.page + 1 })}
                  disabled={filters.page >= totalPages}
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Celebration Cards */}
      {selectedDonation && celebrationType === 'sent' && (
        <DonationSuccessCard
          isOpen={isCelebrationOpen}
          onClose={handleCloseCelebration}
          data={{
            id: selectedDonation.id,
            amount: selectedDonation.amount,
            tokenSymbol: selectedDonation.token_symbol,
            senderUsername: selectedDonation.sender?.username || 'Unknown',
            senderAvatarUrl: selectedDonation.sender?.avatar_url,
            recipientUsername: selectedDonation.recipient?.username || 'Unknown',
            recipientAvatarUrl: selectedDonation.recipient?.avatar_url,
            message: selectedDonation.message,
            txHash: selectedDonation.tx_hash,
            lightScoreEarned: selectedDonation.light_score_earned || 0,
            createdAt: selectedDonation.created_at,
          }}
        />
      )}

      {selectedDonation && celebrationType === 'received' && (
        <DonationReceivedCard
          isOpen={isCelebrationOpen}
          onClose={handleCloseCelebration}
          data={{
            id: selectedDonation.id,
            amount: selectedDonation.amount,
            tokenSymbol: selectedDonation.token_symbol,
            senderUsername: selectedDonation.sender?.username || 'Unknown',
            senderAvatarUrl: selectedDonation.sender?.avatar_url,
            senderId: selectedDonation.sender?.id || '',
            message: selectedDonation.message,
            txHash: selectedDonation.tx_hash,
            createdAt: selectedDonation.created_at,
          }}
        />
      )}
    </div>
  );
}
