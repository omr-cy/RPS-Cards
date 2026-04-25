import { Request, Response } from 'express';
import { PublicMessage } from '../models/PublicMessage';

export const getChatHistory = async (req: Request, res: Response) => {
  try {
    const { before, limit = 10 } = req.query;
    const query: any = {};
    
    if (before) {
      query.createdAt = { $lt: new Date(before as string) };
    }
    
    const messages = await PublicMessage.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();
    
    const formattedMessages = messages.map(msg => ({
      id: msg._id,
      senderId: msg.senderId,
      senderName: msg.senderName,
      text: msg.text,
      timestamp: msg.createdAt.getTime()
    }));

    res.json(formattedMessages.reverse());
  } catch (err) {
    console.error('[Chat History Error]', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};
