import { memo } from 'react';
import { ExternalLink } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useLinkPreview, extractFirstUrl } from '@/hooks/useLinkPreview';

interface LinkPreviewCardProps {
  url: string;
}

const LinkPreviewCardComponent = ({ url }: LinkPreviewCardProps) => {
  const { data, isLoading } = useLinkPreview(url);

  if (isLoading) {
    return (
      <div className="mx-4 mb-3 rounded-lg border border-border overflow-hidden">
        <Skeleton className="w-full h-[200px]" />
        <div className="p-3 space-y-2">
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

  return (
    <a
      href={data.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block mx-4 mb-3 rounded-lg border border-border overflow-hidden hover:bg-muted/50 transition-colors group"
      onClick={(e) => e.stopPropagation()}
    >
      {data.image && (
        <div className="w-full bg-muted">
          <img
            src={data.image}
            alt={data.title || ''}
            className="w-full max-h-[300px] object-cover"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}

      <div className="p-3 space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase">
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
          <h4 className="font-semibold text-sm text-foreground line-clamp-2 group-hover:underline">
            {data.title}
          </h4>
        )}

        {data.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
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
