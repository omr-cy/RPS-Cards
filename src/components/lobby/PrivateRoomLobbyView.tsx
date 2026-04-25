import React, { memo } from 'react';
import { Activity, Copy, XCircle } from 'lucide-react';
import { motion } from 'motion/react';

export const PrivateRoomLobbyView = memo(({ 
  isLoading, 
  roomCode, 
  onCancel,
  isLan,
  localIp
}: { 
  isLoading: boolean, 
  roomCode: string | null, 
  onCancel: () => void,
  isLan?: boolean,
  localIp?: string
}) => {
  return (
    <div className="fixed inset-0 z-[250] wood-texture flex flex-col items-center justify-center p-6 overflow-hidden">
      {/* Overlay and background elements identical to MatchmakingView */}
      <div className="absolute inset-0 bg-game-bg/60 backdrop-blur-[2px]" />
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-radial-gradient from-game-teal/10 via-transparent to-transparent" />
        <div className="absolute top-1/4 left-0 w-80 h-80 bg-game-teal/15 blur-[120px] rounded-full" />
        <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-game-red/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
        {isLoading ? (
          <div
            className="flex flex-col items-center gap-8 relative z-10"
          >
            <Activity className="w-12 h-12 text-game-teal animate-spin" />
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-display text-game-offwhite tracking-widest text-shadow-lg">جاري إعداد الغرفة...</h2>
              <p className="text-game-offwhite/40 font-body text-sm italic">
                {isLan ? 'يتم تشغيل السيرفر المحلي الآن' : 'يرجى الانتظار بينما نقوم بفتح بوابات الأونلاين'}
              </p>
            </div>
          </div>
        ) : (
          <div
            className="flex flex-col items-center gap-8 relative z-10 w-full"
          >
            <div className="flex flex-col items-center gap-1">
              <h3 className="text-game-offwhite text-xl font-display text-shadow-lg mt-3">
                {isLan ? 'عنوان IP الخاص بك' : 'رمز الدخول الخاص بك'}
              </h3>
            </div>
            
            <div className="bg-black/60 border border-white/10 rounded-2xl p-6 w-full shadow-inner flex flex-col items-center justify-center">
              <span className={`text-game-offwhite font-bold tracking-[0.2em] drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] ${isLan ? 'text-3xl font-display' : 'text-6xl font-mono'}`}>
                {isLan ? localIp : roomCode}
              </span>
            </div>

            <button 
              onClick={() => {
                const textToCopy = isLan ? localIp : roomCode;
                if (textToCopy) navigator.clipboard.writeText(textToCopy);
              }}
              className="flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 py-3 px-6 rounded-xl text-game-offwhite transition-all active:scale-95 text-sm font-display w-full"
            >
              <Copy className="w-4 h-4" /> {isLan ? 'نسخ عنوان IP للمشاركة' : 'نسخ الرمز للمشاركة'}
            </button>

            <div className="flex flex-col items-center gap-3 mt-4">
               <div className="flex gap-1.5">
                  {[0, 1, 2].map(i => (
                    <motion.div 
                      key={i}
                      animate={{ scale: [1, 1.3, 1], opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3, ease: "easeInOut" }}
                      className="w-2 h-2 bg-game-teal rounded-full"
                    />
                  ))}
               </div>
               <p className="text-game-offwhite/40 font-display text-[11px] tracking-widest italic">بانتظار انضمام الطرف الآخر...</p>
            </div>
          </div>
        )}

        <button 
          onClick={onCancel}
          className="mt-10 px-8 w-full py-3 border-2 border-game-red/40 text-game-red hover:bg-game-red hover:text-white rounded-xl font-display text-xl transition-all shadow-[0_0_20px_rgba(139,26,26,0.2)] active:scale-95 flex items-center justify-center gap-3"
        >
          <XCircle className="w-5 h-5" /> {isLan ? 'إغلاق وإيقاف السيرفر' : 'إلغاء وإغلاق الغرفة'}
        </button>
      </div>
    </div>
  );
});
