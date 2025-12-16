import { useState, useRef } from 'react';
import { Camera, Upload, ImageIcon, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { uploadToR2 } from '@/utils/r2Upload';
import { compressImage } from '@/utils/imageCompression';

// Template cover images - using high-quality placeholder URLs
const coverTemplates = [
  {
    id: 'tropical-beach',
    name: 'Tropical Beach',
    nameVi: 'Bãi biển nhiệt đới',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&h=1080&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=225&fit=crop'
  },
  {
    id: 'lush-forest',
    name: 'Lush Forest',
    nameVi: 'Rừng cây tươi tốt',
    url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920&h=1080&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=400&h=225&fit=crop'
  },
  {
    id: 'blossoming-garden',
    name: 'Blossoming Garden',
    nameVi: 'Vườn hoa nở rộ',
    url: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=1920&h=1080&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=400&h=225&fit=crop'
  },
  {
    id: 'clear-stream',
    name: 'Clear Stream',
    nameVi: 'Dòng suối trong vắt',
    url: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=1920&h=1080&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=400&h=225&fit=crop'
  },
  {
    id: 'golden-sunset',
    name: 'Golden Sunset',
    nameVi: 'Hoàng hôn vàng',
    url: 'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=1920&h=1080&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=400&h=225&fit=crop'
  },
  {
    id: 'mountain-peak',
    name: 'Mountain Peak',
    nameVi: 'Đỉnh núi hùng vĩ',
    url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&h=1080&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&h=225&fit=crop'
  },
  {
    id: 'lotus-pond',
    name: 'Lotus Pond',
    nameVi: 'Ao sen bình yên',
    url: 'https://images.unsplash.com/photo-1606567595334-d39972c85dfd?w=1920&h=1080&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1606567595334-d39972c85dfd?w=400&h=225&fit=crop'
  },
  {
    id: 'aurora-sky',
    name: 'Aurora Sky',
    nameVi: 'Bầu trời cực quang',
    url: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1920&h=1080&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=400&h=225&fit=crop'
  }
];

interface CoverPhotoEditorProps {
  userId: string;
  currentCoverUrl?: string | null;
  onCoverUpdated: (newUrl: string) => void;
}

export function CoverPhotoEditor({ userId, currentCoverUrl, onCoverUpdated }: CoverPhotoEditorProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isTemplateLibraryOpen, setIsTemplateLibraryOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ảnh phải nhỏ hơn 5MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file ảnh');
      return;
    }

    setIsUploading(true);
    setIsMenuOpen(false);

    try {
      // Compress image for cover (1920px wide, high quality)
      const compressedFile = await compressImage(file, {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.85,
        targetSizeKB: 500
      });
      
      // Upload to R2 using 'avatars' bucket (general profile media)
      const result = await uploadToR2(compressedFile, 'avatars');
      const uploadedUrl = result.url;
      
      // Update profile in database
      const { error } = await supabase
        .from('profiles')
        .update({ cover_url: uploadedUrl })
        .eq('id', userId);

      if (error) throw error;

      onCoverUpdated(uploadedUrl);
      toast.success('Đã cập nhật ảnh bìa');
    } catch (error) {
      console.error('Error uploading cover:', error);
      toast.error('Không thể tải lên ảnh bìa');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSelectTemplate = async (templateUrl: string) => {
    setSelectedTemplate(templateUrl);
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplate) return;

    setIsUploading(true);

    try {
      // Update profile with template URL directly
      const { error } = await supabase
        .from('profiles')
        .update({ cover_url: selectedTemplate })
        .eq('id', userId);

      if (error) throw error;

      onCoverUpdated(selectedTemplate);
      setIsTemplateLibraryOpen(false);
      setSelectedTemplate(null);
      toast.success('Đã áp dụng ảnh bìa mẫu');
    } catch (error) {
      console.error('Error applying template:', error);
      toast.error('Không thể áp dụng ảnh bìa');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      {/* Edit Cover Button */}
      <div className="relative">
        <Button 
          size="sm" 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="bg-white/95 text-gray-800 hover:bg-white shadow-lg border border-gray-200"
          disabled={isUploading}
        >
          <Camera className="w-4 h-4 mr-2" />
          {isUploading ? 'Đang tải...' : 'Chỉnh sửa ảnh bìa'}
        </Button>

        {/* Dropdown Menu */}
        {isMenuOpen && (
          <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
            <button
              onClick={() => {
                fileInputRef.current?.click();
              }}
              className="w-full px-4 py-3 text-left hover:bg-gray-100 flex items-center gap-3 transition-colors"
            >
              <Upload className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium text-gray-800">Tải ảnh lên</p>
                <p className="text-xs text-muted-foreground">Chọn ảnh từ thiết bị</p>
              </div>
            </button>
            <button
              onClick={() => {
                setIsMenuOpen(false);
                setIsTemplateLibraryOpen(true);
              }}
              className="w-full px-4 py-3 text-left hover:bg-gray-100 flex items-center gap-3 transition-colors"
            >
              <ImageIcon className="w-5 h-5 text-gold-500" />
              <div>
                <p className="font-medium text-gray-800">Chọn từ Kho Mẫu</p>
                <p className="text-xs text-muted-foreground">Ảnh bìa thiên nhiên đẹp</p>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Template Library Modal */}
      <Dialog open={isTemplateLibraryOpen} onOpenChange={setIsTemplateLibraryOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <ImageIcon className="w-6 h-6 text-primary" />
              Kho Ảnh Bìa Mẫu
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[60vh] pr-2">
            <p className="text-muted-foreground mb-4">
              Chọn một ảnh bìa từ bộ sưu tập thiên nhiên và sự thịnh vượng
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {coverTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template.url)}
                  className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all duration-200 group ${
                    selectedTemplate === template.url 
                      ? 'border-primary ring-2 ring-primary/30 scale-[1.02]' 
                      : 'border-transparent hover:border-primary/50 hover:scale-[1.02]'
                  }`}
                >
                  <img
                    src={template.thumbnail}
                    alt={template.nameVi}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {/* Overlay with name */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end">
                    <p className="text-white text-xs font-medium p-2 truncate w-full">
                      {template.nameVi}
                    </p>
                  </div>
                  {/* Selected Checkmark */}
                  {selectedTemplate === template.url && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Preview and Apply */}
          {selectedTemplate && (
            <div className="border-t pt-4 mt-4">
              <p className="text-sm text-muted-foreground mb-2">Xem trước:</p>
              <div className="relative aspect-[3/1] rounded-lg overflow-hidden mb-4">
                <img
                  src={selectedTemplate}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                {/* Gradient Edge Effect Preview */}
                <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-white via-white/50 to-transparent" />
                <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-white via-white/50 to-transparent" />
              </div>
              <div className="flex gap-2 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedTemplate(null)}
                >
                  <X className="w-4 h-4 mr-2" />
                  Hủy
                </Button>
                <Button 
                  onClick={handleApplyTemplate}
                  disabled={isUploading}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Check className="w-4 h-4 mr-2" />
                  {isUploading ? 'Đang áp dụng...' : 'Áp dụng ảnh bìa'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Click outside to close menu */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsMenuOpen(false)}
        />
      )}
    </>
  );
}
