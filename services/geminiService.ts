
import { GoogleGenAI, Type } from "@google/genai";
import { LogEntry, TodoEntry, AIConfig } from "../types";
import { api } from "./api";

// 动态获取 AI 配置
const getAIConfig = async (): Promise<AIConfig | null> => {
  try {
    const config = await api.getAIConfig();
    return config || null;
  } catch (e) {
    console.error("Failed to fetch AI config");
    return null;
  }
};

// 核心生成逻辑，支持传入临时配置用于测试
export const generateText = async (prompt: string, schema?: any, overrideConfig?: AIConfig): Promise<string | any> => {
  const config = overrideConfig || await getAIConfig();
  
  // Fallback to env var if no config, for backward compatibility or dev
  if (!config) {
      const envKey = process.env.API_KEY;
      if (!envKey) return "AI 模块未配置 API Key。";
      // Default to Gemini logic if only env key exists
      const ai = new GoogleGenAI({ apiKey: envKey });
      try {
          const res = await ai.models.generateContent({
              model: "gemini-3-flash-preview",
              contents: prompt,
              config: schema ? { responseMimeType: "application/json", responseSchema: schema } : undefined
          });
          return schema ? (res.text ? JSON.parse(res.text) : null) : (res.text || "");
      } catch(e) { console.error(e); return "AI 请求失败 (Environment Fallback)"; }
  }

  // Handle Providers
  if (config.provider === 'gemini') {
      const ai = new GoogleGenAI({ apiKey: config.apiKey });
      try {
          const res = await ai.models.generateContent({
              model: config.model || "gemini-3-flash-preview",
              contents: prompt,
              config: schema ? { responseMimeType: "application/json", responseSchema: schema } : undefined
          });
          return schema ? (res.text ? JSON.parse(res.text) : null) : (res.text || "");
      } catch(e: any) { 
          console.error("Gemini Error:", e); 
          throw new Error(`Gemini 请求失败: ${e.message}`);
      }
  } 
  
  else if (config.provider === 'openai' || config.provider === 'custom') {
      // 自动修正 Base URL (移除末尾斜杠，移除可能误填的 /chat/completions)
      let baseUrl = config.baseUrl || 'https://api.openai.com/v1';
      baseUrl = baseUrl.replace(/\/$/, ''); 
      if (baseUrl.endsWith('/chat/completions')) {
          baseUrl = baseUrl.replace('/chat/completions', '');
      }

      const model = config.model || 'gpt-3.5-turbo';
      
      try {
          const payload: any = {
              model: model,
              messages: [{ role: 'user', content: prompt }],
              stream: false // 确保非流式，DeepSeek 需要
          };

          // DeepSeek 等部分模型对 response_format 支持有限，仅在明确需要 JSON 时添加
          if (schema) {
              payload.response_format = { type: "json_object" };
              // 确保 Prompt 包含 JSON 字样，防止报错
              if (!prompt.toLowerCase().includes('json')) {
                  payload.messages[0].content += " (Please respond in JSON)";
              }
          }

          const response = await fetch(`${baseUrl}/chat/completions`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${config.apiKey}`
              },
              body: JSON.stringify(payload)
          });
          
          if (!response.ok) {
              const errText = await response.text();
              throw new Error(`HTTP ${response.status}: ${errText}`);
          }

          const data = await response.json();
          const content = data.choices?.[0]?.message?.content || "";
          
          // 如果返回的是 markdown 代码块包裹的 json，去除 markdown 标记
          let cleanContent = content.replace(/```json\n?|```/g, '').trim();

          return schema ? JSON.parse(cleanContent) : content;
      } catch(e: any) {
          console.error("OpenAI Compatible API Error:", e);
          throw new Error(`AI 请求失败 (${config.provider}): ${e.message}`);
      }
  }

  throw new Error("未知的 AI 提供商配置");
};

// 用于测试连通性的方法
export const testAIConnectivity = async (config: AIConfig): Promise<{ success: boolean, message: string }> => {
    try {
        const response = await generateText("Hello, just reply with 'OK' to confirm connectivity.", undefined, config);
        if (response && response.length > 0) {
            return { success: true, message: `连接成功! 回复: ${response.substring(0, 50)}` };
        }
        return { success: false, message: "连接成功但无返回内容" };
    } catch (e: any) {
        return { success: false, message: e.message || "未知错误" };
    }
}


export async function analyzeLogWithSOP(content: string, equipment?: string) {
  const prompt = `你是一名广电系统高级总工。基于以下描述，请执行：
      1. 总结故障现象。
      2. 如果提到具体设备（${equipment || '未指定'}），请从广电标准库中提取该类设备的常见排查SOP（标准作业程序）。
      3. 评估该问题是否会导致“停播”风险。
      内容：${content}
      
      请直接返回 JSON 格式数据。确保是一个合法的 JSON 对象。`;
      
  const schema = {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING },
        sop: { type: Type.STRING, description: "建议的SOP步骤" },
        riskLevel: { type: Type.STRING, enum: ["高", "中", "低"] },
        signalNodes: { 
          type: Type.ARRAY, 
          items: { type: Type.STRING }, 
          description: "提取的信号链路节点"
        }
      },
      required: ["summary", "sop", "riskLevel"]
  };

  try {
      return await generateText(prompt, schema);
  } catch (e) {
      console.error(e);
      return { summary: "AI 分析失败", sop: "请检查 AI 配置", riskLevel: "未知" };
  }
}

export async function predictPredictiveRisk(logs: LogEntry[]) {
  const context = logs.slice(0, 20).map(l => `[${l.location}] ${l.category}: ${l.title}`).join('\n');
  const prompt = `你是电视台的安全运行专家。分析以下近期运维趋势，识别潜在的周期性隐患或待爆发的重大故障风险（例如某机房频繁报错）：\n\n${context}`;
  return await generateText(prompt);
}

export async function generateHandoverReport(logs: LogEntry[], tasks: TodoEntry[]) {
  const context = `
    日志: ${logs.map(l => `[${l.location || '未知'}] ${l.title}`).join('; ')}
    待办: ${tasks.map(t => `[${t.priority}] ${t.title}`).join('; ')}
  `;
  const prompt = `作为交接班助理，请基于以上数据生成一份严谨的「广电技术值班交接单」。包括已恢复信号、待观察设备、和需要下一班重点复核的4K/8K信号源。内容：${context}`;
  return await generateText(prompt);
}

export async function generateWeeklyReport(logs: LogEntry[], tasks: TodoEntry[]) {
  const context = `
    本周日志概览: ${logs.slice(0, 50).map(l => `[${l.location || '未知'}] ${l.category}: ${l.title}`).join('\n')}
    本周任务概览: ${tasks.slice(0, 50).map(t => `[${t.priority}] ${t.title} (${t.status})`).join('\n')}
  `;
  const prompt = `你是一名资深的广电技术主管。请基于以下本周的运维日志和事项清单，生成一份专业的工作周报。
      要求：
      1. 总结核心运行数据。
      2. 归纳主要完成的技术改造或维保事项。
      3. 重点列出遗留的待处理风险点。
      4. 语言风格严谨专业。
      内容：${context}`;
  return await generateText(prompt);
}
