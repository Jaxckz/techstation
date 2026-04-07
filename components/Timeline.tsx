
import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { LogEntry, OfficeArea, UserRole } from '../types';
import { useAppConfig } from '../App';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ChevronRight, CheckCircle2, User, Filter, Eye, FileText, Trash2, Loader2, ArrowDownCircle, CalendarRange, Download, X } from 'lucide-react';
import PaginationControls from './PaginationControls';

interface TimelineProps {
    globalOfficeArea?: OfficeArea;
    currentUser?: string;
    userRole?: UserRole;
}

const Timeline: React.FC<TimelineProps> = ({ globalOfficeArea, currentUser, userRole }) => {
    const { config } = useAppConfig();
    const [logs, setLogs] = useState<any[]>([]);
    const [expandedId, setExpandedId] = useState<number | null>(null);

    // Pagination State
    const [page, setPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [totalItems, setTotalItems] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    // Filters
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    useEffect(() => {
        // Reset page when area or itemsPerPage changes
        setPage(1);
        fetchLogs(1);
    }, [globalOfficeArea, itemsPerPage]);

    // Refetch when page changes
    useEffect(() => {
        fetchLogs(page);
    }, [page]);

    const fetchLogs = async (pageNum: number) => {
        setIsLoading(true);
        try {
            const res = await api.getLogs(pageNum, itemsPerPage);
            const newLogs = res.data || [];
            const total = res.total || 0;

            let filtered = newLogs;
            if (globalOfficeArea && globalOfficeArea !== ('全局概览' as any)) {
                filtered = newLogs.filter((l: any) => l.officeArea === globalOfficeArea);
            }

            setLogs(filtered);
            setTotalItems(total); // Set total from server
        } catch (e) {
            console.error("Failed to load logs from server", e);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleExpand = (id: number) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const deleteLog = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('确定要删除这条日志吗？此操作不可撤销。')) {
            await api.deleteLog(id);
            setLogs(prev => prev.filter(l => l.id !== id));
            // Optionally refresh to get correct count, but local update is smoother
        }
    };

    // 客户端二次筛选 (针对当前页数据，因为后端暂未完全支持高级组合查询)
    const displayedLogs = logs.filter(log => {
        const logDate = new Date(log.date);

        const matchDate = (!startDate && !endDate) ? true :
            isWithinInterval(logDate, {
                start: startDate ? startOfDay(new Date(startDate)) : startOfDay(new Date('2000-01-01')),
                end: endDate ? endOfDay(new Date(endDate)) : endOfDay(new Date())
            });

        const matchCategory = selectedCategory === 'all' || log.category === selectedCategory;

        return matchDate && matchCategory;
    });

    const handleExport = () => {
        if (displayedLogs.length === 0) return alert("当前页无数据可导出");

        const header = 'ID,日期,分类,区域,标题,内容,记录人\n';
        const rows = displayedLogs.map(l => {
            const safeContent = l.content.replace(/[\r\n,"]/g, ' ');
            return `${l.id},${l.date},${l.category},${l.officeArea},${l.title},"${safeContent}",${l.author}`;
        }).join('\n');

        const blob = new Blob(["\ufeff" + header + rows], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Log_Export_${format(new Date(), 'yyyyMMdd')}.csv`;
        link.click();
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-32 animate-in fade-in duration-500">
            <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 bg-slate-900/50 p-6 rounded-3xl border border-slate-800">
                <div className="text-left space-y-2">
                    <h2 className="text-3xl font-black text-white tracking-tighter">全域日志追溯</h2>
                    <p className="text-slate-500 font-medium text-xs flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        实时数据源：中央服务器 (SQLite)
                    </p>
                </div>

                {/* Filter Toolbar */}
                <div className="flex flex-wrap items-center gap-3">
                    <select
                        value={selectedCategory}
                        onChange={e => setSelectedCategory(e.target.value)}
                        className="bg-slate-950 border border-slate-800 text-xs font-bold text-slate-300 rounded-xl px-3 py-2 outline-none h-10"
                    >
                        <option value="all">全部分类</option>
                        {config.categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 h-10">
                        <div className="pl-2 text-slate-500"><CalendarRange className="w-3.5 h-3.5" /></div>
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="bg-transparent text-[10px] text-white outline-none font-bold font-mono w-24"
                        />
                        <span className="text-slate-600 text-[10px]">-</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="bg-transparent text-[10px] text-white outline-none font-bold font-mono w-24"
                        />
                        {(startDate || endDate) && (
                            <button onClick={() => { setStartDate(''); setEndDate(''); }} className="p-1 hover:text-rose-500 text-slate-600"><X className="w-3 h-3" /></button>
                        )}
                    </div>

                    <button onClick={handleExport} className="h-10 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg transition-all">
                        <Download className="w-3.5 h-3.5" /> 导出本页
                    </button>
                </div>
            </header>

            {isLoading ? (
                <div className="py-20 flex flex-col items-center gap-4 text-slate-500">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                    <p className="text-xs font-bold uppercase tracking-widest">加载数据中...</p>
                </div>
            ) : (
                <div className="space-y-0">
                    {displayedLogs.map((log, index) => {
                        const isNewDay = index === 0 || logs[index - 1].date !== log.date;
                        return (
                            <div key={log.id} className="group relative flex gap-6">
                                {/* Left: Date/Time */}
                                <div className="w-24 flex-none pt-2 text-right">
                                    {isNewDay && (
                                        <div className="sticky top-24 mb-2 animate-in slide-in-from-right-4 fade-in">
                                            <span className="block text-xl font-black text-white leading-none font-mono">{format(new Date(log.date), 'MM-dd')}</span>
                                            <span className="block text-[10px] font-bold text-slate-500 uppercase mt-1">{format(new Date(log.date), 'yyyy')}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Center: Line */}
                                <div className="relative flex-none w-px bg-slate-800/50 my-2">
                                    <div className={`absolute top-3 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-slate-950 z-10 transition-colors ${log.category.includes('故障') || log.category.includes('抢修') ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 'bg-indigo-500 group-hover:bg-indigo-400'}`}></div>
                                </div>

                                {/* Right: Content Card */}
                                <div className="flex-1 pb-8 min-w-0">
                                    <div onClick={() => toggleExpand(log.id)} className={`bg-slate-900 border ${expandedId === log.id ? 'border-indigo-500/50 shadow-lg shadow-indigo-500/10' : 'border-slate-800'} rounded-2xl p-5 cursor-pointer hover:bg-slate-800/50 transition-all`}>
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="min-w-0">
                                                <h3 className="text-base font-bold text-white mb-2 truncate">{log.title}</h3>
                                                <div className="flex flex-wrap gap-2 text-[10px] font-bold text-slate-500 uppercase">
                                                    <span className={`px-2 py-0.5 rounded border bg-slate-950 border-slate-800 ${log.category.includes('故障') ? 'text-rose-400 border-rose-500/20 bg-rose-500/10' : ''}`}>{log.category}</span>
                                                    <span className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded border border-slate-800"><User className="w-3 h-3" /> {log.author}</span>
                                                    <span className="px-2 py-0.5 rounded border border-slate-800 bg-slate-950">{log.officeArea}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 flex-none">
                                                {userRole === 'ADMIN' && (
                                                    <button onClick={(e) => deleteLog(log.id, e)} className="p-2 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <ChevronRight className={`w-5 h-5 text-slate-600 transition-transform ${expandedId === log.id ? 'rotate-90' : ''}`} />
                                            </div>
                                        </div>

                                        {expandedId === log.id && (
                                            <div className="mt-5 pt-5 border-t border-slate-800/50 space-y-4 animate-in slide-in-from-top-2">
                                                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{log.content}</p>

                                                {log.items && log.items.length > 0 && (
                                                    <div className="space-y-1.5 bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                                                        {log.items.map((item: string, i: number) => (
                                                            <div key={i} className="flex gap-2 items-start text-xs text-slate-400">
                                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-none mt-0.5" />
                                                                <span>{item}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {log.attachments && log.attachments.length > 0 && (
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                                                        {log.attachments.map((att: any, i: number) => (
                                                            <a key={i} href={att.url} target="_blank" onClick={(e) => e.stopPropagation()} className="block group relative aspect-video bg-slate-950 rounded-lg overflow-hidden border border-slate-800 hover:border-indigo-500/50 transition-colors">
                                                                {att.type.startsWith('image/') ? (
                                                                    <img src={att.url} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 gap-1">
                                                                        <FileText className="w-6 h-6" />
                                                                        <span className="text-[9px] truncate max-w-[80%]">{att.name}</span>
                                                                    </div>
                                                                )}
                                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                                    <Eye className="w-4 h-4 text-white" />
                                                                </div>
                                                            </a>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {displayedLogs.length === 0 && <div className="text-center py-20 text-slate-700 font-bold uppercase tracking-widest pl-24">暂无匹配记录</div>}
                </div>
            )}

            {/* Pagination Controls */}
            <PaginationControls
                currentPage={page}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={setPage}
                onItemsPerPageChange={setItemsPerPage}
                className="pl-[120px]"
            />
        </div>
    );
};

export default Timeline;
