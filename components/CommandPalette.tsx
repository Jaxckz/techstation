
import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  X, 
  FileText, 
  ListTodo, 
  ShieldAlert, 
  CornerDownLeft,
  Server,
  PieChart,
  LayoutGrid
} from 'lucide-react';
import { api } from '../services/api'; 
import { LogEntry, TodoEntry, SecurityLogEntry, OfficeArea, UserRole } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  globalOfficeArea: OfficeArea;
  onSelectLog: (id: number) => void;
  onNavigate: (tab: any) => void;
  userRole: UserRole;
  allowedTabs: string[];
}

type SearchFilter = 'all' | 'log' | 'todo' | 'security';

const CommandPalette: React.FC<CommandPaletteProps> = ({ 
  isOpen, 
  onClose, 
  globalOfficeArea, 
  onSelectLog,
  onNavigate,
  allowedTabs
}) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<SearchFilter>('all');
  const [results, setResults] = useState<{
    logs: LogEntry[],
    todos: TodoEntry[],
    security: SecurityLogEntry[]
  }>({ logs: [], todos: [], security: [] });
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const performSearch = async () => {
      if (!query.trim()) {
        setResults({ logs: [], todos: [], security: [] });
        return;
      }

      const q = query.toLowerCase();
      
      try {
        const [allLogs, allTodos, allSecurity] = await Promise.all([
          api.getLogs(),
          api.getTodos(),
          api.getSecurityLogs()
        ]);

        const logs = filter === 'all' || filter === 'log' 
            ? allLogs.filter((l: any) => l.title.toLowerCase().includes(q) || l.content.toLowerCase().includes(q)).slice(0, 5) 
            : [];
        const todos = filter === 'all' || filter === 'todo'
            ? allTodos.filter((t: any) => t.title.toLowerCase().includes(q)).slice(0, 5)
            : [];
        const security = filter === 'all' || filter === 'security'
            ? allSecurity.filter((s: any) => s.sourceIp?.includes(q) || s.description?.toLowerCase().includes(q)).slice(0, 5)
            : [];

        setResults({ logs, todos, security });
        setSelectedIndex(0);
      } catch (e) {
        console.error("Search failed:", e);
      }
    };

    const timer = setTimeout(performSearch, 300);
    return () => clearTimeout(timer);
  }, [query, filter]);

  const flattenedResults = [
    ...results.logs.map(l => ({ type: 'log', id: 'timeline', data: l })),
    ...results.todos.map(t => ({ type: 'todo', id: 'tasks', data: t })),
    ...results.security.map(s => ({ type: 'security', id: 'security', data: s }))
  ].filter(item => allowedTabs.includes(item.id));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, flattenedResults.length));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + flattenedResults.length) % Math.max(1, flattenedResults.length));
    }
    if (e.key === 'Enter') {
      const selected = flattenedResults[selectedIndex];
      if (selected) {
        if (selected.type === 'log') onSelectLog(selected.data.id!);
        if (selected.type === 'todo') onNavigate('tasks');
        if (selected.type === 'security') onNavigate('security');
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  const quickNavItems = [
    { id: 'add', label: '新建区域日志', tab: 'add', icon: FileText },
    { id: 'tasks', label: '查看待办中心', tab: 'tasks', icon: ListTodo },
    { id: 'security', label: '安全审计报告', tab: 'security', icon: ShieldAlert },
    { id: 'stats', label: '系统效能分析', tab: 'stats', icon: PieChart },
    { id: 'devices', label: '设备资产台账', tab: 'devices', icon: Server },
  ].filter(nav => allowedTabs.includes(nav.id));

  return (
    <div className="fixed inset-0 z-[300] flex items-start justify-center pt-[15vh] px-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose}></div>
      
      <div 
        className={`relative w-full max-w-2xl bg-slate-900/90 border rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${globalOfficeArea === '双林办公区' ? 'border-purple-500/30' : 'border-indigo-500/30'}`}
        onKeyDown={handleKeyDown}
      >
        <div className="flex flex-col border-b border-slate-800">
            <div className="flex items-center gap-4 px-6 py-4">
            <Search className={`w-6 h-6 ${globalOfficeArea === '双林办公区' ? 'text-purple-400' : 'text-indigo-400'}`} />
            <input 
                ref={inputRef}
                type="text"
                placeholder="搜日志、指令或人员点位..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-lg font-bold text-white placeholder:text-slate-700"
            />
            <div className="flex items-center gap-1 px-2 py-1 rounded bg-slate-950 border border-slate-800 text-[10px] text-slate-500 font-bold">
                ESC
            </div>
            </div>
            <div className="flex px-6 pb-3 gap-2">
                {(['all', 'log', 'todo', 'security'] as const).map(f => (
                    <button 
                        key={f} 
                        onClick={() => setFilter(f)}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${filter === f ? 'bg-indigo-600 text-white' : 'bg-slate-950 text-slate-500 hover:text-slate-300'}`}
                    >
                        {f === 'all' ? '全部' : f === 'log' ? '日志' : f === 'todo' ? '待办' : '安防'}
                    </button>
                ))}
            </div>
        </div>

        <div className="max-h-[50vh] overflow-y-auto custom-scrollbar p-2">
          {flattenedResults.length > 0 ? (
            <div className="space-y-1">
              {flattenedResults.map((item, idx) => (
                <div 
                  key={`${item.type}-${item.data.id}`}
                  onClick={() => {
                    if (item.type === 'log') onSelectLog(item.data.id!);
                    if (item.type === 'todo') onNavigate('tasks');
                    if (item.type === 'security') onNavigate('security');
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`
                    flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all
                    ${selectedIndex === idx ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-800/60 text-slate-400'}
                  `}
                >
                  <div className={`p-2.5 rounded-xl ${selectedIndex === idx ? 'bg-white/10' : 'bg-slate-950/50'}`}>
                    {item.type === 'log' && <FileText className="w-5 h-5" />}
                    {item.type === 'todo' && <ListTodo className="w-5 h-5" />}
                    {item.type === 'security' && <ShieldAlert className="w-5 h-5 text-rose-500" />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold truncate">{(item.data as any).title || (item.data as any).eventType}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${selectedIndex === idx ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-500'}`}>
                        {item.type}
                      </span>
                    </div>
                    {(item.data as any).content && <p className="text-xs opacity-60 truncate mt-1">{(item.data as any).content}</p>}
                    {(item.data as any).description && <p className="text-xs opacity-60 truncate mt-1">{(item.data as any).description}</p>}
                  </div>

                  {selectedIndex === idx && (
                    <div className="flex items-center gap-1 animate-in slide-in-from-right-2">
                       <span className="text-[10px] font-bold opacity-70">跳转</span>
                       <CornerDownLeft className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : query.trim() ? (
            <div className="py-20 text-center space-y-3 opacity-30">
              <Search className="w-10 h-10 mx-auto" />
              <p className="text-sm font-bold uppercase tracking-widest">无匹配结果</p>
            </div>
          ) : (
            <div className="p-6 grid grid-cols-2 gap-4">
               <div className="col-span-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2 px-2 flex items-center gap-2">
                   <LayoutGrid className="w-3 h-3" /> 快速导航
               </div>
               {quickNavItems.map(nav => (
                 <button 
                  key={nav.tab}
                  onClick={() => { onNavigate(nav.tab); onClose(); }}
                  className="flex items-center gap-3 p-4 bg-slate-950/50 hover:bg-indigo-600/10 border border-slate-800 rounded-2xl text-left group transition-all"
                 >
                   <nav.icon className="w-4 h-4 text-slate-500 group-hover:text-indigo-400" />
                   <span className="text-xs font-bold text-slate-300 group-hover:text-white">{nav.label}</span>
                 </button>
               ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
