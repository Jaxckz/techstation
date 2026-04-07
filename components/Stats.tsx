
import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { api } from '../services/api';
import { UserRole } from '../types';
import { useAppConfig } from '../App';
import { format, eachDayOfInterval, isSameDay, subDays, startOfWeek, startOfYear } from 'date-fns';
import { TrendingUp, Box, Building2, Download, Sparkles, Loader2, ClipboardCheck, X, UserCheck, Users, Search } from 'lucide-react';
import { generateWeeklyReport } from '../services/geminiService';

interface StatsProps {
  onCategoryClick: (cat: string) => void;
  currentUser: string;
  userRole: UserRole;
}

const Stats: React.FC<StatsProps> = ({ onCategoryClick, currentUser, userRole }) => {
  const { config } = useAppConfig();
  const [pieData, setPieData] = useState<any[]>([]);
  const [officeData, setOfficeData] = useState<any[]>([]);
  const [activityData, setActivityData] = useState<any[]>([]);
  const [userData, setUserData] = useState<any[]>([]); // For Admins - Chart
  const [userTableData, setUserTableData] = useState<any[]>([]); // For Admins - Table
  const [personalStats, setPersonalStats] = useState({ logs: 0, tasks: 0, completedTasks: 0 }); // For Everyone

  const [isGenerating, setIsGenerating] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);

  const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#475569'];

  useEffect(() => {
    const fetchStats = async () => {
      const allLogs = await api.getLogs();
      const allTodos = await api.getTodos();

      // 1. Personal Stats (Current User)
      const myLogs = allLogs.filter((l: any) => l.author === currentUser).length;
      const myTodos = allTodos.filter((t: any) => t.author === currentUser || t.handler === currentUser);
      const myCompleted = myTodos.filter((t: any) => t.status === 'completed').length;
      setPersonalStats({ logs: myLogs, tasks: myTodos.length, completedTasks: myCompleted });

      // 2. Data Filtering for Charts based on Role
      // Admin sees ALL data in charts. User sees only THEIR data in charts.
      const chartLogs = userRole === 'ADMIN' ? allLogs : allLogs.filter((l: any) => l.author === currentUser);

      // Category Pie Chart
      const catCounts = config.categories.map(cat => ({
        name: cat,
        value: chartLogs.filter((l: any) => l.category === cat).length
      })).filter(c => c.value > 0);
      setPieData(catCounts);

      // Office Area Pie Chart
      const areas = [...new Set(chartLogs.map((l: any) => l.officeArea))];
      const areaCounts = areas.map(area => ({
        name: area || '未分类',
        value: chartLogs.filter((l: any) => l.officeArea === area).length
      }));
      setOfficeData(areaCounts);

      // Activity Trend (Last 30 Days)
      const last30Days = eachDayOfInterval({ start: subDays(new Date(), 29), end: new Date() });
      const activity = last30Days.map(date => ({
        date: format(date, 'MM/dd'),
        count: chartLogs.filter((l: any) => isSameDay(new Date(l.date), date)).length
      }));
      setActivityData(activity);

      // 3. Admin Only: User Contribution Analysis
      if (userRole === 'ADMIN') {
        const allUsers = [...new Set([...allLogs.map((l: any) => l.author), ...allTodos.map((t: any) => t.author)])].filter(Boolean);

        // Chart Data
        const userContrib = allUsers.map(u => ({
          name: u,
          logs: allLogs.filter((l: any) => l.author === u).length,
          tasks: allTodos.filter((t: any) => t.handler === u && t.status === 'completed').length
        })).sort((a, b) => b.logs - a.logs).slice(0, 10);
        setUserData(userContrib);

        // Detailed Table Data
        const detailed = allUsers.map(u => {
          const logsCount = allLogs.filter((l: any) => l.author === u).length;
          const tasksHandled = allTodos.filter((t: any) => t.handler === u).length;
          const tasksCompleted = allTodos.filter((t: any) => t.handler === u && t.status === 'completed').length;
          const tasksCreated = allTodos.filter((t: any) => t.author === u).length;
          return {
            name: u,
            logs: logsCount,
            created: tasksCreated,
            handled: tasksHandled,
            completed: tasksCompleted,
            rate: tasksHandled > 0 ? ((tasksCompleted / tasksHandled) * 100).toFixed(0) + '%' : '0%'
          };
        }).sort((a, b) => b.logs - a.logs);
        setUserTableData(detailed);
      }
    };
    fetchStats();
  }, [currentUser, userRole]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 px-4 md:px-6">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-white tracking-tight">多维业务效能统计</h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{userRole === 'ADMIN' ? '全域数据监控视图' : '个人工作效能视图'}</p>
        </div>
        <button
          onClick={async () => {
            setIsGenerating(true);
            const logs = await api.getLogs();
            const tasks = await api.getTodos();
            const report = await generateWeeklyReport(logs.slice(0, 50), tasks.slice(0, 50));
            setAiReport(report);
            setIsGenerating(false);
          }}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 rounded-xl font-bold text-xs hover:bg-indigo-600 hover:text-white transition-all"
        >
          {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          AI 智慧周报
        </button>
      </header>

      {/* Personal Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center gap-4">
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400"><Box className="w-6 h-6" /></div>
          <div>
            <div className="text-2xl font-black text-white">{personalStats.logs}</div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">我的日志总数</div>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400"><ClipboardCheck className="w-6 h-6" /></div>
          <div>
            <div className="text-2xl font-black text-white">{personalStats.completedTasks} / {personalStats.tasks}</div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">我的任务完成率</div>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center gap-4">
          <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400"><TrendingUp className="w-6 h-6" /></div>
          <div>
            <div className="text-2xl font-black text-white">{(personalStats.tasks > 0 ? (personalStats.completedTasks / personalStats.tasks * 100).toFixed(0) : 0)}%</div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">综合效能指数</div>
          </div>
        </div>
      </div>

      {aiReport && (
        <div className="bg-slate-900 border border-indigo-500/20 rounded-3xl p-8 space-y-6 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-3">
              <ClipboardCheck className="w-5 h-5 text-emerald-500" /> AI 辅助总结
            </h3>
            <button onClick={() => setAiReport(null)} className="text-slate-600 hover:text-white"><X className="w-5 h-5" /></button>
          </div>
          <div className="prose prose-invert prose-sm max-w-none text-slate-300 bg-slate-950/50 p-6 rounded-2xl border border-slate-800/60 leading-relaxed whitespace-pre-wrap">
            {aiReport}
          </div>
        </div>
      )}

      {/* Admin Only: Team Performance */}
      {userRole === 'ADMIN' && (
        <div className="space-y-6">
          <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-2xl space-y-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-3"><Users className="w-4 h-4 text-emerald-400" /> 团队成员贡献度 (Top 10)</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={userData}>
                  <CartesianGrid vertical={false} stroke="#1e293b" />
                  <XAxis dataKey="name" fontSize={10} stroke="#64748b" />
                  <YAxis fontSize={10} stroke="#64748b" />
                  <Tooltip cursor={{ fill: '#1e293b' }} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }} />
                  <Legend />
                  <Bar name="提交日志" dataKey="logs" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar name="完成任务" dataKey="tasks" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-2xl space-y-6 shadow-sm overflow-hidden">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-3"><Search className="w-4 h-4 text-indigo-400" /> 全员效能明细表</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-400">
                <thead className="bg-slate-950 text-slate-500 uppercase font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-4">成员</th>
                    <th className="p-4">日志产出</th>
                    <th className="p-4">发布任务</th>
                    <th className="p-4">承接任务</th>
                    <th className="p-4">完成任务</th>
                    <th className="p-4">完成率</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {userTableData.map((user, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30">
                      <td className="p-4 font-bold text-white">{user.name}</td>
                      <td className="p-4">{user.logs}</td>
                      <td className="p-4">{user.created}</td>
                      <td className="p-4">{user.handled}</td>
                      <td className="p-4 text-emerald-400">{user.completed}</td>
                      <td className="p-4 font-bold">{user.rate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-2xl space-y-8 shadow-sm">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-3"><Building2 className="w-4 h-4 text-purple-400" /> 业务区域分布</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={officeData} innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none">
                  {officeData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[(index + 1) % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-2xl space-y-8 shadow-sm">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-3"><TrendingUp className="w-4 h-4 text-indigo-400" /> {userRole === 'ADMIN' ? '全局' : '个人'} 近 30 日趋势</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData}>
                <CartesianGrid vertical={false} stroke="#1e293b" />
                <XAxis dataKey="date" fontSize={9} stroke="#475569" />
                <YAxis fontSize={9} stroke="#475569" />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Stats;
