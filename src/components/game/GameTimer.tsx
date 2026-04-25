import React, { memo } from 'react';

export const GameTimer = memo(({ timeLeft }: { timeLeft?: number }) => {
  if (timeLeft === undefined) return null;
  return (
    <div className="flex flex-col items-center">
      <div className={`text-4xl font-mono font-bold ${timeLeft <= 5 ? 'text-game-red animate-pulse' : 'text-game-offwhite'}`}>
        {timeLeft}
      </div>
    </div>
  );
});
