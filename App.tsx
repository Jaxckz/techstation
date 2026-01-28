
import React, { useState, useEffect, useCallback } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import LogForm from './components/LogForm';
import Timeline from './components/Timeline';
import Stats from './components/Stats';
import Search from './components/Search';
import SettingsPage from './components/SettingsPage';
import TodoCenter from './components/TodoCenter';
import SecurityCenter from './components/SecurityCenter';
import CommandPalette from './components/CommandPalette';
import LoginPage from './components/LoginPage';
import DeviceLedger from './components/DeviceLedger';
import KnowledgeBase from './components/KnowledgeBase';
import ReportHub from './components/ReportHub';
import { LogEntry, OFFICE_AREAS, OfficeArea, UserRole, AuditLogEntry } from './types';
import { ShieldAlert, Lock, Loader2, RefreshCw } from 'lucide-react';
import { db } from './db';
import { syncService } from './services/syncService';

export type TabId = 'dashboard' | 'tasks' | 'security' | 'devices' | 'add' | 'timeline' | 'stats' | 'search' | 'settings' | 'knowledge' | 'reports';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('auth_token') === 'active';
  });

  const [currentUser, setCurrentUser] = useState<string>(() => {
    return sessionStorage.getItem('user_name') || '';
  });

  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [searchFilter, setSearchFilter] = useState<{category?: string, id?: number} | null>(null);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);
  const [syncToast, setSyncToast] = useState<string | null>(null);
  
  const [userRole, setUserRole] = useState<UserRole>(() => {
    return (sessionStorage.getItem('user_role') as UserRole) || 'ENGINEER';
  });

  const [globalOfficeArea, setGlobalOfficeArea] = useState<OfficeArea | '全局概览'>(() => {
    return (localStorage.getItem('global_office_area') as OfficeArea) || '全局概览';
  });

  // 初始化 P2P 同步引擎
  useEffect(() => {
    if (isAuthenticated) {
      syncService.init(() => {});
      syncService.setCallback((msg) => {
        setSyncToast(`[分布式同步] 收到来自全网的最新数据`);
        setTimeout(() => setSyncToast(null), 3000);
      });
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const fetchPerms = async () => {
      setIsLoadingPermissions(true);
      const config = await db.rolePermissions.get(userRole);
      if (config) setPermissions(config.allowedTabs);
      setIsLoadingPermissions(false);
    };
    if (isAuthenticated) fetchPerms();
  }, [userRole, isAuthenticated]);

  useEffect(() => {
    localStorage.setItem('global_office_area', globalOfficeArea);
  }, [globalOfficeArea]);

  const handleLogin = (role: UserRole, username: string) => {
    setUserRole(role);
    setCurrentUser(username);
    setIsAuthenticated(true);
    sessionStorage.setItem('auth_token', 'active');
    sessionStorage.setItem('user_name', username);
    sessionStorage.setItem('user_role', role);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.clear();
    setCurrentUser('');
    setActiveTab('dashboard');
  };

  if (!isAuthenticated) return <LoginPage onLogin={handleLogin} />;
  if (isLoadingPermissions) return <div className="fixed inset-0 bg-slate-950 flex items-center justify-center text-slate-500 font-bold uppercase tracking-widest text-xs">正在同步局域网权限配置...</div>;

  return (
    <>
      <Layout 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          if (tab !== 'search') setSearchFilter(null);
          setActiveTab(tab as TabId);
        }}
        globalOfficeArea={globalOfficeArea}
        userRole={userRole}
        currentUser={currentUser}
        onLogout={handleLogout}
        allowedTabs={permissions}
      >
        <div className="transition-all duration-500 ease-out">
          {(() => {
            if (!permissions.includes(activeTab)) return <div className="py-20 text-center text-rose-500 font-bold">权限受限</div>;
            switch (activeTab) {
              case 'dashboard': return <Dashboard globalOfficeArea={globalOfficeArea} setGlobalOfficeArea={setGlobalOfficeArea} onLogClick={(id) => { setSearchFilter({id}); setActiveTab('search'); }} />;
              case 'tasks': return <TodoCenter currentUser={currentUser} globalOfficeArea={globalOfficeArea === '全局概览' ? undefined : (globalOfficeArea as OfficeArea)} />;
              case 'security': return <SecurityCenter currentUser={currentUser} globalOfficeArea={globalOfficeArea === '全局概览' ? undefined : (globalOfficeArea as OfficeArea)} />;
              case 'devices': return <DeviceLedger currentUser={currentUser} userRole={userRole} globalOfficeArea={globalOfficeArea === '全局概览' ? undefined : (globalOfficeArea as OfficeArea)} />;
              case 'knowledge': return <KnowledgeBase currentUser={currentUser} />;
              case 'reports': return <ReportHub currentUser={currentUser} />;
              case 'add': return <LogForm currentUser={currentUser} onSuccess={() => setActiveTab('timeline')} initialData={{ officeArea: globalOfficeArea === '全局概览' ? OFFICE_AREAS[0] : globalOfficeArea } as any} />;
              case 'timeline': return <Timeline onLogClick={(id) => { setSearchFilter({id}); setActiveTab('search'); }} />;
              case 'stats': return <Stats onCategoryClick={() => setActiveTab('search')} />;
              case 'search': return <Search initialFilter={searchFilter} onClearFilter={() => setSearchFilter(null)} />;
              case 'settings': return <SettingsPage userRole={userRole} currentUser={currentUser} onLogout={handleLogout} />;
              default: return null;
            }
          })()}
        </div>
      </Layout>

      {syncToast && (
        <div className="fixed bottom-10 right-10 z-[1000] bg-indigo-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-4">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="text-xs font-bold">{syncToast}</span>
        </div>
      )}
    </>
  );
};

export default App;
