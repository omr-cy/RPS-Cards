import React, { useState, memo } from 'react';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { LeaderboardContent } from './LeaderboardContent';
import { GlobalChat } from '../components/community/GlobalChat';
import { useLanguage } from '../contexts/LanguageContext';

export const CommunityView = memo(({ userId, user, ws, chatMessages, setChatMessages, connectToOnline, onBack, sendAction, isOnlineConnected, setCoins }: any) => {
  const { t, isRTL } = useLanguage();
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'chat'>('chat');
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="w-full h-full flex flex-col font-body bg-game-bg overflow-hidden relative">
      <header 
        className="fixed top-0 inset-x-0 z-[70] bg-game-dark/95 border-b border-white/10 shadow-xl px-6 sm:px-8"
        style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))' }}
      >
        <div className="relative w-full h-12 flex items-center justify-center">
          <button 
             className={`absolute ${isRTL ? 'right-4' : 'left-4'} p-1.5 text-game-offwhite/50 hover:text-game-offwhite transition-all active:scale-90`}
             onClick={onBack}
          >
            {isRTL ? <ArrowRight className="w-6 h-6" /> : <ArrowLeft className="w-6 h-6" />}
          </button>
          <h2 className="text-xl sm:text-2xl font-display text-white tracking-wider">{t('nav_community')}</h2>
        </div>

        {/* Community Tabs */}
        <div className="flex px-4 mt-2 gap-2 max-w-md mx-auto">
          <button 
            onClick={() => setActiveTab('leaderboard')}
            className={`flex-1 py-2 font-display text-sm transition-all rounded-t-xl ${activeTab === 'leaderboard' ? 'bg-white/10 text-game-primary border-b-2 border-game-primary' : 'text-game-offwhite/50 hover:text-game-offwhite'}`}
          >
            {t('community_leaderboard')}
          </button>
          <button 
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-2 font-display text-sm transition-all rounded-t-xl ${activeTab === 'chat' ? 'bg-white/10 text-game-cream border-b-2 border-game-cream' : 'text-game-offwhite/50 hover:text-game-offwhite'}`}
          >
            {t('community_chat')}
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
