
import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService.ts';
import { AppConfiguration, ConfigCategory } from '../types.ts';
import { ArrowLeft, Plus, Settings, AlertCircle, X, ArrowUp, ArrowDown } from 'lucide-react';

interface AdminPanelProps {
  onBack: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onBack }) => {
  const [config, setConfig] = useState<AppConfiguration | null>(null);
  const [newInputs, setNewInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    setConfig(dataService.getConfig());
  }, []);

  if (!config) return <div>Loading...</div>;

  const handleAddItem = (category: ConfigCategory) => {
    const value = newInputs[category]?.trim();
    if (value) {
      dataService.addConfigOption(category, value);
      setConfig(dataService.getConfig());
      setNewInputs({ ...newInputs, [category]: '' });
    }
  };

  const handleRemoveItem = (category: ConfigCategory, value: string) => {
    if (window.confirm(`Are you sure you want to remove "${value}"?`)) {
      dataService.removeConfigOption(category, value);
      setConfig(dataService.getConfig());
    }
  };

  const handleMoveItem = (category: ConfigCategory, index: number, direction: 'up' | 'down') => {
    if (!config) return;
    const items = [...(config[category] || [])];
    
    if (direction === 'up') {
      if (index === 0) return;
      [items[index - 1], items[index]] = [items[index], items[index - 1]];
    } else {
      if (index === items.length - 1) return;
      [items[index], items[index + 1]] = [items[index + 1], items[index]];
    }
    
    dataService.updateConfig(category, items);
    setConfig(dataService.getConfig());
  };

  const handleInputChange = (category: ConfigCategory, value: string) => {
    setNewInputs({ ...newInputs, [category]: value });
  };

  const handleKeyDown = (e: React.KeyboardEvent, category: ConfigCategory) => {
    if (e.key === 'Enter') {
      handleAddItem(category);
    }
  };

  const categories: { key: ConfigCategory; label: string; description: string }[] = [
    { key: 'versions', label: 'Versions', description: 'Tracking versions for releases. Order matters for inheritance logic (Oldest -> Newest).' },
    { key: 'routineTypes', label: 'Routine Types', description: 'Classifications for routines (e.g., Standard, Regulatory)' },
    { key: 'fundTypes', label: 'Fund Types', description: 'Types of funds applicable to routines' },
    { key: 'regions', label: 'Regions', description: 'Geographic regions for routine applicability' },
    { key: 'capitalStructures', label: 'Capital Structures', description: 'Fund structures (e.g., Open-Ended)' },
    { key: 'dataTypes', label: 'Data Types', description: 'Available types for CDM field mapping' },
    { key: 'reportNames', label: 'Predefined Reports', description: 'Standard report names available in the dropdown' },
    { key: 'helperRoutines', label: 'Helper Routines', description: 'Standard helper routines available for selection' },
  ];

  return (
    <div className="max-w-6xl mx-auto animate-fade-in pb-20">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <ArrowLeft size={24} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Settings className="text-slate-600" /> System Administration
            </h1>
            <p className="text-slate-500 text-sm">
              Manage dropdown values and system configurations.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-8 flex items-start gap-3">
        <AlertCircle className="text-blue-600 shrink-0 mt-0.5" size={20} />
        <div className="text-sm text-blue-800">
          <p className="font-semibold">Configuration Changes</p>
          <p>Modifying these values will immediately affect the dropdown options available in the Add/Edit Routine forms. Deleting a value used by existing routines does not modify those routines, but the value will no longer be selectable for new entries.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categories.map((cat) => (
          <div key={cat.key} className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
            <div className="p-5 border-b border-slate-100 bg-slate-50 rounded-t-xl">
              <h3 className="font-bold text-slate-800">{cat.label}</h3>
              <p className="text-xs text-slate-500">{cat.description}</p>
            </div>
            
            <div className="p-5 flex-1">
              {cat.key === 'versions' ? (
                 /* Vertical List for Versions (Hierarchy) */
                 <div className="flex flex-col gap-2 mb-4">
                    <div className="text-xs text-slate-400 uppercase font-semibold text-center mb-1 border-b border-slate-100 pb-1">Oldest (Base)</div>
                    {(config[cat.key] || []).map((item, idx) => (
                      <div key={item} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded border border-slate-200">
                        <span className="text-sm font-medium text-slate-700 font-mono">{item}</span>
                        <div className="flex items-center gap-1">
                           <button 
                             onClick={() => handleMoveItem(cat.key, idx, 'up')}
                             disabled={idx === 0}
                             className="p-1 text-slate-400 hover:text-blue-600 disabled:opacity-30"
                             title="Move Up (Older)"
                           >
                              <ArrowUp size={16} />
                           </button>
                           <button 
                             onClick={() => handleMoveItem(cat.key, idx, 'down')}
                             disabled={idx === (config[cat.key] || []).length - 1}
                             className="p-1 text-slate-400 hover:text-blue-600 disabled:opacity-30"
                             title="Move Down (Newer)"
                           >
                              <ArrowDown size={16} />
                           </button>
                           <div className="w-px h-4 bg-slate-300 mx-1"></div>
                           <button 
                              onClick={() => handleRemoveItem(cat.key, item)}
                              className="p-1 text-slate-400 hover:text-red-600"
                              title="Remove"
                           >
                              <X size={16} />
                           </button>
                        </div>
                      </div>
                    ))}
                    <div className="text-xs text-slate-400 uppercase font-semibold text-center mt-1 border-t border-slate-100 pt-1">Newest (Latest)</div>
                 </div>
              ) : (
                 /* Tag Cloud for other categories */
                 <div className="flex flex-wrap gap-2 mb-4">
                    {(config[cat.key] || []).map((item) => (
                      <div key={item} className="flex items-center gap-1 bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm border border-slate-200 group hover:bg-slate-50 transition-colors">
                        <span>{item}</span>
                        <button 
                          onClick={() => handleRemoveItem(cat.key, item)}
                          className="w-4 h-4 flex items-center justify-center rounded-full text-slate-400 hover:bg-red-100 hover:text-red-600 transition-colors"
                          title="Remove Item"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                 </div>
              )}
              
              {(!config[cat.key] || config[cat.key].length === 0) && (
                  <span className="text-sm text-slate-400 italic">No options configured.</span>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 rounded-b-xl">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder={`Add ${cat.label.slice(0, -1)}...`}
                  className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={newInputs[cat.key] || ''}
                  onChange={(e) => handleInputChange(cat.key, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, cat.key)}
                />
                <button 
                  onClick={() => handleAddItem(cat.key)}
                  className="bg-white border border-blue-600 text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-md transition-colors"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminPanel;
