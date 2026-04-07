
import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import LogForm from './components/LogForm';
import Timeline from './components/Timeline';
import SettingsPage from './components/SettingsPage';
import LoginPage from './components/LoginPage';
import TodoCenter from './components/TodoCenter';
import SecurityCenter from './components/SecurityCenter';
import DeviceLedger from './components/DeviceLedger';
import KnowledgeBase from './components/KnowledgeBase';
import Search from './components/Search';
import Stats from './components/Stats';
import AIHub from './components/AIHub';
import OAEvents from './components/OAEvents';
import DataShare from './components/DataShare';
import { UserRole } from './types';
import { Loader2 } from 'lucide-react';
import { api } from './services/api';

export type TabId = 'dashboard' | 'tasks' | 'security' | 'devices' | 'knowledge' | 'timeline' | 'add' | 'stats' | 'search' | 'settings' | 'ai-lab' | 'oa-ops' | 'data-share';

// ─── App Config Context ───────────────────────────────────────────────────────
export interface AppConfig {
  systemName: string;
  officeAreas: string[];
  categories: string[];
  deviceTypes: string[];
}

export const DEFAULT_APP_CONFIG: AppConfig = {
  systemName: '技术部工作站',
  officeAreas: ['高朋办公区', '双林办公区'],
  categories: ['直播保障', '播控巡检', '演播室维保', '技术改造', '信号调度', '应急抢修', '交接班记录'],
  deviceTypes: ['视频切换台', '核心交换机', '编码/解码器', '存储服务器', '工作站', '监视器/大屏', '音频矩阵', '卫星接收机', 'UPS电源', '其他设备'],
};

export interface AppConfigContextValue {
  config: AppConfig;
  reloadConfig: () => Promise<void>;
}

export const AppConfigContext = createContext<AppConfigContextValue>({
  config: DEFAULT_APP_CONFIG,
  reloadConfig: async () => { },
});

export const useAppConfig = () => useContext(AppConfigContext);
// ─────────────────────────────────────────────────────────────────────────────

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<string>('');
  const [userRole, setUserRole] = useState<UserRole>('ENGINEER');
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [globalOfficeArea, setGlobalOfficeArea] = useState('全局概览');
  const [allowedTabs, setAllowedTabs] = useState<string[]>([]);
  const [appConfig, setAppConfig] = useState<AppConfig>(DEFAULT_APP_CONFIG);

  const reloadConfig = useCallback(async () => {
    try {
      const cfg = await api.getAppConfig();
      if (cfg && cfg.officeAreas) {
        setAppConfig(cfg);
        document.title = `${cfg.systemName} - 技术部专用系统`;
      }
    } catch (e) {
      console.error('Failed to load app config', e);
    }
  }, []);

  // 初始化时检查本地存储并验证服务器状态
  useEffect(() => {
    const checkSession = async () => {
      try {
        const storedSession = localStorage.getItem('app_session');
        if (storedSession) {
          const session = JSON.parse(storedSession);
          if (session.username) {
            const validation = await api.validateUser(session.username);
            if (validation.valid) {
              setCurrentUser(session.username);
              setUserRole(validation.role || session.role);
              setAllowedTabs(validation.allowedTabs || []);
              setIsAuthenticated(true);
              api.setContext(validation.role || session.role, session.username);
            } else {
              console.warn("User validation failed - account may have been deleted.");
              localStorage.removeItem('app_session');
              setIsAuthenticated(false);
            }
          }
        }
      } catch (e) {
        console.error("Session restore failed", e);
        localStorage.removeItem('app_session');
      } finally {
        setIsSessionLoading(false);
      }
    };
    checkSession();
    reloadConfig();
  }, [reloadConfig]);

  const handleLogin = (role: UserRole, username: string, tabs: string[] = []) => {
    setUserRole(role);
    setCurrentUser(username);
    setAllowedTabs(tabs);
    setIsAuthenticated(true);
    api.setContext(role, username);
    localStorage.setItem('app_session', JSON.stringify({ username, role, loginAt: Date.now() }));
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser('');
    setActiveTab('dashboard');
    localStorage.removeItem('app_session');
    api.setContext('', '');
  };

  if (isSessionLoading) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">正在验证身份与权限...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <LoginPage onLogin={handleLogin} appConfig={appConfig} />;

  const effectiveAllowedTabs = allowedTabs.length > 0 ? allowedTabs : ['dashboard', 'search', 'settings'];

  return (
    <AppConfigContext.Provider value={{ config: appConfig, reloadConfig }}>
      <Layout
        activeTab={activeTab}
        setActiveTab={(t) => setActiveTab(t as TabId)}
        globalOfficeArea={globalOfficeArea as any}
        setGlobalOfficeArea={setGlobalOfficeArea}
        userRole={userRole}
        currentUser={currentUser}
        onLogout={handleLogout}
        allowedTabs={effectiveAllowedTabs}
      >
        {activeTab === 'dashboard' && (
          <Dashboard
            onLogClick={(id) => setActiveTab('timeline')}
            globalOfficeArea={globalOfficeArea as any}
            setGlobalOfficeArea={setGlobalOfficeArea}
            allowedTabs={effectiveAllowedTabs}
          />
        )}

        {activeTab === 'tasks' && (
          <TodoCenter
            globalOfficeArea={globalOfficeArea as any}
            currentUser={currentUser}
            userRole={userRole}
          />
        )}

        {activeTab === 'security' && (
          <SecurityCenter
            globalOfficeArea={globalOfficeArea as any}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'oa-ops' && (
          <OAEvents currentUser={currentUser} />
        )}

        {activeTab === 'data-share' && (
          <DataShare currentUser={currentUser} userRole={userRole} />
        )}

        {activeTab === 'devices' && (
          <DeviceLedger
            globalOfficeArea={globalOfficeArea as any}
            currentUser={currentUser}
            userRole={userRole}
          />
        )}

        {activeTab === 'knowledge' && (
          <KnowledgeBase currentUser={currentUser} />
        )}

        {activeTab === 'timeline' && (
          <Timeline
            globalOfficeArea={globalOfficeArea as any}
            currentUser={currentUser}
            userRole={userRole}
          />
        )}

        {activeTab === 'add' && (
          <LogForm
            currentUser={currentUser}
            onSuccess={() => setActiveTab('timeline')}
          />
        )}

        {activeTab === 'stats' && (
          <Stats
            onCategoryClick={() => setActiveTab('timeline')}
            currentUser={currentUser}
            userRole={userRole}
          />
        )}

        {activeTab === 'ai-lab' && (
          <AIHub />
        )}

        {activeTab === 'search' && (
          <Search initialFilter={null} onClearFilter={() => { }} />
        )}

        {activeTab === 'settings' && (
          <SettingsPage
            userRole={userRole}
            currentUser={currentUser}
            onLogout={handleLogout}
          />
        )}
      </Layout>
    </AppConfigContext.Provider>
  );
};

export default App;
