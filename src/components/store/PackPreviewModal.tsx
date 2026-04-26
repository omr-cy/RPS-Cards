import React, { memo } from 'react';
import { Diamond } from 'lucide-react';
import { ThemeConfig, CardType } from '../../themes';
import { FloatingCard } from '../game/FloatingCard';
import { useLanguage } from '../../contexts/LanguageContext';

export const PackPreviewModal = memo(({ selectedPack, ownedThemes, selectedThemeId, onBuy, onSelect, onClose }: {
  selectedPack: ThemeConfig | null,
  ownedThemes: string[],
  selectedThemeId: string,
  onBuy: (theme: ThemeConfig) => void,
  onSelect: (id: string) => void,
  onClose: () => void
}) => {
  const { t, language } = useLanguage();
  if (!selectedPack) return null;
  return (
    <div 
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-game-dark/40 backdrop-blur-3xl p-6 sm:p-8 rounded-2xl shadow-2xl relative border border-white/10"
        onClick={e => e.stopPropagation()}
      >
              <div className="relative z-10 flex flex-col items-center">
          <h2 className="text-2xl font-display text-game-offwhite mb-1">{selectedPack.name[language]}</h2>
          <p className="text-game-offwhite/60 font-display mb-8 text-sm">{t('store_full_set')}</p>
          <div className="flex justify-center items-center gap-4 sm:gap-6 mb-10 w-full px-2">
            {['scissors', 'paper', 'rock'].map((type, idx) => (
              <FloatingCard key={type} theme={selectedPack} type={type as CardType} idx={idx} />
            ))}
          </div>
          <div className="flex flex-col gap-3 w-full">
            {ownedThemes.includes(selectedPack.id) ? (
              <button 
                onClick={() => onSelect(selectedPack.id)}
                disabled={selectedThemeId === selectedPack.id}
                className={`w-full py-3.5 rounded-xl font-display text-xl transition-all outline-none backdrop-blur-sm transform-gpu ${
                  selectedThemeId === selectedPack.id 
                  ? 'bg-game-primary/20 text-game-primary cursor-default border border-game-primary/30' 
                  : 'bg-game-primary hover:bg-emerald-400 text-game-dark active:scale-95'
                }`}
              >
                {selectedThemeId === selectedPack.id ? t('store_active_label') : t('store_equip_theme')}
              </button>
            ) : selectedPack.id === 'robot' ? (
              <div className="w-full py-3.5 bg-game-primary/20 text-game-primary rounded-xl font-display text-lg border border-game-primary/30 flex items-center justify-center text-center">
                {t('store_unlock_beat_bot')}
              </div>
            ) : (
              <button 
                onClick={() => onBuy(selectedPack)}
                className="w-full py-3.5 bg-white/15 backdrop-blur-md border border-white/20 hover:bg-white/20 text-white rounded-xl font-display text-xl transition-all active:scale-95 flex items-center justify-center gap-3 outline-none transform-gpu"
              >
                {t('store_buy_set')} <span className="text-yellow-400 flex items-center gap-1">{selectedPack.price} <Diamond className="w-4 h-4 text-game-primary inline" /></span>
              </button>
            )}
            <button 
              onClick={onClose} 
              className="w-full py-3.5 bg-white/5 hover:bg-white/10 text-game-offwhite rounded-xl font-display text-xl transition-all"
            >
              {t('store_close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
