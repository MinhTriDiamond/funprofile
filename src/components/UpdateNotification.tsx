import { useEffect } from "react";
import { useVersionCheck } from "@/hooks/useVersionCheck";
import { useLocation } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

export function UpdateNotification() {
  const { updateAvailable, applyUpdate } = useVersionCheck();
  const location = useLocation();

  // Auto reload on route change if update is pending
  useEffect(() => {
    if (updateAvailable) {
      applyUpdate();
    }
  }, [location.pathname, updateAvailable, applyUpdate]);

  // Show toast when update detected
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
