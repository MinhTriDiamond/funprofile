import { Conversation, ConversationParticipant } from '@/hooks/useConversations';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  currentUserId: string | null;
  onSelect: (id: string) => void;
  isLoading: boolean;
}

export function ConversationList({
  conversations,
  selectedId,
  currentUserId,
  onSelect,
  isLoading,
}: ConversationListProps) {
  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 text-muted-foreground">
        <p>Chưa có cuộc trò chuyện nào</p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-2">
        {conversations.map((conversation) => {
          const otherParticipant = conversation.participants?.find(
            (p: ConversationParticipant) => p.user_id !== currentUserId && !p.left_at
          );
          const profile = otherParticipant?.profile;

          const displayName = conversation.type === 'group'
            ? conversation.name
            : profile?.full_name || profile?.username || 'Người dùng';

          const avatarUrl = conversation.type === 'group'
            ? conversation.avatar_url
            : profile?.avatar_url;

          return (
            <button
              key={conversation.id}
              onClick={() => onSelect(conversation.id)}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors hover:bg-accent/50',
                selectedId === conversation.id && 'bg-accent'
              )}
            >
              <Avatar className="h-12 w-12">
                <AvatarImage src={avatarUrl || undefined} alt={displayName || ''} />
                <AvatarFallback>
                  {(displayName || 'U')[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium truncate">{displayName}</span>
                  {conversation.last_message_at && (
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(conversation.last_message_at), {
                        addSuffix: false,
                        locale: vi,
                      })}
                    </span>
                  )}
                </div>
                {conversation.last_message_preview && (
                  <p className="text-sm text-muted-foreground truncate">
                    {conversation.last_message_preview}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}
