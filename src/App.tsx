import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { LawOfLightGuard } from "@/components/auth/LawOfLightGuard";

// Lazy load pages for code splitting
const Auth = lazy(() => import("./pages/Auth"));
const Feed = lazy(() => import("./pages/Feed"));
const Friends = lazy(() => import("./pages/Friends"));
const Profile = lazy(() => import("./pages/Profile"));
const Wallet = lazy(() => import("./pages/Wallet"));
const Post = lazy(() => import("./pages/Post"));
const About = lazy(() => import("./pages/About"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const AdminMigration = lazy(() => import("./pages/AdminMigration"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminEdgeFunctionTest = lazy(() => import("./pages/AdminEdgeFunctionTest"));
const NotFound = lazy(() => import("./pages/NotFound"));
const LawOfLight = lazy(() => import("./pages/LawOfLight"));
const Notifications = lazy(() => import("./pages/Notifications"));
const MediaTestSandbox = lazy(() => import("./pages/MediaTestSandbox"));
const DocsRouter = lazy(() => import("./pages/DocsRouter"));

// Optimized QueryClient with caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (was cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

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
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <LawOfLightGuard>
                <Routes>
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/law-of-light" element={<LawOfLight />} />
                  <Route path="/" element={<Feed />} />
                  <Route path="/friends" element={<Friends />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/profile/:userId" element={<Profile />} />
                  <Route path="/@:username" element={<Profile />} />
                  <Route path="/wallet" element={<Wallet />} />
                  <Route path="/post/:postId" element={<Post />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/leaderboard" element={<Leaderboard />} />
                  <Route path="/admin/migration" element={<AdminMigration />} />
                  <Route path="/admin/media-test" element={<MediaTestSandbox />} />
                  <Route path="/admin/edge-test" element={<AdminEdgeFunctionTest />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/docs/*" element={<DocsRouter />} />
                  <Route path="/app-documentation" element={<Navigate to="/docs/platform" replace />} />
                  {/* Dynamic username route - must be AFTER static routes */}
                  <Route path="/:username" element={<Profile />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </LawOfLightGuard>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </LanguageProvider>
  );
}

export default App;
