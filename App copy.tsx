
import React, { useState, useEffect } from 'react';
import Dashboard from './SRC/components/Dashboard';
import RoutineForm from './SRC/components/RoutineForm';
import RoutineDetails from './SRC/components/RoutineDetails';
import AdditionalDetailsDashboard from './SRC/components/AdditionalDetailsDashboard';
import AdminPanel from './SRC/components/AdminPanel';
import { dataService } from './SRC/services/dataService';

type View = 'dashboard' | 'create' | 'edit' | 'details' | 'additional_details' | 'admin';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedRoutineId, setSelectedRoutineId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

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
    setSelectedRoutineId(id);
    setCurrentView('edit');
  };

  const handleCreate = () => {
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
      {currentView === 'dashboard' && (
        <Dashboard 
          onEdit={handleEdit} 
          onCreate={handleCreate} 
          onViewDetails={handleViewDetails}
          onViewAdditionalDetails={handleViewAdditionalDetails}
        />
      )}
      
      {(currentView === 'create' || currentView === 'edit') && (
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

      {currentView === 'admin' && (
        <AdminPanel 
          onBack={handleViewAdditionalDetails}
        />
      )}
    </div>
  );
};

export default App;
