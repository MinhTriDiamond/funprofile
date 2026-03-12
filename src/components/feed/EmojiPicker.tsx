import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Smile } from 'lucide-react';
import { TwemojiImage } from '@/components/ui/TwemojiImage';

const EMOJI_CATEGORIES = {
  'Cảm xúc': ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐'],
  'Cử chỉ': ['👍', '👎', '👊', '✊', '🤛', '🤜', '🤝', '👏', '🙌', '👐', '🤲', '🤞', '✌️', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🖖', '💪', '🙏'],
  'Trái tim': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'],
  'Hoạt động': ['🎉', '🎊', '🎂', '🎁', '🎈', '🎄', '🎃', '🎗️', '🏆', '🥇', '🥈', '🥉', '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🎮', '🎯', '🎲'],
  'Đồ ăn': ['🍕', '🍔', '🍟', '🌭', '🍿', '🧂', '🥓', '🥚', '🍳', '🧇', '🥞', '🧈', '🍞', '🥐', '🥖', '🥨', '🧀', '🥗', '🍱', '🍜', '🍝', '🍰', '🎂', '🍩', '🍪', '🍫', '🍬', '☕', '🍵', '🥤', '🍺', '🍷'],
  'Tự nhiên': ['🌸', '🌺', '🌻', '🌹', '🌷', '🌼', '💐', '🌱', '🌲', '🌳', '🌴', '🌵', '🍀', '🍁', '🍂', '🍃', '🌿', '☀️', '🌙', '⭐', '🌈', '☁️', '⛈️', '❄️', '🔥', '💧'],
};

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
}

export const EmojiPicker = ({ onEmojiSelect }: EmojiPickerProps) => {
  const [selectedCategory, setSelectedCategory] = useState('Cảm xúc');
  const [isOpen, setIsOpen] = useState(false);

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen} modal={false}>
      <PopoverTrigger asChild>
        <button type="button" className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center transition-colors">
          <Smile className="w-6 h-6 text-gold" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 z-[9999]" align="end" onOpenAutoFocus={(e) => e.preventDefault()}>
        {/* Category Tabs */}
        <div className="flex gap-1 p-2 border-b border-border overflow-x-auto scrollbar-none">
          {Object.keys(EMOJI_CATEGORIES).map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className="text-xs whitespace-nowrap"
            >
              {category}
            </Button>
          ))}
        </div>

        {/* Emoji Grid */}
        <div className="p-2 grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
          {EMOJI_CATEGORIES[selectedCategory as keyof typeof EMOJI_CATEGORIES].map((emoji, index) => (
            <button
              key={index}
              onClick={() => handleEmojiClick(emoji)}
              className="w-8 h-8 flex items-center justify-center hover:bg-secondary rounded transition-all hover:scale-110"
            >
              <TwemojiImage emoji={emoji} size={22} />
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
