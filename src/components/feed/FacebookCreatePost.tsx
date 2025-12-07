import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { uploadToR2 } from '@/utils/r2Upload';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ImagePlus, Video, Smile, MapPin, UserPlus, MoreHorizontal, X, Loader2 } from 'lucide-react';
import { compressImage, FILE_LIMITS, getVideoDuration } from '@/utils/imageCompression';

interface FacebookCreatePostProps {
  onPostCreated: () => void;
}

export const FacebookCreatePost = ({ onPostCreated }: FacebookCreatePostProps) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setProfile(data);
      }
    };
    fetchProfile();
  }, []);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > FILE_LIMITS.IMAGE_MAX_SIZE) {
        toast.error('Ảnh phải nhỏ hơn 5MB');
        return;
      }
      
      try {
        const compressed = await compressImage(file, {
          maxWidth: FILE_LIMITS.POST_IMAGE_MAX_WIDTH,
          maxHeight: FILE_LIMITS.POST_IMAGE_MAX_HEIGHT,
          quality: 0.85,
        });
        
        setImage(compressed);
        setImagePreview(URL.createObjectURL(compressed));
        setVideo(null);
        setVideoPreview(null);
      } catch (error) {
        toast.error('Không thể xử lý ảnh');
      }
    }
  };

  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > FILE_LIMITS.VIDEO_MAX_SIZE) {
        toast.error('Video phải nhỏ hơn 20MB');
        return;
      }

      try {
        const duration = await getVideoDuration(file);
        if (duration > FILE_LIMITS.VIDEO_MAX_DURATION) {
          toast.error('Video phải ngắn hơn 3 phút');
          return;
        }
      } catch (err) {
        console.error('Error checking video duration:', err);
      }

      setVideo(file);
      setVideoPreview(URL.createObjectURL(file));
      setImage(null);
      setImagePreview(null);
    }
  };

  const removeMedia = () => {
    setImage(null);
    setImagePreview(null);
    setVideo(null);
    setVideoPreview(null);
  };

  const handleSubmit = async () => {
    if (!content.trim() && !image && !video) {
      toast.error('Vui lòng thêm nội dung, ảnh hoặc video');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Chưa đăng nhập');

      let imageUrl = null;
      let videoUrl = null;

      if (image) {
        const result = await uploadToR2(image, 'posts');
        imageUrl = result.url;
      }

      if (video) {
        const result = await uploadToR2(video, 'videos');
        videoUrl = result.url;
      }

      const { error } = await supabase.from('posts').insert({
        user_id: user.id,
        content: content.trim() || '',
        image_url: imageUrl,
        video_url: videoUrl,
      });

      if (error) throw error;
      
      setContent('');
      removeMedia();
      setIsDialogOpen(false);
      toast.success('Đã đăng bài viết!');
      onPostCreated();
    } catch (error: any) {
      toast.error(error.message || 'Không thể đăng bài');
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return null;

  return (
    <>
      {/* Create Post Card */}
      <div className="fb-card p-4 mb-4">
        <div className="flex items-center gap-3">
          <Avatar 
            className="w-10 h-10 cursor-pointer"
            onClick={() => navigate(`/profile/${profile.id}`)}
          >
            <AvatarImage src={profile.avatar_url || ''} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {profile.username?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <button
            onClick={() => setIsDialogOpen(true)}
            className="flex-1 text-left px-4 py-2.5 bg-secondary hover:bg-muted rounded-full text-muted-foreground transition-colors"
          >
            {profile.full_name || profile.username} ơi, bạn đang nghĩ gì thế?
          </button>
        </div>

        <div className="border-t border-border mt-3 pt-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsDialogOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <Video className="w-6 h-6 text-red-500" />
              <span className="font-semibold text-muted-foreground text-sm hidden sm:inline">Video trực tiếp</span>
            </button>
            <button
              onClick={() => setIsDialogOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <ImagePlus className="w-6 h-6 text-primary" />
              <span className="font-semibold text-muted-foreground text-sm hidden sm:inline">Ảnh/video</span>
            </button>
            <button
              onClick={() => setIsDialogOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <Smile className="w-6 h-6 text-gold" />
              <span className="font-semibold text-muted-foreground text-sm hidden sm:inline">Cảm xúc/hoạt động</span>
            </button>
          </div>
        </div>
      </div>

      {/* Create Post Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] p-0">
          <DialogHeader className="p-4 border-b border-border">
            <DialogTitle className="text-center text-xl font-bold">Tạo bài viết</DialogTitle>
          </DialogHeader>

          <div className="p-4">
            {/* User Info */}
            <div className="flex items-center gap-3 mb-4">
              <Avatar className="w-10 h-10">
                <AvatarImage src={profile.avatar_url || ''} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {profile.username?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{profile.full_name || profile.username}</p>
                <Button variant="secondary" size="sm" className="h-6 text-xs mt-1">
                  🌍 Công khai
                </Button>
              </div>
            </div>

            {/* Content Input */}
            <Textarea
              placeholder={`${profile.full_name || profile.username} ơi, bạn đang nghĩ gì thế?`}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[120px] resize-none border-0 focus-visible:ring-0 text-xl placeholder:text-muted-foreground"
              disabled={loading}
            />

            {/* Media Preview */}
            {imagePreview && (
              <div className="relative mt-4 rounded-lg overflow-hidden border border-border">
                <img src={imagePreview} alt="Preview" className="w-full max-h-80 object-contain" />
                <button
                  onClick={removeMedia}
                  className="absolute top-2 right-2 w-8 h-8 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center"
                  disabled={loading}
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            )}

            {videoPreview && (
              <div className="relative mt-4 rounded-lg overflow-hidden border border-border">
                <video src={videoPreview} controls className="w-full max-h-80" />
                <button
                  onClick={removeMedia}
                  className="absolute top-2 right-2 w-8 h-8 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center"
                  disabled={loading}
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            )}

            {/* Add to Post */}
            <div className="mt-4 border border-border rounded-lg p-3 flex items-center justify-between">
              <span className="font-semibold text-sm">Thêm vào bài viết của bạn</span>
              <div className="flex items-center gap-2">
                <Input
                  id="create-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  disabled={loading}
                />
                <button
                  onClick={() => document.getElementById('create-image')?.click()}
                  className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center"
                  disabled={loading}
                >
                  <ImagePlus className="w-6 h-6 text-primary" />
                </button>
                
                <Input
                  id="create-video"
                  type="file"
                  accept="video/*"
                  onChange={handleVideoChange}
                  className="hidden"
                  disabled={loading}
                />
                <button
                  onClick={() => document.getElementById('create-video')?.click()}
                  className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center"
                  disabled={loading}
                >
                  <Video className="w-6 h-6 text-red-500" />
                </button>
                
                <button className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center">
                  <UserPlus className="w-6 h-6 text-blue-500" />
                </button>
                <button className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center">
                  <Smile className="w-6 h-6 text-gold" />
                </button>
                <button className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-red-400" />
                </button>
                <button className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center">
                  <MoreHorizontal className="w-6 h-6 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={loading || (!content.trim() && !image && !video)}
              className="w-full mt-4 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {loading ? 'Đang đăng...' : 'Đăng'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
