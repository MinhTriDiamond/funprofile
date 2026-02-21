import { lazy, Suspense, useEffect } from "react";
import Feed from "./pages/Feed";
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
import { CallProvider } from "@/contexts/CallContext";
import { TetBackground } from "@/components/ui/TetBackground";
import { TetFlowerOverlay } from "@/components/ui/TetFlowerOverlay";
import { ValentineMusicButton } from "@/components/layout/ValentineMusicButton";
import { TetBackgroundProvider } from "@/contexts/TetBackgroundContext";
import { usePendingDonationRecovery } from "@/hooks/usePendingDonationRecovery";
// Lazy load pages for code splitting
const Auth = lazy(() => import("./pages/Auth"));
const Friends = lazy(() => import("./pages/Friends"));
const Profile = lazy(() => import("./pages/Profile"));
const Wallet = lazy(() => import("./pages/Wallet"));
const Post = lazy(() => import("./pages/Post"));
const About = lazy(() => import("./pages/About"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const AdminMigration = lazy(() => import("./pages/AdminMigration"));
const Admin = lazy(() => import("./pages/Admin"));
const NotFound = lazy(() => import("./pages/NotFound"));
const LawOfLight = lazy(() => import("./pages/LawOfLight"));
const Notifications = lazy(() => import("./pages/Notifications"));
const DocsRouter = lazy(() => import("./pages/DocsRouter"));
const ConnectedApps = lazy(() => import("./pages/ConnectedApps"));
const SetPassword = lazy(() => import("./pages/SetPassword"));
const Chat = lazy(() => import("./pages/Chat"));
const Install = lazy(() => import("./pages/Install"));
const Benefactors = lazy(() => import("./pages/Benefactors"));
const Donations = lazy(() => import("./pages/Donations"));
const Users = lazy(() => import("./pages/Users"));
const Reels = lazy(() => import("./pages/Reels"));
const Mint = lazy(() => import("./pages/Mint"));
const LiveDiscoveryPage = lazy(() => import("./pages/LiveDiscoveryPage"));
const LiveHostPage = lazy(() => import("./modules/live/pages/LiveHostPage").then(m => ({ default: m.default })));
const LiveAudiencePage = lazy(() => import("./modules/live/pages/LiveAudiencePage").then(m => ({ default: m.default })));
const LiveStream = lazy(() => import("./modules/live/pages/LiveStream").then(m => ({ default: m.default })));

// Keep auth session alive when user returns to tab
function AuthSessionKeeper() {
  useEffect(() => {
    let lastHiddenAt = 0;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && lastHiddenAt > 0) {
        const hiddenDuration = Date.now() - lastHiddenAt;
        if (hiddenDuration >= 30000) {
          try {
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
            console.log('[AuthKeeper] Token refreshed after', Math.round(hiddenDuration / 1000), 's hidden');
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

// Loading fallback component with smooth animation
const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="flex flex-col items-center gap-4 animate-fade-in">
      <div className="w-10 h-10 md:w-12 md:h-12 border-3 md:border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
);

function App() {
  return (
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <Web3Provider>
          <TetBackgroundProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AuthSessionKeeper />
            <PendingDonationRecovery />
          <BrowserRouter>
            <CallProvider>
            <TetBackground />
            <TetFlowerOverlay />
            {/* Global floating music button – visible on all pages including pre-login */}
            <div className="fixed bottom-36 right-4 z-50 lg:hidden">
              <ValentineMusicButton variant="mobile" />
            </div>
            <Suspense fallback={<PageLoader />}>
              <LawOfLightGuard>
                <Routes>
                  <Route path="/begin" element={<Navigate to="/law-of-light" replace />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/set-password" element={<SetPassword />} />
                  <Route path="/law-of-light" element={<LawOfLight />} />
                  <Route path="/" element={<Feed />} />
                  <Route path="/friends" element={<Friends />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/profile/:userId" element={<Profile />} />
                  <Route path="/profile/connected-apps" element={<ConnectedApps />} />
                  <Route path="/@:username" element={<Profile />} />
                  <Route path="/wallet/*" element={<Wallet />} />
                  <Route path="/post/:postId" element={<Post />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/leaderboard" element={<Leaderboard />} />
                  <Route path="/admin/migration" element={<AdminMigration />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/chat" element={<Chat />} />
                  <Route path="/chat/:conversationId" element={<Chat />} />
                  <Route path="/docs/*" element={<DocsRouter />} />
                  <Route path="/install" element={<Install />} />
                  <Route path="/benefactors" element={<Benefactors />} />
                  <Route path="/donations" element={<Donations />} />
                  <Route path="/users" element={<Users />} />
                  <Route path="/reels" element={<Reels />} />
                  <Route path="/reels/:reelId" element={<Reels />} />
                  <Route path="/mint" element={<Mint />} />
                  <Route path="/live" element={<LiveDiscoveryPage />} />
                  <Route path="/live/new" element={<LiveHostPage />} />
                  <Route path="/live/stream" element={<LiveStream />} />
                  <Route path="/live/:liveSessionId" element={<LiveAudiencePage />} />
                  <Route path="/live/:liveSessionId/host" element={<LiveHostPage />} />
                  {/* Dynamic username route - must be AFTER static routes */}
                  <Route path="/:username" element={<Profile />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </LawOfLightGuard>
              <DonationReceivedNotification />
            </Suspense>
            </CallProvider>
          </BrowserRouter>
        </TooltipProvider>
          </TetBackgroundProvider>
        </Web3Provider>
      </QueryClientProvider>
    </LanguageProvider>
  );
}

export default App;
