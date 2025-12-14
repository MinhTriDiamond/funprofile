import { useState, memo } from 'react';
import { ImageViewer } from './ImageViewer';
import { LazyImage } from '@/components/ui/LazyImage';
import { LazyVideo } from '@/components/ui/LazyVideo';

interface MediaItem {
  url: string;
  type: 'image' | 'video';
}

interface MediaGridProps {
  media: MediaItem[];
}

/**
 * Optimized MediaGrid component with lazy loading
 * - Uses LazyImage for intersection-observer-based loading
 * - Uses LazyVideo with preload="none" for bandwidth savings
 * - Skeleton placeholders during load
 */
export const MediaGrid = memo(({ media }: MediaGridProps) => {
  const [showViewer, setShowViewer] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (media.length === 0) return null;

  const images = media.filter((m) => m.type === 'image');
  const remainingCount = media.length - 4;

  const handleClick = (index: number) => {
    setSelectedIndex(index);
    setShowViewer(true);
  };

  // Single media
  if (media.length === 1) {
    const item = media[0];
    return (
      <>
        {item.type === 'video' ? (
          <LazyVideo
            src={item.url}
            className="w-full max-h-[600px] bg-black"
            showControls
            muted
          />
        ) : (
          <div 
            className="cursor-pointer"
            onClick={() => handleClick(0)}
          >
            <LazyImage
              src={item.url}
              alt="Post media"
              className="w-full max-h-[600px] bg-black"
            />
          </div>
        )}
        {showViewer && images.length > 0 && (
          <ImageViewer
            imageUrl={images[selectedIndex]?.url || ''}
            isOpen={showViewer}
            onClose={() => setShowViewer(false)}
          />
        )}
      </>
    );
  }

  // Two media
  if (media.length === 2) {
    return (
      <>
        <div className="grid grid-cols-2 gap-1">
          {media.map((item, index) => (
            <div key={index} className="aspect-square overflow-hidden">
              {item.type === 'video' ? (
                <LazyVideo
                  src={item.url}
                  className="w-full h-full object-cover"
                  showControls
                  muted
                />
              ) : (
                <div onClick={() => handleClick(index)} className="cursor-pointer h-full">
                  <LazyImage
                    src={item.url}
                    alt={`Media ${index + 1}`}
                    className="w-full h-full hover:opacity-95 transition-opacity"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
        {showViewer && images.length > 0 && (
          <ImageViewer
            imageUrl={images[selectedIndex]?.url || ''}
            isOpen={showViewer}
            onClose={() => setShowViewer(false)}
          />
        )}
      </>
    );
  }

  // Three media
  if (media.length === 3) {
    return (
      <>
        <div className="grid grid-cols-2 gap-1">
          <div className="row-span-2 aspect-square overflow-hidden">
            {media[0].type === 'video' ? (
              <LazyVideo
                src={media[0].url}
                className="w-full h-full object-cover"
                showControls
                muted
              />
            ) : (
              <div onClick={() => handleClick(0)} className="cursor-pointer h-full">
                <LazyImage
                  src={media[0].url}
                  alt="Media 1"
                  className="w-full h-full hover:opacity-95"
                />
              </div>
            )}
          </div>
          {media.slice(1).map((item, index) => (
            <div key={index} className="aspect-square overflow-hidden">
              {item.type === 'video' ? (
                <LazyVideo
                  src={item.url}
                  className="w-full h-full object-cover"
                  showControls
                  muted
                />
              ) : (
                <div onClick={() => handleClick(index + 1)} className="cursor-pointer h-full">
                  <LazyImage
                    src={item.url}
                    alt={`Media ${index + 2}`}
                    className="w-full h-full hover:opacity-95"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
        {showViewer && images.length > 0 && (
          <ImageViewer
            imageUrl={images[selectedIndex]?.url || ''}
            isOpen={showViewer}
            onClose={() => setShowViewer(false)}
          />
        )}
      </>
    );
  }

  // Four or more media
  return (
    <>
      <div className="grid grid-cols-2 gap-1">
        {media.slice(0, 4).map((item, index) => (
          <div 
            key={index} 
            className="aspect-square overflow-hidden relative"
          >
            {item.type === 'video' ? (
              <LazyVideo
                src={item.url}
                className="w-full h-full object-cover"
                showControls
                muted
              />
            ) : (
              <div onClick={() => handleClick(index)} className="cursor-pointer h-full">
                <LazyImage
                  src={item.url}
                  alt={`Media ${index + 1}`}
                  className="w-full h-full hover:opacity-95"
                />
              </div>
            )}
            {index === 3 && remainingCount > 0 && (
              <div 
                className="absolute inset-0 bg-black/60 flex items-center justify-center cursor-pointer"
                onClick={() => handleClick(3)}
              >
                <span className="text-white text-3xl font-bold">+{remainingCount}</span>
              </div>
            )}
          </div>
        ))}
      </div>
      {showViewer && images.length > 0 && (
        <ImageViewer
          imageUrl={images[Math.min(selectedIndex, images.length - 1)]?.url || ''}
          isOpen={showViewer}
          onClose={() => setShowViewer(false)}
        />
      )}
    </>
  );
});

MediaGrid.displayName = 'MediaGrid';
