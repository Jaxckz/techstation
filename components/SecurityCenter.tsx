
import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import { ShieldAlert, Plus, Trash2, ShieldCheck, X, Check, MapPin, CheckSquare, Square, User, ImageIcon, Paperclip, Loader2, Network, CalendarRange, Download, Eye, Maximize2, FileText } from 'lucide-react';
import { api } from '../services/api';
import { SecurityEventType, SecuritySeverity, SecurityStatus, OfficeArea, SECURITY_EVENT_TYPES, OFFICE_AREAS } from '../types';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ToastContext } from './Layout';
import PaginationControls from './PaginationControls';

interface SecurityCenterProps {
  globalOfficeArea?: string;
  currentUser: string;
}

const SecurityCenter: React.FC<SecurityCenterProps> = ({ globalOfficeArea, currentUser }) => {
  const { showToast } = useContext(ToastContext);
  const [logs, setLogs] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Detail Modal
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Date Filter
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const initialFormState = {
    eventType: SECURITY_EVENT_TYPES[0] as string,
    severity: 'medium',
    status: 'pending',
    location: '', 
    officeArea: globalOfficeArea || OFFICE_AREAS[0],
    sourceIp: '',
    targetIp: '',
    sourceMac: '', // Added MAC
    description: '',
    actionTaken: '',
  };

  const [formData, setFormData] = useState(initialFormState);
  
  // Validation
  const [errors, setErrors] = useState({ sourceIp: false, location: false });

  useEffect(() => {
    loadLogs();
    setCurrentPage(1);
  }, [globalOfficeArea]);

  const loadLogs = async () => {
    let data = await api.getSecurityLogs();
    if (globalOfficeArea && globalOfficeArea !== ('全局概览' as any)) {
      data = data.filter((l: any) => l.officeArea === globalOfficeArea);
    }
    setLogs(data);
  };

  const filteredLogs = useMemo(() => {
      let data = logs;
      
      if (filterType !== 'all') {
          data = data.filter(l => l.eventType === filterType);
      }

      if (startDate || endDate) {
          data = data.filter(l => isWithinInterval(new Date(l.timestamp), {
              start: startDate ? startOfDay(new Date(startDate)) : startOfDay(new Date('2000-01-01')),
              end: endDate ? endOfDay(new Date(endDate)) : endOfDay(new Date())
          }));
      }
      return data;
  }, [logs, filterType, startDate, endDate]);

  const paginatedLogs = useMemo(() => {
      const startIndex = (currentPage - 1) * itemsPerPage;
      return filteredLogs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLogs, currentPage, itemsPerPage]);

  const handleExport = () => {
      if (filteredLogs.length === 0) return alert("当前无数据可导出");
      
      const header = 'ID,时间,严重程度,类型,源IP,目标IP,MAC,位置,区域,描述,处理措施,上报人\n';
      const rows = filteredLogs.map(l => {
          const safeDesc = (l.description || '').replace(/[\r\n,"]/g, ' ');
          const safeAction = (l.actionTaken || '').replace(/[\r\n,"]/g, ' ');
          return `${l.id},${l.timestamp},${l.severity},${l.eventType},${l.sourceIp},${l.targetIp},${l.sourceMac || ''},${l.location},${l.officeArea},"${safeDesc}","${safeAction}",${l.author}`;
      }).join('\n');
      
      const blob = new Blob(["\ufeff" + header + rows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Security_Logs_${format(new Date(), 'yyyyMMdd')}.csv`;
      link.click();
  };

  const handleDelete = async (id: number) => {
    if (confirm("警告：确认删除此安全审计记录？此操作将记入系统日志。")) {
        try {
            await api.deleteSecurityLog(id);
            showToast("记录已删除", 'info');
            loadLogs();
            if (selectedLog?.id === id) setSelectedLog(null);
        } catch(e) {
            showToast("删除失败", 'error');
        }
    }
  };

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = {
        sourceIp: !formData.sourceIp.trim(),
        location: !formData.location.trim()
    };
    setErrors(newErrors);

    if (newErrors.sourceIp || newErrors.location) {
        showToast("请填写源IP及物理位置", 'error');
        return;
    }

    setIsProcessing(true);
    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => data.append(key, (formData as any)[key]));
      data.append('timestamp', new Date().toISOString());
      data.append('author', currentUser);
      selectedFiles.forEach(file => data.append('files', file));

      await api.createSecurityLog(data);
      setFormData(initialFormState);
      setSelectedFiles([]);
      setErrors({sourceIp: false, location: false});
      setShowAddForm(false);
      showToast("安全事件已上报", 'success');
      await loadLogs();
    } catch (e) {
      showToast("上报失败", 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-40">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-rose-500" /> 网络安全审计
          </h2>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
            {/* Type Filter */}
            <div className="relative group">
                <select 
                    value={filterType} 
                    onChange={e => { setFilterType(e.target.value); setCurrentPage(1); }} 
                    className="h-10 bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 rounded-xl px-3 outline-none"
                >
                    <option value="all">所有事件类型</option>
                    {SECURITY_EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>

            {/* Date Filter */}
            <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800 h-10">
                <CalendarRange className="w-3.5 h-3.5 text-slate-500 ml-1" />
                <input 
                    type="date" 
                    value={startDate} 
                    onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }} 
                    className="bg-transparent text-[10px] text-white outline-none font-bold font-mono w-24" 
                />
                <span className="text-slate-600 text-[10px]">-</span>
                <input 
                    type="date" 
                    value={endDate} 
                    onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }} 
                    className="bg-transparent text-[10px] text-white outline-none font-bold font-mono w-24" 
                />
                {(startDate || endDate) && <button onClick={() => {setStartDate(''); setEndDate(''); setCurrentPage(1);}}><X className="w-3 h-3 text-slate-500 hover:text-white"/></button>}
            </div>

            <button onClick={handleExport} className="h-10 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs flex items-center gap-2 transition-all">
                <Download className="w-3.5 h-3.5" /> 导出
            </button>

            <button onClick={() => setShowAddForm(true)} className="h-10 px-6 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs shadow-lg flex items-center gap-2 transition-all">
              <Plus className="w-4 h-4" /> 录入事件
            </button>
        </div>
      </header>

      <div className="bg-slate-900 border border-slate-800 rounded-[2rem] overflow-hidden shadow-xl">
          <div className="divide-y divide-slate-800/40">
            {paginatedLogs.length > 0 ? paginatedLogs.map(log => (
              <div key={log.id} onClick={() => setSelectedLog(log)} className="grid grid-cols-12 p-6 items-center hover:bg-slate-800/20 group relative cursor-pointer transition-colors">
                  <div className="col-span-2 space-y-1.5">
                    <div className="text-xs font-bold text-white truncate"><User className="w-3 h-3 inline mr-1 text-slate-500" /> {log.author}</div>
                    <span className={`text-[8px] px-2 py-0.5 rounded-md font-bold uppercase ${log.severity === 'critical' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-slate-900'}`}>{log.severity}</span>
                    <div className="text-[10px] text-slate-500 font-bold">{log.eventType}</div>
                  </div>
                  <div className="col-span-3 font-mono text-[11px] space-y-1 hidden md:block">
                     <div><span className="text-rose-400">{log.sourceIp}</span> {'->'} <span className="text-emerald-500">{log.targetIp}</span></div>
                     {log.sourceMac && <div className="text-slate-600 flex items-center gap-1"><Network className="w-3 h-3" /> {log.sourceMac}</div>}
                  </div>
                  <div className="col-span-3 text-xs font-bold text-slate-300 uppercase truncate hidden md:block">{log.location}</div>
                  <div className="col-span-8 md:col-span-2 text-right space-y-0.5">
                    <div className="text-xs text-slate-300 font-bold">{format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm')}</div>
                  </div>
                  
                  <div className="col-span-2 flex items-center justify-end gap-2">
                      {log.attachments && log.attachments.length > 0 && <span className="text-[10px] text-slate-500 flex items-center gap-1"><Paperclip className="w-3 h-3" /> {log.attachments.length}</span>}
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(log.id); }} className="p-2 text-slate-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                      <button className="p-2 text-slate-600 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"><Maximize2 className="w-4 h-4" /></button>
                  </div>
              </div>
            )) : <div className="py-28 text-center text-slate-800 uppercase text-[10px] font-bold tracking-widest">无匹配记录</div>}
          </div>
      </div>

      <PaginationControls 
        currentPage={currentPage}
        totalItems={filteredLogs.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={setItemsPerPage}
      />

      {/* Detail Modal */}
      {selectedLog && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 animate-in fade-in">
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setSelectedLog(null)}></div>
              <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl p-10 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
                  <div className="flex justify-between items-start mb-6">
                      <div className="space-y-2">
                          <h3 className="text-2xl font-black text-white flex items-center gap-3">
                              {selectedLog.eventType}
                              <span className={`text-xs px-2 py-1 rounded bg-slate-800 text-slate-400 border border-slate-700 uppercase font-bold`}>{selectedLog.severity}</span>
                          </h3>
                          <p className="text-xs text-slate-500 font-mono">ID: {selectedLog.id} • {format(new Date(selectedLog.timestamp), 'yyyy-MM-dd HH:mm:ss')} • By {selectedLog.author}</p>
                      </div>
                      <button onClick={() => setSelectedLog(null)} className="p-2 bg-slate-950 rounded-xl hover:bg-slate-800 text-slate-500 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-8 pr-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-950/50 p-6 rounded-3xl border border-slate-800">
                          <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase">源 IP / MAC</label>
                              <div className="font-mono text-rose-400 text-sm">{selectedLog.sourceIp}</div>
                              <div className="font-mono text-slate-600 text-xs">{selectedLog.sourceMac || '-'}</div>
                          </div>
                          <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase">目标 IP</label>
                              <div className="font-mono text-emerald-500 text-sm">{selectedLog.targetIp || '-'}</div>
                          </div>
                          <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase">物理位置</label>
                              <div className="text-slate-300 text-sm font-bold">{selectedLog.location}</div>
                          </div>
                          <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase">所属区域</label>
                              <div className="text-slate-300 text-sm font-bold">{selectedLog.officeArea}</div>
                          </div>
                      </div>

                      <div className="space-y-4">
                          <div className="space-y-2">
                              <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2"><ShieldAlert className="w-3 h-3" /> 事件描述</label>
                              <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/30 p-4 rounded-xl border border-slate-800/50">{selectedLog.description}</p>
                          </div>
                          <div className="space-y-2">
                              <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2"><Check className="w-3 h-3" /> 处置措施</label>
                              <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/30 p-4 rounded-xl border border-slate-800/50">{selectedLog.actionTaken || '未记录处置措施'}</p>
                          </div>
                      </div>

                      {selectedLog.attachments && selectedLog.attachments.length > 0 && (
                          <div className="space-y-3">
                              <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2"><ImageIcon className="w-3 h-3" /> 现场取证 ({selectedLog.attachments.length})</label>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                  {selectedLog.attachments.map((att: any, i: number) => (
                                      <a key={i} href={att.url} target="_blank" className="group relative aspect-video bg-slate-950 rounded-xl overflow-hidden border border-slate-800 hover:border-indigo-500/50 transition-all block">
                                          {att.type.startsWith('image/') ? (
                                              <img src={att.url} className="w-full h-full object-cover" />
                                          ) : (
                                              <div className="w-full h-full flex flex-col items-center justify-center text-slate-600">
                                                  <FileText className="w-8 h-8 mb-2" />
                                                  <span className="text-[9px] truncate max-w-[80%]">{att.name}</span>
                                              </div>
                                          )}
                                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                              <Eye className="w-5 h-5 text-white" />
                                              <span className="text-xs font-bold text-white">查看原图</span>
                                          </div>
                                      </a>
                                  ))}
                              </div>
                          </div>
                      )}
                  </div>
                  
                  <div className="pt-6 border-t border-slate-800 flex justify-end gap-3">
                      <button onClick={() => handleDelete(selectedLog.id)} className="px-6 py-3 bg-slate-950 hover:bg-rose-950/30 text-slate-500 hover:text-rose-500 border border-slate-800 hover:border-rose-500/30 rounded-xl font-bold text-xs flex items-center gap-2 transition-all">
                          <Trash2 className="w-4 h-4" /> 删除记录
                      </button>
                      <button onClick={() => setSelectedLog(null)} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-lg">
                          关闭
                      </button>
                  </div>
              </div>
          </div>
      )}

      {showAddForm && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 md:p-6 animate-in fade-in">
           <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md" onClick={() => setShowAddForm(false)}></div>
           <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-800 p-8">
                 <h3 className="text-2xl font-black text-white flex items-center gap-4">安全审计录入</h3>
                 <button onClick={() => setShowAddForm(false)} className="p-3 bg-slate-950 rounded-2xl text-slate-500"><X className="w-6 h-6" /></button>
              </div>

              <form onSubmit={handleAddLog} className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Event Type - Editable */}
                    <div className="space-y-2">
                       <label className="text-xs text-slate-500">事件类型</label>
                       <div className="relative group">
                            <input 
                                type="text" 
                                value={formData.eventType} 
                                onChange={(e) => setFormData({...formData, eventType: e.target.value})}
                                className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white outline-none focus:border-indigo-500"
                                placeholder="输入或选择..."
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                                <select 
                                    className="w-6 h-6 opacity-0 absolute inset-0 cursor-pointer" 
                                    onChange={(e) => setFormData({...formData, eventType: e.target.value})}
                                >
                                    {SECURITY_EVENT_TYPES.map(t => <option key={t} value={t} className="bg-slate-900 text-white">{t}</option>)}
                                </select>
                                <span className="text-xs text-indigo-400 font-bold px-2 pointer-events-none">▼</span>
                            </div>
                         </div>
                    </div>
                    
                    {/* Office - Editable */}
                    <div className="space-y-2">
                         <label className="text-xs text-slate-500">所在区域</label>
                         <div className="relative group">
                            <input 
                                type="text" 
                                value={formData.officeArea} 
                                onChange={(e) => setFormData({...formData, officeArea: e.target.value})}
                                className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white outline-none focus:border-indigo-500"
                                placeholder="输入或选择..."
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                                {OFFICE_AREAS.map(area => (
                                   <button 
                                      key={area}
                                      type="button"
                                      onClick={() => setFormData({...formData, officeArea: area})} 
                                      className="text-[9px] px-1.5 py-0.5 rounded border border-slate-700 text-slate-500 hover:bg-slate-800 hover:text-indigo-400 bg-slate-900"
                                   >
                                      {area.slice(0, 2)}
                                   </button>
                                ))}
                            </div>
                         </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-xs text-slate-500">源 IP <span className="text-rose-500">*</span></label>
                       <input type="text" placeholder="Source IP" value={formData.sourceIp} onChange={e => { setFormData({...formData, sourceIp: e.target.value}); if(e.target.value) setErrors(prev => ({...prev, sourceIp: false})); }} className={`w-full bg-slate-950 border ${errors.sourceIp ? 'border-rose-500' : 'border-slate-800'} p-4 rounded-2xl text-white outline-none`} />
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs text-slate-500">目标 IP</label>
                       <input type="text" placeholder="Target IP" value={formData.targetIp} onChange={e => setFormData({...formData, targetIp: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white outline-none" />
                    </div>

                    <div className="space-y-2">
                       <label className="text-xs text-slate-500">MAC 地址</label>
                       <input type="text" placeholder="XX:XX:XX:XX:XX:XX" value={formData.sourceMac} onChange={e => setFormData({...formData, sourceMac: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white outline-none font-mono" />
                    </div>
                    
                    <div className="space-y-2">
                       <label className="text-xs text-slate-500">物理位置 <span className="text-rose-500">*</span></label>
                       <input type="text" placeholder="例如：2号机房A机架" value={formData.location} onChange={e => { setFormData({...formData, location: e.target.value}); if(e.target.value) setErrors(prev => ({...prev, location: false})); }} className={`w-full bg-slate-950 border ${errors.location ? 'border-rose-500' : 'border-slate-800'} p-4 rounded-2xl text-white outline-none`} />
                    </div>

                    <textarea placeholder="事件描述" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white outline-none col-span-1 md:col-span-2" />
                 </div>
                 
                 <div className="border-t border-slate-800 pt-6">
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 text-indigo-400 font-bold uppercase text-xs"><Paperclip className="w-4 h-4" /> 添加现场图片 ({selectedFiles.length})</button>
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple className="hidden" accept="image/*" />
                 </div>

                 <div className="flex gap-4 pt-4">
                    <button type="submit" disabled={isProcessing} className="flex-1 py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-black shadow-xl flex items-center justify-center gap-3">
                       {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : '保存审计记录'}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default SecurityCenter;
