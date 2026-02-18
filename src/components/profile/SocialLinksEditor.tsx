import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Plus } from 'lucide-react';
import type { SocialLink } from './AvatarOrbit';

const PLATFORMS = [
  {
    platform: 'angel',
    label: 'Angel AI',
    color: '#7C3AED',
    favicon: 'https://angel.fun.rich/favicon.ico',
    placeholder: 'https://angel.fun.rich/@username',
  },
  {
    platform: 'funplay',
    label: 'Fun Play',
    color: '#22c55e',
    favicon: 'https://play.fun.rich/favicon.ico',
    placeholder: 'https://play.fun.rich/@username',
  },
  {
    platform: 'facebook',
    label: 'Facebook',
    color: '#1877F2',
    favicon: 'https://www.facebook.com/favicon.ico',
    placeholder: 'https://facebook.com/username',
  },
  {
    platform: 'youtube',
    label: 'YouTube',
    color: '#FF0000',
    favicon: 'https://www.youtube.com/favicon.ico',
    placeholder: 'https://youtube.com/@username',
  },
  {
    platform: 'twitter',
    label: 'Twitter/X',
    color: '#000000',
    favicon: 'https://x.com/favicon.ico',
    placeholder: 'https://x.com/username',
  },
  {
    platform: 'telegram',
    label: 'Telegram',
    color: '#2AABEE',
    favicon: 'https://telegram.org/favicon.ico',
    placeholder: 'https://t.me/username',
  },
  {
    platform: 'tiktok',
    label: 'TikTok',
    color: '#010101',
    favicon: 'https://www.tiktok.com/favicon.ico',
    placeholder: 'https://tiktok.com/@username',
  },
  {
    platform: 'linkedin',
    label: 'LinkedIn',
    color: '#0077B5',
    favicon: 'https://www.linkedin.com/favicon.ico',
    placeholder: 'https://linkedin.com/in/username',
  },
  {
    platform: 'zalo',
    label: 'Zalo',
    color: '#0068FF',
    favicon: 'https://zalo.me/favicon.ico',
    placeholder: 'https://zalo.me/username',
  },
];

interface SocialLinksEditorProps {
  value: SocialLink[];
  onChange: (links: SocialLink[]) => void;
}

export function SocialLinksEditor({ value, onChange }: SocialLinksEditorProps) {
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [inputUrl, setInputUrl] = useState('');

  const usedPlatforms = new Set(value.map(l => l.platform));
  const availablePlatforms = PLATFORMS.filter(p => !usedPlatforms.has(p.platform));
  const selectedMeta = PLATFORMS.find(p => p.platform === selectedPlatform);

  const handleAdd = () => {
    if (!selectedPlatform || !inputUrl.trim()) return;
    if (value.length >= 9) return;
    const meta = PLATFORMS.find(p => p.platform === selectedPlatform);
    if (!meta) return;

    const newLink: SocialLink = {
      platform: meta.platform,
      label: meta.label,
      url: inputUrl.trim(),
      color: meta.color,
      favicon: meta.favicon,
    };

    onChange([...value, newLink]);
    setSelectedPlatform('');
    setInputUrl('');
  };

  const handleRemove = (platform: string) => {
    onChange(value.filter(l => l.platform !== platform));
  };

  return (
    <div className="space-y-4">
      <Label className="text-base font-semibold">🌐 Mạng xã hội</Label>
      <p className="text-xs text-muted-foreground">
        Thêm tối đa 9 liên kết. Chúng sẽ xuất hiện quanh ảnh đại diện của bạn.
      </p>

      {/* Danh sách đã thêm */}
      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((link) => (
            <div
              key={link.platform}
              className="flex items-center gap-3 p-2 rounded-lg border border-border bg-muted/30"
            >
              {/* Icon */}
              <div
                className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-white flex items-center justify-center"
                style={{ border: `2.5px solid ${link.color}`, boxShadow: `0 0 6px ${link.color}55` }}
              >
                <img
                  src={link.favicon}
                  alt={link.label}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                      parent.innerHTML = `<span style="font-size:14px;font-weight:bold;color:${link.color}">${link.label[0]}</span>`;
                    }
                  }}
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: link.color }}>{link.label}</p>
                <p className="text-xs text-muted-foreground truncate">{link.url}</p>
              </div>

              {/* Xoá */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="flex-shrink-0 h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => handleRemove(link.platform)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Form thêm mới */}
      {value.length < 9 && availablePlatforms.length > 0 && (
        <div className="space-y-3 p-3 rounded-lg border border-dashed border-border">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Chọn nền tảng</Label>
            <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="-- Chọn mạng xã hội --" />
              </SelectTrigger>
              <SelectContent>
                {availablePlatforms.map((p) => (
                  <SelectItem key={p.platform} value={p.platform}>
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ background: p.color }}
                      />
                      {p.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">URL trang cá nhân</Label>
            <Input
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder={selectedMeta?.placeholder || 'https://...'}
              className="h-9 text-sm"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
            />
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            disabled={!selectedPlatform || !inputUrl.trim()}
            onClick={handleAdd}
          >
            <Plus className="w-4 h-4 mr-2" />
            Thêm liên kết
          </Button>
        </div>
      )}

      {value.length >= 9 && (
        <p className="text-xs text-muted-foreground text-center">Đã đạt tối đa 9 liên kết.</p>
      )}
    </div>
  );
}
