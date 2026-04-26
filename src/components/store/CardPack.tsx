import React, { memo } from 'react';
import { Lock, ShieldCheck, Diamond } from 'lucide-react';
import { ThemeConfig, getCardImagePath } from '../../themes';
import { assetPreloader } from '../../lib/preloader';
import { useLanguage } from '../../contexts/LanguageContext';

export const CardPack = memo(({ theme, isOwned, isSelected, onClick, onSelect, userLevel = 1 }: { 
  theme: ThemeConfig, 
  isOwned: boolean, 
  isSelected: boolean, 
  onClick: () => void,
  onSelect: () => void,
  userLevel?: number
}) => {
  const { t, language } = useLanguage();
  const isLocked = !isOwned && (theme.requiredLevel || 1) > userLevel;
  const mainColor = "#61DAFB"; // Global Neon Blue for themes

  return (
    <div 
      onClick={isLocked ? undefined : onClick}
      className={`relative flex flex-col items-center ${isLocked ? 'grayscale opacity-60' : 'cursor-pointer'}`}
    >
      {/* Icon Container (Token Style) */}
      <div className="relative w-24 h-24 sm:w-32 sm:h-32 mb-4">
        {/* Outer Ring - No Glow */}
        <div 
          className={`absolute inset-0 rounded-full border-2 flex items-center justify-center bg-black/60 backdrop-blur-sm ${
            isSelected ? 'border-[#61DAFB]' : 'border-white/5'
          }`}
        >
          {isLocked ? (
            <div className="flex flex-col items-center gap-1">
              <Lock className="w-8 h-8 text-white/20 mb-1" />
              <div className="bg-white/5 px-2 py-0.5 rounded-full text-[10px] font-bold text-white/40 uppercase tracking-tighter font-mono">
                Lvl {theme.requiredLevel}
              </div>
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center p-4">
              <img 
                src={assetPreloader.getCachedUrl(getCardImagePath(theme, 'rock'))} 
                alt="rock" 
                className="w-full h-full object-contain relative z-10" 
                style={{ transform: `scale(${(theme.iconScale || 100) / 100 * (isSelected ? 1.05 : 1)})` }}
                referrerPolicy="no-referrer" 
              />
            </div>
          )}

          {/* Owned Badge */}
          {isOwned && (
            <div 
              onClick={(e) => { e.stopPropagation(); onSelect(); }}
              className={`absolute -top-1 -right-1 p-1.5 rounded-full shadow-lg z-20 ${
              isSelected 
                ? 'bg-[#61DAFB] text-black scale-110' 
                : 'bg-[#0a0a0a] text-white/40 hover:bg-[#61DAFB]/20 hover:text-[#61DAFB] border border-white/10'
            }`}>
              <ShieldCheck className={`w-4 h-4 ${isSelected ? 'fill-black/10' : ''}`} />
            </div>
          )}
        </div>
      </div>


      {/* Info */}
      <div className="text-center">
        <h3 className="text-lg font-display text-white leading-tight mb-1">{theme.name[language]}</h3>
        {isLocked ? (
          <p className="text-red-400 font-display text-[10px] sm:text-xs opacity-80">{t('store_requires_level').replace('{level}', (theme.requiredLevel || 1).toString())}</p>
        ) : !isOwned ? (
          theme.id === 'robot' ? (
            <p className="text-[#61DAFB] font-display text-[10px] sm:text-xs">{t('store_beat_bot_unlock')}</p>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full border border-white/10">
              <span className="text-white font-display text-sm">{theme.price}</span>
              <Diamond className="w-3.5 h-3.5 text-[#61DAFB] fill-[#61DAFB]/20" />
            </div>
          )
        ) : (
          <div className={`text-[10px] uppercase tracking-[0.2em] font-display ${isSelected ? 'text-[#61DAFB] opacity-100' : 'text-white/20'}`}>
            {isSelected ? t('store_active_label') : t('store_owned_label')}
          </div>
        )}
      </div>
    </div>
  );
});
