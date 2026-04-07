
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { api } from '../services/api';
import { SharedFileEntry, UserRole } from '../types';
import { Share2, UploadCloud, FileText, Download, Trash2, User, Loader2, Paperclip, X } from 'lucide-react';
import { format } from 'date-fns';
import PaginationControls from './PaginationControls';

interface DataShareProps {
  currentUser: string;
  userRole: UserRole;
}

const DataShare: React.FC<DataShareProps> = ({ currentUser, userRole }) => {
  const [files, setFiles] = useState<SharedFileEntry[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      const data = await api.getSharedFiles();
      setFiles(data);
    } catch(e) { console.error(e); }
  };

  const paginatedFiles = useMemo(() => {
      const startIndex = (currentPage - 1) * itemsPerPage;
      return files.slice(startIndex, startIndex + itemsPerPage);
  }, [files, currentPage, itemsPerPage]);

  const handleDelete = async (id: number) => {
    if (confirm("确定删除此共享内容？")) {
        await api.deleteSharedFile(id);
        loadFiles();
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsUploading(true);
    try {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('category', 'general');
        formData.append('author', currentUser);
        formData.append('role', userRole);
        selectedFiles.forEach(f => formData.append('files', f));

        await api.createSharedFile(formData);
        
        setShowModal(false);
        setTitle('');
        setDescription('');
        setSelectedFiles([]);
        loadFiles();
    } catch(e) {
        alert("上传失败");
    } finally {
        setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in pb-32">
        <header className="flex justify-between items-end">
            <div>
                <h2 className="text-3xl font-black text-white tracking-tighter flex items-center gap-3">
                    <Share2 className="w-8 h-8 text-indigo-500" /> 数据共享中心
                </h2>
                <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-widest">Public Data Exchange</p>
            </div>
            <button onClick={() => setShowModal(true)} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-lg flex items-center gap-2">
                <UploadCloud className="w-4 h-4" /> 发布共享
            </button>
        </header>

        <div className="grid grid-cols-1 gap-4">
            {paginatedFiles.map(item => (
                <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 hover:border-slate-700 transition-all shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-400">
                                <User className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-white">{item.title}</h3>
                                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase">
                                    <span className="text-indigo-400">{item.author}</span>
                                    <span>•</span>
                                    <span>{format(new Date(item.createdAt), 'yyyy-MM-dd HH:mm')}</span>
                                    <span>•</span>
                                    <span className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">{item.role}</span>
                                </div>
                            </div>
                        </div>
                        {(item.author === currentUser || userRole === 'ADMIN') && (
                            <button onClick={() => handleDelete(item.id!)} className="p-2 text-slate-600 hover:text-rose-500 rounded-xl bg-slate-950"><Trash2 className="w-4 h-4" /></button>
                        )}
                    </div>
                    
                    {item.description && <p className="text-sm text-slate-300 mb-6 leading-relaxed bg-slate-950/50 p-4 rounded-xl border border-slate-800/50 whitespace-pre-wrap">{item.description}</p>}

                    {item.attachments && item.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {item.attachments.map((att: any, i: number) => (
                                <a key={i} href={att.url} target="_blank" className="flex items-center gap-2 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl hover:border-indigo-500/30 transition-colors group">
                                    <FileText className="w-4 h-4 text-indigo-400" />
                                    <span className="text-xs font-bold text-slate-400 group-hover:text-white truncate max-w-[150px]">{att.name}</span>
                                    <Download className="w-3 h-3 text-slate-600" />
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            ))}
            {files.length === 0 && <div className="py-20 text-center text-slate-600 font-bold uppercase text-xs tracking-widest">暂无共享内容</div>}
        </div>

        <PaginationControls 
            currentPage={currentPage}
            totalItems={files.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
        />

        {showModal && (
            <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 animate-in fade-in">
                <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setShowModal(false)}></div>
                <form onSubmit={handleUpload} className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl space-y-6 animate-in zoom-in-95">
                    <h3 className="text-xl font-black text-white">发布新内容</h3>
                    <input autoFocus required type="text" placeholder="标题概述" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white outline-none focus:border-indigo-500 font-bold" />
                    <textarea rows={4} placeholder="详细描述..." value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white outline-none resize-none" />
                    
                    <div className="space-y-2">
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="text-indigo-400 font-bold text-xs uppercase flex items-center gap-2"><Paperclip className="w-4 h-4" /> 添加附件 ({selectedFiles.length})</button>
                        <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple className="hidden" />
                        <div className="flex flex-wrap gap-2">
                            {selectedFiles.map((f, i) => (
                                <div key={i} className="px-2 py-1 bg-slate-950 border border-slate-800 rounded text-[10px] text-slate-400 flex items-center gap-1">
                                    {f.name} <button type="button" onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))}><X className="w-3 h-3 hover:text-white" /></button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-4 pt-2">
                        <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 bg-slate-950 text-slate-500 font-bold rounded-xl border border-slate-800">取消</button>
                        <button disabled={isUploading} className="flex-[2] py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2">
                            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />} 发布
                        </button>
                    </div>
                </form>
            </div>
        )}
    </div>
  );
};

export default DataShare;
