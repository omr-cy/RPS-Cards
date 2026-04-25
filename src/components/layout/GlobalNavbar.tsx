import React, { memo } from 'react';
import { Wifi, Settings, Activity, Diamond, Users } from 'lucide-react';

export const GlobalNavbar = memo(({ coins, competitionPoints, isOnline, setAppState, unreadChat, setUnreadChat, setShowSettingsSidebar }: any) => {
  return (
    <>
      {!isOnline && (
        <div className="fixed top-0 inset-x-0 z-[70] bg-red-900/90 text-white text-[10px] sm:text-xs font-display flex items-center justify-center gap-2 py-0.5" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <Wifi className="w-3 h-3 text-red-300" />
          وضع عدم الاتصال بالإنترنت - يتم اللعب محلياً
        </div>
      )}
      <nav 
        dir="rtl" 
        className="fixed top-0 inset-x-0 z-[60] bg-game-dark/80 backdrop-blur-md border-b border-white/5 shadow-md transition-all" 
        style={{ paddingTop: isOnline ? 'max(0.5rem, env(safe-area-inset-top))' : 'max(1.5rem, calc(env(safe-area-inset-top) + 0.75rem))' }}
      >
        <div className="flex justify-between items-center h-12 px-6">
          <div className="w-10">
            <button 
              onClick={() => setShowSettingsSidebar(true)} 
              className="p-2 text-game-offwhite/40 hover:text-game-teal transition-colors active:scale-90"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/10">
            <span className="text-sm font-display text-game-teal font-medium ml-2">{competitionPoints} <Activity className="w-3.5 h-3.5 inline text-game-teal rotate-90 mb-0.5" /></span>
            <span className="text-sm font-display text-yellow-500 font-medium">{coins}</span>
            <Diamond className="w-3.5 h-3.5 text-yellow-500" />
          </div>

          <div className="w-10 flex justify-end">
             <button 
              onClick={() => {
                setAppState('community');
                setUnreadChat(false);
              }} 
              className="relative p-2 text-game-teal/70 hover:text-game-teal transition-colors active:scale-90"
            >
              {unreadChat && <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border border-game-dark" />}
              <Users className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>
    </>
  );
});
