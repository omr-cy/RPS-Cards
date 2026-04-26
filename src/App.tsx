import React, { useState, useEffect, useLayoutEffect, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, Globe, Home, Diamond, XCircle, CheckCircle2, Minus, Copy, Edit2, Bug, X, Wifi, ShieldCheck, Activity, ShoppingCart, User, LogIn, LogOut, Users, UserSearch, PlusCircle, Mail, Lock, UserPlus, Info, ArrowRight, ArrowLeft, ChevronRight, ChevronLeft, Network as NetworkIcon, PlugZap, Brain, Zap, Sparkles, UserMinus, Gift, Library, Backpack, Gamepad2, Settings, MessageCircle, RefreshCw } from 'lucide-react';
import { TbCardsFilled } from 'react-icons/tb';
import { IoMdSend } from 'react-icons/io';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Network } from '@capacitor/network';
import { App as CapApp } from '@capacitor/app';
import { registerPlugin, Capacitor, CapacitorHttp } from '@capacitor/core';
import config from './config.json';
import { getApiUrl } from './env_config';
import { useAuth } from './contexts/AuthContext';
import { useDebug, LogEntry } from './contexts/DebugContext';
import { useLanguage } from './contexts/LanguageContext';

const API_BASE_URL = getApiUrl();

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
import { RewardAnimationOverlay, Reward } from './components/effects/RewardAnimation';

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
  gameState: 'waiting' | 'playing' | 'revealing' | 'roundResult' | 'gameOver' | 'opponentLeft';
  round: number;
  roundWinner: string | 'draw' | null;
  timeLeft?: number;
}



// Removed hardcoded LAN_PORT, now using config.LAN_PORT
const OFFLINE_BOT_ID = 'OFFLINE_BOT';
const INITIAL_DECK: Deck = { rock: 3, paper: 3, scissors: 3 };

// Removed local LogEntry interface


import { FloatingCard } from './components/game/FloatingCard';
import { GameTimer } from './components/game/GameTimer';
import { CardCount } from './components/game/CardCount';
import { PlayableCard } from './components/game/PlayableCard';
import { PlayedCard } from './components/game/PlayedCard';

import { SettingsSidebar } from './components/layout/SettingsSidebar';
import { GlobalNavbar } from './components/layout/GlobalNavbar';
import { BottomNavbar } from './components/layout/BottomNavbar';

import { PrivateRoomLobbyView } from './components/lobby/PrivateRoomLobbyView';
import { MatchmakingView } from './components/lobby/MatchmakingView';

import { CardPack } from './components/store/CardPack';
import { PackPreviewModal } from './components/store/PackPreviewModal';

import { XPBar } from './components/profile/XPBar';
import { LevelUpModal } from './components/profile/LevelUpModal';

import { StoreView } from './pages/StoreView';
import { ProfileView } from './pages/ProfileView';
import { CommunityView } from './pages/CommunityView';
import { LeaderboardContent } from './pages/LeaderboardContent';
import { GlobalChat } from './components/community/GlobalChat';
import { CARD_NAMES } from './lib/constants';
const DashboardViewPager = ({ appState, setAppState, onVisibleTabChange, children }: { appState: string, setAppState: (state: any) => void, onVisibleTabChange: (tab: string) => void, children: React.ReactNode }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScroll = useRef(false);
  const isInitialMount = useRef(true);
  const lastVisibleTab = useRef('menu');

  // Initial Sync
  useLayoutEffect(() => {
    isProgrammaticScroll.current = true;
    const container = scrollRef.current;
    
    const snapToMenu = () => {
      if (container && container.children[1]) {
        container.style.scrollBehavior = 'auto';
        container.children[1].scrollIntoView({ behavior: 'auto', inline: 'center', block: 'nearest' });
        // Clean up inline style to allow CSS smooth scrolling if any
        container.style.scrollBehavior = '';
      }
    };

    snapToMenu();
    
    requestAnimationFrame(() => {
      snapToMenu();
      setTimeout(() => {
        isProgrammaticScroll.current = false;
        isInitialMount.current = false;
      }, 100);
    });
  }, []);

  // Sync React State -> Scroll Position
  useEffect(() => {
    const idx = appState === 'store' ? 0 : (appState === 'menu' || appState === 'loading') ? 1 : 2;
    const container = scrollRef.current;
    if (!container || !container.children[idx]) return;

    const child = container.children[idx] as HTMLElement;
    const scrollAbs = Math.abs(container.scrollLeft);
    const clientWidth = container.clientWidth;
    if (clientWidth === 0) return;
    const expectedScrollAbs = idx * clientWidth;

    if (Math.abs(scrollAbs - expectedScrollAbs) > 5) {
      isProgrammaticScroll.current = true;
      child.scrollIntoView({ 
        behavior: isInitialMount.current ? 'auto' : 'smooth', 
        inline: 'center', 
        block: 'nearest' 
      });
      
      setTimeout(() => {
        isProgrammaticScroll.current = false;
      }, 500); 
    }
  }, [appState]);

  // Sync Native Scroll Position -> React State
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isProgrammaticScroll.current) return;

    const container = e.currentTarget;
    const scrollAbs = Math.abs(container.scrollLeft);
    const clientWidth = container.clientWidth;
    if (clientWidth === 0) return;
    
    const closestIdx = Math.round(scrollAbs / clientWidth);
    const visibleTab = closestIdx === 0 ? 'store' : closestIdx === 1 ? 'menu' : 'profile';

    // Only set if changed to avoid massive re-renders
    if (lastVisibleTab.current !== visibleTab) {
      lastVisibleTab.current = visibleTab;
      onVisibleTabChange(visibleTab);
    }
    
    // Only dispatch appState change if we've actually snapped to prevent bouncy useEffect loops
    if (Math.abs(scrollAbs - (closestIdx * clientWidth)) < 5) {
      if (visibleTab !== appState) {
         isProgrammaticScroll.current = true;
         setAppState(visibleTab);
         setTimeout(() => {
           isProgrammaticScroll.current = false;
         }, 50);
      }
    }
  };

  return (
    <div 
      ref={scrollRef}
      onScroll={handleScroll}
      className="fixed inset-0 w-full h-full flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] z-0 wood-texture text-game-cream font-body overscroll-behavior-x-none transform-gpu"
      dir="rtl"
      style={{ 
        WebkitOverflowScrolling: 'touch',
        willChange: 'scroll-position'
      }}
    >
      {React.Children.toArray(children).map((child, idx) => (
        <div key={idx} className="w-full h-full shrink-0 snap-center snap-always relative overflow-hidden transform-gpu">
          {child}
        </div>
      ))}
    </div>
  );
};

const App = () => {
  const { user, login, register, verifyCode, resendCode, logout, updateProfile, refreshProfile, loading: authLoading, error: authError, pendingVerificationEmail, setPendingVerificationEmail } = useAuth();
  const { t, isRTL, language } = useLanguage();
  const [appState, setAppState] = useState<'loading' | 'auth' | 'menu' | 'store' | 'profile' | 'matchmaking' | 'game' | 'gameOver' | 'inRoom' | 'verifySent' | 'community'>('loading');
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [isFirstLaunch, setIsFirstLaunch] = useState(() => !localStorage.getItem('cardclash_has_initialized_assets_v3'));
  const [assetProgress, setAssetProgress] = useState(0);
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [menuTab, setMenuTab] = useState<'online' | 'local' | 'bot'>('online');
  const [showSettingsSidebar, setShowSettingsSidebar] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  useEffect(() => {
    const totalAssets = THEMES.length * 4;
    assetPreloader.setTotal(totalAssets);
    
    assetPreloader.setOnProgress((progress) => {
      setAssetProgress(progress);
    });

    const initAssets = async () => {
      const promises = [];
      const isFirst = !localStorage.getItem('cardclash_has_initialized_assets_v3');
      for (const theme of THEMES) {
        for (const type of ['rock', 'paper', 'scissors', 'back']) {
           const ext = theme.extension || 'svg';
           promises.push(assetPreloader.preloadImage(`${theme.path}/${type}.${ext}`, isFirst));
        }
      }
      await Promise.all(promises);
      if (isFirst) {
        localStorage.setItem('cardclash_has_initialized_assets_v3', 'true');
      }
      
      const privacyAccepted = localStorage.getItem('cardclash_privacyAccepted');
      if (!privacyAccepted) {
        setShowPrivacyModal(true);
      }
      
      setAssetsLoaded(true);
    };

    initAssets();
  }, []);

  const [editNameInput, setEditNameInput] = useState('');
  const [showEditNameDialog, setShowEditNameDialog] = useState(false);
  const [visibleTab, setVisibleTab] = useState<'store'|'menu'|'profile'>('menu');
  const [showLevelUp, setShowLevelUp] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [isBotLoading, setIsBotLoading] = useState(false);
  const [isWaitingInPrivateRoom, setIsWaitingInPrivateRoom] = useState(false);

  // Network Status Listener
  useEffect(() => {
    Network.getStatus().then(status => setIsOnline(status.connected));
    const handlePromise = Network.addListener('networkStatusChange', status => {
      setIsOnline(status.connected);
      addLog(`${t('log_network_status')}${status.connected ? t('log_connected') : t('log_disconnected')}`, status.connected ? 'success' : 'error');
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
  const [playerName, setPlayerNameState] = useState(() => localStorage.getItem('cardclash_guestName') || t('nav_play'));
  const [botSettings, setBotSettings] = useState(() => {
    const saved = localStorage.getItem('cardclash_botSettings');
    return saved ? JSON.parse(saved) : { theme: 'robot', difficulty: 'normal', timeLimit: 15 };
  });

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
  const [competitionPoints, setCompetitionPointsState] = useState(() => {
    const stored = localStorage.getItem('cardclash_competitionPoints');
    return stored ? parseInt(stored, 10) : 0;
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
    localStorage.setItem('cardclash_competitionPoints', competitionPoints.toString());
    localStorage.setItem('cardclash_xp', xp.toString());
    localStorage.setItem('cardclash_level', level.toString());
  }, [playerName, selectedThemeId, ownedThemes, coins, competitionPoints, xp, level]);

  // Sync state with auth user (Initial load only)
  const isProfileInitialized = useRef(false);
  const lastSyncPayload = useRef<string | null>(null);

  useEffect(() => {
    if (user && !authLoading && !isProfileInitialized.current) {
      setPlayerNameState(user.displayName);
      setPlayerId(user._id);
      setCoinsState(user.coins);
      setCompetitionPointsState(user.competitionPoints || 0);
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
      setAuthSuccessMsg(t('msg_verification_success'));
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
    localStorage.setItem('cardclash_selectedThemeId', id);
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
  const [userIp, setUserIp] = useState<string>(t('general_loading'));
  const [isSearching, setIsSearching] = useState(false);
  const [matchmakingCanCancel, setMatchmakingCanCancel] = useState(false);
  const [matchmakingOpponent, setMatchmakingOpponent] = useState<any>(null);
  const [showMatchmakingResult, setShowMatchmakingResult] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  
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
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [unreadChat, setUnreadChat] = useState(false);
  const [pendingRewards, setPendingRewards] = useState<Reward[]>([]);
  const [rewardSourceRect, setRewardSourceRect] = useState<DOMRect | null>(null);
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
  const lastMatchResultId = useRef<string | null>(null);

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
      // Use a combination of roomId and a timestamp or unique session to avoid double trigger
      const matchKey = `${roomId}-${roomState.round}`; 
      if (lastMatchResultId.current === matchKey) return;
      lastMatchResultId.current = matchKey;

      const me = roomState.players.me || (Object.values(roomState.players) as Player[]).find(p => p.id === 'me' || p.name === playerName);
      const opponent = (Object.values(roomState.players) as Player[]).find(p => p.id !== (me ? me.id : ''));
      
      if (me && opponent) {
        if (me.score > opponent.score) {
          const isBot = roomId === OFFLINE_BOT_ID;
          const coinsReward = isBot ? 25 : 50;
          const pointsReward = isBot ? 5 : 15;
          
          const newRewards: Reward[] = [
            { id: `coins-${Date.now()}`, type: 'coins', amount: coinsReward },
            { id: `points-${Date.now()}`, type: 'points', amount: pointsReward }
          ];

          if (isBot && !ownedThemes.includes('robot')) {
            newRewards.push({ id: `item-robot-${Date.now()}`, type: 'item', amount: 1, icon: 'robot' });
          }

          // Trigger rewards animation
          setPendingRewards(newRewards);
          
          if (role !== 'ONLINE' || !user) {
            // Log messages
            addLog(t('log_win_reward').replace('{amount}', coinsReward.toString()), 'success');
          } else if (role === 'ONLINE' && user) {
            addLog(t('log_win_reward').replace('{amount}', '50'), 'success');
          }
        } else if (me.score === opponent.score) {
          if (role !== 'ONLINE' || !user) {
             setPendingRewards([{ id: `coins-draw-${Date.now()}`, type: 'coins', amount: 10 }]);
             addLog(t('log_draw_reward'), 'info');
          }
        }
      }
    } else if (roomState?.gameState === 'playing') {
      // Reset trigger when a new match starts
      lastMatchResultId.current = null;
    }
  }, [roomState?.gameState, roomId, role, user, ownedThemes]);

  const handleRewardComplete = (reward: Reward) => {
    if (reward.type === 'coins') {
      setCoins(prev => prev + reward.amount);
    } else if (reward.type === 'points') {
      setCompetitionPoints(prev => prev + reward.amount);
    } else if (reward.type === 'item' && reward.icon === 'robot') {
      setOwnedThemes([...ownedThemes, 'robot']);
      addLog(t('log_bot_theme_unlock'), 'success');
    }

    setPendingRewards(prev => {
      const remaining = prev.filter(r => r.id !== reward.id);
      if (remaining.length === 0) setRewardSourceRect(null);
      return remaining;
    });
  };

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
        const secondaryStates = ['store', 'profile', 'matchmaking', 'verifySent', 'gameOver', 'community'];
        if (secondaryStates.includes(appState)) {
          setAppState('menu');
          setMenuTab('online');
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
          if (menuTab !== 'online') {
            setMenuTab('online');
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
      let thinkingTime = 600 + Math.random() * 1200; 
      if (botSettings.difficulty === 'hard') thinkingTime = 1200 + Math.random() * 1500; // wait longer to potentially "see" user
      if (botSettings.difficulty === 'easy') thinkingTime = 400 + Math.random() * 500; // very fast

      const timer = setTimeout(() => {
        setRoomState(prev => {
          if (!prev || prev.id !== OFFLINE_BOT_ID || prev.gameState !== 'playing' || prev.players.bot.choice) return prev;
          
          const nextState = JSON.parse(JSON.stringify(prev));
          const bot = nextState.players.bot;
          const me = nextState.players.me;
          
          const availableBotCards = (Object.keys(bot.deck) as CardType[]).filter(t => bot.deck[t] > 0);
          if (availableBotCards.length === 0) return prev;
          
          let botChoice = availableBotCards[Math.floor(Math.random() * availableBotCards.length)];

          // Basic "cheating" AI based on difficulty:
          if (me.choice) {
            const r = Math.random();
            const winningAgainstMe = me.choice === 'rock' ? 'paper' : me.choice === 'paper' ? 'scissors' : 'rock';
            const losingAgainstMe = me.choice === 'rock' ? 'scissors' : me.choice === 'paper' ? 'rock' : 'paper';
            
            if (botSettings.difficulty === 'hard' && r < 0.4 && availableBotCards.includes(winningAgainstMe)) {
              botChoice = winningAgainstMe; // 40% chance to guarantee win if user chose first
            } else if (botSettings.difficulty === 'easy' && r < 0.4 && availableBotCards.includes(losingAgainstMe)) {
              botChoice = losingAgainstMe; // 40% chance to guarantee lose if user chose first
            }
          }

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
  }, [roomState?.gameState, roomState?.round, roomState?.id, botSettings.difficulty]);

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
    } else if (data.type === 'matchmaking_status' || data.type === 'match_found' || data.type === 'joined_room_success' || data.type === 'pong' || data.type === 'PONG' || data.type === 'HANDSHAKE_OK' || data.type === 'chat_message' || data.type === 'chat_history') {
      handleOnlineMessage(data);
    } else if (data.type === 'room_state') {
      setRoomState(data.state);
      setRoomId(data.state.id);
      setIsSearching(false);
      setIsActionLoading(false);
      setAppState('inRoom');
    } else if (data.type === 'room_created') {
      setRoomId(data.roomId);
      setIsSearching(false);
      setIsActionLoading(false);
      if (roleRef.current === 'ONLINE') setAppState('inRoom');
    } else if (data.type === 'error_msg') {
      setErrorMsg(data.msg);
      addLog(`Server Error: ${data.msg}`, 'error');
      setIsSearching(false);
      setIsActionLoading(false);
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
          await StatusBar.setOverlaysWebView({ overlay: true });
          await StatusBar.setStyle({ style: Style.Dark });
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
        setUserIp(t('error_no_internet'));
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
      setUserIp(t('lan_error_get_ip'));
      addLog('Failed to fetch any IP address', 'error');
    }
  };

  useEffect(() => {
    fetchIp();
  }, []);

  const hostGame = async () => {
    await LanAndroidService.hostGame(playerName, addLog, setErrorMsg, t);
  };

  const isValidIp = (ip: string) => LanAndroidService.isValidIp(ip);

  const handleIpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIpInput(LanAndroidService.handleIpChange(e.target.value));
  };

  const joinGame = async () => {
    await LanAndroidService.joinGame(ipInput, addLog, setErrorMsg, t);
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
      setRole,
      t
    });
  };

  const handleOnlineMessage = (data: any) => {
    if (data.type === 'chat_message') {
       setChatMessages(prev => {
         const newMsgs = [...prev, data.message];
         if (newMsgs.length > 50) newMsgs.shift();
         return newMsgs;
       });
       if (appStateRef.current !== 'community') {
         setUnreadChat(true);
       }
       return;
    }

    if (data.type === 'chat_history') {
       setChatMessages(data.messages);
       return;
    }
    
    OnlineAndroidService.handleOnlineMessage(data, {
      setIsSearching,
      setRole,
      setRoomId,
      setAppState,
      setRoomState,
      setErrorMsg,
      setShowLevelUp,
      refreshProfile,
      appStateRef,
      setMatchmakingOpponent,
      setShowMatchmakingResult,
      setIsWaitingInPrivateRoom,
      roleRef,
      setMatchmakingCanCancel
    });
  };

  const startQuickMatch = () => {
    if (!playerNameRef.current.trim()) return setErrorMsg(t('error_enter_name'));
    setIsSearching(true);
    setMatchmakingCanCancel(false);
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
    setShowMatchmakingResult(false);
    setMatchmakingOpponent(null);
    leaveRoom();
  };

  const createOnlineRoom = () => {
    if (!playerNameRef.current.trim()) return setErrorMsg(t('error_enter_name'));
    setIsActionLoading(false); // Ensure old overlay is hidden
    setIsWaitingInPrivateRoom(true);
    setMatchmakingCanCancel(false);
    connectToOnline({ 
      type: 'create_room', 
      playerName: playerNameRef.current.trim(), 
      playerId: playerIdRef.current,
      themeId: selectedThemeIdRef.current 
    }).catch((err) => {
      setIsWaitingInPrivateRoom(false);
      setErrorMsg(err.message || t('error_room_create_fail'));
    });
  };

  const joinOnlineRoom = () => {
    if (!roomIdInput.trim()) return setErrorMsg(t('error_enter_room_code'));
    if (!playerNameRef.current.trim()) return setErrorMsg(t('error_enter_name'));
    setIsActionLoading(true);
    connectToOnline({ 
      type: 'join_room_by_code', 
      roomCode: roomIdInput.trim(), 
      playerName: playerNameRef.current.trim(), 
      playerId: playerIdRef.current,
      themeId: selectedThemeIdRef.current 
    }).catch(() => {
      setIsActionLoading(false);
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
          me: { id: 'me', name: playerName.trim() || t('player_default_name'), themeId: selectedThemeId, deck: { ...INITIAL_DECK }, score: 0, choice: null, readyForNext: false },
          bot: { id: 'bot', name: t('bot_default_name'), themeId: botSettings.theme, deck: { ...INITIAL_DECK }, score: 0, choice: null, readyForNext: true }
        },
        gameState: 'playing',
        round: 1,
        roundWinner: null,
        timeLeft: botSettings.timeLimit === 0 ? 9999 : botSettings.timeLimit // 0 means unlimited
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
      setErrorMsg(t('log_copy_room_code'));
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
          me: { id: 'me', name: playerName.trim() || t('player_default_name'), themeId: selectedThemeId, deck: { ...INITIAL_DECK }, score: 0, choice: null, readyForNext: false },
          bot: { id: 'bot', name: t('bot_default_name'), themeId: 'robot', deck: { ...INITIAL_DECK }, score: 0, choice: null, readyForNext: true }
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

    // Perform Native (Background) Cleanup FIRST before closing the socket natively
    try {
      if (currentRoomId && currentRoomId !== OFFLINE_BOT_ID) {
        if (currentRole !== 'HOST') {
          // Await so it has time to send before WS destroys itself.
          await sendNativeAction({ type: 'leave_room', roomId: currentRoomId });
        }
      }
      if (Capacitor.isNativePlatform()) {
        await LocalServer.stopAll();
      }
    } catch (e) {
      console.warn('Native cleanup failed:', e);
    }

    // 1. Reset UI State
    setRoomId(null);
    setRoomState(null);
    setAppState('menu');
    setConnectionStatus('DISCONNECTED');
    setRole('NONE');
    roleRef.current = 'NONE';
    appStateRef.current = 'menu';

    // Close Web WebSocket if exists
    if (ws) {
      ws.close();
      setWs(null);
    }
  };

  const findNewMatch = async () => {
    await leaveRoom();
    startQuickMatch();
  };

  const handleForceRefreshData = async () => {
    if (!user?._id) return;
    try {
      addLog('Fetching latest database values...', 'info');
      const response = await fetch(`${API_BASE_URL}/api/profile/${user._id}`);
      if (response.ok) {
        const data = await response.json();
        // Immediately adopt DB truth
        setPlayerNameState(data.displayName);
        setCoinsState(data.coins);
        setXpState(data.xp || 0);
        setLevelState(data.level || 1);
        setOwnedThemesState(data.purchasedThemes);
        setSelectedThemeIdState(data.equippedTheme);
        // Force the local sync flag to skip the background sync pushing to DB for an instant
        if (lastSyncPayload.current) {
          lastSyncPayload.current = JSON.stringify({
            displayName: data.displayName,
            coins: data.coins,
            purchasedThemes: data.purchasedThemes,
            equippedTheme: data.equippedTheme
          });
        }
        await refreshProfile();
        addLog('Profile synced from database successfully.', 'success');
      }
    } catch (e) {
      console.error(e);
      addLog('Failed to sync from database.', 'error');
    }
  };

  const buyTheme = async (theme: ThemeConfig) => {
    if (ownedThemes.includes(theme.id)) {
      setErrorMsg(t('store_error_owned'));
      return;
    }
    if (level < (theme.requiredLevel || 1)) {
      setErrorMsg(t('store_error_level').replace('{level}', (theme.requiredLevel || 1).toString()));
      return;
    }
    if (coins < theme.price) {
      setErrorMsg(t('store_error_coins'));
      return;
    }

    const newCoins = coins - theme.price;
    const newOwned = [...ownedThemes, theme.id];
    
    setCoinsState(newCoins);
    setOwnedThemesState(newOwned);
    setSuccessMsg(t('store_success_buy'));
    
    addLog(t('log_theme_bought_local'), 'success');
  };

  const currentTheme = getTheme(selectedThemeId);

  const renderErrorToast = () => {
    // Suppress intrusive network error toasts since we have the top offline bar
    const isNetworkError = errorMsg && (errorMsg.includes(t('error_connection')) || errorMsg.includes('Network Error') || errorMsg.includes('Network request failed'));
    if (isNetworkError) return null;

    return (
    <AnimatePresence>
      {(errorMsg || successMsg) && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[300] w-auto min-w-[280px] max-w-[90vw]"
        >
          <div className={`bg-game-dark/80 backdrop-blur-xl border ${errorMsg ? 'border-game-red/30' : 'border-game-primary/30'} rounded-full py-2 px-6 flex items-center gap-3 shadow-2xl shadow-black/50`}>
            {errorMsg ? (
              <div className="w-2 h-2 rounded-full bg-game-red shadow-[0_0_8px_rgba(139,26,26,0.6)] shrink-0" />
            ) : (
              <div className="w-2 h-2 rounded-full bg-game-primary shadow-[0_0_8px_rgba(20,184,166,0.6)] shrink-0" />
            )}
            <p className="text-game-offwhite font-body text-sm font-medium tracking-wide text-right">
              {errorMsg || successMsg}
            </p>
            <button 
              onClick={() => { setErrorMsg(null); setSuccessMsg(null); }}
              className="ml-auto text-game-offwhite/30 hover:text-game-offwhite transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )};

  const renderDebugUI = () => null;

  const handleUpdateName = async () => {
    if (editNameInput.trim().length < 2) return;
    const trimmedName = editNameInput.trim();
    if (user) {
      try {
        await updateProfile({ displayName: trimmedName });
        setShowEditNameDialog(false);
      } catch (err) {
        setErrorMsg(t('error_update_name_fail'));
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
          <h3 className="text-xl font-display text-game-offwhite">{t('profile_edit_name_title')}</h3>
        </div>
        <input 
          type="text" 
          value={editNameInput}
          onChange={(e) => setEditNameInput(e.target.value.replace(/[^ \w\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g, '').slice(0, 20))}
          className="w-full bg-black/40 border border-white/5 rounded-xl py-3 px-4 text-center text-game-offwhite focus:outline-none focus:border-game-primary transition-all"
          maxLength={20}
          placeholder={t('profile_edit_name_placeholder')}
          autoFocus
        />
        <div className="flex flex-col gap-3">
          <button 
            onClick={handleUpdateName}
            className="w-full py-3 bg-white/15 backdrop-blur-md border border-white/20 text-game-offwhite hover:bg-white/20 hover:border-white/30 rounded-xl font-display text-lg transition-all active:scale-95 outline-none transform-gpu"
          >
            {t('profile_save_changes')}
          </button>
          <button 
            onClick={() => setShowEditNameDialog(false)}
            className="w-full py-3 bg-white/5 backdrop-blur-sm hover:bg-white/10 text-game-offwhite/60 rounded-xl font-display text-lg transition-all border border-white/10 outline-none transform-gpu"
          >
            {t('profile_cancel')}
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
    setPlayerNameState(t('player_default_name'));
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
            <h3 className="text-2xl font-display text-game-offwhite">{t('exit_confirm_title')}</h3>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => CapApp.exitApp()}
                className="w-full py-3 bg-game-red hover:bg-red-700 text-white rounded-xl font-display text-xl transition-all active:scale-95"
              >
                {t('exit_confirm_btn')}
              </button>
              <button 
                onClick={() => setShowExitConfirm(false)}
                className="w-full py-3 bg-white/10 hover:bg-white/20 text-game-offwhite rounded-xl font-display text-xl transition-all"
              >
                {t('exit_cancel_btn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );

  const renderSettingsSidebar = () => (
    <SettingsSidebar 
      isOpen={showSettingsSidebar} 
      onClose={() => setShowSettingsSidebar(false)}
      onNavigateToProfile={() => {
         setShowSettingsSidebar(false);
         setAppState('profile');
      }}
      onNavigateToGift={() => {
         setShowSettingsSidebar(false);
         setAppState('profile');
         setTimeout(() => {
            const giftBtn = document.getElementById('btn-tab-gift');
            if (giftBtn) giftBtn.click();
         }, 50);
      }}
      user={user}
      onLoginClick={() => {
         setShowSettingsSidebar(false);
         setAppState('auth');
      }}
      onLogout={() => {
         setShowSettingsSidebar(false);
         logout();
      }}
    />
  );

  const renderPrivacyModal = () => (
    <AnimatePresence>
      {showPrivacyModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="bg-game-dark border border-game-primary/30 p-8 rounded-3xl w-full max-w-sm text-center shadow-[0_0_50px_rgba(45,212,191,0.2)] space-y-8 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-game-primary to-transparent" />
            
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-game-primary/10 rounded-full flex items-center justify-center border border-game-primary/20">
                <ShieldCheck className="w-10 h-10 text-game-primary" />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-2xl font-display text-white">{t('privacy_title')}</h3>
              <p className="text-game-offwhite/60 font-body leading-relaxed text-sm">
                {t('privacy_message')}
              </p>
              <div className="pt-2">
                <a 
                  href="/privacy-policy.html" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-game-primary hover:underline text-xs font-display tracking-widest"
                  onClick={(e) => {
                    if (Capacitor.isNativePlatform()) {
                      e.preventDefault();
                      window.open('https://rps-cards.duckdns.org/privacy-policy.html', '_system');
                    }
                  }}
                >
                  {t('auth_privacy_link')}
                </a>
              </div>
            </div>

            <button 
              onClick={() => {
                localStorage.setItem('cardclash_privacyAccepted', 'true');
                setShowPrivacyModal(false);
              }}
              className="w-full py-4 bg-game-primary text-game-dark hover:bg-emerald-400 rounded-xl font-display text-lg transition-all active:scale-95 shadow-lg shadow-game-primary/20"
            >
              {t('privacy_accept')}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (!assetsLoaded) {
    return (
      <div className="fixed inset-0 w-full h-full bg-[#121212] flex flex-col items-center justify-center gap-4">
        <Activity className="w-10 h-10 text-game-primary animate-spin" />
        <div className="w-48 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-game-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${assetProgress * 100}%` }}
            transition={{ type: "spring", bounce: 0, duration: 0.2 }}
          />
        </div>
      </div>
    );
  }
  if (appState === 'community') {
    return (
      <div className="fixed inset-0 z-0 bg-game-bg">
        <CommunityView 
          userId={user?._id || null} 
          user={user}
          ws={ws}
          chatMessages={chatMessages}
          setChatMessages={setChatMessages}
          connectToOnline={connectToOnline}
          onBack={() => setAppState('menu')}
          sendAction={sendNativeAction}
          isOnlineConnected={Capacitor.isNativePlatform() ? connectionStatus === 'CONNECTION_VERIFIED' : !!(ws && ws.readyState === WebSocket.OPEN)}
          setCoins={setCoinsState}
        />
      </div>
    );
  }

  if (appState === 'auth') {
    return (
      <div 
        dir={isRTL ? 'rtl' : 'ltr'}
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
            <p className="text-game-offwhite/50">{authTab === 'login' ? t('auth_login_subtitle') : t('auth_register_subtitle')}</p>
          </div>

          <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
            <button 
              onClick={() => { setAuthTab('login'); setErrorMsg(null); }}
              className={`flex-1 py-2 rounded-lg font-display transition-all transform-gpu ${authTab === 'login' ? 'bg-game-primary text-game-dark' : 'text-game-offwhite/40 hover:text-game-offwhite hover:bg-white/5'}`}
            >
              {t('auth_login_tab')}
            </button>
            <button 
              onClick={() => { setAuthTab('register'); setErrorMsg(null); }}
              className={`flex-1 py-2 rounded-lg font-display transition-all transform-gpu ${authTab === 'register' ? 'bg-game-primary text-game-dark' : 'text-game-offwhite/40 hover:text-game-offwhite hover:bg-white/5'}`}
            >
              {t('auth_register_tab')}
            </button>
          </div>

          <form onSubmit={authTab === 'login' ? handleLogin : handleRegister} className="space-y-4">
            {authTab === 'register' && (
              <div className="space-y-1">
                <label className="text-xs text-game-offwhite/40 mr-2 uppercase tracking-widest">{t('auth_username_label')}</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-game-primary/40" />
                  <input 
                    type="text" 
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value.replace(/[^ \w\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g, '').slice(0, 20))}
                    required
                    maxLength={20}
                    placeholder={t('auth_username_placeholder')}
                    className="w-full bg-black/30 border border-white/10 rounded-xl py-3 px-10 text-game-offwhite focus:outline-none focus:border-game-primary transition-all placeholder:text-white/10"
                  />
                </div>
              </div>
            )}
            
            <div className="space-y-1">
              <label className="text-xs text-game-offwhite/40 mr-2 uppercase tracking-widest">{t('auth_email_label')}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-game-primary/40" />
                <input 
                  type="email" 
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value.replace(/\s/g, '').slice(0, 64))}
                  required
                  maxLength={64}
                  placeholder="name@example.com"
                  className="w-full bg-black/30 border border-white/10 rounded-xl py-3 px-10 text-game-offwhite focus:outline-none focus:border-game-primary transition-all placeholder:text-white/10"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-game-offwhite/40 mr-2 uppercase tracking-widest">{t('auth_password_label')}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-game-primary/40" />
                <input 
                  type="password" 
                  value={authPass}
                  onChange={(e) => setAuthPass(e.target.value.replace(/\s/g, '').slice(0, 32))}
                  required
                  maxLength={32}
                  placeholder="••••••••"
                  className="w-full bg-black/30 border border-white/10 rounded-xl py-3 px-10 text-game-offwhite focus:outline-none focus:border-game-primary transition-all placeholder:text-white/10"
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
              {authSubmitting ? <Activity className="w-5 h-5 animate-spin" /> : authTab === 'login' ? <><LogIn className="w-5 h-5" /> {t('auth_submit_login')}</> : <><UserPlus className="w-5 h-5" /> {t('auth_submit_register')}</>}
            </button>
          </form>
          
          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink-0 mx-4 text-game-offwhite/20 text-xs font-display uppercase tracking-widest">{t('auth_or_divider')}</span>
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
            <User className="w-4 h-4 opacity-50" /> {t('auth_continue_guest')}
          </button>
          
          <div className="text-center mt-4">
            <p className="text-[10px] sm:text-xs text-game-offwhite/40 leading-relaxed font-body">
              {t('auth_privacy_notice')} <br />
              <a 
                href="/privacy-policy.html" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-game-primary/80 hover:text-game-primary underline underline-offset-4 decoration-game-primary/30 transition-all font-display tracking-widest inline-block mt-1"
                onClick={(e) => {
                  if (Capacitor.isNativePlatform()) {
                    e.preventDefault();
                    window.open('https://rps-cards.duckdns.org/privacy-policy.html', '_system');
                  }
                }}
              >
                {t('auth_privacy_link')}
              </a> {t('auth_privacy_suffix')}
            </p>
          </div>
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
          className="relative max-w-md w-full bg-game-dark/95 p-6 sm:p-10 rounded-3xl border border-game-primary/30 shadow-2xl text-center space-y-6"
        >
          <button 
            onClick={() => setAppState('menu')}
            className="absolute p-2 text-game-offwhite/50 hover:text-game-offwhite hover:bg-white/5 rounded-full transition-all"
            style={{ top: '1.25rem', left: '1.25rem' }}
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="w-20 h-20 bg-game-primary/20 rounded-full flex items-center justify-center mx-auto border-2 border-game-primary/50">
            <Mail className="w-10 h-10 text-game-primary" />
          </div>
          <h2 className="text-3xl font-display text-game-offwhite">{t('auth_verify_title')}</h2>
          <p className="text-game-offwhite/70 leading-relaxed text-lg">{t('auth_verify_subtitle')} <br /><span className="text-game-primary font-bold">{authEmail}</span></p>
          
          <div className="bg-game-primary/5 border border-game-primary/20 p-3 rounded-xl flex items-center gap-3 text-right">
            <Info className="w-5 h-5 text-game-primary shrink-0" />
            <p className="text-sm text-game-offwhite/60">{t('auth_verify_hint')}</p>
          </div>

          <button 
            type="button" 
            onClick={handleResendCode}
            disabled={isResending}
            className="text-xs text-game-primary hover:underline font-display tracking-widest"
          >
            {isResending ? t('general_sending') : t('auth_resend_code')}
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
                className="w-full bg-black/30 border border-white/10 rounded-xl py-4 text-center text-4xl font-display tracking-[10px] text-game-primary focus:outline-none focus:border-game-primary transition-all placeholder:text-white/5"
              />
            </div>
            
            {errorMsg && (
              <div className="text-red-500 text-sm">{errorMsg}</div>
            )}

            <button 
              type="submit"
              disabled={authSubmitting || authVerifyCode.length !== 6}
              className="w-full py-4 bg-game-primary text-game-dark rounded-xl font-display text-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {authSubmitting ? <Activity className="w-5 h-5 animate-spin" /> : t('auth_verify_submit')}
            </button>
          </form>

          <button 
            onClick={() => { setAppState('auth'); setAuthTab('login'); }}
            className="w-full py-3 bg-white/5 hover:bg-white/10 text-game-offwhite/40 rounded-xl font-display transition-all border border-white/10 text-sm"
          >
            {t('auth_back_to_login')}
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
          level={level}
          coins={coins}
          competitionPoints={competitionPoints}
          isOnline={isOnline}
          setAppState={setAppState}
          unreadChat={unreadChat}
          setUnreadChat={setUnreadChat}
          setShowSettingsSidebar={setShowSettingsSidebar}
        />
        {renderSettingsSidebar()}
        <BottomNavbar 
          activeTab={visibleTab} 
          setAppState={setAppState}
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
            dir={isRTL ? 'rtl' : 'ltr'}
            className="w-full h-full flex flex-col font-body overflow-x-hidden select-none"
          >
            <div className="flex-1 overflow-hidden pt-24 pb-24 px-4 sm:px-6 flex flex-col max-w-md mx-auto w-full">
              {/* TABS (Protruding Bumps) */}
              <div className="flex gap-2 px-3 relative z-10 -mb-[1px]">
                <button 
                  onClick={() => {
                    setMenuTab('local');
                    if (Capacitor.isNativePlatform()) {
                       LocalServer.getStatus().then(status => {
                         if (status.localIp) setUserIp(status.localIp);
                         if (status.role) setRole(status.role as any);
                       }).catch(() => {});
                    }
                  }}
                  className={`flex-1 py-3 px-2 rounded-t-2xl font-display text-xs transition-all flex flex-col items-center gap-1 relative ${menuTab === 'local' ? 'bg-[#0a0a0a] border border-white/5 text-game-primary z-20' : 'bg-[#0a0a0a]/50 text-game-offwhite/40 hover:bg-[#0a0a0a]/80 hover:text-game-offwhite z-10 translate-y-1'}`}
                >
                  <Home className="w-4 h-4" />
                  {t('menu_tab_local')}
                  {menuTab === 'local' && <div className="absolute -bottom-[2px] left-0 right-0 h-[3px] bg-[#0a0a0a] border border-white/5 z-30" />}
                </button>

                <button 
                  onClick={() => setMenuTab('online')}
                  className={`flex-1 py-3 px-2 rounded-t-2xl font-display text-xs transition-all flex flex-col items-center gap-1 relative ${menuTab === 'online' ? 'bg-[#0a0a0a] border border-white/5 text-game-primary z-20' : 'bg-[#0a0a0a]/50 text-game-offwhite/40 hover:bg-[#0a0a0a]/80 hover:text-game-offwhite z-10 translate-y-1'}`}
                >
                  <Globe className="w-4 h-4" />
                  {t('menu_tab_online')}
                  {menuTab === 'online' && <div className="absolute -bottom-[2px] left-0 right-0 h-[3px] bg-[#0a0a0a] border border-white/5 z-30" />}
                </button>
                
                <button 
                  onClick={() => setMenuTab('bot')}
                  className={`flex-1 py-3 px-2 rounded-t-2xl font-display text-xs transition-all flex flex-col items-center gap-1 relative ${menuTab === 'bot' ? 'bg-[#0a0a0a] border border-white/5 text-game-primary z-20' : 'bg-[#0a0a0a]/50 text-game-offwhite/40 hover:bg-[#0a0a0a]/80 hover:text-game-offwhite z-10 translate-y-1'}`}
                >
                  <Bot className="w-4 h-4" />
                  {t('menu_tab_bot')}
                  {menuTab === 'bot' && <div className="absolute -bottom-[2px] left-0 right-0 h-[3px] bg-[#0a0a0a] border border-white/5 z-30" />}
                </button>
              </div>

              {/* CONTENT AREA (Scrolling Inside Frame) */}
              <div className="flex-1 flex flex-col bg-[#0a0a0a] border border-white/5 rounded-[2rem] shadow-2xl overflow-hidden relative z-0">
                <div className="flex-1 overflow-y-auto smooth-scroll px-5 py-6 custom-scrollbar">
                  <div className="min-h-full pb-10 space-y-6">
                    
                    {menuTab === 'online' && (
                      <div className="flex flex-col gap-5 w-full mx-auto relative animate-in fade-in zoom-in-95 duration-200">
                        <div className="bg-[#0a0a0a]/60 border border-white/5 p-5 rounded-xl shadow-lg">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="p-1.5 bg-white/5 rounded-lg border border-game-primary/20">
                              <UserSearch className="w-5 h-5 text-game-primary" />
                            </div>
                            <div className="text-right">
                              <h3 className="text-game-cream font-display text-base tracking-widest leading-none">{t('online_quick_match_title')}</h3>
                              <p className="text-[10px] text-game-cream/40 font-body italic mt-1">{t('online_quick_match_subtitle')}</p>
                            </div>
                          </div>
                          <button
                            onClick={startQuickMatch}
                            disabled={isSearching || isActionLoading}
                            className="w-full py-3.5 bg-game-primary/20 backdrop-blur-md border border-game-primary/30 text-game-primary hover:bg-game-primary hover:text-game-dark rounded-xl font-display text-xl transition-all active:scale-95 disabled:opacity-50 outline-none transform-gpu shadow-lg flex items-center justify-center gap-2"
                          >
                            {isSearching ? <Activity className="w-5 h-5 animate-spin" /> : t('online_quick_match_btn')}
                          </button>
                        </div>

                        <div className="bg-[#0a0a0a]/60 border border-white/5 p-5 rounded-xl shadow-lg">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="p-1.5 bg-white/5 rounded-lg border border-white/10">
                              <Users className="w-5 h-5 text-game-offwhite" />
                            </div>
                            <div className="text-right">
                              <h3 className="text-game-cream font-display text-base tracking-widest leading-none">{t('online_private_room_title')}</h3>
                              <p className="text-[10px] text-game-cream/40 font-body italic mt-1">{t('online_private_room_subtitle')}</p>
                            </div>
                          </div>

                          <button
                            onClick={createOnlineRoom}
                            disabled={isSearching || isActionLoading}
                            className="w-full py-2.5 mb-4 bg-white/10 backdrop-blur-md border border-white/15 text-game-offwhite hover:bg-white/15 hover:border-white/20 rounded-lg font-display text-base transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 outline-none transform-gpu"
                          >
                            {isActionLoading ? <Activity className="w-4 h-4 animate-spin" /> : <><PlusCircle className="w-4 h-4" /> {t('online_create_room')}</>}
                          </button>
                          
                          <div className="relative flex items-center mb-4">
                            <div className="flex-grow border-t border-white/5"></div>
                            <span className="flex-shrink-0 mx-3 text-white/20 font-display text-[10px]">{t('online_join_code_divider')}</span>
                            <div className="flex-grow border-t border-white/5"></div>
                          </div>

                          <div className="relative">
                            <input
                              type="text"
                              placeholder={t('online_room_code_placeholder')}
                              value={roomIdInput}
                              onChange={(e) => setRoomIdInput(e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4))}
                              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-center text-2xl font-mono text-game-offwhite focus:outline-none focus:border-game-primary/50 focus:bg-white/10 transition-all placeholder:text-white/10 uppercase tracking-[0.2em]"
                              maxLength={4}
                              disabled={isSearching || isActionLoading}
                              dir="ltr"
                            />
                            <AnimatePresence>
                              {roomIdInput.length === 4 && (
                                <motion.button
                                  initial={{ opacity: 0, x: 10, scale: 0.9 }}
                                  animate={{ opacity: 1, x: 0, scale: 1 }}
                                  exit={{ opacity: 0, x: 10, scale: 0.9 }}
                                  onClick={joinOnlineRoom}
                                  disabled={isSearching || isActionLoading}
                                  className="absolute left-1.5 top-1.5 bottom-1.5 px-6 bg-game-primary text-game-dark hover:bg-emerald-400 rounded-lg font-display text-sm transition-all active:scale-95 shadow-lg flex items-center justify-center z-10"
                                >
                                  {isActionLoading ? <Activity className="w-4 h-4 animate-spin" /> : t('online_join_btn')}
                                </motion.button>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>
                    )}

                    {menuTab === 'local' && (
                      <div className="flex flex-col gap-5 w-full mx-auto relative animate-in fade-in zoom-in-95 duration-200">
                        {connectionStatus === 'CONNECTING' && (
                          <div
                            className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center rounded-xl border border-white/10"
                          >
                            <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-white animate-spin mb-4"></div>
                            <p className="text-game-offwhite font-display text-lg tracking-widest animate-pulse">{t('lan_connecting')}</p>
                            <button 
                              onClick={async () => {
                                if (Capacitor.isNativePlatform()) {
                                  await LocalServer.stopAll();
                                }
                                setConnectionStatus('DISCONNECTED');
                              }}
                              className="mt-6 px-5 py-2 bg-game-primary text-white rounded-full text-xs font-display tracking-widest transition-all hover:bg-game-primary/80"
                            >
                              {t('lan_cancel_btn')}
                            </button>
                          </div>
                        )}

                        {/* Host Section */}
                        <div className="bg-[#0a0a0a]/60 border border-white/10 p-5 rounded-xl shadow-lg">
                          <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                                <NetworkIcon className="w-5 h-5 text-game-offwhite" />
                              </div>
                              <div className="text-right">
                                <h3 className="text-game-cream font-display text-lg tracking-widest mt-1 leading-none">{t('lan_host_title')}</h3>
                                <p className="text-[10px] text-game-cream/40 font-body italic mt-1">{t('lan_host_subtitle')}</p>
                              </div>
                            </div>
                          </div>
                          
                          <button
                            onClick={hostGame}
                            className="w-full py-3 bg-white/10 backdrop-blur-md border border-white/15 text-game-offwhite hover:bg-white/15 hover:border-white/20 rounded-xl font-display text-xl transition-all active:scale-95 flex items-center justify-center gap-2 outline-none transform-gpu"
                          >
                            {t('lan_host_btn')}
                          </button>
                          
                          <p className="text-[10px] text-game-cream/40 text-center mt-3 px-2 leading-relaxed opacity-70 font-body italic">
                            {t('lan_host_hint')}
                          </p>
                        </div>

                        {/* Join Section */}
                        <div className="bg-[#0a0a0a]/60 border border-white/10 p-5 rounded-xl shadow-lg">
                          <div className="flex items-center gap-3 mb-5">
                            <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                              <PlugZap className="w-5 h-5 text-game-offwhite" />
                            </div>
                            <div className="text-right">
                              <h3 className="text-game-cream font-display text-lg tracking-widest mt-1 leading-none">{t('lan_join_title')}</h3>
                              <p className="text-[10px] text-game-cream/40 font-body italic mt-1">{t('lan_join_subtitle')}</p>
                            </div>
                          </div>

                          <div className="flex flex-col gap-3">
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder={t('lan_ip_placeholder')}
                              value={ipInput}
                              onChange={handleIpChange}
                              className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-center text-xl font-mono text-game-offwhite focus:outline-none focus:border-game-primary transition-all placeholder:text-white/20 font-bold"
                              maxLength={15}
                              dir="ltr"
                            />
                            {isValidIp(ipInput.trim()) && (
                              <div style={{ transformOrigin: 'top' }}>
                                <button
                                  onClick={joinGame}
                                  className="w-full py-3 bg-game-primary/20 backdrop-blur-md border border-game-primary/30 text-game-primary hover:bg-game-primary hover:text-game-dark rounded-xl font-display text-xl transition-all active:scale-95 outline-none transform-gpu shadow-md"
                                >
                                  {t('lan_connect_btn')}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {menuTab === 'bot' && (
                      <div className="flex flex-col gap-5 w-full mx-auto relative animate-in fade-in zoom-in-95 duration-200">
                        <div className="bg-[#0a0a0a]/60 border border-white/10 p-5 rounded-xl shadow-lg flex-1">
                          <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                                <Bot className="w-5 h-5 text-game-offwhite" />
                              </div>
                              <div className="text-right">
                                <h3 className="text-game-cream font-display text-lg tracking-widest leading-none">{t('bot_title')}</h3>
                                <p className="text-[10px] text-game-cream/40 font-body italic mt-1">{t('bot_subtitle')}</p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-6">
                            {/* Difficulty */}
                            <div className="space-y-2.5">
                              <label className="text-[11px] text-game-offwhite/60 font-body block text-right pr-1">{t('bot_difficulty_label')}</label>
                              <div className="flex bg-black/30 p-1.5 rounded-xl border border-white/5">
                                {Object.entries({ easy: t('bot_easy'), normal: t('bot_normal'), hard: t('bot_hard') }).map(([key, label]) => (
                                  <button
                                    key={key}
                                    onClick={() => {
                                      const nb = {...botSettings, difficulty: key};
                                      setBotSettings(nb);
                                      localStorage.setItem('cardclash_botSettings', JSON.stringify(nb));
                                    }}
                                    className={`flex-1 py-2 text-xs font-display rounded-lg transition-all ${botSettings.difficulty === key ? 'bg-white/10 text-white shadow-md border border-white/10' : 'text-game-offwhite/40 hover:text-white border border-transparent'}`}
                                  >
                                    {label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Time limit */}
                            <div className="space-y-2.5">
                              <label className="text-[11px] text-game-offwhite/60 font-body block text-right pr-1">{t('bot_time_label')}</label>
                              <div className="flex bg-black/30 p-1.5 rounded-xl border border-white/5">
                                {Object.entries({ 0: t('bot_no_time'), 15: t('bot_15s'), 30: t('bot_30s') }).map(([val, label]) => (
                                  <button
                                    key={val}
                                    onClick={() => {
                                      const nb = {...botSettings, timeLimit: Number(val)};
                                      setBotSettings(nb);
                                      localStorage.setItem('cardclash_botSettings', JSON.stringify(nb));
                                    }}
                                    className={`flex-1 py-2 text-xs font-display rounded-lg transition-all ${botSettings.timeLimit === Number(val) ? 'bg-white/10 text-white shadow-md border border-white/10' : 'text-game-offwhite/40 hover:text-white border border-transparent'}`}
                                  >
                                    {label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <button
                              onClick={createBotRoom}
                              disabled={isBotLoading}
                              className="w-full mt-2 py-3.5 bg-game-primary/20 backdrop-blur-md border border-game-primary/30 text-game-primary hover:bg-game-primary hover:text-game-dark rounded-xl font-display text-xl transition-all active:scale-95 flex items-center justify-center gap-2 outline-none transform-gpu disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                            >
                              {isBotLoading ? <Activity className="w-5 h-5 animate-spin" /> : t('bot_start_btn')}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
            <ProfileView 
              playerName={playerName}
              coins={coins}
              competitionPoints={competitionPoints}
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
              userId={user?._id || null}
              onLoginClick={() => { setAuthTab('login'); setAppState('auth'); }}
              onLogoutClick={() => { handleLogout(); setAppState('auth'); }}
              onRefresh={handleForceRefreshData}
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
          {renderPrivacyModal()}
          {renderDebugUI()}
          <AnimatePresence>
            {(isWaitingInPrivateRoom || (appState === 'inRoom' && roomState?.gameState === 'waiting' && !roomState.isBotRoom)) && (
              <PrivateRoomLobbyView 
                 key="private-lobby-global"
                 isLoading={(role === 'HOST' || role === 'CLIENT') ? (userIp === t('general_loading') || !userIp) : (!roomId || (!roomState && appState === 'menu'))}
                 roomCode={roomId}
                 isLan={role === 'HOST' || role === 'CLIENT'}
                 localIp={userIp}
                 onCancel={() => {
                   setIsWaitingInPrivateRoom(false);
                   if (appState === 'inRoom') setAppState('menu');
                   setMenuTab('online');
                   leaveRoom();
                 }}
              />
            )}
          </AnimatePresence>
          <AnimatePresence>
            {(isSearching || showMatchmakingResult) && (
              <MatchmakingView 
                key="matchmaking"
                isSearching={isSearching}
                onCancel={cancelSearch}
                matchFound={showMatchmakingResult}
                opponent={matchmakingOpponent}
                playerName={playerName}
                playerLevel={level}
                playerThemeId={selectedThemeId}
                canCancel={matchmakingCanCancel}
              />
            )}
          </AnimatePresence>
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

  if (!opponent && !roomState.isBotRoom && roomState.gameState !== 'waiting' && roomState.gameState !== 'opponentLeft') return (
    <div className="fixed inset-0 w-full h-full wood-texture">
      {renderDebugUI()}
    </div>
  );
  const opponentName = opponent?.name || t('player_opponent_default');

  if (roomState.gameState === 'waiting') {
    return (
      <PrivateRoomLobbyView 
        isLoading={(role === 'HOST' || role === 'CLIENT') ? (userIp === t('general_loading') || !userIp) : !roomId}
        roomCode={roomId}
        isLan={role === 'HOST' || role === 'CLIENT'}
        localIp={userIp}
        onCancel={() => {
          setIsWaitingInPrivateRoom(false);
          setAppState('menu');
          setMenuTab('online');
          leaveRoom();
        }}
      />
    );
  }

  if (roomState.gameState === 'opponentLeft') {
    return (
      <div className="fixed inset-0 w-full h-full wood-texture flex items-center justify-center p-4 z-50">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-game-dark/95 p-8 rounded-2xl border-2 border-game-primary shadow-2xl max-w-sm w-full text-center"
        >
          <div className="flex flex-col items-center gap-8 relative z-10 w-full">
            <div className="text-center">
              <Activity className="w-12 h-12 text-game-primary animate-spin mx-auto mb-4" />
              <h2 className="text-3xl font-display text-game-primary mb-2">{t('game_opponent_left_title')}</h2>
              <p className="text-game-offwhite/80 mb-6">{t('game_opponent_left_subtitle')}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 w-full">
              <div className="bg-black/40 border border-white/5 p-4 rounded-xl text-center">
                <div className="text-[10px] text-game-offwhite/40 uppercase tracking-widest mb-1">{t('game_gold')}</div>
                <div className="text-game-primary text-2xl font-display">+10</div>
              </div>
              <div className="bg-black/40 border border-white/5 p-4 rounded-xl text-center">
                <div className="text-[10px] text-game-offwhite/40 uppercase tracking-widest mb-1">{t('game_xp')}</div>
                <div className="text-game-primary text-2xl font-display">+5</div>
              </div>
            </div>

            <button 
              onClick={() => setAppState('menu')}
              className="w-full py-4 bg-game-primary text-game-dark rounded-xl font-display text-xl shadow-lg transition-all active:scale-95"
            >
              {t('game_back_to_menu')}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (roomState.gameState === 'gameOver') {
    const finalWin = me.score > (opponent?.score || 0);
    const finalLoss = me.score < (opponent?.score || 0);
    
    return (
      <>
        {renderErrorToast()}
        <div 
          dir={isRTL ? 'rtl' : 'ltr'}
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
              <div className={`text-5xl font-display mb-10 mt-10 tracking-widest ${finalWin ? 'text-white' : finalLoss ? 'text-game-primary' : 'text-game-offwhite/60'}`}>
                {finalWin ? t('game_over_win_title') : finalLoss ? t('game_over_loss_title') : t('game_over_draw_title')}
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

              {/* Rewards Section */}
              {finalWin && pendingRewards.length > 0 && (
                <div className="mb-8 space-y-3 px-4">
                  <h3 className="text-[10px] font-display text-game-primary tracking-[0.2em] uppercase opacity-60">{t('game_over_points_earned')}</h3>
                  <div 
                    ref={(el) => {
                      if (el && !rewardSourceRect) {
                        setRewardSourceRect(el.getBoundingClientRect());
                      }
                    }}
                    className="flex flex-wrap justify-center gap-3"
                  >
                    {pendingRewards.map((reward, idx) => (
                      <motion.div 
                        key={reward.id}
                        initial={{ scale: 0, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        transition={{ delay: 0.5 + idx * 0.1, type: 'spring' }}
                        className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col items-center gap-1 min-w-[80px] backdrop-blur-sm"
                      >
                        <div className="relative">
                          {reward.type === 'coins' ? <Diamond className="w-6 h-6 text-game-primary" /> : 
                           reward.type === 'points' ? <Activity className="w-6 h-6 text-game-primary rotate-90" /> :
                           <ShieldCheck className="w-6 h-6 text-game-primary" />}
                          <motion.div 
                            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute inset-0 bg-game-primary/20 blur-md rounded-full"
                          />
                        </div>
                        <span className="text-xl font-display text-white">+{reward.amount}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-4">
                <button
                  onClick={playAgain}
                  disabled={me.readyForNext}
                  className={`w-full py-4 rounded-lg font-display text-2xl transition-all shadow-lg ${me.readyForNext ? 'bg-white/5 text-white/10 cursor-not-allowed' : 'bg-game-offwhite hover:bg-white text-black active:scale-95'}`}
                >
                  {me.readyForNext ? t('lobby_waiting') : t('game_over_play_again')}
                </button>
                {roomState.isPublic && (
                  <button
                    onClick={findNewMatch}
                    className="w-full py-4 bg-game-primary hover:bg-emerald-600 text-game-dark rounded-lg font-display text-xl transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2"
                  >
                    <UserSearch className="w-5 h-5" /> {t('game_over_find_opponent')}
                  </button>
                )}
                <button
                  onClick={leaveRoom}
                  className="w-full py-3 bg-game-primary hover:bg-game-primary/80 text-white rounded-lg font-display text-xl transition-all active:scale-95"
                >
                  {t('game_over_back_menu')}
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
              onClick={() => setShowExitConfirm(true)}
              className="p-1.5 text-game-offwhite/30 hover:text-game-red transition-all"
              title={t('game_exit')}
            >
              <XCircle className="w-6 h-6" />
            </button>
            <div className="flex flex-col">
              <span className="text-xs sm:text-sm text-game-offwhite/50 font-display italic leading-none">{roomState.isBotRoom ? t('game_single_player') : t('game_local_player')}</span>
            </div>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[10px] sm:text-xs text-game-primary font-display tracking-widest opacity-80">
              {t('game_win_value').replace('{value}', (roomState.round === 9 ? 2 : 1).toString())}
            </span>
            <span className="text-sm sm:text-lg text-game-offwhite font-display tracking-widest">
              {t('game_round').replace('{round}', roomState.round.toString())}
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
                          <p className="text-[10px] sm:text-xs font-display tracking-widest italic whitespace-nowrap">{t('game_choose')}</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <p className="text-[10px] sm:text-xs font-display tracking-widest italic whitespace-nowrap">{t('game_waiting_opponent')}</p>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {(roomState.gameState === 'revealing' || roomState.gameState === 'roundResult') && (
                    <div className="flex flex-col items-center gap-1 sm:gap-2">
                      <div className="text-3xl sm:text-5xl font-display italic tracking-tighter text-game-primary">
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
                            t('game_won')
                          ) : roomState.roundWinner === opponentId ? (
                            t('game_lost')
                          ) : (
                            t('game_draw')
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

      <RewardAnimationOverlay rewards={pendingRewards} sourceRect={rewardSourceRect} onComplete={handleRewardComplete} />
      {renderDebugUI()}
      {renderExitConfirm()}
      {renderSettingsSidebar()}
    </div>
    </>
  );
}


export default App;
