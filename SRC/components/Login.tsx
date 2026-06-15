
import React, { useState } from 'react';
import { useAuth } from '../hooks/AuthContext';
import { toast } from 'react-toastify';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(username, password);
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="p-1 border rounded-md text-sm"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="p-1 border rounded-md text-sm"
          />
          <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
            Login
          </button>
        </div>
      </div>
    </form>
  );
};

export default Login;
