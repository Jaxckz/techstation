
import React, { useState, useEffect } from 'react';
import { ShieldCheck, Loader2, ChevronRight, User, KeyRound, Server } from 'lucide-react';
import { UserRole } from '../types';
import { api } from '../services/api';
import { AppConfig, DEFAULT_APP_CONFIG } from '../App';

interface LoginPageProps {
  onLogin: (role: UserRole, username: string, allowedTabs?: string[]) => void;
  appConfig?: AppConfig;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, appConfig = DEFAULT_APP_CONFIG }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [bootStep, setBootStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setBootStep(prev => prev < 4 ? prev + 1 : prev);
    }, 300);
    return () => clearInterval(timer);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setIsAuthenticating(true);
    setError(false);

    try {
      // 调用后端 API 登录
      const res = await api.login(username, password);

      setTimeout(() => {
        if (res.success) {
          // 传递服务器返回的权限配置
          onLogin(res.user.role, res.user.username, res.allowedTabs || []);
        } else {
          setError(true);
          setErrorMessage(res.message || "验证失败");
          setIsAuthenticating(false);
        }
      }, 800);
    } catch (err) {
      setError(true);
      setErrorMessage("连接服务器失败，请检查后端服务");
      setIsAuthenticating(false);
    }
  };

  const bootMessages = [
    "连接中央数据库...",
    "验证节点安全性...",
    "加载用户配置...",
    "系统就绪"
  ];

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 overflow-hidden">
      <div className="relative w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] mx-auto flex items-center justify-center shadow-2xl animate-pulse">
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-black text-white tracking-tighter uppercase">{appConfig.systemName}</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em]">Centralized Server Edition</p>
          </div>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl space-y-6">
          <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400">
            <Server className="w-3 h-3 text-emerald-500" />
            <span>{bootStep < 3 ? bootMessages[bootStep] : "服务器连接正常"}</span>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">账户名称</label>
              <div className="relative">
                <input
                  disabled={isAuthenticating}
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 p-4 rounded-2xl outline-none text-white font-bold transition-all"
                />
                <User className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">密码</label>
              <div className="relative">
                <input
                  disabled={isAuthenticating}
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={`w-full bg-slate-950 border ${error ? 'border-rose-500' : 'border-slate-800 focus:border-indigo-500'} p-4 rounded-2xl outline-none text-white font-black tracking-widest transition-all`}
                />
                <KeyRound className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700" />
              </div>
              {error && <p className="text-[10px] text-rose-500 font-bold text-center pt-1">{errorMessage}</p>}
            </div>

            <button
              type="submit"
              disabled={isAuthenticating}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-2xl font-bold text-sm shadow-xl flex items-center justify-center gap-2 transition-all"
            >
              {isAuthenticating ? <Loader2 className="w-4 h-4 animate-spin" /> : '登录系统'}
              {!isAuthenticating && <ChevronRight className="w-4 h-4" />}
            </button>
          </form>
        </div>

        <p className="text-center text-[10px] text-slate-600 font-medium">
          如果您的同事无法登录，请使用管理员账号登录后，<br />在“系统设置”中为他们创建账号。
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
