import { useEffect, useRef, useState, useCallback } from "react";
import logger from "@/lib/logger";

const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

function extractScriptSrc(html: string): string | null {
  const match = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
  return match?.[1] ?? null;
}

export function useVersionCheck() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const initialSrc = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkVersion = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    try {
      const res = await fetch(`/index.html?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) return;
      const html = await res.text();
      const src = extractScriptSrc(html);
      if (!src) return;

      if (initialSrc.current === null) {
        initialSrc.current = src;
        return;
      }

      if (src !== initialSrc.current) {
        logger.debug("[VersionCheck] New version detected:", src);
        setUpdateAvailable(true);
        // Stop polling once detected
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    } catch {
      // Network error, ignore
    }
  }, []);

  const applyUpdate = useCallback(() => {
    window.location.reload();
  }, []);

  useEffect(() => {
    // Initial check
    checkVersion();
    intervalRef.current = setInterval(checkVersion, CHECK_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [checkVersion]);

  return { updateAvailable, applyUpdate };
}
