import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the backend directory specifically
dotenv.config({ path: path.join(__dirname, '.env') });

import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

// MongoDB Setup
const MONGODB_URI = process.env.MONGODB_URI_LOCAL || 'mongodb://localhost:27017/rpscards_db';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  displayName: { type: String, required: true },
  coins: { type: Number, default: 100 },
  purchasedThemes: { type: [String], default: ['normal'] },
  equippedTheme: { type: String, default: 'normal' },
  isVerified: { type: Boolean, default: false },
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  createdAt: { type: Date, default: Date.now },
  lastLogin: Date
});

const User = mongoose.model('User', userSchema);

// Email Setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GAME_EMAIL_USER,
    pass: process.env.GAME_EMAIL_PASS
  }
});

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
  }, 1200); 
}

function resolveRound(roomId: string) {
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

  setTimeout(() => {
    startNextRound(roomId);
  }, 3000); 
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

  const wss = new WebSocketServer({ server: httpServer, path: '/game-socket' });

  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (req, res) => res.json({ status: 'ok', activeRooms: Object.keys(rooms).length }));

  // Auth Routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, displayName } = req.body;
      
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'البريد الإلكتروني مسجل بالفعل' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const verificationToken = crypto.randomBytes(20).toString('hex');

      const user = new User({
        email,
        password: hashedPassword,
        displayName,
        verificationToken
      });

      await user.save();

      // Send Verification Email
      const verificationUrl = `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/verify?token=${verificationToken}`;
      
      const mailOptions = {
        from: process.env.GAME_EMAIL_USER,
        to: email,
        subject: 'تأكيد حساب Card Clash',
        html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; text-align: center; background-color: #1a1a1a; color: #f5f5dc; padding: 40px; border-radius: 10px;">
            <h1 style="color: #008080;">أهلاً بك في Card Clash!</h1>
            <p style="font-size: 18px;">شكراً لتسجيلك في اللعبة. يرجى الضغط على الزر أدناه لتأكيد بريدك الإلكتروني:</p>
            <a href="${verificationUrl}" style="display: inline-block; background-color: #008080; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 20px;">تأكيد الحساب</a>
            <p style="margin-top: 30px; font-size: 14px; opacity: 0.8;">إذا لم تقم بإنشاء هذا الحساب، يرجى تجاهل هذا البريد.</p>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      
      // Log for debugging (AI Studio Terminal)
      console.log(`[AUTH] Verification link for ${email}: ${verificationUrl}`);

      res.status(201).json({ message: 'تم إنشاء الحساب بنجاح. يرجى مراجعة بريدك الإلكتروني لتأكيد الحساب.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'حدث خطأ أثناء إنشاء الحساب' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
      }

      if (!user.isVerified) {
        return res.status(403).json({ error: 'يرجى تأكيد بريدك الإلكتروني أولاً' });
      }

      user.lastLogin = new Date();
      await user.save();

      // Return user without password
      const userResponse = user.toObject();
      delete userResponse.password;
      delete userResponse.verificationToken;

      res.json(userResponse);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'حدث خطأ أثناء تسجيل الدخول' });
    }
  });

  app.get('/api/auth/verify', async (req, res) => {
    try {
      const { token } = req.query;
      const user = await User.findOne({ verificationToken: token });

      if (!user) {
        return res.status(400).send('رابط التأكيد غير صالح أو منتهي الصلاحية');
      }

      user.isVerified = true;
      user.verificationToken = undefined;
      await user.save();

      res.send(`
        <div dir="rtl" style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: green;">تم تأكيد الحساب بنجاح!</h1>
          <p>يمكنك الآن تسجيل الدخول في اللعبة والبدء في المنافسة.</p>
          <a href="/" style="color: blue; text-decoration: underline;">العودة للعبة</a>
        </div>
      `);
    } catch (err) {
      console.error(err);
      res.status(500).send('حدث خطأ أثناء تأكيد الحساب');
    }
  });

  app.get('/api/profile/:id', async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
      
      const userResponse = user.toObject();
      delete userResponse.password;
      res.json(userResponse);
    } catch (err) {
      res.status(500).json({ error: 'حدث خطأ أثناء جلب الملف الشخصي' });
    }
  });

  app.post('/api/profile/:id', async (req, res) => {
    try {
      const { displayName, themeId, coins } = req.body;
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });

      if (displayName) user.displayName = displayName;
      if (themeId) user.equippedTheme = themeId;
      if (coins !== undefined) user.coins = coins;

      await user.save();
      
      const userResponse = user.toObject();
      delete userResponse.password;
      res.json(userResponse);
    } catch (err) {
      res.status(500).json({ error: 'حدث خطأ أثناء تحديث الملف الشخصي' });
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
    console.log(`* Game Server Running!`);
    console.log(`* Port: ${PORT}`);
    console.log(`* Path: /game-socket`);
    console.log(`=========================================`);
  });
}

startServer().catch(console.error);
