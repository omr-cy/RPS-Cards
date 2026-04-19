import React, { useState, useEffect, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, Globe, Home, Trophy, XCircle, Minus, Copy, Edit2, Bug, X, Wifi, ShieldCheck, Activity, ShoppingCart, User, LogIn, LogOut, Swords, PlusCircle, Mail, Lock, UserPlus, Info } from 'lucide-react';
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
  const vApi = import.meta.env.VITE_API_URL;
  const vBack = import.meta.env.VITE_BACKEND_URL;
  const sConfig = config.ONLINE_API_BASE_URL;
  if (vApi) return vApi;
  if (vBack) return vBack.replace(/^ws(s)?:\/\//, 'http$1://').replace(/\/$/, '');
  if (sConfig) return sConfig;
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
  return (
    <motion.div
      animate={{ 
        y: [0, -12, 0],
        rotate: idx % 2 === 0 ? [-2, 2, -2] : [2, -2, 2]
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut",
        delay: idx * 0.3
      }}
      className={`w-20 sm:w-36 aspect-[3/4] rounded-2xl shadow-xl flex items-center justify-center p-2 sm:p-3 ${theme.frontColor} border-2 border-white/20 relative gpu-accelerated`}
    >
      <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-30" />
      <img 
        src={getCardImagePath(theme, type)} 
        alt={type} 
        className="w-full h-full object-contain relative z-10 drop-shadow-lg" 
        referrerPolicy="no-referrer" 
      />
    </motion.div>
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

const CardPack = memo(({ theme, isOwned, isSelected, onClick, onSelect }: { 
  theme: ThemeConfig, 
  isOwned: boolean, 
  isSelected: boolean, 
  onClick: () => void,
  onSelect: () => void
}) => (
  <motion.div 
    whileTap={{ scale: 0.94 }}
    onClick={onClick}
    className="relative flex flex-col items-center cursor-pointer gpu-accelerated"
  >
    <div className="relative w-24 sm:w-32 aspect-[3/4] mb-4">
      <div className={`absolute inset-0 rounded-xl shadow-sm transform -rotate-3 translate-x-[-4%] translate-y-[2%] opacity-20 ${theme.frontColor} border border-white/5`} />
      <div className={`absolute inset-0 rounded-xl shadow-md flex flex-col items-center justify-center p-2 ${theme.frontColor} border-2 ${isSelected ? 'border-game-slate ring-2 ring-game-slate/20' : 'border-white/20'} z-10 overflow-hidden gpu-accelerated`}>
        <img src={getCardImagePath(theme, 'rock')} alt="rock" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
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
      {!isOwned ? (
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
  </motion.div>
));

const PackPreviewModal = memo(({ selectedPack, ownedThemes, selectedThemeId, onBuy, onSelect, onClose }: {
  selectedPack: ThemeConfig,
  ownedThemes: string[],
  selectedThemeId: string,
  onBuy: (theme: ThemeConfig) => void,
  onSelect: (id: string) => void,
  onClose: () => void
}) => (
  <div 
    className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90"
    onClick={onClose}
  >
    <div 
      className="bg-game-dark/90 w-full max-w-2xl rounded-3xl p-6 sm:p-10 border border-white/10 shadow-2xl relative overflow-hidden"
      onClick={e => e.stopPropagation()}
    >
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full opacity-10 ${selectedPack.frontColor}`} />
      <div className="relative z-10 flex flex-col items-center">
        <h2 className="text-3xl sm:text-4xl font-display text-game-offwhite mb-2">{selectedPack.name}</h2>
        <p className="text-game-offwhite/60 font-display mb-12">مجموعة البطاقات الكاملة</p>
        <div className="flex justify-center items-center gap-2 sm:gap-8 mb-16 w-full px-2">
          {['scissors', 'paper', 'rock'].map((type, idx) => (
            <FloatingCard key={type} theme={selectedPack} type={type as CardType} idx={idx} />
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
          {ownedThemes.includes(selectedPack.id) ? (
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={() => onSelect(selectedPack.id)}
              disabled={selectedThemeId === selectedPack.id}
              className={`flex-1 py-4 rounded-xl font-display text-2xl transition-all shadow-lg ${
                selectedThemeId === selectedPack.id 
                ? 'bg-game-teal/20 text-game-teal cursor-default border border-game-teal/30' 
                : 'bg-game-teal hover:bg-slate-600 text-white active:scale-95'
              }`}
            >
              {selectedThemeId === selectedPack.id ? 'مفعل حالياً' : 'تفعيل الثيم'}
            </motion.button>
          ) : selectedPack.id === 'robot' ? (
            <div className="flex-1 py-4 bg-game-slate/20 text-game-teal rounded-xl font-display text-xl border border-game-teal/30 flex items-center justify-center text-center">
              فتح عبر الفوز على الروبوت
            </div>
          ) : (
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={() => onBuy(selectedPack)}
              className="flex-1 py-4 bg-game-offwhite hover:bg-white text-black rounded-xl font-display text-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              شراء المجموعة <span className="text-yellow-600">{selectedPack.price} 🪙</span>
            </motion.button>
          )}
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={onClose} 
            className="flex-1 py-4 bg-game-slate/20 hover:bg-game-slate/40 text-game-offwhite rounded-xl font-display text-2xl transition-all border border-white/10"
          >
            إغلاق
          </motion.button>
        </div>
      </div>
    </div>
  </div>
));

const StoreView = memo(({ coins, ownedThemes, selectedThemeId, onBack, onBuy, onSelect, selectedPack, setSelectedPack }: {
  coins: number,
  ownedThemes: string[],
  selectedThemeId: string,
  onBack: () => void,
  onBuy: (theme: ThemeConfig) => void,
  onSelect: (id: string) => void,
  selectedPack: ThemeConfig | null,
  setSelectedPack: (theme: ThemeConfig | null) => void
}) => (
  <div 
    dir="rtl" 
    className="fixed inset-0 w-full h-full wood-texture text-game-cream flex flex-col p-4 sm:p-6 font-body overflow-x-hidden overflow-y-auto select-none relative"
    style={{
      paddingTop: 'env(safe-area-inset-top)',
      paddingBottom: 'env(safe-area-inset-bottom)',
      paddingLeft: 'env(safe-area-inset-left)',
      paddingRight: 'env(safe-area-inset-right)'
    }}
  >
    <div className="sticky top-0 z-50 wood-texture bg-game-dark/95 backdrop-blur-sm border-b border-white/10 flex justify-between items-center p-4 sm:p-6 mb-8">
      <button onClick={onBack} className="p-2 bg-game-dark/50 rounded-full text-game-cream hover:bg-game-dark border border-white/10 transition-all">
        <X className="w-6 h-6" />
      </button>
      <h1 className="text-3xl font-display text-game-offwhite tracking-wider">متجر الثيمات</h1>
      <div className="flex items-center gap-2 bg-game-dark/50 px-4 py-2 rounded-full border border-white/10">
        <span className="text-game-offwhite font-display text-xl">{coins}</span>
        <span className="text-yellow-500">🪙</span>
      </div>
    </div>

    <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-12 gap-x-6 max-w-4xl mx-auto w-full pb-20">
      {THEMES.map(theme => (
        <CardPack 
          key={theme.id}
          theme={theme}
          isOwned={ownedThemes.includes(theme.id)}
          isSelected={selectedThemeId === theme.id}
          onClick={() => setSelectedPack(theme)}
          onSelect={() => onSelect(theme.id)}
        />
      ))}
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

const ProfileView = memo(({ playerName, coins, ownedThemes, selectedThemeId, onBack, onSelect, selectedPack, setSelectedPack, onEditName, onLogout, onLoginClick, isGuest }: {
  playerName: string,
  coins: number,
  ownedThemes: string[],
  selectedThemeId: string,
  onBack: () => void,
  onSelect: (id: string) => void,
  selectedPack: ThemeConfig | null,
  setSelectedPack: (theme: ThemeConfig | null) => void,
  onEditName: () => void,
  onLogout: () => void,
  onLoginClick: () => void,
  isGuest?: boolean
}) => (
  <div 
    dir="rtl" 
    className="fixed inset-0 w-full h-full wood-texture text-game-cream flex flex-col p-4 sm:p-6 font-body overflow-x-hidden overflow-y-auto select-none"
    style={{
      paddingTop: 'env(safe-area-inset-top)',
      paddingBottom: 'env(safe-area-inset-bottom)',
      paddingLeft: 'env(safe-area-inset-left)',
      paddingRight: 'env(safe-area-inset-right)'
    }}
  >
    <div className="sticky top-0 z-50 wood-texture bg-game-dark/95 backdrop-blur-sm border-b border-white/10 flex justify-between items-center p-4 sm:p-6 mb-8">
      <button onClick={onBack} className="p-2 bg-game-dark/50 rounded-full text-game-cream hover:bg-game-dark border border-white/10 transition-all">
        <X className="w-6 h-6" />
      </button>
      <h1 className="text-3xl font-display text-game-offwhite tracking-wider">الملف الشخصي</h1>
      {!isGuest ? (
        <button 
          onClick={onLogout}
          className="p-2 bg-red-900/50 rounded-full text-red-200 hover:bg-red-800 border border-red-500/20 transition-all"
          title="تسجيل الخروج"
        >
          <LogOut className="w-6 h-6" />
        </button>
      ) : (
        <button 
          onClick={onLoginClick}
          className="flex items-center gap-2 bg-game-teal text-game-dark px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-display text-xs sm:text-sm shadow-md hover:bg-emerald-400 transition-all"
          title="تسجيل الدخول"
        >
          <LogIn className="w-4 h-4 sm:w-5 sm:h-5" /> دخول
        </button>
      )}
    </div>

    <div className="max-w-4xl mx-auto w-full space-y-8 pb-20">
      <div className="bg-gradient-to-br from-game-dark/95 to-game-dark/80 p-8 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-center gap-6 relative shadow-2xl">
        <div className="w-24 h-24 rounded-full bg-game-bg border-4 border-game-offwhite/5 flex items-center justify-center overflow-hidden shadow-inner">
          <User className="w-12 h-12 text-game-offwhite/20" />
        </div>
        <div className="flex-1 flex flex-col items-center sm:items-start text-center sm:text-right gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-display text-game-offwhite">{playerName}</h2>
            <button 
              onClick={onEditName}
              className="p-2 text-game-offwhite/40 hover:text-game-offwhite transition-all bg-white/5 rounded-lg border border-white/5"
              title="تعديل الاسم"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 bg-black/20 px-4 py-1.5 rounded-full border border-white/5">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <span className="text-xl font-display text-yellow-500">{coins}</span>
            <span className="text-sm text-game-offwhite/60 font-body">عملة ذهبية</span>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-display text-game-offwhite mb-6 border-b border-white/10 pb-2">مكتبة الثيمات</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-y-12 gap-x-6">
          {THEMES.filter(t => ownedThemes.includes(t.id)).map(theme => (
            <CardPack 
              key={theme.id}
              theme={theme}
              isOwned={true}
              isSelected={selectedThemeId === theme.id}
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
          onBuy={() => {}} // Already owned
          onSelect={onSelect}
          onClose={() => setSelectedPack(null)}
        />
      )}
  </div>
));

const App = () => {
  const { user, login, register, verifyCode, resendCode, logout, updateProfile, loading: authLoading, error: authError, pendingVerificationEmail, setPendingVerificationEmail } = useAuth();
  const [appState, setAppState] = useState<'loading' | 'auth' | 'menu' | 'store' | 'profile' | 'matchmaking' | 'game' | 'gameOver' | 'inRoom' | 'verifySent'>('loading');
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [menuTab, setMenuTab] = useState<'main' | 'online' | 'local'>('main');

  // Player Local State (Syncs with User Profile if logged in)
  const [playerName, setPlayerNameState] = useState(() => localStorage.getItem('cardclash_guestName') || 'محارب');
  const [selectedThemeId, setSelectedThemeIdState] = useState('normal');
  const [ownedThemes, setOwnedThemesState] = useState<string[]>(['normal']);
  const [coins, setCoinsState] = useState(100);

  // Sync state with auth user
  useEffect(() => {
    if (user && !authLoading) {
      setPlayerNameState(user.displayName);
      setCoinsState(user.coins);
      setOwnedThemesState(user.purchasedThemes);
      setSelectedThemeIdState(user.equippedTheme);
      if (appState === 'loading' || appState === 'auth') {
        setAppState('menu');
      }
    } else if (!user && !authLoading) {
      if (appState === 'loading') {
        setAppState('menu');
      }
    }
  }, [user, authLoading]);

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
    updateProfile({ displayName: name });
  };
  const setSelectedThemeId = (id: string) => {
    setSelectedThemeIdState(id);
    updateProfile({ equippedTheme: id });
  };
  const setOwnedThemes = (themes: string[]) => {
    setOwnedThemesState(themes);
    updateProfile({ purchasedThemes: themes });
  };
  const setCoins = (newCoins: number | ((prev: number) => number)) => {
    setCoinsState(prev => {
      const val = typeof newCoins === 'function' ? newCoins(prev) : newCoins;
      updateProfile({ coins: val });
      return val;
    });
  };

  const [ipInput, setIpInput] = useState('');
  const [roomIdInput, setRoomIdInput] = useState('');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomState, setRoomState] = useState<Room | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
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
  const selectedThemeIdRef = useRef<string>('normal');
  const appStateRef = useRef(appState);
  const roleRef = useRef(role);
  const onlineActionRef = useRef<any>(null);

  useEffect(() => {
    roomIdRef.current = roomId;
    roomStateRef.current = roomState;
    playerNameRef.current = playerName;
    selectedThemeIdRef.current = selectedThemeId;
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
          const reward = roomId === OFFLINE_BOT_ID ? 25 : 50; 
          setCoins(prev => prev + reward);
          addLog(`لقد فزت وربحت ${reward} 🪙 عملة!`, 'success');
          
          // Robot theme unlock logic
          if (roomId === OFFLINE_BOT_ID && !ownedThemes.includes('robot')) {
            setOwnedThemes([...ownedThemes, 'robot']);
            addLog('تهانينا! لقد فتحت ثيم الروبوت بالفوز على الكمبيوتر!', 'success');
          }
        } else if (me.score === opponent.score) {
          setCoins(prev => prev + 10);
          addLog('تعادل! حصلت على 10 🪙 عملات', 'info');
        }
      }
    }
  }, [roomState?.gameState, roomId, ownedThemes]);

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
        // 1. Priority: Close UI Modals/Overlays
        if (selectedPack) {
          setSelectedPack(null);
          return;
        }
        if (showDebug) {
          setShowDebug(false);
          return;
        }

        // 2. Priority: Secondary Screens -> Menu
        const secondaryStates = ['store', 'profile', 'matchmaking', 'verifySent', 'gameOver'];
        if (secondaryStates.includes(appState)) {
          setAppState('menu');
          setMenuTab('main');
          return;
        }

        // 3. Priority: Game/Room -> Menu (and handle exit)
        if (appState === 'game' || appState === 'inRoom') {
          // Typically we should show a confirmation, but for now we'll just go to menu
          // which should trigger existing cleanup logic
          setAppState('menu');
          setMenuTab('main');
          return;
        }

        // 4. Priority: Auth Tabs
        if (appState === 'auth') {
          if (authTab === 'register') {
            setAuthTab('login');
          } else {
            CapApp.exitApp();
          }
          return;
        }

        // 5. Priority: Menu Navigation
        if (appState === 'menu') {
          if (menuTab !== 'main') {
            setMenuTab('main');
          } else {
            CapApp.exitApp();
          }
          return;
        }

        // Default or fallthrough
        if (!data.canGoBack) {
          CapApp.exitApp();
        }
      });
      return listener;
    };

    const listenerPromise = handleBackButton();
    return () => {
      listenerPromise.then(l => l.remove());
    };
  }, [appState, selectedPack, showDebug, authTab, menuTab]);

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
            sendNativeAction({ type: 'host_join', playerName: playerNameRef.current, themeId: selectedThemeIdRef.current });
          } else if (status.role === 'CLIENT') {
            sendNativeAction({ type: 'join_game', playerName: playerNameRef.current, themeId: selectedThemeIdRef.current });
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
    addLog('Host button clicked', 'info');
    if (!playerName.trim()) {
      setErrorMsg('يرجى إدخال اسمك أولاً');
      return;
    }
    if (Capacitor.getPlatform() === 'web') {
      setErrorMsg('ميزة الاستضافة متاحة فقط في تطبيق الأندرويد');
      return;
    }
    try {
      await LocalServer.startServer({ port: config.LAN_PORT });
      // Native will send ROOM_READY when server is started
    } catch (e) {
      addLog(`Host failed: ${e}`, 'error');
      setErrorMsg('فشل بدء السيرفر');
    }
  };

  const isValidIp = (ip: string) => {
    return /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(ip);
  };

  const handleIpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    // Convert Arabic numerals to English numerals
    value = value.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
    // Remove any character that is not a digit or a dot
    value = value.replace(/[^0-9.]/g, '');
    setIpInput(value);
  };

  const joinGame = async () => {
    if (!isValidIp(ipInput.trim())) {
      setErrorMsg('يرجى إدخال عنوان IP صحيح');
      return;
    }
    if (Capacitor.getPlatform() === 'web') {
      setErrorMsg('ميزة الانضمام متاحة فقط في تطبيق الأندرويد');
      return;
    }
    try {
      await LocalServer.connectToServer({ ip: ipInput.trim(), port: config.LAN_PORT });
      // Native will send ROOM_READY after handshake is verified
    } catch (e) {
      addLog(`Join failed: ${e}`, 'error');
      setErrorMsg('فشل الاتصال بالسيرفر');
    }
  };

  const connectToOnline = (action?: any): Promise<WebSocket | void> => {
    return new Promise(async (resolve, reject) => {
      let serverUrl = import.meta.env.VITE_BACKEND_URL || config.ONLINE_SERVER_URL;
      
      // Fix: Don't force localhost if we are on Android Native, otherwise it breaks DuckDNS/External links
      if (!Capacitor.isNativePlatform() && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
          serverUrl = `ws://${window.location.host}/game-socket`;
      }
      
      if (Capacitor.isNativePlatform()) {
        try {
          addLog(`Connecting NATIVELY to online server: ${serverUrl}`, 'info');
          if (action) onlineActionRef.current = action;
          await LocalServer.connectToServer({ url: serverUrl, isOnline: true });
          resolve();
        } catch (e) {
          addLog(`Native online connection failed: ${e}`, 'error');
          setErrorMsg('فشل الاتصال عبر النيتف');
          reject(e);
        }
        return;
      }

      if (ws && ws.readyState === WebSocket.OPEN) {
        if (action) ws.send(JSON.stringify(action));
        resolve(ws);
        return;
      }
      
      addLog(`Connecting to online server: ${serverUrl}`, 'info');
      const socket = new WebSocket(serverUrl);
      
      const timeout = setTimeout(() => {
        if (socket.readyState !== WebSocket.OPEN) {
          socket.close();
          addLog('Connection timeout', 'error');
          setErrorMsg('انتهت مهلة المزامنة - تأكد من تشغيل السيرفر');
          reject(new Error('Timeout'));
        }
      }, 5000);

      socket.onopen = () => {
        clearTimeout(timeout);
        addLog('Connected to Cloud Server', 'success');
        setWs(socket);
        setConnectionStatus('CONNECTION_VERIFIED');
        if (action) socket.send(JSON.stringify(action));
        resolve(socket);
      };
      
      socket.onerror = (e) => {
        addLog(`WebSocket error: ${JSON.stringify(e)}`, 'error');
        setErrorMsg('فشل الاتصال بالسيرفر الأونلاين');
        reject(e);
      };
      
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'PING') {
            socket.send(JSON.stringify({ type: 'PONG' }));
            return;
          }
          handleOnlineMessage(data);
        } catch(err) {
          addLog(`Received non-JSON message: ${event.data}`, 'info');
        }
      };
      
      socket.onclose = () => {
        addLog('Disconnected from Cloud Server', 'info');
        setWs(null);
        setConnectionStatus('DISCONNECTED');
        setIsSearching(false);
        if (appStateRef.current === 'inRoom' && roleRef.current === 'ONLINE') {
          setAppState('menu');
          setRoomId(null);
          setRoomState(null);
          setRole('NONE');
          setErrorMsg('تم قطع الاتصال بالسيرفر');
        }
      };
    });
  };

  const handleOnlineMessage = (data: any) => {
      if (data.type === 'matchmaking_status') {
        setIsSearching(true);
      } else if (data.type === 'match_found' || data.type === 'joined_room_success' || data.type === 'room_created') {
        setIsSearching(false);
        setRole('ONLINE');
        setRoomId(data.roomId);
        if (data.roomCode) setRoomId(data.roomCode);
        setAppState('inRoom');
      } else if (data.type === 'room_state') {
        setRoomState(data.state);
        setRoomId(data.state.id);
        if (appStateRef.current !== 'inRoom') setAppState('inRoom');
      } else if (data.type === 'error_msg') {
        setErrorMsg(data.msg);
        setIsSearching(false);
      }
  };

  const startQuickMatch = () => {
    if (!playerNameRef.current.trim()) return setErrorMsg('يرجى إدخال اسمك أولاً');
    connectToOnline({ type: 'quick_match', playerName: playerNameRef.current.trim(), themeId: selectedThemeIdRef.current }).catch(() => {});
  };

  const cancelSearch = () => {
    sendNativeAction({ type: 'cancel_matchmaking' });
    setIsSearching(false);
  };

  const createOnlineRoom = () => {
    if (!playerNameRef.current.trim()) return setErrorMsg('يرجى إدخال اسمك أولاً');
    connectToOnline({ type: 'create_room', playerName: playerNameRef.current.trim(), themeId: selectedThemeIdRef.current }).catch(() => {});
  };

  const joinOnlineRoom = () => {
    if (!roomIdInput.trim()) return setErrorMsg('يرجى إدخال رمز الغرفة');
    if (!playerNameRef.current.trim()) return setErrorMsg('يرجى إدخال اسمك أولاً');
    connectToOnline({ type: 'join_room_by_code', roomCode: roomIdInput.trim(), playerName: playerNameRef.current.trim(), themeId: selectedThemeIdRef.current }).catch(() => {});
  };

  const createBotRoom = () => {
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

  const buyTheme = async (theme: ThemeConfig) => {
    if (ownedThemes.includes(theme.id)) return;
    if (coins >= theme.price) {
      const newCoins = coins - theme.price;
      const newOwned = [...ownedThemes, theme.id];
      
      // تحديث الحالة المحلية
      setCoins(newCoins);
      setOwnedThemes(newOwned);
      
      // مزامنة مع السيرفر إذا كان المستخدم مسجلاً
      if (user) {
        try {
          await updateProfile({ coins: newCoins, purchasedThemes: newOwned });
          addLog(`تم شراء وحفظ ثيم ${theme.name}`, 'success');
        } catch (err) {
          addLog(`خطأ في مزامنة الشراء: ${err}`, 'error');
          // استعادة الحالة في حال الفشل
          setCoins(coins);
          setOwnedThemes(ownedThemes);
        }
      } else {
        addLog(`تم شراء ثيم ${theme.name} (محلياً)`, 'success');
      }
    } else {
      setErrorMsg('عملات غير كافية!');
    }
  };

  const currentTheme = getTheme(selectedThemeId);

  const renderErrorToast = () => (
    <AnimatePresence>
      {errorMsg && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.1, ease: 'easeOut' }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md"
        >
          <div className="bg-game-red text-game-cream px-4 py-3 rounded-lg shadow-2xl flex items-center justify-between gap-3 border-4 border-game-dark">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-game-dark/30 flex items-center justify-center flex-shrink-0 border border-game-cream/20">
                <XCircle className="w-5 h-5" />
              </div>
              <p className="text-sm font-display tracking-widest leading-tight text-right">{errorMsg}</p>
            </div>
            <button 
              onClick={() => setErrorMsg(null)}
              className="p-1.5 hover:bg-game-dark/20 rounded-md transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const renderDebugUI = () => (
    <>
      {/* Debug Toggle Button */}
      <motion.button 
        drag
        dragMomentum={false}
        onClick={() => setShowDebug(true)} 
        className="fixed top-[45%] left-2 p-3 bg-game-dark/90 hover:bg-game-red text-game-cream rounded-md shadow-xl z-[60] transition-colors active:scale-90 flex items-center justify-center border-2 border-game-red/30 cursor-grab active:cursor-grabbing"
        title="سجل الأخطاء (يمكنك سحب الزر)"
      >
        <Bug className="w-5 h-5 pointer-events-none" />
      </motion.button>

      {/* Debug Overlay */}
      <AnimatePresence>
        {showDebug && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="fixed inset-0 z-[70] wood-texture flex flex-col p-4 font-mono text-xs"
            dir="ltr"
          >
            <div className="flex justify-between items-center mb-4 border-b-4 border-game-dark pb-2">
              <h3 className="text-game-cream font-display text-2xl tracking-widest" dir="rtl">سجل الأخطاء والاتصال</h3>
              <div className="flex gap-2">
                <button 
                  onClick={() => clearLogs()}
                  className="px-3 py-1 bg-game-red hover:bg-red-800 text-game-cream text-[10px] rounded-md font-display tracking-widest transition-colors"
                  dir="rtl"
                >
                  مسح السجل
                </button>
                <button onClick={() => setShowDebug(false)} className="p-1.5 bg-game-dark rounded-md text-game-cream hover:bg-game-bg border border-game-red/30 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 flex flex-col-reverse">
              <button 
                onClick={async () => {
                   addLog(`Testing Native Ping to: ${API_BASE_URL}/api/health`, 'info');
                   try {
                     const res = await CapacitorHttp.request({
                       url: `${API_BASE_URL}/api/health`,
                       method: 'GET'
                     });
                     addLog(`Ping Result: ${res.status}`, res.status === 200 ? 'success' : 'error');
                   } catch (e: any) {
                     addLog(`Ping Failed: ${e.message}`, 'error');
                   }
                }}
                className="p-3 bg-game-teal text-game-dark font-bold border-2 border-game-teal/50 rounded shadow-md"
              >
                Ping Server (Native)
              </button>
              {logs.length === 0 && (
                <div className="text-game-cream/40 text-center py-4 font-display italic tracking-widest" dir="rtl">لا يوجد سجلات حتى الآن</div>
              )}
              {logs.map(log => (
                <div key={log.id} className={`p-2 rounded border-2 break-words ${log.type === 'error' ? 'bg-game-red/10 border-game-red/30 text-game-red' : log.type === 'success' ? 'bg-game-teal/10 border-game-teal/30 text-game-teal' : 'bg-game-dark/50 border-game-dark text-game-cream'}`}>
                  <span className="opacity-50 mr-2">[{log.time}]</span>
                  {log.msg}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  if (appState === 'auth') {
    return (
      <div 
        dir="rtl" 
        className="fixed inset-0 w-full h-full wood-texture text-game-cream flex flex-col items-center justify-center p-4 sm:p-6 font-body overflow-hidden select-none"
      >
        <div 
          className="max-w-md w-full bg-game-dark/90 p-5 sm:p-8 rounded-2xl border border-white/10 shadow-2xl space-y-6"
        >
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-display text-game-offwhite">صراع البطاقات</h1>
            <p className="text-game-offwhite/50">{authTab === 'login' ? 'سجل دخولك للمنافسة' : 'أنشئ حسابك الجديد'}</p>
          </div>

          <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
            <button 
              onClick={() => { setAuthTab('login'); setErrorMsg(null); }}
              className={`flex-1 py-2 rounded-lg font-display transition-all ${authTab === 'login' ? 'bg-game-teal text-game-dark shadow-lg' : 'text-game-offwhite/40 hover:text-game-offwhite'}`}
            >
              تسجيل دخول
            </button>
            <button 
              onClick={() => { setAuthTab('register'); setErrorMsg(null); }}
              className={`flex-1 py-2 rounded-lg font-display transition-all ${authTab === 'register' ? 'bg-game-teal text-game-dark shadow-lg' : 'text-game-offwhite/40 hover:text-game-offwhite'}`}
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
                    onChange={(e) => setAuthName(e.target.value)}
                    required
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
                  onChange={(e) => setAuthEmail(e.target.value)}
                  required
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
                  onChange={(e) => setAuthPass(e.target.value)}
                  required
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
              className="w-full py-4 bg-game-offwhite hover:bg-white text-black rounded-xl font-display text-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {authSubmitting ? <Activity className="w-5 h-5 animate-spin" /> : authTab === 'login' ? <><LogIn className="w-5 h-5" /> دخول المعركة</> : <><UserPlus className="w-5 h-5" /> تسجيل جديد</>}
            </button>
          </form>
          
          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink-0 mx-4 text-game-offwhite/20 text-xs font-display uppercase tracking-widest">أو</span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          <button 
            onClick={() => {
              if (!playerName) setPlayerNameState('محارب');
              setAppState('menu');
            }}
            className="w-full py-3 bg-white/5 hover:bg-white/10 text-game-offwhite/60 rounded-xl font-display transition-all border border-white/10 active:scale-95 flex items-center justify-center gap-2"
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
          className="max-w-md w-full bg-game-dark/95 p-6 sm:p-10 rounded-3xl border border-game-teal/30 shadow-2xl text-center space-y-6"
        >
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

  if (appState === 'menu') {
    return (
      <>
        {renderErrorToast()}
        <div 
          dir="rtl" 
          className="fixed inset-0 w-full h-full wood-texture text-game-cream flex flex-col p-4 sm:p-6 font-body overflow-x-hidden overflow-y-auto select-none"
          style={{
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
            paddingLeft: 'env(safe-area-inset-left)',
            paddingRight: 'env(safe-area-inset-right)'
          }}
        >
          {/* Top Profile Bar */}
          <div className="w-full max-w-md mx-auto mb-8 flex justify-between items-center bg-game-dark/60 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
            <button 
              onClick={() => setAppState('profile')}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <div className="w-10 h-10 rounded-full bg-game-teal/20 border border-game-teal/30 flex items-center justify-center">
                <User className="w-5 h-5 text-game-teal" />
              </div>
              <div className="text-right">
                <div className="text-sm text-game-offwhite/40 leading-none mb-1 uppercase tracking-tighter">المحارب</div>
                <div className="text-lg font-display text-game-offwhite leading-none">{playerName}</div>
              </div>
            </button>
            <button 
              onClick={() => setAppState('store')}
              className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-full border border-white/5 hover:bg-black/40 transition-all"
            >
              <span className="text-lg font-display text-yellow-500">{coins}</span>
              <span className="text-sm">🪙</span>
              <PlusCircle className="w-4 h-4 text-game-teal ml-1" />
            </button>
          </div>

          <div
            className="max-w-md w-full text-center mx-auto"
          >
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-display mb-10 text-game-offwhite tracking-[0.2em] uppercase leading-tight">
              صراع البطاقات
            </h1>
            
            <div className="space-y-4 sm:space-y-5">
              {menuTab === 'main' && (
                <div
                  key="main"
                  className="flex flex-col gap-4 sm:gap-5"
                >
                  {!user && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 p-3 sm:p-4 rounded-xl flex items-start gap-3 w-full sm:w-[90%] mx-auto text-right mb-2 transition-all">
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
                  )}
                    <motion.button
                      whileTap={{ scale: 0.94 }}
                      onClick={() => setMenuTab('online')}
                      className="w-full sm:w-[90%] mx-auto py-3 sm:py-4 bg-game-teal text-game-dark hover:bg-emerald-400 rounded-lg font-display text-xl sm:text-2xl shadow-lg transition-all flex items-center justify-center gap-2 sm:gap-3"
                    >
                      <Globe className="w-5 h-5 sm:w-6 sm:h-6" /> لعب عبر الإنترنت
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.94 }}
                      onClick={() => setMenuTab('local')}
                      className="w-full sm:w-[90%] mx-auto py-3 sm:py-4 bg-game-offwhite hover:bg-white text-black rounded-lg font-display text-xl sm:text-2xl shadow-lg transition-all flex items-center justify-center gap-2 sm:gap-3"
                    >
                      <Home className="w-5 h-5 sm:w-6 sm:h-6" /> شبكة محلية (IP)
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.94 }}
                      onClick={createBotRoom}
                      className="w-full sm:w-[90%] mx-auto py-3 sm:py-4 bg-game-slate hover:bg-slate-600 text-white rounded-lg font-display text-xl sm:text-2xl shadow-lg transition-all flex items-center justify-center gap-2 sm:gap-3"
                    >
                      <Bot className="w-5 h-5 sm:w-6 sm:h-6" /> ضد الكمبيوتر
                    </motion.button>
                    <div className="flex w-full sm:w-[90%] mx-auto gap-3">
                      <motion.button
                        whileTap={{ scale: 0.94 }}
                        onClick={() => setAppState('store')}
                        className="flex-1 py-3 bg-game-dark/50 hover:bg-game-dark text-game-cream rounded-lg font-display text-lg sm:text-xl shadow-lg transition-all flex items-center justify-center gap-2 border border-white/10"
                      >
                        <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" /> المتجر
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.94 }}
                        onClick={() => setAppState('profile')}
                        className="flex-1 py-3 bg-game-dark/50 hover:bg-game-dark text-game-cream rounded-lg font-display text-lg sm:text-xl shadow-lg transition-all flex items-center justify-center gap-2 border border-white/10"
                      >
                        <User className="w-4 h-4 sm:w-5 sm:h-5" /> حسابي
                      </motion.button>
                    </div>
                  </div>
                )}

                {menuTab === 'online' && (
                  <div
                    key="online"
                    className="flex flex-col gap-6 w-full max-w-[340px] mx-auto px-2"
                  >
                    <button onClick={() => {
                        cancelSearch();
                        setMenuTab('main');
                      }} 
                      className="text-game-offwhite/40 hover:text-game-offwhite flex items-center gap-2 mb-2 w-fit transition-colors text-sm font-display tracking-widest group">
                      <span className="group-hover:-translate-x-1 transition-transform">➔</span> رجوع للخلف
                    </button>
                    
                    <div className="relative flex flex-col gap-6">
                        <>
                          {isSearching && (
                            <div
                              className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center rounded-xl border border-game-teal/30 shadow-[0_0_30px_rgba(20,184,166,0.15)]"
                            >
                              <div className="w-12 h-12 rounded-full border-2 border-game-teal/20 border-t-game-teal animate-spin mb-4"></div>
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

                          <div className="bg-game-dark/90 border border-white/10 p-6 rounded-xl shadow-xl">
                            <div className="flex items-center gap-3 mb-5">
                              <div className="p-2 bg-white/5 rounded-lg border border-game-teal/20">
                                <Swords className="w-6 h-6 text-game-teal" />
                              </div>
                              <div className="text-right">
                                <h3 className="text-game-cream font-display text-lg tracking-widest">بحث عشوائي</h3>
                                <p className="text-[10px] text-game-cream/40 font-body italic">اللعب ضد خصم عشوائي عالمياً</p>
                              </div>
                            </div>
                            <button
                               onClick={startQuickMatch}
                               disabled={isSearching}
                               className="w-full py-4 bg-game-teal hover:bg-emerald-400 text-game-dark rounded-xl font-display text-2xl shadow-lg transition-all active:scale-95 disabled:opacity-50"
                            >
                              مباراة سريعة
                            </button>
                          </div>

                          <div className="bg-game-dark/90 border border-white/10 p-6 rounded-xl shadow-xl">
                            <div className="flex items-center gap-3 mb-5">
                              <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                                <Globe className="w-6 h-6 text-game-offwhite" />
                              </div>
                              <div className="text-right">
                                <h3 className="text-game-cream font-display text-lg tracking-widest">غرفة خاصة</h3>
                                <p className="text-[10px] text-game-cream/40 font-body italic">العب مع أصدقائك برمز سري</p>
                              </div>
                            </div>

                            <button
                               onClick={createOnlineRoom}
                               disabled={isSearching}
                               className="w-full py-3 mb-6 bg-game-slate hover:bg-slate-600 text-white rounded-lg font-display text-lg transition-all active:scale-95 flex items-center justify-center gap-2 border border-white/10 disabled:opacity-50"
                            >
                              <PlusCircle className="w-5 h-5" /> إنشاء غرفة جديدة
                            </button>
                            
                            <div className="relative flex items-center mb-5">
                              <div className="flex-grow border-t border-white/10"></div>
                              <span className="flex-shrink-0 mx-3 text-white/30 font-display text-xs">أو انضمام برمز</span>
                              <div className="flex-grow border-t border-white/10"></div>
                            </div>

                            <div className="flex flex-col gap-4">
                              <input
                                 type="text"
                                 placeholder="مثال: AX72"
                                 value={roomIdInput}
                                 onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())}
                                 className="w-full bg-transparent border-0 border-b-2 border-white/30 rounded-none py-3 px-2 text-center text-2xl font-mono text-game-offwhite focus:outline-none focus:border-game-teal transition-all placeholder:text-white/10 uppercase tracking-[0.2em]"
                                 maxLength={4}
                                 disabled={isSearching}
                                 dir="ltr"
                              />
                              <AnimatePresence>
                                {roomIdInput.length === 4 && (
                                  <motion.button
                                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                    animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                    onClick={joinOnlineRoom}
                                    disabled={isSearching}
                                    className="w-full py-4 bg-game-teal hover:bg-emerald-400 text-game-dark rounded-xl font-display text-xl shadow-lg transition-all active:scale-95 overflow-hidden"
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
                    className="flex flex-col gap-6 w-full max-w-[340px] mx-auto px-2"
                  >
                    <button 
                      onClick={() => setMenuTab('main')} 
                      className="text-game-offwhite/40 hover:text-game-offwhite flex items-center gap-2 w-fit transition-colors text-sm font-display tracking-widest group mb-2"
                    >
                      <span className="group-hover:-translate-x-1 transition-transform">➔</span> رجوع للقائمة
                    </button>

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
                            <Globe className="w-5 h-5 text-game-offwhite" />
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
                        className="w-full py-3.5 bg-game-slate hover:bg-slate-600 text-white rounded-lg font-display text-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                        بدء الاستضافة (Host)
                      </button>
                      
                      <p className="text-[10px] text-game-cream/40 text-center mt-3 px-2 leading-relaxed opacity-70 font-body italic">
                        سيظهر الـ IP الخاص بك للاعبين الآخرين على نفس الشبكة للاتصال بك.
                      </p>
                    </div>

                    {/* Join Section */}
                    <div className="bg-game-dark/90 border border-white/10 p-6 rounded-xl shadow-2xl">
                      <div className="flex items-center gap-3 mb-5">
                        <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                          <Bot className="w-5 h-5 text-game-offwhite" />
                        </div>
                        <div className="text-right">
                          <h3 className="text-game-cream font-display text-lg tracking-widest">انضمام لصديق</h3>
                          <p className="text-[10px] text-game-cream/40 font-body italic">الاتصال بجهاز صديقك عبر الـ IP</p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-4">
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="مثال: 192.168.1.5"
                          value={ipInput}
                          onChange={handleIpChange}
                          className="w-full bg-transparent border-0 border-b-2 border-white/30 rounded-none py-3 px-2 text-center text-xl font-mono text-game-offwhite focus:outline-none focus:border-white transition-all placeholder:text-white/10"
                          dir="ltr"
                        />
                        {isValidIp(ipInput.trim()) && (
                          <div
                            style={{ transformOrigin: 'top' }}
                          >
                            <button
                              onClick={joinGame}
                              className="w-full py-4 bg-game-offwhite hover:bg-white text-black rounded-lg font-display text-2xl shadow-lg transition-all active:scale-95"
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
        {renderDebugUI()}
      </>
    );
  }

  if (appState === 'store') {
    return (
      <StoreView 
        coins={coins}
        ownedThemes={ownedThemes}
        selectedThemeId={selectedThemeId}
        onBack={() => setAppState('menu')}
        onBuy={buyTheme}
        onSelect={(id) => {
          setSelectedThemeId(id);
          setSelectedPack(null);
        }}
        selectedPack={selectedPack}
        setSelectedPack={setSelectedPack}
      />
    );
  }

  if (appState === 'profile') {
    return (
      <ProfileView 
        playerName={playerName}
        coins={coins}
        ownedThemes={ownedThemes}
        selectedThemeId={selectedThemeId}
        onBack={() => setAppState('menu')}
        onSelect={(id) => {
          setSelectedThemeId(id);
          setSelectedPack(null);
        }}
        selectedPack={selectedPack}
        setSelectedPack={setSelectedPack}
        onEditName={async () => {
          const newName = prompt('أدخل اسمك الجديد:', playerName);
          if (newName && newName.trim().length >= 2) {
             const trimmedName = newName.trim();
             if (user) {
               try {
                 await updateProfile({ displayName: trimmedName });
               } catch (err) {
                 setErrorMsg('فشل في تحديث الاسم على السيرفر');
               }
             } else {
               setPlayerNameState(trimmedName);
               localStorage.setItem('cardclash_guestName', trimmedName);
             }
          }
        }}
        onLogout={() => {
          logout();
        }}
        onLoginClick={() => {
          setAppState('auth');
          setAuthTab('login');
        }}
        isGuest={!user}
      />
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
              {role === 'HOST' ? (
                <button
                  onClick={() => navigator.clipboard.writeText(userIp)}
                  className="w-full py-4 bg-game-offwhite hover:bg-white text-black rounded-lg font-display text-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" /> نسخ عنوان الـ IP
                </button>
              ) : (
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
        <header className="flex justify-between items-center px-4 py-1.5 bg-[#121212]/90 shadow-xl z-20">
          <div className="flex items-center gap-2">
            <button 
              onClick={leaveRoom}
              className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-game-offwhite"
              title="خروج"
            >
              <XCircle className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <div className="flex flex-col">
              <h1 className="text-lg sm:text-xl font-display text-game-offwhite tracking-wider drop-shadow-md">
                صراع البطاقات
              </h1>
              <span className="text-[8px] sm:text-[9px] text-game-offwhite/50 font-display italic leading-none">{roomState.isBotRoom ? 'لعب فردي' : 'لعب محلي'}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] sm:text-[9px] text-game-offwhite font-display tracking-widest bg-white/5 px-1.5 py-0.5 rounded">
              قيمة الفوز: {roomState.round === 9 ? 2 : 1}
            </span>
            <span className="bg-white/5 px-2 sm:px-3 py-0.5 rounded text-[9px] sm:text-10px font-display text-game-offwhite tracking-widest">
              الجولة: {roomState.round}
            </span>
          </div>
        </header>

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
             <CardCount type="rock" count={opponent?.deck.rock || 0} theme={opponentTheme} />
             <CardCount type="paper" count={opponent?.deck.paper || 0} theme={opponentTheme} />
             <CardCount type="scissors" count={opponent?.deck.scissors || 0} theme={opponentTheme} />
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
             <PlayableCard type="rock" count={me.deck.rock} onClick={() => playCard('rock')} disabled={roomState.gameState !== 'playing' || me.choice !== null} theme={currentTheme} />
             <PlayableCard type="paper" count={me.deck.paper} onClick={() => playCard('paper')} disabled={roomState.gameState !== 'playing' || me.choice !== null} theme={currentTheme} />
             <PlayableCard type="scissors" count={me.deck.scissors} onClick={() => playCard('scissors')} disabled={roomState.gameState !== 'playing' || me.choice !== null} theme={currentTheme} />
          </div>
        </div>
      </div>

      {renderDebugUI()}
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
        <img src={getCardImagePath(theme, type)} alt={CARD_NAMES[type]} className="w-2/3 h-2/3 object-contain" referrerPolicy="no-referrer" />
      </motion.div>
      <motion.div 
        animate={{ 
          opacity: isAvailable ? 1 : 0.25,
          backgroundColor: isAvailable ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,0.4)'
        }}
        transition={{ duration: 0.05 }}
        className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-[10px] sm:text-xs font-display rounded-md ${isAvailable ? `${theme.counterBgColor} ${theme.counterTextColor}` : 'text-game-cream/20'}`}
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
        <img src={getCardImagePath(theme, type)} alt={CARD_NAMES[type]} className="w-2/3 h-2/3 object-contain" referrerPolicy="no-referrer" />
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
          <img src={getCardImagePath(theme, type)} alt={CARD_NAMES[type]} className="w-10 h-10 sm:w-16 sm:h-16 object-contain drop-shadow-2xl" referrerPolicy="no-referrer" />
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
