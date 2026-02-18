import React from 'react';
import diamondImg from '@/assets/diamond-user.png';

interface OrbitSlot {
  href: string;
  imageUrl: string;
  label: string;
}

// 7 ecosystem app slots — con cập nhật href sau nhé
const ORBIT_SLOTS: OrbitSlot[] = [
  { href: 'https://academy.fun.rich', imageUrl: '/fun-academy-logo-36.webp', label: 'FUN Academy' },
  { href: 'https://play.fun.rich',    imageUrl: '/fun-play-logo-36.webp',    label: 'FUN Play' },
  { href: 'https://planet.fun.rich',  imageUrl: '/fun-planet-logo-36.webp',  label: 'FUN Planet' },
  { href: 'https://farm.fun.rich',    imageUrl: '/fun-farm-logo-36.webp',    label: 'FUN Farm' },
  { href: 'https://charity.fun.rich', imageUrl: '/fun-charity-logo-36.webp', label: 'FUN Charity' },
  { href: 'https://treasury.fun.rich',imageUrl: '/fun-treasury-logo-36.webp',label: 'FUN Treasury' },
  { href: 'https://wallet.fun.rich',  imageUrl: '/fun-wallet-logo-36.webp',  label: 'FUN Wallet' },
];

const ORBIT_ANGLES = [30, 80, 130, 180, 230, 280, 330];
const ORBIT_RADIUS = 108; // px - ra ngoài ảnh đại diện

interface AvatarOrbitProps {
  children: React.ReactNode;
}

export function AvatarOrbit({ children }: AvatarOrbitProps) {
  return (
    /* wrapper thêm padding-top để diamond nhô ra ngoài mà không bị clip */
    <div className="relative" style={{ paddingTop: '56px' }}>
      {/* Viên kim cương nằm TRÊN và NGOÀI ảnh đại diện */}
      <div
        className="absolute z-30 pointer-events-none"
        style={{ top: '0px', left: '50%', transform: 'translateX(-50%)' }}
      >
        <img
          src={diamondImg}
          alt="Kim cương xanh"
          style={{
            width: '112px',
            height: '112px',
            objectFit: 'contain',
            mixBlendMode: 'multiply',
            filter: 'drop-shadow(0 6px 16px rgba(34,197,94,0.6))',
          }}
        />
      </div>

      {/* Avatar (children) */}
      <div className="relative">
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
              className="absolute z-20 group"
              style={{
                left: `calc(50% + ${x}px - 12px)`,
                top: `calc(50% + ${y}px - 12px)`,
                width: '24px',
                height: '24px',
              }}
            >
              <div
                className="w-full h-full rounded-full overflow-hidden bg-white group-hover:scale-110 transition-transform duration-200 shadow-md"
                style={{
                  border: '2px solid #22c55e',
                  boxShadow: '0 0 6px rgba(34,197,94,0.5)',
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
