
import React, { useEffect, useState } from 'react';
import { Globe, Building2, Files, ListTodo, ShieldAlert, ImageIcon, Radio, RefreshCw, ChevronRight, Activity, BarChart3, TrendingUp, Server, Bell, X, Workflow } from 'lucide-react';
import { api } from '../services/api';
import { LogEntry, OfficeArea, Announcement } from '../types';
import { useAppConfig } from '../App';
import { format } from 'date-fns';
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, Cell } from 'recharts';

interface DashboardProps {
  onLogClick: (id: number) => void;
  globalOfficeArea: string;
  setGlobalOfficeArea: (area: string) => void;
  allowedTabs?: string[]; // 新增权限属性
}

const Dashboard: React.FC<DashboardProps> = ({ onLogClick, globalOfficeArea, setGlobalOfficeArea, allowedTabs = [] }) => {
  const { config } = useAppConfig();
  const [stats, setStats] = useState({ logCount: 0, pendingTasks: 0, securityEvents: 0, assetCount: 0, oaCount: 0 });
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);

  const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#475569'];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const isGlobal = globalOfficeArea === '全局概览';

        // 并行拉取所有数据
        const [allLogs, allTodos, allSecurity, allDevices, allOA, allAnnouncements] = await Promise.all([
          api.getLogs(),
          api.getTodos(),
          api.getSecurityLogs(),
          api.getDevices(),
          api.getOAEvents(),
          api.getAnnouncements(true)
        ]);

        // 公告
        if (allAnnouncements && allAnnouncements.length > 0) {
          setAnnouncement(allAnnouncements[0]);
        }

        // 前端过滤 (暂时的简单处理)
        const logs = isGlobal ? allLogs : allLogs.filter((l: any) => l.officeArea === globalOfficeArea);
        const todos = isGlobal ? allTodos : allTodos.filter((t: any) => t.officeArea === globalOfficeArea);
        const security = isGlobal ? allSecurity : allSecurity.filter((s: any) => s.officeArea === globalOfficeArea);
        const devices = isGlobal ? allDevices : allDevices.filter((d: any) => d.officeArea === globalOfficeArea);
        const oaEvents = allOA; // OA 目前设计为全域，暂不按 OfficeArea 过滤

        setStats({
          logCount: logs.length,
          pendingTasks: todos.filter((t: any) => t.status !== 'completed').length,
          securityEvents: security.length,
          assetCount: devices.length,
          oaCount: oaEvents.filter((e: any) => e.status !== 'closed' && e.status !== '已关闭' && e.status !== '已处理').length
        });
        setRecentLogs(logs.slice(0, 5)); // API 默认按时间倒序

        // 统计图表数据
        const catData = config.categories.map(cat => ({
          name: cat.slice(0, 4),
          count: logs.filter((l: any) => l.category === cat).length
        })).filter(d => d.count > 0);
        setChartData(catData);
      } catch (e) {
        console.error("Dashboard fetch error:", e);
      }
    };

    fetchData();
    const timer = setInterval(fetchData, 10000); // 10秒刷新一次
    return () => clearInterval(timer);
  }, [globalOfficeArea]);

  // 根据 allowedTabs 过滤显示的卡片
  const statCards = [
    { id: 'timeline', label: '运维记录', val: stats.logCount, icon: Files, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { id: 'tasks', label: '待办事项', val: stats.pendingTasks, icon: ListTodo, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { id: 'security', label: '安防事件', val: stats.securityEvents, icon: ShieldAlert, color: 'text-rose-500', bg: 'bg-rose-500/10' },
    { id: 'devices', label: '设备资产', val: stats.assetCount, icon: Server, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { id: 'oa-ops', label: 'OA 待办', val: stats.oaCount, icon: Workflow, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  ].filter(card => allowedTabs.includes(card.id));

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">

      {announcement && (
        <div className={`p-4 rounded-2xl border flex items-start gap-3 relative animate-in slide-in-from-top-2 ${announcement.priority === 'high' ? 'bg-amber-500/10 border-amber-500/20 text-amber-100' : 'bg-indigo-900/20 border-indigo-500/20 text-indigo-100'}`}>
          <Bell className={`w-5 h-5 flex-none mt-0.5 ${announcement.priority === 'high' ? 'text-amber-500' : 'text-indigo-400'}`} />
          <div className="flex-1">
            <h4 className="font-bold text-sm mb-1">{announcement.title}</h4>
            <p className="text-xs opacity-80 leading-relaxed whitespace-pre-wrap">{announcement.content}</p>
            <div className="text-[10px] mt-2 opacity-50">{format(new Date(announcement.createdAt), 'MM-dd HH:mm')} by {announcement.author}</div>
          </div>
          <button onClick={() => setAnnouncement(null)} className="p-1 hover:bg-white/10 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-center shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform"><Activity className="w-48 h-48" /></div>
            <div className="flex items-center gap-6 relative z-10">
              <div className={`p-5 rounded-[2rem] bg-indigo-600 text-white shadow-2xl`}>
                {globalOfficeArea === '全局概览' ? <Globe className="w-8 h-8" /> : <Building2 className="w-8 h-8" />}
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-white tracking-tight">{globalOfficeArea} 态势概览</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Broadcast Operations Command</p>
              </div>
            </div>
            <div className="flex bg-slate-950 p-1.5 rounded-[1.5rem] border border-slate-800 gap-1 mt-6 md:mt-0 relative z-10">
              <button onClick={() => setGlobalOfficeArea('全局概览')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${globalOfficeArea === '全局概览' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>全域</button>
              {config.officeAreas.map(area => (
                <button key={area} onClick={() => setGlobalOfficeArea(area)} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${globalOfficeArea === area ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>{area.slice(0, 2)}</button>
              ))}
            </div>
          </div>

          <div className={`grid grid-cols-2 ${statCards.length > 3 ? 'md:grid-cols-3 lg:grid-cols-5' : 'md:grid-cols-3'} gap-4`}>
            {statCards.map((item, i) => (
              <div key={i} className="bg-slate-900 border border-slate-800 p-5 rounded-[2rem] flex flex-col gap-3 hover:border-slate-700 transition-all shadow-sm group">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${item.bg} ${item.color} group-hover:scale-110 transition-transform`}><item.icon className="w-4 h-4" /></div>
                <div>
                  <div className="text-2xl font-black text-white">{item.val}</div>
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{item.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 space-y-6 shadow-2xl relative overflow-hidden">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2"><BarChart3 className="w-4 h-4 text-indigo-400" /> 核心业务分布图</h3>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" hide />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', fontSize: '10px' }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-slate-600 font-bold leading-relaxed">数据来源：Central API Server (SQLite)。所有数据实时从服务器拉取。</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-slate-800 bg-slate-800/10 flex justify-between items-center">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
            <Activity className="w-4 h-4 text-indigo-500" /> 最新动态
          </h3>
          <RefreshCw className="w-3.5 h-3.5 text-slate-700 animate-spin-slow" />
        </div>
        <div className="divide-y divide-slate-800/60">
          {recentLogs.map((log) => (
            <div key={log.id} onClick={() => onLogClick(log.id!)} className="p-7 flex items-center gap-8 hover:bg-slate-800/40 cursor-pointer transition-all group">
              <div className="w-14 h-14 rounded-[1.5rem] flex items-center justify-center bg-slate-950 border border-slate-800 text-slate-700 group-hover:text-indigo-400 transition-all"><Radio className="w-6 h-6" /></div>
              <div className="flex-1 space-y-1.5">
                <h4 className="font-bold text-slate-200 truncate text-base group-hover:text-white transition-colors">{log.title}</h4>
                <div className="flex items-center gap-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">
                  <span className="text-indigo-500">{log.category}</span>
                  <span>•</span>
                  <span className="text-slate-500">{log.officeArea}</span>
                  <span>•</span>
                  <span className="font-mono">{format(new Date(log.date), 'MM-dd HH:mm')}</span>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-slate-800 group-hover:translate-x-2 group-hover:text-indigo-400 transition-all" />
            </div>
          ))}
          {recentLogs.length === 0 && <div className="py-24 text-center text-slate-800 text-[11px] font-black uppercase tracking-[0.4em]">暂无实时运维动态</div>}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
