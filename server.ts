import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes from './backend/routes/authRoutes';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// MongoDB Connection
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB Successfully'))
    .catch((err) => console.error('MongoDB Connection Error:', err));
} else {
  console.warn('MONGODB_URI is not defined in environment variables');
}

// Auth routes
app.use('/api/auth', authRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
