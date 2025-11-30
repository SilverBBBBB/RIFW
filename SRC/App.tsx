
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
  const { hasRole } = useAuth();

  useEffect(() => {
    const init = async () => {
      await dataService.initialize();
      setIsLoading(false);
    };
    init();
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
          <p className="text-slate-500 font-medium">Loading Routine Workflow...</p>
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
          onSave={navigateToDashboard}
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
