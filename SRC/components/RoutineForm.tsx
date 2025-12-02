import React, { useState, useEffect } from 'react';
import { 
  Routine, Report, CDMMapping, Attribute, OutputSheet, SheetDetail, AppConfiguration, UserInput
} from '../types.ts';
import { dataService } from '../services/dataService.ts';
import { PREDEFINED_REPORTS, HELPER_ROUTINES_LIST, INPUT_LOCATIONS, TEXTBOX_TYPES } from '../constants.ts';
import { ChevronDown, ChevronUp, Trash2, Plus, Save, ArrowLeft, Copy, Layout, FileSpreadsheet, Database, Workflow, X, Settings, AlertTriangle, ListChecks, MousePointerClick } from 'lucide-react';
import ExpandCollapseAllButton from './ExpandCollapseAllButton.tsx';
import { useAuth } from '../hooks/AuthContext.tsx';

interface RoutineFormProps {
  mode: 'create' | 'edit';
  routineId?: string;
  onCancel: () => void;
  onSave: (username: string) => void;
}

const ALL_SECTIONS = ['core', 'reports', 'mapping', 'attributes', 'sheets', 'rdes', 'helpers', 'userInputs'];

const RoutineForm: React.FC<RoutineFormProps> = ({ mode, routineId, onCancel, onSave }) => {
  const { user } = useAuth();
  const [config, setConfig] = useState<AppConfiguration | null>(null);
  const [routine, setRoutine] = useState<Partial<Routine>>({
    routine_name: '',
    routine_display_name: '',
    version: '', 
    routine_group: '',
    routine_type: '',
    fund_types: [],
    capital_structure: '',
    region: '',
    helper_routines: [],
    to_show: 'Yes',
    display_in_dropdown: 'Yes'
  });

  const [reports, setReports] = useState<Report[]>([]);
  const [mappings, setMappings] = useState<CDMMapping[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [sheets, setSheets] = useState<OutputSheet[]>([]);
  const [rdes, setRdes] = useState<SheetDetail[]>([]);
  const [userInputs, setUserInputs] = useState<UserInput[]>([]);
  
  // Helper routines state
  const [availableHelperRoutines, setAvailableHelperRoutines] = useState<string[]>([]);
  const [newHelperRoutineInput, setNewHelperRoutineInput] = useState('');

  // Report state
  const [availableReports, setAvailableReports] = useState<string[]>([]);
  const [customReportInput, setCustomReportInput] = useState('');

  const [expandedSections, setExpandedSections] = useState<string[]>(['core']);
  const [versionModalOpen, setVersionModalOpen] = useState(false);
  const [newVersionName, setNewVersionName] = useState('');

  // Verification Details Modal State
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [editingRdeId, setEditingRdeId] = useState<string | null>(null);
  const [verificationData, setVerificationData] = useState<Partial<SheetDetail>>({});

  // Delete Confirmation State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Validation State
  const [validationModalOpen, setValidationModalOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [highlightErrorFields, setHighlightErrorFields] = useState<string[]>([]);

  // Load Config and Initial Data
  useEffect(() => {
    const appConfig = dataService.getConfig();
    setConfig(appConfig);
    
    // Initialize dropdowns from config or defaults
    setAvailableHelperRoutines(appConfig.helperRoutines || HELPER_ROUTINES_LIST);
    setAvailableReports(appConfig.reportNames || PREDEFINED_REPORTS);

    if (mode === 'create') {
      setRoutine(prev => ({
        ...prev,
        id: Math.random().toString(36).substring(2, 10), // Temporary ID for linking child items
        version: appConfig.versions && appConfig.versions.length > 0 ? appConfig.versions[appConfig.versions.length - 1] : '',
        routine_type: appConfig.routineTypes[0] || '',
        capital_structure: appConfig.capitalStructures[0] || '',
        region: appConfig.regions[0] || '',
        helper_routines: [],
        to_show: 'Yes',
        display_in_dropdown: 'Yes'
      }));
    } else if (mode === 'edit' && routineId) {
      const r = dataService.getRoutineById(routineId);
      if (r) {
        setRoutine({
          ...r,
          helper_routines: r.helper_routines || [], // Ensure it's an array if undefined in older data
          to_show: r.to_show || 'Yes',
          display_in_dropdown: r.display_in_dropdown || 'Yes'
        });
        
        const currentReports = dataService.getReportsByRoutineId(r.id);
        setReports(currentReports);

        // Ensure existing custom report names are available in the dropdown if they aren't in the config
        const usedReportNames = currentReports.map(rp => rp.report_name).filter(n => n);
        const configReportNames = appConfig.reportNames || PREDEFINED_REPORTS;
        setAvailableReports(prev => Array.from(new Set([...configReportNames, ...usedReportNames])));
        
        // Recursively fetch mappings and attributes
        const rMaps: CDMMapping[] = [];
        const rAttrs: Attribute[] = [];
        
        currentReports.forEach(rep => {
           const maps = dataService.getCDMMappingsByReportId(rep.id);
           rMaps.push(...maps);
           maps.forEach(map => {
              rAttrs.push(...dataService.getAttributesByMappingId(map.id));
           });
        });
        setMappings(rMaps);
        setAttributes(rAttrs);

        // Fetch Sheets and RDEs
        const rSheets = dataService.getOutputSheetsByRoutineId(r.id);
        const rSheetDetails: SheetDetail[] = [];
        rSheets.forEach(s => {
          rSheetDetails.push(...dataService.getSheetDetailsBySheetId(s.id));
        });
        setSheets(rSheets);
        setRdes(rSheetDetails);

        // Fetch User Inputs
        setUserInputs(dataService.getUserInputsByRoutineId(r.id));
      }
    }
  }, [mode, routineId]);

  if (!config) return <div>Loading configuration...</div>;

  const handleSave = () => {
    const errors: string[] = [];
    const errorFields: string[] = [];

    // Mandatory Field Validation
    if (!routine.routine_name?.trim()) {
       errors.push("Routine Name");
       errorFields.push("routine_name");
    }
    if (!routine.routine_display_name?.trim()) {
       errors.push("Routine Display Name");
       errorFields.push("routine_display_name");
    }
    if (!routine.routine_group?.trim()) {
       errors.push("Routine Group");
       errorFields.push("routine_group");
    }
    if (!routine.routine_type) {
       errors.push("Routine Type");
       errorFields.push("routine_type");
    }
    if (!routine.to_show) {
       errors.push("toShow");
       errorFields.push("to_show");
    }
    if (!routine.display_in_dropdown) {
       errors.push("Display in Dropdown");
       errorFields.push("display_in_dropdown");
    }
    if (!routine.fund_types || routine.fund_types.length === 0) {
       errors.push("Fund Types");
       errorFields.push("fund_types");
    }
    if (!routine.region) {
       errors.push("Region");
       errorFields.push("region");
    }

    // Associated Report validation
    if (reports.some(r => !r.report_name?.trim())) {
      errors.push("Each Associated Report must have a report name selected.");
      errorFields.push("reports");
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      setHighlightErrorFields(errorFields);
      setValidationModalOpen(true);
      
      const sectionsToExpand = new Set<string>(expandedSections);
      if (errorFields.some(f => ['routine_name', 'routine_display_name', 'routine_group', 'routine_type', 'to_show', 'display_in_dropdown', 'fund_types', 'region'].includes(f))) {
        sectionsToExpand.add('core');
      }
      if (errorFields.includes('reports')) {
        sectionsToExpand.add('reports');
      }
      setExpandedSections(Array.from(sectionsToExpand));

      return;
    }
    
    // Clear errors if any
    setValidationErrors([]);
    setHighlightErrorFields([]);

    const finalRoutine = {
      ...routine,
      last_edited_date: new Date().toISOString()
    } as Routine;

    dataService.saveRoutine(finalRoutine, reports, mappings, attributes, sheets, rdes, userInputs, user.username);
    onSave(user.username);
  };

  const handleDelete = () => {
    // Ensure we have an ID to delete. Prefer prop first.
    const idToDelete = routineId || routine.id;
    if (mode === 'edit' && idToDelete) {
       setDeleteModalOpen(true);
    }
  };

  const confirmDelete = () => {
    const idToDelete = routineId || routine.id;
    if (idToDelete) {
      dataService.deleteRoutine(idToDelete);
      setDeleteModalOpen(false);
      onSave(user.username); // Navigate back to dashboard
    }
  };

  const handleSaveAsNewVersion = () => {
    if (!newVersionName) return alert("Please select a version");
    if (routine.id) {
      dataService.createNewVersion(routine.id, newVersionName);
      setVersionModalOpen(false);
      onSave(user.username);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const toggleAllSections = (expand: boolean) => {
    if (expand) {
      setExpandedSections(ALL_SECTIONS);
    } else {
      setExpandedSections([]);
    }
  };

  // --- Report Management ---
  const addReport = () => {
    const newRep: Report = {
      id: Math.random().toString(36).substring(2),
      routine_id: routine.id || 'temp',
      report_name: '',
      is_optional: false
    };
    setReports([...reports, newRep]);
  };

  const addCustomReport = () => {
    if (!customReportInput.trim()) return;
    const val = customReportInput.trim();
    
    if (!availableReports.includes(val)) {
      setAvailableReports(prev => [...prev, val]);
    }

    const newRep: Report = {
      id: Math.random().toString(36).substring(2),
      routine_id: routine.id || 'temp',
      report_name: val,
      is_optional: false
    };
    setReports([...reports, newRep]);
    setCustomReportInput('');
  };

  const updateReport = (index: number, field: keyof Report, value: any) => {
    const updated = [...reports];
    updated[index] = { ...updated[index], [field]: value };
    setReports(updated);
  };

  const removeReport = (reportId: string) => {
    setReports(reports.filter(r => r.id !== reportId));
    // Cascade delete mappings and attributes
    const remainingMappings = mappings.filter(m => m.report_id !== reportId);
    const remainingMappingIds = remainingMappings.map(m => m.id);
    setMappings(remainingMappings);
    setAttributes(attributes.filter(a => remainingMappingIds.includes(a.cdm_mapping_id)));
  };

  // --- Mapping Management ---
  const addMapping = (reportId: string) => {
    const newMap: CDMMapping = {
      id: Math.random().toString(36).substring(2),
      report_id: reportId,
      field_mapping_name: '',
      data_type: config.dataTypes[0] || 'String',
      is_required: false,
      blanks_allowed: 'Allowed'
    };
    setMappings([...mappings, newMap]);
  };

  const updateMapping = (id: string, field: keyof CDMMapping, value: any) => {
    setMappings(mappings.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const removeMapping = (mappingId: string) => {
    setMappings(mappings.filter(m => m.id !== mappingId));
    setAttributes(attributes.filter(a => a.cdm_mapping_id !== mappingId));
  };

  // --- Attribute Management ---
  const addAttribute = () => {
    // Default to first available mapping if exists
    const defaultMappingId = mappings.length > 0 ? mappings[0].id : '';
    if (!defaultMappingId) return alert("Please create a CDM Mapping first.");

    setAttributes([...attributes, {
      id: Math.random().toString(36).substring(2),
      attribute_name: '',
      cdm_mapping_id: defaultMappingId
    }]);
  };

  const updateAttribute = (id: string, field: keyof Attribute | 'report_id', value: string) => {
    if (field === 'report_id') {
      // When report changes, verify if current mapping belongs to it, if not reset to first valid
      const validMappings = mappings.filter(m => m.report_id === value);
      const firstValid = validMappings.length > 0 ? validMappings[0].id : '';
      setAttributes(attributes.map(a => a.id === id ? { ...a, cdm_mapping_id: firstValid } : a));
    } else {
      setAttributes(attributes.map(a => a.id === id ? { ...a, [field]: value } : a));
    }
  };

  // --- Sheet Management ---
  const addSheet = () => {
    setSheets([...sheets, {
      id: Math.random().toString(36).substring(2),
      routine_id: routine.id || 'temp',
      sheet_name: '',
      order_index: 0 // Will be assigned by service on save
    }]);
  };

  const updateSheet = (id: string, name: string) => {
    setSheets(sheets.map(s => s.id === id ? { ...s, sheet_name: name } : s));
  };

  const removeSheet = (id: string) => {
    setSheets(sheets.filter(s => s.id !== id));
    setRdes(rdes.filter(r => r.output_sheet_id !== id));
  };

  // --- RDE Management ---
  const addRde = (sheetId: string) => {
    setRdes([...rdes, {
      id: Math.random().toString(36).substring(2),
      output_sheet_id: sheetId,
      field_name: '',
      fill_color_format: '#FFFFFF',
      data_format: 'General',
      column_order: (rdes.filter(r => r.output_sheet_id === sheetId).length) + 1
    }]);
  };

  const updateRde = (id: string, field: keyof SheetDetail, value: any) => {
    setRdes(rdes.map(r => r.id === id ? { ...r, [field]: value } : r));
  };
  
  // --- User Input Management ---
  const addUserInput = () => {
     setUserInputs([...userInputs, {
        id: Math.random().toString(36).substring(2),
        routine_id: routine.id || 'temp',
        user_input_name: '',
        input_location: INPUT_LOCATIONS[0],
        textbox_type: TEXTBOX_TYPES[0],
        validations: '',
        min_value: '',
        max_value: '',
        is_mandatory: false
     }]);
  };

  const updateUserInput = (id: string, field: keyof UserInput, value: any) => {
     setUserInputs(userInputs.map(ui => ui.id === id ? { ...ui, [field]: value } : ui));
  };

  const removeUserInput = (id: string) => {
     setUserInputs(userInputs.filter(ui => ui.id !== id));
  };

  // --- Verification Details Modal Handlers ---
  const openVerificationModal = (rde: SheetDetail) => {
    setEditingRdeId(rde.id);
    setVerificationData({ ...rde });
    setVerificationModalOpen(true);
  };

  const saveVerificationDetails = () => {
    if (editingRdeId) {
      setRdes(rdes.map(r => r.id === editingRdeId ? { ...r, ...verificationData } : r));
      setVerificationModalOpen(false);
      setEditingRdeId(null);
      setVerificationData({});
    }
  };

  // --- Helper Routine Management ---
  const addHelperRoutine = (name: string) => {
    if (name && !routine.helper_routines?.includes(name)) {
      setRoutine({
        ...routine,
        helper_routines: [...(routine.helper_routines || []), name]
      });
    }
  };

  const removeHelperRoutine = (name: string) => {
    setRoutine({
      ...routine,
      helper_routines: (routine.helper_routines || []).filter(r => r !== name)
    });
  };

  const handleAddCustomHelperRoutine = () => {
    if (newHelperRoutineInput.trim()) {
      const val = newHelperRoutineInput.trim();
      // Add to available list if not present
      if (!availableHelperRoutines.includes(val)) {
        setAvailableHelperRoutines([...availableHelperRoutines, val]);
      }
      // Add to selection
      addHelperRoutine(val);
      setNewHelperRoutineInput('');
    }
  };

  return (
    <div className="max-w-5xl mx-auto animate-slide-up pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <button onClick={onCancel} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <ArrowLeft size={24} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {mode === 'create' ? 'Add New Routine' : `Edit Routine: ${routine.routine_name}`}
            </h1>
            <p className="text-slate-500 text-sm">
              {mode === 'edit' && `Last Edited: ${new Date(routine.last_edited_date || '').toLocaleDateString()}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {mode === 'edit' && (
            <>
              <button 
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
              >
                <Trash2 size={16} /> Delete
              </button>
              <button 
                onClick={() => setVersionModalOpen(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
              >
                <Copy size={16} /> Save as New Version
              </button>
            </>
          )}
          <button 
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
          >
            <Save size={16} /> Save Changes
          </button>
        </div>
      </div>

      {/* Expand/Collapse All */}
      <div className="flex justify-end mb-4">
        <ExpandCollapseAllButton onToggle={toggleAllSections} />
      </div>

      {/* Section 1: Core Info */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-4">
        <button 
          onClick={() => toggleSection('core')}
          className="w-full flex items-center justify-between p-5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
        >
          <span className="font-semibold text-slate-700 flex items-center gap-2"><Database size={18} /> 1. Core Routine Information</span>
          {expandedSections.includes('core') ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
        </button>
        
        {expandedSections.includes('core') && (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Routine Name <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                className={`w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${highlightErrorFields.includes('routine_name') ? 'border-red-500 bg-red-50' : 'border-slate-300'}`}
                value={routine.routine_name}
                onChange={e => setRoutine({ ...routine, routine_name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Routine Display Name <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                className={`w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${highlightErrorFields.includes('routine_display_name') ? 'border-red-500 bg-red-50' : 'border-slate-300'}`}
                value={routine.routine_display_name}
                onChange={e => setRoutine({ ...routine, routine_display_name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Version</label>
              <select 
                className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={routine.version}
                onChange={e => setRoutine({ ...routine, version: e.target.value })}
              >
                {config.versions.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Routine Group <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                className={`w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${highlightErrorFields.includes('routine_group') ? 'border-red-500 bg-red-50' : 'border-slate-300'}`}
                value={routine.routine_group}
                onChange={e => setRoutine({ ...routine, routine_group: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Routine Type <span className="text-red-500">*</span></label>
              <select 
                className={`w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${highlightErrorFields.includes('routine_type') ? 'border-red-500 bg-red-50' : 'border-slate-300'}`}
                value={routine.routine_type}
                onChange={e => setRoutine({ ...routine, routine_type: e.target.value })}
              >
                <option value="">Select Type</option>
                {config.routineTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">toShow <span className="text-red-500">*</span></label>
              <select 
                className={`w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${highlightErrorFields.includes('to_show') ? 'border-red-500 bg-red-50' : 'border-slate-300'}`}
                value={routine.to_show || 'Yes'}
                onChange={e => setRoutine({ ...routine, to_show: e.target.value })}
              >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Display in Dropdown? <span className="text-red-500">*</span></label>
              <select 
                className={`w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${highlightErrorFields.includes('display_in_dropdown') ? 'border-red-500 bg-red-50' : 'border-slate-300'}`}
                value={routine.display_in_dropdown || 'Yes'}
                onChange={e => setRoutine({ ...routine, display_in_dropdown: e.target.value })}
              >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Capital Structure</label>
              <select 
                className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={routine.capital_structure}
                onChange={e => setRoutine({ ...routine, capital_structure: e.target.value })}
              >
                <option value="">Select Structure</option>
                {config.capitalStructures.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Region <span className="text-red-500">*</span></label>
              <select 
                className={`w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${highlightErrorFields.includes('region') ? 'border-red-500 bg-red-50' : 'border-slate-300'}`}
                value={routine.region}
                onChange={e => setRoutine({ ...routine, region: e.target.value })}
              >
                 <option value="">Select Region</option>
                {config.regions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className={`md:col-span-2 p-2 rounded-md border ${highlightErrorFields.includes('fund_types') ? 'border-red-300 bg-red-50' : 'border-transparent'}`}>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fund Types <span className="text-red-500">*</span></label>
              <div className="flex flex-wrap gap-3">
                {config.fundTypes.map(ft => (
                  <label key={ft} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="rounded text-blue-600 focus:ring-blue-500"
                      checked={routine.fund_types?.includes(ft)}
                      onChange={(e) => {
                        const current = routine.fund_types || [];
                        if (e.target.checked) setRoutine({ ...routine, fund_types: [...current, ft] });
                        else setRoutine({ ...routine, fund_types: current.filter(x => x !== ft) });
                      }}
                    />
                    {ft}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Section 2: Reports */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-4">
        <button 
          onClick={() => toggleSection('reports')}
          className="w-full flex items-center justify-between p-5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
        >
          <span className="font-semibold text-slate-700 flex items-center gap-2"><FileSpreadsheet size={18} /> 2. Associated Reports</span>
          {expandedSections.includes('reports') ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
        </button>
        
        {expandedSections.includes('reports') && (
          <div className="p-6">
            <table className="w-full text-left border-collapse mb-4">
              <thead>
                <tr className="text-xs uppercase text-slate-500 font-semibold border-b border-slate-200">
                  <th className="pb-2">Report Name</th>
                  <th className="pb-2 w-32">Optional?</th>
                  <th className="pb-2 w-16"></th>
                </tr>
              </thead>
              <tbody>
                {reports.map((rep, idx) => (
                  <tr key={rep.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2">
                      <select 
                        className="w-full border border-slate-300 rounded-md p-1 text-sm"
                        value={rep.report_name}
                        onChange={(e) => updateReport(idx, 'report_name', e.target.value)}
                      >
                        <option value="">Select Report...</option>
                        {availableReports.map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2">
                      <input 
                        type="checkbox" 
                        checked={rep.is_optional}
                        onChange={(e) => updateReport(idx, 'is_optional', e.target.checked)}
                        className="ml-2"
                      />
                    </td>
                    <td className="py-2 text-right">
                      <button 
                        onClick={() => removeReport(rep.id)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mt-2">
              <button 
                onClick={addReport}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
              >
                <Plus size={16} /> Add Report
              </button>
              
              <span className="hidden sm:inline text-slate-300">|</span>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input 
                   type="text"
                   placeholder="Type custom report name..."
                   className="flex-1 sm:w-64 border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                   value={customReportInput}
                   onChange={(e) => setCustomReportInput(e.target.value)}
                   onKeyDown={(e) => e.key === 'Enter' && addCustomReport()}
                />
                <button 
                   onClick={addCustomReport}
                   className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap"
                >
                   Add Custom
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Section 3: Mapping */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-4">
        <button 
          onClick={() => toggleSection('mapping')}
          className="w-full flex items-center justify-between p-5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
        >
          <span className="font-semibold text-slate-700 flex items-center gap-2"><Layout size={18} /> 3. CDM Field Mapping</span>
          {expandedSections.includes('mapping') ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
        </button>
        
        {expandedSections.includes('mapping') && (
          <div className="p-6">
            {reports.length === 0 ? (
              <p className="text-slate-400 text-sm italic">Add reports first to configure mapping.</p>
            ) : (
              reports.map(rep => (
                <div key={rep.id} className="mb-6">
                  <h4 className="text-sm font-bold text-slate-800 mb-2 border-b border-slate-100 pb-1">{rep.report_name || '(Unnamed Report)'}</h4>
                  <table className="w-full text-left text-sm mb-2">
                    <thead>
                      <tr className="text-slate-500">
                        <th className="pb-1 font-medium">Field Name</th>
                        <th className="pb-1 font-medium w-40">Data Type</th>
                        <th className="pb-1 font-medium w-24">Required</th>
                        <th className="pb-1 font-medium w-32">Blanks Allowed</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {mappings.filter(m => m.report_id === rep.id).map(map => (
                        <tr key={map.id} className="border-b border-slate-50">
                          <td className="py-1 pr-2">
                            <input 
                              type="text" 
                              className="w-full border border-slate-300 rounded px-2 py-1"
                              value={map.field_mapping_name}
                              onChange={(e) => updateMapping(map.id, 'field_mapping_name', e.target.value)}
                            />
                          </td>
                          <td className="py-1 pr-2">
                            <select
                              className="w-full border border-slate-300 rounded px-2 py-1"
                              value={map.data_type}
                              onChange={(e) => updateMapping(map.id, 'data_type', e.target.value)}
                            >
                              {config.dataTypes.map(dt => <option key={dt} value={dt}>{dt}</option>)}
                            </select>
                          </td>
                          <td className="py-1 text-center">
                            <input 
                              type="checkbox" 
                              checked={map.is_required}
                              onChange={(e) => updateMapping(map.id, 'is_required', e.target.checked)}
                            />
                          </td>
                          <td className="py-1 pr-2">
                            <select
                              className="w-full border border-slate-300 rounded px-2 py-1"
                              value={map.blanks_allowed || 'Allowed'}
                              onChange={(e) => updateMapping(map.id, 'blanks_allowed', e.target.value)}
                            >
                              <option value="Allowed">Allowed</option>
                              <option value="NotAllowed">NotAllowed</option>
                            </select>
                          </td>
                          <td className="py-1 text-right">
                            <button 
                              onClick={() => removeMapping(map.id)}
                              className="text-red-400 hover:text-red-600"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button 
                    onClick={() => addMapping(rep.id)}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <Plus size={14} /> Add Field
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Section 4: Attributes */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-4">
        <button 
          onClick={() => toggleSection('attributes')}
          className="w-full flex items-center justify-between p-5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
        >
          <span className="font-semibold text-slate-700 flex items-center gap-2"><Layout size={18} /> 4. Attribute Mapping</span>
          {expandedSections.includes('attributes') ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
        </button>
        
        {expandedSections.includes('attributes') && (
          <div className="p-6">
            {mappings.length === 0 ? (
              <p className="text-slate-400 text-sm italic">Define CDM mappings first to map attributes.</p>
            ) : (
              <>
                <table className="w-full text-left text-sm mb-4">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-200">
                      <th className="pb-2 font-medium w-1/3">Attribute Name</th>
                      <th className="pb-2 font-medium w-1/4">Report</th>
                      <th className="pb-2 font-medium">CDM Mapping Field</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {attributes.map((attr) => {
                      // Determine current report based on current mapping ID
                      const currentMapping = mappings.find(m => m.id === attr.cdm_mapping_id);
                      const currentReportId = currentMapping?.report_id || (reports.length > 0 ? reports[0].id : '');
                      
                      return (
                        <tr key={attr.id} className="border-b border-slate-50">
                          <td className="py-2 pr-2">
                            <input 
                              type="text" 
                              className="w-full border border-slate-300 rounded px-2 py-1"
                              value={attr.attribute_name}
                              onChange={(e) => updateAttribute(attr.id, 'attribute_name', e.target.value)}
                              placeholder="Attribute Name"
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <select 
                              className="w-full border border-slate-300 rounded px-2 py-1"
                              value={currentReportId}
                              onChange={(e) => updateAttribute(attr.id, 'report_id', e.target.value)}
                            >
                              {reports.map(r => (
                                <option key={r.id} value={r.id}>{r.report_name || 'Unnamed Report'}</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 pr-2">
                            <select 
                              className="w-full border border-slate-300 rounded px-2 py-1"
                              value={attr.cdm_mapping_id}
                              onChange={(e) => updateAttribute(attr.id, 'cdm_mapping_id', e.target.value)}
                            >
                              {mappings
                                .filter(m => m.report_id === currentReportId)
                                .map(m => (
                                  <option key={m.id} value={m.id}>{m.field_mapping_name || 'Unnamed Field'}</option>
                                ))
                              }
                              {mappings.filter(m => m.report_id === currentReportId).length === 0 && 
                                <option value="" disabled>No mappings for this report</option>
                              }
                            </select>
                          </td>
                          <td className="py-2 text-right">
                            <button 
                              onClick={() => setAttributes(attributes.filter(a => a.id !== attr.id))}
                              className="text-red-400 hover:text-red-600"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <button 
                  onClick={addAttribute}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                >
                  <Plus size={16} /> Add Attribute
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Section 5: Output Sheets */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-4">
        <button 
          onClick={() => toggleSection('sheets')}
          className="w-full flex items-center justify-between p-5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
        >
          <span className="font-semibold text-slate-700 flex items-center gap-2"><FileSpreadsheet size={18} /> 5. Output Sheets</span>
          {expandedSections.includes('sheets') ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
        </button>
        
        {expandedSections.includes('sheets') && (
          <div className="p-6">
            <table className="w-full text-left border-collapse mb-4">
              <thead>
                <tr className="text-xs uppercase text-slate-500 font-semibold border-b border-slate-200">
                  <th className="pb-2">Sheet Name</th>
                  <th className="pb-2 w-16"></th>
                </tr>
              </thead>
              <tbody>
                {sheets.map((sheet) => (
                  <tr key={sheet.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2">
                      <input 
                        type="text" 
                        className="w-full border border-slate-300 rounded-md p-1 text-sm"
                        value={sheet.sheet_name}
                        onChange={(e) => updateSheet(sheet.id, e.target.value)}
                        placeholder="Sheet Name"
                      />
                    </td>
                    <td className="py-2 text-right">
                      <button 
                        onClick={() => removeSheet(sheet.id)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button 
              onClick={addSheet}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
            >
              <Plus size={16} /> Add Sheet
            </button>
          </div>
        )}
      </div>

      {/* Section 6: RDEs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-4">
        <button 
          onClick={() => toggleSection('rdes')}
          className="w-full flex items-center justify-between p-5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
        >
          <span className="font-semibold text-slate-700 flex items-center gap-2"><Database size={18} /> 6. Sheet Details (RDEs)</span>
          {expandedSections.includes('rdes') ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
        </button>
        
        {expandedSections.includes('rdes') && (
          <div className="p-6">
            {sheets.length === 0 ? (
              <p className="text-slate-400 text-sm italic">Add output sheets first to configure RDEs.</p>
            ) : (
              sheets.map(sheet => (
                <div key={sheet.id} className="mb-6">
                  <h4 className="text-sm font-bold text-slate-800 mb-2 border-b border-slate-100 pb-1">{sheet.sheet_name || '(Unnamed Sheet)'}</h4>
                  <table className="w-full text-left text-sm mb-2">
                    <thead>
                      <tr className="text-slate-500">
                        <th className="pb-1 font-medium w-1/3">Field Name</th>
                        <th className="pb-1 font-medium">Fill Color</th>
                        <th className="pb-1 font-medium">Format</th>
                        <th className="pb-1 font-medium w-16 text-center">Order</th>
                        <th className="pb-1 w-24">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rdes.filter(r => r.output_sheet_id === sheet.id).map((rde) => (
                         <tr key={rde.id} className="border-b border-slate-50">
                            <td className="py-1 pr-2">
                              <input 
                                type="text"
                                className="w-full border border-slate-300 rounded px-2 py-1"
                                value={rde.field_name}
                                onChange={(e) => updateRde(rde.id, 'field_name', e.target.value)}
                              />
                            </td>
                            <td className="py-1 pr-2">
                               <div className="flex items-center gap-2">
                                 <input 
                                   type="color"
                                   className="w-8 h-8 p-0 border-0 rounded cursor-pointer"
                                   value={rde.fill_color_format}
                                   onChange={(e) => updateRde(rde.id, 'fill_color_format', e.target.value)}
                                 />
                                 <span className="text-xs text-slate-500 font-mono">{rde.fill_color_format}</span>
                               </div>
                            </td>
                            <td className="py-1 pr-2">
                              <input 
                                type="text"
                                className="w-full border border-slate-300 rounded px-2 py-1"
                                value={rde.data_format}
                                onChange={(e) => updateRde(rde.id, 'data_format', e.target.value)}
                              />
                            </td>
                            <td className="py-1 pr-2">
                              <input 
                                type="number"
                                className="w-full border border-slate-300 rounded px-2 py-1 text-center"
                                value={rde.column_order}
                                onChange={(e) => updateRde(rde.id, 'column_order', parseInt(e.target.value))}
                              />
                            </td>
                            <td className="py-1 text-right flex items-center justify-end gap-1">
                              <button 
                                onClick={() => openVerificationModal(rde)}
                                className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                                title="Verification Details"
                              >
                                <Settings size={14} />
                              </button>
                              <button 
                                onClick={() => setRdes(rdes.filter(r => r.id !== rde.id))}
                                className="p-1 text-red-400 hover:text-red-600"
                                title="Delete Row"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                         </tr>
                      ))}
                    </tbody>
                  </table>
                  <button 
                    onClick={() => addRde(sheet.id)}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <Plus size={14} /> Add RDE Row
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      
      {/* Section 7: Helper Routines */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-4">
         <button 
          onClick={() => toggleSection('helpers')}
          className="w-full flex items-center justify-between p-5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
        >
          <span className="font-semibold text-slate-700 flex items-center gap-2"><ListChecks size={18} /> 7. Helper Routines</span>
          {expandedSections.includes('helpers') ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
        </button>
        
        {expandedSections.includes('helpers') && (
           <div className="p-6">
              <div className="mb-4">
                 <label className="block text-sm font-medium text-slate-700 mb-2">Selected Helper Routines</label>
                 <div className="flex flex-wrap gap-2 p-3 border border-slate-200 rounded-lg min-h-[60px] bg-slate-50">
                    {routine.helper_routines?.map(hr => (
                       <div key={hr} className="flex items-center gap-1 bg-white border border-slate-300 text-slate-700 px-3 py-1 rounded-full text-sm shadow-sm">
                          <span>{hr}</span>
                          <button onClick={() => removeHelperRoutine(hr)} className="hover:text-red-500 transition-colors"><X size={14} /></button>
                       </div>
                    ))}
                    {(!routine.helper_routines || routine.helper_routines.length === 0) && (
                       <span className="text-slate-400 text-sm italic self-center">No helper routines selected.</span>
                    )}
                 </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Add Existing</label>
                    <select 
                       className="w-full border border-slate-300 rounded-md p-2 text-sm"
                       onChange={(e) => {
                          if (e.target.value) {
                             addHelperRoutine(e.target.value);
                             e.target.value = '';
                          }
                       }}
                    >
                       <option value="">Select a helper routine...</option>
                       {availableHelperRoutines.filter(hr => !routine.helper_routines?.includes(hr)).map(hr => (
                          <option key={hr} value={hr}>{hr}</option>
                       ))}
                    </select>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Add Custom</label>
                    <div className="flex gap-2">
                       <input 
                          type="text" 
                          className="flex-1 border border-slate-300 rounded-md p-2 text-sm"
                          placeholder="New helper routine name..."
                          value={newHelperRoutineInput}
                          onChange={(e) => setNewHelperRoutineInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddCustomHelperRoutine()}
                       />
                       <button 
                          onClick={handleAddCustomHelperRoutine}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-md font-medium"
                       >
                          Add
                       </button>
                    </div>
                 </div>
              </div>
           </div>
        )}
      </div>
      
      {/* Section 8: User Inputs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
         <button 
          onClick={() => toggleSection('userInputs')}
          className="w-full flex items-center justify-between p-5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
        >
          <span className="font-semibold text-slate-700 flex items-center gap-2"><MousePointerClick size={18} /> 8. User Inputs</span>
          {expandedSections.includes('userInputs') ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
        </button>
        
        {expandedSections.includes('userInputs') && (
           <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm mb-4">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-200">
                      <th className="pb-2 font-medium w-48">Name</th>
                      <th className="pb-2 font-medium w-32">Location</th>
                      <th className="pb-2 font-medium w-32">Type</th>
                      <th className="pb-2 font-medium w-48">Validations</th>
                      <th className="pb-2 font-medium w-20">Min</th>
                      <th className="pb-2 font-medium w-20">Max</th>
                      <th className="pb-2 font-medium w-16 text-center">Req.</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {userInputs.map((ui) => (
                      <tr key={ui.id} className="border-b border-slate-50">
                        <td className="py-2 pr-2">
                          <input 
                            type="text" 
                            className="w-full border border-slate-300 rounded px-2 py-1"
                            value={ui.user_input_name}
                            onChange={(e) => updateUserInput(ui.id, 'user_input_name', e.target.value)}
                            placeholder="Name"
                          />
                        </td>
                        <td className="py-2 pr-2">
                           <select 
                              className="w-full border border-slate-300 rounded px-2 py-1"
                              value={ui.input_location}
                              onChange={(e) => updateUserInput(ui.id, 'input_location', e.target.value)}
                           >
                              {INPUT_LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                           </select>
                        </td>
                        <td className="py-2 pr-2">
                           <select 
                              className="w-full border border-slate-300 rounded px-2 py-1"
                              value={ui.textbox_type}
                              onChange={(e) => updateUserInput(ui.id, 'textbox_type', e.target.value)}
                           >
                              {TEXTBOX_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                           </select>
                        </td>
                        <td className="py-2 pr-2">
                           <input 
                            type="text" 
                            className="w-full border border-slate-300 rounded px-2 py-1"
                            value={ui.validations}
                            onChange={(e) => updateUserInput(ui.id, 'validations', e.target.value)}
                            placeholder="e.g. Numerical"
                          />
                        </td>
                        <td className="py-2 pr-2">
                           <input 
                            type="text" 
                            className="w-full border border-slate-300 rounded px-2 py-1"
                            value={ui.min_value}
                            onChange={(e) => updateUserInput(ui.id, 'min_value', e.target.value)}
                          />
                        </td>
                        <td className="py-2 pr-2">
                           <input 
                            type="text" 
                            className="w-full border border-slate-300 rounded px-2 py-1"
                            value={ui.max_value}
                            onChange={(e) => updateUserInput(ui.id, 'max_value', e.target.value)}
                          />
                        </td>
                        <td className="py-2 text-center">
                           <input 
                              type="checkbox" 
                              checked={ui.is_mandatory}
                              onChange={(e) => updateUserInput(ui.id, 'is_mandatory', e.target.checked)}
                           />
                        </td>
                        <td className="py-2 text-right">
                          <button 
                            onClick={() => removeUserInput(ui.id)}
                            className="text-red-400 hover:text-red-600"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button 
                onClick={addUserInput}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
              >
                <Plus size={16} /> Add User Input
              </button>
           </div>
        )}
      </div>

      {/* --- Modals --- */}
      
      {/* Validation Error Modal */}
      {validationModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-96 p-6">
            <div className="flex items-center gap-3 text-red-600 mb-4">
               <AlertTriangle size={24} />
               <h3 className="text-lg font-bold text-slate-800">Required Fields Missing</h3>
            </div>
            
            <p className="text-slate-600 mb-4 text-sm">
               Please fill in the following mandatory fields to save the routine:
            </p>
            
            <ul className="list-disc list-inside text-sm text-red-600 mb-6 bg-red-50 p-3 rounded-lg border border-red-100">
               {validationErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
               ))}
            </ul>

            <div className="flex justify-end">
              <button 
                onClick={() => setValidationModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                OK, I'll fix it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Version Modal */}
      {versionModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-96 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Copy size={20} className="text-blue-600"/> Save as New Version</h3>
            
            <label className="block text-sm font-medium text-slate-700 mb-1">New Version Name</label>
            {/* CHANGED: Using dropdown instead of text input */}
            <select 
               className="w-full border border-slate-300 rounded-md p-2 mb-6 focus:ring-2 focus:ring-blue-500 focus:outline-none"
               value={newVersionName}
               onChange={(e) => setNewVersionName(e.target.value)}
            >
               <option value="">Select Version...</option>
               {(config.versions || []).map(v => (
                  <option key={v} value={v}>{v}</option>
               ))}
            </select>

            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setVersionModalOpen(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveAsNewVersion}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                Save New Version
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-96 p-6">
            <div className="flex items-center gap-3 text-red-600 mb-4">
               <AlertTriangle size={24} />
               <h3 className="text-lg font-bold text-slate-800">Delete Routine?</h3>
            </div>
            
            <p className="text-slate-600 mb-6 text-sm">
               Are you sure you want to delete <strong>{routine.routine_name}</strong>? This action cannot be undone and will remove all associated reports, mappings, and sheets.
            </p>

            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                Delete Routine
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verification Details Modal */}
      {verificationModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-200">
               <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Settings className="text-slate-500" /> Verification Details
               </h3>
               <p className="text-xs text-slate-500 mt-1">Configure additional RDE properties.</p>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
               <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Document Type</label>
                  <input 
                     className="w-full border border-slate-300 rounded-md p-2 text-sm"
                     value={verificationData.document_type || ''}
                     onChange={(e) => setVerificationData({...verificationData, document_type: e.target.value})}
                  />
               </div>
               <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Verification Name</label>
                  <input 
                     className="w-full border border-slate-300 rounded-md p-2 text-sm"
                     value={verificationData.verification_rde_name || ''}
                     onChange={(e) => setVerificationData({...verificationData, verification_rde_name: e.target.value})}
                  />
               </div>
               <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Required Status</label>
                  <select 
                     className="w-full border border-slate-300 rounded-md p-2 text-sm"
                     value={verificationData.verification_required_status || 'Required'}
                     onChange={(e) => setVerificationData({...verificationData, verification_required_status: e.target.value})}
                  >
                     <option value="Required">Required</option>
                     <option value="Secondary">Secondary</option>
                  </select>
               </div>
               <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Data Type</label>
                  <input 
                     className="w-full border border-slate-300 rounded-md p-2 text-sm"
                     value={verificationData.verification_data_type || ''}
                     onChange={(e) => setVerificationData({...verificationData, verification_data_type: e.target.value})}
                  />
               </div>
               <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Description</label>
                  <textarea 
                     className="w-full border border-slate-300 rounded-md p-2 text-sm h-20"
                     value={verificationData.field_description || ''}
                     onChange={(e) => setVerificationData({...verificationData, field_description: e.target.value})}
                  />
               </div>
               
               <div className="border-t border-slate-100 pt-4 mt-2">
                  <h4 className="text-sm font-bold text-slate-800 mb-3">Legacy Mapping</h4>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Old Model</label>
                        <input 
                           className="w-full border border-slate-300 rounded-md p-2 text-sm font-mono bg-slate-50"
                           value={verificationData.old_model_name || ''}
                           onChange={(e) => setVerificationData({...verificationData, old_model_name: e.target.value})}
                        />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Old Mapping</label>
                        <input 
                           className="w-full border border-slate-300 rounded-md p-2 text-sm font-mono bg-slate-50"
                           value={verificationData.old_model_mapping || ''}
                           onChange={(e) => setVerificationData({...verificationData, old_model_mapping: e.target.value})}
                        />
                     </div>
                  </div>
               </div>

               <div className="border-t border-slate-100 pt-4 mt-2">
                  <h4 className="text-sm font-bold text-slate-800 mb-3">Target Mapping</h4>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">New Model</label>
                        <input 
                           className="w-full border border-slate-300 rounded-md p-2 text-sm font-mono bg-slate-50"
                           value={verificationData.new_model_name || ''}
                           onChange={(e) => setVerificationData({...verificationData, new_model_name: e.target.value})}
                        />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">New Mapping</label>
                        <input 
                           className="w-full border border-slate-300 rounded-md p-2 text-sm font-mono bg-slate-50"
                           value={verificationData.new_model_mapping || ''}
                           onChange={(e) => setVerificationData({...verificationData, new_model_mapping: e.target.value})}
                        />
                     </div>
                     <div className="col-span-2">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Table Name</label>
                        <input 
                           className="w-full border border-slate-300 rounded-md p-2 text-sm font-mono bg-slate-50"
                           value={verificationData.table_name || ''}
                           onChange={(e) => setVerificationData({...verificationData, table_name: e.target.value})}
                        />
                     </div>
                  </div>
               </div>
            </div>

            <div className="p-5 border-t border-slate-200 bg-slate-50 flex justify-end gap-2 rounded-b-xl">
               <button 
                  onClick={() => setVerificationModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-white border border-transparent hover:border-slate-300 rounded-lg text-sm font-medium transition-colors"
               >
                  Cancel
               </button>
               <button 
                  onClick={saveVerificationDetails}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors"
               >
                  Save Details
               </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default RoutineForm;