
import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/AuthContext';
import { Users, Shield, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface FetchedUser {
  Id: number;
  Username: string;
  Role: 'Admin' | 'User';
  IsActive: boolean;
}

const UserManagement: React.FC = () => {
  const { token, user: currentUser } = useAuth();
  const [users, setUsers] = useState<FetchedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'User' as 'User' | 'Admin' });
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    userToUpdate: FetchedUser | null;
    newRole: 'Admin' | 'User' | null;
  }>({ isOpen: false, userToUpdate: null, newRole: null });

  useEffect(() => {
    const fetchUsers = async () => {
      if (!token) {
        setError("Authentication token not found.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const response = await fetch('/api/GetUsers', {
          headers: { 'X-Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || 'Failed to fetch users.');
        }
        const data: FetchedUser[] = await response.json();
        setUsers(data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [token]);

  const handleRoleChange = (userId: number, newRole: 'Admin' | 'User') => {
    const userToUpdate = users.find(u => u.Id === userId);
    if (userToUpdate && userToUpdate.Role !== newRole) {
      setModalState({ isOpen: true, userToUpdate, newRole });
    }
  };

  const handleConfirmUpdate = async () => {
    if (!modalState.userToUpdate || !modalState.newRole || !token) return;

    const { userToUpdate, newRole } = modalState;

    try {
      const response = await fetch('/api/UpdateUserRole', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId: userToUpdate.Id, newRole })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to update role.');
      }

      // Update UI optimistically
      setUsers(users.map(u => u.Id === userToUpdate.Id ? { ...u, Role: newRole } : u));
      
    } catch (e: any) {
      setError(e.message); // Show error to the user
    } finally {
      setModalState({ isOpen: false, userToUpdate: null, newRole: null });
    }
  };

  const handleCancelUpdate = () => {
    setModalState({ isOpen: false, userToUpdate: null, newRole: null });
  };

  const handleCreateUser = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setError(null);
    const response = await fetch('/api/Register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(newUser)
    });
    if (!response.ok) {
      setError(await response.text() || 'Failed to create user.');
      return;
    }
    setNewUser({ username: '', password: '', role: 'User' });
    const usersResponse = await fetch('/api/GetUsers', {
      headers: { 'X-Authorization': `Bearer ${token}` }
    });
    if (usersResponse.ok) setUsers(await usersResponse.json());
  };

  const renderContent = () => {
    if (loading) {
      return <div className="text-center p-8 text-slate-500">Loading users...</div>;
    }
    if (error) {
      return (
        <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-md flex items-center gap-2">
          <AlertTriangle size={20} />
          <span>{error}</span>
        </div>
      );
    }
    return (
      <ul className="divide-y divide-slate-200">
        {users.map((user) => (
          <li key={user.Id} className="p-4 flex justify-between items-center">
            <div>
              <p className="font-semibold text-slate-800">{user.Username}</p>
              <p className="text-sm text-slate-500">ID: {user.Id}</p>
            </div>
            <div className="w-40">
              <select
                value={user.Role}
                onChange={(e) => handleRoleChange(user.Id, e.target.value as 'Admin' | 'User')}
                disabled={user.Id === currentUser?.id}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
              >
                <option value="User">User</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
        <div className="p-5 border-b border-slate-100 bg-slate-50 rounded-t-xl">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Users size={20} /> User Management
          </h3>
          <p className="text-xs text-slate-500">Assign roles to system users.</p>
        </div>
        <div className="p-5">{renderContent()}</div>
        <form onSubmit={handleCreateUser} className="p-5 border-t border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-3">
          <input value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} placeholder="Username" className="border rounded-md px-3 py-2 text-sm" required />
          <input type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} placeholder="Temporary password" className="border rounded-md px-3 py-2 text-sm" required minLength={12} />
          <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value as 'User' | 'Admin' })} className="border rounded-md px-3 py-2 text-sm">
            <option value="User">User</option>
            <option value="Admin">Admin</option>
          </select>
          <button type="submit" className="bg-blue-600 text-white rounded-md px-3 py-2 text-sm hover:bg-blue-700">Create User</button>
        </form>
      </div>

      {/* Confirmation Modal */}
      {modalState.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
                <Shield size={24} className="text-blue-600"/>
                <h2 className="text-xl font-bold text-slate-800">Confirm Role Change</h2>
            </div>
            <p className="text-slate-600 mb-6">
              Are you sure you want to change the role of 
              <strong className="mx-1">{modalState.userToUpdate?.Username}</strong> 
              to <strong className="mx-1">{modalState.newRole}</strong>?
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={handleCancelUpdate}
                className="px-4 py-2 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors flex items-center gap-2"
              >
                <XCircle size={16} /> Cancel
              </button>
              <button
                onClick={handleConfirmUpdate}
                className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <CheckCircle size={16} /> Confirm Change
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UserManagement;
