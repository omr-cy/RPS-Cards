import React, { createContext, useContext, useState, useEffect } from 'react';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { useDebug } from './DebugContext';
import config from '../config.json';
import { isMobilePlatform } from '../lib/platform';

interface UserProfile {
  _id: string;
  email: string;
  displayName: string;
  coins: number;
  xp: number;
  level: number;
  purchasedThemes: string[];
  equippedTheme: string;
  isVerified: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  verifyCode: (email: string, code: string) => Promise<void>;
  resendCode: (email: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  error: string | null;
  pendingVerificationEmail: string | null;
  setPendingVerificationEmail: (email: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);
  const { addLog } = useDebug();

  // URL Logic: Check for VITE_API_URL or VITE_BACKEND_URL
  const getBaseApiUrl = () => {
    const vApi = import.meta.env.VITE_API_URL;
    const vBack = import.meta.env.VITE_BACKEND_URL;
    const sConfig = config.ONLINE_API_BASE_URL;

    // Priority 1: Direct API URL
    if (vApi) return vApi;
    
    // Priority 2: Derived from Backend WebSocket URL (replacing wss/ws with https/http)
    if (vBack) {
      return vBack.replace(/^ws(s)?:\/\//, 'http$1://').replace(/\/game-socket$/, '').replace(/\/$/, '');
    }

    // Use config from json as primary source for external backend
    if (sConfig && !sConfig.includes('localhost') && !sConfig.includes('127.0.0.1')) return sConfig;

    // Last Resort Fallback
    return typeof window !== 'undefined' && !window.location.origin.includes('localhost')
      ? window.location.origin 
      : 'https://ais-dev-qphhy77swp7b53a3dwhodi-306494194593.europe-west1.run.app';
  };

  const API_BASE_URL = getBaseApiUrl();

  // Helper function to force ALL api requests through the NATIVE Android layer when running natively
  const nativeFetch = async (url: string, options: any = {}) => {
    addLog(`[API Request] ${options.method || 'GET'} ${url}`, 'info');
    if (isMobilePlatform()) {
      try {
        const method = options.method || 'GET';
        const response = await CapacitorHttp.request({
          url,
          method,
          headers: options.headers || {},
          data: (options.body && typeof options.body === 'string') ? JSON.parse(options.body) : options.body,
        });
        
        if (response.status >= 200 && response.status < 300) {
          addLog(`[API Success] ${url}`, 'success');
        } else {
          addLog(`[API Error ${response.status}] ${url} - ${JSON.stringify(response.data)}`, 'error');
        }

        return {
          ok: response.status >= 200 && response.status < 300,
          status: response.status,
          json: async () => response.data,
        };
      } catch (err: any) {
        addLog(`[Native API Fail] ${err.message}`, 'error');
        throw err;
      }
    } else {
      try {
        const res = await fetch(url, options);
        if (res.ok) {
          addLog(`[API Success] ${url}`, 'success');
        } else {
          addLog(`[API Error ${res.status}] ${url}`, 'error');
        }
        return res;
      } catch (err: any) {
        addLog(`[Web API Fail] ${err.message}`, 'error');
        throw err;
      }
    }
  };

  useEffect(() => {
    addLog(`Auth Init. Base API URL: ${API_BASE_URL}`, 'info');
    addLog(`ENV Detection - VITE_API_URL: ${import.meta.env.VITE_API_URL ? 'FOUND' : 'MISSING'}`, 'info');
    addLog(`ENV Detection - VITE_BACKEND_URL: ${import.meta.env.VITE_BACKEND_URL ? 'FOUND' : 'MISSING'}`, 'info');
    addLog(`Config Detection - ONLINE_API_BASE_URL: ${config.ONLINE_API_BASE_URL ? 'FOUND' : 'MISSING'}`, 'info');
    
    // Try to load cached user immediately for offline support
    const cachedUser = localStorage.getItem('rpscards_userProfile');
    if (cachedUser) {
      try {
        const parsedUser = JSON.parse(cachedUser);
        setUser(parsedUser);
        addLog('Loaded cached user profile for offline support', 'success');
      } catch (e) {
        console.error('Failed to parse cached user profile:', e);
      }
    }

    const storedUserId = localStorage.getItem('rpscards_userId');
    if (storedUserId) {
      fetchProfile(storedUserId);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const response = await nativeFetch(`${API_BASE_URL}/api/profile/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setUser(data);
        localStorage.setItem('rpscards_userProfile', JSON.stringify(data));
      } else {
        if (response.status === 401 || response.status === 404) {
          localStorage.removeItem('rpscards_userId');
          localStorage.removeItem('rpscards_userProfile');
          setUser(null);
        } else {
          console.error('Server error on fetch profile, not deleting token. Status:', response.status);
        }
      }
    } catch (err) {
      console.error('Failed to fetch profile (Network error, etc.):', err);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      const response = await nativeFetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (response.ok) {
        setUser(data);
        localStorage.setItem('rpscards_userId', data._id);
        localStorage.setItem('rpscards_userProfile', JSON.stringify(data));
        setPendingVerificationEmail(null);
      } else {
        if (response.status === 403) {
          setPendingVerificationEmail(email);
        }
        throw new Error(data.error || 'فشل تسجيل الدخول');
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const register = async (email: string, password: string, displayName: string) => {
    setError(null);
    try {
      const response = await nativeFetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'فشل إنشاء الحساب');
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const resendCode = async (email: string) => {
    setError(null);
    try {
      const response = await nativeFetch(`${API_BASE_URL}/api/auth/resend-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'فشل إعادة إرسال الكود');
      }
      return data.message;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const verifyCode = async (email: string, code: string) => {
    setError(null);
    try {
      const response = await nativeFetch(`${API_BASE_URL}/api/auth/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'كود التأكيد غير صحيح');
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('rpscards_userId');
    localStorage.removeItem('rpscards_userProfile');
  };

  const refreshProfile = async () => {
    if (user?._id) {
      await fetchProfile(user._id);
    }
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    try {
      const response = await nativeFetch(`${API_BASE_URL}/api/profile/${user._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUser(updatedUser);
        localStorage.setItem('rpscards_userProfile', JSON.stringify(updatedUser));
      }
    } catch (err) {
      console.error('Failed to update profile:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, verifyCode, resendCode, logout, updateProfile, refreshProfile, error, pendingVerificationEmail, setPendingVerificationEmail }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
