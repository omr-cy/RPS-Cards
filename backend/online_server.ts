import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { createServer as createViteServer } from 'vite';

type CardType = 'rock' | 'paper' | 'scissors';

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
  ws: WebSocket;
}

interface Room {
  id: string;
  players: Record<string, Player>;
  gameState: 'waiting' | 'playing' | 'revealing' | 'roundResult' | 'gameOver';
  round: number;
  roundWinner: string | 'draw' | null;
  timeLeft?: number;
}

const rooms: Record<string, Room> = {};
const roomTimers: Record<string, NodeJS.Timeout> = {};

// Queue for Random Matchmaking
const matchmakingQueue: { id: string; name: string; themeId: string; ws: WebSocket }[] = [];

const INITIAL_DECK: Deck = { rock: 3, paper: 3, scissors: 3 };

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded I, O, 1, 0 to avoid confusion
  let result = '';
  // Generate 4 character matching code (e.g., "M7X9")
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // Ensure the code doesn't exist already
  return rooms[result] ? generateRoomCode() : result;
}

function getWinner(choice1: CardType, choice2: CardType): 1 | 2 | 0 {
  if (choice1 === choice2) return 0;
  if (
    (choice1 === 'rock' && choice2 === 'scissors') ||
    (choice1 === 'paper' && choice2 === 'rock') ||
    (choice1 === 'scissors' && choice2 === 'paper')
  ) {
    return 1;
  }
  return 2;
}

function broadcastToRoom(roomId: string, data: any) {
  const room = rooms[roomId];
  if (!room) return;
  const message = JSON.stringify(data);
  Object.values(room.players).forEach(player => {
    if (player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(message);
    }
  });
}

function startNextRound(roomId: string) {
  const room = rooms[roomId];
  if (!room) return;

  const playerIds = Object.keys(room.players);
  const p1 = room.players[playerIds[0]];
  const p2 = room.players[playerIds[1]];
  
  let points = 1;
  if (room.round >= 7) points = 3;
  else if (room.round >= 4) points = 2;

  if (room.roundWinner === p1.id) {
    p1.score += points;
  } else if (room.roundWinner === p2.id) {
    p2.score += points;
  }

  if (room.round >= 9) {
    room.gameState = 'gameOver';
  } else {
    room.round += 1;
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

function handleReveal(roomId: string) {
  const room = rooms[roomId];
  if (!room) return;

  if (roomTimers[roomId]) {
    clearInterval(roomTimers[roomId]);
    delete roomTimers[roomId];
  }

  room.gameState = 'revealing';
  broadcastToRoom(roomId, { type: 'room_state', state: room });

  setTimeout(() => {
    const playerIds = Object.keys(room.players);
    const p1 = room.players[playerIds[0]];
    const p2 = room.players[playerIds[1]];
    
    // Only process if both players actually exist
    if (!p1 || !p2) return;

    // Safety fallback: if no choice was made
    const p1Choice = p1.choice || 'rock'; 
    const p2Choice = p2.choice || 'rock';

    const winnerCode = getWinner(p1Choice, p2Choice);
    
    if (winnerCode === 1) {
      room.roundWinner = p1.id;
    } else if (winnerCode === 2) {
      room.roundWinner = p2.id;
    } else {
      room.roundWinner = 'draw';
    }
    room.gameState = 'roundResult';
    broadcastToRoom(roomId, { type: 'room_state', state: room });

    setTimeout(() => startNextRound(roomId), 3000);
  }, 1200);
}

function startRoundTimer(roomId: string) {
  const room = rooms[roomId];
  if (!room) return;

  if (roomTimers[roomId]) {
    clearInterval(roomTimers[roomId]);
  }

  // Auto-play if only 1 card left
  Object.values(room.players).forEach(p => {
      const total = p.deck.rock + p.deck.paper + p.deck.scissors;
      if (total === 1 && !p.choice) {
        if (p.deck.rock === 1) { p.choice = 'rock'; p.deck.rock = 0; }
        else if (p.deck.paper === 1) { p.choice = 'paper'; p.deck.paper = 0; }
        else if (p.deck.scissors === 1) { p.choice = 'scissors'; p.deck.scissors = 0; }
      }
  });

  const playerIds = Object.keys(room.players);
  const p1 = room.players[playerIds[0]];
  const p2 = room.players[playerIds[1]];
  
  if (p1 && p2 && p1.choice && p2.choice) {
      handleReveal(roomId);
      return;
  }

  room.timeLeft = 15; // 15 seconds per round in online mode
  
  roomTimers[roomId] = setInterval(() => {
    const currentRoom = rooms[roomId];
    if (!currentRoom || currentRoom.gameState !== 'playing') {
      clearInterval(roomTimers[roomId]);
      return;
    }

    currentRoom.timeLeft! -= 1;
    broadcastToRoom(roomId, { type: 'room_state', state: currentRoom });

    if (currentRoom.timeLeft! <= 0) {
      clearInterval(roomTimers[roomId]);
      
      Object.values(currentRoom.players).forEach(player => {
        if (!player.choice) {
          const availableCards: CardType[] = [];
          if (player.deck.rock > 0) availableCards.push('rock');
          if (player.deck.paper > 0) availableCards.push('paper');
          if (player.deck.scissors > 0) availableCards.push('scissors');
          
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

async function startServer() {
  const app = express();
  const PORT = 3000;
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (ws) => {
    const socketId = Math.random().toString(36).substring(2, 10);
    console.log('Online User connected:', socketId);

    ws.send(JSON.stringify({ type: 'PING' }));

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'PONG') return;

        // --- 1. Create Room via Code ---
        if (message.type === 'create_room') {
          const roomId = generateRoomCode();
          rooms[roomId] = {
            id: roomId,
            players: {
              [socketId]: { id: socketId, name: message.playerName || 'لاعب', themeId: message.themeId || 'normal', deck: { ...INITIAL_DECK }, score: 0, choice: null, readyForNext: false, ws }
            },
            gameState: 'waiting',
            round: 1,
            roundWinner: null
          };
          ws.send(JSON.stringify({ type: 'room_created', roomId, roomCode: roomId, isHost: true }));
          broadcastToRoom(roomId, { type: 'room_state', state: rooms[roomId] });
        }

        // --- 2. Join via Code ---
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

          room.players[socketId] = { id: socketId, name: message.playerName || 'لاعب', themeId: message.themeId || 'normal', deck: { ...INITIAL_DECK }, score: 0, choice: null, readyForNext: false, ws };
          room.gameState = 'playing';
          ws.send(JSON.stringify({ type: 'joined_room_success', roomId: code }));
          startRoundTimer(code);
          broadcastToRoom(code, { type: 'room_state', state: room });
        }

        // --- 3. Random Matchmaking Queue ---
        if (message.type === 'quick_match') {
          // Prevent duplicate queue entries
          if (matchmakingQueue.find(p => p.id === socketId)) return;

          matchmakingQueue.push({
            id: socketId,
            name: message.playerName || 'لاعب',
            themeId: message.themeId || 'normal',
            ws: ws
          });

          ws.send(JSON.stringify({ type: 'matchmaking_status', msg: 'جاري البحث عن خصم مناسب...' }));

          // Pair logic (if 2 or more players are waiting)
          if (matchmakingQueue.length >= 2) {
            const p1 = matchmakingQueue.shift()!;
            const p2 = matchmakingQueue.shift()!;
            
            const roomId = generateRoomCode();
            rooms[roomId] = {
               id: roomId,
               players: {
                 [p1.id]: { id: p1.id, name: p1.name, themeId: p1.themeId, deck: { ...INITIAL_DECK }, score: 0, choice: null, readyForNext: false, ws: p1.ws },
                 [p2.id]: { id: p2.id, name: p2.name, themeId: p2.themeId, deck: { ...INITIAL_DECK }, score: 0, choice: null, readyForNext: false, ws: p2.ws }
               },
               gameState: 'playing',
               round: 1,
               roundWinner: null
            };

            p1.ws.send(JSON.stringify({ type: 'match_found', roomId }));
            p2.ws.send(JSON.stringify({ type: 'match_found', roomId }));

            startRoundTimer(roomId);
            broadcastToRoom(roomId, { type: 'room_state', state: rooms[roomId] });
          }
        }

        // Cancel matchmaking
        if (message.type === 'cancel_matchmaking') {
          const idx = matchmakingQueue.findIndex(p => p.id === socketId);
          if (idx !== -1) matchmakingQueue.splice(idx, 1);
        }

        // Gameplay actions
        if (message.type === 'play_card') {
          const { roomId, choice } = message;
          const room = rooms[roomId];
          if (!room || room.gameState !== 'playing') return;
          
          const player = room.players[socketId];
          if (!player || player.choice || player.deck[choice as CardType] <= 0) return;

          player.choice = choice as CardType;
          player.deck[choice as CardType] -= 1;

          const playerIds = Object.keys(room.players);
          const p1 = room.players[playerIds[0]];
          const p2 = room.players[playerIds[1]];

          if (p1 && p2 && p1.choice && p2.choice) {
            handleReveal(roomId);
          } else {
            broadcastToRoom(roomId, { type: 'room_state', state: room });
          }
        }

        if (message.type === 'play_again') {
          const { roomId } = message;
          const room = rooms[roomId];
          if (!room || room.gameState !== 'gameOver') return;

          const player = room.players[socketId];
          if (player) player.readyForNext = true;

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

        if (message.type === 'leave_room') {
          const { roomId } = message;
          handleDisconnect(socketId, roomId);
        }

      } catch (e) {
        console.error('Error processing message:', e);
      }
    });

    ws.on('close', () => {
      console.log('Online User disconnected:', socketId);
      handleDisconnect(socketId);
    });

    function handleDisconnect(id: string, specificRoomId?: string) {
      // Remove from matchmaking queue if they disconnect while searching
      const queueIdx = matchmakingQueue.findIndex(p => p.id === id);
      if (queueIdx !== -1) matchmakingQueue.splice(queueIdx, 1);

      // Handle leaving active rooms
      const roomIds = specificRoomId ? [specificRoomId] : Object.keys(rooms);
      roomIds.forEach(rid => {
        const room = rooms[rid];
        if (room && room.players[id]) {
          delete room.players[id];
          if (roomTimers[rid]) {
            clearInterval(roomTimers[rid]);
            delete roomTimers[rid];
          }
          if (Object.keys(room.players).length === 0) {
            delete rooms[rid];
          } else {
            room.gameState = 'waiting';
            broadcastToRoom(rid, { type: 'error_msg', msg: 'الخصم غادر الغرفة' });
            broadcastToRoom(rid, { type: 'room_state', state: room });
          }
        }
      });
    }
  });

  app.get('/api/health', (req, res) => res.json({ status: 'ok', activeRooms: Object.keys(rooms).length }));

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Online Server running on port ${PORT}`);
  });
}

startServer();
