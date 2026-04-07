
import React, { useState, useEffect } from 'react';
import { ClipboardList, Plus, Trash2, LayoutGrid, Loader2, Sparkles, X, Send } from 'lucide-react';
import { api } from '../services/api';
import { format } from 'date-fns';
import { generateText } from '../services/geminiService';

const ReportHub: React.FC<{ currentUser: string }> = ({ currentUser }) => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [segments, setSegments] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskMonth, setNewTaskMonth] = useState(format(new Date(), 'yyyy-MM'));
  
  const [showSegmentForm, setShowSegmentForm] = useState(false);
  const [segmentName, setSegmentName] = useState('');
  const [segmentContent, setSegmentContent] = useState('');

  useEffect(() => { loadTasks(); }, []);
  useEffect(() => { if (selectedTask) loadSegments(selectedTask.id); }, [selectedTask]);

  const loadTasks = async () => {
    const data = await api.getReportTasks();
    setTasks(data);
  };

  const loadSegments = async (taskId: number) => {
    const data = await api.getReportSegments(taskId);
    setSegments(data);
  };

  const createReportTask = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.createReportTask({ title: newTaskTitle, month: newTaskMonth, status: 'draft', createdBy: currentUser });
    setNewTaskTitle('');
    setShowCreateModal(false);
    loadTasks();
  };

  const submitSegment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    await api.createReportSegment({ taskId: selectedTask.id, segmentName, content: segmentContent, author: currentUser });
    setSegmentName('');
    setSegmentContent('');
    setShowSegmentForm(false);
    loadSegments(selectedTask.id);
  };

  const deleteReportTask = async (id: number) => {
     if (confirm('确认删除此任务？')) {
        await api.deleteReportTask(id);
        setSelectedTask(null);
        loadTasks();
     }
  };

  const deleteSegment = async (id: number) => {
     if (confirm('删除此板块？')) {
        await api.deleteReportSegment(id);
        loadSegments(selectedTask.id);
     }
  };

  const handleExportMerge = async () => {
    if (segments.length === 0) return;
    setIsMerging(true);
    try {
      const prompt = `整合以下月报板块，生成一份逻辑通顺、语言专业的汇总报告：\n${segments.map(s => `【${s.segmentName}】: ${s.content}`).join('\n')}`;
      // 使用统一的 generateText，支持 DeepSeek 等配置
      const mergedText = await generateText(prompt);
      
      const blob = new Blob([typeof mergedText === 'string' ? mergedText : JSON.stringify(mergedText)], { type: 'text/plain' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${selectedTask.title}_AI整合.txt`;
      link.click();
    } catch (err) { alert('AI 整合失败，请检查 AI 配置'); } 
    finally { setIsMerging(false); }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500 pb-32">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">协同月报工作台</h2>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-sm shadow-xl transition-all">
          <Plus className="w-4 h-4" /> 发起任务
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
           <div className="p-6 border-b border-slate-800 bg-slate-800/10"><h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">任务列表</h3></div>
           <div className="divide-y divide-slate-800/40">
              {tasks.map(task => (
                 <div key={task.id} onClick={() => setSelectedTask(task)} className={`p-6 cursor-pointer hover:bg-slate-800/40 ${selectedTask?.id === task.id ? 'bg-indigo-600/10 border-l-4 border-indigo-500' : ''}`}>
                    <h4 className="text-sm font-bold text-white">{task.title}</h4>
                    <span className="text-[10px] text-slate-500 font-bold">{task.month}</span>
                 </div>
              ))}
           </div>
        </div>

        <div className="lg:col-span-8 space-y-6">
           {selectedTask ? (
             <div className="space-y-6 animate-in fade-in">
                <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl flex justify-between items-center">
                   <h3 className="text-2xl font-black text-white">{selectedTask.title}</h3>
                   <div className="flex gap-3">
                      <button onClick={handleExportMerge} disabled={isMerging} className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs flex items-center gap-2">
                        {isMerging ? <Loader2 className="animate-spin w-4 h-4" /> : <Sparkles className="w-4 h-4" />} AI 整合
                      </button>
                      <button onClick={() => deleteReportTask(selectedTask.id)} className="p-3 bg-slate-950 text-rose-500 rounded-xl"><Trash2 className="w-4 h-4" /></button>
                   </div>
                </div>

                <div className="flex justify-between px-2">
                   <h4 className="text-[10px] font-black text-slate-600 uppercase">已提交板块 ({segments.length})</h4>
                   <button onClick={() => setShowSegmentForm(true)} className="text-[10px] font-bold text-indigo-400 uppercase flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> 提交我的板块</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {segments.map(seg => (
                      <div key={seg.id} className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 relative group">
                         <div className="flex justify-between items-start mb-2">
                            <span className="text-[8px] font-black text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded uppercase">{seg.segmentName}</span>
                            <button onClick={() => deleteSegment(seg.id)} className="opacity-0 group-hover:opacity-100 text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                         </div>
                         <p className="text-xs text-slate-400 line-clamp-3">{seg.content}</p>
                         <p className="text-[9px] text-slate-600 font-bold mt-3 text-right">By {seg.author}</p>
                      </div>
                   ))}
                </div>
             </div>
           ) : <div className="text-center py-40 text-slate-700 font-bold uppercase">请选择任务</div>}
        </div>
      </div>

      {(showCreateModal || showSegmentForm) && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 animate-in fade-in">
           <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md" onClick={() => { setShowCreateModal(false); setShowSegmentForm(false); }}></div>
           <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 shadow-2xl space-y-6 animate-in zoom-in-95">
              {showCreateModal ? (
                 <form onSubmit={createReportTask} className="space-y-4">
                    <h3 className="text-xl font-bold text-white">新报表任务</h3>
                    <input autoFocus required type="text" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white outline-none" placeholder="任务标题" />
                    <input required type="month" value={newTaskMonth} onChange={e => setNewTaskMonth(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white outline-none" />
                    <button className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold">创建</button>
                 </form>
              ) : (
                 <form onSubmit={submitSegment} className="space-y-4">
                    <h3 className="text-xl font-bold text-white">提交板块</h3>
                    <input autoFocus required type="text" value={segmentName} onChange={e => setSegmentName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white outline-none" placeholder="板块名称" />
                    <textarea rows={8} required value={segmentContent} onChange={e => setSegmentContent(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white outline-none" placeholder="内容..." />
                    <button className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold">提交</button>
                 </form>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

export default ReportHub;
