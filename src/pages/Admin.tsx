import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  Shield, 
  UserPlus, 
  Search, 
  Plus, 
  Minus, 
  RotateCcw, 
  Ban, 
  AlertTriangle,
  ClipboardList,
  Users,
  Coins,
  LogOut
} from "lucide-react";

interface AdminUser {
  user_id: string;
  username: string;
  avatar_url: string | null;
}

interface SearchedUser {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  is_banned: boolean;
  is_restricted: boolean;
}

interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  target_user_id: string | null;
  details: unknown;
  reason: string | null;
  created_at: string;
  admin_username?: string;
  target_username?: string;
}

interface RewardAdjustment {
  id: string;
  user_id: string;
  admin_id: string;
  amount: number;
  reason: string;
  created_at: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [adminList, setAdminList] = useState<AdminUser[]>([]);
  const [newAdminId, setNewAdminId] = useState("");
  const [searchUserId, setSearchUserId] = useState("");
  const [searchedUser, setSearchedUser] = useState<SearchedUser | null>(null);
  const [claimableAmount, setClaimableAmount] = useState<number>(0);
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [rewardAdjustments, setRewardAdjustments] = useState<RewardAdjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"add" | "remove" | "refund">("add");

  // Check admin status on mount
  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/");
        return;
      }

      setCurrentUserId(session.user.id);

      // Check if user has admin role using the has_role function
      const { data: hasRole, error } = await supabase.rpc('has_role', {
        _user_id: session.user.id,
        _role: 'admin'
      });

      if (error || !hasRole) {
        toast.error("Bạn không có quyền truy cập trang này");
        navigate("/");
        return;
      }

      setIsAdmin(true);
      loadAdminList();
      loadAuditLogs();
    } catch (error) {
      console.error("Error checking admin status:", error);
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const loadAdminList = async () => {
    try {
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (error) throw error;

      if (roles && roles.length > 0) {
        const userIds = roles.map(r => r.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIds);

        if (profiles) {
          setAdminList(profiles.map(p => ({
            user_id: p.id,
            username: p.username,
            avatar_url: p.avatar_url
          })));
        }
      }
    } catch (error) {
      console.error("Error loading admin list:", error);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const { data: logs, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      if (logs) {
        // Fetch usernames for admin and target users
        const adminIds = [...new Set(logs.map(l => l.admin_id))];
        const targetIds = [...new Set(logs.filter(l => l.target_user_id).map(l => l.target_user_id))];
        const allIds = [...new Set([...adminIds, ...targetIds])];

        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', allIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p.username]) || []);

        setAuditLogs(logs.map(log => ({
          ...log,
          admin_username: profileMap.get(log.admin_id) || 'Unknown',
          target_username: log.target_user_id ? profileMap.get(log.target_user_id) || 'Unknown' : undefined
        })));
      }
    } catch (error) {
      console.error("Error loading audit logs:", error);
    }
  };

  const addAdmin = async () => {
    if (!newAdminId.trim()) {
      toast.error("Vui lòng nhập User ID");
      return;
    }

    try {
      // Check if user exists
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('id', newAdminId.trim())
        .single();

      if (profileError || !profile) {
        toast.error("Không tìm thấy user với ID này");
        return;
      }

      // Add admin role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: newAdminId.trim(), role: 'admin' });

      if (roleError) {
        if (roleError.code === '23505') {
          toast.error("User này đã là Admin");
        } else {
          throw roleError;
        }
        return;
      }

      // Log action
      await logAction('ADD_ADMIN', newAdminId.trim(), null, `Added admin role to ${profile.username}`);

      toast.success(`Đã thêm ${profile.username} làm Admin`);
      setNewAdminId("");
      loadAdminList();
      loadAuditLogs();
    } catch (error) {
      console.error("Error adding admin:", error);
      toast.error("Lỗi khi thêm Admin");
    }
  };

  const searchUser = async () => {
    if (!searchUserId.trim()) {
      toast.error("Vui lòng nhập User ID");
      return;
    }

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, is_banned, is_restricted')
        .eq('id', searchUserId.trim())
        .single();

      if (error || !profile) {
        toast.error("Không tìm thấy user với ID này");
        setSearchedUser(null);
        return;
      }

      setSearchedUser(profile);
      await calculateClaimable(profile.id);
      await loadUserAdjustments(profile.id);
    } catch (error) {
      console.error("Error searching user:", error);
      toast.error("Lỗi khi tìm kiếm user");
    }
  };

  const calculateClaimable = async (userId: string) => {
    try {
      // Calculate total reward using same formula
      const { data: postsData } = await supabase
        .from('posts')
        .select('id')
        .eq('user_id', userId);
      
      const postsCount = postsData?.length || 0;
      const postIds = postsData?.map(p => p.id) || [];
      
      let reactionsOnPosts = 0;
      let commentsOnPosts = 0;
      let sharesCount = 0;
      
      if (postIds.length > 0) {
        const [reactionsRes, commentsRes, sharesRes] = await Promise.all([
          supabase.from('reactions').select('id', { count: 'exact', head: true }).in('post_id', postIds),
          supabase.from('comments').select('id', { count: 'exact', head: true }).in('post_id', postIds),
          supabase.from('shared_posts').select('id', { count: 'exact', head: true }).in('original_post_id', postIds)
        ]);
        reactionsOnPosts = reactionsRes.count || 0;
        commentsOnPosts = commentsRes.count || 0;
        sharesCount = sharesRes.count || 0;
      }
      
      const { count: friendsCount } = await supabase
        .from('friendships')
        .select('id', { count: 'exact', head: true })
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
        .eq('status', 'accepted');

      // Calculate rewards
      const postsReward = postsCount * 20000;
      let reactionsReward = 0;
      if (reactionsOnPosts >= 3) {
        reactionsReward = 30000 + (reactionsOnPosts - 3) * 1000;
      }
      const commentsReward = commentsOnPosts * 5000;
      const sharesReward = sharesCount * 5000;
      const friendsReward = (friendsCount || 0) * 10000 + 10000;

      const totalReward = postsReward + reactionsReward + commentsReward + sharesReward + friendsReward;

      // Get claimed amount
      const { data: claims } = await supabase
        .from('reward_claims')
        .select('amount')
        .eq('user_id', userId);
      
      const claimedAmount = claims?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;

      // Get manual adjustments
      const { data: adjustments } = await supabase
        .from('reward_adjustments')
        .select('amount')
        .eq('user_id', userId);
      
      const adjustmentTotal = adjustments?.reduce((sum, a) => sum + Number(a.amount), 0) || 0;

      const claimable = Math.max(0, totalReward - claimedAmount + adjustmentTotal);
      setClaimableAmount(claimable);
    } catch (error) {
      console.error("Error calculating claimable:", error);
    }
  };

  const loadUserAdjustments = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('reward_adjustments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setRewardAdjustments(data);
      }
    } catch (error) {
      console.error("Error loading adjustments:", error);
    }
  };

  const logAction = async (action: string, targetUserId: string | null, details: Record<string, unknown> | null, reason: string | null) => {
    if (!currentUserId) return;
    
    try {
      await supabase.from('audit_logs').insert([{
        admin_id: currentUserId,
        action,
        target_user_id: targetUserId || undefined,
        details: details ? (details as Json) : undefined,
        reason: reason || undefined
      }]);
    } catch (error) {
      console.error("Error logging action:", error);
    }
  };

  const handleRewardAction = async () => {
    if (!searchedUser || !adjustmentAmount || !adjustmentReason.trim()) {
      toast.error("Vui lòng điền đầy đủ thông tin");
      return;
    }

    const amount = parseInt(adjustmentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Số tiền không hợp lệ");
      return;
    }

    try {
      const finalAmount = actionType === "remove" ? -amount : amount;
      
      // Insert adjustment
      const { error: adjustError } = await supabase
        .from('reward_adjustments')
        .insert({
          user_id: searchedUser.id,
          admin_id: currentUserId,
          amount: finalAmount,
          reason: adjustmentReason
        });

      if (adjustError) throw adjustError;

      // Log action
      const actionName = actionType === "add" ? "ADD_REWARD" : actionType === "remove" ? "REMOVE_REWARD" : "REFUND_REWARD";
      await logAction(actionName, searchedUser.id, { amount: finalAmount }, adjustmentReason);

      toast.success(`Đã ${actionType === "add" ? "thêm" : actionType === "remove" ? "trừ" : "hoàn"} ${amount.toLocaleString()} CAMLY`);
      
      setAdjustmentAmount("");
      setAdjustmentReason("");
      setActionDialogOpen(false);
      
      // Refresh data
      await calculateClaimable(searchedUser.id);
      await loadUserAdjustments(searchedUser.id);
      loadAuditLogs();
    } catch (error) {
      console.error("Error adjusting reward:", error);
      toast.error("Lỗi khi điều chỉnh thưởng");
    }
  };

  const handleBanUser = async (ban: boolean) => {
    if (!searchedUser) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_banned: ban })
        .eq('id', searchedUser.id);

      if (error) throw error;

      await logAction(ban ? 'BAN_USER' : 'UNBAN_USER', searchedUser.id, null, ban ? 'User banned by admin' : 'User unbanned by admin');

      toast.success(ban ? "Đã cấm user" : "Đã bỏ cấm user");
      setSearchedUser({ ...searchedUser, is_banned: ban });
      loadAuditLogs();
    } catch (error) {
      console.error("Error banning user:", error);
      toast.error("Lỗi khi thay đổi trạng thái user");
    }
  };

  const handleRestrictUser = async (restrict: boolean) => {
    if (!searchedUser) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_restricted: restrict })
        .eq('id', searchedUser.id);

      if (error) throw error;

      await logAction(restrict ? 'RESTRICT_USER' : 'UNRESTRICT_USER', searchedUser.id, null, restrict ? 'User restricted by admin' : 'User unrestricted by admin');

      toast.success(restrict ? "Đã hạn chế user" : "Đã bỏ hạn chế user");
      setSearchedUser({ ...searchedUser, is_restricted: restrict });
      loadAuditLogs();
    } catch (error) {
      console.error("Error restricting user:", error);
      toast.error("Lỗi khi thay đổi trạng thái user");
    }
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('vi-VN');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f0f2f5] p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-muted-foreground">FUN Profile Management</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate("/")} className="gap-2">
            <LogOut className="w-4 h-4" />
            Thoát
          </Button>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Quản lý User</span>
            </TabsTrigger>
            <TabsTrigger value="rewards" className="gap-2">
              <Coins className="w-4 h-4" />
              <span className="hidden sm:inline">Phần thưởng</span>
            </TabsTrigger>
            <TabsTrigger value="admins" className="gap-2">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Quản trị viên</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2">
              <ClipboardList className="w-4 h-4" />
              <span className="hidden sm:inline">Audit Log</span>
            </TabsTrigger>
          </TabsList>

          {/* User Management Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  Tìm kiếm User
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Nhập User ID..."
                    value={searchUserId}
                    onChange={(e) => setSearchUserId(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={searchUser} className="gap-2">
                    <Search className="w-4 h-4" />
                    Tìm
                  </Button>
                </div>

                {searchedUser && (
                  <div className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="w-16 h-16">
                        <AvatarImage src={searchedUser.avatar_url || ""} />
                        <AvatarFallback>{searchedUser.username[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold">{searchedUser.username}</h3>
                        <p className="text-muted-foreground">{searchedUser.full_name || "No name"}</p>
                        <p className="text-xs text-muted-foreground font-mono">{searchedUser.id}</p>
                        <div className="flex gap-2 mt-2">
                          {searchedUser.is_banned && (
                            <Badge variant="destructive">Đã cấm</Badge>
                          )}
                          {searchedUser.is_restricted && (
                            <Badge variant="secondary" className="bg-yellow-500 text-white">Hạn chế</Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-primary/10 rounded-lg p-4">
                        <p className="text-sm text-muted-foreground">Claimable</p>
                        <p className="text-2xl font-bold text-primary">{formatNumber(claimableAmount)} CAMLY</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant={searchedUser.is_banned ? "outline" : "destructive"}
                        onClick={() => handleBanUser(!searchedUser.is_banned)}
                        className="gap-2"
                      >
                        <Ban className="w-4 h-4" />
                        {searchedUser.is_banned ? "Bỏ cấm" : "Cấm User"}
                      </Button>
                      <Button
                        variant={searchedUser.is_restricted ? "outline" : "secondary"}
                        onClick={() => handleRestrictUser(!searchedUser.is_restricted)}
                        className="gap-2"
                      >
                        <AlertTriangle className="w-4 h-4" />
                        {searchedUser.is_restricted ? "Bỏ hạn chế" : "Hạn chế"}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rewards Tab */}
          <TabsContent value="rewards" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="w-5 h-5" />
                  Quản lý Phần thưởng
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!searchedUser ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Vui lòng tìm kiếm user trong tab "Quản lý User" trước</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                      <Avatar>
                        <AvatarImage src={searchedUser.avatar_url || ""} />
                        <AvatarFallback>{searchedUser.username[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-semibold">{searchedUser.username}</p>
                        <p className="text-sm text-muted-foreground">Claimable: {formatNumber(claimableAmount)} CAMLY</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Dialog open={actionDialogOpen && actionType === "add"} onOpenChange={(open) => { setActionDialogOpen(open); if (open) setActionType("add"); }}>
                        <DialogTrigger asChild>
                          <Button className="gap-2 bg-green-600 hover:bg-green-700">
                            <Plus className="w-4 h-4" />
                            Thêm thưởng
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Thêm thưởng cho {searchedUser.username}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div>
                              <label className="text-sm font-medium">Số CAMLY</label>
                              <Input
                                type="number"
                                placeholder="Nhập số tiền..."
                                value={adjustmentAmount}
                                onChange={(e) => setAdjustmentAmount(e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Lý do (bắt buộc)</label>
                              <Textarea
                                placeholder="Nhập lý do thêm thưởng..."
                                value={adjustmentReason}
                                onChange={(e) => setAdjustmentReason(e.target.value)}
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>Hủy</Button>
                            <Button onClick={handleRewardAction} className="bg-green-600 hover:bg-green-700">Xác nhận</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      <Dialog open={actionDialogOpen && actionType === "remove"} onOpenChange={(open) => { setActionDialogOpen(open); if (open) setActionType("remove"); }}>
                        <DialogTrigger asChild>
                          <Button variant="destructive" className="gap-2">
                            <Minus className="w-4 h-4" />
                            Trừ thưởng
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Trừ thưởng của {searchedUser.username}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div>
                              <label className="text-sm font-medium">Số CAMLY</label>
                              <Input
                                type="number"
                                placeholder="Nhập số tiền..."
                                value={adjustmentAmount}
                                onChange={(e) => setAdjustmentAmount(e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Lý do (bắt buộc)</label>
                              <Textarea
                                placeholder="Nhập lý do trừ thưởng..."
                                value={adjustmentReason}
                                onChange={(e) => setAdjustmentReason(e.target.value)}
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>Hủy</Button>
                            <Button variant="destructive" onClick={handleRewardAction}>Xác nhận</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      <Dialog open={actionDialogOpen && actionType === "refund"} onOpenChange={(open) => { setActionDialogOpen(open); if (open) setActionType("refund"); }}>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="gap-2">
                            <RotateCcw className="w-4 h-4" />
                            Hoàn tiền
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Hoàn tiền cho {searchedUser.username}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div>
                              <label className="text-sm font-medium">Số CAMLY</label>
                              <Input
                                type="number"
                                placeholder="Nhập số tiền hoàn..."
                                value={adjustmentAmount}
                                onChange={(e) => setAdjustmentAmount(e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Lý do (bắt buộc)</label>
                              <Textarea
                                placeholder="Nhập lý do hoàn tiền (VD: Giao dịch thất bại)..."
                                value={adjustmentReason}
                                onChange={(e) => setAdjustmentReason(e.target.value)}
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>Hủy</Button>
                            <Button onClick={handleRewardAction}>Xác nhận hoàn tiền</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>

                    {/* Adjustment History */}
                    {rewardAdjustments.length > 0 && (
                      <div className="mt-6">
                        <h4 className="font-semibold mb-3">Lịch sử điều chỉnh</h4>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {rewardAdjustments.map((adj) => (
                            <div key={adj.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                              <div>
                                <p className={`font-semibold ${adj.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {adj.amount > 0 ? '+' : ''}{formatNumber(adj.amount)} CAMLY
                                </p>
                                <p className="text-sm text-muted-foreground">{adj.reason}</p>
                              </div>
                              <p className="text-xs text-muted-foreground">{formatDate(adj.created_at)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Admin Management Tab */}
          <TabsContent value="admins" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Thêm Quản trị viên
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Nhập User ID..."
                    value={newAdminId}
                    onChange={(e) => setNewAdminId(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={addAdmin} className="gap-2">
                    <UserPlus className="w-4 h-4" />
                    Thêm Admin
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Danh sách Quản trị viên ({adminList.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {adminList.map((admin) => (
                    <div key={admin.user_id} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <Avatar>
                        <AvatarImage src={admin.avatar_url || ""} />
                        <AvatarFallback>{admin.username[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-semibold">{admin.username}</p>
                        <p className="text-xs text-muted-foreground font-mono">{admin.user_id}</p>
                      </div>
                      <Badge>Admin</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Log Tab */}
          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5" />
                  Nhật ký Kiểm toán
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {auditLogs.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">Chưa có nhật ký nào</p>
                  ) : (
                    auditLogs.map((log) => (
                      <div key={log.id} className="p-3 border rounded-lg space-y-1">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">{log.action}</Badge>
                          <span className="text-xs text-muted-foreground">{formatDate(log.created_at)}</span>
                        </div>
                        <p className="text-sm">
                          <span className="font-medium">{log.admin_username}</span>
                          {log.target_username && (
                            <span> → <span className="font-medium">{log.target_username}</span></span>
                          )}
                        </p>
                        {log.reason && (
                          <p className="text-sm text-muted-foreground">{log.reason}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
