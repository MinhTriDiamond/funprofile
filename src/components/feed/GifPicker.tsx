import { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { searchGifs } from '@/data/curatedGifs';
import { useLanguage } from '@/i18n/LanguageContext';

interface GifPickerProps {
  onSelect: (gifUrl: string) => void;
  onClose: () => void;
}

const GifPicker = ({ onSelect, onClose }: GifPickerProps) => {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchGifs(query), [query]);

  return (
    <div className="w-80 max-h-96 bg-card border border-border rounded-xl shadow-xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="font-semibold text-sm">GIF</span>
        <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-secondary flex items-center justify-center">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search GIFs..."
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-secondary rounded-lg border-none outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-2 grid grid-cols-2 gap-1.5">
        {results.map((gif, i) => (
          <button
            key={i}
            onClick={() => onSelect(gif.url)}
            className="aspect-square rounded-lg overflow-hidden hover:ring-2 ring-primary transition-all hover:scale-[1.02]"
          >
            <img
              src={gif.url}
              alt={gif.alt}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          </button>
        ))}
        {results.length === 0 && (
          <p className="col-span-2 text-center text-sm text-muted-foreground py-8">
            No GIFs found
          </p>
        )}
      </div>
    </div>
  );
};

export default GifPicker;
