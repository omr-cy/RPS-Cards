import React, { useState, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Diamond, Activity, Zap, Package } from 'lucide-react';

export type RewardType = 'coins' | 'xp' | 'points' | 'item';

export interface Reward {
  id: string;
  type: RewardType;
  amount: number;
  icon?: string;
  sourceRect?: DOMRect;
}

interface FlyingItem {
  id: string;
  type: RewardType;
  icon: React.ReactNode;
  start: { x: number, y: number };
  end: { x: number, y: number };
  delay: number;
}

const REWARD_ICONS: Record<RewardType, React.ReactNode> = {
  coins: <Diamond className="w-6 h-6 text-game-primary" />,
  xp: <Zap className="w-6 h-6 text-yellow-400" />,
  points: <Activity className="w-6 h-6 text-game-primary rotate-90" />,
  item: <Package className="w-6 h-6 text-game-offwhite" />,
};

const TARGET_IDS: Record<RewardType, string> = {
  coins: 'reward-target-coins',
  xp: 'reward-target-level',
  points: 'reward-target-points',
  item: 'reward-target-inventory',
};

export const RewardAnimationOverlay = ({ rewards, sourceRect: externalSourceRect, onComplete }: { rewards: Reward[], sourceRect?: DOMRect | null, onComplete: (reward: Reward) => void }) => {
  const [flyingItems, setFlyingItems] = useState<FlyingItem[]>([]);

  useEffect(() => {
    if (rewards.length === 0) return;

    const newFlyingItems: FlyingItem[] = [];
    
    rewards.forEach((reward, rewardIdx) => {
      const targetEl = document.getElementById(TARGET_IDS[reward.type]);
      if (!targetEl) return;

      const targetRect = targetEl.getBoundingClientRect();
      const sourceRect = reward.sourceRect || externalSourceRect || { 
        left: window.innerWidth / 2, 
        top: window.innerHeight / 2,
        width: 0,
        height: 0 
      };

      // Spawn multiple visual items for each reward (e.g. 5 coins for a coin reward)
      const count = reward.type === 'coins' ? 8 : 5;
      
      for (let i = 0; i < count; i++) {
        newFlyingItems.push({
          id: `${reward.id}-${i}`,
          type: reward.type,
          icon: REWARD_ICONS[reward.type],
          start: { 
            x: (sourceRect as DOMRect).left + (sourceRect as DOMRect).width / 2, 
            y: (sourceRect as DOMRect).top + (sourceRect as DOMRect).height / 2 
          },
          end: { 
            x: targetRect.left + targetRect.width / 2, 
            y: targetRect.top + targetRect.height / 2 
          },
          delay: rewardIdx * 0.4 + i * 0.08, // Staggered delay
        });
      }
    });

    setFlyingItems(newFlyingItems);
  }, [rewards]);

  const handleAnimationComplete = (id: string, type: RewardType) => {
    setFlyingItems(prev => prev.filter(item => item.id !== id));
    
    // Trigger the 'pop' effect on the target
    const targetEl = document.getElementById(TARGET_IDS[type]);
    if (targetEl) {
      targetEl.classList.remove('reward-pop');
      void targetEl.offsetWidth; // trigger reflow
      targetEl.classList.add('reward-pop');
    }

    // Call onComplete when the LAST visual item for a reward finishes
    const baseId = id.split('-')[0];
    const remainingForThisReward = flyingItems.filter(item => item.id.startsWith(baseId) && item.id !== id);
    if (remainingForThisReward.length === 0) {
      const reward = rewards.find(r => r.id === baseId);
      if (reward) onComplete(reward);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] pointer-events-none overflow-hidden">
      <AnimatePresence>
        {flyingItems.map((item) => (
          <motion.div
            key={item.id}
            initial={{ 
              x: item.start.x - 12, 
              y: item.start.y - 12, 
              scale: 0, 
              opacity: 0,
              rotate: 0 
            }}
            animate={{
              x: [item.start.x - 12, item.start.x + (Math.random() - 0.5) * 100, item.end.x - 12],
              y: [item.start.y - 12, item.start.y - 100, item.end.y - 12],
              scale: [0, 1.5, 0.5],
              opacity: [0, 1, 1, 0.8],
              rotate: [0, 360],
            }}
            transition={{
              duration: 1.2,
              delay: item.delay,
              ease: [0.34, 1.56, 0.64, 1], // Custom overshoot ease
            }}
            onAnimationComplete={() => handleAnimationComplete(item.id, item.type)}
            className="absolute"
          >
            <div className="relative">
              {item.icon}
              {/* Sparkle effect */}
              <motion.div 
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 0.5, repeat: Infinity }}
                className="absolute inset-0 bg-white/20 blur-lg rounded-full"
              />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

// Add CSS for the pop effect to index.css
