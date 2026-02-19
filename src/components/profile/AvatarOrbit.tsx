import React, { useEffect, useRef, useState } from 'react';
import diamondSrc from '@/assets/diamond-user.png';
import { X, Plus, Check, Pencil } from 'lucide-react';
import { PLATFORM_PRESETS, PLATFORM_ORDER } from './SocialLinksEditor';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SocialLink {
  platform: string;
  label: string;
  url: string;
  color: string;
  favicon: string;
  avatarUrl?: string; // fetched og:image from the social profile page
}

const ORBIT_RADIUS = 115;
const ORBIT_SIZE = 40;
const AVATAR_SIZE = 176;

function useTransparentDiamond(src: string) {
  const [dataUrl, setDataUrl] = useState<string>(src);
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] > 220 && data[i + 1] > 220 && data[i + 2] > 220) data[i + 3] = 0;
      }
      ctx.putImageData(imageData, 0, 0);
      setDataUrl(canvas.toDataURL('image/png'));
    };
    img.src = src;
  }, [src]);
  return dataUrl;
}

function computeAngles(n: number): number[] {
  if (n === 0) return [];
  if (n === 1) return [180];
  const maxSpan = 260;
  const span = Math.min(maxSpan, (n - 1) * (maxSpan / 8));
  const start = 180 - span / 2;
  const step = span / (n - 1);
  return Array.from({ length: n }, (_, i) => start + step * i);
}

function angleToPos(angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: Math.sin(rad) * ORBIT_RADIUS, y: -Math.cos(rad) * ORBIT_RADIUS };
}

function computeAddAngle(n: number): number {
  if (n === 0) return 180;
  const angles = computeAngles(n);
  const last = angles[angles.length - 1];
  const step = n === 1 ? 32 : 260 / Math.max(n - 1, 1);
  return Math.min(last + step * 0.85, 310);
}

interface AvatarOrbitProps {
  children: React.ReactNode;
  socialLinks?: SocialLink[];
  isOwner?: boolean;
  userId?: string;
  onLinksChanged?: (links: SocialLink[]) => void;
}

export function AvatarOrbit({ children, socialLinks = [], isOwner = false, userId, onLinksChanged }: AvatarOrbitProps) {
  const transparentDiamond = useTransparentDiamond(diamondSrc);

  // Edit state (pencil button)
  const [editingPlatform, setEditingPlatform] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [hoveredPlatform, setHoveredPlatform] = useState<string | null>(null);

  // Pending new slot (selected from picker but not saved yet)
  const [pendingPlatform, setPendingPlatform] = useState<string | null>(null);
  const [pendingUrl, setPendingUrl] = useState('');

  // Add picker
  const [showAddPicker, setShowAddPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const editRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef<HTMLDivElement>(null);

  const usedPlatforms = new Set(socialLinks.map((l) => l.platform));
  const availablePlatforms = PLATFORM_ORDER.filter((p) => !usedPlatforms.has(p));

  // Platforms supported by unavatar.io for real user profile pictures
  const UNAVATAR_PLATFORMS = ['facebook', 'youtube', 'twitter', 'tiktok', 'telegram', 'instagram', 'github'];
  // Platforms where we cannot get individual user avatars (JS-rendered or private API)
  const NO_AVATAR_PLATFORMS = ['zalo', 'funplay'];
  // Known bad og:image values (site-wide OG images, not user avatars)
  const BAD_AVATAR_URLS = ['funplay-og-image', 'stc-zlogin.zdn.vn', 'static.xx.fbcdn.net/rsrc.php'];

  // Auto-fetch: only for links missing avatarUrl, skip platforms that can't provide personal avatars
  useEffect(() => {
    if (!isOwner || !userId) return;

    const linksToRefetch = socialLinks.filter((l) => {
      if (!l.url) return false;
      // Skip platforms that don't support personal avatar fetching
      if (NO_AVATAR_PLATFORMS.includes(l.platform)) return false;
      // Clear bad avatarUrls
      if (l.avatarUrl && BAD_AVATAR_URLS.some((d) => l.avatarUrl!.includes(d))) return true;
      // Only fetch if no avatarUrl yet
      if (!l.avatarUrl) return true;
      // For unavatar platforms: re-fetch if not using unavatar.io URL
      if (UNAVATAR_PLATFORMS.includes(l.platform) && !l.avatarUrl.includes('unavatar.io')) return true;
      return false;
    });

    if (linksToRefetch.length === 0) return;

    const fetchMissing = async () => {
      let updated = false;
      const newLinks = [...socialLinks];
      for (const link of linksToRefetch) {
        try {
          const { data } = await supabase.functions.invoke('fetch-link-preview', {
            body: { url: link.url, platform: link.platform },
          });
          const idx = newLinks.findIndex((l) => l.platform === link.platform);
          if (idx !== -1) {
            if (data?.avatarUrl) {
              // Got a real user avatar
              newLinks[idx] = { ...newLinks[idx], avatarUrl: data.avatarUrl };
              updated = true;
            } else if (newLinks[idx].avatarUrl && BAD_AVATAR_URLS.some((d) => newLinks[idx].avatarUrl!.includes(d))) {
              // Clear bad stored avatarUrl so favicon shows instead
              const { avatarUrl: _bad, ...rest } = newLinks[idx];
              newLinks[idx] = rest as SocialLink;
              updated = true;
            }
          }
        } catch {
          // ignore
        }
      }
      if (updated) {
        await supabase.from('profiles').update({ social_links: newLinks as any }).eq('id', userId);
        onLinksChanged?.(newLinks);
      }
    };

    fetchMissing();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner, userId]);

  // All slots = saved links + pending slot (if any)
  const allLinks: (SocialLink & { isPending?: boolean })[] = [
    ...socialLinks,
    ...(pendingPlatform && PLATFORM_PRESETS[pendingPlatform]
      ? [{ platform: pendingPlatform, label: PLATFORM_PRESETS[pendingPlatform].label, url: '', color: PLATFORM_PRESETS[pendingPlatform].color, favicon: PLATFORM_PRESETS[pendingPlatform].favicon, isPending: true }]
      : []),
  ];

  const angles = computeAngles(allLinks.length);

  // Close picker / editor on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (showAddPicker && pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowAddPicker(false);
      }
      if (editingPlatform && editRef.current && !editRef.current.contains(e.target as Node)) {
        setEditingPlatform(null);
      }
      if (pendingPlatform && pendingRef.current && !pendingRef.current.contains(e.target as Node)) {
        setPendingPlatform(null);
        setPendingUrl('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showAddPicker, editingPlatform, pendingPlatform]);

  const fetchLinkAvatar = async (url: string, platform: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('fetch-link-preview', {
        body: { url, platform },
      });
      if (error || !data?.avatarUrl) return null;
      return data.avatarUrl;
    } catch {
      return null;
    }
  };

  const saveLink = async (platform: string, url: string, isNew = false) => {
    if (!userId || !url.trim()) return;
    setSaving(true);
    const normalized = url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`;

    // Fetch avatar (og:image) from the linked profile page
    const fetchedAvatarUrl = await fetchLinkAvatar(normalized, platform);

    let newLinks: SocialLink[];
    if (isNew) {
      const preset = PLATFORM_PRESETS[platform];
      if (!preset) { setSaving(false); return; }
      newLinks = [...socialLinks, { platform, label: preset.label, url: normalized, color: preset.color, favicon: preset.favicon, avatarUrl: fetchedAvatarUrl || undefined }];
    } else {
      newLinks = socialLinks.map((l) => l.platform === platform ? { ...l, url: normalized, avatarUrl: fetchedAvatarUrl || l.avatarUrl } : l);
    }
    const { error } = await supabase.from('profiles').update({ social_links: newLinks as any }).eq('id', userId);
    setSaving(false);
    if (error) { toast.error('Không thể lưu link'); return; }
    toast.success('Đã lưu!');
    onLinksChanged?.(newLinks);
    setEditingPlatform(null);
    setPendingPlatform(null);
    setPendingUrl('');
    setShowAddPicker(false);
  };

  const removeLink = async (platform: string) => {
    if (!userId) return;
    const newLinks = socialLinks.filter((l) => l.platform !== platform);
    const { error } = await supabase.from('profiles').update({ social_links: newLinks as any }).eq('id', userId);
    if (error) { toast.error('Không thể xoá link'); return; }
    toast.success('Đã xoá!');
    onLinksChanged?.(newLinks);
    setEditingPlatform(null);
  };

  // When user picks a platform from picker → move to orbit immediately
  const handlePickPlatform = (platform: string) => {
    setShowAddPicker(false);
    setPendingPlatform(platform);
    setPendingUrl('');
  };

  const addAngle = computeAddAngle(allLinks.length);
  const addPos = angleToPos(addAngle);
  const showAddBtn = isOwner && allLinks.length < 9 && !pendingPlatform;

  return (
    <div
      className="relative flex flex-col items-center"
      style={{ paddingTop: '110px', paddingBottom: `${ORBIT_RADIUS + ORBIT_SIZE / 2 + 8}px` }}
    >
      {/* Kim cương */}
      <div className="absolute pointer-events-none" style={{ top: '-10px', left: '50%', transform: 'translateX(-50%)', zIndex: 40 }}>
        <img src={transparentDiamond} alt="Kim cương xanh" style={{ width: '200px', height: '200px', objectFit: 'contain', display: 'block' }} />
      </div>

      {/* Wrapper cố định */}
      <div style={{ position: 'relative', width: `${AVATAR_SIZE}px`, height: `${AVATAR_SIZE}px`, overflow: 'visible', zIndex: 10, flexShrink: 0 }}>
        {/* Avatar */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {children}
        </div>

        {/* Social link orbital slots */}
        {allLinks.map((link, i) => {
          const { x, y } = angleToPos(angles[i]);
          const isEditing = editingPlatform === link.platform;
          const isPending = !!link.isPending;
          const isHovered = hoveredPlatform === link.platform;

          return (
            <div
              key={link.platform}
              className="absolute"
              style={{
                left: `${AVATAR_SIZE / 2 + x - ORBIT_SIZE / 2}px`,
                top: `${AVATAR_SIZE / 2 + y - ORBIT_SIZE / 2}px`,
                width: `${ORBIT_SIZE}px`,
                height: `${ORBIT_SIZE}px`,
                zIndex: (isEditing || isPending) ? 30 : 20,
              }}
              onMouseEnter={() => setHoveredPlatform(link.platform)}
              onMouseLeave={() => setHoveredPlatform(null)}
            >
              {/* Pending slot popup — mở sẵn để nhập link */}
              {isPending && (
                <div
                  ref={pendingRef}
                  className="absolute z-50 bg-card border border-border rounded-xl shadow-xl p-3"
                  style={{ bottom: '110%', left: '50%', transform: 'translateX(-50%)', width: '220px' }}
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center flex-shrink-0" style={{ border: `1.5px solid ${link.color}` }}>
                      <img src={link.favicon} alt="" className="w-3 h-3 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    </div>
                    <span className="text-xs font-semibold" style={{ color: link.color }}>{link.label}</span>
                    <button type="button" onClick={() => { setPendingPlatform(null); setPendingUrl(''); }} className="ml-auto p-0.5 rounded hover:bg-muted transition-colors">
                      <X className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </div>
                  <input
                    autoFocus
                    type="url"
                    value={pendingUrl}
                    onChange={(e) => setPendingUrl(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && pendingUrl.trim()) saveLink(link.platform, pendingUrl, true); }}
                    placeholder={`https://${link.label.toLowerCase()}.com/...`}
                    className="w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary mb-2"
                  />
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => { setPendingPlatform(null); setPendingUrl(''); }}
                      className="flex-1 text-xs px-2 py-1 rounded-lg border border-border hover:bg-muted transition-colors"
                    >
                      Huỷ
                    </button>
                    <button
                      type="button"
                      disabled={saving || !pendingUrl.trim()}
                      onClick={() => saveLink(link.platform, pendingUrl, true)}
                      className="flex-1 text-xs px-2 py-1 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      <Check className="w-3 h-3" /> Lưu
                    </button>
                  </div>
                </div>
              )}

              {/* Edit popup (existing link) */}
              {isEditing && isOwner && !isPending && (
                <div
                  ref={editRef}
                  className="absolute z-50 bg-card border border-border rounded-xl shadow-xl p-3"
                  style={{ bottom: '110%', left: '50%', transform: 'translateX(-50%)', width: '220px' }}
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center flex-shrink-0" style={{ border: `1.5px solid ${link.color}` }}>
                      <img src={link.favicon} alt="" className="w-3 h-3 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    </div>
                    <span className="text-xs font-semibold" style={{ color: link.color }}>{link.label}</span>
                    <button type="button" onClick={() => setEditingPlatform(null)} className="ml-auto p-0.5 rounded hover:bg-muted transition-colors">
                      <X className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </div>
                  <input
                    autoFocus
                    type="url"
                    value={editUrl}
                    onChange={(e) => setEditUrl(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveLink(link.platform, editUrl); }}
                    placeholder="https://..."
                    className="w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary mb-2"
                  />
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => removeLink(link.platform)}
                      className="flex-1 text-xs px-2 py-1 rounded-lg border border-destructive/40 text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      Xoá
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => saveLink(link.platform, editUrl)}
                      className="flex-1 text-xs px-2 py-1 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      <Check className="w-3 h-3" /> Lưu
                    </button>
                  </div>
                </div>
              )}

              {/* Tooltip for non-owner */}
              {!isOwner && isHovered && (
                <div
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded text-xs whitespace-nowrap pointer-events-none z-50"
                  style={{ background: 'rgba(0,0,0,0.75)', color: '#fff' }}
                >
                  {link.label}
                </div>
              )}

              {/* Icon */}
              {isPending ? (
                /* Pending slot — hiển thị với viền nét đứt, mờ hơn */
                <div
                  className="w-full h-full rounded-full bg-white flex items-center justify-center shadow-md animate-pulse overflow-hidden"
                  style={{ border: `2.5px dashed ${link.color}`, boxShadow: `0 0 8px ${link.color}44`, opacity: 0.85 }}
                >
                  <img src={link.favicon} alt={link.label} className="w-6 h-6 object-cover rounded-full" style={{ pointerEvents: 'none' }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const p = e.currentTarget.parentElement;
                      if (p && !p.querySelector('.fallback-letter')) {
                        const s = document.createElement('span');
                        s.className = 'fallback-letter text-xs font-bold';
                        s.style.color = link.color;
                        s.textContent = link.label[0];
                        p.appendChild(s);
                      }
                    }}
                  />
                </div>
              ) : (
                /* Saved slot — ưu tiên avatarUrl (ảnh đại diện thực), fallback về favicon */
                <a
                  href={link.url.startsWith('http') ? link.url : `https://${link.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-full rounded-full bg-white flex items-center justify-center transition-transform duration-200 shadow-md hover:scale-110 cursor-pointer overflow-hidden"
                  style={{ display: 'flex', border: `2.5px solid ${link.color}`, boxShadow: `0 0 8px ${link.color}66` }}
                >
                  {link.avatarUrl ? (
                    <img
                      src={link.avatarUrl}
                      alt={link.label}
                      className="w-full h-full object-cover rounded-full"
                      style={{ pointerEvents: 'none' }}
                      onError={(e) => {
                        // Fallback to favicon if avatarUrl fails
                        e.currentTarget.src = link.favicon;
                        e.currentTarget.className = 'w-6 h-6 object-cover rounded-full';
                      }}
                    />
                  ) : (
                    <img
                      src={link.favicon}
                      alt={link.label}
                      className="w-6 h-6 object-cover rounded-full"
                      style={{ pointerEvents: 'none' }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const p = e.currentTarget.parentElement;
                        if (p && !p.querySelector('.fallback-letter')) {
                          const s = document.createElement('span');
                          s.className = 'fallback-letter text-xs font-bold';
                          s.style.color = link.color;
                          s.textContent = link.label[0];
                          p.appendChild(s);
                        }
                      }}
                    />
                  )}
                </a>
              )}

              {/* Pencil edit button (owner only, on hover, saved links only) */}
              {isOwner && isHovered && !isEditing && !isPending && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setEditingPlatform(link.platform);
                    setEditUrl(link.url);
                  }}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-card border border-border shadow flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors z-40"
                  title="Sửa link"
                >
                  <Pencil className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          );
        })}

        {/* Nút + */}
        {showAddBtn && (
          <div
            className="absolute"
            style={{
              left: `${AVATAR_SIZE / 2 + addPos.x - ORBIT_SIZE / 2}px`,
              top: `${AVATAR_SIZE / 2 + addPos.y - ORBIT_SIZE / 2}px`,
              width: `${ORBIT_SIZE}px`,
              height: `${ORBIT_SIZE}px`,
              zIndex: showAddPicker ? 30 : 20,
            }}
          >
            {/* Add picker popup */}
            {showAddPicker && (
              <div
                ref={pickerRef}
                className="absolute z-50 bg-card border border-border rounded-xl shadow-xl p-3"
                style={{ bottom: '110%', left: '50%', transform: 'translateX(-50%)', width: '252px' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-foreground">Chọn mạng xã hội</p>
                  <button type="button" onClick={() => setShowAddPicker(false)} className="p-0.5 rounded hover:bg-muted">
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {availablePlatforms.map((p) => {
                    const preset = PLATFORM_PRESETS[p];
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handlePickPlatform(p)}
                        className="flex flex-col items-center gap-1 px-1 py-2 rounded-lg border border-border text-[10px] transition-all hover:border-current hover:scale-105"
                        style={{ '--tw-border-opacity': 1 } as React.CSSProperties}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = preset.color; (e.currentTarget as HTMLButtonElement).style.background = `${preset.color}18`; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = ''; (e.currentTarget as HTMLButtonElement).style.background = ''; }}
                      >
                        <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm" style={{ border: `1.5px solid ${preset.color}` }}>
                          <img src={preset.favicon} alt={preset.label} className="w-4 h-4 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        </div>
                        <span className="truncate w-full text-center font-medium leading-tight">{preset.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowAddPicker(!showAddPicker)}
              className="w-full h-full rounded-full bg-primary text-primary-foreground hover:scale-110 hover:bg-primary/90 transition-all duration-200 shadow-md flex items-center justify-center"
              style={{ boxShadow: '0 0 10px hsl(var(--primary) / 0.5)' }}
              title="Thêm mạng xã hội"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
