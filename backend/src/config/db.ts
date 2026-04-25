import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '../../.env');

dotenv.config({ path: envPath });

export const connectDB = async () => {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rpscards_db';
  console.log("[Startup] Connecting to MongoDB at:", MONGODB_URI.includes('srv') ? 'Atlas Cluster' : 'Local Database (Fallback)');
  
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
