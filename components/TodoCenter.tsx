
import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { 
  Plus, Circle, Clock, Trash2, CheckSquare, Square, X, ArrowUpDown, Building2, User, CheckCircle2, ListTodo, Calendar, MapPin, Download, CalendarRange, ArrowRight, Paperclip, FileText, Eye, UserCircle
} from 'lucide-react';
import { api } from '../services/api';
import { TodoEntry, TodoStatus, TodoPriority, OfficeArea, OFFICE_AREAS, UserRole } from '../types';
import { format, isPast, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ToastContext } from './Layout';
import PaginationControls from './PaginationControls';

interface TodoCenterProps {
  globalOfficeArea?: string;
  currentUser: string;
  userRole?: UserRole; 
}

const TodoCenter: React.FC<TodoCenterProps> = ({ globalOfficeArea, currentUser, userRole }) => {
  const { showToast } = useContext(ToastContext);
  const [todos, setTodos] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  
  // Date input fix: Set default to today string
  const [newDueDate, setNewDueDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [newPriority, setNewPriority] = useState<TodoPriority>('medium');
  const [newOfficeArea, setNewOfficeArea] = useState<string>(OFFICE_AREAS[0]);
  
  const [filterStatus, setFilterStatus] = useState<TodoStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'time' | 'priority'>('time');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  
  // Preview State
  const [previewFile, setPreviewFile] = useState<{url: string, name: string, type: string} | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Bulk Actions
  const [batchStatus, setBatchStatus] = useState('');

  // Date Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Files
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validation
  const [errors, setErrors] = useState({ title: false });

  useEffect(() => {
    loadTodos();
    setSelectedIds(new Set());
    setCurrentPage(1); // Reset page on area change
  }, [globalOfficeArea]);

  useEffect(() => {
    if (globalOfficeArea && globalOfficeArea !== ('全局概览' as any)) {
      setNewOfficeArea(globalOfficeArea);
    } else {
      setNewOfficeArea(OFFICE_AREAS[0]);
    }
  }, [globalOfficeArea]);

  const loadTodos = async () => {
    try {
      let data = await api.getTodos();
      if (globalOfficeArea && globalOfficeArea !== ('全局概览' as any)) {
        data = data.filter((t: any) => t.officeArea === globalOfficeArea);
      }
      setTodos(data);
    } catch (err) {
      console.error("Failed to load todos:", err);
    }
  };

  const filteredTodos = useMemo(() => {
      let data = todos;
      
      if (filterStatus !== 'all') {
          data = data.filter((t: any) => t.status === filterStatus);
      }

      // Date Filtering
      if (startDate || endDate) {
          data = data.filter((t: any) => isWithinInterval(new Date(t.createdAt), {
              start: startDate ? startOfDay(new Date(startDate)) : startOfDay(new Date('2000-01-01')),
              end: endDate ? endOfDay(new Date(endDate)) : endOfDay(new Date())
          }));
      }

      const priorityWeight = { high: 3, medium: 2, low: 1 };
      const sorted = [...data].sort((a, b) => {
        if (sortBy === 'priority') {
          const weightA = priorityWeight[a.priority as keyof typeof priorityWeight] || 0;
          const weightB = priorityWeight[b.priority as keyof typeof priorityWeight] || 0;
          if (weightA !== weightB) return weightB - weightA;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      
      return sorted;
  }, [todos, filterStatus, sortBy, startDate, endDate]);

  // Paginated Data
  const paginatedTodos = useMemo(() => {
      const startIndex = (currentPage - 1) * itemsPerPage;
      return filteredTodos.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTodos, currentPage, itemsPerPage]);

  const handleExport = () => {
      if (filteredTodos.length === 0) return alert("当前列表为空，无法导出");
      
      const header = 'ID,标题,状态,优先级,区域,发布人,处理人,创建时间,截止时间,描述\n';
      const rows = filteredTodos.map(t => {
          const safeDesc = (t.description || '').replace(/[\r\n,"]/g, ' ');
          return `${t.id},${t.title},${t.status},${t.priority},${t.officeArea},${t.author},${t.handler || ''},${t.createdAt},${t.dueDate || ''},"${safeDesc}"`;
      }).join('\n');
      
      const blob = new Blob(["\ufeff" + header + rows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Todos_Export_${format(new Date(), 'yyyyMMdd')}.csv`;
      link.click();
  };

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
        setErrors({ title: true });
        showToast("事项名称不能为空", 'error');
        return;
    }

    const formData = new FormData();
    formData.append('title', newTitle);
    formData.append('description', newDesc);
    formData.append('status', 'pending');
    formData.append('priority', newPriority);
    formData.append('officeArea', newOfficeArea);
    formData.append('dueDate', newDueDate);
    formData.append('author', currentUser);
    // Handler is initially empty, assigned when someone acts on it
    selectedFiles.forEach(file => formData.append('files', file));

    try {
      await api.createTodo(formData);
      // Reset Form
      setNewTitle('');
      setNewDesc('');
      setNewDueDate(format(new Date(), 'yyyy-MM-dd')); // Reset date to today
      setSelectedFiles([]);
      setErrors({title: false});
      setShowAddForm(false);
      showToast("事项创建成功", 'success');
      await loadTodos();
    } catch (err) {
      console.error("Failed to add todo:", err);
      showToast("创建失败，请重试", 'error');
    }
  };

  const updateStatus = async (id: number, status: TodoStatus) => {
    // When status changes, record the CURRENT USER as the handler (task claim/process)
    await api.updateTodoStatus(id, status, status === 'completed' ? new Date() : null, currentUser);
    await loadTodos();
    if (status === 'completed') showToast("任务已完成", 'success');
    else if (status === 'processing') showToast("已开始处理此任务", 'info');
  };

  const deleteTodo = async (id: number) => {
    if (confirm('确定删除此事项吗？')) {
      await api.deleteTodo(id);
      await loadTodos();
      showToast("已删除", 'info');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
  };

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedTodos.length && paginatedTodos.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedTodos.map(t => Number(t.id!))));
    }
  };

  const handleBatchUpdate = async () => {
      if (!batchStatus) return;
      if (!confirm(`确定将选中的 ${selectedIds.size} 项状态更新为 "${batchStatus}" ?`)) return;

      for (const id of selectedIds) {
          const completedAt = batchStatus === 'completed' ? new Date() : null;
          // Update handler to current user for batch operations too
          await api.updateTodoStatus(id, batchStatus as TodoStatus, completedAt, currentUser);
      }
      
      setSelectedIds(new Set());
      setBatchStatus('');
      loadTodos();
      showToast("批量状态更新成功", 'success');
  };

  const handleBatchDelete = async () => {
      if (!confirm(`确定删除选中的 ${selectedIds.size} 项任务？此操作不可撤销。`)) return;
      
      for (const id of selectedIds) {
          await api.deleteTodo(id);
      }
      setSelectedIds(new Set());
      loadTodos();
      showToast("批量删除成功", 'success');
  };

  const triggerDownload = (url: string, name: string) => {
      const link = document.createElement('a');
      link.href = url;
      link.download = name;
      link.click();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-32 px-4 md:px-6">
      <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <Building2 className="w-3.5 h-3.5 text-indigo-400" />
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{globalOfficeArea || '全域'} 任务清单</span>
          </div>
          <h2 className="text-3xl font-bold text-white tracking-tight">事项中心</h2>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          {/* Status Filter */}
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 overflow-x-auto max-w-full">
             {(['all', 'pending', 'processing', 'completed'] as const).map(s => (
               <button key={s} onClick={() => { setFilterStatus(s); setCurrentPage(1); }} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap ${filterStatus === s ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                 {s === 'all' ? '全部' : s === 'pending' ? '待处理' : s === 'processing' ? '处理中' : '已完成'}
               </button>
             ))}
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

          <div className="flex gap-2">
              <button onClick={handleExport} className="px-3 py-2.5 bg-slate-800 text-slate-300 rounded-xl font-bold text-xs hover:bg-slate-700 transition-all flex items-center gap-2 h-10">
                  <Download className="w-3.5 h-3.5" /> 导出
              </button>
              <button onClick={() => setSortBy(sortBy === 'time' ? 'priority' : 'time')} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all h-10 ${sortBy === 'priority' ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'}`}><ArrowUpDown className="w-3.5 h-3.5" />{sortBy === 'time' ? '按时间' : '按优先级'}</button>
              <button onClick={() => setShowAddForm(true)} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-lg transition-all active:scale-95 h-10 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> 新增</button>
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
                  <span className="text-xs font-bold text-indigo-200">批量操作:</span>
                  <div className="relative group">
                        <select 
                            value={batchStatus} 
                            onChange={e => setBatchStatus(e.target.value)} 
                            className="bg-slate-900 border border-indigo-500/50 rounded-lg px-3 py-1.5 text-xs text-white outline-none w-32"
                        >
                            <option value="" className="bg-slate-950 text-slate-400">更改状态...</option>
                            <option value="pending" className="bg-slate-950 text-white">待处理</option>
                            <option value="processing" className="bg-slate-950 text-white">处理中</option>
                            <option value="completed" className="bg-slate-950 text-white">已完成</option>
                        </select>
                  </div>
                  <button onClick={handleBatchUpdate} disabled={!batchStatus} className="px-4 py-1.5 bg-white text-indigo-900 rounded-lg text-xs font-bold hover:bg-indigo-100 flex items-center gap-1 disabled:opacity-50">
                      应用 <ArrowRight className="w-3 h-3" />
                  </button>
                  <div className="w-px h-6 bg-indigo-500/30 mx-2"></div>
                  <button onClick={handleBatchDelete} className="px-3 py-1.5 bg-rose-600/20 border border-rose-500/30 text-rose-300 rounded-lg text-xs font-bold hover:bg-rose-600 hover:text-white flex items-center gap-1">
                      <Trash2 className="w-3.5 h-3.5" /> 批量删除
                  </button>
                  <button onClick={() => setSelectedIds(new Set())} className="ml-2 p-1.5 text-indigo-300 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
          </div>
      )}

      {paginatedTodos.length > 0 && (
        <div className="flex items-center justify-between px-2">
          <button onClick={toggleSelectAll} className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase hover:text-indigo-400 transition-colors">
            {selectedIds.size === paginatedTodos.length && paginatedTodos.length > 0 ? <CheckSquare className="w-4 h-4 text-indigo-500" /> : <Square className="w-4 h-4" />}
            {selectedIds.size === paginatedTodos.length ? '取消本页全选' : '全选本页'}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {paginatedTodos.length > 0 ? paginatedTodos.map(todo => (
          <div key={todo.id} className={`group bg-slate-900/50 border rounded-2xl p-5 flex items-start gap-4 transition-all hover:bg-slate-900 cursor-pointer ${todo.status === 'completed' ? 'border-emerald-500/20 opacity-60' : 'border-slate-800/60'} ${selectedIds.has(Number(todo.id!)) ? 'border-indigo-500/50 bg-indigo-500/5' : ''}`}>
            
            <div onClick={(e) => { e.stopPropagation(); toggleSelect(Number(todo.id!)); }} className="pt-1.5 flex-none">
                <button className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${selectedIds.has(Number(todo.id!)) ? 'bg-indigo-600 border-indigo-500' : 'bg-slate-950 border-slate-700 hover:border-indigo-500'}`}>
                    {selectedIds.has(Number(todo.id!)) && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                </button>
            </div>

            <button onClick={(e) => { e.stopPropagation(); updateStatus(Number(todo.id!), todo.status === 'completed' ? 'pending' : 'completed'); }} className="mt-1 flex-none">
              {todo.status === 'completed' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : todo.status === 'processing' ? <Clock className="w-5 h-5 text-amber-500 animate-pulse" /> : <Circle className="w-5 h-5 text-slate-500" />}
            </button>
            
            <div className="flex-1 space-y-2 min-w-0">
              <div className="flex justify-between items-start flex-wrap gap-2">
                  <h4 className={`font-bold text-base ${todo.status === 'completed' ? 'line-through text-slate-600' : 'text-slate-100'} mr-auto`}>{todo.title}</h4>
                  <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-slate-500 flex items-center gap-1" title="任务发布者">
                          <User className="w-3 h-3" /> 发布: {todo.author}
                      </span>
                      {/* 显示处理人 */}
                      {todo.handler && (
                          <span className="text-[10px] font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-indigo-400 flex items-center gap-1" title="任务处理者">
                              <UserCircle className="w-3 h-3" /> 执行: {todo.handler}
                          </span>
                      )}
                  </div>
              </div>
              {todo.description && <p className="text-sm text-slate-500 font-medium leading-relaxed">{todo.description}</p>}
              
              {todo.attachments && todo.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                      {todo.attachments.map((att: any, i: number) => (
                          <div 
                            key={i} 
                            onClick={(e) => { e.stopPropagation(); setPreviewFile(att); }} 
                            onDoubleClick={(e) => { e.stopPropagation(); triggerDownload(att.url, att.name); }}
                            className="flex items-center gap-2 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg hover:border-indigo-500/50 group cursor-pointer transition-all active:scale-95"
                            title="单击预览，双击下载"
                          >
                              {att.type.startsWith('image/') ? <Eye className="w-3 h-3 text-indigo-400" /> : <FileText className="w-3 h-3 text-slate-500" />}
                              <span className="text-[10px] text-slate-400 group-hover:text-white truncate max-w-[120px]">{att.name}</span>
                          </div>
                      ))}
                  </div>
              )}

              <div className="flex items-center gap-4 text-[9px] font-bold text-slate-600 uppercase mt-1 flex-wrap">
                <span className={`px-2 py-0.5 rounded border ${todo.priority === 'high' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : todo.priority === 'medium' ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' : 'bg-slate-500/10 text-slate-500 border-slate-500/20'}`}>{todo.priority}</span>
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-emerald-500" /> {todo.officeArea}</span>
                {todo.dueDate && <span className={`flex items-center gap-1 ${isPast(new Date(todo.dueDate)) && todo.status !== 'completed' ? 'text-rose-500' : ''}`}><Calendar className="w-3 h-3" /> {format(new Date(todo.dueDate), 'yyyy-MM-dd')}</span>}
                <span className="text-slate-700">Created: {format(new Date(todo.createdAt), 'MM-dd HH:mm')}</span>
              </div>
            </div>
            
            {/* 权限控制：仅管理员、任务发布者或处理者可删除 */}
            {(userRole === 'ADMIN' || currentUser === todo.author || currentUser === todo.handler) && (
                <button onClick={(e) => { e.stopPropagation(); deleteTodo(Number(todo.id!)); }} className="p-2 text-slate-700 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 className="w-5 h-5" /></button>
            )}
          </div>
        )) : (
          <div className="py-20 text-center bg-slate-900/20 rounded-3xl border border-dashed border-slate-800/60 flex flex-col items-center gap-4">
            <ListTodo className="w-12 h-12 text-slate-800" />
            <p className="text-slate-600 font-bold text-xs uppercase tracking-widest">无匹配任务</p>
          </div>
        )}
      </div>

      <PaginationControls 
        currentPage={currentPage}
        totalItems={filteredTodos.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={setItemsPerPage}
      />

      {/* Preview Modal */}
      {previewFile && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 md:p-8 animate-in fade-in">
              <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md" onClick={() => setPreviewFile(null)}></div>
              <div className="relative w-full h-full max-w-5xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
                  <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
                      <div className="flex items-center gap-3 overflow-hidden">
                          <FileText className="w-5 h-5 text-indigo-400 flex-none" />
                          <span className="text-sm font-bold text-white truncate">{previewFile.name}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-none">
                          <a href={previewFile.url} download={previewFile.name} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all">
                              <Download className="w-4 h-4" /> 下载文件
                          </a>
                          <button onClick={() => setPreviewFile(null)} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-400 hover:text-white transition-colors">
                              <X className="w-5 h-5" />
                          </button>
                      </div>
                  </div>
                  <div className="flex-1 bg-slate-950/50 p-4 overflow-hidden flex items-center justify-center relative">
                      {previewFile.type.startsWith('image/') ? (
                          <img src={previewFile.url} className="max-w-full max-h-full object-contain shadow-lg rounded-lg" alt="preview" />
                      ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center">
                              {/* Try iframe for PDF/Text */}
                              <iframe src={previewFile.url} className="w-full h-full border-0 rounded-xl bg-white" title="preview" />
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {showAddForm && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 animate-in fade-in">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowAddForm(false)}></div>
          <form onSubmit={handleAddTodo} className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6 animate-in zoom-in-95 overflow-y-auto max-h-[95vh]">
            <h3 className="text-xl font-bold text-white">新建待办事项</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                 <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">事项名称 <span className="text-rose-500">*</span></label>
                 <input 
                    autoFocus 
                    type="text" 
                    placeholder="事项名称..." 
                    value={newTitle} 
                    onChange={e => { setNewTitle(e.target.value); if(e.target.value) setErrors(prev => ({...prev, title: false})); }} 
                    className={`w-full bg-slate-950 border ${errors.title ? 'border-rose-500' : 'border-slate-800 focus:border-indigo-500'} p-4 rounded-xl text-white outline-none transition-colors`} 
                 />
              </div>
              <div className="space-y-1">
                 <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">所属办公区</label>
                 <div className="relative group">
                    <input 
                        type="text" 
                        value={newOfficeArea} 
                        onChange={(e) => setNewOfficeArea(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-indigo-500"
                        placeholder="输入或选择..."
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                        {OFFICE_AREAS.map(area => (
                           <button 
                              key={area}
                              type="button"
                              onClick={() => setNewOfficeArea(area)} 
                              className="text-[9px] px-1.5 py-0.5 rounded border border-slate-700 text-slate-500 hover:bg-slate-800 hover:text-indigo-400 bg-slate-900"
                           >
                              {area.slice(0, 2)}
                           </button>
                        ))}
                    </div>
                 </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                     <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">优先级</label>
                     <select value={newPriority} onChange={e => setNewPriority(e.target.value as any)} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white outline-none appearance-none">
                       <option value="low" className="bg-slate-950 text-slate-300">低优先级</option>
                       <option value="medium" className="bg-slate-950 text-slate-300">普通</option>
                       <option value="high" className="bg-slate-950 text-slate-300">紧急</option>
                     </select>
                  </div>
                  
                  <div className="space-y-1">
                     <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">截至日期</label>
                     <input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white outline-none" />
                  </div>
              </div>

              <div className="space-y-1">
                 <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">详情描述</label>
                 <textarea placeholder="详情描述..." value={newDesc} onChange={e => setNewDesc(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-indigo-500 h-24 resize-none" />
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
            </div>
            <div className="flex gap-3 pt-4 pb-4">
              <button type="button" onClick={() => setShowAddForm(false)} className="flex-1 py-4 text-slate-500 font-bold border border-slate-800 rounded-xl">取消</button>
              <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-xl font-bold">创建事项</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default TodoCenter;
