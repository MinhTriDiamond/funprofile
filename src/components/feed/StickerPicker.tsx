import { useState } from 'react';
import { X } from 'lucide-react';
import { STICKER_CATEGORIES } from '@/data/curatedStickers';

interface StickerPickerProps {
  onSelect: (stickerUrl: string) => void;
  onClose: () => void;
}

const StickerPicker = ({ onSelect, onClose }: StickerPickerProps) => {
  const [activeCategory, setActiveCategory] = useState(0);
  const category = STICKER_CATEGORIES[activeCategory];

  return (
    <div className="w-80 max-h-96 bg-card border border-border rounded-xl shadow-xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="font-semibold text-sm">Stickers</span>
        <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-secondary flex items-center justify-center">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-0.5 px-2 py-1.5 border-b border-border overflow-x-auto scrollbar-none">
        {STICKER_CATEGORIES.map((cat, i) => (
          <button
            key={cat.name}
            onClick={() => setActiveCategory(i)}
            className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-colors ${
              i === activeCategory ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-secondary'
            }`}
            title={cat.name}
          >
            {cat.icon}
          </button>
        ))}
      </div>

      {/* Sticker grid */}
      <div className="flex-1 overflow-y-auto p-2 grid grid-cols-4 gap-2">
        {category.stickers.map((sticker, i) => (
          <button
            key={i}
            onClick={() => onSelect(sticker.url)}
            className="aspect-square rounded-xl p-1.5 hover:bg-secondary transition-all hover:scale-110"
          >
            <img
              src={sticker.url}
              alt={sticker.alt}
              loading="lazy"
              className="w-full h-full object-contain"
            />
          </button>
        ))}
      </div>
    </div>
  );
};

export default StickerPicker;
