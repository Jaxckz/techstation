
import React, { useState, useEffect, useMemo, useContext, useRef } from 'react';
import { 
  Server, Plus, Search, Download, Trash2, Edit3, ShieldCheck, Monitor, MapPin, User, Clock, Tag, MoreVertical, X, Check, CalendarRange, Paperclip, FileText, Eye, HardDrive
} from 'lucide-react';
import { api } from '../services/api';
import { 
  DeviceEntry, DeviceType, DeviceStatus, OfficeArea, DEVICE_TYPES, DEVICE_STATUS, BROADCAST_LOCATIONS, OFFICE_AREAS, UserRole
} from '../types';
import { format, isPast, addMonths, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ToastContext } from './Layout';
import PaginationControls from './PaginationControls';

interface DeviceLedgerProps {
  globalOfficeArea?: string;
  currentUser: string;
  userRole: UserRole;
}

const DeviceLedger: React.FC<DeviceLedgerProps> = ({ globalOfficeArea, currentUser, userRole }) => {
  const { showToast } = useContext(ToastContext);
  const [devices, setDevices] = useState<DeviceEntry[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDevice, setEditingDevice] = useState<DeviceEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Date Filter (Purchase Date)
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Files
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validation
  const [errors, setErrors] = useState({ name: false, sn: false });

  const initialFormState: Partial<DeviceEntry> = {
    name: '',
    model: '',
    sn: '',
    assetId: '',
    type: DEVICE_TYPES[0],
    officeArea: globalOfficeArea || OFFICE_AREAS[0],
    location: BROADCAST_LOCATIONS[0],
    manager: currentUser,
    purchaseDate: format(new Date(), 'yyyy-MM-dd'),
    warrantyDate: format(addMonths(new Date(), 36), 'yyyy-MM-dd'),
    status: DEVICE_STATUS[0],
    maintenanceHistory: []
  };

  const [formData, setFormData] = useState<Partial<DeviceEntry>>(initialFormState);

  useEffect(() => {
    loadDevices();
    setCurrentPage(1);
  }, [globalOfficeArea]);

  const loadDevices = async () => {
    try {
      let data = await api.getDevices();
      if (globalOfficeArea && globalOfficeArea !== ('全局概览' as any)) {
        data = data.filter((d: any) => d.officeArea === globalOfficeArea);
      }
      setDevices(data);
    } catch (e) {
      console.error("Failed to load devices", e);
    }
  };

  const filteredDevices = useMemo(() => {
    return devices.filter(d => {
      const matchSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          d.sn.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          d.assetId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchType = filterType === 'all' || d.type === filterType;
      const matchStatus = filterStatus === 'all' || d.status === filterStatus;
      
      const matchDate = (!startDate && !endDate) ? true :
          isWithinInterval(new Date(d.purchaseDate), { 
              start: startDate ? startOfDay(new Date(startDate)) : startOfDay(new Date('1990-01-01')), 
              end: endDate ? endOfDay(new Date(endDate)) : endOfDay(new Date()) 
          });

      return matchSearch && matchType && matchStatus && matchDate;
    });
  }, [devices, searchQuery, filterType, filterStatus, startDate, endDate]);

  const paginatedDevices = useMemo(() => {
      const startIndex = (currentPage - 1) * itemsPerPage;
      return filteredDevices.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredDevices, currentPage, itemsPerPage]);

  const handleAddOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = {
        name: !formData.name?.trim(),
        sn: !formData.sn?.trim()
    };
    setErrors(newErrors);

    if (newErrors.name || newErrors.sn) {
      showToast('请填写设备名称及序列号', 'error');
      return;
    }

    const data = new FormData();
    Object.keys(formData).forEach(key => {
        if (key === 'maintenanceHistory') {
            data.append(key, JSON.stringify(formData[key] || []));
        } else {
            data.append(key, (formData as any)[key]);
        }
    });
    data.append('author', currentUser);
    selectedFiles.forEach(file => data.append('files', file));

    try {
        if (editingDevice?.id) {
            await api.updateDevice(editingDevice.id, data);
            showToast("设备信息更新成功", 'success');
        } else {
            await api.createDevice(data);
            showToast("新设备入库成功", 'success');
        }
        setFormData(initialFormState);
        setEditingDevice(null);
        setSelectedFiles([]);
        setShowAddForm(false);
        loadDevices();
    } catch (e) {
        showToast("操作失败", 'error');
    }
  };

  const handleDelete = async (id: number) => {
      if (confirm("确定删除此设备记录？")) {
          await api.deleteDevice(id);
          loadDevices();
          showToast("设备已删除", 'info');
      }
  };

  const handleEdit = (device: DeviceEntry) => {
      setEditingDevice(device);
      setFormData(device);
      setSelectedFiles([]);
      setShowAddForm(true);
  };

  const handleExport = () => {
      if (filteredDevices.length === 0) return alert("无数据导出");
      const header = 'ID,名称,型号,序列号,资产编号,类型,区域,位置,状态,负责人,购置日期,保修期\n';
      const rows = filteredDevices.map(d => 
          `${d.id},${d.name},${d.model},${d.sn},${d.assetId},${d.type},${d.officeArea},${d.location},${d.status},${d.manager},${d.purchaseDate},${d.warrantyDate}`
      ).join('\n');
      const blob = new Blob(["\ufeff" + header + rows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Devices_${format(new Date(), 'yyyyMMdd')}.csv`;
      link.click();
  };

  return (
    <div className="space-y-8 animate-in fade-in pb-32">
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
                <h2 className="text-3xl font-black text-white tracking-tighter flex items-center gap-3">
                    <Server className="w-8 h-8 text-emerald-500" /> 设备资产台账
                </h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input 
                        type="text" 
                        placeholder="搜索名称/SN/资产号..." 
                        value={searchQuery}
                        onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                        className="bg-slate-900 border border-slate-800 pl-9 pr-4 py-2.5 rounded-xl text-xs text-white outline-none w-48 focus:border-indigo-500 transition-all"
                    />
                </div>
                <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
                    <select 
                        value={filterType} 
                        onChange={e => { setFilterType(e.target.value); setCurrentPage(1); }} 
                        className="bg-transparent text-xs font-bold text-slate-500 outline-none px-2 py-1.5"
                    >
                        <option value="all">所有类型</option>
                        {DEVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <button onClick={handleExport} className="h-10 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs flex items-center gap-2 transition-all">
                    <Download className="w-3.5 h-3.5" /> 导出
                </button>
                <button onClick={() => { setFormData(initialFormState); setEditingDevice(null); setShowAddForm(true); }} className="h-10 px-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-lg flex items-center gap-2 transition-all">
                    <Plus className="w-4 h-4" /> 设备入库
                </button>
            </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {paginatedDevices.map(device => (
                <div key={device.id} className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 hover:border-slate-700 transition-all group relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${device.status === '在运 (Active)' ? 'bg-emerald-600' : device.status === '维修 (Repairing)' ? 'bg-amber-500' : 'bg-slate-700'}`}>
                                <Monitor className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-white truncate max-w-[150px]">{device.name}</h3>
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{device.model}</div>
                            </div>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEdit(device)} className="p-2 bg-slate-950 rounded-xl text-indigo-400 hover:text-white"><Edit3 className="w-4 h-4" /></button>
                            {(userRole === 'ADMIN' || device.manager === currentUser) && (
                                <button onClick={() => handleDelete(device.id!)} className="p-2 bg-slate-950 rounded-xl text-rose-500 hover:text-white"><Trash2 className="w-4 h-4" /></button>
                            )}
                        </div>
                    </div>

                    <div className="space-y-3 mb-6">
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-500 font-bold">SN 序列号</span>
                            <span className="text-slate-300 font-mono">{device.sn}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-500 font-bold">资产编号</span>
                            <span className="text-slate-300 font-mono">{device.assetId}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-500 font-bold">物理位置</span>
                            <span className="text-slate-300">{device.location}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-500 font-bold">保修截至</span>
                            <span className={`font-mono font-bold ${isPast(new Date(device.warrantyDate)) ? 'text-rose-500' : 'text-emerald-500'}`}>{device.warrantyDate}</span>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                         <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-slate-500">
                             <User className="w-3 h-3" /> {device.manager}
                         </div>
                         <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${device.status === '在运 (Active)' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-800 text-slate-400'}`}>
                             {device.status}
                         </div>
                    </div>
                </div>
            ))}
            {filteredDevices.length === 0 && <div className="col-span-full text-center py-20 text-slate-600 font-bold uppercase tracking-widest">无设备数据</div>}
        </div>

        <PaginationControls 
            currentPage={currentPage}
            totalItems={filteredDevices.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
        />

        {showAddForm && (
            <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 animate-in fade-in">
                <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setShowAddForm(false)}></div>
                <form onSubmit={handleAddOrUpdate} className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 shadow-2xl space-y-8 animate-in zoom-in-95 overflow-y-auto max-h-[90vh] custom-scrollbar">
                    <div className="flex justify-between items-center">
                        <h3 className="text-2xl font-black text-white">{editingDevice ? '编辑设备档案' : '新设备入库'}</h3>
                        <button type="button" onClick={() => setShowAddForm(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-500"><X className="w-6 h-6" /></button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                             <label className="text-xs font-bold text-slate-500 uppercase">设备名称 <span className="text-rose-500">*</span></label>
                             <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white outline-none focus:border-indigo-500" placeholder="例如：核心交换机 A" />
                        </div>
                        <div className="space-y-2">
                             <label className="text-xs font-bold text-slate-500 uppercase">型号规格</label>
                             <input type="text" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white outline-none" placeholder="例如：Cisco Catalyst 9500" />
                        </div>
                        <div className="space-y-2">
                             <label className="text-xs font-bold text-slate-500 uppercase">序列号 (SN) <span className="text-rose-500">*</span></label>
                             <input required type="text" value={formData.sn} onChange={e => setFormData({...formData, sn: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white outline-none font-mono" />
                        </div>
                        <div className="space-y-2">
                             <label className="text-xs font-bold text-slate-500 uppercase">固定资产编号</label>
                             <input type="text" value={formData.assetId} onChange={e => setFormData({...formData, assetId: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white outline-none font-mono" />
                        </div>
                        
                        <div className="space-y-2">
                             <label className="text-xs font-bold text-slate-500 uppercase">设备类型</label>
                             <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white outline-none">
                                {DEVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                             </select>
                        </div>
                        <div className="space-y-2">
                             <label className="text-xs font-bold text-slate-500 uppercase">运行状态</label>
                             <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white outline-none">
                                {DEVICE_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                             </select>
                        </div>

                        <div className="space-y-2">
                             <label className="text-xs font-bold text-slate-500 uppercase">所属区域</label>
                             <select value={formData.officeArea} onChange={e => setFormData({...formData, officeArea: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white outline-none">
                                {OFFICE_AREAS.map(o => <option key={o} value={o}>{o}</option>)}
                             </select>
                        </div>
                        <div className="space-y-2">
                             <label className="text-xs font-bold text-slate-500 uppercase">物理位置</label>
                             <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white outline-none" />
                        </div>

                        <div className="space-y-2">
                             <label className="text-xs font-bold text-slate-500 uppercase">购置日期</label>
                             <input type="date" value={formData.purchaseDate} onChange={e => setFormData({...formData, purchaseDate: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white outline-none" />
                        </div>
                        <div className="space-y-2">
                             <label className="text-xs font-bold text-slate-500 uppercase">维保到期</label>
                             <input type="date" value={formData.warrantyDate} onChange={e => setFormData({...formData, warrantyDate: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white outline-none" />
                        </div>
                    </div>
                    
                    <div className="pt-6 border-t border-slate-800">
                        <div className="space-y-2">
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="text-indigo-400 font-bold text-xs uppercase flex items-center gap-2"><Paperclip className="w-4 h-4" /> 关联文档/图片 ({selectedFiles.length})</button>
                            <input type="file" ref={fileInputRef} onChange={e => { if(e.target.files) setSelectedFiles(Array.from(e.target.files)); }} multiple className="hidden" />
                            {selectedFiles.length > 0 && <div className="text-xs text-slate-500">已选 {selectedFiles.length} 个文件</div>}
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button type="button" onClick={() => setShowAddForm(false)} className="flex-1 py-4 bg-slate-950 border border-slate-800 text-slate-500 font-bold rounded-2xl">取消</button>
                        <button type="submit" className="flex-[2] py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl shadow-xl">保存资产信息</button>
                    </div>
                </form>
            </div>
        )}
    </div>
  );
};

export default DeviceLedger;
