import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { io, Socket } from 'socket.io-client';
import { Bot, Globe, Home, Trophy, XCircle, Minus, Copy } from 'lucide-react';

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
  rock: '/rock.png',
  paper: '/paper.png',
  scissors: '/scissors.png'
};

const CARD_NAMES: Record<CardType, string> = {
  rock: 'حجر',
  paper: 'ورقة',
  scissors: 'مقص'
};

let socket: Socket | null = null;

export default function App() {
  const [appState, setAppState] = useState<'menu' | 'inRoom'>('menu');
  const [menuTab, setMenuTab] = useState<'main' | 'online' | 'local'>('main');
  const [playerName, setPlayerName] = useState('');
  const [ipInput, setIpInput] = useState('');
  const [roomIdInput, setRoomIdInput] = useState('');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomState, setRoomState] = useState<Room | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [userIp, setUserIp] = useState<string>('جاري التحميل...');

  useEffect(() => {
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => setUserIp(data.ip))
      .catch(() => setUserIp('تعذر جلب الـ IP'));
  }, []);

  const setupSocket = (url?: string) => {
    if (socket) socket.disconnect();
    socket = url ? io(url) : io();

    socket.on('room_created', (id: string) => {
      setRoomId(id);
      setAppState('inRoom');
      setErrorMsg(null);
    });

    socket.on('room_state', (state: Room) => {
      setRoomState(state);
      setRoomId(state.id);
      setAppState('inRoom');
      setErrorMsg(null);

      // Auto-play last card if only one card remains and player hasn't chosen yet
      if (state.gameState === 'playing') {
        const myId = socket?.id;
        const me = state.players[myId!];
        if (me && me.choice === null) {
          const totalCards = me.deck.rock + me.deck.paper + me.deck.scissors;
          if (totalCards === 1) {
            let lastChoice: CardType | null = null;
            if (me.deck.rock === 1) lastChoice = 'rock';
            else if (me.deck.paper === 1) lastChoice = 'paper';
            else if (me.deck.scissors === 1) lastChoice = 'scissors';

            if (lastChoice) {
              socket?.emit('play_card', { roomId: state.id, choice: lastChoice });
            }
          }
        }
      }
    });

    socket.on('error_msg', (msg: string) => {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 3000);
    });

    return socket;
  };

  const hostGame = () => {
    const s = setupSocket();
    s.emit('host_game', playerName.trim() || 'لاعب');
  };

  const createRoom = () => {
    const s = setupSocket();
    s.emit('create_room', playerName.trim() || 'لاعب');
  };

  const joinRoom = () => {
    if (!roomIdInput.trim()) return;
    const s = setupSocket();
    s.emit('join_room', { roomId: roomIdInput.trim().toUpperCase(), playerName: playerName.trim() || 'لاعب' });
  };

  const copyRoomId = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      setErrorMsg('تم نسخ كود الغرفة!');
      setTimeout(() => setErrorMsg(null), 2000);
    }
  };

  const createBotRoom = () => {
    const s = setupSocket();
    s.emit('create_bot_room', playerName.trim() || 'لاعب');
  };

  const joinGame = () => {
    if (!ipInput.trim()) return;
    let url = ipInput.trim();
    if (!url.startsWith('http')) {
      url = `http://${url}:3000`;
    }
    const s = setupSocket(url);
    s.emit('join_hosted_game', playerName.trim() || 'لاعب');
  };

  const playCard = (choice: CardType) => {
    if (!roomId || !socket) return;
    socket.emit('play_card', { roomId, choice });
  };

  const nextRound = () => {
    if (!roomId || !socket) return;
    socket.emit('next_round', roomId);
  };

  const playAgain = () => {
    if (!roomId || !socket) return;
    socket.emit('play_again', roomId);
  };

  const leaveRoom = () => {
    if (roomId && socket) {
      socket.emit('leave_room', roomId);
      socket.disconnect();
      socket = null;
      setRoomId(null);
      setRoomState(null);
      setAppState('menu');
    }
  };

  if (appState === 'menu') {
    return (
      <div dir="rtl" className="h-[100dvh] bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 font-sans overflow-y-auto">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="max-w-md w-full text-center"
        >
          <div className="mb-6 sm:mb-8 flex justify-center gap-4 sm:gap-6">
            <motion.img src="/rock.png" alt="حجر" className="w-20 h-20 sm:w-32 sm:h-32 object-contain drop-shadow-lg" animate={{ y: [0, -12, 0] }} transition={{ repeat: Infinity, duration: 2, delay: 0 }} />
            <motion.img src="/paper.png" alt="ورقة" className="w-16 h-16 sm:w-24 sm:h-24 object-contain drop-shadow-lg" animate={{ y: [0, -12, 0] }} transition={{ repeat: Infinity, duration: 2, delay: 0.2 }} />
            <motion.img src="/scissors.png" alt="مقص" className="w-16 h-16 sm:w-24 sm:h-24 object-contain drop-shadow-lg" animate={{ y: [0, -12, 0] }} transition={{ repeat: Infinity, duration: 2, delay: 0.4 }} />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black mb-2 sm:mb-4 text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
            صراع البطاقات حجر ورقة مقص
          </h1>
          <p className="text-slate-400 mb-8 sm:mb-10 leading-relaxed text-base sm:text-lg">
            العب مع أصدقائك عبر الشبكة المحلية! أنشئ غرفة أو انضم إلى غرفة موجودة.
          </p>
          
          {errorMsg && (
            <div className="mb-6 p-3 bg-rose-500/20 border border-rose-500/50 text-rose-400 rounded-xl text-sm sm:text-base">
              {errorMsg}
            </div>
          )}

          <div className="space-y-4">
            <input
              type="text"
              placeholder="أدخل اسمك (اختياري)..."
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl sm:rounded-2xl py-3 sm:py-4 px-4 sm:px-6 text-center text-lg sm:text-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all mb-4"
            />
            
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
                    className="w-full py-3 sm:py-4 bg-slate-800 text-slate-500 rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg shadow-lg cursor-not-allowed flex items-center justify-center gap-2 relative overflow-hidden"
                  >
                    <Globe className="w-5 h-5 sm:w-6 sm:h-6" /> لعب عبر الإنترنت
                    <span className="absolute top-0 right-0 bg-rose-500/20 text-rose-400 text-[10px] sm:text-xs px-2 py-0.5 rounded-bl-lg font-bold">تحت الصيانة</span>
                  </button>
                  <button
                    onClick={() => setMenuTab('local')}
                    className="w-full py-3 sm:py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <Home className="w-5 h-5 sm:w-6 sm:h-6" /> شبكة محلية (IP)
                  </button>
                  <button
                    onClick={createBotRoom}
                    className="w-full py-3 sm:py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
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
                    onClick={createRoom}
                    className="w-full py-3 sm:py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    إنشاء غرفة جديدة
                  </button>
                  
                  <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-slate-800"></div>
                    <span className="flex-shrink-0 mx-4 text-slate-500 text-xs sm:text-sm">أو الانضمام لغرفة</span>
                    <div className="flex-grow border-t border-slate-800"></div>
                  </div>

                  <div className="relative w-full">
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
                        onClick={joinRoom}
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
                  className="flex flex-col gap-3"
                >
                  <button onClick={() => setMenuTab('main')} className="text-slate-400 hover:text-white flex items-center gap-2 mb-2 w-fit transition-colors text-sm sm:text-base">
                    <span>➔</span> رجوع
                  </button>
                  <button
                    onClick={hostGame}
                    className="w-full py-3 sm:py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    استضافة لعبة
                  </button>
                  
                  <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-slate-800"></div>
                    <span className="flex-shrink-0 mx-4 text-slate-500 text-xs sm:text-sm">أو الانضمام عبر IP</span>
                    <div className="flex-grow border-t border-slate-800"></div>
                  </div>

                  <div className="relative w-full">
                    <input
                      type="text"
                      placeholder="أدخل IP الخصم (مثال: 192.168.1.5)"
                      value={ipInput}
                      onChange={(e) => setIpInput(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl sm:rounded-2xl py-3 sm:py-4 px-4 sm:px-6 text-center text-base sm:text-lg focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                      dir="ltr"
                    />
                    {ipInput.trim().length > 0 && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={joinGame}
                        className="absolute left-1.5 sm:left-2 top-1.5 sm:top-2 bottom-1.5 sm:bottom-2 px-4 sm:px-6 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg sm:rounded-xl font-bold transition-all shadow-md text-sm sm:text-base"
                      >
                        انضمام
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!roomState) return null;

  const myId = socket.id;
  const me = roomState.players[myId!];
  const opponentId = Object.keys(roomState.players).find(id => id !== myId);
  const opponent = opponentId ? roomState.players[opponentId] : null;
  const opponentName = opponent?.name || 'الخصم';

  if (roomState.gameState === 'waiting') {
    return (
      <div dir="rtl" className="h-[100dvh] bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl max-w-sm w-full text-center"
        >
          <div className="w-16 h-16 rounded-full border-4 border-slate-800 border-t-indigo-500 animate-spin mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold mb-2 text-slate-200">في انتظار الخصم...</h2>
          
          {roomId === 'LOCAL_HOST' ? (
            <>
              <p className="text-slate-400 mb-6 text-sm sm:text-base">أنت الآن تستضيف اللعبة. اطلب من صديقك إدخال الـ IP الخاص بك للاتصال.</p>
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 mb-4">
                <div className="text-sm text-slate-500 mb-1">عنوان الـ IP الخاص بك</div>
                <div className="text-2xl sm:text-3xl font-mono font-black text-cyan-400 select-all">{userIp}</div>
                <div className="text-[10px] text-slate-600 mt-2">ملاحظة: إذا كنتما على نفس الشبكة، قد تحتاج لاستخدام الـ IP المحلي (مثال: 192.168.x.x)</div>
              </div>
            </>
          ) : (
            <>
              <p className="text-slate-400 mb-6 text-sm sm:text-base">شارك كود الغرفة مع صديقك للعب عبر الإنترنت</p>
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 mb-4">
                <div className="text-sm text-slate-500 mb-1">كود الغرفة</div>
                <div className="text-4xl font-mono font-black tracking-widest text-indigo-400">{roomId}</div>
              </div>
            </>
          )}
          
          <div className="flex flex-col gap-2">
            {roomId === 'LOCAL_HOST' ? (
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
          
          {errorMsg && (
            <div className="mt-4 text-sm text-indigo-300">
              {errorMsg}
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  if (roomState.gameState === 'gameOver') {
    const isWin = roomState.roundWinner === myId;
    const isLoss = roomState.roundWinner === opponentId;
    // Actually, roundWinner at gameOver isn't the final winner. We need to compare scores.
    const finalWin = me.score > opponent!.score;
    const finalLoss = me.score < opponent!.score;
    
    return (
      <div dir="rtl" className="h-[100dvh] bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 font-sans overflow-y-auto">
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
            
            <div className="flex justify-center gap-12 mb-10 bg-slate-950/50 py-6 rounded-2xl border border-slate-800">
              <div className="flex flex-col items-center">
                <span className="text-slate-400 text-sm mb-2">{me.name}</span>
                <span className="text-5xl font-black text-indigo-400">{me.score}</span>
              </div>
              <div className="w-px bg-slate-800"></div>
              <div className="flex flex-col items-center">
                <span className="text-slate-400 text-sm mb-2">{opponentName}</span>
                <span className="text-5xl font-black text-rose-400">{opponent!.score}</span>
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
    );
  }

  return (
    <div dir="rtl" className="h-[100dvh] bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30 overflow-hidden flex flex-col">
      <div className="max-w-md mx-auto w-full h-full flex flex-col flex-1 relative">
        {/* Header */}
        <header className="flex justify-between items-center px-4 py-3 border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md z-20">
          <div className="flex flex-col">
            <h1 className="text-base sm:text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
              صراع البطاقات
            </h1>
            <span className="text-[10px] sm:text-xs text-slate-500 font-mono">{roomState.isBotRoom ? 'لعب فردي' : 'لعب محلي'}</span>
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
              <div className="text-3xl sm:text-4xl font-black text-rose-400">{opponent!.score}</div>
            </div>
            <div className="text-[10px] sm:text-xs text-slate-400 bg-slate-900 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-slate-800 shadow-inner">
              البطاقات المتبقية
            </div>
          </div>
          <div className="flex justify-between gap-2 sm:gap-4">
             <CardCount type="rock" count={opponent!.deck.rock} />
             <CardCount type="paper" count={opponent!.deck.paper} />
             <CardCount type="scissors" count={opponent!.deck.scissors} />
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
    </div>
  );
}

const CardCount = ({ type, count }: { type: CardType, count: number }) => (
  <div className="flex-1 flex flex-col items-center gap-1 sm:gap-2">
    <div className={`w-full max-w-[4.5rem] aspect-[3/4] rounded-xl border-2 flex items-center justify-center shadow-inner transition-all duration-300 overflow-hidden ${count > 0 ? 'bg-slate-800 border-slate-700 opacity-100' : 'bg-slate-900/50 border-slate-800/50 opacity-20 grayscale'}`}>
      <img src={CARD_IMAGES[type]} alt={CARD_NAMES[type]} className="w-2/3 h-2/3 object-contain drop-shadow-md" />
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
        <img src={CARD_IMAGES[type]} alt={CARD_NAMES[type]} className="w-2/3 h-2/3 object-contain drop-shadow-xl" />
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
      <img src={CARD_IMAGES[type]} alt={CARD_NAMES[type]} className="w-10 h-10 sm:w-16 sm:h-16 object-contain drop-shadow-2xl" />
    </span>
  </motion.div>
);
