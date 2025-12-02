
import React, { useState, useEffect, useMemo } from 'react';
import { dataService } from '../services/dataService';
import { ActivityLog } from '../types';
import { Filter, Search, X, ArrowUp, ArrowDown } from 'lucide-react';

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

  useEffect(() => {
    const rawLogs = dataService.getActivityLogs();
    const transformedLogs = rawLogs.map((log: any) => ({
      log_id: log.Log_id,
      user_id: log.User_id,
      activity_type: log.Activity_type,
      activity_timestamp: log.Activity_timestamp,
      details: log.Details,
    }));
    setLogs(transformedLogs);
  }, []);

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
        filterValueMatches(log.log_id, columnFilters['log_id']) &&
        filterValueMatches(log.user_id, columnFilters['user_id']) &&
        filterValueMatches(log.activity_type, columnFilters['activity_type']) &&
        filterValueMatches(log.activity_timestamp, columnFilters['activity_timestamp']) &&
        filterValueMatches(log.details, columnFilters['details'])
      );
    });
    const sorted = applySort(filtered);
    console.log('Processed Logs:', sorted);
    return sorted;
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
          <ColumnHeader label="Log ID" columnKey="log_id" minWidth="100px" />
          <ColumnHeader label="User ID" columnKey="user_id" minWidth="150px" />
          <ColumnHeader label="Activity Type" columnKey="activity_type" minWidth="150px" />
          <ColumnHeader label="Timestamp" columnKey="activity_timestamp" minWidth="200px" />
          <ColumnHeader label="Details" columnKey="details" minWidth="300px" />
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {processedLogs.map((log) => (
          <tr key={log.log_id} className="hover:bg-slate-50">
            <td className="p-3 text-sm text-slate-500 font-mono">{log.log_id}</td>
            <td className="p-3 text-sm text-slate-600">{log.user_id}</td>
            <td className="p-3 text-sm text-slate-600">{log.activity_type}</td>
            <td className="p-3 text-sm text-slate-600">{new Date(log.activity_timestamp).toLocaleString()}</td>
            <td className="p-3 text-sm text-slate-600">{log.details}</td>
          </tr>
        ))}
        {processedLogs.length === 0 && (
          <tr>
            <td colSpan={5} className="p-8 text-center text-slate-400 italic">
              No activity logs found.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
};

export default ActivityLogTable;
