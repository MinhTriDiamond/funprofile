import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FollowButton } from './FollowButton';
import type { Reel } from '@/hooks/useReels';

interface ReelInfoProps {
  reel: Reel;
}

const ReelInfo = ({ reel }: ReelInfoProps) => {
  const navigate = useNavigate();
  const profile = reel.profiles;

  return (
    <div className="absolute bottom-20 left-4 right-20 z-10">
      {/* Creator info */}
      <div className="flex items-center gap-3 mb-3">
        <button onClick={() => navigate(`/profile/${profile.id}`)}>
          <Avatar className="w-10 h-10 border-2 border-white/50">
            <AvatarImage src={profile.avatar_url || ''} />
            <AvatarFallback className="text-xs bg-primary text-primary-foreground">
              {profile.username?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </button>
        <button
          onClick={() => navigate(`/profile/${profile.id}`)}
          className="text-white font-semibold text-sm drop-shadow-lg"
        >
          @{profile.username}
        </button>
        <FollowButton userId={profile.id} />
      </div>

      {/* Caption */}
      {reel.caption && (
        <p className="text-white text-sm drop-shadow-lg line-clamp-3">{reel.caption}</p>
      )}

      {/* Audio info */}
      {reel.audio_name && (
        <div className="flex items-center gap-2 mt-2">
          <span className="text-white/70 text-xs">🎵 {reel.audio_name}{reel.audio_artist ? ` - ${reel.audio_artist}` : ''}</span>
        </div>
      )}
    </div>
  );
};

export default ReelInfo;
