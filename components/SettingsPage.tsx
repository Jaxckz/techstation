
import React, { useState, useEffect, useRef, useContext } from 'react';
import { UserRole } from '../types';
import { api } from '../services/api';
import { testAIConnectivity } from '../services/geminiService';
import { UserCircle2, Server, Database, Plus, ShieldCheck, Trash2, HardDrive, Save, RotateCcw, Download, UploadCloud, Users, Lock, KeyRound, Bot, BellRing, FileText, CheckSquare, Square, LogOut, Network, Loader2, FileDown, Tag, X } from 'lucide-react';
import { format } from 'date-fns';
import { ToastContext } from './Layout';
import { useAppConfig } from '../App';

interface SettingsPageProps {
    userRole: UserRole;
    currentUser: string;
    onLogout: () => void;
}

type SettingsTab = 'profile' | 'users' | 'permissions' | 'ai' | 'announcements' | 'audit' | 'system' | 'labels';

const SettingsPage: React.FC<SettingsPageProps> = ({ userRole, currentUser, onLogout }) => {
    const { showToast } = useContext(ToastContext);
    const { config, reloadConfig } = useAppConfig();
    const [activeTab, setActiveTab] = useState<SettingsTab>(userRole === 'ADMIN' ? 'system' : 'profile');

    // --- Sub-components States ---

    // System
    const [uploadPathInfo, setUploadPathInfo] = useState({ path: '', isCustom: false, defaultPath: '' });
    const [newPath, setNewPath] = useState('');
    const restoreInputRef = useRef<HTMLInputElement>(null);

    // Users
    const [users, setUsers] = useState<any[]>([]);
    const [newUser, setNewUser] = useState({ username: '', password: '', role: 'ENGINEER' });
    const batchUserInputRef = useRef<HTMLInputElement>(null);

    // Permissions
    const [permissions, setPermissions] = useState<any[]>([]);

    // AI
    const [aiConfig, setAiConfig] = useState({ provider: 'gemini', apiKey: '', model: '', baseUrl: '' });
    const [isTestingAI, setIsTestingAI] = useState(false);

    // Announcements
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [newAnnounce, setNewAnnounce] = useState({ title: '', content: '', priority: 'normal' });

    // Audit
    const [auditLogs, setAuditLogs] = useState<any[]>([]);

    // Profile
    const [newPassword, setNewPassword] = useState('');

    // Labels
    const [labelsConfig, setLabelsConfig] = useState({ systemName: '', officeAreas: [] as string[], categories: [] as string[], deviceTypes: [] as string[] });
    const [newOfficeArea, setNewOfficeArea] = useState('');
    const [newCategory, setNewCategory] = useState('');
    const [newDeviceType, setNewDeviceType] = useState('');

    // Load labels config when tab opens
    useEffect(() => {
        if (activeTab === 'labels') {
            setLabelsConfig({
                systemName: config.systemName,
                officeAreas: [...config.officeAreas],
                categories: [...config.categories],
                deviceTypes: [...config.deviceTypes],
            });
        }
    }, [activeTab, config]);

    useEffect(() => {
        if (activeTab === 'system') loadSystemSettings();
        if (activeTab === 'users') loadUsers();
        if (activeTab === 'permissions') loadPermissions();
        if (activeTab === 'ai') loadAiConfig();
        if (activeTab === 'announcements') loadAnnouncements();
        if (activeTab === 'audit') loadAuditLogs();
    }, [activeTab]);

    // --- Data Loaders ---
    const loadSystemSettings = async () => {
        try {
            const info = await api.getUploadPath();
            setUploadPathInfo(info);
            setNewPath(info.path);
        } catch (e) { console.error(e); }
    };
    const loadUsers = async () => setUsers(await api.getUsers());
    const loadPermissions = async () => setPermissions(await api.getPermissions());
    const loadAiConfig = async () => {
        const cfg = await api.getAIConfig();
        if (cfg) setAiConfig(prev => ({ ...prev, ...cfg }));
    };
    const loadAnnouncements = async () => setAnnouncements(await api.getAnnouncements());
    const loadAuditLogs = async () => setAuditLogs(await api.getAuditLogs());

    // --- Handlers ---

    // System
    const handleSavePath = async () => {
        if (!newPath.trim()) return;
        await api.setUploadPath(newPath);
        loadSystemSettings();
        showToast('存储路径已更新', 'success');
    };
    const handleResetPath = async () => {
        if (confirm("确定恢复默认？")) { await api.resetUploadPath(); loadSystemSettings(); }
    };
    const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        if (confirm("全量恢复将覆盖当前数据，确定吗？")) {
            const res = await api.restoreBackup(e.target.files[0]);
            if (res.success) { alert("恢复成功"); window.location.reload(); } else alert("恢复失败");
        }
    };

    // Users
    const handleAddUser = async () => {
        if (!newUser.username || !newUser.password) return alert("请填写完整");
        const res = await api.createUser(newUser);
        if (res.success) {
            setNewUser({ username: '', password: '', role: 'ENGINEER' });
            loadUsers();
            showToast('用户创建成功', 'success');
        } else alert(res.message);
    };
    const handleDeleteUser = async (id: number) => {
        if (confirm("确定删除用户？")) {
            await api.deleteUser(id);
            loadUsers();
        }
    };
    const handleBatchImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target?.result as string;
            const lines = text.split('\n').filter(l => l.trim());
            const usersToImport = lines.slice(1).map(line => {
                const [username, password, role] = line.split(',').map(s => s.trim());
                return { username, password, role: role || 'ENGINEER' };
            }).filter(u => u.username && u.password);

            if (usersToImport.length > 0) {
                const res = await api.batchImportUsers(usersToImport);
                alert(`成功导入 ${res.count} 个用户`);
                loadUsers();
            }
        };
        reader.readAsText(file);
        e.target.value = ''; // Reset
    };
    const handleResetUserPassword = async (id: number, username: string) => {
        const newPass = prompt(`请输入用户 ${username} 的新密码:`);
        if (newPass && newPass.trim()) {
            try {
                await api.updateUser(id, { password: newPass.trim() });
                showToast('密码重置成功', 'success');
            } catch (e) {
                showToast('重置失败', 'error');
            }
        }
    };
    const handleExportUsers = () => {
        const header = 'ID,用户名,角色,创建时间\n';
        const rows = users.map(u => `${u.id},${u.username},${u.role},${u.createdAt}`).join('\n');
        const blob = new Blob(["\ufeff" + header + rows], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `User_List_${format(new Date(), 'yyyyMMdd')}.csv`;
        link.click();
    };

    // Admin Export Single User Data
    const handleAdminExportSingleUserData = async (username: string) => {
        try {
            const res = await api.exportMyData(username);
            const blob = new Blob([JSON.stringify(res, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${username}_Backup_${format(new Date(), 'yyyyMMdd')}.json`;
            link.click();
            showToast(`已导出用户 ${username} 的全量数据`, 'success');
        } catch (e) {
            showToast('导出失败，请稍后重试', 'error');
        }
    };

    // Permissions
    const togglePermission = async (role: string, tab: string) => {
        const perm = permissions.find(p => p.role === role);
        let newTabs = perm ? [...perm.allowedTabs] : [];
        if (newTabs.includes(tab)) newTabs = newTabs.filter(t => t !== tab);
        else newTabs.push(tab);
        await api.updatePermission(role, newTabs);
        loadPermissions();
    };

    // AI
    const saveAiConfig = async () => {
        await api.setAIConfig(aiConfig);
        showToast('AI 配置已保存', 'success');
    };

    const handleTestAI = async () => {
        if (!aiConfig.apiKey) {
            showToast("请先填写 API Key", 'error');
            return;
        }
        setIsTestingAI(true);
        const res = await testAIConnectivity(aiConfig as any);
        setIsTestingAI(false);
        if (res.success) {
            showToast(res.message, 'success');
        } else {
            alert(`连接失败:\n${res.message}`);
        }
    };

    // Announcements
    const handlePostAnnounce = async () => {
        if (!newAnnounce.title) return;
        await api.createAnnouncement(newAnnounce);
        setNewAnnounce({ title: '', content: '', priority: 'normal' });
        loadAnnouncements();
        showToast('公告已发布', 'success');
    };
    const deleteAnnounce = async (id: number) => {
        if (confirm("删除公告？")) {
            await api.deleteAnnouncement(id);
            loadAnnouncements();
        }
    };

    // Audit
    const exportAudit = () => {
        const csv = "ID,Username,Action,Details,IP,Timestamp\n" + auditLogs.map(l => `${l.id},${l.username},${l.action},"${l.details}",${l.ip},${l.timestamp}`).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Audit_Logs_${format(new Date(), 'yyyyMMdd')}.csv`;
        link.click();
    };

    // Profile
    const changePassword = async () => {
        // Assuming update user logic for self
        const user = users.find(u => u.username === currentUser);
        if (!newPassword) return;
        alert("请联系管理员重置密码 (系统演示模式)");
    };

    const handleExportMyData = async () => {
        try {
            const res = await api.exportMyData(currentUser);
            const blob = new Blob([JSON.stringify(res, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${currentUser}_Full_Backup_${format(new Date(), 'yyyyMMdd')}.json`;
            link.click();
            showToast('个人数据已导出', 'success');
        } catch (e) {
            showToast('导出失败，请稍后重试', 'error');
        }
    };

    const tabs: { id: SettingsTab, label: string, icon: any }[] = [
        { id: 'profile', label: '个人安全', icon: Lock },
        ...(userRole === 'ADMIN' ? [
            { id: 'system', label: '系统与备份', icon: Database },
            { id: 'labels', label: '自定义标签', icon: Tag },
            { id: 'users', label: '成员管理', icon: Users },
            { id: 'permissions', label: '权限矩阵', icon: KeyRound },
            { id: 'ai', label: 'AI 智脑', icon: Bot },
            { id: 'announcements', label: '公告发布', icon: BellRing },
            { id: 'audit', label: '审计日志', icon: FileText },
        ] : []) as any
    ];

    const handleSaveLabels = async () => {
        const res = await api.setAppConfig(labelsConfig);
        if (res.success) {
            await reloadConfig();
            showToast('自定义标签已保存，全局已生效', 'success');
        } else {
            showToast('保存失败', 'error');
        }
    };

    const addItem = (field: 'officeAreas' | 'categories' | 'deviceTypes', value: string, setter: (v: string) => void) => {
        const trimmed = value.trim();
        if (!trimmed || labelsConfig[field].includes(trimmed)) return;
        setLabelsConfig(prev => ({ ...prev, [field]: [...prev[field], trimmed] }));
        setter('');
    };

    const removeItem = (field: 'officeAreas' | 'categories' | 'deviceTypes', item: string) => {
        if (labelsConfig[field].length <= 1) return showToast('至少保留一项', 'error');
        setLabelsConfig(prev => ({ ...prev, [field]: prev[field].filter(i => i !== item) }));
    };

    const allTabOptions = [
        { id: 'dashboard', label: '工作概览' }, { id: 'tasks', label: '事项中心' }, { id: 'security', label: '安防审计' },
        { id: 'oa-ops', label: 'OA运维' }, { id: 'data-share', label: '数据共享' }, { id: 'devices', label: '设备台账' },
        { id: 'knowledge', label: '技术手册' }, { id: 'timeline', label: '日志追溯' }, { id: 'add', label: '新建日志' },
        { id: 'stats', label: '效能统计' }, { id: 'ai-lab', label: 'AI智脑' }, { id: 'search', label: '全局检索' },
        { id: 'settings', label: '系统设置' }
    ];

    return (
        <div className="max-w-6xl mx-auto pb-20 flex gap-8 animate-in fade-in">
            {/* Sidebar */}
            <div className="w-64 flex-none space-y-2">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 mb-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                            <UserCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">{currentUser}</h2>
                            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded">{userRole}</span>
                        </div>
                    </div>
                    <button onClick={onLogout} className="w-full py-2 bg-slate-950 border border-slate-800 text-rose-500 rounded-xl font-bold text-xs hover:bg-rose-500/10 transition-all flex items-center justify-center gap-2">
                        <LogOut className="w-3 h-3" /> 退出登录
                    </button>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-2">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all mb-1 ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/50'}`}
                        >
                            <tab.icon className="w-4 h-4" />
                            <span className="text-xs font-bold">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 space-y-6">

                {activeTab === 'profile' && (
                    <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 space-y-8">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2"><Lock className="w-5 h-5 text-indigo-500" /> 个人数据安全</h3>
                        <div className="space-y-4 max-w-md">
                            <div className="space-y-2">
                                <label className="text-xs text-slate-500 font-bold uppercase">更新密码</label>
                                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white outline-none" placeholder="输入新密码" />
                            </div>
                            <div className="flex gap-4">
                                <button onClick={changePassword} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs">保存修改</button>
                                <button onClick={handleExportMyData} className="px-6 py-3 bg-slate-950 border border-slate-800 text-emerald-500 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-emerald-500/10">
                                    <Download className="w-3 h-3" /> 导出我的全量数据
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'system' && (
                    <div className="space-y-6">
                        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 space-y-6">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2"><HardDrive className="w-5 h-5 text-emerald-500" /> 存储路径</h3>
                            <div className="space-y-4">
                                <p className="text-xs text-slate-400">设置服务器存储物理路径 (例如 G:\data\uploads)。</p>
                                <div className="flex gap-3">
                                    <input value={newPath} onChange={e => setNewPath(e.target.value)} className="flex-1 bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white outline-none text-xs font-mono" placeholder="输入绝对路径..." />
                                    <button onClick={handleSavePath} className="px-6 bg-indigo-600 text-white rounded-2xl font-bold text-xs"><Save className="w-4 h-4" /></button>
                                    {uploadPathInfo.isCustom && <button onClick={handleResetPath} className="px-4 bg-slate-800 text-slate-400 rounded-2xl"><RotateCcw className="w-4 h-4" /></button>}
                                </div>
                                <div className="text-[10px] font-bold text-slate-500 flex items-center gap-2">
                                    <Server className="w-3 h-3" /> 当前: <span className="text-emerald-500">{uploadPathInfo.path}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 space-y-6">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2"><Database className="w-5 h-5 text-rose-500" /> 灾备管理</h3>
                            <div className="flex gap-4">
                                <button onClick={() => api.downloadBackup()} className="flex-1 py-4 bg-slate-950 border border-slate-800 rounded-2xl text-slate-300 font-bold hover:text-white transition-all flex items-center justify-center gap-2">
                                    <Download className="w-4 h-4" /> 下载全量备份 (.sqlite)
                                </button>
                                <button onClick={() => restoreInputRef.current?.click()} className="flex-1 py-4 bg-slate-950 border border-slate-800 rounded-2xl text-rose-500 font-bold hover:bg-rose-500/10 transition-all flex items-center justify-center gap-2">
                                    <UploadCloud className="w-4 h-4" /> 恢复数据
                                </button>
                                <input type="file" ref={restoreInputRef} onChange={handleRestore} className="hidden" accept=".sqlite" />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 space-y-8">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2"><Users className="w-5 h-5 text-indigo-500" /> 成员账号管理</h3>
                            <div className="flex gap-2">
                                <button onClick={handleExportUsers} className="px-4 py-2 bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-slate-700">
                                    <Download className="w-3 h-3" /> 导出名单
                                </button>
                                <button onClick={() => batchUserInputRef.current?.click()} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-slate-700">
                                    <UploadCloud className="w-3 h-3" /> 批量导入
                                </button>
                                <input type="file" ref={batchUserInputRef} onChange={handleBatchImport} className="hidden" accept=".csv,.txt" />
                            </div>
                        </div>

                        <div className="grid grid-cols-4 gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                            <input placeholder="用户名" value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} className="bg-slate-900 border border-slate-800 p-2 rounded-lg text-white text-xs outline-none" />
                            <input placeholder="密码" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} className="bg-slate-900 border border-slate-800 p-2 rounded-lg text-white text-xs outline-none" />
                            <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })} className="bg-slate-900 border border-slate-800 p-2 rounded-lg text-white text-xs outline-none">
                                <option value="ADMIN">超级管理员</option>
                                <option value="ENGINEER">技术工程师</option>
                                <option value="SECURITY">安防专员</option>
                                <option value="OA_SPECIALIST">OA专员</option>
                            </select>
                            <button onClick={handleAddUser} className="bg-indigo-600 text-white rounded-lg font-bold text-xs">新增</button>
                        </div>

                        <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                            {users.map(u => (
                                <div key={u.id} className="flex items-center justify-between p-4 bg-slate-950/50 rounded-xl border border-slate-800">
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-slate-500 font-bold text-xs">{u.username[0]}</div>
                                        <div>
                                            <div className="text-sm font-bold text-white">{u.username}</div>
                                            <div className="text-[10px] text-slate-500 uppercase font-bold">{u.role}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-slate-600 font-mono mr-2">{format(new Date(u.createdAt), 'yyyy-MM-dd')}</span>
                                        {u.username !== 'admin' && (
                                            <>
                                                <button onClick={() => handleAdminExportSingleUserData(u.username)} className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg" title="导出该用户数据 (备份)"><FileDown className="w-4 h-4" /></button>
                                                <button onClick={() => handleResetUserPassword(u.id, u.username)} className="p-2 text-indigo-400 hover:bg-indigo-500/10 rounded-lg" title="重置密码"><KeyRound className="w-4 h-4" /></button>
                                                <button onClick={() => handleDeleteUser(u.id)} className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg" title="删除用户"><Trash2 className="w-4 h-4" /></button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'permissions' && (
                    <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 space-y-8">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2"><KeyRound className="w-5 h-5 text-amber-500" /> 角色权限矩阵</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr>
                                        <th className="p-3 text-xs font-bold text-slate-500 uppercase border-b border-slate-800">功能模块</th>
                                        {['ADMIN', 'ENGINEER', 'SECURITY', 'OA_SPECIALIST'].map(role => (
                                            <th key={role} className="p-3 text-xs font-bold text-white uppercase border-b border-slate-800 text-center">{role}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {allTabOptions.map(tab => (
                                        <tr key={tab.id} className="hover:bg-slate-800/20">
                                            <td className="p-3 text-sm font-bold text-slate-300 border-b border-slate-800/50">{tab.label}</td>
                                            {['ADMIN', 'ENGINEER', 'SECURITY', 'OA_SPECIALIST'].map(role => {
                                                const rolePerms = permissions.find(p => p.role === role)?.allowedTabs || [];
                                                const isAllowed = rolePerms.includes(tab.id);
                                                return (
                                                    <td key={role} className="p-3 border-b border-slate-800/50 text-center">
                                                        <button onClick={() => togglePermission(role, tab.id)} className={`transition-all ${isAllowed ? 'text-emerald-500' : 'text-slate-700 hover:text-slate-500'}`}>
                                                            {isAllowed ? <CheckSquare className="w-5 h-5 mx-auto" /> : <Square className="w-5 h-5 mx-auto" />}
                                                        </button>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'ai' && (
                    <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 space-y-8">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2"><Bot className="w-5 h-5 text-purple-500" /> AI 智脑配置</h3>
                        <div className="space-y-4 max-w-lg">
                            <div className="space-y-2">
                                <label className="text-xs text-slate-500 font-bold uppercase">模型供应商</label>
                                <select value={aiConfig.provider} onChange={e => setAiConfig({ ...aiConfig, provider: e.target.value })} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white outline-none">
                                    <option value="gemini">Google Gemini</option>
                                    <option value="openai">OpenAI / DeepSeek (Compatible)</option>
                                    <option value="custom">Custom Proxy</option>
                                </select>
                            </div>

                            {(aiConfig.provider === 'openai' || aiConfig.provider === 'custom') && (
                                <div className="space-y-2 animate-in slide-in-from-top-2">
                                    <label className="text-xs text-slate-500 font-bold uppercase flex items-center gap-1"><Network className="w-3 h-3" /> Base URL (API Endpoint)</label>
                                    <input type="text" placeholder="https://api.openai.com/v1" value={aiConfig.baseUrl} onChange={e => setAiConfig({ ...aiConfig, baseUrl: e.target.value })} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white outline-none font-mono text-sm" />
                                    <p className="text-[10px] text-slate-600">DeepSeek 示例: https://api.deepseek.com/v1</p>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-xs text-slate-500 font-bold uppercase">API Key</label>
                                <input type="password" value={aiConfig.apiKey} onChange={e => setAiConfig({ ...aiConfig, apiKey: e.target.value })} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white outline-none font-mono" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-slate-500 font-bold uppercase">模型名称 (如 gemini-pro, gpt-4, deepseek-chat)</label>
                                <input type="text" value={aiConfig.model} onChange={e => setAiConfig({ ...aiConfig, model: e.target.value })} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white outline-none font-mono" />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button onClick={handleTestAI} disabled={isTestingAI} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all">
                                    {isTestingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <Network className="w-4 h-4" />} 测试连通性
                                </button>
                                <button onClick={saveAiConfig} className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs">保存配置</button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'announcements' && (
                    <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 space-y-8">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2"><BellRing className="w-5 h-5 text-indigo-400" /> 系统公告发布</h3>

                        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
                            <input placeholder="公告标题" value={newAnnounce.title} onChange={e => setNewAnnounce({ ...newAnnounce, title: e.target.value })} className="w-full bg-slate-900 border border-slate-800 p-3 rounded-xl text-white text-sm outline-none" />
                            <textarea rows={3} placeholder="公告内容..." value={newAnnounce.content} onChange={e => setNewAnnounce({ ...newAnnounce, content: e.target.value })} className="w-full bg-slate-900 border border-slate-800 p-3 rounded-xl text-white text-sm outline-none resize-none" />
                            <div className="flex justify-between items-center">
                                <select value={newAnnounce.priority} onChange={e => setNewAnnounce({ ...newAnnounce, priority: e.target.value })} className="bg-slate-900 border border-slate-800 p-2 rounded-lg text-white text-xs outline-none">
                                    <option value="normal">普通通知</option>
                                    <option value="high">紧急告警</option>
                                </select>
                                <button onClick={handlePostAnnounce} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs">发布</button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {announcements.map(a => (
                                <div key={a.id} className="p-4 bg-slate-950/50 border border-slate-800 rounded-xl flex justify-between items-start">
                                    <div>
                                        <div className="font-bold text-white text-sm flex items-center gap-2">
                                            {a.priority === 'high' && <span className="w-2 h-2 rounded-full bg-rose-500"></span>}
                                            {a.title}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1">{a.content}</div>
                                        <div className="text-[10px] text-slate-600 mt-2">{format(new Date(a.createdAt), 'yyyy-MM-dd HH:mm')} by {a.author}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => api.updateAnnouncementStatus(a.id, !a.isActive)} className={`text-[10px] font-bold px-2 py-1 rounded ${a.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-800 text-slate-500'}`}>
                                            {a.isActive ? '展示中' : '已隐藏'}
                                        </button>
                                        <button onClick={() => deleteAnnounce(a.id)} className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'audit' && (
                    <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 space-y-8">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-slate-400" /> 用户审计日志</h3>
                            <button onClick={exportAudit} className="px-4 py-2 bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-slate-700">
                                <Download className="w-3 h-3" /> 导出 CSV
                            </button>
                        </div>
                        <div className="overflow-x-auto max-h-[500px] custom-scrollbar border border-slate-800 rounded-2xl">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-950 text-slate-500 font-bold uppercase sticky top-0">
                                    <tr>
                                        <th className="p-4">时间</th>
                                        <th className="p-4">用户</th>
                                        <th className="p-4">操作类型</th>
                                        <th className="p-4">详情</th>
                                        <th className="p-4">IP来源</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800 text-slate-300">
                                    {auditLogs.map(log => (
                                        <tr key={log.id} className="hover:bg-slate-800/30">
                                            <td className="p-4 font-mono text-slate-500">{format(new Date(log.timestamp), 'MM-dd HH:mm:ss')}</td>
                                            <td className="p-4 font-bold text-white">{log.username}</td>
                                            <td className="p-4"><span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] font-bold text-indigo-300">{log.action}</span></td>
                                            <td className="p-4 truncate max-w-[200px]" title={log.details}>{log.details}</td>
                                            <td className="p-4 font-mono text-slate-500">{log.ip}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'labels' && (
                    <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 space-y-8">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2"><Tag className="w-5 h-5 text-indigo-400" /> 自定义标签配置</h3>
                            <button onClick={handleSaveLabels} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-indigo-500 transition-all">
                                <Save className="w-3.5 h-3.5" /> 保存全部并生效
                            </button>
                        </div>
                        <p className="text-xs text-slate-500">修改后点击「保存」，所有模块的下拉选项和区域名称将<span className="text-indigo-400 font-bold">实时更新</span>。</p>

                        {/* System Name */}
                        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
                            <h4 className="text-sm font-bold text-white">🏷️ 系统名称</h4>
                            <input
                                value={labelsConfig.systemName}
                                onChange={e => setLabelsConfig(prev => ({ ...prev, systemName: e.target.value }))}
                                className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-white text-sm outline-none focus:border-indigo-500"
                                placeholder="系统显示名称"
                            />
                            <p className="text-[10px] text-slate-600">将显示在登录页、侧边栏、浏览器标签页标题中。</p>
                        </div>

                        {/* Office Areas */}
                        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
                            <h4 className="text-sm font-bold text-white">🏢 办公区域</h4>
                            <div className="flex flex-wrap gap-2">
                                {labelsConfig.officeAreas.map(area => (
                                    <span key={area} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-full text-xs font-bold">
                                        {area}
                                        <button onClick={() => removeItem('officeAreas', area)} className="text-indigo-400 hover:text-rose-400 transition-colors"><X className="w-3 h-3" /></button>
                                    </span>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    value={newOfficeArea}
                                    onChange={e => setNewOfficeArea(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && addItem('officeAreas', newOfficeArea, setNewOfficeArea)}
                                    className="flex-1 bg-slate-900 border border-slate-700 p-2.5 rounded-xl text-white text-sm outline-none focus:border-indigo-500"
                                    placeholder="输入新区域名称，按回车或点击添加"
                                />
                                <button onClick={() => addItem('officeAreas', newOfficeArea, setNewOfficeArea)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-500"><Plus className="w-4 h-4" /></button>
                            </div>
                        </div>

                        {/* Categories */}
                        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
                            <h4 className="text-sm font-bold text-white">📋 日志类别</h4>
                            <div className="flex flex-wrap gap-2">
                                {labelsConfig.categories.map(cat => (
                                    <span key={cat} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 text-purple-300 rounded-full text-xs font-bold">
                                        {cat}
                                        <button onClick={() => removeItem('categories', cat)} className="text-purple-400 hover:text-rose-400 transition-colors"><X className="w-3 h-3" /></button>
                                    </span>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    value={newCategory}
                                    onChange={e => setNewCategory(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && addItem('categories', newCategory, setNewCategory)}
                                    className="flex-1 bg-slate-900 border border-slate-700 p-2.5 rounded-xl text-white text-sm outline-none focus:border-indigo-500"
                                    placeholder="输入新日志类别，按回车或点击添加"
                                />
                                <button onClick={() => addItem('categories', newCategory, setNewCategory)} className="px-4 py-2 bg-purple-600 text-white rounded-xl font-bold text-xs hover:bg-purple-500"><Plus className="w-4 h-4" /></button>
                            </div>
                        </div>

                        {/* Device Types */}
                        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
                            <h4 className="text-sm font-bold text-white">🖥️ 设备类型</h4>
                            <div className="flex flex-wrap gap-2">
                                {labelsConfig.deviceTypes.map(dt => (
                                    <span key={dt} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-full text-xs font-bold">
                                        {dt}
                                        <button onClick={() => removeItem('deviceTypes', dt)} className="text-emerald-400 hover:text-rose-400 transition-colors"><X className="w-3 h-3" /></button>
                                    </span>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    value={newDeviceType}
                                    onChange={e => setNewDeviceType(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && addItem('deviceTypes', newDeviceType, setNewDeviceType)}
                                    className="flex-1 bg-slate-900 border border-slate-700 p-2.5 rounded-xl text-white text-sm outline-none focus:border-indigo-500"
                                    placeholder="输入新设备类型，按回车或点击添加"
                                />
                                <button onClick={() => addItem('deviceTypes', newDeviceType, setNewDeviceType)} className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-500"><Plus className="w-4 h-4" /></button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SettingsPage;
