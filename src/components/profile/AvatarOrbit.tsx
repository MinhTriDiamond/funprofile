import React from 'react';
import diamondImg from '@/assets/green-diamond-v3.png';

interface OrbitSlot {
  href: string;
  imageUrl: string;
  label: string;
}

// 7 ecosystem app slots — con cập nhật href sau nhé
const ORBIT_SLOTS: OrbitSlot[] = [
  { href: '#', imageUrl: '/fun-academy-logo-36.webp', label: 'FUN Academy' },
  { href: '#', imageUrl: '/fun-play-logo-36.webp', label: 'FUN Play' },
  { href: '#', imageUrl: '/fun-planet-logo-36.webp', label: 'FUN Planet' },
  { href: '#', imageUrl: '/fun-farm-logo-36.webp', label: 'FUN Farm' },
  { href: '#', imageUrl: '/fun-charity-logo-36.webp', label: 'FUN Charity' },
  { href: '#', imageUrl: '/fun-treasury-logo-36.webp', label: 'FUN Treasury' },
  { href: '#', imageUrl: '/fun-wallet-logo-36.webp', label: 'FUN Wallet' },
];

// Phân bổ 7 vị trí từ 30° đến 330° (để trống đỉnh 0° cho kim cương)
// 0° = trên cùng, chiều kim đồng hồ
const ORBIT_ANGLES = [30, 80, 130, 180, 230, 280, 330];
const ORBIT_RADIUS = 108; // px - ra ngoài ảnh đại diện

interface AvatarOrbitProps {
  children: React.ReactNode;
}

export function AvatarOrbit({ children }: AvatarOrbitProps) {
  return (
    <div className="relative">
      {children}

      {/* Viên kim cương xanh - to, nằm trên đỉnh và nhô ra ngoài ảnh */}
      <div
        className="absolute z-30 pointer-events-none"
        style={{ top: '-60px', left: '50%', transform: 'translateX(-50%)' }}
      >
        <img
          src={diamondImg}
          alt="Kim cương xanh"
          className="w-28 h-28 object-contain drop-shadow-2xl"
          style={{ filter: 'drop-shadow(0 4px 12px rgba(34,197,94,0.5))' }}
        />
      </div>

      {/* 7 vị trí liên kết hệ sinh thái xung quanh hình đại diện */}
      {ORBIT_SLOTS.map((slot, i) => {
        const angleDeg = ORBIT_ANGLES[i];
        const angleRad = (angleDeg * Math.PI) / 180;
        // CSS coords: y tăng xuống dưới, nên dùng sin/cos như sau
        const x = Math.sin(angleRad) * ORBIT_RADIUS;
        const y = -Math.cos(angleRad) * ORBIT_RADIUS;

        return (
          <a
            key={i}
            href={slot.href}
            title={slot.label}
            className="absolute z-20 group"
            style={{
              left: `calc(50% + ${x}px - 12px)`,
              top: `calc(50% + ${y}px - 12px)`,
              width: '24px',
              height: '24px',
            }}
            onClick={(e) => {
              if (slot.href === '#') e.preventDefault();
            }}
          >
            <div
              className="w-full h-full rounded-full overflow-hidden bg-white group-hover:scale-110 transition-transform duration-200 shadow-md"
              style={{
                border: '2px solid',
                borderColor: '#22c55e',
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
  );
}
