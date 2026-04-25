import React, { memo } from 'react';
import { Lock, ShieldCheck, Diamond } from 'lucide-react';
import { ThemeConfig, getCardImagePath } from '../../themes';
import { assetPreloader } from '../../lib/preloader';

export const CardPack = memo(({ theme, isOwned, isSelected, onClick, onSelect, userLevel = 1 }: { 
  theme: ThemeConfig, 
  isOwned: boolean, 
  isSelected: boolean, 
  onClick: () => void,
  onSelect: () => void,
  userLevel?: number
}) => {
  const isLocked = !isOwned && (theme.requiredLevel || 1) > userLevel;

  return (
    <div 
      onClick={isLocked ? undefined : onClick}
      className={`relative flex flex-col items-center transition-all ${isLocked ? 'grayscale opacity-60' : 'cursor-pointer hover:scale-105'}`}
    >
      <div className="relative w-24 sm:w-32 aspect-[3/4] mb-4">
        <div className={`absolute inset-0 rounded-xl shadow-sm transform -rotate-3 translate-x-[-4%] translate-y-[2%] opacity-20 ${theme.frontColor} border border-white/5`} />
        <div className={`absolute inset-0 rounded-xl shadow-md flex flex-col items-center justify-center p-2 ${theme.frontColor} border-2 ${isSelected ? 'border-game-primary ring-2 ring-game-primary/20' : 'border-black'} z-10 overflow-hidden`}>
          {isLocked ? (
            <div className="flex flex-col items-center gap-2">
              <Lock className="w-8 h-8 text-white/40 mb-1" />
              <div className="bg-black/40 px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase tracking-tighter font-mono">
                Lvl {theme.requiredLevel}
              </div>
            </div>
          ) : (
            <img 
              src={assetPreloader.getCachedUrl(getCardImagePath(theme, 'rock'))} 
              alt="rock" 
              className="w-full h-full object-contain" 
              style={{ transform: `scale(${(theme.iconScale || 100) / 100})` }}
              referrerPolicy="no-referrer" 
            />
          )}
          {isOwned && (
            <div 
              onClick={(e) => { e.stopPropagation(); onSelect(); }}
              className={`absolute top-2 right-2 p-1 rounded-full shadow-sm z-20 transition-all duration-100 ${
              isSelected 
                ? 'bg-game-primary text-white ring-1 ring-white/30 scale-105' 
                : 'bg-[#0a0a0a]/80 text-white hover:bg-game-primary/20 hover:text-game-primary hover:scale-110 border border-white/10'
            }`}>
              <ShieldCheck className={`w-4 h-4 ${isSelected ? 'fill-white/10' : ''}`} />
            </div>
          )}
        </div>
      </div>
      <div className="text-center">
        <h3 className="text-lg font-display text-game-offwhite leading-tight">{theme.name}</h3>
        {isLocked ? (
          <p className="text-red-400 font-display text-[10px] sm:text-xs">يتطلب مستوى {theme.requiredLevel}</p>
        ) : !isOwned ? (
          theme.id === 'robot' ? (
            <p className="text-game-primary font-display text-[10px] sm:text-xs">فز على الروبوت لفتحه</p>
          ) : (
            <p className="text-game-primary font-display text-xs flex items-center gap-1">
              {theme.price} <Diamond className="w-3.5 h-3.5 text-game-primary" />
            </p>
          )
        ) : (
          <p className={`text-xs font-display ${isSelected ? 'text-game-primary' : 'text-game-offwhite/40'}`}>
            {isSelected ? 'مفعل حالياً' : 'مملوك'}
          </p>
        )}
      </div>
    </div>
  );
});
