import React, { useState, useEffect, useLayoutEffect, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, Globe, Home, Trophy, XCircle, CheckCircle2, Minus, Copy, Edit2, Bug, X, Wifi, ShieldCheck, Activity, ShoppingCart, User, LogIn, LogOut, Users, UserSearch, PlusCircle, Mail, Lock, UserPlus, Info, ArrowRight, ArrowLeft, ChevronRight, ChevronLeft, Network as NetworkIcon, PlugZap, Star, Zap, Sparkles } from 'lucide-react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Network } from '@capacitor/network';
import { App as CapApp } from '@capacitor/app';
import { registerPlugin, Capacitor, CapacitorHttp } from '@capacitor/core';
import config from './config.json';
import { useAuth } from './contexts/AuthContext';
import { useDebug, LogEntry } from './contexts/DebugContext';

// Standardized API Base URL logic
const getBaseApiUrl = () => {
  const sConfig = config.ONLINE_API_BASE_URL;
  const vApi = import.meta.env.VITE_API_URL;
  const vBack = import.meta.env.VITE_BACKEND_URL;
  
  if (sConfig) return sConfig;
  if (vApi) return vApi;
  if (vBack) return vBack.replace(/^ws(s)?:\/\//, 'http$1://').replace(/\/$/, '');
  return typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
};
const API_BASE_URL = getBaseApiUrl();

export interface LocalServerPlugin {
  startServer(options: { port: number }): Promise<{ status: string; port: number }>;
  connectToServer(options: { ip?: string; port?: number; url?: string; isOnline?: boolean }): Promise<void>;
  stopAll(): Promise<void>;
  sendMessage(options: { message: string }): Promise<void>;
  getStatus(): Promise<{ role: string; status: string; clientCount: number; localIp: string }>;
  getLocalIpAddress(): Promise<{ ip: string }>;
  addListener(eventName: 'onStatusUpdate', listenerFunc: (info: { role: string; status: string; clientCount: number; localIp: string }) => void): any;
  addListener(eventName: 'onMessageReceived', listenerFunc: (info: { clientId?: string; message: string }) => void): any;
  addListener(eventName: 'onLog', listenerFunc: (info: { message: string; type: string; timestamp: number }) => void): any;
}

export const LocalServer = registerPlugin<LocalServerPlugin>('LocalServer');

import { assetPreloader } from './lib/preloader';
import { THEMES, getTheme, getCardImagePath, getThemeBackIcon, ThemeConfig, CardType } from './themes';
import { LanAndroidService } from './services/Lan_Android';
import { OnlineAndroidService } from './services/Online_Android';

// Removed local LogEntry interface

interface Deck {
  rock: number;
  paper: number;
  scissors: number;
}
interface Player {
  id: string;
  name: string;
  themeId: string;
  deck: Deck;
  score: number;
  choice: CardType | null;
  readyForNext: boolean;
  hasChosen?: boolean;
}

interface Room {
  id: string;
  isBotRoom?: boolean;
  players: Record<string, Player>;
  gameState: 'waiting' | 'playing' | 'revealing' | 'roundResult' | 'gameOver';
  round: number;
  roundWinner: string | 'draw' | null;
  timeLeft?: number;
}

const CARD_NAMES: Record<CardType, string> = {
  rock: 'حجر',
  paper: 'ورقة',
  scissors: 'مقص'
};

// Removed hardcoded LAN_PORT, now using config.LAN_PORT
const OFFLINE_BOT_ID = 'OFFLINE_BOT';
const INITIAL_DECK: Deck = { rock: 3, paper: 3, scissors: 3 };

// Removed local LogEntry interface

const FloatingCard = memo(({ theme, type, idx }: { theme: ThemeConfig, type: CardType, idx: number }) => {
  const [isVisible, setIsVisible] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      setIsVisible(entries[0].isIntersecting);
    }, { threshold: 0.1 });

    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div 
      ref={cardRef}
      className={`w-20 sm:w-36 aspect-[3/4] rounded-2xl shadow-xl flex items-center justify-center p-2 sm:p-3 ${theme.frontColor} border-2 border-white/20 relative animate-gentle-float ${!isVisible ? 'paused' : ''}`}
      style={{ 
        animationDelay: `${idx * 0.5}s`
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-30" />
      <img 
        src={getCardImagePath(theme, type)} 
        alt={type} 
        className="w-full h-full object-contain relative z-10 drop-shadow-lg" 
        style={{ transform: `scale(${(theme.iconScale || 100) / 100})` }}
        referrerPolicy="no-referrer" 
      />
    </div>
  );
});

const GameTimer = memo(({ timeLeft }: { timeLeft?: number }) => {
  if (timeLeft === undefined) return null;
  return (
    <div className="flex flex-col items-center">
      <div className={`text-4xl font-mono font-bold ${timeLeft <= 5 ? 'text-game-red animate-pulse' : 'text-game-offwhite'}`}>
        {timeLeft}
      </div>
    </div>
  );
});

const CardPack = memo(({ theme, isOwned, isSelected, onClick, onSelect, userLevel = 1 }: { 
  theme: ThemeConfig, 
  isOwned: boolean, 
  isSelected: boolean, 
  onClick: () => void,
  onSelect: () => void,
  userLevel?: number
}) => {
  const isLocked = !isOwned && (theme.requiredLevel || 1) > userLevel;

  return (
    <div 
      onClick={isLocked ? undefined : onClick}
      className={`relative flex flex-col items-center transition-all ${isLocked ? 'grayscale opacity-60' : 'cursor-pointer hover:scale-105'}`}
    >
      <div className="relative w-24 sm:w-32 aspect-[3/4] mb-4">
        <div className={`absolute inset-0 rounded-xl shadow-sm transform -rotate-3 translate-x-[-4%] translate-y-[2%] opacity-20 ${theme.frontColor} border border-white/5`} />
        <div className={`absolute inset-0 rounded-xl shadow-md flex flex-col items-center justify-center p-2 ${theme.frontColor} border-2 ${isSelected ? 'border-game-slate ring-2 ring-game-slate/20' : 'border-white/20'} z-10 overflow-hidden`}>
          {isLocked ? (
            <div className="flex flex-col items-center gap-2">
              <Lock className="w-8 h-8 text-white/40 mb-1" />
              <div className="bg-black/40 px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase tracking-tighter font-mono">
                Lvl {theme.requiredLevel}
              </div>
            </div>
          ) : (
            <img 
              src={getCardImagePath(theme, 'rock')} 
              alt="rock" 
              className="w-full h-full object-contain" 
              style={{ transform: `scale(${(theme.iconScale || 100) / 100})` }}
              referrerPolicy="no-referrer" 
            />
          )}
          {isOwned && (
            <div 
              onClick={(e) => { e.stopPropagation(); onSelect(); }}
              className={`absolute top-2 right-2 p-1 rounded-full shadow-sm z-20 transition-all duration-100 ${
              isSelected 
                ? 'bg-game-slate text-white ring-1 ring-white/30 scale-105' 
                : 'bg-slate-900/80 text-white hover:bg-slate-700 hover:scale-110 border border-white/10'
            }`}>
              <ShieldCheck className={`w-4 h-4 ${isSelected ? 'fill-white/10' : ''}`} />
            </div>
          )}
        </div>
      </div>
      <div className="text-center">
        <h3 className="text-lg font-display text-game-offwhite leading-tight">{theme.name}</h3>
        {isLocked ? (
          <p className="text-red-400 font-display text-[10px] sm:text-xs">يتطلب مستوى {theme.requiredLevel}</p>
        ) : !isOwned ? (
          theme.id === 'robot' ? (
            <p className="text-game-teal font-display text-[10px] sm:text-xs">فز على الروبوت لفتحه</p>
          ) : (
            <p className="text-yellow-500 font-display text-sm">{theme.price} 🪙</p>
          )
        ) : (
          <p className={`text-xs font-display ${isSelected ? 'text-game-teal' : 'text-game-offwhite/40'}`}>
            {isSelected ? 'مفعل حالياً' : 'مملوك'}
          </p>
        )}
      </div>
    </div>
  );
});

const PackPreviewModal = memo(({ selectedPack, ownedThemes, selectedThemeId, onBuy, onSelect, onClose }: {
  selectedPack: ThemeConfig | null,
  ownedThemes: string[],
  selectedThemeId: string,
  onBuy: (theme: ThemeConfig) => void,
  onSelect: (id: string) => void,
  onClose: () => void
}) => {
  if (!selectedPack) return null;
  return (
    <div 
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-game-dark/40 backdrop-blur-3xl p-6 sm:p-8 rounded-2xl shadow-2xl relative border border-white/10"
        onClick={e => e.stopPropagation()}
      >
              <div className="relative z-10 flex flex-col items-center">
          <h2 className="text-2xl font-display text-game-offwhite mb-1">{selectedPack.name}</h2>
          <p className="text-game-offwhite/60 font-display mb-8 text-sm">مجموعة البطاقات الكاملة</p>
          <div className="flex justify-center items-center gap-4 sm:gap-6 mb-10 w-full px-2">
            {['scissors', 'paper', 'rock'].map((type, idx) => (
              <FloatingCard key={type} theme={selectedPack} type={type as CardType} idx={idx} />
            ))}
          </div>
          <div className="flex flex-col gap-3 w-full">
            {ownedThemes.includes(selectedPack.id) ? (
              <button 
                onClick={() => onSelect(selectedPack.id)}
                disabled={selectedThemeId === selectedPack.id}
                className={`w-full py-3.5 rounded-xl font-display text-xl transition-all outline-none backdrop-blur-sm transform-gpu ${
                  selectedThemeId === selectedPack.id 
                  ? 'bg-game-teal/20 text-game-teal cursor-default border border-game-teal/30' 
                  : 'bg-game-teal hover:bg-emerald-400 text-game-dark active:scale-95'
                }`}
              >
                {selectedThemeId === selectedPack.id ? 'مفعل حالياً' : 'تفعيل الثيم'}
              </button>
            ) : selectedPack.id === 'robot' ? (
              <div className="w-full py-3.5 bg-game-slate/20 text-game-teal rounded-xl font-display text-lg border border-game-teal/30 flex items-center justify-center text-center">
                فتح عبر الفوز على الروبوت
              </div>
            ) : (
              <button 
                onClick={() => onBuy(selectedPack)}
                className="w-full py-3.5 bg-white/15 backdrop-blur-md border border-white/20 hover:bg-white/20 text-white rounded-xl font-display text-xl transition-all active:scale-95 flex items-center justify-center gap-3 outline-none transform-gpu"
              >
                شراء المجموعة <span className="text-yellow-400">{selectedPack.price} 🪙</span>
              </button>
            )}
            <button 
              onClick={onClose} 
              className="w-full py-3.5 bg-white/5 hover:bg-white/10 text-game-offwhite rounded-xl font-display text-xl transition-all"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});


const GlobalNavbar = memo(({ activeTab, setAppState, coins, playerName, isGuest, onLogout, onLoginClick, menuTab = 'main', setMenuTab }: any) => {
  return (
    <nav 
      dir="rtl" 
      className="fixed top-0 inset-x-0 z-[60] bg-game-dark/95 border-b border-white/10 shadow-lg" 
      style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))' }}
    >
      <div className="relative w-full h-12">
        {/* --- STORE NAVBAR --- */}
        <div className={`absolute inset-0 flex justify-between items-center px-6 sm:px-8 transition-opacity duration-300 ${activeTab === 'store' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
          <button onClick={() => setAppState('menu')} className="p-1.5 bg-white/5 backdrop-blur-sm rounded-full text-game-cream hover:bg-white/10 border border-white/10 transition-all transform-gpu">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg sm:text-xl font-display text-game-offwhite tracking-wider">متجر الثيمات</h1>
          <div className="flex items-center gap-1.5 bg-white/5 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 shadow-inner">
            <span className="text-sm sm:text-base font-display text-game-offwhite font-medium">{coins}</span>
            <span className="text-yellow-500 text-xs">🪙</span>
          </div>
        </div>

        {/* --- MENU NAVBAR --- */}
        <div className={`absolute inset-0 flex justify-between items-center px-6 sm:px-8 transition-opacity duration-300 ${activeTab === 'menu' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
          {menuTab === 'main' ? (
            <>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setAppState('profile')}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  <div className="w-8 h-8 rounded-full bg-game-teal/20 border border-game-teal/30 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-game-teal" />
                  </div>
                  <div className="text-right flex flex-col">
                    <div className="text-sm sm:text-base font-display text-game-offwhite leading-none">{playerName}</div>
                  </div>
                </button>
              </div>
              <div>
                <button 
                  onClick={() => setAppState('store')}
                  className="flex items-center gap-1 bg-white/5 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/10 hover:bg-white/10 transition-all group transform-gpu"
                >
                  <span className="text-sm sm:text-base font-display text-yellow-500 font-medium group-hover:scale-105 transition-transform">{coins}</span>
                  <span className="text-xs">🪙</span>
                  <PlusCircle className="w-3 h-3 text-game-teal ml-0.5 group-hover:rotate-90 transition-transform" />
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="w-8" />
              <h1 className="text-lg font-display text-white tracking-widest uppercase">
                {menuTab === 'online' ? 'اللعب عبر الإنترنت' : 'الشبكة المحلية'}
              </h1>
              <div className="w-8" /> {/* Placeholder to balance header */}
            </>
          )}
        </div>

        {/* --- PROFILE NAVBAR --- */}
        <div className={`absolute inset-0 flex justify-between items-center px-6 sm:px-8 transition-opacity duration-300 ${activeTab === 'profile' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
          <button onClick={() => setAppState('menu')} className="p-1.5 bg-white/5 backdrop-blur-sm rounded-full text-game-cream hover:bg-white/10 border border-white/10 transition-all transform-gpu">
            <ChevronRight className="w-5 h-5" />
          </button>
          <h1 className="text-lg sm:text-xl font-display text-game-offwhite tracking-wider">الملف الشخصي</h1>
          {!isGuest ? (
            <button 
              onClick={onLogout}
              className="p-1.5 bg-red-900/50 rounded-full text-red-200 hover:bg-red-800 border border-red-500/20 transition-all shadow-inner"
              title="تسجيل الخروج"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button 
              onClick={onLoginClick}
              className="flex items-center gap-1 bg-game-teal text-game-dark px-2.5 py-1 rounded-lg font-display text-[10px] shadow-md hover:bg-emerald-400 transition-all"
              title="تسجيل الدخول"
            >
              <LogIn className="w-3.5 h-3.5" /> دخول
            </button>
          )}
        </div>
      </div>
    </nav>
  );
});

const StoreView = memo(({ coins, ownedThemes, selectedThemeId, onBuy, onSelect, selectedPack, setSelectedPack, userLevel = 1 }: {
  coins: number,
  ownedThemes: string[],
  selectedThemeId: string,
  onBack: () => void,
  onBuy: (theme: ThemeConfig) => void,
  onSelect: (id: string) => void,
  selectedPack: ThemeConfig | null,
  setSelectedPack: (theme: ThemeConfig | null) => void,
  userLevel?: number
}) => (
  <div 
    dir="rtl" 
    className="w-full h-full flex flex-col font-body overflow-x-hidden overflow-y-auto smooth-scroll select-none relative pb-10"
  >
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-y-10 gap-x-4 max-w-4xl mx-auto w-full px-4 sm:px-6 pt-28">
      {THEMES.map(theme => (
        <CardPack 
          key={theme.id}
          theme={theme}
          isOwned={ownedThemes.includes(theme.id)}
          isSelected={selectedThemeId === theme.id}
          userLevel={userLevel}
          onClick={() => setSelectedPack(theme)}
          onSelect={() => onSelect(theme.id)}
        />
      ))}
    </div>

      <div className={selectedPack ? 'block' : 'hidden'}>
        <PackPreviewModal 
          selectedPack={selectedPack} 
          ownedThemes={ownedThemes} 
          selectedThemeId={selectedThemeId} 
          onBuy={onBuy} 
          onSelect={onSelect} 
          onClose={() => setSelectedPack(null)} 
        />
      </div>
  </div>
));

const ProfileView = memo(({ playerName, coins, xp = 0, level = 1, ownedThemes, selectedThemeId, onSelect, onBuy, selectedPack, setSelectedPack, onEditName }: {
  playerName: string,
  coins: number,
  xp?: number,
  level?: number,
  ownedThemes: string[],
  selectedThemeId: string,
  onSelect: (id: string) => void,
  onBuy: (theme: ThemeConfig) => void,
  selectedPack: ThemeConfig | null,
  setSelectedPack: (theme: ThemeConfig | null) => void,
  onEditName: () => void,
}) => (
  <div 
    dir="rtl" 
    className="w-full h-full flex flex-col font-body overflow-x-hidden overflow-y-auto smooth-scroll select-none pb-10"
  >
    <div className="max-w-md mx-auto w-full space-y-6 px-4 sm:px-6 pt-28">
      <div className="bg-gradient-to-br from-game-dark/95 to-game-dark/80 p-6 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-center gap-4 relative shadow-2xl">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-game-bg border-4 border-game-offwhite/5 flex items-center justify-center overflow-hidden shadow-inner">
            <User className="w-10 h-10 text-game-offwhite/20" />
          </div>
          <div className="absolute -bottom-1 -right-1 bg-game-teal text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 border-game-dark shadow-md font-mono">
            {level}
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center sm:items-start text-center sm:text-right gap-3 w-full">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-display text-game-offwhite">{playerName}</h2>
            <button 
              onClick={onEditName}
              className="p-2 text-game-offwhite/40 hover:text-game-offwhite transition-all bg-white/5 rounded-lg border border-white/5"
              title="تعديل الاسم"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>
          
          <XPBar xp={xp} level={level} />

          <div className="flex items-center gap-2 bg-black/20 px-4 py-1.5 rounded-full border border-white/5">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <span className="text-xl font-display text-yellow-500">{coins}</span>
            <span className="text-sm text-game-offwhite/60 font-body">عملة ذهبية</span>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-display text-game-offwhite mb-6 border-b border-white/10 pb-2">مكتبة الثيمات</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-y-12 gap-x-6">
          {THEMES.filter(t => ownedThemes.includes(t.id)).map(theme => (
            <CardPack 
              key={theme.id}
              theme={theme}
              isOwned={true}
              isSelected={selectedThemeId === theme.id}
              userLevel={level}
              onClick={() => setSelectedPack(theme)}
              onSelect={() => onSelect(theme.id)}
            />
          ))}
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
));

const XPBar = memo(({ xp = 0, level = 1 }: { xp: number, level: number }) => {
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
          <div className="bg-game-teal/20 p-1 rounded-md">
            <Star className="w-3.5 h-3.5 text-game-teal fill-game-teal/20" />
          </div>
          <span className="text-[10px] text-game-offwhite/50 font-display uppercase tracking-widest">نقاط الخبرة</span>
        </div>
        <div className="text-[11px] font-mono text-game-teal font-bold">
          {Math.floor(progressInLevel)} <span className="text-game-offwhite/30">/</span> {totalInLevel}
        </div>
      </div>
      <div className="h-2.5 bg-game-dark/50 rounded-full overflow-hidden border border-white/5 p-[1px]">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-full bg-gradient-to-r from-game-teal to-cyan-400 rounded-full shadow-[0_0_10px_rgba(45,212,191,0.3)]"
        />
      </div>
    </div>
  );
});

const LevelUpModal = memo(({ level, onClose }: { level: number, onClose: () => void }) => {
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
        className="w-full max-w-sm bg-game-dark/90 rounded-3xl border border-game-teal/30 p-8 text-center relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-game-teal to-transparent" />
        
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute -top-24 -left-24 w-48 h-48 bg-game-teal/10 rounded-full blur-3xl"
        />

        <div className="relative z-10 space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <motion.div 
                animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-24 h-24 bg-game-teal rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(45,212,191,0.5)]"
              >
                <Sparkles className="w-12 h-12 text-white" />
              </motion.div>
              <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-game-dark font-bold px-3 py-1 rounded-full border-2 border-game-dark text-xl">
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
                  <div key={t.id} className="bg-game-teal/10 px-3 py-1 rounded-full border border-game-teal/20 text-game-teal text-sm font-bold">
                    {t.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button 
            onClick={onClose}
            className="w-full bg-game-teal text-white py-4 rounded-xl font-bold font-display shadow-lg hover:brightness-110 active:scale-95 transition-all text-xl"
          >
            استمرار
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
});

const LeaderboardView = memo(({ userId, onBack }: { userId: string | null, onBack: () => void }) => {
  const [data, setData] = useState<{ topPlayers: any[], userRank: number | null, userScore: any } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const url = `${API_BASE_URL}/api/leaderboard${userId ? `?userId=${userId}` : ''}`;
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error('Failed to fetch leaderboard:', err);
      } finally {
        setLoading(false);
      }
    };
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
          <h2 className="text-xl sm:text-2xl font-display text-white tracking-wider">لوحة الصدارة</h2>
        </div>
      </header>

      <div className="flex-1 w-full max-w-md mx-auto space-y-6 pt-28 pb-24 px-4 overflow-y-auto smooth-scroll">
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
              <div className="text-left">
                <p className={`font-display text-xl ${idx === 0 ? 'text-yellow-500' : 'text-game-teal'}`}>{player.xp || 0} XP</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  </div>
);
});

const DashboardViewPager = ({ appState, setAppState, onVisibleTabChange, children }: { appState: string, setAppState: (state: any) => void, onVisibleTabChange: (tab: string) => void, children: React.ReactNode }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollTimeout = useRef<number | null>(null);
  const uiTimeout = useRef<number | null>(null);
  const isProgrammaticScroll = useRef(false);
  const [isReady, setIsReady] = useState(false);

  // Immediate Initial Scroll to Menu (Index 1) on Mount
  useLayoutEffect(() => {
    const container = scrollRef.current;
    if (container && container.children[1]) {
      // Force immediate non-smooth jump to middle child
      container.children[1].scrollIntoView({ behavior: 'auto', inline: 'center', block: 'nearest' });
      // Short delay to ensure browser processed the scroll before showing
      setTimeout(() => setIsReady(true), 50);
    }
  }, []);

  // Sync React State -> Scroll Position (only if needed)
  useEffect(() => {
    if (!isReady) return; // Wait for initial mount scroll
    
    // If we're loading, default to the main menu (index 1) to avoid flash of store
    const idx = appState === 'store' ? 0 : (appState === 'menu' || appState === 'loading') ? 1 : 2;
    const container = scrollRef.current;
    if (!container || !container.children[idx]) return;

    const child = container.children[idx] as HTMLElement;
    const rect = child.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    const containerCenter = containerRect.left + containerRect.width / 2;
    const childCenter = rect.left + rect.width / 2;

    // Use a tolerance (e.g., 50px) to determine if it's already centered
    if (Math.abs(childCenter - containerCenter) > 20) {
      isProgrammaticScroll.current = true;
      child.scrollIntoView({ 
        behavior: 'smooth', 
        inline: 'center', 
        block: 'nearest' 
      });
      
      // Lock scroll tracking while the smooth scroll animation happens
      setTimeout(() => {
        isProgrammaticScroll.current = false;
      }, 1000); 
    }
  }, [appState, isReady]);

  // Sync Native Scroll Position -> React State (debounced)
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!isReady) return;
    // If the scroll was triggered by our own buttons, ignore it to prevent loops
    if (isProgrammaticScroll.current) return;

    if (uiTimeout.current) clearTimeout(uiTimeout.current);
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    
    const container = e.currentTarget;

    // Fast update for Navbar visually
    uiTimeout.current = window.setTimeout(() => {
      if (isProgrammaticScroll.current) return;
      let closestIdx = 1;
      let minDistance = Infinity;
      const containerRect = container.getBoundingClientRect();
      const containerCenter = containerRect.left + containerRect.width / 2;
      
      Array.from(container.children).forEach((child, idx) => {
        const rect = (child as HTMLElement).getBoundingClientRect();
        const childCenter = rect.left + rect.width / 2;
        const distance = Math.abs(childCenter - containerCenter);
        if (distance < minDistance) {
          minDistance = distance;
          closestIdx = idx;
        }
      });

      const visibleTab = closestIdx === 0 ? 'store' : closestIdx === 1 ? 'menu' : 'profile';
      onVisibleTabChange(visibleTab);
    }, 10);

    // Deep debounce for AppState programmatic logic
    scrollTimeout.current = window.setTimeout(() => {
      if (isProgrammaticScroll.current) return;

      let closestIdx = 1;
      let minDistance = Infinity;
      const containerRect = container.getBoundingClientRect();
      const containerCenter = containerRect.left + containerRect.width / 2;
      
      Array.from(container.children).forEach((child, idx) => {
        const rect = (child as HTMLElement).getBoundingClientRect();
        const childCenter = rect.left + rect.width / 2;
        const distance = Math.abs(childCenter - containerCenter);
        if (distance < minDistance) {
          minDistance = distance;
          closestIdx = idx;
        }
      });

      const newState = closestIdx === 0 ? 'store' : closestIdx === 1 ? 'menu' : 'profile';
      if (newState !== appState) {
        setAppState(newState);
      }
    }, 700);
  };

  return (
    <div 
      ref={scrollRef}
      onScroll={handleScroll}
      className={`fixed inset-0 w-full h-full flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] z-0 wood-texture text-game-cream font-body smooth-scroll`}
      dir="rtl"
    >
      {React.Children.toArray(children).map((child, idx) => (
        <div key={idx} className="w-full h-full shrink-0 snap-center relative overflow-hidden">
          {child}
        </div>
      ))}
    </div>
  );
};

const App = () => {
  const { user, login, register, verifyCode, resendCode, logout, updateProfile, refreshProfile, loading: authLoading, error: authError, pendingVerificationEmail, setPendingVerificationEmail } = useAuth();
  const [appState, setAppState] = useState<'loading' | 'auth' | 'menu' | 'store' | 'profile' | 'matchmaking' | 'game' | 'gameOver' | 'inRoom' | 'verifySent' | 'leaderboard'>('loading');
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [menuTab, setMenuTab] = useState<'main' | 'online' | 'local'>('main');

  useEffect(() => {
    const totalAssets = THEMES.length * 3;
    assetPreloader.setTotal(totalAssets);
    assetPreloader.setOnProgress((progress) => {
      if (progress >= 1) setAssetsLoaded(true);
    });

    // Proactively preload all theme images into native browser cache
    THEMES.forEach(theme => {
      ['rock', 'paper', 'scissors'].forEach(type => {
        const ext = theme.extension || 'svg';
        assetPreloader.preloadImage(`${theme.path}/${type}.${ext}`);
      });
    });
  }, []);

  const [editNameInput, setEditNameInput] = useState('');
  const [showEditNameDialog, setShowEditNameDialog] = useState(false);
  const [visibleTab, setVisibleTab] = useState<'store'|'menu'|'profile'>('menu');
  const [showLevelUp, setShowLevelUp] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [isBotLoading, setIsBotLoading] = useState(false);

  // Network Status Listener
  useEffect(() => {
    Network.getStatus().then(status => setIsOnline(status.connected));
    const handlePromise = Network.addListener('networkStatusChange', status => {
      setIsOnline(status.connected);
      addLog(`حالة الشبكة: ${status.connected ? 'متصل' : 'منقطع'}`, status.connected ? 'success' : 'error');
    });
    return () => {
      handlePromise.then(h => h.remove());
    };
  }, []);

  // Player Local State (Syncs with User Profile if logged in)

  // Fast-sync visible tab when programmatic state changes
  useEffect(() => {
    if (appState === 'menu' || appState === 'store' || appState === 'profile') {
      setVisibleTab(appState);
    }
  }, [appState]);
  const [playerName, setPlayerNameState] = useState(() => localStorage.getItem('cardclash_guestName') || 'محارب');
  const [playerId, setPlayerId] = useState(() => {
    const stored = localStorage.getItem('cardclash_playerId');
    if (stored) return stored;
    const newId = Math.random().toString(36).substring(2, 12);
    localStorage.setItem('cardclash_playerId', newId);
    return newId;
  });
  const [selectedThemeId, setSelectedThemeIdState] = useState(() => localStorage.getItem('cardclash_selectedThemeId') || 'normal');
  const [ownedThemes, setOwnedThemesState] = useState<string[]>(() => {
    const stored = localStorage.getItem('cardclash_ownedThemes');
    return stored ? JSON.parse(stored) : ['normal'];
  });
  const [coins, setCoinsState] = useState(() => {
    const stored = localStorage.getItem('cardclash_coins');
    return stored ? parseInt(stored, 10) : 100;
  });
  const [xp, setXpState] = useState(() => {
    const stored = localStorage.getItem('cardclash_xp');
    return stored ? parseInt(stored, 10) : 0;
  });
  const [level, setLevelState] = useState(() => {
    const stored = localStorage.getItem('cardclash_level');
    return stored ? parseInt(stored, 10) : 1;
  });

  // Local state persistence
  useEffect(() => {
    localStorage.setItem('cardclash_guestName', playerName);
    localStorage.setItem('cardclash_selectedThemeId', selectedThemeId);
    localStorage.setItem('cardclash_ownedThemes', JSON.stringify(ownedThemes));
    localStorage.setItem('cardclash_coins', coins.toString());
    localStorage.setItem('cardclash_xp', xp.toString());
    localStorage.setItem('cardclash_level', level.toString());
  }, [playerName, selectedThemeId, ownedThemes, coins, xp, level]);

  // Sync state with auth user (Initial load only)
  const isProfileInitialized = useRef(false);
  const lastSyncPayload = useRef<string | null>(null);

  useEffect(() => {
    if (user && !authLoading && !isProfileInitialized.current) {
      setPlayerNameState(user.displayName);
      setPlayerId(user._id);
      setCoinsState(user.coins);
      setXpState(user.xp || 0);
      setLevelState(user.level || 1);
      setOwnedThemesState(user.purchasedThemes);
      setSelectedThemeIdState(user.equippedTheme);
      isProfileInitialized.current = true;

      if (appState === 'loading' || appState === 'auth') {
        setAppState('menu');
      }
    } else if (!user && !authLoading) {
      isProfileInitialized.current = false;
      if (appState === 'loading') {
        const hasSeenAuth = localStorage.getItem('cardclash_hasSeenAuth');
        if (hasSeenAuth) {
          setAppState('menu');
        } else {
          setAppState('auth');
          localStorage.setItem('cardclash_hasSeenAuth', 'true');
        }
      }
    }
  }, [user, authLoading]);

  // Background Sync Effect: Whenever we are online and local state differs from user profile, push updates
  useEffect(() => {
    if (user && isOnline && !authLoading) {
      const needsNameSync = playerName !== user.displayName;
      const needsCoinsSync = coins !== user.coins;
      
      // Comparison logic for themes
      const localThemes = [...ownedThemes].sort();
      const serverThemes = [...(user.purchasedThemes || [])].sort();
      const needsThemesSync = JSON.stringify(localThemes) !== JSON.stringify(serverThemes);
      
      // Equipped theme sync check (backend now supports equippedTheme)
      const needsEquippedSync = selectedThemeId !== user.equippedTheme;

      if (needsNameSync || needsCoinsSync || needsThemesSync || needsEquippedSync) {
        const payload = { 
          displayName: playerName,
          coins, 
          purchasedThemes: ownedThemes, 
          equippedTheme: selectedThemeId 
        };
        const payloadStr = JSON.stringify(payload);

        // Prevent identical parallel/chained requests resulting from React re-renders mid-API call
        if (lastSyncPayload.current !== payloadStr) {
          console.log('Background Sync: Pushing local updates to server...', { needsNameSync, needsCoinsSync, needsThemesSync, needsEquippedSync });
          
          const timeout = setTimeout(() => {
            lastSyncPayload.current = payloadStr;
            updateProfile(payload);
          }, 500);
          return () => clearTimeout(timeout);
        }
      } else {
        // Unlock if perfectly synchronized
        lastSyncPayload.current = null;
      }
    }
  }, [isOnline, playerName, coins, ownedThemes, selectedThemeId, user, authLoading, updateProfile]);

  // Auto-redirect to verification if pending
  useEffect(() => {
    if (pendingVerificationEmail) {
      setAppState('verifySent');
    }
  }, [pendingVerificationEmail]);

  // Auth View Local State
  const [authEmail, setAuthEmail] = useState('');
  const [authPass, setAuthPass] = useState('');
  const [authName, setAuthName] = useState('');
  const [authVerifyCode, setAuthVerifyCode] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthSubmitting(true);
    setErrorMsg(null);
    try {
      await login(authEmail, authPass);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthSubmitting(true);
    setErrorMsg(null);
    try {
      await register(authEmail, authPass, authName);
      setAppState('verifySent');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthSubmitting(true);
    setErrorMsg(null);
    try {
      await verifyCode(pendingVerificationEmail || authEmail, authVerifyCode);
      setAuthSuccessMsg('تم تأكيد الحساب بنجاح! يمكنك الآن تسجيل الدخول.');
      setAuthTab('login');
      setAppState('auth');
      setPendingVerificationEmail(null);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    setIsResending(true);
    setErrorMsg(null);
    try {
      const message = await resendCode(pendingVerificationEmail || authEmail);
      setAuthSuccessMsg(message);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsResending(false);
    }
  };

  const setPlayerName = (name: string) => {
    setPlayerNameState(name);
  };
  const setSelectedThemeId = (id: string) => {
    setSelectedThemeIdState(id);
  };
  const setOwnedThemes = (themes: string[]) => {
    setOwnedThemesState(themes);
  };
  const setCoins = (newCoins: number | ((prev: number) => number)) => {
    setCoinsState(newCoins);
  };

  const [ipInput, setIpInput] = useState('');
  const [roomIdInput, setRoomIdInput] = useState('');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomState, setRoomState] = useState<Room | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [userIp, setUserIp] = useState<string>('جاري التحميل...');
  const [isSearching, setIsSearching] = useState(false);
  
  // Native Networking State
  const [connectionStatus, setConnectionStatus] = useState<'DISCONNECTED' | 'CONNECTING' | 'SERVER_STARTED' | 'CONNECTION_VERIFIED'>('DISCONNECTED');
  const [role, setRole] = useState<'HOST' | 'CLIENT' | 'NONE' | 'ONLINE'>('NONE');
  const [clientCount, setClientCount] = useState(0);
  
  const { addLog, logs, clearLogs } = useDebug();
  const [showDebug, setShowDebug] = useState(false);
  const [isPreloaded, setIsPreloaded] = useState(true);
  const [isRevealingLocal, setIsRevealingLocal] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [selectedPack, setSelectedPack] = useState<ThemeConfig | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const backPressTimer = useRef<NodeJS.Timeout | null>(null);
  const [isDoubleBack, setIsDoubleBack] = useState(false);

  // Silent Preload Assets
  const preloadAssets = async () => {
    let assetsToLoad: string[] = [];
    
    // Collect all themes from the current THEMES array
    THEMES.forEach(theme => {
      assetsToLoad.push(
        `${theme.path}/rock.${theme.extension || 'svg'}`,
        `${theme.path}/paper.${theme.extension || 'svg'}`,
        `${theme.path}/scissors.${theme.extension || 'svg'}`
      );
      if (theme.backIcon && theme.backIcon !== 'default' && theme.backIcon.startsWith('/')) {
        assetsToLoad.push(theme.backIcon);
      }
    });
    
    const uniqueUrls = Array.from(new Set(assetsToLoad));
    assetPreloader.setTotal(uniqueUrls.length);
    
    // Execute all Base64 conversions in parallel in background
    Promise.all(uniqueUrls.map(url => assetPreloader.preloadImage(url))).then(() => {
      addLog('Silent preloading complete', 'success');
    });
  };

  useEffect(() => {
    preloadAssets();
  }, []);

  // Refs to avoid stale closures in listeners
  const roomIdRef = useRef<string | null>(null);
  const roomStateRef = useRef<Room | null>(null);
  const playerNameRef = useRef<string>('');
  const playerIdRef = useRef<string>('');
  const selectedThemeIdRef = useRef<string>('normal');
  const levelRef = useRef<number>(1);
  const appStateRef = useRef(appState);
  const roleRef = useRef(role);
  const onlineActionRef = useRef<any>(null);

  useEffect(() => {
    roomIdRef.current = roomId;
    roomStateRef.current = roomState;
    playerNameRef.current = playerName;
    playerIdRef.current = playerId;
    selectedThemeIdRef.current = selectedThemeId;
    levelRef.current = level;
    appStateRef.current = appState;
    roleRef.current = role;
  }, [roomId, roomState, playerName, selectedThemeId, appState, role]);

  useEffect(() => {
    if (roomState?.gameState === 'gameOver' && roomId) {
      const me = roomState.players.me || (Object.values(roomState.players) as Player[]).find(p => p.id === 'me' || p.name === playerName);
      const opponent = (Object.values(roomState.players) as Player[]).find(p => p.id !== (me ? me.id : ''));
      
      if (me && opponent) {
        if (me.score > opponent.score) {
          // Reward coins for winning
          // Bot = 25, Other (Local/Online) = 50
          const reward = roomId === OFFLINE_BOT_ID ? 25 : 50; 
          
          // Only award coins locally if it's NOT an online game with an account 
          // (Server handles coins for registered users in online rooms)
          if (role !== 'ONLINE' || !user) {
            setCoins(prev => prev + reward);
            addLog(`لقد فزت وربحت ${reward} 🪙 عملة!`, 'success');
          } else if (role === 'ONLINE' && user) {
            // For online logged-in users, the server pushes the coin update, 
            // but we can still show the message for feedback.
            // Server awards 15-50 depending on config, but client shows 50 for consistency in UI.
            addLog(`أداء رائع! ستربح عملات ذهبية لهذا الفوز 🪙`, 'success');
          }
          
          // Robot theme unlock logic
          if (roomId === OFFLINE_BOT_ID && !ownedThemes.includes('robot')) {
            setOwnedThemes([...ownedThemes, 'robot']);
            addLog('تهانينا! لقد فتحت ثيم الروبوت بالفوز على الكمبيوتر!', 'success');
          }
        } else if (me.score === opponent.score) {
          if (role !== 'ONLINE' || !user) {
            setCoins(prev => prev + 10);
            addLog('تعادل! حصلت على 10 🪙 عملات', 'info');
          }
        }
      }
    }
  }, [roomState?.gameState, roomId, role, user, ownedThemes]);

  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => {
        setErrorMsg(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  useEffect(() => {
    if (playerName && appState === 'nameEntry') {
      setAppState('menu');
    }
  }, []);

  // Handle Hardware Back Button on Mobile
  useEffect(() => {
    const handleBackButton = async () => {
      const listener = await CapApp.addListener('backButton', (data) => {
        // 1. Priority: Close Exit Confirmation
        if (showExitConfirm) {
          setShowExitConfirm(false);
          return;
        }

        // 2. Priority: Close UI Modals/Overlays
        if (selectedPack) {
          setSelectedPack(null);
          return;
        }
        if (showDebug) {
          setShowDebug(false);
          return;
        }

        // 3. Priority: Secondary Screens -> Menu
        const secondaryStates = ['store', 'profile', 'matchmaking', 'verifySent', 'gameOver'];
        if (secondaryStates.includes(appState)) {
          setAppState('menu');
          setMenuTab('main');
          return;
        }

        // 4. Priority: Game/Room -> Menu
        if (appState === 'game' || appState === 'inRoom') {
          setAppState('menu');
          setMenuTab('main');
          return;
        }

        // 5. Priority: Auth Tabs
        if (appState === 'auth' || appState === 'verifySent') {
          setAppState('menu');
          return;
        }

        // 6. Priority: Menu Navigation
        if (appState === 'menu') {
          if (menuTab !== 'main') {
            setMenuTab('main');
          } else {
            // Check for double press
            if (isDoubleBack) {
              CapApp.exitApp();
            } else {
              setIsDoubleBack(true);
              setShowExitConfirm(true);
              if (backPressTimer.current) clearTimeout(backPressTimer.current);
              backPressTimer.current = setTimeout(() => {
                setIsDoubleBack(false);
              }, 2000);
            }
          }
          return;
        }

        // Default or fallthrough
        if (!data.canGoBack) {
          setShowExitConfirm(true);
        }
      });
      return listener;
    };

    const listenerPromise = handleBackButton();
    return () => {
      listenerPromise.then(l => l.remove());
      if (backPressTimer.current) clearTimeout(backPressTimer.current);
    };
  }, [appState, selectedPack, showDebug, authTab, menuTab, showExitConfirm, isDoubleBack]);

  // Bot independent thinking logic
  useEffect(() => {
    if (roomState?.id === OFFLINE_BOT_ID && roomState.gameState === 'playing' && !roomState.players.bot.choice) {
      const thinkingTime = 600 + Math.random() * 1200; // Bot thinks for 0.6s - 1.8s
      const timer = setTimeout(() => {
        setRoomState(prev => {
          if (!prev || prev.id !== OFFLINE_BOT_ID || prev.gameState !== 'playing' || prev.players.bot.choice) return prev;
          
          const nextState = JSON.parse(JSON.stringify(prev));
          const bot = nextState.players.bot;
          const me = nextState.players.me;
          
          const availableBotCards = (Object.keys(bot.deck) as CardType[]).filter(t => bot.deck[t] > 0);
          if (availableBotCards.length === 0) return prev;
          
          const botChoice = availableBotCards[Math.floor(Math.random() * availableBotCards.length)];
          bot.choice = botChoice;
          bot.deck[botChoice] -= 1;
          
          // If player already chose, reveal immediately
          if (me.choice) {
            setTimeout(() => handleOfflineReveal(nextState), 0);
          }
          
          return nextState;
        });
      }, thinkingTime);
      return () => clearTimeout(timer);
    }
  }, [roomState?.gameState, roomState?.round, roomState?.id]);

  // Native Bridge Setup
  useEffect(() => {
    let statusListener: any;
    let logListener: any;
    let messageListener: any;

    const setupListeners = async () => {
      if (!Capacitor.isNativePlatform()) {
        addLog('Native listeners skipped (Web Platform)', 'info');
        return;
      }

      try {
        statusListener = await LocalServer.addListener('onStatusUpdate', (info) => {
          setRole(info.role as any);
          setConnectionStatus(info.status as any);
          setClientCount(info.clientCount);
          if (info.localIp) setUserIp(info.localIp);
        });

        logListener = await LocalServer.addListener('onLog', (info) => {
          addLog(info.message, info.type as any);
        });

        messageListener = await LocalServer.addListener('onMessageReceived', (info) => {
          try {
            const data = JSON.parse(info.message);
            handleNativeMessage(data);
          } catch (e) {
            addLog(`Received non-JSON message: ${info.message}`, 'info');
          }
        });
      } catch (e) {
        addLog(`Failed to setup native listeners: ${e}`, 'error');
      }
    };

    setupListeners();

    return () => {
      if (statusListener && typeof statusListener.remove === 'function') statusListener.remove();
      if (logListener && typeof logListener.remove === 'function') logListener.remove();
      if (messageListener && typeof messageListener.remove === 'function') messageListener.remove();
    };
  }, []);

  useEffect(() => {
    if (roomState?.gameState === 'roundResult') {
      const timer = setTimeout(() => setIsRevealingLocal(true), 1000);
      return () => clearTimeout(timer);
    } else {
      setIsRevealingLocal(false);
    }
  }, [roomState?.gameState]);

  const handleNativeMessage = (data: any) => {
    if (data.type === 'ROOM_READY') {
      addLog('Room is ready, joining...', 'success');
      setAppState('inRoom');
      if (Capacitor.isNativePlatform()) {
        LocalServer.getStatus().then(status => {
          if (status.role === 'HOST') {
            sendNativeAction({ 
              type: 'host_join', 
              playerName: playerNameRef.current, 
              playerId: playerIdRef.current,
              themeId: selectedThemeIdRef.current 
            });
          } else if (status.role === 'CLIENT') {
            sendNativeAction({ 
              type: 'join_game', 
              playerName: playerNameRef.current, 
              playerId: playerIdRef.current,
              themeId: selectedThemeIdRef.current 
            });
          }
        }).catch(e => addLog(`Failed to get status: ${e}`, 'error'));
      }
    } else if (data.type === 'ONLINE_READY') {
      addLog('Online Handshake Natively Verified', 'success');
      setConnectionStatus('CONNECTION_VERIFIED');
      setRole('ONLINE');
      if (onlineActionRef.current) {
         sendNativeAction(onlineActionRef.current);
         onlineActionRef.current = null;
      }
    } else if (data.type === 'matchmaking_status' || data.type === 'match_found' || data.type === 'joined_room_success') {
      handleOnlineMessage(data);
    } else if (data.type === 'room_state') {
      setRoomState(data.state);
      setRoomId(data.state.id);
      setAppState('inRoom');
    } else if (data.type === 'room_created') {
      setRoomId(data.roomId);
      if (roleRef.current === 'ONLINE') setAppState('inRoom');
    } else if (data.type === 'error_msg') {
      setErrorMsg(data.msg);
      addLog(`Server Error: ${data.msg}`, 'error');
      setIsSearching(false);
    }
  };

  const sendNativeAction = async (action: any) => {
    try {
      if (Capacitor.isNativePlatform()) {
        await LocalServer.sendMessage({ message: JSON.stringify(action) });
      } else if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(action));
      } else {
        addLog(`Action skipped (no connection): ${action.type}`, 'info');
      }
    } catch (e) {
      addLog(`Failed to send action: ${e}`, 'error');
    }
  };

  useEffect(() => {
    const initCapacitor = async () => {
      if (!isPreloaded) return; // Wait for assets
      
      addLog('Initializing Capacitor...', 'info');
      try {
        if (Capacitor.isNativePlatform()) {
          await StatusBar.hide();
        }
        await SplashScreen.hide();
        addLog('Capacitor initialized successfully', 'success');
      } catch (e) {
        addLog(`Capacitor not available: ${e}`, 'error');
        console.warn('Capacitor not available:', e);
      }
    };
    initCapacitor();
  }, [isPreloaded]);

  useEffect(() => {
    if (appState === 'inRoom' && role === 'CLIENT' && connectionStatus === 'DISCONNECTED') {
      addLog('Leaving room because connection disconnected from host', 'info');
      setRoomId(null);
      setRoomState(null);
      setAppState('menu');
      setMenuTab('local');
      setRole('NONE');
    }
  }, [appState, role, connectionStatus]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (roomId === OFFLINE_BOT_ID && roomState?.gameState === 'playing') {
      timer = setInterval(() => {
        setRoomState(prev => {
          if (!prev || prev.gameState !== 'playing') return prev;
          if (prev.timeLeft && prev.timeLeft > 0) {
            return { ...prev, timeLeft: prev.timeLeft - 1 };
          } else {
            // Auto play for both if time runs out - use deep copy to avoid mutation
            const nextState = JSON.parse(JSON.stringify(prev));
            const me = nextState.players.me;
            if (!me.choice) {
              const availableCards = (Object.keys(me.deck) as CardType[]).filter(t => me.deck[t] > 0);
              if (availableCards.length > 0) {
                const randomChoice = availableCards[Math.floor(Math.random() * availableCards.length)];
                me.choice = randomChoice;
                me.deck[randomChoice] -= 1;
              }
            }
            
            const bot = nextState.players.bot;
            if (!bot.choice) {
              const availableBotCards = (Object.keys(bot.deck) as CardType[]).filter(t => bot.deck[t] > 0);
              if (availableBotCards.length > 0) {
                const botChoice = availableBotCards[Math.floor(Math.random() * availableBotCards.length)];
                bot.choice = botChoice;
                bot.deck[botChoice] -= 1;
              }
            }
            
            setTimeout(() => handleOfflineReveal(nextState), 0);
            return nextState;
          }
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [roomId, roomState?.gameState]);

  const fetchIp = async () => {
    addLog('Fetching IP address...', 'info');
    
    // 1. Check Network Status
    try {
      const status = await Network.getStatus();
      if (!status.connected) {
        addLog('Network not connected', 'error');
        setUserIp('لا يوجد اتصال بالإنترنت');
        return;
      }
    } catch (e) {
      addLog(`Network status check failed: ${e}`, 'error');
    }

    // 2. Try to get Local IP via Plugin (Android) - Highest Priority
    if (Capacitor.getPlatform() !== 'web') {
      try {
        addLog('Attempting to get Local IP via plugin...', 'info');
        const result = await LocalServer.getLocalIpAddress();
        if (result && result.ip && result.ip !== '0.0.0.0' && !result.ip.startsWith('127.')) {
          setUserIp(result.ip);
          addLog(`Local IP obtained via plugin: ${result.ip}`, 'success');
          return;
        }
      } catch (e) {
        addLog(`Plugin IP fetch failed: ${e}`, 'error');
      }
    }

    // 3. WebRTC Local IP Trick (Fallback for local)
    try {
      addLog('Attempting WebRTC local IP trick...', 'info');
      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel("");
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      const ipPromise = new Promise<string>((resolve) => {
        pc.onicecandidate = (ice) => {
          if (!ice || !ice.candidate || !ice.candidate.candidate) return;
          const ipMatch = /([0-9]{1,3}(\.[0-9]{1,3}){3})/.exec(ice.candidate.candidate);
          if (ipMatch) {
            pc.onicecandidate = null;
            resolve(ipMatch[1]);
          }
        };
        setTimeout(() => resolve(''), 2000);
      });

      const localIp = await ipPromise;
      if (localIp && localIp !== '0.0.0.0' && !localIp.startsWith('127.')) {
        setUserIp(localIp);
        addLog(`Local IP obtained via WebRTC: ${localIp}`, 'success');
        return;
      }
    } catch (e) {
      addLog(`WebRTC IP trick failed: ${e}`, 'error');
    }

    // 4. Last Resort: Public IP (Only if local fails)
    addLog('Falling back to public IP fetch...', 'info');
    try {
      let data: any;
      if (Capacitor.isNativePlatform()) {
        const response = await CapacitorHttp.request({
          url: 'https://api.ipify.org?format=json',
          method: 'GET'
        });
        data = response.data;
      } else {
        const response = await fetch('https://api.ipify.org?format=json');
        data = await response.json();
      }
      
      if (data.ip) {
        setUserIp(data.ip);
        addLog(`Public IP obtained: ${data.ip}`, 'info');
      }
    } catch (e) {
      setUserIp('تعذر جلب الـ IP');
      addLog('Failed to fetch any IP address', 'error');
    }
  };

  useEffect(() => {
    fetchIp();
  }, []);

  const hostGame = async () => {
    await LanAndroidService.hostGame(playerName, addLog, setErrorMsg);
  };

  const isValidIp = (ip: string) => LanAndroidService.isValidIp(ip);

  const handleIpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIpInput(LanAndroidService.handleIpChange(e.target.value));
  };

  const joinGame = async () => {
    await LanAndroidService.joinGame(ipInput, addLog, setErrorMsg);
  };

  const connectToOnline = (action?: any): Promise<WebSocket | void> => {
    return OnlineAndroidService.connectToOnline({
      action,
      ws,
      setWs,
      addLog,
      setErrorMsg,
      setConnectionStatus,
      setIsSearching,
      handleOnlineMessage,
      onlineActionRef,
      appStateRef,
      roleRef,
      setAppState,
      setRoomId,
      setRoomState,
      setRole
    });
  };

  const handleOnlineMessage = (data: any) => {
    OnlineAndroidService.handleOnlineMessage(data, {
      setIsSearching,
      setRole,
      setRoomId,
      setAppState,
      setRoomState,
      setErrorMsg,
      setShowLevelUp,
      refreshProfile,
      appStateRef
    });
  };

  const startQuickMatch = () => {
    if (!playerNameRef.current.trim()) return setErrorMsg('يرجى إدخال اسمك أولاً');
    setIsSearching(true);
    connectToOnline({ 
      type: 'quick_match', 
      playerName: playerNameRef.current.trim(), 
      playerId: playerIdRef.current,
      playerLevel: levelRef.current,
      themeId: selectedThemeIdRef.current 
    }).catch(() => {
      setIsSearching(false);
    });
  };

  const cancelSearch = () => {
    sendNativeAction({ type: 'cancel_matchmaking' });
    setIsSearching(false);
  };

  const createOnlineRoom = () => {
    if (!playerNameRef.current.trim()) return setErrorMsg('يرجى إدخال اسمك أولاً');
    setIsSearching(true);
    connectToOnline({ 
      type: 'create_room', 
      playerName: playerNameRef.current.trim(), 
      playerId: playerIdRef.current,
      themeId: selectedThemeIdRef.current 
    }).catch(() => {
      setIsSearching(false);
    });
  };

  const joinOnlineRoom = () => {
    if (!roomIdInput.trim()) return setErrorMsg('يرجى إدخال رمز الغرفة');
    if (!playerNameRef.current.trim()) return setErrorMsg('يرجى إدخال اسمك أولاً');
    setIsSearching(true);
    connectToOnline({ 
      type: 'join_room_by_code', 
      roomCode: roomIdInput.trim(), 
      playerName: playerNameRef.current.trim(), 
      playerId: playerIdRef.current,
      themeId: selectedThemeIdRef.current 
    }).catch(() => {
      setIsSearching(false);
    });
  };

  const createBotRoom = () => {
    setIsBotLoading(true);
    // Add a tiny delay so the UI can render the spinner before blocking the main thread
    setTimeout(() => {
      const newRoom: Room = {
        id: OFFLINE_BOT_ID,
        isBotRoom: true,
        players: {
          me: { id: 'me', name: playerName.trim() || 'لاعب', themeId: selectedThemeId, deck: { ...INITIAL_DECK }, score: 0, choice: null, readyForNext: false },
          bot: { id: 'bot', name: 'الكمبيوتر', themeId: 'robot', deck: { ...INITIAL_DECK }, score: 0, choice: null, readyForNext: true }
        },
        gameState: 'playing',
        round: 1,
        roundWinner: null,
        timeLeft: 15
      };
      setRoomState(newRoom);
      setRoomId(OFFLINE_BOT_ID);
      setAppState('inRoom');
      addLog('Started offline game against bot', 'success');
      setIsBotLoading(false);
    }, 150);
  };

  const copyRoomId = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      setErrorMsg('تم نسخ كود الغرفة!');
      setTimeout(() => setErrorMsg(null), 2000);
    }
  };

  const playCard = (choice: CardType) => {
    if (!roomState || roomState.gameState !== 'playing' || !roomId) return;
    
    if (roomId === OFFLINE_BOT_ID) {
      setRoomState(prevState => {
        if (!prevState || prevState.gameState !== 'playing') return prevState;
        const nextState = JSON.parse(JSON.stringify(prevState));
        const me = nextState.players.me;
        const bot = nextState.players.bot;
        
        if (me.choice || me.deck[choice] <= 0) return prevState;
        
        me.choice = choice;
        me.deck[choice] -= 1;
        
        // If bot already chose, reveal immediately
        if (bot.choice) {
          setTimeout(() => handleOfflineReveal(nextState), 0);
        }
        
        return nextState;
      });
    } else {
      // Optimistic update for LAN
      const newState = { ...roomState };
      const me = newState.players[myId];
      if (me && !me.choice && me.deck[choice] > 0) {
        me.choice = choice;
        me.deck[choice] -= 1;
        setRoomState(newState);
      }
      sendNativeAction({ type: 'play_card', roomId, choice });
    }
  };

  const handleOfflineReveal = (state: Room) => {
    if (!state || state.gameState !== 'playing') return;

    // Wait for cards to land first (flight animation is ~0.6s)
    setTimeout(() => {
      setRoomState(prev => {
        if (!prev || prev.gameState !== 'playing') return prev;
        return { ...prev, gameState: 'revealing' };
      });
      
      // Wait a bit in revealing state to show the "VS" while face-down
      setTimeout(() => {
        setRoomState(prev => {
          if (!prev || prev.gameState !== 'revealing') return prev;
          const newState = JSON.parse(JSON.stringify(prev));
          const p1 = newState.players.me;
          const p2 = newState.players.bot;
          
          const getWinner = (c1: CardType, c2: CardType) => {
            if (c1 === c2) return 0;
            if ((c1 === 'rock' && c2 === 'scissors') || (c1 === 'paper' && c2 === 'rock') || (c1 === 'scissors' && c2 === 'paper')) return 1;
            return 2;
          };
          
          const winnerCode = getWinner(p1.choice!, p2.choice!);
          
          if (winnerCode === 1) {
            newState.roundWinner = 'me';
          } else if (winnerCode === 2) {
            newState.roundWinner = 'bot';
          } else {
            newState.roundWinner = 'draw';
          }
          
          newState.gameState = 'roundResult';
          
          setTimeout(() => {
            setRoomState(last => {
              if (!last || last.gameState !== 'roundResult') return last;
              // Deep copy to avoid mutation
              const finalState = JSON.parse(JSON.stringify(last));
              
              const p1Final = finalState.players.me;
              const p2Final = finalState.players.bot;

              // Apply points AFTER the round ends (at the transition)
              // Simplified points: 1 per round, 2 for the final round
              let points = 1;
              if (finalState.round === 9) points = 2;

              if (finalState.roundWinner === 'me') {
                p1Final.score += points;
              } else if (finalState.roundWinner === 'bot') {
                p2Final.score += points;
              }

              if (finalState.round >= 9) {
                finalState.gameState = 'gameOver';
              } else {
                finalState.round += 1;
                finalState.gameState = 'playing';
                finalState.roundWinner = null;
                finalState.timeLeft = 15;
                finalState.players.me.choice = null;
                finalState.players.bot.choice = null;
                finalState.players.me.readyForNext = false;
                finalState.players.bot.readyForNext = true;
              }
              return finalState;
            });
          }, 3500); // Increased to allow for reveal animation

          return newState;
        });
      }, 100); // Small delay before roundResult, local delay handles the 0.5s reveal
    }, 800); // 0.8s flight time
  };

  const playAgain = () => {
    if (!roomId) return;
    if (roomId === OFFLINE_BOT_ID) {
      const newState: Room = {
        id: OFFLINE_BOT_ID,
        isBotRoom: true,
        players: {
          me: { id: 'me', name: playerName.trim() || 'لاعب', themeId: selectedThemeId, deck: { ...INITIAL_DECK }, score: 0, choice: null, readyForNext: false },
          bot: { id: 'bot', name: 'الكمبيوتر', themeId: 'robot', deck: { ...INITIAL_DECK }, score: 0, choice: null, readyForNext: true }
        },
        gameState: 'playing',
        round: 1,
        roundWinner: null,
        timeLeft: 15
      };
      setRoomState(newState);
    } else {
      sendNativeAction({ type: 'play_again', roomId });
    }
  };

  const leaveRoom = async () => {
    const currentRoomId = roomId;
    const currentRole = role;
    
    addLog('Leaving room and returning to menu...', 'info');

    // 1. Reset UI State First (Immediate feedback)
    setRoomId(null);
    setRoomState(null);
    setAppState('menu');
    setMenuTab('main');
    setConnectionStatus('DISCONNECTED');
    setRole('NONE');

    // Close Web WebSocket if exists
    if (ws) {
      ws.close();
      setWs(null);
    }

    // 2. Cleanup Native (Background)
    try {
      if (currentRoomId && currentRoomId !== OFFLINE_BOT_ID) {
        if (currentRole !== 'HOST') {
          sendNativeAction({ type: 'leave_room', roomId: currentRoomId });
        }
      }
      if (Capacitor.isNativePlatform()) {
        await LocalServer.stopAll();
      }
    } catch (e) {
      console.warn('Native cleanup failed:', e);
      addLog(`Native cleanup failed: ${e}`, 'error');
    }
  };

  const findNewMatch = async () => {
    await leaveRoom();
    startQuickMatch();
  };

  const buyTheme = async (theme: ThemeConfig) => {
    console.log('Attempting to buy:', theme, 'Coins:', coins);
    if (ownedThemes.includes(theme.id)) {
      setErrorMsg('أنت تمتلك هذه المجموعة بالفعل');
      return;
    }
    if (level < (theme.requiredLevel || 1)) {
      setErrorMsg(`يجب أن تصل للمستوى ${theme.requiredLevel} لفتح هذه المجموعة`);
      return;
    }
    if (coins < theme.price) {
      setErrorMsg('ليس لديك عملات كافية لشراء هذه المجموعة');
      return;
    }

    console.log('Sufficient coins, processing purchase');
    const newCoins = coins - theme.price;
    const newOwned = [...ownedThemes, theme.id];
    
    // تحديث الحالة المحلية فوراً لتجربة مستخدم سريعة (تعمل أوفلاين)
    setCoinsState(newCoins);
    setOwnedThemesState(newOwned);
    setSuccessMsg(`تم شراء مجموعة ${theme.name} بنجاح!`);
    setTimeout(() => setSuccessMsg(null), 4000);
    
    addLog(`تم شراء ثيم ${theme.name} (محلياً وسيتم المزامنة تلقائياً)`, 'success');
  };

  const currentTheme = getTheme(selectedThemeId);

  const renderErrorToast = () => (
    <AnimatePresence>
      {errorMsg && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md"
        >
          <div className="bg-game-red text-game-cream px-4 py-3 rounded-lg shadow-2xl flex items-center justify-between gap-3 border-4 border-game-dark">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-game-dark/30 flex items-center justify-center flex-shrink-0 border border-game-cream/20">
                <XCircle className="w-5 h-5" />
              </div>
              <p className="text-sm font-display tracking-widest leading-tight text-right">{errorMsg}</p>
            </div>
            <button onClick={() => setErrorMsg(null)} className="p-1.5 hover:bg-game-dark/20 rounded-md">
              <X className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      )}
      {successMsg && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md"
        >
          <div className="bg-game-teal text-game-dark px-4 py-3 rounded-lg shadow-2xl flex items-center justify-between gap-3 border-4 border-game-dark">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center flex-shrink-0 border border-game-dark/20">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <p className="text-sm font-display tracking-widest leading-tight text-right">{successMsg}</p>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="p-1.5 hover:bg-black/10 rounded-md">
              <X className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const renderDebugUI = () => null;

  const handleUpdateName = async () => {
    if (editNameInput.trim().length < 2) return;
    const trimmedName = editNameInput.trim();
    if (user) {
      try {
        await updateProfile({ displayName: trimmedName });
        setShowEditNameDialog(false);
      } catch (err) {
        setErrorMsg('فشل في تحديث الاسم على السيرفر');
      }
    } else {
      setPlayerNameState(trimmedName);
      localStorage.setItem('cardclash_guestName', trimmedName);
      localStorage.setItem('cardclash_hasSetGuestName', 'true');
      setShowEditNameDialog(false);
      // If we were in auth screen (first time guest), move to menu
      if (appState === 'auth') {
        setAppState('menu');
      }
    }
  };

  const renderNameEditDialog = () => (
    <div 
      className={`fixed inset-0 z-[250] flex sm:items-center items-start justify-center p-6 bg-black/80 backdrop-blur-sm overflow-y-auto smooth-scroll ${showEditNameDialog ? '' : 'hidden'}`} onClick={() => setShowEditNameDialog(false)}>
      <div className="w-full max-w-md bg-game-dark/90 p-5 sm:p-8 rounded-2xl border border-white/10 shadow-2xl space-y-6 mt-12 sm:mt-0 mb-12" onClick={e => e.stopPropagation()}>
        <div className="text-center space-y-2">
          <h3 className="text-xl font-display text-game-offwhite">ادخل الأسم</h3>
        </div>
        <input 
          type="text" 
          value={editNameInput}
          onChange={(e) => setEditNameInput(e.target.value.replace(/[^ \w\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g, '').slice(0, 20))}
          className="w-full bg-black/40 border border-white/5 rounded-xl py-3 px-4 text-center text-game-offwhite focus:outline-none focus:border-game-teal transition-all"
          maxLength={20}
          placeholder="أدخل اسمك الجديد"
          autoFocus
        />
        <div className="flex flex-col gap-3">
          <button 
            onClick={handleUpdateName}
            className="w-full py-3 bg-white/15 backdrop-blur-md border border-white/20 text-game-offwhite hover:bg-white/20 hover:border-white/30 rounded-xl font-display text-lg transition-all active:scale-95 outline-none transform-gpu"
          >
            حفظ التغييرات
          </button>
          <button 
            onClick={() => setShowEditNameDialog(false)}
            className="w-full py-3 bg-white/5 backdrop-blur-sm hover:bg-white/10 text-game-offwhite/60 rounded-xl font-display text-lg transition-all border border-white/10 outline-none transform-gpu"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );

  const handleLogout = () => {
    // 1. Clears guest tracking values from Local Storage so the app resets to default values 
    //    instead of retaining the previous user's coins/themes for the guest.
    localStorage.removeItem('cardclash_guestName');
    localStorage.removeItem('cardclash_playerId');
    localStorage.removeItem('cardclash_selectedThemeId');
    localStorage.removeItem('cardclash_ownedThemes');
    localStorage.removeItem('cardclash_coins');
    
    // 2. Reset the React States Natively
    setPlayerNameState('محارب');
    const newId = Math.random().toString(36).substring(2, 12);
    setPlayerId(newId);
    localStorage.setItem('cardclash_playerId', newId);
    setSelectedThemeIdState('normal');
    setOwnedThemesState(['normal']);
    setCoinsState(100);

    // 3. Clear auth context
    logout();
  };

  const renderExitConfirm = () => (
    <AnimatePresence>
      {showExitConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80">
          <div className="bg-game-dark border-2 border-white/10 p-8 rounded-2xl w-full max-w-xs text-center shadow-2xl space-y-6">
            <h3 className="text-2xl font-display text-game-offwhite">هل تريد الخروج من اللعبة؟</h3>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => CapApp.exitApp()}
                className="w-full py-3 bg-game-red hover:bg-red-700 text-white rounded-xl font-display text-xl transition-all active:scale-95"
              >
                تأكيد الخروج
              </button>
              <button 
                onClick={() => setShowExitConfirm(false)}
                className="w-full py-3 bg-white/10 hover:bg-white/20 text-game-offwhite rounded-xl font-display text-xl transition-all"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );

  if (appState === 'leaderboard') {
    return (
      <div className="fixed inset-0 z-0 bg-game-bg">
        <LeaderboardView 
          userId={user?._id || null} 
          onBack={() => setAppState('menu')} 
        />
        <div className="fixed bottom-0 left-0 w-full p-4 flex justify-center z-10 sm:hidden">
           <button 
             onClick={() => setAppState('menu')}
             className="w-full py-4 bg-game-teal text-white rounded-xl font-display text-xl shadow-2xl active:scale-95"
           >
             العودة للقائمة
           </button>
        </div>
      </div>
    );
  }

  if (appState === 'auth') {
    return (
      <div 
        dir="rtl" 
        className="fixed inset-0 w-full h-full wood-texture text-game-cream flex flex-col sm:items-center items-start justify-center p-4 sm:p-6 font-body overflow-y-auto smooth-scroll select-none"
      >
        <div 
          className="relative max-w-md w-full bg-game-dark/90 p-5 sm:p-8 rounded-2xl border border-white/10 shadow-2xl space-y-6 my-auto"
        >
          <button 
            onClick={() => setAppState('menu')}
            className="absolute p-2 text-game-offwhite/50 hover:text-game-offwhite hover:bg-white/5 rounded-full transition-all"
            style={{ top: 'max(1.25rem, env(safe-area-inset-top))', left: '1rem' }}
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="text-center space-y-2">
            <p className="text-game-offwhite/50">{authTab === 'login' ? 'سجل دخولك للمنافسة' : 'أنشئ حسابك الجديد'}</p>
          </div>

          <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
            <button 
              onClick={() => { setAuthTab('login'); setErrorMsg(null); }}
              className={`flex-1 py-2 rounded-lg font-display transition-all transform-gpu ${authTab === 'login' ? 'bg-game-teal text-game-dark' : 'text-game-offwhite/40 hover:text-game-offwhite hover:bg-white/5'}`}
            >
              تسجيل دخول
            </button>
            <button 
              onClick={() => { setAuthTab('register'); setErrorMsg(null); }}
              className={`flex-1 py-2 rounded-lg font-display transition-all transform-gpu ${authTab === 'register' ? 'bg-game-teal text-game-dark' : 'text-game-offwhite/40 hover:text-game-offwhite hover:bg-white/5'}`}
            >
              إنشاء حساب
            </button>
          </div>

          <form onSubmit={authTab === 'login' ? handleLogin : handleRegister} className="space-y-4">
            {authTab === 'register' && (
              <div className="space-y-1">
                <label className="text-xs text-game-offwhite/40 mr-2 uppercase tracking-widest">الاسم المستعار</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-game-teal/40" />
                  <input 
                    type="text" 
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value.replace(/[^ \w\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g, '').slice(0, 20))}
                    required
                    maxLength={20}
                    placeholder="اسم المحارب"
                    className="w-full bg-black/30 border border-white/10 rounded-xl py-3 px-10 text-game-offwhite focus:outline-none focus:border-game-teal transition-all placeholder:text-white/10"
                  />
                </div>
              </div>
            )}
            
            <div className="space-y-1">
              <label className="text-xs text-game-offwhite/40 mr-2 uppercase tracking-widest">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-game-teal/40" />
                <input 
                  type="email" 
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value.replace(/\s/g, '').slice(0, 64))}
                  required
                  maxLength={64}
                  placeholder="name@example.com"
                  className="w-full bg-black/30 border border-white/10 rounded-xl py-3 px-10 text-game-offwhite focus:outline-none focus:border-game-teal transition-all placeholder:text-white/10"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-game-offwhite/40 mr-2 uppercase tracking-widest">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-game-teal/40" />
                <input 
                  type="password" 
                  value={authPass}
                  onChange={(e) => setAuthPass(e.target.value.replace(/\s/g, '').slice(0, 32))}
                  required
                  maxLength={32}
                  placeholder="••••••••"
                  className="w-full bg-black/30 border border-white/10 rounded-xl py-3 px-10 text-game-offwhite focus:outline-none focus:border-game-teal transition-all placeholder:text-white/10"
                  dir="ltr"
                />
              </div>
            </div>

            {errorMsg && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }}
                className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-red-500 text-sm text-center flex items-center justify-center gap-2"
              >
                <Info className="w-4 h-4" /> {errorMsg}
              </motion.div>
            )}

            <button 
              type="submit"
              disabled={authSubmitting}
              className="w-full py-4 bg-white/15 backdrop-blur-md border border-white/20 text-game-offwhite hover:bg-white/20 hover:border-white/30 rounded-xl font-display text-xl transition-all active:scale-95 flex items-center justify-center gap-2 outline-none transform-gpu"
            >
              {authSubmitting ? <Activity className="w-5 h-5 animate-spin" /> : authTab === 'login' ? <><LogIn className="w-5 h-5" /> تسجيل الدخول</> : <><UserPlus className="w-5 h-5" /> تسجيل جديد</>}
            </button>
          </form>
          
          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink-0 mx-4 text-game-offwhite/20 text-xs font-display uppercase tracking-widest">أو</span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          <button 
            onClick={() => {
              const hasSetGuestName = localStorage.getItem('cardclash_hasSetGuestName');
              setAppState('menu');
              if (!hasSetGuestName) {
                setEditNameInput('');
                setShowEditNameDialog(true);
              }
            }}
            className="w-full py-3 bg-white/5 backdrop-blur-sm hover:bg-white/10 text-game-offwhite/60 rounded-xl font-display transition-all border border-white/10 active:scale-95 flex items-center justify-center gap-2 transform-gpu outline-none"
          >
            <User className="w-4 h-4 opacity-50" /> المتابعة كضيف (بدون حساب)
          </button>
        </div>
        {renderDebugUI()}
      </div>
    );
  }

  if (appState === 'verifySent') {
    return (
      <div 
        dir="rtl" 
        className="fixed inset-0 w-full h-full wood-texture text-game-cream flex flex-col items-center justify-center p-4 sm:p-6 font-body overflow-hidden select-none"
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} 
          animate={{ opacity: 1, scale: 1 }}
          className="relative max-w-md w-full bg-game-dark/95 p-6 sm:p-10 rounded-3xl border border-game-teal/30 shadow-2xl text-center space-y-6"
        >
          <button 
            onClick={() => setAppState('menu')}
            className="absolute p-2 text-game-offwhite/50 hover:text-game-offwhite hover:bg-white/5 rounded-full transition-all"
            style={{ top: '1.25rem', left: '1.25rem' }}
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="w-20 h-20 bg-game-teal/20 rounded-full flex items-center justify-center mx-auto border-2 border-game-teal/50">
            <Mail className="w-10 h-10 text-game-teal" />
          </div>
          <h2 className="text-3xl font-display text-game-offwhite">أدخل كود التأكيد</h2>
          <p className="text-game-offwhite/70 leading-relaxed text-lg">لقد أرسلنا كود التأكيد إلى <br /><span className="text-game-teal font-bold">{authEmail}</span></p>
          
          <div className="bg-game-teal/5 border border-game-teal/20 p-3 rounded-xl flex items-center gap-3 text-right">
            <Info className="w-5 h-5 text-game-teal shrink-0" />
            <p className="text-sm text-game-offwhite/60">إذا لم تجد الرسالة في صندوق الوارد، جرب إلقاء نظرة ودية على مجلد الرسائل غير المرغوب فيها (Spam) 📧✨</p>
          </div>

          <button 
            type="button" 
            onClick={handleResendCode}
            disabled={isResending}
            className="text-xs text-game-teal hover:underline font-display tracking-widest"
          >
            {isResending ? 'جاري الإرسال...' : 'إعادة إرسال الكود؟'}
          </button>

          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div className="relative">
              <input 
                type="text" 
                value={authVerifyCode}
                onChange={(e) => setAuthVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                placeholder="000000"
                maxLength={6}
                className="w-full bg-black/30 border border-white/10 rounded-xl py-4 text-center text-4xl font-display tracking-[10px] text-game-teal focus:outline-none focus:border-game-teal transition-all placeholder:text-white/5"
              />
            </div>
            
            {errorMsg && (
              <div className="text-red-500 text-sm">{errorMsg}</div>
            )}

            <button 
              type="submit"
              disabled={authSubmitting || authVerifyCode.length !== 6}
              className="w-full py-4 bg-game-teal text-game-dark rounded-xl font-display text-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {authSubmitting ? <Activity className="w-5 h-5 animate-spin" /> : 'تأكيد الحساب'}
            </button>
          </form>

          <button 
            onClick={() => { setAppState('auth'); setAuthTab('login'); }}
            className="w-full py-3 bg-white/5 hover:bg-white/10 text-game-offwhite/40 rounded-xl font-display transition-all border border-white/10 text-sm"
          >
            العودة لتسجيل الدخول
          </button>
        </motion.div>
      </div>
    );
  }

  if (['menu', 'store', 'profile'].includes(appState)) {
    return (
      <>
        {renderErrorToast()}
        <GlobalNavbar 
          activeTab={visibleTab} 
          setAppState={setAppState}
          coins={coins}
          playerName={playerName}
          isGuest={!user}
          onLogout={handleLogout}
          onLoginClick={() => {
            setAppState('auth');
            setAuthTab('login');
          }}
          menuTab={menuTab}
          setMenuTab={setMenuTab}
        />
        <DashboardViewPager appState={appState} setAppState={setAppState} onVisibleTabChange={setVisibleTab}>
          <StoreView 
            coins={coins}
            ownedThemes={ownedThemes}
            selectedThemeId={selectedThemeId}
            userLevel={level}
            onBack={() => setAppState('menu')}
            onBuy={buyTheme}
            onSelect={(id) => {
              setSelectedThemeId(id);
              setSelectedPack(null);
            }}
            selectedPack={selectedPack}
            setSelectedPack={setSelectedPack}
          />
          <div 
            dir="rtl" 
            className="w-full h-full flex flex-col font-body overflow-x-hidden overflow-y-auto smooth-scroll select-none"
          >
            <div
              className="max-w-md w-full text-center mx-auto py-8 px-6 pt-24 min-h-screen flex flex-col justify-center items-center"
            >
              <div className="mb-8"></div>
            
            <div className="space-y-4 sm:space-y-5 w-full">
              {menuTab === 'main' && (
                <div
                  key="main"
                  className="flex flex-col gap-4 sm:gap-5 w-full"
                >
                  <div className="w-full mb-2">
                    {!user ? (
                      <div className="bg-yellow-500/10 border border-yellow-500/30 p-3 sm:p-4 rounded-xl flex items-start gap-3 w-full sm:w-[90%] mx-auto text-right">
                        <Info className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                        <div className="space-y-2.5 w-full">
                          <div>
                            <p className="text-sm text-yellow-500 font-display">تلعب الآن كضيف</p>
                            <p className="text-[11px] text-game-cream/60 leading-relaxed font-body">يمكنك الاستمتاع باللعب بكافة الميزات، لكن لن يُحفظ تقدمك أو عملاتك بالسحابة ما لم تسجل دخولك.</p>
                          </div>
                          <button 
                            onClick={() => setAppState('auth')}
                            className="w-full sm:w-fit px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-500 active:scale-95 border border-yellow-500/50 rounded-lg text-xs font-display flex items-center justify-center gap-2 transition-all"
                          >
                            <User className="w-3.5 h-3.5" /> تسجيل الدخول أو إنشاء حساب
                          </button>
                        </div>
                      </div>
                    ) : !isOnline ? (
                      <div className="bg-blue-500/10 border border-blue-500/30 p-3 sm:p-4 rounded-xl flex items-start gap-3 w-full sm:w-[90%] mx-auto text-right">
                        <Wifi className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                        <div className="space-y-2 w-full">
                          <p className="text-sm text-blue-400 font-display">وضع الأوفلاين (مسجل دخول)</p>
                          <p className="text-[11px] text-game-cream/60 leading-relaxed font-body">أنت تلعب بحسابك <span className="text-blue-400">{user.displayName}</span>. سيتم مزامنة أي تقدم تحرزه فور عودة الاتصال بالإنترنت.</p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                    <motion.button
                      whileTap={{ scale: 0.94 }}
                      onClick={() => setMenuTab('online')}
                      className="w-full sm:w-[90%] mx-auto py-3 sm:py-4 bg-white/15 backdrop-blur-md border border-white/20 text-game-offwhite hover:bg-white/20 hover:border-white/30 focus:bg-game-teal/20 focus:border-game-teal/50 focus:text-game-teal rounded-lg font-display text-xl sm:text-2xl transition-all flex items-center justify-center gap-2 sm:gap-3 outline-none transform-gpu"
                    >
                      <Globe className="w-5 h-5 sm:w-6 sm:h-6" /> لعب عبر الإنترنت
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.94 }}
                      onClick={() => setMenuTab('local')}
                      className="w-full sm:w-[90%] mx-auto py-3 sm:py-4 bg-white/15 backdrop-blur-md border border-white/20 text-game-offwhite hover:bg-white/20 hover:border-white/30 focus:bg-white/20 focus:border-white/50 rounded-lg font-display text-xl sm:text-2xl transition-all flex items-center justify-center gap-2 sm:gap-3 outline-none transform-gpu"
                    >
                      <Home className="w-5 h-5 sm:w-6 sm:h-6" /> شبكة محلية (IP)
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.94 }}
                      onClick={createBotRoom}
                      disabled={isBotLoading}
                      className="w-full sm:w-[90%] mx-auto py-3 sm:py-4 bg-white/10 backdrop-blur-md border border-white/10 text-game-offwhite/80 hover:bg-white/15 hover:border-white/20 hover:text-white focus:bg-white/15 focus:border-white/40 focus:text-white rounded-lg font-display text-xl sm:text-2xl transition-all flex items-center justify-center gap-2 sm:gap-3 outline-none transform-gpu disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isBotLoading ? <Activity className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" /> : <><Bot className="w-5 h-5 sm:w-6 sm:h-6" /> ضد الكمبيوتر</>}
                    </motion.button>
                    <div className="flex w-full sm:w-[90%] mx-auto gap-3">
                      <motion.button
                        whileTap={{ scale: 0.94 }}
                        onClick={() => setAppState('store')}
                        className="flex-1 py-3 bg-white/5 backdrop-blur-md border border-white/10 text-game-cream/80 hover:bg-white/10 hover:text-white hover:border-white/20 rounded-lg font-display text-lg sm:text-xl transition-all flex items-center justify-center gap-2 outline-none transform-gpu"
                      >
                        <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" /> المتجر
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.94 }}
                        onClick={() => setAppState('profile')}
                        className="flex-1 py-3 bg-white/5 backdrop-blur-md border border-white/10 text-game-cream/80 hover:bg-white/10 hover:text-white hover:border-white/20 rounded-lg font-display text-lg sm:text-xl transition-all flex items-center justify-center gap-2 outline-none transform-gpu"
                      >
                        <User className="w-4 h-4 sm:w-5 sm:h-5" /> حسابي
                      </motion.button>
                    </div>
                  </div>
                )}

                {menuTab === 'online' && (
                  <div
                    key="online"
                    className="flex flex-col gap-5 w-full max-w-[340px] mx-auto px-2 relative"
                  >
                    <div className="sticky top-24 z-40 flex justify-end w-full mb-2 px-4">
                       <button
                         onClick={() => setMenuTab('main')}
                         className="flex items-center gap-2 text-game-cream hover:text-white transition-all px-2 py-1"
                       >
                         <span className="font-display text-sm tracking-wide">العودة للقائمة</span>
                         <ArrowRight className="w-4 h-4" />
                       </button>
                    </div>

                    <div className="relative flex flex-col gap-6">
                        <>
                          {isSearching && (
                            <div
                              className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center rounded-xl border border-game-teal/30 shadow-[0_0_30px_rgba(20,184,166,0.15)]"
                            >
                              <Activity className="w-12 h-12 text-game-teal animate-spin mb-4" />
                              <p className="text-game-teal font-display text-lg tracking-widest animate-pulse">جاري البحث عن خصم...</p>
                              <p className="text-game-offwhite/40 font-body text-xs mt-2 mb-6">يرجى الانتظار، سيتم توجيهك للمباراة تلقائياً</p>
                              <button 
                                onClick={cancelSearch} 
                                className="px-6 py-2 border-2 border-game-red/30 text-game-red hover:bg-game-red hover:text-white rounded-lg font-display text-sm transition-all shadow-md active:scale-95"
                              >
                                إلغاء البحث
                              </button>
                            </div>
                          )}

                          <div 
                            onClick={() => setAppState('leaderboard')}
                            className="bg-game-dark/90 border border-yellow-500/20 p-4 rounded-xl shadow-xl cursor-pointer hover:bg-white/5 transition-all group"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20 group-hover:bg-yellow-500/20 transition-all">
                                  <Trophy className="w-5 h-5 text-yellow-500" />
                                </div>
                                <div className="text-right">
                                  <h3 className="text-yellow-500 font-display text-sm tracking-widest">لوحة الصدارة</h3>
                                  <p className="text-[9px] text-game-cream/40 font-body italic underline decoration-yellow-500/30">شاهد ترتيب أبطال العالم</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 opacity-40 group-hover:opacity-100 transition-all">
                                <Sparkles className="w-3 h-3 text-yellow-500" />
                                <ChevronLeft className="w-4 h-4 text-game-offwhite" />
                              </div>
                            </div>
                          </div>

                          <div className="bg-game-dark/80 border border-white/10 p-5 rounded-xl shadow-xl">
                            <div className="flex items-center gap-3 mb-4">
                              <div className="p-1.5 bg-white/5 rounded-lg border border-game-teal/20">
                                <UserSearch className="w-5 h-5 text-game-teal" />
                              </div>
                              <div className="text-right">
                                <h3 className="text-game-cream font-display text-base tracking-widest leading-none">بحث عشوائي</h3>
                                <p className="text-[10px] text-game-cream/40 font-body italic mt-1">اللعب ضد خصم عشوائي عالمياً</p>
                              </div>
                            </div>
                            <button
                               onClick={startQuickMatch}
                               disabled={isSearching}
                               className="w-full py-3 bg-white/10 backdrop-blur-md border border-white/15 text-game-offwhite hover:bg-white/15 hover:border-white/20 rounded-xl font-display text-xl transition-all active:scale-95 disabled:opacity-50 outline-none transform-gpu"
                            >
                              مباراة سريعة
                            </button>
                          </div>

                          <div className="bg-game-dark/80 border border-white/10 p-5 rounded-xl shadow-xl">
                            <div className="flex items-center gap-3 mb-4">
                              <div className="p-1.5 bg-white/5 rounded-lg border border-white/10">
                                <Users className="w-5 h-5 text-game-offwhite" />
                              </div>
                              <div className="text-right">
                                <h3 className="text-game-cream font-display text-base tracking-widest leading-none">غرفة خاصة</h3>
                                <p className="text-[10px] text-game-cream/40 font-body italic mt-1">العب مع أصدقائك برمز سري</p>
                              </div>
                            </div>

                            <button
                               onClick={createOnlineRoom}
                               disabled={isSearching}
                               className="w-full py-2.5 mb-4 bg-white/10 backdrop-blur-md border border-white/15 text-game-offwhite hover:bg-white/15 hover:border-white/20 rounded-lg font-display text-base transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 outline-none transform-gpu"
                            >
                              <PlusCircle className="w-4 h-4" /> إنشاء غرفة جديدة
                            </button>
                            
                            <div className="relative flex items-center mb-4">
                              <div className="flex-grow border-t border-white/5"></div>
                              <span className="flex-shrink-0 mx-3 text-white/20 font-display text-[10px]">أو انضمام برمز</span>
                              <div className="flex-grow border-t border-white/5"></div>
                            </div>

                            <div className="relative">
                              <input
                                 type="text"
                                 placeholder="الرمز"
                                 value={roomIdInput}
                                 onChange={(e) => setRoomIdInput(e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4))}
                                 className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-center text-2xl font-mono text-game-offwhite focus:outline-none focus:border-game-teal/50 focus:bg-white/10 transition-all placeholder:text-white/10 uppercase tracking-[0.2em]"
                                 maxLength={4}
                                 disabled={isSearching}
                                 dir="ltr"
                              />
                              <AnimatePresence>
                                {roomIdInput.length === 4 && (
                                  <motion.button
                                    initial={{ opacity: 0, x: 10, scale: 0.9 }}
                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                    exit={{ opacity: 0, x: 10, scale: 0.9 }}
                                    onClick={joinOnlineRoom}
                                    disabled={isSearching}
                                    className="absolute left-1.5 top-1.5 bottom-1.5 px-6 bg-game-teal text-game-dark hover:bg-emerald-400 rounded-lg font-display text-sm transition-all active:scale-95 shadow-lg flex items-center justify-center z-10"
                                  >
                                    دخول
                                  </motion.button>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        </>
                    </div>
                  </div>
                )}

                {menuTab === 'local' && (
                  <div
                    key="local"
                    className="flex flex-col gap-6 w-full max-w-[340px] mx-auto px-2 relative"
                  >
                    <div className="sticky top-24 z-40 flex justify-end w-full mb-2 px-4">
                       <button
                         onClick={() => setMenuTab('main')}
                         className="flex items-center gap-2 text-game-cream hover:text-white transition-all px-2 py-1"
                       >
                         <span className="font-display text-sm tracking-wide">العودة للقائمة</span>
                         <ArrowRight className="w-4 h-4" />
                       </button>
                    </div>

                    <div className="relative flex flex-col gap-6">
                      {connectionStatus === 'CONNECTING' && (
                        <div
                          className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center rounded-xl border border-white/10"
                        >
                          <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-white animate-spin mb-4"></div>
                          <p className="text-game-offwhite font-display text-lg tracking-widest animate-pulse">جاري الاتصال...</p>
                          <button 
                            onClick={async () => {
                              if (Capacitor.isNativePlatform()) {
                                await LocalServer.stopAll();
                              }
                              setConnectionStatus('DISCONNECTED');
                            }}
                            className="mt-6 px-5 py-2 bg-game-slate text-white rounded-full text-xs font-display tracking-widest transition-all hover:bg-slate-600"
                          >
                            إلغاء الاتصال
                          </button>
                        </div>
                      )}

                      {/* Host Section */}
                    <div className="bg-game-dark/90 border border-white/10 p-6 rounded-xl shadow-2xl">
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                            <NetworkIcon className="w-5 h-5 text-game-offwhite" />
                          </div>
                          <div className="text-right">
                            <h3 className="text-game-cream font-display text-lg tracking-widest">استضافة لعبة</h3>
                            <p className="text-[10px] text-game-cream/40 font-body italic">حول جهازك إلى خادم محلي</p>
                          </div>
                        </div>
                        <button 
                          onClick={fetchIp}
                          className="p-2 hover:bg-game-bg rounded-md transition-colors text-game-cream/40 hover:text-game-teal border border-transparent hover:border-game-teal/30"
                          title="تحديث الـ IP"
                        >
                          <Bug className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <button
                        onClick={hostGame}
                        className="w-full py-3.5 bg-white/15 backdrop-blur-md border border-white/20 text-game-offwhite hover:bg-white/20 hover:border-white/30 rounded-lg font-display text-xl transition-all active:scale-95 flex items-center justify-center gap-2 outline-none transform-gpu"
                      >
                        بدء الاستضافة
                      </button>
                      
                      <p className="text-[10px] text-game-cream/40 text-center mt-3 px-2 leading-relaxed opacity-70 font-body italic">
                        سيظهر الـ IP الخاص بك للاعبين الآخرين على نفس الشبكة للاتصال بك.
                      </p>
                    </div>

                    {/* Join Section */}
                    <div className="bg-game-dark/90 border border-white/10 p-6 rounded-xl shadow-2xl">
                      <div className="flex items-center gap-3 mb-5">
                        <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                          <PlugZap className="w-5 h-5 text-game-offwhite" />
                        </div>
                        <div className="text-right">
                          <h3 className="text-game-cream font-display text-lg tracking-widest">انضمام لصديق</h3>
                          <p className="text-[10px] text-game-cream/40 font-body italic">الاتصال بجهاز صديقك عبر الـ IP</p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3">
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="مثال: 192.168.1.5"
                          value={ipInput}
                          onChange={handleIpChange}
                          className="w-full bg-black/30 border border-white/10 rounded-lg py-2.5 px-3 text-center text-xl font-mono text-game-offwhite focus:outline-none focus:border-game-teal transition-all placeholder:text-white/10"
                          maxLength={15}
                          dir="ltr"
                        />
                        {isValidIp(ipInput.trim()) && (
                          <div
                            style={{ transformOrigin: 'top' }}
                          >
                            <button
                              onClick={joinGame}
                              className="w-full py-3 bg-white/15 backdrop-blur-md border border-white/20 text-game-offwhite hover:bg-white/20 hover:border-white/30 rounded-lg font-display text-xl transition-all active:scale-95 outline-none transform-gpu"
                            >
                              اتصال
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          </div>
            <ProfileView 
              playerName={playerName}
              coins={coins}
              xp={xp}
              level={level}
              ownedThemes={ownedThemes}
              selectedThemeId={selectedThemeId}
              onBuy={buyTheme}
              onSelect={(id: string) => {
                setSelectedThemeId(id);
                setSelectedPack(null);
              }}
              selectedPack={selectedPack}
              setSelectedPack={setSelectedPack}
              onEditName={() => {
                setEditNameInput(playerName);
                setShowEditNameDialog(true);
              }}
            />
          </DashboardViewPager>
          
          <AnimatePresence>
            {showLevelUp && (
              <LevelUpModal 
                level={showLevelUp} 
                onClose={() => setShowLevelUp(null)} 
              />
            )}
          </AnimatePresence>
          {renderNameEditDialog()}
          {renderDebugUI()}
        </>
    );
  }

  if (!roomState) return (
    <div className="fixed inset-0 w-full h-full wood-texture">
      {renderDebugUI()}
    </div>
  );

  // In LAN mode, the host is 'host' and the client is their clientId.
  // In Online mode, it depends on the server.
  // We'll try to find the player that matches the current role/status.
  let myId = '';
  if (roomState.isBotRoom) {
    myId = 'me';
  } else if (roomState.players[playerId]) {
    myId = playerId;
  } else if (role === 'HOST') {
    myId = 'host';
  } else {
    // If we are a client, our ID is likely the one that isn't 'host' (in LAN) 
    // or we can look for our name in the players list.
    const ids = Object.keys(roomState.players);
    const foundId = ids.find(id => roomState.players[id].name === playerName);
    myId = foundId || ids[0];
  }

  if (!myId || !roomState.players[myId]) return (
    <div className="fixed inset-0 w-full h-full wood-texture">
      {renderDebugUI()}
    </div>
  );

  const me = roomState.players[myId];
  const opponentId = Object.keys(roomState.players).find(id => id !== myId);
  const opponent = opponentId ? roomState.players[opponentId] : null;
  const opponentTheme = roomState.isBotRoom ? getTheme('robot') : (opponent?.themeId ? getTheme(opponent.themeId) : getTheme('normal'));

  if (!opponent && !roomState.isBotRoom && roomState.gameState !== 'waiting') return (
    <div className="fixed inset-0 w-full h-full wood-texture">
      {renderDebugUI()}
    </div>
  );
  const opponentName = opponent?.name || 'الخصم';

  if (roomState.gameState === 'waiting') {
    return (
      <>
        <div 
          dir="rtl" 
          className="fixed inset-0 w-full h-full wood-texture text-game-cream flex flex-col items-center justify-center p-4 sm:p-6 font-body overflow-hidden select-none"
          style={{
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
            paddingLeft: 'env(safe-area-inset-left)',
            paddingRight: 'env(safe-area-inset-right)'
          }}
        >
          <motion.div
            className="bg-game-dark/90 p-8 rounded-xl border border-white/10 shadow-2xl max-w-sm w-full text-center"
          >
            <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-white animate-spin mx-auto mb-8"></div>
            <h2 className="text-2xl font-display mb-3 text-game-offwhite tracking-widest">في انتظار الخصم...</h2>
            
            <div className="flex items-center justify-center gap-2 mb-8">
              <div className={`w-2 h-2 rounded-full ${connectionStatus === 'CONNECTION_VERIFIED' ? 'bg-green-400 animate-pulse' : 'bg-game-slate'}`}></div>
              <span className="text-[10px] text-game-offwhite/40 font-display tracking-widest italic">
                {connectionStatus === 'CONNECTION_VERIFIED' ? 'اتصال مؤمن' : 'جاري تأمين الاتصال'}
              </span>
            </div>
            
            {role === 'HOST' ? (
              <>
                <p className="text-game-offwhite/60 mb-6 text-xs px-4 font-body italic">أنت الآن تستضيف اللعبة. اطلب من صديقك إدخال الـ IP الخاص بك للاتصال.</p>
                <div className="bg-white/5 p-4 rounded-lg border border-white/10 mb-8">
                  <div className="text-[10px] text-game-offwhite/40 mb-2 font-display tracking-widest uppercase">عنوان الـ IP الخاص بك</div>
                  <div className="text-2xl font-mono font-black text-game-offwhite select-all">{userIp}</div>
                </div>
              </>
            ) : roomState.isPublic ? (
              <div className="mb-8">
                <p className="text-game-offwhite/60 text-xs px-6 font-body italic leading-relaxed">
                  يتم البحث تلقائياً عن خصم جديد للمنافسة!
                </p>
              </div>
            ) : (
              <>
                <p className="text-game-offwhite/60 mb-6 text-xs px-4 font-body italic">شارك كود الغرفة مع صديقك للعب عبر الإنترنت</p>
                <div className="bg-white/5 p-4 rounded-lg border border-white/10 mb-8">
                  <div className="text-[10px] text-game-offwhite/40 mb-2 font-display tracking-widest uppercase">كود الغرفة</div>
                  <div className="text-3xl font-mono font-black tracking-widest text-game-offwhite">{roomId}</div>
                </div>
              </>
            )}
            
            <div className="flex flex-col gap-3">
              {roomState.isPublic && (
                <button
                  onClick={findNewMatch}
                  className="w-full py-4 bg-game-teal hover:bg-emerald-600 text-game-dark rounded-lg font-display text-xl transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2"
                >
                  <UserSearch className="w-5 h-5" /> البحث عن خصم آخر
                </button>
              )}
              {role === 'HOST' ? (
                <button
                  onClick={() => navigator.clipboard.writeText(userIp || '')}
                  className="w-full py-4 bg-game-offwhite hover:bg-white text-black rounded-lg font-display text-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" /> نسخ عنوان الـ IP
                </button>
              ) : !roomState.isPublic && (
                <button
                  onClick={copyRoomId}
                  className="w-full py-4 bg-game-offwhite hover:bg-white text-black rounded-lg font-display text-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" /> نسخ كود الغرفة
                </button>
              )}
              <button
                onClick={leaveRoom}
                className="w-full py-3 mt-2 bg-game-slate hover:bg-slate-600 text-white rounded-lg font-display text-lg transition-all active:scale-95"
              >
                إلغاء والرجوع
              </button>
            </div>
          </motion.div>
        </div>
        {renderDebugUI()}
      </>
    );
  }

  if (roomState.gameState === 'gameOver') {
    const finalWin = me.score > (opponent?.score || 0);
    const finalLoss = me.score < (opponent?.score || 0);
    
    return (
      <>
        {renderErrorToast()}
        <div 
          dir="rtl" 
          className="fixed inset-0 w-full h-full wood-texture text-game-cream flex flex-col items-center justify-center p-4 sm:p-6 font-body overflow-x-hidden overflow-y-auto select-none"
          style={{
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
            paddingLeft: 'env(safe-area-inset-left)',
            paddingRight: 'env(safe-area-inset-right)'
          }}
        >
          <motion.div
            className="bg-game-dark/90 p-8 rounded-xl border border-white/10 shadow-2xl max-w-sm w-full text-center relative overflow-hidden"
          >
            <div className="relative z-10">
              <h2 className="text-3xl font-display mb-2 text-game-offwhite/40 tracking-widest uppercase"></h2>
              <div className={`text-5xl font-display mb-10 mt-10 tracking-widest ${finalWin ? 'text-white' : finalLoss ? 'text-game-slate' : 'text-game-offwhite/60'}`}>
                {finalWin ? 'لقد انتصرت!' : finalLoss ? 'لقد خسرت!' : 'تعادل!'}
              </div>
              
              <div className="flex justify-center gap-8 mb-10 bg-white/5 py-6 rounded-xl border border-white/10">
                <div className="flex flex-col items-center">
                  <span className="text-game-offwhite/40 text-[10px] mb-2 uppercase tracking-widest font-display">{me.name}</span>
                  <span className="text-5xl font-display text-game-offwhite">{me.score}</span>
                </div>
                <div className="w-[1px] bg-white/10 my-2"></div>
                <div className="flex flex-col items-center">
                  <span className="text-game-offwhite/40 text-[10px] mb-2 uppercase tracking-widest font-display">{opponentName}</span>
                  <span className="text-5xl font-display text-game-offwhite">{opponent?.score || 0}</span>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <button
                  onClick={playAgain}
                  disabled={me.readyForNext}
                  className={`w-full py-4 rounded-lg font-display text-2xl transition-all shadow-lg ${me.readyForNext ? 'bg-white/5 text-white/10 cursor-not-allowed' : 'bg-game-offwhite hover:bg-white text-black active:scale-95'}`}
                >
                  {me.readyForNext ? 'في انتظار الخصم...' : 'العب مرة أخرى'}
                </button>
                {roomState.isPublic && (
                  <button
                    onClick={findNewMatch}
                    className="w-full py-4 bg-game-teal hover:bg-emerald-600 text-game-dark rounded-lg font-display text-xl transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2"
                  >
                    <UserSearch className="w-5 h-5" /> البحث عن خصم آخر
                  </button>
                )}
                <button
                  onClick={leaveRoom}
                  className="w-full py-3 bg-game-slate hover:bg-slate-600 text-white rounded-lg font-display text-xl transition-all active:scale-95"
                >
                  الرجوع للقائمة الرئيسية
                </button>
              </div>
            </div>
          </motion.div>
        </div>
        {renderDebugUI()}
      </>
    );
  }

  return (
    <>
      {renderErrorToast()}
      <div 
        dir="rtl" 
        className="fixed inset-0 w-full h-full wood-texture text-game-cream font-body selection:bg-game-red/30 overflow-hidden flex flex-col select-none"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)'
      }}
    >
      <div className="max-w-md mx-auto w-full h-full flex flex-col flex-1 relative">
        {/* Header */}
        <nav className="sticky top-0 z-50 bg-[#121212]/95 backdrop-blur-md border-b border-white/10 px-6 sm:px-8 py-2.5 flex justify-between items-center shadow-lg w-full shrink-0" style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))' }}>
          <div className="flex items-center gap-2">
            <button 
              onClick={leaveRoom}
              className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-game-offwhite"
              title="خروج"
            >
              <XCircle className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <div className="flex flex-col">
              <span className="text-xs sm:text-sm text-game-offwhite/50 font-display italic leading-none">{roomState.isBotRoom ? 'لعب فردي' : 'لعب محلي'}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] sm:text-xs text-game-offwhite font-display tracking-widest bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 px-2 py-0.5 rounded">
              قيمة الفوز: {roomState.round === 9 ? 2 : 1}
            </span>
            <span className="bg-white/10 border border-white/5 shadow-inner px-2.5 py-0.5 rounded text-[10px] sm:text-xs font-display text-game-offwhite tracking-widest">
              الجولة: {roomState.round}
            </span>
          </div>
        </nav>

        {/* Opponent Area */}
        <div className="flex-1 flex flex-col-reverse justify-center px-10 pt-4 pb-1 bg-[#F5F5F5]/5">
          <div className="flex justify-start items-start mt-1">
            <div className="text-right">
              <h2 className="text-white/80 text-[10px] sm:text-xs mb-0.5 flex items-center gap-2 font-display tracking-widest justify-end">
                {opponentName}
                {opponent?.id === 'bot' ? <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-white/50" /> : null}
              </h2>
              <div className="text-3xl sm:text-4xl font-display text-white text-stroke-white">{opponent?.score || 0}</div>
            </div>
          </div>
          <div className="flex justify-between gap-2 sm:gap-4">
             <CardCount 
               type="rock" 
               count={(opponent?.deck.rock || 0) + (opponent?.hasChosen && roomState.gameState === 'playing' && opponent?.choice === null ? 1 : 0) + (opponent?.id === 'bot' && opponent?.choice === 'rock' && roomState.gameState === 'playing' ? 1 : 0)} 
               theme={opponentTheme} 
             />
             <CardCount 
               type="paper" 
               count={(opponent?.deck.paper || 0) + (opponent?.hasChosen && roomState.gameState === 'playing' && opponent?.choice === null ? 1 : 0) + (opponent?.id === 'bot' && opponent?.choice === 'paper' && roomState.gameState === 'playing' ? 1 : 0)} 
               theme={opponentTheme} 
             />
             <CardCount 
               type="scissors" 
               count={(opponent?.deck.scissors || 0) + (opponent?.hasChosen && roomState.gameState === 'playing' && opponent?.choice === null ? 1 : 0) + (opponent?.id === 'bot' && opponent?.choice === 'scissors' && roomState.gameState === 'playing' ? 1 : 0)} 
               theme={opponentTheme} 
             />
          </div>
        </div>

        {/* Battle Area */}
        <div className="h-56 sm:h-72 relative flex items-center justify-center bg-[#F5F5F5]/5 shadow-inner overflow-hidden shrink-0 my-2 rounded-xl mx-2 border border-white/5">
          {(roomState.gameState === 'playing' || roomState.gameState === 'revealing' || roomState.gameState === 'roundResult') && (
            <div className="flex flex-col items-center w-full px-4 sm:px-6 h-full justify-center">
              <div className="flex items-center gap-3 sm:gap-6 w-full justify-center">
                
                {/* Player Card */}
                {me.choice ? (
                  <PlayedCard 
                    type={me.choice} 
                    isPlayer={true} 
                    winner={roomState.gameState === 'roundResult' && roomState.roundWinner === myId} 
                    faceDown={roomState.gameState === 'playing' || roomState.gameState === 'revealing' || (roomState.gameState === 'roundResult' && !isRevealingLocal)} 
                    theme={currentTheme}
                  />
                ) : (
                  <div className="w-16 sm:w-24 aspect-[3/4]" />
                )}

                {/* Center Content */}
                <div className="flex flex-col items-center justify-center min-w-[80px] sm:min-w-[100px]">
                  {roomState.gameState === 'playing' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-game-cream flex flex-col items-center gap-2 sm:gap-3"
                    >
                      <GameTimer timeLeft={roomState.timeLeft} />
                      {!me.choice ? (
                        <div className="flex flex-col items-center">
                          <p className="text-[10px] sm:text-xs font-display tracking-widest italic whitespace-nowrap">اختر بطاقتك...</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <p className="text-[10px] sm:text-xs font-display tracking-widest italic whitespace-nowrap">بانتظار الخصم...</p>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {(roomState.gameState === 'revealing' || roomState.gameState === 'roundResult') && (
                    <div className="flex flex-col items-center gap-1 sm:gap-2">
                      <div className="text-3xl sm:text-5xl font-display italic tracking-tighter text-game-slate">
                        VS
                      </div>
                      {roomState.gameState === 'roundResult' && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: 'spring', bounce: 0.5, delay: 1.4 }}
                          className={`px-4 sm:px-6 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-display tracking-widest whitespace-nowrap shadow-lg flex items-center justify-center border-2 ${
                            roomState.roundWinner === myId ? `${currentTheme.frontColor} border-white/20 text-white` :
                            roomState.roundWinner === opponentId ? `${opponentTheme.frontColor} border-white/20 text-white` :
                            'bg-game-dark border-game-bg text-game-cream'
                          }`}
                        >
                          {roomState.roundWinner === myId ? (
                            'فزت'
                          ) : roomState.roundWinner === opponentId ? (
                            'خسرت'
                          ) : (
                            'تعادل'
                          )}
                        </motion.div>
                      )}
                    </div>
                  )}
                </div>

                {/* Opponent Card */}
                {(opponent?.choice || opponent?.hasChosen) ? (
                  <PlayedCard 
                    type={opponent?.choice || 'rock'} 
                    isPlayer={false} 
                    winner={roomState.gameState === 'roundResult' && roomState.roundWinner === opponentId} 
                    faceDown={roomState.gameState === 'playing' || roomState.gameState === 'revealing' || (roomState.gameState === 'roundResult' && !isRevealingLocal)} 
                    theme={opponentTheme}
                  />
                ) : (
                  <div className="w-16 sm:w-24 aspect-[3/4]" />
                )}
              </div>

            </div>
          )}
        </div>

        {/* Player Area */}
        <div className="flex-1 flex flex-col justify-center px-6 py-2 bg-[#F5F5F5]/5">
          <div className="flex justify-start items-end mb-2">
            <div className="text-right">
              <h2 className="text-white/80 text-xs sm:text-sm mb-1 font-display tracking-widest">{me.name}</h2>
              <div className="text-4xl sm:text-5xl font-display text-white drop-shadow-lg">{me.score}</div>
            </div>
          </div>
          <div className="flex justify-between gap-3 sm:gap-6 px-2">
             <PlayableCard 
               type="rock" 
               count={me.deck.rock + (me.choice === 'rock' && (roomState.gameState === 'playing' || roomState.gameState === 'revealing') ? 1 : 0)} 
               onClick={() => playCard('rock')} 
               disabled={roomState.gameState !== 'playing' || me.choice !== null} 
               theme={currentTheme} 
             />
             <PlayableCard 
               type="paper" 
               count={me.deck.paper + (me.choice === 'paper' && (roomState.gameState === 'playing' || roomState.gameState === 'revealing') ? 1 : 0)} 
               onClick={() => playCard('paper')} 
               disabled={roomState.gameState !== 'playing' || me.choice !== null} 
               theme={currentTheme} 
             />
             <PlayableCard 
               type="scissors" 
               count={me.deck.scissors + (me.choice === 'scissors' && (roomState.gameState === 'playing' || roomState.gameState === 'revealing') ? 1 : 0)} 
               onClick={() => playCard('scissors')} 
               disabled={roomState.gameState !== 'playing' || me.choice !== null} 
               theme={currentTheme} 
             />
          </div>
        </div>
      </div>

      {renderDebugUI()}
      {renderExitConfirm()}
    </div>
    </>
  );
}

const CardCount = memo(({ type, count, theme }: { type: CardType, count: number, theme: ThemeConfig }) => {
  const isAvailable = count > 0;
  return (
    <div className="flex-1 flex flex-col items-center gap-1 sm:gap-2 gpu-accelerated">
      <motion.div 
        animate={{ 
          opacity: isAvailable ? 1 : 0.15,
          filter: isAvailable ? 'grayscale(0%)' : 'grayscale(100%)',
          scale: isAvailable ? 1 : 0.94
        }}
        transition={{ duration: 0.05, ease: "linear" }}
        className={`w-full max-w-[4.5rem] aspect-[3/4] rounded-lg flex items-center justify-center gpu-accelerated overflow-hidden ${isAvailable ? `${theme.frontColor}` : 'bg-game-dark'}`}
      >
        <img 
          src={getCardImagePath(theme, type)} 
          alt={CARD_NAMES[type]} 
          className="w-2/3 h-2/3 object-contain" 
          style={{ transform: `scale(${(theme.iconScale || 100) / 100})` }}
          referrerPolicy="no-referrer" 
        />
      </motion.div>
      <motion.div 
        animate={{ 
          opacity: isAvailable ? 1 : 0.25,
          scale: isAvailable ? 1 : 0.94
        }}
        transition={{ duration: 0.05 }}
        className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-[10px] sm:text-xs font-bold rounded-md shadow-md ${isAvailable ? `${theme.counterBgColor} ${theme.counterTextColor}` : 'bg-game-dark text-game-cream/20'}`}
      >
        {count}
      </motion.div>
    </div>
  );
});

const PlayableCard = memo(({ type, count, onClick, disabled, theme }: { type: CardType, count: number, onClick: () => void, disabled: boolean, theme: ThemeConfig }) => {
  const isAvailable = count > 0;
  const isDull = !isAvailable || disabled;
  
  return (
    <motion.button
      whileHover={isAvailable && !disabled ? { y: -6, scale: 1.05, filter: 'brightness(1.15)' } : {}}
      whileTap={isAvailable && !disabled ? { scale: 0.88, y: 0 } : {}}
      animate={{ 
        opacity: isDull ? 0.3 : 1,
        filter: isDull ? 'grayscale(100%)' : 'grayscale(0%)',
        scale: isDull ? 0.94 : 1,
        y: 0
      }}
      transition={{ 
        type: 'spring',
        stiffness: 1000,
        damping: 50,
        mass: 0.3,
        opacity: { duration: 0.04 },
        filter: { duration: 0.04 }
      }}
      onClick={isAvailable && !disabled ? onClick : undefined}
      className={`flex-1 relative flex flex-col items-center gap-1 sm:gap-2 gpu-accelerated ${isDull ? 'cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <div className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-[10px] sm:text-xs font-bold rounded-md shadow-md ${isAvailable ? `${theme.counterBgColor} ${theme.counterTextColor}` : 'bg-game-dark text-game-cream/20'}`}>
        {count}
      </div>
      <div className={`w-full max-w-[7.5rem] aspect-[3/4] rounded-lg flex items-center justify-center overflow-hidden ${isAvailable && !disabled ? `${theme.frontColor}` : 'bg-game-dark'}`}>
        <img 
          src={getCardImagePath(theme, type)} 
          alt={CARD_NAMES[type]} 
          className="w-2/3 h-2/3 object-contain" 
          style={{ transform: `scale(${(theme.iconScale || 100) / 100})` }}
          referrerPolicy="no-referrer" 
        />
      </div>
      <span className="text-[10px] sm:text-xs font-display text-game-cream tracking-wider uppercase opacity-80">{CARD_NAMES[type]}</span>
    </motion.button>
  );
});

const PlayedCard = memo(({ type, isPlayer, winner, faceDown = false, theme }: { type: CardType, isPlayer: boolean, winner: boolean, faceDown?: boolean, theme: ThemeConfig }) => {
  return (
    <motion.div
      initial={{ 
        scale: 0.5, 
        opacity: 0, 
        x: 0, 
        y: isPlayer ? 400 : -400, 
        rotate: isPlayer ? -20 : 20,
        rotateY: 180
      }}
      animate={{ 
        scale: 1, 
        opacity: 1, 
        x: 0, 
        y: 0,
        rotateY: faceDown ? 180 : 0,
        rotate: 0
      }}
      transition={{ 
        type: 'spring', 
        damping: 25, 
        stiffness: 150,
        mass: 0.8,
        rotateY: { duration: 0.4, type: 'tween', ease: 'easeInOut' }
      }}
      style={{ transformStyle: 'preserve-3d' }}
      className="relative w-16 sm:w-24 aspect-[3/4] z-10"
    >
      {/* Front Side */}
      {winner && !faceDown && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="absolute -inset-4 z-0"
        >
          <div className={`absolute inset-0 ${theme.frontColor} blur-2xl opacity-20 animate-glow-pulse`} />
        </motion.div>
      )}
      <div 
        className={`absolute inset-0 rounded-lg flex items-center justify-center overflow-hidden backface-hidden ${theme.frontColor} ${
          winner 
            ? 'scale-110 transition-transform ring-2 ring-white/40 shadow-[0_0_30px_rgba(255,255,255,0.2)]'
            : ''
        }`}
        style={{ 
          backfaceVisibility: 'hidden',
          visibility: faceDown ? 'hidden' : 'visible'
        }}
      >
        <span className="relative z-10">
          <img 
            src={getCardImagePath(theme, type)} 
            alt={CARD_NAMES[type]} 
            className="w-10 h-10 sm:w-16 sm:h-16 object-contain drop-shadow-2xl" 
            style={{ transform: `scale(${(theme.iconScale || 100) / 100})` }}
            referrerPolicy="no-referrer" 
          />
        </span>
      </div>

      {/* Back Side (Face Down) */}
      <div 
        className={`absolute inset-0 rounded-lg flex items-center justify-center ${theme.backColor}`}
        style={{ 
          backfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)'
        }}
      >
        <div className={`relative w-full h-full rounded-sm flex items-center justify-center`}>
          {theme.backIcon === 'default' ? (
            <div className={`w-8 h-8 sm:w-12 sm:h-12 rounded-full flex items-center justify-center ${isPlayer ? 'bg-black/10' : 'bg-white/10'}`}>
              <div className={`w-4 h-4 sm:w-6 sm:h-6 rounded-full ${isPlayer ? 'bg-black/10' : 'bg-white/10'}`} />
            </div>
          ) : (
            <img src={getThemeBackIcon(theme)} alt="card back" className="w-1/2 h-1/2 object-contain opacity-50" />
          )}
        </div>
      </div>
    </motion.div>
  );
});

export default App;
