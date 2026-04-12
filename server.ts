import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';

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

const rooms: Record<string, Room> = {};
const roomTimers: Record<string, NodeJS.Timeout> = {};

const LAN_PORT = 58291;

const INITIAL_DECK: Deck = { rock: 3, paper: 3, scissors: 3 };

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

function startNextRound(roomId: string, io: Server) {
  const room = rooms[roomId];
  if (!room) return;

  if (room.round >= 9) {
    room.gameState = 'gameOver';
  } else {
    room.round += 1;
    room.gameState = 'playing';
    room.roundWinner = null;
    Object.values(room.players).forEach(p => {
      p.choice = null;
      p.readyForNext = p.id === 'bot';
    });
    startRoundTimer(roomId, io);
  }
  io.to(roomId).emit('room_state', room);
}

function handleReveal(roomId: string, io: Server) {
  const room = rooms[roomId];
  if (!room) return;

  if (roomTimers[roomId]) {
    clearInterval(roomTimers[roomId]);
    delete roomTimers[roomId];
  }

  room.gameState = 'revealing';
  io.to(roomId).emit('room_state', room);

  setTimeout(() => {
    const playerIds = Object.keys(room.players);
    const p1 = room.players[playerIds[0]];
    const p2 = room.players[playerIds[1]];
    
    const winnerCode = getWinner(p1.choice!, p2.choice!);
    
    let points = 1;
    if (room.round >= 6 && room.round <= 8) points = 2;
    else if (room.round === 9) points = 3;

    if (winnerCode === 1) {
      p1.score += points;
      room.roundWinner = p1.id;
    } else if (winnerCode === 2) {
      p2.score += points;
      room.roundWinner = p2.id;
    } else {
      room.roundWinner = 'draw';
    }
    room.gameState = 'roundResult';
    io.to(roomId).emit('room_state', room);

    setTimeout(() => startNextRound(roomId, io), 3000);
  }, 1200);
}

function startRoundTimer(roomId: string, io: Server) {
  const room = rooms[roomId];
  if (!room) return;

  if (roomTimers[roomId]) {
    clearInterval(roomTimers[roomId]);
  }

  room.timeLeft = 15;
  
  roomTimers[roomId] = setInterval(() => {
    const currentRoom = rooms[roomId];
    if (!currentRoom || currentRoom.gameState !== 'playing') {
      clearInterval(roomTimers[roomId]);
      return;
    }

    currentRoom.timeLeft! -= 1;
    io.to(roomId).emit('room_state', currentRoom);

    if (currentRoom.timeLeft! <= 0) {
      clearInterval(roomTimers[roomId]);
      
      // Auto-pick for players who haven't chosen
      Object.values(currentRoom.players).forEach(player => {
        if (!player.choice && player.id !== 'bot') {
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

      // Also ensure bot has chosen (just in case)
      if (currentRoom.isBotRoom) {
        const bot = currentRoom.players['bot'];
        if (!bot.choice) {
          const availableCards: CardType[] = [];
          if (bot.deck.rock > 0) availableCards.push('rock');
          if (bot.deck.paper > 0) availableCards.push('paper');
          if (bot.deck.scissors > 0) availableCards.push('scissors');
          if (availableCards.length > 0) {
            const botChoice = availableCards[Math.floor(Math.random() * availableCards.length)];
            bot.choice = botChoice;
            bot.deck[botChoice] -= 1;
          }
        }
      }

      handleReveal(roomId, io);
    }
  }, 1000);
}

async function startServer() {
  const app = express();
  const PORT = 3000; // Infrastructure requires port 3000
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: '*' }
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id, 'Transport:', socket.conn.transport.name);
    
    socket.conn.on('upgrade', (transport) => {
      console.log('Transport upgraded to:', transport.name);
    });

    socket.conn.on('packet', (packet) => {
      console.log('Packet received:', packet.type);
    });

    socket.on('create_room', (playerName: string) => {
      const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      rooms[roomId] = {
        id: roomId,
        players: {
          [socket.id]: { id: socket.id, name: playerName || 'لاعب', deck: { ...INITIAL_DECK }, score: 0, choice: null, readyForNext: false }
        },
        gameState: 'waiting',
        round: 1,
        roundWinner: null
      };
      socket.join(roomId);
      socket.emit('room_created', roomId);
      io.to(roomId).emit('room_state', rooms[roomId]);
    });

    socket.on('host_game', (playerName: string) => {
      const roomId = 'LOCAL_HOST';
      rooms[roomId] = {
        id: roomId,
        players: {
          [socket.id]: { id: socket.id, name: playerName || 'لاعب', deck: { ...INITIAL_DECK }, score: 0, choice: null, readyForNext: false }
        },
        gameState: 'waiting',
        round: 1,
        roundWinner: null
      };
      socket.join(roomId);
      socket.emit('room_created', roomId);
      io.to(roomId).emit('room_state', rooms[roomId]);
    });

    socket.on('create_bot_room', (playerName: string) => {
      const roomId = 'BOT_' + Math.random().toString(36).substring(2, 8).toUpperCase();
      rooms[roomId] = {
        id: roomId,
        isBotRoom: true,
        players: {
          [socket.id]: { id: socket.id, name: playerName || 'لاعب', deck: { ...INITIAL_DECK }, score: 0, choice: null, readyForNext: false },
          'bot': { id: 'bot', name: 'الكمبيوتر', deck: { ...INITIAL_DECK }, score: 0, choice: null, readyForNext: true }
        },
        gameState: 'playing',
        round: 1,
        roundWinner: null
      };
      socket.join(roomId);
      socket.emit('room_created', roomId);
      startRoundTimer(roomId, io);
      io.to(roomId).emit('room_state', rooms[roomId]);
    });

    socket.on('join_room', ({ roomId, playerName }: { roomId: string, playerName: string }) => {
      const room = rooms[roomId];
      if (!room) {
        socket.emit('error_msg', 'الغرفة غير موجودة');
        return;
      }
      if (Object.keys(room.players).length >= 2) {
        socket.emit('error_msg', 'الغرفة ممتلئة');
        return;
      }

      room.players[socket.id] = { id: socket.id, name: playerName || 'لاعب', deck: { ...INITIAL_DECK }, score: 0, choice: null, readyForNext: false };
      room.gameState = 'playing';
      socket.join(roomId);
      startRoundTimer(roomId, io);
      io.to(roomId).emit('room_state', room);
    });

    socket.on('join_hosted_game', (playerName: string) => {
      const roomId = 'LOCAL_HOST';
      const room = rooms[roomId];
      if (!room) {
        socket.emit('error_msg', 'لا يوجد لعبة مستضافة على هذا الـ IP حالياً');
        return;
      }
      if (Object.keys(room.players).length >= 2) {
        socket.emit('error_msg', 'اللعبة ممتلئة');
        return;
      }

      room.players[socket.id] = { id: socket.id, name: playerName || 'لاعب', deck: { ...INITIAL_DECK }, score: 0, choice: null, readyForNext: false };
      room.gameState = 'playing';
      socket.join(roomId);
      startRoundTimer(roomId, io);
      io.to(roomId).emit('room_state', room);
    });

    socket.on('play_card', ({ roomId, choice }: { roomId: string, choice: CardType }) => {
      const room = rooms[roomId];
      if (!room || room.gameState !== 'playing') return;
      
      const player = room.players[socket.id];
      if (!player || player.choice || player.deck[choice] <= 0) return;

      player.choice = choice;
      player.deck[choice] -= 1;

      if (room.isBotRoom) {
        const bot = room.players['bot'];
        const availableCards: CardType[] = [];
        if (bot.deck.rock > 0) availableCards.push('rock');
        if (bot.deck.paper > 0) availableCards.push('paper');
        if (bot.deck.scissors > 0) availableCards.push('scissors');
        
        if (availableCards.length > 0) {
          const botChoice = availableCards[Math.floor(Math.random() * availableCards.length)];
          bot.choice = botChoice;
          bot.deck[botChoice] -= 1;
        }
      }

      const playerIds = Object.keys(room.players);
      const p1 = room.players[playerIds[0]];
      const p2 = room.players[playerIds[1]];

      if (p1.choice && p2.choice) {
        handleReveal(roomId, io);
      } else {
        io.to(roomId).emit('room_state', room);
      }
    });

    socket.on('play_again', (roomId: string) => {
      const room = rooms[roomId];
      if (!room || room.gameState !== 'gameOver') return;

      const player = room.players[socket.id];
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
          p.readyForNext = p.id === 'bot';
        });
        startRoundTimer(roomId, io);
        io.to(roomId).emit('room_state', room);
      } else {
        io.to(roomId).emit('room_state', room);
      }
    });

    socket.on('leave_room', (roomId: string) => {
      const room = rooms[roomId];
      if (room && room.players[socket.id]) {
        delete room.players[socket.id];
        socket.leave(roomId);
        if (roomTimers[roomId]) {
          clearInterval(roomTimers[roomId]);
          delete roomTimers[roomId];
        }
        if (Object.keys(room.players).length === 0) {
          delete rooms[roomId];
        } else {
          room.gameState = 'waiting';
          io.to(roomId).emit('error_msg', 'الخصم غادر الغرفة');
          io.to(roomId).emit('room_state', room);
        }
      }
    });

    socket.on('disconnect', () => {
      for (const roomId in rooms) {
        const room = rooms[roomId];
        if (room.players[socket.id]) {
          delete room.players[socket.id];
          if (roomTimers[roomId]) {
            clearInterval(roomTimers[roomId]);
            delete roomTimers[roomId];
          }
          if (Object.keys(room.players).length === 0) {
            delete rooms[roomId];
          } else {
            room.gameState = 'waiting';
            io.to(roomId).emit('error_msg', 'الخصم غادر الغرفة');
            io.to(roomId).emit('room_state', room);
          }
        }
      }
    });
  });

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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
