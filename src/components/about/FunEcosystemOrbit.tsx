import { useEffect, useState } from 'react';

const ecosystemItems = [
  { name: 'FUN', logo: '/fun-ecosystem-logo-36.webp', url: 'https://fun.rich', color: 'from-emerald-400 to-cyan-400' },
  { name: 'FUN Farm', logo: '/fun-farm-logo-36.webp', url: 'https://farm.fun.rich', color: 'from-yellow-400 to-amber-500' },
  { name: 'FUN Profile', logo: '/fun-profile-logo-128.webp', url: '/', color: 'from-green-400 to-emerald-500' },
  { name: 'Fun Life', logo: '/fun-life-logo-36.webp', url: 'https://life.fun.rich', color: 'from-rose-400 to-pink-500' },
  { name: 'FUN Charity', logo: '/fun-charity-logo-36.webp', url: 'https://charity.fun.rich', color: 'from-purple-500 to-violet-600' },
  { name: 'FUN Play', logo: '/fun-play-logo-36.webp', url: 'https://play.fun.rich', color: 'from-blue-500 to-indigo-600' },
  { name: 'FUN Planet', logo: '/fun-planet-logo-36.webp', url: 'https://planet.fun.rich', color: 'from-pink-400 to-purple-400' },
  { name: 'Green Earth', logo: '/green-earth-logo-36.webp', url: 'https://earth.fun.rich', color: 'from-green-500 to-teal-500' },
  { name: 'FUN Academy', logo: '/fun-academy-logo-36.webp', url: 'https://academy.fun.rich', color: 'from-blue-600 to-blue-800' },
];

const FunEcosystemOrbit = () => {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    let animFrame: number;
    let lastTime = performance.now();

    const animate = (now: number) => {
      const delta = now - lastTime;
      lastTime = now;
      setRotation(prev => (prev + delta * 0.008) % 360);
      animFrame = requestAnimationFrame(animate);
    };

    animFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrame);
  }, []);

  const radius = 160; // orbit radius in px
  const radiusMd = 200;

  return (
    <div className="relative w-[340px] h-[340px] sm:w-[440px] sm:h-[440px] mx-auto my-8">
      {/* Center - Angel AI */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <a
          href="https://fun.rich"
          target="_blank"
          rel="noopener noreferrer"
          className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden shadow-xl border-2 border-primary/30 hover:scale-110 transition-transform duration-300 bg-background"
        >
          <img
            src="/angel-ai-logo-128.webp"
            alt="Angel AI"
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </a>
      </div>

      {/* Orbiting items */}
      {ecosystemItems.map((item, i) => {
        const angle = (360 / ecosystemItems.length) * i + rotation;
        const rad = (angle * Math.PI) / 180;

        return (
          <a
            key={item.name}
            href={item.url}
            target={item.url.startsWith('/') ? '_self' : '_blank'}
            rel="noopener noreferrer"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 group"
            style={{
              transform: `translate(calc(-50% + ${Math.cos(rad) * radius}px), calc(-50% + ${Math.sin(rad) * radius}px))`,
            }}
            title={item.name}
          >
            <div className="w-14 h-14 sm:w-[72px] sm:h-[72px] rounded-full overflow-hidden shadow-lg border-2 border-background group-hover:scale-125 group-hover:shadow-xl transition-all duration-300 bg-background">
              <img
                src={item.logo}
                alt={item.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] sm:text-xs font-semibold text-foreground/80 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
              {item.name}
            </span>
          </a>
        );
      })}

      {/* Orbit ring visual */}
      <div
        className="absolute inset-[30px] sm:inset-[20px] rounded-full border border-dashed border-primary/20"
        style={{ pointerEvents: 'none' }}
      />
    </div>
  );
};

export default FunEcosystemOrbit;
