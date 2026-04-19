import { lazy, Suspense, useEffect, useRef } from "react";
import { ensureAutoplay, registerAudioElement } from '@/lib/globalAudio';
import Feed from "./pages/Feed";
import Wallet from "./pages/Wallet";
import ScrollToTop from "./components/ScrollToTop";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { LawOfLightGuard } from "@/components/auth/LawOfLightGuard";
import { Web3Provider } from "@/components/providers/Web3Provider";
import { DonationReceivedNotification } from "@/components/donations/DonationReceivedNotification";
import { RewardAdjustmentNotification } from "@/components/notifications/RewardAdjustmentNotification";
import { EpochClaimCelebration } from "@/components/notifications/EpochClaimCelebration";
import { CallProvider } from "@/contexts/CallContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { UpdateNotification } from "@/components/UpdateNotification";
import logger from "@/lib/logger";

import { usePendingDonationRecovery } from "@/hooks/usePendingDonationRecovery";
import { useNewMemberWelcome } from "@/hooks/useNewMemberWelcome";

// Lazy load pages for code splitting
const Auth = lazy(() => import("./pages/Auth"));
const Friends = lazy(() => import("./pages/Friends"));
const Profile = lazy(() => import("./pages/Profile"));
const Post = lazy(() => import("./pages/Post"));
const About = lazy(() => import("./pages/About"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const AdminMigration = lazy(() => import("./pages/AdminMigration"));
const Admin = lazy(() => import("./pages/Admin"));
const FounderDashboard = lazy(() => import("./pages/FounderDashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));
const LawOfLight = lazy(() => import("./pages/LawOfLight"));
const Notifications = lazy(() => import("./pages/Notifications"));
const DocsRouter = lazy(() => import("./pages/DocsRouter"));
const ConnectedApps = lazy(() => import("./pages/ConnectedApps"));
const SetPassword = lazy(() => import("./pages/SetPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Chat = lazy(() => import("./pages/Chat"));
const Install = lazy(() => import("./pages/Install"));
const SecuritySettings = lazy(() => import("./pages/SecuritySettings"));
const Settings = lazy(() => import("./pages/Settings"));
const Benefactors = lazy(() => import("./pages/Benefactors"));
const Donations = lazy(() => import("./pages/Donations"));
const Users = lazy(() => import("./pages/Users"));
const Reels = lazy(() => import("./pages/Reels"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const IdentityDashboard = lazy(() => import("./pages/identity/IdentityDashboard"));
const IdentityOnboarding = lazy(() => import("./pages/identity/IdentityOnboarding"));

const LiveDiscoveryPage = lazy(() => import("./pages/LiveDiscoveryPage"));
const LiveHostPage = lazy(() => import("./modules/live/pages/LiveHostPage").then(m => ({ default: m.default })));
const LiveAudiencePage = lazy(() => import("./modules/live/pages/LiveAudiencePage").then(m => ({ default: m.default })));
// LiveStream (legacy) removed — redirect handled below
const PreLivePage = lazy(() => import("./modules/live/pages/PreLivePage"));

const CHUNK_RELOAD_KEY = 'fun_profile_chunk_reload_at';
const CHUNK_RELOAD_COOLDOWN_MS = 15000;

function getChunkErrorMessage(reason: unknown) {
  if (reason instanceof Error) return `${reason.name}: ${reason.message}`;
  if (typeof reason === 'string') return reason;
  if (typeof reason === 'object' && reason !== null && 'message' in reason) {
    const message = (reason as { message?: unknown }).message;
    return typeof message === 'string' ? message : String(message ?? '');
  }
  return '';
}

function isDynamicImportError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('failed to fetch dynamically imported module') ||
    normalized.includes('importing a module script failed') ||
    normalized.includes('failed to load module script') ||
    normalized.includes('error loading dynamically imported module')
  );
}

function ChunkLoadRecovery() {
  useEffect(() => {
    const recover = (reason: unknown) => {
      const message = getChunkErrorMessage(reason);
      if (!isDynamicImportError(message)) return;

      const lastRecoveryAt = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) ?? '0');
      if (lastRecoveryAt && Date.now() - lastRecoveryAt < CHUNK_RELOAD_COOLDOWN_MS) {
        return;
      }

      sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
      window.location.reload();
    };

    const handleError = (event: ErrorEvent) => recover(event.error ?? event.message);
    const handleRejection = (event: PromiseRejectionEvent) => recover(event.reason);

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  return null;
}

// Keep auth session alive when user returns to tab
function AuthSessionKeeper() {
  useEffect(() => {
    let lastHiddenAt = 0;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && lastHiddenAt > 0) {
        const hiddenDuration = Date.now() - lastHiddenAt;
        // Skip refresh if a wallet transaction is being signed (mobile switches to wallet app)
        if (hiddenDuration >= 30000 && !(window as any).__TX_IN_PROGRESS__) {
          try {
            // Only refresh if there's an existing session and token is close to expiring
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const expiresAt = session.expires_at ?? 0; // unix seconds
            const secondsLeft = expiresAt - Math.floor(Date.now() / 1000);
            // Only refresh if token expires within 5 minutes
            if (secondsLeft > 300) {
              logger.debug('[AuthKeeper] Token still valid for', secondsLeft, 's, skipping refresh');
              return;
            }

            const tryRefresh = () => Promise.race([
              supabase.auth.refreshSession(),
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('timeout')), 20000)
              ),
            ]);
            try {
              await tryRefresh();
            } catch {
              // Retry once on failure
              await tryRefresh();
            }
            logger.debug('[AuthKeeper] Token refreshed after', Math.round(hiddenDuration / 1000), 's hidden');
          } catch (err) {
            console.warn('[AuthKeeper] Token refresh failed:', err);
          }
        }
      } else if (document.visibilityState === 'hidden') {
        lastHiddenAt = Date.now();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return null;
}

// Tự động recover pending donations bị gián đoạn khi user đăng nhập
function PendingDonationRecovery() {
  usePendingDonationRecovery();
  return null;
}

function NewMemberWelcome() {
  useNewMemberWelcome();
  return null;
}

// Loading fallback component with smooth animation
const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="flex flex-col items-center gap-4 animate-fade-in">
      <div className="w-10 h-10 md:w-12 md:h-12 border-3 md:border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-muted-foreground">Đang tải...</p>
    </div>
  </div>
);

function GlobalAudioBootstrap() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    registerAudioElement(audioRef.current);
    ensureAutoplay();
  }, []);

  return (
    <audio
      ref={audioRef}
      src="/sounds/light-economy-anthem.mp3"
      autoPlay
      loop
      preload="auto"
      playsInline
      className="hidden"
      aria-hidden="true"
    />
  );
}

function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          <GlobalAudioBootstrap />
          <Web3Provider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <ChunkLoadRecovery />
              <AuthSessionKeeper />
              <PendingDonationRecovery />
              <NewMemberWelcome />
              <BrowserRouter>
                <ScrollToTop />
                <CallProvider>
                  <Suspense fallback={<PageLoader />}>
                    <LawOfLightGuard>
                      <Routes>
                        <Route path="/begin" element={<Navigate to="/law-of-light" replace />} />
                        <Route path="/auth" element={<Auth />} />
                        <Route path="/set-password" element={<SetPassword />} />
                        <Route path="/reset-password" element={<ResetPassword />} />
                        <Route path="/verify-email" element={<VerifyEmail />} />
                        <Route path="/law-of-light" element={<LawOfLight />} />
                        <Route path="/" element={<Feed />} />
                        <Route path="/friends" element={<Friends />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/profile/:userId" element={<Profile />} />
                        <Route path="/profile/connected-apps" element={<ConnectedApps />} />
                        <Route path="/@:username" element={<Profile />} />
                        <Route path="/wallet/*" element={<Wallet />} />
                        <Route path="/post/:postId" element={<Post />} />
                        <Route path="/:username/post/:slug" element={<Post />} />
                        <Route path="/about" element={<About />} />
                        <Route path="/leaderboard" element={<Leaderboard />} />
                        <Route path="/admin/migration" element={<AdminMigration />} />
                        <Route path="/admin" element={<Admin />} />
                        <Route path="/founder" element={<FounderDashboard />} />
                        <Route path="/notifications" element={<Notifications />} />
                        <Route path="/chat" element={<Chat />} />
                        <Route path="/chat/:conversationId" element={<Chat />} />
                        <Route path="/identity" element={<IdentityDashboard />} />
                        <Route path="/identity/onboarding" element={<IdentityOnboarding />} />
                        <Route path="/docs/*" element={<DocsRouter />} />
                        <Route path="/install" element={<Install />} />
                        <Route path="/settings" element={<Settings />} />
                        <Route path="/settings/:tab" element={<Settings />} />
                        <Route path="/benefactors" element={<Benefactors />} />
                        <Route path="/donations" element={<Donations />} />
                        <Route path="/users" element={<Users />} />
                        <Route path="/reels" element={<Reels />} />
                        <Route path="/reels/:reelId" element={<Reels />} />
                        <Route path="/:username/video/:slug" element={<Reels />} />
                        <Route path="/mint" element={<Navigate to="/wallet/fun_money" replace />} />
                        <Route path="/live" element={<LiveDiscoveryPage />} />
                        <Route path="/live/setup" element={<PreLivePage />} />
                        <Route path="/live/new" element={<LiveHostPage />} />
                        <Route path="/live/stream" element={<Navigate to="/live/new" replace />} />
                        <Route path="/live/:liveSessionId" element={<LiveAudiencePage />} />
                        <Route path="/live/:liveSessionId/host" element={<LiveHostPage />} />
                        <Route path="/:username/live/:slug" element={<LiveAudiencePage />} />
                        {/* Dynamic username route - must be AFTER static routes */}
                        <Route path="/:username" element={<Profile />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </LawOfLightGuard>
                    <DonationReceivedNotification />
                    <RewardAdjustmentNotification />
                    <EpochClaimCelebration />
                    <UpdateNotification />
                  </Suspense>
                </CallProvider>
              </BrowserRouter>
            </TooltipProvider>
          </Web3Provider>
        </QueryClientProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;
