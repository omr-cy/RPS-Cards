import React, { memo, useRef, useEffect, useState } from 'react';
import { ThemeConfig, CardType, getCardImagePath } from '../../themes';
import { assetPreloader } from '../../lib/preloader';

export const FloatingCard = memo(({ type, theme, idx }: { type: CardType, theme: ThemeConfig, idx: number }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );

    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div 
      ref={cardRef}
      className={`w-16 sm:w-24 aspect-square relative animate-gentle-float ${!isVisible ? 'paused' : ''} gpu-accelerated flex items-center justify-center`}
      style={{ 
        animationDelay: `${idx * 0.5}s`
      }}
    >
      {/* Subtle background glow for the floating icon */}
      <div className="absolute inset-2 rounded-full blur-2xl opacity-10" style={{ backgroundColor: "#61DAFB" }} />
      
      <img 
        src={assetPreloader.getCachedUrl(getCardImagePath(theme, type))} 
        alt={type} 
        className="w-full h-full object-contain relative z-10 drop-shadow-[0_0_8px_rgba(97,218,251,0.3)] opacity-40 hover:opacity-100 transition-opacity duration-500" 
        style={{ transform: `scale(${(theme.iconScale || 100) / 100})` }}
        referrerPolicy="no-referrer" 
      />
    </div>
  );
});
