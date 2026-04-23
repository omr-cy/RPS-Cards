import { assetPreloader } from './lib/preloader';

export type CardType = 'rock' | 'paper' | 'scissors';

export interface ThemeConfig {
  id: string;
  name: string;
  path: string;
  price: number;
  frontColor: string;
  backColor: string;
  backIcon: string;
  counterBgColor: string;
  counterTextColor: string;
  extension?: 'svg' | 'png' | 'jpg';
  isDefault?: boolean;
  iconScale?: number; // percentage, e.g. 100 for 100%
  requiredLevel?: number;
  category?: 'level' | 'special';
}

export const THEMES: ThemeConfig[] = [

  {
    id: 'normal',
    name: 'عادي',
    path: '/card_themes/normal',
    price: 0,
    isDefault: true,
    frontColor: 'bg-[#6F5C57]',
    backColor: 'bg-[#6F5C57]',
    backIcon: 'default',
    counterBgColor: 'bg-[#6F5C57]',
    counterTextColor: 'text-[#F5F5F5]',
    extension: 'svg',
    iconScale: 125,
    requiredLevel: 1,
    category: 'level'
  },
  {
    id: 'bone',
    name: 'عظمي',
    path: '/card_themes/bones',
    price: 0,
    frontColor: 'bg-[#121212]',
    backColor: 'bg-[#121212]',
    backIcon: 'default',
    counterBgColor: 'bg-[#121212]',
    counterTextColor: 'text-[#F5F5F5]',
    extension: 'svg',
    iconScale: 100,
    requiredLevel: 3,
    category: 'level'
  },
  {
    id: 'robot',
    name: 'روبوتي',
    path: '/card_themes/robots',
    price: 0,
    frontColor: 'bg-[#0E65A4]',
    backColor: 'bg-[#0E65A4]',
    backIcon: 'default',
    counterBgColor: 'bg-[#0E65A4]',
    counterTextColor: 'text-[#F5F5F5]',
    iconScale: 100,
    requiredLevel: 5,
    category: 'level'
  },
  {
    id: 'toyes',
    name: 'العاب',
    path: '/card_themes/toyes',
    price: 0,
    frontColor: 'bg-[#BC4A00]',
    backColor: 'bg-[#BC4A00]',
    backIcon: 'default',
    counterBgColor: 'bg-[#BC4A00]',
    counterTextColor: 'text-[#F5F5F5]',
    iconScale: 100,
    requiredLevel: 7,
    category: 'level'
  },
  {
    id: 'cats',
    name: 'قطط',
    path: '/card_themes/cats',
    price: 0,
    frontColor: 'bg-[#C87874]',
    backColor: 'bg-[#C87874]',
    backIcon: 'default',
    counterBgColor: 'bg-[#C87874]',
    counterTextColor: 'text-[#F5F5F5]',
    iconScale: 100,
    requiredLevel: 10,
    category: 'level'
  },
    {
    id: 'building_tools',
    name: 'أدوات بناء',
    path: '/card_themes/building_tools',
    price: 0,
    frontColor: 'bg-[#E9B41C]',
    backColor: 'bg-[#E9B41C]',
    backIcon: 'default',
    counterBgColor: 'bg-[#E9B41C]',
    counterTextColor: 'text-[#121212]',
    iconScale: 100,
    requiredLevel: 15,
    category: 'level'
  },
  // {
  //   id: 'bone',
  //   name: 'ياقوتي',
  //   path: '/bones',
  //   price: 0,
  //   frontColor: 'bg-gradient-to-br from-[#8B0000] to-[#4A0000]',
  //   backColor: 'bg-gradient-to-br from-[#4A0000] to-[#2A0000]',
  //   backIcon: 'default',
  //   counterBgColor: 'bg-[#8B0000]',
  //   counterTextColor: 'text-[#F5F5F5]',
  //   extension: 'png'
  // },
  // {
  //   id: 'gold-edition',
  //   name: 'النسخة الذهبية',
  //   path: '/classic/black',
  //   price: 0,
  //   frontColor: 'bg-gradient-to-br from-[#FFD700] to-[#B8860B]',
  //   backColor: 'bg-gradient-to-br from-[#B8860B] to-[#8B6508]',
  //   backIcon: 'default',
  //   counterBgColor: 'bg-[#FFD700]',
  //   counterTextColor: 'text-[#121212]'
  // },
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
