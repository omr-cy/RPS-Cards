import React, { createContext, useContext, useEffect, useState } from 'react';

export interface UserProfile {
  uid: string;
  displayName?: string;
  coins: number;
  purchasedThemes: string[];
  equippedTheme: string;
}

interface AuthContextType {
  user: { uid: string, photoURL?: string } | null;
  profile: UserProfile | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<{ uid: string, photoURL?: string } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      let deviceId = localStorage.getItem('cardClashDeviceId');
      if (!deviceId) {
        deviceId = 'user_' + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('cardClashDeviceId', deviceId);
      }
      
      setUser({ uid: deviceId });

      try {
        const apiBase = window.location.protocol + '//' + window.location.host;
        const res = await fetch(`${apiBase}/api/profile/${deviceId}`);
        if (res.ok) {
          const data = await res.json();
          
          // Merge local legacy data if any
          let shouldUpdate = false;
          let mergedData = { ...data };
          
          const localCoins = localStorage.getItem('cardClashCoins');
          if (localCoins && parseInt(localCoins) > data.coins) {
             mergedData.coins = parseInt(localCoins);
             shouldUpdate = true;
          }
          
          const localThemes = localStorage.getItem('cardClashOwnedThemes');
          if (localThemes) {
             const parsed = JSON.parse(localThemes);
             if (parsed.length > data.purchasedThemes.length) {
                mergedData.purchasedThemes = Array.from(new Set([...data.purchasedThemes, ...parsed]));
                shouldUpdate = true;
             }
          }
          
          setProfile(mergedData);
          
          if (shouldUpdate) {
             await fetch(`${apiBase}/api/profile/${deviceId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(mergedData)
             });
          }

        }
      } catch (e) {
        console.error('Failed to load profile', e);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async () => {};
  const logout = async () => {};

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    setProfile(prev => prev ? { ...prev, ...data } : null);
    try {
        const apiBase = window.location.protocol + '//' + window.location.host;
        await fetch(`${apiBase}/api/profile/${user.uid}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
    } catch (e) {
        console.error('Update profile failed', e);
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
