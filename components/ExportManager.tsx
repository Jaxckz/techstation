
import React, { useState, useEffect } from 'react';
import { Download, Archive, X, FolderCheck, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { useAppConfig } from '../App';
import { format, isWithinInterval, endOfDay } from 'date-fns';
import startOfDay from 'date-fns/startOfDay';
import JSZip from 'jszip';

interface ExportManagerProps {
  onClose: () => void;
}

const ExportManager: React.FC<ExportManagerProps> = ({ onClose }) => {
  const { config } = useAppConfig();
  const [logs, setLogs] = useState<any[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState({
    start: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    api.getLogs().then(setLogs);
  }, []);

  const getFilteredLogs = () => {
    return logs.filter(log => {
      const matchCat = selectedCategories.length === 0 || selectedCategories.includes(log.category);
      const matchDate = isWithinInterval(new Date(log.date), {
        start: startOfDay(new Date(dateRange.start)),
        end: endOfDay(new Date(dateRange.end))
      });
      return matchCat && matchDate;
    });
  };

  const handleExport = async () => {
    setIsProcessing(true);
    const targetLogs = getFilteredLogs();
    const zip = new JSZip();
    zip.file("日志清单.json", JSON.stringify(targetLogs, null, 2));

    for (const log of targetLogs) {
      const dateStr = format(new Date(log.date), 'yyyyMMdd');
      const safeTitle = log.title.replace(/[\\/:*?"<>|]/g, '_');
      const content = `标题: ${log.title}\n内容: ${log.content}`;
      zip.file(`${dateStr}/${safeTitle}.txt`, content);
    }

    const blob = await zip.generateAsync({ type: "blob" });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `归档_${format(new Date(), 'yyyyMMdd')}.zip`;
    link.click();
    setIsProcessing(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in">
      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={onClose}></div>
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl p-10 space-y-8 animate-in zoom-in-95">
        <header className="flex justify-between items-start">
          <div className="space-y-1">
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-3"><Archive className="w-5 h-5 text-indigo-400" /> 物理归档打包导出</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-700 hover:text-white"><X className="w-6 h-6" /></button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">时间轴筛选</label>
            <div className="space-y-2">
              <input type="date" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white text-xs font-bold outline-none" />
              <input type="date" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white text-xs font-bold outline-none" />
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">业务领域过滤</label>
            <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto custom-scrollbar p-1">
              {config.categories.map(cat => (
                <button key={cat} onClick={() => setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border ${selectedCategories.includes(cat) ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-600'}`}>{cat}</button>
              ))}
            </div>
          </div>
        </div>

        <button
          disabled={isProcessing || getFilteredLogs().length === 0}
          onClick={handleExport}
          className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white rounded-2xl font-black shadow-xl flex items-center justify-center gap-4 transition-all"
        >
          {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
          {isProcessing ? `正在打包` : `导出 ${getFilteredLogs().length} 条记录`}
        </button>
      </div>
    </div>
  );
};

export default ExportManager;
