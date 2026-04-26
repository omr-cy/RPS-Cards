import { assetPreloader } from './lib/preloader';

export type CardType = 'rock' | 'paper' | 'scissors';

export interface ThemeConfig {
  id: string;
  name: {
    ar: string;
    en: string;
    zh: string;
  };
  path: string;
  price: number;
  backIcon: string;
  extension?: 'svg' | 'png' | 'jpg';
  isDefault?: boolean;
  iconScale?: number; // percentage, e.g. 100 for 100%
  requiredLevel?: number;
  category?: 'level' | 'special';
}

export const THEMES: ThemeConfig[] = [

  {
    id: 'normal',
    name: {
      ar: 'عادي',
      en: 'Normal',
      zh: '普通'
    },
    path: '/card_themes/normal',
    price: 0,
    isDefault: true,
    backIcon: 'default',
    extension: 'svg',
    iconScale: 125,
    requiredLevel: 1,
    category: 'level'
  },
  {
    id: 'bone',
    name: {
      ar: 'عظمي',
      en: 'Skeleton',
      zh: '骨骼'
    },
    path: '/card_themes/bones',
    price: 0,
    backIcon: 'default',
    extension: 'svg',
    iconScale: 100,
    requiredLevel: 3,
    category: 'level'
  },
  {
    id: 'robot',
    name: {
      ar: 'روبوتي',
      en: 'Robot',
      zh: '机器人'
    },
    path: '/card_themes/robots',
    price: 0,
    backIcon: 'default',
    iconScale: 100,
    requiredLevel: 5,
    category: 'level'
  },
  {
    id: 'toyes',
    name: {
      ar: 'ألعاب',
      en: 'Gaming',
      zh: '游戏'
    },
    path: '/card_themes/toyes',
    price: 0,
    backIcon: 'default',
    iconScale: 100,
    requiredLevel: 7,
    category: 'level'
  },
  {
    id: 'cats',
    name: {
      ar: 'قطط',
      en: 'Cats',
      zh: '猫'
    },
    path: '/card_themes/cats',
    price: 0,
    backIcon: 'default',
    iconScale: 100,
    requiredLevel: 10,
    category: 'level'
  },
    {
    id: 'building_tools',
    name: {
      ar: 'أدوات بناء',
      en: 'Tools',
      zh: '工具'
    },
    path: '/card_themes/building_tools',
    price: 0,
    backIcon: 'default',
    iconScale: 100,
    requiredLevel: 15,
    category: 'level'
  },
];

export const getTheme = (id: string): ThemeConfig => {
  return THEMES.find(t => t.id === id) || THEMES[0];
};

export const getCardImagePath = (theme: ThemeConfig, type: CardType): string => {
  const ext = theme.extension || 'svg';
  const rawUrl = `${theme.path}/${type}.${ext}`;
  return assetPreloader.getCachedUrl(rawUrl);
};

export const getThemeBackIcon = (theme: ThemeConfig): string => {
  if (theme.backIcon === 'default') return 'default';
  return assetPreloader.getCachedUrl(theme.backIcon);
};
