import { memo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import angelAvatar from '@/assets/angel-avatar.jpg';
import { AngelChatWidget } from './AngelChatWidget';

interface AngelFloatingButtonProps {
  showOnDesktop?: boolean;
}

export const AngelFloatingButton = memo(({ showOnDesktop = false }: AngelFloatingButtonProps) => {
  const [isChatOpen, setIsChatOpen] = useState(false);

  const handleBubbleClick = () => {
    setIsChatOpen(true);
  };

  return (
    <>
      {/* Floating Button Container */}
      <div className={`fixed bottom-24 right-4 z-50 ${showOnDesktop ? '' : 'lg:hidden'}`}>
        {/* Main Floating Button */}
        <button
          onClick={handleBubbleClick}
          className="relative group"
          aria-label="ANGEL AI Chat"
        >
          {/* Glow ring effect */}
          <div className="absolute inset-0 w-14 h-14 rounded-full bg-gradient-to-br from-amber-400/50 to-yellow-500/50 blur-md animate-pulse" />
          
          {/* Avatar container */}
          <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-amber-400 shadow-lg shadow-amber-500/50 group-hover:border-amber-300 group-hover:scale-105 transition-all duration-300">
            <img 
              src={angelAvatar} 
              alt="ANGEL AI" 
              className="w-full h-full object-cover"
            />
          </div>
          
          {/* Sparkle decorations */}
          <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-amber-400 animate-ping opacity-75" />
          <div className="absolute -bottom-0.5 -left-0.5 w-2 h-2 bg-amber-200 rounded-full animate-pulse" />
          
          {/* Online indicator */}
          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-background rounded-full" />
        </button>
      </div>

      {/* Chat Widget */}
      <AngelChatWidget 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
      />
    </>
  );
});

AngelFloatingButton.displayName = 'AngelFloatingButton';
