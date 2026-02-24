import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link2, CloudUpload, GitMerge, RefreshCw, Database, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import BlockchainTab from "./BlockchainTab";
import MediaMigrationTab from "./MediaMigrationTab";
import { MergeRequestsTab } from "./MergeRequestsTab";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SystemTabProps {
  adminId: string;
}

const SystemTab = ({ adminId }: SystemTabProps) => {
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<any>(null);
  const [deletingBanned, setDeletingBanned] = useState(false);
  const [deleteBannedResult, setDeleteBannedResult] = useState<any>(null);

  const handleBackfillDonations = async () => {
    setBackfilling(true);
    setBackfillResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("auto-backfill-donations");
      if (error) throw error;
      setBackfillResult(data);
      toast.success(`Backfill hoàn tất: ${data?.inserted || 0} giao dịch được phục hồi`);
    } catch (err: any) {
      console.error("Backfill error:", err);
      toast.error("Lỗi khi chạy backfill: " + (err.message || "Unknown"));
    } finally {
      setBackfilling(false);
    }
  };

  const handleDeleteBannedUsers = async () => {
    setDeletingBanned(true);
    setDeleteBannedResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("batch-delete-banned-users");
      if (error) throw error;
      setDeleteBannedResult(data);
      if (data?.deleted > 0) {
        toast.success(`Đã xoá ${data.deleted} tài khoản bị ban`);
      } else {
        toast.info(data?.message || "Không có user bị ban nào để xoá");
      }
    } catch (err: any) {
      console.error("Delete banned users error:", err);
      toast.error("Lỗi: " + (err.message || "Unknown"));
    } finally {
      setDeletingBanned(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Backfill Donations Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-orange-500" />
            Phục hồi giao dịch bị thiếu
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Quét tất cả giao dịch đã xác nhận và tạo bản ghi donations cho những giao dịch bị thiếu. 
            Hỗ trợ tìm người nhận qua cả wallet_address và public_wallet_address.
          </p>
          <Button 
            onClick={handleBackfillDonations} 
            disabled={backfilling}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${backfilling ? 'animate-spin' : ''}`} />
            {backfilling ? "Đang quét..." : "Chạy Backfill ngay"}
          </Button>
          {backfillResult && (
            <div className="bg-muted rounded-lg p-4 text-sm space-y-2">
              <p>📊 Đã quét: <strong>{backfillResult.scanned}</strong> giao dịch</p>
              <p>🔍 Thiếu donation: <strong>{backfillResult.missing}</strong></p>
              <p>✅ Đã phục hồi donation: <strong>{backfillResult.inserted}</strong></p>
              <p>🎉 Bài chúc mừng đã tạo: <strong>{backfillResult.posts_created ?? 0}</strong></p>
              <p>⏭️ Bỏ qua (không tìm được người nhận): <strong>{backfillResult.skipped}</strong></p>
              
              {backfillResult.posts_details && backfillResult.posts_details.length > 0 && (
                <div className="mt-3 border-t pt-3">
                  <p className="font-medium mb-2">📋 Chi tiết bài chúc mừng đã phục hồi:</p>
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {backfillResult.posts_details.map((d: any, i: number) => (
                      <p key={i} className="text-xs text-muted-foreground">
                        • <strong>@{d.sender}</strong> → <strong>@{d.recipient}</strong>: {d.amount} {d.token}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Banned Users Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-destructive" />
            Xoá tất cả user bị ban
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Xoá vĩnh viễn tất cả tài khoản đã bị cấm (is_banned = true). 
            Thao tác này không thể hoàn tác - tất cả dữ liệu liên quan sẽ bị xoá.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive"
                disabled={deletingBanned}
                className="gap-2"
              >
                <Trash2 className={`w-4 h-4 ${deletingBanned ? 'animate-spin' : ''}`} />
                {deletingBanned ? "Đang xoá..." : "Xoá tất cả user bị ban"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Xác nhận xoá tất cả user bị ban?</AlertDialogTitle>
                <AlertDialogDescription>
                  Thao tác này sẽ xoá vĩnh viễn tất cả tài khoản đã bị cấm cùng toàn bộ dữ liệu liên quan 
                  (bài viết, bình luận, tin nhắn, giao dịch, ví...). 
                  Không thể hoàn tác sau khi thực hiện.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Huỷ</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteBannedUsers} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Xoá tất cả
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {deleteBannedResult && (
            <div className="bg-muted rounded-lg p-4 text-sm space-y-1">
              <p>📊 Tổng user bị ban: <strong>{deleteBannedResult.total_banned}</strong></p>
              <p>✅ Đã xoá thành công: <strong>{deleteBannedResult.deleted}</strong></p>
              {deleteBannedResult.errors?.length > 0 && (
                <div>
                  <p className="text-destructive">❌ Lỗi: {deleteBannedResult.errors.length}</p>
                  {deleteBannedResult.errors.map((e: any, i: number) => (
                    <p key={i} className="text-xs text-muted-foreground ml-4">
                      • {e.username} ({e.userId.slice(0, 8)}...): {e.error}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="blockchain" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="blockchain" className="gap-2 py-2">
            <Link2 className="w-4 h-4" />
            <span className="hidden sm:inline">Blockchain</span>
          </TabsTrigger>
          <TabsTrigger value="migration" className="gap-2 py-2">
            <CloudUpload className="w-4 h-4" />
            <span className="hidden sm:inline">Migration</span>
          </TabsTrigger>
          <TabsTrigger value="merge" className="gap-2 py-2">
            <GitMerge className="w-4 h-4" />
            <span className="hidden sm:inline">Merge User</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="blockchain">
          <BlockchainTab adminId={adminId} />
        </TabsContent>
        <TabsContent value="migration">
          <MediaMigrationTab />
        </TabsContent>
        <TabsContent value="merge">
          <MergeRequestsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SystemTab;
