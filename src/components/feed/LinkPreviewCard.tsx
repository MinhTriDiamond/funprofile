import { memo, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useLinkPreview, extractFirstUrl } from '@/hooks/useLinkPreview';

interface LinkPreviewCardProps {
  url: string;
}

const LinkPreviewCardComponent = ({ url }: LinkPreviewCardProps) => {
  const { data, isLoading } = useLinkPreview(url);
  const [imageError, setImageError] = useState(false);

  if (isLoading) {
    return (
      <div className="mb-3 border-y border-border overflow-hidden">
        <Skeleton className="w-full h-[200px]" />
        <div className="p-3 space-y-2 bg-muted/30">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const domain = (() => {
    try { return new URL(data.url).hostname.replace('www.', ''); } catch { return ''; }
  })();

  const showImage = data.image && !imageError;

  return (
    <a
      href={data.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block mb-3 border-y border-border overflow-hidden group"
      onClick={(e) => e.stopPropagation()}
    >
      {showImage && (
        <div className="w-full bg-muted">
          <img
            src={data.image!}
            alt={data.title || ''}
            className="w-full max-h-[400px] object-cover"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        </div>
      )}

      <div className="px-3 py-2.5 space-y-0.5 bg-muted/30">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground uppercase tracking-wide">
          {data.favicon && (
            <img
              src={data.favicon}
              alt=""
              className="w-3.5 h-3.5 rounded-sm"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          <span>{data.siteName || domain}</span>
        </div>

        {data.title && (
          <h4 className="font-semibold text-[15px] leading-snug text-foreground line-clamp-2">
            {data.title}
          </h4>
        )}

        {data.description && (
          <p className="text-xs text-muted-foreground line-clamp-1">
            {data.description}
          </p>
        )}

        {!data.title && !data.image && (
          <div className="flex items-center gap-1.5 text-sm text-primary">
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="truncate">{domain}</span>
          </div>
        )}
      </div>
    </a>
  );
};

export const LinkPreviewCard = memo(LinkPreviewCardComponent);
export { extractFirstUrl };
