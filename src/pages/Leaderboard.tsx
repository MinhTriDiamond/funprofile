import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { FacebookNavbar } from '@/components/layout/FacebookNavbar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LightCommunityMember {
  user_id: string;
  username: string;
  avatar_url: string;
  light_level: string;
  light_emoji: string;
  trend: string;
  trend_emoji: string;
}

const getLevelColor = (level: string) => {
  switch (level) {
    case "Light Architect": return "bg-emerald-100 text-emerald-800 border-emerald-300";
    case "Light Guardian": return "bg-teal-100 text-teal-800 border-teal-300";
    case "Light Builder": return "bg-green-100 text-green-800 border-green-300";
    case "Light Sprout": return "bg-lime-100 text-lime-800 border-lime-300";
    default: return "bg-stone-100 text-stone-700 border-stone-300";
  }
};

const getTrendColor = (trend: string) => {
  switch (trend) {
    case "Growing": return "text-emerald-700";
    case "Reflecting": return "text-amber-700";
    default: return "text-muted-foreground";
  }
};

const Leaderboard = () => {
  const navigate = useNavigate();
  const [members, setMembers] = useState<LightCommunityMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLightCommunity();
  }, []);

  const fetchLightCommunity = async () => {
    try {
      const { data, error } = await supabase.rpc('get_light_community', { p_limit: 100 });
      if (error) throw error;
      if (data) {
        setMembers(data as LightCommunityMember[]);
      }
    } catch (error) {
      console.error('Error fetching light community:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  return (
    <div className="min-h-screen overflow-hidden">
      <FacebookNavbar />
      <main data-app-scroll className="fixed inset-x-0 top-[3cm] bottom-0 overflow-y-auto pb-20 lg:pb-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-[2cm] py-6">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-800 rounded-2xl p-8 mb-6 text-white text-center relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="absolute top-4 left-4 text-white hover:bg-white/20 rounded-full"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>

            <img
              src="/fun-profile-logo-40.webp"
              alt="Fun Profile Web3"
              width={64}
              height={64}
              className="w-16 h-16 mx-auto mb-4 rounded-full border-2 border-emerald-300/50"
            />
            <h1
              className="text-3xl font-black tracking-wider uppercase mb-2"
              style={{
                fontFamily: "'Orbitron', 'Rajdhani', sans-serif",
                textShadow: '0 0 20px rgba(52, 211, 153, 0.5)',
              }}
            >
              LIGHT COMMUNITY
            </h1>
            <p className="text-white/80">Cộng đồng ánh sáng của FUN Profile</p>
          </div>

          {/* Members List */}
          <div className="bg-white/80 rounded-xl shadow-sm overflow-hidden border border-emerald-500/20">
            <div className="p-4 border-b border-emerald-500/20">
              <h2 className="font-bold text-lg text-emerald-800">Thành viên cộng đồng</h2>
            </div>

            {loading ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="divide-y divide-emerald-500/10">
                {members.map((member) => (
                  <div
                    key={member.user_id}
                    onClick={() => handleUserClick(member.user_id)}
                    className="flex items-center justify-between gap-4 p-4 hover:bg-emerald-50/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="w-12 h-12 border-2 border-emerald-500/40">
                        <AvatarImage src={member.avatar_url} />
                        <AvatarFallback className="bg-emerald-500/10 text-emerald-800">
                          {member.username?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold truncate">{member.username}</span>
                        <span className={`text-xs ${getTrendColor(member.trend)}`}>
                          {member.trend_emoji} {member.trend}
                        </span>
                      </div>
                    </div>

                    <Badge className={`text-xs px-2.5 py-1 whitespace-nowrap ${getLevelColor(member.light_level)}`}>
                      {member.light_emoji} {member.light_level}
                    </Badge>
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
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
};

export default Leaderboard;
