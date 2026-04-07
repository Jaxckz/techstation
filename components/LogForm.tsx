
import React, { useState, useRef, useContext } from 'react';
import { Save, Plus, Trash2, ChevronLeft, Loader2, UploadCloud, HardDrive, ListChecks, GripVertical, X } from 'lucide-react';
import { LogEntry } from '../types';
import { api } from '../services/api';
import { format } from 'date-fns';
import { ToastContext } from './Layout';
import { useAppConfig } from '../App';

interface LogFormProps {
  onSuccess: () => void;
  initialData?: LogEntry;
  currentUser: string;
}

const LogForm: React.FC<LogFormProps> = ({ onSuccess, initialData, currentUser }) => {
  const { showToast } = useContext(ToastContext);
  const { config } = useAppConfig();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [items, setItems] = useState<string[]>(['']);
  const [category, setCategory] = useState(() => config.categories[0] || '');
  const [officeArea, setOfficeArea] = useState<string>(() => config.officeAreas[0] || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSaving, setIsSaving] = useState(false);

  // Validation State
  const [errors, setErrors] = useState<{ title?: boolean, content?: boolean }>({});

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const addItem = () => setItems([...items, '']);
  const updateItem = (idx: number, val: string) => {
    const next = [...items];
    next[idx] = val;
    setItems(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors = {
      title: !title.trim(),
      content: !content.trim()
    };
    setErrors(newErrors);

    if (newErrors.title || newErrors.content) {
      showToast("请完善必填信息（标红处）", 'error');
      return;
    }

    setIsSaving(true);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('content', content);
      formData.append('items', JSON.stringify(items.filter(i => i.trim() !== '')));
      formData.append('category', category);
      formData.append('officeArea', officeArea); // Now supports custom string input
      formData.append('date', date);
      formData.append('author', currentUser);

      selectedFiles.forEach(file => {
        formData.append('files', file);
      });

      await api.createLog(formData);
      showToast("日志录入成功", 'success');
      onSuccess();
    } catch (err) {
      console.error(err);
      showToast("提交失败，请检查网络", 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 animate-in fade-in">
      <header className="flex items-center justify-between py-6">
        <button onClick={onSuccess} className="text-slate-500 hover:text-slate-200 flex items-center gap-2 font-bold text-sm">
          <ChevronLeft className="w-5 h-5" /> 返回
        </button>
        <h2 className="text-xl font-bold text-white">保障记录录入</h2>
        <button onClick={handleSubmit} disabled={isSaving} className="bg-indigo-600 text-white px-8 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-500 flex items-center gap-2 disabled:opacity-50 shadow-xl transition-all active:scale-95">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 提交到服务器
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-8">
            <div className="space-y-1">
              <input
                type="text"
                placeholder="标题描述 (必填)..."
                value={title}
                onChange={(e) => { setTitle(e.target.value); if (e.target.value) setErrors(prev => ({ ...prev, title: false })); }}
                className={`w-full text-2xl font-bold bg-transparent border-b ${errors.title ? 'border-rose-500 placeholder:text-rose-500/50' : 'border-slate-800 focus:border-indigo-500'} outline-none pb-3 text-white transition-colors`}
              />
              {errors.title && <p className="text-[10px] text-rose-500 font-bold">标题不能为空</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">业务分类</label>
                <div className="relative group">
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none focus:border-indigo-500 transition-colors"
                    placeholder="输入或选择..."
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                    <select
                      className="w-6 h-6 opacity-0 absolute inset-0 cursor-pointer text-sm"
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      {config.categories.map(t => <option key={t} value={t} className="bg-slate-900 text-white">{t}</option>)}
                    </select>
                    <span className="text-xs text-indigo-400 font-bold px-2 pointer-events-none">▼</span>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">办公区域 (支持输入)</label>
                <div className="relative group">
                  <input
                    type="text"
                    value={officeArea}
                    onChange={(e) => setOfficeArea(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none focus:border-indigo-500 transition-colors"
                    placeholder="输入或选择..."
                  />
                  {/* Quick Select Badges */}
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                    {config.officeAreas.map(area => (
                      <button
                        key={area}
                        type="button"
                        onClick={() => setOfficeArea(area)}
                        className="text-[9px] px-1.5 py-0.5 rounded border border-slate-700 text-slate-500 hover:bg-slate-800 hover:text-indigo-400 bg-slate-900"
                      >
                        {area.slice(0, 2)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><ListChecks className="w-4 h-4 text-indigo-400" /> 工作项清单</h3>
                <button type="button" onClick={addItem} className="text-[10px] font-bold text-indigo-400 hover:text-white flex items-center gap-1"><Plus className="w-3 h-3" /> 增加</button>
              </div>
              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <GripVertical className="w-4 h-4 text-slate-700" />
                    <input value={item} onChange={(e) => updateItem(idx, e.target.value)} placeholder={`工作条目 ${idx + 1}...`} className="flex-1 bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm text-slate-200 outline-none focus:border-indigo-500 transition-colors" />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <textarea
                rows={6}
                value={content}
                onChange={(e) => { setContent(e.target.value); if (e.target.value) setErrors(prev => ({ ...prev, content: false })); }}
                placeholder="详细过程补充 (必填)..."
                className={`w-full bg-slate-950 border ${errors.content ? 'border-rose-500' : 'border-slate-800 focus:border-indigo-500'} p-6 rounded-2xl outline-none text-slate-200 text-sm transition-colors`}
              />
              {errors.content && <p className="text-[10px] text-rose-500 font-bold px-2">详情内容不能为空</p>}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-300 text-xs flex items-center gap-2"><UploadCloud className="w-4 h-4 text-emerald-500" /> 附件上传</h3>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="text-[10px] font-bold text-indigo-400 uppercase hover:text-white transition-colors"><Plus className="w-3 h-3" /> 添加文件</button>
            </div>
            <p className="text-[9px] text-slate-500 leading-relaxed">
              文件将直接上传至服务器物理磁盘。<br />
              路径: <span className="font-mono text-emerald-500">/server/uploads/{format(new Date(), 'yyyy-MM-dd')}/{currentUser}/</span>
            </p>

            <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
              {selectedFiles.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <HardDrive className="w-4 h-4 text-slate-600 flex-none" />
                    <span className="text-xs text-slate-300 truncate">{file.name}</span>
                  </div>
                  <button onClick={() => removeFile(idx)} className="text-rose-500 hover:text-rose-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
              {selectedFiles.length === 0 && <div className="text-center py-6 text-[10px] text-slate-700 font-bold uppercase">无附件</div>}
            </div>

            <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple className="hidden" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogForm;
