import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { OAuth2Client } from 'google-auth-library';

dotenv.config();

// Mongoose Schema for User Profile
const userSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  email: { type: String, sparse: true },
  googleId: String,
  displayName: String,
  coins: { type: Number, default: 100 },
  purchasedThemes: { type: [String], default: ['normal'] },
  equippedTheme: { type: String, default: 'normal' },
  isGuest: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

const oauthClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

// In-memory profile storage (fallback if no MongoDB)
const profileStore = new Map<string, any>();

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
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
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

const cleanPlayerForBroadcast = (player: Player) => {
  const { ws, choice, deck, ...safePlayer } = player;
  
  // Make a copy of the deck. If the player has already chosen a card, 
  // we add it back to the broadcasted deck so the opponent doesn't see which card count decreased.
  const maskedDeck = { ...deck };
  if (choice) {
    maskedDeck[choice] += 1;
  }
  
  return { ...safePlayer, deck: maskedDeck, hasChosen: choice !== null };
};

const cleanRoomForBroadcast = (room: Room, askingPlayerId?: string) => {
  const cleanPlayers: Record<string, any> = {};
  
  if (askingPlayerId && room.players[askingPlayerId]) {
    const { ws, ...safePlayer } = room.players[askingPlayerId];
    cleanPlayers[askingPlayerId] = safePlayer;
  }

  Object.values(room.players).forEach(p => {
    if (p.id === askingPlayerId) return;

    if (room.gameState === 'revealing' || room.gameState === 'roundResult' || room.gameState === 'gameOver') {
      const { ws, ...safePlayer } = p;
      cleanPlayers[p.id] = safePlayer;
    } else {
      cleanPlayers[p.id] = cleanPlayerForBroadcast(p);
    }
  });
  
  return { ...room, players: cleanPlayers };
};

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
  }, 1200); // Wait 1.2s for reveal animation
}

function resolveRound(roomId: string) {
  const room = rooms[roomId];
  if (!room) return;

  const players = Object.values(room.players);
  if (players.length !== 2) return;
  
  const p1 = players[0];
  const p2 = players[1];

  let winner = 0; // 0 = draw, 1 = p1, 2 = p2
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

  setTimeout(() => {
    startNextRound(roomId);
  }, 3000); // 3 seconds before next round begins (like LAN mode)
}

function startNextRound(roomId: string) {
  const room = rooms[roomId];
  if (!room) return;

  const round = room.round;
  if (round >= 9) {
    room.gameState = 'gameOver';
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

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;
  const httpServer = createServer(app);

  const mongodbUri = process.env.MONGODB_URI;
  let useMongo = false;

  if (mongodbUri) {
    try {
      await mongoose.connect(mongodbUri);
      console.log('✅ Connected to MongoDB');
      useMongo = true;
    } catch (err) {
      console.error('❌ MongoDB connection error:', err);
      console.log('⚠️ Falling back to in-memory storage');
    }
  } else {
    console.log('ℹ️ No MONGODB_URI found, using in-memory storage');
  }
  
  // This matches your App.tsx path
  const wss = new WebSocketServer({ server: httpServer, path: '/game-socket' });

  app.use(express.json());

  // CORS middleware for API endpoints
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
  });

  app.get('/api/health', (req, res) => res.json({ status: 'ok', activeRooms: Object.keys(rooms).length }));

  // Google OAuth Endpoints
  app.get('/api/auth/google/url', (req, res) => {
    const redirectUri = `${req.protocol}://${req.get('host')}/auth/callback`;
    const url = oauthClient.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email'],
      redirect_uri: redirectUri
    });
    res.json({ url });
  });

  app.get('/auth/callback', async (req, res) => {
    const code = req.query.code as string;
    const redirectUri = `${req.protocol}://${req.get('host')}/auth/callback`;

    try {
      const { tokens } = await oauthClient.getToken({ code, redirect_uri: redirectUri });
      const ticket = await oauthClient.verifyIdToken({
        idToken: tokens.id_token!,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      
      if (payload && useMongo) {
        let user = await User.findOne({ email: payload.email });
        
        if (!user) {
          user = await User.create({
            uid: `google_${payload.sub}`,
            email: payload.email,
            googleId: payload.sub,
            displayName: payload.name,
            isGuest: false,
            coins: 100,
            purchasedThemes: ['normal'],
            equippedTheme: 'normal'
          });
        }

        // Return a script that posts the user info back to the game window
        res.send(`
          <html>
            <body>
              <script>
                if (window.opener) {
                  window.opener.postMessage({ 
                    type: 'OAUTH_AUTH_SUCCESS', 
                    user: ${JSON.stringify(user)} 
                  }, '*');
                  window.close();
                } else {
                  window.location.href = '/';
                }
              </script>
            </body>
          </html>
        `);
      }
    } catch (err) {
      console.error('OAuth Error:', err);
      res.status(500).send('Authentication failed');
    }
  });

  app.post('/api/profile/merge', async (req, res) => {
    if (!useMongo) return res.status(400).json({ error: 'MongoDB required for merge' });
    
    try {
      const { guestUid, targetUid } = req.body;
      const guest = await User.findOne({ uid: guestUid });
      const target = await User.findOne({ uid: targetUid });
      
      if (!guest || !target) return res.status(404).json({ error: 'User not found' });
      
      // Merge: Take guest's coins and themes into the target account
      target.coins = (target.coins || 0) + (guest.coins || 0);
      const guestThemes = guest.purchasedThemes || [];
      const targetThemes = target.purchasedThemes || [];
      target.purchasedThemes = Array.from(new Set([...targetThemes, ...guestThemes]));
      target.updatedAt = new Date();
      
      await target.save();
      
      // Optionally delete or mark guest as merged
      await User.deleteOne({ uid: guestUid });
      
      res.json(target);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Merge failed' });
    }
  });

  app.get('/api/profile/:id', async (req, res) => {
    try {
      const userId = req.params.id;
      
      if (useMongo) {
        let user = await User.findOne({ uid: userId });
        if (!user) {
          user = await User.create({
            uid: userId,
            displayName: 'لاعب',
            coins: 100,
            purchasedThemes: ['normal'],
            equippedTheme: 'normal'
          });
        }
        return res.json(user);
      }

      let user = profileStore.get(userId);
      if (!user) {
        user = {
          uid: userId,
          displayName: 'لاعب',
          coins: 100,
          purchasedThemes: ['normal'],
          equippedTheme: 'normal',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        profileStore.set(userId, user);
      }
      res.json(user);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to load profile' });
    }
  });

  app.post('/api/profile/:id', async (req, res) => {
    try {
      const userId = req.params.id;
      
      if (useMongo) {
        const updateData = {
          ...req.body,
          updatedAt: Date.now()
        };
        const user = await User.findOneAndUpdate(
          { uid: userId },
          { $set: updateData },
          { new: true, upsert: true }
        );
        return res.json(user);
      }

      const existing = profileStore.get(userId);
      const updateData = {
        ...(existing || {
          uid: userId,
          displayName: 'لاعب',
          coins: 100,
          purchasedThemes: ['normal'],
          equippedTheme: 'normal',
          createdAt: new Date().toISOString()
        }),
        ...req.body,
        updatedAt: new Date().toISOString()
      };

      profileStore.set(userId, updateData);
      res.json(updateData);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to save profile' });
    }
  });

  wss.on('connection', (ws) => {
    const socketId = Math.random().toString(36).substring(2, 10);
    console.log(`[WS] New connection attempt. ID: ${socketId}`);

    ws.send(JSON.stringify({ type: 'PING' }));

    ws.on('message', (data) => {
      try {
        const messageString = data.toString();
        const message = JSON.parse(messageString);
        console.log(`[WS] Message from ${socketId}:`, message.type);
        
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

        // --- 3. Random Matchmaking ---
        if (message.type === 'quick_match') {
          if (matchmakingQueue.find(p => p.id === socketId)) return;

          matchmakingQueue.push({
            id: socketId,
            name: message.playerName || 'لاعب',
            themeId: message.themeId || 'normal',
            ws: ws
          });

          ws.send(JSON.stringify({ type: 'matchmaking_status', msg: 'جاري البحث عن خصم مناسب...' }));

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
            
            p1.ws.send(JSON.stringify({ type: 'match_found', roomId, roomCode: roomId }));
            p2.ws.send(JSON.stringify({ type: 'match_found', roomId, roomCode: roomId }));
            startRoundTimer(roomId);
            broadcastToRoom(roomId, { type: 'room_state', state: rooms[roomId] });
          }
        }

        if (message.type === 'cancel_matchmaking') {
          const idx = matchmakingQueue.findIndex(p => p.id === socketId);
          if (idx !== -1) matchmakingQueue.splice(idx, 1);
        }

        // --- 4. Game Actions ---
        if (message.type === 'play_card') {
          const { roomId, choice } = message;
          const room = rooms[roomId];
          
          if (room && room.gameState === 'playing' && room.players[socketId]) {
            const player = room.players[socketId];
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
            room.players[socketId].readyForNext = true;
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
      const queueIdx = matchmakingQueue.findIndex(p => p.id === id);
      if (queueIdx !== -1) matchmakingQueue.splice(queueIdx, 1);

      const roomIds = specificRoomId ? [specificRoomId] : Object.keys(rooms);
      roomIds.forEach(rid => {
        const room = rooms[rid];
        if (room && room.players[id]) {
          delete room.players[id];
          if (roomTimers[rid]) clearInterval(roomTimers[rid]);
          
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

  httpServer.listen(parseInt(PORT as string, 10), '0.0.0.0', () => {
    console.log(`=========================================`);
    console.log(`ٌ* Game Server Running!`);
    console.log(`* Port: ${PORT}`);
    console.log(`* Path: /game-socket`);
    console.log(`=========================================`);
  });
}

startServer().catch(console.error);
