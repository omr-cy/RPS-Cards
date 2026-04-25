import React, { useState, memo } from 'react';
import { ArrowRight } from 'lucide-react';
import { LeaderboardContent } from './LeaderboardContent';
import { GlobalChat } from '../components/community/GlobalChat';

export const CommunityView = memo(({ userId, user, ws, chatMessages, setChatMessages, connectToOnline, onBack, sendAction, isOnlineConnected, setCoins }: any) => {
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'chat'>('chat');
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div dir="rtl" className="w-full h-full flex flex-col font-body bg-game-bg overflow-hidden relative">
      <header 
        className="fixed top-0 inset-x-0 z-[70] bg-game-dark/95 border-b border-white/10 shadow-xl px-6 sm:px-8"
        style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))' }}
      >
        <div className="relative w-full h-12 flex items-center justify-center">
          <button 
             className="absolute right-4 p-1.5 text-game-offwhite/50 hover:text-game-offwhite transition-all active:scale-90"
             onClick={onBack}
          >
            <ArrowRight className="w-6 h-6" />
          </button>
          <h2 className="text-xl sm:text-2xl font-display text-white tracking-wider">المجتمع</h2>
        </div>

        {/* Community Tabs */}
        <div className="flex px-4 mt-2 gap-2 max-w-md mx-auto">
          <button 
            onClick={() => setActiveTab('leaderboard')}
            className={`flex-1 py-2 font-display text-sm transition-all rounded-t-xl ${activeTab === 'leaderboard' ? 'bg-white/10 text-yellow-500 border-b-2 border-yellow-500' : 'text-game-offwhite/50 hover:text-game-offwhite'}`}
          >
            الصدارة
          </button>
          <button 
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-2 font-display text-sm transition-all rounded-t-xl ${activeTab === 'chat' ? 'bg-white/10 text-game-cream border-b-2 border-game-cream' : 'text-game-offwhite/50 hover:text-game-offwhite'}`}
          >
            الشات
          </button>
        </div>
      </header>

      <div key={refreshKey} className="flex-1 w-full flex flex-col pt-32 h-full overflow-hidden">
        {activeTab === 'leaderboard' && <LeaderboardContent userId={userId} />}
        {activeTab === 'chat' && (
          <GlobalChat ws={ws} chatMessages={chatMessages} setChatMessages={setChatMessages} user={user} connectToOnline={connectToOnline} sendAction={sendAction} isOnlineConnected={isOnlineConnected} />
        )}
      </div>
    </div>
  );
});
