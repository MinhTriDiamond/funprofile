import { memo, useState, useRef, useCallback, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { AngelChatWidget } from './AngelChatWidget';

const STORAGE_KEY = 'angel-btn-pos';
const BUTTON_SIZE = 56;
const DRAG_THRESHOLD = 10;
const CHAT_Y_THRESHOLD = 180; // clearance for bottom nav + chat input

function getDefaultPosition() {
  return {
    x: window.innerWidth - BUTTON_SIZE - 16,
    y: window.innerHeight - BUTTON_SIZE - CHAT_Y_THRESHOLD,
  };
}

function loadPosition(): { x: number; y: number } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const pos = JSON.parse(raw);
      if (typeof pos.x === 'number' && typeof pos.y === 'number') return pos;
    }
  } catch {}
  return null;
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

interface AngelFloatingButtonProps {
  showOnDesktop?: boolean;
}

export const AngelFloatingButton = memo(({ showOnDesktop = false }: AngelFloatingButtonProps) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const isFirstRender = useRef(!localStorage.getItem(STORAGE_KEY));
  const [showHint, setShowHint] = useState(isFirstRender.current);
  const location = useLocation();
  const [position, setPosition] = useState<{ x: number; y: number }>(() => loadPosition() || getDefaultPosition());

  const dragRef = useRef({
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
    moved: false,
  });

  const isOnChat = location.pathname.startsWith('/chat');

  // Auto-move up when on chat route to avoid blocking send button
  useEffect(() => {
    if (isOnChat) {
      const maxY = window.innerHeight - BUTTON_SIZE - CHAT_Y_THRESHOLD;
      setPosition((prev) => {
        if (prev.y > maxY) {
          const adjusted = { ...prev, y: maxY };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(adjusted));
          return adjusted;
        }
        return prev;
      });
    }
  }, [isOnChat]);

  // Hide hint animation after 3 seconds
  useEffect(() => {
    if (showHint) {
      const timer = setTimeout(() => setShowHint(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showHint]);

  // Recalculate on resize to keep in viewport
  useEffect(() => {
    const onResize = () => {
      setPosition((prev) => ({
        x: clamp(prev.x, 0, window.innerWidth - BUTTON_SIZE),
        y: clamp(prev.y, 0, window.innerHeight - BUTTON_SIZE),
      }));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    dragRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      offsetX: touch.clientX - position.x,
      offsetY: touch.clientY - position.y,
      moved: false,
    };
  }, [position]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const dx = touch.clientX - dragRef.current.startX;
    const dy = touch.clientY - dragRef.current.startY;

    if (!dragRef.current.moved && Math.abs(dx) + Math.abs(dy) > DRAG_THRESHOLD) {
      dragRef.current.moved = true;
    }

    if (dragRef.current.moved) {
      e.preventDefault();
      const newX = clamp(touch.clientX - dragRef.current.offsetX, 0, window.innerWidth - BUTTON_SIZE);
      const newY = clamp(touch.clientY - dragRef.current.offsetY, 0, window.innerHeight - BUTTON_SIZE);
      setPosition({ x: newX, y: newY });
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    if (dragRef.current.moved) {
      // Snap to nearest edge
      setPosition((prev) => {
        const snappedX = prev.x < (window.innerWidth - BUTTON_SIZE) / 2 ? 8 : window.innerWidth - BUTTON_SIZE - 8;
        const finalPos = { x: snappedX, y: prev.y };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(finalPos));
        return finalPos;
      });
    } else {
      setIsChatOpen(true);
    }
  }, []);

  return (
    <>
      <div
        className={`fixed z-50 ${showOnDesktop ? '' : 'lg:hidden'}`}
        style={{
          left: position.x,
          top: position.y,
          touchAction: 'none',
          transition: dragRef.current.moved ? 'left 0.2s ease' : 'none',
        }}
      >
        <button
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onClick={() => {
            // Desktop click fallback
            if (!('ontouchstart' in window)) setIsChatOpen(true);
          }}
          className={`relative group ${showHint ? 'animate-bounce' : ''}`}
          aria-label="ANGEL AI Chat"
        >
          <div className="absolute inset-0 w-14 h-14 rounded-full bg-gradient-to-br from-amber-400/50 to-yellow-500/50 blur-md animate-pulse" />
          <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-amber-400 shadow-lg shadow-amber-500/50 group-hover:border-amber-300 group-hover:scale-105 transition-all duration-300">
            <img src="/angel-ai-logo-36.png" alt="ANGEL AI" className="w-full h-full object-cover" />
          </div>
          <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-amber-400 animate-ping opacity-75" />
          <div className="absolute -bottom-0.5 -left-0.5 w-2 h-2 bg-amber-200 rounded-full animate-pulse" />
          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-background rounded-full" />
        </button>
      </div>

      <AngelChatWidget isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </>
  );
});

AngelFloatingButton.displayName = 'AngelFloatingButton';
