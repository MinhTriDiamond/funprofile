import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Shield, BarChart3, Gift, Users, DollarSign, Sparkles, FileText, ShieldAlert, Settings, LogOut } from "lucide-react";
import { FacebookNavbar } from "@/components/layout/FacebookNavbar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { useAdminUsers, invalidateAdminData } from "@/hooks/useAdminUsers";

import OverviewTab from "@/components/admin/OverviewTab";
import PplpMintTab from "@/components/admin/PplpMintTab";
import FinanceDonationsTab from "@/components/admin/FinanceDonationsTab";
import RewardApprovalTab from "@/components/admin/RewardApprovalTab";
import UserManagementTab from "@/components/admin/UserManagementTab";
import FraudTab from "@/components/admin/FraudTab";
import PostModerationTab from "@/components/admin/PostModerationTab";
import SystemTab from "@/components/admin/SystemTab";

const Admin = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const { data: users = [], isLoading: usersLoading } = useAdminUsers();

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/feed"); return; }

      setCurrentUserId(session.user.id);

      const { data: hasRole, error } = await supabase.rpc('has_role', {
        _user_id: session.user.id,
        _role: 'admin'
      });

      if (error || !hasRole) {
        toast.error("Bạn không có quyền truy cập trang này");
        navigate("/feed");
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      console.error("Error checking admin status:", error);
      navigate("/feed");
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    totalUsers: users.filter(u => !u.is_banned).length,
    pendingRewards: users.filter(u => u.pending_reward > 0).length,
    approvedRewards: users.filter(u => u.approved_reward > 0).length,
    onChainClaims: 0,
    bannedUsers: users.filter(u => u.is_banned).length,
    suspiciousUsers: users.filter(u => !u.is_banned && (!u.avatar_url || !u.full_name)).length
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <FacebookNavbar />
      <main data-app-scroll className="fixed inset-x-0 top-[3cm] bottom-0 overflow-y-auto pb-20 lg:pb-0">
        <div className="max-w-7xl mx-auto px-[2cm] py-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl shadow-lg">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Ultimate Admin Dashboard</h1>
                <p className="text-muted-foreground">FUN Profile - Trái tim điều hành</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => navigate("/")} className="gap-2">
              <LogOut className="w-4 h-4" />
              Thoát
            </Button>
          </div>

          {/* 8 Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 h-auto">
              <TabsTrigger value="overview" className="gap-2 py-3">
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">📊 Tổng quan</span>
              </TabsTrigger>
              <TabsTrigger value="pplp" className="gap-2 py-3">
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">⚡ PPLP Mint</span>
              </TabsTrigger>
              <TabsTrigger value="finance" className="gap-2 py-3">
                <DollarSign className="w-4 h-4" />
                <span className="hidden sm:inline">💰 Tài chính</span>
              </TabsTrigger>
              <TabsTrigger value="rewards" className="gap-2 py-3">
                <Gift className="w-4 h-4" />
                <span className="hidden sm:inline">🏆 Duyệt thưởng</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-2 py-3">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">👥 Quản lý User</span>
              </TabsTrigger>
              <TabsTrigger value="fraud" className="gap-2 py-3">
                <ShieldAlert className="w-4 h-4" />
                <span className="hidden sm:inline">🛡️ Chống gian lận</span>
              </TabsTrigger>
              <TabsTrigger value="moderation" className="gap-2 py-3">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">📝 Duyệt bài</span>
              </TabsTrigger>
              <TabsTrigger value="system" className="gap-2 py-3">
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">⚙️ Hệ thống</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <OverviewTab stats={stats} onNavigate={setActiveTab} />
            </TabsContent>

            <TabsContent value="pplp">
              <PplpMintTab adminId={currentUserId!} />
            </TabsContent>

            <TabsContent value="finance">
              <FinanceDonationsTab />
            </TabsContent>

            <TabsContent value="rewards">
              <RewardApprovalTab adminId={currentUserId!} onRefresh={invalidateAdminData} />
            </TabsContent>

            <TabsContent value="users">
              <UserManagementTab users={users} adminId={currentUserId!} onRefresh={invalidateAdminData} />
            </TabsContent>

            <TabsContent value="fraud">
              <FraudTab users={users} adminId={currentUserId!} onRefresh={invalidateAdminData} />
            </TabsContent>

            <TabsContent value="moderation">
              <PostModerationTab />
            </TabsContent>

            <TabsContent value="system">
              <SystemTab adminId={currentUserId!} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <MobileBottomNav />
    </div>
  );
};

export default Admin;
