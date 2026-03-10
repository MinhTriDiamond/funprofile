import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { ecosystemItems, type EcosystemItem } from '@/config/navigation';

// Items excluded from orbit — rendered as list below
const BELOW_IDS = ['law-of-light', 'about', 'angel-ai'];

// Descriptions for each ecosystem item
const DESCRIPTIONS: Record<string, string> = {
  'fun-play': 'Web3 Video Platform – Nơi nội dung trở thành tài sản số có giá trị.',
  'fun-farm': 'Farm to Table Platform – Kết nối nông dân & người tiêu dùng bằng thực phẩm sạch.',
  'fun-planet': 'Game Marketplace for Kids – Nuôi dưỡng trí tuệ, đạo đức & sáng tạo cho thế hệ mới.',
  'fun-wallet': 'Our Own Bank – Ví Web3 lưu trữ, giao dịch toàn bộ FUN Ecosystem.',
  'fun-charity': 'Pure Love Charity Network – Minh bạch, kết nối, trao đi đúng nơi.',
  'fun-academy': 'Learn & Earn Platform – Học tập trong yêu thương, trưởng thành trong giá trị.',
  'angel-ai-orbit': 'Light-Aligned AI – Trí tuệ Nhân tạo đồng điệu với Ánh Sáng Vũ Trụ.',
  'green-earth': 'Regeneration & Sustainability – Phục hồi môi trường, tái tạo xanh.',
  'fun-life': 'Cosmic Game Metaverse – Mô phỏng Trò Chơi Cuộc Sống theo Luật Vũ Trụ.',
};

export default function EcosystemWheel({ onItemClick }: { onItemClick?: () => void }) {
  const navigate = useNavigate();
  const [hoveredItem, setHoveredItem] = useState<EcosystemItem | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const orbitItems = ecosystemItems.filter(i => !BELOW_IDS.includes(i.id));
  const belowItems = ecosystemItems.filter(i => BELOW_IDS.includes(i.id));

  const handleClick = (item: EcosystemItem) => {
    if (item.isExternal) {
      window.open(item.path, '_blank', 'noopener,noreferrer');
    } else {
      navigate(item.path);
    }
    onItemClick?.();
  };

  const orbitRadius = 105;
  const logoSize = 50;
  const halfLogo = logoSize / 2;
  const size = (orbitRadius + halfLogo + 8) * 2;

  return (
    <div className="space-y-2">
      {/* Rotating wheel */}
      <div className="flex justify-center py-1">
        <div
          className="relative"
          style={{ width: size, height: size }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => { setIsPaused(false); setHoveredItem(null); }}
        >
          {/* Orbit ring */}
          <div
            className="absolute rounded-full"
            style={{
              width: orbitRadius * 2,
              height: orbitRadius * 2,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              border: '1.5px solid rgba(212,175,55,0.25)',
            }}
          />

          {/* Rotating orbit */}
          <div
            className="absolute inset-0"
            style={{
              animation: 'spin 40s linear infinite',
              animationPlayState: isPaused ? 'paused' : 'running',
            }}
          >
            {orbitItems.map((item, idx) => {
              const angle = (360 / orbitItems.length) * idx - 90;
              const rad = (angle * Math.PI) / 180;
              const x = Math.cos(rad) * orbitRadius;
              const y = Math.sin(rad) * orbitRadius;

              return (
                <button
                  key={item.id}
                  onClick={() => handleClick(item)}
                  onMouseEnter={() => setHoveredItem(item)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className="absolute group"
                  style={{
                    left: `calc(50% + ${x}px - ${halfLogo}px)`,
                    top: `calc(50% + ${y}px - ${halfLogo}px)`,
                  }}
                >
                  {/* Counter-rotate to stay upright */}
                  <div
                    style={{
                      animation: 'spin 40s linear infinite reverse',
                      animationPlayState: isPaused ? 'paused' : 'running',
                    }}
                  >
                    <div
                      className="rounded-full p-[3px] group-hover:scale-110 transition-all duration-300"
                      style={{
                        background: hoveredItem?.id === item.id
                          ? 'linear-gradient(135deg, rgba(255,215,0,0.9), rgba(255,180,0,0.7), rgba(255,215,0,0.9))'
                          : 'linear-gradient(135deg, rgba(255,215,0,0.6), rgba(255,180,0,0.3), rgba(255,215,0,0.6))',
                        boxShadow: hoveredItem?.id === item.id
                          ? '0 0 18px rgba(255,215,0,0.7), 0 0 6px rgba(255,215,0,0.4)'
                          : '0 0 10px rgba(255,215,0,0.35), 0 0 3px rgba(255,215,0,0.2)',
                      }}
                    >
                      <img
                        src={item.avatar}
                        alt={item.name}
                        width={logoSize}
                        height={logoSize}
                        loading="lazy"
                        className="rounded-full object-cover bg-card cursor-pointer"
                        style={{ width: logoSize, height: logoSize }}
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Center: FUN Ecosystem logo / hovered item info */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
            <div
              className="rounded-full p-[3px]"
              style={{
                background: 'linear-gradient(135deg, rgba(255,215,0,0.7), rgba(255,180,0,0.4), rgba(255,215,0,0.7))',
                boxShadow: '0 0 20px rgba(255,215,0,0.45)',
              }}
            >
              <div
                className="rounded-full flex items-center justify-center overflow-hidden"
                style={{ width: 96, height: 96, background: 'rgba(255,255,255,0.92)' }}
              >
                {hoveredItem ? (
                  <div className="flex flex-col items-center text-center px-1">
                    <span className="text-[9px] font-bold leading-tight text-foreground">{hoveredItem.name}</span>
                  </div>
                ) : (
                  <img
                    src="/fun-ecosystem-center.png"
                    alt="FUN Ecosystem"
                    width={88}
                    height={88}
                    loading="lazy"
                    className="object-contain rounded-full"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip below wheel */}
      <div className="min-h-[48px] px-1">
        {hoveredItem && DESCRIPTIONS[hoveredItem.id] ? (
          <div className="text-center animate-fade-in">
            <p className="text-xs font-semibold text-foreground">{hoveredItem.name}</p>
            <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
              {DESCRIPTIONS[hoveredItem.id]}
            </p>
          </div>
        ) : null}
      </div>

      {/* Below items: Law of Light, About, Angel AI */}
      <div className="space-y-1">
        {belowItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleClick(item)}
            className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all duration-300 group ${
              item.isSpecial
                ? 'bg-gradient-to-r from-yellow-400/10 to-amber-400/10 hover:bg-white hover:shadow-[0_0_12px_rgba(34,197,94,0.5)] border border-yellow-400/30 hover:border-primary'
                : 'hover:bg-white hover:shadow-[0_0_12px_rgba(34,197,94,0.5)]'
            }`}
          >
            {item.isSpecial ? (
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{
                  background: 'radial-gradient(circle, rgba(250,204,21,0.3) 0%, rgba(250,204,21,0.1) 100%)',
                  boxShadow: '0 0 15px rgba(250,204,21,0.4)',
                }}
              >
                <Sparkles className="w-5 h-5 text-yellow-400" />
              </div>
            ) : (
              <img
                src={item.avatar}
                alt={item.name}
                width={36}
                height={36}
                loading="lazy"
                className="w-9 h-9 rounded-full object-cover group-hover:shadow-[0_0_10px_rgba(250,204,21,0.5)] transition-shadow duration-300"
              />
            )}
            <span
              className={`font-medium text-sm transition-colors duration-300 ${
                item.isSpecial
                  ? 'text-yellow-400 group-hover:text-yellow-300 font-semibold'
                  : 'group-hover:text-primary'
              }`}
            >
              {item.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
