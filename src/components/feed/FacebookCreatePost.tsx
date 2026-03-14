/**
 * CreatePost — Compose UI + Dialog shell
 * Supports: clipboard paste (Ctrl+V), drag-drop, image editor, DraftAttachment local state
 * Video upload still uses Uppy. Keeps guest mode, limited account, feeling, location, friend tag.
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ImagePlus, Video, Loader2, ShieldAlert, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { compressPostImage, FILE_LIMITS, getVideoDuration } from '@/utils/imageCompression';
import { uploadToR2 } from '@/utils/r2Upload';
import { EmojiPicker } from './EmojiPicker';
import { FriendTagDialog, TaggedFriend } from './FriendTagDialog';
import { LocationCheckin } from './LocationCheckin';
import { PrivacySelector } from './PrivacySelector';
import { FeelingActivityDialog, FeelingActivity } from './FeelingActivityDialog';
import { CreatePostToolbar } from './CreatePostToolbar';
import { VideoUploaderUppy } from './VideoUploaderUppy';
import { AttachmentPreviewGrid } from '@/modules/feed/components/post/AttachmentPreviewGrid';
import { ImageEditorModal } from '@/modules/feed/components/post/ImageEditorModal';
import { useLanguage } from '@/i18n/LanguageContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAccountCapabilities } from '@/hooks/useAccountCapabilities';
import { usePplpEvaluate } from '@/hooks/usePplpEvaluate';
import type { DraftAttachment, AttachmentPayload } from '@/modules/feed/types';

const MAX_CONTENT_LENGTH = 20000;
const MAX_IMAGE_INPUT_SIZE = 10 * 1024 * 1024; // 10MB per image
const MAX_ATTACHMENTS = 12;

const postSchema = z.object({
  content: z.string().max(MAX_CONTENT_LENGTH, `Nội dung tối đa ${MAX_CONTENT_LENGTH.toLocaleString()} ký tự`),
});

function createDraftId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function revokePreview(url?: string) {
  if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
}

function reorderAttachments(items: DraftAttachment[]) {
  return items.map((a, i) => ({ ...a, sortOrder: i }));
}

async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(objectUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Không thể đọc kích thước ảnh'));
    };
    img.src = objectUrl;
  });
}

async function buildImageDraft(file: File, sortOrder: number, source: DraftAttachment['source']): Promise<DraftAttachment> {
  const { width, height } = await getImageDimensions(file);
  return {
    id: createDraftId(),
    kind: 'image',
    file,
    previewUrl: URL.createObjectURL(file),
    width,
    height,
    sizeBytes: file.size,
    mimeType: file.type,
    uploadStatus: 'local',
    sortOrder,
    source,
    altText: '',
  };
}

interface FacebookCreatePostProps {
  onPostCreated: () => void;
}

export const CreatePost = ({ onPostCreated }: FacebookCreatePostProps) => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { userId } = useCurrentUser();
  const { canCreatePost, isLimitedAccount, isLoading: capLoading } = useAccountCapabilities();
  const { evaluateAsync } = usePplpEvaluate();

  // Profile
  const [profile, setProfile] = useState<{
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null>(null);

  // Composer state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [content, setContent] = useState('');
  const [privacy, setPrivacy] = useState('public');
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Attachments (images stored locally, uploaded on submit)
  const [attachments, setAttachments] = useState<DraftAttachment[]>([]);
  const attachmentsRef = useRef<DraftAttachment[]>([]);

  // Video (still uses Uppy for immediate upload)
  const [pendingVideoFile, setPendingVideoFile] = useState<File | null>(null);
  const [uppyVideoResult, setUppyVideoResult] = useState<{ uid: string; url: string; thumbnailUrl: string; localThumbnail?: string } | null>(null);
  const [isVideoUploading, setIsVideoUploading] = useState(false);

  // Image editor
  const [editingAttachmentId, setEditingAttachmentId] = useState<string | null>(null);

  // Social features
  const [taggedFriends, setTaggedFriends] = useState<TaggedFriend[]>([]);
  const [location, setLocation] = useState<string | null>(null);
  const [feeling, setFeeling] = useState<FeelingActivity | null>(null);

  // Dialogs
  const [showFriendTagDialog, setShowFriendTagDialog] = useState(false);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [showFeelingDialog, setShowFeelingDialog] = useState(false);

  // Refs
  const mediaInputRef = useRef<HTMLInputElement>(null);

  const videoAttachment = useMemo(() => attachments.find((a) => a.kind === 'video') ?? null, [attachments]);
  const editingAttachment = useMemo(() => attachments.find((a) => a.id === editingAttachmentId) ?? null, [attachments, editingAttachmentId]);

  // Fetch profile
  useEffect(() => {
    if (!userId) return;
    supabase.from('profiles').select('id, username, display_name, avatar_url').eq('id', userId).single()
      .then(({ data }) => { if (data) setProfile(data); });
  }, [userId]);

  // Keep ref in sync
  useEffect(() => { attachmentsRef.current = attachments; }, [attachments]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => { attachmentsRef.current.forEach((a) => revokePreview(a.previewUrl)); };
  }, []);

  const resetComposer = useCallback(() => {
    attachments.forEach((a) => revokePreview(a.previewUrl));
    setContent('');
    setPrivacy('public');
    setAttachments([]);
    setTaggedFriends([]);
    setLocation(null);
    setFeeling(null);
    setPendingVideoFile(null);
    setIsVideoUploading(false);
    setEditingAttachmentId(null);
    setIsDragging(false);
    setUppyVideoResult(null);
  }, [attachments]);

  // ─── Image handling ───

  const appendImages = useCallback(async (files: File[], source: DraftAttachment['source']) => {
    const remainingSlots = MAX_ATTACHMENTS - attachments.length;
    if (remainingSlots <= 0) {
      toast.error(`Tối đa ${MAX_ATTACHMENTS} file đính kèm`);
      return;
    }
    const nextFiles = files.slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      toast.info(`Chỉ ${remainingSlots} file đầu tiên được thêm`);
    }
    const validFiles: File[] = [];
    for (const file of nextFiles) {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} không phải ảnh`);
        continue;
      }
      if (file.size > MAX_IMAGE_INPUT_SIZE) {
        toast.error(`${file.name} vượt quá giới hạn 10MB`);
        continue;
      }
      validFiles.push(file);
    }
    if (validFiles.length === 0) return;
    const baseOrder = attachments.length;
    try {
      const drafts = await Promise.all(
        validFiles.map((file, index) => buildImageDraft(file, baseOrder + index, source))
      );
      setAttachments((current) => reorderAttachments([...current, ...drafts]));
      setIsDialogOpen(true);
    } catch (error: any) {
      toast.error(error?.message || 'Không thể xử lý ảnh đã chọn');
    }
  }, [attachments]);

  const addVideoFile = useCallback(async (file: File) => {
    if (videoAttachment || pendingVideoFile) {
      toast.error('Chỉ được 1 video cho mỗi bài viết');
      return;
    }
    if (!file.type.startsWith('video/')) {
      toast.error(`${file.name} không phải video`);
      return;
    }
    if (file.size > FILE_LIMITS.VIDEO_MAX_SIZE) {
      toast.error(`${file.name} vượt giới hạn dung lượng video`);
      return;
    }
    try {
      const duration = await getVideoDuration(file);
      if (duration > FILE_LIMITS.VIDEO_MAX_DURATION) {
        toast.error(`${file.name} vượt giới hạn thời lượng video`);
        return;
      }
      setPendingVideoFile(file);
      setIsVideoUploading(true);
      setIsDialogOpen(true);
    } catch {
      toast.error(`Không thể đọc ${file.name}`);
    }
  }, [pendingVideoFile, videoAttachment]);

  const handleFileSelection = useCallback(async (files: FileList | null, source: DraftAttachment['source']) => {
    if (!files || files.length === 0) return;
    const images: File[] = [];
    const videos: File[] = [];
    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) images.push(file);
      else if (file.type.startsWith('video/')) videos.push(file);
      else toast.error(`${file.name} không được hỗ trợ`);
    });
    if (videos.length > 1) toast.info(`Chỉ 1 video được thêm`);
    if (images.length > 0) await appendImages(images, source);
    if (videos[0]) await addVideoFile(videos[0]);
  }, [appendImages, addVideoFile]);

  // ─── Paste & Drag-Drop ───

  const handlePasteCapture = useCallback(async (event: React.ClipboardEvent) => {
    const items = Array.from(event.clipboardData?.items || []);
    const imageFiles = items
      .filter((item) => item.type.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file));
    if (imageFiles.length === 0) return;
    event.preventDefault();
    await appendImages(imageFiles, 'paste');
    toast.success(`Đã dán ${imageFiles.length} ảnh vào bài viết`);
  }, [appendImages]);

  const handleDrop = useCallback(async (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    await handleFileSelection(event.dataTransfer.files, 'drop');
  }, [handleFileSelection]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    if (event.dataTransfer.types.includes('Files')) {
      event.preventDefault();
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
  }, []);

  // ─── Attachment actions ───

  const removeAttachment = useCallback((id: string) => {
    setAttachments((current) => {
      const target = current.find((a) => a.id === id);
      if (target) revokePreview(target.previewUrl);
      return reorderAttachments(current.filter((a) => a.id !== id));
    });
  }, []);

  const moveAttachment = useCallback((id: string, direction: -1 | 1) => {
    setAttachments((current) => {
      const index = current.findIndex((a) => a.id === id);
      if (index < 0) return current;
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return reorderAttachments(next);
    });
  }, []);

  const replaceEditedAttachment = useCallback((payload: {
    file: File;
    previewUrl: string;
    width?: number;
    height?: number;
    altText: string;
    transformMeta?: Record<string, unknown> | null;
  }) => {
    setAttachments((current) =>
      current.map((a) => {
        if (a.id !== editingAttachmentId) return a;
        revokePreview(a.previewUrl);
        return {
          ...a,
          file: payload.file,
          previewUrl: payload.previewUrl,
          width: payload.width || a.width,
          height: payload.height || a.height,
          sizeBytes: payload.file.size,
          mimeType: payload.file.type,
          altText: payload.altText,
          transformMeta: payload.transformMeta,
          uploadStatus: 'local' as const,
        };
      })
    );
    setEditingAttachmentId(null);
  }, [editingAttachmentId]);

  const handleVideoUploadComplete = useCallback((result: { uid: string; url: string; thumbnailUrl: string; localThumbnail?: string }) => {
    setUppyVideoResult(result);
    setIsVideoUploading(false);
    setPendingVideoFile(null);
    setAttachments((current) => {
      // Guard: prevent duplicate video entries
      if (current.some(a => a.kind === 'video')) return current;
      const videoDraft: DraftAttachment = {
        id: createDraftId(),
        kind: 'video',
        fileUrl: result.url,
        storageKey: result.uid,
        previewUrl: result.localThumbnail || result.thumbnailUrl,
        sizeBytes: 0,
        mimeType: 'video/mp4',
        uploadStatus: 'uploaded',
        sortOrder: current.length,
        source: 'picker',
        altText: '',
      };
      return reorderAttachments([...current, videoDraft]);
    });
  }, []);

  // ─── Submit ───

  const buildAttachmentPayloads = useCallback(async (accessToken: string): Promise<AttachmentPayload[]> => {
    const sorted = [...attachments].sort((a, b) => a.sortOrder - b.sortOrder);
    const payloads: AttachmentPayload[] = [];

    for (const attachment of sorted) {
      if (attachment.kind === 'image') {
        if (!attachment.file) throw new Error('Ảnh đính kèm thiếu dữ liệu file');
        const compressed = await compressPostImage(attachment.file);
        const dimensions = await getImageDimensions(compressed);
        const upload = await uploadToR2(compressed, 'posts', undefined, accessToken);
        payloads.push({
          file_url: upload.url,
          storage_key: upload.key,
          file_type: 'image',
          mime_type: compressed.type || attachment.mimeType,
          width: dimensions.width,
          height: dimensions.height,
          size_bytes: compressed.size,
          sort_order: attachment.sortOrder,
          alt_text: attachment.altText || null,
          transform_meta: attachment.transformMeta || null,
        });
      } else {
        // Video — already uploaded via Uppy
        if (!attachment.fileUrl) throw new Error('Video chưa tải lên xong');
        payloads.push({
          file_url: attachment.fileUrl,
          storage_key: attachment.storageKey || null,
          file_type: 'video',
          mime_type: attachment.mimeType,
          width: attachment.width || null,
          height: attachment.height || null,
          size_bytes: attachment.sizeBytes,
          sort_order: attachment.sortOrder,
          alt_text: attachment.altText || null,
          transform_meta: attachment.transformMeta || null,
        });
      }
    }
    return payloads;
  }, [attachments]);

  const handleSubmit = useCallback(async () => {
    if (!content.trim() && attachments.length === 0) {
      toast.error(t('pleaseAddContent'));
      return;
    }
    if (isVideoUploading || pendingVideoFile) {
      toast.error(t('waitForVideoUpload'));
      return;
    }
    if (content.length > MAX_CONTENT_LENGTH) {
      toast.error(`${t('contentTooLongDetail')} (${content.length.toLocaleString()}/${MAX_CONTENT_LENGTH.toLocaleString()})`);
      return;
    }
    const validation = postSchema.safeParse({ content: content.trim() });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error(t('sessionExpired'));

      // Build attachment payloads (compress + upload images)
      const attachmentPayloads = await buildAttachmentPayloads(session.access_token);
      const firstImage = attachmentPayloads.find((a) => a.file_type === 'image');
      const firstVideo = attachmentPayloads.find((a) => a.file_type === 'video');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/create-post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          content: content.trim(),
          visibility: privacy,
          location,
          tagged_user_ids: taggedFriends.map((f) => f.id),
          image_url: firstImage?.file_url || null,
          video_url: firstVideo?.file_url || null,
          media_urls: attachmentPayloads.map((a) => ({ url: a.file_url, type: a.file_type })),
          attachments: attachmentPayloads,
        }),
      });

      const result = await response.json().catch(() => ({ error: t('serverConnectionError') }));
      if (!response.ok) throw new Error(result.error || t('cannotSavePost'));

      // Handle moderation
      if (result.moderation_status === 'pending_review') {
        toast.info(
          language === 'vi' ? 'Bài viết của bạn đang được xem xét ✨' : 'Your post is being reviewed ✨',
          { duration: 5000 }
        );
      } else if (result.duplicate_detected) {
        toast.info(t('duplicatePostMessage') + ' ✨🙏', { duration: 8000 });
      } else {
        toast.success(t('postPublished'));
        evaluateAsync({
          action_type: 'post',
          reference_id: result.postId,
          content: content.trim(),
        });
      }

      setIsDialogOpen(false);
      resetComposer();
      onPostCreated();
    } catch (error: any) {
      toast.error(error?.message || t('cannotPost'));
    } finally {
      setLoading(false);
    }
  }, [content, attachments, privacy, taggedFriends, location, isVideoUploading, pendingVideoFile, buildAttachmentPayloads, resetComposer, onPostCreated, t, language, evaluateAsync]);

  const handleEmojiSelect = (emoji: string) => setContent((prev) => prev + emoji);
  const handleFeelingSelect = (selectedFeeling: FeelingActivity) => {
    setFeeling(selectedFeeling);
    setIsDialogOpen(true);
  };
  const handleLiveVideoClick = () => navigate('/live/setup');

  // ─── Guest mode ───
  if (!profile) {
    return (
      <div className="bg-card rounded-lg shadow-sm border border-border p-3 sm:p-4 mb-4">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 ring-2 ring-primary/20">
            <AvatarFallback className="bg-muted text-muted-foreground">G</AvatarFallback>
          </Avatar>
          <button
            onClick={() => toast.error(t('loginToPostMessage'), { action: { label: t('loginButton'), onClick: () => navigate('/auth') } })}
            className="flex-1 text-left px-4 py-2.5 bg-muted hover:bg-muted/80 rounded-full text-muted-foreground text-[15px] transition-colors"
          >
            {t('whatsOnYourMind')}
          </button>
        </div>
        <div className="border-t border-border mt-3 pt-2">
          <div className="flex items-center">
            {[
              { icon: <Video className="w-6 h-6 text-destructive" />, label: t('liveVideo') },
              { icon: <ImagePlus className="w-6 h-6 text-[#45BD62]" />, label: t('photoVideo') },
              { icon: <span className="text-xl sm:text-2xl">😊</span>, label: t('feeling') },
            ].map((btn, i) => (
              <button
                key={i}
                onClick={() => toast.error(t('loginToPostMessage'), { action: { label: t('loginButton'), onClick: () => navigate('/auth') } })}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 hover:bg-muted rounded-lg transition-colors group"
              >
                {btn.icon}
                <span className="font-medium text-muted-foreground text-sm hidden sm:inline">{btn.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── Limited account ───
  if (!canCreatePost && !capLoading) {
    return (
      <div className="bg-card rounded-lg shadow-sm border border-border p-3 sm:p-4 mb-4">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 ring-2 ring-primary/20 shrink-0">
            <AvatarImage src={profile.avatar_url} sizeHint="sm" alt={profile.username || 'User avatar'} />
            <AvatarFallback className="bg-primary text-primary-foreground">{profile.username?.[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 px-4 py-2.5 bg-muted rounded-full text-muted-foreground text-[15px]">
            {language === 'vi' ? 'Liên kết và xác thực email để đăng bài' : 'Verify your email to start posting'}
          </div>
        </div>
        <div className="border-t border-border mt-3 pt-3">
          <div className="flex items-center gap-2 px-2">
            <ShieldAlert className="w-5 h-5 text-yellow-500 shrink-0" />
            <p className="text-sm text-muted-foreground flex-1">
              {language === 'vi'
                ? 'Tài khoản của bạn cần xác thực email để mở khóa quyền đăng bài, bình luận và tương tác.'
                : 'Your account needs email verification to unlock posting, commenting and interactions.'}
            </p>
            <Button size="sm" onClick={() => navigate('/settings/security')} className="shrink-0">
              {language === 'vi' ? 'Liên kết email' : 'Verify Email'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main Composer ───
  return (
    <>
      <input
        ref={mediaInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={(e) => { handleFileSelection(e.target.files, 'picker'); e.target.value = ''; }}
        className="hidden"
      />

      {/* Create Post Card */}
      <div className="bg-card rounded-lg shadow-sm border border-border p-3 sm:p-4 mb-4">
        <div className="flex items-center gap-3">
          <Avatar
            className="w-10 h-10 cursor-pointer ring-2 ring-primary/20 shrink-0"
            onClick={() => navigate(`/profile/${profile.id}`)}
          >
            <AvatarImage src={profile.avatar_url} sizeHint="sm" alt={profile.username || 'User avatar'} />
            <AvatarFallback className="bg-primary text-primary-foreground">{profile.username?.[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <button
            onClick={() => setIsDialogOpen(true)}
            className="flex-1 text-left px-4 py-2.5 bg-muted hover:bg-muted/80 rounded-full text-muted-foreground text-[15px] transition-colors"
          >
            {language === 'vi'
              ? `${profile.display_name || profile.username} ơi, Ánh sáng trong tim bạn đang muốn nói điều gì?`
              : `What's on your mind, ${profile.display_name || profile.username}?`}
          </button>
        </div>
        <div className="border-t border-border mt-3 pt-2">
          <div className="flex items-center">
            <button onClick={handleLiveVideoClick} className="flex-1 flex items-center justify-center gap-2 py-2.5 hover:bg-muted rounded-lg transition-colors group">
              <Video className="w-6 h-6 text-red-500 group-hover:scale-110 transition-transform" />
              <span className="font-medium text-muted-foreground text-sm hidden sm:inline">{t('liveVideo')}</span>
            </button>
            <button onClick={() => mediaInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 py-2.5 hover:bg-muted rounded-lg transition-colors group">
              <ImagePlus className="w-6 h-6 text-[#45BD62] group-hover:scale-110 transition-transform" />
              <span className="font-medium text-muted-foreground text-sm hidden sm:inline">{t('photoVideo')}</span>
            </button>
            <button onClick={() => setShowFeelingDialog(true)} className="flex-1 flex items-center justify-center gap-2 py-2.5 hover:bg-muted rounded-lg transition-colors group">
              <span className="text-xl sm:text-2xl group-hover:scale-110 transition-transform">{feeling ? feeling.emoji : '😊'}</span>
              <span className="font-medium text-muted-foreground text-sm hidden sm:inline">{feeling ? feeling.label : t('feeling')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open && !loading) {
          setPendingVideoFile(null);
          setEditingAttachmentId(null);
        }
      }}>
        <DialogContent className="sm:max-w-[600px] p-0 max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="p-4 border-b border-border shrink-0">
            <DialogTitle className="text-center text-xl font-bold">{t('createPost')}</DialogTitle>
          </DialogHeader>

          <div
            className={`p-4 flex-1 overflow-y-auto relative ${isDragging ? 'ring-2 ring-primary ring-inset bg-primary/5' : ''}`}
            onPasteCapture={(e) => void handlePasteCapture(e)}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={(e) => void handleDrop(e)}
          >
            {/* User Info */}
            <div className="flex items-center gap-3 mb-4">
              <Avatar className="w-10 h-10 ring-2 ring-primary/20">
                <AvatarImage src={profile.avatar_url} sizeHint="sm" alt={profile.username || 'User avatar'} />
                <AvatarFallback className="bg-primary text-primary-foreground">{profile.username?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="font-semibold">{profile.display_name || profile.username}</span>
                  {feeling && (
                    <span className="text-muted-foreground text-sm">
                      {' '}{t('feelingPrefix')}{' '}
                      <button onClick={() => setShowFeelingDialog(true)} className="text-foreground font-semibold hover:underline inline-flex items-center gap-1">
                        {feeling.emoji} {feeling.label}
                      </button>
                    </span>
                  )}
                  {taggedFriends.length > 0 && (
                    <span className="text-muted-foreground text-sm">
                      {' '}{t('withPrefix')}{' '}
                      <button onClick={() => setShowFriendTagDialog(true)} className="text-foreground font-semibold hover:underline">
                        {taggedFriends.length === 1
                          ? (taggedFriends[0].full_name || taggedFriends[0].username)
                          : `${taggedFriends[0].full_name || taggedFriends[0].username} ${t('andOthers')} ${taggedFriends.length - 1}`}
                      </button>
                    </span>
                  )}
                  {location && (
                    <span className="text-muted-foreground text-sm">
                      {' '}{t('atPrefix')}{' '}
                      <button onClick={() => setShowLocationDialog(true)} className="text-foreground font-semibold hover:underline">{location}</button>
                    </span>
                  )}
                </div>
                <PrivacySelector value={privacy} onChange={setPrivacy} disabled={loading} />
              </div>
            </div>

            {/* Content */}
            <div className="relative">
              <Textarea
                placeholder={language === 'vi'
                  ? `${profile.display_name || profile.username} ơi, Ánh sáng trong tim bạn đang muốn nói điều gì?`
                  : `What's on your mind, ${profile.display_name || profile.username}?`}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[100px] resize-none border-0 focus-visible:ring-0 text-lg placeholder:text-muted-foreground pr-10"
                disabled={loading}
              />
              <div className="absolute bottom-2 right-2">
                <EmojiPicker onEmojiSelect={handleEmojiSelect} />
              </div>
              <div className="flex items-center justify-between mt-1 px-1">
                <span className="text-[11px] text-muted-foreground">
                  {language === 'vi' ? 'Dán ảnh Ctrl+V hoặc kéo thả file vào đây' : 'Paste images with Ctrl+V or drag files here'}
                </span>
                <span className={`text-xs ${
                  content.length > MAX_CONTENT_LENGTH ? 'text-destructive font-semibold' :
                  content.length > MAX_CONTENT_LENGTH * 0.9 ? 'text-yellow-500' :
                  content.length > MAX_CONTENT_LENGTH * 0.8 ? 'text-yellow-600/70' : 'text-muted-foreground'
                }`}>
                  {content.length.toLocaleString()}/{MAX_CONTENT_LENGTH.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Video Upload (Uppy) */}
            {pendingVideoFile && !uppyVideoResult && (
              <div className="mt-3">
                <VideoUploaderUppy
                  selectedFile={pendingVideoFile}
                  onUploadStart={() => setIsVideoUploading(true)}
                  onUploadError={(error) => {
                    setPendingVideoFile(null);
                    setIsVideoUploading(false);
                    toast.error(error?.message || 'Video upload thất bại');
                  }}
                  onUploadComplete={handleVideoUploadComplete}
                  onRemove={() => {
                    setPendingVideoFile(null);
                    setIsVideoUploading(false);
                  }}
                  disabled={loading}
                />
              </div>
            )}

            {/* Attachments Preview Grid */}
            {attachments.length > 0 ? (
              <div className="mt-3">
                <AttachmentPreviewGrid
                  attachments={attachments}
                  disabled={loading}
                  onEdit={setEditingAttachmentId}
                  onRemove={removeAttachment}
                  onMove={moveAttachment}
                />
              </div>
            ) : !pendingVideoFile ? (
              <div className="mt-3 border-2 border-dashed border-border rounded-lg p-6 text-center">
                <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {language === 'vi' ? 'Kéo thả ảnh vào đây hoặc dán từ clipboard' : 'Drop photos here or paste from clipboard'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {language === 'vi' ? 'Ảnh được giữ local cho đến khi bạn đăng. Video tải lên ngay.' : 'Images stay local until you publish. Videos upload immediately.'}
                </p>
              </div>
            ) : null}

            {/* Toolbar */}
            <div className="mt-3">
              <CreatePostToolbar
                loading={loading}
                taggedFriendsCount={taggedFriends.length}
                hasLocation={!!location}
                onShowMediaUpload={() => mediaInputRef.current?.click()}
                onShowFriendTag={() => setShowFriendTagDialog(true)}
                onShowLocation={() => setShowLocationDialog(true)}
                onEmojiSelect={handleEmojiSelect}
              />
            </div>
          </div>

          {/* Submit */}
          <div className="p-4 border-t border-border shrink-0">
            <Button
              onClick={handleSubmit}
              disabled={loading || isVideoUploading || content.length > MAX_CONTENT_LENGTH || (!content.trim() && attachments.length === 0)}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              {(loading || isVideoUploading) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {loading ? t('posting') : isVideoUploading ? t('uploadingVideo') : t('postButton')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sub-dialogs */}
      <FriendTagDialog isOpen={showFriendTagDialog} onClose={() => setShowFriendTagDialog(false)} currentUserId={profile?.id || ''} selectedFriends={taggedFriends} onTagFriends={setTaggedFriends} />
      <LocationCheckin isOpen={showLocationDialog} onClose={() => setShowLocationDialog(false)} currentLocation={location} onSelectLocation={setLocation} />
      <FeelingActivityDialog isOpen={showFeelingDialog} onClose={() => setShowFeelingDialog(false)} onSelect={handleFeelingSelect} />

      {/* Image Editor */}
      <ImageEditorModal
        open={Boolean(editingAttachment)}
        attachment={editingAttachment}
        onClose={() => setEditingAttachmentId(null)}
        onSave={replaceEditedAttachment}
      />
    </>
  );
};

/** @deprecated Use CreatePost instead */
export const FacebookCreatePost = CreatePost;
