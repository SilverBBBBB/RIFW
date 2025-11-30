
import React from 'react';
import { useAuth } from '../hooks/AuthContext';

const UserProfile: React.FC = () => {
  const { user, logout } = useAuth();

  if (!user || user.role === 'guest') {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-slate-700 font-medium">Welcome, {user.username}</span>
      <button 
        onClick={logout} 
        className="px-3 py-1 bg-slate-600 text-white rounded-md hover:bg-slate-700 text-sm"
      >
        Logout
      </button>
    </div>
  );
};

export default UserProfile;
