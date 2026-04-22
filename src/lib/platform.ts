import { Capacitor } from '@capacitor/core';

/**
 * Enhanced platform detection helper.
 * Combines Capacitor's native check with screen size heuristics to handle 
 * development environments (like Android Studio Live Reload) where native 
 * detection might be temporarily unavailable or returns false.
 */
export const isMobilePlatform = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // 1. Primary check: Capacitor's official native detection
  const isNative = Capacitor.isNativePlatform();
  if (isNative) return true;

  // 2. Secondary check: User Agent detection (for debugging)
  const ua = navigator.userAgent.toLowerCase();
  const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
  
  // If we are in a web browser environment (AI Studio or Shared URL or Localhost),
  // we must use Web services despite the user agent, because native plugins won't work.
  const isWebPreview = window.location.hostname.includes('run.app') || 
                       window.location.hostname.includes('googleusercontent.com') ||
                       window.location.hostname.includes('localhost');
  
  if (isWebPreview) return false;
  
  return isMobileUA;
};
