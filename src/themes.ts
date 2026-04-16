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
  isDefault?: boolean;
}

export const THEMES: ThemeConfig[] = [
  {
    id: 'classic-white',
    name: 'كلاسيكي (أبيض)',
    path: '/classic/black',
    price: 0,
    isDefault: true,
    frontColor: 'bg-[#E8E8E8]',
    backColor: 'bg-[#E5E5E5]',
    backIcon: 'default',
    counterBgColor: 'bg-[#E8E8E8]',
    counterTextColor: 'text-[#121212]'
  },
  {
    id: 'classic-black',
    name: 'كلاسيكي (أسود)',
    path: '/classic/white',
    price: 0,
    isDefault: true,
    frontColor: 'bg-[#121212]',
    backColor: 'bg-[#0A0A0A]',
    backIcon: 'default',
    counterBgColor: 'bg-[#121212]',
    counterTextColor: 'text-[#F5F5F5]'
  },
  {
    id: 'gold-edition',
    name: 'النسخة الذهبية',
    path: '/classic/black',
    price: 0,
    frontColor: 'bg-gradient-to-br from-[#FFD700] to-[#B8860B]',
    backColor: 'bg-gradient-to-br from-[#B8860B] to-[#8B6508]',
    backIcon: 'default',
    counterBgColor: 'bg-[#FFD700]',
    counterTextColor: 'text-[#121212]'
  },
  {
    id: 'ruby-edition',
    name: 'النسخة الياقوتية',
    path: '/classic/white',
    price: 0,
    frontColor: 'bg-gradient-to-br from-[#8B0000] to-[#4A0000]',
    backColor: 'bg-gradient-to-br from-[#4A0000] to-[#2A0000]',
    backIcon: 'default',
    counterBgColor: 'bg-[#8B0000]',
    counterTextColor: 'text-[#F5F5F5]'
  },
  {
    id: 'robots-ai',
    name: 'ذكاء إصطناعي',
    path: '/robots_ai',
    price: 0,
    frontColor: 'bg-[#00125F]',
    backColor: 'bg-[#00125F]',
    backIcon: 'default',
    counterBgColor: 'bg-[#00125F]',
    counterTextColor: 'text-[#F5F5F5]'
  },
  {
    id: 'toyes',
    name: 'العاب أطفال',
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
  return `${theme.path}/${type}.svg`;
};
