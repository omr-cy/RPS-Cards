const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, immutable: true },
  googleId: { type: String, required: true, unique: true, immutable: true },
  gameId: { type: String, required: true, unique: true, default: uuidv4, immutable: true },
  
  profile: {
    avatar: String,
    displayName: String,
    bio: { type: String, default: '' },
  },
  
  gameData: {
    coins: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    xp: { type: Number, default: 0 },
  },
  
  stats: {
    gamesPlayed: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
  },
  
  cards: [{
    cardId: String,
    level: { type: Number, default: 1 },
    quantity: { type: Number, default: 1 }
  }],
  
  ranking: {
    rankPoints: { type: Number, default: 0 },
    tier: { type: String, default: 'bronze' },
  },
  
  lastLogin: { type: Date, default: Date.now }
}, { timestamps: true });

userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    delete ret.email;
    delete ret.googleId;
    delete ret.gameId;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);
