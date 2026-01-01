
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types';
import { toast } from 'react-toastify';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username, password) => Promise<void>;
  logout: () => void;
  register: (username, password) => Promise<void>;
  hasRole: (role: UserRole | UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = sessionStorage.getItem('user');
    const storedToken = sessionStorage.getItem('token');
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setToken(storedToken);
    } else if (import.meta.env.DEV) {
      // Auto-login as admin in development mode
      const devAdmin: User = { username: 'DevAdmin', role: 'admin' };
      setUser(devAdmin);
      setToken('dev-token');
      sessionStorage.setItem('user', JSON.stringify(devAdmin));
      sessionStorage.setItem('token', 'dev-token');
    } else {
      setUser({ username: 'Guest', role: 'guest' });
    }
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
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('token');
  };

  const register = async (username, password) => {
    const response = await fetch('/api/Register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (response.ok) {
      toast.success('User registered successfully! Please log in.');
    } else {
      const errorText = await response.text();
      toast.error(errorText || 'Registration failed.');
    }
  };

  const hasRole = (roles: UserRole | UserRole[]) => {
    if (!user) return false;
    const userRoles = Array.isArray(roles) ? roles : [roles];
    const lowercasedUserRole = user.role.toLowerCase();
    return userRoles.some(role => role.toLowerCase() === lowercasedUserRole);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, register, hasRole }}>
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
