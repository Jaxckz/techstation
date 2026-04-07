
import React, { useState, useEffect, useContext } from 'react';
import { Search as SearchIcon, FileDown, Loader2, Copy, Check, Download, Calendar } from 'lucide-react';
import { api } from '../services/api';
import { OFFICE_AREAS } from '../types';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ToastContext } from './Layout';

interface SearchProps {
  initialFilter: { category?: string, id?: number } | null;
  onClearFilter: () => void;
}

const Search: React.FC<SearchProps> = ({ initialFilter, onClearFilter }) => {
  const { showToast } = useContext(ToastContext);
  const [query, setQuery] = useState('');
  const [selectedOffice, setSelectedOffice] = useState<string>('all');
  const [results, setResults] = useState<any[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  
  // Date Range
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => performSearch(), 300);
    return () => clearTimeout(timer);
  }, [query, selectedOffice, startDate, endDate]);

  const performSearch = async () => {
      // Note: Getting ALL logs for client-side search is not scalable for huge datasets.
      // But for this "local/small server" context it works. Ideally backend should support search params.
      const allLogs = await api.getLogs(); // Fetches page 1 default, potentially limited.
      // To really search *everything*, we need a search endpoint. 
      // Assuming for now user knows recently loaded logs or we fetch a larger chunk. 
      // *Correction*: api.getLogs() without params currently returns parsed logs array (if updated server used).
      // Let's assume api.getLogs() fetches a decent amount or we should implement a specific search endpoint.
      
      const q = query.toLowerCase();
      let filtered = allLogs.data ? allLogs.data : allLogs; // Handle if paginated response or array
      
      if (!Array.isArray(filtered)) filtered = [];

      filtered = filtered.filter((l: any) => {
        const mQuery = !q || l.title.toLowerCase().includes(q) || l.content.toLowerCase().includes(q);
        const mOffice = selectedOffice === 'all' || l.officeArea === selectedOffice;
        
        let mDate = true;
        if (startDate && endDate) {
            mDate = isWithinInterval(new Date(l.date), {
                start: startOfDay(new Date(startDate)),
                end: endOfDay(new Date(endDate))
            });
        }
        
        return mQuery && mOffice && mDate;
      });
      setResults(filtered);
  };

  const handleExport = () => {
      if (results.length === 0) return;
      setIsExporting(true);
      
      // Generate Beautiful HTML for WPS/Word
      const htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
            <meta charset="utf-8">
            <title>日志检索报告</title>
            <style>
                body { font-family: '宋体', sans-serif; }
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 1px solid #000; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; font-weight: bold; }
                .title { font-size: 18px; font-weight: bold; margin-bottom: 20px; text-align: center; }
                .meta { font-size: 12px; color: #666; margin-bottom: 10px; }
            </style>
        </head>
        <body>
            <div class="title">广电技术保障日志检索报告</div>
            <div class="meta">导出时间: ${format(new Date(), 'yyyy-MM-dd HH:mm')}</div>
            <div class="meta">检索条件: ${query || '无关键词'} | 时间: ${startDate || '不限'} 至 ${endDate || '不限'}</div>
            <br/>
            <table>
                <thead>
                    <tr>
                        <th width="10%">ID</th>
                        <th width="15%">日期</th>
                        <th width="15%">区域/分类</th>
                        <th width="20%">标题</th>
                        <th width="30%">内容详情</th>
                        <th width="10%">记录人</th>
                    </tr>
                </thead>
                <tbody>
                    ${results.map(r => `
                        <tr>
                            <td>${r.id}</td>
                            <td>${r.date}</td>
                            <td>${r.officeArea}<br/><small>${r.category}</small></td>
                            <td>${r.title}</td>
                            <td>${r.content}</td>
                            <td>${r.author}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </body>
        </html>
      `;
      
      const blob = new Blob([htmlContent], { type: 'application/msword' }); // MIME type implies Word doc
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Log_Report_${format(new Date(), 'yyyyMMdd')}.doc`; // Save as .doc for WPS compatibility
      link.click();
      
      setIsExporting(false);
      showToast(`已导出 ${results.length} 条记录为 WPS 文档`, 'success');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-32 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl space-y-6">
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
          <input type="text" placeholder="全局搜索日志..." value={query} onChange={(e) => setQuery(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 rounded-2xl text-white outline-none focus:border-indigo-500" />
        </div>
        
        <div className="flex flex-wrap gap-4 items-center">
           <select value={selectedOffice} onChange={e => setSelectedOffice(e.target.value)} className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs text-slate-400 outline-none">
              <option value="all">所有区域</option>
              {OFFICE_AREAS.map(o => <option key={o} value={o}>{o}</option>)}
           </select>
           
           <div className="flex items-center gap-3 bg-indigo-900/20 border border-indigo-500/30 p-2.5 rounded-xl">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest pl-1">日期范围</span>
              <div className="flex items-center gap-2 bg-slate-950 rounded-lg px-2 border border-slate-800/50">
                  <Calendar className="w-4 h-4 text-indigo-500" />
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-xs text-white outline-none font-mono py-1" />
                  <span className="text-slate-500">-</span>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent text-xs text-white outline-none font-mono py-1" />
              </div>
           </div>

           <button 
                onClick={handleExport} 
                disabled={results.length === 0}
                className="ml-auto bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 px-6 py-3 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg"
           >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              导出 WPS 格式
           </button>
        </div>
      </div>

      <div className="space-y-4">
        {results.map(res => (
          <div key={res.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-colors group">
            <div className="flex justify-between items-start mb-2">
                <h4 className="text-white font-bold text-lg">{res.title}</h4>
                <span className="text-[10px] bg-slate-950 border border-slate-800 px-2 py-1 rounded text-slate-500">{format(new Date(res.date), 'yyyy-MM-dd')}</span>
            </div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-4 flex gap-2">
              <span className="text-indigo-400">{res.officeArea}</span> • <span>{res.category}</span> • <span>{res.author}</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">{res.content}</p>
          </div>
        ))}
        {results.length === 0 && <div className="text-center py-20 text-slate-700 font-bold uppercase">未找到匹配项</div>}
      </div>
    </div>
  );
};

export default Search;
