import React, { memo } from 'react';
import { Activity } from 'lucide-react';

export const MatchmakingView = memo(({ 
  isSearching, 
  onCancel, 
  matchFound, 
  opponent,
  playerName,
  playerLevel,
  playerThemeId,
  canCancel
}: { 
  isSearching: boolean, 
  onCancel: () => void, 
  matchFound: boolean,
  opponent: any,
  playerName: string,
  playerLevel: number,
  playerThemeId: string,
  canCancel: boolean
}) => {
  if (!isSearching && !matchFound) return null;

  return (
    <div
      className="fixed inset-0 z-[200] wood-texture flex flex-col items-center justify-center p-6 overflow-hidden"
    >
      {/* Overlay and background elements */}
      <div className="absolute inset-0 bg-game-bg/60 backdrop-blur-[2px]" />
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-radial-gradient from-game-primary/10 via-transparent to-transparent" />
        <div className="absolute top-1/4 left-0 w-80 h-80 bg-game-primary/15 blur-[120px] rounded-full" />
        <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-game-red/10 blur-[120px] rounded-full" />
      </div>

      <div
        key="searching"
        className="flex flex-col items-center gap-8 relative z-10"
      >
        <Activity className="w-12 h-12 text-game-primary animate-spin" />
        
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-display text-game-offwhite tracking-widest">
            {matchFound ? 'جاري الدخول للمعركة...' : 'جاري البحث...'}
          </h2>
          <p className="text-game-offwhite/40 font-body text-sm">
            {matchFound ? 'تم العثور على خصم، استعد للمواجهة!' : 'يتم الآن البحث عن اللاعبين المناسبين لنفس مستواك'}
          </p>
        </div>

        {!matchFound && (
          <button 
            onClick={onCancel}
            disabled={!canCancel}
            className={`mt-8 px-10 py-3 border-2 border-game-red/40 text-game-red rounded-xl font-display text-xl transition-all shadow-[0_0_20px_rgba(139,26,26,0.2)] ${!canCancel ? 'opacity-30 cursor-not-allowed scale-95' : 'hover:bg-game-red hover:text-white active:scale-95'}`}
          >
            إلغاء البحث
          </button>
        )}
      </div>
    </div>
  );
});
