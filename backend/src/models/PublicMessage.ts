import mongoose from 'mongoose';

const publicMessageSchema = new mongoose.Schema({
  senderId: { type: String, required: true },
  senderName: { type: String, required: true },
  text: { type: String, required: true, maxlength: 500 },
  createdAt: { type: Date, default: Date.now }
});

// Index for pagination
publicMessageSchema.index({ createdAt: -1 });

export const PublicMessage = mongoose.model('PublicMessage', publicMessageSchema);
