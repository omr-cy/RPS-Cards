import React, { useState, memo } from 'react';
import { THEMES, ThemeConfig } from '../themes';
import { CardPack } from '../components/store/CardPack';
import { PackPreviewModal } from '../components/store/PackPreviewModal';

export const StoreView = memo(({ coins, ownedThemes, selectedThemeId, onBuy, onSelect, selectedPack, setSelectedPack, userLevel = 1 }: {
  coins: number,
  ownedThemes: string[],
  selectedThemeId: string,
  onBack: () => void,
  onBuy: (theme: ThemeConfig) => void,
  onSelect: (id: string) => void,
  selectedPack: ThemeConfig | null,
  setSelectedPack: (theme: ThemeConfig | null) => void,
  userLevel?: number
}) => {
  const [activeTab, setActiveTab] = useState<'level' | 'special'>('level');
  
  const filteredThemes = THEMES.filter(theme => 
    theme.category === activeTab
  );

  return (
  <div 
    dir="rtl" 
    className="w-full h-full flex flex-col font-body overflow-hidden select-none bg-game-bg/20"
  >
    <div className="flex-1 overflow-hidden pt-24 pb-24 px-4 sm:px-6 flex flex-col max-w-4xl mx-auto w-full">
      {/* TABS */}
      <div className="flex gap-2 px-3 relative z-10 -mb-[1px]">
        <button 
          onClick={() => setActiveTab('level')}
          className={`flex-1 py-3 px-2 rounded-t-2xl font-display text-xs transition-all flex items-center justify-center gap-2 relative ${activeTab === 'level' ? 'bg-[#0a0a0a] border border-white/5 text-game-primary z-20' : 'bg-[#0a0a0a]/50 text-game-offwhite/40 hover:bg-[#0a0a0a]/80 hover:text-game-offwhite z-10 translate-y-1'}`}
        >
          ثيمات بالمستوى
          {activeTab === 'level' && <div className="absolute -bottom-[2px] left-0 right-0 h-[3px] bg-[#0a0a0a] border border-white/5 z-30" />}
        </button>
        
        <button 
          onClick={() => setActiveTab('special')}
          className={`flex-1 py-3 px-2 rounded-t-2xl font-display text-xs transition-all flex items-center justify-center gap-2 relative ${activeTab === 'special' ? 'bg-[#0a0a0a] border border-white/5 text-game-primary z-20' : 'bg-[#0a0a0a]/50 text-game-offwhite/40 hover:bg-[#0a0a0a]/80 hover:text-game-offwhite z-10 translate-y-1'}`}
        >
          ثيمات مميزة
          {activeTab === 'special' && <div className="absolute -bottom-[2px] left-0 right-0 h-[3px] bg-[#0a0a0a] border border-white/5 z-30" />}
        </button>
      </div>

      <div className="flex-1 flex flex-col bg-[#0a0a0a] border border-white/5 rounded-3xl shadow-2xl overflow-hidden relative z-0">
        <div className="flex-1 overflow-y-auto smooth-scroll px-5 py-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-y-10 gap-x-4">
            {filteredThemes.map(theme => (
              <CardPack 
                key={theme.id}
                theme={theme}
                isOwned={ownedThemes.includes(theme.id)}
                isSelected={selectedThemeId === theme.id}
                userLevel={userLevel}
                onClick={() => setSelectedPack(theme)}
                onSelect={() => onSelect(theme.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>

    <div className={selectedPack ? 'block' : 'hidden'}>
      <PackPreviewModal 
        selectedPack={selectedPack} 
        ownedThemes={ownedThemes} 
        selectedThemeId={selectedThemeId} 
        onBuy={onBuy} 
        onSelect={onSelect} 
        onClose={() => setSelectedPack(null)} 
      />
    </div>
  </div>
);
});
