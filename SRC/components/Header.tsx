
import React from 'react';
import { useAuth } from '../hooks/AuthContext';
import Login from './Login';
import UserProfile from './UserProfile';

const Header: React.FC = () => {
  const { user } = useAuth();

  return (
    <header className="flex justify-between items-center p-4 mb-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-slate-800">Routine Info for Workflow</h1>
      <div>
        {user && user.role !== 'guest' ? <UserProfile /> : <Login />}
      </div>
    </header>
  );
};

export default Header;
