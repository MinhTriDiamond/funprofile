import React, { useEffect, useRef, useState } from 'react';
import diamondSrc from '@/assets/diamond-user.png';

export interface SocialLink {
  platform: string;
  label: string;
  url: string;
  color: string;
  favicon: string;
}

const ORBIT_RADIUS = 115;
const ORBIT_SIZE = 40; // px
const AVATAR_SIZE = 176; // px — fixed reference size (w-44)

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

/**
 * Phân bổ góc cho n ô quanh avatar.
 * - Kim cương cố định ở đỉnh (0° / 360°).
 * - Vùng bảo vệ kim cương: ±50° quanh đỉnh.
 * - n=1  → [180°] (thẳng xuống)
 * - n>1  → phân bổ đều trong span, tối đa 260°
 */
function computeAngles(n: number): number[] {
  if (n === 0) return [];
  if (n === 1) return [180];

  const maxSpan = 260;
  const span = Math.min(maxSpan, (n - 1) * (maxSpan / 8));
  const start = 180 - span / 2;
  const step = span / (n - 1);

  return Array.from({ length: n }, (_, i) => start + step * i);
}

interface AvatarOrbitProps {
  children: React.ReactNode;
  socialLinks?: SocialLink[];
}

export function AvatarOrbit({ children, socialLinks = [] }: AvatarOrbitProps) {
  const transparentDiamond = useTransparentDiamond(diamondSrc);
  const angles = computeAngles(socialLinks.length);

  return (
    /* paddingTop để kim cương nhô ra trên đỉnh avatar */
    <div
      className="relative flex flex-col items-center"
      style={{ paddingTop: '110px', paddingBottom: `${ORBIT_RADIUS + ORBIT_SIZE / 2 + 8}px` }}
    >
      {/* Viên kim cương — nằm TRÊN avatar */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-10px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 40,
        }}
      >
        <img
          src={transparentDiamond}
          alt="Kim cương xanh"
          style={{
            width: '200px',
            height: '200px',
            objectFit: 'contain',
            display: 'block',
          }}
        />
      </div>

      {/* Wrapper cố định kích thước — làm tâm điểm cho orbit */}
      <div
        style={{
          position: 'relative',
          width: `${AVATAR_SIZE}px`,
          height: `${AVATAR_SIZE}px`,
          overflow: 'visible',
          zIndex: 10,
          flexShrink: 0,
        }}
      >
        {/* Avatar (children) — căn giữa wrapper */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {children}
        </div>

        {/* Social link orbital slots */}
        {socialLinks.map((link, i) => {
          const angleDeg = angles[i];
          // angleDeg=0 → đỉnh trên, 180 → thẳng xuống
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
                left: `${AVATAR_SIZE / 2 + x - ORBIT_SIZE / 2}px`,
                top: `${AVATAR_SIZE / 2 + y - ORBIT_SIZE / 2}px`,
                width: `${ORBIT_SIZE}px`,
                height: `${ORBIT_SIZE}px`,
                zIndex: 20,
              }}
            >
              {/* Tooltip */}
              <div
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 max-w-[160px] overflow-hidden text-ellipsis"
                style={{ background: 'rgba(0,0,0,0.75)', color: '#fff' }}
              >
                {link.label}
                <br />
                <span className="opacity-75 text-[10px]">{link.url.replace(/^https?:\/\//, '')}</span>
              </div>

              <div
                className="w-full h-full rounded-full overflow-hidden bg-white group-hover:scale-110 transition-transform duration-200 shadow-md flex items-center justify-center"
                style={{
                  border: `2.5px solid ${link.color}`,
                  boxShadow: `0 0 8px ${link.color}66`,
                }}
              >
                <img
                  src={link.favicon}
                  alt={link.label}
                  className="w-6 h-6 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent && !parent.querySelector('.fallback-letter')) {
                      const span = document.createElement('span');
                      span.className = 'fallback-letter text-xs font-bold';
                      span.style.color = link.color;
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
