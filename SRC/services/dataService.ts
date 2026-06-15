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
  private accessToken: string | null = null;
  public initError: string | null = null;

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

  setAccessToken(token: string | null): void {
    this.accessToken = token;
    if (!token) this.reset();
  }

  private async apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
    if (!this.accessToken) throw new Error('Authentication required');
    const headers = new Headers(init.headers);
    headers.set('X-Authorization', `Bearer ${this.accessToken}`);
    if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    const response = await fetch(path, { ...init, headers });
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent('auth-expired'));
    }
    return response;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    this.initError = null;

    try {
      const response = await this.apiFetch('/api/data');
      if (!response.ok) throw new Error('Failed to fetch data from server');

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
    } catch (e: any) {
      console.warn("API connection failed:", e.message);

      // In production, don't fall back to mock data - throw error
      if (!import.meta.env.DEV) {
        this.initError = e.message || 'Failed to connect to database';
        throw new Error(this.initError);
      }

      // In development, fall back to local storage/mock data
      this.useApi = false;
      this.fallbackToLocalOrMock();
    }
  }

  // Reset initialization state to allow retrying
  reset(): void {
    this.isInitialized = false;
    this.initError = null;
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

  private async saveToApi(routineId: string): Promise<string | undefined> {
    if (!this.useApi) {
      throw new Error('API connection required');
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

    const payload = { routine, reports, mappings, attributes, outputSheets, sheetDetails, userInputs };
    const response = await this.apiFetch('/api/routine', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(await response.text() || 'API save failed');
    const result = await response.json();
    return result.row_version;
  }

  // --- CONFIGURATION ---

  getConfig(): AppConfiguration {
    return { ...this.config };
  }

  async updateConfig(category: ConfigCategory, newValues: string[]): Promise<void> {
    if (!this.useApi) throw new Error('API connection required');
    const response = await this.apiFetch('/api/config', {
      method: 'POST',
      body: JSON.stringify({ category, values: newValues })
    });
    if (!response.ok) throw new Error(await response.text() || 'Failed to update configuration');
    this.config[category] = newValues;
  }

  async addConfigOption(category: ConfigCategory, value: string): Promise<void> {
    if (!this.config[category].includes(value)) {
      const newValues = [...this.config[category], value];
      await this.updateConfig(category, newValues);
    }
  }

  async removeConfigOption(category: ConfigCategory, value: string): Promise<void> {
    const newValues = this.config[category].filter(item => item !== value);
    await this.updateConfig(category, newValues);
  }

  // --- DEFAULT MAPPINGS ---

  getDefaultMappings(reportName?: string): DefaultMapping[] {
    if (reportName) {
      return this.defaultMappings.filter(m => m.report_name === reportName);
    }
    return this.defaultMappings;
  }

  async saveDefaultMappings(reportName: string, mappings: DefaultMapping[]): Promise<void> {
    if (!this.useApi) throw new Error('API connection required');
    const response = await this.apiFetch('/api/saveDefaultMappings', {
      method: 'POST',
      body: JSON.stringify({ report_name: reportName, mappings })
    });
    if (!response.ok) throw new Error(await response.text() || 'Failed to save default mappings');
    this.defaultMappings = this.defaultMappings.filter(m => m.report_name !== reportName);
    this.defaultMappings.push(...mappings);
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

  async saveRoutine(
    routine: Routine,
    reports: Report[],
    mappings: CDMMapping[],
    attributes: Attribute[],
    outputSheets: OutputSheet[],
    sheetDetails: SheetDetail[],
    userInputs: UserInput[],
  ): Promise<void> {
    const snapshot = {
      routines: structuredClone(this.routines),
      reports: structuredClone(this.reports),
      cdmMappings: structuredClone(this.cdmMappings),
      attributes: structuredClone(this.attributes),
      outputSheets: structuredClone(this.outputSheets),
      sheetDetails: structuredClone(this.sheetDetails),
      userInputs: structuredClone(this.userInputs)
    };
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
    let maxOrder = this.outputSheets
      .filter(sheet => sheet.routine_id === routine.id)
      .reduce((max, sheet) => Math.max(max, sheet.order_index || 0), 0);
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

    try {
      const rowVersion = await this.saveToApi(routine.id);
      const saved = this.routines.find(item => item.id === routine.id);
      if (saved && rowVersion) saved.row_version = rowVersion;
    } catch (error) {
      this.routines = snapshot.routines;
      this.reports = snapshot.reports;
      this.cdmMappings = snapshot.cdmMappings;
      this.attributes = snapshot.attributes;
      this.outputSheets = snapshot.outputSheets;
      this.sheetDetails = snapshot.sheetDetails;
      this.userInputs = snapshot.userInputs;
      throw error;
    }
  }

  async deleteRoutine(id: string): Promise<void> {
    const routine = this.routines.find(item => item.id === id);
    if (!routine?.row_version) throw new Error('Routine version is missing. Reload and retry.');
    const response = await this.apiFetch(`/api/routine/delete?id=${encodeURIComponent(id)}&rowVersion=${encodeURIComponent(routine.row_version)}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error(await response.text() || 'Failed to delete routine');

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

  }

  async updateSheetDetail(id: string, updates: Partial<SheetDetail>): Promise<void> {
    const idx = this.sheetDetails.findIndex(sd => sd.id === id);
    if (idx !== -1) {
      const previousDetail = { ...this.sheetDetails[idx] };
      this.sheetDetails[idx] = { ...this.sheetDetails[idx], ...updates };
      const sheet = this.outputSheets.find(s => s.id === this.sheetDetails[idx].output_sheet_id);
      if (sheet) {
        try {
          const rowVersion = await this.saveToApi(sheet.routine_id);
          const routine = this.routines.find(item => item.id === sheet.routine_id);
          if (routine && rowVersion) routine.row_version = rowVersion;
        } catch (error) {
          this.sheetDetails[idx] = previousDetail;
          throw error;
        }
      }
    }
  }

  async updateSheetOrders(orderedSheets: OutputSheet[]): Promise<void> {
    const routineIds = new Set(orderedSheets.map(sheet => sheet.routine_id));
    if (routineIds.size !== 1) throw new Error('Sheets can only be reordered within one routine at a time.');
    const previousSheets = structuredClone(this.outputSheets);
    const updateMap = new Map(orderedSheets.map(s => [s.id, s.order_index]));

    // Update local state
    this.outputSheets = this.outputSheets.map(sheet => {
      if (updateMap.has(sheet.id)) {
        return { ...sheet, order_index: updateMap.get(sheet.id)! };
      }
      return sheet;
    });

    // Identify all affected routines
    const affectedRoutineIds = new Set<string>();
    orderedSheets.forEach(s => {
      if (s.routine_id) affectedRoutineIds.add(s.routine_id);
    });

    // Save each affected routine
    try {
      for (const routineId of affectedRoutineIds) {
        const rowVersion = await this.saveToApi(routineId);
        const routine = this.routines.find(item => item.id === routineId);
        if (routine && rowVersion) routine.row_version = rowVersion;
      }
    } catch (error) {
      this.outputSheets = previousSheets;
      throw error;
    }
  }

  // Deep copy a routine to a new version
  async createNewVersion(originalRoutineId: string, newVersion: string): Promise<Routine | null> {
    const original = this.getRoutineById(originalRoutineId);
    if (!original) return null;

    const generateId = () => crypto.randomUUID();

    const newRoutineId = generateId();
    const newRoutine: Routine = {
      ...original,
      id: newRoutineId,
      row_version: undefined,
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

    originalSheets.forEach((sheet, index) => {
      const newSheetId = generateId();
      newSheets.push({
        ...sheet,
        id: newSheetId,
        routine_id: newRoutineId,
        order_index: index + 1
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

    try {
      const rowVersion = await this.saveToApi(newRoutine.id);
      if (rowVersion) newRoutine.row_version = rowVersion;
    } catch (error) {
      this.routines = this.routines.filter(item => item.id !== newRoutineId);
      this.reports = this.reports.filter(item => item.routine_id !== newRoutineId);
      const newReportIds = new Set(newReports.map(item => item.id));
      const newMappingIds = new Set(newMappings.map(item => item.id));
      const newSheetIds = new Set(newSheets.map(item => item.id));
      this.cdmMappings = this.cdmMappings.filter(item => !newReportIds.has(item.report_id));
      this.attributes = this.attributes.filter(item => !newMappingIds.has(item.cdm_mapping_id));
      this.outputSheets = this.outputSheets.filter(item => item.routine_id !== newRoutineId);
      this.sheetDetails = this.sheetDetails.filter(item => !newSheetIds.has(item.output_sheet_id));
      this.userInputs = this.userInputs.filter(item => item.routine_id !== newRoutineId);
      throw error;
    }

    return newRoutine;
  }

  // --- BULK IMPORT ---

  async importRoutines(data: {
    routines: any[];
    reports: any[];
    mappings: any[];
    attributes: any[];
    outputSheets: any[];
    sheetDetails: any[];
    userInputs: any[];
  }): Promise<void> {
    if (!this.useApi) {
      throw new Error('Bulk import requires API connection');
    }

    const response = await this.apiFetch('/api/routines/import', {
      method: 'POST',
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Import failed');
    }

    // Refresh data from API after successful import
    this.isInitialized = false;
    await this.initialize();
  }

}

export const dataService = new DataService();
