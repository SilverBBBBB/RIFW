
import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import RoutineForm from './components/RoutineForm';
import RoutineDetails from './components/RoutineDetails';
import AdditionalDetailsDashboard from './components/AdditionalDetailsDashboard';
import AdminPanel from './components/AdminPanel';
import Header from './components/Header';
import { dataService } from './services/dataService';
import { AuthProvider, useAuth } from './hooks/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

type View = 'dashboard' | 'create' | 'edit' | 'details' | 'additional_details' | 'admin';

const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedRoutineId, setSelectedRoutineId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { hasRole } = useAuth();

  const initializeData = async () => {
    setIsLoading(true);
    setLoadError(null);
    dataService.reset(); // Reset to allow retry
    try {
      await dataService.initialize();
      setLoadError(null);
    } catch (e: any) {
      setLoadError(e.message || 'Failed to connect to database');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initializeData();
  }, []);

  const navigateToDashboard = () => {
    setCurrentView('dashboard');
    setSelectedRoutineId(undefined);
  };

  const handleEdit = (id: string) => {
    if (!hasRole(['admin', 'user'])) return;
    setSelectedRoutineId(id);
    setCurrentView('edit');
  };

  const handleCreate = () => {
    if (!hasRole(['admin', 'user'])) return;
    setSelectedRoutineId(undefined);
    setCurrentView('create');
  };

  const handleViewDetails = (id: string) => {
    setSelectedRoutineId(id);
    setCurrentView('details');
  };

  const handleViewAdditionalDetails = () => {
    setCurrentView('additional_details');
  };

  const handleOpenAdmin = () => {
    if (!hasRole('admin')) return;
    setCurrentView('admin');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 font-medium">Loading Routine Info for Workflow...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Connection Error</h2>
          <p className="text-slate-600 mb-6">{loadError}</p>
          <button
            onClick={initializeData}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <Header />
      {currentView === 'dashboard' && (
        <Dashboard
          onEdit={handleEdit}
          onCreate={handleCreate}
          onViewDetails={handleViewDetails}
          onViewAdditionalDetails={handleViewAdditionalDetails}
        />
      )}

      {(currentView === 'create' || currentView === 'edit') && hasRole(['admin', 'user']) && (
        <RoutineForm
          mode={currentView === 'create' ? 'create' : 'edit'}
          routineId={selectedRoutineId}
          onCancel={navigateToDashboard}
          onSave={(username: string) => navigateToDashboard()}
        />
      )}

      {currentView === 'details' && selectedRoutineId && (
        <RoutineDetails
          routineId={selectedRoutineId}
          onBack={navigateToDashboard}
        />
      )}

      {currentView === 'additional_details' && (
        <AdditionalDetailsDashboard
          onBack={navigateToDashboard}
          onOpenAdmin={handleOpenAdmin}
        />
      )}

      {currentView === 'admin' && hasRole('admin') && (
        <AdminPanel
          onBack={handleViewAdditionalDetails}
        />
      )}
    </div>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <AppContent />
    <ToastContainer aria-label="toast-container" />
  </AuthProvider>
);

export default App;
