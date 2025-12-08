import { useState } from 'react';
import { ImageViewer } from './ImageViewer';

interface MediaItem {
  url: string;
  type: 'image' | 'video';
}

interface MediaGridProps {
  media: MediaItem[];
}

export const MediaGrid = ({ media }: MediaGridProps) => {
  const [showViewer, setShowViewer] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (media.length === 0) return null;

  const images = media.filter((m) => m.type === 'image');
  const videos = media.filter((m) => m.type === 'video');
  const displayCount = Math.min(media.length, 4);
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
          <video
            controls
            preload="metadata"
            className="w-full max-h-[600px] object-contain bg-black"
            src={item.url}
            muted
            playsInline
          />
        ) : (
          <div 
            className="cursor-pointer"
            onClick={() => handleClick(0)}
          >
            <img
              src={item.url}
              alt="Post media"
              loading="lazy"
              className="w-full max-h-[600px] object-contain bg-black"
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
                <video
                  controls
                  preload="metadata"
                  className="w-full h-full object-cover"
                  src={item.url}
                  muted
                  playsInline
                />
              ) : (
                <img
                  src={item.url}
                  alt={`Media ${index + 1}`}
                  loading="lazy"
                  className="w-full h-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
                  onClick={() => handleClick(index)}
                />
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
              <video
                controls
                preload="metadata"
                className="w-full h-full object-cover"
                src={media[0].url}
                muted
                playsInline
              />
            ) : (
              <img
                src={media[0].url}
                alt="Media 1"
                loading="lazy"
                className="w-full h-full object-cover cursor-pointer hover:opacity-95"
                onClick={() => handleClick(0)}
              />
            )}
          </div>
          {media.slice(1).map((item, index) => (
            <div key={index} className="aspect-square overflow-hidden">
              {item.type === 'video' ? (
                <video
                  controls
                  preload="metadata"
                  className="w-full h-full object-cover"
                  src={item.url}
                  muted
                  playsInline
                />
              ) : (
                <img
                  src={item.url}
                  alt={`Media ${index + 2}`}
                  loading="lazy"
                  className="w-full h-full object-cover cursor-pointer hover:opacity-95"
                  onClick={() => handleClick(index + 1)}
                />
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
            className={`aspect-square overflow-hidden relative ${index === 3 && remainingCount > 0 ? '' : ''}`}
          >
            {item.type === 'video' ? (
              <video
                controls
                preload="metadata"
                className="w-full h-full object-cover"
                src={item.url}
                muted
                playsInline
              />
            ) : (
              <img
                src={item.url}
                alt={`Media ${index + 1}`}
                loading="lazy"
                className="w-full h-full object-cover cursor-pointer hover:opacity-95"
                onClick={() => handleClick(index)}
              />
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
};
