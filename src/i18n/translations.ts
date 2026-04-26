import ar from './ar';
import en from './en';
import zh from './zh';

export type Language = 'ar' | 'en' | 'zh';

export const LANGUAGE_NAMES: Record<Language, string> = {
  ar: 'العربية',
  en: 'English',
  zh: '中文',
};

type TranslationData = typeof en;

const combineTranslations = (): Record<keyof TranslationData, Record<Language, string>> => {
  const keys = Object.keys(en) as Array<keyof TranslationData>;
  const result: any = {};

  keys.forEach(key => {
    result[key] = {
      ar: (ar as any)[key] || (en as any)[key],
      en: (en as any)[key],
      zh: (zh as any)[key] || (en as any)[key],
    };
  });

  return result;
};

export const translations = combineTranslations();

export type TranslationKey = keyof TranslationData;
