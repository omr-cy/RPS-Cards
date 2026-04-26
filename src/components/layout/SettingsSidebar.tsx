import React, { memo, useState } from 'react';
import { X, User, Gift, LogOut, LogIn, Globe, ChevronDown } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Language, LANGUAGE_NAMES } from '../../i18n/translations';

const LANG_FLAGS: Record<Language, string> = {
  ar: '🇸🇦',
  en: '🇺🇸',
  zh: '🇨🇳',
};

export const SettingsSidebar = memo(({ isOpen, onClose, onNavigateToProfile, onNavigateToGift, user, onLoginClick, onLogout }: any) => {
  const { t, language, setLanguage, isRTL } = useLanguage();
  const [showLangPicker, setShowLangPicker] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-start" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Sidebar Panel */}
      <div className="relative w-72 h-full bg-game-dark border-l border-white/10 shadow-2xl flex flex-col p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-display text-white">{t('settings_title')}</h2>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-white/50 hover:bg-white/10 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <button 
            onClick={onNavigateToProfile}
            className="flex items-center gap-3 p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors text-right"
          >
            <User className="w-5 h-5 text-game-primary" />
            <span className="font-display text-game-offwhite">{t('settings_profile')}</span>
          </button>

          <button 
            onClick={onNavigateToGift}
            className="flex items-center gap-3 p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors text-right"
          >
            <Gift className="w-5 h-5 text-game-primary" />
            <span className="font-display text-game-offwhite">{t('settings_rewards')}</span>
          </button>

          {/* Language Selector */}
          <div className="relative">
            <button
              onClick={() => setShowLangPicker(!showLangPicker)}
              className="w-full flex items-center gap-3 p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors text-right"
            >
              <Globe className="w-5 h-5 text-game-primary flex-shrink-0" />
              <span className="font-display text-game-offwhite flex-1">{t('settings_language')}</span>
              <div className="flex items-center gap-2">
                <span className="text-lg">{LANG_FLAGS[language]}</span>
                <span className="text-xs text-game-offwhite/60 font-display">{LANGUAGE_NAMES[language]}</span>
                <ChevronDown className={`w-4 h-4 text-game-offwhite/40 transition-transform ${showLangPicker ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {showLangPicker && (
              <div className="absolute top-full mt-1 inset-x-0 bg-game-dark border border-white/10 rounded-xl overflow-hidden shadow-2xl z-10">
                {(Object.keys(LANGUAGE_NAMES) as Language[]).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => { setLanguage(lang); setShowLangPicker(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${language === lang ? 'bg-game-primary/15 text-game-primary' : 'text-game-offwhite/70 hover:bg-white/5'}`}
                  >
                    <span className="text-xl">{LANG_FLAGS[lang]}</span>
                    <span className="font-display text-sm">{LANGUAGE_NAMES[lang]}</span>
                    {language === lang && <div className="ml-auto w-2 h-2 rounded-full bg-game-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-px bg-white/10 my-2" />

          {user ? (
            <button 
              onClick={onLogout}
              className="flex items-center gap-3 p-4 bg-red-500/10 rounded-xl hover:bg-red-500/20 transition-colors text-right text-red-400"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-display">{t('settings_logout')}</span>
            </button>
          ) : (
            <button 
              onClick={onLoginClick}
              className="flex items-center gap-3 p-4 bg-game-primary/10 rounded-xl hover:bg-game-primary/20 transition-colors text-right text-game-primary"
            >
              <LogIn className="w-5 h-5" />
              <span className="font-display">{t('settings_login')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
