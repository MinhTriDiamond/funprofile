import { useState, memo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Menu, Wallet, Plus, Trophy, Users } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { FacebookLeftSidebar } from '@/components/feed/FacebookLeftSidebar';
import { FacebookRightSidebar } from '@/components/feed/FacebookRightSidebar';
import { useLanguage } from '@/i18n/LanguageContext';

export const MobileBottomNav = memo(() => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const [leftSheetOpen, setLeftSheetOpen] = useState(false);
  const [rightSheetOpen, setRightSheetOpen] = useState(false);

  const isActive = useCallback((path: string) => location.pathname === path, [location.pathname]);

  const handleNavigate = useCallback((path: string) => {
    navigate(path);
  }, [navigate]);

  const navItems = [
    { icon: Home, label: t('feed'), path: '/', action: () => handleNavigate('/') },
    { icon: Users, label: t('friends'), path: '/friends', action: () => handleNavigate('/friends') },
    { icon: Plus, label: t('createPost'), isFab: true, action: () => handleNavigate('/') },
    { icon: Trophy, label: t('honorBoard'), action: () => setRightSheetOpen(true) },
    { icon: Menu, label: t('menu'), action: () => setLeftSheetOpen(true) },
  ];

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-card/98 backdrop-blur-lg border-t border-border/50 bottom-nav-safe">
        <div className="flex items-center justify-around h-16 px-1 max-w-lg mx-auto">
          {navItems.map((item, index) => (
            <button
              key={index}
              onClick={item.action}
              aria-label={item.label}
              className={`flex flex-col items-center justify-center min-w-[60px] min-h-[52px] rounded-2xl transition-all duration-200 touch-ripple ${
                item.isFab
                  ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground -mt-5 w-14 h-14 rounded-full shadow-lg shadow-primary/40 active:scale-95'
                  : item.path && isActive(item.path)
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground active:text-primary active:bg-primary/5'
              }`}
            >
              <item.icon className={`${item.isFab ? 'w-6 h-6' : 'w-5 h-5'} transition-transform`} strokeWidth={item.isFab ? 2.5 : 2} />
              {!item.isFab && (
                <span className="text-[10px] mt-0.5 font-medium truncate max-w-[48px]">{item.label}</span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Left Sidebar Sheet (Menu) */}
      <Sheet open={leftSheetOpen} onOpenChange={setLeftSheetOpen}>
        <SheetContent side="left" className="w-[85vw] max-w-[320px] p-0 bg-background overflow-y-auto">
          <div className="p-4 pt-8">
            <FacebookLeftSidebar onItemClick={() => setLeftSheetOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Right Sidebar Sheet (Honor Board) */}
      <Sheet open={rightSheetOpen} onOpenChange={setRightSheetOpen}>
        <SheetContent side="right" className="w-[85vw] max-w-[320px] p-0 bg-background overflow-y-auto">
          <div className="p-4 pt-8">
            <FacebookRightSidebar />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
});

MobileBottomNav.displayName = 'MobileBottomNav';
