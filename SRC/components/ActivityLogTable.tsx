
import React, { useState, useEffect, useMemo } from 'react';
import { dataService } from '../services/dataService';
import { ActivityLog } from '../types';
import { Filter, Search, X, ArrowUp, ArrowDown, ChevronRight, ChevronDown } from 'lucide-react';

type SortDirection = 'asc' | 'desc';

interface SortConfig {
  key: string;
  direction: SortDirection;
}

const ActivityLogTable: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [openHeaderKey, setOpenHeaderKey] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  useEffect(() => {
    setLogs(dataService.getActivityLogs());
  }, []);

  const toggleRowExpansion = (id: number) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(id)) {
      newExpandedRows.delete(id);
    } else {
      newExpandedRows.add(id);
    }
    setExpandedRows(newExpandedRows);
  };

  const handleColumnFilterChange = (key: string, value: string) => {
    setColumnFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSort = (key: string, direction: SortDirection) => {
    setSortConfig({ key, direction });
    setOpenHeaderKey(null);
  };

  const clearColumnFilter = (key: string) => {
    const next = { ...columnFilters };
    delete next[key];
    setColumnFilters(next);
  };
  
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

  const applySort = <T extends unknown>(data: T[]): T[] => {
    if (!sortConfig) return data;
    return [...data].sort((a, b) => {
      const aVal = getSortableValue(a, sortConfig.key);
      const bVal = getSortableValue(b, sortConfig.key);
      
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const processedLogs = useMemo(() => {
    const filtered = logs.filter(log => {
      return (
        filterValueMatches(log.id, columnFilters['id']) &&
        filterValueMatches(log.routine_id, columnFilters['routine_id']) &&
        filterValueMatches(log.routine_name, columnFilters['routine_name']) &&
        filterValueMatches(log.changed_by, columnFilters['changed_by']) &&
        filterValueMatches(log.change_type, columnFilters['change_type']) &&
        filterValueMatches(log.timestamp, columnFilters['timestamp'])
      );
    });
    return applySort(filtered);
  }, [logs, columnFilters, sortConfig]);

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
    <table className="w-full text-left border-collapse">
      <thead>
        <tr>
          <th className="w-12"></th>
          <ColumnHeader label="Log ID" columnKey="id" minWidth="100px" />
          <ColumnHeader label="Routine ID" columnKey="routine_id" minWidth="150px" />
          <ColumnHeader label="Routine Name" columnKey="routine_name" minWidth="200px" />
          <ColumnHeader label="Changed By" columnKey="changed_by" minWidth="150px" />
          <ColumnHeader label="Change Type" columnKey="change_type" minWidth="150px" />
          <ColumnHeader label="Timestamp" columnKey="timestamp" minWidth="200px" />
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {processedLogs.map((log) => (
          <React.Fragment key={log.id}>
            <tr className="hover:bg-slate-50">
              <td className="p-3 text-center">
                <button onClick={() => toggleRowExpansion(log.id)} className="p-1 rounded-full hover:bg-slate-200">
                  {expandedRows.has(log.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
              </td>
              <td className="p-3 text-sm text-slate-500 font-mono">{log.id}</td>
              <td className="p-3 text-sm text-slate-600">{log.routine_id}</td>
              <td className="p-3 text-sm text-slate-600">{log.routine_name}</td>
              <td className="p-3 text-sm text-slate-600">{log.changed_by}</td>
              <td className="p-3 text-sm text-slate-600">{log.change_type}</td>
              <td className="p-3 text-sm text-slate-600">{new Date(log.timestamp).toLocaleString()}</td>
            </tr>
            {expandedRows.has(log.id) && (
              <tr>
                <td colSpan={7} className="p-4 bg-slate-50">
                  <pre className="text-xs bg-white p-4 rounded-md shadow-inner overflow-auto">
                    {JSON.stringify(JSON.parse(log.change_details), null, 2)}
                  </pre>
                </td>
              </tr>
            )}
          </React.Fragment>
        ))}
        {processedLogs.length === 0 && (
          <tr>
            <td colSpan={7} className="p-8 text-center text-slate-400 italic">
              No activity logs found.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
};

export default ActivityLogTable;
