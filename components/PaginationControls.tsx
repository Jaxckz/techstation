
import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationControlsProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (items: number) => void;
  className?: string;
}

const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  className = ''
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  if (totalPages <= 1 && totalItems === 0) return null;

  const getPageNumbers = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];
    let l;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
        range.push(i);
      }
    }

    for (let i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }
    return rangeWithDots;
  };

  return (
    <div className={`flex flex-col md:flex-row justify-between items-center gap-4 py-4 border-t border-slate-800/60 mt-4 ${className}`}>
      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
        <span>共 {totalItems} 条记录</span>
        <span className="hidden md:inline">•</span>
        <div className="flex items-center gap-2">
            <span>每页显示</span>
            <select 
                value={itemsPerPage}
                onChange={(e) => { onItemsPerPageChange(Number(e.target.value)); onPageChange(1); }}
                className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-2 py-1 outline-none focus:border-indigo-500"
            >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
            </select>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button 
            onClick={() => onPageChange(1)} 
            disabled={currentPage === 1}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
        >
            <ChevronsLeft className="w-4 h-4" />
        </button>
        <button 
            onClick={() => onPageChange(currentPage - 1)} 
            disabled={currentPage === 1}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
        >
            <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1 mx-2">
            {getPageNumbers().map((page, index) => (
                page === '...' ? (
                    <span key={`dots-${index}`} className="text-slate-600 text-xs px-2">...</span>
                ) : (
                    <button
                        key={page}
                        onClick={() => onPageChange(page as number)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                            currentPage === page 
                            ? 'bg-indigo-600 text-white shadow-lg' 
                            : 'bg-slate-900/50 text-slate-400 hover:bg-slate-800 border border-slate-800/50'
                        }`}
                    >
                        {page}
                    </button>
                )
            ))}
        </div>

        <button 
            onClick={() => onPageChange(currentPage + 1)} 
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
        >
            <ChevronRight className="w-4 h-4" />
        </button>
        <button 
            onClick={() => onPageChange(totalPages)} 
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
        >
            <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default PaginationControls;
