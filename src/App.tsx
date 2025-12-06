import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { config } from "./config/web3";
import "@rainbow-me/rainbowkit/styles.css";

// Pages
import Auth from "./pages/Auth";
import Feed from "./pages/Feed";
import Friends from "./pages/Friends";
import Profile from "./pages/Profile";
import Wallet from "./pages/Wallet";
import Post from "./pages/Post";
import About from "./pages/About";
import Leaderboard from "./pages/Leaderboard";
import AdminMigration from "./pages/AdminMigration";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        <RainbowKitProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/" element={<Feed />} />
                <Route path="/friends" element={<Friends />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/profile/:userId" element={<Profile />} />
                <Route path="/wallet" element={<Wallet />} />
                <Route path="/post/:postId" element={<Post />} />
                <Route path="/about" element={<About />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/admin/migration" element={<AdminMigration />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </RainbowKitProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}

export default App;
