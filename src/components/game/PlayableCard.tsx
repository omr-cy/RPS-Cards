import React, { memo } from 'react';
import { motion } from 'motion/react';
import { ThemeConfig, CardType, getCardImagePath } from '../../themes';
import { assetPreloader } from '../../lib/preloader';
import { CARD_NAMES } from '../../lib/constants';
import { CardFrame } from './CardFrame';

export const PlayableCard = memo(({ type, count, onClick, disabled, theme }: { type: CardType, count: number, onClick: () => void, disabled: boolean, theme: ThemeConfig }) => {
  const isAvailable = count > 0;
  const isDull = !isAvailable || disabled;
  
  return (
    <motion.button
      whileHover={isAvailable && !disabled ? { y: -6, scale: 1.05 } : {}}
      whileTap={isAvailable && !disabled ? { scale: 0.88, y: 0 } : {}}
      animate={{ 
        opacity: isDull ? 0.4 : 1,
        filter: isDull ? 'grayscale(80%)' : 'grayscale(0%)',
        scale: isDull ? 0.94 : 1,
        y: 0
      }}
      transition={{ 
        type: 'spring',
        stiffness: 1000,
        damping: 50,
        mass: 0.3,
        opacity: { duration: 0.1 },
        filter: { duration: 0.1 }
      }}
      onClick={isAvailable && !disabled ? onClick : undefined}
      className={`flex-1 relative flex flex-col items-center gap-1 sm:gap-2 gpu-accelerated ${isDull ? 'cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <div className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-[10px] sm:text-xs font-bold rounded-md shadow-lg z-30 border border-[#61DAFB]/30 ${isAvailable ? 'bg-[#0a0a0a] text-[#61DAFB]' : 'bg-[#0a0a0a] text-[#61DAFB]/20'}`}>
        {count}
      </div>
      <div className="w-22 sm:w-30">
        <div className="relative w-full h-0" style={{ paddingBottom: '150%' }}>
          <div className="absolute inset-0">
            <CardFrame 
              color="#61DAFB" 
              className="w-full h-full"
              glow={false}
            >
              <div className="w-full h-full flex items-center justify-center bg-black/40">
                <img 
                  src={assetPreloader.getCachedUrl(getCardImagePath(theme, type))} 
                  alt={CARD_NAMES[type]} 
                  className="w-2/3 h-2/3 object-contain drop-shadow-[0_0_10px_rgba(97,218,251,0.3)]" 
                  style={{ transform: `scale(${(theme.iconScale || 100) / 100})` }}
                  referrerPolicy="no-referrer" 
                />
              </div>
            </CardFrame>
          </div>
        </div>
      </div>
      <span className="text-[10px] sm:text-xs font-display text-[#e8e4d9] tracking-wider uppercase opacity-60">{CARD_NAMES[type]}</span>
    </motion.button>
  );
});
