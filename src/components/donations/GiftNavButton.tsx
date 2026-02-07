import { useState, memo } from 'react';
import { Gift, Search, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { DonationDialog } from './DonationDialog';

interface GiftNavButtonProps {
  variant: 'desktop' | 'mobile';
  className?: string;
}

interface FriendProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  full_name: string | null;
  wallet_address: string | null;
}

export const GiftNavButton = memo(({ variant, className = '' }: GiftNavButtonProps) => {
  const { t } = useLanguage();
  const [isSelectDialogOpen, setIsSelectDialogOpen] = useState(false);
  const [isDonationDialogOpen, setIsDonationDialogOpen] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<FriendProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ['current-user-gift'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch friends list
  const { data: friends = [], isLoading } = useQuery({
    queryKey: ['friends-for-gift', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      
      const { data: friendships } = await supabase
        .from('friendships')
        .select('friend_id, user_id')
        .or(`user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`)
        .eq('status', 'accepted');

      if (!friendships?.length) return [];

      const friendIds = friendships.map(f => 
        f.user_id === currentUser.id ? f.friend_id : f.user_id
      );

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, full_name, wallet_address')
        .in('id', friendIds);

      return profiles || [];
    },
    enabled: !!currentUser?.id && isSelectDialogOpen,
  });

  // Filter friends by search query
  const filteredFriends = friends.filter(friend => 
    friend.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (friend.full_name?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSelectRecipient = (friend: FriendProfile) => {
    setSelectedRecipient(friend);
    setIsSelectDialogOpen(false);
    setIsDonationDialogOpen(true);
    setSearchQuery('');
  };

  const handleOpenSelectDialog = () => {
    if (!currentUser) {
      // Could redirect to auth or show message
      return;
    }
    setIsSelectDialogOpen(true);
  };

  const handleDonationClose = () => {
    setIsDonationDialogOpen(false);
    setSelectedRecipient(null);
  };

  // Desktop variant
  if (variant === 'desktop') {
    return (
      <>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleOpenSelectDialog}
              className={`fun-icon-btn-gold group relative ${className}`}
              aria-label={t('gift') || 'Tặng quà'}
            >
              <Gift className="w-5 h-5 text-gold drop-shadow-[0_0_6px_hsl(48_96%_53%/0.5)] group-hover:drop-shadow-[0_0_12px_hsl(48_96%_53%/0.8)] transition-all duration-300" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-card text-card-foreground border border-border">
            <p>{t('gift') || 'Tặng quà'}</p>
          </TooltipContent>
        </Tooltip>

        {/* Recipient Selection Dialog */}
        <Dialog open={isSelectDialogOpen} onOpenChange={setIsSelectDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Gift className="w-5 h-5 text-gold" />
                {t('selectRecipient') || 'Chọn người nhận quà'}
              </DialogTitle>
            </DialogHeader>
            
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t('searchFriends') || 'Tìm bạn bè...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Friends List */}
            <ScrollArea className="h-[300px] pr-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div>
                </div>
              ) : filteredFriends.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery 
                    ? (t('noFriendsFound') || 'Không tìm thấy bạn bè')
                    : (t('noFriendsYet') || 'Chưa có bạn bè nào')
                  }
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredFriends.map((friend) => (
                    <button
                      key={friend.id}
                      onClick={() => handleSelectRecipient(friend)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left group"
                    >
                      <Avatar className="w-10 h-10 border-2 border-transparent group-hover:border-gold/50 transition-colors">
                        <AvatarImage src={friend.avatar_url || ''} />
                        <AvatarFallback className="bg-primary/20 text-primary">
                          {friend.username[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{friend.username}</p>
                        {friend.full_name && (
                          <p className="text-sm text-muted-foreground truncate">{friend.full_name}</p>
                        )}
                      </div>
                      <Gift className="w-4 h-4 text-gold opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Donation Dialog */}
        {selectedRecipient && (
          <DonationDialog
            isOpen={isDonationDialogOpen}
            onClose={handleDonationClose}
            recipientId={selectedRecipient.id}
            recipientUsername={selectedRecipient.username}
            recipientAvatarUrl={selectedRecipient.avatar_url || undefined}
            recipientWalletAddress={selectedRecipient.wallet_address}
          />
        )}
      </>
    );
  }

  // Mobile variant - returns just the button content (to be used in nav item)
  return (
    <>
      <button
        onClick={handleOpenSelectDialog}
        aria-label={t('gift') || 'Tặng quà'}
        className={`flex flex-col items-center justify-center min-w-[56px] min-h-[52px] rounded-full transition-all duration-300 touch-manipulation group border-[0.5px] text-gold hover:text-gold hover:bg-gold/10 border-transparent hover:border-gold/40 active:bg-gold/20 ${className}`}
      >
        <Gift className="w-6 h-6 transition-all duration-300 drop-shadow-[0_0_6px_hsl(48_96%_53%/0.5)] group-hover:drop-shadow-[0_0_10px_hsl(48_96%_53%/0.7)]" strokeWidth={1.8} />
        <span className="text-[10px] mt-1 font-medium truncate max-w-[52px]">{t('gift') || 'Tặng'}</span>
      </button>

      {/* Recipient Selection Dialog */}
      <Dialog open={isSelectDialogOpen} onOpenChange={setIsSelectDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Gift className="w-5 h-5 text-gold" />
              {t('selectRecipient') || 'Chọn người nhận quà'}
            </DialogTitle>
          </DialogHeader>
          
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t('searchFriends') || 'Tìm bạn bè...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Friends List */}
          <ScrollArea className="h-[250px] pr-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div>
              </div>
            ) : filteredFriends.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery 
                  ? (t('noFriendsFound') || 'Không tìm thấy bạn bè')
                  : (t('noFriendsYet') || 'Chưa có bạn bè nào')
                }
              </div>
            ) : (
              <div className="space-y-2">
                {filteredFriends.map((friend) => (
                  <button
                    key={friend.id}
                    onClick={() => handleSelectRecipient(friend)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent active:bg-accent transition-colors text-left group"
                  >
                    <Avatar className="w-10 h-10 border-2 border-transparent group-hover:border-gold/50 transition-colors">
                      <AvatarImage src={friend.avatar_url || ''} />
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {friend.username[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{friend.username}</p>
                      {friend.full_name && (
                        <p className="text-sm text-muted-foreground truncate">{friend.full_name}</p>
                      )}
                    </div>
                    <Gift className="w-4 h-4 text-gold opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Donation Dialog */}
      {selectedRecipient && (
        <DonationDialog
          isOpen={isDonationDialogOpen}
          onClose={handleDonationClose}
          recipientId={selectedRecipient.id}
          recipientUsername={selectedRecipient.username}
          recipientAvatarUrl={selectedRecipient.avatar_url || undefined}
          recipientWalletAddress={selectedRecipient.wallet_address}
        />
      )}
    </>
  );
});

GiftNavButton.displayName = 'GiftNavButton';
