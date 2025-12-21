import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle, Search, ArrowUpDown, Coins } from "lucide-react";

interface UserWithReward {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  pending_reward: number;
  approved_reward: number;
  reward_status: string;
  posts_count?: number;
  comments_count?: number;
  reactions_count?: number;
}

interface RewardApprovalTabProps {
  users: UserWithReward[];
  adminId: string;
  onRefresh: () => void;
}

const RewardApprovalTab = ({ users, adminId, onRefresh }: RewardApprovalTabProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"pending_desc" | "pending_asc">("pending_desc");
  const [loading, setLoading] = useState<string | null>(null);
  
  // Reject dialog
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithReward | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const pendingUsers = users.filter(u => u.pending_reward > 0);

  const filteredUsers = pendingUsers
    .filter(u => 
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.id.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => 
      sortBy === "pending_desc" 
        ? b.pending_reward - a.pending_reward 
        : a.pending_reward - b.pending_reward
    );

  const handleApprove = async (user: UserWithReward) => {
    setLoading(user.id);
    try {
      const { data, error } = await supabase.rpc('approve_user_reward', {
        p_user_id: user.id,
        p_admin_id: adminId,
        p_note: 'Đã duyệt thưởng'
      });

      if (error) throw error;
      
      toast.success(`Đã duyệt ${user.pending_reward.toLocaleString()} CAMLY cho ${user.username}`);
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
    if (!rejectReason.trim()) {
      toast.error("Vui lòng nhập lý do từ chối");
      return;
    }

    setLoading(selectedUser.id);
    try {
      const { error } = await supabase.rpc('reject_user_reward', {
        p_user_id: selectedUser.id,
        p_admin_id: adminId,
        p_note: rejectReason
      });

      if (error) throw error;
      
      toast.success(`Đã từ chối thưởng của ${selectedUser.username}`);
      setRejectDialogOpen(false);
      setSelectedUser(null);
      onRefresh();
    } catch (error: any) {
      console.error("Error rejecting reward:", error);
      toast.error(error.message || "Lỗi khi từ chối thưởng");
    } finally {
      setLoading(null);
    }
  };

  const formatNumber = (num: number) => num.toLocaleString('vi-VN');

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-yellow-500" />
            Duyệt thưởng ({filteredUsers.length} pending)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Sort */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Tìm theo username hoặc ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button 
              variant="outline"
              onClick={() => setSortBy(prev => prev === "pending_desc" ? "pending_asc" : "pending_desc")}
              className="gap-2"
            >
              <ArrowUpDown className="w-4 h-4" />
              {sortBy === "pending_desc" ? "Cao → Thấp" : "Thấp → Cao"}
            </Button>
          </div>

          {/* User List */}
          <div className="max-h-[500px] overflow-y-auto space-y-3">
            {filteredUsers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Không có user nào đang chờ duyệt thưởng
              </p>
            ) : (
              filteredUsers.map((user) => (
                <div 
                  key={user.id} 
                  className="flex items-center gap-4 p-4 bg-background border rounded-lg hover:shadow-sm transition-shadow"
                >
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={user.avatar_url || ""} />
                    <AvatarFallback>{user.username[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">{user.username}</p>
                      {!user.avatar_url && (
                        <Badge variant="outline" className="text-xs">No Avatar</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono truncate">{user.id}</p>
                    <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                      <span>Posts: {user.posts_count || 0}</span>
                      <span>Comments: {user.comments_count || 0}</span>
                      <span>Reactions: {user.reactions_count || 0}</span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-lg font-bold text-yellow-600">
                      {formatNumber(user.pending_reward)} CAMLY
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Đã duyệt: {formatNumber(user.approved_reward)}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-green-500 hover:bg-green-600 text-white gap-1"
                      onClick={() => handleApprove(user)}
                      disabled={loading === user.id}
                    >
                      <CheckCircle className="w-4 h-4" />
                      Duyệt
                    </Button>
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
              ))
            )}
          </div>
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
              Từ chối thưởng của <strong>{selectedUser?.username}</strong> ({formatNumber(selectedUser?.pending_reward || 0)} CAMLY)
            </p>
            <Textarea
              placeholder="Nhập lý do từ chối..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={loading !== null}>
              Xác nhận từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RewardApprovalTab;
