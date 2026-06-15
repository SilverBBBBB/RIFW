
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Routine, RoutineFilters, ReportViewRow, CDMMappingViewRow,
  AttributeViewRow, OutputSheet, SheetDetail, UserInputViewRow
} from '../types.ts';
import { dataService } from '../services/dataService.ts';
import ActivityLogTable from './ActivityLogTable';
import {
  Filter, Plus, Edit3, Eye, FileText, Database, Layers,
  Table as TableIcon, X, ArrowUp, ArrowDown, ArrowDownUp, Search, GripVertical, Monitor,
  MousePointerClick, Download, History
} from 'lucide-react';
import { useAuth } from '../hooks/AuthContext';

interface DashboardProps {
  onEdit: (id: string) => void;
  onCreate: () => void;
  onViewDetails: (id: string) => void;
  onViewAdditionalDetails?: () => void;
}

type SortDirection = 'asc' | 'desc';

interface SortConfig {
  key: string;
  direction: SortDirection;
}



const Dashboard: React.FC<DashboardProps> = ({ onEdit, onCreate, onViewDetails, onViewAdditionalDetails }) => {
  const [filters, setFilters] = useState<RoutineFilters>({
    version: '',
    startDate: '',
    endDate: ''
  });

  const [activeTab, setActiveTab] = useState(0);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  // Tracks which header dropdown is currently open
  const [openHeaderKey, setOpenHeaderKey] = useState<string | null>(null);

  const [routines, setRoutines] = useState<Routine[]>([]);
  const [reports, setReports] = useState<ReportViewRow[]>([]);
  const [mappings, setMappings] = useState<CDMMappingViewRow[]>([]);
  const [attributes, setAttributes] = useState<AttributeViewRow[]>([]);
  const [sheets, setSheets] = useState<(OutputSheet & { routine_name: string })[]>([]);
  const [sheetDetails, setSheetDetails] = useState<(SheetDetail & { sheet_name: string })[]>([]);
  const [userInputs, setUserInputs] = useState<UserInputViewRow[]>([]);

  // Dynamic Configuration State
  const [availableVersions, setAvailableVersions] = useState<string[]>([]);

  // Drag and Drop State
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [localSheets, setLocalSheets] = useState<(OutputSheet & { routine_name: string })[]>([]);
  const { hasRole } = useAuth();

  const loadData = (currentFilters: RoutineFilters = filters) => {
    // Refresh config to get latest versions
    const currentConfig = dataService.getConfig();
    setAvailableVersions(currentConfig.versions || []);

    setRoutines(dataService.getRoutines(currentFilters));
    setReports(dataService.getReportsView(currentFilters));
    setMappings(dataService.getCDMMappingsView(currentFilters));
    setAttributes(dataService.getAttributeView(currentFilters));
    const loadedSheets = dataService.getSheetsView(currentFilters);
    setSheets(loadedSheets);
    setLocalSheets(loadedSheets); // Initial sync for local drag state
    setSheetDetails(dataService.getSheetDetailsView(currentFilters));
    setUserInputs(dataService.getUserInputsView(currentFilters));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApplyFilters = () => {
    loadData();
  };

  const handleExport = async () => {
    try {
      // 1. Fetch all data based on current filters
      const exportRoutines = dataService.getRoutines(filters);
      const exportReports = dataService.getReportsView(filters);
      const exportMappings = dataService.getCDMMappingsView(filters);
      const exportAttributes = dataService.getAttributeView(filters);
      const exportSheets = dataService.getSheetsView(filters);
      const exportDetails = dataService.getSheetDetailsView(filters);
      const exportUserInputs = dataService.getUserInputsView(filters);

      const { default: ExcelJS } = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      const addWorksheet = (name: string, rows: Record<string, unknown>[]) => {
        const worksheet = workbook.addWorksheet(name);
        const keys = Array.from(new Set(rows.flatMap(row => Object.keys(row))));
        worksheet.columns = keys.map(key => ({ header: key, key, width: 20 }));
        rows.forEach(row => worksheet.addRow(row));
        worksheet.getRow(1).font = { bold: true };
        worksheet.views = [{ state: 'frozen', ySplit: 1 }];
      };
      addWorksheet('Routines', exportRoutines as unknown as Record<string, unknown>[]);
      addWorksheet('Reports', exportReports as unknown as Record<string, unknown>[]);
      addWorksheet('CDM Mappings', exportMappings as unknown as Record<string, unknown>[]);
      addWorksheet('Attributes', exportAttributes as unknown as Record<string, unknown>[]);
      addWorksheet('Output Sheets', exportSheets as unknown as Record<string, unknown>[]);
      addWorksheet('Sheet Details', exportDetails as unknown as Record<string, unknown>[]);
      addWorksheet('User Inputs', exportUserInputs as unknown as Record<string, unknown>[]);

      const versionSuffix = filters.version ? `_${filters.version}` : '_All_Versions';
      const dateSuffix = new Date().toISOString().split('T')[0];
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `AMAP_Export${versionSuffix}_${dateSuffix}.xlsx`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export data. See console for details.");
    }
  };

  // Reset local filters and sort when tab changes
  useEffect(() => {
    setColumnFilters({});
    setSortConfig(null);
    setOpenHeaderKey(null);
  }, [activeTab]);

  const handleColumnFilterChange = (key: string, value: string) => {
    setColumnFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSort = (key: string, direction: SortDirection) => {
    setSortConfig({ key, direction });
    setOpenHeaderKey(null); // Close menu after sorting
  };

  const clearColumnFilter = (key: string) => {
    const next = { ...columnFilters };
    delete next[key];
    setColumnFilters(next);
  };

  // --- Chart Data Preparation ---





  // --- Filtering & Sorting Logic ---

  const filterValueMatches = (itemValue: any, filterText: string): boolean => {
    if (!filterText) return true;
    if (itemValue === null || itemValue === undefined) return false;
    return String(itemValue).toLowerCase().includes(filterText.toLowerCase());
  };

  const getSortableValue = (item: any, key: string): string | number => {
    const val = item[key];
    if (Array.isArray(val)) return val.join(', ').toLowerCase();
    if (typeof val === 'boolean') return val ? 'yes' : 'no';
    if (typeof val === 'string') return val.toLowerCase();
    if (val === null || val === undefined) return '';
    return val;
  };

  const applySort = <T,>(data: T[]): T[] => {
    if (!sortConfig) return data;
    return [...data].sort((a, b) => {
      const aVal = getSortableValue(a, sortConfig.key);
      const bVal = getSortableValue(b, sortConfig.key);

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const processedRoutines = useMemo(() => {
    const filtered = routines.filter(r => {
      return (
        filterValueMatches(r.id, columnFilters['id']) &&
        filterValueMatches(r.routine_name, columnFilters['routine_name']) &&
        filterValueMatches(r.routine_display_name, columnFilters['routine_display_name']) &&
        filterValueMatches(r.routine_type, columnFilters['routine_type']) &&
        filterValueMatches(r.routine_group, columnFilters['routine_group']) &&
        filterValueMatches(r.to_show, columnFilters['to_show']) &&
        filterValueMatches(r.display_in_dropdown, columnFilters['display_in_dropdown']) &&
        filterValueMatches(r.fund_types.join(', '), columnFilters['fund_types']) &&
        filterValueMatches(r.version, columnFilters['version']) &&
        filterValueMatches(r.region, columnFilters['region'])
      );
    });
    return applySort(filtered);
  }, [routines, columnFilters, sortConfig]);

  const processedReports = useMemo(() => {
    const filtered = reports.filter(r => {
      const status = r.is_optional ? 'Optional' : 'Required';
      return (
        filterValueMatches(r.routine_name, columnFilters['routine_name']) &&
        filterValueMatches(r.report_name, columnFilters['report_name']) &&
        filterValueMatches(status, columnFilters['status'])
      );
    });
    return applySort(filtered);
  }, [reports, columnFilters, sortConfig]);

  const processedMappings = useMemo(() => {
    const filtered = mappings.filter(m => {
      const req = m.is_required ? 'Yes' : 'No';
      return (
        filterValueMatches(m.routine_name, columnFilters['routine_name']) &&
        filterValueMatches(m.report_name, columnFilters['report_name']) &&
        filterValueMatches(m.field_mapping_name, columnFilters['field_mapping_name']) &&
        filterValueMatches(m.data_type, columnFilters['data_type']) &&
        filterValueMatches(req, columnFilters['is_required']) &&
        filterValueMatches(m.blanks_allowed || 'Allowed', columnFilters['blanks_allowed'])
      );
    });
    return applySort(filtered);
  }, [mappings, columnFilters, sortConfig]);

  const processedAttributes = useMemo(() => {
    const filtered = attributes.filter(a => {
      return (
        filterValueMatches(a.report_name, columnFilters['report_name']) &&
        filterValueMatches(a.attribute_name, columnFilters['attribute_name']) &&
        filterValueMatches(a.cdm_mapping_name, columnFilters['cdm_mapping_name'])
      );
    });
    return applySort(filtered);
  }, [attributes, columnFilters, sortConfig]);

  const processedSheets = useMemo(() => {
    const filtered = localSheets.filter(s => {
      return (
        filterValueMatches(s.routine_name, columnFilters['routine_name']) &&
        filterValueMatches(s.sheet_name, columnFilters['sheet_name']) &&
        filterValueMatches(s.order_index, columnFilters['order_index'])
      );
    });
    return applySort(filtered);
  }, [localSheets, columnFilters, sortConfig]);

  const processedSheetDetails = useMemo(() => {
    const filtered = sheetDetails.filter(sd => {
      return (
        filterValueMatches(sd.sheet_name, columnFilters['sheet_name']) &&
        filterValueMatches(sd.field_name, columnFilters['field_name']) &&
        filterValueMatches(sd.data_format, columnFilters['data_format']) &&
        filterValueMatches(sd.column_order, columnFilters['column_order'])
      );
    });
    return applySort(filtered);
  }, [sheetDetails, columnFilters, sortConfig]);

  const processedUserInputs = useMemo(() => {
    const filtered = userInputs.filter(ui => {
      return (
        filterValueMatches(ui.routine_name, columnFilters['routine_name']) &&
        filterValueMatches(ui.user_input_name, columnFilters['user_input_name']) &&
        filterValueMatches(ui.input_location, columnFilters['input_location']) &&
        filterValueMatches(ui.textbox_type, columnFilters['textbox_type']) &&
        filterValueMatches(ui.validations, columnFilters['validations']) &&
        filterValueMatches(ui.min_value, columnFilters['min_value']) &&
        filterValueMatches(ui.max_value, columnFilters['max_value']) &&
        filterValueMatches(ui.is_mandatory ? 'Yes' : 'No', columnFilters['is_mandatory'])
      );
    });
    return applySort(filtered);
  }, [userInputs, columnFilters, sortConfig]);


  const tabs = [
    { name: 'Routines', icon: <Database size={16} /> },
    { name: 'Reports', icon: <FileText size={16} /> },
    { name: 'CDM Mapping', icon: <Layers size={16} /> },
    { name: 'Attributes', icon: <TableIcon size={16} /> },
    { name: 'Sheets', icon: <FileText size={16} /> },
    { name: 'RDEs', icon: <TableIcon size={16} /> },
    { name: 'User Inputs', icon: <MousePointerClick size={16} /> },
    { name: 'Activity Log', icon: <History size={16} /> },
  ];

  // --- Drag and Drop Handlers ---

  const handleDragStart = (index: number) => {
    setDraggedItemIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = async (dropIndex: number) => {
    if (draggedItemIndex === null || draggedItemIndex === dropIndex) return;
    if (sortConfig || Object.keys(columnFilters).length > 0) {
      alert('Clear sheet filters and sorting before reordering.');
      setDraggedItemIndex(null);
      return;
    }
    const draggedItem = localSheets[draggedItemIndex];
    const targetItem = localSheets[dropIndex];
    if (!draggedItem || !targetItem || draggedItem.routine_id !== targetItem.routine_id) {
      alert('Sheets can only be reordered within the same routine.');
      setDraggedItemIndex(null);
      return;
    }

    const routineSheets = localSheets.filter(item => item.routine_id === draggedItem.routine_id);
    const sourceRoutineIndex = routineSheets.findIndex(item => item.id === draggedItem.id);
    const targetRoutineIndex = routineSheets.findIndex(item => item.id === targetItem.id);
    const reorderedRoutineSheets = [...routineSheets];
    const [moved] = reorderedRoutineSheets.splice(sourceRoutineIndex, 1);
    reorderedRoutineSheets.splice(targetRoutineIndex, 0, moved);
    const itemsToUpdate = reorderedRoutineSheets.map((item, idx) => ({ ...item, order_index: idx + 1 }));
    const updateMap = new Map(itemsToUpdate.map(item => [item.id, item]));
    const nextSheets = localSheets.map(item => updateMap.get(item.id) || item);

    setLocalSheets(nextSheets);
    setDraggedItemIndex(null);
    try {
      await dataService.updateSheetOrders(itemsToUpdate);
      loadData();
    } catch (error) {
      setLocalSheets(sheets);
      alert(error instanceof Error ? error.message : 'Failed to reorder sheets.');
    }
  };


  // --- Excel-style Header Component ---

  const ColumnHeader = ({
    label,
    columnKey,
    minWidth
  }: {
    label: string,
    columnKey: string,
    minWidth?: string
  }) => {
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
            <div className="absolute top-full right-0 mt-0.5 w-64 bg-white rounded shadow-xl border border-slate-200 z-50 animate-in fade-in zoom-in-95 duration-100 text-left font-normal normal-case">
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
                    onChange={(e) => handleColumnFilterChange(columnKey, e.target.value)}
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
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Header & Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Routines Dashboard</h1>
            <p className="text-slate-500 text-sm">Manage AMAP routines, mappings, and versioning.</p>
          </div>
          <div className="flex gap-3">
            {onViewAdditionalDetails && (
              <button
                onClick={onViewAdditionalDetails}
                className="bg-white border border-blue-600 text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
              >
                <Monitor size={18} /> Additional Details
              </button>
            )}
            {hasRole(['admin', 'user']) && (
              <button
                onClick={onCreate}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
              >
                <Plus size={18} /> Add New Routine
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="w-full md:w-48">
            <label className="block text-xs font-medium text-slate-500 mb-1">Version</label>
            <select
              className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              value={filters.version}
              onChange={(e) => setFilters({ ...filters, version: e.target.value })}
            >
              <option value="">All Versions</option>
              {availableVersions.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          <div className="w-full md:w-48">
            <label className="block text-xs font-medium text-slate-500 mb-1">Start Date</label>
            <input
              type="date"
              className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            />
          </div>

          <div className="w-full md:w-48">
            <label className="block text-xs font-medium text-slate-500 mb-1">End Date</label>
            <input
              type="date"
              className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            />
          </div>

          <button
            onClick={handleApplyFilters}
            className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors h-10 md:ml-2"
          >
            <Filter size={16} /> Apply Filters
          </button>

          <button
            onClick={handleExport}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors h-10 ml-2"
          >
            <Download size={16} /> Export Excel
          </button>
        </div>
      </div>

      {/* --- Expanded Visual Stats Section --- */}

      {/* 1. Key Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <div className="text-slate-500 text-xs font-medium uppercase mb-2">Total Routines</div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-bold text-slate-800">{processedRoutines.length}</div>
            <span className="text-xs text-slate-400">Filtered</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <div className="text-slate-500 text-xs font-medium uppercase mb-2">Active Reports</div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-bold text-blue-600">{reports.length}</div>
            <span className="text-xs text-slate-400">Total</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <div className="text-slate-500 text-xs font-medium uppercase mb-2">Mappings Defined</div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-bold text-emerald-600">{mappings.length}</div>
            <span className="text-xs text-slate-400">Fields</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <div className="text-slate-500 text-xs font-medium uppercase mb-2">Output Sheets</div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-bold text-purple-600">{sheets.length}</div>
            <span className="text-xs text-slate-400">Generated</span>
          </div>
        </div>
      </div>




      {/* Tabs & Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        {/* Tabs Header */}
        <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar">
          {tabs.map((tab, idx) => (
            <button
              key={idx}
              onClick={() => setActiveTab(idx)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === idx
                ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/50'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
            >
              {tab.icon}
              {tab.name}
            </button>
          ))}
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto min-h-[400px]">
          {activeTab === 0 && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <ColumnHeader label="ID" columnKey="id" minWidth="100px" />
                  <ColumnHeader label="Routine Name" columnKey="routine_name" minWidth="250px" />
                  <ColumnHeader label="Display Name" columnKey="routine_display_name" minWidth="250px" />
                  <ColumnHeader label="Version" columnKey="version" minWidth="100px" />
                  <ColumnHeader label="Group" columnKey="routine_group" minWidth="200px" />
                  <ColumnHeader label="Type" columnKey="routine_type" minWidth="150px" />
                  <ColumnHeader label="Region" columnKey="region" minWidth="120px" />
                  <th className="p-3 border-b border-slate-300 bg-slate-100 text-xs font-bold text-slate-700 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {processedRoutines.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 group">
                    <td className="p-3 text-sm text-slate-500 font-mono">{row.id}</td>
                    <td className="p-3 text-sm font-medium text-slate-800">{row.routine_name}</td>
                    <td className="p-3 text-sm text-slate-600">{row.routine_display_name}</td>
                    <td className="p-3 text-sm text-slate-600"><span className="bg-slate-100 px-2 py-1 rounded border border-slate-200 text-xs">{row.version}</span></td>
                    <td className="p-3 text-sm text-slate-600">{row.routine_group}</td>
                    <td className="p-3 text-sm text-slate-600">{row.routine_type}</td>
                    <td className="p-3 text-sm text-slate-600">{row.region}</td>
                    <td className="p-3 text-sm text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onViewDetails(row.id)} title="View Details" className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"><Eye size={16} /></button>
                        {hasRole(['admin', 'user']) && <button onClick={() => onEdit(row.id)} title="Edit" className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"><Edit3 size={16} /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
                {processedRoutines.length === 0 && (
                  <tr><td colSpan={8} className="p-8 text-center text-slate-400 italic">No routines found matching filters.</td></tr>
                )}
              </tbody>
            </table>
          )}

          {activeTab === 1 && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <ColumnHeader label="Routine" columnKey="routine_name" minWidth="200px" />
                  <ColumnHeader label="Report Name" columnKey="report_name" minWidth="250px" />
                  <ColumnHeader label="Status" columnKey="status" minWidth="120px" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {processedReports.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="p-3 text-sm text-slate-600">{row.routine_name}</td>
                    <td className="p-3 text-sm font-medium text-slate-800">{row.report_name}</td>
                    <td className="p-3 text-sm">
                      {row.is_optional
                        ? <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Optional</span>
                        : <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded">Required</span>
                      }
                    </td>
                  </tr>
                ))}
                {processedReports.length === 0 && <tr><td colSpan={3} className="p-8 text-center text-slate-400 italic">No reports found.</td></tr>}
              </tbody>
            </table>
          )}

          {activeTab === 2 && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <ColumnHeader label="Routine" columnKey="routine_name" minWidth="200px" />
                  <ColumnHeader label="Report" columnKey="report_name" minWidth="200px" />
                  <ColumnHeader label="Field Mapping Name" columnKey="field_mapping_name" minWidth="200px" />
                  <ColumnHeader label="Data Type" columnKey="data_type" minWidth="120px" />
                  <ColumnHeader label="Required" columnKey="is_required" minWidth="100px" />
                  <ColumnHeader label="Blanks" columnKey="blanks_allowed" minWidth="120px" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {processedMappings.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="p-3 text-sm text-slate-600">{row.routine_name}</td>
                    <td className="p-3 text-sm text-slate-600">{row.report_name}</td>
                    <td className="p-3 text-sm font-mono text-slate-700">{row.field_mapping_name}</td>
                    <td className="p-3 text-sm text-slate-600">{row.data_type}</td>
                    <td className="p-3 text-sm text-slate-600">{row.is_required ? 'Yes' : 'No'}</td>
                    <td className="p-3 text-sm text-slate-600">{row.blanks_allowed || 'Allowed'}</td>
                  </tr>
                ))}
                {processedMappings.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-400 italic">No mappings found.</td></tr>}
              </tbody>
            </table>
          )}

          {activeTab === 3 && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <ColumnHeader label="Report" columnKey="report_name" minWidth="200px" />
                  <ColumnHeader label="CDM Mapping" columnKey="cdm_mapping_name" minWidth="200px" />
                  <ColumnHeader label="Attribute Name" columnKey="attribute_name" minWidth="200px" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {processedAttributes.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="p-3 text-sm text-slate-600">{row.report_name}</td>
                    <td className="p-3 text-sm text-slate-600">{row.cdm_mapping_name}</td>
                    <td className="p-3 text-sm font-medium text-slate-800">{row.attribute_name}</td>
                  </tr>
                ))}
                {processedAttributes.length === 0 && <tr><td colSpan={3} className="p-8 text-center text-slate-400 italic">No attributes found.</td></tr>}
              </tbody>
            </table>
          )}

          {activeTab === 4 && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="w-10 p-3 border-b border-slate-300 bg-slate-100"></th>
                  <ColumnHeader label="Order" columnKey="order_index" minWidth="80px" />
                  <ColumnHeader label="Routine" columnKey="routine_name" minWidth="200px" />
                  <ColumnHeader label="Sheet Name" columnKey="sheet_name" minWidth="250px" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {processedSheets.map((row, idx) => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50"
                    draggable={hasRole(['admin', 'user']) && !sortConfig && Object.keys(columnFilters).length === 0}
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={() => handleDrop(idx)}
                  >
                    <td className="p-3 text-slate-400 cursor-move text-center"><GripVertical size={16} /></td>
                    <td className="p-3 text-sm text-slate-600 font-mono">{row.order_index}</td>
                    <td className="p-3 text-sm text-slate-600">{row.routine_name}</td>
                    <td className="p-3 text-sm font-medium text-slate-800">{row.sheet_name}</td>
                  </tr>
                ))}
                {processedSheets.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-400 italic">No sheets found.</td></tr>}
              </tbody>
            </table>
          )}

          {activeTab === 5 && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <ColumnHeader label="Sheet" columnKey="sheet_name" minWidth="200px" />
                  <ColumnHeader label="Column Order" columnKey="column_order" minWidth="100px" />
                  <ColumnHeader label="Field Name" columnKey="field_name" minWidth="250px" />
                  <ColumnHeader label="Data Format" columnKey="data_format" minWidth="150px" />
                  <ColumnHeader label="Color" columnKey="fill_color_format" minWidth="100px" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {processedSheetDetails.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="p-3 text-sm text-slate-600">{row.sheet_name}</td>
                    <td className="p-3 text-sm text-slate-600">{row.column_order}</td>
                    <td className="p-3 text-sm font-medium text-slate-800">{row.field_name}</td>
                    <td className="p-3 text-sm text-slate-600">{row.data_format}</td>
                    <td className="p-3 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border border-slate-300 shadow-sm" style={{ backgroundColor: row.fill_color_format }}></div>
                        <span className="text-slate-500 font-mono text-xs">{row.fill_color_format}</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {processedSheetDetails.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400 italic">No RDE details found.</td></tr>}
              </tbody>
            </table>
          )}

          {activeTab === 6 && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <ColumnHeader label="Routine" columnKey="routine_name" minWidth="200px" />
                  <ColumnHeader label="Input Name" columnKey="user_input_name" minWidth="200px" />
                  <ColumnHeader label="Location" columnKey="input_location" minWidth="150px" />
                  <ColumnHeader label="Type" columnKey="textbox_type" minWidth="150px" />
                  <ColumnHeader label="Validations" columnKey="validations" minWidth="200px" />
                  <ColumnHeader label="Min Value" columnKey="min_value" minWidth="100px" />
                  <ColumnHeader label="Max Value" columnKey="max_value" minWidth="100px" />
                  <ColumnHeader label="Mandatory" columnKey="is_mandatory" minWidth="100px" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {processedUserInputs.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="p-3 text-sm text-slate-600">{row.routine_name}</td>
                    <td className="p-3 text-sm font-medium text-slate-800">{row.user_input_name}</td>
                    <td className="p-3 text-sm text-slate-600">{row.input_location}</td>
                    <td className="p-3 text-sm text-slate-600">{row.textbox_type}</td>
                    <td className="p-3 text-sm text-slate-600 max-w-xs truncate" title={row.validations}>{row.validations}</td>
                    <td className="p-3 text-sm text-slate-600">{row.min_value}</td>
                    <td className="p-3 text-sm text-slate-600">{row.max_value}</td>
                    <td className="p-3 text-sm">
                      {row.is_mandatory
                        ? <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded border border-red-100">Yes</span>
                        : <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">No</span>
                      }
                    </td>
                  </tr>
                ))}
                {processedUserInputs.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-slate-400 italic">No User Inputs found.</td></tr>}
              </tbody>
            </table>
          )}
          {activeTab === 7 && (
            <ActivityLogTable />
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
