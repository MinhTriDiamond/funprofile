import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { uploadToR2, deleteFromR2 } from '@/utils/r2Upload';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Image, Video, X } from 'lucide-react';
import { z } from 'zod';
import { compressImage, FILE_LIMITS, getVideoDuration } from '@/utils/imageCompression';

const postSchema = z.object({
  content: z.string().max(20000, 'Post must be less than 20000 characters'),
});

interface EditPostDialogProps {
  post: {
    id: string;
    content: string;
    image_url: string | null;
    video_url?: string | null;
  };
  isOpen: boolean;
  onClose: () => void;
  onPostUpdated: () => void;
}

export const EditPostDialog = ({ post, isOpen, onClose, onPostUpdated }: EditPostDialogProps) => {
  const [content, setContent] = useState(post.content);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(post.image_url);
  const [videoPreview, setVideoPreview] = useState<string | null>(post.video_url);
  const [loading, setLoading] = useState(false);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > FILE_LIMITS.IMAGE_MAX_SIZE) {
        toast.error('Image must be less than 100MB');
        return;
      }

      try {
        toast.loading('Compressing image...');
        const compressed = await compressImage(file, {
          maxWidth: FILE_LIMITS.POST_IMAGE_MAX_WIDTH,
          maxHeight: FILE_LIMITS.POST_IMAGE_MAX_HEIGHT,
          quality: 0.85,
        });
        toast.dismiss();
        
        setImageFile(compressed);
        setImagePreview(URL.createObjectURL(compressed));
        setVideoFile(null);
        setVideoPreview(null);
      } catch (error) {
        toast.dismiss();
        toast.error('Failed to process image');
      }
    }
  };

  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > FILE_LIMITS.VIDEO_MAX_SIZE) {
        toast.error('Video must be less than 2GB');
        return;
      }

      try {
        const duration = await getVideoDuration(file);
        if (duration > FILE_LIMITS.VIDEO_MAX_DURATION) {
          toast.error('Video must be less than 120 minutes');
          return;
        }
      } catch (err) {
        console.error('Error checking video duration:', err);
      }

      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
      setImageFile(null);
      setImagePreview(null);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const removeVideo = () => {
    setVideoFile(null);
    setVideoPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !imageFile && !videoFile && !imagePreview && !videoPreview) {
      toast.error('Please add some content');
      return;
    }

    // Validate content length
    const validation = postSchema.safeParse({ content: content.trim() });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setLoading(true);
    try {
      let imageUrl = imagePreview;
      let videoUrl = videoPreview;

      // Upload new image if selected
      if (imageFile) {
        const result = await uploadToR2(imageFile, 'posts');
        imageUrl = result.url;
        
        // Delete old image from R2 if exists and it's different
        if (post.image_url && post.image_url !== result.url) {
          try {
            const oldKey = post.image_url.split('/').slice(-2).join('/');
            await deleteFromR2(oldKey);
          } catch (error) {
            console.error('Error deleting old image:', error);
          }
        }
      }

      // Upload new video if selected
      if (videoFile) {
        const result = await uploadToR2(videoFile, 'videos');
        videoUrl = result.url;
        
        // Delete old video from R2 if exists and it's different
        if (post.video_url && post.video_url !== result.url) {
          try {
            const oldKey = post.video_url.split('/').slice(-2).join('/');
            await deleteFromR2(oldKey);
          } catch (error) {
            console.error('Error deleting old video:', error);
          }
        }
      }

      // Update post
      const { error } = await supabase
        .from('posts')
        .update({
          content,
          image_url: imageUrl,
          video_url: videoUrl,
        })
        .eq('id', post.id);

      if (error) throw error;

      toast.success('Post updated successfully');
      onPostUpdated();
      onClose();
    } catch (error: any) {
      toast.error('Failed to update post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Post</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[120px] resize-none"
          />

          {imagePreview && !videoPreview && (
            <div className="relative">
              <img src={imagePreview} alt="Preview" className="w-full rounded-lg" />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={removeImage}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {videoPreview && !imagePreview && (
            <div className="relative">
              <video src={videoPreview} controls className="w-full rounded-lg" />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={removeVideo}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" className="flex-1" asChild>
              <label>
                <Image className="w-4 h-4 mr-2" />
                {imagePreview ? 'Change Image' : 'Add Image'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            </Button>
            <Button type="button" variant="outline" size="sm" className="flex-1" asChild>
              <label>
                <Video className="w-4 h-4 mr-2" />
                {videoPreview ? 'Change Video' : 'Add Video'}
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoChange}
                  className="hidden"
                />
              </label>
            </Button>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Post'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
