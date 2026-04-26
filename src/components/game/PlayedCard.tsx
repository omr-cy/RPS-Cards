import React, { memo } from 'react';
import { motion } from 'motion/react';
import { ThemeConfig, CardType, getCardImagePath, getThemeBackIcon } from '../../themes';
import { assetPreloader } from '../../lib/preloader';
import { CARD_NAMES } from '../../lib/constants';
import { CardFrame } from './CardFrame';

export const PlayedCard = memo(({ type, isPlayer, winner, faceDown = false, theme }: { type: CardType, isPlayer: boolean, winner: boolean, faceDown?: boolean, theme: ThemeConfig }) => {
  const cardColor = isPlayer ? '#61DAFB' : '#790C8D';

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
      className="relative w-18 sm:w-26 z-10"
    >
      <div className="relative w-full h-0" style={{ paddingBottom: '150%', transformStyle: 'preserve-3d' }}>
        <div className="absolute inset-0" style={{ transformStyle: 'preserve-3d' }}>
          {/* Front Side */}
          <div 
            className={`absolute inset-0 backface-hidden ${
              winner ? 'scale-110 transition-transform' : ''
            }`}
            style={{ 
              backfaceVisibility: 'hidden',
              visibility: faceDown ? 'hidden' : 'visible',
              transformStyle: 'preserve-3d'
            }}
          >
            {winner && !faceDown && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="absolute -inset-4 z-0"
              >
                <div className="absolute inset-0 blur-2xl opacity-40 animate-glow-pulse rounded-full" style={{ backgroundColor: cardColor }} />
              </motion.div>
            )}
            <CardFrame color={cardColor} glow={winner} className="w-full h-full">
              <div className="w-full h-full flex items-center justify-center bg-black/40">
                <img 
                  src={assetPreloader.getCachedUrl(getCardImagePath(theme, type))} 
                  alt={CARD_NAMES[type]} 
                  className={`w-10 h-10 sm:w-16 sm:h-16 object-contain drop-shadow-2xl`} 
                  style={{ 
                    transform: `scale(${(theme.iconScale || 100) / 100})`,
                    filter: `drop-shadow(0 0 10px ${cardColor}40)`
                  }}
                  referrerPolicy="no-referrer" 
                />
              </div>
            </CardFrame>
          </div>

          {/* Back Side (Face Down) */}
          <div 
            className={`absolute inset-0`}
            style={{ 
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              transformStyle: 'preserve-3d'
            }}
          >
            <CardFrame color={cardColor} glow={false} className="w-full h-full">
               <div className="w-full h-full flex items-center justify-center bg-black/60 relative overflow-hidden">
                  {/* Pattern on back */}
                  <div className="absolute inset-0 opacity-10" style={{ 
                     backgroundImage: `radial-gradient(${cardColor} 1px, transparent 1px)`,
                     backgroundSize: '10px 10px'
                  }} />
                  
                  {theme.backIcon === 'default' ? (
                    <div className={`w-8 h-8 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border-2 border-dashed opacity-30`} style={{ borderColor: cardColor }}>
                      <div className={`w-4 h-4 sm:w-6 sm:h-6 rounded-full opacity-50`} style={{ backgroundColor: cardColor }} />
                    </div>
                  ) : (
                    <img src={assetPreloader.getCachedUrl(getThemeBackIcon(theme))} alt="card back" className="w-1/2 h-1/2 object-contain opacity-40" />
                  )}
               </div>
            </CardFrame>
          </div>
        </div>
      </div>
    </motion.div>
  );
});
