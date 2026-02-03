import { memo, useState } from 'react';
import { Sparkles, ExternalLink, MessageCircle } from 'lucide-react';
import angelAvatar from '@/assets/angel-avatar.jpg';
import { AngelChatWidget } from './AngelChatWidget';

interface AngelFloatingButtonProps {
  showOnDesktop?: boolean;
}

export const AngelFloatingButton = memo(({ showOnDesktop = false }: AngelFloatingButtonProps) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const handleOpenExternal = () => {
    window.open('https://angel.fun.rich/chat', '_blank');
    setShowOptions(false);
  };

  const handleOpenChat = () => {
    setIsChatOpen(true);
    setShowOptions(false);
  };

  const handleBubbleClick = () => {
    setShowOptions(!showOptions);
  };

  return (
    <>
      {/* Floating Button Container */}
      <div className={`fixed bottom-24 right-4 z-50 ${showOnDesktop ? '' : 'lg:hidden'}`}>
        {/* Options Menu */}
        {showOptions && (
          <div className="absolute bottom-16 right-0 mb-2 bg-card/95 backdrop-blur-xl border border-amber-500/30 rounded-2xl shadow-2xl shadow-amber-500/20 overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-200">
            <button
              onClick={handleOpenChat}
              className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-amber-500/10 transition-colors group"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-medium text-foreground group-hover:text-amber-500 transition-colors">
                  Chat ngay
                </span>
                <span className="text-xs text-muted-foreground">Mở chat tại đây</span>
              </div>
            </button>
            <div className="border-t border-border/50" />
            <button
              onClick={handleOpenExternal}
              className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-amber-500/10 transition-colors group"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
                <ExternalLink className="w-4 h-4 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-medium text-foreground group-hover:text-purple-400 transition-colors">
                  Mở trang riêng
                </span>
                <span className="text-xs text-muted-foreground">angel.fun.rich</span>
              </div>
            </button>
          </div>
        )}

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
