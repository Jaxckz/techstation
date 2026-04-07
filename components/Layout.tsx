
import React, { useState, useEffect, createContext, useContext } from 'react';
import {
  LayoutDashboard,
  Plus,
  History,
  PieChart,
  Search,
  Settings,
  Library,
  ListTodo,
  ShieldAlert,
  Building2,
  MapPin,
  Command,
  Globe,
  UserCircle2,
  LogOut,
  Power,
  Server,
  BookOpen,
  X,
  CheckCircle2,
  AlertCircle,
  Bot,
  Workflow,
  Share2,
  Menu,
  ChevronRight
} from 'lucide-react';
import { OfficeArea, UserRole, NavItem } from '../types';
import { useAppConfig } from '../App';
import CommandPalette from './CommandPalette';

// --- Toast System ---
type ToastType = 'success' | 'error' | 'info';
interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}
export const ToastContext = createContext<ToastContextType>({ showToast: () => { } });

// --- Components ---

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  globalOfficeArea: string;
  setGlobalOfficeArea: (area: string) => void;
  userRole: UserRole;
  currentUser: string;
  onLogout: () => void;
  allowedTabs: string[];
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, globalOfficeArea, setGlobalOfficeArea, userRole, currentUser, onLogout, allowedTabs }) => {
  const { config } = useAppConfig();
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [toasts, setToasts] = useState<{ id: number, message: string, type: ToastType }[]>([]);

  // Mobile Menu State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Custom Office Input State
  const [isEditingArea, setIsEditingArea] = useState(false);
  const [tempArea, setTempArea] = useState(globalOfficeArea);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsCommandOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const showToast = (message: string, type: ToastType = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const navItems: NavItem[] = [
    { id: 'dashboard', label: '工作概览', icon: LayoutDashboard },
    { id: 'tasks', label: '事项中心', icon: ListTodo },
    { id: 'security', label: '安防审计', icon: ShieldAlert },
    { id: 'oa-ops', label: 'OA 运维', icon: Workflow },
    { id: 'data-share', label: '数据共享', icon: Share2 },
    { id: 'devices', label: '设备台账', icon: Server },
    { id: 'knowledge', label: '技术手册', icon: BookOpen },
    { id: 'timeline', label: '日志追溯', icon: History },
    { id: 'add', label: '新建日志', icon: Plus },
    { id: 'stats', label: '效能统计', icon: PieChart },
    { id: 'ai-lab', label: 'AI 智脑', icon: Bot },
    { id: 'search', label: '全局检索', icon: Search, shortcut: 'K' },
  ];

  const filteredNav = navItems.filter(item => allowedTabs.includes(item.id));

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'ADMIN': return { label: '超级管理员', color: 'text-indigo-400', bg: 'bg-indigo-500/10' };
      case 'ENGINEER': return { label: '技术工程师', color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
      case 'SECURITY': return { label: '安防专员', color: 'text-rose-400', bg: 'bg-rose-500/10' };
      case 'OA_SPECIALIST': return { label: 'OA 专员', color: 'text-amber-400', bg: 'bg-amber-500/10' };
      default: return { label: '访客', color: 'text-slate-400', bg: 'bg-slate-500/10' };
    }
  };

  const roleInfo = getRoleLabel(userRole);

  return (
    <ToastContext.Provider value={{ showToast }}>
      <div className="flex flex-col md:flex-row min-h-screen bg-slate-950 text-slate-100">
        <CommandPalette
          isOpen={isCommandOpen}
          onClose={() => setIsCommandOpen(false)}
          globalOfficeArea={globalOfficeArea as any}
          onSelectLog={(id) => { setActiveTab('timeline'); /* logic to scroll to log would go here */ }}
          onNavigate={setActiveTab}
          userRole={userRole}
          allowedTabs={allowedTabs}
        />

        {/* Toast Container */}
        <div className="fixed top-6 right-6 z-[9999] space-y-3 pointer-events-none">
          {toasts.map(toast => (
            <div key={toast.id} className={`pointer-events-auto min-w-[300px] p-4 rounded-xl shadow-2xl border flex items-center gap-3 animate-in slide-in-from-right fade-in duration-300 ${toast.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-100' :
                toast.type === 'error' ? 'bg-rose-950/90 border-rose-500/30 text-rose-100' :
                  'bg-slate-900/90 border-slate-700 text-slate-100'
              }`}>
              {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> :
                toast.type === 'error' ? <AlertCircle className="w-5 h-5 text-rose-500" /> :
                  <Library className="w-5 h-5 text-indigo-500" />}
              <span className="text-sm font-bold">{toast.message}</span>
            </div>
          ))}
        </div>

        <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-slate-900/30 border-r border-slate-800/40 sticky top-0 h-screen p-6 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Library className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-base tracking-tight text-white">{config.systemName}</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Broadcast Operations</p>
            </div>
          </div>

          <div className={`mb-6 p-4 rounded-2xl border ${roleInfo.bg} border-white/5 transition-all`}>
            <div className="flex items-center gap-2 mb-1.5">
              <UserCircle2 className={`w-3.5 h-3.5 ${roleInfo.color}`} />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">当前登录人员</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white">{currentUser}</span>
              <span className={`text-[9px] font-bold ${roleInfo.color} uppercase`}>{roleInfo.label}</span>
            </div>
          </div>

          {/* 可编辑的环境上下文选择器 */}
          <div className={`mb-8 p-4 rounded-2xl border transition-all ${globalOfficeArea === '全局概览' ? 'bg-indigo-600/5 border-indigo-500/20' : 'bg-slate-800/20 border-slate-700/50'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {globalOfficeArea === '全局概览' ? <Globe className="w-3.5 h-3.5 text-indigo-400" /> : <Building2 className="w-3.5 h-3.5 text-slate-400" />}
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">环境上下文</span>
              </div>
            </div>

            <div className="relative group">
              {isEditingArea ? (
                <input
                  autoFocus
                  className="w-full bg-slate-950 border border-indigo-500 rounded-lg px-2 py-1 text-xs text-white outline-none"
                  value={tempArea}
                  onChange={(e) => setTempArea(e.target.value)}
                  onBlur={() => { setIsEditingArea(false); setGlobalOfficeArea(tempArea || '全局概览'); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { setIsEditingArea(false); setGlobalOfficeArea(tempArea || '全局概览'); } }}
                />
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={() => { setTempArea(globalOfficeArea); setIsEditingArea(true); }}
                    className="w-full text-left text-xs font-bold text-white hover:text-indigo-400 transition-colors flex items-center justify-between"
                  >
                    <span>{globalOfficeArea}</span>
                  </button>
                  <div className="flex gap-1 flex-wrap">
                    <button onClick={() => setGlobalOfficeArea('全局概览')} className={`text-[9px] px-1.5 py-0.5 rounded border ${globalOfficeArea === '全局概览' ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' : 'border-slate-700 text-slate-500 hover:text-slate-300'}`}>全局</button>
                    {config.officeAreas.map(area => (
                      <button key={area} onClick={() => setGlobalOfficeArea(area)} className={`text-[9px] px-1.5 py-0.5 rounded border ${globalOfficeArea === area ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' : 'border-slate-700 text-slate-500 hover:text-slate-300'}`}>{area.slice(0, 2)}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar pr-1">
            {filteredNav.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'search') setIsCommandOpen(true);
                  else setActiveTab(item.id);
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative group
                  ${activeTab === item.id
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40'
                    : 'text-slate-500 hover:text-slate-100 hover:bg-slate-800/40'}
                `}
              >
                <item.icon className="w-5 h-5 flex-none" />
                <span className="font-semibold text-sm flex-1 text-left">{item.label}</span>
                {item.shortcut && (
                  <div className="hidden lg:flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-slate-700 bg-slate-950 text-[10px] text-slate-600 font-bold group-hover:border-slate-500 transition-colors">
                    <Command className="w-2 h-2" />
                    {item.shortcut}
                  </div>
                )}
              </button>
            ))}
          </nav>

          <div className="pt-6 border-t border-slate-800/60 space-y-1">
            <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-200'}`}>
              <Settings className="w-5 h-5" />
              <span className="font-semibold text-sm">系统设置</span>
            </button>
            <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-all">
              <LogOut className="w-5 h-5" />
              <span className="font-semibold text-sm">安全退出</span>
            </button>
          </div>
        </aside>

        <main className="flex-1 min-h-0 pb-24 md:pb-10 pt-6 px-4 md:px-8 lg:px-12 max-w-7xl mx-auto w-full overflow-x-hidden">
          <header className="flex items-center justify-between mb-8 py-2">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold tracking-tight text-white md:block hidden">
                {activeTab === 'settings' ? '系统设置与管理' : (navItems.find(i => i.id === activeTab)?.label)}
              </h2>
              {/* Mobile Title Show */}
              <h2 className="text-lg font-black tracking-tight text-white md:hidden block flex items-center gap-2">
                <Library className="w-5 h-5 text-indigo-500" /> {config.systemName}
              </h2>
              <div className={`hidden md:flex px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest items-center gap-2 ${globalOfficeArea === '全局概览' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-purple-500/10 border-purple-500/20 text-purple-400'}`}>
                {globalOfficeArea === '全局概览' ? <Globe className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                {globalOfficeArea}
              </div>
            </div>

            <div className="flex items-center gap-3 bg-slate-900/50 p-2 pl-4 rounded-2xl border border-slate-800">
              <div className="text-right">
                <p className="text-[10px] font-bold text-white leading-none">{currentUser}</p>
                <p className={`text-[8px] font-bold ${roleInfo.color} uppercase tracking-tighter mt-1`}>{roleInfo.label}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${roleInfo.bg} ${roleInfo.color}`}>
                <UserCircle2 className="w-6 h-6" />
              </div>
            </div>
          </header>
          {children}
        </main>

        {/* Mobile Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/60 h-[72px] z-40 flex items-center justify-around px-2 pb-2">
          <button onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }} className={`flex flex-col items-center justify-center gap-1.5 flex-1 p-2 rounded-xl transition-all ${activeTab === 'dashboard' ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500'}`}>
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[9px] font-bold">概览</span>
          </button>

          <button onClick={() => { setActiveTab('tasks'); setIsMobileMenuOpen(false); }} className={`flex flex-col items-center justify-center gap-1.5 flex-1 p-2 rounded-xl transition-all ${activeTab === 'tasks' ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500'}`}>
            <ListTodo className="w-5 h-5" />
            <span className="text-[9px] font-bold">待办</span>
          </button>

          <button onClick={() => { setActiveTab('add'); setIsMobileMenuOpen(false); }} className="flex flex-col items-center justify-center gap-1.5 flex-1 -mt-6">
            <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-600/40 text-white">
              <Plus className="w-6 h-6" />
            </div>
            <span className="text-[9px] font-bold text-indigo-400">记一笔</span>
          </button>

          <button onClick={() => { setActiveTab('timeline'); setIsMobileMenuOpen(false); }} className={`flex flex-col items-center justify-center gap-1.5 flex-1 p-2 rounded-xl transition-all ${activeTab === 'timeline' ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500'}`}>
            <History className="w-5 h-5" />
            <span className="text-[9px] font-bold">日志</span>
          </button>

          <button onClick={() => setIsMobileMenuOpen(true)} className={`flex flex-col items-center justify-center gap-1.5 flex-1 p-2 rounded-xl transition-all ${isMobileMenuOpen ? 'text-white' : 'text-slate-500'}`}>
            <Menu className="w-5 h-5" />
            <span className="text-[9px] font-bold">更多</span>
          </button>
        </nav>

        {/* Mobile Menu Drawer */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-[100] md:hidden animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
            <div className="absolute bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 rounded-t-[2.5rem] p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[85vh] overflow-y-auto flex flex-col">
              <div className="w-12 h-1.5 bg-slate-800 rounded-full mx-auto mb-6 flex-none"></div>

              {/* User Info Mobile */}
              <div className="flex items-center gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800 mb-6 flex-none">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${roleInfo.bg} ${roleInfo.color}`}>
                  <UserCircle2 className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-black text-white">{currentUser}</h3>
                  <p className={`text-[10px] font-bold uppercase ${roleInfo.color}`}>{roleInfo.label}</p>
                </div>
              </div>

              {/* Context Switcher Mobile */}
              <div className="mb-6 space-y-3 flex-none">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">切换环境</h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setGlobalOfficeArea('全局概览')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${globalOfficeArea === '全局概览' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
                  >
                    <Globe className="w-3.5 h-3.5" /> 全局
                  </button>
                  {config.officeAreas.map(area => (
                    <button
                      key={area}
                      onClick={() => setGlobalOfficeArea(area)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${globalOfficeArea === area ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
                    >
                      <MapPin className="w-3.5 h-3.5" /> {area.slice(0, 2)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Full Nav Grid */}
              <div className="grid grid-cols-2 gap-3 mb-6 flex-1 min-h-0 overflow-y-auto">
                {filteredNav.map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.id === 'search') setIsCommandOpen(true);
                      else setActiveTab(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-3 p-4 rounded-2xl border text-left transition-all ${activeTab === item.id ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'}`}
                  >
                    <item.icon className="w-5 h-5 flex-none" />
                    <span className="text-xs font-bold truncate">{item.label}</span>
                  </button>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-3 flex-none">
                <button onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }} className="flex-1 py-4 rounded-2xl bg-slate-950 border border-slate-800 text-slate-400 font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-800">
                  <Settings className="w-4 h-4" /> 设置
                </button>
                <button onClick={onLogout} className="flex-1 py-4 rounded-2xl bg-rose-950/30 border border-rose-900/50 text-rose-500 font-bold text-xs flex items-center justify-center gap-2 hover:bg-rose-900/50">
                  <LogOut className="w-4 h-4" /> 退出
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
};

export default Layout;
