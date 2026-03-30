import { useEffect } from "react";
import { useVersionCheck } from "@/hooks/useVersionCheck";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

export function UpdateNotification() {
  const { updateAvailable, applyUpdate } = useVersionCheck();

  // Show toast when update detected (user decides when to reload)
  useEffect(() => {
    if (!updateAvailable) return;
    toast("Có bản cập nhật mới!", {
      description: "Nhấn để tải phiên bản mới nhất.",
      duration: Infinity,
      icon: <RefreshCw className="h-4 w-4 animate-spin" />,
      action: {
        label: "Cập nhật",
        onClick: applyUpdate,
      },
    });
  }, [updateAvailable, applyUpdate]);

  return null;
}
