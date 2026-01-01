import React, { useState, useEffect } from 'react';
import { DefaultMapping } from '../types';
import { X, Plus, Trash2, Save } from 'lucide-react';
import { dataService } from '../services/dataService';
import { useAuth } from '../hooks/AuthContext';

interface DefaultMappingModalProps {
    reportName: string;
    onClose: () => void;
}

const DefaultMappingModal: React.FC<DefaultMappingModalProps> = ({ reportName, onClose }) => {
    const { user } = useAuth();
    const [mappings, setMappings] = useState<DefaultMapping[]>([]);
    const [dataTypes, setDataTypes] = useState<string[]>([]);

    useEffect(() => {
        // Load existing defaults
        const defaults = dataService.getDefaultMappings(reportName);
        // Deep copy to avoid mutating store directly
        setMappings(JSON.parse(JSON.stringify(defaults)));

        // Load data types from config
        const config = dataService.getConfig();
        setDataTypes(config.dataTypes || ['String', 'Integer', 'Decimal', 'Date', 'Boolean']);
    }, [reportName]);

    const addRow = () => {
        const newMapping: DefaultMapping = {
            id: Math.random().toString(36).substring(2),
            report_name: reportName,
            field_mapping_name: '',
            data_type: dataTypes[0] || 'String',
            is_required: false,
            blanks_allowed: 'Allowed'
        };
        setMappings([...mappings, newMapping]);
    };

    const updateRow = (index: number, field: keyof DefaultMapping, value: any) => {
        const updated = [...mappings];
        updated[index] = { ...updated[index], [field]: value };
        setMappings(updated);
    };

    const removeRow = (index: number) => {
        setMappings(mappings.filter((_, i) => i !== index));
    };

    const handleSave = () => {
        // Validate?
        if (mappings.some(m => !m.field_mapping_name.trim())) {
            alert("All mappings must have a name.");
            return;
        }

        dataService.saveDefaultMappings(reportName, mappings, user.username);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-xl">
                    <h2 className="text-lg font-bold text-slate-800">
                        Configure Defaults: <span className="text-blue-600">{reportName}</span>
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    <p className="text-sm text-slate-500 mb-4">
                        Define the default CDM Field Mappings that should be automatically created when this report is selected in a routine.
                    </p>

                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-xs uppercase text-slate-500 font-semibold border-b border-slate-200 bg-slate-50">
                                <th className="p-2 w-1/3">Field Mapping Name</th>
                                <th className="p-2 w-1/4">Data Type</th>
                                <th className="p-2 w-24 text-center">Required</th>
                                <th className="p-2 w-32">Blanks</th>
                                <th className="p-2 w-10"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {mappings.map((map, idx) => (
                                <tr key={map.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                    <td className="p-2">
                                        <input
                                            type="text"
                                            className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            value={map.field_mapping_name}
                                            onChange={(e) => updateRow(idx, 'field_mapping_name', e.target.value)}
                                            placeholder="e.g. ISIN"
                                        />
                                    </td>
                                    <td className="p-2">
                                        <select
                                            className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            value={map.data_type}
                                            onChange={(e) => updateRow(idx, 'data_type', e.target.value)}
                                        >
                                            {dataTypes.map(dt => <option key={dt} value={dt}>{dt}</option>)}
                                        </select>
                                    </td>
                                    <td className="p-2 text-center">
                                        <input
                                            type="checkbox"
                                            checked={map.is_required}
                                            onChange={(e) => updateRow(idx, 'is_required', e.target.checked)}
                                            className="rounded text-blue-600 focus:ring-blue-500"
                                        />
                                    </td>
                                    <td className="p-2">
                                        <select
                                            className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
                                            value={map.blanks_allowed}
                                            onChange={(e) => updateRow(idx, 'blanks_allowed', e.target.value)}
                                        >
                                            <option value="Allowed">Allowed</option>
                                            <option value="NotAllowed">Not Allowed</option>
                                        </select>
                                    </td>
                                    <td className="p-2 text-right">
                                        <button
                                            onClick={() => removeRow(idx)}
                                            className="text-slate-400 hover:text-red-500 transition-colors"
                                            title="Remove Mapping"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {mappings.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-400 italic">
                                        No default mappings defined yet. Click "Add Mapping" to start.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    <button
                        onClick={addRow}
                        className="mt-4 flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors"
                    >
                        <Plus size={16} /> Add Default Mapping
                    </button>
                </div>

                <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 rounded-b-xl">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
                    >
                        <Save size={16} /> Save Defaults
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DefaultMappingModal;
