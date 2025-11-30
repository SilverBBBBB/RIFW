import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  login: (username, password) => Promise<void>;
  logout: () => void;
  register: (username, password) => Promise<void>;
  hasRole: (role: UserRole | UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = sessionStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
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
      const { user: loggedInUser } = await response.json();
      setUser(loggedInUser);
      sessionStorage.setItem('user', JSON.stringify(loggedInUser));
    } else {
      const errorText = await response.text();
      throw new Error(errorText || 'Invalid username or password.');
    }
  };

  const logout = () => {
    setUser({ username: 'Guest', role: 'guest' });
    sessionStorage.removeItem('user');
    // In a real app, you might also want to invalidate the token on the server
  };

  const register = async (username, password) => {
    const response = await fetch('/api/Register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });

    if (response.ok) {
      // After successful registration, automatically log the user in
      await login(username, password);
    } else {
      const errorText = await response.text();
      throw new Error(errorText || 'Registration failed.');
    }
  };

  const hasRole = (roles: UserRole | UserRole[]) => {
    if (!user) return false;
    const userRoles = Array.isArray(roles) ? roles : [roles];
    return userRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, register, hasRole }}>
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