import React, { memo } from 'react';
import { motion } from 'motion/react';
import { ThemeConfig, CardType, getCardImagePath } from '../../themes';
import { assetPreloader } from '../../lib/preloader';
import { CARD_NAMES } from '../../lib/constants';

export const CardCount = memo(({ type, count, theme }: { type: CardType, count: number, theme: ThemeConfig }) => {
  const isAvailable = count > 0;
  return (
    <div className="flex-1 flex flex-col items-center gap-1 sm:gap-2 gpu-accelerated">
      <motion.div 
        animate={{ 
          opacity: isAvailable ? 1 : 0.15,
          filter: isAvailable ? 'grayscale(0%)' : 'grayscale(100%)',
          scale: isAvailable ? 1 : 0.94
        }}
        transition={{ duration: 0.05, ease: "linear" }}
        className={`w-full max-w-[4.5rem] aspect-[3/4] rounded-lg flex items-center justify-center gpu-accelerated overflow-hidden ${isAvailable ? `${theme.frontColor}` : 'bg-game-dark'}`}
      >
        <img 
          src={assetPreloader.getCachedUrl(getCardImagePath(theme, type))} 
          alt={CARD_NAMES[type]} 
          className="w-2/3 h-2/3 object-contain" 
          style={{ transform: `scale(${(theme.iconScale || 100) / 100})` }}
          referrerPolicy="no-referrer" 
        />
      </motion.div>
      <motion.div 
        animate={{ 
          opacity: isAvailable ? 1 : 0.25,
          scale: isAvailable ? 1 : 0.94
        }}
        transition={{ duration: 0.05 }}
        className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-[10px] sm:text-xs font-bold rounded-md shadow-md ${isAvailable ? `${theme.counterBgColor} ${theme.counterTextColor}` : 'bg-game-dark text-game-cream/20'}`}
      >
        {count}
      </motion.div>
    </div>
  );
});
