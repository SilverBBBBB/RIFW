
import React from 'react';
import { ChevronsDown, ChevronsUp } from 'lucide-react';

interface ExpandCollapseAllButtonProps {
  onToggle: (expand: boolean) => void;
}

const ExpandCollapseAllButton: React.FC<ExpandCollapseAllButtonProps> = ({ onToggle }) => {
  return (
    <div className="flex items-center gap-4 text-sm font-medium">
      <button 
        onClick={() => onToggle(true)}
        className="flex items-center gap-1 text-slate-500 hover:text-blue-600 transition-colors"
      >
        <ChevronsDown size={16} />
        Expand All
      </button>
      <span className="text-slate-300">/</span>
      <button 
        onClick={() => onToggle(false)}
        className="flex items-center gap-1 text-slate-500 hover:text-blue-600 transition-colors"
      >
        <ChevronsUp size={16} />
        Collapse All
      </button>
    </div>
  );
};

export default ExpandCollapseAllButton;
