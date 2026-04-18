import React, { createContext, useContext, useEffect, useState } from 'react';
import config from '../config.json';

export interface UserProfile {
  uid: string;
  displayName?: string;
  coins: number;
  purchasedThemes: string[];
  equippedTheme: string;
}

interface AuthContextType {
  user: { uid: string, photoURL?: string, email?: string, isGuest?: boolean } | null;
  profile: UserProfile | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  mergeAccounts: (guestUid: string, targetUid: string) => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<{ uid: string, photoURL?: string, email?: string, isGuest?: boolean } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (uid: string) => {
    try {
      const apiBase = config.ONLINE_API_BASE_URL;
      const res = await fetch(`${apiBase}/api/profile/${uid}`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        return data;
      }
    } catch (e) {
      console.error('Failed to fetch profile:', e);
    }
    return null;
  };

  useEffect(() => {
    const initAuth = async () => {
      let deviceId = localStorage.getItem('cardClashDeviceId');
      let googleUser = localStorage.getItem('cardClashGoogleUser');

      if (googleUser) {
        const parsed = JSON.parse(googleUser);
        setUser(parsed);
        await fetchProfile(parsed.uid);
      } else {
        if (!deviceId) {
          deviceId = 'guest_' + Math.random().toString(36).substring(2, 15);
          localStorage.setItem('cardClashDeviceId', deviceId);
        }
        setUser({ uid: deviceId, isGuest: true });
        await fetchProfile(deviceId);
      }
      setLoading(false);
    };

    initAuth();

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data.user) {
        const loggedUser = {
          uid: event.data.user.uid,
          email: event.data.user.email,
          displayName: event.data.user.displayName,
          isGuest: false
        };
        localStorage.setItem('cardClashGoogleUser', JSON.stringify(loggedUser));
        setUser(loggedUser);
        setProfile(event.data.user);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const login = async () => {
    const popup = window.open('about:blank', 'Google Login', 'width=500,height=600');
    try {
      const apiBase = config.ONLINE_API_BASE_URL;
      const res = await fetch(`${apiBase}/api/auth/google/url`);
      const { url } = await res.json();
      if (popup) {
        popup.location.href = url;
      } else {
        window.location.href = url; // Fallback
      }
    } catch (e) {
      if (popup) popup.close();
      console.error('Login failed:', e);
    }
  };

  const logout = async () => {
    localStorage.removeItem('cardClashGoogleUser');
    const deviceId = localStorage.getItem('cardClashDeviceId') || 'guest_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('cardClashDeviceId', deviceId);
    setUser({ uid: deviceId, isGuest: true });
    await fetchProfile(deviceId);
  };

  const mergeAccounts = async (guestUid: string, targetUid: string) => {
    try {
      const apiBase = config.ONLINE_API_BASE_URL;
      const res = await fetch(`${apiBase}/api/profile/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestUid, targetUid })
      });
      if (res.ok) {
        const mergedProfile = await res.json();
        setProfile(mergedProfile);
        // Clear guest ID since it's merged
        localStorage.removeItem('cardClashDeviceId');
      }
    } catch (e) {
      console.error('Merge failed:', e);
    }
  };

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    setProfile(prev => prev ? { ...prev, ...data } : null);
    try {
        const apiBase = config.ONLINE_API_BASE_URL;
        await fetch(`${apiBase}/api/profile/${user.uid}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        }).catch(() => {});
    } catch (e) {
        // Silent failure if offline
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, logout, updateUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
