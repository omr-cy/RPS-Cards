import { WebSocketServer, WebSocket } from 'ws';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { PublicMessage } from '../models/PublicMessage';
import { calculateLevel } from '../utils/helpers';
import { generateRoomCode, getWinner, cleanRoomForBroadcast } from '../utils/gameUtils';
import { Room, Player, MatchmakingPlayer, Deck, CardType } from '../types';

const INITIAL_DECK: Deck = { rock: 3, paper: 3, scissors: 3 };
const rooms: Record<string, Room> = {};
const roomTimers: Record<string, NodeJS.Timeout> = {};
const matchmakingQueue: MatchmakingPlayer[] = [];

const LEVEL_SENSITIVITY = 2; 
const LEVEL_SENSITIVITY_EXPANSION = 2; 
const SEARCH_EXPANSION_INTERVAL = 3000; 

function broadcastToRoom(roomId: string, message: any) {
  const room = rooms[roomId];
  if (!room) return;
  Object.values(room.players).forEach(p => {
    const tailoredState = message.type === 'room_state' ? cleanRoomForBroadcast(message.state, p.id) : message.state;
    const tailoredMessage = message.type === 'room_state' ? { ...message, state: tailoredState } : message;
    if (p.ws.readyState === WebSocket.OPEN) {
      p.ws.send(JSON.stringify(tailoredMessage));
    }
  });
}

function startRoundTimer(roomId: string) {
  const room = rooms[roomId];
  if (!room) return;

  if (roomTimers[roomId]) {
    clearInterval(roomTimers[roomId]);
  }

  room.timeLeft = 15;
  broadcastToRoom(roomId, { type: 'room_state', state: room });

  roomTimers[roomId] = setInterval(() => {
    if (!rooms[roomId]) {
      clearInterval(roomTimers[roomId]);
      return;
    }
    const r = rooms[roomId];
    if (r.gameState !== 'playing') {
      clearInterval(roomTimers[roomId]);
      return;
    }

    if (r.timeLeft && r.timeLeft > 0) {
      r.timeLeft -= 1;
      broadcastToRoom(roomId, { type: 'room_state', state: r });
    } else {
      clearInterval(roomTimers[roomId]);
      Object.values(r.players).forEach(player => {
        if (!player.choice) {
          const availableCards = (Object.keys(player.deck) as CardType[]).filter(t => player.deck[t] > 0);
          if (availableCards.length > 0) {
            const randomChoice = availableCards[Math.floor(Math.random() * availableCards.length)];
            player.choice = randomChoice;
            player.deck[randomChoice] -= 1;
          }
        }
      });
      handleReveal(roomId);
    }
  }, 1000);
}

function handleReveal(roomId: string) {
  const room = rooms[roomId];
  if (!room) return;

  if (roomTimers[roomId]) clearInterval(roomTimers[roomId]);
  room.gameState = 'revealing';
  broadcastToRoom(roomId, { type: 'room_state', state: room });

  setTimeout(() => {
    resolveRound(roomId);
  }, 1200); 
}

async function resolveRound(roomId: string) {
  const room = rooms[roomId];
  if (!room) return;

  const players = Object.values(room.players);
  if (players.length !== 2) return;
  
  const p1 = players[0];
  const p2 = players[1];

  let winner = 0; 
  if (p1.choice && p2.choice) {
     winner = getWinner(p1.choice, p2.choice);
  }

  const round = room.round;
  let points = 1;
  if (round >= 6 && round <= 8) points = 2;
  else if (round === 9) points = 3;

  if (winner === 1) {
    p1.score += points;
    room.roundWinner = p1.id;
  } else if (winner === 2) {
    p2.score += points;
    room.roundWinner = p2.id;
  } else {
    room.roundWinner = 'draw';
  }

  room.gameState = 'roundResult';
  broadcastToRoom(roomId, { type: 'room_state', state: room });

  setTimeout(async () => {
    await startNextRound(roomId);
  }, 3000); 
}

async function awardRewards(room: Room, winnerId: string | null) {
  const playersArr = Object.values(room.players);
  for (const p of playersArr) {
    if (mongoose.Types.ObjectId.isValid(p.id)) {
      try {
        const user = await User.findById(p.id);
        if (user) {
          const oldLevel = user.level || 1;
          
          const isWinner = p.id === winnerId;
          const xpGain = isWinner ? 50 : 20;
          const coinGain = isWinner ? 15 : 5;
          const compGain = isWinner ? 15 : 5;

          if (room.isPublic) {
            user.xp = (user.xp || 0) + xpGain;
            user.level = calculateLevel(user.xp);
          }
          
          user.coins = (user.coins || 0) + coinGain;
          user.competitionPoints = (user.competitionPoints || 0) + compGain;
          await user.save();
          
          if (user.level > oldLevel) {
            p.ws.send(JSON.stringify({ 
              type: 'level_up', 
              newLevel: user.level 
            }));
          }
        }
      } catch (err) {
        console.error(`[Rewards Error] Player ID: ${p.id}`, err);
      }
    }
  }
}

async function startNextRound(roomId: string) {
  const room = rooms[roomId];
  if (!room) return;

  const round = room.round;
  if (round >= 9) {
    room.gameState = 'gameOver';

    const playersArr = Object.values(room.players);
    if (playersArr.length === 2) {
      const p1 = playersArr[0];
      const p2 = playersArr[1];
      
      let winnerId: string | null = null;
      if (p1.score > p2.score) winnerId = p1.id;
      else if (p2.score > p1.score) winnerId = p2.id;
      
      for (const p of playersArr) {
        if (mongoose.Types.ObjectId.isValid(p.id)) {
          try {
            const user = await User.findById(p.id);
            if (user) {
              const oldLevel = user.level || 1;
              
              const xpGain = (p.id === winnerId) ? 50 : 20;
              const coinGain = (p.id === winnerId) ? 15 : 5; 
              const compGain = (p.id === winnerId) ? 15 : 5;

              if (room.isPublic) {
                user.xp = (user.xp || 0) + xpGain;
                user.level = calculateLevel(user.xp);
                console.log(`[Game Over - Public] Player ${user.displayName} gained ${xpGain} XP.`);
              } else {
                console.log(`[Game Over - Private] Player ${user.displayName} gained no XP (Friend Room).`);
              }
              
              user.coins = (user.coins || 0) + coinGain;
              user.competitionPoints = (user.competitionPoints || 0) + compGain;
              
              await user.save();
              
              const currentXp = user.xp || 0;
              console.log(`[Game Over] Player ${user.displayName}. Total XP: ${currentXp}. Level: ${user.level}`);
              
              if (user.level > oldLevel) {
                p.ws.send(JSON.stringify({ 
                  type: 'level_up', 
                  newLevel: user.level 
                }));
              }
            }
          } catch (err) {
            console.error(`[XP Reward Error] Player ID: ${p.id}`, err);
          }
        }
      }
    }
  } else {
    room.round = round + 1;
    room.gameState = 'playing';
    room.roundWinner = null;
    
    Object.values(room.players).forEach(p => {
      p.choice = null;
      p.readyForNext = false;
    });
    
    startRoundTimer(roomId);
  }
  broadcastToRoom(roomId, { type: 'room_state', state: room });
}

export function setupWebSocket(wss: WebSocketServer) {
  wss.on('connection', (ws) => {
    let connectionId = Math.random().toString(36).substring(2, 10);
    let currentPlayerId = connectionId;
    console.log(`[WS] New connection attempt. Temp ID: ${connectionId}`);

    ws.send(JSON.stringify({ type: 'PING' }));

    ws.on('message', async (data) => {
      try {
        const messageString = data.toString();
        const message = JSON.parse(messageString);
        
        if (message.playerId) {
          currentPlayerId = message.playerId;
        }
        let effectivePlayerId = currentPlayerId;

        console.log(`[WS] Message from connection ${connectionId} (player: ${effectivePlayerId}):`, message.type);
        
        if (message.type === 'PONG') {
          ws.send(JSON.stringify({ type: 'HANDSHAKE_OK' }));
          return;
        }

        if (message.type === 'create_room') {
          const roomId = generateRoomCode(Object.keys(rooms));
          rooms[roomId] = {
            id: roomId,
            players: {
              [effectivePlayerId]: { id: effectivePlayerId, name: message.playerName || 'لاعب', themeId: message.themeId || 'normal', deck: { ...INITIAL_DECK }, score: 0, choice: null, readyForNext: false, ws }
            },
            gameState: 'waiting',
            round: 1,
            roundWinner: null,
            isPublic: false
          };
          ws.send(JSON.stringify({ type: 'room_created', roomId, roomCode: roomId, isHost: true }));
          broadcastToRoom(roomId, { type: 'room_state', state: rooms[roomId] });
        }

        if (message.type === 'join_room_by_code') {
          const code = (message.roomCode || '').toUpperCase().trim();
          const room = rooms[code];
          
          if (!room) {
            ws.send(JSON.stringify({ type: 'error_msg', msg: 'كود الغرفة غير صحيح أو الغرفة غير موجودة' }));
            return;
          }
          if (Object.keys(room.players).length >= 2) {
            ws.send(JSON.stringify({ type: 'error_msg', msg: 'الغرفة ممتلئة باللاعبين' }));
            return;
          }

          room.players[effectivePlayerId] = { id: effectivePlayerId, name: message.playerName || 'لاعب', themeId: message.themeId || 'normal', deck: { ...INITIAL_DECK }, score: 0, choice: null, readyForNext: false, ws };
          room.gameState = 'playing';
          ws.send(JSON.stringify({ type: 'joined_room_success', roomId: code }));
          startRoundTimer(code);
          broadcastToRoom(code, { type: 'room_state', state: room });
        }

        if (message.type === 'quick_match') {
          if (matchmakingQueue.find(p => p.id === effectivePlayerId)) return;

          const playerLevel = message.playerLevel || 1;
          
          matchmakingQueue.push({
            id: effectivePlayerId,
            name: message.playerName || 'لاعب',
            themeId: message.themeId || 'normal',
            level: playerLevel,
            ws: ws,
            timeJoined: Date.now()
          });

          ws.send(JSON.stringify({ type: 'matchmaking_status', msg: 'جاري البحث عن خصم بمستوى مهارة متقارب...' }));
        }

        if (message.type === 'cancel_matchmaking') {
          const idx = matchmakingQueue.findIndex(p => p.id === effectivePlayerId);
          if (idx !== -1) matchmakingQueue.splice(idx, 1);
        }

        if (message.type === 'play_card') {
          const { roomId, choice } = message;
          const room = rooms[roomId];
          
          if (room && room.gameState === 'playing' && room.players[effectivePlayerId]) {
            const player = room.players[effectivePlayerId];
            if (!player.choice && player.deck[choice as CardType] > 0) {
              player.choice = choice as CardType;
              player.deck[choice as CardType] -= 1;
              
              broadcastToRoom(roomId, { type: 'room_state', state: room });

              const allChosen = Object.values(room.players).every(p => p.choice !== null);
              if (allChosen) {
                handleReveal(roomId);
              }
            }
          }
        }

        if (message.type === 'play_again') {
          const { roomId } = message;
          const room = rooms[roomId];
          if (room && room.gameState === 'gameOver') {
            room.players[effectivePlayerId].readyForNext = true;
            broadcastToRoom(roomId, { type: 'room_state', state: room });
            
            const allReady = Object.values(room.players).every(p => p.readyForNext);
            if (allReady) {
              room.round = 1;
              room.gameState = 'playing';
              room.roundWinner = null;
              Object.values(room.players).forEach(p => {
                p.deck = { ...INITIAL_DECK };
                p.score = 0;
                p.choice = null;
                p.readyForNext = false;
              });
              startRoundTimer(roomId);
            }
            broadcastToRoom(roomId, { type: 'room_state', state: room });
          }
        }

        if (message.type === 'leave_room') {
          const { roomId } = message;
          handleDisconnect(effectivePlayerId, roomId);
        }

        if (message.type === 'send_chat_message') {
          try {
            const msgData = {
              senderId: effectivePlayerId,
              senderName: message.senderName || 'لاعب',
              text: (message.text || '').substring(0, 500)
            };
            
            const savedMsg = await PublicMessage.create(msgData);
            
            const newMsg = {
              id: savedMsg._id,
              senderId: savedMsg.senderId,
              senderName: savedMsg.senderName,
              text: savedMsg.text,
              timestamp: savedMsg.createdAt.getTime()
            };

            const chatEvt = JSON.stringify({ type: 'chat_message', message: newMsg });
            wss.clients.forEach(client => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(chatEvt);
              }
            });
          } catch (err) {
            console.error('[Chat Send Error]', err);
          }
        }

        if (message.type === 'get_chat_history') {
           try {
             const messages = await PublicMessage.find()
               .sort({ createdAt: -1 })
               .limit(10)
               .lean();
             
             const formattedMsgs = messages.map(msg => ({
               id: msg._id,
               senderId: msg.senderId,
               senderName: msg.senderName,
               text: msg.text,
               timestamp: msg.createdAt.getTime()
             })).reverse();

             ws.send(JSON.stringify({ type: 'chat_history', messages: formattedMsgs }));
           } catch (err) {
             console.error('[Chat History WS Error]', err);
           }
        }

      } catch (e) {
        console.error('Error processing message:', e);
      }
    });

    ws.on('close', () => {
      console.log('Online User disconnected:', currentPlayerId);
      handleDisconnect(currentPlayerId);
    });

    async function handleDisconnect(id: string, specificRoomId?: string) {
      const queueIdx = matchmakingQueue.findIndex(p => p.id === id);
      if (queueIdx !== -1) matchmakingQueue.splice(queueIdx, 1);

      const roomIds = specificRoomId ? [specificRoomId] : Object.keys(rooms);
      for (const rid of roomIds) {
        const room = rooms[rid];
        if (room && room.players[id]) {
          delete room.players[id];
          if (roomTimers[rid]) clearInterval(roomTimers[rid]);
          
          if (Object.keys(room.players).length === 0) {
            delete rooms[rid];
          } else {
            if (['playing', 'revealing', 'roundResult'].includes(room.gameState)) {
              room.gameState = 'opponentLeft' as any;
              const remainingPlayerId = Object.keys(room.players)[0];
              if (remainingPlayerId) {
                await awardRewards(room, remainingPlayerId);
              }
            } else if (room.gameState !== 'gameOver') {
              room.gameState = 'waiting';
            }
            
            broadcastToRoom(rid, { type: 'error_msg', msg: 'الخصم غادر الغرفة' });
            broadcastToRoom(rid, { type: 'room_state', state: room });
          }
        }
      }
    }
  });

  setInterval(() => {
    if (matchmakingQueue.length === 0) return;

    const handledIds = new Set<string>();
    const now = Date.now();

    for (let i = 0; i < matchmakingQueue.length; i++) {
      const p1 = matchmakingQueue[i];
      if (handledIds.has(p1.id)) continue;

      const timeInQueue = now - p1.timeJoined;
      const allowedDiff = LEVEL_SENSITIVITY + (Math.floor(timeInQueue / SEARCH_EXPANSION_INTERVAL) * LEVEL_SENSITIVITY_EXPANSION);

      let bestMatchIdx = -1;
      let minDiff = Infinity;

      for (let j = i + 1; j < matchmakingQueue.length; j++) {
        const p2 = matchmakingQueue[j];
        if (handledIds.has(p2.id)) continue;

        const diff = Math.abs(p1.level - p2.level);
        if (diff <= allowedDiff && diff < minDiff) {
          minDiff = diff;
          bestMatchIdx = j;
        }
      }

      if (bestMatchIdx !== -1) {
        const p2 = matchmakingQueue[bestMatchIdx];
        handledIds.add(p1.id);
        handledIds.add(p2.id);

        const roomId = generateRoomCode(Object.keys(rooms));
        rooms[roomId] = {
          id: roomId,
          players: {
            [p1.id]: { id: p1.id, name: p1.name, themeId: p1.themeId, deck: { ...INITIAL_DECK }, score: 0, choice: null, readyForNext: false, ws: p1.ws },
            [p2.id]: { id: p2.id, name: p2.name, themeId: p2.themeId, deck: { ...INITIAL_DECK }, score: 0, choice: null, readyForNext: false, ws: p2.ws }
          },
          gameState: 'playing',
          round: 1,
          roundWinner: null,
          isPublic: true
        };

        try {
          if (p1.ws.readyState === 1) { 
            p1.ws.send(JSON.stringify({ type: 'match_found', roomId, roomCode: roomId }));
          }
          if (p2.ws.readyState === 1) {
            p2.ws.send(JSON.stringify({ type: 'match_found', roomId, roomCode: roomId }));
          }
        } catch (e) {
          console.error("Failed to send match_found:", e);
        }
        startRoundTimer(roomId);
        broadcastToRoom(roomId, { type: 'room_state', state: rooms[roomId] });
      }
    }

    for (let i = matchmakingQueue.length - 1; i >= 0; i--) {
      if (handledIds.has(matchmakingQueue[i].id)) {
        matchmakingQueue.splice(i, 1);
      }
    }
  }, 2000);
  
  return { rooms, activeRooms: () => Object.keys(rooms).length };
}
