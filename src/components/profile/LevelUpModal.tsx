import React, { memo } from 'react';
import { Brain } from 'lucide-react';
import { motion } from 'motion/react';
import { THEMES } from '../../themes';

export const LevelUpModal = memo(({ level, onClose }: { level: number, onClose: () => void }) => {
  const unlockedThemes = THEMES.filter(t => t.requiredLevel === level);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-game-bg/90 backdrop-blur-md"
    >
      <motion.div 
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-sm bg-game-dark/90 rounded-3xl border border-game-primary/30 p-8 text-center relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-game-primary to-transparent" />
        
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute -top-24 -left-24 w-48 h-48 bg-game-primary/10 rounded-full blur-3xl"
        />

        <div className="relative z-10 space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <motion.div 
                animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-24 h-24 bg-game-primary rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(45,212,191,0.5)]"
              >
                <Brain className="w-12 h-12 text-white" />
              </motion.div>
              <div className="absolute -bottom-2 -right-2 bg-game-primary text-game-dark font-bold px-3 py-1 rounded-full border-2 border-game-dark text-xl">
                {level}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-display text-white">مبروك!</h2>
            <p className="text-game-offwhite/70 font-body">لقد ارتقت خبرتك ووصلت للمستوى الجديد</p>
          </div>

          {unlockedThemes.length > 0 && (
            <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/5">
              <p className="text-xs text-game-offwhite/40 font-display">تم فتح ثيمات جديدة:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {unlockedThemes.map(t => (
                  <div key={t.id} className="bg-game-primary/10 px-3 py-1 rounded-full border border-game-primary/20 text-game-primary text-sm font-bold">
                    {t.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button 
            onClick={onClose}
            className="w-full bg-game-primary text-white py-4 rounded-xl font-bold font-display shadow-lg hover:brightness-110 active:scale-95 transition-all text-xl"
          >
            استمرار
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
});
