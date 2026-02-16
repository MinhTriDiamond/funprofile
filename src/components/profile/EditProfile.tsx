import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { uploadToR2, deleteFromR2 } from '@/utils/r2Upload';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Upload, AlertTriangle, Wallet } from 'lucide-react';
import { AvatarCropper } from './AvatarCropper';
import { DeleteAccountDialog } from './DeleteAccountDialog';
import { z } from 'zod';
import { compressImage, FILE_LIMITS } from '@/utils/imageCompression';
import { useLanguage } from '@/i18n/LanguageContext';

const profileSchema = z.object({
  username: z.string()
    .min(3, 'Username phải có ít nhất 3 ký tự')
    .max(50, 'Username tối đa 50 ký tự')
    .trim(),
  full_name: z.string()
    .max(100, 'Name must be less than 100 characters')
    .trim()
    .optional(),
  bio: z.string()
    .max(120, 'Bio must be less than 120 characters')
    .trim()
    .optional(),
});

export const EditProfile = () => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [publicWalletAddress, setPublicWalletAddress] = useState('');
  const [location, setLocation] = useState('');
  const [workplace, setWorkplace] = useState('');
  const [education, setEducation] = useState('');
  const [relationshipStatus, setRelationshipStatus] = useState('');
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>('');
  const { t } = useLanguage();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setUsername(data.username || '');
      setDisplayName(data.display_name || '');
      setFullName(data.full_name || '');
      setBio(data.bio || '');
      setAvatarUrl(data.avatar_url || '');
      setCoverUrl(data.cover_url || '');
      setPublicWalletAddress(data.public_wallet_address || '');
      setLocation((data as any).location || '');
      setWorkplace((data as any).workplace || '');
      setEducation((data as any).education || '');
      setRelationshipStatus((data as any).relationship_status || '');
    } catch (error) {
      // Error fetching profile - silent fail for security
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];

      // Validate file size (max 100MB)
      const MAX_SIZE = 100 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        toast.error('File quá lớn! Vui lòng chọn file dưới 100MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setCropImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Error loading image');
    }
  };

  const handleCropComplete = async (croppedImageBlob: Blob) => {
    try {
      setUploading(true);
      setCropImage(null);

      if (!userId) throw new Error('No user found');

      // Get session for access token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Vui lòng đăng nhập để tải ảnh lên');
        setUploading(false);
        return;
      }

      const file = new File([croppedImageBlob], 'avatar.jpg', { type: 'image/jpeg' });
      const result = await uploadToR2(file, 'avatars', `${userId}/avatar-${Date.now()}.jpg`, session.access_token);

      // Delete old avatar from R2 if exists
      if (avatarUrl) {
        try {
          const oldKey = avatarUrl.split('/').slice(-2).join('/');
          await deleteFromR2(oldKey);
        } catch (error) {
          console.error('Error deleting old avatar:', error);
        }
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: result.url })
        .eq('id', userId);

      if (updateError) throw updateError;

      setAvatarUrl(result.url);
      toast.success('Avatar updated successfully!');
    } catch (error) {
      toast.error('Error uploading avatar');
    } finally {
      setUploading(false);
    }
  };

  const handleCoverUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];

      if (file.size > FILE_LIMITS.IMAGE_MAX_SIZE) {
        toast.error('File quá lớn! Vui lòng chọn file dưới 100MB');
        return;
      }

      setUploadingCover(true);

      if (!userId) throw new Error('No user found');

      // Get session for access token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Vui lòng đăng nhập để tải ảnh lên');
        setUploadingCover(false);
        return;
      }

      // Compress cover image
      toast.loading('Đang nén ảnh...');
      const compressed = await compressImage(file, {
        maxWidth: FILE_LIMITS.COVER_MAX_WIDTH,
        maxHeight: FILE_LIMITS.COVER_MAX_HEIGHT,
        quality: 0.85,
      });
      toast.dismiss();

      const coverFile = new File([compressed], 'cover.jpg', { type: 'image/jpeg' });
      const result = await uploadToR2(coverFile, 'avatars', `${userId}/cover-${Date.now()}.jpg`, session.access_token);

      // Delete old cover from R2 if exists
      if (coverUrl) {
        try {
          const oldKey = coverUrl.split('/').slice(-2).join('/');
          await deleteFromR2(oldKey);
        } catch (error) {
          console.error('Error deleting old cover:', error);
        }
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ cover_url: result.url })
        .eq('id', userId);

      if (updateError) throw updateError;

      setCoverUrl(result.url);
      toast.success('Ảnh bìa đã được cập nhật!');
    } catch (error) {
      toast.error('Lỗi khi tải ảnh bìa');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedUsername = username.trim();
    
    // Validate profile fields
    const validation = profileSchema.safeParse({ 
      username: trimmedUsername, 
      full_name: fullName || undefined,
      bio: bio || undefined 
    });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setLoading(true);

    try {
      if (!userId) throw new Error('No user found');

      // Validate wallet address if provided
      if (publicWalletAddress && !/^0x[a-fA-F0-9]{40}$/.test(publicWalletAddress)) {
        toast.error(t('invalidWalletAddress'));
        setLoading(false);
        return;
      }

      // Check username uniqueness via username_normalized
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username_normalized', trimmedUsername)
        .neq('id', userId)
        .limit(1);

      if (existing && existing.length > 0) {
        toast.error('Username đã được sử dụng. Vui lòng chọn username khác.');
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          username: trimmedUsername,
          display_name: displayName,
          full_name: fullName,
          bio,
          public_wallet_address: publicWalletAddress || null,
          location: location || null,
          workplace: workplace || null,
          education: education || null,
          relationship_status: relationshipStatus || null,
        } as any)
        .eq('id', userId);

      if (error) throw error;

      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error('Error updating profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {cropImage && (
        <AvatarCropper
          image={cropImage}
          onCropComplete={handleCropComplete}
          onCancel={() => setCropImage(null)}
        />
      )}
      <Card className="overflow-hidden">
        <div className="relative">
          {coverUrl && (
            <div className="w-full h-48 bg-gradient-to-r from-primary/20 to-primary-glow/20">
              <img 
                src={coverUrl} 
                alt="Cover" 
                className="w-full h-full object-cover"
              />
            </div>
          )}
          {!coverUrl && (
            <div className="w-full h-48 bg-gradient-to-r from-primary/20 to-primary-glow/20" />
          )}
          <div className="absolute top-4 right-4">
            <Label htmlFor="cover" className="cursor-pointer">
              <Button type="button" variant="secondary" size="sm" disabled={uploadingCover} asChild>
                <span>
                  <Upload className="w-4 h-4 mr-2" />
                  {uploadingCover ? 'Đang tải...' : 'Đổi ảnh bìa'}
                </span>
              </Button>
            </Label>
            <Input
              id="cover"
              type="file"
              accept="image/*"
              onChange={handleCoverUpload}
              className="hidden"
              disabled={uploadingCover}
            />
          </div>
        </div>
        <CardHeader>
          <CardTitle>Chỉnh sửa hồ sơ</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <Avatar className="w-32 h-32 -mt-20 border-4 border-background">
                {avatarUrl && <AvatarImage src={avatarUrl} />}
                <AvatarFallback className="text-4xl">
                  {username?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-center gap-2">
                <Label htmlFor="avatar" className="cursor-pointer">
                  <Button type="button" variant="outline" disabled={uploading} asChild>
                    <span>
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading ? 'Đang tải...' : 'Tải ảnh đại diện'}
                    </span>
                  </Button>
                </Label>
                <Input
                  id="avatar"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </div>
              <p className="text-sm font-medium text-foreground">@{username || 'username'}</p>
              <div className="flex items-center gap-1 -mt-3">
                <a href={`/${username || 'username'}`} className="text-xs text-muted-foreground hover:text-primary hover:underline transition-colors">
                  http://fun.rich/{username || 'username'}
                </a>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`http://fun.rich/${username || 'username'}`);
                    toast.success('Đã sao chép link hồ sơ!');
                  }}
                  className="p-1 rounded hover:bg-muted text-primary"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Họ và tên</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nhập họ và tên đầy đủ"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName">Tên hiển thị</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value.slice(0, 50))}
                placeholder="Nhập Tên bạn muốn hiển thị"
              />
              <p className="text-xs text-muted-foreground">Tối đa 50 ký tự.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Tiểu sử</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 120))}
                placeholder="Giới thiệu về bạn (tối đa 120 ký tự)"
                rows={4}
                maxLength={120}
              />
              <p className="text-xs text-muted-foreground">{bio.length}/120 ký tự</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="usernameHandle">@ Username</Label>
              <Input
                id="usernameHandle"
                value={username}
                onChange={(e) => setUsername(e.target.value.slice(0, 50))}
                placeholder="Chọn @username duy nhất của bạn (giống Telegram)"
                className="font-mono text-sm"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <a href={`/${username || 'username'}`} className="hover:text-primary hover:underline transition-colors cursor-pointer">Link hồ sơ: http://fun.rich/{username || 'username'}</a>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`http://fun.rich/${username || 'username'}`);
                    toast.success('Đã sao chép link hồ sơ!');
                  }}
                  className="p-1 rounded hover:bg-muted text-primary"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">📍 Sống ở</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value.slice(0, 100))}
                placeholder="Ví dụ: Việt Nam, Hồ Chí Minh..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workplace">🏢 Làm việc tại</Label>
              <Input
                id="workplace"
                value={workplace}
                onChange={(e) => setWorkplace(e.target.value.slice(0, 100))}
                placeholder="Ví dụ: FUN Ecosystem..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="education">🎓 Học tại</Label>
              <Input
                id="education"
                value={education}
                onChange={(e) => setEducation(e.target.value.slice(0, 100))}
                placeholder="Ví dụ: Cosmic University..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="relationshipStatus">💕 Tình trạng mối quan hệ</Label>
              <Input
                id="relationshipStatus"
                value={relationshipStatus}
                onChange={(e) => setRelationshipStatus(e.target.value.slice(0, 50))}
                placeholder="Ví dụ: Độc thân, Đã kết hôn..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="publicWallet" className="flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                {t('publicWalletAddress')}
              </Label>
              <Input
                id="publicWallet"
                value={publicWalletAddress}
                onChange={(e) => setPublicWalletAddress(e.target.value)}
                placeholder="0x..."
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {t('publicWalletAddress')} (EVM, 0x...)
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Đang cập nhật...' : 'Cập nhật hồ sơ'}
            </Button>
          </form>
        </CardContent>
      </Card>

    </>
  );
};
