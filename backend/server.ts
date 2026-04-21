import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '.env');

import * as dotenv from 'dotenv';
dotenv.config({ path: envPath });

console.log("[Startup] Loading from:", envPath);
console.log("[Startup] MONGODB_URI is:", process.env.MONGODB_URI ? "Found" : "MISSING!");

import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

// MongoDB Setup
// Connection will only be made to the Cloud MongoDB Atlas
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rpscards_db';

console.log("[Startup] Connecting to MongoDB at:", MONGODB_URI.includes('srv') ? 'Atlas Cluster' : 'Local Database (Fallback)');
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    try {
      await mongoose.connection.collection('users').dropIndex('uid_1');
      console.log('✅ Dropped problematic index: uid_1');
    } catch (e) {
      console.log('ℹ️ Index uid_1 not found, skipping drop.');
    }
  })
  .catch(err => console.error('❌ MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  displayName: { type: String, required: true },
  coins: { type: Number, default: 100 },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  totalWins: { type: Number, default: 0 },
  totalMatches: { type: Number, default: 0 },
  lastXpRewardDate: { type: Date }, // For daily login rewards
  purchasedThemes: { type: [String], default: ['normal'] },
  equippedTheme: { type: String, default: 'normal' },
  isVerified: { type: Boolean, default: false },
  verificationToken: String,
  verificationTokenExpires: Date,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  createdAt: { type: Date, default: Date.now },
  lastLogin: Date
});

const User = mongoose.model('User', userSchema);

// XP Constants
const XP_REWARDS = {
  DAILY_LOGIN: 50,
  MATCH_COMPLETE: 20,
  MATCH_WIN_BONUS: 30, // Total 50 if win
  TOURNAMENT_PARTICIPATION: 100,
  TOURNAMENT_WIN: 500,
};

/**
 * Level Formula: 100 * (Level^1.5)
 * Level 1: 0 XP
 * Level 2: 100 XP
 * Level 3: 282 XP
 * Level 4: 520 XP
 * Level 5: 800 XP
 */
function calculateLevel(xp: number): number {
  if (xp < 100) return 1;
  // Inverse formula: (XP/100)^(1/1.5)
  return Math.floor(Math.pow(xp / 100, 1 / 1.5)) + 1;
}

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

async function awardMatchRewards(room: Room) {
  const players = Object.values(room.players);
  if (players.length !== 2) return;

  const p1 = players[0];
  const p2 = players[1];

  const p1Winner = p1.score > p2.score;
  const p2Winner = p2.score > p1.score;

  const updatePlayer = async (player: Player, won: boolean) => {
    // Only update if it's a valid MongoDB ID (registered user)
    if (player.id && (player.id.length === 24 || /^[0-9a-fA-F]{24}$/.test(player.id))) {
      try {
        const user = await User.findById(player.id);
        if (user) {
          user.totalMatches += 1;
          if (won) user.totalWins += 1;
          
          const xpGained = XP_REWARDS.MATCH_COMPLETE + (won ? XP_REWARDS.MATCH_WIN_BONUS : 0);
          user.xp += xpGained;
          
          const newLevel = calculateLevel(user.xp);
          const leveledUp = newLevel > user.level;
          user.level = newLevel;
          
          await user.save();
          
          // Send specific reward message to this player
          if (player.ws.readyState === WebSocket.OPEN) {
            player.ws.send(JSON.stringify({
              type: 'match_rewards',
              xpGained,
              leveledUp,
              newLevel: user.level,
              totalXp: user.xp
            }));
          }
        }
      } catch (err) {
        console.error('Error awarding match rewards:', err);
      }
    }
  };

  await updatePlayer(p1, p1Winner);
  await updatePlayer(p2, p2Winner);
}

function startNextRound(roomId: string) {
  const room = rooms[roomId];
  if (!room) return;

  const round = room.round;
  if (round >= 9) {
    room.gameState = 'gameOver';
    awardMatchRewards(room);
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
      const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();
      const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours expiry

      const user = new User({
        email,
        password: hashedPassword,
        displayName,
        verificationToken,
        verificationTokenExpires
      });

      await user.save();

      const mailOptions = {
        from: process.env.GAME_EMAIL_USER,
        to: email,
        subject: 'كود تأكيد حساب بطاقات حجر ورقة مقص',
        html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; text-align: center; background-color: #1a1a1a; color: #f5f5dc; padding: 40px; border-radius: 10px;">
            <h1 style="color: #008080;">بطاقات حجر ورقة مقص</h1>
            <p style="font-size: 18px;">كود تأكيد حسابك هو:</p>
            <div style="display: inline-block; background-color: #333; color: #008080; padding: 15px 30px; font-size: 32px; font-weight: bold; border-radius: 10px; letter-spacing: 10px; margin: 20px 0; border: 2px solid #008080;">
              ${verificationToken}
            </div>
            <p style="margin-top: 30px; font-size: 14px; opacity: 0.8;">أدخل هذا الكود في اللعبة لتفعيل حسابك.</p>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      
      // Log for debugging
      console.log(`[AUTH] Verification code for ${email}: ${verificationToken}`);

      res.status(201).json({ message: 'تم إنشاء الحساب بنجاح. يرجى مراجعة بريدك الإلكتروني للحصول على كود التأكيد.' });
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

      const now = new Date();
      let xpGained = 0;
      let leveledUp = false;

      // Daily XP Reward check
      if (!user.lastXpRewardDate || now.toDateString() !== user.lastXpRewardDate.toDateString()) {
        xpGained = XP_REWARDS.DAILY_LOGIN;
        user.xp += xpGained;
        user.lastXpRewardDate = now;
        
        const newLevel = calculateLevel(user.xp);
        if (newLevel > user.level) {
          user.level = newLevel;
          leveledUp = true;
        }
      }

      user.lastLogin = now;
      await user.save();

      // Return user without password
      const userResponse = user.toObject();
      delete userResponse.password;
      delete userResponse.verificationToken;

      res.json({ 
        ...userResponse, 
        dailyXpGained: xpGained,
        leveledUp
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'حدث خطأ أثناء تسجيل الدخول' });
    }
  });

  app.get('/api/leaderboard', async (req, res) => {
    try {
      const { userId } = req.query;
      const topPlayers = await User.find({ isVerified: true })
        .sort({ xp: -1 })
        .limit(50)
        .select('displayName xp level equippedTheme');

      let userRank = -1;
      let userData = null;

      if (userId) {
        const allUsers = await User.find({ isVerified: true }).sort({ xp: -1 }).select('_id');
        userRank = allUsers.findIndex(u => u._id.toString() === userId) + 1;
        userData = await User.findById(userId).select('displayName xp level equippedTheme');
      }

      res.json({
        topPlayers,
        userRank,
        userData
      });
    } catch (err) {
      res.status(500).json({ error: 'حدث خطأ أثناء جلب لوحة الصدارة' });
    }
  });

  app.post('/api/auth/resend-code', async (req, res) => {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email });

      if (!user) {
        return res.status(404).json({ error: 'المستخدم غير موجود' });
      }

      if (user.isVerified) {
        return res.status(400).json({ error: 'الحساب مؤكد بالفعل' });
      }

      const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();
      const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      user.verificationToken = verificationToken;
      user.verificationTokenExpires = verificationTokenExpires;
      await user.save();

      const mailOptions = {
        from: process.env.GAME_EMAIL_USER,
        to: email,
        subject: 'كود تأكيد حساب بطاقات حجر ورقة مقص الجديد',
        html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; text-align: center; background-color: #1a1a1a; color: #f5f5dc; padding: 40px; border-radius: 10px;">
            <h1 style="color: #008080;">بطاقات حجر ورقة مقص</h1>
            <p style="font-size: 18px;">كود تأكيد حسابك الجديد هو:</p>
            <div style="display: inline-block; background-color: #333; color: #008080; padding: 15px 30px; font-size: 32px; font-weight: bold; border-radius: 10px; letter-spacing: 10px; margin: 20px 0; border: 2px solid #008080;">
              ${verificationToken}
            </div>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      res.json({ message: 'تم إرسال كود تأكيد جديد لبريدك الإلكتروني.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'حدث خطأ أثناء إعادة إرسال الكود' });
    }
  });

  app.post('/api/auth/verify-code', async (req, res) => {
    try {
      const { email, code } = req.body;
      const user = await User.findOne({ 
        email, 
        verificationToken: code,
        verificationTokenExpires: { $gt: new Date() } 
      });

      if (!user) {
        return res.status(400).json({ error: 'كود التأكيد غير صحيح أو انتهت صلاحيته' });
      }

      user.isVerified = true;
      user.verificationToken = undefined;
      user.verificationTokenExpires = undefined;
      await user.save();

      res.json({ message: 'تم تأكيد الحساب بنجاح! يمكنك الآن تسجيل الدخول.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'حدث خطأ أثناء التأكيد' });
    }
  });

  app.get('/api/auth/verify', async (req, res) => {
    try {
      const token = req.query.token as string;
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
      const { displayName, themeId, equippedTheme, coins, purchasedThemes } = req.body;
      console.log(`[Profile Update] User: ${req.params.id}`, req.body);
      
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });

      // Support both themeId and equippedTheme for transition/compatibility
      if (displayName) user.displayName = displayName;
      
      const finalThemeId = equippedTheme || themeId;
      if (finalThemeId) {
        user.equippedTheme = finalThemeId;
      }

      if (coins !== undefined) {
        user.coins = coins;
      }

      if (purchasedThemes && Array.isArray(purchasedThemes)) {
        // Just trust the client's current set of themes, but always ensure 'normal' exists
        const combined = Array.from(new Set(['normal', ...purchasedThemes]));
        user.purchasedThemes = combined;
      }

      await user.save();
      console.log(`[Profile Update Success] User: ${user.email} - Coins: ${user.coins} - Themes: ${user.purchasedThemes.length}`);
      
      const userResponse = user.toObject();
      delete userResponse.password;
      res.json(userResponse);
    } catch (err) {
      console.error('[Profile Update Error]:', err);
      res.status(500).json({ error: 'حدث خطأ أثناء تحديث الملف الشخصي' });
    }
  });

  wss.on('connection', (ws) => {
    let effectivePlayerId = Math.random().toString(36).substring(2, 10);
    console.log(`[WS] New connection attempt. Temp ID: ${effectivePlayerId}`);

    ws.send(JSON.stringify({ type: 'PING' }));

    ws.on('message', (data) => {
      try {
        const messageString = data.toString();
        const message = JSON.parse(messageString);
        
        // Use client-provided ID if available (persistent for registered users)
        if (message.playerId) {
          effectivePlayerId = message.playerId;
        }

        console.log(`[WS] Message from ${effectivePlayerId}:`, message.type);
        
        if (message.type === 'PONG') return;

        if (message.type === 'create_room') {
          const roomId = generateRoomCode();
          rooms[roomId] = {
            id: roomId,
            players: {
              [effectivePlayerId]: { id: effectivePlayerId, name: message.playerName || 'لاعب', themeId: message.themeId || 'normal', deck: { ...INITIAL_DECK }, score: 0, choice: null, readyForNext: false, ws }
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

          room.players[effectivePlayerId] = { id: effectivePlayerId, name: message.playerName || 'لاعب', themeId: message.themeId || 'normal', deck: { ...INITIAL_DECK }, score: 0, choice: null, readyForNext: false, ws };
          room.gameState = 'playing';
          ws.send(JSON.stringify({ type: 'joined_room_success', roomId: code }));
          startRoundTimer(code);
          broadcastToRoom(code, { type: 'room_state', state: room });
        }

        if (message.type === 'quick_match') {
          if (matchmakingQueue.find(p => p.id === effectivePlayerId)) return;

          matchmakingQueue.push({
            id: effectivePlayerId,
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

      } catch (e) {
        console.error('Error processing message:', e);
      }
    });

    ws.on('close', () => {
      console.log('Online User disconnected:', effectivePlayerId);
      handleDisconnect(effectivePlayerId);
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

  // Vite integration for full-stack SPA
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
      root: path.resolve(__dirname, '..') // Point to root where index.html is
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, '..', 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(parseInt(PORT as string, 10), '0.0.0.0', () => {
    console.log(`=========================================`);
    console.log(`* Game Server Running!`);
    console.log(`* Port: ${PORT}`);
    console.log(`* Path: /game-socket`);
    console.log(`=========================================`);
  });
}

startServer().catch(console.error);
