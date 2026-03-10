import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { ecosystemItems, type EcosystemItem } from '@/config/navigation';

// Items excluded from orbit — rendered as list below
const BELOW_IDS = ['law-of-light', 'about', 'angel-ai'];

export default function EcosystemWheel({ onItemClick }: { onItemClick?: () => void }) {
  const navigate = useNavigate();

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
    <div className="space-y-3">
      {/* Rotating wheel */}
      <div className="flex justify-center py-1">
        <div className="relative" style={{ width: size, height: size }}>
          {/* Orbit ring — thin golden dashed circle */}
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
          <div className="absolute inset-0 animate-[spin_40s_linear_infinite]">
            {orbitItems.map((item, idx) => {
              const angle = (360 / orbitItems.length) * idx - 90;
              const rad = (angle * Math.PI) / 180;
              const x = Math.cos(rad) * orbitRadius;
              const y = Math.sin(rad) * orbitRadius;

              return (
                <button
                  key={item.id}
                  onClick={() => handleClick(item)}
                  title={item.name}
                  className="absolute group"
                  style={{
                    left: `calc(50% + ${x}px - ${halfLogo}px)`,
                    top: `calc(50% + ${y}px - ${halfLogo}px)`,
                  }}
                >
                  {/* Counter-rotate to stay upright */}
                  <div className="animate-[spin_40s_linear_infinite_reverse]">
                    <div
                      className="rounded-full p-[3px] group-hover:scale-110 transition-all duration-300"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255,215,0,0.6), rgba(255,180,0,0.3), rgba(255,215,0,0.6))',
                        boxShadow: '0 0 10px rgba(255,215,0,0.35), 0 0 3px rgba(255,215,0,0.2)',
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

          {/* Center: FUN Ecosystem logo with gold ring */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
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
                <img
                  src="/fun-ecosystem-center.png"
                  alt="FUN Ecosystem"
                  width={88}
                  height={88}
                  loading="lazy"
                  className="object-contain rounded-full"
                />
              </div>
            </div>
          </div>
        </div>
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
