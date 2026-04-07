
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BookOpen, Plus, Search, Trash2, FileText, Edit3, X, Paperclip, Download, Loader2, Eye, FileWarning } from 'lucide-react';
import { api } from '../services/api';
import PaginationControls from './PaginationControls';

const KNOWLEDGE_CATEGORIES = ['技术SOP', '系统架构', '故障复盘', '维保手册', '备件清单', '常用备忘'];

const KnowledgeBase: React.FC<{ currentUser: string }> = ({ currentUser }) => {
  const [entries, setEntries] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  // Preview State
  const [previewFile, setPreviewFile] = useState<{url: string, name: string, type: string} | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const initialForm = {
    title: '',
    category: KNOWLEDGE_CATEGORIES[0],
    content: '',
    remarks: '',
  };
  const [formData, setFormData] = useState(initialForm);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    const data = await api.getKnowledge();
    setEntries(data);
  };

  const filteredEntries = useMemo(() => {
      return entries.filter(e => e.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [entries, searchQuery]);

  const paginatedEntries = useMemo(() => {
      const startIndex = (currentPage - 1) * itemsPerPage;
      return filteredEntries.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredEntries, currentPage, itemsPerPage]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim()) return;

    if (selectedEntry) {
      // API 暂不支持编辑时传文件，简化处理
      await api.updateKnowledge(selectedEntry.id, { ...formData, author: currentUser });
    } else {
      const data = new FormData();
      Object.keys(formData).forEach(key => data.append(key, (formData as any)[key]));
      data.append('author', currentUser);
      selectedFiles.forEach(file => data.append('files', file));
      await api.createKnowledge(data);
    }

    setFormData(initialForm);
    setSelectedFiles([]);
    setSelectedEntry(null);
    setShowForm(false);
    await loadEntries();
  };

  const handleDelete = async (id: number) => {
    if (confirm('确定删除此文档？')) {
      await api.deleteKnowledge(id);
      setSelectedEntry(null);
      loadEntries();
    }
  };

  const triggerDownload = (url: string, name: string) => {
      const link = document.createElement('a');
      link.href = url;
      link.download = name;
      link.click();
  };

  // Helper to check if browser can likely render the file
  const canBrowserPreview = (type: string) => {
      if (!type) return false;
      return type.startsWith('image/') || type === 'application/pdf' || type.startsWith('text/');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-32 px-4 md:px-6">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tighter flex items-center gap-3">
             <BookOpen className="w-8 h-8 text-indigo-400" /> 技术知识库
          </h2>
        </div>
        <button onClick={() => { setFormData(initialForm); setSelectedEntry(null); setShowForm(true); }} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs shadow-xl flex items-center gap-2 transition-all">
           <Plus className="w-4 h-4" /> 录入手册
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-4 space-y-6">
           <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
              <input type="text" placeholder="搜索..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="w-full bg-slate-900 border border-slate-800 p-4 pl-11 rounded-[1.5rem] outline-none text-xs text-slate-200 focus:border-indigo-500 transition-colors" />
           </div>
           <div className="bg-slate-900 border border-slate-800 rounded-[2rem] overflow-hidden divide-y divide-slate-800/40">
              {paginatedEntries.map(e => (
                <div key={e.id} onClick={() => setSelectedEntry(e)} className={`p-6 cursor-pointer hover:bg-slate-800/40 transition-colors ${selectedEntry?.id === e.id ? 'bg-indigo-600/10 border-l-4 border-indigo-500' : ''}`}>
                   <h4 className={`text-sm font-black truncate ${selectedEntry?.id === e.id ? 'text-white' : 'text-slate-300'}`}>{e.title}</h4>
                   <span className="text-[9px] font-black text-indigo-400 mt-1 block">{e.category}</span>
                </div>
              ))}
              {paginatedEntries.length === 0 && <div className="p-8 text-center text-xs text-slate-500 uppercase font-bold">无匹配文档</div>}
           </div>
           
           <PaginationControls 
                currentPage={currentPage}
                totalItems={filteredEntries.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
           />
        </div>

        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 md:p-10 min-h-[600px] shadow-2xl relative flex flex-col">
           {selectedEntry ? (
             <div className="space-y-8 animate-in fade-in flex-1">
                <header className="flex justify-between items-start flex-wrap gap-4">
                   <div className="space-y-2">
                      <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest">{selectedEntry.category}</span>
                      <h3 className="text-2xl md:text-3xl font-black text-white break-words">{selectedEntry.title}</h3>
                   </div>
                   <div className="flex gap-3">
                      <button onClick={() => { setFormData(selectedEntry); setShowForm(true); }} className="p-3 bg-slate-950 border border-slate-800 text-slate-500 rounded-xl hover:text-white transition-colors"><Edit3 className="w-5 h-5" /></button>
                      <button onClick={() => handleDelete(selectedEntry.id)} className="p-3 bg-slate-950 border border-slate-800 text-rose-500 rounded-xl hover:bg-rose-500/10 transition-colors"><Trash2 className="w-5 h-5" /></button>
                   </div>
                </header>
                <div className="bg-slate-950/50 p-6 md:p-8 rounded-[2rem] border border-slate-800/60 shadow-inner min-h-[250px]">
                   <p className="text-slate-300 text-base leading-relaxed whitespace-pre-wrap font-medium">{selectedEntry.content || '无正文内容。'}</p>
                </div>
                {selectedEntry.attachments?.length > 0 && (
                  <div className="space-y-4">
                     <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">附件 ({selectedEntry.attachments.length})</h4>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {selectedEntry.attachments.map((file: any, i: number) => (
                           <div 
                              key={i} 
                              className="flex items-center gap-3 p-4 bg-slate-950 border border-slate-800 rounded-xl group transition-all"
                           >
                              <div className="p-2 bg-slate-900 rounded-lg">
                                  {file.type.startsWith('image/') ? <Eye className="w-5 h-5 text-indigo-400" /> : <FileText className="w-5 h-5 text-slate-400" />}
                              </div>
                              <span className="text-xs text-slate-300 truncate flex-1 font-bold">{file.name}</span>
                              
                              {/* 独立的操作按钮 */}
                              <div className="flex items-center gap-1">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setPreviewFile(file); }}
                                    className="p-2 bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-400 rounded-lg transition-colors"
                                    title="在线预览"
                                  >
                                      <Eye className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); triggerDownload(file.url, file.name); }}
                                    className="p-2 bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-400 rounded-lg transition-colors"
                                    title="直接下载"
                                  >
                                      <Download className="w-4 h-4" />
                                  </button>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
                )}
             </div>
           ) : <div className="flex items-center justify-center h-full text-slate-700 font-bold uppercase tracking-widest py-20">请选择文档查看详情</div>}
        </div>
      </div>

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
                      {/* 分类处理预览逻辑 */}
                      {previewFile.type.startsWith('image/') ? (
                          <img src={previewFile.url} className="max-w-full max-h-full object-contain shadow-lg rounded-lg" alt="preview" />
                      ) : canBrowserPreview(previewFile.type) ? (
                          <iframe src={previewFile.url} className="w-full h-full border-0 rounded-xl bg-white" title="preview" />
                      ) : (
                          <div className="flex flex-col items-center justify-center gap-4 text-center">
                              <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center border border-slate-800">
                                  <FileWarning className="w-10 h-10 text-amber-500" />
                              </div>
                              <div className="space-y-1">
                                  <h4 className="text-lg font-bold text-white">不支持在线预览</h4>
                                  <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                                      该文件类型 ({previewFile.name.split('.').pop()?.toUpperCase()}) 暂不支持浏览器直接预览。
                                      请点击上方按钮下载后查看。
                                  </p>
                              </div>
                              <button 
                                onClick={() => triggerDownload(previewFile.url, previewFile.name)} 
                                className="mt-4 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-lg flex items-center gap-2"
                              >
                                <Download className="w-4 h-4" /> 立即下载
                              </button>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 animate-in fade-in">
           <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md" onClick={() => setShowForm(false)}></div>
           <form onSubmit={handleSave} className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-[3rem] p-8 md:p-12 shadow-2xl space-y-8 animate-in zoom-in-95 max-h-[92vh] overflow-y-auto custom-scrollbar">
              <h3 className="text-2xl font-black text-white">{selectedEntry ? '编辑文档' : '录入新文档'}</h3>
              <input required type="text" placeholder="标题" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-5 rounded-2xl outline-none text-white font-bold focus:border-indigo-500 transition-colors" />
              
              <div className="space-y-2">
                <div className="relative group">
                    <input 
                        type="text" 
                        value={formData.category} 
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-800 p-5 rounded-2xl text-white outline-none font-bold focus:border-indigo-500 transition-colors"
                        placeholder="输入或选择分类..."
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-1">
                        <select 
                            className="w-6 h-6 opacity-0 absolute inset-0 cursor-pointer" 
                            onChange={(e) => setFormData({...formData, category: e.target.value})}
                        >
                            {KNOWLEDGE_CATEGORIES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <span className="text-xs text-indigo-400 font-bold px-2 pointer-events-none">▼</span>
                    </div>
                 </div>
              </div>

              <textarea rows={8} placeholder="正文内容..." value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-6 rounded-[1.5rem] outline-none text-slate-200 resize-none focus:border-indigo-500 transition-colors" />
              
              {!selectedEntry && (
                 <div>
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="text-indigo-400 font-bold text-xs uppercase flex items-center gap-2"><Paperclip className="w-4 h-4" /> 添加附件 ({selectedFiles.length})</button>
                    <input type="file" ref={fileInputRef} onChange={e => e.target.files && setSelectedFiles(Array.from(e.target.files))} multiple className="hidden" />
                 </div>
              )}

              <div className="flex gap-6">
                 <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-5 bg-slate-950 text-slate-500 font-black rounded-2xl border border-slate-800 hover:border-slate-600 transition-colors">取消</button>
                 <button type="submit" className="flex-[2] py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black shadow-lg transition-all">保存</button>
              </div>
           </form>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBase;
