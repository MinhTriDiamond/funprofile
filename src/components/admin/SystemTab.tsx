import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link2, CloudUpload, GitMerge, RefreshCw, Database } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import BlockchainTab from "./BlockchainTab";
import MediaMigrationTab from "./MediaMigrationTab";
import { MergeRequestsTab } from "./MergeRequestsTab";

interface SystemTabProps {
  adminId: string;
}

const SystemTab = ({ adminId }: SystemTabProps) => {
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<any>(null);

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
            <div className="bg-muted rounded-lg p-4 text-sm space-y-1">
              <p>📊 Đã quét: <strong>{backfillResult.scanned}</strong> giao dịch</p>
              <p>🔍 Thiếu donation: <strong>{backfillResult.missing}</strong></p>
              <p>✅ Đã phục hồi: <strong>{backfillResult.inserted}</strong></p>
              <p>⏭️ Bỏ qua (không tìm được người nhận): <strong>{backfillResult.skipped}</strong></p>
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
