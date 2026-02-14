import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle, Search, ArrowUpDown, Coins, RefreshCw, TrendingUp, Wallet, User, Image, ShieldCheck, ShieldX, Filter } from "lucide-react";

interface UserWithReward {
  id: string;
  username: string;
  avatar_url: string | null;
  full_name: string | null;
  public_wallet_address: string | null;
  cover_url: string | null;
  posts_count: number;
  comments_count: number;
  reactions_count: number;
  friends_count: number;
  shares_count: number;
  reactions_on_posts: number;
  livestreams_count: number;
  today_reward: number;
  total_reward: number;
  claimed_amount: number;
  claimable_amount: number;
}

interface RewardApprovalTabProps {
  adminId: string;
  onRefresh: () => void;
}

const formatNumber = (num: number) => num.toLocaleString('vi-VN');

const isValidWallet = (addr: string | null) =>
  !!addr && /^0x[a-fA-F0-9]{40}$/.test(addr);

const isProfileComplete = (user: UserWithReward) =>
  !!user.avatar_url &&
  !!(user.full_name && user.full_name.trim().length >= 2) &&
  isValidWallet(user.public_wallet_address);

const getMissingItems = (user: UserWithReward): string[] => {
  const missing: string[] = [];
  if (!user.avatar_url) missing.push("Ảnh đại diện");
  if (!user.full_name || user.full_name.trim().length < 2) missing.push("Tên đầy đủ");
  if (!isValidWallet(user.public_wallet_address)) missing.push("Ví công khai");
  return missing;
};

const ProfileBadge = ({ ok, label }: { ok: boolean; label: string }) => (
  <Badge
    variant="outline"
    className={`text-[10px] px-1.5 py-0 ${ok ? 'bg-green-50 text-green-700 border-green-300' : 'bg-red-50 text-red-600 border-red-300'}`}
  >
    {ok ? '✓' : '✗'} {label}
  </Badge>
);

const RewardApprovalTab = ({ adminId, onRefresh }: RewardApprovalTabProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"alpha_asc" | "claimable_desc" | "claimable_asc" | "total_desc">("alpha_asc");
  const [profileFilter, setProfileFilter] = useState<"all" | "ready" | "incomplete">("all");
  const [loading, setLoading] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [users, setUsers] = useState<UserWithReward[]>([]);
  
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithReward | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    loadRewardData();
  }, []);

  const loadRewardData = async () => {
    setDataLoading(true);
    try {
      const { data: rewardsData, error: rewardsError } = await supabase.rpc('get_user_rewards_v2', { 
        limit_count: 1000 
      });
      if (rewardsError) throw rewardsError;

      // Fetch claims + profiles in parallel
      const [claimsRes, profilesRes] = await Promise.all([
        supabase.from('reward_claims').select('user_id, amount'),
        supabase.from('profiles').select('id, full_name, public_wallet_address, cover_url'),
      ]);

      if (claimsRes.error) throw claimsRes.error;
      if (profilesRes.error) throw profilesRes.error;

      const claimedMap = new Map<string, number>();
      claimsRes.data?.forEach(claim => {
        claimedMap.set(claim.user_id, (claimedMap.get(claim.user_id) || 0) + claim.amount);
      });

      const profileMap = new Map<string, { full_name: string | null; public_wallet_address: string | null; cover_url: string | null }>();
      profilesRes.data?.forEach(p => {
        profileMap.set(p.id, { full_name: p.full_name, public_wallet_address: p.public_wallet_address, cover_url: p.cover_url });
      });

      const combinedUsers: UserWithReward[] = (rewardsData || []).map((r: any) => {
        const claimed = claimedMap.get(r.id) || 0;
        const profile = profileMap.get(r.id);
        return {
          id: r.id,
          username: r.username,
          avatar_url: r.avatar_url,
          full_name: profile?.full_name || null,
          public_wallet_address: profile?.public_wallet_address || null,
          cover_url: profile?.cover_url || null,
          posts_count: Number(r.posts_count) || 0,
          comments_count: Number(r.comments_count) || 0,
          reactions_count: Number(r.reactions_count) || 0,
          friends_count: Number(r.friends_count) || 0,
          shares_count: Number(r.shares_count) || 0,
          reactions_on_posts: Number(r.reactions_on_posts) || 0,
          livestreams_count: Number(r.livestreams_count) || 0,
          today_reward: Number(r.today_reward) || 0,
          total_reward: Number(r.total_reward) || 0,
          claimed_amount: claimed,
          claimable_amount: Math.max(0, Number(r.total_reward) - claimed),
        };
      });

      setUsers(combinedUsers);
    } catch (error) {
      console.error("Error loading reward data:", error);
      toast.error("Lỗi khi tải dữ liệu thưởng");
    } finally {
      setDataLoading(false);
    }
  };

  const pendingUsers = users.filter(u => u.claimable_amount > 0);

  const filteredUsers = pendingUsers
    .filter(u => {
      const matchesSearch =
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.id.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;
      if (profileFilter === "ready") return isProfileComplete(u);
      if (profileFilter === "incomplete") return !isProfileComplete(u);
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "alpha_asc": return (a.full_name || a.username).localeCompare((b.full_name || b.username), 'vi');
        case "claimable_desc": return b.claimable_amount - a.claimable_amount;
        case "claimable_asc": return a.claimable_amount - b.claimable_amount;
        case "total_desc": return b.total_reward - a.total_reward;
        default: return (a.full_name || a.username).localeCompare((b.full_name || b.username), 'vi');
      }
    });

  const handleApprove = async (user: UserWithReward) => {
    setLoading(user.id);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ pending_reward: 0, approved_reward: user.claimable_amount, reward_status: 'approved' })
        .eq('id', user.id);
      if (error) throw error;

      await supabase.from('reward_approvals').insert({
        user_id: user.id, amount: user.claimable_amount, status: 'approved',
        admin_id: adminId, admin_note: 'Đã duyệt thưởng (RPC V2)', reviewed_at: new Date().toISOString()
      });

      await supabase.from('audit_logs').insert({
        admin_id: adminId, action: 'APPROVE_REWARD_V2', target_user_id: user.id,
        reason: 'Đã duyệt thưởng', details: { amount: user.claimable_amount, total_reward: user.total_reward }
      });

      toast.success(`Đã duyệt ${formatNumber(user.claimable_amount)} CAMLY cho ${user.username}`);
      loadRewardData();
      onRefresh();
    } catch (error: any) {
      console.error("Error approving reward:", error);
      toast.error(error.message || "Lỗi khi duyệt thưởng");
    } finally {
      setLoading(null);
    }
  };

  const openRejectDialog = (user: UserWithReward) => {
    setSelectedUser(user);
    setRejectReason("");
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!selectedUser) return;
    if (!rejectReason.trim()) { toast.error("Vui lòng nhập lý do từ chối"); return; }

    setLoading(selectedUser.id);
    try {
      await supabase.from('reward_approvals').insert({
        user_id: selectedUser.id, amount: selectedUser.claimable_amount, status: 'rejected',
        admin_id: adminId, admin_note: rejectReason, reviewed_at: new Date().toISOString()
      });
      await supabase.from('profiles').update({ reward_status: 'rejected' }).eq('id', selectedUser.id);
      await supabase.from('audit_logs').insert({
        admin_id: adminId, action: 'REJECT_REWARD_V2', target_user_id: selectedUser.id,
        reason: rejectReason, details: { amount: selectedUser.claimable_amount }
      });

      toast.success(`Đã từ chối thưởng của ${selectedUser.username}`);
      setRejectDialogOpen(false);
      setSelectedUser(null);
      loadRewardData();
      onRefresh();
    } catch (error: any) {
      console.error("Error rejecting reward:", error);
      toast.error(error.message || "Lỗi khi từ chối thưởng");
    } finally {
      setLoading(null);
    }
  };

  const readyCount = pendingUsers.filter(isProfileComplete).length;
  const incompleteCount = pendingUsers.length - readyCount;
  const totalClaimable = pendingUsers.reduce((s, u) => s + u.claimable_amount, 0);
  const totalRewardAll = users.reduce((s, u) => s + u.total_reward, 0);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Coins className="w-7 h-7 text-yellow-600" />
              <div>
                <p className="text-xs text-muted-foreground">Tổng Claimable</p>
                <p className="text-lg font-bold text-yellow-700">{formatNumber(totalClaimable)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-7 h-7 text-green-600" />
              <div>
                <p className="text-xs text-muted-foreground">Tổng Reward</p>
                <p className="text-lg font-bold text-green-700">{formatNumber(totalRewardAll)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-green-100 border-emerald-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-7 h-7 text-emerald-600" />
              <div>
                <p className="text-xs text-muted-foreground">Sẵn sàng duyệt</p>
                <p className="text-lg font-bold text-emerald-700">{readyCount} users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-orange-100 border-amber-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <ShieldX className="w-7 h-7 text-amber-600" />
              <div>
                <p className="text-xs text-muted-foreground">Chưa đủ điều kiện</p>
                <p className="text-lg font-bold text-amber-700">{incompleteCount} users</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-yellow-500" />
              Duyệt thưởng V2 ({filteredUsers.length} users)
            </CardTitle>
            <Button variant="outline" size="sm" onClick={loadRewardData} disabled={dataLoading} className="gap-2">
              <RefreshCw className={`w-4 h-4 ${dataLoading ? 'animate-spin' : ''}`} />
              Làm mới
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search, Filter, Sort */}
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Tìm theo username hoặc ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-1">
              {([
                { key: 'all', label: 'Tất cả', icon: Filter },
                { key: 'ready', label: 'Sẵn sàng', icon: ShieldCheck },
                { key: 'incomplete', label: 'Chưa đủ', icon: ShieldX },
              ] as const).map(f => (
                <Button
                  key={f.key}
                  size="sm"
                  variant={profileFilter === f.key ? "default" : "outline"}
                  onClick={() => setProfileFilter(f.key)}
                  className="gap-1 text-xs"
                >
                  <f.icon className="w-3 h-3" />
                  {f.label}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortBy(prev => {
                if (prev === "alpha_asc") return "claimable_desc";
                if (prev === "claimable_desc") return "claimable_asc";
                if (prev === "claimable_asc") return "total_desc";
                return "alpha_asc";
              })}
              className="gap-1"
            >
              <ArrowUpDown className="w-4 h-4" />
              {sortBy === "alpha_asc" && "A-Z"}
              {sortBy === "claimable_desc" && "Claimable ↓"}
              {sortBy === "claimable_asc" && "Claimable ↑"}
              {sortBy === "total_desc" && "Total ↓"}
            </Button>
          </div>

          {/* User List */}
          {dataLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="max-h-[500px] overflow-y-auto space-y-3">
              {filteredUsers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Không có user nào {profileFilter === 'ready' ? 'sẵn sàng duyệt' : profileFilter === 'incomplete' ? 'chưa đủ điều kiện' : 'đang chờ duyệt thưởng'}
                </p>
              ) : (
                filteredUsers.map((user) => {
                  const complete = isProfileComplete(user);
                  const missing = getMissingItems(user);
                  return (
                    <div
                      key={user.id}
                      className={`flex items-center gap-4 p-4 border rounded-lg hover:shadow-sm transition-shadow ${complete ? 'bg-background' : 'bg-amber-50/50 border-amber-200'}`}
                    >
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={user.avatar_url || ""} />
                        <AvatarFallback>{user.username[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold truncate">{user.username}</p>
                          {user.full_name && <span className="text-xs text-muted-foreground">({user.full_name})</span>}
                          {user.today_reward > 0 && (
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                              +{formatNumber(user.today_reward)} hôm nay
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground font-mono truncate">{user.id}</p>
                        {/* Profile readiness badges */}
                        <div className="flex gap-1.5 mt-1 flex-wrap">
                          <ProfileBadge ok={!!user.avatar_url} label="Avatar" />
                          <ProfileBadge ok={!!(user.full_name && user.full_name.trim().length >= 2)} label="Tên" />
                          <ProfileBadge ok={isValidWallet(user.public_wallet_address)} label="Ví" />
                        </div>
                        <div className="flex gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                          <span>📝 {user.posts_count}</span>
                          <span>❤️ {user.reactions_on_posts}</span>
                          <span>💬 {user.comments_count}</span>
                          <span>🔄 {user.shares_count}</span>
                          <span>👥 {user.friends_count}</span>
                          {user.livestreams_count > 0 && <span>📺 {user.livestreams_count}</span>}
                        </div>
                      </div>

                      <div className="text-right min-w-[140px]">
                        <p className="text-lg font-bold text-yellow-600">
                          {formatNumber(user.claimable_amount)} CAMLY
                        </p>
                        <p className="text-xs text-muted-foreground">Total: {formatNumber(user.total_reward)}</p>
                        <p className="text-xs text-green-600">Claimed: {formatNumber(user.claimed_amount)}</p>
                      </div>

                      <div className="flex gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button
                                  size="sm"
                                  className="bg-green-500 hover:bg-green-600 text-white gap-1"
                                  onClick={() => handleApprove(user)}
                                  disabled={loading === user.id || !complete}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  Duyệt
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {!complete && (
                              <TooltipContent side="left" className="max-w-xs">
                                <p className="text-sm font-medium">Chưa đủ điều kiện:</p>
                                <ul className="text-xs list-disc pl-4">
                                  {missing.map(m => <li key={m}>{m}</li>)}
                                </ul>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="gap-1"
                          onClick={() => openRejectDialog(user)}
                          disabled={loading === user.id}
                        >
                          <XCircle className="w-4 h-4" />
                          Từ chối
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối thưởng</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Từ chối thưởng của <strong>{selectedUser?.username}</strong> ({formatNumber(selectedUser?.claimable_amount || 0)} CAMLY)
            </p>
            <Textarea
              placeholder="Nhập lý do từ chối..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Hủy</Button>
            <Button variant="destructive" onClick={handleReject} disabled={loading !== null}>Xác nhận từ chối</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RewardApprovalTab;
