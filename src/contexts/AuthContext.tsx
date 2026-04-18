import React, { createContext, useContext, useEffect, useState } from 'react';

export interface UserProfile {
  uid: string;
  displayName: string;
  coins: number;
  purchasedThemes: string[];
  equippedTheme: string;
}

interface AuthContextType {
  user: { uid: string, displayName: string } | null;
  profile: UserProfile | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<{ uid: string, displayName: string } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Generate simple guest identity
    const deviceId = 'user_' + Math.random().toString(36).substring(2, 15);
    const guestName = 'Guest_' + Math.floor(1000 + Math.random() * 9000);
    
    setUser({ uid: deviceId, displayName: guestName });
    
    // Set default local-only profile
    setProfile({
        uid: deviceId,
        displayName: guestName,
        coins: 100,
        purchasedThemes: ['normal'],
        equippedTheme: 'normal'
    });
    setLoading(false);
  }, []);

  const login = async () => {};
  const logout = async () => {};

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    setProfile(prev => prev ? { ...prev, ...data } : null);
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
