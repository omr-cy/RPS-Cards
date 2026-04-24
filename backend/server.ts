import express from 'express';
import { createServer as createHttpServer } from 'http';
import { createServer as createHttpsServer } from 'https';
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
const connectDB = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        try {
            await mongoose.connection.collection('users').dropIndex('uid_1');
            console.log('✅ Dropped problematic index: uid_1');
        } catch (e) {
            console.log('ℹ️ Index uid_1 not found, skipping drop.');
        }
    } catch (err) {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    }
};

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  displayName: { type: String, required: true },
  coins: { type: Number, default: 100 },
  competitionPoints: { type: Number, default: 0 },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
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

// Leveling Logic Helpers
const BASE_XP = 100;
const calculateLevel = (xp: number) => {
  if (!xp || xp < 0) return 1;
  // Quadratic curve: To reach level L, you need (L-1)^2 * BASE_XP total XP.
  // Level = sqrt(xp / BASE_XP) + 1
  return Math.floor(Math.sqrt(xp / BASE_XP)) + 1;
};
const getXPToLevel = (level: number) => Math.pow(level, 2) * BASE_XP;

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
  isPublic?: boolean;
}

const rooms: Record<string, Room> = {};
const roomTimers: Record<string, NodeJS.Timeout> = {};

// Queue for Random Matchmaking
interface MatchmakingPlayer {
  id: string;
  name: string;
  themeId: string;
  level: number;
  ws: WebSocket;
  timeJoined: number;
}
const matchmakingQueue: MatchmakingPlayer[] = [];
const LEVEL_SENSITIVITY = 2; // Initial acceptable level difference
const LEVEL_SENSITIVITY_EXPANSION = 2; // How much to expand search per interval
const SEARCH_EXPANSION_INTERVAL = 3000; // Expand search every 3 seconds

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}
const globalChatHistory: ChatMessage[] = [];

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

    // Award XP and Coins at the end of the game
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
              
              // NEW REWARD LOGIC:
              // XP only for Public Matchmaking
              // Coins for ALL games (Public and Private/Friend)
              
              const xpGain = (p.id === winnerId) ? 50 : 20;
              const coinGain = (p.id === winnerId) ? 15 : 5; // Small coin reward for participation too
              const compGain = (p.id === winnerId) ? 15 : 5;

              if (room.isPublic) {
                user.xp = (user.xp || 0) + xpGain;
                user.level = calculateLevel(user.xp);
                console.log(`[Game Over - Public] Player ${user.displayName} gained ${xpGain} XP.`);
              } else {
                console.log(`[Game Over - Private] Player ${user.displayName} gained no XP (Friend Room).`);
              }
              
              // Reward coins and competition points
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

async function startServer() {
  await connectDB();
  const app = express();
  const PORT = process.env.BACKEND_PORT || 3000;
  
  // SSL Setup
  const certPath = path.join(__dirname, 'certs', 'certificate.crt');
  const keyPath = path.join(__dirname, 'certs', 'private.key');
  const caPath = path.join(__dirname, 'certs', 'ca_bundle.crt');

  let httpServer;
  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    try {
      const options = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
        ca: fs.existsSync(caPath) ? fs.readFileSync(caPath) : undefined
      };
      httpServer = createHttpsServer(options, app);
      console.log("✅ SSL certificates found. Starting HTTPS server.");
    } catch (err) {
      console.error("❌ Failed to load SSL certificates, falling back to HTTP:", err);
      httpServer = createHttpServer(app);
    }
  } else {
    httpServer = createHttpServer(app);
    console.log("⚠️ SSL certificates not found. Starting HTTP server.");
  }

  const wss = new WebSocketServer({ server: httpServer, path: '/game-socket' });

  // Robust CORS Middleware
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

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
      const lastLogin = user.lastLogin;
      let xpBonus = 0;

      // Migration check: Ensure legacy users have xp and level
      if (user.xp === undefined || user.xp === null) user.xp = 0;
      if (user.level === undefined || user.level === null) user.level = 1;

      // Daily Login Bonus (50 XP)
      if (!lastLogin || now.toDateString() !== lastLogin.toDateString()) {
        xpBonus = 50;
        user.xp = (user.xp || 0) + xpBonus;
        user.level = calculateLevel(user.xp);
        console.log(`[AUTH] User ${user.email} received daily login bonus: ${xpBonus} XP. New Level: ${user.level}`);
      }

      user.lastLogin = now;
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
      res.status(500).json({ error: 'حدث خطأ أثناء جلب بيانات الحقيبة' });
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
      res.status(500).json({ error: 'حدث خطأ أثناء تحديث بيانات الحقيبة' });
    }
  });

  app.get('/api/leaderboard', async (req, res) => {
    try {
      const topPlayers = await User.find({ isVerified: true })
        .sort({ competitionPoints: -1 })
        .limit(20)
        .select('displayName xp level coins competitionPoints equippedTheme');

      let userRank = null;
      let userScore = null;
      const userId = req.query.userId as string;

      if (userId) {
        const user = await User.findById(userId);
        if (user) {
          userScore = { xp: user.xp, level: user.level, coins: user.coins, competitionPoints: user.competitionPoints };
          // Count users with more points to get rank
          userRank = await User.countDocuments({ competitionPoints: { $gt: user.competitionPoints || 0 }, isVerified: true }) + 1;
        }
      }

      res.json({
        topPlayers,
        userRank,
        userScore
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'حدث خطأ أثناء جلب لوحة المتصدرين' });
    }
  });

  wss.on('connection', (ws) => {
    let connectionId = Math.random().toString(36).substring(2, 10);
    let currentPlayerId = connectionId;
    console.log(`[WS] New connection attempt. Temp ID: ${connectionId}`);

    ws.send(JSON.stringify({ type: 'PING' }));

    ws.on('message', (data) => {
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
          const roomId = generateRoomCode();
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
          const newMsg = {
             id: Math.random().toString(36).substring(2, 15),
             senderId: effectivePlayerId,
             senderName: message.senderName || 'لاعب',
             text: (message.text || '').substring(0, 500),
             timestamp: Date.now()
          };
          globalChatHistory.push(newMsg);
          if (globalChatHistory.length > 50) globalChatHistory.shift();

          const chatEvt = JSON.stringify({ type: 'chat_message', message: newMsg });
          wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(chatEvt);
            }
          });
        }

        if (message.type === 'get_chat_history') {
           ws.send(JSON.stringify({ type: 'chat_history', messages: globalChatHistory }));
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
            // If game was active, give victory to remaining player
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

  // Periodic Matchmaking Processor
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

        const roomId = generateRoomCode();
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
          if (p1.ws.readyState === 1) { // WebSocket.OPEN is 1
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

    // Remove matched players from queue
    for (let i = matchmakingQueue.length - 1; i >= 0; i--) {
      if (handledIds.has(matchmakingQueue[i].id)) {
        matchmakingQueue.splice(i, 1);
      }
    }
  }, 2000);

  // Vite integration for full-stack SPA
  if (process.env.NODE_ENV !== 'production' && false) { // Disabled
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
