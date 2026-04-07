
import React, { useState, useRef, useEffect } from 'react';
import { Bot, Sparkles, Send, Loader2, StopCircle, RefreshCw, Terminal, BrainCircuit, Activity, UserCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { generateText } from '../services/geminiService';

const AIHub: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'model', text: string}[]>([
    { role: 'model', text: '你好，我是技术部 AI 助理。我可以帮你查询日志历史、分析故障趋势或生成交接班报告。请问有什么可以帮你？' }
  ]);
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const predefinedPrompts = [
    "分析最近一周的故障日志，总结主要问题",
    "生成今日工作日报草稿",
    "查询关于 4K 演播室的所有维修记录",
    "评估当前设备维护状态风险"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (text: string = input) => {
    if (!text.trim() || isThinking) return;

    setMessages(prev => [...prev, { role: 'user', text }]);
    setInput('');
    setIsThinking(true);

    try {
      // 获取上下文数据 (最近50条日志)
      const logs = await api.getLogs(1, 50);
      const todos = await api.getTodos();
      
      const context = `
        【系统上下文数据】
        最近日志: ${logs.data ? logs.data.map((l:any) => `[${l.date}] ${l.title}`).join('; ') : '无'}
        待办事项: ${todos.map((t:any) => `[${t.status}] ${t.title}`).join('; ')};
      `;

      const prompt = `你是一个广电技术专家助手。基于以下系统数据回答用户问题。保持专业、简洁。
        ${context}
        
        用户问题: ${text}`;

      // 使用统一的 generateText 服务，支持 Settings 中配置的 DeepSeek/OpenAI/Gemini
      const reply = await generateText(prompt);

      setMessages(prev => [...prev, { role: 'model', text: typeof reply === 'string' ? reply : JSON.stringify(reply) }]);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'model', text: `AI 服务连接失败: ${e.message || '请检查系统设置中的 AI 配置。'}` }]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-140px)] flex flex-col gap-6 pb-6 animate-in fade-in">
        <header className="flex items-center gap-4 py-2">
            <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/30">
                <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
                <h2 className="text-2xl font-black text-white tracking-tight">AI 智脑实验室</h2>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Intelligent Operations Assistant</p>
            </div>
        </header>

        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 flex flex-col shadow-2xl relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none">
                <BrainCircuit className="w-64 h-64 text-indigo-500" />
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-2 mb-4">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-10 h-10 rounded-xl flex-none flex items-center justify-center ${msg.role === 'user' ? 'bg-slate-800 text-slate-300' : 'bg-indigo-600 text-white'}`}>
                            {msg.role === 'user' ? <UserCircle2 className="w-6 h-6" /> : <Sparkles className="w-5 h-5" />}
                        </div>
                        <div className={`p-4 rounded-2xl max-w-[80%] text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'bg-slate-800 text-slate-200' : 'bg-slate-950 border border-slate-800 text-slate-300'}`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                {isThinking && (
                    <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
                            <Loader2 className="w-5 h-5 text-white animate-spin" />
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-slate-500 text-xs italic flex items-center gap-2">
                            正在分析系统数据...
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="space-y-4">
                {messages.length === 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                        {predefinedPrompts.map((p, i) => (
                            <button key={i} onClick={() => handleSend(p)} className="flex-none px-4 py-2 bg-slate-950 border border-slate-800 hover:border-indigo-500 hover:text-indigo-400 rounded-xl text-xs font-bold text-slate-500 transition-all whitespace-nowrap">
                                {p}
                            </button>
                        ))}
                    </div>
                )}
                
                <div className="relative group">
                    <input 
                        type="text" 
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                        placeholder="输入指令，例如：生成本周运维报告..."
                        className="w-full bg-slate-950 border border-slate-800 p-5 pr-14 rounded-2xl text-white outline-none focus:border-indigo-500 transition-all shadow-inner"
                    />
                    <button 
                        onClick={() => handleSend()}
                        disabled={!input.trim() || isThinking}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:bg-slate-800 text-white rounded-xl transition-all"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};

export default AIHub;
