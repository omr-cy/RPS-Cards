import { Capacitor } from '@capacitor/core';

/**
 * Enhanced platform detection helper.
 * Combines Capacitor's native check with screen size heuristics to handle 
 * development environments (like Android Studio Live Reload) where native 
 * detection might be temporarily unavailable or returns false.
 */
export const isMobilePlatform = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Return true ONLY if Capacitor confirms native platform.
  return Capacitor.isNativePlatform();
};
