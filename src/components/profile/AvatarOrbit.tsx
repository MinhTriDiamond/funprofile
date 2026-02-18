import React, { useEffect, useRef, useState } from 'react';
import diamondSrc from '@/assets/diamond-user.png';
import { X, Plus, Check, Pencil, ExternalLink } from 'lucide-react';
import { PLATFORM_PRESETS, PLATFORM_ORDER } from './SocialLinksEditor';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SocialLink {
  platform: string;
  label: string;
  url: string;
  color: string;
  favicon: string;
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
  const angles = computeAngles(socialLinks.length);

  // Edit state (pencil button)
  const [editingPlatform, setEditingPlatform] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [hoveredPlatform, setHoveredPlatform] = useState<string | null>(null);

  // Add picker
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [addingPlatform, setAddingPlatform] = useState<string | null>(null);
  const [addUrl, setAddUrl] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);
  const editRef = useRef<HTMLDivElement>(null);

  const usedPlatforms = new Set(socialLinks.map((l) => l.platform));
  const availablePlatforms = PLATFORM_ORDER.filter((p) => !usedPlatforms.has(p));

  // Close picker / editor on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (showAddPicker && pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowAddPicker(false);
        setAddingPlatform(null);
        setAddUrl('');
      }
      if (editingPlatform && editRef.current && !editRef.current.contains(e.target as Node)) {
        setEditingPlatform(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showAddPicker, editingPlatform]);

  const saveLink = async (platform: string, url: string, isNew = false) => {
    if (!userId || !url.trim()) return;
    setSaving(true);
    const normalized = url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`;
    let newLinks: SocialLink[];
    if (isNew) {
      const preset = PLATFORM_PRESETS[platform];
      if (!preset) { setSaving(false); return; }
      newLinks = [...socialLinks, { platform, label: preset.label, url: normalized, color: preset.color, favicon: preset.favicon }];
    } else {
      newLinks = socialLinks.map((l) => l.platform === platform ? { ...l, url: normalized } : l);
    }
    const { error } = await supabase.from('profiles').update({ social_links: newLinks as any }).eq('id', userId);
    setSaving(false);
    if (error) { toast.error('Không thể lưu link'); return; }
    toast.success('Đã lưu!');
    onLinksChanged?.(newLinks);
    setEditingPlatform(null);
    setShowAddPicker(false);
    setAddingPlatform(null);
    setAddUrl('');
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

  const addAngle = computeAddAngle(socialLinks.length);
  const addPos = angleToPos(addAngle);
  const showAddBtn = isOwner && socialLinks.length < 9;

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
        {socialLinks.map((link, i) => {
          const { x, y } = angleToPos(angles[i]);
          const isEditing = editingPlatform === link.platform;
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
                zIndex: isEditing ? 30 : 20,
              }}
              onMouseEnter={() => setHoveredPlatform(link.platform)}
              onMouseLeave={() => setHoveredPlatform(null)}
            >
              {/* Edit popup */}
              {isEditing && isOwner && (
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
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1 text-xs px-2 py-1 rounded-lg border border-border hover:bg-muted transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
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

              {/* Icon — click goes to URL; pencil edit on hover for owner */}
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-full rounded-full bg-white flex items-center justify-center transition-transform duration-200 shadow-md hover:scale-110"
                style={{ border: `2.5px solid ${link.color}`, boxShadow: `0 0 8px ${link.color}66`, display: 'flex' }}
              >
                <img
                  src={link.favicon}
                  alt={link.label}
                  className="w-6 h-6 object-contain"
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
              </a>

              {/* Pencil edit button (owner only, on hover) */}
              {isOwner && isHovered && !isEditing && (
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
            {/* Add picker popup — hiện tất cả platform chưa dùng */}
            {showAddPicker && (
              <div
                ref={pickerRef}
                className="absolute z-50 bg-card border border-border rounded-xl shadow-xl p-3"
                style={{ bottom: '110%', left: '50%', transform: 'translateX(-50%)', width: '252px' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-foreground">Thêm mạng xã hội</p>
                  <button type="button" onClick={() => { setShowAddPicker(false); setAddingPlatform(null); setAddUrl(''); }} className="p-0.5 rounded hover:bg-muted">
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>

                {/* All available platforms grid */}
                <div className="grid grid-cols-3 gap-1.5 mb-2">
                  {availablePlatforms.map((p) => {
                    const preset = PLATFORM_PRESETS[p];
                    const isSelected = addingPlatform === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => { setAddingPlatform(isSelected ? null : p); setAddUrl(''); }}
                        className="flex flex-col items-center gap-1 px-1 py-2 rounded-lg border text-[10px] transition-all"
                        style={{
                          borderColor: isSelected ? preset.color : 'hsl(var(--border))',
                          background: isSelected ? `${preset.color}18` : 'transparent',
                        }}
                      >
                        <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm" style={{ border: `1.5px solid ${preset.color}` }}>
                          <img src={preset.favicon} alt={preset.label} className="w-4 h-4 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        </div>
                        <span className="truncate w-full text-center font-medium leading-tight" style={{ color: isSelected ? preset.color : undefined }}>{preset.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* URL input appears after selecting platform */}
                {addingPlatform && (
                  <div className="border-t border-border pt-2">
                    <p className="text-[10px] text-muted-foreground mb-1">Link trang {PLATFORM_PRESETS[addingPlatform]?.label}:</p>
                    <div className="flex gap-1.5">
                      <input
                        autoFocus
                        type="url"
                        value={addUrl}
                        onChange={(e) => setAddUrl(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && addUrl.trim()) saveLink(addingPlatform, addUrl, true); }}
                        placeholder="https://..."
                        className="flex-1 text-xs border border-border rounded-lg px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <button
                        type="button"
                        disabled={saving || !addUrl.trim()}
                        onClick={() => saveLink(addingPlatform, addUrl, true)}
                        className="px-2 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1 disabled:opacity-50 text-xs"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => { setShowAddPicker(!showAddPicker); setAddingPlatform(null); setAddUrl(''); }}
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
