import React, { memo } from 'react';
import { motion } from 'motion/react';
import { ThemeConfig, CardType, getCardImagePath } from '../../themes';
import { assetPreloader } from '../../lib/preloader';
import { CARD_NAMES } from '../../lib/constants';

export const PlayableCard = memo(({ type, count, onClick, disabled, theme }: { type: CardType, count: number, onClick: () => void, disabled: boolean, theme: ThemeConfig }) => {
  const isAvailable = count > 0;
  const isDull = !isAvailable || disabled;
  
  return (
    <motion.button
      whileHover={isAvailable && !disabled ? { y: -6, scale: 1.05, filter: 'brightness(1.15)' } : {}}
      whileTap={isAvailable && !disabled ? { scale: 0.88, y: 0 } : {}}
      animate={{ 
        opacity: isDull ? 0.3 : 1,
        filter: isDull ? 'grayscale(100%)' : 'grayscale(0%)',
        scale: isDull ? 0.94 : 1,
        y: 0
      }}
      transition={{ 
        type: 'spring',
        stiffness: 1000,
        damping: 50,
        mass: 0.3,
        opacity: { duration: 0.04 },
        filter: { duration: 0.04 }
      }}
      onClick={isAvailable && !disabled ? onClick : undefined}
      className={`flex-1 relative flex flex-col items-center gap-1 sm:gap-2 gpu-accelerated ${isDull ? 'cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <div className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-[10px] sm:text-xs font-bold rounded-md shadow-md ${isAvailable ? `${theme.counterBgColor} ${theme.counterTextColor}` : 'bg-game-dark text-game-cream/20'}`}>
        {count}
      </div>
      <div className={`w-full max-w-[7.5rem] aspect-[3/4] rounded-lg flex items-center justify-center overflow-hidden ${isAvailable && !disabled ? `${theme.frontColor}` : 'bg-game-dark'}`}>
        <img 
          src={assetPreloader.getCachedUrl(getCardImagePath(theme, type))} 
          alt={CARD_NAMES[type]} 
          className="w-2/3 h-2/3 object-contain" 
          style={{ transform: `scale(${(theme.iconScale || 100) / 100})` }}
          referrerPolicy="no-referrer" 
        />
      </div>
      <span className="text-[10px] sm:text-xs font-display text-game-cream tracking-wider uppercase opacity-80">{CARD_NAMES[type]}</span>
    </motion.button>
  );
});
