import { FacebookNavbar } from '@/components/layout/FacebookNavbar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { useUserDirectory, getTierName } from '@/hooks/useUserDirectory';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Gift, Download, Users as UsersIcon, Sparkles, Search, ChevronLeft, ChevronRight, Star,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Users = () => {
  const navigate = useNavigate();
  const {
    users, isLoading, stats, search, setSearch, page, setPage, totalPages, exportCSV, allUsers,
  } = useUserDirectory();

  const formatNumber = (n: number) => n.toLocaleString('vi-VN');
  const shortenAddress = (addr: string | null) => {
    if (!addr) return '—';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-background/80 overflow-hidden">
      <FacebookNavbar />
      <main data-app-scroll className="fixed inset-x-0 top-[3cm] bottom-0 overflow-y-auto pb-20 px-2 md:px-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center py-6">
          <div className="inline-flex items-center justify-center gap-2 mb-2">
            <Gift className="w-8 h-8 text-red-500" />
            <h1
              className="text-2xl md:text-3xl font-black tracking-wider uppercase"
              style={{
                background: 'linear-gradient(90deg, #dc2626, #f59e0b, #dc2626)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              🧧 DANH SÁCH THÀNH VIÊN 🧧
            </h1>
            <Gift className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-amber-500 font-semibold text-sm md:text-base">
            Chương trình Lì Xì 26.000.000.000 đồng
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <div className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-2 border-red-500/30 rounded-xl p-4 text-center">
            <UsersIcon className="w-6 h-6 mx-auto mb-1 text-red-500" />
            <p className="text-xl md:text-2xl font-bold text-red-500">{formatNumber(stats.totalUsers)}</p>
            <p className="text-xs text-muted-foreground">Tổng Thành Viên</p>
          </div>
          <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-2 border-amber-500/30 rounded-xl p-4 text-center">
            <Gift className="w-6 h-6 mx-auto mb-1 text-amber-500" />
            <p className="text-xl md:text-2xl font-bold text-amber-500">{formatNumber(stats.totalCamlyCalculated)}</p>
            <p className="text-xs text-muted-foreground">CAMLY Tính Toán</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-2 border-emerald-500/30 rounded-xl p-4 text-center">
            <Star className="w-6 h-6 mx-auto mb-1 text-emerald-500" />
            <p className="text-xl md:text-2xl font-bold text-emerald-500">{formatNumber(stats.totalCamlyClaimed)}</p>
            <p className="text-xs text-muted-foreground">CAMLY Đã Thưởng</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-2 border-purple-500/30 rounded-xl p-4 text-center">
            <Sparkles className="w-6 h-6 mx-auto mb-1 text-purple-500" />
            <p className="text-xl md:text-2xl font-bold text-purple-500">{formatNumber(stats.totalLightScore)}</p>
            <p className="text-xs text-muted-foreground">Tổng Light Score</p>
          </div>
        </div>

        {/* Search & Export */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm theo username hoặc wallet..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="sm" onClick={exportCSV} className="shrink-0">
            <Download className="w-4 h-4 mr-1" />
            CSV
          </Button>
        </div>

        {/* Results count */}
        <p className="text-xs text-muted-foreground mb-2">
          Hiển thị {users.length} / {allUsers.length} thành viên
        </p>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
          </div>
        ) : (
          <div className="border-2 border-red-500/20 rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-red-500/10 to-amber-500/10">
                  <TableHead className="w-10 text-center">#</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="hidden md:table-cell">Hoạt Động</TableHead>
                  <TableHead className="hidden lg:table-cell">Light Score</TableHead>
                  <TableHead>CAMLY</TableHead>
                  <TableHead className="hidden md:table-cell">USDT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      <UsersIcon className="w-10 h-10 mx-auto mb-3 opacity-40" />
                      <p>Không tìm thấy thành viên nào</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user, idx) => (
                    <TableRow
                      key={user.id}
                      className="cursor-pointer hover:bg-red-500/5 transition-colors"
                      onClick={() => navigate(`/profile/${user.id}`)}
                    >
                      <TableCell className="text-center font-medium text-muted-foreground">
                        {page * 50 + idx + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8 border border-amber-400/30">
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback className="bg-red-500/10 text-red-500 text-xs">
                              {user.username?.[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">@{user.username}</p>
                            {user.wallet_address && (
                              <a
                                href={`https://bscscan.com/address/${user.wallet_address}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-muted-foreground hover:text-primary"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {shortenAddress(user.wallet_address)}
                              </a>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="text-xs space-y-0.5">
                          <p>📝 {user.posts_count} · 💬 {user.comments_count}</p>
                          <p>❤️ {user.reactions_on_posts} · 👥 {user.friends_count}</p>
                          <p>🔄 {user.shares_count} · 🎥 {user.livestreams_count}</p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="text-xs space-y-0.5">
                          <p className="font-semibold text-purple-500">⭐ {formatNumber(user.total_light_score)}</p>
                          <p className="text-muted-foreground">{getTierName(user.tier)}</p>
                          <p className="text-muted-foreground">🪙 {formatNumber(user.total_minted)} FUN</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs space-y-0.5">
                          <p className="font-bold text-amber-500">{formatNumber(user.camly_calculated)}</p>
                          <p className="text-emerald-500">✅ {formatNumber(user.camly_claimed)}</p>
                          <p className={`text-xs ${user.reward_status === 'approved' ? 'text-emerald-500' : user.reward_status === 'rejected' ? 'text-red-500' : 'text-muted-foreground'}`}>
                            {user.reward_status}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {user.usdt_received > 0 ? (
                          <span className="text-sm font-semibold text-emerald-500">
                            ${user.usdt_received.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-4 mb-8">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Trang {page + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </main>
      <MobileBottomNav />
    </div>
  );
};

export default Users;
