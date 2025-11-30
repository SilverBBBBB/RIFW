
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types';

// A mock database of users. In a real app, this would be in a database.
const mockUsers: User[] = [
  { username: 'Admin', role: 'admin', password: 'Password' },
  { username: 'User', role: 'user', password: 'password' },
];

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
  const [users, setUsers] = useState<User[]>(mockUsers);

  useEffect(() => {
    const storedUser = sessionStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      setUser({ username: 'Guest', role: 'guest' });
    }
  }, []);

  const login = async (username, password) => {
    const foundUser = users.find(
      (u) => u.username.toLowerCase() === username.toLowerCase() && u.password === password
    );

    if (foundUser) {
      const { password, ...userToStore } = foundUser;
      setUser(userToStore);
      sessionStorage.setItem('user', JSON.stringify(userToStore));
    } else {
      throw new Error('Invalid username or password.');
    }
  };

  const logout = () => {
    setUser({ username: 'Guest', role: 'guest' });
    sessionStorage.removeItem('user');
  };

  const register = async (username, password) => {
    if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
      throw new Error('Username already exists.');
    }
    const newUser: User = { username, password, role: 'user' };
    setUsers([...users, newUser]);
    
    // Automatically log in the new user
    const { password: _, ...userToStore } = newUser;
    setUser(userToStore);
    sessionStorage.setItem('user', JSON.stringify(userToStore));
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
