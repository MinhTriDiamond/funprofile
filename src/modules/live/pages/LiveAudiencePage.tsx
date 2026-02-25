import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Clock, Eye, Loader2, Radio, Volume2, VolumeX } from 'lucide-react';
import { FacebookNavbar } from '@/components/layout/FacebookNavbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { useLiveSession } from '../useLiveSession';
import { useLiveRtc } from '../hooks/useLiveRtc';
import { incrementLiveViewerCount, decrementLiveViewerCount } from '../liveService';
import { LiveChatPanel } from '../components/LiveChatPanel';
import { FloatingReactions } from '../components/FloatingReactions';
import { useSlugResolver } from '@/hooks/useSlugResolver';
import { useLiveDuration } from '../hooks/useLiveDuration';

export default function LiveAudiencePage() {
  const navigate = useNavigate();
  const { liveSessionId, username, slug } = useParams<{ liveSessionId?: string; username?: string; slug?: string }>();

  const { resolvedId: resolvedSessionId } = useSlugResolver({
    contentType: 'live',
    table: 'live_sessions',
    userIdColumn: 'owner_id',
    directId: liveSessionId,
    username,
    slug,
    urlPrefix: 'live',
  });

  const { data: session, isLoading } = useLiveSession(resolvedSessionId);
  const liveDuration = useLiveDuration(session?.started_at, session?.status === 'live');
  const [mobileTab, setMobileTab] = useState<'chat' | 'reactions'>('chat');
  const [showEndedDialog, setShowEndedDialog] = useState(false);

  const {
    remoteContainerRef,
    statusText,
    hasRemoteVideo,
    isMuted,
    start,
    leave,
    toggleRemoteAudio,
  } = useLiveRtc({
    sessionId: resolvedSessionId,
    role: 'audience',
    enabled: !!resolvedSessionId && session?.status === 'live',
  });

  useEffect(() => {
    if (!resolvedSessionId || !session || session.status !== 'live') return;
    start().catch(() => undefined);
  }, [resolvedSessionId, session, start]);

  // Track viewer count via database
  useEffect(() => {
    if (!resolvedSessionId || session?.status !== 'live') return;

    incrementLiveViewerCount(resolvedSessionId).catch(console.warn);

    const handleBeforeUnload = () => {
      decrementLiveViewerCount(resolvedSessionId).catch(() => {});
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      decrementLiveViewerCount(resolvedSessionId).catch(() => {});
    };
  }, [resolvedSessionId, session?.status]);

  useEffect(() => {
    if (session?.status === 'ended') {
      leave().catch(() => undefined);
      setShowEndedDialog(true);
    }
  }, [leave, session?.status]);

  useEffect(() => {
    return () => {
      leave().catch(() => undefined);
    };
  }, [leave]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6">Live session not found.</Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <FacebookNavbar />
      <main className="pt-16 px-3 md:px-6 pb-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-4">
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={session.host_profile?.avatar_url || ''} />
                  <AvatarFallback>
                    {session.host_profile?.username?.charAt(0)?.toUpperCase() || 'H'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold text-sm">{session.host_profile?.full_name || session.host_profile?.username || 'Host'}</div>
                  <h1 className="text-lg md:text-xl font-bold">{session.title || 'Live Stream'}</h1>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={session.status === 'live' ? 'destructive' : 'secondary'} className="gap-1">
                  <Radio className="h-3.5 w-3.5" />
                  {session.status === 'live' ? 'LIVE' : 'ENDED'}
                </Badge>
                {session.status === 'live' && (
                  <Badge variant="outline" className="gap-1 font-mono">
                    <Clock className="h-3.5 w-3.5" />
                    {liveDuration}
                  </Badge>
                )}
                <Badge variant="secondary" className="gap-1">
                  <Eye className="h-3.5 w-3.5" />
                  {session.viewer_count || 0}
                </Badge>
              </div>
            </div>

            <Card className="overflow-hidden">
              <div className="aspect-video bg-black relative">
                <div ref={remoteContainerRef} className="h-full w-full" />
                {!hasRemoteVideo && (
                  <div className="absolute inset-0 flex items-center justify-center text-white/90 bg-black/50 text-center px-4">
                    {session.status === 'ended' ? 'Phiên Live Stream đã kết thúc' : statusText}
                  </div>
                )}

                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute bottom-3 left-3 z-10 bg-black/30 hover:bg-black/50 text-white rounded-full h-10 w-10"
                  onClick={toggleRemoteAudio}
                >
                  {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </Button>

                {resolvedSessionId && <FloatingReactions sessionId={resolvedSessionId} />}
              </div>
            </Card>

            <div className="lg:hidden border rounded-xl bg-card overflow-hidden">
              <div className="grid grid-cols-2 border-b">
                <button
                  className={`py-2 text-sm font-medium ${mobileTab === 'chat' ? 'bg-accent' : ''}`}
                  onClick={() => setMobileTab('chat')}
                >
                  Chat
                </button>
                <button
                  className={`py-2 text-sm font-medium ${mobileTab === 'reactions' ? 'bg-accent' : ''}`}
                  onClick={() => setMobileTab('reactions')}
                >
                  Reactions
                </button>
              </div>
              <div className="p-2">
                {mobileTab === 'chat' && resolvedSessionId && <LiveChatPanel sessionId={resolvedSessionId} className="h-[320px]" liveTitle={session.title || undefined} />}
                {mobileTab === 'reactions' && resolvedSessionId && (
                  <div className="h-[120px] flex items-center justify-center relative">
                    <FloatingReactions sessionId={resolvedSessionId} showPicker />
                  </div>
                )}
              </div>
            </div>
          </section>

          {resolvedSessionId && <LiveChatPanel sessionId={resolvedSessionId} className="hidden lg:flex h-[calc(100vh-120px)]" liveTitle={session.title || undefined} />}
        </div>
        <div className="max-w-7xl mx-auto mt-3 flex justify-end">
          <Button variant="outline" size="sm" onClick={() => navigate('/')}>
            Back
          </Button>
        </div>
      </main>

      <AlertDialog open={showEndedDialog}>
        <AlertDialogContent onEscapeKeyDown={(e) => e.preventDefault()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Phiên Live Stream đã kết thúc</AlertDialogTitle>
            <AlertDialogDescription>
              Cảm ơn bạn đã theo dõi phiên phát trực tiếp!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => navigate('/')}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
