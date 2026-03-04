import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Radio, CheckCircle, XCircle, Clock, Users, Film } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LivestreamStats {
  total_sessions: number;
  active_sessions: number;
  ended_sessions: number;
  total_recordings: number;
  done_recordings: number;
  failed_recordings: number;
  stuck_recordings: number;
  assembling_recordings: number;
  avg_duration_minutes: number;
  success_rate: number;
  total_chunks: number;
  total_chunks_uploaded: number;
}

const LivestreamHealthTab = () => {
  const [stats, setStats] = useState<LivestreamStats | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_livestream_stats');
      if (error) throw error;
      setStats(data as unknown as LivestreamStats);
    } catch (err: any) {
      console.error("Error fetching livestream stats:", err);
      toast.error("Không thể tải thống kê livestream");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const statCards = stats ? [
    { label: "Tổng phiên", value: stats.total_sessions, icon: Film, color: "text-blue-500" },
    { label: "Đang live", value: stats.active_sessions, icon: Radio, color: "text-red-500" },
    { label: "Đã kết thúc", value: stats.ended_sessions, icon: CheckCircle, color: "text-green-500" },
    { label: "Tổng bản ghi", value: stats.total_recordings, icon: Film, color: "text-purple-500" },
    { label: "Hoàn thành", value: stats.done_recordings, icon: CheckCircle, color: "text-emerald-500" },
    { label: "Thất bại", value: stats.failed_recordings, icon: XCircle, color: "text-destructive" },
    { label: "Đang kẹt", value: stats.stuck_recordings, icon: Clock, color: stats.stuck_recordings > 0 ? "text-yellow-500" : "text-muted-foreground" },
    { label: "Tỷ lệ thành công", value: `${stats.success_rate.toFixed(1)}%`, icon: Users, color: "text-primary" },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">📡 Livestream Health</h2>
        <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Làm mới
        </Button>
      </div>

      {stats ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statCards.map((s, i) => (
              <Card key={i}>
                <CardContent className="p-4 flex items-center gap-3">
                  <s.icon className={`w-8 h-8 ${s.color}`} />
                  <div>
                    <p className="text-2xl font-bold text-foreground">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Chi tiết bản ghi</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Đang lắp ráp</span><span className="font-medium">{stats.assembling_recordings}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Thời lượng TB</span><span className="font-medium">{stats.avg_duration_minutes.toFixed(1)} phút</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tổng chunks</span><span className="font-medium">{stats.total_chunks.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Chunks đã upload</span><span className="font-medium">{stats.total_chunks_uploaded.toLocaleString()}</span></div>
              </CardContent>
            </Card>

            {stats.stuck_recordings > 0 && (
              <Card className="border-yellow-500/50">
                <CardHeader><CardTitle className="text-sm text-yellow-600">⚠️ Cảnh báo</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Có <strong className="text-yellow-600">{stats.stuck_recordings}</strong> bản ghi đang kẹt.
                    Auto-finalize cron sẽ xử lý trong lần chạy tiếp theo (mỗi 5 phút).
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      ) : loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : null}
    </div>
  );
};

export default LivestreamHealthTab;
