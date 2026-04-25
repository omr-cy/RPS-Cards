import express from 'express';
import { createServer as createHttpServer } from 'http';
import { createServer as createHttpsServer } from 'https';
import { WebSocketServer } from 'ws';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cors from 'cors';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '.env');
dotenv.config({ path: envPath });

import { connectDB } from './src/config/db';
import { authRoutes } from './src/routes/authRoutes';
import { profileRoutes } from './src/routes/profileRoutes';
import { leaderboardRoutes } from './src/routes/leaderboardRoutes';
import { chatRoutes } from './src/routes/chatRoutes';
import { setupWebSocket } from './src/services/websocketService';

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
  const { activeRooms } = setupWebSocket(wss);

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

  app.get('/api/health', (req, res) => res.json({ status: 'ok', activeRooms: activeRooms() }));

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/leaderboard', leaderboardRoutes);
  app.use('/api/chat', chatRoutes);

  // Vite integration / Static serving
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
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
