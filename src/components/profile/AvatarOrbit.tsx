import React, { useEffect, useRef, useState } from 'react';
import diamondSrc from '@/assets/diamond-user.png';

export interface SocialLink {
  platform: string;
  label: string;
  url: string;
  color: string;
  favicon: string;
}

/** Dùng Canvas để xoá nền trắng/sáng khỏi ảnh PNG, trả về data URL */
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
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (r > 220 && g > 220 && b > 220) {
          data[i + 3] = 0;
        }
      }

      ctx.putImageData(imageData, 0, 0);
      setDataUrl(canvas.toDataURL('image/png'));
    };
    img.src = src;
  }, [src]);

  return dataUrl;
}

/** Tính góc phân bổ trong cung 30°–330° (phía dưới, tránh kim cương đỉnh) */
function computeAngles(n: number): number[] {
  if (n === 0) return [];
  if (n === 1) return [180];
  const start = 30;
  const end = 330;
  const span = end - start;
  return Array.from({ length: n }, (_, i) => start + (span / (n - 1)) * i);
}

const ORBIT_RADIUS = 115;
const ORBIT_SIZE = 44; // px

interface AvatarOrbitProps {
  children: React.ReactNode;
  socialLinks?: SocialLink[];
}

export function AvatarOrbit({ children, socialLinks = [] }: AvatarOrbitProps) {
  const transparentDiamond = useTransparentDiamond(diamondSrc);
  const angles = computeAngles(socialLinks.length);

  return (
    /* paddingTop để diamond nhô hẳn ra trên đỉnh avatar */
    <div className="relative" style={{ paddingTop: '100px' }}>

      {/* Viên kim cương — nằm TRÊN và NGOÀI avatar */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 40,
        }}
      >
        <img
          src={transparentDiamond}
          alt="Kim cương xanh"
          style={{
            width: '224px',
            height: '224px',
            objectFit: 'contain',
            display: 'block',
          }}
        />
      </div>

      {/* Avatar (children) + orbit slots */}
      <div className="relative" style={{ zIndex: 10 }}>
        {children}

        {socialLinks.map((link, i) => {
          const angleDeg = angles[i];
          const angleRad = (angleDeg * Math.PI) / 180;
          const x = Math.sin(angleRad) * ORBIT_RADIUS;
          const y = -Math.cos(angleRad) * ORBIT_RADIUS;

          return (
            <a
              key={link.platform}
              href={link.url}
              title={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute group"
              style={{
                left: `calc(50% + ${x}px - ${ORBIT_SIZE / 2}px)`,
                top: `calc(50% + ${y}px - ${ORBIT_SIZE / 2}px)`,
                width: `${ORBIT_SIZE}px`,
                height: `${ORBIT_SIZE}px`,
                zIndex: 20,
              }}
            >
              {/* Tooltip */}
              <div
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded text-xs whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50"
                style={{
                  background: 'hsl(var(--popover))',
                  color: 'hsl(var(--popover-foreground))',
                  border: '1px solid hsl(var(--border))',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  maxWidth: '180px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                <span className="font-semibold">{link.label}</span>
                <br />
                <span className="opacity-70" style={{ fontSize: '10px' }}>
                  {link.url.replace(/^https?:\/\//, '').slice(0, 30)}
                </span>
              </div>

              {/* Vòng tròn platform */}
              <div
                className="w-full h-full rounded-full overflow-hidden bg-white group-hover:scale-110 transition-transform duration-200"
                style={{
                  border: `3px solid ${link.color}`,
                  boxShadow: `0 0 10px ${link.color}66`,
                }}
              >
                <img
                  src={link.favicon}
                  alt={link.label}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback: hiện chữ cái đầu platform
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent && !parent.querySelector('.fallback-text')) {
                      const span = document.createElement('span');
                      span.className = 'fallback-text';
                      span.style.cssText = `
                        display: flex; align-items: center; justify-content: center;
                        width: 100%; height: 100%;
                        font-size: 16px; font-weight: bold;
                        color: ${link.color};
                        background: white;
                      `;
                      span.textContent = link.label[0];
                      parent.appendChild(span);
                    }
                  }}
                />
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
