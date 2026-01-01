import {
  Routine, Report, CDMMapping, Attribute, OutputSheet, SheetDetail, UserInput, ActivityLog,
  RoutineFilters, AppConfiguration, ConfigCategory, DefaultMapping
} from '../types';
import {
  MOCK_ROUTINES, MOCK_REPORTS, MOCK_CDM_MAPPINGS, MOCK_ATTRIBUTES, MOCK_OUTPUT_SHEETS, MOCK_SHEET_DETAILS, MOCK_USER_INPUTS,
  VERSIONS, ROUTINE_TYPES, FUND_TYPES, REGIONS, CAPITAL_STRUCTURES, DATA_TYPES, PREDEFINED_REPORTS, HELPER_ROUTINES_LIST
} from '../constants';

class DataService {
  private routines: Routine[] = [];
  private reports: Report[] = [];
  private cdmMappings: CDMMapping[] = [];
  private attributes: Attribute[] = [];
  private outputSheets: OutputSheet[] = [];
  private sheetDetails: SheetDetail[] = [];
  private userInputs: UserInput[] = [];
  private activityLogs: ActivityLog[] = [];
  private defaultMappings: DefaultMapping[] = [];

  private isInitialized = false;
  private useApi = true;

  private config: AppConfiguration = {
    versions: [],
    routineTypes: [],
    fundTypes: [],
    regions: [],
    capitalStructures: [],
    dataTypes: [],
    reportNames: [],
    helperRoutines: []
  };

  constructor() { }

  // --- API INTEGRATION ---

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const response = await fetch('/api/data');
      if (!response.ok) throw new Error('Failed to fetch data');

      const data = await response.json();

      this.routines = data.routines;
      this.reports = data.reports;
      this.cdmMappings = data.cdmMappings;
      this.attributes = data.attributes;
      this.outputSheets = data.outputSheets;
      this.sheetDetails = data.sheetDetails;
      this.userInputs = data.userInputs || [];
      this.activityLogs = data.activityLogs || [];
      this.defaultMappings = data.defaultMappings || [];
      this.config = data.config;
      this.useApi = true;

      this.isInitialized = true;
    } catch (e) {
      console.warn("API connection failed, falling back to local storage/mock data");
      this.useApi = false;
      this.fallbackToLocalOrMock();
    }
  }

  private fallbackToLocalOrMock() {
    const stored = localStorage.getItem('amap_data');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        this.routines = data.routines || [];
        this.reports = data.reports || [];
        this.cdmMappings = data.cdmMappings || [];
        this.attributes = data.attributes || [];
        this.outputSheets = data.outputSheets || [];
        this.sheetDetails = data.sheetDetails || [];
        this.userInputs = data.userInputs || [];
        this.activityLogs = data.activityLogs || [];
        this.defaultMappings = data.defaultMappings || [];
        this.config = data.config || this.getDefaultConfig();
      } catch (e) {
        console.error("Failed to parse local storage data", e);
        this.loadMockData();
      }
    } else {
      this.loadMockData();
    }
    this.isInitialized = true;
  }

  private loadMockData() {
    this.routines = [...MOCK_ROUTINES];
    this.reports = [...MOCK_REPORTS];
    this.cdmMappings = [...MOCK_CDM_MAPPINGS];
    this.attributes = [...MOCK_ATTRIBUTES];
    this.outputSheets = [...MOCK_OUTPUT_SHEETS];
    this.sheetDetails = [...MOCK_SHEET_DETAILS];
    this.userInputs = [...MOCK_USER_INPUTS];
    this.activityLogs = [];
    this.defaultMappings = [];
    this.config = this.getDefaultConfig();
  }

  private getDefaultConfig(): AppConfiguration {
    return {
      versions: [...VERSIONS],
      routineTypes: [...ROUTINE_TYPES],
      fundTypes: [...FUND_TYPES],
      regions: [...REGIONS],
      capitalStructures: [...CAPITAL_STRUCTURES],
      dataTypes: [...DATA_TYPES],
      reportNames: [...PREDEFINED_REPORTS],
      helperRoutines: [...HELPER_ROUTINES_LIST]
    };
  }

  private saveToLocalStorage() {
    const data = {
      routines: this.routines,
      reports: this.reports,
      cdmMappings: this.cdmMappings,
      attributes: this.attributes,
      outputSheets: this.outputSheets,
      sheetDetails: this.sheetDetails,
      userInputs: this.userInputs,
      activityLogs: this.activityLogs,
      defaultMappings: this.defaultMappings,
      config: this.config
    };
    localStorage.setItem('amap_data', JSON.stringify(data));
  }

  private async saveToApi(routineId: string, username: string) {
    if (!this.useApi) {
      this.saveToLocalStorage();
      return;
    }

    const routine = this.routines.find(r => r.id === routineId);
    if (!routine) return;

    // Gather related data
    const reports = this.reports.filter(r => r.routine_id === routineId);
    const reportIds = reports.map(r => r.id);
    const mappings = this.cdmMappings.filter(m => reportIds.includes(m.report_id));
    const mappingIds = mappings.map(m => m.id);
    const attributes = this.attributes.filter(a => mappingIds.includes(a.cdm_mapping_id));
    const outputSheets = this.outputSheets.filter(s => s.routine_id === routineId);
    const sheetIds = outputSheets.map(s => s.id);
    const sheetDetails = this.sheetDetails.filter(d => sheetIds.includes(d.output_sheet_id));
    const userInputs = this.userInputs.filter(u => u.routine_id === routineId);

    const payload = {
      routine, reports, mappings, attributes, outputSheets, sheetDetails, userInputs, username
    };

    try {
      const response = await fetch('/api/routine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('API save failed');
    } catch (e) {
      console.error("Failed to save to API, falling back to local storage", e);
      this.useApi = false; // Switch to offline mode
      this.saveToLocalStorage();
    }
  }

  // --- CONFIGURATION ---

  getConfig(): AppConfiguration {
    return { ...this.config };
  }

  updateConfig(category: ConfigCategory, newValues: string[]): void {
    this.config[category] = newValues;

    if (this.useApi) {
      fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, values: newValues })
      }).catch(e => {
        console.warn("Failed to save config to API", e);
        this.useApi = false;
        this.saveToLocalStorage();
      });
    } else {
      this.saveToLocalStorage();
    }
  }

  addConfigOption(category: ConfigCategory, value: string): void {
    if (!this.config[category].includes(value)) {
      const newValues = [...this.config[category], value];
      this.updateConfig(category, newValues);
    }
  }

  removeConfigOption(category: ConfigCategory, value: string): void {
    const newValues = this.config[category].filter(item => item !== value);
    this.updateConfig(category, newValues);
  }

  // --- DEFAULT MAPPINGS ---

  getDefaultMappings(reportName?: string): DefaultMapping[] {
    if (reportName) {
      return this.defaultMappings.filter(m => m.report_name === reportName);
    }
    return this.defaultMappings;
  }

  async saveDefaultMappings(reportName: string, mappings: DefaultMapping[], username: string): Promise<void> {
    // Update local state
    this.defaultMappings = this.defaultMappings.filter(m => m.report_name !== reportName);
    this.defaultMappings.push(...mappings);

    if (this.useApi) {
      try {
        await fetch('/api/saveDefaultMappings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ report_name: reportName, mappings, username })
        });
      } catch (e) {
        console.error("Failed to save default mappings to API", e);
        this.saveToLocalStorage();
      }
    } else {
      this.saveToLocalStorage();
    }
  }

  // --- READ ---

  getRoutines(filters: RoutineFilters): Routine[] {
    // 1. Apply Date Filters first
    let filtered = this.routines;
    if (filters.startDate && filters.endDate) {
      const start = new Date(filters.startDate).getTime();
      const end = new Date(filters.endDate).getTime();
      filtered = this.routines.filter(r => {
        const rDate = new Date(r.last_edited_date).getTime();
        return rDate >= start && rDate <= end;
      });
    }

    // 2. Apply Version Filtering
    if (filters.version) {
      const versionList = this.config.versions || VERSIONS;
      const targetIdx = versionList.indexOf(filters.version);

      if (targetIdx === -1) {
        return filtered.filter(r => r.version === filters.version);
      }

      const groups = new Map<string, Routine[]>();
      filtered.forEach(r => {
        const existing = groups.get(r.routine_name) || [];
        existing.push(r);
        groups.set(r.routine_name, existing);
      });

      const effectiveRoutines: Routine[] = [];

      groups.forEach((groupRoutines) => {
        const exactMatch = groupRoutines.find(r => r.version === filters.version);
        if (exactMatch) {
          effectiveRoutines.push(exactMatch);
          return;
        }

        const candidates = groupRoutines.filter(r => {
          const rIdx = versionList.indexOf(r.version);
          return rIdx !== -1 && rIdx < targetIdx;
        });

        if (candidates.length > 0) {
          candidates.sort((a, b) => {
            return versionList.indexOf(b.version) - versionList.indexOf(a.version);
          });
          effectiveRoutines.push(candidates[0]);
        }
      });

      return effectiveRoutines;
    }
    return filtered;
  }

  getRoutineById(id: string): Routine | undefined {
    return this.routines.find(r => r.id === id);
  }

  getReportsByRoutineId(routineId: string): Report[] {
    return this.reports.filter(r => r.routine_id === routineId);
  }

  getCDMMappingsByReportId(reportId: string): CDMMapping[] {
    return this.cdmMappings.filter(m => m.report_id === reportId);
  }

  getAttributesByMappingId(mappingId: string): Attribute[] {
    return this.attributes.filter(a => a.cdm_mapping_id === mappingId);
  }

  getOutputSheetsByRoutineId(routineId: string): OutputSheet[] {
    return this.outputSheets
      .filter(os => os.routine_id === routineId)
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
  }

  getSheetDetailsBySheetId(sheetId: string): SheetDetail[] {
    return this.sheetDetails.filter(sd => sd.output_sheet_id === sheetId);
  }

  getUserInputsByRoutineId(routineId: string): UserInput[] {
    return this.userInputs.filter(ui => ui.routine_id === routineId);
  }

  getActivityLogs(): ActivityLog[] {
    return this.activityLogs;
  }

  // --- VIEWS ---

  getReportsView(filters: RoutineFilters) {
    const routines = this.getRoutines(filters);
    const routineIds = routines.map(r => r.id);
    return this.reports
      .filter(rep => routineIds.includes(rep.routine_id))
      .map(rep => {
        const routine = routines.find(r => r.id === rep.routine_id);
        return { ...rep, routine_name: routine?.routine_name || 'Unknown' };
      });
  }

  getCDMMappingsView(filters: RoutineFilters) {
    const reports = this.getReportsView(filters);
    const reportIds = reports.map(r => r.id);
    return this.cdmMappings
      .filter(m => reportIds.includes(m.report_id))
      .map(m => {
        const report = reports.find(r => r.id === m.report_id);
        return {
          ...m,
          report_name: report?.report_name || 'Unknown',
          routine_name: report?.routine_name || 'Unknown'
        };
      });
  }

  getAttributeView(filters: RoutineFilters) {
    const mappings = this.getCDMMappingsView(filters);
    const mappingIds = mappings.map(m => m.id);
    return this.attributes
      .filter(a => mappingIds.includes(a.cdm_mapping_id))
      .map(a => {
        const mapping = mappings.find(m => m.id === a.cdm_mapping_id);
        return {
          ...a,
          cdm_mapping_name: mapping?.field_mapping_name || 'Unknown',
          report_name: mapping?.report_name || 'Unknown'
        };
      });
  }

  getSheetsView(filters: RoutineFilters) {
    const routines = this.getRoutines(filters);
    return this.outputSheets
      .filter(os => routines.some(r => r.id === os.routine_id))
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
      .map(os => {
        const routine = routines.find(r => r.id === os.routine_id);
        return { ...os, routine_name: routine?.routine_name || 'Unknown' };
      });
  }

  getSheetDetailsView(filters: RoutineFilters) {
    const sheets = this.getSheetsView(filters);
    const sheetIds = sheets.map(s => s.id);
    return this.sheetDetails
      .filter(sd => sheetIds.includes(sd.output_sheet_id))
      .map(sd => {
        const sheet = sheets.find(s => s.id === sd.output_sheet_id);
        return {
          ...sd,
          sheet_name: sheet?.sheet_name || 'Unknown',
          routine_name: sheet?.routine_name || 'Unknown'
        };
      });
  }

  getUserInputsView(filters: RoutineFilters) {
    const routines = this.getRoutines(filters);
    const routineIds = routines.map(r => r.id);
    return this.userInputs
      .filter(ui => routineIds.includes(ui.routine_id))
      .map(ui => {
        const routine = routines.find(r => r.id === ui.routine_id);
        return { ...ui, routine_name: routine?.routine_name || 'Unknown' };
      });
  }

  // --- WRITE ---

  saveRoutine(
    routine: Routine,
    reports: Report[],
    mappings: CDMMapping[],
    attributes: Attribute[],
    outputSheets: OutputSheet[],
    sheetDetails: SheetDetail[],
    userInputs: UserInput[],
    username: string
  ): void {
    const existingIndex = this.routines.findIndex(r => r.id === routine.id);
    const now = new Date().toISOString();
    const updatedRoutine = { ...routine, last_edited_date: now };

    if (existingIndex >= 0) {
      this.routines[existingIndex] = updatedRoutine;
    } else {
      this.routines.push(updatedRoutine);
    }

    // Update in-memory state
    const currentReportIds = this.reports.filter(r => r.routine_id === routine.id).map(r => r.id);
    const currentMappingIds = this.cdmMappings.filter(m => currentReportIds.includes(m.report_id)).map(m => m.id);

    this.reports = this.reports.filter(r => r.routine_id !== routine.id);
    this.cdmMappings = this.cdmMappings.filter(m => !currentReportIds.includes(m.report_id));
    this.attributes = this.attributes.filter(a => !currentMappingIds.includes(a.cdm_mapping_id));

    const currentSheetIds = this.outputSheets.filter(s => s.routine_id === routine.id).map(s => s.id);
    let maxOrder = this.outputSheets.reduce((max, s) => Math.max(max, s.order_index || 0), 0);
    const finalOutputSheets = outputSheets.map(s => {
      if (s.order_index === undefined || s.order_index === 0) {
        maxOrder++;
        return { ...s, order_index: maxOrder };
      }
      return s;
    });

    this.outputSheets = this.outputSheets.filter(s => s.routine_id !== routine.id);
    this.sheetDetails = this.sheetDetails.filter(sd => !currentSheetIds.includes(sd.output_sheet_id));

    this.userInputs = this.userInputs.filter(ui => ui.routine_id !== routine.id);

    this.reports.push(...reports);
    this.cdmMappings.push(...mappings);
    this.attributes.push(...attributes);
    this.outputSheets.push(...finalOutputSheets);
    this.sheetDetails.push(...sheetDetails);
    this.userInputs.push(...userInputs);

    // Persist to Backend or Local Storage
    this.saveToApi(routine.id, username);
  }

  deleteRoutine(id: string): void {
    // Optimistic UI update
    const reportIds = this.reports.filter(r => r.routine_id === id).map(r => r.id);
    const mappingIds = this.cdmMappings.filter(m => reportIds.includes(m.report_id)).map(m => m.id);
    const sheetIds = this.outputSheets.filter(s => s.routine_id === id).map(s => s.id);

    this.attributes = this.attributes.filter(a => !mappingIds.includes(a.cdm_mapping_id));
    this.cdmMappings = this.cdmMappings.filter(m => !reportIds.includes(m.report_id));
    this.reports = this.reports.filter(r => r.routine_id !== id);

    this.sheetDetails = this.sheetDetails.filter(sd => !sheetIds.includes(sd.output_sheet_id));
    this.outputSheets = this.outputSheets.filter(s => s.routine_id !== id);
    this.userInputs = this.userInputs.filter(ui => ui.routine_id !== id);
    this.routines = this.routines.filter(r => r.id !== id);

    // Call API if connected, else update local storage
    if (this.useApi) {
      fetch(`/api/routine/delete?id=${id}`, { method: 'DELETE' }).catch(() => this.saveToLocalStorage());
    } else {
      this.saveToLocalStorage();
    }
  }

  updateSheetDetail(id: string, updates: Partial<SheetDetail>, username: string): void {
    const idx = this.sheetDetails.findIndex(sd => sd.id === id);
    if (idx !== -1) {
      this.sheetDetails[idx] = { ...this.sheetDetails[idx], ...updates };
      // Save full routine to ensure consistency
      const sheet = this.outputSheets.find(s => s.id === this.sheetDetails[idx].output_sheet_id);
      if (sheet) {
        this.saveToApi(sheet.routine_id, username);
      }
    }
  }

  updateSheetOrders(orderedSheets: OutputSheet[], username: string) {
    const updateMap = new Map(orderedSheets.map(s => [s.id, s.order_index]));
    this.outputSheets = this.outputSheets.map(sheet => {
      if (updateMap.has(sheet.id)) {
        return { ...sheet, order_index: updateMap.get(sheet.id)! };
      }
      return sheet;
    });
    // Trigger save for each affected routine (inefficient but safe) or bulk update
    // For now, just save one if user only drags sheets of one routine
    const routineId = orderedSheets[0]?.routine_id;
    if (routineId) this.saveToApi(routineId, username);
  }

  // Deep copy a routine to a new version
  createNewVersion(originalRoutineId: string, newVersion: string, username: string): Routine | null {
    const original = this.getRoutineById(originalRoutineId);
    if (!original) return null;

    const generateId = () => Math.random().toString(36).substring(2, 10);

    const newRoutineId = generateId();
    const newRoutine: Routine = {
      ...original,
      id: newRoutineId,
      version: newVersion,
      last_edited_date: new Date().toISOString()
    };

    const originalReports = this.getReportsByRoutineId(originalRoutineId);
    const newReports: Report[] = [];
    const newMappings: CDMMapping[] = [];
    const newAttributes: Attribute[] = [];

    originalReports.forEach(rep => {
      const newRepId = generateId();
      newReports.push({ ...rep, id: newRepId, routine_id: newRoutineId });

      const originalMappings = this.getCDMMappingsByReportId(rep.id);
      originalMappings.forEach(map => {
        const newMapId = generateId();
        newMappings.push({ ...map, id: newMapId, report_id: newRepId });

        const originalAttrs = this.getAttributesByMappingId(map.id);
        originalAttrs.forEach(attr => {
          newAttributes.push({ ...attr, id: generateId(), cdm_mapping_id: newMapId });
        });
      });
    });

    const originalSheets = this.getOutputSheetsByRoutineId(originalRoutineId);
    const newSheets: OutputSheet[] = [];
    const newSheetDetails: SheetDetail[] = [];

    let maxOrder = this.outputSheets.reduce((max, s) => Math.max(max, s.order_index || 0), 0);

    originalSheets.forEach(sheet => {
      const newSheetId = generateId();
      maxOrder++;
      newSheets.push({
        ...sheet,
        id: newSheetId,
        routine_id: newRoutineId,
        order_index: maxOrder
      });

      const originalDetails = this.getSheetDetailsBySheetId(sheet.id);
      originalDetails.forEach(detail => {
        newSheetDetails.push({ ...detail, id: generateId(), output_sheet_id: newSheetId });
      });
    });

    const originalUserInputs = this.getUserInputsByRoutineId(originalRoutineId);
    const newUserInputs = originalUserInputs.map(ui => ({
      ...ui,
      id: generateId(),
      routine_id: newRoutineId
    }));

    this.routines.push(newRoutine);
    this.reports.push(...newReports);
    this.cdmMappings.push(...newMappings);
    this.attributes.push(...newAttributes);
    this.outputSheets.push(...newSheets);
    this.sheetDetails.push(...newSheetDetails);
    this.userInputs.push(...newUserInputs);

    this.saveToApi(newRoutine.id, username);

    return newRoutine;
  }
}

export const dataService = new DataService();
