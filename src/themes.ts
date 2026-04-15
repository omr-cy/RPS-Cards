export type CardType = 'rock' | 'paper' | 'scissors';

export interface ThemeConfig {
  id: string;
  name: string;
  price: number;
  isDefault?: boolean;
  images: {
    rock: string;
    paper: string;
    scissors: string;
  };
  colors: {
    bg: string;
    text: string;
    border: string;
    shadow: string;
  };
  backColors: {
    bg: string;
    iconOuter: string;
    iconInner: string;
  };
}

export const THEMES: ThemeConfig[] = [
  {
    id: 'classic-white',
    name: 'كلاسيكي (أبيض)',
    price: 0,
    isDefault: true,
    images: {
      rock: '/classic/rock_black.svg',
      paper: '/classic/paper_black.svg',
      scissors: '/classic/scissors_black.svg',
    },
    colors: {
      bg: 'bg-[#E8E8E8]',
      text: 'text-[#121212]',
      border: '',
      shadow: ''
    },
    backColors: {
      bg: 'bg-[#E5E5E5]',
      iconOuter: 'bg-black/10',
      iconInner: 'bg-black/10'
    }
  },
  {
    id: 'classic-black',
    name: 'كلاسيكي (أسود)',
    price: 0,
    isDefault: true,
    images: {
      rock: '/classic/rock_white.svg',
      paper: '/classic/paper_white.svg',
      scissors: '/classic/scissors_white.svg',
    },
    colors: {
      bg: 'bg-[#121212]',
      text: 'text-[#F5F5F5]',
      border: '',
      shadow: ''
    },
    backColors: {
      bg: 'bg-[#0A0A0A]',
      iconOuter: 'bg-white/10',
      iconInner: 'bg-white/10'
    }
  },
  {
    id: 'gold-edition',
    name: 'النسخة الذهبية',
    price: 500,
    images: {
      rock: '/classic/rock_black.svg',
      paper: '/classic/paper_black.svg',
      scissors: '/classic/scissors_black.svg',
    },
    colors: {
      bg: 'bg-gradient-to-br from-[#FFD700] to-[#B8860B]',
      text: 'text-[#121212]',
      border: '',
      shadow: ''
    },
    backColors: {
      bg: 'bg-gradient-to-br from-[#B8860B] to-[#8B6508]',
      iconOuter: 'bg-black/20',
      iconInner: 'bg-black/20'
    }
  },
  {
    id: 'ruby-edition',
    name: 'النسخة الياقوتية',
    price: 750,
    images: {
      rock: '/classic/rock_white.svg',
      paper: '/classic/paper_white.svg',
      scissors: '/classic/scissors_white.svg',
    },
    colors: {
      bg: 'bg-gradient-to-br from-[#8B0000] to-[#4A0000]',
      text: 'text-[#F5F5F5]',
      border: '',
      shadow: ''
    },
    backColors: {
      bg: 'bg-gradient-to-br from-[#4A0000] to-[#2A0000]',
      iconOuter: 'bg-white/20',
      iconInner: 'bg-white/20'
    }
  }
];

export const getTheme = (id: string): ThemeConfig => {
  return THEMES.find(t => t.id === id) || THEMES[0];
};
