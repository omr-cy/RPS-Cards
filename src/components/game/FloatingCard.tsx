import React, { useState, useEffect, useRef, memo } from 'react';
import { ThemeConfig, CardType, getCardImagePath } from '../../themes';
import { assetPreloader } from '../../lib/preloader';

export const FloatingCard = memo(({ theme, type, idx }: { theme: ThemeConfig, type: CardType, idx: number }) => {
  const [isVisible, setIsVisible] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      setIsVisible(entries[0].isIntersecting);
    }, { threshold: 0.1 });

    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div 
      ref={cardRef}
      className={`w-20 sm:w-36 aspect-[3/4] rounded-2xl shadow-xl flex items-center justify-center p-2 sm:p-3 ${theme.frontColor} border-2 border-white/20 relative animate-gentle-float ${!isVisible ? 'paused' : ''}`}
      style={{ 
        animationDelay: `${idx * 0.5}s`
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-30" />
      <img 
        src={assetPreloader.getCachedUrl(getCardImagePath(theme, type))} 
        alt={type} 
        className="w-full h-full object-contain relative z-10 drop-shadow-lg" 
        style={{ transform: `scale(${(theme.iconScale || 100) / 100})` }}
        referrerPolicy="no-referrer" 
      />
    </div>
  );
});
