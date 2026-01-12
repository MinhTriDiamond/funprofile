import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useConversations } from '@/hooks/useConversations';
import { ConversationList } from '@/components/chat/ConversationList';
import { MessageThread } from '@/components/chat/MessageThread';
import { NewConversationDialog } from '@/components/chat/NewConversationDialog';
import { FacebookNavbar } from '@/components/layout/FacebookNavbar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { useIsMobile } from '@/hooks/use-mobile';
import { ArrowLeft, MessageSquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Chat() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [showNewConversation, setShowNewConversation] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      setUserId(user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();
      
      setUsername(profile?.username || null);
    };

    checkAuth();
  }, [navigate]);

  const { conversations, isLoading, createDirectConversation } = useConversations(userId);

  const handleSelectConversation = (id: string) => {
    navigate(`/chat/${id}`);
  };

  const handleBack = () => {
    navigate('/chat');
  };

  const handleNewConversation = async (otherUserId: string) => {
    const result = await createDirectConversation.mutateAsync(otherUserId);
    if (result) {
      navigate(`/chat/${result.id}`);
    }
    setShowNewConversation(false);
  };

  // Mobile: Show only list or thread
  if (isMobile) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <FacebookNavbar />
        
        <main className="flex-1 pt-14 pb-16">
          {conversationId ? (
            <div className="h-full flex flex-col">
              <div className="flex items-center gap-2 p-3 border-b bg-card">
                <Button variant="ghost" size="icon" onClick={handleBack}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <span className="font-medium">Tin nhắn</span>
              </div>
              <MessageThread
                conversationId={conversationId}
                userId={userId}
                username={username}
              />
            </div>
          ) : (
            <div className="h-full">
              <div className="flex items-center justify-between p-4 border-b">
                <h1 className="text-xl font-bold">Tin nhắn</h1>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowNewConversation(true)}
                >
                  <MessageSquarePlus className="h-5 w-5" />
                </Button>
              </div>
              <ConversationList
                conversations={conversations}
                selectedId={null}
                currentUserId={userId}
                onSelect={handleSelectConversation}
                isLoading={isLoading}
              />
            </div>
          )}
        </main>

        <MobileBottomNav />

        <NewConversationDialog
          open={showNewConversation}
          onOpenChange={setShowNewConversation}
          currentUserId={userId}
          onSelectUser={handleNewConversation}
        />
      </div>
    );
  }

  // Desktop: Two-column layout
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <FacebookNavbar />
      
      <main className="flex-1 pt-14 flex">
        {/* Left sidebar - Conversation list */}
        <div className="w-80 border-r bg-card flex flex-col h-[calc(100vh-3.5rem)]">
          <div className="flex items-center justify-between p-4 border-b">
            <h1 className="text-xl font-bold">Tin nhắn</h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowNewConversation(true)}
            >
              <MessageSquarePlus className="h-5 w-5" />
            </Button>
          </div>
          <ConversationList
            conversations={conversations}
            selectedId={conversationId || null}
            currentUserId={userId}
            onSelect={handleSelectConversation}
            isLoading={isLoading}
          />
        </div>

        {/* Main content - Message thread */}
        <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)]">
          {conversationId ? (
            <MessageThread
              conversationId={conversationId}
              userId={userId}
              username={username}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquarePlus className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Chọn cuộc trò chuyện để bắt đầu</p>
              </div>
            </div>
          )}
        </div>
      </main>

      <NewConversationDialog
        open={showNewConversation}
        onOpenChange={setShowNewConversation}
        currentUserId={userId}
        onSelectUser={handleNewConversation}
      />
    </div>
  );
}
