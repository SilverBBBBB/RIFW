import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { X, Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { dataService } from '../services/dataService';
import { useAuth } from '../hooks/AuthContext';

interface BulkImportModalProps {
    onClose: () => void;
    onImportComplete: () => void;
}

// Excel tab headers definitions
const TEMPLATE_HEADERS = {
    Routines: ['Ref_ID', 'Routine Name', 'Display Name', 'Version', 'Group', 'Type', 'Region', 'Fund Types', 'Capital Structure', 'Description', 'To Show', 'Display in Dropdown'],
    Reports: ['Routine_Ref_ID', 'Report Name', 'Is Optional'],
    CDM_Mappings: ['Routine_Ref_ID', 'Report Name', 'Field Name', 'Data Type', 'Required?', 'Blanks Allowed?'],
    Attributes: ['Routine_Ref_ID', 'Report Name', 'CDM Field Name', 'Attribute Name'],
    Output_Sheets: ['Routine_Ref_ID', 'Sheet Name', 'Order Index'],
    Sheet_Details_RDE: ['Routine_Ref_ID', 'Sheet Name', 'Field Name', 'Data Format', 'Fill Color', 'Column Order', 'Verification Required Status', 'Document Type', 'Verification RDE Name', 'Description'],
    User_Inputs: ['Routine_Ref_ID', 'Input Name', 'Location', 'Type', 'Validations', 'Min', 'Max', 'Mandatory?']
};

const INSTRUCTIONS_CONTENT = [
    ['Excel Template Instructions for Bulk Routine Import'],
    [''],
    ['=== Ref_ID Logic ==='],
    ['Since these are new routines without database IDs, you must use a "Routine Reference ID" (Ref_ID) to link rows across tabs.'],
    ['The Ref_ID is a simple integer (1, 2, 3, etc.) that you assign to each routine in the Routines tab.'],
    ['Child tabs (Reports, CDM_Mappings, etc.) use "Routine_Ref_ID" to reference which routine they belong to.'],
    [''],
    ['=== Tab Descriptions ==='],
    [''],
    ['1. Routines (Required)'],
    ['   - Ref_ID: Your reference number for this routine (1, 2, 3...)'],
    ['   - Routine Name: Required. The unique name of the routine'],
    ['   - Display Name: Optional. Friendly display name'],
    ['   - Version: e.g., "v1.0", "prod v1.2"'],
    ['   - Group: Optional grouping category'],
    ['   - Type: Required. Routine type (e.g., "Capital", "Investment")'],
    ['   - Region: Required. Comma-separated regions (e.g., "North America,EMEA")'],
    ['   - Fund Types: Comma-separated fund types (e.g., "Equity,Fixed Income")'],
    ['   - Capital Structure: e.g., "Open-Ended", "Closed-Ended"'],
    ['   - Description: Optional description text'],
    ['   - To Show: "Yes" or "No" (default: Yes)'],
    ['   - Display in Dropdown: "Yes" or "No" (default: Yes)'],
    [''],
    ['2. Reports'],
    ['   - Routine_Ref_ID: Must match a Ref_ID from the Routines tab'],
    ['   - Report Name: Name of the report'],
    ['   - Is Optional: TRUE or FALSE'],
    [''],
    ['3. CDM_Mappings'],
    ['   - Routine_Ref_ID: Must match a Ref_ID from the Routines tab'],
    ['   - Report Name: Must match a Report Name for the same Routine_Ref_ID'],
    ['   - Field Name: The CDM field mapping name'],
    ['   - Data Type: String, Integer, Decimal, Date, Boolean, etc.'],
    ['   - Required?: TRUE or FALSE'],
    ['   - Blanks Allowed?: "Allowed" or "NotAllowed"'],
    [''],
    ['4. Attributes'],
    ['   - Routine_Ref_ID: Must match a Ref_ID from the Routines tab'],
    ['   - Report Name: Must match a Report Name for the same Routine_Ref_ID'],
    ['   - CDM Field Name: Must match a Field Name from CDM_Mappings for the same Report'],
    ['   - Attribute Name: The attribute name'],
    [''],
    ['5. Output_Sheets'],
    ['   - Routine_Ref_ID: Must match a Ref_ID from the Routines tab'],
    ['   - Sheet Name: Name of the output sheet/tab'],
    ['   - Order Index: Numeric order (0, 1, 2...)'],
    [''],
    ['6. Sheet_Details_RDE'],
    ['   - Routine_Ref_ID: Must match a Ref_ID from the Routines tab'],
    ['   - Sheet Name: Must match a Sheet Name from Output_Sheets for the same Routine_Ref_ID'],
    ['   - Field Name: RDE field name'],
    ['   - Data Format: e.g., "General", "Text", "Number"'],
    ['   - Fill Color: Hex color code (e.g., "#FFFFFF")'],
    ['   - Column Order: Numeric order'],
    ['   - Verification Required Status: "Required", "Secondary", or leave empty'],
    ['   - Document Type: Required if Verification Required Status is "Required"'],
    ['   - Verification RDE Name: Required if Verification Required Status is "Required"'],
    ['   - Description: Optional field description'],
    [''],
    ['7. User_Inputs'],
    ['   - Routine_Ref_ID: Must match a Ref_ID from the Routines tab'],
    ['   - Input Name: Name of the user input field'],
    ['   - Location: e.g., "Routine Selection", "Excel QAB"'],
    ['   - Type: e.g., "Dropdown - Single Select", "Text Box", "Date Selection"'],
    ['   - Validations: Validation rules'],
    ['   - Min: Minimum value'],
    ['   - Max: Maximum value'],
    ['   - Mandatory?: TRUE or FALSE'],
    [''],
    ['=== Important Notes ==='],
    ['- All Routine_Ref_ID values must have a corresponding Ref_ID in the Routines tab'],
    ['- If Verification Required Status is "Required", Document Type and Verification RDE Name must be filled'],
    ['- Comma-separated fields (Region, Fund Types) will be parsed into arrays'],
];

interface ParsedData {
    routines: any[];
    reports: any[];
    mappings: any[];
    attributes: any[];
    outputSheets: any[];
    sheetDetails: any[];
    userInputs: any[];
}

interface ValidationError {
    tab: string;
    row: number;
    message: string;
}

const BulkImportModal: React.FC<BulkImportModalProps> = ({ onClose, onImportComplete }) => {
    const { user } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [parsedData, setParsedData] = useState<ParsedData | null>(null);
    const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [importMessage, setImportMessage] = useState('');

    const downloadTemplate = () => {
        const wb = XLSX.utils.book_new();

        // Create Instructions sheet first
        const instructionsWs = XLSX.utils.aoa_to_sheet(INSTRUCTIONS_CONTENT);
        instructionsWs['!cols'] = [{ wch: 100 }];
        XLSX.utils.book_append_sheet(wb, instructionsWs, 'Instructions');

        // Create data sheets
        Object.entries(TEMPLATE_HEADERS).forEach(([sheetName, headers]) => {
            const ws = XLSX.utils.aoa_to_sheet([headers]);
            // Set column widths
            ws['!cols'] = headers.map(() => ({ wch: 20 }));
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
        });

        // Download
        XLSX.writeFile(wb, 'routine_import_template.xlsx');
    };

    const parseExcelFile = (file: File) => {
        setIsLoading(true);
        setValidationErrors([]);
        setImportStatus('idle');

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });

                const parsed: ParsedData = {
                    routines: [],
                    reports: [],
                    mappings: [],
                    attributes: [],
                    outputSheets: [],
                    sheetDetails: [],
                    userInputs: []
                };

                // Parse each sheet
                if (workbook.SheetNames.includes('Routines')) {
                    parsed.routines = XLSX.utils.sheet_to_json(workbook.Sheets['Routines']);
                }
                if (workbook.SheetNames.includes('Reports')) {
                    parsed.reports = XLSX.utils.sheet_to_json(workbook.Sheets['Reports']);
                }
                if (workbook.SheetNames.includes('CDM_Mappings')) {
                    parsed.mappings = XLSX.utils.sheet_to_json(workbook.Sheets['CDM_Mappings']);
                }
                if (workbook.SheetNames.includes('Attributes')) {
                    parsed.attributes = XLSX.utils.sheet_to_json(workbook.Sheets['Attributes']);
                }
                if (workbook.SheetNames.includes('Output_Sheets')) {
                    parsed.outputSheets = XLSX.utils.sheet_to_json(workbook.Sheets['Output_Sheets']);
                }
                if (workbook.SheetNames.includes('Sheet_Details_RDE')) {
                    parsed.sheetDetails = XLSX.utils.sheet_to_json(workbook.Sheets['Sheet_Details_RDE']);
                }
                if (workbook.SheetNames.includes('User_Inputs')) {
                    parsed.userInputs = XLSX.utils.sheet_to_json(workbook.Sheets['User_Inputs']);
                }

                // Validate
                const errors = validateParsedData(parsed);
                setValidationErrors(errors);
                setParsedData(parsed);

            } catch (err: any) {
                setValidationErrors([{ tab: 'File', row: 0, message: 'Failed to parse Excel file: ' + err.message }]);
            } finally {
                setIsLoading(false);
            }
        };
        reader.readAsBinaryString(file);
    };

    const validateParsedData = (data: ParsedData): ValidationError[] => {
        const errors: ValidationError[] = [];

        if (data.routines.length === 0) {
            errors.push({ tab: 'Routines', row: 0, message: 'No routines found in the Routines tab' });
            return errors;
        }

        // Get all valid Ref_IDs
        const validRefIds = new Set(data.routines.map(r => String(r['Ref_ID'])));

        // Check mandatory fields on routines
        data.routines.forEach((routine, idx) => {
            if (!routine['Ref_ID']) {
                errors.push({ tab: 'Routines', row: idx + 2, message: 'Ref_ID is required' });
            }
            if (!routine['Routine Name']) {
                errors.push({ tab: 'Routines', row: idx + 2, message: 'Routine Name is required' });
            }
            if (!routine['Type']) {
                errors.push({ tab: 'Routines', row: idx + 2, message: 'Type is required' });
            }
            if (!routine['Region']) {
                errors.push({ tab: 'Routines', row: idx + 2, message: 'Region is required' });
            }
        });

        // Check Ref_ID references in child tabs
        const checkRefId = (items: any[], tabName: string) => {
            items.forEach((item, idx) => {
                const refId = String(item['Routine_Ref_ID']);
                if (!refId || !validRefIds.has(refId)) {
                    errors.push({
                        tab: tabName,
                        row: idx + 2,
                        message: `Routine_Ref_ID "${refId}" not found in Routines tab`
                    });
                }
            });
        };

        checkRefId(data.reports, 'Reports');
        checkRefId(data.mappings, 'CDM_Mappings');
        checkRefId(data.attributes, 'Attributes');
        checkRefId(data.outputSheets, 'Output_Sheets');
        checkRefId(data.sheetDetails, 'Sheet_Details_RDE');
        checkRefId(data.userInputs, 'User_Inputs');

        // Bot readiness validation for SheetDetails
        data.sheetDetails.forEach((detail, idx) => {
            const status = detail['Verification Required Status'];
            if (status === 'Required') {
                if (!detail['Document Type']) {
                    errors.push({
                        tab: 'Sheet_Details_RDE',
                        row: idx + 2,
                        message: 'Document Type is required when Verification Required Status is "Required"'
                    });
                }
                if (!detail['Verification RDE Name']) {
                    errors.push({
                        tab: 'Sheet_Details_RDE',
                        row: idx + 2,
                        message: 'Verification RDE Name is required when Verification Required Status is "Required"'
                    });
                }
            }
        });

        return errors;
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.name.endsWith('.xlsx')) {
                setValidationErrors([{ tab: 'File', row: 0, message: 'Please upload an .xlsx file' }]);
                return;
            }
            parseExcelFile(file);
        }
    };

    const handleImport = async () => {
        if (!parsedData || validationErrors.length > 0) return;

        setIsLoading(true);
        setImportStatus('idle');

        try {
            await dataService.importRoutines(parsedData, user?.username || 'unknown');
            setImportStatus('success');
            setImportMessage(`Successfully imported ${parsedData.routines.length} routine(s)`);
            // Refresh data and close after delay
            setTimeout(() => {
                onImportComplete();
                onClose();
            }, 2000);
        } catch (err: any) {
            setImportStatus('error');
            setImportMessage(err.message || 'Import failed');
        } finally {
            setIsLoading(false);
        }
    };

    const getSummary = () => {
        if (!parsedData) return null;
        return {
            routines: parsedData.routines.length,
            reports: parsedData.reports.length,
            mappings: parsedData.mappings.length,
            attributes: parsedData.attributes.length,
            outputSheets: parsedData.outputSheets.length,
            sheetDetails: parsedData.sheetDetails.length,
            userInputs: parsedData.userInputs.length
        };
    };

    const summary = getSummary();

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-xl">
                    <div className="flex items-center gap-3">
                        <FileSpreadsheet className="text-green-600" size={24} />
                        <h2 className="text-lg font-bold text-slate-800">Bulk Import Routines</h2>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    {/* Step 1: Download Template */}
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                        <h3 className="font-semibold text-slate-800 mb-2">Step 1: Download Template</h3>
                        <p className="text-sm text-slate-600 mb-3">
                            Download the Excel template with pre-defined tabs and headers. Fill in your routine data following the instructions.
                        </p>
                        <button
                            onClick={downloadTemplate}
                            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                            <Download size={16} />
                            Download Template
                        </button>
                    </div>

                    {/* Step 2: Upload File */}
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                        <h3 className="font-semibold text-slate-800 mb-2">Step 2: Upload Filled Template</h3>
                        <p className="text-sm text-slate-600 mb-3">
                            Upload your completed Excel file. The system will validate the data before import.
                        </p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            disabled={isLoading}
                        >
                            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                            {isLoading ? 'Processing...' : 'Upload Excel File'}
                        </button>
                    </div>

                    {/* Validation Errors */}
                    {validationErrors.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-center gap-2 text-red-700 font-semibold mb-2">
                                <AlertCircle size={18} />
                                Validation Errors ({validationErrors.length})
                            </div>
                            <ul className="text-sm text-red-600 space-y-1 max-h-40 overflow-y-auto">
                                {validationErrors.map((err, idx) => (
                                    <li key={idx} className="flex gap-2">
                                        <span className="font-medium">[{err.tab} Row {err.row}]</span>
                                        <span>{err.message}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Parsed Data Summary */}
                    {summary && validationErrors.length === 0 && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="flex items-center gap-2 text-green-700 font-semibold mb-3">
                                <CheckCircle size={18} />
                                Data Validated Successfully
                            </div>
                            <div className="grid grid-cols-4 gap-3 text-sm">
                                <div className="bg-white rounded p-2 text-center border border-green-100">
                                    <div className="text-2xl font-bold text-green-600">{summary.routines}</div>
                                    <div className="text-slate-500">Routines</div>
                                </div>
                                <div className="bg-white rounded p-2 text-center border border-green-100">
                                    <div className="text-2xl font-bold text-green-600">{summary.reports}</div>
                                    <div className="text-slate-500">Reports</div>
                                </div>
                                <div className="bg-white rounded p-2 text-center border border-green-100">
                                    <div className="text-2xl font-bold text-green-600">{summary.mappings}</div>
                                    <div className="text-slate-500">Mappings</div>
                                </div>
                                <div className="bg-white rounded p-2 text-center border border-green-100">
                                    <div className="text-2xl font-bold text-green-600">{summary.outputSheets}</div>
                                    <div className="text-slate-500">Sheets</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Import Status */}
                    {importStatus === 'success' && (
                        <div className="bg-green-100 border border-green-300 rounded-lg p-4 flex items-center gap-3">
                            <CheckCircle className="text-green-600" size={24} />
                            <span className="text-green-800 font-medium">{importMessage}</span>
                        </div>
                    )}
                    {importStatus === 'error' && (
                        <div className="bg-red-100 border border-red-300 rounded-lg p-4 flex items-center gap-3">
                            <AlertCircle className="text-red-600" size={24} />
                            <span className="text-red-800 font-medium">{importMessage}</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 rounded-b-xl">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleImport}
                        disabled={!parsedData || validationErrors.length > 0 || isLoading || importStatus === 'success'}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
                    >
                        {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                        Import Routines
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BulkImportModal;
