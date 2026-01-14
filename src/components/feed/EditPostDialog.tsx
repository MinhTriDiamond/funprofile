import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { uploadToR2, deleteFromR2 } from '@/utils/r2Upload';
import { deleteStreamVideoByUid, extractStreamUid } from '@/utils/streamHelpers';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Image, Video, X, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { compressImage, FILE_LIMITS, getVideoDuration } from '@/utils/imageCompression';
import { VideoUploaderUppy } from './VideoUploaderUppy';

const MAX_CONTENT_LENGTH = 20000;

const postSchema = z.object({
  content: z.string().max(MAX_CONTENT_LENGTH, `Post must be less than ${MAX_CONTENT_LENGTH.toLocaleString()} characters`),
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
  const [imagePreview, setImagePreview] = useState<string | null>(post.image_url);
  const [videoPreview, setVideoPreview] = useState<string | null>(post.video_url || null);
  const [loading, setLoading] = useState(false);
  
  // Uppy video upload state
  const [pendingVideoFile, setPendingVideoFile] = useState<File | null>(null);
  const [uppyVideoResult, setUppyVideoResult] = useState<{ uid: string; url: string; thumbnailUrl: string } | null>(null);
  const [isVideoUploading, setIsVideoUploading] = useState(false);

  // Reset state when post changes
  useEffect(() => {
    setContent(post.content);
    setImageFile(null);
    setImagePreview(post.image_url);
    setVideoPreview(post.video_url || null);
    setPendingVideoFile(null);
    setUppyVideoResult(null);
    setIsVideoUploading(false);
  }, [post.id, post.content, post.image_url, post.video_url]);

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
        // Clear video when adding image
        setVideoPreview(null);
        setPendingVideoFile(null);
        setUppyVideoResult(null);
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

      // Use Uppy for video upload (consistent with CreatePost)
      setPendingVideoFile(file);
      setIsVideoUploading(true);
      // Clear image when adding video
      setImageFile(null);
      setImagePreview(null);
      setVideoPreview(null);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const removeVideo = () => {
    // If we have an Uppy video result, delete it from Stream
    if (uppyVideoResult?.uid) {
      deleteStreamVideoByUid(uppyVideoResult.uid);
    }
    setPendingVideoFile(null);
    setUppyVideoResult(null);
    setVideoPreview(null);
    setIsVideoUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if video is still uploading
    if (isVideoUploading) {
      toast.error('Vui lòng đợi video upload xong');
      return;
    }
    
    if (!content.trim() && !imageFile && !imagePreview && !videoPreview && !uppyVideoResult) {
      toast.error('Please add some content');
      return;
    }

    // Check content length
    if (content.length > MAX_CONTENT_LENGTH) {
      toast.error(`Nội dung quá dài (${content.length.toLocaleString()}/${MAX_CONTENT_LENGTH.toLocaleString()} ký tự)`);
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

      // Use Uppy video result if available
      if (uppyVideoResult) {
        videoUrl = uppyVideoResult.url;
        
        // Delete old video from Stream if it was a Stream URL
        if (post.video_url) {
          const oldUid = extractStreamUid(post.video_url);
          if (oldUid && oldUid !== uppyVideoResult.uid) {
            try {
              await deleteStreamVideoByUid(oldUid);
            } catch (error) {
              console.error('Error deleting old video from Stream:', error);
            }
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
      console.error('Error updating post:', error);
      toast.error(error.message || 'Failed to update post');
    } finally {
      setLoading(false);
    }
  };

  const isOverLimit = content.length > MAX_CONTENT_LENGTH;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Post</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Textarea
              placeholder="What's on your mind?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[120px] resize-none"
              disabled={loading}
            />
            {/* Character Counter */}
            <div className={`text-xs text-right mt-1 ${
              isOverLimit ? 'text-destructive font-semibold' :
              content.length > MAX_CONTENT_LENGTH * 0.9 ? 'text-yellow-500' :
              content.length > MAX_CONTENT_LENGTH * 0.8 ? 'text-yellow-600/70' : 'text-muted-foreground'
            }`}>
              {content.length.toLocaleString()}/{MAX_CONTENT_LENGTH.toLocaleString()}
            </div>
          </div>

          {/* Uppy Video Uploader */}
          {pendingVideoFile && (
            <div className="mb-3">
              <VideoUploaderUppy
                selectedFile={pendingVideoFile}
                onUploadComplete={(result) => {
                  setUppyVideoResult(result);
                  setIsVideoUploading(false);
                  setPendingVideoFile(null);
                  setVideoPreview(result.url);
                }}
                onUploadError={() => {
                  setIsVideoUploading(false);
                  setPendingVideoFile(null);
                  toast.error('Video upload failed');
                }}
                onUploadStart={() => setIsVideoUploading(true)}
                onRemove={() => {
                  setPendingVideoFile(null);
                  setUppyVideoResult(null);
                  setIsVideoUploading(false);
                }}
                disabled={loading}
              />
            </div>
          )}

          {/* Show uploaded video preview */}
          {(videoPreview || uppyVideoResult) && !pendingVideoFile && (
            <div className="relative">
              <video 
                src={uppyVideoResult?.url || videoPreview || ''} 
                controls 
                className="w-full rounded-lg" 
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={removeVideo}
                disabled={loading}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {imagePreview && !videoPreview && !uppyVideoResult && !pendingVideoFile && (
            <div className="relative">
              <img src={imagePreview} alt="Preview" className="w-full rounded-lg" />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={removeImage}
                disabled={loading}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          <div className="flex gap-2">
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              className="flex-1" 
              asChild
              disabled={loading || isVideoUploading}
            >
              <label>
                <Image className="w-4 h-4 mr-2" />
                {imagePreview ? 'Change Image' : 'Add Image'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  disabled={loading || isVideoUploading}
                />
              </label>
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              className="flex-1" 
              asChild
              disabled={loading || isVideoUploading}
            >
              <label>
                <Video className="w-4 h-4 mr-2" />
                {videoPreview || uppyVideoResult ? 'Change Video' : 'Add Video'}
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoChange}
                  className="hidden"
                  disabled={loading || isVideoUploading}
                />
              </label>
            </Button>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading || isVideoUploading}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || isVideoUploading || isOverLimit}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isVideoUploading ? 'Uploading video...' : loading ? 'Updating...' : 'Update Post'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
