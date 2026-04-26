import React, { memo } from 'react';
import { ShoppingCart, Gamepad2, Backpack } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export const BottomNavbar = memo(({ activeTab, setAppState, setMenuTab }: { activeTab: string, setAppState: (state: any) => void, setMenuTab: (tab: any) => void }) => {
  const { t } = useLanguage();
  return (
    <nav 
      dir="ltr"
      className="fixed z-[80] bg-game-dark/95 border border-white/10 rounded-2xl px-6 flex justify-around items-center h-14 sm:h-16 select-none shadow-xl"
      style={{ 
        bottom: 'calc(max(1.25rem, env(safe-area-inset-bottom)) + 0.75rem)',
        left: '1rem',
        right: '1rem'
      }}
    >
      <button 
        id="reward-target-inventory"
        onClick={() => setAppState('profile')}
        className={`flex flex-col items-center justify-center transition-all flex-1 h-full relative ${activeTab === 'profile' ? 'text-game-primary' : 'text-game-offwhite/30'}`}
      >
        <Backpack className="w-5 h-5 mb-0.5" />
        <span className="text-[9px] font-display font-medium">{t('nav_profile')}</span>
        {activeTab === 'profile' && <div className="absolute top-1 right-1/2 translate-x-1/2 -mt-1 w-1 h-1 rounded-full bg-game-primary shadow-[0_0_5px_rgba(45,212,191,0.5)]" />}
      </button>

      <button 
        onClick={() => {
          setAppState('menu');
          setMenuTab('online');
        }}
        className={`flex flex-col items-center justify-center transition-all flex-1 h-full relative ${activeTab === 'menu' ? 'text-game-primary' : 'text-game-offwhite/30'}`}
      >
        <Gamepad2 className="w-6 h-6 mb-0.5" />
        <span className="text-[10px] font-display font-medium">{t('nav_play')}</span>
        {activeTab === 'menu' && <div className="absolute top-1 right-1/2 translate-x-1/2 -mt-1 w-1 h-1 rounded-full bg-game-primary shadow-[0_0_5px_rgba(45,212,191,0.5)]" />}
      </button>

      <button 
        onClick={() => setAppState('store')}
        className={`flex flex-col items-center justify-center transition-all flex-1 h-full relative ${activeTab === 'store' ? 'text-game-primary' : 'text-game-offwhite/30'}`}
      >
        <ShoppingCart className="w-5 h-5 mb-0.5" />
        <span className="text-[9px] font-display font-medium">{t('nav_store')}</span>
        {activeTab === 'store' && <div className="absolute top-1 right-1/2 translate-x-1/2 -mt-1 w-1 h-1 rounded-full bg-game-primary shadow-[0_0_5px_rgba(45,212,191,0.5)]" />}
      </button>
    </nav>
  );
});
