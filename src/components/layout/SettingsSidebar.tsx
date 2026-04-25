import React, { memo } from 'react';
import { X, User, Gift, LogOut, LogIn } from 'lucide-react';

export const SettingsSidebar = memo(({ isOpen, onClose, onNavigateToProfile, onNavigateToGift, user, onLoginClick, onLogout }: any) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-start" dir="rtl">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Sidebar Panel */}
      <div className="relative w-72 h-full bg-game-dark border-l border-white/10 shadow-2xl flex flex-col p-6 overflow-y-auto transform-none transition-none">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-display text-white">الإعدادات</h2>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-white/50 hover:bg-white/10 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <button 
            onClick={onNavigateToProfile}
            className="flex items-center gap-3 p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors text-right"
          >
            <User className="w-5 h-5 text-game-teal" />
            <span className="font-display text-game-offwhite">الملف الشخصي</span>
          </button>

          <button 
            onClick={onNavigateToGift}
            className="flex items-center gap-3 p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors text-right"
          >
            <Gift className="w-5 h-5 text-yellow-500" />
            <span className="font-display text-game-offwhite">الإعلانات والمكافآت</span>
          </button>

          <div className="h-px bg-white/10 my-2" />

          {user ? (
            <button 
              onClick={onLogout}
              className="flex items-center gap-3 p-4 bg-red-500/10 rounded-xl hover:bg-red-500/20 transition-colors text-right text-red-400"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-display">تسجيل الخروج</span>
            </button>
          ) : (
            <button 
              onClick={onLoginClick}
              className="flex items-center gap-3 p-4 bg-game-teal/10 rounded-xl hover:bg-game-teal/20 transition-colors text-right text-game-teal"
            >
              <LogIn className="w-5 h-5" />
              <span className="font-display">تسجيل الدخول</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
