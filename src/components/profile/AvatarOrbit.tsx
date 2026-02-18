import React, { useEffect, useRef, useState } from 'react';
import diamondSrc from '@/assets/diamond-user.png';

interface OrbitSlot {
  href: string;
  imageUrl: string;
  label: string;
}

const ORBIT_SLOTS: OrbitSlot[] = [
  { href: 'https://academy.fun.rich', imageUrl: '/fun-academy-logo-36.webp', label: 'FUN Academy' },
  { href: 'https://play.fun.rich',    imageUrl: '/fun-play-logo-36.webp',    label: 'FUN Play' },
  { href: 'https://planet.fun.rich',  imageUrl: '/fun-planet-logo-36.webp',  label: 'FUN Planet' },
  { href: 'https://farm.fun.rich',    imageUrl: '/fun-farm-logo-36.webp',    label: 'FUN Farm' },
  { href: 'https://charity.fun.rich', imageUrl: '/fun-charity-logo-36.webp', label: 'FUN Charity' },
  { href: 'https://treasury.fun.rich',imageUrl: '/fun-treasury-logo-36.webp',label: 'FUN Treasury' },
  { href: 'https://wallet.fun.rich',  imageUrl: '/fun-wallet-logo-36.webp',  label: 'FUN Wallet' },
];

// 7 vị trí phân bố đều 360°, bắt đầu từ 26° để cân bằng với viên kim cương trên đỉnh
const ORBIT_ANGLES = Array.from({ length: 7 }, (_, i) => Math.round(26 + (360 / 7) * i));
const ORBIT_RADIUS = 115;
const ORBIT_SIZE = 40; // px

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

      // Xoá pixel trắng/sáng: nếu R,G,B đều > 220 thì set alpha = 0
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        // Ngưỡng: pixel rất sáng (gần trắng) → trong suốt
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

interface AvatarOrbitProps {
  children: React.ReactNode;
}

export function AvatarOrbit({ children }: AvatarOrbitProps) {
  const transparentDiamond = useTransparentDiamond(diamondSrc);

  return (
    /* paddingTop để diamond nhô hẳn ra trên đỉnh avatar */
    <div className="relative" style={{ paddingTop: '100px' }}>

      {/* Viên kim cương — nền trong suốt bằng Canvas, nằm TRÊN và NGOÀI avatar */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-20px',          /* nhô lên trên container để nằm ngoài avatar */
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

      {/* Avatar (children) */}
      <div className="relative" style={{ zIndex: 10 }}>
        {children}

        {/* 7 vị trí liên kết hệ sinh thái xung quanh hình đại diện */}
        {ORBIT_SLOTS.map((slot, i) => {
          const angleDeg = ORBIT_ANGLES[i];
          const angleRad = (angleDeg * Math.PI) / 180;
          const x = Math.sin(angleRad) * ORBIT_RADIUS;
          const y = -Math.cos(angleRad) * ORBIT_RADIUS;

          return (
            <a
              key={i}
              href={slot.href}
              title={slot.label}
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
              <div
                className="w-full h-full rounded-full overflow-hidden bg-white group-hover:scale-110 transition-transform duration-200 shadow-md"
                style={{
                  border: '2.5px solid #22c55e',
                  boxShadow: '0 0 8px rgba(34,197,94,0.6)',
                }}
              >
                <img
                  src={slot.imageUrl}
                  alt={slot.label}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
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
