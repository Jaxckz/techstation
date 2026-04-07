
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { api } from '../services/api';
import { OAEvent, OAEventType } from '../types';
import { Plus, GitMerge, AlertCircle, RefreshCw, MessageSquare, Tag, Calendar, CheckCircle2, Circle, Edit3, Trash2, X, Save, CheckSquare, Square, MoreHorizontal, ArrowRight, Download, CalendarRange, Paperclip, FileText, Eye, Filter } from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import PaginationControls from './PaginationControls';

const OAEvents: React.FC<{ currentUser: string }> = ({ currentUser }) => {
  const [events, setEvents] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [filterType, setFilterType] = useState<OAEventType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all'); // 新增状态筛选
  
  // Selection & Batch Action
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchStatus, setBatchStatus] = useState('');
  const [isBatchCustom, setIsBatchCustom] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Date Filter
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Files
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialForm: Partial<OAEvent> = {
    title: '',
    type: 'issue',
    version: '',
    content: '',
    status: '待处理', 
    date: format(new Date(), 'yyyy-MM-dd')
  };
  const [formData, setFormData] = useState(initialForm);

  const STATUS_PRESETS = ['待处理', '已处理', '处理中', '已发布', '已关闭'];

  useEffect(() => { loadEvents(); }, []);

  const loadEvents = async () => {
    try {
        const data = await api.getOAEvents();
        setEvents(data);
    } catch(e) { console.error(e); }
  };

  const filteredEvents = useMemo(() => {
      let data = events;
      if (filterType !== 'all') {
          data = data.filter(e => e.type === filterType);
      }

      // 新增：状态筛选逻辑
      if (filterStatus !== 'all') {
          data = data.filter(e => e.status === filterStatus);
      }
      
      if (startDate || endDate) {
          data = data.filter(e => isWithinInterval(new Date(e.date), {
              start: startDate ? startOfDay(new Date(startDate)) : startOfDay(new Date('2000-01-01')),
              end: endDate ? endOfDay(new Date(endDate)) : endOfDay(new Date())
          }));
      }
      return data;
  }, [events, filterType, filterStatus, startDate, endDate]);

  const paginatedEvents = useMemo(() => {
      const startIndex = (currentPage - 1) * itemsPerPage;
      return filteredEvents.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredEvents, currentPage, itemsPerPage]);

  const handleExport = () => {
      if (filteredEvents.length === 0) return alert("当前无数据可导出");
      
      const header = 'ID,日期,类型,标题,版本,状态,内容,记录人\n';
      const rows = filteredEvents.map(e => {
          const safeContent = e.content.replace(/[\r\n,"]/g, ' ');
          return `${e.id},${e.date},${e.type},${e.title},${e.version || ''},${e.status},"${safeContent}",${e.author}`;
      }).join('\n');
      
      const blob = new Blob(["\ufeff" + header + rows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `OA_Events_${format(new Date(), 'yyyyMMdd')}.csv`;
      link.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;

    const data = new FormData();
    Object.keys(formData).forEach(key => data.append(key, (formData as any)[key]));
    data.append('author', currentUser);
    selectedFiles.forEach(file => data.append('files', file));

    if (editingEvent && editingEvent.id) {
        await api.updateOAEvent(editingEvent.id, data);
    } else {
        await api.createOAEvent(data);
    }
    
    setShowModal(false);
    setEditingEvent(null);
    setFormData(initialForm);
    setSelectedFiles([]);
    loadEvents();
  };

  const handleDelete = async (id: number) => {
      if (confirm("确定删除此记录？")) {
          await api.deleteOAEvent(id);
          loadEvents();
      }
  };

  const openEdit = (event: OAEvent) => {
      setEditingEvent(event);
      setFormData(event);
      setSelectedFiles([]); // Reset files on open, user adds new ones if needed
      setShowModal(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
  };

  // --- Selection Logic ---
  const toggleSelect = (id: number) => {
      const next = new Set(selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setSelectedIds(next);
  };

  const toggleSelectAll = () => {
      if (selectedIds.size === paginatedEvents.length && paginatedEvents.length > 0) {
          setSelectedIds(new Set());
      } else {
          setSelectedIds(new Set(paginatedEvents.map(e => e.id!)));
      }
  };

  const handleBatchUpdate = async () => {
      if (!batchStatus) return;
      if (!confirm(`确定将选中的 ${selectedIds.size} 项状态更新为 "${batchStatus}" ?`)) return;

      // Loop client-side update
      for (const id of selectedIds) {
          const evt = events.find(e => e.id === id);
          if (evt) {
              await api.updateOAEvent(id, { ...evt, status: batchStatus });
          }
      }
      setSelectedIds(new Set());
      setBatchStatus('');
      setIsBatchCustom(false);
      loadEvents();
  };

  const getTypeIcon = (type: OAEventType) => {
      switch(type) {
          case 'release': return <GitMerge className="w-4 h-4 text-emerald-500" />;
          case 'issue': return <AlertCircle className="w-4 h-4 text-rose-500" />;
          case 'update': return <RefreshCw className="w-4 h-4 text-indigo-500" />;
          default: return <MessageSquare className="w-4 h-4 text-slate-500" />;
      }
  };

  const getTypeLabel = (type: OAEventType) => {
      switch(type) {
          case 'release': return { text: '版本发布', bg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' };
          case 'issue': return { text: '故障修复', bg: 'bg-rose-500/10 text-rose-500 border-rose-500/20' };
          case 'update': return { text: '功能更新', bg: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' };
          default: return { text: '需求/其他', bg: 'bg-slate-500/10 text-slate-500 border-slate-500/20' };
      }
  };

  const getStatusColor = (status: string) => {
      if (status === '已处理' || status === 'resolved' || status === 'deployed' || status === '已发布') return 'text-emerald-500';
      if (status === '已关闭' || status === 'closed') return 'text-slate-500';
      return 'text-amber-500';
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in pb-32 px-4 md:px-6">
        <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
            <div>
                <h2 className="text-3xl font-black text-white tracking-tighter">OA 运维中心</h2>
                <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-widest">System Operations & Release Log</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                {/* 类型筛选 */}
                <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex overflow-x-auto max-w-full">
                    {(['all', 'release', 'update', 'issue'] as const).map(t => (
                        <button key={t} onClick={() => { setFilterType(t); setCurrentPage(1); }} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${filterType === t ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                            {t === 'all' ? '全部' : t === 'release' ? '发布' : t === 'update' ? '更新' : '故障'}
                        </button>
                    ))}
                </div>

                {/* 状态筛选 */}
                <div className="relative group">
                    <select 
                        value={filterStatus} 
                        onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }} 
                        className="h-10 bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 rounded-xl px-3 outline-none"
                    >
                        <option value="all">所有状态</option>
                        {STATUS_PRESETS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>

                {/* 日期筛选 */}
                <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800 h-10">
                    <CalendarRange className="w-3.5 h-3.5 text-slate-500 ml-1" />
                    <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }} className="bg-transparent text-[10px] text-white outline-none font-bold font-mono w-24" />
                    <span className="text-slate-600 text-[10px]">-</span>
                    <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }} className="bg-transparent text-[10px] text-white outline-none font-bold font-mono w-24" />
                    {(startDate || endDate) && <button onClick={() => {setStartDate(''); setEndDate(''); setCurrentPage(1);}}><X className="w-3 h-3 text-slate-500 hover:text-white"/></button>}
                </div>

                <div className="flex gap-2">
                    <button onClick={handleExport} className="h-10 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs flex items-center gap-2 transition-all">
                        <Download className="w-3.5 h-3.5" /> 导出
                    </button>
                    <button onClick={() => { setFormData(initialForm); setEditingEvent(null); setShowModal(true); }} className="h-10 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-lg flex items-center gap-2">
                        <Plus className="w-4 h-4" /> 记录事件
                    </button>
                </div>
            </div>
        </header>

        {/* Batch Toolbar */}
        {selectedIds.size > 0 && (
            <div className="sticky top-20 z-10 bg-indigo-900/90 backdrop-blur-md border border-indigo-500/30 p-4 rounded-2xl flex flex-wrap items-center justify-between shadow-2xl animate-in slide-in-from-top-2 gap-4">
                <div className="flex items-center gap-3">
                    <CheckSquare className="w-5 h-5 text-white" />
                    <span className="text-sm font-bold text-white">已选择 {selectedIds.size} 项</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-indigo-200">批量修改状态:</span>
                    <div className="relative group">
                       {isBatchCustom ? (
                           <input 
                              autoFocus
                              className="bg-slate-900 border border-indigo-400 rounded-lg px-3 py-1.5 text-xs text-white outline-none w-32"
                              placeholder="输入状态..."
                              value={batchStatus}
                              onChange={e => setBatchStatus(e.target.value)}
                              onBlur={() => !batchStatus && setIsBatchCustom(false)}
                           />
                       ) : (
                           <select 
                              value={batchStatus} 
                              onChange={e => {
                                  if (e.target.value === 'custom') { setIsBatchCustom(true); setBatchStatus(''); }
                                  else setBatchStatus(e.target.value);
                              }} 
                              className="bg-slate-900 border border-indigo-500/50 rounded-lg px-3 py-1.5 text-xs text-white outline-none w-32"
                           >
                              <option value="">选择状态...</option>
                              {STATUS_PRESETS.map(s => <option key={s} value={s}>{s}</option>)}
                              <option value="custom">自定义...</option>
                           </select>
                       )}
                    </div>
                    <button onClick={handleBatchUpdate} className="px-4 py-1.5 bg-white text-indigo-900 rounded-lg text-xs font-bold hover:bg-indigo-100 flex items-center gap-1">
                        应用 <ArrowRight className="w-3 h-3" />
                    </button>
                    <button onClick={() => setSelectedIds(new Set())} className="ml-2 p-1.5 text-indigo-300 hover:text-white"><X className="w-4 h-4" /></button>
                </div>
            </div>
        )}

        <div className="relative border-l-2 border-slate-800 ml-4 space-y-4 pl-8 py-2">
            {/* Header for Select All */}
            {paginatedEvents.length > 0 && (
                <div className="flex items-center gap-2 mb-2 -ml-1">
                    <button onClick={toggleSelectAll} className="flex items-center gap-2 text-[10px] font-bold text-slate-500 hover:text-indigo-400 transition-colors">
                        {selectedIds.size === paginatedEvents.length ? <CheckSquare className="w-4 h-4 text-indigo-500" /> : <Square className="w-4 h-4" />}
                        全选本页
                    </button>
                </div>
            )}

            {paginatedEvents.map(event => {
                const label = getTypeLabel(event.type);
                const isSelected = selectedIds.has(event.id!);
                return (
                    <div key={event.id} className="relative group flex items-start gap-4">
                        {/* Timeline Node */}
                        <div className={`absolute -left-[41px] top-6 w-5 h-5 rounded-full border-4 border-slate-950 flex items-center justify-center z-10 ${event.type === 'release' ? 'bg-emerald-500' : event.type === 'issue' ? 'bg-rose-500' : 'bg-indigo-500'}`}></div>
                        
                        {/* Checkbox */}
                        <div className="pt-6">
                            <button onClick={() => toggleSelect(event.id!)} className="text-slate-600 hover:text-indigo-500 transition-colors">
                                {isSelected ? <CheckSquare className="w-5 h-5 text-indigo-500" /> : <Square className="w-5 h-5" />}
                            </button>
                        </div>

                        {/* Card */}
                        <div className={`flex-1 bg-slate-900 border ${isSelected ? 'border-indigo-500/50 bg-indigo-900/10' : 'border-slate-800'} rounded-3xl p-6 hover:border-slate-700 transition-all shadow-sm`}>
                            <div className="flex justify-between items-start mb-4">
                                <div className="space-y-1">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase ${label.bg} flex items-center gap-1.5`}>
                                            {getTypeIcon(event.type)} {label.text}
                                        </span>
                                        <span className="text-sm font-bold text-slate-400 font-mono">{event.date}</span>
                                        {event.version && <span className="text-[10px] font-black bg-slate-800 text-white px-2 py-0.5 rounded flex items-center gap-1"><Tag className="w-3 h-3" /> {event.version}</span>}
                                    </div>
                                    <h3 className="text-lg font-bold text-white mt-1">{event.title}</h3>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEdit(event)} className="p-2 bg-slate-950 rounded-xl text-slate-500 hover:text-white"><Edit3 className="w-4 h-4" /></button>
                                    <button onClick={() => handleDelete(event.id!)} className="p-2 bg-slate-950 rounded-xl text-slate-500 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                            <div className="bg-slate-950/50 p-4 rounded-2xl text-sm text-slate-300 leading-relaxed whitespace-pre-wrap border border-slate-800/50">
                                {event.content}
                            </div>
                            
                            {/* Attachments Display */}
                            {event.attachments && event.attachments.length > 0 && (
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {event.attachments.map((att: any, i: number) => (
                                        <a key={i} href={att.url} target="_blank" className="flex items-center gap-2 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg hover:border-indigo-500/50 group">
                                            {att.type.startsWith('image/') ? <Eye className="w-3 h-3 text-indigo-400" /> : <FileText className="w-3 h-3 text-slate-500" />}
                                            <span className="text-[10px] text-slate-400 group-hover:text-white truncate max-w-[120px]">{att.name}</span>
                                        </a>
                                    ))}
                                </div>
                            )}

                            <div className="mt-4 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className={`text-[10px] font-bold uppercase flex items-center gap-1 ${getStatusColor(event.status)}`}>
                                        <Circle className="w-3 h-3 fill-current" />
                                        {event.status}
                                    </span>
                                </div>
                                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">By {event.author}</span>
                            </div>
                        </div>
                    </div>
                );
            })}
            {filteredEvents.length === 0 && <div className="py-20 text-slate-600 font-bold uppercase tracking-widest text-xs pl-4">暂无相关记录</div>}
        </div>

        <PaginationControls 
            currentPage={currentPage}
            totalItems={filteredEvents.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
            className="ml-8"
        />

        {showModal && (
            <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 animate-in fade-in">
                <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setShowModal(false)}></div>
                <form onSubmit={handleSubmit} className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl space-y-6 animate-in zoom-in-95 overflow-y-auto max-h-[90vh]">
                    <h3 className="text-xl font-black text-white">{editingEvent ? '编辑事件' : '记录新事件'}</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">事件类型</label>
                            <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none text-sm">
                                <option value="issue">故障修复</option>
                                <option value="release">版本发布</option>
                                <option value="update">功能更新</option>
                                <option value="request">需求变更</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">发生日期</label>
                            <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none text-sm" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">标题概述</label>
                        <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="例如：v2.3.0 正式发布 / 登录接口报错修复" className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none text-sm font-bold" />
                    </div>

                    {formData.type === 'release' && (
                        <div className="space-y-2 animate-in slide-in-from-top-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">版本号</label>
                            <input type="text" value={formData.version} onChange={e => setFormData({...formData, version: e.target.value})} placeholder="v1.0.0" className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none text-sm font-mono" />
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">详细内容</label>
                        <textarea rows={5} value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} placeholder="更新日志或故障详情..." className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none text-sm resize-none" />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">当前状态 (支持自定义)</label>
                        <div className="relative">
                            <input 
                                type="text"
                                list="status-suggestions"
                                value={formData.status}
                                onChange={e => setFormData({...formData, status: e.target.value})}
                                className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none text-sm font-bold focus:border-indigo-500 transition-colors"
                                placeholder="选择或输入状态..."
                            />
                            <datalist id="status-suggestions">
                                {STATUS_PRESETS.map(s => <option key={s} value={s} />)}
                            </datalist>
                        </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-800">
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="text-indigo-400 font-bold text-xs uppercase flex items-center gap-2"><Paperclip className="w-4 h-4" /> 添加附件 ({selectedFiles.length})</button>
                        <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple className="hidden" />
                        {selectedFiles.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {selectedFiles.map((f, i) => (
                                    <div key={i} className="px-2 py-1 bg-slate-950 border border-slate-800 rounded text-[10px] text-slate-400 flex items-center gap-1">
                                        {f.name} <button type="button" onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))}><X className="w-3 h-3 hover:text-white" /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-4 pt-2">
                        <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 bg-slate-950 text-slate-500 font-bold rounded-xl border border-slate-800">取消</button>
                        <button className="flex-[2] py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2">
                            <Save className="w-4 h-4" /> 保存记录
                        </button>
                    </div>
                </form>
            </div>
        )}
    </div>
  );
};

export default OAEvents;
