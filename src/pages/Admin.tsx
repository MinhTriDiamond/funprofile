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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
  LogOut,
  CheckCircle,
  Clock,
  XCircle,
  Settings,
  UserCheck,
  UserX,
  ShieldOff
} from "lucide-react";

interface AdminUser {
  user_id: string;
  username: string;
  avatar_url: string | null;
}

interface UserProfile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  is_banned: boolean;
  is_restricted: boolean;
}

interface UserWithReward extends UserProfile {
  claimable: number;
  status?: 'pending' | 'approved' | 'on_hold' | 'rejected';
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
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  // User list states
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [usersWithRewards, setUsersWithRewards] = useState<UserWithReward[]>([]);
  const [userSubTab, setUserSubTab] = useState<"all" | "active" | "banned" | "restricted">("all");
  
  // Action dialog states
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"add" | "deduct" | "refund">("add");
  const [selectedUser, setSelectedUser] = useState<UserWithReward | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");

  // Stats
  const activeUsers = allUsers.filter(u => !u.is_banned && !u.is_restricted);
  const bannedUsers = allUsers.filter(u => u.is_banned);
  const restrictedUsers = allUsers.filter(u => u.is_restricted && !u.is_banned);

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
      await Promise.all([
        loadAdminList(),
        loadAuditLogs(),
        loadAllUsers()
      ]);
    } catch (error) {
      console.error("Error checking admin status:", error);
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const loadAllUsers = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, is_banned, is_restricted')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (profiles) {
        setAllUsers(profiles);
        await loadUsersWithRewards(profiles);
      }
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const loadUsersWithRewards = async (profiles: UserProfile[]) => {
    // Initialize with 0 claimable - will calculate on demand
    const usersData: UserWithReward[] = profiles.slice(0, 50).map(profile => ({
      ...profile,
      claimable: 0,
      status: 'pending' as const
    }));
    setUsersWithRewards(usersData);
    
    // Calculate rewards in background (batch)
    try {
      const { data: rewardsData } = await supabase.rpc('get_user_rewards', { limit_count: 50 });
      if (rewardsData) {
        const rewardsMap = new Map(rewardsData.map((r: { id: string; total_reward: number }) => [r.id, r.total_reward]));
        setUsersWithRewards(prev => prev.map(user => ({
          ...user,
          claimable: (rewardsMap.get(user.id) as number) || 0
        })));
      }
    } catch (error) {
      console.error("Error loading rewards:", error);
    }
  };

  const calculateUserClaimable = async (userId: string): Promise<number> => {
    try {
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

      const postsReward = postsCount * 20000;
      let reactionsReward = 0;
      if (reactionsOnPosts >= 3) {
        reactionsReward = 30000 + (reactionsOnPosts - 3) * 1000;
      }
      const commentsReward = commentsOnPosts * 5000;
      const sharesReward = sharesCount * 5000;
      const friendsReward = (friendsCount || 0) * 10000 + 10000;

      const totalReward = postsReward + reactionsReward + commentsReward + sharesReward + friendsReward;

      const { data: claims } = await supabase
        .from('reward_claims')
        .select('amount')
        .eq('user_id', userId);
      
      const claimedAmount = claims?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;

      const { data: adjustments } = await supabase
        .from('reward_adjustments')
        .select('amount')
        .eq('user_id', userId);
      
      const adjustmentTotal = adjustments?.reduce((sum, a) => sum + Number(a.amount), 0) || 0;

      return Math.max(0, totalReward - claimedAmount + adjustmentTotal);
    } catch (error) {
      console.error("Error calculating claimable:", error);
      return 0;
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
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('id', newAdminId.trim())
        .single();

      if (profileError || !profile) {
        toast.error("Không tìm thấy user với ID này");
        return;
      }

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

  const removeAdmin = async (userId: string, username: string) => {
    if (userId === currentUserId) {
      toast.error("Không thể xóa quyền Admin của chính mình");
      return;
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'admin');

      if (error) throw error;

      await logAction('REMOVE_ADMIN', userId, null, `Removed admin role from ${username}`);

      toast.success(`Đã xóa quyền Admin của ${username}`);
      loadAdminList();
      loadAuditLogs();
    } catch (error) {
      console.error("Error removing admin:", error);
      toast.error("Lỗi khi xóa Admin");
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

  const handleBanUser = async (user: UserProfile, ban: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_banned: ban, is_restricted: ban ? false : user.is_restricted })
        .eq('id', user.id);

      if (error) throw error;

      await logAction(ban ? 'BAN_USER' : 'UNBAN_USER', user.id, null, ban ? 'User banned by admin' : 'User unbanned by admin');

      toast.success(ban ? `Đã cấm ${user.username}` : `Đã bỏ cấm ${user.username}`);
      await loadAllUsers();
      loadAuditLogs();
    } catch (error) {
      console.error("Error banning user:", error);
      toast.error("Lỗi khi thay đổi trạng thái user");
    }
  };

  const handleRestrictUser = async (user: UserProfile, restrict: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_restricted: restrict })
        .eq('id', user.id);

      if (error) throw error;

      await logAction(restrict ? 'RESTRICT_USER' : 'UNRESTRICT_USER', user.id, null, restrict ? 'User restricted by admin' : 'User unrestricted by admin');

      toast.success(restrict ? `Đã hạn chế ${user.username}` : `Đã bỏ hạn chế ${user.username}`);
      await loadAllUsers();
      loadAuditLogs();
    } catch (error) {
      console.error("Error restricting user:", error);
      toast.error("Lỗi khi thay đổi trạng thái user");
    }
  };

  const handleRewardAction = async () => {
    if (!selectedUser || !adjustmentAmount || !adjustmentReason.trim()) {
      toast.error("Vui lòng điền đầy đủ thông tin");
      return;
    }

    const amount = parseInt(adjustmentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Số tiền không hợp lệ");
      return;
    }

    try {
      const finalAmount = actionType === "deduct" ? -amount : amount;
      
      const { error: adjustError } = await supabase
        .from('reward_adjustments')
        .insert({
          user_id: selectedUser.id,
          admin_id: currentUserId,
          amount: finalAmount,
          reason: adjustmentReason
        });

      if (adjustError) throw adjustError;

      const actionName = actionType === "add" ? "ADD_REWARD" : actionType === "deduct" ? "DEDUCT_REWARD" : "REFUND_REWARD";
      await logAction(actionName, selectedUser.id, { amount: finalAmount }, adjustmentReason);

      toast.success(`Đã ${actionType === "add" ? "thêm" : actionType === "deduct" ? "trừ" : "hoàn"} ${amount.toLocaleString()} CAMLY`);
      
      setAdjustmentAmount("");
      setAdjustmentReason("");
      setActionDialogOpen(false);
      setSelectedUser(null);
      
      await loadAllUsers();
      loadAuditLogs();
    } catch (error) {
      console.error("Error adjusting reward:", error);
      toast.error("Lỗi khi điều chỉnh thưởng");
    }
  };

  const handleRewardStatusChange = async (user: UserWithReward, newStatus: 'approved' | 'on_hold' | 'rejected') => {
    const actionMap = {
      approved: 'APPROVE_REWARD',
      on_hold: 'HOLD_REWARD',
      rejected: 'REJECT_REWARD'
    };

    await logAction(actionMap[newStatus], user.id, { claimable: user.claimable }, `Changed reward status to ${newStatus}`);
    
    setUsersWithRewards(prev => prev.map(u => 
      u.id === user.id ? { ...u, status: newStatus } : u
    ));

    toast.success(`Đã ${newStatus === 'approved' ? 'duyệt' : newStatus === 'on_hold' ? 'treo' : 'từ chối'} thưởng của ${user.username}`);
    loadAuditLogs();
  };

  const openAdjustDialog = (user: UserWithReward, type: "add" | "deduct" | "refund") => {
    setSelectedUser(user);
    setActionType(type);
    setAdjustmentAmount("");
    setAdjustmentReason("");
    setActionDialogOpen(true);
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('vi-VN');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN');
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500">Đã duyệt</Badge>;
      case 'on_hold':
        return <Badge className="bg-yellow-500">Đang treo</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500">Từ chối</Badge>;
      default:
        return <Badge variant="outline">Chờ duyệt</Badge>;
    }
  };

  const getUserStatusBadge = (user: UserProfile) => {
    if (user.is_banned) return <Badge className="bg-red-500 text-white">Đã cấm</Badge>;
    if (user.is_restricted) return <Badge className="bg-yellow-500 text-white">Hạn chế</Badge>;
    return <Badge className="bg-green-500 text-white">Hoạt động</Badge>;
  };

  const getFilteredUsers = () => {
    switch (userSubTab) {
      case "active":
        return activeUsers;
      case "banned":
        return bannedUsers;
      case "restricted":
        return restrictedUsers;
      default:
        return allUsers;
    }
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
              <CardContent>
                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder="Nhập User ID..."
                    value={searchUserId}
                    onChange={(e) => setSearchUserId(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={() => {
                    const found = allUsers.find(u => u.id === searchUserId.trim());
                    if (found) {
                      setUserSubTab("all");
                      toast.success(`Đã tìm thấy: ${found.username}`);
                    } else {
                      toast.error("Không tìm thấy user");
                    }
                  }} className="gap-2">
                    <Search className="w-4 h-4" />
                    Tìm
                  </Button>
                </div>

                {/* User Sub-Tabs */}
                <Tabs value={userSubTab} onValueChange={(v) => setUserSubTab(v as typeof userSubTab)} className="w-full">
                  <TabsList className="grid w-full grid-cols-4 mb-4">
                    <TabsTrigger value="all" className="text-xs sm:text-sm">
                      Tổng ({allUsers.length})
                    </TabsTrigger>
                    <TabsTrigger value="active" className="text-xs sm:text-sm text-green-600">
                      Hoạt động ({activeUsers.length})
                    </TabsTrigger>
                    <TabsTrigger value="banned" className="text-xs sm:text-sm text-red-600">
                      Đã cấm ({bannedUsers.length})
                    </TabsTrigger>
                    <TabsTrigger value="restricted" className="text-xs sm:text-sm text-yellow-600">
                      Hạn chế ({restrictedUsers.length})
                    </TabsTrigger>
                  </TabsList>

                  <div className="max-h-[500px] overflow-y-auto space-y-2">
                    {getFilteredUsers().map((user) => (
                      <div key={user.id} className="flex items-center gap-3 p-3 bg-background border rounded-lg hover:shadow-sm transition-shadow">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={user.avatar_url || ""} />
                          <AvatarFallback>{user.username[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{user.username}</p>
                          <p className="text-xs text-muted-foreground font-mono truncate">{user.id}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getUserStatusBadge(user)}
                          
                          {/* Contextual Actions */}
                          {userSubTab === "active" && (
                            <>
                              <Button 
                                size="sm" 
                                className="bg-red-500 hover:bg-red-600 text-white"
                                onClick={() => handleBanUser(user, true)}
                              >
                                <Ban className="w-3 h-3 mr-1" />
                                Cấm
                              </Button>
                              <Button 
                                size="sm" 
                                className="bg-yellow-500 hover:bg-yellow-600 text-white"
                                onClick={() => handleRestrictUser(user, true)}
                              >
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Hạn chế
                              </Button>
                            </>
                          )}
                          
                          {userSubTab === "restricted" && (
                            <>
                              <Button 
                                size="sm" 
                                className="bg-green-500 hover:bg-green-600 text-white"
                                onClick={() => handleRestrictUser(user, false)}
                              >
                                <UserCheck className="w-3 h-3 mr-1" />
                                Bỏ hạn chế
                              </Button>
                              <Button 
                                size="sm" 
                                className="bg-red-500 hover:bg-red-600 text-white"
                                onClick={() => handleBanUser(user, true)}
                              >
                                <Ban className="w-3 h-3 mr-1" />
                                Cấm
                              </Button>
                            </>
                          )}
                          
                          {userSubTab === "banned" && (
                            <>
                              <Button 
                                size="sm" 
                                className="bg-green-500 hover:bg-green-600 text-white"
                                onClick={() => handleBanUser(user, false)}
                              >
                                <UserCheck className="w-3 h-3 mr-1" />
                                Bỏ cấm
                              </Button>
                              <Button 
                                size="sm" 
                                className="bg-yellow-500 hover:bg-yellow-600 text-white"
                                onClick={async () => {
                                  await handleBanUser(user, false);
                                  await handleRestrictUser(user, true);
                                }}
                              >
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Chuyển hạn chế
                              </Button>
                            </>
                          )}

                          {userSubTab === "all" && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="outline">
                                  <Settings className="w-3 h-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-background border">
                                {!user.is_banned && !user.is_restricted && (
                                  <>
                                    <DropdownMenuItem onClick={() => handleBanUser(user, true)} className="text-red-600">
                                      <Ban className="w-4 h-4 mr-2" />
                                      Cấm user
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleRestrictUser(user, true)} className="text-yellow-600">
                                      <AlertTriangle className="w-4 h-4 mr-2" />
                                      Hạn chế user
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {user.is_banned && (
                                  <>
                                    <DropdownMenuItem onClick={() => handleBanUser(user, false)} className="text-green-600">
                                      <UserCheck className="w-4 h-4 mr-2" />
                                      Bỏ cấm
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={async () => {
                                      await handleBanUser(user, false);
                                      await handleRestrictUser(user, true);
                                    }} className="text-yellow-600">
                                      <AlertTriangle className="w-4 h-4 mr-2" />
                                      Chuyển thành hạn chế
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {user.is_restricted && !user.is_banned && (
                                  <>
                                    <DropdownMenuItem onClick={() => handleRestrictUser(user, false)} className="text-green-600">
                                      <UserCheck className="w-4 h-4 mr-2" />
                                      Bỏ hạn chế
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleBanUser(user, true)} className="text-red-600">
                                      <Ban className="w-4 h-4 mr-2" />
                                      Cấm user
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Tabs>
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
              <CardContent>
                <div className="max-h-[600px] overflow-y-auto space-y-2">
                  {usersWithRewards.map((user) => (
                    <div key={user.id} className="flex items-center gap-3 p-4 bg-background border rounded-lg hover:shadow-sm transition-shadow">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={user.avatar_url || ""} />
                        <AvatarFallback>{user.username[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{user.username}</p>
                        <p className="text-sm text-primary font-medium">
                          Claimable: {formatNumber(user.claimable)} CAMLY
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        {getStatusBadge(user.status)}
                        
                        {/* Action Buttons */}
                        <Button 
                          size="sm" 
                          className="bg-green-500 hover:bg-green-600 text-white"
                          onClick={() => handleRewardStatusChange(user, 'approved')}
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Duyệt
                        </Button>
                        <Button 
                          size="sm" 
                          className="bg-yellow-500 hover:bg-yellow-600 text-white"
                          onClick={() => handleRewardStatusChange(user, 'on_hold')}
                        >
                          <Clock className="w-3 h-3 mr-1" />
                          Treo
                        </Button>
                        <Button 
                          size="sm" 
                          className="bg-red-500 hover:bg-red-600 text-white"
                          onClick={() => handleRewardStatusChange(user, 'rejected')}
                        >
                          <XCircle className="w-3 h-3 mr-1" />
                          Từ chối
                        </Button>
                        
                        {/* Adjust Menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
                              <Settings className="w-3 h-3 mr-1" />
                              Điều chỉnh
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-background border">
                            <DropdownMenuItem onClick={() => openAdjustDialog(user, "add")} className="text-green-600">
                              <Plus className="w-4 h-4 mr-2" />
                              Thêm thưởng
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openAdjustDialog(user, "deduct")} className="text-red-600">
                              <Minus className="w-4 h-4 mr-2" />
                              Trừ thưởng
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openAdjustDialog(user, "refund")} className="text-blue-600">
                              <RotateCcw className="w-4 h-4 mr-2" />
                              Hoàn tiền
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
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
                  <Button onClick={addAdmin} className="gap-2 bg-green-500 hover:bg-green-600">
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
                      <Badge className="bg-primary">Admin</Badge>
                      {admin.user_id !== currentUserId && (
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => removeAdmin(admin.user_id, admin.username)}
                        >
                          <ShieldOff className="w-3 h-3 mr-1" />
                          Xóa
                        </Button>
                      )}
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

      {/* Adjustment Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "add" ? "Thêm thưởng" : actionType === "deduct" ? "Trừ thưởng" : "Hoàn tiền"} 
              {selectedUser && ` cho ${selectedUser.username}`}
            </DialogTitle>
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
              <label className="text-sm font-medium">Lý do (bắt buộc) *</label>
              <Textarea
                placeholder={`Nhập lý do ${actionType === "add" ? "thêm" : actionType === "deduct" ? "trừ" : "hoàn"} thưởng...`}
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>Hủy</Button>
            <Button 
              onClick={handleRewardAction}
              className={
                actionType === "add" ? "bg-green-500 hover:bg-green-600" : 
                actionType === "deduct" ? "bg-red-500 hover:bg-red-600" : 
                "bg-blue-500 hover:bg-blue-600"
              }
            >
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
