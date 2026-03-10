import { useNavigate } from 'react-router-dom';
import { ecosystemItems } from '@/config/navigation';

/**
 * Rotating circular wheel of FUN Ecosystem logos.
 * Each logo is clickable → navigates or opens external link.
 */
export default function EcosystemWheel({ onItemClick }: { onItemClick?: () => void }) {
  const navigate = useNavigate();

  // Angel AI is center, rest orbit around
  const centerItem = ecosystemItems.find(i => i.id === 'angel-ai');
  const orbitItems = ecosystemItems.filter(i => i.id !== 'angel-ai');

  const handleClick = (item: typeof ecosystemItems[0]) => {
    if (item.isExternal) {
      window.open(item.path, '_blank', 'noopener,noreferrer');
    } else {
      navigate(item.path);
    }
    onItemClick?.();
  };

  const orbitRadius = 110; // px from center
  const size = (orbitRadius + 30) * 2; // container size

  return (
    <div className="flex justify-center py-2">
      <div
        className="relative"
        style={{ width: size, height: size }}
      >
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

        {/* Rotating orbit container */}
        <div
          className="absolute inset-0 animate-[spin_40s_linear_infinite]"
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
                title={item.name}
                className="absolute group"
                style={{
                  left: `calc(50% + ${x}px - 20px)`,
                  top: `calc(50% + ${y}px - 20px)`,
                }}
              >
                {/* Counter-rotate so logos stay upright */}
                <div className="animate-[spin_40s_linear_infinite_reverse]">
                  <img
                    src={item.avatar}
                    alt={item.name}
                    width={40}
                    height={40}
                    loading="lazy"
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-yellow-400/30 group-hover:ring-yellow-400 group-hover:scale-125 group-hover:shadow-[0_0_16px_rgba(250,204,21,0.6)] transition-all duration-300 cursor-pointer"
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Center: Angel AI */}
        {centerItem && (
          <button
            onClick={() => handleClick(centerItem)}
            title={centerItem.name}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 group"
          >
            <img
              src={centerItem.avatar}
              alt={centerItem.name}
              width={64}
              height={64}
              loading="lazy"
              className="w-16 h-16 rounded-full object-cover ring-2 ring-yellow-400/50 group-hover:ring-yellow-400 group-hover:shadow-[0_0_24px_rgba(250,204,21,0.7)] transition-all duration-300"
            />
          </button>
        )}
      </div>
    </div>
  );
}
