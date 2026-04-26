import React, { useState, useEffect, memo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { User, Gift, Edit2, RefreshCw, Diamond, Activity, Info, LogOut, LogIn, CheckCircle2 } from 'lucide-react';
import { TbCardsFilled } from 'react-icons/tb';
import { THEMES, ThemeConfig, CardType } from '../themes';
import { XPBar } from '../components/profile/XPBar';
import { CardPack } from '../components/store/CardPack';
import { PackPreviewModal } from '../components/store/PackPreviewModal';
import { FloatingCard } from '../components/game/FloatingCard';
import { getApiUrl } from '../env_config';

const API_BASE_URL = getApiUrl();

export const ProfileView = memo(({ playerName, coins, competitionPoints = 0, xp = 0, level = 1, ownedThemes, selectedThemeId, onSelect, onBuy, selectedPack, setSelectedPack, onEditName, userId, onLoginClick, onLogoutClick, onRefresh }: {
  playerName: string,
  coins: number,
  competitionPoints?: number,
  xp?: number,
  level?: number,
  ownedThemes: string[],
  selectedThemeId: string,
  onSelect: (id: string) => void,
  onBuy: (theme: ThemeConfig) => void,
  selectedPack: ThemeConfig | null,
  setSelectedPack: (theme: ThemeConfig | null) => void,
  onEditName: () => void,
  userId?: string | null,
  onLoginClick?: () => void,
  onLogoutClick?: () => void,
  onRefresh?: () => void,
}) => {
  const { t, isRTL } = useLanguage();
  const [activeTab, setActiveTab] = useState<'profile' | 'themes' | 'gift'>('profile');
  const [userRank, setUserRank] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (onRefresh && !isRefreshing) {
      setIsRefreshing(true);
      await onRefresh();
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (userId && activeTab === 'profile') {
      fetch(`${API_BASE_URL}/api/leaderboard?userId=${userId}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.userRank) {
            setUserRank(data.userRank);
          }
        })
        .catch(err => console.error('Failed to fetch rank:', err));
    }
  }, [userId, activeTab]);

  return (
    <div 
      dir={isRTL ? 'rtl' : 'ltr'}
      className="w-full h-full flex flex-col font-body overflow-hidden select-none bg-game-bg/20"
    >
      <div className="flex-1 overflow-hidden pt-24 pb-24 px-4 sm:px-6 flex flex-col max-w-md mx-auto w-full">
        {/* TABS (Protruding Bumps) */}
        <div dir="ltr" className="flex gap-2 px-3 relative z-10 -mb-[1px]">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-3 px-2 rounded-t-2xl font-display text-xs transition-all flex flex-col items-center gap-1 relative ${activeTab === 'profile' ? 'bg-[#0a0a0a] border border-white/5 text-game-primary z-20' : 'bg-[#0a0a0a]/50 text-game-offwhite/40 hover:bg-[#0a0a0a]/80 hover:text-game-offwhite z-10 translate-y-1'}`}
          >
            <User className="w-4 h-4" />
            {t('profile_tab_profile')}
            {activeTab === 'profile' && <div className="absolute -bottom-[2px] left-0 right-0 h-[3px] bg-[#0a0a0a] border border-white/5 z-30" />}
          </button>
          
          <button 
            onClick={() => setActiveTab('themes')}
            className={`flex-1 py-3 px-2 rounded-t-2xl font-display text-xs transition-all flex flex-col items-center gap-1 relative ${activeTab === 'themes' ? 'bg-[#0a0a0a] border border-white/5 text-game-primary z-20' : 'bg-[#0a0a0a]/50 text-game-offwhite/40 hover:bg-[#0a0a0a]/80 hover:text-game-offwhite z-10 translate-y-1'}`}
          >
            {/* @ts-ignore - react-icons typings issue */}
            <TbCardsFilled className="w-4 h-4" />
            {t('profile_tab_themes')}
            {activeTab === 'themes' && <div className="absolute -bottom-[2px] left-0 right-0 h-[3px] bg-[#0a0a0a] border border-white/5 z-30" />}
          </button>
          
          <button 
            id="btn-tab-gift"
            onClick={() => setActiveTab('gift')}
            className={`flex-1 py-3 px-2 rounded-t-2xl font-display text-xs transition-all flex flex-col items-center gap-1 relative ${activeTab === 'gift' ? 'bg-[#0a0a0a] border border-white/5 text-game-primary z-20' : 'bg-[#0a0a0a]/50 text-game-offwhite/40 hover:bg-[#0a0a0a]/80 hover:text-game-offwhite z-10 translate-y-1'}`}
          >
            <Gift className="w-4 h-4" />
            {t('profile_tab_gift')}
            {activeTab === 'gift' && <div className="absolute -bottom-[2px] left-0 right-0 h-[3px] bg-[#0a0a0a] border border-white/5 z-30" />}
          </button>
        </div>

        {/* CONTENT AREA (Scrolling Inside Frame) */}
        <div className="flex-1 flex flex-col bg-[#0a0a0a] border border-white/5 rounded-3xl shadow-2xl overflow-hidden relative z-0">
          <div className="flex-1 overflow-y-auto smooth-scroll px-5 py-6">
            <div className="min-h-full pb-10">
              {activeTab === 'profile' && (
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-game-dark/95 to-game-dark/80 p-5 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-center gap-4 relative shadow-md overflow-hidden">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-2xl bg-game-bg border-[3px] border-white/5 flex items-center justify-center overflow-hidden shadow-inner rotate-3">
                      <User className="w-10 h-10 text-game-offwhite/10" />
                    </div>
                    <div className="absolute -bottom-2 -left-2 bg-game-primary text-game-dark w-7 h-7 rounded-xl flex items-center justify-center text-sm font-black border-2 border-game-dark shadow-xl font-mono -rotate-6">
                      {level}
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col items-center sm:items-start text-center sm:text-right gap-3 w-full">
                    <div className="flex items-center gap-2">
                       <h2 className="text-2xl font-display text-game-offwhite">{playerName}</h2>
                       <button 
                         onClick={onEditName}
                         className="p-1.5 text-game-offwhite/40 hover:text-game-offwhite transition-all bg-white/5 rounded-lg border border-white/10 shadow-sm"
                         title={t('profile_save_changes')}
                       >
                         <Edit2 className="w-3.5 h-3.5" />
                       </button>
                       {onRefresh && (
                         <button 
                           onClick={handleRefresh}
                           disabled={isRefreshing}
                           className="p-1.5 ml-auto text-game-primary/50 hover:text-game-primary transition-all bg-white/5 rounded-lg border border-game-primary/10 shadow-sm"
                           title="تحديث البيانات من السيرفر"
                         >
                           <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin opacity-50' : ''}`} />
                         </button>
                       )}
                    </div>
                    
                    <XPBar xp={xp} level={level} />

                    <div className="flex items-center gap-4 bg-black/40 px-5 py-2 rounded-xl border border-white/5 shadow-inner w-full justify-between sm:justify-start">
                      <div className="flex items-center gap-2">
                        <Diamond className="w-5 h-5 text-game-primary" />
                        <div className="flex flex-col items-start leading-none">
                          <span className="text-xl font-black text-game-primary font-display">{coins}</span>
                          <span className="text-[9px] text-game-offwhite/40 font-display uppercase tracking-widest">{t('profile_coins_label')}</span>
                        </div>
                      </div>
                      <div className="w-px h-8 bg-white/10" />
                      <div className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-game-primary rotate-90" />
                        <div className="flex flex-col items-start leading-none">
                          <span className="text-xl font-black text-game-primary font-display">{competitionPoints}</span>
                          <span className="text-[9px] text-game-offwhite/40 font-display uppercase tracking-widest">{t('profile_points_label')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-game-dark/40 p-4 rounded-2xl border border-white/5 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Info className="w-3.5 h-3.5 text-game-primary/50" />
                    <h3 className="text-[10px] font-display text-game-offwhite/40 uppercase tracking-widest">{t('profile_stats_title')}</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-black/30 p-2 rounded-xl border border-white/5 text-center flex flex-col justify-center">
                      <div className="text-lg font-black text-game-primary font-display">{userRank ? `#${userRank}` : '--'}</div>
                      <div className="text-[8px] text-game-offwhite/50 uppercase tracking-tighter mt-0.5">{t('profile_rank_label')}</div>
                    </div>
                    <div className="bg-black/30 p-2 rounded-xl border border-white/5 text-center flex flex-col justify-center">
                      <div className="text-lg font-black text-game-offwhite font-display">--</div>
                      <div className="text-[8px] text-game-offwhite/30 uppercase tracking-tighter mt-0.5">{t('profile_matches_label')}</div>
                    </div>
                    <div className="bg-black/30 p-2 rounded-xl border border-white/5 text-center flex flex-col justify-center">
                      <div className="text-lg font-black text-game-offwhite font-display">--</div>
                      <div className="text-[8px] text-game-offwhite/30 uppercase tracking-tighter mt-0.5">{t('profile_wins_label')}</div>
                    </div>
                  </div>
                </div>

                {userId ? (
                  <button onClick={onLogoutClick} className="w-full py-4 mt-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-2xl font-display text-lg transition-all active:scale-95 flex items-center justify-center gap-2">
                    <LogOut className="w-5 h-5" /> {t('profile_logout_btn')}
                  </button>
                ) : (
                  <button onClick={onLoginClick} className="w-full py-4 mt-2 bg-game-primary text-game-dark rounded-2xl font-display text-lg transition-all active:scale-95 shadow-lg shadow-game-primary/20 flex items-center justify-center gap-2">
                    <LogIn className="w-5 h-5" /> {t('profile_login_btn')}
                  </button>
                )}

              </div>
            )}

            {activeTab === 'themes' && (
              <div className="space-y-6">
                {/* THEME SELECTION GRID */}
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center border border-white/10">
                     {/* @ts-ignore */}
                     <TbCardsFilled className="w-4 h-4 text-game-offwhite/70" />
                   </div>
                   <div className="flex-1 border-b border-white/5"></div>
                   <h3 className="text-game-offwhite font-display text-xs">
                     {t('themes_owned_title')}
                   </h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-10 gap-x-4">
                  {THEMES.filter(theme => ownedThemes.includes(theme.id)).map(theme => {
                    const isGlobalSelected = selectedThemeId === theme.id;

                    return (
                      <CardPack 
                        key={theme.id}
                        theme={theme}
                        isOwned={true}
                        isSelected={isGlobalSelected}
                        userLevel={level}
                        onClick={() => {
                          setSelectedPack(theme);
                        }}
                        onSelect={() => {
                          onSelect(theme.id);
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'gift' && (
              <div 
                className="space-y-6 flex flex-col items-center justify-center py-6"
              >
                {!userId ? (
                  <>
                    <div className="w-32 h-32 bg-white/5 border border-white/10 rounded-full flex items-center justify-center border-2 border-white/5">
                      <Gift className="w-16 h-16 text-game-offwhite/20" />
                    </div>
                    <div className="text-center space-y-2">
                      <h2 className="text-2xl font-display text-game-offwhite/80">{t('gift_login_title')}</h2>
                      <p className="text-game-offwhite/50 font-body max-w-[250px] text-sm">{t('gift_login_subtitle')}</p>
                    </div>
                    {onLoginClick && (
                      <button 
                        onClick={onLoginClick}
                        className="mt-4 w-full py-4 bg-game-primary text-game-dark rounded-2xl font-display text-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                      >
                        <User className="w-5 h-5" />
                        {t('gift_login_btn')}
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <div className="w-32 h-32 bg-game-primary/20 rounded-full flex items-center justify-center border-2 border-game-primary/30">
                      <Gift className="w-16 h-16 text-game-primary" />
                    </div>

                    <div className="text-center space-y-2">
                      <h2 className="text-3xl font-display text-game-offwhite">{t('gift_title')}</h2>
                      <p className="text-game-offwhite/60 font-body max-w-[250px]">{t('gift_subtitle')}</p>
                    </div>

                    <div className="w-full bg-game-dark/40 p-6 rounded-3xl border border-white/5 space-y-6">
                      <div className="flex items-center justify-between">
                        <span className="text-game-offwhite/50 text-sm">{t('gift_status_now')}</span>
                        <span className="bg-game-primary/10 text-game-primary px-3 py-1 rounded-full text-xs font-display border border-game-primary/20">{t('gift_claimed')}</span>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="h-1.5 w-full bg-game-dark/50 rounded-full overflow-hidden">
                           <div className="h-full bg-game-primary w-full" />
                        </div>
                        <div className="flex justify-between text-[10px] text-game-offwhite/30 font-display uppercase tracking-widest">
                           <span>{t('gift_come_back')}</span>
                           <span>{t('gift_hours')}</span>
                        </div>
                      </div>
                    </div>

                    <button 
                      disabled
                      className="w-full py-4 bg-game-primary opacity-50 text-white rounded-2xl font-display text-xl cursor-not-allowed"
                    >
                      {t('gift_claim_btn')}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      </div>

      {selectedPack && (
        <PackPreviewModal 
          selectedPack={selectedPack}
          ownedThemes={ownedThemes}
          selectedThemeId={selectedThemeId}
          onBuy={onBuy}
          onSelect={onSelect}
          onClose={() => setSelectedPack(null)}
        />
      )}
    </div>
  );
});
