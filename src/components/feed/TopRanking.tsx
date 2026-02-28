import { useEffect, useState, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";

interface LightCommunityMember {
  user_id: string;
  username: string;
  avatar_url: string;
  light_level: string;
  light_emoji: string;
  trend: string;
  trend_emoji: string;
}

export const TopRanking = memo(() => {
  const navigate = useNavigate();
  const [members, setMembers] = useState<LightCommunityMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLightCommunity();
  }, []);

  const fetchLightCommunity = async () => {
    try {
      const { data, error } = await supabase.rpc("get_light_community", { p_limit: 10 });
      if (error) throw error;
      if (data) {
        setMembers(data as LightCommunityMember[]);
      }
    } catch (error) {
      console.error("Error fetching light community:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
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

  const MemberRow = ({ member }: { member: LightCommunityMember }) => (
    <div
      onClick={() => handleUserClick(member.user_id)}
      className="border-b border-emerald-500/20 last:border-b-0 py-2.5 first:pt-1 last:pb-1 bg-white/60 hover:bg-white/80 transition-all cursor-pointer px-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Avatar className="w-8 h-8 border-2 border-emerald-500/40">
            <AvatarImage src={member.avatar_url} />
            <AvatarFallback className="text-xs bg-emerald-500/10 text-primary">
              {member.username?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <span className="text-primary text-sm font-medium truncate max-w-[100px]">
              {member.username}
            </span>
            <span className={`text-[11px] ${getTrendColor(member.trend)}`}>
              {member.trend_emoji} {member.trend}
            </span>
          </div>
        </div>
        <Badge className={`text-[10px] px-2 py-0.5 ${getLevelColor(member.light_level)}`}>
          {member.light_emoji} {member.light_level}
        </Badge>
      </div>
    </div>
  );

  return (
    <div className="rounded-2xl overflow-hidden border-2 border-emerald-500/40 bg-card/70 shadow-lg">
      <div className="relative p-3 space-y-2">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="inline-block">
            <img
              src="/fun-profile-logo-40.webp"
              alt="Fun Profile Web3"
              width={48}
              height={48}
              className="w-12 h-12 mx-auto rounded-full border border-emerald-500/50"
            />
          </div>
          <h2
            className="text-[20px] font-black tracking-wider uppercase"
            style={{
              fontFamily: "'Orbitron', 'Rajdhani', sans-serif",
              background: 'linear-gradient(90deg, #34d399 0%, #10b981 30%, #059669 60%, #047857 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(1px 1px 0px rgba(255,255,255,0.3)) drop-shadow(0 0 8px rgba(52, 211, 153, 0.4))',
            }}
          >
            LIGHT COMMUNITY
          </h2>
        </div>

        {/* Members list */}
        <div className="grid grid-cols-1 gap-0 rounded-lg border border-emerald-500/20 overflow-hidden">
          {members.map((member) => (
            <MemberRow key={member.user_id} member={member} />
          ))}
          {members.length === 0 && (
            <div className="text-center py-4 text-muted-foreground text-sm">
              Chưa có dữ liệu cộng đồng
            </div>
          )}
        </div>

        {/* CTA Button */}
        <Button
          onClick={() => navigate("/leaderboard")}
          className="w-full mt-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold transition-all group border border-emerald-500/50"
        >
          Khám phá cộng đồng ánh sáng
          <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </div>
  );
});

TopRanking.displayName = "TopRanking";
