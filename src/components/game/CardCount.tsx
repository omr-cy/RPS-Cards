import React, { memo } from 'react';
import { motion } from 'motion/react';
import { ThemeConfig, CardType, getCardImagePath } from '../../themes';
import { assetPreloader } from '../../lib/preloader';
import { CARD_NAMES } from '../../lib/constants';
import { CardFrame } from './CardFrame';

export const CardCount = memo(({ type, count, theme }: { type: CardType, count: number, theme: ThemeConfig }) => {
  const isAvailable = count > 0;
  const cardColor = "#790C8D"; // Opponent Neon Purple
  
  return (
    <div className="flex-1 flex flex-col items-center gap-1 sm:gap-2 gpu-accelerated">
      <div className="w-18 sm:w-24">
        <div className="relative w-full h-0" style={{ paddingBottom: '150%' }}>
          <div className="absolute inset-0">
            <motion.div 
              animate={{ 
                opacity: isAvailable ? 1 : 0.15,
                filter: isAvailable ? 'grayscale(0%)' : 'grayscale(100%)',
                scale: isAvailable ? 1 : 0.94
              }}
              className="w-full h-full"
            >
              <CardFrame 
                color={cardColor} 
                className="w-full h-full"
                glow={false}
              >
                <div className="w-full h-full flex items-center justify-center bg-black/40">
                  <img 
                    src={assetPreloader.getCachedUrl(getCardImagePath(theme, type))} 
                    alt={CARD_NAMES[type]} 
                    className="w-2/3 h-2/3 object-contain" 
                    style={{ transform: `scale(${(theme.iconScale || 100) / 100})` }}
                    referrerPolicy="no-referrer" 
                  />
                </div>
              </CardFrame>
            </motion.div>
          </div>
        </div>
      </div>

      <div className={`w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-[10px] sm:text-xs font-bold rounded-md shadow-lg z-30 border border-[#790C8D]/30 ${isAvailable ? 'bg-[#0a0a0a] text-[#790C8D]' : 'bg-[#0a0a0a] text-[#790C8D]/20'}`}>
        {count}
      </div>
    </div>
  );
});
