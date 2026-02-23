import { useNavigate } from 'react-router-dom';
import { Radio, Eye, Video } from 'lucide-react';

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

  const handleWatchLive = () => {
    if (sessionId) {
      navigate(`/live/${sessionId}`);
    }
  };

  return (
    <div className="relative w-full aspect-video bg-gradient-to-br from-gray-900 via-gray-800 to-black overflow-hidden cursor-pointer group" onClick={handleWatchLive}>
      {/* Thumbnail or placeholder */}
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

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />

      {/* LIVE badge */}
      <div className="absolute top-3 left-3 flex items-center gap-2">
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

      {/* Center play area */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
        <div className="w-16 h-16 rounded-full bg-red-600/90 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-red-600/30">
          <Radio className="w-8 h-8 text-white" />
        </div>
        <span className="text-white font-semibold text-sm bg-black/40 px-4 py-1.5 rounded-full backdrop-blur-sm">
          Xem trực tiếp
        </span>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-3 left-3 right-3">
        <p className="text-white/80 text-xs truncate">
          {hostName} đang phát trực tiếp
        </p>
      </div>
    </div>
  );
};
