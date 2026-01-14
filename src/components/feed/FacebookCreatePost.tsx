import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { uploadToR2 } from '@/utils/r2Upload';
import { deleteStreamVideoByUid } from '@/utils/streamHelpers';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { ImagePlus, Video, X, Loader2, Globe, Users, Lock, ChevronDown, UserPlus, MapPin, MoreHorizontal, CheckCircle } from 'lucide-react';
import { compressImage, FILE_LIMITS, getVideoDuration } from '@/utils/imageCompression';
import { EmojiPicker } from './EmojiPicker';
import { VideoUploadProgress, VideoUploadState } from './VideoUploadProgress';
import { VideoUploaderUppy } from './VideoUploaderUppy';
import { useLanguage } from '@/i18n/LanguageContext';

interface FacebookCreatePostProps {
  onPostCreated: () => void;
}

interface MediaItem {
  file: File;
  preview: string;
  type: 'image' | 'video';
}

const MAX_CONTENT_LENGTH = 20000;

const postSchema = z.object({
  content: z.string().max(MAX_CONTENT_LENGTH, `Nội dung tối đa ${MAX_CONTENT_LENGTH.toLocaleString()} ký tự`),
});

export const FacebookCreatePost = ({ onPostCreated }: FacebookCreatePostProps) => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [profile, setProfile] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [privacy, setPrivacy] = useState('public');
  const [isDragging, setIsDragging] = useState(false);
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const [videoUploadState, setVideoUploadState] = useState<VideoUploadState>('idle');
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [currentVideoName, setCurrentVideoName] = useState('');
  const [currentVideoId, setCurrentVideoId] = useState<string | undefined>(undefined);
  
  // Uppy video upload state
  const [pendingVideoFile, setPendingVideoFile] = useState<File | null>(null);
  const [uppyVideoResult, setUppyVideoResult] = useState<{ uid: string; url: string; thumbnailUrl: string; localThumbnail?: string } | null>(null);
  const [isVideoUploading, setIsVideoUploading] = useState(false);
  
  // Enhanced upload progress state
  const [uploadDetails, setUploadDetails] = useState({
    bytesUploaded: 0,
    bytesTotal: 0,
    uploadSpeed: 0,
    eta: 0,
    processingState: undefined as string | undefined,
    processingProgress: undefined as number | undefined,
  });

  // Prevent accidental tab close during upload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (videoUploadState === 'uploading' || videoUploadState === 'processing') {
        e.preventDefault();
        e.returnValue = 'Video đang được tải lên. Bạn có chắc muốn rời đi?';
        return e.returnValue;
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [videoUploadState]);
  const PRIVACY_OPTIONS = [
    { value: 'public', label: language === 'vi' ? 'Công khai' : 'Public', icon: Globe, description: language === 'vi' ? 'Tất cả mọi người' : 'Everyone' },
    { value: 'friends', label: t('friends'), icon: Users, description: language === 'vi' ? 'Bạn bè của bạn' : 'Your friends' },
    { value: 'private', label: language === 'vi' ? 'Chỉ mình tôi' : 'Only me', icon: Lock, description: language === 'vi' ? 'Chỉ bạn' : 'Only you' },
  ];

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

  const handleFileSelect = async (files: FileList | null) => {
    if (!files) return;

    const newMediaItems: MediaItem[] = [];

    for (const file of Array.from(files)) {
      if (mediaItems.length + newMediaItems.length >= 80) {
        toast.error('Tối đa 80 file mỗi bài viết');
        break;
      }

      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');

      if (!isImage && !isVideo) {
        toast.error(`File "${file.name}" không được hỗ trợ`);
        continue;
      }

      if (isImage && file.size > FILE_LIMITS.IMAGE_MAX_SIZE) {
        toast.error(`Ảnh "${file.name}" phải nhỏ hơn 100MB`);
        continue;
      }

      if (isVideo && file.size > FILE_LIMITS.VIDEO_MAX_SIZE) {
        toast.error(`Video "${file.name}" phải nhỏ hơn 2GB`);
        continue;
      }

      try {
        if (isVideo) {
          const duration = await getVideoDuration(file);
          if (duration > FILE_LIMITS.VIDEO_MAX_DURATION) {
            toast.error(`Video "${file.name}" phải ngắn hơn 120 phút`);
            continue;
          }
          // Use Uppy for video uploads - set pending file and start upload
          setPendingVideoFile(file);
          setCurrentVideoName(file.name);
          setIsVideoUploading(true);
          setShowMediaUpload(true);
          continue; // Don't add to mediaItems - Uppy handles it
        }

        let processedFile = file;
        if (isImage) {
          processedFile = await compressImage(file, {
            maxWidth: FILE_LIMITS.POST_IMAGE_MAX_WIDTH,
            maxHeight: FILE_LIMITS.POST_IMAGE_MAX_HEIGHT,
            quality: 0.85,
          });
        }

        newMediaItems.push({
          file: processedFile,
          preview: URL.createObjectURL(processedFile),
          type: isImage ? 'image' : 'video',
        });
      } catch (error) {
        toast.error(`Không thể xử lý file "${file.name}"`);
      }
    }

    if (newMediaItems.length > 0) {
      setMediaItems((prev) => [...prev, ...newMediaItems]);
      setShowMediaUpload(true);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, [mediaItems.length]);

  const removeMedia = (index: number) => {
    setMediaItems((prev) => {
      const newItems = [...prev];
      URL.revokeObjectURL(newItems[index].preview);
      newItems.splice(index, 1);
      return newItems;
    });
  };

  const handleEmojiSelect = (emoji: string) => {
    setContent((prev) => prev + emoji);
  };

  // Submit step state for detailed feedback
  const [submitStep, setSubmitStep] = useState<'idle' | 'auth' | 'prepare_media' | 'saving' | 'done'>('idle');
  const submitAbortRef = useRef<AbortController | null>(null);

  const getSubmitButtonText = () => {
    if (isVideoUploading) return 'Đang upload video...';
    switch (submitStep) {
      case 'auth': return 'Đang xác thực...';
      case 'prepare_media': return 'Đang chuẩn bị media...';
      case 'saving': return 'Đang lưu bài viết...';
      default: return loading ? 'Đang đăng...' : 'Đăng';
    }
  };

  const handleCancelSubmit = () => {
    if (submitAbortRef.current) {
      submitAbortRef.current.abort();
    }
    setLoading(false);
    setSubmitStep('idle');
    toast.info('Đã huỷ đăng bài');
  };

  const handleSubmit = async () => {
    console.log('[CreatePost] === SUBMIT START ===', {
      contentLength: content.length,
      mediaCount: mediaItems.length,
      hasUppyVideo: !!uppyVideoResult,
      isVideoUploading,
    });
    
    if (!content.trim() && mediaItems.length === 0 && !uppyVideoResult) {
      toast.error('Vui lòng thêm nội dung hoặc media');
      return;
    }

    // Check if video is still uploading
    if (isVideoUploading) {
      toast.error('Vui lòng đợi video upload xong');
      return;
    }

    // Check content length before validation
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

    // Create abort controller for this submit
    const abortController = new AbortController();
    submitAbortRef.current = abortController;
    
    // Watchdog timeout - auto cancel after 90 seconds
    const watchdogTimeout = setTimeout(() => {
      console.error('[CreatePost] Watchdog timeout triggered (90s)');
      abortController.abort();
      setLoading(false);
      setSubmitStep('idle');
      toast.error('Đăng bài bị timeout, vui lòng thử lại');
    }, 90000);

    setLoading(true);
    setSubmitStep('auth');
    console.log('[CreatePost] Step: auth - Getting session...');
    
    try {
      // Check if aborted
      if (abortController.signal.aborted) throw new Error('Đã huỷ');
      
      // Get session with 5 second timeout
      const authStartTime = Date.now();
      let session;
      try {
        const sessionResult = await Promise.race([
          supabase.auth.getSession(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('getSession timeout (5s)')), 5000)
          )
        ]);
        session = sessionResult.data.session;
        console.log('[CreatePost] getSession completed in', Date.now() - authStartTime, 'ms');
      } catch (authError: any) {
        console.error('[CreatePost] getSession error:', authError.message);
        // Try refresh session as fallback
        console.log('[CreatePost] Trying refreshSession...');
        const { data: refreshData } = await supabase.auth.refreshSession();
        if (!refreshData.session) {
          throw new Error('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại');
        }
        session = refreshData.session;
        console.log('[CreatePost] refreshSession succeeded');
      }
      
      if (!session) {
        console.log('[CreatePost] No session found, trying refresh...');
        const { data: refreshData } = await supabase.auth.refreshSession();
        if (!refreshData.session) {
          throw new Error('Chưa đăng nhập');
        }
        session = refreshData.session;
      }

      console.log('[CreatePost] Auth OK, user:', session.user.id.substring(0, 8) + '...');
      setSubmitStep('prepare_media');
      console.log('[CreatePost] Step: prepare_media');
      
      if (abortController.signal.aborted) throw new Error('Đã huỷ');
      
      // Upload all media items (images only - videos handled by Uppy)
      const mediaUrls: Array<{ url: string; type: 'image' | 'video' }> = [];
      
      // Add Uppy-uploaded video first if exists
      if (uppyVideoResult) {
        mediaUrls.push({
          url: uppyVideoResult.url,
          type: 'video',
        });
        console.log('[CreatePost] Added video URL:', uppyVideoResult.url);
      }
      
      for (const item of mediaItems) {
        if (abortController.signal.aborted) throw new Error('Đã huỷ');
        
        if (item.type === 'video') {
          continue;
        } else {
          const result = await uploadToR2(item.file, 'posts');
          mediaUrls.push({
            url: result.url,
            type: 'image',
          });
        }
      }

      console.log('[CreatePost] Media URLs prepared:', mediaUrls.length);
      
      if (abortController.signal.aborted) throw new Error('Đã huỷ');

      // For backward compatibility
      const firstImage = mediaUrls.find((m) => m.type === 'image');
      const firstVideo = mediaUrls.find((m) => m.type === 'video');

      console.log('[CreatePost] Step: saving - Calling edge function...');
      setSubmitStep('saving');

      // Call edge function with timeout
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/create-post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          content: content.trim() || '',
          media_urls: mediaUrls,
          image_url: firstImage?.url || null,
          video_url: firstVideo?.url || null,
        }),
        signal: abortController.signal,
      });

      console.log('[CreatePost] Edge function response status:', response.status);

      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        console.error('[CreatePost] Failed to parse response JSON:', jsonError);
        // If status OK but can't parse JSON, assume success
        if (response.ok) {
          console.log('[CreatePost] Assuming success despite JSON parse error');
          result = { ok: true };
        } else {
          throw new Error('Lỗi kết nối với server');
        }
      }
      
      if (!response.ok) {
        console.error('[CreatePost] Edge function error:', result);
        throw new Error(result.error || 'Không thể lưu bài viết');
      }

      console.log('[CreatePost] Success!', result);
      setSubmitStep('done');

      // Reset video upload state AFTER successful insert
      setVideoUploadState('idle');
      setVideoUploadProgress(0);
      setCurrentVideoId(undefined);
      setPendingVideoFile(null);
      setUppyVideoResult(null);

      // Cleanup
      mediaItems.forEach((item) => URL.revokeObjectURL(item.preview));
      setContent('');
      setMediaItems([]);
      setIsDialogOpen(false);
      setShowMediaUpload(false);
      toast.success('Đã đăng bài viết!');
      onPostCreated();
    } catch (error: any) {
      if (error.name === 'AbortError' || error.message === 'Đã huỷ') {
        console.log('[CreatePost] Aborted');
        // Don't show error for user-initiated cancel
      } else {
        console.error('[CreatePost] Error:', error.message, error);
        toast.error(error.message || 'Không thể đăng bài');
      }
      setVideoUploadState('idle');
    } finally {
      clearTimeout(watchdogTimeout);
      setLoading(false);
      setSubmitStep('idle');
      submitAbortRef.current = null;
    }
  };

  const selectedPrivacy = PRIVACY_OPTIONS.find((p) => p.value === privacy)!;
  const PrivacyIcon = selectedPrivacy.icon;

  if (!profile) return null;

  return (
    <>
      {/* Create Post Card */}
      <div className="fb-card p-4 mb-4">
        <div className="flex items-center gap-3">
          <Avatar
            className="w-10 h-10 cursor-pointer ring-2 ring-primary/20"
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
              onClick={() => {
                setIsDialogOpen(true);
                setShowMediaUpload(true);
              }}
              className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <ImagePlus className="w-6 h-6 text-primary" />
              <span className="font-semibold text-muted-foreground text-sm hidden sm:inline">Ảnh/video</span>
            </button>
            <button
              onClick={() => setIsDialogOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <span className="text-2xl">😊</span>
              <span className="font-semibold text-muted-foreground text-sm hidden sm:inline">Cảm xúc/hoạt động</span>
            </button>
          </div>
        </div>
      </div>

      {/* Create Post Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="p-4 border-b border-border shrink-0">
            <DialogTitle className="text-center text-xl font-bold">Tạo bài viết</DialogTitle>
          </DialogHeader>

          <div className="p-4 flex-1 overflow-y-auto">
            {/* User Info & Privacy */}
            <div className="flex items-center gap-3 mb-4">
              <Avatar className="w-10 h-10 ring-2 ring-primary/20">
                <AvatarImage src={profile.avatar_url || ''} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {profile.username?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{profile.full_name || profile.username}</p>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="sm" className="h-6 text-xs mt-1 gap-1">
                      <PrivacyIcon className="w-3 h-3" />
                      {selectedPrivacy.label}
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {PRIVACY_OPTIONS.map((option) => (
                      <DropdownMenuItem
                        key={option.value}
                        onClick={() => setPrivacy(option.value)}
                        className="gap-3"
                      >
                        <option.icon className="w-5 h-5" />
                        <div>
                          <p className="font-medium">{option.label}</p>
                          <p className="text-xs text-muted-foreground">{option.description}</p>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Content Input with Emoji */}
            <div className="relative">
              <Textarea
                placeholder={`${profile.full_name || profile.username} ơi, bạn đang nghĩ gì thế?`}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[100px] resize-none border-0 focus-visible:ring-0 text-lg placeholder:text-muted-foreground pr-10"
                disabled={loading}
              />
              <div className="absolute bottom-2 right-2">
                <EmojiPicker onEmojiSelect={handleEmojiSelect} />
              </div>
              {/* Character Counter */}
              <div className={`text-xs text-right mt-1 pr-1 ${
                content.length > MAX_CONTENT_LENGTH ? 'text-destructive font-semibold' :
                content.length > MAX_CONTENT_LENGTH * 0.9 ? 'text-yellow-500' :
                content.length > MAX_CONTENT_LENGTH * 0.8 ? 'text-yellow-600/70' : 'text-muted-foreground'
              }`}>
                {content.length.toLocaleString()}/{MAX_CONTENT_LENGTH.toLocaleString()}
              </div>
            </div>

            {/* Media Upload Area */}
            {showMediaUpload && (
              <div
                className={`mt-4 border-2 border-dashed rounded-lg p-4 transition-colors ${
                  isDragging ? 'border-primary bg-primary/5' : 'border-border'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {/* Uppy Video Uploader - Always show when there's a pending video */}
                {pendingVideoFile && (
                  <div className="mb-3">
                    <VideoUploaderUppy
                      selectedFile={pendingVideoFile}
                      onUploadComplete={(result) => {
                        setUppyVideoResult(result);
                        setIsVideoUploading(false);
                        setPendingVideoFile(null);
                      }}
                      onUploadError={() => {
                        setIsVideoUploading(false);
                        setPendingVideoFile(null);
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

                {/* Show uploaded video result with thumbnail */}
                {uppyVideoResult && !pendingVideoFile && (
                  <div className="mb-3 relative rounded-lg overflow-hidden border border-green-500/50 bg-muted h-48">
                    {/* Prioritize local thumbnail, then Cloudflare, then fallback */}
                    {uppyVideoResult.localThumbnail ? (
                      <img 
                        src={uppyVideoResult.localThumbnail}
                        alt="Video preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video className="w-16 h-16 text-muted-foreground" />
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        // Delete the video from Cloudflare Stream to prevent orphans
                        if (uppyVideoResult?.uid) {
                          deleteStreamVideoByUid(uppyVideoResult.uid);
                        }
                        setUppyVideoResult(null);
                      }}
                      className="absolute top-2 right-2 h-8 w-8 bg-black/50 hover:bg-black/70 text-white rounded-full"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 rounded px-2 py-1">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-white text-xs font-medium">Sẵn sàng đăng</span>
                    </div>
                    <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 rounded px-2 py-1">
                      <Video className="w-4 h-4 text-white" />
                      <span className="text-white text-xs">Video</span>
                    </div>
                  </div>
                )}

                {mediaItems.length === 0 && !pendingVideoFile && !uppyVideoResult ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
                      <ImagePlus className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="font-medium mb-1">Thêm ảnh/video</p>
                    <p className="text-sm text-muted-foreground mb-4">hoặc kéo và thả</p>
                    <Input
                      id="media-upload"
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      onChange={(e) => handleFileSelect(e.target.files)}
                      className="hidden"
                      disabled={loading}
                    />
                    <Button
                      variant="secondary"
                      onClick={() => document.getElementById('media-upload')?.click()}
                      disabled={loading}
                    >
                      Chọn từ thiết bị
                    </Button>
                  </div>
                ) : mediaItems.length > 0 ? (
                  <div className="space-y-3">
                    {/* Media Preview Grid */}
                    <div className={`grid gap-2 ${mediaItems.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                      {mediaItems.map((item, index) => (
                        <div
                          key={index}
                          className={`relative rounded-lg overflow-hidden ${
                            mediaItems.length === 1 ? 'max-h-80' : 'aspect-square'
                          }`}
                        >
                          {item.type === 'video' ? (
                            <video
                              src={item.preview}
                              className="w-full h-full object-cover"
                              controls
                            />
                          ) : (
                            <img
                              src={item.preview}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          )}
                          <button
                            onClick={() => removeMedia(index)}
                            className="absolute top-2 right-2 w-7 h-7 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center"
                            disabled={loading}
                          >
                            <X className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Add More Button */}
                    {mediaItems.length < 80 && (
                      <div className="flex items-center gap-2">
                        <Input
                          id="add-more-media"
                          type="file"
                          accept="image/*,video/*"
                          multiple
                          onChange={(e) => handleFileSelect(e.target.files)}
                          className="hidden"
                          disabled={loading}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById('add-more-media')?.click()}
                          disabled={loading}
                        >
                          <ImagePlus className="w-4 h-4 mr-2" />
                          Thêm ảnh/video
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          {mediaItems.length}/80
                        </span>
                      </div>
                    )}

                  </div>
                ) : null}

                {/* Close Upload Area */}
                {mediaItems.length === 0 && (
                  <button
                    onClick={() => setShowMediaUpload(false)}
                    className="absolute top-2 right-2 w-7 h-7 bg-secondary hover:bg-muted rounded-full flex items-center justify-center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* Add to Post */}
            <div className="mt-4 border border-border rounded-lg p-3 flex items-center justify-between">
              <span className="font-semibold text-sm">Thêm vào bài viết của bạn</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowMediaUpload(true)}
                  className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center transition-colors"
                  disabled={loading}
                >
                  <ImagePlus className="w-6 h-6 text-primary" />
                </button>
                <button className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center transition-colors">
                  <UserPlus className="w-6 h-6 text-blue-500" />
                </button>
                <EmojiPicker onEmojiSelect={handleEmojiSelect} />
                <button className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center transition-colors">
                  <MapPin className="w-6 h-6 text-red-400" />
                </button>
                <button className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center transition-colors">
                  <MoreHorizontal className="w-6 h-6 text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="p-4 border-t border-border shrink-0">
            <div className="flex gap-2">
              {loading && (
                <Button
                  variant="outline"
                  onClick={handleCancelSubmit}
                  className="shrink-0"
                >
                  Huỷ
                </Button>
              )}
              <Button
                onClick={handleSubmit}
                disabled={loading || isVideoUploading || content.length > MAX_CONTENT_LENGTH || (!content.trim() && mediaItems.length === 0 && !uppyVideoResult)}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                {(loading || isVideoUploading) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {getSubmitButtonText()}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
