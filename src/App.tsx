import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, Globe, Home, Trophy, XCircle, Minus, Copy, Edit2, Bug, X, Wifi, ShieldCheck, Activity } from 'lucide-react';
import rockSvg from '/rock.svg';
import paperSvg from '/paper.svg';
import scissorsSvg from '/scissors.svg';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Network } from '@capacitor/network';
import { registerPlugin, Capacitor } from '@capacitor/core';

export interface LocalServerPlugin {
  startServer(options: { port: number }): Promise<{ status: string; port: number }>;
  connectToServer(options: { ip: string; port: number }): Promise<void>;
  stopAll(): Promise<void>;
  sendMessage(options: { message: string }): Promise<void>;
  getStatus(): Promise<{ role: string; status: string; clientCount: number; localIp: string }>;
  getLocalIpAddress(): Promise<{ ip: string }>;
  addListener(eventName: 'onStatusUpdate', listenerFunc: (info: { role: string; status: string; clientCount: number; localIp: string }) => void): any;
  addListener(eventName: 'onMessageReceived', listenerFunc: (info: { clientId?: string; message: string }) => void): any;
  addListener(eventName: 'onLog', listenerFunc: (info: { message: string; type: string; timestamp: number }) => void): any;
}

export const LocalServer = registerPlugin<LocalServerPlugin>('LocalServer');

type CardType = 'rock' | 'paper' | 'scissors';

interface Deck {
  rock: number;
  paper: number;
  scissors: number;
}

interface Player {
  id: string;
  name: string;
  deck: Deck;
  score: number;
  choice: CardType | null;
  readyForNext: boolean;
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

const CARD_IMAGES: Record<CardType, string> = {
  rock: rockSvg,
  paper: paperSvg,
  scissors: scissorsSvg
};

const CARD_NAMES: Record<CardType, string> = {
  rock: 'حجر',
  paper: 'ورقة',
  scissors: 'مقص'
};

const LAN_PORT = 3000;
const OFFLINE_BOT_ID = 'OFFLINE_BOT';
const INITIAL_DECK: Deck = { rock: 3, paper: 3, scissors: 3 };

interface LogEntry {
  id: number;
  time: string;
  msg: string;
  type: 'info' | 'error' | 'success';
}

const App = () => {
  const [appState, setAppState] = useState<'nameEntry' | 'menu' | 'inRoom'>('nameEntry');
  const [menuTab, setMenuTab] = useState<'main' | 'online' | 'local'>('main');
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('cardClashPlayerName') || '');
  const [ipInput, setIpInput] = useState('');
  const [roomIdInput, setRoomIdInput] = useState('');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomState, setRoomState] = useState<Room | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [userIp, setUserIp] = useState<string>('جاري التحميل...');
  
  // Native Networking State
  const [connectionStatus, setConnectionStatus] = useState<'DISCONNECTED' | 'CONNECTING' | 'SERVER_STARTED' | 'CONNECTION_VERIFIED'>('DISCONNECTED');
  const [role, setRole] = useState<'HOST' | 'CLIENT' | 'NONE'>('NONE');
  const [clientCount, setClientCount] = useState(0);
  
  // Debug State
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const [isPreloaded, setIsPreloaded] = useState(false);
  const [isRevealingLocal, setIsRevealingLocal] = useState(false);

  // Preload Assets
  useEffect(() => {
    const assets = [
      rockSvg, paperSvg, scissorsSvg,
      'https://www.transparenttextures.com/patterns/dark-wood.png',
      'https://www.transparenttextures.com/patterns/parchment.png'
    ];

    let loadedCount = 0;
    const totalAssets = assets.length;

    const checkAllLoaded = () => {
      loadedCount++;
      if (loadedCount >= totalAssets) {
        setIsPreloaded(true);
        addLog('All assets preloaded successfully', 'success');
      }
    };

    assets.forEach(src => {
      const img = new Image();
      img.src = src;
      img.onload = checkAllLoaded;
      img.onerror = () => {
        addLog(`Failed to preload asset: ${src}`, 'error');
        checkAllLoaded();
      };
    });

    // Fallback if loading takes too long
    const timeout = setTimeout(() => {
      if (!isPreloaded) {
        setIsPreloaded(true);
        addLog('Asset preloading timed out, proceeding...', 'info');
      }
    }, 3000);

    return () => clearTimeout(timeout);
  }, []);

  // Refs to avoid stale closures in listeners
  const roomIdRef = useRef<string | null>(null);
  const roomStateRef = useRef<Room | null>(null);
  const playerNameRef = useRef<string>('');

  useEffect(() => {
    roomIdRef.current = roomId;
    roomStateRef.current = roomState;
    playerNameRef.current = playerName;
  }, [roomId, roomState, playerName]);

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

  const addLog = (msg: string, type: 'info' | 'error' | 'success' = 'info') => {
    const newLog: LogEntry = { id: Date.now() + Math.random(), time: new Date().toLocaleTimeString(), msg, type };
    setLogs(prev => [newLog, ...prev].slice(0, 50));
    console.log(`[${type.toUpperCase()}] ${msg}`);
  };

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
            sendNativeAction({ type: 'host_join', playerName: playerNameRef.current });
          } else if (status.role === 'CLIENT') {
            sendNativeAction({ type: 'join_game', playerName: playerNameRef.current });
          }
        }).catch(e => addLog(`Failed to get status: ${e}`, 'error'));
      }
    } else if (data.type === 'room_state') {
      setRoomState(data.state);
      setRoomId(data.state.id);
      setAppState('inRoom');
    } else if (data.type === 'room_created') {
      setRoomId(data.roomId);
    } else if (data.type === 'error_msg') {
      setErrorMsg(data.msg);
      addLog(`Server Error: ${data.msg}`, 'error');
    }
  };

  const sendNativeAction = async (action: any) => {
    try {
      if (Capacitor.isNativePlatform()) {
        await LocalServer.sendMessage({ message: JSON.stringify(action) });
      } else {
        addLog(`Action skipped on web: ${action.type}`, 'info');
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
    let timer: NodeJS.Timeout;
    if (roomId === OFFLINE_BOT_ID && roomState?.gameState === 'playing') {
      timer = setInterval(() => {
        setRoomState(prev => {
          if (!prev || prev.gameState !== 'playing') return prev;
          if (prev.timeLeft && prev.timeLeft > 0) {
            return { ...prev, timeLeft: prev.timeLeft - 1 };
          } else {
            // Auto play for player if time runs out
            const me = prev.players.me;
            if (!me.choice) {
              const availableCards = (Object.keys(me.deck) as CardType[]).filter(t => me.deck[t] > 0);
              if (availableCards.length > 0) {
                const randomChoice = availableCards[Math.floor(Math.random() * availableCards.length)];
                me.choice = randomChoice;
                me.deck[randomChoice] -= 1;
              }
            }
            
            // Bot auto play
            const bot = prev.players.bot;
            if (!bot.choice) {
              const availableBotCards = (Object.keys(bot.deck) as CardType[]).filter(t => bot.deck[t] > 0);
              if (availableBotCards.length > 0) {
                const botChoice = availableBotCards[Math.floor(Math.random() * availableBotCards.length)];
                bot.choice = botChoice;
                bot.deck[botChoice] -= 1;
              }
            }
            
            setTimeout(() => handleOfflineReveal(prev), 0);
            return prev;
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
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
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
      await LocalServer.startServer({ port: LAN_PORT });
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
      await LocalServer.connectToServer({ ip: ipInput.trim(), port: LAN_PORT });
      // Native will send ROOM_READY after handshake is verified
    } catch (e) {
      addLog(`Join failed: ${e}`, 'error');
      setErrorMsg('فشل الاتصال بالسيرفر');
    }
  };

  const createOnlineRoom = () => {
    if (!Capacitor.isNativePlatform()) {
      setErrorMsg('ميزة اللعب أونلاين متاحة حالياً فقط في تطبيق الأندرويد');
      return;
    }
    const serverUrl = window.location.hostname;
    LocalServer.connectToServer({ ip: serverUrl, port: 3000 })
      .then(() => {
        const checkVerified = setInterval(() => {
          if (Capacitor.isNativePlatform()) {
            LocalServer.getStatus().then(status => {
              if (status.status === 'VERIFIED') {
                clearInterval(checkVerified);
                sendNativeAction({ type: 'create_room', playerName: playerName.trim() });
              }
            }).catch(() => clearInterval(checkVerified));
          } else {
            clearInterval(checkVerified);
          }
        }, 500);
      })
      .catch(e => setErrorMsg('تعذر الاتصال بالخادم'));
  };

  const joinOnlineRoom = () => {
    if (!roomIdInput.trim()) return;
    if (!Capacitor.isNativePlatform()) {
      setErrorMsg('ميزة اللعب أونلاين متاحة حالياً فقط في تطبيق الأندرويد');
      return;
    }
    const serverUrl = window.location.hostname;
    LocalServer.connectToServer({ ip: serverUrl, port: 3000 })
      .then(() => {
        const checkVerified = setInterval(() => {
          if (Capacitor.isNativePlatform()) {
            LocalServer.getStatus().then(status => {
              if (status.status === 'VERIFIED') {
                clearInterval(checkVerified);
                sendNativeAction({ type: 'join_room', roomId: roomIdInput.trim().toUpperCase(), playerName: playerName.trim() });
              }
            }).catch(() => clearInterval(checkVerified));
          } else {
            clearInterval(checkVerified);
          }
        }, 500);
      })
      .catch(e => setErrorMsg('تعذر الاتصال بالخادم'));
  };

  const createBotRoom = () => {
    const newRoom: Room = {
      id: OFFLINE_BOT_ID,
      isBotRoom: true,
      players: {
        me: { id: 'me', name: playerName.trim() || 'لاعب', deck: { ...INITIAL_DECK }, score: 0, choice: null, readyForNext: false },
        bot: { id: 'bot', name: 'الكمبيوتر', deck: { ...INITIAL_DECK }, score: 0, choice: null, readyForNext: true }
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
      const newState = { ...roomState };
      const me = newState.players.me;
      if (me.choice || me.deck[choice] <= 0) return;
      
      me.choice = choice;
      me.deck[choice] -= 1;
      setRoomState({ ...newState });
      
      // Bot choice with delay to simulate waiting
      setTimeout(() => {
        setRoomState(prevState => {
          if (!prevState || prevState.gameState !== 'playing') return prevState;
          const nextState = JSON.parse(JSON.stringify(prevState)); // Deep copy
          const bot = nextState.players.bot;
          if (bot.choice) return prevState;
          
          const availableBotCards = (Object.keys(bot.deck) as CardType[]).filter(t => bot.deck[t] > 0);
          const botChoice = availableBotCards[Math.floor(Math.random() * availableBotCards.length)];
          bot.choice = botChoice;
          bot.deck[botChoice] -= 1;
          
          handleOfflineReveal(nextState);
          return nextState;
        });
      }, 1000 + Math.random() * 1000);
      
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
    // Wait for cards to land first (flight animation is ~0.6s)
    setTimeout(() => {
      setRoomState(prev => {
        if (!prev) return prev;
        return { ...prev, gameState: 'revealing' };
      });
      
      // Wait a bit in revealing state to show the "VS" while face-down
      setTimeout(() => {
        setRoomState(prev => {
          if (!prev) return prev;
          const newState = { ...prev };
          const p1 = newState.players.me;
          const p2 = newState.players.bot;
          
          const getWinner = (c1: CardType, c2: CardType) => {
            if (c1 === c2) return 0;
            if ((c1 === 'rock' && c2 === 'scissors') || (c1 === 'paper' && c2 === 'rock') || (c1 === 'scissors' && c2 === 'paper')) return 1;
            return 2;
          };
          
          const winnerCode = getWinner(p1.choice!, p2.choice!);
          let points = 1;
          if (newState.round >= 6 && newState.round <= 8) points = 2;
          else if (newState.round === 9) points = 3;
          
          if (winnerCode === 1) {
            p1.score += points;
            newState.roundWinner = 'me';
          } else if (winnerCode === 2) {
            p2.score += points;
            newState.roundWinner = 'bot';
          } else {
            newState.roundWinner = 'draw';
          }
          
          newState.gameState = 'roundResult';
          
          setTimeout(() => {
            setRoomState(last => {
              if (!last) return last;
              const finalState = { ...last };
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
          me: { id: 'me', name: playerName.trim() || 'لاعب', deck: { ...INITIAL_DECK }, score: 0, choice: null, readyForNext: false },
          bot: { id: 'bot', name: 'الكمبيوتر', deck: { ...INITIAL_DECK }, score: 0, choice: null, readyForNext: true }
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

  const validateName = (name: string) => {
    const trimmed = name.trim();
    if (trimmed.length < 2) return 'الاسم يجب أن يكون حرفين على الأقل';
    if (!/^[a-zA-Z0-9\u0600-\u06FF\s]+$/.test(trimmed)) return 'الاسم يجب أن يحتوي على حروف وأرقام فقط';
    return null;
  };

  const saveName = () => {
    const error = validateName(playerName);
    if (error) {
      setErrorMsg(error);
      return;
    }
    localStorage.setItem('cardClashPlayerName', playerName.trim());
    setAppState('menu');
    setErrorMsg(null);
  };

  const renderErrorToast = () => (
    <AnimatePresence>
      {errorMsg && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md"
        >
          <div className="bg-game-red text-game-cream px-4 py-3 rounded-lg shadow-2xl flex items-center justify-between gap-3 border-4 border-game-dark backdrop-blur-md">
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
        className="fixed top-[45%] left-2 p-3 bg-game-dark/80 hover:bg-game-red text-game-cream rounded-md shadow-xl z-[60] transition-colors active:scale-90 flex items-center justify-center border-2 border-game-red/30 backdrop-blur-sm cursor-grab active:cursor-grabbing"
        title="سجل الأخطاء (يمكنك سحب الزر)"
      >
        <Bug className="w-5 h-5 pointer-events-none" />
      </motion.button>

      {/* Debug Overlay */}
      <AnimatePresence>
        {showDebug && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed inset-0 z-[70] wood-texture flex flex-col p-4 font-mono text-xs"
            dir="ltr"
          >
            <div className="flex justify-between items-center mb-4 border-b-4 border-game-dark pb-2">
              <h3 className="text-game-cream font-display text-2xl tracking-widest" dir="rtl">سجل الأخطاء والاتصال</h3>
              <div className="flex gap-2">
                <button 
                  onClick={() => setLogs([])}
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

  if (!isPreloaded) {
    return (
      <div className="h-[100dvh] wood-texture flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-game-bg border-t-game-red animate-spin mb-4"></div>
        <p className="text-game-red font-display text-xl tracking-widest animate-pulse">جاري تجهيز الأسلحة...</p>
        {renderDebugUI()}
      </div>
    );
  }

  if (appState === 'nameEntry') {
    return (
      <>
        {renderErrorToast()}
        <div 
          dir="rtl" 
          className="h-[100dvh] wood-texture text-game-cream flex flex-col items-center justify-center p-4 sm:p-6 font-body overflow-hidden"
          style={{
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="max-w-sm w-full bg-game-dark/80 p-8 rounded-lg border-4 border-game-red shadow-2xl backdrop-blur-sm"
          >
            <div className="mb-8 flex justify-center gap-4">
              <motion.img src={CARD_IMAGES.rock} alt="حجر" className="w-16 h-16 object-contain drop-shadow-2xl" animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 2 }} />
              <motion.img src={CARD_IMAGES.paper} alt="ورقة" className="w-16 h-16 object-contain drop-shadow-2xl" animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 2, delay: 0.2 }} />
              <motion.img src={CARD_IMAGES.scissors} alt="مقص" className="w-16 h-16 object-contain drop-shadow-2xl" animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 2, delay: 0.4 }} />
            </div>

            <h2 className="text-3xl font-display mb-6 text-center text-game-cream tracking-wider">مرحباً بك أيها المحارب!</h2>
            <p className="text-game-cream/60 text-center mb-8 font-body italic">ما هو الاسم الذي تود أن يعرفك به خصومك؟</p>
            
            <div className="space-y-6">
              <input
                type="text"
                placeholder="أدخل اسمك هنا..."
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                autoFocus
                className="w-full bg-game-bg border-4 border-game-dark rounded-lg py-3.5 px-6 text-center text-lg font-bold text-game-cream focus:outline-none focus:border-game-red focus:ring-4 focus:ring-game-red/10 transition-all placeholder:text-game-cream/20"
                onKeyDown={(e) => e.key === 'Enter' && saveName()}
              />
              
              <button
                onClick={saveName}
                className="w-full py-4 bg-game-red hover:bg-red-800 text-game-cream rounded-lg font-display text-2xl shadow-xl border-b-4 border-red-950 transition-all active:translate-y-1 active:border-b-0"
              >
                تأكيد الاسم
              </button>
            </div>
          </motion.div>
        </div>
        {renderDebugUI()}
      </>
    );
  }

  if (appState === 'menu') {
    return (
      <>
        {renderErrorToast()}
        <div 
          dir="rtl" 
          className="h-[100dvh] wood-texture text-game-cream flex flex-col items-center justify-center p-4 sm:p-6 font-body overflow-x-hidden overflow-y-auto"
          style={{
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
            paddingLeft: 'env(safe-area-inset-left)',
            paddingRight: 'env(safe-area-inset-right)'
          }}
        >
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="max-w-md w-full text-center"
          >
            <div className="mb-6 flex items-center justify-center gap-3 bg-game-red py-3 px-6 rounded-lg border-4 border-game-dark w-fit max-w-[90%] mx-auto shadow-2xl">
              <span className="text-game-cream font-display text-xl tracking-wider">المحارب: {playerName}</span>
              <button 
                onClick={() => setAppState('nameEntry')}
                className="p-1.5 bg-game-dark rounded-md text-game-cream hover:bg-game-bg transition-all border-2 border-game-red/30"
                title="تعديل الاسم"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>

            <h1 className="text-5xl sm:text-6xl font-display mb-10 text-game-cream drop-shadow-[0_5px_5px_rgba(0,0,0,0.5)] tracking-widest">
              صراع البطاقات
            </h1>
            
            <div className="space-y-4">
              <AnimatePresence mode="wait">
                {menuTab === 'main' && (
                  <motion.div
                    key="main"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex flex-col gap-4"
                  >
                    <button
                      disabled
                      className="w-[90%] mx-auto py-4 bg-game-dark/80 text-game-cream/20 rounded-lg font-display text-xl shadow-xl border-4 border-game-bg cursor-not-allowed flex items-center justify-center gap-3"
                    >
                      <Globe className="w-6 h-6" /> لعب عبر الإنترنت (قريباً)
                    </button>
                    <button
                      onClick={() => setMenuTab('local')}
                      className="w-[90%] mx-auto py-4 bg-game-red hover:bg-red-800 text-game-cream rounded-lg font-display text-2xl shadow-xl border-b-4 border-red-950 transition-all active:translate-y-1 active:border-b-0 flex items-center justify-center gap-3"
                    >
                      <Home className="w-6 h-6" /> شبكة محلية (IP)
                    </button>
                    <button
                      onClick={createBotRoom}
                      className="w-[90%] mx-auto py-4 bg-game-teal hover:bg-teal-800 text-game-cream rounded-lg font-display text-2xl shadow-xl border-b-4 border-teal-950 transition-all active:translate-y-1 active:border-b-0 flex items-center justify-center gap-3"
                    >
                      <Bot className="w-6 h-6" /> ضد الكمبيوتر
                    </button>
                  </motion.div>
                )}

                {menuTab === 'online' && (
                  <motion.div
                    key="online"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex flex-col gap-3"
                  >
                    <button onClick={() => setMenuTab('main')} className="text-game-cream/60 hover:text-game-cream flex items-center gap-2 mb-2 w-fit transition-colors text-sm sm:text-base font-display tracking-widest">
                      <span>➔</span> رجوع
                    </button>
                    <button
                      onClick={createOnlineRoom}
                      className="w-[90%] mx-auto py-3 sm:py-4 bg-game-red hover:bg-red-800 text-game-cream rounded-lg font-display text-xl shadow-xl border-b-4 border-red-950 transition-all active:translate-y-1 active:border-b-0"
                    >
                      إنشاء غرفة جديدة
                    </button>
                    
                    <div className="relative flex items-center py-2">
                      <div className="flex-grow border-t border-game-dark"></div>
                      <span className="flex-shrink-0 mx-4 text-game-cream/40 text-xs sm:text-sm font-display italic">أو الانضمام لغرفة</span>
                      <div className="flex-grow border-t border-game-dark"></div>
                    </div>

                    <div className="w-[90%] mx-auto flex flex-col gap-3">
                      <input
                        type="text"
                        placeholder="أدخل كود الغرفة..."
                        value={roomIdInput}
                        onChange={(e) => setRoomIdInput(e.target.value)}
                        className="w-full bg-game-bg border-4 border-game-dark rounded-lg py-3 sm:py-4 px-4 sm:px-6 text-center text-lg sm:text-xl font-mono text-game-cream focus:outline-none focus:border-game-red focus:ring-4 focus:ring-game-red/10 transition-all placeholder:text-slate-700"
                        maxLength={6}
                      />
                      <AnimatePresence>
                        {roomIdInput.trim().length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                          >
                            <button
                              onClick={joinOnlineRoom}
                              className="w-full py-3.5 bg-game-red hover:bg-red-800 text-game-cream rounded-lg font-display text-xl transition-all shadow-xl border-b-4 border-red-950 active:translate-y-1 active:border-b-0"
                            >
                              انضمام
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}

                {menuTab === 'local' && (
                  <motion.div
                    key="local"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex flex-col gap-6 w-full max-w-[340px] mx-auto px-2"
                  >
                    <button 
                      onClick={() => setMenuTab('main')} 
                      className="text-game-cream/70 hover:text-game-cream flex items-center gap-2 w-fit transition-colors text-sm font-display tracking-widest group mb-1 ms-2"
                    >
                      <span className="group-hover:-translate-x-1 transition-transform">➔</span> رجوع للقائمة
                    </button>

                    <div className="relative flex flex-col gap-6">
                      <AnimatePresence>
                        {connectionStatus === 'CONNECTING' && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-50 bg-game-dark/90 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg border-4 border-game-red"
                          >
                            <div className="w-12 h-12 rounded-full border-4 border-game-bg border-t-game-red animate-spin mb-4"></div>
                            <p className="text-game-red font-display text-xl tracking-widest animate-pulse">جاري الاتصال...</p>
                            <button 
                              onClick={async () => {
                                if (Capacitor.isNativePlatform()) {
                                  await LocalServer.stopAll();
                                }
                                setConnectionStatus('DISCONNECTED');
                              }}
                              className="mt-4 px-4 py-2 bg-game-red text-game-cream rounded-md text-xs font-display tracking-widest transition-colors border-2 border-game-dark"
                            >
                              إلغاء الاتصال
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Host Section */}
                    <div className="bg-game-dark/80 border-4 border-game-red p-5 rounded-lg backdrop-blur-sm shadow-2xl">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-game-teal/20 rounded-md border border-game-teal/30">
                            <Globe className="w-5 h-5 text-game-teal" />
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
                        className="w-full py-3.5 bg-game-teal hover:bg-teal-800 text-game-cream rounded-lg font-display text-xl shadow-xl border-b-4 border-teal-950 transition-all active:translate-y-1 active:border-b-0 flex items-center justify-center gap-2"
                      >
                        بدء الاستضافة (Host)
                      </button>
                      
                      <p className="text-[10px] text-game-cream/40 text-center mt-3 px-2 leading-relaxed opacity-70 font-body italic">
                        سيظهر الـ IP الخاص بك للاعبين الآخرين على نفس الشبكة للاتصال بك.
                      </p>
                    </div>

                    {/* Join Section */}
                    <div className="bg-game-dark/80 border-4 border-game-red p-5 rounded-lg backdrop-blur-sm shadow-2xl">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-game-red/20 rounded-md border border-game-red/30">
                          <Bot className="w-5 h-5 text-game-red" />
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
                          className="w-full bg-game-bg border-4 border-game-dark rounded-lg py-4 px-6 text-center text-lg font-mono text-game-cream focus:outline-none focus:border-game-red focus:ring-4 focus:ring-game-red/10 transition-all placeholder:text-game-cream/20"
                          dir="ltr"
                        />
                        <AnimatePresence>
                          {isValidIp(ipInput.trim()) && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                            >
                              <button
                                onClick={joinGame}
                                className="w-full py-3.5 bg-game-red hover:bg-red-800 text-game-cream rounded-lg font-display text-xl transition-all shadow-xl border-b-4 border-red-950 active:translate-y-1 active:border-b-0"
                              >
                                اتصال
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
        {renderDebugUI()}
      </>
    );
  }

  if (!roomState) return (
    <div className="h-[100dvh] wood-texture">
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
    <div className="h-[100dvh] wood-texture">
      {renderDebugUI()}
    </div>
  );

  const me = roomState.players[myId];
  const opponentId = Object.keys(roomState.players).find(id => id !== myId);
  const opponent = opponentId ? roomState.players[opponentId] : null;

  if (!opponent && !roomState.isBotRoom && roomState.gameState !== 'waiting') return (
    <div className="h-[100dvh] wood-texture">
      {renderDebugUI()}
    </div>
  );
  const opponentName = opponent?.name || 'الخصم';

  if (roomState.gameState === 'waiting') {
    return (
      <>
        <div 
          dir="rtl" 
          className="h-[100dvh] wood-texture text-game-cream flex flex-col items-center justify-center p-4 sm:p-6 font-body overflow-hidden"
          style={{
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
            paddingLeft: 'env(safe-area-inset-left)',
            paddingRight: 'env(safe-area-inset-right)'
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-game-dark/80 p-6 sm:p-8 rounded-lg border-4 border-game-red shadow-2xl max-w-sm w-full text-center backdrop-blur-sm"
          >
            <div className="w-12 h-12 rounded-full border-4 border-game-bg border-t-game-red animate-spin mx-auto mb-6"></div>
            <h2 className="text-2xl font-display mb-2 text-game-cream tracking-widest">في انتظار الخصم...</h2>
            
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className={`w-2 h-2 rounded-full ${connectionStatus === 'CONNECTION_VERIFIED' ? 'bg-game-teal animate-pulse' : 'bg-game-red'}`}></div>
              <span className="text-[10px] text-game-cream/40 font-display tracking-widest italic">
                {connectionStatus === 'CONNECTION_VERIFIED' ? 'اتصال مؤمن' : 'جاري تأمين الاتصال'}
              </span>
            </div>
            
            {role === 'HOST' ? (
              <>
                <p className="text-game-cream/60 mb-4 text-xs sm:text-sm px-4 font-body italic">أنت الآن تستضيف اللعبة. اطلب من صديقك إدخال الـ IP الخاص بك للاتصال.</p>
                <div className="bg-game-bg p-3 rounded-lg border-2 border-game-dark mb-4">
                  <div className="text-[10px] text-game-cream/40 mb-1 font-display tracking-widest uppercase">عنوان الـ IP الخاص بك</div>
                  <div className="text-xl sm:text-2xl font-mono font-black text-game-teal select-all">{userIp}</div>
                </div>
              </>
            ) : (
              <>
                <p className="text-game-cream/60 mb-4 text-xs sm:text-sm px-4 font-body italic">شارك كود الغرفة مع صديقك للعب عبر الإنترنت</p>
                <div className="bg-game-bg p-3 rounded-lg border-2 border-game-dark mb-4">
                  <div className="text-[10px] text-game-cream/40 mb-1 font-display tracking-widest uppercase">كود الغرفة</div>
                  <div className="text-3xl font-mono font-black tracking-widest text-game-red">{roomId}</div>
                </div>
              </>
            )}
            
            <div className="flex flex-col gap-2">
              {role === 'HOST' ? (
                <button
                  onClick={() => navigator.clipboard.writeText(userIp)}
                  className="w-full py-3 bg-game-teal hover:bg-teal-800 text-game-cream rounded-lg font-display text-xl transition-all border-b-4 border-teal-950 active:translate-y-1 active:border-b-0 flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" /> نسخ عنوان الـ IP
                </button>
              ) : (
                <button
                  onClick={copyRoomId}
                  className="w-full py-3 bg-game-dark hover:bg-game-bg text-game-cream rounded-lg font-display text-xl transition-all border-2 border-game-red/30 flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" /> نسخ كود الغرفة
                </button>
              )}
              <button
                onClick={leaveRoom}
                className="w-full py-3 mt-2 bg-game-red/10 text-game-red hover:bg-game-red/20 rounded-lg font-display text-lg transition-all border-2 border-game-red/30"
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
          className="h-[100dvh] wood-texture text-game-cream flex flex-col items-center justify-center p-4 sm:p-6 font-body overflow-x-hidden overflow-y-auto"
          style={{
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
            paddingLeft: 'env(safe-area-inset-left)',
            paddingRight: 'env(safe-area-inset-right)'
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-game-dark/80 p-6 sm:p-8 rounded-lg border-4 border-game-red shadow-2xl max-w-sm w-full text-center relative overflow-hidden backdrop-blur-sm"
          >
            {finalWin && <div className="absolute inset-0 bg-game-teal/10 animate-pulse pointer-events-none"></div>}
            {finalLoss && <div className="absolute inset-0 bg-game-red/10 animate-pulse pointer-events-none"></div>}
            
            <div className="relative z-10">
              <h2 className="text-3xl font-display mb-2 text-game-cream/60 tracking-widest uppercase">النتيجة النهائية</h2>
              <div className="text-7xl mb-6 mt-4 drop-shadow-2xl">
                {finalWin ? '🏆' : finalLoss ? '💀' : '🤝'}
              </div>
              <div className={`text-4xl font-display mb-8 tracking-widest ${finalWin ? 'text-game-teal' : finalLoss ? 'text-game-red' : 'text-game-cream/60'}`}>
                {finalWin ? 'لقد انتصرت!' : finalLoss ? 'لقد خسرت!' : 'تعادل!'}
              </div>
              
              <div className="flex justify-center gap-8 mb-8 bg-game-bg/50 py-5 rounded-lg border-2 border-game-dark">
                <div className="flex flex-col items-center">
                  <span className="text-game-cream/40 text-[10px] mb-1 uppercase tracking-widest font-display">{me.name}</span>
                  <span className="text-5xl font-display text-game-teal">{me.score}</span>
                </div>
                <div className="w-1 bg-game-dark my-2"></div>
                <div className="flex flex-col items-center">
                  <span className="text-game-cream/40 text-[10px] mb-1 uppercase tracking-widest font-display">{opponentName}</span>
                  <span className="text-5xl font-display text-game-red">{opponent?.score || 0}</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={playAgain}
                  disabled={me.readyForNext}
                  className={`w-full py-4 rounded-lg font-display text-2xl transition-all shadow-xl border-b-4 ${me.readyForNext ? 'bg-game-dark text-game-cream/20 border-transparent cursor-not-allowed' : 'bg-game-red hover:bg-red-800 text-game-cream border-red-950 active:translate-y-1 active:border-b-0'}`}
                >
                  {me.readyForNext ? 'في انتظار الخصم...' : 'العب مرة أخرى'}
                </button>
                <button
                  onClick={leaveRoom}
                  className="w-full py-3 bg-game-dark hover:bg-game-bg text-game-cream rounded-lg font-display text-xl transition-all border-2 border-game-red/30"
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
        className="h-[100dvh] wood-texture text-game-cream font-body selection:bg-game-red/30 overflow-hidden flex flex-col"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)'
      }}
    >
      <div className="max-w-md mx-auto w-full h-full flex flex-col flex-1 relative">
        {/* Header */}
        <header className="flex justify-between items-center px-4 py-3 border-b-4 border-game-dark bg-game-red shadow-2xl z-20">
          <div className="flex items-center gap-3">
            <button 
              onClick={leaveRoom}
              className="p-2 hover:bg-red-900 rounded-md transition-colors text-game-cream"
              title="خروج"
            >
              <XCircle className="w-6 h-6 sm:w-7 sm:h-7" />
            </button>
            <div className="flex flex-col">
              <h1 className="text-xl sm:text-2xl font-display text-game-cream tracking-wider drop-shadow-md">
                صراع البطاقات
              </h1>
              <span className="text-[10px] sm:text-xs text-game-cream/70 font-display italic">{roomState.isBotRoom ? 'لعب فردي' : 'لعب محلي'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex flex-col items-end">
              <span className="text-[10px] sm:text-xs text-game-cream font-display tracking-widest bg-game-dark/30 px-2 py-0.5 rounded-md border border-game-cream/20">
                قيمة الفوز: {roomState.round >= 7 ? 3 : roomState.round >= 4 ? 2 : 1}
              </span>
            </div>
            <span className="bg-game-dark px-3 sm:px-4 py-1 rounded-md text-xs sm:text-sm font-display border-2 border-game-red/50 text-game-cream tracking-widest">
              الجولة: {roomState.round}
            </span>
          </div>
        </header>

        {/* Opponent Area */}
        <div className="flex-1 flex flex-col justify-center px-4 py-2">
          <div className="flex justify-between items-end mb-2">
            <div>
              <h2 className="text-game-cream/40 text-xs sm:text-sm mb-1 flex items-center gap-2 font-display tracking-widest">
                {opponent?.id === 'bot' ? <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-game-teal" /> : null}
                {opponentName}
              </h2>
              <div className="text-4xl sm:text-5xl font-display text-game-red drop-shadow-lg">{opponent?.score || 0}</div>
            </div>
            <div className="text-[10px] sm:text-xs text-game-cream bg-game-dark/60 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border-2 border-game-red/30 shadow-inner font-display tracking-wider">
              البطاقات المتبقية
            </div>
          </div>
          <div className="flex justify-between gap-2 sm:gap-4">
             <CardCount type="rock" count={(opponent?.deck.rock || 0) + ((roomState.gameState === 'playing' || roomState.gameState === 'revealing' || (roomState.gameState === 'roundResult' && !isRevealingLocal)) && opponent?.choice === 'rock' ? 1 : 0)} />
             <CardCount type="paper" count={(opponent?.deck.paper || 0) + ((roomState.gameState === 'playing' || roomState.gameState === 'revealing' || (roomState.gameState === 'roundResult' && !isRevealingLocal)) && opponent?.choice === 'paper' ? 1 : 0)} />
             <CardCount type="scissors" count={(opponent?.deck.scissors || 0) + ((roomState.gameState === 'playing' || roomState.gameState === 'revealing' || (roomState.gameState === 'roundResult' && !isRevealingLocal)) && opponent?.choice === 'scissors' ? 1 : 0)} />
          </div>
        </div>

        {/* Battle Area */}
        <div className="h-40 sm:h-56 relative flex items-center justify-center bg-game-dark/40 border-y-4 border-game-dark shadow-inner">
          {(roomState.gameState === 'playing' || roomState.gameState === 'revealing' || roomState.gameState === 'roundResult') && (
            <div className="flex flex-col items-center w-full px-4 sm:px-6">
              <div className="flex items-center gap-3 sm:gap-6 w-full justify-center">
                
                {/* Player Card */}
                {me.choice ? (
                  <PlayedCard 
                    type={me.choice} 
                    isPlayer={true} 
                    winner={roomState.gameState === 'roundResult' && roomState.roundWinner === myId} 
                    faceDown={roomState.gameState === 'playing' || roomState.gameState === 'revealing' || (roomState.gameState === 'roundResult' && !isRevealingLocal)} 
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
                      <div className="text-3xl sm:text-4xl font-display text-game-red">{roomState.timeLeft}</div>
                      {!me.choice ? (
                        <div className="flex flex-col items-center">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border-4 border-game-dark border-t-game-teal animate-spin mb-1"></div>
                          <p className="text-[10px] sm:text-xs font-display tracking-widest italic whitespace-nowrap">اختر بطاقتك...</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border-4 border-game-dark border-t-game-red animate-spin mb-1"></div>
                          <p className="text-[10px] sm:text-xs font-display tracking-widest italic whitespace-nowrap">بانتظار الخصم...</p>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {(roomState.gameState === 'revealing' || roomState.gameState === 'roundResult') && (
                    <div className="flex flex-col items-center gap-1 sm:gap-2">
                      <div className="text-2xl sm:text-4xl font-display text-game-red italic tracking-tighter">VS</div>
                      {roomState.gameState === 'roundResult' && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: 'spring', bounce: 0.5, delay: 1.4 }}
                          className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-display tracking-widest whitespace-nowrap shadow-lg flex items-center gap-1.5 border-2 ${
                            roomState.roundWinner === myId ? 'bg-game-teal border-game-dark text-game-cream' :
                            roomState.roundWinner === opponentId ? 'bg-game-red border-game-dark text-game-cream' :
                            'bg-game-dark border-game-bg text-game-cream'
                          }`}
                        >
                          {roomState.roundWinner === myId ? (
                            <><Trophy className="w-3 h-3 sm:w-4 sm:h-4" /> فزت</>
                          ) : roomState.roundWinner === opponentId ? (
                            <><XCircle className="w-3 h-3 sm:w-4 sm:h-4" /> خسرت</>
                          ) : (
                            <><Minus className="w-3 h-3 sm:w-4 sm:h-4" /> تعادل</>
                          )}
                        </motion.div>
                      )}
                    </div>
                  )}
                </div>

                {/* Opponent Card */}
                {(opponent?.choice || (opponent && (opponent.deck.rock + opponent.deck.paper + opponent.deck.scissors) < (10 - roomState.round))) ? (
                  <PlayedCard 
                    type={opponent?.choice || 'rock'} 
                    isPlayer={false} 
                    winner={roomState.gameState === 'roundResult' && roomState.roundWinner === opponentId} 
                    faceDown={roomState.gameState === 'playing' || roomState.gameState === 'revealing' || (roomState.gameState === 'roundResult' && !isRevealingLocal)} 
                  />
                ) : (
                  <div className="w-16 sm:w-24 aspect-[3/4]" />
                )}
              </div>

              {/* Result Text */}
              {roomState.gameState === 'roundResult' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.8 }}
                  className="text-game-cream/60 text-xs sm:text-sm font-display tracking-widest italic mt-4 sm:mt-6"
                >
                  {roomState.round >= 9 ? 'جاري حساب النتيجة النهائية...' : 'جاري الانتقال للجولة التالية...'}
                </motion.div>
              )}
            </div>
          )}
        </div>

        {/* Player Area */}
        <div className="flex-1 flex flex-col justify-center px-4 py-2 bg-game-dark/20">
          <div className="flex justify-between items-end mb-2">
            <div>
              <h2 className="text-game-cream/40 text-xs sm:text-sm mb-1 font-display tracking-widest">{me.name}</h2>
              <div className="text-4xl sm:text-5xl font-display text-game-teal drop-shadow-lg">{me.score}</div>
            </div>
            <div className="text-[10px] sm:text-xs text-game-cream bg-game-teal/20 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border-2 border-game-teal/30 shadow-inner font-display tracking-widest">
              اختر بطاقتك
            </div>
          </div>
          <div className="flex justify-between gap-2 sm:gap-4">
             <PlayableCard type="rock" count={me.deck.rock} onClick={() => playCard('rock')} disabled={roomState.gameState !== 'playing' || me.choice !== null} />
             <PlayableCard type="paper" count={me.deck.paper} onClick={() => playCard('paper')} disabled={roomState.gameState !== 'playing' || me.choice !== null} />
             <PlayableCard type="scissors" count={me.deck.scissors} onClick={() => playCard('scissors')} disabled={roomState.gameState !== 'playing' || me.choice !== null} />
          </div>
        </div>
      </div>

      {renderDebugUI()}
    </div>
    </>
  );
}

const CardCount = ({ type, count }: { type: CardType, count: number }) => (
  <div className="flex-1 flex flex-col items-center gap-1 sm:gap-2">
    <div className={`w-full max-w-[4.5rem] aspect-[3/4] rounded-lg border-4 flex items-center justify-center shadow-2xl transition-all duration-300 overflow-hidden ${count > 0 ? 'paper-texture border-game-dark opacity-100' : 'bg-game-dark border-game-bg opacity-20 grayscale'}`}>
      <img src={CARD_IMAGES[type]} alt={CARD_NAMES[type]} className="w-2/3 h-2/3 object-contain drop-shadow-md" referrerPolicy="no-referrer" />
    </div>
    <div className={`text-[10px] sm:text-xs font-display px-2 py-0.5 rounded-md border-2 transition-colors duration-300 ${count > 0 ? 'bg-game-red border-game-dark text-game-cream' : 'bg-game-dark border-game-bg text-game-cream/20'}`}>
      {count}
    </div>
  </div>
);

const PlayableCard = ({ type, count, onClick, disabled }: { type: CardType, count: number, onClick: () => void, disabled: boolean }) => {
  const isAvailable = count > 0;
  return (
    <motion.button
      whileHover={isAvailable && !disabled ? { y: -4, scale: 1.05 } : {}}
      whileTap={isAvailable && !disabled ? { scale: 0.95 } : {}}
      onClick={onClick}
      disabled={!isAvailable || disabled}
      className={`flex-1 relative flex flex-col items-center gap-1 sm:gap-2 transition-all duration-300 ${(!isAvailable || disabled) ? 'opacity-40 cursor-not-allowed grayscale' : 'cursor-pointer'}`}
    >
      <div className={`w-full max-w-[5.5rem] aspect-[3/4] rounded-lg flex items-center justify-center shadow-2xl border-4 transition-colors overflow-hidden ${isAvailable && !disabled ? 'paper-texture border-game-dark hover:border-game-red' : 'bg-game-dark border-game-bg'}`}>
        <img src={CARD_IMAGES[type]} alt={CARD_NAMES[type]} className="w-2/3 h-2/3 object-contain drop-shadow-xl" referrerPolicy="no-referrer" />
      </div>
      <div className={`absolute -top-2 -right-2 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold border-2 shadow-lg transition-colors ${isAvailable ? 'bg-game-red border-game-dark text-game-cream' : 'bg-game-dark border-game-bg text-game-cream/20'}`}>
        {count}
      </div>
      <span className="text-[10px] sm:text-xs font-display text-game-cream tracking-wider">{CARD_NAMES[type]}</span>
    </motion.button>
  );
};

const PlayedCard = ({ type, isPlayer, winner, faceDown = false }: { type: CardType, isPlayer: boolean, winner: boolean, faceDown?: boolean }) => (
  <motion.div
    initial={{ 
      scale: 0.3, 
      opacity: 0, 
      x: isPlayer ? 0 : 0, 
      y: isPlayer ? 500 : -500, 
      rotate: isPlayer ? -30 : 30,
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
      damping: 20, 
      stiffness: 90,
      mass: 1.1,
      rotateY: { duration: 0.6, type: 'tween', ease: 'easeInOut' }
    }}
    style={{ transformStyle: 'preserve-3d' }}
    className="relative w-16 sm:w-24 aspect-[3/4] z-10"
  >
    {/* Front Side */}
    <div 
      className={`absolute inset-0 rounded-lg flex items-center justify-center shadow-2xl border-4 overflow-hidden backface-hidden ${
        winner 
          ? 'paper-texture border-game-red ring-4 ring-game-red/30'
          : 'paper-texture border-game-dark'
      }`}
      style={{ 
        backfaceVisibility: 'hidden',
        visibility: faceDown ? 'hidden' : 'visible'
      }}
    >
      {winner && (
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="absolute inset-0 bg-gradient-to-t from-game-red/20 to-transparent"
        />
      )}
      <span className="relative z-10">
        <img src={CARD_IMAGES[type]} alt={CARD_NAMES[type]} className="w-10 h-10 sm:w-16 sm:h-16 object-contain drop-shadow-2xl" referrerPolicy="no-referrer" />
      </span>
    </div>

    {/* Back Side (Face Down) */}
    <div 
      className={`absolute inset-0 rounded-lg flex items-center justify-center shadow-2xl border-4 ${isPlayer ? 'bg-game-teal border-teal-700' : 'bg-game-red border-red-800'}`}
      style={{ 
        backfaceVisibility: 'hidden',
        transform: 'rotateY(180deg)'
      }}
    >
      <div className="absolute inset-0 paper-texture opacity-30 mix-blend-overlay"></div>
      <div className={`relative w-full h-full border-2 rounded-sm flex items-center justify-center ${isPlayer ? 'border-teal-300/30' : 'border-red-300/30'}`}>
        <div className={`w-8 h-8 sm:w-12 sm:h-12 border-2 rounded-full flex items-center justify-center ${isPlayer ? 'border-teal-300/40' : 'border-red-300/40'}`}>
          <div className={`w-4 h-4 sm:w-6 sm:h-6 rounded-full ${isPlayer ? 'bg-teal-300/40' : 'bg-red-300/40'}`} />
        </div>
      </div>
    </div>
  </motion.div>
);

export default App;
