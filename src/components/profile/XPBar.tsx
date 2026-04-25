import React, { memo } from 'react';
import { Brain } from 'lucide-react';
import { motion } from 'motion/react';

export const XPBar = memo(({ xp = 0, level = 1 }: { xp: number, level: number }) => {
  const safeLevel = Math.max(1, level);
  const currentLevelXP = Math.pow(safeLevel - 1, 2) * 100;
  const nextLevelXP = Math.pow(safeLevel, 2) * 100;
  const totalInLevel = nextLevelXP - currentLevelXP;
  const progressInLevel = Math.max(0, xp - currentLevelXP);
  const progress = Math.min(100, (progressInLevel / totalInLevel) * 100);

  return (
    <div className="w-full space-y-1.5" dir="rtl">
      <div className="flex justify-between items-end px-1">
        <div className="flex items-center gap-1.5">
          <div className="bg-game-primary/20 p-1 rounded-md">
            <Brain className="w-3.5 h-3.5 text-game-primary fill-game-primary/20" />
          </div>
          <span className="text-[10px] text-game-offwhite/50 font-display uppercase tracking-widest">نقاط الخبرة</span>
        </div>
        <div className="text-[11px] font-mono text-game-primary font-bold">
          {Math.floor(progressInLevel)} <span className="text-game-offwhite/30">/</span> {totalInLevel}
        </div>
      </div>
      <div className="h-2.5 bg-game-dark/50 rounded-full overflow-hidden border border-white/5 p-[1px]">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-full bg-game-primary rounded-full shadow-[0_0_10px_rgba(45,212,191,0.4)]"
        />
      </div>
    </div>
  );
});
