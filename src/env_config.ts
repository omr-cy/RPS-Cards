import { Capacitor } from '@capacitor/core';
import config from './config.json';

export const getApiUrl = () => {
  // If we are on Android/iOS (Native), ALWAYS use the config URL directly
  if (Capacitor.isNativePlatform()) {
    return config.ONLINE_API_BASE_URL;
  }

  // If we are in the AI Studio environment (Web Dev), use the proxy
  if (typeof window !== 'undefined' && window.location.hostname.includes('run.app')) {
    return '/remote-api';
  }

  // Otherwise (Normal Web build), use config or fallback
  return config.ONLINE_API_BASE_URL || window.location.origin;
};

export const getSocketUrl = () => {
  // If we are on Android/iOS (Native), ALWAYS use the config URL directly
  if (Capacitor.isNativePlatform()) {
    return config.ONLINE_SERVER_URL;
  }

  // If we are in the AI Studio environment (Web Dev), use the proxy
  if (typeof window !== 'undefined' && window.location.hostname.includes('run.app')) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/game-socket-proxy`;
  }

  // Otherwise (Normal Web build), use config
  return config.ONLINE_SERVER_URL;
};
