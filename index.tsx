
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initDB } from './db';

const startApp = async () => {
  const rootElement = document.getElementById('root');
  
  if (!rootElement) {
    console.error("Fatal: Root element not found");
    return;
  }

  try {
    console.log("System initializing...");
    
    // 强制先初始化 DB
    await initDB();
    console.log("Database bridge connected.");
    
    const root = createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("Application mounted successfully.");
    
  } catch (error) {
    console.error("Critical Runtime Error:", error);
    
    rootElement.innerHTML = `
      <div style="
        background: #020617; 
        color: #f8fafc; 
        padding: 40px; 
        font-family: system-ui, sans-serif; 
        height: 100vh; 
        display: flex; 
        flex-direction: column; 
        justify-content: center; 
        align-items: center;
        text-align: center;
        margin: 0;
      ">
        <div style="background: rgba(239, 68, 68, 0.1); padding: 32px; border-radius: 24px; border: 1px solid #ef4444;">
          <h1 style="color: #ef4444; margin-bottom: 16px; font-size: 24px;">系统加载失败</h1>
          <p style="color: #94a3b8; margin-bottom: 24px; max-width: 500px; line-height: 1.6;">
            可能是本地浏览器 IndexedDB 数据库受限。请尝试刷新页面或清除浏览器缓存。
          </p>
          <div style="
            background: #0f172a; 
            padding: 16px; 
            border-radius: 12px; 
            border: 1px solid #1e293b;
            font-family: monospace;
            font-size: 13px;
            text-align: left;
            max-width: 80vw;
            overflow-x: auto;
            color: #fb7185;
          ">
            Error: ${error instanceof Error ? error.message : String(error)}
          </div>
          <button onclick="window.location.reload()" style="
            margin-top: 24px; 
            background: #2563eb; 
            color: white; 
            border: none; 
            padding: 12px 32px; 
            border-radius: 12px; 
            font-weight: bold; 
            cursor: pointer;
          ">重新加载</button>
        </div>
      </div>
    `;
  }
};

startApp();
