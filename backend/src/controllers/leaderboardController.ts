import { Request, Response } from 'express';
import { User } from '../models/User';

export const getLeaderboard = async (req: Request, res: Response) => {
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
};
