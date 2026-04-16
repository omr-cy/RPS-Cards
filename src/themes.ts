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
    frontColor: 'bg-[#121212]',
    backColor: 'bg-[#0A0A0A]',
    backIcon: 'default',
    counterBgColor: 'bg-[#121212]',
    counterTextColor: 'text-[#F5F5F5]',
    extension: 'png'
  },
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
  {
    id: 'bone',
    name: 'عظمي',
    path: '/bones',
    price: 0,
    frontColor: 'bg-gradient-to-br from-[#8B0000] to-[#4A0000]',
    backColor: 'bg-gradient-to-br from-[#4A0000] to-[#2A0000]',
    backIcon: 'default',
    counterBgColor: 'bg-[#8B0000]',
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
  return `${theme.path}/${type}.${ext}`;
};
