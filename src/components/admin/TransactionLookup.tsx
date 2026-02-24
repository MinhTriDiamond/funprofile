import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const TransactionLookup = () => {
  const [txHash, setTxHash] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSearch = async () => {
    if (!txHash.trim()) {
      toast.error("Vui lòng nhập TX Hash");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("check-transaction", {
        body: { tx_hash: txHash.trim() },
      });
      if (error) throw error;
      setResult(data);
    } catch (err: any) {
      toast.error("Lỗi: " + (err.message || "Unknown"));
    } finally {
      setLoading(false);
    }
  };

  const StatusIcon = ({ ok }: { ok: boolean }) =>
    ok ? (
      <CheckCircle2 className="w-5 h-5 text-green-500" />
    ) : (
      <XCircle className="w-5 h-5 text-destructive" />
    );

  const formatDate = (d: string) =>
    d ? new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5 text-blue-500" />
          Tra cứu giao dịch theo TX Hash
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Nhập TX Hash (0x...)"
            value={txHash}
            onChange={(e) => setTxHash(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="font-mono text-xs"
          />
          <Button onClick={handleSearch} disabled={loading} className="gap-2 shrink-0">
            <Search className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Đang tìm..." : "Tra cứu"}
          </Button>
        </div>

        {result && (
          <div className="space-y-3">
            {/* Status checklist */}
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <StatusIcon ok={result.in_transactions} />
                <span className="text-sm font-medium">
                  Transactions: {result.in_transactions ? "Có" : "Không tìm thấy"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <StatusIcon ok={result.in_donations} />
                <span className="text-sm font-medium">
                  Donations: {result.in_donations ? "Có" : "Không tìm thấy"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <StatusIcon ok={result.in_posts} />
                <span className="text-sm font-medium">
                  Bài chúc mừng: {result.in_posts ? "Có" : "Không tìm thấy"}
                </span>
              </div>
            </div>

            {/* Transaction details */}
            {result.transaction && (
              <div className="border rounded-lg p-3 space-y-1 text-sm">
                <p className="font-medium text-muted-foreground">📦 Transaction</p>
                <p>Người gửi: <strong>@{result.transaction.sender_profile?.username || "N/A"}</strong></p>
                <p>Địa chỉ đích: <code className="text-xs">{result.transaction.to_address}</code></p>
                {result.transaction.recipient_profile && (
                  <p>Người nhận (wallet match): <strong>@{result.transaction.recipient_profile.username}</strong></p>
                )}
                <p>Số tiền: <strong>{result.transaction.amount} {result.transaction.token_symbol}</strong></p>
                <p>Trạng thái: <strong>{result.transaction.status}</strong></p>
                <p>Thời gian: {formatDate(result.transaction.created_at)}</p>
              </div>
            )}

            {/* Donation details */}
            {result.donation && (
              <div className="border rounded-lg p-3 space-y-1 text-sm">
                <p className="font-medium text-muted-foreground">🎁 Donation</p>
                <p>Người gửi: <strong>@{result.donation.sender_profile?.username || "N/A"}</strong></p>
                <p>Người nhận: <strong>@{result.donation.recipient_profile?.username || "N/A"}</strong></p>
                <p>Số tiền: <strong>{result.donation.amount} {result.donation.token_symbol}</strong></p>
                <p>Trạng thái: <strong>{result.donation.status}</strong></p>
                <p>Thời gian: {formatDate(result.donation.created_at)}</p>
              </div>
            )}

            {/* Post details */}
            {result.post && (
              <div className="border rounded-lg p-3 space-y-1 text-sm">
                <p className="font-medium text-muted-foreground">📝 Bài chúc mừng</p>
                <p>{result.post.content}</p>
                <p>Post ID: <code className="text-xs">{result.post.id}</code></p>
                <p>Thời gian: {formatDate(result.post.created_at)}</p>
              </div>
            )}

            {/* Warning if missing */}
            {!result.in_transactions && !result.in_donations && !result.in_posts && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="w-4 h-4" />
                Không tìm thấy giao dịch này trong hệ thống
              </div>
            )}

            {result.in_transactions && (!result.in_donations || !result.in_posts) && (
              <div className="flex items-center gap-2 text-amber-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                Giao dịch tồn tại nhưng thiếu {!result.in_donations ? "donation" : ""}{!result.in_donations && !result.in_posts ? " và " : ""}{!result.in_posts ? "bài chúc mừng" : ""}. Sử dụng Backfill hoặc Thêm thủ công để phục hồi.
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TransactionLookup;
