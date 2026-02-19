import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Globe, Search, Download, RefreshCw, Loader2,
  ChevronLeft, ChevronRight, Sparkles, ArrowUpDown, ArrowLeft,
  Copy, ExternalLink, Eye, CheckCircle, Clock, TrendingUp, Activity
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  const [isExportingPdf, setIsExportingPdf] = useState(false);

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

  const handleExportPdf = async () => {
    try {
      setIsExportingPdf(true);
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

      const { exportDonationsToPDF } = await import('@/utils/exportDonations');
      await exportDonationsToPDF(allDonations, 'sent');
      toast.success(`Đã xuất ${allDonations.length} giao dịch ra file PDF`);
    } catch (error) {
      console.error('PDF Export error:', error);
      toast.error('Lỗi khi xuất file PDF');
    } finally {
      setIsExportingPdf(false);
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

  const getWalletAddress = (user: any) => user?.public_wallet_address || user?.custodial_wallet_address || null;

  const renderWalletAddress = (user: any, tokenSymbol?: string, fallbackAddress?: string | null) => {
    const address = getWalletAddress(user) || fallbackAddress || null;
    if (!address) return null;
    return (
      <div className="flex items-center gap-1 mt-0.5">
        <a
          href={getBscScanAddressUrl(address, tokenSymbol)}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[10px] text-blue-600 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {shortenAddress(address)}
        </a>
        <button
          onClick={(e) => { e.stopPropagation(); copyToClipboard(address); }}
          className="text-muted-foreground hover:text-foreground"
        >
          <Copy className="w-2.5 h-2.5" />
        </button>
        <a
          href={getBscScanAddressUrl(address, tokenSymbol)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="w-2.5 h-2.5" />
        </a>
      </div>
    );
  };

  return (
    <div className="bg-gradient-to-br from-green-600 via-green-700 to-emerald-800 min-h-screen p-4 rounded-xl space-y-6">
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
          <div className="p-2 bg-white/20 backdrop-blur rounded-lg">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Lịch Sử Giao Dịch</h2>
            <p className="text-sm text-white/70">Minh bạch · Truy vết Blockchain · Chuẩn Web3</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="bg-white/20 border-white/30 text-white hover:bg-white/30"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Làm mới</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={isExporting || donations.length === 0}
            className="bg-white/20 border-white/30 text-white hover:bg-white/30"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
           <span className="hidden sm:inline">Xuất CSV</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            disabled={isExportingPdf || donations.length === 0}
            className="bg-white/20 border-white/30 text-white hover:bg-white/30"
          >
            {isExportingPdf ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            <span className="hidden sm:inline">Xuất PDF</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards - 5 cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="bg-white/90 backdrop-blur">
          <CardHeader className="pb-2 px-3 pt-3">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Activity className="w-3 h-3" />
              Tổng giao dịch
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-2xl font-extrabold text-green-700">
              {isStatsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : formatNumber(stats?.totalCount || 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/90 backdrop-blur">
          <CardHeader className="pb-2 px-3 pt-3">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
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

        <Card className="bg-white/90 backdrop-blur">
          <CardHeader className="pb-2 px-3 pt-3">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Hôm nay
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-2xl font-extrabold text-green-700">
              {isStatsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : formatNumber(stats?.todayCount || 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/90 backdrop-blur">
          <CardHeader className="pb-2 px-3 pt-3">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-green-500" />
              Thành công
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-2xl font-extrabold text-green-700">
              {isStatsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : formatNumber(stats?.confirmedCount || 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 md:col-span-1 bg-white/90 backdrop-blur">
          <CardHeader className="pb-2 px-3 pt-3">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3 text-yellow-500" />
              Chờ xử lý
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-2xl font-extrabold text-green-700">
              {isStatsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : formatNumber(stats?.pendingCount || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white/90 backdrop-blur">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm theo tên, địa chỉ ví, mã giao dịch (tx hash)..."
                  value={filters.searchTerm}
                  onChange={(e) => updateFilters({ searchTerm: e.target.value })}
                  className="pl-9"
                />
              </div>
            </div>

            <Select
              value={filters.tokenSymbol}
              onValueChange={(value) => updateFilters({ tokenSymbol: value })}
            >
              <SelectTrigger className="w-[120px]">
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
              <SelectTrigger className="w-[130px]">
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
              <SelectTrigger className="w-[130px]">
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
                className="w-[140px]"
              />
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => updateFilters({ dateTo: e.target.value })}
                className="w-[140px]"
              />
            </div>

            <Button variant="ghost" size="sm" onClick={resetFilters}>
              Xóa lọc
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-white/95 backdrop-blur">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : donations.length === 0 ? (
            <div className="text-center py-12">
              <Globe className="w-12 h-12 mx-auto text-muted-foreground opacity-50 mb-3" />
              <p className="text-muted-foreground">Không có giao dịch nào</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              {/* Desktop Card Layout */}
              <div className="hidden md:block space-y-3 p-4">
                {donations.map((donation) => {
                  const senderWallet = getWalletAddress(donation.sender) || donation.sender_address || null;
                  const recipientWallet = getWalletAddress(donation.recipient);
                  const tokenColor = 'text-emerald-500';
                  return (
                    <div
                      key={donation.id}
                      className="bg-white/95 border border-green-200 rounded-xl p-4 hover:shadow-lg transition-shadow"
                    >
                      {/* Row 1: Sender → Recipient */}
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar
                            className="w-10 h-10 shrink-0 cursor-pointer hover:ring-2 hover:ring-green-400 transition-all"
                            onClick={(e) => { e.stopPropagation(); if (donation.sender?.id) navigate(`/profile/${donation.sender.id}`); }}
                          >
                            <AvatarImage src={donation.sender?.avatar_url || undefined} />
                            <AvatarFallback>{donation.sender?.username?.charAt(0).toUpperCase() || '🌐'}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold text-sm truncate">
                                {donation.sender?.username 
                                  ? `@${donation.sender.username}`
                                  : (donation.sender_address ? shortenAddress(donation.sender_address) : '@Unknown')}
                              </p>
                              {donation.is_external && (
                                <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 text-[10px] px-1 py-0 shrink-0">Ví ngoài</Badge>
                              )}
                            </div>
                            {senderWallet && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <a href={getBscScanAddressUrl(senderWallet, donation.token_symbol)} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] text-blue-600 hover:underline" onClick={(e) => e.stopPropagation()}>
                                  {shortenAddress(senderWallet)}
                                </a>
                                <button onClick={(e) => { e.stopPropagation(); copyToClipboard(senderWallet); }} className="text-gray-400 hover:text-gray-600"><Copy className="w-2.5 h-2.5" /></button>
                                <a href={getBscScanAddressUrl(senderWallet, donation.token_symbol)} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600" onClick={(e) => e.stopPropagation()}><ExternalLink className="w-2.5 h-2.5" /></a>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-green-600 font-bold text-lg shrink-0">→</div>

                        <div className="flex items-center gap-2 min-w-0">
                          <div className="min-w-0 text-right">
                            <p className="font-semibold text-sm truncate">@{donation.recipient?.username || 'Unknown'}</p>
                            {recipientWallet && (
                              <div className="flex items-center gap-1 mt-0.5 justify-end">
                                <a href={getBscScanAddressUrl(recipientWallet, donation.token_symbol)} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] text-blue-600 hover:underline" onClick={(e) => e.stopPropagation()}>
                                  {shortenAddress(recipientWallet)}
                                </a>
                                <button onClick={(e) => { e.stopPropagation(); copyToClipboard(recipientWallet); }} className="text-gray-400 hover:text-gray-600"><Copy className="w-2.5 h-2.5" /></button>
                                <a href={getBscScanAddressUrl(recipientWallet, donation.token_symbol)} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600" onClick={(e) => e.stopPropagation()}><ExternalLink className="w-2.5 h-2.5" /></a>
                              </div>
                            )}
                          </div>
                          <Avatar
                            className="w-10 h-10 shrink-0 cursor-pointer hover:ring-2 hover:ring-green-400 transition-all"
                            onClick={(e) => { e.stopPropagation(); if (donation.recipient?.id) navigate(`/profile/${donation.recipient.id}`); }}
                          >
                            <AvatarImage src={donation.recipient?.avatar_url || undefined} />
                            <AvatarFallback>{donation.recipient?.username?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
                          </Avatar>
                        </div>
                      </div>

                      {/* Row 2: Badges + Amount */}
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex gap-1.5">
                          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-xs">Tặng thưởng</Badge>
                          {donation.tx_hash && (
                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-xs">Onchain</Badge>
                          )}
                        </div>
                        <p className={`font-mono font-bold text-xl ${tokenColor}`}>
                          {formatNumber(parseFloat(donation.amount))} {donation.token_symbol}
                        </p>
                      </div>

                      {/* Row 3: Message */}
                      {donation.message && (
                        <p className="text-yellow-500 font-semibold italic text-base mt-2">"{donation.message}"</p>
                      )}

                      {/* Row 4: Footer */}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-green-100">
                        <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500">
                          {getStatusBadge(donation.status)}
                          <span>·</span>
                          <span>{formatDate(donation.created_at)}</span>
                          <span>·</span>
                          <span className="font-medium">BSC</span>
                          {donation.tx_hash && (
                            <>
                              <span>·</span>
                              <span className="text-gray-400">TX:</span>
                              <a href={getBscScanTxUrl(donation.tx_hash, donation.token_symbol)} target="_blank" rel="noopener noreferrer" className="font-mono text-blue-600 hover:underline" onClick={(e) => e.stopPropagation()}>
                                {shortenAddress(donation.tx_hash)}
                              </a>
                              <button onClick={(e) => { e.stopPropagation(); copyToClipboard(donation.tx_hash); }} className="text-gray-400 hover:text-gray-600"><Copy className="w-3 h-3" /></button>
                              <a href={getBscScanTxUrl(donation.tx_hash, donation.token_symbol)} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600" onClick={(e) => e.stopPropagation()}><ExternalLink className="w-3 h-3" /></a>
                            </>
                          )}
                        </div>
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDonationClick(donation); }} className="text-xs h-7">
                          <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-500" />
                          Xem Card
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Mobile List */}
              <div className="md:hidden divide-y">
                {donations.map((donation) => (
                  <div
                    key={donation.id}
                    className="p-4 hover:bg-accent/50 active:bg-accent"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar className="w-10 h-10 shrink-0">
                          <AvatarImage src={donation.sender?.avatar_url || undefined} />
                          <AvatarFallback>
                            {donation.sender?.username?.charAt(0).toUpperCase() || '🌐'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium truncate">
                              {donation.sender?.username 
                                ? `@${donation.sender.username}`
                                : (donation.sender_address ? shortenAddress(donation.sender_address) : '@Unknown')}
                            </p>
                            {donation.is_external && (
                              <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 text-[10px] px-1 py-0 shrink-0">Ví ngoài</Badge>
                            )}
                          </div>
                          {renderWalletAddress(donation.sender, donation.token_symbol, donation.sender_address)}
                          <p className="text-sm text-muted-foreground truncate">
                            → @{donation.recipient?.username || 'Unknown'}
                          </p>
                          {renderWalletAddress(donation.recipient, donation.token_symbol)}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono font-bold text-xl text-emerald-500">
                          {formatNumber(parseFloat(donation.amount))} {donation.token_symbol}
                        </p>
                        <div className="flex gap-1 justify-end mt-1">
                          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-[10px] px-1.5">Tặng thưởng</Badge>
                          {donation.tx_hash && (
                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px] px-1.5">Onchain</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* TX Hash row */}
                    {donation.tx_hash && (
                      <div className="flex items-center gap-2 mt-2 text-xs">
                        <span className="text-muted-foreground">TX:</span>
                        <a
                          href={getBscScanTxUrl(donation.tx_hash, donation.token_symbol)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-blue-600 hover:underline"
                        >
                          {shortenAddress(donation.tx_hash)}
                        </a>
                        <button onClick={() => copyToClipboard(donation.tx_hash)} className="text-muted-foreground">
                          <Copy className="w-3 h-3" />
                        </button>
                        <a
                          href={getBscScanTxUrl(donation.tx_hash, donation.token_symbol)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                    {/* Message */}
                    {donation.message && (
                      <p className="text-sm text-yellow-500 font-semibold mt-1 italic truncate">"{donation.message}"</p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{formatDate(donation.created_at)}</span>
                        {getStatusBadge(donation.status)}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDonationClick(donation)}
                        className="text-xs h-7"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Xem Card
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <div className="text-sm text-muted-foreground">
                  {donations.length} / {totalCount}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateFilters({ page: filters.page - 1 })}
                    disabled={filters.page <= 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm">
                    {filters.page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateFilters({ page: filters.page + 1 })}
                    disabled={filters.page >= totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Celebration Cards */}
      {selectedDonation && celebrationType === 'sent' && (
        <DonationSuccessCard
          isOpen={isCelebrationOpen}
          onClose={handleCloseCelebration}
          data={{
            id: selectedDonation.id,
            amount: selectedDonation.amount,
            tokenSymbol: selectedDonation.token_symbol,
            senderUsername: selectedDonation.sender?.username || (selectedDonation.sender_address ? shortenAddress(selectedDonation.sender_address) : 'Unknown'),
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
            senderUsername: selectedDonation.sender?.username || (selectedDonation.sender_address ? shortenAddress(selectedDonation.sender_address) : 'Unknown'),
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
