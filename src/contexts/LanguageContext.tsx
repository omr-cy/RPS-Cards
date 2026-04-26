import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Language, TranslationKey, translations, LANGUAGE_NAMES } from '../i18n/translations';

const LS_KEY = 'cardclash_language';

// Detect device language from the browser/Android WebView locale
function detectDeviceLanguage(): Language {
  const locale = navigator.language || 'ar';
  const lang = locale.toLowerCase();
  if (lang.startsWith('zh')) return 'zh';
  if (lang.startsWith('ar')) return 'ar';
  if (lang.startsWith('en')) return 'en';
  return 'ar'; // default fallback
}

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  isRTL: boolean;
  LANGUAGE_NAMES: typeof LANGUAGE_NAMES;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem(LS_KEY) as Language | null;
    if (saved && ['ar', 'en', 'zh'].includes(saved)) return saved;
    return detectDeviceLanguage();
  });

  const isRTL = language === 'ar';

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(LS_KEY, lang);
  }, []);

  const t = useCallback((key: TranslationKey): string => {
    const entry = translations[key];
    if (!entry) return key;
    return entry[language] || entry['ar'] || key;
  }, [language]);

  // Apply dir to html element for RTL/LTR
  useEffect(() => {
    document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', language);
  }, [isRTL, language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL, LANGUAGE_NAMES }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
};
