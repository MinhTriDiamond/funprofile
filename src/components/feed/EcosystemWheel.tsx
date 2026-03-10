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

  const orbitRadius = 120;
  const logoSize = 46;
  const size = (orbitRadius + logoSize / 2 + 4) * 2;

  return (
    <div className="space-y-3">
      {/* Rotating wheel */}
      <div className="flex justify-center py-2">
        <div className="relative" style={{ width: size, height: size }}>
          {/* Orbit ring */}
          <div
            className="absolute rounded-full border border-yellow-400/20"
            style={{
              width: orbitRadius * 2,
              height: orbitRadius * 2,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
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
                    left: `calc(50% + ${x}px - ${logoSize / 2}px)`,
                    top: `calc(50% + ${y}px - ${logoSize / 2}px)`,
                  }}
                >
                  <div className="animate-[spin_40s_linear_infinite_reverse]">
                    <img
                      src={item.avatar}
                      alt={item.name}
                      width={logoSize}
                      height={logoSize}
                      loading="lazy"
                      className="w-[46px] h-[46px] rounded-full object-cover ring-2 ring-yellow-400/30 group-hover:ring-yellow-400 group-hover:scale-125 group-hover:shadow-[0_0_16px_rgba(250,204,21,0.6)] transition-all duration-300 cursor-pointer"
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Center: FUN Ecosystem logo */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <img
              src="/fun-ecosystem-center.png"
              alt="FUN Ecosystem"
              width={90}
              height={90}
              loading="lazy"
              className="w-[90px] h-[90px] object-contain drop-shadow-lg"
            />
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
