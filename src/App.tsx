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

  const addLog = (msg: string, type: 'info' | 'error' | 'success' = 'info') => {
    const newLog: LogEntry = { id: Date.now() + Math.random(), time: new Date().toLocaleTimeString(), msg, type };
    setLogs(prev => [newLog, ...prev].slice(0, 50));
    console.log(`[${type.toUpperCase()}] ${msg}`);
  };

  // Native Bridge Setup
  useEffect(() => {
    const statusListener = LocalServer.addListener('onStatusUpdate', (info) => {
      setRole(info.role as any);
      setConnectionStatus(info.status as any);
      setClientCount(info.clientCount);
      if (info.localIp) setUserIp(info.localIp);
    });

    const logListener = LocalServer.addListener('onLog', (info) => {
      addLog(info.message, info.type as any);
    });

    const messageListener = LocalServer.addListener('onMessageReceived', (info) => {
      try {
        const data = JSON.parse(info.message);
        handleNativeMessage(data);
      } catch (e) {
        addLog(`Received non-JSON message: ${info.message}`, 'info');
      }
    });

    return () => {
      statusListener.remove();
      logListener.remove();
      messageListener.remove();
    };
  }, []);

  const handleNativeMessage = (data: any) => {
    if (data.type === 'ROOM_READY') {
      addLog('Room is ready, joining...', 'success');
      setAppState('inRoom');
      LocalServer.getStatus().then(status => {
        if (status.role === 'HOST') {
          sendNativeAction({ type: 'host_join', playerName: playerNameRef.current });
        } else if (status.role === 'CLIENT') {
          sendNativeAction({ type: 'join_game', playerName: playerNameRef.current });
        }
      });
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
      await LocalServer.sendMessage({ message: JSON.stringify(action) });
    } catch (e) {
      addLog(`Failed to send action: ${e}`, 'error');
    }
  };

  useEffect(() => {
    const initCapacitor = async () => {
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
  }, []);

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

  const joinGame = async () => {
    if (!ipInput.trim()) {
      setErrorMsg('يرجى إدخال عنوان IP');
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
    const serverUrl = window.location.hostname;
    LocalServer.connectToServer({ ip: serverUrl, port: 3000 })
      .then(() => {
        const checkVerified = setInterval(() => {
          LocalServer.getStatus().then(status => {
            if (status.status === 'VERIFIED') {
              clearInterval(checkVerified);
              sendNativeAction({ type: 'create_room', playerName: playerName.trim() });
            }
          });
        }, 500);
      })
      .catch(e => setErrorMsg('تعذر الاتصال بالخادم'));
  };

  const joinOnlineRoom = () => {
    if (!roomIdInput.trim()) return;
    const serverUrl = window.location.hostname;
    LocalServer.connectToServer({ ip: serverUrl, port: 3000 })
      .then(() => {
        const checkVerified = setInterval(() => {
          LocalServer.getStatus().then(status => {
            if (status.status === 'VERIFIED') {
              clearInterval(checkVerified);
              sendNativeAction({ type: 'join_room', roomId: roomIdInput.trim().toUpperCase(), playerName: playerName.trim() });
            }
          });
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
      
      // Bot choice
      const bot = newState.players.bot;
      const availableBotCards = (Object.keys(bot.deck) as CardType[]).filter(t => bot.deck[t] > 0);
      const botChoice = availableBotCards[Math.floor(Math.random() * availableBotCards.length)];
      bot.choice = botChoice;
      bot.deck[botChoice] -= 1;
      
      setRoomState(newState);
      handleOfflineReveal(newState);
    } else {
      sendNativeAction({ type: 'play_card', roomId, choice });
    }
  };

  const handleOfflineReveal = (state: Room) => {
    setRoomState(prev => {
      if (!prev) return prev;
      return { ...prev, gameState: 'revealing' };
    });
    
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
        }, 3000);

        return newState;
      });
    }, 1200);
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
    if (roomId) {
      sendNativeAction({ type: 'leave_room', roomId });
    }
    await LocalServer.stopAll();
    setRoomId(null);
    setRoomState(null);
    setAppState('menu');
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
          <div className="bg-rose-600 text-white px-4 py-3 rounded-2xl shadow-2xl shadow-rose-900/40 flex items-center justify-between gap-3 border border-rose-500/50 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <XCircle className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold leading-tight text-right">{errorMsg}</p>
            </div>
            <button 
              onClick={() => setErrorMsg(null)}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
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
      <button 
        onClick={() => setShowDebug(true)} 
        className="fixed top-6 left-6 p-3 bg-slate-900/50 hover:bg-slate-800 text-slate-400 hover:text-white rounded-full shadow-xl z-[60] transition-all active:scale-90 flex items-center justify-center border border-slate-700/50 backdrop-blur-sm"
        title="سجل الأخطاء"
      >
        <Bug className="w-5 h-5" />
      </button>

      {/* Debug Overlay */}
      <AnimatePresence>
        {showDebug && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed inset-0 z-[70] bg-slate-950/95 flex flex-col p-4 font-mono text-xs"
            dir="ltr"
          >
            <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-2">
              <h3 className="text-slate-200 font-bold text-lg font-sans" dir="rtl">سجل الأخطاء والاتصال</h3>
              <div className="flex gap-2">
                <button 
                  onClick={() => setLogs([])}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] rounded-lg font-bold transition-colors font-sans"
                  dir="rtl"
                >
                  مسح السجل
                </button>
                <button onClick={() => setShowDebug(false)} className="p-1.5 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 flex flex-col-reverse">
              {logs.length === 0 && (
                <div className="text-slate-500 text-center py-4 font-sans" dir="rtl">لا يوجد سجلات حتى الآن</div>
              )}
              {logs.map(log => (
                <div key={log.id} className={`p-2 rounded border break-words ${log.type === 'error' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : log.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-800/50 border-slate-700 text-slate-300'}`}>
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

  if (appState === 'nameEntry') {
    return (
      <>
        {renderErrorToast()}
        <div 
          dir="rtl" 
          className="h-[100dvh] bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 font-sans"
          style={{
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="max-w-sm w-full bg-slate-900/50 p-8 rounded-3xl border border-slate-800 backdrop-blur-sm"
          >
            <div className="mb-8 flex justify-center gap-4">
              <motion.img src={CARD_IMAGES.rock} alt="حجر" className="w-16 h-16 object-contain" animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 2 }} />
              <motion.img src={CARD_IMAGES.paper} alt="ورقة" className="w-16 h-16 object-contain" animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 2, delay: 0.2 }} />
              <motion.img src={CARD_IMAGES.scissors} alt="مقص" className="w-16 h-16 object-contain" animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 2, delay: 0.4 }} />
            </div>

            <h2 className="text-2xl font-bold mb-6 text-center text-slate-200">مرحباً بك أيها المحارب!</h2>
            <p className="text-slate-400 text-center mb-8">ما هو الاسم الذي تود أن يعرفك به خصومك؟</p>
            
            <div className="space-y-6">
              <input
                type="text"
                placeholder="أدخل اسمك هنا..."
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                autoFocus
                className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl py-3.5 px-6 text-center text-lg font-bold focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                onKeyDown={(e) => e.key === 'Enter' && saveName()}
              />
              
              <button
                onClick={saveName}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-lg shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
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
          className="h-[100dvh] bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 font-sans overflow-y-auto"
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
            <div className="mb-6 flex items-center justify-center gap-3 bg-slate-900/40 py-3 px-6 rounded-2xl border border-slate-800 w-fit max-w-[90%] mx-auto">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              <span className="text-slate-300 font-bold">المحارب: {playerName}</span>
              <button 
                onClick={() => setAppState('nameEntry')}
                className="p-1.5 bg-slate-800 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition-all"
                title="تعديل الاسم"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black mb-8 text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
              اختر وضع اللعب
            </h1>
            
            <div className="space-y-4">
              <AnimatePresence mode="wait">
                {menuTab === 'main' && (
                  <motion.div
                    key="main"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex flex-col gap-3"
                  >
                    <button
                      disabled
                      className="w-[90%] mx-auto py-3 sm:py-4 bg-slate-800 text-slate-500 rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg shadow-lg cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Globe className="w-5 h-5 sm:w-6 sm:h-6" /> لعب عبر الإنترنت (قريباً)
                    </button>
                    <button
                      onClick={() => setMenuTab('local')}
                      className="w-[90%] mx-auto py-3 sm:py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      <Home className="w-5 h-5 sm:w-6 sm:h-6" /> شبكة محلية (IP)
                    </button>
                    <button
                      onClick={createBotRoom}
                      className="w-[90%] mx-auto py-3 sm:py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      <Bot className="w-5 h-5 sm:w-6 sm:h-6" /> ضد الكمبيوتر
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
                    <button onClick={() => setMenuTab('main')} className="text-slate-400 hover:text-white flex items-center gap-2 mb-2 w-fit transition-colors text-sm sm:text-base">
                      <span>➔</span> رجوع
                    </button>
                    <button
                      onClick={createOnlineRoom}
                      className="w-[90%] mx-auto py-3 sm:py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      إنشاء غرفة جديدة
                    </button>
                    
                    <div className="relative flex items-center py-2">
                      <div className="flex-grow border-t border-slate-800"></div>
                      <span className="flex-shrink-0 mx-4 text-slate-500 text-xs sm:text-sm">أو الانضمام لغرفة</span>
                      <div className="flex-grow border-t border-slate-800"></div>
                    </div>

                    <div className="relative w-[90%] mx-auto">
                      <input
                        type="text"
                        placeholder="أدخل كود الغرفة..."
                        value={roomIdInput}
                        onChange={(e) => setRoomIdInput(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl sm:rounded-2xl py-3 sm:py-4 px-4 sm:px-6 text-center text-lg sm:text-xl font-mono uppercase focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                        maxLength={6}
                      />
                      {roomIdInput.trim().length > 0 && (
                        <motion.button
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          onClick={joinOnlineRoom}
                          className="absolute left-1.5 sm:left-2 top-1.5 sm:top-2 bottom-1.5 sm:bottom-2 px-4 sm:px-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg sm:rounded-xl font-bold transition-all shadow-md text-sm sm:text-base"
                        >
                          انضمام
                        </motion.button>
                      )}
                    </div>
                  </motion.div>
                )}

                {menuTab === 'local' && (
                  <motion.div
                    key="local"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex flex-col gap-6 w-full max-w-[340px] mx-auto px-2 relative"
                  >
                    <AnimatePresence>
                      {connectionStatus === 'CONNECTING' && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-3xl"
                        >
                          <div className="w-12 h-12 rounded-full border-4 border-slate-800 border-t-indigo-500 animate-spin mb-4"></div>
                          <p className="text-indigo-400 font-bold animate-pulse">جاري الاتصال...</p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button 
                      onClick={() => setMenuTab('main')} 
                      className="text-slate-400 hover:text-white flex items-center gap-2 w-fit transition-colors text-sm font-bold group mb-1 ms-2"
                    >
                      <span className="group-hover:-translate-x-1 transition-transform">➔</span> رجوع للقائمة
                    </button>

                    {/* Host Section */}
                    <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-3xl backdrop-blur-sm shadow-xl">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-cyan-500/10 rounded-xl">
                            <Globe className="w-5 h-5 text-cyan-400" />
                          </div>
                          <div className="text-right">
                            <h3 className="text-slate-200 font-bold text-sm">استضافة لعبة</h3>
                            <p className="text-[10px] text-slate-500">حول جهازك إلى خادم محلي</p>
                          </div>
                        </div>
                        <button 
                          onClick={fetchIp}
                          className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-500 hover:text-cyan-400"
                          title="تحديث الـ IP"
                        >
                          <Bug className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <button
                        onClick={hostGame}
                        className="w-full py-3.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-2xl font-black text-base shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                      >
                        بدء الاستضافة (Host)
                      </button>
                      
                      <p className="text-[10px] text-slate-500 text-center mt-3 px-2 leading-relaxed opacity-70">
                        سيظهر الـ IP الخاص بك للاعبين الآخرين على نفس الشبكة للاتصال بك.
                      </p>
                    </div>

                    {/* Join Section */}
                    <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-3xl backdrop-blur-sm shadow-xl">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-indigo-500/10 rounded-xl">
                          <Bot className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div className="text-right">
                          <h3 className="text-slate-200 font-bold text-sm">انضمام لصديق</h3>
                          <p className="text-[10px] text-slate-500">الاتصال بجهاز صديقك عبر الـ IP</p>
                        </div>
                      </div>

                      <div className="relative group">
                        <input
                          type="text"
                          placeholder="مثال: 192.168.1.5"
                          value={ipInput}
                          onChange={(e) => setIpInput(e.target.value)}
                          className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl py-4 px-6 text-center text-lg font-mono focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-700"
                          dir="ltr"
                        />
                        <AnimatePresence>
                          {ipInput.trim().length > 0 && (
                            <motion.button
                              initial={{ opacity: 0, scale: 0.9, x: 10 }}
                              animate={{ opacity: 1, scale: 1, x: 0 }}
                              exit={{ opacity: 0, scale: 0.9, x: 10 }}
                              onClick={joinGame}
                              className="absolute left-2 top-2 bottom-2 px-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black transition-all shadow-lg shadow-indigo-500/30 text-sm"
                            >
                              اتصال
                            </motion.button>
                          )}
                        </AnimatePresence>
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
    <div className="h-[100dvh] bg-slate-950">
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
    <div className="h-[100dvh] bg-slate-950">
      {renderDebugUI()}
    </div>
  );

  const me = roomState.players[myId];
  const opponentId = Object.keys(roomState.players).find(id => id !== myId);
  const opponent = opponentId ? roomState.players[opponentId] : null;

  if (!opponent && !roomState.isBotRoom && roomState.gameState !== 'waiting') return (
    <div className="h-[100dvh] bg-slate-950">
      {renderDebugUI()}
    </div>
  );
  const opponentName = opponent?.name || 'الخصم';

  if (roomState.gameState === 'waiting') {
    return (
      <>
        <div 
          dir="rtl" 
          className="h-[100dvh] bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 font-sans"
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
            className="bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl max-w-sm w-full text-center"
          >
            <div className="w-12 h-12 rounded-full border-4 border-slate-800 border-t-indigo-500 animate-spin mx-auto mb-6"></div>
            <h2 className="text-xl font-bold mb-2 text-slate-200">في انتظار الخصم...</h2>
            
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className={`w-2 h-2 rounded-full ${connectionStatus === 'CONNECTION_VERIFIED' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></div>
              <span className="text-[10px] text-slate-500 font-mono">
                {connectionStatus === 'CONNECTION_VERIFIED' ? 'اتصال مؤمن' : 'جاري تأمين الاتصال'}
              </span>
            </div>
            
            {role === 'HOST' ? (
              <>
                <p className="text-slate-400 mb-4 text-xs sm:text-sm px-4">أنت الآن تستضيف اللعبة. اطلب من صديقك إدخال الـ IP الخاص بك للاتصال.</p>
                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 mb-4">
                  <div className="text-[10px] text-slate-500 mb-1">عنوان الـ IP الخاص بك</div>
                  <div className="text-xl sm:text-2xl font-mono font-black text-cyan-400 select-all">{userIp}</div>
                </div>
              </>
            ) : (
              <>
                <p className="text-slate-400 mb-4 text-xs sm:text-sm px-4">شارك كود الغرفة مع صديقك للعب عبر الإنترنت</p>
                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 mb-4">
                  <div className="text-[10px] text-slate-500 mb-1">كود الغرفة</div>
                  <div className="text-3xl font-mono font-black tracking-widest text-indigo-400">{roomId}</div>
                </div>
              </>
            )}
            
            <div className="flex flex-col gap-2">
              {role === 'HOST' ? (
                <button
                  onClick={() => navigator.clipboard.writeText(userIp)}
                  className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold transition-all text-sm sm:text-base flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" /> نسخ عنوان الـ IP
                </button>
              ) : (
                <button
                  onClick={copyRoomId}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all text-sm sm:text-base flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" /> نسخ كود الغرفة
                </button>
              )}
              <button
                onClick={leaveRoom}
                className="w-full py-3 mt-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-xl font-bold transition-all text-sm sm:text-base"
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
          className="h-[100dvh] bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 font-sans overflow-y-auto"
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
            className="bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl max-w-sm w-full text-center relative overflow-hidden"
          >
            {finalWin && <div className="absolute inset-0 bg-green-500/10 animate-pulse"></div>}
            {finalLoss && <div className="absolute inset-0 bg-rose-500/10 animate-pulse"></div>}
            
            <div className="relative z-10">
              <h2 className="text-2xl font-bold mb-2 text-slate-400">النتيجة النهائية</h2>
              <div className="text-7xl mb-6 mt-4">
                {finalWin ? '🏆' : finalLoss ? '💀' : '🤝'}
              </div>
              <div className={`text-3xl font-black mb-8 ${finalWin ? 'text-green-400' : finalLoss ? 'text-rose-400' : 'text-slate-300'}`}>
                {finalWin ? 'لقد انتصرت!' : finalLoss ? 'لقد خسرت!' : 'تعادل!'}
              </div>
              
              <div className="flex justify-center gap-8 mb-8 bg-slate-950/50 py-5 rounded-2xl border border-slate-800">
                <div className="flex flex-col items-center">
                  <span className="text-slate-500 text-[10px] mb-1 uppercase tracking-wider">{me.name}</span>
                  <span className="text-4xl font-black text-indigo-400">{me.score}</span>
                </div>
                <div className="w-px bg-slate-800 my-2"></div>
                <div className="flex flex-col items-center">
                  <span className="text-slate-500 text-[10px] mb-1 uppercase tracking-wider">{opponentName}</span>
                  <span className="text-4xl font-black text-rose-400">{opponent?.score || 0}</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={playAgain}
                  disabled={me.readyForNext}
                  className={`w-full py-4 rounded-xl font-bold text-lg transition-all shadow-lg ${me.readyForNext ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98]'}`}
                >
                  {me.readyForNext ? 'في انتظار الخصم...' : 'العب مرة أخرى'}
                </button>
                <button
                  onClick={leaveRoom}
                  className="w-full py-3 bg-slate-800/50 hover:bg-slate-800 text-slate-300 rounded-xl font-bold transition-all"
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
        className="h-[100dvh] bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30 overflow-hidden flex flex-col"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)'
      }}
    >
      <div className="max-w-md mx-auto w-full h-full flex flex-col flex-1 relative">
        {/* Header */}
        <header className="flex justify-between items-center px-4 py-3 border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md z-20">
          <div className="flex items-center gap-3">
            <button 
              onClick={leaveRoom}
              className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
              title="خروج"
            >
              <XCircle className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <div className="flex flex-col">
              <h1 className="text-base sm:text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
                صراع البطاقات
              </h1>
              <span className="text-[10px] sm:text-xs text-slate-500 font-mono">{roomState.isBotRoom ? 'لعب فردي' : 'لعب محلي'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex flex-col items-end">
              <span className="text-[10px] sm:text-xs text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded-md">
                +{roomState.round >= 7 ? 3 : roomState.round >= 4 ? 2 : 1} نقطة
              </span>
            </div>
            <span className="bg-slate-800 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-mono border border-slate-700 text-indigo-300">
              {roomState.round} / 9
            </span>
          </div>
        </header>

        {/* Opponent Area */}
        <div className="flex-1 flex flex-col justify-center px-4 py-2">
          <div className="flex justify-between items-end mb-2">
            <div>
              <h2 className="text-slate-400 text-xs sm:text-sm mb-1 flex items-center gap-2">
                {opponent?.id === 'bot' ? <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" /> : null}
                {opponentName}
              </h2>
              <div className="text-3xl sm:text-4xl font-black text-rose-400">{opponent?.score || 0}</div>
            </div>
            <div className="text-[10px] sm:text-xs text-slate-400 bg-slate-900 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-slate-800 shadow-inner">
              البطاقات المتبقية
            </div>
          </div>
          <div className="flex justify-between gap-2 sm:gap-4">
             <CardCount type="rock" count={opponent?.deck.rock || 0} />
             <CardCount type="paper" count={opponent?.deck.paper || 0} />
             <CardCount type="scissors" count={opponent?.deck.scissors || 0} />
          </div>
        </div>

        {/* Battle Area */}
        <div className="h-40 sm:h-56 relative flex items-center justify-center bg-gradient-to-b from-slate-900/80 to-slate-800/80 border-y border-slate-800/80 shadow-inner">
          {roomState.gameState === 'playing' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-slate-500 flex flex-col items-center gap-3 sm:gap-4"
            >
              <div className="text-3xl sm:text-4xl font-black text-indigo-400 mb-1">{roomState.timeLeft}</div>
              {me.choice ? (
                <>
                  <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full border-4 border-slate-800 border-t-rose-500 animate-spin"></div>
                  <p className="text-xs sm:text-sm font-medium tracking-wide">بانتظار اختيار الخصم...</p>
                </>
              ) : (
                <>
                  <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full border-4 border-slate-800 border-t-indigo-500 animate-spin"></div>
                  <p className="text-xs sm:text-sm font-medium tracking-wide">بانتظار اختيارك...</p>
                </>
              )}
            </motion.div>
          )}
          
          {roomState.gameState === 'revealing' && (
            <div className="flex items-center gap-3 sm:gap-6 w-full justify-center px-4 sm:px-6">
              <PlayedCard type={me.choice!} isPlayer={true} winner={false} />
              <div className="text-lg sm:text-2xl font-black text-slate-700 italic">VS</div>
              <motion.div
                initial={{ scale: 0.5, opacity: 0, x: -30, rotate: 10 }}
                animate={{ scale: 1, opacity: 1, x: 0, rotate: 0 }}
                className="w-16 sm:w-24 aspect-[3/4] rounded-xl flex items-center justify-center text-3xl sm:text-4xl shadow-2xl border-2 bg-slate-800 border-slate-700"
              >
                <motion.span
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                >
                  ❓
                </motion.span>
              </motion.div>
            </div>
          )}

          {roomState.gameState === 'roundResult' && (
            <div className="flex flex-col items-center w-full px-4 sm:px-6">
              <div className="flex items-center gap-3 sm:gap-6 w-full justify-center mb-4 sm:mb-6">
                <PlayedCard type={me.choice!} isPlayer={true} winner={roomState.roundWinner === myId} />
                <div className="flex flex-col items-center gap-1 sm:gap-2">
                  <div className="text-lg sm:text-2xl font-black text-slate-700 italic">VS</div>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', bounce: 0.5 }}
                    className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-bold whitespace-nowrap shadow-lg flex items-center gap-1.5 ${
                      roomState.roundWinner === myId ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                      roomState.roundWinner === opponentId ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                      'bg-slate-500/20 text-slate-300 border border-slate-500/30'
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
                </div>
                <PlayedCard type={opponent!.choice!} isPlayer={false} winner={roomState.roundWinner === opponentId} />
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-slate-400 text-xs sm:text-sm font-medium"
              >
                {roomState.round >= 9 ? 'جاري حساب النتيجة النهائية...' : 'جاري الانتقال للجولة التالية...'}
              </motion.div>
            </div>
          )}
        </div>

        {/* Player Area */}
        <div className="flex-1 flex flex-col justify-center px-4 py-2 bg-slate-900/30">
          <div className="flex justify-between items-end mb-2">
            <div>
              <h2 className="text-slate-400 text-xs sm:text-sm mb-1">{me.name}</h2>
              <div className="text-3xl sm:text-4xl font-black text-indigo-400">{me.score}</div>
            </div>
            <div className="text-[10px] sm:text-xs text-slate-400 bg-indigo-950/50 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-indigo-900/50 shadow-inner">
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
    <div className={`w-full max-w-[4.5rem] aspect-[3/4] rounded-xl border-2 flex items-center justify-center shadow-inner transition-all duration-300 overflow-hidden ${count > 0 ? 'bg-slate-800 border-slate-700 opacity-100' : 'bg-slate-900/50 border-slate-800/50 opacity-20 grayscale'}`}>
      <img src={CARD_IMAGES[type]} alt={CARD_NAMES[type]} className="w-2/3 h-2/3 object-contain drop-shadow-md" referrerPolicy="no-referrer" />
    </div>
    <div className={`text-[10px] sm:text-xs font-mono px-2 py-0.5 rounded-full border transition-colors duration-300 ${count > 0 ? 'bg-slate-800 border-slate-600 text-slate-300' : 'bg-slate-900 border-slate-800 text-slate-600'}`}>
      {count}
    </div>
  </div>
);

const PlayableCard = ({ type, count, onClick, disabled }: { type: CardType, count: number, onClick: () => void, disabled: boolean }) => {
  const isAvailable = count > 0;
  return (
    <motion.button
      whileHover={isAvailable && !disabled ? { y: -4 } : {}}
      whileTap={isAvailable && !disabled ? { scale: 0.95 } : {}}
      onClick={onClick}
      disabled={!isAvailable || disabled}
      className={`flex-1 relative flex flex-col items-center gap-1 sm:gap-2 transition-all duration-300 ${(!isAvailable || disabled) ? 'opacity-40 cursor-not-allowed grayscale' : 'cursor-pointer'}`}
    >
      <div className={`w-full max-w-[5.5rem] aspect-[3/4] rounded-xl flex items-center justify-center shadow-xl border-2 transition-colors overflow-hidden ${isAvailable && !disabled ? 'bg-indigo-900/30 border-indigo-500/50 hover:border-indigo-400 hover:bg-indigo-800/40' : 'bg-slate-800 border-slate-700'}`}>
        <img src={CARD_IMAGES[type]} alt={CARD_NAMES[type]} className="w-2/3 h-2/3 object-contain drop-shadow-xl" referrerPolicy="no-referrer" />
      </div>
      <div className={`absolute -top-2 -right-2 w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold border-2 shadow-lg transition-colors ${isAvailable ? 'bg-indigo-500 border-slate-900 text-white' : 'bg-slate-700 border-slate-900 text-slate-400'}`}>
        {count}
      </div>
      <span className="text-[10px] sm:text-xs font-bold text-slate-300">{CARD_NAMES[type]}</span>
    </motion.button>
  );
};

const PlayedCard = ({ type, isPlayer, winner }: { type: CardType, isPlayer: boolean, winner: boolean }) => (
  <motion.div
    initial={{ scale: 0.5, opacity: 0, x: isPlayer ? 20 : -20, rotate: isPlayer ? -10 : 10 }}
    animate={{ scale: 1, opacity: 1, x: 0, rotate: 0 }}
    transition={{ type: 'spring', damping: 15, stiffness: 150 }}
    className={`w-16 sm:w-24 aspect-[3/4] rounded-xl flex items-center justify-center shadow-2xl border-2 relative overflow-hidden ${
      winner 
        ? isPlayer ? 'bg-indigo-500/20 border-indigo-400 shadow-indigo-500/30' : 'bg-rose-500/20 border-rose-400 shadow-rose-500/30'
        : 'bg-slate-800 border-slate-700'
    }`}
  >
    {winner && (
      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent"
      />
    )}
    <span className="relative z-10">
      <img src={CARD_IMAGES[type]} alt={CARD_NAMES[type]} className="w-10 h-10 sm:w-16 sm:h-16 object-contain drop-shadow-2xl" referrerPolicy="no-referrer" />
    </span>
  </motion.div>
);

export default App;
