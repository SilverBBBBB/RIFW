
import React, { useState, useEffect, useMemo } from 'react';
import { SheetDetail, Routine } from '../types.ts';
import { dataService } from '../services/dataService.ts';
import { ArrowLeft, Filter, Table, Search, X, ArrowDown, ArrowUp, Plus, Save, FileText, Settings } from 'lucide-react';
import { useAuth } from '../hooks/AuthContext';

interface AdditionalDetailsDashboardProps {
  onBack: () => void;
  onOpenAdmin: () => void;
}

type SortDirection = 'asc' | 'desc';
interface SortConfig {
  key: string;
  direction: SortDirection;
}

interface RdeOption extends SheetDetail {
  sheetName: string;
}

const AdditionalDetailsDashboard: React.FC<AdditionalDetailsDashboardProps> = ({ onBack, onOpenAdmin }) => {
  const [filters, setFilters] = useState({ version: '', startDate: '', endDate: '' });
  const [details, setDetails] = useState<(SheetDetail & { sheet_name: string, routine_name: string })[]>([]);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [openHeaderKey, setOpenHeaderKey] = useState<string | null>(null);

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [availableRdes, setAvailableRdes] = useState<RdeOption[]>([]);
  const [formData, setFormData] = useState<{
    routineId: string;
    rdeId: string;
    document_type: string;
    verification_rde_name: string;
    verification_required_status: string;
    field_description: string;
    verification_data_type: string;
    old_model_name: string;
    old_model_mapping: string;
    new_model_name: string;
    table_name: string;
    new_model_mapping: string;
  }>({
    routineId: '',
    rdeId: '',
    document_type: '',
    verification_rde_name: '',
    verification_required_status: 'Required',
    field_description: '',
    verification_data_type: '',
    old_model_name: '',
    old_model_mapping: '',
    new_model_name: '',
    table_name: '',
    new_model_mapping: ''
  });
  const { hasRole, user } = useAuth();

  useEffect(() => {
    console.log('User in AdditionalDetailsDashboard:', user);
  }, [user]);

  const loadData = () => {
    const data = dataService.getSheetDetailsView(filters);
    setDetails(data);
  };

  useEffect(() => {
    loadData();
    // Also load routines for the form
    setRoutines(dataService.getRoutines({ version: '', startDate: '', endDate: '' }));
  }, [filters]);

  // Form Logic: Load RDEs when routine changes
  useEffect(() => {
    if (formData.routineId) {
      const sheets = dataService.getOutputSheetsByRoutineId(formData.routineId);
      const rdes: RdeOption[] = [];
      sheets.forEach(sheet => {
        const sheetDetailsList = dataService.getSheetDetailsBySheetId(sheet.id);
        sheetDetailsList.forEach(d => {
          rdes.push({ ...d, sheetName: sheet.sheet_name });
        });
      });
      setAvailableRdes(rdes);
    } else {
      setAvailableRdes([]);
    }
  }, [formData.routineId]);

  // Form Logic: Pre-fill when RDE is selected
  useEffect(() => {
    if (formData.rdeId) {
      const selected = availableRdes.find(r => r.id === formData.rdeId);
      if (selected) {
        setFormData(prev => ({
          ...prev,
          document_type: selected.document_type || '',
          verification_rde_name: selected.verification_rde_name || '',
          verification_required_status: selected.verification_required_status || 'Required',
          field_description: selected.field_description || '',
          verification_data_type: selected.verification_data_type || '',
          old_model_name: selected.old_model_name || '',
          old_model_mapping: selected.old_model_mapping || '',
          new_model_name: selected.new_model_name || '',
          table_name: selected.table_name || '',
          new_model_mapping: selected.new_model_mapping || ''
        }));
      }
    }
  }, [formData.rdeId, availableRdes]);

  const handleSaveForm = () => {
    if (!formData.rdeId) {
      alert("Please select a routine and an RDE.");
      return;
    }

    dataService.updateSheetDetail(formData.rdeId, {
      document_type: formData.document_type,
      verification_rde_name: formData.verification_rde_name,
      verification_required_status: formData.verification_required_status,
      field_description: formData.field_description,
      verification_data_type: formData.verification_data_type,
      old_model_name: formData.old_model_name,
      old_model_mapping: formData.old_model_mapping,
      new_model_name: formData.new_model_name,
      table_name: formData.table_name,
      new_model_mapping: formData.new_model_mapping
    }, user.username);

    setIsFormOpen(false);
    setFormData({
      routineId: '',
      rdeId: '',
      document_type: '',
      verification_rde_name: '',
      verification_required_status: 'Required',
      field_description: '',
      verification_data_type: '',
      old_model_name: '',
      old_model_mapping: '',
      new_model_name: '',
      table_name: '',
      new_model_mapping: ''
    });
    loadData();
  };

  // --- Filter & Sort Logic ---
  const filterValueMatches = (itemValue: any, filterText: string): boolean => {
    if (!filterText) return true;
    if (itemValue === null || itemValue === undefined) return false;
    return String(itemValue).toLowerCase().includes(filterText.toLowerCase());
  };

  const getSortableValue = (item: any, key: string): string | number => {
    const val = item[key];
    if (typeof val === 'string') return val.toLowerCase();
    if (val === null || val === undefined) return '';
    return val;
  };

  const processedData = useMemo(() => {
    const filtered = details.filter(d => {
      return (
        filterValueMatches(d.document_type, columnFilters['document_type']) &&
        filterValueMatches(d.verification_rde_name, columnFilters['verification_rde_name']) &&
        filterValueMatches(d.verification_required_status, columnFilters['verification_required_status']) &&
        filterValueMatches(d.field_description, columnFilters['field_description']) &&
        filterValueMatches(d.verification_data_type, columnFilters['verification_data_type']) &&
        filterValueMatches(d.old_model_name, columnFilters['old_model_name']) &&
        filterValueMatches(d.old_model_mapping, columnFilters['old_model_mapping']) &&
        filterValueMatches(d.new_model_name, columnFilters['new_model_name']) &&
        filterValueMatches(d.table_name, columnFilters['table_name']) &&
        filterValueMatches(d.new_model_mapping, columnFilters['new_model_mapping']) &&
        filterValueMatches(d.field_name, columnFilters['field_name']) &&
        filterValueMatches(d.routine_name, columnFilters['routine_name'])
      );
    });

    if (!sortConfig) return filtered;

    return [...filtered].sort((a, b) => {
      const aVal = getSortableValue(a, sortConfig.key);
      const bVal = getSortableValue(b, sortConfig.key);
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [details, columnFilters, sortConfig]);

  const handleSort = (key: string, direction: SortDirection) => {
    setSortConfig({ key, direction });
    setOpenHeaderKey(null);
  };

  const clearColumnFilter = (key: string) => {
    const next = { ...columnFilters };
    delete next[key];
    setColumnFilters(next);
  };

  const ColumnHeader = ({ label, columnKey, minWidth }: { label: string, columnKey: string, minWidth?: string }) => {
    const isOpen = openHeaderKey === columnKey;
    const isFiltered = !!columnFilters[columnKey];
    const isSorted = sortConfig?.key === columnKey;
    const sortDirection = isSorted ? sortConfig.direction : null;

    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (isOpen) {
          const target = e.target as HTMLElement;
          if (!target.closest(`[data-header-key="${columnKey}"]`)) {
            setOpenHeaderKey(null);
          }
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, columnKey]);

    return (
      <th
        className="p-0 border-b border-r border-slate-300 bg-slate-100 relative select-none group"
        style={{ minWidth: minWidth || 'auto' }}
        data-header-key={columnKey}
      >
        <div className="flex flex-col">
          <div className="flex items-center justify-between p-3 h-full hover:bg-slate-200 transition-colors">
            <span className="text-xs font-bold text-slate-700 uppercase truncate pr-2">{label}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenHeaderKey(isOpen ? null : columnKey);
              }}
              className={`p-1 rounded hover:bg-slate-300 transition-colors flex-shrink-0 ${isFiltered || isSorted ? 'bg-slate-300 text-blue-600' : 'text-slate-400 opacity-0 group-hover:opacity-100'}`}
            >
              {isFiltered ? <Filter size={14} fill="currentColor" /> : <ArrowDown size={14} />}
            </button>
          </div>

          {isOpen && (
            <div className="absolute top-full right-0 mt-0.5 w-64 bg-white rounded shadow-xl border border-slate-200 z-50 text-left font-normal normal-case">
              <div className="p-1 flex flex-col gap-1">
                <button
                  onClick={() => handleSort(columnKey, 'asc')}
                  className={`flex items-center gap-3 px-3 py-2 text-sm hover:bg-blue-50 rounded text-slate-700 ${sortDirection === 'asc' ? 'bg-blue-50 font-medium text-blue-700' : ''}`}
                >
                  <ArrowUp size={16} className="text-slate-400" /> Sort Ascending
                </button>
                <button
                  onClick={() => handleSort(columnKey, 'desc')}
                  className={`flex items-center gap-3 px-3 py-2 text-sm hover:bg-blue-50 rounded text-slate-700 ${sortDirection === 'desc' ? 'bg-blue-50 font-medium text-blue-700' : ''}`}
                >
                  <ArrowDown size={16} className="text-slate-400" /> Sort Descending
                </button>
              </div>
              <div className="border-t border-slate-100 my-1"></div>
              <div className="p-3">
                <div className="text-xs font-semibold text-slate-500 mb-2">Filter</div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search..."
                    className="w-full border border-slate-300 rounded px-3 py-1.5 pl-8 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={columnFilters[columnKey] || ''}
                    onChange={(e) => setColumnFilters({ ...columnFilters, [columnKey]: e.target.value })}
                    autoFocus
                  />
                  <Search size={14} className="absolute left-2.5 top-2 text-slate-400" />
                  {columnFilters[columnKey] && (
                    <button
                      onClick={() => clearColumnFilter(columnKey)}
                      className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
              {(isFiltered || isSorted) && (
                <>
                  <div className="border-t border-slate-100 my-1"></div>
                  <div className="p-1">
                    <button
                      onClick={() => {
                        clearColumnFilter(columnKey);
                        if (sortConfig?.key === columnKey) setSortConfig(null);
                        setOpenHeaderKey(null);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded"
                    >
                      Clear Filter & Sort
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        {(isFiltered || isSorted) && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"></div>
        )}
      </th>
    );
  };

  return (
    <div className="max-w-[1400px] mx-auto animate-slide-up pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <ArrowLeft size={24} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Additional Details Dashboard</h1>
            <p className="text-slate-500 text-sm">Manage Verification Station requirements and model mappings.</p>
          </div>
        </div>

        <div className="flex gap-3">
          {hasRole('admin') && (
            <button
              onClick={onOpenAdmin}
              className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
            >
              <Settings size={18} /> System Admin
            </button>
          )}
          {hasRole(['admin', 'user']) && (
            <button
              onClick={() => setIsFormOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
            >
              <Plus size={18} /> Add / Edit Details
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        <div className="overflow-x-auto min-h-[500px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <ColumnHeader label="Routine" columnKey="routine_name" minWidth="200px" />
                <ColumnHeader label="RDE Name" columnKey="field_name" minWidth="200px" />
                <ColumnHeader label="Doc Type" columnKey="document_type" minWidth="150px" />
                <ColumnHeader label="Verify Name" columnKey="verification_rde_name" minWidth="150px" />
                <ColumnHeader label="Status" columnKey="verification_required_status" minWidth="100px" />
                <ColumnHeader label="Description" columnKey="field_description" minWidth="250px" />
                <ColumnHeader label="Verify Type" columnKey="verification_data_type" minWidth="120px" />
                <ColumnHeader label="Old Model" columnKey="old_model_name" minWidth="150px" />
                <ColumnHeader label="Old Mapping" columnKey="old_model_mapping" minWidth="150px" />
                <ColumnHeader label="New Model" columnKey="new_model_name" minWidth="150px" />
                <ColumnHeader label="Table" columnKey="table_name" minWidth="150px" />
                <ColumnHeader label="New Mapping" columnKey="new_model_mapping" minWidth="150px" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {processedData.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="p-3 text-sm text-slate-600 font-medium">{row.routine_name}</td>
                  <td className="p-3 text-sm text-slate-800">{row.field_name}</td>
                  <td className="p-3 text-sm text-slate-600">{row.document_type}</td>
                  <td className="p-3 text-sm text-slate-600">{row.verification_rde_name}</td>
                  <td className="p-3 text-sm">
                    {row.verification_required_status === 'Required'
                      ? <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded border border-red-100">Required</span>
                      : (row.verification_required_status ? <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded border border-yellow-100">Secondary</span> : '')
                    }
                  </td>
                  <td className="p-3 text-sm text-slate-500 truncate max-w-xs" title={row.field_description}>{row.field_description}</td>
                  <td className="p-3 text-sm text-slate-600">{row.verification_data_type}</td>
                  <td className="p-3 text-sm text-slate-500 font-mono text-xs">{row.old_model_name}</td>
                  <td className="p-3 text-sm text-slate-500 font-mono text-xs">{row.old_model_mapping}</td>
                  <td className="p-3 text-sm text-blue-600 font-mono text-xs">{row.new_model_name}</td>
                  <td className="p-3 text-sm text-blue-600 font-mono text-xs">{row.table_name}</td>
                  <td className="p-3 text-sm text-blue-600 font-mono text-xs">{row.new_model_mapping}</td>
                </tr>
              ))}
              {processedData.length === 0 && (
                <tr><td colSpan={12} className="p-10 text-center text-slate-400 italic">No details found matching filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isFormOpen && hasRole(['admin', 'user']) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><FileText className="text-blue-600" /> Edit Verification Details</h3>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>

            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Selection Section */}
                <div className="md:col-span-2 bg-blue-50 p-4 rounded-lg border border-blue-100 mb-2">
                  <h4 className="text-sm font-bold text-blue-800 mb-3">1. Select RDE to Edit</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Routine</label>
                      <select
                        className="w-full border border-blue-200 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500"
                        value={formData.routineId}
                        onChange={(e) => setFormData({ ...formData, routineId: e.target.value, rdeId: '' })}
                      >
                        <option value="">Select Routine...</option>
                        {routines.map(r => <option key={r.id} value={r.id}>{r.routine_name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Sheet & RDE Field</label>
                      <select
                        className="w-full border border-blue-200 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500"
                        value={formData.rdeId}
                        onChange={(e) => setFormData({ ...formData, rdeId: e.target.value })}
                        disabled={!formData.routineId}
                      >
                        <option value="">Select Field...</option>
                        {availableRdes.map(r => (
                          <option key={r.id} value={r.id}>{r.sheetName} - {r.field_name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Details Form */}
                <div className="md:col-span-2">
                  <h4 className="text-sm font-bold text-slate-800 mb-3 pb-1 border-b border-slate-100">2. Verification Data</h4>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Document Type</label>
                  <input
                    className="w-full border border-slate-300 rounded-md p-2 text-sm"
                    value={formData.document_type}
                    onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Verification Name</label>
                  <input
                    className="w-full border border-slate-300 rounded-md p-2 text-sm"
                    value={formData.verification_rde_name}
                    onChange={(e) => setFormData({ ...formData, verification_rde_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Required Status</label>
                  <select
                    className="w-full border border-slate-300 rounded-md p-2 text-sm"
                    value={formData.verification_required_status}
                    onChange={(e) => setFormData({ ...formData, verification_required_status: e.target.value })}
                  >
                    <option value="Required">Required</option>
                    <option value="Secondary">Secondary</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Verification Data Type</label>
                  <input
                    className="w-full border border-slate-300 rounded-md p-2 text-sm"
                    value={formData.verification_data_type}
                    onChange={(e) => setFormData({ ...formData, verification_data_type: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Description</label>
                  <textarea
                    className="w-full border border-slate-300 rounded-md p-2 text-sm h-20"
                    value={formData.field_description}
                    onChange={(e) => setFormData({ ...formData, field_description: e.target.value })}
                  />
                </div>

                <div className="md:col-span-2 pt-2">
                  <h4 className="text-sm font-bold text-slate-800 mb-3 pb-1 border-b border-slate-100">3. Model Mapping</h4>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Old Model Name</label>
                  <input
                    className="w-full border border-slate-300 rounded-md p-2 text-sm font-mono bg-slate-50"
                    value={formData.old_model_name}
                    onChange={(e) => setFormData({ ...formData, old_model_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Old Model Mapping</label>
                  <input
                    className="w-full border border-slate-300 rounded-md p-2 text-sm font-mono bg-slate-50"
                    value={formData.old_model_mapping}
                    onChange={(e) => setFormData({ ...formData, old_model_mapping: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">New Model Name</label>
                  <input
                    className="w-full border border-slate-300 rounded-md p-2 text-sm font-mono bg-slate-50"
                    value={formData.new_model_name}
                    onChange={(e) => setFormData({ ...formData, new_model_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">New Model Mapping</label>
                  <input
                    className="w-full border border-slate-300 rounded-md p-2 text-sm font-mono bg-slate-50"
                    value={formData.new_model_mapping}
                    onChange={(e) => setFormData({ ...formData, new_model_mapping: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Table Name</label>
                  <input
                    className="w-full border border-slate-300 rounded-md p-2 text-sm font-mono bg-slate-50"
                    value={formData.table_name}
                    onChange={(e) => setFormData({ ...formData, table_name: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 rounded-b-xl">
              <button
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 text-slate-600 hover:bg-white border border-transparent hover:border-slate-300 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveForm}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors flex items-center gap-2"
              >
                <Save size={16} /> Save Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdditionalDetailsDashboard;
