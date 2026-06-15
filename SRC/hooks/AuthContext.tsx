
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types';
import { toast } from 'react-toastify';
import { dataService } from '../services/dataService';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthReady: boolean;
  login: (username, password) => Promise<void>;
  logout: () => void;
  hasRole: (role: UserRole | UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const storedUser = sessionStorage.getItem('user');
    const storedToken = sessionStorage.getItem('token');
    try {
      if (storedUser && storedToken) {
        const parsedUser = JSON.parse(storedUser) as User;
        setUser(parsedUser);
        setToken(storedToken);
        dataService.setAccessToken(storedToken);
      } else {
        setUser({ username: 'Guest', role: 'guest' });
      }
    } catch {
      sessionStorage.clear();
      setUser({ username: 'Guest', role: 'guest' });
    }
    setIsAuthReady(true);
  }, []);

  useEffect(() => {
    const handleExpired = () => {
      toast.error('Your session expired. Please log in again.');
      logout();
    };
    window.addEventListener('auth-expired', handleExpired);
    return () => window.removeEventListener('auth-expired', handleExpired);
  }, []);

  const login = async (username, password) => {
    const response = await fetch('/api/Login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (response.ok) {
      const { user: loggedInUser, token: newToken } = await response.json();
      setUser(loggedInUser);
      setToken(newToken);
      dataService.setAccessToken(newToken);
      sessionStorage.setItem('user', JSON.stringify(loggedInUser));
      sessionStorage.setItem('token', newToken);
    } else {
      const errorText = await response.text();
      toast.error(errorText || 'Invalid username or password.');
    }
  };

  const logout = () => {
    setUser({ username: 'Guest', role: 'guest' });
    setToken(null);
    dataService.setAccessToken(null);
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('token');
  };

  const hasRole = (roles: UserRole | UserRole[]) => {
    if (!user) return false;
    const userRoles = Array.isArray(roles) ? roles : [roles];
    const lowercasedUserRole = user.role.toLowerCase();
    return userRoles.some(role => role.toLowerCase() === lowercasedUserRole);
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthReady, login, logout, hasRole }}>
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
