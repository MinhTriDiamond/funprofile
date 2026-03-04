import { useMemo, useCallback, useRef, memo } from 'react';
import { MediaGrid } from './MediaGrid';
import { LivePostEmbed } from './LivePostEmbed';
import { HeartAnimation } from './HeartAnimation';
import { Radio } from 'lucide-react';
import type { PostData } from './types';

interface PostMediaProps {
  post: PostData;
  showHeartAnimation: boolean;
  onHeartComplete: () => void;
  onDoubleTap: () => void;
}

export const PostMedia = memo(function PostMedia({
  post, showHeartAnimation, onHeartComplete, onDoubleTap,
}: PostMediaProps) {
  const metadata = post.metadata;
  const isLive = post.post_type === 'live';

  const mediaItems = useMemo(() => {
    const items: Array<{ url: string; type: 'image' | 'video'; poster?: string; isLiveReplay?: boolean }> = [];

    if (post.media_urls && Array.isArray(post.media_urls) && post.media_urls.length > 0) {
      if (isLive) {
        return post.media_urls.map(m => ({
          ...m,
          isLiveReplay: m.type === 'video',
          poster: m.type === 'video' ? metadata?.thumbnail_url : undefined,
        }));
      }
      return post.media_urls;
    }

    if (post.image_url) {
      items.push({ url: post.image_url, type: 'image' as const });
    }
    if (post.video_url) {
      const poster = metadata?.thumbnail_url;
      items.push({ url: post.video_url, type: 'video' as const, poster, isLiveReplay: isLive });
    }
    return items;
  }, [post.media_urls, post.image_url, post.video_url, metadata, isLive]);

  // Live embed for active streams
  if (isLive && metadata?.live_status === 'live') {
    return (
      <LivePostEmbed
        metadata={metadata}
        hostName={post.profiles?.display_name || post.profiles?.username || ''}
      />
    );
  }

  return (
    <div className="relative" onClick={onDoubleTap}>
      {mediaItems.length > 0 ? (
        <MediaGrid media={mediaItems} feedId={post.id} />
      ) : isLive && metadata?.live_status === 'ended' ? (
        metadata?.recording_failed ? (
          <div className="flex items-center justify-center p-6 bg-muted/50 text-muted-foreground text-sm gap-2">
            <Radio className="w-4 h-4" />
            <span>Phiên live này không có bản ghi</span>
          </div>
        ) : (
          <div className="flex items-center justify-center p-6 bg-muted/50 text-muted-foreground text-sm gap-2">
            <Radio className="w-4 h-4 animate-pulse" />
            <span>Đang xử lý bản ghi livestream...</span>
          </div>
        )
      ) : null}
      <HeartAnimation show={showHeartAnimation} onComplete={onHeartComplete} />
    </div>
  );
});
