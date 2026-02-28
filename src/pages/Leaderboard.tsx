import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { FacebookNavbar } from '@/components/layout/FacebookNavbar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Landmark, RefreshCw, Sparkles, Users } from 'lucide-react';


interface LightCommunityMember {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  light_level: string;
  light_emoji: string;
  trend: string;
  trend_emoji: string;
}

const getEmojiContainerStyle = (level: string) => {
  if (level === "Light Architect") return "bg-amber-100 border border-amber-400";
  return "bg-muted";
};

const getLevelStyle = (level: string) => {
  switch (level) {
    case "Light Architect": return "border-amber-500 text-amber-700 bg-amber-50/50";
    case "Light Guardian": return "border-rose-400 text-rose-600 bg-rose-50/50";
    case "Light Builder": return "border-emerald-400 text-emerald-600 bg-emerald-50/50";
    case "Light Sprout": return "border-sky-400 text-sky-600 bg-sky-50/50";
    default: return "border-stone-300 text-stone-500 bg-stone-50/50";
  }
};

const Leaderboard = () => {
  const navigate = useNavigate();
  const [members, setMembers] = useState<LightCommunityMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchLightCommunity();
  }, []);

  const fetchLightCommunity = async () => {
    try {
      const { data, error } = await supabase.rpc('get_light_community', { p_limit: 1000 });
      if (error) throw error;
      if (data) {
        setMembers(data as LightCommunityMember[]);
      }
    } catch (error) {
      console.error('Error fetching light community:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLightCommunity();
  };

  const handleUserClick = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  return (
    <div className="min-h-screen overflow-hidden bg-background">
      <FacebookNavbar />
      <main data-app-scroll className="fixed inset-x-0 top-[3cm] bottom-0 overflow-y-auto pb-20 lg:pb-0">
        <div className="max-w-2xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => navigate(-1)} className="p-1 hover:opacity-70 transition-opacity">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <button onClick={handleRefresh} disabled={refreshing} className="p-1 hover:opacity-70 transition-opacity disabled:opacity-50">
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h1
                  className="text-2xl font-black tracking-wider uppercase"
                  style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    background: 'linear-gradient(90deg, #FF6B9D 0%, #C44FE2 15%, #7B68EE 30%, #00CED1 50%, #98FB98 70%, #FFFF00 85%, #FFB347 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  LIGHT COMMUNITY
                </h1>
                <Users className="w-5 h-5 text-emerald-500" />
              </div>
              <p className="text-sm text-muted-foreground">
                Những người đóng góp bền vững trong hệ sinh thái FUN Profile
              </p>
            </div>
          </div>

          {/* Members List */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.user_id}
                  onClick={() => handleUserClick(member.user_id)}
                  className="flex items-center gap-3 p-4 bg-card rounded-xl border shadow-sm hover:shadow-md transition-all cursor-pointer"
                >
                  {/* Light emoji icon */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 ${getEmojiContainerStyle(member.light_level)}`}>
                    {member.light_level === "Light Architect" ? (
                      <Landmark className="w-5 h-5 text-emerald-600" />
                    ) : (
                      member.light_emoji
                    )}
                  </div>

                  {/* Avatar */}
                  <Avatar className="w-11 h-11 shrink-0">
                    <AvatarImage src={member.avatar_url} />
                    <AvatarFallback className="bg-muted">
                      {member.username?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  {/* Name + username */}
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-semibold text-sm truncate">
                      {member.display_name || member.username}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      @{member.username}
                    </span>
                  </div>

                  {/* Light Level badge - outlined */}
                  <span className={`text-[11px] font-medium px-3 py-1 rounded-full border whitespace-nowrap shrink-0 ${getLevelStyle(member.light_level)}`}>
                    {member.light_level}
                  </span>
                </div>
              ))}
              {members.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Chưa có dữ liệu cộng đồng
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
};

export default Leaderboard;
