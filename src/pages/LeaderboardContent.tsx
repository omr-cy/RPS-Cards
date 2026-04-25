import React, { useState, useEffect, memo } from 'react';
import { Activity, XCircle, Diamond } from 'lucide-react';
import { motion } from 'motion/react';
import { getApiUrl } from '../env_config';

const API_BASE_URL = getApiUrl();

export const LeaderboardContent = memo(({ userId }: { userId: string | null }) => {
  const [data, setData] = useState<{ topPlayers: any[], userRank: number | null, userScore: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `${API_BASE_URL}/api/leaderboard${userId ? `?userId=${userId}` : ''}`;
      console.log('Fetching leaderboard from:', url);
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        setError(`خطأ في المخدم: ${res.status}`);
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
      setError('فشل الاتصال بالمخدم - تأكد من اتصالك بالإنترنت');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [userId]);

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
        <Activity className="w-8 h-8 text-game-teal animate-spin" />
        <p className="text-game-offwhite/50 font-display">جاري تحميل لوحة الصدارة...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center space-y-4 p-6 text-center">
        <XCircle className="w-12 h-12 text-red-500" />
        <p className="text-game-offwhite font-display text-lg">{error}</p>
        <button 
          onClick={fetchLeaderboard}
          className="bg-game-teal text-white px-6 py-2 rounded-lg font-bold shadow-lg"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-md mx-auto space-y-6 pt-6 pb-24 px-4 overflow-y-auto smooth-scroll">
      <div className="space-y-3">
        {data?.topPlayers.map((player: any, idx: number) => {
          const isTop3 = idx < 3;
          const medals = ['🥇', '🥈', '🥉'];
          return (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              key={player._id}
              className={`p-4 rounded-2xl flex items-center justify-between border ${idx === 0 ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-game-dark/60 border-white/5'}`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 flex items-center justify-center text-xl font-display ${isTop3 ? '' : 'text-game-offwhite/30'}`}>
                  {isTop3 ? medals[idx] : idx + 1}
                </div>
                <div className="text-right">
                  <p className={`font-display text-lg leading-tight ${isTop3 ? 'text-white' : 'text-game-offwhite/80'}`}>{player.displayName}</p>
                  <p className="text-[10px] text-game-offwhite/40 tracking-widest font-mono">LEVEL {player.level || 1}</p>
                </div>
              </div>
              <div className="text-left flex flex-col items-end gap-1">
                <div className="flex items-center gap-1.5">
                  <span className={`font-display text-xl ${idx === 0 ? 'text-game-teal' : 'text-game-teal/80'}`}>{player.competitionPoints || 0}</span>
                  <Activity className={`w-4 h-4 ${idx === 0 ? 'text-game-teal' : 'text-game-teal/80'} rotate-90`} />
                </div>
                <div className="flex items-center gap-1 opacity-60">
                  <span className={`font-display text-xs ${idx === 0 ? 'text-yellow-500' : 'text-yellow-500/80'}`}>{player.coins || 0}</span>
                  <Diamond className={`w-3 h-3 ${idx === 0 ? 'text-yellow-500' : 'text-yellow-500/80'}`} />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
});
