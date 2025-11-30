
import React, { useState } from 'react';
import { useAuth } from '../hooks/AuthContext';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(username, password);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRegister = async () => {
    setError('');
    if (!username || !password) {
      setError('Username and password are required to register.');
      return;
    }
    try {
      await register(username, password);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <div className="flex flex-col">
        {error && <p className="text-red-500 text-xs absolute -top-5">{error}</p>}
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
          <button 
              type="button"
              onClick={handleRegister}
              className="px-3 py-1 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 text-sm"
            >
              Register
            </button>
        </div>
      </div>
    </form>
  );
};

export default Login;
