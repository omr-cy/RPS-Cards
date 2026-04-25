export const BASE_XP = 100;

export const calculateLevel = (xp: number) => {
  if (!xp || xp < 0) return 1;
  // Quadratic curve: To reach level L, you need (L-1)^2 * BASE_XP total XP.
  // Level = sqrt(xp / BASE_XP) + 1
  return Math.floor(Math.sqrt(xp / BASE_XP)) + 1;
};

export const getXPToLevel = (level: number) => Math.pow(level, 2) * BASE_XP;
