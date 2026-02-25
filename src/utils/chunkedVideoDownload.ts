import { toast } from "sonner";

/** Download a chunked recording by fetching manifest, all chunks, concatenating into a single blob */
export async function downloadChunkedVideo(
  manifestUrl: string,
  onProgress?: (pct: number) => void
): Promise<void> {
  const toastId = toast.loading("Đang chuẩn bị tải video...", { duration: Infinity });

  try {
    // 1. Fetch manifest
    const res = await fetch(manifestUrl);
    if (!res.ok) throw new Error("Không thể tải manifest");
    const manifest = await res.json();

    const chunks: { url: string }[] = manifest.chunks || [];
    if (chunks.length === 0) throw new Error("Video không có dữ liệu");

    const mimeType = manifest.mime_type || "video/webm";
    const totalChunks = chunks.length;
    const blobs: Blob[] = [];

    toast.loading(`Đang tải video (0/${totalChunks})...`, { id: toastId });

    // 2. Fetch chunks in batches of 6
    const BATCH_SIZE = 6;
    for (let i = 0; i < totalChunks; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(async (chunk) => {
          const r = await fetch(chunk.url);
          if (!r.ok) throw new Error(`Lỗi tải chunk ${chunk.url}`);
          return r.blob();
        })
      );
      blobs.push(...results);

      const done = Math.min(i + BATCH_SIZE, totalChunks);
      const pct = Math.round((done / totalChunks) * 100);
      onProgress?.(pct);
      toast.loading(`Đang tải video (${done}/${totalChunks}) - ${pct}%`, { id: toastId });
    }

    // 3. Concat and download
    const finalBlob = new Blob(blobs, { type: mimeType });
    const url = URL.createObjectURL(finalBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `live-replay-${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);

    toast.success("Tải video thành công!", { id: toastId });
  } catch (err: any) {
    console.error("Download chunked video error:", err);
    toast.error(err?.message || "Lỗi khi tải video", { id: toastId });
  }
}
