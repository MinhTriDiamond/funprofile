import { useEffect, useRef, useState } from 'react';

const ecosystemItems = [
  { name: 'FUN', logo: '/fun-ecosystem-logo-36.webp', url: 'https://fun.rich' },
  { name: 'FUN Farm', logo: '/fun-farm-logo-36.webp', url: 'https://farm.fun.rich' },
  { name: 'FUN Profile', logo: '/fun-profile-logo-128.webp', url: '/' },
  { name: 'Fun Life', logo: '/fun-life-logo-36.webp', url: 'https://life.fun.rich' },
  { name: 'FUN Charity', logo: '/fun-charity-logo-36.webp', url: 'https://charity.fun.rich' },
  { name: 'FUN Play', logo: '/fun-play-logo-36.webp', url: 'https://play.fun.rich' },
  { name: 'FUN Planet', logo: '/fun-planet-logo-36.webp', url: 'https://planet.fun.rich' },
  { name: 'Green Earth', logo: '/green-earth-logo-36.webp', url: 'https://earth.fun.rich' },
  { name: 'FUN Academy', logo: '/fun-academy-logo-36.webp', url: 'https://academy.fun.rich' },
];

const FunEcosystemOrbit = () => {
  const [rotation, setRotation] = useState(0);
  const [radius, setRadius] = useState(120);
  const rafRef = useRef(0);

  useEffect(() => {
    const updateRadius = () => setRadius(window.innerWidth >= 640 ? 170 : 120);
    updateRadius();
    window.addEventListener('resize', updateRadius);
    return () => window.removeEventListener('resize', updateRadius);
  }, []);

  useEffect(() => {
    let lastTime = performance.now();

    const animate = (now: number) => {
      const delta = now - lastTime;
      lastTime = now;
      setRotation(prev => (prev + delta * 0.006) % 360);
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div className="relative w-[320px] h-[320px] sm:w-[440px] sm:h-[440px] mx-auto">
      {/* Center - Angel AI */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <a
          href="https://fun.rich"
          target="_blank"
          rel="noopener noreferrer"
          className="w-20 h-20 sm:w-28 sm:h-28 rounded-full overflow-hidden shadow-xl border-2 border-primary/30 hover:scale-110 transition-transform duration-300 bg-background"
        >
          <img
            src="/angel-ai-logo-128.webp"
            alt="Angel AI"
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </a>
      </div>

      {/* Orbit ring */}
      <div className="absolute inset-[28px] sm:inset-[18px] rounded-full border border-dashed border-primary/15 pointer-events-none" />

      {/* Orbiting items */}
      {ecosystemItems.map((item, i) => {
        const baseAngle = (360 / ecosystemItems.length) * i;
        const angle = baseAngle + rotation;
        const rad = (angle * Math.PI) / 180;

        return (
          <a
            key={item.name}
            href={item.url}
            target={item.url === '/' ? '_self' : '_blank'}
            rel="noopener noreferrer"
            className="absolute left-1/2 top-1/2 z-20 group will-change-transform"
            style={{
              transform: `translate(calc(-50% + ${Math.cos(rad) * radius}px), calc(-50% + ${Math.sin(rad) * radius}px))`,
            }}
            title={item.name}
          >
            {/* Counter-rotate so logos stay upright */}
            <div
              className="w-12 h-12 sm:w-[68px] sm:h-[68px] rounded-full overflow-hidden shadow-lg border-2 border-background group-hover:scale-125 group-hover:shadow-xl transition-all duration-300 bg-background"
              style={{ transform: `rotate(${-rotation}deg)` }}
            >
              <img
                src={item.logo}
                alt={item.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <span
              className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] sm:text-xs font-semibold text-foreground/70 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              style={{ transform: `translateX(-50%) rotate(${-rotation}deg)` }}
            >
              {item.name}
            </span>
          </a>
        );
      })}
    </div>
  );
};

export default FunEcosystemOrbit;
