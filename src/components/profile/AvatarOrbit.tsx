import React, { useEffect, useRef, useState, useCallback } from 'react';
import diamondSrc from '@/assets/diamond-user.png';
import { X, Plus, Check, Pencil, GripVertical } from 'lucide-react';
import { PLATFORM_PRESETS, PLATFORM_ORDER } from './SocialLinksEditor';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Orbit rotation speed (degrees per second) — pause when hovering or dragging
const ORBIT_SPEED = 8;

export interface SocialLink {
  platform: string;
  label: string;
  url: string;
  color: string;
  favicon: string;
  avatarUrl?: string;
}

const ORBIT_RADIUS = 115;
const ORBIT_SIZE = 40;
const AVATAR_SIZE = 176;
// Wrapper lớn đủ chứa orbit không bị clip: 176 + (115+40)*2 = 486px
const WRAPPER_SIZE = AVATAR_SIZE + (ORBIT_RADIUS + ORBIT_SIZE) * 2;
const CENTER = WRAPPER_SIZE / 2; // 243px

// Cache the processed diamond so we only compute it once per session
let _cachedDiamondUrl: string | null = null;

function useTransparentDiamond(src: string) {
  const [dataUrl, setDataUrl] = useState<string>(_cachedDiamondUrl ?? src);
  useEffect(() => {
    if (_cachedDiamondUrl) {
      setDataUrl(_cachedDiamondUrl);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
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
        _cachedDiamondUrl = canvas.toDataURL('image/png');
        setDataUrl(_cachedDiamondUrl);
      } catch {
        // CORS or canvas taint — fallback to original src
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

  // Rotation animation — direct DOM update, no setState per frame
  const rotationRef = useRef(0);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const isOrbitHovered = useRef(false);
  const isDragging = useRef(false);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const baseAnglesRef = useRef<number[]>([]);


  useEffect(() => {
    const animate = (time: number) => {
      if (lastTimeRef.current > 0 && !isOrbitHovered.current && !isDragging.current) {
        const delta = (time - lastTimeRef.current) / 1000;
        rotationRef.current = (rotationRef.current + ORBIT_SPEED * delta) % 360;
        const rot = rotationRef.current;
        slotRefs.current.forEach((el, i) => {
          if (!el) return;
          const baseAngle = baseAnglesRef.current[i] ?? 0;
          const rotatedAngle = baseAngle + rot;
          const rad = (rotatedAngle * Math.PI) / 180;
          const x = Math.sin(rad) * ORBIT_RADIUS;
          const y = -Math.cos(rad) * ORBIT_RADIUS;
          el.style.left = `${CENTER + x - ORBIT_SIZE / 2}px`;
          el.style.top = `${CENTER + y - ORBIT_SIZE / 2}px`;
        });
      }
      lastTimeRef.current = time;
      rafRef.current = requestAnimationFrame(animate);
    };
    // Set baseAnglesRef before starting animation loop
    baseAnglesRef.current = computeAngles(0);
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // Edit state
  const [editingPlatform, setEditingPlatform] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [hoveredPlatform, setHoveredPlatform] = useState<string | null>(null);

  // Pending new slot
  const [pendingPlatform, setPendingPlatform] = useState<string | null>(null);
  const [pendingUrl, setPendingUrl] = useState('');
  // Show link input popup for a saved (but empty-url) link
  const [promptingPlatform, setPromptingPlatform] = useState<string | null>(null);
  const [promptUrl, setPromptUrl] = useState('');

  // Add picker
  const [showAddPicker, setShowAddPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const editRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef<HTMLDivElement>(null);
  const promptRef = useRef<HTMLDivElement>(null);

  // Drag-to-reorder state
  const dragIndexRef = useRef<number | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [localLinks, setLocalLinks] = useState<SocialLink[]>(socialLinks);

  // Sync localLinks when props change
  useEffect(() => {
    setLocalLinks(socialLinks);
  }, [socialLinks]);

  const usedPlatforms = new Set(localLinks.map((l) => l.platform));
  const availablePlatforms = PLATFORM_ORDER.filter((p) => !usedPlatforms.has(p));

  const UNAVATAR_PLATFORMS = ['youtube', 'twitter', 'tiktok', 'telegram', 'instagram', 'github'];
  const NO_AVATAR_PLATFORMS = ['funplay'];
  const BAD_AVATAR_URLS = ['funplay-og-image', 'static.xx.fbcdn.net/rsrc.php', 'unavatar.io/facebook'];

  // Proxy Facebook/fbcdn URLs through edge function to avoid CORS
  const getDisplayAvatarUrl = (link: SocialLink): string | undefined => {
    if (!link.avatarUrl) return undefined;
    if (link.avatarUrl.includes('graph.facebook.com') || link.avatarUrl.includes('fbcdn.net')) {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      return `${supabaseUrl}/functions/v1/fetch-link-preview?proxy=${encodeURIComponent(link.avatarUrl)}`;
    }
    return link.avatarUrl;
  };

  useEffect(() => {
    if (!isOwner || !userId) return;
    const linksToRefetch = localLinks.filter((l) => {
      if (!l.url) return false;
      if (NO_AVATAR_PLATFORMS.includes(l.platform)) return false;
      if (l.avatarUrl && BAD_AVATAR_URLS.some((d) => l.avatarUrl!.includes(d))) return true;
      // Re-fetch Facebook if avatarUrl is still a Graph API redirect URL
      if (l.platform === 'facebook' && l.avatarUrl?.includes('graph.facebook.com')) return true;
      if (!l.avatarUrl) return true;
      if (UNAVATAR_PLATFORMS.includes(l.platform) && !l.avatarUrl.includes('unavatar.io')) return true;
      return false;
    });
    if (linksToRefetch.length === 0) return;
    const fetchMissing = async () => {
      let updated = false;
      const newLinks = [...localLinks];
      for (const link of linksToRefetch) {
        try {
          const { data } = await supabase.functions.invoke('fetch-link-preview', {
            body: { url: link.url, platform: link.platform },
          });
          const idx = newLinks.findIndex((l) => l.platform === link.platform);
          if (idx !== -1) {
            if (data?.avatarUrl) {
              newLinks[idx] = { ...newLinks[idx], avatarUrl: data.avatarUrl };
              updated = true;
            } else if (newLinks[idx].avatarUrl && BAD_AVATAR_URLS.some((d) => newLinks[idx].avatarUrl!.includes(d))) {
              const { avatarUrl: _bad, ...rest } = newLinks[idx];
              newLinks[idx] = rest as SocialLink;
              updated = true;
            }
          }
        } catch { /* ignore */ }
      }
      if (updated) {
        await supabase.from('profiles').update({ social_links: newLinks as any }).eq('id', userId);
        onLinksChanged?.(newLinks);
      }
    };
    fetchMissing();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner, userId]);

  // Default links for users who haven't set up social_links
  const defaultLinks: SocialLink[] = PLATFORM_ORDER.map(p => {
    const preset = PLATFORM_PRESETS[p];
    return { platform: p, label: preset.label, url: '', color: preset.color, favicon: preset.favicon };
  });

  // Use default icons when user has no links configured or all links have empty URLs
  const hasAnyUrl = localLinks.some(l => l.url && l.url.trim() !== '');
  const displayLinks = (localLinks.length === 0 || (!hasAnyUrl && !isOwner))
    ? defaultLinks
    : localLinks.length > 0 ? localLinks : defaultLinks;

  const allLinks: (SocialLink & { isPending?: boolean; isEmpty?: boolean })[] = [
    ...displayLinks
      .map((l) => ({ ...l, isEmpty: !l.url })),
    ...(pendingPlatform && PLATFORM_PRESETS[pendingPlatform]
      ? [{ platform: pendingPlatform, label: PLATFORM_PRESETS[pendingPlatform].label, url: '', color: PLATFORM_PRESETS[pendingPlatform].color, favicon: PLATFORM_PRESETS[pendingPlatform].favicon, isPending: true }]
      : []),
  ];

  const angles = computeAngles(allLinks.length);

  // Close popups on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (showAddPicker && pickerRef.current && !pickerRef.current.contains(e.target as Node)) setShowAddPicker(false);
      if (editingPlatform && editRef.current && !editRef.current.contains(e.target as Node)) setEditingPlatform(null);
      if (pendingPlatform && pendingRef.current && !pendingRef.current.contains(e.target as Node)) {
        setPendingPlatform(null); setPendingUrl('');
      }
      if (promptingPlatform && promptRef.current && !promptRef.current.contains(e.target as Node)) {
        setPromptingPlatform(null); setPromptUrl('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showAddPicker, editingPlatform, pendingPlatform, promptingPlatform]);

  const fetchLinkAvatar = async (url: string, platform: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('fetch-link-preview', { body: { url, platform } });
      if (error || !data?.avatarUrl) return null;
      return data.avatarUrl;
    } catch { return null; }
  };

  // Save link URL for existing slot (was empty)
  const savePromptLink = async (platform: string, url: string) => {
    if (!userId || !url.trim()) return;
    setSaving(true);
    const normalized = url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`;
    const fetchedAvatarUrl = await fetchLinkAvatar(normalized, platform);
    const newLinks = localLinks.map((l) =>
      l.platform === platform ? { ...l, url: normalized, avatarUrl: fetchedAvatarUrl || l.avatarUrl } : l
    );
    const { error } = await supabase.from('profiles').update({ social_links: newLinks as any }).eq('id', userId);
    setSaving(false);
    if (error) { toast.error('Không thể lưu link'); return; }
    toast.success('Đã lưu!');
    setLocalLinks(newLinks);
    onLinksChanged?.(newLinks);
    setPromptingPlatform(null); setPromptUrl('');
  };

  const saveLink = async (platform: string, url: string, isNew = false) => {
    if (!userId) return;
    setSaving(true);
    const normalized = url.trim() ? (url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`) : '';
    const fetchedAvatarUrl = normalized ? await fetchLinkAvatar(normalized, platform) : null;

    let newLinks: SocialLink[];
    if (isNew) {
      const preset = PLATFORM_PRESETS[platform];
      if (!preset) { setSaving(false); return; }
      newLinks = [...localLinks, { platform, label: preset.label, url: normalized, color: preset.color, favicon: preset.favicon, avatarUrl: fetchedAvatarUrl || undefined }];
    } else {
      newLinks = localLinks.map((l) => l.platform === platform ? { ...l, url: normalized, avatarUrl: fetchedAvatarUrl || l.avatarUrl } : l);
    }
    const { error } = await supabase.from('profiles').update({ social_links: newLinks as any }).eq('id', userId);
    setSaving(false);
    if (error) { toast.error('Không thể lưu link'); return; }
    toast.success('Đã lưu!');
    setLocalLinks(newLinks);
    onLinksChanged?.(newLinks);
    setEditingPlatform(null);
    setPendingPlatform(null); setPendingUrl('');
    setShowAddPicker(false);
  };

  const removeLink = async (platform: string) => {
    if (!userId) return;
    const newLinks = localLinks.filter((l) => l.platform !== platform);
    const { error } = await supabase.from('profiles').update({ social_links: newLinks as any }).eq('id', userId);
    if (error) { toast.error('Không thể xoá link'); return; }
    toast.success('Đã xoá!');
    setLocalLinks(newLinks);
    onLinksChanged?.(newLinks);
    setEditingPlatform(null);
  };

  // Pick platform → save immediately as empty-url slot, appear on orbit right away
  const handlePickPlatform = async (platform: string) => {
    if (!userId) return;
    setShowAddPicker(false);
    const preset = PLATFORM_PRESETS[platform];
    if (!preset) return;
    const newLink: SocialLink = { platform, label: preset.label, url: '', color: preset.color, favicon: preset.favicon };
    const newLinks = [...localLinks, newLink];
    await supabase.from('profiles').update({ social_links: newLinks as any }).eq('id', userId);
    setLocalLinks(newLinks);
    onLinksChanged?.(newLinks);
    // Open prompt to enter URL right away
    setPromptingPlatform(platform);
    setPromptUrl('');
  };

  // Drag-to-reorder handlers
  const handleDragStart = useCallback((index: number) => {
    dragIndexRef.current = index;
    setDraggingIndex(index);
    isDragging.current = true;
    isOrbitHovered.current = true;
  }, []);

  const handleDragOver = useCallback((index: number) => {
    if (dragIndexRef.current === null || dragIndexRef.current === index) return;
    const newLinks = [...localLinks];
    const fromIdx = dragIndexRef.current;
    // Only reorder saved (non-pending) links
    if (fromIdx >= newLinks.length || index >= newLinks.length) return;
    const [moved] = newLinks.splice(fromIdx, 1);
    newLinks.splice(index, 0, moved);
    dragIndexRef.current = index;
    setLocalLinks(newLinks);
  }, [localLinks]);

  const handleDragEnd = useCallback(async () => {
    isDragging.current = false;
    isOrbitHovered.current = false;
    setDraggingIndex(null);
    dragIndexRef.current = null;
    if (!userId) return;
    await supabase.from('profiles').update({ social_links: localLinks as any }).eq('id', userId);
    onLinksChanged?.(localLinks);
  }, [localLinks, userId, onLinksChanged]);

  const addAngle = computeAddAngle(allLinks.length);
  const addPos = angleToPos(addAngle);
  const showAddBtn = isOwner && allLinks.length < 9 && !pendingPlatform;

  return (
    <div
      className="relative"
      style={{ width: `${AVATAR_SIZE}px`, height: `${AVATAR_SIZE}px`, flexShrink: 0, overflow: 'visible' }}
    >
      {/* Kim cương - phía trên avatar, đặt trong wrapper 486px để không bị clip */}
      <div
        className="pointer-events-none diamond-sparkle"
        style={{
          position: 'absolute',
          left: `${(AVATAR_SIZE - WRAPPER_SIZE) / 2}px`,
          top: `${(AVATAR_SIZE - WRAPPER_SIZE) / 2}px`,
          width: `${WRAPPER_SIZE}px`,
          height: `${WRAPPER_SIZE}px`,
          zIndex: 40,
          willChange: 'filter',
          overflow: 'visible',
        }}
      >
        {/* Kim cương: mũi nhọn dưới chạm sát đỉnh avatar (top avatar = 155px trong wrapper) */}
        {/* Diamond 100px → top = 155 - 100 = 55px */}
        <div style={{ position: 'absolute', left: '50%', top: '55px', transform: 'translateX(-50%)' }}>
          {/* Sparkle dots */}
          <span className="sparkle-dot-1 absolute text-yellow-300" style={{ top: '18%', left: '10%', fontSize: '8px' }}>✦</span>
          <span className="sparkle-dot-2 absolute text-cyan-300" style={{ top: '5%', left: '55%', fontSize: '7px' }}>✦</span>
          <span className="sparkle-dot-3 absolute text-white" style={{ top: '22%', right: '8%', fontSize: '9px' }}>✦</span>
          <span className="sparkle-dot-4 absolute text-yellow-200" style={{ top: '55%', left: '5%', fontSize: '6px' }}>✦</span>
          <span className="sparkle-dot-5 absolute text-purple-300" style={{ top: '8%', left: '30%', fontSize: '7px' }}>✦</span>
          <span className="sparkle-dot-6 absolute text-cyan-200" style={{ top: '45%', right: '5%', fontSize: '6px' }}>✦</span>
          <span className="sparkle-dot-7 absolute text-yellow-100" style={{ top: '70%', left: '20%', fontSize: '5px' }}>✦</span>
          <span className="sparkle-dot-8 absolute text-white" style={{ top: '65%', right: '18%', fontSize: '7px' }}>✦</span>
          <img src={transparentDiamond} alt="Kim cương xanh" style={{ width: '100px', height: '100px', objectFit: 'contain', display: 'block' }} />
        </div>
      </div>

      {/* Avatar ở tâm */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
        {children}
      </div>

      {/* Wrapper orbit 486px - absolute centered, overflow:visible → slots hiển thị đầy đủ trên mobile */}
      <div
        style={{
          position: 'absolute',
          width: `${WRAPPER_SIZE}px`,
          height: `${WRAPPER_SIZE}px`,
          left: `${(AVATAR_SIZE - WRAPPER_SIZE) / 2}px`,
          top: `${(AVATAR_SIZE - WRAPPER_SIZE) / 2}px`,
          overflow: 'visible',
          zIndex: 20,
        }}
        onMouseEnter={() => { isOrbitHovered.current = true; }}
        onMouseLeave={() => { isOrbitHovered.current = false; }}
      >


        {/* Social link orbital slots */}
        {(() => {
          baseAnglesRef.current = angles;
          return allLinks.map((link, i) => {
            const { x, y } = angleToPos(angles[i]);
            const isEditing = editingPlatform === link.platform;
            const isPending = !!link.isPending;
            const isEmpty = !!link.isEmpty;
            const isHovered = hoveredPlatform === link.platform;
            const isPrompting = promptingPlatform === link.platform;
            const isDraggingThis = draggingIndex === i;

            return (
              <div
                key={link.platform}
                ref={(el) => { slotRefs.current[i] = el; }}
                className="absolute"
                style={{
                  left: `${CENTER + x - ORBIT_SIZE / 2}px`,
                  top: `${CENTER + y - ORBIT_SIZE / 2}px`,
                  width: `${ORBIT_SIZE}px`,
                  height: `${ORBIT_SIZE}px`,
                  zIndex: (isEditing || isPending || isPrompting || isDraggingThis || isHovered) ? 9999 : 20,
                  opacity: isDraggingThis ? 0.6 : 1,
                  transition: isDragging.current ? 'none' : 'opacity 0.2s',
                  cursor: isOwner && !isPending ? 'grab' : 'default',
                  overflow: 'visible',
                }}
                onMouseEnter={() => { setHoveredPlatform(link.platform); isOrbitHovered.current = true; }}
                onMouseLeave={() => { setHoveredPlatform(null); if (!isDragging.current) isOrbitHovered.current = false; }}
                onTouchStart={() => { setHoveredPlatform(link.platform); isOrbitHovered.current = true; }}
                onTouchEnd={() => { setTimeout(() => { setHoveredPlatform(null); isOrbitHovered.current = false; }, 1500); }}
                draggable={isOwner && !isPending}
                onDragStart={() => handleDragStart(i)}
                onDragOver={(e) => { e.preventDefault(); handleDragOver(i); }}
                onDragEnd={handleDragEnd}
              >

                {/* Prompt popup — enter URL for newly added (empty) slot */}
                {isPrompting && isOwner && (
                  <div
                    ref={promptRef}
                    className="absolute z-50 bg-card border border-border rounded-xl shadow-xl p-3"
                    style={{ bottom: '110%', left: '50%', transform: 'translateX(-50%)', width: '220px' }}
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center flex-shrink-0" style={{ border: `1.5px solid ${link.color}` }}>
                        <img src={link.favicon} alt="" className="w-3 h-3 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      </div>
                      <span className="text-xs font-semibold" style={{ color: link.color }}>{link.label}</span>
                      <button type="button" onClick={() => { setPromptingPlatform(null); setPromptUrl(''); }} className="ml-auto p-0.5 rounded hover:bg-muted transition-colors">
                        <X className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground mb-1.5">Nhập link trang cá nhân của bạn (có thể bỏ qua)</p>
                    <input
                      autoFocus
                      type="url"
                      value={promptUrl}
                      onChange={(e) => setPromptUrl(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') savePromptLink(link.platform, promptUrl); }}
                      placeholder={`https://${link.label.toLowerCase()}.com/...`}
                      className="w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary mb-2"
                    />
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => { setPromptingPlatform(null); setPromptUrl(''); }}
                        className="flex-1 text-xs px-2 py-1 rounded-lg border border-border hover:bg-muted transition-colors"
                      >
                        Bỏ qua
                      </button>
                      <button
                        type="button"
                        disabled={saving || !promptUrl.trim()}
                        onClick={() => savePromptLink(link.platform, promptUrl)}
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

                {/* Tooltip */}
                {isHovered && !isPending && !isEditing && !isPrompting && !isDraggingThis && (
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
                    <div className="px-2.5 py-1.5 rounded-lg text-xs shadow-lg" style={{ background: link.color, color: '#fff', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {link.label}
                    </div>
                    {link.url && (
                      <div className="px-2 py-1 rounded-md text-xs shadow-md font-semibold" style={{ background: 'rgba(255,255,255,0.97)', color: '#15803d', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', border: '1px solid #bbf7d0' }}>
                        {link.url.replace(/^https?:\/\//, '')}
                      </div>
                    )}
                    {!link.url && isOwner && (
                      <div className="px-2 py-1 rounded-md text-xs shadow-md font-semibold" style={{ background: 'rgba(255,255,255,0.97)', color: '#15803d', whiteSpace: 'nowrap', border: '1px solid #bbf7d0' }}>
                        Nhấn ✏️ để thêm link
                      </div>
                    )}
                  </div>
                )}

                {/* Slot icon */}
                {isPending ? (
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
                ) : isEmpty ? (
                  /* Empty-url slot — show favicon with dashed border */
                  <button
                    type="button"
                    onClick={() => { if (isOwner) { setPromptingPlatform(link.platform); setPromptUrl(''); } }}
                    className="w-full h-full rounded-full bg-white flex items-center justify-center shadow-md overflow-hidden transition-transform duration-200 hover:scale-110"
                    style={{ border: `2.5px dashed ${link.color}`, boxShadow: `0 0 8px ${link.color}44` }}
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
                  </button>
                ) : (
                  /* Saved slot with URL */
                  <a
                    href={link.url.startsWith('http') ? link.url : `https://${link.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full h-full rounded-full bg-white flex items-center justify-center transition-transform duration-200 shadow-md hover:scale-110 cursor-pointer overflow-hidden"
                    style={{ display: 'flex', border: `2.5px solid ${link.color}`, boxShadow: `0 0 8px ${link.color}66` }}
                  >
                    {link.avatarUrl ? (
                      <img
                        src={getDisplayAvatarUrl(link)}
                        alt={link.label}
                        className="w-full h-full object-cover rounded-full"
                        style={{ pointerEvents: 'none' }}
                        onError={(e) => {
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

                {/* Pencil edit button (owner only, on hover) */}
                {isOwner && isHovered && !isEditing && !isPending && !isPrompting && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (isEmpty) {
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

                {/* Drag handle indicator on hover */}
                {isOwner && isHovered && !isEditing && !isPending && !isPrompting && (
                  <div className="absolute -bottom-1.5 -left-1.5 w-5 h-5 rounded-full bg-card border border-border shadow flex items-center justify-center cursor-grab z-40 opacity-70">
                    <GripVertical className="w-2.5 h-2.5 text-muted-foreground" />
                  </div>
                )}
              </div>
            );
          });
        })()}

        {/* Nút + */}
        {showAddBtn && (
          <div
            className="absolute"
            style={{
              left: `${CENTER + addPos.x - ORBIT_SIZE / 2}px`,
              top: `${CENTER + addPos.y - ORBIT_SIZE / 2}px`,
              width: `${ORBIT_SIZE}px`,
              height: `${ORBIT_SIZE}px`,
              zIndex: showAddPicker ? 30 : 20,
            }}
          >
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
