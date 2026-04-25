import React, { memo } from 'react';
import { motion } from 'motion/react';
import { ThemeConfig, CardType, getCardImagePath, getThemeBackIcon } from '../../themes';
import { assetPreloader } from '../../lib/preloader';
import { CARD_NAMES } from '../../lib/constants';

export const PlayedCard = memo(({ type, isPlayer, winner, faceDown = false, theme }: { type: CardType, isPlayer: boolean, winner: boolean, faceDown?: boolean, theme: ThemeConfig }) => {
  return (
    <motion.div
      initial={{ 
        scale: 0.5, 
        opacity: 0, 
        x: 0, 
        y: isPlayer ? 400 : -400, 
        rotate: isPlayer ? -20 : 20,
        rotateY: 180
      }}
      animate={{ 
        scale: 1, 
        opacity: 1, 
        x: 0, 
        y: 0,
        rotateY: faceDown ? 180 : 0,
        rotate: 0
      }}
      transition={{ 
        type: 'spring', 
        damping: 25, 
        stiffness: 150,
        mass: 0.8,
        rotateY: { duration: 0.4, type: 'tween', ease: 'easeInOut' }
      }}
      style={{ transformStyle: 'preserve-3d' }}
      className="relative w-16 sm:w-24 aspect-[3/4] z-10"
    >
      {/* Front Side */}
      {winner && !faceDown && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="absolute -inset-4 z-0"
        >
          <div className={`absolute inset-0 ${theme.frontColor} blur-2xl opacity-20 animate-glow-pulse`} />
        </motion.div>
      )}
      <div 
        className={`absolute inset-0 rounded-lg flex items-center justify-center overflow-hidden backface-hidden ${theme.frontColor} ${
          winner 
            ? 'scale-110 transition-transform ring-2 ring-white/40 shadow-[0_0_30px_rgba(255,255,255,0.2)]'
            : ''
        }`}
        style={{ 
          backfaceVisibility: 'hidden',
          visibility: faceDown ? 'hidden' : 'visible'
        }}
      >
        <span className="relative z-10">
          <img 
            src={assetPreloader.getCachedUrl(getCardImagePath(theme, type))} 
            alt={CARD_NAMES[type]} 
            className="w-10 h-10 sm:w-16 sm:h-16 object-contain drop-shadow-2xl" 
            style={{ transform: `scale(${(theme.iconScale || 100) / 100})` }}
            referrerPolicy="no-referrer" 
          />
        </span>
      </div>

      {/* Back Side (Face Down) */}
      <div 
        className={`absolute inset-0 rounded-lg flex items-center justify-center ${theme.backColor}`}
        style={{ 
          backfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)'
        }}
      >
        <div className={`relative w-full h-full rounded-sm flex items-center justify-center`}>
          {theme.backIcon === 'default' ? (
            <div className={`w-8 h-8 sm:w-12 sm:h-12 rounded-full flex items-center justify-center ${isPlayer ? 'bg-black/10' : 'bg-white/10'}`}>
              <div className={`w-4 h-4 sm:w-6 sm:h-6 rounded-full ${isPlayer ? 'bg-black/10' : 'bg-white/10'}`} />
            </div>
          ) : (
            <img src={assetPreloader.getCachedUrl(getThemeBackIcon(theme))} alt="card back" className="w-1/2 h-1/2 object-contain opacity-50" />
          )}
        </div>
      </div>
    </motion.div>
  );
});
