import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserDirectory, SortField } from '@/hooks/useUserDirectory';
import { useLanguage } from '@/i18n/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { FacebookNavbar } from '@/components/layout/FacebookNavbar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import {
  Gift, Sparkles, Search, Download, Users, ChevronLeft, ChevronRight,
  Copy, ExternalLink, FileText, MessageSquare, Heart, Share2, UserPlus, Radio, Sun, FileSpreadsheet
} from 'lucide-react';
import { toast } from 'sonner';
import { getAddressUrl } from '@/config/pplp';

const shortenAddress = (addr: string | null) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : null;

const formatNum = (n: number) => new Intl.NumberFormat('vi-VN').format(Math.round(n));

const UserDirectory = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const {
    filteredUsers, isLoading, error,
    search, setSearch, sortField, setSortField,
    page, setPage, totalPages, totalUsers, totalReward, totalLightScore,
    exportCsv, exportExcel,
  } = useUserDirectory();

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    toast.success('Đã sao chép địa chỉ ví');
  };

  const getWallet = (u: any) => u.public_wallet_address || u.custodial_wallet_address;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-600 via-red-700 to-amber-700">
      <FacebookNavbar />

      <div className="max-w-7xl mx-auto px-3 md:px-6 pt-20 pb-24">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Gift className="w-8 h-8 text-yellow-300" />
            <h1 className="text-2xl md:text-4xl font-black text-white drop-shadow-lg">
              🧧 Danh Sách Thành Viên
            </h1>
            <Sparkles className="w-8 h-8 text-yellow-300" />
          </div>
          <p className="text-yellow-200 text-sm md:text-lg font-semibold">
            Chương trình Lì Xì 26.000.000.000 đồng
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Tổng Thành Viên', value: formatNum(totalUsers), icon: Users },
            { label: 'Tổng CAMLY Thưởng', value: formatNum(totalReward), icon: Gift },
            { label: 'Tổng Light Score', value: formatNum(totalLightScore), icon: Sun },
          ].map(s => (
            <div key={s.label} className="bg-white/90 backdrop-blur rounded-xl p-3 md:p-4 text-center shadow-lg">
              <s.icon className="w-5 h-5 mx-auto mb-1 text-red-600" />
              <p className="text-lg md:text-2xl font-black text-red-700">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white/90 backdrop-blur rounded-xl p-4 mb-4 flex flex-col md:flex-row gap-3 items-center shadow">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm theo username..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={sortField} onValueChange={v => setSortField(v as SortField)}>
            <SelectTrigger className="w-full md:w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="total_reward">Thưởng cao nhất</SelectItem>
              <SelectItem value="total_light_score">Light Score</SelectItem>
              <SelectItem value="posts_count">Bài đăng nhiều nhất</SelectItem>
              <SelectItem value="username">Tên A-Z</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportCsv} variant="outline" className="gap-2 whitespace-nowrap">
            <Download className="w-4 h-4" /> CSV
          </Button>
          <Button onClick={exportExcel} variant="outline" className="gap-2 whitespace-nowrap bg-green-50 hover:bg-green-100 text-green-700 border-green-300">
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </Button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-destructive/10 text-destructive rounded-xl p-4 mb-4 text-center">{error}</div>
        )}

        {/* Loading */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl bg-white/30" />
            ))}
          </div>
        ) : isMobile ? (
          /* Mobile Card Layout */
          <div className="space-y-3">
            {filteredUsers.map((u, idx) => {
              const wallet = getWallet(u);
              const rank = (page - 1) * 50 + idx + 1;
              return (
                <div key={u.id} className="bg-white/95 rounded-xl p-4 shadow-lg">
                  {/* Row 1: Avatar + Name */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-sm font-bold text-red-600 min-w-[28px]">#{rank}</span>
                    <Avatar className="w-10 h-10 ring-2 ring-yellow-400/50 cursor-pointer" onClick={() => navigate(`/profile/${u.id}`)}>
                      <AvatarImage src={u.avatar_url || ''} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm">{u.username?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate cursor-pointer hover:text-primary" onClick={() => navigate(`/profile/${u.id}`)}>{u.username}</p>
                      {wallet && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <span className="font-mono">{shortenAddress(wallet)}</span>
                          <Copy className="w-3 h-3 cursor-pointer hover:text-primary" onClick={() => copyAddress(wallet)} />
                          <a href={getAddressUrl(wallet)} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3 h-3 hover:text-primary" /></a>
                        </div>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs whitespace-nowrap">
                      {u.tier_emoji} {u.tier_name}
                    </Badge>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3">
                    <div className="bg-muted/50 rounded-lg p-1.5">
                      <p className="font-bold text-foreground">{u.posts_count}</p>
                      <p className="text-muted-foreground">Bài</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-1.5">
                      <p className="font-bold text-foreground">{u.reactions_on_posts}</p>
                      <p className="text-muted-foreground">React</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-1.5">
                      <p className="font-bold text-foreground">{u.friends_count}</p>
                      <p className="text-muted-foreground">Bạn</p>
                    </div>
                  </div>

                  {/* Rewards */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-amber-50 rounded-lg p-2">
                      <p className="text-muted-foreground">CAMLY Thưởng</p>
                      <p className="font-bold text-amber-700">{formatNum(u.total_reward)}</p>
                      <p className="text-muted-foreground">Đã claim: {formatNum(u.claimed_amount)}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-2">
                      <p className="text-muted-foreground">Light Score</p>
                      <p className="font-bold text-green-700">{formatNum(u.total_light_score)}</p>
                      <p className="text-muted-foreground">FUN: {formatNum(u.total_minted)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Desktop Table */
          <div className="bg-white/95 rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-red-700 text-white">
                  <tr>
                    <th className="p-3 text-left">#</th>
                    <th className="p-3 text-left">Thành viên</th>
                    <th className="p-3 text-center">Hoạt động</th>
                    <th className="p-3 text-center">Light Score</th>
                    <th className="p-3 text-center">Thưởng CAMLY</th>
                    <th className="p-3 text-center">USDT / BTCB</th>
                    <th className="p-3 text-center">Tặng ↔ Nhận</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u, idx) => {
                    const wallet = getWallet(u);
                    const rank = (page - 1) * 50 + idx + 1;
                    return (
                      <tr key={u.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-bold text-red-600">{rank}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-9 h-9 ring-2 ring-yellow-400/50 cursor-pointer" onClick={() => navigate(`/profile/${u.id}`)}>
                              <AvatarImage src={u.avatar_url || ''} />
                              <AvatarFallback className="bg-primary text-primary-foreground text-xs">{u.username?.[0]?.toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold cursor-pointer hover:text-primary" onClick={() => navigate(`/profile/${u.id}`)}>{u.username}</p>
                              {wallet && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <span className="font-mono">{shortenAddress(wallet)}</span>
                                  <Copy className="w-3 h-3 cursor-pointer hover:text-primary" onClick={() => copyAddress(wallet)} />
                                  <a href={getAddressUrl(wallet)} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3 h-3 hover:text-primary" /></a>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap justify-center gap-1">
                            <Badge variant="secondary" className="text-xs gap-1"><FileText className="w-3 h-3" />{u.posts_count}</Badge>
                            <Badge variant="secondary" className="text-xs gap-1"><MessageSquare className="w-3 h-3" />{u.comments_count}</Badge>
                            <Badge variant="secondary" className="text-xs gap-1"><Heart className="w-3 h-3" />{u.reactions_on_posts}</Badge>
                            <Badge variant="secondary" className="text-xs gap-1"><Share2 className="w-3 h-3" />{u.shares_count}</Badge>
                            <Badge variant="secondary" className="text-xs gap-1"><UserPlus className="w-3 h-3" />{u.friends_count}</Badge>
                            <Badge variant="secondary" className="text-xs gap-1"><Radio className="w-3 h-3" />{u.livestreams_count}</Badge>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <p className="font-bold text-green-700">{formatNum(u.total_light_score)}</p>
                          <p className="text-xs">{u.tier_emoji} {u.tier_name}</p>
                          <p className="text-xs text-muted-foreground">FUN: {formatNum(u.total_minted)}</p>
                        </td>
                        <td className="p-3 text-center">
                          <p className="font-bold text-amber-700">{formatNum(u.total_reward)}</p>
                          <p className="text-xs text-green-600">Claimed: {formatNum(u.claimed_amount)}</p>
                          <p className="text-xs text-orange-600">Còn lại: {formatNum(u.claimable_amount)}</p>
                        </td>
                        <td className="p-3 text-center text-xs">
                          {u.usdt_received > 0 && <p className="text-green-600 font-semibold">{formatNum(u.usdt_received)} USDT</p>}
                          {u.btcb_received > 0 && <p className="text-orange-600 font-semibold">{formatNum(u.btcb_received)} BTCB</p>}
                          {u.usdt_received === 0 && u.btcb_received === 0 && <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="p-3 text-center text-xs">
                          <p className="text-red-500">↑ {formatNum(u.total_sent)}</p>
                          <p className="text-green-600">↓ {formatNum(u.total_received)}</p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="bg-white/80"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-white font-medium text-sm">
              Trang {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="bg-white/80"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filteredUsers.length === 0 && (
          <div className="text-center py-12 text-white/80">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-semibold">Không tìm thấy thành viên nào</p>
          </div>
        )}
      </div>

      <MobileBottomNav />
    </div>
  );
};

export default UserDirectory;
