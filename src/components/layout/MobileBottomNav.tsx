import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Menu, Wallet, Plus, Trophy } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { FacebookLeftSidebar } from '@/components/feed/FacebookLeftSidebar';
import { FacebookRightSidebar } from '@/components/feed/FacebookRightSidebar';
import { useLanguage } from '@/i18n/LanguageContext';

export const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const [leftSheetOpen, setLeftSheetOpen] = useState(false);
  const [rightSheetOpen, setRightSheetOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { icon: Home, label: t('feed'), path: '/', action: () => navigate('/') },
    { icon: Menu, label: t('menu'), action: () => setLeftSheetOpen(true) },
    { icon: Plus, label: t('createPost'), isFab: true },
    { icon: Trophy, label: t('honorBoard'), action: () => setRightSheetOpen(true) },
    { icon: Wallet, label: t('wallet'), path: '/wallet', action: () => navigate('/wallet') },
  ];

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-card/95 backdrop-blur-md border-t border-border safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item, index) => (
            <button
              key={index}
              onClick={item.action}
              className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] rounded-xl transition-all duration-200 ${
                item.isFab
                  ? 'bg-primary text-primary-foreground -mt-6 w-14 h-14 rounded-full shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-105'
                  : item.path && isActive(item.path)
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-primary hover:bg-primary/5'
              }`}
            >
              <item.icon className={item.isFab ? 'w-6 h-6' : 'w-5 h-5'} />
              {!item.isFab && (
                <span className="text-[10px] mt-1 font-medium">{item.label}</span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Left Sidebar Sheet (Menu) */}
      <Sheet open={leftSheetOpen} onOpenChange={setLeftSheetOpen}>
        <SheetContent side="left" className="w-[300px] p-0 bg-background overflow-y-auto">
          <div className="p-4">
            <FacebookLeftSidebar />
          </div>
        </SheetContent>
      </Sheet>

      {/* Right Sidebar Sheet (Honor Board) */}
      <Sheet open={rightSheetOpen} onOpenChange={setRightSheetOpen}>
        <SheetContent side="right" className="w-[300px] p-0 bg-background overflow-y-auto">
          <div className="p-4">
            <FacebookRightSidebar />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
