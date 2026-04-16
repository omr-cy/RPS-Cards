import { assetPreloader } from './lib/preloader';
import { AssetMap } from './assetMap';

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
}

export const THEMES: ThemeConfig[] = [
  {
    id: 'normal',
    name: 'عادي',
    path: '/normal',
    price: 0,
    isDefault: true,
    frontColor: 'bg-[#6F5C57]',
    backColor: 'bg-[#6F5C57]',
    backIcon: 'default',
    counterBgColor: 'bg-[#6F5C57]',
    counterTextColor: 'text-[#F5F5F5]',
    extension: 'png'
  },
  {
    id: 'bone',
    name: 'عظمي',
    path: '/bones',
    price: 0,
    frontColor: 'bg-[#121212]',
    backColor: 'bg-[#121212]',
    backIcon: 'default',
    counterBgColor: 'bg-[#121212]',
    counterTextColor: 'text-[#F5F5F5]',
    extension: 'png'
  },
  {
    id: 'robot',
    name: 'روبوتي',
    path: '/robots',
    price: 0,
    frontColor: 'bg-[#0E65A4]',
    backColor: 'bg-[#0E65A4]',
    backIcon: 'default',
    counterBgColor: 'bg-[#0E65A4]',
    counterTextColor: 'text-[#F5F5F5]'
  },
  {
    id: 'toyes',
    name: 'العاب',
    path: '/toyes',
    price: 0,
    frontColor: 'bg-[#BC4A00]',
    backColor: 'bg-[#BC4A00]',
    backIcon: 'default',
    counterBgColor: 'bg-[#BC4A00]',
    counterTextColor: 'text-[#F5F5F5]'
  }
];

export const getTheme = (id: string): ThemeConfig => {
  return THEMES.find(t => t.id === id) || THEMES[0];
};

export const getCardImagePath = (theme: ThemeConfig, type: CardType): string => {
  const ext = theme.extension || 'svg';
  const rawUrl = `${theme.path}/${type}.${ext}`;
  return AssetMap[rawUrl] || assetPreloader.getCachedUrl(rawUrl);
};

export const getThemeBackIcon = (theme: ThemeConfig): string => {
  if (theme.backIcon === 'default') return 'default';
  return AssetMap[theme.backIcon] || assetPreloader.getCachedUrl(theme.backIcon);
};
