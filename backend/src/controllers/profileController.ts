import { Request, Response } from 'express';
import { User } from '../models/User';

export const getProfile = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
    
    const userResponse = user.toObject();
    delete userResponse.password;
    res.json(userResponse);
  } catch (err) {
    res.status(500).json({ error: 'حدث خطأ أثناء جلب بيانات الحقيبة' });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const { displayName, themeId, equippedTheme, coins, purchasedThemes } = req.body;
    console.log(`[Profile Update] User: ${req.params.id}`, req.body);
    
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });

    if (displayName) user.displayName = displayName;
    
    const finalThemeId = equippedTheme || themeId;
    if (finalThemeId) {
      user.equippedTheme = finalThemeId;
    }

    if (coins !== undefined) {
      user.coins = coins;
    }

    if (purchasedThemes && Array.isArray(purchasedThemes)) {
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
};
