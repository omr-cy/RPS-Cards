import React, { memo } from 'react';
import { ShoppingCart, Gamepad2, Backpack } from 'lucide-react';

export const BottomNavbar = memo(({ activeTab, setAppState, setMenuTab }: { activeTab: string, setAppState: (state: any) => void, setMenuTab: (tab: any) => void }) => {
  return (
    <nav 
      dir="rtl"
      className="fixed bottom-0 inset-x-0 z-[80] bg-game-dark/95 border-t border-white/5 px-6 pb-safe flex justify-around items-center h-14 sm:h-16 select-none shadow-[0_-4px_10px_rgba(0,0,0,0.3)]"
    >
      <button 
        onClick={() => setAppState('store')}
        className={`flex flex-col items-center justify-center transition-all flex-1 h-full relative ${activeTab === 'store' ? 'text-game-primary' : 'text-game-offwhite/30'}`}
      >
        <ShoppingCart className="w-5 h-5 mb-0.5" />
        <span className="text-[9px] font-display font-medium">المتجر</span>
        {activeTab === 'store' && <div className="absolute top-1 right-1/2 translate-x-1/2 -mt-1 w-1 h-1 rounded-full bg-game-primary shadow-[0_0_5px_rgba(45,212,191,0.5)]" />}
      </button>

      <button 
        onClick={() => {
          setAppState('menu');
          setMenuTab('online');
        }}
        className={`flex flex-col items-center justify-center transition-all flex-1 h-full relative ${activeTab === 'menu' ? 'text-game-primary' : 'text-game-offwhite/30'}`}
      >
        <Gamepad2 className="w-6 h-6 mb-0.5" />
        <span className="text-[10px] font-display font-medium">المنافسة</span>
        {activeTab === 'menu' && <div className="absolute top-1 right-1/2 translate-x-1/2 -mt-1 w-1 h-1 rounded-full bg-game-primary shadow-[0_0_5px_rgba(45,212,191,0.5)]" />}
      </button>

      <button 
        onClick={() => setAppState('profile')}
        className={`flex flex-col items-center justify-center transition-all flex-1 h-full relative ${activeTab === 'profile' ? 'text-game-primary' : 'text-game-offwhite/30'}`}
      >
        <Backpack className="w-5 h-5 mb-0.5" />
        <span className="text-[9px] font-display font-medium">الحقيبة</span>
        {activeTab === 'profile' && <div className="absolute top-1 right-1/2 translate-x-1/2 -mt-1 w-1 h-1 rounded-full bg-game-primary shadow-[0_0_5px_rgba(45,212,191,0.5)]" />}
      </button>
    </nav>
  );
});
