import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Radio, Eye, Video, Volume2, VolumeX } from 'lucide-react';
import { LiveVideoPreview } from './LiveVideoPreview';

interface LivePostEmbedProps {
  metadata: {
    live_session_id?: string | null;
    live_status?: string | null;
    channel_name?: string | null;
    viewer_count?: number;
    thumbnail_url?: string | null;
    live_title?: string | null;
  };
  hostName: string;
}

export const LivePostEmbed = ({ metadata, hostName }: LivePostEmbedProps) => {
  const navigate = useNavigate();
  const sessionId = metadata.live_session_id;
  const viewerCount = metadata.viewer_count ?? 0;
  const thumbnailUrl = metadata.thumbnail_url;
  const [isVideoReady, setIsVideoReady] = useState(false);

  const handleWatchLive = () => {
    if (sessionId) {
      navigate(`/live/${sessionId}`);
    }
  };

  const onVideoReady = useCallback((ready: boolean) => {
    setIsVideoReady(ready);
  }, []);

  return (
    <div
      className="relative w-full aspect-video bg-gradient-to-br from-gray-900 via-gray-800 to-black overflow-hidden cursor-pointer group"
      onClick={handleWatchLive}
    >
      {/* Live video preview (Agora stream) */}
      {sessionId && (
        <LiveVideoPreview sessionId={sessionId} onVideoReady={onVideoReady} />
      )}

      {/* Fallback: thumbnail or placeholder when video not ready */}
      {!isVideoReady && (
        <>
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt="Live thumbnail"
              className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-50 transition-opacity"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Video className="w-16 h-16 text-white/30" />
            </div>
          )}
        </>
      )}

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

      {/* LIVE badge + viewer count */}
      <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
        <span className="flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-md animate-pulse">
          <Radio className="w-3.5 h-3.5" />
          LIVE
        </span>
        {viewerCount > 0 && (
          <span className="flex items-center gap-1 bg-black/60 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm">
            <Eye className="w-3.5 h-3.5" />
            {viewerCount}
          </span>
        )}
      </div>

      {/* Center: tap to watch (only show when video is playing) */}
      {isVideoReady && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
          <span className="text-white font-semibold text-sm bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm">
            Nhấn để xem trực tiếp
          </span>
        </div>
      )}

      {/* Center play button when no video */}
      {!isVideoReady && !sessionId && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-red-600/90 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-red-600/30">
            <Radio className="w-8 h-8 text-white" />
          </div>
          <span className="text-white font-semibold text-sm bg-black/40 px-4 py-1.5 rounded-full backdrop-blur-sm">
            Xem trực tiếp
          </span>
        </div>
      )}

      {/* Bottom info */}
      <div className="absolute bottom-3 left-3 right-3 z-10">
        <p className="text-white/80 text-xs truncate">
          {hostName} đang phát trực tiếp
        </p>
      </div>
    </div>
  );
};
