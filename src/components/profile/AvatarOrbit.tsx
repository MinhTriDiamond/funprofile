import React, { useCallback, useEffect, useRef, useState } from 'react';
import diamondSrc from '@/assets/diamond-user.png';
import { X, Plus, Check, Pencil, GripVertical } from 'lucide-react';
import { PLATFORM_PRESETS, PLATFORM_ORDER } from './SocialLinksEditor';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { toJson } from '@/utils/supabaseJsonHelpers';
import { useIsMobile } from '@/hooks/use-mobile';

export interface SocialLink {
  platform: string;
  label: string;
  url: string;
  color: string;
  favicon: string;
  avatarUrl?: string;
}

const ORBIT_RADIUS_DESKTOP = 115;
const ORBIT_RADIUS_MOBILE = 54;
const ORBIT_SIZE = 40;
const AVATAR_SIZE = 176;
const DIAMOND_TOP_DESKTOP = 90;
const DIAMOND_TOP_MOBILE = 78;

function getOrbitConfig(isMobile: boolean) {
  const radius = isMobile ? ORBIT_RADIUS_MOBILE : ORBIT_RADIUS_DESKTOP;
  const wrapperSize = AVATAR_SIZE + (radius + ORBIT_SIZE) * 2;
  const center = wrapperSize / 2;
  const diamondTop = isMobile ? DIAMOND_TOP_MOBILE : DIAMOND_TOP_DESKTOP;
  return { radius, wrapperSize, center, diamondTop };
}

let cachedDiamondUrl: string | null = null;

function useTransparentDiamond(src: string) {
  const [dataUrl, setDataUrl] = useState<string>(cachedDiamondUrl ?? src);

  useEffect(() => {
    if (cachedDiamondUrl) {
      setDataUrl(cachedDiamondUrl);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setDataUrl(src);
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          if (data[i] > 220 && data[i + 1] > 220 && data[i + 2] > 220) {
            data[i + 3] = 0;
          }
        }

        ctx.putImageData(imageData, 0, 0);
        cachedDiamondUrl = canvas.toDataURL('image/png');
        setDataUrl(cachedDiamondUrl);
      } catch {
        setDataUrl(src);
      }
    };
    img.onerror = () => setDataUrl(src);
    img.src = src;
  }, [src]);

  return dataUrl;
}

function computeAngles(n: number): number[] {
  if (n === 0) return [];
  if (n === 1) return [180];
  const gap = 35;
  const totalSpread = gap * (n - 1);
  const startAngle = 180 - totalSpread / 2;
  return Array.from({ length: n }, (_, i) => startAngle + i * gap);
}

function computeAddAngle(n: number): number {
  const angles = computeAngles(n + 1);
  return angles[angles.length - 1] ?? 180;
}

function angleToPos(angleDeg: number, radius: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: Math.sin(rad) * radius, y: -Math.cos(rad) * radius };
}

interface OrbitLink extends SocialLink {
  isEmpty?: boolean;
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
  const isMobile = useIsMobile();
  const { radius: orbitRadius, wrapperSize, center, diamondTop } = getOrbitConfig(isMobile);

  const isOrbitHovered = useRef(false);
  const isDragging = useRef(false);
  const dragIndexRef = useRef<number | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const editRef = useRef<HTMLDivElement>(null);
  const promptRef = useRef<HTMLDivElement>(null);

  const [editingPlatform, setEditingPlatform] = useState<string | null>(null);
  const [promptingPlatform, setPromptingPlatform] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState('');
  const [promptUrl, setPromptUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [hoveredPlatform, setHoveredPlatform] = useState<string | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [localLinks, setLocalLinks] = useState<SocialLink[]>(socialLinks);

  useEffect(() => {
    setLocalLinks(socialLinks);
  }, [socialLinks]);

  const sanitizeUrl = (url?: string) => {
    if (!url) return undefined;
    return url.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
  };

  const getDisplayAvatarUrl = (link: SocialLink) => {
    const raw = sanitizeUrl(link.avatarUrl);
    if (!raw) return undefined;
    if (raw.includes('graph.facebook.com') || raw.includes('fbcdn.net')) {
      const backendUrl = import.meta.env.VITE_SUPABASE_URL;
      return `${backendUrl}/functions/v1/fetch-link-preview?proxy=${encodeURIComponent(raw)}`;
    }
    return raw;
  };

  useEffect(() => {
    if (!userId) return;

    const badAvatarDomains = [
      'funplay-og-image',
      'static.xx.fbcdn.net/rsrc.php',
      'unavatar.io/facebook',
      'unavatar.io/youtube',
      'unavatar.io/telegram',
      'unavatar.io/tiktok',
    ];
    const refetchPlatforms = ['youtube', 'twitter', 'tiktok', 'telegram', 'instagram', 'github', 'linkedin'];

    const linksToRefetch = localLinks.filter((link) => {
      if (!link.url) return false;
      if (link.avatarUrl?.includes('&amp;')) return true;
      if (link.platform === 'facebook' && link.avatarUrl?.includes('graph.facebook.com')) return true;
      if ((link.platform === 'angel' || link.platform === 'zalo') && !link.avatarUrl) return true;
      if (!link.avatarUrl) return true;
      if (badAvatarDomains.some((domain) => link.avatarUrl?.includes(domain))) return true;
      if (refetchPlatforms.includes(link.platform) && !link.avatarUrl.includes('unavatar.io')) return true;
      return false;
    });

    if (linksToRefetch.length === 0) return;

    const fetchMissing = async () => {
      let updated = false;
      const nextLinks = [...localLinks];

      for (const link of linksToRefetch) {
        try {
          const { data } = await supabase.functions.invoke('fetch-link-preview', {
            body: { url: link.url, platform: link.platform },
          });

          const index = nextLinks.findIndex((item) => item.platform === link.platform);
          if (index === -1) continue;

          if (data?.avatarUrl) {
            nextLinks[index] = { ...nextLinks[index], avatarUrl: data.avatarUrl };
            updated = true;
          }
        } catch {
          // ignore
        }
      }

      if (updated) {
        if (isOwner) {
          await supabase
            .from('profiles')
            .update({ social_links: toJson(nextLinks as unknown as Record<string, unknown>) })
            .eq('id', userId);
        }
        setLocalLinks(nextLinks);
        onLinksChanged?.(nextLinks);
      }
    };

    fetchMissing();
  }, [isOwner, localLinks, onLinksChanged, userId]);

  const usedPlatforms = new Set(localLinks.map((link) => link.platform));
  const availablePlatforms = PLATFORM_ORDER.filter((platform) => !usedPlatforms.has(platform));

  const defaultLinks: SocialLink[] = PLATFORM_ORDER.map((platform) => {
    const preset = PLATFORM_PRESETS[platform];
    return {
      platform,
      label: preset.label,
      url: '',
      color: preset.color,
      favicon: preset.favicon,
    };
  });

  const hasAnyUrl = localLinks.some((link) => link.url?.trim());
  const displayLinks = localLinks.length === 0 || (!hasAnyUrl && !isOwner)
    ? defaultLinks
    : localLinks;

  const allLinks: OrbitLink[] = displayLinks.map((link) => ({
    ...link,
    isEmpty: !link.url,
  }));

  const normalizeUrl = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return '';
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  };

  const persistLinks = useCallback(async (nextLinks: SocialLink[]) => {
    setLocalLinks(nextLinks);
    onLinksChanged?.(nextLinks);

    if (!isOwner || !userId) return;

    const { error } = await supabase
      .from('profiles')
      .update({ social_links: toJson(nextLinks as unknown as Record<string, unknown>) })
      .eq('id', userId);

    if (error) throw error;
  }, [isOwner, onLinksChanged, userId]);

  const fetchLinkAvatar = useCallback(async (platform: string, url: string) => {
    try {
      const { data } = await supabase.functions.invoke('fetch-link-preview', {
        body: { url, platform },
      });
      return data?.avatarUrl as string | undefined;
    } catch {
      return undefined;
    }
  }, []);

  const saveLink = useCallback(async (platform: string, value: string) => {
    const normalizedUrl = normalizeUrl(value);
    if (!normalizedUrl) {
      toast.error('Vui lòng nhập link hợp lệ');
      return;
    }

    setSaving(true);
    try {
      const avatarUrl = await fetchLinkAvatar(platform, normalizedUrl);
      const existingIndex = localLinks.findIndex((link) => link.platform === platform);
      const preset = PLATFORM_PRESETS[platform];

      const nextLinks = existingIndex === -1
        ? [
            ...localLinks,
            {
              platform,
              label: preset.label,
              url: normalizedUrl,
              color: preset.color,
              favicon: preset.favicon,
              avatarUrl,
            },
          ]
        : localLinks.map((link) =>
            link.platform === platform
              ? { ...link, url: normalizedUrl, avatarUrl: avatarUrl ?? link.avatarUrl }
              : link
          );

      await persistLinks(nextLinks);
      setEditingPlatform(null);
      setPromptingPlatform(null);
      setEditUrl('');
      setPromptUrl('');
      toast.success('Đã lưu liên kết');
    } catch (error) {
      console.error('Error saving social link:', error);
      toast.error('Không thể lưu liên kết');
    } finally {
      setSaving(false);
    }
  }, [fetchLinkAvatar, localLinks, persistLinks]);

  const savePromptLink = useCallback(async (platform: string, value: string) => {
    await saveLink(platform, value);
  }, [saveLink]);

  const removeLink = useCallback(async (platform: string) => {
    setSaving(true);
    try {
      const nextLinks = localLinks.filter((link) => link.platform !== platform);
      await persistLinks(nextLinks);
      setEditingPlatform(null);
      setPromptingPlatform(null);
      setEditUrl('');
      setPromptUrl('');
      toast.success('Đã xoá liên kết');
    } catch (error) {
      console.error('Error removing social link:', error);
      toast.error('Không thể xoá liên kết');
    } finally {
      setSaving(false);
    }
  }, [localLinks, persistLinks]);

  const handlePickPlatform = useCallback(async (platform: string) => {
    setShowAddPicker(false);
    setPromptingPlatform(platform);
    setPromptUrl('');
  }, []);

  const handleDragStart = useCallback((index: number) => {
    dragIndexRef.current = index;
    isDragging.current = true;
    setDraggingIndex(index);
  }, []);

  const handleDragOver = useCallback((hoverIndex: number) => {
    const dragIndex = dragIndexRef.current;
    if (dragIndex === null || dragIndex === hoverIndex) return;

    setLocalLinks((prev) => {
      if (dragIndex < 0 || dragIndex >= prev.length || hoverIndex < 0 || hoverIndex >= prev.length) {
        return prev;
      }
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(hoverIndex, 0, moved);
      dragIndexRef.current = hoverIndex;
      return next;
    });
  }, []);

  const handleDragEnd = useCallback(async () => {
    const nextLinks = [...localLinks];
    dragIndexRef.current = null;
    isDragging.current = false;
    setDraggingIndex(null);

    if (nextLinks.length === 0) return;

    try {
      await persistLinks(nextLinks);
    } catch (error) {
      console.error('Error reordering social links:', error);
      toast.error('Không thể cập nhật thứ tự liên kết');
    }
  }, [localLinks, persistLinks]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (showAddPicker && pickerRef.current && !pickerRef.current.contains(target)) setShowAddPicker(false);
      if (editingPlatform && editRef.current && !editRef.current.contains(target)) setEditingPlatform(null);
      if (promptingPlatform && promptRef.current && !promptRef.current.contains(target)) setPromptingPlatform(null);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [editingPlatform, promptingPlatform, showAddPicker]);

  const angles = computeAngles(allLinks.length);
  const addAngle = computeAddAngle(allLinks.length);
  const addPos = angleToPos(addAngle, orbitRadius);
  const showAddBtn = isOwner && allLinks.length < 9;

  return (
    <div
      className="relative"
      style={{ width: `${AVATAR_SIZE}px`, height: `${AVATAR_SIZE}px`, flexShrink: 0, overflow: 'visible' }}
    >
      <div
        className="pointer-events-none diamond-sparkle"
        style={{
          position: 'absolute',
          left: `${(AVATAR_SIZE - wrapperSize) / 2}px`,
          top: `${(AVATAR_SIZE - wrapperSize) / 2}px`,
          width: `${wrapperSize}px`,
          height: `${wrapperSize}px`,
          zIndex: 40,
          overflow: 'visible',
        }}
      >
        <div style={{ position: 'absolute', left: '50%', top: `${diamondTop}px`, transform: 'translateX(-50%)' }}>
          <span style={{ position: 'absolute', top: '18%', left: '10%', fontSize: '8px', color: 'hsl(var(--primary))' }}>✦</span>
          <span style={{ position: 'absolute', top: '5%', left: '55%', fontSize: '7px', color: 'hsl(var(--accent))' }}>✦</span>
          <span style={{ position: 'absolute', top: '22%', right: '8%', fontSize: '9px', color: 'hsl(var(--foreground))' }}>✦</span>
          <span style={{ position: 'absolute', top: '55%', left: '5%', fontSize: '6px', color: 'hsl(var(--primary))' }}>✦</span>
          <span style={{ position: 'absolute', top: '8%', left: '30%', fontSize: '7px', color: 'hsl(var(--accent))' }}>✦</span>
          <span style={{ position: 'absolute', top: '45%', right: '5%', fontSize: '6px', color: 'hsl(var(--foreground))' }}>✦</span>
          <img src={transparentDiamond} alt="Kim cương xanh" style={{ width: '100px', height: '100px', objectFit: 'contain', display: 'block' }} />
        </div>
      </div>

      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
        {children}
      </div>

      <div
        style={{
          position: 'absolute',
          width: `${wrapperSize}px`,
          height: `${wrapperSize}px`,
          left: `${(AVATAR_SIZE - wrapperSize) / 2}px`,
          top: `${(AVATAR_SIZE - wrapperSize) / 2}px`,
          overflow: 'visible',
          zIndex: 20,
          pointerEvents: 'none',
        }}
      >
        {allLinks.map((link, index) => {
          const { x, y } = angleToPos(angles[index], orbitRadius);
          const isEditing = editingPlatform === link.platform;
          const isPrompting = promptingPlatform === link.platform;
          const isHovered = hoveredPlatform === link.platform;
          const isDraggingThis = draggingIndex === index;

          return (
            <div
              key={link.platform}
              className="absolute"
              style={{
                left: `${center + x - ORBIT_SIZE / 2}px`,
                top: `${center + y - ORBIT_SIZE / 2}px`,
                width: `${ORBIT_SIZE}px`,
                height: `${ORBIT_SIZE}px`,
                zIndex: isEditing || isPrompting || isDraggingThis || isHovered ? 9999 : 20,
                opacity: isDraggingThis ? 0.6 : 1,
                transition: isDragging.current ? 'none' : 'opacity 0.2s',
                cursor: isOwner ? 'grab' : 'default',
                overflow: 'visible',
                pointerEvents: 'auto',
              }}
              onMouseEnter={() => {
                setHoveredPlatform(link.platform);
                isOrbitHovered.current = true;
              }}
              onMouseLeave={() => {
                if (!isEditing && !isPrompting) {
                  setHoveredPlatform(null);
                  if (!isDragging.current) isOrbitHovered.current = false;
                }
              }}
              onTouchStart={() => {
                setHoveredPlatform(link.platform);
                isOrbitHovered.current = true;
              }}
              onTouchEnd={() => {
                if (!isEditing && !isPrompting) {
                  setTimeout(() => {
                    setHoveredPlatform(null);
                    isOrbitHovered.current = false;
                  }, 1500);
                }
              }}
              draggable={isOwner && localLinks.length > 0 && !isEditing && !isPrompting}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => {
                e.preventDefault();
                handleDragOver(index);
              }}
              onDragEnd={handleDragEnd}
            >
              {isPrompting && isOwner && (
                <div
                  ref={promptRef}
                  className="fixed md:absolute z-50 bg-card border border-border rounded-xl shadow-xl p-4 md:p-3"
                  style={{
                    width: 'min(340px, 90vw)',
                    ...(isMobile
                      ? { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }
                      : { bottom: '110%', left: '50%', transform: 'translateX(-50%)' }),
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded-full bg-background flex items-center justify-center flex-shrink-0" style={{ border: `1.5px solid ${link.color}` }}>
                      <img src={link.favicon} alt="" className="w-3.5 h-3.5 object-contain" />
                    </div>
                    <span className="text-sm font-semibold" style={{ color: link.color }}>{link.label}</span>
                    <button type="button" onClick={() => { setPromptingPlatform(null); setPromptUrl(''); }} className="ml-auto p-1 rounded hover:bg-muted transition-colors">
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">Nhập link trang cá nhân của bạn</p>
                  <input
                    autoFocus
                    type="url"
                    value={promptUrl}
                    onChange={(e) => setPromptUrl(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') savePromptLink(link.platform, promptUrl); }}
                    placeholder={`https://${link.label.toLowerCase()}.com/...`}
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary mb-2"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { removeLink(link.platform); setPromptingPlatform(null); setPromptUrl(''); }}
                      className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-destructive/40 text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      Xoá
                    </button>
                    <button
                      type="button"
                      disabled={saving || !promptUrl.trim()}
                      onClick={() => savePromptLink(link.platform, promptUrl)}
                      className="flex-1 text-sm px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" /> Lưu
                    </button>
                  </div>
                </div>
              )}

              {isEditing && isOwner && (
                <div
                  ref={editRef}
                  className="fixed md:absolute z-50 bg-card border border-border rounded-xl shadow-xl p-4 md:p-3"
                  style={{
                    width: 'min(340px, 90vw)',
                    ...(isMobile
                      ? { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }
                      : { bottom: '110%', left: '50%', transform: 'translateX(-50%)' }),
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded-full bg-background flex items-center justify-center flex-shrink-0" style={{ border: `1.5px solid ${link.color}` }}>
                      <img src={link.favicon} alt="" className="w-3.5 h-3.5 object-contain" />
                    </div>
                    <span className="text-sm font-semibold" style={{ color: link.color }}>{link.label}</span>
                    <button type="button" onClick={() => setEditingPlatform(null)} className="ml-auto p-1 rounded hover:bg-muted transition-colors">
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                  <input
                    autoFocus
                    type="url"
                    value={editUrl}
                    onChange={(e) => setEditUrl(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveLink(link.platform, editUrl); }}
                    placeholder="https://..."
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary mb-2"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => removeLink(link.platform)}
                      className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-destructive/40 text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      Xoá
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => saveLink(link.platform, editUrl)}
                      className="flex-1 text-sm px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" /> Lưu
                    </button>
                  </div>
                </div>
              )}

              {isHovered && !isEditing && !isPrompting && (
                <div
                  className="absolute pointer-events-none flex flex-col items-center gap-0.5"
                  style={{
                    bottom: 'calc(100% + 8px)',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    minWidth: '100px',
                    maxWidth: '220px',
                    zIndex: 99999,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <div className="px-2.5 py-1.5 rounded-lg text-xs shadow-lg" style={{ background: link.color, color: '#fff', fontWeight: 600 }}>
                    {link.label}
                  </div>
                  {link.url && (
                    <div className="px-2 py-1 rounded-md text-xs shadow-md font-semibold" style={{ background: 'hsl(var(--background))', color: 'hsl(var(--primary))', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', border: '1px solid hsl(var(--border))' }}>
                      {link.url.replace(/^https?:\/\//, '')}
                    </div>
                  )}
                  {!link.url && isOwner && (
                    <div className="px-2 py-1 rounded-md text-xs shadow-md font-semibold" style={{ background: 'hsl(var(--background))', color: 'hsl(var(--primary))', border: '1px solid hsl(var(--border))' }}>
                      Nhấn ✏️ để thêm link
                    </div>
                  )}
                </div>
              )}

              {link.isEmpty ? (
                <button
                  type="button"
                  onClick={() => {
                    if (isOwner) {
                      setPromptingPlatform(link.platform);
                      setPromptUrl('');
                    }
                  }}
                  className="w-full h-full rounded-full bg-background flex items-center justify-center shadow-md overflow-hidden transition-transform duration-200 hover:scale-110"
                  style={{ border: `2.5px dashed ${link.color}`, boxShadow: `0 0 8px ${link.color}44` }}
                >
                  <img src={link.favicon} alt={link.label} className="w-6 h-6 object-cover rounded-full" />
                </button>
              ) : (
                <a
                  href={link.url.startsWith('http') ? link.url : `https://${link.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-full rounded-full bg-background flex items-center justify-center transition-transform duration-200 shadow-md hover:scale-110 cursor-pointer overflow-hidden"
                  style={{ display: 'flex', border: `2.5px solid ${link.color}`, boxShadow: `0 0 8px ${link.color}66` }}
                >
                  {link.avatarUrl ? (
                    <img
                      src={getDisplayAvatarUrl(link)}
                      alt={link.label}
                      className="w-full h-full object-cover rounded-full"
                      onError={(e) => {
                        e.currentTarget.src = link.favicon;
                        e.currentTarget.className = 'w-6 h-6 object-cover rounded-full';
                      }}
                    />
                  ) : (
                    <img src={link.favicon} alt={link.label} className="w-6 h-6 object-cover rounded-full" />
                  )}
                </a>
              )}

              {isOwner && isHovered && !isEditing && !isPrompting && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (link.isEmpty) {
                      setPromptingPlatform(link.platform);
                      setPromptUrl('');
                    } else {
                      setEditingPlatform(link.platform);
                      setEditUrl(link.url);
                    }
                  }}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-card border border-border shadow flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors z-40"
                  title="Sửa link"
                >
                  <Pencil className="w-2.5 h-2.5" />
                </button>
              )}

              {isOwner && isHovered && !isEditing && !isPrompting && localLinks.length > 0 && (
                <div className="absolute -bottom-1.5 -left-1.5 w-5 h-5 rounded-full bg-card border border-border shadow flex items-center justify-center cursor-grab z-40 opacity-70">
                  <GripVertical className="w-2.5 h-2.5 text-muted-foreground" />
                </div>
              )}
            </div>
          );
        })}

        {showAddBtn && (
          <div
            className="absolute"
            style={{
              left: `${center + addPos.x - ORBIT_SIZE / 2}px`,
              top: `${center + addPos.y - ORBIT_SIZE / 2}px`,
              width: `${ORBIT_SIZE}px`,
              height: `${ORBIT_SIZE}px`,
              zIndex: showAddPicker ? 30 : 20,
              pointerEvents: 'auto',
            }}
          >
            {showAddPicker && (
              <div
                ref={pickerRef}
                className="fixed md:absolute z-50 bg-card border border-border rounded-xl shadow-xl p-4 md:p-3"
                style={{
                  width: 'min(340px, 90vw)',
                  ...(isMobile
                    ? { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }
                    : { bottom: '110%', left: '50%', transform: 'translateX(-50%)' }),
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-foreground">Chọn mạng xã hội</p>
                  <button type="button" onClick={() => setShowAddPicker(false)} className="p-0.5 rounded hover:bg-muted">
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {availablePlatforms.map((platform) => {
                    const preset = PLATFORM_PRESETS[platform];
                    return (
                      <button
                        key={platform}
                        type="button"
                        onClick={() => handlePickPlatform(platform)}
                        className="flex flex-col items-center gap-1 px-1 py-2 rounded-lg border border-border text-[10px] transition-all hover:scale-105"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = preset.color;
                          e.currentTarget.style.background = `${preset.color}18`;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '';
                          e.currentTarget.style.background = '';
                        }}
                      >
                        <div className="w-6 h-6 rounded-full bg-background flex items-center justify-center shadow-sm" style={{ border: `1.5px solid ${preset.color}` }}>
                          <img src={preset.favicon} alt={preset.label} className="w-4 h-4 object-contain" />
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
              onClick={() => setShowAddPicker((prev) => !prev)}
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
