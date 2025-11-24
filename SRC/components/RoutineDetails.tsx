
import React, { useEffect, useState } from 'react';
import { dataService } from '../services/dataService.ts';
import { Routine } from '../types.ts';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';

interface RoutineDetailsProps {
  routineId: string;
  onBack: () => void;
}

const RoutineDetails: React.FC<RoutineDetailsProps> = ({ routineId, onBack }) => {
  const [routine, setRoutine] = useState<Routine | undefined>(undefined);
  const [activeSection, setActiveSection] = useState('summary');

  useEffect(() => {
    const r = dataService.getRoutineById(routineId);
    setRoutine(r);
  }, [routineId]);

  if (!routine) return <div>Loading...</div>;

  const reports = dataService.getReportsByRoutineId(routine.id);
  // Get mappings for these reports
  const mappings = dataService.getCDMMappingsView({ version: '', startDate: '', endDate: '' })
    .filter(m => m.routine_name === routine.routine_name); // Loose match for mock simplicity, in real app use ID filtering

  return (
    <div className="max-w-6xl mx-auto animate-fade-in pb-20">
       <button onClick={onBack} className="mb-6 flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft size={20} /> Back to Dashboard
       </button>

       <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="bg-slate-900 text-white p-8">
             <div className="flex justify-between items-start">
                <div>
                   <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-3xl font-bold">{routine.routine_name}</h1>
                      <span className="px-3 py-1 bg-slate-700 rounded-full text-xs font-mono text-slate-300 border border-slate-600">{routine.version}</span>
                   </div>
                   {routine.routine_display_name && (
                     <div className="text-slate-300 text-lg mb-3">{routine.routine_display_name}</div>
                   )}
                   <div className="text-slate-400 flex gap-4 text-sm">
                      <span>Type: {routine.routine_type}</span>
                      <span>•</span>
                      <span>Region: {routine.region}</span>
                      <span>•</span>
                      <span>Last Edited: {new Date(routine.last_edited_date).toLocaleDateString()}</span>
                   </div>
                </div>
                <div className="text-right">
                    <div className="text-sm text-slate-400 mb-1">Capital Structure</div>
                    <div className="font-medium">{routine.capital_structure}</div>
                </div>
             </div>
          </div>

          {/* Navigation */}
          <div className="flex border-b border-slate-200">
             {['summary', 'reports', 'mappings'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveSection(tab)}
                  className={`px-6 py-4 text-sm font-medium capitalize border-b-2 transition-colors ${
                     activeSection === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                   {tab}
                </button>
             ))}
          </div>

          {/* Content */}
          <div className="p-8 min-h-[400px]">
             {activeSection === 'summary' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div>
                      <h3 className="text-lg font-bold text-slate-800 mb-4">General Information</h3>
                      <div className="space-y-4">
                         <div className="flex justify-between border-b border-slate-100 pb-2">
                            <span className="text-slate-500">Routine Group</span>
                            <span className="font-medium">{routine.routine_group}</span>
                         </div>
                         <div className="flex justify-between border-b border-slate-100 pb-2">
                            <span className="text-slate-500">Fund Types</span>
                            <span className="font-medium">{routine.fund_types.join(', ')}</span>
                         </div>
                      </div>
                   </div>
                   <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                      <h3 className="text-blue-900 font-bold mb-2">Quick Stats</h3>
                      <div className="grid grid-cols-2 gap-4">
                         <div className="bg-white p-4 rounded-lg shadow-sm">
                            <div className="text-3xl font-bold text-blue-600">{reports.length}</div>
                            <div className="text-xs text-slate-500">Reports Linked</div>
                         </div>
                         <div className="bg-white p-4 rounded-lg shadow-sm">
                            <div className="text-3xl font-bold text-emerald-600">{mappings.length}</div>
                            <div className="text-xs text-slate-500">Total Mappings</div>
                         </div>
                      </div>
                   </div>
                </div>
             )}

             {activeSection === 'reports' && (
                <div className="grid gap-4">
                   {reports.map(rep => (
                      <div key={rep.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:shadow-sm transition-shadow">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
                               <span className="font-bold">{rep.report_name.charAt(0)}</span>
                            </div>
                            <div>
                               <div className="font-medium text-slate-800">{rep.report_name}</div>
                               <div className="text-xs text-slate-500">Report ID: {rep.id}</div>
                            </div>
                         </div>
                         <div>
                            {rep.is_optional 
                               ? <span className="flex items-center gap-1 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded"><CheckCircle size={12} /> Optional</span>
                               : <span className="flex items-center gap-1 text-xs bg-red-100 text-red-800 px-2 py-1 rounded"><XCircle size={12} /> Mandatory</span>
                            }
                         </div>
                      </div>
                   ))}
                </div>
             )}

             {activeSection === 'mappings' && (
                <div className="overflow-x-auto">
                   <table className="w-full text-left">
                      <thead>
                         <tr className="text-xs uppercase text-slate-500 border-b border-slate-200">
                            <th className="pb-3 pl-2">Report</th>
                            <th className="pb-3">Field Mapping</th>
                            <th className="pb-3">Data Type</th>
                            <th className="pb-3 text-center">Required</th>
                            <th className="pb-3 text-center">Blanks Allowed</th>
                         </tr>
                      </thead>
                      <tbody>
                         {mappings.map(m => (
                            <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50">
                               <td className="py-3 pl-2 text-slate-600">{m.report_name}</td>
                               <td className="py-3 font-mono text-sm text-slate-800">{m.field_mapping_name}</td>
                               <td className="py-3 text-sm text-slate-500">{m.data_type}</td>
                               <td className="py-3 text-center">
                                  {m.is_required && <div className="w-2 h-2 bg-blue-500 rounded-full mx-auto"></div>}
                               </td>
                               <td className="py-3 text-center text-sm text-slate-500">
                                  {m.blanks_allowed || 'Allowed'}
                               </td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             )}
          </div>
       </div>
    </div>
  );
};

export default RoutineDetails;